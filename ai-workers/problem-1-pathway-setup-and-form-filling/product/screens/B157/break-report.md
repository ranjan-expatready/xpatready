# B157 break report: one answer subject per person and relation (schema)

PR #1378, commit aae6c8330. Isolated copy `brk157` on :4483 (`xr_studio_brk157`), configured
checkpoint loaded as user-A, later the finished story. Sample data only, live AI off, US$0. Scripts were kept in the
session scratchpad; every step is repeatable from the reproductions below.

**Verdict: no Blocker, no Major.** The index does what it claims, and the API never answered a 500. There are three
Minor findings, all in the migration's runbook text or in how it is maintained.

## Findings

| # | Severity | What | Reproduction |
|---|---|---|---|
| 1 | Minor | The recovery in the migration comment does not work as written: "keep the lowest id, move its twins' answers to it, then apply again" (migration.sql:7-8). (a) You cannot move the answers. `client_canonical_answer`, `client_fact_record` and `client_group_answer` all have append-only `BEFORE UPDATE` triggers, so `UPDATE … SET subject_id` is refused. (b) The comment never says to delete the twins. While a twin still exists, the index is refused again. Deleting a twin cascades (`ON DELETE CASCADE`) and silently destroys its answers. (c) "Apply again" with `prisma migrate deploy` fails with P3009 every time until someone runs `prisma migrate resolve --rolled-back 20261108050000_b157_one_relative_subject`. The comment does not mention this. Today's risk is low: the demo database holds 0 duplicates (read-only check), and the lock has prevented them since B128. | On the copy: drop the index, delete the b157 row from `_prisma_migrations`, insert a second `parent_1` subject (higher id, with one current answer) for a party that already has one, then run `prisma migrate deploy`. Result: P3018 / 23505 "could not create unique index … Key (party_id, subject_kind)=(e56fd4f1…, parent_1) is duplicated". Then `update client_canonical_answer set subject_id='<lowest>' where subject_id='<twin>'` gives `ERROR: runtime_answer_append_only: an answer is never changed in place`. Fixing the data and deploying again gives `Error: P3009 … migration … failed`. Only `migrate resolve --rolled-back` followed by `deploy` works ("All migrations have been successfully applied"). |
| 2 | Minor | The rollback line in migration.sql:9 (`DROP INDEX …`) leaves `_prisma_migrations` marked as applied. After a rollback, `prisma migrate status` still reports "Database schema is up to date!", `prisma migrate deploy` reports "No pending migrations to apply", and `prisma migrate diff --from-config-datasource --to-schema` does not mention the index. Nothing in the tooling shows that the database check is gone, so the API is back to relying on its lock alone. To re-apply, someone has to run the file by hand. The file is not idempotent (no `IF NOT EXISTS`), so a second run errors with "relation … already exists". | `psql $DB -c 'DROP INDEX "answer_subject_one_relative_per_party"'`, then `prisma migrate status`, then `prisma migrate deploy`. Index count: 0, and both commands report that all is well. |
| 3 | Minor | The protected relations are written out twice with no link between them. The SQL list `('parent_1','parent_2','sibling')` is a copy of `ASKED_RELATIONS` in engine/runtime/relatives.ts:12-16. If a relation is added there later, its subjects get no database check, and nothing fails. `tests/check_b157_relative_subject_unique.ts` B157-1 checks for the three literals; it does not check that the list equals `ASKED_RELATIONS`. | Read relatives.ts:16 next to migration.sql:10. B157-1 still passes if a fourth relation is added to `ASKED_RELATIONS`. |

## What held

- **Migration onto a database that already has two `parent_1` subjects for one party:** it fails loudly with P3018 / 23505
  and names the duplicate key. No index is left behind and no rows change. `answer_subject` still had 2 `parent_1`, 1
  `case` and 1 `principal` rows for that party.
- **Rollback and re-apply:** dropping the index and running the migration file again recreates it, and the definition
  matches. The commit introduces no drift: `migrate diff` proposes no change to `answer_subject`. Its other output (four
  `DROP DEFAULT` and `DROP TABLE canonical_field_name`) is unrelated to this commit.
- **Concurrent first writes:** 3 rounds of 72 parallel requests each. Officer `user-O` and client `user-P` each sent 4×
  first answers for `parent_1` and `parent_2`, plus a mix of sibling rows and none-apply. This covered the principal and
  the spouse of case A, and a principal with the same display name on case B.
  - Result: 0 responses of 5xx or 0. Every refusal was a worded 409.
  - Every party ended with exactly 1 `parent_1`, 1 `parent_2` and 1 `sibling` subject.
- **Same person on two cases:** `createCase` (runtime.ts:188) and `addPerson` (runtime.ts:310) always create a new
  party, and no route adds an existing party to a second case. A person with the same name on two cases therefore has
  two parties (3 distinct parties in the test). Each party got its own relatives and no answers leaked between them.
- **P2002 fallback, forced on purpose:** a psql session inserted a relative subject without taking the lock and held its
  transaction open while the API made the first answer or entry.
  - `parent_1`, other session commits: the API waited about 2.3 s, got the unique violation, then saved the answer on
    the other session's row (same party, same kind). Response 200.
  - `parent_2`, other session rolls back: the API's own row was created. Response 200.
  - `sibling` row, other session commits: response 201, and the row went on the other session's subject.
  - In no case did the fallback return a subject of the wrong party or the wrong kind. `held()` uses the same
    party/kind filter and the same `id asc` order as `relativesOf`.
- **No existing flow legitimately makes a second relative subject:**
  - Writes to `answer_subject` happen only at runtime.ts:144, 189-190 and 312.
  - The built-in roles cannot collide with the relation names. The roles are `principal`, `spouse_or_partner`, `child`,
    `sponsor`, `representative` and `parent` (which takes no part in a case), and no route adds roles.
  - `make_principal` worked: both people's `parent_1` answers stayed on their own subjects, and later `parent_2` and
    sibling writes by officer and client returned 200/201/409, with no 500 and one subject each.
  - The finished story (demo reset, configured load, release move to release 2, the family case answered through to
    submission) finished as "done" with 18 stages done. The story's relatives came out as 3 `parent_1`, 3 `parent_2` and
    3 `sibling` subjects on 3 distinct parties.
  - The employer-link copy and release moves create no subjects.
- **`case` and `principal` subjects are unaffected:** they are outside the partial index, and creating and loading cases
  works as before.
- **Wrong role:**
  - Client `user-Q`, who is not on the case, got 404.
  - Author `user-A` and reviewer `user-C` got 403.
  - A request with no actor got 401.
  - None of these calls created a relative subject (count 0 before and after). Saying "entries apply" with nothing
    recorded creates nothing either (`create = noneApply`).
- **Demo database (read-only `SELECT`):** 0 duplicate (party, relation) pairs, so the migration will apply there.
- **Note, not a finding:** the index is built without `CONCURRENTLY`, so writes to `answer_subject` are briefly blocked
  while it builds. The table is small, and Prisma's migration runner cannot use `CONCURRENTLY` anyway.

## Seen at the end, not tested
When this run ended, someone else had uncommitted edits in this checkout (not mine) to migration.sql and
tests/check_b157_relative_subject_unique.ts. The edits cover parts of findings 1(c) and 3. They do not cover 1(a): the
append-only triggers still refuse "move its twins' answers". They do not cover 1(b): the twins still have to be deleted,
and deleting them cascades. Editing an applied migration also changes its checksum, so databases that already applied
aae6c8330 will report the migration as modified.
