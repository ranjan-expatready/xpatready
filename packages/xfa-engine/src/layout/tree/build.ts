import { z } from 'zod';
import type { BoxIssue } from '../box/types.js';
import { XfaLayoutError } from '../errors.js';
import type { LoadedFont } from '../font/catalogue.js';
import type { ImageContext } from '../image/index.js';
import { MAX_ITEMS_PER_PAGE } from '../limits.js';
import type { LaidOutForm } from '../paginate/index.js';
import { RENDER_TREE_VERSION, type RenderPage, type RenderTree } from '../render-tree.js';
import { OnceIssueSink } from '../text/index.js';
import { mergeIssues } from './issues.js';
import { PageItems, paintBoxes, type PaintContext } from './page.js';
import { fontResources } from './resources.js';

/** What a render tree is made from: the laid-out form, the document's embedded faces and font issues, and the image context. */
export interface TreeInput {
  readonly laid: LaidOutForm;
  readonly faces: readonly LoadedFont[];
  /** The `font.*` issues of the document's fonts (`XfaPdf.fonts().issues` and the program reader's). */
  readonly fontIssues: readonly string[];
  readonly images: ImageContext;
}

/** The ceiling a page is cut at; a test passes a small one, the runtime the security invariant `MAX_ITEMS_PER_PAGE`. */
export interface TreeLimits {
  readonly maxItemsPerPage: number;
}

export const DEFAULT_TREE_LIMITS: TreeLimits = { maxItemsPerPage: MAX_ITEMS_PER_PAGE };

const limitsSchema = z.strictObject({ maxItemsPerPage: z.number().int().min(1).max(MAX_ITEMS_PER_PAGE) });

/**
 * The render tree of a laid-out form (W02-T12). Per page, in page coordinates and paint order: the master page of that
 * instance first (it is the page underlay), then the content areas, box by box (graphics, image, text, field overlay).
 * Fonts and images are resources of the tree, once; the issues of every layer are merged and capped; a page past the item
 * ceiling is cut with an issue and the rest of the tree stands. One image pass per tree (`ImageContext.startPass`).
 */
export function buildRenderTree(input: TreeInput, limits: TreeLimits = DEFAULT_TREE_LIMITS): RenderTree {
  const checked = limitsSchema.safeParse(limits);
  if (!checked.success) throw new XfaLayoutError('INVALID_ARGUMENT', `buildRenderTree: ${checked.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  const { laid, faces, fontIssues, images } = input;
  images.startPass();
  const sink = new OnceIssueSink();
  const context: PaintContext = { sink, images, texts: [], maxItemsPerPage: checked.data.maxItemsPerPage };
  const pages = laid.pages.map((page): RenderPage => {
    const items = new PageItems(page.index, context);
    const master = page.master;
    if (master !== undefined) {
      const texts = new Map(master.texts.map((entry) => [entry.box, entry]));
      paintBoxes(master.boxes, (box) => texts.get(box), items, context);
    }
    for (const area of page.contentAreas) paintBoxes(area.boxes, (box) => laid.texts.get(box.node), items, context);
    return { index: page.index, widthPt: page.widthPt, heightPt: page.heightPt, items: items.items };
  });
  const { fonts, notes } = fontResources(faces, context.texts);
  const treeNotes: BoxIssue[] = [...notes];
  const issues = mergeIssues(
    [treeNotes, sink.issues, laid.issues, images.issues, fontIssues.map((feature): BoxIssue => ({ som: '', feature }))],
    laid.droppedIssues + sink.dropped + images.dropped,
  );
  return { version: RENDER_TREE_VERSION, pages, resources: { fonts, images: [...images.resources] }, issues };
}
