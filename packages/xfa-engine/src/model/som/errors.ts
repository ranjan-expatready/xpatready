import { XfaPdfError } from '../../pdf/errors.js';
import { safeText } from '../../pdf/safe-text.js';
import { XfaFormError } from '../form/index.js';

/**
 * Typed failures of SOM resolution. `parseSom` reports grammar the engine does not implement as an `XfaPdfError`
 * `UNSUPPORTED_FEATURE` (the same code every other unsupported construct carries, and what the template gate relies on);
 * `resolveNode` / `resolveNodes`, which a script calls with text of its own choosing, turn that into an `XfaFormError`.
 * A wrongly typed argument, a budget and a node with no place in the model are `XfaFormError`s, which the event engine
 * can hand to a script as a catchable error.
 */
export const invalidArgument = (message: string, options?: ErrorOptions): XfaFormError => new XfaFormError('INVALID_ARGUMENT', message, options);
export const invalidOperation = (message: string): XfaFormError => new XfaFormError('INVALID_OPERATION', message);
export const limitExceeded = (message: string): XfaFormError => new XfaFormError('LIMIT', message);

/** `expression` is script text: it is echoed through `safeText` only. */
export function unsupportedSom(expression: string, detail: string): XfaPdfError {
  return new XfaPdfError('UNSUPPORTED_FEATURE', `Unsupported XFA feature: SOM expression "${safeText(expression)}": ${detail}`);
}
