import { parse } from 'acorn';
import { AstBudget, isNode, parseFailure, pushAll, pushChildren } from '../script/ast.js';

const nameOf = (value: unknown): string | undefined => {
  if (!isNode(value) || value.type !== 'Identifier') return undefined;
  const name = value['name'];
  return typeof name === 'string' ? name : undefined;
};

/** Keys that hold no child nodes. */
const SKIP_KEYS: ReadonlySet<string> = new Set(['type', 'start', 'end', 'loc', 'range']);

/** Marks the end of a function body on the walk stack: the names its scope declared stop hiding free names. */
class ScopeExit {
  readonly names: ReadonlySet<string>;

  constructor(names: ReadonlySet<string>) {
    this.names = names;
  }
}

/**
 * Collects the names a function body declares in its own scope: `var` declarators, function declarations and catch
 * parameters (all hoisted to the function). Nested function bodies are other scopes and are not entered.
 */
function declaredIn(root: unknown, into: Set<string>, budget: AstBudget): void {
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const body = stack.pop();
    if (Array.isArray(body)) {
      pushAll(body, stack);
      continue;
    }
    if (!isNode(body)) continue;
    budget.spend();
    if (body.type === 'FunctionDeclaration') {
      const id = nameOf(body['id']);
      if (id !== undefined) into.add(id);
      continue;
    }
    if (body.type === 'FunctionExpression') continue;
    if (body.type === 'VariableDeclarator') {
      const id = nameOf(body['id']);
      if (id !== undefined) into.add(id);
    }
    if (body.type === 'CatchClause') {
      const param = nameOf(body['param']);
      if (param !== undefined) into.add(param);
    }
    pushChildren(body, stack, SKIP_KEYS);
  }
}

/**
 * Walks the tree in source order, adding to `found` each identifier no enclosing function scope (or the top scope) declares.
 * The walk spends `walk`; the scan of each function body for its declarations spends `declarations`.
 */
function collect(program: unknown, top: ReadonlySet<string>, found: Set<string>, declarations: AstBudget, walk: AstBudget): void {
  // How many scopes currently enclosing the walk declare each name (a name is free when none does).
  const declaring = new Map<string, number>();
  const enter = (names: ReadonlySet<string>): void => {
    for (const name of names) declaring.set(name, (declaring.get(name) ?? 0) + 1);
  };
  enter(top);
  const stack: unknown[] = [program];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node instanceof ScopeExit) {
      for (const name of node.names) declaring.set(name, (declaring.get(name) ?? 1) - 1);
      continue;
    }
    if (Array.isArray(node)) {
      pushAll(node, stack);
      continue;
    }
    if (!isNode(node)) continue;
    walk.spend();
    switch (node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression': {
        const own = new Set<string>(['arguments']);
        const params = node['params'];
        if (Array.isArray(params)) for (const p of params) { const n = nameOf(p); if (n !== undefined) own.add(n); }
        const id = nameOf(node['id']);
        if (id !== undefined) own.add(id);
        declaredIn(node['body'], own, declarations);
        enter(own);
        stack.push(new ScopeExit(own), node['body']);
        break;
      }
      case 'MemberExpression':
        if (node['computed'] === true) stack.push(node['property']);
        stack.push(node['object']);
        break;
      case 'Property':
        stack.push(node['value']);
        break;
      case 'LabeledStatement':
        stack.push(node['body']);
        break;
      case 'BreakStatement':
      case 'ContinueStatement':
        break;
      case 'Identifier': {
        const name = nameOf(node);
        if (name !== undefined && (declaring.get(name) ?? 0) === 0) found.add(name);
        break;
      }
      default:
        pushChildren(node, stack, SKIP_KEYS);
    }
  }
}

/**
 * The identifiers a form script uses without declaring them, in order of first use: the names XFA resolves through the
 * form tree (`Year.rawValue`, `globFirstField.value`), plus language globals and implicit globals - the caller decides
 * which of those name a node. A script whose syntax tree passes `MAX_SCRIPT_AST_NODES` is a typed `SCRIPT_LIMIT`. The text is parsed as ES3, the dialect of the forms, so a script that is not ES3 is a
 * typed `SCRIPT_ERROR` here instead of a surprise inside the sandbox.
 *
 * Scope is function-level, as in ES3: a name declared inside one function is still free in the rest of the script.
 * A catch parameter is treated as declared for its whole function (the block scope of ES3 is not modelled), which can
 * only hide a free name, never invent one.
 */
export function freeNames(source: string): readonly string[] {
  let program: unknown;
  try {
    program = parse(source, { ecmaVersion: 3, sourceType: 'script' });
  } catch (error) {
    throw parseFailure(error, 'script');
  }
  // The analysis is iterative and counted: a hostile script's nesting costs nodes against a ceiling, never host stack.
  // Each pass has a budget of its own, so the ceiling bounds the tree whichever pass walks it: `declaredIn` visits each
  // node once across all its calls (the top level and every function), `collect` once more, and a script object's single
  // pass has the same ceiling.
  const declarations = new AstBudget();
  const top = new Set<string>();
  declaredIn(program, top, declarations);
  const found = new Set<string>();
  collect(program, top, found, declarations, new AstBudget());
  return [...found];
}
