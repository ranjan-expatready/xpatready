import { Node, type Document, type Element } from '@xmldom/xmldom';
import { XfaPdfError } from '../../pdf/errors.js';
import { safeText } from '../../pdf/safe-text.js';
import { cleanXmlText } from '../../xml/chars.js';
import { forEachNode } from '../../xml/walk.js';
import { MAX_NAME_CHARS } from './limits.js';

export const XFA_DATA_NAMESPACE = 'http://www.xfa.org/schema/xfa-data/1.0/';
export const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const XSI_NAMESPACE = 'http://www.w3.org/2001/XMLSchema-instance';

/** The child elements of `parent`, in document order. */
export function childElements(parent: Element): Element[] {
  const out: Element[] = [];
  for (let child = parent.firstChild; child !== null; child = child.nextSibling) {
    if (child.nodeType === Node.ELEMENT_NODE) out.push(child as Element);
  }
  return out;
}

/** XML whitespace only (space, tab, CR, LF): a no-break space is text. */
const XML_WHITESPACE = /^[ \t\r\n]*$/;

/**
 * Removes the formatting whitespace of a parsed fragment: whitespace-only text nodes that sit beside child elements (the
 * indentation of a pretty-printed list of values). A data group's text is not data, and the viewer stores such a list
 * without it (the blank forms' own lists of values, loaded from indented script text, carry none). Whitespace that is an
 * element's whole content is a value and is kept. Iterative: nesting is as deep as the fragment's author chose.
 */
export function dropFormattingWhitespace(root: Element): void {
  const pending: Element[] = [root];
  for (let element = pending.pop(); element !== undefined; element = pending.pop()) {
    const children = Array.from(element.childNodes);
    const mixed = children.some((c) => c.nodeType === Node.ELEMENT_NODE);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) pending.push(child as Element);
      else if (mixed && child.nodeType === Node.TEXT_NODE && XML_WHITESPACE.test(child.nodeValue ?? '')) element.removeChild(child);
    }
  }
}

/** The text of an element: its own text and CDATA children, concatenated (a data value is never mixed content). */
export function nodeText(element: Element): string {
  let text = '';
  for (let child = element.firstChild; child !== null; child = child.nextSibling) {
    if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) text += child.nodeValue ?? '';
  }
  return text;
}

/** Replaces all content of `element` with one text node (nothing for the empty string). Text XML cannot hold is cleaned first. */
export function replaceText(element: Element, rawText: string): void {
  const text = cleanXmlText(rawText);
  // A value written to a node marked xsi:nil is no longer null; keeping the marker would save a filled field as null.
  if (element.hasAttributeNS(XSI_NAMESPACE, 'nil')) element.removeAttributeNS(XSI_NAMESPACE, 'nil');
  while (element.firstChild !== null) element.removeChild(element.firstChild);
  if (text !== '') element.appendChild(ownerOf(element).createTextNode(text));
}

/** The document an element belongs to; every element the engine touches came from one. */
export function ownerOf(element: Element): Document {
  if (element.ownerDocument === null) throw new XfaPdfError('MALFORMED_XML', 'Malformed XML: a data element has no owner document');
  return element.ownerDocument;
}

/**
 * XFA data DOM kind of an element: a dataGroup when it has child elements or is marked `xfa:dataNode="dataGroup"`
 * (the way an empty group is written), a dataValue otherwise (or when marked `dataValue`).
 */
export function elementKind(element: Element): 'dataGroup' | 'dataValue' {
  const marker = element.getAttributeNS(XFA_DATA_NAMESPACE, 'dataNode');
  if (marker === 'dataGroup') return 'dataGroup';
  if (marker === 'dataValue') return 'dataValue';
  // Rich text is a value whose markup is its content, never a group (load refuses it; this keeps it from being taken for one).
  if (element.hasAttributeNS(XFA_DATA_NAMESPACE, 'contentType')) return 'dataValue';
  for (let child = element.firstChild; child !== null; child = child.nextSibling) {
    if (child.nodeType === Node.ELEMENT_NODE && (child as Element).namespaceURI !== XHTML_NAMESPACE) return 'dataGroup';
  }
  return 'dataValue';
}

/** The `xfa:data` element of a datasets document (the first, as the merge picks it), or undefined when there is none yet. */
export function existingDataElement(doc: Document): Element | undefined {
  const root = doc.documentElement;
  if (root === null) return undefined;
  for (const child of childElements(root)) {
    if ((child.localName ?? child.nodeName) === 'data' && child.namespaceURI === XFA_DATA_NAMESPACE) return child;
  }
  return undefined;
}

/**
 * The first data element that holds rich text (an `xfa:contentType` attribute, or XHTML markup inside), or undefined.
 * The data DOM here models plain values only; rich-text values are refused where data enters (`createFormDom`, `loadXML`)
 * instead of being taken for groups and merged wrongly. Iterative: depth is attacker-chosen.
 */
export function findRichData(root: Node): Element | undefined {
  let found: Element | undefined;
  forEachNode(root, (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    let hit: Element | undefined;
    if (element.hasAttributeNS(XFA_DATA_NAMESPACE, 'contentType')) hit = element;
    else if (element.namespaceURI === XHTML_NAMESPACE) hit = element.parentNode?.nodeType === Node.ELEMENT_NODE ? (element.parentNode as Element) : element;
    // Traversal order is unspecified, so keep the earliest in document order for a stable message.
    if (hit !== undefined && (found === undefined || (found.compareDocumentPosition(hit) & 2) !== 0)) found = hit;
  });
  return found;
}

/** `a.b.c` from the document element down to `element`, at most 12 names, each cleaned for echoing. */
export function dataPathOf(element: Element): string {
  const names: string[] = [];
  for (let up: Node | null = element; up !== null && up.nodeType === Node.ELEMENT_NODE; up = up.parentNode) names.push(safeText((up as Element).localName ?? up.nodeName));
  return names.reverse().slice(-12).join('.');
}

const isNameStart = (c: number): boolean => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
const isNameChar = (c: number): boolean => isNameStart(c) || (c >= 48 && c <= 57) || c === 45;

/** True for an ASCII XML name without colon or dot (a dot is the SOM separator, so such a node could not be addressed): the only names the engine writes into the data DOM (fail closed for the rest). */
export function isDataName(name: string): boolean {
  if (name.length === 0 || name.length > MAX_NAME_CHARS || !isNameStart(name.charCodeAt(0))) return false;
  for (let i = 1; i < name.length; i += 1) if (!isNameChar(name.charCodeAt(i))) return false;
  return true;
}

export function assertDataName(name: string, what: string): void {
  if (!isDataName(name)) {
    throw new XfaPdfError('UNSUPPORTED_FEATURE', `Unsupported XFA feature: ${what} name "${safeText(name)}" is not a valid data element name`);
  }
}

/** Creates an element in no namespace; a group with no content is marked so it re-parses as a group. */
export function createDataElement(doc: Document, name: string): Element {
  return doc.createElement(name);
}

export function markEmptyGroup(element: Element): void {
  if (childElements(element).length === 0) element.setAttributeNS(XFA_DATA_NAMESPACE, 'xfa:dataNode', 'dataGroup');
}

/** True when `node` is `ancestor` or sits below it. */
export function isWithin(ancestor: Node, node: Node): boolean {
  for (let up: Node | null = node; up !== null; up = up.parentNode) if (up === ancestor) return true;
  return false;
}
