# Review: G4 part 1 (C5.7), answer-key families and runner (commit ea426ad4, branch claude/loving-franklin-k30mje)

Reviewer: a separate context that did not build this. Scope: part 1 only (engine, data, API, check), checked against `concept.md` (BR-1 to BR-8, §2b, §6, §6c), `challenge.md` (M1 to M5, m1 to m5), `STANDARDS.md`, `EXPERIENCE.md` and `QUALITY.md`. There is no screen in this part, so missing UI is not a finding. Journey test: `journey-test-reviewer-2026-11-02.md`, **8/10, pass**.

**Verdict: Approve.** No Blocker and no Major. Six Minors (all Should); none of them gives a wrong pass or lets wrong data in.

## What I ran (isolated copy `forms_g4r` on :4451, never :4400; live AI off; US$0)
- `tests/check_g4_answer_keys.ts 4451 xr_studio_forms_g4r`: **57/57 PASS**, three times (20 s on a fresh copy, then 4 s twice). Stable on rerun.
- Value-step regressions on the same copy: `check_c72_imm5257_fill` 38/38, `check_forms_slice2b` 36/36, `check_forms_c31_formats` 107/0. `check_forms_slice2` gave 41/41 on a fresh copy. It fails 3 lines when run after the Visitor visa setup, because it expects no IMM 5257 in the library: that comes from the order the checks ran in, not from this PR.
- `graph.mjs`: G1 0, G2 0, G4 0, G5 0. G3 (7) and G6 (3) name no G4 route or module: every new route is reached by the check.
- **Migration.** Additive only: three `CREATE TABLE`s, indexes, foreign keys and CHECKs, and no existing table is altered. After deploy, `prisma migrate diff --from-config-datasource --to-schema` has no line on `test_family` or `answer_key*`. The other drift lines it shows were already there before this PR. The written rollback, run inside a transaction that I then rolled back, succeeds, and `combination` is untouched. The CHECK refuses `result 'MAYBE'`.
- **Demo reset** with 3 families, 5 keys and 13 runs: 201, then 0/0/0 rows. The added line in `demo.ts:476` works.

## Special scrutiny
- **formValues = the old inline writeForm code.** I diffed origin/main `fill.ts:35-61` against `engine/form-values.ts:23-47` with leading spaces removed. The only differences are type annotations (`any` → `InventoryBox`/`BoxResult`), `cov.boxes` → `covBoxes`, and the inventory read staying in `writeForm`. The logic is the same line for line, and the fill checks above stay green. **Met.**
- **AMENDED is honest.** E1's `values.complete.json` was last changed by the 29 Oct merge (#98), before this PR, and this PR does not touch it. The key is E1's 67 values plus 16 named amendments. The check pins that E1's values as they stand fail on **exactly** those 16 (`check:101`), so a quiet copy of the product's output would break the check. The amendments are also disclosed in concept §6c and in ASSUMPTIONS C10 as at ea426ad4 (c48cde00 moves C10 to the PR as a proposal), and the check prints them. One caveat: 7 of the 16 adopt map output that E1's own form contradicts (Minor 2).
- **Staleness (BR-5).** The run stores the key version, the item fingerprint, and an inputs fingerprint (the whole draft snapshot plus the sha256 of the form field list). A family edit bumps every key's version. Checked live: I relabelled an eligibility gate and the key went PASSED → NOT_RUN ("Not run since the item changed"). The check covers map, key, field-list and answer-list changes.
- **Duties.** The officer gets 403 on read, write and run. Client A 403, nobody 401. The approver user-B reads (200) but gets 403 on family write, run and sign. The expert user-C enters keys and signs, but gets 403 on family write. The author gets 403 on sign. A sign with `version:"1"` gets 409. Two signs at once: one 200, one 409. Four creates of the same family at once: one 201 and three refused (400/409), never a 500 or a duplicate.

## Issues (ranked; all Minor, Should)
1. **BR-6 edge: a key update without `edition` silently re-targets the key to the current edition.**
   - Where: `engine/answer-keys.ts:146` (`str(b.edition).trim() || m.form_edition`), used by `PUT /answer-keys/:id`.
   - Live: a key written for "IMM 5257 (01-2020)" fails its run in words. A PUT that leaves out `edition` then stores "IMM 5257 (09-2023)", and nothing says so.
   - Fix: on update, keep the stored edition unless one is given, or refuse a changed edition without a reason.
2. **7 of the 16 amendments adopt map output that E1 contradicts.**
   - E1 has `SameAsCORIndicator = Y` and `SameAsMailingIndicator = Y`, yet the key expects the country where applying and the five residential-address boxes to be written (`check:56-59`). These are likely map defects that the passing key now treats as correct.
   - The stored key carries no mark on these boxes. Once it is in the product, an expert signing in part 2 cannot tell them apart from E1's checked values.
   - Fix: make sure the PR's expert questions list all 16 (I could not read the PR body), and carry the "amended" reason with the key before anyone signs it (part 2).
3. **STANDARDS §6 [M] "Contract first": not met yet.** There is no `contracts/answer-keys.ts` zod schema (other features have one, for example `contracts/eligibility.ts`); validation is written by hand in the engine. It was deferred to part 2 in concept §8 (challenge m4). It must land with part 2 at the latest.
4. **Guards no test fails without.**
   - Removing the version `WHERE` in the family save transaction (`api/src/answer-keys.ts:97`) or in the sign (`:184`) fails no line: the stale tests send `version: 0` and stop at the earlier check.
   - The retired-combination 409 (`:147`) and the approver-run 403 are not tested either.
   - Fix: add a two-at-once save line and those two fail lines.
5. **Family save race.**
   - The signed-key count and the reason check (`api/src/answer-keys.ts:93-95`) are read outside the transaction. A key signed between that read and the save goes back to Draft with the reason "Family changed: " and nothing after it.
   - Fix: count inside the transaction, or refuse the save there when it finds a signed key.
6. **Plain words on a line.** A line's label is the raw map caption, so the date-of-birth year line reads "YYYY". This is a note for part 2: the screen's "Box (caption) · Person" should give the plain name.

## Standards [M] (part 1 scope)
| Line | Result |
|---|---|
| Engine has no I/O | Met: the check scans imports, and the engine has no `fetch`, `Date.now()` or `new Date()` |
| Optimistic concurrency, 409 naming who | Met (Issue 4: the guards are untested) |
| Idempotent creates | Met: unique (workspace, key) and (family, combination, kind, ref), refused 400/409 |
| Migration preserves records, rollback recorded | Met: additive, rollback rehearsed |
| Indexed reads, no N+1 | Met: `answer_key(combination_id)`, `run(key_id, ran_at)`; list in 90 ms |
| Personal data never logged | Met: audit lines hold keys and counts, and the check proves no values appear |
| Problem Details with field errors | Met (400/409); 403/404 use the app's usual `fail` |
| Authorisation on the server, deny by default | Met: see Duties above |
| Contract first (zod) | **Not met yet**: Issue 3 |
| A rule's test fails when the rule is removed | Mostly met: BR-1 to BR-7 each have pass and fail lines; gaps in Issue 4 |

## D1–D20 (1–5; part 1 is API and engine only)
D1 5: every BR has a behaviour and a pass and a fail line · D2 4: duplicates and stale saves refused; edition re-target (1) · D3 5: one value step shared with the fill · D4 4: rows with gaps, people who are not travelling, unknown gates refused · D5 4: reset, double sign and double create hold; family race (5) · D6 4: signed by, at, change reason, versions; audit · D7 n/a (no AI, US$0) · D8–D13 n/a (no screen; part 2) · D14 4: team model names mapped in §2b · D15 5: run 95–140 ms · D16 4: 57 lines; untested guards (4) · D17 simulated only · D18 4: E1 provenance and amendments disclosed (2) · D19 n/a until G2 · D20 simulated only.

## After ea426ad4
The branch head c48cde00 only removes ASSUMPTIONS row C10, a records file: no code, migration or check changes. So the review holds, provided the PR carries C10 and the 16 amendments as its proposal (Issue 2). The builder's pkill of `studio/tests/check_*` did not reach my runs: all three finished with a summary, and a fourth run afterwards on :4451 gave 57/57 again. I did not review the merge of origin/main that comes next: per the way of working, a later push needs a new review.

## Retrofit mapping
Recorded: concept §2b (team `TestFamily`/`AnswerKey`/`AnswerKeyRun` → ours, with our additions marked), plus the lift package.

## Could not check
The PR body (to confirm it lists the 16 expert questions); any UI (part 2); a real expert's reading of the amended values. Running the other suites also rewrote tracked evidence files in this copy (`studio/evidence/forms-slice2*`, `p2/runs/stub-pass/*`, `p2/screening/canary-digest.json`). Other tracked files changed during the session too (W1 screenshots, ai-orchestration evidence). Restoring them was refused by permission, so they are left modified and uncommitted.

**Verdict: Approve**

## Re-review 3a3cf527
I read `git diff ea426ad4..3a3cf527 -- prototype/studio`. That holds the fixes (`f2ea8988..3a3cf527`: `engine/answer-keys.ts`, `api/src/answer-keys.ts` and the check) and the merge of origin/main.
- **The merge breaks nothing G4 relies on.** Its only change to an engine file the runner reads is `engine/render.ts`: a new `asked` flag on questionnaire rows and a `factName` helper. Neither touches box coverage. Its other changes (`contracts/workspace.ts`, `runtime/questionnaires.ts`, web pages, qa checks) are not imported by G4. No migration, schema, `fill.ts` or `form-values.ts` changes.
- **Ran it** on fresh copies on :4451. `check_g4_answer_keys` passed **73/73** on four runs, three of them on fresh copies. `check_c72_imm5257_fill` 38/38, `check_forms_slice2b` 36/36. `graph.mjs` names no G4 route or module.
- **Break M1 fixed.** The family save now locks the family's keys (`SELECT … FOR UPDATE`), refuses a sign that landed first unless a reason is given, and unsigns and versions every key in one `UPDATE` (`api/src/answer-keys.ts:103-106`). My own 20 tries of a family save racing a sign: **0 keys left Signed after their family changed** and 0 empty reasons. With no reason, a sign that wins gets the family save refused (400); with a reason, the key returns to Draft as "Family changed: race".
- **Break M2 fixed.** `gone()` (`engine/answer-keys.ts:248-252`) adds a failing line for expected values about a person no longer in the family (or no longer travelling, for rules). Live, I replaced the principal: the run failed on that person's line.
- **My Minors.**
  - **1 fixed:** an update that names no edition keeps the key's own (`api/src/answer-keys.ts:176-177`), with a fail line in the check.
  - **4 fixed:** two-at-once sign and family-save lines, the approver-run 403, and the retired-combination 409 for change and sign.
  - **5 fixed** with M1.
  - **6 fixed:** a line's label is now the heading plus the caption.
  - **2** is moved to the PR's expert questions and **3** (zod contract) to part 2, as recorded. That is accepted for part 1: the [M] contract line must be met in part 2.
- **Break minors.** m1 (the PUT guard includes the state), m2 (422 with no form field list), m3 (edition capped at 60), m4, m5, m7 (depth, NUL, invisible text and line separators refused), m6 (one error, stops early), m8 (`constructor` refused; own keys only), m10, m11 (partly: a principal who stays home, person fields about `case`, a "none apply" given twice) and m12 (400 on `family_id`) are each fixed with a check line. One gap: m9's run on a retired combination still returns 200. It changes no key and is a read-like action, so it is not a finding.
- **New Minor (Should): the check is no longer rerunnable on the same copy.** Its last lines set IMM 5257's `inventory_file` to NULL and retire `vv.single` without putting them back (`check_g4_answer_keys.ts`, last block). A second run on the same copy crashes at `:39`, and a later suite on that copy (`check_c72` gave 409) fails. Fix: restore both at the end. Not blocking: the suites start a fresh copy.
- **Note:** the engine now imports `contracts/runtime.ts` (zod) for `INVISIBLE`/`LONE`, so add it to the lift package list in concept §2b.

No Blocker or Major is open.

**Verdict: Approve** (commit 3a3cf527)
