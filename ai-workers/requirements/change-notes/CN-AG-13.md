# CN-AG-13: change note to AG-13 Tasks, Reminders, Notes and Activity / Audit

| Field | Value |
|---|---|
| Module changed | AG-13 Tasks, Reminders, Notes & Activity / Audit |
| Version and file | v1.12 of 7 Oct 2026, `02-functional-requirements/agent/AG-13-tasks-reminders-notes-and-activity-audit_v1.12_2026-10-07.md` (Drive snapshot of 9 Oct 2026; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-13-68, AG-13-69 (highest AG-13-67, L412); BR-22 (highest BR-21) |
| Companion files | CN-AG-07 item 1 (Restricted fields); CN-AG-11 items 3 and 7; AW-01 |

**In plain words.** Five changes. A task an AI assistant creates must never be linked to a government deadline, so ticking it by mistake can never mark the deadline met (founder-confirmed 11 Oct). Every audit entry says whether a person acted, an assistant acted for a named person, or a plain automation ran, and which delegation it was; the actor stays the named person. A note an assistant drafted carries an AI-drafted mark and stays internal. The audit log records reveals of Restricted fields again (FD-15 kept). And the time-tracking tool is called Clocker, not Timer (FD-8, as the founder amended it on 11 Oct).

---

## 1. A task an AI assistant creates never carries `sourceItemRef`

1. **Where.** §7 `Task.sourceItemRef?` (L481); AG-13-65 (L410); new rule **BR-22**.
2. **Current words.**
   > L481: "**`sourceItemRef?`** *(NEW v1.6 — link to the dated case item or Minder deadline that created the task; drives two-way completion, AG-13-65)*"
   >
   > L410: "**Completing in either place completes both:** completing the task completes the case item, and completing the item completes the task."
3. **Proposed words.**
   > **BR-22 (Assistant tasks never close a deadline).** A task created by an AI assistant (AW-01) SHALL NOT carry `sourceItemRef`, so completing it SHALL NOT complete a dated case item or a Minder deadline. It SHALL name its subject in plain reference text only (FD-14: reference-only tasks). Where the product already creates a task for the same item (AG-13-65, AG-13-66), the assistant SHALL reference that task and create none.

   `sourceItemRef?` description adds: "never set on a task an AI assistant created (BR-22)".
4. **Why.** AIW-D54 (the founder confirmed: "no assistant task can close a deadline"); `proposals.md` rule row of 10 Oct (Firm assistant: "A persona-created task never carries the task's link field `sourceItemRef` … completing it can never complete a dated case item or a Minder deadline", merged by the Lead for all seven documents); `firm-assistant.md` §9 G-21; `case-assistant.md` §9 G-33.
5. **Knock-ons.** AG-11 `create_task` from an assistant recipe leaves the field empty (CN-AG-11 item 9); AG-07 dated items unchanged.

## 2. Every audit entry records how the act was done and under which delegation

1. **Where.** §7 `AuditLog` (L487); new requirement **AG-13-68**.
2. **Current words.**
   > L487: "**`AuditLog`** *(exists; harden)* — `id`, `firm_id` *(today `clientId`)*, `category` (DATA_CHANGE/API_CALL/AUTH_EVENT/EXPORT *(changed v1.8 — AG7-D10: no PII_REVEAL or UNMASKED_EXPORT category)*), `action` (CREATE/UPDATE/DELETE/VIEW/EXPORT/… *(no REVEAL or EXPORT_UNMASKED action — AG7-D10)*), `entityType`, `entityId`, `entityName?`, `actorUserId`"
3. **Proposed words.**
   > **AG-13-68 (how an act was done).** Every audit entry SHALL record its `mode` — `PERSON` (a person acted directly), `DELEGATED` (an AI assistant acted for the named person, AW-01) or `AUTOMATION` (a plain firm automation ran) — and, for `DELEGATED`, the `delegationId` and the AI run that produced the act (`aiRunId?`). `actorUserId` SHALL stay the named person; no AI actor exists (FD-16). The audit viewer SHALL show the mode in plain words (for example "prepared by the Case assistant for <person>").

   `AuditLog` gains `mode`, `delegationId?`, `aiRunId?`.
4. **Why.** AIW-D33 (the founder: the delegation record is consistent with FD-16; no identity or permissions of its own); IMP-1 ("Each audit entry gains two things: whether a person acted directly, a worker acted for them, or a plain automation ran; and, if a worker, which delegation (developers: `mode = PERSON | DELEGATED | AUTOMATION`, `delegationId`)"); IMP-2; `proposals.md` row of 9 Oct (carve-out A, an on-behalf-of person on AuditLog). Behaviour: `case-assistant.md` §9 G-6.
5. **Knock-ons.** AG-11 `ApprovalItem`, `AiRunLog`, `AutomationRun` (CN-AG-11 item 7); BR-10 and BR-11 (append-only, hash chain) unchanged; AG-16-39 export carries the new fields (CN-AG-16 item 5); SA-11 actor kinds unchanged (Super Admin half).

## 3. A note an AI assistant drafted carries an AI-drafted mark and stays internal

1. **Where.** §7 `Note` (L485); BR-4 (L421); new requirement **AG-13-69**.
2. **Current words.**
   > L485: "**`Note`** *(exists; re-key + extend)* — `id`, `firm_id`, **`entityType`/`entityId`** *(polymorphic)*, `subject?`, `body` *(rich text/HTML, server-sanitised — today plain `note`)*, **`visibility`** *(NEW — `internal-only` (default) / `client-visible`)*"
3. **Proposed words.**
   > **AG-13-69 (AI-drafted notes).** A note whose text came from the Writer (created by AG-11's `create_note`, or accepted by a person from a Writer draft) SHALL carry the AI-drafted mark (`aiDrafted`) and the AI run and delegation it came from (`aiRunId?`, `delegationId?`), shown on the note. Such a note SHALL be created `internal-only`. Making it `client-visible` SHALL be treated as sending AI-written text to a client and SHALL need a person's approval under AG-11-53 and AG-11-88.
4. **Why.** `proposals.md` row of 10 Oct (Case assistant, item (2): "create an internal-only Note carrying the AI-drafted marker"); IMP-11 (the AI-written marker on every artefact); `case-assistant.md` §9 G-2; `firm-assistant.md` §9 G-2.
5. **Knock-ons.** AG-11 `create_note` (CN-AG-11 item 3); AG-04 consult notes use the same mark (CN-AG-04 item 1); the timeline shows the mark.

## 4. The audit log records reveals of Restricted fields (FD-15 kept)

1. **Where.** §7 `AuditLog.category` and `action` (L487); BR-12 (L429).
2. **Current words.**
   > L487: "`category` (DATA_CHANGE/API_CALL/AUTH_EVENT/EXPORT *(changed v1.8 — AG7-D10: no PII_REVEAL or UNMASKED_EXPORT category)*)"
   >
   > L429: "**BR-12 (An export is auditable).** *(changed v1.8 — AG7-D10)* Personal data is never masked."
3. **Proposed words.** `category` adds `PII_REVEAL`; `action` adds `REVEAL`. BR-12: "Restricted fields are masked by default, and every reveal writes a `PII_REVEAL` audit entry before the value is shown (AG7-D10 as amended, CN-AG-07 item 1; Doc 1 v1.3 §7.2). Other personal data is never masked. An export writes an audit event." The audit viewer masks Restricted values like every other surface.
4. **Why.** AIW-D58 (the founder: "Keep FD-15"); FD-15 ("masked audited reveal"); Doc 1 v1.3 §7.2 (L2064: "**Every reveal emits a `PII_REVEAL` audit event**"); README §0 rule 11. **Provisional until counsel reads it** (AIW-D64, AIW-D68).
5. **Knock-ons.** CN-AG-07 item 1.

## 5. The time-tracking tool is called Clocker

1. **Where.** §3.6 heading (L314); §4 heading "Timer — AG-13-50…" (L395); BR-1, BR-17 (L434); §6 (L473); the Visual Overview and §3.5 table; every place where "Timer" names the tool.
2. **Current words.**
   > L314: "#### 3.6 Timer (billable time) — a related-but-distinct Doer (brief)"
   >
   > L434: "**BR-17 (Timer is distinct).** Timer entries are effort/money records, separate from Tasks and from the Activity feed"
3. **Proposed words.** Read **Clocker** wherever "Timer" names the tool: "#### 3.6 Clocker (billable time) — a related-but-distinct Doer (brief)"; "**BR-17 (Clocker is distinct).** Clocker entries are effort/money records …". The technical entity name (`TimerEntry`) and the permission keys (`agent/time-entry:*`, owned by SA-06) may keep their names; that is the team's call.
4. **Why.** FD-8 (Founder Decisions Log v1.5 L33: "**Clocker** (time-tracking; not "Timer")"); AIW-D51 (the founder amended FD-8 on 11 Oct: "the time tool keeps the name *Clocker*"); README §0 rule 11; IMP-24(b) ("keep FD-8's name; fix AG-13").
5. **Knock-ons.** AG-06 (time-based invoices), AG-14-16 ("time logged"), the agent glossary; FD-8's other half (Minder and Reminder stay two tools) needs no change here, as AIW-D51 amended FD-8 to match this module.

---

## Not changed here (pointers only)

- Whether a Practice expert question also writes an audit row (`practice-expert.md` §9 G-13) is a decision for the team with no improvement or `proposals.md` row behind it; not written.
- A reminder an assistant created whose reason has gone is skipped at fire time (AG-13-14), as today (`firm-assistant.md` §9 G-20); no change.
