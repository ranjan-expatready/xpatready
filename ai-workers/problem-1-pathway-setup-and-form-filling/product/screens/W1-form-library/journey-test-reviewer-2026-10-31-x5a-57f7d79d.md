# Journey test, reviewer: X5 slice a (form library filled from IRCC's forms list) at 57f7d79d, 31 Oct 2026

Role: reviewer (the one journey score for this check). Commit **57f7d79d**, PR #138. The checkout head is e849e9e6, a merge of origin/main; the X5 files are identical to 57f7d79d. Isolated copy `rvx5e` on :4454, with the sample loaded and the fill pressed in the screen. Script `/tmp/rv7/j.cjs` and frame trace `/tmp/rv7/w.cjs`, both outside the repo. I ran each twice in headless Chrome. **The sandbox has no visible browser,** so the "walk" was scripted clicks and typing with screenshots, not a person's eye. Spend: US$0.

## Journeys (persona: configuration author, user-A)
1. **Main.** "Bring IRCC's list into the library and find a form."
   * Steps: open Shared library › Forms → Fill from IRCC's forms list → read the message → page through with Show more → open a row past 50.
   * Expected: every listed form is reachable, the count is honest and the drawer works.
2. **Alternate.** "Find one form that is not on the first screen."
   * Steps: search a number beyond row 50 (IMM 5508), a title phrase ("Application for a") and a broad term ("IMM").
3. **Widen again.** "See everything after narrowing."
   * Steps: Guides → All, No file yet with every row shown → chip off, clear a search. Each must take under 200 ms (STANDARDS §9).
4. **Keyboard only.** Show more with Enter until the end, then Tab on.
5. **Small screen and zoom.** 390 px, 1024 px, 720×450 (1440 at 200 %).
6. **Recovery.** Open a row's drawer after Show more, close it, and see that the page kept its rows and focus. Double-click Fill: the builder's step counts one POST.
7. **Data underneath.**
   * Browser rows = `GET /library/forms/list` (237).
   * Search totals = `?q=` totals.
   * A held edition with a later date does not hide "newer": the suite step, plus a mutation run that fails without the fix.

## What held
* **J1.** After the fill: "Showing 50 of 237 · Show 50 more", then 100, 150, 200 and "Show 37 more" → 237 rows. axe 0. A row past 50 (IMM 0151, row 71) opens its drawer; closing it keeps 100 rows and returns focus to "IMM 0151".
* **J2.**
  * "IMM 5508" (not in the first 50) → 1 row.
  * "Application for a" → 11, and the API returns 11.
  * "IMM" → "Showing 50 of 196", and the API returns 196.
  * The search covers the whole list, not just the page.
* **J3.** Two runs × 5:
  * All after Guides: 54–104 ms.
  * Clear search: 64–113 ms.
  * Show 50 more: 79–161 ms in the page.
  * No file yet off with 222 rows shown: 161–212 ms. The first painted frame is at 115–173 ms; the 212 ms run includes one extra frame I add for paint.
* **J5.** No sideways scroll at 390, 1024 or 720×450. axe 0 at each. The pager wraps under the table at 390 px (`/tmp/rv7/shots/r2-02-pager-390.png`).
* **J7.** The held-edition step passes on the PR; with the fill's old lines it fails, 30/31, `{"newer":[],"status":"ready"}`.
* **Suites.** `check_forms_x5_library.ts` 31/31; `check_forms_s4_library_browser.cjs` 80/80.
* No console or page errors.

## Findings
1. **Minor: focus is lost after the last Show more (J4, WCAG 2.4.3).**
   * After "Show 37 more" the button disappears and focus goes to `<body>`. The next Tab lands on the "Product Studio home" logo. Seen 2 of 2 runs.
   * On earlier presses focus stays on the button, below the 50 new rows.
   * Location: `library-forms.tsx:177`.
2. **Minor: paging is silent to a screen reader (WCAG 4.1.3).** "Showing N of M" is a plain span, not a status, and "Show 50 more" does not say "forms". Location: `:177`.
3. **Minor: no check covers the paging's reset on filter change, a search past 50, or focus after Show more.**

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Fill, page, search and open any of 237 rows in the screen |
| Next step obvious | 1 | "Showing 50 of 237" beside "Show 50 more" |
| Plain words | 1 | Same words as the rest of the library |
| Feedback and state | 1 | Correct empty states; counts match the API; no flash on clear |
| Correct data | 1 | Browser = API (237; searches 1/11/196); one "newer" rule, proven by mutation |
| Error recovery | 1 | Drawer keeps the page; double click → one fill |
| Accessibility and screen sizes | ½ | axe 0 at 4 sizes and no sideways scroll; focus lost after the last Show more; paging not announced |
| Speed | 1 | Every timed action within 200 ms in 49 of 50 timings; the one at 212 ms includes my extra paint frame |
| Visual quality | 1 | Team Button; tidy pager at 390–1440 px |
| Trust and sources | 1 | "Listed by IRCC", canada.ca page links, US$0 stated |

**Score: 9.5 / 10. Pass: 8 or more, no 0.** Raising it: move focus to the first new row on Show more, and give the count `role="status"` with "Show 50 more forms".

## Not tested
* A real screen reader.
* An intended user's unaided walk (D17, D20 stay with the founder).
* canada.ca live (recorded copies only).
* The AI finder.
* CI: the runs on 57f7d79d and e849e9e6 were refused for billing.
