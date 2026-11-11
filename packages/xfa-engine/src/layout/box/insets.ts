import type { FormNode } from '../../model/form/index.js';
import { sizeAttr } from './attributes.js';
import { guarded } from './border.js';
import type { IssueSink } from './issues.js';
import type { Insets, NominalExtent, Rect } from './types.js';

/** The `margin` insets of a container, in points. A container with no `margin` has none (the XFA default is 0). A negative inset is reported in `sink` and read as 0. */
export function insetsOf(node: FormNode, sink: IssueSink): Insets {
  const margin = node.childrenOfClass('margin')[0];
  if (margin === undefined) return { topPt: 0, rightPt: 0, bottomPt: 0, leftPt: 0 };
  return {
    topPt: sizeAttr(margin, 'topInset', sink) ?? 0,
    rightPt: sizeAttr(margin, 'rightInset', sink) ?? 0,
    bottomPt: sizeAttr(margin, 'bottomInset', sink) ?? 0,
    leftPt: sizeAttr(margin, 'leftInset', sink) ?? 0,
  };
}

const NO_INSETS: Insets = { topPt: 0, rightPt: 0, bottomPt: 0, leftPt: 0 };

/**
 * As `insetsOf`, for the text layer: a margin the engine cannot read (an unsupported unit, a malformed number) is reported
 * against `node` as `what: <reason>` and read as no margin, so one bad margin costs that box its inset, never the layout of the form.
 */
export const readableInsetsOf = (node: FormNode, sink: IssueSink, what: string): Insets => guarded(node, sink, what, () => insetsOf(node, sink), NO_INSETS);

/** The content region in the box's own unrotated frame (origin at its top-left): the extent less the insets, never below 0. */
export function localContentRect(extent: Pick<NominalExtent, 'widthPt' | 'heightPt'>, insets: Insets): Rect {
  return {
    xPt: insets.leftPt,
    yPt: insets.topPt,
    widthPt: Math.max(0, extent.widthPt - insets.leftPt - insets.rightPt),
    heightPt: Math.max(0, extent.heightPt - insets.topPt - insets.bottomPt),
  };
}
