# PC — launcher run record: review (fresh context, did not build it)

Commit reviewed: `6ec43b2d` on `pc-local`, against `origin/main` `f02ef514` (`p2/runner.ts` +3/-1, `tests/check_p2_guard.ts` +11). Date 2 Nov 2026. No model call, US$0, no `--live`, no *_LIVE. No app server was started (no screen code changed), so no port was used.

## (1) Correctness against the ledger
- `ledger.reserve` throws `BudgetExceeded` (or `LedgerBusy`, its subclass) **before** `append` (`p2/ledger.ts:213-226`), so a refused attempt has no reserve line and `committed()` (`:112-121`) counts nothing for it. The runner now records it with `cost_usd: 0` (`p2/runner.ts:69`), so `launch.ts:136` (`a.cost_usd ?? a.worst_usd`) adds US$0. Matches the ledger.
- Status: `out.status` is set to `timed_out` only by a timed-out attempt (`runner.ts:105`); the refusal branch keeps it. Any earlier timeout counts, not only the first, which matches the row's intent.
- Walked through the real runner with a scratch ledger: (A) timeout then cap refused: `timed_out`, record US$0.3281 = ledger US$0.3281 (the old runner gave `budget_exceeded` and US$0.6562); (B) refused first: `budget_exceeded`, US$0 = US$0; (C) dropped connection then cap refused: `budget_exceeded`, US$0.3281 = US$0.3281.

## (2) Consumers of status and cost
- `engine/ai-run.ts explainRun`: (A) now says "The AI did not answer in time. Nothing was applied. Cost US$0.33." Before, it said "over its spending cap" with no cost, although an attempt was counted. This is an improvement.
- `isProviderLimit` / `costBesideLimit`: they match only a provider `400 … usage limit` error, and a cap refusal is never one. A limit refusal breaks the loop (`runner.ts:107`), so a limit attempt never comes before a cap refusal. No change.
- `api/src/rounds.ts launch()`: (A) now reaches the `timed_out` branch (`:176`) with `costUsd` = one worst case, where before it fell through to `:179` "could not be used (budget_exceeded)" at twice the worst case. `paidRunsOf` (`:56-57`, cost > 0 counts as a paid run) no longer counts a run refused on its first attempt as paid. That is correct, because nothing was spent.
- `api/src/sources.ts runParts` (`:403-404`) and the single-form path (`:536-550`) take `usage.cost_usd` and `explainRun`. They now get the correct cost and words, and the per-part and summed job cost follow.
- Nothing relies on `budget_exceeded` after a timeout, or on a refused attempt's worst case. The studio tests that assert these statuses use hand-made records (`check_forms_rounds.ts:123,132`; `check_ai_launch_paths.ts:132-133,159,167`), and those tests do not change.
- Re-ran with no server: `check_forms_ai_errors` 24/24, `check_forms_rounds` 70/70, `qa/check_qa_ai_paths` 25/25. Not run: `check_ai_launch_paths` (it needs an isolated server with the fake launcher, which never runs `runner.ts`).

## (3) Launch-path hash
`runner.ts` is in `PATH_CODE` (`p2/pathcode.ts:10`), so all 30 committed `p2/runs/stub-pass/*.json` are now stale for `--live`. This is acceptable:
- every Studio live path runs its own `--stub` first (`rounds.ts:133-136`, `sources.ts runParts`);
- live is off;
- earlier runner and ledger fixes (#121, #131) did the same.

The commit message says it ("every job needs a fresh --stub before --live"). The PR body should repeat that line.

## (4) Are the tests real?
- With `origin/main`'s `runner.ts` swapped in: 81/85, and exactly the four PC checks the builder named fail. File restored, `git diff` empty. Current: 85/85.
- Mutation, each half alone:
  - dropping only `cost_usd: 0` fails 3 checks (refused US$0; timeout record = ledger; refused-first fail check);
  - dropping only the status guard fails 1 check (timeout stays `timed_out`).
- So each half has its own failing test. The "fail" checks cover the other direction: a failed attempt that ran stays at its worst case and equals `ledger.committed()`, and a refused-first run stays `budget_exceeded`.

## Findings (none Blocker or Major)
- **Minor, outside this row, earlier code:** case (C) above counts US$0.33, but `explainRun` `budget_exceeded` (`ai-run.ts:87`) states no cost. The record and job cost are right; only the sentence leaves the cost out. Lead's call whether this becomes a row.
- **Minor, outside this row, earlier code:** "record cost = ledger" still does not hold when a settle cannot be written. `runner.ts:82` (ok) and `:99-100` (refused/busy) record `c` or 0 while the ledger keeps the worst case. The attempt carries `settle_error` but `launch.ts:136` ignores it. Fix: on `settle_error`, sum `worst_usd`.
- **Minor, outside this row, earlier code (confirmed by run):** a `stub` caller that fails reserves US$0 (`ledger.ts:199`) but settles at the paid worst case (`runner.ts:98`). Two timeouts put US$0.6562 into a scratch ledger. Record and ledger agree, but a stub fault would count real money against the caps.
- **Note:** the PR body should state the stale stub passes (see 3).

## Journey test (reviewer role): 9.5/10, pass
There is no screen: the person-facing result is the run record and the sentence the Studio shows. I walked that path from runner to record to `explainRun` for (A), (B) and (C). I did no browser walk or Playwright replay: the only way to get a record this runner produced into the app is a live call, which is forbidden here.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | record = ledger in A/B/C |
| Next step obvious | 1 | words unchanged except A, now correct |
| Plain words | 1 | — |
| Feedback and state | 1 | A says timeout, not cap |
| Correct data | 1 | — |
| Error recovery | ½ | C's sentence omits the counted cost |
| Accessibility and screen sizes | 1 | unchanged, no UI touched |
| Speed | 1 | unchanged, no UI touched |
| Visual quality | 1 | unchanged, no UI touched |
| Trust and sources | 1 | cost traceable to ledger lines |

Not checked: a real browser walk, a screen reader, an intended user (D17/D20 stay with the founder).

**Score: 9/10** (correct, minimal, tests fail on the old code; the PR body should state the stale stub passes).

**Verdict: Approve**
