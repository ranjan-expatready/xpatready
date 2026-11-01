# Break report: X2b slice (b), POST /lines/bulk and batch Undo

Branch `claude/screens-x2b-apply` at 04bac96f. Isolated copy `screens_brk` on :4447 (database xr_studio_screens_brk), sample loaded with reset + load. 500 extra combinations were added by SQL (cloned from Visitor visa) for the volume and race runs. Rules only, US$0. Code: `prototype/studio/api/src/lines-bulk.ts` (written L below). Spec: `concept-draft.md` §3, BR-C2 to BR-C4.

Totals: 0 Blocker, 2 Major, 8 Minor.

## Findings

### M1 (Major): a bulk apply deadlocks with a single add of the same line, and one side gets a 500
* **What I did:** started a 500-target apply of IMM 5476. While it ran (0.3 to 1.5 s in), I called `POST /combinations/<last target>/forms {"formKey":"IMM 5476"}`. I repeated the same test with a document line (`job_offer_letter:principal_applicant`) and `POST /combinations/<id>/requirements`.
* **Expected:** the apply refuses with a 409 "Changed since the preview" that names the target, or it waits and then refuses.
* **Actual:** in 4 of 4 form runs, the whole 500-target apply failed with 500 "Something went wrong on the server". In the document runs, one side or the other got the 500. The PostgreSQL log shows `deadlock detected ... while locking tuple in relation "combination" ... FOR KEY SHARE`.
* **Cause:**
  * L181 takes `FOR UPDATE` on the combination rows.
  * The single insert writes its unique-index entry (combination, lineage, version) first. Its foreign-key check then waits for `FOR KEY SHARE` on the same combination row.
  * The apply then inserts the same key and waits for the single insert to finish. Each waits for the other.
  * The catch at L200-206 handles only P2002 on `line_batch`. A deadlock (40P01) or a P2002 on a line row comes back as a raw 500.
* **Side effect:** while an apply runs, every single add on any ticked combination waits for it. A 500-target apply holds the locks for about 4.7 s. A queued second apply waited 9.3 s.

### M2 (Major): re-adding a form that was removed earlier brings back the target's old line, not the copied one (BR-C2)
* **Setup:**
  * Applicant outside Canada: a draft-only removal, IMM 5475 v1 RETIRED with no supersedes.
  * High-wage position: a released removal, v1 SUPERSEDED with v2 RETIRED over it.
  * Both old lines: each applicant, always, 3 copies, minimum age 18, own source quote.
* **What I did:** `add` IMM 5475 from With an LMIA (principal applicant, "only if", 1 copy) to both.
* **Expected:** either the source's line is copied (BR-C2), or the preview says the target's own line returns (as it does for a draft removal of a released line: "its released line returns … not as the line you chose").
* **Actual:**
  * The preview said `WILL_ADD` with no reason.
  * After apply, both targets had each applicant / always / copies 3 / minimum age 18 / "old own line" source quote.
  * The settings come from `addFormLine`'s second and third branches. L220 copies the source settings only when `!before.length`. L126 detects a restore only when the row before was PUBLISHED.

### m1 (Minor): reusing an idempotency key with different targets returns 200 "replayed"
* **What I did:** reused key `same-key-5707` (first used for Visitor visa and Super visa) with `include: [Study permit, Applicant outside Canada]`.
* **Result:** 200, `replayed: true`, "IMM 5707 added to 2 combinations". The body lists the first request's targets, and nothing changed on the new ones.
* **Cause:** L254 compares actor, op, kind, key and source, but not `combinationIds` or `include`. A different line or op is correctly refused with 409 "Key used".

### m2 (Minor): replaying a batch that was undone still says it was added
* **What I did:** undid batch ef227911, then re-sent key `k-par-0003`.
* **Result:** 200, "IMM 1295 added to 3 combinations (draft changes in each)", `replayed: true`. None of the lines exist. Replay (L253-260) does not read `undoneAt`.

### m3 (Minor): a remove apply racing an Undo of the same targets gives a misleading 404
* **What I did:** started the Undo of a 500-target add, then fired a 500-target `remove` of the same line 0.15 s later.
* **Result:** the remove got 404 "Not found (it may have been removed by a reset)". The Undo deleted the draft row, so `revise`'s `update` in write() (L224) hit P2025. The data stayed consistent (everything rolled back), but the reply should be 409 "Changed since the preview".

### m4 (Minor): a batch Undo can leave the combination's own Forms-tab Undo stuck
* **What I did:** added IMM 5488 in a batch. On Super visa I made two Forms-tab edits that cancel out (who → each applicant, then back). Then I ran the batch Undo, which returned 200.
* **Result:**
  * The two `edit` steps in `form_line_action` stay live (L328 spends only the steps that carry the batch's id), but they point at rows the Undo deleted.
  * `POST /combinations/<Super visa>/forms/undo` now always answers 409 "One of these forms was changed after that step". Older steps on that combination (an IMM 5707 batch step) can no longer be reached.

### m5 (Minor): the batch Undo changes a retired combination
* **What I did:** batch add to Visitor visa and Bulk 3, retired Bulk 3 by SQL, then ran the Undo.
* **Result:** 200, and Bulk 3's line was deleted. BR-C1 and BR-C3 say "nothing in it changes", and other edits refuse retired combinations (studio.ts:54). undo() (L265-331) never reads `retiredAt`.

### m6 (Minor): the Undo is exact except that it rewrites updated_at on rows it never changed
* **What I checked:** `row_to_json` diffs before and after Undo, for the IMM 5475 case in M2 and for a document removal (custom key `passport-custom` plus duplicate `passport-dup`).
* **Same as before:** every column (id, version, status, supersedes, channel, signature, copies, minimum age, signer, predicate, alternatives, note, position).
* **Different:** `updated_at`, including on the untouched PUBLISHED and SUPERSEDED rows. L319-323 upserts every row in `before`, which also writes to released rows.

### m7 (Minor): the migration does not fully meet STANDARDS §5 and §3.4
* **Meets §5:** it is expand-only (a new table) and records its rollback ("DROP TABLE").
* **Gaps:**
  * `idempotency_key` is unique across the whole database, not scoped to its parent (`workspace_id`).
  * `op` and `kind` are free TEXT with no CHECK (add/remove, form/document).
  * `workspace_id` and `source_combination_id` have no foreign key. The migration says why, but §3.4 asks for checks at the database level.
  * The rollback note does not mention the `batch_id` that `form_line_action.detail` keeps pointing at.

### m8 (Minor): the write loop makes about 10 queries per target (STANDARDS §5 "no N+1")
* **Measured:** write() (L211-250) runs addFormLine, updateMany, recordAction, two snapshots and audit for each target. 500 targets took 4.7 s inside the locked transaction (180 targets took 1.8 s).
* **Why it matters:** this is what turns the lock window in M1 into seconds.

## Held
* **Parallel applies:** three applies with different keys on the same targets gave one 200 and two 409s naming each target. No duplicates.
* **Same key sent 4× at once:** one batch; three replays with the same batchId.
* **Parallel Undos:** four of the same batch gave one 200 and three 409 "Already undone". The audit has 2 rows, one per target.
* **Undo racing the combination's own Undo (5 runs):** always exactly one wins, and the batch Undo names "its own Undo on its Forms tab".
* **Remove apply first, Undo racing it:** the Undo was refused, naming Bulk 1 "IMM 5707 removed".
* **Undo after the combination's own Undo, a Forms-tab edit, or a release:** refused with the target named. The release case was simulated with a `config_release` row.
* **Authorisation:** user-B, user-C and user-O get 403 on apply and Undo. A missing actor gets 401.
* **Malformed ids:**
  * Bad uuid in the body: 400.
  * Unknown uuid: 404.
  * Undo id that is 36 dashes, ends in "g", has a trailing space or is 5000 characters: 404.
  * Undo id in upper case works.
* **Bad keys and selections:** a short or missing key gets 400. A ticked id that was not previewed gets 400. An array body gets 400.
* **Targets that cannot change:**
  * A retired combination is refused with 409.
  * The source as a target is refused with 409.
  * A WAITS target is written. Its submission becomes stale, the same as after a single edit.
* **Channels:** Not needed with no account record is "cannot" for every target. A PDF upload line on a paper-filing target is "cannot". Paper with pen, 3 copies, minimum age and signer copy exactly.
* **Document lines:** custom lineage keys and duplicate type+who lines are both removed, and both come back on Undo.
* **Volume:** 180 and 500 targets apply in 1.8 s and 4.7 s and undo in 0.5 s and 1.1 s. That is well inside the 60 s apply and 5 s Undo transaction timeouts, even with three 500-target applies running at once.
