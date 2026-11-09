# Review: row C4 pack 4 of 4, C7.7 on the configured checkpoint (PR #1317)

Independent reviewer (P-303). I reviewed commit 8a888491fda10c31ff7a02f665e920d52c561f8d, diff `152759210..8a888491f`. This
is a test-pack change, not a screen, so the screen-review scorecard (D1–D20, BIC) and the journey score do not apply. **Journey
score: N/A.** No screen or user journey changed, and the tech lead scoped this review to the code and the record.

## What I checked
* **Re-ran the pack once.** I used my own isolated copy on :4436 (`rv_c77`), with Demo › Reset and then Load configured
  (85 s). I ran `tsx studio/acceptance/C7.7.test.ts 4436 xr_studio_rv_c77`. Result: **31/33, exit 1**. The two FAIL lines are
  -16 and -18, and every step matches `runs/C7.7-checkpoint-branch.txt`. Live AI was off and the run cost US$0. I stopped and
  removed the copy afterwards.
* **Scaffolding put-back, measured.** I recorded `id, sha256, md5(snapshot::text)` and the form and field-map counts for all six
  `config_release` rows before the run and again after it. The two lists are identical. After the run, no
  `c77_scaffold_*` table is left. The case's release was `eaac7779…` (release 2). Before the run it held 7 form lines and 7
  field maps (IMM 5257 Online, IMM 5257 SCH1, IMM 5409, IMM 5475, IMM 5476 HAND_SCANNED, IMM 5645, IRM 0002). This matches
  C7.7.md and the -15 arithmetic: adults have 3 lines to fill and 4 waiting, children 1 and 3, so 22 in all.
* **SQL.**
  * `mapsWithout` (C7.7.test.ts:164) keeps the array order (`jsonb_agg … order by i` with ordinality), and its `coalesce`
    keeps entries whose form_number is NULL.
  * The put-back (C7.7.test.ts:188) restores the release from an exact jsonb and sha256 copy, so ordering does not matter.
  * `psql -c` runs a multi-statement string as one implicit transaction, so `update …; drop table` is atomic. The backup is
    dropped only when the restore succeeds.
  * The table name `c77_scaffold_${run}` uses `run = Date.now().toString(36)` (`lib/m3.ts:26`). That is `[0-9a-z]` behind a
    letter prefix, so it is a safe identifier with no quoting needed.
  * The old `snapshot->'forms' || snapshot->'field_maps'` precedence bug is real. `->` and `||` share a precedence level and
    associate left to right, which gives `((snapshot->'forms') || snapshot)->'field_maps'` = NULL. Its fix reads each array
    on its own (`writes`, C7.7.test.ts:142).
* **Product-gap claims (-16, -18): supported by the code.**
  * -16: `p5/transforms.ts` handles `check_code:`/`yes_no_code:` (line 143) and `derived:checked_if_true|false:` (line 146).
    It has no `check_if_no:` form, so that step falls through to line 177, "step … is not in the executable set". The log's
    by-hand boxes are IMM 5645 SectionB Child Yes/No, holding `relationship.accompanies_subject_to_canada`, which the case
    holds.
  * -18: `hand_write` appears in no file under `engine/`, `api/src` or `p5/`; its only occurrence is C7.7.test.ts. Neither
    `WarnCode` (`engine/runtime/readiness.ts:38`) nor any warn() call covers it. `api/src/fill-case.ts:209` computes `by_hand`
    for the copy view only, and nothing passes it to readiness.
  * These are product gaps, not pack issues. On the fixture, -18 passed only because the copy has no by-hand lines (log -17
    `[]`), and C7.7.md says so.
* **Weaker checks: none on either data set.**
  * -1 and -2 are still exact list equality, now against `expectedLines`. The fixture prints the same lists as main.
  * -15 is still exact: inDb must equal a count derived on its own, with `formCount > 0` guarding it. The fixture still gives 8.
  * -8 and -14 use a real PDF-upload line (SCH1 on release 2, TYPED_NAME) and now require the item to exist.
  * -21 now requires the spouse's line to keep its configured channel and not be Paper. That is the old intent, without the
    channel written in.
  * -10, -16, -19 and -25 gained `!!name` guards.
* **P-319.** No form number or channel is written into a check outside Part 3's QA-235 scaffolding inputs. The one exception
  is -25's `"PDF_UPLOAD"`, which states IRCC's rule for the hand-signed form, the same way accepted C11.6-4 does.
* **P-330 (7).** No step was dropped. The pack still has 33 lines, and the step words of -27 to -32 are unchanged.

## Findings
### Blocker
None.

### Major
None.

### Minor
1. **The "an unread name picks no item" guarantee does not reach Part 2's helpers.** See C7.7.test.ts:96–97 (`toPaper`,
   `line`) against the claim at lines 37–39 and in C7.7.md ("a step that reads it fails").
   * `toPaper` and `line` call `itemsOf(q, P, form)[0]` directly, not `one()`. With an empty `BC`, `itemsOf` returns every
     item of the principal.
   * Scenario: a Visitor visa release in which the principal has no barcode-form line, so BC is "". Then -24
     (C7.7.test.ts:115) reads the principal's first item, which has no steps. Its `.every()` over an empty list is true, and
     -24 **passes on another item**.
   * -19 still fails through `!!BC`, so the pack exits 1 and the gate is not fooled. Every current data set has IMM 5257, so
     neither run is affected.
   * Fix: build `line` and `toPaper` on `one()`, or add `!!BC &&` to -20, -22, -23, -24 and -26 (and `!!HS` before calling
     `toPaper(HS)` at line 116).
2. **-2 checks the age rule on half the cases** (C7.7.test.ts:44).
   * K10 is checked only against FAM and K15 only against HS. With FAM or HS unread (""), `!includes("")` is true.
   * Scenario: a release that gives the family form `min_age` 12. K15 then gets the family form, and -2 still passes,
     although its words say "the family form … 18 or older".
   * Fix: `!!FAM && !!HS` and check both children against both forms.
3. **-18 passes vacuously when FAM is unread** (C7.7.test.ts:91).
   * With FAM "", `c5707` is undefined and `shown` is undefined, so `(shown ?? []).length === 0` passes. The new `!!FAM`
     sits only in the second disjunct.
   * This is inherited structure: the original also passed when the copy failed. -16 and -17 fail in that case, so the pack
     stays red.
   * Fix: `!!c5707 && Array.isArray(shown) && (…)`.
4. **-32 does not assert that the backup table is gone** (C7.7.test.ts:191). The task requires "leave nothing behind", but
   the run only proves it indirectly, through the restore and drop sharing one transaction.
   * Scenario: the scaffolding changes nothing (the release already writes all three lines and both maps and has no IMM 5409
     map). A failed restore statement would then leave sha256 equal to wasHash, -32 would pass, and the table would remain.
   * I measured 0 tables left in my run.
   * Fix: add `sql("select to_regclass('${KEPT}') is null") === "t"` to -32.
5. **Same-millisecond runs can drop each other's backup** (C7.7.test.ts:166). If two runs on the same database start in the
   same millisecond, `create table` fails for the second run, and line 166's `drop table if exists` removes the first run's
   backup. This is theoretical, since each isolated copy has its own database.
6. **One record claim has no saved log.** C7.7.md says "release 2 had 5 form lines instead of 7" after main's run. No file
   under `runs/` holds that measurement. My run confirms the 7 before; the 5 is consistent with removing SCH1 and IMM 5409.
   Saving the query output, or marking it "measured, not logged", would make it checkable.

## Could not check
* The fixture run (`setup_visitor_visa.ts` + `setup_vv_m3.ts`). I relied on `runs/C7.7-fixture-*.txt`.
* Gate B's own run. I relied on the log in `runs/C7.7-checkpoint-branch.txt`.

Verdict: Approve 8a888491fda10c31ff7a02f665e920d52c561f8d
