# Verdict: C10.2 on main 7e32ee210 (fresh Opus reader, ran nothing, P-303)

**Gate A (P-348 (3)): FAIL, confidence 75%.** The walk ends at the right place, the Paper card's "Read back the validated copy" door: the next step is a person's Adobe Validate (P-349 row 12b), which is never simulated (P-46, P-171). But the file handed to that step cannot pass Validate with the case's own facts (QA-361 below). It passes once that is fixed and a regenerated copy shows its phone blocks on "Other".
**Row status: Partial (stays), confidence 95%.** Last tested 7e32ee210, 9 Nov. Pack 14/14 plus 2 PENDING (5b, 6d) on two fresh checkpoint copies. #1435's check 9/9. Walk 8 PASS, plus 1 FAIL that came from the script's own locator; the whole card, read again, passes. P-339 is not met twice over: no GitHub-runner run on 7e32ee210 (the dispatch was refused 403, and nightly 42663208911 ran on 1d07807c8, before #1435), and 5b and 6d wait for Adobe.
**QA-361: real, confidence 85%.** Bug · Major (it stops C10.2's Adobe step) · C10.2, C7.2 · P-46, P-171 · owner: runtime (the C10.2 data), plus forms/evidence (the F1 words, a Minor that can go separately). **The Lead fixes it before Adobe.** The smallest fix is data only: in `samples/finished-story.json`, `by_kind.phone` takes a Sample number that is not +1, for example `{"country_code":"91","number":"9800000002"}`.
**QA-316: closable (95%).** Both PENDING lines now say only "waits for its copy validated in Adobe on the Mac and read back … never simulated". No count.
**QA-310: still visible (95%).** The load dialog says "moved the case from Release 1 to Release 6, the Visitor visa's release 2" (`walk/01`). It is Minor UX; it does not block Works.
**The file to validate:** the newest IMM 5257 copy for Child 18 or over (Sample) in the Mac demo, made on main after the QA-361 fix (details in §6).

## 1. Gate A
* The end point is right. The door is offered and enabled, and it was rightly not used. Underneath, the Paper filing has one block, `barcode_not_validated`, and the other three filings are recorded in one group (`walk/06`).
* The file has these right: Q7 CurrentCOR is Country 205 and Status 01, with no Other, From or To (#1435 holds). Every choice value is one of its field's export values. validateCWA is satisfied (SameAsCORIndicator Y, row blank). The card lists no empty mandatory field.
* The file has this wrong: AltPhone (CanadaUS 1, Other 0, NumberCountry 1, Type 01) and Fax (CanadaUS 1, NumberCountry 1) have no NANumber parts written (`walk/paper-copy-values.json`). With the case's facts, Validate has no way through these blocks (§3). That makes the output unusable by the next step without a value the case does not hold, so gate A fails.

## 3. QA-361, checked against the form's script (imm5257e.pdf XFA, read with pypdf) and the code
* **First Validate:** validateAlternateTelephone and validateFaxNumber, "Negative Case": CanadaUS is '1' while NANumber is "invisible", so the script sets both switches to '0', marks them incorrect and shows "You entered information that is not required, please review". The next block then fires: phone data is entered (Type, NumberCountry) with both switches at '0', so the switches are marked required and incorrect.
* **The card's own step, ticking "Canada/US":** that box's click event (the AltPhone CanadaUS field, Fax alike) runs `color.markRequired(NANumber.AreaCode / FirstThree / LastFive)`. markRequired sets `mandatory = "error"`, and processField → isRequiredAndEmpty then fails on each empty part. So Validate stops on the area code.
* **A correction to qa's citation:** qa quotes the first "State Check" branch with "…", which hides its `oType.isNull` term. On AltPhone, Type is written 01, so that branch does not fire there. The parts become required through the click event instead. The conclusion stands.
* **No clean way out:** typing a 10-digit North American number by hand invents a value; the Sample is "+1 5550100", 7 digits, with no area code. Clearing the block changes values the product wrote (CanadaUS, NumberCountry, Type), and the upload door refuses any read-back that is not equal (`fill-case.ts` `validated`, read_validated.py).
* **The words are wrong too:** `engine/form-steps.ts` `personSteps` F1 counts a block as filed when `written[switch] === "1" || na.length > 0`. It then always says "The number is already written … the click shows them with the number in place", even when `na` is empty. The writer never writes North American parts ("not in the executable set yet"; `tests/check_c72_imm5257_fill.ts`), so these words are false on every +1 number. No caption in the block matches /telephone|phone|fax/, so the step falls back to "this telephone number". On this card the step is printed twice, contradicting the card's own "To write by hand" list.
* **Why the fix is data only:** `api/src/finished-story.ts` reads `by_kind` from that JSON. With a number that is not +1, the writer puts the phone on Other plus IntlNumber, as it already does for the main phone (Other 1, 91, 9800000001). `filedNA` is then false, so no F1 step and no phone lines to write by hand. No pack or test asserts the story's "5550100"; `acceptance/lib/m3.ts` and the r1d check have their own copies. The code fix to the F1 words, for real +1 numbers, is a separate Minor for the forms lane: say that the number parts must be typed by hand, and name the question.

## 5. Other findings
* No new product finding beyond QA-361.
* A records gap, not a product bug: the gate-B output `local-gateb-C10.2-7e32ee210.txt` ("exit 0, 14/14 … Gate B: passed") is only in qa's scratchpad (`…/scratchpad/c102/`), not in this report folder. Copy it in with the report.
* QA-165 stays open, for the Adobe proof only. The Paper card now shows no empty-mandatory line.

## 6. The file the Lead validates, and how to make it on main on the Mac
* qa's account is right about where the file is and about the tool's steps. Two corrections: do not validate a copy made on 7e32ee210 as it stands (QA-361), and do not load the story again between Validate and read-back. Every load makes new copy ids, and the door works per copy id.
* The file: `prototype/studio/var/workspaces/demo/cases/<case id>/IMM5257-<person id, 8>-<copy id>.pdf`. It is the newest GENERATED IMM 5257 copy for Child 18 or over (Sample) on SAMPLE-VV-FAMILY-1 (`copiesWithHash`, newest per person). It is not the "Earlier copies" one, and not one from an isolated copy.
* How to make it:
  1. `git pull` main, with the QA-361 data fix merged.
  2. `zsh …/studio/start.sh`, which rebuilds and restarts on :4400.
  3. As the author: Demo › Load the finished story (about 4 min).
  4. `cd prototype/studio && DATABASE_URL=postgresql://xr_studio@127.0.0.1:54329/xr_studio_demo TSX_TSCONFIG_PATH=api/tsconfig.json node --import tsx tools/finished-story-paper-copy.ts`. It prints `file`, `copy_id` and the next steps.
  5. Before Adobe, check the copy's card: no "tick Canada/US" step and no phone lines to write by hand.
  6. Validate in Adobe and save into `.tools/solution-1-prototype/validated-imm5257/`.
  7. Read the file back through "Read back the validated copy", as the case officer.
  8. Run `tools/record-validated-samples.ts --paper "the tech lead, Adobe on the Mac"` and commit `samples/validated-imm5257-paper.json`. The PDF stays on the Mac (QA-285).

## 7. What moves C10.2 to Works
1. QA-361's data fix merges (runtime or C10.2 lane). Its check: the regenerated Paper copy writes AltPhone and Fax on Other plus IntlNumber, shows no F1 step and no phone lines to write by hand, and the C10.2 pack and `check_c102_copy_values` stay green.
2. The Lead runs §6 on the Mac: a real Adobe Validate passes, the read-back is accepted, and the saved read-back is committed (P-349).
3. Load the story again on the Mac: the paper, forms, ready and record stages read done, and C10.2-5b and -6d PASS (16/16, no PENDING).
4. A GitHub-runner run on main's head, `data=checkpoint`, is green with no PENDING. It is dispatched by a lane allowed to (this lane got 403) or comes from the next nightly on that head. Its run id goes in the row (P-339, P-322).
5. A fresh qa re-score and gate A walk to the door, on that head.
6. Close QA-316 now, QA-165 on step 3, and QA-361 on step 1. The F1 words fix can follow as its own Minor. QA-310 is Minor and is the Lead's call, not a Works blocker.
