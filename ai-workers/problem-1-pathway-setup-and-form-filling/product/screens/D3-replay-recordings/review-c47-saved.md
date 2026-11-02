# Review: PR #530, D3 saved C4.7 PQR picks, Visitor visa

* **Commit reviewed:** `0afe1cb4c2e4884256c73d12a0b08caee7fef1cc` (the PR head), detached checkout. Merge base `96bfb10d`.
* **Kind:** saved AI results (P-227). No product code and no screen, so there is no journey score.
* **Reviewer:** the reviewer agent. I did not build this. It cost US$0: no `--live`, no `*_LIVE` variable, no model call, never :4400.
* **Method:**
  * my own Node 24 script, written outside the checkout, which re-validates each run with the contracts' Ajv and the job's output schema;
  * an independent copy of `p2/pathcode.ts pathCodeSha`;
  * quote counts done three ways: verbatim, spacing ignored, and case plus spacing ignored;
  * the shared ledger, read only;
  * the PR body's own re-check, run as given;
  * `studio/tests/check_forms_pa_track_a_jobs.ts` on an isolated copy (port 4459, `rev_pa`) of this commit;
  * the push guard over `96bfb10d..0afe1cb4`, and `git merge-tree` onto today's `main`.

## Results

| # | Check | draft `…130120961z-f7bbaa` | checker `…130134336z-f5e99a` |
|---|---|---|---|
| 1 | `contract_valid` true, `contract_errors` and `output_errors` null. I re-validated against drafting-run v0 and `pqr-picks-output.v1.schema.json` | yes | yes |
| 1 | Status completed, one attempt `ok`, `caller` live | yes | yes |
| 1 | Untruncated: output tokens far under the 4,000 limit (launch.ts:124 turns `max_tokens` into invalid_output). `output_sha256` equals the SHA-256 of `raw_output`, in both places | 1,242 | 1,095 |
| 1 | Ledger: one reserve and one settle, `"ok"`. The settled cost equals `usage.cost_usd` | US$0.09244 | US$0.08880 |
| 1 | PR body cost, tokens and counts equal the run and ledger figures. Worst case is 2 × the per-attempt reserve | 0.09244 · 0.63 · 16,900/1,242 · 13 picks, 3 unresolved | 0.08880 · 0.62 · 16,725/1,095 · 10 picks, 4 unresolved |
| 2 | Input file and SHA-256 equal the job. They also equal the SHA-256 of the committed `p1/inventory/guide-5256.text.inventory.json` (`c6bc4589…`), and `admitted` names the same file | yes | yes |
| 2 | Template and schema SHA-256 equal today's prompt and schema. Kind, combination `vv.single`, configuration version, `known` trail and settings equal the job's | yes | yes |
| 3 | Quotes found verbatim / spacing ignored / case and spacing ignored. Each quote appears exactly once, and every `unresolved.passage` is also in the guide | 13/13/13 | 10/10/10 |
| 5 | Stub pass: `path_code_sha256` equals my `pathCodeSha` at this commit and the live run's. Job id matches, it was made before the live start, and its screening sources equal the live run's digest sources | ok | ok |

* **Totals and day figure.** The PR total of US$0.181 (0.18124) and worst case of US$1.25 are right. I added every settle line for 2 Nov up to 13:02:10Z: US$9.1155, so "US$9.12 of US$25" is right. These two runs and the two C4.11 runs are the only live runs of these jobs in the ledger. None failed or went unrecorded.
* **The PR's re-check command** prints the same counts: contract_valid true, completed, one attempt, inventory checksum ok, quotes 13/13 and 10/10.

### (4) The app replays exactly this pair

* `PqrDrafts.savedRounds` (pqr-drafts.ts:89-95) does this in two steps:
  * It takes the newest usable checker among the files matching `replayPattern("studio-pqr-picks", true)`. "Usable" means `isSameSavedRun`: live, completed, contract-valid, the same template SHA, the same input list `[guide 5256 inventory]` as `inventoryFor` builds it, and context key `vv.single`.
  * It then takes the draft restricted to `pairOf(checker)`.
* Both files strip to the same stem, `temporary-residence-visitors-visitor-vis-477759eb`.
* The draft pattern's `(?!check-)` keeps the checker out of the draft round.
* No other `studio-pqr-picks-*` live file exists in the tree.
* The C4.11 files (`studio-qd-conditions-*`) cannot match the `studio-pqr-picks` patterns, so the two PRs never cross.
* Another combination's key fails `savedRunKey`.

**The suite was run, not just read.** I ran `check_forms_pa_track_a_jobs.ts` (with `--tsconfig studio/api/tsconfig.json`; without it tsx cannot parse the API's decorators) against the isolated server on 4459: **28/28 passed**.

* The "C4.7 Replay on Visitor visa" step called `/pqr-picks/plan` then `/draft` in Saved mode. It returned exactly `[…f7bbaa.json, …f5e99a.json]` at US$0.
* With launcher-shaped `fs.spouse` copies present (newer by name stamp), it still used this pair and never the other combination's.
* The shared ledger stayed at 833 lines. Afterwards the PR's 2 run files, all 4 stub passes and `canary-digest.json` were byte-identical to before (SHA-256 checked). No `pacheck` leftovers were in `p2/runs/`, and `git status` was clean.

### (5) Files and secrets

* The 5 files are where they belong: `p2/runs/` (2), `p2/runs/stub-pass/` (2) and `p2/screening/canary-digest.json`.
* Stub run files are not committed (`.gitignore:30`).
* The push guard reports `clean`.
* No API key, bearer, request id or e-mail is in the diff.
* `canary-digest.json` (SHA-256 `b0b1d7e0…`) is the one the last launch of the sequence wrote: the C4.11 checker in #531. That run records the same digest SHA and nonce `98b9245a…`. It holds only salted hashes and lengths. It is in this PR alone, as the body says, so #530 and #531 merge without conflict (`git merge-tree` clean both ways, and clean onto `main` `6e3a8136`).
* `main` has not touched p2 code, jobs, prompts, contracts, inventories, `rounds.ts`, `pqr-drafts.ts` or `draft-qd.ts` since the merge base, so the stub gate and replay still hold after merge.

## Findings

* **Blocker:** none.
* **Major:** none.
* **Minor:** none against this PR.
* **Note (existing behaviour, not this PR):** `launch_evidence.isolation.entry_script` and `ledger.file` hold the Mac's absolute paths, which include the machine's user folder name. All 264 committed run files have this, because the launcher writes it. If the no-personal-names rule is meant to cover machine paths, the fix belongs in `p2/launch.ts`, for the tech lead to decide. It should not be done per PR.

## Could not check

* CI on this commit was still **pending** (run 41449683044) when I reviewed. The merge rule needs it green; I found no test whose expectations change with a saved `vv.single` PQR pair (the C4.7 and C4.11 suites use `wp.family`).
* Whether the picks are right as immigration content is the AI's reading, which the app's two-round agreement and To review settle. It is not in this check's scope.

**Verdict: Approve** — commit `0afe1cb4c2e4884256c73d12a0b08caee7fef1cc` (CI must still finish green before merge, as for every PR).
