# F3 — Add a form: build notes (forms lane, slices 1–4 of `plan.md` §9; 26 Oct 2026)

Built after the Lead agreed the plan (Q1–Q4) and merged Pass A + B. Backend path (P-68): each slice has its own commit and check. US$0 throughout: stub passes, replayed saved answers and fixtures only. Every count, label, screen and portal behaviour is **Sample**; a paid representative filing through the APR Portal is **Unconfirmed: no counsel**.

| Slice | Commit | Check |
|---|---|---|
| 1 · F3a-0: section groups, Sample labels, coverage, `isScreenInput` | 8f4ea2c | `check_forms_f3a0.ts` 15/15 (pure) |
| 2 · F3a-1c: second-draft guard | 6f671d1 | `check_forms_f3a1c.ts` 20/20 |
| 3 · F3c-1 without X4: one open capture, Studio start, X1, X3, X5, X6 | eb5c78d | `check_forms_f3c.ts` 26/26 |
| 4 · F3c-2: X8, X9, X10, X12 | f9e748d | `check_forms_f3c2.ts` 17/17 |
| PR #35 review fix: our manifest AND nothing but build files | 715c639 | `check_forms_apr.ts` 50/50 |
| Fixes after CHECK (below) | this stage | f3a0 17/17, f3a1c 27/27, f3c 31/31, f3c2 20/20, f2c_fill 20/20 |
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

## Fixes after CHECK (26 Oct; review.md: Ship after fixes, journey 8.5/10, 0 Must, 1 Major, 6 Minor; break-report.md: 0 Blocker, 5 Major, 9 Minor)
Each fix has a test that fails without it.
* **Review Major 1 + break M5 · the finish summary called partly seen sections "not seen".** `screenCoverage` now gives each section's `total` and lists only sections with a form field no captured question matches. The panel says "PDF form fields no captured question matches yet: Marital status and spouse: x of y form fields", or "none of its y". It counts the questions on the captured screens that nothing matches yet ("a person maps them on the screen map after approval"), so a captured spouse screen whose questions are not mapped yet is explained rather than called "not seen". Checks: f3a0, f3c.
* **Break M1 · Undo on a screen swapped in place.** Undo sends the screen it filled; the content script compares it with the page (`sameScreen`) and clears nothing when another screen is shown, and the panel says so and drops Undo. Check: f3c2.
* **Break M2 · two open captures through a held one.** A capture held for the second person counts as the open one: a new start returns it (200, reused, "held for a second person"), so a later return never leaves two. Check: f3c.
* **Break M3 + review Minor 1 · a start from another combination.** A capture started in the panel with no combination takes the Studio start's. A start from another combination continues the first one, and the Studio now says whose ("Already started in the extension for Visitor visa … one capture per form and portal serves every combination once approved"). Check: f3c (API).
* **Break M4 · the guard bypassed by a newer failed or stub step.** A source's draft is its newest field-map step that is **not a stub pass and did not fail or stop**. A newer failed draft, a failed "add from the library" or a stub pass no longer hides a draft waiting with proposals; a newer applied draft still supersedes it. This replaces the slice-2 "newest step" rule (plan D4 said "newest"; the breaker showed it lets a second paid draft through). Check: f3a1c.
* **Break m1 · deadlock (HTTP 500) on two launches of the same files in opposite order.** Every file's lock is taken first, in one order; the loser gets a 409 in words. Check: f3a1c (three rounds, Visitor visa and Super visa).
* **Review Minor 5 · the guard's queries per source.** One set of queries per plan (`mappingIndex`), shared with the launch's re-check.
* **Break m2 · "ABC 123" and "ABC123".** One capture: the form compares as the library compares codes. Check: f3c.
* **Break m3 · a heading of symbols only.** The panel keeps such a heading's own text as its identity, so "—" and "•••" are two screens.
* **Break m5 · the page's own outline, and an unticked box.** The outline the page had is put back after Undo; "not ticked" on a box already not ticked is "left alone", never "filled". Checks: f3c2, f2c_fill (also Undo on radios, selects and checkboxes).
* **Break m6 · element ids through the capture-token task list.** Each change is the approved question's words and what changed; a screen the version lacks is counted, not listed. Check: f3c2.
* **Break m7 · "Capture A screen that is not in the approved version again".** Now "Capture the new screen · IMM 5257".
* **Break m8 · element ids and formats.** `screenProblems` checks each input's element id (`idLooksLikeClientDetail`) and its format pattern like its texts; a passport-like id or an email in a pattern is refused (422) and nothing kept. Check: f3c.
* **Break m9 · the PDF edition chosen by label text.** `screenMapContext` orders PDF editions with `compareEditions`.
* **Review Minor 2 · "Capture <screen> again" into a capture that already holds it.** The panel says to remove that screen first, then capture it again.
* **Review Minor 3 · the Studio footer at 1024 px and 200 % zoom.** Its three buttons wrap.
* **Review Minor 4 · counts after a one-screen re-capture.** The summary counts this capture's own screens and questions and says how many the version holds.
* **Kept, with reasons:** review Minor 6 (`elsewhere.job_href` is not shown yet: the rail, F3b, links it); break m4 (the "New screen" prompt can go stale when the portal changes a screen in place; it only names a screen, and "Capture this screen" always reads the page as it is now). Break M3's other half: the reused capture is listed under the combination it was started for, not under every combination (the approved online version belongs to the library and serves them all).

## Not in this stage
* Slices 5–8 (`engine/queue.ts`, `?form=`, `Problem.forms`, D7 warning, `formProgress`, the asked-differently routes, X4 live coverage) wait for the runtime lane's Screen 03 merge and the screens lane's agreement on `review-queue.ts` (Lead response Q3).
* DEMO row 1's approval waits for the runtime lane's `demo.ts` change (Lead: option a).

## Running the checks on the Mac
The suites ran one at a time in isolated copies with output kept outside the repository. `timeout` is a perl stand-in on PATH for these runs only; nothing was installed. Each run's ledger lines, launch tickets, evidence files and screenshots were put back afterwards, so only source and checks are committed.
