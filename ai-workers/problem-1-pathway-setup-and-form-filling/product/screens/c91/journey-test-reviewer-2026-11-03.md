# Journey test: AI on a held new edition (C9.1), reviewer, 3 Nov 2026, commit 459bcccaa

Copy: isolated `rv_c91` on :4446 (live switch off). Setup by API: reset, intake `imm5476e-2021.pdf`, then Load sample six. This holds IMM 5476 (11-2025) over 2021 on Visitor visa. Browser: headless Chrome via Playwright. Scripts and screenshots are in the reviewer's scratchpad (`rv/journey.cjs`, `rv/appr.cjs`, `rv/wide.cjs`), not committed. No priced button was clicked, and the page sent no request with `"mode":"live"`.

## Journeys
1. **Main.** The Configuration author has a new IMM 5476 on To review and wants to see what changed and get AI help for the changed boxes. Steps: To review, then "Review impact", read the AI section, then "Use the saved AI run (US$0)", then follow the "3 waiting on To review" link. Expected: the cost is shown first, US$0, proposals for a person.
2. **Alternate, live off.** The author wants a fresh AI draft. The priced button is greyed, with the reason beside it.
3. **Empty.** The author wants to see components touched. All four lists are empty: "None touched".
4. **Error, server.** Approver POST gives 403. A live POST without the switch gives 409 with words. An unknown id or a non-UUID gives 404. A malformed body gives 400. A replay with no saved run gives 409 "No saved AI run…" (from the API check).
5. **Wrong role.** The approver opens the page: there are no AI buttons, and it shows read-only text.
6. **Recovery.** Double Enter on the saved-run button; reload after drafting; a second click after drafting.
7. **Across the boundary.** The "3 waiting on To review" link leads to To review, which lists AI proposals (14) and the New edition row.

## What held
* The To review row reads "New edition: review impact. Nothing changes until a person reviews its impact and releases it; it touches Visitor visa." It has one next step, "Review impact". It appeared in 1.3 s, and the page was ready in 0.87 s (API GET 0.46 s).
* The AI section states "Draft with AI (about US$0.43 · at most US$2.00): proposals for the 23 new and reworded boxes only; nothing runs until you click, and a person accepts each one." The priced button is disabled, with "live AI is off" beside it.
* The IRCC accepted-until notice quotes "We will continue to accept the previous versions of the form until March 12, 2026." with the form page and the saved date, and says it has passed.
* By keyboard only, 20 Tab stops from the top reach "Use the saved AI run". Enter runs it. 3 boxes then show "1 on To review" and 20 show "None proposed: a person maps it".
* Data underneath: 1 `drafting_job` (REPLAY, COMPLETED, US$0, its run file), 3 `proposal_item`s all `waiting` (check, ready, decide; the off-form quote is Decide, with its reason), and 1 audit event: "Configuration author drafted IMM 5476 (11-2025)'s 23 new and reworded boxes with AI (replay, US$0.00): 3 proposals for a person". A second POST returns `again: true`, the same job.
* axe: clean at 1440, 1024 and 720 px (200 % of 1440), and on the Components tab and the drafted state. No sideways scroll at 1440, 1024 or 512 px. No page error apart from the 409 of the double press.

## Findings (severity)
* **Major:** components touched are empty in every reachable scenario. The six and configured samples have no rules or sections, and the 2021 edition has no maps, so the P-32 server path is never shown or tested (review Major 2).
* **Major:** saved-run replay does not pin the draft and checker to one run (review Major 1; found in the code, not visible in the walk).
* **Minor:** "(the founder's switch, P-175)" is shown to the user. After drafting, the offer and "No saved AI run…" text stay beside "Saved AI run … 3 proposals" (seen as the approver). Focus falls to `<body>` after the action. At 400 px the tab row overflows by 26 px. A double Enter gives a 409 on the second request.

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | AI proposals for the changed boxes: yes. "What else it touches" cannot be seen with data anywhere |
| Next step obvious | 1 | One "Review impact"; "Use the saved AI run"; link to "3 waiting on To review" |
| Plain words | ½ | "P-175" on screen; the cost sentence repeated 3 times in one card |
| Feedback and state | ½ | Contradictory offer and saved lines after drafting; focus lost |
| Correct data | 1 | One job, 3 proposals, audit line, US$0, ledger unchanged |
| Error recovery | 1 | Reload keeps Drafted; the second click returns the first; refusals in words |
| Accessibility and screen sizes | ½ | axe clean at 1024 px and 200 %; 400 px overflow; focus lost after the action |
| Speed | 1 | 0.46 s API, 0.87 s page, 1.3 s draft |
| Visual quality | 1 | Team card, pills, counts; one tab row; tidy at 1024 px |
| Trust and sources | ½ | AI marked, cost first, IRCC quote; but draft and checker rounds can come from two runs |

**Score: 7.5 / 10: not a pass** (8 needed; no criterion at 0). Most valuable fixes: pin the replay pair (trust), seed and prove components (task), hide the offer once drafted and move focus (feedback), drop "P-175" (words), wrap the tab row (sizes).

## Not tested
A real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); a live run (PR 2); part 2 on the configured checkpoint (it does not hold IMM 5476 11-2025 on this commit).

## Round 2 (127f57500), diff only
Copy `rv2c91api` :4442, restarted on the fake launcher with the live switch (no model, no priced click), after the API check's own run. Headless Chrome, scripts in the reviewer's scratchpad.

**Journeys re-walked:**
1. **Saved, by keyboard.** "Use the saved AI run (US$0)" is reached in 20 Tabs, with no priced button beside it. Enter gives the result in 1.8 s and focus lands on `[data-drafted]`. The offer and saved lines are gone. Data: 1 REPLAY/COMPLETED/US$0 job and 3 waiting proposals. axe is clean and there is 0 px sideways scroll at 400 px.
2. **Paid-closed.** One failed live record of US$0.13 is in `p2/runs`, as after a demo reset. The priced button is greyed with "already had a paid AI run (US$0.13)…" and no request is sent. But the page still says "nothing runs until you click" and "Draft with AI runs it".
3. **Recovery after a free refusal.** A US$0 usage-limit record closes Draft with AI for good, with the words "its cost not recorded: it was stopped" (review Round 2, Major B).
4. **Trust.** Two Mac runs sharing one stem: run 2's draft is replayed with run 1's checker as "read by both rounds" (Major A).

| Criterion | R1 | R2 | Evidence |
|---|---|---|---|
| Task completed | ½ | ½ | P-32 now proven with data (API); the samples still show 0, and an accepted proposal does not map its box (break M5) |
| Next step obvious | 1 | 1 | One button per state: Saved, or the priced button with its reason |
| Plain words | ½ | ½ | "P-175" gone; the Saved line names a missing "Draft with AI" button; the paid-closed state contradicts itself |
| Feedback and state | ½ | 1 | Offer hidden once drafted; focus on the result; closed reason beside the greyed button |
| Correct data | 1 | 1 | One job, 3 proposals, US$0, ledger unchanged; set-aside withdraws them |
| Error recovery | 1 | ½ | A free refusal blocks every retry (Major B) |
| Accessibility and screen sizes | ½ | 1 | axe clean; 400 px tabs wrap; focus kept |
| Speed | 1 | 1 | Page ready 1.0 s, replay 1.8 s |
| Visual quality | 1 | 1 | Unchanged team look |
| Trust and sources | ½ | ½ | Pairing still mixes runs of one Mac stem (Major A); false "stopped" cost words |

**Round 2 score: 8 / 10, a pass** (no criterion at 0). Even so, the review blocks on Majors A and B. Most valuable fixes: the replay window (trust), counting only charged records (recovery and trust), one consistent sentence per AI state (words).
