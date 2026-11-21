// CS-V1 (STANDARDS §6, contract first): the route finder for every verb. Every route the API declares is read from the
// code itself with the TypeScript parser (already a dev dependency; no new technology), so a new route cannot slip past
// a check built on it: @Get, @Post, @Put, @Patch and @Delete, under their controller's prefix, in any file or subfolder
// of the folder it is given (B120: features/ included, through tsFiles). For each route it gives the handler's inputs
// (@Body, @Query, @Param) and the service methods the handler calls, and `follows` tells whether an input reaches a zod
// parse in the handler or in the service method it is handed to. check_forms_qa53.ts keeps its own GET-only finder.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { tsFiles } from "./ts-files.ts";

export type Verb = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "ALL";
export type Input = { kind: "body" | "query" | "param"; key: string | null; name: string };
export type Route = {
  verb: Verb; path: string; file: string; line: number; controller: string; handler: string; inputs: Input[];
  /** The handler's node, for `follows`. */ node: ts.MethodDeclaration;
};
type ClassInfo = { file: string; node: ts.ClassDeclaration };

const VERBS: Record<string, Verb> = { Get: "GET", Post: "POST", Put: "PUT", Patch: "PATCH", Delete: "DELETE", Head: "HEAD", Options: "OPTIONS", All: "ALL" };
const decorators = (n: ts.Node) => (ts.canHaveDecorators(n) ? ts.getDecorators(n) ?? [] : []);
/** A decorator's name and its first string argument: @Post("cases/:id") → ["Post", "cases/:id"]; @Body() → ["Body", null]. */
function deco(d: ts.Decorator): [string, string | null] | null {
  const e = d.expression;
  if (!ts.isCallExpression(e) || !ts.isIdentifier(e.expression)) return null;
  const a = e.arguments[0];
  return [e.expression.text, a && ts.isStringLiteralLike(a) ? a.text : null];
}
const join2 = (prefix: string, p: string) => `/${prefix}/${p}`.replace(/\/+/g, "/").replace(/(.)\/$/, "$1");

/** Every source file of `dir` parsed once (a check reads the same folder many times). */
const cache = new Map<string, { file: string; sf: ts.SourceFile }[]>();
function sources(dir: string) {
  let s = cache.get(dir);
  if (!s) cache.set(dir, (s = tsFiles(dir).map((f) => ({ file: f, sf: ts.createSourceFile(f, readFileSync(join(dir, f), "utf8"), ts.ScriptTarget.Latest, true) }))));
  return s;
}
function classes(dir: string): Map<string, ClassInfo> {
  const out = new Map<string, ClassInfo>();
  for (const { file, sf } of sources(dir)) ts.forEachChild(sf, function walk(n) {
    if (ts.isClassDeclaration(n) && n.name && !out.has(n.name.text)) out.set(n.name.text, { file, node: n });
    ts.forEachChild(n, walk);
  });
  return out;
}

/** Every route under `dir`, each verb, with its full path ("/api/runtime/cases/:id"). */
export function routes(dir: string): Route[] {
  const out: Route[] = [];
  for (const { file, sf } of sources(dir)) ts.forEachChild(sf, function walk(n) {
    if (ts.isClassDeclaration(n) && n.name) {
      const c = decorators(n).map(deco).find((d) => d?.[0] === "Controller");
      if (c) for (const m of n.members) {
        if (!ts.isMethodDeclaration(m) || !ts.isIdentifier(m.name)) continue;
        for (const d of decorators(m).map(deco)) {
          if (!d || !(d[0] in VERBS)) continue;
          const inputs: Input[] = [];
          for (const p of m.parameters) for (const pd of decorators(p).map(deco)) {
            const kind = pd?.[0] === "Body" ? "body" : pd?.[0] === "Query" ? "query" : pd?.[0] === "Param" ? "param" : null;
            // A destructured @Body() ({ a, b }) has no one name to follow: it is kept with an empty name, so a check sees it
            // as unparsed (loud), never as missing (review of #2007 m1).
            if (kind) inputs.push({ kind, key: pd![1], name: ts.isIdentifier(p.name) ? p.name.text : "" });
            // @Req() read as req.body / req.query is a body or a query too: kept by its dotted name, which no parse
            // below matches, so it is unparsed until the route takes @Body()/@Query() instead.
            if (pd?.[0] === "Req" && ts.isIdentifier(p.name) && m.body) for (const prop of ["body", "query"] as const)
              if (reads(m.body, p.name.text, prop)) inputs.push({ kind: prop, key: null, name: `${p.name.text}.${prop}` });
          }
          out.push({ verb: VERBS[d[0]], path: join2(c[1] ?? "", d[1] ?? ""), file, line: sf.getLineAndCharacterOfPosition(m.getStart()).line + 1, controller: n.name.text, handler: m.name.text, inputs, node: m });
        }
      }
    }
    ts.forEachChild(n, walk);
  });
  return out;
}

/** Whether `n` reads <name>.<prop> anywhere. */
function reads(n: ts.Node, name: string, prop: string): boolean {
  if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === name && n.name.text === prop) return true;
  return ts.forEachChild(n, (k) => (reads(k, name, prop) ? true : undefined)) ?? false;
}
/** The zod parse calls: parse(S, x) and parsed(S, x) (the app's helpers, programs.ts and review-rounds.ts), S.parse(x),
 *  S.safeParse(x) and their async forms, where S is a schema's name (capitalised: PutAnswer, LinkCode) or a schema
 *  built in place (z.object({…}).parse). JSON.parse, Date.parse, qs.parse, path.parse are not schemas. The parsed value's
 *  expression is returned. */
function parsedArg(c: ts.CallExpression): ts.Expression | null {
  const e = c.expression;
  if (ts.isIdentifier(e) && (e.text === "parse" || e.text === "parsed" || e.text === "parseInput") && c.arguments.length >= 2) return c.arguments[1];
  if (ts.isPropertyAccessExpression(e) && /^(safeP|p)arse(Async)?$/.test(e.name.text)) {
    const s = e.expression;
    const schema = ts.isIdentifier(s) ? /^[A-Z]/.test(s.text) && !/^(JSON|Date|Number)$/.test(s.text) : ts.isCallExpression(s) || ts.isPropertyAccessExpression(s);
    if (schema) return c.arguments[0] ?? null;
  }
  return null;
}
/** Whether `e` is the whole value named `name`: x itself, or wrapped in parentheses, `as`, `!`, `satisfies`, `x ?? {}`,
 *  `x || {}` or `{ ...x, id }`. A part of it (x.reason, { name: x.name }, String(x)) is not the whole value: a parse of
 *  one field leaves the rest read by hand, so it does not count (review of #2007 M1). */
function whole(e: ts.Expression, name: string): boolean {
  if (ts.isIdentifier(e)) return e.text === name;
  if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isSatisfiesExpression(e) || ts.isTypeAssertionExpression(e)) return whole(e.expression, name);
  if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || e.operatorToken.kind === ts.SyntaxKind.BarBarToken)) return whole(e.left, name);
  if (ts.isObjectLiteralExpression(e)) return e.properties.some((p) => ts.isSpreadAssignment(p) && whole(p.expression, name));
  return false;
}
function method(cls: ts.ClassDeclaration, name: string) {
  return cls.members.find((m): m is ts.MethodDeclaration => ts.isMethodDeclaration(m) && ts.isIdentifier(m.name) && m.name.text === name && !!m.body);
}
/** The class a constructor field holds: constructor(@Inject(Runtime) private readonly r: Runtime) → r → Runtime. */
function fieldClass(cls: ts.ClassDeclaration, field: string): string | null {
  for (const m of cls.members) if (ts.isConstructorDeclaration(m)) for (const p of m.parameters) {
    if (!ts.isIdentifier(p.name) || p.name.text !== field) continue;
    const inj = decorators(p).map((d) => d.expression).find((e) => ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "Inject") as ts.CallExpression | undefined;
    const a = inj?.arguments[0];
    if (a && ts.isIdentifier(a)) return a.text;
    if (p.type && ts.isTypeReferenceNode(p.type) && ts.isIdentifier(p.type.typeName)) return p.type.typeName.text;
  }
  return null;
}

/** Where the value named `name` in `fn` (a method of `cls`) reaches a zod parse: "<Class>.<method>" of the parse, or
 *  null. It follows the value into this.<method>(…) of the same class and this.<field>.<method>(…) of an injected
 *  service, by argument position, up to `depth` steps. `seen` stops a loop. */
export function follows(dir: string, cls: string, fn: ts.MethodDeclaration, name: string, depth = 4, seen = new Set<string>()): string | null {
  if (!name) return null;
  const all = classes(dir), here = all.get(cls);
  const at = `${cls}.${(fn.name as ts.Identifier).text}`;
  if (!here || seen.has(`${at}:${name}`)) return null;
  seen.add(`${at}:${name}`);
  let found: string | null = null;
  const visit = (n: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(n)) {
      const a = parsedArg(n);
      if (a && whole(a, name)) { found = at; return; }
      if (depth > 0) {
        const e = n.expression;
        let target: [string, string] | null = null;
        if (ts.isPropertyAccessExpression(e) && e.expression.kind === ts.SyntaxKind.ThisKeyword) target = [cls, e.name.text];
        else if (ts.isPropertyAccessExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
          const k = fieldClass(here.node, e.expression.name.text);
          if (k) target = [k, e.name.text];
        }
        const into = target && all.get(target[0]) && method(all.get(target[0])!.node, target[1]);
        if (into) n.arguments.forEach((arg, i) => {
          const p = into.parameters[i];
          if (!found && p && ts.isIdentifier(p.name) && whole(arg, name)) found = follows(dir, target![0], into, p.name.text, depth - 1, seen);
        });
      }
    }
    ts.forEachChild(n, visit);
  };
  if (fn.body) visit(fn.body);
  return found;
}
