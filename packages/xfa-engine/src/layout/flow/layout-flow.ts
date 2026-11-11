import { z } from 'zod';
import { FormDom, type FormNode } from '../../model/form/index.js';
import { buildBox, buildChildBoxes, BoxContext, ZERO_RECT, type BoxIssue, type LayoutBox } from '../box/index.js';
import { XfaLayoutError } from '../errors.js';
import { MAX_ISSUES } from '../limits.js';
import type { RenderItem } from '../render-tree.js';
import { createCaptionReserve, layoutBoxTexts, TextContext, toPlaceholderItem, type BoxText } from '../text/index.js';
import { arrangeFlow } from './arrange.js';
import { createContentExtent } from './content-extent.js';

const argumentsSchema = z.strictObject({ dom: z.instanceof(FormDom), text: z.instanceof(TextContext) });

/** The fixed content of one master page, laid out in the frame of the page (no pagination here). */
export interface MasterPageLayout {
  readonly pageArea: FormNode;
  /** The boxes of the page area's draws, fields, subforms and exclusion groups, placed by their own `x` / `y` from the page's top-left corner. */
  readonly boxes: readonly LayoutBox[];
  readonly texts: readonly BoxText[];
}

/** The box context a flowed layout uses: caption reserve, the flow arrangement and the growable extent, over the fonts of `text`. */
export const createFlowContext = (text: TextContext): BoxContext => new BoxContext({ captionReserve: createCaptionReserve(text), flow: arrangeFlow, contentExtent: createContentExtent(text) });

/**
 * The fixed content of the master page `pageArea`, laid out from the form DOM as it stands now (so the values its fields
 * hold, an `xfa:embed` of a hidden field among them, are the ones drawn). `ctx` collects the box layer's issues.
 */
export function layoutMasterPage(pageArea: FormNode, ctx: BoxContext, text: TextContext): MasterPageLayout {
  const boxes = buildChildBoxes(pageArea, ZERO_RECT, 'visible', ctx, 0);
  return { pageArea, boxes, texts: boxes.flatMap((box) => layoutBoxTexts(box, text)) };
}

/** The whole form laid out in one unbounded content area: the input to pagination (W02). */
export interface FlowLayout {
  /** The root subform's box; every subform, exclGroup, field and draw of the form that is not on a master page has a box below it. */
  readonly root: LayoutBox;
  /** The value and caption text of every drawn box of the root tree, in the local frame of its box. */
  readonly texts: readonly BoxText[];
  /** The content of every master page (`pageArea`), each in its own page frame. The flow does not place it; W02-T08 repeats it per page. */
  readonly masterPages: readonly MasterPageLayout[];
  /** The `placeholder` render-tree items of the rich text blocks that could not be laid out, in the layout frame of their tree. */
  readonly failedBlocks: readonly Extract<RenderItem, { kind: 'placeholder' }>[];
  /** What the box layer and the text layer reported, the box layer's first, at most `MAX_ISSUES`. */
  readonly issues: readonly BoxIssue[];
  /** How many issues were not kept for want of room. */
  readonly droppedIssues: number;
}

/**
 * Lays out the whole form of `dom` in one unbounded content area, from the live form DOM (so values and attributes the
 * form's scripts wrote are what is laid out). `position` containers place their children by `x` / `y`; `tb`, `row` and
 * `table` containers flow them; a container or a draw or field with no `w` or `h` grows to its content. Master pages
 * (`pageArea`) are not part of the flow, only laid out on their own (`masterPages`), and nothing is split across pages
 * (W02-T08). A box that cannot be laid out is a
 * placeholder with an `issues` entry; the rest of the form still lays out.
 *
 * `text` supplies the fonts, so the layout is deterministic and Node-testable (PA-3); its issues are included in the
 * result, so a context shared across calls repeats nothing it has already reported.
 */
export function layoutFlow(dom: FormDom, text: TextContext): FlowLayout {
  const parsed = argumentsSchema.safeParse({ dom, text });
  if (!parsed.success) throw new XfaLayoutError('INVALID_ARGUMENT', `layoutFlow: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  const ctx = createFlowContext(text);
  const root = buildBox(dom.root, ZERO_RECT, 'visible', ctx, 0);
  const texts = layoutBoxTexts(root, text);
  const masterPages: MasterPageLayout[] = [];
  dom.walk((node) => {
    if (node.className !== 'pageArea') return;
    masterPages.push(layoutMasterPage(node, ctx, text));
  });
  const failedBlocks = [...texts, ...masterPages.flatMap((page) => page.texts)].flatMap((entry) => (entry.failures ?? []).map((failure) => toPlaceholderItem(entry.box, failure)));
  const all = [...ctx.sink.issues, ...text.sink.issues];
  return {
    root,
    texts,
    masterPages,
    failedBlocks,
    issues: all.slice(0, MAX_ISSUES),
    droppedIssues: ctx.sink.dropped + text.sink.dropped + Math.max(0, all.length - MAX_ISSUES),
  };
}
