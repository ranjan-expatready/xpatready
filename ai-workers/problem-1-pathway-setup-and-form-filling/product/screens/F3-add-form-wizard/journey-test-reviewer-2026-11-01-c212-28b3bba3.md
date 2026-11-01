# Journey test: F2 C2.12 slice 3 (step chip and rail on the Forms tab) · reviewer · 1 Nov 2026 · commit `28b3bba3`

I did not build this. I walked it in headless Chrome (Playwright), using only what a person sees: chips, the rail, links, Tab, Enter, Escape, reload and Back.

Setup:
- An `isolated.sh` copy on :4450 with the sample loaded. Later in the run, IRCC's index was filled (`fill-from-index`, 237 library forms).
- People: A (Configuration author), C (Content reviewer), plus O and Z for wrong role.
- Mutations ran on a /tmp `git archive` copy on :4451.
- Cost: US$0, saved AI answer only.
- Every copy was stopped and its database dropped.

## Journeys (persona · goal · expected → what happened)
1. **Main path. A on Super visa: "where is IMM 5257, and what next?"**
   - The chip reads "Step 2 of 6 · Your step". Enter opens the rail at `?setup=IMM 5257`, and "Your next step" says "Draft with AI or add from the library".
   - That link closes the rail and lands on the Forms tab, top of the page, with focus on `<body>`. I found the row's "Draft with AI", used the saved answer, and the toast said so.
   - **The chip stayed "Step 2 · Your step" for the 12 s I watched.** The reopened rail first showed step 2, then refetched to step 3 "Review 84 AI proposals". That link opened the AI-proposed field map, and Back reopened the rail.
   - **Held, with stale feedback (Major 3).**
2. **Alternate. A adds IMM 5707 from the library (attached only, mapped in the library).**
   - Step 2 says "Add from library", with no AI and US$0 stated ✓. I clicked the row's "Add from library".
   - The chip stayed "Step 2" for 8 s. After a reload it read "all 6 steps done".
   - **Held, stale (Major 3).**
3. **Second combination. A on Visitor visa, IMM 5257, while Super visa's draft waits.**
   - The rail says "Your next step: Draft with AI". Step 3 shows "Your step · Review 84 AI proposals", linking into **Super visa**.
   - "Draft with AI" → saved answer is refused: "Being mapped in Super visa…".
   - **Failed (Major 2).**
4. **Wrong duty. C on Visitor visa, IMM 5707.**
   - "Nothing for you to do here now: The configuration author does this." There is no link on step 2, and the chip reads "Waiting on someone else" ✓.
   - **Held.**
5. **All done. A on With an LMIA, IMM 5409.**
   - "Every step is done", and six steps are done. The step-6 note about list warnings is said ✓.
   - **Held.**
6. **Running (SQL test input: the job set to RUNNING, then COMPLETED).**
   - Step 2 shows "Running", and the rail polls every 4 s. Both chip and rail moved to step 3 within 5.5 s ✓.
   - The words are wrong: "Nothing for you to do here now: someone else acts next".
   - **Held (Minor 3).**
7. **Error and loading (network stubbed).**
   - Loading: the chip reads "Guided setup" and the rail shows a spinner.
   - A 500 gives the rail notice "Where this form stands could not be read" with Try again, while the chips vanish silently.
   - An unknown `?setup=` gives a 404 in words.
   - **Held (Minor 6).**
8. **Recovery.**
   - Reload keeps the rail. Back after following a link reopens it. Escape cleans `?setup=` and returns focus to the chip ✓.
   - **Held.**
9. **Keyboard only, at 1024 px, and 200 % zoom (720 px).**
   - Chip → Enter → Tab to the step-3 link → Enter → Back → Escape back to the chip ✓.
   - At 200 % the rail covers the page, with no sideways scroll and axe 0 ✓.
   - **Held.**
10. **Wrong role and hostile input.**
    - O (403) and Z (401) see no chips and no rail.
    - `?setup=<img onerror>` is shown as text. Cyrillic gives a 404 in words. A 300-character value becomes the rail title.
    - **Held (Minor 6).**

## Automated replay and data
- **axe at 1440 / 1024 / 390:** elsewhere, loading and error 0/0/0. Waiting, done and running **0/0/1 `scrollable-region-focusable`** (Major 5). Nothing scrolls sideways at any width.
- **Builder suites:** rail 15/15 and progress 39/39, on fresh copies and on the archive.
- **Mutations:** 7 of 11 caught. Missed: the no-PDF upload rule (Major 4), the step links, the "who" line, and a frozen chip label.
- **Speed (LMIA, 6 chips):**
  - Rows at about 300 ms, chips settled at 667–916 ms.
  - 6 progress calls per view, 340–550 ms each when run together.
  - About 59 transactions per call, about 578 per tab view.
  - 20 rows would take about 1.4 s (Major 1).
- **Data:** the reads wrote nothing. The Visitor visa draft was refused, so no job was created. Replay cost US$0.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | The Super visa path completes. On Visitor visa the offered step is refused (J3) |
| Next step obvious | ½ | "Your next step" is prominent, but steps 1–2 land on the bare tab with nothing pointing at the row (J1). J3 points the wrong way |
| Plain words | ½ | Plain and no ids. But running reads "someone else acts next", and "· N open" says nothing about what it counts |
| Feedback and state | ½ | Loading, error and running are drawn, but the chip stays stale after acting on its row (J1, J2) |
| Correct data | ½ | Another combination's job shows as this combination's step 3 (J3) |
| Error recovery | 1 | Error notice with Try again, resume on reload and Back, Escape focus return |
| Accessibility and screen sizes | ½ | Keyboard path and 200 % fine. axe fails at 390 in three states |
| Speed | ½ | Under 1 s at 6 rows, but one request per row, growing linearly |
| Visual quality | ½ | Team Panel and Pill. The chip is cut off in the last LMIA column at 1440, and the header is thinner than the board |
| Trust and sources | 1 | No AI content in the rail. The saved answer and US$0 are said |
| **Total** | **6/10** | **Fail** (below 8) |

Fixes that raise it, most valuable first:
1. Progress per line in the workspace response (speed, feedback).
2. Scope items to the combination, with "Being mapped in …" (data, task, next step).
3. Refresh the chip after row actions.
4. Make the rail body focusable.
5. Point steps 1–2 at the form's row or scoped Draft setup.
6. Running words and what's left with who and a link.

## Could not test
- A real screen reader.
- An intended user's unaided walk (D17, D20 stay with the founder).
- Live AI.
- A real long-running job (the running state was SQL test input).
