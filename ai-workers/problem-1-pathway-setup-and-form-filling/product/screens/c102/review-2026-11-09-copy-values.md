# Review: PR #1435, C10.2: IMM 5257's own Validate no longer empties the status on the Paper copy

Independent reviewer (P-303: I did not build this). Reviewed up to head `178b95da54a369b3b3bdcdd41a5dec9b00e5c932`: commit f9c0db38f plus 178b95da5, which only changes the test's v2 fail case. Diff `origin/main...178b95da`, 3 files under `prototype/studio/`: `samples/form-field-gates.json` (+31), `tests/check_c102_copy_values.ts` (new), `tests/fixtures/read_choice_values.py` (new). 9 Nov 2026.

How I checked, without starting a copy or a server (the machine's copy cap is in use):
* The extracted XFA template is byte-identical to the official PDF's template stream. I read `official-sources/ircc/forms/imm5257e.pdf` (sha256 0dc03b24…a562e, which matches the manifest) with `p1/e5_roundtrip.py`'s own `xfa_streams`: 1,673,267 bytes, the same sha256 and `==` True.
* I read `validateCOR`, `validatePCOR`, `validateCWA` and `ImmigrationStatusList` in that template.
* I read the builder's logs `after.log` (9/9), `before-final.log` (main's gate data: 5/4), `before.log`, and the logs of the knock-on suites.
* I read the engine path the data goes through: `engine/form-field-condition.ts`, `engine/runtime/case.ts` ~343 (`gatedOff`), `engine/runtime/forms.ts` ~45, `api/src/form-field-gates.ts`, `api/src/features/checkpoint/045-form-field-gates.ts`. I also read `api/src/finished-story.ts` ~117-170 and `samples/finished-story.json` `by_kind`.
* I ran `select-suites.mjs --direct` on the diff (it reads files only) to see which suites CI will run.

## 1. Diagnosis: right

* **The lead's first guess (a stored value that is not an export value) is disproved.** Main's Paper copy stores status `01`, the form's own export value for Citizen (`ImmigrationStatusList`: `lic="01"` Citizen … `lic="09"` Foreign National, template line 39845). v1 reads 97 choice values on 31 copies and finds none outside its field's export list. The fail case, `Citizen` stored, is caught (`before-final.log`, `after.log`).
* **The real cause is in the form's own script.** On main the Paper copy held From `2024-01-15`, To `2024-01-15` and Other `SAMPLE` beside status `01` (`before-final.log`, v2). These are the story's by-kind Sample values: `finished-story.ts` answers every required question that is not hidden, and "Describe that status" and the two dates were asked for a Citizen. `validateCOR` (template 25107 ff.) runs in this order:
  1. Status in 01/02/07/08 with a From or To date: it shows "You entered information that is not required, please review" (`negative_case`) and sets `oStatus.rawValue = null`. This is the first warning.
  2. Status is not `06` (it is now null) and Other is not null: the same message again and `oStatus.rawValue = null`. This is the second warning.
  3. `processField(oStatus, validateDropDown, …)`: status must contain a value. This is the refusal.

  This matches the reported fault exactly: two "not required" warnings, then "7. Current country of residence (status)" must contain a value, while the page shows Citizen.
* **Status 09, Foreign National, is handled as the script handles it.** It is in neither date branch of `validateCOR`: dates are neither required nor cleared. Its Other is cleared, as for any status but 06. The gates leave the dates written for 09 and gate Other to "Other" only. Correct.
* **The boxes left without gates are left out correctly.** The `negative_case` date blocks of `validatePCOR` (25290-25300, 25334-25345) and `validateCWA` (25532-25543) are inside `/* … */` comments. So PreviousCOR and CountryWhereApplying dates are never cleared, and no date gate is needed there.

## 2. Gate values: right against the form and the question

* The four gates compare exactly the form's own words: "Citizen", "Permanent resident", "Protected Person", "Refugee Claimant", "Other". These match `ImmigrationStatusList`'s labels letter for letter, including the case.
* The question's option keys are those labels. QA-272's `spellOutCodeRange` makes the list "Citizen=01, …", and `check_c10_1_configured.ts:175-180` saves `Citizen` as a key. The story answered `q.options[0].key`, which is "Citizen", and `after.log` v3 shows all three boxes "not written" with "Not needed: written only when …". So the comparison works at least for Citizen. The other four keys are inferred from the same list; finding M1 asks for a test that pins them.
* The citations meet P-170: page 1, question 7 and 9 B, the script quoted with its own words, the list of values, and "Read 9 Nov 2026". The file-level `about` labels every entry Sample, Unconfirmed: expert. No personal names.

## 3. Data-only: yes

Only `samples/form-field-gates.json` changes in the product. It goes through B107's existing door: step 045, author proposes, approver approves, a release carries it. The engine reads it with `gatesInForce` / `rulesInForce` (`case.ts:343`, `forms.ts:45`). There is no engine code, no form-number branch and no new combination key (P-319). The PR body's first line says "Configuration data change … no engine code".

## Findings

### Blocker

**B1. `tests/check_b107_representative_copies.ts` will fail on this PR. CI selects it, and one of its failures is a real defect in the new data.**

That suite loads the configured checkpoint, which carries IMM 5257 (09-2023). `select-suites.mjs --direct` lists it for this diff ("uses samples/form-field-gates.json (through m3.ts)"). It is not quarantined (`run-suites.sh:106`). Three of its lines go red:
* `check_b107_representative_copies.ts:125` (B107-C17) expects `SET_FORM_FIELD_GATE:RELEASED:13`. With IMM 5257's four gates it is 17.
* `check_b107_representative_copies.ts:132` (B107-C19) expects `ours.length === 26`. It becomes 30.
* `check_b107_representative_copies.ts:134` (B107-C21, "review m7: no source shows an escaped quote") will fail, and **this one is a real defect, not just a stale count**. All four new `cite` strings contain literal backslashes. In `samples/form-field-gates.json:110, 116, 122, 128` the JSON `\\\"06\\\"` decodes to `\"06\"`, and To review › form fields shows that text to the second person. I checked by parsing the file at 178b95da: 4 of the 17 gate cites contain a backslash. All four are new; none of the 13 IMM 5476 cites does.

The builder's `forms_b107.log` holds only the suite's header, so this suite was not run to its end.

*Fix:*
1. Write the script quotes without escaped quotes. Keep JSON's `\"` for the outer quote, and inside it use the form's code in plain words or single quotes, for example `oStatus.rawValue == '06'` or `== 06 (Other)`. Then re-check that each cite still quotes the script faithfully.
2. Update B107-C17 and B107-C19 to the new counts, 17 and 30. Better still, derive them from the data, for example the number of gates in `form-field-gates.json` for editions the checkpoint loads, so a later form's gates do not break them again.
3. Run `check_b107_representative_copies.ts` to the end and put its log in the PR.

### Major

**M1. The gates' rule is tested on one side only (Citizen). A gate that is too broad, or a value with the wrong case, would pass every check in this PR.**

* v1 and v2 (`check_c102_copy_values.ts:84-98`) test the reader and the copy.
* v3 (`:103-106`) proves that, for a Citizen, the three boxes are not written. That is the "rule removed → red" side.
* Nothing proves that the boxes **are** written and asked when they should be:
  * Other when the status is "Other";
  * From and To for Visitor, Worker, Student, Other and Foreign National;
  * question 9 B's Other when the applying-from status is "Other".

  Suppose a gate's value drifted, for example `"other"` or `"Permanent Resident"`, or it named the wrong field. An Other-status or Permanent-resident person would then silently lose a box the form requires. IMM 5257's Validate would refuse it the other way round ("Other" required, or a PR's dates written). No check here would turn red. "Every business rule has a passing and a failing test" (WAY-OF-WORKING, Every PR; STANDARDS §3.10) asks for both sides of each gate.

*Fix:* in the fast suite `tests/check_b107_form_field_gates.ts`, which needs no server and already has `holds(box, facts)` used by B107-13..18, add one table-driven case per status key for IMM 5257 (09-2023)'s four gates:
* CurrentCOR Other holds only for "Other";
* CurrentCOR From and To hold for Visitor, Worker, Student, Other and Foreign National, and fail for Citizen, Permanent resident, Protected Person and Refugee Claimant;
* CountryWhereApplying Other holds only for "Other" in `person.applying_from_status`;
* each gate is "cannot tell" while the status is unanswered.

Add one more line: every value a gate names is one of the form's own status labels, read from `p1/inventory/imm5257e.inventory.json` (`options_resolved` of `CurrentCOR[0].Row2[0].Status[0]`). A typo in the data then fails at once. This costs seconds and runs on every PR that touches the data.

### Minor

**m1. PreviousCOR's "Other" boxes have the same fault and are not gated. Leaving them out is acceptable for this PR, but it must be said.** `validatePCOR`'s Other negative case is live for both rows (template ~25310-25320 for Row2, ~25355-25365 for Row3): details beside any status but 06 empty that row's status. The story does not reach it today, because the previous-countries group is answered "none apply". A real person with a previous Citizen row and "Describe that status" filled would get the same Validate refusal. A B107 gate is read about the box's person, not a group row, so it probably cannot say "this row's status". That makes it a separate row (a question condition on the group's "Describe that status", or a row-scoped gate). *Fix:* name it in the PR under "Questions" or as a follow-up row with this evidence. Do not widen this PR.

**m2. The fixture skips choice fields inside repeating subforms.** `tests/fixtures/read_choice_values.py:43` keys export lists by the inventory's `data_path`, and `:52` looks the copy's concrete path up in that map. The inventory writes repeating rows with `[*]`: IMM 5257 SCH1 has 5 such choice fields (`MilitaryServiceDetail[*].CountryCode[0]` and others). A value in them is never compared, and v1's line still says "every choice field on every copy". *Fix:* normalise `[n]` to `[*]` when looking up, or say in v1's label that repeating rows are not read.

**m3. The `<items>` reading assumes the second list is the saved one** (`read_choice_values.py`, the `elif f["options"]` branch). On IMM 5257 this holds for all 30 two-list fields (`save="1"` on the second, checked on the template). `xfa_inventory.py` drops the `save` attribute, so a form that puts `save="1"` first would be read the wrong way round, and v1 would pass or fail for the wrong reason. *Fix:* acceptable as is, but say the assumption in the docstring with this evidence, or have the reader return the `save` flag.

**m4. On the demo, the story's saved Validate read-back will no longer match the Paper copy.** The Paper copy's values change: no Other, From or To. `matchStoryValidated` (`api/src/sample-validated.ts`) compares the values hash, so the story will wait for a new Adobe Validate of the new Paper copy until the tech lead records one. This is the intended outcome, because the old file failed Validate. *Fix:* say it in the PR body under "On the demo:", so the tech lead re-validates and the demo update is not read as a regression.

## Test soundness (point 4): sound apart from M1

* **Without the fix, with the fix.** With main's data the check fails on v2 pass and on both v3 lines (`before-final.log`: 3 hits beside status 01, 0 gates in the release, the boxes "written"). With the fix it passes 9/9 (`after.log`). It fails for the right reasons.
* **Fail case after 178b95da5.** The fail case now sets the To date empty explicitly. `e5_roundtrip.new_datasets` writes `""`, and the reader drops empty values. It also asserts exactly two hits that name Other and FromDate, so it no longer depends on what the base copy held. That was the wrong-reason failure in `before-final.log`, now fixed.
* **The test-side reading `cleared()` is independent of the gate data and matches the script.** Dates count only for question 7 (01/02/07/08), Other counts for both 7 and 9 B (any status but 06), and 09 is treated as the script treats it.
* **XFA reading.**
  * `bindItems` uses `options_resolved`, whose value is `lic` (`valueRef="lic"`).
  * The `X.official` / `X.SOL` redirect points `xfa_inventory.inventory`'s lookup at the copy, and `relative_to(Path(pdf.anchor))` works for any absolute path.
  * The `--set` fail cases use the project's own E5 incremental writer.
* **It fails loudly.**
  * A story that does not finish in 15 minutes fails "the finished story is loaded".
  * No Paper copy throws, which is caught as a FAIL.
  * A missing PDF or a reader error makes `execFileSync` throw, which is also a FAIL.
  * There is no `.catch(() => undefined)` after a wait.
* **It runs on Linux CI as other C10.2 checks do.** The usage line matches `run-suites.sh`'s isolated pattern (port 4431, shared with `check_c102_paper_readback.ts` and others; suites on one machine run one at a time). `PSQL` defaults to the Homebrew path, which `cloud-setup.sh:100-101` links on Linux, as for `check_c102_paper_readback.ts`. `.tools/solution-1-prototype/.venv` is made by `cloud-setup.sh:43`. It refuses the demo port and database.

## Knock-on effects (point 5)

* **Fails:** `check_b107_representative_copies.ts`, see B1.
* **Unaffected, checked:**
  * `check_c72_imm5257_fill.ts` and `evidence/c7-2-adobe-validate/make_case.ts` answer `"citizen"` with a From date, but on `tests/runtime/setup_visitor_visa.ts`'s release, which step 045 never runs on. `runtime_c72.log` is 57/57.
  * `check_runtime_r1a.ts` runs on the same runtime setup.
  * `check_forms_b99_same_as.ts` is 9/9.
  * `check_qa165_form_validation.ts` is 30/30.
  * `check_b107_form_field_gates.ts` passes; B107-20 runs the guard over every entry, the new ones included.
  * `check_m3_c1_expected_lines.ts` C1-9 counts only the representative's 22 facts.
  * `acceptance/C10.2.test.ts` and `acceptance/C7.2.test.ts` assert no answer or question counts.
  * No suite asserts the story's "N answers typed".
* **Not run to the end in the evidence:** `rt_c1.log` stops at C1-6. CI's selected set is long (`select-suites --direct` lists dozens of suites that load the configured checkpoint). The PR should show them green before the approval label.

## What a person gets

On IMM 5257 a Citizen, Permanent resident, Protected Person or Refugee Claimant is no longer asked "Describe that status" or the status dates. The Paper copy writes none of them, and each box says why ("Not needed: written only when …"). Adobe's own Validate should then accept question 7. That needs a new Adobe Validate of the new Paper copy to confirm (m4).

Round 1 result, at 178b95da: changes requested (B1, M1).

## Round 2: `git diff 178b95da..5dd477f3` (commit 5dd477f30), 9 Nov 2026

The diff changes 4 files: `samples/form-field-gates.json` (the 4 cites), `tests/check_b107_form_field_gates.ts` (+25), `tests/check_c102_copy_values.ts` (v1's label) and `tests/fixtures/read_choice_values.py` (docstring and comment). I read the diff and the builder's logs, now complete.

**B1: resolved.**
* **Cites.** Parsing the file at 5dd477f3, 0 of the 17 gate cites contain a backslash. The 4 IMM 5257 cites now decode to the script with plain quotes (`oStatus.rawValue == "06"`, `"01"|| … "08"`), and they still quote the script faithfully against template 25107 ff. and 25457 ff. The four gates themselves are unchanged.
* **Counts.** I accept the builder's reading, with evidence:
  * `forms_b107.log` is now complete: 28/28, exit 0, C17 `SET_FORM_FIELD_GATE:RELEASED:13`.
  * More telling, C21 passed in that run while the backslash cites were still in the data. That can only happen if IMM 5257's gate changes are not in the RELEASED listing of that suite's load.
  * The mechanism is deterministic, not timing. `releaseFormFieldCondition` (`api/src/form-field-condition.ts:133-141`) marks an approved form-field change RELEASED only when a release finds its form field no longer DRAFT. In that suite's load, IMM 5257's gated drafts are not published by a release, so its count stays 13 / 26 in CI as here.
  * B107-34 now guards against escaped quotes in the IMM 5257 cites in the fast suite as well.
  * My round-1 B1 rested on the counts moving, and I read the log while it was still running. I withdraw that part.
* **Observation for the tech lead, not a finding against this PR.** In the configured checkpoint, IMM 5257's four gate changes therefore show on To review as approved but not released, while release 2's snapshot (the Paper copy's release, `after.log` v3: 4 gates) already carries them. That is how B107's publisher treats a form field whose draft no release published, and it is the same for any later B107 data. If To review should say "released" there, it is a separate row.

**M1: resolved.** B107-27..34 in `tests/check_b107_form_field_gates.ts`:
* The nine statuses are read from the form's own committed inventory, not typed into the test.
* Each gate is evaluated for each status with the rules' own `evaluate`, both sides:
  * From and To are written for 03/04/05/06/09 and never for 01/02/07/08 (B107-28, B107-29);
  * Other is written for 06 only, in questions 7 and 9 B, and for none of the 8 others in each (B107-30, B107-31).
* Before any answer the gate cannot tell, so the question stays asked (B107-32).
* Every value a gate names is a label of the form's list, letter for letter, and there are exactly 5 of them (B107-33).
* No IMM 5257 cite shows an escaped quote, and each quotes the script (B107-34).
* `b107fast.log` shows all passed. The builder reports that misspelling "citizen" in the data turns B107-29 and B107-33 red. That is the failing side I asked for, and it runs in the fast suite on every PR touching the data.
* Types hold: `Gate.gate` is `PredicateNode`, `evaluate` was already imported, and no `any` is added.

**m2, m3: resolved.**
* v1's label (`check_c102_copy_values.ts:84`) and the reader's docstring now say that a repeating row's fields are not read.
* The `<items>` order assumption is stated with its evidence (`read_choice_values.py`, the `elif f["options"]` comment).

**m1, m4: to go in the PR body**, as the builder says. They are notes, not code. When the tech lead reads the body, check that it names:
* the PreviousCOR "Other" follow-up, with the `validatePCOR` evidence;
* the new Adobe Validate the new Paper copy needs on the demo.

**Evidence now complete.**
* `forms_b107.log`: 28/28.
* `rt_c1.log`: 13/13.
* `runtime_c72.log`: 57/57.
* `b107fast.log`: all passed, 34 checks.
* `final-fresh.log`: the new check on a fresh copy at 178b95d, 9/9.
* `pack.log`: acceptance pack C10.2, 14/14, exit 0.

The rest of CI's selected set runs on the PR as usual.

Nothing new found in the round-2 diff.

Verdict: Approve 5dd477f301fce9186295364c2c86b8c3056f3bfb
