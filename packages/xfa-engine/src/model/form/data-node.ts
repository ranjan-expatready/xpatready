import type { Attr, Element, Node } from '@xmldom/xmldom';
import { XfaPdfError } from '../../pdf/errors.js';
import { parseXml } from '../../xml/parse.js';
import { serializeXml } from '../../xml/serialize.js';
import { cleanXmlText } from '../../xml/chars.js';
import { MAX_XML_ATTRIBUTE_CHARS } from '../../xml/limits.js';
import { measureXml, serializedLength } from './data-budget.js';
import { invalidArgument, invalidOperation, limitExceeded } from './errors.js';
import { MAX_VALUE_CHARS } from './limits.js';
import { NodeListNode, type ListSource } from './node-list.js';
import type { FormDom } from './dom.js';
import { childElements, dataPathOf, dropFormattingWhitespace, elementKind, findRichData, isWithin, nodeText, XFA_DATA_NAMESPACE } from './data-dom.js';

export type DataClassName = 'dataModel' | 'dataGroup' | 'dataValue';

/** The links xmldom keeps on a node: plain writable properties of the instance, declared `readonly` by its types. */
interface Links {
  parentNode: Node | null;
  previousSibling: Node | null;
  nextSibling: Node | null;
  firstChild: Node | null;
}

/**
 * Removes every child of `parent` (elements, text, comments) and returns the removed elements in document order. `removeChild`
 * re-indexes the whole `childNodes` list of the parent on every call, so removing the children one by one is quadratic (20,000
 * children took 5 s, 199,000 over 15 minutes). Here each child is unlinked by one write to its own links, exactly as xmldom's own
 * `normalize` unlinks a run of text nodes; the stale index slots are dropped; and the one child left is taken out by the real
 * `removeChild`, which re-indexes the (now empty) list once and advances the document's change counter that live lists
 * (`getElementsByTagName`) check. `@xmldom/xmldom` is pinned to one version and `load-xml-scale.test.ts` pins the resulting tree.
 */
function detachChildren(parent: Element): Element[] {
  const removed: Element[] = [];
  const last = parent.lastChild;
  if (last === null) return removed;
  for (let child = parent.firstChild; child !== null && child !== last; ) {
    const next: Node | null = child.nextSibling;
    if (child.nodeType === 1) removed.push(child as Element);
    const links = child as unknown as Links;
    links.parentNode = null;
    links.previousSibling = null;
    links.nextSibling = null;
    child = next;
  }
  const index = parent.childNodes as unknown as Record<number, Node | undefined>;
  for (let i = 1; i < parent.childNodes.length; i += 1) delete index[i];
  (parent as unknown as Links).firstChild = last;
  (last as unknown as Links).previousSibling = null;
  if (last.nodeType === 1) removed.push(last as Element);
  parent.removeChild(last);
  return removed;
}

/** Attribute names that carry data-model metadata or namespace declarations, never data. */
function isMetaAttribute(attr: Attr): boolean {
  return attr.name === 'xmlns' || attr.name.startsWith('xmlns:') || (attr.namespaceURI === XFA_DATA_NAMESPACE && attr.localName === 'dataNode');
}

/**
 * A node of the data DOM (`xfa.datasets`, `xfa.data` and everything below), wrapping one XML element or attribute of the
 * caller's datasets document. XML attributes are data values of their element reachable by name (`item.lic.value`); they
 * are not in `nodes`. Identity is stable: the same element always gives the same wrapper (see `FormDom.dataNodeFor`).
 */
export class DataNode {
  readonly id: number;
  readonly element: Element | Attr;
  readonly dom: FormDom;
  #list: NodeListNode | undefined;
  #kids: { readonly version: number; readonly nodes: readonly DataNode[] } | undefined;

  constructor(dom: FormDom, element: Element | Attr) {
    this.dom = dom;
    this.element = element;
    this.id = dom.register(this);
  }

  get className(): DataClassName {
    if (this.element.nodeType !== 1) return 'dataValue';
    if (this.element === this.dom.datasetsDocument.documentElement) return 'dataModel';
    return elementKind(this.element);
  }

  get name(): string {
    return this.element.localName ?? this.element.nodeName;
  }

  get parent(): DataNode | null {
    const up = this.element.nodeType === 2 ? (this.element).ownerElement : this.element.parentNode;
    return up !== null && up.nodeType === 1 ? this.dom.dataNodeFor(up as Element) : null;
  }

  /** Child elements in document order, cached until the next structural change. */
  get children(): readonly DataNode[] {
    if (this.element.nodeType !== 1) return [];
    if (this.#kids?.version !== this.dom.dataVersion) {
      this.#kids = { version: this.dom.dataVersion, nodes: childElements(this.element).map((e) => this.dom.dataNodeFor(e)) };
    }
    return this.#kids.nodes;
  }

  /** The first child element called `name`, else the attribute called `name` (`index` counts child elements of that name). */
  child(name: string, index = 0): DataNode | undefined {
    const named = this.children.filter((c) => c.name === name);
    if (named[index] !== undefined) return named[index];
    if (index !== 0 || this.element.nodeType !== 1) return undefined;
    const attributes = (this.element).attributes;
    for (let i = 0; i < attributes.length; i += 1) {
      const attr = attributes.item(i);
      if (attr !== null && !isMetaAttribute(attr) && (attr.localName ?? attr.name) === name) return this.dom.dataNodeFor(attr);
    }
    return undefined;
  }

  get value(): string {
    return this.element.nodeType === 2 ? (this.element).value : nodeText(this.element);
  }

  set value(written: string) {
    if (written.length > MAX_VALUE_CHARS) throw limitExceeded(`a data value may hold at most ${MAX_VALUE_CHARS} characters`);
    const text = cleanXmlText(written);
    if (this.element.nodeType === 2) {
      const attr = this.element;
      // The saved datasets are re-opened with this ceiling, which is lower than the one for a value.
      // The re-parse counts the source text, where `&` is `&amp;`, so the ceiling applies to the escaped length.
      if (serializedLength(text, true) > MAX_XML_ATTRIBUTE_CHARS) throw limitExceeded(`a data attribute value may hold at most ${MAX_XML_ATTRIBUTE_CHARS} characters once escaped`);
      this.dom.chargeAttribute(text, attr.value);
      const changed = attr.value !== text;
      attr.value = text;
      attr.nodeValue = text;
      if (changed) this.dom.touch();
      return;
    }
    const element = this.element;
    if (elementKind(element) === 'dataGroup') throw invalidOperation('a data group has no value to assign');
    this.dom.writeText(element, text);
  }

  get nodes(): NodeListNode {
    this.#list ??= new NodeListNode(this.dom, this, this.#source());
    return this.#list;
  }

  /** `xfa.data.saveXML()`: the node serialized as XML text. */
  saveXML(): string {
    if (this.element.nodeType !== 1) throw invalidOperation('saveXML needs a data group or data value element');
    try {
      return serializeXml(this.element);
    } catch (e) {
      // A script called this: the failure is its to catch, not a failed load.
      if (e instanceof XfaPdfError) throw invalidOperation(`saveXML cannot serialize this data: ${e.message}`, { cause: e });
      throw e;
    }
  }

  /**
   * `loadXML(xml, ignoreRoot, overwrite)` on a data group: parses `xml` (with the XML safety rules and ceilings of
   * `parseXml`) and imports it under this node. `ignoreRoot` imports the root element's children instead of the root;
   * `overwrite` first removes everything already under this node, otherwise the new nodes are appended. The indentation
   * between elements is not imported (`dropFormattingWhitespace`). When the
   * nodes removed from the form data had form nodes bound to them, the form is re-merged so it and the data agree.
   */
  loadXML(xml: string, ignoreRoot: boolean, overwrite: boolean): void {
    if (this.element.nodeType !== 1 || this.className === 'dataValue') throw invalidOperation('loadXML needs a data group');
    if (xml.length > MAX_VALUE_CHARS) throw limitExceeded(`loaded XML may hold at most ${MAX_VALUE_CHARS} characters`);
    this.dom.chargeLoadedChars(xml.length);
    let parsed;
    try {
      parsed = parseXml(xml);
    } catch (e) {
      if (e instanceof XfaPdfError) throw invalidArgument(`loadXML was given text that cannot be loaded: ${e.message}`);
      throw e;
    }
    const source = parsed.documentElement;
    if (source === null) throw invalidArgument('loadXML was given a document with no root element');
    dropFormattingWhitespace(source);
    // The target is part of the form when it is below xfa:data, is it, or holds it (the datasets root); a list of values elsewhere is not read as values.
    const root = this.dom.dataElement;
    const target = this.element;
    const inForm = root !== undefined && (isWithin(root, target) || isWithin(target, root));
    const rich = inForm ? findRichData(source) : undefined;
    if (rich !== undefined) throw invalidArgument(`loadXML was given rich-text data (xfa:contentType or XHTML content) at ${dataPathOf(rich)}, which is not supported`);
    const imports = ignoreRoot ? childElements(source) : [source];
    let elements = 0;
    let serialized = 0;
    for (const node of imports) {
      const measured = measureXml(node);
      elements += measured.elements;
      serialized += measured.serialized;
    }
    // Charged before anything is removed or imported, so a refused load changes no data (the text it was given stays counted).
    this.dom.chargeImported(elements, serialized);
    const removed = overwrite ? detachChildren(target) : [];
    for (const node of imports) target.appendChild(this.dom.datasetsDocument.importNode(node, true));
    this.dom.touchData();
    if (inForm) this.dom.afterDataRemoval(removed);
  }

  #source(): ListSource {
    return {
      size: () => this.children.length,
      at: (i) => this.children[i],
      add: (node) => {
        if (!(node instanceof DataNode) || node.dom !== this.dom || node.element.nodeType !== 1 || this.element.nodeType !== 1) {
          throw invalidArgument('only a data element of this form can be appended to a data node');
        }
        const parent = this.element;
        for (let up: Element | null = parent; up !== null; up = up.parentNode !== null && up.parentNode.nodeType === 1 ? (up.parentNode as Element) : null) {
          if (up === node.element) throw invalidOperation('a data node cannot be appended to its own descendant');
        }
        // Rich text may sit in a list of values outside the form data, but not move into it past the check made where data enters.
        const root = this.dom.dataElement;
        if (root !== undefined && isWithin(root, parent)) {
          const rich = findRichData(node.element);
          if (rich !== undefined) throw invalidArgument(`a data node holding rich-text data (xfa:contentType or XHTML content) at ${dataPathOf(rich)} cannot be appended to the form data, which is not supported`);
        }
        parent.appendChild(node.element);
        this.dom.touchData();
      },
      delete: (node) => {
        if (!(node instanceof DataNode) || node.element.parentNode !== this.element) throw invalidOperation('the node is not a child of this data node');
        // The form is affected when the node leaves the form data or holds the xfa:data element itself; the list of values is neither.
        const root = this.dom.dataElement;
        const inForm = root !== undefined && (isWithin(root, this.element) || isWithin(node.element, root));
        (this.element as Element).removeChild(node.element);
        this.dom.touchData();
        if (inForm && node.element.nodeType === 1) this.dom.afterDataRemoval([node.element]);
      },
    };
  }
}

