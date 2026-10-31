# Review 4: N6, the P-179 follow-ups (forms lane), at `10a0e90e` (reviewer, 31 Oct)

Independent CHECK (P-68) of backlog item N6 at commit **`10a0e90e`**, branch `claude/friendly-lamport-06zafk`, PR #121 (head `10a0e90e`). I reviewed the whole change, `git diff 066b476c 10a0e90e`, and paid most attention to the fix commit, `git diff c71fe137 10a0e90e`, which fixes break-report 3 m1, m2, m3, m5 and m7. Earlier CHECKs (review 3 at `c71fe137`, break report 3) are in git history and `break-report.md`.
* **Cost:** US$0. No `*_LIVE` switch, no priced button, queue held, scratch ledgers only (`/tmp/rv4/ledger` and the suites' own temp folders).
* **Ports:** :4458 only. My copy `rv_walk` and the suites' copies `rv_co` and `rv_cw` were stopped at the end and their databases dropped.
* **Isolation:** every rule removal was made in a `git archive 10a0e90e` extract (`/tmp/rv4/src`), never in the shared tree. The browser suite's screenshots in the tree were put back as they were.

## Verdict
Commit `10a0e90e`. No Blocker, no Major.
* All five fixes hold. I saw each one work, in the suites and in my walk.
* Four of the five fixes have a check that fails when the fix is removed.
* The exception is the Draft setup half of m1: removing it still leaves the suite green (finding 1).
* Three Minors remain, all Should. None moves money.

**Journey score: 9.5 / 10. Pass.** Report: `journey-test-reviewer-2026-10-31-10a0e90e.md`.

## What I ran
* **Suites at `10a0e90e`:**
  * `check_cost_check.ts` 92/92.
  * `check_cost_override.ts 4458 rv_co` 63/63.
  * `check_cost_warning_browser.cjs 4458 rv_cw` 24/24, after `vite build`.
* **Graph** (no `--write`): G1 0 · G2 0 · G3 2 · G4 0 · G5 0 · G6 0. The two G3 routes are `POST /combinations/:id/attachments` and `GET /attachments/:id/file`. Neither is part of P-179.
* **Rule removed, then the suite run** (extract only, each restored afterwards):

| Fix | Rule removed | Result |
|---|---|---|
| m3 settle never busy | `settle` without the `LedgerBusy` fallback | check_cost_check: m3 FAIL (91/92) |
| m7 reuse within ceiling | `if (mine)` without the ceiling test | check_cost_check: m7 FAIL (91/92) |
| m5 lone surrogate | `.refine` removed | check_cost_override: m5 FAIL, 500 "Something went wrong" (61/63) |
| m1 Forms tab | `sources.tsx` re-plans on 409 only | browser: times out waiting for the warning (FAIL) |
| m1 Draft setup | `ai-launch.tsx` re-plans on 409 only | browser: **24/24, not caught** (finding 1) |
| m2 sentence | (the check's pattern is the new sentence itself) | n/a |

## The settle fallback (`p2/ledger.ts:288-295`): money-safe
1. **It cannot write twice.** `LedgerBusy` is thrown only from the wait loop (`:251`), before `fn` runs. So the fallback runs only when the locked append never happened.
   * Other errors (a disk error, for example) still throw, as before.
2. **A settle can only lower what is counted, so racing one is safe.**
   * A reader in `atomically` that misses an unlocked settle sees the reservation at its worst case. That over-counts.
   * The seed tool rewrites by temp file and rename (`p2/tools/seed-shared-ledger.ts:25-30`). A settle appended during that rename lands in the old file and is lost, never corrupting the new one. The reservation then stays at its worst case (`counted`, `:121`). That over-counts, which is the safe side.
   * One `writeSync` of one line with `O_APPEND` on a local disk is not interleaved with another line.
3. **It fixes what break m3 found, in the runner, not only in the ledger.**
   * Scratch probe `/tmp/rv4/probe/settle_runner.mts`: real `runDrafting`, a US$0 stub caller, and a live process holding `spend.reserve.lock` past the wait (300 ms).
   * At `10a0e90e`: 1 call, `completed`, the answer kept, `settle:0.00024:ok` written after 319 ms.
   * With the fallback removed: `LedgerBusy` escapes the runner and the answer is lost (the catch's own settle throws too).
   * `settle` still sits inside the paid call's `try` (`runner.ts:74`, `p5/reader/read.ts:89`). The fix rests on settle never throwing for a busy lock, and that now holds.
4. **The cost of the fallback** is a wait of up to 10 s inside the drafting process. That is acceptable.

## Each fix checked
| Fix | Code | Evidence |
|---|---|---|
| **m1** re-plan after any refusal | `sources.tsx:143-144`, `ai-launch.tsx:46-47` | Forms tab (J1): with spend moved to US$119.90 after the dialog opened, the 1st Start gives the toast and starts nothing. The 2nd Start shows the warning with Continue (60 ms), and nothing started. Draft setup (J3): the same pattern; the 2nd Start shows the warning with Continue |
| **m2** wave named | `sources.tsx:152` | "Spent so far US$30.00 of the US$120.00 experiment cap · Wave 1: US$0.00 of US$60.00; US$60.00 left before a cap." `remaining_usd` is `min(cap, wave)` on the server (`api/src/sources.ts:233`), so "before a cap" is true. `Math.max(0, …)` never shows a negative amount |
| **m3** settle never busy | `ledger.ts:293-294` | See the section above |
| **m5** lone surrogate | `contracts/cost-check.ts:37-39` | HTTP (J4): a high surrogate alone gives 400 "half of a character… nothing was recorded"; a low one alone, 400 too; an emoji, 201. The pattern agrees with `String.isWellFormed()` on 7 edge cases |
| **m7** reuse within ceiling | `ledger.ts:158` | The rule removal is caught. The reuse ignores other Continues' holds, and that is correct: this Continue's own hold was already counted when those were recorded. If the reuse is refused, the next check refuses with the ceiling words, which is consistent |

## Findings
**Blocker:** none. **Major:** none.

**Minor**
1. **(Should) The Draft setup half of the m1 fix has no check.**
   * Reverting `ai-launch.tsx:47` to `e.status === 409` keeps `check_cost_warning_browser` at 24/24. The m1 steps cover the Forms tab only (`check_cost_warning_browser.cjs:106-112`).
   * The fix works (J3, my walk). Its regression guard is missing, and backlog N6 asks for "each … has its own fail test".
   * Fix: add the same stale-plan step to Draft setup in the browser check: open the panel, seed, Start gives the toast, Start again gives the warning.
2. **(Should) After a refusal, the Forms tab dialog's spend sentence is out of date. Break m2's "two different figures" comes back in that state.**
   * J1 (`/tmp/rv4/shots/j1-b-refused.png`): the dialog still says "Spent so far US$100.00 … US$20.00 left before a cap". The red toast beside it says "(US$0.10 of US$120)". The warning that follows shows US$119.90, which is correct.
   * Cause: `sources.tsx:144` refetches the plan but not `draft-options` (`:113`), and the sentence is built from `draft-options`.
   * Fix: also invalidate `["draft-options", a.id]` after a refusal.
3. **(Should, record) PR #121's description still describes `c71fe137`.**
   * It gives 90/62/22, not 92/63/24, and has no m1–m8 section.
   * The commit message says "m4, m6, m8 are listed in the PR (accepted residuals)", but they are not there (`gh api …/pulls/121`).
   * Fix: update the PR body with the fix table and the three residuals, each with its bound (m4: hold ends at 10 min, money stays at or below US$132; m6: a named `spend.lock` never ages out; m8: a narrow three-waiter window, 0 overlaps seen).

**Notes (not findings):** m4, m6 and m8 are as the break report describes. They leave money within US$132, and accepting them is the Lead's call.

## D1–D20 (1–5)
* D1 Requirement fit 5: every forms-lane start warns, then offers Continue or Cancel; a stale plan recovers in one click · D2 Data integrity 5: 1 override, 1 use, 1 run; a lone surrogate leaves no line and no audit row · D3 n/a · D4 n/a · D5 Stability 5: settle cannot fail for a busy lock.
* D6 Governance 5: the audit names the limit and the override · D7 AI trust 5 · D8 Orientation 4: Minor 2 · D9 Flow 4: one extra click after a refusal · D10 Language 5: "half of a character", "left before a cap" · D11 Feedback 4: Minor 2 · D12 Visual 5 · D14 Team look 5.
* D13 Accessibility 5: axe 0 on the warning and the dialog; 3 Tabs to Continue; no sideways scroll at 1024, 512 (200 %) or 400 px · D15 Speed 5: warning in 56–60 ms; Continue to started 214–220 ms.
* D16 Testability 4: Minor 1 · D17 simulated only · D18 Provenance 5 · D19 Closure 4: Minors 1 and 3 · D20 simulated only.

## Not checked
* A live run, or the launcher with the queue released.
* The finder dialog in a browser (it needs the live switch).
* A cross-computer ledger, or a network disk (append atomicity there).
* Suites beyond the three P-179 ones.
* A headed browser or a real screen reader. D17 and D20 stay with the founder.

Verdict: Approve
