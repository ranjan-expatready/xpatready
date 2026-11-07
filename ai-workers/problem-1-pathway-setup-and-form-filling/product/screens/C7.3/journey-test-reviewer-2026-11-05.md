# C7.3 answer sheet: journey test, reviewer role (5 Nov 2026, PR #1075 at a823f119e)

Skill journey-test, reviewer role: this is the one score for this check. **No screen in this PR** (the screen part is a
concept waiting for the tech lead), so the journeys were walked through the API the screen will call. A person cannot
walk them yet. Steps 2 and 3 of the skill (visible browser, Playwright, axe, 400/1024/1440 px, keyboard) are n/a.
Copies: `rv_c73` :4436 (configured checkpoint, reset then load as user-A, 74.3 s, `cost_usd: 0`) and `rv_c73f` :4437
(fixture), both stopped after. Live AI off, US$0.

## Journeys (persona · goal · steps · expected → seen)
1. **Main, case officer:** "type IMM 5257 into the portal part by part and mark each part done". Steps: file IMM 5257
   Online on the case (C11.6), read the sheet, confirm the answers, tick Personal details, change the family name,
   read again. Expected: the form's parts in printed order, confirmed values only, the tick with who and when, then Out
   of date. → Pack 13/13; tick 201 by user-O; Out of date with SAMPLEDX. **But the part order is alphabetical, not the
   form's** (Contact information before National identity document and US PR card; Background information before
   Details of visit). Review M1.
2. **Alternate, fixture form with no parts:** IMM 5707 falls back to the PDF twin's sections → `pdf_twin`, 13/13. Held.
3. **Empty:** before confirmation every part shows only "still to confirm" (C7.3-4). Held.
4. **Error, stale tick:** a tick with an old version gives 409 `…/stale` "changed since you read the sheet. Reload it…".
   Held.
5. **Error, unnamed part:** a tick on "Unnamed section 1 of IMM 5257 SCH1" gives 409 in words. Held. **Recovery fails:**
   once the configuration people name it (an edit on To review, the only way: an accept is refused), the part leaves
   the sheet and its answers move to "Other questions". The words "tick it once it is named" never come true. Review M2.
6. **Wrong role:** client user-P and user-Q, author, reviewer and approver get 403 on read; the client gets 403 on tick.
   Held.
7. **Recovery, double click:** 12 ticks at once give one 201 and eleven 200, with one row. Held.
8. **Held file, recorded filing (SQL row on my copy):** a tick gives 409 `…/recorded` "read-only"; reading still works.
   Held.
9. **Across the boundary:** the release changes after the case started. A To review decision after release 1 changed
   the sheet of a case pinned to release 1 (review M3, STANDARDS §3.7).
10. **No layout at all (SQL move on my copy):** 409 "has no parts in this release's configuration yet (the Sections
    step…)". Prepare still reads To do. Held, with studio words (m4).

## Data underneath
`entered_section`: one current row per part after the race. `answer_snapshot`: one per tick, with the frozen answers.
Audit line written on create only. The item's state on Prepare matches the sheet (Out of date warns only; no readiness
block). The server enforces the roles (403 before any rule).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Main path completes on the checkpoint. A part named after the configuration step falls out (M2). |
| Next step obvious | ½ | Stale and recorded refusals say what to do. The unnamed-part refusal points to a step that never brings the part back. |
| Plain words | ½ | Most words are plain. "the Sections step", "configuration people" and "this release's … yet" are not words for a case officer. |
| Feedback and state | 1 | 201 then 200, who and when, Out of date with the new value, `version` 409. |
| Correct data | ½ | Values, sources and dates are right. Part order is wrong (M1); five SCH1 answers are in the wrong part (m1); not pinned (M3). |
| Error recovery | 1 | Reload words on a stale tick; read-only after recording; 404 and 400 on the field. |
| Accessibility and screen sizes | n/a | No screen in this PR. |
| Speed | 1 | Sheet 48–52 ms, Prepare 119–153 ms (budget 1 s). |
| Visual quality | n/a | No screen in this PR. |
| Trust and sources | ½ | Each answer has its source (Client, Document, Case officer). The `order_note` claims the printed order, which is not true (M1). |

**Score: 5½ of 8 applicable criteria (6.9 of 10 scaled). Fail** (below 8; no criterion at 0).
Fixes that raise it most: M1 (correct data, trust), M2 (task completed, next step), M3 (correct data), the m4 words
(plain words). With these fixed, the score would be about 7½ of 8.

## Could not test
A visible-browser walk, axe, screen sizes and keyboard (no screen). A real screen reader. An intended user's unaided
walk (D17 and D20 stay with the founder). The real IRCC portal order (W6). Release 2's Online lines (not on main).
