import { XfaPdfError } from '../pdf/errors.js';
import { safeText } from '../pdf/safe-text.js';

/** A `MALFORMED_XML` error. Callers pass fixed text or text already made safe with `safeText` (never raw document text). */
export function malformedXml(message: string, options?: ErrorOptions): XfaPdfError {
  return new XfaPdfError('MALFORMED_XML', `Malformed XML: ${message}`, options);
}

/** An `UNSUPPORTED_FEATURE` error for XML constructs the engine refuses by design (DTDs and entities). */
export function unsupportedXml(message: string): XfaPdfError {
  return new XfaPdfError('UNSUPPORTED_FEATURE', `Unsupported XML feature: ${message}`);
}

export function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Known parser messages: the fixed description to show, and (group 1) the document-controlled part to echo safely. */
const KNOWN_PARSER_MESSAGES: readonly (readonly [RegExp, string])[] = [
  [/^Opening and ending tag mismatch:?\s*([^]*)$/, 'mismatched closing tag'],
  [/^unclosed xml tag\(s\):?\s*([^]*)$/, 'unclosed element'],
  [/^Extra content at the end of the document()$/, 'content after the root element'],
  [/^entity not found:?\s*([^]*)$/, 'undefined entity reference'],
  [/^Attribute ([^]*) redefined$/, 'duplicate attribute'],
  [/^Unescaped '<' not allowed in attributes values()$/, 'unescaped "<" in an attribute value'],
];

/**
 * Turns an XML parser message into bounded diagnostic text. The parser echoes names from the document (a tag or
 * attribute name can be megabytes), so a recognised message becomes fixed wording with only its variable part
 * passed through `safeText`; an unrecognised one is passed through `safeText` whole.
 */
export function describeParserMessage(message: string): string {
  for (const [pattern, description] of KNOWN_PARSER_MESSAGES) {
    const match = pattern.exec(message);
    if (match === null) continue;
    const detail = match[1] ?? '';
    return detail === '' ? description : `${description}: ${safeText(detail)}`;
  }
  return safeText(message);
}
