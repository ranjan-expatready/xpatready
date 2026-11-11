import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildEncryptedPdf, encryptedFor } from '../../__tests__/fixtures/build-encrypted-pdf.js';
import { PdfReader } from '../reader.js';
import { AESV2_SAMPLE, hex } from '../security/__tests__/vectors.js';
import { isPdfName, isPdfRef, isPdfStream, isPdfString, type PdfDict, type PdfRef, type PdfStream, type PdfValue } from '../types.js';
import { dec, enc } from './bytes.js';
import { expectMalformed, expectXfaError } from './expect-malformed.js';

const fixture = (name: string): Uint8Array => new Uint8Array(readFileSync(new URL(`../../__tests__/fixtures/${name}`, import.meta.url)));

const FLATE_PLAIN = 'FlatePlain: the quick brown fox jumps over the lazy dog. 0123456789 '.repeat(3);

type Obj = PdfValue | PdfStream;
async function everyObject(r: PdfReader): Promise<Map<number, Obj>> {
  const size = r.trailer.get('Size');
  if (typeof size !== 'number') throw new Error('fixture has no /Size');
  const all = new Map<number, Obj>();
  for (let n = 1; n < size; n++) all.set(n, await r.get(n));
  return all;
}
const streams = (all: Map<number, Obj>): PdfStream[] => [...all.values()].filter(isPdfStream);
const typeName = (s: PdfStream): string | undefined => {
  const t = s.dict.get('Type');
  return isPdfName(t) ? t.value : undefined;
};
const text = (v: PdfValue | undefined): string => {
  if (!isPdfString(v)) throw new Error('not a string');
  return dec(v.bytes);
};
const failure = expectXfaError;
const refOf = (dict: PdfDict, key: string): PdfRef => {
  const v = dict.get(key);
  if (!isPdfRef(v)) throw new Error(`/${key} is not a reference`);
  return v;
};
/** Same-length edit of the ASCII text of a fixture (keeps every xref offset valid). */
function patch(bytes: Uint8Array, from: string, to: string): Uint8Array {
  expect(to.length).toBe(from.length);
  const at = dec(bytes).indexOf(from);
  expect(at).toBeGreaterThan(-1);
  const out = bytes.slice();
  out.set(enc(to), at);
  return out;
}

describe('PdfReader: AESV2 (qpdf aesv2-sample.pdf, xref + object streams)', () => {
  it('decrypts a string in a stream dictionary and a Flate stream: decrypt first, then inflate (A1)', async () => {
    const r = await PdfReader.open(fixture('aesv2-sample.pdf'));
    const all = await everyObject(r);
    const flate = streams(all).find((s) => s.dict.get('Note') !== undefined);
    if (!flate) throw new Error('flate stream not found');
    expect(text(flate.dict.get('Note'))).toBe('String in a stream dictionary');
    expect(dec(await r.decodedStream(flate))).toBe(FLATE_PLAIN);
  });

  it('decrypts an unfiltered stream', async () => {
    const all = await everyObject(await PdfReader.open(fixture('aesv2-sample.pdf')));
    const raw = streams(all).find((s) => s.dict.get('Filter') === undefined && typeName(s) === undefined);
    expect(raw && dec(raw.raw)).toBe('RawPlain: an unfiltered stream body.');
  });

  it('object-stream members decrypt correctly because the object stream is decrypted once as a whole, not member by member (A1)', async () => {
    const r = await PdfReader.open(fixture('aesv2-sample.pdf'));
    const root = await r.resolve(refOf(r.trailer, 'Root'));
    if (!(root instanceof Map)) throw new Error('catalog is not a dictionary');
    const custom = await r.resolve(refOf(root, 'Custom'));
    if (!(custom instanceof Map)) throw new Error('custom is not a dictionary');
    expect(text(custom.get('Marker'))).toBe('Literal secret string in a dictionary');
    expect(text(custom.get('Hex'))).toBe('Hex marker');
  });

  it('the /Encrypt dictionary strings stay as stored: /O and /U are never decrypted when it is resolved again', async () => {
    const r = await PdfReader.open(fixture('aesv2-sample.pdf'));
    const enc = await r.resolve(refOf(r.trailer, 'Encrypt'));
    if (!(enc instanceof Map)) throw new Error('/Encrypt is not a dictionary');
    const o = enc.get('O');
    const u = enc.get('U');
    expect(isPdfString(o) && hex(o.bytes)).toBe(AESV2_SAMPLE.o);
    expect(isPdfString(u) && hex(u.bytes)).toBe(AESV2_SAMPLE.u);
  });

  it('the xref stream is never decrypted: resolving it through the reader still inflates', async () => {
    const r = await PdfReader.open(fixture('aesv2-sample.pdf'));
    const xref = streams(await everyObject(r)).find((s) => typeName(s) === 'XRef');
    if (!xref) throw new Error('xref stream not resolvable');
    expect((await r.decodedStream(xref)).length).toBeGreaterThan(0);
  });

  it('an encrypted /Metadata stream is decrypted when /EncryptMetadata is true (default)', async () => {
    const all = await everyObject(await PdfReader.open(fixture('aesv2-sample.pdf')));
    const meta = streams(all).find((s) => typeName(s) === 'Metadata');
    expect(meta && dec(meta.raw)).toBe('<x:xmpmeta>Metadata plaintext</x:xmpmeta>');
  });
});

describe('PdfReader: /EncryptMetadata false (qpdf aesv2-cleartext-metadata.pdf)', () => {
  it('opens (the 0xFFFFFFFF key suffix is applied) and leaves the cleartext /Metadata stream untouched', async () => {
    const r = await PdfReader.open(fixture('aesv2-cleartext-metadata.pdf'));
    const all = await everyObject(r);
    const meta = streams(all).find((s) => typeName(s) === 'Metadata');
    expect(meta && dec(meta.raw)).toBe('<x:xmpmeta>Metadata plaintext</x:xmpmeta>');
    const flate = streams(all).find((s) => s.dict.get('Note') !== undefined);
    expect(flate && dec(await r.decodedStream(flate))).toBe(FLATE_PLAIN);
  });
});

describe('PdfReader: fail-closed security', () => {
  it('rejects an RC4-encrypted file with UNSUPPORTED_SECURITY (A2)', async () => {
    const err = await failure(PdfReader.open(fixture('rc4-sample.pdf')));
    expect(err.code).toBe('UNSUPPORTED_SECURITY');
  });

  it('rejects a tampered /U with WRONG_PASSWORD (A2)', async () => {
    const bytes = fixture('aesv2-sample.pdf');
    const tampered = patch(bytes, AESV2_SAMPLE.u.slice(0, 8), 'ffffffff');
    const err = await failure(PdfReader.open(tampered));
    expect(err.code).toBe('WRONG_PASSWORD');
    expect(err.message).not.toContain(AESV2_SAMPLE.u);
  });

  it('rejects an /R 6 dictionary with UNSUPPORTED_SECURITY (A2)', async () => {
    const err = await failure(PdfReader.open(patch(fixture('aesv2-sample.pdf'), '/R 4', '/R 6')));
    expect(err.code).toBe('UNSUPPORTED_SECURITY');
  });
});

describe('PdfReader: hostile encrypted content (synthetic file keyed like aesv2-sample.pdf)', () => {
  const k = AESV2_SAMPLE;

  it('control: a well-formed synthetic file decrypts (so the hostile cases below fail for the intended reason)', async () => {
    const pdf = buildEncryptedPdf(k, { streamRaw: encryptedFor(k, 2, 'stream body'), stringRaw: encryptedFor(k, 1, 'string body') });
    const r = await PdfReader.open(pdf);
    const catalog = await r.get(1);
    expect(catalog instanceof Map && text(catalog.get('S'))).toBe('string body');
    expect(dec(await r.decodedStream({ kind: 'ref', num: 2, gen: 0 }))).toBe('stream body');
  });

  it('a stream whose ciphertext is not a multiple of 16 is MALFORMED (A3)', async () => {
    const good = encryptedFor(k, 2, 'stream body');
    const pdf = buildEncryptedPdf(k, { streamRaw: good.subarray(0, good.length - 3), stringRaw: encryptedFor(k, 1, 's') });
    const r = await PdfReader.open(pdf);
    await expectMalformed(r.get(2));
  });

  it('a string with bad padding is MALFORMED and not a leaked DOMException (A3)', async () => {
    const bad = encryptedFor(k, 1, 'abcd');
    bad[15] = (bad[15] ?? 0) ^ 0xff;
    const pdf = buildEncryptedPdf(k, { streamRaw: encryptedFor(k, 2, 'x'), stringRaw: bad });
    const r = await PdfReader.open(pdf);
    await expectMalformed(r.get(1));
  });

  it('a stream with /Filter /Crypt is UNSUPPORTED_SECURITY, not decrypted and then failed as an unknown filter', async () => {
    const pdf = buildEncryptedPdf(k, { streamRaw: encryptedFor(k, 2, 'x'), stringRaw: encryptedFor(k, 1, 'y'), streamDict: '/Filter[/Crypt]/DecodeParms[<</Name/Identity>>]' });
    const err = await failure((await PdfReader.open(pdf)).get(2), 'UNSUPPORTED_SECURITY');
    expect(err.message).toContain('Crypt filters are not supported');
  });

  it('a bare /Filter /Crypt name (not an array) is rejected the same way', async () => {
    const pdf = buildEncryptedPdf(k, { streamRaw: encryptedFor(k, 2, 'x'), stringRaw: encryptedFor(k, 1, 'y'), streamDict: '/Filter/Crypt' });
    await failure((await PdfReader.open(pdf)).get(2), 'UNSUPPORTED_SECURITY');
  });

  it('a missing trailer /ID leaves an empty document ID, which cannot verify: WRONG_PASSWORD, not a crash', async () => {
    const pdf = buildEncryptedPdf(k, { streamRaw: encryptedFor(k, 2, 'x'), stringRaw: encryptedFor(k, 1, 'y'), idText: null });
    expect((await failure(PdfReader.open(pdf))).code).toBe('WRONG_PASSWORD');
  });

  it('a trailer /ID that is not an array of strings is MALFORMED', async () => {
    const pdf = buildEncryptedPdf(k, { streamRaw: encryptedFor(k, 2, 'x'), stringRaw: encryptedFor(k, 1, 'y'), idText: '/ID 7' });
    expect((await failure(PdfReader.open(pdf))).code).toBe('MALFORMED');
  });
});
