#!/usr/bin/env node
// works-set.mjs both ways (P-320 (b)): which rows are protected, read at the base, and the one retry of a flaky pack.
// Runs no pack and no server (a stand-in gate answers), US$0.
//   node studio/tools/check-works-set.mjs
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { rows, protectedSet } from "./works-set.mjs";
import { packsOf } from "./gate-b.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)), P = resolve(HERE, "../../../product");
let pass = 0, fail = 0;
const ok = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
// Rows in CAPABILITIES.md's own shape. C11.13 and C3.2 have packs today; C1.1 has none.
const MD = `| # | Step | Capability (persona: what they can do) | M | Status | Tested on | Evidence / note |
|---|---|---|---|---|---|---|
| C11.13 | 11 x | Near duplicate | M2 | Works | abc 3 Nov | x |
| C3.2 | 3 Library | Reviewer accepts | M2 | **Works** | abc 3 Nov | x |
| C1.1 | 1 Setup | Author sees | M2 | Works | abc 1 Nov | x |
| C4.1 | 4 Q | SQR per role | M2 | Partial | abc | x |
| C6.4 | 6 Runtime | Checklist | M3 | Works | abc | x |
| C7.2 | 7 Fill | Validate | T | Works | abc | x |
| C11.14 | 11 x | Checker rounds | M2 | Built, awaiting qa | abc | x |
| QA-1 | not a row | x | M2 | Works | x | x |`;
const set = protectedSet(MD);
ok("only M2 rows whose status is exactly Works are protected (Partial, M3, T and \"Built, awaiting qa\" are not)", set.map((r) => r.id).join() === "C11.13,C3.2,C1.1", set);
ok("bold \"**Works**\" counts as Works", set.some((r) => r.id === "C3.2"));
ok("each protected row carries its packs; a row without one has none", set.find((r) => r.id === "C11.13")?.packs.join() === "C11.13.test.ts" && set.find((r) => r.id === "C1.1")?.packs.length === 0, set);
ok("--milestone picks another milestone", protectedSet(MD, "M3").map((r) => r.id).join() === "C6.4");
ok("a line that is not a capability row is skipped", rows(MD).every((r) => /^C\d/.test(r.id)) && rows("| C1.1 | only two |").length === 1);

const T = mkdtempSync(join(tmpdir(), "works-set-")), f = join(T, "CAPABILITIES.md"); writeFileSync(f, MD);
const CLEAN = { GITHUB_STEP_SUMMARY: "", RANGE: "", QUEUE: "", PR_TITLE: "", PR_BODY: "", WORKS_SET_GATE: "" };
const cli = (args, env = {}) => { const r = spawnSync(process.execPath, [join(HERE, "works-set.mjs"), ...args], { encoding: "utf8", env: { ...process.env, ...CLEAN, ...env } }); return { code: r.status, out: r.stdout + r.stderr }; };
let r = cli(["--json", "--file", f]);
ok("--json lists the protected rows that have a pack, for the job matrix", r.code === 0 && JSON.stringify(JSON.parse(r.out)) === JSON.stringify(["C11.13", "C3.2"]), r);
r = cli(["--list", "--file", f]);
ok("--list names a Works row without a pack as not re-run", r.code === 0 && /C1\.1: no acceptance pack/.test(r.out) && /3 capabilities, 2 with an acceptance pack/.test(r.out), r);
// Read at the base: RANGE's base commit, not the working tree (a batch's PRs cannot change what is protected).
const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: HERE, encoding: "utf8" }).stdout.trim();
r = cli(["--json"], { RANGE: `${head}..${head}` });
const atHead = spawnSync("git", ["show", `${head}:ai-workers/problem-1-pathway-setup-and-form-filling/product/qa/CAPABILITIES.md`], { cwd: HERE, encoding: "utf8", maxBuffer: 64 << 20 }).stdout;
ok("with RANGE, the list is read from the base commit", r.code === 0 && JSON.stringify(JSON.parse(r.out)) === JSON.stringify(protectedSet(atHead).filter((x) => x.packs.length).map((x) => x.id)), r.out.slice(0, 200));
r = cli(["--json"], { RANGE: "0000000..1111111" });
ok("a base that cannot be read is \"could not run\" (exit 2), never an empty set", r.code === 2 && /cannot read/.test(r.out), r);

// --run with a stand-in gate: it records each call, answers from a script of exits, and echoes the CI values it sees.
const fake = join(T, "fake-gate.mjs"), state = join(T, "calls");
writeFileSync(fake, `import { readFileSync, writeFileSync, existsSync } from "node:fs";
const plan = (process.env.FAKE_EXITS ?? "0").split(","), n = existsSync(${JSON.stringify(state)}) ? Number(readFileSync(${JSON.stringify(state)}, "utf8")) : 0;
writeFileSync(${JSON.stringify(state)}, String(n + 1));
console.log("fake gate", process.argv.slice(2).join(" "), "QUEUE=[" + (process.env.QUEUE ?? "") + "] PR_TITLE=[" + (process.env.PR_TITLE ?? "") + "]");
process.exit(Number(plan[Math.min(n, plan.length - 1)]));`);
const run = (exits, env = {}) => { rmSync(state, { force: true }); const x = cli(["--run", "C11.13"], { WORKS_SET_GATE: fake, FAKE_EXITS: exits, ...env }); return { ...x, calls: existsSync(state) ? Number(readFileSync(state, "utf8")) : 0 }; };
r = run("0");
ok("green on the first run: one run, exit 0", r.code === 0 && r.calls === 1 && /C11\.13\*\*: green\./.test(r.out), r);
r = run("1,0");
ok("red then green: retried once, exit 0, and it says flaky", r.code === 0 && r.calls === 2 && /flaky/.test(r.out), r);
r = run("1,1");
ok("red twice: exit 1, two runs, and it says the batch would take away a Works row", r.code === 1 && r.calls === 2 && /red twice/.test(r.out), r);
r = run("2,1");
ok("could not run, then red: exit 1 (red counts)", r.code === 1 && r.calls === 2, r);
r = run("2,2");
ok("could not run twice: exit 2", r.code === 2 && r.calls === 2, r);
r = run("0", { QUEUE: "true", PR_TITLE: "merge queue: checking #1", PR_BODY: "Claims Works: C11.13" });
ok("a batch's QUEUE, PR_TITLE and PR_BODY never reach the gate (no batch mode, no claim)", r.code === 0 && /QUEUE=\[\] PR_TITLE=\[\]/.test(r.out) && /--title C11\.13 --kind code/.test(r.out), r.out.slice(0, 300));
r = cli(["--run", "C11.13; rm -rf /"], { WORKS_SET_GATE: fake });
ok("--run takes only a capability id (exit 2 otherwise)", r.code === 2 && /not a capability id/.test(r.out), r);
r = cli([]);
ok("no option: exit 2", r.code === 2, r);
rmSync(T, { recursive: true, force: true });

// The real file today.
const real = protectedSet(readFileSync(join(P, "qa/CAPABILITIES.md"), "utf8"));
ok(`the real qa/CAPABILITIES.md: ${real.length} M2 Works rows, ${real.filter((x) => x.packs.length).length} with a pack`, real.length > 0 && real.every((x) => Array.isArray(x.packs)), real.length);
ok("every pack the set names exists (packsOf)", real.every((x) => x.packs.every((p) => packsOf(x.id).includes(p))));
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
