# A — Identity: who is the actor when automation or AI acts, and acting on behalf of a person

> Reference index. The source documents remain the only source of truth.

**What this is, in plain words.** Every action in the product is tied to a signed-in person (or to the system). The founders' decision FD-16 says AI is not a user of its own. Older Doc 3 text waits for a non-human principal (an identity that is not a person) that was never defined. This file lists what each source says about who the actor is when the engine or an AI acts, so the AI Worker design can follow the workstream decision AIW-D13 (AI Workers act on behalf of a named person; `ai-workers/decisions.md`, a workstream decision, not a product source).

**How to read the table.** Quotes are short, exact and identify the requirement; `…` marks words left out. L-numbers are lines in the snapshot file. Release: **None stated** unless shown.

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| FD-16 consequence | Consequence: AI is NOT a first-class actor — no AI principal in the identity spine, no autonomous permissions, no new plane. | FDL v1.5 FD-16, L52 | Resolved 2 Aug 2026 batch (FDL L44-46) | Doc 3 v1.4 rows below still wait for "non-human principals". AIW-D13 keeps FD-16. |
| Doc 3 AG-8 §3.11 | Staff entry is a human-principal action; a machine/AI actor entering answers is out of scope until the platform defines non-human principals | Doc 3 v1.4 AG-8 §3.11, L3623 | None stated | FD-16 rules out an AI principal, so the condition can never be met as written. |
| Doc 3 AG-8-35 | staff entry is human-principal-only (non-human principals pending Doc-1 Amendment A4-1 / F1). | Doc 3 v1.4 AG-8 §4, L3703 | None stated | — |
| Doc 3 AG-8 BR-17 | no silent impersonation; staff entry is human-principal-only (pending Doc-1 Amendment A4-1 / F1). | Doc 3 v1.4 AG-8 §5, L3728 | None stated | — |
| Doc 3 AG-11 §3.3a | the Conductor executes them under the platform's automation principal with run/definition attribution (pending Doc-1 Amendment A4-1 for the non-human principal model | Doc 3 v1.4 AG-11 §3.3a, L5194 | None stated | AG-11 v1.11 does not mention an automation principal. |
| Doc 3 AG-11 audit closure | Actor attribution for machine-executed guarded verbs follows the platform principal model — pending Doc-1 Amendment A4-1 | Doc 3 v1.4 AG-11 §13, L5640 | Pending | — |
| Doc 1 amendment A4 | AMENDS §5.4 — generalize the case-bound snapshot to a prospect-OR-case-scoped AnswerSnapshot | Doc 1 v1.3 Integration Amendments, L2990 | None stated | Doc 1's A4 is about answer snapshots; no amendment "A4-1" on non-human principals exists in Doc 1 v1.3. |
| Doc 1 §3 pools | three cryptographically-walled authentication pools (platform / firm-staff / client-portal) | Doc 1 v1.3 §3, L692 | None stated | No pool for an automation or AI identity. |
| Doc 1 AU-A4 context | Separate credential stores. Each pool's principals live in their own table — platform_user, firm_user, portal_credential — with no foreign key crossing pool boundaries. | Doc 1 v1.3 §3.1, L714 | None stated | — |
| Doc 1 AU-A6 | AuthCore.issueSession populates PrincipalContext with { pool, subjectId, firm_id?, sessionId } and never with a caller-supplied firm_id | Doc 1 v1.3 §3, L754 | None stated | No "acting for" field in the principal context. |
| SA-06 assignment | Assignment = a person holds a role by its template key: PlatformUserRole (platform staff) and FirmUserRole (firm staff, keyed by firm) | SA-06 v3.1 §3.0, L196 | None stated | Roles go to persons only. |
| SA-06 FirmUserRole | FirmUserRole (built, :173-183) — principalId, firmId, roleTemplateKey, createdAt | SA-06 v3.1 §7, L549 | Built | — |
| SA-06 API key plane | An API key counts as the FIRM plane (:361-365). | SA-06 v3.1 §3.7, L361 | Built | The only non-person caller named in SA-06. |
| SA-11 actor model | an explicit actorType ∈ {super_admin, firm_staff, client, system} | SA-11 v2.7 §3.0, L180 | None stated | No actor type for automation or AI; AI actions would be "system" or a person (Inferred). |
| SA-2-17 support session | Every action is tagged with the support person and session. | SA-02 v2.19 §4, L381 | None stated | Nearest existing pattern for acting inside a firm on someone's behalf (W1 inventory sa-frs §C, Inferred there). |
| SA2-D14 | Professional judgements are never made in a support session. | SA-02 v2.19 §0 SA2-D14, L61 | None stated | Inferred: a similar blocked list may be needed for AI Workers. |
| AG-11 §2 | The Conductor is mostly invisible — it works for every role without being operated by most of them. | AG-11 v1.11 §2, L219 | None stated | — |
| AG-11-45 role targets | Role-based targets (e.g. "Owner", "case officer of the case") SHALL resolve to the current holder when the action runs | AG-11 v1.11 §4, L628 | None stated | — |
| AG-11 ApprovalItem preparedBy | preparedBy? (the user excluded from approving under four-eyes … null only when an automation ran the Filler, AG-7-66) | AG-11 v1.11 §7, L877 | None stated | A Doer-prepared item has no human preparer; no field names who the automation acted for. |
| AG-11 §9 Filler no person | The Filler prepared the draft on its own → the Filler counts as no person, so any form approver may approve it (AG-11-81). | AG-11 v1.11 §9, L1095 | None stated | Inferred: under this rule an AI Worker preparing a form would also count as no person, letting the preparer's colleague or the same user approve. |
| Agent Phasing glossary Filler | A form it prepares on its own has no preparer; a human approves every form (AG-07). | Agent Phasing v1.4 Glossary, L69 | None stated | — |
| AG-13 AuditLog actor | entityType, entityId, entityName?, actorUserId, method?, path? | AG-13 v1.12 §7, L487 | None stated | Single actor field. |

## Gaps noticed

- **No source defines how an action taken by automation or AI for a named person is recorded.** FD-16 forbids an AI principal; Doc 3 waits for an A4-1 amendment that Doc 1 v1.3 does not contain; SA-11 has four actor types with no on-behalf-of field; AG-13 records `actorUserId` only; `AiRunLog` has no person field.
- **AG-11 v1.11 is silent on the actor of engine actions**, where Doc 3 v1.4 used "the platform's automation principal". Which wins is not stated (newer file is AG-11).
- **Items a Doer prepared with no human present have no preparer** (`preparedBy` null; Filler counts as no person). If an AI Worker acts for a named person, four-eyes and self-approval rules would need that person recorded as preparer. Inferred.
- **No rule lists actions an automated actor may never take** inside a firm, other than the AG-11 floors; the support-session blocked list (SA-2-17, SA2-D14) is the nearest precedent.
