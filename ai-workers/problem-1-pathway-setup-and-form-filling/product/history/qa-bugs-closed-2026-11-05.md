# qa findings closed on 5 Nov 2026 (moved word for word from `qa/BUGS.md` and `qa/reports/bugs-open-detail.md`, AGENTS.md rule 8)

## QA-225 — closed 5 Nov 2026 (after-merge batch 14)

Closed by the qa lane on main **1c71c9894** (fixed by #948; C6.1, C8.1). `api/src/case-feed.ts` now lists "sign step" and "signed scan" (and "case document", "checklist line", the assessments) as case entities, so a firm's staff read only their own firm's case lines. qa re-ran on main's head: `tests/check_case_feed.ts` exit 0, 25/25 (a sweep of every audit write: each entity is on one list, every line naming a case uses a case entity); `tests/check_c81_signing_api.ts` on a fresh isolated copy (qa_c61) exit 0, 13/13, including "the firm's own officer reads this case's sign and scan lines" (200, 3 lines) and "another firm's staff (user-S) never read this case's sign or scan lines" (200, `[]`). Output `qa/reports/2026-11-05-after-merge/c81-signing-api-1c71c9894.txt`.

From `qa/BUGS.md`:

| QA-225 | Bug · Major (the tech lead, from the C8.2 builder on #924; confirmed in code by qa on main) | C6.1, C8.1 · C6.11 review Major 1 (firm staff read only their own firm's case lines), PRODUCT privacy | main e840d2d88 | The activity feed hides another firm's case lines only for the audit entities in `CASE_ENTITIES` (`api/src/studio.ts:1223`, `:1234`). `api/src/sign-steps.ts:100` writes "sign step" and `:127` writes "signed scan"; neither is in the set, so both are treated as configuration lines and reach every firm's staff, naming the form, the signer and the case id (e.g. "Case officer marked IMM 5476 'Signed by hand' on case 3185450e" seen by user-S of the other firm). Expected: both entities are case entities, with a check that another firm's user cannot see the line while the case's firm still does | runtime (fix lane, Lead 7) | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-225 | Bug · Major (the tech lead, from the C8.2 builder on #924; confirmed in code by qa on main) | C6.1, C8.1 · C6.11 review Major 1 (firm staff read only their own firm's case lines), PRODUCT privacy | main e840d2d88 | The activity feed hides another firm's case lines only for the audit entities in `CASE_ENTITIES` (`api/src/studio.ts:1223`, `:1234`). `api/src/sign-steps.ts:100` writes "sign step" and `:127` writes "signed scan"; neither is in the set, so both are treated as configuration lines and reach every firm's staff, naming the form, the signer and the case id (e.g. "Case officer marked IMM 5476 'Signed by hand' on case 3185450e" seen by user-S of the other firm). Expected: both entities are case entities, with a check that another firm's user cannot see the line while the case's firm still does | runtime (fix lane, Lead 7) | Open |

## QA-206 — closed 5 Nov 2026 (after-merge batch 15)

Closed by the qa lane on main **40aa80377** (fixed by #883). On a fresh copy of main's head: `tests/check_forms_qa206_section_headings.ts` exit 0, 44/44, and `tests/check_forms_qa206_name_browser.cjs` exit 0, 13/13 (sections are named from the form's printed headings). `acceptance/C3.4.test.ts` on the six on GitHub on main's head: exit 0, 20/20 (run 41899424319). C4.1 stays Partial: QA-221 (Major) still holds it. Output `qa/reports/2026-11-05-after-merge/c34-fix-checks-40aa80377.txt`.

From `qa/BUGS.md`:

| QA-206 | Gap · Major (reported by Builder 8 through the tech lead, 4 Nov ~08:45 IST; qa confirmed in code) | C3.4, C4.1 · P-158 (sections from sources), PRODUCT §4 (plain words) | main 0932558ff (code read) | The C3.4 rules pass (no AI, US$0) names each proposed section after the PDF's internal part name (`api/src/form-masters.ts` `words()`: "Table1", "Page wrapper", and IMM 5475's "Five" and "Seven" kept on purpose for a person to rename). Once accepted unrenamed, a client sees these names as questionnaire sections. Expected: the printed heading the boxes sit under ("Your visit", …), or the proposal says the name must be changed before Accept. Not yet walked on a screen by qa: the checkpoint on main does not call the rules pass (#798 slice 1 makes it do so) | Builder 2 (forms) | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-206 | Gap · Major (reported by Builder 8 through the tech lead, 4 Nov ~08:45 IST; qa confirmed in code) | C3.4, C4.1 · P-158 (sections from sources), PRODUCT §4 (plain words) | main 0932558ff (code read) | The C3.4 rules pass (no AI, US$0) names each proposed section after the PDF's internal part name (`api/src/form-masters.ts` `words()`: "Table1", "Page wrapper", and IMM 5475's "Five" and "Seven" kept on purpose for a person to rename). Once accepted unrenamed, a client sees these names as questionnaire sections. Expected: the printed heading the boxes sit under ("Your visit", …), or the proposal says the name must be changed before Accept. Not yet walked on a screen by qa: the checkpoint on main does not call the rules pass (#798 slice 1 makes it do so) | Builder 2 (forms) | Open |


## QA-218 — closed 5 Nov 2026 (after-merge batch 15)

Closed by the qa lane on main **40aa80377** (fixed by #929). `tests/check_forms_qa218_saved_masters_browser.cjs` on a fresh copy: exit 0, 22/22 (the AI masters run is offered as "Saved · US$0" on the screen and replays on a click). C3.4's pack 20/20 on the six (run 41899424319). Output `qa/reports/2026-11-05-after-merge/c34-fix-checks-40aa80377.txt`.

From `qa/BUGS.md`:

| QA-218 | Gap · Major (qa tester 2, C3.4 verdict, #874) | C3.4 · P-138 (a saved draft replays at US$0, started on a click), P-322 (counts at the step a user meets it) | main 4c3b16f0e (qa2 C3.4 verdict) | Demo › Reset to the six › Visitor visa: the only masters control is "Forms: sections and answer lists › Draft sections and lists · US$0", which runs the rules pass (`ai-launch.tsx:156` posts `{mode:"rules"}`). No screen offers Saved (replay) of the AI masters run, though #771 committed it for IMM 5257 (09-2023) and guide 5256. Expected: "Saved · US$0" next to each form and guide that has a saved masters run, as for checklists (`ai-launch.tsx:140`), with Live greyed and its cost while the switch is off. Actual: AI-drafted form checks, document types and guide checks reach To review only through `POST /attachments/:id/draft-masters {mode:"replay"}` | no owner yet (a cloud lane at the founder's next turn) (Lead 5, 4 Nov ~16:50 IST) | forms (C3.4) |

From `qa/reports/bugs-open-detail.md`:

| QA-218 | Gap · Major (qa tester 2, C3.4 verdict, #874) | C3.4 · P-138 (a saved draft replays at US$0, started on a click), P-322 (counts at the step a user meets it) | main 4c3b16f0e (qa2 C3.4 verdict) | Demo › Reset to the six › Visitor visa: the only masters control is "Forms: sections and answer lists › Draft sections and lists · US$0", which runs the rules pass (`ai-launch.tsx:156` posts `{mode:"rules"}`). No screen offers Saved (replay) of the AI masters run, though #771 committed it for IMM 5257 (09-2023) and guide 5256. Expected: "Saved · US$0" next to each form and guide that has a saved masters run, as for checklists (`ai-launch.tsx:140`), with Live greyed and its cost while the switch is off. Actual: AI-drafted form checks, document types and guide checks reach To review only through `POST /attachments/:id/draft-masters {mode:"replay"}` | no owner yet (a cloud lane at the founder's next turn) (Lead 5, 4 Nov ~16:50 IST) | forms (C3.4) |


## QA-208 — closed 5 Nov 2026 (after-merge batch 15)

Closed by the qa lane on main **40aa80377** (fixed by #982: the check's keep-alive socket). `tests/check_forms_c34_ai.ts` on two fresh copies one after the other on this Mac: exit 0, 87/87 both times (it stopped at 64/65 with "connection reset" before). Output `qa/reports/2026-11-05-after-merge/c34-fix-checks-40aa80377.txt`.

From `qa/BUGS.md`:

| QA-208 | Bug · Major (merge flow: a flaky suite can throw away a whole merge batch; tech lead, 4 Nov ~09:40 IST) | C3.4 (check) · P-291 (suites green on fresh copies) | merge base of #802 (Builder 7's Mac, every changed file restored; reported on #802) | Flaky on main: `tests/check_forms_c34_ai.ts` stops at 64/65 with a connection reset after four stub launches, on main's code. No CI run id found: it is not in the last 15 failed GitHub runs (qa search, 4 Nov ~09:40 IST), and GitHub's machines passed it on #802. Seen on a loaded Mac only so far. Expected: the check retries or waits for its stub launcher, and fails only for a real fault | forms (C3.4 tests) | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-208 | Bug · Major (merge flow: a flaky suite can throw away a whole merge batch; tech lead, 4 Nov ~09:40 IST) | C3.4 (check) · P-291 (suites green on fresh copies) | merge base of #802 (Builder 7's Mac, every changed file restored; reported on #802) | Flaky on main: `tests/check_forms_c34_ai.ts` stops at 64/65 with a connection reset after four stub launches, on main's code. No CI run id found: it is not in the last 15 failed GitHub runs (qa search, 4 Nov ~09:40 IST), and GitHub's machines passed it on #802. Seen on a loaded Mac only so far. Expected: the check retries or waits for its stub launcher, and fails only for a real fault | forms (C3.4 tests) | Open |


## QA-209 — closed 5 Nov 2026 (after-merge batch 15)

Closed by the qa lane on main **40aa80377** (fixed by #982: the 30 s setup limit). `tests/check_forms_c34_masters_browser.cjs` on a fresh copy: exit 0, 9/9. Output `qa/reports/2026-11-05-after-merge/c34-fix-checks-40aa80377.txt`.

From `qa/BUGS.md`:

| QA-209 | Bug · Major (merge flow, as QA-208; tech lead, 4 Nov ~09:40 IST) | C3.4 (check) · P-291 | merge base of #802 (Builder 7's Mac; reported on #802) | Flaky on main: `tests/check_forms_c34_masters_browser.cjs` times out at 30 s on its setup's demo load, before any page opens. The same 30 s limit failed qa's `check_c91_impact_browser.cjs` twice on this Mac on 4 Nov (Load sample took 106 s at load average 18; report 2026-11-04-after-merge, batch 2), while CI passed both. No CI run id found (last 15 failed GitHub runs searched). Expected: browser checks' setup requests wait as long as the load really takes (Load sample 80–180 s on a loaded Mac), not 30 s | forms (C3.4 tests), and every browser check with a 30 s setup request | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-209 | Bug · Major (merge flow, as QA-208; tech lead, 4 Nov ~09:40 IST) | C3.4 (check) · P-291 | merge base of #802 (Builder 7's Mac; reported on #802) | Flaky on main: `tests/check_forms_c34_masters_browser.cjs` times out at 30 s on its setup's demo load, before any page opens. The same 30 s limit failed qa's `check_c91_impact_browser.cjs` twice on this Mac on 4 Nov (Load sample took 106 s at load average 18; report 2026-11-04-after-merge, batch 2), while CI passed both. No CI run id found (last 15 failed GitHub runs searched). Expected: browser checks' setup requests wait as long as the load really takes (Load sample 80–180 s on a loaded Mac), not 30 s | forms (C3.4 tests), and every browser check with a 30 s setup request | Open |

