# Break report: PR #508, R-146 128k whole-form field-map jobs

* **Commit attacked:** `ce05d8c010e1019572483ce3ee49dc36d9e77d57`. The shared worktree moved to `claude/paid-runner-r146-saved-maps-1` while I worked, so every check ran on a detached copy of this exact commit in my scratchpad. The checks used the real functions: `ensureJobFile`, `wholeFormOutput`, `buildRequest`, `runDrafting`, `SpendLedger`, `hasStubPass` and `explainRun`.
* **Cost: US$0.** Every check used a fake, unmarked caller and a scratch ledger. Nothing ran with `--live`, no `*_LIVE` variable was set and nothing was clicked. The shared ledger was only read: US$40.78 committed, US$5.01 in Wave 1.
* **:4458 not restarted.** It was serving the builder's own copy, started 16:08 from the shared worktree while it was on the other branch. A restart would have killed their work and tested the wrong code, so I did not re-run QA-145 live. The byte-level check under "What held" stands in for it.

## Findings

**Blockers:** none.

**Major 1: after a timeout, the run record says twice what the ledger holds, and more than the US$5 run cap.**
* **What I did.** I ran `runDrafting` with the committed IMM 1294 job (128k) and a caller that times out.
* **Expected.** The run's recorded cost equals the ledger's count, and the words say what is counted.
* **Actual.**
  * Attempt 1 times out and stays counted at its worst case, US$3.4883.
  * Attempt 2 is refused by the run cap (`run cap US$5: committed 3.4883 + worst case 3.4883`). Nothing is reserved for it.
  * `launch.ts:136` still adds `a.cost_usd ?? a.worst_usd` for that refused attempt. The run record's `usage.cost_usd` is therefore **US$6.9766**, against a ledger count of US$3.4883. For IMM 0008 it would be US$8.70 against US$4.35.
  * The run ends as `budget_exceeded`, not `timed_out`. `explainRun` (engine/ai-run.ts:87) says only "The run would have gone over its spending cap, so it stopped. Nothing was applied." It gives no cost, and it hides that US$3.49 is counted.
  * In the app, a FAILED whole-form job copies `usage.cost_usd` into the job's cost (sources.ts, launch() failure branch). The saved-runs list shows the same figure.
* **Why it is new.** Before this PR, IMM 1294, 1295, 5257, 5710 and 5532 fitted two 64k attempts. A double timeout then ended `timed_out`, and record and ledger agreed (US$4.42 for IMM 1294). Now every timeout or dropped connection on all six forms takes this path. IMM 0008 already did at 64k (US$6.14 recorded against US$3.07 counted).
* **Where.** `p2/launch.ts:136`, `p2/runner.ts:67`, `engine/ai-run.ts:87`.

**Minor 2: `timeout_ms` does not limit a streamed call.**
* **What I did.** I read how the SDK applies `timeout_ms` (`@anthropic-ai/sdk` 0.131.0, `client.js` 664-675).
* **Expected.** "1,500 s covers about 128k" (sources.ts:76-78 and the PR body) bounds the call.
* **Actual.**
  * The SDK arms its timer around `fetch` only and clears it once response headers arrive. A streamed body is never timed.
  * The only real limit is the launcher's kill timer, `timeout_ms × max_attempts + 60 s` (`launch.ts:102`). That is now 3,060 s, up from 1,860 s.
  * `runDrafting` holds the shared ledger lock for the whole call (`runner.ts:62`), and `withLock` refuses a live holder at once (`ledger.ts:355-360`). While a 128k run is going, every other drafting process on this Mac that shares that ledger is refused with "ledger locked by another runner". That includes US$0 stub passes from the demo and from isolated copies. The longest window grows from 31 to 51 minutes.
* **Where.** `client.js` 668-675, `launch.ts:102`, `runner.ts:62`, `ledger.ts:355-360`.

**Minor 3: the committed IMM 1295 job is not what `ensureJobFile` writes.**
* **What I did.** I ran the real `Sources.ensureJobFile` for the six forms, then ran `git diff`.
* **Expected.** All six files stay byte-identical, as the PR body says and as the review's "all 16 match" says.
* **Actual.**
  * Five files are identical.
  * `studio-fieldmap-imm1295e.json` is rewritten from the v1 template and schema to v2: `field-map.v1.md` becomes `field-map.v2.md`, with the matching output schema.
  * After the rewrite, `hasStubPass` turns from ok to **false**, so the IMM 1295 stub pass committed in this PR becomes stale.
  * IMM 1295 is listed in `studio/samples/programs.json`. The first plan that touches an IMM 1295 attachment therefore leaves the clone dirty and voids the stub pass. QA-145 did not exercise this.
  * The v1 text was already there before this PR, but the PR edited this file and claims it matches. A direct live run of this job would send the v1 prompt.
* **Where.** `sources.ts:257-271`; `p2/jobs/studio-fieldmap-imm1295e.json`.

**Minor 4: one size of large form now hits a dead end, with no warning first.**
* **What I did.** I simulated a form of 240 or more fields whose request is 700,000 bytes. That is under `MAX_REQUEST_BYTES` (800,000).
* **Expected.** It is warned about before the click, or it runs.
* **Actual.**
  * At 128k one attempt's worst case is US$5.3947. It is refused before any call (US$0) by the run cap. At 64k the same request reserves US$4.11 and runs.
  * The break-even is about 608,000 request bytes. Before this PR it was about 928,000, which `MAX_REQUEST_BYTES` already made impossible.
  * The plan cannot warn about it. `runWorstUsd` caps every target at US$5.00 (engine/cost-check.ts:32), and ai.ts:166 passes that capped figure as `run`. The run-cap check never fires and no Continue is offered.
  * No current form is affected: IMM 0008's request is the largest at 444,962 bytes. Only direct launcher runs are exposed, because the app drafts these forms in parts.

**Minor 5: a bad inventory now breaks the whole plan, in every mode.**
* **What I did.** I read where the inventory is now parsed, and tried a `fields` value that is not a list.
* **Expected.** A bad inventory makes one form "not eligible".
* **Actual.**
  * `ensureJobFile` now parses the inventory (sources.ts:263-264). ai.ts:133 calls it before the mode branch at ai.ts:139, so REPLAY (Load sample) and STUB plans parse it too. Before, they never did.
  * If `fields` is not a list, the call throws `TypeError: (x.fields ?? []).filter is not a function` (reproduced). Text that is not JSON throws a `SyntaxError`.
  * The plan loop has no catch per form, so one bad file fails a plan of up to 400 combinations.
  * Only a damaged or hand-edited inventory can trigger it.

**Minor 6: no test pins the new rule.** No check in `studio/tests` pins 239 fields → 64k, 240 fields → 128k, or the six files' settings. QA-145 checks only that a load changes no file.

**Already disclosed, confirmed:**
* IMM 1344 has 233 fields and stays at 64k, yet it used up to 63,940 tokens (`studio-fieldmap-imm1344e-live-20261023t044208446z`). That is about 274 tokens a field, so a form of 233-239 fields with the same density would be cut off.
* A second attempt after a timeout is gone for all six forms (simulated). It is the cause of Major 1.

## What held
* **No reservation can pass US$5.**
  * Worst case per attempt (runner bound, exact `buildRequest` bytes): IMM 0008 US$4.3478, 1295 US$3.4959, 5257 US$3.4948, 1294 US$3.4886, 5710 US$3.3922, 5532 US$3.2153.
  * The ledger refuses `run + worst > 5`.
  * After a busy (US$0) first attempt, the retry fits: US$0.024 committed.
  * A Continue stays within the worst case the person accepted, which is capped at US$5.00.
  * The experiment and Wave 1 caps are unchanged. Room today is US$79.22 and US$54.99.
* **Boundary values.** 239 → 64000/900000. 240 → 128000/1500000. 0 and NaN → 64k. An inventory without `fields`, and the 15 text inventories, give 0 → 64k with no crash.
* **The parts path is unaffected.** Line 327 replaces both changed keys: `partOutputTokens` (64k at most) and 600,000 ms. Part jobs and their saved answers are unchanged.
* **The app's "at most US$" figure.**
  * Every form over 60 fields runs in parts (`MAX_PART_FIELDS`), so the dialog for these six forms is unchanged.
  * The whole-form estimate (ai.ts:228) follows the job's limit and is capped at US$5.00. That is at or above the runner's real maximum per run (US$4.35), so it never shows less than the runner can spend.
* **Load sample and Reset write nothing new.** 15 of the 16 whole-form jobs are byte-identical to the real `ensureJobFile` output, including five of the six changed files; IMM 1295 is the exception (Minor 3).
* **Stub passes.** The six stub passes match the path code and the current screening sources (`hasStubPass` ok).
* **Saved answers.** Saved 64k answers stay usable: `savedRuns` validity ignores `max_output_tokens`.
