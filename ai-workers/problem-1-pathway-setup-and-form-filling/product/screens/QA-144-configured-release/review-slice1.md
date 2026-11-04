# QA-144 slice 1: independent review of 4ad429fe9 (PR #798, runtime lane)

Reviewer: a fresh context that did not build this. Date: 4 Nov 2026. US$0: live AI off, no priced buttons, ports 4473 and 4474 only. Copies `b8_rev` and `b8_rev2` were stopped and their databases dropped afterwards.
Diff reviewed: `git diff origin/main...4ad429fe9`. The branch head moved to ae745a938 during the review. Its only change is to `tests/check_c10_1_configured.ts`, which is noted under B1.

## Verdict (screen-review): Rework, then re-review. **Verdict: Block** 4ad429fe9
Open: 1 Blocker (already fixed in ae745a938), 3 Majors, 6 Minors.

## What I ran
* `check_qa144_vv_release.ts` on a fresh `b8_rev` copy (4473): **22/22**. The load took 76 s and released nothing. IRM 0002's "No form fields mapped yet" is the one block, as the ruling allows.
* `check_c10_1_configured.ts` at ae745a938, on `b8_rev2` (4474): **29/29**.
* `acceptance/C10.1.test.ts` (4473): **12/23**. Part B is red as expected. Part A line 35 is newly red (see M1).
* `check_qa145_clean_clone.ts`: **not run** (no time left). Not checked.
* My own Playwright walk with screenshots in a scratchpad, not the repository:
  * Questionnaires, Forms, Preview and Review at 1440, 1024 and 400 px;
  * axe at 1440;
  * keyboard-only Tab and Enter to Smart questionnaire and to Review and release;
  * draft preview with a child aged 1 (born 2024-03-01).

## Issues (each: file:line, failing scenario, fix)
**B1 (Blocker for 4ad429fe9; fixed in ae745a938). `tests/check_c10_1_configured.ts:77` at 4ad429fe9**
* The line asserts that the Visitor visa is released (`count = 1`).
* On every US$0 load the count is 0, because IRM 0002 has no saved map, so the suite the PR updated is red at the reviewed commit.
* ae745a938 makes the line conditional on IRM 0002's map, and passed 29/29.
* Fix: none beyond ae745a938. Re-review that head.

**M1 (Major, Must). `acceptance/C10.1.test.ts:35` goes red**
* After the load, 13 `answer_list` proposals from the rules runs stay `waiting`. `api/src/demo.ts:450` takes only the sections and the marital-status list.
* Line 35 counts waiting proposals across all runs, so "every replayed proposal decided" fails. This is part A of the pack, and the same unscoped query passed in `check_c10_1` on main.
* The PR scoped that query in `check_c10_1:287` but left the pack unchanged.
* Fix: either decide those lists (accept, or return them with a reason) or scope line 35 to `field_map` runs, as `check_c10_1` now is. Re-run the pack.

**M2 (Major, Must). `api/src/form-part-placements.ts:58` and `:64-67`: facts from conditional forms are asked of everyone**
* Every placement is `per_person` from the client questionnaire, and every section holding one is then selected.
* A selected section asks all its questions of every person, whether or not the form applies.
* Preview with a child aged 1 (IMM 5707 correctly "applies: false"): the child gets 27 required questions whose only reason is "asked in …, a section this row selects". They include:
  * IMM 5476's `representative.membership_id`, `licensing_province` and `supervising_lawyer_*`;
  * IMM 5409's `relationship.joint_financial_accounts` and `cohabitation_start_date`;
  * `organisation.name`.
* A single principal with no representative gets the same questions.
* Fix:
  * Do not select a section for a fact a form already reads. `engine/snapshot.ts:181` already carries such a placement through `used`, so the question is asked when the form applies.
  * Base the repeats and who fills it on the entry's `person` (a `representative` box is not asked of each applicant).
  * Add a test with a child aged 0–4 and no representative.

**M3 (Major, Should). `form-part-placements.ts:51-58`: the first box wins**
* The section and the repeats come from whichever map entry is reached first.
* `person.previous_residence_country` is `per_person`, while `_from`, `_to` and `_status` of the same IMM 5257 list (rows 0–1) are `per_row`. `engine/runtime/case.ts:307` then groups the country apart from its own row.
* `relationship.child_relationship_type` is `per_row`, but IMM 5707's child rows are people, not list rows.
* The applicant's own `person.family_name`, `given_names` and `passport_number` sit in the "Marital status" section.
* Fix: weigh all of a fact's entries. Prefer `form_subject` boxes. Use `per_row` only for a history list, not for a `subject_child` row.

**Minors (Should)**
* **m1. The load is not deterministic.**
  * Two loads of the same code gave "39 sections, 0 reused, 147 facts" and "36 sections, 3 reused, 146 facts" (row 7).
  * `demo.ts:450`'s `findMany` has no `orderBy`, so which duplicate lands first varies.
  * Fix: order by `createdAt` and `id`.
* **m2. A retired form adds library sections.**
  * The rules pass runs on `imm5645e.pdf` (the attachment loop above `demo.ts:450`). Its 3 sections are approved into the shared library although the draft then retires IMM 5645.
  * Fix: run the pass only on forms that stay on the draft.
* **m3. `form-part-placements.ts:40-42` borrows another edition's sections, assuming the same box paths.**
  * IMM 5475's pass read the 12-2022 file, while the map in use is 05-2021. If the paths differ, the longest-prefix rule places the fact silently, and no test fails.
* **m4. `FAMILY_FORM_BY_CHANNEL` (`demo.ts:52`).** The quotes are verbatim, but Guide 5256 also says "IMM 5707 or IMM 5645 listed in the application package for your country" (by country, not channel). It is labelled Sample, Unconfirmed: expert, under the tech lead's ruling. Add that sentence to the cite so the expert sees the conflict.
* **m5. Rules-pass section names are approved as they are and shown on the client questionnaire.** Examples: "Page wrapper", "Five", "Seven", "Section b", "Sub no1", "Table1", "Us card". The wording comes from C3.4. The loader's second person approves it unread.
* **m6. Speed.** Questionnaires first view is 11.1 s at 1440 and 7.4 s at 1024, against the < 1 s budget (STANDARDS §9). I took no baseline on main.

## What held (evidence)
* **Screens' services only.** `masters.draft`, `decide` one item at a time, `decideLibraryChange` as the Approver, `RuleFacts.add`, `saveForm`, `placeField`, `selectSection`, `decideFormField`, `linkAnswerList`, `draftOptionMaps`. The diff has no SQL write.
* **Duties.** No library item is decided by `user-A`. The Approver approves. The release path keeps the SME sign-off.
* **US$0.** No LIVE job, and the ledger is unchanged.
* **Citations match the saved official sources word for word:**
  * IMM 5484 (05-2026) p. 1, the IMM 5707, IMM 5476 and IMM 5475 lines;
  * Guide 5256 Q3 (both IRM 0002 sentences), Q10 (IMM 5409) and "each person, 18 years of age or older" (modified 2026-03-31);
  * canada.ca "Apply for a visitor visa", "Family Information (IMM 5645) form" (modified 2026-08-28).
* **Regression guards.** Removing the placement step trips "nobody is asked". Removing by-hand trips K1. A rule left in words only trips its guard.
* **Tests that would not catch regressions.** No test checks a child aged 0–4, `representative.*` facts, or consistent repeats within one list (M2, M3).

## D1–D20 (1–5; a reviewer's reading of this slice)
D1 4 does what the ruling asks · D2 3 M3 grouping, m1 nondeterminism · D3 3 duplicate sections reused, retired-form sections added (m2) · D4 3 M2 · D5 4 409 on a double load, Reset is clean (pack part A) · D6 4 reasons and audit on every decision · D7 4 rules, US$0, said · D8 4 · D9 3 the header says "Waiting for the immigration expert" and "Forms 16 to do" while Review says "1 to fix" · D10 2 m5 · D11 4 row 7 lists counts and refusals · D12 4 · D13 3 no sideways scroll at 400/1024/1440, the keyboard reaches the tabs, axe `empty-table-header`/`heading-order` on Forms and Review (also on main, says the builder) · D14 4 · D15 2 m6 · D16 3 M2/M3 untested · D17 simulated only · D18 4 cites verified · D19 3 the Visitor visa is still not released (ruled) · D20 simulated only.

## Journey test (reviewer role; the one score for this check)
Journeys:
* J1, author: load the checkpoint after Reset, then open the Visitor visa's SQR, Forms, Preview and Review.
* J2: the same with a family (child aged 1).
* J3: a second load and a wrong role (pack part A passes).
* J4: keyboard only, and 400/1024/1440 px.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Set up, but no release (the ruled IRM 0002 block) |
| Next step obvious | ½ | Review names IRM 0002; the header and the Forms badge point elsewhere |
| Plain words | ½ | m5 section names |
| Feedback and state | 1 | Row 7 counts and refusals |
| Correct data | ½ | M2, M3 |
| Error recovery | 1 | 409, 403, Reset (pack part A) |
| Accessibility and sizes | ½ | Pre-existing axe findings; widths fine |
| Speed | ½ | 11 s first view; 76 s load |
| Visual quality | 1 | Team look holds |
| Trust and sources | 1 | Sample, Unconfirmed: expert, cites verified |

**Score 7/10: not a pass (needs 8 and no 0).** The fixes that raise it most: M2 (correct data), M3 and m5 (plain words), then m6 (speed).

**Could not check:** `check_qa145_clean_clone.ts`, a real screen reader, true 200 % browser zoom (400 px stood in), and an intended user's unaided walk (D17 and D20 stay with the founder).

## Round 2: diff-only re-review of 8a1bfd32e (`git diff 4ad429fe9 8a1bfd32e`)

Reviewer: the same fresh context. 4 Nov 2026. I read the code only. No copy was started and no suite was run (the Mac disk is low and the tech lead has paused every copy). `tsc --noEmit -p api/tsconfig.json`: no error in any changed file; the 15 errors it shows are in other tests. I checked the Guide 5256 sentence against `official-sources/ircc/instructions/guide-5256.html`: it is word for word. The builder's last run before the pause was `check_qa144_vv_release` 26/26 and C4.1 14/17 (its 3 reds are owned elsewhere). I take that as the builder's report; I did not see it.

### Round 1 findings
* **B1: fixed.** `check_c10_1_configured.ts:78-81` passes only on the named IRM 0002 block until its map exists.
* **M1: fixed.** `C10.1.test.ts:36` counts only waiting proposals from REPLAY runs. The rules pass's lists stay on To review, as ruling 3 says.
* **M2: partly fixed. One part is open (R2-M1).** The representative part holds. A `representative.*` box resolves to the representative, whose role is never in `applying` (`form-part-placements.ts:88`), so no section holding one is chosen. The toddler test guards the age-gated IMM 5707. The shared library's questions are read when the section is chosen (`:93`).
* **M3: fixed for the cases named.** The section now comes from a form_subject box and the repeats from all boxes. Two edges are open (R2-m2).
* **m1: fixed.** `demo.ts:454` orders the proposals. **m2: fixed** (`demo.ts:446-450`, IMM 5645 on paper). **m3: fixed.** A box borrows from another edition only on an exact path (`form-part-placements.ts:53-55`), with one edge open (R2-m3). **m4: fixed**, word for word. **m5, m6: unchanged.** They are not part of this round.

### Open
**R2-M1 (Major, Must). `form-part-placements.ts:89-91`: a section is "everyone's" even when the forms that read its facts may not apply**
* `readFor` reads every `r.coverage` row. The preview has no answers, so render keeps every form whose `applies` is `"cannot_tell"` (`engine/render.ts:116`). Those are IMM 5409 (marital status), IMM 5476 and IMM 5475 (case facts), IRM 0002, and IMM 5707 (age 18).
* Each of those forms therefore counts as reading its facts for every role its line names. Also, `case.*` facts pass without any check.
* Result: a section that holds only such facts is chosen. Render then asks it of every applicant (`render.ts:254-256`), for example a never-married single principal. That is the second scenario of round-1 M2, and nothing tests it.
* The toddler test (`check_qa144_vv_release.ts:68-71`) cannot see this for conditional forms. With marital status and the case facts unanswered, the child gets those facts first as "may be needed" (`render.ts:250`). The `seen` key then stops the "a section this row selects" reason from showing.
* Fix:
  * count only coverage rows with `applies === true`, and give `case.*` facts the same test (FILING read by a row that applies);
  * add a preview with the principal only, `person.marital_status` never married and no representative action, and assert there is no section-only question;
  * add the toddler again with `child-1|person.marital_status` answered.

**R2-m1 (Minor; Must before slice 2). The choice is made once, but the section stays shared**
* A question placed later into a chosen section is asked of every Visitor visa applicant, and nothing checks it again. It can come from another combination's slice, or through `byTitle` reuse (`:41`), which shares sections by name across forms.
* In slice 1 nothing does this, because only `vv.single` runs the step.
* Fix: in `placeFromFormParts` or the validator, re-check any combination that chose the section before a fact is placed in it.

**R2-m2 (Minor). M3 edges**
* `rank` (`:73`) prefers a box outside a list row for the section, but `repeats` becomes `per_row` if any box is in a row about form_subject (`:78`). A list fact also read outside a list on another form can then land in a different section from its row-mates. `case.ts:307` groups `per_row` facts by section, so this is round-1 M3 again.
* The box outside the row reads `factKey(about, fact)` with no row. Render's fallback only covers the reverse case (`render.ts:133`).
* Fix: when the fact is `per_row`, rank the row boxes first.
* The tests at `check_qa144_vv_release.ts:75-76` accept `""`, so they pass when nothing was placed. Require the value, and assert that all `person.previous_residence_*` facts share one section.

**R2-m3 (Minor). `form-part-placements.ts:36`: the checksum lookup has no channel filter and no order**
* `form_edition` has no unique checksum (only workspace and label; `prisma/schema.prisma`). The other checksum lookups filter out `channel = 'ONLINE'` (`form-library.ts:86`, `finder.ts:675`).
* If two editions share the file, the last row wins arbitrarily. The pass's sections are then filed under the wrong edition, and the nearest-box fallback is lost: facts go to "no section", not to a wrong one.
* Intake reuses an edition by its checksum (`intake.ts:299`), so this is unlikely today.
* Fix: add `channel: { not: "ONLINE" }`, and prefer the label the snapshot's PDF map uses.

### Journey test, round 2
**7/10, carried. Not walked again**, because the copies are paused. Correct data stays at ½ until R2-M1 is fixed. Re-walk after the copies resume: the principal-only preview and the toddler preview, at 1440 px.

**Verdict: Block** 8a1bfd32e
* To fix: R2-M1.
* R2-m1 to R2-m3 should be fixed with it, or filed on the slice 2 row.

## Round 3: diff-only re-review of cb87f81cd (`git diff 8a1bfd32e cb87f81cd`; the round-2 fix is 0ae82831c, the rest is a main merge and this file)

Reviewer: the same fresh context. 4 Nov 2026. I read the code only, as the tech lead asked (no copy, no suite). `tsc --noEmit -p api/tsconfig.json`: no error in `form-part-placements.ts` or `check_qa144_vv_release.ts`. CI for cb87f81cd is still queued (run 41779470228). I read the CI logs of 8a1bfd32e (run 41775891982), which found the two Majors below.

### Round 2 findings
* **R2-M1: fixed in the code.** `form-part-placements.ts:96` counts a coverage row only when `applies === true`. `:97` counts a `case.*` fact only when such a row reads it for FILING (`aboutOf` returns FILING for a filing fact, `engine/resolver.ts:87`). With no answers, the preview of the largest household (`engine/coverage.ts:21-27`) leaves out IMM 5409, IMM 5476, IMM 5475, IRM 0002 and any form with a minimum age (`render.ts:53-55`, unknown birth date gives "cannot_tell").
* **R2-M1 tests: right form, but unproven.**
  * The answer keys match `factKey`: `principal|person.marital_status` and `child-1|…` (`contracts/resolver.ts:151`; `engine/resolver.ts:19` gives the ids).
  * Without `people`, the preview uses the stored counts (`studio.ts:487-489`). For `vv.single` those are principal 1, spouse 0, child 0, with no representative line (`samples/programs.json`), so "on their own" is true.
  * A non-common-law marital status makes IMM 5409 false. The old code would then add its facts with the reason "a section this row selects" (`render.ts:254-256`), so `:77` fails for the right reason.
  * Gap (Minor, R3-m1): the `case.*` half is not guarded. With the case facts unanswered, IMM 5476 and IMM 5475 ask them first as "may be needed", and `seen` hides the section reason. Add a preview with those deciding case facts answered so the forms are false.
* **M3 tests: fixed.** `:84-85` now require `per_row` and `per_person`, so they fail when nothing was placed. Round 2 also asked to check that all `person.previous_residence_*` facts share one section; that was not added (nit).
* **R2-m2: fixed.** For a `per_row` fact, `:79` picks the section only from list-row boxes about form_subject.
* **R2-m3: fixed.** `:37` filters `channel: "PDF"` (a valid `EditionChannel` value) with a fixed order. With `editionLabel desc` the Map keeps the lowest label. That is stable, though it does not prefer the label of the snapshot's PDF map (nit).
* **R2-m1: open for slice 2**, as the PR body says.
* **At least three chosen sections under `applies === true`: not confirmed.** Only IMM 5257-style forms that always apply now count, for principal, spouse and child together. Whether three sections pass is decided by `check_qa144_vv_release.ts:66`. That check has not run since 0ae82831c (the builder's 16/16 walk, 9ba460fc9, came before it), and CI cannot run it (R3-M1).

### Open
**R3-M1 (Major, Must). `tests/check_qa144_vv_release.ts:6`: CI never runs this check on a copy**
* `run-suites.sh:193` starts an isolated copy only when the usage line reads `isolated.sh <name> <port> start && (tsx|node) studio/tests/<file>`. This line has `tsx --tsconfig studio/api/tsconfig.json studio/tests/…`, so it does not match (tested with the same bash regex: NOMATCH).
* The check then runs "plain", defaulting to port 4470 with no server. CI at 8a1bfd32e: `check_qa144_vv_release.ts | FAIL | 0 s | ECONNREFUSED ::1:4470` (shard 3).
* So none of the R2-M1, M2 or M3 assertions has run in CI, and the PR cannot go green.
* Fix: write the usage line as `check_c10_1_configured.ts:6` does (`… start && tsx studio/tests/check_qa144_vv_release.ts 4470 xr_studio_b8_qa144`). Then confirm in CI that `:66`, `:77` and `:79` pass.

**R3-M2 (Major, Must). `tests/check_c10_1_browser.cjs:46` still expects row 7 to say "not built yet"**
* This PR changes row 7 to "Sections and questions from the forms' own parts" with status waiting, partial or done (`api/src/demo.ts:534`). The browser check still requires `r("7").status === "not built yet"`.
* CI at 8a1bfd32e: shard 5 failed on exactly `C10.1: rows 7 and 17 say "Not built yet"`. Nothing since changes it.
* Fix: keep row 17's assertion, and assert row 7's new title and status. Row 7 should be "done" after the configured load, if this check loads it.

### Journey test, round 3
**7/10, carried. Not walked**: the tech lead keeps the Mac for walks, and this round was code-only by instruction. Correct data can rise from ½ once `:77` and `:79` pass in CI.

**Verdict: Block** cb87f81cd
* To fix: R3-M1 and R3-M2 (both CI-only: the R2-M1 code holds). Then show CI green with `check_qa144_vv_release` actually run.
* R3-m1 and the two nits can go with them, or on the slice 2 row.
