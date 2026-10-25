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

---

# Slice S2 (runtime lane, 25 Oct): SQR tab, coverage as a release block, filled by, Sponsor

Lead note 08:45: S1 early look GO, five changes first, then S2 as agreed. Answers applied: the coverage gate counts what a case on the release asks, and a selected section is not required. C1.8 is in CAPABILITIES. US$0.

## S1 early-look changes (each tested)
| # | Change | Where | Test |
|---|---|---|---|
| 1 | Sample family people have Sample dates of birth (38, 36, children 8 and 16, sponsor 45; a month before the birthday, from today). A configuration with no date-of-birth field gets none, so the line stays "cannot tell". | `engine/runtime/preview.ts` `sampleBirthDates` | engine ×4; browser: in "Couple, two children" the 8-year-old does not get IMM 5707 from 18, the adult does |
| 2 | A field's error clears as soon as that field is edited | `pages/workspace/forms.tsx` `clear()` | browser |
| 3 | The deciding answers name the person once, in the box title | `pages/workspace/preview.tsx` | browser |
| 4 | "Rules and checks" says "0 rules · 2 checks" | `pages/workspace/overview.tsx` | browser at 1440 and 1024 |
| 5 | The tab row wraps, so Sources is on screen at 1024 | `pages/combination.tsx` | browser: every tab's right edge is within the viewport |

## What S2 built
| Element | Where | Rule |
|---|---|---|
| SQR tab | `engine/runtime/sqr.ts` `sqrView`: the largest Sample family through `caseView` (agent mode). Per person role: questions by section, each with asked as, filled by (and whether it is set or "as placed"), needed by (forms), rule (read-only, "Open in the library"), where used. Coverage: needed = client + officer + gaps. API `GET …/workspace?tab=sqr&role=` returns the view, the library sections that can be added and the phone view. Web: `pages/workspace/sqr.tsx` with role chips, the coverage box, section rows that open, Add or Remove section (existing routes) and the phone view on the right. | C4.1, BR-7, BR-8 |
| Coverage blocks release | `engine/validate.ts`: one error per role and fact ("SQR"), naming the role, the field's meaning, the forms and the three fixes. The older "nobody is asked for it" warning is not repeated for those facts. A field that is not in the library stays the existing Field map error. Submit and approve already refuse errors. | BR-7 (P-62 §2, §5.3) |
| Filled by | Migration `20261025090000_screen03_filled_by` (expand only: `canonical_field.filled_by` CLIENT or CASE_OFFICER, null = "as placed"). `PATCH /library/fields/:key {filledBy}` goes through `revise()` (a draft version) and answers `where_used` (combinations and labels). Fields placed in the background, medical-background and security-history sections are refused (422 on the field; Sample list, `contracts/workspace.ts CLIENT_ONLY_SECTIONS`). Engine: the field's own choice wins in `isClientField` (client questionnaire) and in the renderer's coverage. Web: a select per question, with a confirm dialog "This changes the shared field everywhere" and "Change it in N combinations". | B2, RD-6, BR-9; Lead: `revise()` until LibraryChange merges |
| Sponsor | The role is accepted in the contract, `checkParticipants`, the people editor (files no application) and `render` (`who: "sponsor"`). Preview families include a sponsor when the combination has the role. The Sample "Applicant outside Canada" now has a Sponsor (Sample, for the immigration expert). | Lead, 25 Oct |

## Checks run
* `tests/check_screen03_engine.ts`: **46/46** (gate pass and fail per role, SQR view counts, a role outside the family such as the representative, filled by both ways and in the renderer's coverage, sponsor, Sample ages). Six mutations tried (gate as a warning, filled by ignored in the client questionnaire and in the renderer, no extra roles, no sponsor, no Sample ages); each is caught.
* `tests/check_screen03_s2.cjs` (new, own copy runtime_s32 :4433): **32/32**. It makes a real gap: an online-only Sample form, IMM 9001 (capture, second person, screen map), whose screen field is mapped to a new shared field nobody is asked for. The gap shows on the SQR tab, on Review and release (one error per role), and submitting is refused; placing the field clears it. API checks also cover filled by (pass, the client-only refusal 422, unknown value 400, non-author 403, back to null) and the Sponsor role (Sample data; an unknown role is refused). Browser checks at 1024 and 1440 cover the five changes, the filled-by dialog, read-only and empty states; axe: 0 serious or critical. Screenshots are in `screenshots/slice2/`.
* `tests/check_screen03_s1.cjs` gains Sample dates of birth on the real case, so the preview-versus-case comparison still compares like with like.
* `run-suites.sh --demo`: see the hand-back.

* `check_studio_browser.cjs` gains step B6b. Its from-scratch configuration was released with 42 new IMM 5476 fields that nobody is asked for, and the gate now refuses that. The step reads the gaps from the SQR tab and places each fact, as an author would: the data is fixed, never the rule. The step also found that the representative's facts were gaps with no chip on the SQR tab. `sqrView` now gives every role of the combination a person.

## Build discovery (in challenge.md)
An Online line still reads the PDF field map when the form also has a PDF version (`render.ts` takes the first map for the form code). An online-only screen field is therefore neither asked by a case nor a gap. The fix I propose (choose the map by the line's channel) changes what a case on an Online release asks, so it needs a Lead decision. Not changed here.

## Known gaps (next slices)
The SQR tab does not yet edit a question's placement or text: that is the library's job (Screen 04), and the rows link to the field. Answers carried by a link (Q1) come with S3. A case cannot add a Sponsor yet (runtime M3). The sponsor's own forms need the immigration expert.

## Fixes (S2 FIX) — 25 Oct, Lead note 10:05
| Finding | Fix | Test (fail before → pass after) |
|---|---|---|
| Re-check Blocker: "Filled by" added a second record (`canonical_field.filled_by`, written through `revise()` skipping a second person) | Migration `20261025090000_screen03_filled_by` removed (branch-only, never on main); the column, its `revise()` write, the snapshot key and the renderer/`isClientField` overrides are gone. "Filled by" reads the placement's `collectedFrom`, which the renderer already reads (`filledByOf(placement)`); the SQR cell is read-only with "Changes go through the shared library", keeps the where-used count and "stays with the client" for background and declaration sections (now also enforced in `isClientField` by section, however the question is collected). `PATCH /library/fields/:key {filledBy}` is refused in plain words until the screens lane's LibraryChange merges | f2: PATCH filledBy 200 → 400 "changes go through the shared library"; engine: officer placement, client-only section, questionnaire/document mapping; s2 browser: no control, words + count shown. check_screen03_engine 46/46 |
| D-1: `POST /combinations/:id/signoff` with no body → 500 TypeError | `body ?? {}` plus an action check, both 400 Problem Details in plain words | s2: signoff with no body → 400, not 500 |
| D-2: `submit` only needed the review duty; an approver submitting deadlocks release | `need(actor, "author")` server side; the Review page's submit button is gated on the author duty too. No suite submits as approver (all use user-A/AUTHOR, who holds it) | s2: approver → 403, content reviewer → 403; author still submits (all release flows green) |
| SC-4: "Filing: No forms yet" next to "2 forms attached as sources, 0 set up" | `summary()` names pending sources: `pending_sources` in the contract, filing reads "N attached as sources · none set up yet" when nothing is filed yet; the Overview Forms stat (now `data-filing`) says the same. Scout check updated: its locator predates the S1 tab split and the plural wording (`text=/attached as source/i`); the overview stat now carries `data-filing` | s2: fresh stream + sample attachment → `{"filing":"1 attached as source · none set up yet","pending":1}` |
| SC-5: "source-backed" jargon in the combination subtitle | Dropped from the facts line ("Sample (illustrative)" stays for illustrative combinations) | slice2 screenshots regenerated |
Also fixed: a latent flake in check_screen03_s2 (Review-and-release check read the page before navigation finished — waits for `**/review` now).
