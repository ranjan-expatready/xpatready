import { describe, expect, it } from 'vitest';
import { markItems, type MarkKind } from '../marks.js';
import { expectLine, expectValid, rectOf } from './helpers.js';

/** A 10 pt check box at (100, 200): the mark region is the box less 20% on each side, (102, 202) to (108, 208). */
const BOX = rectOf(100, 200, 10, 10);
const BLACK = [0, 0, 0] as const;

describe('markItems', () => {
  it('check is a tick of two strokes meeting at the low point, 1.2 pt thick, the joint squared off', () => {
    const items = markItems('check', BOX, BLACK);
    expect(items).toHaveLength(2);
    // Region 6 x 6 at (102, 202); tick points (0.08, 0.55), (0.38, 0.9), (0.92, 0.1).
    const a: [number, number] = [102.48, 205.3];
    const b: [number, number] = [104.28, 207.4];
    const c: [number, number] = [107.52, 202.6];
    const half = 0.6;
    const first = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const second = Math.hypot(c[0] - b[0], c[1] - b[1]);
    expectLine(items[0], a[0], a[1], b[0] + ((b[0] - a[0]) / first) * half, b[1] + ((b[1] - a[1]) / first) * half, 1.2);
    expectLine(items[1], b[0] - ((c[0] - b[0]) / second) * half, b[1] - ((c[1] - b[1]) / second) * half, c[0], c[1], 1.2);
    expectValid(items);
  });

  it('cross is the two diagonals of the mark region', () => {
    const [down, up] = markItems('cross', BOX, BLACK);
    expectLine(down, 102, 202, 108, 208, 1.2);
    expectLine(up, 102, 208, 108, 202, 1.2);
  });

  it('square is a filled box of half the side, centred', () => {
    expect(markItems('square', BOX, [1, 2, 3])).toEqual([{ kind: 'box', rect: { xPt: 102.5, yPt: 202.5, widthPt: 5, heightPt: 5 }, fill: [1, 2, 3] }]);
  });

  it('circle is that box with four round corners of half its side', () => {
    const [circle] = markItems('circle', BOX, BLACK);
    expect(circle?.kind === 'box' ? circle.corners?.map((c) => [c.radiusPt, c.join]) : undefined).toEqual([[2.5, 'round'], [2.5, 'round'], [2.5, 'round'], [2.5, 'round']]);
    if (circle === undefined) throw new Error('the circle mark is one item');
    expectValid([circle]);
  });

  it('diamond is a closed outline of four strokes through the midpoints of the mark region', () => {
    const items = markItems('diamond', BOX, BLACK);
    expect(items).toHaveLength(4);
    // The first stroke runs from the top midpoint (105, 202) to the right midpoint (108, 205), pushed out half a thickness at both ends.
    const first = items[0];
    expect(first?.kind === 'line' ? Math.hypot(first.x2Pt - first.x1Pt, first.y2Pt - first.y1Pt) : 0).toBeCloseTo(Math.hypot(3, 3) + 1.2, 3);
    expectValid(items);
  });

  it('star is a closed outline of ten strokes', () => {
    const items = markItems('star', BOX, BLACK);
    expect(items).toHaveLength(10);
    expectValid(items);
  });

  it('the mark follows the smaller side of a box that is not square, and the colour is the one given', () => {
    const items = markItems('cross', rectOf(0, 0, 20, 10), [9, 8, 7]);
    expectLine(items[0], 2, 2, 8, 8, 1.2);
    expect(items[0]?.kind === 'line' ? items[0].colour : undefined).toEqual([9, 8, 7]);
  });

  it('every mark kind of the render tree produces items that validate', () => {
    for (const kind of ['check', 'circle', 'cross', 'diamond', 'square', 'star'] satisfies MarkKind[]) {
      const items = markItems(kind, BOX, BLACK);
      expect(items.length, kind).toBeGreaterThan(0);
      expectValid(items);
    }
  });
});
