import { EDGE_SIDES } from '../box/border.js';
import type { BorderCorner, BorderEdge, BorderStyle, EdgeSide, Rect, RgbColour } from '../box/types.js';
import type { RenderItem } from '../render-tree.js';
import { bandsOf, edgeLineOf, type Band } from './bands.js';
import { strokeParts, toColour } from './stroke.js';

type BoxItem = Extract<RenderItem, { kind: 'box' }>;
type LineItem = Extract<RenderItem, { kind: 'line' }>;
type CornerItem = NonNullable<BoxItem['corners']>[number];

/** The sides that meet a side at its two ends, in the same (start, end) order. */
const NEIGHBOURS: Readonly<Record<EdgeSide, readonly [EdgeSide, EdgeSide]>> = {
  top: ['left', 'right'],
  bottom: ['left', 'right'],
  left: ['top', 'bottom'],
  right: ['top', 'bottom'],
};

/**
 * The radius a corner is drawn with. Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `Corner[$toStyle]`: the radius counts
 * only for `join="round"`; a `square` join is a square corner whatever the radius says (both real forms write a 5.08 mm
 * radius with `join="square"` on their rectangles, so those are square).
 */
export const effectiveRadiusPt = (corner: BorderCorner): number => (corner.join === 'round' ? corner.radiusPt : 0);

function lineItem(horizontal: boolean, across: number, from: number, to: number, thicknessPt: number, colour: RgbColour, stroke: LineItem['stroke']): LineItem {
  return {
    kind: 'line',
    x1Pt: horizontal ? from : across,
    y1Pt: horizontal ? across : from,
    x2Pt: horizontal ? to : across,
    y2Pt: horizontal ? across : to,
    thicknessPt,
    colour: toColour(colour),
    stroke,
  };
}

/**
 * Where a side's strokes run along the side. A side that meets a visible neighbour runs to the far edge of the
 * neighbour's band, so the two strokes join with a square corner; the horizontal sides (top, bottom) claim the corner
 * squares and the vertical sides (left, right) start where the horizontal band ends, so no corner is painted twice. A
 * side that meets nothing runs to the edge line of the reference rectangle. Origin (PA-4): pdf.js v4.10.38 (Apache-2.0)
 * `Border[$toStyle]` takes the border style from the edges alone, so a corner's `presence` does not break a join here
 * either (it only counts for a round corner, see `effectiveRadiusPt`).
 */
function spanOf(side: EdgeSide, rect: Rect, bands: Readonly<Record<EdgeSide, Band>>): readonly [number, number] {
  const horizontal = side === 'top' || side === 'bottom';
  const ends = NEIGHBOURS[side].map((neighbour, i) => {
    const band = bands[neighbour];
    const atStart = i === 0;
    if (horizontal) {
      // Claim the whole neighbouring band: its outer coordinate at this end.
      if (band.visible) return atStart ? band.loPt : band.hiPt;
      return atStart ? edgeLineOf(rect, 'left') : edgeLineOf(rect, 'right');
    }
    // A vertical side stops at the inner coordinate of a visible horizontal band.
    if (band.visible) return atStart ? band.hiPt : band.loPt;
    return atStart ? edgeLineOf(rect, 'top') : edgeLineOf(rect, 'bottom');
  });
  return [ends[0] ?? 0, ends[1] ?? 0];
}

/** The line items of one side: one per part of its stroke, outermost first. */
function sideItems(side: EdgeSide, edge: BorderEdge | undefined, band: Band, span: readonly [number, number]): LineItem[] {
  if (edge === undefined || !band.visible) return [];
  const horizontal = side === 'top' || side === 'bottom';
  const outer = band.outward === 1 ? band.hiPt : band.loPt;
  let used = 0;
  return strokeParts(edge.stroke, side, edge.colour).map((part) => {
    const t = band.thicknessPt * part.share;
    const centre = outer - band.outward * (used + t / 2);
    used += t;
    return lineItem(horizontal, centre, span[0], span[1], t, part.colour, part.stroke);
  });
}

/** The render tree's corner descriptions: the effective radius, with the join and the inversion as written. */
function cornerItems(style: BorderStyle): CornerItem[] {
  return style.corners.map((corner) => ({ corner: corner.corner, radiusPt: effectiveRadiusPt(corner), inverted: corner.inverted, join: corner.join }));
}

export interface OutlineOptions {
  /** When set, all four corners are round with this radius, whatever the corners say. */
  readonly roundRadiusPt?: number;
}

function withRadius(style: BorderStyle, radiusPt: number | undefined): BorderStyle {
  if (radiusPt === undefined) return style;
  return { ...style, corners: style.corners.map((corner) => ({ ...corner, visible: true, join: 'round' as const, radiusPt })) };
}

/**
 * The paint of one border or shape on the reference rectangle `rect`, as render-tree items: the fill, then the strokes.
 *
 * A border whose corners are all square is a `box` item for the fill (if any) and one `line` item per stroke band of each
 * visible side, at exact coordinates (centre line of the band, see `bands.ts`). A border with a rounded corner
 * (`join="round"` and a radius above 0) cannot be said in straight segments, so it is ONE `box` item holding the fill, the
 * visible edges and the four corners; its `rect` is then the centre line of the strokes, the way an SVG `rect` strokes.
 * Edges of zero thickness and hidden edges are left out.
 */
export function shapeItems(rect: Rect, source: BorderStyle, options: OutlineOptions = {}): RenderItem[] {
  const style = withRadius(source, options.roundRadiusPt);
  const bands = bandsOf(rect, style);
  const curved = style.corners.some((corner) => effectiveRadiusPt(corner) > 0);
  if (curved) {
    const box = curvedBox(rect, style, bands);
    return box.fill === undefined && box.edges === undefined ? [] : [box];
  }
  const items: RenderItem[] = style.fill === undefined ? [] : [{ kind: 'box', rect: { ...rect }, fill: toColour(style.fill) }];
  EDGE_SIDES.forEach((side, i) => items.push(...sideItems(side, style.edges[i], bands[side], spanOf(side, rect, bands))));
  return items;
}

function curvedBox(rect: Rect, style: BorderStyle, bands: Readonly<Record<EdgeSide, Band>>): BoxItem {
  const edges = EDGE_SIDES.flatMap((side, i) => {
    const edge = style.edges[i];
    const band = bands[side];
    return edge === undefined || !band.visible ? [] : [{ side, thicknessPt: band.thicknessPt, colour: toColour(edge.colour), stroke: edge.stroke }];
  });
  const left = bands.left.centrePt;
  const top = bands.top.centrePt;
  return {
    kind: 'box',
    rect: { xPt: left, yPt: top, widthPt: Math.max(0, bands.right.centrePt - left), heightPt: Math.max(0, bands.bottom.centrePt - top) },
    ...(style.fill === undefined ? {} : { fill: toColour(style.fill) }),
    ...(edges.length === 0 ? {} : { edges }),
    corners: cornerItems(style),
  };
}
