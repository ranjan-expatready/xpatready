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
