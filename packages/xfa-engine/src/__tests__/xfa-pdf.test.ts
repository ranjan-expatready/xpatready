import { describe, expect, it, vi } from 'vitest';
import { dec, enc } from '../pdf/__tests__/bytes.js';
import { expectMalformed, expectXfaError } from '../pdf/__tests__/expect-malformed.js';
import { MAX_PDF_BYTES, openXfaPdf } from '../xfa-pdf.js';
import { buildXfaPdf, DEFAULT_PACKETS, packet } from './fixtures/build-xfa-pdf.js';

describe('openXfaPdf packet extraction', () => {
  it('keeps /XFA array order, names and decoded bytes for mixed compressed and plain packets (no reordering, no raw filtered bytes)', async () => {
    const pdf = await openXfaPdf(buildXfaPdf());
    expect(pdf.packets.map((p) => p.name)).toEqual(['template', 'datasets', '</xdp:xdp>']);
    expect(pdf.packets.map((p) => dec(p.bytes))).toEqual(DEFAULT_PACKETS.map((p) => dec(p.content)));
    expect(pdf.packets.map((p) => p.ref.num)).toEqual([10, 11, 12]);
  });

  it('exposes a single-stream /XFA as one packet named xdp (not NOT_XFA, not an empty list)', async () => {
    const pdf = await openXfaPdf(buildXfaPdf({ layout: 'single', packets: [packet('ignored', '<xdp:xdp/>', true)] }));
    expect(pdf.packets).toHaveLength(1);
    expect(pdf.packet('xdp').name).toBe('xdp');
    expect(dec(pdf.packet('xdp').bytes)).toBe('<xdp:xdp/>');
  });

  it('follows an indirect /XFA array and an indirect /AcroForm (no assuming direct objects)', async () => {
    const a = await openXfaPdf(buildXfaPdf({ layout: 'indirect-array' }));
    const b = await openXfaPdf(buildXfaPdf({ acroFormIndirect: true }));
    expect(a.packets.map((p) => p.name)).toEqual(['template', 'datasets', '</xdp:xdp>']);
    expect(b.packets.map((p) => p.name)).toEqual(['template', 'datasets', '</xdp:xdp>']);
  });

  it('reports isDynamic only when catalog /NeedsRendering is true (absent or false must not look dynamic)', async () => {
    expect((await openXfaPdf(buildXfaPdf({ needsRendering: 'true' }))).isDynamic).toBe(true);
    expect((await openXfaPdf(buildXfaPdf({ needsRendering: 'false' }))).isDynamic).toBe(false);
    expect((await openXfaPdf(buildXfaPdf())).isDynamic).toBe(false);
  });

  it('reports hasUsageRights only when /Perms carries /UR3 (a DocMDP-only or absent /Perms must not count)', async () => {
    expect((await openXfaPdf(buildXfaPdf({ perms: 'ur3' }))).hasUsageRights).toBe(true);
    expect((await openXfaPdf(buildXfaPdf({ perms: 'docmdp-only' }))).hasUsageRights).toBe(false);
    expect((await openXfaPdf(buildXfaPdf())).hasUsageRights).toBe(false);
  });

  it('also reports hasUsageRights for the legacy /UR entry (older usage rights are invalidated by edits just like /UR3)', async () => {
    expect((await openXfaPdf(buildXfaPdf({ perms: 'ur' }))).hasUsageRights).toBe(true);
  });

  it('decodes each packet text once and returns the identical string afterwards (no re-decoding multi-MB templates per call)', async () => {
    const pdf = await openXfaPdf(buildXfaPdf());
    const decode = vi.spyOn(TextDecoder.prototype, 'decode');
    try {
      const before = decode.mock.calls.length;
      const first = pdf.packet('template').text();
      const second = pdf.packet('template').text();
      pdf.xdpText();
      pdf.xdpText();
      expect(second).toBe(first);
      // template, datasets and the closing packet: three decodes in total, however many reads follow.
      expect(decode.mock.calls.length - before).toBe(3);
    } finally {
      decode.mockRestore();
    }
  });

  it('decodes packet names byte-for-byte as Latin-1 (UTF-8 decoding would corrupt bytes above 0x7F)', async () => {
    const odd = { nameBytes: Uint8Array.from([0x63, 0x61, 0x66, 0xe9, 0xff]), content: enc('x') };
    const pdf = await openXfaPdf(buildXfaPdf({ packets: [odd] }));
    expect(pdf.packets[0]?.name).toBe('caféÿ');
    expect(pdf.packet('caféÿ').bytes).toEqual(enc('x'));
  });

  it('decodes packet text as UTF-8 (Latin-1 decoding would turn multi-byte characters into mojibake)', async () => {
    const utf8 = { nameBytes: enc('datasets'), content: new TextEncoder().encode('<a>é€</a>') };
    const pdf = await openXfaPdf(buildXfaPdf({ packets: [utf8] }));
    expect(pdf.packet('datasets').text()).toBe('<a>é€</a>');
  });

  it('xdpText concatenates every packet in order (dropping or reordering packets breaks the XDP document)', async () => {
    const pdf = await openXfaPdf(buildXfaPdf());
    expect(pdf.xdpText()).toBe(DEFAULT_PACKETS.map((p) => dec(p.content)).join(''));
  });

  it('throws PACKET_NOT_FOUND for an absent packet name instead of returning undefined', async () => {
    const pdf = await openXfaPdf(buildXfaPdf());
    expect(() => pdf.packet('nope')).toThrowError(expect.objectContaining({ code: 'PACKET_NOT_FOUND' }));
  });

  it('keeps the caller bytes as `source` untouched (write-back needs the original bytes)', async () => {
    const bytes = buildXfaPdf();
    const copy = bytes.slice();
    const pdf = await openXfaPdf(bytes);
    expect(pdf.source).toBe(bytes);
    expect(bytes).toEqual(copy);
  });
});

describe('openXfaPdf rejections', () => {
  it('rejects a PDF without /XFA or without /AcroForm as NOT_XFA (not MALFORMED, not an empty packet list)', async () => {
    await expectXfaError(openXfaPdf(buildXfaPdf({ layout: 'none' })), 'NOT_XFA');
    await expectXfaError(openXfaPdf(buildXfaPdf({ layout: 'no-acroform' })), 'NOT_XFA');
  });

  it('rejects empty input, non-Uint8Array input and oversize input as MALFORMED via the schema guard (no TypeError, no giant parse)', async () => {
    await expectMalformed(openXfaPdf(new Uint8Array(0)));
    const wrongTypes: readonly unknown[] = ['%PDF-1.7', null, undefined, 42, [1, 2, 3], new ArrayBuffer(8), {}];
    for (const bad of wrongTypes) {
      await expectMalformed(openXfaPdf(bad as Uint8Array));
    }
    await expectMalformed(openXfaPdf(new Uint8Array(MAX_PDF_BYTES + 1)));
  });

  it('exports MAX_PDF_BYTES as 50 MiB', () => {
    expect(MAX_PDF_BYTES).toBe(50 * 1024 * 1024);
  });

  it.each([
    ['odd-length array', '[<6162> 10 0 R <6364>]'],
    ['non-string packet name', '[/abc 10 0 R]'],
    ['packet entry that is not a reference', '[<6162> 7]'],
    ['reference to a missing object', '[<6162> 99 0 R]'],
    ['reference to a non-stream object', '[<6162> 4 0 R]'],
  ])('rejects a hostile /XFA array (%s) as MALFORMED, never a TypeError', async (_label, rawXfaArray) => {
    await expectMalformed(openXfaPdf(buildXfaPdf({ rawXfaArray })));
  });

  it('rejects an empty /XFA array as NOT_XFA (a form with zero packets is not an XFA form)', async () => {
    await expectXfaError(openXfaPdf(buildXfaPdf({ rawXfaArray: '[]' })), 'NOT_XFA');
  });

  it('rejects a single-stream /XFA that reaches the stream through a reference chain (packet ref must be the stream object itself)', async () => {
    await expectMalformed(openXfaPdf(buildXfaPdf({ layout: 'single-via-ref' })));
  });

  it('rejects an /XFA that is neither array nor stream as MALFORMED', async () => {
    await expectMalformed(openXfaPdf(buildXfaPdf({ rawXfaArray: '42' })));
  });
});
