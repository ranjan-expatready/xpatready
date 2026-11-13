# BK-13 step 2: Study permit by data, the zero-code run (exit (b) of the Bake)

Forms lane, 13 Nov 2026 from 18:2x IST, on `origin/main` ff0c2ef90 plus this PR's data. Bake plan row 27 (BK-13); P-448, P-449, P-452, P-541; step 1 (the dry run) is `design/bk13-dry-run-2026-11-12.md` (#1574). Live AI off, US$0, no priced button. Every IRCC value is cited (page, quote, date) or labelled Sample and listed (§5). Legal points: Unconfirmed: no counsel.

**Status: stopped on a code gap (§3), question for the tech lead on the PR.** The run, its script and its data go on; nothing under `engine/`, `api/src/`, `web/src/` or `prototype/p5/` is changed by this row.

## 1. What the run does

1. A fresh isolated copy from this branch (`isolated.sh`), nothing loaded.
2. Demo › Load the configured checkpoint (`POST /api/demo/load {sample: configured}`): the six combinations are set up from the data files through the screens' services, and the Study permit (`sp.outside`) is released (row 10: submit, the SME's ticks, a different person's approval).
3. The Study permit's rows are **checked, not assumed** (P-449): each seeded row in the release (forms and their `who`, documents, fees, field maps) is compared with the data file it came from.
4. Demo › open the Study permit's Sample case (`POST /api/demo/sample-case`): the walk's family (student, spouse, child), answered from `samples/sample-student-answers.json` through the officer's own steps, a copy of every form each person files.
5. Each copy: generated, the filler's read-back (`intact`), every written box read back from the PDF, and counted (written, by hand, blank); fees and filings from data.

## 2. Bar (tech lead's ruling on #1574 §8, Lead 20, 11 Nov 23:2x IST)

Row 12's bar for the Study permit: the application form generated for each applicant, **written with nothing by hand**, its edition's fill trial recorded and passed, read back equal; plus every form the case files generated with no "needs a fix". `prototype/p5/` joins exit (b)'s no-code list. Adobe Validate of the Paper forms is BK-20 (the Lead, on the Mac).

## 3. The code gap (C1 of the dry run, never made a row)

**The filler does not run the step words in the AI-drafted field maps of IMM 1294 and IMM 1295**, so those boxes go "by hand". On `main` ff0c2ef90, configured checkpoint, Study permit release 1:

| Form (who) | Copy counts | Steps the filler does not run (examples, from the copy's own boxes) |
|---|---|---|
| IMM 1294 (student) | 62 written, **11 by hand**, 11 blank | `number:whole_dollars (max 7 chars)` ×4 (tuition, room and board, other costs, funds); `address_part:street_line` (school address); `derive: Y if applying-from country equals current residence country, else N`; `derive: Y if residential address equals mailing address, else N`; `derive: 1 if the number's country calling code is 1 (Canada/US), else 0` and `… is not 1 …`; `phone_part:national_number_without_country_code`; `derive: Y if passport country of issue = 206 (ISR (Israel)), else N` |
| IMM 1295 (spouse) | with 18 answers: 13 written, **6 by hand** on step words | `code_list:imm1295.service_language(English=01,French=02)` (no space before the bracket, so the code-list step does not match); `code_list:imm1295.phone_type(…)`; `code_list:imm1295.official_language_ability(…)`; `derive:country calling code is 1` / `is not 1`; `derive:case.applying_from_country equals current residence country` |

A scan of every mapped entry of the release's eight field maps against the filler's steps (each entry run on 11 kinds of value) finds steps no value can pass on IMM 1294 (19 entries), **IMM 1295 (41)**, IMM 5646 (11: `date_digit:YYYYMMDD[n]`, `address_single_text`, `derive:given_names + ' ' + family_name`), IMM 5707 (2: a code list followed by prose) and IMM 5409 (1). IMM 5257, IMM 5475 and IMM 5476: none.

**Why data cannot close it:** a field map entry's steps are set when the draft is applied; Field map review's decide route changes the key, meaning and type, never the steps (`api/src/sources.ts` decide: `decision, key, note, meaning, valueType, label, reason`), and no route or data file edits an applied entry's steps. The fix is code in `prototype/p5/transforms.ts` (the filler's step set), or a new route for map corrections: both outside this row (P-449, P-452, the Lead's ruling that `prototype/p5/` is in the list).

## 4. Results

To be filled by the run (counts per form and person; fees; read-backs).

## 5. Citation table

To be filled: every immigration value the run relies on, cited (page, quote, date) or Sample.
