# B-biller: the Biller (invoices and payments)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Biller issues invoices (with Canadian tax worked out from the country pack), runs payment plans, takes card payments on the firm's own payment account or records cheques and transfers, issues receipts, chases overdue balances and reports what was billed and collected. It starts billing when the retainer is signed and refuses to invoice a case whose retainer is unsigned. **Who uses it:** Billing / Finance staff and the Owner; clients pay through the portal (AG-06, CP-5). **What it replaces (founders' spec):** "QuickBooks / Stripe" ("invoices + retainers + trust"). **Status in one line:** core invoicing is Release 1; payment plans with automatic dunning, FX, the trust-funds tag and accounting export are proposed for Release 2 in the 5 Oct scope review; the October AG-06 file defers trust accounting although ratified founder decision FD-17 puts "trust-aware light" in v1.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- Agent 99-Phasing v1.4: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/99-Phasing-and-Glossary_v1.4_2026-10-05.md`
- Agent 00-Overview v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/00-Overview_v1.11_2026-10-07.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- Doc 1 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/03-Doc-1-Platform-Foundation.md`
- AG-06 v1.7: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-06-billing-and-payments_v1.7_2026-10-07.md`
- FDL v1.5: `sources/drive-snapshot-2026-10-09/01-techno-functional/07-Founder-Decisions-Log.md`
- AG-16 v1.12: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-16-firm-settings-and-integrations_v1.12_2026-10-08.md`
- AG-04 v1.5: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-04-consultation-and-booking_v1.5_2026-10-07.md`
- SA-08 v2.2: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-08-platform-integrations-and-infrastructure-rails_v2.2_2026-10-02.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Charter V1 (md dump): `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter V1 - G1 expanded.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Biller \| invoices + retainers + trust \| QuickBooks / Stripe" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 2, L69 | Tier 2 (no release date) | — |
| SPEC-IA My Day | "Money in (this week) \| Biller" | Founders IA Doers model v1 (2026-06-14), Home = "My Day", L47 | None stated | — |
| APHG glossary | "Biller (invoicing/trust)" | Agent 99-Phasing v1.4, Glossary, "Doer", L52 | None stated | — |
| AOVW scope | "AG-6 \| Billing & Payments (Biller) \| Invoices · payment plans · online/offline payment · receipts · trust-adjacent records · financial reports (client → …" | Agent 00-Overview v1.11, Detailed Scope Index, L85 | "Release 1" | TRI L80 proposes to move payment plans and automatic dunning. |
| DOC2 capability | "cap.biller \| billing \| DOER (INFRA rail) \| cap.fx \| feature.billing \| baseline" | Doc 2 v1.4, SA-CT capability registry seed table, L79 | "baseline" (illustrative tier) | — |
| DOC1 single source | "Money in the platform is single-sourced in the Biller" | Doc 1 v1.3, §6.5 FX service, L1855 | None stated | — |
| DOC1 rail | "PaymentRailPort \| Biller (client→firm), SA-4 platform billing (firm→platform) \| Stripe — Payment Intents + Connect for routing client funds to firms" | Doc 1 v1.3, §6.3 Rails as ports, L1794 | None stated | — |
| AG-06 what it is | "AG-6 is the firm's money system of record — the in-house Biller Doer that issues invoices, schedules installments, collects payments (online and offline), records …" | AG-06 v1.7, §1 Purpose, L130 | None stated | — |
| AG-06 journey | "Retainer signed in the Signer → AG-5 emits envelope.signed → the Biller cuts the deposit invoice (or activates the milestone payment plan)" | AG-06 v1.7, §1 How it ties to the revenue journey, L136 | None stated | — |
| AG-06 rail principle | "Online collection rides the firm's own payment-processor account, not a platform pooled account. … the platform never custodies client money" | AG-06 v1.7, §3 Online payments, design principle, L228 | None stated | Provider choice open (AG-06 §13 Q1). |
| AG-6-4 | "Tax SHALL be computed from a TaxProfile for the office's region within the firm's one country (resolved from that country's Country Pack, FD-68), never …" | AG-06 v1.7, §4, L352 | None stated | Tax values: FDL A-4; confirm with an accountant. |
| AG-6-5 | "Invoice numbers SHALL be generated from a per-office InvoiceNumberSequence … assigned at issue (not at draft), locked/immutable thereafter" | AG-06 v1.7, §4, L353 | None stated | — |
| AG-6-6 | "an issued invoice's line items, tax, currency, and number SHALL be immutable — corrections occur via credit note / new invoice / refund." | AG-06 v1.7, §4, L354 | None stated | FD-11 (FDL L36): credit notes "OUT for v1 — cancel-and-reissue; AG-6 mentions scrubbed". |
| AG-6-7 | "status SHALL be derived from facts (balance + due date + payments/refunds), not hand-set" | AG-06 v1.7, §4, L355 | None stated | — |
| AG-6-11 | "A Conductor sweep SHALL mark installments/invoices OVERDUE when the due date passes with a balance" | AG-06 v1.7, §4 Payment plans, L361 | None stated | Conductor-triggered (carve-out A). |
| AG-6-12 | "A dunning sequence … SHALL chase overdue balances via Conductor + Mailer/Messenger, send in the client's language, and auto-exit the instant the balance is cleared" | AG-06 v1.7, §4 Payment plans, L362 | None stated | TRI L80 proposes to move automatic dunning; TRI L77 keeps "overdue flag + manual reminder". |
| AG-6-14 | "Online payment SHALL create a PaymentIntent on the firm's own connected processor account" | AG-06 v1.7, §4 Online payment, L366 | None stated | TRI L77: online card payment is "your call". |
| AG-6-17 | "The invoice SHALL be marked paid by the webhook fact, not the browser redirect" | AG-06 v1.7, §4 Online payment, L369 | None stated | — |
| AG-6-19 | "Staff with the payment permission SHALL record an offline payment against an issued invoice: method" | AG-06 v1.7, §4 Offline payment, L373 | None stated | Human step. |
| AG-6-20 | "Recording a payment (online or offline) SHALL write the immutable Payment fact and recompute the invoice paidAmount/dueAmount/status in a single atomic transaction" | AG-06 v1.7, §4, L374 | None stated | — |
| AG-6-23 | "Refunds (Phase-2) SHALL be a reversing fact with a mandatory reason, a separate higher permission (agent/refund:create)" | AG-06 v1.7, §4 Refunds, L377 | "Phase-2" | TRI L87 "(already deferred) Refunds". |
| AG-6-24 | "it SHALL NOT present itself as a regulator-compliant trust-accounting ledger (no enforced trust/general separation, no three-way trust reconciliation) in Phase-1 (explicit deferral, §13)." | AG-06 v1.7, §4 Trust, L380 | "in Phase-1 (explicit deferral, §13)" | Conflicts with FD-17 (FDL L53): mandatory fundsDesignation, per-client trust ledger and reconciliation report "In scope for v1". TRI L82 proposes to move the "Trust-funds tag". |
| AG-6-32 | "On envelope.signed (AG-5, retainer), the Biller SHALL idempotently cut the deposit/first-milestone invoice or activate the seeded PaymentPlan" | AG-06 v1.7, §4 Hand-offs, L394 | None stated | Triggered by the Signer through the Conductor. |
| AG-6-33 | "On invoice.paid/partially_paid, AG-6 SHALL emit the fact consumed by AG-2 (revenue attribution) and AG-14 (firm reporting) and by the Conductor (payment-received)" | AG-06 v1.7, §4 Hand-offs, L395 | None stated | — |
| AG-6-38 | "Sensitive money actions (issue, void/cancel, record payment, refund, numbering/tax config change, accounting export) SHALL be audited with actor, target, and before/after." | AG-06 v1.7, §4, L402 | None stated | — |
| AG-6-42 | "AG-06 SHALL refuse to raise an invoice against a case whose retainer is neither executed nor … This SHALL NOT block or delay case …" | AG-06 v1.7, §4 (AG17-D62, AG17-D79), L410 | None stated | — |
| AG-6-43 | "the Payment fact SHALL record that staff entered it on the client's behalf (who, when)" | AG-06 v1.7, §4 (AG17-D66), L411 | None stated | — |
| AG-06 §13 deferral | "Full jurisdiction-specific trust accounting (Phase-2/3, compliance build) — fundsNature tag + clean exportable records ship now; enforced trust ledger deferred." | AG-06 v1.7, §13 Named deferrals, L741 | "Phase-2/3" | Conflicts with FD-17. |
| AG-06 §13 dunning channels | "Live SMS / WhatsApp dunning (Phase-2) — email-only dunning now; channels designed." | AG-06 v1.7, §13 Named deferrals, L742 | "Phase-2" | AG11-D18(a) puts proactive WhatsApp in Release 1. |
| FD-17 | "Trust-aware from day one, LIGHT. In scope for v1: (a) a mandatory fundsDesignation (TRUST … (c) a per-client trust ledger with running balance; (d) …" | FDL v1.5, Blueprint batch, resolved 2026-08-02, L53 | "In scope for v1" | AG-06 v1.7 AG-6-24 and §13 defer it; ratified decision changes only with Ranjan's yes. Trust rules: confirm with counsel / CICC requirements. |
| FD-11 | "Credit notes \| OUT for v1 — cancel-and-reissue; AG-6 mentions scrubbed" | FDL v1.5, Wave-0 batch, L36 | "OUT for v1" | AG-6-6 still mentions credit notes. |
| AG-16 invoice config | "consumed by Biller at invoice creation (number generated + incremented atomically)." | AG-16 v1.12, §3.2 Invoice / billing config, L230 | None stated | — |
| AG-16 own payment processor | "Connect the firm's own Stripe (publishable/secret/webhook keys) so client payments land in the firm's own account." | AG-16 v1.12, §3.4 Own-account integrations, L254 | None stated | — |
| AG-04 paid consult | "Paid type → PENDING_PAYMENT (slot held) → Biller → SCHEDULED on success." | AG-04 v1.5, AG-04 §4 AG-4-44, L513 | None stated | TRI L85: paid-consult invoice moves only if AG-04 paid consults move. |
| SA-08 §3.4 | "The payment processor is an infrastructure rail (it physically moves money — ER will not build a card network). The invoicing/billing capability, the Biller, …" | SA-08 v2.2, §3.4 Payment-Processor Rail, L216 | None stated | — |
| TRI AG-06 stays | "invoices (draft, issue, lines, status) · numbering at issue · Canadian tax · offline payment + receipt · retainer signature → deposit invoice · …" | SCOPE-TRIAGE 2026-10-05, AG-06 Stays, L77 | Stays in Release 1 (list heading, TRI L6) | — |
| TRI AG-06 moved | "Trust-funds tag" | SCOPE-TRIAGE 2026-10-05, AG-06 Proposed to move, L82 | Proposed to move to Release 2 (list meaning, TRI L7) | Conflicts with FD-17. |
| CH1 practice pack | "Canada Practice Pack \| Regulator, trust money, fees and complaints, retention, privacy, e-signature, tax" | Charter V1 (md dump), Business configuration, L102 | Release 1 business configuration (CH1 §1) | Trust-money rules are Practice Pack content (FD-22). |
| DOC1 import | "Historical financials are RECORDED INTO the single money source (Biller), never duplicated" | Doc 1 v1.3, §8.9 Import, L2577 | None stated | AG-18 puts invoices/payment history import in Release 2 (APHG L20). |

Requirement rows: **39**.

## Gaps noticed

- Ratified decision vs October module: FD-17 (2 Aug 2026) puts "trust-aware light" in v1 (mandatory TRUST/OPERATING designation, no automatic sweep, per-client trust ledger, reconciliation report). AG-06 v1.7 (AG-6-24, §13) defers trust accounting and the scope review proposes moving even the tag. FD-11 rules out credit notes; AG-6-6 still names them.
- AG-06 still uses "Phase-1/Phase-2" and "demo" wording (AG-6-23, §13) next to Release vocabulary elsewhere.
- Deterministic: tax, numbering, status from facts, overdue sweep, dunning exit, refusal to invoice an unsigned retainer. Human steps: recording offline payments, refunds (higher permission, Phase-2), issuing and voiding invoices, payment-plan set-up.
- Audit: sensitive money actions are audited with before/after (AG-6-38). Who triggered an automatic invoice (envelope.signed via the Conductor) is not stated in the audit requirement.
- Provider: Stripe Connect is the reference rail; the onboarding model and any platform application fee are open (AG-06 §13 Q1).
- Trust money and tax rules are legal and accounting values: confirm with counsel.
