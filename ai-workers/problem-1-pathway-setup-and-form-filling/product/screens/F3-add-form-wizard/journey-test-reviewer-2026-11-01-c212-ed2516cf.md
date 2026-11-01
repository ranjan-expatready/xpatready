# Journey test · reviewer · F2 C2.12 slice 3 (step chip and rail) · commit ed2516cf · 1 Nov 2026

Round 2 after the 28b3bba3 block (6/10). Copies on :4454–4457 only, fresh databases, sample loaded. US$0 (saved AI answer only). I walked it in headless Chrome through Playwright, using only what a person sees: clicks, keys and the text on screen. I used SQL only as test input for the running state. Screenshots are in /tmp/rvwalk/shots (not kept).

## Journeys
1. **Author A, main path (Super visa).** Goal: "Where is IMM 5257, and what do I do next?"
   - Forms tab: both rows read "Step 2 of 6 · Field map · Your step". The tooltip reads "Worked out from what has been done. You never tick a step…".
   - The chip opens the rail. Next step: "Draft with AI or add from the library". What's left (1).
   - On the row: Draft with AI → Use saved AI answer. **The chip moved to "Step 3 of 6 · Review · Your step" 1.0 s later, with no reload.**
   - The rail's step 3 "Review 84 AI proposals" → the job page "AI-proposed field map". Back reopens the rail. ✓
2. **Alternate: the same form in another combination (Visitor visa), as A and as C.**
   - Chip: "Step 2 of 6 · Field map · Waiting on someone else".
   - Rail: "Being mapped in Super visa: 84 proposals left · a content publisher… no second AI draft". Its one link is "Open it in Super visa" → Super visa's job. Step 3 is not started, and no Draft is offered. ✓
   - The words repeat "Being mapped in Super visa" three times (Minor N2).
3. **Running (A and C).** The chip reads "Running". The rail says "The AI draft of the field map is running; this page follows it." and polls every 4 s. ✓
   - **When the run ends, the rail moves on (4 s) but the chip stays "Running" (12 s and longer), until a reload.** (Major A)
4. **Content reviewer C.** Told "The configuration author does this.", with no step they cannot take. ✓ (suite step 15 and my walk)
5. **Empty: a form with no PDF.** `?setup=CIT 0001` → "Upload its PDF in the Form library" → `/library/forms`. ✓
6. **Error.** `?setup=IMM 9999` → "could not be read … not in the library", with no Try again. ✓
7. **Wrong role.** Workspace forms read as O: 403. As Z, or with no one chosen: 401. ✓
8. **Recovery.**
   - Reload and Back keep `?setup=`.
   - Escape returns focus to the chip, also from `?setup=imm5257`.
   - Focus regained → the workspace is read again (suite step 25). ✓
9. **Keyboard at 200 % (720 px at 2×).**
   - 29 Tabs to the first chip. The tooltip shows on focus.
   - In the rail: Close → the named region "Where IMM 5257 stands" → the links.
   - No sideways scroll. ✓
10. **Across the boundary.** Step 3 → the job page; step 1 with no PDF → Form library; step 6 → Review and release (suite). ✓

## Replayed as automated checks
- `check_forms_c212_rail_browser` 26/26 and `check_forms_c212_progress` 54/54, on fresh copies; the /tmp archive gave the same results.
- My axe runs: 0 violations at 1440/1024/390 on author step 2, author step 3, elsewhere, and running as A and as C. The suite covers reviewer, error, waiting and done. No page errors.
- Speed: one `workspace?tab=forms` read and no `/progress` read per row. With an LMIA plus 221 index forms: 138–180 ms. Chips visible 1.26 s after a cold page load, SPA boot included.

## Data underneath
- Visitor visa's path holds none of Super visa's job items.
- The saved-answer run is one job, US$0.
- The workspace response carries one chip per form line or attached form, and none for document lines.
- The rail is read only: it has no write button (suite step 9).

## Break pass
- Saved answer, then a second combination: handled (journey 2).
- Run status changed under an open rail: the rail and the chip disagree (Major A).
- `?setup=` spelled differently, unknown or 300 characters long: handled (round-1 Minor 6 fixed).
- Mutations: 4 of 13 survive (frozen chip label, running words, rail focus refetch, rail key). See the review, N1.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Main path to step 3 and the job page, without a reload |
| Next step obvious | 1 | "Your next step" can always be taken; elsewhere links to where the work is |
| Plain words | ½ | "Being mapped in Super visa" said three times; the who line names a place (N2) |
| Feedback and state | ½ | The chip stays "Running" after the run ends (Major A) |
| Correct data | 1 | K1 holds across combinations; one read per view |
| Error recovery | 1 | 404 in words with no Try again; reload, Back, Escape and focus all recover |
| Accessibility and screen sizes | 1 | axe 0 at 3 widths on 8 states; keyboard; 200 % |
| Speed | 1 | 138–180 ms for the whole tab with chips |
| Visual quality | ½ | Board fit of the header and footer, and Minor 8, still open (declared) |
| Trust and sources | 1 | The AI draft is named as AI; the saved answer is labelled in the dialog; the other combination is named on the link |
| **Total** | **8.5/10** | Pass by score, with no criterion at 0. The review blocks on Major A |

Fixes that would raise the low criteria, most valuable first:
1. The chip follows a run to its end (Major A).
2. Say "Being mapped in X" once and name who acts (N2).
3. Board fit of the rail header and footer (Minor 2, declared).

Could not test: a real screen reader, a visible browser pane, live AI, or an intended user's unaided walk (D17 and D20 stay with the founder).
