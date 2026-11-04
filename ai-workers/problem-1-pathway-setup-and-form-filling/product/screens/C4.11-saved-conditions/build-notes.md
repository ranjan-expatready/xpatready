# C4.11 — Draft questions and documents: every saved condition lands or is refused with a reason (QA-162)

Builder: forms lane (cloud), branch `claude/festive-noether-prh9i1`, from origin/main 9caa043b (4 Nov). US$0: saved runs only, live AI off.

## Plan
1. Reproduce QA-162 at US$0 on Visitor visa (`tests/runtime/setup_visitor_visa.ts`): Draft with Saved, step 5 (`qd_conditions`), list the 14 left out with their reasons.
2. Sort each of the 14 by cause.
3. Land what the saved run already holds (no new paid run), for a person to check; never guess.
4. Every condition still left out says what a person can do; the ones only QA-144 blocks say so.
5. Tests per rule (pass and fail); QA-162's check twice; the C4.11 pack on the fixture and on the demo data; 1440 px walk.

## What the 14 were (saved run #531: 11 + 11 conditions, Guide 5256)
Reproduced: 8 of 22 readings land (6 items), 14 left out (qa counted the UI's "6 of 20"; same run).

| # | Reading | AI's words | Why it was left out (cause found) | Now |
|---|---|---|---|---|
| 1 | 2nd | Other names used (when Ever used other name = yes) | the words fit 2 questions (other family name, other given names) | **lands**: the guide sentence it quotes ("type any other family name …") names only the family name; agrees with the 1st reading; Check, never Ready |
| 2 | 1st | Other country of residence details (Lived elsewhere past five years = yes) | words fit 2 'other status' descriptions; the deciding Yes/No is not a question (IMM 5257 Q8A is worked out from the previous-residence rows) | left out, naming both, and what to do |
| 3, 9 | both | Country applying from details (Applying from residence country = no) | IMM 5257 Q9A "Is the country from where you are applying the same…?" is derived by the field map from the applying-from country: no question asks it | left out naming that form field: add a Yes/No question, map Q9A to it, place it; or set by hand |
| 4 | 1st | Other immigration status description (Immigration status = other) | no single question holds all the words; the three 'other' status descriptions are asked and near; "Immigration status" fits 7 questions | left out: "names no single question", the three nearest named, set by hand; the 7 deciding questions named |
| 5 | 1st | Previous spouse or partner details (Previously married = yes) | IMM 5257's previous-spouse boxes are mapped "not a fact" (setup Sample), so no question asks them | left out: map those IMM 5257 boxes to questions and place them |
| 6, 12 | both | Residential address (same as mailing = no) | IMM 5257 "Is your residential address the same as your mailing address?" is derived from the two addresses | left out naming that form field and what to do |
| 7, 13 | both | Highest post-secondary education details (Any post-secondary education = yes) | no single question (the education questions are asked and near); the Yes/No is derived by IMM 5257 from the school name | left out: the nearest education questions named, set by hand, and IMM 5257's worked-out Yes/No named |
| 8 | 1st | Common-law union declaration (marital status = common-law) | a form (IMM 5409), not a question; IMM 5409 is in the library but not one of Visitor visa's forms | left out: when a form is needed is set on the Forms tab |
| 10 | 2nd | Previous country of residence details (Lived elsewhere = yes) | the deciding Yes/No is derived (IMM 5257 Q8A) | left out naming that form field |
| 11 | 2nd | Spouse or partner name (marital status = married or common-law) | the spouse's name is the spouse's own question; and "married or common-law" is two answers | left out with what to do |
| 14 | 2nd | Previous relationship details (Ever married or common-law = yes) | no question holds the words (two near ones share 2 of 3 words); the deciding words fit 2 Yes/No questions (the library has both `relationship.previously_married_or_common_law` and `person.previous_marriage_or_common_law`) | left out: the nearest named (set by hand), or map and place if none is meant; both deciding questions named |

**Result:** 9 of 22 readings land (6 items: Check 3, Decide 3, Ready 0); 13 left out, each with what a person can do; the 6 passages the AI itself could not turn into one condition are listed too. **None of the 13 is left out only because of QA-144** on the fixture: their causes are the library (Yes/No questions IMM 5257 works out itself, a duplicate Yes/No), the IMM 5257 field map (previous-spouse boxes "not a fact"), and two that are not question conditions (a form; another person's question). Landing them needs library or field-map changes, or a new paid run with the question list (P-227 option b, #744), not a matcher that guesses.

On the demo data (the six, Demo › Load sample or the configured checkpoint) every one is left out because no question is placed yet: QA-144.

## The "never silent" gap found on the way
The run card (`web/src/components/run-card.tsx`) never showed a step's `details`: "14 left out with the reason" showed a count but no reason a person could read. It now folds them under the step ("See the 19 reasons": 13 left out + 6 passages), keyboard and screen-reader reachable.

## Changes
* `engine/qd-conditions.ts`: `quoteNames` (the quoted sentence breaks a tie of words, only among the tied questions, two or none → none); `workedOut` (explanation only: the one derived Yes/No form field the words name); `targetNotAsked`, `deciderNotAsked` (reasons with what to do); a miss kind as data (`several | none | unplaced`), never read from the reason's words.
* `api/src/draft-qd.ts`: the forms library passed to step 5; `conditionDetails` (left out + unresolved passages); the plan names the saved run files per step (additive: `saved.files`, `saved.why_none`, `saved.guide`).
* `api/src/draft-contract.ts`: steps 5, 6 and 7 name their saved result (date, guide, run files) instead of "looked up at run".
* `web/src/components/run-card.tsx`: `StepDetails`.
* `acceptance/C4.11.test.ts`: reads today's contract (run status words, `usd` object, step 2's `checklist_draft` items, role groups through `WHO_ROLES`, PQR ⊂ SQR from the fact sources, step 4 rules-only); BR-10 with a checklist text no saved reading has read; lines QA-144 blocks say so.
* `tests/check_forms_qa162_saved_matching.ts`: 26 → 33 checks; `tests/check_forms_c411_draft_qd.ts`: one regex for the new wording.

## Walk (1440 px, author, Visitor visa from `setup_visitor_visa.ts`, US$0)
`walk/1-questionnaires-tab.png` · `walk/2-dialog-saved-7-steps.png` (Live not open; Saved with its 7 steps; Cost US$0) · `walk/3-run-done-7-steps.png` (7 done, all four rules pass) · `walk/4-step5-reasons-open.png`, `walk/5-step5-reasons-dialog.png` (step 5: 6 for To review, 13 left out; "See the 19 reasons" open) · `walk/6-to-review.png`. Enter on the summary closes it; no sideways scroll at 1440.

## Review round 1 (Opus, 6a680d9: Block on M1) and what changed
* **M1 (Major) fixed:** "names no single question" is no longer said as "no question asks it". When asked questions hold at least 3 in 5 of the words (2 of 3), they are named as the nearest and the reason offers to set it by hand; map-and-place is said only when none is near (and, for a weak 2-of-3 match, as the fallback "if none is meant"). Fail tests: "Other immigration status description", "Highest post-secondary education details" (both readings); pass test: "Previous spouse or partner details" keeps map-and-place.
* m1 fixed: the form field's question starts at its first word ("Have you had any post secondary education…") and is cut only between words; test.
* m2 fixed: no "when if …" (a plain condition starting with if/when/only is kept as it is).
* m3 fixed: the run card shows a step's reasons only when the step finished (a failed finder step's request id is never shown); a committed browser check now asserts the reasons (`tests/check_forms_qa162_run_reasons_browser.cjs`, 11 checks: count, every one listed, each says what to do, keyboard, axe, no sideways scroll, only finished steps fold).
* m4 kept, with its reason: through the API at US$0 the pack cannot make an "earlier text" reading without writing a planted run into the shared `p2/runs` (QA-202's leak) or changing a committed inventory; the exact Out-of-date rule stays in `check_forms_c411_contract` (O). Question for the tech lead in the PR.
* m5 fixed: "every fact from a document names a document on the checklist" now reads `/fact-sources` (0 such facts on Visitor visa today: it holds, and would fail on a missing document).
* m6: the pack header says to run it on a fresh copy (G5 accepts the Ready items).
* m7 fixed: when the guide's sentence names a tied question that is not placed, the reason says "not asked … yet … once it is placed" (placement), never "could be 2 questions"; test.
* m8 fixed: a reason about a question named in the AI's own words says "(the AI wrote …)"; test.
