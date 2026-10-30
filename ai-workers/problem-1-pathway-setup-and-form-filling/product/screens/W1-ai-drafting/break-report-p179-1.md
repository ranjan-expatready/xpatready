# Break report: P-179 cost warning + override on the QA-90 shared ledger (backend path, 30 Oct)

Copy `claude/forms-fix7-4f2b4a` @ `3e2b94dd`. Isolated copy `fx7_brk` on :4459 with `P2_LEDGER_DIR=<scratchpad>/ledger` and `STUDIO_HOLD_QUEUE=1`, no `*_LIVE` switch, stopped at the end. The ledger attacks ran on new scratch folders, using `SpendLedger` directly. No launcher ran and nothing was spent (US$0). The real ledgers were only read: `.tools/p2-ledger` and `prototype/p2/ledger` each hold only clean `reserve`/`settle` lines, and both total methods give the same sum. Scope: plan-p179 §2/§4/§6 and plan-qa90. Slice 1's report is `break-report-slice1.md`.

## Blocker

**B1. A Continue past the experiment, wave or run limit cannot reach the paid call: the free stub pass before it is refused by the ledger.**
* What happens: every live step runs `launchOnce(jobId, "stub")` first, without the override. This is true for a whole form (`studio/api/src/sources.ts:495`), for each part (`sources.ts:373`) and for each finder round (`studio/api/src/rounds.ts:133`). `launchArgs` gives the override to live calls only (`sources.ts:62`, and check_cost_override asserts this).
* Why the stub is refused: the stub drafting process reserves its request's real worst case in the shared ledger, for example `"worst_usd":0.321696,"caller":"stub"` in `.tools/p2-ledger`. `reserveNow` checks that against every cap with no override (`p2/ledger.ts:134-138`).
* Reproduction (`scratchpad/attack_stub.ts`, the same `reserve` calls as `p2/runner.ts:65`):
  * Experiment cap: committed US$119.50; Continue recorded and used for limit `experiment`, worst US$2.76. The stub `reserve("job-stub",1,1.38,5,"stub")` is **REFUSED** ("experiment cap US$120: committed 119.5000 + worst case 1.3800"). The live attempt with the override would be **RESERVED**.
  * Run cap: a US$6 part, Continue for `run`. The stub is **REFUSED** ("run cap US$5"); the live attempt with the override would be RESERVED.
  * The step then fails with "stub pass failed: …" and the Continue is spent.
* Why the checks missed it: `check_cost_override` holds the queue and the browser check uses the fake launcher.
* The same cause hits free work: once a Continue has taken spend past US$120 (or the wave past US$60), every later US$0 stub start is refused by the ledger, while `costCheck` says "Fits" (`studio/engine/cost-check.ts:35-38`). This is the bug fixed in `costCheck` (§6 bug 1), but it is still in `reserve`.
* Expected: a stub pass is never refused for money it will not spend (for example, the `stub` caller is checked against no money limit), or the stub carries the run's override. Then Continue starts the paid call, as P-179 asks.

## Major

**M1. One malformed line in the shared ledger turns off the experiment and wave caps at `reserve`.** (`scratchpad/attack_ledger.ts` L3/L4)
* A `reserve` line with no `worst_usd`, next to US$119: `committed()` is `NaN`, so every `>` comparison is false and a US$4 reserve is **RESERVED** (cap US$120). Only the run cap still holds, so any number of US$5 runs pass.
* `worst_usd: -50` lowers spend to 69 and the reserve passes.
* `settle(id, -100)` is accepted (`p2/ledger.ts:176`, no check), so committed becomes -100.
* `worst_usd: "4"` adds as text (1194), and `reserve` throws `TypeError` instead of `BudgetExceeded`, which `runner.ts:66` re-throws.
* The API fails closed on the same file: plan returns 500, because `costCheck` refuses `NaN`.
* Why it matters now: under QA-90 one file is shared by every copy, and `seed-shared-ledger.ts:18` merges every copy's lines without checking them.
* Expected: `entries()`/`committed()` refuse a line whose amount is not a finite number at or above 0, with a clear `BudgetExceeded`, and `settle` checks its amount.

**M2. A Continue starts a run the server's own check says may not start (past US$132).**
* Steps: record a Continue (spend US$118.62 plus US$2.76 is within US$132). Then add spend before the wave start, so the limits and the run key stay the same. Re-plan: `run_key` unchanged, `can_continue:false`, spent+worst US$132.50.
* `POST /attachments/:id/draft {overrideId}` returns **201 Queued**.
* Cause: `useOverride` (`studio/api/src/cost-gate.ts:48-64`) and `ai.ts:269` / `finder.ts:237` never check `can_continue`.
* The ledger still caps each attempt (`ledger.ts:158`), so attempt 1 at US$131.12 would reserve and attempt 2 would be refused. Money stays at or below US$132, but a run is started knowing it is cut short partway.
* Expected: 409 with `cost_check.words` ("The founder must raise the cap") when `!plan.cost_check.can_continue`, before `useOverride`.

## Minor

* **m1. A refusal after use spends the Continue.** `useOverride` writes `override_use` before the DB transaction (`ai.ts:269` before `:276`; `finder.ts:237` before `:243`). Test: two Continues for one run key, two launches at once. Answers 201 and 409 "Being mapped in Visitor visa…", but **both** Continues are marked used. The "Already finding" and P2002 paths do the same. The audit says the second was used, but it started nothing. Expected: use it inside or after the transaction, or record it as unused on refusal.
* **m2. A double-click with one Continue does not return the same run.** Two `POST /attachments/:id/draft` at once with the same `idempotencyKey` and `overrideId` answer 201 batch `f8fb…` and **409 "This Continue was already used"**. A later retry with the same key gets 409 "A step for this form is already queued or running", because `launchSource` re-plans before `launch` looks at the key (`ai.ts:314-316`). Expected: the same key returns the same run.
* **m3. Unspent Continues are not counted against US$132.** Committed US$125: two Continues of US$6 for different runs are **both recorded** (`ledger.ts:92-93` counts only reservations). The second is refused later at `reserve`, after its run started. Expected: count unexpired, unspent Continues, or say so in the words.
* **m4. Two different spend totals.** `Sources.ledger()` (`sources.ts:224-227`) counts a `settle` with no matching reserve; `SpendLedger.committed` ignores it.
  * Test: reserve US$115 plus an orphan settle of US$3. The plan gives `cost_check.ok:true` and spent US$115, but `ledger.remaining_usd` is US$2.
  * The launch answers **400** "above what is left of the experiment cap (US$2.00…)", and `POST /ai/overrides` answers **409** "fits every limit". There is no Continue and no start, which contradicts "the same numbers as reserve".
  * The real ledgers have 0 orphan settles today.
* **m5. The contract accepts unknown fields.** `OverrideBody` is not `.strict()` (`contracts/cost-check.ts:24`). `{surprise:"x"*1000, by:"system", reason:"hostile"}` answers **201**; the extras are silently dropped, and the planned `reason?` cannot be sent.
* **m6. A 6 MB body answers 500** "Something went wrong" instead of 413 (the global 5 MB limit, `main.ts:181`). A garbage ledger line also makes every AI plan in every copy answer **500**: safe (fail-closed), but no words.
* **m7. A Continue is not tied to the person who clicked it.** `useOverride` never compares `by` with the person launching (`cost-gate.ts:48`). Any author holding the id may use it. Only one author persona exists, so this is found by reading the code.

## What held
* **Roles:** `POST /ai/overrides` answers 403 for user-C, user-B, user-O, user-P and user-Q, and 401 for an unknown person or `system`; no line is written.
* **Malformed bodies:** a string or negative `worst_usd`, `limits` that are empty, unknown or duplicated, an upper-case run key, a missing `start`, an array, `null` or non-JSON body all answer 400 or 409. `worst_usd` 1e308 answers 409 stale. An object or shell-character `overrideId` answers 409 "No such Continue".
* **Wrong run:** a finder `start` with a field-map run key answers 409 "work changed".
* **One Continue, two launches at once with different keys:** exactly one 201 and one 409 "already used", one use line, one queued job.
* **Limits changing:** the limits are part of the run key, so a Continue for `experiment` cannot start a plan that now also passes `wave`.
* **Reuse, expiry and ceiling** behave as in `check_cost_override`, which was re-run inside the attacks: used twice gives 409, expired gives 409, unknown gives 409, past US$132 gives 409 with no line, and a start that fits gives 409.
* **Ledger lock:** 12 processes reserve US$20 at once on US$100, with no lock and with a 60 s stale lock, 8 rounds: exactly 1 reserved each time. The stale-lock removal has a check-then-act gap (`ledger.ts:168`) that did not show in 5 tries.
* **Ledger limits and boundaries:**
  * Cap exactly at the limit: 116+4 is admitted (equals US$120).
  * Override worst case: a run's second attempt past its accepted worst case is refused.
  * Override names: it covers only the limits it names. Attempt 2 passing `run`, which the Continue for `experiment` did not name, is refused.
  * `recordOverride` refuses `system`, empty or duplicate limits, and amounts that are `NaN` or negative.
* **Crashes:** a crash between `reserve` and `settle` leaves the worst case counted. A crash holding the lock blocks for at most 30 s, then fails closed ("ledger busy").
* **Screen, by reading `cost-warning.tsx`:** Cancel resolves `undefined` and posts nothing (US$0). Escape is the same as Cancel unless busy. Continue is busy-locked, so there is no double post. Past the ceiling there is no Continue button.
