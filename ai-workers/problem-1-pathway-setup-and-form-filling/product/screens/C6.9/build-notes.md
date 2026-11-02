# C6.9 part 1 — gates on the release: build notes

Built 2 Nov 2026 on `claude/runtime-c69-concept` (draft PR #391), runtime lane, to `concept.md` BR-1…BR-6 and BR-2a and the tech lead's approval on #391 (one migration for both parts; S7 relabel; Q1 and Q2 as recommended, Sample). API and engine only: nothing visible changes (the page is part 3). US$0, no model call, live AI off.

## Files
* **Migration** `prototype/studio/prisma/migrations/20261102120000_c69_eligibility/migration.sql`: `combination.eligibility jsonb` (nullable) plus `assessment`, `assessment_override`, `assessment_review`, the `run_type` CHECK and the `trg_assessment_frozen` trigger (any UPDATE on `assessment` refused). Rollback written in its header. The three tables are unused until part 2. `prisma/schema.prisma`: the column, three models, one back-relation line on `Case`.
* **Shared engine files** (named in the PR's first line): `engine/snapshot.ts` (`snapshot.eligibility` only when set; gate facts join `canonical_fields` after placements are chosen), `engine/validate.ts` (`validate`: BR-5 release check; `diff`: BR-4 lines; `eligibility` added to the completeness guard's covered keys).
* New: `engine/eligibility-gates.ts` (pure rules), `contracts/eligibility.ts` (zod body, view type), `api/src/eligibility.ts` (service and controller), `api/src/features/eligibility.ts` (P-214 registration; `main.ts` untouched).
* `acceptance/lib/setup_vv_m3.ts`: S7's two gate labels only (approved relabel); conditions and keys unchanged.
* Test: `prototype/studio/tests/check_c69_gates.ts` (56 checks; it releases Visitor visa and runs the M3 setup itself on a fresh copy).

## Team-name mapping
`snapshot.eligibility.gates[]` ↔ AG-03's gate list on a Country Pack version (§3.2, AG-3-5); `disclaimer` ↔ AG-3-32 disclaimer text; `assessment.result_json` ↔ AG-03 §7 `Assessment` with its `AssessmentProgramResult` list inside (not rows); `assessment_override` ↔ `AssessmentOverride`; `assessment_review` is ours (AG-3-34 review stamp).

## Mock vs real
Real: storage, checks, review lines, release freeze, audit rows. Sample: gate labels, conditions, judgement lines and the default disclaimer (ASSUMPTIONS C6, C8, C9; Unconfirmed: no counsel). Stand-in SI-1 applies from part 2.

## Choices made where the concept left room (none changes a rule)
1. **Order of refusals:** field errors (400) are checked before the version (409), so a person sees what to fix first. Both still refuse.
2. **Change-summary keys:** `Eligibility|<gate key>`, `Eligibility|officers_judgement`, `Eligibility|disclaimer` (labels "Gate: …", "Officer's judgement, not checked by rules: …", "Disclaimer: …"); all `needs_sme: true`.
3. **Stored shape** adds `at` (the save time) to `{gates, judgement, disclaimer, version, by}`, so GET answers `savedAt` without reading the audit log.
4. **No gates and no judgement lines** (an emptied save) gives no `snapshot.eligibility`: the combination reads as having none. A disclaimer sent with neither is refused on the field (review minor 5), never stored and dropped.
5. **BR-5 is strict:** a gate fact must be placed and read by a form box or rule. A derived (worked-out) fact is refused at release in its own words, and so is one only a document supplies (review Major on 5120b6f2: the first build let a derived fact through). Allowing derived gates whose inputs are asked would be a later choice.
10. **A changed gate line** reads "Gate: <old label> → <new label>", plus "(rule changed)" when its condition changed (review minor 7).
6. **Retired combination:** a PUT is refused 409, as for "Who can be in this application".
7. **GET** is a configuration read (Studio people only; a client gets 403), as every other `/combinations` read.
8. `assessment.config_release_id` has no foreign key, as `form_instance.config_release_id` (a release is never deleted).
9. `FAIL_BEATS_MISSING` is not defined here: it belongs to part 2's adapter (binding condition 1, AG-03 as written, `false`).

11. **Break report on e3a01067 (M1, m1–m6):**
    * At release, a gate fact must be asked of every traveller with no condition (not shown or hidden by a condition, not optional): `criminal_history_details` (asked only after a yes) and `uci` (optional) are release errors in words. The first placement of a fact is the one judged, as the renderer uses it.
    * At save, every compared value must fit its fact's type (a yes/no fact takes true or false; a number a number; a date YYYY-MM-DD; other facts text). An `and` asking one fact to equal two different values is refused as a rule that can never be true. The same checks run again at release.
    * **Not caught (said, not hidden):** a contradiction across `or`/`not`, ranges that cannot meet (`gt 5` and `lt 3`), a gate that contradicts another gate, an answer-list code not on the fact's list, and a person.* fact asked once per case rather than per person.
    * The change summary shows each rule in words with its values ("person.criminal_history is false"), before and after when it changed; a reorder alone is the line "Gates reordered".
    * Text: labels and lines are one line of printable text by the runtime contract's rule (`contracts/runtime.ts` INVISIBLE, LONE, now exported): NUL, controls, zero-width marks, bidi overrides, lone surrogates and line breaks are refused 400 on the field (the disclaimer may hold line breaks). A label or line with no letter and no digit counts as empty. Lengths count characters (code points). Duplicate labels, and duplicate judgement lines, ignoring case, spacing and Unicode form, are refused. A condition deeper than 20 levels is refused before ajv; the disclaimer is at most 2,000 characters.

## Checks run (STANDARDS sections)
* §2 data: one expand-only migration with written rollback; applied by `prisma migrate deploy` on a fresh isolated copy; client regenerated.
* §3 rules: every BR has a pass and a fail line in `check_c69_gates.ts` (labels name C6.9 and the BR); setup S7 and S8 pass (S2w, S5 and S7a fail in that file for reasons outside this row: M3-0, the fee table, a signer warning; unchanged by this build).
* §4 contract: Problem Details with `errors[{field, message}]`; 403 author duty, 404, 409 stale naming who saved and when.
* §6 security: deny by default (`readerOf`, `need(author)`); a client gets 403 on both routes.
* Fingerprints: release 1 and every later release still hash to their stored `sha256`; another combination's draft fingerprint is unchanged by a Visitor visa gates save.
* `run-suites.sh --changed`, `graph.mjs --check`, `count-any.mjs`: results in the PR body.
* Not applicable to part 1: axe, screenshots, performance budgets, keyboard (no UI; part 3).

## Self-score (part 1, API only)
D1 job fit 8 · D2 rules as data 9 · D3 correctness 8 · D4 contract 8 · D5 security 8 · D6 audit 8 · D7 versioning 9 · D8 tests 8 · D9–D16 UI dimensions n/a (part 3) · D17, D20 not self-awarded (need an intended user) · D18 cost US$0 · D19 reuse 8.

## Known gaps
* Labels and conditions stay Sample; canada.ca not re-opened from the cloud (concept §10): the tech lead re-opens it on the Mac before merge.
* No gate-authoring screen and no Undo (concept "Not built").
* A gate on a derived fact is refused at release (choice 5).

# Part 2: the runs (BR-7…BR-14, BR-17, BR-18)

## As built
* **Adapter** `engine/runtime/eligibility.ts` (pure, stand-in SI-1): `rewriteMissing` (BR-9's `exists` rewrite), `gateResult`, `outcomeOf`, `assess`, `inputsOf`, `outOfDate`. **`FAIL_BEATS_MISSING = true`** (P-229 (3)); the shared `evaluate` is unchanged.
* **Routes** `api/src/assessments.ts`, registered in `api/src/features/eligibility.ts` with part 1's: `POST /runtime/cases/:id/assessments`, `GET /runtime/cases/:id/assessments[?person=]`, `GET /runtime/assessments/:aid`. No migration: part 1 made the tables.
* **Contract:** `AssessmentRunBody` added to `contracts/eligibility.ts` (person; reason up to 300 characters, one line, no invisible characters).

## Choices where the concept left room
1. **Facts read:** only answers their own checks accept (`checkValue`), as the C6.4 checklist reads them; an invalid value counts as missing (AG-03 §9).
2. **`packVersion`** is the release's version and **`packId`** its `packVersionId` (challenge Minor 6); `releaseId` is kept too.
3. **`rulesAsOfByProgram`** is the release's `releasedAt` date, in UTC.
4. **The envelope also stores `person` and `inputs`** (concept BR-8), so out of date needs no other table. `out_of_date`, `changed[]` and `release_changed` are worked out on every read and never written.
5. **A reason of spaces only is no reason** (trimmed). A first run may carry a reason; it is kept.
6. **`GET /runtime/assessments/:aid`** answers 403 to a client whatever the id (as every eligibility route does), 404 to staff for an unknown or malformed id, and 404 to another firm's staff (through `reach`).
7. **The view already carries `overrides[]` and the review fields** (read from part 1's tables, empty until part 3), so part 3 only adds the writes and the page.
8. **Audit:** one row per run, naming the case and the person by short id and the outcome; no answer value (STANDARDS §5).

## Checks
* `tests/check_c69_runs.ts`: 50/50 on a fresh copy (sets up release 1, proves the 409 with no gates there, then runs the M3 setup).
* `acceptance/C6.9.test.ts`: C6.9-1…10, 14, 15 pass; C6.9-11…13 wait for part 3 (override and review).

## R4: a gate's own outcome when not met (P-230 (1), the tech lead's message of 2 Nov)
* `whenNotMet` on a gate, as data: `not_eligible` (default, not stored, so earlier releases keep their fingerprints) or `needs_review`. Saved by the PUT (refused on `gates.N.whenNotMet` otherwise), carried in `snapshot.eligibility`, and a change is an "Eligibility" change-summary line in words.
* The adapter lists a `needs_review` gate not met in `reviewGates` (our addition), never in `failedGates`: the result is Possibly eligible. The gate's own state stays Not met (honest). `FAIL_BEATS_MISSING` applies to `not_eligible` gates only.
* **Data and test changed with it:** S7 (`acceptance/lib/setup_vv_m3.ts`) gives `vv.no_convictions` `whenNotMet: "needs_review"`; **C6.9-7** now expects Possibly eligible with the gate in `reviewGates` (was Not eligible). Labels unchanged (Sample).
* Tests: 9 pure pass/fail lines and 1 route line in `check_c69_runs.ts` (60/60); `check_c69_gates.ts` 87/87 with S7's new body.

## Part 2, review round 1 (fd26c492: reviewer Block, breaker 1 Major) and the fixes
* **M1 (reviewer), a false Not met on an answered fact:** the adapter now reads a gate fact as the rules read it, the person's answer first and then the case's, whatever the prefix. Out of date re-reads it the same way. Before, `relationship.start_date` and `representative.*` (asked once per case, of the case subject) read as unanswered. Tests: 4 lines "C6.9 M1".
* **M2 (reviewer) = M1 (breaker), simultaneous first runs skipping the reason:** the count of earlier runs and the insert now run in one transaction under `pg_advisory_xact_lock` per case and person. Test: 40 POSTs at once give one 201 and 39 refusals on `reason`. Against the old code the same test fails (several MANUAL rows).
* **Breaker m1:** a gate not met still lists the facts it could not read (P-229 (3)).
* **Breaker m3:** a person marked not travelling after a run makes that run out of date (`not_travelling: true`).
* **Breaker m4:** the reason counts characters (an emoji is one, 300 at most) and needs a letter or a digit.
* **Reviewer m1–m3:**
  * the audit check now searches every run's audit text for the answer values;
  * a client reading a real run's id gets 403 (tested);
  * scale is tested as 4 people × 10 runs, in under 300 ms.
* **Reviewer m4:** concept §6 and §8 updated for R4.
* **Left, as a known limit (breaker m2):** a gate on a repeating-row fact reads the first row only, the way the questionnaire's rules read a box with no row; row facts carry no answer id. Visitor visa has no such gate. Refusing such gates at release is a follow-up, asked in the PR.
* Tests: `check_c69_runs` 75/75, `check_c69_gates` 87/87, `check_vv_prepare_api` 32/32, acceptance C6.9 12/15 (11–13 are part 3).
