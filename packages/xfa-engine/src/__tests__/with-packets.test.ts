import { describe, expect, it } from 'vitest';
import { dec, enc } from '../pdf/__tests__/bytes.js';
import { expectMalformed, expectXfaError } from '../pdf/__tests__/expect-malformed.js';
import { openXfaPdf } from '../xfa-pdf.js';
import { buildEncryptedXfaPdf } from './fixtures/build-encrypted-xfa-pdf.js';
import { buildXfaPdf, packet } from './fixtures/build-xfa-pdf.js';

const NEW_DATASETS = '<xfa:datasets xmlns:xfa="urn:y"><xfa:data><Name>TWO-PACKET-TEST</Name></xfa:data></xfa:datasets>';
const NEW_FORM = '<form checksum="x" xmlns="http://www.xfa.org/schema/xfa-form/2.8/"\n><subform name="form1"\n/></form\n>';

const PACKETS = [
  packet('template', '<template xmlns="urn:x">T</template>', true),
  packet('datasets', '<xfa:datasets xmlns:xfa="urn:y"><xfa:data/></xfa:datasets>'),
  packet('form', '<form xmlns="urn:f"/>', true),
  packet('</xdp:xdp>', '\n'),
];

const variants: [string, () => Uint8Array][] = [
  ['unencrypted classic file', () => buildXfaPdf({ perms: 'ur3', needsRendering: 'true', packets: PACKETS })],
  ['AESV2 file with an xref stream', () => buildEncryptedXfaPdf({ xref: 'stream' })],
];

/** Number of `startxref` keywords after `from`: one per appended update section. */
function sectionsAfter(bytes: Uint8Array, from: number): number {
  return dec(bytes.subarray(from)).split('startxref').length - 1;
}

describe('XfaPdf.withPackets: several packets replaced in ONE incremental update', () => {
  it('writes both packets in one appended section, keeps the original bytes as an exact prefix and every other packet byte-equal', async () => {
    const src = buildXfaPdf({ packets: PACKETS });
    const pdf = await openXfaPdf(src);
    const out = await pdf.withPackets([
      { name: 'datasets', bytes: enc(NEW_DATASETS) },
      { name: 'form', bytes: enc(NEW_FORM) },
    ]);
    expect(out.subarray(0, src.length)).toEqual(src);
    expect(sectionsAfter(out, src.length)).toBe(1);
    const again = await openXfaPdf(out);
    expect(dec(again.packet('datasets').bytes)).toBe(NEW_DATASETS);
    expect(dec(again.packet('form').bytes)).toBe(NEW_FORM);
    expect(again.packet('form').ref).toEqual(pdf.packet('form').ref);
    expect(again.packet('template').bytes).toEqual(pdf.packet('template').bytes);
    expect(again.packet('</xdp:xdp>').bytes).toEqual(pdf.packet('</xdp:xdp>').bytes);
  });

  it.each(variants)('on an %s, one entry gives exactly the bytes withPacket gives (the single-packet writer is unchanged)', async (_t, build) => {
    const pdf = await openXfaPdf(build());
    const single = await pdf.withPacket('datasets', enc(NEW_DATASETS));
    expect(await pdf.withPackets([{ name: 'datasets', bytes: enc(NEW_DATASETS) }])).toEqual(single);
  });

  it('is deterministic whatever order the entries are given in', async () => {
    const pdf = await openXfaPdf(buildXfaPdf({ packets: PACKETS }));
    const a = await pdf.withPackets([
      { name: 'datasets', bytes: enc(NEW_DATASETS) },
      { name: 'form', bytes: enc(NEW_FORM) },
    ]);
    const b = await pdf.withPackets([
      { name: 'form', bytes: enc(NEW_FORM) },
      { name: 'datasets', bytes: enc(NEW_DATASETS) },
    ]);
    expect(a).toEqual(b);
  });

  it('refuses an unknown packet (PACKET_NOT_FOUND), the same packet twice, an empty list, and a non-byte entry (MALFORMED)', async () => {
    const pdf = await openXfaPdf(buildXfaPdf({ packets: PACKETS }));
    await expectXfaError(pdf.withPackets([{ name: 'nope', bytes: enc('x') }]), 'PACKET_NOT_FOUND');
    await expectMalformed(
      pdf.withPackets([
        { name: 'form', bytes: enc('a') },
        { name: 'form', bytes: enc('b') },
      ]),
    );
    await expectMalformed(pdf.withPackets([]));
    await expectMalformed(pdf.withPackets([{ name: 'form', bytes: 'text' as unknown as Uint8Array }]));
  });
});
