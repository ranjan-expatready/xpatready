import { decodeBmp } from './bmp.js';
import { malformed, overLimit, unsupported } from './errors.js';
import { inspectJpeg } from './jpeg.js';
import type { ImageLimits } from './limits.js';
import { decodeTiff } from './tiff.js';
import type { PixelBudget, DecodedImage } from './types.js';

export type ImageKind = 'bmp' | 'tiff' | 'jpeg';

/** Names of formats recognised only to be refused with a reason that says what they are. */
const REFUSED_SIGNATURES: readonly { readonly name: string; readonly magic: readonly number[] }[] = [
  { name: 'PNG', magic: [0x89, 0x50, 0x4e, 0x47] },
  { name: 'GIF', magic: [0x47, 0x49, 0x46, 0x38] },
];

const startsWith = (bytes: Uint8Array, magic: readonly number[]): boolean => magic.every((byte, i) => bytes[i] === byte);

/**
 * What the bytes are, from their own signature and not from the declared content type, which comes from the same untrusted
 * template. `undefined` for anything the engine does not decode.
 */
export function sniffImage(bytes: Uint8Array): ImageKind | undefined {
  if (startsWith(bytes, [0x42, 0x4d])) return 'bmp';
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a]) || startsWith(bytes, [0x49, 0x49, 0x2b, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2b])) return 'tiff';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  return undefined;
}

/** The decode ceiling for one image: the pixel count the form's remaining byte budget allows, at most the per-image pixel ceiling. */
export function budgetFor(limits: ImageLimits, remainingBytes: number): PixelBudget {
  return { maxSidePx: limits.maxSidePx, maxPixels: Math.max(0, Math.min(limits.maxPixels, Math.floor(remainingBytes / 4))) };
}

/**
 * What an image costs the form's decoded-byte budget: the bytes of a raster, and for a passed-through JPEG what the
 * browser will expand it to (`width x height x 4`, never less than the file itself).
 */
export const costOf = (image: DecodedImage): number => (image.format === 'rgba' ? image.bytes.length : Math.max(image.bytes.length, image.widthPx * image.heightPx * 4));

/**
 * Decodes the bytes of one encoded image: a BMP or TIFF to RGBA, a JPEG passed through. Throws `XfaImageError` (typed, with
 * a `reason`); never returns a partial picture. `remainingBytes` is what is left of the form's decoded-byte ceiling; a picture
 * that would not fit (a JPEG counts at its decoded size) is refused as `limit` before anything is allocated for it.
 */
export function decodeImage(bytes: Uint8Array, limits: ImageLimits, remainingBytes: number = limits.maxTotalBytes): DecodedImage {
  if (bytes.length === 0) throw malformed('image has no data');
  if (bytes.length > limits.maxEncodedBytes) throw overLimit(`image is ${bytes.length} bytes encoded, over the ${limits.maxEncodedBytes} byte ceiling`);
  const kind = sniffImage(bytes);
  if (kind === undefined) {
    const refused = REFUSED_SIGNATURES.find((signature) => startsWith(bytes, signature.magic));
    throw unsupported(refused === undefined ? 'image format' : `${refused.name} image`);
  }
  if (kind === 'jpeg' && bytes.length > remainingBytes) throw overLimit(`image holds ${bytes.length} bytes, over the ${remainingBytes} bytes left for this form`);
  // A JPEG is charged at the size the browser expands it to (costOf), so its pixel count is held to the same budget.
  const budget = budgetFor(limits, remainingBytes);
  const image = kind === 'bmp' ? decodeBmp(bytes, budget) : kind === 'tiff' ? decodeTiff(bytes, budget) : inspectJpeg(bytes, budget);
  if (costOf(image) > remainingBytes) throw overLimit(`image holds ${costOf(image)} bytes decoded, over the ${remainingBytes} bytes left for this form`);
  return image;
}
