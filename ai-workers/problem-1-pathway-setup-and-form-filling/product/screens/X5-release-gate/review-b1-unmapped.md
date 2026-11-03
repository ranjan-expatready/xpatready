# Review: V3 B1, release refuses forms with no field map (commit 3b17711d0)

Reviewed by reading `git diff 762dbae6b..3b17711d0` and files via `git show`. No server started, no checkout, no suite run by me. Live AI off, US$0: confirmed (rules and SQL only, no model call in the new test or in validate()).

## Verdict summary
The release rule is right and matches the case gate. The new error leaks into a second, shared reader (`missingItems`' filing bucket and the setup checklist), which duplicates the cause and gives the wrong next step. Two Majors.

## (1) Predicate
- `validate.ts:68` equals `engine/programs.ts:65` token for token (`data_form`, `channel !== "ONLINE"`, `entries.length`). Parity with the case gate is exact, which is what P-297 (3) asks.
- ONLINE-only line: a map filed ONLINE does not count, so the form is refused. Consistent with P-102 (every form is read from its PDF). Right.
- Document / checklist kinds: skipped by `form_kind`. Right.
- Map whose entries are all `unresolved` / `not_a_fact`: `entries.length` passes, and so does the case gate, so a release and a case both go through while nothing can fill. Not a B1 regression (parity holds); recorded as Minor M1, a rule for both gates together, not this PR.
- The test mirrors the predicate in `unmappedOf` instead of asserting an ONLINE-only or all-unresolved map case: Minor M2.

## (2) Other callers of validate()
Callers: `api/src/studio.ts:428` (problems(): Review and release, submit, approve), `api/src/programs.ts:196` (draft), `:205` (release snapshot), `:309` (startableMissing). Test callers use their own snapshots.

**Major 1: the same cause is reported twice, with a wrong next step, in `missingItems`.** `engine/programs.ts:73-75` treats every `where === "Forms"` error as a filing problem. The new error is `where: "Forms"` (`validate.ts:70`), so a combination with unmapped forms now gets `form_without_edition` ("No form fields mapped yet for X. Next step: Draft setup") plus `filing_problem` ("1 form cannot be filed as set (first: No form fields mapped yet for X: a case could not fill it, so firms could not open cases on this release...) Next step: change how it is filed (Overview > Forms)"). Reaches: Programs row missing list and header (`api/src/programs.ts:224`, relProblems = draftProblems when no release, `:205`), catalogue / Not ready words (`startableMissing`, `:309`). Because `filing_problem` carries its own step, `sharedStep` no longer matches, so the lines lose the single shared step (the Lead check item 1 rule). Fix: exclude this message from `isFiling` (e.g. give the problem a distinct `where` such as "Form fields" and map it in `stepOfWhere`, or skip problems already covered by `form_without_edition` in `engine/programs.ts:73`), and add a `missingItems` test that unmapped forms give exactly one line.

**Major 2: the setup checklist counts it twice.** `engine/setup-checklist.ts` pushes "Map N forms" from `s.forms.unmapped` (about line 160) and also "Fix N form problems" from `problemsBy.forms` (the new error is a Forms error). A form that is only waiting for its AI draft now reads as a problem to fix, and `errors` at `api/src/programs.ts:228` (Programs row `errors`, `firstError`, `blockers`, Needs you "fix_problems") includes it. Same fix as Major 1 (one distinct source). Add a check that a freshly attached, undrafted form shows "Map" and no "Fix".

- Release with unmapped forms (no draft step pending): `relErrors` is now non-empty, so the `notStartable` branch is skipped and one "Fix N problems: firms cannot open cases" item shows; that is fine.
- Demo release (`demo.ts:420` through `studio.submit`): see (4).
- Forms tab: `web/src/pages/workspace/forms.tsx:394` lists leftover Forms errors, and `api/src/form-progress.ts:87` attaches them to the form's row, so the new message shows twice per form on its own row (Minor M3, same root cause as Major 1; the wording is clear: names the form, says why, says the step).
- Wording of the message itself: names the form, the consequence and two next steps. Good. The Review and release tab and the refusal use `problemWords`; no field code leaks.

## (3) Fixture
Deleting `form_field_map` rows in the isolated copy's own database (`check_b1_release_unmapped.ts:61`) is acceptable: copy only (isolated.sh port 4442, DB `xr_studio_screens_b1`), it stands for an undrafted map, and the test prints the SQL's purpose. It deletes the library-level map of IMM 5475 for every combination in the copy, which is fine because the test ends there. Minor M4: it would be cleaner to add a form that really has no map, but that needs the full sample; not required.
Test strength: Part 1 and Part 3 fail on main (builder's 7/10), so the rule's test fails when the rule is removed. Part 3 also proves removal clears the error and release 1 keeps opening cases.

## (4) Knock-on (by reading; the full suite run is the proof)
- `demo.ts:420` loader releases through `submit`/`approve`. The Visitor visa is already refused there (`check_c10_1_configured.ts:73` expects "Fix n problems before submitting"), so the story is unchanged. Any other of the six released by the loader with a Forms row lacking a PDF map (the story in `demo.ts` row 12 says IMM 5257 has no saved map) will now stay a draft; `check_c10_1_configured.ts:69-70` assert released rows exist, so check that suite first. Also `check_qa145_clean_clone.ts:55`, `check_forms_demo.ts`, `check_forms_x5_*`, `check_screen01_api.ts` (uses the Visitor visa's IMM 5257 which "has no field map yet"), `check_f8_empty_release.ts`.
- Suites that submit/approve on a hand-built combination with forms and no `field_maps` (`check_s5_slice*.ts`, `check_screen01_release_race.ts`, `check_w1_structure*.ts`, `check_vv_checklist_api.ts`, `tests/qa/check_qa1_release_bypass.ts`, `check_g1_*`, `check_g2_*`) are the most likely to start refusing. I did not run them; I could not confirm which break. Pure `validate()` tests (`check_engine.ts:81,110`, `check_screen01_rules.ts:143` "no setup has no warnings", `check_vv_checklist.ts:109`, `check_c18_age_case.ts:61`) pass forms with no `field_maps`; the ones that count errors (`check_engine.ts:110`, `check_screen01_rules.ts:143` if forms present) may now see an extra error. Wait for the run-suites result and list failures in the PR.

## Journey
Journey-test as reviewer: not run (no servers allowed). By reading: author who submits the Visitor visa as loaded is refused and told form, reason, step: 7/10 for the clear refusal, minus for the duplicated Programs lines and the "change how it is filed" detour (Major 1). Score 6/10, simulated from code only.

## Not checked
Browser, keyboard, 1024 px; graph.mjs (builder reports exit 0); full suite.

Verdict: Block
1. `engine/programs.ts:73-75` (with `engine/validate.ts:70`): the new `where: "Forms"` error also becomes a `filing_problem` line with step "Change how it is filed" next to `form_without_edition`. Fix: give the problem its own `where` (or exclude it from `isFiling`), and test that unmapped forms give one missing line with the shared step.
2. `engine/setup-checklist.ts` (Map N forms about line 160, Fix N form problems at `problemsBy.forms`) and `api/src/programs.ts:228`: an undrafted form is counted as both "Map" and "Fix", and enters `errors`/Needs you. Fix: same as 1, keep the new error out of `problemsBy.forms` for the draft's pre-map state, or show only "Map"; add a check.

## Round 2 (diff-only, 2320c0e0)

Scope: `git diff 3b17711d0..2320c0e02`, read with `git show`. Nothing was run (a suite is running in the working tree); findings are from reading the code.

**Major 1 (two missing lines): resolved.** `engine/programs.ts:75` now leaves the tagged error out of the `filing_problem` count, so a form with no field map is only the `form_without_edition` line (programs.ts:67), which names every unmapped form. The new check "B1 Major 1" asserts exactly one such line with that code, naming all of them.

**Major 2 (checklist double count): resolved.** `setup-checklist.ts` drops the tagged error from `errors` and `relErrors`, so Forms shows "Map N forms" (`forms.unmapped`, line 170) with no "Fix N problems". The Programs row's `errors` (`api/src/programs.ts:229`) leaves it out too. The pass and fail checks use the same input with and without the tag, so they test the filter itself.

**Minor (row and Forms tab repeat): resolved** (`api/src/form-progress.ts:88`, `web/src/pages/workspace/forms.tsx:395`).

**(a) Release still refused: yes.** The error stays `level: "error"` in `validate.ts:71`. Submit, approve and `releaseGates` (`api/src/studio.ts:976, 1021, 1039, 1082, 1091`) filter on level only, not on the tag. The existing "B1 fail" checks still cover the refusal and the forms it names. The bulk-release path (`api/src/programs.ts:422`) no longer short-circuits on `r.errors` for an unmapped-only row, but it falls to `releaseGates`, which refuses, so the row still gets a reason.

**(b) Unmapped-only combination does not look clean: yes.**
- `form_without_edition` is computed from the snapshot's forms and field maps (`engine/programs.ts:66-67`), not from the problem list, so excluding the problem from `errors` does not remove it.
- A released combination therefore has a non-empty `missing`, and `statusOf` gives Not ready. It is Needs you through that line.
- An unreleased one stays In setup, and Forms shows "Map N forms" from `forms.unmapped`.
- One side effect, which I rate Minor: `blockers.n` ("N problems to fix before release", `api/src/programs.ts:272`) is now 0 for such a row. The cause shows once as "Map N forms" and the missing line, so I count this as the intended one-cause-one-line outcome.

**(c) Import cycle or web-unsafe code: no.** `setup-checklist.ts` imports only `contracts/*` (zod, shared with the web app) and nothing from `validate.ts` or `programs.ts`. `validate.ts` and `engine/programs.ts` importing it adds a leaf dependency, so there is no cycle. The web import `../../../../engine/setup-checklist` resolves to the studio root from `web/src/pages/workspace`, and the web app already imports that file. The tag is a plain optional string, so the `Problem` type stays compatible.

No new Blocker or Major. Builder's 13/13 is a claim I did not re-run.

Journey score (reviewer, unchanged by this diff-only round): not re-scored; the round-1 score stands.

Verdict: Approve
