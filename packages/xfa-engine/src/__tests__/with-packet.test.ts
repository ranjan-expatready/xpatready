import { describe, expect, it } from 'vitest';
import { dec, enc } from '../pdf/__tests__/bytes.js';
import { expectMalformed, expectXfaError } from '../pdf/__tests__/expect-malformed.js';
import { MAX_PDF_BYTES, openXfaPdf, openXfaPdfInternal, type XfaPdf } from '../xfa-pdf.js';
import { buildEncryptedXfaPdf, DATASETS_NOTE, DATASETS_OBJ, ENCRYPTED_DATASETS, ENCRYPTED_TEMPLATE } from './fixtures/build-encrypted-xfa-pdf.js';
import { buildXfaPdf, DEFAULT_PACKETS, packet } from './fixtures/build-xfa-pdf.js';

const NEW_DATASETS = '\n<xfa:datasets xmlns:xfa="urn:y"><xfa:data><Name>ROUNDTRIP-TEST</Name></xfa:data></xfa:datasets>\n';

const variants: [string, () => Uint8Array][] = [
  ['unencrypted classic file (plain Flate stream)', () => buildXfaPdf({ perms: 'ur3', needsRendering: 'true' })],
  ['AESV2 file with a classic xref table', () => buildEncryptedXfaPdf({ xref: 'table' })],
  ['AESV2 file with an xref stream (the real-world layout)', () => buildEncryptedXfaPdf({ xref: 'stream' })],
];

function expectOthersUnchanged(before: XfaPdf, after: XfaPdf, replaced: string): void {
  expect(after.packets.map((p) => p.name)).toEqual(before.packets.map((p) => p.name));
  for (const p of before.packets) {
    if (p.name === replaced) continue;
    expect(after.packet(p.name).bytes, `packet ${p.name}`).toEqual(p.bytes);
    expect(after.packet(p.name).ref).toEqual(p.ref);
  }
}

describe.each(variants)('XfaPdf.withPacket on an %s', (_title, build) => {
  it('keeps the original bytes as an exact prefix (A1: signature and usage-rights byte ranges stay valid)', async () => {
    const src = build();
    const pdf = await openXfaPdf(src);
    const out = await pdf.withPacket('datasets', enc(NEW_DATASETS));
    expect(out.length).toBeGreaterThan(src.length);
    expect(out.subarray(0, src.length)).toEqual(src);
  });

  it('re-opens with the new datasets bytes and every other packet byte-equal (A2/A4: a wrong object or a rewrite would change them)', async () => {
    const pdf = await openXfaPdf(build());
    const out = await pdf.withPacket('datasets', enc(NEW_DATASETS));
    const again = await openXfaPdf(out);
    expect(dec(again.packet('datasets').bytes)).toBe(NEW_DATASETS);
    expect(again.packet('datasets').ref).toEqual(pdf.packet('datasets').ref);
    expectOthersUnchanged(pdf, again, 'datasets');
    expect(again.isDynamic).toBe(pdf.isDynamic);
    expect(again.hasUsageRights).toBe(pdf.hasUsageRights);
  });

  it('is deterministic: two writes of the same input are byte-identical (D5 deterministic IV)', async () => {
    const pdf = await openXfaPdf(build());
    const a = await pdf.withPacket('datasets', enc(NEW_DATASETS));
    const b = await pdf.withPacket('datasets', enc(NEW_DATASETS));
    expect(a).toEqual(b);
  });

  it('chains: a second update on the output wins and the first update stays an exact prefix (the /Prev chain must resolve)', async () => {
    const first = await (await openXfaPdf(build())).withPacket('datasets', enc(NEW_DATASETS));
    const second = await (await openXfaPdf(first)).withPacket('template', enc('<template>T2</template>'));
    expect(second.subarray(0, first.length)).toEqual(first);
    const final = await openXfaPdf(second);
    expect(dec(final.packet('template').bytes)).toBe('<template>T2</template>');
    expect(dec(final.packet('datasets').bytes)).toBe(NEW_DATASETS);
  });

  it('accepts empty bytes (an empty packet is valid; it must not hit the non-empty PDF-input guard)', async () => {
    const pdf = await openXfaPdf(build());
    const out = await pdf.withPacket('datasets', new Uint8Array(0));
    expect((await openXfaPdf(out)).packet('datasets').bytes).toEqual(new Uint8Array(0));
  });

  it('rejects an unknown packet name with PACKET_NOT_FOUND and does not return a file', async () => {
    const pdf = await openXfaPdf(build());
    await expectXfaError(pdf.withPacket('no-such-packet', enc('x')), 'PACKET_NOT_FOUND');
  });

  it('returns a fresh buffer, never the caller\'s source', async () => {
    const src = build();
    const out = await (await openXfaPdf(src)).withPacket('datasets', enc('x'));
    expect(out.buffer).not.toBe(src.buffer);
  });
});

describe('XfaPdf.withPacket: independence from the caller buffer', () => {
  it('never reads the caller buffer again after the call starts: bytes changed inside the packet stream dictionary cannot reach the output (an indirect /Length forces a second parse of the file)', async () => {
    const build = (): Uint8Array =>
      buildXfaPdf({ packets: [packet('template', '<t/>'), packet('datasets', '<old/>', true, '/Note(plain note)', true)] });
    const expected = await (await openXfaPdf(build())).withPacket('datasets', enc(NEW_DATASETS));

    const src = build();
    const pristine = src.slice();
    const newBytes = enc(NEW_DATASETS);
    const pdf = await openXfaPdf(src);
    const pending = pdf.withPacket('datasets', newBytes);
    const at = dec(src).indexOf('/Note(plain note)');
    expect(at).toBeGreaterThan(-1);
    src.set(enc('/Note(XXXXX XXXX)'), at);
    newBytes.fill(0x5a);
    const out = await pending;

    expect(out.subarray(0, pristine.length)).toEqual(pristine);
    expect(out).toEqual(expected);
  });
});

describe('XfaPdf.withPacket: encrypted-file specifics', () => {
  it('keeps the datasets packet note readable and encrypts it again (the retained string must not be written in clear)', async () => {
    const src = buildEncryptedXfaPdf({ xref: 'stream' });
    const out = await (await openXfaPdf(src)).withPacket('datasets', enc(NEW_DATASETS));
    const appended = dec(out.subarray(src.length));
    expect(appended.includes(DATASETS_NOTE)).toBe(false);
    expect(appended.includes('ROUNDTRIP-TEST')).toBe(false);
    expect(dec((await openXfaPdf(out)).packet('template').bytes)).toBe(ENCRYPTED_TEMPLATE);
  });

  it('replaces the datasets object under its original number and generation', async () => {
    const src = buildEncryptedXfaPdf();
    const pdf = await openXfaPdf(src);
    expect(pdf.packet('datasets').ref).toEqual({ kind: 'ref', num: DATASETS_OBJ, gen: 0 });
    expect(dec(pdf.packet('datasets').bytes)).toBe(ENCRYPTED_DATASETS);
    const out = await pdf.withPacket('datasets', enc(NEW_DATASETS));
    expect(dec(out.subarray(src.length - 1)).includes(`\n${DATASETS_OBJ} 0 obj\n`)).toBe(true);
  });
});

describe('XfaPdf.withPacket: input guard', () => {
  it('rejects anything that is not a Uint8Array (a string or array would be written as garbage or throw a TypeError)', async () => {
    const pdf = await openXfaPdf(buildXfaPdf());
    for (const bad of ['text', [1, 2, 3], null, undefined, new ArrayBuffer(4), { length: 3 }]) {
      await expectMalformed(pdf.withPacket('datasets', bad as unknown as Uint8Array));
    }
  });

  it('rejects bytes above MAX_PDF_BYTES (the 50 MiB ceiling applies to the replacement as well as to the input)', async () => {
    const pdf = await openXfaPdf(buildXfaPdf());
    await expectMalformed(pdf.withPacket('datasets', new Uint8Array(MAX_PDF_BYTES + 1)));
  });

  it('writes a single-stream /XFA packet named xdp', async () => {
    const src = buildXfaPdf({ layout: 'single', packets: [packet('x', '<xdp:xdp/>', true)] });
    const pdf = await openXfaPdf(src);
    const out = await pdf.withPacket('xdp', enc('<xdp:xdp>new</xdp:xdp>'));
    expect(dec((await openXfaPdf(out)).packet('xdp').bytes)).toBe('<xdp:xdp>new</xdp:xdp>');
  });

  it('leaves the default fixture packets untouched when another packet is replaced (guards against replacing by index instead of by name)', async () => {
    const pdf = await openXfaPdf(buildXfaPdf());
    const out = await pdf.withPacket('template', enc('<t/>'));
    const again = await openXfaPdf(out);
    expect(dec(again.packet('datasets').bytes)).toBe(dec(DEFAULT_PACKETS[1]?.content ?? new Uint8Array(0)));
    expect(dec(again.packet('template').bytes)).toBe('<t/>');
  });
});

describe('XfaPdf.withPacket: stream dictionary /DP (F6)', () => {
  it('a packet stream that used /DP predictor parameters round-trips: the stale /DP is dropped with the old encoding', async () => {
    // Rows of 1 tag byte + 4 data bytes (PNG tag 0); decodes to "abcdefgh".
    const pdf = buildXfaPdf({
      packets: [packet('datasets', '\0abcd\0efgh', true, '/DP<</Predictor 12/Columns 4>>')],
    });
    const opened = await openXfaPdf(pdf);
    expect(dec(opened.packet('datasets').bytes)).toBe('abcdefgh');
    const next = 'ROUNDTRIP-TEST'; // 14 bytes: not a whole number of 5-byte predictor rows
    const again = await openXfaPdf(await opened.withPacket('datasets', enc(next)));
    expect(dec(again.packet('datasets').bytes)).toBe(next);
  });
});

describe('XfaPdf.withPacket: output size cap (F7)', () => {
  it('output larger than the limit is MALFORMED "Output exceeds MAX_PDF_BYTES", never a file the engine would refuse to reopen', async () => {
    const src = buildXfaPdf();
    const pdf = await openXfaPdfInternal(src, { maxOutputBytes: src.length + 50 });
    const err = await expectMalformed(pdf.withPacket('datasets', enc('y'.repeat(2000))));
    expect(err.message).toBe('Output exceeds MAX_PDF_BYTES');
  });

  it('output at or under the limit is returned', async () => {
    const src = buildXfaPdf();
    const free = await (await openXfaPdf(src)).withPacket('datasets', enc('y'));
    const pdf = await openXfaPdfInternal(src, { maxOutputBytes: free.length });
    expect((await pdf.withPacket('datasets', enc('y'))).length).toBe(free.length);
  });

  it('the production limit is the same MAX_PDF_BYTES that openXfaPdf enforces on input', async () => {
    const out = await (await openXfaPdf(buildXfaPdf())).withPacket('datasets', enc('y'));
    expect(out.length).toBeLessThanOrEqual(MAX_PDF_BYTES);
  });
});

describe('XfaPdf.withPacket: the highest object number (L3-F3)', () => {
  it('a file whose /Size is 0xFFFFFF gets its update xref stream numbered 0xFFFFFF, and the engine reopens the result', async () => {
    const src = buildXfaPdf();
    const text = dec(src);
    const patched = enc(text.replace(/\/Size \d+\/Root/, '/Size 16777215/Root'));
    expect(patched.length).not.toBe(0);
    const pdf = await openXfaPdf(patched);
    const out = await pdf.withPacket('datasets', enc('<d/>'));
    expect(dec(out)).toContain('\n16777215 0 obj\n');
    expect((await openXfaPdf(out)).packet('datasets').text()).toBe('<d/>');
  });
});
