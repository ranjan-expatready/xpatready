# Journey test, reviewer: X1 C3, the Overview's setup strip (c0ccd2f6, 1 Nov)

* **Setup:** isolated copy `rv_c3` on port 4449, sample loaded, headless Chromium (`/opt/pw-browsers/chromium`). No live AI (US$0).
* **Walk scripts:** in `/tmp/rvc3`, not committed.
* **Suites replayed:** `check_x1_overview_strip_browser` (24/24) and the three moved suites (52/52, 23/23, 116/116).

## Journeys
1. **Main path. Configuration author, Visitor visa. Goal: "where does setup stand, and what do I do next?"**
   * The Overview shows "Setup steps · 0 of 5 done". Official pages is ● with "Confirm the checklist page". Later steps read "After …".
   * Following the link lands on Forms › Before forms › Official pages, outlined.
   * **Held.** Wrong turn: the header's filled button says "Add 1 form from the library", which the strip places at step 3.
2. **Keyboard only, same page.**
   * Tab reaches the strip's five links after the tabs (30 presses from the top, in DOM order). Enter on "Confirm who can apply" lands on the people part, focused.
   * **Finding:** no visible focus ring on any strip link (computed `outline: none`, `box-shadow: none`). App-wide, not new.
3. **Alternate. "Add 1 form found".**
   * Lands on `/forms?focus=forms%3Asources`, but no element is focused or outlined.
   * The page there says "No form find yet", next to a strip that said "1 form found". The wording is the engine's (C1), outside this diff.
4. **Wrong role, first item. Author on Super visa.**
   * ⧗ with "Waiting for the immigration expert: Choose the checklist page (No page matches)". As the expert, the same row reads ●.
   * As the approver on Visitor visa: ⧗ "Waiting for the configuration author: Confirm the checklist page".
   * **Held.** axe is clean for both.
5. **Live. With an LMIA.**
   * "3 of 5 done · Live". Forms, Questions and documents, and Review and release are ✓ with "See on …". Official pages ● reopened.
   * **Held.** This matches concept §4: a later step stays done when an earlier one reopens.
6. **Old address.** `/c/:id?show=missing` lands on the strip with focus. **Held.**
7. **Errors.**
   * Bad combination id: "This combination could not be opened … Back to programs".
   * Unknown `?focus=` value: lands with no error.
   * **Held.**
8. **Screen sizes.** 400 px, 1024 px and 512 px (200 % zoom of 1024 px): no sideways scroll. The rows stack mark / step / summary / links. **Held.**
9. **Data underneath.**
   * Strip marks and summaries equal `GET /combinations/:id/summary` `setup.steps`.
   * Every link equals `itemHref`. The first link equals `next.href`.
   * Badges equal the strip's counts (Forms 4, Documents 1, Questionnaires none).
   * Nothing is written, because the Overview has no buttons.
   * **Held.**

## Break it (short)
* **Reload mid-landing:** fine.
* **Five combinations in a row as the author:** every strip rendered, no console errors.
* **Not tested:**
  * Two tabs: nothing to save.
  * Long names: the sample has none.
  * Retired: no sample.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Every open item is reachable from the Overview (journeys 1, 2, 4) |
| Next step obvious | ½ | The header box and the strip name different next steps (declared deferral, `plan.md` C3) |
| Plain words | 1 | Step names, "After Forms", "Waiting for the immigration expert: …" |
| Feedback and state | ½ | Marks are shape plus text; no skeleton or error state while the summary loads (`overview.tsx:25`) |
| Correct data | 1 | Journey 9: strip equals the checklist, badges and `next.href` |
| Error recovery | 1 | Journeys 6 and 7 |
| Accessibility and screen sizes | ½ | axe clean in 4 states; 400, 1024 and 200 % work; no visible focus on the links; the tip is `title` only |
| Speed | 1 | Strip visible 269 ms after navigation |
| Visual quality | 1 | Matches board §5 (`x1-strip/01–04`) |
| Trust and sources | ½ | Tier "· sure / not sure" is shown; the Sample mark on people counts is gone; the sure/not-sure tooltip is missing |

**Score: 8/10, pass** (no criterion at 0).

## What would raise it (most valuable first)
1. The founder's answer on the header box, so the page has one next step.
2. A focus ring on the strip links.
3. Focus targets for step 3 items on Forms.
4. A skeleton and error line for the strip.
5. A Sample tag on the people counts.
6. The concept's three tooltips through the team `Tooltip`.

## Could not test
* A real screen reader.
* An intended user's unaided walk: D17 and D20 stay with the founder.
* The ◐ AI row (no live AI).
* The retired state.
