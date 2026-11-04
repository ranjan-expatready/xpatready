#!/usr/bin/env node
// gate-b.mjs both ways (P-214): what a PR names and claims Works, the open bugs that stop it, the skips, the step
// lists, and that every acceptance pack's documented run can be read. Runs no pack and no server, US$0.
//   node studio/tools/check-gate-b.mjs
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { claims, expand, openBugs, blockers, runPlan, stepsVerdict, packsOf, whereOf } from "./gate-b.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)), ACC = resolve(HERE, "../acceptance"), P = resolve(HERE, "../../../product");
let pass = 0, fail = 0;
const ok = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
// Rows in BUGS.md's own shape (copied from the file on 4 Nov), so the cases stay true when the real rows close.
const BUGS = `| # | Type · Severity | Capability · Req./decision | Found · last seen | What happens (short) | Lane | Status |
|---|---|---|---|---|---|---|
| QA-192 | Gap · Major | C11.13 · P-120 (a near duplicate needs a one-line reason), P-149 (2) | x | y | forms | Open |
| QA-202 | Bug · Minor (test isolation; Major if it can reach the demo) | C11.14, C3.2 (checks) · P-291 | x | y | infra | Open |
| QA-180 | Bug · **Critical** (confirmed by the tech lead on #720) | C6.1, C5.1 (release gate) · BR-8 | x | y | screens | Open |
| QA-162 | Gap · Major (C4.11; C4.7 part fixed, 2 Nov) | C4.7, C4.11 · P-227 | x | y | forms | Open |
| QA-167 | Bug · Major | C6.x officer case page · EXPERIENCE | x | y | runtime | Open |
| QA-201 | Bug · Major (CI tooling) | infra (#703, I1 type check) · P-291 (C3.4 named after the dot) | x | y | infra | Open |
| QA-150 | Gap · Minor | C11.3 · P-104 | x | y | screens | Open |
| QA-176 | Gap · Major | C11.14 · P-121 (draft + independent checker round; High only when all agree), P-149 | x | y | forms | Open |
| QA-196 | Gap · Major | C3.4 · P-120 (AI drafts a form's checks as proposals), P-149 (1) (one door) | x | y | forms | Open |
| QA-100 | Bug · Major | C9.9 · P-1 | x | y | screens | Closed 1 Nov |`;
const bugs = openBugs(BUGS);
// The bug check looks only at a "Claims Works:" line (tech lead, 4 Nov); w() claims Works for the title's capability.
const gate = (title, body = "") => blockers(claims(title, body), bugs).map((b) => b.bug);
const w = (title, more = "") => gate(title, `Claims Works: ${title.match(/C\d+\.\d+/)?.[0]}\n${more}`);

// Part 1: the done-when cases (tech lead, 4 Nov) and the shapes of BUGS.md.
ok("a PR claiming Works for C11.13 while QA-192 (Major) is open is refused", w("forms: C11.13 near-duplicate reason").join() === "QA-192", w("forms: C11.13 near-duplicate reason"));
ok("the same PR naming QA-192 in its title passes", w("forms: C11.13 near-duplicate reason (QA-192)").length === 0);
ok("…or with a \"Fixes: QA-192\" line", w("forms: C11.13 reason", "Plan…\nFixes: QA-192\n").length === 0);
ok("…or a line that says it fixes QA-192", w("forms: C11.13 reason", "This fixes QA-192 by asking for the reason.").length === 0);
ok("a line that only mentions QA-192 is not a fix (\"does not fix QA-192\")", w("forms: C11.13 reason", "This does not fix QA-192 yet.").join() === "QA-192");
ok("a PR that names C11.13 without claiming Works is not checked against BUGS.md", gate("forms: C11.13 near-duplicate reason", "Capabilities: C11.13").length === 0);
// The two refused before the tech lead's correction: #785's and #771's own titles (4 Nov), no "Claims Works:" line.
ok("#785 (C11.14 saved checker rounds, no Claims Works) no longer refuses; with Claims Works: C11.14 it refuses on QA-176",
  gate("forms: C11.14 — the 15 field-map checker rounds on main from #671's paid runs (no new spend)").length === 0 && w("forms: C11.14 — the 15 field-map checker rounds").join() === "QA-176");
ok("#771 (C3.4 saved v2 masters rounds, no Claims Works) no longer refuses; with Claims Works: C3.4 it refuses on QA-196",
  gate("forms: C3.4 — saved v2 masters rounds, IMM 5257 and guide 5256 (paid US$1.35, P-295/P-300)").length === 0 && w("forms: C3.4 — saved v2 masters rounds").join() === "QA-196");
ok("a Claims Works line names its capabilities for the packs too", [...claims("forms: x", "Claims Works: C11.13, C4.7").caps.keys()].join() === "C11.13,C4.7" && [...claims("forms: x", "**Claims Works:** C11.13").works].join() === "C11.13");
ok("a Minor does not stop a PR (QA-150 on C11.3)", w("screens: C11.3 trail").length === 0);
ok("severity is the word after the type: \"Minor (… Major if …)\" stays Minor", bugs.find((b) => b.id === "QA-202")?.severity === "Minor", bugs.find((b) => b.id === "QA-202"));
ok("bold severity is read (QA-180 **Critical**) and stops C5.1", bugs.find((b) => b.id === "QA-180")?.severity === "Critical" && w("screens: C5.1 gate").join() === "QA-180");
ok("a row naming two capabilities stops each (QA-162: C4.7 and C4.11)", w("forms: C4.7 picks").join() === "QA-162" && w("forms: C4.11 run").join() === "QA-162");
ok("C6.x covers C6.4, not C16.4 or C7.4", w("runtime: C6.4 list").join() === "QA-167" && w("runtime: C16.4").length === 0 && w("runtime: C7.4").length === 0);
ok("capabilities after the first \"·\" are references, not the row's own (QA-201 does not stop C3.4)", gate("forms: x", "Claims Works: C3.5").length === 0 && !w("forms: C3.4 drafts").includes("QA-201"));
ok("a closed row does not stop (QA-100, Closed)", w("screens: C9.9").length === 0);
ok("C11.1 is not C11.13 (word boundary)", w("screens: C11.1 list").length === 0);
ok("body prose naming a capability is not a claim; a \"Capabilities:\" line is",
  claims("infra: tool", "This unblocks C11.13 later.").caps.size === 0 && [...claims("infra: tool", "**Capabilities:** C11.13, C4.7").caps.keys()].join() === "C11.13,C4.7");

// Steps: a pack green only in part names its steps.
const c75 = claims("runtime: C7.5 part 1", "Capabilities: C7.5 (steps 1-4, 10…14, 6b)");
ok("steps are read and ranges expanded", JSON.stringify(c75.caps.get("C7.5")) === JSON.stringify(["1", "2", "3", "4", "10", "11", "12", "13", "14", "6b"]), c75.caps.get("C7.5"));
ok("a title claim without steps is the whole pack", claims("runtime: C7.5 rules").caps.get("C7.5") === null);
ok("expand keeps labels that are not ranges", expand("AT-1, AT-3 9").join() === "AT-1,AT-3,9");
const out = "PASS  C7.5-1 a\nPASS  C7.5-2 b\nFAIL  C7.5-5 c\nPASS  C7.5-10 d\nFAIL  C7.5-1x e\nPASS  C3.2 AT-1 f\nFAIL  C3.2 AT-3 g\n";
ok("named steps that PASS pass", stepsVerdict("C7.5", ["1", "2", "10"], out).length === 0);
ok("a named step that FAILs or is missing is reported (C7.5-5, C7.5-11)", stepsVerdict("C7.5", ["1", "5", "11"], out).join() === "5,11");
ok("C7.5-1 is not C7.5-10 or C7.5-1x", stepsVerdict("C7.5", ["1"], "PASS  C7.5-10 x\nPASS  C7.5-1x y\n").join() === "1");
ok("labels with a space (C3.2 AT-1) work", stepsVerdict("C3.2", ["AT-1"], out).length === 0 && stepsVerdict("C3.2", ["AT-3"], out).join() === "AT-3");

// Every pack's documented run can be read, so part 2 never skips a pack in silence.
const files = readdirSync(ACC).filter((f) => /^C\d.*\.test\.ts$/.test(f));
const bad = files.map((f) => [f, runPlan(f, readFileSync(join(ACC, f), "utf8"))]).filter(([, p]) => p.error);
ok(`every capability pack's run line is read (${files.length} packs)`, bad.length === 0, bad);
const plan = (f) => runPlan(f, readFileSync(join(ACC, f), "utf8")).steps ?? [];
ok("C7.5 (M3 helpers, no setup line) gets the M3 setup first", plan("C7.5.test.ts").map((s) => s.script).join() === "studio/tests/runtime/setup_visitor_visa.ts,studio/acceptance/lib/setup_vv_m3.ts,studio/acceptance/C7.5.test.ts");
ok("C3.2 runs from studio/ with its tsconfig, on the gate's port and database", JSON.stringify(plan("C3.2.test.ts")) === JSON.stringify([{ cwd: "studio", tool: "tsx", args: ["--tsconfig", "api/tsconfig.json", "acceptance/C3.2.test.ts", "{PORT}", "{DB}"], script: "acceptance/C3.2.test.ts" }]), plan("C3.2.test.ts"));
ok("C11.1 (one command per line) keeps its setup", plan("C11.1.test.ts").map((s) => s.script).join() === "studio/tests/runtime/setup_visitor_visa.ts,studio/acceptance/C11.1.test.ts");
ok("C6.9's remark after setup_vv_m3 is dropped", plan("C6.9.test.ts").every((s) => s.args.every((a) => !a.includes("("))));
ok("an optional [argument] is dropped (C4.1 [wp.family])", plan("C4.1.test.ts").at(-1)?.args.join(" ") === "studio/acceptance/C4.1.test.ts {PORT} {DB}");
ok("C11.12 finds both its packs", packsOf("C11.12").join() === "C11.12-runtime.test.ts,C11.12.test.ts");
ok("a pack with setup steps is labelled \"fixture only\"; a pack alone runs on the six", /^fixture only/.test(whereOf(runPlan("C7.5.test.ts", readFileSync(join(ACC, "C7.5.test.ts"), "utf8")))) && whereOf(runPlan("C11.13.test.ts", readFileSync(join(ACC, "C11.13.test.ts"), "utf8"))) === "on the six");
ok("a header with no run line is an error, not a skip", Boolean(runPlan("C0.1.test.ts", "// nothing here\nimport x from 'y';").error));

// The command itself: skips, refusal and pass (packs off; the real BUGS.md is not read, so the cases stay true).
const T = mkdtempSync(join(tmpdir(), "gate-b-")), bf = join(T, "BUGS.md"); writeFileSync(bf, BUGS);
const run = (args, env = {}) => { const r = spawnSync(process.execPath, [join(HERE, "gate-b.mjs"), "--bugs", bf, "--no-packs", ...args], { encoding: "utf8", env: { ...process.env, GITHUB_STEP_SUMMARY: "", PR_TITLE: "", PR_BODY: "", QUEUE: "", ...env } }); return { code: r.status, out: r.stdout + r.stderr }; };
let r = run(["--title", "forms: C11.13 reason", "--body", "Claims Works: C11.13"]);
ok("command: claiming Works for C11.13 with QA-192 open exits 1 and names the bug", r.code === 1 && /QA-192/.test(r.out), r);
r = run(["--title", "forms: C11.13 reason", "--body", "Claims Works: C11.13\nFixes: QA-192"]);
ok("command: naming QA-192 exits 0", r.code === 0, r);
r = run(["--title", "forms: C11.13 reason"]);
ok("command: naming C11.13 without claiming Works exits 0 and says there is no bug check", r.code === 0 && /claims Works for none/.test(r.out), r);
r = run(["--title", "qa: C11.13 retest record", "--body", "Claims Works: C11.13", "--kind", "records"]);
ok("command: a records PR is skipped (exit 0)", r.code === 0 && /skipped \(records/.test(r.out), r);
r = run([], { PR_TITLE: "forms: C11.13", KIND: "notes" });
ok("command: a notes PR from the CI environment is skipped", r.code === 0 && /skipped \(notes/.test(r.out), r);
r = run([], { PR_TITLE: "merge queue: C11.13", KIND: "code", QUEUE: "true" });
ok("command: a merge-queue batch is skipped", r.code === 0 && /merge-queue/.test(r.out), r);
r = run(["--title", "infra: faster suites"]);
ok("command: a PR naming no capability is skipped", r.code === 0 && /names no capability/.test(r.out), r);
r = run(["--title", "x", "--bogus"]);
ok("command: an unknown option exits 2", r.code === 2, r);
rmSync(T, { recursive: true, force: true });
// The real file parses: every open row has a severity.
const real = openBugs(readFileSync(join(P, "qa/BUGS.md"), "utf8"));
ok(`the real qa/BUGS.md parses (${real.length} open rows, each with a severity)`, real.length > 0 && real.every((b) => b.severity !== "unknown"), real.filter((b) => b.severity === "unknown"));
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
