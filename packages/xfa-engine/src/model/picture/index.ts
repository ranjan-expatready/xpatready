import { safeText } from '../../pdf/safe-text.js';
import { compileDate } from './date.js';
import { unsupportedPicture } from './errors.js';
import { MAX_PICTURE_PATTERN_CHARS } from './limits.js';
import { compileNum } from './num.js';
import { splitClauses, type RawClause } from './split.js';
import { compileText } from './text.js';
import type { Picture, PictureClause } from './types.js';

export type { Picture, PictureCategory, PictureFormat, PictureParse } from './types.js';

/** `null{}`: matches nothing but the empty string, which the picture handles before trying clauses. */
const NULL_CLAUSE: PictureClause = {
  category: 'null',
  parse: () => undefined,
  format: () => undefined,
};

function compileClause({ category, pattern }: RawClause): PictureClause {
  if (pattern.length > MAX_PICTURE_PATTERN_CHARS) {
    throw unsupportedPicture(`pattern is longer than ${MAX_PICTURE_PATTERN_CHARS} characters`);
  }
  switch (category) {
    case 'date':
      return compileDate(pattern);
    case 'num':
      return compileNum(pattern);
    case 'text':
      return compileText(pattern);
    case 'null':
      if (pattern !== '') throw unsupportedPicture(`null clause must be empty, got "${safeText(pattern)}"`);
      return NULL_CLAUSE;
    default:
      throw unsupportedPicture(`category "${safeText(category)}" is not supported (only date, num, text and null, without locale)`);
  }
}

/**
 * Compiles an XFA picture source (`category{pattern}` clauses joined by `|`) into a parser/formatter between
 * canonical values and display text. Supports only the `null`, `date` (`YYYY`/`MM`/`DD`), `num` (`9 z $ , .`) and
 * `text` (`9` plus a few literals) clauses; anything else, including locale-qualified categories, throws
 * UNSUPPORTED_FEATURE here rather than rendering a value wrongly later (fail closed).
 *
 * Empty input parses to canonical null and null/empty canonical formats to empty text for every picture, with or
 * without a `null{}` clause: an empty field is not an error. Input is never trimmed.
 */
export function compilePicture(source: string): Picture {
  const clauses = splitClauses(source).map(compileClause);
  const [first] = clauses;
  if (first === undefined) throw unsupportedPicture('has no clause');
  return {
    source,
    parse(input) {
      if (input === '') return { ok: true, canonical: null, category: first.category };
      for (const clause of clauses) {
        const canonical = clause.parse(input);
        if (canonical !== undefined) return { ok: true, canonical, category: clause.category };
      }
      return { ok: false };
    },
    format(canonical) {
      if (canonical === null || canonical === '') return { ok: true, text: '' };
      for (const clause of clauses) {
        const text = clause.format(canonical);
        if (text !== undefined) return { ok: true, text };
      }
      return { ok: false };
    },
  };
}
