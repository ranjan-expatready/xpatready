import type { XfaLayoutErrorCode } from '../layout/errors.js';
import type { XfaFormErrorCode } from '../model/form/errors.js';
import type { XfaRuntimeErrorCode } from '../runtime/errors.js';
import type { XfaScriptErrorCode } from '../script/errors.js';

/** The codes of the PDF, XML and template layers (what `XfaPdfError` itself is raised with). */
export type XfaPdfErrorCode =
  | 'MALFORMED'
  | 'UNSUPPORTED_SECURITY'
  | 'WRONG_PASSWORD'
  | 'NOT_XFA'
  | 'PACKET_NOT_FOUND'
  | 'MALFORMED_XML'
  | 'UNSUPPORTED_FEATURE';

/**
 * Every code any error of the engine carries: one union, the string of each previous code unchanged. A code that two
 * layers share (`INVALID_OPTIONS`, `INVALID_ARGUMENT`) appears once.
 */
export type XfaErrorCode = XfaPdfErrorCode | XfaScriptErrorCode | XfaFormErrorCode | XfaRuntimeErrorCode | XfaLayoutErrorCode;

/**
 * The one error type of the engine. The script sandbox, the form DOM and the form runtime raise subclasses
 * (`XfaScriptError`, `XfaFormError`, `XfaRuntimeError`), so a caller needs a single `instanceof XfaPdfError` and reads
 * `code` from the merged `XfaErrorCode` union.
 */
export class XfaPdfError extends Error {
  readonly code: XfaErrorCode;

  constructor(code: XfaErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'XfaPdfError';
    this.code = code;
  }
}

/** MALFORMED error carrying the byte offset where parsing failed. */
export function malformed(message: string, at: number): XfaPdfError {
  return new XfaPdfError('MALFORMED', `${message} at byte ${at}`);
}
