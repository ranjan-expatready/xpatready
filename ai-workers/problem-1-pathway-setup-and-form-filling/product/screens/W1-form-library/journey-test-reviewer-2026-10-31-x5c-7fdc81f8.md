# Journey test, reviewer: X5 slice c "remember a deletion" at 7fdc81f8 (31 Oct 2026)

Reviewer role. I did not build this slice. I walked it in headless Chrome (Playwright), on copy `rv7c_walk` at :4450, built from 7fdc81f8. Setup steps from older slices used the API: the delete and its approval, and removing rows to stand in for "IRCC added forms". Everything this slice adds was used through the page. US$0. Scripts: `/tmp/rv7cscripts/walk.cjs`, `slow.cjs`, `atomic.sh`. Screenshots: `/tmp/rv7c/shots/`.

## Journeys
1. **Main path (configuration author).**
   * Goal: "I deleted two schedules; bring one back."
   * Steps: Fill (169 ms), then two approved deletes. The section reads "Deleted from the library (2) … IMM 0008 SCH4 deleted 2026-10-31, approved by Approver · List again".
   * Keyboard only: List again on SCH4 by Enter (361 ms). The toast reads "IMM 0008 SCH4 is listed again (no file yet). Find again on a combination, or upload its PDF, to add its file." Focus moves to List again on SCH5.
   * **Held.**
2. **Alternate: IRCC added forms since the last fill.**
   * Steps: CIT 0001 and CIT 0002 were removed to stand in for new forms. List again on SCH5.
   * Result: the toast adds "The fill also listed 2 other new forms from IRCC's forms list." Both forms are back. The section goes, and focus lands on "Fill from IRCC's forms list".
   * **Held.**
3. **Empty.** With no remembered deletion there is no section (count 0). **Held.**
4. **Error: the fill fails.**
   * Steps: the copy was restarted with an empty recorded folder. List again.
   * Result: a red toast reads "The recorded copy of canada.ca's forms list could not be opened. Nothing was added to the library." Both items stay in the section, both memory rows are kept, and no `restored` audit line is written.
   * **Held.** Focus falls to the page (m1).
5. **Wrong role.**
   * Approver (user-B): the section is shown with 0 buttons, and axe is clean.
   * Officer (user-O): no section, and `POST …/list-again` returns 403.
   * **Held.**
6. **Recovery: double click.** A double click on List again writes one `restored` line and shows no error toast. **Held.**
7. **Slow network.**
   * Steps: delay the list reload by 300, 600 and 800 ms, then press List again on the last item.
   * Result: focus lands on Fill, Fill, then **body** (S1).
8. **Screen boundary.** The toast hands off to Find again on a combination, or to Upload PDF. The restored row shows "Listed by IRCC · no file yet" in the table (`03-after-last-1440.png`). **Held.**

## Automated replay
* `check_forms_s4_library_browser.cjs` ran twice: 99/99 both times. Its new steps are axe on the section, List again by keyboard, focus moving to the next button and then to Fill.
* `check_forms_x5_library.ts` ran twice: 78/78 both times.
* No sideways scroll at 400, 1024 and 1440 px, nor at 512 px (200 %).
* The only console errors are the expected 403 and 409 responses from the wrong-role and failure steps. There were no page errors.

## Data underneath
* After journeys 1 and 2: `library_form_deletion` is empty, there are 2 `restored` lines and 3 `filled` lines, and the two stand-in forms are back exactly once.
* After journey 4: the memory is kept (2 rows) and there are 0 new `restored` lines.
* On the mutant without the restore, the memory is lost after the same failure. The code is right, but no test guards it (S2 in the review).

## Break it
| Try | Result |
|---|---|
| Double click | One request is acted on |
| Officer calls the route by URL | 403 |
| The fill fails | Nothing is half-done |
| Slow reload | Focus is lost (S1, Should) |
| Two List again at once | Reasoned from the code: `deleteMany` count gives one 201 and one 404 |

The count of "other new forms" can be one too few if another fill runs at the same moment (m2, Minor).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1 and 2 end with the form listed and the memory gone |
| Next step obvious | 1 | The toast says Find again or upload the PDF |
| Plain words | 1 | "listed again (no file yet)" and "also listed 2 other new forms" |
| Feedback and state | 1 | The toast names every form the fill listed; the section count updates; focus moves on |
| Correct data | 1 | Rows, memory and audit are exact; there is no partial state on failure |
| Error recovery | 1 | The failure is in words, the memory is kept, and List again can be pressed again |
| Accessibility and screen sizes | ½ | axe is clean and the widths are fine. Focus is lost on a slow reload (S1) and after an error (m1). The section is 282 Tabs from the top at 50 rows |
| Speed | 1 | List again takes 361 ms; the fill 169 ms |
| Visual quality | 1 | Team toast and chip row (`01-section-1440.png`, `04-section-400.png`) |
| Trust and sources | 1 | "approved by Approver" comes from the stored approver; no AI is involved |

**9.5/10: pass** (8 or more, and no 0). To raise accessibility to 1: refocus after the list query settles, and refocus the button on error.

**Not tested:** a real screen reader; canada.ca live; an intended user's unaided walk (D17 and D20 stay with the founder).
