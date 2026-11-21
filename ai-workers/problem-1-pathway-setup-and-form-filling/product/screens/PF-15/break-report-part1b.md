# Break report: PF-15 part 1b, a booked plan move (PR #2763)

Breaker: Opus 5.5, 21 Nov. Target: **c10a1b98f** (diff from 19fdf28d7). No screen or route, so the attacks hit the database and `PlanBookings`. S = `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio`.
How I tested: I extracted c10a1b98f with `git archive`. The shared checkout moved to 3a3492094 and then 3e263c99e while I worked, so the tree was not used. I built scratch database `xr_break_pf15b_scratch` on :54329 from all of c10's migrations and seeded it with `seedSampleFirms`. The tsx harness ran `PlanBookings` against it with direct and `withFirm` scopes and a movable clock. I also ran psql as `xr_app` with `app.firm_id` set, plus second psql sessions holding locks. The database is now dropped. Sample firm `sample-firm` (call it FA) starts on `team`, 3 staff, ACTIVE; `solo`'s seats were raised to 3 so a downgrade can book.
No test touched :4400 or the demo database. Cost: US$0.

## Blocker
None.

## Major
**B1. A booked raise gets a higher plan without paying for it, early or at renewal. The PR's Q2 ("this only hurts the firm itself") is wrong.**
Nothing limits a booking to a lower plan: not the trigger (`migration.sql:65-70`), the CHECK (`:51-54`) or `book()` (`plan-booking.ts:55-62`). The CHECK allows any `applied_at >= effective_at`, set at any moment, so the firm's own session can apply a raise a month early.
```sql
begin; set local role xr_app; select set_config('app.firm_id','<FA>',true);
insert into platform_subscription_change (id,firm_id,subscription_id,from_plan_id,to_plan_id,booked_by,booked_at,effective_at)
  values (gen_random_uuid(),'<FA>',gen_random_uuid(),gen_random_uuid(),(select id from platform_plan where code='firm'),'staff:x',now(),now());
update platform_subscription_change set applied_at = effective_at where firm_id='<FA>' and applied_at is null;
```
- Observed: the subscription moved `team` (5 seats) → `firm` (20 seats, storage 102400) at once, on 21 Nov. The record says applied 2026-12-21.
- Through the service: `book(FA,'firm')` on an ACTIVE firm was accepted (`effectiveAt` 2026-12-01). `applyDue` 11 days later gave `{applied:true,toPlan:'firm'}`, with no Stripe call or charge.
- Context: the same session can already `UPDATE platform_subscription SET plan_id` directly (`xr_data` has UPDATE; only `pf12_firm` guards it; checked). So this adds no new DB exposure, but the table does not keep its own rule.
- Not run against 3e263c99e, only read: its raise check compares `monthly_price_cents`. All three Sample plans have NULL there, so the check never fires, and early apply (`applied_at = effective_at`) is unchanged.

**B2. A case opened at the same moment slips past the booking's check (SA-3-58).**
`book()` locks only the firm row (`plan-booking.ts:58`). Case opening serialises on `pg_advisory_xact_lock(hashtext('case-open:<key>'))` (`runtime.ts:342`).
- Repro: session 1 runs `begin; select pg_advisory_xact_lock(hashtext('case-open:sample-firm')); select pg_sleep(4); commit;`. While it holds that lock, `book(FA,'solo')` returned **booked in 24 ms** (a warm book takes 37 ms), so the booking does not wait for a case opening. If that opening commits a case after the booking's count, the firm is booked onto a plan it is already over.
- Same finding as the review's M2. Commit 3e263c99e adds this lock (read, not run).
- Storage has the same window, because uploads take neither lock.

**B3. After a resubscription, a dead booking still lowers the new subscription's limits, blocks a new booking and fails every day.**
The `booked` CTE (`migration.sql:148-152`) matches on firm and `from_plan_id`, never on `subscription_id`.
- Repro: `book(FA,'solo')`; then `update platform_subscription set status='ENDED' …`; then insert a new ACTIVE `team` subscription.
- Observed: limits read seats 3 and storage 5120 (`solo`'s), not `team`'s 5 and 25600. A new `book(FA,'firm')` → 409 PLAN_CHANGE_BOOKED. `daily()` → `{applied:0,failed:1}` with `booking_daily_failed` on each later day, too (the apply is refused because the subscription it names is ENDED).
- This is the brief's breaker case ("a booking still lowering a limit") in another form. It is rare today (only sign-up creates a subscription).
- Review m1 found the same. Commit 3e263c99e adds `b.subscription_id = base.sub_id` and withdraws stale bookings (read, not run).

**B4. A trial switch to a higher plan leaves no record that billing must follow (disclosed as the PR's Q1; this is the money consequence).**
- Repro: set FA to `TRIAL` (`trial_ends_at` in 3 days), then `book(FA,'firm')` → `atOnce:true`, plan `firm`. Then end the trial by hand (`status='ACTIVE'`; nothing on main ends a trial).
- Observed: plan `firm`, 20 seats. There is no outbox row and no event: `ports/events.ts` has no plan name, and `msg_outbox` is the only outbox table. Stripe's trial Checkout was started with the sign-up plan's price (`firms/signup.ts:218-227`).
- So unless PF-16 changes Stripe first, every time, the firm converts paying `team` with `firm`'s limits, and nothing would ever detect it.
- The brief requires "outbox row last when a booking changes the subscription" (PF-15.md line 32). The lead should rule on Q1 knowing this.

## Minor
- **m1. A forged apply corrupts `platform_subscription`.** As `xr_app`, insert a booking as in B1, then run `update … set applied_at='infinity'`. Observed: plan `firm`, `platform_subscription.updated_at = infinity`, `booking.applied_at = infinity` (`migration.sql:53`, `:99`). 3e263c99e adds `isfinite` (read, not run). A finite future `applied_at` is still accepted and still written to `updated_at`.
- **m2. A booking applies to a plan deactivated after it was booked.** `book(FA,'solo')`, then `update platform_plan set active=false where code='solo'`, then `applyDue` → `{applied:true,toPlan:'solo'}`. The firm is now on an inactive plan. Only the insert checks `active` (`:65`); the apply does not (`:98-100`).
- **m3. TRIAL status is trusted even after the trial has ended.** With `status='TRIAL'` and `trial_ends_at = now()-20 days`, `book(FA,'firm')` → `atOnce:true`, plan `firm`, nothing charged (`:70`). Sign-up creates TRIAL with no `trial_ends_at` (`signup.ts:207`) and nothing on main ends a trial, so every firm signed up stays able to switch for free, upward too.
- **m4. The firm's session forges `booked_by`.** The insert in m1 kept `booked_by = 'seed:sample'`; `'system:platform.entitlements'` is kept too. The CHECK allows `seed:` (`:54`), which the service never writes (`Actor`, `plan-booking.ts:35`). `withdrawn_at` can likewise be backdated to `booked_at`. Every audit line is otherwise intact.
- **m5. OVERDUE is not treated like a payment hold.** An OVERDUE firm books a raise and the job applies it: `{applied:true}`, plan `firm OVERDUE`. Only PAYMENT_HOLD is refused (`:64`, `:99`). I found no SA-4 rule either way; recorded for PF-16.

## What held
- **Two bookings at once (brief):** three parallel `book()` calls, 10 rounds → always 1 booked and 2 × 409 PLAN_CHANGE_BOOKED, with one open row.
- **Last seat in parallel (brief):** a psql session held the firm row `for no key update`, inserted an invitation, slept 1.5 s and committed. `book(FA,'solo')` waited 1258 ms, then gave 409 DOWNGRADE_CONFLICTS ("You have 4 staff; Solo allows 3"). Reverse order: an invite read queued behind an open booking saw seats 3, not 5.
- **A withdrawn booking (brief)** lowers nothing: seats 5 and storage 25600 again.
- **Apply racing withdraw**, 10 rounds: always applied with withdraw → 404, or the reverse; never both, never a plan moved after a withdraw.
- **Insert forgery:** forged `subscription_id` (firm B's), `from_plan_id`, `booked_at`/`effective_at`/`applied_at` = 2020 and `withdrawn_at` were all overwritten. The stored row had FA's subscription, `team`, the database clock and the renewal date.
- **Walls:** a session with no firm → 42501; firm B sees 0 of FA's rows and updates 0; FA cannot move its row to B (42501); DELETE → permission denied; changing `to_plan_id` → refused by `_kept`; `xr_case_lookup` has no rights on the table.
- **Target limits:** a NULL row → the current plan's 150 (Unlimited treated as no lower); a missing row → 0 with `has_row` true; seats `least(5,2)=2` (never NULL).
- **Refusals:** an inactive or unknown target at booking → 404; PAYMENT_HOLD → 409.
- **Trial:** two switches at once serialise (team>solo, then solo>firm), both rows and lines kept, the trial end unchanged.
- **A booked raise while open:** the limit is the current plan's (min), so nothing is raised before apply.

Not tested: storage upload racing a booking (reasoned from the locks only); 3e263c99e's fixes (read, not run).
