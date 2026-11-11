# qa capability C7.3: PDF copy vs Online answer sheet, box by box (11 Nov)

qa lane, cloud copy. Lead 17's ask, from the master analysis on #1532 (`design/master-plan-2026-11-11/07b-contract-S3-filing-values.md`). Main **03dff193d**; fresh isolated copy :4473 with Demo › Load the finished story (200 s, US$0). Live AI off; no priced button pressed.

## Method
* A new Visitor visa case on release 2, which files IMM 5257 Online: principal and spouse, every fact answered and confirmed by the pack helper. The lists are answered "none apply", which gives the empty optional boxes.
* The principal's IMM 5257 answer sheet (`GET /runtime/items/:id/answer-sheet`) is compared against the PDF copy of the same form.
* The PDF side is read two ways: the file itself (XFA datasets read with pypdf: 75 form fields with a value) and the boxes stored with the copy (166).
* The match runs through the release's IMM 5257 field map (242 entries, 166 with a fact), form field by form field.

## Results
| Suspect (07b) | Verdict | Evidence |
|---|---|---|
| (1) "nothing recorded" boxes marked only on the PDF path | **Reproduced: QA-392 (Bug · Major)** | The PDF writes PCRIndicator = N (Q8 A, lived elsewhere in the past 5 years) and EducationIndicator = N; the sheet has no line for either. Part 6 reads "No answer to type in this section", with its "Entered in the portal" tick. |
| (2) the sheet takes the first field map whatever its edition (`case-prepare.ts:894`) | **Not reproduced on the checkpoint data** | Every release here maps one edition per form (39 maps over 6 releases, 0 duplicates). The library holds no second edition of any form: IMM 5476 (11-2025) waits for its impact review, and it is PDF upload only, so it has no sheet. |
| (3) an oath or signature box reaching the sheet (P-245) | **Not reproduced** | No release maps a signature, signature date or oath box to a fact. IMM 5257's Signature part holds only the research-contact consent: No on the PDF, No on the sheet. Every sheet line is a box the PDF carries. |

**Suspect (2) by reading the code:** `engine/snapshot.ts` puts every mapped PDF edition of a form into the release, oldest first (`compareEditions`), and `pdfMapInUse` fills the newest (P-32). So once a form filed Online gets a second mapped edition, the sheet would lay out the oldest edition's parts while the PDF fills the newest. This is latent; S3's rule 10 (the sheet reads the edition the values used) closes it. `QA-392d` prints the edition count on every run, so it will show when the data changes.

**The rest agrees:**
* All 105 boxes the PDF fills from an answer have their line on the sheet; no sheet line lacks a box.
* 33 pairs differ in text only by format (form codes vs the release's words, date, address and phone parts).
* Two sheet lines are blank on the PDF by the form's own rules: the applying-from status and dates are blanked because "same as country of residence" is Yes; the province "SAMPLE" is to write by hand, not on the form's list. Neither is a contradiction.
* Cosmetic (no row): the passport's country of issue reads "IND" on the sheet, where other countries read as names.

## Checks
* `tests/qa/check_c73_pdf_vs_sheet.ts`: **6/7** on main 03dff193d (QA-392a FAIL; b, c, d PASS), run on two fresh cases.
* **C7.3 pack** (`acceptance/C7.3.test.ts`; the pack is qa's, P-334 (4)): steps added on the pack's own case.
  * **C7.3-14** (QA-392): each "nothing recorded" box the PDF writes as No has its sheet line. While QA-392 is open it prints `HELD … red, held` naming it (P-284, as C10.1 R12c), so the protected set stays green and gate B never counts it green for a PR that claims it. The fixing PR turns it into a plain `ok()`.
  * **C7.3-15:** every box the PDF writes from an answer has its sheet line.
  * **C7.3-16** (P-245): every sheet line is a box the PDF copy carries.
  * Fresh configured checkpoint (:4474): **exit 0, 16/16**, C7.3-14 HELD (PCRIndicator, EducationIndicator). Finished story (:4473): the same, before the hold 16/17.
* **C7.3 row:** stays Works, with QA-392 noted on it.

## Questions for the Lead
1. **C7.3: Works with a held step, or Partial while QA-392 is open?** Precedent cuts both ways: C7.8 stayed Partial while QA-355 (Major) was open; C10.1 stays Works with R12c held. Recommendation: **Partial**. The sheet is the officer's only source for Online filing and it misses two answers, which also keeps QA-392 counted for E3 on the journey. The pack keeps running either way, since a held step fails nothing.
