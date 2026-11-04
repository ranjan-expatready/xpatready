# QA-144 slice 2: independent review of 69ca9b06 (PR #878, runtime lane): With an LMIA from its forms

Reviewer: a fresh context that did not build this. 4 Nov 2026. US$0: live AI off. I used my own copy `rv2` on port 4482 and stopped it afterwards (database dropped).
Diff reviewed: `git diff ba0bd37f..69ca9b06` only. #798's own changes were not reviewed again.

## Verdict (screen-review): Ship after fixes. Open: 1 Blocker, 1 Major, 5 minors.

## What I ran
* On `rv2`:
  * `check_qa144_lmia_release.ts`: **22/22** (load 75.8 s);
  * `check_qa144_vv_release.ts`: **28/28**;
  * `check_c10_1_configured.ts`: **30/30**;
  * `qa/check_qa144_lmia_walk.cjs`: **16/16**. The walk overwrites the builder's `slice2-*.png`; I restored them with git.
* My own Playwright journey at 1440, 1024 and 400 px:
  * no sideways scroll;
  * axe WCAG 2.2 A/AA: 0 violations on Questionnaires, Forms, Preview and Review at 1440;
  * no console errors;
  * first views take 1.1 to 2.3 s.
* `esbuild` on `tests/check_forms_channels.ts`: **does not parse** (see B1).
* CI at 69ca9b06: `types` **failed**, with 12 new errors, all in `check_forms_channels.ts`. The shards were still running.
* "Fails on main" was checked by reading, not by running. Main's `SET_UP_FROM_FORMS` holds only `vv.single`, and main's C10.1 line asserted that With an LMIA stays a draft.

## Citations: checked against the saved files
* **Guide 5553** (`dcterms.modified` 2026-06-05; manifest: downloaded 27 Oct 2026). Both quotes are word for word: "The following are the forms that must be filled out and submitted: … [IMM 5409] (opens in a new tab), if applicable" and "Fill out this form only if you: are appointing … cancelling a representative's appointment." The only differences are typographic: the page has "representative’s" with a curly apostrophe, and the HTML has a space before ", if applicable".
* **IMM 5556 (03-2024)**, from its XFA template read with pypdf: the IMM 5476, IMM 5475 and IMM 5409 lines are word for word.
* **canada.ca "Work permit from inside Canada: Forms and documents"** (modified 2026-05-15; recorded 27 Oct 2026 in `canada/index.json`): the quote is word for word.
* **IMM 5707 (01-2023) p. 1**: "This form must be completed by: each person, 18 years of age or older, or a minor (less than 18 years of age) travelling alone." Word for word.
* No value is invented. Two readings need to be flagged for the expert (m1 and m2).

## Issues
**R1-B1 (Blocker, Must). `tests/check_forms_channels.ts:128`: `const both` is declared a second time; the first is at `:379` in the same scope**
* esbuild refuses the file ("The symbol "both" has already been declared"), so the whole F1 forms-channels suite cannot run. That includes the slice's own option-map pass/fail pair at `:126-131`.
* The `types` check is red (TS2451, then TS2339 and TS7006 at `:381-382`), so the PR cannot go green.
* The builder's evidence does not list this suite.
* Fix: rename the new variable, run `check_forms_channels.ts` on a copy, and show `types` and the shard green.

**R1-M1 (Major, Must). `engine/options.ts:29-30`: the post-pass is one-sided**
* It requires exactly one free option per value, but not exactly one value per option. When two unmatched values end in the same option label, the first value in list order takes the code without anything saying so.
* Run with tsx: `["Simplified Chinese", "Traditional Chinese"]` against the option `"Chinese"` maps `simplified` to `ZH`. Likewise `["Legally Separated", "Judicially Separated"]` against `"Separated"`.
* `optionMapProblems` then reports only the second value, so the arbitrary code is never questioned.
* This is the shared engine behind the Form library's "draft option maps" button (`forms.ts:229`), not only the loader.
* Today's lists are not affected: `marital_status` has no two values sharing an ending.
* Fix: map only when the option is the ending of exactly one unmatched value. Add that case as the failing half of the test.

**Minors (Should)**
* **R1-m1. `demo.ts:81`: IMM 5707 is required of each person 18 or older on an evidence base that only says "may include".**
  * Guide 5553 never names IMM 5707 (0 hits), and IMM 5556's forms list does not either. Only the canada.ca page names it, under "Your document checklist may include…".
  * The cite also quotes "or a minor … travelling alone", which `minAge: 18` does not model.
  * It follows the brief and is labelled Sample, but the cite should say that the guide and the checklist are silent, and that the minor clause is not modelled, so the expert sees both.
* **R1-m2. `demo.ts:121-127`: no source covers With an LMIA filed online.** In that case `familyForm` gives IMM 5645, but `FAMILY_FORM_BY_CHANNEL`'s source is the Visitor visa's (Guide 5256), and nothing on the LMIA page names IMM 5645. It cannot happen in this load (IMM 5710 is filed as a PDF upload). Fix: give the online choice per combination in `FORM_SETUP`, or label it "no source for online: Sample, Unconfirmed: expert".
* **R1-m3. `form-part-placements.ts:96-103`: R2-m1 can unchoose a choice a person made.**
  * It cannot happen today. The load runs only on a blank demo workspace (`demo.ts:141,159`), and `placeFromFormParts` has one caller.
  * `sqr_section_selection` does not record who chose a section. So once the planned screen button (`:7-8`) calls this step, it would also unchoose a person's own choice on another combination, with no reason in Activity. That is acceptable for this slice, but write it into the header so the button's row deals with it.
  * Also, `out.unselected` is never reported. Row 7 does not say that four Visitor visa sections were unchosen; only Activity shows it. Fix: name them in row 7's text.
* **R1-m4. `demo.ts:556-560`: the IRM 0002 fact skips R2-m1's re-check.**
  * The fact (`ruleFact`) is placed after `placeFromFormParts` has re-checked the sections. On the Visitor visa it goes into `personal_details`, which was still chosen at that point.
  * In this run, `personal_details` ends up unchosen only because With an LMIA's later placement removed it. Nothing protects a Visitor visa that loads alone.
  * Fix: place the rule fact before the re-check, or re-check after it.
* **R1-m5. `demo.ts:490,536`: the shared marital list depends on the order of the six, and a second list is left unused.**
  * `person.marital_status` takes the first combination's list (`marital_status`, from IMM 5257: "Legally Separated"). The post-pass works in one direction only, so with the order reversed, IMM 5257's "Legally Separated" would get no code and block the Visitor visa. The order is fixed today, so the result is stable but not stated anywhere.
  * IMM 5710's list (`marital_status_2`) is still accepted and then approved by the Approver into the shared library, linked to no field (checked in the database).
  * Fix: reject the second list with a reason ("the shared field already has a list"), and state the order in the code.

## What held
* **P-319.** The changed steps name no form number outside `FORM_SETUP`, `FAMILY_FORM_BY_CHANNEL` and the rule tables; the others are in comments only. The `FORM_SETUP` refactor leaves the Visitor visa unchanged: 28/28.
* **Extra (2), R2-m1 on other combinations.** This is right and needed. The Visitor visa's `personal_details`, `contact_information`, `background_info` and `education` were unchosen by the author, and 13 sections are still chosen. The check works the same whichever combination places first.
* **Extra (3), rules passes read workspace-wide.** This is sound under P-138: the boxes still come from this combination's own `field_maps` only.
* **Extra (5), RELEASED counts as approved.** RELEASED is the status release itself sets (`library-changes.ts:242`). The guard that the author approved nothing is kept.
* **Release order.** Release comes after every placement (`demo.ts:584`), so R2-m1 never edits a released draft.
* **Screens' services only.** `FormLibrary.attach` (audit "reused" ×4 by the author), `saveForm`, `selectSection` and `decide`. No SQL write, no LIVE job, the ledger is unchanged.
* **Pass/fail pairs.** They exist for the release, IMM 5645, R2-m1 (by reading: removing the unchoose fails `unchosen !== ""`) and the option map's pass side. The option map's fail side cannot run until B1 is fixed, and it lacks M1's case.

## D1–D20 (1–5)
D1 4 brief met · D2 3 M1, m5 · D3 3 orphan list (m5) · D4 4 R2-m1 holds · D5 4 double load refused (C10.1) · D6 4 audit on every step · D7 4 US$0 · D8 4 no change · D9 3 "Forms 15 to do" on a released combination · D10 2 section names ("Coming into cda"; slice 1 m5)
D11 3 unchosen sections not reported (m3) · D12 4 no change · D13 4 axe 0 violations, widths fine · D14 4 no change · D15 3 1.1 to 2.3 s first view · D16 2 B1 · D17 simulated only · D18 4 quotes exact; m1, m2 · D19 4 With an LMIA released · D20 simulated only.

## Journey test (reviewer role; the one score for this check)
Journeys: J1 author, after Reset, loads the checkpoint and opens With an LMIA's SQR, Forms, Preview and Review · J2 Preview with a spouse or partner · J3 the Visitor visa with a child aged 1 after With an LMIA's load · J4 a second load (refused) and Reset (C10.1) · J5 400, 1024 and 1440 px, keyboard Tab to the tabs.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Release 1 at US$0, 0 blocks |
| Next step obvious | ½ | The header says "Waiting for the immigration expert" and "Forms 15 to do" while the combination is in Release 1 |
| Plain words | ½ | Raw section names; IMM 5707 shows "Added from the library by a person" although the loader added it |
| Feedback and state | ½ | m3: row 7 is silent on the unchosen sections |
| Correct data | ½ | m5 orphan list; M1 is latent |
| Error recovery | 1 | 409 on a second load; Reset is clean |
| Accessibility and screen sizes | 1 | axe 0; no sideways scroll at any of the three widths |
| Speed | ½ | 1.1 to 2.3 s against the < 1 s budget; load 73 to 76 s |
| Visual quality | 1 | Team look holds |
| Trust and sources | ½ | The cites are exact but live in code only; IMM 5707's line shows no source and no "Unconfirmed: expert" |

**Score: 7/10. Not a pass.** The fixes that would raise it most: B1 and M1 (correct data), m3 (feedback), m1 (trust).

**Could not check:** the branch merged with current main (38 commits ahead, including C3.8 P-319 family-form roles in `demo.ts`: 356f1c31, e0820e63; it merges cleanly as text, and CI on the merge will show the rest); the builder's 6/22 on main and 25/28 with the unchoose removed (not run); a real screen reader; 200 % zoom (400 px stood in); an intended user's unaided walk.

**To fix:** R1-B1 and R1-M1. R1-m1 to R1-m5 with them, or on the slice 3 row.

Verdict: Changes requested

## Round 2: diff-only re-review of e9f5e3d7 (`git diff 69ca9b06..e9f5e3d7`)

Reviewer: the same fresh context, 4 Nov 2026. I ran e9f5e3d7 from a separate git worktree, on port 4482 with database `xr_studio_rv2`. I started it with the same steps as `isolated.sh`, because the sandbox refuses its database status check on a scratch path. The server is stopped, the database dropped and the worktree removed.

**What I ran on e9f5e3d7** (`tsx --tsconfig api/tsconfig.json`, as `run-suites` does):
* `check_forms_channels.ts`: **107/107**;
* `check_qa144_lmia_release.ts`: **22/22**;
* `check_qa144_vv_release.ts`: **28/28**;
* `typecheck.mjs`: "no new type errors (15 known, 0 fixed)".
* CI for e9f5e3d7 was still queued. The walk screenshots are the walk's own output at 3b6efbdf; I did not re-walk.

**Round 1 findings**
* **R1-B1: fixed.** `exactFirst` replaces the second `both` (`check_forms_channels.ts:128`). The file parses and the suite runs in full.
* **R1-M1: fixed.** `engine/options.ts:29-32` maps a value only when it has exactly one free option as its ending, and no other unmatched value ends with that option. I ran it with tsx:
  * the IMM 5710 case still maps Legally Separated to 05;
  * Simplified and Traditional Chinese against "Chinese" map nothing;
  * "Not Legally Separated" and "Judicially Separated" against "Legally Separated" and "Separated" map nothing.
  * The failing half is now tested (`check_forms_channels.ts:131-133`).
* **R1-m3: the reporting part is fixed.** Row 7 names the unchosen sections, and the LMIA check asserts it (`:82`). The risk to hand-made choices is deferred to the screen button's row, with the reason given. That is acceptable while the blank-copy load is the only caller.
* **R1-m4: fixed in the code.** `keepChosenEveryones` runs again after the IRM 0002 fact is placed (`demo.ts:561`).
  * Audit order: the Visitor visa's `personal_details` is removed at 04:01:18, during its own step. That is before With an LMIA's first selection (04:01:20).
  * In round 1 it was removed only later, by With an LMIA.
* **R1-m1, R1-m2, R1-m5: unchanged, and moved to the PR as questions for the tech lead and the expert.**
  * I agree none must be fixed before merge. m1 is labelled Sample and quoted exactly; m2 cannot happen in this load; m5 is deterministic today.
  * One condition: m5's unused `marital_status_2` must be on the tech lead's list, because it is an approved item in the shared library.

**New this round (minors, Should)**
* **R2-m1 (this round; not slice 1's rule of the same name). R1-m4's fix has no failing test.**
  * If the new `keepChosenEveryones` call is removed, every check still passes, because With an LMIA's placement later unchooses `personal_details` on the Visitor visa anyway.
  * Fix: assert in the LMIA check that the Visitor visa's removal of the IRM 0002 fact's section comes before With an LMIA's first section selection in Activity.
* **R2-m2 (nit). Row 7 names the same combination two ways** (`demo.ts:565,577`, by reading). The Visitor visa's own entries use the six's path label ("Visitors › Visitor visa"); entries from another combination's pass use `combination.label` ("Visitor visa"). Row 7 would then list the Visitor visa twice. Fix: use one label source.

**Journey test, round 2: 7½/10. Still not a pass.**
* "Feedback and state" rises to 1 (row 7 now says what was unchosen).
* "Correct data" stays at ½ (m5's unused list).
* The other half points (next step, plain words, speed, trust) come from screens that existed before this slice, or from questions now with the tech lead. Not re-walked.

Verdict: Approve e9f5e3d7

## Round 3 (merge check): 28cf7e8c, 3b1adfd7 and `git diff 3b1adfd7 da761218`

Reviewer: the same fresh context, 4 Nov 2026. My copy `rv2` ran on port 4482 at da761218, the head of this working copy; it is now stopped and its database dropped.

**What I ran on da761218**
* `check_qa144_lmia_release.ts`: **23/23**. The load took 60.7 s and released With an LMIA at US$0.
* `check_c10_1_configured.ts`: **31/31**, including main's new line "every configured release's draft matches its release right after the load" (drifted: none).
* `check_qa144_vv_release.ts`: **28/28**.
* `typecheck.mjs`: "no new type errors (15 known, 0 fixed)".

**1. The conflict resolution in 28cf7e8c holds.**
* The combined diff keeps both sides:
  * #798's QA-182 wording, "form field" instead of "box", in the `noSection` line and in row 7's "facts asked in the section of their form field";
  * this slice's `keepChosenEveryones` call, the `unchosen` collection and row 7's unchosen clause.
* The `++` line in row 7 is #798's text with this slice's clause added at the end. Nothing from either side is lost, and the imports merge cleanly.

**2. The follow-up commit da761218 holds.**
* **Round 2's R2-m1: fixed.** The new assertion (`check_qa144_lmia_release.ts:85-91`) requires the Visitor visa to remove the IRM 0002 fact's section before With an LMIA's first selection.
  * The round-1 Activity data, from before the R1-m4 call existed, shows the removal coming after LMIA's selections, so the line fails without the call. This agrees with the builder's 22/23. With the call it passes.
  * It compares timestamps as text. That is safe here, because every timestamp comes from one session in one time zone.
* **Round 2's R2-m2: fixed.** `nameOf` now reads `combination.label` for every combination (`form-part-placements.ts:106-107`), so each combination is named once in row 7.
* **The C10.1 B10 label: sound.**
  * The line is unchanged except for its label.
  * I ran main's `gate-b.mjs` `packVerdict("C10.1", ["B10"], …)`. It passes on a `PASS  C10.1 B10` line even when other part B lines fail, and refuses on `FAIL  C10.1 B10`.
  * Naming only step B10 matches what this slice delivers: the other part B lines wait on the Visitor visa's release (IRM 0002's paid map) and on rows 9, 11, 12 and 17.

**3. Main's merged changes do not break this slice.**
* **`applySampleFormRoles`** runs once before the releases (`demo.ts:601`) and again after the load (`:164`). It sets IMM 5707's and IMM 5645's `family_information` role only where none is set yet, so the second call changes nothing. C10.1's no-drift line proves this on the released With an LMIA.
* **`STARTED_FROM_RELEASE` (#837)** is read only by Demo › Start With an LMIA (`releaseWithSources`), on the six. The configured load never calls it, and it refuses a combination that already has a release. Gate B in CI ran C5.4 27/27 on the six at da761218.

**CI at da761218: red, but not because of the code.**
* Shard 1 stopped at gate B. Its log shows `PR_BODY: Capabilities: C10.1, C5.4`: the body as it was when the push event fired, before the edit to "C10.1 (steps B10)". Gate B therefore ran the whole C10.1 pack (15/23).
* Shards 2 to 6 were cancelled, so **no suite has run in CI on this commit**.
* `ci.yml:31` does not trigger on `edited`, and re-running a job reuses the old event's body. To refresh the body without changing the head commit, close and reopen the PR (`reopened` is a trigger). An empty push would also work, but that moves the head off the commit reviewed here.

**Open: none new.** R1-m1, m2 and m5 stay as questions for the tech lead and the expert, with m5's unused list on the tech lead's list, as round 2 said. The hand-choice risk stays with the screen button's row.

**Journey test: 7½/10, carried. Not a pass. Not re-walked.** Round 2 recorded what keeps it below 8.

Verdict: Approve da761218 (merge only on a green CI run that reads the current body)
