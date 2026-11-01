# Review: F8 / X1a, "an empty combination cannot be released" (commit ee4d13b0)

Reviewer, 31 Oct. Own copy `screens_rev4` on :4449, built from /tmp/wt-f8, with the sample loaded. US$0. Diff: `engine/validate.ts` +3, `contracts/programs.ts` (problemWords), new `tests/check_f8_empty_release.ts`.

## Is the rule right and complete?
* **Server gate: right.** Every release path reads `StudioService.problems()` → `validate()`. That covers submit (`studio.ts:641`), single approve (`:683`) and the shared release page / pack release (`releaseRows` `:736`, called from `programs.ts:390`). Sign-off needs a SUBMITTED submission, so it is closed too. `api/src/lifecycle.ts` never writes a `config_release`. The only other writer is the demo import (`demo.ts:92`), and it imports the fixed c1-v3 release, which has 9 forms and 26 documents. Nothing else can release an empty combination.
* **Scope matches X1a as written:** "0 forms and 0 documents". A combination with only document lines, or only checklist-kind forms, can still be released. The backlog row asks for exactly this, so it is not a finding here. Whether a release with documents only should count as "configured" is a Lead/founder question, not this item.
* **PR #113 (runtime, not merged): not broken.** Its C10.1 checkpoint skips any combination with no form line before it calls submit (`demo.ts` in #113: "not submitted, no form is on it yet"). It also catches refusals into `blocked`. The new rule can only turn a release that would have gone through into a "blocked" line with the validator's words. #113's comment "the rules would allow it today (finding for the Lead)" goes out of date once this merges.
* **Test value:** `check_f8_empty_release` 11/11 on :4449. Delete the new line in validate.ts and the engine case and the three API refusals fail, so the test guards the rule.

## Where the error shows (browser, 1024 / 1440 / 400 px, empty "Super visa")
* **Review and release tab:** said once, under "Validation of the draft", as "Forms · Nothing to release yet: …". Submit is disabled with "Fix the problems first". Good (`/tmp/rev-f8/review-1024.png`).
* **Draft bar, setup checklist card (step 5 "Not released yet"), To review:** the error does not appear in any of them. Fine: it is not a review item.
* **Overview "Missing before firms can use it": said twice, in wrong words (Major).** `missingItems` (`engine/programs.ts:70-72`) treats every `where: "Forms"` error as a filing problem. Every empty combination now lists three lines:
  1. "2 forms attached as sources, 0 set up." (or BR-8's "No forms yet.")
  2. "No questions yet for …"
  3. "**1 form cannot be filed as set** (first: Nothing to release yet: … no forms and no documents …) Next step: **change how it is filed (Overview › Forms)**"

  Line 3 counts 1 form on a combination that has 0 forms. It repeats BR-8's line, and its next step points the wrong way. It also breaks the "step said once" rule (Lead note 23 Oct, `sharedStep`): lines 1 and 2 used to share one step, and now each repeats "Next step: Add 1 form from the library." The same three lines reach `GET /catalogue` `missing` for Super visa, Study permit and Applicant outside Canada. Screenshot: `/tmp/rev-f8/overview-1024.png`. The "Rules and checks" card also turns red ("0 rules · 0 checks · 1 problem to fix") for a problem about forms (Minor).
* **Existing suite regresses (Major):** `tests/check_screen01_rules.ts:143` fails, 66/67. Its assertion, "a combination with no setup has no warnings (… no duplicate of the missing list)", now gets the new error. CI/run-suites goes red.

## Must fix
1. **M1, double and wrong missing line.** Keep the gate, and say it once on the Overview:
   * either `missingItems` skips this whole-combination problem (`item === ""`), because BR-8's `no_forms` line already says it with its step;
   * or put the check in `StudioService.problems()` (the release gate and the Review tab) instead of `validate()`, so the catalogue's missing list never sees it.

   Add a test: the empty row's `missing` has no `filing_problem` and keeps the shared step.
2. **M2, `check_screen01_rules` item 3.** Make it pass again, either through the M1 fix or by changing it on purpose to "only the F8 error", with a reason. Run run-suites before handing back.

## Should
* S1: the `problemWords` change is right (no leading ": "). It is a shared contract and the only change is for an empty `item`, so it is safe.

## Journey test (reviewer role)
Journeys:
1. Author opens an empty combination and tries to send it for review. Blocked in words, with a way forward.
2. The approver calls approve by API. 409 in words, and no `config_release` row.
3. Author adds IMM 5257. The error clears.
4. A combination with content (With an LMIA) never shows it.
5. Overview and catalogue for an empty row. M1 above.

Results: axe WCAG 2.2 A/AA found 0 violations on Overview, Review, To review and Programs at 1024 px. No sideways scroll at 400, 1024 or 1440 px. No console errors. Pages load in 0.7 to 1.1 s.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The empty combination is refused at submit (400) and approve (409); 0 releases |
| Next step obvious | ½ | The Review tab names the fix; the Overview's 3rd line says "change how it is filed" |
| Plain words | ½ | "1 form cannot be filed as set" on a combination with 0 forms |
| Feedback and state | 1 | Review tab badge 1, Submit disabled with a reason |
| Correct data | 1 | No release row, no submission written |
| Error recovery | 1 | Adding a form clears it (201, then the error is gone) |
| Accessibility and sizes | 1 | axe clean; no sideways scroll at 3 widths (keyboard not walked) |
| Speed | 1 | ≤ 1.1 s per page |
| Visual quality | ½ | The red Overview block repeats the step and nests brackets |
| Trust and sources | 1 | No AI or immigration values involved |

**Score 8.5/10** (pass, no 0). It is still a Block because M1 and M2 are open.

Not checked: a keyboard-only walk and a screen reader. The 400 px check covered layout only, not 200 % zoom. D17/D20 stay with the founder.

**Verdict: Block** on commit ee4d13b0. Fix M1 (missing list says it once, with the right step) and M2 (check_screen01_rules green), then re-request review.

## Re-check of f6258cb4 (reviewer, 31 Oct)

Fresh copy `screens_rev4` on :4449, web rebuilt from the worktree, sample loaded. US$0.

* **Fix:** the rule moved out of `validate()` into `emptyProblem()` in `api/src/studio.ts`. It is added in `StudioService.problems()` (`where: "Release"`, empty `item`), which submit, approve, `releaseRows` (the release page and pack release) and the Review tab all read. `engine/validate.ts` is back to main.
* **M1 fixed.** On the Overview, Super visa lists 2 lines ("2 forms attached as sources, 0 set up." and "No questions yet for …") under one line, "Next step for all of these: Add 1 form from the library". There is no filing line and no "Nothing to release" line (`/tmp/rev-f8/overview-1024.png`). The check now asserts this (the "F8 (M1)" line).
* **M2 fixed.** `check_screen01_rules` passes 67/67.
* **Review and release tab:** says it once, as "Release · Nothing to release yet: …". Submit is disabled. The draft bar and To review do not mention it.
* `check_f8_empty_release` passes 12/12. It calls `emptyProblem` directly, and the API refusals (400 at submit, 409 at approve, 0 releases) prove `problems()` uses it. Removing either part makes the check fail.
* **Browser:** at 400, 1024 and 1440 px, axe found 0 violations, nothing scrolls sideways and the console has no errors. Pages load in 0.7 to 1.6 s.
* **PR #113:** still unaffected (it skips combinations with no forms before submit).
* **Should, not blocking.** On the release page (`programs.ts:347`), a held row's reason comes from `validate()`, which no longer has this rule. An empty combination that has sections or rules but no forms or documents is therefore held with the review-gate words ("not submitted …") instead of "Nothing to release yet". The server still refuses it.
* **Minor, from before this change.** The Overview's "Rules and checks" card shows "1 problem to fix" in red for a release problem. The Review tab says "22 draft changes" while the draft bar says "No unreleased changes" for the same row.

Journey score after the fix: **9.5/10**. Plain words and visual quality are now 1, and accessibility and sizes stays 1. Next step stays at ½ because of the release-page wording above.

**Verdict: Approve** for commit f6258cb4.

## Re-check of 44475848 (reviewer, 31 Oct)

The only code change since f6258cb4 is in `web/src/pages/workspace/overview.tsx`: the Rules and checks tile now counts problems where `where !== "Release"`. Only `emptyProblem()` (`studio.ts:63`) uses `where: "Release"`, so no other problem drops out of the tile.

**Correction to my f6258cb4 section:** the red "1 problem to fix" on that tile was caused by this PR. It was not there before the PR, as I wrote.

What I checked: fresh `screens_rev4` copy on :4449, web rebuilt from the worktree, sample loaded.
* **Overview, Super visa:** the tile now says "no problems". The missing list keeps "2 forms attached as sources, 0 set up." with one shared next step.
* **Review and release tab:** still lists "Release · Nothing to release yet: …" once, and Submit stays disabled.
* **Browser, 400, 1024 and 1440 px:** axe found 0 violations, nothing scrolls sideways, and there were no console errors.
* **`check_screen01_browser` on a fresh copy: 116/116.** That run rewrites tracked screenshots and `evidence/screen01/browser-checks.json`. I restored them with git checkout.
* **Still open (Should, not blocking):** the release page's held reason for an empty combination that has sections or rules (see the f6258cb4 section).

Journey score: 9.5/10, unchanged.

**Verdict: Approve** for commit 44475848.
