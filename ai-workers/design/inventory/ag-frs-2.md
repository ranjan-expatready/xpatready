# Inventory slice ag-frs-2: Firm plane detailed FRs AG-10 to AG-18

Reader: requirements-cartographer (W1, 9 Oct 2026). Source: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/` only. All quotes word for word from that snapshot. Interpretation is labelled **Inferred**.

Files: AG-10 v1.9, AG-11 v1.11, AG-12 v1.2, AG-13 v1.12, AG-14 v1.10, AG-15 v1.6, AG-16 v1.12, AG-17 v0.5, AG-18 v1.2 (all dated 2026-10-07 except AG-15 and AG-16, 2026-10-08).

Notes were written per file as each was read, then grouped into Parts 1 to 5 below. Within each Part, material is grouped by module.


## Part 1: Components


### AG-10

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-10 | Communication hub (email, WhatsApp, portal chat, notifications) | Firm (AG) | One place where every message between firm and client is sent, received, logged on the file and checked against consent law. Every other module sends through it. | Intake/Sales Rep, Case Officer/Paralegal, RCIC, Marketing/Owner, Case Manager, Billing (§2) | Writes and sends emails/WhatsApp from the file; links unmatched inbound mail to the right file; approves AI-written and supervised client messages; manages consent and suppression; sets notification preferences | Mailer, Messenger, Sorter, Drafter; Conductor sends through it (§3.10) | Consent gate (CASL / Law 25); locale-keyed templates (AG-12); firm timezone and quiet hours (AG-1) | Yes for AI text: "AI-written text sent to a client ... SHALL always require human approval (`APPROVE`)" (AG-10-44) | R1 for email, portal chat, WhatsApp; SMS Release 2: "Release 2: SMS only" (AG-10-16) | AG-10 v1.9 §1: "the firm's **single nervous system for every word that passes between the firm and a human**" |
| AG-10 §3.1 | Outbound email (Mailer) | Firm (AG) | Sends email from a lead or case in the client's language, queued, tracked (sent, delivered, opened, bounced). | Reps, case officers | Opens composer, picks template, attaches documents, sends or schedules | Mailer | Email rail (firm SMTP); template locale; consent gate | No (except approval rules below) | R1 (core) | AG-10 v1.9 §3.1: "send from the file, in their language, and know it landed" |
| AG-10 §3.2 | Inbound mailbox sync, matching and Unmatched inbox | Firm (AG) | Pulls replies from the firm's own Gmail, Microsoft 365 or IMAP mailbox and files them on the right lead or case; anything not confidently matched waits in an Unmatched inbox. | Reps, case officers | Links unmatched messages to the right file in one click; dismisses; clicks "Create lead" for unknown WhatsApp numbers | Sorter (AI part off by default); Mailer | Matching order: reply token, header chain, address, alias (BR-7) | Yes for AI-only matches: "A match made only by the AI ... is never filed automatically" (§3.2) | R1, all three mailbox types: "all three in Release 1" (AG-10-4) | AG-10 v1.9 §3.2: "replies the firm gets in its real mailbox land on the right file" |
| AG-10 §3.3 | Agent inbox with AI drafts | Firm (AG) | Threaded email inbox (folders, star, snooze, drafts) that is a second view of the same file-linked messages; Drafter proposes subject and body. | Email-heavy reps | Triages, replies, forwards; edits AI drafts; approves before sending | Drafter | No-guarantee rule (BR-10) | Yes: "by default a licensed user" approves AI-written text (§3.3) | R1 (inbox exists today; Drafter as Doer is NEW, §12) | AG-10 v1.9 §3.3: "it **never promises an outcome** (ranges/\"typically\", not guarantees)" |
| AG-10 §3.4 | Messenger: WhatsApp, portal chat (SMS later) | Firm (AG) | One conversation per client across WhatsApp, portal chat and later SMS; WhatsApp replies only inside the provider's window; firm-started WhatsApp only as provider-approved templates. | Case officers, reps | Replies to client messages; chooses another channel when window closes; sets preferred channel | Messenger, Sorter | Provider window rule; approved template list (AG-16); quiet hours; consent | Person must click "Create lead": "A lead is **never** created automatically from an unknown number" (§3.4) | R1 WhatsApp in and out; SMS R2 (AG-10-16) | AG-10 v1.9 §3.4: "every channel, one thread, on the file" |
| AG-10 §3.5 | Per-file communication timeline | Firm (AG) | Reverse-time list of every message on a lead, case or contact, all channels, with delivery status; case timeline shows only messages tagged to that case. | Case officers, RCIC | Reads history; re-tags messages to the right case (audited) | (display only) | Case tag rules (AG-10-59) | No | R1 | AG-10 v1.9 §3.5: "one reverse-chronological record of every word, on the file" |
| AG-10 §3.6 | Consent and contactability gate | Firm (AG) | Checks every outbound message: transactional always allowed, marketing needs recorded express consent for that channel and purpose at send time; unsubscribe halts marketing; hard bounce suppresses address. | System; Owner/Marketing manage consent | Overrides consent (permissioned, audited); edits suppression list | Called by Mailer, Messenger, Conductor | CASL / Law 25 consent records, jurisdiction-tagged | Legal values routed: "which messages are correctly classed **transactional vs marketing** under CASL" (§13 note) | R1: "ships in Release 1 for email and WhatsApp" (§13 Q2) | AG-10 v1.9 §3.6: "the system itself won't break the law" |
| AG-10 §3.7 | Staff notifications | Cross-cutting | In-app (and per preference email/push) alerts for replies, bounces, failures, mentions and events from other modules; never filtered by Individual/Corporate view. | All staff | Sets per-event, per-channel preferences and quiet hours | (Notification service) | NotificationPreference | No | R1 (email/push at demo open, §13 Q8) | AG-10 v1.9 §3.7: "tell the right person what just happened, the way they want" |
| AG-10 §3.8 | Message attachments | Firm (AG) | Attachments are references to the document system (AG-9); inbound attachments are stored in AG-9. | All staff | Picks or uploads files | Mailer, Messenger, Sorter | AG-9 scanning, limits | No | R1 | AG-10 v1.9 §3.8: "files ride on messages, but live in the document system" |
| AG-10 §3.9 | Message templates and language choice | Firm (AG) | Picks the template variant matching the client's language and channel; a missing merge value sends the message to approval instead of sending a placeholder. | Reps; Owner/Marketing manage templates | Chooses or overrides template; fixes missing fields flagged for approval | Mailer, Messenger | AG-12 published templates; locale | Missing value: "drops an automated send to `APPROVE` with the field flagged" (§3.9) | R1 | AG-10 v1.9 §3.9: "one template set, the right language, every time" |
| AG-10 §3.10 | Automated messages from recipes; autonomy and approval | Cross-cutting | Recipe steps send through the same path as a human; template messages run on their own; AI-written text waits in Needs you; unlicensed staff messages supervised. | Conductor; licensed approvers; Owner | Approves, edits or rejects pending messages in Needs you; confirms one "Review your standard messages" screen at setup | Conductor, Mailer, Messenger, Drafter | Autonomy levels AUTO/APPROVE/OFF; floors; supervision setting | Yes: "The floor cannot be lowered (AI-written text, a template edited by AI, any government form, any unlooked-at verified-profile write)" (§3.10) | R1 | AG-10 v1.9 §3.10: "the cadence is theirs; the delivery, consent, and logging are ours" |
| AG-10-49 | Message supervision of unlicensed staff | Firm (AG) | While on, a client message written or edited by an unlicensed user waits for a licensed user's approval. | Unlicensed staff; licensed users; Owner | Licensed users approve or reject; Owner approves if no licensed user | (Needs you) | Firm setting, on by default when an unlicensed user can message clients | Yes: "SHALL NOT send until a **licensed** user approves it" (AG-10-49) | R1 | AG-10 v1.9 AG-10-49 |


### AG-11

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-11 | Automation: the Conductor and the Doers | Cross-cutting | The always-on engine: when something happens (lead captured, document arrives, deadline nears) it tells the right Doer to act; records every run. | Owner, Admin, Case Manager author and govern; everyone receives outputs (§2) | Switches recipes on/off; sets autonomy per recipe; approves items in Needs you; reviews run history and dead letters | Conductor; Reminder, Minder, Tasker, Mailer/Messenger, Reader, Sorter, Drafter, Checker, module verbs | Country Pack triggers and deadline definitions; consent gate; rate caps; firm timezone | Floors: "a human approves AI-written text before it reaches a client; nothing is ever fabricated ... ExpatReady submits nothing to an authority" (§0) | R1 minimal Conductor + seeded recipes: "A minimal Conductor ships in Release 1" (AG11-D3); builder Release 2 | AG-11 v1.11 §1: "the single home for \"when X happens, do Y\" across **every** module" |
| AG-11 §3.0 | Conductor and Doer model | Cross-cutting | Conductor = brain (listens, decides, sequences, retries, records); Doers = hands, each doing one job; four AI Doers only propose. | (engine) | none directly | All Doers | Existing `WorkflowActionExecutorService` dispatcher | "AI Doers only propose; a human approves what leaves or matters" (Visual B) | R1 | AG-11 v1.11 §3.0: "the Conductor is the brain; the Doers are the hands" |
| AG-11 §3.1 | Triggers | Cross-cutting | Events that wake the Conductor: entity events, scheduled scans, date-anchored deadlines, manual runs, and AI events (`message.received`, `document.extracted`, `deficiency.detected`, `profile.changed`). | Authors | Picks trigger (builder is Release 2); runs a recipe manually | Conductor | Pack-filtered date fields and milestones | No | R1 engine; builder R2 | AG-11 v1.11 §3.1: "anything that happens can start an automation" |
| AG-11 §3.2 | Conditions (rule engine) | Cross-cutting | AND/OR rule groups over the record and related data, including date operators like `expires_in_days`; plain-English preview. | Authors | Writes and tests rules against a real record | Conductor (rule evaluator) | Pack-aware field catalogue | No | Built today (§3.2 "fully built today") | AG-11 v1.11 §3.2: "act only when the rule is truly met" |
| AG-11 §3.3 | Actions via Doers with autonomy level | Cross-cutting | Ordered actions, each run by a Doer, each with Send automatically / Ask me first / Off; floors for AI text, AI-edited templates, government forms, unchecked verified-profile writes. | Authors; approvers | Sets autonomy; approves APPROVE items | Mailer, Messenger, Tasker, Reminder, Minder, Reader, Sorter, Drafter, Checker, `change_stage`, `assign`, `arm_minder` | Templates (AG-12); merge-field rules | "The floor cannot be lowered by anyone" (§3.3) | R1 | AG-11 v1.11 §3.3: "the Conductor dispatches; the Doers do" |
| AG-11 §3.4 | Minder: deadline watcher | Cross-cutting | Watches each registered deadline and reminds the file owner as it nears; with escalation on, alerts users who can reassign cases at T-2 and T-0; with at-risk marks on, flags the case; stops when the obligation is met. | File owners, Case Managers, Owner | Acts on reminders; switches escalation and at-risk marks (via Team safeguards) | Minder, Tasker, Reminder, Mailer | Country Pack deadline definitions and lead times | No sign-off; "ExpatReady assists firms; it does not monitor them" (§3.4) | R1 (AG17-D38, AG17-D55); firm-designed chains later | AG-11 v1.11 §3.4: "never miss a government deadline" |
| AG-11 §3.5 | Recipe library (ready-made automations) | Cross-cutting | Pre-built, immigration-checked automations the firm switches on. R1: speed-to-lead, document-received acknowledgement + "Review document" task, missing-document chase, e-sign to onboarding, biometrics countdown, PR card/status expiry watch (on); no-show recovery, going-cold, post-consult (off). | Owner, Admin, Case Manager | Confirms one "Review your standard messages" screen; ticks recipes on/off; edits timings | Conductor, Mailer, Messenger, Tasker | Pack lead times and wording via the Immigration-SME | Seed messages wait as `APPROVE` "until the firm confirms the one **\"Review your standard messages\"** screen" (§3.5) | R1 recipes; "Still Release 2: the visual builder, firm-authored recipes" (§3.5) | AG-11 v1.11 §3.5: "switch on proven automation; don't build it from scratch" |
| AG-11 §3.6 | Execution safety (run once, retry, dead-letter) | Cross-cutting | Every action has its own idempotency key so a repeat delivery has no second effect; retries with backoff; dead-letter plus alert to manager. | Case Manager | Reviews dead-letter queue; retries or dismisses | Conductor | Idempotency key `(definitionId, triggerEventId, entityId, actionId, repeatIndex)` | No | R1 (NEW: "today there is no idempotency key") | AG-11 v1.11 §3.6: "idempotent · at-least-once · retry → dead-letter" |
| AG-11 §3.7 | Dry-run / simulation | Cross-cutting | Shows what an automation would do on real records without doing it, with "blast radius" counts; same renderer is the Needs you preview; quiet-set simulation for imported clients. | Authors; import operators | Runs simulation, reads plan, confirms | Conductor, all Doers in dry mode | Real rule evaluator | No | R1 (part of minimal Conductor, AG11-D3) | AG-11 v1.11 §3.7: "see what it would do before it does it" |
| AG-11 §3.8 | Enable/disable and versioning | Cross-cutting | Draft, enabled, disabled, archived; edits create a new version; disabling cancels pending steps (not standard deadline reminders). | Owner, Admin | Toggles, reviews version history | Conductor | — | No | R1 | AG-11 v1.11 §3.8 |
| AG-11 §3.9 | Run history and audit | Cross-cutting | Every run recorded with rule log and per-action result; per-record automation timeline; firm health counts. | Case Manager, Owner | Reviews what fired and why | Conductor | — | No | R1 | AG-11 v1.11 §3.9: "prove every automation fired, when, and to whom" |
| AG-11 §3.10 | Guardrails | Cross-cutting | Loop guard, consent gate on marketing, rate caps, entitlement gating, autonomy floor re-check, AI rules, quiet ("Not started") records skip client-facing actions. | (engine) | Sets firm rate caps | Conductor | Consent records; rate caps; AI terms record | AI floor; "No action submits anything to a government authority" (§3.10) | R1 | AG-11 v1.11 §3.10: "powerful, but it cannot run wild" |
| AG-11 §3.11 | Time zone and business hours | Cross-cutting | Schedules and deadlines computed in the firm/office time zone; client nudges held to business hours. | (engine) | Sets business hours (AG-1) | Conductor, Minder | Firm timezone | No | R1 (NEW: today "it is **not** timezone-aware") | AG-11 v1.11 §3.11 |
| AG-11 §3.12 | Country-pack-aware triggers | Cross-cutting | Which date fields, milestones and deadlines exist comes from the firm's one Country Pack. | Authors | — | Conductor, Minder | Country Pack | Domain values "→ Immigration-SME / Country Pack owner" | R1 | AG-11 v1.11 §3.12 |
| AG-11 §3.13 | Needs you (approval inbox) and Done for you | Cross-cutting | Staff home screen. Needs you holds only work prepared with no human present or waiting on a different person; each item shows what will happen, why, where each value came from, age and due time. Done for you lists the last 24 h of Doer work. | All staff; licensed users; form approvers; Owner | Approves, edits then approves, or rejects; reassigns; reviews stale items | All Doers; Minder for overdue reminders | Approval permissions; Team safeguards; licence-aware defaults | "**The practitioner stays the licensed decision-maker** — the Doers save the typing, not the judgement" (§3.13) | R1 | AG-11 v1.11 §3.13: "the Doers prepare; the practitioner decides" |
| AG-11 §3.13 Team safeguards | Team safeguards (one switch) | Firm (AG) | Four parts: four-eyes on government forms (when 2+ form approvers), Minder escalation, at-risk marks, supervisor visibility of unlicensed staff items; on automatically at 5+ active staff. | Owner | Switches off with recorded reason; nominates backup approver | (settings) | AG-16 `FirmTeamSafeguards` | Four-eyes: "the user who **prepared** a form draft cannot approve it" (§3.13) | R1 | AG-11 v1.11 §3.13 |


### AG-12

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-12 | Templates (firm library of messages and documents) | Firm (AG) | The firm's one library for everything it says or generates: emails, retainers, letters, invoices, checklists, messages; inherited from the central catalogue and adapted. | Owner/Principal RCIC, Manager (author/govern); reps, RCIC, billing consume implicitly (§2) | Adopts catalogue templates; edits and brands them; writes EN and FR bodies; publishes; rolls back; reviews central updates via diff | Consumed by Mailer, Messenger, Drafter, Signer, Biller via Conductor (Visual A) | SA-5 global/country catalogue; Country Pack locales; variable catalogue per type | Mandated clauses: "Regulator-mandated wording lives in the SYSTEM country template and is **confirmed by the Immigration-SME**" (BR-10) | Email/document/retainer/invoice/checklist Phase-1; "SMS/message templates are **designed now, live channels Phase-2**" (AG-12-34) | AG-12 v1.2 §1: "single source of truth for everything the firm *says* to a client or generates as a document" |
| AG-12 §3.0–3.1 | Template library and scope (central vs firm) | Firm (AG) | Firm sees its own templates plus published central ones it can adopt; firm version beats central default. | Owner, Manager | Browses, filters (e.g. missing French), adopts | — | SYSTEM vs CLIENT scope | No | R1 (scope model exists today) | AG-12 v1.2 §3.0: "firm override beats global default — is the heart of the whole module" |
| AG-12 §3.2–3.3 | Adopt, override and re-sync with central updates | Firm (AG) | Adopting copies a central template; edits mark it modified; central republish offers fast-forward (unmodified) or a 3-way diff (modified), never silent overwrite. | Owner, Manager | Reviews diffs per field and language; keeps/takes/merges; decides on central changes | — | Source version tracking | Firm decides: "merged on the firm's terms" (BR-4) | R1 (NEW build) | AG-12 v1.2 §3.2: "inherit the catalogue; override only what you need; central updates keep flowing" |
| AG-12 §3.4–3.5 | Merge fields and safe rendering with preview | Firm (AG) | Typed variables tied to real record fields; unknown variables block publish; rendering escapes data; preview in EN and FR with sample or real record. | Manager, Owner | Inserts variables from picker; previews; fixes flagged blanks | — | Variable catalogue (`TemplateVariableMapperService`) | No | R1 | AG-12 v1.2 §3.4: "variables are declared against real data, not free-text tags" |
| AG-12 §3.6 | Bilingual authoring (EN/FR) | Firm (AG) | One body per language with its own consent text; the client's language is picked at send; legal and consent text never machine-translated. | Owner, Manager | Writes both language versions; keeps them in sync | Doers select locale at send | Country Pack locales; Law 25 | "the system never auto-translates a disclaimer" (§3.6) | R1 | AG-12 v1.2 §3.6: "author once in two languages; the right one is sent automatically" |
| AG-12 §3.7 | Versions, draft/publish, rollback | Firm (AG) | Edits are drafts; publishing creates a version consumers use; rollback re-publishes an old version; publish blocked on failed checks. | Owner, Manager | Publishes, writes change notes, rolls back | — | Publish guards | No | R1 (NEW: "There is NO versioning today", §12) | AG-12 v1.2 §3.7: "content changes are deliberate, reversible, and auditable" |
| AG-12 §3.8 | Usage references | Firm (AG) | Shows which workflows and modules use a template; blocks archive of a used template; impact note on publish. | Manager | Checks usage before changing; reassigns consumers | Conductor (workflow steps reference templates) | — | No | R1 (NEW) | AG-12 v1.2 §3.8: "know what uses a template before you change or retire it" |
| AG-12 §3.9 | Template types and channels | Firm (AG) | Five families (email, document/letter, retainer, SMS/message, checklist) mapped onto entity-binding types plus a new channel dimension. | Owner, Manager | Chooses type | Mailer, Drafter/Signer, Biller | — | Retainer is "**Legal type:** strictest governance" (§3.9) | Partly NEW | AG-12 v1.2 §3.9 |


### AG-13

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-13 | Tasks, reminders, notes, activity timeline and audit log | Cross-cutting | The shared layer attached to every record: work to do, nudges, what was said, what happened, and who did what. | Every firm role; client sees only client-visible items; Super Admin reads audit cross-tenant (§2) | Creates and completes tasks; sets reminders; writes notes; decides what the client may see; reviews timeline and audit | Tasker, Reminder, Minder (standard deadlines), Notification, Timer; driven by Conductor | Country Pack deadline semantics; firm timezone | Note shared with client: "Marking a note client-visible is a **deliberate action**, **audited**" (§3.3) | R1 (core); some deferrals (§13) | AG-13 v1.12 §1: "the **connective tissue of the whole product**" |
| AG-13 §3.1 | Tasks (Tasker) and My Tasks | Cross-cutting | Tasks with owner, due date, priority, status, subtasks with required items; templates that create a checklist anchored to an event; My Tasks queue; Unassigned list. | Case officers (heaviest), reps, case managers | Creates, assigns, reassigns in bulk, applies checklist templates, completes tasks, works the Unassigned list | Tasker; Conductor auto-creates tasks | Task template content "→ SME" per country pack | No | R1 | AG-13 v1.12 §3.1: "every obligation has an owner, a due date, and a place it can't hide" |
| AG-13 §3.2 | Reminders (Reminder / Minder records) | Cross-cutting | Time-based nudges in app/email to staff or client, recurring, snoozable, timezone-correct; skipped if no longer relevant; ad-hoc reminders by users added. | Reps, case officers | Sets "remind me" reminders; snoozes when a client asks for time | Reminder; Conductor; Minder for standard deadlines | Firm timezone; deadline semantics from pack | No | R1 (email + in-app); "**Live SMS/WhatsApp reminder channels** (Release 2, via Messenger)" (§13) | AG-13 v1.12 §3.2: "the nudge that fires at the right moment, in the right timezone" |
| AG-13 §3.3 | Notes with internal / client-visible wall | Cross-cutting | Rich-text notes with @mention and pin; internal-only by default; client-visible only by a deliberate, audited action. | Case officers, RCIC, reps | Writes notes; @mentions colleagues; marks a note client-visible | Notification | — | Yes (judgement): marking client-visible is "a **deliberate action**, **audited**" (§3.3) | R1 (NEW) | AG-13 v1.12 §3.3: "a hard wall between internal and client-visible" |
| AG-13 §3.4 | Activity timeline | Cross-cutting | One filterable feed per record assembled at read time from notes, tasks, reminders, calls, messages, documents, timer, stage changes and audit. | Case officers, managers | Reads to pick up a colleague's file | (read projection; any Doer writing a typed record appears) | Source registry | No | R1 (NEW) | AG-13 v1.12 §3.4: "one filterable feed that reconstructs the whole story of any entity" |
| AG-13 §3.5 | Audit log (append-only, tamper-evident) | Cross-cutting | Records every consequential action with before/after diff; database denies edits; hash chain with periodic integrity check; every export logged; retention floor. | Owner, Admin (`agent/audit:read`); Super Admin | Reviews history; investigates disputes | (interceptor) | Retention policy | No | R1 hash chain; "**External signed audit store / WORM storage** (Release 2 or later)" (§13) | AG-13 v1.12 §3.5: "immutable, append-only, tamper-evident proof of who did what" |
| AG-13 §3.6 | Timer (billable time) | Cross-cutting | Records time spent on a record, billable or not, flowing to invoices (AG-6). | Billing, consultants | Starts/stops timer or types time entries | Timer | Activity types | No | R1 manual entry; live widget open (§13 Q8) | AG-13 v1.12 §3.6 |
| AG-13 §3.8 | Conductor ↔ AG-13 contract | Cross-cutting | Conductor calls the same task-create and reminder-schedule services a human calls; AG-13 emits `task.*`, `note.*`, `reminder.*` events. | (engine) | — | Conductor, Tasker, Reminder | — | No | R1 | AG-13 v1.12 §3.8: "One record type, two creators, zero duplication" |
| AG-13-65/66 | Tasks from dated case items; orphaned deadlines | Cross-cutting | A dated case item or Minder standard deadline creates a task linked to the file; completing either completes both; deadline on a file with a deactivated owner creates an unassigned task and alerts reassigners. | Case officers, case managers | Completes tasks; reassigns orphaned work | Minder, Tasker | AG-11-47 standard deadlines | No | R1 ("depends on the Minder, which is not built today") | AG-13 v1.12 AG-13-65 |


### AG-14

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-14 | Reporting and analytics (the Reporter) | Firm (AG) | Read-only dashboards across sales, cases, money, workload and deadlines, in one currency, scoped to what the viewer may see, drillable to records. | Owner (headline), Case Manager, reps, case officers, Billing/Finance, compliance (§2) | Reads dashboards; filters and segments; saves views; schedules reports; exports; drills into records to act | Reporter (aggregation engine); Mailer for scheduled reports; Scheduler (cron) | Pre-computed rollups; FX snapshots; SLA and deadline definitions from SME | No | R1 seeded dashboards; corporate dashboard Release 2 (AG-14-34) | AG-14 v1.10 §1: "the firm's **single, trustworthy lens on its own business**" |
| AG-14 §3.1 | Sales and pipeline analytics | Firm (AG) | Funnel, conversion, time in stage, source/campaign return to paying clients, rep leaderboard, weighted forecast vs quota. | Owner, Case Manager, reps | Reviews bottlenecks; coaches reps | Reporter | AG-2 attribution rule | No | R1 | AG-14 v1.10 §3.1 |
| AG-14 §3.2 | Case and delivery analytics | Firm (AG) | Case load, stage durations, on-time %, deficiencies and SLA breaches, processing times. | Case Manager, case officers | Finds stalled cases; drills in | Reporter | SLA definitions "→ SME" | No | R1 | AG-14 v1.10 §3.2: "see where cases stall before a client tells you" |
| AG-14 §3.3 | Financial analytics | Firm (AG) | Billed vs collected, AR aging, overdue by client, mix by service/program/office, FX-normalised. | Billing/Finance, Owner | Works overdue-by-client list for collections | Reporter | `FxRateSnapshot`, reporting currency | No | R1 (NEW) | AG-14 v1.10 §3.3 |
| AG-14 §3.4 | Productivity analytics | Firm (AG) | Workload per person, task throughput, calls, time, over/under-load flags. | Case Manager | Rebalances workload | Reporter | — | No | R1 | AG-14 v1.10 §3.4: "Rebalancing signal, not surveillance" |
| AG-14 §3.5 | Compliance and deadline adherence | Firm (AG) | Deadline adherence, upcoming deadlines, at-risk list (if switched on), SLA breach trend, audit-event volume. | Compliance officer, Owner | Exports adherence for review | Reporter; Minder data | Deadlines from Minder | No | R1 | AG-14 v1.10 §3.5: "prove the firm is in control" |
| AG-14 §3.6–3.8 | Role dashboards, filters, saved views, drill-through | Firm (AG) | Seeded dashboards per role; same widgets scoped by the viewer's permission; filters only narrow; every number clicks to its records. | All staff | Picks dashboard, filters, saves views | Reporter | Report keys `view.own` / `view.all` / `view-financial` | No | R1 | AG-14 v1.10 §3.8: "a number is never a dead-end" |
| AG-14 §3.9 | Scheduled reports by email | Firm (AG) | Report delivered on a cadence, rendered with the schedule owner's permission, re-checked each run. | Case Manager, Owner | Sets up schedules and recipients | Scheduler, Mailer | Firm timezone, locale | No | R1 | AG-14 v1.10 §3.9: "the report comes to you" |
| AG-14 §3.10 | Export (CSV/XLSX) | Firm (AG) | Exports exactly what is on screen; permission-scoped; every export audited. | Holders of `agent/report:export` | Exports | — | — | No | R1 | AG-14 v1.10 §3.10 |


### AG-15

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-15 | Client portal management (firm side) | Firm (AG) | The firm's controls over the client portal: invite and govern access, choose what the client sees, ask for work, brand it, watch engagement, message. The client's own app is CP-01. | Case Officer (heaviest), RCIC, intake, Owner/Manager, Billing, Corporate Account Manager (§2) | Invites clients; configures visibility; requests documents and questionnaires; reviews uploads; nudges stalled clients; completes items on the client's behalf | Mailer, Messenger (via AG-10), Signer, Biller, Conductor (auto-nudges) | Firm portal policy (AG-1); visibility config | Signatures never on behalf: "a signature made by the firm would be false and worthless" (§3.4) | R1 (firm side "almost entirely NEW", §3.0) | AG-15 v1.6 §1: "the firm's **control plane for the client experience**" |
| AG-15 §3.1 | Portal invite and access lifecycle | Firm (AG) | Invite, resend, suspend, restore, revoke, force-logout; manual invite to a "Not started" client allowed; R1 principal applicant only. | Case officer, intake | Clicks invite/resend; suspends or revokes with a reason | Mailer | Token TTL policy | No | R1 | AG-15 v1.6 §3.1: "grant access in one click; govern it for life" |
| AG-15 §3.2 | Corporate access | Firm (AG) | Employer's primary contact sees the employer's LMIA files (position counts after decision, no worker details); worker gets their own individual case portal. | Corporate Account Manager | Chooses which LMIA files are in the employer's roster; flips the per-file portal switch | — | AG-17 decisions | No | R1 primary contact only; seats later (AG-15-12) | AG-15 v1.6 §3.2 |
| AG-15 §3.3 | Visibility configuration | Firm (AG) | Per-case allow-list of what the client sees (progress with client-friendly stage labels, documents, questionnaire, invoices, agreements, messaging) plus the per-case switch for the client doing their own items in the portal; live preview. | RCIC, case officer, Owner (default) | Sets toggles; writes client-friendly stage labels; previews | — | Firm default in AG-1 | Client-friendly labels routed to SME so they do not over-promise (§13 note) | R1 | AG-15 v1.6 §3.3: "the firm decides exactly what the client sees; internal work stays internal" |
| AG-15 §3.4 | Client work items (documents, questionnaire, invoice, e-sign, message asks) | Firm (AG) | Every ask of the client is a tracked to-do; client action flips status; staff review uploads (accept / reject with reason); staff may complete uploads or questionnaires "on behalf". | Case officers | Requests documents from library/checklist; reviews each upload; accepts or rejects with reason; records items received by email/phone | Signer (e-sign), Biller (invoice), Notification | AG-8/AG-9 checklist | Review is a person: "firm actions are review verbs (accept/reject/remind/withdraw)" (BR-7) | R1 | AG-15 v1.6 §3.4: "every ask becomes a tracked to-do the firm can watch" |
| AG-15 §3.5 | White-label branding | Firm (AG) | Firm logo, colours, sender on portal and portal emails; custom domain plan-gated. | Owner | Uploads logo, sets colours, sender, domain | Mailer | AG-1 config | No | R1 brand + sender; custom domain proposed R2 (§13 Q2) | AG-15 v1.6 §3.5: "the portal is the firm's, not ours" |
| AG-15 §3.6 | Engagement monitoring and nudges | Firm (AG) | Tracks client activity; flags stalls (no login N days, document pending); one-click branded nudge or Conductor auto-nudge that stops when the client acts. | Case officer, Manager | Watches stall dashboard; clicks "Nudge" | Mailer/Messenger, Conductor | Stall threshold, business hours | No | Manual nudge R1; auto-nudge open (§13 Q4) | AG-15 v1.6 §3.6: "see who's moving, rescue who's stalled" |
| AG-15 §3.7 | Secure messaging governance | Firm (AG) | Enables/disables the AG-10 client conversation per client/case and shows case-tagged messages. | Case officer | Messages the client | (AG-10) | — | No | R1 | AG-15 v1.6 §3.7 |
| AG-15 §3.8 | Client language | Firm (AG) | Client chooses own language; everything client-facing follows. | Client; staff set initial | Sets locale at invite | Mailer, Messenger | Offered locales (AG-1) | No | R1 | AG-15 v1.6 §3.8 |
| AG-15 §3.9 | Access audit and security monitoring | Firm (AG) | Log of client portal events and firm access actions; session list with per-session revoke; failed-login bursts or geo-anomalies raise a notification. | Owner, case officer | Reviews access log; revokes sessions | Notification | — | No | R1 (NEW) | AG-15 v1.6 §3.9: "every client touch on the record; isolation provable" |


### AG-16

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-16 | Firm settings and integrations | Firm (AG) | The firm's control room: identity and brand, invoice rules, notification policy, its own mailbox/calendar/payment/WhatsApp connections, data export, security, plan view, and the AI, autonomy, safeguards and timing switches. | Owner/Principal RCIC (heaviest), Admin, Billing/Finance, consultants (own prefs), compliance (§2) | Configures settings infrequently but consequentially; connects accounts; exports data; switches AI on; decides safeguards | Configures rails used by Mailer, Scheduler, Biller, Messenger; settings read by Conductor and Doers | Super Admin plan and provider records (SA-08/SA-11) | "**the firm decides**" (§1); floors fixed: "a human approves AI-written text before it reaches a client" (§1) | R1 (most NEW, §12) | AG-16 v1.12 §1: "the firm's **control room**" |
| AG-16 §3.1 | Firm profile, branding, locale and money defaults | Firm (AG) | Legal identity and designated person (Owner-only legal profile), white-label branding, default locale/timezone/business hours, reporting currency and FX source. | Owner, Admin | Types profile, uploads logo/signature, sets currency | — | — | Designated person/credential maintained by licensed person or Owner/Admin | R1 | AG-16 v1.12 §3.1: "the firm makes the product unmistakably theirs" |
| AG-16 §3.2 | Invoice numbering, tax and terms | Firm (AG) | Per-office numbering (atomic), tax label/rate, terms, invoice currency, bilingual footer feeding the Biller. | Billing/Finance, Admin | Sets numbering formats and tax | Biller | Tax values routed to SME | No | R1 (numbering exists; tax/terms NEW) | AG-16 v1.12 §3.2 |
| AG-16 §3.3 | Notification policy and personal preferences | Firm (AG) | Firm matrix of event × channel × audience with quiet hours; users opt down within it. | Admin; every user for own prefs | Sets matrix; picks own channels and language | Notification | — | No | R1; SMS Release 2 | AG-16 v1.12 §3.3 |
| AG-16 §3.4 | Own-account integrations (mailbox, calendar, payment, WhatsApp) | Firm (AG) | Connect the firm's own SMTP/Gmail/Microsoft/IMAP, calendar, Stripe, WhatsApp; verified, health-monitored, secrets write-only; fallback to platform rails (payment held unless plan permits). Holds the approved WhatsApp template list. | Owner (payment), Admin | Enters credentials or runs OAuth; tests; reconnects; maintains WhatsApp template mapping | Mailer, Scheduler, Biller, Messenger | Super Admin approved providers (AG11-D14) | Payment connect Owner-only (SA6-D5) | R1 mailbox (3 options), WhatsApp; calendar R1 provider open (Q3) | AG-16 v1.12 §3.4: "connect the firm's OWN mailbox, calendar, and payment processor; if not, the platform carries it" |
| AG-16 §3.5 | Data export and portability | Firm (AG) | Whole-firm export (Owner-only), including Needs-you approval history and import batch reports; per-individual PIPEDA data package; every export audited. | Owner; staff with `agent/data-export:request` | Requests exports; produces a client's data package on request | — | — | No | R1 (NEW: "**There is NO data export** of any kind") | AG-16 v1.12 §3.5 |
| AG-16 §3.6 | Firm security policy | Firm (AG) | MFA requirement and IP allow-list with self-lockout guard; sessions a locked platform rule; audit viewer. | Owner, Admin | Sets MFA and IP list; reviews audit | — | — | No | R1 or R2 open (Q5) | AG-16 v1.12 §3.6 |
| AG-16 §3.7 | Plan and usage (read-only) | Firm (AG) | Shows plan features and usage vs limits; request upgrade. | Owner | Requests upgrade | — | Super Admin plan | No | R1 (NEW) | AG-16 v1.12 §3.7 |
| AG-16 §3.8 | Views and Minder settings | Firm (AG) | Individual/Corporate view for every firm; escalation and at-risk marks switches (now Team safeguards parts). | Owner, Admin | Switches on/off | Minder | — | No | R1 | AG-16 v1.12 §3.8 |
| AG-16 §3.9 | AI Doers switch, who approves AI text, per-recipe autonomy, WhatsApp | Firm (AG) | One AI switch for all four AI Doers, locked until Super Admin records Canada-only provider terms; Owner switches on with acknowledgement; "Send automatically / Ask me first" per recipe; floors shown locked. | Owner (AI switch-on, approver setting), Admin | Switches AI on; chooses approvers; sets recipe autonomy | Reader, Sorter, Drafter, Checker; Conductor | SA-08, SA-11 terms record | Floors "SHALL NOT be editable by any role" (AG-16-36) | R1 (built but locked off until terms recorded) | AG-16 v1.12 §3.9: "the firm decides whether AI helps, and how much runs without a human" |
| AG-16 §3.10 | Team safeguards | Firm (AG) | One switch, four parts; on automatically at 5 active staff; Owner-only off with reason; backup approver; 7-day grace. | Owner | Switches off with reason; nominates backup | Minder; Needs you | — | Four-eyes on government forms (part 1) | R1 | AG-16 v1.12 §3.10: "easy for solo, safe for teams" |
| AG-16 §3.11 | Supervised client messages | Firm (AG) | Standalone setting, on once an unlicensed user can message clients; their client messages wait for a licensed approver; Owner route if none. | Owner; licensed users | Licensed users approve; Owner may switch off with reason | (AG-10 holds the message) | Licensed-user link (AG-01 §3.5) | "waits for approval by a licensed user" (§3.11) | R1 | AG-16 v1.12 §3.11 |
| AG-16 §3.12 | Review your standard messages | Firm (AG) | One first-run screen listing seeded messages with preview and "Looks good — start sending". | Owner or template publisher | Reads and confirms seeded messages | Conductor | AG-12 publish | Firm approval of templates once | R1 | AG-16 v1.12 §3.12: "the firm reads the seeded messages once, then they send" |
| AG-16 §3.13 | Reminders and waiting times | Firm (AG) | Five firm values: chase 5/7/4, approval overdue 2 working days, deadline lead 2 working days; limits 1–30, 1–10. | Owner, settings editors | Adjusts values | Conductor, Minder | — | No | R1 | AG-16 v1.12 §3.13: "the firm sets how patient the product is" |


### AG-17

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-17 | Corporate cases and LMIA | Firm (AG) | The corporate practice where the employer is the client; first service is the LMIA, from onboarding through advertising, recruitment, quality check, submission, decision, and handing each approved position to the worker's own case. | Case Officer (heaviest), RCIC/licensed representative, Owner, Accounts, Employer HR (portal), worker (own case), content team (SA-01B) (§2) | Runs LMIA files; logs adverts and candidates; checks ad vs job offer vs job details; signs off; records submission and decision; matches workers; produces inspection pack | Minder (dates), Conductor, Tasker (via AG-13), Mailer (AG-10), Biller (AG-06), Signer (AG-05) | Canada pack content via SA-01B: rows per stream, action lines, government steps, reference tables (wage thresholds, advertising rules, refusal areas, cap, fee, validity) | Sign-off: `agent/case:review-approve`; waive critical warnings with a reason; "Retainer generation needs an active licensed consultant" (AG17-D58) | R1 "full-fledged LMIA" (AG17-D51); some items R2 (§0.1) | AG-17 v0.5 §1: "the part of the Agent console where the **employer is the client**" |
| AG-17 §3.1 | LMIA as pack content | Admin (SA) / Firm | All LMIA rules, steps, documents and rule values are dated pack data maintained by the content team; new files start on current rules; in-progress files keep theirs unless staff adopt newer rules. | Content team; firm (adds own items) | Content team updates dated reference values; second-person approval; firm adds own checklist/action items | — | SA-01B rows, lines, four extensions, slots; reference tables with source, date checked, next review | Rule values: "must be confirmed on canada.ca by the immigration expert" (§3.1) | R1 (hard dependency on SA-01B row-and-line model, AG17-D72) | AG-17 v0.5 §3.1: "the rules are data; the content team keeps them current" |
| AG-17 §3.2 | Block 1: employer and position set-up, wage check | Firm (AG) | Captures job (location, occupation, wage, positions, start); wage check proposes high/low-wage stream with source shown; prevailing wage, refusal-area and cap checks raise warnings; employer questionnaires; quick informational check on prospects. | Case officer | Enters job details; confirms stream; records prevailing wage if no table value; fills or sends employer questionnaires | — | Wage-threshold, prevailing-wage, refusal-area, cap tables | Staff confirm the proposed stream: "staff confirm" (AG17-D26) | R1 | AG-17 v0.5 §3.2: "one source of truth for the job, checked against the rules before anything else happens" |
| AG-17 §3.3 | Block 2: LMIA Application Wizard | Firm (AG) | Nine-step corporate journey auto-laid-out from pack lines and answers; "What's next" list of open items; board position computed. | Case officer; employer (portal switch on) | Ticks, uploads, waives with reason, marks not applicable, reassigns; sends "Request outstanding items" | Minder; Mailer (AG-10) | Pack row lines; "only if" conditions | No | R1 | AG-17 v0.5 §3.3: "the file lays itself out, and always says what's next" |
| AG-17 §3.4 | Block 3: recruitment compliance | Firm (AG) | Channels with proof and advertising clock ("day X of Y"); candidate log with residence status, outcome and rejection reason; recruitment report generated from template; warnings by severity. | Case officer | Logs each channel and screenshots; logs every applicant and reason (or CSV import); generates report | Minder; template renderer (AG-12/SA-05) | Advertising-rules table by stream; answer lists | Rejection reasons captured by staff | R1 (staff-only entry; recruitment engine R2) | AG-17 v0.5 §3.4: "every ad, every applicant, every reason, provable six years later" |
| AG-17 §3.5 | Block 5: quality check before submission and sign-off | Firm (AG) | One readiness view: three-way consistency (ad ↔ job offer ↔ job details), advertising rules, documents, previous refusal addressed, set-up checks re-run; waive CRITICAL with reason; sign-off records signer and waived items. | RCIC / sign-off holder; case officer | Ticks "duties match" per ad/offer; fixes or waives warnings with reasons; signs off | — | AG-07 readiness; pack gates | Yes: sign-off `agent/case:review-approve`; "a person with the waive permission, with a reason" (§3.5) | R1 | AG-17 v0.5 §3.5: "one view, everything that could sink the file" |
| AG-17 §3.6 | Block 6: submission and decision | Firm (AG) | Records submission (filed outside the product on the government portal), officer contacts with deadlines, decision with positions approved, validity clock, refusal root cause, re-apply, withdraw; processing fee after submission. | Case officer | Uploads submitted package; logs officer contact; records decision and letter; chooses positions not approved; records fee request and receipt | Minder; Biller (government fee line) | Validity and fee tables | Recording is manual: "The LMIA is filed on the **government portal**, outside Expat Ready" (§3.6) | R1 | AG-17 v0.5 §3.6: "what happened, when, and what it means next" |
| AG-17 §3.7 / 3.7a | Block 7: worker tracking, after approval, change requests | Firm (AG) | Each position gets a worker; milestones tracked until "Create work permit case" opens the worker's individual case with LMIA data and shareable documents copied; validity warnings; change requests with "Change pending" on affected positions. | Case officer | Matches workers; creates permit cases; records milestones; logs change requests; applies approved changes | Minder | Validity table; change-request types | Staff apply approved changes: "Nothing changes silently" (§3.7a) | R1 | AG-17 v0.5 §3.7: "from approved position to worker at work" |
| AG-17 §3.8 | Block 8 (light): record-keeping date and inspection pack | Firm (AG) | Shows record-keeping end date; one click bundles evidence documents for an inspector (waivers and internal judgement stay in the file). | Owner, case officer | Clicks Generate inspection pack | (AG-07 core bundles) | — | No | R1 light; full compliance R2 | AG-17 v0.5 §3.8: "inspection-ready from day one" |
| AG-17 §3.9 | LMIA board, corporate view, corporate panels | Firm (AG) | Board by journey step with "next due" chip and critical count; saved filters; corporate dashboard R2; corporate panels on the AG-07 client screen. | Case officers, Owner | Uses board and filters; moves card forward manually before submission | — | — | No | R1 board; dashboard R2 | AG-17 v0.5 §3.9: "the corporate practice at a glance" |


### AG-18

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |
|---|---|---|---|---|---|---|---|---|---|---|
| AG-18 | Data import and migration | Firm (AG) | One safe import engine that brings a firm's existing clients, leads, cases, key dates, documents, notes and past correspondence into ExpatReady; dry-run first, undo as a batch, imported clients silent until switched on. | Owner (decides, attests), Admin/Operations (runs), RCIC/Case Officer (verifies values after), Sales (lead lists), Expat Ready Support (assisted migration) (§2) | Prepares spreadsheets; maps columns, values and program names; reviews dry-run; confirms; attests right to transfer; files unplaced documents by hand; verifies imported values; switches clients on after preview | Reader (documents), Minder (key dates), Conductor (quiet-set simulation, skip rules) | Country Pack program list, key-date types, document types; AG-02 Party service | "**Nothing is written without a human confirm**" (§3.2); Owner attestation on every batch with personal data (AG-18-49) | R1 (AG18-D1); invoices/payments and Clio adapter R2 | AG-18 v1.2 §1: "the **front door for a firm's existing work**" |
| AG-18 §3.0–3.1 | Import engine, targets, formats and file safety | Firm (AG) | One pipeline (upload/scan → map → dry-run → confirm → job → report → undo) for targets PARTY, CLIENT, LEAD, CASE, CASE_KEY_DATE, DOCUMENT, NOTE, CORRESPONDENCE; CSV/Excel templates, free-column mapping, zip; virus scan first. | Admin | Downloads templates and fills them from old spreadsheets; uploads | — | AG-9 allow-list and scan | No | R1; Officio and CaseEasy adapters R1 only after a checked sample (AG18-D12) | AG-18 v1.2 §3.0: "one pipeline, one safety level, many targets" |
| AG-18 §3.2 | Mapping fields, values and programs | Firm (AG) | Each source column mapped to a field; fixed values mapped; every distinct source program name grouped with look-alikes and mapped to a Country Pack program, suggestions pre-filled but confirmed per group. | Admin | Maps columns, values and program names; confirms each group; saves mappings | — | Country Pack program list | "a pre-filled suggestion that is not confirmed counts as unmapped" (§3.2) | R1 | AG-18 v1.2 §3.2 |
| AG-18 §3.3 | Validation, duplicate detection, dry-run preview | Firm (AG) | Schema-validates every row; detects exact duplicates (merge fills empty fields only, skip, error) and flags possible duplicates; mandatory dry-run with per-row outcomes and past-date choice. | Admin, Owner | Reviews per-row outcomes and warnings; fixes file or mapping; decides on possible duplicates | — | Row schemas; natural keys | Possible duplicates "never merged automatically" (AG-18-13) | R1 | AG-18 v1.2 §3.3 |
| AG-18 §3.4 | Import job, cases, key dates, notes, history | Firm (AG) | Async row-by-row job; imported cases pinned to current pack version with nothing inferred; key dates (pack-declared types only) registered with the Minder; past dates recorded without reminder by default; notes and correspondence imported as historical, never-send. | Admin, Owner | Chooses past-date policy; reviews "N past dates found" summary | Minder | Pack key-date types and lead times (SME) | No | R1 | AG-18 v1.2 §3.4 |
| AG-18 §3.5 | Documents: bulk, zip, Reader filing, review list | Firm (AG) | Files scanned; Reader classifies type and proposes owning record; unplaced files (or all files while AI is off) go to a review list; extracted values stay proposed and are reviewed per document. | Admin, case officers | Files review-list items by hand; reviews and approves extracted values per document | Reader | AG-9 lifecycle | Approving a value "verifies it ... and needs `agent/sqr:verify`" (§3.5) | R1 (Reader built but off until terms recorded) | AG-18 v1.2 §3.5 |
| AG-18 §3.6 | Provenance and "Verify imported values" | Firm (AG) | Every imported value stamped with source, date, user; spreadsheet values unverified until a person checks them against a document or own records (attestation recorded). | Case officers / verifiers | Checks each imported value; records attestation; confirms | — | AG-08 verify mechanism | "Unverified values never feed the Filler unchecked" (§3.6) | R1 | AG-18 v1.2 §3.6 |
| AG-18 §3.7 | Silence to the client: "Not started" until switched on | Firm (AG) | Imported clients, leads, cases are QUIET; no client-facing automation until "Start client automations" with a preview by recipe and action type; Pause available; Owner reminders at 7 and 30 days. | Owner, Admin, file owners | Reviews preview; unticks action types; confirms switch-on; pauses | Conductor (quiet-set simulation, skip on QUIET) | Consent gate; rate caps | Unlicensed file owner's switch-on "waits for a licensed user's approval" (AG-18-86) | R1 | AG-18 v1.2 §3.7: "quiet until the firm switches it on" |
| AG-18 §3.8 | Undo a whole batch | Firm (AG) | Within 14 days removes what the batch created and restores merged records, except records worked on since. | Owner, Admin | Clicks undo; reviews exclusions | — | — | No | R1 | AG-18 v1.2 §3.8 |
| AG-18 §3.9 | Assisted migration by Expat Ready support | Admin (SA) / Firm | On the Owner's written request, support maps and runs the import from firm storage, never seeing personal data; audited in both consoles; free at launch. | Expat Ready Support; Owner | Owner uploads source, writes request, attests; support maps and runs | — | SA-02 support session; SA-07/SA-10 key (pending) | Owner's written request and attestation | R1 but "blocked until the SA-07/SA-10 key exists" (AG-18-79) | AG-18 v1.2 §3.9 |
| AG-18 §3.10 | Lead import adapter (AG-2) | Firm (AG) | AG-2 lead CSV import runs as a target on this engine; imported leads never start speed-to-lead. | Sales / Intake | Maps and imports lead lists | — | — | No | R1 | AG-18 v1.2 §3.10 |


## Part 2: Doers and engines seen in this slice


### AG-10

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Mailer | In-house Doer that sends email over the firm's email rail; queued, deduped, tracked | Entity, template, locale, attachments → queued send, `Communication` on timeline, delivery events | Deterministic | AG-10 v1.9 AG-10-1, §3.1 |
| Messenger | In-house Doer for WhatsApp, portal chat and (R2) SMS; one conversation per client | Entity, channel, text or approved template → message on conversation and timeline | Deterministic | AG-10 v1.9 §3.4, AG-10-16 |
| Sorter (AI Doer) | Matches inbound email/WhatsApp to a file beyond header matching, classifies the message, files attachments with a proposed document type, emits `message.received` | Inbound message + firm-scoped candidate list → proposal with provenance and confidence (`SorterResult`) | Deterministic signals first, then AI judgement; AI-only matches always go to a human | AG-10 v1.9 AG-10-37, AG-10-38 |
| Drafter (AI Doer) | Proposes subject and body for client messages, called by a rep or by any recipe | Request + context → draft (never sends) | AI judgement; output always needs human approval | AG-10 v1.9 AG-10-15, AG-10-44 |
| Consent gate (engine) | Classifies transactional vs marketing and checks live consent and suppression per recipient at send time | Send request → allow (with reason) or skip and log | Deterministic | AG-10 v1.9 AG-10-22, BR-16 |
| Conductor | Fires recipe steps that call Mailer/Messenger; receives reply, unsubscribe, STOP, bounce and `message.received` signals | Step + entity + template → send; inbound events → exit or halt | Deterministic | AG-10 v1.9 §3.10, AG-10-31 |
| Notification service | Creates firm- and user-scoped notifications, fans out per preference | Module event → notification | Deterministic | AG-10 v1.9 §3.7 |
| Minder | Reminds the owner about pending client messages never approved | Pending item age → reminder | Deterministic | AG-10 v1.9 §9: "is reminded to the owner through the Minder (AG11-D2)" |


### AG-11

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Conductor (Workflow engine) | Listens for triggers, evaluates conditions, sequences and schedules actions, retries, records; never does the work itself | Event → run with per-action results | Deterministic | AG-11 v1.11 §3.0: "It **never** sends an email, writes a task, or files a reminder itself" |
| Reminder | Time-based nudge | Date/offset → reminder | Deterministic | AG-11 v1.11 §3.0 |
| Minder | Watches a deadline or condition, cascades reminders/escalation, stops when satisfied | Registered date + satisfaction condition → reminders, alerts, at-risk mark | Deterministic | AG-11 v1.11 §3.4 |
| Tasker | Creates and assigns tasks | Action config → task | Deterministic | AG-11 v1.11 §3.0 |
| Mailer / Messenger | Sends email and WhatsApp (SMS R2) | Template + recipient → message | Deterministic | AG-11 v1.11 §3.0 |
| Reader (AI) | Reads uploaded documents, proposes profile values with provenance and confidence, plus document type. R1: identity documents incl. passport MRZ, IRCC/government letters, language test results, ECA reports | Document → proposed values + type (`document.extracted`) | AI judgement; approval = verification | AG-11 v1.11 §3.0, AG11-D4, AG11-D10 |
| Sorter (AI) | Classifies inbound email/portal/WhatsApp, matches to a file, files attachments | Message → proposed match + classification | Deterministic signals + AI; AI-only never files | AG-11 v1.11 §3.0 |
| Drafter (AI) | Prepares a message; "always followed by a send action whose autonomy is at least `APPROVE`" | Context → draft | AI judgement; always approved | AG-11 v1.11 §3.3 |
| Checker (AI) | Cross-checks name, date of birth, document numbers and dates across documents, profile and forms; raises warnings | Records → warnings to Deficiency Library (`deficiency.detected`) | AI judgement; "warnings — never a lock" | AG-11 v1.11 §3.0 |
| Filler | Prepares government form drafts (owned by AG-07); approving its draft is the consultant approval | Profile → form draft | Deterministic; human approval required | AG-11 v1.11 AG11-D8 |
| Reviewer | AG-07's reviewer finds deficiencies (emits `deficiency.detected`) | Case → deficiencies | Not specified in this slice | AG-11 v1.11 §3.1 |
| Module verbs: `change_stage` (prospects only), `assign`, `arm_minder` | Other modules' actions the Conductor can call | — | Deterministic | AG-11 v1.11 §3.3 |


**The Conductor's full model (AG-11 v1.11), as written**
- **Triggers** (§3.1, AG-11-4 to AG-11-9, AG-11-74): entity events (`prospect.created`, `prospect.stage_changed`, `case.milestone_reached`, `document.received`, `document.verified`, `invoice.paid`, `envelope.signed`, `deadline.approaching`, plus today's CREATED/UPDATED/…); scheduled scans with "atomic claim"; date-field anchored ("14 days *before* `biometricsDueDate`"); manual runs ("permissioned, audited"); agent-native `message.received`, `document.extracted`, `deficiency.detected`, `profile.changed`. Event envelope: "`{module, eventType, entityId, entityData, firm_id, userId, ts, origin}`" (§3.1). Bus = "in-process domain events ... feeding the **Bull queue**" (§7 note).
- **Conditions** (§3.2, AG-11-10 to 12): "nested rule groups combined with `AND`/`OR`, each condition a `(fieldPath, operator, value)`", date operators `expires_in_days` etc.; "This is **fully built today**". Non-match recorded as SKIPPED with `ruleLog`.
- **Actions** (§3.3, AG-11-13 to 16, AG-11-2): `send_mail`, `send_message`, `send_notification`, `create_reminder`/`send_reminder`, `create_task`, `change_stage` (prospects only), `assign`, `arm_minder`, `read_document`, `sort_message`, `draft_message`, `check_consistency`. Ordered; per-action repeat with stop-conditions `RULE_NOT_MATCHED | ENTITY_DELETED | WORKFLOW_DEACTIVATED | MAX_REPEATS`, "re-evaluating the rule before each repeat". Actions are "non-fatal to each other".
- **Autonomy** (AG-11-51 to 54): AUTO / APPROVE / OFF, shown "Send automatically / Ask me first / Off"; defaults table §3.3; floors re-checked "at run time"; "No Doer action SHALL submit anything to a government authority, at any autonomy level" (AG-11-54).
- **Recipes** (§3.5, AG-11-21 to 24, 75, 76, 91, 106, 107): config-as-data; R1 seeds enabled at provisioning (speed-to-lead; document-received acknowledgement + "Review document" task; missing-document chase 5/7/4 defaults; e-sign → onboarding); five more R1 recipes (biometrics countdown and expiry watch on; no-show, going-cold, post-consult off). Recipe version recorded; upstream updates "**offered** (not silently overwritten)". R1 firms can switch on/off, set autonomy, change timings; editing triggers/conditions/actions "needs the Release 2 builder" (§3.5 data flow).
- **Idempotency** (§3.6, AG-11-25, BR-4): key "`(definitionId, triggerEventId, entityId, actionId, repeatIndex[, externalEventId])`"; approval item carries the key; at-least-once delivery, exactly-once effects; retry with exponential backoff; dead-letter with manager notification. Open: "how long do we retain idempotency keys" (§13 Q5).
- **Consent and send-time re-checks** (§3.10, AG-11-37, 38, BR-8, BR-11, BR-22): marketing actions check "express consent at send time, per recipient"; rate caps per firm and per recipient; quiet ("Not started") check before each action; deactivated-recipient skip (BR-18); an approved item "passes every send-time rail ... as if it had run on its own, under its original idempotency key" (BR-22); approve refused if rendering version changed (AG-11-61).
- **Loop guard** (AG-11-36, BR-10): "max chain depth + per-entity-per-event de-dup".
- **Simulation** (§3.7, AG-11-29, 30, 95): zero side-effect dry-run with blast-radius counts; same renderer is the approval preview: "One renderer, so what is approved is what is sent."
- **Audit** (AG-11-43, 62, 72, 98): authoring, enabling, simulating, manual run, dead-letter retry, autonomy changes, every Needs you and inline decision, Team safeguards changes, supervision changes, Owner-without-licensed-user approvals, AI switch acknowledgement, "Review your standard messages" confirm, template publishes; `AiRunLog` for every model call; Restricted fields audited as "the field key and a hash"; retention interim `ApprovalItem` 2 years, `AiRunLog` 1 year.
- **Run lifecycle** (§6): QUEUED → idempotency check (NO-OP) → EVALUATING → SKIPPED / actions → AWAITING_APPROVAL → SUCCESS / PARTIAL/FAILED → DEAD-LETTERED. Approval item: PENDING → APPROVED / EDITED_APPROVED / REJECTED / CANCELLED; "there is no timeout transition".


### AG-12

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Template renderer (engine) | Logic-less, auto-escaping substitution of typed variables; single pass | Template version + record + locale → rendered text | Deterministic | AG-12 v1.2 AG-12-18 |
| Variable catalogue (engine) | Per-type typed variables bound to real fields | Template type → variable list | Deterministic | AG-12 v1.2 AG-12-14 |
| Mailer, Messenger, Drafter, Signer, Biller | Consume published template versions | Published version → send / generate | Deterministic (Drafter: AI) | AG-12 v1.2 Visual A: "Doers: Mailer / Messenger / Drafter / Signer / Biller" |
| Conductor | References templates by id in workflow steps | — | Deterministic | AG-12 v1.2 §1 |


### AG-13

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Tasker | Its record is the Task; created by people, templates or the Conductor | Title, owner, due date → Task + notification | Deterministic | AG-13 v1.12 §3.1 |
| Reminder | Fires queued nudges, recurring, skip-if-stale, daily dedup per recipient | Reminder row → notification/email | Deterministic | AG-13 v1.12 §3.2 |
| Minder | Standard deadlines registered by modules; creates tasks from deadlines | Deadline → task / reminder | Deterministic | AG-13 v1.12 AG-13-65 |
| Notification Doer | task-assigned, note-mention, reminder-fired, overdue-escalation (opt-in), orphaned deadline | Event → notification | Deterministic | AG-13 v1.12 AG-13-61 |
| Timer | Effort accounting flowing to billing | Minutes, rate → billing amount | Deterministic | AG-13 v1.12 §3.6 |
| Dialer | Calls logged appear on the timeline | — | Not specified here | AG-13 v1.12 §3.4 |
| Audit interceptor (engine) | Writes audit rows with diff, sanitised secrets, hash chain | Action → sealed row | Deterministic | AG-13 v1.12 §3.5 |


### AG-14

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Reporter (aggregation engine) | Maintains rollups off domain events, reconciles nightly, serves dashboards from cache; never writes operational data | Domain events → rollups → dashboards | Deterministic | AG-14 v1.10 §3.0, AG-14-1 |
| Scheduler + Mailer | Runs report schedules and emails them | `ReportSchedule` → emailed report | Deterministic | AG-14 v1.10 §3.9 |


### AG-15

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Mailer / Messenger | Sends branded, localised invites and nudges | Template + client → message | Deterministic | AG-15 v1.6 §3.1, §3.6 |
| Signer | E-sign event flips agreement work item to signed | `envelope.signed` → status | Deterministic | AG-15 v1.6 §3.4 |
| Biller (AG-6) | Invoice paid flips work item | `invoice-paid` → status | Deterministic | AG-15 v1.6 §3.4 |
| Conductor | Optional auto-nudge playbooks, e.g. "invited but not activated in 3 days → reminder" | Stall event → nudge | Deterministic | AG-15 v1.6 §3.6 |
| Anomaly evaluation (engine) | Failed-login burst / geo-anomaly → notification | Portal events → alert | Rule-based (not described as AI) | AG-15 v1.6 AG-15-40 |


### AG-16

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Connection lifecycle (engine) | Verify probe, health checks, fallback to platform rails | Credentials → status Connected/Degraded/Failed; health events | Deterministic | AG-16 v1.12 §3.4, AG-16-15 to 17 |
| Mailer, Scheduler, Biller, Messenger | Use the firm's connected rail or the platform rail | — | Deterministic | AG-16 v1.12 §3.4 |
| Reader, Sorter, Drafter, Checker | Governed by one firm switch | — | AI | AG-16 v1.12 AG-16-35 |
| Conductor / Minder | Read safeguards, autonomy, timings at dispatch | Settings → behaviour | Deterministic | AG-16 v1.12 §3.9, §3.13 |


### AG-17

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Minder | All AG-17 dated items (advertising milestones, latest submission date, officer deadlines, validity lead times, permit expiry/renewal) registered as standard deadlines; reminds file owner | Date + owner → reminders, tasks, notifications | Deterministic | AG-17 v0.5 AG-17-73 |
| Wage check / set-up checks (module function) | Reads wage-threshold, prevailing-wage, refusal-area, cap tables; proposes stream; raises warnings | Job details → proposed stream, warnings with source | Deterministic; staff confirm | AG-17 v0.5 AG-17-8 to 11 |
| Advertising clock (module function) | Computes "day X of Y" for least-advanced required channel, earliest complete and latest submission dates | Channels + rules table → dates, warnings | Deterministic | AG-17 v0.5 AG-17-23, 24 |
| Three-way consistency check | Compares wage, hours, location of ads and job offer against job details; duties by one human tick | Ads, offer, job → CRITICAL warnings | Deterministic (duties = human judgement) | AG-17 v0.5 AG-17-32 |
| Template renderer (AG-12 / SA-05) | Generates recruitment report and job offer | File data → document | Deterministic | AG-17 v0.5 AG-17-28, 81 |
| Filing summary | Read-only summary for staff to key into the government portal | Job, answers, recruitment → summary | Deterministic | AG-17 v0.5 AG-17-70 |
| Inspection pack bundler (AG-07 core) | Bundles evidence documents | Stored documents → bundle | Deterministic | AG-17 v0.5 AG-17-53 |
| Mailer via AG-10 | "Request outstanding items" message, editable before sending | Open items → message | Deterministic composition; human edits and sends | AG-17 v0.5 AG-17-82 |
| Biller (AG-06) | Government-fee invoice line and linked expense | Fee → invoice line | Deterministic | AG-17 v0.5 AG-17-42 |


### AG-18

| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |
|---|---|---|---|---|
| Import engine (targets as adapters) | Mapping, validation, dry-run, async job, report, undo | Source file + mapping → records, report | Deterministic | AG-18 v1.2 AG-18-1, 2 |
| Reader (AI) | Classifies imported document type and proposes owning record; extracts values (proposed) | File (+ manifest) → type, record proposal, values with confidence | AI judgement; low confidence → review list; human approves values | AG-18 v1.2 AG-18-33 to 36 |
| Minder | Registers imported key dates as standard deadlines | Key date → reminders (past dates: record only by default) | Deterministic | AG-18 v1.2 AG-18-25, 74 |
| Conductor (quiet-set simulation and QUIET skip) | Counts what switch-on would send; skips client-facing actions on QUIET records | Quiet set → preview counts; action → skip/log | Deterministic | AG-18 v1.2 AG-18-60, 72 |
| Program-name grouping and suggestion | Groups look-alike source program names and suggests exact or near pack match | Source names → flagged suggestion | Not described as AI; human confirms per group | AG-18 v1.2 AG-18-10 |


## Part 3: AI and automation already written into the requirements


### AG-10

- Sorter reads content: "it reads the message content to propose the right file, **classifies** the message ... and **files each attachment to AG-9 with a proposed document type**" (AG-10 v1.9 §3.2). Classification values are "pack/firm content, not hard-coded; the values are routed to the Immigration-SME (Ishaan), founder final" (AG-10-37).
- Document classification moved to Reader: "the Reader — not the Sorter — classifies documents. Release 1 covers identity documents, IRCC/government letters, language test results and ECA reports" (§13 Q12, decided AG11-D18(e)).
- Drafter: "The **AI-assist drafter** is the **Drafter Doer**, callable by the rep in the composer and by any recipe" (AG-10-15). Today's code already has "**AI draft** (Anthropic, with a no-over-promise system prompt and a graceful \"not configured\" path)" (§12).
- Ranked suggestions in Unmatched inbox: "with ranked suggested entities" (AG-10-12); the matcher learns: "which also teaches the matcher the address→Contact mapping for next time" (§3.2).
- AI off by default: "AI is **off for every firm until Super Admin records the provider terms and the Owner switches AI on**" (AG-10-15); "one firm switch for all four Doers" (AG-10-54).
- Model logging and no training: "Every Sorter and Drafter model call SHALL be logged with the model and prompt version; client data SHALL NOT be used to train models" (AG-10-48).
- Canada-only processing: "the processing region (Canada only, AG11-D15)" (AG-10-48).
- Not an AI floor, deliberately: "\"Anything that reads as advice\" is **not** a mechanical floor (it cannot be detected)" (AG-10-44).
- Deferred: "**Deliverability analytics suite & A/B template testing** (Phase-2/3)" (§13 deferrals); voice "owned by the **Dialer** Doer (AG-2 §3.12), not AG-10".
- AI assist plan-gating open: "AI assist including the Sorter and Drafter ... which are plan-gated is SA-03, pending knock-on" (§11).


### AG-11

- Four AI Doers defined: "**Reader** ... **Sorter** ... **Drafter** ... **Checker**" (AG-11 v1.11 AG11-D4). "All four: output is a proposal with provenance + confidence; never fabricate" (AG11-D4).
- Reader scope R1: "identity documents incl. passport MRZ, **IRCC/government letters, language test results (IELTS, CELPIP, TEF and others) and ECA reports**" (AG11-D4); deadlines from letters: "SHALL become a deadline only when a person approves it ... The Reader SHALL NOT register a deadline on its own" (AG-11-108).
- Reader approve = verify: "Approving a Reader-proposed value in its review view ... **is** the verification" (AG11-D10).
- Checker: "findings feed the Deficiency Library as warnings, never a lock" (AG11-D4); further checks "→ Immigration-SME" (§13 closing note).
- Drafter: "draft_message ... always followed by a send action whose autonomy is at least `APPROVE`" (§3.3).
- AI triggers: "`message.received` ... `document.extracted` ... `deficiency.detected` ... `profile.changed`" (AG11-D5).
- AI off until terms recorded, Canada only: "AI Doers SHALL be **off for every firm**, with the switch locked, until the Super Admin has recorded the provider, the processing region (Canada only ...)" (AG-11-93).
- Manual fallback: "With AI off — or the provider down — every path still works by hand" (§3.10); batched fallback "one batched task per day per file owner" (AG-11-71).
- Confidence thresholds open: "until thresholds are set, every Reader value and Sorter match routes to review / Needs you" (§13 Q11).
- Per-recipe tuning data: "Approved / edited / rejected counts SHALL be kept per recipe and per action" (AG-11-63) — **Inferred:** an evaluation dataset an AI Worker could learn from or be measured against.
- Prompt and model versions logged (AG-11-72); "AI output is untrusted input — schema-validated, never executed" (§11).
- Plan gating open: "Which AI Doers / volumes are plan-gated" (§0.2 SA-03); pricing model per-seat vs per-case open (§13 Q20).
- Platform kill switch pending: "Platform kill switch for the AI Doers" (§0.2 SA-12).
- The AI copilot is not named in AG-11; "AI Doers only propose; a human approves what leaves or matters" (Visual B).
- Deferred: visual builder, firm-authored recipes, firm-designed chains, custom cron, SMS (§13 Release 2); "automation marketplace" later.


### AG-12

- No AI authoring in AG-12. Deferred: "**Auto-translation assist** (Phase-3, and never for legal/consent copy) — bilingual is human-authored now" (AG-12 v1.2 §13 deferrals).
- Deferred: "**A/B template variants & analytics** (Phase-3)"; "**Visual drag-and-drop email builder** (Phase-2)" (§13).
- Firm never auto-translates disclaimers: "a wrong translation of a regulator clause is a liability" (§3.6).
- **Inferred:** AG-11/AG-10 floor ("a template whose body was edited by AI" is `APPROVE`) assumes AI may edit template bodies, but AG-12 itself has no AI-edit feature or `templateBodyEditedBy` field.


### AG-13

- No AI, extraction, summarising or suggestion feature is written into AG-13 v1.12 (read in full).
- **Inferred:** the timeline ("golden thread") and the before/after audit diffs are the obvious raw material for a case summary or hand-over brief, but no such feature is specified.
- Domain values routed to SME: "the **content of seeded task templates per country pack** ... the **deadline semantics** a reminder anchors to" (§13 closing note).


### AG-14

- No AI is written into AG-14. Deferred: "**Anomaly detection / alerting on metrics** (e.g. \"conversion dropped 20% WoW\") — manual review ships now" (AG-14 v1.10 §13 deferrals).
- Deferred: custom dashboard builder; custom metric authoring by firms; cross-firm benchmarking ("explicitly out for the LOCAL plane").
- No-fabrication rule for numbers: "A metric with no underlying data renders an explicit **empty/zero state with context** ... never a guessed or interpolated value" (BR-12).
- **Inferred:** AG-11's per-recipe approval stats (AG-11-63) and `AiRunLog` are not surfaced in any AG-14 dashboard; no metric for Doer or AI performance is defined.


### AG-15

- No AI is written into AG-15 v1.6. "Anomaly detection (failed-login burst / geo-anomaly)" (AG-15-40) is a security alert, not described as AI or machine learning.
- Review of client uploads is manual: "Review an uploaded document → accept, or reject-with-reason" (AG-15-21). **Inferred:** the AG-11 Reader (document type, extracted values) is not referenced in AG-15's review flow.
- Proposal stated in source: "manual nudge in Release 1; one seeded auto-nudge if time permits" (§13 Q4).


### AG-16

- AI switch: "One firm switch covers **all four AI Doers** — Reader, Sorter, Drafter, Checker (AG11-D4); there is no per-Doer switch" (AG-16 v1.12 §3.9).
- Locked until terms recorded: "**It is locked off for every firm until Super Admin has recorded the AI provider, the processing region (Canada only, AG11-D15) and a no-training / no-retention agreement" (§3.9).
- Client notice: "the product supplies client-notice wording the firm may use" (§3.9).
- AI never load-bearing: "no requirement elsewhere may depend on an AI Doer having run" (BR-18).
- Platform kill switch: "a firm cannot switch on what the platform has switched off" (§3.9; SA-12 pending).
- Export scope includes the Needs-you approval history (AG-16-39). **Inferred:** a record of every human decision on Doer and AI output that could be used to measure AI Workers.
- Open: "which AI Doers or volumes sit behind which plan (SA-03), and what the Owner sees if Super Admin later withdraws the terms" (§13 Q7); what happens to waiting items when AI is switched off (Q9).


### AG-17

- No AI, extraction, OCR, suggestion or scoring feature is written into AG-17 v0.5 (read in full). It does not mention the Reader, Sorter, Drafter, Checker, Needs you or autonomy levels.
- Deferred to Release 2: "**Recruitment engine** — posting to boards, one applicant inbox, screening, interview scheduling" and "**Full employer qualifier**" (§0.1).
- Not planned: "direct integration with Job Bank / LMIA Online (no sanctioned integration path)" (§0.1).
- Positioning claim (internal, not verified here): "Competing tools concentrate on **form filling**; **recruitment compliance, a quality check before submission, post-approval compliance and built-in wage checks are largely missing**" (§1, citing a 2026-09-27 market scan).
- Lean principle against monitoring: "strip anything fancy, unproductive, monitoring or regulator-oriented — ExpatReady assists firms with process, workflow and stages" (AG17-D46).
- **Inferred:** manual-heavy steps an AI Worker could prepare (all still needing staff confirmation): logging advertising channels and screenshot proof, entering candidates and résumés (CSV import exists), recording officer contacts from incoming letters, comparing ad/offer text (duties match is a human tick), drafting the "Request outstanding items" message.


### AG-18

- Reader on imports: "The **Reader** SHALL classify each imported document's type and propose the record it belongs to" (AG-18 v1.2 AG-18-33); "A document the Reader cannot place with enough confidence SHALL go to the **document review list** ... never to a guessed record" (AG-18-35).
- AI off by default: "every imported document without a manifest record reference SHALL go to the review list" while AI is off (AG-18-36).
- Injection safety: "Imported content SHALL reach a model only as delimited data" (AG-18-36).
- Per-document review, not inbox flood: "no Needs you item SHALL be created per file or per value" (AG-18-35, AG-18-78).
- Suggestions allowed, guessing not: "a similarity match **applied without a human confirm**" is forbidden; "suggestions are allowed, AG-18-10" (BR-2).
- Reader confidence thresholds open (§13 Q8).
- Not in scope / not decided: "IRCC portal autofill or a browser extension | Not part of this module; not decided" (§0.1); "Live connections to other systems (pull from another product's API) | Not in Release 1" (§0.1).
- **Inferred:** column-to-field mapping, value mapping and program-name mapping are entirely manual in the requirements (only program names get suggestions); there is no AI-assisted mapping of legacy columns or free-text legacy notes. This is the obvious AI Worker opportunity, but every result must still pass the dry-run and a human confirm.


## Part 4: Guardrails already in the requirements


### AG-10

- Human approves AI text, cannot be lowered: "this level SHALL NOT be lowered by the firm, by a recipe, or by any setting" (AG-10-44).
- Approver defaults to licensed user; first decision closes item; Owner fallback recorded "approved by Owner without a licensed user" (AG-10-44, SA6-D9).
- Approval needs same permission as manual send: "Approving a pending message SHALL require the same permission as sending it by hand" (AG-10-46).
- Never auto-send on timeout: "A pending draft SHALL never auto-send on timeout" (AG-10-45).
- Approval does not override consent: "Approval is a decision to send, not a consent override" (BR-21).
- Injection safety: "Client-supplied content SHALL reach models as delimited data, never as instructions; models SHALL have no tool access" (AG-10-54).
- Unverified sender: "a classification of a message from an **unverified sender** SHALL NOT trigger any client-facing `AUTO` action" (AG-10-47).
- Acknowledge only approved filings: "an acknowledgement template SHALL never list document names that come from inferred filings" (AG-10-51).
- Quiet / "Not started" records: "An automated client-facing send SHALL be skipped, with the reason logged, if any record it concerns, or the recipient party, is QUIET" (AG-10-55).
- Imported mail never sent or sorted (AG-10-53).
- Person creates lead: "no AI or recipe SHALL trigger it" (AG-10-58).
- Audit of sensitive actions: "Sensitive actions (mailbox connect/disconnect, rail config, consent override, suppression edit, bulk send, message/timeline export) SHALL be **audited**" (AG-10-35).
- No passport/financial numbers in messages: "passport and financial numbers are never put into the content of emails, WhatsApp messages or notifications" (§11).
- Firm decides, not regulator: "ExpatReady never reports to a regulator, never declares a firm non-compliant" (§1).
- Due times: "overdue after 2 working days; anything linked to a government deadline must be approved no later than 2 working days before it" (§13 Q11).


### AG-11

- Four product floors: "a human approves AI-written text before it reaches a client; nothing is ever fabricated (AG-07 BR-7); ExpatReady submits nothing to an authority; ..." and "AI processing waits until the provider terms are recorded" (§0).
- "We work for the firm, not the regulator" (§0, BR-34).
- No government submission: AG-11-54, BR-26.
- Approving = same permission as doing by hand (AG-11-58, BR-22); for forms "approval in Needs you SHALL be AG-07's consultant approval" (AG-11-58).
- Four-eyes on forms with 2+ form approvers; "**Self-approved** SHALL be recorded whenever the approver is the preparer" (AG-11-81).
- Licensed user definition: "an active user whom the firm has linked to a regulator credential it entered" and "ExpatReady SHALL never check, tracks or acts on licence validity or expiry" (AG-11-88).
- Professional approvals shown to every holder, licensed marked "preferred", "the first holder to decide closes it for all" (AG-11-89); Owner fallback recorded (AG-11-90).
- Never on a timer: "A pending item SHALL **never** execute because time passed" (AG-11-59).
- Stale protection: approve request "SHALL carry the rendering version the approver saw" (AG-11-61).
- Injection: "Client-supplied content SHALL be passed to a model as delimited data, never as instructions, and models SHALL have no tool access" (AG-11-94).
- Imports quiet: client-facing actions skipped when "**any** client, lead or case it concerns, **or the recipient party**, has `automationState = QUIET`" (AG-11-87).
- Paused clients: items "SHALL NOT be sendable" (AG-11-101).
- Deactivated users never targeted (AG-11-45).
- Privacy: previews "stored encrypted or by reference"; RLS forced for `ApprovalItem`, `AiRunLog` (AG-11-98). PII redaction of run logs is NEW (§12).
- Assist, don't monitor: "The platform SHALL NOT escalate, mark or report on a firm's staff unless the firm has chosen it" (AG-11-49).
- Owner-only switches: Team safeguards off, supervision off, who approves AI text (§10).


### AG-12

- "Consumers render published-only ... a DRAFT is never sent" (BR-5).
- Publish guards: "Publish is blocked unless: all `{{tokens}}` resolve to known variables; required locales are present ... injection-safe checks pass" (BR-6).
- Mandated clauses: "a firm overrides brand/voice, not the mandated clause; the diff flags attempts to alter it" (BR-10).
- "Merge **values** are always untrusted data" (BR-8).
- Real-record preview "requires both `:preview` **and** the underlying entity's read permission" (§10).
- Audit of "adopt, edit, publish, rollback, archive, delete, re-sync/merge, fast-forward" (AG-12-36).
- Separate keys for `publish`, `resync`, `archive` ("high blast radius — own key") (§10).


### AG-13

- Note wall: "`internal-only` is the **default** ... An internal note can never be exposed by a client-facing path" (BR-4); separate key `agent/note:share-with-client` (§10).
- Attached records follow parent visibility, enforced "server-side on every path" (BR-21, AG-13-67).
- Audit append-only at the database: "**No audit-edit/delete API exists.**" (BR-10); hash chain (BR-11); "An export is auditable" (BR-12); retention floor, "never silently purged" (BR-13).
- Audit read is firm-wide for holders of `agent/audit:read` (AG-13-44).
- Assist, don't monitor: overdue escalation "**Opt-in per firm and OFF by default**" (AG-13-7).
- Deactivated users never assigned, mentioned or notified (AG-13-64).
- Personal data "**never written to system logs or traces**"; passport and financial numbers "**never put into the content of emails, WhatsApp messages or notifications**" (§11).
- Purpose statement: the audit row proving "the RCIC — not an unlicensed staffer — gave the advice" (§1).


### AG-14

- "Viewer permission scopes the data, server-side" (BR-2); filters "never widen".
- Drill-through re-applies target module's permission: "no escalation via chart" (BR-8).
- "Export = audited egress" (BR-9); scheduled report uses "the **schedule owner's** permission scope, re-evaluated at each run" (BR-10).
- No staff-monitoring metrics for corporate: "SHALL NOT include ... **staff-monitoring** metrics" (BR-15).
- Passport and financial numbers "never put into the content of emails" (§11).


### AG-15

- Separate identities: "A client JWT can never reach an `agent/*` endpoint" (BR-1).
- Record-level isolation: "No client-supplied id is trusted" (BR-2).
- Allow-list visibility: "internal notes, staff workflow, case strategy, and *other clients* are never exposed" (BR-3).
- Retain, don't destroy on revoke (BR-6).
- "Signatures are never done on behalf" (BR-7, AG-15-45); "Done on behalf" recorded in audit with "on behalf of".
- Nudges are transactional but "never sends marketing-class content under the transactional banner" (BR-11).
- Manual invite to a Not started client "SHALL NOT switch the client's automations on" (AG-15-49).
- Audit of every access action and client data event (BR-15).
- No-guarantee posture in client-facing progress text routed to SME (§13 closing note).


### AG-16

- "Product floors are not settings" (BR-17); "AI is optional, never load-bearing" (BR-18).
- "we are not the regulator"; product copy never says "violation", "breach of regulation" or "non-compliant" (BR-21, AG-16-50).
- Owner route: "No licensed user is not a dead end" (BR-22).
- Setting changes apply only to items created after: "an item already waiting in Needs you SHALL NOT be sent or executed because of the change" (AG-16-37).
- Secrets write-only, never returned (BR-11); verify before Connected (BR-12).
- Owner-only five actions, "can never be put on a custom role, even by the Owner" (§10).
- Payment never silently routed through the platform (BR-8).
- "Licence validity is not tracked ... a user stays licensed until the firm unlinks them" (§9).
- Sensitive actions audited incl. "AI Doers switch and its acknowledgement ... an Owner approval made without a licensed user" (AG-16-29).


### AG-17

- "**Nothing is ever locked.**"; CRITICAL passed only "by a user holding `agent/case:waive-deficiency`, with a mandatory reason" (AG-17-34, AG17-D17).
- Sign-off records "the time, the signer and the list of items waived" (AG-17-35).
- Retainer: "Generating a retainer requires an active licensed consultant in the firm" (AG-17-74, AG17-D58) — "The one deliberate stop in the corporate flow".
- Signatures never on behalf; paper signature "signed offline" (AG-17-21).
- Audit: "Every create, change, waiver, sign-off, submission, decision, link and export ... SHALL be written to the audit log (actor, target, before/after, \"on behalf of\" where applicable)" (AG-17-58).
- Support sessions: waive, sign-off, record decision and export "always blocked in a support session" (§11).
- Worker privacy: employer never sees worker's case (BR-11, §11); candidates hidden from employer in R1 (AG-17-30).
- Content neutrality: "Code SHALL contain no immigration-specific terms, form numbers, streams or rule values" (AG-17-6).
- Change requests: "the system SHALL NOT apply it without that action" (AG-17-65).
- Filing is outside the product: "The LMIA is filed on the **government portal**, outside Expat Ready" (§3.6).


### AG-18

- "Nothing written before the dry-run" (BR-1); "Never guess" (BR-2); "Duplicates are explicit" (BR-3).
- "Imported means unverified ... the import never writes into the verified profile" (BR-6).
- "Silent to the client" / "Quiet until switched on" (BR-8, BR-19); switch-on "previewed, confirmed and audited" (BR-20); released "through the normal scan under the rate caps, never as a burst" (AG-18-73).
- "No invented consent ... an imported consent column is never written to `ConsentRecord` until legal decides" (BR-18).
- "History is never sent" (BR-25).
- Assisted migration: written request, double audit, "Support staff SHALL NOT see personal data in an assisted session" (AG-18-47).
- Attestation: "The wording SHALL cite no statute" (AG-18-49).
- Errors "SHALL NOT include the raw value" (AG-18-12); "personal data is never written to system logs or traces" (BR-17).
- Undo keeps records "worked on" (AG-18-41).
- Tenant isolation: "A file SHALL NOT be able to supply internal record IDs" (AG-18-53).


## Part 5: Conflicts, gaps and surprises

### Across the slice (summary of the module findings below)

| # | Finding | Where (exact source) | Type |
|---|---|---|---|
| X1 | Routing of supervised client messages: AG-10 v1.9 and AG-11 v1.11 apply SA6-D9 (F4) "shown at once in the Needs you of every active licensed user"; AG-16 v1.12 §3.11 / AG-16-47 still says "in the Needs you of the file's lead RCIC or of any licensed user if there is none". | AG-10-49; AG-11-82; AG-16-47 | Conflict |
| X2 | Proactive WhatsApp is Release 1 in AG-10, AG-11, AG-16 (AG11-D18(a)), but AG-12 says message templates' "live channels Phase-2" (AG-12-34), AG-13 defers "**Live SMS/WhatsApp reminder channels** (Release 2, via Messenger)", and AG-15 proposes nudges "email-only in Release 1" (§13 Q8). | AG-12-34; AG-13 §13; AG-15 §13 Q8 | Conflict |
| X3 | Escalation and at-risk marks: "off by default" in AG-17 (AG17-D70, AG-17-73) vs on automatically at 5+ active staff under Team safeguards (AG11-D9, AG-16-41). Recorded as a pending AG-17 knock-on. | AG-11 §0.2; AG-16 §0 pending note | Conflict (pending) |
| X4 | AG-12 has not applied AG11-D12 (PUBLISHED template = template message, seed adoption, reach count) nor any field for AI-edited body, "immigration-significant" merge fields, or WhatsApp provider-approval status. | AG-11 §0.2 AG-12 row "Pending"; AG-12 v1.2 status "Baseline — not yet reviewed" | Gap |
| X5 | AG-17 v0.5 (7 Oct) contains no agent-native decisions (AI Doers, Needs you, autonomy, supervision); AG-14 v1.10 does not place Needs you / Done for you on the home screen (AG11-D7 knock-on pending). | AG-17 v0.5 whole; AG-11 §0.2 AG-14 row | Gap |
| X6 | "Licensed user" is a link the firm makes; "ExpatReady SHALL never check, tracks or acts on licence validity or expiry" (AG-11-88); professional-approval permissions are seeded on Owner and Case Manager roles with "no licence check on permissions" (SA6-D2). The product records, it does not verify, licensed sign-off. | AG-11-88; AG-16 §9; AG-17 §0 SA6-D2 row | Surprise (matters for AI Worker sign-off claims — confirm with counsel / RCIC) |
| X7 | The audit log records `actorUserId` only (AG-13 §7); Doer and AI activity is traced in AG-11 run history and `AiRunLog`. No single place says that an AI prepared an item and a named person approved it. | AG-13 §7; AG-11 §7 | Gap (Inferred) |
| X8 | All AI Doers ship built but locked off until Super Admin records a Canada-only provider and a no-training/no-retention agreement (SA-08/SA-11 pending); WhatsApp likewise waits for a provider (SA-08 pending); assisted migration waits for an SA-07/SA-10 key. | AG-11-93; AG-10-43; AG-18-79 | Dependency |
| X9 | AG-16-54 uses `agent/integration-whatsapp:edit` though v1.11 merged per-rail keys into `agent/integration-whatsapp:manage`. | AG-16-54; AG-16 §10 | Conflict (minor) |
| X10 | AG-15 auto-nudges for pending documents and AG-11's Release 1 missing-document chase overlap; which record (AG-15 `ClientWorkItem` or AG-07/AG-09 checklist item) stops the chase is not stated in AG-15. | AG-15 §3.6, AG-15-32; AG-11-76 | Gap (Inferred) |



### AG-10

- Open: Sorter confidence threshold and what else counts as a deterministic signal (§13 Q10).
- Open: WhatsApp provider (SA-08 pending), so all WhatsApp ships "built and switched off until Super Admin records a provider" (AG-10-43). WhatsApp template approval owner open (§13 Q18).
- Open: AI provider, region values, kill switch (§13 Q14); STOP keyword policy (Q7); tracking default (Q6); entitlement tiers (Q9).
- Legal values routed to the Immigration-SME, not counsel: CASL/Law-25 wording, transactional vs marketing class, retention period (§13 closing note). **Inferred:** these are legal questions and need confirm with counsel.
- Code today: "There is NO consent/CASL layer today" and "There is NO SMS/WhatsApp today" (§12); notifications have a `global:true` scoping gap (§12).
- Document control says role naming moved to "six starter roles" (SA6-D5).
- **Inferred:** "Licensed user" is a link the firm makes, with "no licence monitoring" (AG1-D19, in change log 1.5); an AI Worker cannot rely on the product to verify licences.


### AG-11

- Pending knock-ons (§0.2), all with status Pending unless noted: SA-08 (provider, Canada-only region), SA-11 (retention, terms record), SA-12 (AI kill switch), SA-03 (AI plan gating), AG-14 (home screen order), AG-15 (confirm nothing new), AG-17 ("AG17-D70 / AG17-D81 say escalation and at-risk marks are \"off by default\". Under AG11-D9 they are parts of Team safeguards and so are **on by default for firms with 5 or more active staff**"), AG-12 (seed adoption, PUBLISHED definition, reach count, WhatsApp approval status), AG-16 (timings applied 5 Oct; rest pending), AG-01 (licensed-user definition applied; staff count pending).
- Change log row 1.8 records IMAP as Release 2 under AG11-D16; later revised by AG11-D18(c) to Release 1. Consistent in current text; history rows differ (not a conflict in force).
- Typo in requirement text: "ExpatReady SHALL never check, tracks or acts on licence validity" (AG-11-88) — grammar, no rule impact.
- Open: idempotency key retention (Q5), dead-letter policy (Q6), rate cap values (Q7), entitlement tiers (Q8), storage Mongo vs SQL (Q9), business-hours default (Q10), Reader thresholds (Q11), Reader final list (Q13), WhatsApp approved replies (Q18), pricing model (Q20).
- Code today: engine is "a genuine ~55–60% foundation"; "No idempotency / no dead-letter today", "Scheduler is NOT timezone-aware", "No Minder", "No CASL consent gate", "Run logs persist `entityData` (PII risk)" (§12).
- §3.5 data flow still says enabling a recipe clones it "status = DISABLED until reviewed" for non-seed recipes; seeds and two of the five new ones are enabled at provisioning. Consistent but two paths.
- **Inferred:** The only actor who "operates" the Conductor in Release 1 is the firm via switches and Needs you; there is no authoring surface in R1 (builder is R2). An AI Worker that "builds automations" would depend on a Release 2 capability.
- **Inferred:** Needs you is the natural hand-off point for AI Worker output: it already shows "what will happen", "why", "where every value came from", confidence, and supports approve / edit / reject with audit.
- **Inferred:** "Licensed" is firm-asserted only (AG1-D19); sign-off by a "licensed user" is not verified by the product, which matters for regulator-facing claims about AI Worker sign-off (confirm with counsel / RCIC).


### AG-12

- **Conflict:** AG-12 v1.2 says SMS/message templates are "live channels Phase-2" (AG-12-34, §13) while AG-10 v1.9 and AG-11 v1.11 make proactive WhatsApp template messages Release 1 (AG11-D18(a)). AG-12 has no field for a WhatsApp variant's provider-approval status; AG-11 §0.2 lists this AG-12 knock-on as "Pending".
- **Gap:** AG11-D12 knock-ons (seed adoption as firm drafts, PUBLISHED as definition of a template message, publish reach count) are "Pending" in AG-11 §0.2 and not applied in AG-12 v1.2 (status "Baseline — not yet reviewed").
- **Gap:** AG-10-30 / AG-11-97 require "immigration-significant" merge fields render only from verified values; AG-12's variable catalogue has no "immigration-significant" or verified-only flag.
- AG-12 §9: "**Known variable, no value at send** → renders blank (escaped empty)"; AG-10-30 says a missing variable in an automated send "drop that send to `APPROVE`". **Inferred:** two rules for the same case; AG-10/AG-11 are the newer.
- Open: storage Mongo vs relational (Q1); auto-fast-forward default (Q3); French strictness (Q4); logical-key resolution (Q5); entitlement tiers (Q6).
- Code today: renderer "is NOT injection-safe"; agent create writes "`scope = SYSTEM`" (bug) (§12).


### AG-13

- **Gap (Inferred):** `AuditLog` has `actorUserId` only (§7); there is no field recording that a Doer or AI acted (AG-11 keeps that in run history and `AiRunLog`). An AI Worker's actions would need clear attribution in the audit log if the audit is to prove who gave advice.
- **Conflict:** AG-13 §13 defers "**Live SMS/WhatsApp reminder channels** (Release 2, via Messenger)" while AG-11 v1.11 (AG11-D18(a), (d)) makes proactive WhatsApp reminders (biometrics countdown, expiry watch) Release 1 on the client's preferred channel.
- **Conflict (minor):** AG-13 §3.1 and AG-13-7 keep overdue-task escalation "OFF by default" (AG17-D57), while AG-11 v1.11 makes Minder escalation part of Team safeguards, on by default at 5+ staff. These are different escalations (overdue tasks vs deadlines), but AG-13 does not mention Team safeguards. **Inferred:** needs alignment.
- AG-13 does not mention Needs you or Done for you (AG11-D7); tasks and Needs you items are separate queues. **Inferred:** two "what needs me" lists on the home screen.
- Open: audit tamper-evidence mechanism and retention years (Q6); live timer and email transport (Q8).
- Code today: notes have "NO internal/client-visibility flag today"; note edit/delete IDOR; "`activity-log` is a dead no-op"; reminders not user-creatable (§12).


### AG-14

- **Gap:** AG-11 v1.11 §0.2 has an AG-14 row, "Home screen order — Needs you, then Done for you, then dashboards (AG11-D7)", status Pending; AG-14 v1.10 does not mention Needs you or Done for you.
- Open: reporting currency and FX source (Q4); entitlement tiers (Q5); role-recipients for schedules (Q6); export retention (Q7).
- Code today: "There is no aggregation/rollup/cache layer today"; `salesPerformance()` is "O(all-rows) in-memory aggregation" (§12).


### AG-15

- **Conflict:** AG-15 §13 Q8 proposes nudges/notifications "email-only in Release 1" while AG-10 v1.9 and AG-11 v1.11 make proactive WhatsApp (chases, reminders) Release 1 (AG11-D18(a)).
- **Overlap (Inferred):** AG-15 auto-nudges ("document pending 7 days → reminder") and AG-11's R1 missing-document chase recipe (5/7/4 defaults) both chase outstanding documents; AG-15 says auto-nudge Release 1 is open (Q4) while AG-11 seeds the chase on at provisioning. AG-11 v1.11 §0.2 has an AG-15 row, "Client portal shows nothing new from these decisions — confirm", status Pending.
- **Overlap (Inferred):** AG-15 `ClientWorkItem` document request status vs AG-07/AG-09 checklist items used by AG-11's chase ("stop for each requested item only when that specific checklist item is Received"). Which record is authoritative is not stated in AG-15.
- Open: custom domain R1 (Q2); client MFA default (Q3); default visibility (Q5); stall threshold (Q6, proposed 7); officer identity exposure (Q7).
- Code today: "There is essentially NO firm-side client-portal management plane today"; no `agent/portal:*` permissions (§12).


### AG-16

- **Conflict:** AG-16 v1.12 §3.11 and AG-16-47 still route supervised messages "in the Needs you of the file's lead RCIC or of any licensed user if there is none", while AG-10 v1.9 and AG-11 v1.11 (SA6-D9, F4, 7 Oct) show the item "at once in the Needs you of every active licensed user". AG-16 has no SA6-D9 row in its "Applied from SA-06 v3.0" table.
- **Conflict (key name):** AG-16-54 says changing the WhatsApp template list "SHALL need `agent/integration-whatsapp:edit`", while v1.11 merged per-rail keys into `agent/integration-whatsapp:manage` (§10).
- **Conflict (history vs current):** change-log row 1.5 says per-recipe autonomy "default APPROVE"; current AG-16-36 says template messages default to "Send automatically". Current text is consistent with AG-11.
- **Gap:** "Whether a platform shared WhatsApp rail exists as a fallback is **open** (§13 Q8)".
- Pending knock-ons listed in AG-16: AG-12 publish permission name; AG-01 staff count; SA-08/SA-11 terms record; AG-17 default conflict; SA-12 kill switch; SA-03 plan gating.
- Code today: "Stripe secrets are NOT encrypted today"; no export, no calendar, no health monitoring (§12).


### AG-17

- **Conflict:** AG-17-73 says escalation/at-risk "applies only if the firm has switched it on", and AG17-D70 says "off by default", while AG-11 v1.11 (AG11-D9) turns them on automatically at 5+ active staff. AG-11 §0.2 lists this AG-17 knock-on as "Pending".
- **Gap:** AG-17 v0.5 (dated 7 Oct) does not apply the 4 Oct agent-native decisions (AI Doers, Needs you, autonomy, supervision of unlicensed staff messages). E.g. "Request outstanding items" (AG-17-82) is staff-edited and sent; whether supervision (AG11-D11(c)) applies to it is not stated. **Inferred:** AG-10's rules govern it because it is sent through AG-10.
- **Gap:** AG-17 personas include "RCIC / Licensed representative" for sign-off, but sign-off is a permission (`agent/case:review-approve`, Owner and Case Manager by default) with "no licence check on the permission" (SA6-D2). **Inferred:** a licensed person's sign-off is a firm choice, not enforced.
- Open (§13): SA-01B row-and-line model date (hard dependency 6 — "AG-17's Wizard, recruitment, quality checks and tracking cannot run without it"); names for LMIA content partner and rule-value checker; eight expert-check items (rule values) — confirm with counsel / RCIC.
- Status: "Draft — ... awaiting expert check of rule values" (document control).
- Code today: "No `Case` or `Prospect` table in the backend"; "SA-01B's row-and-line model is not built" (§12).


### AG-18

- **Conflict to resolve (stated in source):** "SA-2-17 always blocks deleting clients, cases and documents in a support session, so undoing an assisted batch cannot be done by support staff today" (§0.2 SA-02, §13 Q5).
- **Supersedes another document:** AG-18 supersedes `03-Doc-1-Platform-Foundation.md` §8.9.1 on billing and historical financials; "The tech lead must re-base the note" (§0.2).
- Pending knock-ons: AG-01 (adopt `automationState` fields), AG-13 (imported notes fields), AG-15 (no automated invite), SA-01/SA-01B (program list, key-date types), SA-02, SA-06 (keys), SA-07/SA-10 (assisted key — blocks assisted runs), SA-11 (retention), SA-03 (volume gating) — all "Pending".
- Open: imported consent for legal (Q4 — confirm with counsel); imported case starting position and document status (Q7); Reader thresholds (Q8); limits (Q9); retention (Q10); standing attestation (Q16); past-date lead times (Q19, SME); Officio/CaseEasy export samples (Q20).
- **Inferred:** the brief calls AG-18 an AI opportunity; the requirements limit AI to the Reader on documents. Officio and CaseEasy adapters are gated on real export samples that "the product team (the co-founder) obtains".
- Code today: engine exists with PARTY, DOCUMENT, NOTE targets only; "No undo"; "Imported documents are not virus-scanned by the import path"; "No import origin on records or events" (§12).
- Status: "Draft — new module ... immigration values ... awaiting the Immigration-SME; remaining open items (§13) awaiting the founder" (document control).
