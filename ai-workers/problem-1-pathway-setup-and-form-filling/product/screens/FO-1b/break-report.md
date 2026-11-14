# FO-1b break-it pass (schema): break report

Commit `0049ff375` on branch `claude/amazing-newton-ak7r26` (PR #1741). Target: `prisma/schema/front-office-booking.prisma`, the migration `20261114120000_fo1b_booking_tables`, `api/src/front-office/booking-seed.ts`. There is no screen, so the UI attacks in the brief (keyboard, 1024 px, 200 % zoom, uploads, 100 programs) do not apply.
How I tested: I used my own scratch database `xr_studio_brk_fo1b` on 127.0.0.1:54329 (PostgreSQL 18.3). I applied all 85 migrations in name order with psql `ON_ERROR_STOP=1`, then ran `seed-sample-firms.ts` and `booking-seed.ts`. I attacked with up to 20 psql sessions at once and with tsx scripts that use the real Prisma client and `copyFirmHoursTo`. The database and the scratch folder `var/brk-fo1b` are both deleted. I did not touch :4400 or xr_studio_demo. US$0.
Paths are relative to `prototype/studio/`. "mig:N" means line N of the FO-1b migration.sql. F = sample-firm, S = sample-solo, TY = a type of F with hosts R and O.

## Findings

**B-1 Major: under REPEATABLE READ, a token stays live after a cancel or a reschedule.** The void runs as an `UPDATE` inside the AFTER trigger (mig:310-317). That UPDATE reads tokens with the cancelling transaction's snapshot. The token insert's `FOR SHARE` lock (mig:326) does make the cancel wait, but once the cancel goes ahead it cannot see the token that has just committed.
Repro: tx 1 runs `begin; insert into fo_booking_token(…booking B, expires_at = B.ends_at…); select pg_sleep(2); commit;`. Tx 2 starts 0.5 s later with `begin isolation level repeatable read; select count(*) from fo_booking_token; update fo_booking set status='CANCELLED' where id=B; commit;`. Tx 2 waits for tx 1, then succeeds.
- Result: B is `CANCELLED` with a token where `voided_at IS NULL`.
- The same happens when tx 2 runs SERIALIZABLE and tx 1 runs READ COMMITTED.
- With both on REPEATABLE READ and a reschedule instead (`status='RESCHEDULED', starts_at+1h, ends_at+1h`), the booking ends 11:30 and the token is live with `expires_at` 10:30, the old end time.
- Only READ COMMITTED for both, or SERIALIZABLE for both, is safe. In the second case the reschedule fails 40001.
Should: "voided on cancel and on reschedule" must hold whatever isolation level FO-3 picks. Either the token insert refuses when it is not the latest writer on the booking, or the rule is written down: these tables must be written in READ COMMITTED.

**B-2 Major: deleting or re-keying a staff member or a firm leaves fo_ rows pointing at nothing, or at another firm.** Staff and firm links are only checked by INSERT/UPDATE triggers (mig:218-245). There is no foreign key, and nothing guards the DELETE side.
Repro: insert a staff member X in F with no role grant. Add X to `TY.host_staff_ids`, give X a window in `fo_availability` and a booking. Then `delete from platform_staff where id=X` → `DELETE 1`. The result is 1 orphan booking, 1 orphan window, and X still listed in TY's hosts. A later `update fo_booking set mode='PHONE'` on that booking passes, because the staff trigger fires only `OF firm_id, staff_id`.
Then `insert into platform_staff(id=X, firm_id=S, …)`:
- F's booking now names S's staff member (`booking_firm F, staff_firm S`).
- F's type TY now lists a host from S.
Also accepted:
- A firm with no staff, holding only a type with empty hosts, can be deleted (`delete from platform_firm` → orphan type).
- That firm's id can be changed (`update platform_firm set id=…` → orphan type). `platform_firm.id` cascades to the platform tables but not to fo_ tables.
Should: "every row belongs to one firm and can never point at another firm's staff". Deleting staff or a firm that fo_ rows still name should be refused, as the composite foreign keys on `platform_role_grant` already do.

**B-3 Minor: a booking can run forever.** Accepted:
- `starts_at='-infinity', ends_at='infinity'`, giving `block_range [-infinity,infinity)`. Host O was then blocked for every other time: my next booking for O failed 23P01 against it.
- A token for that booking with `expires_at='infinity'`, which never expires (AG-4-36).
- A ten-year booking `2027-01-01 → 2037-01-01` for host R, which also works through Prisma.
Nothing ties `ends_at − starts_at` to the type's `minutes` (5-480) or puts a cap on it. Should: refuse infinite times, and limit a booking's length.

**B-4 Minor: the zone check lets POSIX zone strings through, and the database and the app disagree.** `fo_zone_ok` (mig:162-168) relies on `now() AT TIME ZONE z`. PostgreSQL reads any unknown `Name/Name<digits>` as a POSIX rule, so these all return true:
- `America/Toronto5` (fixed UTC−5 with no DST, which is an hour wrong all summer);
- `Foo/Bar5`, `Mars/Olympus+3`, `Abc/Def-14`, `Zzz/Zzz9Zzz`.
`fo_booking` accepted `visitor_time_zone='America/Toronto5'`. The app's `isZone` (settings.ts:146) refuses all of them.
The reverse also happens: `US/Pacific-New` passes `isZone` (ICU 78 still has it) but fails `fo_zone_ok`. With that stored as S's `platform.time_zone`, `copyFirmHoursTo` and the whole `booking-seed.ts` run throw `"US/Pacific-New" is not an IANA time zone`.
The zone is also checked again on every booking UPDATE (mig:267). A server tzdata update that drops a name would therefore block even a cancel of an existing booking.

**B-5 Minor: a booking does not have to fit its type.** Accepted: `fo_booking(type TY, staff T, mode 'PHONE')`. T is not in TY's `host_staff_ids` and PHONE is not in TY's `modes` (`{VIDEO}`). A type with `host_staff_ids '{}'` (`nohosts`) is accepted too. Should: either the database checks host ∈ hosts and mode ∈ modes, or the schema comment says FO-3 owns these checks.

**B-6 Minor: some status moves should be refused.**
- `SCHEDULED → COMPLETED` (and `NO_SHOW`) is accepted for a meeting months in the future. It frees the slot at once and leaves its tokens live (count 1 after the move). AG-4-39 asks about attendance after the end.
- `mode` can still change on a `NO_SHOW` row (`sequence` 3 → 4). Nothing stops `mode` or `visitor_time_zone` changing on a `CANCELLED` row either, though "CANCELLED is final".
- `SCHEDULED → RESCHEDULED` with no time change bumps `sequence` but voids no token. That is defensible, but it is not written down.

**B-7 Minor: token edge cases.**
- `update fo_booking_token set voided_at='2099-01-01'` is accepted and can never be changed again. The void on a later reschedule skips that token (`voided_at IS NULL`, mig:313), so a reader that tests `voided_at > now()` treats it as live until 2099.
- A voided token can be deleted and inserted again live with the same `id` and `token_hash`, because the trigger guards UPDATE only (mig:339-343).

**B-8 Minor: two bookings cannot trade places in one statement.** The exclusion constraint is not deferrable (mig:197). `update … set starts_at = case id …` to swap A 14:00 and B 15:00 of host T fails 23P01, and so does swapping the hosts of two overlapping bookings (T ↔ O). The only way is through a third, temporary time, which bumps `sequence` twice and voids the tokens.

**B-9 Minor: the app role can switch every trigger off** (as in PF-3 B-9). `xr_studio` is a superuser. Inside `set local session_replication_role=replica`:
- `block_range` was set to a year-2000 range, `sequence=0` was written, and `status` moved back to SCHEDULED;
- a booking with a staff member from S and the zone `Foo` was inserted.
The exclusion constraint itself still ran.

**B-10 Minor: text and range gaps.**
- `name` accepts a tab, newline and non-breaking space only (`btrim` strips spaces, mig:176).
- `meeting_link` accepts `https://evil.example/"><script>` (mig:184).
- `fo_time_off` accepts `-infinity → infinity` and `created_by ''`.

## What held
- Overlap: 20 parallel inserts for one slot of one host gave 1 row and 19 × 23P01. With two sessions, the second waits and then fails. A 14:35 start after a 14:00-14:30 booking with a 10-minute gap after is refused. Concurrent reschedules into a slot being vacated wait and then succeed. An overlap through Prisma `create` is refused. A CANCELLED row leaves the rule, and a different host may overlap.
- Moves: changing `staff_id` or `type_id` into a clash is refused. The cross-firm checks all hold: a type from S on an F booking, a staff member from S on an F booking or time off, a host from S on an F type, a token from S on an F booking, and a window moved to S's staff. Changing `firm_id` on a booking, type or token is refused.
- `block_range` and `sequence` written by the app are replaced. `sequence=NULL` is ignored. NO_SHOW → SCHEDULED and NO_SHOW → CANCELLED are refused. The DST night (01:30 EDT → 01:30 EST) gives a correct 60-minute range. A type's gap change leaves existing ranges as they were (AG-4-4 rule 8).
- Tokens: several are live per booking. A token with the old end time on a RESCHEDULED booking is refused. In READ COMMITTED, cancel and reschedule both void every live token, even when racing a token insert. The same hash in another firm is allowed. After `voided_at` is set, any other change is refused.
- Slugs: `Free` and `free ` are refused by the format check. A duplicate is refused in SQL and through Prisma (P2002). `firm_id` leads every non-primary index, including the gist ones. Every time column is `timestamptz`.
- `prisma migrate diff` (database → schema) shows no fo_ lines. The Prisma client can create, update, upsert, createMany and createManyAndReturn an FoBooking with the `Unsupported("tstzrange")?` column, and the triggers fill the range and `sequence`.
- Seed: the second run adds 0. Six parallel `copyFirmHoursTo` calls for two new people added exactly 10 windows. A cross-firm name is refused with nothing written. A second zone for one person is refused (`fo_availability_one_zone`).
