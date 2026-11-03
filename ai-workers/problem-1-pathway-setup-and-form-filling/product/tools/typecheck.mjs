#!/usr/bin/env node
// Type check (P-291: the outsider audit of 29 Oct found no type check in CI). Runs tsc --noEmit on the studio's two
// projects, api (api/src, engine, tests) and web (web/src), and fails only on an error that is not in the known list
// typecheck-known.txt (15 errors in older test files on 3 Nov; the app code itself had none). An error is known by
// "file: TScode: message" without its line, so an edit elsewhere in a file does not turn a known error into a new one.
// A fixed known error is reported so its line can be removed; the list may only shrink.
//   node product/tools/typecheck.mjs           check (exit 1 on a new error)
//   node product/tools/typecheck.mjs --write   rewrite typecheck-known.txt from today's errors (only to shrink it)
// Needs the studio's packages (npm ci) and the Prisma client (prisma generate): cloud-setup.sh does both. US$0.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const S = join(HERE, "../../prototype/studio"), KNOWN = join(HERE, "typecheck-known.txt");
const TSC = join(S, "node_modules/.bin/tsc");
if (!existsSync(TSC)) { console.log("tsc is missing: run npm ci in prototype/studio (cloud-setup.sh); nothing was checked"); process.exit(2); }

const errors = [];
for (const project of ["api", "web"]) {
  const t0 = Date.now(); let out = "";
  try { out = execFileSync(TSC, ["--noEmit", "--pretty", "false", "-p", join(S, project, "tsconfig.json")], { cwd: S, encoding: "utf8", maxBuffer: 64 << 20 }); }
  catch (e) { out = `${e.stdout ?? ""}${e.stderr ?? ""}`; if (!/error TS\d+/.test(out)) { console.log(`tsc ${project} failed without type errors:\n${out}`); process.exit(2); } }
  const found = [...out.matchAll(/^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/gm)].map((m) => ({ project, file: m[1].replace(/\\/g, "/"), line: m[2], code: m[3], msg: m[4].trim() }));
  console.log(`tsc ${project}: ${found.length} error(s) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  errors.push(...found);
}
const key = (e) => `${e.project} ${e.file}: ${e.code}: ${e.msg}`;
if (process.argv.includes("--write")) {
  writeFileSync(KNOWN, "# Known type errors (typecheck.mjs): one per line, \"project file: TScode: message\". Only ever remove lines.\n" + errors.map(key).sort().join("\n") + "\n");
  console.log(`wrote ${errors.length} known error(s) to ${KNOWN}`); process.exit(0);
}
// Known errors as a multiset: the same error twice in a file needs two lines.
const known = new Map();
for (const l of (existsSync(KNOWN) ? readFileSync(KNOWN, "utf8") : "").split("\n")) if (l.trim() && !l.startsWith("#")) known.set(l, (known.get(l) ?? 0) + 1);
const fresh = [];
for (const e of errors) { const k = key(e), n = known.get(k) ?? 0; if (n > 0) known.set(k, n - 1); else fresh.push(e); }
const fixed = [...known].flatMap(([k, n]) => Array(n).fill(k));
if (fixed.length) { console.log(`${fixed.length} known error(s) no longer occur: remove them from typecheck-known.txt`); for (const k of fixed) console.log(`  fixed  ${k}`); }
if (fresh.length) {
  console.log(`FAIL  ${fresh.length} new type error(s) (not in typecheck-known.txt):`);
  for (const e of fresh) console.log(`  ${e.project}  ${e.file}(${e.line}): ${e.code}: ${e.msg}`);
  process.exit(1);
}
console.log(`PASS  no new type errors (${errors.length} known, ${fixed.length} fixed)`);
