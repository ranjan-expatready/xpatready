# Journey test, reviewer role, 2 Nov 2026: C11.15 Redo with AI per stage (commit 4093121b)

Copy: isolated :4456, fake launcher, no live switch, US$0. Headless Chrome (a visible pane was not available). Persona: configuration author (user-A) on Visitor visa after Demo > Load sample (the six).

## Journeys
1. Main: Forms tab, line menu "Actions for IMM 5409", Redo with AI, pick stage Match, Saved, Start. Walked. Dialog opens with "What to redo" (Find, Read, Match), How AI answers, steps and cost "US$0 (no AI call)". Run ends in 0.14 s. WRONG RESULT: the finder panel afterwards says "AI found 1 form for this combination, 1 to decide" and lists IMM 5484 (not redone); the other six forms vanish from the list (walk-3-after-start.png). Nothing says IMM 5409's line is unchanged.
2. Alternate: stage Find then Read then Match. Plans: Find step 1 "Find the application page and guide" (AI); Read and Match identical ("Use the application page already chosen"). Run Find in replay completes at US$0.
3. Empty: not run in the browser (the six has saved answers); API: a form not on the combination 404 with words.
4. Error: Live is greyed with the reason ("AI now is switched off on this copy"); API start in live 409 plain words, nothing written.
5. Wrong role: approver POST redo 403 (acceptance AT-12).
6. Recovery: same idempotency key twice gives one run (API); reload mid-action and double click on Start not walked.
7. Stop: API only (AT-24 passes: Stop answers the run ended). Run ends too fast to click Stop in the browser.
8. Boundary: after Redo, "Last find ... Find again" is the next action; its summary no longer matches the lines table.

## Data underneath
Line unchanged (DRAFT, v1), spend ledger unchanged, no second line added. But `GET .../forms/find/latest` returns 3 forms instead of 9 after a one-form Redo, and the run message counts a form that was not redone (Done with problems).

## Score (0, 0.5, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 0.5 | Redo starts and ends; nothing is changed or reported for the redone form |
| Next step obvious | 0.5 | Dialog clear; after Start no result for the form, only "Find again" |
| Plain words | 0.5 | "1 to decide" about another form; Read and Match read as different but run the same (Read says so, Match does not) |
| Feedback and state | 0.5 | Panel replaced by a partial list, "Done with problems" on a clean redo |
| Correct data | 0 | Finder list and counts wrong after a one-form Redo (9 rows to 3; "1 form" while 7 attached) |
| Error recovery | 1 | Live off greyed with the reason; refusals in words; stale plan 409 |
| Accessibility and sizes | 1 | axe A/AA 0 violations on the dialog; arrow keys on radios; no sideways scroll at 400 and 1024 |
| Speed | 1 | plan about 1 s, run 0.14 s |
| Visual quality | 1 | Dialog consistent with the team look |
| Trust and sources | 0.5 | AI/rules chips, Sample note, cost shown; description still says forms "are attached"; result of AI's decision for the form not shown |
| **Total** | **6.5 / 10** | **Fail: below 8 and one criterion at 0** |

## What would raise it, most valuable first
1. Scope the run message, status and the finder list to the redone form (correct data to 1, feedback to 1).
2. State the outcome for the form ("AI still reads it as: ...; your line is unchanged") (task, next step, trust).
3. Match hint says reading and matching run together; Redo dialog description not "are attached" (plain words).

## Not tested
Real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); live AI; Stop by click; double click and reload mid-run.

Verdict for this item: not passed (6.5/10).


## Re-walk at 82cf8e1f (reviewer)
Main journey again (Visitor visa, six loaded, Forms tab, line menu on IMM 5409, Redo with AI, Match, Saved, Start): the finder strip reads "AI found 7 forms for this combination, 1 to decide" before and after, the one row listed is unchanged, no console errors. The wrong result in journey 1 is gone. Error journey: Redo (Read) on a combination with no earlier find shows "This find cannot start ... choose Find for IMM 1295"; choosing Find shows the plan and enables Start. Remaining: the outcome sentence of a Redo is only in the run record (feedback and state, 1/2), and the title above for read/match (plain words, 1/2). Score **9/10**, pass. Not tested: screen reader, keyboard-only whole path, live mode.
