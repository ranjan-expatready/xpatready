# B135 · C6.13 journey test: reviewer, 7 Nov 2026

Role: reviewer (the one journey score for this check). Commit `5c5f726591e6d4e9d82ccf71742bef14786363db`. Copy: isolated `rv135` on :4444, set up with `setup_visitor_visa.ts` and `setup_vv_m3.ts`, stopped after. Browser: headless Playwright Chromium; no visible pane in this cloud session, so each step was driven by role, label and keyboard as a person would, with screenshots read back. Scripts in the reviewer's scratchpad (`walk.cjs`, `walk2.cjs`, `walk3.cjs`, `probe.mts`), not committed.

## Journeys (persona · goal · expected)
1. **Main.** Case officer: "This spouse's application was added by mistake." Expected: ⋯ → Remove filing → the other filings named → reason → done, reason on the row.
2. **Alternate.** Case officer: "The spouse should be the principal." Expected: Make principal names the capped fee moving and the minors' signer; the roles swap; the client's answers keep their confirmation.
3. **Keyboard only.** The same as journey 1 with Tab, Enter, the arrow keys and Escape; focus returns to the row.
4. **Refused.** Remove on the principal; Make principal on a child. Expected: refused in words, before any click.
5. **Conflict.** The case changes under an open dialog. Expected: "This case changed since you opened this. Look again"; nothing changes.
6. **Recovery.** Double click and two racing changes. Expected: one applies.
7. **Read-only.** A case whose group is recorded as submitted. Expected: nothing offered, and it says why.
8. **Wrong role.** The client opens the case page by URL. Expected: refused.
9. **Across the boundary.** After the change, Prepare application and the client's questionnaire agree with it.
10. **Undo.** Undo after Remove. Expected: Add filing back, reason "Undo: …".

## What held
* Journeys 1, 2 and 10 (walk 10/10 and my walk):
  * the dialog names Sample Client A's and Sample Child A2's filings, CAD 570 → CAD 470 (`03-remove-dialog.png`; mine `r02`);
  * the reason shows on the row (`r05-1024`);
  * Undo prefills "Undo: …".
* Journey 2: confirmation was unchanged across the swap for 32 answers, including 16 "none apply" groups, an adult child (19) and minors (probe 4). The capped biometrics moved to the new principal (pack 6).
* Journey 4: the principal's menu shows "Remove filing · Make someone else principal first."; a child's shows the refusal (walk2).
* Journey 6: racing Remove and Make principal gave 200 and 409, with one `filing_change` row. A double apply gave 200 and 409 (probe 2, 3).
* Journey 7: each row reads "Recorded as submitted: no person or filing changes here", and the API answers 409 with the date and the number (pack 10).
* Journey 8: the client reads "This page is for the case officer" (`r06`). The API gives 403 to the client and to configuration people, and 404 to another firm (pack 11).
* Screens: axe WCAG 2.2 A/AA clean on the table, the principal's menu, the dialog and after the change. No sideways scroll at 1024, 720 (200 %) or 400 px. Preview 44 ms; case page ready in 1.1 s cold. No page errors (only the expected 409 in the console).
* Data: the reason is kept on `filing_change` and not in the audit; ids and items come back on Add filing back (pack 4); an UPDATE is refused by the trigger (pack 12b).

## Findings (details and fixes in `review.md`)
| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | Major | After Make principal, all four Ready to file filings went to Not started; the preview named only two (the minors' signer-only filings were silent) | probe 1; `S/api/src/filing-changes.ts:93-94` vs `:133-134` |
| 2 | Major | That reset has no test | grep of pack, engine checks and walk |
| 3 | Major | Conflict words never shown; the dialog silently reloads with new numbers, and a second click applies | walk journey 5; `S/web/src/runtime/filing-changes.tsx:109,123`; `r03-after-stale` |
| 4 | Major | Keyboard: focus on `BODY` after the change is applied | walk journey 3 ("after apply focus: BODY") |
| 5 | Minor | Refused menu items unreachable by arrow keys (`tabIndex -1`); focus sits on the empty menu | walk journey 3 |
| 6 | Minor | Role ⓘ not focusable (tooltip on hover only) | walk ("role info focusable: no") |
| 7 | Minor | After a swap the client's page marks the new principal "(you)" | `S/web/src/runtime/questionnaire.tsx:533` |
| 8 | Minor | Recorded-row and child-refusal words shorter than the concept's | `r07-recorded`, walk2 child menu |
| 9 | Minor | 400 px: long names break mid-word | `r05-400` |

## Score (0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | All three changes done on the screen, journeys 1, 2 and 10 |
| Next step obvious | 1 | Each menu item gives its consequence; Undo in place |
| Plain words | ½ | Findings 7 and 8 |
| Feedback and state | ½ | Conflict silent (3); some resets not named (1) |
| Correct data | ½ | Minors' Ready to file marks taken back without being named (1) |
| Error recovery | ½ | Typed reason kept; the 409 reload is silent (3) |
| Accessibility and screen sizes | ½ | axe clean and widths fine; focus lost (4); findings 5 and 6 |
| Speed | 1 | 44 ms preview; 1.1 s page |
| Visual quality | 1 | Team look; `r02`, `r05-1024` |
| Trust and sources | 1 | Fee amounts "from the cited fee table, Sample"; reason with who and when |
| **Total** | **7.5 / 10** | **Below the pass (8), no criterion at 0** |

Fixes that raise the score, most valuable first:
1. Name every Ready to file reset in the preview, or reset only those named (correct data, feedback).
2. Keep the conflict notice through the reload (feedback, recovery).
3. Return focus to the row (accessibility).
4. Make the refused items and the ⓘ focusable (accessibility).
5. Key "(you)" and "answered by" on the client (words).

## Not tested
* A real screen reader.
* A hostile file upload (this screen takes none).
* Two browser tabs racing; the two-request race and double click were tested through the API instead.
* An intended user's unaided walk (D17, D20 stay with the founder).
