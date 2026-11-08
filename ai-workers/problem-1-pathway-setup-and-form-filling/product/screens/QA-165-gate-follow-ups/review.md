# Review: QA-165 gate follow-ups and readiness over empty boxes (#1318, commit bc9080638)

Reviewer: an independent session; I did not build this. It is a fix row (C7.2, C7.3), not a new screen. I reviewed the changed behaviour and its one visible change, the IMM 5257 forms card and Ready to file lines. Ports 4456 to 4459 only. Live AI was off (US$0). Note: while I worked, the builder pushed ce03a7e74 (tests only: `check_b52_own_yes_no.ts`, `check_c72_imm5257_fill.ts`). I did not review it. The product code is the same as at bc9080638.

## What I ran
- `tests/check_qa165_gate_follow_ups.ts`: 15/15. Mutations in a scratch copy: removing `formHoldsBack`, its fix part, its empty-box part, or `followUpGround`'s check each turns 2 to 3 checks red. Good.
- Pure suites, all green: `check_qa165_mandatory` 40/40, `check_qa165_form_validation` 30/30, `check_c76_readiness` 77/77, `check_forms_b86_fill` 35/35, `check_forms_b88_fill` 34/34, `check_contract_seams` 107/0. `graph.mjs --check` passes.
- Each on its own copy: `check_c82_record_api` 71/71 and `check_c76_readiness_api` 23/23. **`check_c72_imm5257_fill` failed 54/56 at bc9080638**: "setup: … IMM 5257 is ready to file" and "… still ready to file".
- Fresh configured checkpoint (rv165 :4456, load 112 s, all 5 combinations released):
  - C7.3 pack: 14/14.
  - C7.2 pack: 2/10. The other 8 need the Mac's Adobe evidence, or IMM 5257 is filed Online in release 2. That is pack debt already recorded for main, not caused by this PR.
- qa's 46-box count (qa's own script, Sample family plus spouse, the three gates answered No by the client): **44/46 written**. The 3 gate boxes are written "N" (read from the PDF). Citizenship, place of birth, native language and the Employment row are now written. The 2 empty boxes (Taiwan PIN, Israel passport) are both listed by readiness.
- Browser walk at 1440 px (client, then officer): see `journey-test-reviewer-2026-11-08.md`.

## Answers to the tech lead's points
1. **Step 230 and "Hiding a value a form reads": sound and grounded.**
   - 52 B86 confirmations and 9 B88 asks, across IMM 0008, 0008 DEP, 1294, 1344, 5257 and 5710. I read each change's `rawWords` in `library_change`. Every one names the indicator of the same block: "Only when natIDIndicator = Y", "only when AliasNameIndicator = Y", "uslprIndicator = Y" and so on. None names another question.
   - The validate rule makes this step necessary: the library questions are shared.
   - Gap: `confirmReaders` ignores the door's own `warning`, which is set when a field's words name another decider (`230-own-yes-no-follow-ups.ts:186-191`). Today's data has no such row; a future map could have one, and it would be confirmed blindly. Minor 2.
   - IMM 1344's co-signer fields say "co-signer = Y and … AliasNameIndicator = Y". The step confirms only the second part. That is acceptable, because the field is about the co-signer.
2. **Listing every empty mandatory box in readiness, given that lock needs readiness: right in principle (P-71, B116), wrong in two places.** See Major 1 and Major 2.
3. **Prepare, GET …/forms and lock agree.** All three build readiness from `onFormOf`.
   - Measured on one case: forms and prepare list the same 2 (IMM 5257) and 5 (IMM 5257 SCH1) lines.
   - Lock of the SCH1 copy returned 409.
   - Only GET …/forms is tested; nothing tests lock or prepare (Major 3).
4. **Regressions in other forms: yes.**
   - On the configured checkpoint, IMM 5257 SCH1 (PDF upload) was ready before this change. Now it is never ready, and its copy can never be locked, for every case. Its 5 empty boxes are military, war crimes Q5, membership Q6, government position, and previous travel.
   - 4 of those 5 are real product gaps (B116). The wording and the lock dead end are Major 2.
   - IMM 5476 and IMM 5645 are unchanged: ready, with 0 lines.
   - Stage 1 (`prepare.stage1.to_confirm`) now counts empty boxes as facts to confirm: 7 on a case with no unconfirmed fact. That count is not shown on screen (Minor 3).

## Issues (ranked)
- **Blocker 1: a suite is red at the reviewed commit.**
  - `check_c72_imm5257_fill.ts` fails 2 checks at bc9080638.
  - ce03a7e74 rewrites those checks and `check_b52_own_yes_no.ts`, and it needs its own review.
  - Its new `check_c72` line asserts that the Sample family's IMM 5257 is **not** ready over the 3 "not a fact" boxes. That writes Major 1 into a test.
- **Major 1: false "not ready" over boxes IMM 5257 itself does not require.**
  - The form's own script (page 2, Passport Question 2, "CR 330212", `prototype/expected/source-text/imm5257e.xfa-template.txt`) enables TaiwanPIN and marks it required only when the passport country is "203". It does the same for IsraelPassportIndicator only on "206". For any other country it runs `markUnRequired` on both.
  - The Sample passport is "205" (read from the copy). The case still shows "2 facts to answer or confirm before filing" and a CRITICAL line on Ready to file, which must be passed with a reason on every IMM 5257 filing.
  - On a release where IMM 5257 is a PDF upload, the copy can never be locked: readiness reads the inventory's fixed `required`, not the form's own condition.
  - Fix (Must): a box whose requirement the form makes conditional must not hold readiness back unless its condition holds for this case. Read the condition from the form, not from a constant. Otherwise, the tech lead rules that `not_a_fact` ("fill it in Adobe if the form asks for it") boxes are listed but never block.
  - Add a fail test with a "205" passport and a pass test with "203".
- **Major 2: lock and the card send the officer to a dead end, in the wrong words.**
  - Lock refuses with "5 facts to answer or confirm before filing: do that, then generate a new copy" (`contracts/runtime.ts:271`, `fill-case.ts:363`).
  - The card's pill and its list say "Facts to answer or confirm (2)" (`web/src/runtime/forms.tsx:146,155`).
  - These are form fields that no question asks, or that are filled by hand. Nothing on any screen can answer them, and making a new copy changes nothing.
  - The same lines appear twice on the card: under "Facts to answer or confirm" and again under "Marked mandatory on IRCC's form, still empty" (screenshot `10-officer-imm5257-card-1440.png`).
  - Fix (Must): give "left empty on the form" lines their own words in the pill, the list and the 409. Say which form fields are left empty and why, and what unblocks them. List each line once.
- **Major 3: the new lock and prepare paths have no test.**
  - The new check calls `readiness` directly. Dropping `onFormOf` from `lock` (`fill-case.ts:363`) or from `formReady` (`case-prepare.ts:256-259`) turns no test red.
  - Fix (Must): one API test. A copy with a mandatory box left empty is refused at lock (409) and named on prepare; the same copy with the box written locks.
- **Minor 1:** the PR body is still the draft. It has no checks, no section B wording, no walk and no questions. Brief item 4 asks for the wording in the PR. I checked the builder's quotes against the form's text, and they are right: "For this trip, will you use a passport issued by the Ministry of Foreign Affairs in Taiwan that includes your personal identification number?" and "For this trip, will you use a National Israeli passport?".
- **Minor 2:** `confirmReaders` should skip, and report as refused, any row that carries the door's `warning` (point 1).
- **Minor 3:** `stage1.to_confirm` counts "left empty on the form" lines as facts (`case-prepare.ts:443`). Count facts only.
- **Minor 4:** the Taiwan and Israel lines still show another question's words, "Question 1d. Have you taken a test … English or French?", now also on Ready to file. The cause is pre-existing in the map's caption. With the cited words now known, the forms lane can fix the label.

## Scores (fix row: the changed behaviour only)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | Partly | The 3 gates write N and 44/46 boxes are written; Major 1 is a false not-ready |
| D2 Data integrity | Met | No "SAMPLE" left in a list box; one placement version per follow-up |
| D4 Rule integrity | Met | The release validates in all 5 combinations; conditions are grounded (point 1) |
| D5 Stability and recovery | Not met | Lock dead end (Major 2) |
| D9 Flow | Partly | No next step for a box no question asks |
| D10 Language | Partly | "facts" used for form fields; wrong caption (Minor 4) |
| D11 Feedback and state | Partly | Duplicate lists; false not-ready |
| D13 Accessibility | Met | axe 0 violations on the Forms tab; no sideways scroll at 1440, 1024 or 400 px; No chosen by keyboard |
| D15 Speed | Met | prepare 0.33-0.65 s, forms 0.17-0.24 s |
| D16 Testability | Partly | Rules have pass and fail tests; lock and prepare do not (Major 3) |
| D18 Provenance | Met | Conditions are "Sample, Unconfirmed: expert" with the field's own words |
| D3, D6-D8, D12, D14, D19 | N/A | Not changed by this row |
| D17, D20 | Simulated only | No intended user walked it |

BIC (§6, case-side): BIC-04 Met (on No, the details are not asked). BIC-12 Partly (the check before filing lists boxes the form does not require). BIC-13 Not met (the lock error does not say how to fix). BIC-19 Partly (the same lines twice on one card). BIC-20 Met. The other BIC checks are N/A for this row.

## Not checked
- An intended user's unaided walk (D17, D20).
- A real screen reader.
- The Mac's Adobe Validate. I relied on the form's own script for which boxes it requires.
- ce03a7e74, and `check_b52_own_yes_no` at either commit.
- The full `run-suites.sh --changed`.

**Verdict: Block** (commit bc9080638). To fix: Blocker 1 (suites green on the new head, without enshrining Major 1), Major 1, Major 2, Major 3. Fix the Minors or list them in the PR.
