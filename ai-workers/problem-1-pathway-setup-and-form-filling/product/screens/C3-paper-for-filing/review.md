# Review: row C3, a person's channel choice decides "for filing" (PR #1225)

Independent reviewer, 7 Nov 2026. Diff `9dc77d1ac..4fb292a754b45357c85177b5f1b5231736e5a178` (code 994f9d114; the head adds only screenshots). I did not build it. The row has no concept.md, so it is reviewed against row C3, section 8 (J-C3 and founder Q3), P-144 and P-237.

**Outcome: Ship.** There is no open Blocker or Major. There are four Minors; two of them are best fixed in a later row.

## What I verified myself
* **Offline:** `check_vv_prepare_store` 27/27 and `check_vv_prepare` 32/32. `tsc -p api` shows the same errors on the branch as on base: 15, all in `tests/` files. My base worktree had 6 more, from `../p2` and `../contracts` imports that did not resolve in the scratch worktree, so they come from the environment, not the diff. The diff adds no new `any`.
* **Live:** one copy, `rvc3` on :4491, with the configured checkpoint loaded fresh; it is stopped now. `check_c3_paper_validate` 18/18. `check_c3_jc3_browser` 25/25 (axe clean, no page error). My break-it script 8/8 and my screen pass 11/11 (journey report: `journey-test-reviewer-2026-11-07.md`).
* **Not run:** main's 14/18, the other API and browser suites the builder lists, and the packs C7.6, C9.2 and C7.7. The builder's branch runs of those packs were still in progress, and the row's "Done when" depends on them (row C4 / the Lead).

## Code check
* **`engine/runtime/prepare.ts:66-82`:** `paperLine` drops `lineOnline` and the "Ask the Lead" return. A Paper line now runs To do (Validate first), then In progress once read back, then Out of date. This is what the row's "Change" asks.
* **`api/src/fill-case.ts:65-66`:** `copyNotForFiling` takes the copy's stamp first, then the channel frozen in the snapshot, then the release line. It is used in list, copy, lock and file, and every query that feeds it includes `snapshot` (lines 158, 303). Behaviour for stamped copies is unchanged. Copies with no stamp yet (queued, running or failed) now follow the person's frozen channel instead of the release line, which is an improvement.
* **The stamp itself:** `run()` (line 287) sets it once, from the frozen channel. A copy generated after a switch to Paper or PDF upload was therefore already unstamped on main. The main fix in this file is the new refusal in `validated()` (line 380).
* **`validated()` line 380:** the check sits outside the transaction, which is safe because the stamp never changes after GENERATED. The 409 wording is honest. I saw it live as a toast: "This copy of IMM 5257 was made while it was filed Online, so it is stamped "Copy, not for filing" and is not validated. Make a new copy, validate that one and read it back."
* **Who may switch a channel is unchanged (claim confirmed):** `channelChange` and `allowedChannels` (prepare.ts:102-115) and the PATCH route are not in the diff. Live, the client got 403, and Paper without a reason got 400 on `reason`. No breaker run is needed.
* **Files outside the row's list are justified:**
  * `api/src/case-prepare.ts:300` removes the `lineOnline` argument. Without that, the removed option would be a TypeScript excess-property error.
  * `tests/check_vv_prepare_store.ts:101-106` held two assertions that encoded the removed "Ask the Lead" behaviour, so they had to change.
* **Does each test fail when its rule is removed?** Removing the `validated()` refusal fails "stamped copy … 409" (main gave 201, as the builder reports). Restoring `lineOnline` fails "Paper line shows its steps … never Ask the Lead".
* **The four scenarios you asked about:**
  * Paper, read back, then back to Online: no block, `validated` null, lock 409, and the copy stays unstamped. Correct.
  * PDF upload: the block is there before the read-back, the read-back gets 201, and the block is gone afterwards. It behaves like Paper.
  * Moving Paper to PDF upload reuses the unstamped Paper read-back. That is correct: it is the same copy, for filing.
  * A legacy stamped read-back still counts for readiness: finding m1.

## D1-D20 (this row's scope)
D1 Requirement fit 9: Q3 and the row's Change are met. The Paper line's steps have no screen yet (row B3).
D2 Data integrity 8: the new refusal stops new stamped read-backs. Legacy rows still count (m1).
D3 Reuse 9: one helper for four routes, and the existing readiness block is reused.
D4 Rule integrity 9: the "Ask the Lead" dead end that could never be cleared is gone.
D5 Stability and recovery 9: the 409 leads to a new copy, which validates (201).
D6 Governance 9: the switch keeps who, when and the reason (on screen in J-C3 3).
D7 AI trust: not applicable (no AI).
D8 Orientation 9: unchanged screens, case page.
D9 Flow 8: the read-back control is still offered on a stamped copy (m2).
D10 Language 9: plain refusal and block words.
D11 Feedback 9: the block appears, clears and comes back; toasts show the result.
D12 Visual 9: team components. The tripled telephone hint existed before this PR.
D13 Accessibility 9: axe clean at 1440, 1024 and 400 px; keyboard switch works; no sideways scroll. 200 % zoom not checked.
D14 Team look 9: unchanged.
D15 Speed 8: not timed against §9.
D16 Testability 8: fail-then-pass test present. A source-text assertion (m3) and no PDF upload case (m4).
D17 First use: simulated only.
D18 Provenance 9: the reason and the IRCC quote are shown; the reason is labelled Sample.
D19 Closure 8: closes J-C3 end to end on release 2. The packs are row C4.
D20 User pain: simulated only.

## Issues
1. **m1, Minor (Should): a stamped copy's read-back still counts for readiness.** `api/src/case-prepare.ts:204-209` reads every passing `validated_copy` of the form and person, and `readBackOf` does not look at the copy's stamp. So the "same rule as lock and validated" is not applied in readiness. I reproduced it live: one passing read-back row on a copy with `not_for_filing: true` on a Paper line gave four results that disagree:
   * the line `in_progress`, naming that copy, `current: true`;
   * no `barcode_not_validated` block on Ready to file;
   * the copy view "Validated copy read back";
   * lock 409.

   Only rows written by main's 201 (before this PR) can produce this. `validated()` now refuses such a row and the table is insert-only, so it is not a Major.
   **Fix:** select `copy.resultJson` and `snapshot.factsJson` in that query and drop reads whose copy is not for filing, using one shared predicate with `copyNotForFiling`. Add one fail-then-pass line.
2. **m2, Minor (Should, later screens row):** `web/src/runtime/forms.tsx:133` still shows `ValidatedState` (Read back the validated copy) on a stamped latest copy of a Paper or PDF upload line. The server refuses it with honest words, but the control is a dead end. **Fix:** hide it, or show the "Generate a new copy" words in its place, when `latest.copy_not_for_filing`.
3. **m3, Minor:** `tests/check_vv_prepare_store.ts:105-106`, the "fail" case, tests source text (`paperLine.toString()` has no `lineOnline`) instead of behaviour. The behavioural fail case lives in `check_c3_paper_validate.ts`, so this is acceptable. A behavioural `(barcode, missing 0, validated null)` case would be stronger.
4. **m4, Minor:** `tests/runtime/check_c3_paper_validate.ts` has no PDF upload case, although the row's Change names PDF upload. I verified PDF upload live (the block before, 201, the block cleared), so this is a test gap only.

## Builder's evidence
Honest where I checked it: 18/18 and 25/25 reproduced. The screenshots match my re-run (04 shows "Validated copy read back" and the toast). Steps J-C3 5, 9 and 13 are labelled as read by route because the screen comes in row B3.

## Not checked
* Graph (P-86): `tools/graph.mjs` rewrites `qa/GRAPH.md`, which I may not edit.
* 200 % zoom; a screen reader; D17 and D20 (the founder).
* The packs C7.6 -6/-10/-12/-22, C9.2 -2 to -5 and C7.7 -20 to -23 on the checkpoint, and main's 14/18 baseline.

Round 1 result: approved at 4fb292a754b45357c85177b5f1b5231736e5a178 (superseded by round 2 below).

## Round 2 (diff only, 7 Nov)
Code diff `4fb292a75..88c2b064d`. The head is c72e0dc50, which adds only evidence: README.md and runs/*.txt, with no `.ts` or `.tsx` change. That commit also deleted this file and `journey-test-reviewer-2026-11-07.md`; both are restored here unchanged, apart from round 1's verdict line.

* **m1, fixed.** `api/src/case-prepare.ts:204-208` now selects each read-back's copy `resultJson` and `snapshot.factsJson` and skips the copy when `copyNotForFiling(s, copy)` is true. That is the same predicate Validate and `lock` use, exported from `fill-case.ts` with no other change.
  * The new test line inserts one passing row for the stamped copy by SQL. It requires the insert to succeed (`!!kept`), so a missing `psql` fails it instead of passing silently.
  * On main this line fails, as the builder's log shows. On the branch it passes: `validated: null`, `to_do`, and the block stays.
  * Loading `resultJson` for each read-back costs one query per prepare and handles few rows: acceptable.
* **m3, fixed.** The test now calls `paperLine` with the removed option (`lineOnline: true`) and checks the result is identical to the plain Paper line. Restoring the old branch would fail it, so it now tests behaviour.
* **m4, fixed.** A PDF upload round trip on its own case: the block before the read-back, 201, the block gone, and the copy for filing.
* **m2, handed over (I agree).** The fix is in `web/src/runtime/forms.tsx`, outside this row's files. It is written down in README.md for a screens row. By code reading, the hand-over should also cover the copy view's "Validated copy read back" on a stamped copy that holds a legacy read-back (`fill-case.ts` `copyOf`); readiness no longer counts that read-back.
* **README.md is honest against my runs:**
  * 18/18 and 21/21 match.
  * J-C3 25/25 matches.
  * It correctly says main already followed the person's channel for readiness and Validate, so C7.6 and C9.2's named steps are not credited to this fix.
  * It says "No step goes pass → fail". I did not re-run the packs, so I could not confirm that line.
* **My runs at c72e0dc50** (one copy on :4491, fresh checkpoint, stopped afterwards):
  * `check_c3_paper_validate` 21/21 (with `PSQL` set to the local psql);
  * `check_c3_jc3_browser` 25/25;
  * `check_vv_prepare_store` 27/27 and `check_vv_prepare` 32/32;
  * `tsc -p api` 15 errors, all in `tests/`, the same as base.

There is no open Blocker or Major.

Reviewer: Approve c72e0dc5025f38cc85b61f1b0333a64d6ca303c7
