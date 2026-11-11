import { XfaPdfError } from '../../pdf/errors.js';
import { DataNode, FormNode, NodeListNode, type DomNode, type FormDom } from '../form/index.js';
import { XfaFormError } from '../form/index.js';
import { invalidArgument, limitExceeded } from './errors.js';
import { MAX_SOM_RESULTS } from './limits.js';
import { isSomName, parseSom, type SomPath, type SomSegment } from './parse.js';
import { candidates, enclosingScope, hasNamedMember } from './scope.js';

/** The segment that names the root of the object model in an expression. */
const ROOT_NAME = 'xfa';

/** The one pseudo-property the resolver answers: the data node a container is bound to (the shape of the barcode manifest references). */
const DATA_NODE = 'dataNode';

function domOf(node: DomNode): FormDom {
  let current: DomNode = node;
  while (current instanceof NodeListNode) current = current.owner;
  return current.dom;
}

function assertNode(node: unknown): asserts node is DomNode {
  if (!(node instanceof FormNode || node instanceof DataNode || node instanceof NodeListNode)) throw invalidArgument('SOM resolution starts from a node of the form');
}

function select(list: readonly DomNode[], segment: SomSegment): readonly DomNode[] {
  if (segment.index === 'all') return list;
  const one = list[segment.index];
  return one === undefined ? [] : [one];
}

function guard(found: readonly DomNode[]): void {
  if (found.length > MAX_SOM_RESULTS) throw limitExceeded(`a SOM expression may reach at most ${MAX_SOM_RESULTS} nodes`);
}

/** The models that hang off `xfa`: `form`, `template`, `datasets` and the `data` shortcut. Other root children (layout, host, event) belong to the script host, not the SOM. */
function rootChildren(dom: FormDom, segment: SomSegment): readonly DomNode[] {
  if (segment.kind !== 'name') return [];
  let model: DomNode | undefined;
  if (segment.text === 'form') model = dom.form;
  else if (segment.text === 'template') model = dom.template;
  else if (segment.text === 'datasets') model = dom.datasets;
  else if (segment.text === 'data') model = dom.data;
  return model === undefined || (segment.index !== 0 && segment.index !== 'all') ? [] : [model];
}

/** Resolves segments `from` onwards below each node of `frontier`, in document order. */
function descend(frontier: readonly DomNode[], segments: readonly SomSegment[], from: number): readonly DomNode[] {
  let current = frontier;
  for (let i = from; i < segments.length && current.length > 0; i += 1) {
    const segment = segments[i];
    if (segment === undefined) break;
    const last = i === segments.length - 1;
    const next: DomNode[] = [];
    for (const node of current) {
      const chosen = select(candidates(node, segment), segment);
      if (chosen.length > 0) {
        for (const c of chosen) next.push(c);
      } else if (last && segment.kind === 'name' && segment.text === DATA_NODE && (segment.index === 0 || segment.index === 'all') && node instanceof FormNode) {
        const bound = node.dataNode;
        if (bound !== null) next.push(bound);
      }
      guard(next);
    }
    current = next;
  }
  return current;
}

/** `parseSom` for text a script supplied: grammar the engine does not implement is the script's error to catch (`INVALID_ARGUMENT`), not a load failure. */
function parseScriptText(expression: string): SomPath {
  try {
    return parseSom(expression);
  } catch (e) {
    if (e instanceof XfaPdfError && !(e instanceof XfaFormError)) throw invalidArgument(e.message, { cause: e });
    throw e;
  }
}

function resolveAll(from: DomNode, expression: string): readonly DomNode[] {
  assertNode(from);
  const { segments } = parseScriptText(expression);
  const first = segments[0];
  if (first === undefined) return [];
  if (first.kind === 'name' && first.text === ROOT_NAME) {
    // `xfa` is the root of the model, never a name in scope; the root itself is not a node, so a bare `xfa` finds nothing.
    const second = segments[1];
    if (second === undefined || (first.index !== 0 && first.index !== 'all')) return [];
    return descend(select(rootChildren(domOf(from), second), second), segments, 2);
  }
  // Unqualified: the first scope that has a child the first segment names fixes the scope; the rest is resolved below it.
  for (let scope: DomNode | undefined = from; scope !== undefined; scope = enclosingScope(scope)) {
    const named = candidates(scope, first);
    if (named.length > 0) return descend(select(named, first), segments, 1);
  }
  return [];
}

/**
 * XFA `resolveNode`: the first node `expression` names, searched from `from` (the node whose script is running), or
 * null. An unqualified first segment is looked for among the children of `from`, then of each enclosing scope outward
 * (a container's `variables` members count as its children), and the rest is resolved below the first scope that has it.
 * `xfa.form`, `xfa.template`, `xfa.datasets` and `xfa.data` are the rooted forms; `[n]` counts same-name siblings; `#class`
 * selects by class. A trailing `.dataNode` answers a container's bound data node. See `parseSom` for the refused grammar.
 */
export function resolveNode(from: DomNode, expression: string): DomNode | null {
  return resolveAll(from, expression)[0] ?? null;
}

/**
 * True exactly when `resolveNode(from, name)` finds a node, for `name` a single plain identifier (no dot, index or `#`):
 * the question the script binder asks of every undeclared name. The answer is the first-segment lookup alone, one set
 * lookup per enclosing scope, so a scope with a hundred thousand children costs no more than one with three. A name the
 * SOM grammar cannot spell (`$`, over-long) and the model root `xfa` name no node.
 */
export function isNameInScope(from: DomNode, name: string): boolean {
  if (!(from instanceof FormNode || from instanceof DataNode || from instanceof NodeListNode)) return false;
  if (name === ROOT_NAME || !isSomName(name)) return false;
  for (let scope: DomNode | undefined = from; scope !== undefined; scope = enclosingScope(scope)) {
    if (hasNamedMember(scope, name)) return true;
  }
  return false;
}

/** XFA `resolveNodes`: every node `expression` names (use `[*]` for all same-name siblings), in document order; empty when none. */
export function resolveNodes(from: DomNode, expression: string): DomNode[] {
  return [...resolveAll(from, expression)];
}
