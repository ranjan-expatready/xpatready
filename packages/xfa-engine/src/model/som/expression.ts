import { DataNode, FormNode, NodeListNode, type DomNode } from '../form/index.js';
import { invalidArgument, invalidOperation, limitExceeded } from './errors.js';
import { MAX_SOM_CHARS, MAX_SOM_SEGMENTS } from './limits.js';
import { isSomName } from './parse.js';
import { answersToName } from './scope.js';

/**
 * One segment: `name[k]` when the node has a plain name, else `#class[k]`. `k` counts the earlier siblings the same
 * segment would also select, so the string resolves back to this node and no other.
 */
function formSegment(node: FormNode, parent: FormNode): string {
  const siblings = parent.children;
  const at = siblings.indexOf(node);
  if (at < 0) throw invalidOperation('the node is not listed in its parent yet, so it has no SOM expression');
  const named = node.name !== '' && isSomName(node.name);
  let before = 0;
  for (let i = 0; i < at; i += 1) {
    const sibling = siblings[i];
    if (sibling !== undefined && (named ? answersToName(sibling, node.name) : sibling.className === node.className)) before += 1;
  }
  return named ? `${node.name}[${before}]` : `#${node.className}[${before}]`;
}

function dataSegment(node: DataNode, parent: DataNode): string {
  if (node.element.nodeType === 2) {
    // An attribute is a data value reachable by name only when no child element of that name hides it.
    if (!isSomName(node.name)) throw invalidOperation('the attribute name cannot be written in a SOM expression');
    if (parent.dom.namedChildren(parent, node.name).some((c) => c instanceof DataNode && c.element.nodeType === 1)) {
      throw invalidOperation('the attribute is hidden by a child element of the same name, so it has no SOM expression');
    }
    return `${node.name}[0]`;
  }
  const named = isSomName(node.name);
  const siblings = named ? parent.dom.namedChildren(parent, node.name) : parent.children.filter((c) => c.className === node.className);
  const at = siblings.indexOf(node);
  if (at < 0) throw invalidOperation('the data node is not listed in its parent, so it has no SOM expression');
  return named ? `${node.name}[${at}]` : `#${node.className}[${at}]`;
}

function guardSegments(count: number): void {
  if (count > MAX_SOM_SEGMENTS - 2) throw limitExceeded(`a SOM expression may have at most ${MAX_SOM_SEGMENTS} segments`);
}

function formPath(node: FormNode): string {
  const segments: string[] = [];
  let top: FormNode = node;
  for (let parent = top.parent; parent !== null; parent = top.parent) {
    segments.push(formSegment(top, parent));
    guardSegments(segments.length);
    top = parent;
  }
  let root: string;
  if (top.className === 'form' && top === top.dom.form) root = 'xfa[0].form[0]';
  else if (top.readOnly && top.className === 'template') root = 'xfa[0].template[0]';
  else throw invalidOperation('the node is not part of the form or the template, so it has no SOM expression');
  return [root, ...segments.reverse()].join('.');
}

function dataPath(node: DataNode): string {
  const segments: string[] = [];
  let top: DataNode = node;
  for (let parent = top.parent; parent !== null; parent = top.parent) {
    segments.push(dataSegment(top, parent));
    guardSegments(segments.length);
    top = parent;
  }
  if (top !== top.dom.datasets) throw invalidOperation('the data node is not part of the datasets, so it has no SOM expression');
  return ['xfa[0].datasets[0]', ...segments.reverse()].join('.');
}

/**
 * XFA `somExpression`: the canonical absolute expression of `node` (`xfa[0].form[0].form1[0].Page1[0].F[0]`, or
 * `xfa[0].template[0]...` / `xfa[0].datasets[0]...`), with an index on every segment. A name the grammar cannot spell
 * (a dot, a space, a leading digit, over the name ceiling) and every unnamed node are written `#class[n]`. The result
 * always resolves back to `node` through `resolveNode`. Throws `INVALID_OPERATION` for a node with no place in a model
 * (a created node not yet appended, a removed node, a default property nothing has written, a node list) and `LIMIT`
 * for a path over the expression ceiling.
 */
export function somExpressionOf(node: DomNode): string {
  if (!(node instanceof FormNode || node instanceof DataNode || node instanceof NodeListNode)) throw invalidArgument('somExpression needs a node of the form');
  if (node instanceof NodeListNode) throw invalidOperation('a node list has no SOM expression');
  const text = node instanceof FormNode ? formPath(node) : dataPath(node);
  if (text.length > MAX_SOM_CHARS) throw limitExceeded(`a SOM expression may hold at most ${MAX_SOM_CHARS} characters`);
  return text;
}
