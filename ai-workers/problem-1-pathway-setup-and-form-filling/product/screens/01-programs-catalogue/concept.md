# Screen 01 — Programs (combination catalogue)

Stage: **AGREED 21 Oct; amended after the builder's challenge (see end)** (applied on board S1: expandable tree, one program open by default, richer sample programs; answers to questions 1–4 as recommended). Boards on the design canvas "Pathway Configurator Screens": S1 (catalogue), S1b (new combination), S1c (selected combination), business rules, quality dimensions. Where this file and the canvas differ, this file wins.

## Job
A content publisher finds any combination in a few seconds, sees whether firms can use it yet, and starts or continues its setup. Journey step 1.1. SA-1B-50..56, 90..91; SA-1-12..15.

## Layout (Catalogue pattern, EXPERIENCE.md §3; boards in design/)
* **Header:** ExpatReady logo · "Product Studio · Pathway Configurator" · demo-only chrome (Prototype badge, Load sample inputs, Reset demo, Acting as) · **Pathway switch: Individual | Corporate** with counts.
* **Left menu (PRODUCT.md §3):** Configure: Programs · Shared library: Fields, Sections, Document types, Forms, Checks · History: AI work, Releases, Activity.
* **Draft bar:** "You are editing Draft 13 · 6 changes not yet sent for review" + "Review and release (6)".
* **Page:** title "Programs" + pathway name; description "Each row is one application a firm can open: Program › Category › Sub-category."; actions **Add program or category** · **+ New combination**.
* **Filter chips:** All · Ready · Needs work · AI proposals to review · In setup — each with a count. Search in the header covers combinations, form codes and documents.
* **Tree table (changed 21 Oct at founder's request):** one column holds the hierarchy with clear indentation — **Program** rows (shaded band, bold, 30 px chevron button, "N combinations" badge, category count, status summary chips, + Category / Rename) → **Category** rows (indented, own chevron when it has sub-categories, "N sub-categories" badge, + Sub-category; a category without sub-categories shows a "No sub-categories" chip and is itself a combination row) → **Sub-category** rows (indented further with an L-shaped connector). Only combination rows carry data: Forms (code chips + "+ Add") · Documents ("18 · 6 always · 12 if") · Questions ("164 · 18 sections") · Setup status (calculated chip + one next action) · Checked (date; orange when overdue). **One program is open by default** (Work permits; LMIA in the Corporate workspace) so the expand pattern is visible at first sight; **Expand all / Collapse all**; filters auto-expand matching rows. Linked combinations show "↔ Supported by …" or "↔ Follows …" under the name. Sample programs cover every kind of case in TAXONOMY.md (7 Individual programs, 4 Corporate).
* **Row click** → side panel (S1c): path, status chips, setup progress (Sources → AI draft → Your review → Release) with one primary action, Forms list with upload drop zone, what it asks for, who it applies to, sources checked, who can edit/approve, "Open full configuration".
* **+ New combination** → dialog (S1b): Step 1 Path (Pathway from workspace, Program, Category, Sub-category pickers; duplicate caught with "Open the existing combination"; "Will be created as …") · Step 2 Official sources (attach from Forms library or drop an IRCC PDF; checklist/guide upload; estimate for AI draft) · Step 3 Who and where (allowed locations, filing method and portal, person roles).

## Masters and links touched
Pathway (fixed) → Program → Category → Sub-category (optional) → **Combination** (leaf) → lines to Forms, Documents, Sections, Rules, Steps. Forms are library masters (`GovFormDef` + `FormEdition`). See domain/MASTERS.md.

## Business rules
BR-1 Pathway is a workspace switch; each program belongs to one pathway. · BR-2 Pick, never type; new masters only via "Add program or category" with duplicate check. · BR-3 The last level present is the combination; "Not applicable" when no sub-category; a category with sub-categories holds no setup. · BR-4 Nothing attaches above a combination. · BR-5 Location, family members and invitation stage are not levels (separate sub-category only when IRCC treats it as a separate application; expert decides). · BR-6 Unique name within a parent, ignoring case and spaces; rename keeps the stable key. · BR-7 Adding the first sub-category to a category that has setup asks where the setup goes; nothing is lost. · BR-8 Status is calculated (Ready = released + every form has a current edition + every person role has questions + every rule resolves). · BR-9 Disable, never delete; open cases keep their release. · BR-10 Counts say what they count. · BR-11 Freshness shown; next review +12 months; overdue orange. · BR-12 "+ Add" attaches a library form; an uploaded PDF creates the form or a new edition of the same code, then attaches. · BR-13 One AI place per combination (Setup status). · BR-14 Content publisher edits draft; a different person releases. · BR-15 Pathway = who is the applicant on the government form; a worker's application relying on an employer's LMIA sits under Individual and shows "Supported by: Corporate › LMIA" (domain/TAXONOMY.md §2). · BR-16 Multi-step journeys show "Follows / Followed by" links, never an extra level.

## Contract (to confirm in build)
`GET /catalogue?pathway=&filter=&q=` (one request, grouped) · `POST /program-nodes` (kind, parentKey, label) with uniqueness and parent-level checks · `POST /combinations` (path keys) returns existing on duplicate · `POST /combinations/:id/lines` (kind=FORM, formKey) · `POST /forms/upload` (PDF → code + edition detection) · status computed server-side.

## Tooltips
Not applicable — "This category has no sub-categories, so the category itself is the combination." · Ready — "Firms can open cases on this combination. Last released …" · Needs work — "Firms cannot use this yet. Click to see each missing item." · AI proposals to review — "AI read the forms and checklist and suggested fields, sections, documents and rules. Nothing changes until you accept." · Checked — "When someone last compared this setup with IRCC's published forms and guides." · + Add — "Attach a form from the library, or upload an IRCC PDF to add it to the library."

## Tests (minimum)
Each BR: one pass + one fail. Plus: first view < 1 s and filter < 200 ms with the sample programs (P-26); keyboard path through switch → filter → row → panel → New combination.

## Founder answers (21 Oct)
All four as recommended: separate programs per workspace; grouped (tree) with a flat sortable view as an option; existing setup moves into a new first sub-category; workspace label "Corporate and employers" (data value stays Corporate).

## Questions as asked (recommendation first)
1. Same program name in both workspaces? **Recommended: separate programs per pathway.**
2. Rows grouped by program, or one flat list? **Recommended: grouped, with a flat sortable view as an option.**
3. Default when the first sub-category is added to a set-up category? **Recommended: move the existing setup into the new sub-category.**
4. Workspace label for employers that are households (caregiver LMIAs)? **Recommended: "Corporate and employers"; data value stays Corporate.**

## What gets built — proof only (21 Oct; challenge O1–O16, founder Q1–Q3, scope trim P-26) — wins over anything above
Look: the team's existing layout, colours, components and words. Speed: first view under 1 s with the sample programs.
* **Release:** one shared draft and one "Review and release" button for everything (P-23); draft bar "Draft · N changes · Review and release".
* **Status:** one chip per row — **In setup · Not ready · Ready** (Ready = in the latest release and passes the startable check; Not ready opens the missing list) — plus one marker, "AI proposals (n)". Filter chips = these four, with counts.
* **Combination:** exactly one per last-level row; existing records converted simply; participants stay behind an adapter until Screen 03.
* **Forms:** row "+ Add" picks a library form; one upload component (row, panel, dialog) reads the form code and edition from the file and recognises an identical file (P-25). **Same code, different edition (P-32, Lead 21 Oct):** never replaces or attaches silently — it is held as "New edition — impact review needed" (the review itself is Screen 02).
* **Express Entry sample:** one category, sub-categories Profile and Permanent residence application, shown as "Step 1 of 2" / "Step 2 of 2" labels; the LMIA worker row shows "Supported by: Corporate › LMIA". Labels only, no link records.
* **Names:** duplicate name under the same parent refused on add (ignoring case and spaces).
* **Dialog:** step 3 prefilled and optional; last button "Create and draft setup (about US$x)".
* **Sample data:** must include the five demo combinations in `SCREENS.md` (P-29) (names as in the builder's `samples/programs.json`, which SCREENS.md now follows); other sample programs stay empty "In setup" rows.
* **Also:** keyboard-friendly tree; Checked = oldest source date; counts across all people on the row; plain-word sample descriptions.
* **Not built (team has it or will harden it):** rename, reorder, disable; "Split into sub-categories" (adding a sub-category under a set-up category is refused with a plain message); extra flags (Draft changes, In review, Check overdue, Disabled); normalised-name index; stored row summaries, virtual scrolling and 400-row speed tests; cross-workspace search hint; per-person draft counts; route and linked-category records.

## Layout v2 — founder and Lead, 21 Oct (P-35) — applied as a screen-only FIX after the build; wins over the tree layout above
* **Flat list, one row per combination.** Pathway stays as **tabs** (Individual · Corporate and employers, with counts), matching the team's ProgramTypeSwitcher; the breadcrumb starts at Program, only as long as it exists: "Visitors › Super visa"; "Family sponsorship › Spouse or partner › Outside Canada"; "LMIA › High-wage position". Route and link labels sit under the path ("step 1 of 2", "Supported by LMIA").
* **Sort order (always, also after filtering and search):** Program A–Z → Category A–Z → Sub-category A–Z, so related rows sit together; route steps keep their step order (Express Entry: Profile before Permanent residence application), not A–Z. No tree, no expand/collapse, no program summary rows, no "No sub-categories" tag.
* **Three columns only:** Combination · Status (In setup / Not ready / Ready; small warning only when a check is overdue) · Next step (one link, e.g. "Review 12 AI proposals", "See 3 missing").
* **Filters (change at early look, P-49):** **Needs work** (default: In setup, Not ready, and Live rows with a next step; falls back to All when empty). A row's one next step is the first that applies, in this order: Add sources · View AI progress · Review N AI proposals · Add N forms from the library · Draft setup · See N missing · See new edition · Review and release; none = no step (Lead, 23 Oct, from `nextActionOf`) · **Live** (status Live: firms can open cases, with or without a next step, so a row can be in both; founder F1) · **All** — each with its count — plus Program ▾, within the selected pathway. Status column sortable. "Ready" is shown as **Live**. Search with ⌘K.
* **Row click opens the combination page (P-50), no side panel:** the page header carries the full path with every level clickable (back to the list filtered to it), status and the key facts; Overview is the first tab (counts, what is missing, sources, forms). Back returns to the list with the same pathway, filters, sort and scroll, and the opened row highlighted. "+ Add form" lives on the combination page. Until Screen 03 is built, the existing configuration page is the target, with this header.
* **New combination = one path builder:** one field per level with type-ahead — pick an existing program/category/sub-category or "Create '…'" inline (duplicate check as BR-6); preview "Will be created as Individual › Visitors › Super visa"; optional "Linked to" (Next step of · Supported by) picking an existing combination. "Add program or category" as a separate button goes away. ("Describe it to AI" to propose the path is Screen 02.)
* **Team patterns (P-48):** page card + header breadcrumb, `FilterLayout` (search + Program filter + chips; "Needs you"/All as the status filter), bare table with 44 px rows and sentence-case headers, row opens a right panel (pinned header with status badge, footer Close left / Open combination right), toast variants with Undo; type sizes 12/14/16/18/24 only (`design/TEAM-PATTERNS.md`).
* **Chrome:** demo controls in one "Demo" menu; explanation behind a "?" next to the title; footer note removed.

