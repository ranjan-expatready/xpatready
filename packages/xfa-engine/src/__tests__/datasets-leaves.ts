import type { Node } from '@xmldom/xmldom';
import { parseXml } from '../xml/parse.js';

/**
 * Every data leaf of a datasets packet: the elements under `xfa:data` that have no element child, keyed by their indexed path
 * (`/form1[0]/Page1[0]/Name[2]`, the index counting the preceding siblings of the same name), valued by their trimmed text.
 */
export function datasetsLeaves(xml: string): Map<string, string> {
  const doc = parseXml(xml);
  const root = doc.getElementsByTagName('xfa:data').item(0) ?? doc.documentElement;
  const leaves = new Map<string, string>();
  if (root === null) return leaves;
  const walk = (element: Node, path: string): void => {
    const children: Node[] = [];
    for (let node = element.firstChild; node !== null; node = node.nextSibling) if (node.nodeType === 1) children.push(node);
    if (children.length === 0) {
      leaves.set(path, (element.textContent ?? '').trim());
      return;
    }
    const seen = new Map<string, number>();
    for (const child of children) {
      const index = seen.get(child.nodeName) ?? 0;
      seen.set(child.nodeName, index + 1);
      walk(child, `${path}/${child.nodeName}[${index}]`);
    }
  };
  walk(root, '');
  return leaves;
}

/** The differences between two leaf maps: keys on one side only, and keys whose text differs. Empty when the maps are equal. */
export function leafDifferences(expected: ReadonlyMap<string, string>, actual: ReadonlyMap<string, string>): string[] {
  const out: string[] = [];
  for (const [key, value] of expected) {
    const other = actual.get(key);
    if (other === undefined) out.push(`${key}: missing from actual`);
    else if (other !== value) out.push(`${key}: expected ${JSON.stringify(value)}, actual ${JSON.stringify(other)}`);
  }
  for (const key of actual.keys()) if (!expected.has(key)) out.push(`${key}: not in expected`);
  return out;
}
