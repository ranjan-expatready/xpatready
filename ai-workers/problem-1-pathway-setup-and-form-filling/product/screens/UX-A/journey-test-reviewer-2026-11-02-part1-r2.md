# Journey test: UX-A part 1 re-check (one definition per count), reviewer, 2 Nov 2026

Commit `a8715173`, verdict on the merge `6446a2db`. Isolated copy `rev_uxa1b` on :4446 with the demo sample. Personas: Configuration author (user-A), Content reviewer (user-C), Content approver (user-B). US$0, no live AI. I used headless Chromium scripts that read only what a person sees (text, roles, names, focus), plus API and SQL reads for the data underneath. Screenshots are in my scratch folder and were not committed.

## Journeys (persona · goal · result)
1. **Main.** The author opens Visitor visa to see how many forms it has. The strip, the Overview tile, the finder and the filing line all say "2 forms · 0 set up". Review and release says "no form is set up on this combination", which no longer contradicts the count. **Held (M1 fixed).**
2. **Main.** The author on LMIA checks that the question total is the people's sum. The total is 377 = 143 + 110 + 109 + 15. The footer says "143 questions for Principal applicant", the same as the chip. **Held.**
3. **Alternate (B1).** The author sets Spouse to 0 on LMIA. The Overview says "259 … Principal applicant 135 · Child 109 · Representative 15", the Child chip is still there, and the form facts add up to 224 with the same people. **Held.** The Preview still says "Principal applicant · 136 questions … The same count as the Questionnaires tab" and cannot show the Child (n1).
4. **Change across a release (B2).** The author removes IMM 1295, then submits; the approver releases Release 2. Every screen says 7 forms, with no "attached, waiting" row and no "add it back" step. Adding it from the library returns 8 everywhere. **Held.**
5. **Double action (B3).** Six attaches of IMM 5409 at the same moment. The count is 3 and the tab shows 3 rows, with a sentence that adds up to 3. **Held.** Two copies of the file are still stored (an older race, outside this row).
6. **Boundary from To review (P-80).** The author uploads an off-list IMM 1344 and the reviewer approves it: "Attached to Visitor visa". The author opens Forms to read and draft it. **Failed (N1):** it is in no row and no count, and `check_forms_demo.ts` fails at the same step.
7. **Keyboard and sizes.** At 720 px (200 %) the author tabs to "Forms 4 to do" in 12 presses. Its description names the steps, and Enter opens Forms. There was no sideways scroll at 400, 720, 1024 or 1440 px, and axe was clean on every tab the check visits. **Held.**
8. **Wrong role and recovery.** The reviewer and the approver see the same numbers. A reload after each change shows the same counts. **Held.** I could not make the summary fail live, so the Retry was checked in the code.

## Data underneath
* `setup.counts.forms` equals the card's `forms.length` in every journey. `questions` equals the sum of the chips.
* Release 2 holds 7 form lines. Re-adding IMM 1295 made one new line, not a duplicate.
* After P-80 approval, `source_attachment` holds IMM 1344 (`kind: Form`, `recognised: false`, `RECOGNISED`), and neither the count nor the tab shows it (N1).
* Roles were enforced on the server: the approval came from a second person, and submit and approve came from different people.

## Break it (15 min)
* **Major:** N1, above.
* **Minor:** n1. A Preview chip disagrees with the Questionnaires chip under a sentence that says they are the same.
* **Minor:** n2. The finder line says "Counting…" forever if the summary fails.
* Remove, release and re-add, and the attach race, as above.

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Journeys 1–5, 7 and 8 held. Journey 6: the approved form cannot be reached from Forms (N1) |
| Next step obvious | 1 | Badges say "to do" or "to fix", tips name the steps, and the Before forms panel lists them |
| Plain words | 1 | "no form is set up", "2 forms · 0 set up", "no rule or check problems" |
| Feedback and state | 1 | "counting forms…" while loading; counts move together on remove, release and re-add |
| Correct data | ½ | An attached, approved form is left out of the count (N1); the Preview reads 136 against 135 (n1) |
| Error recovery | 1 | Retry on the filing line when the count fails (code); Undo and re-add from the library work |
| Accessibility and screen sizes | 1 | axe clean; 2.5.3 met; the description is reachable by keyboard; 400–1440 px with no sideways scroll |
| Speed | 1 | Catalogue warm 9–12 ms; LMIA summary 56 ms; Questionnaires 185 ms |
| Visual quality | 1 | Badges stay on one line with the new Tests tab; one badge style |
| Trust and sources | 1 | Sample labels kept; release words agree with the count |
| **Total** | **8.5 / 10** | Pass, with no criterion at 0 |

**Verdict: pass (8.5/10).** The review still blocks, on N1.
**What would raise the score, most valuable first:**
1. N1: list and count approved-in-product forms (task, data).
2. n1: the Preview household, or its sentence (data).

**Not tested:** a real screen reader, touch, and an intended user's unaided walk (D17 and D20 stay with the founder).
