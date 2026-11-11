import { describe, expect, it } from 'vitest';
import { decodeImage } from '../decode.js';
import { MAX_IMAGE_BYTES } from '../../limits.js';
import { buildBmp, expectImageError, limitsOf, opaque, rasterOf } from './helpers.js';

const RED = opaque(255, 0, 0);
const GREEN = opaque(0, 255, 0);
const BLUE = opaque(0, 0, 255);
const WHITE = opaque(255, 255, 255);
const BLACK = opaque(0, 0, 0);

describe('decodeBmp: every uncompressed variant, pixel for pixel', () => {
  // The picture, top row first: red green / blue white. 24 bits: BGR, rows padded from 6 to 8 bytes.
  const picture24 = [
    [0, 0, 255, 0, 255, 0, 0, 0], // top row on file (top-down)
    [255, 0, 0, 255, 255, 255, 0, 0],
  ];

  it('24 bits per pixel, bottom-up: the first row of the file is the bottom of the picture', () => {
    const { image, rows } = rasterOf(buildBmp({ width: 2, height: 2, bitsPerPixel: 24, rows: [...picture24].reverse() }));
    expect([image.widthPx, image.heightPx]).toEqual([2, 2]);
    expect(rows).toEqual([[RED, GREEN], [BLUE, WHITE]]);
  });

  it('24 bits per pixel, top-down (negative height)', () => {
    const { rows } = rasterOf(buildBmp({ width: 2, height: -2, bitsPerPixel: 24, rows: picture24 }));
    expect(rows).toEqual([[RED, GREEN], [BLUE, WHITE]]);
  });

  it('1 bit per pixel through a two-colour palette, ten columns across a byte boundary', () => {
    const bits = [1, 0, 1, 0, 1, 0, 1, 0, 1, 1];
    const row = [0b10101010, 0b11000000, 0, 0];
    const { rows } = rasterOf(buildBmp({ width: 10, height: 1, bitsPerPixel: 1, rows: [row], palette: [[10, 20, 30], [200, 210, 220]] }));
    expect(rows[0]).toEqual(bits.map((b) => (b === 1 ? opaque(200, 210, 220) : opaque(10, 20, 30))));
  });

  it('4 bits per pixel, high nibble first; an index past the palette is black', () => {
    const { rows } = rasterOf(buildBmp({ width: 3, height: 1, bitsPerPixel: 4, rows: [[0x12, 0x50, 0, 0]], palette: [[1, 1, 1], [2, 2, 2], [3, 3, 3]], colourCount: 3 }));
    expect(rows[0]).toEqual([opaque(2, 2, 2), opaque(3, 3, 3), BLACK]);
  });

  it('8 bits per pixel through a palette stored blue, green, red', () => {
    const { rows } = rasterOf(buildBmp({ width: 4, height: 1, bitsPerPixel: 8, rows: [[3, 2, 1, 0]], palette: [[255, 0, 0], [0, 255, 0], [0, 0, 255], [9, 8, 7]], colourCount: 4 }));
    expect(rows[0]).toEqual([opaque(9, 8, 7), BLUE, GREEN, RED]);
  });

  it('16 bits per pixel without bit fields is 5-5-5', () => {
    const { rows } = rasterOf(buildBmp({ width: 2, height: 1, bitsPerPixel: 16, rows: [[0x00, 0x7c, 0x1f, 0x00]] }));
    expect(rows[0]).toEqual([RED, BLUE]);
  });

  it('16 bits per pixel with bit fields (5-6-5) scales each channel to 8 bits, rounded', () => {
    const { rows } = rasterOf(buildBmp({ width: 3, height: 1, bitsPerPixel: 16, compression: 3, masks: [0xf800, 0x07e0, 0x001f], rows: [[0x00, 0xf8, 0xe0, 0x07, 0x10, 0x84, 0, 0]] }));
    // 0x8410: red 16/31, green 32/63, blue 16/31.
    expect(rows[0]).toEqual([RED, GREEN, [Math.round((16 * 255) / 31), Math.round((32 * 255) / 63), Math.round((16 * 255) / 31), 255]]);
  });

  it('32 bits per pixel without bit fields ignores the unused fourth byte (opaque)', () => {
    const { rows } = rasterOf(buildBmp({ width: 1, height: 1, bitsPerPixel: 32, rows: [[10, 20, 30, 0]] }));
    expect(rows[0]).toEqual([opaque(30, 20, 10)]);
  });

  it('32 bits per pixel with an alpha mask (version 4 header) keeps straight alpha', () => {
    const { rows } = rasterOf(buildBmp({ width: 1, height: 1, bitsPerPixel: 32, headerSize: 108, compression: 3, masks: [0xff0000, 0xff00, 0xff, 0xff000000], rows: [[10, 20, 30, 128]] }));
    expect(rows[0]).toEqual([[30, 20, 10, 128]]);
  });

  it('32 bits per pixel with bit fields after a 40-byte header, including a full 32-bit mask', () => {
    const { rows } = rasterOf(buildBmp({ width: 1, height: 1, bitsPerPixel: 32, compression: 6, masks: [0xff000000, 0x00ff0000, 0x0000ff00, 0x000000ff], rows: [[1, 2, 3, 4]] }));
    // Little-endian pixel 0x04030201: red 04, green 03, blue 02, alpha 01.
    expect(rows[0]).toEqual([[4, 3, 2, 1]]);
  });

  it('a version 5 header (124 bytes) reads like the 40-byte one, and its pixel data starts where bfOffBits says', () => {
    const { rows } = rasterOf(buildBmp({ width: 2, height: 1, bitsPerPixel: 24, headerSize: 124, rows: [[0, 0, 255, 255, 0, 0, 0, 0]] }));
    expect(rows[0]).toEqual([RED, BLUE]);
    expect(rasterOf(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, headerSize: 124, rows: [[1, 2, 3, 0]], perMetre: 3780 })).image.dpiX).toBeCloseTo(96.012, 3);
  });

  it('channel masks of different widths scale each channel to 8 bits: 8-4-4 in 16 bits, and a 16-bit channel in 32 bits', () => {
    expect(rasterOf(buildBmp({ width: 1, height: 1, bitsPerPixel: 16, compression: 3, masks: [0xff00, 0x00f0, 0x000f], rows: [[0x5c, 0xab, 0, 0]] })).rows[0]).toEqual([opaque(0xab, 85, 204)]);
    expect(rasterOf(buildBmp({ width: 1, height: 1, bitsPerPixel: 32, compression: 3, masks: [0xffff0000, 0x0000ff00, 0x000000ff], rows: [[0x34, 0x12, 0xff, 0x80]] })).rows[0]).toEqual([opaque(Math.round((0x80ff * 255) / 65535), 0x12, 0x34)]);
  });

  it('an OS/2 core header (12 bytes, 3-byte palette entries) with 8 and 24 bits', () => {
    expect(rasterOf(buildBmp({ width: 2, height: 1, bitsPerPixel: 8, headerSize: 12, rows: [[1, 0, 0, 0]], palette: [[1, 2, 3], [4, 5, 6], ...Array.from({ length: 254 }, () => [0, 0, 0] as const)] })).rows[0]).toEqual([opaque(4, 5, 6), opaque(1, 2, 3)]);
    expect(rasterOf(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, headerSize: 12, rows: [[3, 2, 1, 0]] })).rows[0]).toEqual([opaque(1, 2, 3)]);
  });

  it('reads the stated resolution (pixels per metre) as dpi, and 96 when none or nonsense is stated', () => {
    const rows = [[0, 0, 0, 0]];
    expect(rasterOf(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows, perMetre: 11811 })).image.dpiX).toBeCloseTo(300, 0);
    expect(rasterOf(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows })).image).toMatchObject({ dpiX: 96, dpiY: 96 });
    expect(rasterOf(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows, perMetre: 0x7fffffff })).image).toMatchObject({ dpiX: 96 });
  });
});

describe('decodeBmp: hostile and unsupported input is a typed failure, never a partial picture', () => {
  const ok = (): Uint8Array => buildBmp({ width: 2, height: 2, bitsPerPixel: 24, rows: [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]] });
  const decode = (bytes: Uint8Array, over = {}): unknown => decodeImage(bytes, limitsOf(over));

  it('pixel data shorter than the header says is truncated, however little is missing; so is a file that ends in the header', () => {
    const bytes = ok();
    expectImageError(() => decode(bytes.subarray(0, bytes.length - 1)), 'truncated', /pixel data/);
    expectImageError(() => decode(bytes.subarray(0, 20)), 'truncated');
    expectImageError(() => decode(bytes.subarray(0, 2)), 'truncated');
    expectImageError(() => decode(buildBmp({ width: 2, height: 2, bitsPerPixel: 24, rows: [], pixelsAt: 5000 })), 'truncated');
  });

  it('a palette that ends the file is truncated', () => {
    const bytes = buildBmp({ width: 1, height: 1, bitsPerPixel: 8, rows: [[0, 0, 0, 0]], palette: [[1, 1, 1]], colourCount: 200 });
    expectImageError(() => decode(bytes), 'truncated', /palette/);
  });

  it('zero or negative width, zero height, a plane count other than 1 and pixel data inside the header are malformed', () => {
    const rows = [[0, 0, 0, 0]];
    expectImageError(() => decode(buildBmp({ width: 0, height: 1, bitsPerPixel: 24, rows })), 'malformed');
    expectImageError(() => decode(buildBmp({ width: -4, height: 1, bitsPerPixel: 24, rows })), 'malformed');
    expectImageError(() => decode(buildBmp({ width: 1, height: 0, bitsPerPixel: 24, rows })), 'malformed');
    expectImageError(() => decode(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows, planes: 2 })), 'malformed', /plane/);
    expectImageError(() => decode(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows, pixelsAt: 20 })), 'malformed', /inside the header/);
    expectImageError(() => decode(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows, compression: 3, masks: [1, 2, 4] })), 'malformed', /bit fields/);
  });

  it('RLE, JPEG and PNG compression, odd bit depths, odd header sizes and ragged bit masks are unsupported, by name', () => {
    const rows = [[0, 0, 0, 0]];
    expectImageError(() => decode(buildBmp({ width: 1, height: 1, bitsPerPixel: 8, rows, compression: 1, palette: [[0, 0, 0]] })), 'unsupported', /RLE8/);
    expectImageError(() => decode(buildBmp({ width: 1, height: 1, bitsPerPixel: 4, rows, compression: 2, palette: [[0, 0, 0]] })), 'unsupported', /RLE4/);
    expectImageError(() => decode(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows, compression: 4 })), 'unsupported', /JPEG/);
    expectImageError(() => decode(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows, compression: 5 })), 'unsupported', /PNG/);
    expectImageError(() => decode(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows, compression: 99 })), 'unsupported', /compression 99/);
    for (const bitsPerPixel of [0, 2, 3, 7, 15, 48, 64]) expectImageError(() => decode(buildBmp({ width: 1, height: 1, bitsPerPixel, rows })), 'unsupported', new RegExp(`${bitsPerPixel} bits per pixel`));
    expectImageError(() => decode(buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows, headerSize: 64 })), 'unsupported', /header of 64/);
    expectImageError(() => decode(buildBmp({ width: 1, height: 1, bitsPerPixel: 16, rows, compression: 3, masks: [0b101, 0b1000, 0b110000] })), 'unsupported', /mask/);
  });

  it('a header claiming a huge picture over a few bytes is refused as over the limit, and allocates nothing', () => {
    const before = process.memoryUsage().arrayBuffers;
    const claim = (width: number, height: number, bitsPerPixel = 24): Uint8Array => buildBmp({ width, height, bitsPerPixel, rows: [[0, 0, 0, 0]] });
    expectImageError(() => decode(claim(0x7fffffff, 0x7fffffff)), 'limit', /side ceiling/);
    expectImageError(() => decode(claim(30_000, 30_000)), 'limit', /pixel ceiling/);
    expectImageError(() => decode(claim(8192, 8192, 1)), 'limit', /pixel ceiling/);
    expectImageError(() => decode(claim(1, -0x80000000)), 'limit');
    // At the ceiling exactly (4096 x 4096 = 16,777,216 pixels) the picture is allowed, and then found truncated: still no 64 MiB output.
    expectImageError(() => decode(claim(4096, 4096)), 'truncated', /pixel data/);
    expect(process.memoryUsage().arrayBuffers - before).toBeLessThan(8 * 1024 * 1024);
  });

  it('allows a picture of exactly the pixel ceiling (it decodes to exactly the per-image byte ceiling) and refuses one pixel more', () => {
    const palette = [[0, 0, 0], [255, 255, 255]] as const;
    const rowsOf = (width: number): number[][] => Array.from({ length: 4096 }, () => new Array<number>(Math.ceil(width / 32) * 4).fill(0xaa));
    const atCeiling = decode(buildBmp({ width: 4096, height: 4096, bitsPerPixel: 1, rows: rowsOf(4096), palette: [...palette] })) as { bytes: Uint8Array };
    expect(atCeiling.bytes).toHaveLength(MAX_IMAGE_BYTES);
    expectImageError(() => decode(buildBmp({ width: 4097, height: 4096, bitsPerPixel: 1, rows: rowsOf(4097), palette: [...palette] })), 'limit', /pixel ceiling/);
  });

  it('a 1-bit picture that would expand 32 times is held to the pixel ceiling and to the form budget (the decompression-bomb case)', () => {
    const rows = Array.from({ length: 100 }, () => new Array<number>(16).fill(0xff));
    const bytes = buildBmp({ width: 100, height: 100, bitsPerPixel: 1, rows, palette: [[0, 0, 0], [255, 255, 255]] });
    expect(bytes.length).toBeLessThan(2000);
    expectImageError(() => decode(bytes, { maxPixels: 9_999 }), 'limit', /pixel ceiling/);
    expectImageError(() => decodeImage(bytes, limitsOf(), 39_999), 'limit', /pixel ceiling/);
    expect(decodeImage(bytes, limitsOf(), 40_000).bytes).toHaveLength(40_000);
  });
});
