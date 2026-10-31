# Journey test (reviewer): N6, the P-179 follow-ups, at `586190d6` (31 Oct)

Reviewer role, at CHECK. This is the one journey score for this check. Commit `586190d6`: the tree is identical to `2b4332ff` (`git diff 2b4332ff 586190d6` is empty), because main's #112 was already in the branch.
* **Copy:** isolated `rv_walk` on :4458, `P2_LEDGER_DIR=/tmp/rv5/ledger`, `STUDIO_HOLD_QUEUE=1`, no live switch. Stopped at the end and its database dropped.
* **Script:** scratch, not committed (`/tmp/rv5/walk/walk.cjs`): headless Chrome, axe, and the ledger and API read after each step.
* **Cost:** US$0. Continue was never clicked by me. Every reserve line in the ledger is my own seed.

## Journeys
1. **J1. Forms tab, the plan goes stale while the dialog is open (main path).** Persona: the author. Goal: "draft this one form's field map live". The dialog opens at US$0 spent. Another copy then takes spend to US$118.62. The author clicks Start, then Start again.
2. **J2. Draft setup, the warning goes stale.** Persona: the author. The warning shows with Continue. The author presses Cancel. Spend then passes the ceiling (US$131.12). The author clicks Start again.
3. **J3. Wrong role and past the ceiling (by URL).** `POST /ai/overrides` as the approver, the case officer, a client, nobody, and the author past US$132.
4. **J4. Keyboard and screen sizes.** Enter on Start, then Escape. Widths 1024, 512 (1024 px at 200 %) and 400 px.

## What held
* **J1:** the 1st Start gives the red toast: "The worst case (US$2.76) is above what is left of the experiment cap (US$1.38 of US$120)." It arrives in 286 ms and starts nothing.
  * **The dialog's sentence is read again:** 300 ms after the click it says "Spent so far US$118.62 of the US$120.00 experiment cap · Wave 1: US$0.00 of US$60.00; US$1.38 left before a cap."
  * The toast and the dialog now agree. The last review's Minor 2 is fixed (screenshot `/tmp/rv5/walkshots/j1-after-refusal-1440.png`).
* **J1, the 2nd Start** (keyboard Enter) shows the warning with Continue in 34 ms, with the same US$118.62. Escape closes the warning only; the form's dialog stays open. 0 batches, 0 overrides.
* **J3:** the approver, the case officer and Client A get 403 "does not hold the author duty". No actor gets 401. The author past the ceiling gets 409: "This run could reach US$141.11, past the US$132.00 the founder allows on a click. The founder must raise the cap." The ledger has 0 override lines and the database 0 batches.
* **J4:** axe finds 0 violations on the dialog after the refusal. There is no sideways scroll at 1024, 512 or 400 px. There are no page errors.
* **Suites** (the builder's checks, run by me): 92/92, 63/63 and 27/27. That is 3 new browser steps since `10a0e90e`: Draft setup stale plan (2) and the dialog's spend figure read again (1).

## Findings
* **Minor (Should): after Cancel in a warning, the next Start shows the same stale warning.** This is J2.
  * The warning keeps its old spend figure, Continue included, even when the server would now refuse.
  * Shown in J2 (`/tmp/rv5/walkshots/j2-stale-1440.png`): the ledger is at US$131.12 and the Draft setup worst case is US$9.99. Start again still shows "Spent so far US$118.62 … Continue", not "past what a click may allow".
  * Cause: Cancel resolves the start with `undefined` (`cost-warning.tsx:74`). The caller then only shows a toast (`ai-launch.tsx:41`, `sources.tsx:138`), so nothing re-plans. A refused Continue keeps its error inside the warning (`cost-warning.tsx:85`) and does not re-plan either.
  * Money-safe: the server refuses Continue with the right words (J3, 409). I did not click Continue: it is a priced button.
  * This predates N6. It is the same class as break m1 ("re-plan after any refusal"), but on the warning's own path.
  * Fix: re-plan after a Cancel, or after a refused Continue (for example, `onSettled` → `plan.refetch()` in both callers).

## Score (QUALITY.md journey score)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1: refusal, then the warning with Continue on the next Start; the suites' Continue starts exactly one run |
| Next step obvious | 1 | the warning appears on the next Start; the toast says why |
| Plain words | 1 | "US$1.38 left before a cap"; "The founder must raise the cap" |
| Feedback and state | ½ | J1's figures now agree; J2's stale warning after Cancel (the finding) |
| Correct data | 1 | 0 override lines and 0 batches after refusals and wrong roles; 1 override and 1 use per Continue (suites) |
| Error recovery | 1 | the stale plan recovers in one click on both screens |
| Accessibility and screen sizes | 1 | axe 0; Enter, then Escape works; no sideways scroll at 1024, 512 or 400 px |
| Speed | 1 | refusal in 286 ms, sentence refreshed by 300 ms, warning in 34 ms |
| Visual quality | 1 | the team's dialog and panel; screenshots at 1440, 1024 and 400 px |
| Trust and sources | 1 | worst case, spend against the cap, the wave and the ceiling all shown before any spend |

**Score: 9.5 / 10. Pass** (8 or more, no 0). To raise "Feedback and state": the fix in the finding.

## Could not test
* A headed walk by an intended user, or a real screen reader (D17 and D20 stay with the founder).
* Clicking Continue myself (a priced button). The suites click it with the queue held.
* The live launcher, a cross-computer ledger, or the finder dialog in a browser (it needs the live switch).
