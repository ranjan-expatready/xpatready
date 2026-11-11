import type { FormNode } from '../../model/form/index.js';
import type { IssueSink } from '../box/issues.js';
import type { LayoutBox } from '../box/types.js';
import { layoutBoxGraphics } from '../graphics/index.js';
import type { ImageContext } from '../image/index.js';
import type { RenderItem } from '../render-tree.js';
import { toPlaceholderItem, toTextItem, type BoxText, type TextFailure } from '../text/index.js';
import { fieldItemOf } from './fields.js';

type TextItem = Extract<RenderItem, { kind: 'text' }>;

/** What painting one page needs: the shared sinks and the ceiling. */
export interface PaintContext {
  readonly sink: IssueSink;
  readonly images: ImageContext;
  /** Every `text` item made, in order: the font pass reads their runs. */
  readonly texts: TextItem[];
  readonly maxItemsPerPage: number;
}

/** The items of one page so far, and whether the ceiling stopped it. */
export class PageItems {
  readonly items: RenderItem[] = [];
  #stoppedAt: FormNode | undefined;

  constructor(
    readonly index: number,
    private readonly context: PaintContext,
  ) {}

  get full(): boolean {
    return this.#stoppedAt !== undefined;
  }

  /** Adds the items of one box in order; false (and the page is full) once the ceiling is reached. */
  addAll(box: LayoutBox, items: readonly RenderItem[]): boolean {
    for (const item of items) {
      if (this.items.length >= this.context.maxItemsPerPage) {
        this.#stoppedAt ??= box.node;
        this.context.sink.add(box.node, `page ${this.index + 1} has more than ${this.context.maxItemsPerPage} items: the rest of the page is left out`);
        return false;
      }
      this.items.push(item);
      if (item.kind === 'text') this.context.texts.push(item);
    }
    return true;
  }
}

/**
 * A box whose origin is where the text laid out in `source` (the box as the flow made it) would start if it moved with
 * `caption`: the text of a caption is local to the unsplit box, and a fragment of a split container carries the caption at
 * its own `captionRect`. For a box placed whole this is the box itself.
 */
function captionFrame(box: LayoutBox, source: LayoutBox): LayoutBox | undefined {
  if (box.captionRect === undefined || source.captionRect === undefined) return undefined;
  const dx = box.captionRect.xPt - source.captionRect.xPt;
  const dy = box.captionRect.yPt - source.captionRect.yPt;
  return { ...box, rect: { ...box.rect, xPt: source.rect.xPt + dx, yPt: source.rect.yPt + dy } };
}

/** The text items of one box: value, then caption (placed from the box's own `captionRect`), each failed rich block as a placeholder. */
function textItemsOf(box: LayoutBox, text: BoxText): RenderItem[] {
  const out: RenderItem[] = [];
  const captionAt = captionFrame(box, text.box);
  if (text.value !== undefined) out.push(toTextItem(box, text.value));
  if (text.caption !== undefined && captionAt !== undefined) out.push(toTextItem(captionAt, text.caption));
  const frameOf = (failure: TextFailure): LayoutBox | undefined => (failure.part === 'value' ? box : captionAt);
  for (const failure of text.failures ?? []) {
    const frame = frameOf(failure);
    if (frame !== undefined) out.push(toPlaceholderItem(frame, failure));
  }
  return out;
}

/** The graphics of every drawn box under `roots`, by box (the guarded entry of the graphics layer: a box that cannot be painted is a placeholder). */
function graphicsByBox(roots: readonly LayoutBox[], sink: IssueSink): ReadonlyMap<LayoutBox, readonly RenderItem[]> {
  const out = new Map<LayoutBox, readonly RenderItem[]>();
  for (const root of roots) for (const entry of layoutBoxGraphics(root, sink)) out.set(entry.box, entry.items);
  return out;
}

/**
 * Paints `roots` (boxes in page coordinates) onto the page, parents before children (a container's fill lies under what it
 * holds). For each drawn box, in this order: its graphics, its image, its text, its field overlay. A box that is not
 * drawn, and everything inside it, adds nothing. `textOf` finds the laid-out text of a box. Stops when the page is full.
 */
export function paintBoxes(roots: readonly LayoutBox[], textOf: (box: LayoutBox) => BoxText | undefined, page: PageItems, context: PaintContext): void {
  if (page.full) return;
  const graphics = graphicsByBox(roots, context.sink);
  const pending: LayoutBox[] = [...roots].reverse();
  for (let box = pending.pop(); box !== undefined && !page.full; box = pending.pop()) {
    if (!box.drawn) continue;
    const image = context.images.draw(box);
    const text = textOf(box);
    const stacked: RenderItem[] = [...(graphics.get(box) ?? []), ...(image === undefined ? [] : [image]), ...(text === undefined ? [] : textItemsOf(box, text))];
    if (box.node.className === 'field' && box.placeholder === undefined) stacked.push(fieldItemOf(box, context.sink));
    if (!page.addAll(box, stacked)) return;
    for (let i = box.children.length - 1; i >= 0; i -= 1) {
      const child = box.children[i];
      if (child !== undefined) pending.push(child);
    }
  }
}
