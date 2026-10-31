# P-179 hand-over to the screens and runtime lanes: the cost warning on your AI starts (forms lane, 30 Oct)

Capability C11.8. Founder P-179: an AI start over a cost limit warns before anything is spent; a person may Continue (recorded) or Cancel. Hard limits stay the default: without a Continue the server refuses exactly as before. One click covers that run's worst case only; total spend may pass the US$120 cap by at most 10% (US$132); past that there is no Continue. The forms lane built it and wired it on its own starts (Draft setup / field maps, the finder's Find). Your starts need the same three lines.

## 1. What is shared (do not copy, import)
* **Contract:** `prototype/studio/contracts/cost-check.ts`: `CostCheck` (what every plan carries as `cost_check`), `OverrideBody` (`POST /ai/overrides`), `COST_WORDS` and `LIMIT_NAMES` (the dialog's words).
* **Server:** `prototype/studio/api/src/cost-gate.ts`: `costCheckNow({ worst, expected, run, spentForms? })` (the shared ledger's numbers, as `reserve` counts them); `runKeyOf(operation, plan_sha256, check)`; `useOverride(id, plan)` at launch.
* **Screen:** `prototype/studio/web/src/components/cost-warning.tsx`: `useCostGate()` → `{ gate, dialog }`.
* **Launcher:** `Sources.launchOnce(jobId, "live", wanted, override)` passes `--override-id/--run-key` to `p2/launch.ts`; the ledger checks it again at each reservation.

## 2. Your three steps per AI start
1. **Plan:** add `cost_check` and `run_key` to the plan reply:
   `const cost_check = costCheckNow({ worst, expected, run }); return { ...plan, cost_check, run_key: runKeyOf("<operation>", plan_sha256, cost_check) };`
   (`run` = the largest single launch's worst case; a launch is held to the US$5 run cap on its own.)
2. **Launch:** accept `overrideId`; over a limit, use it, else refuse as today; keep the override on the run and pass it to each live launch:
   `const override = !plan.cost_check.ok && b.overrideId ? useOverride(b.overrideId, plan) : null; if (!override && !plan.cost_check.ok) throw problem(409, "Over a cost limit", plan.cost_check.words);` … `this.sources.launchOnce(jobId, "live", wanted, override ?? undefined)`.
3. **Screen:** `const cost = useCostGate();` then `await cost.gate(plan, start, (overrideId) => api(<your launch>, { …, overrideId }))` (resolves `undefined` after Cancel: nothing started) and render `{cost.dialog}`.
   `POST /ai/overrides` re-makes the plan from `start`. It knows `{ kind: "draft_field_maps", … }` and `{ kind: "find_forms", … }` today; add your kind to `OverrideStart` (contract) and its plan to `Ai.override` (`api/src/ai.ts`, one line), or ask the forms lane to.

## 3. Starts still to wire (found 30 Oct)
* **Screens:** Start setup (`api/src/start-setup.ts` reads `live.totals.worst_usd` against `remaining_usd`; `web/src/components/start-setup.tsx` posts `forms/find` without the gate).
* **Runtime / Who can be:** `api/src/people-ai.ts` plan and launch (`remaining_usd` check at line 115).

## 4. A sample check (US$0)
Copy the shape of `studio/tests/check_cost_override.ts`: it starts its own isolated copy with `P2_LEDGER_DIR=<scratch>` and `STUDIO_HOLD_QUEUE=1`, no live AI switch, seeds spend into its scratch ledger (`{"type":"reserve",…,"at":"2026-10-20T00:00:00.000Z"}` moves only the experiment cap), then: plan fits → no warning; over → `cost_check.over` names the limit; launch without a Continue → refused; `POST /ai/overrides` → 201 for the author, 403 for others, 409 stale/fits/past US$132; launch with it → started, used once. Browser: `studio/tests/check_cost_warning_browser.cjs` (Cancel US$0, Continue starts, no Continue past US$132, axe).
