# Journey test (reviewer): X5 slice c "remember a deletion", commit 02ca83a5, 31 Oct 2026

**Setup.** Isolated copy `x5c_rev` on :4454, fresh database for each run. Headless Chromium through Playwright, with axe for WCAG 2.2 A/AA. US$0, no `*_LIVE`.
**Files outside the repo.** Script `/tmp/x5c-rev/journey.cjs`, break scripts `/tmp/x5c-rev/break1.ts` and `break2.ts`, screenshots `/tmp/x5c-rev/shots/`.
**Runs.** The script ran twice: 22 checks pass and 1 optional words check fails, the same both times (no flakiness).

## Journeys (persona · goal · result)
1. **Main path.** Configuration author: "Fill the library from IRCC's list", by keyboard only. **Held.** Tab ×16 reaches the button, then Enter. Toast: "230 new forms listed (no file yet), 0 already in the library", in 140–480 ms.
2. **Author: "this form does not belong in our library, delete it."** **Held.** IMM 5604 (listed, no file) offers Delete. The right panel asks for a reason and says "A second person, on To review"; Send waits for the reason. The panel does not say that a later fill will not list the form again (Minor, the decision says "hidden").
3. **Approver (user-B) approves on To review.** **Held.** The row reads "Delete the library form … Needs you". After Approve: no IMM 5604 row, and one memory row with `deleted_by = user-B` and the change's id.
4. **Author fills again.** **Held.** "0 new …, 229 already in the library, 1 left out that was deleted from the library (IMM 5604; upload its PDF to add one back)". Searching for 5604 finds nothing.
   * axe: clean.
   * No sideways scroll at 400, 1024 and 1440 px, nor at 200 % zoom (512 px).
5. **Author adds it back by Upload PDF.** **Held.** The run card reads "Done · US$0 · rules only, no AI"; the form is back and the memory is gone. The next fill leaves nothing out.
6. **Recovery.** **Held.** A double click on Fill is one fill (one audit line). The second fill's audit line names IMM 5604 as left out.
7. **Wrong role.** **Held.** The approver has no Fill button, and a direct POST returns 403. Self-approval of one's own delete returns 403.
8. **Alternate add-back paths.** Sample load: **held** (IMM 5488 and IMM 1295 came back, memory cleared). Find again: covered by reading only (`finder.ts:643`).
9. **Error: delete a schedule form, then add it back.** **Failed** (break1.ts).
   * Delete `IMM 0008 SCH4` and upload `imm0008_4e.pdf`. It is read as IMM 0008 and the memory stays.
   * `IMM 0008 DEP` with `imm0008depe.pdf`: the upload is held, and the memory stays.
   * Every fill keeps telling the person to "upload its PDF", which cannot work. Only a demo reset clears it.
   * `IMM 5257 SCH1` with `imm5257_1e.pdf` **held**.
10. **Race: a delete approved during a fill.** **Held** (break2.ts). A trigger writes the memory during the insert; the fill removes its own row and counts the form as left out.
    * On a mutant without the second look, the form came back. No suite check notices that mutant (review issue 2).

## Data underneath
* One memory row per number (a unique index), holding who deleted it and which change.
* Fill counts: created + already + left out = every form IRCC lists.
* The audit line matches the toast.
* Nothing else changed: the browser suite passes 95/95 and the X5 library suite 72/72 (twice).

## Break (15 min)
* Schedule/DEP add-back: **Major** (journey 9).
* Several forms left out: the words read "upload its PDF to add one back" (singular). **Minor.**
* The Fill tooltip still says "every form number". **Minor.**
* Double click, wrong role by URL, self-approval, mid-fill delete (trigger): all held.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Delete → skip → add back works for plain numbers; not for about 10 schedule/DEP numbers (journey 9) |
| Next step obvious | ½ | The left-out words give a next step, which is wrong for schedule forms; the delete confirm says nothing about later fills |
| Plain words | ½ | Clear for one form; "its/one" with many; tooltip out of date |
| Feedback and state | 1 | Toast names the forms; the audit line matches; the run card shows US$0 |
| Correct data | 1 | Exact memory row; counts add up; race handled; one fill on a double click |
| Error recovery | ½ | A deleted schedule form can only come back through a demo reset |
| Accessibility and screen sizes | 1 | axe clean on 4 states; keyboard path; 400/1024/1440 px and 200 % with no sideways scroll |
| Speed | 1 | Fill 140–480 ms; no request per row |
| Visual quality | 1 | Team toast, unchanged layout (`04-refill-1440.png`, `04-refill-200pct.png`) |
| Trust and sources | 1 | No AI; who and which change are stored; US$0 shown |

**Score: 8.0/10, pass (8 or more and no 0).**
**What would raise the low criteria, most valuable first:**
1. Make the add-back work for schedule/DEP numbers, or stop promising upload for them.
2. Fix the singular/plural words and the tooltip.
3. Optionally, one line on the delete confirm saying the fill will not list the form again.

**Not tested:**
* A real screen reader.
* An intended user's unaided walk: D17 and D20 stay with the founder.
* canada.ca live (fixtures only).
* Find again's add-back in a browser.
