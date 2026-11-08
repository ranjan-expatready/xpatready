# QA-309 review: Online IMM 5257 reaches Done (C7.3, C10.2), reviewer, 8 Nov 2026 (IST)

Reviewed commit `7b3e7b39e7b74e4f5a2ec94d1a483a8b79b59d07` (`git diff origin/main...7b3e7b39e`). I did not build it.
My copy was `rv_q309` on :4438, now stopped. US$0. The journey test, scored 9/10 (pass), is in `journey-test-reviewer-2026-11-08.md`.
Evidence is in `/tmp/claude-0/-home-user-xpatready/37584d57-c949-52fc-b2ab-1b4fc455b3e9/scratchpad/rv/`. Overall: **Ship after fixes**. The
behaviour is right; one new rule and one mapping have no test that fails without them.

## What I ran (on 7b3e7b39e)
* `tests/check_qa309_online_done.ts` 9/9. `tests/check_vv_answer_sheet.ts` 33/33. `tests/check_c73_parts_checkpoint.ts` 6/6.
* Pack C10.2 13/13; the PENDING 6b line did not print, so the story's Online IMM 5257 is Done. `tests/check_c102_finished_story_refusals.ts` 20/0.
  The builder's own C10.2 log (`qa309/C10.2.txt`) stops after 2 lines, so this is the first full run.
* `tsc -p api/tsconfig.json`: no error in the touched files.
* Probes on a principal and spouse case and on an Online IMM 5645 (`probe1`–`probe4.mts`):
  * Spouse facts (subject id) wait and block Done.
  * The application's "case" boxes wait (the mapping at `api/src/case-prepare.ts:757` works).
  * Relations `<id>/parent_1` and `parent_2` wait by their own key.
  * A 200-character value with a problem ("needs a fix") waits and is named.
  * A required fact declared but not confirmed holds Done through `!rd.missing.length` alone (`case-prepare.ts:363`).

## Checked and sound
* **The sheet and the item use one rule.** `build` (`case-prepare.ts:346`) and `sheet` (`:656-659`, also used by `entered`) pass the same
  `formReadinessOf(…, cov).missing.filter(blocksLock)` on one coverage to `waitsOf`. Every `waiting` entry traces to a readiness line.
  The reverse does not hold, by design: a fact that is "not confirmed" or a fired check shows as an answer, and the reason names it.
* **The tick freezes the same version.** `sectionHash(answers)` is untouched by `waits` (unit check). Re-giving "none apply" needed no re-tick.
* **Section visibility is unchanged.** `asked` (`engine/runtime/answer-sheet.ts:107`) has the same set as the old filter: every
  non-"not needed" box with a subject used to be either an answer or a waiting entry.
* **PDF upload and Paper reasons are unchanged.** `sheet` is null for them, so line 415 falls through to the old words. The story's Paper stage words are as before.
* **Hidden questions** are excluded by readiness (`!q.hidden`), so a hidden question's box no longer waits. That is the P-71 rule.
* **Optional facts:** one answered with a problem waits ("needs a fix"); one left empty does not.
* **Performance.** The item path reuses the cached `covOf` and `formReady`, and `sheetOf` no longer recomputes coverage. That is one
  fewer `formCoverage` per Online item. The route adds one readiness run: 79 ms for IMM 5257 with 72 answers.
* **readiness-inputs and factsHash** (`:560`) are untouched and read the same `formReady`.
* **Finished story** (`api/src/finished-story.ts:201`): each item's own reason, deduplicated. `HELD.sheet` has no reader left.

## Findings
**Major M1: the new Done rule and the case mapping fail no test when they are removed (STANDARDS [M] "A rule's test fails when the rule is removed").**
* (a) `case-prepare.ts:363` adds `&& !rd.missing.length`. Every fail case in the new tests also has a section with `waiting`,
  which masks the rule:
  * `check_qa309_online_done.ts:48`: "none apply" taken back makes the group's facts wait.
  * `check_vv_prepare_api.ts:118` asserts `some waiting > 0`.
  * C7.3 and C10.2 never reach that state.
  Scenario (probe2): the item is Done, then the officer changes `case.intended_stay_to`. The section is re-ticked, nothing waits, and the
  answer is not confirmed. Only this clause keeps the item To do. Delete it and every suite stays green, while the item reads Done with
  "every answer confirmed" over an unconfirmed fact.
* (b) The "case"→case-subject mapping (`:757`) is untested. Remove it and an unanswered case fact (`case.visit_purpose`, `case.application_type`)
  never waits on the sheet. Again no test turns red: no check reads the sheet before the fill, and C7.3-4b passes on the principal's own facts.
* (c) The `check:` branch of `waitsOf` (`:769-771`) is untested; no check fires on the checkpoint.
* **Fix:**
  * In `check_qa309_online_done.ts`, after Done:
    * Change a case fact as the officer and re-tick the section that went Out of date.
    * Assert To do, the reason naming the fact, and no section `waiting` (fail case for (a)).
    * Confirm the section, then assert Done (pass case).
  * Before the fill, assert a `case.*` fact is in some section's `waiting` (b).
  * Add a pure check of `waitsOf` for `group:`, `check:` and a case subject (c). It can be exported or moved to `engine/runtime/answer-sheet.ts` if importing `case-prepare.ts` is heavy.

**Minor m1: the reason counts and names a case fact with a problem twice** (`sheetWords`, `case-prepare.ts:780-784`).
* `formHoldsBack` (`engine/runtime/forms.ts:212-219`) keys its de-duplication by `b.about` ("case"), while the question line uses the case's subject id.
  So readiness lists the fact twice, the second time "about" the principal.
* Probe3 measured it: "Waiting for 5 facts …" for 4 distinct facts, with `case.visit_contact_name` once for "The application" and once for "Sample Client A".
* The cause predates this PR, but this PR puts it into the item's words.
* **Fix:** map "case" to the case subject in `formHoldsBack`'s key, or de-duplicate by fact and subject in `sheetWords`. Otherwise, a qa row.

**Minor m2: `waitsOf` matches `group:` and `check:` lines by the person's display label (`about_label`), not the subject id** (`case-prepare.ts:768-770`).
* Two people with the same name would make each other's facts wait. It only ever over-waits, which is safe, but the key is fragile.
* **Fix:** carry `subject` on readiness's group and check lines and match on it.

**Minor m3: the committed C10.2 pack does not assert QA-309.**
* At `7b3e7b39e`, `acceptance/C10.2.test.ts:60` is still the PENDING line with the old QA-165 (1) words, printed only when the item is not Done.
* The worktree holds an uncommitted edit that turns it into `ok("C10.2-6b pass (QA-309) …")`. Commit it. That moves the head, so this review must be re-run on the new commit.

**Note (no finding):** an Online IMM 5645 now reads Done with "Section C - brothers and sisters" empty.
Siblings are never asked (QA-153, open). That follows the bug's rule (d), and Ready to file still names the empty mandatory boxes.

## D1–D20 (only the ones this fix moves)
* **D1 4/5:** every Done-when line holds on my copy. The C10.2 assertion is still uncommitted (m3).
* **D2 5/5:** no write path changed. Ticks still freeze the shown version under the case lock.
* **D4 4/5:** waiting follows readiness for person, spouse, case and relation facts. m2 is the remaining weakness.
* **D9 3/5:** the reason names what waits or which sections are left. There is no screen for it yet (C7.3 page).
* **D10 4/5:** the words are plain, apart from m1.
* **D11 4/5:** the state flips are correct each way.
* **D15 5/5:** 79 ms, and no extra coverage per item.
* **D16 2/5:** see M1.
* **D17, D20:** simulated only.
* **D19 4/5:** the finished story's Online items read Done.
* **Others N/A:** no UI, data or AI change.

## BIC-01–BIC-20
N/A: this diff changes no case-side screen. The finished story dialog was checked in the journey test (axe 0 at 1440 px, no sideways scroll at 1024 px).

## Could not check
* A fired section check end to end: none fires on this release's sample data.
* `node product/tools/graph.mjs`: not run, because it rewrites `qa/GRAPH.md` and only this review and the journey report may be written.
* The remaining selected CI suites: CI runs them when the PR is marked ready.

## To fix before Approve
1. M1 (a), (b) and (c): a failing test for each rule.
2. Commit m3's C10.2-6b assertion. m1 and m2 are recommended, or go to a qa row.

Verdict: Block
