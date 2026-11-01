# Journey test (reviewer): C6.4 document checklist per person, Visitor visa (backend only)

Reviewer role, fresh agent, did not build it. 1 Nov 2026.
* **Scored commit: 9cf262bd** (`git diff 9a03fa6c 9cf262bd`). d70d86a4 only merges main and touches no C6.4 file.
* First walked at fa2fab91. Every journey below was walked again at 9cf262bd.
* Copy: isolated `rev64` on :4466 (`xr_studio_rev64`), fresh database. The API suite released the Visitor visa itself (R2). Stopped after use. Never :4400. US$0, no AI calls.

**No screen.** C6.4 is `GET /api/runtime/cases/:id/checklist`; the case-view screen is "Not built". So the skill's browser, axe, widths and keyboard steps do not apply. I walked the journeys as the case officer through the API, reading only the response. Accessibility and visual quality are scored ½ as "n/a" until the screen exists.

## Journeys (persona: case officer, Visitor visa family case)
1. **Main path.** Open a case, add a spouse and a child, answer the application date and birth dates, then read the checklist. Expected: one list per person; passport and photographs for everyone; birth certificate on the child's list only; police certificate Needed for the adults and Not needed for the 11-year-old; the 6-month rule with IRCC's words and "Sample". **Held:** `check_vv_checklist_api.ts` 28/28 and my own read. Lines come as `lines` / `waiting` / `not_needed` with team state `not_requested` and `stand_in: SI-14`.
2. **Alternate: answers change.** Correct the child's birth date to an adult's. Expected: the police line moves to `lines` on the next read. **Held.**
3. **Empty: nothing answered yet.** Principal alone. Expected: base lines in `lines`; the police line in `waiting`, naming its questions in words. **Held.** One of the two questions is worded "Date the application is (or will be) submitted; reference date for calculated values": that is the library meaning, and it includes jargon.
4. **Error: bad answers.** Application date 2040, birth date 2030. Expected: the answer is saved with a problem and never decides a line. **Held.**
   * 2040 gets "within 5 years of today".
   * 2030 gets "cannot be in the future".
   * The police line goes back to `waiting`, but says "answer … first" for a question that has an answer with a problem.
   * 2200 still gets the older "Enter a real date" message (breaker m9).
5. **Wrong role.** Client → 403. Author → 403. No actor → 403. An officer from another firm (user-S) → 404. Unknown or malformed id → 404. **Held.**
6. **Recovery.** Two reads in a row give identical bodies, and a read stores nothing. A tampered release gets 409 with a plain reason, then the case reads again once the release is restored. **Held** (suite).
7. **Not derived.** A Work permit family case → `derived:false`, "not derived yet. Nothing is guessed." **Held.**
8. **Boundary to C6.5 (uploads).** The police line's `rule` carries months, `before`, quote, https URL, date read and `status: Sample…`. `issuedWithin` handles exactly 6 months, too old and month ends. **Held** (unit 60/60).

## Break it
* Non-English and very long names: fine.
* A representative is refused by the release (422), so the representative holder is untestable on this combination.
* A person not applying gets an empty list.
* Mutation spot-checks at 9cf262bd: 14 of 17 removed rules make a test fail.
  * Three do not: the `render.ts` skip of `document_validity`, the calculated-field-to-inputs mapping, and https-only (http is not tested).
  * See `review.md`.
* Timings: a read takes 43 ms; opening a case takes 125 ms.

## Findings (no Blocker, no Major)
* Minor: the application-date question words come from the library meaning (journey 3).
* Minor: "Not needed: the answers show it is not the case that the person is 18 or older" is a double negative, and it does not name the age or answer that decided it.
* Minor: an answer with a problem gets "answer X first" instead of "the answer to X has a problem" (journey 4). The "check both" wording now covers conflicting dates.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–8; API 28/28, unit 60/60 |
| Next step obvious | 1 | Each line sits in lines / waiting / not_needed with a reason; waiting names its questions |
| Plain words | ½ | Jargon in one question's words, a double negative, "answer first" for an answer with a problem |
| Feedback and state | 1 | `need`, `required`, team `state`, counts, `ages_on_why`, empty release flagged, SI-14 marked |
| Correct data | 1 | Right holder (R3), rejected answers unused (B-M2), trimmed answers read, nothing stored |
| Error recovery | 1 | 409 then recovery; a corrected answer is used on the next read |
| Accessibility and screen sizes | ½ | n/a: no screen in this item; Problem Details errors |
| Speed | 1 | 43 ms per read, one read per view, no request per row |
| Visual quality | ½ | n/a: no screen |
| Trust and sources | 1 | The rule is release data with quote, https URL, date read and Sample status; malformed or duplicate rules are not used |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

Fixes that would raise the score, most valuable first:
1. A short question label for `case.application_date`.
2. Name the age or answer that decided a Not needed line.
3. Say "has a problem" for answers that were dropped.

Not tested: a screen reader, a browser, an intended user's unaided walk (no screen; D17 and D20 stay with the founder), and representative or sponsor holders.
