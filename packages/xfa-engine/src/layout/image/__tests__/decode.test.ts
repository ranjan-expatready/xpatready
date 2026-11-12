import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { costOf, decodeImage, sniffImage } from '../decode.js';
import { XfaImageError } from '../errors.js';
import { DEFAULT_IMAGE_LIMITS } from '../limits.js';
import { buildBmp, buildJpeg, buildTiff, concat, expectImageError, limitsOf, long, short } from './helpers.js';

describe('sniffImage and decodeImage: the format is read from the bytes, not from the declared type', () => {
  it('recognises BMP, little- and big-endian TIFF, BigTIFF and JPEG by signature', () => {
    expect(sniffImage(Uint8Array.of(0x42, 0x4d, 0))).toBe('bmp');
    expect(sniffImage(Uint8Array.of(0x49, 0x49, 0x2a, 0))).toBe('tiff');
    expect(sniffImage(Uint8Array.of(0x4d, 0x4d, 0, 0x2a))).toBe('tiff');
    expect(sniffImage(Uint8Array.of(0x49, 0x49, 0x2b, 0))).toBe('tiff');
    expect(sniffImage(Uint8Array.of(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
    expect(sniffImage(Uint8Array.of(0x42))).toBeUndefined();
    expect(sniffImage(new Uint8Array(0))).toBeUndefined();
  });

  it('names PNG and GIF when it refuses them, and calls any other bytes an unsupported format', () => {
    expectImageError(() => decodeImage(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), DEFAULT_IMAGE_LIMITS), 'unsupported', /PNG/);
    expectImageError(() => decodeImage(Uint8Array.of(0x47, 0x49, 0x46, 0x38, 0x39, 0x61), DEFAULT_IMAGE_LIMITS), 'unsupported', /GIF/);
    expectImageError(() => decodeImage(Uint8Array.of(1, 2, 3, 4, 5), DEFAULT_IMAGE_LIMITS), 'unsupported', /image format/);
    expectImageError(() => decodeImage(new Uint8Array(0), DEFAULT_IMAGE_LIMITS), 'malformed', /no data/);
  });

  it('refuses a file over the encoded ceiling before looking inside it', () => {
    expectImageError(() => decodeImage(new Uint8Array(101), limitsOf({ maxEncodedBytes: 100 })), 'limit', /bytes encoded/);
  });

  it('holds a JPEG to the bytes left in the form budget twice: the file before it is copied, its decoded size (width x height x 4) after its header is read', () => {
    const jpeg = buildJpeg({ width: 8, height: 8 });
    expectImageError(() => decodeImage(jpeg, limitsOf(), jpeg.length - 1), 'limit', /left for this form/);
    const big = buildJpeg({ width: 100, height: 100 });
    // Refused from its header, before the file is copied: 10000 px x 4 bytes is over the 39999 bytes left.
    expectImageError(() => decodeImage(big, limitsOf(), 39_999), 'limit', /10000 pixels, over the 9999/);
    expect(decodeImage(big, limitsOf(), 40_000).bytes).toHaveLength(big.length);
    expect(costOf(decodeImage(big, limitsOf()))).toBe(40_000);
    expect(costOf(decodeImage(buildJpeg({ width: 1, height: 1 }), limitsOf()))).toBe(buildJpeg({ width: 1, height: 1 }).length);
  });
});

/** A small deterministic generator (xorshift32), so a failure reproduces from the seed. */
function generator(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  };
}

describe('decodeImage: mutated files either decode or fail with a typed error (never an uncaught exception, never an oversized picture)', () => {
  const tiny = limitsOf({ maxPixels: 4096, maxSidePx: 512 });
  const seeds: Uint8Array[] = [
    buildBmp({ width: 5, height: 3, bitsPerPixel: 24, rows: Array.from({ length: 3 }, (_, i) => new Array<number>(16).fill(i * 40)) }),
    buildBmp({ width: 10, height: 2, bitsPerPixel: 1, palette: [[0, 0, 0], [255, 255, 255]], rows: [[0xaa, 0x80, 0, 0], [0x55, 0x40, 0, 0]] }),
    buildBmp({ width: 4, height: 2, bitsPerPixel: 16, compression: 3, masks: [0xf800, 0x07e0, 0x001f], rows: [new Array<number>(8).fill(7), new Array<number>(8).fill(9)] }),
    buildTiff({ tags: [long(256, 3), long(257, 2), short(258, 8), short(259, 1), short(262, 1), long(273), short(277, 1), long(278, 1), long(279)], strips: [[1, 2, 3], [4, 5, 6]] }),
    buildTiff({ littleEndian: false, tags: [long(256, 2), long(257, 1), short(258, 8, 8, 8), short(259, 1), short(262, 2), long(273), short(277, 3), long(278, 1), long(279)], strips: [[1, 2, 3, 4, 5, 6]] }),
    buildJpeg({ width: 30, height: 20, jfif: { units: 1, x: 72, y: 72 } }),
  ];

  it('survives 3,000 seeded mutations (flipped bytes, cut files, overwritten 32-bit fields) of six valid files', () => {
    const next = generator(0x5eed1234);
    let decoded = 0;
    let refused = 0;
    for (let round = 0; round < 500; round += 1) {
      for (const original of seeds) {
        const bytes = original.slice();
        const edits = 1 + (next() % 4);
        for (let e = 0; e < edits; e += 1) {
          const at = next() % bytes.length;
          if (next() % 3 === 0 && at + 4 <= bytes.length) new DataView(bytes.buffer).setUint32(at, next(), next() % 2 === 0);
          else bytes[at] = next() & 0xff;
        }
        const cut = next() % 5 === 0 ? bytes.subarray(0, next() % bytes.length) : bytes;
        try {
          const image = decodeImage(cut, tiny);
          expect(image.widthPx * image.heightPx).toBeLessThanOrEqual(4096);
          if (image.format === 'rgba') expect(image.bytes.length).toBe(image.widthPx * image.heightPx * 4);
          decoded += 1;
        } catch (error) {
          expect(error, 'only typed failures may escape a decoder').toBeInstanceOf(XfaImageError);
          refused += 1;
        }
      }
    }
    expect(decoded + refused).toBe(3000);
    expect(decoded).toBeGreaterThan(300);
    expect(refused).toBeGreaterThan(300);
  });
});

describe('the image layer runs in a browser worker', () => {
  it('no source file of the layer imports a node module or names Buffer, a canvas, the DOM or process', () => {
    const here = new URL('../', import.meta.url);
    const sources = readdirSync(here).filter((f) => f.endsWith('.ts'));
    expect(sources.length).toBeGreaterThanOrEqual(10);
    for (const file of sources) {
      const code = readFileSync(new URL(file, here), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code, file).not.toMatch(/from\s+['"]node:|require\(|\bBuffer\b|\b[Cc]anvas\b|OffscreenCanvas|\bdocument\b|\bprocess\b|\bwindow\b|\batob\b|\bImage\(/);
    }
  });

  it('decodes with Buffer and process hidden', () => {
    const bmp = buildBmp({ width: 1, height: 1, bitsPerPixel: 24, rows: [[1, 2, 3, 0]] });
    vi.stubGlobal('Buffer', undefined);
    vi.stubGlobal('process', undefined);
    try {
      expect([...decodeImage(concat(bmp), DEFAULT_IMAGE_LIMITS).bytes]).toEqual([3, 2, 1, 255]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
