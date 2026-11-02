# PC run record: break report (commit 6ec43b2d, `git diff origin/main 6ec43b2d`)

**Claim:** the run record's cost (`p2/launch.ts:136` sums `cost_usd ?? worst_usd`) now always equals what the ledger counts for that run.
**Method:** 25 mixes through the real `runDrafting` with fake Callers (kind unmarked or stub) and a temporary `new SpendLedger(mkdtemp, cap, { waitMs: 50 })`. Each mix compares `recordCost(outcome)` with the `committed(runId)` delta, the ledger lines and `explainRun`. A settle failure is made by writing a live-holder `spend.reserve.lock` during the call. The same mixes ran against the origin/main runner. No model call, US$0, no shared ledger, no `--live`.
**Verdict:** correct for every mix where the ledger refuses a reservation. "Always equals" is still **false** when a settle fails. No Blocker.

## Major
**M1. When a settle fails, the record reports less than the ledger counts (also true before this change).**
- Cause: `runner.ts:80-81` (ok) and `runner.ts:96-98` (busy, refused_by_provider) write `cost_usd: c` or `cost_usd: 0` even when `settleOrKeep` returns an error. The ledger then keeps the worst case (`ledger.ts:341-343`).
- Rows (record / ledger delta): L ok, settle busy: completed 0.0240 / 0.3281. M busy without retry-after, settle busy: provider_error 0 / 0.3281. N refused_by_provider (400), settle busy: provider_error 0 / 0.3281.
- Nothing in the record shows the gap: the run file drops `settle_error` (`launch.ts:142` keeps only n, outcome, error, request_id, tokens, duration).
- People read the wrong cost while the cap counts US$0.33: `rounds.ts:174` "busy, so nothing was charged" (`costUsd: 0`), `rounds.ts:169` "…our setup error; nothing was charged", `ai-run.ts:92-96` "nothing was drafted or charged".
- Not a regression (origin/main gives the same numbers), but it disproves the claim, and the new tests do not cover it. Repro: rows L, M, N.

## Minor
**m1. A narrow regression (row Q).**
- Mix: `busy(retry-after 0)`, its settle fails, then the retry's `reserve` throws `LedgerBusy`.
- Old runner: record 0 + 0.3281 matched the ledger, by accident. New runner: record **0**, ledger **0.3281**, status `budget_exceeded`.
- It is realistic when another copy holds the reserve lock for 10 s or more (draft.ts uses the default `waitMs` of 10 s).
- `rounds.ts:172-174` then says "busy, so nothing was charged". Root cause is M1.

**m2. The `timed_out` exception does not cover a plain error.**
- Rows D (`error,refused(cap)`), W (override "attempts" only, error then refused for lack of room) and P (error, settle busy, reserve busy) end `budget_exceeded`.
- Record and ledger agree (0.3281), but `ai-run.ts:87` gives no cost: "would have gone over its spending cap, so it stopped. Nothing was applied."
- A dropped connection (`ECONNRESET`) keeps the omission this change fixed for timeouts.

**m3. A busy ledger lock is reported as the spending cap (before and after).**
- `LedgerBusy extends BudgetExceeded` (`ledger.ts:12`), and `runner.ts:66-69` turns it into `budget_exceeded`.
- Rows P and Q read "spending cap", but the error is "ledger busy: another process held …spend.reserve.lock".
- The cap was not reached, and a retry a moment later would work.

**m4. `timed_out` hides that the cap refused the retry.**
- Rows C, T (P-179 Continue for one attempt past "experiment") and V (Continue past "attempts", room US$0.0019) read "did not answer in time; nothing was used" (`rounds.ts:176-177`).
- The cap or Continue refusal appears only as the last error (under Details in `explainRun`, absent from `rounds.ts`), so a person will retry straight into `budget_exceeded`. The money is right.

**m5. A stub caller's failed attempts settle at the paid worst case (outside this change).**
- `ledger.ts:199` reserves US$0 for a stub, but `runner.ts:96` settles a failed stub attempt at `worst`.
- Rows R and S: ledger delta 0.6562 for a stub run. Record and ledger agree only because both are wrong.
- Theoretical: the stubCaller at `draft.ts:26` does not throw in practice.

## What held (record = ledger delta to 1e-9, new runner)
- A ok, 0.024. B error,error, 0.6562. G busy without retry-after, 0. H refused_by_provider, 0. I timeout,timeout, 0.6562. J timeout,ok, 0.3521. K timeout,error, timed_out 0.6562.
- Rows fixed by the change (old record / ledger in brackets):
  - C timeout then cap refusal: timed_out, 0.3281 (old budget_exceeded, 0.6562 / 0.3281).
  - E refused at attempt 1: 0 (old 0.3281 / 0).
  - F busy, another copy reserves during the wait, then the cap refuses: 0 (old 0.3281 / 0).
  - O timeout, settle busy, reserve busy: timed_out, 0.3281 (old 0.6562).
- Overrides: T past "experiment", refused past the ceiling, timed_out 0.3281; U two worst cases, timeout,ok, 0.3521; V and W room exhausted, 0.3281; X does not name the passed limit, 0.
- All ten mixes that differed on origin/main (C D E F O P T V W X) now agree. A `refused_before_call` never reserves, so `cost_usd: 0` is exact on every path, including `LedgerBusy` and override refusals.
- Stub suites pass at US$0: `tests/check_p2_guard.ts` 85/85, `studio/tests/check_forms_ai_errors.ts` 24/24, `studio/tests/qa/check_qa_ai_paths.ts` 25/25.
- Not run: `check_ai_launch_paths.ts` (needs a server on :4453) and `launch.ts` end to end. Its sum was reproduced with the same formula.

## Repro
- `/tmp/claude-0/-home-user-xpatready/4ae5f8da-08e7-51ec-95bd-ede32c381d49/scratchpad/pc_break.ts` (new runner) and `…/pc_break_old.ts` (origin/main runner).
- Run each with `/home/user/xpatready/.tools/node-v24.21.0/bin/node <file>`. It prints EQ or DIFF, status, record, ledger delta, ledger lines and the `explainRun` sentence per row.
