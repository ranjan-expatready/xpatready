# Journey test: QA-194 (C4.7 PQR picks, C4.11 conditions), reviewer, 3 Nov 2026

Code: `claude/forms-twins`. The first walk was at 6d83353e and dc31958e (same engine; dc31958e changes only a test). **J1, J2, J4 and J5 were walked again at 4602767d; the score below is for 4602767d.** Copy: isolated `forms_qa194rev` on :4457. Visitor visa was set up by `tests/runtime/setup_visitor_visa.ts` (13/13 checks pass). Saved runs only, US$0, no `STUDIO_*_LIVE`.
Browser: Playwright Chromium, headless, script in the reviewer's scratch folder. It uses only what a person sees, plus one SQL read to find the combination id. Screenshots are in the scratch folder: 1-plan-1024, 2-result-1024, 3-result-400, 4-review-1440, 5-funds-panel-1440.

## Journeys
1. **Main path.** Persona: content publisher (author). Goal: "Let AI suggest which questions a prospect is asked first, and keep only real ones." Steps: Visitor visa → Smart questionnaire (SQR) → Prospect questionnaire (PQR) view → "Draft Prospect questionnaire (PQR) picks" (opened with the keyboard) → Saved is preselected, "Cost: US$0 (no AI call)" → Draft → read the result → Open To review. Expected: picks that name one question land, twins are left out naming both, and nothing is guessed.
2. **Twins (error path).** Same persona. The AI wrote "Purpose of visit" and "Criminal record". Expected: both are left out, with every candidate named.
3. **Words match (trust).** Open the Funds item on To review. Expected: it waits at Check, says what the AI wrote, and the "taken as" line is true.
4. **The four tech-lead examples, below the screen** (engine probe on the real Visitor visa questions). "Intended stay dates", "Intended stay", "Purpose of visit" and "Previous residence" should each give no match, naming the twins.
5. **Break it** (engine probe): "Relationship to applicant", "Intended stay to Canada", and "Have national identity document" (4 holders).

## What happened
* **J1.** The Draft dialog opened by Enter. Saved was chosen with US$0. The draft took 210–862 ms. The result said "6 picks for To review, 13 left out with the reason", and the counts read "Ready to accept 0 · Check 4 · Decide 2 · Saved, US$0", announced as a status. To review lists 6 picks in plain words: funds, both "accompany" picks, health, citizenship, criminal history. No keys are shown. There are no page errors. axe (WCAG 2.2 A/AA) finds nothing on the result state, and there is no sideways scroll at 1024 or 400 px.
* **J2.** "Purpose of visit" appears twice and "Criminal record" once, each as "could be 2 questions of this person (…both named…), so it is not guessed: pick it by hand". The reasons are true. The line does not say *where* to pick by hand. That wording was there before this change, but the person now meets it 3 more times.
* **J3.** The Funds item shows "Both readings pick it, in the AI's own words … Check it is this question" and the rule line "named exactly: Failed — The AI wrote 'Funds available for stay'; taken as 'Funds available for the stay, in Canadian dollars': every word of it is there and no other question of this person has them all." It is true for the search done.
* **J4.** All four examples give none. "Previous residence" has 5 holders, and the reason line a person reads would name only country, start date and status "and 2 more". The end date, the twin at the heart of QA-194, is hidden (review M2).
* **J5.** "Relationship to applicant" now lands on "Relationship of the person or institution to be visited to the traveller". On main it gave none. The only thing that decides it is the filler "to". "Intended stay to Canada" lands on the end date. This is review M1. The national-identity decider hides its 4th holder behind "and 1 more" (M2).
* **Data underneath.** No item is Ready. Every pick that matched by words carries `named_exactly: failed`. Both packs ran at US$0 (C4.7 "US$0 so far": PASS). The C4.7 pack still expects the old counts (review B1).

## Re-walk at 4602767d (fresh copy, same script)
* **J1.** Saved is chosen at US$0. The draft takes 325 ms. The result reads "6 picks for To review, 13 left out", with counts Check 4 and Decide 2. axe finds nothing, there is no sideways scroll at 1024 or 400 px, and there are no page errors.
* **J2.** The "Purpose of visit" lines (both readings) and the "Criminal record" line each name both candidates.
* **J4.** The engine probe on the real questions gives none for all four examples, with every holder named, including all 5 for "Previous residence".
* **J5.** "Relationship to applicant" now gives none with 3 named (as on main). "Intended stay to Canada" and "Intended stay to date" give none, naming both days. The national-identity decider names all 4.
* **Data.** The C4.7 pack scores 17/17 and the saved-run suite 23/23. No pick is Ready, and every words-match is at Check or Decide.

## Score at 4602767d (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | The picks land and the twins are left out. "Purpose of the visit" must be ticked by hand, which is right under the rule. |
| Next step obvious | ½ | "Open To review" is clear. "Pick it by hand" (existing wording) does not say where. |
| Plain words | 1 | Every candidate is named in plain labels, with no keys. |
| Feedback and state | 1 | Counts by band, "Left out (13)", status role. |
| Correct data | 1 | No guess on the four examples or the filler-"to" probes. The pack and suite are green. |
| Error recovery | ½ | Reload, double click and Stop were not walked again; `check_forms_c47_pqr_picks` covers them (60/60, builder's run). |
| Accessibility and screen sizes | 1 | axe finds nothing; keyboard opens the dialog; 1024 and 400 px fit. |
| Speed | 1 | The draft takes 325 ms. |
| Visual quality | 1 | Team dialog. The Left out list scrolls inside it. |
| Trust and sources | 1 | AI marked, both readings shown, IRCC's sentence found, a true "taken as" line. |
| **Total** | **8.5 / 10** | **Pass (8 or more, no criterion at 0)** |

Earlier score, at 6d83353e and dc31958e: **7.5 / 10**. It lost marks on correct data (a filler "to" decided a match) and on plain words ("and 2 more" hid a twin). Both are fixed.

Fix that would raise the score further: the existing "pick it by hand" line could say where to pick. It is noted only; this PR does not have to do it.
## Not tested
* A real screen reader, 200 % zoom, and an intended user's unaided walk. D17 and D20 stay with the founder.
* Two tabs drafting at once, which was not re-walked. It is covered by `check_forms_c47_pqr_picks.ts` on main.
