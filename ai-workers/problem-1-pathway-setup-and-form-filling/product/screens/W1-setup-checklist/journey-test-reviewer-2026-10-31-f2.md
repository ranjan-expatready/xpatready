# Journey test (reviewer): N8, F2 official pages and DV-d1 fixes, commit 0810c25e

Reviewer agent, 31 Oct. Isolated copies on :4457 (`rvn8`, `rvn8b`), sample loaded, US$0 (empty ledger). This is the one journey score for this check. Review: `review-f2.md`.

## Journeys
1. **Main path.** Configuration author: "Confirm the official page the rules found for Visitor visa."
   * Expected: Programs → Needs you → Resume setup → confirm on screen → step 1 done.
   * Got: the card shows Needs you and the Next line "Official pages: Confirm the checklist page". Resume setup lands on Forms `?focus=pages:record` with no pages block, no Confirm control, and a header Next step that names something else (Add 1 form from the library).
   * Through the API: `POST …/official-pages/confirm` → 201, stored `user-A|author|1`, audit line "configuration author tier, sure", step 1 done on the summary.
2. **Alternate.** Immigration expert, Study permit, no apply page: "choose the page."
   * Expert's Needs you shows "Choose the checklist page". It is the same dead end on screen.
   * API 201, stored on the expert tier.
3. **Wrong role.** Approver, case officer and client each get 403 with who confirms and why. The author choosing where the rules are unsure also gets 403, and nothing is stored.
4. **Error.** These are refused in words with 400:
   * a page of another combination
   * a PDF instructions file
   * a non-UUID
   * an unknown field
   * an empty body
   An unknown combination gets 404. A `[]` body gets zod's own text.
5. **Recovery.** Detaching the confirmed page reopens step 1 ("proposed"). A demo reset clears the confirmations.
6. **Double click and race.** 8 parallel confirms → one row and 8 audit lines.
7. **Break it: lower tier over higher tier.** The expert chooses the guide page over the rules' match. The author then confirms the match → 201, and the record becomes `user-A|author`. The expert's choice is silently replaced.
8. **Forms library (DV-d1-1, DV-d1-2).** The publisher reads "Where is IMM 5257 used?":
   * "2 combinations" reads as a blue link with no strike-through look.
   * Tab reaches it and Enter opens the drawer with Where used.
   * The loading list is `role="status"` and `aria-busy`. axe is clean at 1024 and at 1440 (suite).
   * No page errors.
9. **Across the screen boundary.** Step 1 → Forms "Before forms" block: not built yet (slice B/C). This is where journey 1 breaks.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Confirm and choose work through the API, and the library fixes work on screen. No screen completes step 1 |
| Next step obvious | ½ | The library is clear. On the step 1 path, Needs you leads to a page with nothing to do, and the header disagrees (journey 1) |
| Plain words | 1 | The 403 and 400 messages name the duty and the reason (P-176). The audit line says sure or not sure |
| Feedback and state | ½ | The checklist reflects a confirmation. No on-screen feedback, because there is no on-screen act |
| Correct data | 1 | One row under a race, exact values, and an audit line with the page and tier |
| Error recovery | 1 | A detached page reopens step 1. Reset clears. Every refusal is in words |
| Accessibility and sizes | 1 | axe clean on every state in the suite. Keyboard reaches the count and Enter opens the drawer |
| Speed | 1 | Catalogue 195 ms. Two batched reads for all combinations |
| Visual quality | 1 | The count matches the Number links (`slice3/02-list-1440.png`) |
| Trust and sources | ½ | The tier and who confirmed are stored and audited, but a lower tier can overwrite the expert's choice (journey 7) |
| **Total** | **8 / 10** | Passes, with no criterion at 0 |

## Fixes that raise the low criteria, most valuable first
1. Hold the pages items out of Needs you and the landing until the screen offers them, or ship the block.
2. Make any change to an expert-tier record the expert's alone.
3. Give a `[]` body plain words.

## Could not test
* An intended user's unaided walk (D17, D20).
* A real screen reader.
* The step 1 action at 200 % zoom or keyboard-only, because no screen offers it.
