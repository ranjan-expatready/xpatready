# Review: G-CORE B1, the rules check, risk table and preview (P-253, P-266)

Reviewer: a fresh agent that did not build it. Commit reviewed: **b5f5180d** (local branch `gcore-b1`) against the SH2 head **74bbb717** (approved). Read: `concept.md` v2, `challenge.md`, the tech lead's decisions on #504 (Q1 → P-266 "second person" for a rename of a field a released combination uses, other renames direct per P-96; Q2 rename roll-back in B2; Q3 the expert signs at release review as today), #509 Q1 (refuse a chain longer than four hops). B2 and B3 scope is not asked for here.

## What I ran (US$0, no `*_LIVE`, never :4400)
* `check_gcore_engine.ts` **61/61**. `check_gcore_check_api.ts` on isolated `forms_gcore_rv` :4457 **26/26**. `check_sh2_where_used.ts` 24/24. `check_s6_library_sources.ts` on :4458 **39/39** (renames unchanged).
* `tsc --noEmit -p api/tsconfig.json`: no error in the new or changed files. `count-any.mjs --against 74bbb717`: 427 = 427.
* `prisma migrate diff` from the migrated database to `schema.prisma`: nothing for `change_set`. The drift it lists (4 id defaults, `canonical_field_name`) was there before this PR.
* 33 mutants on a scratch copy of `engine/change-set.ts`: **26 killed, 7 survive** (Major 4).
* Probes on :4457 with planted rows (below). Timing: one item 45–120 ms, 50 renames 235–275 ms.

## Concept fit and the points asked
* **Purity (P-249): met.** The engine imports `contracts/programs.ts`, its own contract and `engine/where-used.ts`, which imports `./programs.ts` (type-only imports of `validate.ts` and `snapshot.ts`). The verifiers are passed in.
* **Migration: met.** One `CREATE TABLE`, 2 indexes, 3 `CHECK` constraints that match the model's comments, and the rollback recorded. The demo reset clears the table.
* **Chain rule (#509): met.** It is refused at 5 hops and allowed at 4, which matches SH3's `MERGE_HOPS = 5` keys, and the fail test is named as asked.
* **Preview groups: met.** The six groups are listed; open cases are grouped by `pack_work_pin` release. The check writes nothing (the tests count rows).
* **R3 mirror: not met** (Major 1). **Merge "new problems only": partly met** (Majors 2 and 3). **riskOf: met for P-96/P-266, not met for Q3** (Major 5). **Fingerprint: unstable** (m1).

## STANDARDS [M] lines that apply
* §4 engine without I/O: **met**. §4 optimistic concurrency: B2.
* §5 additive migration with rollback: **met**. §5 no N+1: **minor gap** (m9).
* §6 zod contract, Problem Details 400, server authorisation (`readerOf`: 401 with no actor, 403 for a case officer, probed): **met**.
* §7 strict TS, no new `any`: **met**. §7 property tests when the engine changes: **met** (3 properties).
* §7 "a rule's test fails when the rule is removed": **not met** for 6 rules (Major 4).

## D1–D20 (no screen in B1; only the dimensions it touches)
D1 Requirement fit 3: R8 on merges and the expert words miss BR-2 and Q3. · D2 Data integrity 3: R3 is weaker than today's rename door. · D4 Rule integrity 2: a merge that makes a condition never true, or a question loop, passes. · D7 AI trust: B3. · D15 Speed 5: under 300 ms for 50 items. · D16 Testability 3: 6 rules have no failing test. · D17, D20: simulated only (no screen). D8–D14, D18, D19: not applicable to B1.

## Blockers
None.

## Majors
1. **R3 does not keep today's scope for a field rename (nor for `sameInLibrary`).** `libraryOf` keeps only the newest version (api/src/change-sets.ts:81), and `duplicate()` checks only that (engine/change-set.ts:59, :68-69). Today's door checks every DRAFT or PUBLISHED row of the group (library-sources.ts:178-179), so an older published name still counts; `sameInLibrary` does the same (proposals.ts:72).
   * Probe: I renamed `person.biometrics_required` to a draft name (v2 DRAFT over v1 PUBLISHED "Biometrics Required"). Renaming `person.caregiver_care_types` to "Biometrics Required": `PATCH …/name` answers **409 "is already the name of …"**, while `POST /change-sets/check` answers **ok: true**.
   * Answer lists differ too (engine/change-set.ts:53, :70): the engine folds case and trims, and does not leave out the lists that ride with a draft field. `listIdentity`/`ridingLists` (proposals.ts:37-39, :59-66, :83) do both, and the test at check_gcore_engine.ts:57-58 asserts the folding.
   * **Fix:** carry every live version's label and aliases (`names[]`) on `LibField` and `LibSection`. Match answer-list codes exactly, and pass the riding lists in. Add one fail test with two versions and one with a riding list.
2. **The merge rewrite reads the wrong version of a condition.** `fieldReaders` picks the current rows, but the tree is then looked up with `rows.<x>.find(key, combination)` over every version (api/src/change-sets.ts:142-146). That returns the first row found, usually v1 PUBLISHED, not the current draft.
   * Probe: rule R-24 v1 PUBLISHED reads only `case.applying_for_pgwp`. Its v2 DRAFT reads `pgwp = true and employer_obtained_lmia = false`. Merging `employer_obtained_lmia` into `applying_for_pgwp` gives **ok: true, no problems**.
   * With v1 deleted, the same merge is refused: "R5 … asks Applying For Pgwp to be both true and false (Rule R-24 …)".
   * Every edit of a published rule makes such a draft (`revise`, core.ts:133), and a merge makes them too.
   * **Fix:** look the tree up in `current(rows.x, key)` (or return the tree on `Reader`). Add a test through the API with a draft over a published row.
3. **R8 does not run on a merge, which the concept requires.** BR-2 says "R5–R8 … for a merge on every condition the swap rewrites", and challenge M4 names R8. `order[i]` is filled only for `set_condition` on a question (api/src/change-sets.ts:124-137), and the engine runs only R5–R7 on rewrites (engine/change-set.ts:171-178). The `Context` comment at :27 says "R5, R7, R8", and the commit message says R5–R7. Nothing records the change in `challenge.md` § Build discoveries.
   * Probe: the question "Applying for PGWP" is shown when `employer_obtained_lmia = true`. Merging that field into `applying_for_pgwp` makes the question decide itself, and the check gives **ok: true**. The same resulting condition set directly is refused with **R8 "Questions decide each other in a loop"**.
   * **Fix:** for a merge, build `order[i]` from each affected combination's draft snapshot before and after the swap (placements' conditions and facts), as is done for `set_condition`. Add a pass and a fail test.
4. **Six rules have no failing test (STANDARDS §7 [M]).** Each survives its mutant (61/61 still pass):
   * the new answer-list rule (engine/change-set.ts:167). Its test, check_gcore_engine.ts:66-68, uses a country field and a code field, so the type rule refuses it first;
   * the "only new problems" filter on rewrites (:177, changed to `n > 0`);
   * R1 "at least one letter" (:144);
   * R4 "a condition reads an unknown field" (:117). The test at :69 uses a retired field only;
   * R4 "the field kept must be active" (:165);
   * R4 "two different fields" (:163).
   * **Fix:** one fail case each: two code fields with different lists; a rewrite whose tree already had an R5 problem before the swap (no new problem, so it passes); "12"; an unknown key; a retired or merged target; key equal to into.
5. **The tier says the expert signs a person's question condition, which is not today's rule (Q3).** `expertSigns` returns true for every condition (engine/change-set.ts:220). Today's release diff marks Rule, Document requirement, Check, a Form with a condition and AI-made items `needs_sme` (validate.ts:188), but not a person's question placement. So "The immigration expert signs it at release" would be false for C4.11 question conditions. Both suites assert it (check_gcore_engine.ts:105, check_gcore_check_api.ts:80).
   * **Fix:** decide it by target: `rule`, `check`, `document_line` and `form_line` say yes, `question` says no unless the AI made it. Correct the two tests and add a fail case.

## Minors
* **m1 The fingerprint depends on row order.** `sections`, `rules` and `releases` are not sorted (api/src/change-sets.ts:170, :172, :173), and they follow `findMany` without `orderBy`. A no-op `UPDATE predicate SET status=status` reordered R-24/R-25/R-26 and changed the fingerprint, with nothing changed. B2's `expected` would then answer a false 409. **Fix:** sort each list (kind, key, combination) before hashing, and add a test that reorders rows.
* **m2 Open cases are not limited to the releases that carry the item** (challenge m1; api/src/change-sets.ts:174). A case pinned to a release without the item is still listed. **Fix:** keep only the pins whose release is in `releasesOf` (or label them "not affected").
* **m3 R7 says "never true" for `neq`.** A `neq` with an unknown code is always true (engine/change-set.ts:94-98). R7 also folds case (:97), but the evaluator compares with `===` (contracts/rules.ts:129), so "can" never matches "CAN", yet the test at check_gcore_engine.ts:85 passes it. It is not the `answerOf` match the concept names (qd-conditions.ts:35-40). **Fix:** check `eq`/`in` only and match codes exactly.
* **m4 R8 merges the problems of all combinations into one set** (api/src/change-sets.ts:129-135, engine :188). A new loop on combination B is hidden when combination A already has the same message. **Fix:** compare before and after per combination.
* **m5 "Given twice" ignores groups** (engine/change-set.ts:76-85). Two renames in different groups to the same name are refused together, though each passes alone (probed). **Fix:** for field renames, key by group.
* **m6 The chain message gives advice that cannot be followed** (engine/change-set.ts:170). "Merge the older fields straight into …" is impossible, because merged fields are refused by R4. "A chain of 6 merged fields" counts the kept field too. **Fix:** "This would make a chain of 5 merges; at most 4 are followed."
* **m7 Changes from the concept are not recorded.** R1 is 2–80 characters with 1 letter (engine :142-144), not the concept's 1–120 with 3 letters, and it now refuses "12", which today's door accepts. P-266's raise also covers section renames and aliases (engine :228, api :117), but the founder's answer names fields only. **Fix:** record both in `challenge.md` § Build discoveries, and put the P-266 reading to the tech lead (the tier is a one-line change).
* **m8 The purity scan does not follow imports** (check_gcore_engine.ts:131-134), although concept §2 says it does. An I/O import added to `engine/where-used.ts` or `programs.ts` would pass. **Fix:** walk the `./` imports, skipping `import type`.
* **m9 Queries run per item:** `itemReleases` (api/src/change-sets.ts:117) and `openCasesByRelease` (:174), about 4 queries per item (STANDARDS §5 no N+1). **Fix:** read them once for all subjects.
* **m10 Two API tests pass vacuously.** The direct-tier pass is `ok(true)` because every field is released (check_gcore_check_api.ts:52-56). The rules check (:48) passes on an empty list. **Fix:** assert `rules.length ≥ 1` for a field read by a rule. Make the tier pass on a field whose release was removed by setup SQL.
* **m11 The preview shows codes.** A condition's before → after is raw JSON with field codes (api/src/change-sets.ts:177), and the R4 merge messages print keys (engine :160, :165-166). EXPERIENCE says names, never codes. **Fix:** use `plain()` and field names. The answer-list twin message (:70) also prints `t.key`.
* **m12 The migration allows status `refused`** (migration.sql:32), though BR-2 says a refused change writes nothing. `library_change_id`/`field_merge_id` have no foreign key (as in the neighbouring tables). **Fix:** drop `refused` or say who writes it.

## Journey score
**6.5/10, below the pass line.** See `journey-test-reviewer-b1-2026-11-02.md`. Judged through the API and planted data; there is no screen in B1.

## Could not check
* No browser walk: there is no UI until B2. No real screen reader. D17/D20 stay with the founder.
* Not run on this commit: the full CI set (`select-suites` says ALL) and coverage (c8). Only the four suites above.
* SH3's `contracts/resolver.ts` was read on #509's head (0c800ed1), which is not merged.

**Verdict: Block.** Fix Majors 1–5: R3 keeps today's version scope and list identity; the merge rewrite reads the current version; R8 runs on merges; a failing test for each of the six rules; and the expert words follow `needs_sme` per target. Fix m1–m12, or list them in the PR (m1 and m7 before B2).
