# A — Logging and audit of automation and AI: run history, model-call log, approval audit

> Reference index. The source documents remain the only source of truth.

**What this is, in plain words.** Three records exist side by side. The run history records what each automation did. The AI run log (`AiRunLog`) records every call to an AI model: which Doer, which model, which prompt version, which record, and the outcome. The audit log records who did what, including every approval, edit and rejection. This file carves out every requirement on those records, word for word, and shows that no single record yet says that the AI prepared an item and that a named person approved it (review W1, inventory X7).

**Scope of this file.** AG-11 v1.11 (run history, audit, `AiRunLog`, `ApprovalItem` audit, privacy and retention); AG-09, AG-10, AG-07, AG-08 provenance; AG-16 audit and export; AG-13 audit log; SA-11 audit actor model; SA-07; SCOPE-TRIAGE. Who the actor is when AI acts is covered in `A-identity-and-on-behalf.md`.

**How to read the table.** The exact-words column is copied from the source; `…` marks words left out; bold, italics and code marks are dropped. L-numbers are lines in the snapshot file.

**Release labels used below.** **R1-AG11** = AG-11 v1.11 §13 Phasing L1297 lists "run-history (§3.9)" in the minimal Conductor under Release 1. **R1-gate** = AG-11 v1.11 L1303 (AI Doers "ship built but switched off" until the provider terms are recorded). **None stated** = no release given. **Pending** = the source marks it pending.

## 1. Run history and audit of automation (AG-11)

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG-11-34 | Every run SHALL be recorded with status, rule log, per-action results + timings, errors, and repeat lineage (exists today as WorkflowExecution). | AG-11 v1.11 §4, L609 | R1-AG11 | — |
| AG-11-35 | The system SHALL provide a per-entity automation timeline (every automation that touched a case/prospect) and a firm-wide health view (success/failed/skipped/dead-lettered counts), both paginated and firm-scoped. | AG-11 v1.11 §4, L610 | R1-AG11 | SCOPE-TRIAGE L152 proposes moving "health dashboards" to Release 2. |
| AG-11 §3.9 timeline | Per-entity automation timeline. On a case/prospect, see every automation that touched it … — the audit-grade "what did the system do for this client" record. | AG-11 v1.11 §3.9, L446 | R1-AG11 | — |
| AG-11-43 | Authoring, enabling, simulating, manual-run, dead-letter retry, configuration changes, autonomy-level changes and every Needs you decision SHALL be audited (actor, target, before/after). | AG-11 v1.11 §4, L624 | None stated | — |
| AG-11-43 (cont.) | So SHALL every inline approval and every Team safeguards change (on, off with reason, part adjusted, automatic switch-on). | AG-11 v1.11 §4, L624 | None stated | — |
| AG-11-43 (AI) | every "approved by Owner without a licensed user", the AI switch-on acknowledgement, the "Review your standard messages" confirm and every template publish that affects an … | AG-11 v1.11 §4, L624 | None stated | — |
| AG-11-62 | Every decision SHALL be audited: who, when, the draft before and after any edit, and the rejection reason if given. | AG-11 v1.11 §4, L645 | R1-AG11 | — |
| AG-11-63 | Approved / edited / rejected counts SHALL be kept per recipe and per action and shown in the recipe's health view, so recipes can be … | AG-11 v1.11 §4, L646 | None stated | AG-14 defines no dashboard for these counts (W1 inventory ag-frs-2 AG-14 Part 3, Inferred). |
| AG-11 §7 inline audit | Inline approvals create no ApprovalItem; they write an AuditLog entry with the same decision fields (actor, rendering before/after, outcome). | AG-11 v1.11 §7, L877 | None stated | AG-13 AuditLog fields (L487) have no "rendering" or "outcome" field named. |
| AG-11 §7 approval flags | requiresLicensedApprover (bool — supervised message or AI-written client text), approvedWithoutLicensedUser (bool — Owner approval, AG11-D11(d)), verifiesValue (bool — a Reader value whose approval verifies it) | AG-11 v1.11 §7, L877 | None stated | — |
| AG-11 §11 PII | no PII in logs/traces (today's logs include entityData in execution records — the rebuild must redact PII from persisted run logs). | AG-11 v1.11 §11, L1174 | None stated | — |
| AG-11 §12 PII today | Run logs persist entityData (PII risk). Redaction of PII from persisted run logs is NEW. | AG-11 v1.11 §12, L1220 | n/a (fact about code) | — |

## 2. The AI run log (model-call log)

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG11-D4 (logging) | every model call logged with model and prompt version; client data never used to train models. | AG-11 v1.11 §0 AG11-D4, L33 | R1-gate | — |
| AG-11 §3.10 model-call audit | Model-call audit. Every model call is logged: which Doer, which model, which prompt version, which firm and record, when, and the outcome — so any … | AG-11 v1.11 §3.10, L465 | R1-gate | — |
| AG-11-72 | Every model call SHALL be logged with the Doer, model, prompt version, firm, record, time and outcome, so any AI proposal can be traced (retention … | AG-11 v1.11 §4, L659 | R1-gate | SA-11 v2.7 has no AI log category or retention row (Pending, AG-11 §0.2 L54). |
| AG-11 BR-25 | Every model call is logged with Doer, model and prompt version; client data is never used to train models. | AG-11 v1.11 §5, L754 | None stated | — |
| AG-11 §7 AiRunLog | AiRunLog (NEW v1.8 — AG11-D4) — id, firm_id, doer (READER/SORTER/DRAFTER/CHECKER), model, promptVersion, entityRef, runId?, actionId?, inputRef (reference to the document/message, not a copy), outputRef, confidence? | AG-11 v1.11 §7, L878 | R1-gate | No field records the approver or the person on whose behalf the call was made (see Gaps). |
| AG-11 §7 AiRunLog (cont.) | outcome (OK/UNREADABLE/PROVIDER_ERROR/DISABLED), latencyMs, createdAt. Append-only; PII held by reference, not copied into the log; retention interim 1 year, pending SA-11. | AG-11 v1.11 §7, L878 | Pending (SA-11) | — |
| AG-11-98 | ApprovalItem previews and proposed values SHALL be stored encrypted or by reference. For a Restricted field, audit before/after SHALL record the field key and a … | AG-11 v1.11 §4, L712 | None stated | — |
| AG-11-98 (retention) | Interim retention, pending SA-11: ApprovalItem 2 years after its decision; AiRunLog 1 year. | AG-11 v1.11 §4, L712 | Pending (SA-11) | SA-11 v2.7 SA7-X5 (L28) keeps Expat Ready staff audit entries at least 7 years; AiRunLog 1 year. Retention values: confirm with counsel. |
| AG-11-98 (storage) | ApprovalItem, AiRunLog, the reference to FirmTeamSafeguards and the firm AI settings SHALL live in Postgres with row-level security enabled and forced | AG-11 v1.11 §4, L712 | None stated | — |
| AG-11 §0.2 SA-11 | AI processing in data governance; the no-training rule; retention of the model-call audit log (interim 1 year) and of approval items (interim 2 years after … | AG-11 v1.11 §0.2, L54 | Pending | — |
| AG-9-48 | Every Reader model call SHALL be logged with model and prompt version; the log SHALL carry no file content or extracted values (BR-9). Client documents … | AG-09 v1.8 §4, L545 | None stated | AiRunLog keeps an outputRef (reference), consistent with the no-extracted-values rule only if the reference is not the value (Inferred). |
| AG-09 §3.14 private | No file content or extracted value appears in logs (BR-9). | AG-09 v1.8 §3.14, L454 | None stated | — |
| AG-09 DocumentExtraction | decidedByUserId?, decidedAt?, modelId, promptVersion, createdAt. | AG-09 v1.8 §7, L630 | None stated | Second place that stores model and prompt version per Reader proposal. |
| AG-10-48 | Every Sorter and Drafter model call SHALL be logged with the model and prompt version; client data SHALL NOT be used to train models. | AG-10 v1.9 §4, L434 | None stated | — |
| AG-10 SorterResult | provenance (which signals matched, and whether a deterministic signal backed the match — an AI-only match never files, AG11-D13) | AG-10 v1.9 §7, L546 | None stated | SorterResult also stores modelId and promptVersion (same line). |
| AG-10 Communication | aiGenerated (boolean; true forces APPROVE) | AG-10 v1.9 §7, L545 | None stated | Records that a message was AI-written on the message itself. |
| AG-10-46 (audit) | The approval, edit or rejection SHALL be audited (actor, time, before/after). | AG-10 v1.9 §4, L432 | None stated | — |
| AG-7-61 (logging) | Every Checker model call SHALL be logged with model and prompt version (AG11-D4). | AG-07 v2.7 §4, L689 | None stated | — |

## 3. Provenance on values, firm audit and export

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG-8-25 | Every fact SHALL carry source (self-declared/staff-entered/document-verified, and — v1.4 — Reader-proposed-and-approved or imported), timestamp, locale, and response version. | AG-08 v1.7 §4, L389 | None stated | — |
| AG-08 AnswerProvenance | source (SELF_DECLARED/STAFF/STAFF_ON_BEHALF/DOC_VERIFIED/READER_APPROVED/IMPORT | AG-08 v1.7 §7, L507 | None stated | READER_APPROVED records the human approver with the Reader proposal; no equivalent for Drafter text in the audit log. |
| AG-16-29 | All sensitive actions (connection connect/disconnect/verify, AI Doers switch and its acknowledgement, change of a recipe's client-message autonomy, the setting for who may approve AI-written client … | AG-16 v1.12 §4, L459 | None stated | — |
| AG-16-29 (cont.) | an Owner approval made without a licensed user, Team safeguards switch or part, automatic turn-on of Team safeguards | AG-16 v1.12 §4, L459 | None stated | — |
| AG-16-39 | The firm-data export scope (§3.5) SHALL include the Needs-you approval history (proposed action, approver, edit or rejection, timestamp, before/after) | AG-16 v1.12 §4, L473 | None stated | AiRunLog is not in the export scope (Inferred from this line). |
| AG-13 AuditLog | entityType, entityId, entityName?, actorUserId, method?, path? | AG-13 v1.12 §7, L487 | None stated | Actor is a user ID only; no actor type and no "on behalf of" field. |
| SA-11-2 | Each entry SHALL contain: auditLogId (UUID), timestamp (UTC, millisecond precision), actor (user id + display name), actorType ∈ {super_admin, firm_staff, client, system}, tenantId (firm id; … | SA-11 v2.7 §4, L348 | None stated | No AI or "automation" actor type; see A-identity-and-on-behalf.md. |
| SA-11 BR-3 | Every entry has a non-null actorType. System actions are system; impersonated actions are super_admin with impersonated context; never inferred from a null userId. | SA-11 v2.7 §5, L400 | None stated | — |
| SA-11 §1 hash chain | hash-chained so any retroactive edit or deletion breaks the chain and is detectable | SA-11 v2.7 §1, L136 | None stated | SCOPE-TRIAGE L174 proposes moving "Tamper-evident hash chain + verifier" to Release 2 (review W1 M-3). |
| SA-7-3 | Every audit record of a staff action identifies the actor as Expat Ready staff from the sign-in group itself, with the person's id and name. | SA-07 v2.10 §4, L409 | None stated | Staff side only; no AI actor. |
| SCOPE-TRIAGE AG-13 | Tamper-evident hash chain + verifier | SCOPE-TRIAGE 2026-10-05 AG-13, L174 | Proposed to move (not scope) | — |

## Gaps noticed

- **No single record joins the AI preparation and the human approval.** `AiRunLog` (L878) records the Doer, model, prompt version and record but no approver and no "on behalf of" person; the approval is in `ApprovalItem` / AuditLog (L877) or, for inline approval, only in the AuditLog. A link exists only indirectly through `runId` / `actionId` (both optional). AG-13's AuditLog records `actorUserId` only (L487). Recorded as W1 inventory X7.
- **SA-11 has nothing on AI yet.** No AI processing category, no `AiRunLog` retention, no AI actor type; AG-11 §0.2 (L54) lists all of this as Pending. Interim values (AiRunLog 1 year, ApprovalItem 2 years after decision) are AG-11's own and conflict with nothing written yet in SA-11; retention values: confirm with counsel.
- **Model and prompt version are stored in three places** (`AiRunLog`, `DocumentExtraction` L630, `SorterResult` L546) with no rule on which is authoritative.
- **No requirement covers prompt management**: where prompt versions live, who may change them, how a change is reviewed. AG-11 §11 (L1180) only says prompts "are versioned and logged".
- **The tamper-evident audit chain may move to Release 2** (SCOPE-TRIAGE L174, a proposal), which matters for any claim that AI actions are recorded in a tamper-evident way.
- **No dashboard or report for AI** (approval rates, rejection reasons, provider errors) is specified; AG-11-63 counts exist only in a recipe's health view. Inferred: AG-14 has no AI or Doer metric.
- **`AiRunLog` is not in the firm-data export** (AG-16-39 lists the approval history and import reports only). Inferred from the export scope line.
