# IMM 1295 (09-2023) — E1b status (team trial list 1/4), 23 Oct 2026

Sample facts only (made up; never submit). Immigration values are Sample; legal: Unconfirmed: no counsel.

## Verdict
**Passes from the product's file alone, with zero person steps, and repeats P1 exactly.** P1's 91 Sample values (combination 1, Client A's work permit) went through today's writer (`p5/fill.py` via `../tools/fill_copy.sh`), and Adobe's own Validate said "Validation completed successfully" on the first press. Every barcode count and every slot row equals P1's 19 Oct result. The only barcode value that differs is the day the form was validated (23 vs 19). The compare tool exits 0.

## Inputs (unchanged from P1, so this is a true regression)
| Item | Value |
|---|---|
| Official form | `official-sources/ircc/forms/imm1295e.pdf`, SHA-256 57fc256e…70d7bb (the same file as P1's `adobe-test/imm1295e.original-copy.pdf`) |
| Values | `values.complete.json` = `p1/adobe-complete-1295-values.json` (91 values; its hash is recorded in the file) |
| Rules | `barcode-rules.json` = P1 revision 3's rules (`../tools/selftest-imm1295-rules.json`) |
| Writer check | PASS: 91 of 91 read back, original bytes kept, nothing else changed, DocMDP and UR3 verify, poppler 0 (`runs/complete-v1.fill-report.json`) |

## Adobe (Acrobat 26.002.22031, free Reader mode, macOS, computer use)
| # | What happened | Evidence (`evidence/`) |
|---|---|---|
| 1 | Opened: IRCC certification banner, no "changed" warning | `imm1295e-v1-opened-page1.jpg` |
| 2 | Validate, first press: **"Validation completed successfully."** Barcode page added (page 6) | `imm1295e-v1-validate-1-success.jpg`, `imm1295e-v1-barcode-page-acrobat-26.002.22031.jpg` |
| 3 | Saved with File > Save in place | `imm1295e.complete-v1.adobe.pdf` (SHA-256 b2fd21bd…39be, 977,324 bytes) |

## After the save
DocMDP and UR3 **verify** (same byte ranges as the official file); the official bytes are kept as the prefix (Adobe rewrote our appended update, as on the other forms); poppler 0. Saved data: ApplicationValidatedFlag Yes; CRCNum 1721330265; date last validated 2026/10/23; phone `+919800000000`; signature empty; ReaderInfo `Reader.26.00222031.Full.MAC.en_US.ENU-09-2023.`.

## Barcodes (`../tools/barcode_compare.py`; `evidence/imm1295e-v1-barcode-positions.json`)
| Count | Today | P1, 19 Oct |
|---|---|---|
| Barcodes decoded | 5 of 5 (`IMM1295_06-2018_N`) | 5 of 5 |
| Slots | 186: 180 exact, 6 months without the zero, 0 problems | same |
| Written values | 91: 81 at their own slot (75 exact, 6 months), 5 feed calculated slots, 1 cleared by the form's rule, 2 switches not encoded, 2 answers in no manifest; 90 of 91 unchanged after the save (the cleared one) | same |
| Slot rows (position, field, result) | identical | — |
| Barcode values that differ | 1: barcode 1 slot 61, the day last validated (23 vs 19) | — |

## Note for the Lead
This household is combination 1 (Client A with common-law partner EXAMPLEP), not the spousal case on IMM 1344/0008/5257 (Client A married to the Sponsor). Both are Sample; they are separate scenarios, not a conflict.

## Next
IMM 5707 (trial list 2/4), then 5409, 5476.
