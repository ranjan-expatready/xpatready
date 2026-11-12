// XML 1.0 `Char` excludes C0 controls other than tab/LF/CR, U+FFFE/U+FFFF, and unpaired surrogates (a lone surrogate
// is also silently rewritten to U+FFFD when the text is re-encoded as UTF-8, which would corrupt a saved packet).
const ILLEGAL_XML_PATTERN = '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\uFFFE\\uFFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]';
const ILLEGAL_XML_CHAR = new RegExp(ILLEGAL_XML_PATTERN);
const ILLEGAL_XML_CHARS = new RegExp(ILLEGAL_XML_PATTERN, 'g');

/** Index of the first character XML 1.0 forbids, or -1. One linear pass; the pattern has no nested quantifiers. */
export function firstIllegalXmlChar(text: string): number {
  return text.search(ILLEGAL_XML_CHAR);
}

/**
 * The text with every character XML 1.0 forbids taken out, so it can always be saved: a vertical tab or form feed (a line
 * break in other software) becomes a line feed, any other forbidden character (a control character, U+FFFE/U+FFFF, a lone
 * surrogate) is dropped. Text that is already clean is returned as the same string.
 */
export function cleanXmlText(text: string): string {
  if (firstIllegalXmlChar(text) === -1) return text;
  return text.replace(ILLEGAL_XML_CHARS, (c) => (c === '\u000B' || c === '\u000C' ? '\n' : ''));
}
