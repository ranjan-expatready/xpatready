import { XfaPdfError } from '../../pdf/errors.js';

/**
 * UNSUPPORTED_FEATURE for a picture the engine does not implement (fail closed). `detail` is a fixed phrase;
 * anything taken from the picture source must reach it through `safeText`, because picture text comes from the file.
 */
export function unsupportedPicture(detail: string): XfaPdfError {
  return new XfaPdfError('UNSUPPORTED_FEATURE', `Unsupported XFA feature: picture ${detail}`);
}
