import type { Element } from '@xmldom/xmldom';
import { parseAttributeValue } from '../form/attributes.js';
import { XfaFormError, type FormDom, type FormNode } from '../form/index.js';
import { MAX_ITEMS_PER_LIST, MAX_VALUE_CHARS } from '../form/limits.js';
import { CONTAINER_CLASSES, PROPERTY_CLASSES, TEXT_CLASSES } from './classes.js';

/**
 * FD-38 exemption (security invariant): most deltas one saved form packet may hold. A real packet holds a few thousand
 * at most (every caption, colour and list of a long form); past this the packet is treated as hostile and ignored whole.
 */
export const MAX_SAVED_DELTAS = 20_000;

/**
 * FD-38 exemption (security invariant): most saved entries one form packet may leave unread (no matching node, a refused
 * class or attribute, an invalid value) before the packet is treated as hostile and ignored whole, exactly as one past
 * `MAX_SAVED_DELTAS` is. A real packet skips a handful at most; without a ceiling the skipped entries are work the reader
 * does for nothing, bounded only by the packet's element ceiling.
 */
export const MAX_SAVED_SKIPPED = 20_000;

/**
 * FD-38 exemption (security invariant): most saved elements one form packet may make the reader visit, counted whether or
 * not an element yields a delta or a skip (an empty `<variables/>` yields neither). Without it the work done for a
 * packet that adds nothing to the form is bounded only by the packet's element ceiling (`MAX_XML_ELEMENTS`, 200,000);
 * past this the packet is treated as hostile and ignored whole, exactly as one past `MAX_SAVED_DELTAS` is. A real
 * packet holds a few thousand elements: one per delta plus the wrappers around it.
 */
export const MAX_SAVED_ELEMENTS = 100_000;

/**
 * One saved property of the form packet, matched to the node it belongs to: what XFA scripts see as a `delta` object
 * (`getDeltas()`, `restore()`). Every delta was validated when it was read, against the same rules a script write meets.
 */
export interface Delta {
  /** The container the property belongs to (a subform's `getDeltas()` lists the deltas of its own subtree). */
  readonly container: FormNode;
  /** The property, relative to the container: `presence`, `validate.nullTest`, `caption.value.text`, `items`, `rawValue`. */
  readonly target: string;
  readonly savedValue: string;
  currentValue(): string;
  /** Puts the saved value back (what a form's restore script asks for). */
  restore(): void;
}

export interface DeltaLimits {
  readonly maxDeltas?: number;
  readonly maxSkipped?: number;
  readonly maxElements?: number;
}

/** Collects deltas from a saved form packet; anything it cannot match or would refuse is counted as skipped, never applied. */
export class DeltaReader {
  readonly deltas: Delta[] = [];
  #skipped = 0;
  #visited = 0;
  readonly #max: number;
  readonly #maxSkipped: number;
  readonly #maxElements: number;

  constructor(limits: DeltaLimits = {}) {
    this.#max = limits.maxDeltas ?? MAX_SAVED_DELTAS;
    this.#maxSkipped = limits.maxSkipped ?? MAX_SAVED_SKIPPED;
    this.#maxElements = limits.maxElements ?? MAX_SAVED_ELEMENTS;
  }

  get skipped(): number {
    return this.#skipped;
  }

  /** Matches the saved root subform to the form's root and reads everything below it. */
  readRoot(dom: FormDom, form: Element): void {
    const saved = this.#visit(elements(form)).filter((e) => e.localName === 'subform');
    for (const [i, el] of saved.entries()) {
      if (i === 0 && (el.getAttribute('name') ?? '') === dom.root.name) this.#container(el, dom.root);
      else this.#skip();
    }
  }

  /** Counts the saved elements the reader is about to walk; past the ceiling the packet is refused whole. Returns them, so a call can wrap `elements(...)`. */
  #visit(found: Element[]): Element[] {
    this.#visited += found.length;
    if (this.#visited > this.#maxElements) throw new XfaFormError('LIMIT', `a saved form packet may make the reader visit at most ${this.#maxElements} elements`);
    return found;
  }

  /** Counts one saved entry that was not read; past the ceiling the packet is refused whole, like an excess delta. */
  #skip(): void {
    this.#skipped += 1;
    if (this.#skipped > this.#maxSkipped) throw new XfaFormError('LIMIT', `a saved form packet may leave at most ${this.#maxSkipped} entries unread`);
  }

  #add(delta: Delta): void {
    if (this.deltas.length >= this.#max) throw new XfaFormError('LIMIT', `a saved form packet may hold at most ${this.#max} deltas`);
    this.deltas.push(delta);
  }

  #container(el: Element, node: FormNode): void {
    this.#attributes(el, node, node, '');
    const seen = new Map<string, number>();
    const nth = (key: string): number => {
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      return n;
    };
    const children = new ChildIndex(node);
    const saved = this.#visit(elements(el));
    for (const child of saved) {
      const tag = child.localName ?? '';
      if (tag === 'instanceManager' || tag === 'pageSet') continue;
      if (tag === 'variables') {
        this.#variables(child, node, children.listed('variables', nth('variables')));
      } else if (CONTAINER_CLASSES.has(tag)) {
        const name = child.getAttribute('name') ?? '';
        const match = children.named(tag, name, nth(`${tag}#${name}`));
        if (match === undefined) this.#skip();
        else this.#container(child, match);
      } else if (tag === 'items') {
        // Both lists are read together when the first one is met.
        if (nth('items') === 0) this.#items(saved.filter((e) => e.localName === 'items'), node);
      } else if (tag === 'value' && (node.className === 'field' || node.className === 'draw')) {
        this.#fieldValue(child, node);
      } else if (PROPERTY_CLASSES.has(tag)) {
        const target = children.ofClass(tag, nth(tag));
        if (target === undefined) this.#skip();
        else this.#property(child, target, node, tag);
      } else {
        this.#skip();
      }
    }
  }

  #attributes(el: Element, node: FormNode, container: FormNode, path: string): void {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name;
      if (name === 'name' || name === 'xmlns' || name.startsWith('xmlns:')) continue;
      let value: string;
      try {
        value = parseAttributeValue(node.className, name, attr.value);
      } catch (error) {
        if (!(error instanceof XfaFormError)) throw error;
        this.#skip();
        continue;
      }
      this.#add({
        container,
        target: `${path}${name}`,
        savedValue: value,
        currentValue: () => node.attr(name) ?? '',
        restore: () => node.setAttr(name, value),
      });
    }
  }

  #property(el: Element, node: FormNode, container: FormNode, path: string): void {
    this.#attributes(el, node, container, `${path}.`);
    const children = this.#visit(elements(el));
    if (TEXT_CLASSES.has(node.className) && children.length === 0) {
      this.#text(el.textContent ?? '', node, container, path);
      return;
    }
    const seen = new Map<string, number>();
    const oneOf = node.oneOfChild?.className;
    const own = new ChildIndex(node);
    for (const child of children) {
      const tag = child.localName ?? '';
      const index = seen.get(tag) ?? 0;
      seen.set(tag, index + 1);
      // A `ui`, `value` or `fill` keeps its own kind: a saved packet cannot swap a widget or a value type.
      const target = PROPERTY_CLASSES.has(tag) && tag !== 'items' && (oneOf === undefined || !isOneOfKind(node, tag) || oneOf === tag) ? own.ofClass(tag, index) : undefined;
      if (target === undefined) this.#skip();
      else this.#property(child, target, container, `${path}.${tag}${index === 0 ? '' : `[${index}]`}`);
    }
  }

  #text(text: string, node: FormNode, container: FormNode, path: string): void {
    if (text.length > MAX_VALUE_CHARS) {
      this.#skip();
      return;
    }
    this.#add({ container, target: path, savedValue: text, currentValue: () => node.plainText, restore: () => node.setPlainText(text) });
  }

  #variables(el: Element, node: FormNode, variables: FormNode | undefined): void {
    const texts = variables?.children.filter((c) => c.className === 'text') ?? [];
    for (const [i, child] of this.#visit(elements(el)).entries()) {
      const target = texts[i];
      if (child.localName !== 'text' || target === undefined || elements(child).length > 0) this.#skip();
      else this.#text(child.textContent ?? '', target, node, target.name === '' ? `variables.text[${i}]` : target.name);
    }
  }

  /** An unbound field's own value (bound values come from the data, never from the packet; a radio's from its group). */
  #fieldValue(el: Element, field: FormNode): void {
    const kinds = elements(el);
    const kind = kinds[0];
    const bound = field.boundElement !== null || field.parent?.className === 'exclGroup';
    if (bound || kinds.length !== 1 || kind === undefined || !TEXT_CLASSES.has(kind.localName ?? '') || elements(kind).length > 0) {
      this.#skip();
      return;
    }
    const text = kind.textContent ?? '';
    if (text.length > MAX_VALUE_CHARS) {
      this.#skip();
      return;
    }
    this.#add({
      container: field,
      target: 'rawValue',
      savedValue: text,
      currentValue: () => String(field.rawValue ?? ''),
      restore: () => {
        field.rawValue = text === '' ? null : text;
      },
    });
  }

  /** A field's item lists: replaced only when they differ, so lists filled from the data stay as the merge made them. */
  #items(lists: readonly Element[], field: FormNode): void {
    const save = lists.find((l) => l.getAttribute('save') === '1');
    const display = lists.find((l) => l !== save) ?? save;
    const members = new Map<Element, Element[]>(lists.map((l) => [l, this.#visit(elements(l))]));
    const texts = (list: Element | undefined): string[] | undefined => {
      const items = (list === undefined ? undefined : members.get(list)) ?? [];
      return items.every((i) => TEXT_CLASSES.has(i.localName ?? '') && elements(i).length === 0) ? items.map((i) => i.textContent ?? '') : undefined;
    };
    const labels = texts(display);
    const values = save === undefined ? labels : texts(save);
    const valid = field.className === 'field' && lists.length <= 2 && labels !== undefined && values !== undefined;
    if (!valid || labels.length > MAX_ITEMS_PER_LIST || labels.some((t) => t.length > MAX_VALUE_CHARS) || values.some((t) => t.length > MAX_VALUE_CHARS)) {
      this.#skip();
      return;
    }
    const saved = values.join('\n');
    this.#add({
      container: field,
      target: 'items',
      savedValue: saved,
      currentValue: () => currentLists(field).values.join('\n'),
      restore: () => {
        const now = currentLists(field);
        if (sameList(now.labels, labels) && sameList(now.values, values)) return;
        field.clearItems();
        labels.forEach((label, i) => field.addItem(label, values[i] ?? label));
      },
    });
  }
}

const ONE_OF_OWNERS: ReadonlySet<string> = new Set(['ui', 'value', 'fill']);
/** True when `tag` is one of the mutually exclusive kinds of `node` (a widget of a `ui`, a content of a `value`, a fill type). */
const isOneOfKind = (node: FormNode, tag: string): boolean => ONE_OF_OWNERS.has(node.className) && tag !== 'color' && tag !== 'extras';

/**
 * A node's listed children grouped by class and by `class#name`, in order, built on first use: matching each saved element
 * by a scan of all the children (`FormNode.element`, a filter for the `variables` blocks) is quadratic in the node's width.
 * The saved packet is read without writing to the form, so the children do not change while an index is in use.
 */
class ChildIndex {
  readonly #node: FormNode;
  #byClass: Map<string, FormNode[]> | undefined;
  #byName: Map<string, FormNode[]> | undefined;

  constructor(node: FormNode) {
    this.#node = node;
  }

  /** The `index`-th child of `className` called `name`, or undefined. */
  named(className: string, name: string, index: number): FormNode | undefined {
    this.#build();
    return this.#byName?.get(`${className}#${name}`)?.[index];
  }

  /** The `index`-th listed child of `className`, or undefined (a `variables` block has no default to fall back to). */
  listed(className: string, index: number): FormNode | undefined {
    this.#build();
    return this.#byClass?.get(className)?.[index];
  }

  /** What `FormNode.element(className, index)` answers: the `index`-th listed child of the class, else the slot's default. */
  ofClass(className: string, index: number): FormNode | undefined {
    return this.listed(className, index) ?? this.#node.slotElement(className, index);
  }

  #build(): void {
    if (this.#byClass !== undefined) return;
    const byClass = new Map<string, FormNode[]>();
    const byName = new Map<string, FormNode[]>();
    for (const child of this.#node.children) {
      push(byClass, child.className, child);
      push(byName, `${child.className}#${child.name}`, child);
    }
    this.#byClass = byClass;
    this.#byName = byName;
  }
}

function push(groups: Map<string, FormNode[]>, key: string, child: FormNode): void {
  const group = groups.get(key);
  if (group === undefined) groups.set(key, [child]);
  else group.push(child);
}

const elements = (parent: Element): Element[] => Array.from(parent.childNodes).filter((n): n is Element => n.nodeType === 1);

const sameList = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

function currentLists(field: FormNode): { labels: string[]; values: string[] } {
  const blocks = field.childrenOfClass('items');
  const save = blocks.find((b) => b.attr('save') === '1');
  const display = blocks.find((b) => b !== save) ?? save;
  const texts = (b: FormNode | undefined): string[] => b?.children.map((c) => c.plainText) ?? [];
  return { labels: texts(display), values: texts(save ?? display) };
}

