# Screen 01 — Programs: build notes

Builder, 21 Oct 2026. Built to concept.md "What gets built" (P-26) with O1–O16 and P-23..P-25. **Paused by the founder** when Layout v2 (P-35) arrived: back end, engine and sample data are done and tested; the screen layer is superseded and goes to FIX. Not committed (P-01).

## FIX — Layout v2 from the journey board, steps 1–2 (founder, 21 Oct, R-49)
Founder agreed journey steps 1–2 in principle. The board (`product/design/journey-v2.dc.html`, now v3, P-43) is the **intent, not a pixel spec** (P-44): flow, structure, words and behaviours kept; details improved with the team's real components (newest capture `code/ERv2-frontend@5ccd9fa-2026-10-20`). Order: regression fix → first slice → early-look screenshots → stop.

### Top 5 production improvements over the board (written before coding)
| # | Board | Built instead (why) | Scope |
|---|---|---|---|
| 1 | Pathway as underline tabs | The team's **ProgramTypeSwitcher** pattern (segmented control, `role=group`, `aria-pressed`) with the same two choices and counts, under the title where the board has the tabs. P-35 names this component; same behaviour. | Needed for the proof · capability |
| 2 | Rows are `div`s; "Next step" is `<a href="#">` | One keyboard-reachable list: one tab stop, ↑/↓ moves, Enter opens the panel; **Next step is a real button that does the step** (opens proposals, the missing list, the sources, the configuration). Pathway, filter, program, search and the open row live in the URL, so Back and refresh return to the same view. | Needed · capability |
| 3 | Panel always beside the list | Beside the list on wide screens (as drawn); on narrower screens (< 1280 px) the same panel opens as the team's right-hand **Sheet** (their MobileDetailSheet pattern), so the list never squeezes. "See N missing" opens the panel with the missing list shown (the board names the link but has no list). | Needed · capability |
| 4 | Path fields are static boxes | Each level is the team's **SearchablePicker** behaviour (type-ahead over existing names, Escape closes the list only) plus an inline **Create "…"** option. The hint under each field ("exists · 2 combinations" / "new · no duplicate found") uses the server's own name rule (BR-6). The server re-checks and creates the **whole path in one request**, checking every level before writing anything, so a refused level never leaves a half-made program behind. | Needed · capability |
| 5 | Search box is a picture | Real search (names, form codes, documents) on the server, focused with **⌘K / Ctrl+K**; results keep the Program › Category › Sub-category order; a matching form code shows under the row ("Matches: IMM 5532"); the shown count is announced to screen readers. "Needs you" falls back to All when empty, with a one-line notice. | Needed · capability |

### Proposed, not applied (flow, scope or wording — Lead/founder to decide)
* **P1 New combination as a Sheet.** The team's standing rule is "every field-collecting pane is a Sheet"; the board draws a full page. Built as the board (a page); a Sheet is a one-hour change if wanted.
* **P2 "Describe the application" + "Propose with AI"** are left out until Screen 02 (P-41: no dead button). Step 2 opens straight on the by-hand path builder; "Forms found in the library" and the AI note belong to the AI proposal and come with it.
* **P3 "Rules" in the Shared library menu** (board, P-37) is not added: no page exists yet, so it would be a dead link. Add with the central Rules list.
* **P4 "Needs you" definition** (board implies, nothing writes it down): a combination needs you when it has AI proposals waiting, is Not ready (released but missing something), or a new form edition is waiting for impact review. Plain In setup with nothing waiting does not. Lead to confirm.
* **P5 Next-step words** taken from the board: "Review N AI proposals", "See N missing", "Add sources", "Draft setup", "Open". Words with no board equivalent kept: "View AI progress", "Add N forms from the library", "Review and release".

### Slice 1 — built 21 Oct (early look; no tests or polish yet, P-42)
* **Regression fixed:** `api/src/ai.ts` `plan()` now counts only library editions **with a box map** as "Add from library", so a fresh upload plans an AI draft, not a reuse that fails. Test for it: in FINISH.
* **Step 1 (Programs):** flat list per P-35 — pathway switch with counts, "Needs you" (default, falls back to All with a notice) · All · Program ▾, ⌘K search, three columns, sort Program › Category › Sub-category with Express Entry steps in step order, next step in the board's words and working, notes under the path (link, "N AI proposals to review", "New today"), summary panel (path, status, Forms/Questions/Documents/Rules, form codes, Checked against IRCC, missing list, Open full configuration, + Add form), sheet below 1280 px. Demo controls in one "Demo" menu; the header pathway switch and footer note are gone.
* **Step 2 (New combination):** page at `/new`, by hand: Pathway, then type-ahead Program / Category / Sub-category with inline Create, "exists · N combinations" / "new · no duplicate found" / "exists: choose it", existing combination caught with "Open the existing combination", optional Linked to (Next step of… / Supported by…, saved as the row's label), "Will be created as …", "Create and add sources" → the combination's Sources tab.
* **API:** `GET /catalogue` adds `rows` (flat, sorted), `programs`, `needs` counts, `program` filter, fallback flag; `GET /path-options`; `POST /combinations/path` (checks every level, then writes); rules count on rows; next-step labels from the board (`engine/programs.ts`).
* **Files:** `contracts/programs.ts`, `engine/programs.ts`, `api/src/{programs,main,ai}.ts`, `web/src/pages/{programs,new-combination}.tsx` (new page), `web/src/components/combination-summary.tsx` (new), `web/src/App.tsx`.
* **Evidence:** 16 screenshots in `screens/01-programs-catalogue/screenshots/slice1/` from an isolated copy (sample programs + one replay of a saved real run on Super visa › Parent, no model call, **US$0**); no console errors; first view 298–857 ms. Rules suite still 32/32; other suites not rerun yet.
* **Not done yet (FINISH, after Go):** tests per rule for the new API and screen (and update the API suite for the new next-step words), regression test, loading/error/empty states checked, axe and keyboard pass at 1440/1024, remove superseded files (`components/new-combination.tsx`, `add-node.tsx`, `combination-panel.tsx`), drop `@tanstack/react-virtual`, then CHECK.
* **Board items not in this slice:** "Review new edition impact" (the P-32 new-edition hold is still not in code; its review is Screen 02); "Propose with AI" (P2 above).
* **Seen while building:** long paths shorten the breadcrumb, never the combination's name (the "›" before the name can be cut with it); the official-forms fetch failed at this /next (canada.ca drops the connection from this machine, HTTP/2 and HTTP/1.1), 10 IRCC files still pending.

## Status at pause
| Part | State |
|---|---|
| Data, migration, DB guards | Done, tested |
| Rules engine (status, startable check, counts, freshness, next action) | Done, tested |
| API + shared zod contract + Problem Details | Done, tested (one regression, below) |
| Sample programs as an import file | Done (7 Individual, 4 Corporate) |
| Screen (tree table, panel, dialogs, draft bar, menu) | Built on the tree layout; **superseded by Layout v2** |
| Browser pass (axe, keyboard, timings, all screenshots) | Partial: stopped mid-run; redo on Layout v2 |
| Reviewer + breaker | Not run (stage never reached REVIEW) |

## Files changed (studio = `prototype/studio/`)
* Data: `prisma/schema.prisma`; `prisma/migrations/20261021150000_screen01_combinations/` (renames composition → combination keeping every record; one combination per last-level node; `pack_version` + `config_release.pack_version_id`; `program_def.link_label`; `form_edition.stored_path`; two level triggers; rollback written in the file). Verified: migrations replay to the schema with zero drift.
* Contract: `contracts/programs.ts` (zod; shared by API and web; name normalising lives here once).
* Engine: `engine/programs.ts` (pure). Rename composition → combination across `engine/`, `api/src/`, `web/src/`, `tests/` (516 places).
* API: `api/src/programs.ts` (new); `main.ts` (routes, Problem Details filter); `studio.ts` (one publish path for both release routes, pack versions, locations, shared name rule); `sources.ts` (form upload to the library, library form list, apply/attach accept an edition without a map); `demo.ts` (reads the sample file; pathways always present). Removed `catalogue.ts`, old rename route, dead `tree()`.
* Reader: `tools/read_form_identity.py` (code + edition from the PDF itself, pypdf, no AI).
* Samples: `samples/programs.json`.
* Web (tree layout — superseded): `pages/programs.tsx`, `pages/release.tsx`, `pages/library-forms.tsx`, `components/{combination-panel,new-combination,add-node,forms,status}.tsx`, `components/ui/{tooltip,skeleton}.tsx` (team copies), `App.tsx` (exact menu, draft bar, pathway switch), `lib/api.ts`, `styles/index.css`. Removed `components/new-configuration.tsx`.
* Tests: `tests/check_screen01_rules.ts`, `tests/check_screen01_api.ts`, `tests/check_screen01_browser.cjs`, fixture `tests/fixtures/screen01-work-permit-release.json`; adapted `check_grounding_db.ts`, `check_ai_orchestration.ts`, `check_studio_browser.cjs`.
* Toolchain (founder yes, 21 Oct): `@tanstack/react-virtual` 3.14.6 (unused after P-26; removable) and `@axe-core/playwright` 4.4.1 (axe-core 4.14.0), team-pinned, in `.tools/solution-1-prototype/studio-node`.

## Team-name mapping (retrofit)
`Combination` (table `combination`) = the team's leaf `ProgramDef` plus its configuration rows; `PackVersion` = `CountryPackVersion`; `ConfigRelease` = row snapshot inside a pack version (adapter); STREAM/CATEGORY shown as Category/Sub-category (label adapter, enum unchanged); `participants` kept behind an adapter until Screen 03 (role lines). Snapshot JSON key renamed `composition` → `combination`.

## Mock vs real
Real: PostgreSQL, migrations, triggers, uploads read by pypdf, releases, authorisation per persona. Simulated: people (persona switch). AI: no paid call; replay of saved runs only. **AI cost this build: US$0.**

## Checks run (per STANDARDS section)
* §3/§7 rules: `check_screen01_rules.ts` **32/32** (incl. fast-check property on names); mutation spot-check — removing 4 rules each made a test fail.
* §3–§6 API and database: `check_screen01_api.ts` **58/58** on an isolated copy — every BR with pass and fail (BR-5 is an expert rule, no code; BR-7 = refused per P-26; BR-9 = delete refused by the database), P-23 release (author refused, self-approval refused, stale draft refused, held-back rows), P-25 uploads (new form, identical file, new edition, checklist/HTML/unreadable refused), authorisation 403s, Problem Details.
* Older suites: `check_engine.ts` **38/38**; `check_grounding_db.ts` **29/29** (adapted: rename of a program dropped per P-26; a legacy row on a program is now refused by the database itself); `check_ai_orchestration.ts` **22/22**; `check_studio_browser.cjs` — see "Older browser suite" below. `check_catalogue_scale.cjs` + `fixtures/scale_100.ts` retired: 400-row scale is the team's (P-26).
* §9 performance (sample data): first view **434 ms** in the browser; filtered catalogue API 2 ms; first uncached compute ~140 ms.
* §7 axe: clean on the 5 states captured before the pause, after the token fix below; one open finding (label-in-name on "+ Attach or upload form") on the tree layout.

## Build discoveries (need the Lead or the team)
1. **Team token fails WCAG AA.** `--color-text-muted` (#737373) on `--color-surface` (#f7f7f7) is 4.42:1, 4.08:1 on the switch track, although the team's tokens.css says 4.96:1. Prototype light sheet uses neutral-700 (#595959, 6.5:1), as the Lead's boards do (`web/src/styles/index.css`). Team should fix the token.
2. **IMM 5475 edition label.** The manifest says IMM 5475 (12-2022); the file itself prints (05-2021). Uploads now read the file, so the library would say 05-2021. The immigration expert should confirm which file is current.
3. **Pathways are fixed values**, so the server always creates both (Individual; Corporate and employers); before this, an emptied workspace could not get its first program.

## Small technical choices
* Status of a released row is judged on its released snapshot; the draft only explains In setup.
* Pack release holds back rows whose draft has errors and releases the rest; the older per-row review/approve path now also creates a pack version, so "in the latest release" means one thing.
* The SME sign-off of the per-row review is not part of the one-button pack release (Screen 06 owns release review).

## What Layout v2 (P-35) supersedes
Tree table, program/category group rows, expand/collapse, "one program open by default", "No sub-categories" chip, column set (Forms/Documents/Questions/Checked in the table), filter chips (All/Ready/Not ready/In setup/AI proposals), the "Add program or category" button and dialog, the 3-step new-combination dialog, the footer note and the separate demo buttons. **Kept**: catalogue API (sort and "Needs you" to add), panel content, shared form picker/upload, draft bar, release page, status/next-action rules.

## What remains (FIX: apply Layout v2)
1. **Regression to fix first:** `api/src/ai.ts` `plan()` counts any library edition with the same file as "add from library"; since uploads register an edition before it has a box map, a fresh upload plans a library reuse that then fails ("boxes are not mapped"). Fix: only editions with box maps count (`maps: { some: {} }`). This is why the AI-proposals marker never appeared in the browser run.
2. Screen: flat list per P-35 (pathway tabs, breadcrumb path, A–Z sort with route steps in step order, three columns, "Needs you" default + Program filter, ⌘K search, panel with "+ Add form"), path-builder new combination with inline "Create '…'" and optional "Linked to", Demo menu, "?" help.
3. API for P-35: sort order and route-step order, "Needs you" filter and program counts, inline create in the path builder (reuse `POST /program-nodes`), "Linked to" (labels only unless the Lead says otherwise).
4. Browser pass on the new layout: every state at 1440/1024, axe, keyboard path, timings; then REVIEW.
5. Remove `@tanstack/react-virtual` if still unused.

## Self-score D1–D16 (back end and rules as built; screen not scored — superseded)
D1 4 · D2 5 (service + DB guards, idempotent create) · D3 4 · D4 4 · D5 4 (one regression above) · D6 4 · D7 4 · D8–D13 n/a until Layout v2 · D14 4 · D15 4 (sample scale only, P-26) · D16 4.

## Older browser suite
`check_studio_browser.cjs` (now runnable on an isolated copy via `STUDIO_URL`; it was already unfinished before this build): **17 passed, then stopped** at A8 — the visitor-visa Sources page shows two "Draft with AI" buttons, so the locator is ambiguous. A0–A7 pass on the new data (reset, load: 11 programs / 6 combinations / 24 files / 1 released, preview, IMM 1295 PDF fill and read-back, conditional document, SME sign-off, second-person release). Pass B not reached. Sources page is Screen 02/03 territory; check it with FIX item 1.
