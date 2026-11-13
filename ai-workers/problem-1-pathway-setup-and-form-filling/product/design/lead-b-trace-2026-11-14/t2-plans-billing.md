# T2 trace: plans and billing (contracts §1.1, D-1, D-4; rows PF-3, PF-5) against SA-3 v2.29 and SA-4 v2.22

Sources (the team's, first source of truth). Line numbers are in the file named:
SA-3 = `REQ/super-admin/SA-03-subscription-plans-and-entitlements_v2.29_2026-10-25.md`; SA-4 = `REQ/super-admin/SA-04-saas-billing_v2.22_2026-10-17.md`.
Our files: `C` = `product/design/platform-and-front-office-contracts-2026-11-14.md`; `RW` = `product/design/lead-b-rows-2026-11-14.md`.
Read only the parts bearing on plans, limits, trial, subscription states, grace, suspension, invoices/tax, seats. SA-2 (firm creation, firm status) was not in scope; where a point depends on it, it is marked.

Facts first; judgment is in the last column and in sections 2-5.

## 1. Trace table

| Our contract item or row | Requirement card ids | What the requirement says (own words) | What we build in month one | Deviation and reason (or matches) |
|---|---|---|---|---|
| Plan catalogue `platform_plan`: Sample Solo/Team/Firm, monthly and yearly Sample prices (C §1.1; PF-3; D-1) | SA-3-1, SA-3-27, SA-4-1 (SA-3 l.580, 639; SA-4 l.507) | A plan has no price field; each plan has exactly one monthly and one yearly CAD price, held by billing. | Plan row with seats, one monthly and one yearly Sample price, Stripe price ids, active flag. | Matches on "one monthly, one yearly, CAD". Prices sit on the plan row, not a separate record: fine for a thin start (no approval queue). Add "currency CAD" to the column list. |
| Plan has trial days (not in C) | SA-3-46 (l.640), SA-3-68 (l.677) | Each plan carries trial days, whole number 0-90, default 14; 0 = no trial. | Not in `platform_plan` columns. C says "active or trialing". | Gap: add `trial_days` (Sample 14) to `platform_plan`. See section 2. |
| Plan status and visibility (`active` flag) | SA-3-1, SA-3-2, SA-3-23 (l.580, 581, 618) | Plans are Draft, Active or Retired, and Public or Internal; only Active Public plans are offered at sign-up; a retired plan keeps its firms. | `active` boolean; `GET /api/public/plans`. | Simplified, reason: three Sample plans, no editor in month one. Keep `active` (maps to Active Public). Draft/Retired/Internal deferred (section 3). |
| Plan carries limits and feature switches | SA-3-4, SA-3-31, SA-3-50 (l.585, 628) | A plan version holds four limits (staff seats, active individual cases, active corporate cases, storage) and an on/off state for every feature. | Only `seats` on the plan. | Seats kept; other three limits and the feature catalogue are case-side or later (section 3). |
| Seats count and enforcement (`platform_subscription.seats`, `platform_plan.seats`) | SA-3-4, SA-3-6, SA-3-39, SA-3-41 (l.585, 587, 638); SA-3 §3.2 "Seat counting" | Seats are a hard limit: active, suspended and pending-invitation users count; deactivated do not; an invitation over the limit is refused with 409 PLAN_LIMIT_REACHED. | `seats` columns only; no counting rule, no refusal stated in §1.1 or PF-4/PF-5. | Gap: counting rule and refusal missing. See section 2. `platform_subscription.seats` as a second copy is not in the requirement (limit comes from the plan only, SA-3-42, l.639): drop it or document it as the Stripe quantity. |
| One plan per firm, no per-firm exceptions | SA-3-42 (l.639); SA-3 §3.0 | A firm's entitlement comes only from its plan; no single-firm override. | One `platform_subscription` row per firm with `plan`. | Matches. |
| Sign-up `POST /api/public/firms` creates the firm `PENDING_VERIFICATION` (C §1.1; PF-5) | SA-4-4, SA-4-5, SA-4-7, SA-4-8, SA-4-78 (SA-4 l.510, 511, 515, 516, 606); SA-4 §3.2 | No open public sign-up: checkout only through a private, single-use sign-up link. A trial plan creates the firm on form submit, no card; a no-trial plan creates it after the first charge. Exactly once. | Open sign-up with owner's email; firm created before any payment. | Deviation (section 4, item 1): open door vs link. Exactly-once is covered by our `webhook_receipt` plus the unique owner email. |
| Checkout `POST /api/platform/billing/checkout` (owner only) | SA-4-6, SA-4-28, SA-4-30, SA-4-78 (l.512, 546, 548, 606); SA-4 §3.2 | Checkout creates the subscription on the chosen plan and period (monthly or yearly), trial if the plan has trial days, card only if 0 trial days. | Owner picks plan, gets Stripe Checkout URL. | Matches if the call takes a billing period (monthly or yearly) and applies trial days with no card at start. Add both to PF-5. |
| Customer portal `POST /api/platform/billing/portal` (owner only) | SA-4-18, SA-4-19, SA-4-31, SA-4-54, SA-4-67 (l.530, 531, 549, 580, 593); SA-4 §3.4, §3.9 | Card lives only at the processor, updated on its secure page by Owner or Admin; cancel is Owner only, to period end, with undo. | Owner-only portal link. | Deviation small: the requirement lets Owner and Admin update the card and pay (SA-4-67). Allow `admin` for portal as well. Plan change and cancel through the portal are acceptable in month one if the portal config limits them to the Owner's session (we only give the link to the owner). |
| Webhook `POST /api/hooks/stripe`: signature first, stored once by event id (C §0.4; PF-5) | SA-4-33, SA-4-34, SA-4-35 (l.553, 554, 555); SA-4 §3.10 | Verify against signing secret using raw body, reject unverifiable and store nothing; record by event id before processing, ignore repeats; handlers converge whatever the order. | Same, plus "handling never calls the service back inside the request". | Matches. Add "handlers converge in any order" as a test (event for a moved-on state is ignored, not applied backwards). Minimum events: checkout completed, subscription created/updated/ended, invoice paid/failed (refund, dispute: later, section 3). |
| Subscription status on `platform_subscription` ("status") | SA-4-11, SA-4-12, SA-4-14 (l.521, 522, 524); SA-4 §6 | Statuses TRIAL, ACTIVE, OVERDUE, PAYMENT_HOLD, ENDED; every change writes a subscription event. | One `status` column; events only as `firm.subscription_changed` in `module_event`. | Words differ and TRIAL and ENDED missing: see section 5. The `module_event` row is an adequate "subscription event" if it carries old and new status and time. |
| Firm status machine `PENDING_VERIFICATION → ACTIVE → PAST_DUE → SUSPENDED → ACTIVE`, `CLOSED` (C §1.1; PF-5) | SA-4-13, SA-4-23, SA-4-26, SA-4-47 (l.523, 537, 542, 573); SA-4 §6 table | Firm status follows the subscription: Trial, Active (with "payment overdue" indicator), Payment hold; hold ends only when payment succeeds. | Same moves as the contract; `SUSPENDED → ACTIVE` on payment. | Matches on the moves. Differences: no Trial state (section 2); the requirement shows overdue as a flag on Trial or Active, not a separate firm status (equivalent for us). Licence check is ours, not theirs (next rows). |
| Grace period: `PAST_DUE` works with banner 14 days (Sample), then `SUSPENDED` (C §1.1 Rules; PF-5 test with injected clock) | SA-4-20, SA-4-21, SA-4-22, SA-4-23 (l.534-537); SA-4 §3.5; SA-3 §3.6 | Failed charge: Overdue, full access 14 days (fixed rule, not a setting); card retried by the processor; paid within 14 days returns to Active, date unchanged; day 14 unpaid: Payment hold. | 14 days, Sample label, clock injected. | Matches on 14 days. Difference: requirement fixes 14 days (a code constant), we call it Sample: change the label to "fixed rule 14 days". Notices on day 0, 7, 12: see section 2. |
| Suspended behaviour: "sign-in works, read-only, export works" (C §1.1) | SA-4-25, SA-4-26, SA-3-19 (l.541, 542, 608); SA-4 §3.6 | Payment hold: staff can log in but only the billing screen and data download work; every other request refused with 402 pointing to billing. | Read-only everywhere, export. | Deviation (section 4, item 2): "read-only" vs "billing and download only". |
| Licence check by our staff before `ACTIVE` (D-4; `platform_firm_verification`; `POST .../verify`) | none in SA-3 or SA-4 (grep for licence returns no hit in either file) | Not a billing requirement. | Built behind a setting, default on. | Our addition. Not a conflict with SA-3/SA-4. Whether SA-2's creation service has such a step was not read (out of scope): check against SA-2 before the founder is asked. |
| Trial in the activation rule: "subscription active or trialing" (C §1.1 Rules) | SA-4-30, SA-4-78, SA-4-79 (l.548, 606, 607); SA-4 §3.8 | Trial: plan's trial days, full access, no card to start; with a card at end first charge; no card at end: Payment hold the same day, no grace. | "trialing" mentioned; no trial end behaviour. | Gap: see section 2. |
| Firm `CLOSED` with data download (C §1.1 Job, `firm.closed`) | SA-4-31, SA-4 §6 ENDED rows (l.549) | Cancel goes to period end, then subscription ENDED and firm in Payment hold with a deletion countdown (SA-2 owns the countdown). | `CLOSED` status and event. | Not billing-owned in the requirement (SA-2). Keep `CLOSED` as a staff-set end state; do not map cancellation to `CLOSED` (cancellation goes to `SUSPENDED`). |
| Events out `firm.subscription_changed` (plan, status) (C §1.1) | SA-4-14, SA-4-59 (l.524, 585) | Each status change is emitted to the firm module and the entitlement layer; named events: trial started/ended, overdue started/cleared, hold started/ended, cancellation scheduled/undone. | Five firm events. | Matches in spirit. Put old status, new status and reason (`trial_ended`, `payment_failed`, `paid`, `cancelled`) in the payload so consumers can tell them apart. |
| Entitlement check by firm state (C §1.1 "usable for cases only when ACTIVE") | SA-3-17, SA-3-19 (l.606, 608); SA-3 §3.6 | Entitlement is resolved on every request from plan and firm state; hold gives 402; checks read live counts. | A rule only; no named gate in PF-5. | Needs one gate (a function `firmAccess(firm)`) that returns FULL, GRACE (banner), HOLD. Say so in §1.1. Cache optional; skip in month one. |
| Invoices and tax (not in C or PF-5) | SA-4-16, SA-4-51, SA-4-52, SA-4-61 (l.528, 577, 578, 587); SA-4 §3.4, §3.4a | Every invoice recorded with tax lines; tax by the processor's tax service from the firm's business address; no invoice to a paying firm until tax is configured; CRA invoice fields. | Nothing stated. Stripe issues its own invoices. | Gap: see section 2 (go-live gate). |
| Webhook secret and keys (C §0.3) | SA-4-33 (l.553) | Signing secret held in the integrations module (SA-8). | Env secret, Stripe test mode only. | Matches for a build; production secret store is a later row. |

## 2. Mandatory in the requirement for the parts we keep, missing from our design

Mandatory = "MUST", a rule, a "Must now" slice (SA-4 §0.3, l.180-200; SA-3 §0.3, l.237-255), or a hard limit, for something we keep.

| Card id | What is missing | Proposed one-line fix |
|---|---|---|
| SA-3-41 (l.638), SA-3-4 (l.585), SA-3-6 (l.587) | Seat counting rule and the refusal at the limit | Add to contracts §1.2 and PF-4: seats used = active + suspended + pending invitations; an invitation over the plan's seats is refused 409 `PLAN_LIMIT_REACHED` (metric, limit); cancelled or expired invitations free the seat; test with pass and fail. |
| SA-3-46 (l.640), SA-4-30 (l.548), SA-4-78 (l.606) | Trial days on the plan and no card at trial start | Add `trial_days` (Sample 14) to `platform_plan` (PF-3, §1.1); checkout sets Stripe `trial_period_days` and does not require a card when trial days > 0 (PF-5). |
| SA-4-79 (l.607), SA-4-30 (l.548) | Trial ends with no card: Payment hold that day, no grace | In PF-5 machine: trial end with no payment method moves to `SUSPENDED` at once (not `PAST_DUE`); test with injected clock. |
| SA-4-11 (l.521), SA-4 §6 | Subscription status words and a Trial state | Store the subscription status as `TRIAL / ACTIVE / OVERDUE / PAYMENT_HOLD / ENDED` on `platform_subscription` (PF-3) and derive firm status from it plus verification (§1.1). |
| SA-4-20, SA-4-21 (l.534, 535) | Failure notice at day 0 and reminders (days 7 and 12) to billing contact, owner and Admins, with a card-update link | PF-5: send the day-0 notice through `MailPort` (fake in CI) with the portal link; days 7 and 12 are the same call from a daily check with the injected clock (one small job, no new service). If this is judged too much for month one, move to section 3 with the founder's word (see section 4, item 4). |
| SA-4-25 (l.541), SA-3-19 (l.608) | What a held firm may do: billing screen and data download only, 402 | Change §1.1 Rules: `SUSPENDED` (payment hold) allows only the billing endpoints and data export; everything else 402 (see section 4, item 2). |
| SA-4-26, SA-4-47 (l.542, 573) | Hold ends only on payment; new billing period starts on the pay day; nothing charged for hold time | PF-5: `SUSPENDED → ACTIVE` only on a paid-invoice webhook; no manual lift; with Stripe, pay the open invoice and start a new period (`billing_cycle_anchor` now). Add a refused-move test ("staff lifts hold without payment" refused). |
| SA-4-22 (l.536) | Paid within the grace returns to Active with the billing date unchanged | PF-5 test: `PAST_DUE → ACTIVE` on paid webhook leaves `current period end` unchanged. |
| SA-4-8 (l.516) | Exactly-once firm creation per sign-up and per processor subscription | PF-5 test: double submit and replayed checkout-completed create one firm, one owner invitation (we already have `webhook_receipt`; add the double-submit case). |
| SA-4-35 (l.555) | Handlers converge whatever the arrival order | PF-5 test: out-of-order events (paid before created; old event after newer) end in the right state. |
| SA-4-52 (l.578), SA-4-51 (l.577) | No invoice to a paying firm until tax is configured (Canadian province tax by the firm's business address) | Add to §1.1 a go-live gate: Stripe Tax on, Expat Ready's registration set, firm business address collected at sign-up (`platform_firm.office` must hold a full address). Build can use Stripe test mode without it; record the gate in D-1's "before the first firm" line. |
| SA-4-16 (l.528), SA-4-61 (l.587) | Invoice record and content | Month one: store Stripe's invoice id, number, period, totals, status and hosted-invoice link per invoice event (one small table or `module_event` payload); the CRA content (legal name, registration numbers, sequential number, taxes shown separately) comes from Stripe settings, to be confirmed at go-live. |
| SA-4-14 (l.524) | Every status change recorded as a subscription event | PF-5: `firm.subscription_changed` carries old status, new status, reason and time (already written in the same transaction). |
| SA-4-27 (l.543) | Access checks read the billing state on the server; screens are courtesy only | State in §1.1: the gate is in the API guard, not in the web screens. |
| SA-4-28 (l.546), SA-4-67 (l.593) | Owner (and Admin for card and payment) permission split on the billing screen | PF-5: portal and "pay overdue" allowed for `owner` and `admin`; plan change and cancel `owner` only. |

Not listed as missing (checked, covered): signature check and store-once (SA-4-33, SA-4-34); no card data stored (SA-4-18: we store only Stripe ids); CAD only; firm-id walls.

## 3. Requirement says, we defer past month one

One line each; none of these blocks a working subscription.

- SA-3-23, SA-3 §3.9 (l.618): Draft/Active/Retired lifecycle, approvals by a second Owner and change requests on live plans.
- SA-3-3, SA-3-1 (l.580): plan editor, clone, history tab, plan version per firm.
- SA-3-31, SA-3-50 to SA-3-52, SA-3-63 (l.628): feature catalogue, per-plan feature switches, locked-feature upgrade prompt (SA-3-34), CI check of keys.
- SA-3-4, SA-3-39, SA-3-47, SA-3-48 (l.585, 638): the three non-seat limits (active individual cases, active corporate cases, storage with 14-day warn window); they need the case side.
- SA-3-53 to SA-3-57, SA-4-75 (ladder): ladder position, consistency check, prices rising with position.
- SA-3-58 to SA-3-62, SA-4-76, SA-4-77: downgrade check and booked move to a lower plan with lower limits from booking.
- SA-3-20 and SA-3 §3.7: over-limit list and per-firm usage panel.
- SA-4-29, SA-4-68 to SA-4-70, SA-4-72, SA-4-74: plan and billing-period change rules with preview, day-proration display, yearly-to-monthly rule (month one: let the Stripe portal do plan switches with its own proration, or switch off plan switching in the portal config).
- SA-4-42 to SA-4-44, SA-4-83 to SA-4-87, SA-4-90: approved discounts.
- SA-4-48 and SA-4 §3.1: price-change requests with approval and 30-day notice (month one: Sample prices change only before the first firm).
- SA-4-2: automatic price push to the processor (month one: Stripe price ids entered by hand per plan, from the founder's account).
- SA-4-80, SA-4-81, SA-4-82: trial extension, "start my subscription now", trial banner and reminders at 7, 3 and 1 day (the banner is cheap and may come early).
- SA-4-49, SA-4-50, SA-4-62: refunds, first-year refund, credit notes (Stripe dashboard by hand).
- SA-4-63: written-off report and day-104 deletion write-off (SA-2 owns the countdown).
- SA-4-64, SA-4-66 (l.590): own stored copy of every invoice PDF in a Canadian region with hash, six-year retention.
- SA-4-65, SA-4-61 (bilingual): bilingual French-first invoices, terms and billing emails; subscription terms acceptance at sign-up.
- SA-4-60: GST/HST and QST number capture and format check (asked at end of trial).
- SA-4-24 and SA-4 §3.5 overdue list; SA-4-15 subscription detail screen; SA-4-36 payment events screen with re-run (log table `webhook_receipt` already exists).
- SA-4-35 dispute handling beyond "recorded" (SA-4 §0.1 itself defers automatic handling).
- SA-4-55: card-expiring notice; SA-4-57: upgrade-charge-failed email; SA-4-89: ExpatReady-owned billing email templates in the template catalogue.
- SA-4-45, SA-4-46: $0 Internal plans never asked for a card (month one has none; Sample plans are priced).
- SA-4-37: revenue data for analytics (Stripe reports cover it).

## 4. Conflicts

1. Open sign-up vs private sign-up link.
   * Ours: `POST /api/public/firms` is a public door for any firm (C §1.1 API list; C §0.6; PF-5 "sign-up rate limited").
   * Requirement: "no open public sign-up", checkout only through a private, single-use link with one email and one country, 14 days (SA-4-4, SA-4 l.510; SA-4 §3.2 step 1, l.339; SA-3 §3.8 / SA-4 §3.2 depend on SA-2-22, not read).
   * Judgment: a product and sales-control choice; no best practice or official source settles it. **Needs the founder**, one question: month one is self-serve (open, as designed, with the licence check as the gate) or invite link (matches the team)? If link: PF-5 adds a single-use token table and the public route takes the token. Recommendation: keep open sign-up with the licence check for month one only if the founder confirms; otherwise follow the team's link. This is the one real design conflict.
2. What a suspended (payment-hold) firm can do.
   * Ours: "sign-in works, read-only, export works" (C §1.1 Rules).
   * Requirement: only the billing screen and the data download work; everything else 402 (SA-4-25 l.541; SA-3-19 l.608; SA-4 §3.6).
   * Judgment: the team's rule is explicit and stricter (a firm that does not pay cannot keep reading client files). **Does not need the founder**: follow the requirement; our "read-only" text is changed to "billing and export only". Read-only is the team's different case, a feature switched off by plan (SA-3-11).
3. Words for subscription and firm status (PAST_DUE, SUSPENDED, no TRIAL, no ENDED).
   * Ours: C §1.1 Tables; PF-5. Requirement: SA-4-11 (l.521), SA-4 §6.
   * Judgment: naming only; the team's words win (rule 2 of AGENTS: team requirements first). No founder needed. See section 5.
4. Billing notices (day 0, 7, 12) in a thin month one.
   * Ours: none specified. Requirement: SA-4-20, SA-4-21 (l.534, 535), "Must now" slice SA-04.05 (SA-4 §0.3).
   * Judgment: the requirement is a Must-now rule; a minimal version (one function, plain English, fake mail adapter) is in section 2. If the Lead judges even that too much, deferring a Must-now item is the Lead's recorded decision, not silent.
5. Licence check before ACTIVE (D-4) is not in SA-3 or SA-4. It is our own addition, not a conflict with these two files. Whether SA-2 forbids or already contains it was not read. No founder needed beyond D-4, which already exists.
6. Subscription quantity: `platform_subscription.seats` copy (C §1.1) vs "entitlement comes only from the plan" (SA-3-42, l.639). Minor; fix by dropping the column or defining it as a copy of the plan at sign-up. No founder.

## 5. Term mapping (requirement words to use instead of ours)

| Ours | Requirement word | Where |
|---|---|---|
| `PAST_DUE` | Overdue (subscription); firm shows "payment overdue" | SA-4-11, SA-4 §6 |
| `SUSPENDED` | Payment hold | SA-4-12 ("payment hold replaces the former suspended"), SA-3-19 |
| `PENDING_VERIFICATION` | none in the requirement; keep ours (licence check) | n/a |
| (missing) trialing | Trial | SA-4-11 |
| (missing) cancelled / ended | Ended (subscription); firm goes to Payment hold | SA-4 §6 |
| `CLOSED` | not a billing word; firm deletion is SA-2 | SA-4 §6 |
| seats | staff seats | SA-3-4 |
| customer portal | billing screen (with the processor's secure page for the card) | SA-4-54 |
| grace period | 14 days of Overdue with full access | SA-4-21 |
| `PLAN_LIMIT_REACHED` | `409 PLAN_LIMIT_REACHED` (same code to use) | SA-3-5, SA-3-6 |
| suspended access refusal | `402` payment required | SA-3-19, SA-4-25 |
| sign-up | sign-up link (private) | SA-4-4 |
| plan "active" flag | Active and Public plan | SA-3-2, SA-3-23 |
| support staff (verify) | Support / Billing roles (platform side, SA-7); not read | SA-3 §2 |
| subscription event | `firm.subscription_changed` with old/new status; the requirement calls the stored record a "subscription event" | SA-4-14 |
| owner / admin | Owner / Admin (same); "Billing / Finance" is the firm's third billing role | SA-4-67 |
