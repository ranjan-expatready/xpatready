import type { LayoutBox, Rect } from './types.js';

const shifted = (rect: Rect, dx: number, dy: number): Rect => ({ ...rect, xPt: rect.xPt + dx, yPt: rect.yPt + dy });

/**
 * The box and everything inside it moved by (dx, dy) points. A subtree is laid out in the frame of its parent's content
 * region; when the parent's own position is settled later (it grew to its children, or the flow placed it), the
 * subtree moves rigidly with it.
 */
export function translateBox(box: LayoutBox, dx: number, dy: number): LayoutBox {
  if (dx === 0 && dy === 0) return box;
  return {
    ...box,
    rect: shifted(box.rect, dx, dy),
    contentRect: shifted(box.contentRect, dx, dy),
    widgetRect: shifted(box.widgetRect, dx, dy),
    ...(box.captionRect === undefined ? {} : { captionRect: shifted(box.captionRect, dx, dy) }),
    children: box.children.map((child) => translateBox(child, dx, dy)),
  };
}
