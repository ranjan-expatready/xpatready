# Journey test (reviewer): C3.6 "Add the fact this rule needs", round 3, commit add03ae4

Reviewer agent (did not build it). Isolated copy `rev_c36r3` on :4456 (sample inputs loaded by the item's check, stopped after); :4400 not touched; no model calls (US$0). Scripts: `/tmp/rev_c36r3/` (outside the repo).

## Journeys
1. **Main (author, keyboard, 1024 px):**
   * Path: Questionnaires › "Add a fact a rule needs" › name the rule › fill the fields › Propose.
   * Result: the done line reads "Proposed (key person.… when accepted as it stands)", and focus moves to "Open Proposals". Held.
2. **Exact library name** ("Country of birth"):
   * Result: 409, "already the library field person.country_of_birth, used in With an LMIA"; focus moves to the message. Held.
3. **Near duplicate** ("Country of birth abroad"):
   * Result: refused as close to "Country Of Birth", and focus moves to the reason field.
   * With a reason: proposed; axe shows 0 violations. Held.
4. **One-word name inside** ("Name of the visa officer"):
   * Result: proposed with no false "close" flag. Held (m1 fixed).
5. **Approver edits at accept** (name and subject changed to sponsor):
   * Result: landed as `sponsor.sponsor_earlier_refusal`. Held (MA1 fixed; builder's check, re-run).
6. **Two names, one key** ("Résumé gap" and "Resume gap"):
   * Result: both land, as `person.resume_gap` and `person.resume_gap_2`. Held.
7. **Approver edits to a live field's name:**
   * Result: a clean 409 "already in the library as person.country_of_birth". Held.
8. **Same name on two combinations at once:**
   * Result: 201 and 409; one waiting item. Held (MA2 fixed).
9. **Draft rule reading an unknown fact** (P-223 a):
   * The save gives 201.
   * The fact is listed under Facts a rule needs.
   * Preview gives "cannot tell", missing person.zz_unknown.
   * The problem list shows a release-blocking error. Held.
10. **Rule reading a retired field:**
    * The save gives 201 and the fact is listed as needed. Add gives 201.
    * The accept gives 409 "already in the library (added since it was proposed)". That is untrue, and the item never lands. **Dead end (MA3).**

## Automated and data
* `check_forms_c36_rule_facts.ts` on my copy: 41/41.
* Each landing was checked through the API response and SQL: one row with the decided name and subject; an ADD waits for a second person.
* Console: only the expected 409/400 of the refusals.
* Answers come in well under 1 s.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 3–6 and 8–9 complete through the product |
| Next step obvious | 1 | Done line plus focused "Open Proposals"; refusals say what to do |
| Plain words | ½ | MA3's 409 is untrue; elsewhere plain |
| Feedback and state | 1 | "when accepted as it stands" is honest about the preview key |
| Correct data | 1 | Keys are built at landing from the decided item; no duplicate waiting items |
| Error recovery | ½ | The retired-field route is a dead end (MA3) |
| Accessibility and sizes | 1 | Focus to the message or reason field; axe clean |
| Speed | 1 | Under a second |
| Visual quality | ½ | Long, ungrouped rule select (m3, open by choice) |
| Trust and sources | 1 | Sample, not meaning-checked, "Needed by Rule …", second person |

**8.5/10, pass (no 0).** Raise it by fixing MA3 (refuse a retired key at add, naming the restore; correct the lander's message), then m3.

## Could not test
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); 400 px and 200 % zoom were not re-walked this round (unchanged layout since round 2).
