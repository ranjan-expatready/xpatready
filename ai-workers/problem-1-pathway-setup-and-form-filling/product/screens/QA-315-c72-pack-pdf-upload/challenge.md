# QA-315 (Bake row 11): challenge before building. Question for the tech lead

Forms lane (cloud), 11 Nov 2026. Brief: `/next forms QA-315`, "filing by upload, end to end" (`design/bake-plan-2026-11-10.md` row 11). Nothing is built. This file records why I stopped at Pick (the `next` skill, step 2, "not ready"), with the evidence.

## What QA-315 still asks for, measured today
C7.2's pack runs on a fresh isolated copy of `origin/main` 68a7b59d1 with the configured checkpoint loaded (gate B, `GATE_B_DATA=checkpoint`, port 4461; then again by hand on :4462). Result: **exit 1, 3/11**. These are the same lines qa recorded on 8 Nov (`qa/reports/2026-11-08-rescore5.md`).

| Line | Today | What it needs |
|---|---|---|
| setup (QA-315): IMM 5257 filed as a PDF upload | PASS (release ONLINE → PDF_UPLOAD, 200) | (fixed by #1363) |
| setup (C7.1): copy generated and downloaded | PASS (202) | |
| **P-46**: the upload reports the barcode check (`checked`, `expected` 5, `decoded`, `matched`) | FAIL: 201, no `barcodes` block | The server reads the barcode texts from Adobe's saved file and compares them with the facts |
| **fail**: a copy whose barcodes cannot be read is never ready; the words say to press Validate | FAIL: `current: true`, "Validated copy read back", `read_back {written 0}` | Requires `barcodes.matched === false`, so it needs the same reader |
| P-171 (1): a fact change after the upload marks it out of date | PASS | |
| 6 × evidence: `studio/evidence/c7-2-adobe-validate/result.json` | FAIL: the file is absent | A real Adobe Validate of a Studio copy on the Mac (P-349's method; never simulated, P-343 (10)) |

## Why this lane cannot honestly turn these green
1. **The barcode check is row B170e's work, and B170e is not on the backlog.** `design/xfa-reuse-analysis-2026-11-11.md` §B170e covers it: "read the barcode texts Adobe stored in the file with our own reader … fill the contract's `barcodes` block (`checked`, `expected`, `decoded`, `matched`)". It names this pack's step as its "Done when". It also says "QA-315 … and the pack's own 'never ready' step are separate debts this row does not claim". So the two documents each assign the step to the other. The "5 of 5" measurement (H7) was made on the Mac's validated IMM 5257, which is never committed (AGENTS rule 1).
2. **No Adobe-validated file exists in this cloud copy.** `sources/` and `code/` are absent, and so is `.tools/solution-1-prototype/validated-imm5257/`. Neither `samples/validated-imm5257*.json` nor `evidence/` records the barcode texts or where Adobe keeps them in the file. A reader written here could not be checked against one real file. On the Mac it could then mark the checkpoint's four real validated copies, and the finished story's Paper copy, as not current. That would break C10.1 row 12 and C10.2, which is Works.
3. **The "fail" rule alone would turn five Works packs red.** `tools/simulate_validate.py` writes the form's Validate flag and date, and "never generates the barcode" (TEST ONLY, QA-165). `acceptance/lib/m3.ts` `validateRoundTrip` uploads that file. **C7.6, C7.6-screen, C7.7, C7.10-screen, C8.3 and C9.2** use it and need the copy to count as validated. If "barcodes cannot be read → never ready" ships, those packs go red. The only way to keep them green would be to make the simulator write barcode texts where Adobe writes them. I do not know that place, so that would be a guess, which rule 4 and P-343 (10) forbid.
4. **The 6 evidence lines need the Mac's Acrobat run.** A cloud lane cannot make it.

So the pack's verdict data (the checkpoint, P-322) cannot reach green from this lane. At most 5/11 would pass, and the barcode part would rest on an unverified reader.

## Recommendation (the tech lead decides)
**(a), recommended:** treat what QA-315 found as fixed (the 409s, #1363). Move its remaining lines to the rows that own them: P-46 and "fail" to **B170e** as one row, with the "never ready" step named in it; the 6 evidence lines to the **Mac's Adobe run** (P-349's method, the tech lead on the Mac by computer use, recording `evidence/c7-2-adobe-validate/result.json`). Run B170e where the validated file is: on the Mac, or after the Mac records the barcode texts of one validated copy as a Sample read-back beside `samples/validated-imm5257-paper.json`, so CI can test the reader. That same B170e must change `simulate_validate.py` and the five packs above in the same PR. qa updates QA-315's row in BUGS.md.
**(b):** keep QA-315 open as row 11 and run it on the Mac, after B170e.
**(c), not recommended:** build a barcode-text reader here against a guessed place in the file. This is the case point 2 warns about.

This lane takes the next forms row the tech lead names.
