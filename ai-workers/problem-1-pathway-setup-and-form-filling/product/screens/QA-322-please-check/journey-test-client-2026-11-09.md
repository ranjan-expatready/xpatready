# Journey test: the client's "please check" (QA-322, P-142 D6), reviewer role, 9 Nov 2026

**Setup:**
* Commit a5eb5a9da on an isolated copy (`rv_q322`, :4438), configured checkpoint, US$0, live AI off.
* A fresh Visitor visa family case. The client typed the family names SAMPLEDE (Client A) and SPOUSEE (spouse).
* The officer used synthetic passports reading SAMPLED and SPOUSED, which opened 2 checks.
* Scripts: `scratchpad/rv-q322-walk.mts` and `rv-kb.mts`. Shots: `scratchpad/rv-shots/`.

## Journeys (client unless named)
1. **Main path.** Goal: "Is anything wrong with my answers?" The client opens the questionnaire, sees "Check answers" on Personal details, and opens it. The note under the family name names the document and not its value. Held at 1440 and 390 px.
2. **Alternate.** The client corrects the name and presses Save and continue. The answer saves (`DECLARED|SAMPLED`), and the summary stops the client again with the same note. Held, but the words do not acknowledge the change (m1).
3. **Leave for now.** "leave them for now and continue" goes to the next part. The overview still shows "Check answers". Held.
4. **Other person.** The spouse's note shows on the spouse's part only; Client A's part has no spouse note. Held.
5. **Wrong role.**
   * Another client gets 404, another firm's officer gets 404, and no actor gets 401.
   * The client cannot list checks (403) or mark a value checked (403).
   * Held.
6. **Across the boundary (officer).** The officer resolves with a reason and the current answer id. The client's note goes; the spouse's stays. The Agent view carries no client note. Held.
7. **Recovery.**
   * A reload keeps the state.
   * Opening a part makes no request (the cached view).
   * The keyboard path: 4 Tabs to the field, Enter saves, and focus moves to the summary.
   * Held.

## Data underneath
* There is one open check per person and fact, and the typed answer is never overwritten.
* After the client's change, there is one new DECLARED version and the check stays open.
* After resolve, the check is resolved with its reason, and the client's view drops only that note.
* The client payload carries neither the typed nor the document value in `checks`.

## Break-it (short)
* **Missing note:** the first spouse-part read returned 0 notes. This was a race in my script: the part renders client-side, with no network wait. A re-read showed 1 note at 1440 and 390 px, three times. It is not a product defect.
* **Removing the fix:** with the fix removed, C6.5-12b goes red (32/35).
* **Hidden questions, groups and relatives:** excluded by runtime.ts:403. Checks are only ever opened on participants (case-documents.ts:389).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 3, 4 and 6 |
| Next step obvious | ½ | After a change the same advice repeats; Continue pins to the part (m1, m5) |
| Plain words | ½ | Plain and not blaming, but 21 words and lower-cased names (m2, m3) |
| Feedback and state | ½ | "Saved" shows, but there is no acknowledgement of the change (m1); `1440-03-after-change-summary.png` |
| Correct data | 1 | As in "Data underneath" |
| Error recovery | 1 | Leave for now, reload, wrong role |
| Accessibility and screen sizes | 1 | axe none in 3 states; `aria-describedby`; keyboard; 390 px and 200 % zoom with no sideways scroll |
| Speed | 1 | 52 ms per view; overview 0.8 s; no request per part |
| Visual quality | 1 | Matches existing client checks; `390-02-part-note.png` |
| Trust and sources | 1 | Names the document and who settles it; no AI; the read value is withheld |

**Score: 8.5/10. Pass** (8 or more and no 0). Raising it, most valuable first:
1. Fix m1, the acknowledgement after a change; this lifts "next step" and "feedback".
2. Fix m2 and m3, the wording.

**Not tested:** a real screen reader, and an intended user's unaided walk (D17 and D20 stay with the founder).
