import { SIZE_EPSILON_PT } from '../box/limits.js';
import type { LayoutBox, Rect } from '../box/types.js';

const taller = (rect: Rect, deltaPt: number): Rect => ({ ...rect, heightPt: rect.heightPt + deltaPt });

/**
 * `box` made `heightPt` tall (a table cell stretched to the height of its row), the extra room going where XFA puts it: a
 * top caption keeps its strip and the widget takes the rest; a bottom caption moves down with the box's lower edge; a
 * left or right caption strip stretches with the widget. The children of a container do not move (they are placed from
 * its top). A box that overflowed its given height (`flowHeightPt`) loses that mark once it is stretched to at least the height it stood for. Nothing is made smaller, and a box turned a quarter turn is left alone (its height is a width of its own).
 */
export function stretchHeight(box: LayoutBox, heightPt: number): LayoutBox {
  // A cell stretched to at least the height its overflowing content takes up already holds that content's room.
  const { flowHeightPt, ...rest } = box;
  const settled: LayoutBox = flowHeightPt !== undefined && heightPt >= flowHeightPt - SIZE_EPSILON_PT ? rest : box;
  const delta = heightPt - settled.rect.heightPt;
  if (delta <= SIZE_EPSILON_PT || settled.rotation !== 0) return settled;
  const placement = settled.caption?.placement;
  const captionRect = settled.captionRect;
  const stretchedCaption = captionRect === undefined ? undefined : placement === 'top' ? captionRect : placement === 'bottom' ? { ...captionRect, yPt: captionRect.yPt + delta } : taller(captionRect, delta);
  return {
    ...settled,
    rect: taller(settled.rect, delta),
    contentRect: taller(settled.contentRect, delta),
    widgetRect: taller(settled.widgetRect, delta),
    ...(stretchedCaption === undefined ? {} : { captionRect: stretchedCaption }),
  };
}
