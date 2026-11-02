# QA-165 part 1 — reviewer verdict (PR #572, runtime lane)

**Verdict: Approve** (Ship): no open Blocker or Major. Reviewed commit **00a88706** (head after 9fbe06a8 → 9fe11fd5 → 00a88706; each delta reviewed and re-run). Reviewer agent, 2 Nov 2026; not the builder.

**The ask:** "'validated' is recorded only from the form's own validation result, never from upload alone" (C7.2, C7.6; P-237, P-238). Part 2 (mandatory fields as "needs an answer") is only planned in the PR body. It is not judged here.

## How it was checked
* The exact commits ran in a separate git worktree, because the builder was editing the shared folder during the review. The isolated copy ran on **:4439** (`rev_qa165`, the steps of `isolated.sh` by hand, since `pg_ctl` cannot read the scratch path). Fresh database and `setup_visitor_visa.ts` before each run. No live AI, US$0.
* At 00a88706: `check_runtime_r1d.ts` **95/95**, `check_qa165_form_validation.ts` **28/28**, setup 13/13. At 9fbe06a8: `check_runtime_r1c.cjs` (browser) 125/125. The delta to 00a88706 touches no screen code.
* Mutation (the rule's test fails when the rule is removed), each caught: the form's result ignored (`passed = rb.ok`): the 3 QA-165 checks FAIL; refused file not deleted: the 3 "no file kept" checks FAIL (86/89); `formPassed` removed from `lock`, from `copyOf`, from `file`: FAIL each.
* I pulled the XFA packets of IRCC's blank forms myself (`official-sources/ircc/forms/*.pdf`, e5 reader) and read the scripts.

## Claims against the forms' own scripts
* **IMM 5257 / IMM 1295 (shape 1):**
  * The Validate button sets `PersonalDetails.ApplicationValidatedFlag` to `messages.getMessage("Yes"|"No")`. The message table has `Yes_ENU "Yes"`, `Yes_FRA "Oui"`, `No_FRA "Non"`.
  * `setDateLastValidated` writes `Page2.MaritalStatus.SectionA.DateLastValidated.Year/Month/Day` (unpadded numbers) only when the flag is Yes. Otherwise `clearDateLastValidated` empties them.
  * `updateDirtyFlag` sets the flag back to No after any edit but leaves the date. So "No + date" is a real state, and it is correctly refused.
  * **Matches** `validation_leaves`.
* **IMM 0008 / IMM 1344 (shape 2):**
  * Validate sets `genDetails.q1.ApplicationValidatedFlagMirror`.
  * `ApplicationValidatedFlag` has the calculate script `this.rawValue = genDetails.q1.ApplicationValidatedFlagMirror.rawValue`. Its template default is "Yes" on 0008 and "false" on 1344, yet the blank data holds `''`, so the calculated value is what gets saved.
  * `setDateLastValidated` sets one field to `utilDates.getToday()` ("YYYY-MM-DD", zero-padded): `Page1.BC1.DateLastValidated` on 0008, `Part1.Header.titleSF.DateLastValidated` on 1344.
  * **Matches.**
* **Date format, French, several leaves:**
  * Any non-empty date counts, so neither format (5257 unpadded parts, 0008/1344 ISO) can wrongly refuse a file.
  * "Oui" passes. Since m3, mixed Yes/Oui flags are refused (a real form writes one language).
  * IMM 1344's second leaf `Barcodes.DateLastValidated` is set by no script, so it cannot cause a refusal (see m-3).
* **Only the form's result makes "validated":**
  * `validatedCopy.create` happens only in `validated()`, and only after `rb.ok && validation.passed`.
  * Rows recorded before QA-165 (no `validation` in the read-back) no longer count anywhere they are read: the copy view, `lock` and `file`. `fill-case.ts` is the only reader (git grep of api/web/contracts).
  * I proved the 9fbe06a8 gap myself: such a row showed "Validated copy read back", current. At 9fe11fd5 it shows "Read back before the form's own Validate result was checked: send the file you validated in Adobe again". The same file sent again is now recorded (M1), and a refused re-send no longer deletes a kept file (M2, pending name).
  * A failed read (exception) gives `passed: false`.
* **Refusal deletes and records nothing:** for appended bytes, "No" and "Yes without a date", the result is 422 with 0 rows and no file, checked by r1d and by my own walk. A non-passing kept file stays byte-identical, and no `.pending` file is left.
* **Inherent limit, stated in the code:** the flag is data, and a tool could write "Yes" into it. The barcode check stays M3 (`barcode_checked: false`). That matches the ask, which is the form's own result.

## Scores D1–D20 (out of 5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | The ask holds on all four barcode forms and for rows recorded before QA-165 |
| D2 Data integrity | 5 | 0 rows and 0 files on refusal; QA-128 409 kept; M2 keeps the kept file |
| D3 Reuse | 4 | `asValidated` shared by 5 suites; one reader. Docstring wrong on Schedule 1 (m-1) |
| D4 Rule integrity | 5 | Both shapes, disagreeing flags, No+date and Yes-without-date covered |
| D5 Stability/recovery | 5 | Re-send after refusal works; double send gives 409; pending file always removed |
| D6 Freshness | 4 | Templates "read 2 Nov 2026" cited in the docstring; no page/quote for the scripts in a source record |
| D7 AI trust | n/a | No AI |
| D8 Orientation | 4 | Toast names the form; row pill states the copy's state |
| D9 Flow | 5 | Each refusal ends with the one next step in Adobe |
| D10 Language | 4 | Plain, but "mark says "Yes" and no date last validated" reads as a contradiction (m-2) |
| D11 Feedback | 5 | Danger toast within 0.6 s; pill changes to "Validated copy read back" |
| D12 Visual | 5 | Team toast and pill; screenshots taken |
| D13 Accessibility | 4 | axe 0 on each refusal state; 400/1024/1440 px no sideways scroll; Enter opens the chooser |
| D14 Team look | 5 | Unchanged components |
| D15 Speed | 4 | Refusal toast 0.57 s; case page ~1.0–1.2 s to network idle |
| D16 Testability | 5 | Every rule has a pass and a fail; 5 mutants all caught |
| D17 First-use | simulated only | No intended user walked it |
| D18 Provenance | 4 | The words name the form's own mark; the barcode is not compared (M3, stated) |
| D19 Closure | 4 | Generate, Validate (simulated), read back, Ready; a real Acrobat file not exercised |
| D20 Pain/wow | simulated only | — |

## Journey test (reviewer role, the one score for this check): **9/10, pass**
Journeys (case officer):
1. Main path: generate, then read back a validated copy, then "Validated copy read back".
2. Upload alone (bytes appended), sent by keyboard.
3. Validate found it incomplete (No).
4. Yes without a date.
5. A row from before QA-165 shown again.
6. Recovery: send the same passing file again.

Walked headless in Chrome with Playwright on :4439, twice (15/15 both runs). Screenshots are in the reviewer's scratchpad (not committed). Console: only the browser's network log of the three expected 422s; no page errors.

Scores: task completed 1 (201, one row, pill "Validated copy read back") · next step obvious 1 ("In Adobe, press Validate, fix what it marks red…") · plain words ½ (m-2; long old-row pill sentence) · feedback and state 1 (toast plus pill) · correct data 1 (rows 0, 0, 0, then 1; files unchanged) · error recovery 1 (M1 re-send 201; 409 once kept) · accessibility and sizes 1 (axe clean, 3 widths, keyboard) · speed 1 (0.57 s) · visual quality 1 (team toast) · trust and sources ½ (synthetic validated files only; no barcode check).

## Findings (open at 00a88706, all Minor; fix or list in the PR)
* **m-1 (Minor)** `studio/tools/read_validated.py:29`: the docstring says IMM 5257 Schedule 1 keeps `ApplicationValidatedFlag` and `DateLastValidated` Y/M/D.
  * Its template binds the flag to `$.FormValidated` and the date to `ApplicationValidationDate`, and the blank data holds 2012-01-01. `:52` still marks it `kept_by_form` (the template bytes mention the flag), so through the API it would be refused with "the form's own mark says nothing".
  * Not reachable from the screen: the UI offers read-back only on `needs_validate`, and BARCODE_FORMS excludes it.
  * Fix: correct the docstring, and decide `kept_by_form` from the data shape, not template bytes. Or refuse a non-barcode form up front in `validated()` (`fill-case.ts:289`) in its own words.
* **m-2 (Minor)** `studio/api/src/fill-case.ts:324`: with flag "No" the words add "and no date last validated" (noise). With "Yes" and no date they read "Validate has not passed… mark says "Yes" and no date last validated", which looks self-contradictory to a case officer.
  * Fix: add the date clause only when the flag passed, e.g. "says "Yes" but keeps no date of that Validate".
* **m-3 (Minor)** `read_validated.py:54`: on IMM 1344 the date is the first non-empty of any `DateLastValidated` leaf. Only `Part1.Header.titleSF.DateLastValidated` is set by the form.
  * Probe: flags Yes plus only `Barcodes.DateLastValidated` gives `passed: true`. It cannot refuse a genuine file, but it accepts a value the form never writes.
  * Fix: read the leaf that `setDateLastValidated` writes per form.
* **m-4 (Minor)** `fill-case.ts:333`: the file is renamed into its checksum name before `validatedCopy.create`. If the insert fails, a file is left with no row (`finally` removes only the pending name).
  * Fix: rename after the row is created, or remove `path` in a catch when no row exists for that sha.

Not this PR (seen, not a finding): the sr-only file input is its own Tab stop named "Validated copy of IMM 5257" (`web/src/runtime/forms.tsx`, pre-existing).

## Could not check
* A genuinely Acrobat-validated PDF of any of the four forms. None is in the repo; every "validated" file here is SYNTHETIC (`simulate_validate.py`).
  * The one assumption it leaves: Acrobat saves IMM 0008/1344's calculated `ApplicationValidatedFlag` as the mirror's value. The evidence for it is that the blank data holds `''` despite the template defaults "Yes"/"false".
  * One real Acrobat-validated file per form, run through `form_validation`, would close this.
* Real screen reader. D17/D20 (intended user, unaided).
* `graph.mjs` was not run, because it rewrites `qa/GRAPH.md`, outside the one file I may write.

**Verdict: Approve** — commit 00a88706 (Minors m-1 to m-4 to fix or list in the PR).
