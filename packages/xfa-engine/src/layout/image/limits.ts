import { MAX_IMAGE_BYTES } from '../limits.js';

/**
 * Ceilings of the image layer. Image bytes come from an uploaded, untrusted template, so every one of these bounds work
 * or memory before it is spent. Each carries its own FD-38 argument, because a file-level claim does not cover the
 * declarations beneath it. The largest real image on the two government forms is 1147 x 279 pixels (320,013), 60,935
 * encoded bytes (a JPEG), and the five images of one form decode to about 1.4 MB; each ceiling leaves at least ten times
 * that headroom, and no firm or operator has a reason to vary any of them. The per-image decoded ceiling is
 * `MAX_IMAGE_BYTES` in `../limits.ts`, which is also what the render-tree schema accepts.
 */

/** FD-38 exemption (security invariant): most bytes of one encoded image (BMP, TIFF or JPEG file) the layer will look at; the largest real one is 60,935. */
export const MAX_ENCODED_IMAGE_BYTES = 16 * 1024 * 1024;

/** FD-38 exemption (security invariant): most base64 characters scanned for one image: the encoded ceiling at 4 characters per 3 bytes, doubled for line breaks and indentation. */
export const MAX_BASE64_CHARS = (MAX_ENCODED_IMAGE_BYTES / 3) * 4 * 2;

/** FD-38 exemption (security invariant): longest side of an image in pixels; the largest real side is 2,228 (the JPEG). */
export const MAX_IMAGE_SIDE_PX = 32_768;

/** FD-38 exemption (security invariant): most pixels (width x height) of one image; 16,777,216 decode to exactly `MAX_IMAGE_BYTES` of RGBA. The largest real image has 320,013. */
export const MAX_IMAGE_PIXELS = MAX_IMAGE_BYTES / 4;

/** FD-38 exemption (security invariant): most bytes of decoded or passed-through image data held for one form at a time (two largest images); the five real images total about 1.4 MB. */
export const MAX_TOTAL_IMAGE_BYTES = 2 * MAX_IMAGE_BYTES;

/** FD-38 exemption (security invariant): most base64 texts the image context remembers the content hash of, so an unchanged image is not re-hashed on every layout; real forms have 5, and the text characters held are separately bounded by `maxBase64Chars`. */
export const MAX_IMAGE_TEXT_MEMO = 512;

/** FD-38 exemption (security invariant): most TIFF strips one image may declare; one per row is the worst case, so this is `MAX_IMAGE_SIDE_PX`. Real images have 1. */
export const MAX_TIFF_STRIPS = MAX_IMAGE_SIDE_PX;

/** FD-38 exemption (security invariant): most values read from a TIFF bits-per-sample tag; a real image has 1 or 3. */
export const MAX_TIFF_SAMPLE_VALUES = 16;

/** FD-38 exemption (security invariant): most markers of a JPEG scanned for its frame header; real files reach the frame header after 3 to 20. */
export const MAX_JPEG_MARKERS = 4_096;

/**
 * FD-38 exemption (correctness constant): the resolution assumed for an image that states none (or a nonsense one): 96
 * pixels per inch. The evidence is the corpus: the 41 x 36 pixel bitmap with `aspect="actual"` states 3780 pixels per metre
 * (96.012 dpi) and sits in a 10.848 x 9.525 mm box, which is 41 x 36 pixels at 96 dpi to the millipoint (30.75 x 27 pt). No
 * corpus image states no resolution, so the default itself has no oracle; 96 is also the browser's CSS pixel.
 */
export const DEFAULT_IMAGE_DPI = 96;

/** FD-38 exemption (security invariant): the resolutions read from a file are accepted only inside this range, so a hostile value cannot make a natural size zero, infinite or absurd; a value outside it reads as `DEFAULT_IMAGE_DPI`. */
export const MIN_IMAGE_DPI = 1;
/** FD-38 exemption (security invariant): the upper end of the accepted resolution range above; a larger stated resolution would make a natural size vanish. */
export const MAX_IMAGE_DPI = 100_000;

/** The ceilings one decode is held to. The defaults are the constants above; a test (or a caller with a smaller budget) may lower them. */
export interface ImageLimits {
  readonly maxEncodedBytes: number;
  readonly maxBase64Chars: number;
  readonly maxSidePx: number;
  readonly maxPixels: number;
  readonly maxTotalBytes: number;
}

export const DEFAULT_IMAGE_LIMITS: ImageLimits = {
  maxEncodedBytes: MAX_ENCODED_IMAGE_BYTES,
  maxBase64Chars: MAX_BASE64_CHARS,
  maxSidePx: MAX_IMAGE_SIDE_PX,
  maxPixels: MAX_IMAGE_PIXELS,
  maxTotalBytes: MAX_TOTAL_IMAGE_BYTES,
};
