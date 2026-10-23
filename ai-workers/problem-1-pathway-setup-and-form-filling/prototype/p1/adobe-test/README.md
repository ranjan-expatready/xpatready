# Adobe test copies (P1)

Copies opened in Adobe on 19 Oct 2026: Adobe Acrobat Reader 26.001.21662, which Adobe's own updater then migrated to Adobe Acrobat 26.002.22031 running in free Reader mode. Synthetic test data only; never submit these.

| File | What it is |
|---|---|
| `imm5707e.original-copy.pdf`, `imm1295e.original-copy.pdf` | Untouched official forms (hashes match the manifest) |
| `imm5707e.family.append-only-encrypted-diagnostic.pdf`, `imm1295e.family.…` | Made-up family written with the corrected append method |
| `imm5707e.family.full-rewrite.pdf`, `imm5707e.family.append-only.pdf` | Rejected methods, kept for comparison |
| `imm1295e.complete-vN.…pdf` | Complete synthetic IMM 1295 data, iterated against the form's own Validate messages (built by `../adobe_complete_1295.py` from `../adobe-complete-1295-values.json`) |
| `*.r2-data.xml` | R2 fallback data files for Adobe's Import Data |
| `reopen.sh` | Rebuilds a complete-vN copy and opens only that copy |
| `evidence/imm1295e-v6-barcode-positions.json` | Revision 3: slot-by-slot comparison of the five decoded barcodes with the data Adobe saved, from the form's own barcode manifests (`../barcode_positions.py`) |
| `evidence/superseded/imm1295e-v6-barcode-vs-written.value-membership-r2.json` | Revision 2's value-membership count, kept byte-identical; superseded because membership credited values from unrelated slots |
