#!/usr/bin/env node
// gate-b.mjs both ways (P-214): what a PR names and claims Works, the open bugs that stop it, the skips, the step
// lists, and that every acceptance pack's documented run can be read. Runs no pack and no server, US$0.
//   node studio/tools/check-gate-b.mjs
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { tail, claims, expand, openBugs, blockers, runPlan, stepsVerdict, packsOf, whereOf, placeOf, IN_CHECKPOINT, dataOf, dataMap, dataFor, dataForPack, notTested, modeOf, touchedPacks, diffSet, batchRecheck, checkpointTrigger, checkpointRows, packsReachedBy, packVerdict, part1, stepsPrinted, stepsUnprinted, packSteps, unprintedReason } from "./gate-b.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)), ACC = resolve(HERE, "../acceptance"), P = resolve(HERE, "../../../product");
/** A fixture pack whose run truly uses no server (only an engine run line), for the gate's no-server rules (B125, B131). */
const NO_SERVER = { id: "C99.9", file: "C99.9.test.ts", text: "// Fixture pack (check-gate-b.mjs only): its documented run uses no server.\n//   tsx studio/acceptance/C99.9.test.ts --engine\nconsole.log(\"fixture\");\n" };
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
{ // A capability with several packs (C6.5, C6.5-screen, C6.5-counts): each pack answers for the named steps it prints.
  const main = "PASS  C99.5-10 a\nPASS  C99.5-19 b\nFAIL  C99.5-20 c\n30/32 passed", screen = "PASS  C99.5-24 d\nPASS  C99.5-25 e\n32/32 passed";
  const steps = ["10", "19"], pMain = stepsPrinted("C99.5", steps, main), pScreen = stepsPrinted("C99.5", steps, screen);
  ok("several packs: a pack is held to the named steps it prints (C99.5-10, -19 green, -20 not named: passes)", pMain.join() === "10,19" && packVerdict("C99.5", pMain, 1, main) === null);
  ok("several packs: a pack that prints none of the named steps is held to its whole run (32/32 passes; exit 1 or a FAIL line refuses)", pScreen.length === 0 && packVerdict("C99.5", null, 0, screen) === null && packVerdict("C99.5", null, 1, screen + "\nFAIL  C99.5-26 f") !== null);
  ok("several packs: a named step that FAILs in the pack printing it still refuses (C99.5-20)", packVerdict("C99.5", stepsPrinted("C99.5", ["10", "20"], main), 1, main) === "named steps not green: C99.5-20");
  ok("several packs: a named step no pack prints is refused (C99.5-99), and one any pack prints is not", stepsUnprinted(["10", "24", "99"], [stepsPrinted("C99.5", ["10", "24", "99"], main), stepsPrinted("C99.5", ["10", "24", "99"], screen)]).join() === "99" && stepsUnprinted(["10"], [[], ["10"]]).length === 0);
  ok("several packs, wiring (review m6): a pack is judged on the named steps it printed, its whole run when it printed none, its whole run when no steps are named", packSteps("C99.5", steps, main).join() === "10,19" && packSteps("C99.5", steps, screen) === null && packSteps("C99.5", null, main) === null);
  ok("several packs, wiring (review m2): an empty steps list stays refused (it names no step), never read as the whole run", JSON.stringify(packSteps("C99.5", [], main)) === "[]" && packVerdict("C99.5", packSteps("C99.5", [], main), 0, screen) === "the steps list names no step");
  ok("several packs, wiring: a named step no pack printed refuses the capability; none is said when every step was printed or no steps are named", unprintedReason("C99.5", ["10", "99"], [{ printed: ["10"] }, { printed: [] }]) === "C99.5: named steps no pack printed: C99.5-99" && unprintedReason("C99.5", ["10", "24"], [{ printed: ["10"] }, { printed: ["24"] }]) === null && unprintedReason("C99.5", null, [{ printed: [] }]) === null);
  ok("several packs, wiring (review m3): when a pack could not run (infra), its steps are not also called unprinted (the gate exits 2 for that)", unprintedReason("C99.5", ["10", "24"], [{ printed: ["10"] }, { printed: undefined, infra: true }]) === null);
  ok("several packs: a HELD line counts as printed, so the step is judged (and refused) in that pack", stepsPrinted("C11.3", ["AT-5"], "HELD  C11.3 AT-5 y\n").join() === "AT-5" && packVerdict("C11.3", ["AT-5"], 0, "HELD  C11.3 AT-5 y\n") !== null);
}
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
  ok("GATE_B_DATA=checkpoint: a pack alone runs on the checkpoint and says so", dataOf({ GATE_B_DATA: "checkpoint" }) === "checkpoint" && whereOf(alone, "checkpoint") === "on the checkpoint" && placeOf(alone, "checkpoint").load === "checkpoint" && placeOf(alone, "checkpoint").steps.length === 1);
  // B125 (nightly 42335507309, data=checkpoint: C6.9, C8.2 and C6.4 ran "fixture only"): on the checkpoint the checkpoint
  // is loaded and the setups it holds are skipped, so the pack runs alone; on the six nothing changes.
  const P_ = (f) => runPlan(f, readFileSync(join(ACC, f), "utf8"));
  for (const f of ["C6.9.test.ts", "C8.2.test.ts", "C6.4.test.ts", "C7.5.test.ts"]) {
    const p = P_(f), cp = placeOf(p, "checkpoint"), six = placeOf(p, "six");
    ok(`B125: ${f} on the checkpoint: loads it, "on the checkpoint", the pack alone (${p.steps.length} steps on the six)`, p.steps.length > 1 && cp.load === "checkpoint" && cp.where === "on the checkpoint" && whereOf(p, "checkpoint") === cp.where && cp.steps.length === 1 && cp.steps[0].script === `studio/acceptance/${f}` && cp.steps[0].args.join(" ") === `studio/acceptance/${f} {PORT} {DB}`, cp);
    ok(`B125: ${f} on the six keeps today's rule: no demo data loaded, "fixture only", every setup step`, six.load === null && /^fixture only/.test(six.where) && /^fixture only/.test(whereOf(p)) && six.steps === p.steps, six.where);
  }
  { const p = P_("C4.4.test.ts"), cp = placeOf(p, "checkpoint");   // review B125 Major: the checkpoint lacks C4.4's own setup
    ok("B125: C4.4 on the checkpoint keeps its own setup (setup_c44_types.ts, not in the checkpoint) after the load, and says so", cp.load === "checkpoint" && cp.steps.map((s) => s.script).join() === "studio/tests/runtime/setup_c44_types.ts,studio/acceptance/C4.4.test.ts" && cp.where === "on the checkpoint, after its own setup setup_c44_types.ts", cp); }
  // review B125 m3: a pack whose run uses no server. C6.5 was the example until #1369 gave it a server run (its
  // isolated.sh line, approved by the tech lead); a fixture pack (NO_SERVER below) keeps what this proves.
  { const p = runPlan(NO_SERVER.file, NO_SERVER.text), cp = placeOf(p, "checkpoint");
    ok("B125: a pack whose run uses no server (a fixture pack, --engine) loads nothing on the checkpoint and says so", cp.load === null && cp.where === "on no demo data (its run uses no server)" && cp.steps.length === 1, cp); }
  { const p = P_("C6.5.test.ts"), cp = placeOf(p, "checkpoint");
    ok("B125 (#1369): C6.5 now has a server run: on the checkpoint it loads the checkpoint and runs its pack there", cp.load === "checkpoint" && cp.where === "on the checkpoint", cp); }
  ok("B125: only the setups the checkpoint holds are skipped (setup_visitor_visa, setup_vv_m3)", [...IN_CHECKPOINT].sort().join() === "studio/acceptance/lib/setup_vv_m3.ts,studio/tests/runtime/setup_visitor_visa.ts");
  ok("B125: on the six, a pack alone still loads the six and runs alone", placeOf(alone, "six").load === "six" && whereOf(alone, "six") === "on the six" && placeOf(alone, "six").steps === alone.steps);
  let refused = ""; try { dataOf({ GATE_B_DATA: "checkpont" }); } catch (e) { refused = e.message; }
  ok("GATE_B_DATA with any other value is refused in words, never run on the six by mistake", /GATE_B_DATA must be "six" or "checkpoint", not "checkpont"/.test(refused), refused); }
ok("a header with no run line is an error, not a skip", Boolean(runPlan("C0.1.test.ts", "// nothing here\nimport x from 'y';").error));
// P-486 (Lead 22 on #1591): on a pull request, a pack qa's hold file names as a checkpoint row runs on the configured
// checkpoint, as the nightly does (C11.12-runtime: red on the six by design, P-322); every other pack keeps its data.
// Review M1 (#1609): qa's live hold file is never read here (a notes PR editing it runs no check-gate-b.mjs); its text
// is pinned at commit 348fa8b11, which holds the row, and a base without it is built as a dangling commit.
{ const { checkpointPacks } = await import("./works-set.mjs");
  const HOLD = "- C11.12-runtime.test.ts checkpoint row (P-322): not run on the six, where it is red (exit 2); green on the configured checkpoint (4/4, run 41866440174)\n- C7.5-runs.test.ts red on main, run 41799999999 (a plain hold)\n- C3.2-x.test.ts checkpoint row (P-322), red, run 41799999999, lifted 5 Nov\n- C4.1-y.test.ts red, run 41799999999: not a checkpoint row";
  const cp = checkpointPacks(HOLD);
  ok("P-486 pass: the hold file's checkpoint row is read (C11.12-runtime.test.ts)", cp.has("C11.12-runtime.test.ts"), [...cp]);
  ok("P-486 fail: a plain hold, a lifted checkpoint-row pack line (review m2) and \"not a checkpoint row\" (review m5) move no pack", cp.size === 1 && !cp.has("C7.5-runs.test.ts") && !cp.has("C3.2-x.test.ts") && !cp.has("C4.1-y.test.ts"), [...cp]);
  const e = { GATE_B_DATA: "six", GATE_B_DATA_OF: "C11.12=six" };
  ok("P-486 pass: with C11.12=six, C11.12-runtime.test.ts runs on the checkpoint", dataForPack("C11.12", "C11.12-runtime.test.ts", e, cp) === "checkpoint");
  ok("P-486 fail: C11.12's other pack keeps its capability's data (the six), and with no hold file every pack does", dataForPack("C11.12", "C11.12.test.ts", e, cp) === "six" && dataForPack("C11.12", "C11.12-runtime.test.ts", e, new Set()) === "six");
  // Review m4: NOT TESTED reads each pack's own data (a pack with setup steps is "fixture only" on the six, never on the checkpoint).
  const setup = (f) => `// zsh studio/tools/isolated.sh p97 4611 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4611 xr_studio_p97 && tsx studio/acceptance/${f} 4611 xr_studio_p97`;
  const nt = notTested(["C9.7"], [{ id: "C9.7", f: "C9.7-a.test.ts" }, { id: "C9.7", f: "C9.7-b.test.ts" }], (id, f) => dataForPack(id, f, { GATE_B_DATA: "six" }, new Set(["C9.7-a.test.ts"])), setup);
  ok("P-486 pass (review m4): NOT TESTED reads each pack's data: the checkpoint row is tested there, its sibling on the six is not", nt.length === 1 && /C9\.7-b\.test\.ts/.test(nt[0]) && !nt.some((l) => /C9\.7-a/.test(l)), nt);
  const PIN = "348fa8b11", HELD_PATH = "ai-workers/problem-1-pathway-setup-and-form-filling/product/qa/REGRESSION-HELD.md";
  const git = (a, extra = {}) => spawnSync("git", a, { cwd: HERE, encoding: "utf8", ...extra });
  const pinned = git(["show", `${PIN}:${HELD_PATH}`]);
  ok("P-486 pass: qa's hold file at the pinned commit names C11.12-runtime.test.ts a checkpoint row", pinned.status === 0 && checkpointPacks(pinned.stdout).has("C11.12-runtime.test.ts"), pinned.stderr.slice(0, 200));
  // The gate itself, with C11.12=six: its plan says where each pack runs, reading the hold file at RANGE's base.
  const plan = (env) => { const r = spawnSync(process.execPath, [join(HERE, "gate-b.mjs"), "--plan", "--title", "runtime: C11.12"], { encoding: "utf8", env: { ...process.env, PR_TITLE: "", PR_BODY: "", QUEUE: "", KIND: "code", GATE_B_DATA: "", GATE_B_NO_DIFF: "1", GATE_B_DATA_OF: "C11.12=six", GITHUB_STEP_SUMMARY: "", GATE_B_SKIP_PACKS: "", RANGE: "", ...env } }); return { code: r.status, out: r.stdout + r.stderr }; };
  const head = git(["rev-parse", "HEAD"]).stdout.trim(), base = git(["rev-parse", `${PIN}^{commit}`]).stdout.trim();
  if (head && base) {
    const pr = plan({ RANGE: `${base}..${head}` });
    ok("P-486 pass (the gate's plan on a pull request whose base holds the row): C11.12-runtime.test.ts runs on the checkpoint, and says why", pr.code === 0 && /^C11\.12-runtime\.test\.ts on the checkpoint\b/m.test(pr.out) && /on the checkpoint, as qa's checkpoint rows \(REGRESSION-HELD\.md, P-322\): C11\.12-runtime\.test\.ts/.test(pr.out), pr.out.slice(0, 600));
    ok("P-486 fail (the gate's plan): C11.12.test.ts stays on the six", /^C11\.12\.test\.ts on the six\b/m.test(pr.out), pr.out.slice(0, 600));
    // Review m1: the base's hold file decides, never the working tree's: a base whose file lacks the row moves nothing.
    const idx = join(mkdtempSync(join(tmpdir(), "gb486-")), "index"), envI = { env: { ...process.env, GIT_INDEX_FILE: idx } };
    const blob = git(["hash-object", "-w", "--stdin"], { input: pinned.stdout.split("\n").filter((l) => !/C11\.12-runtime\.test\.ts checkpoint row/.test(l)).join("\n") }).stdout.trim();
    git(["read-tree", base], envI); git(["update-index", "--cacheinfo", `100644,${blob},${HELD_PATH}`], envI);
    // CI's runner has no git identity (shard 1 on #1609): the dangling commit names its own.
    const who = { GIT_AUTHOR_NAME: "check-gate-b", GIT_AUTHOR_EMAIL: "check-gate-b@localhost", GIT_COMMITTER_NAME: "check-gate-b", GIT_COMMITTER_EMAIL: "check-gate-b@localhost" };
    const tree = git(["write-tree"], envI).stdout.trim(), made = tree ? git(["commit-tree", tree, "-p", base, "-m", "check-gate-b: a base without the checkpoint row (dangling, P-486 review m1)"], { env: { ...process.env, ...who } }) : null, noRow = made?.stdout.trim() ?? "";
    const nr = noRow ? plan({ RANGE: `${noRow}..${head}` }) : { code: -1, out: `could not build the base: ${tree ? made?.stderr.trim() : "no tree"}` };
    ok("P-486 fail (review m1): a base whose hold file lacks the row leaves C11.12-runtime.test.ts on the six, whatever the working tree says", nr.code === 0 && /^C11\.12-runtime\.test\.ts on the six\b/m.test(nr.out) && !/as qa's checkpoint rows/.test(nr.out), nr.out.slice(0, 600));
    // Review m3: off a pull request (no RANGE, as the nightly's own runs) the gate moves nothing.
    const off = plan({});
    ok("P-486 fail (review m3): off a pull request (no RANGE) every pack keeps its capability's data", off.code === 0 && /^C11\.12-runtime\.test\.ts on the six\b/m.test(off.out) && !/as qa's checkpoint rows/.test(off.out), off.out.slice(0, 600));
  } else ok(`P-486: the gate's plan needs the pinned commit ${PIN} (CI fetches the full history)`, false);
}
// D5 (P-416, 8 Nov): GATE_B_DATA_OF gives each capability its own data, so one gate run pools rows on different data.
{ const e = { GATE_B_DATA: "six", GATE_B_DATA_OF: "C4.8=checkpoint, C1.1=six C9.1=checkpoint" };
  ok("D5: GATE_B_DATA_OF names a capability's data; the rest take GATE_B_DATA", dataFor("C4.8", e) === "checkpoint" && dataFor("C1.1", e) === "six" && dataFor("C7.3", e) === "six" && dataFor("C7.3", { ...e, GATE_B_DATA: "checkpoint" }) === "checkpoint" && dataMap(e).size === 3);
  const bad = (v) => { try { dataMap({ GATE_B_DATA_OF: v }); return ""; } catch (x) { return x.message; } };
  ok("D5: a GATE_B_DATA_OF item that is not C<n.n>=six|checkpoint is refused, never run on the wrong data", /wants "C<n.n>=six\|checkpoint" items, not "C4.8=checkpont"/.test(bad("C4.8=checkpont")) && /not "C4\.8"/.test(bad("C4.8")) && /not "c4.8=six"/.test(bad("c4.8=six")), [bad("C4.8=checkpont"), bad("C4.8")]);
  ok("D5: one capability named twice with different data is refused", /twice/.test(bad("C4.8=six C4.8=checkpoint")) && bad("C4.8=six C4.8=six") === "");
  const read = (f) => (f === "C9.8.test.ts" ? "// zsh studio/tools/isolated.sh c98 4601 start && tsx studio/acceptance/C9.8.test.ts 4601 xr_studio_c98\nimport { x } from \"./lib/m3.ts\";" : "// zsh studio/tools/isolated.sh c99 4602 start && tsx studio/acceptance/C9.9.test.ts 4602 xr_studio_c99");
  const runs = [{ id: "C9.8", f: "C9.8.test.ts" }, { id: "C9.9", f: "C9.9.test.ts" }];
  const per = notTested(["C9.8", "C9.9"], runs, (id) => (id === "C9.8" ? "checkpoint" : "six"), read), one = notTested(["C9.8", "C9.9"], runs, "six", read);
  ok("D5 (review minor 5): GATE_B_NOT_TESTED=warn keeps a scheduled run's NOT TESTED a warning (works-set's pool); unset, a schedule is a re-test", modeOf({ GITHUB_EVENT_NAME: "schedule", GATE_B_NOT_TESTED: "warn" }) === "pr" && modeOf({ GITHUB_EVENT_NAME: "schedule" }) === "retest" && modeOf({ GITHUB_EVENT_NAME: "pull_request" }) === "pr");
  ok("D5: NOT TESTED reads each capability's own data (an M3-helper pack is tested on the checkpoint, fixture only on the six)", per.length === 0 && one.length === 1 && /NOT TESTED on the six: C9\.8/.test(one[0]), { per, one }); }

// D2 (P-416, 8 Nov): the packs a change touches, from the reference graph's reach (select-suites.mjs --packs).
{ const top = "x/prototype/studio", read = (f) => f === "C9.8.test.ts" ? "// zsh studio/tools/isolated.sh c98 4601 start && tsx studio/acceptance/C9.8.test.ts 4601 xr_studio_c98\nimport { x } from \"./lib/m3.ts\";"
    : f === "C9.7-b.test.ts" ? "// zsh studio/tools/isolated.sh c97 4602 start && tsx studio/acceptance/C9.7-b.test.ts 4602 xr_studio_c97" : "// zsh studio/tools/isolated.sh c99 4603 start && tsx studio/acceptance/C9.9.test.ts 4603 xr_studio_c99";
  const files = ["C9.8.test.ts", "C9.7-b.test.ts", "C9.9.test.ts", "README.md"];
  const t1 = touchedPacks(new Map([[`${top}/acceptance/C9.7-b.test.ts`, "C9.7-b.test.ts"]]), files, read, top);
  ok("D2: a changed pack file adds its capability (C9.7-b.test.ts → C9.7), and nothing else", [...t1.keys()].join() === "C9.7" && t1.get("C9.7").files.join() === "C9.7-b.test.ts", [...t1]);
  const t2 = touchedPacks(new Map([[`${top}/acceptance/lib/setup_vv_m3.ts`, "x.ts ← setup_vv_m3.ts"]]), files, read, top);
  ok("D2: a set-up script a pack's run line names (the M3 helpers' setup_vv_m3.ts) adds that pack's capability", [...t2.keys()].join() === "C9.8" && t2.get("C9.8").why === "x.ts ← setup_vv_m3.ts", [...t2]);
  const t3 = touchedPacks(new Map([[`${top}/acceptance/C9.7-b.test.ts`, "C9.7-b.test.ts"], [`${top}/acceptance/lib/setup_vv_m3.ts`, "y ← setup_vv_m3.ts"]]), files, read, top, new Set([`${top}/acceptance/C9.7-b.test.ts`]));
  ok("D2: a pack the PR changes is direct; a pack reached by reading is not", t3.get("C9.7").direct === true && t3.get("C9.8").direct === false, [...t3]);
  const st = { C1: "Partial", C2: "Works", C3: "Partial", C4: "Not built", C5: "Works (retest)", C6: "Not built" };
  const ds = diffSet(new Map([["C1", { files: ["C1.test.ts"], why: "C1.test.ts", direct: true }], ["C2", { files: ["C2.test.ts"], why: "x ← C2.test.ts", direct: false }],
    ["C3", { files: ["C3.test.ts"], why: "x ← C3.test.ts", direct: false }], ["C4", { files: ["C4.test.ts"], why: "C4.test.ts", direct: true }], ["C5", { files: ["C5.test.ts"], why: "x", direct: false }], ["C6", { files: ["C6.test.ts"], why: "x", direct: false }]]), (id) => st[id]);
  ok("D2 (review of #1337, Blocker 1): a changed pack runs if built; a pack that only reads a changed file runs only for a Works row; a Partial or Not built row reached by reading is listed, not run", ds.run.map((r) => r.id).join() === "C1,C2,C5" && ds.listed.length === 3 && ds.listed.some((l) => /^C3 \(Partial; reads a changed file\)/.test(l)) && ds.listed.some((l) => /^C4 \(Not built/.test(l)), ds);
  ok("D2: a reach that names no pack and no set-up adds nothing; README.md is never a pack", touchedPacks(new Map([[`${top}/tests/check_x.ts`, "y"]]), files, read, top).size === 0); }
{ // (4a, P-446): a checkpoint step or gate file (select-suites marks the chain "(configured checkpoint)") adds every row
  // scored on the configured checkpoint, beside the packs the graph reached; a change that reaches no checkpoint adds none.
  const reached = new Map([["s/acceptance/C6.19.test.ts", "045-form-field-gates.ts (configured checkpoint, changed) ← C6.19.test.ts"], ["s/acceptance/C2.test.ts", "x.ts ← C2.test.ts"]]);
  ok("(4a): a changed step is read from the chain; one reached on the walk adds no rows (review of #1504 round 2)", checkpointTrigger(reached) === "045-form-field-gates.ts" && checkpointTrigger(new Map([["a", "x.ts ← C2.test.ts"]])) === null
    && checkpointTrigger(new Map([["a", "routes.json ← 090-x.ts (configured checkpoint) ← C6.19.test.ts"]])) === null, checkpointTrigger(reached));
  const data = { C7: "checkpoint", C8: "six", C9: "checkpoint", C2: "checkpoint" }, dataOfId = (id) => data[id];
  const t = checkpointRows(new Map([["C2", { files: ["x.ts"], why: "x.ts ← C2.test.ts", direct: true }]]), "045-form-field-gates.ts", ["C2", "C7", "C8", "C9", "C10"], (id) => (id === "C10" ? "checkpoint" : dataOfId(id)), (id) => id !== "C10");
  ok("(4a) pass: every row on the checkpoint is added (C7, C9), read-only (not direct); fail: a six row is not (C8), nor a row with no pack (C10), and a row already touched keeps its reason (C2)",
    t.has("C7") && t.has("C9") && !t.has("C8") && !t.has("C10") && t.get("C7").direct === false && /configured checkpoint/.test(t.get("C7").why) && t.get("C2").direct === true && t.get("C2").why === "x.ts ← C2.test.ts", [...t.keys()]);
  ok("(4a) fail: no trigger adds nothing", checkpointRows(new Map(), null, ["C7"], dataOfId).size === 0); }
{ // B178 (11 Nov; jobs 130502524770 and 130506124510 named C7.5 only by the (4a) checkpoint rule): select-suites.mjs
  // --packs prints its reach (447 lines, 74 KB for QA-366's #1435 batch, C7.5.test.ts near the end) and then calls
  // process.exit(0). Node writes stdout to a pipe asynchronously on POSIX: what the pipe could not take at once is queued,
  // and process.exit drops it, so on a busy runner the list's tail was lost. The stand-in below makes that certain: one
  // 4 MB write (far past a 64 KB pipe), the C7.5 line last, then process.exit(0). gate-b must still read every line.
  const d = mkdtempSync(join(tmpdir(), "gate-b-b178-")), stub = join(d, "select-suites-stub.mjs"), rel = "ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio";
  writeFileSync(stub, `import { readFileSync } from "node:fs"; readFileSync(0);
const fill = Array.from({ length: 40000 }, (_, i) => \`${rel}/tests/filler_\${i}.ts\\tfiller.json ← filler_\${i}.ts \${"x".repeat(40)}\\n\`).join("");
process.stdout.write(fill + "${rel}/acceptance/C7.5.test.ts\\tform-field-gates.json ← m3.ts ← C7.5.test.ts\\n");
process.exit(0);
`);
  const was = process.env.GATE_B_SELECT_SUITES; process.env.GATE_B_SELECT_SUITES = stub;
  let t, err = null; try { t = packsReachedBy(["x"]); } catch (e) { err = e.message; }
  if (was === undefined) delete process.env.GATE_B_SELECT_SUITES; else process.env.GATE_B_SELECT_SUITES = was;
  rmSync(d, { recursive: true, force: true });
  ok("B178: a 4 MB reach list whose last line is C7.5's pack arrives whole (select-suites ends with process.exit): C7.5 is touched by its own pack, not only by (4a)",
    !err && t?.get("C7.5")?.files.join() === "C7.5.test.ts" && t.get("C7.5").why === "form-field-gates.json ← m3.ts ← C7.5.test.ts", err ?? [...(t ?? [])].map(([k]) => k).slice(-3)); }

// QA-366 (10 Nov): a merge-queue batch runs a named row's pack again when the batch adds a file that pack reads.
{ const st = { "C7.5": "Partial", "C6.9": "Works", "C8.3": "Partial", "C9.1": "Partial" }, T = (id, why = "form-field-gates.json ← m3.ts ← x") => [id, { files: [`${id}.test.ts`], why }];
  const caps = (...xs) => new Map(xs);
  const a = batchRecheck([{ n: 1396, caps: caps(["C7.5", [1, 2, 3]], ["C8.3", null]), touched: new Map([T("C7.5")]) }], (id) => st[id]);
  ok("QA-366: a named Partial row whose pack reads a file the batch adds runs again with its PR's steps; a named row not reached does not", [...a.run].map(([k, v]) => `${k}=${v}`).join() === "C7.5=1,2,3" && /^#1396 C7\.5\.test\.ts: form-field-gates\.json/.test(a.why.get("C7.5")), a);
  const b = batchRecheck([{ n: 1, caps: caps(["C6.9", null], ["C9.1", null]), touched: new Map([T("C6.9"), T("C9.1")]) }], (id) => st[id]);
  ok("QA-366: a named Works row is left to the protected set (job regression), never run twice", [...b.run.keys()].join() === "C9.1" && b.works.join() === "C6.9", b);
  const c = batchRecheck([{ n: 1, caps: caps(["C7.5", [1, 2]]), touched: new Map([T("C7.5")]) }, { n: 2, caps: caps(["C7.5", [2, 5]]), touched: new Map([T("C7.5")]) }], (id) => st[id]);
  const d = batchRecheck([{ n: 1, caps: caps(["C7.5", [1, 2]]), touched: new Map([T("C7.5")]) }, { n: 2, caps: caps(["C7.5", null]), touched: new Map([T("C7.5")]) }], (id) => st[id]);
  ok("QA-366: two PRs naming one row: the union of their steps; the whole pack when either names it without steps", c.run.get("C7.5").join() === "1,2,5" && d.run.get("C7.5") === null && /#1 .*; #2 /.test(c.why.get("C7.5")), [c, d]);
  const e = batchRecheck([{ n: 3, caps: caps(["C8.3", null], ["C6.9", null]), touched: null }], (id) => st[id]);
  ok("QA-366: when what the batch adds cannot be worked out (a head not found), every named row runs again but Works (fail closed)", [...e.run.keys()].join() === "C8.3" && /could not be worked out/.test(e.why.get("C8.3")), e);
  const f = batchRecheck([{ n: 4, caps: caps(), touched: new Map([T("C7.5"), T("C8.3")]) }], (id) => st[id]);
  ok("QA-366: a row nobody named never runs, whatever the batch touches (an unrelated red Partial refuses nothing; D2, STATE F15)", f.run.size === 0, f); }

// The command itself: skips, refusal and pass (packs off; the real BUGS.md is not read, so the cases stay true).
const T = mkdtempSync(join(tmpdir(), "gate-b-")), bf = join(T, "BUGS.md"); writeFileSync(bf, BUGS);
// Each command case starts from a clean CI environment: the job's own QUEUE, KIND, RANGE, PR_* and GITHUB_* values
// (a merge-queue batch sets QUEUE=true, a records PR KIND=records) would otherwise change what the gate does (#826).
const CLEAN = { GATE_B_BATCH_PRS: "", GITHUB_STEP_SUMMARY: "", PR_TITLE: "", PR_BODY: "", QUEUE: "", KIND: "code", RANGE: "", GITHUB_TOKEN: "", GATE_B_PORT: "", GATE_B_NAME: "", GATE_B_JOBS: "", GATE_B_SKIP_PACKS: "", GITHUB_EVENT_NAME: "", GATE_B_DATA: "six", GATE_B_DATA_OF: "", GATE_B_RESULTS: "", GATE_B_NO_DIFF: "" };
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
// B131 (founder 7 Nov ~15:20 IST, P-405; re-test 42357755876 on main 9dc77d1ac, data=checkpoint): C3.16 and C11.5 printed
// "packs: none for the named capabilities" then "Gate B: passed.", and C6.5 (then engine-only; since #1369 the fixture pack C99.9) "on no demo data (its run uses no server):
// exit 0", three green jobs that tested nothing on the checkpoint. A capability that ran no test on the data asked for is
// "NOT TESTED": on a pull request a warning (exit 0, never blocked); in a re-test run (nightly.yml: workflow_dispatch or
// schedule) exit 3 with "NOT TESTED: …" as the first line. A pack that runs on the asked data is unchanged.
// C11.5 is the example of a capability with no acceptance pack: C3.16 had none on main when B131 landed; #1054 adds it.
{ const PR = { GITHUB_EVENT_NAME: "pull_request" }, RETEST = { GITHUB_EVENT_NAME: "workflow_dispatch" }, CP = { GATE_B_DATA: "checkpoint" };
  const first = (o) => o.out.split("\n")[0];
  r = run(["--title", "C11.5"], { ...PR, ...CP });
  ok("B131: no pack on a pull request: exit 0, \"NOT TESTED: C11.5 has no acceptance pack\" and a ::warning:: annotation, never \"Gate B: passed.\" alone", r.code === 0 && /^NOT TESTED: C11\.5 has no acceptance pack$/m.test(r.out) && /^::warning title=Gate B NOT TESTED::C11\.5 has no acceptance pack$/m.test(r.out) && !/^Gate B: passed\.$/m.test(r.out), r);
  r = run(["--title", "C11.5"], { ...PR, ...CP, GITHUB_EVENT_NAME: "merge_group" });
  ok("B131: no pack in a merge-queue run: exit 0 with the warning (a merge-queue run is a PR check)", r.code === 0 && /^::warning title=Gate B NOT TESTED::C11\.5/m.test(r.out), r);
  { const sf = join(T, "summary.md"); writeFileSync(sf, ""); r = run(["--title", "C11.5"], { ...PR, ...CP, GITHUB_STEP_SUMMARY: sf });
    ok("B131: the NOT TESTED line is in the step summary", /^NOT TESTED: C11\.5 has no acceptance pack$/m.test(readFileSync(sf, "utf8")), readFileSync(sf, "utf8")); }
  for (const ev of ["workflow_dispatch", "schedule"]) {
    r = run(["--title", "C11.5"], { ...CP, GITHUB_EVENT_NAME: ev });
    ok(`B131: no pack in a re-test run (${ev}): exit 3 (not 0, 1 or 2), first line "NOT TESTED: C11.5 has no acceptance pack"`, r.code === 3 && first(r) === "NOT TESTED: C11.5 has no acceptance pack" && !/^Gate B: passed\.$/m.test(r.out), r);
  }
  const NS = { GATE_B_ACCEPTANCE: (() => { const d = join(T, "acc-no-server"); mkdirSync(d, { recursive: true }); writeFileSync(join(d, NO_SERVER.file), NO_SERVER.text); return d; })() };
  r = run(["--title", NO_SERVER.id], { ...RETEST, ...CP, ...NS });
  ok("B131: a no-server pack (a fixture pack, --engine) in a re-test on the checkpoint: exit 3, \"NOT TESTED on the checkpoint: C99.9 …no demo data…\" first", r.code === 3 && /^NOT TESTED on the checkpoint: C99\.9 C99\.9\.test\.ts runs on no demo data \(its run uses no server\)$/.test(first(r)), r);
  r = run(["--title", "C7.5"], { ...RETEST, GATE_B_DATA: "six" });
  ok("B131: a fixture-only pack (C7.5 on the six) in a re-test: exit 3, \"NOT TESTED on the six: C7.5 … fixture only\" first", r.code === 3 && /^NOT TESTED on the six: C7\.5 C7\.5\.test\.ts runs fixture only\b/.test(first(r)), r);
  r = run(["--title", NO_SERVER.id], { ...PR, ...CP, ...NS });
  ok("B131: the same no-server pack on a pull request: exit 0 with the NOT TESTED line and the warning", r.code === 0 && /^NOT TESTED on the checkpoint: C99\.9 /m.test(r.out) && /^::warning title=Gate B NOT TESTED::/m.test(r.out), r);
  const a = run(["--title", "C6.9"], { ...RETEST, ...CP }), b = run(["--title", "C6.9"], CP);
  ok("B131: a normal pack on the checkpoint in a re-test is unchanged: exit 0, \"Gate B: passed.\", no NOT TESTED line, the same output as before", a.code === 0 && /^Gate B: passed\.$/m.test(a.out) && !/NOT TESTED|::warning/.test(a.out) && a.out === b.out, [a, b]);
  r = run(["--title", "C6.9 C11.5"], { ...RETEST, ...CP });
  ok("B131: one capability tested and one not, in a re-test: exit 3, first line names the untested one", r.code === 3 && first(r) === "NOT TESTED: C11.5 has no acceptance pack" && /packs: C6\.9\.test\.ts$/m.test(r.out), r);
  r = run(["--title", "forms: C11.13 reason", "--body", "Claims Works: C11.5, C11.13"], { ...RETEST, ...CP });
  ok("B131: a refusal still exits 1 when a capability is also NOT TESTED (exits 1 and 2 keep their meaning)", r.code === 1 && /QA-192/.test(r.out) && /^NOT TESTED: C11\.5/m.test(r.out), r);
  r = run(["--title", "infra: faster suites"], RETEST);
  ok("B131: naming no capability is still a skip, exit 0, in a re-test run too", r.code === 0 && /names no capability/.test(r.out), r); }
r = run(["--title", "x", "--bogus"]);
ok("command: an unknown option exits 2", r.code === 2, r);
{ const b = run(["--title", "screens: x"], { RANGE: "0000000..1111111", GATE_B_NO_DIFF: "1" });
  ok("D2: GATE_B_NO_DIFF (works-set's runs) never reads the diff: no capability named, skipped", b.code === 0 && /skipped \(the PR names no capability/.test(b.out), b);
  const g0 = run(["--title", "x", "--diff-groups", "5"], { RANGE: "" }), gq = run(["--title", "x", "--diff-groups", "5"], { RANGE: "0000000..1111111", QUEUE: "true" }), gn = run(["--title", "x", "--diff-groups", "5", "--kind", "records"], { RANGE: "0000000..1111111" });
  ok("D2: --diff-groups prints only [] with no pull-request range, for a batch and for a change that is not code", [g0, gq, gn].every((x) => x.code === 0 && x.out.trim() === "[]"), [g0, gq, gn]);
  const gb = run(["--title", "x", "--diff-groups", "5"], { RANGE: "0000000..1111111" });
  ok("D2: --diff-groups with a range it cannot read is could-not-run (exit 2), never []", gb.code === 2 && !/^\[/.test(gb.out.trim()), gb);
  const q = run(["--title", "Merge queue: embarking #1 together"], { RANGE: "0000000..1111111", QUEUE: "true" });
  ok("D2: a merge-queue batch never reads the pull request's diff (no \"by diff\" set; QA-366's re-check is below)", !/by diff/.test(q.out) && !/git diff/.test(q.out), q);
  const n = run(["--title", "screens: x"], { RANGE: "0000000..1111111" });
  ok("D2: on a pull request a diff it cannot read is \"could not run\" (exit 2), never a silent skip", n.code === 2 && /could not run: (git diff 0000000\.\.\.1111111 failed|cannot read .* at the base 0000000)/.test(n.out), n); }
// QA-366 on the real commits, as batches (the members come from git's first-parent merges, review of #1476 Major 2):
// #1396 (C7.5's paid result) checked alone on main 1d07807c8; it merged as 0e0ccbb64 onto 7e32ee210, #1435's merge, which
// gated IMM 5257 boxes C7.5's pack reads (form-field-gates.json ← m3.ts). 7e32ee210..0e0ccbb64 is that batch; from
// b56cdbe39 it is a car with #1435 stacked ahead and left out of the title (Mergify names only the car's own PRs). Both
// must run C7.5 again on the checkpoint. #1459 (qa records with scripts: kind records, no gate B of its own) merged as
// 2cfdad96: its named rows are not re-checked (Major 1). Skipped in a copy without that history (a shallow clone).
{ const git = (...a) => spawnSync("git", a, { cwd: HERE, encoding: "utf8" }), have = (...c) => c.every((x) => !git("cat-file", "-e", `${x}^{commit}`).status);
  const M1396 = "0e0ccbb64e22593e45647879fcacd61edf091358", M1435 = "7e32ee210541825ee3d3e4f941698091f8485377", B1435 = "b56cdbe391c7741915c4684ba287cfee62505f52", M1459 = "2cfdad961a2bd8e081ecafd54cb8b4a83e597723", B1459 = "751310cdb1a70cc6adf5dd8d1c7fdd818ac481e4";
  if (!have(M1396, M1435, B1435, M1459, B1459)) console.log("SKIP  QA-366 replays: main's 9-10 Nov merges are not in this copy (shallow clone)");
  else {
    const pf = join(T, "batch.json"), Q = { QUEUE: "true", GATE_B_BATCH_PRS: pf, GATE_B_DATA: "" }, prs = (x) => writeFileSync(pf, JSON.stringify(x));
    const P1396 = { n: 1396, title: "lead: C7.5 paid result", body: "Capabilities: C7.5 (steps 1-16)" }, again = /QA-366: the batch adds files these named rows' packs read, so they run again: C7\.5 \(#1396 C7\.5\.test\.ts/;
    prs([P1396]);
    const q1 = run(["--title", "merge queue: embarking #1396"], { ...Q, RANGE: `${M1435}..${M1396}` });
    ok("QA-366: the batch of #1396 on #1435's main runs C7.5 again, with #1396's steps, on the checkpoint (exit 0 with --no-packs)", q1.code === 0 && again.test(q1.out) && /C7\.5 on the checkpoint/.test(q1.out) && /packs: C7\.5\.test\.ts$/m.test(q1.out) && /steps 1, 2, 3/.test(q1.out), q1);
    const q2 = run(["--title", "merge queue: checking #1396 on main, stacked on 1 pull request ahead"], { ...Q, RANGE: `${B1435}..${M1396}` });
    ok("QA-366 (Major 2): #1435 stacked ahead and not in the title still counts: C7.5 runs again", q2.code === 0 && again.test(q2.out), q2);
    prs([{ n: 1459, title: "qa: capability C8.3 after #1440", body: "" }]);
    const q3 = run(["--title", "merge queue: embarking #1459"], { ...Q, RANGE: `${B1459}..${M1459}` });
    ok("QA-366 (Major 1): a PR whose own change is records (its gate B never ran) has its named rows not re-checked, and says so", q3.code === 0 && /#1459 names C8\.3, not re-checked: its own change is records/.test(q3.out) && !/packs:/.test(q3.out), q3);
    prs([{ n: 9999, title: "runtime: C7.5", body: "" }]);
    const q4 = run(["--title", "merge queue: embarking #9999"], { ...Q, RANGE: `${M1435}..${M1396}` });
    ok("QA-366: a title PR with no merge in the batch's history runs its named rows (fail closed)", q4.code === 0 && /C7\.5 \(#9999: its merge is not in the batch's history/.test(q4.out) && /packs: C7\.5\.test\.ts$/m.test(q4.out), q4);
    prs([{ n: 1396, title: "lead: paid result", body: "" }]);
    const q5 = run(["--title", "merge queue: embarking #1396"], { ...Q, RANGE: `${M1435}..${M1396}` });
    ok("QA-366: a batch whose PRs name no capability runs nothing again", q5.code === 0 && /no named row's pack reads a file/.test(q5.out) && !/packs:/.test(q5.out), q5);
    prs([P1396]);
    const q6 = run(["--title", "merge queue: embarking #1396"], { ...Q, RANGE: "" });
    ok("QA-366: a batch without RANGE could not run (exit 2), never a silent pass", q6.code === 2 && /needs RANGE/.test(q6.out), q6);
  } }
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
