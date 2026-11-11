# BK-15 journey test: reviewer, 11 Nov 2026 (PR #1591 at 2ff49d6d2)

Reviewer role (the one score for this check). My own copy :4458 (`isolated.sh rvbk15 4458 start --ttl 60`, stopped
after), configured checkpoint loaded through Demo › Load (111 s), headless Chromium at 1440, 1024, 720 (200 % zoom of
1440) and 400 px. Live AI off, US$0. Never :4400.

## Journeys
1. **Main: case officer sees what each family member pays.** Study permit family (student, spouse, child S, child V).
   Open the case › Submission to IRCC › Fees. Expected: one filing per person, named by its document, each fee with a
   reason, one total. **Held:** 4 cards, Fees table by filing, "Total for this submission: CAD 775" (S not studying yet).
2. **Alternate: child S will study 6 months or more.** Agent view › tab "Sample Child S" › Details of intended study ›
   Edit › Yes › Save, keyboard only. Expected: S files a study permit, total CAD 825. **Held:** focus lands on the radio
   in the dialog; "Saved."; "Study permit: Sample Child S", CAD 150; total CAD 825; save 108 ms.
3. **Data underneath.** Answer history kept (true, false, true, current one row), audit "Case officer changed
   person.studies_six_months_or_more on case … (Agent view)". **Held.**
4. **Visitor visa family (unchanged).** Same family on Visitor visa: four visitor visas CAD 400 + biometrics CAD 170 =
   CAD 570; labels "Visitor visa: <person>". **Held** (builder's API suite run on my copy: 14/14).
5. **Empty / not answered.** Child V's "6 months or more" never answered. Expected (BR-10, BR-5): V's fee waits, total
   "so far". **Failed:** priced CAD 100 as a visitor visa, total shown as final (review issue 1).
6. **Error: invalid value.** Saved "maybe" with the current answer id: kept with "Answer yes or no.", but the fees went
   on as if No (CAD 100) without saying so. **Partly.**
7. **Error: two people saving.** A save with an out-of-date answer id: 409 "Someone changed this answer after you opened
   it; the newer answer is shown. Check it and save again." **Held.**
8. **Wrong role.** `/prepare` as author, approver, client: 403; no person: 401. **Held.**
9. **Across the boundary: the author's release.** Study permit draft problems: a warning tells the author to add work
   permit, open work permit holder and visitor visa fees to the child's study permit. **Failed** (review issue 2).
10. **Break it: release with the child still On the principal's.** Saved (BR-7 warning), SME signed, approver released
   v2; new case: the student's study permit filing carries "Visitor visa fee · for Sample Child W CAD 100", total CAD
   570 "worked out". **Failed** (review issue 3).

## Replay as automated checks
Scratch Playwright scripts (not committed): axe WCAG 2.2 A/AA on the Submission panel: 0 violations; no sideways
scroll at 400, 720, 1024, 1440 px; no console or page errors; run twice, same results. Case page settles (network
idle) in 1.7–2.5 s on the dev server; the save and refresh in about 0.1 s.

## Score (0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 2, 4: filings, fees and total by person |
| Next step obvious | ½ | Nothing tells the officer that V's fee hangs on an unanswered question (journey 5) |
| Plain words | ½ | "(P-486)", "(P-171)", "(FQ-7)", "their line adds it"; "starts at 5 people applying together" under 6 people |
| Feedback and state | ½ | "Saved." and instant update; no "Not counted yet" for an undecided fee |
| Correct data | ½ | 825 / 775 / 570 right; guessed fee (5), false release warning (9), on_principal pricing (10) |
| Error recovery | ½ | Stale save 409 in words; an invalid answer silently prices as No (6) |
| Accessibility and screen sizes | 1 | axe 0 on the panel, keyboard edit via the dialog, 400–1440 px |
| Speed | ½ | Save 0.1 s; first view over 1 s on the dev server (D15) |
| Visual quality | 1 | Aligned fee table grouped by filing, team look (shots at 1440 and 1024) |
| Trust and sources | 1 | Each line's source and read date; Sample named on the case; Guide 5269 quote matches the saved copy |

**Score: 7/10, no criterion at 0. Below the pass of 8.**

## Fixes that raise the score, most valuable first
1. Undecided "6 months or more" (unanswered or invalid): the person's filing and fees wait, total "so far" (correct
   data, next step, feedback, error recovery).
2. Release warning reads `fees_by_role` (correct data).
3. With `fees_by_role`, a person on someone else's application is not priced, in words (correct data).
4. Case words without decision codes or author terms; "5 people applying for a visitor visa together" (plain words).

## Not tested
A real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); a visible browser (headless
only in this cloud session); 15-minute hostile file and long-text break: no new input field in this change.
