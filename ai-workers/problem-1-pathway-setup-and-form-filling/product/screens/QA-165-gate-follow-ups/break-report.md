# QA-165 break report: migration `20261108040000_qa165_fields_left_empty` (P-278 short pass)

PR #1318, head 66ed210901a557b26df9f5b00a39a42127588c12, branch claude/focused-dijkstra-ndvqjn. The breaker did not build it.
Scope: only the schema migration and its rollback note, plus the one API path that writes it
(POST /api/runtime/filings/:id/warnings/fields_left_empty/pass). Run on 8 Nov on an isolated copy `brk165` on :4457
(database xr_studio_brk165), with live AI off and US$0 spent. The copy was stopped after and its database dropped.

## Findings

| # | Severity | What I did | Expected | Actual | Where |
|---|---|---|---|---|---|
| M1 | Major (merge order) | Checked the open branches for migrations stamped after main's newest, 20261108030000. Found `origin/claude/runtime-b162-copy-before-ready` with `20261108041500_b162_no_copy` (commit abf127ede). It also drops and re-adds both `readiness_pass` checks, starting from the 030000 lists, and adds `no_copy` but not `fields_left_empty`. On my copy, after this migration: (a) with a `fields_left_empty` pass row present I ran b162's SQL; (b) with no such row I ran b162's SQL and then inserted a critical `fields_left_empty` row | Whichever of the two merges second carries both codes | (a) b162 refused: `check constraint "readiness_pass_known_code_check" ... is violated by some row`. Deploy stops, so the copy does not start. (b) b162 applies, then the `fields_left_empty` pass is refused by the known-code check. Through the API that pass would fail on the database even though the engine still raises the CRITICAL line. The reverse order loses `no_copy` the same way. If b162 merges first, this file's older stamp (040000 < 041500) runs after b162 on databases that already exist but before it on fresh ones (reasoned from Prisma's pending-migration order, not run). The two lists then differ by database. No test compares the database lists with `WARN_CODES`/`CRITICAL_CODES` (`tests/check_c76_readiness.ts:244` checks the engine only), so CI will not catch the drift. Git will flag the `CriticalCode` line in `engine/runtime/readiness.ts:40,43` as a text conflict, but the two migration folders do not conflict | `prisma/migrations/20261108040000_qa165_fields_left_empty/migration.sql:11,13`; `origin/claude/runtime-b162-copy-before-ready:.../20261108041500_b162_no_copy/migration.sql:9-12` |
| m1 | Minor | Read the rollback note against the running API | The note says what else must go back with the checks | The note covers the database only. If the old checks are restored while this engine still runs, the engine keeps raising "Mandatory form fields left empty" as a CRITICAL line, and passing it fails on the database check instead of saying why. The note could say "with the engine change reverted" | `migration.sql:6-9` |

No Blockers.

## Attempts and what held

1. **The lists match the engine exactly (held).** The new known-code list has 15 codes: the 14 from `20261108030000_c77_hand_write:10` plus `fields_left_empty`. That equals `WARN_CODES` (`engine/runtime/readiness.ts:44`) as a set. The new CRITICAL list has 8 codes: the 7 from `20261104120000_c76_readiness:60` plus `fields_left_empty`. That equals `CRITICAL_CODES` (`readiness.ts:43`). Nothing was dropped from either earlier list. On the copy, `pg_get_constraintdef` shows the same lists.
2. **Fresh apply (held).** `isolated.sh brk165 4457 start` applied every migration. `_prisma_migrations` lists 20261108040000 as finished, with no rollback.
3. **Apply over old rows (held).** On my copy I put the two checks back as they were at 030000 and inserted 14 pass rows, one for each older code with its right severity (foreign keys skipped through `session_replication_role = replica`; checks still enforced). Before the migration, a critical `fields_left_empty` row was refused by the known-code check. Then I removed 20261108040000 from `_prisma_migrations` and ran the real `npx prisma migrate deploy`: "All migrations have been successfully applied". All 14 rows and all 14 codes were kept. The same result came from replaying the file with `\i` inside a transaction.
4. **What the checks refuse and accept, in SQL (held).**
   - `fields_left_empty` with severity warning: refused by `severity_matches_check`.
   - `fields_left_empty` with severity critical: accepted.
   - `no_such_code`, as critical and as warning: refused by `known_code_check`.
   - `Fields_Left_Empty` and `'fields_left_empty '` (capitals, trailing space): refused.
   - `hand_write` with severity critical: refused.
   - `barcode_not_validated`: refused by `code_check`.
   - A 3-character reason: refused by `reason_check`.
5. **The API path (held).** I ran `tests/check_qa165_readiness_paths_api.ts 4457 xr_studio_brk165` (8/8 passed), which leaves IMM 5257 SCH1 with a CRITICAL "5 form fields ... would be left empty" line.
   - As the client (user-P): 403 "Only the case officer can do this."
   - As the officer (user-O): 200. The stored row is code `fields_left_empty`, severity `critical`, one key, `passed_by` user-O.
   - The same pass again: 409 "There is no open ... warning ... Reload." No second row was written.
   - Code `fields_left_emptyX`: 404 "There is no such warning on this filing."
6. **Rollback rehearsal (held; the note is accurate).**
   - With a `fields_left_empty` row present, restoring c77's known-code check was refused with "violated by some row". Restoring c76:60's severity check was refused the same way.
   - The NOT VALID variant was accepted and kept the row, and it refused new `fields_left_empty` rows.
   - After `DELETE FROM "readiness_pass" WHERE "code" = 'fields_left_empty'`, both restores were accepted and the 14 older-code rows stayed. A new `fields_left_empty` row was then refused.
   - With the API row deleted for real, the officer could pass the line again (200). So the line had shown as open again, as the note says.
7. **Stamp order against main (held).** `origin/main` (f18fb0e66) ends at `20261108030000_c77_hand_write`, and 20261108040000 comes after it. Against open branches, see M1.

## What I ran
- `pg_ctl start` on the local cluster, which was down. `isolated.sh brk165 4457 start --ttl 40`. psql scripts for steps 3, 4 and 6, kept in the session scratchpad. `npx prisma migrate deploy` against xr_studio_brk165. The QA-165 API test. curl against :4457 as user-P and user-O.
- `git fetch origin`, then a scan of every remote branch for migration folders newer than 20261108030000. b162's migration SQL was replayed on my copy.
- Cleanup: `isolated.sh brk165 4457 stop` (database and files removed), then `pg_ctl stop`, since no copy was running. No commit, no push, no branch switch, and the shared :4400 was never touched.
