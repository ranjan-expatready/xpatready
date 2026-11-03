#!/usr/bin/env node
// Type check (P-291: the outsider audit of 29 Oct found no type check in CI). Runs tsc --noEmit on the studio's two
// projects, api (api/src, engine, tests) and web (web/src), and fails only on an error that is not in the known list
// typecheck-known.txt (15 errors in older test files on 3 Nov; the app code itself had none). An error is known by
// "project file: TScode: message" without its line, so an edit elsewhere in a file does not turn a known error into a
// new one. A fixed known error is reported so its line can be removed; the list may only shrink (--write enforces it).
// An error tsc reports without a file (a missing tsconfig TS5058, no inputs TS18003, a missing type library TS2688) is
// never known: with no file-located error beside it the check could not run at all (exit 2), otherwise it is new (exit 1).
//   node product/tools/typecheck.mjs                 check: exit 0 clean, 1 on a new error, 2 when tsc could not check
//   node product/tools/typecheck.mjs --write         rewrite typecheck-known.txt from today's errors, only removing lines
//   --project <name>=<tsconfig> (repeatable) and --known <file> replace the defaults (check-typecheck.sh uses them)
// Needs the studio's packages (npm ci) and the Prisma client (prisma generate): cloud-setup.sh does both. US$0.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const S = join(HERE, "../../prototype/studio"), TSC = join(S, "node_modules/.bin/tsc");
const args = process.argv.slice(2), opt = (name) => args.flatMap((a, i) => (a === name ? [args[i + 1]] : []));
const projects = opt("--project").length
  ? opt("--project").map((p) => { const [name, ...rest] = p.split("="); return { name, path: resolve(rest.join("=")) }; })
  : ["api", "web"].map((name) => ({ name, path: join(S, name, "tsconfig.json") }));
const KNOWN = opt("--known")[0] ? resolve(opt("--known")[0]) : join(HERE, "typecheck-known.txt");
if (!existsSync(TSC)) { console.log("tsc is missing: run npm ci in prototype/studio (cloud-setup.sh); nothing was checked"); process.exit(2); }

const errors = [], fileless = [];
let couldNotCheck = false;
for (const { name, path } of projects) {
  const t0 = Date.now();
  // --noCheck false: a tsconfig's noCheck cannot switch checking off; --listFiles: what tsc actually read (#734 review).
  const r = spawnSync(TSC, ["--noEmit", "--noCheck", "false", "--listFiles", "--pretty", "false", "-p", path], { cwd: S, encoding: "utf8", maxBuffer: 256 << 20 });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  // The project's own sources among the files read: not declarations, not packages. None means nothing was checked
  // (files: [] with references, an include that finds only .d.ts files), even when tsc exits 0.
  const sources = out.split("\n").filter((l) => /^\/.*\.(ts|tsx|mts|cts)$/.test(l.trim()) && !/\.d\.[mc]?ts$/.test(l.trim()) && !/\/node_modules\//.test(l)).length;
  const located = [...out.matchAll(/^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/gm)].map((m) => ({ project: name, file: m[1].replace(/\\/g, "/"), line: m[2], code: m[3], msg: m[4].trim() }));
  const bare = [...out.matchAll(/^error (TS\d+): (.*)$/gm)].map((m) => ({ project: name, code: m[1], msg: m[2].trim() }));
  console.log(`tsc ${name}: ${sources} source file(s), ${located.length} error(s) in files, ${bare.length} without a file, exit ${r.status ?? r.signal} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  // Not checked: tsc failed naming no file (missing or moved tsconfig, empty include), read none of the project's own
  // sources, or was killed or could not start (a signal or a spawn error: its output may be cut short).
  if ((r.status !== 0 && located.length === 0) || sources === 0 || r.signal || r.error) {
    couldNotCheck = true;
    console.log(`STOP  tsc ${name} exited ${r.status ?? r.signal} without checking any file (${path}):\n${out.trim().split("\n").slice(0, 10).map((l) => `  ${l}`).join("\n")}`);
  }
  errors.push(...located); fileless.push(...bare);
}
if (couldNotCheck) process.exit(2);
const key = (e) => `${e.project} ${e.file}: ${e.code}: ${e.msg}`;
const readKnown = () => (existsSync(KNOWN) ? readFileSync(KNOWN, "utf8") : "").split("\n").filter((l) => l.trim() && !l.startsWith("#"));
const multiset = (lines) => { const m = new Map(); for (const l of lines) m.set(l, (m.get(l) ?? 0) + 1); return m; };

if (args.includes("--write")) {
  if (fileless.length) { console.log(`FAIL  ${fileless.length} error(s) without a file cannot be listed as known: fix them first`); process.exit(1); }
  // Only remove lines (the list may only shrink): every line written must already be in the list, as often.
  const have = multiset(readKnown()), added = [];
  for (const k of errors.map(key)) { const n = have.get(k) ?? 0; if (n > 0) have.set(k, n - 1); else added.push(k); }
  if (added.length) { console.log(`FAIL  --write would add ${added.length} line(s); the known list may only shrink. Fix these instead:`); for (const k of added) console.log(`  ${k}`); process.exit(1); }
  writeFileSync(KNOWN, "# Known type errors (typecheck.mjs): one per line, \"project file: TScode: message\". Only ever remove lines.\n" + errors.map(key).sort().join("\n") + (errors.length ? "\n" : ""));
  console.log(`wrote ${errors.length} known error(s) to ${KNOWN}`); process.exit(0);
}
// Known errors as a multiset: the same error twice in a file needs two lines.
const known = multiset(readKnown()), fresh = [];
for (const e of errors) { const k = key(e), n = known.get(k) ?? 0; if (n > 0) known.set(k, n - 1); else fresh.push(e); }
const fixed = [...known].flatMap(([k, n]) => Array(n).fill(k));
if (fixed.length) { console.log(`${fixed.length} known error(s) no longer occur: remove them from typecheck-known.txt (--write)`); for (const k of fixed) console.log(`  fixed  ${k}`); }
if (fresh.length || fileless.length) {
  console.log(`FAIL  ${fresh.length + fileless.length} new type error(s) (not in typecheck-known.txt):`);
  for (const e of fresh) console.log(`  ${e.project}  ${e.file}(${e.line}): ${e.code}: ${e.msg}`);
  for (const e of fileless) console.log(`  ${e.project}  (no file): ${e.code}: ${e.msg}`);
  process.exit(1);
}
console.log(`PASS  no new type errors (${errors.length} known, ${fixed.length} fixed)`);
