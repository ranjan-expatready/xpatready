# W1-09 — Shared library in setup order · concept draft (screen-designer, 26 Oct; for the Lead to edit and decide)

Board: `design/draft-setup-order.html` (12 views; "Show labels" shows Capability or Scaffolding, Needed or Not built, and the decision mark on each element). Marks: **[F]** follows a decision · **[M]** missing (Lead settles) · **[C]** two sources conflict. Form codes and titles are IRCC's. Every combination name, count, edition, date, cost and check value is **Sample**: forms per combination stay Sample until the immigration expert confirms (P-108). Unconfirmed: no counsel. Where this draft and the board differ, this draft wins.

## 1. Job and journey
A content publisher sees, on one page, **the order in which the shared library is built** (combination → forms → shared fields → sections, document types, conditions, checks), **who makes each piece** (AI from which source, or a person, or the expert), what is left, and the one next step. From there they launch each AI draft through the shared AI run panel, add a missing item by describing it (with the AI duplicate check), and open each list to curate. Personas: Configuration author (content publisher), Content reviewer (second person). Wave 1 actor 1 (P-101). Capabilities: C3.13, C3.6, C3.4 (entry points), C11.7 (reset), C11.8 (AI runs), C2.12 (links to the per-form path). New row proposed: **C3.16** "the library's setup order shows each master's order, maker, state and next step, for all combinations or one".

## 2. Ten layers (exists on main → new)
| Layer | Exists | New for W1-09 |
|---|---|---|
| Masters | Field (versions, aliases, merges, unique name), section, document type, answer list (F1, no screen), form, edition; `LibraryChange` (add / retire / restore, second person) | **Shared condition** (today `Predicate` belongs to one combination) [C1]; **person roles** as data (today constants in the web code) [M8]; `LibraryChange.kind` gains condition, check, answer list |
| Links | Field map, placement, section picks, document lines, merges | "Needs first" between masters, as data in one engine table (§3) |
| Engine | `review-queue.ts` items; F3 `queueItemsOf(kind,…)`; validator | Pure `setupOrder(facts, actor, combination?)` → steps with state, counts, maker, next; reuses `queueItemsOf` so the same item names the same next step everywhere |
| Contract | `GET /library/fields|sections|document-types|forms`; `/library/changes/*`; `/ai/plan`, `/ai/batches`; `POST /demo/reset` | `GET /library/setup-order`; `GET /library/answer-lists|conditions|roles`; AI operations from W1-10 (§6) |
| Screen | Fields ("Canonical fields", typed keys), Sections (inline add), Document types (no guard), Forms (intake + 4 columns), Checks (placeholder) | **Setup order** page as the library's first page; an AI line on each list; Describe panel for five kinds; "How it fits together" panel |
| AI assist | Field mapping (Screen 02), Draft setup panel | Entry points for W1-10's drafts; Describe meaning check (P-95); "Find duplicates"; all through W1-07's run panel |
| Governance | Author ≠ approver on library changes; release | Same; nothing new |

## 3. The setup order — every master, who makes it, the gate (the core of this item)
| # | Master | Needs first | AI makes it from | A person | Gate before it lives | Today → Wave 1 |
|---|---|---|---|---|---|---|
| 0 | Structure and combination | — | Path proposal from a description (P-105) | Picks from Structure; Add to structure | Release | W1-03/05 |
| 1 | **Forms** (incl. checklists, guides) | a combination (to propose); none (to upload) | IRCC guide or checklist → proposes forms; system downloads from canada.ca (P-103) | Uploads a PDF; approves each download | Duplicate on number + edition + checksum; second person for an off-list file | Upload works → W1-06 |
| 2 | **Person roles** | — | Never | The team sets the list; the expert confirms | Release | Constants → read-only list (Q3) |
| 3 | **Shared fields** and field map | forms, roles | Each form field → reuse / new / ambiguous / conflict, beside the PDF page (C3.1) | Accepts, edits, rejects; Describe what you need; "not a fact" | New field: second person; map: validator + release | Partial → lists + Describe |
| 4 | **Answer lists** | fields with choices | The form's own choices, with the value map | Accepts; corrects values | Second person on a new list | Built (F1), no screen → view under Fields (Q3) |
| 5 | **Validations** (tier 1) | fields | The form's limits (characters, dates, formats) | Accepts | Release; same rule in every channel | Engine runs; drafting not built → W1-10 |
| 6 | **Sections** (+ question wording, who fills, repeats) | fields | Groups fields by the form's parts and order | Describe a section (existing fields only) | Second person on a new section | Partial → W1-10 |
| 7 | **Document types** (+ what each proves) | a checklist in the library | Reads the checklist → types and requirement lines with who and only if | Describe | Second person on a new type | No guard today → W1-10 |
| 8 | **Conditions** (shared sentences) | fields, answer lists, roles | Form instructions and checklists → "Is married or common-law" | Describe; edit in the drawer (Screen 04 M10) | Second person; release republishes users | Per combination only [C1] → W1-10 + list |
| 9 | **Checks** (tier 2) | fields, document types, conditions | Guides and form limits; repeated AI review findings | Describe; the expert sets the value per combination | Release; warns, never blocks (P-14) | Not built → W1-10 + list |
| 10 | Requirement lines on each combination | all above | Checklist lines | Accepts on the workspace | Release | W1-08 |
**Later, listed on the page as Not built (one line each why):** AI review objectives (tier 3; people write them), field groups, key-date types, government steps, standard-step starters, reference tables (countries, language levels), eligibility gates and scoring, country-specific requirements, deficiency checks, translations, fee table (expert values) [F] MASTERS §1–§2.

## 4. Options
**(a) Where the library lives** (Q1)
* **A. Separate lists, as today, numbered in the menu.** + Least build; curation stays where it is. − Order and "who makes it" stay invisible; the publisher hunts across five pages; AI stays hidden on most pages; answers none of the founder's "complete understanding".
* **B. Recommended: one "Setup order" page is the library's front door; the lists stay behind it.** + The order, the maker, what is left and every AI action in one place; a Combination filter gives the per-combination view ("146 fields · 112 reused · 34 new"); lists keep curation (where used, retire, merge) that one combination cannot own. − One new read model and page; the menu changes (PRODUCT §3 needs a decision) [C2].
* **C. Inside the combination: a library tab per master in the workspace.** + Feels natural for the first combination. − A shared item belongs to many combinations, so curation (duplicates, merges, retire, where used) has no home; overlaps W1-08's tabs and F3's per-form path; breaks "defined once" (STANDARDS §3.3), P-37 lists and P-103's one door.

**(b) How the order is shown** (Q2)
* **b1. Numbers and status marks in the left menu only.** + Cheapest. − Says nothing about who makes it, why a step waits, or what AI does.
* **b2. Recommended: a steps table on the Setup order page** — one row per master: number, name, needs first, made by (icons + words), state chip, counts, one next step, its AI action — plus a "How it fits together" panel (sources → AI → proposals → person → second person → release, per master). + Work tool and explanation together; states calculated, never ticked. − Longest page; needs good tooltips.
* **b3. A dependency map as the main view.** + Best picture of the whole. − Poor for daily work (no counts, no next step at a glance); hard at 1024 px and for keyboard users. Kept as b2's explainer panel.

## 5. Business rules (each: one pass and one fail test, §7)
* BR-1 **Setup order is the first page under Shared library**; menu: Setup order · Forms · Fields (+ Answer lists) · Sections · Document types · Conditions · Checks (Q1, Q3) [C2].
* BR-2 **Order and "needs first" are data in one engine function**; each step's state is calculated: Not ready · Empty · AI running · Needs you · Waiting for others · Done · Later. Never ticked by a person [F] EXPERIENCE §2.5, F3 BR-2.
* BR-3 **Warn, never block navigation:** a step that is Not ready names what it needs, linked; its AI action is disabled with the reason; its list still opens [F] EXPERIENCE §2.9.
* BR-4 **Every step says who makes it** (AI from which source, a person, the expert, the team) and its gate [F] P-11, RULES-MODEL §1.
* BR-5 **Every AI action runs in the shared AI run panel** (W1-07): cost first, steps live, progress bar with real counts, plain errors with the next step, Stop that ends the run; results land on To review as proposals; nothing written until a person accepts [F] P-110, P-11, P-79.
* BR-6 **A person adds by describing it** (Field, Section, Document type [F] P-53; Condition, Check [M4] by P-34's general rule): exact duplicate refused without AI, on the field, linked; AI meaning verdict when the paid-run switch is on, else "not meaning-checked"; Add new needs a reason when AI disagreed; a different person approves [F] P-15, P-34, P-95.
* BR-7 **Combination filter:** counts for that combination, reused vs new per step [F] P-37, C3.13.
* BR-8 **Same next step everywhere:** a step's next link equals To review's and the F3 per-form path's for the same item [F] F3 BR-2.
* BR-9 **Reset empties every step** (structure, combinations, forms, fields, answer lists, sections, document types, conditions, checks, library changes, proposals); **Load sample** fills Structure and Forms only; steps 3–9 show "AI proposals ready to replay · US$0" [F] P-108.
* BR-10 **Missing masters are listed:** Wave 1 masters as steps; the rest under "Later" with one line why (Q3).
* BR-11 **Person roles are never drafted by AI**; read-only in Wave 1 [M8].
* BR-12 **Forms step is W1-06's form library** (one door); this page links, it does not copy [F] P-103.
* BR-13 **Close the typed-key `POST /library/fields`** (main still creates a field with no second person) [C5]; every add goes through Describe.
* BR-14 **Tooltips on every step, chip, count, icon and AI button**; words: shared field, form field, field map; no keys on the main path [F] WAVE-1 rules, P-63, PRODUCT §4.

## 6. Layout, states, copy
**Layout** (EXPERIENCE §3 Library list, plus a steps table): crumbs · "Setup order" · one line · Combination ▾ (All combinations) · "How it fits together" (link) · steps table (44 px rows, 11 rows, number first, next step last) · "Later" group collapsed. Row → its list. AI action → W1-07 panel (right panel). Describe → right panel. Every list page gains one **AI line** under the title ("AI drafts sections from the forms' parts · 4 forms ready · Draft sections"). Below 1100 px panels cover the page.
**States drawn:** empty after Reset · after Load sample · normal (mid-setup) · one combination · AI running · stopped · AI failed · needs you · waiting for others (maker) · not ready · all done · read-only (no author duty) · loading · error · Describe: exact duplicate · verdict Use existing · AI off · Later list · options A and C (for the founder).
**Copy:** Empty: "The library is empty. Set up in this order: add a combination, then its forms. AI reads the forms and proposes the rest; you accept." · Not ready: "Starts when a checklist is in the library. Add it on Forms." · Replay: "AI proposals ready to replay · US$0. Replays earlier real runs so you can accept them." · Waiting: "You sent 6 new shared fields. A different person approves them on To review." · Made-by tooltip (AI): "AI proposes; nothing is used until a person accepts it." · Later tooltip: "Designed, not built in this wave. Until then a person supplies it, or it is not needed for the 5 combinations." · Stop: "Stopped after 2 of 4 forms. Proposals from the finished forms are kept; no further cost."

## 7. Contract and tests
`GET /library/setup-order?combination=` → `{steps:[{n,key,label,state,needs:[key],madeBy:[{who:"ai"|"person"|"expert"|"team",from}],gate,counts:{total,released,draft,waiting,proposals},reuse?:{total,reused,new},next?:{label,href},ai?:{operation,label,enabled,whyNot,costHintUsd}}],later:[{label,why}],updatedAt}`; one request, zod in contracts, 403 without a studio duty. `GET /library/answer-lists|conditions|roles` (cursor). AI: `POST /ai/plan` and `/ai/batches` with operations `propose_forms` (W1-06), `map_fields` (exists), `draft_sections`, `read_checklist`, `draft_conditions`, `draft_checks` (W1-10), `find_duplicates` (new); run status, steps and Stop are W1-07's. Describe: `POST /library/:kind/similar`, `POST /library/:kind` per Screen 04 §6 (kinds + condition, check). Remove typed-key `POST /library/fields`, `POST /library/sections`.
**Tests (pass · fail):** BR-1 menu order and first page · old Fields landing gone. BR-2 add a checklist → step 7 Not ready → Empty · a person cannot set a state (no write route). BR-3 Not ready step opens its list · AI action disabled with the named reason. BR-4 every step has maker and gate · a step without one fails the contract. BR-5 launch shows cost before start, Stop ends with no later call (fake launcher) · a write outside an accepted proposal is refused. BR-6 "Date of Birth " → 409 without an AI call · AI off → "not meaning-checked"; maker approve → 403. BR-7 Visitor visa filter → reused + new = total · another combination's item excluded. BR-8 same item: step next = To review next = F3 next · change one, test fails. BR-9 Reset → every step Empty and zero rows in every library table · Load sample → only steps 0–1 filled. BR-10 Later list renders · a Later master has no action. BR-11 roles have no AI action · POST to roles → 405. BR-12 Forms row links to `/library/forms` · no second forms table. BR-13 typed-key POST → 405 · Describe path → `LibraryChange` WAITING. BR-14 text scan: no "box", "canonical", keys; every chip and icon button has a tooltip and an accessible name. Keyboard: steps table → Enter opens list; AI action → panel → Stop → focus returns to the row. axe on every state; 1024 px and 200 % zoom; first view < 1 s; one request per view.

## 8. Capability or Scaffolding (P-33) · Needed or Not built (P-26)
* **Capability · Needed:** Setup order page and engine; steps table with maker, gate, state, counts, next; combination filter; "How it fits together" panel; AI line on each list; Describe for five kinds; Answer lists view; Conditions list (shared); Person roles read-only; Later list; reset emptying all masters; closing the typed-key routes.
* **Capability, built by another item (linked, not rebuilt):** AI run panel (W1-07), AI drafts (W1-10), form library (W1-06), per-form path (F3), lists and drawers (Screen 04 slices 1–5), reset and sample (W1-11).
* **Scaffolding (never ported):** Demo menu, Reset and Load sample buttons, Acting as, Prototype badge, replayed AI proposals, Sample counts, board controls.
* **Not built:** the "Later" masters; editing person roles; merge execution (P-52); translations; tier-3 AI review objectives.

## 9. Screen 04 slice 1 — what is reused
No Screen 04 slice 1 commits exist: the screens branch `claude/screens-01-fix-c3010a` (e4acc96) has nothing ahead of `main`, its copy is clean, and STATE (26 Oct) records that the screens-04 session never started (disk space). **Reused from the agreed Screen 04 concept:** lists and 540 px drawers, BR-2 statuses (re-check UM2), reuse per combination (BR-4), Describe and the exact-duplicate block (BR-5–7), the in-use guard (BR-9), contract §6. **Reused from main (built in Screen 02):** `LibraryChange`, generated keys, unique name, one approval page `/review/change/:id` with Withdraw and Correct, To review, `FormIntake`, the Draft setup launch (W1-07 replaces its look). W1-09 adds the Setup order page on top; Screen 04 slice 1 becomes W1-09 slice 2.

## 10. Decisions followed, missing or in conflict
* Followed: P-11, P-12, P-14, P-15, P-34, P-37, P-52, P-53, P-63, P-79, P-95–P-97, P-101, P-103, P-108, P-110; RULES-MODEL §1, §2, §7; MASTERS §1–§2; EXPERIENCE §2–§5.
* **[C1]** Conditions are "always shared sentences" (P-12, RULES-MODEL §2); the code stores them per combination (`Predicate.combinationId` required). Lead/PLAN: a shared condition record, combinations reference it.
* **[C2]** PRODUCT §3 menu lists Rules and no Setup order, Answer lists or Conditions; a new item needs a decision (Q1, Q3).
* **[M3]** P-95 keeps the AI meaning check off by default; P-110 asks every AI action, duplicate checks included, to be tested live. Draft: built, live-tested once within US$40, off by default in demos (replay).
* **[M4]** P-53 names Field, Section, Document type; Condition and Check follow P-34's "a person, by describing it to AI". Lead settles.
* **[C5]** Typed-key `POST /library/fields` still creates a field without a second person (Screen 04 re-check UB2; breaks P-15).
* **[M6]** Screen 04 slice 1 not built (§9).
* **[M7]** Boundaries: Setup order = the whole library by master; F3 path = one form in one combination; W1-08 = the combination's lines. One engine source for all three.
* **[M8]** Person roles: MASTERS says new master; no decision on who maintains it. Draft: the team, the expert confirms; read-only now.

## 11. Questions for the founder (recommendation first)
1. **Where does the library live?** *Recommend B:* one Setup order page as the library's front door, the lists behind it, with a Combination filter. *Else A* (separate lists, numbered) or *C* (inside each combination). *Scenario:* after Load sample you open Shared library and see "1 Forms · 14 in the library · Done; 3 Shared fields · 233 proposals ready to replay · Review".
2. **How is the order shown?** *Recommend b2:* a steps table (needs first, made by, state, next step, AI action) with a "How it fits together" map panel. *Else b1* (menu numbers only) or *b3* (map as the main view).
3. **Which missing masters join Wave 1?** *Recommend:* Answer lists (view under Fields), Conditions (shared list), Person roles (read-only); the other 11 listed as "Later". *Else* all now (several weeks more) or none (conditions stay per combination, against P-12).

## Definition of Ready (WORKFLOW.md)
- [ ] Board agreed (founder picks Q1, Q2)
- [x] Every element labelled Needed / Not built and Capability / Scaffolding (§8, board labels)
- [ ] Data and API needs known (shared condition record [C1], roles [M8], AI operations agreed with W1-07/W1-10)
- [ ] Every decision it relies on agreed (Q1–Q3; Lead: C1, M3, M4, M8)
- [ ] No open questions
- [ ] Capability row C3.16 added (Lead)
