import type { Document, Element } from '@xmldom/xmldom';
import { XfaPdfError } from '../../pdf/errors.js';
import { safeText } from '../../pdf/safe-text.js';
import { bindItemsOf, type BindItemsView } from '../template/index.js';
import { childElements, isDataName, nodeText } from './data-dom.js';
import { MAX_REF_CHARS, MAX_REF_SEGMENTS } from './limits.js';
import type { MergeWork } from './data-budget.js';
import * as items from './items.js';
import type { FormNode } from './node.js';

const REF_ROOT = 'xfa.datasets';

interface Segment {
  readonly name: string;
  /** A number picks that child; `all` is `[*]`; undefined is the first. */
  readonly index: number | 'all' | undefined;
}

function unsupported(detail: string, ref: string): XfaPdfError {
  return new XfaPdfError('UNSUPPORTED_FEATURE', `Unsupported XFA feature: bindItems ${detail} "${safeText(ref)}"`);
}

/** One segment `name`, `name[n]` or `name[*]`; undefined when it is anything else. Linear, no regular expression. */
function parseSegment(text: string): Segment | undefined {
  const open = text.indexOf('[');
  if (open < 0) return isDataName(text) ? { name: text, index: undefined } : undefined;
  const name = text.slice(0, open);
  if (!isDataName(name) || !text.endsWith(']')) return undefined;
  const inside = text.slice(open + 1, -1);
  if (inside === '*') return { name, index: 'all' };
  if (inside === '' || inside.length > 9) return undefined;
  for (let i = 0; i < inside.length; i += 1) if (inside.charCodeAt(i) < 48 || inside.charCodeAt(i) > 57) return undefined;
  return { name, index: Number(inside) };
}

/** The path below `xfa.datasets` of a `bindItems` ref, or undefined when the ref is outside the supported grammar (dotted names, `[n]`, `[*]` on the last). */
function parseRef(ref: string): readonly Segment[] | undefined {
  if (ref.length > MAX_REF_CHARS || !ref.startsWith(`${REF_ROOT}.`)) return undefined;
  const parts = ref.slice(REF_ROOT.length + 1).split('.');
  if (parts.length > MAX_REF_SEGMENTS) return undefined;
  const segments: Segment[] = [];
  for (const [i, part] of parts.entries()) {
    const segment = parseSegment(part);
    if (segment === undefined || (segment.index === 'all' && i !== parts.length - 1)) return undefined;
    segments.push(segment);
  }
  return segments;
}

function valueRefOk(ref: string): boolean {
  return ref === '' || ref === '$' || isDataName(ref);
}

type Pair = readonly [label: string, value: string];

/** The children of one parent by name, in document order; a name in `stale` is rebuilt from the children when next read. */
interface ParentIndex {
  readonly byName: Map<string, Element[]>;
  readonly stale: Set<string>;
}

/**
 * FD-38 exemption (security invariant): most earlier siblings `created` looks through for a same-name element before it
 * leaves that name to be rebuilt on its next read. It bounds the work of each created data node, so a template cannot make
 * the merge cost fields times siblings; the result is the same either way, only the speed differs. A node is created next
 * to the previous one of its name in practice, so the real forms look back one or two siblings. No firm or operator has a
 * reason to vary it.
 */
const MAX_LOOK_BACK = 32;

const nameOf = (element: Element): string => element.localName ?? element.nodeName;

function previousElement(element: Element): Element | null {
  let node = element.previousSibling;
  while (node !== null && node.nodeType !== 1) node = node.previousSibling;
  return node as Element | null;
}

/** A label or value reference evaluated on a data element: `$` is its text, a name is its attribute or child element of that name. */
function evaluate(element: Element, ref: string, work: MergeWork): string {
  if (ref === '$') return nodeText(element);
  const attribute = element.getAttribute(ref);
  if (attribute !== '' && attribute !== null) return attribute;
  const children = childElements(element);
  work.visit(children.length + 1);
  const child = children.find((e) => (e.localName ?? e.nodeName) === ref);
  return child === undefined ? (attribute ?? '') : nodeText(child);
}

function checkedPath(view: BindItemsView): readonly Segment[] {
  const segments = parseRef(view.ref);
  if (segments === undefined) throw unsupported('ref', view.ref);
  if (!valueRefOk(view.labelRef)) throw unsupported('labelRef', view.labelRef);
  if (!valueRefOk(view.valueRef)) throw unsupported('valueRef', view.valueRef);
  return segments;
}

/** Refuses (`UNSUPPORTED_FEATURE`) a field whose `bindItems` is outside the supported grammar, without reading any data. */
export function assertBindItemsSupported(field: FormNode): void {
  for (const view of bindItemsOf(field.template)) checkedPath(view);
}

/**
 * Resolves `bindItems` references for the fields of one merge. Many fields share a reference (one list of values feeds
 * dozens of choice lists) and a list of values has thousands of siblings, so a resolved (ref, labelRef, valueRef) is kept
 * and the children of each parent are indexed by name once; otherwise every field would re-scan and re-filter the whole
 * list. The merge itself adds data nodes under `xfa:data` (and writes defaults into them), and `created` / `textChanged`
 * tell the resolver so: a created element is inserted into its parent's index in place (never by rebuilding the index, which
 * would cost children times fields), and resolved pairs of a reference into `xfa:data` are not reused after any change, so a
 * reference into it sees the nodes created so far. Create one per merge: nothing here follows other edits.
 */
export class BindItemsResolver {
  readonly #doc: Document;
  readonly #work: MergeWork;
  readonly #byParent = new Map<Element, ParentIndex>();
  readonly #resolved = new Map<string, { readonly version: number; readonly pairs: readonly Pair[] }>();
  /** Counts changes the merge made; resolved pairs of a reference into xfa:data are valid for one version only. */
  #version = 0;

  constructor(doc: Document, work: MergeWork) {
    this.#doc = doc;
    this.#work = work;
  }

  /** The labels and values a field's `bindItems` yield, in data order. */
  pairsFor(view: BindItemsView): readonly Pair[] {
    const segments = checkedPath(view);
    const inData = segments[0]?.name === 'data';
    const key = `${view.ref}\u0000${view.labelRef}\u0000${view.valueRef}`;
    const known = this.#resolved.get(key);
    if (known !== undefined && (!inData || known.version === this.#version)) return known.pairs;
    const found = this.#resolve(segments);
    this.#work.visit(found.length + 1);
    const pairs = found.map((element): Pair => {
      const value = view.valueRef === '' ? undefined : evaluate(element, view.valueRef, this.#work);
      const label = view.labelRef === '' ? (value ?? '') : evaluate(element, view.labelRef, this.#work);
      return [label, value ?? label];
    });
    this.#resolved.set(key, { version: this.#version, pairs });
    return pairs;
  }

  /** The merge changed the text of a data node. */
  textChanged(): void {
    this.#version += 1;
  }

  /**
   * The merge inserted `element` into its parent (right after a sibling it had just bound, or first). When the parent is
   * indexed, the element goes into the list of its name at its document position: no list yet means it is the only one; else
   * the position follows the nearest same-name element before it, looked for among at most `MAX_LOOK_BACK` earlier siblings
   * (creation is next to the previous node of the same name in practice). Further than that the list of that one name is
   * rebuilt from the children when next read; the index of every other name stays valid.
   */
  created(element: Element): void {
    this.#version += 1;
    const parent = element.parentNode;
    const index = parent === null ? undefined : this.#byParent.get(parent as Element);
    if (index === undefined) return;
    const name = nameOf(element);
    if (index.stale.has(name)) return;
    const list = index.byName.get(name);
    if (list === undefined) {
      index.byName.set(name, [element]);
      return;
    }
    let before = previousElement(element);
    for (let steps = 0; before !== null && nameOf(before) !== name && steps < MAX_LOOK_BACK; steps += 1) {
      this.#work.visit(1);
      before = previousElement(before);
    }
    if (before === null) {
      list.unshift(element);
    } else if (nameOf(before) === name) {
      const at = list[list.length - 1] === before ? list.length - 1 : list.indexOf(before);
      if (at < 0) index.stale.add(name);
      else list.splice(at + 1, 0, element);
    } else {
      index.stale.add(name);
    }
  }

  #named(parent: Element, name: string): readonly Element[] {
    let index = this.#byParent.get(parent);
    if (index === undefined) {
      const byName = new Map<string, Element[]>();
      const children = childElements(parent);
      this.#work.visit(children.length + 1);
      for (const child of children) {
        const key = nameOf(child);
        const list = byName.get(key);
        if (list === undefined) byName.set(key, [child]);
        else list.push(child);
      }
      index = { byName, stale: new Set() };
      this.#byParent.set(parent, index);
    }
    if (index.stale.has(name)) {
      const children = childElements(parent);
      this.#work.visit(children.length + 1);
      index.byName.set(name, children.filter((e) => nameOf(e) === name));
      index.stale.delete(name);
    }
    return index.byName.get(name) ?? [];
  }

  #resolve(segments: readonly Segment[]): Element[] {
    let level: Element[] = this.#doc.documentElement === null ? [] : [this.#doc.documentElement];
    for (const segment of segments) {
      const next: Element[] = [];
      for (const parent of level) {
        const named = this.#named(parent, segment.name);
        if (segment.index === 'all') {
          this.#work.visit(named.length);
          for (const element of named) next.push(element);
        }
        else {
          const one = named[segment.index ?? 0];
          if (one !== undefined) next.push(one);
        }
      }
      level = next;
    }
    return level;
  }
}

/**
 * Fills a field's choice lists from its `bindItems` (display labels and stored values, in data order). The bound items are
 * appended AFTER any items the template writes; Acrobat's order for a field that has both is not specified here, and
 * neither real form has one (every `bindItems` field has empty `items` lists). The items are marked so `remerge` can
 * remove and refill them without duplicating.
 */
export function applyBindItems(resolver: BindItemsResolver, field: FormNode): void {
  for (const view of bindItemsOf(field.template)) items.appendBound(field, resolver.pairsFor(view));
}
