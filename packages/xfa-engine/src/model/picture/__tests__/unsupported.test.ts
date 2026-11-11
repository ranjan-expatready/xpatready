import { describe, expect, it } from 'vitest';
import { compilePicture, expectXfa } from './helpers.js';

const NINES = (n: number): string => '9'.repeat(n);

const UNSUPPORTED: readonly (readonly [title: string, source: string])[] = [
  ['an empty source', ''],
  ['a locale-qualified date', 'date(xx_YY){YYYY-MM-DD}'],
  ['a locale-qualified number', 'num(xx_YY){99}'],
  ['a locale-qualified text', 'text(xx_YY){99}'],
  ['a time clause', 'time{HH:MM}'],
  ['a datetime clause', 'datetime{YYYY-MM-DD}'],
  ['a zero clause', 'zero{}'],
  ['an eq clause', 'eq{}'],
  ['an upper-case category', 'DATE{YYYY-MM-DD}'],
  ['an unknown category', 'frob{9}'],
  ['an empty category', '{YYYY-MM-DD}'],
  ['an unknown symbol A in text', 'text{A9}'],
  ['an unknown lower-case symbol in text', 'text{9a}'],
  ['an unknown sign symbol in num', 'num{S99}'],
  ['an empty date pattern', 'date{}'],
  ['a repeated YYYY', 'date{YYYY-YYYY-MM-DD}'],
  ['a repeated MM', 'date{YYYY-MM-MM-DD}'],
  ['a missing DD', 'date{YYYY-MM}'],
  ['a missing YYYY', 'date{MM-DD}'],
  ['a two-digit year token', 'date{YY-MM-DD}'],
  ['a three-letter month token', 'date{YYYY-MMM-DD}'],
  ['a five-letter year token', 'date{YYYYY-MM-DD}'],
  ['a leading literal in a date', 'date{-YYYY-MM-DD}'],
  ['a trailing literal in a date', 'date{YYYY-MM-DD-}'],
  ['a literal outside the date set', 'date{YYYY:MM:DD}'],
  ['a letter literal in a date', 'date{YYYY MM DDx}'],
  ['a missing closing brace', 'date{YYYY-MM-DD'],
  ['a missing opening brace', 'date YYYY-MM-DD}'],
  ['an extra closing brace', 'date{YYYY-MM-DD}}'],
  ['a trailing opening brace', 'date{YYYY-MM-DD}{'],
  ['a nested brace', 'date{YYYY-{MM}-DD}'],
  ['a nested open brace', 'text{9{9}'],
  ['leading whitespace outside braces', ' date{YYYY-MM-DD}'],
  ['trailing whitespace outside braces', 'date{YYYY-MM-DD} '],
  ['whitespace around the clause separator', 'date{YYYY-MM-DD} | date{YYYYMMDD}'],
  ['a trailing clause separator', 'date{YYYY-MM-DD}|'],
  ['a leading clause separator', '|date{YYYY-MM-DD}'],
  ['an empty clause between separators', 'date{YYYY-MM-DD}||date{YYYYMMDD}'],
  ['stray text after a clause', 'text{99}x'],
  ['a clause separator inside braces', 'text{9|9}'],
  ['a non-empty null pattern', 'null{x}'],
  ['a whitespace null pattern', 'null{ }'],
  ['an empty num pattern', 'num{}'],
  ['a num pattern with no 9 anywhere', 'num{zz}'],
  ['a num pattern whose last integer slot suppresses zero', 'num{9z}'],
  ['a trailing decimal point with no fraction slot', 'num{99.}'],
  ['a decimal point with no integer slot', 'num{.99}'],
  ['two decimal points', 'num{9.9.9}'],
  ['a currency symbol that is not first', 'num{9$9}'],
  ['a doubled currency symbol', 'num{$$9}'],
  ['a trailing grouping comma', 'num{99,}'],
  ['a leading grouping comma', 'num{,99}'],
  ['a doubled grouping comma', 'num{9,,9}'],
  ['a grouping comma in the fraction', 'num{9.9,9}'],
  ['a comma right after the currency symbol', 'num{$,99}'],
  ['a hyphen in num', 'num{9-9}'],
  ['a space in num', 'num{9 9}'],
  ['a letter in num', 'num{9e}'],
  ['an empty text pattern', 'text{}'],
  ['a text pattern with literals only', 'text{---}'],
  ['a comma literal in text', 'text{9,9}'],
  ['an upper-case symbol in text', 'text{Z9}'],
  ['a z symbol in text', 'text{z9}'],
  ['a control character in text', 'text{9\n9}'],
  ['a null character in text', 'text{9\u00009}'],
  ['41 digit slots in a num pattern', `num{${NINES(41)}}`],
  ['a 65-character pattern', `num{${NINES(65)}}`],
  ['a 65-character text pattern', `text{${NINES(65)}}`],
  ['a 257-character source', `${['text{' + NINES(64) + '}', 'text{' + NINES(64) + '}', 'text{' + NINES(64) + '}'].join('|')}|text{${NINES(38)}}`],
  ['9 clauses', Array.from({ length: 9 }, () => 'text{9}').join('|')],
  ['a very long source', 'x'.repeat(5000)],
  ['only braces', '{}'],
  ['only a separator', '|'],
];

describe('compilePicture fails closed on anything outside the supported grammar', () => {
  it.each(UNSUPPORTED)('%s -> UNSUPPORTED_FEATURE', (_title, source) => {
    expectXfa(() => compilePicture(source), 'UNSUPPORTED_FEATURE');
  });

  it('a 256-character source is still accepted (the ceiling is inclusive)', () => {
    const source = `${['text{' + NINES(64) + '}', 'text{' + NINES(64) + '}', 'text{' + NINES(64) + '}'].join('|')}|text{${NINES(37)}}`;
    expect(source.length).toBe(256);
    expect(() => compilePicture(source)).not.toThrow();
  });

  it('64 pattern characters and 40 digit slots are accepted (the ceilings are inclusive)', () => {
    expect(() => compilePicture(`text{${NINES(64)}}`)).not.toThrow();
    expect(() => compilePicture(`num{${NINES(40)}}`)).not.toThrow();
  });

  it('the failure names the picture feature so a form author can find it', () => {
    expectXfa(() => compilePicture('time{HH:MM}'), 'UNSUPPORTED_FEATURE', /picture/);
  });
});

describe('error messages never echo hostile source text raw', () => {
  const hostile: readonly (readonly [title: string, source: string])[] = [
    ['a 5000-character source', 'A'.repeat(5000)],
    ['a 5000-character source of well-formed clauses', 'text{9}|'.repeat(700)],
    ['a long unknown category', `${'z'.repeat(200)}{9}`],
    ['control characters in a category', `${'\u001b[31m\n'.repeat(20)}{9}`],
    ['control characters in a pattern', 'text{\u001b[2J\r\n\u0007}'],
    ['non-ASCII text in a pattern', `num{${'‮é１'.repeat(10)}}`],
    ['a long date pattern with literals', `date{${'YYYY-'.repeat(12)}}`],
  ];

  it.each(hostile)('%s: message is bounded and printable', (_title, source) => {
    const err = expectXfa(() => compilePicture(source), 'UNSUPPORTED_FEATURE');
    expect(err.message.length).toBeLessThan(400);
    for (let i = 0; i < err.message.length; i++) {
      const c = err.message.charCodeAt(i);
      expect(c >= 0x20 && c <= 0x7e, `char ${i} (code ${c}) must be printable ASCII`).toBe(true);
    }
  });

  it('does not contain the full 5000-character source', () => {
    const err = expectXfa(() => compilePicture('Q'.repeat(5000)), 'UNSUPPORTED_FEATURE');
    expect(err.message).not.toContain('Q'.repeat(100));
  });
});
