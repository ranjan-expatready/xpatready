import { widgetOf } from '../../model/form/value.js';
import { safeText } from '../../pdf/safe-text.js';
import { XfaLayoutError } from '../errors.js';
import type { IssueSink } from '../box/issues.js';
import type { LayoutBox } from '../box/types.js';
import type { RenderItem } from '../render-tree.js';
import { containerBorderItems, widgetBorderItems } from './borders.js';
import { checkButtonItems } from './check-button.js';
import { drawShapeItems } from './draws.js';

/** The graphics of one box: the render-tree items that paint it (not its children, not its text). */
export interface BoxGraphics {
  readonly box: LayoutBox;
  readonly items: readonly RenderItem[];
}

/** The `reason` of the placeholder a visible barcode field is drawn as (PA-7: PDF417 drawing is Plan B). */
export const BARCODE_PLACEHOLDER_REASON = 'barcode';

/**
 * The paint of `box` itself, in the layout frame of its tree, in paint order:
 * - a placeholder box (a feature the engine does not model) is one `placeholder` item over its rectangle;
 * - otherwise the container's own border (fill, then strokes) around the whole box, then
 * - for a field, its widget: a barcode is a `placeholder` with reason `barcode`; a check button is its box, border and mark;
 *   any other widget is its border around the widget region (caption excluded);
 * - for a draw, a `line` or `rectangle` value.
 * A box that is not drawn (invisible, hidden, inactive, print-only) paints nothing.
 * May throw `XfaLayoutError` for one box; callers use `layoutBoxGraphics`, which turns that into a placeholder.
 */
export function graphicsOfBox(box: LayoutBox, sink: IssueSink): RenderItem[] {
  if (!box.drawn) return [];
  if (box.placeholder !== undefined) return [{ kind: 'placeholder', rect: { ...box.rect }, reason: box.placeholder }];
  const items = containerBorderItems(box, sink);
  if (box.node.className === 'draw') items.push(...drawShapeItems(box, sink));
  if (box.node.className === 'field') {
    const widget = widgetOf(box.node);
    if (widget === 'checkButton') items.push(...checkButtonItems(box, sink));
    else {
      items.push(...widgetBorderItems(box, box.widgetRect, sink));
      if (widget === 'barcode') items.push({ kind: 'placeholder', rect: { ...box.widgetRect }, reason: BARCODE_PLACEHOLDER_REASON });
    }
  }
  return items;
}

/**
 * The graphics of every drawn box under `root`, in document order (parents before children, so a container's fill lies
 * under its children). A box that is not drawn, and everything inside it, is left out. Entries that paint nothing are
 * left out. The text of the same boxes comes from `layoutBoxTexts` in the same order; a caller that interleaves the two
 * puts a box's graphics before its text.
 */
export function layoutBoxGraphics(root: LayoutBox, sink: IssueSink): BoxGraphics[] {
  const out: BoxGraphics[] = [];
  const visit = (box: LayoutBox): void => {
    if (!box.drawn) return;
    const items = attempt(box, sink);
    if (items.length > 0) out.push({ box, items });
    box.children.forEach(visit);
  };
  visit(root);
  return out;
}

/**
 * The graphics of one box with the layout's own typed failures (`XfaLayoutError`) contained HERE, once per box (as
 * `layoutBoxTexts` does for text): a box whose paint cannot be worked out is reported against its node and becomes a
 * `placeholder` over its rectangle, and the rest of the form still draws. Anything else propagates: a bug.
 */
function attempt(box: LayoutBox, sink: IssueSink): RenderItem[] {
  try {
    return graphicsOfBox(box, sink);
  } catch (error) {
    if (!(error instanceof XfaLayoutError)) throw error;
    const reason = `graphics could not be drawn: ${safeText(error.message, 120)}`;
    sink.add(box.node, reason);
    return [{ kind: 'placeholder', rect: { ...box.rect }, reason }];
  }
}
