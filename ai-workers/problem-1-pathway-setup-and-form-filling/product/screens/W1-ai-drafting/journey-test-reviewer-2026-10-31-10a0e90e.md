# Journey test: N6 P-179 follow-ups at `10a0e90e` (reviewer, 31 Oct)

* **Setup:** isolated copy `rv_walk` on :4458, built from a `git archive 10a0e90e` extract. Queue held, no live switch, scratch ledger `/tmp/rv4/ledger`: US$0.
* **Browser:** headless Chrome through Playwright.
* **Scratch files:** the script is `/tmp/rv4/probe/walk.cjs` and the screenshots are in `/tmp/rv4/shots/` (session scratch, not committed). The report at `c71fe137` is `journey-test-reviewer-2026-10-31.md`.
* **Review:** `review.md`.
* **Spend:** moved with scratch ledger lines, standing in for another copy's starts.

## Journeys (configuration author unless said)
| # | Journey | Result |
|---|---|---|
| J1 error, then recovery (break 3 m1) | Forms › IMM 5409 › Draft with AI › Live at US$100, then spend moves to US$119.90, then Start, then Start | 1st Start: red toast, nothing started. **2nd Start: the warning with Continue** (60 ms): expected US$0.21, worst US$2.76, "Spent so far US$119.90 of US$120.00 · Wave 1…". axe 0. The dialog's own sentence still says US$100.00 / US$20.00 left (review Minor 2) |
| J2 main, keyboard | From J1's warning: Tab ×3 to Continue, then Enter | "AI draft started" in 220 ms. 1 override (`user-A`, `experiment`), 1 use, 1 run whose `plan.override` matches. Audit: `ai_override`, then `started … (override …)` |
| J3 error, then recovery (Draft setup, m1) | Draft setup at US$0 (cost line shown), then spend moves to US$119.90, then Start, then Start | 1st Start: "Not started. The worst case (US$9.99) is above what is left… (US$0.10 of US$120)". 2nd Start: the warning with Continue, nothing started. No check covers this path (review Minor 1) |
| J4 bad input (m5) | A Continue whose reason holds a lone high surrogate, a lone low one, then an emoji | 400 "The reason has a character that cannot be stored (half of a character). Type it again; nothing was recorded." ×2, then 201. Exactly 1 ledger line and 1 audit row added, for the emoji |
| J5 wrong role | The approver posts a Continue | 403 "Approver (simulated) does not hold the author duty" |
| J6 sizes (m2 sentence) | The form's dialog at US$30, at 1024, 512 (200 % of 1024) and 400 px | "…US$30.00 of the US$120.00 experiment cap · Wave 1: US$0.00 of US$60.00; US$60.00 left before a cap." No sideways scroll at any width. axe 0 |
| J7 runner, busy lock (m3) | Scratch `settle_runner.mts`: a call finishes while another live process holds the reserve lock | 1 call, completed, answer kept, settle recorded after 319 ms. With the fix removed, the answer is lost |

## Data underneath
* Ledger: one `override` and one `override_use` per started run.
* Nothing was written for a refused reason.
* No reservation other than my seed lines: US$0.
* `ai_batch.plan.override.id` matches the ledger line.
* `audit_event` has the `ai_override` and `started` lines.
* Page errors: 0.

## Break pass (15 min)
* Rule removed for each fix: m3, m5, m7 and the Forms-tab half of m1 are caught; the Draft setup half of m1 is not.
* Settle fallback against the seed tool's temp-file-and-rename: a lost settle over-counts (safe side). It cannot be written twice.
* Lone surrogate edges (an end-of-text high surrogate, a stray low one after a pair): refused, in line with `isWellFormed()`.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J3 |
| Next step obvious | 1 | the warning's Continue and Cancel; after a refusal, the next Start brings the warning |
| Plain words | 1 | "half of a character… nothing was recorded"; "left before a cap" |
| Feedback and state | ½ | J1: the dialog's US$20.00 left beside a toast saying US$0.10 (review Minor 2) |
| Correct data | 1 | J2, J4 exact |
| Error recovery | 1 | J1 and J3 recover in one click inside the dialog (it was ½ at `c71fe137`) |
| Accessibility and sizes | 1 | axe 0 ×2; 3 Tabs; 1024/512/400 px |
| Speed | 1 | warning in 56–60 ms; started in 214–220 ms |
| Visual quality | 1 | `/tmp/rv4/shots/j6-dialog-512.png`, `j1-c-warning.png` |
| Trust and sources | 1 | spend against the cap, the wave and the ceiling; who and why recorded |

**9.5 / 10. Pass.** To raise it: refresh the dialog's spend after a refusal (review Minor 2).

## Not tested
* A headed browser, a real screen reader, or an intended user walking it unaided (D17/D20 stay with the founder).
* A live run.
* The finder dialog.
