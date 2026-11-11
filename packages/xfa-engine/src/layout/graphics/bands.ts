import { XfaLayoutError } from '../errors.js';
import type { BorderEdge, BorderStyle, EdgeSide, Rect } from '../box/types.js';

/**
 * Where the stroke of each side of a border falls. Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `html_utils.js
 * createWrapper` positions the border element for `border.hand`:
 *   even  - the stroke is centred on the edge line (the element starts half a thickness outside);
 *   left  - the stroke is wholly outside the edge line (the element starts a whole thickness outside);
 *   right - the stroke is wholly inside the edge line.
 * The edge lines are the sides of the reference rectangle (the box less the border's own margin).
 */

/** A side's stroke band: the coordinate range it covers across the side (y for top and bottom, x for left and right). */
export interface Band {
  readonly visible: boolean;
  readonly thicknessPt: number;
  readonly loPt: number;
  readonly hiPt: number;
  readonly centrePt: number;
  /** +1 when outside is toward larger coordinates (bottom, right), -1 otherwise (top, left). */
  readonly outward: 1 | -1;
}

const OUTWARD: Readonly<Record<EdgeSide, 1 | -1>> = { top: -1, right: 1, bottom: 1, left: -1 };

/** The edge line of `side` on `rect`: its y (top, bottom) or x (left, right). */
export function edgeLineOf(rect: Rect, side: EdgeSide): number {
  switch (side) {
    case 'top':
      return rect.yPt;
    case 'bottom':
      return rect.yPt + rect.heightPt;
    case 'left':
      return rect.xPt;
    case 'right':
      return rect.xPt + rect.widthPt;
  }
}

function bandOf(line: number, edge: BorderEdge, outward: 1 | -1, hand: BorderStyle['hand']): Band {
  const t = edge.thicknessPt;
  let loPt: number;
  if (hand === 0) loPt = line - t / 2;
  else {
    // hand -1 (left) puts the stroke outside the line, hand 1 (right) inside it.
    const stroke = hand === -1 ? outward : -outward;
    loPt = stroke === 1 ? line : line - t;
  }
  return { visible: edge.visible && t > 0, thicknessPt: t, loPt, hiPt: loPt + t, centrePt: loPt + t / 2, outward };
}

/** The bands of the four sides of `rect`, `style.edges` being top, right, bottom, left. */
export function bandsOf(rect: Rect, style: BorderStyle): Readonly<Record<EdgeSide, Band>> {
  const [top, right, bottom, left] = style.edges;
  if (top === undefined || right === undefined || bottom === undefined || left === undefined) throw new XfaLayoutError('INVALID_ARGUMENT', 'a border style holds four edges');
  return {
    top: bandOf(edgeLineOf(rect, 'top'), top, OUTWARD.top, style.hand),
    right: bandOf(edgeLineOf(rect, 'right'), right, OUTWARD.right, style.hand),
    bottom: bandOf(edgeLineOf(rect, 'bottom'), bottom, OUTWARD.bottom, style.hand),
    left: bandOf(edgeLineOf(rect, 'left'), left, OUTWARD.left, style.hand),
  };
}
