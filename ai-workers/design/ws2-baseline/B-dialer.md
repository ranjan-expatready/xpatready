# B-dialer: the Dialer (call logging and click-to-call)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Dialer makes a phone call with a lead a recorded piece of work: staff log each call (outcome, length, direction, next step) and, when a phone provider is connected, start the call with one click. Its headline job is that a logged outbound call counts as the "first response" that stops the speed-to-lead clock. **Who uses it:** intake and sales staff working leads (AG-02). **What it replaces (founders' spec):** Aircall ("click-to-call + call logging"). **Status in one line:** the October AG-02 file keeps the manual call log in Release 1 and leaves live dialling waiting on a provider; the 5 Oct scope review proposes dropping click-to-call.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- AG-02 v1.9: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-02-prospect-lead-sales-crm_v1.9_2026-10-07.md`
- SA-06 v3.1: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-06-rbac_v3.1_2026-10-08.md`
- AG-10 v1.9: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-10-communication-hub_v1.9_2026-10-07.md`
- AG-13 v1.12: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-13-tasks-reminders-notes-and-activity-audit_v1.12_2026-10-07.md`
- SA-08 v2.2: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-08-platform-integrations-and-infrastructure-rails_v2.2_2026-10-02.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Doc 3 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Dialer \| click-to-call + call logging \| Aircall" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 2 "Replace the generic stack", L72 | Tier 2 (no release date) | The Tier 1 label "Live now (shipped)" does not apply to Tier 2 (SPEC-N L57). |
| SPEC-IA placement | "Action-Doers — Signer, Drafter, Filler, Binder, Qualifier, Reviewer, Minder, Messenger, Dialer — are NOT sidebar items." | Founders IA Doers model v1 (2026-06-14), The lean sidebar, L33 | None stated | — |
| SPEC-IA command bar | "Message → Messenger · Call → Dialer." | Founders IA Doers model v1 (2026-06-14), ⌘K "Do" bar, L53 | None stated | — |
| DOC2 capability | "cap.dialer \| communications \| DOER (INFRA rail — the telephony rail half, TelephonyPort, is a routed foundation flag, F3) \| cap.messenger \| feature.dialer \| enterprise" | Doc 2 v1.4, SA-CT capability registry seed table, L92 | "enterprise" (illustrative tier) | Doc 2 L72 says tiers are "illustrative; … [FOUNDER-CONFIRM]". Doc 1 never names the Dialer (no match in Doc 1 v1.3). |
| AG-02 §3.12 why | "There is no call logging in the system today … The Dialer is a new in-house Doer that makes calls a first-class, logged activity." | AG-02 v1.9, §3.12 Call Logging / Dialer, L465 | None stated | — |
| AG-02 §3.12 record | "A Call record is the unit of work, attached to the lead/contact via the polymorphic (entityType, entityId) pattern" | AG-02 v1.9, §3.12 How it works, L467 | None stated | — |
| AG-02 §3.12 outcomes | "outcome — a firm-configurable picklist: defaults Connected, No answer, Left voicemail, Busy, Wrong number, Callback requested, Not in service." | AG-02 v1.9, §3.12 Call fields, L469 | None stated | Conflicts inside AG-02: AG-2-37a (L608) and the Call entity (L736) list a different outcome set ("answered / no answer / left message / wrong number / callback requested / not interested"). |
| AG-02 §3.12 recording field | "recordingRef? — an optional reference to a recording artifact (in Document storage / S3), present only if the firm enables call recording (consent-gated — …" | AG-02 v1.9, §3.12 Call fields, L472 | None stated | The Call entity in §7 (L736) has no recordingRef field. |
| AG-02 §3.12 click-to-call | "one click initiates a call (via the firm's telephony rail; the Dialer Doer abstracts the provider — Release 2 or later may add live …" | AG-02 v1.9, §3.12 Click-to-call, L475 | "Release 2 or later may add live SIP/Twilio" | AG-2-37a (L608) says "Phase-2" for live telephony; TRI L39 proposes to drop click-to-call. |
| AG-02 §3.12 outcome modal | "After the call, an outcome modal pre-fills duration and asks for the outcome + next step, then writes the Call to the timeline and …" | AG-02 v1.9, §3.12 Click-to-call, L475 | None stated | Follow-up task is created through the Tasker record (AG-13). |
| AG-02 §3.12 speed-to-lead | "when a rep logs the first OUTBOUND Call on a new lead, it stops the speed-to-lead clock and satisfies the first-response SLA" | AG-02 v1.9, §3.12 headline behaviour, L477 | None stated | Overlaps the speed-to-lead recipe run by the Conductor (AG-11 L368). |
| AG-02 §3.12 consent | "Call recording is off by default … The Dialer never records without the firm's explicit configuration. Outbound calling itself respects do-not-call / unsubscribe state where applicable." | AG-02 v1.9, §3.12 Compliance & consent, L479 | None stated | Legal value (one- or two-party consent) is a firm jurisdiction rule: confirm with counsel. |
| AG-02 §3.12 suggestions | ""No answer" → suggest a callback task tomorrow; "Callback requested" → schedule it; "Connected" → NBA proposes the next conversion step." | AG-02 v1.9, §3.12 World-class behaviour, L483 | None stated | Next-best-action and lead scoring are proposed to move to Release 2 (TRI L29). |
| AG-02 §3.12 data flow / audit | "Click-to-call → Dialer initiates (provider-abstracted) → on end, outcome modal → write Call (polymorphic attach) + timeline + … → AuditLog (recording access audited …" | AG-02 v1.9, §3.12 Data flow, L488 | None stated | — |
| AG-2-37a | "Staff SHALL log a call with … Where a click-to-call provider is integrated, the Dialer MAY auto-create the Call log on completion; absent a …" | AG-02 v1.9, §4 Detailed FRs, L608 | "Live telephony integration is Phase-2; the log-and-SLA behaviour ships now." | Uses "Phase-2" although AG-02 elsewhere uses Release vocabulary (APHG L13 says Release vocabulary replaces Phases). |
| AG-02 §7 Call entity | "providerCallId? (when Dialer-integrated), occurredAt. Counts as a first-response touch for SLA." | AG-02 v1.9, §7 Key Entities, L736 | None stated | See outcome conflict above. |
| AG-02 §10 permission | "agent/prospect:log-call \| NEW \| Log a call / use the Dialer" | AG-02 v1.9, §10 Permissions, L877 | None stated | Same key in SA-06 v3.1 L699. |
| SA-06 permission | "agent/prospect:log-call \| Log a call / use the Dialer \| Y \| Y \| Y \| Y \| - \| - \| NEW" | SA-06 v3.1, Permission catalogue (agent prospect rows), L699 | None stated | — |
| AG-02 §12 NEW list | "Call logging / Dialer (Call) with SLA-credit; timezone-aware SLA/going-cold" | AG-02 v1.9, §12 Reference note, NEW (requires build), L951 | None stated | — |
| AG-02 §13 Q7 | "Which click-to-call/telephony provider (if any) for auto-logged calls? The manual log + SLA credit ships regardless; live dialing depends on this." | AG-02 v1.9, §13 Open questions (still open), L985 | "ships regardless" (manual log) | Open founder question; provider not chosen. |
| AG-02 §13 parked | "Click-to-call / the telephony rail (§3.12) — owned by AG-10. The manual call log ships … click-to-call itself is a disabled affordance pending a …" | AG-02 v1.9, §13 Parked by founder ruling 2026-08-28, L992 | "disabled affordance pending a provider" | Ownership conflict: AG-10 v1.9 L827 says the voice/call channel is "owned by the Dialer Doer (AG-2 §3.12), not AG-10". |
| AG-10 out of scope | "Voice/call channel — owned by the Dialer Doer (AG-2 §3.12), not AG-10." | AG-10 v1.9, Out-of-scope list, L827 | None stated | Conflicts with AG-02 L992 (owned by AG-10). |
| AG-02 §3.3 Doer bar | "the contextual Doer action bar for a lead: Qualifier (assess), Scheduler (book consult), Dialer (call), Mailer/Messenger (reach out)" | AG-02 v1.9, §3.3 Lead detail view, L285 | None stated | Same bar in Doc 3 v1.4 L677. |
| AG-13 timeline | "calls logged (Dialer), emails/messages sent/received (Mailer/Messenger)" | AG-13 v1.12, §3.4 Activity timeline, L275 | None stated | — |
| SA-08 rail | "Messenger (SMS/chat) and the Dialer (calls) are in-house Doers. SMS/WhatsApp delivery rides a carrier gateway rail" | SA-08 v2.2, §3.5 SMS / WhatsApp Gateway Rail, L232 | None stated | SA-08 puts calls on the SMS/WhatsApp gateway rail; Doc 2 L92 names a separate "TelephonyPort". |
| SA-08 data flow | "Messenger/Dialer fetch by reference at send time; delivery receipts → health log (3.9)." | SA-08 v2.2, §3.5 Data flow, L242 | None stated | — |
| TRI AG-02 | "(drop) Click-to-call dialer" | SCOPE-TRIAGE 2026-10-05, AG-02 Leads & CRM, proposed to move, L39 | "(drop)" = proposed to remove (TRI L9) | TRI is "not a requirements document" (TRI L3). The same list "Stays" a "manual call log" (TRI L26). |
| TRI AG-02 stays | "notes, tasks, manual call log · speed-to-lead call task" | SCOPE-TRIAGE 2026-10-05, AG-02 Stays in Release 1, L26 | Stays in Release 1 (list heading, TRI L6) | — |
| DOC3 AG-2 §3.12 (July) | "one click initiates a call via the firm's telephony rail; the Dialer Doer abstracts the provider behind a port." | Doc 3 v1.4, AG-2 §3.12, L827 | None stated | July text has no "Release 2 or later" caveat that the October AG-02 L475 adds. |
| DOC3 AG-2-37a (July) | "Where a click-to-call provider is integrated the Dialer MAY auto-create the log on completion; absent a provider, manual." | Doc 3 v1.4, AG-2 §4, L936 | None stated | Same rule as AG-02 L608, without the "Phase-2" note. |
| DOC3 AG-10 scope (July) | "a voice/call channel is OUT (owned by the Dialer Doer in AG-2, not AG-10)." | Doc 3 v1.4, AG-10 resolved scope, L4970 | "OUT" (of AG-10) | Agrees with AG-10 v1.9 L827; disagrees with AG-02 v1.9 L992. |
| DOC2 principle | "each in-house Doer (Signer, Mailer, Scheduler, Biller, Minder, Filler, Qualifier, Messenger, Reporter, Finder, Drafter, Reviewer, Binder, Tasker, Clocker, Dialer, Recruiter" | Doc 2 v1.4, SA-CT principle, L31 | None stated | Dialer is absent from the October Doer lists in Agent 99-Phasing v1.4 L52 and Agent 00-Overview v1.11 L177. |

Requirement rows: **32**.

## Gaps noticed

- The October Agent glossary (99-Phasing v1.4 L52) and the "In-House by Design" Doer list (00-Overview v1.11 L177) do not mention the Dialer, although AG-02 v1.9 still specifies it. Doc 1 v1.3 does not name it at all.
- Two different call-outcome lists exist inside AG-02 v1.9 (L469 against L608 and L736).
- Who owns the telephony rail is contradictory: AG-02 L992 says AG-10; AG-10 L827 and Doc 3 L4970 say the Dialer in AG-02. SA-08 L232 places calls on the SMS/WhatsApp gateway rail; Doc 2 L92 names a separate TelephonyPort.
- No telephony provider is chosen (AG-02 §13 Q7). Call recording consent rules are left to "the firm's jurisdiction rules": confirm with counsel.
- Audit: the data flow ends in "AuditLog" with recording access audited separately; no requirement says what the audit row for a logged call contains. Inferred: it follows the general AG-13 audit capture.
- Release: AG-02 still uses "Phase-2" for live telephony (L608) next to "Release 2 or later" (L475). The scope review proposes dropping click-to-call entirely (TRI L39); no founder decision on that proposal is in the snapshot.
- Deterministic steps: logging, the SLA stop and the "Contacted" derivation are rule-based. The suggestions after a call (L483) depend on next-best-action, which TRI proposes to move out of Release 1.
