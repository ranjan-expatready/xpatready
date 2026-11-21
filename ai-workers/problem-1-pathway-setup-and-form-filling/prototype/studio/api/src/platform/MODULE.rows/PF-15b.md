Entry points: `entitlements/plan-booking.ts` PlanBookings `book`, `withdraw`, `open`, `applyDue` and the daily job `platform.entitlements.booking_daily` (PF-15 part 1b: a booked plan move, only with no downgrade conflict; during a trial at once with the trial end unchanged, otherwise at the next renewal; while open every limit is the lower of the two plans'; no route: PF-16's change-plan calls it).
Tables: platformSubscriptionChange (one open per firm; stamped by the database; only withdrawn or applied once; never deleted; PF-12's wall).
Tests: tests/check_pf15_booking.ts
