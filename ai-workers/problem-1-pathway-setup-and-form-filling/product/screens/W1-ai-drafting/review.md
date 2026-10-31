# Review 3: N6, the P-179 follow-ups (forms lane), at `c71fe137` (reviewer, 31 Oct)

Independent CHECK (P-68) of backlog item N6. The diff reviewed is `git diff 066b476c c71fe137` (15 files). Branch `claude/friendly-lamport-06zafk`, stacked on PR #112. The earlier CHECKs are in git history (review 2 at `c950b098`) and in `break-report.md`.
* US$0 throughout: no `*_LIVE` switch and no paid call. The only Continue clicked was in an isolated copy with the queue held and a scratch `P2_LEDGER_DIR`.
* The real `.tools/p2-ledger` is absent in this clone and was never written.
* My copy `n6rev3` ran on :4458 only and was stopped at the end. The suites' own copies used :4458 too.

## Verdict: Approve. Commit `c71fe137`, no Blocker, no Major
All three Majors are fixed in code, each has a test that fails when its rule is removed, and I saw each fix work myself:
* review N1: the Forms tab's Draft with AI now shows the cost warning.
* review N2: a person's own Continue is reused, and the dialog and the ledger agree on what is held.
* break N1: a crashed holder's `spend.lock` is broken.

One new Minor (m1) and two notes remain. The Minor is that a stale plan in the form's dialog gives a dead-end toast. That pattern already existed on Draft setup.

**Journey score: 9.5 / 10. Pass.** Report: `journey-test-reviewer-2026-10-31.md`.

## What I ran (US$0)
* Suites:
  * `check_cost_check.ts` 90/90 (no server).
  * `check_cost_override.ts 4458 n6co` 62/62.
  * `check_cost_warning_browser.cjs 4458 n6cw` 22/22, run twice, green both times. It overwrote `screenshots/p179/*`, which I restored with git checkout.
* Web built (`vite build`).
* Graph (no `--write`): G1 0 · G2 0 · G3 2 · G4 0 · G5 0 · G6 0. The two G3 routes are not P-179 and are unchanged since review 2.
* Rule removed, then tests run. Each mutation was reverted with git checkout, and the web was rebuilt after the last one.
  * Ledger leaves out the looked-at run key (`except`): 2 FAIL.
  * Own unused Continue reused (`mine`): 1 FAIL.
  * Used Continue holds until it reserves (break n2): 4 FAIL.
  * `withLock` breaks a dead holder's lock: 2 FAIL.
  * Escape guard listener: 2 FAIL in the browser check.
* My walk: headless Chromium/Playwright, isolated copy `n6rev3` on :4458, scratch ledger `/tmp/rev3/ledger`. Scripts and screenshots are in `/tmp/rev3/` (session scratch).

## Earlier findings: each verified
| Finding | Fix (code) | Evidence |
|---|---|---|
| review N1: Forms-tab Draft with AI has no warning | `sources.tsx:544-563`: plan scoped to the source, `useCostGate`, `overrideId` passed. Server `ai.ts:306-326` goes through `launch` (`checkOverride` before, `spendOverride` last) | Walk: at US$119.90, Start shows the warning (expected US$0.21, worst US$2.76, cap line, limit). axe 0. Continue gives "AI draft started", 1 override, 1 use, `plan.override` on the run. Browser check: N1 pass and fail |
| review N2: own unused Continue blocks retry; wrong words | `ledger.ts:153-157` reuse (`again`); `heldByOverridesUsd(except)` `:131-139`; `costPlanNow` adds `held` (`cost-gate.ts:26-34`); `engine/cost-check.ts:43-51` wait words | Walk N2: Continue recorded, launch refused ("already queued"), stub stopped, retry. Result: same override id, **1 line, 1 use, 1 run**, 412 ms. The audit says "again (their Continue from a moment ago…)". With another start's US$12 held, the warning says "Wait a few minutes", has no Continue, and does not say "founder" |
| break N1: stale `spend.lock` | `ledger.ts:49-57` `holderGone` (same host, `kill(pid,0)` gives ESRCH); `takeLock` writes the token, then links it, so the lock is never seen empty; `withLock` `:240-250` | `check_cost_check` N1 ×7: SIGTERM leaves the lock; the next runner breaks it at once; a live holder, another host, and an empty lock under 1 h are all kept |
| break n1: API freeze on reserve lock | dead holder broken at once; `apiLedger` waits 2 s; `LedgerBusy` gives "busy, try again" (`cost-gate.ts:19,104`) | check_cost_check n1 ×2; check_cost_override n1 (503 in 2–4 s, busy words) |
| break n2: used Continue holds nothing | holds `worst − reserved` until it reserves, its run ends (`endedOverrides`), or 10 min | Walk: run queued gives `held_usd` 2.76 on another start; after Stop, held 0. Checks n2 ×4 |
| break n3: NUL in reason | `contracts/cost-check.ts:37` regex; tab/newline kept | check_cost_override n3 ×2 (400, no line) |
| break n4 + review n3: override/reserve lines unchecked | `ledger.ts:86-99`: every override/use/reserve line checked, fails closed in words | check_cost_check n4 ×8 |
| break n5: settle outside the lock | `ledger.ts:231-232` | check_cost_check n5 |
| review n4: cents | `sources.tsx:571` | Walk: "US$100.00 of the US$120.00 … US$20.00 left" |
| review n5: handover names `useOverride` | `handover-p179.md` §1–§2 rewritten | read |
| Escape before the layer is ready | window capture guard, `cost-warning.tsx:48-58,74-76` | Browser check N6 ×3; mutation caught; walk: focus returns to "Start live AI draft", form dialog stays |
| Found on the way: US$0 start past the cap refused | `ai.ts:283` `worst_usd > 0 &&` | check_cost_override (stub queued at > US$120) |

## Design choice: a used Continue holds until its run reserves, ends, or the Continue expires
Sound, and on the safe side. It holds `worst − reserved` per Continue, grouped by run key (one key can start one run), so committed + held never counts a run twice.
* `ended` comes from this copy's `ai_batch` only. A run in another copy holds until it expires (at most 10 minutes), which is the safe side and is said in `cost-gate.ts:31`.
* A retried batch goes back to QUEUED (`ai.ts:473`), so its Continue holds again. That is consistent.
* Residual, not a finding: if a queued run waits more than 10 minutes, its expired Continue stops holding. Another Continue can then take the room, and the run is refused at `reserve` (money stays at or below US$132; the run fails in words). That is acceptable for a 10-minute window.

## New findings
**Blocker:** none. **Major:** none.

**Minor**
* **m1 (Should). A stale plan in the Forms-tab dialog gives a dead-end red toast, not the warning.**
  * Walk (`/tmp/rev3/shots/js-stale-1.png`): choose Live at US$100 spent (the plan fits), then spend moves to US$119.90 (another copy), then Start.
  * The result is a red toast: "The worst case (US$2.76) is above what is left of the experiment cap (US$0.10 of US$120)." A second click gives the same toast, with no warning and no Continue. The dialog still says "US$20.00 left".
  * Cause: the refusal is a 400 (`ai.ts:283-284`, `fail` default), but the dialog re-plans only on 409 (`sources.tsx:561`). Draft setup has the same line (`ai-launch.tsx:46`), so this predates N6 and N6 copied it.
  * Recovery: close and reopen the dialog. It is rare, because spend has to cross a limit while the dialog is open.
  * Fix: re-plan on any refusal of the launch (or answer cost refusals with 409) in both places, plus a pass and a fail check.

**Notes (not findings)**
* `withLock` has no age fallback for a lock that names a holder. If the dead holder's pid is reused on the same computer, the lock stays until a person deletes it. That is rare, and no worse than before N6, when nothing was ever broken.
* After a refused launch the warning stays open with its error and Continue enabled. Pressing Continue again answers "The work changed since you looked at the cost… Look at it again; nothing was recorded." That is correct and in words. Cancel and Start again then work.

## D1–D20 (1–5)
D1 Requirement fit 5: every P-179 start in the forms lane (Draft setup, Forms tab, finder) warns, then offers Continue or Cancel. · D2 Data integrity 5: one Continue, one use, one run (walk + checks); malformed lines fail closed. · D3 n/a · D4 n/a · D5 Stability 4: stale locks broken; m1. · D6 Governance 5: audit says "again", names the override and the limit. · D7 AI trust 5: cost before spend. · D8 Orientation 4. · D9 Flow 4: m1. · D10 Language 5: wait words, busy words, cents. · D11 Feedback 4: m1 toast without a next step. · D12 Visual 5: `04-forms-tab-warning-*`. · D13 Accessibility 5: axe 0; 3 Tabs to Continue; focus back on Start; 400 and 512 px (200 % of 1024) with no sideways scroll. · D14 Team look 5. · D15 Speed 5: warning under 1 s; Continue to started 307–412 ms. · D16 Testability 5: every fix has a pass and a fail check; 5 mutations caught. · D17 simulated only. · D18 Provenance 5. · D19 Closure 4: m1. · D20 simulated only.

## Not checked
* A live run, or the launcher with the queue released. The lock and hold behaviour rests on the ledger checks and the code.
* The finder's dialog in a browser (it needs the live switch).
* A cross-computer shared ledger.
* The full suite list beyond the 3 P-179 suites.
* A headed browser and a real screen reader. D17 and D20 stay with the founder.
