# B132 break report: the `sign_step_key_check` migration only (P-278)

Branch `claude/screens-b132-paper-pen` at 656def017 (PR #1278, built on B129 #1275). Scope as the tech lead ruled on #1278: the migration on a fresh copy and on a copy that already holds sign steps, `sign_in_pen` out of order and on a non-PEN item, and the rollback. No UI walk. Copy `brk_b132` on :4443 (`tools/isolated.sh`, TTL 60, stopped at the end: database and files removed). Live AI off, US$0, Sample data only. No tracked file was changed by the runs (`git status` clean).

## Blocker
None.

## Major
**M1. No rollback is recorded for this migration, and the obvious reverse SQL either fails or leaves `sign_step.key` with no check at all.** STANDARDS §5 [M] says "recorded rollback".
- Steps: read `prisma/migrations/20261107150000_b132_sign_in_pen/migration.sql` (4 lines) and the PR #1278 body. Then on the copy, with one `sign_in_pen` row present, run the reverse SQL: (a) in one transaction, and (b) as two plain autocommit statements, which is what someone typing it in by hand would do.
- What happened: neither the migration nor the PR records a rollback. The C81 migration it changes does record one, in its header. (a) The transaction fails with `ERROR: check constraint "sign_step_key_check" of relation "sign_step" is violated by some row`. Nothing changes and the B132 check stays, so this is safe but does not roll back. (b) The DROP commits and the ADD fails. The table is left with **no** `sign_step_key_check` (0 rows in `pg_constraint`), and an insert with key `'bogus'` was **accepted** (returned `bogus`; I restored the B132 check by hand right away). I also ran the old code's rule against the new code: with the old check and the new code, `POST .../sign-steps/sign_in_pen` returns **500** "Something went wrong on the server" (`check_c81_signing_api.ts`, 26/30, run against the old check). So the code has to go back before or together with the SQL.
- What should happen: the migration header (as in 20261102200000_c81_signed_scan) or the PR records the safe rollback, run in one transaction after the previous code is deployed or the app is stopped:
  ```sql
  BEGIN;
  DELETE FROM "sign_step" WHERE "key" = 'sign_in_pen';   -- these rows cannot exist under the old check
  ALTER TABLE "sign_step" DROP CONSTRAINT "sign_step_key_check";
  ALTER TABLE "sign_step" ADD CONSTRAINT "sign_step_key_check" CHECK ("key" IN ('print', 'signed', 'scan_received', 'uploaded_to_ircc'));
  DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261107150000_b132_sign_in_pen';
  COMMIT;
  ```
  It should also say what is lost: the "Signed in pen" marks are deleted, while the audit line "marked IMM … "Signed in pen"" stays in `audit_event`. The PEN items' `print` rows are allowed keys and stay. If they are left current, they are superseded the next time the item's channel changes.
- Evidence: I ran this SQL on the copy. It exited 0, and the old definition was back (`CHECK ((key = ANY (ARRAY['print','signed','scan_received','uploaded_to_ircc'])))`). All 9 other `sign_step` rows were byte-identical before and after (`COPY` diff empty). The audit line was still there (1 row). Then `prisma migrate deploy` re-applied B132 cleanly.
- Do not use `NOT VALID` as a "keep the rows" rollback, and do not use supersede-only. Superseding does not help: the CHECK covers superseded rows too. `ADD CONSTRAINT … NOT VALID` succeeds and keeps the row, and new `sign_in_pen` inserts are refused. But any later UPDATE of a kept row fails (`UPDATE sign_step SET superseded_at = now() WHERE key='sign_in_pen'` → "violates check constraint"). The old code runs exactly that `updateMany` on a channel change or a re-print restart, so those actions would 500 on that item. Is deleting the rows acceptable? Yes for a rollback, because the audit line keeps the fact. That is a founder call under P-188 ("records keep their facts") and should be said in the record.

## Minor
None.

## What held
1. **Fresh copy:** all 61 migrations apply. In the database: `sign_step_key_check | CHECK ((key = ANY (ARRAY['print'::text, 'signed'::text, 'scan_received'::text, 'uploaded_to_ircc'::text, 'sign_in_pen'::text])))`, validated. `_prisma_migrations` has `20261107150000_b132_sign_in_pen` finished (applied_steps_count 1). `sign_step_print_copy_check` is unchanged.
2. **Direct inserts (database only, each in BEGIN … ROLLBACK):** `'bogus'`, `'Sign_in_pen'`, `'sign_in_pen '` (trailing space) and `''` are all refused with "violates check constraint sign_step_key_check". `'sign_in_pen'` is taken. I repeated `'bogus'` after the API runs: still refused.
3. **A copy that already holds sign steps.** Route: on the fresh copy I put the old C81 constraint back by hand (in one transaction). Then I ran `tests/check_c81_signing_api.ts 4443 xr_studio_brk_b132` against the old check. Its sections (1)-(5) created real steps: 7 rows (current print ×2, signed, scan_received; superseded print, signed, scan_received), including a recorded (B129) application. I applied the migration twice:
   - with `psql -1 -f migration.sql`
   - after putting the old check back and deleting the `_prisma_migrations` row, with the real `prisma migrate deploy`. `migrate status` first listed the migration as not yet applied.

   Both times the new check was in place and every existing row was byte-identical (COPY diff empty, same md5 `6eea5245…`).
4. **API on the migrated copy, case A (IMM 5257 moved TYPED_NAME/PDF_UPLOAD → PAPER: PEN, 200):**
   - `sign_in_pen` before print → **409** "Signed in pen comes after "Printed": print IMM 5257 first.", 0 rows.
   - Unknown key `bogus` → **404** in words naming both step sets, 0 rows.
   - `scan_received` on a PEN item → **409** "…signed in pen on Paper: its steps are Printed, Signed in pen. Nothing was recorded."
   - Another firm's staff (user-S) → **404** "No such case."; the client (user-P) → **403** "Only the case officer can do this."; nothing stored either way.
   - After a validated print: four concurrent `sign_in_pen` → one 200, three 409 ("just done … by someone else" / "already done"). Rows: exactly `print,sign_in_pen`.
5. **API, case B:**
   - `sign_in_pen` on HAND_SCANNED IMM 5476 → **409** "IMM 5476 is signed by hand and scanned: its steps are Printed, Signed by hand, Signed scan received, Uploaded to IRCC. Nothing was recorded." This happens both before and after its `print` is done (rows stay `print`).
   - On the TYPED_NAME IMM 5707 → **409** "…not signed by hand and scanned, nor signed in pen on Paper… Nothing was recorded.", 0 rows.
   - IMM 5476 printed while hand-signed, then moved to Paper (200): the old print is superseded, and `sign_in_pen` → **409** "print IMM 5476 first". The hand-signed print does not count for the pen steps.
   - Total `sign_in_pen` rows after all attacks: 1, the legitimate one.
6. **Rollback in a transaction is atomic:** a failing reverse (with `sign_in_pen` rows) leaves the B132 check and the migration row as they were.

Evidence logs (not committed): the scratchpad `run1.log`, `attack.log`, `before.tsv`/`after.tsv`/`after2.tsv`, `pre_down.tsv`/`post_down.tsv`; the copy's API log is `studio/var/isolated-logs/brk_b132-api.log`.
