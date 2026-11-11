import { Node } from '@xmldom/xmldom';
import { serializeXml } from '../../xml/serialize.js';

/** XHTML elements that start and end a line in the plain-text projection. */
const BLOCK_ELEMENTS: ReadonlySet<string> = new Set([
  'body', 'div', 'p', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'tr', 'blockquote', 'pre', 'address', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'header', 'footer', 'form',
]);

const isSpace = (c: string): boolean => c === ' ' || c === '\t' || c === '\n' || c === '\r';

/** Runs of layout whitespace become one space, as in rendered HTML. */
function collapseWhitespace(data: string): string {
  let out = '';
  let lastWasSpace = false;
  for (const c of data) {
    if (isSpace(c)) {
      if (!lastWasSpace) out += ' ';
      lastWasSpace = true;
    } else {
      out += c;
      lastWasSpace = false;
    }
  }
  return out;
}

/** The exact markup of everything inside `exData`, serialized (child nodes concatenated, no wrapper). */
export function richContentOf(parent: Node): string {
  let markup = '';
  for (let child = parent.firstChild; child !== null; child = child.nextSibling) markup += serializeXml(child);
  return markup;
}

/**
 * A plain-text projection of rich text: the text in document order, layout whitespace collapsed, one `\n` for each
 * `br` and between block elements (paragraphs, list items, divisions, headings, table rows), none at the start or end.
 * An approximation for display and comparison, not a renderer; `richContentOf` has the exact markup.
 * Iterative: the markup is as deep as its author chose.
 */
export function plainTextOf(parent: Node): string {
  let out = '';
  let pendingBreak = true;
  const pending: { node: Node; leaving: boolean }[] = [];
  const pushChildren = (node: Node): void => {
    for (let child = node.lastChild; child !== null; child = child.previousSibling) pending.push({ node: child, leaving: false });
  };
  pushChildren(parent);
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    const { node, leaving } = next;
    if (leaving) {
      pendingBreak = true;
      continue;
    }
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
      let data = collapseWhitespace(node.nodeValue ?? '');
      if (pendingBreak || out === '' || out.endsWith('\n')) data = data.trimStart();
      if (data === '') continue;
      if (pendingBreak && out !== '' && !out.endsWith('\n')) out += '\n';
      pendingBreak = false;
      out += data;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const name = (node.localName ?? node.nodeName).toLowerCase();
      if (name === 'br') {
        out += '\n';
        pendingBreak = false;
      } else if (BLOCK_ELEMENTS.has(name)) {
        pendingBreak = true;
        pending.push({ node, leaving: true });
        pushChildren(node);
      } else {
        pushChildren(node);
      }
    }
  }
  return out.trimEnd();
}
