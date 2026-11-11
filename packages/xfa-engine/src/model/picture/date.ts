import { safeText } from '../../pdf/safe-text.js';
import { unsupportedPicture } from './errors.js';
import { MAX_YEAR, MIN_YEAR } from './limits.js';
import type { PictureClause } from './types.js';

const YEAR_TOKEN = 'YYYY';
const MONTH_TOKEN = 'MM';
const DAY_TOKEN = 'DD';
const YEAR_WIDTH = 4;
const PART_WIDTH = 2;
/** Length of a canonical `YYYY-MM-DD` value. */
const CANONICAL_LENGTH = 10;
const CANONICAL_SEPARATOR = '-';
const DATE_LITERALS = '-/. ';
const DAYS_PER_MONTH: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const FEBRUARY = 2;
const FEBRUARY_LEAP_DAYS = 29;

type DateKind = 'year' | 'month' | 'day';
type DateItem = { readonly kind: DateKind } | { readonly kind: 'literal'; readonly char: string };

interface DateFields {
  readonly year: string;
  readonly month: string;
  readonly day: string;
}

const isDigit = (code: number): boolean => code >= 48 && code <= 57;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > DAYS_PER_MONTH.length || day < 1) return false;
  const days = month === FEBRUARY && isLeapYear(year) ? FEBRUARY_LEAP_DAYS : (DAYS_PER_MONTH[month - 1] ?? 0);
  return day <= days;
}

/** `width` ASCII digits of `text` starting at `at`, or undefined (non-ASCII digits and signs are not digits here). */
function digitsAt(text: string, at: number, width: number): string | undefined {
  if (at + width > text.length) return undefined;
  for (let i = at; i < at + width; i += 1) {
    if (!isDigit(text.charCodeAt(i))) return undefined;
  }
  return text.slice(at, at + width);
}

/** The fields of a canonical `YYYY-MM-DD` string if it is exactly that shape and a real calendar date, else undefined. */
function canonicalFields(value: string): DateFields | undefined {
  if (value.length !== CANONICAL_LENGTH) return undefined;
  if (value.charAt(YEAR_WIDTH) !== CANONICAL_SEPARATOR || value.charAt(YEAR_WIDTH + 1 + PART_WIDTH) !== CANONICAL_SEPARATOR) return undefined;
  const year = digitsAt(value, 0, YEAR_WIDTH);
  const month = digitsAt(value, YEAR_WIDTH + 1, PART_WIDTH);
  const day = digitsAt(value, YEAR_WIDTH + 1 + PART_WIDTH + 1, PART_WIDTH);
  if (year === undefined || month === undefined || day === undefined) return undefined;
  return isValidDate(Number(year), Number(month), Number(day)) ? { year, month, day } : undefined;
}

const WIDTHS: Readonly<Record<DateKind, number>> = { year: YEAR_WIDTH, month: PART_WIDTH, day: PART_WIDTH };

/**
 * Reads a `date{..}` pattern: `YYYY`, `MM` and `DD` once each, in any order, separated by literals from `-`, `/`,
 * `.` and space, with a token at both ends. Anything else is UNSUPPORTED_FEATURE.
 */
function compileItems(pattern: string): readonly DateItem[] {
  const items: DateItem[] = [];
  const seen = new Set<DateKind>();
  let pos = 0;
  while (pos < pattern.length) {
    const token = [
      [YEAR_TOKEN, 'year'],
      [MONTH_TOKEN, 'month'],
      [DAY_TOKEN, 'day'],
    ] as const;
    const hit = token.find(([text]) => pattern.startsWith(text, pos));
    if (hit !== undefined) {
      const kind = hit[1];
      if (seen.has(kind)) throw unsupportedPicture(`date pattern repeats ${hit[0]}: "${safeText(pattern)}"`);
      seen.add(kind);
      items.push({ kind });
      pos += hit[0].length;
      continue;
    }
    const char = pattern.charAt(pos);
    if (!DATE_LITERALS.includes(char) || items.length === 0) {
      throw unsupportedPicture(`date pattern has an unsupported symbol or leading literal: "${safeText(pattern)}"`);
    }
    items.push({ kind: 'literal', char });
    pos += 1;
  }
  const last = items[items.length - 1];
  if (seen.size !== 3 || last === undefined || last.kind === 'literal') {
    throw unsupportedPicture(`date pattern needs YYYY, MM and DD once each with no trailing literal: "${safeText(pattern)}"`);
  }
  return items;
}

/** Compiles a `date{pattern}` clause; its canonical form is `YYYY-MM-DD`. */
export function compileDate(pattern: string): PictureClause {
  const items = compileItems(pattern);
  return {
    category: 'date',
    parse(input) {
      const fields: Partial<Record<DateKind, string>> = {};
      let pos = 0;
      for (const item of items) {
        if (item.kind === 'literal') {
          if (input.charAt(pos) !== item.char) return undefined;
          pos += 1;
          continue;
        }
        const digits = digitsAt(input, pos, WIDTHS[item.kind]);
        if (digits === undefined) return undefined;
        fields[item.kind] = digits;
        pos += digits.length;
      }
      const { year, month, day } = fields;
      if (pos !== input.length || year === undefined || month === undefined || day === undefined) return undefined;
      if (!isValidDate(Number(year), Number(month), Number(day))) return undefined;
      return `${year}-${month}-${day}`;
    },
    format(canonical) {
      const fields = canonicalFields(canonical);
      if (fields === undefined) return undefined;
      return items.map((item) => (item.kind === 'literal' ? item.char : fields[item.kind])).join('');
    },
  };
}
