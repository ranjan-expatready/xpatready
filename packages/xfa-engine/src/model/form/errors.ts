import { XfaPdfError } from '../../pdf/errors.js';

/**
 * Typed failures of the form DOM at run time (a script or caller used the API wrongly or over a budget).
 *
 * Load-time failures (an unsupported template, a datasets packet that is not a datasets packet, a ceiling exceeded
 * while merging) are plain `XfaPdfError`s; these are the errors a SCRIPT can cause, which the event engine turns into
 * a catchable script error rather than a failed run. A subclass of `XfaPdfError`, so one `instanceof` covers both:
 * code that wraps a plain `XfaPdfError` must check for `XfaFormError` first, or it would downgrade a `LIMIT`.
 */
export type XfaFormErrorCode =
  /** A value of the wrong type or outside an XFA enumeration was assigned or passed (`presence = "Hidden"`). */
  | 'INVALID_ARGUMENT'
  /** The operation is not allowed on this node (a write to the read-only template view, appending a node to its own child). */
  | 'INVALID_OPERATION'
  /** A budget was exceeded (value length, items per list, nodes in the form). */
  | 'LIMIT';

export class XfaFormError extends XfaPdfError {
  declare readonly code: XfaFormErrorCode;

  constructor(code: XfaFormErrorCode, message: string, options?: ErrorOptions) {
    super(code, message, options);
    this.name = 'XfaFormError';
  }
}

export const invalidArgument = (message: string, options?: ErrorOptions): XfaFormError => new XfaFormError('INVALID_ARGUMENT', message, options);
export const invalidOperation = (message: string, options?: ErrorOptions): XfaFormError => new XfaFormError('INVALID_OPERATION', message, options);
export const limitExceeded = (message: string, options?: ErrorOptions): XfaFormError => new XfaFormError('LIMIT', message, options);
