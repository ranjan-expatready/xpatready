import type { FormNode } from '../../model/form/index.js';
import { EDGE_SIDES, guarded, shapeStyleOf } from '../box/border.js';
import { enumAttr } from '../box/attributes.js';
import type { IssueSink } from '../box/issues.js';
import type { BorderEdge, LayoutBox, Rect } from '../box/types.js';
import type { RenderItem } from '../render-tree.js';
import { z } from 'zod';
import { shapeItems } from './outline.js';
import { toColour } from './stroke.js';

type LineItem = Extract<RenderItem, { kind: 'line' }>;

const slopeSchema = z.enum(['\\', '/']);

/**
 * FD-38 exemption (correctness constant): the edge XFA gives a `line` that writes none (`edge` defaults: visible, solid,
 * 0.5 pt, black; the same values `model/template/implicit.ts` answers for a written edge).
 */
const DEFAULT_EDGE: BorderEdge = { side: 'top', visible: true, thicknessPt: 0.5, colour: [0, 0, 0], stroke: 'solid' };

/** The draw's value element when it is a `line` or a `rectangle`, else undefined. */
function shapeOf(draw: FormNode): FormNode | undefined {
  const content = draw.childrenOfClass('value')[0]?.oneOfChild;
  return content?.className === 'line' || content?.className === 'rectangle' ? content : undefined;
}

/**
 * The stroke a line is drawn with: the broken styles keep their name (the viewer applies the dash pattern), the 3D styles
 * are plain strokes of the edge colour. Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `Line[$toHTML]` strokes an SVG line
 * with the edge colour and width only; this keeps the dash name as well.
 */
const strokeOf = (edge: BorderEdge): LineItem['stroke'] => (edge.stroke === 'embossed' || edge.stroke === 'etched' || edge.stroke === 'lowered' || edge.stroke === 'raised' ? 'solid' : edge.stroke);

/**
 * The `line` of a draw as a line item in `region` (the draw's content rectangle, after rotation).
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js Line[$toHTML]`. A region no wider than the stroke is a vertical
 * line down its middle; one no taller than the stroke is a horizontal line along its middle; otherwise the line is a
 * diagonal of the region, `\` from the top left to the bottom right and `/` from the bottom left to the top right (`\` is
 * the XFA default). A hidden edge draws nothing. Where the line is turned a quarter turn the diagonal is turned with it,
 * so `/` becomes `\` (the region is already the rotated box; the wide/tall tests are made on it, which is the same test
 * pdf.js makes on the unrotated sizes). `hand` is not applied (pdf.js ignores it too): any other than `even` is reported.
 */
function lineItems(box: LayoutBox, line: FormNode, region: Rect, sink: IssueSink): RenderItem[] {
  const edge = shapeStyleOf(line, sink)?.edges[0] ?? DEFAULT_EDGE;
  if (!edge.visible || edge.thicknessPt <= 0) return [];
  if (line.attr('hand') !== undefined && line.attr('hand') !== 'even') sink.add(line, `line hand="${line.attr('hand')}" (drawn centred on the line)`);
  const t = edge.thicknessPt;
  const colour = edge.colour;
  const stroke = strokeOf(edge);
  const make = (x1: number, y1: number, x2: number, y2: number): LineItem => ({ kind: 'line', x1Pt: x1, y1Pt: y1, x2Pt: x2, y2Pt: y2, thicknessPt: t, colour: toColour(colour), stroke });
  const right = region.xPt + region.widthPt;
  const bottom = region.yPt + region.heightPt;
  if (region.widthPt <= t) return region.heightPt > 0 ? [make(region.xPt + region.widthPt / 2, region.yPt, region.xPt + region.widthPt / 2, bottom)] : [];
  if (region.heightPt <= t) return [make(region.xPt, region.yPt + region.heightPt / 2, right, region.yPt + region.heightPt / 2)];
  const declared = guarded(line, sink, 'line slope', () => enumAttr(line, 'slope', slopeSchema, '\\'), '\\');
  const turned = box.rotation === 90 || box.rotation === 270;
  const backslash = (declared === '\\') !== turned;
  return [backslash ? make(region.xPt, region.yPt, right, bottom) : make(region.xPt, bottom, right, region.yPt)];
}

/**
 * The paint of a draw whose value is a `line` or a `rectangle`; nothing for any other draw.
 *
 * A rectangle is the border machinery over its own edges, corners and fill. Origin (PA-4): pdf.js v4.10.38 (Apache-2.0)
 * `Rectangle[$toHTML]` draws an SVG rectangle of the draw's size with the FIRST edge's width and colour on every side, the
 * fill colour when the fill is visible and no fill otherwise, and a corner radius only for a `round` join. This follows
 * the same rules (one edge repeats to all four sides) and also paints a rectangle that writes up to four edges.
 */
export function drawShapeItems(box: LayoutBox, sink: IssueSink): RenderItem[] {
  const shape = shapeOf(box.node);
  if (shape === undefined) return [];
  if (shape.className === 'line') return lineItems(box, shape, box.contentRect, sink);
  const style = shapeStyleOf(shape, sink);
  if (style === undefined) return [];
  // Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `Rectangle[$toHTML]` uses `new Edge({})` when the rectangle writes no edge:
  // the XFA model gives only a border a default edge (implicit.ts), so a rectangle with just a fill gets the default outline.
  const edges = style.edges.length === 4 ? style.edges : EDGE_SIDES.map((side) => ({ ...DEFAULT_EDGE, side }));
  return shapeItems(box.contentRect, { ...style, edges });
}
