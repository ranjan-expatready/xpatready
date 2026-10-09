# Coverage: proof that every source file was read in full (W1, 9 Oct 2026)

*Merged from seven per-slice coverage files and SCHEMA.md on 9 Oct (audit §5.5). Content unchanged.*

---
## From SCHEMA.md

# Inventory format: every reader uses exactly this

Source: `sources/drive-snapshot-2026-10-09/` only. Each reader writes two files in this folder: `<slice>.md` and `coverage-<slice>.md`.

## `<slice>.md`

### Part 1: Components
One row per module (for example AG-07) and one per meaningful sub-component (a section that does a distinct job, for example "AG-07 §3.4 Government milestones").

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |

Plane is one of: Foundation · Admin (SA) · Firm (AG) · Client portal (CP) · Cross-cutting.

### Part 2: Doers and engines seen in this slice
| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |

### Part 3: AI and automation already written into the requirements
Every place the documents already mention AI, machine learning, OCR/extraction, suggestions, "next-best-action", scoring, auto-drafting, or anything an AI Worker could build on. **Quote exactly.** Include anything explicitly excluded or deferred, and the reason given.

### Part 4: Guardrails already in the requirements
Approvals, review-before-share, audit trail, permissions, consent, retention, licence checks: anything an AI Worker must obey. Quote and cite.

### Part 5: Conflicts, gaps and surprises
Contradictions between documents, missing pieces, and anything that matters for AI Workers. Facts only; label any interpretation **Inferred**.

## `coverage-<slice>.md`
| File | Version | Words | Read in full? (yes/no) | Sections covered | Notes |

Rules: read every file in your slice from start to end, in chunks, and write your notes into the file as you go so nothing is lost. Never summarise a section you did not read. Quotes must match the source word for word (under 25 words each). Plain business language.

---
## From coverage-ag-frs-1.md

# Coverage: slice "ag-frs-1"

| File | Version | Words | Read in full? (yes/no) | Sections covered | Notes |
|---|---|---|---|---|---|
| 00-Overview_v1.11_2026-10-07.md | 1.11 | 6,957 | yes (lines 1–196) | Change log; Document Control; How maintained (DOCS-1..7); Summary; Detailed Scope Index; Cross-Cutting Mandates; Agent-native operation; Purpose; Country-Awareness; In-House by Design; Sub-Roles; Permission model | — |
| 99-Phasing-and-Glossary_v1.4_2026-10-05.md | 1.4 | 4,616 | yes (lines 1–87) | Change log; Phasing (R1, R2, Later, Release gate); Glossary (all terms) | — |
| AG-01-firm-setup-and-onboarding_v1.16_2026-10-08.md | 1.16 | 26,012 | yes (lines 1–823) | Change log; §0 decisions AG1-D1..D20, SA-06 applied; Module Index; Visual Overview; §1–§13 incl. AG-1-1..67, BR-1..18, states, entities, US-1..13, edge cases, permissions, SSP, reference note, open questions | — |
| AG-02-prospect-lead-sales-crm_v1.9_2026-10-07.md | 1.9 | 31,070 | yes (lines 1–1010) | Change log; Applied-from tables (SA-06, AG-01, AG-17, AG-11/AG-18); Module Index; Visual Overview; §1–§13 incl. §3.0–3.14, AG-2-1..64, BR-1..21, states, entities, US-1..13, edge cases, permissions, SSP, reference note, open questions, parked list, deferrals | — |
| AG-03-pathway-assessment_v1.4_2026-10-07.md | 1.4 | 13,051 | yes (lines 1–679) | Change log; Module Index; Visual Overview; §1–§13 incl. §3.0–3.11, AG-3-1..41, BR-1..18, states, entities, US-1..11, edge cases, permissions, SSP, reference note, open questions, deferrals | Status "not yet reviewed" |
| AG-04-consultation-and-booking_v1.5_2026-10-07.md | 1.5 | 15,165 | yes (lines 1–842) | Change log; Applied-from tables; Module Index; Visual Overview; §1–§13 incl. §3.0–3.14, AG-4-1..55, BR-1..20, states, entities, US-1..12, edge cases, permissions, SSP, reference note, open questions, deferrals | Not updated for agent-native decisions |
| AG-05-retainer-and-agreements_v1.9_2026-10-07.md | 1.9 | 17,038 | yes (lines 1–761) | Change log; Applied-from tables; Module Index; Visual Overview; §1–§13 incl. §3.0–3.13, AG-5-1..53, BR-1..18, states, entities, US-1..11, edge cases, permissions, SSP, reference note, open questions, deferrals | — |
| AG-06-billing-and-payments_v1.7_2026-10-07.md | 1.7 | 16,269 | yes (lines 1–748) | Change log; Applied-from tables; Module Index; Visual Overview; §1–§13 incl. §3.0–3.8, AG-6-1..43, BR-1..17, states, entities, US-1..15, edge cases, permissions, SSP, reference note, open questions, deferrals | Not updated for agent-native decisions |
| AG-07-case-core-and-delivery_v2.7_2026-10-07.md | 2.7 | 46,023 | yes (lines 1–1200) | Change log; Applied-from tables (SA-06, AG-11/AG-18, AG-01); Module Index; Visual Overview; §0 decision log (AG17 and AG7-D1..D27, pending knock-ons); §1–§13 incl. §3.0–3.10, AG-7-1..92, BR-1..31, states, entities, US-1..22, edge cases, permissions, SSP, reference note incl. backend check v2.5, open questions 1–24, deferrals | Largest file in slice |
| AG-08-smart-questionnaire_v1.7_2026-10-07.md | 1.7 | 17,957 | yes (lines 1–736) | Change log; Applied-from tables (AG-11/AG-18, SA-06, AG-17); Module Index; Visual Overview; §1–§13 incl. §3.0–3.12, AG-8-1..47, BR-1..23, states, entities, US-1..12, edge cases, permissions, SSP, reference note, open questions, deferrals | — |
| AG-09-document-management_v1.8_2026-10-07.md | 1.8 | 21,969 | yes (lines 1–898) | Change log; Applied-from tables (SA-06, AG-11/AG-18, AG-17); Module Index; Visual Overview; §1–§13 incl. §3.0–3.14, AG-9-1..53, BR-1..21, states, entities, US-1..14, edge cases, permissions, SSP, reference note, open questions, deferrals | — |

**Totals:** 11 files, 216,127 words (by `wc -w`), all read in full. Not in this slice (same folder, read by others or unassigned): AG-10..AG-18, SCOPE-TRIAGE_2026-10-05.md (cited by AG-07 §13 item 22 but not read here).

---
## From coverage-ag-frs-2.md

# Coverage: slice ag-frs-2 (Firm plane detailed FRs AG-10 to AG-18)

Reader: requirements-cartographer, W1, 9 Oct 2026. Folder: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/`. Each file was read from line 1 to its last line in chunks with the Read tool; notes were written to `ag-frs-2.md` after each file. Word counts from `wc -w`.

| File | Version | Words | Read in full? (yes/no) | Sections covered | Notes |
|---|---|---|---|---|---|
| AG-10-communication-hub_v1.9_2026-10-07.md | 1.9 (2026-10-07) | 25,744 | yes (lines 1–829) | Document control and change log 1.1–1.9; Applied-from tables (AG-17, AG-11/AG-18, SA-06); Visual overview; §1–§13 incl. AG-10-1 to AG-10-59, BR-1 to BR-32, US-1 to US-17 | Mailer, Messenger, Sorter, Drafter; consent gate; supervision; WhatsApp R1 |
| AG-11-automation_v1.11_2026-10-07.md | 1.11 (2026-10-07) | 46,375 | yes (lines 1–1320) | Document control 1.1–1.11; §0 decision log AG11-D1 to D18; §0.2 pending knock-ons; Applied-from tables (SA-06, AG-18, AG-01, AG-17); Visual overview; §1–§13 incl. AG-11-1 to AG-11-108, BR-1 to BR-41, US-1 to US-32, edge cases, permissions, reference note, phasing | Full Conductor model captured in Part 2 (triggers, conditions, actions, autonomy, recipes, idempotency, consent re-checks, simulation, audit) |
| AG-12-templates_v1.2_2026-10-07.md | 1.2 (2026-10-07) | 11,193 | yes (lines 1–606) | Document control; SA-06 table; Visual overview; §1–§13 incl. AG-12-1 to AG-12-37, BR-1 to BR-14, US-1 to US-10 | Status "Baseline — not yet reviewed"; AG-11 knock-ons not applied |
| AG-13-tasks-reminders-notes-and-activity-audit_v1.12_2026-10-07.md | 1.12 (2026-10-07) | 16,569 | yes (lines 1–714) | Document control 1.1–1.12; Applied-from tables (SA-06, AG-17, AG-01); Visual overview; §1–§13 incl. AG-13-1 to AG-13-67, BR-1 to BR-21, US-1 to US-13 | No AI content in this module |
| AG-14-reporting-and-analytics_v1.10_2026-10-07.md | 1.10 (2026-10-07) | 13,507 | yes (lines 1–670) | Document control 1.1–1.10; Applied-from tables (AG-17, AG-01, SA-06); Visual overview; §1–§13 incl. AG-14-1 to AG-14-34, BR-1 to BR-16, US-1 to US-12 | Anomaly detection deferred |
| AG-15-client-portal-management_v1.6_2026-10-08.md | 1.6 (2026-10-08) | 14,733 | yes (lines 1–694) | Document control 1.1–1.6; Applied-from tables (AG-01, AG-17, AG-07/CP-01); Visual overview; §1–§13 incl. AG-15-1 to AG-15-51, BR-1 to BR-17, US-1 to US-12 | Firm side of the portal; client app is CP-01 (other slice) |
| AG-16-firm-settings-and-integrations_v1.12_2026-10-08.md | 1.12 (2026-10-08) | 25,984 | yes (lines 1–865) | Document control 1.1–1.12; Applied-from tables (AG-17, AG-11/AG-18, SA-06, AG-01); Visual overview; §1–§13 incl. AG-16-1 to AG-16-54, BR-1 to BR-23, US-1 to US-17 | AI switch, Team safeguards, supervision, standard-messages review, timings |
| AG-17-corporate-cases-and-lmia_v0.5_2026-10-07.md | 0.5 (2026-10-07), Draft | 34,350 | yes (lines 1–1221) | Document control 0.1–0.5; §0 decision log AG17-D1 to D82; applied-from-other-modules table; §0.1 Release 2; §0.2 knock-ons; §1–§13 incl. AG-17-1 to AG-17-90, BR-1 to BR-16, US-1 to US-34, edge cases, permissions, reference note, open questions | Draft awaiting expert check of rule values |
| AG-18-data-import-and-migration_v1.2_2026-10-07.md | 1.2 (2026-10-07), Draft | 26,839 | yes (lines 1–852) | Document control 1.0–1.2; Applied-from tables (AG-07/CP-01, SA-06, AG-11, others); §0 decisions AG18-D1 to D12; §0.1; §0.2; §1–§13 incl. AG-18-1 to AG-18-91, BR-1 to BR-28, US-1 to US-28 | New module; Reader on imports; quiet "Not started" state |

**Totals:** 9 files, 215,294 words, all read in full.

**Not read (outside this slice):** 00-Overview, 99-Phasing-and-Glossary, AG-01 to AG-09, SCOPE-TRIAGE, Doc 3, SA and CP documents. Cross-references to them are recorded as they appear in this slice's text, not verified against those documents.

**Quote check:** every quoted string in `ag-frs-2.md` was machine-checked against the nine source files (whitespace-normalised, split at "..."); remaining non-matches were confirmed to be false positives from cells holding several quotes. Quotes over 25 words were shortened or split.

---
## From coverage-doc2-admin.md

# Coverage: doc2-admin

| File | Version | Words | Read in full? (yes/no) | Sections covered | Notes |
|---|---|---|---|---|---|
| `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md` | 1.4 ("Last updated 2026-07-03"; status line "FINAL (2026-06-22)"); Drive modified 2026-08-16, unchanged since the 3 Oct snapshot (manifest.md) | 118,322 (`wc -w`); 5,644 lines; 869,804 bytes | **yes**: lines 1–5644, in 31 chunks of about 28 KB each (1-184, 185-289, ... 5497-5644) | Header and Module Index; SA-CT (CT.1–CT.8); SA-1 §1–§13; SA-2 §1–§13; SA-3 §1–§13; SA-4 §1–§13; SA-5 §1–§13; SA-6 §1–§13; SA-7 §1–§13; SA-8 §1–§13; SA-9 §1–§13; SA-10 §1–§13; SA-11 §1–§13 plus the ComplianceEvent appendix; SA-12 §1–§13 | **There is no SA-01B section in this file** (zero matches for "SA-01B"); SA-01B lives in the separate FR file, which another reader covers. Term searches run on the whole file: `\bAI\b` 0, "artificial" 0, "LLM" (case-sensitive) 0, "OCR" 0, "copilot" 0, "suggest" 13, "automated-decision" 1. |
| `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter_V2.pptx` | 2 (Drive modified 2026-10-06) | not counted | **no**: slide and notes text pulled read-only into the scratchpad; only the Super Admin scope lines, "Not in Release 1" and Appendix A read | Notes slide 1 (Release 1 scope, launch date), notes slide 4 (founder inputs, scope notes), slide 4 Appendix A (module list, deferrals), slide 7 (SA module status table) | Used only for the Release column and Part 3/5 context. |
| `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter V1 - G1 expanded.md` | 1 (Drive modified 2026-10-02) | not counted | **no**: grep plus lines 1–12, 100–125 and 345–356 | Release framing, "Not in Release 1", scope notes | Older than V2. Used only to note the launch-date difference (12 Mar vs 28 Feb 2027). |
| `sources/drive-snapshot-2026-10-09/02-functional-requirements/shared/99-Phasing-and-Glossary_v2.14_2026-10-08.md` | 2.14 | not counted | **no**: header lines 1–4, change-log lines 8–15 (grep) and the §16 Phasing Summary table (lines 18–42) only | §16 Phasing Summary rows SA-1 to SA-12 | Belongs to another reader's slice. Used only for the Release column and the Doc 2 vs newer-module conflicts in Part 5. |
| `ai-workers/README.md`, `ai-workers/NEXT.md`, `ai-workers/design/inventory/SCHEMA.md`, `ai-workers/research/email-evidence.md` | n/a | n/a | yes | all | Workstream rules, output format and the founders' Doer model (E4). |

---
## From coverage-doc3-firm.md

# Coverage: doc3-firm

| File | Version | Words | Read in full? (yes/no) | Sections covered | Notes |
|---|---|---|---|---|---|
| `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md` | 1.4 ("Last updated 2026-07-03"; status "FINAL (2026-06-22)") | 175,508 (8,497 lines, `wc`) | yes | Header + Document summary + Module Index (lines 1–33); AG-1 (34–477), AG-2 (478–1271), AG-3 (1272–1629), AG-4 (1630–2112), AG-5 (2113–2576), AG-6 (2577–3080), AG-7 (3081–3481), AG-8 (3482–3957), AG-9 (3958–4460), AG-10 (4461–4985), AG-11 (4986–5659), AG-12 (5660–6154), AG-13 (6155–6584), AG-14 (6585–7132), AG-15 (7133–7643), AG-16 (7644–8058), AG-17 (8059–8497, end of file). Every module read §1–§13. | Read in sequential chunks of ~110–240 lines. Notes written progressively after each module. Quotes machine-checked against the file (411 quoted fragments; all match allowing for converted inner quotes and dropped bold/italic markers). |
| `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter_V2.pptx` | v2 (Drive modified 2026-10-06) | not counted | no — scope text only | Text of slides 1–7 and notes slides 1–4 filtered for AI / AG-11 / Doer / Release 1 / deferred lines; slide 1 and notes slides 1, 2, 4 read in full for those passages | Used only for the Release column. Extracted via unzip of slide XML into the scratchpad. |
| `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter V1 - G1 expanded.md` | 1 (same bytes as 2026-10-03 snapshot) | not counted | no — lines 1–12, 95–125, 315–335 plus grep for AG-/Release lines | Release 1 overview, Not in Release 1, Deferred scope, module list | Older than V2; used only to show the date discrepancy and module list. |
| `ai-workers/README.md`, `ai-workers/NEXT.md`, `ai-workers/design/inventory/SCHEMA.md`, `ai-workers/research/email-evidence.md` | — | — | yes | all | Required pre-reading. |

Not read (out of slice): the separate AG-xx FR files in `02-functional-requirements/` (other readers), Doc 1, Doc 2, Doc 4, Founder Decisions Log. Cross-references to them (FD-2, FD-7, FD-8, FD-14, FD-20, Doc-1 A4-1/A4-2/A4-4) are recorded as cited in Doc 3 only, not verified.

---
## From coverage-doc4-portal.md

# Coverage: doc4-portal

Snapshot: `sources/drive-snapshot-2026-10-09/` only. Read 9 Oct 2026. No archive and no older snapshot read.

| File | Version | Words | Read in full? (yes/no) | Sections covered | Notes |
|---|---|---|---|---|---|
| `01-techno-functional/06-Doc-4-Client-Portal.md` | 1.3 (header "Document version 1.3 · Last updated 2026-07-03"; status "FINAL (2026-06-22)") | 70,943 (`wc -w`), 3,208 lines | **yes**, lines 1-3208 in 25 chunks, start to end | Front matter and Module Index; CP-1 to CP-9, each §1 to §13 (purpose, users, functional design, FRs, business rules, states, entities and events, user stories, edge cases, permissions, security/scale/performance, reference note, open questions) | The manifest says it is UNCHANGED since the 3 Oct snapshot (Drive modified 2026-08-16). It is older than the October Agent module files it depends on (AG-5/6/9/10/15/16/17). |
| `06-program-management/Program Charter_V2.pptx` | V2 (manifest: current, re-saved 6 Oct) | not counted | **partial**: text of slides 1, 3 and 4 and speaker notes 1-4, pulled only for Release 1 status | Release status of CP-1 to CP-9; "NOT IN RELEASE 1" list; launch date; slide 3 portal build plan | Used only to cite release. Slides 2 and 5-8 not read. |
| `06-program-management/Program Charter V1 - G1 expanded.md` | V1 text dump | not counted | **partial**: grep hits plus lines 1-12, 113-121 | Release framing, NOT IN RELEASE 1 text, CP list | Older than V2; used only to confirm wording that V2 repeats in its notes. Launch date differs (12 Mar vs V2 notes 28 Feb 2027). |

## Not read (outside this slice, referenced by Doc 4)

Doc 1 Platform Foundation, Doc 3 Agent Console and the AG-module files (AG-5, AG-6, AG-8, AG-9, AG-10, AG-13, AG-15, AG-16, AG-17), SA-1, SA-3, SA-5, SA-6, SA-11, the Founder Decisions Log (FD-7, FD-9, FD-20 are cited from Doc 4 or the Charter text only), and both 99-Phasing-and-Glossary files. Other readers cover these. The firm-side review queues that portal actions create are specified there, not in Doc 4.

---
## From coverage-foundation.md

# Coverage: foundation slice (W1, 9 Oct 2026)

All files read from `sources/drive-snapshot-2026-10-09/` (newest snapshot) except the two founders' specs, read from the read-only code copy `code/expat-ready-api@c4117a3-2026-10-09/`. No archive or older snapshot was used. Word counts from `wc -w`.

| File | Version | Words | Read in full? (yes/no) | Sections covered | Notes |
|---|---|---|---|---|---|
| `01-techno-functional/01-RFP-Build-Proposal.md` | v2.0, last updated 2026-06-22 | 8,449 | yes (lines 1–544) | Document control, companion docs, §1–§14 | Procurement wrapper; demoted to "lineage" by FDL and DOC1 §9.1. Grep: no "AI"/OCR/ML mentions. |
| `01-techno-functional/02-Architecture-Decision-Record.md` | v1.0, last updated 2026-06-22 | 10,177 | yes (lines 1–512) | 15 normative corrections, decision table C1–6.4, founder decisions, execution plan W1–W4, top risks, appendix narrative §0–§9 | Decisions register, not a build source. Grep: no AI mentions. |
| `01-techno-functional/03-Doc-1-Platform-Foundation.md` | v1.3, last updated 2026-06-26 ("FINAL") | 56,558 | yes (lines 1–3093, in 13 chunks) | Summary, glossary, §1 (incl. §1.12 Capability Registry), §2, §3, §4, §5 (incl. §5.13), §6 (incl. §6.1.6 event registry), §7, §8, §9, Amendments A1–A7 | Master source for Doers, Conductor, RBAC, audit, consent, residency. Predates FD-16; no AI capability text. |
| `01-techno-functional/07-Founder-Decisions-Log.md` | v1.5, last updated 2026-08-02 | 8,037 | yes (lines 1–409) | FD-1…FD-15, FD-16…FD-22 incl. A22-1…A22-6, top gating decisions, A-1…A-5, B-1…B-5, C-1…C-8, D-1…D-6, E-1…E-3, engineering defaults, summary | Runs only to FD-22; FD-68 cited elsewhere is not in this file. |
| `02-functional-requirements/shared/00-Overview_v3.6_2026-10-07.md` | v3.6, 2026-10-07 | 4,541 | yes (lines 1–206) | Change log, document control, DOCS-1…7, summary, scope index SA-1…SA-12 + SA-1B, cross-cutting mandates, §1–§3.5 | Super Admin FR overview. |
| `02-functional-requirements/shared/99-Phasing-and-Glossary_v2.14_2026-10-08.md` | v2.14, 2026-10-08 | 4,377 | yes (lines 1–125) | Change log, §16 Phasing Summary (SA modules only), §17 Glossary | No glossary entries for Doer, Conductor or AI. |
| `02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md` | 2026-10-05 (review file) | 3,080 | yes (lines 1–270) | AG-01…AG-18, CP-01, founder questions, biggest savings | States it is "not a requirements document"; proposals only, two 8 Oct inline decisions. |
| `06-program-management/Program Charter V1 - G1 expanded.md` | No version in file (dump of "...G1 expanded v2.pptx") | 5,599 | yes (lines 1–599) | §1–§7 with speaker notes, sprint planning | Holds the key speaker-note definitions (Doers deferred, FD-20 human review). |
| `06-program-management/Program Charter_V2.pptx` | Slide header "v6" | 1,462 (zip, per `wc`) | yes (all 7 slides and all 7 speaker-notes pages; text extracted from slide and notesSlide XML with unzip + regex in the scratchpad) | Slides 1–3 (plan), Appendix A–D, notes 1–7 | Speaker notes differ from slide text on dates (28 Feb launch; G1 30 Oct; G3 18 Dec). |
| `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md` | v1, decided 2026-06-13 | 1,114 | yes | §1–§9 incl. clearance log | Founders' Doer roster (not on Drive). |
| `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md` | v1, approved 2026-06-14 | 743 | yes | Philosophy, sidebar, My Day, ⌘K, launcher, contextual Doers, phasing, status | Not asked for and not read: the third spec `2026-06-13-er-doers-moat-reservation-playbook.md` (outside slice). |

Total words read: about 104,000.

Not in this slice but noticed: `01-techno-functional/04-Doc-2-SuperAdmin-Console.md`, `05-Doc-3-Agent-Console.md`, `06-Doc-4-Client-Portal.md` exist in the snapshot and belong to other slices.

---
## From coverage-sa-frs.md

# Coverage: sa-frs (Super Admin detailed functional requirements)

Reader: requirements-cartographer, W1, 9 Oct 2026. Source: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/` (newest snapshot; no archive or older snapshot read). Every file was read from line 1 to its last line, in chunks of 110–200 lines; notes were written into `sa-frs.md` after each file. Word counts from `wc -w`.

| File | Version | Words | Read in full? (yes/no) | Sections covered | Notes |
|---|---|---|---|---|---|
| SA-01-country-and-immigration-pack-management_v2.2_2026-09-22.md | 2.2 (22 Sep 2026) | 7,830 | yes (lines 1–511) | Document control; §0 decision log, §0.1–0.3; Module index; Visual overview; §1–§13 | §3.3–3.11 moved to SA-01B (pointer only in this file) |
| SA-01B-content-pack-configurator_v1.2_2026-10-05.md | 1.2 (5 Oct 2026) | 8,887 | yes (lines 1–410) | Document control; §0 decisions SA1B-D1–D28, §0.1–0.3; §1–§13 incl. sources list | Only Super Admin file with explicit AI permissions (SA-1B-33–35), all deferred |
| SA-02-tenant-firm-management_v2.19_2026-10-08.md | 2.19 (8 Oct 2026) | 13,348 | yes (lines 1–651) | Document control (v2.0–v2.19); §0 decisions and applied tables, §0.1–0.3; Visual overview A–C; §1–§13 | Support-session rules (SA-2-17) are the closest pattern for a non-firm actor |
| SA-03-subscription-plans-and-entitlements_v2.14_2026-10-07.md | 2.14 (7 Oct 2026) | 13,546 | yes (lines 1–662) | Document control; §0 decisions, applied tables, §0.1–0.3; Visual overview A–B; §1–§13 | Product map, limits, Minder always-on |
| SA-04-saas-billing_v2.14_2026-10-08.md | 2.14 (8 Oct 2026) | 18,532 | yes (lines 1–775) | Document control; §0 decisions SA4-D1–D26, P1, §0.1–0.3; Visual overview A–C; §1–§13 incl. sources | "no part of SA-4 works on `dev`" (§12) |
| SA-05-global-templates_v2.2_2026-10-02.md | 2.2 (2 Oct 2026) | 12,188 | yes (lines 1–581) | Document control; Module index; Visual overview A–B; §1–§13 | Status "Baseline — not yet reviewed"; several conflicts with reviewed modules |
| SA-06-CHANGE-NOTE_2026-10-07.md | change note (7 Oct 2026) | 2,205 | yes (lines 1–100) | §1 decisions, §2 documents updated, §3 code to change, §4 still open | Records the role-assignment security bug |
| SA-06-rbac_v3.1_2026-10-08.md | 3.1 (8 Oct 2026) | 31,609 | yes (lines 1–1315) | Document control; decision tables SA6-D1–D11 and applied tables; Visual overview A–C; §1–§13; §10a, §10b (all module key tables AG-01 to AG-18, SA-11, code-only keys), §10c; Appendix B (rename map, all rows); Appendix C | Longest file; AI-related keys in §10b AG-08, AG-10, AG-11 and Appendix C |
| SA-07-platform-users_v2.10_2026-10-08.md | 2.10 (8 Oct 2026) | 13,562 | yes (lines 1–742) | Document control; §0 decisions SA7-D1–D67, §0.1–0.3; Visual overview A–C; §1–§13; Appendix A | Staff accounts human-only |
| SA-08-platform-integrations-and-infrastructure-rails_v2.2_2026-10-02.md | 2.2 (2 Oct 2026) | 11,395 | yes (lines 1–642) | Document control; applied table; Module index; Visual overview A–C; §1–§13 | No AI/model-provider rail listed |
| SA-09-platform-analytics-and-observability_v2.2_2026-10-02.md | 2.2 (2 Oct 2026) | 11,476 | yes (lines 1–614) | Document control; applied table; Visual overview A–B; §1–§13 | Status "Baseline" |
| SA-10-support_v2.5_2026-10-07.md | 2.5 (7 Oct 2026) | 11,365 | yes (lines 1–626) | Document control; applied tables; Module index; Visual overview A–C; §1–§13 | Suggest-only auto-triage; status "Baseline" |
| SA-11-audit-compliance-and-data-governance_v2.7_2026-10-07.md | 2.7 (7 Oct 2026) | 12,855 | yes (lines 1–631) | Document control; applied tables; Visual overview A–C; §1–§13 | Actor types: super_admin, firm_staff, client, system only |
| SA-12-feature-flags-and-platform-configuration_v2.7_2026-10-08.md | 2.7 (8 Oct 2026) | 13,075 | yes (lines 1–628) | Document control; applied tables; Module index; Visual overview A–C; §1–§13 | Status "baseline"; internal inconsistency on firm overrides |

**Total:** 14 files, 181,873 words, all read in full. Nothing in this folder was skipped. Also read for context (outside the slice, not inventoried): `ai-workers/README.md`, `ai-workers/NEXT.md`, `ai-workers/design/inventory/SCHEMA.md`, row E4 of `ai-workers/research/email-evidence.md`.

**Quote check:** every quoted string in `sa-frs.md` was machine-compared against the source text (markdown emphasis removed); mismatches found were corrected, and quotes of 25 words or more were shortened or split.
