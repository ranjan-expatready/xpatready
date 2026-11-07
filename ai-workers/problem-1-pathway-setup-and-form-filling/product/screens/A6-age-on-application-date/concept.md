# A6 (B102): a person's age in whole years on the application date — concept

Row: M3 sprint plan, "Row A6" (`product/design/m3-sprint-plan-2026-11-06.md`). Capability: C6.4 Document checklist per person (the minor's lines). Fixes in full or part: QA-226. No board (P-223 (4)): the tech lead approves after the independent challenge (`challenge.md`). Written 7 Nov 2026, 13:40 IST, on `origin/main` ecbd68301.

## 1. Job and journey
**Job:** a rule that reads a person's age gets it worked out from their date of birth on the application date, never typed, and the case officer sees that age on the person. **Personas:** the configuration author (sets the worked-out value once), the content reviewer and Approver (the new date fact, as any library field), the case officer (reads the age on Documents). **Why now:** on the configured checkpoint the five minor document lines (letter of authorization, birth certificate, absent parent's ID, custody documents, adoption or guardianship papers) wait, because their condition reads `person.age_years` and "this library neither holds nor calculates" it (load log, `325-conditional-documents.ts`); `C6.4.test.ts` there is 19/30 (C6.4-8, -8a, -8b, -8d, -8e, -8e2, -8h, -8i, -9a, -9b, -19 red; measured on a fresh copy, 7 Nov 13:38 IST). The library also has no application date (no `case.application_date` field on the checkpoint).

## 2. Ten layers (STANDARDS §2): what exists, what is new
| Layer | Exists | New |
|---|---|---|
| Data | `derived_field` table (key, calculation, inputs, reference, plain, executable); the release snapshot carries it; `case.application_date` only in the imported work-permit config, not on the checkpoint | nothing in the schema (no migration) |
| Rules / engine | `contracts/rules.ts` `ageInYears` + `CALCULATIONS.age_in_years`; `evaluate` works derived values out; `case-checklist.ts` asks the inputs of a derived value first (B-M3) and already works ages on `case.application_date` | the checklist answers each person's age (years, on which date, or what to answer first) |
| API | `GET /api/library/derived` (read only, condition builder); C3.6 `GET/POST /combinations/:id/rule-facts`, `POST …/rules/:key/fact` | `GET /api/combinations/:id/rule-facts/worked-out` (the choices) and `POST /api/combinations/:id/rule-facts/:fact/worked-out` (new file `api/src/worked-out.ts`, registered in `api/src/features/worked-out.ts`, P-214). **Not** `api/src/runtime.ts` (H6: #1054 has it open) |
| Screens | Questionnaires › "Facts a rule needs that no form asks" (`web/src/components/rule-facts.tsx`); case page › Documents (`web/src/runtime/checklist.tsx`) | on the fact's row, "Work it out instead"; on Documents, each person's age line |
| Checkpoint | step 325 adds the lines, the facts they read (C3.6) and places them; waits a line whose fact is missing | `samples/conditional-documents.json` gains `worked_out` (data, P-319); step 325 adds the application date through C3.6's door, places it once per case, and works the age out through the new route |
| Team's code | the team's spine authoring has no worked-out values (Unverified: not re-read this session) | — |

## 3. Business rules
* **BR-1 Worked out only for a rule that reads it.** The fact must be read by a condition, rule or check of this combination and be neither a library field nor already worked out (same list as C3.6, `missingRuleFacts`). Else 404 "no rule here reads …" / 409 "already in the library" / 409 "already worked out".
* **BR-2 Only a calculation the engine has a tested helper for**, offered in words: "Age in whole years" (`age_in_years`). Else 400 naming the choices.
* **BR-3 Worked out from a date about the same subject:** for `person.*`, a library date field about the person (`person.date_of_birth`). Else 400.
* **BR-4 Worked out on a date asked once per case** (`case.*`, type date, in the library). None yet → 400 "add the date about the case first (Add a fact a rule needs: Application date)". **Both dates must be asked by a question** (challenge M1) → else 400 "place it first"; the release pulls them into the combination's questionnaire with the worked-out value. The checkpoint asks the application date once per case in the staff working view, beside the intended stay dates (challenge m5).
* **BR-5 Never both asked and worked out:** a waiting proposal to ask that fact → 409 "decide it on To review first".
* **BR-6 The configuration author only** (403 for others); the key is the one the rule reads (never typed); **the words are built by the server from the choices and name both dates** ("Age in whole years from Date Of Birth, on Application Date."; challenge M2), so the Approver's Review line says what it is. Written with an audit line; it reaches cases only in a release an Approver approves.
* **BR-7 How age counts (engine, exists):** whole years on the reference date; one less while the birthday is not yet reached; born 29 February: the birthday counts on 1 March in a year without one; a birth after the reference date gives no age ("check the date of birth and the application date"). **Sample**; "Unconfirmed: no counsel" for the 29 February and reference-date choices.
* **BR-8 Shown on the person:** Documents shows each person's age "15 on 2026-11-07 (the application date)", or "Age: answer Date of birth first" / "answer the application date first"; it changes when either date changes, and the minor's lines with it.
* **BR-9 Under 18 is data, not code:** the threshold stays in each line's condition (`samples/conditional-documents.json`, `lt 18`), never in the engine (P-319).

**Cite (AGENTS rule 4, P-170).** Guide 5256, Applying for a visitor visa (canada.ca page, downloaded 2026-10-19, `official-sources/ircc/manifest.json`), section "Minors travelling alone": "Minors (under 18 years of age) travelling alone or with a person other than their parents or legal guardians should have a letter of authorization, preferably in English or French, signed by both parents or legal guardians." The page does not say on which date the age counts: **working it out on the application date is Sample, Unconfirmed: expert; Unconfirmed: no counsel** (the minor travels later than they apply; Question 2). canada.ca could not be re-read from this session (host not allowed); the quote is from the committed capture.

## 4. Layout (pattern: inline panel row, EXPERIENCE §3)
```
Facts a rule needs that no form asks · 1
┌ Document condition letter_of_authorization…: a child under 18 travelling alone …   [Add the fact this rule needs] [Work it out instead]
│ person.age_years
│ Worked out as [Age in whole years ▾]  From [Date of birth ▾]  On [Application date ▾]
│ It will read: Age in whole years from Date Of Birth, on Application Date.
│ [Work it out · US$0]     (no date about the case yet → "Add the date first: Add a fact a rule needs › Application date")
└
Case page › Documents
  Sample Child A1 · Child · 15 on 2026-11-07 (the application date) · 2 of 5 received
  Sample Client A · Principal applicant · Age: answer "Date of birth" first
```
States: loading, no choice (no date about the case), refused (server words under the form, focus moves to them), done (the row leaves the list: the fact is worked out).

## 4b. Best in class
From the vendors' own public pages read for V4 (`reports/verify-2026-11-03/V4-best-in-class.md`) and general knowledge, **not re-read this session (network)**, so Unverified:
* **Tax-filing interviews** (TurboTax-style): ask the date of birth once and work age out on the rule's own date (end of the tax year), naming the date in the result. **Copy:** the age always says the date it is measured on.
* **Bank onboarding:** never ask age when the date of birth is held; refuse a birth date in the future at the field. **Copy:** the engine already refuses both (C6.4 B-M3).
* **US immigration case tools** (age-out alerts for a child turning 21): the age that matters is tied to a filing date. **Beat:** our date is the case's own answered application date, and the documents a child needs change with it, with the reason shown.
Saves effort: nothing typed twice (age is never asked), one next step ("answer the application date first"), the error caught where it happens.

## 5. Copy
"Work it out instead" · "Worked out as" · "From" · "On" · "It will read: …" · "Work it out · US$0" · done: the row leaves the list · Documents: "Age {n} on {date} (the application date)"; when the release works out an age and its date is missing: "Age: answer "Date the application is submitted" first."; only a release with no worked-out age shows "Age {n} on {today} (today: the application date is not answered yet)", the date the 18-or-older lines use (challenge m6).

## 6. Contract and tests
* `GET …/rule-facts/worked-out` → `{ calculations: [{ key, words }], from: [{ key, label, subject }], on: [{ key, label }] }`.
* `POST …/rule-facts/:fact/worked-out` `{ calculation, from, on }` → `{ fact, calculation, calculation_words, from, on, plain, rule }` (201); `plain` is built by the server.
* Checklist person: `age: { years: number | null, on: string | null, why: string, worked_out: boolean }`.
* Tests: `tests/check_b102_worked_out.ts` (isolated copy, sample inputs): a pass and a fail per BR-1…BR-6; BR-7 on the engine (birthday eve, birthday, 29 February, birth after the date). Acceptance: `acceptance/C6.4.test.ts` on the checkpoint 30/30; `C6.4-screen` stays 17/17; the fixture run stays 30/30.

## 6b. Capability or scaffolding (P-33)
The route, the panel row, the age line and the checkpoint data are capability. The 18 threshold and the reference date are Sample data. **Not built:** other calculations on the screen (days until, months uncovered), editing or removing a worked-out value (add only).

## 7. Questions (for the tech lead; recommendation first)
1. A worked-out value is written by the author with an audit line and governed by the release's approval, not by a second-person library change. **Recommend:** yes for now (it adds no outside value, only a sum over approved facts); a follow-up row if the founder wants a second person.
2. Age on the application date vs the travel date for the minor lines. **Recommend:** application date (the row's words, and what the officer knows at filing); the expert confirms (Unconfirmed: expert).
3. Some provinces set the age of majority at 19 (Unconfirmed: not re-read). **Recommend:** keep 18 from Guide 5256's own words; no change.

## J-A6 (journey by screens, P-352)
Starts where J-B1 ends: case officer, family case, Documents. Child A1 (10) reads "10 on {date} (the application date)" with the minor's lines once "travels with" is answered. Change the child's date of birth to 18 years and one day before the application date: the age reads 18 and the five lines leave with "Not needed" reasons. Set it back one day short of 18: 17, the lines return. (The walk starts on the case before the application date is answered, so the age line first asks for it; no route clears an answer, break mi8.) Ends at C6.5's input: the child's passport line offers "Upload a file" (C6.5's own "Fill this from documents" is not on main's screens).

**J-A6a (the author by screens, challenge m4).** Configuration author, a combination whose rule reads a fact the library lacks: Questionnaires › Facts a rule needs › "Work it out instead": Age in whole years, From Date of birth, On Application date; "It will read" names both dates; Work it out: the row leaves the list. Choosing a date the questionnaire does not ask: refused in the server's words under the form, focus on them. Ends at the combination's Review, where the worked-out value's line names both dates.

## Definition of ready
Acceptance: `acceptance/C6.4.test.ts` on the checkpoint. Row text: the sprint plan's Row A6. Decisions: none open that block; Questions 1–3 carried on the PR.
