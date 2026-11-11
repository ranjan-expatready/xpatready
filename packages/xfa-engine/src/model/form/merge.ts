import type { Document, Element } from '@xmldom/xmldom';
import { XfaPdfError } from '../../pdf/errors.js';
import { bindOf } from '../template/index.js';
import { applyBindItems, assertBindItemsSupported, BindItemsResolver } from './bind-items.js';
import { assertDataName, childElements, createDataElement, elementKind, markEmptyGroup, ownerOf, XFA_DATA_NAMESPACE } from './data-dom.js';
import { MergeWork } from './data-budget.js';
import type { FormDom } from './dom.js';
import type { FormNode } from './node.js';

/** Classes that bind to data. */
const BINDING_CLASSES: ReadonlySet<string> = new Set(['subform', 'field', 'exclGroup']);

/** Layout containers that carry fields: they bind nothing and their fields bind in the enclosing scope. */
const TRANSPARENT_CLASSES: ReadonlySet<string> = new Set(['area', 'pageSet', 'pageArea', 'contentArea']);

function localName(element: Element): string {
  return element.localName ?? element.nodeName;
}

/** An element with no text, no children and no attributes: unmarked, so it could be an empty group as well as an empty value. */
function isBlank(element: Element): boolean {
  return element.firstChild === null && element.attributes.length === 0;
}

/**
 * The data children of one group while it is being merged: an index by name built on first use, a cursor per
 * (name, kind) so the n-th same-name template node takes the n-th same-name data node in document order, and the last
 * node bound so a created node is placed right after it. Linear in the number of children however many template
 * nodes bind here.
 */
class Scope {
  readonly element: Element;
  readonly #dom: FormDom;
  readonly #resolver: BindItemsResolver;
  readonly work: MergeWork;
  #byName: Map<string, Element[]> | undefined;
  readonly #cursors = new Map<string, number>();
  readonly #taken = new Set<Element>();
  #last: Element | null = null;

  constructor(dom: FormDom, resolver: BindItemsResolver, work: MergeWork, element: Element) {
    this.#dom = dom;
    this.#resolver = resolver;
    this.work = work;
    this.element = element;
  }

  /** The next unconsumed data node called `name` that is a group (`group`) or a value, or undefined. */
  take(name: string, group: boolean): Element | undefined {
    if (this.#byName === undefined) {
      this.#byName = new Map();
      const children = childElements(this.element);
      this.work.visit(children.length + 1);
      for (const child of children) {
        const key = localName(child);
        const list = this.#byName.get(key);
        if (list === undefined) this.#byName.set(key, [child]);
        else list.push(child);
      }
    }
    const list = this.#byName.get(name);
    if (list === undefined) return undefined;
    const key = `${group ? 'g' : 'v'}:${name}`;
    let i = this.#cursors.get(key) ?? 0;
    for (; i < list.length; i += 1) {
      const candidate = list[i];
      if (candidate === undefined || this.#taken.has(candidate)) continue;
      const kind = elementKind(candidate);
      if (group ? kind === 'dataGroup' || (kind === 'dataValue' && isBlank(candidate)) : kind === 'dataValue') {
        this.#cursors.set(key, i + 1);
        this.#taken.add(candidate);
        this.#last = candidate;
        return candidate;
      }
    }
    this.#cursors.set(key, i);
    return undefined;
  }

  /** Creates a data node for `name` after the last one bound in this scope (or first when none yet). */
  create(name: string): Element {
    this.#dom.chargeNewElement(name);
    const element = createDataElement(ownerOf(this.element), name);
    const before = this.#last === null ? this.element.firstChild : this.#last.nextSibling;
    // The DOM library renumbers the parent's child list on an insert before a sibling, so that costs as many steps as there are children.
    this.work.visit(before === null ? 1 : this.element.childNodes.length + 1);
    this.element.insertBefore(element, before);
    // A `bindItems` reference into xfa:data may have indexed this parent's children: the new one goes into that index in place.
    this.#resolver.created(element);
    this.#taken.add(element);
    this.#last = element;
    return element;
  }
}

function dataRoot(doc: Document): Element {
  const root = doc.documentElement;
  if (root === null || (root.localName ?? root.nodeName) !== 'datasets' || root.namespaceURI !== XFA_DATA_NAMESPACE) {
    throw new XfaPdfError('MALFORMED_XML', 'Malformed XML: a datasets packet must be rooted in xfa:datasets');
  }
  for (const child of childElements(root)) {
    if ((child.localName ?? child.nodeName) === 'data' && child.namespaceURI === XFA_DATA_NAMESPACE) return child;
  }
  const created = doc.createElementNS(XFA_DATA_NAMESPACE, root.prefix === null || root.prefix === '' ? 'data' : `${root.prefix}:data`);
  root.appendChild(created);
  return created;
}

/** The template default of a field as text, empty when none. */
function defaultTextOf(node: FormNode): string {
  const content = node.children.find((c) => c.className === 'value')?.oneOfChild;
  return content === undefined ? '' : content.plainText;
}

function isBindable(node: FormNode): boolean {
  return BINDING_CLASSES.has(node.className) && node.name !== '' && (bindOf(node.template)?.match ?? 'once') !== 'none';
}

/**
 * Checks, without changing anything, what `mergeData` would refuse: a bindable node whose name is not a data element
 * name, and a field whose `bindItems` is outside the supported grammar. `remerge` runs this BEFORE it drops a binding, so a
 * refused remerge never leaves the form half bound. Throws `UNSUPPORTED_FEATURE`.
 */
export function assertMergeable(dom: FormDom): void {
  // The same nodes `mergeData` visits (`mergeChildren`), not every node: radio buttons in an exclusion group are never bound.
  const pending: FormNode[] = [dom.root];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (isBindable(node)) assertDataName(node.name, node.className);
    if (node.className === 'field') assertBindItemsSupported(node);
    for (const child of mergeChildren(node)) pending.push(child);
  }
}

/**
 * The children the merge descends into, in the order it merges them: a subform and the layout containers pass on their
 * subforms, fields, exclusion groups and layout containers; an exclusion group, a field and anything else pass on nothing. The
 * page set is merged after the rest of its subform, as the form producer lays it out: its fields' data nodes come last in
 * the group when they have to be created. `mergeData` and `assertMergeable` both walk exactly this tree.
 */
function mergeChildren(node: FormNode): FormNode[] {
  if (node.className !== 'subform' && !TRANSPARENT_CLASSES.has(node.className)) return [];
  const candidates = node.children.filter((c) => BINDING_CLASSES.has(c.className) || TRANSPARENT_CLASSES.has(c.className));
  return [...candidates.filter((c) => c.className !== 'pageSet'), ...candidates.filter((c) => c.className === 'pageSet')];
}

/**
 * Implicit ("once") binding of the form tree to the data: a named subform, field or exclusion group takes the next
 * unconsumed same-name data node of the right kind under its scope, or creates one in template order; unnamed and
 * `match="none"` nodes bind nothing and their children keep the enclosing scope; layout containers are transparent;
 * an exclusion group owns its data node and its radio children bind none. Fills choice lists from `bindItems`.
 * Returns the data element of `xfa:data`.
 */
export function mergeData(dom: FormDom): Element {
  const dataElement = dataRoot(dom.datasetsDocument);
  const groups: Element[] = [];
  const work = new MergeWork(dom.limits.maxMergeVisits);
  const resolver = new BindItemsResolver(dom.datasetsDocument, work);
  const stack: { node: FormNode; scope: Scope }[] = [{ node: dom.root, scope: new Scope(dom, resolver, work, dataElement) }];
  try {
    walkMerge(dom, stack, resolver, groups);
  } finally {
    dom.recordMergeVisits(work.visits);
  }
  for (const element of groups) markEmptyGroup(element);
  return dataElement;
}

function walkMerge(dom: FormDom, stack: { node: FormNode; scope: Scope }[], resolver: BindItemsResolver, groups: Element[]): void {
  for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
    const { node, scope } = next;
    let below = scope;
    if (isBindable(node)) {
      const group = node.className === 'subform';
      assertDataName(node.name, node.className);
      let element = scope.take(node.name, group);
      if (element === undefined) {
        element = scope.create(node.name);
        if (!group) {
          const initial = defaultTextOf(node);
          if (initial !== '') {
            dom.writeText(element, initial);
            resolver.textChanged();
          }
        }
      }
      node.bindData(element);
      if (group) {
        groups.push(element);
        below = new Scope(dom, resolver, scope.work, element);
      }
    }
    if (node.className === 'field') applyBindItems(resolver, node);
    // Pushed last to first so they are popped in merge order.
    const children = mergeChildren(node);
    for (let i = children.length - 1; i >= 0; i -= 1) {
      const child = children[i];
      if (child !== undefined) stack.push({ node: child, scope: below });
    }
  }
}
