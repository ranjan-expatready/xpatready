import { parse } from 'acorn';
import { z } from 'zod';
import { AstBudget, isNode, parseFailure, pushAll, pushChildren } from './ast.js';
import { isForbiddenKey } from './bridge-schema.js';
import { safeText } from '../pdf/safe-text.js';
import { XfaScriptError } from './errors.js';

/** Where a form library's source is rejected from: the name is an identifier, and nothing else is accepted. */
const identifier = z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/).max(64);

/**
 * Checks `name` can be a global script-object name: a plain identifier that is not a reserved word (the ES3
 * parser decides, so `class`, `function`, future-reserved words are all refused) and not a prototype key.
 * Whether it clashes with an existing global is checked in the guest, where the globals are.
 */
export function assertScriptObjectName(name: string): void {
  const parsed = identifier.safeParse(name);
  if (!parsed.success || isForbiddenKey(name) || !isParsableAsVariable(name)) {
    throw new XfaScriptError('INVALID_OPTIONS', `"${safeText(name, 64, true)}" cannot be used as a script object name`);
  }
}

function isParsableAsVariable(name: string): boolean {
  try {
    parse(`var ${name};`, { ecmaVersion: 3, allowReserved: false });
    return true;
  } catch {
    return false;
  }
}

/**
 * Names a script file leaves in its own scope: every top-level `var` and function declaration, including those
 * nested in top-level blocks, loops, `switch` and `try` (they hoist to the same scope). Nothing inside a function
 * is collected. Iterative and counted (`MAX_SCRIPT_AST_NODES`), so a deeply nested file is a typed `SCRIPT_LIMIT`.
 */
function collectTopLevelNames(root: unknown, out: Set<string>): void {
  const budget = new AstBudget();
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      pushAll(node, stack);
      continue;
    }
    if (!isNode(node)) continue;
    budget.spend();
    if (node.type === 'FunctionDeclaration') {
      const id = node['id'];
      if (isNode(id) && typeof id['name'] === 'string') out.add(id['name']);
      continue;
    }
    if (node.type === 'FunctionExpression') continue;
    if (node.type === 'VariableDeclaration') {
      const declarations = node['declarations'];
      const inits: unknown[] = [];
      for (const declarator of Array.isArray(declarations) ? (declarations as unknown[]) : []) {
        if (!isNode(declarator)) continue;
        const id = declarator['id'];
        if (isNode(id) && typeof id['name'] === 'string') out.add(id['name']);
        inits.push(declarator['init']);
      }
      pushAll(inits, stack);
      continue;
    }
    pushChildren(node, stack);
  }
}

/**
 * Turns one script file into a program that runs it inside its own function scope and binds what it declares as a
 * locked global named `name`: `name.helper` is that file's `helper`, and the file's own references to `helper`
 * resolve inside the file, so two libraries that define the same helper name cannot collide.
 *
 * The file is parsed on its own first (ES3, scripts only), which is what makes the wrapping safe: a source that
 * tries to close the wrapper, `return`s at the top level or uses newer syntax is rejected with a typed error naming
 * the object, and only identifiers taken from the parse tree are written into the generated code.
 */
export function buildScriptObjectProgram(name: string, source: string): string {
  assertScriptObjectName(name);
  let ast: unknown;
  try {
    ast = parse(source, { ecmaVersion: 3, sourceType: 'script' });
  } catch (error) {
    throw parseFailure(error, `script object "${name}"`);
  }
  const names = new Set<string>();
  collectTopLevelNames(ast, names);
  // Live accessors, not copies: `lib.count` must keep tracking the file's `var count`, and an assignment must reach it.
  let holder = '__xfaExports';
  while (source.includes(holder)) holder += '_';
  const members = [...names]
    .filter((n) => !isForbiddenKey(n))
    .map((n) => `Object.defineProperty(${holder}, ${JSON.stringify(n)}, { enumerable: true, get: function () { return ${n}; }, set: function (v) { ${n} = v; } });`);
  const key = JSON.stringify(name);
  return [
    `if (${key} in globalThis) { throw new Error("global name already in use: " + ${key}); }`,
    '(function () {',
    '  var scriptObject = (function () {',
    source,
    `\n;var ${holder} = {};\n${members.join('\n')}\nreturn ${holder};`,
    '  })();',
    `  Object.defineProperty(globalThis, ${key}, { value: scriptObject, writable: false, configurable: false, enumerable: false });`,
    '})();',
  ].join('\n');
}
