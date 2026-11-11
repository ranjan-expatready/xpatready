import { CORNER_SIDES } from '../box/border.js';
import type { Rect, RgbColour } from '../box/types.js';
import type { RenderItem } from '../render-tree.js';
import { toColour } from './stroke.js';

type LineItem = Extract<RenderItem, { kind: 'line' }>;
type BoxItem = Extract<RenderItem, { kind: 'box' }>;
export type MarkKind = NonNullable<Extract<RenderItem, { kind: 'field' }>['mark']>;

/*
 * The render tree holds no path or font glyph (`Adobe Pi Std`, the face Acrobat draws marks with, is not embedded in the
 * corpus forms, OVERVIEW evidence), so a mark is built from line and box items. The shapes are the engine's own and are
 * UNCONFIRMED against Acrobat except for the `check` the corpus uses; W02-T13 checks it side by side.
 */

/** FD-38 exemption (correctness constant): the margin between the check box and its mark, a fraction of the box side; a drawing proportion of the engine's mark shapes, not a setting. */
const MARK_INSET = 0.2;
/** FD-38 exemption (correctness constant): the stroke thickness of a mark, a fraction of the box side; a drawing proportion, not a setting. */
const MARK_STROKE = 0.12;
/** FD-38 exemption (correctness constant): the side of the filled `square` and `circle` marks, a fraction of the box side; a drawing proportion, not a setting. */
const SOLID_MARK_SIDE = 0.5;
/** FD-38 exemption (correctness constant): the three points of the check tick in the unit square of the mark region (x right, y down); a drawing proportion, not a setting. */
const TICK: readonly (readonly [number, number])[] = [[0.08, 0.55], [0.38, 0.9], [0.92, 0.1]];
/** FD-38 exemption (correctness constant): the number of points of the star mark; a fact of the shape, not a setting. */
const STAR_POINTS = 5;
/** FD-38 exemption (correctness constant): the inner radius of the star mark as a fraction of its outer radius; a drawing proportion, not a setting. */
const STAR_INNER_RATIO = 0.4;

function segment(a: readonly [number, number], b: readonly [number, number], thicknessPt: number, colour: RgbColour): LineItem {
  return { kind: 'line', x1Pt: a[0], y1Pt: a[1], x2Pt: b[0], y2Pt: b[1], thicknessPt, colour: toColour(colour), stroke: 'solid' };
}

/** Strokes the closed or open polyline through `points`; the ends that meet at a vertex are pushed out by half a thickness so the joint has no notch. */
function polyline(points: readonly (readonly [number, number])[], closed: boolean, thicknessPt: number, colour: RgbColour): LineItem[] {
  const count = closed ? points.length : points.length - 1;
  const out: LineItem[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (a === undefined || b === undefined) continue;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length === 0) continue;
    const ux = ((b[0] - a[0]) / length) * (thicknessPt / 2);
    const uy = ((b[1] - a[1]) / length) * (thicknessPt / 2);
    const startJoined = closed || i > 0;
    const endJoined = closed || i < count - 1;
    out.push(segment(startJoined ? [a[0] - ux, a[1] - uy] : a, endJoined ? [b[0] + ux, b[1] + uy] : b, thicknessPt, colour));
  }
  return out;
}

const place = (region: Rect, unit: readonly [number, number]): [number, number] => [region.xPt + unit[0] * region.widthPt, region.yPt + unit[1] * region.heightPt];

function starPoints(): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < STAR_POINTS * 2; i += 1) {
    const radius = i % 2 === 0 ? 0.5 : 0.5 * STAR_INNER_RATIO;
    const angle = (Math.PI * i) / STAR_POINTS;
    points.push([0.5 + radius * Math.sin(angle), 0.5 - radius * Math.cos(angle)]);
  }
  return points;
}

/**
 * The mark of a checked check box drawn inside `box` (the check box square). `check` and `cross` are strokes; `circle` and
 * `square` are filled boxes (the circle a box whose four corners are round with half its side); `diamond` and `star` are
 * OUTLINES, not filled shapes, because the render tree has no polygon fill.
 */
export function markItems(kind: MarkKind, box: Rect, colour: RgbColour): RenderItem[] {
  const side = Math.min(box.widthPt, box.heightPt);
  const region: Rect = { xPt: box.xPt + side * MARK_INSET, yPt: box.yPt + side * MARK_INSET, widthPt: side * (1 - 2 * MARK_INSET), heightPt: side * (1 - 2 * MARK_INSET) };
  const thickness = side * MARK_STROKE;
  switch (kind) {
    case 'check':
      return polyline(TICK.map((p) => place(region, p)), false, thickness, colour);
    case 'cross':
      return [segment(place(region, [0, 0]), place(region, [1, 1]), thickness, colour), segment(place(region, [0, 1]), place(region, [1, 0]), thickness, colour)];
    case 'diamond':
      return polyline([[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]].map((p) => place(region, [p[0] ?? 0, p[1] ?? 0])), true, thickness, colour);
    case 'star':
      return polyline(starPoints().map((p) => place(region, p)), true, thickness / 2, colour);
    case 'square':
    case 'circle': {
      const inner = side * SOLID_MARK_SIDE;
      const rect: Rect = { xPt: box.xPt + (box.widthPt - inner) / 2, yPt: box.yPt + (box.heightPt - inner) / 2, widthPt: inner, heightPt: inner };
      const solid: BoxItem = { kind: 'box', rect, fill: toColour(colour) };
      if (kind === 'square') return [solid];
      return [{ ...solid, corners: CORNER_SIDES.map((corner) => ({ corner, radiusPt: inner / 2, inverted: false, join: 'round' as const })) }];
    }
  }
}
