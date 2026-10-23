# IMM 1344 (09-2024) — E1b status, 23 Oct 2026

Sample facts only (made up; never submit). Immigration values are Sample; legal: Unconfirmed: no counsel.

## Done (no Adobe needed)
| Step | Result | Evidence |
|---|---|---|
| Inventory | 233 form fields, 41 mandatory; matches the official file (SHA-256 bb11ccbd…74d2) | `p1/inventory/imm1344e.inventory.json` (unchanged) |
| Sample values, complete set | 56 values: the Sponsor (Canadian citizen by birth, Toronto ON) sponsors Client A (spouse living outside Canada); every code is from the form's own lists; 37 of 41 mandatory fields | `values.complete.json` |
| Fill a copy (`p5/fill.py`, unchanged) | **Writer check PASS**: 56 of 56 read back; original bytes kept; nothing else changed; DocMDP and UR3 verify; poppler 0 errors | `runs/complete-v1.fill-report.json`, `imm1344e.complete-v1.as-written.pdf` |
| Barcode map | 5 barcodes, 149 slots (BC1 29, BC2 32, BC3 39, BC4 28, BC5 21); every slot maps to a known field; slot 1 of each is the form's checksum | `barcode-rules.json` |
| Compare tool | Generalised from P1; reruns P1's IMM 1295 Adobe evidence with **identical** counts (self-test PASS) | `../tools/barcode_compare.py --selftest` |

## Not done: Adobe (blocked)
Computer use is not connected in this session, so Validate, Adobe's save and the barcode capture have not run. The copy that Adobe will open is ready: `imm1344e.complete-v1.adobe.pdf` (a byte copy of the as-written file).

## Expected in Adobe (to confirm, not yet seen)
* The four mandatory signature fields (sponsor's and principal applicant's signature and date) are left empty on purpose: a person signs. If Validate refuses to finish without them, that is a finding for the forms lane (what the product writes in a signature date), not something this lane fills in.
* Form rules found in the template that data-only filling does not trigger: ticking "Canada/US" sets the country code to "1" (click script); the full number is calculated (`ActualNumber` = area code + exchange + subscriber). Both are in `barcode-rules.json` with their source.
* Data fields not in any barcode (88), e.g. the signatures and their dates, the separate phone parts and the hidden date parts, stay in the saved form data only.
