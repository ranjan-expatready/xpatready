# C4.2 — PQR marks only what the SQR asks: build notes

Ruling: tech lead (Lead 3, 4 Nov, P-294) on #688 Question 1, option (B): forms pull their questions
(`engine/snapshot.ts`, `engine/render.ts`), so "no form box without a question" holds (P-76: PQR ⊂ SQR).

## What was built
1. **Pack** (`acceptance/C4.2.test.ts`): the unasked case no longer takes a section out (under (B) its questions stay
   asked, rightly). It builds a truly unasked fact: one more library fact (test words, Sample), and every form field
   that read another of the principal's client facts reads it instead. A person cannot do this at US$0: there is no free
   field add (P-158) and a new field comes only through an AI field-map draft, so the test writes it by SQL, as
   `check_c119_*`, `check_c313_*` and `check_s6_*` do. It expects both refusals: the release check's error
   ("… is needed by …, but nobody is asked for it") and the 422 on the PQR tick ("No question asks …"). Still 10 checks.
   `acceptance/PACK-2.md` row C4.2 says so (the 1 Nov text kept).
2. **Plain section names (P-91).** The Questionnaires tab already named a section the combination did not choose by the
   library title (QA-172), but Preview (client and agent view) and a case read `render.ts`, which knew only the chosen
   sections and showed the key ("personal_details"). The snapshot now carries `section_titles`: the title of each section
   a pulled question sits in that the combination did not choose. It is words only, so it is **outside the fingerprint**
   (like `row_versions`; `snapshotHash` and `assemble` both drop it, and `validate.ts`'s change list ignores it): no
   released combination shows "changed since release" because of it. A release made from now on carries the titles;
   an older release keeps its key until it is released again.
3. **"Still asked" (Questionnaires tab).** `QuestionnaireSection.stillAsked: { forms }` (contracts/workspace.ts, optional,
   additive) on a section not chosen here that still asks this person something; words from `stillAskedWords`:
   "Still asked: IMM 5257 needs these answers." (several forms: "A, B and C need these answers."; none: "a rule or
   condition reads these answers."). Shown as a full line under the section header, followed by "The section is not
   chosen for this combination, so its questions follow the chosen sections." The "Remove from questionnaire: not here"
   note is not shown on such a section (it is already out).

## Evidence
`tests/check_c42_still_asked_browser.cjs` (new, wp.family, 1440 px, axe), screenshots in `screenshots/`:
1 before (chosen, no line) · 2 taken out, "Still asked" · 3 the same section open · 4 Preview titled "Personal details".

## Not done here
* On the bare six (Reset to the six) the pack still stops with exit 2: no combination has questions (QA-144).
