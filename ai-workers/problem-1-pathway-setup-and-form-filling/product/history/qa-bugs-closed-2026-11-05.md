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

## QA-231 — closed 5 Nov 2026 (after-merge batch 17)

Closed by the qa lane on main **8b4b1b881** (fixed by #978, with qa's K1 pack change #981). `acceptance/C9.1.test.ts` on the configured checkpoint on GitHub on main's head: exit 0, **17/17** (run 41919519444). The impact now lists the touched components in words (Components touched (24): 21 sections and 3 rules, each with its combination and the changed form field), K1 counts the form-box lines and names the two answer-key Demo warnings exactly, and the checkpoint holds the Sample family case SAMPLE-VV-FAMILY-1 on Visitor visa's release 1 (P-67). qa's gate A walk on #978's head at 1440 px (4 Nov ~23:50 IST).

From `qa/BUGS.md`:

| QA-231 | Gap · Major | C9.1 · P-32 (impact on components), K1, P-67 (open cases stay on their release) | main 0ced96dda (qa lane, checkpoint run 41866496356) | On the configured checkpoint C9.1 reaches 14/17. Three steps are not met: the impact lists no touched component with its reason and combination (`components` empty); after all 23 new or reworded IMM 5476 boxes are decided, 2 IMM 5476 problems are left on the Visitor visa; and the checkpoint has no Visitor visa case with forms, so "the case stays on its release" (P-67) cannot be shown | the tech lead assigns (forms / runtime) | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-231 | Gap · Major (qa lane, C9.1 re-score after #886) | C9.1 · P-32, K1 (check_screen02_slice2.ts), P-67, SA-1-32 | main 0ced96dda (GitHub checkpoint run 41866496356: exit 1, 14/17; one Mac copy qa_c91: exit 1, 13/17) | Steps: blank copy, Demo › Load the configured checkpoint, then `acceptance/C9.1.test.ts`. Row 17 now works (IMM 5476 11-2025 held over 2021, saved AI run at US$0, 8 proposals read by both rounds, BR-12 comparison 30 · 7 · 16 · 6, ledger unchanged). Red: (1) P-32 "each component touched says why in words (which box changed) and in which combination": `components.sections/document_types/rules/checks` are all empty (`[]`). Either the impact does not compute them, or nothing on the checkpoint is touched; if the second, the pack needs a component the 2021 → 2025 change touches (question for the tech lead). (2) K1: after the author decides all 23 new and reworded boxes, 2 IMM 5476 problems are still left on the Visitor visa's draft (`{"decided":23,"left":2}`). On the Mac run only, the step before it also failed: the problem names a raw form-field path (`IMM_5476[0].Page1[0].RadioButtonList[0]`), as QA-203. (3) P-67: no Visitor visa case with form instances exists on the checkpoint, so "the family case stays on its release while the new edition waits" has nothing to show. Expected: all three met on the checkpoint built by the product's own steps (P-322). Evidence `qa/reports/2026-11-04-after-merge/c91-checkpoint-0ced96dda.txt` | the tech lead assigns (forms for 1–2; runtime or demo for 3) | Open |

## QA-221 — closed 5 Nov 2026 (after-merge batch 20)

Closed by the qa lane on main **c5608bb37** (fixed by #973: IMM 5257 SCH1's line names its own people, "principal_partner_adult_children", from 18, per its p. 1 words). `acceptance/C4.1.test.ts` on GitHub on main's head: exit 0, 25/25 on the six (run 41937658470) and 25/25 on the configured checkpoint (run 41937673811), including C4.1-Q221a–g: the line names whom SCH1 names; the Child loses SCH1's questions once SCH1 has its own who; a child of 10 does not fill SCH1, a child of 19 and the spouse do; a principal of 16 still does.

From `qa/BUGS.md`:

| QA-221 | Bug · Major (qa tester 3, C4.1 verdict, #914; qa lane keeps Major: a client is asked another form's questions for a baby, against the form's own words) | C4.1, C10.1 · P-322, IMM 5257 SCH1 (09-2023) p. 1 "dependent children aged 18 years or older … must complete their own copy" | main 0e5f86308 (qa3, after #798) | A blank copy › Demo › Load the configured checkpoint › Visitor visa › Smart questionnaire › Child (travelling), 0–4. Expected: no Schedule 1 question for a child under 18. Actual: the child is asked 24 facts only IMM 5257 SCH1 needs ("Positions section", "Organization section", "Military serviceheader", "Previous travel section" …), because the checkpoint's SCH1 line is "Combination mandatory, each applicant" with no age rule. (Whether SCH1 is needed at all only after a background "yes" is the RCIC walk's [04], B51.) Evidence: `verdicts/2026-11-04-C4.1/q144-child-0-4-112-questions.jpg`, fact-sources count in this verdict | runtime (demo.ts VV_FORM_RULES; QA-144 slice 2) | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-221 | Bug · Major (qa tester 3, C4.1 verdict, #914; qa lane keeps Major: a client is asked another form's questions for a baby, against the form's own words) | C4.1, C10.1 · P-322, IMM 5257 SCH1 (09-2023) p. 1 "dependent children aged 18 years or older … must complete their own copy" | main 0e5f86308 (qa3, after #798) | A blank copy › Demo › Load the configured checkpoint › Visitor visa › Smart questionnaire › Child (travelling), 0–4. Expected: no Schedule 1 question for a child under 18. Actual: the child is asked 24 facts only IMM 5257 SCH1 needs ("Positions section", "Organization section", "Military serviceheader", "Previous travel section" …), because the checkpoint's SCH1 line is "Combination mandatory, each applicant" with no age rule. (Whether SCH1 is needed at all only after a background "yes" is the RCIC walk's [04], B51.) Evidence: `verdicts/2026-11-04-C4.1/q144-child-0-4-112-questions.jpg`, fact-sources count in this verdict | runtime (demo.ts VV_FORM_RULES; QA-144 slice 2) | Open |
