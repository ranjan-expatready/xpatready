# Journey test, reviewer, C4.11 part 1, round 2 (c94db558)

Copy: isolated rv411 on :24470, `STUDIO_SLOW_QD_STEP=400`, sample loaded, wp.family ("With an LMIA"), actor user-A (author) unless stated. Headless Chrome (Playwright) plus API and database reads. Round 1 report: `journey-test-reviewer-c411-2026-11-01.md` (7.5/10). This round re-walks only the journeys that failed or were affected by the fixes.

## Journeys
1. **Main path (author drafts, rules only):** open the dialog, Draft. The run card with Stop shows **204 ms** after the click. The run ends in about 5 s (slowed), with the note "32 items for To review; all four rules pass: … 2 steps are not available yet." Open To review lands on /review/proposals filtered to the combination, and the picks are listed. **Held.**
2. **Stop as a person, on screen:** Draft, wait 0.6 s, click Stop in the dialog. The card reads "Stopped · 1 s"; steps already done stand, later ones read cancelled. No rules verdict is shown. **Held** (round 1: failed).
3. **Leave the dialog while it runs:** Done during the run. `/runs?active=1` gives href `/ai/<runId>`; that page shows the same run card with Stop while it runs, and Done after. **Held** (round 1: dead end). After the end, that page has no link to To review or to the combination (m8 below).
4. **Second tab starts the same draft:** gets 409, and the dialog shows the running run's card (Step 4 of 7, Stop), not only words. **Held.**
5. **Wrong role:** the case officer (user-O) gets 403 on the plan; user-O and the approver (user-B) both get 403 "does not hold the author duty" on Stop. **Held.**
6. **Result read too early:** GET result while running is 409 "This run is still going". **Held.**
7. **Restart mid-run:** `isolated.sh stop/start` recreates the database, so I could not walk it end to end. The suite plants a RUNNING batch: 1 minute old gives 409 with its runId, 1 hour old ends FAILED and a new run starts. `onModuleInit` read and sound (round 1). **Held** (by test and reading).

## Data underneath
Run POST answers in 94 ms with `{runId, status:"running"}`. One "stopped" audit line naming the author and the run id. **But** the same stopped run also gets the "proposed" line "drafted questions and documents … (rules only, US$0.00): 0 to review, 0 findings" (draft-qd.ts:218), although step 7 never ran (m9 below).

## Automated checks
axe WCAG 2.2 A/AA: running, done and stopped states have no violations. 400 px: no sideways scroll. No console or page errors. C4.11 API suite on my copy: 33/33.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1: 32 items in To review |
| Next step obvious | ½ | Dialog has Open To review; the /ai/:id page reached from the chip has none after the end (m8) |
| Plain words | ½ | Step 3 shortened, note lower-case; a not-run step still reads "rules · US$0" (round-1 m5) |
| Feedback and state | 1 | Card with steps and Stop at 204 ms, in the dialog, on /ai/:id and in a second tab |
| Correct data | 1 | One batch, seven steps, no duplicates; audit wording on a stopped run is a minor slip (m9) |
| Error recovery | 1 | Stop on screen, 409 shows the live card, stale and restarted runs end Failed |
| Accessibility and screen sizes | 1 | axe clean in three states, 400 px |
| Speed | 1 | POST 94 ms, card 204 ms |
| Visual quality | 1 | No wall of text; shared Dialog and RunCard |
| Trust and sources | 1 | US$0, AI now greyed with the reason, Sample label, who stopped is logged |

**9 / 10: pass (8 or more, no criterion at 0).** To raise it: a "Open To review" next step on the run's own page after it ends (m8); no how/cost pill on a NOT_YET step (m5).

## Not tested
A real screen reader. A live server restart (the isolated tool recreates the database). Replay with real saved answer files. Keyboard path re-walk (unchanged controls; round 1 held). An intended user's unaided walk (D17/D20 stay with the founder).
