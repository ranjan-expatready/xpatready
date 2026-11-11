import { describe, expect, it } from 'vitest';
import { blockTop, glyphIssue, regionSchema, reportJustification, type BlockPlacement } from '../block.js';
import { layoutText } from '../layout.js';
import { layoutRich } from '../rich/layout.js';
import { fixedDeps, regionOf, styled } from './helpers.js';

const LAST = { naturalPitchPt: 12, ascentPt: 7.5, descentPt: 2.5, lineGapPt: 2 };
const place = (over: Partial<BlockPlacement> = {}): BlockPlacement => ({ vAlign: 'middle', lineHeightPt: 0, blockPt: 10, last: LAST, region: { yPt: 0, heightPt: 50 }, ...over });

describe('blockTop: where a block sits in its region (shared by plain and rich text)', () => {
  it('places by vAlign, and reports nothing when no lineHeight is below the natural pitch', () => {
    const reports: string[] = [];
    expect(blockTop(place({ vAlign: 'top' }), (f) => void reports.push(f))).toBe(0);
    expect(blockTop(place({ vAlign: 'middle' }), (f) => void reports.push(f))).toBe(20);
    expect(blockTop(place({ vAlign: 'bottom' }), (f) => void reports.push(f))).toBe(40);
    expect(blockTop(place({ lineHeightPt: 12 }), (f) => void reports.push(f))).toBe(20);
    expect(reports).toEqual([]);
  });

  it('a lineHeight below the natural pitch shrinks the last line of a middle or bottom block to lineHeight minus line gap, and says so; top alignment is not moved or reported', () => {
    const reports: string[] = [];
    const report = (f: string): void => void reports.push(f);
    // placed height = 10 - (7.5 + 2.5) + max(0, 8 - 2) = 6, so the middle top is (50 - 6) / 2.
    expect(blockTop(place({ lineHeightPt: 8 }), report)).toBe(22);
    expect(blockTop(place({ lineHeightPt: 8, vAlign: 'bottom' }), report)).toBe(44);
    expect(blockTop(place({ lineHeightPt: 8, vAlign: 'top' }), report)).toBe(0);
    expect(reports).toEqual(Array(2).fill('lineHeight 8pt is below the natural 12pt: text block placed by lineHeight minus line gap (fitted to 11 renderCache draws, unverified for other cases)'));
  });

  it('a block with no last line is never shrunk', () => {
    expect(blockTop(place({ last: undefined, lineHeightPt: 8 }), () => undefined)).toBe(20);
  });

  it('plain and rich text report the same lineHeight sentence for the same block', () => {
    const style = styled({ vAlign: 'middle', lineHeightPt: 8 });
    const plain: string[] = [];
    const rich: string[] = [];
    layoutText({ text: 'ab', style, region: regionOf(), wrap: true }, fixedDeps(plain));
    layoutRich({ markup: '<body xmlns="http://www.w3.org/1999/xhtml"><p>ab</p></body>', style, region: regionOf(), wrap: true }, fixedDeps(rich));
    expect(plain).toHaveLength(1);
    expect(rich).toEqual(plain);
  });
});

describe('reportJustification and the shared region schema', () => {
  it('reports justifyAll and radix always, and justify only when the paragraph has several lines', () => {
    const reports: string[] = [];
    const report = (f: string): void => void reports.push(f);
    reportJustification('justify', 1, report);
    reportJustification('left', 5, report);
    reportJustification('justify', 2, report);
    reportJustification('justifyAll', 1, report);
    reportJustification('radix', 1, report);
    expect(reports).toEqual(['hAlign="justify" (laid out as left)', 'hAlign="justifyAll" (laid out as left)', 'hAlign="radix" (laid out as left)']);
  });

  it('the region schema refuses a negative size and a non-finite number; glyphIssue pads the code point', () => {
    expect(regionSchema.safeParse({ xPt: 0, yPt: 0, widthPt: -1, heightPt: 1 }).success).toBe(false);
    expect(regionSchema.safeParse({ xPt: Number.NaN, yPt: 0, widthPt: 1, heightPt: 1 }).success).toBe(false);
    expect(regionSchema.safeParse({ xPt: 0, yPt: 0, widthPt: 1, heightPt: 1 }).success).toBe(true);
    expect(glyphIssue(0x41)).toBe('glyph.U+0041');
  });
});
