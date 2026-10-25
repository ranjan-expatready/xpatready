# Screen 04 — Shared library · concept (agreed by the Lead, 25 Oct; drafted by screen-designer 25 Oct)

## Lead decisions (25 Oct, P-89: the Lead agrees concepts; the founder walks the milestone end to end)
* **Q1 → as recommended, settled by the founder:** P-52 (delete · retire · restore, a different person approves) and P-70 (SA-01B in scope) replace P-28's "read-only library view" for these items. Add through Describe what you need; no edit of wording, type or placement here.
* **Q2 → yes, settled by the founder:** P-53 names Field, Section and Document type on Screen 04.
* **Q3 → yes, settled by the founder:** P-37 asks for a read-only central Shared library › Rules list with where used; it is the last slice.
* **K1** "Field map" (P-63; SCREENS row 04 updated) · **K2** approval from the To review row (P-79), no separate page · **K3** rows C3.12–C3.14 added to `qa/CAPABILITIES.md`; C3.6 now covers document types · **K4** a substitute set is drafted inside Describe for a document type and shown read-only; editing an existing set Not built · **K5** as drafted: merges stay on Screen 02.
* **K6 → build the no-AI short form:** P-53 and P-34 both say it exists; it is the AI off / AI failed recovery path EXPERIENCE requires; items it adds carry "not meaning-checked" until AI runs.
* **Challenge (25 Oct, `challenge.md`): 1 Blocker, 10 Major, 9 Minor, all accepted.** Library changes are one `LibraryChange` record, built in Screen 02 slice 2 and reused here, and published under "Library changes" by one publisher that both release paths call. A retire takes effect at release (B1, M6). An approved condition edit republishes every released combination that uses it, while old releases and case pins keep the old rule (PR #17 review). Describe is a worker job (M7). Conditions are edited in place in the drawer as a second-person library change (M10, P-37). The guard is defined per kind at PLAN (M3). Merged fields are never "Retired" (M4). Old write routes close in the slice that replaces them (M5). The rest follow `challenge.md` "Lead response".
* Builder: the screens lane, after Screen 02 (the runtime lane builds Screen 03). The `similar` route is one route shared with Screen 02, agreed with the forms lane at PLAN. Slices: (1) five lists with where used, origin, status, reuse per combination, and drawers, on today's data; (2) Describe what you need with the exact-duplicate block, verdicts and the short form; (3) Delete · Retire · Restore with the in-use guard and second-person approval; (4) Forms list, Add forms, editions, re-check due; (5) Checks and Rules lists. EARLY-LOOK after slice 1 is the Lead's (P-89).

Board: `design/draft-library.html` (one file, 10 views, 44 states; "Show labels" shows Capability or Scaffolding, Needed or Not built, and the decision each element follows or lacks). All counts, editions, dates, check values and costs are **Sample**; form codes and titles are IRCC's; nothing here is confirmed by the immigration expert. Unconfirmed: no counsel. Where this concept and the board differ, this concept wins.

## 1. Job and journey
A content publisher sees what the shared library holds (fields, sections, document types, forms, checks), where each item is used, whether AI or a person made it, and how much a combination reused versus added; adds a missing item by describing it; adds forms to the library; and removes what is no longer needed, without breaking anything in use. Personas: Configuration author; Content reviewer (second person). Activities 3.1, 3.4; SA-1B-1..24, 26..32 (the trace in `history/TRACE-SA01B-2026-10-23.md`; SA-01B itself is Mac-only and was not read). Capabilities: C3.6, C3.7 (built in slice 3), C3.12–C3.14, C2.1, C2.4 (door 2), C2.11, C3.5 (aliases shown), C3.10; links to C9.1 (impact review on Screen 02).

## 2. Ten layers (exists · team · new)
| Layer | In our app | Team code | New for Screen 04 |
|---|---|---|---|
| Masters | Field (versions, aliases, merges), section, document type (name, category, facts), form, edition, online version, portal | Canonical fields, form editions (read-only) | Status Retired; "not meaning-checked" mark; document type attributes from MASTERS §5 that the drawer shows |
| Links | Field map, placement, section picks, requirement lines | `form-field-maps` | Where-used read model across all of them; "reused vs new" per combination (first combination that brought the item in) |
| Configuration | — (lines live on Screen 03) | — | None |
| Rules | Fact rules on placements, checks per combination | Predicates | None authored here (P-28); shown read-only |
| Engine | — | — | In-use guard (P-52 L1–L6) as one pure function used by every route |
| Contract | `GET /library/fields`, `/fields/:key`, `/sections`, `/document-types`, `/forms`, `/forms/:code/editions`; `POST /intake`; `/library/merges` | — | §6 |
| Screen | `library.tsx` (typed-key "Add a field", inline section add, field page with edit forms), `library-forms.tsx` (intake + 4-column list), Checks placeholder | none | Five library lists + drawers, Describe panel, Forms list per P-51 |
| AI assist | Field-map drafting (Screen 02) | — | Draft from a description + meaning verdict (one call, cost shown) |
| Governance | Release; author ≠ approver | Approval dialog | Second person approves new, deleted, retired, restored items (from To review) |

## 3. Business rules (each: one pass and one fail test)
* BR-1 No edit of a definition on this screen; changes come from AI proposals (Screen 02), Describe what you need, or Delete · Retire · Restore (P-28, SCREENS 04; **Q1**). The current Field page's edit forms and typed-key dialog go (P-52 page "Built today").
* BR-2 Every row shows where used (counts say what they count, each linked), origin ("AI · from IMM 5257 · accepted 18 Oct" or "Person · described") and a calculated status: Released · Draft · Waiting for a second person · Retired (STANDARDS §3.5, P-11, RULES-MODEL §1, EXPERIENCE §2.5, §2.7).
* BR-3 Fields are grouped by section, searchable by name, meaning, alias or form code (P-37).
* BR-4 With a combination chosen, each item is "Reused" (in the library before this combination) or "New here", with the totals ("146 · 112 reused · 34 new") (SCREENS 04, PRODUCT §1).
* BR-5 Describe what you need (Field, Section; Document type per **Q2**): one plain-words box; AI drafts the item and shows the closest items with a verdict Use existing · Probably not needed · New is justified; Use existing creates nothing; Add new needs a reason when AI disagreed; keys generated, never typed (P-34, P-53 items 1–3).
* BR-6 Exact duplicate (same generated key, same normalised name within subject and group, or an alias) is refused without AI, on the field, with a link to the existing item (P-34 layer 1, P-53 item 5, P-65).
* BR-7 Cost shown before the AI call; AI failure spends nothing and keeps the text; with AI off a short form still adds the item marked "not meaning-checked" (P-53 item 6, STANDARDS §4; see K6).
* BR-8 A new, deleted, retired or restored item is a draft change; a different person approves it (server, 403 for the maker); release publishes (P-52 L4, P-53 item 4, P-79).
* BR-9 Delete only an item never released and used nowhere (L1); a released item is retired (L2); retire refused while used by any current setup, listing every use with a link (L3, L6); the same for AI-made items (L5).
* BR-10 Retired items are hidden from pickers, AI proposals and Describe matches; earlier releases and open cases keep them; the list shows them only under "Retired" (L2).
* BR-11 Add forms (door 2): one or many files through the shared intake of Screen 01 (`FormIntake`): added · already in the library · held: new edition (→ Screen 02 impact) · held for source check (→ To review, P-80) · held for a person (unreadable); library only, nothing attached (P-51, P-32, P-57).
* BR-12 Forms list columns: Code · Title (+ channels) · Edition as printed · Published · Field map · Used by · Status; "Not mapped yet" until a combination first uses it, mapped once and reused (P-51, P-63, P-41, P-61). Forms are retired, never deleted.
* BR-13 Each form shows every edition and online version; a new edition waiting shows on the row, the menu badge and the drawer, and opens Screen 02's impact review; an online version past its re-check date shows "Re-check due" (orange) with Re-capture · Confirm unchanged (P-32, P-38, P-61 §5, C2.11, EXPERIENCE §2.11).
* BR-14 Drawers show fact rules, validation and checks that read the item as sentences with their source, read-only (P-12, RULES-MODEL §2, §7).
* BR-15 Checks list: kind (Field validation · Consistency · Document validity · AI review), what it reads, value per combination, when it runs, where used, origin; read-only (RULES-MODEL §7).
* BR-16 Aliases shown on a field; a merged-away field says "Merged into …" and redirects; proposing and approving merges stays on Screen 02 (P-65, P-28; K5). Words P-63; keys only under "Details for the team" (PRODUCT §4).

## 4. Layout (Library list pattern, EXPERIENCE §3; team tokens; board views 1–10)
Shell as Screens 02/03 (menu with To review first, P-79). Each library page: crumbs · title · one-line description · one primary action (Describe what you need; Forms: Add forms) · `FilterLayout`: search + Combination ▾ + Origin ▾, status chips with counts · bare table, 44 px rows, identifier first, status last. Row → right panel (540 px, sections not tabs: Definition · Rules and checks · Where used · History · Details for the team); footer Close left, one action right. Describe and Add forms are right panels too (P-48: never a centred modal for anything with a field). Views: 1 Fields · 2 Field drawer · 3 Describe · 4 Sections · 5 Document types · 6 Forms · 7 Add forms · 8 Form drawer · 9 Checks · 10 Rules (**Q3**).
**States drawn:** empty (teaches the first action) · loading (skeleton + status) · normal · long names (one line, full on hover) · nothing matches · filtered to a combination · running (AI drafting with the real count compared) · verdicts ×3 · exact duplicate (on the field) · AI off · AI failed · retire refused (every use linked) · retire / delete confirm in-page · waiting (maker) · second person (approve / return with reason) · retired → restore · conflict 409 (Reload) · read-only (no author duty) · error (Try again) · intake results (all five outcomes) · new edition waiting · re-check due.

## 5. Copy (plain, front-loaded; P-63)
* Empty fields: "Fields arrive when a combination's forms are read: AI proposes them on To review, a person accepts, and they appear here with the form they came from. To add one yourself, describe what you need."
* Describe hint: "Write it in your own words … AI drafts the field and checks whether the library already has one that means the same. About US$0.01."
* Duplicate: "A field with this name already exists for family members: "Relationship to principal applicant". Open it, or say what is different about the one you need."
* Retire refused: "Date of birth cannot be retired while it is used. Remove or replace it in these places first, then retire it: …" · Maker: "You added this. A different person approves it; it is listed for them on To review."
* Not mapped yet (tooltip): "AI maps it once, when a combination first uses it; every later combination reuses the map." · Re-check due: "Online versions change without a new edition. Capture the screens again, or confirm they are unchanged."

## 6. Contract and tests
Keep: `GET /library/fields|sections|document-types|forms`, `GET /library/forms/:code/editions`, `POST /intake` (no `combinationId` = library only), `GET /intake/held`, `GET /library/merges`, `POST /captures/:id/confirm`. New (screens lane; zod in contracts; Problem Details; server authorisation; cursor pagination):
`GET /library/:kind?q=&section=&origin=&status=&combination=&cursor=` → rows with `usedBy {forms, combinations, sections}`, `origin`, `status`, and with `combination` a `reuse {total, reused, new}` and per row `inCombination: REUSED|NEW` · `GET /library/:kind/:key` → definition, rules, checks, whereUsed[], history[], aliases[], version · `POST /library/:kind/similar {description}` → `{draft, matches[], verdict, reason, costUsd}` (shared with Screen 02's `/library/fields/similar`: one route) · `POST /library/:kind {draft, decision: USE_EXISTING|ADD_NEW, reason?, meaningChecked}` → 201 draft, 409 exact duplicate {existingKey} · `POST /library/:kind/:key/{delete|retire|restore} {reason, version}` → 409 `{uses[]}` when in use · `POST /library/:kind/:key/{approve|return}` → 403 for the maker · `GET /library/checks` · `GET /library/rules` (if Q3). Remove `POST /library/fields` with a typed key.
Tests: one pass + one fail per BR-1..16 (e.g. BR-9 retire with one draft use → 409 listing it / after removal → draft change; BR-8 maker approve → 403 / reviewer → 200; BR-6 "Relationship  To Principal applicant" → 409 without an AI call; BR-11 five fixture files → five outcomes, nothing attached). Keyboard: list → row (Enter) → drawer → Retire → confirm → Escape returns focus to the row; Describe → Tab through verdict → Add new with reason. axe on every state; 1024 px and 200 % zoom; first view < 1 s, filter and search < 200 ms with Sample data; one request per view.

## 6b. Capability or scaffolding (P-33) · Needed or Not built (P-26)
* **Capability · Needed:** the five lists with where used, origin, status and reuse per combination; drawers; Describe what you need (Field, Section; Document type if Q2); exact-duplicate block; meaning verdict; Delete · Retire · Restore with the in-use guard (if Q1); second-person approve/return; Add forms with all intake outcomes; Forms list columns; editions and online versions; re-check due; Checks list; Rules list (if Q3).
* **Scaffolding (never ported):** Demo menu, Acting as, Prototype badge, Sample counts and values, replayed AI verdicts in tests.
* **Not built:** Replace with… (merge execution, P-52); meaning-change impact for library items (P-34 §4); translations; accept rate of AI review findings (M3 data); substitute-set editing (K4); field groups and purposes (B1, SA-1B-6, 11).

## Decisions followed, missing or in conflict
* Followed: P-11, P-12, P-23, P-28, P-32, P-34, P-37, P-38, P-41, P-48, P-51, P-52, P-53, P-57, P-58, P-61–P-63, P-65, P-79, P-80; EXPERIENCE §2–§5; RULES-MODEL §1, §2, §7.
* **K1 (Lead):** SCREENS 04 says "box map"; P-63 retired the word: column is "Field map".
* **K2 (Lead):** approval of new, deleted, retired, restored items: the To review row (P-79) opens this screen's drawer in approver state; no separate page.
* **K3 gap (P-74):** no capability rows for the Forms library door 2 + list (P-51), library lists with where used, origin and reuse per combination (P-37, SCREENS 04), or the Checks list (P-14). Suggest C3.12–C3.14.
* **K4 conflict:** Screen 03 §8 expects "Substitute-set authoring (Screen 04)"; SCREENS 04 says no direct editing. Draft: sets drafted inside Describe for a document type and shown read-only; editing an existing set Not built.
* **K5:** merges are built (F1) and reviewed in Screen 02's panel; here aliases and "Merged into" only (P-28 no merge execution).
* **K6 conflict:** P-53 item 6 says the no-AI short form works; the P-34 page lists it as Not built (team). Board draws it labelled Not built; Lead to choose.

## 7. Questions
Q1–Q3 settled (Lead decisions above); no founder question open.

## Definition of Ready (WORKFLOW.md)
- [x] Board agreed for slice 1 (Lead, 25 Oct, Mac: views 1 and the lists; the approver view 2 is replaced by the link to To review, recheck Lead response)
- [x] Every element labelled Needed / Not built and Capability / Scaffolding (§6b, board labels)
- [x] Data and API needs known for slice 1 (`LibraryChange` on main since the Screen 02 merge); the shared `similar` route is agreed with the forms lane at slice 2
- [x] Every decision it relies on agreed (Q1–Q3 by P-52, P-53, P-37, P-70; K1–K6 Lead)
- [x] No open questions
- [x] Capability rows added for K3 (P-74)
