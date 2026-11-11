import { Node, XMLSerializer } from '@xmldom/xmldom';
import { z } from 'zod';
import { XfaPdfError } from '../pdf/errors.js';
import { safeText } from '../pdf/safe-text.js';
import { firstIllegalXmlChar } from './chars.js';
import { forEachNode } from './walk.js';
import { malformedXml, messageOf } from './xml-error.js';

const nodeSchema = z.looseObject({ nodeType: z.number() });

const CARRIAGE_RETURN = '\r';
/** Stands in for a carriage return while the serializer runs; NUL is not an XML character, so valid data never holds one. */
const PLACEHOLDER = '\u0000';

/** Every text node under `root`. */
function textNodes(root: Node): Node[] {
  const found: Node[] = [];
  forEachNode(root, (n) => {
    if (n.nodeType === Node.TEXT_NODE) found.push(n);
  });
  return found;
}

const run = (node: Node): string => new XMLSerializer().serializeToString(node);

/**
 * The serializer writes a carriage return in text as a raw character, which every XML reader folds into a line feed,
 * so the datum would change on the next load. A character reference survives, so a copy of the tree is written with
 * a placeholder that is then turned into `&#13;`. The caller's DOM is never touched.
 */
function runPreservingCarriageReturns(node: Node): string {
  const nodes = textNodes(node);
  const carriageReturns = nodes.reduce((sum, t) => sum + (t.nodeValue ?? '').split(CARRIAGE_RETURN).length - 1, 0);
  if (carriageReturns === 0) return run(node);
  const copy = node.cloneNode(true);
  for (const t of textNodes(copy)) t.nodeValue = (t.nodeValue ?? '').replaceAll(CARRIAGE_RETURN, PLACEHOLDER);
  const out = run(copy);
  // Any placeholder beyond the ones just inserted is a NUL already in the document, which would be rewritten wrongly.
  if (out.split(PLACEHOLDER).length - 1 !== carriageReturns) throw malformedXml('the document contains a character XML does not allow');
  return out.replaceAll(PLACEHOLDER, '&#13;');
}

/**
 * Serializes a document or any node to XML text. Attribute order, quoting and the empty-element form are the
 * serializer's own, so compare documents structurally, not as strings; serializing the result again gives identical text.
 * Refuses (`MALFORMED_XML`) a tree that holds a character XML 1.0 forbids.
 */
export function serializeXml(node: Node): string {
  if (!nodeSchema.safeParse(node).success) throw malformedXml('cannot serialize a value that is not an XML node');
  let out: string;
  try {
    out = runPreservingCarriageReturns(node);
  } catch (e) {
    if (e instanceof XfaPdfError) throw e;
    throw malformedXml(safeText(messageOf(e)), { cause: e });
  }
  // A DOM mutation can introduce a character the parser would have refused; never write a packet that cannot re-parse.
  if (firstIllegalXmlChar(out) !== -1) throw malformedXml('the document contains a character XML does not allow');
  return out;
}
