import { describe, expect, it } from 'vitest';
import { decodeImage } from '../decode.js';
import { decodeTiff } from '../tiff.js';
import { buildTiff, expectImageError, limitsOf, long, opaque, rasterOf, rational, short } from './helpers.js';

const BUDGET = { maxSidePx: 32_768, maxPixels: 16_777_216 };
const BASE = (width: number, height: number, photometric: number, bits: number, samples = 1) => [
  long(256, width),
  long(257, height),
  short(258, ...new Array<number>(samples).fill(bits)),
  short(259, 1),
  short(262, photometric),
  long(273),
  short(277, samples),
  long(278, height),
  long(279),
];

describe('decodeTiff: every supported variant, pixel for pixel', () => {
  it('bilevel, 1 bit, BlackIsZero: a set bit is white; ten columns cross a byte boundary and rows are padded', () => {
    const strip = [0b10101010, 0b10000000, 0b11111111, 0b11000000];
    const { image, rows } = rasterOf(buildTiff({ tags: BASE(10, 2, 1, 1), strips: [strip] }));
    expect([image.widthPx, image.heightPx]).toEqual([10, 2]);
    expect(rows[0]?.map((p) => p[0])).toEqual([255, 0, 255, 0, 255, 0, 255, 0, 255, 0]);
    expect(rows[1]?.map((p) => p[0])).toEqual(new Array<number>(10).fill(255));
    expect(rows[0]?.[0]).toEqual(opaque(255, 255, 255));
  });

  it('bilevel, WhiteIsZero: a set bit is black', () => {
    const { rows } = rasterOf(buildTiff({ tags: BASE(3, 1, 0, 1), strips: [[0b10100000]] }));
    expect(rows[0]).toEqual([opaque(0, 0, 0), opaque(255, 255, 255), opaque(0, 0, 0)]);
  });

  it('grey at 2, 4 and 8 bits scales to the full range', () => {
    expect(rasterOf(buildTiff({ tags: BASE(4, 1, 1, 2), strips: [[0b00011011]] })).rows[0]?.map((p) => p[0])).toEqual([0, 85, 170, 255]);
    expect(rasterOf(buildTiff({ tags: BASE(3, 1, 1, 4), strips: [[0x0f, 0x50]] })).rows[0]?.map((p) => p[0])).toEqual([0, 255, 85]);
    expect(rasterOf(buildTiff({ tags: BASE(3, 1, 1, 8), strips: [[7, 128, 250]] })).rows[0]?.map((p) => p[0])).toEqual([7, 128, 250]);
  });

  it('grey at 16 bits keeps the high byte, in either byte order', () => {
    expect(rasterOf(buildTiff({ tags: BASE(2, 1, 1, 16), strips: [[0x34, 0x12, 0xff, 0x00]] })).rows[0]?.map((p) => p[0])).toEqual([0x12, 0x00]);
    expect(rasterOf(buildTiff({ littleEndian: false, tags: BASE(2, 1, 1, 16), strips: [[0x12, 0x34, 0x00, 0xff]] })).rows[0]?.map((p) => p[0])).toEqual([0x12, 0x00]);
  });

  it('RGB at 8 and 16 bits, chunky', () => {
    expect(rasterOf(buildTiff({ tags: BASE(2, 1, 2, 8, 3), strips: [[255, 0, 0, 1, 2, 3]] })).rows[0]).toEqual([opaque(255, 0, 0), opaque(1, 2, 3)]);
    expect(rasterOf(buildTiff({ littleEndian: false, tags: BASE(1, 1, 2, 16, 3), strips: [[0xaa, 0x01, 0xbb, 0x02, 0xcc, 0x03]] })).rows[0]).toEqual([opaque(0xaa, 0xbb, 0xcc)]);
  });

  it('several strips, each starting its own rows (here one row per strip, the last one short)', () => {
    const tags = [...BASE(2, 3, 1, 8).filter((t) => t.tag !== 278), long(278, 2)];
    const { rows } = rasterOf(buildTiff({ tags, strips: [[1, 2, 3, 4], [5, 6]] }));
    expect(rows.map((row) => row.map((p) => p[0]))).toEqual([[1, 2], [3, 4], [5, 6]]);
  });

  it('a missing RowsPerStrip is one strip for the whole image, and missing byte counts are allowed for one strip', () => {
    const tags = BASE(2, 2, 1, 8).filter((t) => t.tag !== 278 && t.tag !== 279);
    expect(rasterOf(buildTiff({ tags, strips: [[9, 8, 7, 6]] })).rows.map((row) => row.map((p) => p[0]))).toEqual([[9, 8], [7, 6]]);
  });

  it('reads the resolution in inches or centimetres, and 96 dpi when it is absent, in no unit, or has a zero denominator', () => {
    const tags = (extra: ReturnType<typeof short>[]) => [...BASE(1, 1, 1, 8), ...extra];
    const dpi = (extra: ReturnType<typeof short>[]) => rasterOf(buildTiff({ tags: tags(extra), strips: [[0]] })).image;
    expect(dpi([rational(282, 300, 1), rational(283, 150, 1), short(296, 2)])).toMatchObject({ dpiX: 300, dpiY: 150 });
    expect(dpi([rational(282, 11811, 100), rational(283, 11811, 100), short(296, 3)]).dpiX).toBeCloseTo(300, 0);
    expect(dpi([rational(282, 300, 1), rational(283, 300, 1)])).toMatchObject({ dpiX: 300 });
    expect(dpi([])).toMatchObject({ dpiX: 96, dpiY: 96 });
    expect(dpi([rational(282, 300, 1), rational(283, 300, 1), short(296, 1)])).toMatchObject({ dpiX: 96 });
    expect(dpi([rational(282, 300, 0), rational(283, 300, 1), short(296, 2)])).toMatchObject({ dpiX: 96, dpiY: 300 });
  });

  it('a resolution unit that is the wrong type, has several values or is out of range costs the resolution (96 dpi), never the decoded picture', () => {
    const dpi = (extra: ReturnType<typeof short>[]) => rasterOf(buildTiff({ tags: [...BASE(1, 1, 1, 8), ...extra], strips: [[0]] })).image;
    expect(dpi([rational(282, 300, 1), rational(283, 300, 1), rational(296, 2, 1)])).toMatchObject({ dpiX: 96, dpiY: 96 });
    expect(dpi([rational(282, 300, 1), rational(283, 300, 1), short(296, 2, 2)])).toMatchObject({ dpiX: 96, dpiY: 96 });
    expect(dpi([rational(282, 300, 1), rational(283, 300, 1), short(296, 7)])).toMatchObject({ dpiX: 96, dpiY: 96 });
    expect(dpi([rational(282, 300, 1), rational(283, 300, 1), long(296, 4_000_000_000)])).toMatchObject({ dpiX: 96, dpiY: 96 });
  });

  it('the first of two entries for one tag is the one read', () => {
    const tags = [...BASE(2, 1, 1, 8), short(259, 5), long(256, 99)];
    const { image, rows } = rasterOf(buildTiff({ tags, strips: [[10, 20]] }));
    expect(image.widthPx).toBe(2);
    expect(rows[0]?.map((p) => p[0])).toEqual([10, 20]);
  });
});

describe('decodeTiff: hostile and unsupported input is a typed failure, never a partial picture', () => {
  const decode = (bytes: Uint8Array, over = {}): unknown => decodeImage(bytes, limitsOf(over));
  const good = (): Uint8Array => buildTiff({ tags: BASE(2, 2, 1, 8), strips: [[1, 2, 3, 4]] });
  const withTags = (tags: ReturnType<typeof short>[], strips = [[1, 2, 3, 4]]): Uint8Array => buildTiff({ tags, strips });
  const replace = (tag: number, ...values: number[]): ReturnType<typeof short>[] => [...BASE(2, 2, 1, 8).filter((t) => t.tag !== tag), short(tag, ...values)];

  it('compressed data is unsupported, by name, and an unknown compression by number', () => {
    for (const [code, name] of [[5, /LZW/], [7, /JPEG/], [8, /Deflate/], [32773, /PackBits/], [4, /Group 4/], [99, /compression 99/]] as const) {
      expectImageError(() => decode(withTags(replace(259, code))), 'unsupported', name);
    }
  });

  it('palette, CMYK and other colour models, extra samples, tiles, planar data, fill order, orientation and float data are unsupported', () => {
    expectImageError(() => decode(withTags(replace(262, 3))), 'unsupported', /photometric interpretation 3/);
    expectImageError(() => decode(withTags(replace(262, 5))), 'unsupported', /photometric interpretation 5/);
    expectImageError(() => decode(withTags([...BASE(2, 2, 2, 8, 4)])), 'unsupported', /4 samples/);
    expectImageError(() => decode(withTags([...BASE(2, 2, 1, 8), short(338, 2)])), 'unsupported', /extra samples/);
    expectImageError(() => decode(withTags([...BASE(2, 2, 1, 8), long(322, 16)])), 'unsupported', /tiles/);
    expectImageError(() => decode(withTags(replace(284, 2))), 'unsupported', /planar/);
    expectImageError(() => decode(withTags(replace(266, 2))), 'unsupported', /fill order/);
    expectImageError(() => decode(withTags(replace(274, 6))), 'unsupported', /orientation/);
    expectImageError(() => decode(withTags(replace(339, 3))), 'unsupported', /sample format/);
  });

  it('a bits-per-sample tag that lists no values, or fewer than the samples, is malformed', () => {
    expectImageError(() => decode(withTags(replace(258))), 'malformed', /fewer values/);
    expectImageError(() => decode(buildTiff({ tags: BASE(1, 1, 2, 8, 3).map((t) => (t.tag === 258 ? short(258, 8, 8) : t)), strips: [[0, 0, 0]] })), 'malformed', /fewer values/);
  });

  it('odd bit depths are unsupported, as is a different depth per sample', () => {
    for (const bits of [3, 5, 6, 7, 12, 24, 32, 64]) expectImageError(() => decode(withTags(replace(258, bits))), 'unsupported', new RegExp(`${bits} bits per sample`));
    expectImageError(() => decode(buildTiff({ tags: BASE(1, 1, 2, 8, 3).map((t) => (t.tag === 258 ? short(258, 8, 8, 16) : t)), strips: [[0, 0, 0]] })), 'unsupported', /different bit depths/);
    expectImageError(() => decode(buildTiff({ tags: BASE(1, 1, 2, 1, 3), strips: [[0]] })), 'unsupported', /1 bits per sample/);
  });

  it('a zero dimension, zero rows per strip, strips that do not cover the image and a missing photometric are malformed', () => {
    expectImageError(() => decode(withTags([...BASE(2, 2, 1, 8).filter((t) => t.tag !== 256), long(256, 0)])), 'malformed', /zero dimension/);
    expectImageError(() => decode(withTags(replace(278, 0).map((t) => (t.tag === 278 ? long(278, 0) : t)))), 'malformed', /rows per strip/);
    expectImageError(() => decode(buildTiff({ tags: [...BASE(2, 4, 1, 8).filter((t) => t.tag !== 278), long(278, 2)], strips: [[1, 2, 3, 4]] })), 'malformed', /offsets/);
    expectImageError(() => decode(withTags(BASE(2, 2, 1, 8).filter((t) => t.tag !== 262))), 'malformed', /tag 262/);
    expectImageError(() => decode(withTags([...BASE(2, 2, 1, 8).filter((t) => t.tag !== 256), long(256, 1, 2)])), 'malformed', /not one/);
  });

  it('strip data that reaches past the file is truncated; a byte count smaller than its rows is malformed', () => {
    const bytes = good();
    // The strip data is first in the file: cut the file inside the strip.
    expectImageError(() => decode(buildTiff({ tags: [...BASE(2, 2, 1, 8).filter((t) => t.tag !== 273), long(273, 100000)], strips: [[1, 2, 3, 4]] })), 'truncated', /strip 0/);
    expectImageError(() => decode(bytes.subarray(0, 6)), 'truncated');
    expectImageError(() => decode(buildTiff({ tags: [...BASE(2, 2, 1, 8).filter((t) => t.tag !== 279), long(279, 3)], strips: [[1, 2, 3, 4]] })), 'malformed', /shorter/);
  });

  it('a bad header is refused: byte order, version, BigTIFF, a directory offset in or beyond the file, an empty directory', () => {
    const bytes = good();
    const patched = (at: number, value: number[]): Uint8Array => Uint8Array.from(bytes, (b, i) => (i >= at && i < at + value.length ? (value[i - at] ?? b) : b));
    expectImageError(() => decode(patched(0, [0x58, 0x58])), 'unsupported', /image format/);
    expectImageError(() => decodeTiff(patched(0, [0x58, 0x58]), BUDGET), 'malformed', /byte order/);
    expectImageError(() => decodeTiff(patched(2, [41, 0]), BUDGET), 'malformed', /version/);
    expectImageError(() => decode(patched(2, [43, 0])), 'unsupported', /BigTIFF/);
    expectImageError(() => decode(patched(4, [4, 0, 0, 0])), 'malformed', /inside the header/);
    expectImageError(() => decode(patched(4, [0xff, 0xff, 0xff, 0x7f])), 'truncated');
    const emptyDirectory = patched(Number(new DataView(bytes.buffer).getUint32(4, true)), [0, 0]);
    expectImageError(() => decode(emptyDirectory), 'malformed', /no entries/);
  });

  it('a directory that claims 65,535 entries over a short file is truncated, and a strip table claiming 2^32 values is over the limit', () => {
    const bytes = good();
    const at = new DataView(bytes.buffer).getUint32(4, true);
    const claimed = Uint8Array.from(bytes, (b, i) => (i === at ? 0xff : i === at + 1 ? 0xff : b));
    expectImageError(() => decode(claimed), 'truncated', /directory/);
    const hugeTable = buildTiff({ tags: BASE(2, 2, 1, 8).map((t) => (t.tag === 273 ? { ...t, values: [8] } : t)), strips: [[1, 2, 3, 4]] });
    const entry = new DataView(hugeTable.buffer).getUint32(4, true) + 2 + BASE(2, 2, 1, 8).map((t) => t.tag).sort((a, b) => a - b).indexOf(273) * 12;
    const view = new DataView(hugeTable.buffer);
    view.setUint32(entry + 4, 0xffffffff, true);
    expectImageError(() => decode(hugeTable), 'limit', /value ceiling/);
  });

  it('a header claiming a huge picture is over the limit before anything is allocated', () => {
    const before = process.memoryUsage().arrayBuffers;
    for (const [w, h] of [[0xffffffff, 0xffffffff], [40_000, 1], [30_000, 30_000], [4097, 4096]] as const) {
      expectImageError(() => decode(buildTiff({ tags: [...BASE(w, h, 1, 8).filter((t) => t.tag !== 278), long(278, h)], strips: [[0]] })), 'limit');
    }
    expectImageError(() => decode(buildTiff({ tags: BASE(4096, 4096, 1, 8), strips: [[0]] })), 'malformed', /shorter than its rows/);
    expectImageError(() => decode(buildTiff({ tags: BASE(4096, 4096, 1, 8).map((t) => (t.tag === 279 ? long(279, 16_777_216) : t)), strips: [[0]] })), 'truncated', /strip 0/);
    expect(process.memoryUsage().arrayBuffers - before).toBeLessThan(8 * 1024 * 1024);
  });

  it('a one-bit picture that would expand 32 times is held to the pixel ceiling (the decompression-bomb case)', () => {
    const bytes = buildTiff({ tags: BASE(100, 100, 1, 1), strips: [new Array<number>(1300).fill(0xff)] });
    expectImageError(() => decode(bytes, { maxPixels: 9_999 }), 'limit', /pixel ceiling/);
    expect(decodeImage(bytes, limitsOf(), 40_000).bytes).toHaveLength(40_000);
  });
});
