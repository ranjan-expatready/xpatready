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
   a pulled question sits in that the combination did not choose, present only when there are any.
   * **Round 2 (review M2):** the first build kept it outside the fingerprint, so a library rename of such a section
     could never be released ("Nothing has changed") and cases kept the old title. It is now **in the fingerprint**; the
     change list names a new or renamed title in words (kind "Section name"; a section taken out keeps its title, so it
     is not listed twice), and the release publishes those sections' draft rows (`studio.ts publishRow`), as it does the
     chosen ones. A combination released before this PR whose questions sit in a section it did not choose shows one
     change, "… named for the questions forms still need from it", until it is released again: that is the title its
     cases do not have yet.
   * **Review M1:** the release check's per-question warning "Placed in section personal_details, which this
     combination's questionnaire does not use." (older than this PR) is now one warning per section, by title, in (B)'s
     terms: "\"Personal details\" is not chosen for this combination, but forms or rules still need 12 of its questions,
     so they are asked after the chosen sections. Add the section on the Smart questionnaire (SQR) tab to give them a place."
3. **"Still asked" (Questionnaires tab).** `QuestionnaireSection.stillAsked: { forms }` (contracts/workspace.ts, optional,
   additive) on a section not chosen here that still asks this person something; words from `stillAskedWords`:
   "Still asked: IMM 5257 needs these answers." (several forms: "A, B and C need these answers."; none: "a rule or
   condition reads these answers."). Shown as a full line under the section header, followed by "The section is not
   chosen for this combination: add it from the library above to give its questions their own place." (review m3) The "Remove from questionnaire: not here"
   note is not shown on such a section (it is already out).

## Evidence
`tests/check_c42_section_titles.ts` (new, released Visitor visa): the M1 warning, the M2 rename released end to end, the
"Still asked" words for one, several and no forms (m1).
`tests/check_c42_still_asked_browser.cjs` (new, wp.family, 1440 px, axe), screenshots in `screenshots/`:
1 before (chosen, no line) · 2 taken out, "Still asked" · 3 the same section open · 4 Preview titled "Personal details".

## Gate B (review B1)
The pack's run line now sets Visitor visa up from its forms first (`tests/runtime/setup_visitor_visa.ts`), so Gate B runs
it "fixture only" instead of on the bare six, where QA-144 stops it with exit 2.

## Not done here
* Review m2: the browser check takes the section out by the API (the screen offers removal only for a section that asks
  this person nothing, QA-93); the path a person takes to a never-chosen section with an added form is covered by the
  view's rule (any section not chosen that asks something), not by its own browser step.
* On the bare six (Reset to the six) the pack still stops with exit 2: no combination has questions (QA-144).
