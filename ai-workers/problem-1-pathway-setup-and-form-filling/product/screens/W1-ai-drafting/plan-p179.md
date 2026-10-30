# P-179 + QA-90: a cost warning a person may continue past, on one shared ledger (plan, forms lane, 30 Oct)

Capability C11.8. Founder P-179 (30 Oct): a demo should not fail when a run costs a little more. Warn before anything is spent, then Continue (recorded) or Cancel. Hard limits stay the default; only a person's click passes one. Lead answers (30 Oct): queue position 2, before P-156; **one click covers that run's own worst case only**; clicks may take total spend past the experiment cap (P-139, US$120) by at most 10% (**US$132**); past that there is no Continue, only "the founder must raise the cap". The dialog always shows spend so far against the cap. Built with QA-90 (`plan-qa90.md`, points 1–10, unchanged), so the override lives in the one ledger every copy shares.

## 1. What exists today (read 30 Oct)
* The ledger is `p2/ledger.ts SpendLedger`: `reserve` refuses (`BudgetExceeded`) above the experiment cap (US$120), the run cap (`RUN_CAP_USD` US$5) and the Wave 1 cap (US$60 since 26 Oct). `p2/runner.ts` refuses a paid call that is not on the one ledger at US$120.
* Attempts per form: `MAX_PAID_ATTEMPTS_PER_FORM` 4 (`rounds.ts paidRunAllowed`, `ai.ts` "not_eligible").
* Before a run the API already plans its worst case: `sources.ts` ledger view (`committed_usd`, `remaining_usd`, the wave), `ai.ts` plan (refuses above `remaining_usd`), the finder's plan/launch, `people-ai.ts`. Each says it in its own words, and none can be continued.

## 2. The design (Lead-agreed shape)
| Element | Record / API | Rule | Tests (pass and fail) |
|---|---|---|---|
| **One cost check before launch** | `engine/cost-check.ts costCheck({ spent, wave, worst, run, attempts })` → `{ ok }` or `{ over: [{ limit: "run" \| "attempts" \| "experiment" \| "wave", limit_usd, after_usd, words }], expected_usd, worst_usd, spent_usd, cap_usd, ceiling_usd, can_continue }`; every plan reply carries it (`cost_check`) | Pure: the same numbers as `reserve`, so the dialog never says "fits" when the ledger refuses | each limit over and not over; at exactly the limit; expected ≤ worst |
| **The override** | Ledger entry `{ type: "override", id, run_key, limits: [...], worst_usd, by, at, reason? }` in the shared ledger (QA-90), and `ai_override` audit line; `POST /ai/overrides` `{ run_key, worst_usd, limits }` (author only), answers `{ override_id, expires_at }` | Only a person (author; never the system actor, approver-only roles, the client); `worst_usd` must equal the plan's worst case for that run key now (a changed plan is refused, 409); one override is used once, within 10 minutes | 403 per role; 409 stale worst case; 409 used twice; 409 expired |
| **Ceiling** | `policy.ts OVERRIDE_CEILING_USD = EXPERIMENT_CAP_USD * 1.1` (US$132) | No override takes committed + worst past US$132: `can_continue: false`, words "Spend so far US$x of US$120. This run could reach US$y, past the US$132 the founder allows on a click. The founder must raise the cap." | 132.00 passes; 132.01 refused, no override written |
| **Runner admits it** | `SpendLedger.reserve(…, { overrideId })`; `runner.ts` passes it from the launch ticket | `reserve` passes a named limit only with an unused override for this run key and limit, worst case ≤ the override's; otherwise refuses exactly as today | reserve without override over the cap refused (today's test stays); with override passes; with another run's override refused; above its worst case refused |
| **The dialog** | `contracts/cost-check.ts` (shape + words) and `web/src/components/cost-warning.tsx` (`CostWarning`: expected, worst case, spend so far against the cap, which limit and why, Continue / Cancel) | Continue posts the override and then starts the run with its id; Cancel starts nothing. Keyboard and screen-reader labels (STANDARDS) | browser: shown over a limit, Continue starts it, Cancel leaves US$0, no Continue past US$132 |
| **Wiring** | The forms lane wires it on its own run starts (finder Find, field-map draft, AI drafting steps). Screens and runtime wire the same component on theirs (one line per call, plus a check each); the forms lane hands over the steps | — | each wired start: one pass with a fake launcher (US$0) |

US$0 throughout: every check uses the fake launcher or the stub; no live call.

## 3. Order (each step committed and pushed, checks green before the next)
1. QA-90 points 1–9 (the shared ledger), with its check.
2. `costCheck` + `cost_check` on every forms plan reply; override ledger entry; `POST /ai/overrides`; `reserve` with an override; ceiling.
3. `contracts/cost-check.ts` + `CostWarning`; wired on the forms lane's starts; browser check.
4. Hand-over note to screens and runtime: the component, the one call, a sample check.

## 4. Lead answers (30 Oct; all three as recommended)
* **Q1, the Wave 1 cap (US$60):** an override also passes it, shown as a named limit in the same dialog, never beyond the US$132 total.
* **Q2, attempts per form (4):** one click past the attempts limit allows exactly one more run of that form (2 attempts), recorded like the money.
* **Q3, QA-90 point 10:** yes, run-suites gives each run its own scratch `P2_LEDGER_DIR` (proposal below; the Lead applies it, it is the Lead's file).
* **Evidence while GitHub Actions is blocked on billing:** a local run-suites result on the exact commit.

## 5. Proposal for `product/tools/run-suites.sh` (Lead's file)
After the `TSX=` line (21), one line, so test entries and test overrides never reach the real shared ledger:
```
export P2_LEDGER_DIR="${P2_LEDGER_DIR_SUITES:-$OUT/p2-ledger-$$}"; mkdir -p "$P2_LEDGER_DIR"   # QA-90 (10), P-179: a scratch ledger per run
```
`isolated.sh` keeps a `P2_LEDGER_DIR` that is already set (QA-90 point 4), so every copy the suites start writes there. The run's summary names the folder.

## 6. Build notes (30 Oct, forms lane)
* **Where the shared ledger is found:** in `p2/policy.ts` itself, not in the start scripts (§2 point 4 said scripts): `P2_LEDGER_DIR` when set, else the main copy's `.tools/p2-ledger` when the main copy has `.tools`, else `prototype/p2/ledger`. Every process (the demo, lane copies, tools, checks) then resolves the same folder whichever script started it; `restart-api.sh` alone would otherwise have missed it. The isolated children cannot look (no read of `.git`), so `launch.ts` and the P5 reader always pass the folder.
* **`reserve` is atomic across processes** (a short `spend.reserve.lock`, 10 s wait, stale after 30 s). The old read-then-append let two copies together pass the cap (the new fail test fails on the old code). The one-runner `withLock` is unchanged; `launchOnce` already waits for it.
* **Seed:** an identical line is kept once; a first try that de-duplicated by entry type and id dropped the Lead's 21 Oct corrections (a second `settle` with the same id) and overstated spend by US$7.24; the check now guards that.
* **The override lives in the ledger, checked twice:** the API (next) checks the plan and uses the override once; `reserve` checks it again inside the drafting process (used, same run key, names each limit passed, within the accepted worst case, within US$132 at reserve time), so spend that arrives after the click still stops at the ceiling.
* **API (step 2 part 2):** `api/src/cost-gate.ts`. The run key is the plan's fingerprint + worst case + limits, so a changed plan has another key. `POST /ai/overrides` carries `start` (what to plan again: field maps or the finder) because a run key alone cannot re-make a plan. The API compares the override with the plan *before* using it, so a refusal leaves the click unused. The override is kept on the run's plan (`ai_batch.plan.override`) and passed only to each step's first attempt (a retry is a new decision) and only to live calls.
* **Q2 attempts:** a spent form is now a `draft` target flagged `over_attempts` (was `not_eligible`); without a Continue the launch says the same budget words as before; the batch retry keeps its hard refusal (start a new draft for a Continue).
* **Two bugs found by the new checks, fixed with pass and fail tests:** (1) with spend already past the cap a US$0 start (rules, replay, stub) was flagged over it, so every free start would have needed a Continue: a start with no worst case passes no money limit; (2) a form drafted in parts was flagged over the US$5 run limit by its total, though each part is its own run: `run` is now the largest part.
* **Finder:** plan and override work; its launch refuses before the override while the live AI switch is off (tested), so a finder run with a Continue is tested to that gate only (US$0 rule).
* **Not wired (other lanes' starts):** Start setup (screens), Who can be (`people-ai.ts`, runtime): `handover-p179.md`.

