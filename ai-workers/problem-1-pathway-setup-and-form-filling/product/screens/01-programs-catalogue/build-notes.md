# Screen 01 — Programs: build notes

Builder, 21 Oct 2026. FINISH done to the screen-build checklist after the Lead's early-look Go (review.md items 1–9; P-49, P-50, P-51). Not committed (P-01). Earlier notes (data layer, slice 1, Top 5 improvements, proposals P1–P5): `product/history/screen01-build-notes-before-finish-2026-10-21.md`.

## The nine early-look changes — how each was done
| # | Change | Built | Test |
|---|---|---|---|
| 1 | No side panel; row opens the combination page; path clickable; Back keeps place | Row click or Enter → `/c/:id` (a not-started row: the author starts it, idempotent POST; others are told who does). Header path: Programs (Back) › Pathway › Program › Category › Sub-category, each a link to the list filtered to it (`under=` or `prog=`) with this row highlighted. Back restores pathway, view, sort, search and scroll, highlights and focuses the row. "+ Add form" is on the combination page (right panel). | browser: keyboard Enter, Back highlight + scroll, path link |
| 2 | Needs work · Live · All with counts; Ready shown as Live; sortable Status | `needsWork()` / `isLive()` in the engine: In setup, Not ready, or Live with AI proposals, draft changes or a held new edition. Status sort Not ready → In setup → Live (and reverse), `aria-sort`. | rules (property: never overlap), API, browser |
| 3 | Path on two lines, never cut | Muted "Program › Category" above, bold name below, both wrap. | browser: no ellipsis, no overflow |
| 4 | Sentence-case headers | Programs table, shared table and stat labels, left-menu groups. | browser: computed style |
| 5 | One Super visa; demo names | `Visitors › Super visa` (parent or grandparent is a condition); LMIA program named "LMIA"; Global Talent Stream one row; "In-home caregiver". | API, browser |
| 6 | Short draft bar | "Draft · N changes not yet released" + "Review and release (N)"; detail in its tooltip. | browser |
| 7 | Combination page clean-up | No technical key; no floating AI button (one AI place: Next step); facts in one muted line; status chip; Overview first with Missing, Held, Forms. | browser |
| 8 | New-edition hold (P-32) | Same code, different edition → `new_edition_held`: not in the library, not attached, not used; listed on every combination that uses the form; a Live row moves to Needs work with "See new edition". Review itself = Screen 02. | API (5), browser |
| 9 | One form intake (P-51) | `api/src/intake.ts`, `POST /intake` (1–20 files, optional combination), also behind the Sources upload and the sample loader. Per file, read from the file without AI (`tools/read_form_identity.py`): code, title, printed edition, published date, checksum, kind (form / checklist / guide). Outcomes: in_library · added (+ attached, "used by") · attached (guide) · new_edition_held · held (unreadable, or same edition from a different file) · refused (not PDF/HTML). New table `intake_item` records every file. Door 2 (Forms library, no combination) uses it unchanged. | API (17), browser |

## Choices made while building (small, technical; say if any should change)
* **The intake never edits a configuration.** An identical, already-mapped form uploaded on a combination is attached and offered as the next step ("Add N forms from the library"), one click, no AI. Auto-adding it silently changed demo draft counts (0 → 188) and bypassed the person.
* **Guides are sources, not library forms** (no edition to version): attached to the combination; refused on the library-only door with that reason.
* **Held editions are kept out of `form_edition` entirely**, so nothing that reads the library (plan, "+ Add", fill) can pick one up by mistake.
* The sample loader now goes through the intake (it stands in for a person), so sample forms enter the library at load; the release import fills the box map of the edition the intake added (match by checksum) instead of skipping it.
* `GET /combinations/:id/panel` renamed `/summary` (feeds the page header and Overview). API default filter stays `all` for other callers; the screen defaults to Needs work.

## Bugs found and fixed in FINISH (each has a test)
1. `checkedOf` crashed on the hand-fetched manifest date "2026-10-21T12:32:12Z (by hand, from Downloads)" → whole catalogue 500. Now leading ISO part only; invalid dates ignored.
2. After "Show all", the search box's delayed update rewrote the URL from a stale copy, dropping the view (and a pathway switch made just after). URL updates now always start from the current URL.
3. Combination page crashed (status chip outside the tooltip provider).
4. Header showed "22 draft changes" on an empty combination while the list and bar said none; now the same count as the list.
5. Accessibility (axe): "About this page" was a span with a label (now a button); clear-search target under 24 px (now 28 px).

## Files changed (studio = `prototype/studio/`)
* Data: `prisma/schema.prisma` (`IntakeItem`); migration `20261021200000_form_intake` (new table only; rollback in the file). Reset and its scope count it.
* Reader: `tools/read_form_identity.py` (kind, published date, saved web pages).
* API: `api/src/intake.ts` (new); `main.ts` (`POST /intake`, `GET /intake/held`, Sources upload → intake, `/forms/upload` removed, `/summary`); `programs.ts` (Needs work / Live, sort, `under`, held editions on rows, `pathKeys`, summary + held); `sources.ts` (old `uploadForm`/`attachSample` removed; library "used by" counts attachments); `demo.ts` (loader through the intake). Engine: `engine/programs.ts` (needsWork, isLive, compareStatus, Live wording, see_new_edition, date guard); `engine/import.ts` (fill an existing unmapped edition). Contract: `contracts/programs.ts` (live filter, `under`, `sort`, row fields).
* Web: `pages/programs.tsx` (rewritten: no panel), `pages/combination.tsx` (header, Overview), `components/forms.tsx` (FormIntake, IntakeResults, AddFormPanel), `components/ui/controls.tsx` (Panel; sentence case), `pages/sources.tsx` (intake, results list), `pages/library-forms.tsx` (door 2 uses the intake), `App.tsx` (draft bar, menu labels), `components/status.tsx`.
* Removed: `components/new-combination.tsx`, `add-node.tsx`, `combination-panel.tsx`, `combination-summary.tsx`, old tree-layout screenshots; `@tanstack/react-virtual` uninstalled (lockfile updated).
* Samples: `samples/programs.json`. Tests: `check_screen01_rules.ts`, `check_screen01_api.ts`, `check_screen01_browser.cjs` (rewritten), `check_ai_orchestration.ts` (Super visa key), `check_studio_browser.cjs` (Demo menu).

## Checks run (per STANDARDS section)
* Rules (§3/§7): `check_screen01_rules.ts` **44/44** (fast-check: Needs work and Live never overlap, 300 runs). Engine `check_engine.ts` **38/38**.
* API and database (§3–§6): `check_screen01_api.ts` **75/75** — every BR pass + fail, P-23 release, 17 intake checks (each outcome, many files in order, 21 files refused, approver 403, used-by), new-edition hold incl. Live → Needs work, filters, sort, path filter, one Super visa, slice-1 regression (an intake-added form plans an AI draft, not a failing library reuse). `check_grounding_db.ts` **29/29**; `check_ai_orchestration.ts` **22/22**.
* Browser (§7–§9): `check_screen01_browser.cjs` — **83/83**. 19 states × 1440 and 1024 in `screenshots/` (01–19), axe WCAG 2.2 A/AA on each, no sideways scroll at 1024, keyboard path, no console errors.
* Performance (§9, sample data): first view 175 ms with app files cached (cold headless browser 1056 ms); view change 67 ms in-page; filtered catalogue API 10–50 ms.
* Older studio browser suite: `check_studio_browser.cjs` **17 passed, then stops at A8** — the same place as before this build (two "Draft with AI" buttons on the Sources page make its locator ambiguous; Screen 02/03 territory). Updated for the Demo menu, `/summary` and the new facts wording.

## Team-name mapping, mock vs real
Unchanged from the data layer (history file). New: `IntakeItem` has no team equivalent; it maps to the team's upload/attachment audit plus a "held" state on the form edition. Real: PostgreSQL, uploads read by pypdf, releases, server authorisation. Simulated: people. **AI cost this build: US$0** (one replay of a saved run in the browser suite; no model call).

## Self-score D1–D16 (honest; the reviewer scores independently)
D1 4 · D2 5 (intake is one service, per-file results, DB-backed holds) · D3 4 · D4 4 · D5 4 (five bugs found and fixed here) · D6 4 · D7 4 · D8 4 · D9 4 · D10 4 · D11 4 (axe clean; screen-reader pass not done by a person) · D12 4 · D13 4 · D14 4 · D15 4 (sample scale only, P-26) · D16 4.

## Known gaps (not built here, by scope)
* Impact review of a held edition and releasing a new edition: Screen 02. Held items can only be listed today.
* Forms library list (code · title · edition · published · box map · used by · status) and bulk door-2 page: Screen 04 (the service is ready).
* Other screens still use capitals in a few headers (AI launch table, people editor, AI proposal page): their own screens.
* Two Lead decisions to confirm: the intake never auto-adds a mapped form (above); guides attach to a combination but are not library forms.
* Official forms fetch at this /next: 1 fetched, 9 failed (canada.ca refuses this machine; `official-sources/MANUAL-DOWNLOAD.md`).

## Earlier fix rounds
The FIX rounds of 21 Oct (CHECK), 23 Oct (Lead check) and 23 Oct (AI drafting check) are in `build-notes-earlier-fixes.md`.

## Closing fix pass and its extension (merged 1cb174a6)
The one FIX pass of 23 Oct, its two CHECK rounds and the P-74 extension are in `build-notes-earlier-fixes.md`.

### Small FIX after the merge (Lead note 24 Oct): QA-14, QA-17, Lead check L1–L3
| Item | Fix | Test |
|---|---|---|
| **QA-14 Major** same name created twice at once | `program_def.name_key` (the BR-6 normalised name, written by the app) with a partial unique index per parent (migration `20261024090000`; existing rows backfilled in SQL, earlier duplicates keep a null key so the index builds on any data; rollback written). A losing create is a 409 "already exists". | API: 4 at once → 201 + 3×409, the database refuses a twin, another parent allowed; qa `check_qa14_name_race.ts` PASS (20 × 4); migration replayed on data with duplicates |
| **QA-17 Minor** times without a date | `fmtWhen`: "today 9:57 a.m." or "Oct 21, 10:53 p.m." (year when not this one), on Recent steps, the review step and AI work. | browser (a step back-dated to 21 Oct) |
| **L1** grounding "finding 3" 404 | Cause: the check reads ids by SQL from the database named on its command line (default `xr_studio_grounding`); run against another copy's server it looked up a stale id. Reproduced (28/29, same message). The database checks (grounding, API, channels) now stop at the start when their database is not the server's. | wrong database → STOP with the reason; right one 29/29 |
| **L2** browser C2.7 wait | The step waits for the online-forms list to refresh; the Live-count step waits for the view to switch. | browser 136/136 |
| **L3** type errors | Command `tsc --noEmit -p api/tsconfig.json` (it includes `tests/`): 39 errors before (35 in `check_screen01_api.ts`, 4 in `check_ai_orchestration.ts`), **0** now. My earlier "type check clean" meant `api/src` and `web/src` only; it should have said so. `count-any` 437 (baseline 437). | — |
**Checks (fresh copies, stopped after):** rules 65 · API 133 · channels 42 · browser 136 · race safe · grounding 29 · forms 106 · engine 38 · AI drafting 48.

**CHECK round 3** (reviewer: Ship, 9/10, 3 Should; breaker: 0 Major, 7 Minor), fixed: names in other scripts keyed by the app, not SQL (the migration keys ASCII names only; `Programs.backfillNameKeys` keys the rest at start, so "कसन" is no longer refused against "किसान"); invisible and ignorable characters removed from names (no look-alike twins); every duplicate refusal carries the field error and the existing item; the path builder reloads its lists after a refusal; one sample load at a time (409, never a 500); one date format on the combination page; the database guard also stops on a database that does not exist; the "Program filter" browser step waits for the filtered list.
**Checks:** rules 67 · API 135 · channels 42 · browser 136 · race safe · grounding 29 · forms 106 · engine 38 · AI drafting 48 · qa QA-14 replay PASS · type check 0 errors (api incl. tests, web) · `any` 437.

### Fixes: small FIX after Screen 01 DONE (Lead note 24 Oct 20:20): QA-4, QA-20, QA-22
Each was reproduced on the code before the fix (same test, fixes stashed: QA-4 404 ×2, QA-20 413 px, QA-22 the non-author message seen while the session loaded), then passes. Test: `studio/tests/check_screen01_smallfix.cjs` (one isolated copy; QA-22 on its empty catalogue first, then it loads the sample inputs; 11 checks).
| Item | Fix | Test |
|---|---|---|
| **QA-4 Major** downloads 404 in lane copies | `api/src/main.ts`: both `res.download` calls (source files, filled PDFs) pass `dotfiles: "allow"`, as the page routes already did. Safe: the paths come from the server's own rows, never the request. While there: a stored file that is gone (`ENOENT`) answered 500 "Server error"; it now answers the plain 404 "Not found (it may have been removed by a reset)" (the dot-folder refusal used to hide this). | source file and filled PDF under a dot-folder → 200 with the file (404 before); unknown id → 404; file gone → 404 with the plain reason (500 before) |
| **QA-20 Minor** combination page 413 px at 400 px | `components/channels.tsx`: the Portal group (label + select) gets `min-w-0 max-w-full`, so the select shrinks inside the row instead of being as wide as its longest option ("Representative Permanent Residence Portal"). | 400, 390 and 1024 px: page width ≤ viewport, select inside it; 400 px with the longest portal chosen |
| **QA-22 Minor** author sees non-author text while the session loads | `pages/programs.tsx`: the page shows its loading skeleton until the person is known (`knowsPerson`: session loaded or failed); the header's New combination tip reads "Loading…" meanwhile instead of "Only a configuration author…". A failed session still falls back to the non-author view (nothing an author-only route would allow). | session held 1.5 s: the author never sees "A configuration author adds combinations here" (polled every 50 ms), then sees their own message and an enabled New combination; control: the content reviewer still gets the non-author message and a disabled button |

Observations, not fixed (outside the three items): at 360 px the combination page is 384 px wide from other parts of the page (tabs row and forms table sit in their own scroll areas, the extra width comes from elsewhere); the standard is 400 px, so it is noted, not changed. After syncing main, `tsc --noEmit -p api/tsconfig.json` shows 14 TS1470 errors (`import.meta` in CommonJS) because main's studio `package.json` no longer says `"type": "module"`; none is in a file this pass changed (Lead: the toolchain file is shared).

**CHECK round on 12af01a** (reviewer: Ship, journey 9/10, 0 Must, 3 Should; breaker: 0 Blocker, 1 Major, 5 Minor) → FIX in the same pass. Every new check below fails on 12af01a (10 FAIL, fixes stashed) and passes now (`check_screen01_smallfix.cjs` 23/23).
| Finding | Fix | Test |
|---|---|---|
| **Break K1 Major** Portal (and Filed as) unusable by keyboard: a save, draft change and toast per arrow press; disabled while saving, so focus fell to the page | `channels.tsx` `usePick`: a pointer pick saves at once; arrow keys only move the choice, saved after 0.8 s still or when focus leaves; the select is never disabled while saving (focus stays); saves run one at a time, each `from` the last saved value; a refusal puts the saved value back. Was there before this pass. | 3 arrows → 0 saves, focus kept; then 1 save of the shown value; pointer pick saves at once; Filed as: 2 arrows → 0, Tab → 1 |
| **Break m1** Programs skeleton forever when the session never answers | `lib/api.ts` `useSessionView()`: `known` once the session answered or failed, or after 4 s; Programs and the combination page use it. | session never answers → the catalogue shows |
| **Break m3 + review should 2** a refused/failed/empty session told the author they are not an author; "server is not answering" for a 401 | Programs uses neutral words when there is no person ("The studio could not tell who you are…"); App's notice: < 500 → "The studio did not accept the simulated person", 5xx or no answer → "not answering", 200 without a person → "The studio answered without a person". | 401, 500, 200 HTML: each its own notice, no non-author words |
| **Break m2** screen-reader count announced under the skeleton | the count waits for the person too | (covered by the m1/QA-22 runs; no separate check) |
| **Break m4** combination page: Portal and channels first read-only, then selects | Overview's forms wait for the person (`known`) | session held 1.5 s: Portal never shown as read-only words |
| **Break m5** ENOTDIR and a NUL byte in an id → 500 | `ProblemErrors`: ENOTDIR (status 404) and Postgres "invalid byte sequence" are the plain 404 | path through a file → 404 plain; `abc%00def` → 404 |
| **Review should 1** forms table cannot be scrolled by keyboard at 400 px (axe serious, pre-existing) | `ui/controls.tsx` `Table`: the scroll box is a focusable region named after its headings | axe `scrollable-region-focusable` at 400 px: none |

Not changed, with reasons: break m5 a directory or empty stored path answers 404 "Cannot GET" (Express's own words, not the plain reason; only reachable with a hand-edited row); a source uploaded as `.env` downloads under that name (the stored name is checksum-prefixed, so nothing is exposed); any role can download source files: the "deny by default" item already with the Lead. Review should 3 (`graph.mjs` cannot read ``fetch(`${BASE}${url}`)``, so the two download routes show as G3 untested) is a Lead tool: proposed to the Lead.
