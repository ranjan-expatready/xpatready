# Break report 2: P-179 cost warning + Continue on the QA-90 shared ledger, after the FIX (backend path, 30 Oct)

Copy `claude/gallant-hertz-60664a` @ `3b1e4c39` (code = `c950b098`). Disk was 5 GB free, so an isolated copy `fx7_brk2` ran on :4459 with `P2_LEDGER_DIR=<scratchpad>/ledger`, `STUDIO_HOLD_QUEUE=1` and no `*_LIVE` switch. It was stopped at the end, and the working tree is clean. The ledger attacks used new scratch folders and `SpendLedger` directly. No launcher ran, no priced button was clicked, and nothing was spent (US$0). The real shared ledger `.tools/p2-ledger` was only read, through a scratch copy: 753 lines (370 reserve, 383 settle), 0 orphan settles and no settle above its worst case. It passes the new amount checks: committed US$38.89, Wave 1 US$3.13. `prototype/p2/ledger/spend.jsonl` does not exist in this copy. Scripts: `<scratchpad>/attack_ledger.ts`, `attack_api.ts`, `attack_lock.ts`, `race.sh`, `sigterm.sh`. Earlier report: `break-report-p179-1.md`.

## Earlier breaks, tried again
| Earlier | Result now |
|---|---|
| **B1** stub refused past a cap | **Fixed.** `reserve(…,1.38,5,"stub")` at US$119.50 and a US$6 stub with a US$5 run cap are both RESERVED at US$0. The `unmarked` caller is still refused, and a `NaN` stub is refused. The end-to-end run in `check_p2_launch` §12 was read, not run again, because it writes run records into the copy. |
| **M1** malformed amounts | **Fixed for reserve/settle.** No `worst_usd`, -50, `"4"` and `settle -100` each stop reserve, the Continue and the wave sum with `BudgetExceeded` in words. `settle(Infinity)` is refused. See n4 for override lines. |
| **M2** Continue past US$132 | **Fixed.** A Continue is recorded, then US$12.01 of spend is added (same run key, `can_continue:false`). The launch answers 409 "past the US$132.00 … The founder must raise the cap": 0 used, 0 queued. |
| **m1** refusal spends the Continue | **Fixed.** Two Continues, two launches at once: 409 "Being mapped…" and 201. Exactly 1 `override_use`. |
| **m2** double click, one key | **Fixed.** 201/201 with the same job and 1 use. A later retry with the same key gets 201 and the same job. |
| **m3** unspent Continues not held | **Fixed while unused.** A second Continue at US$125 is refused ("6.0000 held by other Continues not started yet"). The gap left once the Continue is used is n2. |
| **m4** two totals | **Fixed.** With an orphan settle, `cost_check.spent` is 118.62, the same as `ledger.committed` (118.62). |
| **m5** loose body | **Fixed.** An unknown field at the top level or in `start` gets 400 in words. A 501-character `reason` gets 400. A `reason` object gets 400. |
| **m6** 6 MB / garbage line | **Fixed.** 6 MB gets 413 in words. A non-JSON ledger line gets 503 "AI starts are stopped…" for the LIVE and STUB plans. |
| **m7** another person's Continue | **Fixed at the ledger** (`useOverride(id,key,"user-Z")` is refused "recorded by another person"). The API passes `actor.id` (`cost-gate.ts:66,78`). Not testable over HTTP: only one author persona exists. |

## Blocker
None found.

## Major
**N1. A drafting process stopped or crashed during a call leaves the one-runner lock `spend.lock` in the shared folder. Every copy's AI steps then fail until a person deletes it.**
* Cause: `withLock` (`p2/ledger.ts:225-230`) removes the lock only in `finally`, and that does not run on SIGTERM or a crash. Stop sends SIGTERM to the launcher's process group (`studio/api/src/sources.ts:488`). Nothing breaks a stale `spend.lock`; `spend.reserve.lock` got that treatment in review m9, this lock did not.
* Reproduction (`sigterm.sh`, scratch ledger):
  1. A process holds `withLock` and has reserved, as `runDrafting` does during a call (`p2/runner.ts:63`).
  2. `kill -TERM` it: `spend.lock` stays.
  3. The next `withLock` is refused "ledger locked by another runner".
* Effect: in the Studio, `launchOnce` retries 60 × 2 s (`sources.ts:455`), then the step fails. This includes the free stub pass, so every Continue run, finder round and field-map draft in every copy fails.
* Why it is new: before QA-90 this blocked one copy; now the folder is shared.
* Expected: a stale `spend.lock` is detected (pid or age, like `breakStaleLock`), or released on SIGTERM.

## Minor
* **n1. The API process stops answering everyone while it waits on `spend.reserve.lock`.**
  * Cause: `atomically` waits with `Atomics.wait` on the main thread (`p2/ledger.ts:199`). The API calls it from `recordOverride` and `spendOverride`.
  * Measured (`attack_lock.ts`):
    * Another process holds a fresh lock for 8 s: a `GET /session` sent meanwhile took **7,799 ms**. The launch then answered 201 with 1 use.
    * The same lock held 12 s: `GET /session` took **10,551 ms**. The launch got 503; the Continue stayed unused and the transaction rolled back (good).
    * A lock whose holder crashed 1 s ago: `POST /ai/overrides` gets 503 after 10,096 ms, and `GET /session` meanwhile took 9,879 ms. Each further call freezes again until the lock is 30 s old.
  * A keep-alive client got `ECONNRESET` after a freeze.
  * The 503 words for "ledger busy" say "Ask the Lead to fix the ledger line" (`cost-gate.ts:84`), which is wrong for a busy lock.
  * Expected: an async wait, or a short try in the API; words that say "busy, try again".
* **n2. A Continue that has been used, but whose run has not reserved yet, holds nothing against US$132.**
  * Cause: `heldByOverridesUsd` drops used Continues (`ledger.ts:96-99`), and `committed()` counts only reservations. The run waits in the queue and the stub pass first.
  * Reproduction (`attack_ledger.ts`, committed US$125):
    1. Continue X (US$6) is recorded, and a second Continue is refused (correct).
    2. X is used: held is now 0.
    3. Continue Y (US$6) is **recorded**.
    4. X reserves 6. Y's run, already started, is refused at `reserve` ("committed 131 + 6 … past the US$132 ceiling").
  * This is the m3 case, moved to the window between use and the first reserve. Money stays at or below US$132.
  * Expected: hold a used Continue's worst case until its run has reserved or ended.
* **n3. A NUL character in `reason` records the Continue but answers 404.**
  * Reproduction: `POST /ai/overrides` with `reason:"a\u0000b"`. The `override` line is written (`ledger.ts:113`), then the audit insert fails (`ai.ts:342`, Postgres "invalid byte sequence").
  * The answer is **404 "Not found (it may have been removed by a reset)"** (`main.ts:168`): no id is returned and no `ai_override` audit row is written. The line holds US$2.76 against US$132 for 10 minutes.
  * Zod lets `\u0000` through (`contracts/cost-check.ts:32`).
  * Expected: refuse control characters in `reason`, or write the audit before or with the ledger line.
* **n4. Override lines are not checked like amounts.**
  * `counted()` checks only `reserve` and `settle` (`ledger.ts:84-86`). Seed merges lines without checking them (`seed-shared-ledger.ts:18`). With US$119 committed:
    * An override line with `worst_usd:-100` lowers what is held, so a new US$6 Continue is RECORDED.
    * `worst_usd:"6"` makes `recordOverride` throw `TypeError: held.toFixed is not a function`. That is not `BudgetExceeded`, so the answer is 500, not 503 in words.
    * An override with **no `expires_at`**, recorded on 1 Jan, is still used and reserved today: `Date.parse(undefined)` is NaN, so it never expires (`ledger.ts:133`, `cost-gate.ts:67`).
    * `limits:"experiment,wave"` (a string) passes `.includes` in `overrideRefusal`.
  * These lines arrive only by hand edit or seed. Expected: the same fail-closed check for override lines.
* **n5. Seed can drop a `settle` (found by reading).**
  * `settle` appends without the reserve lock (`ledger.ts:219-222`). Seed reads, writes a temporary file, then renames (`seed-shared-ledger.ts:27-33`).
  * A settle appended in between goes to the replaced file and is lost. Its reservation then counts at worst case: spend is overstated, which is the safe side. Not run.

## What held
* **Roles:** `POST /ai/overrides` answers 403 for user-B, user-C, user-O, user-P and user-Q, and 401 for `system`, an unknown person and no header. 0 lines are written.
* **Hostile `overrideId` on launch:** an array, `{"$ne":1}`, 100 KB of text, `../../etc/passwd`, `123` and `true` all answer 409 "No such Continue". The launcher only takes plain words (`launch.ts:62`).
* **Odd bodies:**
  * Duplicate JSON keys: the last wins, the same as the plan, and it is recorded.
  * A `__proto__` key is accepted (201) and does nothing.
  * Duplicate limits get 409.
  * 4.9 MB of `scope.ids` gets 404 Not found, with no line written.
  * Non-English, right-to-left (RTL) and emoji text and a newline in `reason` answer 201 and are stored escaped.
* **Concurrency near the ceiling:**
  * 6 Continues at once over HTTP when only one fits: one 201 and five 409, 1 line.
  * 16 processes × 4 rounds recording Continues at US$120, and × 3 rounds with a planted 60 s stale lock: exactly 2 recorded each round (US$126, then US$132).
  * 16 processes × 6 rounds reserving US$20 with a stale lock: exactly 2 each round (US$120 cap). No `.stale-*` file is left behind.
* **Stale reserve lock:** broken by the API in 632 ms and the launch goes on.
* **Ledger amounts:** reservations totalling 1e308 make committed `Infinity`, which refuses everything. A settle of 1e300 refuses paid starts while US$0 stubs still pass.
* **Migrations:** P-179 adds none. The override lives in the ledger line, `ai_batch.plan.override` and the audit. The branch's migration diff is slice 1's.
