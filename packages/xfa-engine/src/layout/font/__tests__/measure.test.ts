import { describe, expect, it } from 'vitest';
import { XfaLayoutError } from '../../errors.js';
import { MAX_TEXT_CHARS } from '../../limits.js';
import { measure } from '../measure.js';
import { parseFontMetrics } from '../sfnt.js';
import { cmapFormat4, syntheticFont } from './build-sfnt.js';

// Glyphs: 0 .notdef 500, 1..3 = A B C 600/700/800, 4 = space 250. 1000 units per em; ascent 750, descent 250, gap 200.
const metrics = parseFontMetrics(syntheticFont({ advances: [500, 600, 700, 800, 250], cmap: cmapFormat4({ 65: 1, 66: 2, 67: 3, 32: 4 }) }));

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(XfaLayoutError);
    return (error as XfaLayoutError).code;
  }
  throw new Error('expected measure to refuse');
}

describe('measure: advance width, ascent, descent and line height of a run (T02 rule)', () => {
  it('sums the advances in design units and scales once by size / unitsPerEm', () => {
    const m = measure('ABC', metrics, 10);
    expect(m.widthPt).toBe((600 + 700 + 800) * 10 / 1000);
    expect(m.ascentPt).toBe(7.5);
    expect(m.descentPt).toBe(2.5);
    expect(m.lineGapPt).toBe(2);
    expect(m.lineHeightPt).toBe(12);
    expect(m.missing).toEqual([]);
  });

  it('counts leading and trailing spaces (they hang only when a line is broken, which is not this function)', () => {
    expect(measure(' A ', metrics, 10).widthPt).toBe((250 + 600 + 250) * 10 / 1000);
  });

  it('adds the letter spacing once per code point, the last one included', () => {
    expect(measure('ABC', metrics, 10, 0.5).widthPt).toBe(21 + 1.5);
    expect(measure('ABC', metrics, 10, -0.25).widthPt).toBe(21 - 0.75);
  });

  it('is zero wide for the empty string, and still reports the vertical metrics', () => {
    const m = measure('', metrics, 8);
    expect(m.widthPt).toBe(0);
    expect(m.lineHeightPt).toBeCloseTo(9.6, 12);
  });

  it('measures an unmapped character with the .notdef advance and reports each distinct one once, in order of first appearance', () => {
    const m = measure('AéBé?', metrics, 10);
    expect(m.widthPt).toBe((600 + 500 + 700 + 500 + 500) * 10 / 1000);
    expect(m.missing).toEqual([0xe9, 0x3f]);
  });

  it('treats a surrogate pair as one code point, and a lone surrogate as one unmapped code point', () => {
    const pair = measure('\u{1f600}', metrics, 10, 1);
    expect(pair.widthPt).toBe(5 + 1);
    expect(pair.missing).toEqual([0x1f600]);
    const lone = measure('\ud800A', metrics, 10);
    expect(lone.missing).toEqual([0xd800]);
    expect(lone.widthPt).toBe((500 + 600) * 10 / 1000);
  });

  it('is deterministic: the same inputs give the identical number on every call', () => {
    const a = measure('ABCABC CBA', metrics, 7.3, 0.1);
    for (let i = 0; i < 5; i++) expect(measure('ABCABC CBA', metrics, 7.3, 0.1).widthPt).toBe(a.widthPt);
  });

  it('refuses a size that is not a positive finite number, a letter spacing that is not finite, and text that is not a bounded string', () => {
    for (const size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(codeOf(() => measure('A', metrics, size))).toBe('INVALID_ARGUMENT');
    for (const spacing of [Number.NaN, Number.POSITIVE_INFINITY]) expect(codeOf(() => measure('A', metrics, 10, spacing))).toBe('INVALID_ARGUMENT');
    expect(codeOf(() => measure('A'.repeat(MAX_TEXT_CHARS + 1), metrics, 10))).toBe('INVALID_ARGUMENT');
    expect(codeOf(() => measure(5 as unknown as string, metrics, 10))).toBe('INVALID_ARGUMENT');
    expect(measure('A'.repeat(MAX_TEXT_CHARS), metrics, 1).widthPt).toBeCloseTo(MAX_TEXT_CHARS * 0.6, 6);
  });

  it('refuses a result that overflows to a non-finite number', () => {
    expect(codeOf(() => measure('ABC', metrics, 1e308))).toBe('INVALID_ARGUMENT');
  });
});
