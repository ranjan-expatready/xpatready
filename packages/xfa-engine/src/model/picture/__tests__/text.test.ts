import { describe, expect, it } from 'vitest';
import { formatted, parsed } from './helpers.js';

const DASHED = 'text{99999-9999}';
const FIVE = 'text{99999}';
const NINE = 'text{999999999}';
const PHONE = 'text{(999) 999-9999}';
const MIXED = 'text{99/99.99}';

type Row = readonly [source: string, a: string, b: string];

const PARSE_OK: readonly Row[] = [
  [DASHED, '12345-6789', '123456789'],
  [FIVE, '12345', '12345'],
  [NINE, '123456789', '123456789'],
  [PHONE, '(416) 555-0199', '4165550199'],
  [MIXED, '12/34.56', '123456'],
  [FIVE, '00000', '00000'],
];

const PARSE_BAD: readonly (readonly [title: string, source: string, input: string])[] = [
  ['the literal missing', DASHED, '123456789'],
  ['a short tail', DASHED, '12345-678'],
  ['a long tail', DASHED, '12345-67890'],
  ['a letter in a digit slot', DASHED, '1234a-6789'],
  ['a different literal', DASHED, '12345 6789'],
  ['full-width digits (non-ASCII digits accepted)', DASHED, '１２３４５-6789'],
  ['a trailing space (input silently trimmed)', FIVE, '12345 '],
  ['a leading space', FIVE, ' 12345'],
  ['one digit too few', FIVE, '1234'],
  ['one digit too many', FIVE, '123456'],
  ['a newline in place of a digit', FIVE, '1234\n'],
  ['a signed value', FIVE, '+1234'],
  ['a literal swapped for another', PHONE, '[416] 555-0199'],
  ['a missing space literal', PHONE, '(416)555-0199'],
  ['nine digits for an eight-slot pattern', NINE, '12345678'],
  ['a decimal point where a slash belongs', MIXED, '12.34.56'],
];

const FORMAT_OK: readonly Row[] = [
  [DASHED, '123456789', '12345-6789'],
  [FIVE, '12345', '12345'],
  [NINE, '123456789', '123456789'],
  [PHONE, '4165550199', '(416) 555-0199'],
  [MIXED, '123456', '12/34.56'],
];

const FORMAT_BAD: readonly (readonly [title: string, source: string, canonical: string])[] = [
  ['eight digits for nine slots', DASHED, '12345678'],
  ['ten digits for nine slots', DASHED, '1234567890'],
  ['a canonical that still carries the literal', DASHED, '12345-6789'],
  ['a letter in the canonical', NINE, '12345678a'],
  ['full-width digits in the canonical', FIVE, '１２３４５'],
  ['a sign in the canonical', FIVE, '+1234'],
  ['a very long canonical', FIVE, '1'.repeat(5000)],
];

describe('text{} parse', () => {
  it.each(PARSE_OK)('%s parses %j to slot characters %j', (source, input, canonical) => {
    expect(parsed(source, input)).toBe(canonical);
  });

  it.each(PARSE_BAD)('rejects %s', (_title, source, input) => {
    expect(parsed(source, input)).toBe('FAIL');
  });
});

describe('text{} format', () => {
  it.each(FORMAT_OK)('%s formats %j to %j', (source, canonical, text) => {
    expect(formatted(source, canonical)).toBe(text);
  });

  it.each(FORMAT_BAD)('refuses %s', (_title, source, canonical) => {
    expect(formatted(source, canonical)).toBe('FAIL');
  });
});
