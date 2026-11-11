import type { FormNode } from '../../model/form/index.js';
import type { BoxIssue, LayoutBox, Rect } from '../box/types.js';
import type { MasterPageLayout } from '../flow/index.js';
import type { BoxText } from '../text/index.js';

/** One content area of a page, and the flowed boxes placed in it. */
export interface ContentAreaLayout {
  /** The `contentArea` of the page area; undefined for the single area of a form that has no page set. */
  readonly node: FormNode | undefined;
  /** The area on the page, in points from the page's top-left corner. */
  readonly rect: Rect;
  /**
   * The flowed content placed in this area, in document order, in page coordinates. A container that was split across areas
   * appears once per area as a fragment (`node` repeats, `rect` covers the part on this page); a container placed whole
   * carries its subtree. Hidden boxes take no room and are left out; an invisible box is kept (`drawn` is false).
   */
  readonly boxes: readonly LayoutBox[];
}

/** One page of the paginated form. */
export interface PageLayout {
  /** 0-based position of the page in the form. */
  readonly index: number;
  /** The master page (`pageArea`) this page is an instance of; undefined for a form with no page set. */
  readonly pageArea: FormNode | undefined;
  readonly widthPt: number;
  readonly heightPt: number;
  readonly contentAreas: readonly ContentAreaLayout[];
  /**
   * The fixed content of the master page, in the frame of the page. `paginate` gives one layout per page area, shared by all
   * of its instances; the runtime (`LaidOutForm`) replaces it with the layout of THIS instance, laid out after the instance's
   * own `ready:$layout` scripts ran (page numbers and the values a master page embeds are per instance).
   */
  readonly master: MasterPageLayout | undefined;
}

/** The whole form cut into pages (W02-T08): the input to the layout / script bridge (T09) and the render tree (T12). */
export interface PagedLayout {
  readonly pages: readonly PageLayout[];
  /**
   * The value and caption text of every drawn box, flowed or on a master page, by node. Lines are in the local frame of the box
   * (move them with the box's page rectangle). A master box has one entry here, whatever the number of its page instances:
   * the text of a page instance is in `pages[i].master.texts` (the runtime's `LaidOutForm` leaves master boxes out of this map).
   */
  readonly texts: ReadonlyMap<FormNode, BoxText>;
  /** True when pagination stopped early (page ceiling, empty pages in a row, page set used up): content after the cut is not laid out, and `issues` says why. */
  readonly truncated: boolean;
  /** What pagination, then the flow and the text layer, reported (pagination first, so a stop reason is never cut), at most `MAX_ISSUES`. */
  readonly issues: readonly BoxIssue[];
  readonly droppedIssues: number;
}

/** What the form's own scripts left in a master page's fields on one page instance: value by field (null when empty). */
export type MasterValues = ReadonlyMap<FormNode, string | number | null>;

/**
 * The form laid out as the runtime keeps it (W02-T09): paginated, with the `ready:$layout` scripts run (the body ones once
 * per pass, the master-page ones once per page instance) and each page's master page laid out after its own scripts.
 */
export interface LaidOutForm extends PagedLayout {
  /** Per page, in the order of `pages`: the value of every field of the page's master page, as left by that instance's scripts. Empty for a form with no page set. */
  readonly masterValues: readonly MasterValues[];
  /** The form DOM revision (`FormDom.revision`) this layout is current for. */
  readonly revision: number;
  /** Layout passes (paginate, then the `ready:$layout` scripts) the settle that produced this layout made; 1 when the scripts changed nothing the layout reads. */
  readonly passes: number;
  /** False when the pass ceiling stopped the settle with the form still changing; `issues` then says so and this is the layout of the last pass. */
  readonly settled: boolean;
}
