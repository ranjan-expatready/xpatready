import { createDecipheriv } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { HEADER, PdfOut, writeObj, writeTail, writeXrefTable } from '../../__tests__/fixtures/build-pdf.js';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { appendIncrementalUpdate, type Replacement } from '../incremental-writer.js';
import { parseIndirectAt } from '../object-parser.js';
import { PdfReader } from '../reader.js';
import { AESV2_SAMPLE, hex, nodeObjectKey, unhex } from '../security/__tests__/vectors.js';
import { isPdfName, isPdfStream, isPdfString, type PdfRef, type PdfStream, type PdfValue } from '../types.js';
import { dec, enc } from './bytes.js';
import { expectMalformed } from './expect-malformed.js';

const fixture = (name: string): Uint8Array => new Uint8Array(readFileSync(new URL(`../../__tests__/fixtures/${name}`, import.meta.url)));
const ref = (num: number, gen = 0): PdfRef => ({ kind: 'ref', num, gen });
const NEW_TEXT = '<xfa:datasets xmlns:xfa="urn:y"><xfa:data><Changed/></xfa:data></xfa:datasets>';

async function streamAt(reader: PdfReader, r: PdfRef): Promise<PdfStream> {
  const v = await reader.resolve(r);
  if (!isPdfStream(v)) throw new Error(`object ${r.num} is not a stream`);
  return v;
}

/** Replaces one stream object's content through the public writer, returning the new file and the reader of the ORIGINAL. */
async function replaceOne(src: Uint8Array, r: PdfRef, plaintext: Uint8Array): Promise<{ out: Uint8Array; reader: PdfReader }> {
  const reader = await PdfReader.open(src);
  const out = await appendIncrementalUpdate(src, reader, [{ ref: r, dict: (await streamAt(reader, r)).dict, plaintext }]);
  return { out, reader };
}

function startxrefOf(bytes: Uint8Array): number {
  const m = /startxref\n(\d+)\n%%EOF\n$/.exec(dec(bytes.subarray(bytes.length - 40)));
  if (m?.[1] === undefined) throw new Error('output does not end with startxref/%%EOF');
  return Number(m[1]);
}

/** Objects 1..size-1 of the ORIGINAL file (read through `reader`, which may be the updated file), skipping `exceptNum`. */
async function objectsBelow(reader: PdfReader, exceptNum: number, size: number): Promise<Map<number, PdfValue | PdfStream>> {
  const all = new Map<number, PdfValue | PdfStream>();
  for (let n = 1; n < size; n++) if (n !== exceptNum) all.set(n, await reader.get(n));
  return all;
}

/** Offset of `num gen obj` inside the appended region of `out`, parsed WITHOUT any decryption. */
function rawAppended(out: Uint8Array, prefixLength: number, num: number, gen = 0): PdfStream {
  // Search from the last prefix byte (an EOL) so "6 0 obj" cannot match inside "16 0 obj".
  const at = prefixLength - 1 + dec(out.subarray(prefixLength - 1)).indexOf(`\n${num} ${gen} obj\n`) + 1;
  const parsed = parseIndirectAt(out, at);
  if (!isPdfStream(parsed.value)) throw new Error('appended object is not a stream');
  return parsed.value;
}

describe('appendIncrementalUpdate: unencrypted classic file', () => {
  const datasetsPacket = packet('datasets', '<old/>', true, '/Subtype/XML/Note(plain note)/DL 6');
  const src = buildXfaPdf({ packets: [packet('template', '<t/>'), datasetsPacket] });
  const target = ref(11);

  it('keeps the first source.length bytes byte-identical (signature and usage-rights byte ranges must stay valid)', async () => {
    const { out } = await replaceOne(src, target, enc(NEW_TEXT));
    expect(out.length).toBeGreaterThan(src.length);
    expect(out.subarray(0, src.length)).toEqual(src);
  });

  it('inserts exactly one newline when the source does not end in an EOL (otherwise the new object would glue onto %%EOF)', async () => {
    const noEol = src.subarray(0, src.length - 1);
    expect(dec(noEol.subarray(noEol.length - 5))).toBe('%%EOF');
    const { out } = await replaceOne(noEol, target, enc(NEW_TEXT));
    expect(out.subarray(0, noEol.length)).toEqual(noEol);
    expect(out[noEol.length]).toBe(0x0a);
    expect(dec(out.subarray(noEol.length + 1, noEol.length + 8))).toBe('11 0 ob');
  });

  it('adds no extra byte when the source already ends with CR or LF', async () => {
    const lf = await replaceOne(src, target, enc(NEW_TEXT));
    expect(dec(lf.out.subarray(src.length, src.length + 7))).toBe('11 0 ob');
    const cr = src.slice();
    cr[cr.length - 1] = 0x0d;
    const withCr = await replaceOne(cr, target, enc(NEW_TEXT));
    expect(dec(withCr.out.subarray(cr.length, cr.length + 7))).toBe('11 0 ob');
  });

  it('redefines the object so a reader sees the new content, and every other object is unchanged (A2: not a rewrite)', async () => {
    const { out, reader } = await replaceOne(src, target, enc(NEW_TEXT));
    const after = await PdfReader.open(out);
    expect(dec(await after.decodedStream(target))).toBe(NEW_TEXT);
    const before = await objectsBelow(reader, 11, 12);
    const now = await objectsBelow(after, 11, 12);
    expect(now).toEqual(before);
  });

  it('writes an xref STREAM (not a table) with /W [1 4 2], /Index [num 1 xrefNum 1], /Prev = the old startxref and the root entries copied', async () => {
    const oldStartxref = startxrefOf(src);
    const { out, reader } = await replaceOne(src, target, enc(NEW_TEXT));
    const x = startxrefOf(out);
    expect(x).toBeGreaterThan(src.length);
    const oldSize = reader.trailer.get('Size');
    expect(oldSize).toBe(12);
    expect(dec(out.subarray(x, x + 20)).startsWith('12 0 obj\n<<')).toBe(true);
    expect(dec(out.subarray(x)).includes('\nxref\n')).toBe(false);

    const t = (await PdfReader.open(out)).trailer;
    expect(t.get('Type')).toEqual({ kind: 'name', value: 'XRef' });
    expect(t.get('W')).toEqual([1, 4, 2]);
    expect(t.get('Index')).toEqual([11, 1, 12, 1]);
    expect(t.get('Size')).toBe(13);
    expect(t.get('Prev')).toBe(oldStartxref);
    expect(t.get('Root')).toEqual(reader.trailer.get('Root'));
    expect(t.get('Filter')).toEqual({ kind: 'name', value: 'FlateDecode' });
    expect(typeof t.get('Length')).toBe('number');
    expect(t.has('Encrypt')).toBe(false);
  });

  it('keeps every other stream-dictionary key, replaces /Length and /Filter, and recomputes an existing /DL (a stale decoded length misleads readers)', async () => {
    const { out } = await replaceOne(src, target, enc(NEW_TEXT));
    const s = await streamAt(await PdfReader.open(out), target);
    expect(s.dict.get('Subtype')).toEqual({ kind: 'name', value: 'XML' });
    expect(s.dict.get('Note')).toEqual({ kind: 'string', bytes: enc('plain note'), hex: true });
    expect(s.dict.get('Filter')).toEqual({ kind: 'name', value: 'FlateDecode' });
    expect(s.dict.get('Length')).toBe(s.raw.length);
    expect(s.dict.get('DL')).toBe(NEW_TEXT.length);
  });

  it('adds no /DL when the original stream had none, and drops the old /Filter and /DecodeParms', async () => {
    const withParms = buildXfaPdf({ packets: [packet('datasets', '<old/>', true, '/DecodeParms<</Predictor 1>>')] });
    const { out } = await replaceOne(withParms, ref(10), enc(NEW_TEXT));
    const s = await streamAt(await PdfReader.open(out), ref(10));
    expect(s.dict.has('DL')).toBe(false);
    expect(s.dict.has('DecodeParms')).toBe(false);
    expect(s.dict.get('Filter')).toEqual({ kind: 'name', value: 'FlateDecode' });
  });

  it('is deterministic: the same input yields identical bytes on every run (no timestamps or random IVs)', async () => {
    const a = await replaceOne(src, target, enc(NEW_TEXT));
    const b = await replaceOne(src, target, enc(NEW_TEXT));
    expect(a.out).toEqual(b.out);
  });

  it('reuses the original generation number in both the object header and the xref entry (a generation-0 redefinition would be ignored)', async () => {
    const out = new PdfOut();
    out.push(HEADER);
    const o1 = writeObj(out, 1, '<</Type/Catalog>>');
    const o3 = out.push('3 2 obj\n<</Length 3>>\nstream\nabc\nendstream\nendobj\n');
    writeTail(out, writeXrefTable(out, [{ num: 0, free: true }, { num: 1, offset: o1 }, { num: 3, offset: o3, gen: 2 }], '/Size 4/Root 1 0 R'));
    const gen2 = out.toBytes();
    const { out: updated } = await replaceOne(gen2, ref(3, 2), enc('new'));
    expect(dec(updated.subarray(gen2.length, gen2.length + 9))).toBe('3 2 obj\n<');
    const after = await PdfReader.open(updated);
    expect(dec(await after.decodedStream(ref(3, 2)))).toBe('new');
    expect(await after.resolve(ref(3, 0))).toBe(null);
  });

  it('grows /Size past a replaced object number that is not below the old /Size (the xref stream would otherwise collide with it)', async () => {
    const reader = await PdfReader.open(src);
    const out = await appendIncrementalUpdate(src, reader, [{ ref: ref(40), dict: new Map(), plaintext: enc('added') }]);
    const t = (await PdfReader.open(out)).trailer;
    expect(t.get('Index')).toEqual([40, 1, 41, 1]);
    expect(t.get('Size')).toBe(42);
  });

  it('picks a fresh xref-stream number when /Size under-reports an existing object (reusing that number would silently delete the object)', async () => {
    const out = new PdfOut();
    out.push(HEADER);
    const o1 = writeObj(out, 1, '<</Type/Catalog>>');
    const o2 = out.push('2 0 obj\n<</Length 3>>\nstream\nabc\nendstream\nendobj\n');
    const o5 = writeObj(out, 5, '(keep)');
    writeTail(out, writeXrefTable(out, [{ num: 0, free: true }, { num: 1, offset: o1 }, { num: 2, offset: o2 }, { num: 5, offset: o5 }], '/Size 5/Root 1 0 R'));
    const src = out.toBytes();
    const reader = await PdfReader.open(src);
    expect(reader.maxObjectNumber).toBe(5);
    const original = await reader.get(5);
    expect(original).toEqual({ kind: 'string', bytes: enc('keep'), hex: false });

    const updated = await appendIncrementalUpdate(src, reader, [{ ref: ref(2), dict: (await streamAt(reader, ref(2))).dict, plaintext: enc('new') }]);
    const after = await PdfReader.open(updated);
    expect(await after.get(5)).toEqual(original);
    expect(after.trailer.get('Index')).toEqual([2, 1, 6, 1]);
    expect(after.trailer.get('Size')).toBe(7);
    expect(dec(await after.decodedStream(ref(2)))).toBe('new');
  });

  it('replaces several objects in one update with ascending /Index pairs', async () => {
    const reader = await PdfReader.open(src);
    const items: Replacement[] = [
      { ref: ref(11), dict: (await streamAt(reader, ref(11))).dict, plaintext: enc('B') },
      { ref: ref(10), dict: (await streamAt(reader, ref(10))).dict, plaintext: enc('A') },
    ];
    const out = await appendIncrementalUpdate(src, reader, items);
    const after = await PdfReader.open(out);
    expect(after.trailer.get('Index')).toEqual([10, 1, 11, 1, 12, 1]);
    expect(dec(await after.decodedStream(ref(10)))).toBe('A');
    expect(dec(await after.decodedStream(ref(11)))).toBe('B');
  });
});

describe('appendIncrementalUpdate: invalid input is rejected with typed errors (no TypeError, no corrupt output)', () => {
  it('rejects the same object twice, an empty list, a bad generation or number, and a non-bytes plaintext', async () => {
    const src = buildXfaPdf();
    const reader = await PdfReader.open(src);
    const ok = (over: Partial<Replacement> = {}): Replacement => ({ ref: ref(11), dict: new Map(), plaintext: enc('x'), ...over });
    await expectMalformed(appendIncrementalUpdate(src, reader, [ok(), ok()]));
    await expectMalformed(appendIncrementalUpdate(src, reader, []));
    await expectMalformed(appendIncrementalUpdate(src, reader, [ok({ ref: ref(11, 65536) })]));
    await expectMalformed(appendIncrementalUpdate(src, reader, [ok({ ref: ref(0) })]));
    await expectMalformed(appendIncrementalUpdate(src, reader, [ok({ ref: ref(0x1000000) })]));
    const notBytes = ok({ plaintext: 'text' as unknown as Uint8Array });
    await expectMalformed(appendIncrementalUpdate(src, reader, [notBytes]));
    await expectMalformed(appendIncrementalUpdate('x' as unknown as Uint8Array, reader, [ok()]));
  });

  it('rejects a previous trailer without /Size (the new xref stream number cannot be chosen safely)', async () => {
    const out = new PdfOut();
    out.push(HEADER);
    const o1 = writeObj(out, 1, '<</Type/Catalog>>');
    writeTail(out, writeXrefTable(out, [{ num: 0, free: true }, { num: 1, offset: o1 }], '/Root 1 0 R'));
    const src = out.toBytes();
    const reader = await PdfReader.open(src);
    await expectMalformed(appendIncrementalUpdate(src, reader, [{ ref: ref(1), dict: new Map(), plaintext: enc('x') }]));
  });

  it('rejects a previous trailer without /Root', async () => {
    const out = new PdfOut();
    out.push(HEADER);
    const o1 = writeObj(out, 1, '<</Type/Catalog>>');
    writeTail(out, writeXrefTable(out, [{ num: 0, free: true }, { num: 1, offset: o1 }], '/Size 2'));
    const src = out.toBytes();
    const reader = await PdfReader.open(src);
    await expectMalformed(appendIncrementalUpdate(src, reader, [{ ref: ref(1), dict: new Map(), plaintext: enc('x') }]));
  });
});

describe('appendIncrementalUpdate: AESV2 file (qpdf aesv2-sample.pdf, xref stream and object streams)', () => {
  const NOTE = 'String in a stream dictionary';
  const src = fixture('aesv2-sample.pdf');

  async function noteStream(reader: PdfReader): Promise<number> {
    const size = reader.trailer.get('Size');
    if (typeof size !== 'number') throw new Error('no /Size');
    for (let n = 1; n < size; n++) {
      const v = await reader.get(n);
      if (isPdfStream(v) && v.dict.has('Note')) return n;
    }
    throw new Error('fixture has no stream with /Note');
  }

  it('opens with the empty password, returns the new content, and re-encrypts the retained /Note (never plaintext inside an encrypted object)', async () => {
    const reader = await PdfReader.open(src);
    const num = await noteStream(reader);
    const { out } = await replaceOne(src, ref(num), enc(NEW_TEXT));
    expect(out.subarray(0, src.length)).toEqual(src);
    const after = await PdfReader.open(out);
    const s = await streamAt(after, ref(num));
    expect(dec(await after.decodedStream(ref(num)))).toBe(NEW_TEXT);
    const note = s.dict.get('Note');
    expect(isPdfString(note) ? dec(note.bytes) : undefined).toBe(NOTE);
    const appended = dec(out.subarray(src.length));
    expect(appended.includes(NOTE)).toBe(false);
    expect(appended.includes(hex(enc(NOTE)))).toBe(false);
    expect(appended.includes(NEW_TEXT)).toBe(false);
  });

  it('writes content that an independent AES-128-CBC + zlib implementation decodes with the per-object key (not just self-consistent)', async () => {
    const reader = await PdfReader.open(src);
    const num = await noteStream(reader);
    const { out } = await replaceOne(src, ref(num), enc(NEW_TEXT));
    const raw = rawAppended(out, src.length, num).raw;
    const decipher = createDecipheriv('aes-128-cbc', nodeObjectKey(unhex(AESV2_SAMPLE.key), num, 0), raw.subarray(0, 16));
    const flate = Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]);
    expect(inflateSync(flate).toString('latin1')).toBe(NEW_TEXT);
  });

  it('copies /Root, /Info, /Encrypt and /ID unchanged into an UNENCRYPTED xref stream (an encrypted xref stream would be unreadable)', async () => {
    const reader = await PdfReader.open(src);
    const num = await noteStream(reader);
    const { out } = await replaceOne(src, ref(num), enc(NEW_TEXT));
    const t = (await PdfReader.open(out)).trailer;
    for (const key of ['Root', 'Info', 'Encrypt', 'ID']) expect(t.get(key), key).toEqual(reader.trailer.get(key));
    expect(t.get('Encrypt')).toBeDefined();
    const oldSize = reader.trailer.get('Size');
    expect(typeof oldSize).toBe('number');
    const xrefObj = rawAppended(out, src.length, Number(oldSize));
    expect(isPdfName(xrefObj.dict.get('Type'))).toBe(true);
    expect(inflateSync(xrefObj.raw).length).toBe(2 * 7);
  });

  it('leaves every object other than the replaced one reading identically (strings in object streams included)', async () => {
    const reader = await PdfReader.open(src);
    const num = await noteStream(reader);
    const { out } = await replaceOne(src, ref(num), enc(NEW_TEXT));
    const size = Number(reader.trailer.get('Size'));
    expect(await objectsBelow(await PdfReader.open(out), num, size)).toEqual(await objectsBelow(reader, num, size));
  });

  it('does not encrypt the content of /Metadata when the document keeps metadata in clear (EncryptMetadata false)', async () => {
    const meta = fixture('aesv2-cleartext-metadata.pdf');
    const reader = await PdfReader.open(meta);
    const size = reader.trailer.get('Size');
    let num = -1;
    for (let n = 1; typeof size === 'number' && n < size; n++) {
      const v = await reader.get(n);
      const t = isPdfStream(v) ? v.dict.get('Type') : undefined;
      if (isPdfName(t) && t.value === 'Metadata') num = n;
    }
    expect(num).toBeGreaterThan(0);
    const { out } = await replaceOne(meta, ref(num), enc('<x:xmpmeta>new</x:xmpmeta>'));
    expect(inflateSync(rawAppended(out, meta.length, num).raw).toString('latin1')).toBe('<x:xmpmeta>new</x:xmpmeta>');
    const after = await PdfReader.open(out);
    expect(dec(await after.decodedStream(ref(num)))).toBe('<x:xmpmeta>new</x:xmpmeta>');
  });
});
