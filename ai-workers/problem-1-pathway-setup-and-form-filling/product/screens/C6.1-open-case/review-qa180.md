# Review: QA-180 (Critical), one rule for release and Open a case (C6.1, C5.1 gate)

Reviewer (did not build), 4 Nov 2026. US$0, no STUDIO_*_LIVE, never :4400. All my copies were stopped and their databases dropped: rv8_qa180 :19400, rv8_b1 :19401 and :4478, rv8_v3 :4477.

## Round 2: diff-only re-review of c9b910ae7..600fa4718 (head 600fa4718)
**Verdict (skill wording): Ship.** M1 and m1–m3 from round 1 are closed. One new Minor is left for the PR.

**M1 (golden journey): closed.**
* **My run.** I ran the committed `v3_golden_replay.cjs` unmodified on rv8_v3 :4477, with nothing else running.
  * Step 3: release 1 returned 201.
  * Step 4: the officer opened the family case on release 1 at the first try (201, "Case opened", no 409).
  * Steps 5–8 pass. Step 5: 25 of 25 parts; header "241 questions … 0 required not answered".
  * Step 6: IMM 5257 copies for all three people.
  * Step 7: filing is held with 422.
  * Step 8: 5 filings, which are IMM 5257 ×3 and IMM 5707 for the two adults. Questions are 241 = 241, and sections 9 = 9.
  * Axe: no violations on any QA-180 state. The only one is `color-contrast(1)` on 1-reset-confirm, which existed before. Sideways scroll is 0 px at 400, 1024 and 1440 in every state.
* **Step 2.** IMM 5707's Saved draft applies through its own job page (201: 50 fields, 4 new definitions, 5 reuse matches), and 5 of its form fields are decided by hand. This follows P-297 (3). Only IMM 5409 and 5476 are removed, and the release check names exactly those two first.
* **The builder's run 7** (log `scratchpad/v3replay7.log`) passed 8 of 8.

**m1 (remove offered for the package's family form): closed.** validate.ts uses `FAMILY_INFORMATION_FORMS` from form-completeness.ts. When the form is the combination's only family information form, its line offers only "Map its form fields". The new import does not create a cycle: form-completeness.ts imports nothing. Tested by `words (m1)` and its pass side.

**m2 (older-edition note): closed.** The note is added only when `olderMapped` is true. The comment states that real snapshots drop empty maps (engine/snapshot.ts). Tested by `words (m2)` ×2.

**m3 (one form named two ways): closed.** The title moved into the message: 'IMM 5409: No form fields mapped yet: a case could not fill the form "…"'. There is no `label` and no nested brackets, so each line starts with the form number, the same as the condition lines. The words are plain and say no "box". Screenshot: `screenshots/qa180/2-review-names-unmapped-1440.png`.

**Suites on 600fa4718, all green:**
* `check_qa180_one_rule` 26/26
* `qa/check_qa180_two_gates` 8/8
* `check_screen01_rules` 67/67
* `check_engine` 43/43
* `check_gcore_engine` 137/137
* `check_c1112_modes` 44/44
* `check_edition_in_use` 20/20
* `check_review_item_words` 7/7
* `check_vv_checklist` 62/62
* `check_sh3_resolver` 78/78
* On rv8_b1 :4478: `check_b1_release_unmapped` 14/14, `check_s4_startable` 10/10, `check_forms_c212_progress` 54/54

The B1 suite's "No form fields mapped yet:" filter still matches the new words.

**n1 (new) — Minor, Should, list in the PR: the replay is still flaky under load, and step 2's own check is brittle.**
* **My run 3 crashed.** It ran while my API suites were running on :4478. It stopped in IMM 5707's decide loop: `waitForResponse` timed out after 30 s at v3_golden_replay.cjs:83. When I did the same save by hand on that copy, it returned 201.
* **My run 4 passed the journey, but its step 2 check failed.** Steps 3–8 all passed, and there were 0 blocking errors. Step 2 was marked FAIL only because 84 of 88 facts were placed in 285 s (`placed === keys.length`).
* **The replay skips a screen.** It finds IMM 5707's job with SQL (`job5707`, line 93) instead of opening it from the screen. The screen does have a way there: the Forms row's step and next-step.tsx:59 "Review AI proposals". P-33 is not breached, because the step itself is done on the product's screen.
* **Fix:**
  * Open the job from the IMM 5707 row's step.
  * Make placement wait on each answer, as apply and decide now do.
  * Catch timeouts so a crash still prints the step verdicts.

**Not re-checked in round 2:** a keyboard-only walk of the new line (it is text only), a screen reader, D17/D20 (with the founder), and a re-score of the unchanged D lines.

**Journey score, round 2: 9/10, pass.**

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Run 4: release 201, case 201 at the first try, steps 3–8 pass. |
| Next step obvious | 1 | |
| Plain words | 1 | |
| Feedback and state | 1 | |
| Correct data | 1 | 5 filings match the release. |
| Error recovery | 1 | m1 closed. |
| Accessibility and screen sizes | 1 | |
| Speed | ½ | The slowest part save took 5.5 s; library approval took 292 s. Both are existing behaviour. |
| Visual quality | 1 | |
| Trust and sources | ½ | IMM 5707 field descriptions show raw form-field keys (e.g. "IMM_5707[0].page1[0]…"), and the AI reasons say "box". Both existed before; neither comes from this change. |

**Verdict: Approve** for head 600fa4718. There is no open Blocker or Major. List n1 in the PR.

## Round 1: c9b910ae7 (superseded)
Round 1 gave **Block**. M1: the committed replay removed IMM 5707. The C3.8 package rule (engine/form-completeness.ts:41) refuses that, so step 3 could never release; it also departed from P-297 (3). Minors: m1 offered "or remove the form" for the package's family form; m2 the edition note could not be reached from real snapshots; m3 one form was named two ways in one list.

Round 1 also confirmed that:
* release, Open a case and the setup count read the one rule, `formsWithoutFieldMap`;
* there is no runtime import cycle;
* the label shows only on Review and release and in the release and submit refusals;
* the answer-key copies of the old predicate are rightly left alone;
* `check_qa180_one_rule` fails 11 of 22 on main's engine. The real fail-before checks are hole 4 and the words check; the "one rule" checks fail there only because the export is missing.

Journey score at c9b910ae7: 7.5/10, failed on "task completed". Details: `journey-test-reviewer-2026-11-04.md` (round 1).
