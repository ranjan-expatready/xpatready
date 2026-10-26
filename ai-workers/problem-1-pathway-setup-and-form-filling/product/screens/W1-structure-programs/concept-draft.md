# W1-structure-programs — Structure, Programs list, New combination (W1-03, W1-04, W1-05) — DRAFT for the Lead

Stage: **Concept draft (designer agent, 26 Oct)** — the Lead edits and decides; not yet challenged, not shown to the founder. Boards: `design/draft-programs.html`, `design/draft-structure.html`, `design/draft-new-combination.html` (open in a browser; every element tagged Capability / Scaffolding and Needed for the proof / Not built). Before: `screens/W1-baseline/01–03`. Markers: **[F P-xx]** = followed that decision · **[GAP]** = decision missing · **[CONFLICT]** = two sources disagree.

## 1. Job and journey
A content publisher keeps one clean immigration structure (five levels) and finds, starts and continues every combination from one list, creating new ones only from that structure. Persona: content publisher (configuration author); approver reads only. Journey steps 1.1 (and 1.2 for Structure). SA-1B-50..56, 90..91; SA-1-12..15. Capabilities: C11.3, C11.4, C11.5 (config half), reworded C1.1, C1.2; C1.3 superseded by C11.5.

## 2. Ten layers — what exists, team code, what is new
| Layer | In the app today | Team code (`ERv2-frontend@5ccd9fa`, read-only) | New in this item |
|---|---|---|---|
| Masters | `ProgramDef` nodes PATHWAY(Individual/Corporate) › PROGRAM › STREAM(=Category) › CATEGORY(=Sub-category); `clientType` on PATHWAY | Same four node kinds, no client type ("Individual/Corporate" switcher is a mock) | Pathway type = fixed value on the Pathway node; new Pathway nodes (Temporary residence …) |
| Links | parent key; `linkLabel` text ("Supported by …") | parent key only | parent links only; `linkLabel` no longer written or shown [F P-106] |
| Configuration · Rules · Engine | unchanged | — | none (Structure carries no configuration; BR-3 of Screen 01 stays) |
| Contract | `GET /catalogue`, `POST /combinations/path` (create-or-pick per level + link), `POST /path-proposal` (rules) | node CRUD ports | `/structure` endpoints; path body keys only; proposal `mode` |
| Screen | Programs (filter tabs, two-line rows), New combination page | Hierarchy page: tree view + pane (Miller) view, segmented switchers | Programs redesign, Structure page, New combination redesign |
| AI assist | none on structure; path proposal rules only | — | AI "did you mean" on add/rename; AI path proposal; both through W1-07 run component [F P-110] |
| Governance | create audited | disable, reorder | add/rename audited; rename keeps key; nothing removed |

## 3. Data change (Lead decision, not a founder question) — Recommended: Pathway type as an attribute
* **Option 1 (Recommended): keep the team's four node kinds.** PATHWAY nodes become the real Pathway level (Temporary residence, Permanent residence, Citizenship…), each carrying `clientType` INDIVIDUAL | CORPORATE (labels Retail | Corporate and employers: an adapter, like STREAM = Category). Pathway type is a fixed list of two, never a node, never edited. Fits SA-1B-51 ("client type comes from the pathway") and fills exactly the gap the team's mock switcher names. Uniqueness: Pathways unique per (workspace, clientType, name key) — new partial index.
* Option 2: add enum value PATHWAY_TYPE above PATHWAY; today's two rows change kind in place. Simplest migration, but adds a node kind the team does not have and a level that is never edited.
* **Migration (expand → migrate → contract, STANDARDS §5):** expand — partial unique index for pathways; migrate — for each PROGRAM under the old Individual/Corporate row, create or find the Pathway node with that `clientType` from a lookup table (Sample: Visitors, Study permits, Work permits → Temporary residence; Economic immigration, Family sponsorship, Permanent resident documents → Permanent residence; Citizenship → Citizenship; Corporate LMIA, Employer offers, Compliance → Temporary residence; Designation and endorsement → Permanent residence), re-parent, then delete the two old rows (nothing attaches above a combination). A program missing from the table **stops the migration with its name** (no silent placement). Contract — `linkLabel` left unused, dropped later. Rollback recorded: recreate the two rows and re-parent by `clientType`. Reset then empties all of it anyway (P-108); Load sample writes the five-level Sample below (W1-11).

## 4. Sample structure (names **pending research**: `screens/W1-form-library/forms-for-5-combinations.md` Part B not yet written; TAXONOMY applied; every value Sample until the immigration expert confirms)
| # | Pathway type › Pathway › Program › Category › Sub-category | Why this shape |
|---|---|---|
| 1 | Retail › Temporary residence › Visitors › Visitor visa › *No sub-category* | Outside Canada is where the case is opened (allowed location), not a level (TAXONOMY §1) |
| 2 | Retail › Temporary residence › Study permits › Study permit › From outside Canada | Inside Canada is a different IRCC application, so location is a sub-category (expert confirms); fixes "Study Permit › Study Permit" |
| 3 | Retail › Temporary residence › Work permits › Employer-specific work permit (LMIA) › From inside Canada | Same reason; LMIA moves into the category because one sub-category level is left |
| 4 | Retail › Permanent residence › Provincial nominees › Permanent residence application (Express Entry) › Ontario | P-109: IRCC PR application only; "Ontario" stays only if the expert says forms or documents differ by province |
| 5 | Retail › Permanent residence › Family sponsorship › Spouse or common-law partner › Applicant outside Canada | TAXONOMY row 10 (IRCC files inside/outside as different classes) |
| 6 | Corporate and employers › Temporary residence › Labour market impact assessment (LMIA) › High-wage position › *No sub-category* | One Corporate Sample [F P-106]; **[GAP]** which Pathway employer applications sit under (expert) |

## 5. Business rules
| BR | Rule | Source |
|---|---|---|
| 1 | Five levels. Pathway type is the top tab, fixed: Retail (data value INDIVIDUAL; individuals and families) · Corporate and employers (CORPORATE); under it Pathway › Program › Category › Sub-category. | [F P-104], P-06, SA-1B-50 |
| 2 | Pathway, Program and Category are required; Sub-category is required only when the chosen category has sub-categories; otherwise the category is the combination ("No sub-category"). A category with sub-categories holds no setup. | SA-1B-55, Screen 01 BR-3 |
| 3 | New combination picks only from the Structure; a new name enters only through "Add to structure" (Structure page or the shortcut), with the same checks. | [F P-104], STANDARDS §3.2 |
| 4 | A name is refused when it matches a sibling ignoring case, spaces and punctuation (database index + service); Pathways compared within their pathway type. | Screen 01 BR-6, QA-14 |
| 5 | "Did you mean": close names (spelling within 2 letters, same words in another order or singular/plural) anywhere in the same pathway type and level, free, as you type; AI meaning check on Save ("TRV" ≈ "Visitor visa"). Warn, never block: "Use existing" or "Add anyway" (recorded in Activity). | [F P-104], EXPERIENCE §2.8–2.9 |
| 6 | Rename keeps the stable key and passes BR-4/BR-5; the new name shows in every trail at once; open cases keep the names on their release. Remove, move and reorder are Not built in wave 1 (rename fixes typos; Reset empties). | SA-1-12..15, STANDARDS §3.7, P-26 |
| 7 | Every list, header, preview and search result shows the full five-part trail, program in bold; a missing sub-category shows "No sub-category". | [F P-104] |
| 8 | Retail and Corporate are separate: own structure, combinations and search scope; no "Linked to" in New combination or configuration; Corporate shows tooltip examples only; the employer–worker link is on the case (W4). | [F P-106] |
| 9 | Path proposal mode: Rules then AI (default) · Rules only (never calls AI, US$0) · AI only. AI may propose new names, marked "new"; nothing is created until the person accepts; accepting new names runs BR-4/BR-5. | [F P-105] |
| 10 | Every AI run (meaning check, path proposal) states its cost before it starts, shows its steps and a progress bar by step, has Stop that ends spending, gives plain errors with the next step, is logged; demos replay at US$0. Works by hand with AI off. | [F P-110], W1-07, STANDARDS §4 |
| 11 | The same path twice opens the existing combination; never a second one. | C1.2, contract today |
| 12 | Family members, stages and inside/outside Canada are not levels unless IRCC files them as different applications (expert decides). | TAXONOMY §1 |
| 13 | The list shows every configured combination by default (no "Needs work" default view); status stays calculated (In setup · Not ready · Live). | Founder 26 Oct; **[GAP]** amends P-49 — record on agreement |
| 14 | Only a configuration author adds, renames and creates; everyone else reads, told why in the tooltip; enforced on the server. | STANDARDS §6 |

## 6. Layout options (EXPERIENCE §3; team tokens; boards show every state)
**Programs list (W1-04)**
* **A. Grouped list (Recommended).** Header: title, info, "Structure" (secondary) and "New combination" (primary, last). Row 2: segmented Pathway type control with counts (team `ProgramTypeSwitcher` pattern, filled active segment), search box beside it, then two dropdowns "Pathway: All" and "Status: All". One table, one 44 px row per combination: full trail · Status · Next step; light group rows per Pathway ("Temporary residence · 3"). Stats line "5 combinations · 1 Live · 1 Not ready · 3 In setup". Consequences: every combination visible at once, scans like the team's tables, scales to hundreds with search; replaces the filter-tab row.
* B. Cards per Pathway (columns of combination cards with status and next step). Modern look, but fewer rows per screen, weak at 100+ combinations, unlike the team's tables.
* C. Split view: Structure tree on the left filters the list on the right. One screen for browsing and finding, but duplicates the Structure page and squeezes the trail at 1024 px.

**Structure page (W1-03)**
* **A. Tree table + right panel (Recommended).** Tabs Retail · Corporate and employers; indented rows Pathway › Program › Category › Sub-category with chevrons, level badge, "used by N combinations (N Live)", row actions "+ Add program/category/sub-category" and "Rename"; Expand all / Collapse all; Add and Rename open a right panel (team pattern) with the checks. Consequences: the whole tree and its links at a glance (founder's ask), siblings visible right above where you add, keyboard-friendly; long at scale (search + collapse cover it).
* B. Columns (team "pane view", Miller columns): Pathway | Program | Category | Sub-category, "+ Add" at the foot of each column. Clear parent → child, scales well; hides the whole picture and is tight at 1024 px with a panel.
* C. Diagram (mind map of nodes and lines). Most visual, but poor for keyboard, screen readers and editing; no team component.

**New combination (W1-05):** stays a page (Programs › New combination) so "Add to structure" can open a right panel without stacking overlays. Card 1 "Describe it" with the mode dropdown and "Propose a path"; card 2 five pickers (pathway type preset from the tab, read-only chip), light "Required" marks, the reason under a disabled Create; "Will be created as" kept — it is the dialog pattern's confirmation (EXPERIENCE §3), the only place the person sees the final five-part trail and which level is new before anything is written; it also turns into "Already exists: Open it". "Linked to" removed [F P-106].

## 7. States (all drawn)
Programs: loading (skeleton rows) · empty after Reset ("Nothing set up yet" → Open Structure) · normal · long names (one line, full trail on hover) · no matches (with "1 match in Corporate and employers: Show") · error (Retry) · AI running on a row (next step "AI drafting · step 2 of 4", W1-07) · read-only (New combination disabled with reason). Structure: empty, loading, error, add with exact duplicate (refused on the field), close name (did you mean), AI meaning check running (steps, progress, Stop, cost), AI error, AI off, rename conflict (someone renamed first: reload). New combination: blank, rules match, rules found nothing → AI running, AI proposal with new names, AI stopped, AI error, sub-category required vs not, combination exists.

## 8. Copy and tooltips (plain functional words)
* Page title **Immigration programs** · subtitle "Every combination your firm can open, with where its setup stands." · info: "Each row is one application a firm can open. The trail reads Pathway type › Pathway › Program › Category › Sub-category." **[GAP]** title and menu (Q3).
* Retail tab: "Applications made by a person for themselves and their family." · Corporate and employers: "Applications made by an employer or organisation, such as an LMIA."
* Search: "Search names at any level, form numbers and documents in this tab." · Pathway filter: "Show one pathway only." · Status filter: "In setup: being configured. Not ready: something blocks release. Live: firms can open cases on it."
* Structure button/page: "The list of pathways, programs, categories and sub-categories. New combinations pick from it." · "+ Add category": "Add a category under Visitors. Names are checked against what exists first."
* Did you mean: "'Visitor visa' already exists under Visitors and looks like the same thing. Use it, or add yours anyway." · Exact twin: "'Study permit' already exists under Study permits. Choose it instead." · AI check: "AI compares the meaning with the names that exist · about US$0.01 (Sample estimate)." · AI off: "Meaning check unavailable right now; saved after the spelling check only."
* Rename: "The new name shows everywhere at once. Cases already open keep the name they started with."
* Modes — Rules then AI: "Matches your words to the Structure for free; asks AI only if no sure match is found." · Rules only: "Matches your words to the Structure. Free; never calls AI." · AI only: "AI reads your description and may suggest new names. Shows its cost first; creates nothing until you accept."
* Required mark: "Required" (muted) · Sub-category: "Required because Study permit has sub-categories." / "Visitor visa has no sub-categories: the category is the combination." · Disabled Create: "To create, choose Program and Category."
* Add to structure: "Missing here? Add it to the Structure with the same duplicate check, then it is selected." · Will be created as: "This is how it will appear in Immigration programs."
* Corporate callout: "How employer and worker cases connect: the employer's LMIA is set up here; the worker's work permit is set up under Retail. On the worker's case the agent picks 'relies on employer case', and the employer's name, address and LMIA number fill in (case step, later wave). Examples (Sample): a software company hires one developer → one employer case, one worker case; one LMIA for three cooks → one employer case, three worker cases; a household hires a caregiver → the household is the employer."
* AI errors: "AI did not answer within 30 seconds. Charged so far: US$0.01. Try again, or choose Rules only." · Stopped: "Stopped. Nothing was created. Charged: US$0.00."

## 9. Contract sketch (zod in `contracts/programs.ts`; RFC 9457 errors; author-only writes)
* `GET /structure?pathwayType=INDIVIDUAL|CORPORATE` → `{ pathwayType, nodes: [{ key, level: "PATHWAY"|"PROGRAM"|"CATEGORY"|"SUB_CATEGORY", parentKey, label, combinations, live, hasChildren, version }] }`
* `POST /structure/name-check { pathwayType, level, parentKey, label }` → `{ exact: Node|null, close: [{ key, trail, why: "spelling"|"same words" }] }` (rules, US$0, as you type)
* `POST /structure/meaning-check {…same}` → `{ jobId, estimateUsd }`; `GET /ai-jobs/:id` → `{ steps:[{label, state}], costUsd, status, result? }`; `POST /ai-jobs/:id/stop` (W1-07 shared)
* `POST /structure/nodes { pathwayType, level, parentKey|null, label, decision: "new"|"add_anyway", meaningJobId? }` → 201 node · 409 `{ existing }` · 400 field errors
* `PATCH /structure/nodes/:key { label, version }` → 200 · 409 duplicate · 409 stale `{ current }`
* `POST /path-proposal { pathwayType, description, mode: "rules_then_ai"|"rules_only"|"ai_only" }` → `{ rules: { proposal|null, confidence, why }, ai: { jobId, estimateUsd }|null }`; AI result `{ levels: [{ level, key?|label, isNew }], exists, combinationId, why }`
* `POST /combinations/path { pathwayType, pathway:{key}, program:{key}, category:{key}, subCategory:{key}|null }` (keys only; `link` removed) → 201 · 200 existing · 400 "Choose the sub-category: Study permit has sub-categories."
* `GET /catalogue?pathwayType=&pathway=&status=all|in_setup|not_ready|live&q=` → rows with `trail: [{ level, key, label }]` (5 parts) grouped by Pathway; `otherPathwayMatches`.

## 10. Tests (one pass + one fail per rule; real PostgreSQL; Playwright + axe per state)
BR-1 tabs show only their pathway type · a Corporate node never appears under Retail. BR-2 Create enabled without sub-category for Visitor visa · refused (400, field message) without sub-category for Study permit. BR-3 picker lists only Structure nodes · a typed new name cannot be created from the picker (only "Add to structure"). BR-4 "visitor-Visa" under Visitors refused 409 · same name under another program accepted; 4 parallel adds store one. BR-5 "Visiter visa" shows did-you-mean · an unrelated name shows none; "Add anyway" writes an Activity line. BR-6 rename keeps key and updates trails · rename to a sibling's name refused; stale version 409. BR-7 every row has 5 parts · a combination with no sub-category shows "No sub-category", never blank. BR-8 search in Retail never returns Corporate rows · `link` in the body rejected 400. BR-9 Rules only makes zero AI calls · AI proposal with a new name creates nothing before Accept. BR-10 Stop ends the run and the ledger shows no call after Stop · AI failure shows the plain error and Create still works by hand. BR-11 same path twice → 200 existing · different path → 201. BR-12 (review check) a "From inside Canada" sub-category carries its reason. BR-13 default view lists all six · Status filter "Live" lists one. BR-14 approver add/rename → 403 · author → 201. Migration: every old program lands under a Pathway · an unmapped program stops it by name. Scale: 100 nodes, list filter < 200 ms; keyboard path for add, rename, create; 1024 px and 200 % zoom.

## 11. Capability or scaffolding · Needed or Not built
Capability · Needed: Pathway type tabs, Structure tree, add/rename with checks, AI did-you-mean, full trail, grouped list, search, two filters, New combination pickers + required marks, mode dropdown, AI path proposal, Will be created as, Corporate callout (wording is Sample content). Scaffolding · Needed: Load sample (5 + 1 structure), Reset, replayed AI answers, cost estimates labelled Sample. Not built: remove/move/reorder nodes, case-level employer link (W4), "Find missing forms" (W1-06), bulk structure import.

## 12. Questions for the founder (recommendation first)
1. **Programs list layout:** A grouped list (Recommended) · B cards · C split view?
2. **Structure page layout:** A tree table with right panel (Recommended) · B columns · C diagram?
3. **Names in the menu:** Configure › To review · **Immigration programs** · **Structure** (Recommended: title matches the menu so people know where they are) — or keep "Programs"?
Lead-only (not for the founder): data Option 1 vs 2 (§3); TAXONOMY §2 and skill `immigration-structure` rule 4 still describe "supported by" configuration links **[CONFLICT with P-106]**, and PRODUCT.md §4 still says "Individual" and "↔ Supported by · Follows" **[CONFLICT with P-104/P-106]** — Lead updates; C1.1/C1.3 capability wording; Corporate Pathway and location sub-categories go to the immigration expert.

## Definition of Ready
- [ ] Board agreed (founder picks Programs and Structure options; clicks through)
- [x] Every element labelled Needed / Not built and Capability / Scaffolding (§11, boards)
- [x] Data and API needs known (§3, §9) — Lead picks data Option 1 or 2
- [ ] Every decision relied on agreed: P-104, P-105, P-106, P-110 yes; P-49 amendment (BR-13) and menu/title not yet recorded
- [ ] No open questions (Q1–Q3; expert: Corporate Pathway, location sub-categories, Ontario)
