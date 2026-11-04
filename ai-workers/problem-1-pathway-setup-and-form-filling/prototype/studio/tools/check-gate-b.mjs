#!/usr/bin/env node
// gate-b.mjs both ways (P-214): what a PR names and claims Works, the open bugs that stop it, the skips, the step
// lists, and that every acceptance pack's documented run can be read. Runs no pack and no server, US$0.
//   node studio/tools/check-gate-b.mjs
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { tail, claims, expand, openBugs, blockers, runPlan, stepsVerdict, packsOf, whereOf, dataOf, packVerdict, part1 } from "./gate-b.mjs";

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
| QA-100 | Bug · Major | C9.9 · P-1 | x | y | screens | Closed 1 Nov |
  | **QA-301** | Bug · Major | c12.4 · odd shapes (leading space, bold id, lower-case capability) | x | y | runtime | Open |
| [QA-302](reports/x.md) | Bug · Minor → Major (raised 4 Nov) | C12.5 | x | y | runtime | Open |
| QA-303 | Bug · Major | C12.* every list | x | y | runtime | Retested 4 Nov: still fails |
| QA-304 | Bug · Major | C12.7 | x | y | runtime | Closed 1 Nov, reopened 4 Nov |
| QA-305 | Bug · Severe | C12.8 | x | y | runtime | Open |`;
const bugs = openBugs(BUGS);
// The bug check looks only at a "Claims Works:" line (tech lead, 4 Nov); w() claims Works for the title's capability.
const gate = (title, body = "") => blockers(claims(title, body), bugs).map((b) => b.bug);
const w = (title, more = "") => gate(title, `Claims Works: ${title.match(/C\d+\.\d+/)?.[0]}\n${more}`);

// Part 1: the done-when cases (tech lead, 4 Nov) and the shapes of BUGS.md.
ok("a PR claiming Works for C11.13 while QA-192 (Major) is open is refused", w("forms: C11.13 near-duplicate reason").join() === "QA-192", w("forms: C11.13 near-duplicate reason"));
ok("a title is never a fix, even \"fixes QA-192\" (review R2-M1)", w("forms: C11.13 near-duplicate reason, fixes QA-192").join() === "QA-192");
ok("a title that only names QA-192 is not a fix (\"QA-192: reason\")", w("forms: C11.13 — QA-192: near-duplicate reason").join() === "QA-192");
ok("…or with a \"Fixes: QA-192\" line", w("forms: C11.13 reason", "Plan…\nFixes: QA-192\n").length === 0);
ok("prose is never a fix, even \"This fixes QA-192\"; only a strict Fixes: line is", w("forms: C11.13 reason", "This fixes QA-192 by asking for the reason.").join() === "QA-192" && w("forms: C11.13 reason", "**Fixes:** QA-192, QA-169").length === 0);
// The reviewer's and the breaker's false passes at 844094baa (4 Nov): a mention near "fixed" or "closed" is no fix.
for (const line of ["This does not fix QA-192 yet.", "QA-192 is not fixed by this PR", "(QA-192 still open, closes nothing)", "QA-192 to follow (see QA-169 fixed)",
  "QA-169 closed. **QA-192** (Gap · Major, open) still names C11.13", "QA-192 is still Open: Major (C4.11; C4.7 part fixed, 2 Nov)", "This PR has not fixed QA-192", "Fixes: QA-169, not QA-192"])
  ok(`a mention is not a fix: "${line}"`, w("forms: C11.13 reason", line).join() === "QA-192", w("forms: C11.13 reason", line));
// Round 2's false passes at d61a7fb2b (review R2-M1, R2-M2, R2-M3).
for (const line of ["This closes QA-169 and QA-192 stays open.", "This fixes QA-169, QA-192 stays open.", "Fixes: none (QA-192 stays open)", "Fixes: QA-169 (QA-192 is the next PR)",
  "**Fix:** the same rule QA-192 settled", "Fix: QA-192", "Fixes QA-192"])
  ok(`not a fix: "${line}"`, w("forms: C11.13 reason", line).join() === "QA-192", w("forms: C11.13 reason", line));
ok("a title \"fix: … (QA-192 still open)\" is not a fix", w("fix: C11.13 reason (QA-192 still open)").join() === "QA-192");
for (const [label, body] of [["the key in code, the ids in text", "`Claims Works:` C11.13"], ["a heading with a list", "## Claims Works\n- C11.13"],
  ["a bold label with a list", "**Claims Works**\n- C11.13"], ["a bare label with a list", "Claims Works\n- C11.13"], ["a key alone with a colon and a list", "Claims Works:\n1. C11.13"]])
  ok(`a Claims Works line is read as ${label}`, claims("forms: x", body).works.has("C11.13"), [...claims("forms: x", body).works]);
ok("a PR that names C11.13 without claiming Works is not checked against BUGS.md", gate("forms: C11.13 near-duplicate reason", "Capabilities: C11.13").length === 0);
// The two refused before the tech lead's correction: #785's and #771's own titles (4 Nov), no "Claims Works:" line.
ok("#785 (C11.14 saved checker rounds, no Claims Works) no longer refuses; with Claims Works: C11.14 it refuses on QA-176",
  gate("forms: C11.14 — the 15 field-map checker rounds on main from #671's paid runs (no new spend)").length === 0 && w("forms: C11.14 — the 15 field-map checker rounds").join() === "QA-176");
ok("#771 (C3.4 saved v2 masters rounds, no Claims Works) no longer refuses; with Claims Works: C3.4 it refuses on QA-196",
  gate("forms: C3.4 — saved v2 masters rounds, IMM 5257 and guide 5256 (paid US$1.35, P-295/P-300)").length === 0 && w("forms: C3.4 — saved v2 masters rounds").join() === "QA-196");
for (const [label, body] of [["a list under the key", "Claims Works:\n- C11.13\n- C3.4"], ["two keys on one line", "Capabilities: C3.4 · Claims Works: C11.13"],
  ["a note before the colon", "Claims Works (after this PR): C11.13"], ["a table row", "| Claims Works | C11.13 |"], ["lower case", "claims works: c11.13"],
  ["a heading", "## Claims Works: C11.13"], ["bold and a bullet", "- **Claims Works:** C11.13"], ["a trailing dot and CRLF", "Claims Works: C11.13.\r\nmore"]])
  ok(`a Claims Works line is read as ${label}`, claims("forms: x", body).works.has("C11.13"), [...claims("forms: x", body).works]);
// Round 3's silent skips at 7a08bbe10 (review R3-M1): a "Claims Works" heading or phrase without a colon key.
for (const head of ["## Claims Works (as built)", "## Claims Works (after this PR)", "## ✅ Claims Works", "## Claims Works for", "## Claims Works.", "Claims Works —", "This PR claims Works", "Claims Works on"])
  ok(`"${head}" with a list under it is a Works claim (the bug check runs)`, gate("forms: x", `${head}\n- C11.13`).join() === "QA-192", gate("forms: x", `${head}\n- C11.13`));
ok("fail then pass (tech lead, 4 Nov): \"## Claims Works (as built)\" over C11.13 refuses on QA-192, and passes with \"Fixes: QA-192\"",
  gate("forms: x", "## Claims Works (as built)\n- C11.13").join() === "QA-192" && gate("forms: x", "## Claims Works (as built)\n- C11.13\n\nFixes: QA-192").length === 0);
// The scoped check's false passes at a7335f0f9 (4 Nov): a key whose note spans a second key, and a list under a
// "Claims Works for X" heading that names an id itself (r4-m1). Each refused nothing before; each refuses on QA-192 now.
for (const body of ["Claims Works on C11.13 · Capabilities: C11.10", "Capabilities: C11.10 · Claims Works on C11.13", "## Claims Works for C11.10\n- C11.13", "Claims Works for C11.10:\n- C11.13"])
  ok(`every Works id is checked: "${body.replace(/\n/g, " / ")}"`, gate("forms: x", body).includes("QA-192"), gate("forms: x", body));
// #850's review (Opus, 4 Nov): 24 shapes around the two fixes. Each names C11.13 (QA-192) or C11.14 (QA-176) as Works;
// each must refuse. M1: the id before the phrase; M2: a blank line before the list; M3: two Works phrases or a Works key
// beside a phrase on one line, and a Works key's ids after a middle dot.
for (const [label, body] of [["two phrases on one line", "Claims Works on C11.13 and claims Works on C11.14"], ["two phrases, a key between", "Claims Works on C11.13 · Capabilities: C11.10 · claims Works on C11.14"],
  ["a Works key then a Works phrase", "Claims Works: C11.10 · Claims Works on C11.13"], ["a Works key then a phrase after a comma", "Claims Works: C11.10, and this PR claims Works on C11.13"],
  ["a Works key, ids after a middle dot", "Claims Works: C11.10 · C11.13"], ["a lower-case id in a note", "Claims Works (for c11.13): yes"], ["a lower-case note, then a capabilities key", "claims works on c11.13 · capabilities: C11.10"],
  ["an id in the note, nothing after", "Claims Works (for C11.13):"], ["an id in the note, a list", "Claims Works (for C11.10):\n- C11.13"], ["a heading, a blank line, a list", "## Claims Works for C11.10\n\n- C11.13"],
  ["a Works key, a blank line, a list", "Claims Works:\n\n- C11.13"], ["a heading with no id, a blank line, a list", "## Claims Works (as built)\n\n- C11.13"], ["a capabilities key then a phrase", "Capabilities: C11.10 · Claims Works on C11.13"],
  ["a capabilities key then a phrase after a comma", "Capabilities: C11.10, and this PR claims Works on C11.13"], ["a capabilities key, a phrase, a key", "Capabilities: C11.10 · claims Works on C11.13 · Capabilities: C3.4"],
  ["the id before the phrase, a long line", "C11.13 near-duplicate reason: this PR now claims Works on it once qa agrees"], ["a table row, the id then the status", "| Capability | Status |\n|---|---|\n| C11.13 | Claims Works (as built, all 14 steps pass) |"],
  ["a capabilities key, the id, then the phrase", "Capabilities: C11.13 — after this PR it claims Works"], ["short, the id before", "C11.13: this PR claims Works"], ["a heading, the id before", "## C11.13 claims Works"],
  ["a bullet, the id before the phrase", "- C11.13 (reason field): claims Works after this PR, steps 1-14 green"], ["a note with C1 that is no id", "Claims Works (C1 pass): C11.13"], ["a note with a time", "Claims Works (as of 10:30 IST): C11.13"],
  ["a phrase, then a list", "This PR claims Works on C11.10.\n- C11.13 is untouched (next section)"]])
  ok(`#850 review: refuses as a Works claim: ${label}`, part1(claims("forms: x", body), bugs).length > 0, [...claims("forms: x", body).works]);
// #850 round 2 (Opus, 4 Nov): M4, a Works key's list under it when its value names an id; m3, cases that pin "every
// phrase is read" and "a phrase beside a Works key". Each must claim C11.13 Works and refuse on QA-192.
for (const [label, body] of [["M4: a Works key naming an id, a list under it", "Claims Works: C11.10\n- C11.13"], ["M4: none · an id, a list under it", "Claims Works: none · see C11.10\n- C11.13"],
  ["M4: a key with a note, an id after a dot, a list", "Claims Works (as built): · C11.10 notes\n- C11.13"], ["M4: bold key, a blank line, a list", "**Claims Works:** C11.10\n\n- C11.13"],
  ["m3: two phrases around a capabilities key", "Claims Works on C11.10 · Capabilities: C3.5 · claims Works on C11.13"], ["m3: a phrase before a Works key", "This PR claims Works on C11.13 · Claims Works: C11.10"]])
  ok(`#850 round 2: ${label}`, claims("forms: x", body).works.has("C11.13") && gate("forms: x", body).includes("QA-192"), [...claims("forms: x", body).works]);
ok("#850 review m2: \"Claims Works for C11.10:\" over \"- C11.13\" claims both", ["C11.10", "C11.13"].every((id) => claims("forms: x", "Claims Works for C11.10:\n- C11.13").works.has(id)), [...claims("forms: x", "Claims Works for C11.10:\n- C11.13").works]);
ok("…and the capabilities key beside it stays a plain capability", !claims("forms: x", "Claims Works on C11.13 · Capabilities: C11.10").works.has("C11.10") && claims("forms: x", "Claims Works on C11.13 · Capabilities: C11.10").caps.has("C11.10"));
ok("\"This PR claims Works on C11.13\" is a Works claim", gate("forms: x", "This PR claims Works on C11.13 once qa agrees.").join() === "QA-192");
ok("a heading \"## Claims Works (as built)\" with nothing under it refuses as unread", part1(claims("forms: x", "## Claims Works (as built)\n\nText."), bugs).length === 1);
ok("a prose sentence about the line that names nothing claims nothing", part1(claims("forms: x", "A line that says it claims Works but names nothing readable refuses."), bugs).length === 0);
ok("a struck-out fix is no fix (~~Fixes: QA-192~~)", w("forms: C11.13 reason", "~~Fixes: QA-192~~").join() === "QA-192");
ok("\"Capability:\" (one) names a capability", claims("forms: x", "Capability: C11.13").caps.has("C11.13"));
ok("prose that claims Works without a readable line refuses (never a silent skip)", part1(claims("forms: x", "This PR claims Works for C11.13 once qa agrees."), bugs).length === 1);
ok("\"Claims Works:\" with nothing readable refuses; \"Claims Works: none\" does not", part1(claims("forms: x", "Claims Works: the reason dialog"), bugs).length === 1 && part1(claims("forms: x", "Claims Works: none"), bugs).length === 0);
ok("an example in inline code or a fenced block is not a claim (#804's own description, run 41765883303)",
  claims("infra: gate B", "A pack names its steps, e.g. `Capabilities: C7.5 (steps 1-4, 10-14)`.\n```\nClaims Works: C11.13\n```\n").caps.size === 0);
ok("a Claims Works line whose ids are only in code refuses", part1(claims("forms: x", "Claims Works: `C11.13`"), bugs).length === 1);
ok("a fix inside code does not count", w("forms: C11.13 reason", "`Fixes: QA-192`").join() === "QA-192");
ok("a Works claim is the whole pack: steps never narrow it", claims("forms: x", "Claims Works: C7.5 (steps 1-4)").caps.get("C7.5") === null);
ok("a Claims Works line names its capabilities for the packs too", [...claims("forms: x", "Claims Works: C11.13, C4.7").caps.keys()].join() === "C11.13,C4.7" && [...claims("forms: x", "**Claims Works:** C11.13").works].join() === "C11.13");
ok("a Minor does not stop a PR (QA-150 on C11.3)", w("screens: C11.3 trail").length === 0);
ok("severity is the word after the type: \"Minor (… Major if …)\" stays Minor", bugs.find((b) => b.id === "QA-202")?.severity === "Minor", bugs.find((b) => b.id === "QA-202"));
ok("bold severity is read (QA-180 **Critical**) and stops C5.1", bugs.find((b) => b.id === "QA-180")?.severity === "Critical" && w("screens: C5.1 gate").join() === "QA-180");
ok("a row naming two capabilities stops each (QA-162: C4.7 and C4.11)", w("forms: C4.7 picks").join() === "QA-162" && w("forms: C4.11 run").join() === "QA-162");
ok("C6.x covers C6.4, not C16.4 or C7.4", w("runtime: C6.4 list").join() === "QA-167" && w("runtime: C16.4").length === 0 && w("runtime: C7.4").length === 0);
ok("capabilities after the first \"·\" are references, not the row's own (QA-201 does not stop C3.4)", gate("forms: x", "Claims Works: C3.5").length === 0 && !w("forms: C3.4 drafts").includes("QA-201"));
ok("a closed row does not stop (QA-100, Closed)", w("screens: C9.9").length === 0);
ok("odd row shapes are read: leading space, bold id, lower-case capability (QA-301)", w("runtime: C12.4").includes("QA-301"), bugs.find((b) => b.id === "QA-301"));
ok("a linked id and \"Minor → Major (raised)\" read as Major (QA-302)", w("runtime: C12.5").includes("QA-302"), bugs.find((b) => b.id === "QA-302"));
ok("C12.* covers C12.6; \"Retested: still fails\" is open (QA-303)", w("runtime: C12.6").join() === "QA-303");
ok("\"Closed …, reopened\" is open (QA-304)", w("runtime: C12.7").includes("QA-304"));
ok("a severity the gate cannot read stops a Works claim (fail closed, QA-305)", w("runtime: C12.8").includes("QA-305"));
ok("C11.1 is not C11.13 (word boundary)", w("screens: C11.1 list").length === 0);
ok("body prose naming a capability is not a claim; a \"Capabilities:\" line is",
  claims("infra: tool", "This unblocks C11.13 later.").caps.size === 0 && [...claims("infra: tool", "**Capabilities:** C11.13, C4.7").caps.keys()].join() === "C11.13,C4.7");

// Steps: a pack green only in part names its steps.
const c75 = claims("runtime: C7.5 part 1", "Capabilities: C7.5 (steps 1-4, 10…14, 6b)");
ok("steps are read and ranges expanded", JSON.stringify(c75.caps.get("C7.5")) === JSON.stringify(["1", "2", "3", "4", "10", "11", "12", "13", "14", "6b"]), c75.caps.get("C7.5"));
ok("a title claim without steps is the whole pack", claims("runtime: C7.5 rules").caps.get("C7.5") === null);
ok("expand keeps labels that are not ranges", expand("AT-1, AT-3 9").join() === "AT-1,AT-3,9");
ok("an en dash range expands (1–3)", expand("1–3").join() === "1,2,3");
ok("an empty steps list is empty, and refuses", JSON.stringify(claims("x", "Capabilities: C99.2 (steps ,)").caps.get("C99.2")) === "[]" && packVerdict("C99.2", [], 1, "FAIL  C99.2-1 x") === "the steps list names no step");
const out = "PASS  C7.5-1 a\nPASS  C7.5-2 b\nFAIL  C7.5-5 c\nPASS  C7.5-10 d\nFAIL  C7.5-1x e\nPASS  C3.2 AT-1 f\nFAIL  C3.2 AT-3 g\n";
ok("named steps that PASS pass", stepsVerdict("C7.5", ["1", "2", "10"], out).length === 0);
ok("a named step that FAILs or is missing is reported (C7.5-5, C7.5-11)", stepsVerdict("C7.5", ["1", "5", "11"], out).join() === "5,11");
ok("C7.5-1 is not C7.5-10 or C7.5-1x", stepsVerdict("C7.5", ["1"], "PASS  C7.5-10 x\nPASS  C7.5-1x y\n").join() === "1");
ok("whole pack: exit 0 with no FAIL passes; exit 0 with a FAIL line, exit 1, 2 or 137 refuses",
  packVerdict("C9.9", null, 0, "PASS  a\n2/2 passed") === null && [[0, "FAIL  x"], [1, "PASS"], [2, ""], [137, ""], [124, "(stopped)"]].every(([c, o]) => packVerdict("C9.9", null, c, o)));
ok("named steps: exit 1 passes when they are green; exit 2, a crash or a timeout never does",
  packVerdict("C99.8", ["1"], 1, "PASS  C99.8-1 a\nFAIL  C99.8-2 b") === null && [2, 124, 137, 127].every((c) => packVerdict("C99.8", ["1"], c, "PASS  C99.8-1 a")));
ok("a named step with a HELD line is not green, though another check of that step PASSes (QA-215 break 1)", stepsVerdict("C11.3", ["AT-5"], "PASS  C11.3 AT-5 refusal x\nHELD  C11.3 AT-5 the AI check — P-284\n").join() === "AT-5" && packVerdict("C11.3", null, 0, "PASS  C11.3 AT-5 x\nHELD  C11.3 AT-5 y\n26/26 passed, 1 held") === null);
ok("tail() gives the last non-blank lines, trimmed and cut, so an exit-2 pack's reason reaches the report (P-214)", JSON.stringify(tail("PASS  a\n\nSTOP  setup missing: no combination wp.family on this copy   \n\n")) === JSON.stringify(["PASS  a", "STOP  setup missing: no combination wp.family on this copy"]) && tail("x\n".repeat(9)).length === 3 && tail("y".repeat(300))[0].length === 200 && tail("").length === 0);
ok("tail() of a crash keeps its Error line, which sits above the stack frames (review m1)", (() => { const t = tail("PASS  a\nfile:///x.ts:3\nTypeError: Cannot read properties of undefined (reading 'id')\n    at f (x.ts:3:9)\n    at g (x.ts:9:1)\n    at h (x.ts:12:1)\nNode.js v24.21.0\n"); return t.length === 3 && t[0].startsWith("TypeError: Cannot read") && t[2] === "Node.js v24.21.0"; })());
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
// P-294 (a): GATE_B_DATA picks the demo data a pack alone runs on; the default stays the six; a typo is refused.
{ const alone = runPlan("C11.13.test.ts", readFileSync(join(ACC, "C11.13.test.ts"), "utf8")), setup = runPlan("C7.5.test.ts", readFileSync(join(ACC, "C7.5.test.ts"), "utf8"));
  ok("GATE_B_DATA unset or \"six\": a pack alone runs on the six (the default)", dataOf({}) === "six" && dataOf({ GATE_B_DATA: "six" }) === "six" && whereOf(alone, dataOf({})) === "on the six");
  ok("GATE_B_DATA=checkpoint: a pack alone runs on the checkpoint and says so; a pack with setup steps stays on its fixture", dataOf({ GATE_B_DATA: "checkpoint" }) === "checkpoint" && whereOf(alone, "checkpoint") === "on the checkpoint" && /^fixture only/.test(whereOf(setup, "checkpoint")));
  let refused = ""; try { dataOf({ GATE_B_DATA: "checkpont" }); } catch (e) { refused = e.message; }
  ok("GATE_B_DATA with any other value is refused in words, never run on the six by mistake", /GATE_B_DATA must be "six" or "checkpoint", not "checkpont"/.test(refused), refused); }
ok("a header with no run line is an error, not a skip", Boolean(runPlan("C0.1.test.ts", "// nothing here\nimport x from 'y';").error));

// The command itself: skips, refusal and pass (packs off; the real BUGS.md is not read, so the cases stay true).
const T = mkdtempSync(join(tmpdir(), "gate-b-")), bf = join(T, "BUGS.md"); writeFileSync(bf, BUGS);
// Each command case starts from a clean CI environment: the job's own QUEUE, KIND, RANGE, PR_* and GITHUB_* values
// (a merge-queue batch sets QUEUE=true, a records PR KIND=records) would otherwise change what the gate does (#826).
const CLEAN = { GITHUB_STEP_SUMMARY: "", PR_TITLE: "", PR_BODY: "", QUEUE: "", KIND: "code", RANGE: "", GITHUB_TOKEN: "", GATE_B_PORT: "", GATE_B_NAME: "", GATE_B_JOBS: "", GATE_B_SKIP_PACKS: "" };
const run = (args, env = {}) => { const r = spawnSync(process.execPath, [join(HERE, "gate-b.mjs"), "--bugs", bf, "--no-packs", ...args], { encoding: "utf8", env: { ...process.env, ...CLEAN, ...env } }); return { code: r.status, out: r.stdout + r.stderr }; };
let r = run(["--title", "forms: C11.13 reason", "--body", "Claims Works: C11.13"]);
const r3a = run(["--title", "forms: x", "--body", "## Claims Works (as built)\n- C11.13"]), r3b = run(["--title", "forms: x", "--body", "## Claims Works (as built)\n- C11.13\n\nFixes: QA-192"]);
ok("command: \"## Claims Works (as built)\" over C11.13 exits 1 naming QA-192, then 0 with the Fixes line", r3a.code === 1 && /QA-192/.test(r3a.out) && r3b.code === 0, [r3a, r3b]);
const r0 = r;
ok("command: claiming Works for C11.13 with QA-192 open exits 1 and names the bug", r.code === 1 && /QA-192/.test(r.out), r);
r = run(["--title", "forms: C11.13 reason", "--body", "Claims Works: C11.13\nFixes: QA-192"]);
ok("command: naming QA-192 exits 0", r.code === 0, r);
r = run(["--title", "forms: C11.13 reason"]);
ok("command: naming C11.13 without claiming Works exits 0 and says there is no bug check", r.code === 0 && /claims Works for none/.test(r.out), r);
r = run(["--title", "qa: C11.13 retest record", "--body", "Claims Works: C11.13", "--kind", "records"]);
ok("command: a records PR is skipped (exit 0)", r.code === 0 && /skipped \(records/.test(r.out), r);
r = run([], { PR_TITLE: "forms: C11.13", KIND: "notes" });
ok("command: a notes PR from the CI environment is skipped", r.code === 0 && /skipped \(notes/.test(r.out), r);
r = run(["--title", "infra: faster suites"]);
ok("command: a PR naming no capability is skipped", r.code === 0 && /names no capability/.test(r.out), r);
r = run(["--title", "forms: C11.13 reason", "--kind", "Code"]);
ok("command: an unknown KIND is not a skip (only notes and records are)", !/skipped/.test(r.out) && r.code === 0, r);
r = run([], { PR_TITLE: "merge queue: checking #726 on main", KIND: "code", QUEUE: "true", GITHUB_TOKEN: "" });
ok("command: a merge-queue batch re-checks its PRs, and without GITHUB_TOKEN it could not run (exit 2)", r.code === 2 && /GITHUB_TOKEN/.test(r.out), r);
r = spawnSync(process.execPath, [join(HERE, "gate-b.mjs"), "--bugs", bf, "--title", "screens: C11.13"], { encoding: "utf8", env: { ...process.env, ...CLEAN, GITHUB_ACTIONS: "" } });
ok("command: off CI, packs need GATE_B_PORT (exit 2, nothing started)", r.status === 2 && /GATE_B_PORT/.test(r.stdout + r.stderr), r.stdout + r.stderr);
r = run(["--title", "runtime: C11.12"], { GATE_B_SKIP_PACKS: "C11.12-runtime.test.ts" });
ok("command: GATE_B_SKIP_PACKS leaves a held pack out by name and says so (the regression set's held packs)", r.code === 0 && /packs: C11\.12\.test\.ts$/m.test(r.out) && /held, not run: C11\.12-runtime\.test\.ts/.test(r.out), r);
r = run(["--title", "x", "--bogus"]);
ok("command: an unknown option exits 2", r.code === 2, r);
rmSync(T, { recursive: true, force: true });
// The real file parses: every open row has a severity.
const real = openBugs(readFileSync(join(P, "qa/BUGS.md"), "utf8"));
// A row qa writes with an unreadable severity stops Works claims on its capability (fail closed); it is reported here,
// never failed, so a qa records PR cannot turn every code PR red (review m9).
ok(`the real qa/BUGS.md parses (${real.length} open rows)`, real.length > 0, real.length);
const unknown = real.filter((b) => b.severity === "unknown");
if (unknown.length) console.log(`WARN  rows whose severity the gate cannot read (they stop Works claims on their capability): ${unknown.map((b) => b.id).join(", ")}`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
