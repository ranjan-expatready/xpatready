#!/usr/bin/env node
// B160 (Lead 32, found on #1275; P-214 fix to the checks): a suite's red line must fail the suite. The recorder in
// studio/tests/runtime/api.ts prints PASS/FAIL lines and its summary() returns the number of failures; run-suites.sh
// judges a suite only by its exit code. A suite whose last step is a bare `summary();` (at the end of the file, or as the
// last statement of the block it ends in, an async main or IIFE, with no exit after it) prints its FAIL lines and still
// exits 0: it can never fail. This refuses such a file. The fix: `process.exit(summary() ? 1 : 0);` or
// `process.exitCode = summary() ? 1 : 0;`.
//   node product/tools/suite-exit.mjs [--self-test] [dir ...]   exit 0 clean, 1 a suite that can never fail
import { existsSync, readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const P = "ai-workers/problem-1-pathway-setup-and-form-filling";
const DIRS = [`${P}/prototype/studio/tests`, `${P}/prototype/studio/acceptance`, `${P}/prototype/tests`];
const BARE = /^\s*(?:await\s+)?(?:[\w$]+\.)?summary\(\)\s*;?\s*(?:\/\/.*)?$/;   // summary() or rec.summary()
const CODE = (l) => l.trim() !== "" && !/^\s*(\/\/|\/\*|\*)/.test(l);
const CLOSES = /^\s*[}\])]/;   // the next code line closes the block: the bare call was its last statement
// A bare summary() another open PR already fixes, so this one does not touch the same lines: listed as a NOTE, never a
// pass. An entry whose file no longer has the bare call is a NOTE too (remove it). Only while that PR is open.
export const PENDING = { [`${P}/prototype/studio/tests/check_c81_signing_api.ts`]: "#1275 (B129) ends it with process.exit(summary() ? 1 : 0)" };

/** The 1-based line numbers of bare summary() calls that end their file or block with no exit after them. */
export function neverFails(text) {
  const lines = text.split("\n"), hits = [];
  lines.forEach((l, i) => {
    if (!BARE.test(l)) return;
    const next = lines.slice(i + 1).find(CODE);
    if (next === undefined || CLOSES.test(next)) hits.push(i + 1);
  });
  return hits;
}

const walk = (d) => { let out = []; const names = readdirSync(d);   // a listed folder that is missing throws (review m4)
  for (const n of names) { const f = join(d, n); if (n === "node_modules") continue;
    if (statSync(f).isDirectory()) out = out.concat(walk(f)); else if (/\.(ts|cjs|mjs|js)$/.test(n)) out.push(f); }
  return out; };

function check(root, dirs, pending = PENDING) {
  const found = [], notes = [], seen = new Set();
  for (const d of dirs) if (!existsSync(join(root, d))) found.push(`${d}: no such folder (renamed? nothing there was checked)`);
  for (const d of dirs.filter((x) => existsSync(join(root, x)))) for (const f of walk(join(root, d))) {
    const rel = relative(root, f), hits = neverFails(readFileSync(f, "utf8"));
    if (rel in pending) { seen.add(rel); notes.push(hits.length ? `NOTE  ${rel}:${hits[0]}: still a bare summary(); pending ${pending[rel]}` : `NOTE  ${rel}: fixed; remove its PENDING entry in suite-exit.mjs`); continue; }
    for (const n of hits) found.push(`${rel}:${n}`);
  }
  for (const rel of Object.keys(pending)) if (!seen.has(rel)) notes.push(`NOTE  ${rel}: not found; remove its PENDING entry in suite-exit.mjs`);
  found.notes = notes; return found;
}

function selfTest() {
  const cases = [
    ["fail", "a bare summary() at the end of the file (B160's six)", "const { ok, summary } = recorder();\nok('x', true);\nsummary();\n"],
    ["fail", "a bare summary() then blank lines and a comment", "ok('x', true);\nsummary(); // done\n\n// end\n"],
    ["fail", "a bare summary() ending an async IIFE (check_c72_imm5257_fill.ts)", "(async () => {\n  ok('x', true);\n  summary();\n})().catch((e) => { console.error(e); process.exit(2); });\n"],
    ["fail", "a bare summary() ending async main() (check_c611_team.ts)", "async function main() {\n  ok('x', true);\n  summary();\n}\nmain().catch((e) => { process.exitCode = 1; });\n"],
    ["fail", "await summary() at the end", "ok('x', true);\nawait summary();\n"],
    ["fail", "a recorder's method, rec.summary(), at the end (review m2)", "const rec = recorder();\nrec.ok('x', true);\nrec.summary();\n"],
    ["pass", "process.exitCode = rec.summary() ? 1 : 0", "rec.ok('x', true);\nprocess.exitCode = rec.summary() ? 1 : 0;\n"],
    ["pass", "process.exit(summary() ? 1 : 0)", "ok('x', true);\nprocess.exit(summary() ? 1 : 0);\n"],
    ["pass", "process.exitCode = summary() ? 1 : 0 in main", "async function main() {\n  ok('x', true);\n  process.exitCode = summary() ? 1 : 0;\n}\nawait main();\n"],
    ["pass", "a bare summary() followed by an exit on the failures (acceptance/lib/pack2.ts)", "function done() {\n  const fail = 1;\n  summary();\n  process.exit(fail ? 1 : 0);\n}\n"],
    ["pass", "summary() on a guard line that then exits", "if (!vv) { summary(); process.exit(1); }\nprocess.exit(summary() ? 1 : 0);\n"],
    ["pass", "a file with no summary()", "console.log('1 passed');\n"],
  ];
  let bad = 0;
  for (const [want, name, text] of cases) {
    const got = neverFails(text).length ? "fail" : "pass";
    console.log(`${got === want ? "PASS" : "FAIL"}  ${want === "fail" ? "refused" : "allowed"}: ${name}`); if (got !== want) bad = 1;
  }
  // The walk: a fixture tree with one bare file and one good file finds exactly the bare one.
  const t = mkdtempSync(join(tmpdir(), "suite-exit-"));
  try {
    mkdirSync(join(t, "tests", "runtime"), { recursive: true });
    writeFileSync(join(t, "tests", "check_a.ts"), "ok('x', true);\nsummary();\n");
    writeFileSync(join(t, "tests", "runtime", "check_b.ts"), "ok('x', true);\nprocess.exit(summary() ? 1 : 0);\n");
    const f = check(t, ["tests"], {});
    const okWalk = f.length === 1 && f[0] === "tests/check_a.ts:2";
    console.log(`${okWalk ? "PASS" : "FAIL"}  the walk finds exactly the bare file (${f.join(", ") || "none"})`); if (!okWalk) bad = 1;
    // A PENDING file is a NOTE, not a failure; a fixed or missing PENDING entry is a NOTE to remove it.
    const g = check(t, ["tests"], { "tests/check_a.ts": "#1 fixes it", "tests/runtime/check_b.ts": "#2", "tests/gone.ts": "#3" });
    const okPend = g.length === 0 && g.notes.length === 3 && /check_a.ts:2: still a bare summary\(\); pending #1/.test(g.notes.join("\n")) && /check_b.ts: fixed; remove/.test(g.notes.join("\n")) && /gone.ts: not found; remove/.test(g.notes.join("\n"));
    console.log(`${okPend ? "PASS" : "FAIL"}  a PENDING file is a NOTE, not a pass or a failure; a fixed or missing entry says remove it`); if (!okPend) bad = 1;
    const h = check(t, ["tests", "no-such-folder"], {});
    const okMiss = h.some((x) => /^no-such-folder: no such folder/.test(x));
    console.log(`${okMiss ? "PASS" : "FAIL"}  a listed folder that is missing fails (nothing there would be checked)`); if (!okMiss) bad = 1;
  } finally { rmSync(t, { recursive: true, force: true }); }
  console.log(bad ? "self-test failed" : "self-test passed");
  return bad;
}

const args = process.argv.slice(2);
if (args[0] === "--self-test") process.exit(selfTest());
const found = check(ROOT, args.length ? args : DIRS);
for (const n of found.notes) console.log(n);
for (const f of found) console.log(`FAIL  ${f}: a bare summary() is the suite's last step, so its FAIL lines never fail it; end with process.exitCode = summary() ? 1 : 0 (or process.exit(summary() ? 1 : 0))`);
console.log(found.length ? `suite-exit: ${found.length} suite(s) can never fail (B160)` : "suite-exit: every suite's red line fails it");
process.exit(found.length ? 1 : 0);
