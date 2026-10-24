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

## Checks run
* `tests/runtime/check_runtime_r1c.cjs` (new; usage line in the file): **53/53**: officer opens a case (field errors, second spouse refused), client at 390 px (radio, select, dates, money, error summary with focus and links, invalid values stored and flagged underneath, repeating entry with remove confirmation, answering for, P-78 words, leave and resume), roles in the browser, agent view (source, Confirm section, edit message naming IMM 5257, 409 conflict, officer-only passport number never in the client's view), axe WCAG 2.2 A/AA on 10 states (0 violations, `screenshots/r1c/axe.json`), no sideways scroll at 390/1024/1440, budgets: case page 83 ms, client part 93 ms, person tab 62 ms.
* Mutation checks: removing the summary focus fails "the summary takes the focus"; removing the person-by-person order fails "part 2 is the visit".
* Engine 25/25 (placement order pass and fail-guard), API 93/93 (QA-25, QA-26, QA-28 added), `run-suites.sh --demo` every suite green (studio browser 40/40, Screen 01 browser 136/136). Typecheck web clean, api unchanged; explicit any 437 (baseline 437; new files have none).

## Self-score (honest, D1–D20 short)
Strong: one component (D-renderer), data-driven kinds, states (empty entry, loading skeleton, error on field, conflict, read-only refusals), accessibility (axe 0, focus, labels, 44 px targets on phone). Weaker: copy depends on configuration wording (F-R1c-2); no i18n; country and language lists are native selects; no section checks (RT-7); no "nothing to add" answer.

## Known gaps
1. "Done" for optional-only parts is per device; the server needs a "nothing to add" answer (M3).
2. After Confirm section, the source shows the officer, not who first answered (the confirmed version keeps `from`; the view does not read it).
3. RT-7 (above). 4. A part saves its answers one request each (fine at today's sizes, ~40 ms each); a batch save would cut round trips.
Screenshots: `screenshots/r1c/` (390 for the client, 1440 and 1024 for the officer). AI cost: US$0 (no model call).
