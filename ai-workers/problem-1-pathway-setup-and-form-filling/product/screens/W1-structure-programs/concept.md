# W1-structure-programs — Structure, Immigration programs, New combination (W1-03, W1-04, W1-05) — AGREED

**Agreed 26 Oct by the founder:** Programs design D and the Structure outline with the menu names (P-115); Remove + Retire + Reorder on every master, no Move (P-116 — replaces this draft's "Not built: remove, move, reorder"); Lead decisions applied (data Option 1, P-112 names, renames reach firms with the next release, a new leaf listed as Not started, AI meaning check off by default). Fresh challenge `challenge.md` answered in this version. The builder still writes its own challenge before BUILD (P-20).

Stage: **Concept draft v2 (designer agent, 26 Oct)** after `challenge.md` (B1, M1–M6, m1–m7 applied) and the founder's ask for the best design rather than a pick between A, B and C. The Lead edits and decides. Boards: **`design/draft-programs-v2.html`** (recommended Programs design, every state), **`design/draft-structure-v2.html`** (recommended Structure design), `design/draft-new-combination.html` (updated); the v1 options stay in `draft-programs.html` / `draft-structure.html` for comparison. Every element on the boards is tagged Capability / Scaffolding (P-33) and Needed for the proof / Not built (P-26). Markers: **[F P-xx]** = followed that decision · **[GAP]** = decision missing · **[CONFLICT]** = two sources disagree.

## 1. Job and journey
A content publisher keeps one clean five-level structure, sees all combinations (at most 50 in wave 1) with where each one's setup stands, and takes the next setup step in one click. New names enter only through the Structure. Persona: content publisher (configuration author); the approver can only read. Journey steps 1.1–1.2. SA-1B-50..56, 90..91; SA-1-12..15 (not re-read in `sources/` this round). Capabilities: C11.3, C11.4, C11.5 (the configuration half); C1.1 and C1.2 reworded; C1.3 replaced by C11.5.

## 2. Programs page — analysis and recommendation (founder, 26 Oct: "best-in-class, cleanest, easiest to set up; cards may be more beautiful; at most 50")
Patterns looked at: **Vercel** project grid (cards: name, status, last activity, one action; grid/list toggle); **Linear** grouped list (collapsible groups with counts, status icons, very dense); **Notion** gallery (beautiful cards, but little status and no next step); **Stripe** tables (filter chips over a dense table, built for thousands of rows); **GitHub** repositories (list rows with one metadata line).
| Dimension | A list | B plain cards | C split view | **D Pathway sections of setup cards + list toggle** |
|---|---|---|---|---|
| Find one (search + type) | Good | Good | Good | Good: search filters the cards live; sections with no match collapse |
| Scan at 5 / 20 / 50 | Looks empty and "basic" at 5 (the founder's complaint) / good / best | Good / good / weak (about 4 screens) | Good / good / fair | Best at 5 and 20; at 50, collapsible sections or the list toggle keep it to about 2 screens |
| Cleanliness | Clean but monotonous | Clean | Busy (two panes) | Clean: one card shape, white space, one action per card |
| Aesthetics | Plain | Strong | Fair | Strongest: Vercel/Linear look in the team's tokens |
| Ease of next step | One link | One link | One link | One button per card, plus a setup stepper that shows *why* this is the next step |
| Status at a glance | Chip | Chip | Chip | Chip + 4-step setup progress (shape + text, never colour alone) |
| WCAG 2.2 AA | Table semantics | Fine | Tree + table | List of article links; stepper text read aloud ("Step 2 of 4: AI draft") |
| 1280 / 1024 px | Trails cut / cut more | 3 / 2 columns | Cramped | 3 / 2 columns; the trail wraps inside the card, nothing is cut |
| Team consistency | Team table | New card | Team tree | Team segmented control (grid/list, like the team's tree/pane switch), team chips and buttons; list view = A |

**Recommended: D.** Each Pathway type tab (a filled segmented control with counts) shows Pathway sections ("Temporary residence · 3 · 1 needs you"), collapsible, each holding compact cards. **Card:** a muted trail line (Pathway › Program), the last level in bold as the title (category; the sub-category on a second line, or "No sub-category"), a status chip, a 4-step setup progress (Forms · AI draft · Review · Release, calculated; all four done = Live), a facts line ("3 forms · Filed: PDF"; permanent residence "Filed: PDF + answer sheet" **[F P-113]**), and one next-step button. A grid/list toggle (remembered per person) switches to the dense list for 50 (A, with the last level bold and muted first parts, cut at the start so the end stays visible, m4). Above: search, "Status: All" (All · Needs work · Not started · In setup · Not ready · Live; "Needs work" kept as an option, m5) and a stats line. Title-row actions: "Structure" (secondary), "New combination" (primary, last).

**Structure page — recommended: A+ outline.** The v1 tree is kept and made faster: an outline with a **ghost row "+ Add category" at the end of each group**, typed in place, with the checks shown under the row as you type, and Enter to add. Clicking a name opens the team's **detail panel** on the right (trail, used by, where cases may be opened, rename, history). It beats v1's panel-for-every-add on ease (no overlay, keyboard only), shows exactly which siblings the name is checked against, and is the team's own tree + detail panel pattern. Columns (B) and diagram (C) still lose (see the v1 board).

## 3. Data (Lead decision: Option 1, the Pathway type as a fixed value) — fixes B1, M2
* **Pathway type is the enum `PATHWAYS` (INDIVIDUAL → label Retail; CORPORATE → Corporate and employers), never a row.** PATHWAY nodes are the real Pathway level and carry `clientType`. Several Pathways per type are allowed.
* **Index (one migration with its rollback):** replace `program_def_parent_name_key` with a unique index on (`workspace_id`, `COALESCE(parent_node_key,'')`, `COALESCE(client_type,'')`, `name_key`), so "Temporary residence" can exist in both tabs and twins in one tab are refused. Rollback: restore the old index.
* **Code paths:** delete `PATHWAY_NODES` / `ensurePathways` (`programs.ts:30,67-73`); remove the one-Pathway-per-type 409 (`studio.ts:63`); `pathOptions`, `createPath`, `catalogue` and `proposePath` (`programs.ts:183,204,379,403`, `screen02.ts:134`) walk **every** PATHWAY of the type; "structure exists" counts any node (`demo.ts:54`, `studio.ts:43`); the Pathway label joins the trail (`programs.ts:46,117,121`, `review-queue.ts:60`, `engine/snapshot.ts:140`).
* **No data migration (M2):** no lookup table, no re-parenting. Today's rows are already valid Pathways ("Individual", "Corporate and employers") and stay until a person renames them or runs Reset. `linkLabel` is left unused and dropped later; the Express Entry "Step 1 of 2" line goes with it, as intended until route steps return (m6, Not built).
* **Reset (P-108):** the Structure is empty under both tabs, and a read creates nothing. The two Pathway types survive only as enum values. Lead to record this in W1-08 BR-15 and W1-11 **[CONFLICT]** (W1-08 still assumes two stored rows).
* **Allowed case locations get an owner (M5):** the Structure's add row and detail panel for a category or sub-category carry "Cases may be opened from: Inside Canada · Outside Canada · Both". A sub-category defaults from its category; a category defaults to Both; marked Sample. Sent in `POST /structure/nodes` and `PATCH`.

## 4. Structure names — P-112 (Lead, from IRCC naming; Sample until the expert confirms) [F P-112]
| # | Pathway type › Pathway › Program › Category › Sub-category | Cases may be opened from (Sample) | Filed (P-113, Sample) |
|---|---|---|---|
| 1 | Retail › Temporary residence › Visitors › Visitor visa › *No sub-category* | Outside Canada | PDF |
| 2 | Retail › Temporary residence › Study permits › Study permit › Outside Canada | Outside Canada | PDF |
| 3 | Retail › Temporary residence › Work permits › Employer-specific work permit › With an LMIA – inside Canada | Inside Canada | PDF |
| 4 | Retail › Permanent residence › Provincial nominees › Express Entry stream › *No sub-category* (amends P-109) | Both | PDF + answer sheet |
| 5 | Retail › Permanent residence › Family sponsorship › Spouse or common-law partner › *No sub-category* | Both | PDF + answer sheet |
| 6 | Corporate and employers › Temporary residence › Labour market impact assessment › High-wage position › *No sub-category* | — | PDF (Sample) |
Lead items, not founder questions: the challenger's M4 asks TAXONOMY §1 for a definition and test of the new Pathway level ("the government outcome the application leads to"). Under that test an LMIA is not a temporary-residence application **[CONFLICT P-112 row 6 vs M4]**, so the immigration expert should name the Corporate Pathway. Row 4 vs P-24 (Express Entry route steps): the Lead settles it.

## 5. Business rules
| BR | Rule | Source |
|---|---|---|
| 1 | Five levels; the Pathway type is the top tab and a fixed value (Retail · Corporate and employers); under it Pathway › Program › Category › Sub-category; several Pathways per type. | [F P-104], P-06, B1 |
| 2 | **Every last-level node is a combination**, listed as "Not started" in Immigration programs the moment it is added (M6, Lead decision). Pathway, Program and Category are required; a sub-category is required only when the category has sub-categories. A category that already has setup cannot get a sub-category (refused with the reason, `programs.ts:309`). | SA-1B-55 (Unverified), P-26 |
| 3 | New names only through the Structure (page or the "Add to structure" shortcut), with the same checks; New combination picks, then opens or starts the setup. | [F P-104], STANDARDS §3.2 |
| 4 | A name is refused when it equals a sibling ignoring case, spaces and punctuation (index + service); Pathways are compared within their type. | Screen 01 BR-6, B1 |
| 5 | "Did you mean": close names (within 2 letters, same words, singular/plural) in the same type and level, free, as you type. The **AI meaning check is built but off by default** behind the paid-run switch; when off, the node shows "Not meaning-checked". Warn, never block; "Add anyway" goes to Activity. Tested live once. | [F P-104], [F P-95], m3 |
| 6 | A rename keeps the stable key and passes BR-4/5. **The new name shows in setup at once; firms see it after the next release**: each affected combination gets exactly one name-only change (no expert tick needed); cases keep their release's names (Lead decision). | M1, STANDARDS §3.7 |
| 7 | Every list, card, header and preview shows the full five-part trail (the tab and section carry the first two parts; card and row repeat them muted); the last level is bold; long trails are cut at the start. | [F P-104], m4 |
| 8 | Retail and Corporate are separate in structure, combinations and search; no "Linked to"; Corporate shows a callout with examples; the employer link lives on the case (W4). | [F P-106] |
| 9 | Proposal mode: Rules then AI (default) · Rules only (no AI call) · AI only. AI may propose new names, marked "new", or a path in the other type ("Switch to Corporate and employers"). Nothing is written until Accept; accepting adds the names and then opens the leaf, and if that stops halfway the names added so far are listed (m2). | [F P-105], m1 |
| 10 | Every AI run states its cost first, shows steps and progress, has Stop (no further spend), gives plain errors with the next step, and is logged; demos replay at US$0; everything works with AI off. | [F P-110], W1-07 |
| 11 | The same path twice opens the existing combination. | C1.2 |
| 12 | Family members, stages and inside/outside Canada are not levels unless IRCC files them as different applications. | TAXONOMY §1 |
| 13 | The page shows every combination by default; "Needs work" stays as a Status option; status and setup progress are calculated (Not started → Forms → AI draft → Review → Release = Live). | Founder 26 Oct; **[GAP]** amends P-49 |
| 14 | "Filed:" on a card comes from the forms' channels in the library (PDF · PDF + answer sheet); "No forms yet" before forms are added. | [F P-113], P-107 |
| 15 | Only a configuration author adds, renames, sets locations and starts setup; everyone else reads, with the reason in the tooltip; enforced on the server. | STANDARDS §6 |

## 6. New combination (W1-05; board updated)
A page (Immigration programs › New combination), so the "Add to structure" panel never stacks on another overlay. Card 1, "Describe it": the mode dropdown with tooltips; the cost is stated before the run. Card 2, "Where it sits": the Pathway type is a read-only chip from the tab, then four pickers listing Structure names only, light "Required" marks, sub-category "Required here" only when the category has sub-categories, "+ Add to structure" on each. The preview line **"You are opening"** (was "Will be created as") shows the full trail and its state (Not started → button "Start setup"; set up → "Open"). It stays because it is the one place the final trail is confirmed; the word "created" would now be untrue (M6). "Linked to" is removed. The disabled button says what is missing. At 1024 px the pickers sit 2 + 2 under the type chip.

## 7. States (all drawn)
Programs: 5 combinations (grid) · 50 combinations (sections collapsed, list view) · loading skeleton cards · empty after Reset (→ Open Structure) · search with matches and with none ("1 match in Corporate and employers: Show") · error with Retry · AI running on a card (stepper + Stop link, W1-07) · Not started card · read-only · Corporate tab: one Sample + the callout. Structure: empty · loading · error · read-only (reasons on Add/Rename) · exact twin · close name · meaning check off ("Not meaning-checked") · meaning check on: running / same meaning / none / stopped / failed · sub-category refused because the category has setup · tree search with no match · long names · rename (applies at next release) · stale-version conflict. New combination: listed in §6 plus the other-type proposal and a partial accept.

## 8. Copy and tooltips (plain functional words)
* Title **Immigration programs** · "Every combination your firm can open, and where its setup stands." · Retail: "Applications a person makes for themselves and their family." · Corporate and employers: "Applications an employer or organisation makes, such as an LMIA."
* Pathway type: "Who applies: a person and their family, or an employer." · Pathway: "The outcome the application leads to, such as temporary or permanent residence." (m7; Lead adds both to PRODUCT §4.)
* Grid/list: "Cards show setup progress; the list fits more on screen." · Setup progress: "Forms added · AI draft done · Review done · Released (Live). Step 2 of 4: AI draft." · Filed: PDF + answer sheet — "PDF forms are filled for upload; portal-only forms get a checked answer sheet in the portal's order for the agent to type in."
* Not started: "Added to the Structure; no setup yet. Start by adding its forms." · Status: "Not ready: something blocks release. Live: firms can open cases on it."
* Ghost row: "Add a category under Visitors. Checked against the names that exist first." · Locations: "Where a case for it may be opened. Sample until the expert confirms." · Not meaning-checked: "Only the spelling check ran; a reviewer compares the meaning by eye."
* Rename: "The new name shows in setup at once; firms see it after the next release. Open cases keep their names." · Refused sub-category: "Visitor visa already has its own setup, so it is the combination. A sub-category would leave that setup above a combination."
* Modes: Rules then AI — "Matches your words to the Structure for free; asks AI only if no sure match is found." · Rules only — "Free; never calls AI." · AI only — "AI reads your description and may suggest new names. Shows its cost first; creates nothing until you accept."
* Corporate callout (Sample examples): "The employer's LMIA is set up here; the worker's work permit under Retail. On the worker's case the agent picks 'relies on employer case', and the employer's name, address and LMIA number fill in (later wave)."

## 9. Contract sketch (zod in `contracts/programs.ts`; RFC 9457; author-only writes)
* `GET /structure?pathwayType=` → `{ nodes: [{ key, level, parentKey, label, allowedLocations, combinations, live, meaningChecked, version }] }`
* `POST /structure/name-check { pathwayType, level, parentKey, label }` → `{ exact, close: [{ key, trail, why }] }` (US$0)
* `POST /structure/meaning-check` → `{ jobId, estimateUsd }` (403 `paid_runs_off` when the switch is off); `GET /ai-jobs/:id`, `POST /ai-jobs/:id/stop` (W1-07)
* `POST /structure/nodes { pathwayType, level, parentKey|null, label, allowedLocations?, decision: "new"|"add_anyway", meaningJobId? }` → 201 (a leaf is listed as Not started) · 409 `{ existing }` · 409 `category_has_setup`
* `PATCH /structure/nodes/:key { label?, allowedLocations?, version }` → 200 (name-only change per affected combination) · 409 duplicate · 409 stale `{ current }`
* `POST /path-proposal { pathwayType, description, mode }` → `{ rules, ai: { jobId, estimateUsd }|null }`; result `{ levels: [{ level, key?|label, isNew }], pathwayType, exists, combinationId }`
* `POST /combinations/path { pathwayType, pathway, program, category, subCategory|null }` (keys only; `link` → 400) → 200 opened/started
* `GET /catalogue?pathwayType=&pathway=&status=&q=` → cards `{ trail[5], status, progress: { step, of: 4, label }, filed, forms, nextAction }` grouped by Pathway; `otherPathwayMatches`

## 10. Tests (a pass and a fail per rule; real PostgreSQL; Playwright + axe per state; 1024 px and 200 % zoom)
BR-1: the same Pathway name in both tabs is accepted; a twin in one tab is refused; two Retail Pathways are both listed and pickable. BR-2: a new leaf is listed as Not started; a sub-category under a category with setup gets 409. BR-3: pickers list only Structure names; no create from a picker. BR-4: 4 parallel adds store one. BR-5: "Visiter visa" warns and an unrelated name does not; with the switch off the node is "Not meaning-checked" and no AI call is made; one live run is logged. BR-6: a rename gives one name-only change per affected combination and a Live case keeps the old name; a stale version gets 409. BR-7: every card has 5 parts; "No sub-category" is never blank. BR-8: a Retail search never returns Corporate; `link` gets 400. BR-9: Rules only makes 0 AI calls; an accept that fails halfway lists the names added. BR-10: no ledger line after Stop; with AI failing, setup still works by hand. BR-11: the same path returns 200 existing. BR-13: all 6 shown by default; "Needs work" filters. BR-14: PR cards say "PDF + answer sheet"; no forms → "No forms yet". BR-15: approver writes get 403. Reset: 0 nodes and none recreated. Migration: every combination still opens with a 5-part trail. Scale: 50 cards, filtering < 200 ms; keyboard for add, rename and start.

## 11. Capability or scaffolding · Needed or Not built
Capability · Needed: tabs, Pathway sections, cards with setup progress and "Filed", grid/list toggle, search, Status filter, Structure outline with ghost add rows and detail panel, locations control, checks, AI meaning check (off by default), rename at next release, New combination pickers, modes, "You are opening", Corporate callout (Sample wording). Scaffolding · Needed: Load sample, Reset, replayed AI answers, the paid-run switch, Sample estimates. Not built: remove, move and reorder nodes; route-step line; case-level employer link (W4); bulk import.

## 12. Questions for the founder (recommendation first)
1. **Immigration programs:** **D, Pathway sections of setup cards with a list toggle (Recommended: cleanest at 5–20, still compact at 50, the next step on every card)**, or the list only (A)?
2. **Structure:** **an outline with in-place "+ Add" rows and a detail panel (Recommended: fastest setup, siblings in view)**, or a separate panel for every add (v1 A)?
3. **Menu:** Configure › To review · **Immigration programs** · **Structure** (Recommended: the title matches the menu), or keep "Programs"?
Already decided by the Lead (the founder may overrule): renames reach firms with the next release; a leaf added on Structure is listed at once as Not started; data Option 1; the meaning check is built but off by default.

## Definition of Ready
- [ ] Board agreed: the founder picks D and A+ and clicks through
- [x] Every element labelled Needed / Not built and Capability / Scaffolding (§11, boards)
- [x] Data and API needs known (§3, §9; B1 code paths listed)
- [ ] Every decision relied on agreed: P-95, P-104–P-106, P-110, P-112, P-113 yes; the P-49 amendment, the menu/title and the Lead's M1/M6 decisions to record
- [ ] No open questions (Q1–Q3; expert: Corporate Pathway name, locations; Lead: P-24 vs row 4, TAXONOMY Pathway row, W1-08 Reset wording)
