# Journey test (reviewer): C11.5 part 1, "Relies on an employer case"

Commit `e68bc9d2`, copy at :4437 used read-only (a suite run was in progress, so I opened no case and reset nothing). 1 Nov 2026. Script: Playwright headless, my own scratch file outside the repo. Run twice, same result.

## Journeys
1. **Main path.** The case officer (user-O) opens "Open a case" by keyboard only and reads whether this case can rely on an employer case. Expected: the line plus "Not offered: the Visitor visa has no employer facts." **Held** at 1024 px, at 720 px @2× (stands in for 200 % zoom) and at 400 px. The line appeared 79–144 ms after Enter. axe clean, no sideways scroll, no console errors.
2. **Across the boundary.** Open the case page of a Visitor visa case (C115B-mvy055ja). Expected: the header says the same, read from the pinned release. **Held**, with axe clean at all three widths.
3. **Wrong role.** The client (user-P) calls the employer-link route and gets 403. The configuration author gets 403, and a request with no actor gets 401. **Held.** The client's questionnaire page does not show the line.
4. **Error.** A malformed combination id gets 404 with plain words (no 500). An unknown id gets 404. A combination with no release gets 409 with the opening words (the builder's check). **Held.**
5. **Alternate (Offered, Corporate).** Not walkable: nothing on the copy has a released work-permit or Corporate combination. The pure rule covers both (`check_c115_employer.ts:21-30`).
6. **Recovery.** Escape closes the dialog. Reloading the case page shows the same line, because it is computed from the pin. **Held.**

## Data underneath
`GET /runtime/cases/:id` returns the same `employer_link` to the officer and the rep. No write happens, so there is nothing to duplicate. The client also receives the field in the API, though it is not shown (review Minor 3).

## Break it
* Garbage id: 404. No actor: 401.
* Keyboard: the ⓘ tooltip is never focused in 25 Tab stops (Minor, `employer.tsx:14`).
* The "Offered" wording claims four kinds of fact even when the forms read one (Minor, `employer.ts:25`).
* No Blocker or Major found.

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The officer sees, before and after opening, whether an employer case applies |
| Next step obvious | 1 | The line is informational in part 1, and "Not offered" says why |
| Plain words | 1 | Board words; no ids or hashes |
| Feedback and state | 1 | Skeleton while loading, error text, reason line |
| Correct data | 1 | Read from the newest release in the dialog and the pinned release on the case |
| Error recovery | ½ | 404/409 words are good; the error state of the line is shown but untested in the browser |
| Accessibility and screen sizes | ½ | axe clean at 400–1440, but the tooltip cannot be reached by keyboard |
| Speed | 1 | 79–144 ms |
| Visual quality | 1 | Team look, muted second line under the team chip |
| Trust and sources | ½ | The Offered reason overstates which facts are read |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

Fixes that raise the low ones: make the tooltip focusable with the shared `Tip`; name the real facts in the Offered reason; add a browser check of the error line.

## Not tested
A real screen reader, true browser zoom, live Offered/Corporate cases (waiting for SI-10), an intended user's unaided walk (D17/D20, the founder).
