# BK-25 journey test: reviewer, 14 Nov 2026 (PR #1747, commit 775440da2)

The copy was the isolated `rev_walk` on :4480: a fresh database, with the configured checkpoint and the Study permit Sample family made by `check_bk13_zero_code_run.ts` (45/45). Chromium was headless, run from Playwright (`/opt/pw-browsers/chromium`), with axe-core 4 tags wcag2a/2aa/21a/21aa/22aa. The script was run twice; it is in the reviewer's scratchpad, not committed. The copy was stopped afterwards. US$0, live AI off, never :4400.

## Journeys (written from the row and PRODUCT §1 before the walk)
1. **Main path. Case officer:** "I want to see that the family's background, consent, the spouse's job and the marriage question are answered, and that the spouse's form is complete." Open the case, then the Student A tab, then the Spouse tab, then Prepare application.
2. **Alternate. Case officer:** change an answer on a BK-25 row by keyboard (Tab to Edit, Enter, Escape).
3. **Error. Author, through the door:** ask the spouse row about the wrong person, with a bad person value, or about no person.
4. **Wrong role:** the case officer tries the author's door.
5. **Recovery:** undo the spouse-row ask and ask again.
6. **Across the boundary:** the file IRCC's Validate reads, via BK-24's check reading the generated PDFs.

## What happened
- **J1, done at 1440, 1024 and 400 px (every check passed, both runs).**
  - The Student A tab shows "Whether the person was physically present at their own marriage ceremony (IMM 5707 (01-2023), Section A: …)", Yes, Confirmed, "fills IMM 5707 for 2 people". It also shows consent No (Confirmed), previously applied No, and ill treatment No.
  - The Spouse tab shows the same four, plus Employment entry 1: SAMPLE TRADING COMPANY, Jul 2018, MUMBAI, India, and CLERK.
  - Prepare application: IMM 1295 for the spouse has no "mandatory form field left empty" badge. IMM 1294 for the student still shows "1 mandatory form field left empty" and "CRITICAL: … City/Town: no question asks it yet: nothing in this release fills it" (F1).
  - Screenshots: `shots/rev-spouse-1440.png`, `rev-spouse-1024.png`, `rev-spouse-400.png` in the scratchpad. The builder's `bk25-officer-marriage-question-1440.png` matches what I saw.
- **J2:** Tab reached an Edit on the Spouse tab. Enter opened the "Change: Activity or occupation…" dialog with CLERK and Now: "CLERK (Confirmed by the officer)", Cancel and Save. Escape closed it. One wrong turn in my script: `.last()` picked the job row's Edit, not the marriage row's.
- **J3:**
  - `person: "subject_child"` gives 409: "This form field's row is about subject_spouse_or_partner, not subject_child…" (good).
  - `person: "form_subject"` gives 400 (good).
  - **No `person` gives 200, and the spouse row is mapped to `form_subject`** (Major M3 in review.md: the applicant's answer would fill "My spouse was…").
- **J4:** the case officer gets 403, "does not hold the author duty" (good).
- **J5:** undo answered 200 and the row went back to `by_hand` with person null (a DRAFT over the released row). The re-ask with the right person answered 200.
- **J6 (BK-24's check on its own fresh copy):** 28/28. The student's IMM 1294 reads 2c, 6 and consent as N. The spouse's IMM 1295 reads the same, plus employment row 1. IMM 5707 has 41 of 41 rows written for each person. IMM 1295's own Validate completes. One GAP: F1.

## Data underneath
`client_canonical_answer` on the walk copy, for the walk case's two subjects:
- `present_at_marriage_ceremony` is true and VERIFIED for both.
- The spouse's 2c and Q6 are VERIFIED.
- The student's 2c and Q6 are DECLARED through `client_reconfirm` (the background-answer rule, P-412 F11, as on main).

Each answer is one current row. No other row changed. Refusals wrote nothing (the map rows were checked after each call).

## Break it (15 min)
- Covered: wrong person, bad person format, no person (M3), wrong role, undo then re-ask.
- Reader scan: the statement allowance takes a cut-off Background Q5 heading on IMM 1294, 1295 and 5257 (M2).
- Not tried: two tabs saving the same row, a hostile file. Neither is touched by this row's change; the door's locks are unchanged.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Every BK-25 answer is shown and written. IMM 1294 still has a CRITICAL empty mandatory box (F1). |
| Next step obvious | ½ | For F1 the only action is "Pass with a reason…"; the officer cannot fix it. |
| Plain words | ½ | The officer reads the field's meaning with citations in brackets ("(IMM 5707 (01-2023), Section A: …)") rather than the form's question. |
| Feedback and state | 1 | Confirmed and Declared chips, "fills IMM 5707 for 2 people", counts per section. |
| Correct data | ½ | Correct for this family (read from the PDFs). The door accepts the spouse row mapped to the applicant (M3). |
| Error recovery | 1 | Undo restores. Refusals are in words (409, 400, 403). |
| Accessibility and screen sizes | 1 | axe 0 violations at 1440 and 400 px. No sideways scroll at 400, 1024 and 1440 px. Keyboard reaches Edit, Enter opens and Escape closes. |
| Speed | ½ | The case page settled in about 2.6–3.0 s (3.6–4.0 s measured, which includes 1 s of fixed wait). Tab switch under 0.2 s. |
| Visual quality | 1 | Team components. The 400 px layout stacks cleanly. |
| Trust and sources | 1 | Each asked row cites the edition and the saved official file. People are labelled Sample. No AI. |

**7.5/10: below the pass mark of 8 (no criterion at 0).**

Fixes that would raise the score, most valuable first:
1. F1 closed, or split by the tech lead, so IMM 1294 has no CRITICAL empty box (task completed, next step).
2. M3's check on the row's person (correct data).
3. Show the form's question words, not the field meaning, on the officer's row (plain words; this follows main's pattern, so a Should).
4. Get the case page under budget (speed).

## Not tested
A real screen reader, 200 % zoom, Adobe's own Validate (the Mac run, BK-20), and an intended user's unaided walk (D17 and D20 stay with the founder).
