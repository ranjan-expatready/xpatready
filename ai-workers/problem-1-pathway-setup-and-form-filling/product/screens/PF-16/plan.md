# PF-16 — plan changes, trial controls and billing emails on our own screens (design, before the branch)

Lane: runtime · written 21 Nov 12:0x IST, before #1959 merges (task: design and tests now, branch from `origin/main` only after #1959 merges, touch none of #1959's files before then). Row: BACKLOG PF-16 on `origin/main` 2f382acdb, as written. Money: reviewer (Opus 5.5 medium) plus breaker (P-303); the Lead reads the diff before the label (P-423).

Duplicate check: searched open and closed PRs ("PF-16"), BACKLOG*.md, `main`'s code (`change-plan`, `subscription_change`, `upcomingInvoice|createPreview`, `banner` under `api/src/platform`) and qa/CAPABILITIES ("not built"); none.

## 1. Blocker found: PF-15 part 1b is not built (question for the tech lead)

PF-16 "waits on: PF-5, PF-15, PF-14". Facts on `origin/main` 2f382acdb:
* PF-14 (jobs): merged.
* PF-15 part 1a (#2130) and part 2 (#2224): merged. `checkDowngrade` exists (`api/src/platform/entitlements/limits.ts:89`) and "books nothing (part 1b)".
* **PF-15 part 1b (the booked lower plan: `platform_subscription_change`, `check` using the lower of the two limits while a move is booked (SA-3-59), the daily job that applies it at renewal; brief `design/lead-b-briefs/PF-15.md` DW3 booking, DW4, DW5): not on `main` and no open PR.** `platform-entitlements.prisma` has no such model; `PlatformSubscription` has no booked plan.
* qa/CAPABILITIES says PF-15 "not built": stale (1a and 2 merged), but the part PF-16 needs is in fact missing.

PF-16's own test "a lower move books for the renewal and **the lower limits apply at once (PF-15)**" cannot pass without part 1b, and part 1b is a schema change (migration, schema baton) outside PF-16's touch list.

**Recommendation (A):** start PF-15 part 1b now, as its own PR: it touches none of #1959's files (schema area file, `entitlements/`, `identity/service.ts` `seatCheck` only), so it can run in parallel with #1959's queue. PF-16 part 1 then calls its booking service. Options considered: (B) fold part 1b into PF-16 part 1: one PR over 800 lines and a migration in a money PR, no; (C) PF-16 books only in Stripe (subscription schedule) with no local row: our limit checks would not see the booking, which breaks SA-3-59, no.

## 2. Split (the row says 2 PRs)

* **Part 1 — plan changes and trial controls** (after #1959 and PF-15 part 1b): change-plan with preview, the trial switch, "Start my subscription now", the banner, the portal's plan switching stays off (already in #1959's `PORTAL_FEATURES`), Smart Retries set-up.
* **Part 2 — billing emails**: fixed templates, the two recipient sets (SA-4-53), the card-expiring job (PF-14), each notice once.

## 3. Part 1 design

### Stripe facts to confirm at step 0 (docs page and date in the PR)
1. **"Stripe's upcoming invoice" → `invoices.createPreview` (confirmed 21 Nov, from the library itself).** docs.stripe.com does not resolve from the cloud lane (DNS refused), so the sources are the installed package `prototype/studio/node_modules/stripe` (version 23.1.0, the lockfile's) and its own CHANGELOG:
   * `cjs/apiVersion.js`: `ApiVersion = '2026-10-28.endive'`. CHANGELOG 23.1.0 (2026-10-29): "This release changes the pinned API version to `2026-10-28.endive`."
   * CHANGELOG 18.0.0 (2025-04-01, pinned `2025-03-31.basil`), under breaking changes: "Remove support for `listUpcomingLines` and `retrieveUpcoming` methods on resource `Invoice`". So v23 has no upcoming-invoice call.
   * `cjs/resources/Invoices.js` line 674: `createPreview(params, options)` makes `POST /v1/invoices/create_preview`, with `subscription_details` in its request schema. Its doc comment says: "You can also preview the effects of creating or updating a subscription or subscription schedule, including a preview of any prorations that will take place. To ensure that the actual proration is calculated exactly the same as the previewed proration, you should pass the subscription_details.proration_date parameter when doing the actual subscription update."
   * Design consequence: the preview passes `subscription`, `subscription_details.items` (the new price), `proration_behavior` and a `proration_date`. The change then passes the **same** `proration_date`, so the charged amount equals the previewed one; the PF-16 test asserts this. The Stripe web docs page (https://docs.stripe.com/api/invoices/create_preview) is to be cited in the PR once a lane can reach it. The library is the binding source for what our code can call.
2. A raise now: `subscriptions.update` with the new price, `proration_behavior: "always_invoice"` (charges the prorated difference once, now), `payment_behavior: "error_if_incomplete"`. Then a failed charge changes nothing.
3. Same or lower at renewal: a subscription schedule (`subscriptionSchedules.create({ from_subscription })`, then `update` with phase 1 = current price until `current_period_end`, phase 2 = target price, `proration_behavior: "none"`). No refund.
4. Monthly to yearly: price change with `billing_cycle_anchor: "now"` and proration (a fresh year from today). Yearly to monthly: schedule at the anniversary (`current_period_end`).
5. Trial switch: `subscriptions.update` with the new price, `proration_behavior: "none"`, `trial_end` unchanged. Free, and the end date is kept.
6. Start now: `subscriptions.update({ trial_end: "now", payment_behavior: "error_if_incomplete" })` with a card on file. On failure the trial continues.
7. Smart Retries within 14 days: a dashboard or Billing settings item, not an API. The set-up script prints it as a checklist line, and the PR says so.

### Port (after #1959 merges; `ports/billing.ts` is #1959's file, untouched until then)
`BillingPort` gains (fake and Stripe adapter, same contract test, P-606):
* `subscription` result gains `priceId` and `interval` (today it has neither; `PlatformSubscription` has no period column, and the period lives only on the sign-up row).
* `previewChange({ subscriptionId, priceId, at: "now" | "renewal", anchorNow })` returns `{ amountDueCents, currency, prorationCents, effectiveAt }`.
* `changePriceNow({ subscriptionId, priceId, prorate, anchorNow })`, idempotency key `pf16:<firm>:<price>:<sub version>`.
* `scheduleAtRenewal({ subscriptionId, priceId })` and `releaseSchedule(subscriptionId)` (to withdraw).
* `endTrialNow(subscriptionId)`.
Stripe adapter: new file `api/src/platform/billing/plan-change/stripe-plan-change.ts`, not #1959's `billing/stripe.ts`, unless the Lead prefers one adapter file after #1959 merges.

### Route and rules (`api/src/platform/billing/plan-change/*.ts`, `api/src/features/platform-billing-rules.ts`)
* `POST /api/platform/billing/change-plan/preview` and `POST /api/platform/billing/change-plan` `{ planCode, period: "month" | "year" }`. **Owner only**: Admin, Billing / Finance and Case Officer get 403. Firm-scoped (`firmScope`) and audited (`AuditPort`, before/after).
* Which move it is comes from Stripe's subscription (status, priceId, interval) and our plan prices:
  | case | applies | money |
  |---|---|---|
  | trialing, any public plan or period | at once | none; `trial_end` unchanged |
  | active, price up (same period) | at once | Stripe proration, one invoice |
  | active, month → year | at once, fresh year | proration credit for the unused month |
  | active, same or lower price | next renewal (schedule) | none, no refund; **only after `checkDowngrade` returns no conflict** (409 with every conflict otherwise) and then PF-15 part 1b's booking (lower limits at once, SA-3-59) |
  | active, year → month | at the anniversary (schedule) | none |
  | PAYMENT_HOLD / paused / canceled | refused (409 `BILLING_NOT_ACTIVE`; the hold pays first) | none |
* The preview is the same decision, read-only. The change re-reads Stripe and refuses if the preview's subscription version is stale (409 `PREVIEW_STALE`).
* A booked move already open plus a new change → the old schedule is released and the booking replaced in one transaction (or refused; the Lead picks, default: replace).
* Order (money first, then ours): checkDowngrade → Stripe call (idempotency key) → booking row and audit in one transaction. A Stripe failure writes nothing. A database failure after Stripe success is reconciled by #1959's webhook (`customer.subscription.updated` reads Stripe again).
* `POST /api/platform/billing/start-now` (Owner, `agent/subscription:upgrade`): no card → 409 `CARD_REQUIRED`, nothing sent to Stripe. A card that fails → trial unchanged, 402 with "Your trial continues; the card was not charged".
* `GET /api/platform/billing/banner` (Owner, Admin): `{ daysLeft, hasCard, tone: "neutral" | "amber" }`, amber when `daysLeft <= 3`. Days are counted in the firm's time zone (Toronto by default). Others get 403.
* Plan's Stripe price ids come from `platform_plan.stripe_monthly_price_id` and `stripe_yearly_price_id`. A plan with no price → 409 `PLAN_NOT_PURCHASABLE`.

## 4. Tests (`tests/check_pf16_billing_rules.ts`, Stripe test-mode fakes, a pass and a fail each)
Part 1 (the row's Done-when, one named check per line):
1. `PF-16 owner-only`: Owner changes plan → 200. Admin → 403, and the fake has 0 calls.
2. `PF-16 raise`: Team→Pro mid-period → one `changePriceNow` with proration, one invoice. Fail: the same request again (same key) → no second charge. Card declined → plan unchanged, nothing booked.
3. `PF-16 lower refused`: 8 staff, target allows 3 → 409 with `{ metric: seats, used: 8, limit: 3, reduce: 5 }`, no schedule, no booking. Pass: 3 staff → booked.
4. `PF-16 lower books`: lower move → a schedule at `current_period_end`, a booking row, and the 4th invite refused at once (PF-15 SA-3-59). Fail: no refund line in the fake.
5. `PF-16 month→year`: fresh period from now (`anchorNow`). Fail: year→month → schedule at the anniversary, no change now.
6. `PF-16 trial switch`: trialing → price changed, 0 cents, `trialEnd` identical. Fail: a non-public plan code → 404.
7. `PF-16 start now`: no card → 409 `CARD_REQUIRED`, 0 Stripe calls. Card → `endTrialNow` once, status active.
8. `PF-16 start now fails`: forced failure → still trialing, `trialEnd` unchanged, the Owner is told (response and notice queued).
9. `PF-16 banner`: 2 days left → amber. 5 days → neutral. Case Officer → 403.
10. `PF-16 held`: PAYMENT_HOLD firm → change-plan 409, start-now 409.
11. Contract: the new BillingPort calls pass on the fake and on recorded Stripe answers.
Part 2:
12. `PF-16 notices`: each notice (plan change, lower plan booked, subscription started early, trial extended, cancellation confirmation, year→month) goes to SA-4-53's right set (documents to the billing email; others to billing email + Owner + Admins), once, with a fake clock. A repeat → none.
13. `PF-16 card expiring`: a card expiring in 30 days → one email on day −30 through a PF-14 job. Fail: day −29 again → none, and an expired card that was replaced → none.

## 5. What R1.90 still needs after PF-16 (for the PR body)
R1.90 (MVP-CHECKLIST row 90): PF-5 part 2 (#1959, in the queue), **PF-5s** (all of its screens: pricing, sign-up, confirm, Checkout states, Firm profile, Plan and billing with the trial line and the banner, address panel, Payment hold, invited sign-up; part 1 #2608 holds only the sign-up screens), PF-16 parts 1 and 2, **PF-15 part 1b** (above), then J-row and qa proof.

## 6. Size estimate (judgment)
Part 1 about 550-700 changed lines with tests (port +80, fake +60, adapter +90, rules/routes +200, tests +250). Part 2 about 400.
