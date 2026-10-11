# Change note CN-SA-11: Audit, Compliance and Data Governance

| | |
|---|---|
| **Document changed** | SA-11 Audit, Compliance & Data Governance, version 2.7, dated 2026-10-07 |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-11-audit-compliance-and-data-governance_v2.7_2026-10-07.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 6 |

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID, section and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words, written in SA-11's own style; (4) why, pointing to the founder's Workstream 2 decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`) it rests on; (5) what else must change. Nothing here restates a requirement of another document: the AI assistants themselves are specified in Workstream 2's AW-01 (firm plane) and AW-02 (platform plane) build specifications and in the behaviour documents (`ai-workers/design/behaviours/`), which this note points to.

**Plain words used here.** *AI processing*: any call to an AI model that reads a client's or a firm's data (the four AI Doers Reader, Sorter, Writer and Checker, the AI assistants' model calls, and the reading of text from images). *Delegation record*: the record that says which AI assistant works for which named person, with a subset of that person's permissions, on which files, from when until when; it is not an identity (AIW-D33). *Platform-plane run*: a run of one of Expat Ready's own AI assistants (the Pack author's assistant, the Support and account assistant).

**Provisional.** Changes 1, 2, 3 and 5 touch residency wording, retention values or the Restricted-field model, which the founder marked provisional until counsel reads them (AIW-D64; counsel engaged by 31 Oct 2026, AIW-D68).

---

## 1. AI processing happens only in Canada: no "documented safeguards" route for AI

**(1) What it changes.** SA-11 v2.7 §3.6 "Enforcement & flagging", first bullet (L269); SA-11-21 (L373); a new requirement after SA-11-31 (the document's last, L392).

**(2) Current words.**

L269:
> - **Automatic compliance warnings.** If any rail/sub-processor for a category is **Non-Canadian without a confirmed safeguard**, SA-11 raises a **compliance warning** on the dashboard (3.10) with a link to the offending SA-8 integration — surfaced *before* an auditor finds it (per §3.6 RES2: sub-processors must be Canadian-resident or explicitly approved with documented safeguards; a maintained sub-processor list is delivered).

L373:
> - **SA-11-21.** Any category whose rail/sub-processor is **Non-Canadian without a confirmed safeguard** SHALL raise a **compliance warning** on the dashboard, linked to the offending SA-8 integration.

**(3) Proposed words.**

L269 keeps its text and gains a second bullet directly below it:
> - **AI processing: only in Canada, with no safeguard route.** *(new — AIW-D52, AG11-D15)* For the **AI processing** category (SA-11-32), the RES2 route "explicitly approved with documented safeguards" does **not** apply. AI and OCR processing of client data happens **only in Canada**: for firms' data (the four AI Doers and the firms' AI assistants) and for Expat Ready's own AI assistants. A provider whose processing region is outside Canada cannot be recorded in SA-8 (SA-8-36), so it never appears here as a warning; until a Canadian provider is recorded, the AI switch stays locked for every firm (AG-11-93). Every other category keeps RES2 as written.

SA-11-21 gains one sentence at the end:
> The AI processing category is excluded from this warning route: a non-Canadian AI processing region is refused at entry (SA-11-32, SA-8-36), never recorded with a safeguard.

New requirement:
> - **SA-11-32.** *(new — AIW-D52, AG11-D15)* The data categories SHALL include **AI processing**. Its only allowed residency status SHALL be `Canadian`; the statuses `Non-Canadian` and `Non-Canadian with confirmed safeguard` SHALL NOT be recordable for it. The residency declaration and the exportable sub-processor list (SA-11-22) SHALL name the AI provider and its processing region as recorded in SA-8 (SA-8-36).

**(4) Why.** AIW-D52, 11 Oct 2026, the founder chose "Only in Canada": "AI processing of client data happens only in Canada (AG11-D15 wording, for firms' data and Expat Ready's own support tickets) … SA-11 §3.6's *with safeguards* wording gets a change note." The Pack author's assistant's document records the same decision for Expat Ready's own calls on pack content (`pack-authors-assistant.md` §9 G-17, "Decided (AIW-D52)"; `support-and-account-assistant.md` §9 G-11, "Decided (AIW-D52)"). The team's own AG-11 v1.11 already decided the rule (AG11-D15, L44: "AI and OCR processing of client data (all four AI Doers, including the Reader's OCR) happens only in Canada. Super Admin may record only a provider and region that process in Canada (SA-08 / SA-11)") and lists this document as a pending knock-on (AG-11 v1.11 §0.2, L54: "the processing-terms record that gates AI (AG11-D13), which must show a Canadian region (AG11-D15) | Pending"). IMP-7 recommended exactly this split (a stricter AI category, RES2 unchanged for others).

**(5) Knock-ons.** SA-08: the provider entry that enforces "Canada only" at the point of recording (CN-SA-08 change 2). AG-11 §0.2 SA-11 row and AG-16 §3.9: mark applied (Agent-plane change notes, CN-AG-11 and CN-AG-16). The tech lead's one test call from the Canada region (AIW-D69; `ai-workers/requirements/provider-test-script.md`) is what lets the first provider be recorded. Counsel reads the wording (AIW-D64, D68).

---

## 2. The residency declaration shows where AI processing runs, not only where data is stored

**(1) What it changes.** SA-11 v2.7 §3.6 "How it works" (L266); SA-11-20 (L372); §7 `ResidencyDeclaration` (L469); §6 F (L457).

**(2) Current words.**

L372:
> - **SA-11-20.** Super Admin can view a **data residency declaration**: per data category, the storage location (DB region, object-storage region, cache region, IdP region) and residency status (`Canadian` / `Non-Canadian` / `Non-Canadian with confirmed safeguard`), **generated from SA-8 rail configuration** (not hand-entered).

L469:
> - **ResidencyDeclaration** *(NEW — largely generated):* `declarationId`, `dataCategory`, `countryId`, `rail` (db/object-storage/cache/idp), `region`, `status` (Canadian/Non-Canadian/Non-Canadian-with-safeguard), `safeguardRef` (nullable), `sourceIntegrationId` (SA-8), `generatedAt`.

L457:
> **F. Residency status (per category):** `Canadian | Non-Canadian-with-safeguard | Non-Canadian (WARN)` — derived, recomputed on any SA-8 change.

**(3) Proposed words.**

SA-11-20:
> - **SA-11-20.** *(changed — AIW-D52, IMP-7)* Super Admin can view a **data residency declaration**: per data category, the storage location (DB region, object-storage region, cache region, IdP region) **and, for the AI processing category, the processing region where each model call runs and the provider recorded in SA-8 (SA-8-36)**, with residency status (`Canadian` / `Non-Canadian` / `Non-Canadian with confirmed safeguard`; `Canadian` only for AI processing, SA-11-32), **generated from SA-8 rail configuration** (not hand-entered).

§7 `ResidencyDeclaration`: `rail` becomes `(db/object-storage/cache/idp/ai-processing)`, with the note "for `ai-processing`, `status` is always Canadian and `safeguardRef` is always null (SA-11-32)". §3.6 "How it works" (L266) adds "the AI processing region" to the list of what the declaration states.

§6 F gains: "AI processing: `Canadian` only (SA-11-32)."

**(4) Why.** IMP-7 ("SA-11 gets an "AI processing" category with the stricter rule: Canada only, no safeguard exception, and the declaration shows the AI processing region"), adopted by AIW-D52. Today "the residency declaration lists storage locations only, not processing" (IMP-7, citing SA-11-20), so a buyer reading it could not see where a model reads their clients' files; a firm's data-processing agreement takes this declaration as its sub-processor disclosure (SA-11-22).

**(5) Knock-ons.** SA-08 SA-8-31 (the declaration feed) carries the AI processing region from the provider entry (CN-SA-08 change 2). §3.10's residency tile counts it like any category.

---

## 3. Retention: a data category for AI processing records

**(1) What it changes.** SA-11-13 (L362); §13 open question 1 (L622).

**(2) Current words.**

L362:
> - **SA-11-13.** *(changed v2.4 — AG17-D42)* Super Admin can configure a platform-wide **retention policy**: a period **per data category** (immigration PII/case records, financial records, communications, audit & security logs, consent & DSR records, document files), each with a **legal floor enforced in code**; sub-floor values SHALL be rejected by both UI and API. The **case-file** period also governs LMIA (corporate) files and their candidate (job applicant) data: candidate data is kept as long as its file and deleted only when the whole file is deleted under that period — no separate candidate retention clock or category.

L622 (extract, first sentence):
> 1. **Retention values (counsel)** *(scope extended v2.4 — AG17-D42)*. Confirm the concrete floors and defaults per data category: financial/financial-linked audit (default **≥ 7 years**), breach records (**≥ 2 years**), other audit/security (**≥ 2 years**), case files (this one period also covers LMIA files and their candidate data, with no separate candidate period), communications, documents, consent/DSR records.

**(3) Proposed words.**

SA-11-13: the category list becomes "(immigration PII/case records, financial records, communications, audit & security logs, consent & DSR records, document files, **AI processing records**)", and a sentence is added at the end:
> *(changed — IMP-4, AG-11-98)* **AI processing records** are the record of every model call (the AI run log), the approval items AI work produced and their decisions, the Practice expert's question records, and the run records of the AI assistants on both planes. Until counsel sets the floor and default (§13 Q1), the interim periods are those AG-11-98 states. An audit entry made under an Expat Ready staff member's delegation is a staff action and is kept at least 7 years under SA-11-14.

§13 Q1: add "AI processing records (interim values: AG-11-98)" to the list of categories counsel confirms.

**(4) Why.** The team's AG-11 v1.11 leaves this to SA-11 and marks it pending (§0.2, L54: "retention of the model-call audit log (interim 1 year) and of approval items (interim 2 years after decision) — AG-11-98 … Pending"). IMP-4 found that "SA-11 v2.7 has no AI data category and no AI retention row", and the Support and account assistant's document relies on the fix (`support-and-account-assistant.md` §9 G-3: "SA-11 has no AI data category; the platform-plane row (stamped with the run's firm, or null) and its retention (SA-11-14 seven years for staff actions) are unwritten"). The Practice expert's question records go into the Owner's firm data export (AIW-D70: they "are read by the asker (own) and the Owner (whole firm, through the firm data export)"), so they need a retention period like the run log. Values stay with counsel (AIW-D64: "retention" is among the provisional items).

**(5) Knock-ons.** AG-11-98 (interim values) and AG-16-39 (firm data export) point here once applied (CN-AG-11, CN-AG-16). AW-01 and AW-02 cite this category for their run records.

---

## 4. Every audit entry says whether a person acted, an AI assistant acted for them, or an automation ran; platform-plane runs are stamped with the firm they serve

**(1) What it changes.** SA-11-2 (L348); BR-3 (L400); §7 `AuditLog` (L465).

**(2) Current words.**

L348:
> - **SA-11-2.** Each entry SHALL contain: `auditLogId` (UUID), `timestamp` (UTC, millisecond precision), `actor` (user id + display name), **`actorType` ∈ {super_admin, firm_staff, client, system}**, **`tenantId`** (firm id; **null for global actions**), `actionCode` (machine-readable), `entityType` + `entityId`, `before`/`after` snapshot (JSONB) where applicable, `ipAddress`, `userAgent`, **`correlationId`**, plus tamper-evidence fields **`sequenceNo`**, **`prevHash`**, **`entryHash`**.

L400:
> - **BR-3 (Actor type is always explicit).** Every entry has a non-null `actorType`. System actions are `system`; impersonated actions are `super_admin` with impersonated context; never inferred from a null `userId`.

L465:
> - **AuditLog** *(CHANGED — adds):* **`actorType`** (enum: super_admin/firm_staff/client/system), **`tenantId`** (distinct from legacy `clientId`), **`correlationId`**, **`sequenceNo`** (monotonic per chain), **`prevHash`**, **`entryHash`** (SHA-256), **`sensitive`** (bool/flag for impersonation/cross-tenant), `before`/`after` (formalised from `changes`). *Write grant: INSERT only.*

**(3) Proposed words.**

SA-11-2 gains a second paragraph:
> *(changed — AIW-D33, AIW-D54)* Each entry SHALL also record **how the action was taken** (`mode` ∈ {PERSON, DELEGATED, AUTOMATION}) and, when `mode` is DELEGATED, the **delegation record** it ran under (`delegationId`). For a DELEGATED entry the `actor` and `actorType` are the named person the AI assistant works for (`firm_staff` or `super_admin`); no new actor type is added. An entry written by a platform-plane AI assistant run SHALL carry as `tenantId` the one firm that run serves, or null when the run serves no firm; a run that serves one firm SHALL NOT read another firm's data, and any operation spanning firms remains subject to SA-11-12.

BR-3 gains: "Actions an AI assistant took for a named person carry that person as actor, with `mode` DELEGATED and the `delegationId` (SA-11-2); never `system`, never a separate AI actor."

§7 `AuditLog` adds `mode` (enum: PERSON/DELEGATED/AUTOMATION) and `delegationId` (nullable; required when `mode` = DELEGATED).

**(4) Why.** FD-16 (Founder Decisions Log v1.5, L52) forbids an AI identity: "AI is NOT a first-class actor — no AI principal in the identity spine, no autonomous permissions, no new plane." AIW-D13 ("Keep FD-16, delegate") and AIW-D33 (the delegation record "is consistent with FD-16 … IMP-1 stays a Proposal until written into the FR documents (Step 3) and read by counsel") require a record that shows a named person stood behind each AI step. IMP-1 defines the two added facts (developers: "`mode = PERSON | DELEGATED | AUTOMATION`, `delegationId`") and the rule "The actor on the entry stays the named person (the existing "firm staff" kind); no new kind of actor is added, so FD-16 holds." The platform tenant rule is the founder's AIW-D54 item 8 ("platform runs stamped with one firm, no cross-firm sweep in version 1"; proposals row of 10 Oct, Support and account assistant tenant rule), which uses SA-11-2's own "null for global actions". Without the stamp, a Support assistant run's entries could not appear in the firm's own per-tenant view (§3.2).

**(5) Knock-ons.** AG-13's firm audit entry (single "who" field) carries the same two facts (CN-AG-13). The delegation record itself is specified in AW-01 (firm plane) and AW-02 (platform plane). SA-07's Activity list shows DELEGATED entries as such (CN-SA-07 change 3). Counsel reads the delegation record before the pilot (AIW-D33, D64).

---

## 5. Restricted fields come back under FD-15: masked, with an audited reveal

**(1) What it changes.** SA-11 v2.7 status line (L1); §3.2 first bullet (L209); SA-11-10 (L356); §11 Security (L576, last sentence); §13 item 7 (L628).

**(2) Current words.**

L1 (extract):
> Status: **Baseline — SA-07 and AG-17 (retention scope) decisions applied; AG7-D10 (no masking, no reveal of personal data) applied**

L209 (extract, first three sentences):
> - **No masking, no reveal of personal data** *(withdrawn v2.6 — AG7-D10; was "PII reveal")*. Personal data of firms' clients and staff (passport numbers, financial details, names, addresses) is **never masked** in any audit view, entry detail, snapshot or export: anyone permitted to read a record sees it in full. There is no reveal action, no `PII_REVEAL` event and no reveal or unmask permission.

L356:
> - **SA-11-10.** *(withdrawn v2.6 — AG7-D10)*

L628:
> 7. *(withdrawn v2.6 — AG7-D10)* — was the masked-by-default / reveal-logged field set; with no masking or reveal of personal data there is nothing to define.

**(3) Proposed words.**

Status line: "… AG7-D10 (no masking, no reveal of personal data) applied **except for Restricted fields, which follow FD-15 (kept by the founder, 11 Oct 2026); counsel confirms the Restricted list (B-1) before any Restricted field is stored**".

§3.2 first bullet, replaced:
> - **Restricted fields are masked, with an audited reveal (FD-15).** *(changed — FD-15 kept, AIW-D58)* Fields in the Restricted list (Founder Decisions Log B-1, set by the founder with counsel) are **masked by default** in every audit view, entry detail, snapshot and export, and shown in clear only to a holder of the reveal permission (SA-06), each reveal writing a `PII_REVEAL` event before the value is returned (Doc 1 v1.3 §7.2). Other personal data of firms' clients and staff is shown in full to anyone permitted to read the record. Two rules still hold: **(a)** personal data is never written to system logs or traces; **(b)** passport and financial numbers are never put into the content of emails, WhatsApp messages or notifications (BR-16, BR-17).

SA-11-10, reinstated:
> - **SA-11-10.** *(reinstated — FD-15, AIW-D58)* Every reveal of a Restricted field SHALL emit a `PII_REVEAL` audit event (actor, firm, subject, field, time, reason where required) written **before** the value is returned; if that audit write fails, the reveal SHALL be refused.

§11 Security, last sentence of the "Most-sensitive data" bullet: "personal data in `before/after` is **not** masked — AG7-D10" becomes "Restricted fields in `before/after` are masked unless revealed under SA-11-10 (FD-15); other personal data is not masked (AG7-D10)".

§13 item 7, reinstated:
> 7. **Restricted field set (founder + counsel).** *(reinstated — FD-15, AIW-D58)* The Restricted list (B-1) decides which fields are masked and revealed under SA-11-10; it is set before any Restricted field is stored (Founder Decisions Log B-1: "must be fixed before any Restricted field is stored").

**(4) Why.** FD-15 (Founder Decisions Log v1.5, L40, in the batch the log calls "BINDING for spec authoring", L22): "metadata fields whose canonical class is in the B-1 Restricted list get envelope-encryption + masked audited reveal". Doc 1 v1.3 §7.2 (L2055) states the purpose for every surface: "masked by default in every UI/API surface, and revealable only with an explicit permission whose every use is audited", and L2064 the order: "The reveal is recorded *before* the cleartext is returned". SA-11 v2.6 applied the team's later AG7-D10 instead. A module file never overrides a founder decision by date (README §0 rule 11); the conflict went to the founder (proposals row of 10 Oct, Practice expert, two Restricted-field models) and he chose "Keep FD-15" (AIW-D58: "FD-15 stands … the team brings AG-07 (AG7-D10) back to it … counsel confirms the Restricted list (B-1) before any is stored. The AI sees status only, either way."). Personal data that is not on the Restricted list stays unmasked, as AG7-D10 wanted.

**(5) Knock-ons.** AG-07 AG7-D10 and AG-7-88 (CN-AG-07). SA-06: the reveal permission and its withdrawn rows (CN-SA-06 change 2). SA-11-8's sensitive-event lens may regain a reveal lens; §12 "CHANGED" text follows. Counsel sets B-1 (AIW-D58, D64). For the AI assistants nothing changes: they never receive a Restricted value, only its status (IMP-21; AW-01).

---

## 6. Data-subject requests: add PORTABILITY, and name the firm-side screen

**(1) What it changes.** SA-11-27 (L385); §3.8 "How it works" (L299); §7 `DsrRequest` (L472); §13 (a new open question after item 10, L631).

**(2) Current words.**

L385:
> - **SA-11-27.** Super Admin can view a **DSR register** of access/correction/deletion requests: requester, firm, type, date received, response deadline, status (`PENDING/IN_PROGRESS/COMPLETED/OVERDUE/HELD`), and fulfilment actions; the register SHALL highlight requests approaching/past their statutory deadline.

L472:
> - **DsrRequest** *(NEW):* `dsrId`, `firmId` (tenant), `requesterRef`, `type` (access/correction/deletion), `receivedAt`, `deadline`, `status` (pending/in-progress/completed/overdue/held), `holdBlocked` (bool), `disclosureNote` (what deleted / what retained & why).

**(3) Proposed words.**

SA-11-27: "access/correction/deletion requests" becomes "access/correction/deletion/**portability** requests *(changed — aligns with Doc 4 CP-8-15)*". §3.8 "request type" list and §7 `DsrRequest.type` gain `portability`; deletion keeps the meaning Doc 4 calls ERASURE.

New open question:
> 11. **The firm-side DSR screen (product owners).** *(new)* §3.8 says "the firm executes within their tenant", and SA-06 seeds `agent/dsr:manage` and `agent/governance:read` on Owner and Admin, but no firm screen is specified. Name the firm screen that lists a firm's requests, who records a request raised outside the portal, and who sets HELD and COMPLETED.

**(4) Why.** Proposals row of 10 Oct (Firm assistant, "The firm-side screen and owner of the data-subject request register are unspecified … Name the firm screen, who records a request raised outside the portal, and who sets HELD / COMPLETED. Also align the type vocabulary … add PORTABILITY to SA-11, which owns the register and clock (CP-8-16)"). Doc 4 v1.3 CP-8-15 (L2716): "The client SHALL open a `DsrRequest` of type ACCESS / CORRECTION / ERASURE / PORTABILITY on the SA-11 statutory clock"; CP-8-16 (L2717) leaves the register to SA-11. SA-06 v3.1 §10b (L993–L994) seeds the two firm keys. The Firm assistant's privacy-request duty drafts work for a register that has no firm screen (`firm-assistant.md` §9 G-11, G-12).

**(5) Knock-ons.** AG-16 (firm settings) is the likely home of the firm screen (CN-AG-16, if the Agent-plane note takes it). The Firm assistant's privacy-request duty is specified in AW-01.
