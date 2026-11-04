# C4.11 — Draft questions and documents: every saved condition lands or is refused with a reason (QA-162)

Builder: forms lane (cloud), branch `claude/festive-noether-prh9i1`, from origin/main 9caa043b (4 Nov).

## Plan
1. Reproduce QA-162 at US$0 on Visitor visa (`tests/runtime/setup_visitor_visa.ts`): Draft with Saved, step 5 (`qd_conditions`), list the 14 left out with their reasons.
2. Sort each of the 14 by cause: (a) words fit several questions or none (matcher, `engine/fact-words.ts`), (b) the deciding answer cannot be one value (`answerOf`), (c) quote, reason or order rules, (d) the question is not placed yet (QA-144, #798: not built here).
3. Fix what the saved run already holds (no new paid run): land it, for a person to check when it is not named exactly; never guess.
4. Every condition still left out gets a reason a person can act on (what to do, where), never silent; the ones only QA-144 blocks say so.
5. Tests: a passing and a failing test per rule; QA-162's retest twice; `acceptance/C4.11.test.ts` on the fixture and on the six; 1440 px walk of the 7-step dialog.

## Findings
(filled in as the work goes)
