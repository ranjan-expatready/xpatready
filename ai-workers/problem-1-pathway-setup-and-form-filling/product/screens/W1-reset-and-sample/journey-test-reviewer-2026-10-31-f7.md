# Journey test (reviewer): runtime F7 (X9a, X9b), commit 446a4d82, 31 Oct

Reviewer agent, CHECK of 446a4d82. This is the one journey score for this check.
* **Copy:** isolated `rv_c101` on :4431, fresh database, stopped at the end.
* **Browser:** Chrome headless through Playwright, with axe WCAG 2.2 A/AA.
* **Scripts:** `/tmp/rvjs/journey.cjs` and `j2b.cjs` (not kept).
* **Runs:** the main walk ran once. The To review part ran 3 times, with the same result each time.
* **Cost:** US$0. No `*_LIVE` switch.

## Journeys
1. **Configuration author, main path (keyboard only):** "Load the configured demo and see what each row shows."
   * Tab reached Demo. Enter, then arrows, reached "Load the configured checkpoint…". Enter on the confirm button.
   * The result came after 28.7 s, with a toast "loaded in 28.5 s".
   * Row 1 is **Done**: "an off-list copy of IMM 5476 (11-2021) (imm5476e-2021-from-email.pdf) held for a source check, its IRCC page recorded by Configuration author, approved by Approver. Then the intake kept it aside as an edition older than the library's IMM 5476 (11-2025): not used." The 2 unreadable official files stay held, with the reason.
   * Row 10's K1 example is a caption, not a PDF path.
2. **Same result at 1024 and 400 px:** no sideways scroll (scrollWidth equals the width). axe on the dialog: 0.
3. **Approver on To review:**
   * Needs you shows 8: 6 form-field items and the 2 unreadable held files ("Reject the copy").
   * All adds "New edition IMM 5476 (11-2021) … An older edition than the one in the library: it is not used unless a person decides otherwise. Waiting for others: The configuration author reviews it."
   * axe 0. No sideways scroll at 400, 1024 and 1440 px.
4. **Wrong path or role:** approving the older copy again by API, as the Approver or as the author, gives 409 "This file is not waiting for a source check." Nothing changed.
5. **Screen boundary (the trail):** the Activity data has 3 lines: the author recorded the IRCC page; the Approver approved, naming the uploader; the author's re-intake was kept aside as an older edition.
6. **Recovery:**
   * Reset after the load removes the approved-sources folder of the copy.
   * Loading twice is refused with "Reset first" (`check_c10_1_configured`).
7. **AI now with the fake launcher alone (m7):** the live plan gets 409 "AI now is not approved yet", with the plain why ("waits for the founder's Go … Use rules only, or saved AI answers"). Rules only still plans.
8. **Signed scan, Documents tab against the case (m6):** proven by the 180-case parity suite and by `check_c3_11_browser` 21/0. No sample form uses a hand-scanned PDF upload, so there was nothing new to walk on screen.

## Data underneath
* 1 `approved_source` row (user-A uploaded, user-B approved) and 2 intake rows (DONE/held, then HELD/older_edition_held).
* 0 `form_edition` rows for 11-2021, so nothing is used. The spend ledger is unchanged (suite).
* The server enforced the roles: the uploader cannot approve, and a decided file cannot be decided again.

## Break-it pass
* **Mutation, live gate widened:** the x9b plan checks fail (good). The start-route check still passes, on a sha-mismatch 409 (review m1).
* **Mutation, old Documents-tab rule:** the parity and fail-guard checks fail (good).
* **The leftover older copy:** the configured demo leaves one open To review item for the author (review m2).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Row 1 Done through intake → page recorded → second-person approval; K1 caption verified |
| Next step obvious | ½ | The leftover older copy on To review ("the configuration author reviews it") is not mentioned in row 1 (m2) |
| Plain words | 1 | Row 1 and the refusals are in words, with no paths or codes. The file names are what a person uploaded |
| Feedback and state | 1 | Toast with time, a status chip per row, and To review states |
| Correct data | 1 | One approval, the right people, the older edition never used, Reset cleans the folder |
| Error recovery | 1 | 409s in words; double load refused |
| Accessibility and sizes | 1 | Keyboard-only load; axe 0 on the dialog and To review; 400, 1024 and 1440 px fit |
| Speed | 1 | The held-file step takes 0.7 s of a 28.5 s load (no budget for the load; the time is mostly intake and form read, unchanged) |
| Visual quality | 1 | Team dialog and chips unchanged (screenshot j1-result-1440) |
| Trust and sources | ½ | The audit names who and which page. The "Sample" approval note is dropped (n1), and the committed result screenshots are stale (m3) |
| **Total** | **9 / 10** | Pass (8 or more, no 0) |

**To raise it:**
* m2: row 1 words, or a set-aside by the author in the load. This gives Next step obvious 1.
* m3: commit the re-shot screenshots. This gives Trust and sources 1.

## Could not test
* A real screen reader. An intended user's unaided walk: D17 and D20 stay with the founder.
* A visible (headed) browser.
