# Review: C7.3 answer sheet, rebased onto the new #356 build (PR #358, commit 7595e170)

Branch `claude/runtime-answer-sheet-3` at **7595e170**, base `claude/runtime-prepare-2` (#356, approved round 4). Diff reviewed: `git diff claude/runtime-prepare-2...7595e170` (C7.3 plus the C7.7 PDF-copy commit 4d957fc0 it is stacked on). Earlier record: `screens/M3-E-answer-sheet/review.md`, round 3 **Approve on 732d4241** (old #356 build).

Reviewer agent, 2 Nov 2026. I did not build this. I used my own worktree at 7595e170 with its own copy of `node_modules` (Prisma client generated there, never in the main checkout), and a fresh isolated copy on **:4449** (`xr_studio_rev73r`). It is now stopped, the database is dropped and the worktree is removed. The builder's ports, :4400, :4440 and :4441 were not touched. Live AI was off; cost US$0.
Journey test: `journey-test-reviewer-2026-11-02.md`, **9.5/10, passes**.

## Runs (fresh copy)
* `check_vv_answer_sheet.ts`: **13/13**.
* `check_vv_prepare_api.ts 4449`: **32/32**. Pack 4's C7.3 acceptance test passes **13/13**, and C7.3's own lines (M1, M2, M3, 404, 409, audit) all pass.
* `check_vv_prepare_store_api.ts 4449` on a second fresh copy: **34/34** (the builder reported 33).
* `acceptance/C7.7.test.ts`, run for the stacked PDF-copy commit: lines C7.7-10 to -13 (Download PDF copy, `copy_not_for_filing`, never counted, never lockable) pass. Its other 3 failures belong to #357's firm-record work, which is not on this branch.
* `tsc -p api/tsconfig.json --noEmit`: no errors in any file of this diff. There are 10 errors in three test files this PR does not touch (`check_x2b_bulk_apply.ts`, `check_vv_checklist.ts`, `check_c18_age_case.ts`).
* `prisma migrate deploy`: all migrations apply in order, ending `20261102030000_c612_c116_prepare_items` → `20261102040000_c73_entered_section`.
* `prisma migrate diff` (migrated database against the schema): nothing for `entered_section` or `filing_item`. The remaining drift lies elsewhere and was there before this PR.
* Graph (P-86): `GET …/answer-sheet` and `POST …/screens/:key/entered` are tested by `check_vv_prepare_api.ts`. G3 lists `POST /runtime/items/:id/pdf-copy` as untested on this branch: C7.7's acceptance test covers it, but it joins the suites only in #357.

## Nothing of C7.3 was lost in the move
* `engine/runtime/answer-sheet.ts`, `tests/check_vv_answer_sheet.ts` and `acceptance/C7.3.test.ts` are **byte-identical** between 732d4241 and 7595e170.
* I compared the C7.3 patch to `case-prepare.ts` line by line, old (`dd16d505..732d4241`) against new (`4d957fc0..7595e170`). Only two lines differ: the import line (it now keeps #356's `Head` and adds `Res`) and `item.removedAt` → `!item.active` in `onlineItem`. Every review fix is still in the code:
  * M1: re-tick with `superseded_at`; partial unique index `entered_section_one_current`.
  * M2: Done only when every section is entered, current and waits for nothing.
  * M3: a tick sends the section's `version`, and the frozen hash is the version the officer sent.
  * N1: the sheet is keyed by the whole `about`.
  * n1: the stale-tick 409 names the section.
  * Round 1: the case foreign key and index, plural words, and boxes about nobody left out.
* The migration is the round-3 SQL, unchanged apart from its folder name. The schema adds `EnteredSection`, `entered EnteredSection[]` on `FilingItem`, `entered EnteredSection?` on `AnswerSnapshot` and `enteredSections` on `Case`. All of these match the migration.

## The migration after #356's
* The new table and foreign keys are additive. `filing_item(id)` exists from #325's `20261102010000`, so the migration does not depend on anything in `20261102030000`. It now sorts after `20261102030000`, as the PR states. The C7.3 migration name was never on `main` or the demo (the last migration on main is `20261102010000_*`), so no copy has the old name recorded.
* Under #356 an item row is never deleted (`active` is toggled), so `ON DELETE CASCADE` from `filing_item` now fires only when a case is deleted. Ticks are no longer at risk when an item is rebuilt.
* #356's rollback starts with `DELETE FROM "filing_item"`, which would cascade to `entered_section`. Rolling back in reverse order, C7.3's `DROP TABLE` runs first, so this is consistent. I note it; it is not a finding.

## What the new tables change for C7.3 (tested on :4449)
* **The item stops applying** (`PATCH people/:s {applies:false}`): `active = f`, and the item leaves `/prepare`. The sheet and the tick both return 422 "Only a form on this application has an answer sheet." The tick rows are kept (1).
* **It applies again:** the item comes back with the **same id**, and its section A tick with it. The tick reads current when nothing changed. A family name changed while the item was off makes the item read `out_of_date`, and section A `out_of_date: true`, with the right reason. A re-tick then freezes the new answers: 6 parallel calls give 201 + 5 × 200, 1 current tick out of 2, and 2 snapshots. This behaviour is new with #356's tables (ids survive), and it is correct: the frozen answers are always compared with today's. No check covers it (m6).
* **`channel` as the `FilingChannel` enum** (stored type `FilingChannel`):
  * `item.channel ?? line channel` still selects ONLINE correctly.
  * After `PATCH channel → PDF_UPLOAD`, the sheet and the tick both return 409 "IMM 5707 is filed as PDF upload…", and the item reads `to_do`.
  * Back to ONLINE, the item answers again.
* **Unchanged:**
  * 6 parallel first ticks give 201 + 5 × 200, and 1 row.
  * A raw SQL second current tick is refused by `entered_section_one_current`.
  * Versions: missing, 5, null or a list give 400; a wrong or older version gives 409.
  * Roles: client and client B 403 on GET and POST, author 403, unknown or no actor 401.
  * Section keys: 6 hostile keys give 404. A document item gives 422.
  * PDF copy: 202 on an Online item, 422 on an inactive one.
  * Audit: 0 audit rows hold a sample value or name. The lines say "…as entered in the portal again, after a change for the spouse or partner… (14 answers frozen)".
  * Speed: sheet 39–47 ms, `/prepare` 61–63 ms.
  * The view still loads ticks with one query per case (`case-prepare.ts:152`), not one per item.

## Blockers
None.

## Majors
None.

## Minors (none blocking)
* **m6 · Ticks that return with a re-applying item are untested.**
  * This is the one behaviour #356's tables add for C7.3. I saw it work, but if the tick lookup or the `active` filter were broken, no check would fail.
  * **Fix:** in `check_vv_prepare_api.ts`, add a pass/fail pair: tick, then the person stops travelling (422), then travels again (same item id, tick back, current). Then change a fact while the item is off: Out of date on return.
* **n7 · The tick re-checks neither the item's `active` flag nor its channel under the case lock.** The checks run in `onlineItem` (`case-prepare.ts:276–285`), before the lock at `:261`, as they did with `removed_at`. A tick that races a person-not-travelling or a channel change can land on an item that has just gone inactive or PDF upload.
  * **Effect:** none that anyone sees. An inactive item and a PDF item ignore ticks, and the tick stays as history.
  * **Fix (optional):** read `active` and `channel` again in the transaction.
* **Carried from round 3, unchanged:**
  * n2: a parent's source is taken from the applicant (latent).
  * n3: an Online IMM 5707 still reads `to_do` "Every fact it reads is confirmed." while its sheet waits for 16 parent facts. Seen again on :4449.
  * m2 and m3: as before.
* **Note:** the G3 gap on `pdf-copy` closes when #357's C7.7 suite lands. It is not a C7.3 finding.

## D1–D20
All scores as in round 3 (`M3-E-answer-sheet/review.md`): D1 5, D2 5, D4 4, D6 5, D16 5 (m6 is a small gap), D18 4 (n2), and the rest unchanged. D17 and D20 are simulated only: no intended user walked it.

## Not checked
* No screen: C7.3 is backend only, so there was no browser, axe or zoom check.
* The other-firm 404 was not re-run; the `reach` path is unchanged.
* The `prisma migrate diff` used the migrated database, not a shadow database.

**Verdict: Approve** for commit **7595e170**. No Blocker or Major is open. m6, n7, n2, n3, m2 and m3 are Minor. The PR's first lines must still say that IMM 5707 cannot reach Done until the parents are collected.
