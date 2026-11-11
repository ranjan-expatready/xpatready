import { invalidArgument, limitExceeded, unsupportedSom } from './errors.js';
import { scanSom, type SomPath } from './grammar.js';

export { isSomName, type SomPath, type SomSegment } from './grammar.js';

/**
 * Parses a SOM expression (grammar and refusals: see `scanSom`). Grammar outside the supported set is refused with
 * `UNSUPPORTED_FEATURE` (an `XfaPdfError`, which is what the template gate relies on); a non-string or empty one is
 * `INVALID_ARGUMENT` and one over a ceiling is `LIMIT` (both `XfaFormError`).
 */
export function parseSom(expression: string): SomPath {
  const scanned = scanSom(expression);
  if (scanned.ok) return scanned.path;
  if (scanned.kind === 'invalid') throw invalidArgument(scanned.detail);
  if (scanned.kind === 'limit') throw limitExceeded(scanned.detail);
  throw unsupportedSom(expression, scanned.detail);
}
