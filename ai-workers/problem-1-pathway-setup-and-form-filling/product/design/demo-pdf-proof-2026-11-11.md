# Demo: the product fills the IRCC PDF, Adobe validates it, nothing is broken (Lead 12, 11 Nov 11:2x IST)

Sample data only (never a client, never submit). Immigration values Sample; legal: Unconfirmed: no counsel.

## What is proven, and by what
| Claim | Proof | When |
|---|---|---|
| **Auto-filled**: the product writes the case's facts into the official IMM 5257 (visitor visa form) with no typing | C7.1 Works (fill, read back equal, signatures intact): `check_runtime_r1d.ts` 80/80; on the checkpoint, 44 of IMM 5257's 46 mandatory boxes filled with none by hand (8 Nov; the 2 left are Taiwan PIN and Israel passport, needed only for those countries), any empty one listed before the file is offered | qa, 1-8 Nov |
| **Adobe Validate passes** on a copy the product made | Form's own Validate button in Adobe on the Mac: "Validation completed successfully"; saved flag `ApplicationValidatedFlag = Yes` on the four Sample family copies (6 Nov, `samples/validated-imm5257.json`) and the finished story's Paper copy (10 Nov) | 6 and 10 Nov |
| **Encryption not broken** | Live check today (`pdfinfo`): the 10 Nov validated copy keeps the official form's own protection exactly: `AES, print yes, copy no, change yes` | 11 Nov 11:2x |
| **IRCC's digital certification not broken** | Live check today (OpenSSL CMS verify, the project's `e5_roundtrip.verify_sig`): both IRCC signatures, DocMDP (certifies the form) and UR3 (lets Reader save it), **verified**; the official file's bytes are kept unchanged as the start of the copy | 11 Nov 11:2x |
| **Barcodes not broken** | Fill trial (same writer): all 5 barcodes decoded after Validate, **186 of 186 slots agree** with the saved data, 67 of 67 written values come back unchanged (`prototype/evidence-lane/E1/imm5257/STATUS.md`, screenshots in `evidence/`) | 23 Oct |

## Not yet proven (say so if asked)
* The barcodes of a copy made by **today's** product have not been decoded and compared (the 23 Oct trial used the same writer, not the current app). Decoding needs Adobe to draw the barcode page, then `p1/decode_barcodes.py` and `E1/tools/barcode_compare.py`. That is C7.2 (Partial), together with QA-315 (Major: the checkpoint files IMM 5257 Online, so the pack's upload step is refused).

## How to present (about 5 minutes)
1. Open http://localhost:4400 → **Demo › Load the finished story…** (reloads the demo's sample data).
2. Open the finished case, go to its forms, download the **Paper IMM 5257** copy.
3. Open it in **Adobe Acrobat**: the IRCC certification banner, no "document changed" warning (signatures intact), the family's facts in the boxes.
4. Press the form's own **Validate** button: "Validation completed successfully"; a barcode page is added at the end.
5. If asked about encryption: File › Properties › Security shows the form's own protection, unchanged.
