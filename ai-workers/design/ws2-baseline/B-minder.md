# B-minder: the Minder (deadlines and dates)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Minder watches the dates that matter on a file (biometrics, medicals, permit and PR-card expiry, officer deadlines, LMIA validity and others), reminds the file owner as each date nears, stops when the obligation is met, and, only if the firm has switched it on, alerts the people who can reassign cases and marks the case at risk. Any module can register a "standard deadline" with it directly; no automation is needed. **Who uses it:** the file owner receives its reminders; the Owner chooses escalation and at-risk marks (AG-11, AG-16, AG-17). **What it replaces (founders' spec):** none named; it is a Tier 3 "immigration-only moat" Doer ("deadlines, status, audit trail"; the IP is "compliance"). **Status in one line:** the October files make the "Minder core" Release 1 and always on; the Charter defers the automation engine "and its Doers" naming the Minder and asks the founder to decide on "a simple deadline and expiry reminder".

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- RFP v2.0: `sources/drive-snapshot-2026-10-09/01-techno-functional/01-RFP-Build-Proposal.md`
- FDL v1.5: `sources/drive-snapshot-2026-10-09/01-techno-functional/07-Founder-Decisions-Log.md`
- Agent 99-Phasing v1.4: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/99-Phasing-and-Glossary_v1.4_2026-10-05.md`
- Agent 00-Overview v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/00-Overview_v1.11_2026-10-07.md`
- AG-17 v0.5: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-17-corporate-cases-and-lmia_v0.5_2026-10-07.md`
- AG-11 v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-11-automation_v1.11_2026-10-07.md`
- AG-09 v1.8: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-09-document-management_v1.8_2026-10-07.md`
- AG-07 v2.7: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-07-case-core-and-delivery_v2.7_2026-10-07.md`
- AG-13 v1.12: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-13-tasks-reminders-notes-and-activity-audit_v1.12_2026-10-07.md`
- AG-18 v1.2: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-18-data-import-and-migration_v1.2_2026-10-07.md`
- AG-16 v1.12: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-16-firm-settings-and-integrations_v1.12_2026-10-08.md`
- SA-03 v2.14: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-03-subscription-plans-and-entitlements_v2.14_2026-10-07.md`
- SA-06 v3.1: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-06-rbac_v3.1_2026-10-08.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Charter V1 (md dump): `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter V1 - G1 expanded.md`
- Doc 1 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/03-Doc-1-Platform-Foundation.md`
- Doc 3 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md`
- Doc 4 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/06-Doc-4-Client-Portal.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Minder \| deadlines, status, audit trail \| compliance" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 3 "The immigration-only moat", L82 | Tier 3 (no release date) | RFP L167 defines the Minder as "task creation and assignment"; October files define it as a deadline watcher. |
| SPEC-N clearance | "Tracker → Minder. "Tracker" = same-vertical clash with ImmigrationTracker™" | Founders naming spec v1 (2026-06-13), §9 Clearance log, L122 | None stated | — |
| SPEC-N -or rule | "Auditor \| Minder" | Founders naming spec v1 (2026-06-13), §3 The rule — and the "-or" trap, L39 | None stated | — |
| SPEC-IA My Day | "Deadlines this week \| Minder" | Founders IA Doers model v1 (2026-06-14), Home = "My Day", L45 | None stated | — |
| SPEC-IA case actions | "Minder (deadlines/audit)" | Founders IA Doers model v1 (2026-06-14), Contextual Doers, On a Case, L61 | None stated | — |
| RFP §4.10 | "Minder (task creation and assignment)" | RFP v2.0, §4.10 Automation Engine, L167 | None stated | Conflicts with every later source (deadline watcher). |
| FD-8 | "Reminder folds into Minder (one nudge identity; AG-13 §3.2 retitled; naming spec amended)" | FDL v1.5, Wave-0 batch, resolved 2026-07-03, L33 | None stated (binding, FDL L22) | October keeps Reminder and Minder as two Doers (APHG L52, AG-11 L243). See B-reminder. |
| APHG glossary | "Minder (deadlines and dates — "thinks": remembers the dates that matter and reminds the file owner; standard reminders in Release 1 (AG17-D55)" | Agent 99-Phasing v1.4, Glossary, "Doer", L52 | "standard reminders in Release 1" | — |
| AOVW release vocabulary | "ExpatReady plans in Release 1 (go-live, including AG-17 and the Minder core)" | Agent 00-Overview v1.11, Detailed Scope Index, L76 | "Release 1 (go-live, including AG-17 and the Minder core)" | Charter V1 L121 defers it. |
| AG17-D38 | "The Minder: one reminder service on top of the whole application, its core in Release … the Minder watches them all, creates reminders, tasks …" | AG-17 v0.5, §0 Decisions, L156 | "its core in Release 1" | — |
| AG17-D55 | "AG-17 uses AG-11's Minder, which is part of ExpatReady Release 1 … by default a standard deadline reminds only the file owner. Replaces D54." | AG-17 v0.5, §0 Decisions, L173 | "part of ExpatReady Release 1" | Default "opt-in per firm" for escalation is changed by AG11-D9 (on from 5 staff). |
| AG17-D71 owner | "Ayush builds the Minder core" | AG-17 v0.5, §0 Decisions, L189 | None stated | — |
| AG-11 §3.0 | "The Minder is the one new non-AI Doer. … a watcher that continuously evaluates "is a deadline/condition approaching or breached?" and drives an escalation cascade" | AG-11 v1.11, §3.0 Conductor↔Doers model, L245 | None stated | — |
| AG-11 §3.4 why | "The Minder exists so that no government deadline is ever missed — by design, not diligence." | AG-11 v1.11, §3.4 The Minder, L339 | None stated | — |
| AG-11 §3.4 default split | "ExpatReady assists firms; it does not monitor them … The Minder is part of ExpatReady Release 1 (AG17-D38, AG17-D55)" | AG-11 v1.11, §3.4, L341 | "part of ExpatReady Release 1" | Doc 3 v1.4 L5207 (July) records a compliance fact on every breach; October drops that. |
| AG-11 §3.4 standard deadlines | "Any module … registers the dates that matter directly with the Minder. The Minder reminds … These reminders keep running even if the firm switches all …" | AG-11 v1.11, §3.4 Standard deadlines — always on, no set-up, L342 | None stated | — |
| AG-11 §3.4 imports | "Only dates on OPEN cases that are expired or due within the pack's lead time remind; an import never triggers escalation or at-risk marks" | AG-11 v1.11, §3.4, L342 | None stated | Same rule in AG-18 L258. |
| AG-11 §3.4 Team safeguards | "Team safeguards is on automatically for a firm with 5 or more active staff, so both are on by default there; under 5 they …" | AG-11 v1.11, §3.4 Escalation and at-risk marks, L343 | None stated | AG-11 §0.2 L60 lists the AG-17 knock-on ("off by default") as pending; AG-13-7 says escalation is off by default. |
| AG-11 §3.4 firm-designed chains | "Firm-designed reminder chains (the cascade designer below) belong to the automation tools, which stay a later release and may be plan-gated." | AG-11 v1.11, §3.4, L344 | "a later release" | Release 2 per AG-11 L383 and APHG L20. |
| AG-11 §3.4 cascade | "An automation can arm_minder a watch on an entity's deadline (a date field, optionally with … The Minder then runs a cascade relative to …" | AG-11 v1.11, §3.4 How it works, L346 | None stated | — |
| AG-11 §3.4 T-minus steps | "T-14 days: create a Tasker task for the case officer + notify them." | AG-11 v1.11, §3.4 cascade example, L347 | None stated | Example lead times; "pack-seeded" (L346). Doc 3 L5204 identical. |
| AG-11 §3.4 T-2 | "T-2 days: (escalation on) alert the firm's users who can reassign cases (agent/case:assign) … With escalation off, the file owner is reminded again." | AG-11 v1.11, §3.4 cascade example, L349 | None stated | Doc 3 L5206 (July) always escalates to the "Manager". |
| AG-11 §3.4 breach | "T-0 / breach: (escalation on) alert the same users again on the day. (at-risk marks on) flag the case at-risk and record an at-risk …" | AG-11 v1.11, §3.4 cascade example, L350 | None stated | Doc 3 L5207 (July) always escalates to the Owner and emits deadline.breached. |
| AG-11 §3.4 stop | "Stops immediately when the satisfaction condition is met" | AG-11 v1.11, §3.4, L351 | None stated | — |
| AG-11 §3.4 pack-driven | "Which deadlines exist and their default lead-times come from the firm's Country Pack" | AG-11 v1.11, §3.4 World-class behaviour, L356 | None stated | Immigration values to the Immigration-SME; confirm with RCIC. |
| AG-11 §3.4 data flow | "arm_minder → create a MinderWatch {entityRef, deadlineField, satisfactionCondition, cascadeSteps, status} … → all steps recorded in run-history." | AG-11 v1.11, §3.4 Data flow, L361 | None stated | Audit: run-history, not a named audit row. |
| AG-11-2 | "plus the Minder (arm_minder)" | AG-11 v1.11, §4 Conductor↔Doers model, L553 | None stated (status NEW) | — |
| AG-11-3 | "The Conductor, the Minder and the rules of every Doer SHALL be built and owned by ExpatReady" | AG-11 v1.11, §4, L554 | None stated | — |
| AG-11-17 | "arm_minder (the firm-designed route) SHALL register a MinderWatch … This is not the only way to register a deadline: modules register standard deadlines directly (AG-11-47)." | AG-11 v1.11, §4 The Minder, L576 | None stated | — |
| AG-11-18 | "The Minder SHALL re-evaluate the live entity before every cascade step and disarm immediately when the satisfaction condition is met" | AG-11 v1.11, §4 The Minder, L577 | None stated | — |
| AG-11-19 | "Where a setting is off (the default under 5 active staff; AG-11-83), the Minder SHALL NOT do what it covers; with both off it …" | AG-11 v1.11, §4 The Minder, L578 | None stated | — |
| AG-11-20 | "Minder deadline definitions and default lead-times SHALL be pack-driven (seeded per Country Pack), not hardcoded." | AG-11 v1.11, §4 The Minder, L579 | None stated | — |
| AG-11-47 | "Any module … SHALL be able to register a standard deadline directly with the Minder — entity, date, and the file owner to remind — …" | AG-11 v1.11, §4 Standard deadlines, L582 | None stated | "Today the Minder does not exist" (same line). |
| AG-11-47 recalculation | "The Minder SHALL recalculate when the date changes and stop when the deadline is met; reminders on recorded dates (e.g. permit expiry) continue after …" | AG-11 v1.11, §4 Standard deadlines, L582 | None stated | — |
| AG-11-48 | "Standard deadline reminders SHALL work on every plan and SHALL never stop because a firm disables automations, switches recipes off or lacks an entitlement." | AG-11 v1.11, §4 Standard deadlines, L583 | None stated | SA-03 SA3-D3a (L43) lists them as always on. |
| AG-11-49 | "Each SHALL be on by default for a firm … and off by … The platform SHALL NOT escalate, mark or report on a firm's …" | AG-11 v1.11, §4 Standard deadlines, L584 | None stated | AG-13-7 (overdue tasks) stays "OFF by default" regardless of size. |
| AG-11-50 | "Standard deadline reminders SHALL never pause because a feature flag covering client records is off" | AG-11 v1.11, §4 Standard deadlines, L585 | None stated | — |
| AG-11-32 | "It SHALL NOT cancel or silence any standard deadline reminder registered directly by a module (AG-11-48)." | AG-11 v1.11, §4 Lifecycle, L605 | None stated | — |
| AG-11-39 | "Only firm-designed reminder chains may be plan-gated; standard deadline reminders SHALL NOT be" | AG-11 v1.11, §4 Guardrails, L616 | None stated | — |
| AG-11-59 | "once it is older than its due time the Minder SHALL remind its owner and the item SHALL escalate" | AG-11 v1.11, §4 Needs you, L642 | None stated | The Minder also chases overdue approvals (carve-out A covers Needs you). |
| AG-11-108 | "SHALL become a deadline only when a person approves it, and SHALL then be registered with the Minder (AG-11-47). The Reader SHALL NOT register …" | AG-11 v1.11, §4 (5 Oct additions), L724 | None stated | Human gate before the Minder; AI Reader is carve-out A. |
| AG-11 Release 2 | "Still Release 2: the visual builder, firm-authored recipes, firm-designed reminder chains (including a firm-designed biometrics cascade), custom cron" | AG-11 v1.11, §3.5, L383 | "Still Release 2" | — |
| AG-09 BR-21 | "A deadline the Reader reads from a government letter is a proposal. It is registered with the Minder only after a person approves it …" | AG-09 v1.8, §5 Business rules, L579 | None stated | — |
| AG-07 outcome | "the Minder that turns every milestone date (AOR, biometrics, medical, ADR, decision) into a reminder so nothing lapses." | AG-07 v2.7, §1 Purpose, L277 | None stated | — |
| AG-07 government deadlines | "Every government step with a deadline can auto-create a Minder reminder (timezone-aware, business-hours-aware)" | AG-07 v2.7, §3.3 World-class behaviour, L422 | None stated | — |
| AG-13-65 | "This includes standard deadlines registered with the … (Today no case item creates a task; this depends on the Minder (AG-11-47), which does not …" | AG-13 v1.12, §4 Case-linked work, L410 | None stated | — |
| AG-17-73 | "SHALL be registered with the platform's reminder service (the Minder, AG-11 core); AG-17 SHALL NOT implement its own date watching." | AG-17 v0.5, §4 Reminders through the Minder, L812 | None stated | — |
| AG-17-60 | "Deadline reminders from the Minder (advertising minimum reached, officer deadline, fee due date passed, validity lead time, permit expiry/renewal lead time) go to the …" | AG-17 v0.5, §4, L827 | None stated | — |
| AG-18-25 | "each imported key date SHALL be registered with the Minder through the standard deadline route in the same row transaction" | AG-18 v1.2, §4 Detailed FRs, L369 | None stated | — |
| AG-18 BR-10 | "Every imported key date of a Minder-registrable type is registered with the Minder in the same transaction as its row." | AG-18 v1.2, §5 Business rules, L472 | None stated | — |
| AG-16-32 | "The firm SHALL have two on/off settings: Minder escalation chains and at-risk marks … Changing either setting is audited (AG-16-29)." | AG-16 v1.12, §4 Firm views and Minder settings, L464 | None stated | — |
| SA3-D3a | "the standard deadline and expiry reminders registered with the Minder (AG-11-47, AG-11-48 …). None of these can be switched off by any plan or flag" | SA-03 v2.14, §0 Decisions, L43 | None stated | — |
| SA-06 permission | "agent/automation:manage-minder \| Arm/configure Minder deadline cascades \| Y \| Y \| - \| - \| - \| - \| NEW" | SA-06 v3.1, Permission catalogue, L877 | None stated | — |
| DOC2 capability | "cap.minder \| automation \| DOER \| cap.conductor \| feature.minder \| growth" | Doc 2 v1.4, SA-CT capability registry seed table, L86 | "growth" (illustrative tier) | Conflicts with AG-11-48 and SA3-D3a (standard reminders never plan-gated). Doc 2 makes the Minder depend on the Conductor; October says standard deadlines need no automation. |
| TRI AG-11 stays | "deadline reminders (the Minder) · automation engine" | SCOPE-TRIAGE 2026-10-05, AG-11 Stays, L139 | Stays in Release 1 (list heading, TRI L6) | — |
| TRI AG-17 | "validity clock via Minder" | SCOPE-TRIAGE 2026-10-05, AG-17 Stays, L217 | Stays in Release 1 (list heading, TRI L6) | — |
| CH1 notes | "Founder decision needed: case deadlines and document expiry need a watcher; either keep a simple deadline and expiry reminder in scope or track deadlines …" | Charter V1 (md dump), Speaker notes, "NOT IN RELEASE 1", L121 | "NOT IN RELEASE 1" (Minder named among deferred Doers) | Open in the Charter; the October files treat the Minder core as decided Release 1. |
| DOC1 freshness | "freshnessRuleJson (nullable) — a FreshnessRule (max-age / re-ask cadence) that drives the Minder to prompt re-confirmation when an answer ages out." | Doc 1 v1.3, §5.3 CanonicalField, L1269 | None stated | No October file carries "stale answers" watching. |
| DOC1 document expiry | "expiryRelevant (boolean) + expiryRuleJson — drives the Minder to watch and prompt before a dated document lapses." | Doc 1 v1.3, §5.6 DocumentRequirement, L1313 | None stated | — |
| DOC1 events | "deadline.breached \| automation \| case-delivery, platform, communications, search, reporting, webhook-dispatch" | Doc 1 v1.3, §6.1 Domain Event Dictionary, L1958 | None stated | No October file names deadline.breached; it speaks of an "at-risk event" (AG-11 L350). |
| DOC1 no rail | "The remaining Doers (Scheduler, Minder, Filler, Qualifier, Finder, Messenger's in-process automation) are pure in-house Doers … they ship in later waves and are not foundation scope" | Doc 1 v1.3, §6.3, L1786 | "not foundation scope" | — |
| DOC2 breach contract (July) | "The Minder (AG-11), on a deadline breach … emits deadline.breached … It writes no case table and inserts no governance record itself." | Doc 2 v1.4, SA-11 ComplianceEvent contract, L5275 | None stated | October SA-11 v2.7 has no ComplianceEvent (no match). |
| DOC3 cascade (July) | "T-0 / breach: escalate to the Owner and emit the … which is what marks the Case at-risk (via AG-7) and records the compliance …" | Doc 3 v1.4, AG-11 §3.4, L5207 | None stated | October makes escalation and at-risk optional and never "reports on a firm's staff" unless chosen (AG-11-49). |
| DOC4 CP-4 expiry (July) | "Minder evaluates the horizon (timezone-aware) → emits deadline.approaching → client-facing notif/* + Reminder (Messenger/Mailer)" | Doc 4 v1.3, CP-4 §3 Expiry, L1240 | None stated | October client-facing expiry reminders come from a recipe (PR card / status expiry watch, AG-11 L377), not the Minder itself. |

Requirement rows: **64**.

## Gaps noticed

- Release conflict: the Charter (V1 L107, L121; V2 slide 1) defers the automation engine "and its Doers" naming the Minder and leaves "a simple deadline and expiry reminder" as an open founder decision. AG-11 v1.11, AG-17 v0.5, the Agent Overview and Phasing, SA-03 and the scope review all keep the Minder core in Release 1.
- Definition conflict: RFP v2.0 says "task creation and assignment"; the founders' spec says "deadlines, status, audit trail"; October says deadline watcher. FD-8 also makes the Minder the single nudge identity, which October does not follow (Reminder stays separate).
- Default for escalation and at-risk marks is unsettled: AG17-D55/D70 say off by default and opt-in; AG11-D9 makes them Team safeguards parts, on from 5 active staff; AG-11 §0.2 records the AG-17 knock-on as pending.
- July Doc 2/Doc 3 have the Minder emit deadline.breached and SA-11 record a compliance fact; October replaces this with an optional "at-risk event" and the principle "we work for the firm, not the regulator". What event an October breach emits is not stated.
- Plan gating conflict: Doc 2 seeds cap.minder at "growth" and makes it depend on the Conductor; October says standard deadlines run on every plan with no automation.
- Deterministic: the Minder is rule-based (dates, lead times from the pack, satisfaction condition). Human gates: a date read by the Reader is registered only after a person approves it; the Owner chooses escalation and at-risk marks with a recorded reason.
- Audit: the cascade is "recorded in run-history" (AG-11 L361) and setting changes are audited (AG-16-32). No requirement says what is audited when a standard deadline is registered or a reminder fires.
- The Minder is not built today ("Today the Minder does not exist", AG-11-47). Lead times and deadline meanings are pack content from the Immigration-SME: confirm with RCIC.
