# IMM 5257 (09-2023) — E1b status, 23 Oct 2026

Sample facts only (made up; never submit). Immigration values are Sample; legal: Unconfirmed: no counsel.

## Verdict (P-65 fill trial for the runtime lane's R1)
**Passes from the product's file alone: zero person steps.** The form's own Validate said "Validation completed successfully" on the first press. All 5 barcodes decode, **186 of 186 slots agree** with the data Adobe saved, **67 of 67 written values come back unchanged**, and every written value is accounted for. The compare tool exits 0.

**For R1:** the trial supports filling IMM 5257 directly with the existing writer. It holds within these limits:
* one complete Sample case only; no edge set (long values, accents) and no "yes" background answer (variant V3);
* the applicant's phone is international ("Other"). A Canada/US number would need the person's tick (finding F1, the same phone script);
* the person still signs and dates after printing, or signs electronically online. Validate doesn't need it.

## Before Adobe
| Step | Result | Evidence |
|---|---|---|
| Inventory (fresh, lane folder) | 254 fields, 46 mandatory, 5 barcodes, official SHA-256 0dc03b24…562e | `imm5257e.inventory.json` |
| Sample values | 67 values for Client A's mother (combination 2, `expected/combination-2.json`): citizen of India in New Delhi, married to EXAMPLE FATHER (IMM 5707's family), retired; family visit to her son Client A in Toronto, 1 Jun–31 Aug 2027, CAD 5,000 of her own; every background answer "No"; research-contact consent "No". Codes from the form's own lists; formats as the form stores them | `make_values.py` → `values.complete.json` |
| Writer check | PASS: **46 of 46 mandatory** fields; 67 of 67 read back; original bytes kept; nothing else changed; DocMDP and UR3 verify; poppler 0 | `runs/complete-v1.fill-report.json` |

## Adobe (Acrobat 26.002.22031, free Reader mode, macOS, computer use)
| # | What happened | Evidence (`evidence/`) |
|---|---|---|
| 1 | Opened: IRCC certification banner, no "changed" warning, values in their boxes | `imm5257e-v1-opened-page1.jpg` |
| 2 | Validate, first press: **"Validation completed successfully."** (print, then sign and date the last page, or sign electronically online). Barcode page added (page 6) | `imm5257e-v1-validate-1-success.jpg`, `imm5257e-v1-barcode-page-acrobat-26.002.22031.jpg` |
| 3 | Saved with File > Save in place | `imm5257e.complete-v1.adobe.pdf` (SHA-256 2145a149…435e, 1,482,411 bytes) |

## After the save
| Check | Result |
|---|---|
| Signatures | DocMDP and UR3 **verify**, same byte ranges as the official file |
| Bytes | Official bytes kept as the prefix; Adobe rewrote our appended update, as on IMM 1344 and 0008 |
| poppler | 0 syntax errors |
| Saved data | ApplicationValidatedFlag Yes; CRCNum 1555943544 (not in any barcode on this form); date last validated 2026/10/23; age 64 / adult; hidden date parts filled (passport 2019/05/10, stay 2027/06/01…); phone `+919800000001`; signature and date empty |

## Barcodes (`../tools/barcode_compare.py`; `evidence/imm5257e-v1-barcode-positions.json`)
* 5 of 5 decoded (`evidence/imm5257e-v1-barcodes-decoded.jsonl`). The labels are `IMM5257_06-2018_N` (template captions; the form is 09-2023), with **no checksum slot**. Barcode 1 ends with the date last validated `2026|10|23`; barcode 5 ends with `Reader.26.00222031.Full.MAC.en_US.ENU-09-2023`.
* **Slots: 186 of 186 agree**: 183 exact, 2 months and 1 day without the leading zero. `DOBDay` has the same `num{99}` picture as the months; the rule and its evidence are in `barcode-rules.json`.
* **Written values: 67**:
  * 57 at their own slot;
  * 7 feed calculated slots: four dates split into hidden year/month/day boxes, and the phone number;
  * 1 is the "Other" phone switch;
  * 2 answers are in no barcode manifest: "other names used?" (as on IMM 1295 in P1) and the research-contact consent.

## Tool changes (lane files only; checked)
`tools/barcode_compare.py`:
* a manifest reference without a final index binds as `[0]`;
* a form's rules may list other `num{99}` boxes (`leading_zero_boxes`). These are reported as `number_leading_zero`, so a day is never called a month.

The IMM 1295 self-test still passes, and the IMM 1344 and IMM 0008 reports are byte-identical (apart from input hashes).

## For the Lead
* **Sample inconsistency:** `expected/combination-2.json` gives the mother's birth date as 1962-07-08, while P1's IMM 5707 Sample values (`p1/e5-family-values.json`) give 1962-06-15. This form uses 1962-07-08. "Asked once" needs one value; the scenario's owner should pick it.
* The research-contact consent is a person's answer (asked in the questionnaire), not a signature. It is mandatory to answer for Validate.

## Not done / next
* Team trial list next: IMM 1295, 5707, 5409, 5476 (5645 once its PDF is on the official list). Not tested: edge set, V3 (a "yes" background answer), a Canada/US phone, reopening the saved file, Windows, Reader 11.0.10, portal upload.
