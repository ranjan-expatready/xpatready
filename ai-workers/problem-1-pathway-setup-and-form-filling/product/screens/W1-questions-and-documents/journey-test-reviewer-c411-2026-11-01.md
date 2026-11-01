# Journey test — C4.11 part 1 "Draft questions and documents" (reviewer, 1 Nov 2026)

Commit ee66d870, isolated copy rv411 on :24470, sample loaded, wp.family ("With an LMIA"). The walk was headless Playwright using clicks and keys only (script kept outside the repo, /tmp/rv411/walk.cjs). I made the data checks through the API and psql. One pass ran with `STUDIO_SLOW_QD_STEP=1500` so the running state and Stop could be seen.

## Journeys
1. **Main (content publisher):** "draft the questions and documents for this combination". Questionnaires tab → Draft questions and documents → read the plan → Draft → read the card → Open To review. **Held.** 7 steps, US$0, 32 picks went to the queue, all four rules pass.
2. **Alternate, saved AI answers with none saved:** step 6 says "No saved AI answer…", the run ends PARTIAL, US$0, nothing proposed. **Held.** The run note leaves out that step 6 failed (review m6).
3. **AI now:** the option is greyed out with the reason, and the API returns 409. **Held.**
4. **Wrong role starts the run:** the approver gets 403. **Held.**
5. **Wrong role stops the run:** the case officer (user-O) stopped the author's run with **201**, and nothing in the audit records it. **Failed** (review M2).
6. **Double click / two tabs:** the second start gets 409 "Already running". **Held.**
7. **Stop while it runs, as a person:** the dialog shows only a busy Draft button for the whole run (11 s in the slow pass). There is no run card and no Stop. The top-bar chip leads to the Questionnaires tab, which has no card for this run. **Failed** (review M1).
8. **Run again:** no duplicate picks (32, then 0). **Held.**
9. **Recovery after a restart mid-run:** at ee66d870 the combination stays blocked. Found by reading the code; fixed in 8458dd2d. (review M3)
10. **Across the boundary:** "Open To review" links to /review/proposals filtered to this combination. **Held** (the link exists; per-item accept is C4.7's, already reviewed).

## Automated checks I ran
axe WCAG 2.2 A/AA: plan and result have no violations. Keyboard only: Tab ×36 reaches the button, Enter opens it, focus lands on the first radio, Tab reaches Draft, Enter runs it. 400 px and 512 px (200 %): no sideways scroll. No console or page errors. Plan 114 ms; rules run 0.7 s (under the §9 budgets). I ran the script once, so no flakiness check. The builder's suite covers 1440 and 1024 twice over.

## Data underneath
One ai_batch per run, with exactly seven drafting_job rows. Proposals deduplicated on the second run. Draft tables unchanged by step 7 findings. Audit: one "proposed" line per run, but a stopped run is still written up as "drafted … 0 to review", and there is no line for the Stop.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1 ends with 32 items in To review |
| Next step obvious | ½ | "Open To review" is there; during the run the chip leads to a page with no card |
| Plain words | ½ | Step 3 lists 18 document names in one sentence; a not-run step reads "rules · US$0"; a capital letter mid-sentence in the note |
| Feedback and state | ½ | Nothing shows progress while the run is going (journey 7) |
| Correct data | 1 | One batch, seven jobs, no duplicates, draft unchanged |
| Error recovery | ½ | Stop cannot be reached from the screen; at ee66d870 a restart left the combination blocked |
| Accessibility and screen sizes | 1 | axe clean, keyboard path, 400 and 512 px |
| Speed | 1 | 114 ms plan, 0.7 s run |
| Visual quality | ½ | Team components; step 3's wall of text dominates the card |
| Trust and sources | 1 | US$0 stated first, AI now greyed with the reason, Sample label, "saved AI answers" pill |

**7.5 / 10: below the pass mark of 8 (no criterion at 0).** The fixes that would raise the score most, in order: run in the background with the run card and Stop in the dialog (feedback, recovery, next step); author check and an audit line on Stop; step-3 names moved under details, and no pill on a NOT_YET step (words, visual).

## Not tested
A real screen reader. Replay with real saved answer files. An intended user's unaided walk (D17/D20 stay with the founder).
