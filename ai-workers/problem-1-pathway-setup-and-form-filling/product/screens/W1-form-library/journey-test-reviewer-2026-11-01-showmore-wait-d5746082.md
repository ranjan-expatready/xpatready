# Journey test, reviewer: Form library "Show more" by keyboard, at d5746082 (1 Nov 2026)

Reviewer role. I did not build this. The change under check is test-only (`check_forms_s4_library_browser.cjs`, the second Enter after Show more), so the journeys cover the part of the screen that step guards: Show more by keyboard, and what a second Enter does. I used headless Chrome (Playwright) on the isolated copy `forms_rv5` at :4456, fresh database, built from d5746082. US$0. Script: `/tmp/rv5w/walk.cjs`. Screenshots: `/tmp/rv5w/shots/` (not committed).

## Journeys (configuration author, keyboard only)
1. **Main path.**
   * Goal: "Show me the next forms after the first 50."
   * Steps: Fill from IRCC's forms list by Enter (230 forms; "Showing 50 of 230 forms · Show 50 more forms"). Focus Show more and press Enter.
   * Result: in 148 ms there are 100 rows, focus is on row 51 and the status reads "Showing 100 of 230 forms". **Held.**
2. **Second Enter on the row Show more focused (the original bug, 310acb9c 1 / break m16).**
   * Steps: press Enter again once focus is on row 51.
   * Result: 0 dialogs open. **Held.**
3. **Recovery: a fast double Enter on Show more, with no pause.**
   * Result: 200 rows, 0 dialogs, focus on row 151. The second press lands on Show more before the first press has moved focus, so it loads another 50. Nothing opens by mistake. This is the race the old fixed 60 ms wait hit under load. (Observation, not a finding: it matches a double press on any button that stays focused.)
4. **Recovery: reload.** Back to 50 rows and "Show 50 more forms". **Held.**
5. **Screen sizes.** No sideways page scroll at 400, 1024 or 1440 px. Below 1440 the table scrolls inside its own box, as already recorded (break-report-x5a m23).

## The step's fail test (mutants in the browser, same copy)
* **The original bug.** After the second Show more, I moved focus onto row 101's button, as the bug did. The new wait still passes, because `closest("tr[data-form]")` from the button is row 101. Enter then opens 1 dialog, so the step's `dialogs === 0` fails. **The fail test still bites.**
* **Show more stops moving focus (m1 regressed).** I left focus on Show more. The wait throws after 10,005 ms. In the script that goes to the outer `catch`, which counts one FAIL and prints "unexpected". **Loud.**

## Automated replay
* `node studio/tests/check_forms_s4_library_browser.cjs 4456 xr_studio_forms_rv5` on a fresh start gave 99 passed, 0 failed. Step 148 reads "dialogs 0, rows 150".
* The builder ran it 99/99 twice on fresh copies. I ran it once, as asked.
* axe (WCAG 2.2 A/AA) after Show more: 0 violations. There were no page errors.

## Data underneath
Show more reads only. Nothing was written, so there is nothing to check beyond the row counts (50, 100, 150, 200 of 230), which match.

## Break it
| Try | Result |
|---|---|
| Fast double Enter on Show more | 100 more rows, no drawer (journey 3) |
| Enter on the focused row | No drawer |
| Reload mid-list | Back to 50 |

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1: 100 rows, then 150, then 200 |
| Next step obvious | 1 | The button names the count: "Show 50 more forms" |
| Plain words | 1 | "Showing 100 of 230 forms" |
| Feedback and state | 1 | The status updates and focus moves to the first new row |
| Correct data | 1 | The row counts match the total each time |
| Error recovery | 1 | Reload resets the list; a double press opens nothing by mistake |
| Accessibility and screen sizes | 1 | Keyboard only; axe clean; no page scroll sideways at 400, 1024 or 1440 px |
| Speed | 1 | 148 ms from Enter to rows and focus (STANDARDS §9: under 200 ms) |
| Visual quality | 1 | `02-1024.png`, `02-1440.png`: team table and chips; the inner table scroller below 1440 is known (m23) |
| Trust and sources | 1 | Every filled row says "Listed by IRCC · no file yet" |

**Score: 10/10. Pass** (8 or more, no 0).

## Not tested
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* The rest of the screen, which this change does not touch (see the earlier reports in this folder).
