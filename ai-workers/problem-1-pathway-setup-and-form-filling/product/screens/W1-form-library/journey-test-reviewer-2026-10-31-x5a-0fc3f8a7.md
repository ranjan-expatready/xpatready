# Journey test: X5 paging polish (PR #145), reviewer, 31 Oct 2026, commit 0fc3f8a7

Role: reviewer, the one journey score for this check. Scope: paging in Shared library › Forms after the fill from IRCC's forms list (237 rows), including Show more focus and the always-mounted count status. It is stacked on 310acb9c.

**Setup.**
* Isolated copy `rvx5d` on :4452 (ledger `/tmp/rvx5d-ledger`), with the web built from this commit. The library was filled by the browser suite through the product's own Fill button.
* Playwright probes in `/tmp/rv7/`, run twice with identical results.
* US$0, with no `*_LIVE` set.

## Journeys (configuration author, then a reader of the list)
1. **Main, keyboard.** Goal: "show me the next 50 and carry on from there." Tab to Show 50 more forms → Enter → keep reading from the first new row.
2. **Keyboard repeat.** "Again, 50 more": press Enter twice in a row.
3. **Last page.** Show more until all 237 are shown. "Did it load them all?"
4. **Filter while every row is shown.** Press No file yet, Guides, then All.
5. **Search while typing.** Type "imm 5257", then "passport" (no match).
6. **Mouse.** Click Show more; click a title cell.
7. **Screen sizes.** Main path at 1024 px, 1024 at 200 % (512 px) and 400 px.
8. **Recovery.** Reload the page: it starts again at 50.

## What held
* **J1.** Focus lands on row 51 (IMM 0017), a `row` that is focusable and focused in Chrome's accessibility tree. Tab goes on to its number button. axe 0.
* **J2.** The second Enter opens no dialog: 150 rows, 0 dialogs (suite step and my probe).
* **J3.** The count says "Showing 237 of 237 forms" after the last press, and focus is on a row it added.
* **J4.** The rows shown, render by render, read `237 > 50`: never more than 50 after the press. Guides gives "Showing 4 of 4 forms". All gives "Showing 50 of 237".
* **J5.** The status ends on the right count ("2 of 2"; "No form matches").
* **J6.** Neither mouse action shows an outline, which is correct.
* **J7.** No sideways scroll, and the focused row is in view at all three widths.
* **J8.** A reload starts again at 50.
* **Page load.** It says "Showing 50 of 237 forms" once.
* **Errors.** 0 console or page errors.
* **Mutation.** With the three old behaviours put back, the four new steps fail (85/89). Without them the suite passes 89/89.

## Findings
1. **Major: no visible focus on the row Show more focuses (J1, J7).**
   * On keyboard focus the row matches `:focus-visible`, but its computed `outline-style` is `none`. Tailwind 4's `outline-none` sets `--tw-outline-style:none`, which `focus-visible:outline-2` then uses (`library-forms.tsx:129`).
   * Screenshot `/tmp/rv7/focused-row-1440.png`: the row looks unfocused. With `outline-style:solid` injected it shows clearly (`/tmp/rv7/fixed-outline-1440.png`).
   * This breaks EXPERIENCE.md #12 [M] and WCAG 2.4.7. No check catches it.
2. **Minor: the status updates while typing (J5).** "imm 5257" makes 5 polite updates for 8 keys (at 40 and at 150 ms per key). "passport" makes 4. Speaking the count only after typing pauses would quieten it.

## Break it (15 min)
* **Fast and repeated keys.** Enter then Enter at 60 ms: no drawer.
* **Filter mid-paging.** A chip pressed with 237 shown never draws more than 50 rows.
* **Search past row 50.** The last row's number found by search reaches its row.
* **Click focus.** A mouse click on a cell focuses the row without an outline. This is harmless, and keyboard order is unchanged.
* No Blocker.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | All 237 reachable by keyboard and mouse; J1–J4 |
| Next step obvious | 1 | "Show 50 more forms"; the count beside it |
| Plain words | 1 | "Showing N of M forms", "No form matches" |
| Feedback and state | 1 | Count spoken on the last press and on short filters; no stray drawer |
| Correct data | 1 | Counts equal the rows shown; 237 of 237 at the end |
| Error recovery | 1 | Reload and filter changes start again at 50; Escape closes any drawer |
| Accessibility and screen sizes | ½ | Focus indicator missing on the focused row (finding 1); typing chatter (finding 2); axe 0; 1024/200 %/400 fine |
| Speed | 1 | Unchanged from 310acb9c (chip from all shown under 100 ms; Show more median about 145 ms) |
| Visual quality | 1 | Team look unchanged; pager count visible and muted |
| Trust and sources | 1 | Rows still say "Listed by IRCC" with the page |

**9.5 / 10, pass (8 or more, no 0).** The score passes, but finding 1 is an open Major on an [M] line, so the review verdict is **Block** until the outline shows.

**Fix that would raise accessibility to 1:** add `focus-visible:outline-solid` to the row (or drop `outline-none`), with a suite step asserting the outline. Then debounce the spoken count while typing.

## Could not test
* A real screen reader (NVDA, JAWS, VoiceOver): what the focused row is called and how polite updates queue while typing.
* Safari and Firefox.
* An unaided walk by an intended user (D17, D20 stay with the founder).
