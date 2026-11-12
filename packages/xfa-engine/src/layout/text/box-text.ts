import type { FormNode } from '../../model/form/index.js';
import { safeText } from '../../pdf/safe-text.js';
import { readableInsetsOf } from '../box/insets.js';
import { XfaLayoutError } from '../errors.js';
import type { LayoutBox, Rect } from '../box/types.js';
import type { RenderItem } from '../render-tree.js';
import type { TextContext } from './context.js';
import { layoutText } from './layout.js';
import { layoutRichSource } from './rich/source.js';
import { textStyleOf } from './style.js';
import type { LaidOutText } from './types.js';
import { captionTextOf, insetRect, valueTextOf, widgetTextRect, wrapsField, type TextSource } from './value.js';

export interface BoxText {
  readonly box: LayoutBox;
  /** The value text of a draw or field. Lines are in the local frame of `box` (origin at the top-left of `box.rect`). */
  readonly value?: LaidOutText;
  /** The caption text of a field or exclusion group, in the same frame. */
  readonly caption?: LaidOutText;
  /** The rich text blocks of this box that could not be laid out (malformed markup, a hostile block); each is a placeholder, with an `issues` entry. */
  readonly failures?: readonly TextFailure[];
}

/** A rich text block that failed: where it would have been drawn (local frame of the box) and why. */
export interface TextFailure {
  readonly part: 'value' | 'caption';
  readonly region: Rect;
  readonly reason: string;
}

const localRect = (rect: Rect, box: LayoutBox): Rect => ({ ...rect, xPt: rect.xPt - box.rect.xPt, yPt: rect.yPt - box.rect.yPt });

/** One block laid out: its lines, or the failure that makes it a placeholder; neither when there is nothing to draw. */
export type Laid = { readonly text?: LaidOutText; readonly failure?: TextFailure };

/** Lays out the text of one part (`value` or `caption`) of `owner` in `region`; shared with the size a growable box asks for (W01-T07, `layout/flow`). */
export function layoutSource(part: TextFailure['part'], source: TextSource, owner: FormNode, style: ReturnType<typeof textStyleOf>, region: Rect, wrap: boolean, ctx: TextContext): Laid {
  if (source.kind === 'none') return {};
  if (source.kind === 'rich') {
    const outcome = layoutRichSource(source.markup, owner, style, region, wrap, ctx);
    if (outcome.kind === 'failed') return { failure: { part, region, reason: outcome.reason } };
    return outcome.text.lines.length === 0 ? {} : { text: outcome.text };
  }
  const laid = layoutText({ text: source.text, style, region, wrap }, ctx.depsFor(owner));
  return laid.lines.length === 0 ? {} : { text: laid };
}

/**
 * One part of a box laid out, with the layout's own typed failures (`XfaLayoutError`) contained HERE (once per part): a part that cannot be
 * laid out is reported against `owner` and becomes a `failure` (a placeholder over `region`), and the rest of the form still
 * lays out. Anything else propagates: a bug, or a document-wide failure (`XfaFormError` `LIMIT`) that must stop the layout, as in `guarded` and `buildBox`. A rich block's own failures are contained one level down, in `layoutRichSource`.
 */
function attempt(part: TextFailure['part'], owner: FormNode, region: Rect, ctx: TextContext, lay: () => Laid): Laid {
  try {
    return lay();
  } catch (error) {
    if (!(error instanceof XfaLayoutError)) throw error;
    const reason = `${part} text could not be laid out: ${safeText(error.message, 120)}`;
    ctx.sink.add(owner, reason);
    return { failure: { part, region, reason } };
  }
}

/** The value and caption text of `box` itself (not its children), whatever its presence. */
export function layoutOwnTexts(box: LayoutBox, ctx: TextContext): BoxText {
  const node = box.node;
  const turned = box.rotation !== 0;
  if (turned && (valueTextOf(node).kind !== 'none' || node.childrenOfClass('caption').length > 0)) ctx.sink.add(node, `text in a box rotated ${box.rotation} degrees (laid out unrotated)`);
  const failures: TextFailure[] = [];
  let value: LaidOutText | undefined;
  if (node.className === 'draw' || node.className === 'field') {
    const region = node.className === 'field' ? widgetTextRect(node, box.widgetRect, ctx.sink) : box.contentRect;
    const wrap = region.widthPt > 0 && (node.className !== 'field' || wrapsField(node));
    const local = localRect(region, box);
    const laid = attempt('value', node, local, ctx, () => layoutSource('value', valueTextOf(node), node, textStyleOf(node, ctx.sink), local, wrap, ctx));
    value = laid.text;
    if (laid.failure !== undefined) failures.push(laid.failure);
  }
  let caption: LaidOutText | undefined;
  const captionNode = node.childrenOfClass('caption')[0];
  if (captionNode !== undefined && box.captionRect !== undefined && box.caption?.presence === 'visible') {
    const region = insetRect(box.captionRect, readableInsetsOf(captionNode, ctx.sink, 'caption margin'));
    const local = localRect(region, box);
    const laid = attempt('caption', captionNode, local, ctx, () => layoutSource('caption', captionTextOf(captionNode), captionNode, textStyleOf(captionNode, ctx.sink), local, region.widthPt > 0, ctx));
    caption = laid.text;
    if (laid.failure !== undefined) failures.push(laid.failure);
  }
  return { box, ...(value === undefined ? {} : { value }), ...(caption === undefined ? {} : { caption }), ...(failures.length === 0 ? {} : { failures }) };
}

/**
 * The text of every drawn box under `root` (value text of draws and fields, caption text of fields and exclusion
 * groups), in document order. A box that is not drawn (invisible, hidden, inactive, print-only), a placeholder, and
 * everything inside them is left out. Rich text (exData) is laid out by `rich/`; a block that fails is in `failures`.
 */
export function layoutBoxTexts(root: LayoutBox, ctx: TextContext): BoxText[] {
  const out: BoxText[] = [];
  const visit = (box: LayoutBox): void => {
    if (!box.drawn || box.placeholder !== undefined) return;
    const texts = layoutOwnTexts(box, ctx);
    if (texts.value !== undefined || texts.caption !== undefined || texts.failures !== undefined) out.push(texts);
    box.children.forEach(visit);
  };
  visit(root);
  return out;
}

/** The render tree's `text` item for laid-out text: lines moved from the local frame of `box` to the layout frame of its `rect`. */
export function toTextItem(box: LayoutBox, text: LaidOutText): Extract<RenderItem, { kind: 'text' }> {
  const dx = box.rect.xPt;
  const dy = box.rect.yPt;
  return {
    kind: 'text',
    rect: { ...text.region, xPt: text.region.xPt + dx, yPt: text.region.yPt + dy },
    lines: text.lines.map((line) => ({ xPt: line.xPt + dx, yBaselinePt: line.yBaselinePt + dy, runs: line.runs.map((run) => ({ ...run })) })),
  };
}

/** The render tree's `placeholder` item for a rich block that failed, in the layout frame of `box`. */
export function toPlaceholderItem(box: LayoutBox, failure: TextFailure): Extract<RenderItem, { kind: 'placeholder' }> {
  return { kind: 'placeholder', rect: { ...failure.region, xPt: failure.region.xPt + box.rect.xPt, yPt: failure.region.yPt + box.rect.yPt }, reason: failure.reason };
}
