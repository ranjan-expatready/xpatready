# Change note CN-SA-11: Audit, Compliance and Data Governance

| | |
|---|---|
| **Document changed** | SA-11 Audit, Compliance & Data Governance, version 2.7, dated 2026-10-07 |
| **Current base (15 Oct 2026, snapshot 1535; scrum 4b outcome 0 (e))** | **SA-11 v2.10**, `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-11-audit-compliance-and-data-governance_v2.10_2026-10-12.md` (identical to the 13 Oct 09:26 copy the re-base row checked). The re-base row says what stands, is withdrawn or is re-aimed; a quote or line number marked re-pointed, corrected or "v2.10" is the current file's; any other is the older version's and is history. |
| **Re-based 13 Oct 2026 (source reconciliation, `decisions.md` rows "Reconciliation renumbering" and "Lead rulings, source reconciliation")** | Checked against **SA-11 v2.10** (12 Oct 2026). **ID collision:** our SA-11-32 was taken (the written data-location statement: client data in Canada (Montreal), sub-processors listed, backups 35 days); renumbered **SA-11-32 → SA-11-37**; version row 2.8 → **2.11**. **Change 1 re-based:** SA-11-21 (compliance warning) is withdrawn and the generated declaration is parked; the rule "AI processing of client data only in Canada, no safeguards route" is proposed as a line in the written statement (SA-11-32) plus SA-11-37; "RES2" no longer occurs. **Change 2** points to the written statement (SA-11-32), not a generated declaration. **Change 3 withdrawn:** SA-11-13 (per-category retention policy with legal floors) is replaced by SA-11-33 (the whole activity log is kept **7 years, one number**; no per-category policy); the AI-processing-records retention question moves to repair stage R2b. **Change 5 re-based** on the new SA-11-27 (a register only of requests made to ExpatReady itself; the firm's requests are the firm's). Legal holds are placed by the **Platform Owner only** (`system/compliance:legal-hold`); erasure runs only on an approved request with a 7-day grace and a Cancel, stopped by the "Data erasure" kill flag (SA-11-16, SA-12-33); the breach register is a plain record kept by the Platform Owner, Auditor read-only, Release 1 (SA-11-24, P-3); regulator wording never appears on a screen. **Now met:** the hash chain, verify job and WORM anchor are built (§12). Line numbers and quotes below are v2.7's. |
| **Changed 14 Oct 2026 (the founder's AIW-D147)** | Change 1 rewritten: AI processing in **Canada or the United States** under no-training and zero-retention terms, with client notice (was "only in Canada", AIW-D52). Change 2 states the processing region as Canada or the US. |
| **Changed 14 Oct 2026 (the founder's AIW-D148)** | Change 1 (4): the client notice and Quebec's privacy impact assessment are the one bounded counsel check of AIW-D148 (counsel pack Q4, Q5), not "no counsel"; the cross-border transfer stays Unconfirmed: no counsel (AIW-D94). The checker's acceptance review of the technical solution 0.4, M3. |
| **Re-worded 15 Oct 2026 (scrum 4 close-out; review batch 3 findings)** | Against SA-11 v2.10 (snapshot 1535). Changes 1 and 2 ask only of the written data-location statement (SA-11-32), since the generated declaration is parked (SA11-D6); SA-11-37 no longer adds a data category. Changes 6 and 7: a client's data request is the firm's AG-13 task (SA11-D4; SA-05 v3.4 SA5-D58), so FD-20's review, portability and the request event move there (CN-AG-11 change 4 (f) re-pointed); open question 11 withdrawn; the consent-withdrawn event stays on SA-11-29. Old line anchors kept as history. |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-11-audit-compliance-and-data-governance_v2.7_2026-10-07.md` |
| **Date of this note** | 11 Oct 2026 (sixth round: the founder's Step 3 batch, AIW-D74 (Canada for every AI call) and AIW-D78 (the residency declaration in Release 1)) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 8 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-11's own style (SHALL wording, as SA-11 uses).
4. Why: the founder decision, improvement or gap behind the change.
5. What else must change.

The assistants are specified in AW-01 and AW-02, which cite these IDs. Other Workstream 2 files are cited by change and requirement ID only.

**Plain words used here.**
- *AI processing*: any call to an AI model that reads a client's or a firm's data. This covers the four AI Doers, the assistants' model calls, and reading text from images.
- *Delegation record*: which assistant works for which named person, with a subset of that person's permissions (AIW-D33).
- *Platform-plane run*: a run of one of Expat Ready's own assistants.

**Unconfirmed.** Changes 1, 2, 3, 5 and 6 (6 is now an AG-13 knock-on) are unconfirmed Lead guidance; no counsel (AIW-D94) (AIW-D64's gate and AIW-D68 superseded). They touch residency wording, retention values, the Restricted-field model or privacy-law rights.

**Newer team files that bear on this note.**
- SA-08 removed the residency generator: SA-08 v2.7 SA8-D9 (L48): "**The data-location statement is written once** (subscription terms and a firm-facing Security & privacy page, maintained in SA-11) — no generator". Its knock-on SA8-X6 (L142) is applied in SA-11 as the written statement SA-11-32 (SA-11 v2.10), so change 2 is written against that statement.
- The shared 99-Phasing-and-Glossary v2.18 places "Data residency declaration, retention config, PIPEDA DSR register" in SA-11's second phase (L41). **Decided 11 Oct 2026 (AIW-D78, "Only what safety needs"):** the **data-residency declaration** moves into Release 1; everything else on that row (retention configuration, the PIPEDA DSR register), and SA-11's breach register, stays in the team's phase, and the assistant step that depends on it waits and works without it (for example no breach-register link). The phasing row is the team's to change, with this note (not written here). *Since 12 Oct (SA-11 v2.10, snapshot 1535):* the generated declaration is parked and not built (SA11-D6, L43; SA-11-20, L437); the written data-location statement (SA-11-32, L458) stands in for it in Release 1. Changes 1 and 2 are therefore asked of the written statement only, as TC-22 is (re-worded 15 Oct 2026).

---

## 1. AI processing of client data happens in Canada or the United States only: an AI processing category with that rule

> **Changed 14 Oct 2026 (the founder's AIW-D147).** The founder replaced "only in Canada" (AIW-D52) with: client data stored in Canada; AI and OCR processing in **Canada or the United States**, under written no-training and zero-retention terms, with client notice; no global routing. SA-11 §3.6 RES2's "explicitly approved with documented safeguards" (SA-11 v2.7 wording; withdrawn in v2.10, which has the written data-location statement SA-11-32 instead; AIW-D147 correction) now fits the AI provider; AIW-D52's planned tightening of it is withdrawn (AIW-D52 correction). The earlier "only in Canada, no safeguard route" proposal (11 and 13 Oct) is replaced by the words below.
>
> **Re-based 13 Oct 2026 (source reconciliation).** SA-11 v2.10 withdrew SA-11-21 (the compliance warning), parked the generated declaration and reworded SA-11-20 and SA-11-22 around a **written data-location statement** (SA-11-32 v2.10: client data stored in Canada (Montreal), sub-processors listed, backups 35 days); "RES2" no longer occurs.

**(1) What it changes.** The written data-location statement (SA-11-32, L458 of SA-11 v2.10; §3.6 "How it works", L319); a new requirement, **SA-11-37**.

**(2) Current words.**

L458:
> - **SA-11-32.** *(NEW v2.8 — SA8-D9, SA8-X6)* SA-11 SHALL hold a **written data-location statement**: all client data is stored in Canada (Montréal), encrypted; Stripe and the mailbox, calendar and WhatsApp providers are listed sub-processors; backups are kept 35 days (SA2-D12). …

Nothing in SA-11 v2.10 says where AI processing may run.

**(3) Proposed words.**

The written data-location statement gains one line:
> AI and OCR processing of client data runs in Canada or the United States, never elsewhere and never through global routing, under the published AI provider record (SA-8-66), with written no-training and zero-retention terms; client data stays stored in Canada. *(new — AIW-D147)*

New requirement:
> - **SA-11-37.** *(new — AIW-D147, AG11-D15 as changed by CN-AG-11 change 19; re-worded 15 Oct 2026 to the written statement)* AI and OCR processing of client data SHALL run only in Canada or the United States, each under the no-training and zero-retention terms recorded in the published AI provider record (SA-8-66); a provider record whose processing region, or any destination of its routing, is outside Canada and the United States, or that uses global routing, SHALL NOT be publishable. The written data-location statement (SA-11-32) SHALL say so, for firms' client data and for support-ticket text (AW-2-25). The rule covers firms' data and Expat Ready's own AI calls (AIW-D74 as corrected). *If the generated per-category declaration returns with multi-region routing (SA-11-20, parked), AI processing is one of its categories under this rule.*

**(4) Why.**
- AIW-D147. The founder chose "Canada or US (Recommended)" on 14 Oct 2026, replacing AIW-D52's "only in Canada" (AIW-D52 correction); the reach to every AI call Expat Ready makes is AIW-D74's (AIW-D74 correction 2).
- AG-11 v1.13 AG11-D15 (L46) still says "only in Canada"; CN-AG-11 change 19 changes it.
- IMP-7 (an AI processing category, now with the Canada-or-US rule).
- Legal points: cross-border transfer: Unconfirmed: no counsel (AIW-D94); client notice and Quebec's privacy impact assessment: the one bounded counsel check of AIW-D148 (`../counsel-pack.md` Q4, Q5), before real client files go to US processing.

**(5) Knock-ons.**
- SA-08 SA-8-66 (CN-SA-08 change 2).
- AG-11 and AG-16 (CN-AG-11, CN-AG-16).
- The provider test (AIW-D69).
- Legal points: unconfirmed Lead guidance; no counsel (AIW-D94) (was AIW-D64, D68).

---

## 2. The data-location statement names the AI provider and where its processing runs

**(1) What it changes** *(re-pointed 15 Oct 2026 to SA-11 v2.10, snapshot 1535)*. §3.6 "How it works" (L319); SA-11-22 (L439); SA-11-32 (L458). *History: drafted against v2.7's generated declaration (SA-11-20 L372, SA-11-22 L374, §7 `ResidencyDeclaration` L469); v2.9 replaced SA-11-20 with the written statement (L437) and withdrew `ResidencyDeclaration` (L523).*

**(2) Current words.**

L439:
> - **SA-11-22.** *(changed v2.8; v2.9 wording)* The written data-location statement (SA-11-32) and a maintained **sub-processor list** SHALL be **exportable** for inclusion in a firm's data-processing terms.

L319 (extract): "Stripe and the mailbox, calendar and WhatsApp providers are the listed sub-processors".

**(3) Proposed words.** SA-11-32 gains:
> *(changed — AIW-D52, IMP-7, AIW-D147)* The statement and its sub-processor list SHALL name the AI provider as a sub-processor and state the **processing region where each model call runs** (Canada or the United States), taken from the published AI provider record (SA-8-66), not only where data is stored. Publishing or withdrawing that record is an infrastructure or sub-processor change under SA-11-32, so it makes a new audited version of the statement.

§3.6 "How it works" (L319) adds the AI provider to the listed sub-processors. SA-11-22 needs no change: it exports the statement and list as they stand.

**(4) Why.**
- IMP-7: "SA-11 gets an "AI processing" category with the stricter rule … and the declaration shows the AI processing region". Adopted by AIW-D52; carried by the written statement while the declaration is parked (SA11-D6).
- SA-08 v2.7 SA8-X6 (L142) lists only "Stripe and the mailbox providers as listed sub-processors".

**(5) Knock-ons.** SA-08 SA8-X6 (the team's) and SA-8-66 (CN-SA-08 change 2).

---

## 3. Retention: a data category for AI processing records, with interim values only where AG-11-98 gives them

> **Withdrawn 13 Oct 2026 (source reconciliation).** SA-11-13 (a platform-wide retention policy per data category with legal floors) is replaced in v2.10 by SA-11-33: the whole activity log is kept **7 years, one number**; no per-category policy, no legal floors; the firm keep-period is a reminder, not a lock (Q19). An "AI processing records" category therefore has nowhere to go. The question of how long AI run records are kept moves to repair stage R2b (retention owner, a founder question). **Settled 15 Oct 2026 by AIW-D166:** AI records (run log, approval items, run, delegation, question and check records) are part of the audit trail and keep the activity log's one number, 7 years (SA11-D3 (2)); this note asks nothing new of SA-11; the storage rule inside that number is the team's, under register TC-172 (asked of AG-11-98). Kept for the record.

**(1) What it changes.** SA-11-13 (L362); §13 open question 1 (L622).

**(2) Current words.**

L362:
> - **SA-11-13.** *(changed v2.4 — AG17-D42)* Super Admin can configure a platform-wide **retention policy**: a period **per data category** (immigration PII/case records, financial records, communications, audit & security logs, consent & DSR records, document files), each with a **legal floor enforced in code**; sub-floor values SHALL be rejected by both UI and API. The **case-file** period also governs LMIA (corporate) files and their candidate (job applicant) data: candidate data is kept as long as its file and deleted only when the whole file is deleted under that period — no separate candidate retention clock or category.

L622 (extract, first sentence):
> 1. **Retention values (unconfirmed Lead guidance; no counsel (AIW-D94))** *(scope extended v2.4 — AG17-D42)*. Confirm the concrete floors and defaults per data category: financial/financial-linked audit (default **≥ 7 years**), breach records (**≥ 2 years**), other audit/security (**≥ 2 years**), case files (this one period also covers LMIA files and their candidate data, with no separate candidate period), communications, documents, consent/DSR records.

**(3) Proposed words.**

The category list in SA-11-13 gains "**AI processing records**". A sentence is added at the end:
> *(changed — IMP-4, AG-11-98)* **AI processing records** are: the rows of the one AI run log, on both planes; the approval items AI work produced and their decisions; the Practice expert's question records; and the assistants' run records and proposals. Until the floors and defaults are set (§13 Q1; unconfirmed Lead guidance; no counsel (AIW-D94)):
> - AI run log rows on both planes and approval items follow AG-11-98's interim values (`AiRunLog` 1 year; `ApprovalItem` 2 years after its decision);
> - question records, run records and proposals have **no interim value: Unknown, counsel question 8**. None is invented or borrowed from another record type.
>
> An audit entry made under an Expat Ready staff member's delegation is a staff action and follows SA-11-14.

§13 Q1 adds "AI processing records (interim values for the AI run log and approval items: AG-11-98; others: Unknown)".

**(4) Why.**
- AG-11 v1.13 §0.2 (L56): "retention of the model-call audit log (interim 1 year) and of approval items (interim 2 years after decision) — AG-11-98 … Pending".
- The Step 3 shared rules on retention (`00-step3-plan.md`):
  - "Interim retention": "AI log rows on both planes follow AG-11-98's interim values until counsel answers; no new value is invented".
  - "No retention value is invented": "a record type with no interim value in AG-11-98 or CN-SA-11 change 3 (run records, proposals, question records) shows *Unknown, counsel question 8*; no value is borrowed from another record type".
- IMP-4; AW-2-21; AIW-D70.

**(5) Knock-ons.**
- AG-11-98 and AG-16-39 (CN-AG-11, CN-AG-16).
- AW-01 and AW-02 cite this category.

---

## 4. Platform audit entries follow AG-13-68's audit-field rule, with the platform's empty firm

**(1) What it changes.** SA-11-2 (L348); BR-3 (L400); §7 `AuditLog` (L465).

**(2) Current words.**

L348:
> - **SA-11-2.** Each entry SHALL contain: `auditLogId` (UUID), `timestamp` (UTC, millisecond precision), `actor` (user id + display name), **`actorType` ∈ {super_admin, firm_staff, client, system}**, **`tenantId`** (firm id; **null for global actions**), `actionCode` (machine-readable), `entityType` + `entityId`, `before`/`after` snapshot (JSONB) where applicable, `ipAddress`, `userAgent`, **`correlationId`**, plus tamper-evidence fields **`sequenceNo`**, **`prevHash`**, **`entryHash`**.

L400:
> - **BR-3 (Actor type is always explicit).** Every entry has a non-null `actorType`. System actions are `system`; impersonated actions are `super_admin` with impersonated context; never inferred from a null `userId`.

**(3) Proposed words.**

SA-11-2 gains a second paragraph:
> *(changed — AIW-D33, AIW-D54)* Each entry SHALL also carry the audit fields of **AG-13-68** (`mode`, `delegationId`, `startedBy`, `personaRunId`), under that requirement's rule, which applies to this platform audit chain (CN-AG-13 change 2). On this chain:
> - the `actorType` of an entry an assistant made for a named person is that person's own (`firm_staff` or `super_admin`), never `system`; no actor type is added;
> - an entry written by a platform-plane assistant run SHALL carry as `tenantId` the one firm that run serves, or null (the empty firm) when it serves no firm (CN-AG-11 change 11). A run that serves one firm SHALL NOT read another firm's data; any operation spanning firms remains subject to SA-11-12.

BR-3 gains: "An entry an assistant made for a named person names that person as actor, never `system` (SA-11-2; AG-13-68)."

§7 `AuditLog` adds "the fields of AG-13-68 (CN-AG-13 change 2)".

**(4) Why.**
- **One home.** The Lead's call of 11 Oct, `00-step3-plan.md`, "Audit fields, one home": "the rule for `mode`, `delegationId`, `startedBy` on audit entries lives in CN-AG-13 change 2; CN-SA-11 change 4 applies it to the platform audit chain by pointer, with the platform's empty firm (as the one AI log shape)". AG-13-68 itself applies the same rule to Expat Ready's platform audit chain and points here (CN-AG-13 change 2). This change is that pointer; it restates none of the rule.
- **FD-16** (Founder Decisions Log v1.5, L52): "AI is NOT a first-class actor — no AI principal in the identity spine, no autonomous permissions, no new plane." SA-11's own `actorType` list is the only SA-11-specific part, so it is stated here.
- **AIW-D33** (the delegation record is consistent with FD-16) and **AIW-D54 item 8** (platform runs are stamped with one firm, with no cross-firm sweep in version 1).
- The `startedBy` values are AG-11-114's (CN-AG-11 change 7; `00-step3-plan.md`, "Started by, one list").

**(5) Knock-ons.**
- AG-13-68 (CN-AG-13 change 2), the one home of the rule; AG-11-114 (CN-AG-11 change 7), the one home of the `startedBy` values; CN-AG-11 change 11, the platform's empty firm.
- Whether SA-11's and AG-13's audit logs are one table or two stays for the Lead and the team (CN-AG-13 change 2 knock-ons).
- AW-01 and AW-02 cite AG-13-68.
- SA-07 Activity (CN-SA-07 change 3).
- Legal points: unconfirmed Lead guidance; no counsel (AIW-D94) (was AIW-D33, D64).

---

## 5. Restricted fields come back under FD-15: masked, with an audited reveal

**(1) What it changes.**
- the status line (L1);
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

The status line: "… AG7-D10 (no masking, no reveal of personal data) applied **except for Restricted fields, which follow FD-15 (kept by the founder, 11 Oct 2026); counsel confirms the Restricted list (B-1) before any Restricted field is stored**".

§3.2 first bullet, replaced:
> - **Restricted fields are masked, with an audited reveal (FD-15).** *(changed — FD-15 kept, AIW-D58)* Fields in the Restricted list (Founder Decisions Log B-1, set by the founder; unconfirmed Lead guidance; no counsel (AIW-D94)) are **masked by default** in every audit view, entry detail, snapshot and export. They are shown in clear only to a holder of the reveal permission (SA-06), and each reveal writes a `PII_REVEAL` event before the value is returned (Doc 1 v1.3 §7.2). Other personal data is shown in full to anyone permitted to read the record. Two rules still hold: **(a)** personal data is never written to system logs or traces; **(b)** passport and financial numbers are never put into the content of emails, WhatsApp messages or notifications (BR-16, BR-17).

SA-11-10, reinstated:
> - **SA-11-10.** *(reinstated — FD-15, AIW-D58)* Every reveal of a Restricted field SHALL emit a `PII_REVEAL` audit event (actor, firm, subject, field, time, reason where required), written **before** the value is returned; if that audit write fails, the reveal SHALL be refused. This is an exception to SA-11-7 and BR-5: the reveal is the sensitive act, so it fails closed.

§11 Security, in the "Most-sensitive data" bullet: "personal data in `before/after` is **not** masked — AG7-D10" becomes "Restricted fields in `before/after` are masked unless revealed under SA-11-10 (FD-15); other personal data is not masked (AG7-D10)".

§13 item 7, reinstated:
> 7. **Restricted field set (founder; unconfirmed Lead guidance; no counsel (AIW-D94)).** *(reinstated — FD-15, AIW-D58)* The Restricted list (B-1) decides which fields are masked and revealed under SA-11-10; it is set before any Restricted field is stored (Founder Decisions Log B-1: "must be fixed before any Restricted field is stored").

**(4) Why.**
- FD-15 (FDL v1.5, L40): "metadata fields whose canonical class is in the B-1 Restricted list get envelope-encryption + masked audited reveal".
- Doc 1 v1.3 §7.2 (L2055): "masked by default in every UI/API surface, and revealable only with an explicit permission whose every use is audited". L2064: "The reveal is recorded *before* the cleartext is returned".
- README §0 rule 11; AIW-D58 ("Keep FD-15").

**(5) Knock-ons.** AG-07 (CN-AG-07); SA-06 (CN-SA-06 change 2); the founder sets B-1 (unconfirmed Lead guidance; no counsel (AIW-D94)). assistants receive a Restricted field's status only (IMP-21; AW-01).

---

## 6. Clients' data requests: FD-20's automated-decision review and portability, as AG-13 client-request tasks

> **Re-worded 15 Oct 2026 (scrum 4 close-out; review batch 3 finding).** SA-11 v2.10 makes a client's personal-data request the **firm's** (SA11-D4, L41): SA-11's register (SA-11-27, L450) tracks only requests made to ExpatReady itself, and the firm handles its clients' requests as **AG-13 tasks** with a category (SA-05 v3.4 SA5-D58, L78; no new firm-side request list, SA5-X37 (a), L269). The 11 Oct proposal (two new types on SA-11's DSR register, `DsrRequest.type`, and open question 11 on a firm screen) therefore has no home in SA-11; it moves to the AG-13 task. Open question 11 is answered by SA5-D58 (the client screen, AG-7-84, and My Tasks) and is withdrawn. *History: drafted against v2.7 SA-11-27 (L385), §3.8 (L299) and §7 `DsrRequest` (L472).*

**(1) What it changes.** No SA-11 text. The ask goes to the team as a knock-on on AG-13's task categories (AG-13-1; AG-13 v1.12 §3.1) and SA5-D58, through the register (TC-85).

**(2) Current words.**

SA-05 v3.4 L78 (SA5-D58, extract):
> It is an **AG-13 task** on the client or lead with a category: Client request · Complaint · Regulator enquiry · Other (AG-13-1; AG-13 §3.1) … **Copy of my file** and **Delete my data** are the same task plus the built engine action (`dsr.controller.ts`, `dsr-export.job.ts`); default due date 30 days.

**(3) Proposed words (for SA5-D58 and AG-13-1, the team's to place).**
> *(changed — FD-20)* A client's request for **review of an automated decision** SHALL be a Client request task of its own kind, assigned to a named person at the firm, who records the outcome on the task before it can be closed.
>
> *(changed — portability; unconfirmed Lead guidance; no counsel (AIW-D94), counsel question 16)* Whether a **portability** request is served by the built "Copy of my file" export, or needs a machine-readable format of its own, is decided by the founder on that guidance before it is offered to clients.

**(4) Why.**
- **FD-20** (FDL v1.5, L56) requires "a **`REVIEW_OF_AUTOMATED_DECISION`** request type in the DSR machinery routing to a named human reviewer with a recorded outcome". FD-20 is an **architect call** taken under the founder's standing technical delegation and recorded in the Founder Decisions Log for ratification (FDL L46); no AIW-D row has ratified it. Rule 11 covers every FD-n row, so it applies over the team file; this re-wording changes only where the request type lives (the firm's AG-13 task, where the team now keeps clients' requests), not what FD-20 requires. FD-20 also says: "Counsel confirms wording, not mechanism."
- **Portability.** Doc 4 lists PORTABILITY (CP-8-15, L2716); the proposals row of 10 Oct (Owner's AI) asked for it. The built "Copy of my file" export (SA5-D58) is the nearest existing mechanism.
- **Legal points (unconfirmed Lead guidance; no counsel (AIW-D94)).** Counsel pack question 16 covers portability and the FD-20 review; the log's B-4 lists "whether portal DSR erasure/portability is fully self-serve" as a counsel matter (L236).
- **Firm keys:** SA-06 v3.6 §10b L1160 `agent/dsr:manage` ("Manage the firm's list of clients' personal-data requests", Owner and Admin); bundle 26 (L1541). The firm screen gap (AW-1-107) is closed by SA5-D58.

**(5) Knock-ons.**
- AG-13 (AG-13-1 task categories) and SA-05 (SA5-D58), the team's; register TC-85.
- Counsel question 16.
- AG-03 for FD-20's assessment marker (CN-AG-03, if the Agent-plane note takes it).
- AW-01 cites the client-request task (AW-1-19, AW-1-142).

---

## 7. An event when a client-request task is opened (AG-13) and when consent is withdrawn (SA-11)

> **Re-worded 15 Oct 2026 (scrum 4 close-out; review batch 3 finding).** The "request opened" event no longer belongs to SA-11: a client's request is the firm's AG-13 task (SA11-D4, L41; SA5-D58), and SA-11-27 (L450) tracks only requests made to ExpatReady itself, which are not firm events. The consent-withdrawn event stays on SA-11-29. *History: drafted against v2.7 §3.8 "Data flow" (L313), SA-11-27 (L385) and SA-11-29 (L387).*

**(1) What it changes.** §3.8 "Data flow" (L358); SA-11-29 (L452). The request event is proposed on the AG-13 task through CN-AG-11 change 4 (f).

**(2) Current words.**

L452 (SA-11-29, extract):
> Withdrawals and unsubscribe / STOP are first-class and always block sending on every route (…); firm modules read the **live** state (BR-13).

L358:
> **Data flow.** Request received → register entry + audit entry. Consent captured or withdrawn → consent record + audit entry; firm modules read the current state at the moment of sending.

**(3) Proposed words.**

SA-11-29 gains: "*(changed — events)* A withdrawal SHALL emit a **consent-withdrawn** event (code name for the team), carrying the firm, the consent id and its purpose, never the subject's personal data; it is delivered once per change to firm modules, including the firm's automation engine."

§3.8 "Data flow" gains, after "consent record + audit entry": "→ consent-withdrawn event".

For the request: when an AG-13 task with the category Client request is created (Copy of my file, Delete my data and FD-20's review included), a **client-request-opened** event (code name for the team) carries the firm, the task id and the request kind, never the subject's personal data. Its home is AG-13, proposed in CN-AG-11 change 4 (f); nothing is added to SA-11-27.

**(4) Why.**
- Proposals row of 10 Oct (Owner's AI): its trigger events include "a data-subject request being opened" and "a consent record being withdrawn".
- AW-1-4; AW-1-106; AW-1-107.
- "One home per rule": an event lives in the change note of the module that owns the record (`00-step3-plan.md`). The consent record is SA-11's; the client's request is now AG-13's task (SA5-D58).

**(5) Knock-ons.**
- CN-AG-11 change 4 (AG-11-111 (e) and (f), the engine's trigger list; (f) re-pointed to the AG-13 task the same day) and change 5 (AG-11-112's on-demand run against a chosen client-request task).
- AG-10 BR-4 reads the same live consent state.

---

## 8. Document control

**(1) What it changes.** The document-control table (L4–L13).

**(2) Current words.** The last row is v2.7 of 2026-10-07.

**(3) Proposed words.** A version row (renumbered 13 Oct 2026; 2.8 to 2.10 are the team's; change 3 withdrawn): "| 2.11 | *(date placed)* | Workstream 2 change note CN-SA-11 applied: AI processing in Canada or the US only (SA-11-37, AIW-D147); AI provider named in the written data-location statement (SA-11-32); AI processing records retention category (interim values per AG-11-98, others Unknown); the audit fields of AG-13-68 on the platform audit chain, with the platform's empty firm; Restricted fields under FD-15; the consent-withdrawn event (FD-20's review, portability and the client-request event go to AG-13 and SA-05: changes 6 and 7). | AIW-D33, AIW-D52, AIW-D54, AIW-D58; FD-15, FD-20 |".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
