import { z } from 'zod';
import type { FormNode } from '../../model/form/index.js';
import { safeText } from '../../pdf/safe-text.js';
import { XfaLayoutError } from '../errors.js';
import { enumAttr, lengthAttr, sizeAttr } from './attributes.js';
import type { IssueSink } from './issues.js';
import { CONTAINER_CLASSES } from './unsupported.js';
import { ANCHOR_TYPES, type AnchorType, type NominalExtent, type Rect, type Rotation } from './types.js';

const anchorSchema = z.enum(ANCHOR_TYPES);
const ROTATE_TEXT = /^[+-]?\d{1,4}$/;

/**
 * FD-38 exemption (correctness constant): where on a box each `anchorType` sits, as fractions of its width and height
 * (0 left or top, 0.5 centre or middle, 1 right or bottom). A fact of the XFA format, not a setting.
 */
const ANCHOR_FRACTIONS: Readonly<Record<AnchorType, readonly [number, number]>> = {
  topLeft: [0, 0],
  topCenter: [0.5, 0],
  topRight: [1, 0],
  middleLeft: [0, 0.5],
  middleCenter: [0.5, 0.5],
  middleRight: [1, 0.5],
  bottomLeft: [0, 1],
  bottomCenter: [0.5, 1],
  bottomRight: [1, 1],
};

/** FD-38 exemption (correctness constant): a quarter turn is 90 degrees and a full turn 360; rotation is in whole quarter turns. */
const QUARTER_TURN_DEGREES = 90;
const FULL_TURN_DEGREES = 360;

/** Turns `-0` into `0` so geometry compares and serialises the same however it was reached. */
const clean = (n: number): number => (n === 0 ? 0 : n);

/**
 * The size `node` asks for (XFA nominal extent). `w` / `h` absent mean growable: the number is then the `minW` / `minH`
 * floor (0 when none) and the flag tells the flowed layout (W01-T07) it is to be replaced by the content size. A given
 * dimension is raised to a `minW` / `minH` floor when it is smaller; `maxW` / `maxH` belong to the growth step (W01-T07).
 * A negative `w`, `h`, `minW` or `minH` is reported in `sink` and read as 0.
 *
 * `minH` is not a floor for a container (subform, exclusion group, area): its height is its content (or its given `h`).
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js Subform[$toHTML]` reports the bbox
 * `[x, y, max(content + margin, w), max(content + margin, h)]`, with no `minH` term, to its parent's `addHTML`. The oracle
 * agrees (W02-T08 evidence): both forms' page 1 fits one page only when `Page1.MaritalStatus` (`minH` 58.274 mm, content
 * 26.67 mm) takes its content height; with the floor the Office Use Only box overflows to a sixth page, while the saved
 * `form` packets list five. Fields and draws keep the floor (`Field[$toHTML]` uses `minW` / `minH`).
 */
export function nominalExtent(node: FormNode, sink: IssueSink): NominalExtent {
  const w = sizeAttr(node, 'w', sink);
  const h = sizeAttr(node, 'h', sink);
  const minW = sizeAttr(node, 'minW', sink) ?? 0;
  const minHAttr = sizeAttr(node, 'minH', sink) ?? 0;
  const minH = CONTAINER_CLASSES.has(node.className) ? 0 : minHAttr;
  return { widthPt: Math.max(w ?? 0, minW), heightPt: Math.max(h ?? 0, minH), growableWidth: w === undefined, growableHeight: h === undefined };
}

export function anchorTypeOf(node: FormNode): AnchorType {
  return enumAttr(node, 'anchorType', anchorSchema, 'topLeft');
}

/** `rotate` in whole quarter turns, normalised to 0, 90, 180 or 270; any other angle is `LAYOUT_UNSUPPORTED`. */
export function rotationOf(node: FormNode): Rotation {
  const text = node.attr('rotate')?.trim();
  if (text === undefined || text === '') return 0;
  if (!ROTATE_TEXT.test(text)) throw new XfaLayoutError('LAYOUT_UNSUPPORTED', `rotate: not a whole number of degrees (${safeText(text)})`);
  const degrees = ((Number(text) % FULL_TURN_DEGREES) + FULL_TURN_DEGREES) % FULL_TURN_DEGREES;
  if (degrees % QUARTER_TURN_DEGREES !== 0) throw new XfaLayoutError('LAYOUT_UNSUPPORTED', `rotate: only multiples of 90 degrees are supported (${safeText(text)})`);
  return degrees as Rotation;
}

/** A point offset from the anchor in the box's own unrotated frame, turned counter-clockwise (y down on screen). */
function turn(u: number, v: number, rotation: Rotation): readonly [number, number] {
  switch (rotation) {
    case 90:
      return [v, -u];
    case 180:
      return [-u, -v];
    case 270:
      return [-v, u];
    default:
      return [u, v];
  }
}

/** Where a box landed: its rectangle, how it was turned, and the map for anything inside it (content, caption, widget). */
export interface Placement {
  readonly rect: Rect;
  readonly extent: NominalExtent;
  readonly anchorType: AnchorType;
  readonly rotation: Rotation;
  /** Maps a rectangle given in the box's own unrotated frame (origin at its top-left corner) into the layout frame. */
  readonly toFrame: (local: Rect) => Rect;
}

/**
 * Places `node` in a positioned parent whose content region is `parentContent`: the anchor point of the box (`anchorType`)
 * lands on the parent's content origin plus `(x, y)` (both 0 when absent), and the box is turned counter-clockwise by
 * `rotate` about that point. Coordinates are those of the layout frame, so a nested box is placed with its parent's
 * `contentRect` as `parentContent`. `sink` collects what the extent read had to correct. `extent` replaces the nominal extent of a growable box whose size has been settled.
 */
export function placeInParent(node: FormNode, parentContent: Rect, sink: IssueSink, extent: NominalExtent = nominalExtent(node, sink)): Placement {
  const anchorType = anchorTypeOf(node);
  const rotation = rotationOf(node);
  const anchorX = parentContent.xPt + (lengthAttr(node, 'x') ?? 0);
  const anchorY = parentContent.yPt + (lengthAttr(node, 'y') ?? 0);
  const [fx, fy] = ANCHOR_FRACTIONS[anchorType];
  const offsetX = extent.widthPt * fx;
  const offsetY = extent.heightPt * fy;
  const toFrame = (local: Rect): Rect => {
    const [x1, y1] = turn(local.xPt - offsetX, local.yPt - offsetY, rotation);
    const [x2, y2] = turn(local.xPt + local.widthPt - offsetX, local.yPt + local.heightPt - offsetY, rotation);
    return {
      xPt: clean(anchorX + Math.min(x1, x2)),
      yPt: clean(anchorY + Math.min(y1, y2)),
      widthPt: clean(Math.abs(x2 - x1)),
      heightPt: clean(Math.abs(y2 - y1)),
    };
  };
  return { rect: toFrame({ xPt: 0, yPt: 0, widthPt: extent.widthPt, heightPt: extent.heightPt }), extent, anchorType, rotation, toFrame };
}
