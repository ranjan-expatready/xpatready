# CN-AG-06: change note to AG-06 Billing and Payments

| Field | Value |
|---|---|
| Module changed | AG-06 Billing & Payments (client money) |
| Version and file | v1.7 of 7 Oct 2026, `02-functional-requirements/agent/AG-06-billing-and-payments_v1.7_2026-10-07.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`, unchanged since 9 Oct; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (second fix round, after re-check S3c-b) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-6-44 to AG-6-48 (highest AG-6-43, L411; a search of the whole file finds no AG-6-44 or above); §13 items 9 to 11 (highest item 8, L737) |
| Companion files | AW-01 v0.1 (the Billing assistant: AW-1-39, AW-1-96, AW-1-100); CN-AG-10 (shared senders); CN-AG-11 item 6 (item kinds `INVOICE_PROPOSAL`, `PAYMENT_MATCH`); CN-SA-06 change 1 (keys never lent to an assistant); `counsel-pack.md` question 9 |

**In plain words.** Two of the founder's own decisions are older than this module and win over it (README §0 rule 11): trust money is handled "trust-aware from day one, light" (FD-17) and there are no credit notes in version 1 (FD-11). The founder kept both on 11 Oct, and on FD-17 he chose "Keep FD-17 in full" (AIW-D72): all four parts are in Release 1. This note brings AG-06 back to FD-17's words (item 1) and, as Proposals for the team, adds what makes the four parts buildable: the per-client trust ledger, the recorded trust-to-operating move and the key that allows it, and the trust reconciliation report (item 6). The platform still never holds or moves money (FD-12): the firm moves money in its own bank and records it here. Two further changes give the Billing assistant a safe route for money: it may only propose; a person types the amount, picks the invoice and saves in AG-06's own screens; the bookkeeper sees the candidate invoices and that a payment notice is linked, never the message itself. No assistant creates even a draft invoice, posts a trust entry, sets a designation or computes a balance.

**Terms used.** *AI assistant*: an assistant working for one named person under that person's delegation (AW-01; FD-16). *Proposed match / proposed invoice*: an approval item that, when approved, only opens AG-06's own screen pre-filled (CN-AG-11 item 6). *Funds designation*: whether a client-money record is trust money or operating money, using the codes the firm's Practice Pack supplies. *Trust ledger*: the running record, per client, of money held in trust. *Recorded bank position*: the trust bank account balance at a date, as a person typed it. *Responsible practice unit*: the office whose regulator's rules govern a record (FD-22 A22-6.1).

---

## 1. Trust-aware from day one, in FD-17's words (FD-17 kept in full)

1. **Where.** §3.5 (L270–L287, in particular L270, L276, L280, L283, L285, L287); AG-6-24 (L380); `Payment.fundsNature?` (L484); BR-13 (L429); §11 (L652); §12 (L699); §13 item 5 (L734) and the deferral (L741); new §13 item **10**.
2. **Current words.**
   > L380: "**AG-6-24.** The platform SHALL record transactions and MAY tag a payment's **`fundsNature`** (e.g. retainer/trust-intended vs earned/general) and SHALL produce exportable per-client statements; it SHALL **NOT** present itself as a regulator-compliant trust-accounting ledger (no enforced trust/general separation, no three-way trust reconciliation) in Phase-1 (explicit deferral, §13)."
   >
   > L429: "**BR-13 (Platform never custodies client money).** Online funds settle to the **firm's own processor account**; offline funds go to the firm's own bank. The platform is not a money-services business and is **not** a regulator-compliant trust ledger (Phase-1)."
   >
   > L280: "It is **not** a regulator-compliant **trust ledger**: no enforced trust/general separation, no prescribed three-way trust reconciliation, no automated trust-to-general fee-transfer controls, no jurisdiction-specific trust reporting."
   >
   > L652: "**Platform never custodies funds (NEW principle):** online funds settle to the **firm's own connected processor account**; the platform is not an MSB and is **not** a trust ledger (BR-13)."
   >
   > L484: "**`fundsNature?`** *(NEW — trust-intended/earned tag, §3.5)*"
   >
   > L741: "**Full jurisdiction-specific trust accounting** (Phase-2/3, compliance build) — `fundsNature` tag + clean exportable records ship now; enforced trust ledger deferred."
3. **Proposed words.** AG-6-24 replaced:
   > **AG-6-24.** AG-6 SHALL be trust-aware from day one, light, as FD-17 decides: (a) a mandatory funds designation on every client-money record — quote, retainer, deposit, invoice line, payment, refund — held as a pack-resolved designation code (`TRUST` and `OPERATING` are the values the Canada Practice Pack supplies; A22-4); (b) no automatic sweep of client funds into operating: moving trust to operating requires an explicit, audited, reason-coded event tied to a delivered milestone or issued invoice (AG-6-47); (c) a per-client trust ledger with running balance (AG-6-46); (d) a trust reconciliation report (ledger against the recorded bank position), exportable for the firm's accountant and for a CICC file review (AG-6-48). The designation vocabulary, permitted movement triggers, sweep prohibition, ledger granularity, reconciliation cadence and retention horizon SHALL be resolved from the Practice Pack (FD-17; FD-22 A22-6.5), through the record's responsible practice unit and pinned when the record becomes legally operative (FD-22 A22-6.1, A22-6.2), never hard-coded. Out of scope for version 1, unchanged: the platform holding or moving funds (FD-12), bank-feed integration, three-way automated reconciliation (FD-17).

   **Which record carries the designation** (FD-17's six names mapped to the product's records):

   | FD-17 names | The product's record | Field |
   |---|---|---|
   | quote | the quoted fee on AG-04's consult record (`ConsultRecord.quotedFeeAmount`, `quotedFeeCurrency`, AG-04 v1.5 L611) | a designation beside the quoted fee (name to assign), carried into the retainer's fee snapshot |
   | retainer | AG-05's fee snapshot on the agreement | `fundsDesignation` |
   | deposit | the deposit invoice line the Biller raises on `envelope.signed` (AG-6-32) and the payment against it | `fundsDesignation` on the line and on the payment |
   | invoice line | `InvoiceLineItem` | `fundsDesignation` |
   | payment | `Payment` | `fundsDesignation`, replacing `fundsNature?` |
   | refund | `Refund` | `fundsDesignation` |

   `Payment.fundsNature?` is replaced by the required `fundsDesignation` (A22-4: "this is a new required field, not a rename").

   **BR-13** replaced: "**BR-13 (Platform never custodies client money; trust-aware, light).** Online funds settle to the **firm's own processor account**; offline funds go to the firm's own bank. The platform is not a money-services business and never holds or moves funds (FD-12). It designates every client-money record, keeps the per-client trust ledger and produces the trust reconciliation report (FD-17; AG-6-24); it does not integrate bank feeds or reconcile three ways automatically."

   **§3.5** reworded where it contradicts FD-17. L270 heading: "#### 3.5 Trust-aware records — "we designate and record client money; we never hold or move it" (FD-17, light)". L276: "Requires a **funds designation** on every client-money record (AG-6-24) and keeps a **per-client trust ledger** with running balance (AG-6-46)." L280: "It does **not** integrate bank feeds or reconcile three ways automatically, and it never moves money: the firm moves trust money to operating in its own bank and records the move here as an audited, reason-coded event tied to a delivered milestone or an issued invoice (AG-6-47); nothing is swept automatically (FD-12, FD-17)." L283: "AG-6 is **trust-aware, light** (FD-17): it designates every client-money record, keeps the per-client trust ledger and produces the trust reconciliation report against the recorded bank position (AG-6-48). Bank feeds and three-way automated reconciliation stay out of version 1." L285: "*Funds designation* on every client-money record (required), *Per-client trust ledger*, *Record a trust-to-operating move*, *Trust reconciliation report*, *Per-client statement* (billed/received/outstanding, exportable), *Accounting export*." L287: "Every client-money record carries `fundsDesignation`; trust money posts to the per-client ledger; a trust-to-operating move needs a reason and a link; the reconciliation compares the ledger with the recorded bank position."

   **§11** L652: "**Platform never custodies funds (NEW principle):** online funds settle to the **firm's own connected processor account**; the platform is not an MSB and never holds or moves funds; it keeps the FD-17 trust ledger as a record, not as a bank account (BR-13)."

   The §12 line (L699) and the deferral (L741) become "Trust-aware light per FD-17 ships in version 1 (AG-6-24, AG-6-46 to AG-6-48); bank feeds and three-way automated reconciliation stay out"; §13 item 5 is closed by FD-17.

   New §13 item:
   > **10. Where an automatically raised invoice line gets its designation.** FD-17 makes the designation mandatory on every invoice line, while the Biller raises the deposit invoice on `envelope.signed` with no person present (AG-6-32). The team states where that line's designation comes from (for example the signed retainer's fee snapshot) and asks the founder if a rule beyond FD-17 is needed.
4. **Why.** AIW-D72 (the founder, 11 Oct, "Keep FD-17 in full": "Release 1 carries all four parts of FD-17 as the Founder Decisions Log words them … The team brings AG-06 back to it (CN-AG-06 change 1). The Billing assistant never posts a trust entry, moves a designation or computes a balance; it reads and lists. Confirms AIW-D45; counsel reads it before any pilot on real client money (counsel pack question 9)"); AIW-D45; FD-17 (Founder Decisions Log v1.5 L53, ratified, supersedes FD-10); A22-4 (L104: "The **entity carries a pack-resolved designation code**; `TRUST` and `OPERATING` are the values the Canada Practice Pack supplies"); A22-6.1 (L117: "all Practice-Pack resolution goes through that binding — never through the firm"); A22-6.2 (L120: "invoice issue for an invoice, signature for a retainer"); A22-6.5 (L139); README §0 rule 11; `00-step3-plan.md` "FD-17 (S3c M-6)", "FD-17 in full (AIW-D72)" and "FD-17 build detail"; `proposals.md` row of 9 Oct (carve-out B, trust accounting). Behaviour: `billing-assistant.md` §9 G-8. "CICC file review" is FD-17's own wording of the purpose; product copy on screen still follows AG-11 BR-34 (no regulator code cited as a rule). FD-17 says "the firm's Practice Pack"; the resolution through the practice unit is FD-22's later amendment of the same founder batch (review S3c-b n-2). This round adds BR-13, L280, L652 and the mapping table, which the first fix round left without words (review S3c-b N-4). **Counsel reads it before any pilot on real client money** (counsel pack question 9; AIW-D64, AIW-D68).
5. **Knock-ons.** AG-04 (the quoted fee's designation) and AG-05 (the fee snapshot's designation), applied by the team from this note; AG-07 government fee line (AG-6-40) carries it; AG-14 financial reports and the AG-6-31 export show it; SA-11 retention follows the Practice Pack value; the Billing assistant never posts a trust entry, sets or moves a designation or computes a balance; it reads and lists (AIW-D72; AW-1-39, AW-1-100).

## 2. No credit notes in version 1 (FD-11 kept)

1. **Where.** §3.0 (L167); §3.1 (L191, L196); §3.4 (L255); AG-6-6 (L354); BR-2 (L418); BR-7 (L423); §6 diagram and table (L453, L466, L468); US acceptance (L512); §9 (L577, L589); deferral (L743).
2. **Current words.**
   > L354: "**AG-6-6.** Only a **`DRAFT`** invoice SHALL be editable; an **issued** invoice's line items, tax, currency, and number SHALL be immutable — corrections occur via credit note / new invoice / refund."
   >
   > L418: "An issued invoice is immutable; changes are credit note / new invoice / refund."
   >
   > L423: "Genuine credit is a deliberate credit note, never an accidental overpay."
   >
   > L468: "human message: "Issued invoices can't be edited — use a credit note/refund""
   >
   > L191: "`CANCELLED` (an issued invoice nullified before/with credit)"
   >
   > L466: "| ISSUED / PARTIALLY_PAID | CANCELLED | credit/refund any paid amount first |"
   >
   > L589: "**Cancel an invoice with payments** → must credit/refund the paid amount first"
   >
   > L743: "**Credit notes as a first-class document** (Phase-2) — correction-via-new-invoice/refund now; formal credit-note artifact deferred."
3. **Proposed words.** AG-6-6: "… immutable — corrections occur by cancel-and-reissue (cancel the issued invoice, AG-6-7, and issue a new one) or, once refunds ship, by a refund (AG-6-23). There is no credit note in version 1 (FD-11)." BR-2: "An issued invoice is immutable; changes are cancel-and-reissue or a refund." BR-7: "Money owed back to a client is handled by cancel-and-reissue or a refund (FD-11), never by an accidental overpay." §6 L468 and the acceptance criterion L512: "Issued invoices can't be edited — cancel and reissue, or refund." L191: "`CANCELLED` (an issued invoice nullified, with any paid amount refunded first)". L453 ("cancel (credit/refund first)") and the diagram at L73: "cancel (refund first)". L466: "refund any paid amount first". L589: "must refund the paid amount first". The same wording replaces "credit note" in L167, L196, L255 and L577. Deferral L743: "**Credit notes** — out of version 1 (FD-11); revisit with enterprise offline invoicing."
4. **Why.** AIW-D46 (the founder, 11 Oct: "Keep FD-11 … the team removes the mentions from AG-06"); FD-11 (Founder Decisions Log v1.5 L36: "**OUT for v1** — cancel-and-reissue; AG-6 mentions scrubbed; revisit with enterprise offline invoicing"); README §0 rule 11; `proposals.md` row of 9 Oct (carve-out B, FD-11 against AG-6-6); review S3c-b n-3 (the mentions at L191, L453, L466 and L589). Behaviour: AW-1-103; `billing-assistant.md` §9 G-9.
5. **Knock-ons.** AG-14 (no credit-note metric); AG-6-7 status set already holds `CANCELLED` and `VOID`. Not touched: AG-16's own subscription billing screen and SA-04 (Expat Ready's invoices to the firm), which FD-11 does not name; whether FD-11 reaches them is open for the founder (CN-FDL open point 5).

## 3. Payment matching: the assistant proposes, a person records in AG-06's own screen; no message content

1. **Where.** §3.4 key screens (L266); AG-6-19 (L373); AG-6-13 (L363); new requirement **AG-6-44**.
2. **Current words.**
   > L266: "*Reconciliation view* (unmatched offline payments → invoices)."
   >
   > L373: "Staff with the payment permission SHALL **record an offline payment** against an issued invoice"
3. **Proposed words.**
   > **AG-6-44 (Reconciliation view and proposed matches).** The Reconciliation view SHALL list, for a billing party, that a payment notice has been linked to that party (who linked it and when) and the party's open invoices; it SHALL NOT show the notice's content, which stays in AG-10 under AG-10's own keys. Where an AI assistant has proposed candidate invoices (AW-01; AG-11 item kind `PAYMENT_MATCH`), they SHALL be shown read-only beside the person's own search. The person SHALL type the amount received; the view SHALL then mark the candidate whose outstanding balance equals it; the person SHALL pick an invoice; the Record payment modal (§3.4) SHALL open pre-filled with party, invoice and amount; nothing SHALL be recorded until the person completes and saves it under `agent/payment:record` (AG-6-19, AG-6-20). For an invoice already in the collections queue, the queue's own record payment (AG-6-13) is the path and no proposal is made. No automation or AI assistant SHALL record, edit or refund a payment.

   Open for the team (Unknown): how the view holds a linked notice before it is tied to an invoice, since AG-6-19 records a payment only "against an issued invoice".
4. **Why.** AIW-D54 (the founder confirmed: "money: assistant proposes, person saves in the product's screen"); `00-step3-plan.md` "Bookkeeper (S3c M-7)" ("the bookkeeper sees the candidate invoices and that a payment notice is linked, never the message content"); `billing-assistant.md` §9 G-27 (for payments the safeguard is the route itself: the person types the amount before the match is shown; marked there as adopted by the founder under AIW-D57, provisional until counsel); `proposals.md` rows of 10 Oct (Billing assistant, item (3): the persona's candidate invoices appear in AG-06's own Reconciliation view, and the product's Record payment modal opens pre-filled; Billing / Finance keys: the role holds no `agent/communication:*` key); `billing-assistant.md` §9 G-2.
5. **Knock-ons.** AG-11 `PAYMENT_MATCH` (CN-AG-11 item 6); AG-10 shared-sender mark (CN-AG-10 item 1); AW-1-96 cites this view; the Billing / Finance role keeps no message key (AIW-D47), and starter roles are data published by Expat Ready (SA6-D12), so the published Billing / Finance starter role is the one meant.

## 4. Proposed invoices open the invoice builder pre-filled; no assistant creates even a draft

1. **Where.** §10 `agent/invoice:create` (L615); AG-6-40 (L408); new requirement **AG-6-45**.
2. **Current words.**
   > L615: "| `agent/invoice:create` *(changed v1.6 — SA6-D10)* | exists | Create/edit a **DRAFT** invoice (was `agent/billing/invoice:create`) | Owner, Admin, Billing / Finance |"
3. **Proposed words.**
   > **AG-6-45 (proposed invoices).** AG-6's invoice builder, and a case's government-fee action (AG-6-40), SHALL accept a pre-fill from an approved invoice proposal (AG-11 item kind `INVOICE_PROPOSAL`): approving the proposal SHALL only open the builder pre-filled for the approver. No invoice record, not even a `DRAFT`, SHALL exist until a person saves it under `agent/invoice:create`; it SHALL be issued only by a person under `agent/invoice:issue`. No automation or AI assistant SHALL create, edit, issue, void or cancel an invoice.
4. **Why.** AIW-D44 (the founder: "An unsaved draft invoice counts as a billing entry: no assistant creates even a draft; a person saves and issues in the product's own screen"); AIW-D54 (one standard for money); `proposals.md` row of 10 Oct (Billing assistant, item (3): the proposed-invoice item's approval opens the product's own invoice builder, or the case's government-fee action, pre-filled). Behaviour: AW-1-39; `billing-assistant.md` §9 G-1, G-25.
5. **Knock-ons.** AG-11 `INVOICE_PROPOSAL` (CN-AG-11 item 6); AG-6-42 still refuses an invoice against an unsigned retainer, whatever the source of the pre-fill.

## 5. Open question: do dunning templates also appear on "Review your standard messages"?

1. **Where.** AG-6-12 (L362); §13, new item **9**.
2. **Current words.**
   > L362: "A **dunning sequence** (pre-built, editable, **bilingual**, **transactional** consent class) SHALL chase overdue balances via **Conductor + Mailer/Messenger**"
3. **Proposed words.**
   > **9. Dunning templates and the standard-messages review.** Dunning templates are configured and approved under `agent/payment-plan:manage` in AG-6's own dunning sequence configuration (§3.2). Should they also appear on AG-11's one "Review your standard messages" screen (AG-11-91), which covers the seeded recipes? The team decides.
4. **Why.** `proposals.md` row of 10 Oct (Billing assistant, item (6): the team says whether they should also appear there).
5. **Knock-ons.** AG-11-91, AG-16-48 if the answer is yes.

## 6. *Proposal:* what makes FD-17 parts (b) to (d) buildable — the trust ledger, the recorded move and the reconciliation report

1. **Where.** §4, after AG-6-45; §7 key entities; §10 permissions (after L631); AG-6-35 events; new requirements **AG-6-46 to AG-6-48**; new §13 item **11**.
2. **Current words.** None: AG-06 v1.7 has no trust ledger, no trust-to-operating event and no reconciliation report. The nearest text is §3.5 (L280, quoted in item 1) and the per-client statement of AG-6-24 (L380).
3. **Proposed words.** All three requirements are **Proposals**; every name is for the team to assign; every value (designation codes, permitted movement reasons, ledger granularity, cadence, retention) comes from the Practice Pack (FD-17; FD-22).
   > **AG-6-46 (per-client trust ledger).** AG-6 SHALL keep a **trust ledger entry** (`TrustLedgerEntry`) for every movement of money designated as trust: `id`, `firm_id`, the client (billing party), the responsible practice unit and its Practice Pack pin (A22-6.1, A22-6.2), `designationCode`, `direction` (IN / OUT), `amount`, `currency`, `runningBalance` (per client, per designation, per currency; never summed across currencies, §3.6), `sourceRef` (the payment, refund or trust-to-operating move that posted it), `postedBy`, `postedAt`. An entry SHALL be posted only by the act that records its source (a person recording a payment, a refund or a move); no one types a balance. Entries are append-only and never edited; a mistake is corrected by a new, linked entry. The ledger per client is viewable under `agent/billing-report:view` and exportable under `agent/billing:export`, audited.
   >
   > **AG-6-47 (recorded trust-to-operating move).** A person SHALL record a move of a client's trust money to operating as one act: client, amount, currency, a **reason code** from the Practice Pack's permitted movement triggers (A22-6.5), and a required link to a **delivered milestone** (AG-07 `CaseMilestone`) or an **issued invoice**; the act SHALL be refused without the reason or the link. Recording it SHALL post an OUT entry to the trust ledger, emit a first-class event in the standard Conductor envelope (proposed name `trust.moved_to_operating`), idempotent per move, and write an audit entry. The platform does not move the money; the firm does that in its own bank (FD-12). Nothing SHALL record a move automatically: no sweep, no recipe, no seed and no AI assistant (FD-17 (b); AIW-D72; AW-1-39). The act SHALL require a new key `agent/trust:move`, which SHALL never be marked lendable to an AI assistant (SA-6-44 as proposed in CN-SA-06, "keys that … record money").
   >
   > **AG-6-48 (trust reconciliation report).** A person SHALL record the **trust bank position** (`TrustBankPosition`: `id`, `firm_id`, the responsible practice unit, `asAt`, `amount`, `currency`, `recordedBy`, `recordedAt`, an optional supporting document in AG-09) and run the **trust reconciliation report** for a date: the per-client trust running balances, their total per currency, the recorded bank position, and the difference. The report SHALL be exportable for the firm's accountant and for a CICC file review. Recording the bank position and running the report SHALL require a new key `agent/trust:reconcile`; exporting it uses `agent/billing:export` (L631), audited. There is no bank feed in version 1: the bank position is typed by a person (FD-17). The cadence and retention are Practice Pack values.

   §10 gains the two keys (`agent/trust:move`, `agent/trust:reconcile`; status **NEW**; default roles follow the starter roles Expat Ready publishes, SA6-D12). §7 gains the two entities. AG-6-35's event list gains the move event.

   New §13 item:
   > **11. Trust ledger rules for the team and counsel.** Whether a move or a refund may take a client's trust balance below zero, and whether a trust ledger entry is posted for a deposit before it is paid; the Practice Pack's Canada values for reasons, cadence and retention (counsel pack question 9).
4. **Why.** AIW-D72 (all four parts of FD-17 in Release 1; "The Billing assistant never posts a trust entry, moves a designation or computes a balance; it reads and lists"); FD-17 (L53: "(c) a per-client **trust ledger** with running balance; (d) a **trust reconciliation report** (ledger vs recorded bank position) exportable for the firm's accountant and for a CICC file review"); FD-12 (the platform never intermediates funds); `00-step3-plan.md` "FD-17 build detail (the Lead, 11 Oct, S3c-b N-4; AIW-D72)" (these items as Proposals; values stay Practice Pack values); review S3c-b N-4 (parts (b) to (d) had nothing a developer could build); counsel pack question 9.
5. **Knock-ons.** AG-07 milestone records are read, not changed; AG-14 may show the ledger and report under Reports; SA-06 catalogue gains the two keys (Super Admin half; not yet carried by CN-SA-06, raised to the Lead); SA-11 retention category for trust records follows the Practice Pack value; the Billing assistant may list ledger entries for a person and never posts one (AW-1-39, AW-1-100).

---

## Not changed here (pointers only)

- The billing events of AG-6-35 (`invoice.issued/paid/partially_paid/overdue/refunded`, `installment.due`) become Conductor triggers in AG-11 (CN-AG-11 item 4); AG-6 already emits them.
- AG-6-33 calls the Conductor event `payment-received` while AG-11-4 names `invoice.paid`: one name is needed (raised to the Lead as a `proposals.md` row; no change written here).
- Plan mode, a draw invoice's due date and dunning days stay open (§13 Q3, Q7; AIW-D62).
