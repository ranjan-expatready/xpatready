# Masters — what is stored, and which masters are trees

Grounded in SA-01B v1.5, the 18 Oct redesign decisions and the team's code captures (`code/ERv2-sanitized@*/apps/api/prisma/models/country-pack-*.prisma`). "Exists" = in the team's code today; "New" = to add. The reference app mirrors team names; differences get a recorded mapping (P-10). Long version: `history/MASTERS-long-2026-10-21.md`.

## 1. Shape of the whole thing
```
Country › Pack version (draft → review → published; firms pin a version)          [SA-01 — exists]
├─ Program tree: Pathway › Program › Category › Sub-category                        [SA-1B-50]
│   └─ Combination = the last level present (leaf)                                  [SA-1B-55]
│       ├─ settings: allowed locations, filing method + portal, fees, stages, links [D13, D16b, SA-1B-52/54/66]
│       └─ Lines (one shape): what → item → who → only if → order                   [SA-1B-57]
│             what ∈ Section | Document | Form | Government step | Standard step
└─ Library: Fields · Answer lists · Field groups/purposes · Sections · Document types (+ substitute sets)
            · Forms › PDF editions › field maps; online versions › screen maps (P-61/62) · Portals · Conditions · Checks · Gates · Scoring · Reference tables
            · Government steps · Standard-step starters · Person roles · Key-date types · Regulator setup
            · Country-specific requirements · Deficiency checks · Labels/translations
```
Everything resolves for **one person on one filing's combination**: its lines filtered by that person's role and the "only if" conditions.

## 2. Trees and flat lists
| Master | Shape | Levels | Code |
|---|---|---|---|
| Program tree | tree | Pathway › Program › Category › Sub-category; leaf = combination | Exists (`ProgramDef.nodeKind`; label adapter STREAM→Category, CATEGORY→Sub-category) |
| Linked combinations | links between leaves | supports · follows; carry named facts and documents | New |
| Route / stages | ordered graph | stages, allowed next, repeatable | Rework (old one-pipeline model) |
| Forms | tree | Form › Edition › Box map (page › box) | Backend exists; no editor |
| Sections | tree | Section › Placement › rules | Partial; placements new |
| Field groups | tree | Group › Fields; Group › Purposes (5 fixed kinds) | New, on `COMPOSITE` type |
| Scoring · Gates | tree | Config › Factor › Bracket; Rule set › Rule | Exists |
| Reference tables | tree | Table › Version › dated Rows | Exists |
| Regulator setup | tree | Representative type › Licensing body | Exists |
| Country-specific requirements | tree | Country of issue › Entry on a document or form | New |
| Fields · Answer lists · Conditions | flat (faceted) | List › Values › form-option map | Exist |
| Document types | flat, grouped | Type › Substitute sets | Partial |
| Checks | flat | field validation · consistency · document validity · AI review objective | New (`domain/RULES-MODEL.md` §7) |
| Government steps · Standard-step starters · Person roles · Key-date types · Deficiency checks | flat | — | New |
**Not masters:** client/person facts, prospect + assessment, case › filing › person-on-filing (pinned release), resolved questionnaire/checklist/forms, uploads, generated forms.

## 3. Program tree rules
Pathway (Individual / Corporate) · Program (area) · Category (the application the firm opens) · Sub-category (only where content really changes). **Not levels:** inside/outside Canada (per-person condition, D13 — separate sub-category only where IRCC treats it as a different application), family composition (roles on lines), invitation/stage (links). Existing node rules stay: one parent in the same country; disable, never delete; no removal while children exist; siblings reorder as a set; stable keys (SA-1-12..15). Nothing attaches above a combination (SA-1B-56).
**Combination settings:** allowed locations · filing method (online / online + PDF / PDF) and portal · fees from the fee table with who pays · stages · links · source with date checked and next review (+12 months).

## 4. The line [SA-1B-57, 58, 60, 102]
`{ kind, item, who: once | roles[…], onlyIf: condition?, order, source }` — form lines add copies, minimum age, completed by, signed by, signature method, country variant. Created on a combination or on a question inside a section; both produce the same line. Library supplies the default "who"; a combination may override for itself. Proposal (backend lead decides): one `ProgramLine` table; existing `SqrSectionSelection` / `DocumentRequirement` become adapters during migration.

## 5. Key fields per library master (defaults per SA-01B §14 in brackets)
* **Field:** key, label per language, aliases (labels seen on forms; merged-away ids redirect here, P-65), type (STRING NUMBER BOOLEAN DATE ENUM COMPOSITE), answer list, validation, unit, subject (person/employer), tier (lead/prospect/case) [case], filled by (Client/Case officer; locked to client for background/declarations), privacy [private], immigration-significant, origin, where used.
* **Section:** title, placements (wording, help, required [yes], hide optional fields), its own show/hide/require rules, "answer adds document" lines, repeat + coverage rule [off], estimated time, where used.
* **Document type:** name, category, formats, certified translation [no], provided by, handling [standard], expires [off] and how expiry is known, must outlive, warning lead times [90/30], feeds key-date type, substitute sets, recency (SA-1B-105), country notes, where used.
* **Form:** code, title, country variants, filed as (PDF/portal), AcroForm/XFA, PDF editions with parsed form fields, online versions (portal, screens, captured date), current edition, field map (form field → purpose + field, transform, value map, overflow), box status, coverage %, trial status.
* **Condition:** sentence over fields/purposes/tables (=, ≠, in, ≥, ≤, between, exists, and/or/not, age on a date), where used, test with a sample person.
* **Check / Gate / Scoring / Reference table / Government step / Person role / Key-date type / Regulator / Country-specific:** as SA-01B §3.6–3.10 and redesign decisions 8, 14, 15, 17; every content item carries source, date checked, next review (SA-1B-39).

## 6. What firms may change — nothing more
Hide standard checklist items and standard steps **without a deadline** (new cases only, recorded, reversible); rename client-facing step names; own to-do templates, document-return reasons and lead-form fields. Firms never add, hide or reorder pack questions (W-17).

## 7. Open items (route, don't guess)
Enum label adapter (backend lead) · one `ProgramLine` table vs adapters (backend lead) · country-specific entry fields, SA1B-Q13 (expert + backend lead) · launch field-map authoring, SA1B-Q12 · real Canada content (immigration expert, AIW-D50).
