# B145 · C9.5 Adopt a published update on an open case: break report

Breaker (did not build it), 7 Nov 2026, on exact commit **14ef16070829203a6b11c16f1bc55ce9824bd96f** of `claude/exciting-mccarthy-up4u21` (no branch switch, no edit, no commit). An isolated copy `break_c95` on :4444 (`isolated.sh break_c95 4444 start --ttl 60`; stopped by the same command's trap, database dropped). Configured checkpoint, then later Sample releases 3 to 6 made through the author's routes (`acceptance/lib/sample-release.ts`: IMM 5476 or IMM 5475 form fields decided differently). AI off, no model call, US$0. Scope: concept "What gets built" (BR-1…BR-9) and the brief's schema and permissions list. Cases: F = family `611efd80` (release 1), X = recorded `7a4e02e0`, Y `32188321`, Z `b0b105e8`, W `1563a3e5`, U `8f47c712`, V `a3531dcf`.

## Blocker
**B1 · The release warning cannot be passed, so publishing a release blocks Ready to file on every touched filing until the case moves (BR-8, P-237 "warn, never block"; challenge M6).**
* Did: case U Ready to file on release 5 → published release 6 (IMM 5476 filled differently) → `GET /runtime/cases/U/prepare` → `POST /runtime/filings/f4e6b3b1…/warnings/release_update/pass {"reason":"Later: the client files this week on the current release (Sample)"}` as the representative, then `POST …/ready` as the officer. Same on V.
* Expected: the pass is stored and the filing goes back to Ready to file. "Later is normal".
* Actual: the filing drops from `ready_to_file` to `NOT_STARTED` as soon as the release is published (warns `["release_update"]`). The pass answers **500** "Something went wrong" and `/ready` answers 409 "1 open warning…". The API log says: `new row for relation "readiness_pass" violates check constraint "readiness_pass_known_code_check"` (code `release_update`); `select count(*) from readiness_pass where code='release_update'` → 0.
* Cause: `prisma/migrations/20261104120000_c76_readiness/migration.sql:58` lists the passable codes and does not include `release_update`. `engine/runtime/readiness.ts:41,175` added the code and emits it, but no migration widens the check. The pack only asserts `severity === "warning"` (`acceptance/C9.5.test.ts:67`) and never passes the warning. The walk does not pass it either.
* Consequence: every unmoved open case of a combination loses Ready to file on the filings a new release touches. When the move is refused there is no way out at all: if another filing of the case is recorded (X: "Can't move: … recorded as submitted"), or an answer has a type mismatch, the touched filing can never be Ready.

## Major
None beyond B1.

## Minor
* **m1 · "No longer required" is listed again on every later move.** After 1→2 dropped IMM 5707, the list for 2→3 (release 3 changes only IMM 5476) still puts the three IMM 5707 draft copies under *No longer required*, and the 3→6 move's toast says "…; 3 items no longer required; …" although neither release asks for IMM 5707. Cause: `engine/runtime/release-update.ts:144-145` (`!stillNeeded` is true for a form that neither side needs; "needed before" is not checked). The toast and the panel then name a cost that this move does not cause (BR-4).
* **m2 · A recorded filing carries an instruction it cannot follow.** X (recorded, read-only) shows `release_update`: "…Move the case from the notice under its header, or pass this warning with a reason". The move is refused (`recorded`) and the pass fails (B1). `api/src/case-prepare.ts:463-466` does not leave out recorded filings.
* **m3 · GET …/release-update writes.** On Z, before any Prepare, the counts (filing, filing_item, submission_group) were `0,0,0`; after one `GET /runtime/cases/Z/release-update` they were `1,11,1`. Cause: `release-update.ts:44` → `CasePrepare.view` → the sync write at `case-prepare.ts:213-216` (under `FOR NO KEY UPDATE`). BR-3 / the contract say "computed, writes nothing". The pack's row-count check ran after Prepare had already written these rows.
* **m4 · A pin can be deleted, so "forward only" holds for inserts only.** `begin; delete from pack_work_pin where case_id='F' and revision=3;` → `DELETE 1`, and F reads revision 2 (an earlier release) with no audit line (rolled back). The migration keeps only the UPDATE trigger; nothing refuses DELETE (SQL only, no route deletes pins).
* **m5 · Insert-trigger gaps (SQL only; `reach()` then fails closed with 409 on every case route).**
  * A reason of `E'\t\n\t'` passes, because `btrim` strips spaces only (migration `:36`).
  * `content_hash='deadbeef'` is accepted: the trigger does not check it against `config_release.sha256`.
  * A revision-1 pin of another combination on the same case is accepted (`:23-25` compare the pin's combination with its release, never with `runtime_case.combination_id`). After it, Z's `GET /runtime/cases/Z`, `/release-update` and `/prepare` all answer 409 "pin does not match", until the row is deleted.
* **m6 · A Demo target is not marked.** Every target in this workspace has `target.demo: true`; the notice and the panel (`web/src/runtime/release-update.tsx:54,151`) never show it (BR-2 "a demo release marks itself as everywhere (G3)").
* **m7 · A long lock wait answers 500.** While the case row was held for 18 s (`psql … FOR UPDATE; pg_sleep(18)`), `POST` Y move → **500** after 17.7 s (Prisma "expired transaction", 15 s timeout, `release-update.ts:152` / `case-prepare.ts:215`). Nothing was written, but there is no 409/503 with words. This is a synthetic hold.
* **m8 · The audit line is written after the commit** (`release-update.ts:157` vs the transaction at `:142-152`), so a failed audit write leaves a move with no audit line. Code reading only; not reproduced.
* **m9 · Recording races the move without re-checking the pin.** The record transaction holds case row lock and checks the stored version, but not the revision (`api/src/submission.ts:116-121`). On W: move queued on the lock first, then `PATCH /runtime/groups/379ac102…/record` → move **200** (revision 2, release 8), record **200**. The filing is recorded after the move from the view of release 7, with the review that view counted. It is harmless on W (release 8 does not touch W's filing). Today B1 keeps touched filings from being Ready, so they cannot be recorded. Once B1 is fixed this becomes M2's class for records: the record should re-read the newest revision under its lock, as Fill does.
* **m10 · A review from a screen read before the move counts after it.** After F moved, `POST /runtime/filings/fe68dc99…/review` with the facts hash read before the move → 200. The review is dated after `pinnedAt`, so it counts under BR-6's rule. The review carries no pin revision (two sessions).
* **m11 · At 200 % zoom (1024 px wide, 512×384 CSS px)** the pinned footer (reason + buttons) leaves about 90 px for the lists. They scroll and no content is lost (`scratchpad ui-1024-200pct.png`, not committed).

## What held
* **Roles, both routes (GET and POST):**
  * Officer, representative and second representative: 200.
  * Client A and Client B: 403 "Only the case officer can do this."
  * Author, approver and reviewer: 403 "works on configuration".
  * Other firm (user-S): 404 "No such case.", even with a bad body (`{}`, 200 kB reason), so the 400 is not reached first.
  * No actor: 401. Random UUID and `x' or 1=1`: 404.
  * No body leaks names or counts on 401/403/404.
* **Reason and body checks, all 400 with the reason field named:**
  * Reason missing, `""`, `"     "`, `" ab "`, `"!!!---"`, NUL, zero-width space, 501 characters, 2 MB.
  * `target_version` `"2"` or `2.5`; `from_revision` `0` or `-1`; an array; invalid JSON.
  * A German and Japanese reason was stored byte-exact.
* **Stale and wrong targets:** `from_revision` 2 on revision 1; target 1, 3 or 7 against target 2; on F at revision 3 with releases 4-6 out, targets 4, 5 (not newest), 2 (lower) and 7: all 409 `stale`, pins unchanged. Target 6 skipped straight to the newest (revision 4). Another combination cannot be named: the version is read within the case's own combination.
* **Newest release:** `target: null` and POST 409 `newest`. **Recorded filing:** X GET `refused.code: "recorded"`, POST 409 naming Sample Client R and Release 6, 1 pin.
* **Concurrency:**
  * Six POSTs, officer and representative alternating, all queued on a held row lock and then released: exactly one 200 (revision 3) and five 409 `stale`; one audit line per real move.
  * Two SQL sessions inserting revision 2: the second fails `pack_work_pin_case_id_combination_id_revision_key`.
* **Move against Fill, both orders, with the row lock held to force the order:**
  * Move first: move 200, Fill 409 "This case moved…", no copy created after `pinned_at` on the old release.
  * Fill first: Fill 202 QUEUED on release 6, then the move 409 "a copy of IMM 5476 … is being filled. … Nothing was changed."
* **Trigger refuses on insert:**
  * Revision 3 after 1 ("the next pin is revision 2").
  * Release 1 after 2, and release 2 after 2 ("forward only").
  * Another combination's release ("own combination").
  * NULL or space-only reason.
  * A first pin numbered 2, including delete-and-insert in one CTE statement.
  * UPDATE of `reason` or `config_release_id` → `runtime_pin_frozen`.
* **Reverse-order revisions:** with the trigger disabled, Z's revision 2 was inserted (ctid 0,13) before revision 1 (ctid 0,14). Z reads revision 2 on version 3. `openCasesByRelease` → `[{release 2, cases 2}, {release 3, cases 2}]`: F and Z counted once each, on release 3.
* **Finished work untouched:** across F's three moves, every `form_instance` (22 rows: id, sha256, release, status) and every review row is unchanged (diff = the new pin only). The served IMM 5257 PDF still hashes `53b70b59…`, the same as before the first move. On Y, the signed IMM 5476 scan row and its 4 stored files are byte-identical after the move. Prepare marks the scan "Out of date because of the release … made on Release 6, and Release 7 fills IMM 5476's form fields differently", with no fact lines and no Undo, plus a new "to do" for a fresh signed copy.
* **Touched filings only:** the young child's filing on F (not touched by release 3) has no `release_update` warning and keeps its review. The other three are warned and their reviews withdrawn.
* **UI at 1024 px and at 200 %:**
  * No sideways scroll; the 560 px panel fits at 1024 px and goes full width at 512 px.
  * Tab only: the notice button is reached in 10 / 9 presses, Enter opens the panel with focus on the reason, Not now and Move are the next two stops, all in view, and focus stays in the dialog. Escape closes it and focus returns to the notice button.
  * X shows the refusal and the Move button is off. An emptied reason gives POST 400 and "Say why…" on the field.
  * As the client, there is no notice and no release-update request at all.

## Round 2 (138535ab8)
Diff `14ef16070..138535ab8` on exact head **138535ab8314306291745478ee5e80575b1ae3e8**. A fresh `break_c95` copy on :4444, started and stopped (database dropped) in one command, with migration `20261107220000_c95_pin_guards` applied. Configured checkpoint, then Sample releases 3, 4 and 5 by the author's routes. AI off, US$0. **No Blocker. No Major.**

**Minor, still open:**
* **R2-m1 · Fill waiting more than 5 s on the case lock answers 500.** The case row was held 8 s; `POST …/forms/IMM 5476/:subject/generate` → 500 after 7.7 s. `fill-case.ts:239` runs with Prisma's default 5 s timeout and is not wrapped in `busyWords`, which turns the move's own wait into a worded 503. A move holds this lock while it re-reads the answers and checks the refusals.
* **R2-m2 · The insert trigger still accepts a reason with no visible text.** It refuses tabs and new lines now, but `E'   '` (no-break spaces) and `E'​​​'` (zero-width spaces) as a revision-2 reason → `INSERT 0 1`. `[[:space:]]` does not match them. SQL only; the API refuses both.
* **R2-m3 · `TRUNCATE pack_work_pin` empties every pin** (row DELETE triggers do not fire). SQL only; noted for the "never deleted" claim.
* **R2-m4 · A review sent without `pin_revision` is still accepted after a move.** The check is opt-in (`readiness.ts:185`). On W after the move, `POST /runtime/filings/5a60b777…/review {facts_hash: <read before the move>}` with no `pin_revision` → 200. The screen sends `pin_revision`, so this is reachable only by a direct API call.

**Fixed, re-tested and holding:**
* **B1:**
  * **Pass works:** U was Ready on release 6 and was demoted when release 7 came out. The officer's pass of `release_update` → 200 (key `release|filing|3`), a second pass → 409 "no open warning", `/ready` → 200. Same on W with release 8.
  * **Pass permissions:** Client A and Client B 403, author and approver 403, other firm 404, no actor 401.
* **m9, record racing the move:**
  * Move queued on the lock first: move 200 (revision 2), record → 409 "This application changed since you read it", no `filing_record`.
  * Record first: record 200, then the move → 409 "recorded".
* **m10, review from a screen read before the move:** with `pin_revision: 1` → 409 "This case moved to another release…".
* **The changed prepare version:**
  * A never-moved case keeps its version with no `~r` suffix (X `936fd8506341d18b`, the same after a release was published), and record → 200 on it.
  * On a moved case the version reads `…~r2`. A channel change sent with the version from before the move → 409 stale; with the version from a fresh read → 200.
* **m3, GET writes nothing:** on Z, never prepared, three `GET …/release-update` leave the row count of every table and the `pg_stat_user_tables` insert/update/delete total (20852) unchanged.
* **m7:** a move waiting 17.8 s on the lock → **503** "This case is being changed by someone else right now: nothing was changed". Pin and audit are untouched.
* **m2:** a recorded filing (X) carries no `release_update` warning.
* **m1:** after F's 1→4 move, the list for 4→5 has an empty *No longer required*. The IMM 5707 copies appear only in `last_move`, the move that dropped them.
* **m4:**
  * A lone `delete from pack_work_pin` → refused `runtime_pin_no_delete`.
  * Deleting a case, and deleting two cases in one statement, cascade to 0 pins (rolled back).
  * Demo Reset with two moved cases (2 pins each) → 201, 0 pins and 0 cases.
  * The checkpoint load ran before the cases moved; a load with moved cases present was not run.
* **m5:** a tab and new-line reason, a wrong content hash, and a revision-1 pin of another combination are all refused. A valid SQL move is still accepted.
* **m8:** the audit line is now written in the move's transaction (`release-update.ts:166-169`); read in the code, not forced to fail. Not re-tested: round 1 m11 (200 % zoom) and the Demo pill (m6, read in the code only).

## Round 3 (468ea98e5)
**Setup.** Diff `f583c3e28..468ea98e5`, run in the worktree at exact head **468ea98e57472d5fe7b9d4751996a9b01ed4bcc8**. Own copy on :4449 (database `xr_studio_break_c95r3`, files in `studio/var/isolated-break_c95r3`), started and stopped in one command; database dropped. AI off, US$0.

**Harness notes (not findings).**
* `isolated.sh` cannot start from this worktree. Its `pg_ctl … status` check runs as the postgres user, who cannot traverse `/tmp/claude-0`. A scratch script ran the same steps without that check: web-fresh, `migrate deploy`, the server, and a trap that drops the database.
* The worktree's source files were rewritten at 14:51:32 by another session while my first copy ran. That copy served pre-fix code: the review did not wait for the lock, and Fill answered 500 at line 238. All of its results are discarded. Every result below comes from a fresh copy, with the tree equal to HEAD both at start and at the end.

**No Blocker. No Major.**

**Minor**
* **R3-m1 · A wrong-typed `pin_revision` gets a false message.** `pin_revision: "2"` (text) or `null`, on a case at revision 2, answers 409 "This case moved to another release after you opened the filing". The case did not move. A missing `pin_revision` correctly gets 400 (`readiness.ts:57-58`). Reachable by direct API calls only.
* **R3-m2 · A review is not idempotent.** Four simultaneous `POST /runtime/filings/:id/review` calls with the same `pin_revision` and hash all answer 200 and write 4 review rows and 4 audit lines. They are serialized under the lock and none is wrong, but nothing dedupes them. This existed before this diff.

**Held: (a) the review under the lock**
* **Lock wait:** while the case row was held for 6 s, the review waited 5.5 s and then answered 200. Fill now answers a worded **503** after its 5 s timeout (R2-m1 fixed). A review held for 18 s gets the worded **503** after 15 s.
* **Review, then move, then review, all queued on the lock:**
  * The first review is 200 (reviewed at 14:58:44.716, before the pin at .734).
  * The move is 200, and it withdraws that first review ("CRITICAL: The case moved to Release 7…").
  * The second review is **409** "moved … while you reviewed".
* **Move first, then a review:** the review gets 409 (round 2 pattern, re-checked here).
* **Body checks on a moved case:** without `pin_revision` → 400; with 3 → 409.
* **Fill, review, record and move queued on one lock:** Fill 202, review 200, record 200, move 409 "recorded". No deadlock, no 500, nothing left waiting.
* **Parallel reads:** 6 Prepare GETs and 2 release-update GETs alongside a move, then 4 Prepare GETs alongside 2 reviews: all 200, the move made revision 2, and "deadlock" appears 0 times in the log.

**Held: (b) every read route on revision 2**
Checked on F (moved 1→3, revision 2 on Release 7) and on B, whose revision 2 was inserted before revision 1 (ctid 0,6 before 0,7, triggers disabled and then re-enabled).
* **Case and prepare:** the case reads `release_version 3`, `revision 2` (Release 7). Prepare reads 3 with `pin_revision 2`, and IMM 5645 is there with no IMM 5707.
* **Release-specific content:** the checklist reads 3, filings read 3, forms list IMM 5645, and the questionnaire asks release 2's new "The person's full name" question for all four people.
* **Routes that answer the same on either release:** team, findings and filing-record answer 200. Sign steps for IMM 5476 answer 200 (`person`, `representative`). The employer link answers 409 "Not offered", as it does on every release.
* **Assessment:** a new assessment is run on release 3, on both F and B.
* **Release-update:** shows `last_move` from Release 6 to 7 on B.
* **Where-used** (`change-sets/check`): open cases are release 2 → 1 case and release 3 → 2 cases (F and B).
* **Kept by:** the query counts only the newest pin per case: release 1 → 0 cases, 2 → 1, 3 → 2. The configured library has no older edition, so I checked the query, not its words.

**Held: (c) the type check and rule-only warnings**
* **Application-level type check:** release 4 (author's routes) makes `case.visit_contact_name` a date. F's list then shows `refused: type_mismatch` "The application's answer to "Name of a person or institution to be visited in Canada" does not fit the new release (it expects a date)". POST → 409, still revision 2.
* **Rule-only touched-filing warning:** checked in the engine only (`tests/check_c95_release_update.ts` 34/34). It warns where who needs a form changes, and not where it stays the same. I made no rule-only release by the author's routes.
