# IMM 0008 (05-2026) — E1b status, 23 Oct 2026

Sample facts only (made up; never submit). Immigration values are Sample; legal: Unconfirmed: no counsel.

## Verdict
**Passes after one person step.** The form's own Validate said "Validation completed successfully" once the empty dependant block was removed with the form's own "Remove Dependant" button (finding F4). No signature is needed to validate this form. All 10 barcodes decode, **462 of 462 slots agree** with the data Adobe saved, and **all 55 written values come back unchanged**. The compare tool exits 0.

## Before Adobe
| Step | Result | Evidence |
|---|---|---|
| Inventory (new) | 320 fields, 94 mandatory (54 of them on the spouse block and dependant rows), 10 barcodes, official SHA-256 2560489b…3285 | `imm0008e.inventory.json` (`../tools/inventory.py`, P1's inventory function unchanged) |
| Sample values | 55 values for Client A, the principal applicant in the IMM 1344 case: citizen of India in New Delhi; married to the Sponsor 15 Mar 2019; Family › Spouse; intends Toronto ON; no dependants. Every code is from the form's own lists; Category and City are checked against the form's LOV data (the lists their scripts fill); formats as the form stores them (F3) | `make_values.py` → `values.complete.json` |
| Writer check (`../tools/fill_copy.sh`) | PASS: 55 of 55 read back, original bytes kept, nothing else changed, DocMDP and UR3 verify, poppler 0 | `runs/complete-v1.fill-report.json` |

## Adobe (Acrobat 26.002.22031, free Reader mode, macOS, computer use)
| # | What happened | Evidence (`evidence/`) |
|---|---|---|
| 1 | Opened: IRCC certification banner, no "changed" warning. Program "Family", Category "Spouse", City "Toronto" all shown: the form rebuilds its script-filled lists on opening | `imm0008e-v1-opened-page1.jpg` |
| 2 | Validate, run 1: "Personal Details — 1. Family Name must contain a value". The focus went to the empty first dependant block on page 3, which shows by default | `…-validate-1-family-name.jpg`, `…-validate-1-empty-dependant-block.jpg` |
| 3 | **Person step:** "Remove Dependant" → the form's own confirmation "Are you sure…?" → OK. The page says to include the spouse only if not already a citizen or PR, and the Sponsor is a citizen. The form went from 6 to 4 pages | `…-remove-dependant-confirm.jpg`, `…-dependant-removed.jpg` |
| 4 | Validate, run 2: **"Validation completed successfully."** The form adds: print, then sign and date the last page; online applicants sign electronically when submitting. Barcode pages added (6 pages) | `…-validate-2-success.jpg`, `…-barcode-page4-acrobat-26.002.22031.jpg`, `…-barcode-page5.jpg` |
| 5 | Saved with File > Save in place (an Acrobat menu, so no macOS panel and no founder step this time) | `imm0008e.complete-v1.adobe.pdf` (SHA-256 abb9ab0a…2aad, 1,083,877 bytes) |

## After the save
| Check | Result |
|---|---|
| Signatures | DocMDP and UR3 **verify**, same byte ranges as the official file |
| Bytes | Official bytes kept as the prefix; Adobe rewrote our appended update (the as-written file is not a prefix), as on IMM 1344 |
| poppler | 0 syntax errors |
| Saved data | ApplicationValidatedFlag and its mirror Yes; checksum (CRCNum) 1405805730; DateLastValidated 2026-10-23; ReaderInfo `Reader.26.00222031.Full.MAC.en_US.ENU-05-2026`; age 36 / adult (calculated); phone calculated `+919800000000`; consent and signature empty |

## Barcodes (`../tools/barcode_compare.py`; `evidence/imm0008e-v1-barcode-positions.json`)
* 10 of 10 decoded (`evidence/imm0008e-v1-barcodes-decoded.jsonl`). Each starts `IMM0008_04-2022_N|1405805730|`. Barcodes 1–2 carry Client A; 3–9 are empty (no spouse block, no dependants); 10 ends `2026-10-23|Reader.26.00222031.Full.MAC.en_US.ENU-05-2026|`.
* **Slots: 462 of 462 agree** with the saved data: 461 exact, 1 month without its zero (`DOBMM` binds `num{99}`: saved `04`, encoded `4`; rule and evidence in `barcode-rules.json`). 0 unknown bindings, 0 problems.
* **Written values: 55**: 52 at their own slot (51 exact, 1 month), 2 feed the calculated phone number, 1 is the "Other" phone switch (not encoded). 55 of 55 unchanged after the save.
* The barcodes say edition `04-2022` although the form is 05-2026 (the template's own captions; recorded, not a fault).

## Tool changes (lane files only; checked)
* `tools/inventory.py` (new): writes any edition's inventory into the lane folder with P1's function.
* `tools/barcode_compare.py`:
  * barcode numbers above 9;
  * captions for any number of barcodes;
  * later rows of a repeating group (`dependants[1..3]`) bind like row 0;
  * a form's rules may add month fields with evidence.

  The IMM 1295 self-test still passes, and the IMM 1344 report is byte-identical (apart from input hashes).

## Findings for the forms lane (proposals via the Lead)
* **F4 Empty first dependant block can't be removed from data alone.** IMM 0008 shows the spouse/first-dependant block (`depPrime`) by default, with mandatory fields. Only its "Remove Dependant" button (plus a confirmation) hides it, and that state isn't in the data. A principal applicant with no family members to list (as here) has to click it, or the writer has to carry the hidden state. Same class as F1 (state that only a click sets).
* **F2 is IMM 1344-specific.** IMM 0008 validates without signatures; the person signs after printing (or electronically online). The product flow should not assume every form needs signatures before Validate.
* **Lists filled by scripts are fine on opening.** Category (after Program) and City (after Province) showed correctly from data alone, unlike F1's hidden boxes. Their codes must still come from the form's LOV data, not the static inventory list (`make_values.py` shows how).
* **Sample assumption for the expert:** the sponsoring spouse (a Canadian citizen) is not listed as a dependant on the principal applicant's IMM 0008; Category "Spouse" under Family.

## Not done / next
* IMM 5257 next (E1 order). Not tested: a dependant row (edge set); reopening the saved file to see whether the removed block stays hidden; Windows; Reader 11.0.10; portal upload.
