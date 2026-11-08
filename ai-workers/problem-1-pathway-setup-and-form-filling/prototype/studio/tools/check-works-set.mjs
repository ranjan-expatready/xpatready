#!/usr/bin/env node
// works-set.mjs both ways (P-320 (b)): which rows are protected, read at the base, held rows and packs, every protected
// pack really run, and the one retry of a flaky pack. Runs no pack and no server (a stand-in gate answers), US$0.
//   node studio/tools/check-works-set.mjs
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { rows, protectedSet, held, notRun, dataRows, verdictData, scoringData, groupsOf, poolVerdicts } from "./works-set.mjs";
import { packsOf } from "./gate-b.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)), P = resolve(HERE, "../../../product");
let pass = 0, fail = 0;
const ok = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
// Rows in CAPABILITIES.md's own shape. C11.13, C3.2 and C11.12 (two packs) have packs today; C1.1 has none.
const MD = `| # | Step | Capability (persona: what they can do) | M | Status | Tested on | Evidence / note |
|---|---|---|---|---|---|---|
| C11.13 | 11 x | Near duplicate | M2 | Works | abc 3 Nov | x |
| C3.2 | 3 Library | Reviewer accepts | M2 | **Works** | abc 3 Nov | x |
| C1.1 | 1 Setup | Author sees | M2 | Works | abc 1 Nov | x |
| C11.12 | 11 x | Questionnaires | M2 | Works (retest 4 Nov) | abc | x |
| C4.1 | 4 Q | SQR per role | M2 | Partial | abc | x |
| C6.4 | 6 Runtime | Checklist | M3 | Works | abc | x |
| C7.2 | 7 Fill | Validate | T | Works | abc | x |
| C11.14 | 11 x | Checker rounds | M2 | Built, awaiting qa | abc | x |
| QA-1 | not a row | x | M2 | Works | x | x |`;
const set = protectedSet(MD);
ok("only M2 rows whose status starts with Works are protected (Partial, M3, T and \"Built, awaiting qa\" are not)", set.map((r) => r.id).join() === "C11.13,C3.2,C1.1,C11.12", set);
ok("bold \"**Works**\" and \"Works (retest 4 Nov)\" count as Works", set.some((r) => r.id === "C3.2") && set.some((r) => r.id === "C11.12"));
ok("each protected row carries its packs; a row without one has none", set.find((r) => r.id === "C11.13")?.packs.join() === "C11.13.test.ts" && set.find((r) => r.id === "C1.1")?.packs.length === 0 && set.find((r) => r.id === "C11.12")?.packs.length === 2, set);
ok("--milestone picks another milestone", protectedSet(MD, "M3").map((r) => r.id).join() === "C6.4");
// The breaker's M5 shapes (#857, 4 Nov): each is still a protected M2 Works row.
const SHAPES = [["lower-case works", "| C9.1 | x | y | M2 | works | a | b |"], ["struck-out status", "| C9.1 | x | y | M2 | ~~Partial~~ Works | a | b |"], ["Works ✓", "| C9.1 | x | y | M2 | Works ✓ | a | b |"],
  ["Works (fixture only)", "| C9.1 | x | y | M2 | Works (fixture only) | a | b |"], ["milestone M2, M3", "| C9.1 | x | y | M2, M3 | Works | a | b |"], ["milestone with spaces", "| C9.1 | x | y |  M2  | Works | a | b |"],
  ["a linked id", "| [C9.1](reports/x.md) | x | y | M2 | Works | a | b |"], ["a bold id", "| **C9.1** | x | y | M2 | Works | a | b |"], ["no leading pipe", "C9.1 | x | y | M2 | Works | a | b |"],
  ["a pipe inside a code span", "| C9.1 | x | the `a | b` list | M2 | Works | a | b |"]];
for (const [label, line] of SHAPES) ok(`a Works row is read with ${label}`, protectedSet(line).map((r) => r.id).join() === "C9.1", rows(line));
ok("a duplicate row id is protected once, and when any copy is a Works row (#857 round 2)", protectedSet("| C9.1 | x | y | M2 | Works | a | b |\n| C9.1 | x | y | M2 | Works | a | b |").length === 1 && protectedSet("| C9.1 | x | y | M2 | Partial | a | b |\n| C9.1 | x | y | M2 | Works | a | b |").map((r) => r.id).join() === "C9.1");
ok("a line that is not a capability row is skipped", rows(MD).every((r) => /^C\d/.test(r.id)) && rows("| QA-12 | Bug · Major | C9.1 | x |").length === 0);

// Holds: a capability or one pack file; a line that cannot be read holds nothing and jams nothing (break M3).
const h = held("# Regression set: held rows\n\nqa holds a pack here when it is red on main.\n\n- C3.2  red on main (run 41788362078), sent to qa\n- **C11.12-runtime.test.ts** red on main, needs the suites' fixture (QA-215)\nc11.13 lower case is red, QA-12\n| C3.6 | #857 red, run 41788362078 |\n| Capability | Reason |\n|---|---|\n- C11.1\n- C11.13x red QA-1\n- C11.12-bad.test.tsx red QA-1\n- C11.15_x.test.ts underscores red QA-1\n");
ok("held() reads list lines, table rows and bare lines, capabilities and pack files, any case; headings and prose are not holds", [...h.caps.keys()].join() === "C3.2,C11.13,C3.6" && [...h.packs.keys()].join() === "C11.12-runtime.test.ts" && h.caps.get("C3.6") === "#857 red, run 41788362078", h);
ok("a hold line without a reason or with a bad id is reported, not thrown", h.bad.length === 4 && h.bad.includes("C11.1") && h.bad.includes("C11.13x red QA-1"), h.bad);
// #857 round 2 break N2: a history line, an example in code and a comment are never holds; a reason must name its run or bug.
const h2 = held("- C4.7 red on main (run 41788362078)\n- C3.2 hold lifted 5 Nov, pack green again\n```\n- C11.13 red on main (run 41788362078)\n```\n    - C11.10 red (run 41788362078), an indented example\n<!--\n- C11.12-runtime.test.ts red (run 41788362078)\n-->\n- ~~C11.11 red (run 41788362078)~~ lifted\n- C11.12 -runtime.test.ts red QA-215\n");
ok("only the one real hold holds: not a history line, a fenced or indented example, an HTML comment or struck text (break N2)", [...h2.caps.keys()].join() === "C4.7" && h2.packs.size === 0, { caps: [...h2.caps.keys()], packs: [...h2.packs.keys()], bad: h2.bad });
ok("a history line without a run or bug, and a stray space before a pack name, are reported as not read", h2.bad.some((l) => l.startsWith("C3.2 hold lifted")) && h2.bad.some((l) => l.startsWith("C11.12 -runtime")), h2.bad);

// #857 round 3 break M3 and m1: a lifted or not-red line with evidence is no hold; an unclosed comment and a fence closed
// by another kind hide what follows; emphasis, a quote, a check box and "•" around a real hold are read.
const h3 = held("- C3.2 hold lifted 5 Nov, green again in run 41799999999\n- C3.3 green in run 41799999999 (QA-215 closed)\n~~~\n- C11.13 red on main (run 41788362078)\n```\n- C11.14 red (run 41788362078)\n~~~\n````\n```\n- C11.15 red (run 41788362078)\n````\n");
ok("a lifted or not-red line is not a hold, though it names a run or bug; a ~~~ fence is closed only by ~~~ and ```` only by ```` (round 3 M3)", h3.caps.size === 0 && h3.packs.size === 0 && h3.bad.length === 2, { caps: [...h3.caps.keys()], bad: h3.bad });
const h4 = held("- C4.1 red (run 41788362078)\n<!-- an unclosed comment\n- C4.2 red (run 41788362078)\n");
ok("an unclosed HTML comment runs to the end of the file (round 3 M3)", [...h4.caps.keys()].join() === "C4.1", [...h4.caps.keys()]);
const h5 = held("- _C4.7_ red (run 41788362078)\n- __C3.6__ red (run 41788362078)\n> - C4.8 red (run 41788362078)\n- [ ] C4.9 red QA-215\n• C4.10 red QA-215\n- C11.15-a_b.test.ts red QA-1\n    ```\n- C4.11 red QA-215\n");
ok("_emphasis_, a quote, a check box and \"•\" are read, an underscore inside a pack name is kept, a ``` indented as code is no fence (round 3 m1)", [...h5.caps.keys()].join() === "C4.7,C3.6,C4.8,C4.9,C4.10,C4.11" && [...h5.packs.keys()].join() === "C11.15-a_b.test.ts", { caps: [...h5.caps.keys()], packs: [...h5.packs.keys()], bad: h5.bad });
// Round 3 M2: the columns are found by the header, a mark before Works counts, and no Works row at all is never an empty set.
ok("an added column before Status still reads M and Status by the header", protectedSet("| # | Step | Capability | Owner | M | Status | x |\n|---|---|---|---|---|---|---|\n| C9.1 | x | y | qa | M2 | Works | a |").map((r) => r.id).join() === "C9.1");
ok("\"✅ Works\" counts as Works", protectedSet("| C9.1 | x | y | M2 | ✅ Works | a | b |").map((r) => r.id).join() === "C9.1");

// B77 (P-322): the data each row's verdict counts on. A checkpoint line names its evidence; anything else runs on the six.
const d = dataRows("# data\n- C4.8 checkpoint: release and case steps count on the configured checkpoint (P-322), qa run 41860000000\n| C5.6 | checkpoint | QA-212 |\n- C3.2 six, a setup row (P-322)\n- C9.9 checkpoint because\n```\n- C1.1 checkpoint P-322\n```\n- C7.1 checkpoint P-322\n- C7.1 six P-322\n");
ok("dataRows() reads list and table lines with evidence; a line with no run, bug or decision, a fenced example, and two answers for one row change nothing (B77)", d.data.get("C4.8")?.data === "checkpoint" && d.data.get("C5.6")?.data === "checkpoint" && d.data.get("C3.2")?.data === "six" && !d.data.has("C9.9") && !d.data.has("C1.1") && !d.data.has("C7.1") && d.bad.length === 2, { data: [...d.data], bad: d.bad });
ok("notRun() takes a pack run on the data asked for, or on its fixture, as run; on the other data it did not run (B77, break m1)", notRun(["C4.8.test.ts"], "    C4.8.test.ts on the checkpoint: exit 0, 11/11 passed", "checkpoint").length === 0 && notRun(["C4.8.test.ts"], "    C4.8.test.ts on the six: exit 0", "checkpoint").length === 1 && notRun(["C4.8.test.ts"], "    C4.8.test.ts on the checkpoint: exit 0").length === 1 && notRun(["C1.5.test.ts"], "    C1.5.test.ts fixture only (setup): exit 0", "checkpoint").length === 0);
const d2 = dataRows("- C7.2 checkpoint P-322\n- C7.2 six P-322\n- C7.2 checkpoint P-322\n- C7.3 checkpoint until 5 Nov (P-322); back on the six since run 41899999999\n- C7.4 checkpoint? No: stays on the six until QA-230\n- C7.5 checkpoint lifted 5 Nov (P-322)\n- C4.8 checkpoint, C3.2 checkpoint (P-322)\n");
ok("a row with two answers stays on the six whatever later lines say; history, negated and two-row lines are reported, never read (break M1, m2, m4)", d2.data.size === 0 && d2.bad.length === 6, { data: [...d2.data], bad: d2.bad });

const T = mkdtempSync(join(tmpdir(), "works-set-")), f = join(T, "CAPABILITIES.md"); writeFileSync(f, MD);
const none = join(T, "none.txt"); writeFileSync(none, "");
const CLEAN = { GITHUB_STEP_SUMMARY: "", RANGE: "", QUEUE: "", PR_TITLE: "", PR_BODY: "", WORKS_SET_GATE: "", GATE_B_SKIP_PACKS: "", GATE_B_DATA: "", FAKE_WHERE: "" };
const cli = (args, env = {}) => { const r = spawnSync(process.execPath, [join(HERE, "works-set.mjs"), ...args], { encoding: "utf8", env: { ...process.env, ...CLEAN, ...env } }); return { code: r.status, out: r.stdout + r.stderr }; };
let r = cli(["--json", "--file", f, "--held", none]);
ok("--json lists the protected rows that have a pack, for the job matrix", r.code === 0 && JSON.stringify(JSON.parse(r.out)) === JSON.stringify(["C11.13", "C3.2", "C11.12"]), r);
r = cli(["--list", "--file", f, "--held", none]);
ok("--list names a Works row without a pack as not re-run", r.code === 0 && /C1\.1: no acceptance pack/.test(r.out) && /4 capabilities, 3 with an acceptance pack, 3 re-run/.test(r.out), r);
const hf = join(T, "held.txt"); writeFileSync(hf, "# held\n- C3.2 red on main (run 1000001), sent to qa\n- C11.12-runtime.test.ts red on main (run 1000001)\n- C9.9 stale red QA-9\n- C11.13-gone.test.ts stale red QA-9\n- C11.1\n");
r = cli(["--json", "--file", f, "--held", hf]);
ok("a held capability leaves the matrix; a capability with one pack held stays (break M4)", r.code === 0 && JSON.stringify(JSON.parse(r.out.split("\n").filter((l) => l.startsWith("[")).join(""))) === JSON.stringify(["C11.13", "C11.12"]), r);
r = cli(["--list", "--file", f, "--held", hf]);
ok("--list names the holds with their reasons, the stale ones, and the unreadable line", /C3\.2: —; held, not re-run: C3\.2\.test\.ts \(red on main \(run 1000001\), sent to qa\)/.test(r.out) && /C11\.12: C11\.12\.test\.ts; held, not re-run: C11\.12-runtime\.test\.ts/.test(r.out) && /stale hold: C9\.9/.test(r.out) && /stale hold: C11\.13-gone\.test\.ts/.test(r.out) && /hold line not read .*"C11\.1"/.test(r.out), r);
// Round 3 M1: in --json mode stdout is the array alone (CI writes it to GITHUB_OUTPUT); an unreadable hold line goes to stderr.
{ const x = spawnSync(process.execPath, [join(HERE, "works-set.mjs"), "--json", "--file", f, "--held", hf], { encoding: "utf8", env: { ...process.env, ...CLEAN } });
  ok("--json prints only the JSON array on stdout, the unreadable-line warning on stderr (round 3 M1)", x.status === 0 && /^\[[^\n]*\]\n?$/.test(x.stdout) && /hold line not read .*"C11\.1"/.test(x.stderr), { stdout: x.stdout, stderr: x.stderr }); }
const noWorks = join(T, "noworks.md"); writeFileSync(noWorks, MD.replace(/\| Works/g, "| Partial").replace(/\| \*\*Works\*\*/g, "| Partial"));
r = cli(["--json", "--file", noWorks, "--held", none]);
ok("no M2 row that reads as Works (a format change) is \"could not run\" (exit 2), never an empty set (round 3 M2)", r.code === 2 && /no M2 row reads as Works/.test(r.out), r);
const noPack = join(T, "nopack.md"); writeFileSync(noPack, "| C1.1 | 1 Setup | Author sees | M2 | Works | abc | x |\n");
r = cli(["--json", "--file", noPack, "--held", none]);
ok("Works rows of which none has a pack is \"could not run\" (exit 2; review m6)", r.code === 2 && /no protected row has an acceptance pack/.test(r.out), r);
r = cli(["--json", "--file", join(T, "none.txt"), "--held", none]);
ok("a CAPABILITIES file with no row the tool can read is \"could not run\" (exit 2), never an empty set", r.code === 2 && /no capability row/.test(r.out), r);
// Read at the base: RANGE's base commit, not the working tree (a batch's PRs cannot change what is protected).
const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: HERE, encoding: "utf8" }).stdout.trim();
const show = (p) => spawnSync("git", ["show", `${head}:ai-workers/problem-1-pathway-setup-and-form-filling/${p}`], { cwd: HERE, encoding: "utf8", maxBuffer: 64 << 20 });
const heldAtHead = show("product/qa/REGRESSION-HELD.md");
r = cli(["--json"], { RANGE: `${head}..${head}` });
if (heldAtHead.status !== 0) ok("with RANGE and no REGRESSION-HELD.md on the base, the set cannot start (exit 2, \"must land first\"; break B1)", r.code === 2 && /must land first/.test(r.out), r);
else {
  const hAtHead = held(heldAtHead.stdout);
  const expectAtHead = protectedSet(show("product/qa/CAPABILITIES.md").stdout).filter((x) => x.packs.some((p) => !hAtHead.caps.has(x.id) && !hAtHead.packs.has(p))).map((x) => x.id);
  ok("with RANGE, the list, the holds and the packs are read from the base commit (held rows left out; review B1)", r.code === 0 && JSON.stringify(JSON.parse(r.out.split("\n").filter((l) => l.startsWith("[")).join(""))) === JSON.stringify(expectAtHead), { got: r.out.slice(0, 200), expectAtHead });
}
r = cli(["--json", "--file", f, "--held", join(T, "absent.md")]);
ok("a hold file that is missing is \"could not run\" (exit 2), never \"nothing held\"", r.code === 2 && /must land first/.test(r.out), r);
const root = spawnSync("git", ["rev-list", "--max-parents=0", "HEAD"], { cwd: HERE, encoding: "utf8" }).stdout.trim().split("\n")[0];
r = cli(["--json", "--file", f, "--held", none], { RANGE: `${root}..${head}` });
ok("a base with no acceptance pack (the folder moved, or a base before it) is \"could not run\" (exit 2), never an empty set (break N1)", r.code === 2 && /no acceptance pack/.test(r.out), r);
r = cli(["--json"], { RANGE: "0000000..1111111" });
ok("a base that cannot be read is \"could not run\" (exit 2), never an empty set", r.code === 2 && /cannot (read|list)/.test(r.out), r);

// --run with a stand-in gate: it records each call, answers from a script of exits, prints a pack line for each pack it
// runs unless told not to, and echoes the CI values it sees.
const fake = join(T, "fake-gate.mjs"), state = join(T, "calls");
writeFileSync(fake, `import { readFileSync, writeFileSync, existsSync } from "node:fs";
const plan = (process.env.FAKE_EXITS ?? "0").split(","), n = existsSync(${JSON.stringify(state)}) ? Number(readFileSync(${JSON.stringify(state)}, "utf8")) : 0;
writeFileSync(${JSON.stringify(state)}, String(n + 1));
const code = Number(plan[Math.min(n, plan.length - 1)]), skip = (process.env.GATE_B_SKIP_PACKS ?? "").split(",").filter(Boolean);
console.log("fake gate", process.argv.slice(2).join(" "), "QUEUE=[" + (process.env.QUEUE ?? "") + "] PR_TITLE=[" + (process.env.PR_TITLE ?? "") + "] SKIP=[" + skip.join(",") + "] DATA=[" + (process.env.GATE_B_DATA ?? "") + "]");
const where = process.env.FAKE_WHERE || (process.env.GATE_B_DATA === "checkpoint" ? "on the checkpoint" : "on the six");
for (const p of (process.env.FAKE_PACKS ?? "").split(",").filter(Boolean)) if (!skip.includes(p)) console.log("    " + p + " " + where + ": exit " + code + ", 1/1 passed");
process.exit(code);`);
const run = (exits, env = {}, id = "C11.13", heldFile = none) => { rmSync(state, { force: true }); const x = cli(["--run", id, "--held", heldFile], { WORKS_SET_GATE: fake, FAKE_EXITS: exits, FAKE_PACKS: packsOf(id).join(","), ...env }); return { ...x, calls: existsSync(state) ? Number(readFileSync(state, "utf8")) : 0 }; };
r = run("0");
ok("green on the first run: one run, exit 0", r.code === 0 && r.calls === 1 && /C11\.13\*\*: green/.test(r.out), r);
r = run("1,0");
ok("red then green: retried once, exit 0, and it says flaky", r.code === 0 && r.calls === 2 && /flaky/.test(r.out), r);
r = run("1,1");
ok("red twice: exit 1, two runs, and it says the batch would take away a Works row", r.code === 1 && r.calls === 2 && /red twice/.test(r.out), r);
r = run("2,1");
ok("could not run, then red: exit 1 (red counts)", r.code === 1 && r.calls === 2, r);
r = run("2,2");
ok("could not run twice: exit 2", r.code === 2 && r.calls === 2, r);
r = run("0", { FAKE_PACKS: "" });
ok("a gate run that ran no pack is red twice, never green (a pack renamed or deleted at the head; review M1, break M1)", r.code === 1 && r.calls === 2 && /did not run C11\.13\.test\.ts/.test(r.out), r);
ok("notRun() names each expected pack the output does not show", notRun(["C11.12.test.ts", "C11.12-runtime.test.ts"], "    C11.12.test.ts on the six: exit 0\n").join() === "C11.12-runtime.test.ts" && notRun(["C7.5.test.ts"], "    C7.5.test.ts fixture only (…): exit 0").length === 0);
writeFileSync(hf, "C11.12-runtime.test.ts red on main (run 1000001)\n");
r = run("0", {}, "C11.12", hf);
ok("a held pack is skipped by name (GATE_B_SKIP_PACKS) and the capability's other pack still runs", r.code === 0 && /SKIP=\[C11\.12-runtime\.test\.ts\]/.test(r.out) && /C11\.12\.test\.ts on the six/.test(r.out), r.out.slice(0, 400));
writeFileSync(hf, "C11.13 red on main (run 1000001)\n");
r = run("1", {}, "C11.13", hf);
ok("a fully held capability runs nothing and passes, saying so", r.code === 0 && r.calls === 0 && /every pack is held/.test(r.out), r);
// B77: a row the data file puts on the checkpoint runs there (GATE_B_DATA=checkpoint); every other row on the six.
const df = join(T, "data.md"); writeFileSync(df, "- C11.13 checkpoint: counts on the configured checkpoint (P-322)\n");
rmSync(state, { force: true });
let rd = cli(["--run", "C11.13", "--held", none, "--data", df], { WORKS_SET_GATE: fake, FAKE_EXITS: "0", FAKE_PACKS: packsOf("C11.13").join(",") });
ok("a row the data file names runs on the configured checkpoint (GATE_B_DATA=checkpoint) and passes, saying where (B77)", rd.code === 0 && /DATA=\[checkpoint\]/.test(rd.out) && /green \(C11\.13\.test\.ts on the checkpoint\)/.test(rd.out), rd.out.slice(0, 400));
rmSync(state, { force: true });
rd = cli(["--run", "C11.12", "--held", none, "--data", df], { WORKS_SET_GATE: fake, FAKE_EXITS: "0", FAKE_PACKS: packsOf("C11.12").join(",") });
ok("a row the data file does not name (a setup row) still runs on the six (B77)", rd.code === 0 && /DATA=\[six\]/.test(rd.out) && /green \(C11\.12-runtime\.test\.ts on the six, C11\.12\.test\.ts on the six\)/.test(rd.out), rd.out.slice(0, 400));
// Break m1: a gate that ran a checkpoint row on the six did not run it on its data: red, never "green on the checkpoint".
rmSync(state, { force: true });
rd = cli(["--run", "C11.13", "--held", none, "--data", df], { WORKS_SET_GATE: fake, FAKE_EXITS: "0", FAKE_PACKS: packsOf("C11.13").join(","), FAKE_WHERE: "on the six" });
ok("a checkpoint row that the gate ran on the six is red (did not run on the data asked for; break m1)", rd.code === 1 && /did not run C11\.13\.test\.ts/.test(rd.out), rd.out.slice(0, 400));
// Break M2: a pack with setup steps runs on its fixture whatever the data; the summary says so, never "on the checkpoint".
rmSync(state, { force: true });
rd = cli(["--run", "C11.13", "--held", none, "--data", df], { WORKS_SET_GATE: fake, FAKE_EXITS: "0", FAKE_PACKS: packsOf("C11.13").join(","), FAKE_WHERE: "fixture only" });
ok("a checkpoint row whose pack runs fixture only passes saying \"fixture only\", never \"on the checkpoint\" (break M2)", rd.code === 0 && /green \(C11\.13\.test\.ts fixture only\)/.test(rd.out) && !/green[^\n]*on the checkpoint/.test(rd.out), rd.out.slice(0, 400));
rd = cli(["--list", "--file", f, "--held", none, "--data", df]);
ok("--list marks a row on the checkpoint", rd.code === 0 && /C11\.13 \(on the checkpoint where its pack runs alone\): C11\.13\.test\.ts/.test(rd.out), rd.out);
writeFileSync(df, "- C9.9 checkpoint P-322\n- C11.13 checkpoint\n");
rd = cli(["--list", "--file", f, "--held", none, "--data", df]);
ok("a stale data line and an unreadable one are reported, and the row stays on the six", rd.code === 0 && /stale data line: C9\.9/.test(rd.out) && /data line not read .*C11\.13 checkpoint/.test(rd.out) && !/C11\.13 \(on the checkpoint/.test(rd.out), rd.out);
rd = cli(["--json", "--file", f, "--held", none, "--data", df]);
ok("--json still prints only the array on stdout with a bad data line (warnings on stderr)", rd.code === 0 && /^\[/.test(spawnSync(process.execPath, [join(HERE, "works-set.mjs"), "--json", "--file", f, "--held", none, "--data", df], { encoding: "utf8", env: { ...process.env, ...CLEAN } }).stdout), rd.out);
r = run("0", {}, "C1.1");
ok("a capability with no pack on the base cannot run (exit 2)", r.code === 2 && /no acceptance pack on the base/.test(r.out), r);
r = run("0", { QUEUE: "true", PR_TITLE: "merge queue: checking #1", PR_BODY: "Claims Works: C11.13" });
ok("a batch's QUEUE, PR_TITLE and PR_BODY never reach the gate (no batch mode, no claim)", r.code === 0 && /QUEUE=\[\] PR_TITLE=\[\]/.test(r.out) && /--title C11\.13 --kind code/.test(r.out), r.out.slice(0, 300));
r = cli(["--run", "C11.13; rm -rf /", "--held", none], { WORKS_SET_GATE: fake });
ok("--run takes only a capability id (exit 2 otherwise)", r.code === 2 && /not a capability id/.test(r.out), r);
r = cli(["--held", none]);
ok("no option: exit 2, saying which to give (review m6)", r.code === 2 && /say --list, --json, --groups <n>, --run <C…> or --pool/.test(r.out), r);
rmSync(T, { recursive: true, force: true });

// The real files today.
const real = protectedSet(readFileSync(join(P, "qa/CAPABILITIES.md"), "utf8"));
ok(`the real qa/CAPABILITIES.md: ${real.length} M2 Works rows, ${real.filter((x) => x.packs.length).length} with a pack`, real.length > 0 && real.every((x) => Array.isArray(x.packs)), real.length);
// The real hold file: an unreadable line is a WARN here, never a FAIL, so a qa notes PR can never turn every PR's check red
// (break N3); the plan prints the same line in each batch.
if (!existsSync(join(P, "qa/REGRESSION-HELD.md"))) console.log("WARN  product/qa/REGRESSION-HELD.md is not on this branch yet (qa's notes PR); the set cannot start without it");
else { const realHeld = held(readFileSync(join(P, "qa/REGRESSION-HELD.md"), "utf8")); if (realHeld.bad.length) console.log(`WARN  hold lines not read (they hold nothing): ${realHeld.bad.join(" | ")}`); }
// The real data file (B77), when qa has written it: an unreadable line is a WARN, never a FAIL (as the hold file).
if (existsSync(join(P, "qa/REGRESSION-DATA.md"))) { const realData = dataRows(readFileSync(join(P, "qa/REGRESSION-DATA.md"), "utf8")); if (realData.bad.length) console.log(`WARN  data lines not read (those rows run on the six): ${realData.bad.join(" | ")}`); }
// D5 (P-416, founder 8 Nov): every Works row of every milestone; each row on its scoring data; pooled on job slots.
ok("D5: --milestone all protects every Works row, whatever its milestone", protectedSet(MD, "all").map((r) => r.id).join() === "C11.13,C3.2,C1.1,C11.12,C6.4,C7.2", protectedSet(MD, "all"));
ok("D5: a row's evidence names its pack data, newest first (data=, GATE_B_DATA:, \"<pack>.test.ts on the …\")", verdictData("qa: Works. nightly run 1 (`data=checkpoint`) \"C6.15.test.ts on the checkpoint\". Before: on the six") === "checkpoint" && verdictData("`C4.7.test.ts` on the six: exit 0; on the checkpoint 17/17 too") === "six" && verdictData("head x, `GATE_B_DATA: checkpoint`") === "checkpoint" && verdictData("walked on the configured checkpoint by screens") === null && verdictData("") === null);
{ const md = "| # | Step | Capability | M | Status | Tested on | Evidence / note |\n|---|---|---|---|---|---|---|\n| C6.15 | 6 R | x | M3 | Works | a | nightly run 9 (`data=checkpoint`). Before: data=six |\n| C4.7 | 4 Q | x | M2 | Works | a | `C4.7.test.ts` on the six: 17/17 |\n| C1.1 | 1 S | x | M2 | Works | a | walked |";
  const dat = dataRows("- C4.7 checkpoint: counts there (P-322)\n").data;
  ok("D5: scoring data is qa's REGRESSION-DATA line, else the row's evidence, else the six", scoringData("C6.15", md) === "checkpoint" && scoringData("C4.7", md) === "six" && scoringData("C4.7", md, dat) === "checkpoint" && scoringData("C1.1", md) === "six" && scoringData("C9.9", md) === "six");
  ok("D5: the Evidence column is found by the header, also when a column moves", rows("| # | Evidence / note | Step | Capability | M | Status |\n|---|---|---|---|---|---|\n| C2.2 | data=checkpoint | x | y | M2 | Works |")[0].note === "data=checkpoint"); }
{ const items = Array.from({ length: 12 }, (_, i) => ({ id: `C1.${i + 1}`, packs: 1, weight: i < 4 ? 2 : 1 })), g = groupsOf(items, 5), w = g.map((x) => x.weight);
  ok("D5: --groups balances rows on at most n machines (a checkpoint pack weighs double) and keeps every row once", g.length === 5 && Math.max(...w) - Math.min(...w) <= 1 && g.flatMap((x) => x.caps).sort().join() === items.map((x) => x.id).sort().join(), g);
  ok("D5: fewer rows than machines: one group a row, never an empty group", groupsOf(items.slice(0, 2), 5).length === 2 && groupsOf([], 5).length === 0); }
{ const L = (file, ok_, load = "six", infra = false) => [file, { file, ok: ok_, load, where: load ? `on the ${load}` : "fixture only", why: ok_ ? null : "exit 1", infra }];
  const v = poolVerdicts(new Map([["C1.1", ["C1.1.test.ts"]], ["C2.2", ["C2.2.test.ts", "C2.2-b.test.ts"]], ["C3.3", ["C3.3.test.ts"]], ["C4.4", ["C4.4.test.ts"]], ["C5.5", ["C5.5.test.ts"]]]),
    new Map([L("C1.1.test.ts", true), L("C2.2.test.ts", true), L("C3.3.test.ts", false), L("C4.4.test.ts", true, null), L("C5.5.test.ts", false, "six", true)]));
  ok("D5: pooled verdicts: green; a pack that did not report is red; red; fixture only is NOT TESTED, not red; the gate's own failure is could-not-run", v.get("C1.1").v === "green" && v.get("C2.2").v === "red" && /C2\.2-b\.test\.ts did not report/.test(v.get("C2.2").why[0]) && v.get("C3.3").v === "red" && v.get("C4.4").v === "untested" && v.get("C5.5").v === "infra", [...v]); }
const T2 = mkdtempSync(join(tmpdir(), "works-pool-check-")), PH = join(T2, "none.md"); writeFileSync(PH, "# no holds\n");
// --pool with a stand-in gate that writes GATE_B_RESULTS: one pooled run, each row's data passed, a red row retried alone.
const pfake = join(T2, "pool-gate.mjs"), pstate = join(T2, "pool-calls");
writeFileSync(pfake, `import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
const n = existsSync(${JSON.stringify(pstate)}) ? readFileSync(${JSON.stringify(pstate)}, "utf8").split("\\n").filter(Boolean).length : 0;
appendFileSync(${JSON.stringify(pstate)}, process.argv[3] + " | " + process.env.GATE_B_DATA_OF + " | jobs " + process.env.GATE_B_JOBS + " | skip " + process.env.GATE_B_SKIP_PACKS + "\\n");
const red = (process.env.FAKE_RED ?? "").split(",")[n] ?? "", skip = (process.env.GATE_B_SKIP_PACKS ?? "").split(",");
for (const id of process.argv[3].split(" ")) for (const f of (process.env["FAKE_" + id.replace(".", "_")] ?? id + ".test.ts").split(",")) if (!skip.includes(f))
  appendFileSync(process.env.GATE_B_RESULTS, JSON.stringify({ id, file: f, data: "six", where: "on the six", load: "six", ok: !red.split(" ").includes(id), why: red.split(" ").includes(id) ? "exit 1" : null, infra: false }) + "\\n");
process.exit(red ? 1 : 0);`);
const pool = (ids, env = {}) => { rmSync(pstate, { force: true }); const x = cli(["--pool", ids, "--file", PF, "--held", PH, "--data", PD], { WORKS_SET_GATE: pfake, ...env }); return { ...x, calls: existsSync(pstate) ? readFileSync(pstate, "utf8").split("\n").filter(Boolean) : [] }; };
const PF = join(T2, "POOL-CAPS.md"), PD = join(T2, "POOL-DATA.md");
writeFileSync(PF, "| # | Step | Capability | M | Status | Tested on | Evidence / note |\n|---|---|---|---|---|---|---|\n| C11.13 | x | y | M2 | Works | a | x |\n| C3.2 | x | y | M2 | Works | a | x |\n| C6.9 | x | y | M3 | Works | a | nightly (`data=checkpoint`) |\n");
writeFileSync(PD, "- C3.2 checkpoint: counts there (P-322)\n");
let pr = pool("C11.13,C3.2,C6.9");
ok("D5 --pool: one gate run for every row, each on its scoring data (REGRESSION-DATA, the evidence, the six), on 3 job slots", pr.code === 0 && pr.calls.length === 1 && pr.calls[0].startsWith("C11.13 C3.2 C6.9 | C11.13=six C3.2=checkpoint C6.9=checkpoint | jobs 3"), pr);
pr = pool("C11.13,C3.2,C6.9", { FAKE_RED: "C3.2," });
ok("D5 --pool: a red row is retried alone, pooled again; green on the retry says flaky, exit 0", pr.code === 0 && pr.calls.length === 2 && pr.calls[1].startsWith("C3.2 | C3.2=checkpoint") && /C3\.2 \(checkpoint\): green on the retry — flaky/.test(pr.out), pr);
pr = pool("C11.13,C3.2", { FAKE_RED: "C11.13,C11.13" });
ok("D5 --pool: red twice is exit 1 and names the row", pr.code === 1 && /C11\.13 \(six\): red twice/.test(pr.out), pr);
pr = pool("C11.12", { FAKE_C11_12: "C11.12.test.ts" });
ok("D5 --pool: a pack the base names that does not report is red (renamed or dropped)", pr.code === 1 && /C11\.12-runtime\.test\.ts did not report/.test(pr.out), pr);
{ writeFileSync(PH, "- C11.12-runtime.test.ts red on main (run 41866440174)\n"); const x = pool("C11.12"); writeFileSync(PH, "# no holds\n");
  ok("D5 --pool: a held pack is skipped by name and not expected; the row's other pack still runs", x.code === 0 && x.calls.length === 1 && / \| skip C11\.12-runtime\.test\.ts$/.test(x.calls[0]) && /held, not run: C11\.12-runtime\.test\.ts/.test(x.out), x); }
pr = pool("C11.13; rm -rf /");
ok("D5 --pool: a value that is not capability ids is refused (exit 2) before any run", pr.code === 2 && pr.calls.length === 0, pr);
rmSync(T2, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
