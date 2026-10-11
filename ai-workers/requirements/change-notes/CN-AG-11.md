# CN-AG-11: change note to AG-11 Automation (Conductor and Doers)

| Field | Value |
|---|---|
| Module changed | AG-11 Automation — Conductor & Doers |
| Version and file | v1.12 of 10 Oct 2026, `02-functional-requirements/agent/AG-11-automation_v1.12_2026-10-10.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (fix round after review S3c; re-based on the 11 Oct snapshot) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-11-109 to AG-11-114 (the module's highest is AG-11-108, L725); BR-42 (highest BR-41, L771) |
| One home | This note is the **one home of the engine's data model** for the AI assistants: actions, events, run targets, `ApprovalItem` kinds and fields, `AiRunLog`, `AutomationRun`, `AutomationRecipe`, `AutomationDefinition` and the double-run key (`00-step3-plan.md`, "One home per rule"). The assistants' behaviour lives in AW-01 v0.1 (firm) and AW-02 v0.1 (platform), which cite these IDs; where the two differ, this note wins and AW is corrected. |
| Companion files | CN-AG-03, -05, -06, -07, -09, -10, -12, -13, -16, -18 |

**In plain words.** AG-11 is the engine that runs automations and the product's small tools (Doers). The founder's decisions of 11 Oct and the Step 2 reviews found that the engine lacks a few verbs, events and approval-item kinds the AI assistants need, still calls the AI writing tool "Drafter" (now *Writer*), has no field that says which named person an AI assistant worked for, and has no way to tell that a seed already did what an assistant is about to do. This note adds exactly those, and nothing that a decision, an improvement (IMP) or a `proposals.md` row does not already call for.

**What the team changed on 10 Oct (v1.12), and what it means here.** The four AI Doers are now one sellable extra with one firm switch (AG-16-35; SA-03 v2.17 feature catalogue row 30, L345), and volumes are not plan limits (§0.2 SA-03 row, L57). This note adds no plan feature: anything per assistant is a firm setting under Advanced (CN-AG-16 item 4). Nothing in this note was already made by the team.

**Terms used.** *AI assistant*: an assistant to a named person's role, working under that person's *delegation* (a record of which assistant works for whom, with a subset of that person's permissions; AW-01 §7 `Delegation`); it has no identity and no permission of its own (FD-16; AIW-D13, D33, D36). *Writer*: the AI Doer that drafts text for a person to approve (AIW-D53); *Drafter* stays the template engine (AG-05, AG-09, AG-12). *Needs you*: the approval inbox (§3.13). *Item kind*: the value of `ApprovalItem.itemType`. *Idempotent*: doing the same thing twice has the effect of doing it once. *Standard Conductor envelope*: the fixed wrapper every trigger event uses (module, event type, record, firm, time). *Delimited data*: client content handed to a model fenced off as text to read, never as instructions.

---

## 1. Rename the AI Doer "Drafter" to "Writer"; the run-log value `DRAFTER` becomes `WRITER`

1. **Where.** AG11-D4 (L34); §3.0 (L250); §3.10 (L470); AG-11-2 (L554); AG-11-68 (L656); AG-11-88 (L693); BR-35 (L765); §7 `AutomationAction.messageOrigin` note (L871), `ApprovalItem.sourceDoer` (L878) and `AiRunLog.doer` (L879).
2. **Current words** (word for word):
   > L34: "**Drafter** (AG-10's AI-assist drafter, callable by any recipe; never promises an outcome)"
   >
   > L250: "**Drafter** — AG-10's AI-assist drafter, now a Doer any recipe can call to prepare a message. It never promises an immigration outcome (BR-9)."
   >
   > L470: "**No outcome promises.** Drafter output is bound by BR-9 like every other message."
   >
   > L554: "**Drafter** (`draft_message`)"
   >
   > L656: "The **Drafter** (AG-10's AI-assist drafter) SHALL be callable by any recipe to prepare a message."
   >
   > L693: "Drafter output sent unedited SHALL count as AI-written text."
   >
   > L765: "AI-written client text, including Drafter output sent unedited, is approved by a licensed user"
   >
   > L878: "`sourceDoer` (Mailer/Drafter/Reader/Sorter/Filler/…)"
   >
   > L879: "`doer` (READER/SORTER/DRAFTER/CHECKER)"
3. **Proposed words.** In every place where "Drafter" names the AI Doer, read **Writer**: "**Writer** (AG-10's AI-assist writer, callable by any recipe; never promises an outcome)"; "The **Writer** (AG-10's AI-assist writer) SHALL be callable by any recipe to prepare a message"; "Writer output sent unedited SHALL count as AI-written text"; `sourceDoer` (Mailer/Writer/Reader/Sorter/Filler/…); `doer` (READER/SORTER/**WRITER**/CHECKER). The action name `draft_message` is unchanged. Add one sentence to §3.0: "*Drafter* names only the template engine that renders firm templates (AG-05, AG-09, AG-12); the AI Doer that drafts text for a person to approve is the *Writer* (founder decision AIW-D53)."
4. **Why.** AIW-D53 (the founder, 11 Oct: "The AI Doer that drafts messages and letters for a person to approve is named **Writer** … *Drafter* stays the template engine"); AIW-D51 (FD-8 amended so *Drafter* stays the template tool); `proposals.md` row of 11 Oct (Lead, "`DRAFTER` … becomes `WRITER`"); IMP-24(c).
5. **Knock-ons.** Same rename in AG-02 (CN-AG-02 item 2), AG-07 (CN-AG-07 item 7), AG-10 (CN-AG-10 item 3) and AG-16 (CN-AG-16 item 6), and in the agent glossary `99-Phasing-and-Glossary_v1.4` (not an AG module; for the team). SA-03 v2.17 catalogue row 30 (L345) also says "Reader, Sorter, Drafter, Checker" (Super Admin half). AW-01 v0.1 §7 (`doer` "keeps … DRAFTER") and AW-1-64 follow this note. AG-05, AG-09 and AG-12, where Drafter is the template engine, are **not** changed. Existing log rows written with `DRAFTER` need a one-time mapping (the team's call).

## 2. The Sorter hands each attachment to the Reader, which proposes the document type

1. **Where.** AG11-D4 (L34); §3.0 (L249); AG-11-67 (L655).
2. **Current words.**
   > L34: "**Sorter** (classifies inbound email / portal / WhatsApp messages, matches them to the right file, files attachments to AG-9 with a document type; low confidence → Unmatched inbox and Needs you)"
   >
   > L655: "The **Sorter** SHALL classify inbound email, portal and WhatsApp messages, match each to the right file beyond header/reply-token matching, and file attachments to AG-9 with a document type."
3. **Proposed words.** L34: "**Sorter** (classifies inbound email / portal / WhatsApp messages, matches them to the right file, files attachments to AG-9 and hands each to the **Reader**, which proposes the document type; low confidence → Unmatched inbox and Needs you)". AG-11-67: "The **Sorter** SHALL classify inbound email, portal and WhatsApp messages, match each to the right file beyond header/reply-token matching, and file attachments to AG-9; it SHALL hand every attachment to the Reader, which SHALL propose its document type (AG-11-66, AG-9-42). The Sorter SHALL NOT propose a document type." The same in §3.0 L249.
4. **Why.** IMP-12 (one owner for one decision), relied on by `design/behaviours/case-assistant.md` §2.3 step 4 ("the Reader proposes the document type, not the Sorter"); AG-10 v1.10 §13 Q12 (L815) already records the team's decision: "the Reader — not the Sorter — classifies documents".
5. **Knock-ons.** AG-10-37(c) (CN-AG-10 item 2); the agent glossary entry for the Sorter.

## 3. Extend the closed list of actions (six new actions)

1. **Where.** AG-11-2 (L554) and §3.3 (L302); new requirement **AG-11-109**.
2. **Current words.**
   > L554: "The Conductor SHALL dispatch to in-house **Doers**: Mailer (`send_mail`), Messenger (`send_message`), Notification (`send_notification`), Reminder (`create_reminder`/`send_reminder`), Tasker (`create_task`), and module verbs (`change_stage` for prospects only, `assign`), plus the **Minder** (`arm_minder`) and the AI Doers"
   >
   > L302: "**`draft_message`** (Drafter — prepare a message; always followed by a send action whose autonomy is at least `APPROVE`)"
3. **Proposed words.** New requirement:
   > **AG-11-109 (actions an AI assistant's recipe needs).** In addition to AG-11-2, the Conductor SHALL dispatch these actions, each carrying an autonomy level (AG-11-51) and each subject to the floors (AG-11-53):
   > (a) **`run_filler`** — run the Filler on one form of a case to prepare a draft; the result is a government-form draft at the `APPROVE` floor (`FORM_DRAFT`, AG-11-60); the Filler stays rule-based and outside the AI switch (AG-07 BR-7 as changed by CN-AG-07 item 7). This action SHALL NOT be available until the form-filling route of AG-07 §13 item 25 exists (AIW-D43).
   > (b) **`create_note`** — create an internal-only Note on a record (AG-13); where its text came from the Writer it SHALL carry the AI-drafted mark (AG-13-69, CN-AG-13 item 3). Default `AUTO` (internal action, AG-11-52); this action SHALL never make a note client-visible.
   > (c) **`propose_milestone`** — prepare a proposed milestone line for a case (item kind `MILESTONE_LINE`, AG-11-112); it SHALL NOT record a milestone, submission or decision (AG-11-16); a person records it under `agent/case:milestone-record`.
   > (d) **`propose_key_date`** — prepare a proposed key date for a file, found by a rule or read by the Reader (item kind `KEY_DATE`); the date SHALL be registered with the Minder only after a person approves it under AG-9-51's rule.
   > (e) **`draft_structured`** — the Writer drafts structured content (for example an import mapping, AG-18) into a proposal record; it SHALL NOT be followed by a send; its output SHALL be checked against the fixed expected shape of its content kind before any person sees it, as all AI output already is (§11, L1181: "AI output is untrusted input — schema-validated, never executed").
   > (f) **`read_text`** — the Reader reads the text of a message or of an imported note, passed as delimited data (AG-11-94), and proposes values (a profile value a person accepts but which stays unverified, AG-08 as changed by CN-AG-08 item 1; or a key date, (d) above); the run-log `doer` is READER; it SHALL propose values only, never an action, a recipient, an address or a permission.
   > No other action exists. No action creates or edits an invoice, records a payment, approves, signs, submits to an authority, or sends AI-written text to a client without a person's approval (AG-11-53, AG-11-54; the hard limits of AW-01, provisional until counsel reads them, AIW-D55).

   In §3.3, `draft_message` keeps its rule ("always followed by a send action whose autonomy is at least `APPROVE`"); structured content uses `draft_structured`.
4. **Why.** `proposals.md` row of 10 Oct (Case assistant, closed action set: run the Filler, internal-only Note, proposed milestone line), extended by the Pack author's row of 10 Oct (structured content, never followed by a send, "checked against a fixed expected shape per content kind") and the Firm assistant's row of 10 Oct (Reader on a stored note's text; structured mapping proposals; proposed key date); the Intake assistant's row of 10 Oct, item (3) ("no action proposes values from message text"); IMP-10 ("the fixed menu of actions the engine already knows (AG-11-2, extended as needed)"); AIW-D43 (no form filling until the route exists). Behaviour: AW-1-4 (AW-01 v0.1); `case-assistant.md` §9 G-1 to G-3; `firm-assistant.md` §9 G-2 to G-4; `intake-assistant.md` §9 GI-3.
5. **Knock-ons.** AG-07 (`run_filler` drafts follow AG-7-59; preparer per CN-AG-07 item 5); AG-13 (CN-AG-13 item 3); AG-08 (CN-AG-08 item 1); AG-09 (CN-AG-09 item 4); AG-18 (CN-AG-18 items 1 and 2); no new permission key: each action is approved under the key the same act needs by hand (AG-11-58). The platform plane's own structured content (pack rows, box-map lines) is AW-02's.

## 4. Add the missing trigger events

1. **Where.** AG-11-4 (L558); §3.1 (L261); new requirement **AG-11-110**.
2. **Current words.**
   > L558: "The Conductor SHALL support **entity-event** triggers across all business modules, with the vocabulary extended to first-class events: `prospect.created`, `prospect.stage_changed` (with `from`/`to`), `case.milestone_reached`, `document.received`, `document.verified`, `invoice.paid`, `envelope.signed`, `deadline.approaching` — in addition to today's `CREATED/UPDATED/EDITED/DELETED/STATUS_CHANGED/ASSIGNED/ARCHIVED/RESTORED`."
3. **Proposed words.**
   > **AG-11-110 (further first-class events).** The trigger vocabulary SHALL also include, with the same envelope, idempotency key and pack-awareness as every other trigger (AG-11-74): (a) the billing events AG-06 already emits — `invoice.issued`, `invoice.partially_paid`, `invoice.overdue`, `invoice.refunded` and `installment.due` (AG-6-35); (b) `case.submitted` and `case.decided` (listed in AG-07 v2.7 §3.9); (c) `appointment.scheduled`, `appointment.rescheduled`, `appointment.cancelled`, `appointment.no_show` and `appointment.completed` (AG-4-47); (d) an assessment created (AG-03, CN-AG-03 item 3); (e) a consent record withdrawn (AG-10 BR-4); (f) a data-subject request opened (the register of SA-11-27; CP-8-15); (g) a Minder watch changing state (`ARMED`, `ESCALATING`, `SATISFIED`, `BREACHED`, §6); (h) an import batch ready for mapping (AG-18, CN-AG-18 item 3); (i) `retainer.ended` (AG-05, CN-AG-05 item 4). Names in (d) to (h) are proposals; the team names them.
4. **Why.** `proposals.md` rows of 10 Oct: Billing assistant ("AG-11-4's trigger vocabulary carries only `invoice.paid`"; `case.submitted`), Intake assistant items (1) and (5) (no assessment event; the five `appointment.*` events "Merge … into one Conductor-vocabulary change note to AG-11"), Firm assistant events row (Minder state change, import batch, data-subject request, consent withdrawn, `case.decided`); `case-assistant.md` §9 G-22 and IMP-35 (`retainer.ended` as a stop condition). Behaviour: `billing-assistant.md` §9 G-3; `intake-assistant.md` §9 GI-1, GI-18; `firm-assistant.md` §9 G-17.
5. **Knock-ons.** Emitters: AG-03 (CN-AG-03 item 3), AG-05 (CN-AG-05 item 4), AG-18 (CN-AG-18 item 3); AG-04, AG-06 and AG-07 already name their events. **Open:** the emitters of (e) and (f) are SA-11's consent and data-subject registers, and no SA-11 change note yet adds them (raised to the Lead). Whether today's generic `UPDATED` event would carry a person's link in the Unmatched inbox stays Unknown (Billing row, item 4).

## 5. Two run targets: a firm-level scheduled run, and an on-demand run against a batch or a request

1. **Where.** AG-11-5 (L559); AG-11-7 (L561); new requirement **AG-11-111**.
2. **Current words.**
   > L559: "The Conductor SHALL support **scheduled** triggers (daily / every-N-days / weekly / monthly / yearly / custom cron) that scan matching entities and enqueue a run per match"
   >
   > L561: "The Conductor SHALL support **manual / on-demand** runs of an automation against a chosen entity, permissioned and audited."
3. **Proposed words.**
   > **AG-11-111 (firm-level and batch or request targets).** A scheduled trigger MAY target the firm itself, with no entity to scan: one run per firm per occurrence, timezone-aware (AG-11-40). An on-demand run (AG-11-7) MAY be started against a chosen import batch (AG-18) or a chosen data-subject request (SA-11), permissioned and audited like any manual run (BR-17).
4. **Why.** `proposals.md` Firm assistant events row of 10 Oct ("a firm-level scheduled run with no entity to scan"; "an on-demand run against a batch"; "an on-demand run against a request"); `firm-assistant.md` §9 G-17.
5. **Knock-ons.** §7 `AutomationTrigger` gains the firm target; §3.1 entity list (L261) gains the batch and request targets for manual runs.

## 6. Approval items: the one list of new kinds and fields

1. **Where.** §7 `ApprovalItem` (L878); AG-11-60 (L644); §6 approval rows (L856); new requirement **AG-11-112**.
2. **Current words.**
   > L878: "`itemType` (CLIENT_MESSAGE/AI_DRAFT/PROFILE_VALUE/SORTER_MATCH/FORM_DRAFT)"
   >
   > L878: "`rejectReason?`, `cancelReason?`, `createdAt`"
   >
   > L644: "Needs you SHALL hold only (a) work a Doer prepared with no human present — client messages from recipes at `APPROVE` (including seed messages waiting for AG-11-91), Drafter drafts from recipes, Reader-extracted values on client uploads, Sorter matches on inbound messages below the confidence threshold or made only by the AI (AG-11-94), Filler form drafts prepared by an automation"
3. **Proposed words.** `ApprovalItem` changes (this is the one list; AW-01 §7 cites it):

   | Change | Value | Basis |
   |---|---|---|
   | `itemType` adds | `READINESS_REPORT` | AIW-D54; IMP-34; `case-assistant.md` G-4 |
   | | `UPLOAD_VERDICT` (one combined item for an upload: document status and any Binder act) | `case-assistant.md` G-10, G-29; `proposals.md` row of 10 Oct (two document keys, "a combined verdict item checks both") |
   | | `DOCUMENT_TYPE` | AIW-D71; `case-assistant.md` G-32 |
   | | `LMIA_ENTRY` (an AI-proposed advertising-channel or candidate-log entry) | AIW-D34 item 10; `proposals.md` row of 9 Oct (W-13 may propose, never rank); `case-assistant.md` G-15 |
   | | `STAGE_MOVE` (a proposed lead stage move) | `intake-assistant.md` GI-4, GI-22; AG-11-16 |
   | | `INTERNAL_NOTE_DRAFT` | `intake-assistant.md` GI-4; `proposals.md` row of 10 Oct (Case assistant, item (2)) |
   | | `INVOICE_PROPOSAL`, `PAYMENT_MATCH` | AIW-D44, D54; `proposals.md` row of 10 Oct (Billing assistant) |
   | | `IMPORT_MAPPING`, `KEY_DATE` | `proposals.md` row of 10 Oct (Firm assistant) |
   | | `MILESTONE_LINE` | `proposals.md` row of 10 Oct (Case assistant, item (3)) |
   | New fields | `delegationId?`, `personaRunId?` (AW-01 `PersonaRun`), `aiRunIds[]` | IMP-1, IMP-2(b); AIW-D33 |
   | | `fromClientContent` (bool: proposed values came from client content) | IMP-26 rule 6 |
   | | `lines[]` for `READINESS_REPORT` and letter items: `lineId`, `lineType` (VALUE / FINDING / SEND / PASSED_WARNING / MILESTONE / AI_SUMMARY), `ref`, `decision` (PENDING / APPROVED / REJECTED), `rejectReason?` | IMP-34 |
   | | `approverCredentialLinked?` (bool, at decision), `aiTextApproverSettingAtDecision?`, `ownerRouteWording?` | IMP-17(a) |
   | | `holdoutFieldRefs[]`, `holdoutResult?` (matched / shown) | AIW-D57 (provisional until counsel) |
   | | `stopMarker?` (`AI_PAUSED_PLATFORM_STOP`, `AI_PAUSED_SWITCH_OFF`), beside the existing `clientPaused` | `00-step3-plan.md` emergency-stop rule |
   | `cancelReason` gains | `DELEGATION_ENDED` | `00-step3-plan.md` waiting-items rule |
   | `preparedBy` | the delegating person when an assistant prepared the item (item 7) | AIW-D33 |

   New requirement:
   > **AG-11-112 (what the new item kinds do when approved).** (a) `READINESS_REPORT` and `UPLOAD_VERDICT` hold their lines in `lines[]`; each line is approvable, approvable in a batch or rejectable with a reason; the item keeps AG-11-61's stale and changed-since-seen checks. (b) Approving an `INVOICE_PROPOSAL` or a `PAYMENT_MATCH` SHALL only open AG-06's own invoice builder or Record payment modal pre-filled for the approver and SHALL save nothing (AG-6-44, AG-6-45 as proposed in CN-AG-06). (c) Approving a `KEY_DATE` follows AG-9-51's rule and then registers the date with the Minder (AG-11-47). (d) Approving a `MILESTONE_LINE` opens the milestone record for a person under `agent/case:milestone-record`; approving a `STAGE_MOVE` moves the lead through AG-02's guarded stage service under `agent/prospect:edit`; an `LMIA_ENTRY` is accepted under `agent/case:edit`; an `IMPORT_MAPPING` is confirmed in AG-18's mapping screen under `agent/import:run`. (e) While `stopMarker` is set, approving SHALL be refused, as for `clientPaused` (AG-11-101); when the stop is released every such item SHALL be re-rendered and flagged stale (AG-11-61) and needs a fresh approval. (f) When a delegation ends (its person ends it, or the person is deactivated or suspended), every item it prepared that is still pending SHALL be cancelled with `cancelReason = DELEGATION_ENDED` (AG-11-61) and stays visible in the audit.
   >
   > AG-11-60(a) adds these kinds to the work Needs you holds.

   Who each item goes to, what the approver sees and what the approval record holds are the assistants' behaviour and live in AW-01 (AW-1-20, AW-1-26, AW-1-29 to AW-1-32); the approve-all safeguards are AW-1-33.
4. **Why.** As in the Basis column; plus `00-step3-plan.md` shared rules of 11 Oct ("One home per rule"; "Waiting items, one rule per stop reason"; "Emergency stop (one rule, all documents)"). Behaviour documents: `case-assistant.md` §9 G-4, G-10, G-15, G-25, G-32; `billing-assistant.md` §9 G-1, G-2; `firm-assistant.md` §9 G-3, G-4; `intake-assistant.md` §9 GI-4.
5. **Knock-ons.** §6 transition rows for the new kinds and for `stopMarker`; AW-01 §7 is corrected to this list (its `PROPOSED_PAYMENT_MATCH` and `PROPOSED_INVOICE` become `PAYMENT_MATCH` and `INVOICE_PROPOSAL`; it adds `MILESTONE_LINE`); CN-AG-02, CN-AG-06, CN-AG-09, CN-AG-17 and CN-AG-18 point here; AG-14 measures count the kinds (CN-AG-14 item 2); the platform recall action is SA-12-32 (Super Admin half).

## 7. Record which named person an AI assistant worked for

1. **Where.** §7 `ApprovalItem` (L878, `preparedBy?`), `AiRunLog` (L879), `AutomationRun` (L872); AG-11-81 (L681); new requirement **AG-11-113**.
2. **Current words.**
   > L878: "`preparedBy?` (the user excluded from approving under four-eyes — the person who created the draft or edited it before sending it for approval; null only when an automation ran the Filler, AG-7-66)"
   >
   > L879: "**`AiRunLog`** *(NEW v1.8 — AG11-D4)* — `id`, `firm_id`, `doer` (READER/SORTER/DRAFTER/CHECKER), `model`, `promptVersion`, `entityRef`, `runId?`, `actionId?`, `inputRef` (reference to the document/message, not a copy), `outputRef`, `confidence?`, `outcome` (OK/UNREADABLE/PROVIDER_ERROR/DISABLED), `latencyMs`, `createdAt`."
   >
   > L681: "The Filler SHALL count as no person, so a draft the Filler prepared on its own MAY be approved by any form approver."
3. **Proposed words.**
   > **AG-11-113 (delegation and provenance on every AI-assistant record).** `AutomationRun` adds `delegationId?`, `personaRunId?` and `startedBy?` (what started the run: the persona's schedule, a person, a product alert, a watcher item). `AiRunLog` adds `delegationId?` and `personaRunId?` (both required when an assistant made the call), `approvalItemId?`, `auditLogId?` and `questionRecordId?` (the Practice expert's question record, AW-01 §7); `runId` becomes required when an assistant made the call; `outcome` adds `DROPPED_FAILED_CHECK` (output discarded because it failed its check). For an item an assistant prepared, `ApprovalItem.preparedBy` SHALL be the person the assistant worked for, who counts as the preparer for four-eyes (AG-11-81); it stays null only when a plain firm automation with no delegation ran the Filler. No AI identity is added: every audit entry names the delegating person as actor (FD-16; AG-13-68 as proposed in CN-AG-13).

   AG-11-81, last sentence: "A plain firm automation with no delegation SHALL count as no person, so a draft it prepared MAY be approved by any form approver; a draft an AI assistant prepared counts as prepared by the person it worked for (AG-11-113)."
4. **Why.** AIW-D33 (the founder: a delegation record is consistent with FD-16, "the named person the persona worked for counts as the preparer for four-eyes"); IMP-1; IMP-2(a), (b); `00-step3-plan.md` actor rule ("a separate *started by* field records what started the run"); `proposals.md` rows of 9 Oct (carve-out A, "an on-behalf-of person on AuditLog, AiRunLog and ApprovalItem") and of 10 Oct (Practice expert, outcome value and question-record link). Behaviour: AW-1-21, AW-1-22 (AW-01 v0.1); `case-assistant.md` §9 G-6, G-7; `practice-expert.md` §9 G-2, G-34.
5. **Knock-ons.** AG-13 `AuditLog`, `Task`, `Reminder` (CN-AG-13 item 2); AG-07 AG-7-66 (CN-AG-07 item 5); AG-16-39 firm export (CN-AG-16 item 5). Retention of the new fields follows AG-11-98's interim values until counsel answers (`00-step3-plan.md` "Interim retention"; no new value).

## 8. The AI switch waits for a provider record in Canada with a passed test call

1. **Where.** AG-11-93 (L702); AG-11-73 (L661); AG11-D13 (L43).
2. **Current words.**
   > L702: "AI Doers SHALL be **off for every firm**, with the switch locked, until the Super Admin has recorded the provider, the processing region (Canada only, AG11-D15) and a no-training/no-retention agreement (SA-08 / SA-11); AI and OCR processing of client data SHALL happen only in Canada."
3. **Proposed words.** "AI Doers SHALL be **off for every firm**, with the switch locked, until the Super Admin has recorded the **AI provider record**: the provider, a processing region in Canada (AG11-D15), the no-training and no-retention terms, and a passed test call made from that region (SA-08 / SA-11); AI and OCR processing of client data SHALL happen only in Canada. If no provider passes, AI stays locked off. No requirement in this module names a provider; the provider is replaceable by recording a new provider record." AG-11-73 gains: "The record SHALL be the same for the firm AI switch and for any AI processing Expat Ready does for its own platform work (AW-02)."
4. **Why.** AIW-D52 (the founder: "Only in Canada"; "confirmed by one test call"; for firms' data "and Expat Ready's own support tickets"); AIW-D69 (the test call and "the provider record the product requires before the AI switch unlocks (AG-16-35, AG-11-93)"); AIW-D27; IMP-6, IMP-7; `requirements/00-step3-plan.md` shared rule ("The provider is replaceable").
5. **Knock-ons.** AG-16-35 (CN-AG-16 item 1); SA-08 provider entry and SA-11 §3.6 wording (Super Admin half); AW-02 for the platform's own calls.

## 9. AI assistants' recipes are seed rows; the double-run key; the engine's assistant rules

1. **Where.** AG-11-21 (L589); AG-11-25 (L595); §7 `AutomationRecipe` (L876) and `AutomationActionResult` (L873); new requirement **AG-11-114**; new rule **BR-42**.
2. **Current words.**
   > L589: "The system SHALL ship a **library of prebuilt, immigration-validated recipes** (config-as-data) the firm can preview and **enable**, which instantiates a firm-owned, editable `AutomationDefinition`."
   >
   > L876: "`category` (Sales/Cases/Compliance/Documents/Comms)"
   >
   > L595: "every action SHALL be **idempotent**, keyed per action on `(definitionId, triggerEventId, entityId, actionId, repeatIndex[, externalEventId])`"
3. **Proposed words.**
   > **AG-11-114 (AI assistant recipes in the engine).** (a) `AutomationRecipe` adds `personaKey?` and `personaVersion?`, and `category` adds **AI assistant**; each AI assistant's recipes are platform-seeded rows of that category, written as trigger → conditions → ordered actions from AG-11-2 and AG-11-109. (b) `AutomationDefinition` adds `rehearsedVersion?`, `rehearsedAt?` and `rehearsedBy?`; enabling a recipe of the AI assistant category SHALL be refused unless `rehearsedVersion` equals `currentVersion` (a simulation, AG-11-29). (c) A recipe of the AI assistant category SHALL run only under an active delegation (AG-11-113). (d) **Double-run key.** `AutomationActionResult` adds `actGuardKey`, built from the case (or lead or billing party), the checklist item or document version, the action type and the template, and **never** from the recipe definition; before an AI assistant's action runs, the engine SHALL look up `actGuardKey` across every definition of the firm, seeds and the product's own Doer runs included, and report a match to the recipe. (e) A recipe of the AI assistant category SHALL NOT run while its assistant's firm switch (AG-16-57 as proposed in CN-AG-16) is off. (f) When an assistant recipe calls `create_task`, the task SHALL carry `delegationId` and SHALL NOT carry `sourceItemRef` (AG-13 BR-22 as proposed in CN-AG-13). (g) When an assistant recipe would send a template marked as containing status or eligibility content (AG-12-38 as proposed in CN-AG-12), the send SHALL default to `APPROVE`, and the engine SHALL refuse the send outright when any recipient is a lead.
   >
   > **BR-42 (A model never chooses the action).** In every recipe, an AI assistant's included, the next action is chosen by the recipe's rule over the product's own data. A model's output may propose values (a date, a type, a draft, a mapping) and nothing else: never an action, a recipient, an address or a permission.

   What the assistant does on a match (skip, record, reference the earlier run), who enables a recipe and which runs stay firm automations are behaviour and live in AW-01 (AW-1-13 to AW-1-18).
4. **Why.** IMP-10 ("an AI Worker is a recipe, not a model with hands … a model never selects which action runs"; "tried in rehearsal mode … before it is enabled"); IMP-26 rule 1; AIW-D54 ("seeds and the product's own AI reading stay firm automations, unmetered"); review S3c M-5 (AG-11-25's key includes `definitionId`, so a seed and an assistant recipe never share a key) and `00-step3-plan.md` "Double-run check key"; for (e) to (g), the four follow-ons named in other notes and folded here at the coordinator's request (review S3c m-19): (e) IMP-8(e); (f) AIW-D54 ("no assistant task can close a deadline") and the `proposals.md` rule row of 10 Oct; (g) IMP-28(c) and AIW-D41 (`00-step3-plan.md` "Eligibility to leads", "Status-content templates"). Behaviour documents: `case-assistant.md` §9 G-31; `billing-assistant.md` §9 G-13, G-29; `intake-assistant.md` §9 GI-22; `firm-assistant.md` §9 G-26.
5. **Knock-ons.** AG-11-24 (library versions) applies to these recipes; AW-1-18 cites `actGuardKey` (it currently says "on the action's idempotency key"); the verified-sender rule's shared-sender exception is item 12.

## 10. Onboarding: one list, sent once, on `case.created`

1. **Where.** §3.5 seed "E-sign → onboarding" (L372); AG-11-22 (L590); AG-11-75 (L667).
2. **Current words.**
   > L372: "**E-sign → onboarding** (`envelope.signed` → change_stage to WON [`AUTO`] + welcome email [`AUTO`, template] + portal invite [`AUTO`, template] + first document request [`AUTO`, template])."
3. **Proposed words.** "**E-sign → onboarding**, in two parts: (a) `envelope.signed` → change_stage to WON [`AUTO`]; (b) `case.created` — fired when a person opens the case (AG-07 §3.2) → the onboarding list of AG-07 §3.2 as changed by CN-AG-07 item 8: portal invite [`AUTO`, template], questionnaire link [`AUTO`, template] and welcome [`AUTO`, template], each sent once, and, once the case's checklist (Binder) is built, the first document request [`AUTO`, template]." AG-11-22 and AG-11-75 read the seed the same way.
4. **Why.** `proposals.md` row of 10 Oct (Case assistant, "Two sources start onboarding on different events … the order matters"); `proposals.md` row of 11 Oct ("One list of onboarding messages"); `00-step3-plan.md` "Onboarding (S3c M-4)" (one list, sent once; "the AG-11 seed is re-pointed, never a second invitation"); `case-assistant.md` §9 G-30. AG-07 BR-1 (v2.7 L728: "A case is never auto-created as a side-effect of a prospect conversion or a payment") means no case, and so no checklist, exists at `envelope.signed`.
5. **Knock-ons.** AG-07 §3.2 (CN-AG-07 item 8: its direct "SQR link and portal-access email" becomes the seed's step, so no second invitation); AG-05 §3.11 (CN-AG-05 item 3); AW-1-69.

## 11. Platform AI assistants run on the same engine and the same AI run log, with an empty firm

1. **Where.** §2 (L229); §7 `AiRunLog.firm_id` (L879) and `AutomationRun.firm_id` (L872); AG-11-98 (row-level security).
2. **Current words.**
   > L229: "| **Super Admin** (platform, *not* this plane) | Ships/maintains the Country Pack deadline rules and the seed recipe catalog. |"
3. **Proposed words.** Add to §2: "Expat Ready's own platform assistants (AW-02) run on this same engine and write to this same AI run log; no second engine or log is built." Add to §7: "`AiRunLog.firm_id` and `AutomationRun.firm_id` hold the one firm a run serves (AW-02 calls this the tenant); a platform run that serves no firm holds null. A row with a null `firm_id` SHALL NOT pass any firm's row-level-security policy (AG-11-98) and SHALL be readable only on the platform plane under `system/*` keys. No run that serves one firm reads another firm's data, and there is no run across all firms in version 1. Platform rows keep AG-11-98's interim retention until counsel answers."
4. **Why.** AIW-D54 ("platform runs stamped with one firm, no cross-firm sweep in version 1"); `00-step3-plan.md` "One AI log shape" and "Interim retention"; `proposals.md` rows of 10 Oct (Pack author's assistant, "No second engine"; Support and account assistant, the platform tenant rule); review S3c m-18.
5. **Knock-ons.** AW-02 (field name and retention follow this item); SA-11-2 actor scope and SA-11-12 (Super Admin half). BR-3 (tenant isolation) is unchanged for firm runs.

## 12. A shared sender is never a verified sender

1. **Where.** AG-11-94 (L703), last sentence.
2. **Current words.**
   > L703: "A sender SHALL be **verified** only when a reply token, the email header chain, or a known email address or WhatsApp number ties it to a known contact; every other sender SHALL be treated as unverified."
3. **Proposed words.** Add: "An address the firm has marked as a shared sender (AG-10-60 as proposed in CN-AG-10) SHALL NOT count as a known email address for this rule."
4. **Why.** `proposals.md` row of 10 Oct (Billing assistant, shared senders: a shared sender, once linked, "counts as a verified sender (AG-10-47)"); `billing-assistant.md` §9 G-4; folded here from CN-AG-10's knock-on (review S3c m-19).
5. **Knock-ons.** AG-10-47 already points to AG-11 for the definition.

---

## Not changed here (pointers only)

- **WhatsApp, a team conflict stated, not settled.** AG-11 v1.12 still makes proactive and inbound WhatsApp Release 1 (AG11-D6, AG11-D18(a), (b); AG-11-103 to AG-11-105), while SA-08 v2.4 SA8-D19 (L56) says "**WhatsApp: Phase 2; SMS: Phase 3.** Reverses AG11-D18(a)/(b) and AG11-D6 (WhatsApp in Release 1) — AG-10, AG-11, AG-16 to change". Nothing in this note depends on WhatsApp; the team settles it (SA8-X1, L93).
- The deadline watch is the product's own Minder (AG-11-47, AG-11-48), not AI: no change (AIW-D37).
- Escalation default "on at 5 or more staff" (AG11-D9) is aligned in AG-17 (CN-AG-17 item 1), which closes AG-11 §0.2's pending AG-17 row (L61).
- Hard limits, delegation lifecycle, spend caps, emergency-stop behaviour and the run record are AW-01's and AW-02's; this note holds only what the engine itself must carry.
- Two gaps from `intake-assistant.md` §9 GI-2 are not written: a verb to book a consultation for a lead, and a verb to generate the retainer draft. The `proposals.md` row of 10 Oct (Intake assistant, item (4)) records the gap but recommends no new verb, and AIW-D54 keeps the retainer free of AI text.
