# Review 5: N6, the P-179 follow-ups (forms lane), at `586190d6` (reviewer, 31 Oct)

Independent CHECK (P-68) of backlog item N6 at commit **`586190d6`**, branch `claude/friendly-lamport-06zafk`, PR #121.
* **The commit:** `586190d6` merges `origin/main` (#112, `73030d56`), and it merged clean. `git diff origin/main 586190d6` is exactly N6: 17 non-image files.
* **Main brought no new tree content:** `git diff 2b4332ff 586190d6` is empty, because #112's commits were already in the branch. Main therefore cannot have broken N6's files.
* **What I read most closely** was `git diff 10a0e90e 586190d6`, which comes to `2b4332ff`: `sources.tsx` (1 line) and `check_cost_warning_browser.cjs` (3 steps).
* **Earlier CHECKs:** review 4 at `10a0e90e` and break report 3 are in git history and `break-report.md`.
* **Cost:** US$0. No `*_LIVE` switch, no priced button clicked by me, queue held, scratch ledgers only (`/tmp/rv5/ledger`, the suites' own temp folders).
* **Ports:** :4458 only. The copies `rv_walk`, `rv_co` and `rv_cw` were stopped and their databases dropped.
* **Isolation:** rule removals were made only in a `git archive 586190d6` extract (`/tmp/rv5/src`). The browser suite's 11 rewritten screenshots in the tree were put back with `git restore` per file.

## Verdict
Commit `586190d6`. No Blocker, no Major.
* Review 4's three Should Minors are closed.
  1. The Draft setup stale-plan check exists, and it fails when the fix is removed.
  2. The Forms tab dialog reads its spend figure again after a refusal, and that check fails when the fix is removed.
  3. The PR body now has the m1–m8 table, the residuals with their bounds, and 92/63/27.
* One new Minor (Should): a stale warning after Cancel. It predates N6, and the server refuses correctly.

**Journey score: 9.5 / 10. Pass.** Report: `journey-test-reviewer-2026-10-31-586190d6.md`.

**Note for the label:** PR #121's head moved, while I worked, to `968de33a` (main merged again: #115). That commit changes only `.claude/settings.json`, two workflows, `.claude/skills/lead`, and product docs and tools. No N6 file and no app code changed. Automerge wants the label added after the last commit, so the approval of `586190d6` must be re-applied to `968de33a` (or a newer head) by whoever adds the label.

## What I ran
* **Suites at `586190d6`:**
  * `check_cost_check.ts` 92/92.
  * `check_cost_override.ts 4458 rv_co` 63/63.
  * `check_cost_warning_browser.cjs 4458 rv_cw` 27/27, after `vite build`.
* **Graph** (no `--write`): G1 0 · G2 0 · G3 2 · G4 0 · G5 0 · G6 0. The two G3 routes are `POST /combinations/:id/attachments` and `GET /attachments/:id/file`, the same as before. Neither is part of P-179.
* **Rule removed, then the browser suite run** (extract only, each restored afterwards):

| Fix | Rule removed | Result |
|---|---|---|
| Review 4 Minor 2: dialog spend read again | `sources.tsx:145` without `invalidateQueries(["draft-options", a.id])` | FAIL "review (10a0e90e) 2" (26/27): the dialog keeps the figure from when it opened |
| Review 4 Minor 1 (m1, Draft setup) | `ai-launch.tsx:47` re-plans on 409 only | FAIL: the run stops at the warning wait after "m1 setup (Draft setup)" passes (1 passed, 1 failed) |

* The earlier removals (m3, m7, m5, m1 Forms tab) are in review 4. Their code is unchanged since (`git diff 10a0e90e 586190d6` touches none of them).

## Code check of the change since review 4
* **`sources.tsx:145`:** the refetch runs after any `ApiError` from the launch, with `qc` from `:115`.
  * The sentence comes from `opts.data.ledger`, which `/attachments/:id/draft-options` serves from the same ledger as the refusal.
  * J1: the toast says "(US$1.38 of US$120)" and the dialog says "US$118.62 … US$1.38 left before a cap", 300 ms after the click.
  * No extra request on success, and no per-row requests.
* **`check_cost_warning_browser.cjs:51-64`:** the panel opens with Start enabled at US$0 spent. The seed then moves spend to `120 - worst/2`. The 1st Start is refused, with no batch. The 2nd Start shows the warning with Continue. This mirrors the Forms tab step.
* **`:131-132`:** the expected figure is the ledger's own reserve sum, not a constant.
* The rest of N6 (ledger lock holder, `LedgerBusy` and settle fallback, the held Continues in `costPlanNow`, the `reason` rules, the Escape guard) is unchanged since review 4. I re-read the diff and agree with its money-safety argument: settle can only lower what is counted; reuse only within the ceiling; reserve is the final check.

## Findings
**Blocker:** none. **Major:** none.

**Minor**
1. **(Should) After Cancel, or a refused Continue, in the cost warning, the next Start shows the same stale warning, Continue included.**
   * J2 (`/tmp/rv5/walkshots/j2-stale-1440.png`): the warning opens at US$118.62 with Continue, and the author cancels. Spend then reaches US$131.12, so the Draft setup start (worst US$9.99) is past the ceiling. Start again still shows "Spent so far US$118.62 … Continue", not "past what a click may allow".
   * Cause: Cancel resolves the start with `undefined` (`cost-warning.tsx:74`). The callers then only toast (`ai-launch.tsx:41`, `sources.tsx:138`), so no re-plan happens. A refused Continue keeps its error inside the warning (`cost-warning.tsx:85`) and does not re-plan either.
   * Money-safe: `POST /ai/overrides` answers 409 "This run could reach US$141.11, past the US$132.00 … The founder must raise the cap" (J3). This predates N6. It is m1's class on the warning's own path.
   * Fix: re-plan in both callers after a Cancel, or after a refused Continue (`plan.refetch()` where `r === undefined`, or from the gate on error).
   * Its check: in the browser suite, Cancel, seed past the ceiling, Start shows the ceiling dialog.

**Notes (not findings):**
* The m4, m6 and m8 residuals are now listed in the PR with their bounds. Accepting them is the Lead's call.
* The Draft setup removal fails on a timeout before its named step prints. It is still a failing check.

## D1–D20 (1–5)
* D1 Requirement fit 5: every forms-lane start warns, then offers Continue or Cancel; a stale plan recovers in one click.
* D2 Data integrity 5: refusals and wrong roles leave 0 override lines and 0 batches; Continue gives 1 override, 1 use, 1 run (suites).
* D3 n/a · D4 n/a.
* D5 Stability 5: suites green; settle never fails for a busy lock.
* D6 Governance 5: author duty enforced on the server (403 for the others, 401 for no one).
* D7 AI trust 5: worst case and caps are shown before any spend.
* D8 Orientation 5: the dialog and the toast agree.
* D9 Flow 4: Minor 1.
* D10 Language 5: "US$1.38 left before a cap".
* D11 Feedback 4: Minor 1.
* D12 Visual 5.
* D13 Accessibility 5: axe 0 after the refusal (and on the warnings, in the suite); Enter, then Escape works; no sideways scroll at 1024, 512 (200 %) or 400 px.
* D14 Team look 5.
* D15 Speed 5: refusal 286 ms; warning 34 ms.
* D16 Testability 5: each fix since review 4 has a check that fails without it.
* D17 simulated only.
* D18 Provenance 5.
* D19 Closure 5: review 4's three Minors are closed, and the PR body is updated.
* D20 simulated only.

## Not checked
* Clicking Continue myself (a priced button), a live run, or the launcher with the queue released.
* The finder dialog in a browser (it needs the live switch).
* A cross-computer ledger, or a network disk.
* Suites beyond the three P-179 ones.
* A headed browser or a real screen reader. D17 and D20 stay with the founder.
* Commit `968de33a` (no N6 or app files changed; not run).

Verdict: Approve
