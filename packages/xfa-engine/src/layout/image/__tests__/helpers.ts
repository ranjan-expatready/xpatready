import { expect } from 'vitest';
import { XfaImageError, type ImageFailureReason } from '../errors.js';
import { DEFAULT_IMAGE_LIMITS, type ImageLimits } from '../limits.js';
import { decodeImage } from '../decode.js';
import type { DecodedImage } from '../types.js';

export { buildBmp, buildJpeg, buildTiff, concat, long, rational, short, toBase64 } from './build-images.js';

/** The default ceilings, lowered so a test can reach one without allocating a real one. */
export const limitsOf = (over: Partial<ImageLimits> = {}): ImageLimits => ({ ...DEFAULT_IMAGE_LIMITS, ...over });

/** Asserts `fn` throws an `XfaImageError` of `reason` whose message matches `match`. */
export function expectImageError(fn: () => unknown, reason: ImageFailureReason, match?: RegExp): void {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  expect(thrown, 'must throw a typed XfaImageError').toBeInstanceOf(XfaImageError);
  expect((thrown as XfaImageError).reason).toBe(reason);
  expect((thrown as XfaImageError).code).toBe(reason === 'unsupported' ? 'LAYOUT_UNSUPPORTED' : 'INVALID_ARGUMENT');
  if (match !== undefined) expect((thrown as XfaImageError).message).toMatch(match);
}

/** Decodes under the default ceilings and asserts a raster, returning its pixels as `[r, g, b, a]` rows. */
export function rasterOf(bytes: Uint8Array, limits: ImageLimits = DEFAULT_IMAGE_LIMITS): { readonly image: DecodedImage; readonly rows: number[][][] } {
  const image = decodeImage(bytes, limits);
  expect(image.format).toBe('rgba');
  const rows: number[][][] = [];
  for (let y = 0; y < image.heightPx; y += 1) {
    const row: number[][] = [];
    for (let x = 0; x < image.widthPx; x += 1) {
      const at = (y * image.widthPx + x) * 4;
      row.push([...image.bytes.subarray(at, at + 4)]);
    }
    rows.push(row);
  }
  return { image, rows };
}

export const opaque = (r: number, g: number, b: number): number[] => [r, g, b, 255];
