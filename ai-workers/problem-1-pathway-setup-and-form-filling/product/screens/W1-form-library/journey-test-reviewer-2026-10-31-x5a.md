# Journey test: X5 slice a (fill the library from IRCC's forms list), reviewer, 31 Oct 2026, commit e5ec8173

**Setup.** Isolated copy `rvx5` on :4457, US$0. I ran Reset, then Load sample, as setup only.
* Script: `/tmp/rvx5js/journey.cjs`, headless Chrome with Playwright, kept outside the repo.
* I ran it twice; the results were consistent.

## Journeys
1. **Main path, keyboard only.**
   * **Who:** the configuration author.
   * **Goal:** "put every IRCC form in my library without paying".
   * **Steps:** open Shared library › Forms, Tab to "Fill from IRCC's forms list", press Enter.
   * **Expected:** the forms are listed with no file, existing ones untouched, and US$0.
   * **Result:** reached in 16 Tabs, with a visible focus ring. The message "221 new forms listed (no file yet), 9 already in the library" came after 0.12 s; the rows came after 1.3–1.5 s. **Focus dropped to `<body>`.**
2. **Alternate: press it again, or two at once.**
   * **Expected:** nothing duplicated.
   * **Result:** 0 added and 0 duplicate keys. Each simultaneous fill claimed "221 new", giving two audit lines that overstate the count.
3. **Wrong role.**
   * **Who:** the approver (user-B).
   * **Result:** no button on screen. The POST is refused with 403 (also refused: the content reviewer, the case officer, and no actor with 401).
4. **Error: the mark after a failed check.**
   * **Who:** the author, on a form marked "Newer edition on canada.ca".
   * **Steps:** ⋯ › Replace with a new edition while canada.ca cannot be read.
   * **Expected:** the mark stays.
   * **Result:** 409 "canada.ca could not be read", **and the mark is gone** (IMM 5881, IMM 5905).
5. **Finding a form.**
   * **Who:** the author, looking for IMM 5257 in the 237 rows.
   * **Result:** typing in the search showed it after **0.96–1.16 s**. The Guides chip took **1.27–1.33 s**, and a reload 1.12–1.62 s.
6. **Across the screen boundary.**
   * The combination's "Add a form" picker and `/library/forms` still show only the 15 forms that have a file.
   * A rules finder run on Visitor visa gives the same result before and after the fill.
7. **Screen sizes.**
   * 1440, 1024, 390 px and 200 % zoom: no sideways scroll, and axe found 0 violations.
   * At 1440 the button floats mid-header, away from Upload PDF.

## Data underneath
* Before the fill: 16 rows (9 used by combinations). After: 237. The 16 existing rows are unchanged in title, kind, page, retired state, edition count and line count.
* There is one audit line per fill. The ledger has no line. No `form_edition` row was added.

## Break pass
* Double press and a race: no duplicate rows; the counts are wrong (Minor).
* The approver by URL: refused with 403.
* A failed canada.ca check clears the mark (Major).
* Mutation runs:
  * Dropping the role check is caught (4 steps fail).
  * Overwriting matched titles is **not** caught (Minor).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | 221 listed and 9 matched, one press |
| Next step obvious | ½ | The tip says what happens next; the 9 forms with files are buried under 221 no-file rows |
| Plain words | 1 | "Listed by IRCC · no file yet" is clear. The chip "Newer file on canada.ca" mismatches the new pill (Minor) |
| Feedback and state | ½ | Spinner and message are prompt; rows arrive 1.3 s later; focus lost |
| Correct data | ½ | No duplicates and nothing changed; counts and audit wrong under a race |
| Error recovery | ½ | A failed check erases the "newer" mark |
| Accessibility and screen sizes | ½ | axe 0, no sideways scroll; focus drops to body after the action |
| Speed | ½ | First view 1.1–1.6 s (budget 1 s); search and filter 1.0–1.3 s (budget 200 ms) |
| Visual quality | ½ | The button floats mid-header at 1440 |
| Trust and sources | 1 | No AI, US$0 stated; each row links its canada.ca page |

**6.5 / 10: not a pass** (8 is needed; no criterion at 0).

Fixes, most valuable first:
1. Batch the list's per-row `formUses`/`keptBy` calls.
2. Clear the mark only after a successful check.
3. Keep focus on the button after Fill.
4. Group the button with Upload PDF.
5. Report `createMany(...).count`.
6. Align the chip's word and tip with the new pill.

## Not tested
* A real screen reader.
* canada.ca live.
* An intended user's unaided walk (D17, D20 stay with the founder).
