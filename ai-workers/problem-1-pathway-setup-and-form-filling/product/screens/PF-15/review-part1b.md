# Review: PF-15 part 1b, a booked plan move (PR #2763)

Reviewer: independent Opus 5.5 (effort medium), 21 Nov. Commit reviewed: `c10a1b98f79a4cefca823cac11f2099b5a0dbfa7`, against merge base `19fdf28d7`. This is an API-and-schema row with no screen, so this is a code and migration review. Screen checks (D1-D20, BIC, 1024 px, keyboard) and the journey test: **N/A, no screen** (journey score: none given). S = `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio`.

Evidence: I read the full diff (576 lines, under 800). `tests/check_pf15_booking.ts` gave **30 passed, 0 failed**. I also built a scratch database from all the migrations (since dropped) and ran these probes as `xr_studio` and as `xr_app` with `app.firm_id` set:
- the limit function with Unlimited and missing rows on both sides;
- a resubscription after an ENDED subscription;
- a firm session forging a booking and applying it.

## Findings

### Blocker
None.

### Major

**M1. The suite `check_pf12b_bypass_audit.ts` fails at this commit.**
- Where: `S/api/src/platform/firm-scope.ts:124` adds a `per-firm` bypass entry. The test still has the old list at `S/tests/check_pf12b_bypass_audit.ts:74-77` (as committed in c10a1b98f).
- What fails: that test compares the sorted per-firm uses to a fixed list of **eight** names with `JSON.stringify` equality. At this commit there are nine, because `job:platform.entitlements.booking_daily` is new. So the check "PF-12b DW3 pass: the eight cross-firm uses audit per firm" fails, and CI cannot go green.
- A fix exists, but only uncommitted: the working tree of this checkout has the matching three-line edit to that test (add the name, say "nine"), and it is not in the reviewed commit.
- Fix: commit that edit in this PR (it then touches that test file, so list it). Paste that suite's result line in the PR, as the brief's "before asking for the label" rule requires.

**M2. A case opened at the same moment can make a booking go through with a case conflict (SA-3-58 / SA-4-76: "MUST NOT be booked while ... any limit the firm is over").**
- Where: `S/api/src/platform/entitlements/plan-booking.ts:58` takes only the firm row lock (`platform_firm ... for no key update`). This is the lock staff changes use, so seats are safe. `Runtime.createCase` serialises on a different lock, `pg_advisory_xact_lock(hashtext('case-open:'||key))` (`S/api/src/runtime.ts:342`). It never takes the firm row.
- Failing scenario: the firm has 2 active individual cases and the target plan allows 2.
  1. T1 `book()` locks the firm row. `checkDowngrade` (line 62) counts 2: no conflict.
  2. T2 `createCase` takes the case-open lock. Its limit read does not see T1's uncommitted booking, so it checks against the current plan (say 10). It is allowed, creates case 3 and commits.
  3. T1 inserts the booking and commits.

  Result: a booking is open with 3 cases on a 2-case plan. The brief's breaker list names this race shape ("a downgrade booked twice at once", "the last seat in parallel"). Only seats and a double booking are covered.
- Storage has the same window, because uploads take no firm lock. Storage is a warn metric, so that part is Minor.
- Fix: in `book()`, before `checkDowngrade`, also take `SELECT pg_advisory_xact_lock(hashtext('case-open:' || key))` with the firm's key (`firm.key` is already read at line 58). Then a case opening and a booking serialise. Add a test that holds the case-open lock in a second connection and shows the booking waits, then re-counts and refuses.

### Minor

**m1. After a resubscription, an open booking from an ENDED subscription still lowers the limits and can never apply.**
- Where: `S/prisma/migrations/20261121130000_pf15b_plan_booking/migration.sql:150`. The `booked` CTE matches only `from_plan_id = base.plan_id`. It does not check that `b.subscription_id` is the live subscription.
- Probe: book `unl` → `low` on subscription S1. End S1, then make a new live S2 on `unl`. The limit function still returns `low`'s 4 cases. `applied_at` is then refused by the `kept` trigger (line 100: `id = NEW.subscription_id` is ENDED). So the daily job logs `booking_daily_failed` every day, and the firm cannot book again until someone withdraws it.
- The "stale booking" test shows the same daily refusal and does not check the job's `failed` count.
- Fix: add `AND b.subscription_id = <live subscription id>` in the CTE (carry `s.id` into `cur`/`base`). Have `applyDue` either skip or withdraw a booking whose subscription is no longer live. Rare today (only sign-up creates a subscription), so Minor.

**m2. The table, trigger and `book()` accept a higher target. The daily job would then apply an upgrade at renewal with no charge.**
- Where: `migration.sql:65-67`, `plan-booking.ts:55`. The test relies on this: it books `CODE_A` (larger) on an ACTIVE firm and the job applies it (`check_pf15_booking.ts`, the "walls" daily case).
- Why it matters: SA4-D28(a) says an upgrade "costs more and applies at once". Nothing reaches this on `main` (no route), but PF-16 could misuse the API.
- Fix: refuse a non-trial booking whose target is not lower on the ladder (`monthly_price_cents`, SA-3 §3.10), or document in the class comment that only a lower plan is booked after a trial and that PF-16 owns upgrades.

**m3. Disclosed item (2) understates what a firm session can do.**
- Probe, as `xr_app` with `app.firm_id` set:
  1. INSERT a booking to the largest plan (`booked_by 'staff:forged'`).
  2. UPDATE `applied_at = 'infinity'`.

  The subscription moved to the larger plan at once, and the record holds `applied_at = infinity`, which the CHECK at line 53 allows.
- So this is a free upgrade, not "self-harm only". It is **not new exposure**: the same session can already `UPDATE platform_subscription SET plan_id = …` directly. I confirmed that `xr_app` holds UPDATE on that table and only the firm policy guards it. No change is required for this PR.
- Correct the PR's wording. Consider `applied_at <= booked_at + interval '10 years'` or `isfinite(applied_at)` so the record cannot hold infinity. The real gap (the plan column is writable by the firm role) is PF-16/PF-12 territory.

**m4. Audit before/after shapes do not mirror each other.**
- Where: `plan-booking.ts:94`.
- A booking writes `after: { plan, bookedPlan, effectiveAt }` (line 78), but the withdrawal writes `before: { bookedPlan }`, `after: { bookedPlan: null }`. Someone diffing the two lines cannot see that `effectiveAt` was cleared or which plan stayed.
- Fix: make the withdrawal `before: { plan: from, bookedPlan: to, effectiveAt }` and `after: { plan: from, bookedPlan: null, effectiveAt: null }`.
- The other lines are flat and correct: booking, the trial at-once switch `{plan: from} → {plan: to}`, and the apply.

**m5. Gaps in the SQL tests.**
- Two combinations are untested:
  - the current plan Unlimited with a finite target (`a NULL, b finite → b`; the probe gave the right answer);
  - a SEATS limit with a pending part-2 lowering (`kept`) combined with a booking.
- If a later edit swapped the `CASE` order, nothing would catch it. Add one assertion for each.

## Checks that pass
- **SQL null/Unlimited/no-row** (probe): `null` with `4` gives 4. No row on both sides gives 0. No row (0) with Unlimited gives 0. `has_row` is forced true while booked, so `limits.ts` uses the computed value. Seats come from `seats_limit` (NOT NULL), so `least()` never meets NULL there. With no live plan, the `booked` CTE joins on a NULL `plan_id` and is empty. `limits.ts` returns 0 and refuses.
- **Triggers**: the database stamps the insert (time, subscription, from plan, effective date; `withdrawn_at` and `applied_at` forced). The live subscription is locked `FOR UPDATE`. `0_pf12_firm_first` runs before the definer trigger, so a cross-firm insert is refused before the subscription is touched. The rows are kept: no delete, no truncate, set once, never both. The apply needs the subscription to still be on `from_plan`.
- **Races**:
  - Two bookings at once: the partial unique index plus the firm lock (tested).
  - Apply against withdraw: both take the firm lock, and the UPDATE re-checks its WHERE.
  - Double apply: refused by both the WHERE and the trigger (tested on consecutive days).
- **PF-12 walls**: forced RLS and a policy on the table (tested). The bypass entry follows the storage job's pattern (`routes: []`, `outside`, `per-firm`, `asBypass` then `touchEachFirm` then `withFirm` per firm), with its `platform.bypass` line tested.
- **Done when**:
  - DW3 booking: refused with the seat conflict and SA-4-56's words, and with a case conflict; booked without one.
  - DW4 (real invite route): refused while booked; allowed after withdrawal.
  - DW5: trial at once with `trialEndsAt` unchanged; after a trial, nothing before the renewal, applied once by the job after it, nothing on a later run.

  Each line has a pass and a fail that fails when its rule is removed (the `booked` CTE, the TRIAL branch, the WHERE on `effective_at`).
- **Renewal fallback** (disclosed, Unconfirmed) is computed in UTC and is monotonic. Known and accepted as disclosed: (1) no outbox row (#1959), (3) the monthly fallback.

## Could not check
Other suites (another job is running them). Whether PF-16's route will call `book()` only for lower plans.

Fix list: M1 (commit the PF-12b test edit), M2 (take the case-open lock in `book()` plus a test).

Verdict: Changes requested

## Round 2 (re-review of `d1a915ce90ab4228cc73000c2f1f848d0009fe15`)

**Verdict: Approve. M1 and M2 are fixed, every Minor is fixed, and no new Blocker or Major was found.**

**What I checked**
- Scope: only `git diff c10a1b98f d1a915ce9 -- …/prototype` (135 added, 28 removed; total PR still under 800) and `break-report-part1b.md`.
- On the checkout at d1a915ce9, `check_pf15_booking.ts` gives **42 passed, 0 failed**.

**Round 1 findings**
- **M1 is closed.** Commit 3a3492094 adds `job:platform.entitlements.booking_daily` to PF-12b's per-firm list (`tests/check_pf12b_bypass_audit.ts:74-77`, now "nine"). I did not run that suite because another job is running suites. The list now matches `BYPASS_USES`.
- **M2 is closed** (also breaker B2).
  - The fix: `plan-booking.ts:62` takes `case-open:<key>` after the firm row.
  - No deadlock: no other holder of `case-open` (`runtime.ts:342` createCase, `case-clients/prospect-won.ts:83`) takes the firm row afterwards. Their FK inserts take only KEY SHARE, which does not conflict with `FOR NO KEY UPDATE`.
  - The new test holds the lock from a second connection. It shows the booking waits, then counts the third case and is refused 409, with nothing booked. The test would fail if the lock were removed.
- **m1 is closed** (also B3).
  - The `booked` CTE now needs `b.subscription_id = base.sub_id` (`migration.sql:174`).
  - `applyDue` withdraws a due booking whose subscription ended, moved off `from_plan`, or whose target is inactive. It writes a `STALE` line with the same audit shape.
  - Tests cover the plan moved another way, a resubscription, and a switched-off target.
- **m2 is closed** (also B1).
  - Outside a running trial, the insert trigger refuses a raise (`migration.sql:81-96`). A raise is any of:
    - a dearer price where both plans have one;
    - more seats;
    - any metric where today's limit is finite (no row = 0) and the target's is higher or Unlimited.
  - I checked the NULL logic: `c_eff IS NOT NULL AND (t_eff IS NULL OR t_eff > c_eff)` is correct.
  - It compares plan rows, not the firm's part-2 kept values, so it errs towards refusing, which is acceptable.
  - The B1 test runs with no prices set and refuses the move by seats or limits.
  - With this, an early `applied_at` by a firm session can only move the firm onto a plan that is no larger on any metric. That is self-harm only. The wider gap, that `xr_app` can write `platform_subscription.plan_id` directly, is not new.
  - The apply trigger now also needs the target to be active (breaker m2).
- **m3 is closed.** The CHECK needs finite dates, and there is a test for it. The kept trigger stamps `withdrawn_at` with the database clock (breaker m4).
- **m4 is closed.** Every before/after uses `{plan, bookedPlan, effectiveAt}`: booking, trial switch, withdrawal, STALE withdrawal and apply.
- **m5 is closed.** There are tests for Unlimited now with a finite target (gives 4), and for seats with a pending part-2 lowering plus a booking (gives `least(kept, target)`). Each has a matching withdrawn case.
- **Breaker m3 is closed.** A `TRIAL` whose `trial_ends_at` has passed now books for the renewal (tested).

**Left for the Lead (not blocking this review)**
- **B4 and the outbox row** (brief line 32): disclosed. PF-16 updates Stripe before calling `book`, and `ports/events.ts` belongs to #1959. The Lead should record this as a PF-16/#1959 follow-up so the trial switch gets its outbox row when the event name lands.
- **Breaker m5 (OVERDUE):** there is no SA-4 rule either way.
- **Breaker m4 (`booked_by` forgeable, `seed:` allowed by the CHECK):** a firm session only, and every audit line comes from the service. Not new exposure.

### Round 2 Minor (no fix required to approve)
- **r1. A booking left by an ended subscription stays open until its `effective_at`.** `plan-booking.ts:60` with the `applyDue` stale path at `:113-118`. During that time it lowers nothing (the CTE ignores it). But a new booking on the new subscription gets 409 PLAN_CHANGE_BOOKED until the firm withdraws it or the date passes.
  - Scenario: book for a renewal 20 days away, the subscription ends on day 2, the firm resubscribes. A new `book()` is refused for 18 days unless the Owner withdraws first.
  - Suggestion: in `book()`, treat an open row whose `subscription_id` is not the live one as stale, and withdraw it with the STALE line before the `had` check.
- **r2. A firm on PAYMENT_HOLD at its renewal is counted as a failure every day.** `applyDue` falls through to the apply, the kept trigger raises, and `daily()` logs `booking_daily_failed` and counts `failed` each day until the hold clears. The docstring says this is intended. If that is meant, a quiet skip (`status = 'PAYMENT_HOLD'` → `{ applied: false }`) would keep the failure log for real failures.

Verdict: Approve d1a915ce90ab4228cc73000c2f1f848d0009fe15
