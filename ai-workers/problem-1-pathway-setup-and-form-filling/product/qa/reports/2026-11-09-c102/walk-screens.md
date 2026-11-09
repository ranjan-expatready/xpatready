# Gate A walk of C10.2 (the finished story: Paper IMM 5257 through Validate), main 7e32ee210, 9 Nov 2026, ~23:25–23:35 IST (17:55–18:05 UTC)

Playwright with the image's Chrome, through `acceptance/lib/browser.ts`, headless, one pass, 1024 px. Fresh isolated copy `qa_c102a` on :4471 (ttl 60; stopped by the same command: "database and files removed"). Main 7e32ee210 holds #1435 (merge 7e32ee210) and #1430. `scripts/walk_c102.mts` acts only by clicks and typing; it reads the API only to compare. Console: `walk/walk-log.txt`.

## C10.2, by screens
1. **The author (user-A), Demo › Load the finished story…:** the dialog, then **Load the finished story** (`walk/00`). It ends "Finished story loaded" after 239 s (`01`), with the stage list "move:done facts:done paper:partial forms:partial signed:done documents:done ready:partial record:partial". The paper, forms, ready and record stages are partial while the Paper copy waits for Adobe, as #1435 says. The dialog reports that 38 questions took a Sample value by kind of answer. US$0: "No live AI call was made".
2. **The case officer (user-O), Cases list › SAMPLE-VV-FAMILY-1** (`02`, `03`): header "Readiness: Not ready · 33% (lowest: Visitor visa: Child 18 or over (Sample))".
3. The three Online IMM 5257 lines (Client A, Partner, Child) each read "· **Done**". The principal's sheet reads "Every section is ticked "Entered in the portal"", with no tick control because the filing is recorded (`04`). C7.3's tick carries through to the story.
4. **The Paper IMM 5257 for Child 18 or over (Sample)** (`07`, the whole card; `read-card-log.txt`, read again on a second fresh copy `qa_c102b`, story loaded by its route, because the walk's own locator caught only the validate box, `05`):
   * "Not validated yet · **Read back the validated copy** · Validate before filing". "Generated · Copy of 9 Nov, 18:03 · 78 form fields written, 7 by hand · read back and checked".
   * "**Not yet: Validate IMM 5257 in Adobe, save it and read the validated copy back before it is filed.**" No line says a mandatory form field is left empty (#1435's claim holds on screen).
   * "To write by hand in Adobe: Fax number including country code (North American number parts are not in the executable set yet) ×3, Alternate telephone number including country code (…) ×2 and 2 more".
   * "Before filing, on the PDF: **this telephone number**: after the form's first Validate, tick "Canada/US" again. **The number is already written** and the switch is written ticked…", printed twice. See QA-361.
   * Steps: 1 Validated in Adobe (not yet), 2 Printed (next; "Cannot start yet…"), 3 Signed in pen, 4 Mailed to IRCC ("not recorded in the product yet").
5. **Next step's door (the Mac's Validate read-back, C7.2 / row 12b):** "Read back the validated copy" is offered and enabled. It was **not used**: a Validate is never simulated (P-46, P-171).
6. **Submission to IRCC** (`06`): "One submission for 3 people applying · Recorded · read-only", V300000001 and so on, through the APR Portal. The Paper filing is split out and not recorded. Underneath, its only block is `barcode_not_validated` ("…no validated copy read back for today's facts. Validate it in Adobe and upload the validated copy…").
7. Page errors: none (both copies).

Walk checks: 8 PASS, 1 FAIL. The FAIL, 4a, came from the script's locator, which read only the validate box. The whole card, read again in step 4, passes 4a's own test: "Validate IMM 5257 in Adobe" is present and no mandatory-empty line.

## The Paper copy itself (`walk/paper-copy-tool.txt`, `walk/paper-copy-values.json`)
* `tools/finished-story-paper-copy.ts` on `qa_c102a`: copy `7c2142b4-1ca3-4275-b1fe-b675afe90088`, file `…/var/isolated-qa_c102a/workspaces/demo/cases/<case>/IMM5257-3b691c8a-7c2142b4-….pdf` (sha256 96abef16…). The ids differ on every load. On the Mac the file is under `prototype/studio/var/` of the demo's workspace (the tool prints it).
* Read with the project's XFA reader (`tests/fixtures/read_choice_values.py`):
  * **Q7 CurrentCOR row: Country `205`, Status `01`, and nothing else**: no Other, no From or To. #1435's fix is in the file.
  * Every choice value is one of its field's export values.
* **Phone blocks on Page 2:**
  * main phone: Other = 1, country code 91, IntlNumber 9800000001 (international: fine);
  * **AltPhone: CanadaUS = 1, NumberCountry = 1, Type 01, no NANumber parts written**;
  * **FaxEmail.Phone: CanadaUS = 1, NumberCountry = 1, no NANumber parts written**.
  * The story's Sample phone by kind is `{"country_code": "1", "number": "5550100"}` (`samples/finished-story.json` `by_kind.phone`): 7 digits, no area code.
* **The form's own script, read from `official-sources/ircc/forms/imm5257e.pdf`'s XFA:**
  * `validateAlternateTelephone` and `validateFaxNumber`: "if (oCanadaUS.rawValue == '1' && oOther.rawValue == '0'&& oNANumber.presence == "visible" && … oAreadCode.isNull && oFirstThree.isNull && oLastFive.isNull …) { … color.markRequired(oAreadCode); color.markRequired(oFirstThree); color.markRequired(oLastFive);". So once "Canada/US" is ticked again (the card's own step), the area code and number parts become required. **Correction after the fresh reader (`verdict.md` §3):** this quote hides an `oType.isNull` term, and AltPhone's Type is written (01), so this branch does not fire there. The parts become required through the Canada/US box's own click event (`color.markRequired` on AreaCode, FirstThree, LastFive) when the person ticks it, as the card asks. The conclusion stands.
  * The "Negative Case: When Canada US is checked, and NA fields arent visible" branch sets CanadaUS and Other to '0', marks both required and incorrect, and shows "negative_case" (the "not required" message). So leaving the switch unticked does not pass either.
  * Unconfirmed in Acrobat: qa cannot run Adobe. Confidence about 80% that the Lead's Validate stops on these boxes unless a 10-digit North American number is typed by hand, and a typed number is not the case's fact.
