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
