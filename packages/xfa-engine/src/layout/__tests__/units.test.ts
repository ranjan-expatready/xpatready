import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../pdf/errors.js';
import { XfaLayoutError } from '../errors.js';
import { MAX_MEASURE_CHARS, MAX_MEASURE_LIST_ITEMS } from '../limits.js';
import { parseMeasure, parseMeasureList } from '../units.js';

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    expect(error, 'a bad measurement must raise the typed layout error, never a RangeError or TypeError').toBeInstanceOf(XfaLayoutError);
    expect(error).toBeInstanceOf(XfaPdfError);
    return (error as XfaLayoutError).code;
  }
  throw new Error('expected parseMeasure to throw');
}

describe('parseMeasure: text to points (A1)', () => {
  it.each([
    ['7.62mm', 21.6],
    ['10.8pt', 10.8],
    ['0.25in', 18],
    ['1cm', 28.34645669291339],
    ['1in', 72],
    ['8070mp', 8.07],
    ['  12.5pt  ', 12.5],
    ['+3pt', 3],
    ['.5in', 36],
    ['5.in', 360],
    ['-2mm', -5.669291338582677],
    ['0mm', 0],
  ] as const)('%j is %d pt (a wrong factor would shift every box on the page)', (text, points) => {
    expect(parseMeasure(text, 'pt')).toBeCloseTo(points, 9);
  });

  it('a unit-less number takes the unit the caller names, and "0" is zero in every unit', () => {
    expect(parseMeasure('2', 'in')).toBe(144);
    expect(parseMeasure('2', 'mm')).toBeCloseTo(5.669291338582677, 9);
    expect(parseMeasure('2', 'pt')).toBe(2);
    expect(parseMeasure('2', 'mp')).toBe(0.002);
    for (const unit of ['in', 'cm', 'mm', 'pt', 'mp'] as const) expect(parseMeasure('0', unit)).toBe(0);
  });

  it('the "-1" caption reserve sentinel parses as a negative number the caller can test (unit-less, pt)', () => {
    expect(parseMeasure('-1', 'pt')).toBe(-1);
  });

  it('an explicit unit wins over the default unit', () => {
    expect(parseMeasure('1in', 'mm')).toBe(72);
  });

  it('units the engine does not model are LAYOUT_UNSUPPORTED and name the attribute (silently reading "3px" as 3 pt would be wrong)', () => {
    for (const text of ['3px', '3em', '3pc', '3%', '1e999mm', '3 in x']) {
      expect(codeOf(() => parseMeasure(text, 'pt', 'minW')), text).toBe('LAYOUT_UNSUPPORTED');
    }
    expect(() => parseMeasure('3px', 'pt', 'minW')).toThrow(/minW/);
  });

  it('text with no number, an empty string and a repeated sign are INVALID_ARGUMENT', () => {
    for (const text of ['mm', '', '   ', '--3mm', '+-1', '.', 'abc']) expect(codeOf(() => parseMeasure(text, 'pt')), JSON.stringify(text)).toBe('INVALID_ARGUMENT');
  });

  it('a string over the length ceiling is refused before any scan (a 1 kB hostile attribute), and the echo is clipped', () => {
    const long = `${'9'.repeat(1024)}mm`;
    expect(codeOf(() => parseMeasure(long, 'pt'))).toBe('INVALID_ARGUMENT');
    try {
      parseMeasure(long, 'pt');
    } catch (error) {
      expect((error as Error).message.length).toBeLessThan(300);
    }
    expect(parseMeasure(`${'1'.repeat(MAX_MEASURE_CHARS - 2)}pt`, 'pt')).toBeGreaterThan(0);
  });

  it('never returns NaN or Infinity: the longest accepted text is still a finite number of points', () => {
    const widest = `${'9'.repeat(MAX_MEASURE_CHARS - 2)}in`;
    expect(Number.isFinite(parseMeasure(widest, 'pt'))).toBe(true);
  });

  it('control characters inside the text are not a number (only space, tab, CR and LF may pad)', () => {
    expect(parseMeasure('\t\n 4pt \r', 'pt')).toBe(4);
    expect(codeOf(() => parseMeasure('4\u0000pt', 'pt'))).toBe('LAYOUT_UNSUPPORTED');
  });
});

describe('parseMeasureList: columnWidths', () => {
  it('splits on whitespace and converts each entry; a single-entry list works', () => {
    expect(parseMeasureList('10mm 1in  20pt', 'pt')).toEqual([expect.closeTo(28.346456692913385, 9), 72, 20]);
    expect(parseMeasureList('5', 'in')).toEqual([360]);
  });

  it('"-1" entries (auto width) survive as negative numbers', () => {
    expect(parseMeasureList('-1 30pt -1', 'pt')).toEqual([-1, 30, -1]);
  });

  it('an empty list and a list over the item ceiling are refused; one bad entry names the attribute', () => {
    expect(codeOf(() => parseMeasureList('   ', 'pt', 'columnWidths'))).toBe('INVALID_ARGUMENT');
    expect(codeOf(() => parseMeasureList(Array.from({ length: MAX_MEASURE_LIST_ITEMS + 1 }, () => '1pt').join(' '), 'pt'))).toBe('INVALID_ARGUMENT');
    expect(() => parseMeasureList('1pt 2px', 'pt', 'columnWidths')).toThrow(/columnWidths/);
  });
});
