# Journey test: QA-415 (reviewer role) · PR #1620 at 8e3293429 · 12 Nov 2026

**Where it ran.** Copies `rv415head` on :4455 and `rv415trial` on :4456. The trial copy is the head plus a scratch merge of #1591, needed for the spouse's work-permit filing. Both copies were on the configured checkpoint.

**How it ran.** The case officer (user-O) walked it in headless Chromium at 1440 and 1024 px. Copies were made by clicking "Generate a copy", then downloaded and read back with tests/fixtures/read_choice_values.py. The case setup for the Study permit family went through the routes a person uses (acceptance/lib/m3.ts). US$0.

**Screenshots** are in the session scratchpad (`shots/02-spouse-imm5476-row-1440.png`, `-1024.png`, `03-case-1440.png`, `03-case-1024.png`, `vv-*-IMM5645-row.png`). They were not committed, because this report may write only the review and this file.

## Journeys
1. **Case officer, main path.** "The spouse's representative form should say what the spouse applies for."
   * Open the Study permit family (Student, Spouse, Child 15 who will study), then Prepare application, then Generate a copy of IMM 5476 for each person, then Download.
   * **Held:** Student "Student", Spouse "**Worker**", Child "Student". No by-hand line about the kind. Each copy took 1.0-1.6 s.
2. **Case officer, Visitor visa family.** "Each adult's IMM 5645 should have the right box ticked."
   * Generate and download IMM 5645 for both adults.
   * **Held:** Visitor is ticked and nothing else, with no by-hand line. Each copy took 2.6-3.1 s.
3. **Alternate.** The child answers No to "6 months or more".
   * **Held:** the filing becomes "Visitor visa: Sample Child B" and IMM 5476 says "Visitor" (C7.1-AT-10, green twice).
4. **Case officer, "do I have to answer it?"**
   * **Held:** the agent view and the client questionnaire ask it of nobody, for either family (C6.2 8/8). The firm's other facts are still the officer's.
5. **Error or empty: the child's rule is not answered yet.**
   * The filing reads "Application to be decided".
   * **Failed:** the child's IMM 5476 copy leaves "Type of application" blank, with no by-hand line and no readiness line (review M1).
6. **Recovery: a wrong value stored behind the screens.**
   * A PUT of "Student" for the spouse, and stale "SAMPLE" answers from my mutation run.
   * **Held for the forms:** they still write Worker and Visitor.
   * **Gap:** "Facts from an earlier case" shows the stored value as "This case: Student · Different" (review m3).
7. **Across the boundary: filings and fees ↔ forms.**
   * **Held on the shipped data:** the fees list per family member and the forms' kinds agree (Study permit, Work permit, Study permit; total CAD 725).
   * **Failed in a configured case:** an on_principal line with an unanswered rule. The fees wait, but the form gets the principal's kind (review M2, engine probe).
8. **Other pathways.**
   * fs.spouse: "Permanent residence". The co-filed sponsor gets no IMM 5476 and no kind.
   * pnp.express_entry: "Permanent residence".
   * wp.lmia_inside: "Worker".
   * A person who is not travelling gets no forms.
   * **Held.**

## Data underneath
* The library has only `person.application_type` (scope PERSON). No field map reads `case.application_type`.
* Review row 4 reads "4 changed". The three proposals for the old key were decided CHANGED, by the author, with the reason recorded.
* No `case.application_type` answers remain after a fresh load.

## Break-it (15 min)
* Mutations:
  * Removing the question's exclusion turns C6.2 AT-2 and AT-3 red.
  * Removing the waits skip, the applying filter or the role filing turns the pure check red.
  * Removing the co_filed skip leaves everything green (dead code).
* Direct PUT of the worked-out fact: accepted (m3).
* Authoring a filing name that is not in the table, such as "Study Permit" with a different capital letter: the field is left blank in silence (M1).

## Score (reviewer, one score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1-4 and 8 on the trial merge; C7.1 9/9 twice |
| Next step obvious | ½ | Journey 5: a blank field with no line saying what to do |
| Plain words | 1 | No new words on the case; the source says "worked out: the person's own filing" |
| Feedback and state | ½ | The blank kind is not counted as by hand and not listed in readiness |
| Correct data | ½ | Named cases right; M2 gives a guessed kind on on_principal lines that wait |
| Error recovery | 1 | Answering No re-derives the kind; stored or stale answers never reach a form |
| Accessibility and screen sizes | 1 | axe 0 violations on the case page; no sideways scroll at 1440 and 1024; no UI change |
| Speed | 1 | Copies 1-3 s; the derivation runs in memory per knownOf |
| Visual quality | 1 | No visual change; the who-fills screenshots were re-shot and are clean |
| Trust and sources | ½ | Cited and labelled Sample; IMM 5475 not cited; Preview calls it a "client question" |

**Total 8/10, no 0: pass.**

**Fixes that would raise the low scores, most valuable first:**
1. A by-hand or readiness line for a missing kind (M1).
2. Skip waiting applicants on the principal's application (M2).
3. Cite IMM 5475, and have Preview say "worked out" (m1, m2).
4. Refuse answers to the worked-out fact (m3).

## Not tested
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* A keyboard-only walk (no UI changed).
* A visible-browser run (headless only in this sandbox).
