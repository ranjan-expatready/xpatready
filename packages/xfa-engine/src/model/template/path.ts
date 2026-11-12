import { safeText } from '../../pdf/safe-text.js';
import type { TemplateNode } from './node.js';

/**
 * FD-38 exemption (security invariant): most path segments shown in a diagnostic. A node can sit 255 levels down and
 * every name is file text, so a message must not grow with the document; sixteen segments (the real forms nest 13) locate any node. No firm or
 * operator has a reason to vary it.
 */
const MAX_PATH_SEGMENTS = 16;

function labelOf(node: TemplateNode): string {
  return node.name === '' ? `#${node.className}` : node.name;
}

function segmentOf(node: TemplateNode, parent: TemplateNode): string {
  const label = labelOf(node);
  let before = 0;
  for (let i = 0; i < node.index; i += 1) {
    const sibling = parent.children[i];
    if (sibling !== undefined && labelOf(sibling) === label) before += 1;
  }
  return before === 0 ? safeText(label) : `${safeText(label)}[${before}]`;
}

/**
 * A dotted path for a message: names from the root subform down (`#class` for an unnamed node, `[n]` for the n-th
 * same-named sibling), at most the innermost sixteen segments with `...` in front when cut. File text is escaped and
 * truncated with `safeText`. A diagnostic aid only; the SOM resolver (W01-T04) owns real expressions.
 */
export function diagnosticPath(node: TemplateNode): string {
  if (node.parent === null) return `#${node.className}`;
  const segments: string[] = [];
  let cut = false;
  for (let current: TemplateNode = node; current.parent !== null; current = current.parent) {
    if (segments.length === MAX_PATH_SEGMENTS) {
      cut = true;
      break;
    }
    segments.push(segmentOf(current, current.parent));
  }
  segments.reverse();
  return `${cut ? '...' : ''}${segments.join('.')}`;
}
