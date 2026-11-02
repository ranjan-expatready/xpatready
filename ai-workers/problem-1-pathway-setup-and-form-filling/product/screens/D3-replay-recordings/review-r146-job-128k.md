# Review: PR #508, R-146: 128k output for whole-form field maps of 240+ fields

* **Commit reviewed:** `ce05d8c010e1019572483ce3ee49dc36d9e77d57` (branch `claude/paid-runner-r146-job-128k`). I read this exact commit through `git archive`. The shared worktree had already moved to another branch (`claude/paid-runner-r146-saved-maps-1`, 85d30cfb) while I worked.
* **Kind:** a cost and settings change on the paid AI path. It is not a screen, so there are no D1–D20 scores and no journey score (the caller agreed).
* **Cost:** US$0. Nothing ran live, no `*_LIVE` was set, nothing was clicked, and nothing used :4400 or the isolated :4458 copy. The worktree was on another commit, so I checked statically and with offline scripts on the extracted commit.

## What I checked, with evidence

**(1) The job files match ensureJobFile byte for byte, and the right forms cross 240.** I re-ran `ensureJobFile`'s `want` logic in Python over all 16 `p2/jobs/studio-fieldmap-*.json`. All 16 match byte for byte, input sha256 included. The count uses fields with a `data_path`, as the code does:

| Form | data_path / all fields | Result |
|---|---|---|
| IMM 0008 | 298 / 320 | 128000 / 1500000 |
| IMM 5532 | 314 / 315 | 128000 / 1500000 |
| IMM 1294 | 245 / 257 | 128000 / 1500000 |
| IMM 1295 | 242 / 254 | 128000 / 1500000 |
| IMM 5257 | 242 / 254 | 128000 / 1500000 |
| IMM 5710 | 242 / 255 | 128000 / 1500000 |
| IMM 1344 | **233 / 245** | 64000 / 900000 (it would cross if `fields.length` were used; correctly it does not) |
| the other 9 | 19 to 136 | 64000 / 900000 |

**Stub passes.** I recomputed `pathCodeSha` (p2/pathcode.ts) for each of the six new stub passes. All six match the job files and path code at ce05d8c0. Their `screening_sources` hashes match the current answer keys and family files. `canary-digest.json` has no net change in the PR.

**(2) Other readers of `whole.settings`.**
* **draftSplit parts** (sources.ts:327). `{ ...whole.settings, max_output_tokens: partOutputTokens(n), timeout_ms: 600_000 }` replaces both changed keys. The spread keeps key order, so the bytes and path code of part jobs do not change. The 5257 part path is unaffected.
* **ai.ts `estimate`** (ai.ts:228). It reads `prepared.settings.max_output_tokens`, so it follows the new limit. It is only reached when `draftSplit` returns null (see Minor 1).
* **repeatsFailedRun / sameDraftInputs** (engine/ai-run.ts:122). `maxOutputTokens` is part of the comparison. A whole-form run that failed at 64k is therefore no longer a "repeat", and a 128k call is allowed. That is what this PR intends. Saved valid answers are still offered: `usable` filters on input sha only (ai.ts:136).
* **launch.ts:102.** The child timeout is 1,500,000 × 2 + 60,000 = 3,060 s. No API watchdog reads `timeout_ms`.
* **Speed of past runs** (52 attempts in `p2/runs`): 126–142 tokens/s, about 140 for field maps. 128k at 140 tokens/s takes about 914 s, which is within 1,500 s (it needs at least 85 tokens/s).
* **Type check.** `tsc --noEmit -p api/tsconfig.json` on the extract gives no error in `api/src`.

**(3) Guard, ledger and caps.**
* `assertRoute` (guard.ts:237) needs only a positive integer, so 128000 passes. `ledger.reserve` checks only that the amount is finite and ≥ 0, then applies the caps.
* I rebuilt each request with `p2/prompt.ts buildRequest` (Node 24). The bytes are exact: IMM 1295 gives 231,172, the same as its 20 Oct live run.
* Worst case per attempt, using the runner's bound:
  * IMM 0008: 444,962 B, **US$4.3478**
  * IMM 5257: US$3.4948
  * IMM 1295: US$3.4927
  * IMM 1294: US$3.4886
  * IMM 5710: US$3.3922
  * IMM 5532: US$3.2153
* All are below the US$5 run cap (`RUN_CAP_USD`) and below `MAX_REQUEST_BYTES` (800k). The run worst is `min(5, 2×)`, which is US$5.00 for all six.

**(4) Suites.** No suite under `studio/tests` pins 64000, 900000 or a whole-form worst case for these six forms:
* `check_ai_drafting` A3 uses IMM 1344, which is unchanged.
* `check_forms_p80_guard` writes its own hand-made job files.
* `check_forms_c33_*` copy the settings from the job file.
* `check_s6_field_drafts` tests the edition-round `stepFor` path.
* `check_forms_slice2:117` expects IMM 5257 to be planned in parts, and it still is.
* `check_qa_ai_paths` D only warns, using past runs.

I did not run the API suites on this commit. The builder reports `check_qa145_clean_clone` 8/8 on :4458.

## Findings

**Blockers:** none. **Majors:** none.

**Minor 1: the PR body overstates the effect in the app.** It says "In the app, the Draft dialog's 'at most US$y' for these forms rises to match." But `planDraft` (engine/parts.ts:27, `MAX_PART_FIELDS = 60`) splits every form of more than 60 fields into parts, and `draftSplit` is then non-null (sources.ts:318). So in the app these six forms are planned and run in parts with `partOutputTokens`, and their in-app worst case does not change. The whole-form 128k job is reached only by a direct `p2/launch.ts --job studio-fieldmap-immXXXXe --live` (the Mac paid runner). The studio then offers that saved run before splitting. **Fix:** correct that line in the PR body, and confirm that R-146's 0008/5532/1294/5710 runs go through the launcher directly, not through the in-app Draft. Otherwise this change does not reach those runs.

**Minor 2: the threshold leaves IMM 1344 at its limit.** The PR's own data shows that 233 fields used 63,940 of 64,000 (`studio-fieldmap-imm1344e-live-20261023t044208446z`): about 274 tokens per field. At that rate, 64k fits about 233 fields, so forms with roughly 220–239 fields are still at risk. IMM 1344 is not an R-146 form, and in the app it runs in parts, so this does not block. **Fix (should):** note it in the code comment, or take the threshold from the rate (fields × 275 > 0.9 × 64k) in a later row.

**Minor 3: some trade-offs are not stated.**
* For IMM 1294, 1295, 5257 and 5710 (US$3.39–3.49 per attempt), a second attempt after a timeout or dropped connection is now refused by the run cap. Before, US$2.11–2.21 × 2 was below US$5. Such a failure also stays counted at US$3.4–4.35 instead of US$2.1–3.1. The PR says this only for IMM 0008. It fails safe, but it belongs in the PR's cost table.
* Expected 0008/5532 runs take about 9–10 minutes. A runner started from an agent's foreground Bash (10-minute limit) needs to run in the background.

**Minor 4: the 128k limit has no source.** "128k is Opus 5.5's limit" (sources.ts:76-78) cites no source or date. If it is wrong, the API refuses with a 4xx, which settles at US$0 with no retry (runner.ts:88). The risk is low, but add the source (the claude-api model table, with its date) next to the price note in `p2/policy.ts`.

## What I could not check
* I ran no suites against an API copy for this commit: the shared worktree had moved to another branch, and :4458 serves the worktree's files. I took the builder's `check_qa145_clean_clone` 8/8 as reported.
* I did not exercise live behaviour at 128k. That needs the tech lead's Go per run (P-225).

**Verdict: Approve.** There are no open Blockers or Majors. Fix Minors 1 and 3 in the PR text before the Go for R-146. Commit reviewed: `ce05d8c010e1019572483ce3ee49dc36d9e77d57`.
