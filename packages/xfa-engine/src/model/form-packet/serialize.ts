import { firstIllegalXmlChar } from '../../xml/chars.js';
import { MAX_XML_CHARS } from '../../xml/limits.js';
import type { FormDom, FormNode } from '../form/index.js';
import { CONTAINER_CLASSES, isSettable, ITEMS_ATTRIBUTES, PROPERTY_CLASSES, SLOTTED_CLASSES, TEXT_CLASSES } from './classes.js';
import { MAX_SAVED_DELTAS, MAX_SAVED_ELEMENTS } from './deltas.js';

/** Version used when the template namespace carries none (the reference reader's default). */
const DEFAULT_VERSION = '2.8';
const TEMPLATE_VERSION = /\/xfa-template\/(\d+\.\d+)\/$/;

/** The form packet namespace matching the template's version: `.../xfa-template/2.8/` gives `.../xfa-form/2.8/`. */
export function formNamespace(templateNamespace: string): string {
  const version = TEMPLATE_VERSION.exec(templateNamespace)?.[1] ?? DEFAULT_VERSION;
  return `http://www.xfa.org/schema/xfa-form/${version}/`;
}

const escapeText = (s: string): string => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\r', '&#13;');
const escapeAttr = (s: string): string =>
  escapeText(s).replaceAll('"', '&quot;').replaceAll('\n', '&#10;').replaceAll('\t', '&#9;');

/**
 * FD-38 exemption (security invariant): characters kept free below `MAX_XML_CHARS` when the writer budgets a packet, so
 * the packet it writes is always one `parseXml` accepts even if its own count is a few characters off. The count is exact
 * (every part is counted as it is pushed, escaped), so this is slack, not a working allowance; no firm or operator has a
 * reason to vary it.
 */
const PACKET_CHARS_MARGIN = 4096;

/**
 * FD-38 exemption (security invariant): most characters of a form packet the writer produces. A packet is re-opened under
 * the XML ceiling `MAX_XML_CHARS`, and escaping can multiply the text it holds (every `&` is five characters), so the
 * ceiling is held to the escaped text, not the text the form holds. No firm or operator has a reason to vary it.
 */
export const MAX_SAVED_CHARS = MAX_XML_CHARS - PACKET_CHARS_MARGIN;

/** What the reader of a packet accepts; a packet past any number is refused whole (`deltas.ts`, `parseXml`). All default to the reader's own ceilings. */
export interface PacketBudget {
  /** Most elements below the `form` root (`MAX_SAVED_ELEMENTS`). */
  readonly maxElements?: number;
  /** Most deltas the reader will collect (`MAX_SAVED_DELTAS`). */
  readonly maxDeltas?: number;
  /** Most characters of the whole packet text, escaping included (`MAX_SAVED_CHARS`). */
  readonly maxChars?: number;
}

interface OutMark {
  readonly parts: number;
  readonly elements: number;
  readonly deltas: number;
  readonly chars: number;
}

type Attrs = readonly (readonly [string, string])[];

// The layout of each kind of part, in one place: what is written and what a part is counted as are the same string.
const openTag = (tag: string, attrs: Attrs, empty: boolean): string =>
  `<${tag}${attrs.map(([k, v]) => ` ${k}="${escapeAttr(v)}"`).join('')}${empty ? '\n/>' : '\n>'}`;
const closeTag = (tag: string): string => `</${tag}\n>`;
const textTag = (tag: string, content: string): string => (content === '' ? `<${tag}\n/>` : `<${tag}\n>${escapeText(content)}</${tag}\n>`);

/**
 * Writes the elements in the viewer's own layout (`<tag a="v"\n>`, `</tag\n>`, `<tag\n/>`), so a saved packet reads like
 * the ones the viewer writes. Only the checksum depends on the bytes, and it covers the template and datasets, not this.
 *
 * It also keeps the three counts a packet is refused over: elements (counted as they are written), deltas (counted by
 * the writer of each unit with `delta`, mirroring what the reader makes of that unit) and characters (every part counted
 * as it is pushed, escaped; an element that is opened is counted with its closing tag, so the packet is within budget at
 * every point, not only when it is closed). Callers stay within all three by checking before a write (`fits`, `reserve`)
 * or by taking a write back (`attempt`), so a unit is written whole or not at all. A unit that wrote a character XML
 * forbids is taken back the same way (`takeTaint`): text written to the form is cleaned on the way in (`cleanXmlText`),
 * so this is a backstop that keeps one bad unit from costing the whole packet.
 */
class Out {
  readonly parts: string[] = [];
  readonly #maxElements: number;
  readonly #maxDeltas: number;
  readonly #maxChars: number;
  #elements = 0;
  #deltas = 0;
  #chars = 0;
  #prepaid = false;
  #tainted = false;
  /** How many units were left out for want of budget; a container compares it before and after to see whether it lost content. */
  omitted = 0;

  constructor(budget: Required<PacketBudget>) {
    this.#maxElements = budget.maxElements;
    this.#maxDeltas = budget.maxDeltas;
    this.#maxChars = budget.maxChars;
  }

  /** Opens an element. One that has content is counted with its closing tag (`close` then counts nothing). */
  open(tag: string, attrs: Attrs, empty: boolean): void {
    this.raw(openTag(tag, attrs, empty));
    if (!empty) this.#charge(closeTag(tag).length);
    this.#tally();
  }

  text(tag: string, content: string): void {
    this.raw(textTag(tag, content));
    this.#tally();
  }

  close(tag: string): void {
    this.parts.push(closeTag(tag));
  }

  /** Writes text that is not an element (a property's own text, already escaped). */
  raw(part: string): void {
    if (firstIllegalXmlChar(part) !== -1) this.#tainted = true;
    this.parts.push(part);
    this.#charge(part.length);
  }

  /** Starts the element count: the `form` root, written first, is not one of the elements the reader counts. */
  countFromHere(): void {
    this.#elements = 0;
  }

  /** Counts `n` deltas, the ones the reader will make of what is being written (unless `reserve` counted them already). */
  delta(n: number): void {
    if (!this.#prepaid) this.#deltas += n;
  }

  /** True when `elements` more elements, `deltas` more deltas and `chars` more characters are within the budget. */
  fits(elements: number, deltas = 0, chars = 0): boolean {
    return this.#elements + elements <= this.#maxElements && this.#deltas + deltas <= this.#maxDeltas && this.#chars + chars <= this.#maxChars;
  }

  /** Counts the elements, deltas and characters that `prepaid` will write, or answers false (and counts nothing) when they do not fit. */
  reserve(elements: number, deltas: number, chars: number): boolean {
    if (!this.fits(elements, deltas, chars)) return false;
    this.#elements += elements;
    this.#deltas += deltas;
    this.#chars += chars;
    return true;
  }

  /** Runs a write whose elements and deltas were already counted by `reserve`. */
  prepaid(write: () => void): void {
    this.#prepaid = true;
    try {
      write();
    } finally {
      this.#prepaid = false;
    }
  }

  /** Where the output stands now, to `rewind` to. */
  mark(): OutMark {
    return { parts: this.parts.length, elements: this.#elements, deltas: this.#deltas, chars: this.#chars };
  }

  /** True once (and then forgets) when something written since the last answer holds a character XML forbids. */
  takeTaint(): boolean {
    const was = this.#tainted;
    this.#tainted = false;
    return was;
  }

  /** Takes back everything written since `mark`. */
  rewind(mark: OutMark): void {
    this.#tainted = false;
    this.parts.length = mark.parts;
    this.#elements = mark.elements;
    this.#deltas = mark.deltas;
    this.#chars = mark.chars;
  }

  /**
   * Runs a write and keeps it when it stays within the budget; otherwise takes back everything it wrote. Answers whether
   * something was written and kept: a write that wrote nothing (a clean unit) is not an omission.
   */
  attempt(write: () => void): boolean {
    const mark = this.mark();
    write();
    if (this.parts.length === mark.parts) {
      this.rewind(mark);
      return false;
    }
    if (this.takeTaint()) {
      this.rewind(mark);
      this.omitted += 1;
      return false;
    }
    if (this.fits(0)) return true;
    this.rewind(mark);
    this.omitted += 1;
    return false;
  }

  #tally(): void {
    if (!this.#prepaid) this.#elements += 1;
  }

  #charge(chars: number): void {
    if (!this.#prepaid) this.#chars += chars;
  }
}

const formAttrs = (dom: FormDom, checksum: string): Attrs => [['checksum', checksum], ['xmlns', formNamespace(dom.model.namespace)]];

/** True when the node is not written in the template: created by a script, or a default property listed by a write. */
const isRunTime = (node: FormNode): boolean => node.template.implicit;

/**
 * The item lists of every field as the merge left them (bound lists filled from the data), captured before any script
 * runs. A list is UI state when it differs from this: a script cleared, refilled or extended it.
 */
export type ItemsBaseline = ReadonlyMap<FormNode, string>;

const listKey = (field: FormNode): string =>
  field
    .childrenOfClass('items')
    .map((b) => `${b.attr('save') ?? ''}\u0002${b.children.map((c) => c.plainText).join('\u0000')}`)
    .join('\u0001');

export function captureItemsBaseline(dom: FormDom): ItemsBaseline {
  const baseline = new Map<FormNode, string>();
  dom.walk((node) => {
    if (node.className === 'field' && node.childrenOfClass('items').length > 0) baseline.set(node, listKey(node));
  });
  return baseline;
}

/**
 * A field's lists are written whole when they no longer match the merge (a script cleared, refilled or rewrote them) or
 * when a list itself was created at run time (the template wrote none). Items the merge fills into lists the template
 * declares (`bindItems`) are rebuilt from the data on every open, so as long as they match they are not UI state; this
 * is also what the viewer writes (corpus oracle).
 */
function itemsChanged(items: FormNode, baseline: ItemsBaseline): boolean {
  const field = items.parent;
  if (field === null || field.className !== 'field') return false;
  return baseline.get(field) !== listKey(field) || field.childrenOfClass('items').some(isRunTime);
}

/**
 * Builds the form packet: the UI state scripts set at run time (attributes, captions, item lists, text variables, unbound
 * values), arranged as the template tree with only the changed branches, as the viewer writes it. `restore` reads the
 * same vocabulary (`classes.ts`). Deterministic: document order, attributes in first-write order.
 *
 * THE READER'S CEILING: the reader refuses a packet of more than `maxElements` elements whole, losing all of its saved
 * state, so the writer never writes one. Elements are counted as they are written; a unit that would pass the ceiling is
 * left out whole - a container with its subtree, a property with its subtree, a field's pair of item lists, a variables
 * block - never cut in part (a half list would restore a different list), and the rest of the packet is still written.
 * Under the ceiling the output is unchanged.
 *
 * The reader also refuses a packet that makes more than `maxDeltas` deltas, so those are counted too, as the reader makes
 * them: one per attribute written on a container or property, one per text (a leaf property, a text variable, a field's
 * value), one per field's pair of item lists. A unit past that budget is left out whole in the same way. (The reader's
 * third ceiling, on entries it cannot match, is not reachable from here: the writer only writes nodes of the form tree it
 * is writing, in the vocabulary the reader reads.)
 */
export function buildFormPacket(dom: FormDom, checksum: string, baseline: ItemsBaseline, budget: PacketBudget = {}): string {
  const out = new Out({
    maxElements: budget.maxElements ?? MAX_SAVED_ELEMENTS,
    maxDeltas: budget.maxDeltas ?? MAX_SAVED_DELTAS,
    maxChars: budget.maxChars ?? MAX_SAVED_CHARS,
  });
  const dirty = new Map<FormNode, boolean>();

  const isDirty = (node: FormNode): boolean => {
    const known = dirty.get(node);
    if (known !== undefined) return known;
    let result: boolean;
    if (node.className === 'items') {
      result = itemsChanged(node, baseline);
    } else {
      const own = node.writtenAttributeNames.some((a) => a !== 'name') || node.hasWrittenText || isRunTime(node);
      result = own || node.children.some((c) => (CONTAINER_CLASSES.has(c.className) || PROPERTY_CLASSES.has(c.className) || c.className === 'variables') && isDirty(c));
    }
    dirty.set(node, result);
    return result;
  };

  const writtenAttrs = (node: FormNode): [string, string][] =>
    node.writtenAttributeNames.filter((a) => isSettable(node.className, a)).map((a): [string, string] => [a, node.attr(a) ?? '']);

  const itemsAttrs = (items: FormNode): [string, string][] =>
    ITEMS_ATTRIBUTES.flatMap((a): [string, string][] => (items.isSpecified(a) ? [[a, items.attr(a) ?? '']] : []));

  const writeItems = (items: FormNode): void => {
    out.open('items', itemsAttrs(items), items.children.length === 0);
    if (items.children.length === 0) return;
    for (const item of items.children) out.text(item.className, item.plainText);
    out.close('items');
  };

  /** The elements a field's item lists take: the reader takes both lists together, so they are written together or not at all. */
  const itemsSize = (lists: readonly FormNode[]): number => lists.reduce((total, list) => total + 1 + list.children.length, 0);

  /** The characters the lists take as `writeItems` writes them, escaped. */
  const itemsChars = (lists: readonly FormNode[]): number =>
    lists.reduce((total, list) => {
      if (list.children.length === 0) return total + openTag('items', itemsAttrs(list), true).length;
      const members = list.children.reduce((sum, item) => sum + textTag(item.className, item.plainText).length, 0);
      return total + openTag('items', itemsAttrs(list), false).length + members + closeTag('items').length;
    }, 0);

  /** True when a list's attributes or item text hold a character XML forbids (the writer would leave the lists out). */
  const itemsTainted = (items: FormNode): boolean =>
    itemsAttrs(items).some(([, v]) => firstIllegalXmlChar(v) !== -1) || items.children.some((c) => firstIllegalXmlChar(c.plainText) !== -1);

  /** Property children to write: the changed ones, plus the lower slots of a written edge or corner (matched by index). */
  const propertyChildren = (node: FormNode): FormNode[] => {
    const children = node.children.filter((c) => PROPERTY_CLASSES.has(c.className));
    const lastDirty = new Map<string, number>();
    children.forEach((c, i) => {
      if (SLOTTED_CLASSES.has(c.className) && isDirty(c)) lastDirty.set(c.className, i);
    });
    return children.filter((c, i) => isDirty(c) || (SLOTTED_CLASSES.has(c.className) && i <= (lastDirty.get(c.className) ?? -1)));
  };

  const writeProperty = (node: FormNode): void => {
    if (node.className === 'items') return writeItems(node);
    const attrs = writtenAttrs(node);
    const children = propertyChildren(node);
    // The reader makes one delta of each attribute, and one of the text of an element that holds no property element.
    out.delta(attrs.length + (TEXT_CLASSES.has(node.className) && children.length === 0 ? 1 : 0));
    if (TEXT_CLASSES.has(node.className) && node.children.length === 0) {
      if (attrs.length === 0) return out.text(node.className, node.hasWrittenText || isRunTime(node) ? node.plainText : '');
    }
    const text = TEXT_CLASSES.has(node.className) && (node.hasWrittenText || isRunTime(node)) ? node.plainText : '';
    out.open(node.className, attrs, children.length === 0 && text === '');
    if (children.length === 0 && text === '') return;
    if (text !== '') out.raw(escapeText(text));
    for (const child of children) writeProperty(child);
    out.close(node.className);
  };

  /** `earlier` is how many blocks before this one were not written; the reader matches blocks by position, so each leaves an empty one. */
  const writeVariables = (variables: FormNode, earlier: number): void => {
    const texts = variables.children.filter((c) => c.className === 'text');
    if (!texts.some((t) => t.hasWrittenText)) return;
    for (let i = 0; i < earlier; i += 1) out.open('variables', [], true);
    out.delta(texts.length);
    out.open('variables', [], false);
    for (const t of texts) out.text('text', t.plainText);
    out.close('variables');
  };

  const managerAttrs = (node: FormNode): Attrs => [['name', `_${node.name}`]];

  /**
   * What stands in for a container that is not written when one of the same name after it is: the reader (and the viewer)
   * match same-named siblings by position, so without it the later one would be taken for the earlier. It makes no delta
   * and no skip: a bare container, preceded by the instance manager a subform always has.
   */
  const writePlaceholder = (node: FormNode): void => {
    if (node.className === 'subform') out.open('instanceManager', managerAttrs(node), true);
    out.open(node.className, [['name', node.name]], true);
  };

  const placeholderSize = (node: FormNode): { elements: number; chars: number } => ({
    elements: node.className === 'subform' ? 2 : 1,
    chars: (node.className === 'subform' ? openTag('instanceManager', managerAttrs(node), true).length : 0) + openTag(node.className, [['name', node.name]], true).length,
  });

  /**
   * Writes a container, preceded by `earlier` placeholders for the same-named siblings before it that were not written,
   * and answers whether it was written. A container that is clean, past the budget, or only an empty shell writes nothing
   * (not even the placeholders), and the caller counts it as one more sibling to hold a place for.
   */
  const writeContainer = (node: FormNode, isRoot: boolean, earlier = 0): boolean => {
    if (!isRoot && !isDirty(node)) return false;
    const instanced = node.className === 'subform' && !isRoot;
    const attrs: [string, string][] = [['name', node.name], ...writtenAttrs(node)];
    const children = node.children.filter((c) => (CONTAINER_CLASSES.has(c.className) || c.className === 'variables' ? isDirty(c) : false));
    const properties = new Set(propertyChildren(node));
    const empty = children.length === 0 && properties.size === 0;
    const held = earlier === 0 ? { elements: 0, chars: 0 } : placeholderSize(node);
    const own = (instanced ? openTag('instanceManager', managerAttrs(node), true).length : 0) + openTag(node.className, attrs, empty).length + (empty ? 0 : closeTag(node.className).length);
    // The container's own attributes are deltas (the name is not): it is written with them or, past the budget, with its subtree not at all.
    if (!out.fits(earlier * held.elements + (instanced ? 2 : 1), attrs.length - 1, earlier * held.chars + own)) {
      out.omitted += 1;
      return false;
    }
    const start = out.mark();
    for (let i = 0; i < earlier; i += 1) writePlaceholder(node);
    out.delta(attrs.length - 1);
    if (instanced) out.open('instanceManager', managerAttrs(node), true);
    out.open(node.className, attrs, empty);
    // An attribute value XML cannot hold: the container is left out with its subtree, as one past the budget is.
    if (out.takeTaint() && !isRoot) {
      out.rewind(start);
      out.omitted += 1;
      return false;
    }
    if (empty) return true;
    const opened = out.mark();
    const omittedBefore = out.omitted;
    // Text variables first, as the viewer writes them; then the containers and properties in template order.
    let unwrittenBlocks = 0;
    for (const block of node.childrenOfClass('variables')) {
      const before = unwrittenBlocks;
      unwrittenBlocks = out.attempt(() => writeVariables(block, before)) ? 0 : unwrittenBlocks + 1;
    }
    const unwritten = new Map<string, number>();
    const lists = node.children.filter((c) => c.className === 'items' && properties.has(c));
    let listsKept: boolean | undefined;
    for (const child of node.children) {
      if (CONTAINER_CLASSES.has(child.className)) {
        const group = `${child.className}#${child.name}`;
        const before = unwritten.get(group) ?? 0;
        unwritten.set(group, writeContainer(child, false, before) ? 0 : before + 1);
      } else if (!properties.has(child)) continue;
      else if (child.className === 'items') {
        if (listsKept === undefined) {
          // Both lists make one delta, and are written together or not at all - also when one holds a character XML forbids.
          listsKept = !lists.some(itemsTainted) && out.reserve(itemsSize(lists), 1, itemsChars(lists));
          if (!listsKept) out.omitted += 1;
        }
        if (listsKept) out.prepaid(() => writeProperty(child));
      } else out.attempt(() => writeProperty(child));
    }
    // A container that was written only to hold something that did not fit says nothing: it is left out, not kept as an empty shell.
    if (!isRoot && out.omitted > omittedBefore && out.mark().parts === opened.parts && attrs.length === 1) {
      out.rewind(start);
      return false;
    }
    out.close(node.className);
    return true;
  };

  out.open('form', formAttrs(dom, checksum), false);
  out.countFromHere();
  writeContainer(dom.root, true);
  out.close('form');
  return out.parts.join('');
}

/**
 * A packet that carries no UI state: the `form` root with a checksum over the template and datasets and the bare root
 * subform, the shape of a form nothing has changed. It is what a packet is replaced with when the one built cannot be
 * re-read, so a packet beside new datasets never keeps a checksum that no longer matches them.
 */
export function emptyFormPacket(dom: FormDom, checksum: string): string {
  return openTag('form', formAttrs(dom, checksum), false) + openTag('subform', [['name', dom.root.name]], true) + closeTag('form');
}
