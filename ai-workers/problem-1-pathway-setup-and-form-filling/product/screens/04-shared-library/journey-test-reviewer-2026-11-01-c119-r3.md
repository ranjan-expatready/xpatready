# Journey test, reviewer, C11.9 round 3 (1 Nov): Shared library delete, retire, restore; filing order of forms

Commit **3c2225ed** (PR #331). Isolated copy `b5crev4` on :4468, sample inputs loaded (`POST /demo/load`), web built from this commit. Playwright headless with Chrome at 1440, 1024 and 720 px (200 %), axe WCAG 2.2 A/AA, data read with psql after each journey. US$0, no AI. Scripts and screenshots are in my scratch folder (not committed). Review: `review-c119-r3.md`.

## Journeys (persona · goal · result)
1. **Main path.** Content publisher (author) · "This old field is on no form any more: take it out of the pickers." Fields → row Retire → the confirm says what Retire does, who approves (a second person, on To review), when it takes effect (when approved) → reason → Send for approval. The row reads "Retire waiting · asked by Configuration author" with Withdraw, and focus lands on Withdraw. **Held.** Data: one WAITING change, field still PUBLISHED.
2. **Hand-off to the approver.** Approver · "Check and approve what waits for me." To review shows 1 row, "Retire the shared field. Reason: …", Approve or return → the card says "Checked again just now: nothing new uses it." → Approve. **Held.** Data: field RETIRED, change RELEASED. Fields › Retired lists it with the Retired pill, "hidden from pickers and AI; earlier releases and open cases keep it", and Restore.
3. **Refused.** Author · retire a used section. Sections → Retire on "Application details" → "Can't retire yet: '… With an LMIA' still uses it: remove it there first", with Stops it (1, linked) and Kept (questions, release 1). Escape returns focus to the row's Retire. **Held** (keyboard only).
4. **Restore** (API, both kinds). A retired section and a retired document type are restored through user-B. **Held** (RELEASED, then PUBLISHED).
5. **Own draft at once with Undo.** Works on rows planted with SQL: delete at once, Undo, the rows identical. It **cannot be reached in the product**: a document type named on a checklist line gets an ADD, and after the line is removed and the ADD returned, Delete answers "A change to it is waiting for a second person" and Withdraw answers "Only a new shared field …". The author is stuck. (Review Major 4.)
6. **Recovery.** Undo after a delete at once, then Undo again → 409 with the wrong words (Minor 4). Undo after the section was retired → the question comes back into the retired section (Major 2).
7. **Wrong role.** The approver (no author duty) sees greyed actions with the reason (browser suite). By URL: reorder and Undo → 403.
8. **Two people at once.** Approve a section retire while the author adds that section to a combination: 10 of 40 rounds leave a retired section in use (Major 1). The same race for document types: 0 of 40, held.
9. **Filing order.** Author · "IMM 5707 is filed before IMM 5257." On the combination's Forms tab there is no order control and no order shown. Only `POST …/forms/reorder` sets it (Major 3).

## What held
The main path and the approver hand-off end to end in the UI, with no page errors. axe is clean on the Sections list and its panel, and on every state of the browser suite. No sideways scroll on Sections at 1440, 1024 or 720 px. Keyboard: open, Escape, focus back to the row; after Send, focus on the row's new action. Speed: Fields to the row 0.6–0.9 s; To review rendered within the 2 s wait. The data under each step was exactly one change, the right statuses and an audit line. Suites: API 61/61, acceptance 23/23, browser 25/26, 25/26, 26/26 (a flaky step).

## Score (0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Retire, approve and restore work; the filing order and Delete of a new document type or section cannot be done on a screen |
| Next step obvious | 1 | One written action per row; To review "Approve or return"; refusals say what to remove and link it |
| Plain words | ½ | "waiting for a second person" for a returned ADD; second Undo "Only a delete of your own draft"; section key in "Draft question in rev4 sec" |
| Feedback and state | 1 | Toast with Undo, row state, Retired pill and note, focus kept |
| Correct data | ½ | A retired section gets selected under a race; Undo restores a question into a retired or deleted section |
| Error recovery | ½ | A dead end on the author's own returned new document type |
| Accessibility and screen sizes | 1 | axe clean; keyboard path; 1024 and 720 px no sideways scroll |
| Speed | 1 | Under 1 s to the list row; uses read in about 30 ms |
| Visual quality | 1 | The team's panel, pills and toast; consistent across the three lists |
| Trust and sources | 1 | No AI on this path; every use linked; history and audit on every step |
| **Total** | **8/10** | Passes the bar on score (no 0), but the review's Majors block |

**Fixes that raise the low scores, most valuable first:** (1) lock section selection and placement and test the race (correct data); (2) check the section in Undo (correct data); (3) let the author delete or withdraw their own returned or waiting new document type or section (task, recovery); (4) a filing-order control on the Forms tab (task); (5) the three wordings (plain words).

## Could not test
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). A headed browser: I walked it headless. The filing order as a person, because there is no screen.
