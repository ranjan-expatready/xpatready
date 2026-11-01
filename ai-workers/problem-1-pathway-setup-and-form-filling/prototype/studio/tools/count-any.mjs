// Explicit `any` ratchet (STANDARDS §7 [M] "Strict TypeScript, no any"; Lead check 23 Oct, item 2). Counts the `any`
// type written in live code (api/src, web/src, engine, contracts) with the TypeScript parser, so comments and words in
// strings are not counted. Fails when the total rises above tools/any-baseline.json, or when a file typed clean
// (listed under "clean") has any again. Lower the baseline when a screen types more files; never raise it.
// CI passes --against <base commit> (P-211): the check is then "this change adds no explicit any" (the total at the base
// commit, not the stored baseline), so two PRs that each pass alone also pass together in a merge-queue batch.
//   node studio/tools/count-any.mjs            check against the baseline (exit 1 on a rise)
//   node studio/tools/count-any.mjs --against <ref>   check against the total at that commit
//   node studio/tools/count-any.mjs --list     every file with its count
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import ts from "../node_modules/typescript/lib/typescript.js";

const STUDIO = join(import.meta.dirname, "..");
const AREAS = ["api/src", "web/src", "engine", "contracts"];
const files = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) && !n.endsWith(".d.ts") ? [p] : []; });

function count(file, text = readFileSync(file, "utf8")) {
  const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let n = 0;
  const walk = (node) => { if (node.kind === ts.SyntaxKind.AnyKeyword) n++; ts.forEachChild(node, walk); };
  walk(src);
  return n;
}

const per = Object.fromEntries(AREAS.flatMap((a) => files(join(STUDIO, a))).map((f) => [relative(STUDIO, f), count(f)]));
const total = Object.values(per).reduce((s, n) => s + n, 0);
const base = JSON.parse(readFileSync(join(STUDIO, "tools", "any-baseline.json"), "utf8"));
const at = process.argv.indexOf("--against");
if (at > 0) {
  const ref = process.argv[at + 1];
  const git = (...a) => execFileSync("git", a, { cwd: STUDIO, encoding: "utf8", maxBuffer: 1 << 28 });
  const top = git("rev-parse", "--show-prefix").trim();
  const old = git("ls-tree", "-r", "--name-only", ref, "--", ...AREAS).split("\n").filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".d.ts"));
  base.total = old.reduce((s, f) => s + count(f, git("show", `${ref}:${top}${f}`)), 0);
}
if (process.argv.includes("--list")) for (const [f, n] of Object.entries(per).filter(([, n]) => n).sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(4)}  ${f}`);
const dirty = base.clean.filter((f) => per[f]);
const problems = [];
if (total > base.total) problems.push(`explicit any rose to ${total} (${at > 0 ? "at the base commit" : "baseline"} ${base.total}): type the new code with the shared contracts instead.`);
for (const f of dirty) problems.push(`${f} was typed clean and now has ${per[f]} explicit any.`);
console.log(problems.length ? `any ratchet FAILED: ${problems.join(" ")}` : `any ratchet: ${total} explicit any in live code (${at > 0 ? "at the base commit" : "baseline"} ${base.total}); ${base.clean.length} files clean.`);
process.exit(problems.length ? 1 : 0);
