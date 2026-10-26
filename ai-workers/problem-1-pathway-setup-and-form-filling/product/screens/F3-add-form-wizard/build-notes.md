# F3 — Add a form: build notes (forms lane, slices 1–4 of `plan.md` §9; 26 Oct 2026)

Built after the Lead agreed the plan (Q1–Q4) and merged Pass A + B. Backend path (P-68): each slice has its own commit and check. US$0 throughout: stub passes, replayed saved answers and fixtures only. Every count, label, screen and portal behaviour is **Sample**; a paid representative filing through the APR Portal is **Unconfirmed: no counsel**.

| Slice | Commit | Check |
|---|---|---|
| 1 · F3a-0: section groups, Sample labels, coverage, `isScreenInput` | 8f4ea2c | `check_forms_f3a0.ts` 15/15 (pure) |
| 2 · F3a-1c: second-draft guard | 6f671d1 | `check_forms_f3a1c.ts` 20/20 |
| 3 · F3c-1 without X4: one open capture, Studio start, X1, X3, X5, X6 | eb5c78d | `check_forms_f3c.ts` 26/26 |
| 4 · F3c-2: X8, X9, X10, X12 | this stage | `check_forms_f3c2.ts` 17/17 |
| PR #34 review fix: the build empties a folder only when it holds this extension's manifest | 2ee3642 | `check_forms_apr.ts` 49/49 |

## Slice 1 (D1 grain and key)
* `engine/twin.ts`: `sectionGroupOf` (the subform path without its page; `page1` in either case), `groupOfEntry` (a repeated row such as `PreviousCOR.Row2` has no section of its own in the inventory, so its group comes from its own form path), `sectionLabel`, `isScreenInput`, `screenCoverage(form, pdf, seen, askedDifferently)` keyed by (shared field, person). Only mapped form fields count, so "not a fact", "filled by hand", "never filled" and open ones never do.
* `contracts/forms.ts`: `SCREEN_MAP_OUTCOMES`, `ASKED_DIFFERENTLY` (outcome and the `@asked-differently:` data-path prefix), `AskedDifferently` (zod), for slice 8.
* **For the immigration expert:** `contracts/pdf-sections.json` holds Sample labels for IMM 5257, IMM 1295, IMM 5707 and IMM 5476, written from each group's headings in the official PDF. Confirm or reword them. One group has no label on purpose: IMM 5257 `TextField1` (a page-5 helper with 5 mapped fields), shown as "Other questions of IMM 5257". IMM 5707's grain is coarse (Section A holds the applicant, spouse and parents): the plan's rule (group = subform without the page) gives three groups for that form.
* Measured on the real files: IMM 5257's 66 section paths are 17 groups holding a form field (the plan estimated about 20).

## Slice 2 (D4)
* `ai.ts plan()`: after "in the library" and before "waiting for review", a file (checksum) being mapped in another source is skipped with where and how far ("Being mapped in Visitor visa: 12 proposals left · a content publisher. Its decisions are reused here once they are added to the draft; no second AI draft."), with `elsewhere {combination, job_href}`. It ignores `draftAgain`, so the form's own Draft setup button is refused too (409 from `launchSource`). "Being mapped" = the newest field-map step of that source, not a stub pass, queued, running or completed (proposals to decide, or decided and not yet added). An applied draft is in the library and is offered as "Add from library".
* `ai.ts launch()`: per target, an advisory lock on `draft:<workspace>:<checksum>` and a re-check inside the launch transaction; the loser gets 409 "Being mapped in …".
* **Small choice, stated:** a **stub pass** neither blocks nor is blocked. It is no draft to review (no AI, no proposals; D4 already leaves it out of "waiting"), and slice 2's own break B3 check runs two stub passes of the same IMM 5257 at once on purpose. The race check therefore uses two **replayed** drafts of IMM 5707 (its saved answer; its library map removed for the check).
* The check sets the other combination's drafting step into each state by hand (queued, running, 12 proposals, decided, applied, stub, superseded): a real non-stub draft of IMM 5257 would need a paid call, and it has no saved answer.

## Slice 3 (D6, X1, X3, X5, X6, BR-15)
* `forms.ts createCapture`: for `way: "extension"`, one open (OPEN or RETURNED) capture per workspace, person, form and portal, under an advisory lock; a second start returns it (`reused: true`, HTTP 200, its combination kept); the Studio route and the panel route both. `capture(id)` carries `combination {id, label}`; the panel's list puts a capture started in the Studio first.
* `forms.ts finish` returns `summary {screens, questions, pdf_edition, pdf_sections_not_seen[{group, label, questions}]}`, computed by `sectionsNotSeen`: the screen-map draft's own matching (`draftScreenMap`) on the finished record, then `screenCoverage`, minus groups marked asked differently. `draftScreenMapFor` and coverage share one `screenMapContext` (no behaviour change for the screen-map draft).
* Studio, "Add an online form": **Start the capture in the extension** (no files needed) creates the capture for this combination and says what to do in the extension; a second click says it is already started. The page never messages the extension.
* Panel: "Started in the Studio · Visitor visa"; X3, on each portal page load, reads the screen **on this computer only** and shows "New screen: Personal details" or "Already captured: … It is screen 1. Nothing was sent"; "Capture this screen" on an already captured screen opens no check. X5 lists each question (label, kind, choices); a refusal names the question and the fix ("open a blank application with no client's details…"). X6 shows the finish summary and a link to the capture in the Studio.
* **Changed on purpose:** `check_forms_f2d.ts` sent the same screen twice to get the server's "already captured". The panel now stops it before sending, so that check now asserts the panel's wording and that nothing was sent. The server's own answer stays, and `f2a_api` covers it.
* New Sample fixture `portal-apr/apr-vv-hostile-option.html` (a choice carrying a passport number).

## Slice 4 (D8, X8, X9, X10, X12)
* `GET /api/extension/capture/recapture-tasks` (capture token): open tasks with form, title, portal, screen, kind, differences and times; never the affected cases. A fill-only token gets 403; the Studio's `GET /api/extension/recapture-tasks` is unchanged. Panel, capture mode: "Screens to capture again" › "Capture Personal details again · IMM 5257", which starts or continues the capture of that form on that portal (D6) and names the screen.
* X9: fill results in three groups (Filled · Confirm in the case first · You answer on screen), each with its source. An answer to give or confirm links to the case (`/cases/:id`). **Gap for the runtime lane:** the case page has no address for one section, so the link opens the case and the words name the section.
* X10: the content script outlines each input it wrote (no ExpatReady text in the page) and keeps the last fill's inputs in that page's memory only. "Undo this fill" clears the ones still holding what it wrote and keeps any a person changed. A new page starts with nothing to undo, and the panel drops Undo when the tab moves.
* X12: "Connected until 18:40" (local time) in the panel footer, from the session's own end.

## Not in this stage
* Slices 5–8 (`engine/queue.ts`, `?form=`, `Problem.forms`, D7 warning, `formProgress`, the asked-differently routes, X4 live coverage) wait for the runtime lane's Screen 03 merge and the screens lane's agreement on `review-queue.ts` (Lead response Q3).
* DEMO row 1's approval waits for the runtime lane's `demo.ts` change (Lead: option a).

## Running the checks on the Mac
The suites ran one at a time in isolated copies with output kept outside the repository. `timeout` is a perl stand-in on PATH for these runs only; nothing was installed. Each run's ledger lines, launch tickets, evidence files and screenshots were put back afterwards, so only source and checks are committed.
