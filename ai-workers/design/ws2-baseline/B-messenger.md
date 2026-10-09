# B-messenger: the Messenger (WhatsApp, SMS and portal chat)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Messenger carries every message that is not email: chat with the client inside the portal, WhatsApp (incoming messages, replies within WhatsApp's customer-service window, and firm-started messages using templates WhatsApp has pre-approved) and, later, SMS. All channels for one client land in one conversation on the client's file. **Who uses it:** staff who message clients; the Conductor, when a recipe sends a chase or reminder on the client's preferred channel (AG-10, AG-11). **What it replaces (founders' spec):** "Twilio / WhatsApp" ("SMS / WhatsApp / chat"). **Status in one line:** October puts portal chat and WhatsApp (in and out) in Release 1, built but switched off until Super Admin records a provider, with SMS in Release 2; the Charter defers "SMS and WhatsApp" and lists the Messenger among deferred automation Doers.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- RFP v2.0: `sources/drive-snapshot-2026-10-09/01-techno-functional/01-RFP-Build-Proposal.md`
- Agent 99-Phasing v1.4: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/99-Phasing-and-Glossary_v1.4_2026-10-05.md`
- Agent 00-Overview v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/00-Overview_v1.11_2026-10-07.md`
- AG-10 v1.9: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-10-communication-hub_v1.9_2026-10-07.md`
- AG-11 v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-11-automation_v1.11_2026-10-07.md`
- AG-04 v1.5: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-04-consultation-and-booking_v1.5_2026-10-07.md`
- AG-06 v1.7: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-06-billing-and-payments_v1.7_2026-10-07.md`
- AG-08 v1.7: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-08-smart-questionnaire_v1.7_2026-10-07.md`
- AG-02 v1.9: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-02-prospect-lead-sales-crm_v1.9_2026-10-07.md`
- SA-08 v2.2: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-08-platform-integrations-and-infrastructure-rails_v2.2_2026-10-02.md`
- Shared 99-Phasing v2.14: `sources/drive-snapshot-2026-10-09/02-functional-requirements/shared/99-Phasing-and-Glossary_v2.14_2026-10-08.md`
- SA-06 v3.1: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-06-rbac_v3.1_2026-10-08.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Charter V1 (md dump): `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter V1 - G1 expanded.md`
- Doc 1 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/03-Doc-1-Platform-Foundation.md`
- Doc 3 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Messenger \| SMS / WhatsApp / chat \| Twilio / WhatsApp" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 2, L71 | Tier 2 (no release date) | — |
| SPEC-IA command bar | "Message → Messenger" | Founders IA Doers model v1 (2026-06-14), ⌘K "Do" bar, L53 | None stated | — |
| RFP §4.10 | "Messenger (sends emails, in-app notifications, or SMS through the Communications module)" | RFP v2.0, §4.10 Automation Engine, L167 | None stated | RFP gives the Messenger email too; AG-10 gives email to the Mailer only (AG-10-1). |
| APHG glossary | "Messenger (omni-channel comms)" | Agent 99-Phasing v1.4, Glossary, "Doer" (four automation Doers), L52 | None stated | — |
| AOVW in-house | "Messenger (SMS/chat, replaces Twilio/WhatsApp)" | Agent 00-Overview v1.11, In-House by Design, L177 | None stated | — |
| AOVW providers | "WhatsApp (inbound and proactive outbound with provider-approved templates, AG11-D18(a); SMS stays Release 2)" | Agent 00-Overview v1.11, In-House by Design, approved providers, L179 | "SMS stays Release 2" | SA-08 v2.2 L23: "Expat Ready has NO third-party product-tool integrations" (pending AG11-D14 knock-on). |
| AG-10 Design decision 1 | "Communication is delivered by two in-house Doers: Mailer (email) and Messenger (SMS / WhatsApp / in-app portal chat). … There is no embedded third-party messaging app" | AG-10 v1.9, §3.0, L194 | None stated | — |
| AG-10 §3.4 how it works | "The unifying model is one Conversation per client (per entity): SMS, WhatsApp, and chat messages all attach to that conversation and to the entity's timeline" | AG-10 v1.9, §3.4 Messenger, L251 | "Release 1, changed 5 Oct — AG11-D18: Messenger carries portal chat and WhatsApp — inbound, in-window replies and proactive template messages. SMS is Release 2." | — |
| AG-10 §3.4 STOP | "STOP/unsubscribe keywords flip consent and halt marketing on that channel automatically." | AG-10 v1.9, §3.4, L251 | None stated | — |
| AG-10 §3.4 data flow | "Composer (channel = SMS/WhatsApp/chat) → consent gate + send-window check → Messenger Doer → messaging gateway rail (or portal for chat) → Communication+SmsMessage/ChatMessage on …" | AG-10 v1.9, §3.4 Data flow, L261 | None stated | — |
| AG-10 §3.4 gate | "WhatsApp inbound and outbound ship built but switched off until Super Admin records a provider (SA-08 / SA-11)." | AG-10 v1.9, §3.4 Data flow, phase note, L261 | "built but switched off" | WhatsApp provider not chosen (same line). |
| AG-10-1 | "The system SHALL deliver communication via two in-house Doers — Mailer (email) and Messenger (SMS / WhatsApp / in-app portal chat) — and SHALL …" | AG-10 v1.9, §4 Channels, rails, model, L356 | None stated | — |
| AG-10-16 | "Release 1: portal chat, WhatsApp inbound, in-window WhatsApp replies and proactive outbound WhatsApp (approved templates, AG-10-57); Release 2: SMS only" | AG-10 v1.9, §4 Messenger, L379 | "Release 1" / "Release 2: SMS only" | AG-13 L712 still defers WhatsApp reminders to Release 2; Charter V1 L330 defers "SMS and WhatsApp". |
| AG-10-17 | "Outbound SMS/WhatsApp SHALL pass the consent gate (AG-10-22) and the send-window (AG-10-8), except that an in-window WhatsApp reply skips quiet-hours deferral" | AG-10 v1.9, §4 Messenger, L380 | None stated | — |
| AG-10-18 | "STOP SHALL flip channel consent and halt marketing automatically (AG-10-24)." | AG-10 v1.9, §4 Messenger, L381 | None stated | — |
| AG-10-19 | "Messaging-gateway webhooks (delivered/read/failed/STOP, inbound) SHALL be idempotent on the provider message id" | AG-10 v1.9, §4 Messenger, L382 | None stated | — |
| AG-10-22 gate | "Every outbound send (manual or automated) SHALL pass a consent/contactability gate that classifies the message transactional vs marketing" | AG-10 v1.9, §4 Consent, L389 | None stated | Legal classification (CASL): confirm with counsel. |
| AG-10-41 | "reply on WhatsApp only while the provider's customer-service window for that client is open" | AG-10 v1.9, §4 WhatsApp, L425 | None stated | — |
| AG-10-43 | "The platform provider choice is not decided (SA-08, pending knock-on); with no provider configured, WhatsApp is shown disabled with a reason" | AG-10 v1.9, §4 WhatsApp, L427 | "ships built and switched off until Super Admin records a provider" | SA-08 v2.2 L238 still calls the gateway "Phase-3". |
| AG-10-56 | "Each client SHALL have a preferred channel (EMAIL or WHATSAPP, default EMAIL)" | AG-10 v1.9, §4 Release 1 scope review, L446 | None stated | Same rule in AG-11-104 (L720). |
| AG-10-57 | "A firm-started WhatsApp … SHALL be sent only as a template message that maps to a template the … a recipe SHALL fall back …" | AG-10 v1.9, §4 Release 1 scope review, L447 | "SMS is not part of this requirement and stays Release 2" | — |
| AG-10-58 | "The action SHALL be performed by a person; it SHALL NOT run automatically and no AI or recipe SHALL trigger it." | AG-10 v1.9, §4 "Create lead" from unknown WhatsApp number, L448 | None stated | Human gate. |
| AG-10 permission | "agent/communication:send-message \| NEW \| Send SMS / WhatsApp / portal chat (Messenger); in Release 1 this covers WhatsApp (in-window replies and approved template messages) …" | AG-10 v1.9, §10 Permissions, L706 | "SMS is Release 2" | Same key in SA-06 v3.1 L861. |
| AG-10 today | "There is NO SMS/WhatsApp today. "Messenger" is currently email + in-app portal chat only" | AG-10 v1.9, §12 Reference note, L768 | None stated | — |
| AG-11-2 | "Messenger (send_message)" | AG-11 v1.11, §4 Conductor↔Doers model, L553 | None stated (NEW) | — |
| AG-11 send_message | "send_message (Messenger — WhatsApp, SMS) — the WhatsApp and SMS sibling of send_mail … Proactive outbound WhatsApp is Release 1 … SMS stays Release 2." | AG-11 v1.11, §3.3 Actions via Doers, L300 | "Release 1" / "Release 2" | — |
| AG-11-103 | "The Messenger SHALL send proactive outbound WhatsApp in Release 1 — firm-initiated messages, chases and reminders — using only templates the WhatsApp provider has pre-approved" | AG-11 v1.11, §4 (5 Oct additions), L719 | "Release 1"; "SMS SHALL stay Release 2" | — |
| AG-11-104 | "Every proactive WhatsApp message SHALL pass the same send-time rails as email: consent … the quiet state … supervision … the action's autonomy level, … and quiet hours. …" | AG-11 v1.11, §4 (5 Oct additions), L720 | None stated | — |
| AG-11-105 | "Where no approved template exists for that message, the recipe SHALL fall back to email, record the fallback in run-history" | AG-11 v1.11, §4 (5 Oct additions), L721 | None stated | Audit: run-history records the fallback. |
| AG11-D18(a) | "Proactive outbound WhatsApp is Release 1 … Each client has a preferred channel (email or WhatsApp) … if none exists the recipe falls back to email" | AG-11 v1.11, §0 Decision log, L47 | "Release 1" | Charter V1 L330 "SMS and WhatsApp" deferred. |
| AG-04 consult reminders | "AG-4-35 Sends via Mailer (email) / Messenger (SMS/WhatsApp; email-only for demo)." | AG-04 v1.5, §4 Confirmations & reminders, L498 | "email-only for demo" | AG-04 §13 Q3 (L822) still locks email-only; AG11-D18 put WhatsApp reminders in Release 1. |
| AG-06-12 dunning | "A dunning sequence … SHALL chase overdue balances via Conductor + Mailer/Messenger" | AG-06 v1.7, §4, L362 | None stated | TRI L80 proposes to move "automatic dunning". |
| AG-08-13 | "Assigning SHALL (via Conductor/Mailer/Messenger) send the client a localised secure invitation (changed 5 Oct — AG11-D18(a): by email or WhatsApp per AG-8-47)" | AG-08 v1.7, §4, L371 | None stated | TRI L109 proposes to move "WhatsApp invitations". |
| AG-2-9 | "An inbound message from an unknown sender (Messenger) MAY create a lead with source = SOCIAL" | AG-02 v1.9, §4, L558 | "Release 2 or later for live channels other than WhatsApp." | — |
| SA-08 §3.5 rail | "SMS/WhatsApp delivery rides a carrier gateway rail (e.g. AWS SNS or Twilio used purely as the delivery pipe — not as a messaging product)." | SA-08 v2.2, §3.5 SMS / WhatsApp Gateway Rail, L232 | None stated | — |
| SA-08 §3.5 phase | "Per the founder's phasing, SMS/WhatsApp gateway config is Phase-3" | SA-08 v2.2, §3.5, L238 | "Phase-3" | Conflicts with AG-10-16 and AG11-D18(a) (WhatsApp Release 1). SA-08 v2.2 (2 Oct) predates AG11-D18 (5 Oct). |
| SPHG SA-8 row | "SMS/WhatsApp gateway, per-country storage routing" | Shared 99-Phasing v2.14, §16 Phasing Summary, SA-8 row, Phase 3 — Could column, L34 | Phase 3 — Could (column heading, SPHG L24) | Same conflict as above. |
| SA-06 permission | "agent/communication:send-message \| Send SMS / WhatsApp / portal chat (Messenger); in Release 1 this covers WhatsApp (in-window replies and approved template messages) and portal…" | SA-06 v3.1, Permission catalogue, L861 | "in Release 1" | — |
| DOC2 capability | "cap.messenger \| communications \| DOER (INFRA rail) \| cap.mailer \| feature.comms.messaging \| growth" | Doc 2 v1.4, SA-CT capability registry seed table, L81 | "growth" (illustrative tier) | FD-18 lists SMS among metered add-ons (FDL L54); SA-04 v2.14 says no add-on prices in Release 1 (review W1 Task 5 row 11). |
| TRI AG-10 | "WhatsApp inbound [F]" | SCOPE-TRIAGE 2026-10-05, AG-10 Proposed to move, L133 | Proposed to move to Release 2 (list meaning, TRI L7); [F] = decided earlier by the founder (TRI L9) | TRI L134 also proposes "WhatsApp outbound, preferred channel, 'Create lead' [F]". |
| CH1 deferred | "SMS and WhatsApp" | Charter V1 (md dump), Deferred scope (Appendix A), L330 | Deferred scope (list heading, CH1 L324) | Conflicts with AG-10-16 / AG11-D18(a). |
| CH1 notes | "the AG-11 automation engine and its Doers (rule-based "when X, do Y" tools such as Minder, Tasker and Messenger" | Charter V1 (md dump), Speaker notes, "NOT IN RELEASE 1", L121 | "NOT IN RELEASE 1" | — |
| DOC1 rail | "SmsGatewayPort \| Messenger (SMS + WhatsApp channels) \| AWS SNS + a WhatsApp BSP" | Doc 1 v1.3, §6.3 Rails as ports, L1797 | None stated | — |
| DOC1 sub-processor | "SMS / messaging (Messenger) \| AWS SNS + WhatsApp BSP \| Phone number, message body (non-Restricted) \| Sub-processor" | Doc 1 v1.3, §7.7 Sub-processor matrix, L2260 | None stated | — |
| DOC3 sequences (July) | "Both email and live SMS/WhatsApp channels are IN scope (the OUT list no longer defers channels — ADR 6.2 commits live SMS/WhatsApp)" | Doc 3 v1.4, AG-2 §3.6, L732 | "IN scope" | October puts SMS in Release 2 (AG-10-16) and the Charter defers SMS and WhatsApp. |
| DOC3 AG-10 scope (July) | "Live SMS + WhatsApp channels (incl. the 24h-window machinery) … are all IN." | Doc 3 v1.4, AG-10 resolved scope, L4970 | "all IN" | See row above. |

Requirement rows: **46**.

## Gaps noticed

- Release conflict: July Doc 3 (all channels in), the Charter (SMS and WhatsApp deferred; Messenger deferred as an automation Doer), October AG-10/AG-11 (WhatsApp in Release 1, SMS Release 2) and SA-08/Shared Phasing ("Phase-3") disagree.
- WhatsApp has no provider: AG-10-43 and AG-11 §0.2 say SA-08 must decide; SA-08 v2.2 still states there are no third-party product integrations.
- RFP v2.0 defines the Messenger as also sending email and in-app notifications; October gives email to the Mailer and notifications to a separate Notification Doer.
- Deterministic: consent gate, send window, template mapping, fallback to email. Human gates: "Create lead" from an unknown number is always a person's click (AG-10-58); supervised messages from unlicensed staff wait for a licensed user (AG-10-49, carve-out A); AI-written text always waits for approval (AG-10-44).
- Audit: the timeline records each message; run-history records an email fallback (AG-11-105); sensitive actions are audited (AG-10-35). No line states that a recipe-sent WhatsApp message is marked as automated in the audit.
- Consent rules (CASL, Law 25) are product rules in AG-10 but legal values: confirm with counsel.
