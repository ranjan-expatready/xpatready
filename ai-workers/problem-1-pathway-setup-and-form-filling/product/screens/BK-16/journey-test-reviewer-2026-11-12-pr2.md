# BK-16 PR 2 (#1632): journey test (reviewer, 12 Nov 2026)

Commit 452c5e8a0. Configured checkpoint loaded on fresh isolated copies (:4457 walk, :4459 probes; base comparison on :4456 and :4458), headless Chromium with Playwright and axe-core, live AI off, US$0.
Setup through the API: a family of four (student, spouse, Child S, Child V) and their dates of birth, so the walk could start on the decision. The decisions were walked in the browser as Client B and as the case officer.
Screenshots are in the reviewer's scratchpad (not committed): r01-caregiver, r02-intended-work, r03-spouse-gender, r04-childS-question-1440, r05-childV-question-1024, r06-case-1440, r07-case-1024.

## Journeys
1. **Client, main path:** "tell them whether my children will study here". Open Your application, then About Sample Child S › Details of intended study in Canada, answer Yes; then Child V, answer No.
   - Expected: one plain question per child, saved.
   - Result: **held**. "Will your child study in Canada for 6 months or more?", with "Answering for Sample Child S (child)". Keyboard only: Tab reaches Yes, Space selects it. Save took 95 ms. axe found 0 violations at 1440 and at 1024, with no sideways scroll at 1024.
2. **Officer, across the screen boundary:** "see the family's forms and fees".
   - Expected: IMM 1294 for the student and Child S, IMM 1295 for the spouse, IMM 5257 for Child V; one total.
   - Result: **held**. "How each form is filed" lists exactly those forms, and "Total for this submission: CAD 825" is shown. Filings: Study permit (outside Canada): Sample Applicant A · Work permit: Sample Spouse A · Study permit: Sample Child S · Visitor visa: Sample Child V. axe found 0 violations.
3. **Recovery: reload.**
   - Result: **held**. After reopening the part, Child S still reads Yes.
4. **Officer corrects and confirms:** "the child is now on a short course".
   - Result: **held**. The officer saved No: the answer is marked "entered by staff", it fills the forms now, and it waits for Confirm section. Confirm section returned confirmed 1. Child S now files IMM 5257 and not IMM 1294, filed as "Visitor visa: Sample Child S", and the total became CAD 775.
5. **Wrong person asked.**
   - Expected: the student and spouse are never asked the question.
   - Result: **held**, on the client's list and in the suite.
6. **Unanswered child (error or wait).**
   - Expected: the forms and fees wait; the case is not Ready to file.
   - Result: **held, with a caveat**. The CRITICAL line reads "Cannot start yet: waits for the answer to "Will your child study…"". But it says the firm owes the answer, and it can be passed with a reason (review m2).
7. **Client reads the whole list** (what else a Study permit family is asked).
   - Result: **does not hold**.
   - "About the application" now has "Live-in caregiver program" (2 questions) and "Details of intended work in Canada" (LMIA number, employer address). These are for the spouse's open work permit (review m1).
   - The spouse gets a part titled "Request for a change of sex or gender identifier" that asks "City or town where the person was born" (r03; review M1).
8. **Other combinations** (not this PR's screens, compared with base).
   - Result: **regressed**.
   - With an LMIA, Express Entry and Family sponsorship clients now see the same gender-titled part asking city of birth.
   - Express Entry asks the city of birth twice (review M1).
   - The Visitor visa is unchanged.

## Break-it pass
- Flip Yes to No to Yes: the forms follow each time, with no duplicate forms.
- The client answering a staff fact is refused on base (403 "The officer enters this fact"); on the head the client is allowed, which is the intended change.
- 403s on `/api/runs?active=1` from the client page: these happen on base too (an existing issue, not this PR's).
- A demo load rewrites a tracked file (`p2/jobs/studio-fieldmap-imm1295e.json`; review m3).

## Data underneath
- Each answer is stored once, with its channel: questionnaire for the client, agent_view for the officer.
- The Visitor visa's release placements are identical to base.
- Four other suites fail on the head (review B1).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 2 and 4 |
| Next step obvious | ½ | 73 parts, including caregiver and work parts that do not apply (journey 7) |
| Plain words | ½ | The question is plain; city of birth sits under a gender heading |
| Feedback and state | 1 | "Saving…", Not started and done counts, the wait words |
| Correct data | ½ | The forms and fees are right; other combinations' facts are renamed (M1); the wait names staff |
| Error recovery | 1 | Reload, flip and officer correction |
| Accessibility and screen sizes | 1 | axe 0; keyboard; 1024 px with no sideways scroll (400 px and 200 % zoom not run) |
| Speed | 1 | Save 95 ms; the case page loads in under 2 s |
| Visual quality | 1 | Team look; one primary button per part |
| Trust and sources | 1 | Every cite exact and labelled Sample; "Why we ask" is ruled out of scope (UX-10) |
| **Total** | **8.5 / 10** | **Pass** (no criterion at 0) |

To raise the low scores, most valuable first:
1. Keep the other combinations' releases unchanged (M1).
2. Name IMM 1295's sections (M2).
3. Let the tech lead rule on the IMM 1295 caregiver and work questions for an open work permit spouse (m1).

## Could not test
- A real screen reader.
- An intended user's unaided walk (D17 and D20 stay with the founder).
- 400 px width and 200 % zoom.
- A visible (headed) browser: this sandbox has none, so I walked headless with screenshots.
