import { DataNode, FormNode, type DomNode } from '../form/index.js';
import type { SomSegment } from './parse.js';

/** True when `child` answers to the plain name `name`: it is called that, or it is unnamed and is of that class (`ui`, `caption`). */
export function answersToName(child: FormNode, name: string): boolean {
  return child.name === name || (child.name === '' && child.className === name);
}

interface AnsweredNames {
  /** `FormNode.structureVersion` at the time the set was built. */
  readonly version: number;
  readonly names: ReadonlySet<string>;
}

const answered = new WeakMap<FormNode, AnsweredNames>();

/**
 * The plain names the children of `node`, and the members of its `variables` blocks, answer to: a child's own name, or its
 * class when it is unnamed (`answersToName`). Built on first use and kept until the node's structure changes, so asking
 * whether a name is among them is one lookup however many children the node has, instead of a scan of all of them.
 */
function answeringNames(node: FormNode): ReadonlySet<string> {
  const known = answered.get(node);
  if (known !== undefined && known.version === node.structureVersion) return known.names;
  const names = new Set<string>();
  const add = (child: FormNode): void => {
    names.add(child.name === '' ? child.className : child.name);
  };
  for (const child of node.children) {
    add(child);
    if (child.className === 'variables') for (const member of child.children) add(member);
  }
  answered.set(node, { version: node.structureVersion, names });
  return names;
}

/** The children of a form node that a segment can select among: its listed children, then the members of its `variables` blocks. */
function formCandidates(node: FormNode, segment: SomSegment): FormNode[] {
  const found: FormNode[] = [];
  const test = segment.kind === 'name' ? (c: FormNode): boolean => answersToName(c, segment.text) : (c: FormNode): boolean => c.className === segment.text;
  for (const child of node.children) if (test(child)) found.push(child);
  for (const block of node.children) {
    if (block.className !== 'variables') continue;
    for (const member of block.children) if (test(member)) found.push(member);
  }
  return found;
}

/** Every node `segment` names below `node`, before the index is applied. A node list has no children of its own in the SOM. */
export function candidates(node: DomNode, segment: SomSegment): readonly DomNode[] {
  if (node instanceof FormNode) return formCandidates(node, segment);
  if (node instanceof DataNode) {
    return segment.kind === 'name' ? node.dom.namedChildren(node, segment.text) : node.children.filter((c) => c.className === segment.text);
  }
  return [];
}

/** True when `candidates(node, <the plain name>)` is not empty, found without listing the candidates. */
export function hasNamedMember(node: DomNode, name: string): boolean {
  if (node instanceof FormNode) return answeringNames(node).has(name);
  return candidates(node, { kind: 'name', text: name, index: 0 }).length > 0;
}

/** The enclosing scope: a node's parent (a node list's owner); undefined at the top of a model. */
export function enclosingScope(node: DomNode): DomNode | undefined {
  return node.parent ?? undefined;
}
