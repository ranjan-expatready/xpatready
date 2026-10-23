# Rules and library model — who creates masters, and where each rule lives

Status: **Adopted 21 Oct 2026** (PRODUCT.md P-11, P-12 option A, P-14, P-15). Grounded in SA-01B v1.5 (SA-1B-9, 14, 36, 56, 57, 61, 103) and the 18 Oct redesign decision 1 ("AI drafts; people can always add or correct by hand").

## 1. How the shared library gets filled

**AI creates almost everything; people curate.**

```
Combination gets its sources (forms, checklist, guide)
  → AI reads them and proposes: reuse an existing field / new field / ambiguous / conflict
    (same for sections, document types, rules)
  → a person accepts (clean reuse can be accepted in bulk), edits or rejects
  → accepted items are written to the DRAFT library by the normal service (one script path, validated)
  → release publishes them; Fields, Sections and Document types then show them, with provenance
```

* There is **no direct "script writes to the database"** step outside the proposal path. The writing script exists, but it only runs on accepted proposals. That is what makes the library deduplicated, auditable and reversible.
* So the library screens change job: from "type a new section here" to **curate**: what AI added (and from which form), where each item is used, possible duplicates to merge, rules attached to it, freshness. The primary action becomes **"Review AI proposals (12)"**; **"Describe what you need"** is the secondary action for gaps and corrections (decision 1, P-34).
* **People add by describing it to AI (P-15, P-34):** plain-words request → AI drafts the item and shows equivalents → Use existing or Add new with reason → a different person approves. Keys are generated, never typed; duplicates are blocked by a no-AI layer and flagged by an AI meaning match. Full design: `decisions/P-34-library-authoring.md`.
* **Removing and adding by hand:** delete only an unused, never-released draft, otherwise retire (blocked while in use); AI advises with a verdict and never blocks (P-52, P-53: `decisions/P-52-library-lifecycle.md`).
* Every library item shows its origin: *AI-drafted from IMM 5257 · accepted by content publisher, 21 Oct* or *Added by hand*.

## 2. Where a rule lives — the scope test

Ask one question of every rule: **"Is this true of the facts themselves, wherever they are asked — or is it what IRCC requires for this particular application?"**

| Kind of rule | Example | Where it lives | Reused how |
|---|---|---|---|
| **A. Fact rule** (data depends on data) | "Ask spouse's name and marriage date when Marital status is Married or Common-law"; "Passport expiry must be after issue date"; "Ask previous marriage details when Previously married = Yes" | On the **field, field group or section** in the library (SA-1B-14) | Everywhere the section is used — automatically, in every combination |
| **B. Evidence link** (what a document proves) | "Marriage certificate proves marital status and marriage date" | On the **document type** in the library | Lets AI and staff know which document supports which fact; not a requirement by itself |
| **C. Requirement rule** (what this application needs) | "Marriage certificate required, once per couple, when married"; "IMM 5409 when common-law"; "Copy of LMIA when the job has an LMIA" | A **line on the combination**: what · item · who · only if (SA-1B-57) | The *condition* is a shared library sentence ("Is married or common-law"); the line is per combination. Many combinations get the same line via AI drafting or the "add to many combinations" tool (SA-1B-61) |
| **D. Eligibility / scoring** | "Needs CLB 7 in all four abilities"; CRS points | Per program, gates and scoring grids (SA-1B-37) | Shared reference tables (CLB, NOC) |
| **E. Country-specific guidance** | "How to get a police certificate in India" | Library section "Country-specific requirements" (SA-1B-103) | Shown next to the document wherever it applies |

**Checks whose setting varies** (passport valid until at least the requested stay; police certificate issued within N months) are written **once** as a shared check with a **value set per combination** by the expert — not a global rule and not a copy per combination.

**Conditions are always shared sentences** ("Is married or common-law", "Has an LMIA", "Is 18 or older on the application date"), defined once and reused by fact rules, requirement lines, forms, gates and steps (SA-1B-36). What differs is **where the rule is attached**, not where the condition is written.

## 3. Your example, decomposed

"If married is yes, then marriage certificate is required and spouse name is required":

| Piece | Kind | Lives | Why |
|---|---|---|---|
| Ask spouse's name, date of birth, marriage date | A. Fact rule | Family section (library) | True in every application that asks marital status |
| Spouse becomes a person on the case with their own forms | C. Requirement | Combination lines with *who = Spouse* | Whether the spouse files forms differs by application (accompanying or not) |
| Marriage certificate, once per couple | C. Requirement | Combination line, *only if Is married* | Some checklists require it, some don't, some only if the spouse accompanies |
| Marriage certificate proves marital status | B. Evidence link | Document type (library) | Same everywhere; helps AI propose the line and helps staff check the fact |
| IMM 5409 if common-law | C. Requirement | Combination line | Form list is per application |

## 4. Why not global-only, combination-only or inherited
Scored comparison and pros/cons: `decisions/P-12-rules-placement.md` (founder chose split by nature, 21 Oct). It mirrors IRCC's own material (form logic → person rules; checklist and guide → requirements), questionnaire standards (FHIR `enableWhen` on the question) and decision tables (DMN) for case-type requirements.

## 5. Guard rails (checked at release)

1. A combination may **add** requirements; it may never **weaken** a fact rule (cannot make a field optional that a fact rule or form needs; cannot hide it — SA-1B-9).
2. No question can be unreachable: every condition's input is asked before it is needed, for the right person (grounding-audit finding 3).
3. A changed shared condition or fact rule shows every combination it affects before release.
4. Every rule shows its source passage (form instruction, checklist line, guide paragraph) and its origin (AI or person).

## 6. Where it shows
Screen 04 library (person rules and checks on each field/section), Screen 03 workspace (requirement lines as sentences; person rules read-only "from the Family section"), Screen 05 rule map.

## 7. Validations and checks — what is fixed in code, what is data, what needs AI judgment

**Adopted 21 Oct (P-14).** Grounded in SA-1B-1 (validation on the field), SA-1B-15 (history coverage), SA-1B-21–24 and 105 (document validity and recency), SA-1B-35 (AI never sets a form value), decision 7 (only the form's own Validate stops; everything else warns), solution-page steps 3.8, 7.3, 8.1, 8.3, 9.2.

### Three tiers

| Tier | What it catches | Examples | Who writes it | How it runs | Shown in the library |
|---|---|---|---|---|---|
| **1. Field validation** | One value is malformed | Date of birth in the past; passport number format; max 30 characters (the form's own box limit); allowed values | AI drafts from the form's limits, scripts and instructions; a person accepts | Deterministic engine, the **same rule in every channel** (lead form, PQR, SQR, officer view, form fill), instantly on the field | Fields › field › **Validation** (with origin: "from IMM 5257 box limit, accepted 21 Oct") |
| **2. Consistency and document checks** | Values or documents disagree in a way that can be stated as a rule | Passport valid through the intended stay; police certificate older than 6 months (warning); marriage certificate required but marital status single; gap in address history; spouse listed but no spouse person on the case; age on the application date | AI drafts from guides and checklists; a person accepts; written as sentences in the shared condition language | Deterministic engine at set moments (below); **warns**, records the reason when overridden | **Checks** (new library list), and on each field, section and document type that a check reads |
| **3. AI review** | Contradictions and doubts that cannot all be listed in advance | Name spelled differently on passport and marriage certificate; employment dates in the résumé differ from the family/background form; travel history vs passport stamps; job duties that don't fit the occupation code; a letter of explanation that contradicts an answer | People write the **review objectives** ("Compare names across identity documents"); AI does the judging | AI at set stages only; each finding quotes both sources, gives severity and a suggested fix; the officer accepts or dismisses with a reason; **never changes data, never blocks** | **Checks**, kind "AI review", listing each objective, the stages it runs at, and how often its findings were accepted |

**The learning loop:** when AI review keeps finding the same pattern (e.g. "passport expires before the requested permit end date"), AI proposes it as a new tier-2 check; a content publisher reviews it in Checks and releases it. Over time more becomes deterministic, cheaper and identical every run; AI stays for what genuinely needs judgment.

### When each tier runs

| Stage | Tier 1 | Tier 2 | Tier 3 AI review |
|---|---|---|---|
| Lead form / PQR (prospect) | On each field, soft | — | — |
| Client questionnaire (SQR) | On each field | On section save, as warnings the client can explain | — |
| Document uploaded | — | Validity and recency of that document | Read the document, propose facts, compare with facts already on the case |
| Officer's facts sheet (before confirming) | All | All, listed with reasons | Open findings shown beside the facts they question |
| Before Autofill and form approval | All | All | **Final pass** across all answers, documents and filled forms |
| Form Validate | The form's own scripts — the only hard stop | | |
| Released pack changes an open case | — | Re-run on the affected case | Only if a changed check asks for it |

Running AI only at these stages keeps cost and noise down and puts findings in front of the person who can act on them. Each AI review run states its estimated cost; stub/replay for tests.

### What this means for screens

* **Fields** drawer gains a **Validation** tab (tier 1) and a **Checks** tab listing tier-2 checks and AI objectives that read the field.
* **Checks** becomes a Shared library item: filter by kind (Field validation · Consistency · Document validity · AI review), origin (AI-drafted / person), stage, and where used; each AI objective shows its accept rate.
* Case officer screens (later milestone) show tier-2 warnings and tier-3 findings in one list on the facts sheet, each with evidence and Accept / Dismiss with reason.
