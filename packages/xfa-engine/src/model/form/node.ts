import type { Element } from '@xmldom/xmldom';
import { cleanXmlText } from '../../xml/chars.js';
import { attrWithDefault, getElement, getProperty, UI_WIDGET_CLASSES, type TemplateNode } from '../template/index.js';
import type { DataNode } from './data-node.js';
import type { FormDom } from './dom.js';
import { invalidArgument, invalidOperation, limitExceeded } from './errors.js';
import type { ExpandoValue } from './expando.js';
import { MAX_ATTRIBUTE_CHARS, MAX_VALUE_CHARS } from './limits.js';
import { NodeListNode, type DomNode, type ListSource } from './node-list.js';
import { escapeMarkup, plainFromMarkup } from './rich-content.js';
import * as items from './items.js';
import * as value from './value.js';
import * as texts from './messages.js';

/** The classes whose single child is "the one of" a choice (XFA `oneOfChild`), mirroring the template model. */
const ONE_OF_CLASSES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['ui', UI_WIDGET_CLASSES],
  ['value', new Set(['text', 'integer', 'decimal', 'float', 'boolean', 'date', 'time', 'dateTime', 'exData', 'image', 'line', 'rectangle', 'arc'])],
  ['fill', new Set(['solid', 'linear', 'radial', 'pattern', 'stipple'])],
]);

/** Classes with a fixed number of positional slots (a border's four edges and corners): a higher slot lists the lower ones first. */
const SLOTTED_CLASSES: ReadonlySet<string> = new Set(['edge', 'corner']);

/**
 * One node of the form DOM: the per-run, mutable counterpart of a (frozen) template node. It owns every per-run change
 * (attributes, text, children, values, bound data) in ONE write path (`setAttr`, `setNodeValue`, `appendNode`,
 * `removeNode` and the value/items functions built on them); the template model is never written.
 *
 * A property that the template leaves out (`border`, `caption`, ...) is created on first read from the XFA defaults
 * and kept (same object every time) but is not listed in the owner's `nodes` until something writes to it or below
 * it; the first write lists it, and a node removed from its owner reverts, on the next read, to the template state.
 */
export class FormNode {
  readonly id: number;
  readonly className: string;
  readonly dom: FormDom;
  /** The template node this node mirrors: a written one, a default created by `getProperty`, or a detached stand-in for a created node. */
  readonly template: TemplateNode;
  /** True in the `xfa.template` view: nothing in it can be written. */
  readonly readOnly: boolean;
  #parent: FormNode | null = null;
  /** False only for the root of a subtree that is not (or no longer) listed in its parent's children. */
  #attached = true;
  #slotIndex = 0;
  #structure = 0;
  readonly #children: FormNode[] = [];
  #attrs: Map<string, string> | undefined;
  #content: string | undefined;
  #rich: string | undefined;
  #slots: Map<string, FormNode> | undefined;
  #list: NodeListNode | undefined;
  #bound: Element | null = null;
  #generated = false;
  #expandos: Map<string, ExpandoValue> | undefined;

  constructor(dom: FormDom, template: TemplateNode, readOnly: boolean) {
    this.dom = dom;
    this.template = template;
    this.className = template.className;
    this.readOnly = readOnly;
    this.id = dom.register(this);
  }

  get name(): string {
    return this.template.name;
  }

  get parent(): FormNode | null {
    return this.#parent;
  }

  /**
   * True when the node is part of the live form: it is listed in its parent's children, and so is every ancestor, up to the
   * form model. A created node not yet appended, a removed one, a default property nothing has written to, and everything
   * below them are not: a change there is not a change of the form (`FormDom.revision`).
   */
  get isInForm(): boolean {
    return FormNode.#listedUpToForm(this);
  }

  /** Iterative on purpose: nesting is as deep as the template's author chose. */
  static #listedUpToForm(start: FormNode): boolean {
    let up = start;
    while (up.#parent !== null) {
      if (!up.#attached) return false;
      up = up.#parent;
    }
    return up === start.dom.form;
  }

  /** The listed children, in order. The array is the node's own; do not mutate it (use `nodes`). */
  get children(): readonly FormNode[] {
    return this.#children;
  }

  /**
   * Changes whenever a child is listed or unlisted (appended, removed, moved, a default listed by a write) in this node,
   * or in one of its `variables` blocks, whose members count as members of this node. A cache built from the children
   * (see `model/som/scope.ts`) is current while this number is the one it was built at. A node's name is its template
   * node's and never changes, so nothing else can invalidate such a cache.
   */
  get structureVersion(): number {
    return this.#structure;
  }

  childrenOfClass(className: string): readonly FormNode[] {
    return this.#children.filter((c) => c.className === className);
  }

  get nodes(): NodeListNode {
    this.#list ??= new NodeListNode(this.dom, this, this.#listSource());
    return this.#list;
  }

  // ---- attributes -------------------------------------------------------------------------------------------

  /** The effective attribute: what a script wrote, else the template's, else the XFA default; undefined when none. */
  attr(name: string): string | undefined {
    return this.#attrs?.get(name) ?? attrWithDefault(this.template, name);
  }

  /** The only attribute write path. Values are stored as given (a colour keeps its spaces) except for characters XML cannot hold, which are cleaned (`cleanXmlText`). */
  setAttr(name: string, text: string): void {
    this.assertWritable();
    if (text.length > MAX_ATTRIBUTE_CHARS) throw limitExceeded(`an attribute value may hold at most ${MAX_ATTRIBUTE_CHARS} characters`);
    const clean = cleanXmlText(text);
    const before = this.attr(name);
    (this.#attrs ??= new Map()).set(name, clean);
    this.materialise();
    // The form's revision moves with the effective value: a write of what is already there changes nothing a layout can see.
    if (before !== clean) this.dom.touch(this);
  }

  /** True when the template wrote `name` on this node's own element or a script has set it. */
  isSpecified(name: string): boolean {
    return this.#attrs?.has(name) === true || this.template.attr(name) !== undefined || this.#children.some((c) => c.className === name);
  }

  /** Attributes written at run time (not the template's), in first-write order: the UI state the form packet saves. */
  get writtenAttributeNames(): readonly string[] {
    return this.#attrs === undefined ? [] : [...this.#attrs.keys()];
  }

  /** True when this leaf's text was written at run time rather than taken from the template. */
  get hasWrittenText(): boolean {
    return this.#content !== undefined;
  }

  // ---- expandos --------------------------------------------------------------------------------------------

  /** True when a script stored a property called `name` on this node that the object model does not define. */
  hasExpando(name: string): boolean {
    return this.#expandos?.has(name) === true;
  }

  expando(name: string): ExpandoValue {
    return this.#expandos?.get(name);
  }

  /**
   * Stores a property the object model does not define (Acrobat's object model tolerates such writes, and the real forms
   * make them). It lives only on this node: never in the data, never in the template. Throws `LIMIT` past the form's ceilings.
   */
  setExpando(name: string, value: ExpandoValue): void {
    this.assertWritable();
    const store = (this.#expandos ??= new Map<string, ExpandoValue>());
    this.dom.expandos.replace(store.has(name), store.get(name), value);
    store.set(name, value);
  }

  // ---- text content (leaf classes: text, integer, exData, script, ...) ------------------------------------

  /** True for rich text: an `exData` whose content type is markup, not plain text. */
  get isRich(): boolean {
    return this.className === 'exData' && this.attr('contentType') !== 'text/plain';
  }

  /** The plain text of a leaf (for rich text, a text projection of the markup). */
  get plainText(): string {
    return this.#content ?? this.template.content;
  }

  /**
   * The `.value` of a leaf node. For rich text it is the exact XHTML markup (`richContent`), because the form scripts
   * read a caption, prefix a marker, and write it back later with the marker stripped: markup in, markup out keeps
   * every span and style, where a plain-text value would flatten the caption on the first write. Writing markup
   * stores it verbatim; the plain projection is derived from it.
   */
  get nodeValue(): string {
    return this.isRich ? (this.#rich ?? this.template.richContent ?? '') : this.plainText;
  }

  set nodeValue(text: string) {
    this.assertWritable();
    if (text.length > MAX_VALUE_CHARS) throw limitExceeded(`a node value may hold at most ${MAX_VALUE_CHARS} characters`);
    const clean = cleanXmlText(text);
    const before = this.nodeValue;
    if (this.isRich) {
      this.#rich = clean;
      this.#content = plainFromMarkup(clean);
    } else {
      this.#content = clean;
    }
    this.materialise();
    if (before !== this.nodeValue) this.dom.touch(this);
  }

  /** Sets the plain text (for rich text, the markup becomes that text escaped). Characters XML cannot hold are cleaned (`cleanXmlText`), so a saved form packet always re-opens. */
  setPlainText(text: string): void {
    this.assertWritable();
    if (text.length > MAX_VALUE_CHARS) throw limitExceeded(`a node value may hold at most ${MAX_VALUE_CHARS} characters`);
    const clean = cleanXmlText(text);
    const plainBefore = this.plainText;
    const markupBefore = this.nodeValue;
    this.#content = clean;
    if (this.isRich) this.#rich = escapeMarkup(clean);
    this.materialise();
    if (plainBefore !== clean || markupBefore !== this.nodeValue) this.dom.touch(this);
  }

  // ---- structure ----------------------------------------------------------------------------------------------

  /** The property `className` of this node (`border`, `caption`, `validate`, ...): the listed child, else the default; undefined when XFA gives this node no such property. */
  property(className: string): FormNode | undefined {
    return this.#children.find((c) => c.className === className) ?? this.#slot(className, 0);
  }

  /** XFA `getElement`: the `index`-th child of this class, answering a border's missing edges and corners with defaults. */
  element(className: string, index: number): FormNode | undefined {
    if (!Number.isInteger(index) || index < 0) return undefined;
    let seen = 0;
    for (const child of this.#children) {
      if (child.className !== className) continue;
      if (seen === index) return child;
      seen += 1;
    }
    return this.slotElement(className, index);
  }

  /**
   * What `element` answers when `index` is at or past the number of listed children of `className`: the default for that
   * slot, or undefined when XFA has none. A caller that already counted the listed children (a grouped index of them)
   * asks this directly instead of paying `element`'s scan of every child again.
   */
  slotElement(className: string, index: number): FormNode | undefined {
    return Number.isInteger(index) && index >= 0 ? this.#slot(className, index) : undefined;
  }

  /** XFA `oneOfChild`: the single child of a `ui`, `value` or `fill`; a `fill` answers a solid fill when none is written. */
  get oneOfChild(): FormNode | undefined {
    const choices = ONE_OF_CLASSES.get(this.className);
    if (choices === undefined) return undefined;
    return this.#children.find((c) => choices.has(c.className)) ?? (this.className === 'fill' ? this.#slot('solid', 0) : undefined);
  }

  // ---- values (see value.ts / items.ts / messages.ts) -----------------------------------------------------

  get dataNode(): DataNode | null {
    return this.#bound === null ? null : this.dom.dataNodeFor(this.#bound);
  }

  /** The bound data element (internal; the merge sets it). */
  get boundElement(): Element | null {
    return this.#bound;
  }

  /** Binds to a data element, or (null) unbinds; the merge and `remerge` are the only callers. */
  bindData(element: Element | null): void {
    this.#bound = element;
    this.dom.touch(this);
  }

  /** True for an item filled in from `bindItems`; `remerge` removes these so re-binding does not duplicate them. */
  get isGenerated(): boolean {
    return this.#generated;
  }

  markGenerated(generated = true): void {
    this.#generated = generated;
  }

  get rawValue(): string | number | null {
    return value.readRaw(this);
  }

  set rawValue(v: string | number | boolean | null) {
    value.writeRaw(this, v);
  }

  get isNull(): boolean {
    return value.readText(this) === null;
  }

  get formattedValue(): string {
    return value.formatted(this).text;
  }

  /** False when a format picture exists but cannot show the value (the text is then shown unformatted). */
  get isFormatted(): boolean {
    return value.formatted(this).formatted;
  }

  /** Applies typed text through the edit picture; returns false (keeping the text as typed) when it does not parse. */
  commitInput(text: string): boolean {
    return value.commitInput(this, text);
  }

  get presence(): string {
    return this.attr('presence') ?? 'visible';
  }

  set presence(v: string) {
    value.writeEnum(this, 'presence', v);
  }

  get access(): string {
    return this.attr('access') ?? 'open';
  }

  set access(v: string) {
    value.writeEnum(this, 'access', v);
  }

  get mandatory(): string {
    return texts.validateAttr(this, 'nullTest');
  }

  set mandatory(v: string) {
    texts.setValidateAttr(this, 'nullTest', v);
  }

  get validationMessage(): string {
    return texts.messageText(this, 'scriptTest');
  }

  set validationMessage(v: string) {
    texts.setMessageText(this, 'scriptTest', v);
  }

  get formatMessage(): string {
    return texts.messageText(this, 'formatTest');
  }

  set formatMessage(v: string) {
    texts.setMessageText(this, 'formatTest', v);
  }

  get mandatoryMessage(): string {
    return texts.messageText(this, 'nullTest');
  }

  set mandatoryMessage(v: string) {
    texts.setMessageText(this, 'nullTest', v);
  }

  clearItems(): void {
    items.clearItems(this);
  }

  addItem(display: string, save?: string): void {
    items.addItem(this, display, save);
  }

  get selectedIndex(): number {
    return items.selectedIndex(this);
  }

  set selectedIndex(index: number) {
    items.setSelectedIndex(this, index);
  }

  boundItem(display: string): string {
    return items.boundItem(this, display);
  }

  // ---- mutation plumbing ---------------------------------------------------------------------------------

  assertWritable(): void {
    if (this.readOnly) throw invalidOperation('the template view is read-only');
  }

  /**
   * Lists this node, and any unlisted ancestors, in their parents' children (the first write to a default property).
   * A node that was removed (no parent) stays unlisted: there is nowhere to list it.
   */
  materialise(): void {
    const chain: FormNode[] = [];
    if (!this.#attached && this.#parent !== null) chain.push(this);
    for (let n = this.#parent; n !== null; n = n.#parent) {
      if (!n.#attached && n.#parent !== null) chain.push(n);
    }
    for (let i = chain.length - 1; i >= 0; i -= 1) {
      const node = chain[i];
      if (node === undefined || node.#attached) continue;
      const parent = node.#parent;
      if (parent !== null) parent.#listSlot(node);
    }
  }

  /** Builder hook: adds an already-built child at the end of the children. */
  addBuilt(child: FormNode): void {
    this.#children.push(child);
    child.#parent = this;
    child.#attached = true;
    this.#restructured();
  }

  /** Builder hook: records `child` as this node's default for a property, unlisted until written. */
  addSlot(child: FormNode, className: string, index: number): void {
    child.#parent = this;
    child.#attached = false;
    child.#slotIndex = index;
    (this.#slots ??= new Map()).set(`${className}#${index}`, child);
  }

  appendNode(node: DomNode): void {
    this.assertWritable();
    if (!(node instanceof FormNode) || node.dom !== this.dom) throw invalidArgument('only a form node of this form can be appended');
    if (node.readOnly) throw invalidOperation('a node of the template view cannot be appended');
    let cyclic = node === this;
    for (let up = this.#parent; up !== null && !cyclic; up = up.#parent) cyclic = up === node;
    if (cyclic) throw invalidOperation('a node cannot be appended to itself or to its own descendant');
    node.#detach();
    this.materialise();
    this.#children.push(node);
    node.#parent = this;
    node.#attached = true;
    this.#restructured();
  }

  removeNode(node: DomNode): void {
    this.assertWritable();
    if (!(node instanceof FormNode) || node.#parent !== this) throw invalidOperation('the node is not a child of this node');
    node.#detach();
  }

  /**
   * Removes every listed child `drop` selects, in ONE pass over the children (the same effect as `removeNode` on each,
   * without moving the array once per removal: that was quadratic for a list of 100,000 items). Returns the removed
   * nodes in their former order; they are detached and can be appended again.
   */
  removeNodesWhere(drop: (child: FormNode) => boolean): FormNode[] {
    this.assertWritable();
    const removed: FormNode[] = [];
    const kept: FormNode[] = [];
    // Decided for all children first, so a `drop` that throws changes nothing.
    for (const child of this.#children) (drop(child) ? removed : kept).push(child);
    if (removed.length === 0) return removed;
    this.#children.length = 0;
    for (const child of kept) this.#children.push(child);
    this.#restructured();
    if (this.#slots !== undefined) {
      const gone = new Set<FormNode>(removed);
      for (const [key, slot] of this.#slots) if (gone.has(slot)) this.#slots.delete(key);
    }
    for (const child of removed) {
      child.#parent = null;
      child.#attached = false;
    }
    return removed;
  }

  #detach(): void {
    const parent = this.#parent;
    if (parent === null) return;
    if (this.#attached) {
      const at = parent.#children.indexOf(this);
      if (at >= 0) parent.#children.splice(at, 1);
      parent.#restructured();
    }
    if (parent.#slots !== undefined) {
      for (const [key, slot] of parent.#slots) if (slot === this) parent.#slots.delete(key);
    }
    this.#parent = null;
    this.#attached = false;
  }

  #slot(className: string, index: number): FormNode | undefined {
    const key = `${className}#${index}`;
    const known = this.#slots?.get(key);
    if (known !== undefined) return known;
    let template = index === 0 ? getProperty(this.template, className) : getElement(this.template, className, index);
    if (template === undefined && className === 'solid' && this.className === 'fill') template = this.dom.standIn('solid', '');
    if (template === undefined) return undefined;
    const node = this.dom.wrap(template, this.readOnly);
    this.addSlot(node, className, index);
    return node;
  }

  /** Lists a default node; a higher edge or corner slot lists the lower ones first so slot order stays position order. */
  #listSlot(node: FormNode): void {
    if (SLOTTED_CLASSES.has(node.className) && node.#slotIndex > 0) {
      for (let j = this.#children.filter((c) => c.className === node.className).length; j < node.#slotIndex; j += 1) {
        const lower = this.#slot(node.className, j);
        if (lower !== undefined && !lower.#attached) {
          this.#children.push(lower);
          lower.#attached = true;
        }
      }
    }
    this.#children.push(node);
    node.#attached = true;
    this.#restructured();
  }

  /** Records a change of the listed children; a `variables` block's members are its owner's too, so the owner's number moves with the block's. */
  #restructured(): void {
    this.#structure += 1;
    if (this.className === 'variables' && this.#parent !== null) this.#parent.#structure += 1;
    this.dom.touch(this);
  }

  #listSource(): ListSource {
    return {
      size: () => this.#children.length,
      at: (i) => this.#children[i],
      add: (node) => this.appendNode(node),
      delete: (node) => this.removeNode(node),
    };
  }
}
