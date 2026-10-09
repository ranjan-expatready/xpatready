# B-drafter-template: the Drafter in its template-merge sense (retainers and generated documents)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** In this sense the Drafter builds a document from an approved template: it picks the right retainer template for the matter and language, inserts the country pack's required clauses (locked), fills merge fields (names, fees, scope, the licensed consultant's registration number) from the live record, refuses to continue if a required field is empty, and produces the PDF that the consultant reviews and approves before the Signer sends it. AG-09 uses the same Drafter to generate other documents from templates and file them. **Who uses it:** the consultant and case staff (AG-05, AG-09). **What it replaces (founders' spec):** none named; Tier 3 "immigration-only moat" Doer ("LOEs, retainers, submission letters"; the IP is "doc generation"). **Naming conflict:** since 4 Oct (AG11-D4) "Drafter" also names an AI Doer that writes draft messages (carve-out A). AG-05 v1.9 still uses "Drafter" for this rule-based template engine. Both senses share one name.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- Agent 99-Phasing v1.4: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/99-Phasing-and-Glossary_v1.4_2026-10-05.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- AG-05 v1.9: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-05-retainer-and-agreements_v1.9_2026-10-07.md`
- AG-04 v1.5: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-04-consultation-and-booking_v1.5_2026-10-07.md`
- AG-09 v1.8: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-09-document-management_v1.8_2026-10-07.md`
- SA-05 v2.2: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-05-global-templates_v2.2_2026-10-02.md`
- SA-06 v3.1: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-06-rbac_v3.1_2026-10-08.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Agent 00-Overview v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/00-Overview_v1.11_2026-10-07.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Drafter \| LOEs, retainers, submission letters \| doc generation" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 3, L79 | Tier 3 (no release date) | — |
| SPEC-N -or rule | "Translator \| (folds into Drafter / Binder)" | Founders naming spec v1 (2026-06-13), §3, L41 | None stated | — |
| SPEC-N clearance | "Drafter = kept (legal-doc-automation crowd uses compound names like "Document Drafter" / "Smarter Drafter" — defensible as a feature)." | Founders naming spec v1 (2026-06-13), §9 Clearance log, L125 | None stated | — |
| SPEC-IA command bar | "Draft a letter/retainer → Drafter" | Founders IA Doers model v1 (2026-06-14), ⌘K "Do" bar, L53 | None stated | — |
| APHG glossary (AI sense) | "AI Doer that writes a draft message or document for a person to review; the AI-assist drafter of AG-10, callable by any recipe." | Agent 99-Phasing v1.4, Glossary, "Drafter", L55 | None stated | Naming conflict: the October glossary defines only the AI sense; AG-05 v1.9 uses "Drafter" for the template engine. |
| DOC2 capability | "cap.drafter \| agreements \| DOER \| cap.spine.canonicalfields \| feature.docs.generate \| growth" | Doc 2 v1.4, SA-CT capability registry seed table, L83 | "growth" (illustrative tier) | cap.signer and cap.binder depend on cap.drafter (Doc 2 L78, L84). No separate capability exists for the AI Drafter; AI uses one switch (AG11-D13). |
| AG-05 §3.0 today | "the retainer becomes a first-class RetainerAgreement produced by the Drafter and signed through the Signer" | AG-05 v1.9, §3.0 Reference-note callout, L182 | None stated | — |
| AG-05 §3.1 template | "the Drafter resolves the correct template by three axes: the destination country … the firm's template for that country … and optionally the matter type" | AG-05 v1.9, §3.1 The Drafter — template selection & clause assembly, L186 | None stated | — |
| AG-05 §3.2 merge | "At generation the Drafter binds these from the live source record" | AG-05 v1.9, §3.2 The Drafter — merge-field binding, L199 | None stated | — |
| AG-05 §3.2 empty token | "A required merge field that resolves to blank is … and blocks send rather than producing an agreement with a hole where the fee …" | AG-05 v1.9, §3.2 World-class behaviour, L203 | None stated | Same never-fabricate principle as AG-07 BR-7. |
| AG-05 §3.3 bilingual | "At generation the Drafter selects the variant matching the client's language … and flags the fallback" | AG-05 v1.9, §3.3 The Drafter — bilingual rendering, L214 | None stated | TRI L69 keeps "English / French version (a Must if any launch firm serves Quebec)". |
| AG-05 §3.4 approve | "Approval is attributable. "Approved for send by {consultant} at {time}" is recorded" | AG-05 v1.9, §3.4 Consultant review/edit before send, L233 | None stated | Human gate before the Signer sends. |
| AG-5-4 | "The Drafter SHALL resolve the correct template by (matter type, locale) within the firm's one country" | AG-05 v1.9, §4 Drafter — template & clauses, L374 | None stated | — |
| AG-5-5 | "The firm's required clause set, from the pack … SHALL be locked … and re-validated at generation and at send." | AG-05 v1.9, §4, L375 | None stated | Clause wording: confirm with counsel (FDL B-3). |
| AG-5-7 | "Every generated agreement SHALL record the template version and pack/clause-set version it was built from" | AG-05 v1.9, §4, L377 | None stated | — |
| AG-5-8 | "The Drafter SHALL bind merge tokens … from the live source record with no re-keying." | AG-05 v1.9, §4 Drafter — merge fields, L380 | None stated | — |
| AG-5-9 | "A required merge token that resolves empty SHALL be surfaced and SHALL block send" | AG-05 v1.9, §4, L381 | None stated | — |
| AG-5-12 | "generation SHALL select the variant matching the client's language, falling back to the firm default only with an explicit flag." | AG-05 v1.9, §4 Drafter — bilingual, L386 | None stated | — |
| AG-5-15 | "The generated draft SHALL enter a DRAFT review state where the responsible consultant may read … edit permitted free-text regions … and approve for send." | AG-05 v1.9, §4 Drafter — review/edit, L391 | None stated | — |
| AG-5-17 | "Each edit/re-render SHALL bump the agreement version and retain the prior render (audited); approval-for-send SHALL record the approver + timestamp." | AG-05 v1.9, §4, L393 | None stated | Audit of the human approval. |
| AG-5-49 | "A regulator credential … linked to a deactivated staff member SHALL be treated as absent for every new document" | AG-05 v1.9, §4 Staff who leave, L445 | None stated | — |
| AG-4-50 | ""Create proposal from consult" launches Drafter pre-filled → Signer (AG-5)." | AG-04 v1.5, AG-04 §4, L523 | None stated (NEW) | — |
| AG-9-22 | "Generate-from-template (Drafter) files the result as a typed, named Document version on the right entity, prefilled from single-source data." | AG-09 v1.8, AG-09 §4 Drafter/Signer (3.7), L503 | None stated (status "N" = new) | — |
| AG-09 §3.7 | "the Drafter merges client/case data into a template and files the result as a Document" | AG-09 v1.8, AG-09 §3.7 Generate-from-Template (Drafter), L297 | None stated | — |
| SA-05 legal type | "Rendered by Drafter/Signer (AG-5). Legal type: strictest governance — mandatory review-before-publish, hard locale-coverage gate, mandated-clause protection" | SA-05 v2.2, SA-05 template types, L148 | None stated | — |
| SA-06 permissions | "agent/retainer:draft \| Generate/edit a retainer draft (Drafter); approve-for-send" | SA-06 v3.1, Permission catalogue, L752 | None stated | Also agent/document:generate (SA-06 L841). |
| TRI AG-05 stays | "template with locked required clauses · merge fields · draft review and approve" | SCOPE-TRIAGE 2026-10-05, AG-05 Stays, L69 | Stays in Release 1 (list heading, TRI L6) | — |
| TRI AG-10 AI sense | "Drafter AI and AI-text approval [F]" | SCOPE-TRIAGE 2026-10-05, AG-10 Proposed to move, L131 | Proposed to move to Release 2 (list meaning, TRI L7) | Refers to the AI sense only; the template Drafter stays. |
| AOVW in-house | "the four AI Doers — Reader, Sorter, Drafter, Checker" | Agent 00-Overview v1.11, In-House by Design, L177 | None stated | The October overview names no template Drafter; the template work is described only in AG-05 and AG-09. |

Requirement rows: **29**.

## Gaps noticed

- One name, two Doers: AG-05 v1.9 and AG-09 v1.8 use "Drafter" for the rule-based template engine; AG11-D4, the Agent glossary and the Overview use "Drafter" only for the AI drafting Doer. A permission, capability or audit entry that says "Drafter" is therefore ambiguous.
- Release: the template Drafter is Release 1 (AG-05 Release 1 in the Overview; TRI keeps templates, merge fields and draft review). The AI Drafter is "built but switched off" and proposed for Release 2 in the scope review (carve-out A).
- Deterministic: template choice, locked clauses, merge binding, empty-field block, locale fallback flag. Human gate: the consultant reviews, may edit permitted regions, and approves for send (recorded).
- Legal text (required clauses, recitals) is pack content: confirm with counsel.
