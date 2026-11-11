import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * W03-T15 A2: nothing under `src/` (tests excluded) needs Node, so the same code runs in a browser Web Worker. Read from the syntax
 * tree, not by text search, so a comment or a string that only mentions `process.` is not a finding and a use hidden in an
 * expression cannot be missed. By-design residuals (a syntax-tree audit cannot see them; the type-level half and review do): dynamic
 * access through a call such as `Reflect.get(globalThis, 'process')`, and computed keys such as `globalThis['pro' + 'cess']`. The type-level half (`types: []`, checked in the last test) makes the build itself refuse a Node type.
 */

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const PACKAGE = fileURLToPath(new URL('../../../', import.meta.url));

/** Globals that exist only in Node (or, for `setImmediate`, only there among the runtimes this package targets). */
const NODE_GLOBALS = new Set(['process', 'Buffer', '__dirname', '__filename', 'setImmediate', 'clearImmediate', 'require']);
/** Identifiers flagged wherever they are used as a value: the Node globals, and `eval` (so `const e = eval;` is caught, not only `eval(...)`). */
const FORBIDDEN_IDENTIFIERS = new Set([...NODE_GLOBALS, 'eval']);
/** Names a global object must not be asked for: the Node globals, and `eval` (a strict CSP forbids it). */
const FORBIDDEN_MEMBERS = new Set([...NODE_GLOBALS, 'eval']);
/** Objects whose `.process` / `['process']` is the Node global. */
const GLOBAL_OBJECTS = new Set(['globalThis', 'self', 'window', 'global']);
const BUILTINS = new Set(builtinModules.map((name) => name.replace(/^node:/, '').split('/')[0]));

export interface Finding {
  readonly line: number;
  readonly what: string;
}

const isNodeSpecifier = (text: string): boolean => text.startsWith('node:') || BUILTINS.has(text.split('/')[0] ?? '');

/** `(x as T)`, `<T>x`, `x!`, `x satisfies T`, `(x)` -> `x`: the wrappers that change nothing at run time. */
function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isTypeAssertionExpression(current) || ts.isNonNullExpression(current) || ts.isSatisfiesExpression(current)) current = current.expression;
  return current;
}

/** The text of a member name written as an identifier or a string literal (`.process`, `['process']`, `{ 'process': p }`); null for anything computed. */
function memberText(node: ts.Node | undefined): string | null {
  return node !== undefined && (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) ? node.text : null;
}

/** Names bound to a global object (`const g = globalThis;`), so `g.process` is caught like `globalThis.process`. */
function globalAliases(file: ts.SourceFile): Set<string> {
  const names = new Set(GLOBAL_OBJECTS);
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      const initializer = unwrap(node.initializer);
      if (ts.isIdentifier(initializer) && names.has(initializer.text)) names.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return names;
}

/** True when this identifier is a use of the name (a value read or call, an initializer included), not a declaration, a property name or a type position. */
function isGlobalUse(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (ts.isPropertyAccessExpression(parent)) return parent.expression === node;
  if (ts.isBindingElement(parent)) return parent.name !== node && parent.propertyName !== node;
  if (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent) || ts.isVariableDeclaration(parent) || ts.isParameter(parent)) return parent.name !== node;
  if (ts.isFunctionDeclaration(parent) || ts.isImportSpecifier(parent) || ts.isTypeReferenceNode(parent) || ts.isTypeQueryNode(parent)) return false;
  return true;
}

/** Every Node-only or CSP/worker-hostile construct in `source`: imports of Node modules, `require(...)`, Node globals (however reached), `eval`, `new Function`, `Atomics.wait`. */
export function findNodeUses(source: string): Finding[] {
  const file = ts.createSourceFile('audit.ts', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const globals = globalAliases(file);
  const findings: Finding[] = [];
  const add = (node: ts.Node, what: string): void => {
    findings.push({ line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, what });
  };
  const globalObject = (expression: ts.Expression): string | null => {
    const root = unwrap(expression);
    return ts.isIdentifier(root) && globals.has(root.text) ? root.text : null;
  };
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier) && isNodeSpecifier(node.moduleSpecifier.text)) add(node, `import of ${node.moduleSpecifier.text}`);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      if (argument !== undefined && ts.isStringLiteralLike(argument) && isNodeSpecifier(argument.text)) add(node, `dynamic import of ${argument.text}`);
    }
    if (ts.isIdentifier(node) && FORBIDDEN_IDENTIFIERS.has(node.text) && isGlobalUse(node)) add(node, node.text === 'require' ? 'require(' : `${node.text}`);
    // `eval(...)`, and the Function constructor with or without `new`: both compile a string, which a strict CSP forbids.
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && ts.isIdentifier(unwrap(node.expression))) {
      const callee = unwrap(node.expression) as ts.Identifier;
      if (callee.text === 'eval') add(node, 'eval(');
      if (callee.text === 'Function') add(node, 'new Function');
    }
    // `Atomics.wait` blocks the thread it runs on.
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(unwrap(node.expression)) && (unwrap(node.expression) as ts.Identifier).text === 'Atomics' && node.name.text === 'wait') add(node, 'Atomics.wait');
    if (ts.isElementAccessExpression(node) && ts.isIdentifier(unwrap(node.expression)) && (unwrap(node.expression) as ts.Identifier).text === 'Atomics' && memberText(node.argumentExpression) === 'wait') add(node, "Atomics['wait']");
    // `globalThis.process`, `(globalThis as T).process`, `globalThis!.process`, `g.process` for `const g = globalThis`.
    if (ts.isPropertyAccessExpression(node)) {
      const root = globalObject(node.expression);
      if (root !== null && FORBIDDEN_MEMBERS.has(node.name.text)) add(node, `${root}.${node.name.text}`);
    }
    if (ts.isElementAccessExpression(node)) {
      const root = globalObject(node.expression);
      const member = memberText(node.argumentExpression);
      if (root !== null && member !== null && FORBIDDEN_MEMBERS.has(member)) add(node, `${root}['${member}']`);
    }
    // `const { process } = globalThis;`, `function f({ Buffer } = globalThis)`: the member is named by the pattern, not by an access.
    if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
      const owner = node.parent.parent;
      const initializer = (ts.isVariableDeclaration(owner) || ts.isParameter(owner)) && owner.initializer !== undefined ? owner.initializer : undefined;
      const root = initializer === undefined ? null : globalObject(initializer);
      const member = memberText(node.propertyName ?? node.name);
      if (root !== null && member !== null && FORBIDDEN_MEMBERS.has(member)) add(node, `{ ${member} } = ${root}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return findings;
}

/** Every non-test `.ts` file under `src/`. */
function sourceFiles(dir: string = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__tests__') return [];
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(`${path}/`);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('A2: the engine source is browser-neutral', () => {
  it('the audit finds each forbidden construct in a probe (so a clean result means something)', () => {
    // Every snippet must produce a finding that names it. The forms an author could use to reach a Node global without writing `process.x` are here.
    const forbidden: ReadonlyArray<readonly [snippet: string, what: string]> = [
      ["import { readFileSync } from 'node:fs';", 'import of node:fs'],
      ["import path from 'path';", 'import of path'],
      ["const lazy = import('node:crypto');", 'dynamic import of node:crypto'],
      ["const a = require('x');", 'require('],
      ['const b = process.env.HOME;', 'process'],
      ['const c = Buffer.from([1]);', 'Buffer'],
      ['const d = __dirname + __filename;', '__dirname'],
      ['setImmediate(() => undefined);', 'setImmediate'],
      ['const p = process;', 'process'],
      ['const { from } = Buffer;', 'Buffer'],
      ['function f(x = process) { return x; }', 'process'],
      ['const o = { p: process };', 'process'],
      ['const e = globalThis.process;', 'globalThis.process'],
      ["const f = globalThis['process'];", "globalThis['process']"],
      ['const { process } = globalThis;', '{ process } = globalThis'],
      ["const { 'Buffer': B } = self;", '{ Buffer } = self'],
      ['function g({ process } = globalThis) { return process; }', '{ process } = globalThis'],
      ['const h = (globalThis as Record<string, unknown>).process;', 'globalThis.process'],
      ["const i = (globalThis as Record<string, unknown>)['process'];", "globalThis['process']"],
      ['const j = (<Record<string, unknown>>window).Buffer;', 'window.Buffer'],
      ['const k = globalThis!.process;', 'globalThis.process'],
      ['const alias = globalThis; const l = alias.process;', 'alias.process'],
      ['const m = global.require;', 'global.require'],
      ['const n = globalThis.eval("1");', 'globalThis.eval'],
      ['eval("1");', 'eval('],
      ['const ev = eval;', 'eval'],
      ['const q = new Function("return 1");', 'new Function'],
      ['const r = Function("return 1");', 'new Function'],
      ['Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);', 'Atomics.wait'],
      ["Atomics['wait'](cells, 0, 0);", "Atomics['wait']"],
    ];
    for (const [snippet, what] of forbidden) expect(findNodeUses(snippet).map((finding) => finding.what), snippet).toContain(what);
    // Mentions that are not uses are not findings: comments, strings, property names, a local named like a global's property, other objects, type positions.
    const harmless = [
      "// process.env, Buffer, require('x'), eval(1), new Function('x')",
      "const s = 'node:fs and process.';",
      'const o = { process: 1, Buffer: 2 }; o.process; const t = { x: o.Buffer };',
      'function f(process: number): number { return process; }',
      'const { process: renamed } = o; const { from } = o;',
      'const u = o.eval; const v = Function.prototype; Atomics.notify(cells, 0, 1);',
      'type Probe = typeof Buffer;',
    ].join('\n');
    expect(findNodeUses(harmless).map((finding) => finding.what)).toEqual(['process']);
  });

  it('no file under src/ (tests excluded) imports a Node module or reaches a Node global (process, Buffer, require, __dirname, __filename, setImmediate; directly, by alias, by destructuring or through globalThis), eval, new Function or Atomics.wait', () => {
    const files = sourceFiles();
    expect(files.length).toBeGreaterThan(100);
    expect(files.some((file) => file.endsWith('/worker/session.ts'))).toBe(true);
    const hits = files.flatMap((file) => findNodeUses(readFileSync(file, 'utf8')).map((finding) => `${file.slice(SRC.length)}:${finding.line} ${finding.what}`));
    expect(hits).toEqual([]);
  });

  it('tsconfig.build.json compiles with no ambient types and leaves the tests out, so a Node type in src/ fails the build', () => {
    const read = ts.readConfigFile(`${PACKAGE}tsconfig.build.json`, (path) => readFileSync(path, 'utf8'));
    expect(read.error).toBeUndefined();
    const config = read.config as { compilerOptions?: { types?: unknown }; exclude?: unknown };
    expect(config.compilerOptions?.types).toEqual([]);
    expect(config.exclude).toEqual(expect.arrayContaining(['src/**/__tests__/**']));
    // The parent config loads Node types for tests; the build config's `types: []` is what takes them away.
    const parent = ts.readConfigFile(`${PACKAGE}tsconfig.json`, (path) => readFileSync(path, 'utf8')).config as { compilerOptions?: { types?: unknown } };
    expect(parent.compilerOptions?.types).toEqual(['node']);
  });
});
