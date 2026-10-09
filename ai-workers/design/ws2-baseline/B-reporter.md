# B-reporter: the Reporter (dashboards and reports)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Reporter turns what the other modules record (leads, cases, invoices, tasks, calls, time, deadlines, audit) into dashboards, exports and scheduled email reports, so an owner or manager can see how the firm is doing. It only reads; it never changes operational records. **Who uses it:** the Owner and Case Manager most, plus every staff member for their own figures (AG-14). **What it replaces (founders' spec):** "spreadsheets / PowerBI". **Status in one line:** a core snapshot is Release 1 in the October phasing; the full dashboards and scheduled reports are Release 2, and the 5 Oct scope review moved scheduled reports out.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- Agent 99-Phasing v1.4: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/99-Phasing-and-Glossary_v1.4_2026-10-05.md`
- Doc 1 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/03-Doc-1-Platform-Foundation.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- AG-14 v1.10: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-14-reporting-and-analytics_v1.10_2026-10-07.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- AG-11 v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-11-automation_v1.11_2026-10-07.md`
- Doc 3 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Reporter \| dashboards + BI \| spreadsheets / PowerBI" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 2, L70 | Tier 2 (no release date) | — |
| SPEC-N positioning | "Reporter→PowerBI" | Founders naming spec v1 (2026-06-13), §7 Positioning, L101 | None stated | — |
| SPEC-IA sidebar | "Mailer · Scheduler · Tasker · Biller · Reporter (daily Doer-surfaces" | Founders IA Doers model v1 (2026-06-14), The lean sidebar, L26 | None stated | — |
| APHG glossary | "Reporter (analytics)" | Agent 99-Phasing v1.4, Glossary, "Doer", L52 | None stated | Listed with the non-AI Doers. |
| DOC1 capability kind | "DOER (an in-house Doer: Signer, Mailer, Scheduler, Biller, Minder, Filler, Qualifier, Messenger, Reporter, Finder, Drafter, Reviewer, Binder, Tasker)" | Doc 1 v1.3, §1.12 Capability Registry, field "kind", L312 | None stated | — |
| DOC2 capability | "cap.reporter \| reporting \| DOER \| cap.fx \| feature.reporting.advanced \| enterprise" | Doc 2 v1.4, SA-CT capability registry seed table, L90 | "enterprise" (illustrative tier) | Tier is illustrative and founder-confirm (Doc 2 L72). An "enterprise" default sits uneasily with Release 1 dashboards for all firms (APHG L19). Inferred. |
| AG-14 ownership | "The Reporter owns the read/aggregation layer (rollups, metric definitions, dashboards, schedules, exports). It reads from, and never writes to, the operational modules." | AG-14 v1.10, Module header, L106 | None stated | — |
| AG-14 §3.0 read-only | "the Reporter is a read-and-aggregate layer, strictly separated from the operational write path." | AG-14 v1.10, §3.0 Reporting architecture, L147 | None stated | — |
| AG-14 §3.0 sources | "tasks/calls/time in AG-13, audit/reminders in AG-13, deadlines in the Minder (AG-11). The Reporter never duplicates these as a second write-path and never writes back …" | AG-14 v1.10, §3.0, L149 | None stated | Doc 3 v1.4 L6644 places deadlines in AG-13, not the Minder. |
| AG-14-1 | "The Reporter SHALL read from operational-module aggregates and SHALL NOT write to operational tables; reporting is a strict read/aggregate layer." | AG-14 v1.10, §4 Detailed FRs, L348 | None stated | Same text in Doc 3 v1.4 L6788. |
| AG-14-2 | "materialized rollups + counters per analytics domain … updated incrementally off domain events on the queue and reconciled against the source on a nightly job." | AG-14 v1.10, §4, L349 | None stated | TRI L186 proposes to move "Rollup engine, cache, nightly reconcile". |
| AG-14-5 | "The Reporter SHALL provide funnel (stage counts), stage-to-stage and overall conversion rate, average days-to-convert, and time-in-stage (bottleneck) metrics." | AG-14 v1.10, §4 Sales, L354 | None stated | TRI L181 keeps "leads by stage + conversion". |
| AG-14-9 | "The Reporter SHALL provide case load by status/stage/service/program/office/officer, and new-vs-closed trend (country is a firm-wide constant, FD-68)." | AG-14 v1.10, §4 Delivery, L360 | None stated | Doc 3 v1.4 L6800 (July) segments case load by "country"; October removes it (FD-68). |
| AG-14-16 | "workload per rep/officer (open leads/cases/tasks), task throughput (created/completed/overdue/on-time %), call volume, and time logged (where tracked), with over/under-load flags" | AG-14 v1.10, §4 Productivity, L371 | None stated | TRI L190 proposes to move productivity metrics. |
| AG-14-17 | "deadline adherence %, the upcoming deadline horizon and list — with at-risk items only where the firm has switched at-risk marks on (AG-16-32) — …" | AG-14 v1.10, §4 Compliance, L374 | None stated | Doc 3 L6814 (July) always shows at-risk items read from Case.atRisk; TRI L192 proposes to drop the audit-volume tile. |
| AG-14 §3.5 data flow | "Minder deadline (AG-11) / AG-13 reminder + AuditLog events → compliance rollups (per firm/type) → Reporter reads → dashboard" | AG-14 v1.10, §3.5 Compliance analytics, L243 | None stated | Reads Minder events (see B-minder). |
| AG-14 §3.9 scheduled reports | "The Scheduler (cron) enqueues the run; a worker renders the report as the schedule's owner … and Mailer delivers it." | AG-14 v1.10, §3.9 Scheduled Reports (email via Mailer), L294 | None stated | Naming overlap: "Scheduler" here is a timed job, not the booking Doer of AG-04 (see B-scheduler). |
| AG-14 §3.9 audit | "every scheduled send is audited (PII leaves the system by email) … Passport and financial numbers are never put into the content of the email." | AG-14 v1.10, §3.9 World-class behaviour, L300 | None stated | — |
| AG-14 §3.9 data flow | "Scheduler cron → enqueue run → worker renders dashboard/view as schedule owner … → Mailer sends → AuditLog (actor=owner, recipients, scope) → Notification on failure." | AG-14 v1.10, §3.9 Data flow, L304 | None stated | — |
| AG-14-23 | "Users SHALL configure ReportSchedule (dashboard/view, cadence daily/weekly/monthly at a day/time in firm timezone, recipients self/users/role, format in-email + PDF/XLSX, locale)." | AG-14 v1.10, §4 Scheduled reports, L384 | None stated | Release 2 per APHG L20 and TRI L183. |
| AG-14-24 | "A scheduled report SHALL be rendered with the schedule owner's permission scope … delivered via Mailer, audited (actor=owner, recipients, scope), and idempotent per (schedule, run-date)" | AG-14 v1.10, §4 Scheduled reports, L385 | None stated | Open question 6 (L659) asks the founder to confirm the owner-scope rule. |
| AG-14-26 | "Export SHALL be permission-scoped … money FX-normalised … async for large sets … and audited (actor, scope, filter, row count)." | AG-14 v1.10, §4 Export, L389 | None stated | TRI L181 keeps "CSV export (audited)". |
| AG-14-29 | "Sensitive actions (export, scheduled-report send, schedule create/edit, shared-view publish) SHALL be audited (actor, target, scope, before/after where applicable)." | AG-14 v1.10, §4 Cross-cutting, L396 | None stated | — |
| AG-14 §3.6 Release 1 | "Release 1 (AG17-D38, D51): the Corporate view has no corporate dashboard. … The corporate dashboard tiles are defined in AG-14-34 and built in Release 2." | AG-14 v1.10, §3.6 Dashboards, L253 | "Release 1" / "Release 2" | — |
| AG-14 §13 deferral | "Anomaly detection / alerting on metrics (e.g. "conversion dropped 20% WoW") — manual review ships now." | AG-14 v1.10, §13 Named deferrals, L666 | Named deferrals, explicitly Release 2 or later (list heading L662) | No AI or automatic insight is specified for the Reporter. |
| APHG Release 1 | "a core AG-14 sales/case/financial snapshot." | Agent 99-Phasing v1.4, Phasing table, Release 1, L19 | "Release 1 — go-live" | — |
| APHG Release 2 | "AG-14 full sales/case/financial/productivity dashboards + drill-through + scheduled reports;" | Agent 99-Phasing v1.4, Phasing table, Release 2, L20 | "Release 2 — Breadth and corporate depth" | Conflicts with AG-14 v1.10, which specifies scheduled reports (AG-14-23/24) without a Release 2 label. |
| TRI AG-14 stays | "two dashboards (Owner, Staff) · per-currency totals · CSV export (audited) · tile opens the matching list" | SCOPE-TRIAGE 2026-10-05, AG-14 Stays, L181 | Stays in Release 1 (list heading, TRI L6) | AG-14 §13 Q1 (L652) proposes six seeded dashboards. |
| TRI AG-14 moved | "Already moved [today]: scheduled reports by email" | SCOPE-TRIAGE 2026-10-05, AG-14, L183 | "Already moved [today]" | TRI is a review file, not a requirement (TRI L3). |
| AG-11 §0.2 AG-14 | "AG-14 \| Home screen order — Needs you, then Done for you, then dashboards (AG11-D7) \| Pending" | AG-11 v1.11, §0.2 Pending knock-ons, L57 | "Pending" | Dashboards sit behind the Needs you queue (owned by carve-out A). |
| DOC3 AG-14-17 (July) | "At-risk status SHALL be read from AG-7's Case.atRisk (the case-delivery owner of that state), never re-derived in the Reporter." | Doc 3 v1.4, AG-14 §4, L6814 | None stated | October AG-14-17 (L374) shows at-risk items only where at-risk marks are switched on. |
| DOC3 AG-14-9 (July) | "case load by status/stage/service/program/country/officer" | Doc 3 v1.4, AG-14 §4, L6800 | None stated | October drops "country" (FD-68). |

Requirement rows: **32**.

## Gaps noticed

- The Reporter is fully deterministic (rollups, counts, sums). No requirement uses AI on reports; anomaly alerts are deferred (AG-14 §13).
- Release status is split across sources: AG-14 v1.10 specifies scheduled reports and six seeded dashboards; Agent 99-Phasing v1.4 puts full dashboards and scheduled reports in Release 2; the scope review keeps two dashboards and says scheduled reports were already moved. The Charter lists "reports" among Release 1 capabilities (Charter V1 L80) without detail.
- AG-14 calls its timed job "the Scheduler (cron)", which collides with the Scheduler Doer name (booking).
- Audit: exports, scheduled sends and schedule changes are audited (AG-14-26, AG-14-29); ordinary dashboard views are not stated as audited.
- The Doc 2 capability tier for the Reporter is "enterprise" (illustrative) while Release 1 gives every firm a core snapshot. Which plan carries which dashboards is an open founder question (AG-14 §13 Q5).
- No human approval step is specified anywhere in the Reporter; it produces read-only output. Inferred: an AI Worker would only read reports, never change them.
