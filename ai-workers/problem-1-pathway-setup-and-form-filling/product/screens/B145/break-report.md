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
