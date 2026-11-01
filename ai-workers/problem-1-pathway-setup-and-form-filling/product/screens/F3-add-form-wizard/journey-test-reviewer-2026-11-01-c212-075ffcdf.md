# Journey test · reviewer · F2 C2.12 slice 3 (step chip and rail) · commit 075ffcdf · 1 Nov 2026

Round 3, a delta after the ed2516cf block (8.5/10, Major A open). I used copies on :4454–4459 only, each with a fresh database and the sample loaded. Cost US$0: replay only. SQL was used only as test input for the running state. I walked it in headless Chrome through Playwright (`/tmp/rv3walk/walk.cjs`, not kept), reading only what is on screen. Journeys 1, 2 and 4–10 of the ed2516cf report were not changed by this diff; the suites still cover them (31/31, 54/54).

## Journeys walked again
1. **Author A, a running draft ends while the rail is closed (Major A).** Visitor visa, IMM 5257, at 1024 px.
   - Before the run: the chip reads "Step 2 of 6 · Field map · Your step". There were **0** workspace reads in 10 s, so nothing polls when nothing runs.
   - The job is set to RUNNING. The chip reads "Step 2 of 6 · Field map · Running", and its aria-label says the same. There were 2 reads in 10 s (the 4 s poll).
   - The job is set to COMPLETED. **The chip moved to "Step 3 of 6 · Review · Your step" 567 ms later, with no reload.** A reload gives the same words. After that there were 0 reads in 10 s: the poll stops. ✓
2. **Content reviewer C, the same run.** The chip goes from "Running" to "Step 3 of 6 · Review · Waiting on someone else" in 560 ms. The poll stops after the run. ✓
3. **The same form being mapped in another combination (N2).** I replayed a saved answer on Super visa IMM 5257, then read Visitor visa's path.
   - Step 2 says "Being mapped in Super visa: 84 proposals left · a content publisher…" once.
   - Who: "The people working on it there finish it; nothing to do here until then."
   - Link: "Open it in Super visa", which goes to the job. What's left has the same who line. ✓
4. **Running state, accessibility.** axe found 0 violations with the rail closed and a chip running, at 1024 and 390 px, as A and as C. The suite adds a running rail at 1440, 1024 and 390 px. No page errors. ✓

## Replayed as automated checks
- `check_forms_c212_rail_browser`: **31/31** (:4455). `check_forms_c212_progress`: **54/54** (:4454). The web build is current: a rebuild gives the same hash, `index-BO23YPzN.js`.
- Each mutation below ran on a `git archive` of 075ffcdf, on a fresh copy. For web mutations the web was rebuilt.
- **6 of 7 mutations were caught:**
  - forms poll removed (30/31);
  - chip label frozen at "Your step" (30/31);
  - running words removed (30/31);
  - rail focus refetch off (30/31);
  - the who line put back to "Being mapped in…" (53/54);
  - engine combination filter off (51/54; the strict check at `:127` now fails too).
- Survived: the rail key moved out of `["combination", id]` (31/31). The builder declared this one. It is judged acceptable in the review.

## Data underneath
- One running job gives one Running chip. The poll runs only while a chip is `running`, and it stops when the run ends.
- Visitor visa's path shows none of Super visa's proposals outside step 2's own link.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Main path to step 3 and the job page, without a reload (suite) |
| Next step obvious | 1 | "Your next step" can always be taken. In the elsewhere case, the one link goes to where the work is |
| Plain words | 1 | "Being mapped in Super visa" is said once. The who line says that the people there finish it (N2 fixed) |
| Feedback and state | 1 | The chip goes from running to done in about 0.6 s, with no reload, as A and as C. The rail and the chip agree |
| Correct data | 1 | K1 holds across combinations; one read per view; polling only while running |
| Error recovery | 1 | Reload, Back, Escape and focus all recover (suite) |
| Accessibility and screen sizes | 1 | axe 0 on the running states at 3 widths, plus the 8 states in the suite |
| Speed | 1 | The chip moves on within 0.6 s of the run ending. No idle polling |
| Visual quality | ½ | Board fit of the rail header and footer (Minor 2) and Minor 8 are still open, as declared |
| Trust and sources | 1 | The AI draft is named as AI. The other combination is named on the link |
| **Total** | **9.5/10** | **Pass**: no criterion at 0 |

To raise the score: the board fit of the rail header and footer (Minor 2, declared for the PR).

## Not tested
- A real screen reader.
- A visible browser pane: headless Chrome only.
- Live AI: the running state came from SQL test input.
- An intended user's unaided walk. D17 and D20 stay with the founder.
