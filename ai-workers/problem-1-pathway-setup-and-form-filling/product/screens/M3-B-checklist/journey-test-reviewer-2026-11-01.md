# Journey test (reviewer): C6.4 document checklist per person, Visitor visa (backend only)

Reviewer role, fresh agent, did not build it. 1 Nov 2026. Commit **fa2fab91** (branch `claude/serene-euler-vp7ar1`).
Copy: isolated `rev64` on :4466 (`xr_studio_rev64`), released with `setup_visitor_visa.ts` (13/13). Never :4400. US$0, no AI calls.

**No screen.** C6.4 is `GET /api/runtime/cases/:id/checklist` with no page (the case-view screen is "Not built"). So steps 2 and 3 of the skill (visible browser, axe, widths, keyboard) do not apply. I walked the journeys as the case officer through the API, reading only what the response says. Visual quality, accessibility and screen sizes are scored "n/a, ½" below; the screen that shows this list will be scored when it is built.

## Journeys (persona: case officer, Visitor visa family case)
1. **Main path.** Open a case, add a spouse and a child, answer the application date and birth dates, then read the checklist. Expected: one list per person; passport and photographs for everyone; birth certificate on the child's list only; police certificate Needed for the adults and Not needed for the 11-year-old, with the 6-month rule and IRCC's words. **Held** (`check_vv_checklist_api.ts` 26/26, my own read).
2. **Alternate: answers change.** Correct the child's birth date to an adult's. Expected: the police line turns Needed on the next read. **Held.**
3. **Empty: nothing answered yet.** The principal alone. Expected: base lines Needed; the police line is Answer first and names the questions in words. **Held.** It names "Date of birth" and "Date the application is (or will be) submitted; reference date for calculated values". The second is the field's library meaning, which adds jargon ("reference date for calculated values").
4. **Error: bad answers.** Application date 2040 or 2200, a birth date in 2030. Expected: the answer is saved with a problem and never decides a line. **Held.** 2040 gets "within 5 years of today" (the new bound). 2200 gets the older "Enter a real date" (rejected by `realDate`'s year 2100 limit before the new bound applies). 2030 birth date gets "cannot be in the future". The police line goes back to Answer first. The wording still says "answer … first" for a question that *has* an answer with a problem.
5. **Wrong role.** Client user-P → 403. Author user-A → 403. No actor → 403. An officer outside the case's firm (user-S) → 404. Unknown case or bad id → 404. **Held.**
6. **Recovery.** Two reads in a row give identical bodies. Nothing is stored by a read. A tampered release → 409 with a plain reason, then the case reads again once the release is restored. **Held.**
7. **Not derived.** A Work permit family case → `derived:false` with "not derived yet. Nothing is guessed." **Held.**
8. **Boundary to the next item (C6.5 uploads).** The police line carries `rule` {months 6, before `case.application_date`, quote, URL, read 2026-10-29}, and `issuedWithin` is ready for uploads. **Held** in unit tests (exactly 6 months, 30 Apr too old, month ends). Nothing calls it yet, as planned.

## Break it
* Non-English and very long names (a child labelled "Enfant 子供 " × 10): fine, 4 lines on the child's list.
* Adding a representative is refused by the release (422), so it cannot reach the checklist. I could not test a representative holder on the Visitor visa.
* A person stops applying → empty list (checked).
* A released snapshot pointing at another combination → 409 (checked).
* Mutation spot-checks: 8 of 10 removed rules make a test fail (see `review.md`). Two do not: the `render.ts` skip and the calculated-field-to-inputs mapping.
* Timings: a read takes 38 ms; opening a case takes 93 ms (budget: under 1 s for a first view).

## Findings (none Blocker or Major)
* Minor: question words for the application date come from the library meaning and include "reference date for calculated values" (journey 3).
* Minor: "Not needed: the answers show it is not the case that the person is 18 or older" is a double negative. It names the condition, not the answer or the age that decided it, unlike the `each_adult_18_plus` path ("this person is 11 on 2026-11-01").
* Minor: an answer with a problem gives "answer X first" instead of "the answer to X has a problem" (journey 4).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–8 completed; API suite 26/26, unit suite 48/48 |
| Next step obvious | 1 | Every line has a state and a "why"; Answer first names the questions to answer |
| Plain words | ½ | Mostly plain. Jargon in one question's words, a double negative, "answer first" for a question already answered |
| Feedback and state | 1 | Needed / Answer first / Not needed per line, counts per person, `ages_on` and `ages_on_why`, empty release flagged |
| Correct data | 1 | Lines on the right person (R3), rejected answers unused (B-M2), ages on the application date, nothing stored |
| Error recovery | 1 | 409 then recovery; a bad answer goes back to Answer first; a corrected answer is used again |
| Accessibility and screen sizes | ½ | n/a: no screen in this item. Problem Details with plain detail text |
| Speed | 1 | 38 ms per read, one read per view, no request per row |
| Visual quality | ½ | n/a: no screen |
| Trust and sources | 1 | The rule carries the IRCC quote, URL and date read; Sample stated in `basis`; the rule is release data, not code |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

Fixes that would raise it, most valuable first:
1. Use the placement's question words, or a short field label, for `case.application_date`.
2. Say which answer or age decided a Not needed line.
3. Say "has a problem" for answers that were dropped.

Not tested: a real screen reader, a browser or an intended user's unaided walk (no screen; D17 and D20 stay with the founder), and representative or sponsor holders (the Visitor visa release refuses them).
