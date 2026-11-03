# C6.1 journey test, reviewer role, 2026-11-03 (commit d7b9b80fa)

Copy `rev2_open` on :4438 (not :4400), live AI off, US$0. Browser: Playwright Chromium (headless; walked step by step through what a person sees). Replay: `tests/check_v3b1_openable.ts` 24/24.

## Journeys
1. Main: the case officer opens a case on a ready release. Cases, then "Open a case", pick "Visitor visa · release 1", reference, name, Open case. Expected: case opens. **Held** (B1-4, B1-14 201).
2. Alternate: one release not ready. The dialog offers only "With an LMIA" and names Visitor visa under "Released, not ready for new cases" with the plain sentence. **Held** (B1-11, B1-12, 1440 px axe clean).
3. Empty: none ready. No list, the warn notice shows, Open case is disabled with a title, Enter sends nothing. **Held** (B1-13, B1-13a, 400 px no sideways scroll).
4. Error: the release turns not ready while the dialog is open. Expected: a 409 in the officer's words, the release no longer offered, and a retry on the shown combination works. **Partly held**: the 409 sentence shows and the list reloads, but the retry sends the refused combination again while the select shows "With an LMIA" (review M1).
5. Error: a proxy answers HTML with 200. Expected: "Could not load", no blank page. **Held** (B1-17).
6. Wrong role: client and author read `/runtime/openable`. Expected: 403. **Held** (B1-1, B1-2).
7. Recovery: the cause is fixed. The release is offered again and opens (B1-14, B1-15). **Held.**
8. Across the boundary: a 201 navigates to the case page (onDone `nav`). Seen in B1-4 and B1-14 at the API; the page hand-off is unchanged from the base.

## Data underneath
Every refused POST in the run wrote no `runtime_case` row (B1-8 counts them). The 409 detail and the list's `why` are identical strings (B1-9). The retired field was restored to PUBLISHED after my probe (checked in the database).

## Break pass (short)
- Retry after a 409 with the dialog left open: **Major**. The dialog shows one combination and sends another (review M1).
- HTML 200, null body, slow response: handled (B1-17 and the breaker's report).
- Keyboard: Tab reaches "Open a case" and Enter opens the dialog with focus inside. 512 px (200 % of 1024): no sideways scroll.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 2, 7 open cases (201) |
| Next step obvious | ½ | After a 409 the shown choice "With an LMIA" is not what Open case sends |
| Plain words | 1 | One sentence, no keys or author steps (B1-10) |
| Feedback and state | ½ | The toast names Visitor visa while the select shows LMIA |
| Correct data | 1 | No case written on a refused release. The stale-id race is only theoretical (M1) |
| Error recovery | ½ | The retry fails again; the officer can recover only by closing the dialog when one option is left |
| Accessibility and screen sizes | 1 | Axe clean at 1440 and 400 px; keyboard path; 512 px fits |
| Speed | 1 | One list call; 24 checks in 31 s |
| Visual quality | 1 | Team look, notices wrap (screenshots 01-04) |
| Trust and sources | 1 | The list and the 409 use one rule and one sentence; Sample names only |

**8/10, pass on score (no 0).** The review still blocks on M1. Most valuable fix: derive the chosen combination from the current list, so the screen and the request always agree (raises next step, feedback and recovery).

## Not tested
A real screen reader, real browser zoom, an intended user's unaided walk (D17/D20 stay with the founder).
