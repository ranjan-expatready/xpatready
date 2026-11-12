# QA-402 journey test (reviewer), 11 Nov 2026, at f798e79d2219f686e31514404c2048012b553e32

* **Setup:** isolated copy rv_q402 on :4493, configured checkpoint, live off, US$0. The builder's check_qa402 ran first (Other released as v3); then my Playwright walk ran headless in system Chrome.
* **Where the evidence is:** the script and screenshots are in the reviewer's scratchpad, not committed (`walk/rv_qa402_walk.mts`, `walk/shots/`).
* **Score: 9/10.** The pass bar is met, but M1 in `review.md` blocks.

## Journeys
1. **J1, main path (author, by keyboard).** On the field page "Visit purpose other", the condition reads "Visit purpose is Other". The author types the value, tabs to "Save placement as draft" and presses Enter (save 32–443 ms).
   * On Review and release there is no held warning, no "Hiding" refusal and no panel. The page shows "0 draft changes", the same as released v3.
   * Database: `section_question` v3 DRAFT has `{op eq, case.visit_purpose, "Other", subjectKind EACH_APPLICANT}`, SHOW.
   * **Held.**
2. **J2, alternate (author sets "Business" by mouse).** This gives one warning, not an error. It reads: "IMM 5257 reads its answer only when the purpose of the visit is Other (the form's own condition). To use the condition here, make it the same as the form's own condition: show the question only when the form writes its answer." It has no field code.
   * **Then the panel "Form fields that read this answer: No form reads this answer." is shown under it. This contradicts the warning: FAIL (M1).**
   * Screenshots: `j2-business-review-1440.png`, `j2-business-review-1024.png`.
3. **J2→J1, recovery.** Setting Other again clears the warning and the panel. **Held.**
4. **J3, wrong role.** Placement save is refused with 403 for the content reviewer ("does not hold the author duty") and for the client. **Held.**
5. **J4, client on a new case of release 3.** The case starts with the purpose unanswered.
   * Unanswered: the follow-up is not on the client's part "Details of visit to Canada". The routes carry it with `hidden: true`, and why is "Asked only when the visit purpose is Other (waiting for …)".
     * My route assertion counted presence as "asked", so it logged FAIL. That is my error, not a product fault.
     * The same weakness is in the builder's helper (m2).
   * The client chooses Other in the purpose select and saves (126 ms). The part shows the follow-up; both views give `hidden: false`, "read by IMM 5257 (1 form field)".
   * The client chooses Business and saves. The follow-up is gone, and the routes no longer list it.
   * **Held.**
6. **J5, officer.** I checked through the routes only (agent view, as above). The officer's hidden line reads "Not asked now: a rule hides it." (`questionnaire.tsx:890`), with no code. My screenshot text grep found nothing usable, so this step is not proven by screen.

## Break-it (short)
* Changing the value back and forth (Other → Business → Other) leaves no stray draft.
* After Other → Business on a case, the earlier answer is "kept and not used", and the gate leaves the box empty.
* No console or page errors (author and client).
* I did not do the two-tab save or long or non-English text: the change touches no input handling.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 in force, J4 asked only with Other |
| Next step obvious | ½ | J2: the warning says what to do, but the panel under it says no form reads the answer |
| Plain words | ½ | The warning is plain and code-free; the panel words are wrong for a gated reader (M1) |
| Feedback and state | 1 | "Saved", draft change count, "1 draft change" / "0 draft changes" |
| Correct data | 1 | DB rows, release v3 placement, `hidden` flags, box count |
| Error recovery | 1 | Business → Other clears the warning; the client's change of purpose reverses |
| Accessibility and screen sizes | 1 | axe WCAG 2.2 AA clean (Review and release, way-out panel, client part); no sideways scroll at 1440, 1024 and 400; keyboard save |
| Speed | 1 | Saves 32–443 ms, client save 126 ms. Review page 1.9–2.5 s is pre-existing and not the catalogue budget |
| Visual quality | 1 | Team look unchanged; the warning sits with the other warnings |
| Trust and sources | 1 | The reason quotes the form's own cited condition (B107 data) |

**Fixes that raise the score:** M1. Do not show the "No form reads this answer" panel under a warning whose reasons are all gated forms, or give that panel the form's own words.

**Could not test:** a real screen reader; an intended user walking unaided (D17/D20 stay with the founder); the officer's screen by sight.
