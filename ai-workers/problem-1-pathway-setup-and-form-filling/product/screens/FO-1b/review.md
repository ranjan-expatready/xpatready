# FO-1b review: booking tables (schema, migration, seed and test only)

Reviewer (did not build it), 14 Nov 2026. Commit **0049ff37**, branch `claude/amazing-newton-ak7r26`, PR #1741. Row: Lead B rows rev 3.1, line 18 "| FO-1b |"; contracts 2026-11-14 §0, §2.2, §7 "§2.2 Booking"; trace t4 §2; AG-4-1, -4/-5/-66, -9, -25/-26/-27, -36/-37/-38, -62, BR-3, C2-C4. There is no screen and no route, so the UI parts of screen-review (walks, 1024 px / 200 %, BIC table) are N/A. Journey test: `journey-test-reviewer-2026-11-14.md` in this folder, **8 / 10**.

**Not reviewed:** while I was reviewing (06:49 UTC), uncommitted edits to `migration.sql` appeared in this shared checkout from another agent. They change the zone pattern, the name and link checks, add finite times and a 24 h limit, key-share-lock the hosts, and add `fo_platform_staff_kept` / `fo_platform_firm_kept`. They are not part of 0049ff37, so this review does not cover them. I re-ran every check below from a `git archive` export of 0049ff37, not from the working tree.

## What I ran (scratch databases `xr_studio_rev_fo1b_*` on 127.0.0.1:54329, all dropped; never :4400)
* From the export: `check_fo1b_booking_schema.ts` **58 passed, 0 failed** (18 s); `check_prisma_schema.ts` **8 passed, 0 failed**. From the checkout (before the edits): `check_pf3_platform_schema.ts` **75/75**.
* My own database: every migration, then `seed-sample-firms.ts`, then `booking-seed.ts` twice (`{"sample-firm":15,"sample-solo":5}`, then 0 and 0). `prisma migrate diff` (database → schema) names only main's 5 known lines and no fo_ object.
* Demo reset: `check_s7_reset.ts` on an isolated copy at :4437 gave **4/4** (96 workspace tables, nothing left). I could not copy `xr_studio_demo`: the environment refused the `pg_dump`, and the brief says never touch it. The check's demo-shaped database (Sample cases, audit line, the Sample firms) is the house convention (A24).
* `tsc -p api/tsconfig.json`: no error in the new files. `graph.mjs --check`: exit 0. Prisma client: `create`, `update` (via `firmId_id`), `createMany` and `include` all work with `Unsupported("tstzrange")?` and `@updatedAt`; the triggers fill `block_range` and `sequence`.
* Concurrency, with two real connections:
  * Token insert racing a cancel, in either order (READ COMMITTED): the cancel voids the token, or the token is refused. Safe.
  * Two reschedules into one slot: the second waits, then fails 23P01.
  * A reschedule overlapping its own old time is accepted.

## Done-when lines: pass and fail, and does removing the rule turn the test red?
Every line has a pass and a fail case (test lines 60-218). I removed each rule in turn, in the export only:
* `RESCHEDULED` taken out of the exclusion's WHERE: 2 tests red (two-connection RESCHEDULED, move onto a booking).
* Gap after dropped from `block_range`: red (the 09:55/10:00 case; the run aborts).
* `(firm_id, slug)` unique dropped: red (duplicate slug, plus both `migrate diff` lines).
* Void-tokens trigger dropped: 2 tests red.
* Also present: empty and demo-shaped copies; overlap allowed once CANCELLED and for two hosts; several live tokens (3 at once); timestamptz and `firm_id` first, each with a probe table as the fail case; `btree_gist` absent before and created by the migration; stamp `20261114120000` > PF-3's `20261114015002` (newest on main).
* The weakest: "several live tokens" has no strict failing twin. Its fail case is a neighbouring property (a duplicate hash), but the pass case would go red under any one-live-token rule.

## Trigger-checked references to platform_firm / platform_staff: acceptable for now
Prisma cannot declare the foreign key without a back-relation field on `platform.prisma`, and a key added only in SQL would show up in `migrate diff`. Writing the key needs a line in another area's file, so the brief reserves it for that file's owner. The insert and update side is covered: every fo_ write checks the same firm and takes `FOR KEY SHARE`, so a concurrent delete waits. The gap is the delete side (m2). No code deletes staff or firms (grep; the contract uses SUSPENDED/DEACTIVATED). The cross-firm case needs a crafted insert reusing a deleted uuid. So I rate it Minor, on two conditions:
1. The PR asks Lead B for the back-relation lines. Schema line 9 says "asked in the PR", but the PR body (still a draft) has no such question yet.
2. The triggers become foreign keys before any row deletes or re-keys staff or firms.

## Findings
### Blocker
None.
### Major
None. The breaker rated B-1 and B-2 Major. I rate both Minor (m1, m2), for the reasons given there.
### Minor
* **m1: under REPEATABLE READ a reschedule misses a token committed while it waited** (breaker B-1). The claim at `migration.sql:319-321` holds only in READ COMMITTED.
  * Run: tx 1 (READ COMMITTED) inserts a token and commits. Tx 2 (REPEATABLE READ, snapshot taken first) reschedules and waits for tx 1. Result: the booking ends 2027-03-02 10:30, while the token is live with `expires_at` 2027-03-01 10:30. An old link survives the reschedule (AG-4-36 rule 3).
  * The repo does use RepeatableRead (`api/src/case-prepare.ts:210`, for reads). Prisma's default is READ COMMITTED, and nothing writes these tables yet.
  * Fix: state in the comment and in FO-3's Done-when that writers of `fo_booking` and `fo_booking_token` use READ COMMITTED (or make the void independent of the snapshot).
* **m2: the delete side of staff and firm references** (`migration.sql:218-245`; breaker B-2).
  * Run: `delete from platform_staff` for user-O, who holds a booking, gives `DELETE 1` and 1 dangling booking.
  * `fo_consultation_type_refs` checks hosts without locking them (`:238-239`), so a concurrent host delete also slips in.
  * Conditions are in the section above.
* **m3: the zone check accepts POSIX strings.** `fo_zone_ok` (`migration.sql:162-168`) returns true for `Foo/Bar+5` and `America/Toronto5`; `Intl.DateTimeFormat` throws RangeError on both. The comment's "as platform.time_zone's schema" (`:160`) is not true: `settings.ts:146` also runs Intl. Impact: every message or invite in the visitor's zone (AG-4-18 rule 3) throws. Fix: refuse a digit or plus outside `Etc/GMT±N`, with a test.
* **m4: the recorded rollback fails as written** (`migration.sql:13-17`; STANDARDS line 34 [M]). `DROP TYPE "FoMeetingMode"` comes before `DROP FUNCTION fo_distinct_modes(...)`, which gives "cannot drop … other objects depend on them". Run outside a transaction, it stops after the tables are gone. Listing the functions first works, and the migration re-applies afterwards (run).
* **m5: one zone per person blocks a zone change** (`migration.sql:189`). `update fo_availability set time_zone='Asia/Kolkata' where staff_id=<user-R>` fails 23P01 against the person's own other windows. AG-4-62 rule 4 says "the person may change it". Fix: `DEFERRABLE INITIALLY DEFERRED`, or write down that FO-3 replaces all windows at once.
* **m6: moves that C2 forbids are accepted** (`migration.sql:276-290, 312`).
  * A host change is accepted without RESCHEDULED and leaves the tokens live (run: SCHEDULED, sequence 1, token live). C2 says a host change makes it RESCHEDULED and replaces the tokens.
  * COMPLETED or NO_SHOW is accepted before the meeting ends, which frees the slot (run; breaker B-6).
  * Treat `staff_id` like the time, or state that FO-3 owns these checks.
* **m7: no limit on a booking's length** (`migration.sql:192`). Run: a 365-day booking is accepted and blocks its host for a year. The breaker found `-infinity…infinity` too (B-3).
* **m8: per-type timings are NOT NULL with defaults** (`front-office-booking.prisma:54-58`). Trace t4 §2 item 2 and AG-4-4 rules 2-3 / C4 ask for nullable fields, where empty means the firm's value. Once the Timings screen exists, every type will look as if it overrode the firm default, and a later migration cannot tell which values were set on purpose. Cheapest to settle now, or record it as the month-one choice.
* **m9: `voided_at` can be set to the future** (run: 2099 accepted, then frozen). A voided token can also be deleted and re-inserted live (breaker B-7). Refuse `voided_at > now()` in `fo_booking_token_write` and refuse deletes.
* **m10: no `version` on `fo_consultation_type`.** AG-4-9 rule 7 and STANDARDS line 27 [M] ask for optimistic saves. Say whether FO-3 uses `updated_at`, or add the column.

### Notes for FO-3 (not defects of this row)
* **Lock order:** take the booking row first, then its tokens. Run: tx A voids a token and then reschedules, while tx B cancels; the result is 40P01 deadlock.
* **409 mapping:** an overlap reaches Prisma as `DriverAdapterError` with `e.code` undefined and `cause.originalCode` "23P01". Map that to 409 `SLOT_TAKEN`.
* **Not checked by the database:** host ∈ the type's hosts and mode ∈ the type's modes (run; breaker B-5).
* **`person_id` / `prospect_id` foreign keys** come with FO-1a (disclosed in the schema header).
* **Meeting link (gap for Lead B):** the row puts it on the type, but trace §2 item 11 and C4 want `meeting_link` on the booking plus a saved link per staff member. The PR follows the row.

## Scope
Four new files only; no other area's file is touched. `booking-seed.ts` is outside the row's Touch list, but "seeded from firm hours" needs it. It is a small, idempotent seed, cross-firm refused, and not wired into start or reset (the same as PF-3's seed). No routes and no screens: no scope creep.

## D1-D20 (schema-only row; simulated)
D1 4 (every Done-when line, all §7 columns) · D2 3 (m2, m3, m6, m7) · D3 5 (Sample timings cited to AG-4-66) · D4 N/A · D5 3 (m1, m4) · D6 N/A (no writes yet; audit is AUD-1/FO-3) · D7 N/A · D8-D14 N/A · D15 5 (check 18 s, gist indexes firm-first) · D16 4 (pass and fail per line; mutations go red) · D17, D20 not walked · D18 5 (AG-04 cited per rule) · D19 N/A.

No Blocker or Major is open at 0049ff37562b73395902d820dd17c4cbebc1d33d. Before the label, the PR body should carry the Lead B back-relation question (m2) and list m1-m10 as fixed or carried to FO-3.

Verdict: Approve (0049ff37562b73395902d820dd17c4cbebc1d33d)

## Round 2: head 84a4f1a1 (diff from 0049ff37 only, P-277)

**Checks run,** from a `git archive` of 84a4f1a1, on scratch databases `xr_studio_rev_fo1b_*` (all dropped):
* `check_fo1b_booking_schema.ts`: **76 passed, 0 failed**.
* `check_prisma_schema.ts`: **8 passed, 0 failed**.
* `check_pf3_platform_schema.ts`: **75 passed, 0 failed**.
* Rebuilt from every migration plus both seeds: `seed-sample-firms.ts` re-run adds 0, and the new `platform_staff` trigger does not fire on its updates.
* The diff also commits review.md (round 1), unchanged from my copy, plus the journey report and the break report.

**My round-1 probes, repeated:**
* **m1 fixed.** I re-ran the same race: a READ COMMITTED token insert, then a REPEATABLE READ reschedule whose snapshot was taken first.
  * Result: the reschedule now fails **40001**, and no live token is left on a moved booking.
  * The token insert's no-op `UPDATE fo_booking SET sequence = sequence` does not touch `sequence` or `updated_at`. It does not fire the void trigger, whose `UPDATE OF` list excludes `sequence`.
  * Both directions are tested with two connections.
* **m2 fixed,** in READ COMMITTED: `fo_platform_staff_kept` and `fo_platform_firm_kept`.
  * Deleting user-R, who has hours, is refused with 23503.
  * A staff member or firm with no fo_ row can still be deleted.
  * The type trigger now key-share-locks the hosts.
  * The Lead B question is posted (PR comment 6873251725).
* **m3 fixed.** `Foo/Bar+5`, `America/Toronto5` and `GMT` are refused. `Etc/GMT+5`, `Etc/GMT-14`, `America/Port-au-Prince`, `Antarctica/DumontDUrville` and `America/Argentina/ComodRivadavia` are accepted. The false comment is gone.
* **m4 fixed.** I ran the header's rollback as written, in order: no fo_ function or trigger is left (the triggers on the platform tables included), and the migration then re-applies cleanly.
* **m5 fixed.** One `UPDATE` moves user-R's 5 windows to Asia/Kolkata and commits. A window in a second zone is still refused at commit.
* **m6 fixed.** Host changes, attendance timing and finished rows:
  * A host change needs RESCHEDULED, and it voids the booking's tokens.
  * COMPLETED and NO_SHOW are refused before the start.
  * Leaving the active set voids tokens.
  * A finished row's mode is fixed.
* **m7 fixed:** booking times must be finite and at most 24 h apart; time off must be finite.
* **m9 fixed:** `voided_at` takes the database clock, and a token is never deleted.
* **Also fixed:** B-5 (the host is one of the type's hosts, the mode one of its modes) and B-10. Each comes with pass and fail tests.
* **Checked:** changing a type's host list leaves its existing bookings working. A token insert and a cancel on a booking whose host was removed from the list both succeed: the host check runs only when the host or type changes.

**New Minors (neither blocks):**
* **m11: the delete guard has the round-1 m1 hole, moved to the platform side.**
  * Run: tx A (READ COMMITTED) inserts an `fo_availability` window for a new staff member X and stays open. Tx B (REPEATABLE READ, snapshot taken first) runs `delete from platform_staff where id = X`, waits for A, then **succeeds**.
  * Result: 1 orphan window. In READ COMMITTED the same delete is refused 23503.
  * A real foreign key would refuse it (RI checks use a cross-check snapshot). So the comment "as ON DELETE RESTRICT answers" (`migration.sql`, above `fo_platform_staff_kept`) holds only in READ COMMITTED.
  * No code deletes staff or firms.
  * Fix: say so in the comment, or retire it with the Lead B foreign keys.
* **m12: the Lead B PR comment is now out of date.** Its "The one gap: deleting a `platform_staff` or `platform_firm` row is not refused" was fixed by the guard triggers. Edit it so Lead B judges the current state.

**Still open, as the PR will explain (Minor, agreed):**
* m8: per-type timings NOT NULL; the question to Lead B goes to FO-3.
* m10: version column with FO-3's edit route.
* B-8: swaps.
* B-9: superuser replica, as PF-3.
* The tzdata-drift case: `US/Pacific-New` passes `settings.ts` `isZone` but fails `fo_zone_ok`. And because every booking update (including the token insert's no-op touch) re-checks the zone, a dropped zone name would block cancels.
* The capitals spelling `America/TORONTO` is still accepted (PF-3 m10 class).
* The notes for FO-3 stand:
  * lock order: booking row, then tokens;
  * map 23P01 to 409.

**Journey score:** with m3, m4, m6, m7 and m9 fixed, "Correct data" and "Error recovery" rise to 1, which gives 7.5 of 8 applicable, **9 / 10**.

No Blocker or Major is open at 84a4f1a11be4d544b3b5b78cc7946435425c3718.

Round 2 verdict (84a4f1a1): Approve.

Verdict: Approve (84a4f1a11be4d544b3b5b78cc7946435425c3718)
