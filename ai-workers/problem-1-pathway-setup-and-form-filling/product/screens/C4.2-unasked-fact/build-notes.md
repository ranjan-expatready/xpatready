# C4.2 — PQR marks only what the SQR asks: build notes

Ruling: tech lead (Lead 3, 4 Nov, P-294) on #688 Question 1, option (B): forms pull their questions
(`engine/snapshot.ts:167–181`, `engine/render.ts:232–237`), so "no form box without a question" holds (P-76: PQR ⊂ SQR).

## Plan
1. Pack `acceptance/C4.2.test.ts`: the unasked-fact case builds a truly unasked fact, a form field on a fact with no
   library question; it expects the release error and the 422 on the PQR tick. `acceptance/PACK-2.md` line 21 follows.
2. Questionnaires tab: a section that shows only because forms pull its questions is titled by its plain name, never
   its key (P-91).
3. Questionnaires tab: a section taken out whose questions forms still need says so in words
   ("Still asked: IMM 5257 needs these answers.").

## Done when
C4.2 10/10 on the fixture and on the six, twice each; 1440 px walk of the Questionnaires tab in the PR.
