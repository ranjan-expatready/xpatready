# Journey test (reviewer): F2 C3.12, Field map in Shared library › Forms, commit b6d8b50b, 1 Nov 2026

* **Copies.** `rev_c312` on :4456 (sample plus one replayed AI answer, US$0) and `rev_s4l` on :4457 (fresh, the S4 browser suite).
* **Browser.** Playwright Chrome, headless; the screenshots were read as a person would read them. Screenshots are kept outside the repo (`/tmp/rev_c312/shots`). Both copies are stopped and their databases dropped.

## Journeys
1. **Main path.** The content publisher, at 1440 px, asks "Which library forms are fully mapped?"
   * Open Forms and read the Field map column.
   * Hover or focus a cell, then open the IMM 1295 drawer.
   * Expected: a state in words for each form and its meaning.
   * **Held.** 226 of 242, AI draft · 84 to review, No edition yet and No field map, each with a tip. The drawer has "Field map: …" with its meaning.
2. **Next step.** The publisher acts on "226 of 242 form fields decided": they follow the tip "They wait on To review" and open To review.
   * **Failed.** To review shows only the IMM 5257 AI proposals. Nothing for IMM 1295, because its 16 open fields are carried from release 1 (PUBLISHED), not drafts.
3. **AI draft.** The publisher sees "AI draft · 84 to review" on IMM 5257 and opens To review.
   * **Held.** The AI proposals item names IMM 5257.
4. **Keyboard only.** Tab from the IMM 1295 number.
   * **Held.** The Field map cell gets focus with a visible ring and its tip opens. Tab goes on to Status, then Edit. Escape closes the drawer.
5. **Small screens and zoom.** 1024 px, 200 % zoom and 400 px.
   * **Held.** The column hides and the short line shows "Field map: …". There is no sideways scroll. At those widths the short line has no tip (Minor).
6. **Empty and no-file states.** A guide and IMM 5802 (no file yet).
   * **Held.** The guide says "No field map" and has no drawer line. IMM 5802 says "No edition yet", with "upload or find its PDF first".
7. **Wrong role.** The approver (user-B, no author duty) opens the list.
   * **Held.** The same words, read-only.
8. **State changes and reload.** I decided every IMM 5475 field and left one IMM 5707 row a draft, through the database, then reloaded.
   * **Held.** "Complete · 27 form fields" (green) and "50 of 50 form fields · waits for review" (amber).

## Data underneath
* `/api/library/forms/list` counts match SQL over the newest row per data path for all 16 rows.
* The waiting `proposal_item` count matches for the IMM 5257 (09-2023) edition only.
* The page is read-only: no write or audit is expected, and none happened.

## Break it
* **Database states.** Complete and waiting both render correctly.
* **Proposals for an older edition.** They do not move the current edition's count (c312 test).
* **Unknown person.** It stays 401 as before; the list route is unchanged.
* **Not applicable.** Long or non-English text, two tabs and a hostile file do not apply: no input was added.
* **Severity:** 1 Major (journey 2) and 1 Minor (journey 5).

## Score

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1: every form's state is readable in list and drawer |
| Next step obvious | ½ | Journey 2: the tip names To review, which is empty for 6 of 7 mapped sample forms |
| Plain words | 1 | "form field", "field map", "decided", "waits for review"; no ids |
| Feedback and state | 1 | Seven states, shape plus text (green and amber pills, muted text) |
| Correct data | ½ | Counts are exact. The meaning given for carried fields (they "wait on To review") is wrong |
| Error recovery | 1 | No error paths added; reload and person switch keep the same values |
| Accessibility and screen sizes | ½ | axe 0 on 4 states, keyboard and focus tip, no sideways scroll; but no tip on the short line below xl |
| Speed | 1 | 360 ms warm first view; two queries for the whole list |
| Visual quality | 1 | Team Pill and Tip, aligned column (screenshot `after-02-list-1440.png`) |
| Trust and sources | 1 | AI proposals marked and kept apart: "nothing is mapped until a person accepts them" |

**7.5/10, no criterion at 0: below the pass line of 8.**

**Fixes that would raise the score, most valuable first:**
1. Separate the carried-unresolved tip from the draft one: "from an earlier release: decide them when this edition is drafted again". This raises next step and correct data.
2. Add the same tip to the short line below xl.

**Not tested:** a real screen reader, and an intended user's unaided walk (D17 and D20 stay with the founder).
