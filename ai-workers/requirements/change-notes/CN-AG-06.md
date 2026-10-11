# CN-AG-06: change note to AG-06 Billing and Payments

| Field | Value |
|---|---|
| Module changed | AG-06 Billing & Payments (client money) |
| Version and file | v1.7 of 7 Oct 2026, `02-functional-requirements/agent/AG-06-billing-and-payments_v1.7_2026-10-07.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`, unchanged since 9 Oct; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (fix round after review S3c) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-6-44, AG-6-45 (highest AG-6-43, L411); §13 items 9 and 10 (highest item 8, L737) |
| Companion files | AW-01 v0.1 (the Billing assistant); CN-AG-10 (shared senders); CN-AG-11 item 6 (item kinds `INVOICE_PROPOSAL`, `PAYMENT_MATCH`) |

**In plain words.** Two of the founder's own decisions are older than this module and win over it (README §0 rule 11): trust tagging is required from day one (FD-17) and there are no credit notes in version 1 (FD-11); the founder kept both on 11 Oct. This note brings AG-06 back to FD-17's own words and nothing more; how an automatically raised invoice line gets its trust designation is left to the team as a question. Two further changes give the Billing assistant a safe route for money: it may only propose; a person types the amount, picks the invoice and saves in AG-06's own screens; the bookkeeper sees the candidate invoices and that a payment notice is linked, never the message itself. No assistant creates even a draft invoice.

**Terms used.** *AI assistant*: an assistant working for one named person under that person's delegation (AW-01; FD-16). *Proposed match / proposed invoice*: an approval item that, when approved, only opens AG-06's own screen pre-filled (CN-AG-11 item 6).

---

## 1. Trust-aware from day one, in FD-17's words (FD-17 kept)

1. **Where.** §3.5 (L270–L287); AG-6-24 (L380); `Payment.fundsNature?` (L484); BR-13 (L429); §12 (L699); §13 item 5 (L734) and the deferral (L741); new §13 item **10**.
2. **Current words.**
   > L380: "**AG-6-24.** The platform SHALL record transactions and MAY tag a payment's **`fundsNature`** (e.g. retainer/trust-intended vs earned/general) and SHALL produce exportable per-client statements; it SHALL **NOT** present itself as a regulator-compliant trust-accounting ledger (no enforced trust/general separation, no three-way trust reconciliation) in Phase-1 (explicit deferral, §13)."
   >
   > L484: "**`fundsNature?`** *(NEW — trust-intended/earned tag, §3.5)*"
   >
   > L741: "**Full jurisdiction-specific trust accounting** (Phase-2/3, compliance build) — `fundsNature` tag + clean exportable records ship now; enforced trust ledger deferred."
3. **Proposed words.** AG-6-24 replaced:
   > **AG-6-24.** AG-6 SHALL be trust-aware from day one, light, as FD-17 decides: (a) a mandatory funds designation on every client-money record — quote, retainer, deposit, invoice line, payment, refund — held as a pack-resolved designation code (`TRUST` and `OPERATING` are the values the Canada Practice Pack supplies; A22-4); (b) no automatic sweep of client funds into operating: moving trust to operating requires an explicit, audited, reason-coded event tied to a delivered milestone or issued invoice; (c) a per-client trust ledger with running balance; (d) a trust reconciliation report (ledger against the recorded bank position), exportable for the firm's accountant and for a CICC file review. The designation vocabulary, permitted movement triggers, sweep prohibition, ledger granularity, reconciliation cadence and retention horizon SHALL be resolved from the firm's Practice Pack (FD-17; FD-22 A22-6.5), never hard-coded. Out of scope for version 1, unchanged: the platform holding or moving funds (FD-12), bank-feed integration, three-way automated reconciliation (FD-17).

   `Payment.fundsNature?` is replaced by the required `fundsDesignation` (A22-4: "this is a new required field, not a rename"), and the same field is added to the other client-money records FD-17 names (`InvoiceLineItem`, `Refund`; the retainer's fee snapshot in AG-05). §3.5 is rewritten to describe this; the §12 line (L699) and the deferral (L741) become "Trust-aware light per FD-17 ships in version 1"; §13 item 5 is closed by FD-17.

   New §13 item:
   > **10. Where an automatically raised invoice line gets its designation.** FD-17 makes the designation mandatory on every invoice line, while the Biller raises the deposit invoice on `envelope.signed` with no person present (AG-6-32). The team states where that line's designation comes from (for example the signed retainer's fee snapshot) and asks the founder if a rule beyond FD-17 is needed.
4. **Why.** AIW-D45 (the founder, 11 Oct: "Keep FD-17 … The team brings AG-06 back to FD-17 (change note in Step 3); counsel reads it before any pilot on real client money"); FD-17 (Founder Decisions Log v1.5 L53, ratified, supersedes FD-10); A22-4 (L104: "The **entity carries a pack-resolved designation code**; `TRUST` and `OPERATING` are the values the Canada Practice Pack supplies"); A22-6.5 (L139); README §0 rule 11; `00-step3-plan.md` "FD-17 (S3c M-6)" (FD-17's words only; no *no default* rule; the automatic line is a §13 question); `proposals.md` row of 9 Oct (carve-out B, trust accounting). Behaviour: `billing-assistant.md` §9 G-8. "CICC file review" is FD-17's own wording of the purpose; product copy on screen still follows AG-11 BR-34 (no regulator code cited as a rule). **Counsel reads it before any pilot on real client money** (AIW-D45, AIW-D64, AIW-D68).
5. **Knock-ons.** AG-05 (the retainer's fee snapshot carries the designation); AG-07 government fee line (AG-6-40) carries it; AG-14 financial reports and the AG-6-31 export show it; SA-11 retention follows the Practice Pack value; the Billing assistant lists records by designation and computes no balance (AW-1-100, AW-1-39).

## 2. No credit notes in version 1 (FD-11 kept)

1. **Where.** §3.0 (L167); §3.1 (L196); §3.4 (L255); AG-6-6 (L354); BR-2 (L418); BR-7 (L423); §6 (L468); US acceptance (L512); §9 (L577); deferral (L743).
2. **Current words.**
   > L354: "**AG-6-6.** Only a **`DRAFT`** invoice SHALL be editable; an **issued** invoice's line items, tax, currency, and number SHALL be immutable — corrections occur via credit note / new invoice / refund."
   >
   > L418: "An issued invoice is immutable; changes are credit note / new invoice / refund."
   >
   > L423: "Genuine credit is a deliberate credit note, never an accidental overpay."
   >
   > L468: "human message: "Issued invoices can't be edited — use a credit note/refund""
   >
   > L743: "**Credit notes as a first-class document** (Phase-2) — correction-via-new-invoice/refund now; formal credit-note artifact deferred."
3. **Proposed words.** AG-6-6: "… immutable — corrections occur by cancel-and-reissue (cancel the issued invoice, AG-6-7, and issue a new one) or, once refunds ship, by a refund (AG-6-23). There is no credit note in version 1 (FD-11)." BR-2: "An issued invoice is immutable; changes are cancel-and-reissue or a refund." BR-7: "Money owed back to a client is handled by cancel-and-reissue or a refund (FD-11), never by an accidental overpay." §6 and the acceptance criterion: "Issued invoices can't be edited — cancel and reissue, or refund." The same wording replaces "credit note" in L167, L196, L255 and L577. Deferral L743: "**Credit notes** — out of version 1 (FD-11); revisit with enterprise offline invoicing."
4. **Why.** AIW-D46 (the founder, 11 Oct: "Keep FD-11 … the team removes the mentions from AG-06"); FD-11 (Founder Decisions Log v1.5 L36: "**OUT for v1** — cancel-and-reissue; AG-6 mentions scrubbed; revisit with enterprise offline invoicing"); README §0 rule 11; `proposals.md` row of 9 Oct (carve-out B, "FD-11 (no credit notes) vs AG-6-6"). Behaviour: AW-1-103; `billing-assistant.md` §9 G-9.
5. **Knock-ons.** AG-14 (no credit-note metric); AG-6-7 status set already holds `CANCELLED` and `VOID`. Not touched: AG-16's own subscription billing screen (Expat Ready's invoices to the firm, SA-04), which FD-11 does not name.

## 3. Payment matching: the assistant proposes, a person records in AG-06's own screen; no message content

1. **Where.** §3.4 key screens (L266); AG-6-19 (L373); AG-6-13 (L363); new requirement **AG-6-44**.
2. **Current words.**
   > L266: "*Reconciliation view* (unmatched offline payments → invoices)."
   >
   > L373: "Staff with the payment permission SHALL **record an offline payment** against an issued invoice"
3. **Proposed words.**
   > **AG-6-44 (Reconciliation view and proposed matches).** The Reconciliation view SHALL list, for a billing party, that a payment notice has been linked to that party (who linked it and when) and the party's open invoices; it SHALL NOT show the notice's content, which stays in AG-10 under AG-10's own keys. Where an AI assistant has proposed candidate invoices (AW-01; AG-11 item kind `PAYMENT_MATCH`), they SHALL be shown read-only beside the person's own search. The person SHALL type the amount received; the view SHALL then mark the candidate whose outstanding balance equals it; the person SHALL pick an invoice; the Record payment modal (§3.4) SHALL open pre-filled with party, invoice and amount; nothing SHALL be recorded until the person completes and saves it under `agent/payment:record` (AG-6-19, AG-6-20). For an invoice already in the collections queue, the queue's own record payment (AG-6-13) is the path and no proposal is made. No automation or AI assistant SHALL record, edit or refund a payment.

   Open for the team (Unknown): how the view holds a linked notice before it is tied to an invoice, since AG-6-19 records a payment only "against an issued invoice".
4. **Why.** AIW-D54 (the founder confirmed: "money: assistant proposes, person saves in the product's screen"); `00-step3-plan.md` "Bookkeeper (S3c M-7)" ("the bookkeeper sees the candidate invoices and that a payment notice is linked, never the message content"); `billing-assistant.md` §9 G-27 (for payments the safeguard is the route itself: the person types the amount before the match is shown; marked there "Adopted by the founder (AIW-D57)", provisional until counsel); `proposals.md` rows of 10 Oct (Billing assistant, item (3): "the persona's candidate invoices appear in AG-06's own Reconciliation view … the product's Record payment modal … opens pre-filled"; Billing / Finance keys: the role "holds no `agent/communication:*` key"); `billing-assistant.md` §9 G-2.
5. **Knock-ons.** AG-11 `PAYMENT_MATCH` (CN-AG-11 item 6); AG-10 shared-sender mark (CN-AG-10 item 1); AW-1-96 cites this view; the Billing / Finance role keeps no message key (AIW-D47), and starter roles are data published by Expat Ready (SA6-D12), so the published Billing / Finance starter role is the one meant.

## 4. Proposed invoices open the invoice builder pre-filled; no assistant creates even a draft

1. **Where.** §10 `agent/invoice:create` (L615); AG-6-40 (L408); new requirement **AG-6-45**.
2. **Current words.**
   > L615: "| `agent/invoice:create` *(changed v1.6 — SA6-D10)* | exists | Create/edit a **DRAFT** invoice (was `agent/billing/invoice:create`) | Owner, Admin, Billing / Finance |"
3. **Proposed words.**
   > **AG-6-45 (proposed invoices).** AG-6's invoice builder, and a case's government-fee action (AG-6-40), SHALL accept a pre-fill from an approved invoice proposal (AG-11 item kind `INVOICE_PROPOSAL`): approving the proposal SHALL only open the builder pre-filled for the approver. No invoice record, not even a `DRAFT`, SHALL exist until a person saves it under `agent/invoice:create`; it SHALL be issued only by a person under `agent/invoice:issue`. No automation or AI assistant SHALL create, edit, issue, void or cancel an invoice.
4. **Why.** AIW-D44 (the founder: "An unsaved draft invoice counts as a billing entry: no assistant creates even a draft; a person saves and issues in the product's own screen"); AIW-D54 (one standard for money); `proposals.md` row of 10 Oct (Billing assistant, item (3), "The proposed-invoice item's approval opens the product's own invoice builder (or the case's government-fee action, AG-6-40) pre-filled"). Behaviour: AW-1-39; `billing-assistant.md` §9 G-1, G-25.
5. **Knock-ons.** AG-11 `INVOICE_PROPOSAL` (CN-AG-11 item 6); AG-6-42 still refuses an invoice against an unsigned retainer, whatever the source of the pre-fill.

## 5. Open question: do dunning templates also appear on "Review your standard messages"?

1. **Where.** AG-6-12 (L362); §13, new item **9**.
2. **Current words.**
   > L362: "A **dunning sequence** (pre-built, editable, **bilingual**, **transactional** consent class) SHALL chase overdue balances via **Conductor + Mailer/Messenger**"
3. **Proposed words.**
   > **9. Dunning templates and the standard-messages review.** Dunning templates are configured and approved under `agent/payment-plan:manage` in AG-6's own dunning sequence configuration (§3.2). Should they also appear on AG-11's one "Review your standard messages" screen (AG-11-91), which covers the seeded recipes? The team decides.
4. **Why.** `proposals.md` row of 10 Oct (Billing assistant, item (6): "the team says whether they should also appear there").
5. **Knock-ons.** AG-11-91, AG-16-48 if the answer is yes.

---

## Not changed here (pointers only)

- The billing events of AG-6-35 (`invoice.issued/paid/partially_paid/overdue/refunded`, `installment.due`) become Conductor triggers in AG-11 (CN-AG-11 item 4); AG-6 already emits them.
- AG-6-33 calls the Conductor event `payment-received` while AG-11-4 names `invoice.paid`: one name is needed (raised to the Lead as a `proposals.md` row; no change written here).
- Plan mode, a draw invoice's due date and dunning days stay open (§13 Q3, Q7; AIW-D62).
