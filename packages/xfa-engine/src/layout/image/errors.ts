import { ByteView } from '../font/bytes.js';
import { XfaLayoutError } from '../errors.js';

/**
 * Why an image was not decoded. `unsupported`: a format, compression or bit depth the engine does not decode. `malformed`:
 * the bytes contradict their own header. `truncated`: the data ends before the header says it should. `limit`: a size
 * ceiling (see `limits.ts`) was exceeded.
 */
export type ImageFailureReason = 'unsupported' | 'malformed' | 'truncated' | 'limit';

/**
 * The typed failure of one image. A subclass of `XfaLayoutError` (`LAYOUT_UNSUPPORTED` for `unsupported`,
 * `INVALID_ARGUMENT` for the rest), so a caller keeps one `instanceof XfaPdfError`; `reason` tells them apart. The
 * message names the problem with numbers and fixed words only, never the image's own text.
 */
export class XfaImageError extends XfaLayoutError {
  readonly reason: ImageFailureReason;

  constructor(reason: ImageFailureReason, message: string, options?: ErrorOptions) {
    super(reason === 'unsupported' ? 'LAYOUT_UNSUPPORTED' : 'INVALID_ARGUMENT', message, options);
    this.name = 'XfaImageError';
    this.reason = reason;
  }
}

export const unsupported = (message: string): XfaImageError => new XfaImageError('unsupported', message);
export const malformed = (message: string): XfaImageError => new XfaImageError('malformed', message);
export const truncated = (message: string): XfaImageError => new XfaImageError('truncated', message);
export const overLimit = (message: string): XfaImageError => new XfaImageError('limit', message);

/** A bounds-checked view of image bytes in one byte order: a read past the end is a `truncated` failure naming what was being read. */
export const imageView = (bytes: Uint8Array, littleEndian: boolean): ByteView =>
  new ByteView(bytes, { littleEndian, fail: (at, length, what) => truncated(`image ${what} ends before byte ${at + length} (read of ${length} at ${at})`) });
