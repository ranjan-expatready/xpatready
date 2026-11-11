# Review: PR #1482, C10.2: IMM 5257's own Validate no longer empties the purpose of visit (and three Background Yes/No boxes) on the Paper copy

Independent reviewer (P-303: I did not build this). Reviewed head `0a343b6051d5197653f069fa622680f74d75c2cd` on `claude/epic-hypatia-1f9egu`: commits d682b2614 and 0a343b605. Diff `origin/main...0a343b605`, 3 files under `prototype/studio/`:
* `samples/form-field-gates.json`: +4 IMM 5257 gates, and the edition's `file` note;
* `tests/check_b107_form_field_gates.ts`: B107-35..43, with B107-27/33/34 scoped to page 1;
* `tests/check_c102_copy_values.ts`: v5 (`NOT_REQUIRED`, 14 branches) and v6.

10 Nov 2026.

This is a data + test change, not a screen. As for #1435, there is no screen walk and no journey score: the caller does not allow servers or isolated copies here (the builder holds the machine's copy cap), and nothing a person sees changes except the four boxes' "Not needed: written only when …", which v6 reads from the copy.

## How I checked (without a server)

* **I extracted the template myself.** I read `official-sources/ircc/forms/imm5257e.pdf` with pypdf (`/XFA` → `template`). File sha256 `0dc03b24e7914a178ad29e2cfae811045835a1d36d7a3c35f040251d0aca562e`, which matches the manifest. Template: 1,673,267 bytes, sha256 `26c59277…61cbd`, byte-identical to the builder's `template.xml`.
* **I read these functions in full:** `validateCompletedForm` (24824), `setGlobFirstField` / `processField` (28329, 28347), `validateDetailsOfVisit` (27123), `validateBackGroundInformation` (27620), `VisitPurposeList` (41384), `validateNames`, `validatePCOR`, `validateCWA`, `validateMaritalStatus`, `validatePrevMarriedSection`, `validateLanguageSection`, `validateIdentityDocument`, `validateUSCard`, `validateMailingAddress`, `validateResidentialAddress`, `validateTelephone` and `validateEducation`.
* **I listed every `messageBox(…"negative_case")` and classed it** live or inside `/* … */` with a small script (scratch only).
* **I read main's Paper copy values** in `scratchpad/paper.json`: 82 stored values, read by the project's reader.
* **I read the gate path through the engine:** `engine/runtime/case.ts` 343-351 (`gatedOff`), `engine/runtime/forms.ts` 45-60, and `engine/form-field-condition.ts` (`notNeededWords`, `gateProblems`).
* **I read the configured field map's facts** for the gated boxes and their deciding Yes/No boxes (`p2/runs/studio-fieldmap-imm5257e-live-20261021…json`).
* **I checked every one of the 61 data paths in `NOT_REQUIRED`** against `p1/inventory/imm5257e.inventory.json`: 0 missing.
* **I checked every quoted question wording** against the template text.
* **I ran `npx tsx tests/check_b107_form_field_gates.ts`** at 0a343b605: all passed, B107-1..43.
* **I read the builder's logs** (see "Evidence relied on").

## 1. Diagnosis: right

* **03 is Other.** `VisitPurposeList`: `lic="01"` Business, `"02"` Tourism, `"04"` Short-Term Studies, `"05"` Returning Student, `"06"` Returning Worker, `"07"` Super Visa: For Parents or Grandparents, `"03"` Other, `"08"` Family Visit, `"13"` Visit. The purpose field binds it with `valueRef="lic"` (16458). Main's Paper copy holds `PurposeOfVisit = 08` and `Other = SAMPLE`.
* **The reported fault is reproduced by the script.** In `validateDetailsOfVisit` (27155-27169), a purpose other than `"03"` with Other not null runs these steps:
  1. it shows `negative_case` (only `if (globFirstField.value == "")`);
  2. it sets `oPurpose.rawValue = null`;
  3. it calls `setGlobFirstField(oPurpose)`.

  `processField(oPurpose, validateDropDown, …)` then finds the purpose required and empty, so `popMessage` names "1a) Purpose of my visit".
* **"Validate shows only the first such message" is right, stated a little loosely.**
  * Every `negative_case` message box is guarded by `globFirstField.value == ""`.
  * The global is set by the first negative case that calls `setGlobFirstField`, or by any earlier required-empty or invalid box (`processField`, `setGlobFirstField` at 28329).
  * After that, later branches stay silent, but they still empty their boxes.
  * One more thing follows from the lead's report. The final message named the purpose, so nothing before `validateDetailsOfVisit` (pages 1 and 2) had set the global. That agrees with main's values: no page 1 or 2 branch fires.
* **The three siblings fire on main's values, exactly as the builder says.** Each is in `validateBackGroundInformation`:
  * 2 d) `refusedDetails = SAMPLE` beside `VisaChoice1/2/Details.VisaChoice3 = N/N/N` (27715). It nulls all three Yes/No pairs.
  * 3 b) `details = SAMPLE` beside `BackgroundInfo3.Choice = N` (27806).
  * 4 b) `militaryServiceDetails = SAMPLE` beside `Military.Choice = N` (27847).

  Each then has a required, empty Yes/No, so `setGlobFirstField` is called. These would have been the next three Validate stops. 1 c) `MedicalDetails` is not mapped in the field map, so it is never written and cannot fire.
* **No missed branch fires on the story's values.** The template has 39 `negative_case` message boxes: 35 live, 4 inside comments (25292, 25337, 25534, 25918). Against main's 82 values:
  * v2 covers COR ×2 and CWA Other. Status is 01, and #1435 already fixed these.
  * v4 covers the 6 telephone branches. They read `presence`, not a stored value.
  * v5 covers 14 branches. Only the four above fire.
  * The 12 live data-only branches outside v5 (finding m1) do not fire:
    * CWA same-as-COR `Y` with an empty row (no CountryWhereApplying values);
    * `VisaType = VisitorVisa`, not Transit;
    * mailing country 205 with no province and no district;
    * no residential address;
    * no education row.
  * Nothing outside `negative_case` fires either:
    * `checkCurrentPrevMaritalStat`: marital 02 is not 04/05/06/09;
    * `validateResidentialAddress`' PO-box conflict: no PO box;
    * `validateLanguageSection` clears the language used only when "able to communicate" is empty, and it holds English.

## 2. Gates: right against the form, the field map and the stored facts

* **The boxes and their facts.** In the configured field map, the four boxes are filled by:
  * `case.visit_purpose_other`;
  * `person.immigration_history_details`;
  * `person.criminal_history_details`;
  * `person.military_service_details`.

  Their deciding boxes are:
  * `VisaChoice1` → `person.overstayed_or_unauthorized_in_canada` (2 a);
  * `VisaChoice2` → `person.refused_visa_entry_or_removed` (2 b);
  * `VisaChoice3` → `person.previously_applied_to_canada` (2 c);
  * `BackgroundInfo3.Choice` → `person.criminal_history`;
  * `Military.Choice` → `person.military_service`.

  All five are `yes_no_code:Y/N`. The gates name exactly these facts, compared with booleans.
* **The purpose gate value is the stored label.** The purpose transform is `code_list:… (…, Other=03, Family Visit=08, …)`, so the stored value is the label: `samples/sample-family-imm5257.json` has `"case.visit_purpose": "Family Visit"`. `eq "Other"` matches the form's label letter for letter.
* **The facts resolve on the story.** This is proven, not inferred: `forms.ts:59` writes "Not needed: written only when …" only when the gate evaluates `applies === false` (cannot-tell gives "Waiting for …"). `after.log` v6 shows that wording on all four boxes of the Paper copy.
* **The 2 d) "or" matches the printed words.** The form says "2 d) If you answered "yes" to 2a), 2b or 2C) please provide details." (template 21735). The script fires only when all three are `N`. The gate writes on any Yes, gives false on three No, and cannot tell otherwise (the box is not written and the question stays asked). B107-38/39/42 test this.
* **Both sides are tested in the fast suite** (B107-35..42):
  * the purposes are read from the committed inventory: Other (03) holds, the 8 others do not, Family Visit among them;
  * 2 d) holds for each single Yes and not for three No;
  * 3 b) and 4 b) hold for Yes and not for No;
  * each is cannot-tell before its answer.

  A drifted value ("other") would turn B107-36 red.
* **Cites (P-170).**
  * Each quotes the script faithfully: the purpose cite has `"03"`, `//negative Case …`, `if(!oOther.isNull)` and `oPurpose.rawValue = null`, and the 2 d), 3 b) and 4 b) quotes match 27715, 27806 and 27847 character for character, the double space included. The only exception is the whitespace inside one ellipsis: `} else {` is `}\n\telse{` in the template.
  * The question wordings exist in the template (16510, 21735, 22189, 22439). 3 b) and 4 b) use straight quotes where the form prints “yes”.
  * Each says "Read 10 Nov 2026".
  * Parsed at 0a343b605, 0 of the 21 gate cites contain a backslash. B107-43 guards this.
  * The page: see m2.
* **Labels.** The file's `about` keeps "Every entry is Sample, Unconfirmed: expert (AGENTS rule 4). Legal points: Unconfirmed: no counsel." No personal names; the lead is "the tech lead".
* **Data only (P-319, P-425).** In the product, only `samples/form-field-gates.json` changes, through step 045's existing author/approver path. There is no engine code, no form number in code and no combination key. The form numbers in `tests/` are test data.

## 3. Test soundness: sound

* **It fails for the right reason on main's data.** Same fresh copy, only the data file differs:
  * `before-main-data.log` is 12/15;
  * v5 pass is FAIL, listing the Paper copy's Other beside 08, 2 d), 3 b) and 4 b);
  * v6 is FAIL with 0 gates in the release, and the four boxes are `written` with `why: null`.

  `after.log` is 15/15.
* **The fail case asserts only what it sets.** It sets four values itself: purpose `08`, Other `SAMPLE`, `Military.Choice = N` and 4 b) `SAMPLE`. It then asserts with `.some` on exactly those two branches.
  * On main's data the base copy already held these values, so that run cannot tell whether the `--set` took effect.
  * On the branch's data (`after.log`) the base copy is clean, and the case returns exactly the two set hits. So the reader and writer are proven where CI runs it.
* **The model in `NOT_REQUIRED` is faithful, branch by branch.** I compared each `when` and `details` with the script:
  * alias `N` with family or given name;
  * PCOR Row2 and Row3 Other beside a status other than `06`, an empty status included, as in the script;
  * marital status not 01/03 with date, family name or given name;
  * previous marriage `N`, with the script's 8 fields;
  * national ID `N`, with its 4 fields;
  * US card `N`, with DocNum and expiry only, as in the script;
  * residential same-as `Y` with any of the 8 fields. A mailing PO box is folded in: that is the `POBoxConflict` message, a different message from "not required", but it also empties the indicator, so it is right to read it;
  * purpose not `03` with Other;
  * education `N` with any of the 9 fields;
  * background 1 c), 2 d), 3 b) and 4 b) with the script's exact `N` conditions.

  All 61 paths exist in the inventory.
* **It fails loudly.** All copies are read (setup asserts `reads.length === copies.length`), and v5 needs `i5257.length > 0`.

## Knock-on effects

* **Gate counts.**
  * B107-27 now counts page 1's 4 status gates, and B107-35 requires the 4 new boxes. No assertion pins IMM 5257's total (now 8). That is acceptable.
  * `check_b107_representative_copies.ts`: C17 still reads `SET_FORM_FIELD_GATE:RELEASED:13` (IMM 5257's gate changes are approved but not published by a release in that load; see the #1435 round-2 note). C19 counts only its own two forms (`ownForms.length === 26`), and C21 found no backslash. `forms_b107.log` is 28/28 with the new cites in its C19 detail.
* **Questions no longer asked for IMM 5257** when the gate is false:
  * "Describe the purpose" (for any purpose but Other);
  * immigration-history, criminal-history and military details (after No).

  Their effect:
  * C1-9 (stage 1 to confirm) and C1-9b are unaffected: `rt_c1.log` is 13/13.
  * C10.2-6b (the Online IMM 5257 reads Done) passes in `pack_c102.log`, 14/14.
  * No suite asserts the story's answer count. The suites I found with "typed" do not load the finished story.
* **Runtime setup suites: not affected.** C6.18, C7.2 and `check_runtime_r1a.ts` run on `setup_visitor_visa.ts` (prepare_c44 → setup_visitor_visa), and step 045 never runs there. `rt_c618.log` is 29/29, `c69.log` 87/87.
* **On the demo:** the Paper copy's values change, so the saved Validate read-back no longer matches and the story waits for a new Adobe Validate. The PR body says this under "On the demo" and gives the tech lead the steps.

## Findings

### Blocker

None.

### Major

None.

### Minor

**m1. C10.2-v5 says it reads every data-only `negative_case` branch, but it models 14 of the 26 that are outside v2 and v4.** The header comment says "each branch that reads only stored values", and v5's label says "validateDetailsOfVisit, validateBackGroundInformation and the rest". Twelve live branches that read only stored values are not modelled:
* `validateCWA` 25495: same-as-COR `Y` with any CountryWhereApplying value. This one empties the indicator.
* `validateDetailsOfVisit` 27189-27195: `VisaType == 'Transit'` with a purpose, funds or Other. This one empties the visa type.
* The province, country and district consistency branches:
  * `validateMailingAddress`: 26280, 26287, 26301, 26316;
  * `validateResidentialAddress`: 26437, 26444, 26458, 26473;
  * `validateEducation`: 27295, 27302.

None of them fires on the story today (checked on main's 82 values, section 1), so this PR's gates and its fix are complete. A later regression in one of these would still pass v5, and that is the job v5 was written for: "Validate shows only the first such message, so v5 reads them all at once".

*Fix:* either
* add these as `NOT_REQUIRED` entries: one CWA entry, one Transit entry, and one helper for the province/country/district trio applied to the three address blocks. That is about 6 lines, all paths already in the inventory. Or
* narrow v5's label and the header comment to "14 detail-beside-answer branches", and name the 12 left out with the reason (none fires on the story, checked 10 Nov).

Either can come in this PR or as a named follow-up. It does not block.

**m2. P-170 page: the four cites give no printed page.** I judge the locator acceptable to merge on, but not fully to the letter of P-170. Each cite names:
* the section ("Details of visit to Canada", "Background Information");
* the question number and its printed words;
* the template subform `Page3`;
* the function quoted;
* the date read.

It also says plainly that the printed page was not read, which is P-170's "not found, never a guess". IMM 5257 is a dynamic XFA form: `PAGE n OF m` is worked out at layout (`xfa.layout.page(this)`, template 99, 126), and the PDF holds only a 1-page "Please wait" fallback, so the page cannot be read from the file here. P-170 and AGENTS rule 4 still ask for "page", and the earlier IMM 5257 cites give "p. 1".

*Fix:* when the tech lead opens the new Paper copy in Acrobat for the re-Validate this PR already asks for (body, question 3), record the printed page of the two sections, and update the four cites in a follow-up commit ("p. N, Details of visit to Canada, question 1 …"). It does not block this PR.

**m3. The PR body's counts are slightly off, and its "checked, not hit" list leaves out two branches.**
* The body says "41 `negative_case` uses (36 live, 5 inside /* */)". The template has 39 `messageBox(…negative_case…)` calls: 35 live and 4 commented (25292, 25337, 25534, 25918). The other two text hits are the `tableMessages` definitions (24136-24137).
* The "Checked and not hit" list does not name the CWA same-as branch or the Transit branch (m1).
* Optional nit: in the purpose cite, `} else {` is `}\n\telse{` in the template.

*Fix:* correct the counts in the body and add those two to the list. If you touch the cites for m2, also write the purpose cite's `else{` as the template has it.

## Evidence relied on

* **My own reading:**
  * the extracted template (sha above);
  * main's Paper values (`paper.json`);
  * the inventory, with all 61 `NOT_REQUIRED` paths present;
  * the configured field map's facts;
  * the engine path (`case.ts` `gatedOff`, `forms.ts` 45-60, `form-field-condition.ts`);
  * `check_b107_form_field_gates.ts`, run here at 0a343b605: all passed, 43 checks.
* **The builder's logs:**
  * `before-main-data.log`: 12/15, the right three failures;
  * `after.log`: 15/15;
  * `forms_b107.log`: 28/28;
  * `rt_c1.log`: 13/13;
  * `pack_c102.log`: 14/14, exit 0;
  * `rt_c618.log`: 29/29;
  * `c69.log`: 87/87.
* **Still running when I finished, not relied on:** `b114.log` (partial, passing so far), `pack_c72.log`, `qa361.log` and `qa162.log`. C7.2's pack runs on the runtime setup, which never runs step 045. qa162 reads fact words, which this PR does not change. CI's selected set runs on the PR as usual, and the approval label should wait for it to go green.

## What a person gets

On IMM 5257 a person whose purpose is not Other is no longer asked "Describe the purpose". Someone who answers No to Background 2 a)-c), 3 a) or 4 a) is no longer asked for the matching details. The Paper copy leaves those boxes empty, and each says "Not needed: written only when …". Adobe's own Validate should then pass Details of visit and Background Information. That still needs the tech lead's new Validate of the new Paper copy to confirm, as the PR body asks.

Verdict: Approve 0a343b6051d5197653f069fa622680f74d75c2cd
