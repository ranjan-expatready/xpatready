# B157 review, round 1: one relative answer subject per person and relation, held by the database (PR #1378)

**Reviewed commit:** `aae6c8330485460233720a1418bc1abd64c84b6c` (branch `claude/pensive-bell-7ko7fb`), diffed against `origin/main` on 8 Nov 2026 by a reviewer that did not build it. Line numbers are at that commit.
**Copy:** isolated `rev157` on :4477 (qa range), fresh database plus `prisma migrate deploy`. The test resets the copy and loads the configured checkpoint itself. The copy is stopped now and the cluster was left running. US$0, Sample people only.
**Scope:** a schema row with no screen and no `concept.md`. The row: "an expand-only unique constraint, a fail-first concurrent test, no behaviour change" (STANDARDS §3.4). The tech lead's settings on #1256: a plain `CREATE UNIQUE INDEX`, and the partial index includes `sibling`.

## Verdict: **Approve** (no open Blocker or Major; 3 Minors, none needed to merge)

## What I ran
* `tests/check_b157_relative_subject_unique.ts 4477 xr_studio_rev157` with the migration applied: **10/10** (135 s).
* **Fail first:** I dropped the index on my copy and re-ran: **4/10**, the same as the builder's number.
  * Failing: B157-1, B157-2, B157-3 (×3) and B157-4. For example, 8 lock-free inserts all went in (8 rows).
  * Still passing: B157-5 to B157-8, as they should. Those checks cover "no behaviour change": the lock and status codes are the same with or without the index.
* **The P2002 fallback, run for real** (my own probe script, deleted afterwards). A psql session ran `BEGIN; INSERT parent_2 …; pg_sleep(4); COMMIT`. While it held the row, an officer's first answer about that parent was sent through the API.
  * Result: the API create waited about 3 s on the index, received 23505 → P2002, re-read the subject and answered **200**.
  * The answer is stored on the subject that won, and only one subject exists.
  * The same happened for a first sibling entry: **201**, one subject.
* **Data with twins:** after the fail-first run my copy held twins. Re-creating the index there was refused: `could not create unique index … Key (party_id, subject_kind)=(…, parent_1) is duplicated`. Nothing changed, as the migration's header says.
* **Read-only scan of the cloud databases on the shared cluster:** no twins in `xr_studio_demo` or `xr_studio_forms_forms_b155`. The other lane databases have no `answer_subject` table yet.
* **Typecheck** (`product/tools/typecheck.mjs`): no new errors (15 known; web clean).
* **`graph.mjs`:** G1/G2/G4/G5 at 0, so nothing new is unlinked.

## Checks the tech lead asked for
* **Expand only, and safe on existing data: yes.**
  * The migration is one `CREATE UNIQUE INDEX`. No row changes, and the rollback is recorded (`migration.sql:9`). This meets STANDARDS §4 "expand → migrate → contract, … recorded rollback".
  * The advisory lock and the only code that creates a relative subject came in the same commit (`50def74da`, B128; `git log -S`), so there was never a window where the API could make twins.
  * The only `answerSubject.create` calls are at `runtime.ts:144` (relatives, under the lock), `:189-190` (`case` and `principal`, a new party per case) and `:312` (an added person, a new party, kind = role).
  * No release role is `parent_1`, `parent_2` or `sibling` (grep over the JSON data). The roles library also says a parent is "never a person on the case".
* **`case` and `principal` are not affected: yes.** The index's `WHERE` lists only the three relation kinds (B157-1 checks the definition). B157-6 inserts 3 `case` and 3 `principal` subjects for one party, and all go in.
  * The header's line "a party holds one 'case' and one 'principal' subject per case it is on" is more cautious than needed, because `createCase` makes a new party each time. It is harmless.
* **Naming and order: fine.**
  * `20261108050000` comes after `origin/main`'s newest (`20261108040000_qa165_fields_left_empty`). No other remote branch uses 0500–0700 on 8 Nov.
  * The index name is 37 characters, under Postgres's 63-character limit.
  * A plain `CREATE UNIQUE INDEX` runs inside `migrate deploy`'s transaction, as the tech lead set.
* **Prisma drift: no problem.**
  * CI runs no `prisma migrate diff` or drift check: `ci.yml` and `guards.yml` never call `prisma`, and `isolated.sh:77` and `cloud-setup` use `migrate deploy`.
  * This follows the existing pattern for SQL-only partial unique indexes: about 20 of them (for example `case_document_one_current`, `entered_section_one_current`), each written only in SQL and noted in a `///` doc comment, as `schema.prisma:1423-1425` now does.
* **The P2002 fallback cannot swallow another error** (`runtime.ts:140,145`).
  * `unique()` (`:52`) matches only P2002. Inside that transaction the only write is `answerSubject.create`, and `answer_subject`'s only unique keys are the uuid primary key and this index.
  * The error is swallowed only if `held()` then finds a subject for that same party and relation, which is exactly the case where the database refused a twin. Any other error, or a P2002 with no such subject, is re-thrown.
  * `held()` runs outside the aborted transaction (read committed), so it sees the row that won (my probe shows this).
* **The test fails first and weakens nothing.** It is a new file, and no existing test changed. The status codes in B157-7 (one 200, the rest 409) and B157-8 (8× 201) are identical with and without the index.

## Findings
**Blocker:** none. **Major:** none.

**Minor**
1. **No automated test reaches the P2002 fallback.**
   * Where: `api/src/runtime.ts:145`. Remove the `.catch(...)` and the test still passes 10/10: B157-7 and B157-8 go through the lock, which never lets the second create happen.
   * Failure scenario: someone later removes the fallback, or narrows its condition by mistake. If something then writes outside the lock (another code path, a loader), a first answer races it and gets a **500** instead of 200, and no check notices.
   * Fix: add one check to `tests/check_b157_relative_subject_unique.ts` that does what my probe did. A psql session holds an uncommitted `INSERT … parent_2` with `pg_sleep(3)`. During that, one `PUT …/parent_2/person.full_name` is sent. Assert 200, one subject, and the answer stored on the subject that won.
2. **The index's list of kinds is a second copy of `ASKED_RELATIONS`, and nothing ties the two together.**
   * Where: `migration.sql:10` versus `engine/runtime/relatives.ts:16`. B157-1 (`tests/check_b157_relative_subject_unique.ts:35`) checks for exactly the literal three kinds.
   * Failure scenario: a later row adds a relation (say a spouse's parent) to `ASKED_RELATIONS` without a migration. The lock still protects it, but the database check silently does not, so §3.4 is half met for that relation and every test stays green.
   * Fix: build B157-1's expected list from the imported `ASKED_RELATIONS`, so a new relation fails the check until the index covers it.
3. **The migration header's recovery steps leave out Prisma's failed-migration record.**
   * Where: `migration.sql:7-8` ("the index is refused … then apply again").
   * Failure scenario: if `migrate deploy` ever hits twins, Prisma records the migration as failed. Every later deploy then stops with P3009 until someone runs `prisma migrate resolve --rolled-back 20261108050000_b157_one_relative_subject`. Followed as written, "apply again" does not work.
   * Fix: add that `resolve` step to the comment. I rate this low because the lock makes twins impossible through the API.

**Wording (not a finding):** the check names `B157-2 fail (control …)` and `B157-6 fail (no behaviour change)` are labelled "fail" but assert something that should pass. If the label means "the control case", saying so would help a reader of the test output.

## Journey test (reviewer role)
**Not scored: nothing a person sees changed.** The diff touches no `web/` file. On every normal path the API answers the same: B157-7 and B157-8 return the same status codes with and without the index. The only new behaviour is on a path that cannot be reached without the lock being bypassed, and my probe shows it answering 200 there. So no journey-test report is written for this row (the tech lead's instruction for schema rows).

## Scorecards
D1–D20 and BIC-01–20 are N/A apart from these: **D2 Data integrity: improved.** The database now refuses a twin under a raw race (B157-3: 1 in, 7 refused). **D16 Testability: partly.** The rule fails first, but the fallback is untested (Minor 1). **D5 Stability: unchanged**, with no 500 under 8 parallel first answers or entries. D17/D20 are simulated only and not applicable.

## What I could not check
* The Mac's :4400 demo database, which is not reachable from here. The demo update runs `migrate deploy` on existing data. By the lock-history argument above it cannot hold twins, but only the founder's Mac can run the one-line twin query in `migration.sql`'s spirit before merge: `select party_id, subject_kind, count(*) from answer_subject where subject_kind in ('parent_1','parent_2','sibling') group by 1,2 having count(*)>1`.
* CI on this head: the PR is a draft, so only the guard ran (success).

---

# Round 2 (diff only, P-293 (3))

**Reviewed commit:** `20daf89b373f020f9671d9b1ccfa7d37ea473dee`, the pushed head. I was first given `786a835b1e907ce9684d7ea26cdccd551c80df94`, but the push guard refused it (a name in `break-report.md`). Its tree is the same as `20daf89b` apart from that one `break-report.md` line (`git diff 786a835b 20daf89b`). The diff reviewed is `git diff aae6c833..20daf89b`, and its code part is two files: the migration's comment (`migration.sql:6-16`; the SQL statement at `:17` is unchanged) and `tests/check_b157_relative_subject_unique.ts` (B157-1 at `:38`, and the new B157-9 at `:67-75`). No `api/`, `engine/`, `web/` or `schema.prisma` change. The rest of the diff is the round-1 `review.md` and `break-report.md`.
**Copy:** isolated `rev157b` on :4479, with a fresh database and `migrate deploy`. It is stopped now; the cluster was left running.

## Verdict: **Approve** on `20daf89b` (no open Blocker or Major). Round-1 m1–m3 and the breaker's m1–m3 are closed. One new Minor (r2-m1) is optional.

## What I ran
* `check_b157_relative_subject_unique.ts 4479 xr_studio_rev157b`: **11/11 four times in a row**. B157-7's 200 came at a different position each run (index 0, 7 and 1), so the race is real.
* **B157-9 really goes through the fallback.** I sampled `pg_stat_activity` every 50 ms during a run:
  * The held psql session was already in `PgSleep` by the first sample (its insert was done).
  * About 0.7 s later, the API's Prisma `INSERT INTO "public"."answer_subject"` waited on `Lock/transactionid` for **2.25 s**. It was released when psql committed.
  * Then came the 200.
  * So the 200 comes from P2002 → `.catch` → `held()` (`runtime.ts:145`), not from `relativesOf` finding a committed row. This agrees with the builder's mutation result (with the `.catch` removed, 409).
* **The recovery steps, run for real** in rolled-back transactions on my copy:
  * Drop the index, insert a twin `parent_1` subject with a higher id, and copy one answer onto it. `CREATE UNIQUE INDEX` is then refused with "… is duplicated".
  * Then `DELETE FROM answer_subject WHERE id = <twin>` deletes the twin's answer by cascade (0 left), no trigger refuses it, and the same `CREATE UNIQUE INDEX` succeeds. `ROLLBACK`.

## The recovery text (`migration.sql:9-16`)
* **"Every read takes the lowest id": true.** `relativesOf` (`runtime.ts:120`) orders by `id asc` and keeps the first one per key. `held()` and the in-lock re-read (`:140,143`) order the same way. No other code in `api/` or `engine/` reads a relative subject by kind (grep for `subjectKind` and `ASKED_RELATIONS`). So deleting the higher-id twin removes nothing that was ever shown, and "re-enter on the lowest-id subject" is what the API does anyway.
* **"Append-only (their triggers refuse moving them)": true, and those triggers do not block the delete.**
  * `trg_answer_append_only`, `trg_fact_record_append_only` and `trg_group_answer_append_only` are `BEFORE UPDATE` only (live `tgtype` 19).
  * So `UPDATE … SET subject_id` (a move) is refused, while the cascade `DELETE` passes.
* **Cascades: as stated, and slightly more.** On the live database every foreign key into `answer_subject` is `ON DELETE CASCADE` (`confdeltype = c`, matching `schema.prisma:1460,1482,1505,1533,1875,1903`). That covers answers, records and group answers, as the comment says, and also `case_participant`, `checklist_line` and `case_document`.
  * The comment lists only the first three. In practice that is complete: a relative subject is never a participant ("never a person on the case"), and checklist lines are made only for `peopleOf` subjects (`case-checklist.ts:87`). Documents hang on those lines.
  * The superseded chains are `CASCADE` within the twin's own rows. Nothing else has a foreign key to the answer tables (grep of the migrations), so the frozen `answer_snapshot` and `validated_copy` cannot block the delete or lose anything through it.
  * Not a finding.
* **Prisma steps: correct.**
  * A failed apply is recorded and blocks later deploys (P3009). `migrate resolve --rolled-back <name>` followed by deploy is Prisma's documented way out.
  * The rollback note's `DELETE FROM "_prisma_migrations" …` is what makes a later deploy apply the migration again after a manual `DROP INDEX`.
* **The checksum note is right.** Editing the comment changes the file's checksum only for local databases that applied the first version. CI and every real database apply it fresh, because it is not merged anywhere yet.

## Soundness of B157-9 (`tests/check_b157_relative_subject_unique.ts:67-75`)
* **When it is slow, it fails rather than passing falsely.**
  * Suppose psql takes longer than the 0.7 s head start plus the request's own latency to connect and insert. Then the API creates and commits first, psql's insert hits the index, `ON_ERROR_STOP=1` makes psql exit non-zero, and `await hold` (`:73`) rejects. The check goes red.
  * The hold is 3 s, so the API's wait inside its interactive transaction stays well under Prisma's default 5 s transaction timeout.
* **It can only pass falsely in one narrow case.** If the PUT reaches `subjectFor` more than about 3 s after the hold starts, psql has already committed. `relativesOf` then finds the row, and the check gets 200 without touching the fallback. That needs a stall of about 2.3 s beyond the 0.7 s head start: unlikely, and it would only make one run vacuous, not wrong. See r2-m1.
* **Its assertions are sound.**
  * Exactly one `parent_2` subject.
  * The new answer is the current (not superseded) answer on that subject.
  * The status is 200 and nothing else. A 409 (the fallback removed) or a 500 fails it.
* **Nothing weakened.**
  * B157-1 now takes its kinds from `ASKED_RELATIONS` (`:38`). It asserts that every one is in the index definition and that the number of quoted literals equals `ASKED_RELATIONS.length`. That pins the exact set, and it covers the old `!/'case'|'principal'/` check.
  * An index that is missing gives an empty definition and fails.
  * No other check changed (the diff touches only `:13`, `:36-38` and `:67-75`).

## Findings, round 2
**Blocker:** none. **Major:** none.

**Minor**
* **r2-m1 (optional): B157-9 does not prove it waited.**
  * Where: `tests/check_b157_relative_subject_unique.ts:71-75`.
  * Failure scenario: on a stalled runner the PUT arrives after psql commits, and the check passes through `relativesOf`, not through the fallback it exists for.
  * Fix: time the PUT and also assert that it took at least about 1 s (it waited on the index). Or assert that psql's `hold` resolved *after* the PUT started. Either makes a vacuous pass a red one.

## Journey test (reviewer role)
**Not scored, as in round 1.** No `web/` file changed, and on every normal path the API answers the same. No journey-test report is written for this schema row.
