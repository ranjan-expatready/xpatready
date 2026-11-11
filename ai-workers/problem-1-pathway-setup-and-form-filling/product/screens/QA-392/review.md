# QA-392 review: the answer sheet shows the No the PDF copy writes (C7.3), PR #1553

Reviewer (screen-review skill, adapted to a bug fix on C7.3; fresh context, did not build it). Head **772ccdd4d** on base 03dff193d. 11 Nov 2026. Ports 4456-4459 only, never :4400. Live AI off, US$0, no priced button pressed. Skill verdict: **Ship**.

## The tech lead's three "done" points
1. **Shared rule, test fails on main.** Both paths call `markNothingRecorded`: `api/src/case-prepare.ts:895` (sheet) and `api/src/fill-case.ts:137` (copy). `engine/runtime/answer-sheet.ts:121-123` turns a marked box into a line. `tsx studio/tests/check_qa392_nothing_recorded_sheet.ts`: **10/10** on the branch, **3/10** with main's code (worktree, same test; the 7 sheet steps FAIL). Met.
2. **C7.3-14 asserts and passes on the checkpoint.** Gate B (`GATE_B_DATA=checkpoint`, ports 4456-4458): C7.3 **17/17**. Main's code on a fresh checkpoint copy (:4456): **16/17**, only C7.3-14 FAIL (`missing: PCRIndicator (no line), EducationIndicator (no line)`). Met.
3. **Packs green, PDF unchanged.** On the branch: C7.3-screen 15/15, C7.3-tick 15/15, C7.8 20/20. C7.2 is 3/11 on both main and branch, and the step-by-step diff is identical: the same **8** FAIL lines, all Mac Adobe evidence or P-46 upload (QA-315). `fill-case.ts`, `form-values.ts` and `p5/transforms.ts` are untouched. A live copy's XFA reads `PCRIndicator 'N' | EducationIndicator 'N'`. Met.

## Independent judgements on the points asked
* **Is `false` / "No" always what the PDF writes?** Yes for every transform in the repo today. I ran every distinct `transform` in `prototype/p2/runs/*.json` (1013 transforms) through `runTransform`. The 8 that `markNothingRecorded` can mark (RECORDED and PROSE_RECORDED, including the QA-165 gate ones: national ID, US card, other names) give the same output for the PDF path (`null` + `nothingRecorded`) as for the sheet's `false`: N/N for the Y/N kinds, false/false for the SCH1 prose kinds. 0 mismatches. A gate No reaches the same `NOTHING_RECORDED`, so the value is the same. One latent gap is m2.
* **`vouch` (source and mark fallback).** Correct, and it touches no existing line. It runs only when `origin` finds no answer of its own, or `markOf` finds none at `row === null` (`case-prepare.ts:883-890`). Relatives are keyed `<id>/parent_1`, so `vouch(person, …)` cannot reach a relative's section. Evidence: the finished story was loaded by **main's** code, then the same database was served by main (:4458) and by the branch (:4457). Across all 3 Online IMM 5257 sheets the only difference is the 2 added "nothing recorded" lines per item. No label, value, source, mark or to-confirm changed on any other line. Live: an officer's confirmed "none apply" gives source Case officer, mark confirmed. A client's own "none apply" gives source Client, mark declared, `to_confirm` false. That is the case view's own meaning of a client's declared answer (`engine/runtime/case.ts:94`), the same as every other client line. Untested, see m1.
* **The QA-309 behaviour change.** Right for the officer (P-65): the portal holds a No that nothing vouches for any more, so Out of date (warns only, FQ-6) is the truthful state. The part still lists what it waits for: J4 shows 7 education facts waiting. The words are right and plain: "IMM 5257 (Education) as entered in the portal (11 Nov 2026) is out of date: “Education Section Question 1. Have you had any post secondary education …?” of Sample Client A changed from No to no answer. Enter the new answers in the portal and tick the section again, or undo the change before filing." Giving "none apply" back returns the item to Done (`check_qa309_online_done.ts`, as the builder ran it).
* **Ticks made before this change.** Acceptable. On data ticked before this change, the 3 Online IMM 5257 items go from Done to **Out of date** (Personal details, Education): "Question 8 A… changed from no answer to No". That is true, because the officer ticked those parts while the sheet gave no answer. The finished story loaded by the **branch's** code ends in the same states as main's (3 Done, 1 To do), so only data ticked before the merge (the :4400 demo, if it is not reloaded) shows it. See m6.
* **The C7.3-14 rule.** Sound. Where the release maps a "recorded" Yes/No box, the step requires `nothing.length > 0` and every such box to have its line, with `value === false` and `copy_text === "No"`. It says "(this release maps no such box)" only when there are none, so it never passes vacuously on the checkpoint, and it fails closed if a case has entries everywhere. It reads the boxes stored with the copy, not the fill result (m5).
* **Every PR and STANDARDS.** Title names C7.3. Body has the plan, checks, screenshots, "On the demo", cost, context share and Questions. `qa/built/QA-392.md` is added. `Fixes: QA-392` is on its own line. `graph.mjs --check` exit 0. `count-any`: 418 = 418, the same as main. `typecheck.mjs`: "no new type errors (15 known, 0 fixed)". No schema change, no `contracts/` change, no new technology. qa's pack was changed with qa's OK asked in the PR (P-334 (4)). Still to come: m1's test, and the C7.2 count in the PR body (m4).

## Issues (no Blocker, no Major introduced by this PR)
* **m1 (Should, before the label): `vouch` has no test.** "Every business rule has a passing and a failing test" (WAY-OF-WORKING). The pure test stubs both inputs `vouch` feeds, `origin` (`() => "questionnaire"`) and `markOf` (`() => undefined`), at `tests/check_qa392_nothing_recorded_sheet.ts:248`. C7.3-14 checks only `value` and `copy_text` (`acceptance/C7.3.test.ts:133`). Removing `vouch` would turn these lines into source "Case officer" with mark null, and no test would go red. Fix: in C7.3-14, also assert each line's `source` and `mark` against its "none apply" (`fillEverything` gives the officer's confirmed one, so "Case officer" and "confirmed").
* **m2 (Should): the PDF value is not structurally tied to `NOTHING_RECORDED`.** `formValues` takes the option-map branch (`engine/form-values.ts:47`) before `runTransform`. A recorded box whose map entry carries an `option_map` on an answer-list fact would be "by hand" on the PDF while the sheet says No. Today 0 of the 8 recorded entries carry one. Fix: in the pure test, loop over every recorded kind (not only the two IMM 5257 ones), or have C7.3-14 read the copy's `result_json` box result "written".
* **m3 (Should): unclear words after an entry is added to a ticked "none apply" list.** The change reads "Name of the school or facility attended of Sample Client A changed from No to "SAMPLE"". The frozen line's own question is lost because `factChanges` takes `(y ?? x).label` (`engine/runtime/out-of-date.ts:45`). Fix: `label: y?.label ?? x?.label ?? words.label(f.fact)`. Part of this comes from P1 below.
* **m4 (Should): PR body.** It says C7.2 has "the same 5 FAILs". It has 8 FAIL lines (3/11), the same on both main and branch.
* **m5 (Should): C7.3-14's label says "the PDF copy writes as No"** but the step reads the stored boxes (`form_instance` snapshot), not the fill result. Covered by the pure test and my XFA read. Optional: assert `result_json.boxes[].result === "written"` too.
* **m6 (note for the tech lead): the :4400 demo.** Existing Online IMM 5257 ticks show Out of date after the merge unless the finished story is reloaded. Name this under "On the demo".
* **P1 (pre-existing on main, not this PR; a new qa row is recommended, likely Major): the Yes side of the same mismatch.** With an education entry recorded, the PDF writes `EducationIndicator 'Y'` (live XFA). The sheet has no "Yes" line for Education Q1. Instead it shows a second "Name of the school or facility attended: SAMPLE" at row null. Main's code on the same database shows the same two lines. C7.3-15 does not catch it, because it matches by fact, not value.

## Journey test (reviewer role; the one score for this check)
Persona: the case officer typing an Online IMM 5257 into IRCC's portal. Fresh checkpoint copy :4459; script in the reviewer's scratchpad.
| # | Journey | Result |
|---|---|---|
| J1 | Main: lists "none apply", open the sheet, read Q8 A and Education Q1, then make the PDF copy | Both read **No** in the form's own question, with Copy. XFA: N and N. Fill report: `result: written, nothing_recorded`. |
| J2 | Wrong role: the client opens the sheet | 403 |
| J3 | Alternate: the client gives "none apply" themself, then Confirm section | No · Client · declared, then confirmed. No duplicate line. |
| J4 | Recovery: tick every part (Done), take "none apply" back | Out of date, with the reason quoted above. Education waits for 7 facts. |
| J5 | Across the boundary: add an education entry after the tick | Out of date with 7 changes (m3 wording). Exposes P1. |
| UI | 1440, 1024, 720 (200 % zoom of 1440) and 400 px; keyboard only | axe WCAG 2.2 A/AA: 0 violations at every width. No sideways scroll, no console errors, first view 436-545 ms. 71 Tabs reach the Education Q1 Copy; Enter puts "No" on the clipboard and shows "Copied"; focus is visible. |

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1. Builder's `screenshots/03`, `04`. |
| Next step obvious | 1 | "Entered in the portal" on each part. The out-of-date reason says what to do. |
| Plain words | ½ | The form's own questions are used. m3's "Name of the school… changed from No to SAMPLE". |
| Feedback and state | 1 | "Copied", "Entered by …", Out of date, the waiting list. |
| Correct data | 1 | PDF N equals sheet No. The main/branch diff changes no other line. |
| Error recovery | 1 | J4, and give it back → Done (QA-309). |
| Accessibility and screen sizes | 1 | The UI row above. |
| Speed | 1 | Under 0.6 s at every width. |
| Visual quality | 1 | Same row design as every other line (builder `05`; reviewer 1024 and 400 px). |
| Trust and sources | 1 | Source and mark come from the "none apply" that vouches for the line (J1, J3). |
**Journey score 9.5/10: pass** (8 or more, no 0). Raising it: m3.

## Scorecard (scope: this fix; out of 5, N/A where the fix does not touch it)
D1 5 (both paths agree, done points 1-3) · D2 5 (one line per box; dedupe at `answer-sheet.ts:122`) · D3 5 (one rule, no copy) · D4 5 (only a confirmed "none apply" or gate No marks a box; the fail guard passes) · D5 4 (take back and give back recover; m6) · D6 N/A · D7 N/A (no AI) · D8-D9 5 · D10 4 (m3) · D11 5 · D12 5 · D13 5 · D14 5 · D15 5 · D16 4 (m1, m2) · D17 and D20 simulated only (no intended user walked it) · D18 5 · D19 4 (P1 is outside this fix).
BIC (case side): 02, 03, 11, 18, 19, 20 Met. 03 is the Out-of-date reason; 18 is that "No answer to type" is gone where the PDF writes a value. The rest are N/A: no question, document, signing or channel change.

## Not checked
A real screen reader. A headed browser in front of a person (the walk was headless Playwright plus axe). The nightly full suite set (the PR's CI runs it). The `check_*` suites that need a server, except the ones re-run above (I re-ran `check_vv_answer_sheet` 47/47 and `check_m3s5_sheet_only` 29/29). Adobe Validate (Mac only, QA-315).

**Verdict: Approve** (commit 772ccdd4d). No open Blocker or Major. m1-m5 are Should fixes for the builder, m6 is a note for the tech lead, and P1 is for qa to file.

## Re-review (diff): 772ccdd4d..63093d9f8 (11 Nov 2026)
Two commits since the approved head: 03e1aed10 (m1, m3, and this review.md, byte-identical) and the merge 63093d9f8 of origin/main (df3d60ed5, P-270).
* **The merge is clean.** Its second parent is main's tip. Against it, the merge differs only in the PR's own 14 files, and each file's changed lines are byte-identical to `03dff193d..03e1aed10` (compared per file, `+`/`-` lines only). `git diff 03e1aed10 63093d9f8 -- api/src/case-prepare.ts` matches main's own BK-8 change (5fb174b0f, 3222b54b5: `feeRule`/`bioAges` → `stepRule`/`biometricsWaits`) hunk for hunk. The PR's import (`gateOf`, `markNothingRecorded`, `GatePlacement`) is kept.
* **m1, fixed.** C7.3-14 now also requires each No line's `source` and `mark` to equal those of the "none apply" that vouches for it. Proof that it catches a missing `vouch`: with `vouch` replaced by `() => null` (scratch worktree at 63093d9f8, :4457, fresh checkpoint), C7.3 is **16/17**: `C7.3-14 FAIL … PCRIndicator (No, Case officer, null; none apply confirmed)`, and the same for EducationIndicator. Unmutated head (:4456, fresh checkpoint): **17/17**, exit 0. `recorded: 5, nothing: 2` on the checkpoint.
* **m3, fixed.** `engine/runtime/out-of-date.ts:45` now uses `label: y?.label ?? x?.label ?? words.label(f.fact)`. Only `case-prepare.ts` passes a `label`. `review.ts` passes `FormFact` objects, which have no `label` field (`engine/runtime/forms.ts:20`), so its words are unchanged. The new pure step fails when the old line is put back: 10/11 with it, 11/11 without.
* **Re-run on 63093d9f8.** Pure test 11/11. `check_vv_answer_sheet` 47/47, `check_c92_out_of_date` 29/29, `check_b128_relatives` 20/20 (the other `factChanges` tests). Type check: "PASS no new type errors (15 known, 0 fixed)". `count-any` 418, the same as before.
* **n1 (Minor, new, latent; fails closed).** C7.3-14's own oracle finds only a "none apply". A box marked through a gate's No (QA-165), whose source and mark the product takes from the gate answer, would be reported missing, a false red. On today's checkpoint all 3 gate boxes are confirmed facts, not marked, so it cannot happen yet. Fix when a release marks one: fall back to the gate's No answer (`gateOf`), as `case-prepare.ts` does.
* m2 and m5 are still open as listed in the PR. m4 and m6 go in the PR body; P1 is filed separately. None blocks the merge.

**Verdict: Approve** (commit 63093d9f8)
