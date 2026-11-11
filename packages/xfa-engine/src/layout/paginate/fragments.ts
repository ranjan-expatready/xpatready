import type { Insets, LayoutBox, Rect } from '../box/types.js';

/** The margin insets of `box`: the room between its rectangle and its content region. */
export function insetsOfBox(box: LayoutBox): Insets {
  return {
    topPt: box.contentRect.yPt - box.rect.yPt,
    leftPt: box.contentRect.xPt - box.rect.xPt,
    bottomPt: box.rect.yPt + box.rect.heightPt - (box.contentRect.yPt + box.contentRect.heightPt),
    rightPt: box.rect.xPt + box.rect.widthPt - (box.contentRect.xPt + box.contentRect.widthPt),
  };
}

/** The height of the caption strip when it sits above (`top`) or below (`bottom`) the children; 0 for a left / right strip or none. */
function captionStripPt(box: LayoutBox, placement: 'top' | 'bottom'): number {
  return box.captionRect !== undefined && box.caption?.placement === placement ? box.captionRect.heightPt : 0;
}

/** What the first fragment of a cut container spends before its children: the top margin and a top caption strip. */
export const leadingPt = (box: LayoutBox): number => insetsOfBox(box).topPt + captionStripPt(box, 'top');

/** What the last fragment of a cut container spends after its children: a bottom caption strip and the bottom margin. */
export const trailingPt = (box: LayoutBox): number => captionStripPt(box, 'bottom') + insetsOfBox(box).bottomPt;

/**
 * The part of the split container `src` that lies in one content area, as a box: `rect` is where it sits on the page,
 * `children` what was placed in it. The top margin and a top caption strip belong to the first fragment, the bottom margin
 * and a bottom caption strip to the last, and a left or right strip to the first; the widget region is the content region
 * less the strips the fragment carries. `flowHeightPt` is dropped: a fragment is placed, not flowed.
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `layout.js flushHTML` hands what a container laid out so far to the content
 * area it is leaving and the rest continues in the next one; the box of each piece is as tall as what it holds.
 */
export function fragmentOf(src: LayoutBox, children: readonly LayoutBox[], rect: Rect, first: boolean, last: boolean): LayoutBox {
  const insets = insetsOfBox(src);
  const top = first ? insets.topPt : 0;
  const bottom = last ? insets.bottomPt : 0;
  const contentRect: Rect = {
    xPt: rect.xPt + insets.leftPt,
    yPt: rect.yPt + top,
    widthPt: Math.max(0, rect.widthPt - insets.leftPt - insets.rightPt),
    heightPt: Math.max(0, rect.heightPt - top - bottom),
  };
  const topStrip = first ? captionStripPt(src, 'top') : 0;
  const bottomStrip = last ? captionStripPt(src, 'bottom') : 0;
  const dx = rect.xPt - src.rect.xPt;
  const widgetRect: Rect = {
    xPt: src.widgetRect.xPt + dx,
    yPt: contentRect.yPt + topStrip,
    widthPt: src.widgetRect.widthPt,
    heightPt: Math.max(0, contentRect.heightPt - topStrip - bottomStrip),
  };
  const base: { -readonly [K in keyof LayoutBox]: LayoutBox[K] } = { ...src, rect, contentRect, widgetRect, growableWidth: false, growableHeight: false, children };
  delete base.flowHeightPt;
  delete base.captionRect;
  delete base.caption;
  const { captionRect, caption } = src;
  if (captionRect !== undefined && caption !== undefined) {
    const strip = (yPt: number, heightPt: number): Rect => ({ ...captionRect, xPt: captionRect.xPt + dx, yPt, heightPt });
    const placement = caption.placement;
    let carried: Rect | undefined;
    if (placement === 'top' && first) carried = strip(contentRect.yPt, captionRect.heightPt);
    else if (placement === 'bottom' && last) carried = strip(contentRect.yPt + contentRect.heightPt - captionRect.heightPt, captionRect.heightPt);
    else if ((placement === 'left' || placement === 'right') && first) carried = strip(contentRect.yPt, contentRect.heightPt);
    if (carried !== undefined) {
      base.captionRect = carried;
      base.caption = caption;
    }
  }
  return base;
}
