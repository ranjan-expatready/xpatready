import { expect } from 'vitest';
import { CORNER_SIDES, EDGE_SIDES } from '../../box/border.js';
import type { BorderCorner, BorderEdge, BorderStyle, CornerSide, EdgeSide, Rect } from '../../box/types.js';
import { itemSchema, type RenderItem } from '../../render-tree.js';

export const edgeOf = (side: EdgeSide, over: Partial<BorderEdge> = {}): BorderEdge => ({ side, visible: true, thicknessPt: 2, colour: [0, 0, 0], stroke: 'solid', ...over });
export const cornerOf = (corner: CornerSide, over: Partial<BorderCorner> = {}): BorderCorner => ({ corner, visible: true, radiusPt: 0, inverted: false, join: 'square', thicknessPt: 0.5, colour: [0, 0, 0], stroke: 'solid', ...over });

/** A border style with four identical edges and four square corners; `edges` and `corners` replace single entries by index. */
export function styleOf(over: Partial<BorderStyle> = {}, edges: Readonly<Record<number, Partial<BorderEdge>>> = {}, corners: Readonly<Record<number, Partial<BorderCorner>>> = {}, all: Partial<BorderEdge> = {}): BorderStyle {
  return {
    edges: EDGE_SIDES.map((side, i) => edgeOf(side, { ...all, ...edges[i] })),
    corners: CORNER_SIDES.map((corner, i) => cornerOf(corner, corners[i])),
    hand: 0,
    ...over,
  };
}

export const rectOf = (xPt: number, yPt: number, widthPt: number, heightPt: number): Rect => ({ xPt, yPt, widthPt, heightPt });

/** Every item is a valid render-tree item (the schema is strict). */
export function expectValid(items: readonly RenderItem[]): void {
  for (const item of items) expect(itemSchema.safeParse(item).success, JSON.stringify(item)).toBe(true);
}

type Line = Extract<RenderItem, { kind: 'line' }>;

export function linesOf(items: readonly RenderItem[]): Line[] {
  return items.filter((item): item is Line => item.kind === 'line');
}

/** Asserts a line item's coordinates and thickness to 0.001 pt. */
export function expectLine(item: RenderItem | undefined, x1: number, y1: number, x2: number, y2: number, thickness: number): void {
  expect(item?.kind).toBe('line');
  const line = item as Line;
  expect(line.x1Pt).toBeCloseTo(x1, 3);
  expect(line.y1Pt).toBeCloseTo(y1, 3);
  expect(line.x2Pt).toBeCloseTo(x2, 3);
  expect(line.y2Pt).toBeCloseTo(y2, 3);
  expect(line.thicknessPt).toBeCloseTo(thickness, 3);
}
