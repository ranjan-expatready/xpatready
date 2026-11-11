import { safeText } from '../../pdf/safe-text.js';
import { unsupportedPicture } from './errors.js';
import { MAX_PICTURE_CLAUSES, MAX_PICTURE_SOURCE_CHARS } from './limits.js';

export interface RawClause {
  readonly category: string;
  readonly pattern: string;
}

/** Index of the first character of `text` at or after `from` that is one of `stops`, or `text.length`. Linear. */
function scanTo(text: string, from: number, stops: string): number {
  let i = from;
  while (i < text.length && !stops.includes(text.charAt(i))) i += 1;
  return i;
}

/**
 * Splits `category{pattern}|category{pattern}` into clauses with one linear scan: no regular expression, so no
 * input can make it backtrack. Braces cannot nest, `|` separates clauses only outside braces, and whitespace outside
 * braces is never skipped. Throws UNSUPPORTED_FEATURE for an empty or over-long source, more than
 * `MAX_PICTURE_CLAUSES` clauses, a missing, stray or nested brace, or an empty category.
 */
export function splitClauses(source: string): readonly RawClause[] {
  if (source === '') throw unsupportedPicture('source is empty');
  if (source.length > MAX_PICTURE_SOURCE_CHARS) {
    throw unsupportedPicture(`source is longer than ${MAX_PICTURE_SOURCE_CHARS} characters`);
  }
  const clauses: RawClause[] = [];
  let pos = 0;
  for (;;) {
    const open = scanTo(source, pos, '{}|');
    if (source.charAt(open) !== '{') throw unsupportedPicture(`clause without an opening brace: "${safeText(source.slice(pos))}"`);
    const category = source.slice(pos, open);
    if (category === '') throw unsupportedPicture('clause has an empty category');
    const close = scanTo(source, open + 1, '{}');
    if (source.charAt(close) !== '}') {
      throw unsupportedPicture(`clause "${safeText(category)}" has a missing closing brace or a nested opening brace`);
    }
    if (clauses.length === MAX_PICTURE_CLAUSES) throw unsupportedPicture(`has more than ${MAX_PICTURE_CLAUSES} clauses`);
    clauses.push({ category, pattern: source.slice(open + 1, close) });
    pos = close + 1;
    if (pos === source.length) return clauses;
    if (source.charAt(pos) !== '|') throw unsupportedPicture(`has text after a closing brace: "${safeText(source.slice(pos))}"`);
    pos += 1;
  }
}
