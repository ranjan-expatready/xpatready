# Delivery reset — why we are slow and how we ship

> **Living files moved, 21 Oct:** the working product home is now `ai-workers/problem-1-pathway-setup-and-form-filling/product/` (PRODUCT, STATE, SCREENS, PATTERNS, RULES-MODEL, TAXONOMY, MASTERS, UX-RULES, QUALITY, WORKFLOW, REQUESTS). The files in this folder are the 21 Oct review record; `switchover/` holds the instruction swap to apply once the previous builder session stops.

21 Oct 2026. Independent review of Workstream 2 (the AI layer / Pathway Configurator). Written outside the maker and reviewer sessions; it changes no maker file and no founder decision. Files here:

| File | For | What |
|---|---|---|
| `README.md` | Founder | Diagnosis, plan, decisions needed |
| `OPERATING-MODEL.md` | Founder, Lead, Reviewer | Roles, the loop, what to stop, session prompts |
| `MASTERS.md` | Lead, Claude Code, backend lead | Every master, which are trees, the row and the line |
| `SCREENS.md` | Lead, Claude Code, Reviewer | UX rules and screen-by-screen blueprint |
| `SLICE-01-BRIEF.md` | Claude Code | The first build slice (after Screen 1 concept is agreed) |
| `SCREEN-PROCESS.md` | Founder, Lead, Claude Code | The per-screen loop: concept, agree, build, score, hand over |
| `QUALITY-DIMENSIONS.md` | Reviewer | Sixteen dimensions every screen is scored on |

## 1. Diagnosis (most damaging first)

**Facts** (checked in the folder today) and **judgment** are separated. Confidence in brackets.

1. **The workstream cannot ship by design.** *Fact:* `AGENTS.md` forbids commits, pushes and PRs in any repository. So the work happens in `ai-workers/problem-1-…/prototype/studio`, a separate app with its **own Prisma schema of 27 models, 11 of which re-declare the team's models by name** (`ProgramDef`, `GovFormDef`, `FormEdition`, `FormFieldMap`, `CanonicalField`, `LogicalSection`, `SectionQuestion`, `SqrSectionSelection`, `DocumentType`, `DocumentRequirement`, `Predicate`). The team's code already has 47 pack models and 17 authoring pages (`spine-authoring/`). *Judgment:* nothing built this way can ever be "implemented"; it must be rebuilt in the product. [high]
2. **Process has eaten the build time.** *Fact:* 285 founder decisions in 14 days (8–21 Oct, ~20 a day); `decisions.md` 348 KB and `PROGRESS.md` 251 KB (≈600 KB together); 47 SHA-256 revision manifests; 56 check folders; the maker and reviewer roles were reassigned or redefined at least six times (D198, D204, D247, D248, D266, D267); roughly a third of the decision log's lines are about makers, reviewers, sessions, handoffs or manifests. `NEXT.md` cites 10 decision numbers in one "next outcome". *Judgment:* each new session spends much of its context loading rules before it builds anything. [high]
3. **The target keeps moving.** *Fact:* direction reset 16 Oct; then D269/D270 (demo flow), D272 (document intelligence first), D274 (full persona journey), D275 (configuration MVP first) — four "priorities" in two days. *Judgment:* without a frozen slice, every session re-plans. [high]
4. **AI before the deterministic core.** *Fact:* SA-01B §12 (team's own code check) says what is missing is row assembly for a full combination, per-role selection, filings/routes, a resolver and preview, and a forms editor — all deterministic. Meanwhile paid AI field-map runs and ledgers continue (US$26.72 committed of a US$100 cap). *Judgment:* AI drafting is an accelerator for a row editor that does not exist yet in the product. [high]
5. **The build drifted from the team's spec.** *Fact:* the 21 Oct grounding audit FAILED on four points, including the configuration identity modelled on family composition instead of SA-01B's "one row per full combination" (SA-1B-55), and "five sample programs" that are three. *Judgment:* the maker built from the one-pager and decisions log, not from SA-01B, because the rules put the workstream's own documents first in practice. [medium-high]
6. **Nobody owns "is this a good product".** *Fact:* the checker's brief is invented facts, decision contradictions, old words and readability. *Judgment:* no one is asked whether an RCIC could use the screen, so UI quality is left to chance. [high]
7. **The UI's problem is structure and language, not styling.** *Fact (screenshots `studio/evidence/browser-run-4/`):* internal language on user screens ("Imported from the reviewed release c1-v3 … guarded path", hashes like `23f4b6f1c8`, "Replay of a saved run", "Library revision e3b0c44298 (0 definition rows)" — the fingerprint of an empty library); five tabs each holding five more tabs; a 27-row document table with full government quotes per row; only 3 of ~18 masters in the library nav; the four-level tree shown as a flat table. The visual baseline (spacing, type, components) is fine. [high]

## 2. What to do

**One sentence:** agree each screen as a concept first, then build it as a production-grade local reference that mirrors the team's schema and components, one slice at a time, scored by an RCIC reviewer, and hand each slice to the team to retrofit.

### Plan — the configurator core (slices 0–3) in about three weeks, slices 4–6 by week five

| Slice | Days | Delivers (screen) | Key requirements |
|---|---|---|---|
| 0 Setup | 1–2 | Team repo running locally for Claude Code; synthetic Canada pack imported as data; enum label adapter agreed | SA-1 §3.13, CI content gate |
| 1 Program tree | 3–4 | S1 tree + readiness | SA-1B-50..56, SA-1-12..15 |
| 2 Row editor | 4–5 | S2 lines (forms, documents, sections, steps) with who + only-if; startable checks | SA-1B-57..63, 90, 102 |
| 3 Resolver + preview | 3–4 | S2 preview per person with reasons | SA-1B-59, 62, 73 |
| 4 Library | 3–4 | S3 fields, S5 documents with where-used and duplicate guard | SA-1B-1..5, 18..24 |
| 5 Review & publish | 3 | S10 change set with diff, expert confirmations, separate approver | SA-1B-38; D1, D2 |
| 6 Forms + AI | 5 | S6 box-map split view, answer sheet, S12 "add a form with AI" | SA-1B-26..35; AG07-D17; D3 |

Then the officer side (facts sheet, autofill, document review, form review) and the client family link.

### Salvage from the prototype (port, don't discard)

The IRCC source captures and box inventories; the AI field-map drafting job and its prompts/contracts; the render/validate logic **with grounding-audit findings 2 and 3 fixed** (review diff must include every behavior-bearing setting; hidden-but-needed fields must fail publishing); sample families and fixtures; the cost guard. Port each into the team repo as part of the slice that needs it.

## 3. Founder decisions (21 Oct, answered)

1. **Where the build happens: locally, never in the team's repositories.** The founder builds a production-grade reference (screens and the backend for the capabilities being proven) and walks the team through it; the team retrofits it into ERv2 and commits it themselves. This replaces recommendation (a). Consequence for diagnosis point 1: the separate build is intentional, so the risk to manage is **retrofit cost** — the reference must mirror the team's model names, contracts, components and tokens (quality dimension D14), not invent its own.
2. **Roles:** the founder is the Lead (until the Product Owner starts); an RCIC is the Reviewer, assisted by a Claude review session.
3. **Way of working from now on:** every screen is first agreed as a concept — logic, business rules, how masters link, layout — on the shared design canvas, then Claude Code builds it. See `SCREEN-PROCESS.md` and `QUALITY-DIMENSIONS.md`.

Still open: freezing scope to the configurator core, and retiring the process layer (manifests, handoff prompts, session rules).

Unconfirmed: whether the team's live branches match the 19–20 Oct code captures (live freshness checks failed on 21 Oct per the grounding audit). Pull fresh read-only copies before building.
