# Journey test: N6 P-179 follow-ups at `c71fe137` (reviewer, 31 Oct)

The setup was isolated copy `n6rev3` on :4458, with the queue held, no live switch, and a scratch ledger: US$0. The browser was headless Chromium/Playwright. Scripts and screenshots are in `/tmp/rev3/` (session scratch). Review: `review.md`.

## Journeys (configuration author unless said)
| # | Journey | Result |
|---|---|---|
| J1 main | At US$119.90: Forms › IMM 5409 › Draft with AI › Live › Start, then the warning, then Continue | The warning shows expected US$0.21, worst US$2.76, the cap line and the limit (axe 0). "AI draft started": 1 override, 1 use, 1 run carrying the override, audit lines present |
| J2 recovery (review N2) | Continue, then the launch is refused (a stub pass queued meanwhile), then Stop the stub, then Start, then Continue | Same Continue reused: 1 line, 1 use, 1 run, 412 ms. Audit says "again" |
| J3 held | Another start's Continue holds US$12 | No Continue. "Other Continues … still hold US$12.00 … Wait a few minutes, then look at the cost again." No mention of the founder |
| J4 Cancel / Escape | Cancel, and Escape pressed at once after Enter | Nothing started or recorded; the form's dialog stays; focus is back on Start |
| J5 wrong role | The approver posts a Continue | 403 |
| J6 stale plan (error) | Live chosen at US$100, spend moves to US$119.90, then Start ×2 | **Red toast only, twice**: no warning, no re-plan (review m1). Recovery: reopen the dialog |
| J7 keyboard and sizes | Tab path, 400 px and 512 px (200 % of 1024) | 3 Tabs to Continue; no sideways scroll at either width |
| J8 across the boundary | Queued run, then another start's plan, then Stop the run, then plan again | Held US$2.76 while queued; US$0 once stopped |

## Data underneath
* Ledger: exactly one `override` and one `override_use` per run started.
* `ai_batch.plan.override.id` matches the ledger line.
* `audit_event` has both `ai_override` lines (first, then "again") and the `started` line naming the override.

## Break pass
* Escape before the layer is ready: held.
* Continue pressed again while still refused: "The work changed…", in words, nothing written.
* NUL in the reason, malformed ledger lines, a dead lock holder, a busy lock: covered by the suites (all green), and 5 rule-removal mutations were each caught.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J8 |
| Next step obvious | 1 | warning, wait words, info toast on Cancel |
| Plain words | 1 | wait and busy words; cents |
| Feedback and state | 1 | "AI draft started"; the error stays inside the warning |
| Correct data | 1 | 1 override, 1 use, 1 run; audit exact |
| Error recovery | ½ | J6 dead-end toast (m1) |
| Accessibility and sizes | 1 | axe 0; keyboard; focus returns; 400/512 px |
| Speed | 1 | warning under 1 s; start 307–412 ms |
| Visual quality | 1 | `screenshots/p179/04-forms-tab-warning-*` |
| Trust and sources | 1 | spend against cap and ceiling; who and why recorded |

**9.5 / 10. Pass.** To raise it: fix m1 (re-plan on any launch refusal).

## Not tested
* A headed browser, a real screen reader, or an intended user walking it unaided (D17/D20 stay with the founder).
* A live run.
* The finder dialog in a browser.
