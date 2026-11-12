/**
 * What the decoders answer. `dpiX` / `dpiY` are the stated resolution in pixels per inch, or `DEFAULT_IMAGE_DPI` when the
 * file states none (or states a value outside `MIN_IMAGE_DPI`..`MAX_IMAGE_DPI`); they give `aspect="actual"` its size.
 */
export interface DecodedRaster {
  readonly format: 'rgba';
  readonly widthPx: number;
  readonly heightPx: number;
  readonly dpiX: number;
  readonly dpiY: number;
  /** `widthPx x heightPx x 4` bytes, row-major from the top, straight (not premultiplied) alpha. */
  readonly bytes: Uint8Array;
}

/** A JPEG that is handed to the browser unchanged: only its frame header was read. */
export interface PassedThrough {
  readonly format: 'jpeg';
  readonly widthPx: number;
  readonly heightPx: number;
  readonly dpiX: number;
  readonly dpiY: number;
  /** An independent copy of the original file. */
  readonly bytes: Uint8Array;
}

export type DecodedImage = DecodedRaster | PassedThrough;

/** The cap a decoder works under: the pixel count it may allocate for (already lowered to what the form's remaining byte budget allows) and the longest side. */
export interface PixelBudget {
  readonly maxSidePx: number;
  readonly maxPixels: number;
}
