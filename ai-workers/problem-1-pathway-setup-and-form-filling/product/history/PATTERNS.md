# Patterns — one way to build every capability

There are a hundred ways to make any screen work. This file picks **one** so that front end, API, data and engine are built the same way every time, and so a shortcut that "works" but skips masters, links or validation is visibly wrong. The builder follows it; the reviewer checks against it.

## 1. The capability blueprint — ten layers, always in this order

Every capability (a screen, or a feature on a screen) is specified and built through the same ten layers. A concept or build note that skips a layer must say why.

| # | Layer | The question it answers | Where it lives |
|---|---|---|---|
| 1 | **Job** | Who does what, to get which outcome? One sentence. | concept.md |
| 2 | **Masters** | What is stored once and reused? Key, label, status, version, source, where-used. | MASTERS.md, Prisma |
| 3 | **Links** | How do masters relate? Tree (one parent), link (many-to-many), or line (configuration). Integrity rules for each. | MASTERS.md, Prisma constraints + service checks |
| 4 | **Configuration** | What does a combination say about the masters? Always the one line shape: what · item · who · only if · order. | Prisma `ProgramLine`-style records |
| 5 | **Rules** | When does something apply? Sentences over fields; validated at save and again at release. | engine/ + rule records |
| 6 | **Engine** | What comes out for a person on a case? Deterministic, from released configuration + facts, each item with its reason. | engine/ (pure functions) |
| 7 | **Contract** | How do screens talk to the backend? Typed request/response, draft vs released, idempotent writes, version checks, field-level errors. | api/ + shared types |
| 8 | **Screen** | Which standard pattern (§3) shows it, with every state (§4)? | web/ |
| 9 | **AI assist** | Where can AI propose, with what evidence, and how does a person accept? Never writes released content. | api/ai, proposal records |
| 10 | **Governance** | Draft → review → release; author ≠ approver; freshness dates; audit trail; permissions. | api/studio release path |

## 2. Non-negotiables (shortcuts that are always wrong)

1. **Content is data.** Programs, forms, documents, fields, rules and fees are records, never constants in code.
2. **Pick, don't type.** Where a master exists, the UI selects it; free text creates nothing. New masters only through their own governed "Add" path with a duplicate check.
3. **Defined once.** A field, section, document type or form exists once in the library; combinations point to it. Copies are a defect.
4. **Every link is checked twice** — in the database (keys, uniqueness, parent level) and in the service (business rule), never only in the browser.
5. **Every master shows where it is used** before it can be changed or retired; retire, never delete, anything referenced.
6. **Every dependency is validated at release:** no unreachable question, no hidden field that a form or rule reads, no rule that can never be true, no form without a current edition.
7. **Released means frozen.** Edits go to a draft; cases pin the release they started on.
8. **AI proposes, people decide.** AI output is a proposal with source evidence until accepted; acceptance writes to the draft; only release publishes.
9. **Every output explains itself:** each question, document and form on a case carries "because …".
10. **Every business rule is a test** — one that passes and one that must fail.
11. **Freshness is data:** source, date checked, next review on every content item.
12. **Mirror the team:** model, field and route names follow the team's code (`code/ERv2-sanitized@*/apps/api/prisma/models/country-pack-*.prisma`); where we must differ, the build note records the mapping.

## 3. Standard screen patterns (choose one; do not invent a new one)

| Pattern | Use for | Shape |
|---|---|---|
| **Catalogue** | Finding and comparing many records (Programs) | Workspace switch, filter chips, grouped table, one next action per row, selection opens a side panel |
| **Workspace** | Working on one record deeply (a combination) | Header with path + status + next action; one row of tabs at most; lines list on the left, live preview on the right |
| **Library list** | Masters (Fields, Sections, Document types, Forms) | Search + facets + table with "used in"; click opens a drawer (Definition · Where used · History) |
| **Side panel** | Summary and quick actions without leaving a list | 480–560 px drawer, sections not tabs, footer link to the full workspace |
| **Dialog / wizard** | Creating something that must be correct first time | ≤3 steps, master pickers, duplicate check before Next, a "will be created as" line |
| **Source + proposals** | Reviewing AI work | Source (PDF/page) on the left, proposals on the right, selected item highlighted in both; Accept / Edit / Reject per item and in bulk |
| **Change set** | Review and release | Every change grouped by master with before/after, who (AI or person), impact, expert confirmations; approver ≠ author |

## 4. States every screen must draw

Empty (teaches the first action) · loading (skeleton, no spinner walls) · normal · long content (long names, 100+ rows) · partial / needs work (says exactly what is missing and links to it) · running (real progress, no invented percentages) · error (on the field; what to do next) · read-only (released, or no permission) · conflict (someone else saved; reload or merge).

## 5. Full-stack check for every UI element

Before an element is built, the builder can answer all five; the reviewer asks them:

| Element on screen | Record it reads/writes | API call | Rule that guards it | Test that proves it |
|---|---|---|---|---|
| e.g. "+ Add" form on a combination row | ProgramLine(kind=FORM) → GovFormDef | `POST /combinations/:id/lines` | form has a current edition; not already attached | attach succeeds; duplicate attach refused |

## 6. How a capability is described (template used in every concept.md)

```
Job · Persona · Journey step (one-pager activity ID) · SA-01B IDs
Masters touched · Links · Configuration lines · Rules (BR-n)
Engine output · Contract (endpoints, shapes, errors)
Screen pattern · Layout · States · Copy and tooltips
AI assist (where, evidence, accept path) · Governance (draft/release, roles)
Tests (one pass + one fail per BR) · Open questions (≤3, each with a recommendation)
```
