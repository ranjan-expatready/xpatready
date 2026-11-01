# Journey test: F2 C2.12 slice 2 (one form's guided path on a combination) · reviewer · 31 Oct 2026 · commit `514f0d8d`

I did not build this. It is a backend slice. The rail that will read `GET /api/combinations/:id/forms/:code/progress` is F3b, a later slice. So I walked each journey through the API, the way that screen will call it, for each person (user-A author, user-B approver, user-C content reviewer, user-O case officer, user-P Client A), and then read the data underneath. Each call was set beside To review `?form=` for the same person.

Setup: copies came from `isolated.sh`. :4453 ran this commit (demo reset and load, the suite, then my steps). :4452 ran the /tmp `git archive` for the mutations. :4450 and :4451 ran the neighbour suites. Every database was dropped afterwards. Cost: US$0 (replay, fixture canada.ca).

## Journeys (persona · goal · steps · expected → what happened)
1. **Main path. The author: "where is IMM 5257 on Super visa, and what do I do next?"**
   - Before any draft: step 1 done, current step 2, "Draft with AI or add from the library".
   - After the replayed draft: step 3 "Review 84 AI proposals", the same as To review.
   - Once every proposal is decided: "Add the decisions to the draft".
   - **Held.**
2. **Alternate. The reviewer (C) and the approver (B) on the same form.**
   - Steps 1–2 say "The configuration author does this" and offer them nothing.
   - Each gets their own To review step ("Decide 1 form field"). B gets "Approve or return" on a step-4 change.
   - **Held.**
3. **Released combination. The author on With an LMIA, any of 6 forms.**
   - Got: step 3 "needs you", with "Decide the form fields → Forms tab".
   - To review is empty for these forms, and the validator says "decide them when this edition is drafted again".
   - **Failed (Major 1).**
4. **Removed. The author takes IMM 5409 off With an LMIA.**
   - Got: step 1 still "in the library and on this combination", although the Forms tab lists it under removed.
   - **Failed (Major 2a).**
5. **Not on the combination. Super visa IMM 5476.**
   - Got: step 1 "not on this combination", yet step 2 done and step 3 offered as the next step.
   - **Failed (Major 2b).**
6. **Held file.**
   - Off-list IMM 5476 copies: A, who uploaded them, gets "Record the IRCC page". C is told who acts.
   - Held new edition: A gets "Review impact", B is told the author reviews it.
   - An off-list first PDF of IMM 5645 (not in the library) gives 404.
   - **Held, except Minor 6.**
7. **Failed and running AI draft (IMM 5488).**
   - Failed: "stopped before it finished", with a next step for A only.
   - Running: "running", with no next step for anyone.
   - **Held.** For C the words still say "draft again" (Minor 4).
8. **Wrong role and errors.**
   - O, P and Q get 403. Nobody or user-Z gets 401.
   - Unknown combination or form gives 404 in words. A space or 41 characters gives 400.
   - **Held, except an upper-case UUID, which gives 500 (Minor 5).**
9. **Recovery. Reload, and five reads at once.**
   - The body is identical each time, and no record changed.
   - **Held.**
10. **The step across the boundary: the next link opens a built screen.**
    - Every href matches an `App.tsx` route.
    - With two step-3 items, the path and To review lead with different items (Minor 1).
    - **Held, except Minor 1.**

## Data underneath
I read with SQL before and after the reads: `audit_event` 111, `form_field_map` 462, `drafting_job` 13, `combination_form` 10, `intake_item` 28, and the newest map time, all unchanged. Nothing is stored (D5). Roles are enforced on the server: by `readerOf` for case people, and by the author-duty mapping for steps 1–2. That mapping has no failing API test (Major 3).

## Break it (15 min)
- `<script>`, Cyrillic, extra spaces and SQL quote text: refused or normalised; JSON only.
- An upper-case UUID gives 500.
- A "What IRCC accepts" change shows under "New shared fields are approved" (Minor 2).
- Speed with IRCC's index loaded (237 forms): With an LMIA p95 237 ms, max 264 ms, about 308 statements per read (Major 4).
- Mutations: 15 of 21 caught (6 rules unprotected, Major 3).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Right on Super visa (J1, J2, J6, J7). Wrong for 6 of 8 forms of the released sample combination (J3) |
| Next step obvious | ½ | Matches To review in J1, J2 and J6. Points to a step To review lacks (J3) or a form the combination lacks (J5) |
| Plain words | ½ | Mostly plain. "1 form field … have", "draft again" told to a non-author, a step-4 label over an accepts change |
| Feedback and state | ½ | Running and stopped are clear. A removed form reads "done" (J4) |
| Correct data | ½ | Read only and stable (J9). Wrong step states (J3–J5) |
| Error recovery | ½ | Problem Details for 400, 401, 403 and 404. 500 on an upper-case id |
| Accessibility and screen sizes | 1 | No UI in this slice. Axe and widths belong to F3b |
| Speed | ½ | Median 114–178 ms, but p95 237 ms and about 308 statements with the index loaded |
| Visual quality | 1 | No UI change |
| Trust and sources | ½ | An AI draft is named as such, and a stub pass is not counted. Step 1 says "on this combination" when it is not |
| **Total** | **6 / 10** | **Fail** (below 8; no 0) |

To raise it, most valuable first:
1. Major 1, steps only from To review items (task, next step, data).
2. Major 2, steps follow the combination's lines (feedback, trust).
3. Major 4, a one-form library read (speed).
4. Minor 5, the upper-case id (recovery).
5. Minors 2 and 4, the words.

## Could not test
- A visible-browser walk, axe and widths: there is no screen (F3b).
- A real screen reader.
- An intended user's unaided walk: D17 and D20 stay with the founder.
- Live AI.
- The cost with an open submission's release gates.
