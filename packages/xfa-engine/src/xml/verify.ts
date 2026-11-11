import { Node, type Document, type Element } from '@xmldom/xmldom';
import { firstIllegalXmlChar } from './chars.js';
import type { XmlLimits } from './limits.js';
import { forEachNode } from './walk.js';
import { malformedXml, unsupportedXml } from './xml-error.js';

const CHARACTER_DATA_NODES: ReadonlySet<number> = new Set([Node.TEXT_NODE, Node.CDATA_SECTION_NODE, Node.PROCESSING_INSTRUCTION_NODE, Node.COMMENT_NODE]);

function checkData(data: string | null, what: string): void {
  if (data !== null && firstIllegalXmlChar(data) !== -1) throw malformedXml(`${what} contains a character XML does not allow`);
}

function checkElement(element: Element, limits: XmlLimits): void {
  const attributes = element.attributes;
  if (attributes.length > limits.maxAttributes) throw malformedXml(`an element has more than ${limits.maxAttributes} attributes`);
  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes.item(i);
    if (attr === null) continue;
    if (attr.value.length > limits.maxAttributeChars) throw malformedXml(`an attribute value is longer than ${limits.maxAttributeChars} characters`);
    checkData(attr.value, 'an attribute value');
  }
}

/**
 * Walks the built tree once (iteratively: depth is attacker-chosen) and enforces what the pre-scan promised: no DTD
 * or entity nodes, ceilings on nodes (attributes included), elements, depth and attributes, and only characters XML allows in decoded text
 * (character references such as `&#1;` decode to characters the source text never contained).
 */
export function verifyDocument(doc: Document, limits: XmlLimits): void {
  if (doc.documentElement === null) throw malformedXml('no root element');
  let nodes = 0;
  let elements = 0;
  forEachNode(doc, (node, depth) => {
    const type = node.nodeType;
    if (type === Node.DOCUMENT_NODE) return;
    nodes += 1;
    if (nodes > limits.maxNodes) throw malformedXml(`more than ${limits.maxNodes} nodes`);
    if (type === Node.DOCUMENT_TYPE_NODE) throw unsupportedXml('DOCTYPE declarations (DTDs and entities) are not accepted');
    if (type === Node.ENTITY_REFERENCE_NODE || type === Node.ENTITY_NODE || type === Node.NOTATION_NODE) throw unsupportedXml('entity and notation nodes are not accepted');
    if (type === Node.ELEMENT_NODE) {
      elements += 1;
      if (elements > limits.maxElements) throw malformedXml(`more than ${limits.maxElements} elements`);
      if (depth + 1 > limits.maxDepth) throw malformedXml(`element depth over the ${limits.maxDepth}-level ceiling`);
      const element = node as Element;
      // Attributes are nodes too: 256 of them on every element would otherwise multiply the tree past the ceiling.
      nodes += element.attributes.length;
      if (nodes > limits.maxNodes) throw malformedXml(`more than ${limits.maxNodes} nodes`);
      checkElement(element, limits);
    } else if (CHARACTER_DATA_NODES.has(type)) {
      checkData(node.nodeValue, 'text');
    }
  });
}
