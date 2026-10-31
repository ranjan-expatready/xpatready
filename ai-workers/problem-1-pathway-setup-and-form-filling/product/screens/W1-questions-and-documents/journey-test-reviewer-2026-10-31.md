# Journey test — reviewer — F6 slice 1 (pre-qualification picks by the rules), 31 Oct

Commit `63e9eff61b0dc71cd8d9a9b353d7445ed54064a5`. Isolated copies `rv6_api` on 4437 and `rv6_web` on 4438, sample loaded, headless Chrome through Playwright, US$0.
Probe scripts were kept outside the repo (/tmp/rv6probe). Review: `review-f6-slice1.md`.

## Journeys (persona · goal · expected)
1. **Main (author).** "Have the rules suggest what a prospect should be asked for With an LMIA, then pick the good ones." Questionnaires › Pre-qualification › Propose picks from the rules › Open on To review › open a pick › Accept › back to Questionnaires. Expected: the fact is ticked, with the pick's reason.
2. **Alternate (author).** Reject a pick with a reason. Expected: it is not asked, and it does not come back.
3. **Recovery (author).** Accept, then Undo within 10 s. Expected: the draft is exactly as it was before.
4. **Repeat (author).** Press Propose again, and also from two tabs at once. Expected: nothing is proposed twice.
5. **Wrong role (Approver, Content reviewer).** Try to propose and to accept. Expected: they are not offered the action, or are refused in words.
6. **Error.** A fact ticked by hand while its pick waits; a retired combination. Expected: refused in words, and nothing changes.
7. **Boundary.** The accepted pick appears in the combination's draft changes for its one review and release (C4.8).
8. **Sizes.** Keyboard only; 400 px; 1024 px; 200 % zoom.

## What held
* 1: worked by keyboard alone (Tab to the button, Enter, Tab to "Open on To review", Open, Tab to Accept). The notice reads "32 picks are waiting on To review, each with its reason. Accept the ones a prospect should be asked." and is announced (role=status). After Accept the toast reads "Accepted: it is now asked in pre-qualification in this combination's draft, released with it.", and the chip count goes 0 → 1.
* 3: Undo was offered and took the tick off.
* 4 (single tab): "Nothing new: the 32 picks … already waiting".
* 6: refused in words (409 "… is already asked in pre-qualification"; 409 retired), with the hand tick kept.
* 7: the pick shows as a named draft change "Where an answer comes from", with no library change.
* 5: the propose button is hidden from the Approver.
* Sizes: axe clean on four states. No sideways page scroll at 400 px, at 1024 px, or at 200 % (emulated as 512 px at scale 2). No page errors.
* Data: one DraftingJob per run (pqr_picks, LOCAL, COMPLETED, cost 0), the spend ledger unchanged, and one audit line.

## Findings (detail and fixes in the review)
* **Major.** In journey 1, Accept with an empty reason box stores the run's general sentence, not the pick's reason (api/src/proposals.ts:162 with :289).
* **Major.** In journey 2, the rejected pick is proposed again on the next press ("1 pick is waiting … 31 more were already waiting").
* **Minor.** In journey 3, Undo after an earlier draft source change keeps the source but resets the reason to null and the origin from HUMAN to CODE_MATCH, and drops the bulk batch link.
* **Minor.** In journey 4 (two tabs), each press proposed 32: 64 waiting, 32 of them duplicates.
* **Minor.** In journey 5, the Approver and Content reviewer get an enabled Accept that fails: "Approver (simulated) does not hold the author duty".
* **Minor.** Words: "pqr subset of sqr" in the side panel; "(The application)"; the same long "Why a person looks" text on every row.
* **Minor.** At 1024 px the To review row's Open button is off-screen inside the table's own scroll; rows are about 145 px tall.
* **Minor.** Focus goes to `<body>` after Propose.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 2, 3 and 7 complete |
| Next step obvious | 1 | The notice links straight to the combination's group on To review |
| Plain words | ½ | "pqr subset of sqr", "(The application)", "does not hold the author duty" |
| Feedback and state | 1 | Notice with role=status; Accept, Reject and Undo toasts in words |
| Correct data | ½ | Pick reason replaced; rejected picks return; duplicates under a race |
| Error recovery | ½ | Undo and refusals hold; the wrong role is offered a failing Accept; an earlier draft is not fully restored |
| Accessibility and screen sizes | ½ | axe clean, keyboard path works, 400 px and 200 % fine; focus lost; Open off-screen at 1024 |
| Speed | 1 | Propose 131–217 ms, queue 16 ms, reject 18 ms |
| Visual quality | ½ | Tall repeated rows, Kind column clipped at 1024 (screenshots/pqr-picks/02-to-review-1024.png) |
| Trust and sources | 1 | Marked Rules, never AI, no readings shown as AI; "No quote: it comes from the rules alone"; Sample until the expert confirms |
| **Total** | **7.5 / 10** | **Fail** (below 8; no criterion at 0) |

Fixes that would raise the score, most valuable first:
1. Keep the pick's own reason on Accept (correct data).
2. Do not propose a rejected pick again (correct data).
3. For a pick, disable Accept for people without the author duty and say who can accept (error recovery).
4. Shorter per-pick "Why" text and readable person words for case facts (plain words, visual quality, 1024).
5. Restore an earlier draft on Undo (error recovery).
6. Keep focus on the button after Propose (accessibility).

## Could not test
A real screen reader. Real browser zoom (emulated). An intended user's unaided walk (D17 and D20 stay with the founder). Live AI picks (out of scope; founder Go needed).

## r2 on `80b0fdee` (31 Oct)
I walked the journeys again on the new head.
- Journey 1: the tick keeps the pick's reason.
- Journey 2: the rejected pick is not proposed again, and the result says so.
- Journey 3: Undo restores the earlier draft row exactly, including its bulk batch.
- Journey 4: two tabs at once now give 32 and 0 picks.
- Journey 5: Accept is disabled for the Approver and the Content reviewer, with a reason in words.
- Focus moves to the result notice after Propose.

Score: correct data goes from ½ to 1, and error recovery from ½ to 1. **Score 8.5/10, pass.** Open Minors: the words and the 1024 px table on To review (see the review's r2).
