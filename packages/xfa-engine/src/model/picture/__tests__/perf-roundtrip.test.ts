import { describe, expect, it } from 'vitest';
import { caught, compilePicture } from './helpers.js';

// Generous on purpose: this catches exponential backtracking (seconds to minutes), not a slow machine.
const BUDGET_MS = 10_000;

function elapsed(fn: () => unknown): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe('no pattern or input makes a picture slow (no backtracking)', () => {
  const NINES = (n: number): string => '9'.repeat(n);
  const pathologicalSources: readonly string[] = [
    '{'.repeat(256),
    '}'.repeat(256),
    '|'.repeat(256),
    'text{'.repeat(51),
    `num{${'9,'.repeat(31)}9}|`.repeat(3),
    `num{${'$'.repeat(60)}}`,
    `date{${'YYYY'.repeat(60)}}`,
    `text{${NINES(60)}}|`.repeat(3) + 'x'.repeat(30),
    `num{${'9,'.repeat(20)}9.${NINES(20)}}`,
  ];

  it.each(pathologicalSources.map((s) => [s.slice(0, 24), s] as const))('compiles or rejects %j in well under %i ms', (_label, source) => {
    expect(source.length).toBeLessThanOrEqual(256);
    expect(elapsed(() => caught(() => compilePicture(source)))).toBeLessThan(BUDGET_MS);
  });

  const accepted: readonly string[] = ['date{YYYY-MM-DD}', 'date{YYYYMMDD}', 'num{99}', 'num{$zzz,zzz,zzz,zz9.zz}', 'num{zzzzzzzzzzzz9}', 'text{99999-9999}|text{99999}', 'null{}|num{$zzz,zzz,zzz,zz9.zz}'];
  const bigInputs: readonly string[] = [
    '9'.repeat(10_000),
    `${'9'.repeat(9999)}x`,
    '1,'.repeat(5000),
    `$${','.repeat(9999)}`,
    '.'.repeat(10_000),
    `1.${'9'.repeat(9998)}`,
    '-'.repeat(10_000),
    ' '.repeat(10_000),
    '2023-02-'.repeat(1250),
    `${'9'.repeat(5000)}.${'9'.repeat(4999)}`,
  ];

  it.each(accepted)('%s parses and formats 10k-character strings in well under the budget', (source) => {
    const picture = compilePicture(source);
    const total = elapsed(() => {
      for (const input of bigInputs) {
        picture.parse(input);
        picture.format(input);
      }
    });
    expect(total).toBeLessThan(BUDGET_MS);
  });
});

/** Every row is a pattern with canonical values that fit it exactly (no rounding), so the round trip must be lossless. */
const ROUND_TRIP: readonly (readonly [source: string, canonicals: readonly string[]])[] = [
  ['date{YYYY-MM-DD}', ['2023-02-28', '2024-02-29', '0001-01-01', '9999-12-31']],
  ['date{YYYYMMDD}', ['2023-02-28', '2000-02-29']],
  ['date{YYYY/MM/DD}', ['2023-12-31']],
  ['date{DD/MM/YYYY}', ['2023-02-28', '2024-02-29']],
  ['date{MM.DD.YYYY}', ['1999-01-09']],
  ['date{YYYY - MM - DD}', ['2023-02-28']],
  ['num{99}', ['0', '3', '12', '99']],
  ['num{zzzzzzzzzzzz9}', ['0', '42', '1234567890123']],
  ['num{$zzz,zzz,zzz,zz9.zz}', ['0', '5', '1234.5', '0.25', '1234567', '999999999999.99', '0.01', '100', '1000.1']],
  ['num{99,999}', ['0', '1234', '99999']],
  ['num{zz,zz9}', ['5', '1234', '99999']],
  ['num{9.99}', ['1.5', '0', '9.99']],
  ['text{99999-9999}', ['123456789', '000000000']],
  ['text{99999}', ['12345', '00000']],
  ['text{999999999}', ['123456789']],
  ['text{(999) 999-9999}', ['4165550199']],
  ['text{99999-9999}|text{99999}', ['123456789', '12345']],
  ['date{YYYY-MM-DD}|date{YYYYMMDD}', ['2023-02-28']],
  ['null{}|num{$zzz,zzz,zzz,zz9.zz}', ['1234.5', '0']],
];

describe('round trip: parse(format(c)).canonical === c for every valid c', () => {
  const rows = ROUND_TRIP.flatMap(([source, canonicals]) => canonicals.map((c) => [source, c] as const));

  it.each(rows)('%s round-trips %j', (source, canonical) => {
    const picture = compilePicture(source);
    const shown = picture.format(canonical);
    expect(shown.ok, 'format must succeed for a canonical that fits').toBe(true);
    if (!shown.ok) return;
    const back = picture.parse(shown.text);
    expect(back.ok, `parse must accept its own output ${JSON.stringify(shown.text)}`).toBe(true);
    if (back.ok) expect(back.canonical).toBe(canonical);
  });

  it('round-trips null through the empty string for every picture', () => {
    for (const [source] of ROUND_TRIP) {
      const picture = compilePicture(source);
      const shown = picture.format(null);
      expect(shown, source).toEqual({ ok: true, text: '' });
      const back = picture.parse('');
      expect(back.ok && back.canonical, source).toBeNull();
    }
  });
});
