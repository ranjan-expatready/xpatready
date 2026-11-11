import { describe, expect, it } from 'vitest';
import { formatted, parsed } from './helpers.js';

const TWO = 'num{99}';
const WIDE = 'num{zzzzzzzzzzzz9}';
const MONEY = 'num{$zzz,zzz,zzz,zz9.zz}';

type Row = readonly [source: string, a: string, b: string];

const FORMAT_OK: readonly Row[] = [
  [TWO, '3', '03'],
  [TWO, '12', '12'],
  [TWO, '0', '00'],
  [TWO, '3.5', '04'],
  [TWO, '3.4', '03'],
  [TWO, '007', '07'],
  [TWO, '99.4', '99'],
  [MONEY, '5', '$5'],
  [MONEY, '1234.5', '$1,234.5'],
  [MONEY, '1234.50', '$1,234.5'],
  [MONEY, '1234.56', '$1,234.56'],
  [MONEY, '0.25', '$0.25'],
  [MONEY, '0.10', '$0.1'],
  [MONEY, '0', '$0'],
  [MONEY, '1234567', '$1,234,567'],
  [MONEY, '0.005', '$0.01'],
  [MONEY, '0.004', '$0'],
  [MONEY, '1.005', '$1.01'],
  [MONEY, '12.345', '$12.35'],
  [MONEY, '999999999999', '$999,999,999,999'],
  [MONEY, '999.999', '$1,000'],
  [MONEY, '100', '$100'],
  [MONEY, '1000', '$1,000'],
  [WIDE, '42', '42'],
  [WIDE, '0', '0'],
  [WIDE, '1234567890123', '1234567890123'],
  [WIDE, '3.5', '4'],
  ['num{9.99}', '1.5', '1.50'],
  ['num{z9}', '5', '5'],
  ['num{z9}', '10', '10'],
  ['num{99,999}', '1234', '01,234'],
  ['num{zz,zz9}', '5', '5'],
  ['num{zz,zz9}', '1234', '1,234'],
  ['num{zz,zz9}', '12', '12'],
  ['num{9z9}', '5', '005'],
  ['num{z9.zz}', '0.5', '0.5'],
  // A 9 in the fraction is always shown; only trailing z positions holding zero are dropped, then the point if none is left.
  ['num{9.9z}', '1', '1.0'],
  ['num{9.9z}', '1.05', '1.05'],
  ['num{9.9z}', '1.50', '1.5'],
  ['num{9.zz}', '1', '1'],
  ['num{9.z9}', '1.05', '1.05'],
  ['num{9.z9}', '1', '1.00'],
];

const FORMAT_BAD: readonly (readonly [title: string, source: string, canonical: string])[] = [
  ['more integer digits than slots', TWO, '123'],
  ['a carry that adds an integer digit (99.5 rounds to 100)', TWO, '99.5'],
  ['a negative value (sign silently dropped)', TWO, '-3'],
  ['non-numeric text', TWO, 'abc'],
  ['an exponent form', TWO, '1e3'],
  ['a trailing decimal point', TWO, '3.'],
  ['a leading decimal point', TWO, '.5'],
  ['two decimal points', TWO, '1.2.3'],
  ['a thousands separator in canonical', MONEY, '1,234'],
  ['a currency symbol in canonical', MONEY, '$5'],
  ['a plus sign', TWO, '+3'],
  ['a space', TWO, '3 '],
  ['13 integer digits in a 12-slot field', MONEY, '1000000000000'],
  ['a rounding carry past the last slot', MONEY, '999999999999.995'],
  ['14 integer digits in a 13-slot field', WIDE, '12345678901234'],
  ['a very long digit run', WIDE, '9'.repeat(5000)],
  ['a date-shaped canonical', TWO, '2023-02-28'],
];

const PARSE_OK: readonly Row[] = [
  [TWO, '3', '3'],
  [TWO, '03', '3'],
  [TWO, '12', '12'],
  [TWO, '00', '0'],
  [MONEY, '$1,234.50', '1234.5'],
  [MONEY, '1234.5', '1234.5'],
  [MONEY, '$5.00', '5'],
  [MONEY, '$0.25', '0.25'],
  [MONEY, '0.25', '0.25'],
  [MONEY, '5', '5'],
  [MONEY, '$5', '5'],
  [MONEY, '1,234,567', '1234567'],
  [MONEY, '$1,234,567.00', '1234567'],
  [MONEY, '0.50', '0.5'],
  [MONEY, '$000,001.10', '1.1'],
  [MONEY, '$100.05', '100.05'],
  [WIDE, '42', '42'],
  [WIDE, '0', '0'],
  [WIDE, '1234567890123', '1234567890123'],
];

const PARSE_BAD: readonly (readonly [title: string, source: string, input: string])[] = [
  ['asterisks', TWO, '**'],
  ['a letter after a digit', TWO, '1a'],
  ['more digits than slots', TWO, '123'],
  ['a negative sign', TWO, '-3'],
  ['an exponent form', TWO, '1e3'],
  ['a decimal point the pattern lacks', TWO, '3.5'],
  ['leading space (input silently trimmed)', TWO, ' 3'],
  ['trailing space', TWO, '3 '],
  ['a plus sign', TWO, '+3'],
  ['a comma the pattern lacks', TWO, '1,2'],
  ['a currency symbol the pattern lacks', TWO, '$3'],
  ['a doubled currency symbol', MONEY, '$$5'],
  ['a trailing currency symbol', MONEY, '5$'],
  ['a lone currency symbol', MONEY, '$'],
  ['a comma right after the currency symbol', MONEY, '$,5'],
  ['a trailing comma', MONEY, '5,'],
  ['a doubled comma', MONEY, '1,,234'],
  ['a leading comma', MONEY, ',234'],
  ['a comma before the decimal point', MONEY, '1,.5'],
  ['a comma after the decimal point', MONEY, '1.5,0'],
  ['a comma right after the decimal point', MONEY, '1.,5'],
  ['a trailing comma after the integer part', MONEY, '1,234,'],
  ['three fraction digits in a two-digit fraction', MONEY, '1.234'],
  ['a trailing decimal point', MONEY, '1.'],
  ['a leading decimal point', MONEY, '.5'],
  ['two decimal points', MONEY, '1.2.3'],
  ['an exponent', MONEY, '1e3'],
  ['a negative sign', MONEY, '-5'],
  ['accounting parentheses', MONEY, '(5)'],
  ['a space as grouping', MONEY, '1 234'],
  ['a space after the currency symbol', MONEY, '$ 5'],
  ['13 integer digits in a 12-slot field', MONEY, '1234567890123'],
  ['14 digits in a 13-slot field', WIDE, '12345678901234'],
  ['the currency symbol when the pattern has none', WIDE, '$42'],
  ['a comma when the pattern has none', WIDE, '1,2'],
  ['full-width digits', MONEY, '５'],
  ['a long run of digits', MONEY, '1'.repeat(5000)],
];

describe('num{} format', () => {
  it.each(FORMAT_OK)('%s formats %j to %j', (source, canonical, text) => {
    expect(formatted(source, canonical)).toBe(text);
  });

  it.each(FORMAT_BAD)('refuses %s', (_title, source, canonical) => {
    expect(formatted(source, canonical)).toBe('FAIL');
  });
});

describe('num{} parse', () => {
  it.each(PARSE_OK)('%s parses %j to canonical %j', (source, input, canonical) => {
    expect(parsed(source, input)).toBe(canonical);
  });

  it.each(PARSE_BAD)('rejects %s', (_title, source, input) => {
    expect(parsed(source, input)).toBe('FAIL');
  });
});
