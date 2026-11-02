# QA-165 part 2: break report (PR #592)

Tested on **f23edbd0** (pinned) and again on **ac3b72f3** (the head after Devin's fixes); 57b05d3f (acceptance/lib/m3.ts only) was not exercised on its own. All findings below still reproduce on ac3b72f3 unless marked. Isolated copy on :4436 (`xr_studio_brk592`), `setup_visitor_visa.ts` 13/13, Sample data, no model call, US$0. The PR's own checks pass on ac3b72f3: `check_qa165_mandatory` 21/21, `check_qa165_form_validation` 29/29.
How: a script rebuilt the C7.2 Sample case (`check_c72_imm5257_fill.ts` Part B) in 6 variants. For each it compared `GET /runtime/cases/:id/forms` `fields_open` with the `.request.json` values of a copy generated straight after, for every inventory-`required` field.

## Findings

**M-1 (Major): IMM 5257's own Validate makes 8 background Yes/No groups mandatory for every adult, and the list never shows them.** The inventory `required` flag comes only from the template's `nullTest="error"` (p1/xfa_inventory.py:275). IMM 5257 also marks fields mandatory from script: 351 `color.markRequired(...)` calls. In `validateForm.updateBackGroundInfoState("adult")`, called from the header's Validate button, background questions 1a, 1b, 2a, 2b, 2c, 3a, 4a, 5a and 6a become mandatory whenever they are empty.
- Steps: the full C7.2 case, confirmed. GET forms, then generate a copy.
- What happened: the copy leaves `Page3.BackgroundInfo.Choice[0]` (1a: TB, published `not_a_fact`) and `Page3.PageWrapper.GovPosition.Choice[0]` (question 6, no fact) empty. Neither is listed. The card says "still empty (5): Adobe's Validate asks for each", but Validate asks for 7.
- Variant: Military and Criminal history left unanswered. The copy has `not written` for both, and they are not listed either.
- Expected: P-237/P-238 promise that each mandatory field is either written or listed before the file is offered. These script-mandatory fields should be listed too (for example, the adult background block when DOB gives age over 17), or the card's words should not claim to be complete. The PR defines mandatory as the inventory flag, which is why this may look out of scope. I report it because the card's own words ("Adobe's Validate asks for each") promise the full set.

**M-2 (Major): a confirmed answer that has a problem (QA-122) is listed as "answered, not confirmed yet".** This is a false reason.
- Steps: answer `person.mailing_address` as `{city, postal_code, country, po_box}`. It is accepted with the problem "Enter the street.". Confirm the section, GET forms, generate.
- What happened: the copy's `result_json` for Streetname says `not written: confirmed with a problem, not written: Enter the street.`. The list says "Street name / City/Town / Country or Territory — needs an answer: answered, not confirmed yet".
- Cause: `formCoverage` rewrites such boxes to `coverage: "answered on screen"` with `fix` (engine/runtime/forms.ts:27). `mandatoryOpen` reads only `coverage` (engine/runtime/mandatory.ts, the "needs an answer" branch) and ignores `b.fix` / `b.why`. The officer is told to confirm something that is already confirmed, and the real problem is not shown.
- Expected: show the problem ("confirmed with a problem: Enter the street.").

**m-1 (Minor): wrong question named for 4 fields. The ac3b72f3 grouping keeps the wrong words and adds a bare field name.**
- For the spouse (also the principal before confirmation), `CurrentCOR.Row2.Country` and `.Status` (country of residence and status) read "Date of birth (form field: Country)" and "Date of birth (form field: Status)". The map's `evidence_quote` is "* Date of birth".
- Taiwan PIN and Israel passport read "Question 1d. Have you taken a test form a designated testing agency…? (form field: Taiwan PIN)". On f23edbd0 these two merged into one line "(2 form fields)". ac3b72f3 splits them (fixed), but the question shown is still the language-test question.
- `wordsOf` trusts `evidence_quote` without checking it. `check_qa165_mandatory` o8 asserts this wrong label as the expected one.

**m-2 (Minor): ac3b72f3's "lines sharing words get a field name" does not separate the lines it is meant to separate.** Spouse card, 1024 px:
- Two lines read "City/Town (form field: City Town)": one is the address, the other the occupation row.
- Two lines read "Country or Territory (form field: Country)".
- The merged date line reads "Date of birth (form field: DOB Year) (3 form fields)", which names only the year box.
- Other labels say nothing useful: "Education Section Question 1." (the 25-character rule cuts at the number), and "YYYY" / "MM" for the occupation-row dates.
- Lines are only told apart when their "why" differs. Two unmapped fields with the same caption and leaf, which share the fixed why "nothing in this release fills it", would print identically.

**m-3 (Minor): sideways scroll at 390 px from a long person name.** `forms.tsx` puts `[overflow-wrap:anywhere]` on the label span only, not on the `— reason: why` span. The why carries the person's display name, which may be up to 120 characters.
- Steps: case "Client A (Sample) Äxxx…" (100 x), 390×844. Open the list.
- What happened: `scrollWidth` goes from 390 to 780. The offending element is `SPAN.text-text-muted`. The same happens at 200 % zoom.
- Expected: no sideways scroll (STANDARDS a11y and long text).

**m-4 (Minor): axe target-size (WCAG 2.5.8) fails when the "What blocks filing" and "Mandatory…" summaries are stacked.** This is the spouse's form, which is not ready. axe reports: summary "942px by 19.5px … safe clickable space 19px instead of 24px". r1c's axe run only covers the principal's form, which is ready, so it has only one summary.

**m-5 (Minor): the ac3b72f3 `solutionFile` guard is lexical only.** `resolve()` does not follow symlinks.
- Bypass through a committed symlink: `prototype/node_modules` → `../../../.tools/…/node_modules`. `solutionFile("prototype/node_modules/@babel/runtime/package.json")` is allowed, and its realpath is outside the solution folder.
- Upper-case `.JSON` is also allowed, as is any `.json` under `studio/var` (other workspaces' `.request.json`).
- Any allowed JSON without `fields` crashes the whole forms list. Steps: set `field_maps[0].inventory_file` of the vv release to `prototype/studio/package.json` (or the symlinked path) in the isolated database, then GET forms. Result: **500** for every form and person on the case, `TypeError: Cannot read properties of undefined (reading 'filter')` at fill-case.ts:94.
- A refused path (`../../etc/passwd.json`) returns `fields_open: []` and no card. That looks the same as "every mandatory field written".
- Before this PR the forms list read no inventory, so this crash path is new. Only release data can reach it (inventory_file is set server-side, not by an author), which is why it is Minor. Expected: check the realpath; on a missing or invalid inventory, give "field list unavailable" rather than [] or a 500.

**m-6 (Minor): a database failure at commit leaves a validated file with no row.** In `validated()` the file is renamed inside the transaction, before COMMIT.
- Steps: add a `DEFERRABLE INITIALLY DEFERRED` constraint trigger on `validated_copy` that raises an error, then upload a simulated-validated IMM 5257 (`asValidated`).
- What happened: 500, row count unchanged, and `validated/IMM5257-a1393967-6b8d1b9b9111.pdf` stays on disk with no row.
- Held: an INSERT-time failure (BEFORE trigger) leaves no file and no pending file. Expected: rename after commit, or remove the file when the commit fails.

**m-7 (Minor): any non-empty string counts as "date last validated".** `read_validated.py` `form_validation`, IMM 1344 with flag Yes and `titleSF.DateLastValidated = "not a date"` gives `passed: true`. Forms write `utilDates.getToday()`, so a value that is not a date was not set by Validate.

## What held
- **List vs copy, 9 comparisons, f23edbd0 and ac3b72f3:** principal (full, nothing confirmed, no job rows, background gaps, address with problem), spouse with names only (37 open), IMM 5707 (0 required in the inventory and 0 `nullTest` in its template, so it is correct to list nothing). Every inventory-required field the copy left empty was listed. No listed field was written.
- **Reasons and exclusions:** "not a fact" fields say "fill it in Adobe". `filled by hand` comes through with the transform's why. Signatures and the oath are never listed.
- **Roles:** GET forms as the client (user-P) and a different client (user-Q) → 403; another firm's officer (user-S) → 404; no actor → 401; author → 403; officers user-O/R/T → 200.
- **Load:** a 6-person case (12 forms, 276 open lines, 160 KB): GET forms 279–388 ms, under the 1 s first-view budget.
- **Keyboard and zoom:** the summary toggles with Enter. No sideways scroll at 1024 px or 1280 px at 200 % with ordinary names.
- **Validated upload:** the IMM 1344 date only in `Barcodes.DateLastValidated` is refused. Mirror Yes with flag No is refused. IMM 0008 "Oui" with its BC1 date passes. The baseline upload gives 201.
- **Not tested:** an Online form with a PDF copy (none in this release).
