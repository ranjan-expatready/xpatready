# Journey test: X5 paging polish FIX (PR #145), reviewer, 31 Oct 2026, commit 337cdfd5

Role: reviewer, the one journey score for this check. Scope: paging and the spoken count in Shared library › Forms after the fill from IRCC's forms list (237 rows). It covers the three fixes of 0fc3f8a7: the row's focus outline, the debounced count, and no count after a failed load.

**Setup.**
* Isolated copy `rvx5e` on :4452 (ledger `/tmp/rvx5e-ledger`), with the web built from this commit. The library was filled by the browser suite through the product's own Fill button.
* Probes in `/tmp/rv8/` (outline, debounce, side effects, extra), run twice with the same texts.
* Mutation copy `rvx5n` on :4453, made from `git archive`.
* US$0, with no `*_LIVE` set.

## Journeys (configuration author)
1. **Main, keyboard.** "Show me the next 50 and carry on from there": Tab to Show 50 more forms → Enter → see where I am.
2. **Sizes.** J1 at 1024, 390, 1440 at 200 % (720 px) and 1024 at 200 % (512 px).
3. **Search, then narrow.** Type "imm", then press Guides before pausing.
4. **Chip, then search.** Checklists, then type "imm 5".
5. **Search, then page.** Type "imm", then Show more within 250 ms.
6. **No match, then recover.** Type "zzzz", then Clear filters.
7. **Error.** The list fails (500) → read the notice → Try again.
8. **Mouse.** Click a cell; click Show more.
9. **Search, then open a form.** Type "imm", then open a number within 700 ms, then Escape.

## What held
* **J1.** Focus lands on row 51 (IMM 0017) with a 2 px solid inset outline (`rgb(8, 98, 197)`, about 5.9:1). Tab goes on to its number button: the button's ring shows and the row's outline goes. axe 0.
* **J2.** The outline shows at every size: top, bottom and left edges in the pixel check, and all four at 1440. Below 1440 the row is wider than its scroller, and the right edge draws once the box is scrolled (`/tmp/rv8/right-edge-1024.png`). There is no sideways page scroll.
* **J3.** One update, "Showing 1 of 1 forms", 13 ms after the chip. No stale search count follows.
* **J4.** The chip is spoken at once ("50 of 72"), then "39 of 39" after the typing pause.
* **J5.** "Showing 100 of 196 forms" 115 ms after Enter, and nothing after.
* **J6.** "No form matches" about 700 ms after the last key. The final count is right (see finding 2 for the wait).
* **J7.** The region is empty while the notice shows. Try again says "Showing 50 of 237 forms" at once.
* **J8.** Neither mouse action shows an outline (`:focus-visible` false), which is correct.
* **Forced colours and dark theme.** The outline stays visible: system colour; `rgb(42, 161, 255)` on `rgb(24, 38, 52)`, about 5.6:1.
* **Suite.** 92/92 twice. With the three old behaviours put back in the /tmp copy, it gives 89/92, and the three failures are exactly the new steps.
* **Errors.** 0 page errors in every probe.

## Findings
1. **Minor: J9.** The count from "imm" lands at 1020 ms, while the drawer has made the main column `aria-hidden`. It is never spoken, even after Escape (`library-forms.tsx:134-136`, `:114`). Flush the pending text when the drawer opens.
2. **Minor: J6.** Clear filters is a button but takes the typing path, because it empties the search. The region keeps "No form matches" for about 760 ms while 50 rows show (click at 1555 ms, update at 2316 ms). Treat only the search box's own `onChange` as typing.
3. **Nit.** `data-shown` reads 50 beside the error notice (`:205`). Only checks read it.
4. **Nit.** The typing step's detail prints `[object Object]` (`check_forms_s4_library_browser.cjs:315`).

## Break it (15 min)
* **Type and chip at gaps of 0–250 ms; type, chip, type; type and erase to the same list.** No stale final count. Erasing makes no update.
* **The important rules.** They touch only `tr[data-form]:focus-visible`. Mouse focus stays quiet. Forced colours still shows the outline. Retired rows keep muted text.
* **A 500 on the list.** The region stays empty, and Try again recovers.
* No Blocker and no Major.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | All 237 reachable by keyboard and mouse; J1–J5 |
| Next step obvious | 1 | "Show 50 more forms" with the count beside it |
| Plain words | 1 | "Showing N of M forms", "No form matches", "The forms could not be loaded" |
| Feedback and state | ½ | Chips and Show more spoken at once; Clear filters 700 ms late and the drawer case silent (findings 1, 2) |
| Correct data | 1 | Every final status equals the rows shown and the pager, across 8 sequences, twice |
| Error recovery | 1 | 500: no count is said, the notice shows, and Try again speaks the right count |
| Accessibility and screen sizes | 1 | Visible inset focus at 5 sizes, forced colours and dark; axe 0; no sideways page scroll |
| Speed | 1 | Chip update 6–52 ms after the click; Show more 115 ms |
| Visual quality | 1 | A thin ring-coloured outline matching the team's focus colour (`/tmp/rv8/row-1440.png`) |
| Trust and sources | 1 | Rows still say "Listed by IRCC" with the page |

**9.5 / 10, pass (8 or more, no 0).** No open Blocker or Major, so the review verdict is **Approve**.

**Fix that would raise feedback to 1:** speak at once for any change not typed in the search box (Clear filters), and flush the pending count when the drawer opens.

## Could not test
* A real screen reader: how the debounced polite update queues.
* Safari and Firefox drawing an outline on a `tr`.
* An unaided walk by an intended user (D17, D20 stay with the founder).
