# CN-AG-11: change note to AG-11 Automation (Conductor and Doers)

| Field | Value |
|---|---|
| Module changed | AG-11 Automation — Conductor & Doers |
| Version and file | v1.11 of 7 Oct 2026, `02-functional-requirements/agent/AG-11-automation_v1.11_2026-10-07.md` (Drive snapshot of 9 Oct 2026; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-11-109 to AG-11-114 (the module's highest is AG-11-108, L724); BR-42 (highest BR-41, L770) |
| Companion files | New modules AW-01 (firm AI assistants) and AW-02 (platform AI assistants), Step 3 items A and B, in preparation; their requirement IDs are cross-referenced at integration. Other change notes: CN-AG-03, -05, -06, -07, -09, -10, -13, -16, -18 |

**In plain words.** AG-11 is the engine that runs automations and the product's small tools (Doers). The founder's decisions of 11 Oct and the Step 2 reviews found that the engine lacks a few verbs, events and approval-item kinds the AI assistants need, still calls the AI writing tool "Drafter" (now *Writer*), and has no field that says which named person an AI assistant worked for. This note adds exactly those, and nothing that a decision, an improvement (IMP) or a `proposals.md` row does not already call for.

**Terms used.** *AI assistant*: an assistant to a named person's role, working under that person's *delegation* (a record of which assistant works for whom, with a subset of that person's permissions, specified in AW-01); it has no identity and no permission of its own (FD-16; AIW-D13, D33, D36). *Writer*: the AI Doer that drafts text for a person to approve (AIW-D53); *Drafter* stays the template engine (AG-05, AG-09, AG-12). *Needs you*: the approval inbox (§3.13). *Item kind*: the value of `ApprovalItem.itemType`.

---

## 1. Rename the AI Doer "Drafter" to "Writer"; the run-log value `DRAFTER` becomes `WRITER`

1. **Where.** AG11-D4 (L33); §3.0 (L249); §3.10 (L469); AG-11-2 (L553); AG-11-68 (L655); AG-11-88 (L692); BR-35 (L764); §7 `ApprovalItem.sourceDoer` (L877) and `AiRunLog.doer` (L878).
2. **Current words** (word for word):
   > L33: "**Drafter** (AG-10's AI-assist drafter, callable by any recipe; never promises an outcome)"
   >
   > L249: "**Drafter** — AG-10's AI-assist drafter, now a Doer any recipe can call to prepare a message. It never promises an immigration outcome (BR-9)."
   >
   > L469: "**No outcome promises.** Drafter output is bound by BR-9 like every other message."
   >
   > L553: "**Drafter** (`draft_message`)"
   >
   > L655: "The **Drafter** (AG-10's AI-assist drafter) SHALL be callable by any recipe to prepare a message."
   >
   > L692: "Drafter output sent unedited SHALL count as AI-written text."
   >
   > L764: "AI-written client text, including Drafter output sent unedited, is approved by a licensed user"
   >
   > L877: "`sourceDoer` (Mailer/Drafter/Reader/Sorter/Filler/…)"
   >
   > L878: "`doer` (READER/SORTER/DRAFTER/CHECKER)"
3. **Proposed words.** In every place where "Drafter" names the AI Doer, read **Writer**: "**Writer** (AG-10's AI-assist writer, callable by any recipe; never promises an outcome)"; "The **Writer** (AG-10's AI-assist writer) SHALL be callable by any recipe to prepare a message"; "Writer output sent unedited SHALL count as AI-written text"; `sourceDoer` (Mailer/Writer/Reader/Sorter/Filler/…); `doer` (READER/SORTER/**WRITER**/CHECKER). The action name `draft_message` is unchanged. Add one sentence to §3.0: "*Drafter* names only the template engine that renders firm templates (AG-05, AG-09, AG-12); the AI Doer that drafts text for a person to approve is the *Writer* (founder decision AIW-D53)." The four AI Doers are Reader, Sorter, Writer, Checker.
4. **Why.** AIW-D53 (the founder, 11 Oct: "The AI Doer that drafts messages and letters for a person to approve is named **Writer** … *Drafter* stays the template engine"); AIW-D51 (FD-8 amended so *Drafter* stays the template tool); `proposals.md` row of 11 Oct (Lead, "`DRAFTER` … becomes `WRITER`"); IMP-24(c).
5. **Knock-ons.** Same rename in AG-07 (CN-AG-07 item 6), AG-10 (CN-AG-10 item 3), AG-16 (CN-AG-16 item 6), AG-02 (CN-AG-02 item 2), the agent glossary `99-Phasing-and-Glossary_v1.4` (not an AG module; for the team), and SA-06's key descriptions (Super Admin half of the change notes). AG-05, AG-09 and AG-12, where Drafter is the template engine, are **not** changed. Existing log rows written with `DRAFTER` need a one-time mapping (the team's call).

## 2. The Sorter hands each attachment to the Reader, which proposes the document type

1. **Where.** AG11-D4 (L33); §3.0 (L248); AG-11-67 (L654).
2. **Current words.**
   > L33: "**Sorter** (classifies inbound email / portal / WhatsApp messages, matches them to the right file, files attachments to AG-9 with a document type; low confidence → Unmatched inbox and Needs you)"
   >
   > L654: "The **Sorter** SHALL classify inbound email, portal and WhatsApp messages, match each to the right file beyond header/reply-token matching, and file attachments to AG-9 with a document type."
3. **Proposed words.** L33: "**Sorter** (classifies inbound email / portal / WhatsApp messages, matches them to the right file, files attachments to AG-9 and hands each to the **Reader**, which proposes the document type; low confidence → Unmatched inbox and Needs you)". AG-11-67: "The **Sorter** SHALL classify inbound email, portal and WhatsApp messages, match each to the right file beyond header/reply-token matching, and file attachments to AG-9; it SHALL hand every attachment to the Reader, which SHALL propose its document type (AG-11-66, AG-9-42). The Sorter SHALL NOT propose a document type." The same in §3.0 L248.
4. **Why.** IMP-12 (one owner for one decision), relied on by `design/behaviours/case-assistant.md` §2.3 step 4 ("the Reader proposes the document type, not the Sorter"); AG-10 v1.9 §13 Q12 (L814) already records the team's decision: "the Reader — not the Sorter — classifies documents".
5. **Knock-ons.** AG-10-37(c) (CN-AG-10 item 2); the agent glossary entry for the Sorter.

## 3. Extend the closed list of actions (six new actions)

1. **Where.** AG-11-2 (L553) and §3.3 (L301); new requirement **AG-11-109**.
2. **Current words.**
   > L553: "The Conductor SHALL dispatch to in-house **Doers**: Mailer (`send_mail`), Messenger (`send_message`), Notification (`send_notification`), Reminder (`create_reminder`/`send_reminder`), Tasker (`create_task`), and module verbs (`change_stage` for prospects only, `assign`), plus the **Minder** (`arm_minder`) and the AI Doers"
   >
   > L301: "**`draft_message`** (Drafter — prepare a message; always followed by a send action whose autonomy is at least `APPROVE`)"
3. **Proposed words.** New requirement:
   > **AG-11-109 (actions an AI assistant's recipe needs).** In addition to AG-11-2, the Conductor SHALL dispatch these actions, each carrying an autonomy level (AG-11-51) and each subject to the floors (AG-11-53):
   > (a) **`run_filler`** — run the Filler on one form of a case to prepare a draft; the result is a government-form draft at the `APPROVE` floor (`FORM_DRAFT`, AG-11-60); the Filler stays rule-based and outside the AI switch (AG-07 BR-7 as amended by CN-AG-07 item 6).
   > (b) **`create_note`** — create an internal-only Note on a record (AG-13); where its text came from the Writer it SHALL carry the AI-drafted marker (AG-13 §7 as amended by CN-AG-13 item 3). Default `AUTO` (internal action, AG-11-52); it SHALL never be client-visible by this action.
   > (c) **`propose_milestone`** — prepare a proposed milestone line for a case (item kind `MILESTONE_LINE`, AG-11-112); it SHALL NOT record a milestone, submission or decision (AG-11-16); a person records it under `agent/case:milestone-record`.
   > (d) **`propose_key_date`** — prepare a proposed key date for a file, found by a rule or read by the Reader (item kind `KEY_DATE`, AG-11-112); the date SHALL be registered with the Minder only after a person approves it under AG-9-51's rule.
   > (e) **`draft_structured`** — the Writer drafts structured content (for example an import mapping, AG-18) into a proposal record; it SHALL NOT be followed by a send; its output SHALL be checked against the fixed expected shape of its content kind before any person sees it, as all AI output already is (§11, L1180: "AI output is untrusted input — schema-validated, never executed").
   > (f) **`read_text`** — the Reader reads the text of a message or of an imported note, passed as delimited data (AG-11-94), and proposes values (a profile value that a person accepts but which stays unverified, AG-08 as amended by CN-AG-08 item 1; or a key date, (d) above); it SHALL propose values only, never an action, a recipient, an address or a permission.
   > No other action exists. No action creates or edits an invoice, records a payment, approves, signs, submits to an authority, or sends AI-written text to a client without a person's approval (AG-11-53, AG-11-54; the hard limits of AW-01).
   In §3.3, `draft_message` keeps its rule ("always followed by a send action whose autonomy is at least `APPROVE`"); structured content uses `draft_structured` instead.
4. **Why.** `proposals.md` row of 10 Oct (Case assistant, closed action set: run the Filler, internal-only Note, proposed milestone line), extended by the Pack author's row of 10 Oct (structured content, never followed by a send, "checked against a fixed expected shape per content kind") and the Firm assistant's row of 10 Oct (Reader on a stored note's text; structured mapping proposals; proposed key date); the Intake assistant's row of 10 Oct, item (3) ("no action proposes values from message text"); IMP-10 ("the fixed menu of actions the engine already knows (AG-11-2, extended as needed)"). Behaviour: `case-assistant.md` §9 G-1 to G-3; `firm-assistant.md` §9 G-2 to G-4; `intake-assistant.md` §9 GI-3.
5. **Knock-ons.** AG-07 (`run_filler` drafts follow AG-7-59; preparer per CN-AG-07 item 5); AG-13 (CN-AG-13 item 3); AG-08 (CN-AG-08 item 1); AG-09 (CN-AG-09 item 4); AG-18 (CN-AG-18 items 1 and 2); SA-06 (no new permission key: each action is approved under the key the same act needs by hand, AG-11-58). The platform plane's own structured content (pack rows, box-map lines) is AW-02's.

## 4. Add the missing trigger events

1. **Where.** AG-11-4 (L557); §3.1 (L260); new requirement **AG-11-110**.
2. **Current words.**
   > L557: "The Conductor SHALL support **entity-event** triggers across all business modules, with the vocabulary extended to first-class events: `prospect.created`, `prospect.stage_changed` (with `from`/`to`), `case.milestone_reached`, `document.received`, `document.verified`, `invoice.paid`, `envelope.signed`, `deadline.approaching` — in addition to today's `CREATED/UPDATED/EDITED/DELETED/STATUS_CHANGED/ASSIGNED/ARCHIVED/RESTORED`."
3. **Proposed words.**
   > **AG-11-110 (further first-class events).** The trigger vocabulary SHALL also include, with the same envelope, idempotency key and pack-awareness as every other trigger (AG-11-74): (a) the billing events AG-06 already emits — `invoice.issued`, `invoice.partially_paid`, `invoice.overdue`, `invoice.refunded` and `installment.due` (AG-6-35); (b) `case.submitted` and `case.decided` (listed in AG-07 v2.7 §3.9); (c) `appointment.scheduled`, `appointment.rescheduled`, `appointment.cancelled`, `appointment.no_show` and `appointment.completed` (AG-4-47); (d) an assessment created (AG-03, CN-AG-03 item 3); (e) a consent record withdrawn (AG-10 BR-4); (f) a data-subject request opened (the register of SA-11-27; CP-8-15); (g) a Minder watch changing state (`ARMED`, `ESCALATING`, `SATISFIED`, `BREACHED`, §6); (h) an import batch ready for mapping (AG-18, CN-AG-18 item 3); (i) `retainer.ended` (AG-05, CN-AG-05 item 4). Names in (d) to (h) are proposals; the team names them.
4. **Why.** `proposals.md` rows of 10 Oct: Billing assistant ("AG-11-4's trigger vocabulary carries only `invoice.paid`"; `case.submitted`), Intake assistant items (1) and (5) (no assessment event; the five `appointment.*` events "Merge … into one Conductor-vocabulary change note to AG-11"), Firm assistant events row (Minder state change, import batch, data-subject request, consent withdrawn, `case.decided`); `case-assistant.md` §9 G-22 and IMP-35 (`retainer.ended` as a stop condition). Behaviour: `billing-assistant.md` §9 G-3; `intake-assistant.md` §9 GI-1, GI-18; `firm-assistant.md` §9 G-17.
5. **Knock-ons.** Emitters: AG-03 (CN-AG-03 item 3), AG-05 (CN-AG-05 item 4), AG-18 (CN-AG-18 item 3); AG-04, AG-06 and AG-07 already name their events. SA-11 owns the data-subject register and consent records (Super Admin half). Whether today's generic `UPDATED` event would already carry a person's link in the Unmatched inbox stays Unknown (Billing row, item 4).

## 5. Two run targets: a firm-level scheduled run, and an on-demand run against a batch or a request

1. **Where.** AG-11-5 (L558); AG-11-7 (L560); new requirement **AG-11-111**.
2. **Current words.**
   > L558: "The Conductor SHALL support **scheduled** triggers (daily / every-N-days / weekly / monthly / yearly / custom cron) that scan matching entities and enqueue a run per match"
   >
   > L560: "The Conductor SHALL support **manual / on-demand** runs of an automation against a chosen entity, permissioned and audited."
3. **Proposed words.**
   > **AG-11-111 (firm-level and batch or request targets).** A scheduled trigger MAY target the firm itself, with no entity to scan: one run per firm per occurrence, timezone-aware (AG-11-40). An on-demand run (AG-11-7) MAY be started against a chosen import batch (AG-18) or a chosen data-subject request (SA-11), permissioned and audited like any manual run (BR-17).
4. **Why.** `proposals.md` Firm assistant events row of 10 Oct ("a firm-level scheduled run with no entity to scan"; "an on-demand run against a batch"; "an on-demand run against a request"); `firm-assistant.md` §9 G-17.
5. **Knock-ons.** §7 `AutomationTrigger` gains the firm target; §3.1 entity list (L260) gains the batch and request targets for manual runs. The weekly note and re-engagement duties of the Firm assistant depend on it (AW-01).

## 6. New approval-item kinds

1. **Where.** §7 `ApprovalItem.itemType` (L877); AG-11-60 (L643); §6 approval rows (L855); new requirement **AG-11-112**.
2. **Current words.**
   > L877: "`itemType` (CLIENT_MESSAGE/AI_DRAFT/PROFILE_VALUE/SORTER_MATCH/FORM_DRAFT)"
   >
   > L643: "Needs you SHALL hold only (a) work a Doer prepared with no human present — client messages from recipes at `APPROVE` (including seed messages waiting for AG-11-91), Drafter drafts from recipes, Reader-extracted values on client uploads, Sorter matches on inbound messages below the confidence threshold or made only by the AI (AG-11-94), Filler form drafts prepared by an automation"
3. **Proposed words.** `itemType` adds `READINESS_REPORT`, `INVOICE_PROPOSAL`, `PAYMENT_MATCH`, `DOCUMENT_TYPE`, `IMPORT_MAPPING`, `KEY_DATE`, `MILESTONE_LINE`. New requirement:
   > **AG-11-112 (what each new item kind does when approved).**
   > (a) `READINESS_REPORT`: one item per file, built by rule from the file's records with every value, finding and waiting message on its own line, each line approvable, approvable in a batch, or rejectable with a reason; the same stale and changed-since-seen checks as any item (AG-11-61). The delegating case officer's acceptance SHALL be the case's submit-for-internal-review (AG-07, CN-AG-07 item 3). A government-form draft and AI-written client text inside it remain their own items with their own approver rules (AG-11-53).
   > (b) `INVOICE_PROPOSAL` and `PAYMENT_MATCH`: approving SHALL only open AG-06's own invoice builder or Record payment modal pre-filled for the approver; nothing SHALL be saved by the approval; the person saves under the AG-06 key (CN-AG-06 items 3 and 4). Proposal: these items go to the delegating person's Needs you rather than the file owner's (AG-11-55).
   > (c) `DOCUMENT_TYPE`: a Reader-proposed document type for a person to confirm (AG-9-11 as amended by CN-AG-09 item 1).
   > (d) `IMPORT_MAPPING`: opens AG-18's mapping screen with the proposals shown beside the engine's own suggestions; each is confirmed by a holder of `agent/import:run` (CN-AG-18 item 1).
   > (e) `KEY_DATE`: approved under AG-9-51's rule, then registered with the Minder (AG-11-47).
   > (f) `MILESTONE_LINE`: a person records the milestone under `agent/case:milestone-record`.
   > AG-11-60(a) adds these kinds to the work Needs you holds.
4. **Why.** `proposals.md` rows of 10 Oct: Billing assistant ("`ApprovalItem.itemType` … has … nothing for a proposed payment match or a proposed invoice"; "One route for every money record"), Firm assistant ("an approval-item kind *import mapping*"; "an item kind *key date*"), Case assistant (closed action set, item (3) proposed milestone line); AIW-D54 ("readiness report by rule, the officer's acceptance is the submission for review; money: assistant proposes, person saves in the product's screen"); AIW-D44 (no assistant creates even a draft invoice); AIW-D71 (in the pilot every document type goes to a person); IMP-34 (one item per file). Behaviour: `case-assistant.md` §9 G-4, G-25, G-32; `billing-assistant.md` §9 G-1, G-2; `firm-assistant.md` §9 G-3, G-4.
5. **Knock-ons.** §6 transition rows for the new kinds; the approve-all safeguards the founder adopted (AIW-D57: low-confidence lines opened first, a few values hidden for the approver to fill, an agreement-rate alarm) apply to `READINESS_REPORT` and are specified in AW-01, provisional until counsel (AIW-D64, AIW-D68); AG-14 measures count the new kinds (CN-AG-14 item 2).

## 7. Record which named person an AI assistant worked for

1. **Where.** §7 `ApprovalItem` (L877, `preparedBy?`), `AiRunLog` (L878), `AutomationRun` (L871); AG-11-81 (L680); new requirement **AG-11-113**.
2. **Current words.**
   > L877: "`preparedBy?` (the user excluded from approving under four-eyes — the person who created the draft or edited it before sending it for approval; null only when an automation ran the Filler, AG-7-66)"
   >
   > L878: "**`AiRunLog`** *(NEW v1.8 — AG11-D4)* — `id`, `firm_id`, `doer` (READER/SORTER/DRAFTER/CHECKER), `model`, `promptVersion`, `entityRef`, `runId?`, `actionId?`, `inputRef` (reference to the document/message, not a copy), `outputRef`, `confidence?`, `outcome` (OK/UNREADABLE/PROVIDER_ERROR/DISABLED), `latencyMs`, `createdAt`."
   >
   > L680: "The Filler SHALL count as no person, so a draft the Filler prepared on its own MAY be approved by any form approver."
3. **Proposed words.**
   > **AG-11-113 (delegation and provenance on every AI-assistant record).** Every `AutomationRun`, `ApprovalItem` and `AiRunLog` row produced by an AI assistant SHALL carry the delegation it worked under (`delegationId`, AW-01). For such an item `preparedBy` SHALL be the person the assistant worked for, who counts as the preparer for four-eyes (AG-11-81); `preparedBy` stays null only when a plain firm automation with no delegation ran the Filler. `ApprovalItem` SHALL list the AI runs that produced it (`aiRunIds[]`). An `AiRunLog` row made for an AI assistant SHALL carry `runId` (required), and, once decided, the approval item or the inline audit entry that decided it (`approvalItemId?`, `auditLogId?`). `AiRunLog.outcome` adds `DROPPED_FAILED_CHECK` (output discarded because it failed its check); `AiRunLog` adds `questionRecordId?` (the Practice expert's question record, AW-01). No AI identity is added: the actor on every audit entry stays the named person (FD-16).
   AG-11-81, last sentence: "A plain firm automation with no delegation SHALL count as no person, so a draft it prepared MAY be approved by any form approver; a draft an AI assistant prepared counts as prepared by the person it worked for (AG-11-113)."
4. **Why.** AIW-D33 (the founder: a delegation record is consistent with FD-16, "the named person the persona worked for counts as the preparer for four-eyes"); IMP-1 (the delegation reference on every action, approval item and AI run); IMP-2(a), (b) (compulsory links between the AI run and the decision); `proposals.md` rows of 9 Oct (carve-out A, "an on-behalf-of person on AuditLog, AiRunLog and ApprovalItem") and of 10 Oct (Practice expert, outcome value and question-record link). Behaviour: `case-assistant.md` §9 G-6, G-7; `practice-expert.md` §9 G-2, G-34.
5. **Knock-ons.** AG-13 `AuditLog` gains `mode` and `delegationId` (CN-AG-13 item 2); AG-07 AG-7-66 (CN-AG-07 item 5); AG-16-39 firm export (CN-AG-16 item 5); AG-11-98 retention of the new fields (SA-11; counsel on values, IMP-4).

## 8. The AI switch waits for a provider record in Canada with a passed test call

1. **Where.** AG-11-93 (L701); AG-11-73 (L660); AG11-D13 (L42).
2. **Current words.**
   > L701: "AI Doers SHALL be **off for every firm**, with the switch locked, until the Super Admin has recorded the provider, the processing region (Canada only, AG11-D15) and a no-training/no-retention agreement (SA-08 / SA-11); AI and OCR processing of client data SHALL happen only in Canada."
3. **Proposed words.** "AI Doers SHALL be **off for every firm**, with the switch locked, until the Super Admin has recorded the **AI provider record**: the provider, a processing region in Canada (AG11-D15), the no-training and no-retention terms, and a passed test call made from that region (SA-08 / SA-11); AI and OCR processing of client data SHALL happen only in Canada. If no provider passes, AI stays locked off. No requirement in this module names a provider; the provider is replaceable by recording a new provider record." AG-11-73 gains: "The record SHALL be the same for the firm AI switch and for any AI processing Expat Ready does for its own platform work (AW-02)."
4. **Why.** AIW-D52 (the founder: "Only in Canada"; "confirmed by one test call"; for firms' data "and Expat Ready's own support tickets"); AIW-D69 (the test call and "the provider record the product requires before the AI switch unlocks (AG-16-35, AG-11-93)"); AIW-D27 (provider and region decided before AI is switched on); IMP-6, IMP-7; `requirements/00-step3-plan.md` shared rule ("The provider is replaceable").
5. **Knock-ons.** AG-16-35 (CN-AG-16 item 1); SA-08 provider entry and SA-11 §3.6 wording (Super Admin half); AW-02 for the platform's own calls.

## 9. AI assistants' recipes are seed rows in the recipe library

1. **Where.** AG-11-21 (L588); §7 `AutomationRecipe` (L875); new requirement **AG-11-114**; new rule **BR-42**.
2. **Current words.**
   > L588: "The system SHALL ship a **library of prebuilt, immigration-validated recipes** (config-as-data) the firm can preview and **enable**, which instantiates a firm-owned, editable `AutomationDefinition`."
   >
   > L875: "`category` (Sales/Cases/Compliance/Documents/Comms)"
3. **Proposed words.**
   > **AG-11-114 (AI assistant recipes).** Each AI assistant's recipes (AW-01) SHALL be platform-seeded `AutomationRecipe` rows of a new category **AI assistant**, written as trigger → conditions → ordered actions from AG-11-2 and AG-11-109. Such a recipe SHALL run only under an active delegation, SHALL carry that delegation on every run (AG-11-113), and SHALL be simulated (AG-11-29) before the firm enables it. The seeded recipes of AG-11-75 and the product's own Reader, Sorter and Checker runs SHALL stay firm automations with no delegation (not metered as assistant work). Before it acts, an assistant recipe SHALL check, by the action's idempotency key (AG-11-25), that a seed or the product has not already done the same act on the same record and item, and SHALL then do nothing.
   >
   > **BR-42 (A model never chooses the action).** In every recipe, an AI assistant's included, the next action is chosen by the recipe's rule over the product's own data. A model's output may propose values (a date, a type, a draft, a mapping) and nothing else: never an action, a recipient, an address or a permission.
   `category` adds "AI assistant".
4. **Why.** IMP-10 ("an AI Worker is a recipe, not a model with hands … a model never selects which action runs"; "tried in rehearsal mode … before it is enabled"); IMP-26 rule 1; AIW-D54 ("seeds and the product's own AI reading stay firm automations, unmetered"); `proposals.md` rule row of 9 Oct (W2b improvements, recipe not a model with hands). Behaviour: `case-assistant.md` §9 G-31; `billing-assistant.md` §9 G-29; `intake-assistant.md` §9 GI-22; `firm-assistant.md` §9 G-26.
5. **Knock-ons.** AG-11-24 (library versions) applies to these recipes; AG-16 per-assistant switches (CN-AG-16 item 4); SA-01/SA-05 (platform seeding, Super Admin half). Firm-authored recipes stay Release 2 (AG11-D3): assistant recipes are platform-seeded, not firm-authored.

## 10. Onboarding messages run on `case.created`, after the checklist exists

1. **Where.** §3.5 seed "E-sign → onboarding" (L371); AG-11-22 (L589); AG-11-75 (L666).
2. **Current words.**
   > L371: "**E-sign → onboarding** (`envelope.signed` → change_stage to WON [`AUTO`] + welcome email [`AUTO`, template] + portal invite [`AUTO`, template] + first document request [`AUTO`, template])."
3. **Proposed words.** "**E-sign → onboarding**, in two parts: (a) `envelope.signed` → change_stage to WON [`AUTO`]; (b) `case.created` — fired when a person opens the case and its checklist (Binder) has been built (AG-07 §3.2, §3.4) → welcome email [`AUTO`, template] + portal invite [`AUTO`, template] + first document request [`AUTO`, template]." AG-11-22 and AG-11-75 read the seed the same way.
4. **Why.** `proposals.md` row of 10 Oct (Case assistant, "Two sources start onboarding on different events … the order matters"); `case-assistant.md` §9 G-30. AG-07 BR-1 (v2.7 L728: "A case is never auto-created as a side-effect of a prospect conversion or a payment") means no case, and so no checklist, exists at `envelope.signed`; a first document request sent then would list nothing (AG-9-6, AG-9-35). The alternative in the proposals row (create the case inside the e-sign step) would break AG-07 BR-1, so only this option is proposed.
5. **Knock-ons.** AG-05 §3.11 (CN-AG-05 item 3); AG-07 §3.2 (L391) already fires onboarding on `case.created` and needs no change, but it names "portal invite, SQR link, welcome" where AG-11 names "welcome email … portal invite … first document request": the team settles one list (`proposals.md` row suggested in the reply to the Lead).

## 11. Platform AI assistants run on the same engine, stamped with the firm they serve

1. **Where.** §2 (L228); §7 `AiRunLog.firm_id` (L878) and `AutomationRun.firm_id` (L871).
2. **Current words.**
   > L228: "| **Super Admin** (platform, *not* this plane) | Ships/maintains the Country Pack deadline rules and the seed recipe catalog. |"
3. **Proposed words.** Add to §2: "Expat Ready's own platform assistants (AW-02) run on this same engine; no second engine is built." Add to §7: "`AiRunLog.firm_id` and `AutomationRun.firm_id` hold the one firm a run serves; a platform run that serves no firm holds null. No run that serves one firm reads another firm's data, and there is no run across all firms in version 1."
4. **Why.** AIW-D54 ("platform runs stamped with one firm, no cross-firm sweep in version 1"); `proposals.md` rows of 10 Oct (Pack author's assistant, "No second engine"; Support and account assistant, the platform tenant rule).
5. **Knock-ons.** AW-02; SA-11-2 actor scope and SA-11-12 (Super Admin half). BR-3 (tenant isolation) is unchanged for firm runs.

---

## Not changed here (pointers only)

- The deadline watch is the product's own Minder (AG-11-47, AG-11-48), not AI: no change (AIW-D37).
- Escalation default "on at 5 or more staff" (AG11-D9) is aligned in AG-17 (CN-AG-17 item 1), which closes AG-11 §0.2's pending AG-17 row (L60).
- A task an assistant creates never carries `sourceItemRef`: AG-13 (CN-AG-13 item 1).
- Hard limits, delegation lifecycle, spend caps, emergency stops and the run record live in AW-01 and AW-02; this note adds only what the engine itself must hold.
- Two gaps from `intake-assistant.md` §9 GI-2 are not written: a verb to book a consultation for a lead, and a verb to generate the retainer draft. The `proposals.md` row of 10 Oct (Intake assistant, item (4)) records the gap but recommends no new verb, and AIW-D54 keeps the retainer free of AI text.
