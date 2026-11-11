import type { Node } from '@xmldom/xmldom';
import { forEachNode } from '../walk.js';

/**
 * Test-only structural view of an XML tree. Two documents are "the same" when their views are deep-equal; this is
 * deliberately not string equality (attribute order, quote style and empty-element form are not part of structure).
 */
export type Shape =
  | { readonly kind: 'element'; readonly name: string; readonly ns: string | null; readonly attrs: readonly string[]; readonly children: readonly Shape[] }
  | { readonly kind: 'text' | 'cdata' | 'comment'; readonly data: string }
  | { readonly kind: 'pi'; readonly target: string; readonly data: string }
  | { readonly kind: 'doctype' | 'other'; readonly nodeType: number };

const ELEMENT = 1;
const TEXT = 3;
const CDATA = 4;
const PI = 7;
const COMMENT = 8;
const DOCUMENT = 9;
const DOCTYPE = 10;

const byName = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function attrsOf(node: Node): string[] {
  const out: string[] = [];
  const attributes = (node as unknown as { attributes: ArrayLike<{ name: string; namespaceURI: string | null; value: string }> }).attributes;
  for (let i = 0; i < attributes.length; i++) {
    const a = attributes[i];
    if (a !== undefined) out.push(`${a.namespaceURI ?? ''}|${a.name}=${JSON.stringify(a.value)}`);
  }
  return out.sort(byName);
}

function childrenOf(node: Node): Node[] {
  const out: Node[] = [];
  for (let c = node.firstChild; c !== null; c = c.nextSibling) out.push(c);
  return out;
}

function shapeOf(node: Node): Shape {
  switch (node.nodeType) {
    case ELEMENT: {
      const shapes: Shape[] = [];
      for (const child of childrenOf(node)) {
        const s = shapeOf(child);
        const last = shapes[shapes.length - 1];
        // Adjacent character data of the same kind is one logical run (a parser may split or merge at entity boundaries).
        if (s.kind === 'text' && last !== undefined && last.kind === 'text') shapes[shapes.length - 1] = { kind: 'text', data: last.data + s.data };
        else shapes.push(s);
      }
      return { kind: 'element', name: node.nodeName, ns: node.namespaceURI, attrs: attrsOf(node), children: shapes };
    }
    case TEXT:
      return { kind: 'text', data: node.nodeValue ?? '' };
    case CDATA:
      return { kind: 'cdata', data: node.nodeValue ?? '' };
    case COMMENT:
      return { kind: 'comment', data: node.nodeValue ?? '' };
    case PI:
      return { kind: 'pi', target: node.nodeName, data: node.nodeValue ?? '' };
    case DOCTYPE:
      return { kind: 'doctype', nodeType: node.nodeType };
    default:
      return { kind: 'other', nodeType: node.nodeType };
  }
}

/** Structure of a document (its top-level comments/PIs/root element, in order) or of any single node. */
export function structureOf(node: Node): Shape {
  if (node.nodeType !== DOCUMENT) return shapeOf(node);
  return { kind: 'element', name: '#document', ns: null, attrs: [], children: childrenOf(node).map(shapeOf) };
}

/** Number of element nodes in the tree. */
export function countElements(node: Node): number {
  let count = 0;
  forEachNode(node, (n) => {
    if (n.nodeType === ELEMENT) count += 1;
  });
  return count;
}

/** Number of nodes of every kind below the document (elements, attributes, text, comments, PIs, CDATA), as the node ceiling counts them. */
export function countNodes(doc: Node): number {
  let count = 0;
  forEachNode(doc, (n) => {
    if (n.nodeType === DOCUMENT) return;
    count += 1;
    if (n.nodeType === ELEMENT) count += (n as unknown as { attributes: { length: number } }).attributes.length;
  });
  return count;
}
