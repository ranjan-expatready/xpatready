# Review: PR #131, P-179 follow-up (a Continue covers retries of the run it started)

Commit reviewed: **cfb98bda** (branch `claude/friendly-lamport-06zafk`). Code change against the merge base: `studio/api/src/ai.ts` (`retry`), `studio/api/src/sources.ts` (`runDraftStep`), `studio/tests/check_cost_override.ts`. Reviewer: an independent check. Cost: US$0 (scratch `P2_LEDGER_DIR` only, no `*_LIVE` switch, port 4458, stopped afterwards).

The product question (does one Continue cover retries of the same run?) is for the founder. This review judges the code on the PR's own recommendation, "retries of that same run are covered, and money stays within what the person accepted". The code does not meet that second half.

## What was run

| Run | Result |
|---|---|
| `check_cost_override.ts 4458 rv_rt` at cfb98bda | 67/67 |
| `check_ai_orchestration.ts 4458 rv_or` at cfb98bda | 22/22 |
| `check_cost_override.ts` with `ai.ts` and `sources.ts` from `origin/main` (test from cfb98bda) | 65/67. The new "Continue run is retried" check fails (400 "used its 4 paid AI attempts"), and so does the "past US$132 gives 409" check (400 instead). The "no Continue is still refused" check passes on main as well, which is expected because it guards against a regression. So the new checks do fail without the fix. |
| Probe A (scratch ledger, `SpendLedger` directly): a Continue with limits `["attempts"]` and worst case US$2, used for run key `rk-A`, then three reservations of US$2 each under that override, settled as failed | **All three admitted.** US$6 was reserved under a Continue that accepted US$2. |
| Probe B (temporary block in `check_cost_override.ts`, then `git restore`). This is the C11.8 Continue (limits `attempts`, worst US$2.76). Attempt 2 is marked FAILED after spending its worst case, and the ledger shows US$5.52 already reserved and settled under `override_id` o1. Then `POST /ai/batches/:id/retry` is called | **201, attempt 3 queued.** The API never compares what the Continue has already reserved with what the person accepted. |

Every file I touched was put back: the test file, both API source files, `studio/evidence/ai-orchestration/check_ai_orchestration.json` and `p2/screening/canary-digest.json`, which the runs had rewritten. The `p2/runs/stub-pass/*` changes in the working copy were there before this review and were left alone. Port 4458 is free.

## Findings

### Major M1: a retry can reserve more than the worst case the person accepted (attempts-only Continue)
The PR's safety claim is: "the ledger already holds the run's reservations to the worst case the person accepted (`SpendLedger.overrideRefusal`)". That holds only when a reservation passes a **ledger** limit. `reserveNow` builds `passed` from `experiment`, `run` and `wave` only. `attempts` is never a ledger limit, so `overrideRefusal` and its `used + worstUsd > o.worst_usd` test **never run** for a Continue that passed only `attempts`. That is exactly the C11.8 case this PR targets (`cost_check.over` = `attempts`).

The new `continued()` exemption in `retry` also skips `paidRetryAllowed` (the per-run paid-retry rule), and `retryable` includes `FAILED` (a run that failed after it was sent and paid). As a result:
- one click lets the form run up to `MAX_ATTEMPTS_PER_SOURCE` = 3 times, each with up to `MAX_ATTEMPTS` = 2 paid calls, each at the full worst case;
- spend can reach about 3× the worst case shown in the dialog, past the per-form budget of 4 paid attempts, limited only by the US$120 experiment cap.

Probes A and B show this end to end. This contradicts P-179 as amended by the lead on 30 Oct: "one click covers only that run's worst case".

**Fix (small).** Hold every reservation that carries an override to that override's accepted worst case, whether or not a ledger limit is passed. For example, in `reserveNow`, when `opts.overrideId` is set, always check `sum(reserve.worst_usd where override_id) + worstUsd <= o.worst_usd`. Also make `retry` refuse up front, in words, when the Continue's reservations so far plus the retry's worst case exceed `o.worst_usd`. Then a retry of a run that was stopped before it was sent (US$0 reserved) still goes through, which is the PR's stated purpose, and a run that already spent cannot spend again on the same click. Add a failing check for each: the ledger unit (probe A) and the API (probe B).

### Minor m1: the retry's money check switches to the ceiling for any Continue, even one that did not name `experiment`
`if (ov) { committed + worst <= OVERRIDE_CEILING_USD }` replaces the remaining-cap check for the whole batch, even when the Continue passed `attempts` only. If committed + worst lands between the cap and the ceiling, the API accepts and queues the retry. The ledger then refuses at reserve time, because the override does not name `experiment`, and the job fails after being queued. No money moves, but the person gets a retry that cannot run. Use the ceiling only when `experiment` is among the limits the override names (and the cap otherwise), or reuse the plan's `cost_check`.

### Minor m2: no check for a batch with several targets, only some over attempts
By reading: `continued()` is per target (`over_attempts` on that target), so targets without the flag still go through `paidRetryAllowed` and `paidRunAllowed`. All targets share the one override's worst-case budget in the ledger once M1 is fixed. This looks right, but no check covers it. Add one: a two-target Continue batch where the target that is not over attempts and has used its paid budget is still refused.

### Minor m3: the PR text over-claims the ledger's protection
The "Why" and "Change" sections say a retry "cannot spend more than the person said yes to". For attempts-only Continues it can (M1). Correct the text along with the fix, so the founder decides on accurate terms.

## Money-safety questions asked

- **Can a retry reserve more than the accepted worst case?** Yes, for an attempts-only Continue (M1): up to about 3× in total. For a Continue naming `experiment`, `run` or `wave`, the ledger holds the total to `o.worst_usd`.
- **Can it pass US$132?** No. A Continue without `experiment` is refused by the ledger at the US$120 cap. With `experiment`, `overrideRefusal` holds the total to the ceiling, and `retry` checks the ceiling first.
- **Can it start a run that had no Continue?** No. `continued()` needs `plan.override`, which is written only at launch, inside the transaction that uses the override. The ledger also needs `override_use` and a matching `run_key`. The new "no Continue is still refused" check covers this.
- **Does passing the override to every live attempt let another run use it?** No. `launchArgs` takes it from the job's own batch plan. `overrideRefusal` refuses another `run_key` and an override that was never used. No code copies `plan.override` to another batch. Inside the batch, every step already carried it on its first attempt, and the shared per-override total covers them together once M1 is fixed.
- **Batch with several targets, some over attempts:** behaves right by reading. Untested (m2).
- **Do the new checks fail without the fix?** Yes: 2 of the 3 fail on main's source, and the third is a regression guard.

## Journey test
Not applicable to this change: it is API-only, and no screen, words on a screen or flow changed. Not scored. The Retry button's behaviour is covered above at the API.

Verdict: Ship after fixes

To fix before merge: M1 (hold every override-tagged reservation and the retry to the accepted worst case, with failing checks). Recommended in the same PR: m1, m2, m3.
