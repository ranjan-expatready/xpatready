# C3.8 validator: review of PR #691 at 617bfa6b7 (base 877acf66)

**Verdict: Approve** (no open Blocker or Major)

## What I ran
- Pack `acceptance/C3.8.test.ts` on port 4448: 11 passed, 0 failed (one NOTE: per-channel option map not testable on this sample, pre-existing).
- Read the whole diff, the engine file, the validator, the decision route and the Decide panel; looked at the builder's before/after screenshots. I did not drive the browser myself (not checked: keyboard-only, 1024 px/200 % of the new note).
- Queried the pack's database for every `BackgroundInfo` data path in the library.

## Points weighed
1. Background rule (`BackgroundInfo\d*[n]` section plus `(Visa)?Choice\d*[n]` box): matches the real library. Choice, Choice[1], VisaChoice1/2/3 and the nested Details.VisaChoice3 are all caught. Details boxes and `backgroundInfoCalc` (which is `not_a_fact` today) are correctly excluded. Not too broad on this data. Narrow only for a form whose yes/no boxes are not named that way; none exists in the library, and the builder's fail-case list covers the nearest lookalikes. OK.
2. Validator with `effective(..., "draft")` keyed per edition and data path: right. A DRAFT over a PUBLISHED row wins; SUPERSEDED and RETIRED rows are not read. Both `not_a_fact` and `never_filled` count. Fails when the rule is removed (AT-3 and the unit check).
3. No IMM 5707 line on a combination with no forms: acceptable. "No forms yet" and "Nothing to release" already say it; the choice is recorded in the code and has a unit case.
4. Extra queries per combination: 3, run in parallel, with the map query narrowed by `contains: "BackgroundInfo"`. It is called once per validation, not per row. Fine.
5. Words: plain, name the form's own caption, fall back to "This question", no PDF path. The Decide panel note and the 409 say the same thing.
6. Test-setup changes (setup_visitor_visa, check_screen02_fix, check_screen02_slice2, fill_queue_kinds, the two browser checks): each now decides Background questions "by hand" (via the new `background` flag) and adds IMM 5707 from the library. No assertion was loosened or removed; the new setup obeys the rule instead of bypassing it, so these suites now exercise the new path. Not a weakening.

## Findings
- Minor 1. `api/src/studio.ts:217`: the map query takes rows of every edition of every non-retired form line, not only the edition the line uses. An old edition's Background row left as `not_a_fact` would still raise an error that the Decide panel (which shows the current edition) cannot clear. Failing scenario: a form line moved from an old edition to a new one, where the old edition has a `not_a_fact` Background row. The same scope as the existing `undecidedFormFields` (line 233), so not new; note for later.
- Minor 2. `web/src/pages/job.tsx:263`: for a Background question the Decision select offers one option, so it is a control with no choice. Harmless; the note above it explains why. No change needed for Approve.
- Minor 3. The refusal is 409 with the form's own rule; the API route does not handle a client sending `never_filled` (the contract has no such decision), so no gap.

## Journey score (reviewer role): 8.5 / 10 (simulated only; D17/D20 stay with the founder)
Task completed 1 · next step obvious 1 (note says what to do) · plain words 1 · feedback and state 1 (error in the validator, 409 in the route) · correct data 1 (checked in the database) · error recovery 1 (reasons and fixes named) · accessibility and sizes 0.5 (not walked by me) · speed 1 · visual quality 0.5 (plain note, no icon; unchanged look) · trust and sources 0.5 (IRCC-F08/F09 cited in code and trace, not shown on screen). No criterion at 0.

## Could not check
Real keyboard-only and zoom walk of the Decide panel; GitHub CI and the builder's full local run (in progress).

## Round 2 (diff 8719b1f6e..19112037d)

**Verdict: Approve** (no open Blocker or Major)

- Ran `tests/check_c38_completeness_api.ts` on port 4448 (copy rev2_c38): 9/9 passed, including the removed-form case and the "filled by hand clears it" case. Read the diff; did not re-run the other suites you listed.
- Fix 1 (`api/src/studio.ts` completenessProblems): the draft's effective lines are computed first and both the Background query and the IMM 5707 check use them. A form removed in the draft (RETIRED over PUBLISHED) is no longer checked, so my Minor 1 scenario "removed form still errors" is closed. The empty-forms case skips the query.
- Fix 2 (`web/src/pages/job.tsx:249-250,260`): a Background question already `not_a_fact`/`never_filled` is listed with the pill "Marked "not a fact": decide again", is removed from the "decided" list, and "Decide" opens with "Filled by hand" only. The error can now be cleared from the screen. Plain words.
- Checking every PDF edition of each current form: I agree, since the snapshot and filler carry every edition. Remaining Minor (unchanged, not a blocker): a `not_a_fact` Background row on a non-current edition is flagged but the panel shows only the job's edition, so it can only be cleared by opening that edition's own job. Scenario: an older edition of a current form keeps such a row and its job is not in To review. Not a regression; the error text names the question.
- Test-setup changes unchanged in Round 2; none weakens a check.
