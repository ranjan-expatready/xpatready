# Journey test: UX-A part 1 (one definition per count), reviewer, 2 Nov 2026

Commit `9f2229e3`. Isolated copy `rev_uxa1` on :4446, demo sample loaded, persona Configuration author (user-A) and Content reviewer (user-C). US$0, no live AI. Headless Chromium driven by scripts that click and read the way a person would; nothing was read through the API until after each journey. Review: `review-part1.md`.

## Journeys (persona · goal · result)
1. **Main.** The author opens Visitor visa from the Programs card and reads how many forms it has on the Overview and the Forms tab. "2 forms · 0 set up" appears on the strip, the tile, the finder and the filing line. **Held.**
2. **Main.** The author on LMIA checks that the question total is the sum of the people. The tile shows 377 with "Principal applicant 143 · Spouse or partner 110 · Child 109 · Representative 15", and the chips match. **Held.**
3. **Alternate.** The author compares form facts on Questionnaires and in Draft questions and documents. Both say 120 (22 for the application), and the strip shows "Form facts 333". **Held.**
4. **Change.** The author removes IMM 5475 from LMIA through Actions → Remove → confirm, then reloads and presses Undo. The count went 8 → 7 everywhere at once and back to 8 after Undo, and "Removed in this draft" was shown. **Held.**
5. **Next step.** The author reads the tab badges to decide where to go. "Forms 4 to do", "Documents 1 to do" and "Review and release 1 to fix" read clearly. On LMIA, "Forms 2 to do" sits next to a ✓ Forms step and the badge does not say the items are Official pages and people. **Partly held (m1).**
6. **Boundary.** The author moves on to Review and release on Visitor visa. The release error says "this combination has no forms", which contradicts "2 forms". **Failed (M1).**
7. **Wrong role.** The reviewer (user-C) opens LMIA and sees the same counts and badges. **Held.**
8. **Recovery.** I reloaded mid-change (journey 4). All counts were consistent after the reload. If the summary is slow or fails, the Forms tab shows "…" and start text with no error (m5, from reading the code). **Partly held.**
9. **Keyboard and sizes.** I tabbed through the tablist: the names are exactly the visible text (2.5.3) and focus is visible. At 1440, 1024, 720 (200 %) and 400 px there was no sideways scroll, and axe was clean on Overview, Forms, Questionnaires, Preview and Review. **Held.**

## Data underneath
* The summary API (`setup.counts.forms` and `formsSetUp`, `row.counts.questions` and `questionsByRole`) matched the UI in every journey.
* The fact-sources API added up to 333, and the plan roles matched it.
* After Undo the line came back once: the count returned to 8 and nothing else changed.
* The counts did not change by role.

## Break it (15 min)
* Remove then Undo, three times in a row through the API, and once through the UI: the counts stayed consistent every time.
* There is a second de-duplication path for attachments with no edition (m4, from the code).
* The per-child question counts differ (108 against 109). This is per person and correct, but not explained (m8).

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1 to 4 and 7: the same number on every surface I checked except the release error |
| Next step obvious | ½ | m1: LMIA "Forms 2 to do" next to a ✓ Forms step |
| Plain words | ½ | "2 forms · 0 set up" and "to do / to fix" are good; M1 "has no forms" contradicts them |
| Feedback and state | 1 | The removal updated the tab at once; the Undo bar and the removed list were shown |
| Correct data | 1 | The API matched the UI; the removal and Undo were exact on the server |
| Error recovery | ½ | m5: no message or Retry on the Forms tab if the summary fails |
| Accessibility and screen sizes | 1 | axe clean at 400, 720, 1024 and 1440 px; 2.5.3 met; badges stay on one line |
| Speed | 1 | Catalogue cold first view 776 ms (< 1 s); rebuild after an edit 160–340 ms; summary 186 ms |
| Visual quality | 1 | One badge style, warn and danger tones, no wrapping |
| Trust and sources | ½ | Sample labels present; M1 and m2 ("1 to fix" against "no problems") cost trust |
| **Total** | **8 / 10** | Pass, with no criterion at 0 |

**Verdict: pass (8/10).** The review still blocks on M1, because the Done-when requires the same count on every screen.

**What would raise the score, most valuable first:**
1. M1 wording (plain words, trust).
2. m1: the tip and panel name the steps (next step).
3. m5: an error and Retry on the Forms tab (error recovery).

**Not tested:**
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* Touch.
