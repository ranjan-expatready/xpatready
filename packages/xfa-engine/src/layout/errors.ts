import { XfaPdfError } from '../pdf/errors.js';

/**
 * Typed failures of the layout layer. A subclass of `XfaPdfError`, so a caller keeps one `instanceof` for every failure
 * of the engine and reads `code` from the merged `XfaErrorCode` union.
 */
export type XfaLayoutErrorCode =
  /** The template uses a layout feature (a unit, a layout mode, a value) the engine does not model. Never skipped silently. */
  | 'LAYOUT_UNSUPPORTED'
  /** A value handed to a layout function is malformed (not a number, over a length ceiling, an empty list). */
  | 'INVALID_ARGUMENT';

export class XfaLayoutError extends XfaPdfError {
  declare readonly code: XfaLayoutErrorCode;

  constructor(code: XfaLayoutErrorCode, message: string, options?: ErrorOptions) {
    super(code, message, options);
    this.name = 'XfaLayoutError';
  }
}
