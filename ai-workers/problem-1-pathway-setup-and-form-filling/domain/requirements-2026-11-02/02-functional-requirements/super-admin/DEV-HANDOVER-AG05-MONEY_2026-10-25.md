# Developer hand-over — AG-05 v2.0, AG-06 v2.0 and the money slice (25 Oct 2026)

Product owner: the product owner. *25 Oct (final check): verification fixes. Every file name below is the newest in its folder.* This note says what you receive today and how to read it. It is the note to give developers for signing, retainers, trust money, invoices and payments.

## 1. What you are receiving

| Document | Version | Status |
|---|---|---|
| **AG-05 Retainer, agreements and signing** | `FINAL-Agent-FR/AG-05-retainer-and-agreements_v2.0_2026-10-25.md` | **New hand-over.** Replaces v1.14 (now in `_archive/`). Start at **Page 1**. |
| **AG-06 Billing and payments** | `FINAL-Agent-FR/AG-06-billing-and-payments_v2.0_2026-10-25.md` | **New hand-over.** Replaces v1.14 (now in `_archive/`). Start at **Page 1**. |
| **Code changes** | `FINAL-SuperAdmin-FR/DEV-TASKS_2026-10-12.md`, **section K**, rows K1–K32 | Do K1 (the same work as J20) first. Then the rows marked "Safe now: Yes". |

**Documents updated to match** (each records the change in its table "Decisions that change this epic" and in a change-log row "25 Oct (money slice + AG-05 review)"). Older versions are in each folder's `_archive/`.

- **Agent** (`FINAL-Agent-FR/`):
  - `00-Overview_v1.26_2026-10-25.md`
  - `99-Phasing-and-Glossary_v1.19_2026-10-25.md`
  - `AG-01-firm-setup-and-onboarding_v1.26_2026-10-25.md`
  - `AG-02-prospect-lead-sales-crm_v2.5_2026-10-25.md`
  - `AG-04-consultation-and-booking_v2.1_2026-10-25.md`
  - `AG-07-case-core-and-delivery_v3.9_2026-10-25.md`
  - `AG-09-document-management_v1.24_2026-10-25.md`
  - `AG-11-automation_v1.21_2026-10-25.md`
  - `AG-12-templates_v2.10_2026-10-25.md`
  - `AG-13-tasks-reminders-notes-and-activity-audit_v1.18_2026-10-25.md`
  - `AG-14-reporting-and-analytics_v1.14_2026-10-25.md`
  - `AG-15-client-portal-management_v1.14_2026-10-25.md`
  - `AG-16-firm-settings-and-integrations_v1.24_2026-10-25.md`
  - `AG-17-corporate-cases-and-lmia_v0.13_2026-10-25.md`
  - `AG-18-data-import-and-migration_v1.9_2026-10-25.md`
- **Client portal** (`FINAL-ClientPortal-FR/`): `CP-01-client-portal-app_v0.10_2026-10-25.md`
- **Super Admin** (`FINAL-SuperAdmin-FR/`):
  - `00-Overview_v3.13_2026-10-25.md`
  - `99-Phasing-and-Glossary_v2.25_2026-10-25.md`
  - `SA-01B-content-pack-configurator_v1.14_2026-10-25.md`
  - `SA-03-subscription-plans-and-entitlements_v2.29_2026-10-25.md`
  - `SA-05-global-templates_v3.9_2026-10-25.md`
  - `SA-06-rbac_v3.15_2026-10-25.md`
  - `SA-08-platform-integrations-and-infrastructure-rails_v2.13_2026-10-25.md`
  - `SA-11-audit-compliance-and-data-governance_v2.16_2026-10-25.md`

**Not changed in this pass:** `AG-03`, `AG-08`, `AG-10` and `AG-19`. The reviews of AG-03, AG-08, AG-09 and AG-17 wait for SA-01B v2.0 (order change of 21 Oct); AG-10 is the next review (section 5). If you meet an older file name in any document, use the name in the list above.

Decisions: `FINAL-SuperAdmin-FR/TEMPLATE-MAP-working_2026-10-10.md`, section "AG-05 review — decisions" (AG05-D1 to AG05-D4) and section "Money slice review — decisions" (MS-D1 to MS-D24; MS-D17 was a direction and is replaced by MS-D18). Later decisions amend earlier ones where they say so (for example MS-D19 trust per case, MS-D20 trust corrections, MS-D21 narrows MS-D13). Product rules every epic follows: Agent `00-Overview`, "Product rules every epic follows" (X-6, currency, is rule 20).

## 2. How to read

1. AG-05 Page 1 ("For developers: read this first"), then Part A, then only your chapter. Do the same for AG-06.
2. Read DEV-TASKS section K for what is built today, what must change and the order.
3. In any other epic, start at its table "Decisions that change this epic".
4. If something is marked "Open", or a piece is missing, ask the product owner. Do not guess.
5. Where a DEV-TASKS row and an epic card differ, the card wins. Where a card and the decision log differ, the decision log wins; section K.4 lists the differences still open.

## 3. The main changes, in one page

- **Nothing for firm-to-client money or signing is built in the backend.** `apps/api/src/billing` is ExpatReady's own subscription billing. The frontend has in-memory mock screens. The old V1.5 code is reference only, and its folder is no longer in the workspace.
- **Delete the exchange-rate code first** (DEV-TASKS J20, K1). Until it is gone, `envelope.signed` cannot be emitted. No conversion exists anywhere (X-6).
- **One signing tool for every document.** Any document can be sent for signature: a retainer, an amendment, a letter, a job offer or any PDF in Documents. The client signs from a no-login link, or from the portal to-do, on the same page. No separate portal signing room. No new signing keys: a retainer uses `agent/retainer:*`; other documents use `agent/portal:request-work`. The old `agent/e-sign:*` keys are withdrawn.
- **Several client signers, any order.** The retainer counts as signed only when every client has signed and the firm's signature is on it. If the representative has a stored signature it is applied when staff send; otherwise the representative countersigns last.
- **No proposal and no Quote tab.** Staff prepare the retainer from the consult record. A sent retainer is editable until a client signs: an edit makes a new version and the old link stops. After a signature, staff prepare an amendment.
- **Fees panel on the retainer.** Services with fees (fixed or hourly), schedule rows (the first is "Deposit on signing", each with a "When"), a disbursement estimate and tax. It replaces the one fee block and the payment plans.
- **One Services list** (Settings → Services). Each service may carry default fees, rows, tasks, documents and "Needs a signed agreement". Defaults are copied on use; later edits never change a sent retainer or an invoice.
- **A simple trust ledger is in Release 1.** Trust is held per case; money before a case exists is held on the person or company. The Owner is asked once, "Do you hold client money in a trust account?". Trust request, trust receipt, "Pay from trust", To move list, monthly check, refund from trust.
- **Deposit request, not an invoice.** A signed retainer prepares a deposit request. The Automatic messages row is "Ask me first" by default. Money goes to the case's trust balance.
- **Nothing is billed by itself.** "Ready to bill" lists due rows; "Bill this" makes a draft. "Pay from trust" is pre-ticked up to the balance. No saved-card autopay in Release 1. Payment plans are withdrawn.
- **Every payment records where it landed** ("received into: Trust · Operating"). Two blocks of payment details (operating and trust). An optional second card account for trust money; card fees on trust money are the firm's own cost.
- **Corrections are in Release 1:** refunds of any payment, reverse entry, part credit note, write-off, overpayment accepted (extra goes to trust or credit), cleared and bounced cheques. Payments, refunds and trust entries are never edited or deleted.
- **Invoicing an unsigned retainer is a warning, not a block.** Case work is never blocked by money.
- **Close-out** when a case ends with unbilled items or a trust, credit or open balance: one home-screen item, a final statement, "Mark settled".
- **Paid consults:** money at booking is trust money; the "Attended" click bills it. The consultation agreement and the payment are on one page, accept first.
- **Firm-service case:** a simple case for a service with no pack programme and no filing; "Request payment" on any client or case.
- **Opening balances** (trust, owed, credit) are imported per case or typed on the client; old invoice history stays in Release 2.
- **Currency** is locked at the first money document sent (a retainer with fees, a deposit request or an invoice), not at the first invoice (MS-D20(3)).
- **Keys:** ten `agent/retainer:*` keys and the `agent/invoice:*`, `agent/payment:*`, `agent/refund:create`, `agent/expense:*`, `agent/billing-config:*`, `agent/billing-report:view` and `agent/billing:export` keys, with role seeds; the placeholder Billing / Finance role gets real keys. `check:seed-parity` must pass (DEV-TASKS K5, K6).
- **Plans:** signing is on every plan (`signer` moves from `growth`); billing and the second payment account are on every plan.
- **The deferrals register** line "full Biller" deferred out of Release 1 (`docs/DEFERRALS-REGISTER.md:537`) is wrong under the Release 1 principle and must be updated (DEV-TASKS K14).

## 4. Still open

Waiting for people outside the product team (none blocks building):

- **Immigration expert, three questions.** (a) May a disbursement be paid straight from trust, with the client's written permission, before it is invoiced (MS-D9)? If yes, the Fees panel gains one permission line. (b) May a firm keep a consult fee on a no-show or late cancel (MS-D15)? (c) Are employer-paid LMIA costs refunded to the employer, and may any be recovered from the worker (MS-D19(4))?
- **SA-08 (payment rail).** Can the trust processor account bill fees, refunds and disputes to the operating account (MS-D20(4))? Until answered, the product says plainly to the firm when it connects that the fee is its own cost.
- **The firm's accountant (not a product decision).** Tax timing for the tax-collected report (MS-D21(9), AG-14).
- **French consent text for Quebec** (AG16-88(5); AG-05 C11 question 1). Revisit before selling to Quebec-based firms. The firm may already replace the consent text in any language.

For the product owner: AG-06 section C12 lists the smaller questions and author defaults (Q4–Q13), among them keys the decisions did not name and whether the deferrals register rows are rewritten. DEV-TASKS K4 lists the open differences between the epics and the decision log. K2 and K4 name one point for the backend lead: whether the fee fields of `envelope.signed` are optional, and whether an offline refund has its own event.

## 5. What comes next

AG-03, AG-08, AG-09 and AG-17 wait for SA-01B v2.0. The epic reviews continue: AG-10 → AG-11 → AG-12 → AG-13 → AG-15 → AG-14 → AG-18. AG-05 and AG-06 are done.
