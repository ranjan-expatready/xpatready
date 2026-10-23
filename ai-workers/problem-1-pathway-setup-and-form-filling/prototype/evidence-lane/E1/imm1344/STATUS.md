# IMM 1344 (09-2024) — E1b status, 23 Oct 2026

Sample facts only (made up; never submit). Immigration values are Sample; legal: Unconfirmed: no counsel.

## Verdict
**Passes in Adobe after two steps a person takes; does not pass from the product's file alone.** The form's own Validate ended with "Validation completed successfully" and Adobe drew five PDF417 barcodes. All five decode, and all 149 barcode slots agree with the data Adobe saved. Two things blocked a clean pass of the file exactly as written: the Canada/US telephone box (finding F1) and the typed-name signatures (finding F2). Both were done by hand in Adobe, as a person would, and are not in the product's values.

## Before Adobe (unchanged from the BUILD pause)
| Step | Result | Evidence |
|---|---|---|
| Inventory | 233 form fields, 41 mandatory; official file SHA-256 bb11ccbd…74d2 | `p1/inventory/imm1344e.inventory.json` |
| Sample values | 56 values: the Sponsor (Canadian citizen by birth, Toronto ON) sponsors Client A (spouse living outside Canada) | `values.complete.json` |
| Writer check | PASS: 56 of 56 read back, original bytes kept, DocMDP and UR3 verify, poppler 0 | `runs/complete-v1.fill-report.json` |

## Adobe (Acrobat 26.002.22031 in free Reader mode, macOS, driven by computer use; the founder watched)
| # | What happened | Evidence (`evidence/`) |
|---|---|---|
| 1 | Opened `imm1344e.complete-v1.adobe.pdf`: IRCC certification banner, no "changed" warning; every written value in its box on pages 1–7 | `imm1344e-v1-validate-1c-phone-unticked.jpg` |
| 2 | Validate, run 1: "You entered information that is not required, please review", then "Contact Information — 3: Telephone no (Canada/US or Other) must contain a value". Canada/US now unticked; number boxes hidden | `…-1a-not-required.jpg`, `…-1b-telephone.jpg`, `…-1c-phone-unticked.jpg` |
| 3 | **Person step 1:** ticked Canada/US. The form's click script showed the number boxes with our values intact (country code 1, (416) 555-0142) | `imm1344e-v1-canadaus-ticked.jpg` |
| 4 | Validate, run 2: "Signatures — Sponsor's signature must contain a value" | `…-2-signature.jpg` |
| 5 | **Person step 2:** typed the Sample signers' names and dates (sponsor and principal applicant; no co-signer). The page says "by typing my name, I am electronically signing my application" | `imm1344e-v1-signatures-typed.jpg` |
| 6 | Validate, run 3: **"Validation completed successfully."** Page 8 added with five barcodes | `…-3-success.jpg`, `imm1344e-v1-barcode-page-acrobat-26.002.22031.jpg` |
| 7 | Saved with Save As by the founder (the macOS save panel is outside this lane's computer-use grant): `~/Downloads/imm1344e.complete-v1.adobe.pdf`, copied here as `imm1344e.complete-v1.adobe-saved.pdf` (SHA-256 f021fdba…17c3, 694,754 bytes) | — |

## After the save
| Check | Result |
|---|---|
| Signatures | DocMDP (IRCC certification) and UR3 (Reader rights) **verify**, same byte ranges as the official file |
| Bytes | Signed part kept; Save As rewrote everything after byte 573,047 (it isn't an append), so "original bytes kept as prefix" does not hold for this save |
| poppler | 0 syntax errors |
| Saved data | ApplicationValidatedFlag Yes; checksum (crcNum) 1085875172; full phone number calculated 4165550142; country code 1 set by the click script; the four signer entries |

## Barcodes (`tools/barcode_compare.py`, self-test PASS; `evidence/imm1344e-v1-barcode-positions.json`)
* 5 of 5 decoded (`evidence/imm1344e-v1-barcodes-decoded.jsonl`, zxing-cpp). Each starts `IMM1344_07-2014_N|1085875172|`; barcode 5 ends with `2026-10-23|Reader.26.00222031.Full.MAC.en_US.ENU-09-2024.`
* **Slots against the data Adobe saved: 149 of 149 agree** (147 exact; 2 months without the leading zero, the same format as P1's IMM 1295); 0 unknown bindings; 0 slot problems.
* **Written values: 56.** 52 encoded at their own slot (49 exact, 2 months without zero, **1 reformatted by the form**), 3 feed the calculated full phone number, 1 is the Canada/US switch (not encoded). 55 of 56 are unchanged in the saved data.
* The 1 reformatted value: postal code written `M5V0A1`, saved and encoded as `M5V 0A1`. Template evidence: `validatePostalCodeBasedOnCountry` upper-cases a valid Canadian code and inserts the space. The tool reports it as its one accounting problem (exit 1). No rule was added to hide it: the fix is to write the form's own format (F3).
* The barcodes carry the identifier `IMM1344_07-2014` although the form is edition 09-2024 (the template's own label; recorded, not a fault).

## Findings for the forms lane (proposals via the Lead)
* **F1 Telephone format boxes can't be filled from data alone.** The number boxes start hidden; only clicking Canada/US (or Other) shows them. Validate then un-ticks a Canada/US box whose number boxes are hidden, clears it and complains. "Other" can't carry a +1 number: the form's country-code rule rejects "1". So any Canadian or US phone fails Validate unless a person ticks the box, or the writer also saves the shown/hidden state that Adobe restores. Untested: whether Adobe honours that state when the form's checksum no longer matches. P1's IMM 1295 avoided this by using an Indian number via "Other". The same pattern is on the alternate phone, fax and co-signer phones, and on IMM 0008/5257 if they share the script.
* **F2 Signatures are typed names and mandatory for Validate.** `SponSiglbl` and `PASiglbl` are text boxes with "must contain a value" (co-signer only when there is one). The product must not type a person's signature. Validate, and therefore the barcodes, can only complete after the signers type. That is the "person signs, then validates" step in the product flow. Expert/counsel question: may a representative's tool pre-validate before signing, and must the person re-validate after typing? *Unconfirmed: no counsel.*
* **F3 Write values in the form's own format.** A Canadian postal code is stored as `A1A 1A1` (with the space). The writer should send that, so written = saved = encoded.

## Not done / next
* IMM 1344 only, as agreed; IMM 0008 and 5257 next (E1 order).
* Not tested: Windows; Reader 11.0.10; IRCC portal upload; File > Save (in-place append) versus Save As.
