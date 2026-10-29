# P-156: forms library first, the checklist page stored per combination (plan for the Lead; forms lane, 29 Oct; no code)

**Decision:** P-156 (on `lead/2026-10-29-r9`, `f70d4a14`). Research: `screens/W1-shared-library/research-ai-layering.md`. **Code read:** this branch (slice 0 and the runner on top of main). Which forms a combination files is Sample until the immigration expert confirms it.

## 1. Re-check: what exists
| Piece | Today (file) | P-156 |
|---|---|---|
| IRCC's master list | `engine/canada.ts parseFormsIndex` reads the canada.ca forms index into rows (code, title, form page) and packages; the finder reads it at run time for the page pick and to find each form's page (`finder.ts` step 1 and step 5) | read **once into the library** (US$0), then again only to flag what is new |
| The application page | picked at run time: rules `sureMatch` over the packages, else the AI `find_guide` rounds (draft and checker), else the person picks; "remembered" only as the last run's result (`finder.ts rememberedPages`); guides linked as sources after the run (`guide-sources.ts linkFinderGuides`) | **stored on the combination**, proposed by rules, confirmed once by a person; no AI page pick at run time |
| Which forms apply | the `find_forms` rounds read the page and guide | the same rounds read the **stored checklist** and pick from the **library**, one paid call per combination (draft and blind checker count as that call's two rounds) |
| A form not in the library | downloaded from canada.ca at run time; on failure, "not found" | the same download; on failure "Download from this link and upload" with the form page's link |

## 2. Data
* `Combination` gains its official pages: `applyPageUrl`, `checklistUrl` (both canada.ca only, `engine/canada.ts officialUrl`), `pagesBasis` (RULES · PERSON · EXPERT), `pagesConfirmedBy`, `pagesConfirmedAt`, `pagesQuote` (the line the rules matched). Nullable; a combination with none says "Choose the application page" and nothing paid runs.
* `GovFormDef` rows from the index carry `listedOnIndexAt` and the form page; a row with no file yet is **"Listed by IRCC · no file yet"** (no PDF is downloaded in the bulk fill).
* Migration: each combination's remembered page (its last finished finder run) is copied into `applyPageUrl` with basis RULES and no confirmation, so the person confirms it once.

## 3. Rules (each with a pass test and a fail test)
* **P156-1 Bulk fill, US$0.** One action reads the recorded index into the library: every form number with title and form page; forms already there are matched by number, never duplicated; no AI, no PDF download. *Fail:* a row without a canada.ca form page is listed as "no page", never guessed.
* **P156-2 New editions flagged.** A later read of the index (or a form page's "Last updated") that differs from the library's edition marks the form "Newer edition on canada.ca" (today's M6 rule), never replaces it.
* **P156-3 Pages proposed by rules, confirmed once.** `sureMatch` proposes the apply page and its checklist with the matched line; the person confirms, or picks another from the index ("Choose another"). "Suggest with AI" stays an optional click (one round, cost first; P-138). *Fail:* no AI call runs without that click.
* **P156-4 The finder needs a confirmed page.** Without one it stops at once: "Choose the application page first", US$0, a link to the choice.
* **P156-5 AI picks from the library.** The two rounds read the stored checklist (and its guide); every form they name must be a library form or an index row; a number in neither is dropped and listed.
* **P156-6 Missing form.** A picked form with no file is downloaded from its canada.ca page; if that fails, the line says "Download from this link and upload" with the page link, and the upload is the ordinary one (rules read it, a second person unless it matches canada.ca's file).
* **P156-7 One paid call per combination.** A run sends at most the two rounds of `find_forms`; `find_guide` leaves the run (its prompt and schema stay, for the optional "Suggest with AI").

## 4. Screens
The combination's one-line choice ("Application page: Study permit, outside Canada · Confirmed · Change") is **screens'** to build, on the Forms tab or Sources, reading and writing the fields above through this lane's API: `GET/PUT /api/combinations/:id/official-pages` (author; a PUT is a confirmation with the person's name).

## 5. Slices (this lane unless named)
| Slice | What | Label |
|---|---|---|
| a | Bulk library fill from the recorded index (P156-1, 2): rules, a "Listed by IRCC · no file yet" status in the library | Capability |
| b | Official pages on the combination: data, migration, API, rules proposal (P156-3) | Capability |
| c | The finder without `find_guide`: requires a confirmed page (P156-4), reads the stored checklist, picks from the library (P156-5, 7) | Capability |
| d | Missing form: download, then "Download from this link and upload" (P156-6) | Capability |
| e | Screens: the one-line choice on the combination | Capability (screens) |
| f | Load sample: the six combinations' pages stored as confirmed Sample; replays unchanged for `find_forms` | Scaffolding |

**Tests:** a pass and a fail per rule in `check_forms_s4_finder.ts` and a new `check_forms_p156.ts` (index fill on the recorded index, the confirmation, the finder's refusal without a page, the library-only pick, the missing-form words); Start setup's checks updated for the stored page; US$0 throughout (recorded pages, fake launcher).

**Questions for the Lead:** (1) Fill the whole index (every IRCC form, about 400 rows) or only the forms the six combinations' guides mention? *Recommend:* the whole index, as listed rows without files (cheap, and "not in the library" disappears). (2) Does the checklist page sit beside the apply page, or is the apply page's own checklist enough? *Recommend:* both stored, the checklist optional where IRCC has none.
