# Review: R3 (P-230 (3), closes FQ-4), PR #493

Reviewed commit **d95749b5** (branch `claude/charming-albattani-jhkk4s`). I also reviewed the earlier head 5b5972f6, and the delta between the two is covered below. The reviewer did not build this. The isolated copy `rev_r3` ran on :4425 and was stopped afterwards. Cost: US$0.

## Runs (fresh copy at d95749b5)
| Step | Result |
|---|---|
| `tests/runtime/setup_visitor_visa.ts` | 13/13 |
| `acceptance/lib/setup_vv_m3.ts` | 29/31. S2w and S7a fail, the same as on main. All S6 lines pass (7 requirements), and so does S6a (both facts proposed through C3.6, accepted by user-C, approved by user-B, asked per person) |
| `acceptance/C6.4.test.ts` | 25/25, including the new 8h and 8i |
| `tests/check_c64_storage_api.ts` | 48/48 |
| Probe (scratch, API) | **one_parent, custody unanswered → passport only (no letter, no ID copy)**. one_parent + sole → custody documents only. one_parent + shared → letter, ID copy and custody documents |

## What holds
* **Sourced path.** `person.travels_with` (4 values) and `person.custody` (5 values) go through `POST /combinations/:id/rule-facts`. In the database: `value_type=code`, answer lists `who_the_child_travels_with_answers` and `custody_of_the_child_answers` with the codes the rules read, `library_change` RELEASED for both, and a `source_ref` naming the rule, the run and user-C's acceptance. Nothing was free-added. The old boolean is no longer placed.
* **Lines checked against research Q4.** Alone or another adult: letter signed by both parents or guardians, naming the adult responsible in Canada, plus a birth certificate copy. One parent: a letter from the parent not travelling, plus a copy of that parent's signed passport or ID. Shared or sole custody: custody documents. Adopted or guardian: the papers. Under 18 only: `person.age_years < 18` on every line, worked out from the application date. The letter line says "does not need to be certified". The child's own passport is already covered by the each-applicant passport line.
* **Citation.** Every line's `conditionPlain` ends with "Researched (canada.ca minor-children page, 2025-01-23, read 2026-11-02): may change". That is the P-230 form. The reasons on the checklist show it (C6.4-8 checks it on the birth certificate line).
* **Pass and fail per rule.** Letter: 8, 8a, 8b, 8i pass; 7, 8c, 8g, 8h fail. Birth certificate: 8 and 8a pass; 8b, 8c, 8g fail. ID copy: 8b and 8i pass; 8, 8c, 8h fail. Custody: 8d pass; 8e and 8f fail. Adoption or guardianship: 8e pass; 8d and 8f fail. Removing any one condition would turn at least one of these red.
* **Client view (browser, 1024 px, user-P).** "Your visit" for each child shows both questions with the researched answer values. There were no page errors.

## Findings

**Major 1. The commonest one-parent case loses the letter and the ID copy while custody is unanswered.**
`setup_vv_m3.ts` `oneParentNotSole` = `travels_with in [one_parent] AND NOT (custody in [sole])`. When custody has no answer, the NOT branch does not hold. The probe shows that "one parent" with custody unanswered gives the passport line only. At 5b5972f6 the same answers gave the letter and the ID copy, so this is a regression from the fix.

This is the usual family: married parents, one of them travelling. They have no reason to answer a custody question. The test hides the gap because `C6.4.test.ts` answers `custody = not_applicable` before the travel cases (the line added in d95749b5).

Fix: let an unanswered custody count as "not sole", or require the custody answer whenever `travels_with = one_parent`. Then add a fail test for one parent with custody unanswered, written before custody is answered.

**Major 2. "One parent + sole custody → no letter" goes beyond the cited research.**
Research Q4 (line 19) reads: "**Sole custody:** the letter from that parent plus a copy of the custody decree". It keeps a letter and moves who signs it to the parent with custody. It does not drop the letter. The value "Sole" does not say *which* parent has sole custody. When the parent who has sole custody is the absent one, the child travels with the other parent, and that letter is exactly the one needed. d95749b5 now silently leaves it off.

Under-asking a document for a minor at the border is worse than over-asking it: an over-asked line can be marked Not applicable with a reason.

Fix (data only): either keep the letter for one parent + sole and change its reason to "signed by the parent who has sole custody; with the custody decree", or split the value into "sole, the travelling parent" and "sole, the other parent". Also correct C6.4-8h, which currently asserts the opposite of the research quote it names.

**Minor 3.** C6.4-8e tests `guardian` only. `adopted` has no pass test.

**Minor 4.** The under-18 fail (8g) checks only the letter and birth certificate lines. There is no 19+ fail for the ID copy, custody or adoption lines. They share the same `minor()` wrapper, so the risk is low.

**Minor 5.** The client-facing question text ends in "(Researched)", for example "Who is this child travelling to Canada with? (Researched)". That is a provenance tag in front of the client. It follows the earlier "(Sample)" pattern, but the provenance belongs in the help text or the author view.

**Minor 6.** The citation on each line names the page and date but not the URL or quote. The URL and quote are in a code comment and in the research file only. P-170 asks for page, quote and date, and only the letter line carries the quoted words.

Not a finding for this PR: C3.6 records the human-sourced fact with `origin=AI_PROPOSAL`. That is existing C3.6 behaviour, outside this diff.

## Journey score (reviewer, the one score for this check): 6.5 / 10, below the pass mark of 8
Journeys: client answers both questions for Child A1 (walked in the browser); officer sees the lines (checked through the API; I did not find the checklist panel in the time I had); the one-parent family (probe); a 19-year-old (test 8g).

| Criterion | Score | Evidence |
|---|---|---|
| task completed | ½ | questions answerable; the one-parent letter is missing until custody is answered (Major 1) |
| next step obvious | 1 | "Your visit" per child, Save and continue |
| plain words | ½ | "(Researched)" in the client's question text |
| feedback and state | ½ | lines appear and go with the reason text; the UI checklist was not seen |
| correct data | 0 | under-asks the letter (Majors 1 and 2) |
| error recovery | 1 | QA-149: the answer can be changed back, and requested lines are kept (48/48) |
| accessibility and screen sizes | ½ | 1024 px only; axe, keyboard and 400 px not run |
| speed | 1 | the checklist recomputes well within budget in the test runs |
| visual quality | 1 | team look, no layout break at 1024 px |
| trust and sources | ½ | "Researched … may change" on each reason; URL and quote not on the lines |

A 0 on correct data blocks a pass on its own. Fixing Majors 1 and 2 takes it to about 8.

Not tested: a screen reader, two tabs, hostile input (data-only change), and a walk by an intended user (D17 and D20 stay with the founder).

**Verdict: Block** (for d95749b5). To fix:
1. Major 1: one parent with custody unanswered must still give the letter and the ID copy. Add a fail test with custody unanswered.
2. Major 2: one parent + sole custody must not drop the letter without knowing which parent has custody. Follow research Q4 and correct C6.4-8h.

Minors 3–6 are optional.

## Round 2: commit 2f60f95e (`git diff d95749b5..2f60f95e`)
Fresh copy `rev_r3` on :4425, stopped afterwards.

**Runs:**
- Base setup: 13/13.
- `setup_vv_m3`: 29/31. Only S2w and S7a fail, as on main.
- C6.4: 26/26.
- Storage check: 48/48.

**Probe (API):**
- One parent, custody unanswered: letter, absent parent's ID copy, passport.
- One parent + sole: letter, custody documents, passport (no ID copy).
- One parent + shared: letter, ID copy, custody documents, passport.

**Browser (user-P):** the questions now read "Who is this child travelling to Canada with?" and "What is this child's custody arrangement?", with no "(Researched)".

- **Major 1: fixed.** The ID line's condition is now `one_parent AND (NOT exists custody OR NOT custody = sole)`. C6.4-8b tests one parent with custody unanswered, and the test no longer pre-answers custody. Removing the `not exists` branch turns 8b red.
- **Major 2: fixed.** The letter applies for every one-parent case again. Its reason reads "from the parent not travelling; with sole custody, from the parent who has it, beside the custody decree", which matches research Q4 ("the letter from that parent plus a copy of the custody decree"). C6.4-8h asserts the letter and the custody documents, without the ID line.
- **Minor 3: fixed.** 8e now tests `adopted` and 8e2 tests `guardian`.
- **Minor 4: fixed.** 8g covers all five lines for a 19-year-old (alone, sole custody).
- **Minor 5: fixed.** No "(Researched)" in the client's question text.
- **Minor 6: fixed.** Each line's reason carries the URL, the dates and the quoted words (P-170).
- **New Minor (optional).** Every line quotes "The letter does not need to be certified.", including the birth certificate, custody and adoption lines, where the quote is about another document. A quote that fits each line, or none on those lines, would read better. It does not block.

Journey score (reviewer, round 2): **8.5 / 10**, at or above the pass mark of 8, with no 0. Correct data, plain words and trust and sources are now 1 each. Accessibility and screen sizes stays at ½ (1024 px only), and feedback and state stays at ½ (the officer's checklist was seen through the API, not the UI).

**Verdict: Approve** (for 2f60f95e). There is no open Blocker or Major.
