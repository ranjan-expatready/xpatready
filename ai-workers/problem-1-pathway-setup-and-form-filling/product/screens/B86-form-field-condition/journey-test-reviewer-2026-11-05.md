# B86 journey test, reviewer role, 5 Nov (commit d68a8b79a)

**No journey was walked.** The tech lead ordered one test copy at a time on the Mac (swap nearly full), so no copy ran on this check, and steps 2 to 5 of the skill were not done as written. Each result below is read from code or from the pure fill test and a pure probe. It is not what a person saw. US$0, live AI off.

## Journeys written (from the concept, before reading results)
| # | Persona, goal | Steps | Expected | Result |
|---|---|---|---|---|
| 1 | Author: "this form field says the same as this condition" | To review › condition card › panel › "Says the same…" | Waiting for a second person, link to To review | Code: yes. Not seen |
| 2 | Approver: check it against the form's words | To review › change page › Approve | Rule on a draft box; Confirmed | Code: yes. Not seen |
| 3 | Author: past the refusal after the condition is approved | Review and release › Hiding problem › panel › confirm › second person | Problem gone for that question | Code and fill test: yes. Not run on a copy |
| 4 | Author: undo a mistaken confirmation before release | Find the row › Undo › second person | Back to Not confirmed | **Finding M1:** after acceptance no screen shows the row |
| 5 | Author: confirmation returned | Open the change › withdraw › confirm again | Told to withdraw; works | **Finding M2:** "Correct it and send it again" form, Send again always 409; Withdraw is below it |
| 6 | Reviewer, wrong role | Open the card, click | No control, or a refusal in words | Server 403 by code and door test as written; button shown (m5) |
| 7 | Author: a box that cannot be confirmed | Row with no words or worked-out | No button, says why | Code: yes |
| 8 | Client (fill): Yes, a name, then No | Pure `formCoverage`, `formValues` | Name not written, Yes/No writes N | **Fill test: pass.** Not on a real case (B83, B82; ruling 1) |
| 9 | Recovery: double click, two tabs, reload | Propose twice | One change | Lock and re-check by code; not run |
| 10 | Across the boundary: release, then a case | Release › case › copy | Rule in the summary; form obeys | Summary by fill test; the rest waits for B82 (ruling 1) |

## What held (evidence: pure runs)
`check_forms_b86_fill.ts` 29/29. Own-question box with No and stale names writes `{"Y":"N"}`. With Yes and a name writes `{"Y":"Y","N":"OLD"}`. Unanswered reads `Waiting for`. A rule whose keys are in another order or with no `subjectKind` still counts.

## Findings
Full list with file and line in `review.md`. M1 and M2 are the journey findings. M3 and M4 are about proof. m2 (probe writes "Y" on a box reading the hidden question, on a snapshot the rule refuses) is for B88.

## Score out of 10 (each 0, ½ or 1; evidence is code and pure runs, not a walk)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Way past the refusal present; no way back on a screen (M1); door test not run |
| Next step obvious | ½ | Panel sits under the problem and on the card; returned page misleads (M2) |
| Plain words | ½ | Deciding question's words used; raw codes survive in some words (m1) |
| Feedback and state | ½ | Seven states and toasts by code; not seen |
| Correct data | ½ | Fill right in pure runs; rows, single record and audit not read in a database |
| Error recovery | ½ | Refusals in words by code; returned page's form always refuses (M2) |
| Accessibility and screen sizes | not measured | No browser |
| Speed | not measured | No server; one snapshot per Hiding question (m4) |
| Visual quality | not measured | No browser |
| Trust and sources | 1 | The form field's own words, a second person, Sample, Unconfirmed: expert, spread line |

**4 of the 7 criteria that could be scored; three not measured. As a score out of 10 this reads 4, and even with the three at 1 it reaches 7.** Below the pass mark of 8, and not a final score. No criterion is scored 0 on evidence.

## Most valuable fixes
M1 (task completed, next step) · M2 (next step, error recovery) · m1 (plain words). Then the walk itself.

## Could not test
Everything in a browser or against a server: walking, Playwright replay, axe, 400/1024/1440 px, 200 %, keyboard, timings, database rows, break-it pass. A real screen reader and an intended user's unaided walk (D17, D20) stay with the founder. **A reviewer must walk this and score it once a copy is allowed; the builder's door test and browser check do not replace that score.**

**Verdict: below the pass mark (not a full score).**
