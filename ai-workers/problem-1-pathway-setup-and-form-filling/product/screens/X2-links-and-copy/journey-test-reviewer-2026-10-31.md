# X2b journey test, reviewer, 31 Oct 2026 (commit 014b19cc, board only)

There is no app yet, so I walked the journeys on `design/draft-x2b-board.html` in Playwright Chromium (headless) at 390, 1024 and 1440 px. These are simulated: no intended user walked them (D17 and D20 stay with the founder). There is no data underneath to check.

## Journeys (content publisher unless noted)
1. **Main path.** On Visitor visa › Forms, open IMM 5476's ⋯ menu, choose "Copy to other combinations…", read each outcome, then "Add to 2 combinations". A toast appears with Undo. **Held:** 2 are ticked, and 5 are disabled, each with a reason.
2. **Alternate: remove across many.** Will be removed ×2, Does not have it, Removed already in its draft, then "Remove from 2 combinations". **Held.**
3. **Alternate: copy a line from another combination** (Super visa). Two lines are added. The third is "Cannot: that person is not in this application". **Held.**
4. **Opt-in.** A target waiting for review is left unticked, with the words "adding withdraws that submission". **Held.**
5. **Recovery: batch Undo.** Toast Undo → refused, naming Super visa and the change made at 14:02, with a way forward. **Held.** The success path is not drawn.
6. **Wrong role: approver.** The copy controls and the ⋯ menu are hidden, and a note points to Review and release. **Held.**
7. **Keyboard.** Opening a dialog focuses its first enabled control, and Esc closes all four dialogs. **Held.** There is no focus trap (board only).
8. **Error: a retired form, or a form whose retire is open.** **Not drawn** (BR-C1 outcome missing).

## Findings
* **Major:** the "Cannot: the form is retired, or its retire is open" outcome is missing from the add preview (BR-C1, §3b).
* **Minor:** the batch Undo success state is not drawn.
* **Minor:** at 390 px the outcome column of the preview table is cut off behind an inner scroll (table min-width 520). The page itself has no sideways scroll: `scrollWidth` 390.
* **Minor:** the aria-label "Parent: cannot" does not match the row text "child or grandchild in Canada". The dialogs have no `aria-modal`.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–3 end in the toast |
| Next step obvious | 1 | Each outcome says why; the buttons show the count |
| Plain words | 1 | "Already has it: no change", "Waits … Tick to add it anyway" |
| Feedback and state | ½ | The Undo success state is missing |
| Correct data | ½ | Nothing to read underneath; the concept's §3 and §3b disagree |
| Error recovery | 1 | The Undo refusal names the target and gives a way forward |
| Accessibility and sizes | ½ | No page scroll at 390, 1024 or 1440, and Esc works; the 390 outcome column is hidden, and the aria-label mismatches |
| Speed | ½ | Cannot be measured on a static board |
| Visual quality | 1 | Team tokens, pills, wrapping trails |
| Trust and sources | 1 | Sample on the title, the h1 and the note; the IRCC-channel row is labelled Sample |

**8/10, pass (no criterion at 0).** To raise it, most valuable first: draw the retired-form outcome and the Undo success state, and stack the outcome below about 600 px.

Not tested: a real screen reader, axe, an unaided walk by an intended user, the data underneath (there is no build).
