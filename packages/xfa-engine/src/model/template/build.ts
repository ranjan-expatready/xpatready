import { Node, type Document, type Element } from '@xmldom/xmldom';
import { MAX_XML_DEPTH } from '../../xml/limits.js';
import { malformedXml } from '../../xml/xml-error.js';
import { plainTextOf, richContentOf } from './rich-text.js';
import { freezeNode, TemplateNode, type AttributeEntries } from './node.js';

const XSI_NAMESPACE = 'http://www.w3.org/2001/XMLSchema-instance';

/** The element a template packet is rooted in. */
const ROOT_CLASS = 'template';

/** Rich text: the XHTML inside it is not XFA, so the element is a leaf holding the exact markup and a plain-text projection of it. */
const RICH_TEXT_CLASS = 'exData';

/** A parsed template: its nodes in document order (`nodes[n.id] === n`) and the namespace its root was written in. */
export interface TemplateModel {
  readonly root: TemplateNode;
  /** The namespace of the root element (and so of every modelled element); empty when none was written. */
  readonly namespace: string;
  readonly nodes: readonly TemplateNode[];
}

interface Pending {
  readonly element: Element;
  readonly parent: TemplateNode | null;
  readonly siblings: TemplateNode[] | null;
  readonly depth: number;
}

function attributesOf(element: Element): { entries: AttributeEntries; nil: boolean } {
  const entries: (readonly [string, string])[] = [];
  let nil = false;
  const attributes = element.attributes;
  for (let i = 0; i < attributes.length; i += 1) {
    const attr = attributes.item(i);
    if (attr === null) continue;
    if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue;
    entries.push([attr.name, attr.value]);
    if (attr.namespaceURI === XSI_NAMESPACE && attr.localName === 'nil') nil = attr.value.trim() === 'true' || attr.value.trim() === '1';
  }
  return { entries, nil };
}

function ownText(element: Element): string {
  let text = '';
  for (let child = element.firstChild; child !== null; child = child.nextSibling) {
    if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) text += child.nodeValue ?? '';
  }
  return text;
}

/** Processing instructions whose target starts with this prefix are the renderer's cached measurements (`<?renderCache.bounds …?>`). */
const RENDER_CACHE_PREFIX = 'renderCache.';

/** The `renderCache.*` processing instructions that are direct children of the element, as `NAME data` strings in document order. */
function renderCacheOf(element: Element): string[] {
  const out: string[] = [];
  for (let child = element.firstChild; child !== null; child = child.nextSibling) {
    if (child.nodeType !== Node.PROCESSING_INSTRUCTION_NODE) continue;
    const target = child.nodeName;
    if (target.startsWith(RENDER_CACHE_PREFIX)) out.push(`${target.slice(RENDER_CACHE_PREFIX.length)} ${child.nodeValue ?? ''}`);
  }
  return out;
}

/** The child elements written in the template namespace, in document order (other namespaces, comments and PIs are skipped; `renderCacheOf` reads the `renderCache.*` PIs). */
function modelledChildren(element: Element, namespace: string): Element[] {
  const out: Element[] = [];
  for (let child = element.firstChild; child !== null; child = child.nextSibling) {
    if (child.nodeType === Node.ELEMENT_NODE && (child.namespaceURI ?? '') === namespace) out.push(child as Element);
  }
  return out;
}

/**
 * Builds the immutable model of a template document. Iterative (a hostile document is as deep as its author chose, up
 * to the XML depth ceiling `parseXml` enforces, which is re-checked here for a document that did not come from it).
 * A root that is not `<template>` is `MALFORMED_XML`; the namespace is recorded but judged by `assertSupported`.
 */
export function buildTemplateModel(doc: Document): TemplateModel {
  const rootElement = doc.documentElement;
  if (rootElement === null) throw malformedXml('no root element');
  if (rootElement.localName !== ROOT_CLASS) throw malformedXml(`a template packet must be rooted in <${ROOT_CLASS}>`);
  const namespace = rootElement.namespaceURI ?? '';

  const nodes: TemplateNode[] = [];
  const stack: Pending[] = [{ element: rootElement, parent: null, siblings: null, depth: 0 }];
  for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
    const { element, parent, siblings, depth } = next;
    if (depth >= MAX_XML_DEPTH) throw malformedXml(`element depth over the ${MAX_XML_DEPTH}-level ceiling`);
    const className = element.localName ?? element.nodeName;
    const children: TemplateNode[] = [];
    const { entries, nil } = attributesOf(element);
    const rich = className === RICH_TEXT_CLASS;
    const below = rich ? [] : modelledChildren(element, namespace);
    const node = new TemplateNode({
      id: nodes.length,
      className,
      parent,
      index: siblings === null ? 0 : siblings.length,
      implicit: false,
      nil,
      content: rich ? plainTextOf(element) : below.length === 0 ? ownText(element) : '',
      richContent: rich ? richContentOf(element) : undefined,
      attributes: entries,
      renderCache: renderCacheOf(element),
      children,
    });
    nodes.push(node);
    siblings?.push(node);
    // Pushed last-to-first so the stack yields children in document order (ids and sibling indexes follow it).
    for (let i = below.length - 1; i >= 0; i -= 1) {
      const child = below[i];
      if (child !== undefined) stack.push({ element: child, parent: node, siblings: children, depth: depth + 1 });
    }
  }

  for (const node of nodes) freezeNode(node);
  const root = nodes[0];
  if (root === undefined) throw malformedXml('no root element');
  return Object.freeze({ root, namespace, nodes: Object.freeze(nodes) });
}
