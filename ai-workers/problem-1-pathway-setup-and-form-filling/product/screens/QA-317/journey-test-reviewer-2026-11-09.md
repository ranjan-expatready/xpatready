# QA-317 answer sheet link and page: journey test, reviewer role (9 Nov 2026, PR #1393 at 32b96f6ae)

Skill journey-test, reviewer role: the one score for this check. Copy `rv_q317` on :4438 (`isolated.sh`, web rebuilt
from this commit by `web-fresh.sh`), reset and `configured` loaded by the check itself; Chromium headless at
/opt/pw-browsers/chromium. Live AI off, US$0. Cases opened through the acceptance helpers (setup only); every journey
step below is screens only. Builder's check run twice on my copy: 28/28, exit 0 both times.

## Journeys (persona · goal · steps · expected → seen)
1. **Main, case officer, 1440 px, mouse:** "type IMM 5257 for the spouse into the IRCC account". Cases › the family
   case (4 people) › Prepare application › Online line › "Open answer sheet: IMM 5257 for Sample Spouse A". → Opens
   `/cases/:id/sheet/:item` in 466 ms; h1 "IMM 5257 answer sheet · Sample Spouse A"; trail Cases › case › sheet. Back,
   forward and reload hold; no console or page error. Four links, one per person, each to that person's item.
2. **Keyboard only:** from the top of a one-person case page, Tab ×47 reaches the link (2 px solid focus ring), Enter
   opens the sheet, Tab order: Cases, case, first Copy, then each "Still to answer or confirm" summary. Enter on Copy
   puts the value on the clipboard and the button reads "Copied". Held.
3. **Copy after a full fill:** every answer shows with person and source; an address lists its parts with their own
   Copy. → Held, **but** "Current marital status: `annulled_marriage`" and "Kind of temporary resident visa:
   `VisitorVisa`": the release's option keys, not its labels ("Annulled Marriage", "Visitor visa", which the Agent view
   shows for the same facts). The page says "Copy gives each answer as the portal takes it". (Major 1 in review.md.)
4. **Clipboard refused** (`Clipboard.prototype.writeText` rejects, as on a page served over plain http or a locked-down
   browser): row Copy selects "India" and says "Selected: press Ctrl+C to copy". Held. **Part Copy (city) selects
   "Sample Road, Sample City, Canada"**, the whole address, and says the same. (Major 2.)
5. **390 px stacked:** each answer a block with "Person:", "Answer:", "Source:" before the value; table, row, cell and
   column-header roles kept in Chromium's tree; no sideways scroll; axe clean. 1024 px and 200 % zoom (720 × 450 CSS px):
   no sideways scroll.
6. **Channel changed:** Sample Child A2's IMM 5257 changed to PDF upload (C11.6). → The Online line drops A2 from its
   people and its links (3 left); A2's old sheet URL says "This form has no answer sheet … filed as PDF upload", with
   the way to change it and back. Held (by hand; no test covers it).
7. **Out of date (tick through the API, B4 not built):** tick "Personal details", then change the date of birth.
   → Section pill "Entered by Case officer (Sample), 9 Nov, 04:20 · 38 still to answer or confirm" (warn), then "Out of
   date"; item pill "Out of date" with the server's reason. The reason dates the tick "8 Nov 2026" (server time zone)
   while the pill said 9 Nov (pre-existing server words; Minor).
8. **Wrong role:** client by URL → "This page is for the case officer", API 403. Representative (user-R) → reads the
   sheet (200, staff). Solo firm (user-S, other firm) → "No such answer sheet · No such case.", API 404. Held.
9. **Break it:** another case's item under this case's URL → the sheet of the other case under this case's trail, h1
   "IMM 5257 answer sheet · " with no person and no state (Minor). Unknown item → 404 words. A 160-character non-Latin
   family name at 390 px → wraps, no sideways scroll.
10. **Across the boundary:** Back to the case from the trail and the error notices lands on the case page. The step
   after (tick, B4) is out of scope.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2: link → sheet → Copy, by screens and by keyboard |
| Next step obvious | ½ | links are clear, but sit 47 tabs down the case page with no item state beside them (review m3) |
| Plain words | ½ | option keys as answers (J3), "(W6)" in the order note, "IRCC account" and "portal" in one header |
| Feedback and state | 1 | "Copied" + polite live region; Not entered / Entered / Out of date; skeleton; refusals worded |
| Correct data | ½ | values are the server's; option keys (J3); part fallback selects the whole address (J4) |
| Error recovery | ½ | 403/404/409 worded with a way back; second 409 gets the wrong advice; cross-case and Prepare errors silent |
| Accessibility and screen sizes | 1 | axe clean 1440/390 (builder's check, twice), keyboard J2, 1024 px, 200 %, 390 stacked |
| Speed | 1 | sheet open 466 ms with both reads; no per-row request |
| Visual quality | 1 | team Pill, Button, Notice, tokens; screenshots `QA-317/screenshots/01–03` |
| Trust and sources | 1 | Source column, "To confirm" (P-411), item state and reason the server's |
| **Total** | **8 / 10** | **Pass (8, no 0)**; Major 1 and 2 would take correct data and plain words to 1 |

## Not tested
A real screen reader; Safari's table semantics with `display:block` cells; a recorded (read-only) filing walked to
Submitted; a Prepare view not derived (no such combination with an Online line on the checkpoint); an intended user's
unaided walk (D17, D20 stay with the founder). My screenshots and logs: scratchpad `rv/` (not committed).
