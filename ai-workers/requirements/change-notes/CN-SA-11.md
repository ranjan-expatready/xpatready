# Change note CN-SA-11: Audit, Compliance and Data Governance

| | |
|---|---|
| **Document changed** | SA-11 Audit, Compliance & Data Governance, version 2.7, dated 2026-10-07 |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-11-audit-compliance-and-data-governance_v2.7_2026-10-07.md` |
| **Date of this note** | 11 Oct 2026 (fix round after review S3a) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 8 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-11's own style (SHALL wording, as SA-11 uses).
4. Why: the founder's decision (Founder Decisions Log FD-*n*; `ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`).
5. What else must change.

Nothing here restates a requirement of another document. The AI assistants are specified in AW-01 (firm plane) and AW-02 (platform plane), which cite these IDs.

**Plain words used here.**
- *AI processing*: any call to an AI model that reads a client's or a firm's data. That covers the four AI Doers (Reader, Sorter, Writer, Checker), the AI assistants' model calls, and reading text from images.
- *Delegation record*: which AI assistant works for which named person, with a subset of that person's permissions, on which files, from when until when. It is not an identity (AIW-D33).
- *Platform-plane run*: a run of one of Expat Ready's own AI assistants.

**Provisional.** Changes 1, 2, 3, 5 and 6 touch residency wording, retention values, the Restricted-field model or privacy-law rights. They stay provisional until counsel reads them (AIW-D64; counsel engaged by 31 Oct 2026, AIW-D68).

**Newer team files that bear on this note.** SA-08 v2.4 (10 Oct) removed the residency generator. Its decision SA8-D9 (L41) reads: "**The data-location statement is written once** (subscription terms and a firm-facing Security & privacy page, maintained in SA-11) — no generator". It asks SA-11 to hold that statement (SA8-X6, L98, pending). This note does not apply SA8-X6, which is the team's own knock-on. Change 2 is worded so it fits either form.

The shared 99-Phasing-and-Glossary v2.18 puts "Data residency declaration, retention config, PIPEDA DSR register" in SA-11's second phase (L41). Release 1 waits for the AI assistants (AIW-D66), so the team's phasing row follows (not written here).

---

## 1. AI processing of client data happens only in Canada: no "documented safeguards" route for it

**(1) What it changes.** SA-11 v2.7 §3.6 "Enforcement & flagging", first bullet (L269); SA-11-21 (L373); a new requirement after SA-11-31 (the document's last, L392).

**(2) Current words.**

L269:
> - **Automatic compliance warnings.** If any rail/sub-processor for a category is **Non-Canadian without a confirmed safeguard**, SA-11 raises a **compliance warning** on the dashboard (3.10) with a link to the offending SA-8 integration — surfaced *before* an auditor finds it (per §3.6 RES2: sub-processors must be Canadian-resident or explicitly approved with documented safeguards; a maintained sub-processor list is delivered).

L373:
> - **SA-11-21.** Any category whose rail/sub-processor is **Non-Canadian without a confirmed safeguard** SHALL raise a **compliance warning** on the dashboard, linked to the offending SA-8 integration.

**(3) Proposed words.**

L269 keeps its text and gains a second bullet below it:
> - **AI processing: only in Canada, with no safeguard route.** *(new — AIW-D52, AG11-D15)* For the **AI processing** category (SA-11-32), the RES2 route "explicitly approved with documented safeguards" does **not** apply. AI and OCR processing of client data happens **only in Canada**, for firms' data and for Expat Ready's own support tickets. A provider whose processing region is outside Canada cannot be recorded (SA-8-49); until a Canadian provider record is published, the AI switch stays locked for every firm (AG-11-93). Every other category keeps RES2 as written.

SA-11-21 gains, at the end:
> The AI processing category is excluded from this warning route: a non-Canadian AI processing region is refused at entry (SA-11-32, SA-8-49), never recorded with a safeguard.

New requirement:
> - **SA-11-32.** *(new — AIW-D52, AG11-D15)* The data categories SHALL include **AI processing**. For it, the only acceptable location SHALL be Canada; the statuses `Non-Canadian` and `Non-Canadian with confirmed safeguard` SHALL NOT be recordable for it.

**(4) Why.**
- **AIW-D52**, 11 Oct 2026. The founder chose "Only in Canada": "AI processing of client data happens only in Canada (AG11-D15 wording, for firms' data and Expat Ready's own support tickets) … SA-11 §3.6's *with safeguards* wording gets a change note."
- **Scope kept literal.** The proposed words keep the founder's scope exactly. Whether Expat Ready's other own AI calls (pack content, which holds no client data) also use only the Canada record is a question for the founder (CN-FDL open point 3; review S3a M-2). The proposal that one record serves both planes is SA-8-51, labelled a proposal.
- **The team's own rule.** AG-11 v1.12 already decides it (AG11-D15, L45: "Super Admin may record only a provider and region that process in Canada (SA-08 / SA-11)"). It lists this document as a pending knock-on (§0.2, L55: "the processing-terms record that gates AI (AG11-D13), which must show a Canadian region (AG11-D15) | Pending").
- **IMP-7.**

**(5) Knock-ons.**
- SA-08 SA-8-49 (CN-SA-08 change 2).
- AG-11 §0.2 SA-11 row and AG-16 §3.9 (CN-AG-11, CN-AG-16).
- The tech lead's test call (AIW-D69; `ai-workers/requirements/provider-test-script.md`).
- Counsel reads the wording (AIW-D64, D68).

---

## 2. The data-location statement names the AI provider and where its processing runs

**(1) What it changes.** SA-11 v2.7 §3.6 "How it works" (L266); SA-11-20 (L372); SA-11-22 (L374); §7 `ResidencyDeclaration` (L469).

**(2) Current words.**

L372:
> - **SA-11-20.** Super Admin can view a **data residency declaration**: per data category, the storage location (DB region, object-storage region, cache region, IdP region) and residency status (`Canadian` / `Non-Canadian` / `Non-Canadian with confirmed safeguard`), **generated from SA-8 rail configuration** (not hand-entered).

L374:
> - **SA-11-22.** The residency declaration and a maintained **sub-processor list** SHALL be **exportable** for inclusion in a firm's DPA (per §3.6 RES2).

**(3) Proposed words.** SA-11-20 and SA-11-22 each gain:
> *(changed — AIW-D52, IMP-7)* For the AI processing category, the declaration (or the written data-location statement of SA8-D9, whichever SA-11 holds) SHALL name the AI provider as a sub-processor and state the **processing region where each model call runs** (Canada), taken from the published AI provider record (SA-8-49), not only the storage location.

§7 `ResidencyDeclaration` `rail` gains `ai-processing`.

**(4) Why.**
- IMP-7: "SA-11 gets an "AI processing" category with the stricter rule … and the declaration shows the AI processing region". Adopted by AIW-D52.
- IMP-7 also found that "the residency declaration lists storage locations only, not processing", so a buyer could not see where a model reads their clients' files.
- SA-08 v2.4 lists only "Stripe and the mailbox providers as listed sub-processors" in the statement (SA8-X6, L98).
- Review S3a m-14 asked for SA-08's declaration entity. SA-08 v2.4 removed it (§7, L337–L344), so the knock-on is the statement.

**(5) Knock-ons.** SA-08 SA8-X6 (the team's) and SA-8-49 (CN-SA-08 change 2).

---

## 3. Retention: a data category for AI processing records, with interim values only where AG-11-98 gives them

**(1) What it changes.** SA-11-13 (L362); §13 open question 1 (L622).

**(2) Current words.**

L362:
> - **SA-11-13.** *(changed v2.4 — AG17-D42)* Super Admin can configure a platform-wide **retention policy**: a period **per data category** (immigration PII/case records, financial records, communications, audit & security logs, consent & DSR records, document files), each with a **legal floor enforced in code**; sub-floor values SHALL be rejected by both UI and API. The **case-file** period also governs LMIA (corporate) files and their candidate (job applicant) data: candidate data is kept as long as its file and deleted only when the whole file is deleted under that period — no separate candidate retention clock or category.

L622 (extract, first sentence):
> 1. **Retention values (counsel)** *(scope extended v2.4 — AG17-D42)*. Confirm the concrete floors and defaults per data category: financial/financial-linked audit (default **≥ 7 years**), breach records (**≥ 2 years**), other audit/security (**≥ 2 years**), case files (this one period also covers LMIA files and their candidate data, with no separate candidate period), communications, documents, consent/DSR records.

**(3) Proposed words.**

The SA-11-13 category list gains "**AI processing records**". A sentence is added at the end:
> *(changed — IMP-4, AG-11-98)* **AI processing records** are:
> - the rows of the one AI run log, on both planes;
> - the approval items AI work produced, and their decisions;
> - the Practice expert's question records;
> - the AI assistants' run records.
>
> Until counsel sets the floors and defaults (§13 Q1), AI run log rows on both planes and approval items follow AG-11-98's interim values. Question records and run records have **no interim value** (Unknown); none is invented, and counsel sets them. An audit entry made under an Expat Ready staff member's delegation is a staff action and follows SA-11-14.

§13 Q1 adds "AI processing records (interim values for the AI run log and approval items: AG-11-98; others: none yet)".

**(4) Why.**
- AG-11 v1.12 leaves this to SA-11 and marks it pending (§0.2, L55: "retention of the model-call audit log (interim 1 year) and of approval items (interim 2 years after decision) — AG-11-98 … Pending").
- The Step 3 shared rule: "AI log rows on both planes follow AG-11-98's interim values until counsel answers; no new value is invented" (`00-step3-plan.md`, "Interim retention").
- IMP-4 found that "SA-11 v2.7 has no AI data category and no AI retention row".
- `support-and-account-assistant.md` §9 G-3 relies on the fix.
- The Practice expert's question records go into the Owner's firm data export (AIW-D70).
- Review S3a m-15: AG-11-98 gives no value for question records or run records.

**(5) Knock-ons.**
- AG-11-98 and AG-16-39 (CN-AG-11, CN-AG-16).
- AW-01 and AW-02 cite this category.

---

## 4. Every audit entry says whether a person acted, an AI assistant acted for them, or an automation ran, and what started it; platform runs are stamped with the firm they serve

**(1) What it changes.** SA-11-2 (L348); BR-3 (L400); §7 `AuditLog` (L465).

**(2) Current words.**

L348:
> - **SA-11-2.** Each entry SHALL contain: `auditLogId` (UUID), `timestamp` (UTC, millisecond precision), `actor` (user id + display name), **`actorType` ∈ {super_admin, firm_staff, client, system}**, **`tenantId`** (firm id; **null for global actions**), `actionCode` (machine-readable), `entityType` + `entityId`, `before`/`after` snapshot (JSONB) where applicable, `ipAddress`, `userAgent`, **`correlationId`**, plus tamper-evidence fields **`sequenceNo`**, **`prevHash`**, **`entryHash`**.

L400:
> - **BR-3 (Actor type is always explicit).** Every entry has a non-null `actorType`. System actions are `system`; impersonated actions are `super_admin` with impersonated context; never inferred from a null `userId`.

**(3) Proposed words.**

SA-11-2 gains a second paragraph:
> *(changed — AIW-D33, AIW-D54)* Each entry SHALL also record **how the action was taken** (`mode` ∈ {PERSON, DELEGATED, AUTOMATION}).
>
> When `mode` is DELEGATED, the entry SHALL also record:
> - the **delegation record** it ran under (`delegationId`);
> - **what started the run** (`startedBy`: the assistant's schedule, another person, a product alert or a watcher item).
>
> For a DELEGATED entry, the `actor` and `actorType` SHALL be the named person the AI assistant works for (`firm_staff` or `super_admin`), never `system`; no new actor type is added.
>
> An entry written by a platform-plane AI assistant run SHALL carry as `tenantId` the one firm that run serves, or null when it serves no firm. A run that serves one firm SHALL NOT read another firm's data, and any operation spanning firms remains subject to SA-11-12.

BR-3 gains: "Actions an AI assistant took for a named person carry that person as actor, with `mode` DELEGATED, the `delegationId` and `startedBy` (SA-11-2); never `system`, never a separate AI actor."

§7 `AuditLog` adds:
- `mode` (enum: PERSON/DELEGATED/AUTOMATION);
- `delegationId` (nullable; required when DELEGATED);
- `startedBy` (nullable; required when DELEGATED).

**(4) Why.**
- **FD-16** (Founder Decisions Log v1.5, L52): "AI is NOT a first-class actor — no AI principal in the identity spine, no autonomous permissions, no new plane."
- **AIW-D13** ("Keep FD-16, delegate") and **AIW-D33** (the delegation record "is consistent with FD-16 … IMP-1 stays a Proposal until written into the FR documents (Step 3) and read by counsel").
- **IMP-1** defines the two facts (developers: "`mode = PERSON | DELEGATED | AUTOMATION`, `delegationId`"), with the rule "The actor on the entry stays the named person (the existing "firm staff" kind); no new kind of actor is added, so FD-16 holds."
- **The Step 3 actor rule:** "every delegated entry names the delegating person as the actor, mode DELEGATED, with the delegation reference, never `system`; a separate *started by* field records what started the run" (`00-step3-plan.md`).
- **The platform tenant rule** is AIW-D54 item 8 ("platform runs stamped with one firm, no cross-firm sweep in version 1"; proposals row of 10 Oct, Support and account assistant).

**(5) Knock-ons.**
- AG-13's firm audit entry (CN-AG-13).
- AW-01 and AW-02 (the delegation record and the run's start).
- SA-07 Activity (CN-SA-07 change 3).
- Counsel reads the delegation record before the pilot (AIW-D33, D64).

---

## 5. Restricted fields come back under FD-15: masked, with an audited reveal

**(1) What it changes.**
- the SA-11 v2.7 status line (L1);
- §3.2 first bullet (L209);
- SA-11-10 (L356);
- §11 Security (L576, last sentence);
- §13 item 7 (L628).

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
> - **Restricted fields are masked, with an audited reveal (FD-15).** *(changed — FD-15 kept, AIW-D58)* Fields in the Restricted list (Founder Decisions Log B-1, set by the founder with counsel) are **masked by default** in every audit view, entry detail, snapshot and export. They are shown in clear only to a holder of the reveal permission (SA-06), and each reveal writes a `PII_REVEAL` event before the value is returned (Doc 1 v1.3 §7.2). Other personal data of firms' clients and staff is shown in full to anyone permitted to read the record. Two rules still hold: **(a)** personal data is never written to system logs or traces; **(b)** passport and financial numbers are never put into the content of emails, WhatsApp messages or notifications (BR-16, BR-17).

SA-11-10, reinstated:
> - **SA-11-10.** *(reinstated — FD-15, AIW-D58)* Every reveal of a Restricted field SHALL emit a `PII_REVEAL` audit event (actor, firm, subject, field, time, reason where required), written **before** the value is returned. If that audit write fails, the reveal SHALL be refused. This is an exception to SA-11-7 and BR-5: the reveal is the sensitive act, so it fails closed.

§11 Security, the "Most-sensitive data" bullet: "personal data in `before/after` is **not** masked — AG7-D10" becomes "Restricted fields in `before/after` are masked unless revealed under SA-11-10 (FD-15); other personal data is not masked (AG7-D10)".

§13 item 7, reinstated:
> 7. **Restricted field set (founder + counsel).** *(reinstated — FD-15, AIW-D58)* The Restricted list (B-1) decides which fields are masked and revealed under SA-11-10; it is set before any Restricted field is stored (Founder Decisions Log B-1: "must be fixed before any Restricted field is stored").

**(4) Why.**
- **FD-15** (Founder Decisions Log v1.5, L40, in the batch the log calls "BINDING for spec authoring", L22): "metadata fields whose canonical class is in the B-1 Restricted list get envelope-encryption + masked audited reveal".
- **Doc 1 v1.3 §7.2** (L2055): "masked by default in every UI/API surface, and revealable only with an explicit permission whose every use is audited". L2064: "The reveal is recorded *before* the cleartext is returned". That is the fail-closed exception (review S3a m-6).
- **The founder's choice.** A module file never overrides a founder decision by date (README §0 rule 11). The founder chose "Keep FD-15" (AIW-D58: "FD-15 stands … the team brings AG-07 (AG7-D10) back to it … counsel confirms the Restricted list (B-1) before any is stored. The AI sees status only, either way.").
- Proposals row of 10 Oct (Practice expert, two Restricted-field models).

**(5) Knock-ons.**
- AG-07 (CN-AG-07).
- SA-06 (CN-SA-06 change 2).
- SA-11-8's lens and §12 "CHANGED" text follow.
- Counsel sets B-1 (AIW-D58, D64).
- AI assistants never receive a Restricted value, only its status (IMP-21; AW-01).

---

## 6. Data-subject requests: the founder's automated-decision review type, portability (counsel), and the firm-side screen

**(1) What it changes.** SA-11-27 (L385); §3.8 "How it works" (L299); §7 `DsrRequest` (L472); §13, a new open question after item 10 (L631).

**(2) Current words.**

L385:
> - **SA-11-27.** Super Admin can view a **DSR register** of access/correction/deletion requests: requester, firm, type, date received, response deadline, status (`PENDING/IN_PROGRESS/COMPLETED/OVERDUE/HELD`), and fulfilment actions; the register SHALL highlight requests approaching/past their statutory deadline.

L472:
> - **DsrRequest** *(NEW):* `dsrId`, `firmId` (tenant), `requesterRef`, `type` (access/correction/deletion), `receivedAt`, `deadline`, `status` (pending/in-progress/completed/overdue/held), `holdBlocked` (bool), `disclosureNote` (what deleted / what retained & why).

**(3) Proposed words.**

SA-11-27: "access/correction/deletion requests" becomes "access/correction/deletion/**review of an automated decision**/**portability** requests". §3.8's request-type list and §7 `DsrRequest.type` gain `review_of_automated_decision` and `portability`.

New sentence in SA-11-27:
> *(changed — FD-20)* A **review of an automated decision** request SHALL be routed to a named person at the firm, who records the outcome on the request.

New sentence in SA-11-27:
> *(changed — portability; confirm with counsel)* Whether and how a **portability** request is served is confirmed with counsel before it is offered to clients.

New open question:
> 11. **The firm-side DSR screen (product owners).** *(new)* §3.8 says "the firm executes within their tenant", and SA-06 seeds `agent/dsr:manage` and `agent/governance:read` on Owner and Admin, but no firm screen is specified. Name the firm screen that lists a firm's requests, who records a request raised outside the portal, and who sets HELD and COMPLETED.

**(4) Why.**
- **FD-20** (Founder Decisions Log v1.5, L56) is a ratified decision. It requires "a **`REVIEW_OF_AUTOMATED_DECISION`** request type in the DSR machinery routing to a named human reviewer with a recorded outcome". No module file carries it (review S3a M-6). A team file never overrides a founder decision (rule 11), so it is added here. FD-20 says "Counsel confirms wording, not mechanism."
- **Portability, and rule 11.** README §0 rule 11 makes the newer module file (SA-11, 7 Oct) win over Doc 4 (July), which lists PORTABILITY (CP-8-15, L2716). The default would therefore keep SA-11's three types.
- **Why the default is set aside here:**
  - the proposals row of 10 Oct (Firm assistant) asks to "add PORTABILITY to SA-11, which owns the register and clock (CP-8-16)";
  - the team's current portal module, CP-01, which superseded Doc 4, is not on Drive (`sources/drive-snapshot-2026-10-11/08-client-portal/NOT-FOUND.md`), so Doc 4 is the only portal source to align with.
- **Counsel.** Portability is a privacy-law right; the log's own B-4 lists "whether portal DSR erasure/portability is fully self-serve" as a counsel matter (L236). Hence the counsel flag.
- **The two firm keys** are in SA-06 v3.3 §10b (L1057–L1058).
- **The Firm assistant's privacy-request duty** works on this register (`firm-assistant.md` §9 G-11, G-12).

**(5) Knock-ons.**
- The counsel pack adds portability (AIW-D68).
- CP-01 (once on Drive) and AG-16 (the firm screen; CN-AG-16 if the Agent-plane note takes it).
- AG-03: the assessment's automated-decision marker (FD-20; CN-AG-03 if the Agent-plane note takes it).

---

## 7. SA-11 emits an event when a data-subject request is opened and when consent is withdrawn

**(1) What it changes.** §3.8 "Data flow" (L313); SA-11-27 (L385); SA-11-29 (L387).

**(2) Current words.**

L387:
> - **SA-11-29.** **Consent records** (express marketing consent, data-processing consent, withdrawals) SHALL be recorded with timestamp, scope, **locale**, and capturing **form/version**; withdrawals SHALL be first-class and halt downstream processing; firm modules SHALL read **live** consent state.

**(3) Proposed words.**
- SA-11-27 gains: "*(changed — events)* Opening a request SHALL emit a **request-opened** event (code name for the team) carrying the firm, the request id and the type, never the subject's personal data."
- SA-11-29 gains: "*(changed — events)* A withdrawal SHALL emit a **consent-withdrawn** event (code name for the team) carrying the firm, the consent id and its scope, never the subject's personal data."
- Both events are delivered once per change to firm modules, including the firm's automation engine.

**(4) Why.**
- Proposals row of 10 Oct (Firm assistant): its list of trigger events includes "a data-subject request being opened" and "a consent record being withdrawn".
- `firm-assistant.md` §9 G-17.
- The Agent-plane note CN-AG-11 change 4 adds both to the engine's trigger list (items (e) and (f)) and names SA-11 as their owner ("SA-11 owns the data-subject register and consent records (Super Admin half)").
- The Step 3 rule "One home per rule": an event lives in the change note of the module that owns the record (`00-step3-plan.md`).

**(5) Knock-ons.** AG-11 trigger list (CN-AG-11 change 4). AG-10 BR-4 reads the same live consent state.

---

## 8. Document control

**(1) What it changes.** The document-control table (L4–L13).

**(2) Current words.** The last row is v2.7 of 2026-10-07.

**(3) Proposed words.** A version row: "| 2.8 | *(date placed)* | Workstream 2 change note CN-SA-11 applied: AI processing only in Canada (SA-11-32); AI provider named in the data-location statement; AI processing records retention category; `mode`, `delegationId`, `startedBy` on audit entries; Restricted fields under FD-15; FD-20 review request type and portability (counsel); request and consent events; open question 11. | AIW-D33, AIW-D52, AIW-D54, AIW-D58; FD-15, FD-20 |".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
