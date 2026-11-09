# C10.2 walk at 1440 px, 9 Nov (head of #1394)

* `without-adobe-file/`: a fresh isolated copy, as CI and qa see it. The paper, forms, ready and record stages read Partly and wait for the Paper IMM 5257 copy validated in Adobe. 0 console errors.
* `with-validated-file-TEST-ONLY/`: an isolated copy holding a **test-only** validated file. It stands in for the file the Lead validates in Adobe on the Mac. Every stage reads Done, and the four filings are recorded together. 0 console errors.
  * The file is the acceptance helpers' `asValidated`, kept in the copy's own `/tmp` folder.
  * It was recorded with `tools/record-validated-samples.ts --paper` into that copy's own saved file.
  * It never reaches demo data or `samples/`.

Each folder holds its `walk.cjs` (Playwright, 1440 x 900).
