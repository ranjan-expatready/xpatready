# G1 (C5.4) PR 1, the migration: review of #569 at **6e119d21**

Reviewer (did not build it), 2 Nov 2026. Head 6e119d21 = origin/main f307b33c (#558 merged) + one commit: `prisma/migrations/20261102183000_g1_source_entry/migration.sql`, the `SourceEntry` model in `schema.prisma` (beside G-CORE's `ChangeSet`) and `tests/check_g1_source_entry_db.ts`.
Measured against concept BR-2, BR-3, BR-10 and BR-11, the tech lead's ⚑ points and his Sample condition on #558 (16:23 UTC), and STANDARDS principle 4 and §[M] "Migrations … recorded rollback". US$0; no app, no port, no :4400.

## Verdict: **Block**: two Majors, no Blocker.

## What I ran (on a `git archive` of 6e119d21 in the scratchpad, never in the repo)
* `createdb … xr_studio_rv569` → `prisma migrate deploy`: every migration applied; `20261102183000_g1_source_entry` sorts last (after `…180000_gcore_change_set`).
* `check_g1_source_entry_db.ts 0 xr_studio_rv569`: **8/8**.
* **Rollback as written in the comment:** one transaction, `DROP TABLE` plus `DELETE` of the migration row. The table and the row are gone; `migrate deploy` applies it again, and the suite is 8/8 again. **Correct.**
* `prisma migrate diff` (database → schema): **no drift for `source_entry`.** The only drift is old and elsewhere (`fact_source`/`person_role`/… id defaults, `canonical_field_name`).
* Direct inserts to probe the constraints, then 13 constraint mutants against the suite (results below). The database is dropped (`dropdb`, count 0).

## Answers to the questions asked
* **Additive and safe: yes.**
  * One `CREATE TABLE`, one unique index and three CHECKs. Nothing existing is altered or dropped, and no code on main reads the table.
  * The schema conflict with `ChangeSet` is resolved by keeping both models.
* **The CHECKs against BR-3 and the engine:**
  * **Kinds:** `item_kind` ∈ {check, rule, fee, threshold}, exactly the engine's `NumberKind`. Gate, form, document and question conditions map to `rule`, so nothing is missing.
  * **The answer check:** citation (URL, quote, date) XOR (None published AND a reason of 10+ trimmed characters), as concept BR-3 ⚑ writes it.
    * A cited row may not carry a reason.
    * A None-published row may carry no URL, page, quote or date.
    * The page stays optional when cited.
  * **`citation_date` DATE:** right. "Today or earlier" cannot be a CHECK (CURRENT_DATE is not immutable), so it is the API's field error.
  * **`version ≥ 1`, `updated_by`, `updated_at`:** these are the M2 ⚑ columns.
* **UNIQUE:** it **is** scoped: (`workspace_id`, `item_kind`, `item_key`, `value_path`), with the combination inside `item_key`. Two workspaces never collide. There is no foreign key on `workspace_id`, the same as G4's `test_family` precedent; see Minor 3 for what that means for Reset.
* **Rollback: correct**, and tested (above).
* **One pass and one fail per constraint: not yet.**
  * The unique index and the kind check have both; dropping either fails the suite (7/8).
  * The answer check is guarded only as a whole. See MJ-2.
  * `version ≥ 1` and `sample` have no test.

## Issues

### Major
**MJ-1 · `sample` cannot hold a Sample entry honestly. The tech lead's condition needs it to.** *Must.*
* **The condition (#558):** "a number whose entry is marked Sample passes only in the demo workspace, and only as a Demo release". Done when: "the demo's Visitor visa release still goes through … (the seed carries the entries it needs)".
* **What the CHECK allows** (`migration.sql`, `source_entry_answer_check`):
  * `sample = true` with neither a citation nor None published is **refused** (probe: `violates check constraint "source_entry_answer_check"`).
  * The seed can therefore write a Sample entry only by also claiming an official citation, or by claiming "None published – set by ExpatReady" with a reason.
* **Why that is wrong:**
  * Both claims are false for a Sample value.
  * Concept BR-10 says "None published is not Sample". P-240 gives None published the meaning "the government publishes nothing on the point".
  * The Visitor visa seed would mislabel its provenance (D18).
  * In a non-demo workspace, the wiring would have to check `sample` before the answer, or a sample-and-None-published entry would pass as a real answer.
* **Concept gap:** `concept.md` v2 has no line for `sample` at all; the column comes only from the tech lead's comment.
* **Fix (before any data is written; a later change means migrating rows):**
  * Make the answer three-way: citation XOR None-published-with-reason XOR (`sample = true`, with no citation fields and `none_published = false`).
  * Add a BR line to the concept (who sets it, what it shows: "Sample", never "None published").
  * Add a pass and a fail test.
  * If the tech lead prefers that Sample rides on one of the two answers, say which one and why, in the concept and in the migration comment. Today it is undecided.

**MJ-2 · The answer check's suite does not fail when a clause is removed. `version ≥ 1` has no test.** *Must.*
* **What happens:** each fail case breaks several clauses at once. The "citation without its words or date" case has a null quote and a null date; the "both at once" case sets every citation field.
* **Mutants (in a scratch database):** I removed **one clause at a time**, and 9 of 10 left the suite at 8/8:
  * cited: URL not null, quote not null, date not null, reason null;
  * None published: btrim, URL null, page null, quote null, date null.
  * Only lowering 10 to 1 fails it (7/8).
  * Dropping `source_entry_version_check` also leaves 8/8.
* **So:** a citation with no URL, a reason of 10 spaces, or a None-published row carrying a quote could come back unnoticed.
* **Fix:** one-field-off inserts, each expecting `source_entry_answer_check`:
  * a citation missing only its URL, only its quote or only its date;
  * a citation with a reason;
  * None published with a reason of 10 spaces;
  * None published with only a page, or only a quote.
  * Plus version 0 → `source_entry_version_check`, and a pass that bumps the version.

### Minor
1. **Database half of "checked twice" (STANDARDS principle 4).** The probe stored all of these:
   * an empty URL and quote, `http://x` and `javascript:alert(1)` as the URL;
   * a 5,000-character quote and page, a 2099 date;
   * an empty `value`, and an empty `item_key`/`value_path`.
   * The engine reads a blank citation as unanswered, so nothing passes wrongly. But BR-3's https and length rules exist only in the coming API, and a `javascript:` link would reach PR 2b's link.
   * The challenge (M2 fix) proposed "url `https://…`" in the CHECK.
   * Cheap now: `citation_url ~ '^https://\S+$'`, `btrim(citation_quote) <> ''`, `char_length(citation_quote) <= 300`, `char_length(citation_page) <= 200`, and non-blank `value`/`item_key`/`value_path`.
2. **Engine follow-up for PR 2a.** `SourceEntry.none_published` still accepts `true` (build note 12). The table now requires a reason, so narrow the type to `{reason}`.
3. **Wiring notes for PR 2a** (not faults in this PR):
   * Reset must delete `source_entry` (challenge m7), because there is no foreign key or cascade.
   * Prisma returns `citationDate` as a `Date`, so give the engine `toISOString().slice(0,10)`.
   * `item_key` holds the combination *key*, so a re-keyed combination leaves its entries "No longer used".

## What holds
* Additive; correct rollback.
* Kinds equal the engine's.
* The XOR matches BR-3 ⚑ exactly, including the trimmed 10-character reason.
* Unique per workspace and address (BR-2).
* The M2 version columns are there.
* No drift.
* The suite's usage line fits `run-suites.sh`, in the screens port range (4449).

## Could not check
* The tech lead's SQL read.
* CI on this head.

**Verdict: Block.** To fix:
* **MJ-1:** decide and encode what a Sample entry holds (recommended: a third answer in the CHECK, plus a concept BR line and its tests).
* **MJ-2:** one-clause fail cases, and a version test.

Then fix Minor 1, or list it in the PR with the reason it waits for the API.

## Round 2: head **f13c4228** (answers MJ-1, MJ-2 and Minor 1)
I reran on a fresh database (`xr_studio_rv569b`) from a `git archive` of f13c4228: `migrate deploy` OK; suite **19/19**; the rollback in the comment works and redeploys cleanly; no drift for `source_entry`; database dropped.
* **MJ-1 fixed.** `source_entry_answer_check` is three-way: (a) cited, not Sample, no reason; (b) None published with a trimmed reason of 10+ characters, no citation field, not Sample; (c) `sample = true`, with no citation field, no flag and no reason. Concept BR-3 and BR-10 now define Sample as "no source claimed", never None published.
* **MJ-2 fixed.** Every clause has a one-field-off fail case; version 0 is refused. **My own mutants: 13 of 13 fail the suite** (18/19 each):
  * answer check: (a) URL not null, (a) not Sample, (a) flag off; (b) btrim, (b) not Sample; (c) flag off, (c) no reason;
  * citation check: `https?`, the no-space class widened to `.+`, the quote's btrim, page ≤ 200;
  * keys check: value not blank, address not blank.
  * With everything restored: 19/19.
* **Minor 1 fixed.** `source_entry_citation_check` refuses non-https or spaced URLs, blank or over-long quotes and pages; `source_entry_keys_check` refuses blank keys and value. "Date not in the future" stays the API's, stated in the comment.
* **Minor (records, for PR 2a; not blocking):** concept BR-10's old bullet "Not built in G1 (m2): a Sample value blocks a real release … waits for a second workspace" (`concept.md:39`) now contradicts its new first line and the tech lead's Done-when (the same content in a non-demo workspace is refused, each item named). Rewrite it when PR 2a wires the condition.
* Minors 2–3 of round 1 stay as wiring notes for PR 2a.

**Verdict (f13c4228): Approve.** No Blocker or Major is open.

**Round 3, head 3f3db012: Approve.** Fresh database `xr_studio_rv569c`: deploy OK, 19/19. Putting `btrim` back fails the suite: on the keys 18/19, on the reason 18/19 (restored: 19/19). The concept BR-10 line now matches the tech lead's Done-when. One non-blocking note: the database collation is C, so `[[:space:]]` does not count NBSP or U+3000 as blank, while the engine's JS `trim()` strips them. That is the safe direction (the engine still lists such a quote as unanswered), but the migration comment's "as the engine's trim()" covers ASCII whitespace only.
