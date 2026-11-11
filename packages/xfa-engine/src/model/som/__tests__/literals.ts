import { parse, type Node } from 'acorn';
import { scriptOf, variablesOf, type TemplateModel, type TemplateNode } from '../../template/index.js';

/** One call of `resolveNode` / `resolveNodes` found in a form script (test helper: acorn is the oracle, not a regular expression). */
export interface SomCall {
  readonly method: 'resolveNode' | 'resolveNodes';
  /** Source text of the object the method is called on (`xfa`, `oNode.caption.value`, ...). */
  readonly receiver: string;
  /** The first argument when it is a string literal; undefined when it is computed. */
  readonly literal: string | undefined;
  /** Source text of the first argument. */
  readonly argument: string;
  /** The container whose script holds the call: the owner of the event, calculate, validate or `variables` block. */
  readonly owner: TemplateNode;
  /** Where in the owner: `event:<activity>`, `calculate`, `validate`, `variables:<script object name>`. */
  readonly origin: string;
  /** True for a script the engine never runs on the client (`runAt="server"`). */
  readonly serverOnly: boolean;
  /** The top-level function declaration the call sits in, when there is one (the form libraries are collections of them). */
  readonly functionName: string | undefined;
}

/** One client JavaScript script of the template, with the container it belongs to. */
export interface ScriptSource {
  readonly owner: TemplateNode;
  readonly origin: string;
  readonly source: string;
  readonly serverOnly: boolean;
}

interface CallNode extends Node {
  readonly callee: Node;
  readonly arguments: readonly Node[];
}
interface MemberNode extends Node {
  readonly object: Node;
  readonly property: Node & { readonly name?: unknown };
  readonly computed: boolean;
}
interface LiteralNode extends Node {
  readonly value: unknown;
}

const isNode = (value: unknown): value is Node => typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
const isCall = (node: Node): node is CallNode => node.type === 'CallExpression';

function stringLiteral(node: Node | undefined): string | undefined {
  if (node === undefined || node.type !== 'Literal') return undefined;
  const { value } = node as LiteralNode;
  return typeof value === 'string' ? value : undefined;
}
const isMember = (node: Node): node is MemberNode => node.type === 'MemberExpression';

/** Every node below `root` (root included), iteratively. */
function* nodesOf(root: Node): Generator<Node> {
  const pending: Node[] = [root];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    yield node;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) for (const item of value) if (isNode(item)) pending.push(item);
      if (isNode(value)) pending.push(value);
    }
  }
}

/** The SOM calls in one script's source text. */
export function somCallsIn(source: string): { method: SomCall['method']; receiver: string; literal: string | undefined; argument: string; at: number }[] {
  const ast = parse(source, { ecmaVersion: 3 });
  const found: { method: SomCall['method']; receiver: string; literal: string | undefined; argument: string; at: number }[] = [];
  for (const node of nodesOf(ast)) {
    if (!isCall(node) || !isMember(node.callee) || node.callee.computed) continue;
    const method = node.callee.property.name;
    if (method !== 'resolveNode' && method !== 'resolveNodes') continue;
    const first = node.arguments[0];
    found.push({
      method,
      receiver: source.slice(node.callee.object.start, node.callee.object.end).replace(/\s+/g, ' '),
      literal: stringLiteral(first),
      argument: first === undefined ? '' : source.slice(first.start, first.end).replace(/\s+/g, ' '),
      at: node.start,
    });
  }
  return found.sort((a, b) => a.at - b.at);
}

/**
 * Every client JavaScript script of the template. A script under any parent other than an event, a calculate, a
 * validate or a `variables` block fails loudly, so a new place scripts can live is noticed instead of skipped.
 */
export function scriptSources(model: TemplateModel): ScriptSource[] {
  const sources: ScriptSource[] = [];
  for (const script of model.nodes) {
    if (script.className !== 'script') continue;
    const parent = script.parent;
    const owner = parent?.parent;
    if (parent === null || owner === null || owner === undefined) throw new Error('a script with no owner');
    if (parent.className === 'variables') {
      const object = variablesOf(owner).scriptObjects.find((o) => o.node === script);
      if (object !== undefined && object.kind === 'javascript') sources.push({ owner, origin: `variables:${object.name}`, source: object.text, serverOnly: false });
    } else if (parent.className === 'event' || parent.className === 'calculate' || parent.className === 'validate') {
      const view = scriptOf(script);
      if (view.kind !== 'javascript') continue;
      const origin = parent.className === 'event' ? `event:${parent.attr('activity') ?? ''}` : parent.className;
      sources.push({ owner, origin, source: view.text, serverOnly: view.runAt === 'server' });
    } else {
      throw new Error(`a script under an unexpected parent: ${parent.className}`);
    }
  }
  return sources;
}

interface FunctionNode extends Node {
  readonly id: Node & { readonly name: string };
}
const isFunctionDeclaration = (node: Node): node is FunctionNode => node.type === 'FunctionDeclaration';

/** The top-level function declarations of a script: name and source range. */
function topLevelFunctions(ast: Node): { name: string; start: number; end: number }[] {
  const body = (ast as Node & { readonly body: readonly Node[] }).body;
  return body.filter(isFunctionDeclaration).map((f) => ({ name: f.id.name, start: f.start, end: f.end }));
}

/** Every `resolveNode(s)` call in every client JavaScript script of the template, with the container the script runs for. */
export function extractSomCalls(model: TemplateModel): SomCall[] {
  const calls: SomCall[] = [];
  for (const { owner, origin, source, serverOnly } of scriptSources(model)) {
    const functions = topLevelFunctions(parse(source, { ecmaVersion: 3 }));
    for (const call of somCallsIn(source)) {
      const functionName = functions.find((f) => call.at >= f.start && call.at < f.end)?.name;
      calls.push({ method: call.method, receiver: call.receiver, literal: call.literal, argument: call.argument, owner, origin, serverOnly, functionName });
    }
  }
  return calls;
}

/**
 * How many places in the template's scripts mention the identifier `name` other than its own declaration and the
 * inside of the function it names: a call, a member access (`lib.name(...)`) or a string that contains it (an
 * `eval`-style call). Zero means no script path can reach the function.
 */
export function referencesToFunction(model: TemplateModel, name: string): number {
  let count = 0;
  for (const { source } of scriptSources(model)) {
    const ast = parse(source, { ecmaVersion: 3 });
    const own = topLevelFunctions(ast).find((f) => f.name === name);
    for (const node of nodesOf(ast)) {
      if (own !== undefined && node.start >= own.start && node.end <= own.end) continue;
      if (node.type === 'Identifier' && (node as Node & { readonly name: string }).name === name) count += 1;
      if (node.type === 'Literal' && typeof (node as LiteralNode).value === 'string' && ((node as LiteralNode).value as string).includes(name)) count += 1;
    }
  }
  return count;
}

/** The second argument of a call, as far as a SOM path is concerned: a literal, `"prefix" + expression + "suffix"`, or something else. */
export interface PathArgument {
  readonly literal: string | undefined;
  readonly prefix: string | undefined;
  readonly suffix: string | undefined;
  readonly text: string;
}

interface BinaryNode extends Node {
  readonly operator: string;
  readonly left: Node;
  readonly right: Node;
}

/** The operands of a left-leaning `a + b + c` chain, in order. */
function plusOperands(node: Node): Node[] {
  if (node.type !== 'BinaryExpression' || (node as BinaryNode).operator !== '+') return [node];
  return [...plusOperands((node as BinaryNode).left), (node as BinaryNode).right];
}

/** The `position`-th argument of every call to `calleeName` (a bare function or a member of any object) in one script. */
export function argumentsOfCallsTo(source: string, calleeName: string, position: number): PathArgument[] {
  const found: PathArgument[] = [];
  for (const node of nodesOf(parse(source, { ecmaVersion: 3 }))) {
    if (!isCall(node)) continue;
    const callee = node.callee;
    const name = callee.type === 'Identifier' ? (callee as Node & { readonly name: string }).name : isMember(callee) && !callee.computed ? callee.property.name : undefined;
    const argument = node.arguments[position];
    if (name !== calleeName || argument === undefined) continue;
    const parts = plusOperands(argument);
    const first = parts[0];
    const last = parts[parts.length - 1];
    const shaped = parts.length === 3 && stringLiteral(first) !== undefined && stringLiteral(parts[1]) === undefined && stringLiteral(last) !== undefined;
    found.push({
      literal: stringLiteral(argument),
      prefix: shaped ? stringLiteral(first) : undefined,
      suffix: shaped ? stringLiteral(last) : undefined,
      text: source.slice(argument.start, argument.end).replace(/\s+/g, ' '),
    });
  }
  return found;
}

/** The identifier names a script mentions (variables, properties and function names alike). */
export function identifiersIn(source: string): Set<string> {
  const names = new Set<string>();
  for (const node of nodesOf(parse(source, { ecmaVersion: 3 }))) if (node.type === 'Identifier') names.add((node as Node & { readonly name: string }).name);
  return names;
}
