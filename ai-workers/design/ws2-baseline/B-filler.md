# B-filler: the Filler (government form filling)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Filler loads the right edition of each government form a case needs (IMM forms for Canada) and fills it from the client's verified profile and questionnaire answers, so staff review instead of retyping. It never invents a missing value; it flags it. A form it prepares is always a draft until a person with the form-approval permission approves it, and only then is a locked (flattened) copy produced. **Who uses it:** case officers prepare; the consultant (RCIC) or another form approver approves (AG-07). **What it replaces (founders' spec):** none named; it is a Tier 3 "immigration-only moat" Doer ("IMM form auto-fill (IMM0008…)"; the IP is "form intelligence"). **Status in one line:** the most contested Doer on release: AG-07 v2.7 keeps it in Release 1, SA-01B (SA1B-D28) parks form autofill for Release 1, the Charter says Release 1 "does not auto-fill government forms", and the scope review proposes Release 2.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Agent 99-Phasing v1.4: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/99-Phasing-and-Glossary_v1.4_2026-10-05.md`
- FDL v1.5: `sources/drive-snapshot-2026-10-09/01-techno-functional/07-Founder-Decisions-Log.md`
- Doc 1 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/03-Doc-1-Platform-Foundation.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- AG-07 v2.7: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-07-case-core-and-delivery_v2.7_2026-10-07.md`
- AG-11 v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-11-automation_v1.11_2026-10-07.md`
- SA-01B v1.2: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-01B-content-pack-configurator_v1.2_2026-10-05.md`
- Shared 99-Phasing v2.14: `sources/drive-snapshot-2026-10-09/02-functional-requirements/shared/99-Phasing-and-Glossary_v2.14_2026-10-08.md`
- SA-06 v3.1: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-06-rbac_v3.1_2026-10-08.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Charter V1 (md dump): `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter V1 - G1 expanded.md`
- AG-18 v1.2: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-18-data-import-and-migration_v1.2_2026-10-07.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Filler \| IMM form auto-fill (IMM0008…) \| form intelligence" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 3, L78 | Tier 3 (no release date) | — |
| SPEC-N positioning | "vs Officio / Caseasy (keep your records) and Visto.ai / Visafly (fill your forms): "ER runs your firm."" | Founders naming spec v1 (2026-06-13), §7 Positioning, L102 | None stated | — |
| APHG glossary | "The Doer that fills government forms from the client's verified profile (correct edition, no re-keying). A form it prepares on its own has no …" | Agent 99-Phasing v1.4, Glossary, "Filler", L69 | None stated | APHG L52 lists the Filler among non-AI Doers; AG-07 BR-23 (L750) lists "the Filler's auto-fill" among AI Doers. |
| FD-5 | "XFA/flattened IRCC forms \| Flattened-overlay support in v1 (coordinate-mapped fill + FormFieldMap visual editor), unit-priced per form edition; XFA runtime = named later-wave stub" | FDL v1.5, Wave-0 batch, resolved 2026-07-03, L30 | "in v1" | SA-01B L400 (P1): the built engine "refuses XFA templates" and IRCC 2D-barcode forms are XFA; SA1B-D28 parks filling. |
| DOC1 §5.7 | "The Filler is a pure, data-driven function: given a FormInstance, it resolves the case's answers … and writes each canonicalFieldKey's value into its formFieldId." | Doc 1 v1.3, §5.7 The form master … and the data-driven Filler, L1329 | "foundation (Wave-A A2) scope" (data model + thin proof) | Doc 1 L1786: runtime "not foundation scope". |
| DOC2 capability | "cap.filler \| case-delivery.forms \| DOER \| cap.spine.canonicalfields, cap.spine.answerstore \| feature.forms.autofill \| growth" | Doc 2 v1.4, SA-CT capability registry seed table, L82 | "growth" (illustrative tier) | SA1B-X10 (SA-01B L90): the "auto-prefilled forms" plan limit has nothing to meter in Release 1. |
| AG-07 §3.5 three jobs | "The Filler Doer does three things:" | AG-07 v2.7, §3.5 Government / IMM Form Preparation & Auto-Fill — the Filler, L455 | None stated | Next three rows. |
| AG-07 §3.5 edition | "Loads the correct form edition. … the pack knows which edition is current for the case's submission window." | AG-07 v2.7, §3.5, L456 | None stated | — |
| AG-07 §3.5 auto-fill | "Auto-fills from the single-source profile/SQR. A field-mapping binds the case's profile and SQR answers … to the fields of each form" | AG-07 v2.7, §3.5, L457 | None stated | Mappings are SME pack content (AG-07 L1106). |
| AG-07 §3.5 output | "The Filler produces a fillable version (for review/edit) and, once approved, a flattened/locked version (the submission artefact)" | AG-07 v2.7, §3.5, L458 | None stated | — |
| AG-07 §3.5 review | "Auto-fill is a draft, never an unattended submission. The consultant reviews every mapped field, can override … and must approve before the form is …" | AG-07 v2.7, §3.5 Consultant review / override, L460 | None stated | Approval is a permission (form-approve), not a licence check (SA6-D2; review W1 B-3). |
| AG-07 §3.5 floor | "A government form can never run on its own: its autonomy level cannot be set below APPROVE, whatever the firm configures." | AG-07 v2.7, §3.5 The draft waits in "Needs you", L462 | None stated | Same floor in AG11-D1 (AG-11 L30). |
| AG-07 §3.5 no submission | "ExpatReady never submits a form to an authority itself (§3.7 — the RCIC records the submission)." | AG-07 v2.7, §3.5, L462 | None stated | AG-11-54: no Doer action submits at any autonomy level. |
| AG-07 §3.5 verified only | "The Filler pre-populates only from verified values; an unverified value is shown beside the field as "unverified — verify to use" and the field …" | AG-07 v2.7, §3.5 Only verified values feed the Filler, L464 | None stated | — |
| AG-07 §3.5 edition warning | "the Filler warns prominently … and offers to re-load the current edition (re-mapping preserved answers)." | AG-07 v2.7, §3.5 Out-of-date-edition warnings, L466 | None stated | — |
| AG-07 §3.5 data flow | "consultant review/override/approve (the same approval) → generate fillable + flattened (S3) → attach to case … → AuditLog (incl. overrides and the Needs you …" | AG-07 v2.7, §3.5 Data flow, L480 | None stated | — |
| AG-7-21 | "each instance SHALL track a status (NOT_STARTED \| IN_PROGRESS \| READY \| READY_FOR_APPROVAL \| GENERATED \| SIGNED \| FILED) and the form edition/version it …" | AG-07 v2.7, §4, L634 | None stated | — |
| AG-7-22 | "The Filler SHALL pre-populate every mapped field and SHALL flag unmapped/empty required fields for human completion." | AG-07 v2.7, §4, L635 | None stated | — |
| AG-7-23 | "The Filler SHALL allow staff to override any auto-filled value … SHALL track which fields were auto-filled vs hand-edited, and SHALL generate the filled output (PDF)" | AG-07 v2.7, §4, L636 | None stated | — |
| AG-7-59 | "A government form SHALL carry the autonomy level APPROVE as a hard floor: no firm setting SHALL lower it to AUTO." | AG-07 v2.7, §4 (AG11-D1, D2), L687 | None stated | — |
| AG-7-59 timeout | "A pending draft SHALL NOT be approved, flattened or acted on automatically on timeout; its age SHALL be shown." | AG-07 v2.7, §4, L687 | None stated | — |
| AG-7-60 | "The Filler SHALL pre-populate a field only from a verified value (BR-8)" | AG-07 v2.7, §4, L688 | None stated | — |
| AG-7-65 | "There is no preparer only when an automation ran the Filler … such a draft MAY be approved by any holder of agent/case:form-approve." | AG-07 v2.7, §4 Four-eyes, L693 | None stated | TRI L95 proposes to move four-eyes and licence-aware form approval [F]. |
| AG-7-66 | "FormInstance SHALL carry preparedByUserId (… null only when an automation ran the Filler), approvedByUserId, approvedAt and selfApproved" | AG-07 v2.7, §4 Form approval record, L694 | None stated | Audit record for automation-prepared forms. |
| AG-07 BR-7 | "The Filler pre-populates only from values that actually exist on the case's structured data. It must not invent or default missing values" | AG-07 v2.7, §5 Business rules, L734 | None stated | — |
| AG-07 BR-23 | "Every AI Doer working on a case — the Filler's auto-fill, the Reader, the Sorter, the Drafter, the Checker — produces a proposal with …" | AG-07 v2.7, §5 Business rules, L750 | None stated | Contradicts APHG L52 / L69 and Doc 1 L1329 (Filler is rule-based, non-AI) and SA1B-D16 ("AI stays out of the fill path"). |
| AG-07 §12 code | "a pure, deterministic Filler render engine (spine/filler.service.ts); form generation with output hashing and replay safety" | AG-07 v2.7, §12 Backend check v2.5, L1103 | None stated | Code status as of 5 Oct commit, per AG-07. |
| AG-07 §12 release | "the SCOPE-TRIAGE case for moving the Filler to Release 2 rested on it being the "biggest build cost". Its engine, editions, field maps and …" | AG-07 v2.7, §12, L1106 | None stated | — |
| AG-07 §13 Q22 | "Author's recommendation: keep the Filler workflow and the Deficiency Library in Release 1" | AG-07 v2.7, §13 Open questions, L1188 | "The spec keeps them in Release 1; SCOPE-TRIAGE (5 Oct) proposes Release 2 for each, undecided." | Founder decision pending. |
| AG-07 §13 deferral | "Full Filler field-mapping coverage across all government forms — Release 2 expands the FormFieldMapping catalogue; the engine + the key forms ship in Release 1." | AG-07 v2.7, §13 Named deferrals, L1196 | "Release 2" / "Release 1" | — |
| AG11-D8 | "Approving a Filler form draft in Needs you is AG-07's consultant approval — one act, not two." | AG-11 v1.11, AG-11 §0 Decision log, L37 | None stated | — |
| AG-11 floor table | "A government form (Filler draft) \| APPROVE \| OFF \| APPROVE" | AG-11 v1.11, AG-11 §3.3 autonomy table, L316 | None stated | — |
| SA1B-D16 | "Form filling is deterministic; AI stays out … AI may draft and diff box maps and extract answers from uploaded documents with a confirmation …" | SA-01B v1.2, SA-01B §0 Decisions, L40 | None stated | Contradicts AG-07 BR-23 naming the Filler an AI Doer. |
| SA1B-D28 | "Form autofill is parked for Release 1. Release 1 keeps … Parked until the content pack SQR is final: box maps, deterministic filling, the …" | SA-01B v1.2, SA-01B §0 Decisions, L53 | "parked for Release 1" | Conflicts with AG-07 v2.7 (Filler in Release 1, §13 Q22) and Agent 99-Phasing v1.4 (no Filler line). Agrees with Charter. |
| SA-01B P1 | "The engine fills AcroForm PDFs and refuses XFA templates (§12), and IRCC's 2D-barcode forms are XFA." | SA-01B v1.2, SA-01B §13 placeholders, L400 | "parked with SA1B-D28" | Conflicts with FD-5 "Flattened-overlay support in v1". |
| SPHG SA-1B | "form autofill parked for Release 1 (SA1B-D28) … box maps, deterministic filling, the forms editor and AI map drafting move to Phase 3" | Shared 99-Phasing v2.14, Change log v2.6, L14 | "Phase 3" | — |
| SA-06 permission | "agent/case:form-prepare \| Edit/auto-fill/generate FormInstances (Filler) — prepares drafts; does not approve them" | SA-06 v3.1, Permission catalogue, L796 | None stated | — |
| TRI AG-07 | "Form auto-fill engine (the Filler) — biggest build cost; staff fill IMM forms and upload them" | SCOPE-TRIAGE 2026-10-05, AG-07 Proposed to move, L93 | Proposed to move to Release 2 (list meaning, TRI L7) | AG-07 L1106 says the build cost is mostly spent. |
| CH1 journey note | "Release 1 does not file electronically with the government and does not auto-fill government forms (parked by the team, SA1B-D28)." | Charter V1 (md dump), Speaker notes, the journey, L115 | "does not auto-fill government forms" (Release 1, same line) | Conflicts with AG-07 v2.7. |
| CH1 deferred | "Government form auto-fill" | Charter V1 (md dump), Deferred scope (Appendix A), L328 | Deferred scope (list heading, CH1 L324) | — |
| AG-18 portal autofill | "IRCC portal autofill or a browser extension \| Not part of this module; not decided" | AG-18 v1.2, AG-18 §0.1 out of scope, L147 | "not decided" | Portal autofill (typing into the government website) is a different capability from PDF form filling. |

Requirement rows: **41**.

## Gaps noticed

- Release status is contradictory across five sources: AG-07 v2.7 (Release 1, author recommends keeping it), SA-01B v1.2 SA1B-D28 and Shared Phasing v2.14 (parked / Phase 3), Charter V1/V2 (Release 1 does not auto-fill), SCOPE-TRIAGE (proposed Release 2), and FD-5 (flattened-overlay fill "in v1"). Agent Phasing v1.4 does not mention the Filler.
- AI or not: Doc 1, SA-01B (SA1B-D16) and the Agent glossary make the Filler a rule-based Doer; AG-07 BR-23 lists "the Filler's auto-fill" among AI Doers. Inferred: BR-23 may mean only that the same never-fabricate rule applies.
- Technical blocker recorded by SA-01B: the built engine fills AcroForm PDFs and refuses XFA, while IRCC barcode forms are XFA (P1). FD-5 promises flattened overlay in v1. How a filled IRCC form reaches staff is undecided.
- Human gates (hard, in the requirements): every form draft needs approval by a holder of agent/case:form-approve (APPROVE floor, never on timeout); unverified values are never filled; the RCIC records the submission; nothing is ever submitted by a Doer. Licensed approval is not enforced (SA6-D2; review W1 B-3).
- Audit: overrides, the approval decision and the approval record (preparer, approver, self-approved) are specified (AG-7-23, AG-7-59, AG-7-66).
- Form field mappings are SME pack content; values and edition currency: confirm with RCIC.
