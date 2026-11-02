# Journey test: G4 part 1 (C5.7), reviewer, 2 Nov 2026 (commit ea426ad4)

Isolated copy `forms_g4r` on :4451 (never :4400); live AI off; US$0. Part 1 has no screen, so these journeys were walked through the API, as the people would act through it. No browser, axe or widths: part 2 adds the Tests tab. Evidence: the `tests/check_g4_answer_keys.ts` runs (57/57, three times) and the live probes below (curl and psql on :4451).

## Journeys (main path first)
1. **Author writes a family.** The author posts E1's household (`samples/answer-key-families.json`). Result: 201, the family reads Sample, version 1.
2. **Expert enters the IMM 5257 key.** The expert enters the expected values. Result: 201, Draft, Sample, Not run.
3. **Author runs it.** Result: 200 PASSED with 66 lines, one per value. Failures come first in the list.
4. **Expert signs.** Result: 200 Signed, no longer Sample, signed by "Content reviewer", the last run still Passed.
5. **Alternate: a signed key changed with a reason.** The key returns to Draft and the run to Not run. The re-run fails on the box that was left out, naming it ("written, not expected").
6. **Alternate: the family changes.** The author corrects the husband's given name. The signed key goes to Draft ("Family changed: …") and the run to Not run. The re-run shows expected FATHER, got PAPA.
7. **Staleness across the screen boundary.** The author relabels an eligibility gate in the draft (C6.9). The rule-set key goes from PASSED to NOT_RUN, "Not run since the item changed".
8. **Error.** Each of these is refused 400 on its field (Problem Details):
   * an impossible date (2026-02-30);
   * a box that is not on the map;
   * a signature box;
   * a family name of 125 non-English characters;
   * `[1,2]` sent as the body;
   * a scoring key, which gets the words "No scoring tables…".
9. **Wrong role.**
   * The case officer and Client A get 403. Nobody gets 401.
   * The approver reads (200), but gets 403 on family write, run and sign.
   * The expert gets 403 on family write. The author gets 403 on sign.
10. **Recovery.**
   * Stale saves get 409 naming who saved last.
   * Two signs at once: one 200, one 409.
   * Four creates of the same family at once: one 201, three refused, no duplicate.
   * Demo reset removes families, keys and runs (0/0/0).
   * An unknown or malformed id gets 404.

## Data underneath
* After a run, `answer_key_run` holds one row with the key version, both fingerprints, every line and the counts.
* Audit lines name the family key, the item and the counts, never a value (checked by the suite).
* `answer_key` state, `signed_by_user_id` and `signed_at` move together: a CHECK in the database enforces it.

## Break it
* **Minor:** a key update without `edition` silently re-targets the key to the current map edition (`engine/answer-keys.ts:146`).
* **Minor:** the family save reads its signed-key count outside the transaction (`api/src/answer-keys.ts:93-95`), so a key signed in between can return to Draft with an empty reason.
* **Minor:** a line's label is the raw caption ("YYYY" for the date-of-birth year).
* No Blocker or Major found.

## Score (0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–4: family → key → run 66/66 → signed |
| Next step obvious | 1 | Each refusal says what to do ("Reload their version, then make your change again"; "add it to the key or fix the map") |
| Plain words | ½ | The messages are plain, but line labels are raw captions ("YYYY") |
| Feedback and state | 1 | Draft/Signed, Sample, and Passed/Failed/Not run, each with its why |
| Correct data | ½ | Values exact, one row per action, audit present; but the edition is re-targeted silently on update |
| Error recovery | 1 | 400 on the field, 409 naming who saved last, races hold |
| Accessibility and screen sizes | ½ | Not applicable until part 2 (no screen). Scored neutral, not 0 |
| Speed | 1 | Run 95–140 ms, list 90 ms, against a budget of 1 s |
| Visual quality | ½ | Not applicable until part 2. Scored neutral |
| Trust and sources | 1 | Sample until signed (P-240), E1's provenance stated, the 16 amendments printed and pinned, no AI |

**Score: 8/10. Pass** (8 or more, no 0).

What would raise it, most valuable first:
1. Keep the stored edition when an update leaves it out.
2. Give each line a plain box name in part 2.
3. Run the part 2 screen under axe at 400, 1024 and 1440 px.

## Not tested
* A real screen reader and the browser criteria: no screen yet.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* G2's use of signed keys: not built.
