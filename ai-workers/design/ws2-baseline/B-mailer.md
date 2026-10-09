# B-mailer: the Mailer (email in and out)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Mailer sends every email the product sends (to clients, leads and staff), in the recipient's language, after a consent check, and records it on the client's file with its delivery status. When a firm connects its own mailbox, the Mailer also brings replies back in and attaches each to the right file by fixed rules (reply token, header chain, known address, alias); anything it cannot match goes to an "Unmatched inbox" for a person. **Who uses it:** every staff member; the Conductor for automatic messages; other modules for invitations, document requests, invoices and reports (AG-10). **What it replaces (founders' spec):** "Outlook / Mailchimp" ("email + sequences"). **Status in one line:** outbound email and own-mailbox connection are Release 1 in every October source; email sequences beyond the seeded recipes are Release 2. AI reading of inbound mail (the Sorter) and AI drafting are carve-out A.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- Agent 00-Overview v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/00-Overview_v1.11_2026-10-07.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- AG-10 v1.9: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-10-communication-hub_v1.9_2026-10-07.md`
- AG-11 v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-11-automation_v1.11_2026-10-07.md`
- AG-01 v1.16: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-01-firm-setup-and-onboarding_v1.16_2026-10-08.md`
- AG-09 v1.8: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-09-document-management_v1.8_2026-10-07.md`
- AG-15 v1.6: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-15-client-portal-management_v1.6_2026-10-08.md`
- AG-14 v1.10: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-14-reporting-and-analytics_v1.10_2026-10-07.md`
- AG-16 v1.12: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-16-firm-settings-and-integrations_v1.12_2026-10-08.md`
- SA-08 v2.2: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-08-platform-integrations-and-infrastructure-rails_v2.2_2026-10-02.md`
- Agent 99-Phasing v1.4: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/99-Phasing-and-Glossary_v1.4_2026-10-05.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Doc 1 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/03-Doc-1-Platform-Foundation.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Mailer \| email + sequences \| Outlook / Mailchimp" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 1, L61 | Tier 1 — Live now (shipped), per SPEC-N L57 (June repo status, not re-checked) | — |
| SPEC-IA sidebar | "Mailer · Scheduler · Tasker · Biller · Reporter (daily Doer-surfaces" | Founders IA Doers model v1 (2026-06-14), The lean sidebar, L26 | None stated | — |
| SPEC-IA lead actions | "On a Lead / Prospect: Qualifier (assess) · Scheduler (book) · Mailer (email)" | Founders IA Doers model v1 (2026-06-14), Contextual Doers, L62 | None stated | — |
| AOVW in-house | "Mailer (email, replaces Outlook/Mailchimp)" | Agent 00-Overview v1.11, In-House by Design, L177 | None stated | — |
| DOC2 capability | "cap.mailer \| communications \| DOER (INFRA rail) \| — \| feature.comms.email \| baseline" | Doc 2 v1.4, SA-CT capability registry seed table, L80 | "baseline" (illustrative tier) | Doc 2 L69: cap.mailer default ON. |
| AG-10 §3.1 how it works | "The Mailer: resolves … selects or renders the template in … runs the consent … queues the send … and on dispatch writes a Communication (+ EmailMessage payload) …" | AG-10 v1.9, §3.1 Mailer — Outbound email, L208 | None stated | — |
| AG-10 §3.1 tracking | "tracking is per-firm-configurable … and is never used to fabricate a status (no "opened" without a real signal)." | AG-10 v1.9, §3.1 World-class behaviour, L212 | None stated | TRI L135 proposes to move open/click tracking. |
| AG-10 §3.1 data flow | "Composer → render template (recipient locale) → consent gate (transactional vs marketing) → resolve AG-9 attachments → enqueue on email queue → worker dispatches …" | AG-10 v1.9, §3.1 Data flow, L218 | None stated | — |
| AG-10 §3.2 matching | "runs entity matching to attach each to the correct file, in priority order: (1) a … (2) the sender/recipient … (3) a per-firm plus-address …" | AG-10 v1.9, §3.2 Mailer — Inbound own-mailbox sync, L224 | None stated | AG-10 L222 says inbound matching "is done by the Sorter Doer" (AI, carve-out A), which first applies these deterministic signals. |
| AG-10 §3.2 unmatched | "A message that cannot be matched lands in the Unmatched inbox — never silently dropped, never guessed onto the wrong file — where a …" | AG-10 v1.9, §3.2, L224 | None stated | Human step. |
| AG-10 §3.2 data flow | "OAuth or IMAP sync job → fetch inbound → entity matcher (reply-token → header chain … → manual link re-points it to … → AuditLog. …" | AG-10 v1.9, §3.2 Data flow, L234 | None stated | — |
| AG-10-1 | "The system SHALL deliver communication via two in-house Doers — Mailer (email) and Messenger" | AG-10 v1.9, §4, L356 | None stated | — |
| AG-10-4 | "A firm MAY connect its own mailbox for inbound sync — Gmail or Microsoft 365 via OAuth, or plain IMAP for any other provider …" | AG-10 v1.9, §4, L359 | "all three in Release 1" | TRI L129 proposes to move mailbox connection [F]; outside provider approval by Super Admin (AG11-D14). |
| AG-10-5 | "Staff with agent/communication:send-email SHALL compose and send email from an entity context, pre-filled with the recipient and entity variables, optionally template-driven" | AG-10 v1.9, §4 Mailer — outbound, L362 | None stated | — |
| AG-10-6 | "Outbound email SHALL be queued (async), dispatched with at-least-once delivery and a dedupe key so a retried job never double-sends; failures SHALL retry then …" | AG-10 v1.9, §4 Mailer — outbound, L363 | None stated | — |
| AG-10-7 | "The Mailer SHALL record delivery state (queued → sent → delivered → opened, bounced/failed) from rail webhooks" | AG-10 v1.9, §4 Mailer — outbound, L364 | None stated | — |
| AG-10-8 | "The Mailer SHALL support scheduled send within a timezone-aware window (firm/office timezone + optional quiet-hours)." | AG-10 v1.9, §4 Mailer — outbound, L365 | None stated | — |
| AG-10-10 | "When a mailbox is connected, a background sync SHALL ingest inbound email and SHALL run entity matching in priority order" | AG-10 v1.9, §4 Mailer — inbound, L369 | None stated | — |
| AG-10-12 | "An inbound email that cannot be matched SHALL land in the Unmatched inbox (never silently dropped, never auto-attached to a guessed file)" | AG-10 v1.9, §4 Mailer — inbound, L371 | None stated | — |
| AG-10-22 | "Every outbound send (manual or automated) SHALL pass a consent/contactability gate" | AG-10 v1.9, §4 Consent, L389 | None stated | CASL rules: confirm with counsel. |
| AG-10-25 | "A hard bounce or invalid number SHALL add the address to a firm-wide suppression list" | AG-10 v1.9, §4 Consent, L392 | None stated | — |
| AG-10-27 | "Any send SHALL be able to show why it was allowed (transactional, or the specific consent record) for audit." | AG-10 v1.9, §4 Consent, L394 | None stated | — |
| AG-10-30 | "when a variable is missing for an automated send, SHALL drop that send to APPROVE with the missing field flagged and SHALL never send …" | AG-10 v1.9, §4 Templates & locale, L407 | None stated | Same rule as AG-11-97. |
| AG-10-31 | "Sequence/cadence steps that send (defined in AG-2/AG-11) SHALL execute through AG-10's Doers, inheriting the consent gate, locale, send-window, attachments, timeline logging, and delivery tracking" | AG-10 v1.9, §4 Sequences, L410 | None stated | — |
| AG-10-35 | "Sensitive actions (mailbox connect/disconnect, rail config, consent override, suppression edit, bulk send, message/timeline export) SHALL be audited (actor, target, before/after)." | AG-10 v1.9, §4 Security, L416 | None stated | — |
| AG-10-45 | "A template message prepared by a recipe … SHALL default to AUTO and send through the single send path." | AG-10 v1.9, §4 Autonomy, L431 | None stated | Seeded messages wait until "Review your standard messages" is confirmed (same line; AG11-D12). |
| AG-11-2 | "Mailer (send_mail)" | AG-11 v1.11, §4 Conductor↔Doers model, L553 | None stated (exists) | — |
| AG-11 §3.0 reuse | "the same Mailer Doer serves a sequence step, a deadline reminder, and a manual send." | AG-11 v1.11, §3.0, L244 | None stated | — |
| AG-11 autonomy on the action | "The same Mailer can send a templated chase on its own (AUTO) and wait for approval on an AI-written client message (APPROVE)" | AG-11 v1.11, §3.0, L252 | None stated | — |
| AG-11 recipe e-sign → onboarding | "envelope.signed → change_stage to WON [AUTO] + welcome email [AUTO, template] + portal invite [AUTO, template] + first document request [AUTO, template]" | AG-11 v1.11, §3.5 Release 1 seeds, L371 | Release 1 seed (heading, AG-11 L367) | — |
| AG-11 recipe speed-to-lead | "prospect.created → acknowledgement to the lead [AUTO, template] + "call now" task [AUTO]" | AG-11 v1.11, §3.5 Release 1 seeds, L368 | Release 1 seed (heading, AG-11 L367) | — |
| AG-11-14 | "Comms actions SHALL render a template with entity variables and SHALL select the locale variant from the recipient's language, falling back to firm default" | AG-11 v1.11, §4 Actions via Doers, L571 | None stated | — |
| AG-11-37 | "Every marketing comms action SHALL verify the recipient's express consent at send time, per recipient (transactional exempt; unsubscribe halts)" | AG-11 v1.11, §4 Guardrails, L614 | None stated | — |
| AG-01 invite | "the user SHALL be created in Invited state and sent a single-use, expiring set-password invite via Mailer." | AG-01 v1.16, §4 AG-1-10, L390 | None stated | — |
| AG-09-6 | "sends a localized request via the Mailer." | AG-09 v1.8, §4 AG-9-6, L477 | None stated | — |
| AG-15 portal invite | "sends a branded activation email (in the client's chosen locale) via the Mailer." | AG-15 v1.6, §3 Portal invitation, L188 | None stated | — |
| AG-14-24 | "delivered via Mailer, audited (actor=owner, recipients, scope)" | AG-14 v1.10, §4 Scheduled reports, L385 | None stated | Scheduled reports are Release 2 per APHG L20 and TRI L183. |
| AG-16 own mailbox | "Connect the firm's own SMTP/mailbox for outbound (so client emails come from the … and the firm's own mailbox for inbound sync in Release …" | AG-16 v1.12, §3.4 Own-account integrations, L252 | "in Release 1" | — |
| SA-08 §3.3 relay | "The Mailer is the in-house email Doer (composition, templates, sequences, CASL gating — all AG-2/AG-5 product behaviour). SA-8 configures the relay rail beneath it" | SA-08 v2.2, §3.3 Email-Delivery Relay Rail, L203 | None stated | — |
| SA-08 BR-11 | "if absent or disabled, Scheduler/Mailer run fully self-contained — a Doer is never broken by an unconfigured connector." | SA-08 v2.2, §5 Business rules, L429 | None stated | — |
| APHG Release 1 | "AG-10 (outbound email, Gmail, Microsoft 365 and IMAP mailbox connection for inbound email" | Agent 99-Phasing v1.4, Phasing table, Release 1, L19 | "Release 1 — go-live" | — |
| TRI AG-10 stays | "outbound email through the firm's mail · timeline per record … email consent check (CASL) … bounce handling" | SCOPE-TRIAGE 2026-10-05, AG-10 Stays, L126 | Stays in Release 1 (list heading, TRI L6) | — |
| TRI AG-02 sequences | "sequence enrolment (already Release 2)" | SCOPE-TRIAGE 2026-10-05, AG-02 (drop) list, L39 | "already Release 2" | Manual enrolment stays Release 2 (AG-11-107). |
| DOC1 rail | "EmailRelayPort \| Mailer, Messenger (email channel), system mail \| AWS SES with SMTP fallback" | Doc 1 v1.3, §6.3 Rails as ports, L1795 | None stated | Doc 1 gives the Messenger an email channel; October AG-10-1 does not. |
| DOC1 invite | "An invite issues a single-use, time-boxed, high-entropy invite token (default 72-hour expiry) delivered by the Mailer Doer" | Doc 1 v1.3, §3 Invitation, L888 | None stated | AG-15 TRI note L203 says the 5-minute activation link "needs fixing". |
| DOC1 sub-processor | "Email relay (Mailer) \| AWS SES (+SMTP fallback) \| Email address, message body (firm-authored, non-Restricted) \| In-region" | Doc 1 v1.3, §7.7 Sub-processor matrix, L2258 | None stated | — |

Requirement rows: **46**.

## Gaps noticed

- Inbound matching is described twice: AG-10 §3.2 and AG-10-10 give fixed matching rules to the Mailer; the same section says "Inbound matching is done by the Sorter Doer" (AI). With AI off, the fixed rules alone apply (AG-10-39). The split between the two Doers needs one owner.
- Deterministic: template choice, consent gate, send window, dedupe, bounce suppression and fixed matching are all rules. Human steps: linking unmatched mail; approving any message that dropped to APPROVE (missing or unverified merge field, AI-written text).
- Audit: messages land on the timeline; sensitive actions are audited (AG-10-35); "why it was allowed" is kept for audit (AG-10-27). No line states that an email sent by a recipe is marked differently from one sent by a person, other than the recipe run-history (AG-11).
- Release: outbound email and mailbox connection are Release 1 in AG-10, AG-16 and Agent Phasing; the scope review proposes moving mailbox connection [F] and open/click tracking. Email "sequences" beyond the seeded recipes are Release 2.
- Provider: the email relay (AWS SES in Doc 1) is an infrastructure rail; Gmail/Microsoft 365/IMAP connections are outside providers that Super Admin must approve (AG11-D14), which SA-08 v2.2 does not yet reflect.
