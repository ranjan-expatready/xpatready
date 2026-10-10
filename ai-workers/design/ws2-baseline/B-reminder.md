# B-reminder: the Reminder (time-based nudges)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Reminder sends a nudge at a set time: to a staff member, to the client, or both, by in-app notice or email, once or on a repeating schedule. Reminders are created by people ("remind me about this lead on Thursday") or by the Conductor (for example the missing-document chase). **Who uses it:** all staff; clients receive the client-facing nudges (AG-13, AG-11). **What it replaces (founders' spec):** "sticky notes / manual" ("follow-ups + nudges"). **Naming:** the Founder Decisions Log (FD-8, ratified 3 Jul 2026) says "Reminder folds into Minder"; the October files nonetheless keep the Reminder as its own Doer, with the Minder beside it. Both views are recorded here; see also B-minder.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- FDL v1.5: `sources/drive-snapshot-2026-10-09/01-techno-functional/07-Founder-Decisions-Log.md`
- RFP v2.0: `sources/drive-snapshot-2026-10-09/01-techno-functional/01-RFP-Build-Proposal.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- Agent 99-Phasing v1.4: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/99-Phasing-and-Glossary_v1.4_2026-10-05.md`
- Agent 00-Overview v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/00-Overview_v1.11_2026-10-07.md`
- AG-11 v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-11-automation_v1.11_2026-10-07.md`
- AG-13 v1.12: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-13-tasks-reminders-notes-and-activity-audit_v1.12_2026-10-07.md`
- AG-09 v1.8: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-09-document-management_v1.8_2026-10-07.md`
- AG-02 v1.9: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-02-prospect-lead-sales-crm_v1.9_2026-10-07.md`
- AG-01 v1.16: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-01-firm-setup-and-onboarding_v1.16_2026-10-08.md`
- AG-04 v1.5: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-04-consultation-and-booking_v1.5_2026-10-07.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Charter V1 (md dump): `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter V1 - G1 expanded.md`
- Doc 3 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md`
- Doc 4 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/06-Doc-4-Client-Portal.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Reminder \| follow-ups + nudges \| sticky notes / manual" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 2, L68 | Tier 2 (no release date) | FD-8 folds it into the Minder (FDL L33). |
| SPEC-IA My Day | "Follow-ups \| Reminder" | Founders IA Doers model v1 (2026-06-14), Home = "My Day", L43 | None stated | — |
| FD-8 | "Reminder folds into Minder (one nudge identity; AG-13 §3.2 retitled; naming spec amended)" | FDL v1.5, Wave-0 batch, resolved 2026-07-03, L33 | None stated (binding, FDL L22) | October AG-11 L243, AG-13 L227 and Agent 99-Phasing v1.4 L52 still name the Reminder as a separate Doer. The naming spec in the code copy still lists it (SPEC-N L68). |
| RFP §4.10 | "Reminder (schedules and fires reminders)" | RFP v2.0, §4.10 Automation Engine, L167 | None stated | — |
| DOC2 no capability row | "there is no cap.reminder row anywhere in this catalog: per FD-8 the reminder/nudge capability is part of cap.minder — one nudge identity" | Doc 2 v1.4, SA-CT, "Clocker and the Reminder fold", L103 | None stated | Conflicts with the October glossary (APHG L52), which lists Reminder as one of "the four automation Doers". |
| APHG glossary | "the four automation Doers — Reminder (client nudges — "speaks"), Minder (deadlines and dates — "thinks"" | Agent 99-Phasing v1.4, Glossary, "Doer", L52 | None stated | The October glossary splits Reminder (client nudges) from Minder (deadlines); AG-13 §3.2 says a Reminder may go to "the assigned user, the client, or both" (L229). |
| AOVW in-house list | "plus Tasker, Reminder, Minder, the immigration-only Doers" | Agent 00-Overview v1.11, In-House by Design, L177 | None stated | — |
| AG-11 §3.0 | "Reminder (time-based nudge), Minder (watches a deadline/condition and reminds as it nears/breaches" | AG-11 v1.11, §3.0 Conductor↔Doers model, L243 | None stated | — |
| AG-11 §3.0 no second system | "there is no parallel reminder system to build. The Reminder module exists and the Workflow engine already drives it (create_reminder/send_reminder)." | AG-11 v1.11, §3.0 Reference-note callout, L254 | None stated | AG-04 §3.7 keeps its own per-appointment-type reminder rules scheduled by the Scheduler (AG-04 L296); TRI L56 asks for "one reminder system, not two". |
| AG-11-2 | "Reminder (create_reminder/send_reminder)" | AG-11 v1.11, §4 Conductor↔Doers model, L553 | None stated (status: exists) | — |
| AG-11 autonomy | "Internal: create task, reminder, internal notification, assign … \| AUTO \| APPROVE or OFF \| none" | AG-11 v1.11, §3.3 autonomy table, L312 | None stated | A reminder that reaches the client is a template message (row below in the same table, L313). |
| AG-11 recipe missing-doc chase | "a chase message to the client listing what is still needed [AUTO, template — the list is a merge field] + an internal reminder …" | AG-11 v1.11, §3.5 Release 1 seeds, L370 | Release 1 seed (heading, AG-11 L367) | Timings 5 days, then every 7, at most 4 (same line); firm-editable (AG-16-51). |
| AG-11 recipes service reminders | "Biometrics countdown — a client-facing reminder before the biometrics date, on top of the Minder's staff reminders" | AG-11 v1.11, §3.5 More Release 1 recipes, L376 | On by default (list heading, AG-11 L375); Release 1 per AG11-D18(d) | Charter V1 L121 keeps only "three plain notices". |
| AG-11 §12 module | "A separate but engine-driven Reminder module (src/reminder) the Workflow engine already orchestrates … there is no need for a second reminder system." | AG-11 v1.11, §12 Reference note, L1208 | None stated | — |
| AG-13 §3.2 heading | "3.2 Reminders (the Reminder / Minder Doer's record)" | AG-13 v1.12, §3.2, L227 | None stated | Doc 3 v1.4 L6231 (July) says there is no separate "Reminder" Doer. |
| AG-13 §3.2 how it works | "A Reminder is a time-based nudge attached to any entity, delivered on a channel (In-App \| Email \| Both) to a recipient scope (the …" | AG-13 v1.12, §3.2 How it works, L229 | None stated | — |
| AG-13 §3.2 standard deadlines | "Standard deadlines are registered directly with the Minder by any module, always on, with no firm set-up … the Conductor drives only firm-designed reminders." | AG-13 v1.12, §3.2 Honest grounding, L231 | None stated | See B-minder. |
| AG-13 §3.2 data flow | "worker at fire time: re-check relevance (skip if stale) + per-recipient daily-dedup → deliver (Notification + Mailer) → mark Sent → if recurring, compute …" | AG-13 v1.12, §3.2 Data flow, L247 | None stated | — |
| AG-13-10 | "User-created ad-hoc reminders on any entity (date/time in firm TZ, channel, recipient scope, optional recurrence)." | AG-13 v1.12, §4 Reminders, L364 | None stated (status "NEW") | TRI L170 keeps "reminders staff set themselves". |
| AG-13-11 | "Conductor-driven reminders (rule/date-field triggers) write the same Reminder rows on the same Bull queue" | AG-13 v1.12, §4 Reminders, L365 | None stated (status "exists") | — |
| AG-13-12 | "next-occurrence computed in firm TZ / DST-safe (today: naive server-clock setMonth/setDate)." | AG-13 v1.12, §4 Reminders, L366 | None stated | — |
| AG-13-13 | "Snooze (15m / 1h / tomorrow / custom) → schedules next occurrence, marks current snoozed, audited." | AG-13 v1.12, §4 Reminders, L367 | None stated (status "NEW") | TRI L176 proposes to move snooze. |
| AG-13-14 | "Skip-if-stale at fire time (host case closed / Conductor rule no longer matches / host archived)" | AG-13 v1.12, §4 Reminders, L368 | None stated | Exception for recorded dates such as permit expiry (AG-13 L237). |
| AG-13-15 | "Per-recipient daily delivery dedup; idempotent under queue redelivery." | AG-13 v1.12, §4 Reminders, L369 | None stated | — |
| AG-13 BR-7 | "User-created and Conductor-created reminders are the same record type on the same queue. The Conductor owns when/why; AG-13 owns the record/lifecycle" | AG-13 v1.12, §5 Business rules, L424 | None stated | — |
| AG-13 deferral | "Live SMS/WhatsApp reminder channels (Release 2, via Messenger) — email + in-app ship now." | AG-13 v1.12, §13 Named deferrals, L712 | "Release 2" | AG11-D18(a) puts proactive WhatsApp reminders in Release 1 (AG-11 L47); the two October files disagree. |
| AG-09-8 | "per-item reminders (Reminder Doer) respect consent, quiet hours and the "Not started" (QUIET) state" | AG-09 v1.8, §4 Document requests, L479 | None stated | — |
| AG-02 sequences | "Reminder for nudges" | AG-02 v1.9, §3.6 Sequences, L350 | None stated | — |
| AG-01 onboarding nudges | "Incomplete-onboarding Notifications/reminders (Mailer + in-app, via the Notification/Reminder Doers) re-engage a firm that stalled mid-setup" | AG-01 v1.16, AG-01 world-class behaviour, L338 | None stated | TRI L22 proposes to move "stalled-setup nudges". |
| AG-04 consult reminders | "On booking, the Scheduler schedules delayed jobs on the queue for each rule … Sends go through the Mailer (email) and Messenger (SMS/WhatsApp) Doers." | AG-04 v1.5, §3.7 Confirmations & reminders, L296 | None stated | Overlap: consult reminders run on the Scheduler's own rules, not the AG-13 Reminder record; TRI L56 wants them "through AG-11". |
| APHG Release 1 | "Messenger/Reminder for consult reminder, retainer chase, document nudge + run log" | Agent 99-Phasing v1.4, Phasing table, Release 1, L19 | "Release 1 — go-live" | Matches the three plain notices kept by Charter V1 L121. |
| TRI AG-04 | "calendar invite + reminders (through AG-11 — one reminder system, not two)" | SCOPE-TRIAGE 2026-10-05, AG-04 Stays, L56 | Stays in Release 1 (list heading, TRI L6) | — |
| CH1 notes | "Reminder was folded into Minder by FD-8); advanced engagement scoring. Ordinary tasks, reminders and three plain notices (consultation reminder, unsigned document chase, missing evidence …" | Charter V1 (md dump), Speaker notes, "NOT IN RELEASE 1", L121 | "stay" (ordinary reminders and three notices) | — |
| DOC3 §3.2 (July) | "the nudge Doer identity is the Minder — there is no separate "Reminder" Doer; Reminder below names the machinery record, unchanged." | Doc 3 v1.4, AG-13 §3.2, L6231 | None stated | October AG-13 L227 reinstates "the Reminder / Minder Doer's record". |
| DOC3 action (July) | "create_reminder \| Schedule a time-based nudge \| Minder → Reminder record (AG-13 cross-cutting)" | Doc 3 v1.4, AG-11 action catalogue, L5084 | None stated | October AG-11-2 (L553) maps create_reminder to the Reminder Doer. |
| DOC3 data flow (July) | "write Reminder (Pending, scheduledAt in UTC computed from firm-TZ intent) with (entityType, entityId) + firm_id + audit row (same TX)" | Doc 3 v1.4, AG-13 §3.2 Data flow, L6243 | None stated | July writes the audit row at creation; October (AG-13 L247) audits after delivery. |
| DOC4 CP-4-14 (July) | "Expiry nudges are transactional, in-locale, brand-skinned, consent/quiet-hours-respecting (Minder/Messenger notif/* + Reminder, Doc 1 §7.6), and auto-exit on renewal upload." | Doc 4 v1.3, CP-4 §4, L1292 | None stated | — |

Requirement rows: **37**.

## Gaps noticed

- Naming conflict (ratified decision vs October files): FD-8 folds the Reminder into the Minder; Doc 2 has no reminder capability; Doc 3 says there is no separate Reminder Doer. The October AG-11, AG-13, Overview and Glossary keep the Reminder as a separate Doer and split it as "client nudges" against the Minder's "deadlines and dates". FD-8 changes only with the founder's yes.
- Two reminder systems remain: AG-04 consult reminders are scheduled by the Scheduler on its own rules (AG-04 §3.7), while AG-11 and the scope review say there should be one reminder system.
- Release: ordinary reminders are Release 1 in every source; the Charter calls the Reminder an automation Doer that is deferred and folded into the Minder. WhatsApp reminders are Release 1 in AG-11 but Release 2 in AG-13.
- Deterministic: timing, dedup, skip-if-stale and recurrence are all rules. Human steps: a person creates ad-hoc reminders and snoozes them; client-facing reminders sent by recipes are template messages that send automatically once the firm has confirmed its standard messages (AG11-D12).
- Audit: October AG-13 audits snooze and writes "timeline + Audit" after delivery; Doc 3 writes the audit row with the record. Neither says whether the audit shows that a recipe, not a person, created the reminder.
