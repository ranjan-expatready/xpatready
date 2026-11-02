# Review: PR #531, D3 saved C4.11 step 5 conditions, Visitor visa

* **Commit reviewed:** `dcb7da634b3254da97653fd936e189cd2dc0e5a5` (the PR head), detached checkout. Merge base `96bfb10d`.
* **Kind:** saved AI results (P-227). No product code and no screen, so there is no journey score.
* **Reviewer:** the reviewer agent. I did not build this. It cost US$0: no `--live`, no `*_LIVE` variable, no model call, never :4400.
* **Method:**
  * my own Node 24 script, written outside the checkout, which re-validates each run with the contracts' Ajv and the job's output schema;
  * an independent copy of `p2/pathcode.ts pathCodeSha`;
  * quote counts done three ways: verbatim, spacing ignored, and case plus spacing ignored;
  * the shared ledger, read only;
  * the PR body's own re-check, run as given;
  * `studio/tests/check_forms_pa_track_a_jobs.ts` on an isolated copy (port 4459, `rev_pa`) of this commit;
  * the push guard over `96bfb10d..dcb7da63`, and `git merge-tree` onto today's `main` and with #530.

## Results

| # | Check | draft `…130144620z-2e8c49` | checker `…130158741z-1b68c1` |
|---|---|---|---|
| 1 | `contract_valid` true, `contract_errors` and `output_errors` null. I re-validated against drafting-run v0 and `conditions-output.v1.schema.json` | yes | yes |
| 1 | Status completed, one attempt `ok`, `caller` live | yes | yes |
| 1 | Untruncated: output tokens far under the 6,000 limit (launch.ts:124 turns `max_tokens` into invalid_output). `output_sha256` equals the SHA-256 of `raw_output`, in both places | 1,433 | 1,247 |
| 1 | Ledger: one reserve and one settle, `"ok"`. The settled cost equals `usage.cost_usd` | US$0.09646 | US$0.09148 |
| 1 | PR body cost, tokens and counts equal the run and ledger figures. Worst case is 2 × the per-attempt reserve | 0.09646 · 0.71 · 16,950/1,433 · 11 conditions, 5 unresolved | 0.09148 · 0.70 · 16,635/1,247 · 11 conditions, 3 unresolved |
| 2 | Input file and SHA-256 equal the job. They also equal the SHA-256 of the committed `p1/inventory/guide-5256.text.inventory.json` (`c6bc4589…`), and `admitted` names the same file | yes | yes |
| 2 | Template and schema SHA-256 equal today's prompt and schema. Kind `qd_conditions`, combination `vv.single`, `c411-conditions`, `known` trail and settings equal the job's | yes | yes |
| 3 | Quotes found verbatim / spacing ignored / case and spacing ignored. Each quote appears exactly once, and every `unresolved.passage` is also in the guide | 10/11/11 | 10/11/11 |
| 5 | Stub pass: `path_code_sha256` equals my `pathCodeSha` at this commit and the live run's. Job id matches, it was made before the live start, and its screening sources equal the live run's digest sources | ok | ok |

* **The quote that is not verbatim.** In each round, the one quote that only matches with spacing ignored is `Note: If you selected “other” in question 1a), provide details in 1b)`. The guide's text breaks the line inside it. That is the PR's stated rule ("ignoring case and spacing"), and the app's rules check it the same way.
* **Totals and day figure.** The PR total of US$0.188 (0.18794) and worst case of US$1.41 are right. I added every settle line for 2 Nov up to 13:02:10Z: US$9.1155, so "US$9.12 of US$25" is right. These are the only live runs of these jobs in the ledger.
* **The PR's re-check command** prints the same counts: contract_valid true, completed, one attempt, inventory checksum ok, quotes 11/11 and 11/11.

### (4) The app replays exactly this pair

* `DraftQd.conditions` (draft-qd.ts:98-106) runs `round(CONDITIONS_AI, false, ctx)`, then `round(CONDITIONS_AI, true, ctx)`. The context is `contextKey` = the combination's key (`vv.single`) and `inputs` = `[inventoryFor(guide)]`, in replay mode.
* Each round takes the newest file matching `replayPattern("studio-qd-conditions", isCheck)` that passes `isSameSavedRun` (live, completed, contract-valid, the same template SHA, inputs and key) and `conditionsShapeOk`.
* The draft pattern's `(?!check-)` keeps the checker out of the draft round.
* No other `studio-qd-conditions-*` live file exists.
* The C4.7 files cannot match these patterns.
* Another combination's key fails `savedRunKey`.

**The suite was run, not just read.** I ran `check_forms_pa_track_a_jobs.ts` (with `--tsconfig studio/api/tsconfig.json`) against the isolated server on 4459: **28/28 passed**.

* "C4.11 step 5 Replay (the rounds draft-qd.ts runs)" returned exactly `[…2e8c49.json, …1b68c1.json]`.
* With `fs.spouse` copies present, it still returned this pair.
* The shared ledger stayed at 833 lines. Afterwards the PR's 2 run files, all 4 stub passes and `canary-digest.json` were byte-identical to before. No `pacheck` leftovers, and `git status` was clean.
* As the suite's comment says, step 5 is proved through the same `StepRunner.round` calls, not the full "Draft questions and documents" screen run. Right after Reset to the six, that run stops before its steps because the field maps wait on To review.

### (5) Files and secrets

* The 4 files are where they belong: `p2/runs/` (2) and `p2/runs/stub-pass/` (2).
* Stub run files are not committed (`.gitignore:30`).
* The push guard reports `clean`.
* No API key, bearer, request id or e-mail is in the diff.
* `canary-digest.json` is left to #530. That file's SHA-256 (`b0b1d7e0…`) and nonce equal this PR's checker run's screening record.
* `git merge-tree` is clean onto `main` `6e3a8136` and together with #530.
* `main` has not touched p2 code, jobs, prompts, contracts, inventories, `rounds.ts` or `draft-qd.ts` since the merge base.

## Findings

* **Blocker:** none.
* **Major:** none.
* **Minor m1 (PR text only; no file change needed):** the body says "Replay pairs the draft and checker by their shared job stem (`rounds.ts pairOf`)". That is true of C4.7 (`pqr-drafts.ts:93` passes `replayPair`), but not of C4.11 step 5. `draft-qd.ts:104-106` passes no `replayPair`, so each round independently takes the newest usable run of its own round. For this commit the result is the same pair, because it is the only one saved, as the suite run shows. **Fix:** correct the sentence in the PR body.
* **Follow-up (existing code, outside this data PR; for the tech lead's backlog):** step 5 lacks C4.7's break-B1 guard. Suppose a later Live run of step 5 saves a completed draft but its checker round fails. Replay would then pair that newer draft with this older checker, so the two rounds would come from different runs. Passing `replayPair: pairOf(CONDITIONS_AI, true, k.runFile)` (checker first, as `savedRounds` does) would close it.
* **Note (existing behaviour):** the run files hold the Mac's absolute paths (`entry_script`, `ledger.file`), as all 264 committed runs do. If that needs changing, it belongs in `p2/launch.ts`.

## Could not check

* CI on this commit was still **pending** (run 41449753279) when I reviewed. I found no test whose expectations change with a saved `vv.single` conditions pair (`check_forms_c411_draft_qd.ts` uses `wp.family`).
* Whether the conditions are right as immigration content is settled by the app's two-round rules and To review. It is not in this check's scope.

**Verdict: Approve** — commit `dcb7da634b3254da97653fd936e189cd2dc0e5a5` (m1 is a PR-text correction, not a merge condition; CI must still finish green, as for every PR).
