# Journey test (reviewer): Q2 on #325, whose list a document line goes on (engine only)

Reviewer role, fresh agent, did not build it. 1 Nov 2026.
* **Scored commit: 4bdcbf1b** (`git diff d66d9fdf 4bdcbf1b`). US$0, no AI calls.
* **No browser walk.** The working tree was in use by the builder's full run-suites, and my brief limited me to the unit suite. So I started no copy, on my port range or on :4400.
* Instead, I walked the journeys at engine level. A probe ran on a `git archive` copy of the commit in `/tmp`. It called `render()` (Preview), `sources.checklist()` (Documents tab), `documentFacts()` and `caseChecklist()` with a family of principal, spouse and two children, and a case-level line.

## Journeys (persona: content publisher previewing a combination; case officer reading the case)
1. **Main path.** A principal's employment letter that depends on the spouse's job. Expected: on the principal's list in Preview, on the Documents tab and on the case checklist. It is decided by the spouse's answer, and the deciding question is asked of the spouse. **Held.**
2. **Alternate: a child's line about the principal.** Expected: the consent letter goes on the child's list only. **Held.**
3. **Alternate: a principal's line with a DEPENDENT condition, two children.** Expected: Needed when any child holds. **Held.** No test guards this (review Major 1, h).
4. **Empty: no spouse on the case.** Expected: the spouse-condition line is "Not needed" and says why. **Held in the runtime** ("there is none on the case"). Preview shows only the condition words (review m1).
5. **Document-content condition.** "Certified translation …" in the real fixture. Expected: listed, not dropped. **Held:** "Cannot tell yet" for each applicant. But Preview's stat counts it as "depend on an answer", and the row does not say it waits for a document (m1).
6. **Case-level line with a PRINCIPAL condition.** Expected: Preview lists it under "The application" and the case checklist puts it on the principal, both decided by the principal's answer. **Held.** No test guards this (Major 1, i).
7. **Boundary to the client questionnaire** (`runtime/preview.ts:85`). Expected: a question a DOCUMENT-condition line could supply is still asked. **Held:** the line is never "Needed".

## Break it
* I removed 13 rules one at a time. `check_line_holders` catches 7. Not caught: (a) a DEPENDENT condition on a child holder, (h) any versus all subjects, (i) a case holder decided on the principal, (g) documentFacts holders, and (k, l) the "nobody" words. See review Major 1.
* Two children, no spouse and no children all give correct states.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–7 held; 12/12 checks pass |
| Next step obvious | ½ | A DOCUMENT line in Preview does not say it waits for a document (m1) |
| Plain words | ½ | "depend on an answer" also counts document-dependent lines (`preview.tsx:53`) |
| Feedback and state | ½ | Preview drops the `nobody` and `document` reasons (`render.ts:236-238`) |
| Correct data | 1 | Probe; vv 60/60, engine 41/41; deciders asked of the right person |
| Error recovery | ½ | No-spouse and no-children cases resolve; not walked in a browser |
| Accessibility and screen sizes | ½ | No UI change, not walked |
| Speed | 1 | Pure functions, no I/O or per-row requests |
| Visual quality | ½ | No UI change, not walked |
| Trust and sources | 1 | Rows keep `source_quote` and `origin` |
| **Total** | **7/10** | Below the pass mark (8), with no criterion at 0 |

Fixes that would raise the low criteria, most valuable first:
1. Put the document and "nobody" reasons on Preview's row, and correct the stat's words (m1).
2. Do a browser walk of Preview and the Documents tab on a builder port.

## Not tested
* A real screen reader.
* Widths 400, 1024 and 1440 px, and keyboard use.
* An intended user's unaided walk: D17 and D20 stay with the founder.
