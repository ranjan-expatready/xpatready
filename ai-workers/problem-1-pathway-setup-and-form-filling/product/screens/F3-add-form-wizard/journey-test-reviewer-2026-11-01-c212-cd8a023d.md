# Journey test: F2 C2.12 slice 2 (one form's guided path on a combination) · reviewer · 1 Nov 2026 · commit `cd8a023d`

I did not build this, and it is a backend slice: the rail that reads `GET /api/combinations/:id/forms/:code/progress` comes in F3b. So I walked each journey through the API, the way that screen will call it, as user-A (author), user-B (approver), user-C (content reviewer), and as O, P, Q and Z for the wrong roles. I set each read beside To review `?form=` for the same person, then read the data underneath.

Setup: `isolated.sh` copies. :4453 ran this commit: the suite, then a demo reset and load, then `fill-from-index` (237 library forms), then my steps. :4452 ran the /tmp `git archive` (mutations and the M4 measurement with the fix removed). :4450 and :4451 ran the neighbour suites. Every copy was stopped and its database dropped. Cost: US$0 (replay, fixture canada.ca, no `*_LIVE`).

## Journeys (persona · goal · expected → what happened)
1. **Main path. The author: "where is IMM 5257 on Super visa, and what next?"**
   - Before the draft: step 1 done, step 2 "Draft with AI or add from the library". C reads "No field map yet." and "The configuration author does this."
   - The replayed draft starts.
   - After it: step 3 "Review 84 AI proposals", with the same label and link as To review for A, B and C.
   - **Held.**
2. **Released combination. The author on With an LMIA, all 8 forms.**
   - For 6 forms: done to step 6, and To review is empty. Step 6 says "Not decided yet (from an earlier release): 16 form fields … Decide them when this edition is drafted again."
   - IMM 5488 and IMM 5905: step 2 is the author's.
   - **Held** (last round: failed).
3. **Removed, then added back. The author takes IMM 5409 off LMIA.**
   - After removal: step 1 "not on this combination", steps 2–6 not started, next "Add it from the library".
   - After `POST …/forms`: step 1 done.
   - **Held** (last round: failed).
4. **Not on the combination. Super visa IMM 5476.**
   - Steps 2–6: "Comes after the form is on this combination with a usable PDF."
   - Once it is added, all six steps are done.
   - **Held** (last round: failed).
5. **A form IRCC lists but with no file yet (IMM 5802 on LMIA).**
   - A is offered "Add it from the library".
   - Adding it is refused with 409 "No file yet: upload its PDF in the Form library…".
   - **Failed (Minor A).**
6. **Failed and running AI draft (IMM 5488, SQL test input).**
   - Failed: A gets "stopped before it finished: draft again…" with a link. C gets "The last AI draft stopped before it finished." with no link.
   - Running: "running" for both, with no next step.
   - **Held.**
7. **A library change of another kind.**
   - An accepts change was proposed on IMM 1295. The path's step 4 stays done for A and B, while B's To review shows "Approve or return".
   - **Held.**
8. **Wrong role and errors.**
   - O, P and Q get 403 in words. Z and nobody get 401.
   - IMM 9999, `<script>` and Cyrillic give 404 in words. A space or 41 characters gives 400. ` imm  5257 ` gives 200.
   - Upper-case id gives 200. Unknown id or `not-an-id` gives 404. POST gives 404.
   - **Held.**
9. **Recovery. Reload, and five parallel reads.**
   - Three reads gave the same md5.
   - Audit, field maps, jobs, lines, intake and library changes were all unchanged.
   - **Held.**
10. **The step across the boundary.**
    - Every `next` and `whats_left` href is a web route: `/c/:id/forms`, `/c/:id/jobs/:id` and `/c/:id/review`.
    - To review's order is kept (unit check, mutation caught).
    - **Held.**

## Data underneath
The path writes nothing (D5): the counts and the newest map time were the same before and after. The server enforces roles in two places. Case people are refused by `readerOf`. The author duty is read from the actor: the API check as C fails when `canAuthor` is forced to true.

## Break it (15 min)
- Hostile and non-English codes: refused in words.
- Speed with the index filled: LMIA median 88–118 ms and p95 100–126 ms, about 73 statements per read. With the old library read put back: 292 statements and p95 up to 251 ms, and the suite is still green (Minor C).
- Mutations: 13 of 18 caught. One of the misses, "retired line as present", is equivalent: `effective()` never returns a RETIRED row. The other misses are the step-4 filter, two word rules and the query count (Minor B, Minor C).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J4, J6, J7 and J10 give the right step for every person |
| Next step obvious | ½ | Matches To review everywhere. But J5 offers an add that the product refuses |
| Plain words | 1 | "has/have" is fixed, there is no "draft again" for a non-author, and the carried fields are said in words |
| Feedback and state | 1 | Removed, not on the combination, running and stopped all read right (J3, J4, J6) |
| Correct data | 1 | Read only and stable (J9). Steps follow the lines and To review (J2–J4) |
| Error recovery | 1 | Problem Details for 400, 401, 403 and 404. No 500 |
| Accessibility and screen sizes | 1 | No UI in this slice. Axe and widths belong to F3b |
| Speed | 1 | p95 at most 126 ms with 237 forms, against the 200 ms budget |
| Visual quality | 1 | No UI change |
| Trust and sources | 1 | The AI draft is named, a stub pass is not counted, and carried fields are said to come "from an earlier release" |
| **Total** | **9.5 / 10** | **Pass** (8 or more, no 0) |

To raise it: Minor A, a fileless form's step 1 sends the author to upload its PDF in the Form library.

## Could not test
- A visible-browser walk, axe and widths: there is no screen until F3b.
- A real screen reader.
- An intended user's unaided walk: D17 and D20 stay with the founder.
- Live AI.
- A held first PDF of a new form: by the code it is still 404 (carried m6).
