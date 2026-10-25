# Screen 03 — Combination workspace · build notes, slice S1 (runtime lane, 25 Oct)

Slice S1 as agreed (challenge.md, Lead response 25 Oct). It covers the tab route `/c/:id/:tab` (BR-1), `GET /combinations/:id/workspace?tab=`, and the Overview and Forms tabs. Forms reuses Screen 01's channel components. Preview by person is read by the runtime's `caseView()` (BR-15). It also fixes F-R1c-1 in `render.ts`, runs the coverage check over every Sample combination, and fixes QA-38 and QA-40. No paid AI: US$0.

## Top 5 production improvements over the board
1. Preview's family, person, mode and answers are kept in the address. A view can be shared, and Back works.
2. The decider answers ("tweaks") are not fixed checkboxes. They come from the configuration: the yes/no questions that decide what applies for the chosen person. They stay offered once answered.
3. A stale save in the form line panel shows who saved first and offers "Reload their version". Nothing is overwritten (409).
4. An unknown tab address redirects to Overview, and old `configuration?area=` links open the tab that now holds that part.
5. Each "Missing before firms can use it" line links to the tab where it is fixed.

## Deviations from the board (each with its reason)
| Board | Built | Why |
|---|---|---|
| Separate "Signature" column | The channel and its signature share one column | Screen 01's `ChannelCell` (reused unchanged, Lead rule) already prints the signature under the channel. A second column repeated it. |
| Links card on Overview | Not shown | Links are slice S3 (C1.3). A card with no record behind it would be scaffolding. |
| PQR, SQR, Documents, Rules tabs as drawn | PQR says it comes in S4. SQR, Documents and Rules show today's editor, limited to their own part, with one line "Rebuilt in slice …" | Slices S2–S4. Nothing that works today is hidden. |
| Sources moved into Overview | An Overview card lists the sources. The Sources tab stays last. | Lead: the Sources tab goes only after Screen 02 merges. |
| Preview "Sample filled PDF" and "Portal sheet preview" links per form | One link to the studio preview (`/c/:id/preview?view=studio`: Sample facts, every form field's coverage, filled PDF) | Folding those outputs into the per-person view is FINISH work. The studio suite's A3–A6 and B5 steps use the studio preview. Portal sheets are M3. |
| Draft bar "41 changes in 4 combinations" | The existing app-wide draft bar | No change in S1. |

## What was built
| Element | Where | Rule / test |
|---|---|---|
| Form line fields | `prisma/migrations/20261025070000_screen03_form_line` (expand only: `copies` 1–9 default 1, `min_age` 1–99 or null, `signed_by`; rollback in its header). Accepted by `Studio.saveForm` (zod `FormLineEdit`, Problem Details; `baseRevision` gives a 409). In the snapshot only when set, so an unchanged line keeps its fingerprint. | C1.8 (proposed) |
| Minimum age | `engine/render.ts` `ageGate`: applies from that birthday; with no date of birth it is "cannot tell" and the date of birth is asked as a deciding question. `today` is passed through from caseView and formCoverage. | engine min age ×4 |
| F-R1c-1 | `engine/render.ts`: questions follow placement order within a section and person; the label only breaks a tie | engine F-R1c-1 ×3 |
| Preview by person | `engine/runtime/preview.ts`: Sample families allowed by the combination's people, people shaped as a case's participants, tweaks as declared answers, then `caseView` unchanged plus the same render for documents and forms | C4.3, engine BR-15 ×10; API: preview = a real case on the same release, both modes |
| Coverage (BR-7) | `engine/coverage.ts` `coverageGaps`, and `tools/coverage-report.ts <port>` (read-only) | C4.1 engine ×4 |
| API | `api/src/workspace.ts` (new file; `main.ts` registers 2 names): overview = `Studio.combination` + `Programs.summary`, forms = summary + each line's fields and revision, preview = draft or `release=1` | C1.4, C4.3 |
| Contracts | `contracts/workspace.ts`: TABS, `tabOf`, SIGNED_BY (Sample), FormLineEdit, FAMILIES, view types | |
| Web | `pages/combination.tsx` is now the tab shell. New: `pages/workspace/overview.tsx`, `forms.tsx` (560 px line panel), `preview.tsx`. `runtime/questionnaire.tsx` exports `PreviewQuestions`, a read-only view built on its own `QuestionField`. `configuration.tsx` gets an `areas` prop. `job.tsx` opens the studio preview after "Apply to draft". | |
| QA-38 | `web/src/runtime/cases.tsx`: the Open a case list names each combination's highest release | qa check passes |
| QA-40 | `api/src/fill-case.ts` list also answers `online` (form, title, portal, people); `web/src/runtime/forms.tsx` `OnlineRow` "IMM 5257 · filed Online · No PDF copy" | qa check passes; C7.1 guard still passes |

## Coverage over every Sample combination (Lead: fix the data, never the rule)
`tools/coverage-report.ts` on a fresh copy with the visitor visa released. Visitor visa and With an LMIA, draft and release 1: **0 gaps**. The other Sample combinations have no forms yet. The renderer's "unresolved" flag marks 136 facts, all of one kind: placed as "taken from a document" while no document type lists them in `suppliesFacts`. Under BR-7 these are filled by the case officer, so they are covered. They are a document-reader gap, not a coverage gap. No Sample data needed changing. One point for S2: a fact placed in a section the combination does not select still counts as asked, because both the preview and a case ask it. S2 decides whether the gate requires a selected section.

## Checks run (this commit)
* `tests/check_screen03_engine.ts` (new, no server): **29/29**. Four mutations were tried (label order, `>=` age, coverage ignoring placement, preview dropping answers); each is caught.
* `tests/check_screen03_s1.cjs` (new, own copy runtime_s3 :4431): **42/42**. API checks: BR-1 pass and fail, 404s; form line save, the 400 field errors, 409 stale save, 403 non-author, back to defaults; the preview equals a real case on the same release in agent and SQR modes. Browser checks at 1440 and 1024: tabs, redirects, Forms tab and line panel (field error with focus, save, focus return, conflict), Preview (families, person, agent mode), read-only approver, empty preview. axe: 0 serious or critical. Screenshots in `screenshots/slice1/`.
* `tests/qa/check_qa_explore_1025.cjs` (own copy runtime_qa :4432): **14/20**. QA-38 and QA-40 now pass. The 6 fails are QA-39, QA-41, QA-42 and QA-43, which are not assigned to this slice. The C7.1 guard passes; the re-confirm step passed on the second run (it waits a fixed 800 ms).
* Existing engine suites: `check_engine.ts` 38/38, `check_case_engine.ts` 50/50. `graph.mjs --check` passes.
* Updated for the moved forms: `check_screen01_browser.cjs` (Forms tab, held files on Overview) and `check_studio_browser.cjs` (studio preview address).
* `run-suites.sh --demo`: see the hand-back.

## Self-score (honest, before CHECK)
D1 job 4 · D2 data 4 · D3 rules 4 · D4 contract 4 · D5 states 3 (loading, empty, error, read-only and conflict are done; long-name truncation is basic) · D6 a11y 4 (axe 0, keyboard path, focus return) · D7 copy 4 · D8 performance 4 (tab switch 0.5 s in the browser) · D9 reuse 4 · D10 governance 3 (form line edits are draft changes; expert ticks come in S4).

## Known gaps (next slices)
S2: SQR tab, coverage as a release block, filled by, Sponsor role. S3: Documents, links, "this document alone". S4: copy and bulk, PQR, Rules tab, Review and release. FINISH: Sample filled PDF per form in the per-person view, 200 % zoom pass. Carried: RT-7 check authoring.
