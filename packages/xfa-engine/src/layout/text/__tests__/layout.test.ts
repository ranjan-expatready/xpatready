import { describe, expect, it } from 'vitest';
import { XfaLayoutError } from '../../errors.js';
import { MAX_LINES_PER_TEXT, MAX_TEXT_CHARS } from '../../limits.js';
import { layoutText } from '../layout.js';
import { FALLBACK_FONT_ID } from '../types.js';
import { FIXED_FONT, fixedDeps, regionOf, styled } from './helpers.js';

/** At 10 pt on the synthetic font: character 5 pt, space 2.5 pt, ascent 7.5, descent 2.5, pitch 12, one-line block 10. */
function lay(text: string, over = {}, region = regionOf(), wrap = true): { out: ReturnType<typeof layoutText>; reports: string[] } {
  const reports: string[] = [];
  return { out: layoutText({ text, style: styled(over), region, wrap }, fixedDeps(reports)), reports };
}
const xs = (out: ReturnType<typeof layoutText>): number[] => out.lines.map((l) => l.xPt);
const ys = (out: ReturnType<typeof layoutText>): number[] => out.lines.map((l) => l.yBaselinePt);
const texts = (out: ReturnType<typeof layoutText>): string[] => out.lines.map((l) => l.runs.map((r) => r.text).join(''));

describe('layoutText: hAlign', () => {
  it('left starts at the region left, centre and right use the room left over, in a region that does not start at 0', () => {
    const region = regionOf(100, 50, 3, 4);
    expect(xs(lay('abcd', { hAlign: 'left' }, region).out)).toEqual([3]);
    expect(xs(lay('abcd', { hAlign: 'center' }, region).out)).toEqual([3 + 40]);
    expect(xs(lay('abcd', { hAlign: 'right' }, region).out)).toEqual([3 + 80]);
  });

  it('leading and trailing spaces of the last line count in the width that is aligned', () => {
    expect(xs(lay(' ab ', { hAlign: 'right' }).out)).toEqual([100 - (2.5 + 10 + 2.5)]);
  });

  it('a wrapped line is aligned without the spaces that hang after it', () => {
    const { out } = lay('ab cd', { hAlign: 'right' }, regionOf(15, 50));
    expect(texts(out)).toEqual(['ab ', 'cd']);
    expect(xs(out)).toEqual([15 - 10, 15 - 10]);
  });

  it('justify, justifyAll and radix are laid out as left and reported only when they would change something', () => {
    const wrapped = lay('ab cd', { hAlign: 'justify' }, regionOf(15, 50));
    expect(xs(wrapped.out)).toEqual([0, 0]);
    expect(wrapped.reports).toEqual(['hAlign="justify" (laid out as left)']);
    expect(lay('ab', { hAlign: 'justify' }).reports).toEqual([]);
    expect(lay('ab', { hAlign: 'justifyAll' }).reports).toEqual(['hAlign="justifyAll" (laid out as left)']);
    expect(lay('ab', { hAlign: 'radix' }).reports).toEqual(['hAlign="radix" (laid out as left)']);
  });

  it('text wider than the room starts at the left edge (no negative offset) and is flagged as overflow', () => {
    const { out } = lay('abcdefghijklmnopqrstuvwxyz', { hAlign: 'center' }, regionOf(50, 50), false);
    expect(xs(out)).toEqual([0]);
    expect(out.overflow).toEqual({ horizontal: true, vertical: false });
  });
});

describe('layoutText: vAlign and line pitch', () => {
  it('top puts the first baseline an ascent below the region top', () => {
    expect(ys(lay('ab', { vAlign: 'top' }, regionOf(100, 50, 0, 4)).out)).toEqual([4 + 7.5]);
  });

  it('middle centres the block (ascent + descent) and bottom puts its descent on the region bottom', () => {
    expect(ys(lay('ab', { vAlign: 'middle' }).out)).toEqual([(50 - 10) / 2 + 7.5]);
    expect(ys(lay('ab', { vAlign: 'bottom' }).out)).toEqual([50 - 2.5]);
  });

  it('lines are one natural pitch apart (ascent + descent + line gap = 1.2 em) and the block is (n - 1) pitches plus ascent + descent', () => {
    const { out } = lay('a\nb\nc', { vAlign: 'bottom' });
    expect(ys(out)).toEqual([50 - 24 - 2.5, 50 - 12 - 2.5, 50 - 2.5]);
    expect(out.extent.heightPt).toBe(34);
  });

  it('an explicit lineHeight larger than the natural pitch is the pitch', () => {
    expect(ys(lay('a\nb', { lineHeightPt: 20 }).out)).toEqual([7.5, 27.5]);
  });

  it('an explicit lineHeight below the natural pitch leaves the pitch and a top-aligned block alone, without a report', () => {
    const { out, reports } = lay('a\nb', { lineHeightPt: 8 });
    expect(ys(out)).toEqual([7.5, 19.5]);
    expect(reports).toEqual([]);
  });

  it('an explicit lineHeight below the natural pitch places the middle-aligned block by lineHeight minus the line gap, and says so, but the extent and overflow keep the natural block', () => {
    const { out, reports } = lay('a', { lineHeightPt: 8, vAlign: 'middle' });
    // placed as a 6 pt block (8 - 2), not 10
    expect(ys(out)).toEqual([(50 - 6) / 2 + 7.5]);
    expect(out.extent.heightPt).toBe(10);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toContain('below the natural 12pt');
    expect(lay('a', { lineHeightPt: 8, vAlign: 'middle' }, regionOf(100, 9)).out.overflow.vertical).toBe(true);
  });

  it('the same rule applies to bottom alignment and raises the issue there too; a top-aligned block is neither moved nor reported', () => {
    const bottom = lay('a', { lineHeightPt: 8, vAlign: 'bottom' });
    expect(ys(bottom.out)).toEqual([50 - 6 + 7.5]);
    expect(bottom.reports).toHaveLength(1);
    expect(bottom.out.extent.heightPt).toBe(10);
    expect(lay('a', { lineHeightPt: 8, vAlign: 'top' }).reports).toEqual([]);
  });

  it('a lineHeight below the line gap never makes the block or the extent negative', () => {
    const { out } = lay('a', { lineHeightPt: 1, vAlign: 'middle' });
    expect(ys(out)).toEqual([50 / 2 + 7.5]);
    expect(out.extent.heightPt).toBe(10);
    const many = lay('a\nb', { lineHeightPt: 1, vAlign: 'bottom' });
    expect(many.out.extent.heightPt).toBe(22);
    expect(ys(many.out)).toEqual([50 - 12 + 7.5, 50 - 12 + 7.5 + 12]);
  });

  it('spaceAbove moves the first baseline down and spaceBelow only enlarges the block', () => {
    expect(ys(lay('a', { spaceAbovePt: 3, spaceBelowPt: 5 }).out)).toEqual([3 + 7.5]);
    const { out } = lay('a', { spaceAbovePt: 3, spaceBelowPt: 5, vAlign: 'bottom' });
    expect(ys(out)).toEqual([50 - (3 + 10 + 5) + 3 + 7.5]);
    expect(out.extent.heightPt).toBe(18);
  });

  it('baselineShift raises the baseline (positive is up)', () => {
    expect(ys(lay('a', { baselineShiftPt: 2 }).out)).toEqual([5.5]);
  });
});

describe('layoutText: margins, indent, newlines, wrapping', () => {
  it('marginLeft and marginRight narrow the room and move the start; the indent moves the first line only', () => {
    const { out } = lay('ab cd ef', { marginLeftPt: 4, marginRightPt: 6, textIndentPt: 10 }, regionOf(45, 50));
    // first-line room = 45 - 4 - 6 - 10 = 25 ("ab cd" is 22.5, "ab cd ef" 35); later lines 35
    expect(texts(out)).toEqual(['ab cd ', 'ef']);
    expect(xs(out)).toEqual([14, 4]);
  });

  it('right alignment honours both margins', () => {
    expect(xs(lay('ab', { hAlign: 'right', marginLeftPt: 4, marginRightPt: 6 }).out)).toEqual([4 + (90 - 10)]);
  });

  it('a negative indent (hanging) starts the first line left of the margin', () => {
    const { out } = lay('ab', { marginLeftPt: 10, textIndentPt: -4 });
    expect(xs(out)).toEqual([6]);
  });

  it('line feeds of every kind start a new line, an empty line included', () => {
    expect(texts(lay('a\r\nb\rc\n\nd').out)).toEqual(['a', 'b', 'c', '', 'd']);
  });

  it('wraps at spaces to the region width, and not at all when wrap is false', () => {
    expect(texts(lay('ab cd ef', {}, regionOf(15, 50)).out)).toEqual(['ab ', 'cd ', 'ef']);
    const flat = lay('ab cd ef', {}, regionOf(15, 50), false);
    expect(texts(flat.out)).toEqual(['ab cd ef']);
    expect(flat.out.overflow.horizontal).toBe(true);
  });

  it('breaks a word with no spaces at the character that no longer fits', () => {
    expect(texts(lay('abcdefghij', {}, regionOf(20, 50)).out)).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('flags vertical overflow but keeps every line', () => {
    const { out } = lay('a\nb\nc\nd\ne', {}, regionOf(100, 20));
    expect(out.lines).toHaveLength(5);
    expect(out.overflow.vertical).toBe(true);
  });
});

describe('layoutText: empty and odd text', () => {
  it('empty text has no lines and no extent', () => {
    const { out } = lay('');
    expect(out.lines).toEqual([]);
    expect(out.extent).toEqual({ widthPt: 0, heightPt: 0 });
  });

  it('whitespace-only text is one line of spaces with no fitting width', () => {
    const { out } = lay('   ');
    expect(texts(out)).toEqual(['   ']);
    expect(out.lines[0]?.widthPt).toBe(7.5);
    expect(out.lines[0]?.fitWidthPt).toBe(0);
  });

  it('a character the font does not map is measured with .notdef and reported once as glyph.U+XXXX', () => {
    const { out, reports } = lay('é é');
    expect(out.lines[0]?.widthPt).toBe(5 + 2.5 + 5);
    expect(reports).toEqual(['glyph.U+00E9']);
  });

  it('carries the font id, size, colour and a non-zero letter spacing into the run; letter spacing widens the line', () => {
    const { out } = lay('ab', { colour: [255, 0, 0], letterSpacingPt: 1, sizePt: 10 });
    expect(out.lines[0]?.runs[0]).toEqual({ text: 'ab', fontId: 'font:Fixed', sizePt: 10, colour: [255, 0, 0], letterSpacingPt: 1 });
    expect(out.lines[0]?.widthPt).toBe(12);
    expect(lay('ab').out.lines[0]?.runs[0]).not.toHaveProperty('letterSpacingPt');
  });

  it('a typeface with no program uses the fallback font id', () => {
    const out = layoutText({ text: 'a', style: styled(), region: regionOf(), wrap: true }, { resolveFont: () => ({ ...FIXED_FONT, fontId: undefined }), report: () => undefined });
    expect(out.lines[0]?.runs[0]?.fontId).toBe(FALLBACK_FONT_ID);
  });
});

describe('layoutText: bounds on hostile input', () => {
  it('cuts text longer than the ceiling and reports it', () => {
    const { out, reports } = lay('a'.repeat(MAX_TEXT_CHARS + 1), {}, regionOf(100, 50), false);
    expect(out.lines[0]?.runs[0]?.text).toHaveLength(MAX_TEXT_CHARS);
    expect(reports).toContain(`text longer than ${MAX_TEXT_CHARS} characters (cut)`);
  });

  it('cuts a text of more lines than the ceiling', () => {
    const { out, reports } = lay('a\n'.repeat(MAX_LINES_PER_TEXT + 500));
    expect(out.lines).toHaveLength(MAX_LINES_PER_TEXT);
    expect(reports.some((r) => r.includes('lines (cut)'))).toBe(true);
  });

  it('refuses a style or region that is not finite and non-negative with a typed error', () => {
    const bad = (input: Parameters<typeof layoutText>[0]): void => {
      expect(() => layoutText(input, fixedDeps())).toThrow(XfaLayoutError);
    };
    bad({ text: 'a', style: styled({ sizePt: 0 }), region: regionOf(), wrap: true });
    bad({ text: 'a', style: styled({ sizePt: Number.NaN }), region: regionOf(), wrap: true });
    bad({ text: 'a', style: styled({ marginLeftPt: -1 }), region: regionOf(), wrap: true });
    bad({ text: 'a', style: styled(), region: regionOf(-1, 5), wrap: true });
    bad({ text: 'a', style: { ...styled(), extra: 1 } as unknown as ReturnType<typeof styled>, region: regionOf(), wrap: true });
  });
});
