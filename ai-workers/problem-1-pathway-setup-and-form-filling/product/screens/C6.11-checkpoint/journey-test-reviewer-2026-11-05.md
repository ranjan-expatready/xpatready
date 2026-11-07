# Journey test (reviewer): C6.11 Firm, users and case team on the configured checkpoint (PR #1072)

Reviewer: fresh agent, did not build it · 5 Nov 2026 · commit e1801f98f (merge base ffcfb45c8).

Setup:
* Copy `rev611` on :4436 (never :4400). Demo › Reset, then Load "configured" as `user-A`: 83 s, US$0.
* Walked in headless Chromium at 1440, 1024 and 400 px, and at 200 % zoom (720 px CSS at device scale 2).
* Data read with psql and the API.
* The copy was stopped at the end: database dropped, port free.

## Journeys (persona · goal · result)
1. **Main.** Firm admin (user-R): "open a Visitor visa case for a family and see who signs the representative's form".
   * Steps: Open a case, add a spouse and a child of 10, answer the dates of birth.
   * Result: Prepare application lists IMM 5476 for Client A and Spouse A, none for the child. **Held** (`check_c611_imm5476_browser.cjs` 15/15, re-run).
2. **Alternate.** Firm admin: "hand the case to the second representative".
   * Steps: Case team, then Change to, a reason, then Change representative.
   * Result: the dialog says "A new IMM 5476 is needed". The Agent view shows R000002, and the IMM 5476 item carries `representative: user-T`. **Held.**
3. **Error.** Case officer: "record that the client uses no representative".
   * The screen gives no Edit, only "Change it in the firm record". The API refuses with 422: "…Change the team, not the answer."
   * Nothing is stored. **Held**, with a wording mismatch (finding 4).
4. **Recovery, existing data.** Case officer: "confirm Personal details for the application" on a case where "Uses a representative" was typed before this PR.
   * Setup: a DECLARED `false` row seeded with psql, as #967's question allowed.
   * The screen shows "Yes · From the firm record". **Confirm section → 409** "Some answers in this section changed… Review them and confirm again", with `changed: [case.uses_representative]`.
   * Clicking again gives the same 409. Nothing on screen changed, and the hidden row cannot be seen or replaced (PUT gives 422). **Dead end** (finding 1).
5. **Wrong role.** Client (user-P): typing "Uses a representative" gets the same 422, which tells them to "change the team". A client cannot do that. Team changes by the client or the author give 403 (pack check 14). **Held**, with a wording finding.
6. **Screen sizes and keyboard.** Agent view, "The representative" tab:
   * No sideways scroll at 400, 1024 or 1440 px, or at 200 %.
   * axe WCAG 2.2 A/AA finds nothing on each.
   * Keyboard only: Tab reaches "Case team", Enter opens the dialog, Escape closes it. **Held.**
7. **Across the screen boundary.** Agent view → Prepare application → IMM 5475.
   * The representative's office address, e-mail and phone now say "fills IMM 5475 for 3 people", locked. On main only the name did.
   * IRCC says IMM 5475 is for "someone who will not act as your representative". **Wrong person on an official form** (finding 2).
8. **Neighbour.** QA-227's journey "a case answering No lists neither IMM 5476 nor IMM 5475" (`tests/check_b52_own_yes_no.ts`).
   * Main: 52/52. This PR: 49 passed, 9 failed. That journey can no longer be walked on a firm case, and its suite was not updated (finding 3).

## Data underneath
* The case team is stored once (LEAD_REPRESENTATIVE once; pack checks 8 and 18).
* Firm-record answers are never stored: no `client_canonical_answer` row for `case.uses_representative` after any walk.
* The 422 stores nothing (`check_c611_team` 67/67, re-run).
* State() hides a stored earlier answer: the row stays in the database, and nothing on screen shows it.

## Break-it (15 min)
* A stored earlier answer: dead end (journey 4).
* Typing a remaining representative fact (`representative.licensing_province`): 404 "That person is not on this case". This was the same on main; noted, not counted.
* Double click on Confirm section: the same 409, no duplicate rows.
* The client's 403 on the case page: client screens come after M3, not a finding.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1 and 2 end to end by screens (15/15). |
| Next step obvious | ½ | "Change it in the firm record" names a place with no screen (SI-9). The way to change it is the Case team dialog. |
| Plain words | ½ | The screen says "firm record", the 422 says "Change the team". The client is told to change a team they cannot reach. |
| Feedback and state | ½ | The 409 toast in journey 4 says "Review them" when nothing on screen changed. |
| Correct data | ½ | IMM 5476 is right (VV-R10 cited; the licence part and the firm). IMM 5475's designated individual is filled with the representative (journey 7). |
| Error recovery | 0 | Journey 4 has no way out for the officer. |
| Accessibility and screen sizes | 1 | axe finds nothing at 400, 1024 and 1440 px and at 200 %. Keyboard opens and closes the dialog. |
| Speed | 1 | Case page to Agent view in 533 ms. Pack 25/25 in 3 s. |
| Visual quality | 1 | Clean "From the firm record" pill, team look (reviewer screenshot `officer-confirm-409.png`, not committed). |
| Trust and sources | 1 | Source pill and channel on each line. VV-R10 quotes match `page-imm5476.html` (modified 2025-12-12). Sample marked. |
| **Total** | **7 / 10** | **Fail**: below 8, and error recovery is 0. |

Fixes that raise the score, most valuable first:
1. Confirm section ignores a stored answer the firm record replaces. This raises error recovery and feedback.
2. Keep the firm-record contact off IMM 5475, or get a ruling (correct data).
3. One wording for where "Uses a representative" changes: the Case team dialog, and nothing for the client (next step, plain words).

Not tested:
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* The demo's own cases on :4400: not reachable from here.
