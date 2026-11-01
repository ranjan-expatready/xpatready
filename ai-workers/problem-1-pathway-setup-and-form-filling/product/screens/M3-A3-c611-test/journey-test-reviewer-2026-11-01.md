# Journey test (reviewer), M3-A3: C6.11 acceptance test adopted on the built routes, 1 Nov 2026

Commit `223ae94ef39ba2ab67f9b6dc9d71a57b38a4e780`. Isolated copy `rev_c611` on :4439 (never :4400). Sample data. US$0.

This change touches only tests: there is no new page. I walked the journeys through the API, acting as each role. The test does the same. There was no visible browser walk, because this container has no Playwright browser. The C6.11 screen itself was walked at #288 (`screens/M3-A-c611/journey-test-reviewer-2026-11-01.md`).

## Journeys
1. **Main path.** The firm admin (user-R) opens a family Visitor visa case with a representative of record and a case officer, then sees the team with names, licence and SI-9. **Held** (C6.11-7, -8).
2. **Alternate.** The firm admin opens a case without naming a representative, and the firm's default representative is used. **Held** (-5, as built).
3. **Reassign.** The firm admin adds the second representative as a case officer, then takes the first case officer off with a reason. The history keeps both rows. **Held** (-11, -12). "Who" is only checked for presence (review m2).
4. **Change the representative.** The new representative replaces the old one. The team says a new IMM 5476 is needed and names the earlier representative. The audit line is written. **Held** (-17). The IMM 5476 item and the out-of-date mark are PENDING (-17a).
5. **Error.** These are all refused with plain words and the field named:
   * an unlicensed representative at Open a case (400 `representative`);
   * another firm's representative (422 `userId`);
   * no reason given (400).

   **Held** (-6, -16b, -10).
6. **Wrong role.**
   * The case officer cannot assign or end team members (403, 403).
   * The client and the configuration author cannot change the team (403, 403).
   * The client cannot list firms (403).

   **Held** (-9, -14, -4).
7. **Recovery.** A change made from a stale view is refused with 409 and changes nothing (-13). Three reruns all gave 22/22. **Held.**
8. **Across the boundary.** The solo firm opens its own case, and the Sample firm gets 404 on it. The IMM 5476 deliverables (C6.12's `/prepare`) are not built yet. **Held** (-19, -19a); the deliverables part is PENDING (-15).

## Data underneath
SQL checks that the case has exactly one current LEAD_REPRESENTATIVE row (-8, -18) and that the earlier assignment is ended, not deleted (-12). The audit line `representative_changed … a new IMM 5476 is needed` is present (-17). R1a passed 99/99 on the same copy afterwards.

## Break-it (short)
* Ran the test again on the same copy: 22/22, because references are unique per run.
* Ran R1a with its reset after C6.11: 99/99.
* Probed for checks that can pass without proving anything (the review, section 3):
  * **Major M1**: the PENDING condition is "no IMM 5476 item", so a future bug that drops the item reads as PENDING and the run stays green.
  * Minor: C6.11-3a and C6.11-5 can pass when their inputs are empty.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | 22/22, three runs |
| Next step obvious | ½ | Not walked in a browser here |
| Plain words | 1 | Refusals read "… is not a licensed representative …" and "That person is not in your firm." |
| Feedback and state | 1 | Problem Details name the field (`representative`, `userId`, `reason`) |
| Correct data | 1 | SQL checks of one representative, ended rows and the audit line |
| Error recovery | 1 | 409 on a stale change, and nothing changes |
| Accessibility and screen sizes | ½ | Not walkable (no browser); covered at #288 |
| Speed | ½ | Not timed against the STANDARDS §9 budgets; each run took a few seconds |
| Visual quality | ½ | No UI in this change; not walked |
| Trust and sources | ½ | SI-9 is shown; the "source Firm" proof (-16c) is deferred unconditionally |

**Score: 7.5 / 10, below the pass bar of 8, and no criterion is at 0.**

The low scores come from criteria I could not walk here or from the deferred proof, not from defects found in this change. To raise them, most valuable first:
1. Fix M1 and make -16c conditional on its dependency (raises trust and sources).
2. Run `check_c611_team_browser.cjs` on a copy that has Chromium (raises next step, accessibility and visual quality).
3. Time each step against the §9 budgets (raises speed).

## Not tested
* A real screen reader.
* A visible browser walk.
* An intended user's unaided walk (D17 and D20 stay with the founder).
