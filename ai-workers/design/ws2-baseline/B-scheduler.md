# B-scheduler: the Scheduler (consultation booking)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Scheduler lets a prospective client book a consultation from the firm's public page in their own time zone, stops two people taking the same slot, turns the booker into a lead, sends the confirmation and reminders with a calendar invite, and records the consultation outcome that becomes the retainer proposal. **Who uses it:** the public (to book); intake staff and consultants (availability, outcomes); the Owner (booking analytics) (AG-04). **What it replaces (founders' spec):** "Calendly" ("consult booking / calendar"). **Status in one line:** AG-04 is Release 1; paid consults, two-way calendar sync, video connectors and booking analytics are proposed for Release 2 in the 5 Oct scope review, which also proposes dropping the in-house video room that founder decision FD-13 made the v1 adapter.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- Agent 00-Overview v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/00-Overview_v1.11_2026-10-07.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- AG-04 v1.5: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-04-consultation-and-booking_v1.5_2026-10-07.md`
- FDL v1.5: `sources/drive-snapshot-2026-10-09/01-techno-functional/07-Founder-Decisions-Log.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- SA-08 v2.2: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-08-platform-integrations-and-infrastructure-rails_v2.2_2026-10-02.md`
- Doc 1 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/03-Doc-1-Platform-Foundation.md`
- AG-14 v1.10: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-14-reporting-and-analytics_v1.10_2026-10-07.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Scheduler \| consult booking / calendar \| Calendly" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 1, L62 | Tier 1 — Live now (shipped), per SPEC-N L57 (June repo status, not re-checked) | — |
| SPEC-N naming | "Same logic retired "Calend-ar" → Scheduler" | Founders naming spec v1 (2026-06-13), §3, L45 | None stated | — |
| SPEC-IA cleanup | "Calendar + Booking → one Scheduler" | Founders IA Doers model v1 (2026-06-14), Cleanups / fixes, L67 | None stated | — |
| SPEC-IA My Day | "Consults today \| Scheduler" | Founders IA Doers model v1 (2026-06-14), Home = "My Day", L41 | None stated | — |
| AOVW scope | "AG-4 \| Consultation & Booking (Scheduler) \| In-house availability/booking · public booking page · confirmations/reminders (ICS) · consult records · optional own-calendar sync \| …" | Agent 00-Overview v1.11, Detailed Scope Index, L83 | "Release 1" | TRI L61 proposes to move two-way calendar sync. |
| DOC2 capability | "cap.scheduler \| scheduling \| DOER \| cap.mailer \| feature.scheduler \| growth" | Doc 2 v1.4, SA-CT capability registry seed table, L77 | "growth" (illustrative tier) | — |
| AG-04 §3.0 design | "a booking is a revenue event, not a calendar event. Every booking is born linked (or linkable) to a Lead/Contact in AG-2 and, when …" | AG-04 v1.5, §3.0 The Scheduler's place in the revenue spine, L163 | None stated | — |
| AG-04 §3.0 reuse | "a booking can attach to a Case, not just a Prospect) — so the firm has one scheduler, not two." | AG-04 v1.5, §3.0, L168 | None stated | — |
| AG-4-2 | "Rule times interpreted in the host/firm timezone; slot UTC instants derived per calendar date with correct DST offset." | AG-04 v1.5, §4 Availability, L453 | None stated (exists) | — |
| AG-4-7 | "Business-hours + holiday calendar (per office, seeded from the firm's one country pack — FD-68) subtract from availability." | AG-04 v1.5, §4 Availability, L458 | None stated (NEW) | TRI L65 proposes to move business-hours/holiday maths. |
| AG-4-15 | "Pre-consult agreement requirement (acceptance captured w/ timestamp), wording resolved from the firm's Country Pack." | AG-04 v1.5, §4 Appointment types, L468 | None stated | Regulated wording: confirm with counsel. |
| AG-4-22 | "New booker → create Lead/Contact source=BOOKING with locale/country/attribution; existing → link; returning client → link to client/case." | AG-04 v1.5, §4 Lead auto-creation, L479 | None stated | — |
| AG-4-26 | "SELECT … FOR UPDATE lock serializes concurrent bookings on a host; loser gets 409 + refreshed slots." | AG-04 v1.5, §4 Double-booking safety, L485 | None stated (exists) | — |
| AG-4-28 | "In-house room link generated by default (no external account)." | AG-04 v1.5, §4 Video links, L489 | None stated (NEW) | TRI L66 proposes to drop the in-house video room; FD-13 (FDL L38) made the in-house WebRTC room the v1 adapter. |
| AG-04 §3.6 no third-party | "there is NO third-party scheduling-tool dependency. The booking, slots, reminders, and self-service are all in-house" | AG-04 v1.5, §3.6 Video links, L283 | None stated | — |
| AG-04 §3.7 reminders | "On booking, the Scheduler schedules delayed jobs on the queue for each rule; on reschedule it reschedules them; on cancel it fires the cancellation …" | AG-04 v1.5, §3.7 Confirmations, reminders & follow-ups, L296 | None stated | TRI L56 wants consult reminders "through AG-11 — one reminder system, not two". |
| AG-4-31 | "Per-type reminder rules (trigger/offset/channel/template) with seeded defaults." | AG-04 v1.5, §4 Confirmations & reminders, L494 | None stated (exists) | — |
| AG-4-32 | "ICS attachment on confirmation/reschedule with stable UID + SEQUENCE bump (update, not duplicate)." | AG-04 v1.5, §4 Confirmations & reminders, L495 | None stated (NEW) | TRI L56 keeps "calendar invite + reminders". |
| AG-4-35 | "Sends via Mailer (email) / Messenger (SMS/WhatsApp; email-only for demo)." | AG-04 v1.5, §4 Confirmations & reminders, L498 | "email-only for demo" | — |
| AG-4-39 | "Staff mark Completed/No-show; auto-no-show after configurable grace." | AG-04 v1.5, §4 Self-service & disposition, L504 | None stated | TRI L65 proposes to move auto no-show. |
| AG-4-40 | "Connect firm's OWN Google/Outlook via OAuth (host-scoped, encrypted tokens)." | AG-04 v1.5, §4 Own calendar, L507 | None stated (NEW) | TRI L61 proposes to move two-way calendar sync. |
| AG-4-44 | "Paid type → PENDING_PAYMENT (slot held) → Biller → SCHEDULED on success." | AG-04 v1.5, §4 Paid consults, L513 | None stated (exists) | TRI L59 proposes to move paid consults. |
| AG-4-47 | "Emit appointment.scheduled\|rescheduled\|cancelled\|no_show\|completed to the Conductor; at-least-once." | AG-04 v1.5, §4 Lifecycle events, L518 | None stated | These events are Conductor triggers (no-show recovery recipe, AG-11 L379). |
| AG-4-48 | "Consumers idempotent (key = bookingId + transition); side-effects non-fatal to the disposition." | AG-04 v1.5, §4 Lifecycle events, L519 | None stated | — |
| AG-04 §3.11 data flow | "Disposition write → emit event (with idempotency key) → Conductor fans out to consumers (each idempotent, non-fatal) → AuditLog." | AG-04 v1.5, §3.11 Lifecycle events, L391 | None stated | — |
| AG-04 §3.11 no-show | "appointment.no_show \| Staff/auto marks NO_SHOW \| AG-2 no-show recovery sequence, Notification (owner), analytics" | AG-04 v1.5, §3.11 event table, L381 | None stated | No-show recovery recipe: Release 1, off by default (AG-11-106). |
| AG-4-49 | "Completed booking opens a Consult Record (attendance/notes/recommended pathway+services/fee/next-step)." | AG-04 v1.5, §4 Consult records, L522 | None stated (NEW) | — |
| AG-4-50 | ""Create proposal from consult" launches Drafter pre-filled → Signer (AG-5)." | AG-04 v1.5, §4 Consult records, L523 | None stated (NEW) | See B-drafter and B-signer. |
| AG-4-51 | "Round-robin (lowest-count via GROUP BY, persisted cursor) / any-available; capacity- and ownership-validated." | AG-04 v1.5, §4 Round-robin, L526 | None stated | TRI L60 proposes to move round-robin. |
| AG-4-52 | "Show-rate, no-show rate, volume, upcoming, paid revenue — period-over-period" | AG-04 v1.5, §4 Booking analytics, L529 | None stated | TRI L63 proposes to move booking analytics. |
| AG-4-53 | "A deactivated staff member SHALL be removed as host from every appointment type and calendar immediately" | AG-04 v1.5, §4 Staff leaving, L532 | None stated | — |
| AG-04 §13 Q1 | "Locked: build the Scheduler as an in-house Doer; the only external touch is a connector to the firm's OWN Google/Outlook calendar and optionally its …" | AG-04 v1.5, §13 Locked, L820 | None stated | — |
| AG-04 §13 Q5 | "In-house video room depth for the demo." | AG-04 v1.5, §13 Still genuinely open, L826 | Open founder question | — |
| AG-04 §13 deferrals | "Full in-house WebRTC video (Phase-2/3) — room/redirect or firm's-own account now." | AG-04 v1.5, §13 Named deferrals, L836 | "Phase-2/3" | AG-04 still uses Phase vocabulary; FD-13 says the in-house WebRTC room is the v1 adapter. |
| FD-13 | "in-house WebRTC room = v1 adapter (Zoom adapter = later escape hatch behind the same port)" | FDL v1.5, Wave-0 batch, resolved 2026-07-03, L38 | "v1 adapter" | TRI L66 "(drop) In-house video room"; AG-04 L836 defers full WebRTC. |
| TRI AG-04 stays | "appointment types and availability · public booking page (hardened) · double-booking protection · booker … calendar invite + reminders (through AG-11 — one reminder …" | SCOPE-TRIAGE 2026-10-05, AG-04 Stays, L56 | Stays in Release 1 (list heading, TRI L6) | — |
| TRI AG-04 moved | "Paid consults (hold, expiry, refund)" | SCOPE-TRIAGE 2026-10-05, AG-04 Proposed to move, L59 | Proposed to move to Release 2 (list meaning, TRI L7) | — |
| TRI AG-04 drop | "(drop) In-house video room" | SCOPE-TRIAGE 2026-10-05, AG-04 Proposed to move, L66 | "(drop)" | Conflicts with FD-13. |
| SA-08 connector | "The in-house Scheduler is ER's booking tool (no Calendly) and the Mailer is ER's email tool. Optionally, a firm may connect its own Google/Microsoft account" | SA-08 v2.2, §3.8 Own-Mailbox / Own-Calendar Connector, L278 | None stated | — |
| SA-08 BR-11 | "if absent or disabled, Scheduler/Mailer run fully self-contained — a Doer is never broken by an unconfigured connector." | SA-08 v2.2, §5 Business rules, L429 | None stated | — |
| DOC1 A3 | "There is still no SchedulerPort (the Scheduler is the Doer, not a rail); the connectors are the Scheduler's external seam." | Doc 1 v1.3, Amendment A3 (amends §6.3), L2982 | None stated | — |
| AG-14 naming overlap | "The Scheduler (cron) enqueues the run" | AG-14 v1.10, AG-14 §3.9 Scheduled Reports, L294 | None stated | Same word used for a timed job, not this Doer. |

Requirement rows: **42**.

## Gaps noticed

- Release split: AG-04 v1.5 specifies paid consults, round-robin, calendar sync, video connectors and analytics without Release labels (it still uses "Phase" and "demo" wording in §13); the scope review proposes moving most of them and dropping the in-house video room. No founder answer to the proposals is in the snapshot.
- FD-13 (ratified 3 Jul 2026) makes the in-house WebRTC room the v1 video adapter; AG-04 defers full WebRTC and the scope review proposes dropping the room. Changing FD-13 needs Ranjan's yes.
- Two reminder systems: consult reminders are scheduled by the Scheduler's own rules (AG-4-31, AG-4-34) while AG-11 and the scope review want one reminder system.
- Deterministic: slot maths, locking, timezone, ICS, lifecycle events. Human steps: staff mark Completed or No-show and fill the consult record; "Create proposal from consult" is a person's action that hands to the Drafter and Signer.
- Audit: lifecycle events end in AuditLog (AG-04 L391). No requirement says what is audited for a public self-service booking or reschedule beyond the event itself.
- AI: none in the Scheduler today. AG-02 next-best-action suggestions that follow a consult are proposed for Release 2 (TRI L29).
