import { describe, expect, it } from 'vitest';
import { decodeImage } from '../decode.js';
import { buildJpeg, concat, expectImageError, limitsOf } from './helpers.js';

const decode = (bytes: Uint8Array, over = {}): ReturnType<typeof decodeImage> => decodeImage(bytes, limitsOf(over));

describe('JPEG pass-through: only the frame header is read', () => {
  it('passes the file through unchanged, as an independent copy, with the size from its frame header', () => {
    const input = buildJpeg({ width: 300, height: 200 });
    const image = decode(input);
    expect(image).toMatchObject({ format: 'jpeg', widthPx: 300, heightPx: 200, dpiX: 96, dpiY: 96 });
    expect([...image.bytes]).toEqual([...input]);
    image.bytes[0] = 0;
    expect(input[0]).toBe(0xff);
  });

  it('accepts baseline, extended and progressive frames, one or three components', () => {
    for (const frame of [0xc0, 0xc1, 0xc2]) for (const components of [1, 3]) expect(decode(buildJpeg({ width: 8, height: 8, frame, components }))).toMatchObject({ format: 'jpeg', widthPx: 8 });
  });

  it('reads the JFIF density in dots per inch or per centimetre, and 96 when it states none or only an aspect ratio', () => {
    expect(decode(buildJpeg({ width: 8, height: 8, jfif: { units: 1, x: 300, y: 200 } }))).toMatchObject({ dpiX: 300, dpiY: 200 });
    expect(decode(buildJpeg({ width: 8, height: 8, jfif: { units: 2, x: 118, y: 118 } })).dpiX).toBeCloseTo(299.72, 2);
    expect(decode(buildJpeg({ width: 8, height: 8, jfif: { units: 0, x: 1, y: 1 } }))).toMatchObject({ dpiX: 96 });
    expect(decode(buildJpeg({ width: 8, height: 8, jfif: { units: 1, x: 0, y: 0 } }))).toMatchObject({ dpiX: 96 });
  });

  it('reads the JFIF density only from the first segment: an APP1 before the APP0 leaves the default', () => {
    const app1 = [0xff, 0xe1, 0x00, 0x06, 1, 2, 3, 4];
    const withJfif = buildJpeg({ width: 5, height: 6, jfif: { units: 1, x: 300, y: 300 } }).subarray(2);
    expect(decode(concat([0xff, 0xd8], withJfif))).toMatchObject({ dpiX: 300 });
    expect(decode(concat([0xff, 0xd8], app1, withJfif))).toMatchObject({ dpiX: 96, dpiY: 96, widthPx: 5 });
  });

  it('finds the frame header past other segments and fill bytes', () => {
    const app = [0xff, 0xe1, 0x00, 0x06, 1, 2, 3, 4];
    const frame = buildJpeg({ width: 5, height: 6 }).subarray(2);
    expect(decode(concat([0xff, 0xd8], app, [0xff, 0xff], app, frame))).toMatchObject({ widthPx: 5, heightPx: 6 });
  });

  it('refuses what a browser would not draw, by name: 12-bit, arithmetic, lossless, hierarchical, four components, a height set after the scan', () => {
    expectImageError(() => decode(buildJpeg({ width: 8, height: 8, precision: 12 })), 'unsupported', /12 bits/);
    expectImageError(() => decode(buildJpeg({ width: 8, height: 8, frame: 0xc9 })), 'unsupported', /0xc9/);
    expectImageError(() => decode(buildJpeg({ width: 8, height: 8, frame: 0xc3 })), 'unsupported', /0xc3/);
    expectImageError(() => decode(buildJpeg({ width: 8, height: 8, frame: 0xc5 })), 'unsupported', /0xc5/);
    expectImageError(() => decode(buildJpeg({ width: 8, height: 8, components: 4 })), 'unsupported', /4 components/);
    expectImageError(() => decode(buildJpeg({ width: 8, height: 0 })), 'unsupported', /zero dimension/);
    expectImageError(() => decode(buildJpeg({ width: 0, height: 8 })), 'unsupported', /zero dimension/);
  });

  it('a file with no frame header, or cut inside its headers, is malformed or truncated', () => {
    expectImageError(() => decode(concat([0xff, 0xd8, 0xff, 0xda, 0, 2, 0xff, 0xd9])), 'malformed', /no frame header/);
    expectImageError(() => decode(concat([0xff, 0xd8, 0xff, 0xd9])), 'malformed', /no frame header/);
    expectImageError(() => decode(concat([0xff, 0xd8, 0xff, 0x41])), 'truncated');
    expectImageError(() => decode(concat([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01, 0, 0])), 'malformed', /length field/);
    expectImageError(() => decode(buildJpeg({ width: 8, height: 8 }).subarray(0, 9)), 'truncated', /segment/);
    expectImageError(() => decode(concat([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x04, 8, 0])), 'malformed', /frame header is too short/);
  });

  it('a hostile run of segments is stopped by the marker ceiling, not by the end of a large file', () => {
    const segments = Array.from({ length: 5000 }, () => [0xff, 0xe1, 0x00, 0x02]).flat();
    expectImageError(() => decode(concat([0xff, 0xd8], segments)), 'limit', /first 4096 markers/);
  });

  it('a header claiming a huge picture is over the limit before the file is copied', () => {
    expectImageError(() => decode(buildJpeg({ width: 65_535, height: 65_535 })), 'limit', /ceiling/);
    expectImageError(() => decode(buildJpeg({ width: 20_000, height: 20_000 })), 'limit', /pixel ceiling/);
    expectImageError(() => decode(buildJpeg({ width: 40_000, height: 1 })), 'limit', /side ceiling/);
    expectImageError(() => decode(buildJpeg({ width: 100, height: 100 }), { maxPixels: 9_999 }), 'limit', /pixel ceiling/);
    expect(decode(buildJpeg({ width: 4096, height: 4096 }))).toMatchObject({ widthPx: 4096 });
  });
});
