# FO-7a review: client-money tables (independent reviewer, P-303)

**Reviewed:** commit `6e19e4ef24a672304e35987b22298ac1ae5a5ca6`, branch `claude/affectionate-thompson-m1w7kd`, PR #1758; diff `origin/main...6e19e4ef2` (4 files, +1914). Schema only: no route and no screen, so there is no UI journey. **Journey score: N/A.** The caller ruled out a UI walk, and the journey-test report is not written for that reason. In its place I ran break-it probes in SQL on my own scratch database (`xr_studio_fo7a_review_probe` on :54329, dropped afterwards). I did not touch `xr_studio_demo` or :4400.
**Judged against:** the brief (`lead-b-briefs/FO-7a.md`), row FO-7a (BACKLOG line 308), the rev 13 lines and the FO-7t/FO-7r rows, contracts §0, §2.5, §7 (§2.5 trust) and §8, the AG-06 cards (AG-6-1, -4, -19, -44, -46, -59, -60, -61, -63, -69, -73, -76), and the FO-1b and PF-3 migrations.

## What I ran
* `npx tsx tests/check_fo7a_money_schema.ts`: **88 passed, 0 failed** (25 s). `tests/check_prisma_schema.ts`: **8 passed, 0 failed**.
* My own probes on real connections at READ COMMITTED (RC), REPEATABLE READ (RR) and SERIALIZABLE. Results are under "Concurrency".

## 1. Done-when and rev 13 lines: pass and fail cases
| Line | Pass | Fail | Proves its label? |
|---|---|---|---|
| Migration on empty and demo-data copies; `migrate diff` empty | yes (`:82-101`) | yes (`:80`, `:86`) | Yes. The diff is filtered to money lines because of 5 known differences elsewhere, which `check_prisma_schema` holds. "Demo-data" means demo-shaped rows plus `seedSampleFirms`, not a copy of the live demo. That is acceptable. |
| Issued invoice: lines, tax, party, currency, number frozen | `:167`, `:177` | `:169-176` | Yes, for writes one after another. No race test of a line write against an issue (my probe below shows the rule holds). |
| INV/CN/R/DR: no repeat, no skip under 20 parallel writers | `:191-196`, `:245`, `:253`, `:262` | `:197`, `:205` | Yes, at RC. A rollback gives the number back (`:195`). |
| Payment intent id or idempotency key used twice → refused | `:211`, `:216` | `:213` | Yes. |
| Trust entries refuse update and delete | n/a | `:284` | Yes, including truncate. |
| Trust withdrawal without an invoice → refused | `:292` | `:288` | Yes. |
| Trust balance never below zero, under parallel withdrawals | `:299-309` | `:294` | Yes, at RC (exactly 6 of 10 succeed) and at RR (forks refused). |
| Every amount is an integer | `:107` | `:164` | Yes. |
| `firm_id` first in every index | `:104` | `:105` | Yes. Primary keys on `id` are exempt, which is the FO-1b and PF-3 pattern. |
| Rev 13: second write-off; write-off update/delete; move-line update; undo without a reason or without its batch | `:314`, `:339` | `:315-317`, `:330`, `:337` | Yes. |
| Parallel ticking of one line → one batch (FO-7t's rev 13 test, supported here) | `:346` | same | Yes, at RC. I confirmed it at RR myself. |

## 2. Concurrency (my probes)
* **Numbers:** one row-locking `UPDATE` on the series row. At RC the second writer waits and then takes the next number. At RR the second writer gets 40001. Numbers never repeat and never skip, and a savepoint rollback also returns the number. **Holds.**
* **Freeze against concurrent line writes:** line vs issue, both orders, 5 rounds each. At RC the line is refused (23514); at RR it gets 40001. No line ever landed after issue. **Holds.**
* **Trust balance:** 6 parallel withdrawals of 100 from a 300 company balance at RC, RR and SERIALIZABLE. Never below 0, seq stays dense. **Holds.** The guard is the advisory lock plus the unique `(firm, party, currency, seq)` index.
* **A move source in at most one live batch:** 4 batches ticking one withdrawal at RR. 1 succeeds, 3 get 23505. **Holds.**
* **Credit notes over the total:** at RR the second writer gets 40001. This only works because every credit note also updates the CN series row. The comment at `migration.sql:752-753` credits the `FOR UPDATE` lock, which does not protect at RR. The result is safe; the reason given is wrong.
* **Refunds over the payment:** **not safe at RR** (Major 1).
* **One Stripe account per firm:** **not safe at RR** (Minor 1).

## 3. Holes found
### Major
1. **`migration.sql:895-912` (`money_refund_write`): refunds can exceed the payment at REPEATABLE READ.**
   * **Scenario (reproduced):** a payment of 1000. Two transactions at RR each refund 700. Both commit, and `sum(money_refund.amount_minor)` is 1400. `FOR UPDATE` on a payment row that the other transaction only locked (and did not update) raises no serialisation error, so the stale `sum` passes. Nothing else catches it: refunds take no number, so no series row serialises them.
   * **Impact:** money leaves the firm beyond what was paid. The comment "refunds of one payment are written one at a time" does not hold at RR.
   * **Fix:** use the backstop the trust ledger and move lines already use. Add a database-set `refund_ordinal` (count of earlier refunds + 1) with a unique index on `(firm_id, payment_id, refund_ordinal)`, so a stale read at RR fails with 23505. Alternatively, refuse writes when `current_setting('transaction_isolation') <> 'read committed'`. Either way, add an RR race test.

### Minor
1. **`migration.sql:633-645`: Stripe account id uniqueness as a trigger fails at RR** (the builder's choice 5h; reproduced: two firms at RR both hold `acct_RR1`).
   * **Why it matters:** webhooks are routed by account (contracts §2.5), so a duplicate could send one firm's payments to another firm.
   * **Why the trigger is not needed:** "firm_id first" is a tenancy rule for firm-scoped lookups. A global external id is not a firm-scoped lookup, and webhook routing needs a lookup with no firm. PF-3 already keeps global unique indexes on external ids (`platform_subscription.stripe_subscription_id`, `platform_staff.identity_subject`).
   * **Fix:** a unique index on `stripe_account_id`, exempted in the index check by name. Or keep the trigger and add the isolation guard.
2. **`migration.sql:945-961`: a deposit from a payment against an invoice (AG-6-69 "Trust first", received into TRUST) is not checked against the invoice's party.** Reproduced: credited to another person.
   * **Fix:** when `payment.invoice_id` is set, require the entry's party and currency to match the invoice's, as is already done for trust requests.
3. **`migration.sql:916-931`: one Trust-first payment gets two receipts** (a PAYMENT receipt on the payment and a TRUST receipt on its deposit; reproduced R-0001 and R-0002). AG-6-69 rule 5 says the receipt for such a payment is a payment receipt.
   * **Fix:** refuse a TRUST receipt for a deposit whose payment has an `invoice_id`, or refuse the PAYMENT receipt when a receipt already exists for its deposit.
4. **`migration.sql:968-976`: a withdrawal is not capped by its invoice.** Reproduced: 400.00 withdrawn to a 100.00 invoice. FO-7t's row owns "never more than the open amount", and only part of that can be a database rule.
   * **Fix:** a cheap backstop is that net withdrawals on one invoice never exceed its total. Withdrawals on an invoice are already serialised by the party lock, so this check is safe under concurrency.
5. **`migration.sql:1029-1035`: lines can be added to a batch after it was recorded, including to an already undone batch.** Reproduced: a line written into an undone batch counts as never moved.
   * **Impact:** this edits a recorded batch (AG-6-73 rule 6: "never edited").
   * **Fix:** refuse a line whose batch has an undo, and refuse a line whose batch was not written in the same transaction (batch `xmin` = `pg_current_xact_id()`).
6. **`migration.sql:1049`: `CARD_FEE_ON_TRUST` accepts any payment received into trust.** Reproduced: a cheque.
   * **Fix:** also require `method = 'CARD'`. That makes this kind unusable until card into trust is allowed (contracts §7), which is the correct state.
7. **`migration.sql:895-912` with `:942`: a refund of a payment received into TRUST leaves the ledger untouched**, and no entry links to a refund. Reproduced: a 500.00 trust payment fully refunded while its deposit still counts in the balance.
   * **Fix:** refuse `money_refund` on TRUST payments (trust money goes back by a `REFUND_TO_CLIENT` entry), or add `refund_id` to the entry and require it.
8. **`migration.sql:1038`: a TRUST_APPLIED line must be the whole withdrawal, and a CORRECTION cannot be a move source.** So a trust application that is partly returned (for example by a part credit note) cannot be moved net, which FO-7t and FO-7r will need.
   * **Fix:** allow `amount_minor <= -withdrawal`, or allow a CORRECTION entry as the source of an OPERATING_TO_TRUST line.
9. **`client-money.prisma:250-283`: no place for FO-7t's "optional evidence file through `FilesPort`"** on a trust deposit. Rev 13 says FO-7t needs no schema of its own, and FO-7t's Touch list has no migration.
   * **Fix:** add a nullable file-key column on `money_payment` now, or record in the PR that FO-7t adds it.
10. **`migration.sql:1054-1062`: the move-line lookup on `coalesce(source_trust_entry_id, source_payment_id)` scans every line of the firm and kind** (EXPLAIN confirms) while it holds the advisory lock.
    * **Fix:** two branches on the indexed column, as `money_trust_entry_write` already does.
11. **Test gaps (`check_fo7a_money_schema.ts`):** no race test for line write against issue, and none at RR for refunds, credit notes or the Stripe account. Each would have caught the rows above.

## 4. P-600
* Own area file and own migration folder: yes.
* Only additive changes: `platform.prisma` gains one back-relation line, as FO-1b did. PF-0p is not on `main`, so its slot line will replace this one later.
* All 21 functions and all triggers are named `money_`.
* Stamp `20261114131305` is later than `main`'s newest (`20261114120000_fo1b_booking_tables`), and `main` is an ancestor of the commit.
* Case-side tables are untouched.

## 5. The builder's choices (brief silent)
* **Firm anchor `money_payment_settings`:** sound. It makes the settings row a precondition, so FO-7b must create it on first use.
* **`gen_random_uuid()` defaults:** fine.
* **Credit-note and receipt numbers nullable in Prisma, with a check refusing null:** fine. FO-7b code will see `string | null`.
* **Per-party, per-currency ledger with stored balance and seq:** follows the row ("per party") and contracts §7 ("per-client"). AG-6-60 wants per case, but `case_id` is stored. Not a finding against this row.
* **A deposit must name a trust payment:** sound.
* **Card never into trust:** matches §7.
* **Undo batch carries no lines:** sound.
* **Stripe id uniqueness as a trigger:** wrong; see Minor 1.
* **Note for FO-1k:** the person and company keys it adds must be composite `(firm_id, person_id)`, so no row can point at another firm's party.

## Not checked
CI on the PR. The real demo database copy. FO-7b, FO-7t, FO-7r and FO-7c code, which does not exist yet.

**Fix list before Approve:** Major 1. Minors are advised. Minors 2, 3, 5 and 7 are cheap now and harder once FO-7b and FO-7t write rows.

Verdict: Changes needed

## Round 2 (diff only, P-277): `6e19e4ef2..1863c935a`
Head `1863c935a9e5ae331815e7d152146a2a0a53ff87`.
* `check_fo7a_money_schema.ts`: 111/111. `check_prisma_schema`: 8/8.
* Probes ran on my own scratch database (`xr_studio_fo7a_review_probe2` on :54329, dropped afterwards). Line numbers below refer to the new `migration.sql`.

### Round 1 findings and break-report items, checked again
| Item | Status | Evidence |
|---|---|---|
| Major 1 / B-2: refunds at RR | **Closed** | 700 + 700 on a 1,000 payment. RC: one written, the other refused (23514). RR: one written, the other refused (23505, `refund_ordinal`). Sum 700 in both. |
| m1 / B-3: Stripe account across firms | **Closed** | Two firms at RR: one written, the other refused (23505). Global unique index (`:309`), as PF-3 does. |
| m2: "Trust first" deposit party | **Closed** | A deposit on another person is refused (`:1051`). |
| m3: double receipt | **Closed** | `:1013-1015`, and the test. |
| m4 / B-5 / B-8: caps | **Closed as built**, with one new hole (R2-Major 2) | Credit note 80 against trust 80 on a 100 invoice at RR: one written, the other fails (40001). |
| m5 / B-7: lines only with their batch | **Closed**, with one false refusal (R2-m5) | `:1146-1153`. |
| m6 / B-11, m7, m9, m10, m11 | **Closed** | `:1175`, `:983`, `:570`, `:1180-1190`; tests added. |
| m8: net move | **Half closed, accepted** | A line may be less than its withdrawal (`:1163`). A CORRECTION as a move source stays out by choice; that is fine, since a net TRUST_APPLIED line covers the case. |
| B-1 (a)-(f): unseen rows | **Closed** | All six CTE and multi-row shapes from the break report now refuse with 23503 (`money_missing`). |
| B-4: request paid while it changes | **Closed at RC, open at RR** | See R2-m1. |
| B-6: series gap and prefix | **Mostly closed** | Shared prefix and digits in a prefix are refused. Gaps are still open (R2-m3), and a new refusal appears (R2-m4). |
| B-9, B-10 | **Closed** | `money_text_ok` refuses U+3000, RLM, U+202E and U+2028. Issue, send, cancel and record times are set by the database. |
| Not fixed, by choice: uncleared-cheque withdrawal; CARD_FEE_ON_TRUST unusable | **Accepted** | AG-6-68 rule 5 says warn, never block. Card into trust waits (contracts §7). |

### New in this diff
**Major**
1. **`migration.sql:554` (`money_invoice_line_tax_check`): Quebec tax cannot be invoiced.**
   * **What the check does:** it requires `tax_minor = round(amount × tax_rate_bp / 10000)` with an integer basis-point rate.
   * **Why Quebec fails:** AG-6-4 rule 1, a card the row cites, uses GST 5 % + QST 9.975 %. That is 1,497.5 bp, which is not an integer, and each tax is rounded on its own.
   * **Reproduced:** a 1,000.00 line with tax 149.75 is refused at 1,498 bp and at 1,497 bp. `money_payment_settings.tax_rates` also refuses `rateBp: 997.5` (`:511`). That second part is from round 1 and I missed it then.
   * **Fix:** drop the equality and keep the bounds (`0 ≤ tax_minor ≤ amount_minor`; `tax_rate_bp = 0` implies `tax_minor = 0`). Hold the rate in a finer unit, for example `tax_rate_ppm` and a ppm `rate` in the settings list, so 9.975 % fits. Add a pass case for a Quebec line.
2. **`migration.sql:1089-1093`: trust can never pay an invoice again after a return.**
   * **What the check does:** `applied` is minus the sum of the WITHDRAWAL_TO_INVOICE entries on the invoice. A return is a CORRECTION that cannot carry `invoice_id` (`:602`), so it never reduces `applied`.
   * **Reproduced:** an invoice of 100.00. Apply 60.00 by mistake, return 60.00 (`corrects_entry_id` set). Applying 100.00 is then refused ("10000 open … 6000 already paid from trust"), although nothing is applied.
   * **Who hits it:** FO-7t's dispute and credit-note returns, and any mistake, all leave the invoice permanently short.
   * **Fix:** subtract the CORRECTION entries whose `corrects_entry_id` names a withdrawal on that invoice. Add a test for apply, return and re-apply.

**Minor**
1. **`:900-906`, `:943`: B-4 is still open at RR.**
   * **Reproduced:** the payment on a sent request commits first. Then an RR transaction whose snapshot is older changes the request's amount to 1, and it commits. FOR SHARE leaves no row change behind, so the stale updater gets no 40001, and its EXISTS reads the old snapshot.
   * **Fix:** the payment touches the request row (`UPDATE … SET updated_at = now()`), as `money_issued_invoice` does for invoices.
2. **`:1079` vs `:1088`: the locks are taken in different orders, which deadlocks.**
   * A withdrawal locks the invoice row first and the party lock second. A deposit takes the party lock.
   * "Trust first" (AG-6-69 rule 5) writes the deposit, then the withdrawal, in one transaction. Against a concurrent withdrawal on the same invoice and party this gives 40P01 every time (6 of 6).
   * **Fix:** take the party advisory lock before `money_issued_invoice`.
3. **`:695-702`: the series still skips, and a first number cannot be corrected.**
   * **Reproduced:** a hand-written `UPDATE … SET next_number = next_number + 1`, run twice, skipped INV-0006 and INV-0007.
   * **Reproduced:** a receipt series written at 1, with nothing taken yet, refuses 2500. AG-6-44 rule 2 needs this.
   * **Fix:** let only `money_take_number` move `next_number` (a transaction-local `set_config` flag), and allow any raise while no number has been taken.
4. **`:312` with `:680-682`: one kind's prefix can block another kind entirely.**
   * **Reproduced:** with no credit note yet, the invoice prefix set to `CN-` is accepted. Every credit note is then refused: `money_take_number`'s insert hits the `(firm_id, prefix)` index, which its `ON CONFLICT (firm_id, kind)` does not cover.
   * **Fix:** refuse a prefix equal to another kind's default, or write all four series rows with the settings row.
5. **`:1146`: a batch written inside a savepoint refuses its own lines in the same transaction.**
   * Its `xmin` is the subtransaction's id, not `pg_current_xact_id()`.
   * **Fix:** store `pg_current_xact_id()` in a batch column and compare against that.
6. **Not a finding (scope):** the trust cap is total less credit notes less write-off. Payments are not counted, so trust can still pay an invoice already settled by card. The coordinator's description says the cap is built this way, and FO-7t owns "never more than the open amount".
7. **Typo-level:** duplicated comment lines at `:828-829` and `:1114-1115`.

Not checked: CI on this head; the breaker's own round 2.

**Fix list before Approve:** R2-Major 1 and R2-Major 2. R2-m1 and R2-m2 are advised, and are cheap now.

Verdict: Changes needed

## Round 3 (diff only, P-277): `1863c935a..3c88ac486`
Head `3c88ac48603dc89a3427b38429e7583ca4241c11`.
* `check_fo7a_money_schema.ts`: 119/119.
* Probes ran on my own scratch database (`xr_studio_fo7a_review_probe3` on :54329, dropped afterwards). Line numbers below refer to the new `migration.sql`.

### Round 2 findings, checked again
| Item | Status | Evidence |
|---|---|---|
| R2-Major 1: Quebec tax | **Closed** | A 1,000.00 line at 149,750 ppm with tax 149.75 is accepted. A 0.33 line with GST and QST rounded apart (tax 0.05 against 0.049) is accepted. Tax 149.77 on 1,000.00 is refused. Settings accept `ratePpm` 50000 and 99750. |
| R2-Major 2: re-apply after a return | **Closed** | Apply 60, return 60: a further return of 0.01 is refused. Re-applying the full 1,150.13 is accepted, and 0.01 more is refused. Two returns of 80 on one 100 application: RR gives one written and the other refused (23505); RC refuses both new returns (23514, after one earlier written). Sum 80. |
| R2-m1: B-4 at RR | **Closed** | The payment commits first, then a stale RR amount change: 40001, and the amount stays 1,000. |
| R2-m2: deposit-then-withdraw deadlock | **Closed** | 4 of 4 rounds: both commit. |
| R2-m3: series gap; first number | **Closed** | A direct `+1` after a number is taken is refused. Before any number is taken, the first number can be raised, lowered or the row deleted. `numbers_taken` given at insert is refused. |
| R2-m4: another kind's default prefix | **Closed** | Invoice prefix `CN-` is refused by `money_number_series_default_prefix_check`; `TOR-` is accepted. |
| R2-m5: batch written in a savepoint | **Closed** | A line after `RELEASE SAVEPOINT` is accepted. A line on a batch from an earlier transaction is refused, also after `VACUUM (FREEZE)`. On `pg_xact_status`: an unfrozen tuple older than the clog cannot exist (clog is truncated only up to the frozen horizon), so NULL cannot slip through. A batch from before an epoch wrap gives an error, never acceptance. Writing `IF b.mine IS NOT TRUE` would make the NULL case explicit (nit). |
| R2-m6: duplicate comment | **Closed** | |

### New in this diff
**Major:** none.

**Minor**
1. **`:812` (`money_issued_invoice`) with `:1060`: moving the party lock first opened a new lock-order deadlock.**
   * **Order now:** a withdrawal takes the party lock, then the invoice row. A credit note (or write-off) takes the invoice row, and a return in the same transaction then takes the party lock.
   * **Who hits it:** "Credit note, then return the trust applied to it" (AG-6-48; AG-6-73 rule 4) in one transaction, against a concurrent withdrawal on the same invoice and party.
   * **Reproduced:** 40P01, 4 of 4. Round 2's order did not deadlock here.
   * **Impact:** one transaction is aborted and can be retried; no data is wrong.
   * **Fix:** in `money_issued_invoice`, read the invoice's party and currency first without a lock, take that party's lock, then touch the row. Every path then locks party first, invoice row second.
2. **The `money.taking_number` setting (`:692`, `:718`); the coordinator asked whether it matters.**
   * **Reproduced:** `set_config('money.taking_number','on',true)`, then a direct update to 5000, is accepted.
   * **In my view it does not matter as a threat:** the app role owns these tables and can `DISABLE TRIGGER` anyway, and nobody sets a namespaced setting by accident. The triggers guard against app mistakes, not against a hostile owner.
   * **Cheap hardening (optional):** while the setting is on, also require `next_number = OLD.next_number + 1` and `numbers_taken = OLD.numbers_taken + 1`. A bypass could then only ever take numbers one by one.
   * **The real fix is PF-12's:** a non-owner app role and a `SECURITY DEFINER` number function.

**Not in this diff (noted for FO-7t; outside this diff, not a finding):**
* A negative CORRECTION takes money out of trust without naming an invoice, which is s. 32(f) by the back door. This includes a −60 correction naming a 60 return. Reproduced: after that chain, 1,210.13 was taken from trust for a 1,150.13 invoice.
* This existed from round 1: CORRECTION may be either sign, and the row lists it.
* **Fix later:** FO-7t should write a negative correction only against a deposit (a bounced cheque, a wrong party). A database rule could require a negative CORRECTION to name a DEPOSIT or a positive correction that is not a return.

Not checked: CI on this head; the breaker's round 3; the isolated-copy C10.1 and demo-reset results the coordinator reports (I did not re-run them).

**No Blocker and no Major is open.** Round 3 Minor 1 (the new deadlock) is advised before FO-7t, which will write credit-note returns.

Verdict: Approve
