# Journey test: reviewer, C2.6 checklist replay (commit f30a7a7f), 2026-11-01

Reviewer role, the one journey score for this check. Isolated copy `rev_c26`: API on :4425, this commit's web build on :4426. Headless Playwright (Chromium 1243) and axe-core. No visible browser was available. US$0, no `*_LIVE` variable. The scripts live in `/tmp/revc26` (walk4–6, probe–probe3) and the screenshots in `/tmp/revc26/shots`. Neither is committed.

## Journeys
1. **Main path.** The configuration author (user-A) wants the LMIA-exempt (employer offer) document list drafted from the IRCC checklist. Setup: demo reset and load. A new LMIA-exempt combination gets IMM 5488 and IMM 5406 through `/intake`, the same call as the upload control, and steps 1–2 are done with the `steps-before-forms` fixture. Steps: open the combination; Next step "Map 1 form" opens Draft setup; the Checklists panel shows "IMM 5488 (10-2024) · saved AI reading: 13 lines" with "Replay the saved reading · US$0"; Tab to the button and press Enter; the job page lists 12 proposals with IRCC's words; Return one with a reason; Accept 11; "Apply to the draft"; then the Documents tab. **Expected:** the accepted lines appear as draft requirements, conditional ones with their conditions. **Result:** done. The toast says "9 document requirements added to the draft; not applied: 2", and Documents lists them with "Only when…" conditions.
2. **Alternate: decide in the one review queue.** The content reviewer (user-C) opens To review › Proposals. The group "…› LMIA-exempt (employer offer)" shows Check 12. Open "Copy of LMIA…" shows the reading, IRCC's words, "found in the file" and Rules: Passed. Then Accept. **Expected:** it is accepted, or the reviewer is sent to where it is decided. **Result:** the toast says "A requirement line proposal is accepted with its own step, not yet on this queue." There is no link and no way on (screenshot 22). It is the same for user-A and user-B.
3. **Empty.** The checklist IMM 5483 has no saved reading. The panel offers only the stub pass. A replay by API answers 409: "No saved AI reading of IMM 5483 (08-2025) yet…". Nothing is queued.
4. **Error: live refused.** `mode: live` answers 409, "waits for the founder's OK on its cost". Nothing is queued.
5. **Wrong role.** user-C replaying gets 403; an unknown actor on `checklist-readings` gets 401.
6. **Recovery: double click and two tabs.** Eight parallel replays give one job with 12 items. **Replay again after apply** creates a new job with the same 12 lines; accept all and apply takes the combination from 9 to **19** draft lines from imm5488e.pdf (duplicates).
7. **Across the boundary.** The applied lines appear on Documents as Draft, but read "Edited by a person" (screenshot 32), not as AI-proposed.

## Automated replay
I ran the main path (walk4) twice. Both runs passed. axe WCAG 2.2 A/AA was clean on the Draft setup dialog and on the job page. There was no sideways scroll at 1024 or 400 px. The keyboard reached Replay in both runs. There were no console or page errors. Replay to the job page took 614 ms and then 589 ms.

## Data underneath
The 12 `proposal_item` rows each appear once and parse against `ProposalItem` (0 failures). They are Check, `one_round`, SAMPLE, `from` replay, US$0. The audit line reads "replayed the saved AI reading of IMM 5488 … (US$0)". The applied rows are `ANSWER_CONDITIONAL` with `predicate_json` and the checklist quote. The 2 skipped lines are listed with reasons in the API response and in Activity only.

## Break it
Duplicates (Major, journey 6) and the queue dead end (Major, journey 2) are above. A hostile or long text input does not apply: the replay takes no free text. Reload of the job page keeps its state.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| task completed | ½ | done via the job page (journey 1); fails from the queue (journey 2) |
| next step obvious | ½ | the queue row says "Open", and its Accept is a dead end; the panel sits behind a "Map 1 form" next step |
| plain words | ½ | source shown as `prototype/p1/inventory/imm5488e.text.inventory.json`; "when Only when…"; "13 lines" vs 12 proposed; Draft setup text says document requirements are not AI-drafted |
| feedback and state | ½ | skipped lines shown only as a count in a toast that leaves the page |
| correct data | ½ | conditions are correct, but re-replay writes duplicate lines (9 → 19) |
| error recovery | ½ | the 409s for no reading and for live are in good words; the queue 409 gives no way forward |
| accessibility and screen sizes | 1 | axe clean ×2 states ×2 runs; keyboard reaches and runs Replay; 1024/400 px fine |
| speed | 1 | 589–614 ms replay to job page |
| visual quality | 1 | team components, screenshots 10/11/30 |
| trust and sources | ½ | AI pill, quote, "found in the file", Sample; origin becomes "Edited by a person" after apply |
| **Total** | **7/10** | below the pass mark of 8 (no criterion at 0) |

**Fixes that raise it, most valuable first:** make queue items decidable, or link them to the job page (task, next step, recovery). Stop re-replay duplicates (correct data). Show the skipped lines with reasons on the job page (feedback). Show the PDF name, not the inventory path; fix "when Only when", the line count and the dialog sentence (plain words). Keep the AI origin on applied lines (trust).

## Could not test
A visible-browser walk by a person, a real screen reader, 200 % zoom, and an intended user's unaided walk (D17/D20 stay with the founder).
