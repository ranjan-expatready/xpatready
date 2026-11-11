import { XfaPdfError } from '../pdf/errors.js';
import { safeText } from '../pdf/safe-text.js';
import type { BoxIssue, LayoutBox } from '../layout/box/types.js';
import { XfaLayoutError } from '../layout/errors.js';
import { createFlowContext, layoutMasterPage, type MasterPageLayout } from '../layout/flow/index.js';
import { loadFonts, type LoadedFont } from '../layout/font/catalogue.js';
import { MAX_ISSUES } from '../layout/limits.js';
import { layoutPages, sameGeometry, type LaidOutForm, type MasterValues, type PagedLayout, type PageLayout } from '../layout/paginate/index.js';
import { createTextContext, templateTypefacesOf, type TextContext } from '../layout/text/index.js';
import { XfaFormError, type FormDom, type FormNode } from '../model/form/index.js';
import type { TemplateModel } from '../model/template/index.js';
import type { Sandbox } from '../script/index.js';
import type { XfaPdf } from '../xfa-pdf.js';
import { describeNode } from './context.js';
import type { EventEngine } from './engine.js';
import { formSizeLimit } from './errors.js';
import { masterPageOf } from './master-page.js';

/** What the form's own scripts may ask of the layout (`xfa.layout`): the members the real forms use. */
export interface LayoutQuery {
  /** The 1-based page the node's first box is on; 0 when the node has no box on any page (hidden, or no layout yet). */
  page(node: FormNode): number;
  /** The number of pages of the layout as it stands; 0 before the first layout. */
  pageCount(): number;
}

/** The fonts the layout measures with: the document's own embedded programs, and what could not be used of them. */
export interface LayoutFonts {
  readonly faces: readonly LoadedFont[];
  /** `font.*` issues of the document's fonts (a program the reader refused, fonts over a ceiling). Not part of the layout's `issues`; the render tree adds them (W02-T12). */
  readonly issues: readonly string[];
}

const parsedFonts = new WeakMap<object, LayoutFonts>();

/**
 * The document's embedded fonts as the layout takes them. A document whose fonts cannot be read still runs its scripts: it
 * gets no embedded faces (every typeface then takes the layout's fallback) and one issue.
 */
export async function readLayoutFonts(pdf: XfaPdf): Promise<LayoutFonts> {
  try {
    const embedded = await pdf.fonts();
    // `XfaPdf.fonts()` answers the same object for the life of the document, so every runtime over it shares one parse of the programs (and one set of faces in memory).
    const known = parsedFonts.get(embedded);
    if (known !== undefined) return known;
    const loaded = loadFonts(embedded.fonts);
    const fonts: LayoutFonts = { faces: loaded.faces, issues: [...embedded.issues, ...loaded.issues] };
    parsedFonts.set(embedded, fonts);
    return fonts;
  } catch (error) {
    // A typed refusal of the document's fonts (malformed dictionaries, a stream the reader will not decode) costs the layout its embedded faces, not the form its scripts.
    if (error instanceof XfaPdfError) return { faces: [], issues: [`font.resources.unreadable.${error.code}`] };
    throw error;
  }
}

/** The runtime pieces a settle drives, bound once the sandbox exists (the sandbox needs the host, and the host needs the session's `LayoutQuery`). */
export interface LayoutBinding {
  readonly engine: Pick<EventEngine, 'runLayoutReady'>;
  readonly sandbox: Pick<Sandbox, 'withinRunBudget'>;
}

export interface LayoutSessionDeps {
  readonly dom: FormDom;
  readonly model: TemplateModel;
  readonly fonts: LayoutFonts;
  /** Most layout passes one settle makes (`maxLayoutPasses`). */
  readonly maxPasses: number;
}

/** What a settle did: the scripts it ran, and whether they wrote anything the layout reads (a calculate that reads it may now be out of date). */
export interface SettleResult {
  readonly scripts: number;
  readonly wrote: boolean;
}

const NOTHING: SettleResult = { scripts: 0, wrote: false };

/** A pagination and the text context its issues were reported to, or the typed refusal of the layout layer. */
type Paginated = { readonly ok: true; readonly paged: PagedLayout; readonly text: TextContext } | { readonly ok: false; readonly error: XfaLayoutError };

/** The master pages of a pass, one per page, laid out after the scripts of their own instance ran. */
interface Instances {
  readonly scripts: number;
  readonly masters: readonly (MasterPageLayout | undefined)[];
  readonly values: readonly MasterValues[];
  readonly issues: readonly BoxIssue[];
}

const NO_VALUES: MasterValues = new Map();
const issueKey = (issue: BoxIssue): string => `${issue.som}\u0000${issue.feature}`;

/** The value of every field of a master page, in document order. */
function valuesOf(dom: FormDom, area: FormNode): MasterValues {
  const out = new Map<FormNode, string | number | null>();
  dom.walk((node) => {
    if (node.className === 'field') out.set(node, node.rawValue);
  }, area);
  return out;
}

/**
 * The form's layout as the runtime keeps it (W02-T09, plan decision PA-2): paginated from the live form DOM, with the
 * form's own `ready:$layout` scripts run after pagination and `xfa.layout` answered from the result.
 *
 * ONE SETTLE (`settle`): the form is paginated (a whole new layout; nothing is incremental) and a pass runs the
 * `ready:$layout` handlers of the body once, then those of each master page once per page instance (that instance's page
 * number is what `xfa.layout.page(this)` answers while they run), laying the master page out again right after each, so a
 * hidden field a master page embeds (`PAGE n OF m`) is captured with that instance's value. When the scripts wrote
 * anything (`FormDom.revision` moved) the form is paginated again; if that moved a box or a page break the scripts run
 * again on the new pagination (`ready:$layout` fires after every layout that changed), up to `maxPasses` passes, and then
 * the last pagination the scripts ran on stands and an `issues` entry says the form was still changing. A write that
 * leaves every box where it was (a text, a hidden field) is not a re-layout and runs nothing twice. The writes a master page's own scripts make to that page do not
 * count (`FormDom.withQuietSubtree`): they are the layout's output, and counting them would re-run the scripts of every
 * page forever. Scripts run through the engine, so every run budget of the sandbox applies, and the host work of laying
 * out is charged to the form-run budget (`Sandbox.withinRunBudget`).
 *
 * A settle runs only when the DOM revision moved since the last one, so a call that wrote nothing costs nothing. WHEN it
 * runs is the runtime's choice (lazily, FD-38 relevant: a batch of writes costs one layout): before a script event is
 * dispatched, on `FormRuntime.layout()`, on save, and at the end of load.
 *
 * Known limits (recorded, for the owner side-by-side): a script that reads a master-page field from outside that page
 * sees the value of the last page instance; `xfa.layout.page(node)` of a node with no box is 0; a script that changes the
 * form and then asks `xfa.layout.page` in the same run sees the layout from before its change.
 */
export class LayoutSession implements LayoutQuery {
  readonly #deps: LayoutSessionDeps;
  #binding: LayoutBinding | undefined;
  #current: LaidOutForm | undefined;
  #firstPages: { readonly of: LaidOutForm; readonly pages: ReadonlyMap<FormNode, number> } | undefined;
  #instance: { readonly area: FormNode; readonly page: number } | undefined;
  #settling = false;
  #settles = 0;

  constructor(deps: LayoutSessionDeps) {
    this.#deps = deps;
  }

  bind(binding: LayoutBinding): void {
    this.#binding = binding;
  }

  get fontIssues(): readonly string[] {
    return this.#deps.fonts.issues;
  }

  /** How many settles ran (a call that found the layout current is not one). */
  get settles(): number {
    return this.#settles;
  }

  /** Frees the layout and its indexes (a disposed runtime keeps its DOM until it is dropped; the layout is the larger part). */
  release(): void {
    this.#current = undefined;
    this.#firstPages = undefined;
    this.#instance = undefined;
  }

  /** The latest layout; undefined before the first settle. */
  get current(): LaidOutForm | undefined {
    return this.#current;
  }

  /** True when `current` is the layout of the form as it stands now. */
  get isCurrent(): boolean {
    return this.#current !== undefined && this.#current.revision === this.#deps.dom.revision;
  }

  // ---- xfa.layout ------------------------------------------------------------------------------------------

  page(node: FormNode): number {
    const current = this.#current;
    if (current === undefined) return 0;
    const area = masterPageOf(node);
    if (area !== undefined) {
      if (this.#instance?.area === area) return this.#instance.page;
      // Outside the scripts of a page instance, a master-page node answers the first page that is an instance of its page area.
      const first = current.pages.find((page) => page.pageArea === area);
      return first === undefined ? 0 : first.index + 1;
    }
    return this.#bodyPages(current).get(node) ?? 0;
  }

  pageCount(): number {
    return this.#current?.pages.length ?? 0;
  }

  // ---- settle ----------------------------------------------------------------------------------------------

  /**
   * Lays the form out and runs its `ready:$layout` scripts until they change nothing the layout shows (see the class). Does
   * nothing (no scripts, `wrote` false) when the layout is already current.
   */
  settle(): SettleResult {
    if (this.isCurrent || this.#settling) return NOTHING;
    const binding = this.#binding;
    if (binding === undefined) throw new Error('the layout session is not bound to a runtime');
    const { dom, maxPasses } = this.#deps;
    this.#settling = true;
    this.#settles += 1;
    let scripts = 0;
    let wrote = false;
    try {
      let laid = this.#paginate(binding);
      for (let pass = 1; ; pass += 1) {
        if (!laid.ok) {
          this.#current = this.#refused(laid.error, pass);
          return { scripts, wrote };
        }
        // Reading the form moves nothing (the default property a read creates is not a change of the form): this is the revision the pagination is of.
        const paginatedAt = dom.revision;
        this.#current = { ...laid.paged, masterValues: [], revision: paginatedAt, passes: pass, settled: false };
        scripts += binding.engine.runLayoutReady(undefined);
        const instances = this.#runInstances(binding, laid.paged, laid.text);
        scripts += instances.scripts;
        // Nothing the scripts wrote reaches the layout: this pagination is the layout.
        if (dom.revision === paginatedAt) {
          this.#current = this.#assemble(laid.paged, laid.text, instances, pass, true);
          return { scripts, wrote };
        }
        wrote = true;
        // They wrote: lay the form out again. The scripts run again only if that moved something (the layout, not a text, changed).
        const next = this.#paginate(binding);
        if (next.ok && sameGeometry(next.paged, laid.paged)) {
          this.#current = this.#assemble(next.paged, next.text, instances, pass, true);
          return { scripts, wrote };
        }
        if (pass >= maxPasses) {
          // Still changing: the last pagination the scripts ran on stands (its master pages are the ones their scripts left).
          this.#current = this.#assemble(laid.paged, laid.text, instances, pass, false);
          return { scripts, wrote };
        }
        laid = next;
      }
    } finally {
      this.#settling = false;
      this.#instance = undefined;
    }
  }

  /**
   * Records that the caller's own loop (layout scripts, then the calculates they feed, then the layout again) was still
   * changing the form when it reached its ceiling: the current layout is flagged `settled: false` with an `issues` entry.
   * At the ceiling the layout's `text` items may lag a calculated field's overlay `value`: the last calculate wrote after the last layout was made.
   */
  markUnsettled(passes: number): void {
    const current = this.#current;
    if (current === undefined) return;
    const { dom } = this.#deps;
    this.#firstPages = undefined;
    this.#current = {
      ...current,
      issues: [...current.issues, { som: describeNode(dom.root), feature: `the ready:$layout scripts and the calculates they feed still changed the form after ${passes} rounds (the last layout stands)` }].slice(0, MAX_ISSUES),
      revision: dom.revision,
      settled: false,
    };
  }

  // ---- internals ---------------------------------------------------------------------------------------------

  /** One whole pagination of the form as it stands; a typed refusal of the layout layer comes back as a value, any other failure propagates. */
  #paginate(binding: LayoutBinding): Paginated {
    const { dom, model, fonts } = this.#deps;
    try {
      return binding.sandbox.withinRunBudget(
        () => {
          // A new text context per layout: the issues of a layout are that layout's (a context remembers what it has reported).
          const text = createTextContext(fonts.faces, templateTypefacesOf(model), dom);
          return { ok: true, paged: layoutPages(dom, text), text };
        },
        () => ({ event: 'layout', nodeSom: describeNode(dom.root) }),
      );
    } catch (error) {
      if (error instanceof XfaLayoutError) return { ok: false, error };
      if (error instanceof XfaFormError && error.code === 'LIMIT') throw formSizeLimit(error);
      throw error;
    }
  }

  /** The layout of a form the layout layer refused: no pages and one issue saying why. The run goes on (the scripts still work). */
  #refused(error: XfaLayoutError, passes: number): LaidOutForm {
    const { dom } = this.#deps;
    this.#firstPages = undefined;
    return {
      pages: [],
      texts: new Map(),
      truncated: true,
      issues: [{ som: describeNode(dom.root), feature: `layout failed (${error.code}: ${safeText(error.message, 200, true)}); the form has no pages` }],
      droppedIssues: 0,
      masterValues: [],
      revision: dom.revision,
      passes,
      settled: true,
    };
  }

  /** The scripts of every page area's master page, once per page instance in page order, each followed by that instance's master page laid out again. */
  #runInstances(binding: LayoutBinding, paged: PagedLayout, text: TextContext): Instances {
    const { dom } = this.#deps;
    const ctx = createFlowContext(text);
    const masters: (MasterPageLayout | undefined)[] = [];
    const values: MasterValues[] = [];
    let scripts = 0;
    for (const page of paged.pages) {
      const area = page.pageArea;
      if (area === undefined) {
        masters.push(page.master);
        values.push(NO_VALUES);
        continue;
      }
      this.#instance = { area, page: page.index + 1 };
      try {
        scripts += dom.withQuietSubtree(area, () => binding.engine.runLayoutReady(area));
        masters.push(binding.sandbox.withinRunBudget(() => layoutMasterPage(area, ctx, text), () => ({ event: 'layout', nodeSom: describeNode(area) })));
        values.push(valuesOf(dom, area));
      } finally {
        this.#instance = undefined;
      }
    }
    return { scripts, masters, values, issues: ctx.sink.issues };
  }

  /** The final layout of a settle: each page carries the master page of its own instance, and master boxes leave the node-keyed text map (their text is per page). */
  #assemble(paged: PagedLayout, text: TextContext, instances: Instances, passes: number, settled: boolean): LaidOutForm {
    const { dom } = this.#deps;
    // The index of the layout this one replaces holds its nodes alive; the next `page()` builds the new one.
    this.#firstPages = undefined;
    const pages = paged.pages.map((page, index): PageLayout => ({ ...page, master: instances.masters[index] ?? page.master }));
    const texts = new Map([...paged.texts].filter(([node]) => masterPageOf(node) === undefined));
    const known = new Set(paged.issues.map(issueKey));
    const added: BoxIssue[] = [];
    for (const issue of [...instances.issues, ...text.sink.issues]) {
      if (known.has(issueKey(issue))) continue;
      known.add(issueKey(issue));
      added.push(issue);
    }
    if (!settled) added.push({ som: describeNode(dom.root), feature: `the ready:$layout scripts still changed the form after ${passes} layout passes (the last layout stands)` });
    const all = [...paged.issues, ...added];
    return {
      pages,
      texts,
      truncated: paged.truncated,
      issues: all.slice(0, MAX_ISSUES),
      droppedIssues: paged.droppedIssues + Math.max(0, all.length - MAX_ISSUES),
      masterValues: instances.values,
      // Current for the form as the last pass's scripts left it, finished or not: asking again with no new write must not repeat the settle.
      revision: dom.revision,
      passes,
      settled,
    };
  }

  /** The first page of every box of the body, built once per layout. */
  #bodyPages(current: LaidOutForm): ReadonlyMap<FormNode, number> {
    if (this.#firstPages?.of === current) return this.#firstPages.pages;
    const pages = new Map<FormNode, number>();
    for (const page of current.pages) {
      const pending: LayoutBox[] = page.contentAreas.flatMap((area) => [...area.boxes]).reverse();
      for (let box = pending.pop(); box !== undefined; box = pending.pop()) {
        if (!pages.has(box.node)) pages.set(box.node, page.index + 1);
        for (let i = box.children.length - 1; i >= 0; i -= 1) {
          const child = box.children[i];
          if (child !== undefined) pending.push(child);
        }
      }
    }
    this.#firstPages = { of: current, pages };
    return pages;
  }
}
