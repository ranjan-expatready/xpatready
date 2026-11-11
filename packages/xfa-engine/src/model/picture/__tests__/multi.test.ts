import { describe, expect, it } from 'vitest';
import { categoryOf, compilePicture, formatted, parsed } from './helpers.js';

const POSTAL = 'text{99999-9999}|text{99999}';
const DATES = 'date{YYYY-MM-DD}|date{YYYYMMDD}|date{YYYY/MM/DD}';
const OPTIONAL_MONEY = 'null{}|num{$zzz,zzz,zzz,zz9.zz}';

describe('multi-clause pictures', () => {
  it('formats with the first clause that fits, falling through when the first cannot (postal-style code)', () => {
    expect(formatted(POSTAL, '123456789')).toBe('12345-6789');
    expect(formatted(POSTAL, '12345')).toBe('12345');
  });

  it('parses with the first clause that matches, in order', () => {
    expect(parsed(POSTAL, '12345-6789')).toBe('123456789');
    expect(parsed(POSTAL, '12345')).toBe('12345');
    expect(parsed(POSTAL, '1234')).toBe('FAIL');
  });

  it('accepts every date spelling on parse (a later clause is not skipped after an earlier one fails)', () => {
    expect(parsed(DATES, '2023-02-28')).toBe('2023-02-28');
    expect(parsed(DATES, '20230228')).toBe('2023-02-28');
    expect(parsed(DATES, '2023/02/28')).toBe('2023-02-28');
    expect(parsed(DATES, '2023.02.28')).toBe('FAIL');
  });

  it('formats a date with the FIRST date clause only', () => {
    expect(formatted(DATES, '2023-02-28')).toBe('2023-02-28');
    expect(formatted('date{YYYYMMDD}|date{YYYY-MM-DD}', '2023-02-28')).toBe('20230228');
  });

  it('does not fall through a calendar failure into a looser clause', () => {
    expect(parsed(DATES, '2023-02-30')).toBe('FAIL');
  });

  it('formats null and empty canonical to empty text through the null clause', () => {
    expect(formatted(OPTIONAL_MONEY, null)).toBe('');
    expect(formatted(OPTIONAL_MONEY, '')).toBe('');
  });

  it('skips the null clause when a value is present', () => {
    expect(formatted(OPTIONAL_MONEY, '1234.5')).toBe('$1,234.5');
    expect(parsed(OPTIONAL_MONEY, '$1,234.50')).toBe('1234.5');
  });

  it('a bare null{} picture refuses to format any value and refuses non-empty input', () => {
    expect(formatted('null{}', '5')).toBe('FAIL');
    expect(parsed('null{}', 'x')).toBe('FAIL');
    expect(formatted('null{}', null)).toBe('');
  });

  it('formats null/empty to empty text even when the picture has no null clause', () => {
    for (const source of ['date{YYYY-MM-DD}', 'num{99}', 'text{99999}', POSTAL, DATES]) {
      expect(formatted(source, null), source).toBe('');
      expect(formatted(source, ''), source).toBe('');
    }
  });

  it('parses the empty string to canonical null for every picture, never as a failed parse', () => {
    for (const source of ['date{YYYY-MM-DD}', 'num{99}', 'text{99999}', 'null{}', POSTAL, DATES, OPTIONAL_MONEY]) {
      const r = compilePicture(source).parse('');
      expect(r.ok, source).toBe(true);
      if (r.ok) expect(r.canonical, source).toBeNull();
    }
  });

  it('reports the first clause category for empty input and the matching clause category otherwise', () => {
    expect(categoryOf(compilePicture('date{YYYY-MM-DD}'), '')).toBe('date');
    expect(categoryOf(compilePicture('num{99}'), '')).toBe('num');
    expect(categoryOf(compilePicture('text{99999}'), '')).toBe('text');
    expect(categoryOf(compilePicture(OPTIONAL_MONEY), '')).toBe('null');
    expect(categoryOf(compilePicture(OPTIONAL_MONEY), '$5.00')).toBe('num');
    expect(categoryOf(compilePicture('text{99999}|date{YYYY-MM-DD}'), '2023-02-28')).toBe('date');
  });

  it('does not trim: whitespace-only input is not empty', () => {
    expect(parsed('num{99}', ' ')).toBe('FAIL');
    expect(parsed('text{99999}', ' ')).toBe('FAIL');
  });

  it('keeps the source string it was compiled from', () => {
    expect(compilePicture(DATES).source).toBe(DATES);
  });

  it('formats a value from a different category with the clause that can take it', () => {
    const mixed = 'date{YYYY-MM-DD}|num{99}';
    expect(formatted(mixed, '2023-02-28')).toBe('2023-02-28');
    expect(formatted(mixed, '7')).toBe('07');
  });

  it('returns ok:false when no clause can format the value', () => {
    expect(formatted(POSTAL, 'abc')).toBe('FAIL');
  });

  it('allows eight clauses', () => {
    expect(() => compilePicture(Array.from({ length: 8 }, () => 'text{9}').join('|'))).not.toThrow();
  });
});
