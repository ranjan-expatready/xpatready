# Review: PR #131, P-179 follow-up (a Continue covers retries of the run it started), the fixes in 3da6779f

Commit reviewed: **3da6779f** (branch `claude/friendly-lamport-06zafk`). The fix is `468f5102..3da6779f`: `engine/cost-check.ts` (`ceilCents`), `studio/api/src/ai.ts` (`estimate`, `retry`), `studio/api/src/sources.ts` (the A4 total), `studio/tests/check_cost_check.ts`, `studio/tests/check_cost_override.ts`. The whole change is `git diff origin/main 3da6779f`. Reviewer: an independent check. Cost: US$0. I used a scratch `P2_LEDGER_DIR` (`/tmp/rv131b/ledger`) and no `*_LIVE` switch. I used port 4458 only, and it is free again. I ran the mutation runs in a scratch copy of the commit (`git archive 3da6779f` into `/tmp/rv131wt`, since removed), never in the working tree.

This review replaces the review of 468f5102. Its M1 (rounding) is fixed in the code, and the probe below confirms the fix. Its m2 and m3 are fixed and guarded. One Major remains: no product check fails when the M1 fix is undone.

## What was run

| Run | Result |
|---|---|
| `studio/tests/check_cost_check.ts` | 101/101 |
| `studio/tests/check_cost_override.ts 4458 rv_rt` | 70 passed, 0 failed |
| `studio/tests/check_ai_orchestration.ts 4458 rv_or` | 22/22 |
| `tests/check_p2_launch.ts` | 60/60 |
| Mutation A+B (copy): the `by !== actor.id` refusal turned off, and `pastCap` forced false in `retry` | `check_cost_override` 63/70. The m3 check fails (201 "Retrying 1 step"). The m2 check fails (409 with the cap's words, not the founder's ceiling words). Five more fail because a job is left queued. **Both new API checks guard their fixes.** |
| Mutation C (copy): `estimate` back to `round(...)` (ai.ts:228), and the A4 total back to `Math.round` (sources.ts:326) | **All four suites still pass**: 101/101, 70/70, 22/22, 60/60. No check fails when the M1 fix is undone (Major M1 below). |
| Probe E (copy, `/tmp/rv131b/probe/est.mts`): `Ai.prototype.estimate` on a saved run with `request_bytes` 151,000 / 151,234 / 120,003 / 98,765. The Continue is recorded at the plan's worst case, then the runner's exact per-attempt figure is reserved twice in a scratch ledger. | At 3da6779f the plan shows US$3.79 / 3.79 / 3.54 / 3.37, and **both attempts are admitted every time**. With mutation C, 151,000 bytes gives US$3.78 and attempt 2 is **refused** ("US$1.8920 more … above the US$1.8880 left"). The fix works in the real plan path, and a check like this one tells the two apart. |

Every file the suites changed is restored with `git restore`: `p2/runs/stub-pass/*.json` (5), `p2/screening/canary-digest.json` and `studio/evidence/ai-orchestration/check_ai_orchestration.json`. The probe's temporary run files were deleted.

Note for the builder: while this review ran, `studio/api/src/ai.ts` (from 06:20:31) and `studio/tests/check_cost_override.ts` changed in this working tree. Those edits are not mine and not a suite's. The `ai.ts` edit is a `planOv` tidy of `retry`. My four suite runs had all finished by 06:20:30, so they ran on 3da6779f as committed. I left those edits in place. They are not reviewed here.

## Money-safety questions asked

- **Does rounding up ever let spend pass a cap or the ceiling?** No. Every limit is checked against the exact figures at reserve time. The experiment, run and Wave 1 caps (`ledger.ts:210-212`) and the ceiling (`overrideRefusal`, `ledger.ts:251`) use the exact unrounded `worstUsd` the runner reserves. The rounded-up figure is used in three places, and each one only refuses earlier:
  - It is the plan's worst case, checked against the remaining cap and the launch limit (`ai.ts:268`, `ai.ts:278`).
  - It is the Continue's recorded worst case, checked against the ceiling when the Continue is recorded (`ledger.ts:160`).
  - It is the override's room, which caps the sum of the run's own reservations.

  The room is less than one cent larger than 2 × the exact per-attempt figure. It cannot admit a third attempt: `max_attempts` is 2, and any attempt costs at least US$1.28 for its 64,000 output tokens alone. A retry cannot use that slack either, because its up-front check needs the target's whole planned worst case.
- **Does any plan, display or check now disagree with what reserve does?**
  - *Whole form:* no. `estimate` uses `request_bytes + 2,000`, the same as `inputTokenBound` in the runner, and then rounds up. Probe E confirms this.
  - *Totals and the retry's `worst`* (`ai.ts:160`, `ai.ts:470`): these still use `round`, but they add figures that are already whole cents, so they only remove float noise.
  - *A4 parts:* each part's `worst_usd` is still rounded to the nearest cent (`sources.ts:322`). The new `Math.ceil` on their sum (`sources.ts:326`) adds whole cents, so it is a no-op. It stays safe only because of the plan's margin (`bytes + 8,000` on the indented part file, against the compact request + 2,000), not because of rounding (m1).
  - *The finder* already rounds each step up (`finder.ts:188`). *People AI* rounds to the nearest cent, but it has no Continue path and its `2 ×` factor is generous. Neither is changed by this PR.
  - *The web* does not recompute the worst case. It shows the plan's figure.
- **Does any other suite assume nearest-cent worst cases?** No. I searched `studio/tests` and `tests` for hard-coded US$ figures. The only fixed amounts are `worst_usd` values fed into `explainRun` and `record` (check_forms_ai_errors, check_forms_rounds: 0.43, 0.22, 0.3), override fixtures in check_cost_check (9.99, 132.01), the cap words, and the paid total in check_ai_drafting (6.10). None comes from `estimate` or `draftSplit`. check_cost_override reads `worst` from the plan. Mutation C shows the suites do not depend on the rounding direction either way.
- **Do the new checks fail without the fixes?**
  - m3 and m2: yes (mutation A+B).
  - M1: no, because the checks call `ceilCents` and the ledger with a hand-built figure, never the plan (Major M1).

## Findings

### Major M1: no product check fails when the rounding fix is undone
The new checks in `check_cost_check.ts:174-181` never call `estimate` or `draftSplit`. One asserts `ceilCents(1.892 * 2) === 3.79`. The others record a Continue at `ceilCents(...)` or `Math.round(...)` computed inside the test and reserve against it. With `ai.ts:228` back to `round(...)`, every suite still passes (mutation C). The previous review asked for this fix "with a failing check". The fix itself is right (probe E), but nothing stops it from regressing. If it did regress, a Continue run's own second attempt would again be refused in about half of cases.

**Fix (small).** Add one check that goes through the plan path. Two ways to do it:
- Call `Ai.prototype.estimate` with a saved run whose `request_bytes` is 151,000. Assert `worst === 3.79`. Then reserve the runner's exact figure twice under a Continue at that worst case, and assert both attempts are admitted. Probe E does exactly this and fails on mutation C.
- Or take the plan from the API in `check_cost_override` with a seeded run of that size.

### Minor m1: A4 parts are still rounded to the nearest cent, so the new "rounded up" total is a no-op
`sources.ts:322` stores `Math.round(worst * 100) / 100` per part. `sources.ts:326` then rounds up the sum of those whole-cent values, which changes nothing. The commit message and the code comment ("rounded up to the cent, never down") therefore overstate what the code does. This is money-safe. The A4 plan bound has cents of margin per attempt over what the runner reserves (measured in the previous review for IMM 5257), so a rounding loss of up to half a cent per part does not bite today. **Fix:** use `ceilCents(worst)` per part. The sum is then right as it stands.

### Nit n1: `ceilCents`'s tolerance is ten times looser than the ledger's
`Math.ceil(n * 100 - 1e-6)` drops an excess of up to 1e-8 USD, but the ledger tolerates only 1e-9 (`ledger.ts:223`, `ledger.ts:250`). Today this cannot happen: prices are whole US$ per million tokens (4 and 20), so every worst case is a multiple of US$0.000004. It would matter only if a fractional price were added. `1e-7` (1e-9 USD) would match the ledger.

### Nit n2: a Continue missing from the ledger gets the "another person" words
`by` is `undefined` when the ledger has no such override, so `retry` refuses with "continued past a cost limit by another person". It never reaches its own message, "the Continue is not in the spend ledger", which is now dead code. It is still a 409 and nothing is queued, so this is about wording only.

### Carried to the PR's question to the founder (not re-judged here)
- Earlier m1: under a Continue, an A4 run with a part already sent counts the target's whole worst case on retry.
- Earlier m4: there is no check for a batch where only some targets are over their attempts.

### Fixed since 468f5102
- Earlier M1: fixed in `estimate` (probe E). Its guard is Major M1 above.
- Earlier m2: fixed and guarded. The check fails when the ceiling branch is bypassed.
- Earlier m3: fixed and guarded. Only `override.by` may retry under the Continue, and the check fails without the refusal.

## Journey test
Not scored. The change is API and ledger only. No screen or flow changed. The only change people see is one new Retry error text: "This run was continued past a cost limit by another person: only they can retry it. Start the draft again to look at the cost and choose Continue yourself." It is plain and gives the next step. I did not check a live paid call (US$0 rule) or the graph tool (it rewrites `qa/GRAPH.md`).

Verdict: Ship after fixes

To fix before merge: M1 (a check through `estimate`, or through the API plan, that fails with nearest-cent rounding). Recommended in the same PR: m1 (`ceilCents` per A4 part). n1 and n2 are optional.
