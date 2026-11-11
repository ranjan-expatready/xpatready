# QA-392b review: the answer sheet carries each recorded Yes/No as the PDF copy writes it (C7.3), PR #1563

Reviewer: screen-review skill, adapted to a bug fix on C7.3. Fresh context; I did not build it. Head **7b5218412**, merge base c658cbf0c. 11 Nov 2026. Ports 4456-4459 only, never :4400. Live AI off, US$0.

## The tech lead's four "done" points
1. **Test fails on main: met, but the test fixes a wrong label in place (M1).** `tsx studio/tests/check_qa392b_recorded_yes_no.ts` gives **12/12** on the branch (my copy, :4457). Run against main's server (worktree c658cbf0c, :4459) it gives **8/12**. The FAILs are PCR "India" and Education "SAMPLE" instead of Yes, and the every-box rule. It checks all 5 recorded boxes the copy writes, against the PDF read back with the E5 reader.
2. **One shared rule: met.** The sheet calls `formValues` the same way `writeForm` does (`api/src/fill.ts:55`), on the same boxes. The copy stores `markNothingRecorded(cov.boxes…)` at `api/src/fill-case.ts:322`; the sheet uses the same at `api/src/case-prepare.ts:904`.
   - **Edition:** both use `pdfMapInUse`. The sheet's fallback (`fieldMapOf`, the first map) only applies when there is no PDF map at all, so no copy can exist. It matches the edition `formCoverage` reads (`engine/render.ts:127`).
   - **Decode = encode:** `recordedYesNo` (`engine/form-values.ts:67-76`) reads the same `yes_no_code`/`check_code` step that `runTransform` writes (`p5/transforms.ts:160`). `inFormFormat` only reformats postal codes (`engine/form-steps.ts:30-36`).
   - **Survey:** I listed every recorded entry in the 6 checkpoint releases (scratch `survey.ts`, matches the PR table). None has an `option_map`. Every one ends in `yes_no_code:Y/N` or `yes_no_code:true/false`.
   - **Probe of each transform shape** (scratch `probe.mts`): written values decode right (Y/true, `check_code` 1). Results left "by a person" (B88, "valid … not expired", SCH1 Q8 prose) decode to nothing. `NOTHING_RECORDED` is gone with no other reader; the web never read the flag.
   - **Snapshot difference (negligible):** the sheet's snapshot joins all the case's added forms (`runtime.ts:162`); the copy's joins only its stage's (`fill-case.ts:376`).
3. **PDF unchanged: met.** `fill.ts`, `fill-case.ts`, `p5/transforms.ts` and the body of `formValues` are not in the diff. The live copy reads PCR/Education **Y** (principal) and **N** (spouse). I did not re-run `check_c72_imm5257_fill`.
4. **Packs: met.** Gate B on the checkpoint (`GATE_B_DATA=checkpoint`, :4456-4457) at this head:
   - C7.3 **17/17**, C7.3-screen **15/15**, C7.3-tick **15/15**, C7.8 **20/20**.
   - C7.2 **3/11**. Every FAIL is P-46 upload or Mac Adobe evidence (QA-315), the same as main per #1553's review.
   - Not re-run by me: qa's C7.3-15 (#1557).

## Independent judgements on the points asked
* **Own-question boxes take the form's caption: wrong for one box (M1).** IMM 5257's field list gives `usCardIndicator` the national-ID caption (`p1/inventory/imm5257e.inventory.json`, `USCard[0].q1[0].usCardIndicator[0]` = "National Identity Document Section Question 1. Do you have a national identity document?").
  - So part "3. US PR card" now asks "Do you have a national identity document?" (reviewer screenshot r5).
  - On main that line read "Whether the person is a lawful permanent resident…" (main run output above).
  - `AliasNameIndicator`, `natIDIndicator`, `PCRIndicator` and `EducationIndicator` carry their own captions.
* **A recorded box the copy leaves to a person keeps the old plain line.** This is acceptable for the released Online form. `usCardIndicator`'s fact is the person's own Yes/No, so the line is the person's own answer, not a duplicate. SCH1 is Online in no release. See m2 for the latent case.
* **Section fingerprints: acceptable.** The hash is over subject, fact, row and value (`answer-sheet.ts:72`). Own-question lines keep their hash: their value was already true/false. Only list-column lines with entries change ("SAMPLE" becomes true), so only those ticked parts go Out of date, which warns only. Old ticks with `nothing_recorded` are still named by their question (`case-prepare.ts:412`). The PR body names this under "On the demo".
* **Ordering (m1).** Lines follow coverage order (`answer-sheet.ts:112`, `for (const b of boxes)`), not the form's order. Education Q1 is the 8th and last line of its part (walk J1), but the form and portal ask it first.
* **Cost: no concern.** `formValues` is pure and in memory, and the field list is cached (`fill-case.ts:105-114`); `fieldsOpen` already runs it per readiness. The sheet's first view took 297 ms. I did not measure main against the branch.
* **QA-395 "reaches the sheet automatically": true for a computed fix, not for a "person decides" one (m2).** The in-flight fix (`origin/claude/forms-qa395`, test only, ac4b16849) computes Y/N from the form's limits, so it will reach the sheet. If any branch of it returns "by a person", the probe shows the sheet falls back to the list column's value at row null, which is QA-392b's original shape.

## Issues
* **M1 (Major, must fix): the US PR card answer is labelled with the national identity document question.**
  - Evidence: `engine/runtime/answer-sheet.ts:146` (`label: b.caption || label`); reviewer screenshot r5, 1440 px. On the checkpoint's Online IMM 5257, parts 2 and 3 both read "National Identity Document Section Question 1. Do you have a national identity document?".
  - The officer types from this sheet into IRCC's portal, the filed channel. A person with a national ID and no green card sees the same question answered Yes and No.
  - The new test asserts this label (`check_qa392b_recorded_yes_no.ts:273`, `l.label === b.caption`), and the builder's survey and walk did not notice it.
  - Fix, the builder's choice:
    - Option 1: keep the release's own question label where the box's fact is the person's own Yes/No question.
    - Option 2: use a caption only when no other box on the form shares it.
  - Either way, the test must require each recorded line's question to be that box's own. Example: `usCardIndicator`'s line does not read the national-ID question.
  - The wrong caption in the field list is a data finding for the forms/evidence lane to record. It is not new scope here.
* **m1 (Should): the Yes/No sits after its entry's facts.** The form asks it first. Fix: place a recorded line first in its part, or sort by the field list's order as `layoutOf` already reads it.
* **m2 (Should, note for QA-395's builder): a recorded box left to a person falls back to the list column's value line.** Probe: SCH1 Q8 shape gives "label(travel) = USA" at row null. Fix when it first occurs on an Online form: say "a person decides" (or wait) instead of the column value.
* **m3 (Minor, latent): `recordedYesNo` decodes only `yes_no_code`/`check_code`.** A recorded box spelled `checked_if_*`, `check_if_*` or `derive_inverse`, or written through an option map, gets no line or a wrong decode, silently. None of these occur on a released recorded box today (survey). Fix: decode by the same step list as `runTransform`, or add a pure step that fails for an unknown spelling.

**Escalation (not counted against this PR; QA-395, open Major).** The walk's own sample has one previous residence, in India, which is also the country of residence. Before, the sheet showed "India" and left Q8 A to the officer. Now it says **Question 8 A … Yes**, with Copy (builder screenshot 03; my walk J1). That wrong Yes now sits on the filed channel. The tech lead should merge QA-395 right after this PR, or reload the demo once both are in.

## Journey test (reviewer role; the one score for this check)
Persona: a case officer typing an Online IMM 5257 into IRCC's portal. Fresh checkpoint copy on :4459, headless Playwright, scripts in my scratchpad.

| # | Journey | Result |
|---|---|---|
| J1 | **Main path.** The principal has an education entry and a previous residence. Case page › "Open answer sheet: IMM 5257 for Sample Client A" › read Q8 A and Education Q1 › Copy › tick Education. | Both Yes, in the form's questions. Copy gives "Yes". The school appears once, on its row line. The tick is saved by user-O; the frozen line carries `recorded`. The 5 recorded lines show source Client, confirmed. |
| J2 | **Alternate.** The spouse's lists are "none apply". | All 5 recorded lines read No (exposes M1: two identical national-ID questions). |
| J3 | **Wrong role.** The client requests the sheet. | 403. |
| J4 | **Recovery and boundary.** Remove the education entry, then give "none apply". | Education Q1 reads No. The ticked part is Out of date with "…and 4 more changes". |
| UI | 1440, 1024, 720 (200 % zoom) and 400 px; keyboard only. | axe WCAG 2.2 A/AA: 0 violations at each width. No sideways scroll, no page errors. 22 Tabs reach the Q8 A Copy; Enter puts "Yes" on the clipboard and the focus is visible. |

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 |
| Next step obvious | 1 | "Entered in the portal" on each part; Copy on each line |
| Plain words | ½ | M1's wrong question on the US PR card line |
| Feedback and state | 1 | "Entered by …", Out of date (J4) |
| Correct data | ½ | Sheet = PDF on all 5 boxes, but M1 labels an answer with another question |
| Error recovery | 1 | J4 |
| Accessibility and screen sizes | 1 | UI row |
| Speed | 1 | 297 ms to the Education Q1 row |
| Visual quality | 1 | Same row design (r2, r4 at 400/720/1024) |
| Trust and sources | 1 | Source and mark per line; the copy's own value step |

**Journey score 9/10: pass.** To raise it, fix M1.

## Scorecard (scope: this fix)
**D1-D20 (out of 5):**
- D1 4 (M1) · D2 5 · D3 5 (one value step, no second copy) · D4 5 · D5 5 · D6 N/A · D7 N/A (no AI)
- D8 5 · D9 5 · D10 3 (M1) · D11 5 · D12 5 · D13 5 · D14 5 · D15 5
- D16 4 (the test asserts M1's label; m3) · D17 and D20 simulated only · D18 5 · D19 4 (m1)

**BIC (case side):** 02 and 11 Partly (M1). 03, 18, 19 and 20 Met. The rest are N/A.

**Other checks:** `count-any` 418. `typecheck.mjs`: "PASS no new type errors (15 known, 0 fixed)". `graph.mjs --check` exit 0. Pure tests: `check_qa392_nothing_recorded_sheet` 16/16, `check_vv_answer_sheet` 47/47, `check_m3s5_sheet_only` 29/29, `check_forms_b86_fill` 35/35, `check_qa165_gate_follow_ups` 38/38.

## Not checked
- A real screen reader, and a person walking it unaided.
- Adobe Validate (Mac, QA-315).
- qa's #1557 pack and C7.3-15, and `check_c72_imm5257_fill`, `check_vv_prepare_api`, `check_qa309_online_done`, `check_m3s5_online_only_api` (all taken from the PR).
- Main against the branch for prepare-view timing.

**Verdict: Block** (commit 7b5218412). Fix M1, and update the two tests that assert the caption label (`check_qa392b_recorded_yes_no.ts:273`, `check_qa392_nothing_recorded_sheet.ts:190`), with a failing case for a shared caption. m1-m3 are Should and do not block.
