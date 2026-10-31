# Review: N6 follow-up, a cost-warning Start makes its plan again (`9296e60d`)

* **Scope:** `git diff origin/claude/friendly-lamport-06zafk..9296e60d`. It is stacked on PR #121 (N6, not merged). Four files: `cost-warning.tsx` (`useCostGate().gate` now takes a plan or a function that makes it again), `ai-launch.tsx` (Draft setup), `sources.tsx` (the Forms tab's DraftDialog) and `tests/check_cost_warning_browser.cjs`.
* **Reviewer:** I did not build this.
* **Environment:** isolated copy on :4456 (forms range), queue held, no live switch, scratch ledger. US$0: no reserve lines other than the seed lines.
* **Journey report:** `journey-test-reviewer-2026-10-31-9296e60d.md`. **Journey score 9/10 (pass).**

## What I ran
* `tsc --noEmit` (web): clean. `vite build`: clean.
* `node studio/tests/check_cost_warning_browser.cjs 4456 forms_cw`: **26/26 pass.**
* **Rule removed** (the test fails when the fix is taken out):
  * All of `web/src` reverted to the base: the check fails at the first new step (Draft setup, a timeout waiting for the warning, 0 passed).
  * Only `sources.tsx` reverted: 12 pass, then it fails at the new Forms-tab step.
  * So each caller's half of the fix has a step that catches it.
* **Probe:** a scratch Playwright script (`/tmp/rvprobe/probe.cjs`, not committed). It slowed or failed `/api/ai/plan` with `page.route` and counted the window capture keydown listeners.

## Correctness of the async gate (`cost-warning.tsx:60-74`)
* **Guard armed first:** the guard goes on in the click, before the first `await`. The probe had one listener live during the fetch.
* **Escape during the fetch** (plan slowed to 1.5 s):
  * `click.cancelled` is set and `cancelRef` disarms the guard.
  * After the fetch, `gate` returns `undefined`. The warning never appears (count 0 after 2.5 s), the panel stays, 0 runs, and the toast reads "Cancelled: nothing was started…".
  * A second Escape after that closes the panel normally. This is right: no warning is coming any more.
* **Fetch error:**
  * `disarm()` then rethrow (line 69). The probe had 0 listeners after the error. The panel shows "The plan could not be made · probe: plan failed", and a later Escape closes the panel as usual.
  * Note: `retry: 1` (`lib/api.ts:29`) holds the guard and the busy Start for about 1 s more before the error shows. This is acceptable.
* **Fits after the plan is made again:** `disarm()` then `launch()` (line 71). Correct by reading. The check has no step for it, and spend cannot drop in the scratch setup.
* **Guard always disarmed:** on every exit (fits, error, cancel during the fetch, Cancel, Continue success), plus the effect on unmount. I checked each by reading. The probe confirmed the error and cancel exits.
* **Plain-plan path:** there is no `await` on that branch (`typeof plan === "function" ? await plan() : plan`), so `setPending` still runs synchronously in the click, as before. The finder (`finder.tsx:64`) is unchanged in behaviour and typechecks.
* **`plan_sha256`:** `ai-launch.tsx:44` still sends the shown plan's `p.plan_sha256`.
  * The server's fingerprint covers only the work (`api/src/ai.ts:159`: mode, scope, targets), not spend. So a spend-only change still launches, and a change of the work is refused with 409 (`ai.ts:261`), as intended.
  * The DraftDialog launch takes no `planSha256`: the server makes the plan itself (`ai.ts:329`).
* **Test changes (`check_cost_warning_browser.cjs`):**
  * The old "first Start refused, second Start warns" steps became "the first Start warns, nothing started, no refusal shown", on both callers.
  * New step: after Cancel, spend moves past the ceiling, then Start in the same panel. The test asserts there is no Continue and that the spend shown equals the ledger. This is the exact bug.
  * The "Escape before the warning is ready" steps (lines 81-83, 124-125) are still meaningful. Enter then Escape now lands during the fetch. Without the guard armed first, the Escape would reach the panel. The test sleeps 600 ms, so it also proves the warning does not appear later.

## Issues (no Blocker, no Major)
1. **Minor (Should): focus is lost after Escape during a slow re-plan.**
   * Where: `cost-warning.tsx:78-83`. `refocus` gives up after 30 frames (about 0.5 s). Start stays disabled while the plan is fetching (`ai-launch.tsx:59` `plan.isFetching`; `sources.tsx:153`).
   * Evidence: probe E, plan slowed to 1.5 s, then Enter and Escape. Focus ended on the panel's `DIV`, not on Start (EXPERIENCE 12, the keyboard path). Before this change there was no fetch in this window.
   * Fix: retry for a time (for example up to 5 s), not a frame count, or re-arm the refocus when the caller's busy state clears.
2. **Minor (Should): an override can be recorded for a plan the launch will not use.**
   * Where: `ai-launch.tsx:43-44`. If the work itself changed while the panel was open and the fresh plan is over a limit, the warning shows the fresh plan. Continue records an override (with the person's name) under the fresh plan's `run_key` (`cost-gate.ts:40-41`). The launch then sends the old `p.plan_sha256` and gets a 409, so a ledger `override` line exists with no `override_use`.
   * Status: reasoned from the code, not reproduced. It needs a work change while the panel is open.
   * Fix: in `planAgain`, if `fresh.plan_sha256 !== p.plan_sha256`, throw the same "work changed" words before any warning. This keeps the intended refusal and writes nothing.
3. **Minor (Should): test coverage gaps.**
   * Neither caller's fetch-error path nor its fits-after-re-plan path has a step.
   * The original N6 window (`setPending` done, portal layer not yet ready) is now reached only by the finder's plain-plan call, and no browser check drives the finder's cost warning.
   * Fix: one fetch-error step (with `page.route`) on Draft setup. Either add an Escape step on the finder start or note the gap in build-notes.
4. **Minor (Could): closing the panel during the re-plan does not cancel the start.**
   * Where: `cost-warning.tsx:69-71`. If someone closes the panel with the mouse while the plan is being made again and the fresh plan fits, `launch()` still runs. `ai-launch` then calls `onClose()` and `nav('/ai/:id')`.
   * Evidence: the probe's over-cap case was harmless (0 runs, no errors). The person did press Start, and before this change the POST was in flight at that point too.
   * Fix: the unmount effect also marks the current click as cancelled.
5. **Observation (not this item):** the finder start (`finder.tsx:64`) still uses the plan from when it opened, so it has the same stale-figures risk. The server still refuses past the ceiling. This is for a follow-up item, not this PR.

## D1–D20
This is a fix inside the existing cost warning, not a new screen. It changes:
* **D5** state and feedback: the figures are fresh. 5.
* **D7** errors and recovery: the refusal-first round is gone. 5.
* **D9** keyboard and focus: Issue 1. 4.
* **D12** correctness and data: Issue 2. 4.

The other dimensions are unchanged since the `10a0e90e` review (`review.md`). D17 and D20 are simulated only.

## Could not check
* A real screen reader.
* An intended user's unaided walk.
* The fits-after-re-plan path end to end.
* The work-changed override case (Issue 2) live.
* 200 % zoom: the diff changes no layout.

**Verdict: Approve** (no open Blocker or Major). Minors 1-3 should be fixed in this PR or the next one, 4 is optional, and 5 is for the backlog.
