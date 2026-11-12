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
* **C7.3 row: Partial** while QA-392 is open (Lead 17 on #1549, P-305 (3)). Suspects (2) and (3) accepted as not reproduced; (2) stays covered by S3 rule 10. QA-392's fix goes to a forms lane.

## Questions for the Lead
~~C7.3 Works or Partial?~~ Answered by Lead 17 on #1549: **Partial** (P-305 (3)).

## Yes side: QA-396 and QA-395 (Lead 17's relay of #1553's reviewer; main df3d60ed5)
Fresh configured checkpoint (:4476). A Visitor visa case on release 2 (principal), filled by the pack helper. Education and Previous residence then take back "none apply" and get one entry each (helper's Sample values), and the IMM 5257 copy is generated. The PDF is read through its own XFA data (`p1/e5_roundtrip.py`).
* **QA-396 (Bug · Major), reproduced.**
  * The PDF writes `EducationIndicator = Y` and `PCRIndicator = Y`.
  * The answer sheet has no Yes line for either question. Each indicator box appears as a second copy of the entry's own line: "Name of the school or facility attended: SAMPLE" twice; "A country or territory where the person previously resided: India" twice.
  * The officer is never told to answer Yes online.
* **QA-395 (Bug · Major), found here, on the PDF side.**
  * The previous-residence entry is India (the person's citizenship and residence), 2015-01-01 to 2015-01-01, yet the PDF writes Q8 A = Y.
  * The question counts only another country, within the past 5 years, for more than 6 months.
  * Cause: `p5/transforms.ts:68` reads "any previous residence in past 5 years…" as "any entry". Previous travel (QA-318) is instead left to a person.
  * The fixes for QA-396 and QA-395 must agree: the sheet's Yes or No should be the corrected one.
* **Pack** `C7.3.test.ts`:
  * **C7.3-15** now matches by person, fact, row **and value**, on that second copy. A "recorded?" box (`derived:any …`) must read as the Y or N the PDF writes; every other box must carry the same answer. It is **HELD for QA-396** (P-284), naming both boxes.
  * The former person-and-fact check stays a plain step, **C7.3-15a**, so nothing that passes today is hidden.
  * After #1557's review (Block c23689a31): only the "recorded?" boxes are held; every other box on that copy is the plain step **C7.3-15v**, and C7.3-15 FAILs unless the copy writes at least one Y (the entries were really added).
  * On main's code with #1553 merged, fresh checkpoint: **exit 0, 18/18**. C7.3-14 passes (#1553's fix), 15a, 16 and 15v pass, and C7.3-15 is HELD for QA-396 on the two Yes boxes. Pack 4's fixture: C7.3 19/19, `check_vv_prepare_api.ts` 42/42.
* qa check `tests/qa/check_c73_pdf_vs_sheet.ts` part QA-396: 2 FAIL today (Education, Q8 A), its setup lines PASS.
