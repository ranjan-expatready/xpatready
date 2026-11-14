# FO-7a break report: client-money tables (breaker: money, schema)

Commit 6e19e4ef2 on claude/affectionate-thompson-m1w7kd (PR #1758). Scratch database `xr_studio_fo7a_break_1` on :54329 had every migration applied in name order, plus two `platform_firm` rows (A `aaaaaaaa-…01`, B `bbbbbbbb-…01`) and a `money_payment_settings` row for each. I attacked it with psql and with `pg` clients from the studio's node_modules, at READ COMMITTED, REPEATABLE READ and SERIALIZABLE. The database was dropped at the end. Line numbers refer to `prisma/migrations/20261114131305_fo7a_client_money_tables/migration.sql`. In the SQL, `:A` stands for firm A's id and `:P` for a person uuid. Cost: US$0.

## Breaks

**B-1 Major: a single statement skips every `IF FOUND AND …` check.** Several triggers look up the row they point at and check it only `IF FOUND`, on the idea that "the foreign key refuses it" otherwise. If the row they point at is inserted in the same statement (through a data-modifying CTE, or an earlier row of a multi-row INSERT), the trigger cannot see it yet, so the check is skipped. The foreign key is checked at the end of the statement, finds the row, and passes. Every case below committed:
- (a) A payment on a **draft** invoice, in another currency (lines 868-876):
  `WITH inv AS (INSERT INTO money_invoice (id,firm_id,person_id,currency,created_by,updated_at) VALUES ('c0..01',:A,:P,'CAD','staff',now())) INSERT INTO money_payment (firm_id,invoice_id,method,amount_minor,currency,received_into,received_at,idempotency_key,recorded_by) VALUES (:A,'c0..01','E_TRANSFER',500,'USD','OPERATING',now(),'key-b1-000001','staff');`
  Result: payment USD 500 on an unnumbered CAD draft. Run as two statements, it is refused.
- (b) A trust **deposit of 1,000,000 from a 1-cent CARD payment received into OPERATING** (lines 945-961). This puts card money into the trust ledger:
  `WITH pay AS (INSERT INTO money_payment (id,firm_id,method,amount_minor,currency,received_into,received_at,stripe_payment_intent_id,idempotency_key) VALUES ('d0..01',:A,'CARD',1,'CAD','OPERATING',now(),'pi_b2','key-b2-000001')) INSERT INTO money_trust_entry (firm_id,person_id,kind,amount_minor,currency,payment_id,created_by) VALUES (:A,:P,'DEPOSIT',1000000,'CAD','d0..01','staff');`
  Result: balance_after 1000000. A later withdrawal of 400000 against it was accepted.
- (c) A **refund of 1,000,000 USD by CARD of a 1-cent CAD CASH payment** (line 899, `IF NOT FOUND THEN RETURN NEW`):
  `WITH pay AS (INSERT INTO money_payment (…'d0..02',:A,'CASH',1,'CAD','OPERATING',…)) INSERT INTO money_refund (firm_id,payment_id,amount_minor,currency,reason,route,idempotency_key,created_by) VALUES (:A,'d0..02',1000000,'USD','x','CARD','key-b3-ref-01','staff');`
- (d) A trust **withdrawal to a draft invoice of another party (a company) in USD**, taken from a person's CAD trust (lines 968-976). Same shape: the CTE inserts the draft invoice and the main query inserts a `WITHDRAWAL_TO_INVOICE` naming it.
- (e) An **undo of an undo, in another currency** (lines 1004-1015). One INSERT whose rows come in this order: (U2 undoes U1, USD), (B1 normal, CAD), (U1 undoes B1, CAD). All three rows committed.
- (f) A **line inside an undo batch**, USD in a CAD batch, `CARD_FEE_ON_TRUST` of 99,999,999 from a 1-cent payment received into OPERATING (lines 1026-1052). The CTE inserts the undo batch and the payment; the main query inserts the line.

Should: each of these is refused as it is when written as separate statements. Fix: when the row is not found, raise (as `money_issued_invoice` and `money_receipt_write` already do, and those held), or make the check a deferred constraint trigger. A rule that only holds if the API never writes a CTE is a rule kept by application code.

**B-2 Major: refunds exceed the payment at REPEATABLE READ.** Two connections, each `BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT 1 FROM money_payment_settings;`, then both run `INSERT INTO money_refund (firm_id,payment_id,amount_minor,currency,reason,route,idempotency_key,created_by) VALUES (:A,'<10000 payment>',6000,'CAD','r','OFFLINE','<distinct key>','staff'); COMMIT;`. Both committed, so 12000 was refunded on a 10000 payment. The `FOR UPDATE` at line 898 makes the second writer wait, but the sum at line 906 is read from its old snapshot. Held at READ COMMITTED and SERIALIZABLE. Credit notes survive the same race only by accident: the number take that follows hits a series-row conflict (40001). Fix: after the lock, refuse when the payment row's xmin is not visible to the snapshot, or bump a counter column on the payment (a real UPDATE gives 40001 at RR), or require SERIALIZABLE.

**B-3 Major: two firms can hold one Stripe account at REPEATABLE READ.** Firm A and firm B each RR-insert `money_payment_account (firm_id, stripe_account_id='acct_RR1', status='PENDING', updated_at=now())`. Both committed. The advisory lock at line 637 serialises the two writers, but the SELECT at line 638 reads the stale snapshot. Webhooks are routed by this id. Fix: a unique index on `stripe_account_id`, or an "account owner" table keyed by account id with `(firm_id)` as its own column.

**B-4 Major: a trust request is paid after being cancelled, and its amount changes with money on it (READ COMMITTED).** Race A: T1 runs `UPDATE money_trust_request SET cancelled_at=now(),cancelled_by='s',cancel_reason='client withdrew' WHERE id=:R` while T2 runs `INSERT INTO money_payment (…, trust_request_id=:R, 'E_TRANSFER', 1000, 'CAD', 'TRUST', …)`. Both commit, leaving DR-0002 cancelled with one payment. Race B: T1 runs `UPDATE … SET amount_minor=1` while T2 inserts the payment. Both commit, leaving an amount of 1 against 1000 paid. Reproduced at RC and RR. The payment trigger reads the request without a lock (line 878); the foreign key's KEY SHARE does not conflict with a non-key UPDATE, and the amount check at line 844 cannot see the uncommitted payment. Fix: `SELECT … FOR SHARE` on the request in `money_payment_write`, and `FOR UPDATE` plus a re-check in the request trigger.

**B-5 Major: a trust withdrawal is not bounded by the invoice.** Firm A, person :P holds 500000 in trust, and invoice INV-0010 totals 1 cent and is fully credited (CN-0005, `"full"=true`). Then `INSERT INTO money_trust_entry (firm_id,person_id,kind,amount_minor,currency,invoice_id,created_by) VALUES (:A,:P,'WITHDRAWAL_TO_INVOICE',-500000,'CAD','c5..01','s');` was accepted: the whole 5,000.00 went to a 0.01 invoice that owes nothing. The rule "names an issued invoice of the same party and currency" holds, but a withdrawal larger than what is owed is kept only by application code (Code s. 32(f) intent; legal reading Unconfirmed: no counsel). Fix: refuse when the withdrawals to the invoice exceed its total minus credit notes and write-off (lock the invoice FOR UPDATE, as credit notes do).

**B-6 Minor: a series prefix can be changed at any time, so two documents print the same number and the INV- run appears to skip.** Firm B had issued up to INV-10000. Then `UPDATE money_number_series SET prefix='CN-' WHERE firm_id=:B AND kind='INVOICE';` and the next issue gave invoice **CN-10001**. A credit note also got **CN-10001** (a CN series inserted by hand at 10001, which INSERT allows with no trigger). With default series the same collision appears once the invoice number reaches the credit-note number: for example, prefix `R-` against receipts. Also `UPDATE … SET next_number=9999` after INV-0016 was accepted, leaving a gap of 0017-9998. Fix: the prefix is fixed once a number is taken, prefixes are distinct across a firm's kinds, and raising is allowed only before the first number (lines 665-678).

**B-7 Minor: lines can be added to a batch after it was recorded, including after it was undone.** `INSERT INTO money_move_line (firm_id,batch_id,kind,direction,currency,amount_minor,source_payment_id) VALUES (:A,'<batch already undone>','WRONG_ACCOUNT','OPERATING_TO_TRUST','CAD',900,'<payment>');` was accepted. The line lands in a batch that is already undone, so its created_at is later than the undo's. "Batches never change" fails, and the history of the undone batch changes. Fix: refuse a line in a batch that has an undo, and preferably any line not written in the batch's own transaction.

**B-8 Minor: credit notes and a write-off together exceed the total.** On a 1-cent invoice, a full credit note of 1 and then a write-off of 1 were both accepted (line 796 compares only against the total). Fix: write-off ≤ total − credit notes, and credit notes ≤ total − write-off.

**B-9 Minor: free text that looks blank passes.** The databases here use the C ctype (demo included), so `[:space:]` is ASCII only. `money_text_ok(E'　　',200)` (ideographic spaces), `E'‏'`, `E'‮‮'` and `E'a b'` all return true, while NBSP, tab, DEL and C1 are refused (line 487). A reason, cancel reason or undo reason can therefore be invisible, and a bidi override can disguise a line description. Fix: add U+3000, U+2028/9, U+200E/F, U+202A-E and U+2066-9 to the blank and refused classes.

**B-10 Minor: an issue time typed by the caller.** `UPDATE money_invoice SET issued_at='1999-01-01', issued_by='s' WHERE id=…` was accepted and gave INV-0011, dated 1999 and later in the series than INV-0010, dated today. Receipts and trust entries force `now()`; invoices and trust requests (`sent_at`) do not. Fix: set `issued_at` and `sent_at` to `now()` in the trigger.

**B-11 Minor: a card-fee line names a payment that is not a card payment.** `CARD_FEE_ON_TRUST` requires a source received into TRUST (line 1049), and a card payment can never be received into TRUST. The only lines it accepts therefore name a non-card payment (verified with a CHEQUE). Fix: settle the rule with Lead B (a card payment into trust is not allowed yet, so refuse this kind until card into trust exists).

## Rules that rest on application code only (not proved broken at the database)
- `tax_minor` is not tied to `amount_minor × tax_rate_bp`. A 1-cent line at 1 bp with tax 2,000,000,000 was accepted. Invoice rates are not checked against `money_payment_settings.tax_rates`.
- `trust_enabled = false` does not stop trust requests, trust payments or ledger entries: 20 entries were written for firm A with trust off.
- A payment received into TRUST does not have to get a DEPOSIT entry. A deposit can come from an uncleared cheque and be withdrawn at once.
- Party uuids have no foreign key (FO-1k, by design). An invoice total can exceed int4 (6,294,967,295 seen), so a single `"full"` credit note on it can never be written. A party's trust balance stops at 2^31−1 cents with "integer out of range": it is refused, never wrapped.

## What held
- Numbers. 20 parallel issuers at RC, with rollbacks and savepoint rollbacks mixed in, gave INV-0001..0016 with no gap and no repeat. At RR the losers got 40001. Other checks that held: lowering next_number, deleting or truncating the series, changing kind or firm_id, and INV-9999 → INV-10000. At 999999999 the issue is refused, never wrapped. A typed number is refused on insert or update for invoices, credit notes, receipts and trust requests.
- An issued invoice: changing currency, party, number, un-issuing or deleting it is refused. Line insert, update or delete is refused, including in one CTE together with the issue. Changing its id is blocked by the lines' foreign key. Only the due date changes.
- Payments: a duplicate payment intent or idempotency key in a firm is refused. Card into trust is refused, as is a trust request paid by card or into operating, and an intent on a non-card payment. Only one Cleared tick is accepted (with an amount change, a second time, un-clearing or a non-cheque, it is refused).
- Trust balance: 20 parallel withdrawals of 300 against 1000 at RC, RR and SERIALIZABLE, for person and company parties, with savepoints, never went below zero; balance = sum and seq has no gaps. Seq and balance values given by the caller were replaced. Also held: a deposit on another party than its request, a second deposit of one payment, trust entry UPDATE, DELETE and TRUNCATE.
- Credit notes: 2 × 6000 on 10000 at RC, RR and SERIALIZABLE. A second write-off, a write-off on a draft, and write-off UPDATE or DELETE are refused. Two receipts for one payment, and a trust receipt on a withdrawal, are refused.
- Moves: two writers on one source at RC and RR (23505); an undo racing a re-move; a second undo of a batch (unique).
- Cross-firm references (payment, refund, credit note, receipt and move line naming firm A's rows from firm B) are refused. firm_id updates are refused on every table I tried. TRUNCATE is refused on every money table.
- firm_id is first in every non-primary index. Every amount column is an integer and every row with an amount carries its currency. No column holds a secret. A NULL second column in a composite foreign key only means "no reference": firm_id is NOT NULL everywhere.

## Round 3: head 3c88ac486 (diff `6e19e4ef2..3c88ac486`, focus `1863c935a..3c88ac486`)
Scratch database `xr_studio_fo7a_break_3` on :54329 had every migration applied and two firms with trust on; it was dropped at the end. I tested with psql and with `pg` clients at RC, RR and SERIALIZABLE. Line numbers refer to the migration.sql at 3c88ac486. Cost: US$0.

**Round 1 reproductions on the new head.**
- B-1 (a)-(f) all hold. Every CTE and multi-row shape is refused, either by `money_missing` (23503) or, when the CTE runs first, by the rule itself.
- B-2 holds: RC gives 23514, RR gives 23505.
- B-3 holds: 23505 at RC and RR.
- B-4 holds. With the payment first, a later cancel or amount change gets 23514 at RC and 40001 at RR. With the change first, the request is changed while nothing is paid on it, which is allowed.
- B-5 holds (refused, 0 open). B-8 holds (write-off refused).
- B-6 holds: the shared prefix is refused (`default_prefix_check`), and so is a direct `next_number + 1`. See B-13.
- B-7 holds: a line into an earlier batch, or into an undone batch, is refused. See B-15 and B-16.
- B-9 holds for the four characters reported (see B-17). B-10 holds: `issued_at` is set to now(). B-11 holds: a card fee on a wire into trust is refused.

**B-12 MAJOR (for the tech lead): correcting a return to trust re-opens the invoice's trust cap.** The cap nets out returns (CORRECTION naming a withdrawal, line 1115), but not a correction of a return, and a correction naming a CORRECTION is unchecked. Person :P holds 500.00 in trust; invoice FAC-0002 totals 100.00.
```sql
INSERT INTO money_trust_entry (id,firm_id,person_id,kind,amount_minor,currency,invoice_id,created_by) VALUES (:W1,:A,:P,'WITHDRAWAL_TO_INVOICE',-10000,'CAD',:INV,'s');
INSERT INTO money_trust_entry (id,firm_id,person_id,kind,amount_minor,currency,corrects_entry_id,reason,created_by) VALUES (:C1,:A,:P,'CORRECTION',10000,'CAD',:W1,'returned','s');
INSERT INTO money_trust_entry (firm_id,person_id,kind,amount_minor,currency,corrects_entry_id,reason,created_by) VALUES (:A,:P,'CORRECTION',-10000,'CAD',:C1,'return was a mistake','s');
INSERT INTO money_trust_entry (firm_id,person_id,kind,amount_minor,currency,invoice_id,created_by) VALUES (:A,:P,'WITHDRAWAL_TO_INVOICE',-10000,'CAD',:INV,'s');  -- accepted
```
I repeated the loop once more. The ledger then shows three WITHDRAWAL_TO_INVOICE entries of 100.00 on one 100.00 invoice, and 300.00 left trust for it. Should: refused at the third withdrawal, because 100.00 is still applied. Fix (either):
- refuse a CORRECTION whose `corrects_entry_id` names a return (a return is final; a mistaken return is undone by re-applying);
- or have `applied` follow the chain, so it also subtracts corrections of returns.

**B-13 Minor: a number can be taken, skipped or reset outside a numbered row.**
- (a) `SELECT money_take_number(:A,'INVOICE');` returned INV-0006, and the next issued invoice was INV-0007. EXECUTE is granted to PUBLIC; a "preview next number" query in FO-7b would leave a gap each time it is called.
- (b) `SET money.taking_number='on'; UPDATE money_number_series SET next_number=next_number+100 WHERE firm_id=:A AND kind='INVOICE';` was accepted, and the next invoice was INV-0108.
- (c) In one transaction: `SET LOCAL money.taking_number='on'; UPDATE … SET next_number=1, numbers_taken=0;`. Then `DELETE` of the series and a re-insert with prefix `FAC-` were both accepted, and the next invoice restarted at FAC-0001.

Does the flag matter? We run as the owner, who can disable triggers anyway, so the flag is not a security boundary, and an accident needs a deliberate `SET`. But the flag turns off every check at line 719, including the "never goes back" check that round 1 enforced unconditionally. It also lets `numbers_taken` be reset, which removes the guard on deleting the series. Fix:
- drop the flag;
- allow an update only when (next+1 and taken+1) together, or while taken = 0;
- never decrease either column;
- `REVOKE EXECUTE ON FUNCTION money_take_number FROM PUBLIC`, plus `IF pg_trigger_depth() = 0 THEN RAISE`.

**B-14 Minor: deadlock when something touches the invoice before a trust withdrawal in the same transaction.**
- T1: credit note (or write-off, or `UPDATE money_invoice SET due_date=…`) on X.
- T2: withdrawal on X. It takes the party lock, then waits on X's row.
- T1: withdrawal on X. It waits on the party lock, and the deadlock follows: 40P01 in 6 of 6 runs at RC and RR.

It fails safe and can be retried. But "part credit note, then apply trust" is a likely FO-7t flow. Fix: `money_issued_invoice` (and the invoice update) take the invoice party's trust lock before touching the row, the same order as at line 1060.

**B-15 Minor (by reading; the NULL case was shown with a DO block): the "batch is mine" test passes when the status is unknown.** At line 1189, `IF NOT b.mine` does not raise when `pg_xact_status(...)` is NULL, which happens once the commit log for the batch's xmin has been truncated after a freeze. It also misreads xmins from an earlier epoch (line 1184). On this cluster, `pg_xact_status('100'::xid8)` is NULL, and `DO $$ … IF NOT (NULL = 'in progress') THEN RAISE … $$` does not raise. So, years later, old batches would accept lines again. Fix: `IF b.mine IS NOT TRUE`; better, a database-set column `recorded_xact = pg_current_xact_id()` (the top-level id, which also covers savepoints), compared for equality.

**B-16 Minor: a line can go into an undone batch inside the batch's own transaction.**
```sql
BEGIN;
INSERT batch B;
INSERT line (ordinal 1);
INSERT undo U of B;
INSERT line into B;  -- accepted, ordinal 2
COMMIT;
```
Fix: also refuse when an undo of the batch exists (line 1186).

**B-17 Minor: B-9 leftovers.** `money_text_ok` still accepts these as visible text: U+2800 (braille blank), U+E0020 (tag space), U+1D159, U+17B4 and U+1F3FB (a skin-tone modifier alone). Fix: add them to the blank class.

**Held in round 3:**
- 20 parallel issuers with rollbacks and savepoints: INV-0001..0016 with no gap (RR losers got 40001).
- 20 parallel withdrawals at RC, RR and SERIALIZABLE, for person and company parties, never went below zero.
- Same-statement pairs (CTE and multi-row) were all refused: two credit notes, two withdrawals, two refunds, a withdrawal plus a write-off, and two returns.
- Payment first against a cancel or amount change, at RC and RR.
- Quebec tax: 1,000.00 at 149750 ppm with tax 149.75 is accepted; 1 cent off is accepted and 2 cents off is refused. ppm rates are accepted in settings, while 99750.5 and anything above 1,000,000 are refused.
- An invoice total above 2^31−1 is refused at issue.
- A batch from a released savepoint takes lines; a batch committed earlier refuses them.
- A payment into TRUST with no deposit is refused at commit.
