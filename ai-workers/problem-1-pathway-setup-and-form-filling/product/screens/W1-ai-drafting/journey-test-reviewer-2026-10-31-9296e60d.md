# Journey test: N6 follow-up at `9296e60d` (reviewer, 31 Oct)

* **Setup:** isolated copy `forms_cw` on :4456, built from the working tree at `9296e60d`. Queue held, no live switch, scratch ledger: US$0.
* **Browser:** headless Chrome through Playwright.
* **Scratch files:** the script is `/tmp/rvprobe/probe.cjs` (session scratch, not committed). The builder's check is `tests/check_cost_warning_browser.cjs`.
* **Spend:** moved with scratch ledger lines, standing in for another copy's starts.
* **Review:** `review-n6-followup.md`.

## Journeys (configuration author)
| # | Journey | Result |
|---|---|---|
| J1 main | Draft setup opened while the start fits, then spend moves to just under the cap, then Start | The first Start shows the warning with Continue and today's figures. Nothing started, no refusal shown (check step) |
| J2 main, Forms tab | IMM 5409 › Draft with AI › Live, then spend moves up, then Start | The first Start shows the warning with Continue. No red toast, no run (check step) |
| J3 recovery (the bug) | Warning with Continue, then Cancel, then spend moves past US$132 − worst, then Start in the same panel | The ceiling warning, with no Continue. "Spent so far" equals the ledger total (check step) |
| J4 keyboard, early Escape | Enter on Start, then Escape at once | No warning appears (also checked after 600 ms), the panel stays, 0 runs, focus is back on Start (check steps) |
| J5 slow network, Escape | Plan slowed to 1.5 s, then Enter, then Escape after 300 ms | Cancelled toast, no warning later, panel stays, guard listener removed. **Focus ends on the panel, not Start** (review Minor 1) |
| J6 failed plan | `/api/ai/plan` answers 500, then Start | Guard removed after the retry. Panel shows "The plan could not be made · probe: plan failed". A later Escape closes the panel normally |
| J7 close mid-plan | Plan slowed, Start, then the panel's Cancel button with the mouse | Panel closes. Over the cap: no warning, 0 runs, no page error (when the plan fits: review Minor 4) |
| J8 approver path, finder | Not walked: the diff leaves both unchanged. The finder's plain-plan path still typechecks and runs synchronously (by reading) | — |

## Data underneath
* The `/ai/batches` count was unchanged after every Cancel, Escape and error.
* The ledger has no `override` line from J4 to J7.
* Only the seed reserve lines exist: US$0.
* The check's final step finds exactly 2 runs and 2 overrides.
* Page errors: 0.

## Break pass
* **Rule removed** (`web/src` set back to the base): the check fails at the first new step.
* **Only `sources.tsx` set back:** 12 pass, then it fails at the Forms-tab step.
* **Double Escape during the fetch:** the second Escape closes the panel. This is right: the warning is already cancelled.
* **Work changed while the panel is open:** with Continue over a limit, an override can be recorded and then the launch is refused with 409 (review Minor 2). Found by reading the code, not reproduced.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J3 |
| Next step obvious | 1 | Today's warning appears on the first Start. The ceiling warning names the founder raising the cap |
| Plain words | 1 | The wording is unchanged and was accepted at `10a0e90e` |
| Feedback and state | 1 | J3: the figures equal the ledger. Start is busy while the plan is made again |
| Correct data | 1 | Nothing started on any Cancel or Escape. Overrides are counted exactly |
| Error recovery | 1 | J6: words shown, guard off, Escape works. The refusal-first round is gone |
| Accessibility and screen sizes | ½ | axe 0 on 3 states. Focus is lost after Escape during a re-plan slower than about 0.5 s (J5) |
| Speed | ½ | Each live Start now waits for one more plan request first. I did not time it against STANDARDS §9 |
| Visual quality | 1 | The layout is unchanged. Screenshots at 1440, 1024 and 390 px were rewritten, then reverted |
| Trust and sources | 1 | The spend shown is the ledger's, at the moment of the click |

**Score: 9/10. Pass** (8 or more, no criterion at 0).

To raise the ½ scores, most valuable first:
1. Make the refocus wait for a time, not a frame count (Minor 1).
2. Time the plan request before the warning against STANDARDS §9.

## Not tested
* A real screen reader.
* An intended user's unaided walk: D17 and D20 stay with the founder.
* The fits-after-re-plan path live.
* 200 % zoom (the diff changes no layout).
