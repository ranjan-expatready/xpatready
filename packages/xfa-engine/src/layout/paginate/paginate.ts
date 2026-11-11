import { z } from 'zod';
import { FormDom, type FormNode } from '../../model/form/index.js';
import { enumAttr } from '../box/attributes.js';
import { IssueSink } from '../box/issues.js';
import { SIZE_EPSILON_PT } from '../box/limits.js';
import { translateBox } from '../box/translate.js';
import type { LayoutBox, Rect } from '../box/types.js';
import { XfaLayoutError } from '../errors.js';
import type { FlowLayout } from '../flow/index.js';
import { MAX_ISSUES, MAX_PAGES } from '../limits.js';
import type { BoxText } from '../text/index.js';
import { breakOf, decideBreak, type BreakDecision, type BreakRequest, type BreakSide, type BreakState } from './breaks.js';
import { fragmentOf, insetsOfBox, leadingPt, trailingPt } from './fragments.js';
import { FIT_TOLERANCE_PT, MAX_EMPTY_PAGES } from './limits.js';
import { readPageModel, TargetIndex, type PageAreaModel, type PageModel } from './page-set.js';
import { PageSequence } from './sequence.js';
import type { ContentAreaLayout, PagedLayout, PageLayout } from './types.js';

const argumentsSchema = z.strictObject({
  flow: z.custom<FlowLayout>((value) => typeof value === 'object' && value !== null && 'root' in value && 'masterPages' in value && 'texts' in value, 'a FlowLayout'),
  dom: z.instanceof(FormDom),
});

/** Ends pagination early with a reason; caught in `paginate`, never leaves it. */
class StopPagination extends Error {}

interface AreaBucket {
  readonly node: FormNode | undefined;
  readonly rect: Rect;
  readonly boxes: LayoutBox[];
  placed: number;
}

interface PageBuild {
  readonly model: PageAreaModel | undefined;
  readonly widthPt: number;
  readonly heightPt: number;
  readonly areas: AreaBucket[];
  placed: number;
}

/** A container being split: the box it came from and what has been placed in it in the current content area. */
interface OpenFragment {
  readonly src: LayoutBox;
  /** The root of the flow: nothing of it is emitted, its children go straight into the content area. */
  readonly virtual: boolean;
  readonly children: LayoutBox[];
  readonly startCursor: number;
  /** True for the first fragment of the container: it carries the top margin (and the caption). */
  readonly first: boolean;
}

const NONE: BreakDecision = { kind: 'none' };
const flowHeight = (box: LayoutBox): number => box.flowHeightPt ?? box.rect.heightPt;
const keepSchema = z.enum(['none', 'contentArea', 'pageArea']);
type KeepValue = z.infer<typeof keepSchema>;

/** The pagination of one flowed form. See `paginate`. */
class Paginator {
  readonly #flow: FlowLayout;
  readonly #dom: FormDom;
  readonly #sink = new IssueSink();
  readonly #model: PageModel | undefined;
  readonly #targets: TargetIndex | undefined;
  readonly #sequence: PageSequence | undefined;
  readonly #originX: number;
  readonly #pages: PageBuild[] = [];
  readonly #emitted = new Set<LayoutBox>();
  readonly #consumed = new Map<LayoutBox, number>();
  readonly #doneBefore = new Set<FormNode>();
  readonly #doneAfter = new Set<FormNode>();
  readonly #requests = new Map<FormNode, { before?: BreakRequest | undefined; after?: BreakRequest | undefined }>();
  #lastDropped: PageBuild | undefined;
  #pending: BreakDecision[] = [];
  #stack: OpenFragment[] = [];
  #areaIndex = 0;
  #cursor = 0;
  #emptyRun = 0;
  #truncated = false;

  constructor(flow: FlowLayout, dom: FormDom) {
    this.#flow = flow;
    this.#dom = dom;
    this.#model = readPageModel(dom.root, this.#sink);
    this.#targets = this.#model === undefined ? undefined : new TargetIndex(this.#model);
    this.#sequence = this.#model === undefined ? undefined : new PageSequence(this.#model);
    this.#originX = flow.root.contentRect.xPt;
  }

  run(): PagedLayout {
    const root = this.#flow.root;
    const first = this.#discoverFirstPage();
    this.#startPage(first);
    try {
      // The root subform's own breakBefore, when the first-page rule did not use it up (pdf.js root[$toHTML] handles it before laying out).
      if (root.occupiesSpace) this.#decide(root.node, 'before');
      if (this.#isSplitting(root)) {
        this.#open(root, true);
        for (const child of root.children) this.#child(child);
        this.#close(true);
      } else {
        this.#placeWhole(root);
      }
    } catch (error) {
      if (!(error instanceof StopPagination)) throw error;
      this.#sink.add(root.node, error.message);
      this.#truncated = true;
      while (this.#stack.length > 0) this.#close(false);
    }
    const last = this.#pages[this.#pages.length - 1];
    if (last !== undefined && last.placed === 0 && this.#pages.length > 1) this.#pages.pop();
    // A form always has a page: when every page was dropped as empty, the last one stands.
    if (this.#pages.length === 0 && this.#lastDropped !== undefined) this.#pages.push(this.#lastDropped);
    return this.#result();
  }

  // ---- pages ---------------------------------------------------------------------------------------------

  /**
   * The page area of the first page: the target of the first `breakBefore` of the root subform or of its first subform
   * when it names a page area (that break is then used up), else the first page area of the page set.
   * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js Template[$toPages]` steps 4 to 6.
   */
  #discoverFirstPage(): PageAreaModel | undefined {
    const model = this.#model;
    if (model === undefined || this.#targets === undefined || this.#sequence === undefined) return undefined;
    const root = this.#dom.root;
    const firstSubform = root.children.find((child) => child.className === 'subform');
    for (const node of firstSubform === undefined ? [root] : [root, firstSubform]) {
      const request = this.#breakOf(node, 'before');
      if (request === undefined) continue;
      const page = request.target === '' ? undefined : this.#targets.pageArea(request.target);
      if (page !== undefined) {
        this.#doneBefore.add(request.element);
        this.#sequence.start(page);
        return page;
      }
      break;
    }
    const page = model.root.pageAreas[0] ?? model.pageAreas[0];
    if (page !== undefined) this.#sequence.start(page);
    return page;
  }

  /** The break of `side` on `node`, read once (what it reports is reported once however many rules look at it). */
  #breakOf(node: FormNode, side: BreakSide): BreakRequest | undefined {
    let known = this.#requests.get(node);
    if (known === undefined) {
      known = {};
      this.#requests.set(node, known);
    }
    if (!(side in known)) known[side] = breakOf(node, side, this.#sink);
    return known[side];
  }

  #startPage(model: PageAreaModel | undefined): void {
    if (this.#pages.length >= MAX_PAGES) throw new StopPagination(`more than ${MAX_PAGES} pages (the rest of the form is not laid out)`);
    if (model !== undefined) {
      const areas = model.contentAreas.map((area): AreaBucket => ({ node: area.node, rect: area.rect, boxes: [], placed: 0 }));
      this.#pages.push({ model, widthPt: model.widthPt, heightPt: model.heightPt, areas, placed: 0 });
      return;
    }
    // A form with no page set: one page, one content area that holds the whole flow.
    const root = this.#flow.root;
    const reach = root.children.reduce((most, child) => (child.occupiesSpace ? Math.max(most, child.rect.yPt + flowHeight(child) - root.contentRect.yPt) : most), 0);
    const rect: Rect = { xPt: 0, yPt: 0, widthPt: Math.max(1, root.rect.widthPt), heightPt: Math.max(1, reach + insetsOfBox(root).topPt + insetsOfBox(root).bottomPt, flowHeight(root)) };
    this.#pages.push({ model: undefined, widthPt: rect.widthPt, heightPt: rect.heightPt, areas: [{ node: undefined, rect, boxes: [], placed: 0 }], placed: 0 });
  }

  /**
   * Leaves the current page for a new one made from `target` (when it may still be used) or from the next page area in sequence. A page that got no content is dropped.
   * Only an empty page the layout itself leaves (`byBreak` false: a page area with no room, a block that fits nowhere) counts toward `MAX_EMPTY_PAGES`; one left by a
   * break is dropped without counting, as every break element is decided once and a chain of them is finite.
   */
  #newPage(target: PageAreaModel | undefined, startIndex: number, byBreak: boolean): void {
    const leaving = this.#pages[this.#pages.length - 1];
    if (leaving !== undefined && leaving.placed === 0) {
      this.#lastDropped = this.#pages.pop();
      if (byBreak) this.#emptyRun = 0;
      else this.#emptyRun += 1;
      if (this.#emptyRun >= MAX_EMPTY_PAGES) throw new StopPagination(`${MAX_EMPTY_PAGES} empty pages in a row (the rest of the form is not laid out)`);
    } else {
      this.#emptyRun = 0;
    }
    const sequence = this.#sequence;
    if (sequence === undefined) throw new StopPagination('the form has no page set: it is laid out on one page and the rest is not laid out');
    let model: PageAreaModel | undefined;
    if (target !== undefined && sequence.isUsable(target)) {
      sequence.use(target);
      model = target;
    } else {
      model = sequence.next(this.#pages.length + 1);
    }
    if (model === undefined) throw new StopPagination('the page set has no page area left to use (the rest of the form is not laid out)');
    this.#startPage(model);
    // An index meant for the target's content areas is held to those of the page area that stands in for it.
    this.#areaIndex = model === target ? startIndex : Math.min(startIndex, Math.max(0, model.contentAreas.length - 1));
    this.#cursor = 0;
  }

  get #page(): PageBuild {
    const page = this.#pages[this.#pages.length - 1];
    if (page === undefined) throw new StopPagination('no page to lay out on');
    return page;
  }

  /** The content area being filled; a page area with none, or a start index past the last, moves on until one exists. */
  #area(): AreaBucket {
    for (;;) {
      const area = this.#page.areas[this.#areaIndex];
      if (area !== undefined) return area;
      this.#advance(NONE);
    }
  }

  #breakState(): BreakState {
    const page = this.#page.model;
    return { page, area: page === undefined ? undefined : page.contentAreas[this.#areaIndex] };
  }

  /**
   * Moves on to the next content area (the next page when this page has no more), or where `decision` says. Every
   * container being split closes its fragment in the area it leaves and opens a continuation in the new one.
   * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js Template[$toPages]` (the loop over content areas, then the
   * next page from `$getNextPage`, a break's `target` and `startIndex`).
   */
  #advance(decision: BreakDecision): void {
    const open = this.#stack.map((fragment) => ({ src: fragment.src, virtual: fragment.virtual }));
    while (this.#stack.length > 0) this.#close(false);
    const page = this.#page;
    const byBreak = decision.kind !== 'none';
    if (decision.kind === 'page') this.#newPage(decision.target, decision.startIndex, byBreak);
    else if (decision.kind === 'area' && decision.index < page.areas.length && decision.index > this.#areaIndex) this.#goTo(decision.index);
    // An area that is not ahead on this page is started on a new page, at that area; one past the last area is the first of the next page.
    else if (decision.kind === 'area') this.#newPage(undefined, decision.index < page.areas.length ? decision.index : 0, byBreak);
    else if (this.#areaIndex + 1 < page.areas.length) this.#goTo(this.#areaIndex + 1);
    else this.#newPage(undefined, 0, byBreak);
    for (const entry of open) this.#open(entry.src, entry.virtual);
  }

  #goTo(index: number): void {
    this.#areaIndex = index;
    this.#cursor = 0;
  }

  // ---- fragments -----------------------------------------------------------------------------------------

  #open(src: LayoutBox, virtual: boolean): void {
    const first = !this.#emitted.has(src);
    if (virtual) this.#emitted.add(src);
    this.#stack.push({ src, virtual, children: [], startCursor: this.#cursor, first });
    if (first) this.#cursor += leadingPt(src);
  }

  /** Closes the innermost open container: its fragment goes to its parent's fragment, or to the content area. `last`: it ends here (bottom margin, and the room its own height asks for). */
  #close(last: boolean): void {
    const fragment = this.#stack.pop();
    if (fragment === undefined) return;
    const before = this.#consumed.get(fragment.src) ?? 0;
    let height = this.#cursor - fragment.startCursor;
    if (last) {
      height += trailingPt(fragment.src);
      const short = fragment.src.rect.heightPt - (before + height);
      if (short > SIZE_EPSILON_PT) height += short;
      this.#cursor = fragment.startCursor + height;
    }
    if (fragment.virtual || fragment.children.length === 0) return;
    const area = this.#area();
    const rect: Rect = { xPt: fragment.src.rect.xPt - this.#originX + area.rect.xPt, yPt: area.rect.yPt + fragment.startCursor, widthPt: fragment.src.rect.widthPt, heightPt: height };
    this.#consumed.set(fragment.src, before + height);
    this.#emitted.add(fragment.src);
    this.#emit(fragmentOf(fragment.src, fragment.children, rect, fragment.first, last));
  }

  #emit(box: LayoutBox): void {
    const parent = this.#stack[this.#stack.length - 1];
    if (parent !== undefined && !parent.virtual) parent.children.push(box);
    else this.#area().boxes.push(box);
  }

  // ---- placing -------------------------------------------------------------------------------------------

  #remaining(area: AreaBucket): number {
    return area.rect.heightPt - this.#cursor;
  }

  /**
   * Whether a block of known height fits what is left of the area: it overruns by no more than the tolerance.
   * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `layout.js checkDimensions`, `tb` / `table` parent, a node with a height that
   * cannot be split: `Math.round(h - space.height) <= ERROR`. Difference: pdf.js accepts an unsplittable node with no `h` at
   * all when more than ERROR is left ("wait and see"); here every block has the height the flow computed.
   */
  #fits(heightPt: number, area: AreaBucket): boolean {
    return heightPt <= 0 || Math.round(heightPt - this.#remaining(area)) <= FIT_TOLERANCE_PT;
  }

  /**
   * A container whose children are flowed top to bottom and may be cut between them: a subform or exclusion group in `tb`
   * or `table` layout, not kept intact. Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js Subform[$isSplittable]` and
   * `ExclGroup[$isSplittable]` (neither a `position` nor a `row` layout, nor a `keep intact` other than `none`, splits).
   */
  #isSplitting(box: LayoutBox): boolean {
    if (box.placeholder !== undefined || (box.node.className !== 'subform' && box.node.className !== 'exclGroup')) return false;
    if (box.layoutMode !== 'tb' && box.layoutMode !== 'table') return false;
    return this.#intactOf(box.node) === 'none' && box.children.some((child) => child.occupiesSpace);
  }

  /** A `keep` value (`intact`, `next`, `previous`); one that is not a keep value is reported and read as `none`. */
  #keepValue(keep: FormNode, name: string, owner: FormNode): KeepValue {
    try {
      return enumAttr(keep, name, keepSchema, 'none');
    } catch (error) {
      if (!(error instanceof XfaLayoutError)) throw error;
      this.#sink.add(owner, `${error.message} (read as none)`);
      return 'none';
    }
  }

  #intactOf(node: FormNode): KeepValue {
    const keep = node.childrenOfClass('keep')[0];
    if (keep === undefined) return 'none';
    for (const name of ['next', 'previous']) {
      const value = this.#keepValue(keep, name, node);
      if (value !== 'none') this.#sink.add(node, `keep ${name}="${value}" is not modelled (kept apart from its neighbour)`);
    }
    return this.#keepValue(keep, 'intact', node);
  }

  #child(box: LayoutBox): void {
    if (!box.occupiesSpace) return;
    this.#applyPending();
    const isSubform = box.node.className === 'subform';
    if (isSubform) this.#decide(box.node, 'before');
    if (this.#isSplitting(box)) this.#split(box);
    else this.#placeWhole(box);
    if (isSubform) this.#decide(box.node, 'after');
  }

  /**
   * A container cut between its children. It is tried in whatever is left of the area when that is more than the
   * tolerance, else it goes to the next area first. A child that does not fit then moves on and the container continues there.
   * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `layout.js checkDimensions` (a splittable node is laid out when
   * `space.height > ERROR`), `template.js Subform[$toHTML]` (a failing child leaves the container's partial layout in the old
   * content area and the container resumes in the next) and `layout.js flushHTML`.
   */
  #split(box: LayoutBox): void {
    const area = this.#area();
    if (this.#remaining(area) <= FIT_TOLERANCE_PT && area.placed > 0) this.#advance(NONE);
    this.#open(box, false);
    for (const child of box.children) this.#child(child);
    this.#close(true);
  }

  /**
   * A block that is not cut: a draw, field, positioned or row container, or one kept intact. It goes where it fits; else
   * to the next content area; in an empty area it is placed at the top even when it is taller (reported, not clipped).
   * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js Subform[$isSplittable]` (position and row layouts, and
   * `keep intact` other than `none`, are not splittable) and `layout.js checkDimensions`. Difference: pdf.js has no rule for a
   * block taller than an empty area (it makes empty pages until `MAX_EMPTY_PAGES`); here it is placed, as the XFA layout
   * does with a block that can never fit.
   */
  #placeWhole(box: LayoutBox): void {
    const height = flowHeight(box);
    let area = this.#area();
    if (!this.#fits(height, area) && area.placed > 0) {
      this.#advance(NONE);
      area = this.#area();
    }
    if (!this.#fits(height, area)) this.#sink.add(box.node, `taller than an empty content area (${height.toFixed(2)}pt in ${area.rect.heightPt.toFixed(2)}pt): placed at its top, the overflow is not clipped`);
    this.#reportIgnoredBreaks(box);
    this.#emit(translateBox(box, area.rect.xPt - this.#originX, area.rect.yPt + this.#cursor - box.rect.yPt));
    this.#cursor += height;
    area.placed += 1;
    this.#page.placed += 1;
    this.#emptyRun = 0;
  }

  /** A break inside a block that is placed whole cannot cut it: reported once per subform. */
  #reportIgnoredBreaks(box: LayoutBox): void {
    const pending: LayoutBox[] = [...box.children];
    for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
      const node = next.node;
      if (node.className === 'subform' && ['breakBefore', 'breakAfter', 'break'].some((name) => node.childrenOfClass(name).length > 0)) {
        this.#sink.add(node, 'break inside a block that is placed whole (a keep-intact, positioned or row container) is ignored');
      }
      pending.push(...next.children);
    }
  }

  // ---- breaks --------------------------------------------------------------------------------------------

  /** Decides the break of `side` on `node`. A `breakBefore` takes effect now; a `breakAfter` waits for the next content (a break at the very end makes no page). */
  #decide(node: FormNode, side: BreakSide): void {
    const request = this.#breakOf(node, side);
    const done = side === 'before' ? this.#doneBefore : this.#doneAfter;
    if (request === undefined || done.has(request.element)) return;
    done.add(request.element);
    const decision = decideBreak(request, this.#breakState(), this.#targets, this.#sink);
    if (decision.kind === 'none') return;
    if (side === 'before') this.#advance(decision);
    else this.#pending.push(decision);
  }

  #applyPending(): void {
    const decisions = this.#pending;
    this.#pending = [];
    for (const decision of decisions) this.#advance(decision);
  }

  // ---- result --------------------------------------------------------------------------------------------

  #result(): PagedLayout {
    const masters = new Map(this.#flow.masterPages.map((master) => [master.pageArea, master]));
    const pages = this.#pages.map((page, index): PageLayout => {
      const contentAreas = page.areas.map((area): ContentAreaLayout => ({ node: area.node, rect: area.rect, boxes: area.boxes }));
      const master = page.model === undefined ? undefined : masters.get(page.model.node);
      return { index, pageArea: page.model?.node, widthPt: page.widthPt, heightPt: page.heightPt, contentAreas, master };
    });
    const texts = new Map<FormNode, BoxText>();
    for (const entry of [...this.#flow.texts, ...this.#flow.masterPages.flatMap((master) => master.texts)]) texts.set(entry.box.node, entry);
    // Pagination's own issues come first: they say what is missing from the result (why it stopped) and must survive a full list.
    const all = [...this.#sink.issues, ...this.#flow.issues];
    return { pages, texts, truncated: this.#truncated, issues: all.slice(0, MAX_ISSUES), droppedIssues: this.#flow.droppedIssues + this.#sink.dropped + Math.max(0, all.length - MAX_ISSUES) };
  }
}

/**
 * Cuts a flowed form (`layoutFlow`) into pages. The root subform's `tb` flow is poured into the content areas of the
 * page areas the page set gives, top to bottom: a block that fits is placed; a container that does not is cut between
 * its children (only `tb` and `table` containers that are not kept intact); a block that cannot be cut moves whole to the
 * next content area, or is placed at the top of an empty one and reported when it is taller than that. `breakBefore` /
 * `breakAfter` (and the deprecated `break`) start new pages or move to another content area; the first page is made
 * from the first break's page area target. The master pages of the page areas are attached to their pages.
 *
 * The result is bounded for any input: at most `MAX_PAGES` pages, at most `MAX_EMPTY_PAGES` empty pages in a row that the layout itself makes (pages left empty by a break do not count), and one
 * visit per box; when pagination stops early `truncated` is set and an `issues` entry says why. `dom` must be the form
 * DOM `flow` was laid out from (it supplies the page set and the breaks). A malformed argument throws
 * `XfaLayoutError('INVALID_ARGUMENT')`.
 *
 * Origin (PA-4): semantic port of pdf.js v4.10.38 (Apache-2.0) `template.js` (`Template[$toPages]`, `Subform[$toHTML]`,
 * `PageSet` / `PageArea`, `handleBreak`) and `layout.js` (`checkDimensions`, `flushHTML`, `addHTML` for `tb`). Not
 * ported: `overflow` leaders and trailers, bookends, `keep next` / `previous`, `lr-tb` line attempts.
 */
export function paginate(flow: FlowLayout, dom: FormDom): PagedLayout {
  const parsed = argumentsSchema.safeParse({ flow, dom });
  if (!parsed.success) throw new XfaLayoutError('INVALID_ARGUMENT', `paginate: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  return new Paginator(flow, dom).run();
}
