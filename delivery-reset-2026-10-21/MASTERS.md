# Masters catalogue — Pathway Configurator (Super Admin)

Status: **Proposal for build**, 21 Oct 2026. Grounded in SA-01B v1.5 (snapshot 2026-10-19-1233), SA-01B-REDESIGN-DECISIONS (18 Oct) and the team's code capture `ERv2-sanitized@22f1d12` / `ERv2-frontend@5ccd9fa`. Where this file says "exists", the model or screen is in the team's code today; "new" means it must be added. Requirement IDs in brackets.

**Rule for the builder:** extend the team's existing models and screens (`apps/api/prisma/models/country-pack-*.prisma`, `src/features/admin/spine-authoring/*`). Do not create a parallel schema. Sample immigration content arrives as data import, never in code (CI content-neutrality gate, `apps/api/tools/check-content-neutrality.ts`).

---

## 0. Shape of the whole thing (one picture)

```
Country (Canada)
└─ Pack version  (draft → in review → published; firms pin a version)        [SA-01 container — exists]
   ├─ PROGRAM TREE  ──────────────────────────────────────────────── the spine
   │   Pathway › Program › Category › Sub-category                       [SA-1B-50]
   │   └─ ROW = full combination (leaf)                                  [SA-1B-55]
   │       ├─ row settings: allowed locations, filing method + portal,    [D13, D16b]
   │       │                fees, stages/route, linked categories        [SA-1B-52,54,66; D10]
   │       └─ LINES (one shape): what → item → who → only-if → order     [SA-1B-57]
   │            what ∈ {Section, Document, Form, Government step, Standard step}
   │
   └─ LIBRARY (authored once, reused by any row)                         [SA-1B §3]
       Fields · Answer lists · Field groups/Purposes · Sections · Document types
       (+ substitute sets) · Forms (+ editions + box maps) · Conditions ·
       Gates · Scoring · Reference tables · Government steps · Standard-step
       starters · Person roles · Key-date types · Regulator setup ·
       Country-specific requirements · Deficiency checks · Labels/translations
```

The one sentence to hold on to (SA-01B §1): **everything resolves for a person on a filing's row.** A row's lines filtered by that person's role and the only-if conditions give that person's questionnaire, checklist and forms.

---

## 1. Which masters are trees, which are flat

| Master | Shape | Depth | Why this shape | Code today |
|---|---|---|---|---|
| **Program tree** | **Tree** (strict) | 4: Pathway › Program › Category › Sub-category | Each level answers one question; one parent per node; leaf = row [SA-1B-50, SA-1-12] | `ProgramDef` exists with `nodeKind` PATHWAY/PROGRAM/STREAM/CATEGORY; tree page exists (`program-hierarchy-page.tsx`) |
| **Route / stages** per category | **Ordered graph** (small) | stages + allowed-next | EE profile → ITA → PR application; PNP base vs enhanced; repeatable stages [SA-1B-66, D10] | `StagePipeline`/`StageTemplate` exist but model the old one-pipeline idea; needs rework |
| **Forms** | **Tree** | Form › Edition › Box map (page › box) | Row points at the form, never an edition [SA-1B-26] | `GovFormDef`, `FormEdition`, `FormFieldMap` exist; no frontend editor |
| **Sections** | **Tree** | Section › Placement (field group or field) › rules | Placements carry wording/required/hide only [SA-1B-7..9, 13..16] | `LogicalSection(+Version)`, `SectionQuestion`, `SqrSectionSelection` exist |
| **Field groups** | **Tree** | Group › Fields; Group › Purposes | Address, job, education travel together; purposes derived 5 fixed ways [SA-1B-6, 10..12] | Build on `CanonicalField` type `COMPOSITE`; placements and purposes are **new** |
| **Scoring** | **Tree** | Config › Factor › Bracket | Points tables, conversions, caps [SA-1-21..26, D8] | `ScoringConfig`, `ScoringFactor`, `ScoringBracket` exist |
| **Gates** | **Tree** | Rule set (per program) › Rule | Hard yes/no per program [SA-1B-37] | `EligibilityRuleSet`, `EligibilityRule` exist |
| **Reference tables** | **Tree** | Table › Version (columns) › Rows (dated) | Dated values, versioned codes NOC 2021→2026 [SA-1B-41..44, D17] | `ReferenceDataset(+Version, +Row, +Content)` exist |
| **Regulator setup** | **Tree** | Country › Representative type › Licensing body | RCIC/CICC, lawyer/law societies [SA-1B-47, SA-1-8] | `RegulatorConfig` exists |
| **Country-specific requirements** | **Tree** | Country of issue › Entry (attached to doc type or form) | Police certificate per country [SA-1B-103] | **New** |
| Canonical fields | Flat (faceted) | — | One definition per question asked anywhere [SA-1B-1..5] | `CanonicalField` exists |
| Answer lists | Flat with child values | List › Values (+ form-option map) | [SA-1B-4, 5] | `EnumSet`, `EnumSetValue` exist |
| Document types | Flat, grouped by category | Type › Substitute sets | [SA-1B-18..24, 104, 105] | `DocumentType` exists; library-level substitute sets **new** |
| Conditions | Flat | — | Sentences reused by questions, docs, forms, gates, steps [SA-1B-36] | `Predicate`, `ConditionFlagDefinition` exist |
| Government steps | Flat | — | Staff name, client name per language, deadline rule, usual timeline [SA-1B-45, 96] | **New** as library item |
| Standard-step starters | Flat, per program | — | Firm to-do starter set with default days [D14] | **New** |
| Person roles | Flat | — | Principal, spouse/partner, dependent child, sponsor, co-signer, employer, representative [SA-1B-72] | **New** (today `subjectKind` is free text — §12 conflict) |
| Key-date types | Flat | — | Work/study permit expiry, PR card, biometrics, medical, police, passport [D15] | **New** |
| Deficiency checks | Flat | — | Case deficiency library is pack content [SA-1-74, AG07-D7] | **New** |
| Labels / translations | Cross-cutting | — | Every displayed pack text is a label per language [SA-1-42, 43] | `LocalizedLabel` exists; translations page exists |

**Not masters (runtime records, never edited in the Studio):** client/person profile and their facts, prospect + PQR answers + assessment, case › filing › person-on-filing (with rules pin), resolved questionnaire/checklist/forms, uploaded documents and extracted facts, generated form outputs.

---

## 2. The program tree in detail

```
Pathway        Individual | Corporate                         (client type comes from here — SA-1B-51)
 └ Program     Work permits · Study permits · Visitors · Family sponsorship · Economic PR · Citizenship · LMIA …
    └ Category      Employer-specific work permit · Open work permit · …   (the application the firm opens)
       └ Sub-category  Spousal OWP · PGWP · IEC …  (only where rules/questions/documents genuinely change)
```

* **Row = the leaf**: a Category with no sub-categories, or a Sub-category. Publishing blocks any line attached above a row [SA-1B-56].
* **Not levels** (per SA-01B and D13): inside/outside Canada (a per-person case detail with "only if" tags; separate sub-category only where IRCC treats them as different applications); family composition (roles on lines, not a level); invitation received (which filing/stage the case is on).
* **Enum adapter (needs backend lead's confirmation):** code enum is `PATHWAY / PROGRAM / STREAM / CATEGORY`; business labels are Pathway / Program / Category / Sub-category. Proposal: keep the persisted enum, display `STREAM` as "Category" and `CATEGORY` as "Sub-category". Do not rename the enum in a migration.
* Node rules that already exist and must stay: one parent in the same country [SA-1-12]; disable, never delete; no removal while children exist [SA-1-13]; siblings reorder as a set [SA-1-14]; stable key [SA-1-15].

### Row settings (on the leaf only)

| Setting | Values | Source |
|---|---|---|
| Allowed locations | Outside Canada, Inside Canada, Port of entry (later) | D13 |
| Filing method | Fully online · Online screens + PDF forms · PDF forms | D16b |
| Portal | Representative Portal · Representative PR Portal · IRCC Portal · … | D16b |
| Fees | Picked from the fee reference table: fee name, who pays (principal, spouse, each dependant) | SA-1B-52 |
| Stages | Ordered stages, allowed next, repeatable flag; each stage may have its own row | SA-1B-66, D10 |
| Linked categories | "usually follows / supports" | SA-1B-54 |
| Source | Government source, date checked (today), next review (+12 months) | SA-1B-39 |

---

## 3. The line — one shape for everything [SA-1B-57]

```
LINE = { kind, item, who, onlyIf, order, source }

kind    Section | Document | Form | Government step | Standard step
item    → the library record (stable key)
who     "once for the application"  OR  "each person in roles [Principal, Spouse, Child ≥18 …]"
        default comes from the library item; a row may override for itself [SA-1B-60]
        forms add: copies (per application / per person / per couple), min age,
                   completed by, signed by, signature method, country variant [SA-1B-102]
onlyIf  → a Condition (sentence), optional
order   integer within kind
source  government source + date checked + next review [SA-1B-39]
```

A line is created in two places only: on a row, or on a question inside a section ("this answer adds that document") — both produce the same line [SA-1B-58]. Every resolved item carries its reason ("asked because your row is a spousal open work permit") [SA-1B-59].

**Data proposal (backend lead decides):** one `ProgramLine` table keyed by `(packDraft/version, programNodeKey, kind, itemKey)` with `whoMode`, `roleKeys[]`, `conditionKey`, `order`, form-line extras as JSON validated by a contract, plus source fields. Existing `SqrSectionSelection` and `DocumentRequirement` become views/adapters during migration. Rationale: SA-1B-57 asks for one shape; five per-type tables make "copy row", "add item across many rows" and the resolver five times the work.

---

## 4. Library masters — fields each one needs

Defaults from SA-01B §14 are marked (D).

**Canonical field** [SA-1B-1, 2; D6]: key (stable), label per language, type (`STRING NUMBER BOOLEAN DATE ENUM COMPOSITE` — exists), answer list, validation (length, pattern, min/max), unit, subject (person / employer), tier (lead / prospect / case; D = case), filled by (Client / Case officer; locked-to-client for background & declaration questions), privacy (D = private), immigration-significant, re-confirmation rule, source. Shows: where used (sections, form boxes, rules, conditions), similar fields (duplicate guard).

**Answer list** [SA-1B-4, 5]: key, values (code, label per language, order, retired flag), optional source reference table, per value the matching option on each government form that uses it.

**Field group** [SA-1B-6, 10, 11]: key, fields, checks (country drives province list, postal format), list-shaped flag (asked once with dates and tags), purposes (one of five fixed kinds: current · for post · all · latest · overlapping a date range).

**Section** [SA-1B-13..16]: key, title per language, placements (group/field, client wording, help, required (D = required), hide optional fields), show/hide/require rules on its own questions, "answer adds document" lines, repeat with max and coverage rule (Advanced, D = off), estimated completion time, where used.

**Document type** [SA-1B-18..24, 104, 105; D15]: name, description, category (identity, civil status, financial, employment, education, police/medical, translation, other), accepted formats, certified translation if not EN/FR (D = no), provided by (client / employer / government), handling (standard / restricted / restricted-health; D = standard), expires (D = off) and how expiry is known, must outlive (submission / decision / permit duration), warning lead times (D = 90/30, Advanced), feeds key-date type, substitute sets (any one / all together), country-specific entries, where used.

**Form** [SA-1B-26..35, 102; D3, D4]: code, title, country variants, filed as (PDF / portal), technology (AcroForm / XFA), editions (edition date, effective date, PDF, parsed box inventory), current edition, box map per edition (box → purpose + field, transform, value map, overflow), box status (filled / needs review / unmapped / never filled), map coverage %, answer-sheet order, trial status for direct filling.

**Condition** [SA-1B-36; SA-1-16]: sentence over fields/purposes/reference tables (equals, not equals, in, ≥/≤, between, exists, and/or/not, age on a date), where used, test against a sample person.

**Gate / scoring grid** [SA-1B-37, 38; D8, D8b]: per program; factors and brackets; caps and pass marks; test bench against sample profiles and the practice engine answer key; second-person approval.

**Reference table** [SA-1B-41..44; D17]: type, columns per version, key columns, rules, rows with valid-from/to, bulk upload with preview, source + review dates, where used, code-version mapping.

**Government step** [SA-1B-45, 96; D14]: staff name, client name per language, has-deadline, deadline rule (calendar days from an event), usual timeline, gate, never hidden by firms.

**Standard-step starter** [D14]: per program, to-do name, who, default business days, only-if; firm copies and edits.

**Person role** [SA-1B-72]: key, label per language, can be principal, min age, counts as dependant, adult/minor rules (no send under 18, SA-1B-76).

**Key-date type** [D15]: name, whose date, reminder lead times, keep watching after case closes.

**Regulator setup** [SA-1B-47, 98]: representative types, licensing bodies, licence label and format.

**Country-specific requirement** [SA-1B-103]: country of issue, attached to (document type / form), guidance text per language, source + review dates. Exact fields open (SA1B-Q13).

---

## 5. What firms (agent side) may change — and nothing more

From SA-01B §11 and D11/D14: hide a standard checklist item or standard step **without a deadline** (new cases only, recorded, reversible); rename client-facing step names; own to-do list templates (copied from starters); own document-return reasons (defaults supplied); own lead-form fields. Firms never add, hide or reorder pack questions (W-17).

## 6. Open items that block parts of this (route to owner, do not guess)

| Item | Owner | Blocks |
|---|---|---|
| Enum label adapter STREAM/CATEGORY (§2) | Backend lead | Program tree labels |
| One `ProgramLine` table vs per-type adapters (§3) | Backend lead | Row editor, resolver |
| Country-specific requirement fields (SA1B-Q13) | Immigration expert + backend lead | That master only |
| Launch field-map authoring route (SA1B-Q12) | Backend lead + immigration expert | Forms box-map editor |
| Real Canada content (programs, forms, documents, values) | Immigration expert (AIW-D50) | Live content only — build uses labelled synthetic data |
