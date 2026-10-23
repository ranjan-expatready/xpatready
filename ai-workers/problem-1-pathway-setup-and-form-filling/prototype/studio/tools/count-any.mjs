// Explicit `any` ratchet (STANDARDS §7 [M] "Strict TypeScript, no any"; Lead check 23 Oct, item 2). Counts the `any`
// type written in live code (api/src, web/src, engine, contracts) with the TypeScript parser, so comments and words in
// strings are not counted. Fails when the total rises above tools/any-baseline.json, or when a file typed clean
// (listed under "clean") has any again. Lower the baseline when a screen types more files; never raise it.
//   node studio/tools/count-any.mjs            check against the baseline (exit 1 on a rise)
//   node studio/tools/count-any.mjs --list     every file with its count
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "../node_modules/typescript/lib/typescript.js";

const STUDIO = join(import.meta.dirname, "..");
const AREAS = ["api/src", "web/src", "engine", "contracts"];
const files = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) && !n.endsWith(".d.ts") ? [p] : []; });

function count(file) {
  const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, false, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let n = 0;
  const walk = (node) => { if (node.kind === ts.SyntaxKind.AnyKeyword) n++; ts.forEachChild(node, walk); };
  walk(src);
  return n;
}

const per = Object.fromEntries(AREAS.flatMap((a) => files(join(STUDIO, a))).map((f) => [relative(STUDIO, f), count(f)]));
const total = Object.values(per).reduce((s, n) => s + n, 0);
const base = JSON.parse(readFileSync(join(STUDIO, "tools", "any-baseline.json"), "utf8"));
if (process.argv.includes("--list")) for (const [f, n] of Object.entries(per).filter(([, n]) => n).sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(4)}  ${f}`);
const dirty = base.clean.filter((f) => per[f]);
const problems = [];
if (total > base.total) problems.push(`explicit any rose to ${total} (baseline ${base.total}): type the new code with the shared contracts instead.`);
for (const f of dirty) problems.push(`${f} was typed clean and now has ${per[f]} explicit any.`);
console.log(problems.length ? `any ratchet FAILED: ${problems.join(" ")}` : `any ratchet: ${total} explicit any in live code (baseline ${base.total}); ${base.clean.length} files clean.`);
process.exit(problems.length ? 1 : 0);
