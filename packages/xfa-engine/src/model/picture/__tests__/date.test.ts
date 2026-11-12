import { describe, expect, it } from 'vitest';
import { categoryOf, compilePicture, formatted, parsed } from './helpers.js';

const ISO = 'date{YYYY-MM-DD}';
const COMPACT = 'date{YYYYMMDD}';
const SLASH = 'date{YYYY/MM/DD}';
const DMY = 'date{DD/MM/YYYY}';
const MDY = 'date{MM.DD.YYYY}';
const SPACED = 'date{DD MM YYYY}';
const WIDE = 'date{YYYY - MM - DD}';

type Row = readonly [source: string, input: string, canonical: string];

const PARSE_OK: readonly Row[] = [
  [ISO, '2023-02-28', '2023-02-28'],
  [ISO, '2024-02-29', '2024-02-29'],
  [ISO, '2000-02-29', '2000-02-29'],
  [ISO, '0001-01-01', '0001-01-01'],
  [ISO, '9999-12-31', '9999-12-31'],
  [ISO, '2023-04-30', '2023-04-30'],
  [ISO, '2023-12-31', '2023-12-31'],
  [COMPACT, '20230228', '2023-02-28'],
  [SLASH, '2023/02/28', '2023-02-28'],
  [DMY, '28/02/2023', '2023-02-28'],
  [MDY, '02.28.2023', '2023-02-28'],
  [SPACED, '28 02 2023', '2023-02-28'],
  [WIDE, '2023 - 02 - 28', '2023-02-28'],
];

const PARSE_BAD: readonly (readonly [title: string, source: string, input: string])[] = [
  ['a day of 30 in February (calendar check skipped)', ISO, '2023-02-30'],
  ['month 13 (range check skipped)', ISO, '2023-13-01'],
  ['month 00', ISO, '2023-00-10'],
  ['day 00', ISO, '2023-01-00'],
  ['Feb 29 in a non-leap year (leap rule treated as always on)', ISO, '2023-02-29'],
  ['Feb 29 in a century year that is not a leap year (400 rule missed)', ISO, '1900-02-29'],
  ['day 31 in a 30-day month', ISO, '2023-04-31'],
  ['day 32', ISO, '2023-01-32'],
  ['year 0000 (the canonical range starts at 0001)', ISO, '0000-01-01'],
  ['a slash where the pattern says hyphen (literals not compared)', ISO, '2023/02/28'],
  ['unpadded month (fixed width not enforced)', ISO, '2023-2-28'],
  ['unpadded day', ISO, '2023-02-8'],
  ['two-digit year', ISO, '23-02-28'],
  ['too many day digits', ISO, '2023-02-288'],
  ['compact input against a separated pattern', ISO, '20230228'],
  ['trailing space (input silently trimmed)', ISO, '2023-02-28 '],
  ['leading space (input silently trimmed)', ISO, ' 2023-02-28'],
  ['truncated input', ISO, '2023-02-'],
  ['letters in digit slots', ISO, 'abcd-ef-gh'],
  ['a hex-like digit', ISO, '2023-0e-28'],
  ['full-width digits (non-ASCII digits accepted by a Unicode digit test)', ISO, '２０２３-02-28'],
  ['a signed year', ISO, '+023-02-28'],
  ['empty parts', ISO, '--'],
  ['a separated input against the compact pattern', COMPACT, '2023-02-28'],
  ['a too-short compact input', COMPACT, '2023022'],
  ['a too-long compact input', COMPACT, '202302288'],
  ['compact input with an invalid month', COMPACT, '20231301'],
  ['day-first input read as year-first', DMY, '2023/02/28'],
  ['an invalid date in day-first order', DMY, '31/04/2023'],
  ['a different separator than the spaced pattern', SPACED, '28-02-2023'],
  ['a missing space around literal separators', WIDE, '2023-02-28'],
];

const FORMAT_OK: readonly Row[] = [
  [ISO, '2023-02-28', '2023-02-28'],
  [ISO, '2024-02-29', '2024-02-29'],
  [COMPACT, '2023-02-28', '20230228'],
  [SLASH, '2023-02-28', '2023/02/28'],
  [DMY, '2024-02-29', '29/02/2024'],
  [MDY, '2023-02-28', '02.28.2023'],
  [SPACED, '2023-02-28', '28 02 2023'],
  [WIDE, '0001-09-05', '0001 - 09 - 05'],
];

const FORMAT_BAD: readonly (readonly [title: string, source: string, canonical: string])[] = [
  ['an impossible day', ISO, '2023-02-30'],
  ['Feb 29 in a non-leap year', ISO, '2023-02-29'],
  ['month 13', ISO, '2023-13-01'],
  ['year 0000', ISO, '0000-01-01'],
  ['a compact canonical (canonical is always separated)', ISO, '20230228'],
  ['an unpadded canonical', ISO, '2023-2-28'],
  ['trailing garbage after a valid date', ISO, '2023-02-28x'],
  ['a signed year', ISO, '-123-01-01'],
  ['plain text', ISO, 'hello'],
  ['a value from another category (number)', ISO, '12.5'],
  ['a long digit run', COMPACT, '1'.repeat(5000)],
];

describe('date{} parse', () => {
  it.each(PARSE_OK)('%s parses %j to canonical %j', (source, input, canonical) => {
    expect(parsed(source, input)).toBe(canonical);
  });

  it.each(PARSE_BAD)('rejects %s', (_title, source, input) => {
    expect(parsed(source, input)).toBe('FAIL');
  });

  it('reports the date category on success', () => {
    expect(categoryOf(compilePicture(ISO), '2023-02-28')).toBe('date');
  });
});

describe('date{} format', () => {
  it.each(FORMAT_OK)('%s formats %j to %j', (source, canonical, text) => {
    expect(formatted(source, canonical)).toBe(text);
  });

  it.each(FORMAT_BAD)('refuses %s', (_title, source, canonical) => {
    expect(formatted(source, canonical)).toBe('FAIL');
  });
});
