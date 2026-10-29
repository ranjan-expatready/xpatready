// Demo bug, 29 Oct: every live guide pick failed because find-guide-output.v1.schema.json held "maxItems", which the AI
// service's structured outputs refuse (400 invalid_request_error before any processing). Stub passes never send a schema to
// the real service, so no suite saw it. This check lints every output schema under p2/prompts against the keywords
// structured outputs refuse (official docs, build-with-claude/structured-outputs, "JSON Schema limitations", read 29 Oct):
// numerical constraints, string length, array constraints beyond minItems 0 or 1, object size, conditional and negated schemas,
// recursive or external references, allOf with $ref, objects or arrays inside enum, additionalProperties other than false, and
// regex features the service refuses (back-references, look-ahead or look-behind, \b \B, large {n,m} ranges). A keyword is only flagged where it is a keyword, never where it is a property's
// name. A pass and a fail case per rule; then every real schema. No server, no network, NO model call (US$0).
//   C11.14 an AI step's request is one the AI service accepts
//   cd prototype/studio && npx tsx tests/check_forms_schema_lint.ts
// (by hand: tsx --tsconfig studio/api/tsconfig.json …, as run-suites.sh does)
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const PROMPTS = join(import.meta.dirname, "..", "..", "p2", "prompts");

/** Keywords structured outputs refuse. minItems is accepted only as 0 or 1. */
const REFUSED = ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "maxItems", "uniqueItems", "contains", "minContains", "maxContains",
  "minProperties", "maxProperties", "patternProperties", "propertyNames", "dependentRequired", "dependentSchemas", "if", "then", "else", "not", "unevaluatedProperties", "unevaluatedItems"];
const FORMATS = new Set(["date-time", "time", "date", "duration", "email", "hostname", "uri", "ipv4", "ipv6", "uuid"]);
/** Keys whose value is a map of names → schemas (the names are not keywords). */
const NAME_MAPS = new Set(["properties", "$defs", "definitions"]);

/** What the service refuses in a regex (docs: simple patterns work; these do not). */
function patternProblems(re: string): string[] {
  const out: string[] = [];
  if (/\\[1-9]/.test(re)) out.push("uses a back-reference");
  if (/\(\?<?[=!]/.test(re)) out.push("uses a look-ahead or look-behind");
  if (/\\[bB]/.test(re)) out.push("uses a word boundary");
  for (const m of re.matchAll(/\{(\d+)(?:,(\d*))?\}/g)) if (Number(m[1]) > 100 || Number(m[2] || 0) > 100) out.push(`uses a large range {${m[1]},${m[2] ?? ""}}`);
  return out;
}

/** Every problem in one schema, with its JSON path. */
export function lintSchema(schema: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) { node.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(o)) {
      if (NAME_MAPS.has(k) && v && typeof v === "object") { for (const [name, sub] of Object.entries(v)) walk(sub, `${path}.${k}.${name}`); continue; }
      if (REFUSED.includes(k)) out.push(`${path}: "${k}" is refused by structured outputs`);
      if (k === "minItems" && !(v === 0 || v === 1)) out.push(`${path}: "minItems" ${String(v)} is refused (only 0 or 1)`);
      if (k === "additionalProperties" && v !== false) out.push(`${path}: "additionalProperties" must be false`);
      if (k === "format" && typeof v === "string" && !FORMATS.has(v)) out.push(`${path}: format "${v}" is not supported`);
      if (k === "pattern" && typeof v === "string") for (const why of patternProblems(v)) out.push(`${path}: pattern ${why}`);
      if (k === "$ref" && typeof v === "string" && !v.startsWith("#")) out.push(`${path}: an external $ref is refused`);
      if (k === "allOf" && Array.isArray(v) && v.some((x) => x && typeof x === "object" && "$ref" in x)) out.push(`${path}: allOf with $ref is refused`);
      if (k === "enum" && Array.isArray(v) && v.some((x) => x !== null && typeof x === "object")) out.push(`${path}: an enum holds only strings, numbers, booleans or null`);
      if (k === "enum" || k === "const" || k === "required") continue; // values, not schemas
      walk(v, `${path}.${k}`);
    }
  };
  walk(schema, "$");
  // Recursive references: a definition that reaches itself through $ref is refused.
  const s = schema as { $defs?: Record<string, unknown>; definitions?: Record<string, unknown> };
  const defs = { ...(s?.definitions ?? {}), ...(s?.$defs ?? {}) };
  const refsOf = (node: unknown): string[] => JSON.stringify(node ?? null).match(/"\$ref":"#\/(?:\$defs|definitions)\/([^"]+)"/g)?.map((m) => m.replace(/^.*\//, "").replace(/"$/, "")) ?? [];
  for (const name of Object.keys(defs)) {
    const seen = new Set<string>(); const todo = refsOf(defs[name]);
    while (todo.length) { const n = todo.pop()!; if (n === name) { out.push(`$defs.${name}: refers to itself (recursive schemas are refused)`); break; } if (!seen.has(n)) { seen.add(n); todo.push(...refsOf(defs[n])); } }
  }
  return out;
}

// --- each rule: a pass and a fail
ok("demo bug fail: an array with maxItems is refused (the 29 Oct guide schema)", lintSchema({ type: "object", additionalProperties: false, properties: { others: { type: "array", maxItems: 5, items: { type: "string" } } } }).some((p) => /maxItems/.test(p)));
ok("pass: the same array without maxItems is clean", lintSchema({ type: "object", additionalProperties: false, properties: { others: { type: "array", items: { type: "string" } } } }).length === 0);
ok("fail: minimum and maximum on a number are refused", lintSchema({ type: "integer", minimum: 0, maximum: 9 }).length === 2);
ok("fail: minLength, maxLength and minItems above 1 are refused", lintSchema({ type: "object", additionalProperties: false, properties: { a: { type: "string", minLength: 1, maxLength: 9 }, b: { type: "array", minItems: 2, items: { type: "string" } } } }).length === 3);
ok("pass: minItems 0 or 1 is accepted", lintSchema({ type: "array", minItems: 1, items: { type: "string" } }).length === 0);
ok("fail: additionalProperties other than false is refused", lintSchema({ type: "object", additionalProperties: true, properties: {} }).length === 1 && lintSchema({ type: "object", additionalProperties: { type: "string" } }).length === 1);
ok("pass: a property named like a keyword (then, maximum, not) is a name, not a keyword", lintSchema({ type: "object", additionalProperties: false, required: ["then", "maximum"], properties: { then: { type: "string" }, maximum: { type: "integer" }, not: { enum: ["minimum"] } } }).length === 0);
ok("fail: if / then / not as keywords are refused", lintSchema({ type: "object", additionalProperties: false, if: { type: "object" }, then: { type: "object" }, not: { type: "null" } }).length === 3);
ok("pass: a supported format and pattern are accepted (pattern completed live: field-map v2)", lintSchema({ type: "string", format: "date", pattern: "^[A-Z]" }).length === 0);
ok("fail: an unsupported format is refused", lintSchema({ type: "string", format: "regex" }).length === 1);
ok("pass: $ref between definitions is accepted", lintSchema({ $defs: { a: { type: "object", additionalProperties: false, properties: { b: { $ref: "#/$defs/b" } } }, b: { type: "string" } }, $ref: "#/$defs/a" }).length === 0);
ok("fail: a definition that refers to itself (recursion) is refused", lintSchema({ $defs: { node: { type: "object", additionalProperties: false, properties: { child: { $ref: "#/$defs/node" } } } } }).some((p) => /refers to itself/.test(p)));

ok("pass: a simple pattern (the field-map fact key) is accepted", lintSchema({ type: "string", pattern: "^[a-z][a-z_]*\\.[a-z][a-z0-9_]*$" }).length === 0);
ok("fail: a pattern with a back-reference, a look-ahead, a word boundary or a large range is refused", ["^(a)\\1$", "^(?=a)b$", "\\bword\\b", "^a{1,500}$"].every((re) => lintSchema({ type: "string", pattern: re }).length === 1));
ok("fail: an external $ref, allOf with $ref, and an object inside enum are refused", lintSchema({ $ref: "https://example.org/s.json" }).length === 1 && lintSchema({ allOf: [{ $ref: "#/$defs/a" }], $defs: { a: { type: "string" } } }).length === 1 && lintSchema({ enum: [{ a: 1 }] }).length === 1);

// --- every real output schema
const files = readdirSync(PROMPTS).filter((f) => f.endsWith(".schema.json")).sort();
const problems = files.flatMap((f) => lintSchema(JSON.parse(readFileSync(join(PROMPTS, f), "utf8"))).map((p) => `${f} ${p}`));
ok(`C11.14: every output schema in p2/prompts (${files.length}) uses only keywords the AI service accepts`, files.length >= 9 && problems.length === 0, problems);
ok("demo bug pass: the guide schema has no maxItems now (at most 5 is kept in code: finder.ts)", !/maxItems/.test(readFileSync(join(PROMPTS, "find-guide-output.v1.schema.json"), "utf8")) && /\.slice\(0, 5\)/.test(readFileSync(join(import.meta.dirname, "..", "api", "src", "finder.ts"), "utf8")));
ok("pass: the who-can-be schema has no minimum or maximum now (0 to 9 is kept in code: people-ai.ts)", !/minimum|maximum/.test(readFileSync(join(PROMPTS, "who-can-be-output.v1.schema.json"), "utf8")) && /n >= 0 && n <= 9/.test(readFileSync(join(import.meta.dirname, "..", "api", "src", "people-ai.ts"), "utf8")));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
