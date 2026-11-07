# B152 journey test: reviewer, 2026-11-07

Commit 557bfbbb0. Isolated copy `rev_b152` on :4445, configured checkpoint loaded, live AI off, US$0. The row changes no screen, so the journeys go through the API and the existing case page. This is the one journey score for this check.

## Journeys
1. **Main path (case officer).** "The fees we filed stay what we filed." A principal (40) and a child two days short of 14 are made Ready to file and recorded. Then the date moves (the child's DOB moves 3 days earlier). Expected: the recorded group still shows CAD 285, with biometrics CAD 85 and the child exempt. **Held:** `/prepare` gave 285 with `fees_recorded.at`, and the case page showed "Total for this submission: CAD 285" with "Recorded · read-only" (screenshots `b152-group-1440.png` and `b152-group-1024.png`, kept in the reviewer's scratchpad and not committed).
2. **Alternate: an unrecorded case with the same move.** It is priced again, CAD 85 → 170 for biometrics (the B152 test's control). **Held.**
3. **Old data.** A group recorded before the migration (`recorded_fees` SQL NULL or JSON `null`) is read as today, with no error (CAD 370). **Held.**
4. **Error: refused records.** Duplicate application numbers (400), a stale version (409) and a client actor (403) each leave no snapshot. **Held.**
5. **Recovery: double click and race.** Three records at once give `[200, 409, 409]`, one snapshot, two filing records and one audit line. **Held.**
6. **Wrong role.** A client reads `/prepare` and gets 403 (the B152 test). **Held.**
7. **Across the boundary.** Split after recording gives 409. The DOB change opens two "Filed with an earlier value" tasks (C8.2). **Held.** The same response shows the child aged 14 with a "Give biometrics" step, which contradicts the frozen "Under 14" line (review m1). `GET …/filings` says CAD 370 (review m2).

8. **Break-it: a child with no date of birth** (re-check of the breaker's M2). Both filings reach Ready to file with no blocks, and the record returns 200 with the child's biometrics `waiting` in the snapshot. After the DOB is answered (age 15), the group still reads "Total so far: CAD 285" with the line waiting, for good; the right amount is CAD 370. **Major (review M1).**
9. **Break-it: record and DOB move at the same moment** (re-check of the breaker's M3). 3 of 3 tries returned 200 and 200. The frozen line says "Under 14"; the filed facts hold the moved DOB (14). **Major (review M2).**

## Checks replayed
`check_b152_recorded_fees_api.ts` 11/11 · `C8.2.test.ts` 17/17 · `C6.12.test.ts` 24/24 · on fresh copies, `check_c82_filing_record_api.ts` 24/24 and `check_vv_prepare_api.ts` 40/40. On the case page, axe (WCAG 2.2 A/AA, submission group) found no violations at 1440, 1024 and 720 px ×2 (200 % zoom), with no sideways scroll and no console or page errors. Load took 2.0 s cold, then 0.9–1.0 s.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1: CAD 285 kept after the move |
| Next step obvious | 1 | Recorded group reads "Recorded · read-only"; nothing new to do |
| Plain words | ½ | The basis sentence says "age as at today (FQ-7)" above frozen amounts (m3) |
| Feedback and state | ½ | Frozen and live amounts look the same; `fees_recorded.at` is not shown (m3) |
| Correct data | 0 | A waiting fee is frozen partial for good, and an answer race freezes money that contradicts the filed facts (journeys 8 and 9) |
| Error recovery | ½ | Refusals leave nothing (journeys 4 and 5), but recording is not refused while a fee waits, and nothing recovers it after (journey 8) |
| Accessibility and screen sizes | 1 | axe none; 1440, 1024 and 200 % with no sideways scroll |
| Speed | 1 | No added query; warm load under 1 s |
| Visual quality | 1 | Unchanged fee block (screenshots) |
| Trust and sources | 1 | Lines keep their IRCC sources and dates in the snapshot |
| **Total** | **7.5 / 10** | Below the pass (under 8, and correct data is 0) |

Fixes that would raise it, most valuable first: (0) refuse to record while a fee line waits, and check the answers under the record's lock (review M1, M2); (1) read the age-dependent items and the age shown on a recorded filing as recorded (m1); (2) on a recorded group, show "Fees as recorded on <date>" instead of "age as at today" (m3, B151); (3) make `/filings` read the snapshot (m2).

Not tested: a real screen reader, keyboard-only use (no new control), a real calendar move (there is no server clock), and an intended user's unaided walk (D17 and D20 stay with the founder).
