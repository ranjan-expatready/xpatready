# C7.3 journey test: the "Entered in the portal" tick (reviewer, 9 Nov 2026, PR #1430 at 58050bf91)

Role: reviewer (the one journey score for this check). Copy: the builder's isolated :4441 (`xr_studio_scr_c73`,
configured checkpoint, built from this commit). Never :4400. Live AI off, US$0. Each journey ran on a case of its own:
Sample Client R, S and V. On each, IMM 5257 is filed Online (C11.6) and every answer is filled and confirmed. Walked in
headless Chromium by clicks and keys, and checked against the API and the database. Full review: `review-tick.md`.

## Journeys (persona: the case officer, unless named)
1. **Main path:** "I typed each part into the portal; mark it so the case knows." Case page › "Open answer sheet: IMM 5257
   for Sample Client R · To do" › "9 of 9 sections still to tick" › tick each section › "Every section is ticked" ›
   back on the case, the line reads "· Done". **Held** (and at 1024 px by keyboard only: C7.3-40..50).
2. **Alternate, taking a tick off:** "I ticked the wrong part." "Take the tick off" › the reason box takes the focus ›
   type › submit › "Tick taken off by Case officer (Sample), <time>. Reason: …". The count goes back up and the focus
   moves to the section's tick. **Held.** Escape or "Keep the tick" changes nothing (C7.3-43).
3. **Error, no reason:** submit with the box empty › "Say why the tick comes off." on the field, tick kept. **Held.**
4. **Error, a two-line reason:** Enter in the box, then a second line › "Write the reason as plain text: it holds a
   hidden or control character." The cause, the line break, is not named. **Partly** (review m2).
5. **Changed answer after a tick:** the family name changes to SAMPLERV › the pill reads "Tick cleared: answers changed".
   The card lists "was SAMPLE, now SAMPLERV" and "Enter the new answers in the portal, then tick again". The count goes
   to 8 of 9, and the item reads Out of date with the server's reason. **Held.** The why sits under 31 rows (m6b).
6. **Two tabs:** tab A takes the tick off; tab B, opened earlier, tries to take it off › "Changed since you opened the
   sheet … no tick to take off. Reload the sheet." with Reload › **held**. After Reload, the reason form stays open on
   a section that is no longer ticked, and the focus falls to the page body (m1).
7. **Double click** on a tick: 1 row and 1 audit line. **Held.**
8. **Wrong role by address:** a client gets "This page is for the case officer", with no sheet and no control
   (C7.3-51). A configuration author's API calls get 403. In the browser the case side switches the author to the
   simulated case officer, as before. **Held.**
9. **All ticked while a fact still waits for confirmation (Sample Client S):** the page reads "Every section is ticked".
   The item reads To do, "Waiting for 1 fact to answer or confirm: Family name…". Both are true and they do not
   contradict. **Held.**
10. **Across the boundary:** back on the case page, the Online line shows "· Done" (journey 1). **Held.**

## Data underneath
* Tick: one `entered_section` row with its snapshot. Audit: "Case officer ticked "Personal details" of IMM 5257 as
  entered in the portal … (31 answers frozen)".
* Untick: the row is kept with `superseded_at`. The audit line ends "Reason: <text>", and `detail.reason` holds the same
  text. The section's `unticked` repeats it exactly. A 400-character mixed-script reason (Arabic, Hindi, Latin) saved
  as typed. 401 characters: refused with "Keep the reason under 400 characters."
* Roles are enforced on the server: an author or client tick or untick gets 403, and nothing is saved (C7.3-20, -24).

## Break it
* Invisible reason `"ㅤ"` (Hangul filler): **accepted** (200). The sheet then shows a blank reason (m3, Minor). The
  shared `Reason` rule blocks it.
* A stale `entered_at`: 409 "ticked again since you read the sheet". A second untick: 409 "not ticked". **Held.**
* Reload partway through: the state comes back from the server and nothing is lost. **Held.**
* Severity: no Blocker, no Major. Minors m1–m6 are in `review-tick.md`.

## Accessibility, sizes, speed
axe WCAG 2.2 A/AA found 0 violations on six states: loaded at 1440 and 1024, reason form open, out of date, 400 px,
and 720 px (200 % zoom of 1440). There is no sideways scroll at 400, 720 or 1024 px. The keyboard-only path is C7.3-41..50
(Tab, Enter, Escape, typing). First view of the sheet: about 0.43 s. Tick round trip: 0.36 s. No page errors.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | journeys 1 and 10: To do › Done, and the case line shows Done |
| Next step obvious | 1 | one "Entered in the portal" per section, the count, "tick again" on a cleared section |
| Plain words | ½ | the line-break message (journey 4); "Keep the tick" when there is no tick (journey 6) |
| Feedback and state | 1 | toast, pill with who and when, live count, focus kept after a tick or untick |
| Correct data | 1 | one row per tick, history kept, reason exact in the audit line and on the sheet |
| Error recovery | ½ | Reload leaves the reason form open (journey 6); recovering from the two-line reason is unclear (journey 4) |
| Accessibility and screen sizes | 1 | axe 0 on six states, keyboard pack 13/13, 200 % and 400 px fine |
| Speed | 1 | ≈0.43 s first view, ≈0.36 s tick |
| Visual quality | 1 | team Pill, Button, Notice, Field; builder's `walk-tick/*.png` |
| Trust and sources | 1 | who and when for each tick, reason for each untick, "was … now …" for each change; no AI |

**9 / 10. Pass** (8 or more and no 0). To raise it: fix m1 (close the form on Reload and give the focus back), then m2
(name the line break, or accept it as a space).

Not tested: a real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); a recorded
filing's sheet in the browser.
