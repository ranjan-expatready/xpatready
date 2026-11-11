import type { Attr, Document, Element, Node } from '@xmldom/xmldom';
import { XfaPdfError } from '../../pdf/errors.js';
import { diagnosticPath } from '../template/path.js';
import { assertSupported, TemplateNode, type TemplateModel } from '../template/index.js';
import { compilePicture, type Picture } from '../picture/index.js';
import { z } from 'zod';
import { cleanXmlText, firstIllegalXmlChar } from '../../xml/chars.js';
import { assertDataName, createDataElement, dataPathOf, existingDataElement, findRichData, isDataName, markEmptyGroup, nodeText, replaceText } from './data-dom.js';
import { DataBudget, elementOverhead, measureXml, serializedLength } from './data-budget.js';
import { DataNode } from './data-node.js';
import { ExpandoBudget } from './expando.js';
import { invalidArgument, limitExceeded, XfaFormError } from './errors.js';
import * as items from './items.js';
import { assertSupportedLocales } from './locale.js';
import { resolveLimits, MAX_NAME_CHARS, type FormLimits, type FormOptions } from './limits.js';
import { assertMergeable, mergeData } from './merge.js';
import { callMember, getMember, setMember, type MemberResult, type SetResult } from './members.js';
import { FormNode } from './node.js';
import type { DomNode } from './node-list.js';

const CLASS_NAME = /^[A-Za-z][A-Za-z0-9]{0,63}$/;

/** Classes that bind to data by name: a created node of one of these must carry a name a data element can have. */
const NAMED_BINDING_CLASSES: ReadonlySet<string> = new Set(['subform', 'field', 'exclGroup']);

// A name is markup, never cleaned: one XML cannot carry would make the saved packet drop the node.
const nodeNameSchema = z.string().max(MAX_NAME_CHARS).refine((name) => firstIllegalXmlChar(name) === -1);
const dataNodeNameSchema = z.string();

function ceilingError(detail: string): XfaPdfError {
  return new XfaPdfError('MALFORMED_XML', `Malformed XML: ${detail}`);
}

/**
 * The form DOM of one run: the template model merged with a datasets document. Owns the node registry (every node has a
 * stable positive id; 0 is left to the `xfa` root), the data DOM wrappers, and the creation and dispatch entry points the
 * script bridge and the event engine use. The datasets `Document` is mutated in place: bound writes, created data nodes
 * and `xfa:dataNode` markers land in it, so serializing it afterwards gives the data to save.
 *
 * Known limit: `remerge` has no rollback for a failure that cannot be checked beforehand (a node or data budget running
 * out part-way through the merge). See `remerge`.
 */
export class FormDom {
  readonly model: TemplateModel;
  readonly datasetsDocument: Document;
  readonly limits: FormLimits;
  /** Ceilings on the properties scripts store on containers beyond the object model (see `FormNode.setExpando`). */
  readonly expandos = new ExpandoBudget();
  /** `xfa.form`: the form model, whose single child is the root subform. */
  readonly form: FormNode;
  /** The root subform (`form1`). */
  readonly root: FormNode;
  readonly #registry: (DomNode | undefined)[] = [undefined];
  readonly #dataNodes = new WeakMap<object, DataNode>();
  readonly #byTemplate: (FormNode | undefined)[] = [];
  readonly #pictures = new Map<string, Picture>();
  readonly #budget: DataBudget;
  #dataVersion = 0;
  #revision = 0;
  #building = 0;
  #quiet: FormNode | undefined;
  #mergeCount = 0;
  #lastMergeVisits = 0;
  #dataElement: Element | undefined;
  #templateView: FormNode | undefined;

  /** Use `createFormDom`. */
  constructor(model: TemplateModel, datasets: Document, limits: FormLimits) {
    this.model = model;
    this.datasetsDocument = datasets;
    this.limits = limits;
    this.#budget = new DataBudget(measureXml(datasets).serialized);
    const rootTemplate = model.root.firstChild('subform');
    if (rootTemplate === undefined) throw new XfaPdfError('MALFORMED_XML', 'Malformed XML: the template has no root subform');
    this.form = new FormNode(this, this.standIn('form', ''), false);
    this.root = this.wrap(rootTemplate, false);
    this.form.addBuilt(this.root);
  }

  /** Internal: assigns the next id and records the node. Throws `LIMIT` past the node ceiling. */
  register(node: DomNode): number {
    if (this.#registry.length > this.limits.maxNodes) throw limitExceeded(`more than ${this.limits.maxNodes} nodes in one form`);
    this.#registry.push(node);
    return this.#registry.length - 1;
  }

  nodeById(id: number): DomNode | undefined {
    return Number.isInteger(id) && id > 0 ? this.#registry[id] : undefined;
  }

  /** A template-less stand-in node for something created at run time (`createNode`) or defaulted (a solid fill). */
  standIn(className: string, name: string): TemplateNode {
    return new TemplateNode({
      id: -1,
      className,
      parent: null,
      index: -1,
      implicit: true,
      nil: false,
      content: '',
      richContent: undefined,
      attributes: name === '' ? [] : [['name', name]],
      children: [],
    });
  }

  /** Builds the form subtree mirroring `template` (iteratively: nesting is as deep as the author chose). The result has no parent. */
  wrap(template: TemplateNode, readOnly: boolean): FormNode {
    // A subtree under construction is not part of the form yet (or is a default a read created): building it is no change to the form.
    this.#building += 1;
    try {
      const top = this.#make(template, readOnly);
      const pending: FormNode[] = [top];
      for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
        for (const child of node.template.children) {
          const made = this.#make(child, readOnly);
          node.addBuilt(made);
          pending.push(made);
        }
      }
      return top;
    } finally {
      this.#building -= 1;
    }
  }

  #make(template: TemplateNode, readOnly: boolean): FormNode {
    const node = new FormNode(this, template, readOnly);
    if (!readOnly && template.id >= 0) this.#byTemplate[template.id] = node;
    return node;
  }

  /** The form node currently mirroring a written template node (undefined for the template view and for implicit nodes). */
  formNodeFor(template: TemplateNode): FormNode | undefined {
    return template.id >= 0 ? this.#byTemplate[template.id] : undefined;
  }

  /** The read-only `xfa.template` view: the same tree without data or scripts' writes. Built on first use. */
  get template(): FormNode {
    this.#templateView ??= this.wrap(this.model.root, true);
    return this.#templateView;
  }

  // ---- data DOM ---------------------------------------------------------------------------------------------

  get dataVersion(): number {
    return this.#dataVersion;
  }

  /** Marks a structural change of the data DOM so cached child lists are rebuilt. */
  touchData(): void {
    this.#dataVersion += 1;
    this.touch();
  }

  // ---- revision (what a layout is current against) ------------------------------------------------------------

  /**
   * Moves whenever something a layout reads changes in the form: an attribute (presence, a size, a font ...) or a value
   * (form or bound data) takes a NEW value, a node is listed, unlisted or moved, a node is bound to other data, or the
   * data DOM changes shape. `FormNode.structureVersion` cannot stand in for it: it does not see attribute or value writes.
   * A write of the value a node already has, a read (including the creation of a default property), a change to a node
   * of the read-only `xfa.template` view, and a change to a node that is not in the form (created and not yet appended,
   * removed, or an unlisted default) move nothing. Equal numbers mean the same
   * layout input; the number itself carries no other meaning. (W02-T09, plan decision PA-2.)
   */
  get revision(): number {
    return this.#revision;
  }

  /** Internal: records a change. `node` is the form node written (omit it for a change to the data DOM, which no quiet window covers). */
  touch(node?: FormNode): void {
    if (this.#building > 0) return;
    if (node !== undefined) {
      if (node.readOnly || !node.isInForm) return;
      const quiet = this.#quiet;
      if (quiet !== undefined) {
        for (let up: FormNode | null = node; up !== null; up = up.parent) if (up === quiet) return;
      }
    }
    this.#revision += 1;
  }

  /**
   * Runs `run` with writes to `root` and its subtree not counted in `revision` (the writes still happen). Used for the
   * output of the layout itself: the `ready` scripts of a master page write its hidden fields once per page, and those
   * writes must not ask for another layout. Writes anywhere else, and to the data DOM, still move the revision.
   */
  withQuietSubtree<T>(root: FormNode, run: () => T): T {
    const before = this.#quiet;
    this.#quiet = root;
    try {
      return run();
    } finally {
      this.#quiet = before;
    }
  }

  /** The wrapper of a data element or attribute: the same object every time. */
  dataNodeFor(node: Element | Attr): DataNode {
    const known = this.#dataNodes.get(node);
    if (known !== undefined) return known;
    const created = new DataNode(this, node);
    this.#dataNodes.set(node, created);
    return created;
  }

  /** `xfa.datasets`. */
  get datasets(): DataNode {
    const root = this.datasetsDocument.documentElement;
    if (root === null) throw new XfaPdfError('MALFORMED_XML', 'Malformed XML: the datasets document has no root element');
    return this.dataNodeFor(root);
  }

  /** `xfa.datasets.data` (`xfa.data`): where the form data lives. */
  get data(): DataNode {
    if (this.#dataElement === undefined) throw new XfaFormError('INVALID_OPERATION', 'the form has not been merged');
    return this.dataNodeFor(this.#dataElement);
  }

  /** The `xfa:data` element, once merged. */
  get dataElement(): Element | undefined {
    return this.#dataElement;
  }

  /** How many times the form has been merged with its data (1 after `createFormDom`, +1 per `remerge`). */
  get mergeCount(): number {
    return this.#mergeCount;
  }

  /** Child elements the latest merge (or remerge) visited, for the merge-work ceiling (`maxMergeVisits`). */
  get lastMergeVisits(): number {
    return this.#lastMergeVisits;
  }

  /** Internal: the merge records its work, also when it stopped at the ceiling. */
  recordMergeVisits(visits: number): void {
    this.#lastMergeVisits = visits;
  }

  /** Internal: runs the merge and records the data element it bound to. */
  merge(): void {
    this.#dataElement = mergeData(this);
    this.#mergeCount += 1;
  }

  /**
   * `xfa.form.remerge()`: drops every binding and the items `bindItems` filled in, then binds the form to the data again,
   * creating whatever the data lacks. Used after the data root is removed (the Clear button) or replaced (`loadXML`).
   * Values of unbound fields are kept; bound values come from the (new) data. Everything that can be checked is checked
   * BEFORE the first binding is dropped (`INVALID_ARGUMENT`), so a refused remerge leaves the form as it was; a failure
   * of the merge itself (a budget) is an `XfaFormError` too, never the loader's error class.
   *
   * NO ROLLBACK: a failure that cannot be checked in advance (the node budget or the data budget running out part-way)
   * leaves the form with its bindings dropped and its `bindItems` lists partly refilled, and the data partly merged. The
   * form is then unusable for data: treat such a `LIMIT` as the end of the run. Only the pre-checked failures are atomic.
   */
  remerge(): void {
    try {
      assertMergeable(this);
    } catch (e) {
      if (e instanceof XfaPdfError && !(e instanceof XfaFormError)) throw new XfaFormError('INVALID_ARGUMENT', e.message, { cause: e });
      throw e;
    }
    this.walk((node) => {
      node.bindData(null);
      if (node.className === 'field') items.clearGenerated(node);
    });
    this.touchData();
    try {
      this.merge();
    } catch (e) {
      if (e instanceof XfaPdfError && !(e instanceof XfaFormError)) throw new XfaFormError('INVALID_OPERATION', e.message, { cause: e });
      throw e;
    }
  }

  /**
   * Called after nodes were removed from the data DOM. When a removed node holds the `xfa:data` element, or any form node
   * was bound to a removed node (or below it), the form is re-merged, as Acrobat refills the form when its data root is
   * cleared; removing data nothing is bound to (the list of values) leaves the form alone.
   */
  afterDataRemoval(removed: readonly Element[]): void {
    if (removed.length === 0) return;
    // A node is within a removed one when it or an ancestor is in the set: its depth in steps, not the removed count (a load can remove 199,000).
    const gone = new Set<Node>(removed);
    const isGone = (node: Node): boolean => {
      for (let up: Node | null = node; up !== null; up = up.parentNode) if (gone.has(up)) return true;
      return false;
    };
    const root = this.#dataElement;
    if (root !== undefined && isGone(root)) {
      this.remerge();
      return;
    }
    let hit = false;
    this.walk((node) => {
      const bound = node.boundElement;
      if (!hit && bound !== null && isGone(bound)) hit = true;
    });
    if (hit) this.remerge();
  }

  // ---- data budget (see data-budget.ts) ------------------------------------------------------------------------

  /** Charges text handed to `loadXML` over the run; past the ceiling it throws `LIMIT`. */
  chargeLoadedChars(chars: number): void {
    this.#budget.chargeLoadedChars(chars);
  }

  /** Charges elements imported by `loadXML` over the run, and their serialized size; past either ceiling it throws `LIMIT` and charges neither. */
  chargeImported(elements: number, serialized: number): void {
    this.#budget.chargeImported(elements, serialized);
  }

  /** Charges a data element about to be created (a merge or `createNode`); throws `LIMIT` when the saved datasets would no longer re-open. */
  chargeNewElement(name: string): void {
    this.#budget.chargeSaved(elementOverhead(name));
  }

  /**
   * The one way run-time text enters the data DOM: cleans what XML cannot hold (`cleanXmlText`), refuses what would make
   * the saved datasets too large to re-open (`LIMIT`) BEFORE changing anything, then replaces the element's text.
   */
  writeText(element: Element, written: string): void {
    const text = cleanXmlText(written);
    const before = nodeText(element);
    this.#budget.chargeSaved(serializedLength(text) - serializedLength(before));
    replaceText(element, text);
    if (before !== text) this.touch();
  }

  /** Charges an attribute value about to be written (`text` is already cleaned, as `writeText` cleans). */
  chargeAttribute(text: string, previous: string): void {
    this.#budget.chargeSaved(serializedLength(text, true) - serializedLength(previous, true));
  }

  /** `xfa.datasets.createNode(kind, name)`: a detached data group or data value; append it with `nodes.append`. */
  createDataNode(kind: 'dataGroup' | 'dataValue', name: string): DataNode {
    if (kind !== 'dataGroup' && kind !== 'dataValue') throw invalidArgument('a data node is a dataGroup or a dataValue');
    const valid = validDataName(name);
    this.chargeNewElement(valid);
    const element = createDataElement(this.datasetsDocument, valid);
    if (kind === 'dataGroup') markEmptyGroup(element);
    return this.dataNodeFor(element);
  }

  // ---- creation ----------------------------------------------------------------------------------------------

  /** `xfa.form.createNode(className, name)`: a detached form node of that class (`solid`, `text`, ...). */
  createNode(className: string, name = ''): FormNode {
    if (!CLASS_NAME.test(className)) throw invalidArgument('createNode needs an XFA class name');
    const given = nodeNameSchema.safeParse(name);
    if (!given.success) throw invalidArgument(`a node name must be a string of at most ${MAX_NAME_CHARS} characters XML allows`);
    // Refused here, not at the next remerge: a field that binds by name needs a name a data element can carry.
    if (given.data !== '' && NAMED_BINDING_CLASSES.has(className) && !isDataName(given.data)) {
      throw invalidArgument(`a ${className} name must be a letter or underscore followed by letters, digits, "_" or "-"`);
    }
    return new FormNode(this, this.standIn(className, given.data), false);
  }

  // ---- pictures ------------------------------------------------------------------------------------------------

  /** The compiled picture for `source` (trimmed), cached; undefined for no picture. Unsupported pictures throw `UNSUPPORTED_FEATURE`. */
  pictureFor(source: string | undefined): Picture | undefined {
    const text = source?.trim();
    if (text === undefined || text === '') return undefined;
    const known = this.#pictures.get(text);
    if (known !== undefined) return known;
    const compiled = compilePicture(text);
    this.#pictures.set(text, compiled);
    return compiled;
  }

  // ---- traversal and lookup -----------------------------------------------------------------------------------

  /** Visits `from` (default: the form model) and every listed descendant in document order. */
  walk(visit: (node: FormNode) => void, from: FormNode = this.form): void {
    const pending: FormNode[] = [from];
    for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
      visit(node);
      for (let i = node.children.length - 1; i >= 0; i -= 1) {
        const child = node.children[i];
        if (child !== undefined) pending.push(child);
      }
    }
  }

  /** The children called `name`, in order, then those declared in the node's `variables`; a data node also answers an attribute of that name. */
  namedChildren(node: DomNode, name: string): readonly DomNode[] {
    if (node instanceof FormNode) {
      const direct = node.children.filter((c) => c.name === name);
      if (name === '') return direct;
      // Script objects and text variables declared in a `variables` block are named members of the container.
      const declared = node.children.filter((c) => c.className === 'variables').flatMap((v) => v.children.filter((c) => c.name === name));
      return declared.length === 0 ? direct : [...direct, ...declared];
    }
    if (node instanceof DataNode) {
      const named = node.children.filter((c) => c.name === name);
      if (named.length > 0) return named;
      const attribute = node.child(name);
      return attribute === undefined ? [] : [attribute];
    }
    return [];
  }

  // ---- member dispatch (the bridge sits on these) ------------------------------------------------------------

  get(node: DomNode, name: string): MemberResult {
    return getMember(this, node, name);
  }

  set(node: DomNode, name: string, value: unknown): SetResult {
    return setMember(this, node, name, value);
  }

  call(node: DomNode, name: string, args: readonly unknown[]): MemberResult {
    return callMember(this, node, name, args);
  }
}

function validDataName(input: unknown): string {
  const given = dataNodeNameSchema.safeParse(input);
  if (!given.success) throw invalidArgument('a data node name must be a string');
  try {
    assertDataName(given.data, 'data node');
  } catch (e) {
    throw invalidArgument(e instanceof Error ? e.message : 'invalid data node name');
  }
  return given.data;
}

/**
 * Merges `datasets` into a form DOM for `model`. Refuses (typed `XfaPdfError`) what the engine does not implement
 * (`assertSupported`, an unsupported picture or `bindItems` ref, a name that is not a valid data element name), a
 * datasets document not rooted in `xfa:datasets`, and a template over the form ceiling. Mutates `datasets`.
 */
export function createFormDom(model: TemplateModel, datasets: Document, options?: FormOptions): FormDom {
  const limits = resolveLimits(options);
  assertSupported(model);
  if (model.nodes.length > limits.maxNodes) {
    throw ceilingError(`the template has ${model.nodes.length} elements, over the ${limits.maxNodes}-node form ceiling`);
  }
  for (const node of model.nodes) {
    if (node.className !== 'picture') continue;
    const source = node.content.trim();
    if (source === '') continue;
    try {
      compilePicture(source);
    } catch (e) {
      if (e instanceof XfaPdfError) throw new XfaPdfError(e.code, `${e.message} at ${diagnosticPath(node)}`, { cause: e });
      throw e;
    }
  }
  assertSupportedLocales(model);
  // Before anything is merged, so a refused packet is left exactly as it was. Only the form data is read as values: markup in
  // a list of values or another packet beside it is never merged.
  const formData = existingDataElement(datasets);
  const rich = formData === undefined ? undefined : findRichData(formData);
  if (rich !== undefined) {
    throw new XfaPdfError('UNSUPPORTED_FEATURE', `Unsupported XFA feature: rich-text data value (xfa:contentType or XHTML content) at ${dataPathOf(rich)}`);
  }
  try {
    const dom = new FormDom(model, datasets, limits);
    dom.merge();
    return dom;
  } catch (e) {
    if (e instanceof XfaFormError && e.code === 'LIMIT') throw ceilingError(`${e.message} (form ceiling)`);
    throw e;
  }
}
