# Journey test: QA-400 (reviewer, 11 Nov 2026)

Commit 61e6261b2ffdca186e635aaacc9364ca2596c8cb, my own isolated copy on :4485 with the configured checkpoint (replays only, live AI off, US$0); the copy has since been stopped. I ran the builder's scripted check once, then walked the pages in headless Chromium with axe-core. Screenshots were taken to the session scratchpad only and are not committed.

## Journeys
1. **Case officer, main path.** "Prepare SCH1 for each person on the family Visitor visa case." Generate SCH1 for the principal, the spouse and the child 18+, then read each PDF back. Expected: true / false / false. **Held** (check C lines: principal "true", spouse "false", child "false").
2. **Client, alternate.** "Answer my questionnaire." Expected: never asked "Indicate whether you are". **Held**: absent at 1440 and 1024 px, and absent via the API in sqr mode.
3. **Case officer, staff view.** Expected: not asked of anyone. **Held** (check D in agent mode; the case page text at 1440 and 1024).
4. **Author, crossing to the case side.** "Review the replayed SCH1 draft." Expected: the wrong application-level key is changed to the person's fact, with a reason. **Held**: one CHANGED decision with its note, the field published as CLIENT_LEVEL, and the VV Release 1 and 2 snapshots carrying it.
5. **Error/break, planted.** A spouse's SCH1 planted as "true" must be caught. **Held** (the check's planted line).
6. **Recovery, role swap (Make principal).** Expected: re-derived from the new roles. **Code reading only** (`principalOf` reads roles each time). Not walked.
7. **Other path.** Work permit via Demo › Start With an LMIA (c1-v3). **Not fixed there**: the same case-level SCH1 entry remains (review m1).

## Data underneath (copy DB)
* One field `person.is_principal_applicant` (CLIENT_LEVEL, yes_no, PUBLISHED v1) and no `case.subject_is_principal_applicant`.
* One SCH1 map row (`form_subject`, `yes_no_code:true/false`, PUBLISHED v1).
* Proposal decisions: 1 CHANGED, 1 RETURNED (the showcase kept).
* 0 checks, conditions or derived fields reading any `principal_applicant` key.

## Break-it (short)
* Planted spouse "true": caught.
* Children under 18: the value is derived but unread (no SCH1).
* Roles sponsor and representative: No, which is truthful.
* No new write route, so wrong-role, double-click and two-tab checks have nothing new to test.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Three SCH1s read back correctly |
| Next step obvious | 1 | Nothing to answer; the question is gone |
| Plain words | 1 | Meaning and source in plain words ("worked out: the person's role on the case") |
| Feedback and state | ½ | The box's worked-out source exists in the data; I did not see it on the forms screen |
| Correct data | 1 | Per person, PDF read-back, DB checked |
| Error recovery | ½ | Role swap re-derives by code; not walked |
| Accessibility and screen sizes | ½ | axe 0 and no sideways scroll on 3 pages at 1440 and 1024; no keyboard walk, no 400 px, no 200 % |
| Speed | ½ | Case page about 4.3 s to network idle (unchanged page, above the §9 first-view budget); questionnaire about 1-1.8 s |
| Visual quality | 1 | Screens unchanged; screenshots clean |
| Trust and sources | 1 | AI proposal corrected with a recorded reason; Sample labelled |

**Total 8 / 10: pass, no 0.**

Fixes that would raise it, most valuable first:
* Walk Make principal on a family case and read SCH1 again.
* Keyboard walk and 200 % zoom on the client questionnaire.
* Show the worked-out source beside the SCH1 box on the case page (if not already shown).

**Could not test:** a real screen reader, or an unaided intended user (D17 and D20 stay with the founder).
