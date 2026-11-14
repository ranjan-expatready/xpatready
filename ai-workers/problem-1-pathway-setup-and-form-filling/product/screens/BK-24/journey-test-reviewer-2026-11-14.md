# BK-24 journey test, reviewer role, 14 Nov 2026

Commit `a1044a8e7` on the builder's isolated copy :4453 / `xr_studio_forms_bk24` (never :4400). This is a data and test row with no new screen. The journeys were walked by reading the generated files, the database, our XFA engine's run of IRCC's own Validate and the builder's screenshots. Walked in no browser.

## Journeys
1. **Main path.** Case officer: "the spouse's IMM 1295 answers question 7". Generate the spouse's copy (BK-13 replay), download it, read q7.
   * Expected: country and status written.
   * Got: `205` (India) and `01` (Citizen); q8 A `N`.
   * Held.
2. **Alternate.** The same case, the student's IMM 1294 and the child's IMM 5257: are the boxes IRCC's Validate requires written?
   * IMM 5257 (child): our engine's run of IRCC's Validate passes.
   * IMM 1294: our engine cannot read the form, so only the flagged boxes are checked.
3. **Error.** A copy with q7 emptied (as BK-20 found it).
   * Caught: the box is open, and Validate stops at "7. Current country or territory of residence".
   * Held.
4. **Next step across the boundary.** After q7, does the spouse's IMM 1295 get through IRCC's Validate?
   * It stops at employment row 1 (F3, named).
   * With F3 filled in a scratch copy, it stops at background 2c, then background 6, then the consent (F2).
   * 2c and 6 are not named anywhere (review M1).
   * The student's IMM 1294 has the same two boxes empty.
5. **Recovery.** Re-run the replay on the same copy.
   * BK-13 gives 41/43: answers already given (409 stale answer). This existed before this diff.
   * The BK-24 check is stable on re-run (21/21 twice).
6. **Trust.** An RCIC opens IMM 1295's field map.
   * q7–q8 show as a person's decision (origin HUMAN, the author's name), with no "sample loader" in the reason and no audit line (review M2).

## Data underneath
* `form_field_map`: 19 rows corrected; their keys and steps match IMM 1294 and IMM 5257.
* Library keys exist and are PUBLISHED.
* `person.residence_country` is still read by IMM 5532 and IMM 5669 (unchanged, as intended).

## Break it (short)
* Running the loader step twice refuses every corrected box (review m1).
* OWP with a job title only: the duties box is not flagged, while IRCC's script requires it (review m2).
* Stale screenshot (review m3).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | q7 is written; the form still fails IRCC's Validate at F3, then 2c and 6 |
| Next step obvious | ½ | The case page lists flagged empties; 2c and 6 appear nowhere |
| Plain words | 1 | GAP lines and the case page's words are plain |
| Feedback and state | ½ | The screenshot shows the old mandatory list (m3) |
| Correct data | 1 | q7 and q8 A read back correctly from the file |
| Error recovery | ½ | Refusals in words exist; a second loader run refuses wrongly (m1) |
| Accessibility and screen sizes | ½ | No UI change; nothing walked at 400/1024 px or by keyboard |
| Speed | 1 | Check 13 s; generation within budget per BK-13 |
| Visual quality | 1 | Screenshots at 1440 px in the team look |
| Trust and sources | ½ | Cite verified by SHA and script text; loader edit shown as a person's (M2) |

**Score: 7/10, no 0. Below the bar (8).** Fixes, most valuable first:
1. Run Validate past the known GAP stops, and name or fix 2c and 6 on IMM 1294 and IMM 1295 (raises task completed and next step).
2. Mark the box corrections as the sample loader's and audit them (raises trust).
3. Take the screenshot again after a restart (raises feedback).
4. Swap the order of the two tests in 040 (raises recovery).

Could not test: a fresh copy (copy cap of 4 reached); Adobe's own Validate; a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder).
