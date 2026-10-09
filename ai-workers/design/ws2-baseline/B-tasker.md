# B-tasker: the Tasker (tasks and assignments)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Tasker creates and assigns tasks: a piece of work with an owner, a due date and a link to the record it concerns. People create tasks by hand; the Conductor creates them automatically (for example the "call now" task when a new lead arrives). **Who uses it:** every staff member through "My Tasks"; managers for handover and reassigning (AG-13). **What it replaces (founders' spec):** "Asana / Monday". **Status in one line:** tasks are Release 1 everywhere; the Charter defers "the AG-11 automation engine and its Doers (… Minder, Tasker and Messenger …)" while keeping "ordinary tasks", so whether the Tasker as an automation Doer is in Release 1 depends on which source wins.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- RFP v2.0: `sources/drive-snapshot-2026-10-09/01-techno-functional/01-RFP-Build-Proposal.md`
- Agent 99-Phasing v1.4: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/99-Phasing-and-Glossary_v1.4_2026-10-05.md`
- Agent 00-Overview v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/00-Overview_v1.11_2026-10-07.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- AG-11 v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-11-automation_v1.11_2026-10-07.md`
- AG-02 v1.9: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-02-prospect-lead-sales-crm_v1.9_2026-10-07.md`
- AG-13 v1.12: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-13-tasks-reminders-notes-and-activity-audit_v1.12_2026-10-07.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Charter V1 (md dump): `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter V1 - G1 expanded.md`
- Doc 3 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Tasker \| tasks + assignments \| Asana / Monday" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 1, L63 | Tier 1 — Live now (shipped), per SPEC-N L57 (June 2026 repo status, not re-checked) | Charter V1 L121 lists Tasker among Release 1 deferrals. |
| SPEC-IA sidebar | "Mailer · Scheduler · Tasker · Biller · Reporter (daily Doer-surfaces" | Founders IA Doers model v1 (2026-06-14), The lean sidebar, L26 | None stated | — |
| SPEC-IA My Day | "Tasks due \| Tasker" | Founders IA Doers model v1 (2026-06-14), Home = "My Day", L42 | None stated | "My Day" was renamed "My Tasks" (Agent 99-Phasing v1.4 L8). |
| RFP §4.10 | "Minder (task creation and assignment), Tasker (workflow task automation)" | RFP v2.0, §4.10 Automation Engine — Conductors & Doers, L167 | None stated | RFP gives task creation to the Minder; the founders' spec (SPEC-N L63) and October files give it to the Tasker. |
| APHG glossary | "Tasker (internal tasks — "does")" | Agent 99-Phasing v1.4, Glossary, "Doer" (non-AI automation Doers), L52 | None stated | — |
| AOVW AG-11 row | "executors (Reminder/Minder/Tasker/Messenger and the AI Doers Reader/Sorter/Drafter/Checker)" | Agent 00-Overview v1.11, Detailed Scope Index, AG-11, L90 | "Release 1: minimal Conductor with a seeded recipe set (AG11-D3)" (same row) | — |
| DOC2 capability | "cap.tasker \| cross-cutting.tasks \| DOER \| — \| feature.tasks \| baseline" | Doc 2 v1.4, SA-CT capability registry seed table, L87 | "baseline" (illustrative tier) | Doc 2 L69 gives cap.tasker defaultFirmState ON. |
| AG-11 §3.0 model | "Tasker (creates/assigns tasks)" | AG-11 v1.11, §3.0 Conductor↔Doers model, L243 | None stated | — |
| AG-11 §3.0 exists today | "The Minder is the one new non-AI Doer. Reminder/Tasker/Mailer/Notification exist." | AG-11 v1.11, §3.0, L245 | None stated | — |
| AG-11-2 | "The Conductor SHALL dispatch to in-house Doers: Mailer … Tasker (create_task) … Only send_message, change_stage, assign, arm_minder and the four AI Doer actions are NEW; the …" | AG-11 v1.11, §4 Conductor↔Doers model, L553 | None stated | — |
| AG-11 §3.3 data flow | "the named Doer executor runs (Mailer renders+sends via Message module; Tasker writes a Task; Reminder enqueues via the Reminder queue" | AG-11 v1.11, §3.3 Data flow, L333 | None stated | — |
| AG-11 autonomy default | "Internal: create task, reminder, internal notification, assign, file or match a message or document to a record \| AUTO \| APPROVE or OFF \| none" | AG-11 v1.11, §3.3 autonomy table, L312 | None stated | Task creation runs without approval by default; the firm may raise it. |
| AG-11 recipe speed-to-lead | "Speed-to-lead (prospect.created → acknowledgement to the lead [AUTO, template] + "call now" task [AUTO]) — the AG-2 flagship." | AG-11 v1.11, §3.5 Release 1 seeds, L368 | Release 1 seeds — enabled at firm provisioning (heading, AG-11 L367) | — |
| AG-11 recipe document received | "document.received → thank-you to client [AUTO, template] + "Review document" task [AUTO]" | AG-11 v1.11, §3.5 Release 1 seeds, L369 | None stated in line (Release 1 seed) | Approving the Reader values completes the task (same line). |
| AG-11 Minder cascade | "T-14 days: create a Tasker task for the case officer + notify them." | AG-11 v1.11, §3.4 The Minder, L347 | None stated | The cascade designer is Release 2 (AG-11 L383). |
| AG-11-46 | "A create_task action whose assignee is deactivated SHALL still create the task, unassigned, so the work is not lost; it appears in the Unassigned …" | AG-11 v1.11, §4 Staff leaving, L629 | None stated | — |
| AG-11 user story | "an auto-acknowledgement (in the lead's language) and a "call now" Tasker task are produced, and the run is recorded." | AG-11 v1.11, §8 User stories, L899 | None stated | — |
| AG-11 §12 exists | "A Doer dispatcher already exists (WorkflowActionExecutorService) for send_mail (Mailer), send_notification, create_reminder/send_reminder (Reminder), create_task (Tasker)" | AG-11 v1.11, §12 Reference note, L1205 | None stated | — |
| AG-02 sequences | "using the Doers (Mailer for email, Messenger for SMS/WhatsApp, Tasker for the rep's call tasks, Reminder for nudges, Scheduler for booking links)." | AG-02 v1.9, §3.6 Sequences, L350 | None stated | — |
| AG-2-32 | "Sequence steps SHALL execute via the Conductor + Doers (Mailer/Messenger/Tasker/Reminder/Scheduler) asynchronously, with at-least-once delivery and idempotent step execution" | AG-02 v1.9, §4 Detailed FRs, L600 | None stated | — |
| AG-13 §3.1 heading | "3.1 Tasks (the Tasker Doer's record) — "every obligation has an owner, a due date, and a place it can't hide"" | AG-13 v1.12, §3.1, L204 | None stated | — |
| AG-13 §3.1 how it works | "A Task is a unit of work attached to … Creating or reassigning a task fires a … Completing a task … can advance a Conductor …" | AG-13 v1.12, §3.1 How it works, L206 | None stated | — |
| AG-13 §3.1 system-created | "The Conductor (speed-to-lead, post-consult, case-stage-entry, document-overdue) auto-creates the right task with the right due date" | AG-13 v1.12, §3.1 World-class behaviour, L218 | None stated | — |
| AG-13 §3.1 data flow | "Create/assign (manual / template / Conductor) → validate (schema) → write Task(+Subtasks) … → Notification to assignee → Audit row → appears on entity timeline" | AG-13 v1.12, §3.1 Data flow, L225 | None stated | — |
| AG-13 §3.8 boundary | "Tasker and Reminder are "Doers," but the Doer is the action the Conductor invokes; the subsystem it acts on is this module." | AG-13 v1.12, §3.8 Conductor ↔ AG-13 interface, L343 | None stated | — |
| AG-13-1 | "Create a Task on any entity via the polymorphic (entityType, entityId) … assignee (optional — a task can be unassigned), due date (firm-TZ), priority, …" | AG-13 v1.12, §4 Tasks (Tasker), L354 | None stated | — |
| AG-13-4 | "Task templates with event-anchored relative due dates; materialise real tasks(+subtasks) onto an entity; idempotent per (template, entity)" | AG-13 v1.12, §4 Tasks (Tasker), L357 | None stated | TRI L177 proposes to move task templates. |
| AG-13-7 | "Overdue escalation rule → Notification to assignee's manager … Opt-in per firm and OFF by default" | AG-13 v1.12, §4 Tasks (Tasker), L360 | None stated | Conflict: AG-11 AG11-D9 makes Minder escalation a Team safeguards part, on from 5 staff; TRI L175 and TRI Q5 (L263) flag "AG-13 says off by default; AG-11 says on from 5 staff". |
| AG-13-8 | "Complete a Task → stamp completedAt/By; emit task.completed; may advance a Conductor sequence. Reopen is allowed and audited." | AG-13 v1.12, §4 Tasks (Tasker), L361 | None stated | — |
| AG-13-60 | "Conductor calls AG-13 task-create/reminder-schedule services; AG-13 emits task.*/note.*/reminder.* events the Conductor subscribes to." | AG-13 v1.12, §4 Cross-cutting / Conductor, L401 | None stated | — |
| AG-13-62 | "Tasks arrive there from the staff-leaving handover (AG1-D7) and from automations whose assignee is deactivated (AG-11-46; AG1-D4)." | AG-13 v1.12, §4 Unassigned task list, L405 | None stated | — |
| AG-13-65 | "AG-13 SHALL accept tasks created from dated case items … This includes standard deadlines registered with the Minder … Completing in either place completes both" | AG-13 v1.12, §4 Case-linked work, L410 | None stated | "depends on the Minder (AG-11-47), which does not exist yet" (same line). |
| AG-13-66 | "When a standard deadline fires on a file whose owner has been deactivated, the task … and the firm's users who can … SHALL be notified …" | AG-13 v1.12, §4 Case-linked work, L411 | None stated | See B-minder. |
| AG-13 BR-18 | "AG-13 never embeds workflow rule logic; the Conductor never embeds task/reminder persistence." | AG-13 v1.12, §5 Business rules, L435 | None stated | — |
| AG-13 BR-19 | "A deactivated user is never chosen as a new assignee, by a person or by the Conductor" | AG-13 v1.12, §5 Business rules, L436 | None stated | — |
| APHG Release 1 AG-13 | "AG-13 (tasks, reminders, notes, activity timeline, immutable audit)" | Agent 99-Phasing v1.4, Phasing table, Release 1, L19 | "Release 1 — go-live" | — |
| TRI AG-13 stays | "tasks · My Tasks · … · deadline → task · Unassigned list · reminder engine · handover, bulk reassign" | SCOPE-TRIAGE 2026-10-05, AG-13 Stays, L170 | Stays in Release 1 (list heading, TRI L6) | — |
| CH1 notes | "the AG-11 automation engine and its Doers (rule-based "when X, do Y" tools such as Minder, … Ordinary tasks, reminders and three plain … stay. …" | Charter V1 (md dump), Speaker notes, "NOT IN RELEASE 1", L121 | "NOT IN RELEASE 1" (Tasker as automation Doer); "stay" (ordinary tasks) | Conflicts with AG11-D3 (minimal Conductor in Release 1, AG-11 L32) and APHG L19. |
| DOC3 AG-11 Doers (July) | "Tasker (Tasks), Minder (all time-based nudges and the deadline watcher, §3.4 — per FD-8 there is no separate "Reminder" Doer" | Doc 3 v1.4, AG-11 §3.0, L5038 | None stated | October AG-11 L243 keeps Reminder as a separate Doer. |
| DOC3 AG-11 action (July) | "create_task \| Create/assign a task \| Tasker → Task (cross-cutting)" | Doc 3 v1.4, AG-11 action catalogue, L5085 | None stated | — |
| DOC3 notification (July) | "notif/task-due \| task-due (AG-11/Tasker) \| in-app \| yes \| the task" | Doc 3 v1.4, AG-10 notification catalogue, L4599 | None stated | — |
| DOC3 AG-17 (July) | "Tasker (AG-13) — checklist gaps and follow-ups surface as tasks/My-Day items via the standard (entityType, entityId) attach" | Doc 3 v1.4, AG-17 Doer use, L8253 | None stated | — |

Requirement rows: **42**.

## Gaps noticed

- Two definitions survive: RFP v2.0 says the Tasker is "workflow task automation" and the Minder does "task creation and assignment"; the founders' spec, Doc 3 and the October files say the Tasker creates and assigns tasks.
- Release conflict: Charter V1/V2 defer the automation engine "and its Doers" naming the Tasker, while keeping ordinary tasks. AG-11 v1.11 (AG11-D3) and Agent 99-Phasing v1.4 put a minimal Conductor with Tasker actions in Release 1.
- Overdue escalation: AG-13-7 says off by default; AG-11 (AG11-D9) turns escalation on from 5 staff. AG-11 §0.2 lists the knock-on as pending; the scope review asks the founder to choose (TRI Q5).
- The Tasker is deterministic. Human steps: people complete tasks; the "Review document" task is closed when a person approves Reader values (AG-11 L369).
- Audit: AG-13 writes an audit row on create/assign and on reopen (L225, AG-13-8). The audit record does not say whether a task was created by a person or by an automation recipe. Inferred: the run history in AG-11 holds that link.
- No AI is involved in the Tasker itself.
