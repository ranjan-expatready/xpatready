# QA-231 (C9.1 on the configured checkpoint): review round 1

PR #978 · branch `claude/runtime-qa231-c91` · head reviewed **f758c056c0aabc6407eac09c891ca317f85b914a** · reviewer did not build it.
Runtime row, not a new screen: reviewed the diff (`git diff origin/main...HEAD`), the tests, and a running isolated copy (`b8_rev`, port 4473, stopped after). US$0: no live AI, no `STUDIO_*_LIVE` set, :4400 not used.

## Verdict: Block (Changes requested: 1 Major, 4 Minor)

## What I re-ran (fresh isolated copy)
* C9.1 pack `acceptance/C9.1.test.ts`: **16/17**. The one red step is K1, "2 IMM 5476 problems left". It is red by design and the question about it is with the tech lead.
* `tests/check_c10_1_configured.ts` **34/34**. `tests/qa/check_qa231_walk.cjs` **13/13** at 1440 px. I ran a copy of it with its screenshots sent to my scratchpad, so the builder's files were not touched.
* Cross-check of the main rule against the release snapshots: for all 3 combinations, each of the 21 sections listed in Components touched is a real placement in that combination's released snapshot (`config_release.snapshot.placements`, same section and fact). **0 listed but not asked.** No placement of a touched field is missing from the list either (0 left out). None of the 21 sections is chosen. Before this PR the list was empty.
* My own tests of the pure function (`fieldComponents`) on made-up cases: a check-only reader and an ONLINE-edition box on a PDF line are both listed. A retired newest line is not.

## Findings

**M1 (Major): the Sample family case asks for every copy at once and hits the per-case cap. Row 11 then lists 10 refusals in its words.**
* Where: `api/src/sample-case.ts:85-87`, against `api/src/fill-case.ts:46` (`ACTIVE_PER_CASE = 5`, the limit on copies waiting or running for one case).
* What happened: `generate` puts each copy in a background queue and returns at once. The loop sends the 6th request while the first 5 are still waiting or running. On two loads I saw only 5 of the 15 (form, person) copies made: all of Client A's, plus the Partner's IMM 5257. Seven were refused with "5 copies of this case are being generated; wait for them, then ask again". The 3 IMM 5257 SCH1 copies were refused with "No such form." (see O1).
* Failure scenario: the founder opens Demo and reads row 11. Its "why" says "IMM 5409 for Partner (Sample): 5 copies of this case are being generated; wait for them, then ask again" seven times, about a request no person made. The code comment says it asks for "a copy of every form the release files for each person", which is not what happens. How many copies get made depends on how fast the background fill runs, so the row's words can change from one load to the next.
* The test does not catch it: `tests/check_c10_1_configured.ts:185` only checks that `count(form_instance) > 0`.
* Fix:
  * Make the copies one at a time: after each `generate`, wait until that copy leaves QUEUED/RUNNING. Or ask only for what P-67 needs, for example one copy per person or only the principal's, and say that in the row.
  * Leave out the forms the copy route cannot take (SCH1) instead of listing them as refusals.
  * Pin the expected copy count in the test and add a fail case: no "being generated" refusal appears in row 11's words.

**m1 (Minor): the "asked" set is wider than the snapshot's.**
* Where: `engine/where-used.ts:109`. It builds the set of facts the combination needs from `fieldUses`, which includes check conditions and ONLINE-edition boxes on any filing line. The snapshot only places questions from form maps (ONLINE editions only on an ONLINE line with a matching portal) and from the conditions of forms, document lines, rules and questions. It does not use checks (`engine/snapshot.ts:180-186`). The snapshot also adds facts this set does not: derived inputs and the date of birth when a form has a minimum age.
* Scenario: a section that no combination chooses, holding a question whose own fact only a check reads, and whose condition reads a changed field. That section is listed as touched, but no case is ever asked that question. My probe confirmed this.
* Effect today: none in the checkpoint (21/21 match). The changed field is always read by the form's own box, which keeps the case of the question's own fact correct.
* Fix: one shared "facts a combination asks" function for both, or drop checks and the ONLINE-on-PDF boxes here. Add a fail test for the check-only case.

**m2 (Minor): the form rule says nothing about its condition.** `api/src/where-used.ts:125` falls back to "IMM 5476 is filed only when its condition holds", because `condition_plain` is null on all three IMM 5476 lines. The author cannot see what the rule is. Fix: say it from the condition itself. Here the condition is "exists" on the Representative Form Action field, so the label could name that field.

**m3 (Minor): a removed form field with no caption still shows its PDF path.** `api/src/impact-ai.ts:49` only handles the reworded case. A removed field with no caption is quoted by its path (the comparison stores the path as the caption at `impact-ai.ts:41`). If the old caption was empty, a reworded field prints `""` as its old caption. Not seen in this checkpoint. Fix: use the same "no caption of its own" wording in both places.

**m4 (Minor): the form-rule fail test cannot fail.** `tests/check_c91_impact_ai.ts:218` calls `fieldComponents(r2, ["rep.name"], {SP})`. SP files nothing and chooses nothing in `r2`, so the result is empty whatever the rule does. There is no fail case for the form rule itself. Add one of these:
* a line whose condition reads another field;
* the same line on a combination outside the set;
* a retired newest line.

Pass and fail cases per new rule:
* Section asked through a form: pass `:217`, fail `:218` (the "idle" section). Removing the new rule makes `:217` fail.
* Form rule: pass `:217`; the fail case is weak (m4).
* Field with no caption: pass `:224`. There is no assert that a captioned rewording still says `as "…"`.
* K1 example: covered by pack step 89 (fail side).
* Sample case: pass and fail at `check_c10_1_configured.ts:185-187`, but too loose (M1).

## The questions asked
* **Over-report and snapshot difference:** see the cross-check above and m1. Nothing that matters today.
* **Form rule on a combination that does not file the form:** the set of combinations comes from `formCombinations` (newest line, not retired), and `current()` drops retired lines. A rule from another form on a filing combination is listed. That is correct: it is that combination's own rule.
* **Injecting Runtime and CaseForms into Demo:** no cycle. Runtime needs Db, Workspace, Audit and Programs; CaseForms needs Db, Runtime and Audit; neither imports `demo.ts`. All are providers of the one module (`main.ts:211`).
* **Idempotency and reset:**
  * The keys are stored on the case, its people and its copies, all scoped to the workspace.
  * Loading again is refused with 409 and plain words, and 1 case remains.
  * Reset deletes the case, which also deletes its copies and its people's answers.
  * Risk: a copy job still in the background during a reset is caught, so the server does not stop (`fill-case.ts` drain).
* **Faked results:** none. The case is opened through the officer's own service calls, labelled Sample, nobody answers (fail check `:187`), and row 11 says "partial". The demo loader setting up through the product's services is how the rest of the checkpoint is built too, and Cases has its own screen. Not a P-33 issue.

## Outside this PR (for the tech lead, not a condition)
* **O1:** `fill-case.ts:44` `formOf` refuses "IMM 5257 SCH1" ("No such form."). Yet `forms.list` gives it as applying and for filing, and the case page shows "Generate a copy" for it (screenshot 3). I did not confirm the button's click end to end, so this needs its own row.
* **O2:** Components touched lists one entry per (section, field, combination), so App details appears twice per combination. The list has 21 entries. Grouping by section is a design question, not this row's.

## Screen-review items (runtime row: only what the diff touches)
* **D2 4:** no duplicate cases on reload (409, 1 case).
* **D4 4:** sections match the placements, 21/21.
* **D5 4:** reset and reload are clean.
* **D10 3:** M1's words and the m2 label.
* **D11 4:** row 11 is "partial" and says why.
* **D13 5:** axe finds 0 problems at 400, 1024 and 1440 px; keyboard reaches the tab and the underlined combination link.
* **D15 3:** the impact page opens in 1.5–2.0 s.
* **D16 3:** m4 and the M1 test.
* **D18 4:** Sample labels and US$0.
* **D17, D20:** simulated only.

The other D dimensions are not touched by this diff. I did not run the graph or check a retrofit mapping: no new screen.

Not checked: 200 % zoom, a real screen reader, an intended user walking it unaided. The `02-ai-work/screenshots/c91/*.png` files were already modified in the worktree before my runs (22:45), and I did not touch them.

Journey score (reviewer, the one score for this check): **7.5 / 10, below the pass mark of 8.** Details in `journey-test-reviewer-2026-11-04.md`.

**Verdict: Block.** Fix M1, then re-request review. The m1–m4 fixes are small and should come in the same PR.

## Round 2: head 98bbf8a2c9d6306acfab2c8e64050fcd90b947b4 (diff `f758c056c..98bbf8a2c` only)
Re-run on a fresh isolated copy (`b8_rev`, :4473, stopped after; US$0, no live AI). `check_c10_1_configured` **36/36**. `check_c91_impact_ai` **29/29** (run with `--tsconfig api/tsconfig.json`; the worktree was clean afterwards). Load again by hand: row 11 = **12 copies made, all GENERATED, none QUEUED, RUNNING or FAILED; all 3 people covered**; row 11 took 5.7 s, the whole load 58 s. Components touched still matches the snapshots: 21 sections, 0 listed but not asked, 0 asked but not listed. No raw PDF path in any label or why.
* **M1 closed.** `sample-case.ts:35-39` waits for each copy to leave QUEUED/RUNNING, up to 60 s, and counts only GENERATED copies. A copy that fails or runs out of time is named in words. The tests pin the copy count (`check_c10_1_configured.ts:120`) and fail on any "being generated", "did not finish" or "failed" refusal (`:121`). Row 11 now lists only the 3 "IMM 5257 SCH1: No such form." refusals, which are true. That is O1, a follow-up row, agreed.
* **m1 closed.** The asked set drops checks (`engine/where-used.ts:110`). The new fail case (`check_c91_impact_ai.ts:69`) would fail with the old rule.
  * Left (Minor, not blocking): every ONLINE-edition box is now dropped, including on an ONLINE line with a matching portal, which the snapshot does count (`snapshot.ts` fieldMaps). Only a question whose own fact appears only on a portal edition and whose condition reads the changed field could be missed. That cannot happen on the checkpoint.
* **m2 closed.** The label reads "IMM 5476 is filed only when Representative Form Action is answered" (`api/src/where-used.ts:130`).
  * Left (Minor): swapping keys for labels with `split/join` can break a key that starts with another key (`person.x` inside `person.x_date`). Swapping longest first prevents that. Answer values still show as keys (`"common_law"`).
  * One extra read per review, not one per row.
* **m3 closed.** `impact-ai.ts:59`, with a pass test (`check_c91_impact_ai.ts:78`).
* **m4 closed.** SP files IMM 1294, whose condition reads another field. The test fails if the form-rule loop stops filtering by field.

Journey re-score: correct data ½→1 and next step unchanged. Plain words stays ½ (the SCH1 refusal text, "Section b"). **8.0 / 10, passes, no criterion at 0.**

**Verdict: Approve** for head 98bbf8a2c. No open Blocker or Major. The two remaining Minors and O1/O2 are follow-ups.
## Round 3 (merge 077815341, origin/main into b0fe7658f)
**Conflict:** demo.ts's constructor keeps all three injections: main's ReviewProposals, and this PR's Runtime and CaseForms. All three are imported, there is no DI cycle, and row 11's call is unchanged (demo.ts:764). **Auto-merged files:** studio.ts keeps the K1 `words()` (:254-255). check_c10_1_configured.ts keeps every QA-231 and review-M1 line, beside main's QA-206 branches. The other files this PR touched are unchanged by the merge. **Re-run on the merged head** (fresh :4473, stopped after; US$0): check_c10_1_configured 36/36; C9.1 pack **17/17** (K1 is now green too); row 11 is unchanged (12 copies GENERATED; only the 3 SCH1 refusals). Row 17 now lists **4** combinations, because main's C11.7 part B adds IMM 5476 to Express Entry stream (draft, no form rule, so Rules is still 3). Main's QA-206 names the sections by their printed headings, giving 28 sections. 0 listed on a released combination without being asked. No clash.
**Minor (stale evidence, not product):** tests/qa/check_qa231_walk.cjs is **12/13** on the merged head. `:45` still expects "Appoint" and "App details", which are now "Section A: applicant information", "Section B: appointment of representative" and "Your declaration". `:3` and `:46` still say "three combinations". The walk is not a CI suite (select-suites reads tests/ and tests/runtime only), but this PR's walk evidence (13/13) no longer holds at the merged head. Update `:45`, and `:46` if it should name Express Entry stream, before quoting it as evidence. **Verdict: Approve** for merge 077815341.
## Round 4 (d397e9da8: tests/check_c91_impact_api.ts only; reviewed from code)
**The coordinator's reading is right; the product is right, the old assertion was wrong.** The test maps `c91.rep_phone` on IMM 5476's 2021 edition (a DRAFT map), and main's C11.7 part B files IMM 5476 on Express Entry stream (a DRAFT line). In draft mode, Express Entry stream's snapshot includes that edition's DRAFT entries (`snapshot.ts:25`, `effective` picks DRAFT). So `used` has the fact and `c91_q` is placed (`snapshot.ts:186`). Listing `c91_rep` there is the rule this PR set, which Round 1 checked as 21/21 against the release snapshots. The old step's "everything in Visitor visa" only held for the picks-only rule.
**The fix is sound and stronger, not looser:**
* `one()` now finds an entry by combination.
* Rules, checks and document types must still be on Visitor visa alone.
* The new step pins `c91_rep` to exactly the combinations that file IMM 5476 (`using`, read from the database), with no other section listed.
* The fail steps (the decoy rule) are unchanged.
I did not run it: the check restarts its copy with `STUDIO_AI_LIVE=approved` (on the fake launcher), and my brief forbids setting a live switch. The builder reports 34/34 on a fresh copy. **Verdict: Approve** for head d397e9da8.
