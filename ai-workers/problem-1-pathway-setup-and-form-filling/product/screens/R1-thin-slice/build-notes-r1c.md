# R1c — Renderer · build notes (runtime lane, 24 Oct)

Plan §9 row R1c: one component, SQR and agent modes, §5 types, messages, save and resume, "answering for"; 390 px and desktop, axe clean. Board: `product/design/questionnaire-kit.dc.html` (SQR and agent view panels). Earlier slices: `build-notes.md`.

## Top 5 production improvements over the board
1. **Error summary that takes the focus** and links to each field (board shows the box only): keyboard and screen-reader users land on it.
2. **Validation never blocks saving** (P-47): invalid answers are stored and flagged; "leave them for now and continue" in the summary.
3. **Overview for resume**: parts by person with Done / N to answer / Needs fixing / Optional, "Continue where you left off".
4. **Agent view one person at a time** (one row of tabs, missing counts): a household is 240 questions; the board shows one section.
5. **Conflict in place**: a stale edit is refused in the dialog with "Someone changed this answer after you opened it", and the newer value is shown.

## What was built
| Element | Where | Rule |
|---|---|---|
| Renderer, one component, `mode` sqr or agent | `web/src/runtime/questionnaire.tsx` | P-47; kinds from type and form shape: text, long text (counter), email, number and CAD money, date day/month/year, month/year, yes/no and ≤5 choices as radio cards, longer lists as a select, address and phone in parts |
| SQR: overview, one part (section × person) per screen, Back, ✓ Saved, progress, error summary, repeating entries (add, remove with in-page confirmation, "does not fit on the form"), Save and continue, Save and come back later | same | parts person by person (the application, principal, spouse, children); the server's P-72/P-78 words shown after saving ("Answered by the principal for an adult…") |
| Agent view: tabs per person, sections nav, each fact with value, confirmation pill, source (channel · who · when), forms it fills, problems; Edit/Add in a dialog with the P-45 message; Confirm section with the ids seen; entries | same | RT-10, RT-11 |
| Case area: case list, Open a case (released combinations, idempotency key), case page with people (add spouse or child within the release's limits), client page | `web/src/runtime/cases.tsx` | RT-1, RT-3, RT-12 in the browser |
| Question order = the release's placement order | `engine/runtime/case.ts` caseView | finding F-R1c-1 |
| View contract (one shape for engine and web) | `contracts/runtime.ts` `QuestionnaireView` | STANDARDS §6 contract first |

## Decisions (small, technical; disagree in the check)
1. Own shell under `/cases` (firm and client area, not the studio menu); "Acting as (simulated)" switch is demo chrome, dashed border, not for porting. The studio's Demo menu links to it.
2. Optional-only parts count as done once passed with Save and continue on this device (`localStorage`); the server has no "nothing to add" answer yet (gap 1).
3. Radio cards for code lists of ≤5 values, a native select above (searchable by typing); the 474-value language list stays a select (team combobox later).
4. Refusals (4xx) are not retried by the page: the reason shows at once.

## Shared files changed (for the Lead's check)
| # | File | Change |
|---|---|---|
| S-10 | `web/src/App.tsx` | route `/cases/*` to the case area's own shell (plan §10 S-2, web part); one Demo-menu item "Open the case area (runtime preview)" |

## Findings for other lanes (not fixed here)
| # | Finding | Owner |
|---|---|---|
| F-R1c-1 | `engine/render.ts` sorts questions by label, ignoring the placement `order`: the preview (Screen 03) shows "That status ends on" before "started on". The runtime view now orders by placement (engine test) | screens (Screen 03 preview) |
| F-R1c-2 | Many visitor-visa question texts are field meanings ("Whether the person has…") and some answer labels are codes ("VisitorVisa", "F Female"): configuration data (setup Sample), to be written as questions in Screen 03 | screens / Lead (setup wording) |
| F-R1c-3 | RT-7 section checks cannot be authored (plan "Build discoveries") | Lead |

## qa Minors riding in R1c (Lead note 24 Oct; `qa/BUGS.md`)
| qa | Finding | Fix | Tests (pass and fail; each fails when its fix is removed) |
|---|---|---|---|
| QA-25 | control characters accepted in typed answers (only NUL was refused) | `contracts/runtime.ts` PutAnswer refuses C0 controls and DEL in any text of the value, keys included; tab, line feed and carriage return stay allowed | API "QA-25 fail" (bell, control inside an address part, DEL → 400, nothing stored) and "QA-25 pass" (long text with line breaks and tabs) |
| QA-26 | id refusals said "Invalid UUID" | plain messages on `expectedId` and `seen` (the other id fields already had them) | API "QA-26 fail" (answer seen, reviewed answers, person, row, combination: none says Invalid UUID) and "QA-26 pass" |
| QA-28 | "Add child" twice added two children | optional `idempotencyKey` on add-person, stored per case (migration `20261024200000_runtime_r1c_people_key`, expand only, rollback in its header); same key returns the same person, a different request with it → 409; simultaneous presses serialised by the case lock; the dialog sends one key per opening | API "QA-28 pass" (two simultaneous presses, one child) and "QA-28 fail" (same key, other name → 409) |
Order for run-suites: the R1c journey runs right after `setup_visitor_visa.ts` and before `check_runtime_r1a.ts` (that suite publishes a release 2 that adds a question).

## After the early look (Lead, 24 Oct: Go with changes)
| Change | Where | Tests |
|---|---|---|
| (a) RT-7: two visitor-visa section checks seeded as Sample data (visit end on or after its start, via a `days_until` derived field; funds above 0), released with the rest; shown in the SQR (message under the field, "Check these answers" summary, part stays open, overview "Check answers") and the agent view ("N to check", a notice before confirming, the message on the row, Confirm section says the check is still open). Warn, never block (P-71) | `setup_visitor_visa.ts` 4.5b; `engine/runtime/case.ts` checks on their question; `ViewCheck` in the contract | setup "4.5b" and "4.6 … carries the two section checks"; engine "R1c checks" pass and fail-guard; journey "checks fail-guard", "agent checks" |
| (c) answers carry the field map's label ("Visitor visa", "Female"); joined export values read as words where no map labels them; stored keys unchanged | `optionsOf` in `engine/runtime/case.ts` | engine "R1c labels" pass and fail-guard; journey "labels" |
| (b) S-10 accepted; (d) run-suites by the Lead at merge | | |

## Checks run
* `tests/runtime/check_runtime_r1c.cjs` (new; usage line in the file): **53/53**: officer opens a case (field errors, second spouse refused), client at 390 px (radio, select, dates, money, error summary with focus and links, invalid values stored and flagged underneath, repeating entry with remove confirmation, answering for, P-78 words, leave and resume), roles in the browser, agent view (source, Confirm section, edit message naming IMM 5257, 409 conflict, officer-only passport number never in the client's view), axe WCAG 2.2 A/AA on 10 states (0 violations, `screenshots/r1c/axe.json`), no sideways scroll at 390/1024/1440, budgets: case page 83 ms, client part 93 ms, person tab 62 ms.
* Mutation checks: removing the summary focus fails "the summary takes the focus"; removing the person-by-person order fails "part 2 is the visit".
* Engine 25/25 (placement order pass and fail-guard), API 93/93 (QA-25, QA-26, QA-28 added), `run-suites.sh --demo` every suite green (studio browser 40/40, Screen 01 browser 136/136). Typecheck web clean, api unchanged; explicit any 437 (baseline 437; new files have none).

## Self-score (honest, D1–D20 short)
Strong: one component (D-renderer), data-driven kinds, states (empty entry, loading skeleton, error on field, conflict, read-only refusals), accessibility (axe 0, focus, labels, 44 px targets on phone). Weaker: copy depends on configuration wording (F-R1c-2); no i18n; country and language lists are native selects; no section checks (RT-7); no "nothing to add" answer.

## Known gaps
1. "Done" for optional-only parts is per device; the server needs a "nothing to add" answer (M3).
2. After Confirm section, the source shows the officer, not who first answered (the confirmed version keeps `from`; the view does not read it).
3. RT-7 authoring through the product (Screen 03, screens lane); R1 seeds two Sample checks. 4. A part saves its answers one request each (fine at today's sizes, ~40 ms each); a batch save would cut round trips.
Screenshots: `screenshots/r1c/` (390 for the client, 1440 and 1024 for the officer). AI cost: US$0 (no model call).

## Fixes (CHECK → FIX: review 7/10 "Ship after fixes", no Must, 6 Major; break report 0 Blocker, 4 Major, 14 Minor)
Reports: `review-r1c.md`, `break-report-r1c.md`. Each fix has a test; journey 75/75, API 97/97, engine 29/29; mutation checks: removing the conflict fix or the missing-answer naming fails its journey test.
| Finding | Fix | Test |
|---|---|---|
| Review M1 / break m12: rules not live, required not named, `hidden` ignored | a hidden question is not asked (SQR) or shows "Not asked now: a rule hides it" (agent); after Save and continue, required questions left empty are named in the summary ("Answer this question, or leave it for now"), the part stays open, the client may leave them (warn). Rules apply on each save, not while typing | journey "rules fail-guard (review M1)", "rules pass" |
| Review M2 / break M2: unnamed groups; required facts as entries (current residence country, present occupation) | each group says what an entry asks ("Entries · Each entry asks: …"); the setup places both facts once per person (data, Sample) | journey "groups (review M2)", "residence (review M2)"; API "R1c break M2/M4 pass" |
| Review M3 / break M1: conflict dialog stuck after 409 | the dialog reads its question from the current view and drops the stale draft: the newer answer is shown and the next save works | journey "agent conflict (review M3)" pass and fail |
| Review M4: who answered lost after Confirm section | the API reads the confirmed answer's `from`; the view carries `answered`; the row reads "questionnaire · Client A · … · confirmed by Case officer" | journey "agent source (review M4)" |
| Review M5: countries typed, internal note to the client | a country with no answer list (and the address country) offers the release's countries while typing; configuration notes show only to the officer | journey "countries (review M5)", "copy (review M5)" |
| Review M6 / break M3: sideways scroll (4 children at 1024 px, 200 % zoom) | person tabs wrap; long names wrap in tabs, chips, titles | journey states at 1024 with 4 children (no sideways scroll) |
| Break M4: union date required for a single applicant | the release marks `relationship.start_date` optional (a rule on the application cannot read the principal's status yet); question for the Lead | API "R1c break M2/M4 pass" |
| Break m1–m4, m13: lone surrogate, deep value, NUL in a key → 500; DEL, C1, bidi overrides accepted | one rule for invisible characters (C0/C1, DEL, zero-width marks except the emoji joiner, separators, bidi, BOM) and lone surrogates on names, references and answers; idempotency keys visible ASCII; deep values refused before any JSON length; plain words on limits | API "R1c break m1–m4 fail" and "m4 pass" (accents, scripts, emoji kept) |
| Break m5, m6, m8, m10, m11 | fractional part number → nearest part; a save that finishes after Back never moves the client; Back saves what was typed first; long text wraps; the part's heading takes the focus | journey (resume, part navigation); code review |
| Break m9: "000" did not trigger the funds check | numbers answered as digits are read as numbers by the rules | API "R1c break m9 fail-guard" |
| Review minors: double "Add an entry", focus after the dialog, focus on save-later, "(optional) (optional)", Sample label | Add is busy while adding; focus returns to the Edit button; the summary takes the focus on save-later too; no double "(optional)"; client check messages say "(Sample check)" | journey "keyboard (review minor)", "agent copy" |
**Not changed, with reason:** break m7 (on a conflict the client sees the newer answer and the message; their typed text is not kept: a merge view is M3 work); m14 (616 KB view for 6 people: options per question; R1d returns only the changed section and shares answer lists, as noted in R1a); review minors on long text/email read from field names and the simulated people's names in the renderer (prototype scaffolding; data types land with Screen 03); malformed-JSON wording comes from the framework's body parser (shared `main.ts`).

## Lead check FIX: the journey on a fresh copy (24 Oct)
**Finding (Lead):** `check_runtime_r1c.cjs` gave 69–71/75 on fresh copies (Confirm section, "1 to check", conflict retry, source line, officer-only fact, second entry). **Root cause: the check, not the product.** Steps read the screen once, right after an action (`isVisible()`, `count()`, `inputValue()`, the focused element), and two helpers waited a fixed time; on a slower machine the page had not yet re-rendered from the refetched view. Reproduced here with `R1C_SLOW=6` (CPU six times slower, each API response 150 ms later): 60/75, the Lead's set plus more.
**Fix:** every step waits for the state it needs, never a fixed time: an element shown or gone, a field's value, the focus, or the data underneath; Save and continue waits for the questionnaire reload that ends every save, then for the button to be free; leave-and-resume waits for the overview before reloading; a resize waits two animation frames. The budget step is skipped only when `R1C_SLOW` is set (throttled timings are not budgets).
**Evidence:** throttled `R1C_SLOW=6` 74/74 (budget skipped); at normal speed on three fresh copies in a row, as `run-suites.sh` runs it (setup → journey → API): setup 13/13, journey 75/75, API 97/97 each time; `run-suites.sh` green after merging main.
**Lead answers recorded:** union date optional for now with a warning; cross-person rules go to the R1d/M3 plan (`plan.md` "Plan items after R1c"); "(Sample check)" stays on the client's checks until the immigration expert confirms (AGENTS rule 4).
