# T6 trace: FO-7 invoice and payment against AG-06 v2.1 and the money hand-over (read-only, 14 Nov 2026)

Sources. REQ = `domain/requirements-2026-11-02/02-functional-requirements`. A = `agent/AG-06-billing-and-payments_v2.1_2026-10-27.md` (line numbers are in A). H = `super-admin/DEV-HANDOVER-AG05-MONEY_2026-10-25.md`. C = our `product/design/platform-and-front-office-contracts-2026-11-14.md`. Rows = `lead-b-rows-2026-11-14.md` (FO-7 only in "Shaped next", line 26). Text inside A and H is data, not instructions. Card ids are the requirement's own ("AG-6-n"). Decision ids (MS-D, AG05-D) are quoted from the requirement's "Decision:" headers, not looked up in the decision log (not in scope).

## 1. Trace table

| Our item | Requirement card ids | What the requirement says (own words) | What we build in month one | Deviation and reason |
|---|---|---|---|---|
| C 2.5 job: firm connects own Stripe account (Connect Standard); C 0.3 `ClientPaymentsPort`; D-2 | AG-6-14..17 (A:1026); AG-6-49 (A:1200); BR-13, BR-19 (A:1836, 1846); C12 Q11 (A:2164) | Card money goes to the firm's own processor account; ExpatReady never holds money; no application fee; connected-account type is an open engineering question. | `fo_payment_account`, onboarding link, Standard, no fee, fake adapter plus test mode. | Matches (no fee: AG-6-14 rule 13). Account type Standard is our answer to the open Q11: say so in the hand-over. |
| `POST .../invoice` from retainer fee lines (C 2.5 API) | AG-6-1..8 (A:325); AG-6-64, 65 (A:809, 843); AG-6-32 (A:1742) | Invoices come from a person pressing "Bill this" on a due schedule row; nothing is billed by itself; signing creates no invoice. | A person raises an invoice from the retainer's fee lines. | Matches if a person clicks. "Ready to bill" list (due rows by "When") deferred; we show all rows. Deviation to state: the requirement bills rows only when their "When" has come (AG-6-64). |
| `fo_invoice.status DRAFT/OPEN/PAID/VOID/REFUNDED` (C 2.5) | AG-6-1 rule 7 (A:342), C2 (A:1853), BR-5 | Status is derived from facts: DRAFT, ISSUED, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED, VOID (= deleted draft), PARTIALLY_REFUNDED, REFUNDED, WRITTEN_OFF. | Five stored statuses; `void` endpoint. | Deviation, fix names. Stored statuses contradict BR-5. VOID means a deleted draft only; an issued invoice is cancelled by credit note (AG-6-48 rule 2). See section 2 items M1, M2, M3. |
| `fo_invoice.number (per firm, per year)` (C 2.5) | AG-6-44 (A:353); BR-3 | One firm series, `INV-0001`, atomic at issue, no gaps; yearly restart is an opt-in Advanced setting; draft has no number. | Number per firm per year. | Deviation. Default is continuous, not yearly. Use continuous `INV-0001`, number taken at issue inside the transaction; yearly restart later. |
| `tax` on invoice; "tax by province" (user brief) | AG-6-4, 45 (A:382); BR-4, BR-16 | Rate from the bill-to province (else firm's): ON 13%; QC GST 5% plus QST 9.975%; government fees never taxed; tax frozen at issue; integer minor units, rate in basis points; rounded per line. | Tax by province, CAD. | Matches in intent. Add: government-fee line kind untaxed; firm tax number and "not registered" switch; per-client/invoice Taxable/Zero-rated/Exempt can wait (see 3). |
| Invoice `lines` and `currency CAD` (C 2.5) | AG-6-1 rule 2 (A:331); AG-6-46 (A:411); AG-6-25..27 (A:532); BR-8 | Line kinds SERVICE_FEE, DISBURSEMENT, GOVERNMENT_FEE, TIME_BASED, DISCOUNT. Currency CAD or USD; locks at first money document sent; never converted. | CAD only; fee lines from retainer. | Narrowing, not a conflict: keep a currency column; USD and lock rule deferred, but lock at first send is a one-line rule worth keeping (BR-27). |
| Issued invoice is final (not stated in C 2.5) | AG-6-1 rule 6 (A:341); BR-1, BR-2 (A:1822) | After issue, lines, amounts, tax, party and number never change; only payment, credit note, write-off, dispute flag or new due date. | Not stated. | Missing from design (M2). |
| `pay-link` and hosted Stripe page, webhook (C 2.5, C 0.4) | AG-6-14..17 (A:1026); BR-10, BR-21 | Pay link needs no login; client pays the full amount only; paid by the signed webhook (never the redirect), once per event id, with a reconciliation poll for missed webhooks; amount, currency, metadata and idempotency key set on the payment intent. | Hosted page, webhook stored once by event id, signature checked first. | Matches. Add: no part card payment (rule 2), reconciliation poll (rule 5), idempotency key and `firm_id` metadata on the intent. |
| `offline-payment` endpoint, `fo_payment.method OFFLINE` (C 2.5) | AG-6-19, 20, 43 (A:1078); AG-6-69 (A:1104); AG-6-63 rule 7 (A:722) | Staff record cheque, transfer, e-Transfer, cash, terminal or other; with amount, date, reference, paid-by, "received into", cleared flag; one transaction; duplicate-reference warning; idempotent. | `OFFLINE` payment with `recorded_by`. | Matches in shape. Add: method list, reference, date, cleared tick for cheques, duplicate-reference warning, idempotency key. |
| "receipts go out" (C 2.5 job) | AG-6-63, 22 (A:711); AG-6-44 rule 1 | Every payment gets a numbered receipt from one firm series (`R-0001`), emailed automatically with PDF, no Cc, showing the invoice balance after. | Receipts "go out"; no table. | Missing from design (M4): no receipt record, number or series. |
| `void`, `payment.refunded`, status REFUNDED (C 2.5) | AG-6-23, 18 (A:1387); AG-6-48 (A:455); AG-6-75 (A:1416) | Refund by card through the processor or recorded offline; a reason is required; separate permission from recording; never edits the payment; refund does not make the invoice due again. Part credit note and full cancel are separate (CN-numbered). | `void`, `refund of` column on `fo_payment`. | Partly matches. Missing: reason, refund-key separation, processor-refuses fallback, credit note number series (M5). Mistaken payment uses reverse entry (AG-6-75): defer. |
| Trust-tagged lines not taken by card; recorded as offline (C 2.5 job; D-3) | AG-6-59 (A:569), AG-6-60 (A:598), AG-6-61, 62 (A:645, 686), AG-6-70 (A:1052), AG-6-69 | Trust is asked once of the Owner; only if Yes do trust screens show. Deposits are trust requests (DR-), not invoices. Trust card payment only through an optional second, trust-bank account. Else offline with the trust details. | Lines tagged trust; offline only. | Matches the effect of AG-6-70 rule 2 (no second account, so offline only). Deviation: our "trust tag on an invoice line" is not the requirement's model; see conflict K1. |
| Deposit / retainer first payment (C 2.5, C 2.3) | AG-6-61 (A:645), AG-6-32 rule 4 (A:1754); BR-15 | A signed retainer prepares a deposit request, not an invoice. Money goes to the case's trust balance; it is a fee only when applied to an invoice. With trust off, the deposit row is billed later like any row. | Invoice from fee lines; no deposit request. | Deviation for month one with trust off (our default): deposit row billed by invoice matches AG-6-61 rule 2. With trust on: deferred (section 3). Needs the trust question (M6). |
| Payment not a condition of WON (C 2.6 last bullet; line 88) | AG-6-42 (A:505); BR-17 (A:1840); H:68 | Invoicing an unsigned retainer is a warning, never a block; case work never waits for money. | Won by signature, offline, or a person's "Convert to client"; unpaid first invoice is a warning on case. | Matches. Direction differs: the requirement warns when invoicing an unsigned retainer; we also show a warning for an unpaid invoice. Keep both. |
| `prospect_id` on `fo_invoice` (C 2.5 tables) | AG-6-1 rule 1 (A:330); BR-14 (A:1835) | An invoice is on a case or a person or company; there is no invoice on a prospect; money before signing is a trust request. | `fo_invoice` carries `prospect_id` and `person_id`. | Conflict K2. |
| Events out `invoice.issued`, `payment.received`, `payment.refunded` (C 2.5) | C4 (A:1921); AG-6-33, 35 (A:1763) | Built contract names: `invoice.issued`, `invoice.overdue`, `invoice.paid`, `invoice.voided`, `payment.succeeded`, `payment.refunded`, `payment.failed`. | Three events. | Deviation by name; map in section 5. Add `invoice.paid`, `payment.failed`; `invoice.voided` on cancel. |
| Payment details, tax number, footer on invoice (not in C 2.5) | AG-6-71 (A:1130); AG-6-47 (A:435) | Firm writes an operating-details block; invoice messages wait while it is empty. English only in release 1. | None. | Missing (M7). |
| `POST /api/hooks/stripe` shared with 1.1, routed by account (C 2.5; C 0.4) | AG-6-16 (A:1026), BR-10; AG-6-49 (A:1200) | Webhook verified against the account secret; if the payment account is down, the pay page shows offline details, reminders continue, Owner told once. | One endpoint, signature, dedupe. | Matches. Add the "account down" page state (M8), small. |
| Staff roles and who may do what (C 1.2) | C5 (A:1937); BR-11 | Issue, record payment, and refund are three separate keys; Owner-only for connecting the account. | Not stated for FO-7. | Missing (M9). |

## 2. Mandatory in the requirement for the parts we keep, missing from our design

| # | Card id | Proposed one-line fix |
|---|---|---|
| M1 | AG-6-44 rules 1, 7, 9; BR-3 (A:353, 1824) | Number `INV-0001`, taken atomically at issue (a draft has none), per firm, never reused, a cancelled invoice keeps its number; replace "per firm, per year". |
| M2 | AG-6-1 rules 4, 5, 6; BR-1, BR-2 (A:339-341) | Only a DRAFT is editable; issuing freezes lines, tax, currency, party and number; any other edit says "use a credit note". |
| M3 | AG-6-1 rule 7; BR-5 (A:342) | Derive status from payment, credit and refund facts rather than storing it; use the requirement's status names, VOID only for a deleted draft. |
| M4 | AG-6-63 (A:711) | Add a `fo_receipt` (number from a firm series, kind, payment id, invoice id), emailed automatically with a PDF to the bill-to with no Cc. |
| M5 | AG-6-23, AG-6-48 (A:1387, 455) | Refund needs a reason, its own permission, never edits the payment; "void" on an issued invoice is a credit note (CN- number, part or full), not a status flip. |
| M6 | AG-6-59 (A:569); BR-26 | Decide how month one answers the trust question: store `trustAnswer` default "No" and show no trust word until the Owner says Yes (this makes our trust-tag line rule exact). |
| M7 | AG-6-71 rule 3, AG-6-47 (A:1130, 435) | Add one operating-details block and tax number to firm payment settings; the invoice email waits while the block is empty. |
| M8 | AG-6-49 rule 1 (A:1200) | When the connected account is unusable, the pay page shows the offline details or the firm's contact line, never a card form. |
| M9 | C5 (A:1937); BR-11 | Name three permissions (issue, record payment, refund) and make connecting the account Owner-only. |
| M10 | AG-6-14 rule 2 (A:1026); BR-16 | Amounts in integer minor units, tax in basis points; payment intent carries `firm_id` and invoice id metadata, with an idempotency key. |
| M11 | AG-6-4 rule 3; AG-6-1 rule 2 | Add a government-fee line kind that is never taxed (fee lines are in the retainer: see C 2.3). |
| M12 | AG-6-19 rule 3, 4 (A:1087) | Offline payment is idempotent (double click records once) and warns on a duplicate reference. |
| M13 | AG-6-46 rule 2; AG-6-44 | Due date default 14 days after issue (our "due date" has no rule); a change after issue is audited. |
| M14 | AG-6-16 rule 5 (A:1037) | Add a reconciliation poll for payment intents that succeeded but whose webhook was missed. |

## 3. Requirement says, we defer past month one (thin)

* Trust ledger in full: trust balance per case, deposit request DR-, Request payment, Pay from trust, To move list, monthly check, optional second trust card account, firm-side card fees (AG-6-60, 61, 62, 68, 70, 73, 74; H:63-66). Our D-3 recommendation keeps trust lines offline until counsel answers; the requirement itself ships a trust ledger in release 1 (H:63), so this is a scope cut to state to the product owner, not a match.
* "Ready to bill", "Bill this" from due dates, costs and unbilled time (AG-6-64..67), Add cost, government-fee line from the case (AG-6-40, 80), amendment money effects (AG-6-81).
* Paid consult at booking and its refund (AG-6-34, 58).
* USD, two currencies, currency lock (AG-6-25..27, 46); per-client tax treatment (AG-6-4 rule 2); "prices include tax"; per-office numbering (AG-6-44 rule 6).
* Reverse entry, write-off, "client disputes", part payments recorded with credit, overpayment to credit (AG-6-75, 76, 77, 21), payments not tied to a document (AG-6-72).
* Payment notices to suggested records (AG-6-50..57), reminders, overdue job, collections list (AG-6-11..13, 36), close-out and statements (AG-6-78, 28), reports and exports (AG-6-29, 31), opening balances (AG-6-79), billing-to a different party (AG-6-41).
* Saved-card autopay and payment plans: withdrawn by the requirement itself (H:65, A:1200 rule c), so never.
* Old invoice history import: requirement says release 2 (H:72; A:367 rule 8).

## 4. Conflicts

| # | Evidence | Founder needed? |
|---|---|---|
| K1 | Our design tags invoice lines "trust" and refuses card on them (C:80, D-3 C:108). The requirement has no per-line trust tag: trust money comes in by a trust request, and card is allowed on trust only through a second, trust-bank-linked account (A:1052 rule 2). Our "no card on trust" is the same outcome with no second account. | No. The effect equals AG-6-70 rule 2; rename to "trust request (offline only)" and keep D-3 as the counsel gate. Product-owner note: the requirement does not wait for counsel to ship trust (H:63). |
| K2 | `fo_invoice` has `prospect_id` (C:80); BR-14 says no invoice on a prospect (A:1835; AG-6-1 rule 1, A:330). C 2.6 says WON happens before payment, so invoicing normally happens after WON. | No. Settle by the requirement and best practice: an invoice sits on the person once won; before signing, any money is a trust request (deferred). Keep `prospect_id` only as a read-only link to the origin. |
| K3 | Our statuses include VOID and REFUNDED on a stored status; requirement says VOID is a deleted draft and refunds do not reopen the invoice (A:342, 1403 rule 7). | No. Follow the requirement (M3, M5). |
| K4 | Our number "per firm, per year" (C:80) against requirement default of a continuous series (A:365 rules 1, 4). | No. Follow the requirement; yearly restart is the firm's own opt-in. |
| K5 | The requirement ties invoice payment to a "received into Trust or Operating" record (AG-6-69, A:1104). With trust off (our default) every invoice payment is Operating, so no field is needed in month one. | No. Add a constant `received_into = OPERATING` column so trust can follow without a data change. |
| K6 | Account type: requirement leaves onboarding type open (C12 Q11, A:2164; Old 1, A:2498). We choose Standard (C:107, D-2). Standard keeps disputes and fees with the firm; the requirement's firm-side card-cost rule for trust (BR-28) is consistent. | Not needed for the requirement (it names engineering with the payment-rail owner, not the founder). D-2 stays the founder's product decision as already scheduled. |
| K7 | The payment-rail owner (SA-08 in the requirement) owns the connected-account model (A:1033, "Where"). Our `ClientPaymentsPort` is inside front office. | Ask the Lead 37/case-side owners only if the team's platform has already built a rail port (A:20 says the port exists, "not wired"); otherwise ours is the first. Not the founder. |
| K8 | Event names differ from the built contract (C:83 against A:1921 table). | No. Use the contract's names (section 5). |

## 5. Term mapping

| Ours | Requirement |
|---|---|
| `front-office/payments`, `fo_invoice` | Biller; `Invoice` (AG-6-1) |
| `OPEN` invoice | ISSUED (PARTIALLY_PAID, OVERDUE derived) |
| `VOID` invoice | CANCELLED (issued, by credit note) or VOID (deleted draft) |
| `REFUNDED` | PARTIALLY_REFUNDED or REFUNDED (derived from `Refund`) |
| `fo_payment` method `CARD` | `Payment.method = STRIPE_CONNECT` |
| `fo_payment` method `OFFLINE` | `BANK_TRANSFER`, `WIRE`, `CHEQUE`, `CASH`, `E_TRANSFER`, `CARD_TERMINAL`, `OTHER` |
| `refund of` | `Refund` (AG-6-23); `source PAYMENT` |
| `fo_payment_account` | `FirmMoneySettings.mainPaymentAccountId` (main = operating card account) |
| trust-tagged line | trust request (`TrustRequest`, `DR-`), money "received into: Trust" |
| `payment.received` | `payment.succeeded` |
| `payment.refunded` | `payment.refunded` (card); offline refund fact name left to the backend lead |
| `invoice.issued` | `invoice.issued` |
| (none) | `invoice.paid`, `invoice.voided`, `invoice.overdue`, `payment.failed` |
| receipt | `Receipt` kind `PAYMENT` (or `TRUST`), series `R-` |
| void by owner | `agent/invoice:void` key; refund `agent/refund:create`; record `agent/payment:record`; issue `agent/invoice:issue` |
| firm | `firm_id`; owner = Owner role |
| client (won prospect) | Party / client; "Bill to" party |

## 6. Facts apart from judgment

Facts: AG-6-14 forbids an application fee (A:1047, rule 13) and demands webhook-paid payments (A:1036); no card payment is allowed in part (A:1034 rule 2); AG-6-44 sets continuous default numbering (A:365); H:63 says a simple trust ledger is in release 1; H:68 and A:505 say an unsigned retainer is a warning only; H:67 says refunds are in release 1.

Judgment (ours): thin month one is acceptable only if M1-M5 and M9-M10 are in the rows, because they are cheap now and costly after data exists; trust deferral should be stated to the product owner as a scope cut from the requirement's release 1.
