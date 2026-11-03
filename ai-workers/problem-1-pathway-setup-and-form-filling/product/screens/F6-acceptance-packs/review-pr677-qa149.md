# Review: PR 677, QA-149 check update (HEAD 3ca1a1ab90196755771bfbbee72d14745cdd2228)

Scope: `prototype/studio/tests/qa/check_qa_vv_1102_decider.ts` only; no app code changed.

## Match to today's app
- Fact `person.travels_with` with "alone" / "both_parents": matches C6.4 R3 (`acceptance/lib/setup_vv_m3.ts:76,121`); the letter line appears on "alone" and goes on "both_parents" (QA-149b and e prove both directions, live).
- `subjectId` read from the section (`runtime.ts` questionnaire view): correct. `asked()` filters sections to K1 (the child) before looking up the fact, so another person's section cannot satisfy it.
- `case.application_date` answered first by the officer (status checked), so the child's age is known; the same set-up as the suite.
- Meaning kept: still asked before answer (client and officer), still shown after answer with an answer id, changing back removes the line.

## Findings
- Blocker: none. Major: none.
- Minor: check.ts:~20 QA-149a does not assert the letter line is absent before the answer; QA-149b still proves the answer adds it (it asserts presence after), so no false pass. Optional.
- Minor: the date is today's date (not fixed); fine for "under 18" with a sample child.

## Run (port 4477; 4478 was in use; copy stopped afterwards)
setup_visitor_visa ok; setup_vv_m3 44/46 (its 2 known gaps, e.g. fee table PUT); check: 6/6 PASS, exit 0.
Journey score (reviewer, tooling check, no UI): 8/10.

**Verdict: Approve**
