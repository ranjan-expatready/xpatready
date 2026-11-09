# QA-315 review: C7.2's pack files IMM 5257 as a PDF upload on the checkpoint

Independent Opus reviewer (P-303), forms lane, 8 Nov 2026. Commit reviewed: **bb1ec40c0601543148cb80df77d02598c458eb2a** (`git diff origin/main..bb1ec40c0`, one file: `prototype/studio/acceptance/C7.2.test.ts`, +13 −2). I edited no code.

## What I ran
I ran the pack on the builder's copies (live AI off, US$0, port 4400 not used):
* Checkpoint, `npx tsx acceptance/C7.2.test.ts 4452 xr_studio_qa315`: exit 1, 3/11. The new setup line PASSES: release ONLINE, was ONLINE, change 200, now PDF_UPLOAD. The C7.1 setup line PASSES (202). The upload returns **201**, not 409. P-171 (1) PASSES (upload 201, put 200, out_of_date true). P-46 and "fail" FAIL, with no `barcodes` in the response. The 6 evidence lines FAIL (no Mac run).
* Fixture, `4453 xr_studio_qa315f`: the same 3/11. The channel was already PDF_UPLOAD, so the change is null.
* Data underneath (GET `/runtime/cases/:id/prepare`): on the checkpoint, the item reads `channel PDF_UPLOAD, line_channel ONLINE`. Its `channel_changed` records the officer, the time and the reason "(C7.2's pack, Sample)". On both data sets, `accepts` is `[ONLINE, PDF_UPLOAD, PAPER]` with `accepts_quote: null`.
* Break pass on the same item, through the channel route (`case-prepare.ts:700`):
  * The client is refused 403: "Only the case officer can do this."
  * A stale version is refused 409: "Changed since you read it … Reload".
  * NOT_NEEDED is refused 422.
  * The view's version was unchanged afterwards, so nothing was written.

## The six checks
1. **Honest, not a mask.** The pack uses the product's own C11.6 route, which is the same one the "Change channel" button uses (`web/src/runtime/item-channels.tsx:83`). The route checks the officer role, the prepare version and IRCC's accepted channels, and it keeps an audit line. The product guard that refused the upload is unchanged: `fill-case.ts:67` `validated()` still refuses an Online form's copy because it is not for filing. That refusal is correct behaviour, not the bug: on release 2 the copy really is not for filing. No scaffolding is used (P-33). The one caveat is in Minor 1.
2. **The pack still works on the checkpoint and the fixture.** Both copies gave the result shown above. **On the six, not run.** I did not reset the builder's copies. The new block only reads `/prepare` and changes the channel only when it is not already PDF_UPLOAD. The pack's start check (a `vv.single` release, else STOP, exit 2) is unchanged, so on the six the pack behaves as before.
3. **The stricter P-171 (1) line holds.** It passes on both data sets with upload 201 and an `id`. If the upload is refused (`up.status` ≥ 300 or no `id`), the line now fails, so it can no longer pass vacuously.
4. **Gate B matching is correct.** `stepsVerdict` builds `^PASS\s+C7\.2[- ]setup(?![0-9A-Za-z])` and matches both "C7.2 setup (QA-315)…" and "C7.2 setup (C7.1, on main)…". A FAIL on either line makes step "setup" not green, which is the intended strictness. "C7.2 P-171 (1)…" still matches step `P-171`.
5. **Nothing is dropped or weakened.** The pack goes from 10 lines to 11. P-46, "fail" and the six evidence lines are byte-identical. P-171 (1) is stricter.
6. **AGENTS.md rules 1–5.** The change is one test file and commits no source, PDF, log or database. It uses no personal names ("Sample Applicant A" is a sample). Rule 4 is met in part: see Minor 1.

## Issues (none is Blocker or Major)
1. **Minor (rule 4).** `C7.2.test.ts:36` says "IRCC accepts IMM 5257 as a PDF upload too" as if it were a fact, with no source. On both data sets the product has no IRCC record for it (`accepts_quote: null`, the no-record fallback in `engine/channels.ts:49`, "as Sample"). Fix: reword the comment to "the product offers a PDF upload for it (no IRCC accepts record on this data: Sample)", or cite IRCC with page, quote and date. The reason sent with the change already says Sample.
2. **Nit.** `C7.2.test.ts:44` reads `const g =await`: a space is missing.

## Out of this row's scope
I note these and do not ask for them here:
* P-46 and "fail" fail on both data sets for the same product reason: the upload returns no barcode report. This matches qa's C7.2 record (`qa/CAPABILITIES.md:81`), and the barcode decode is the evidence lane's M3 tool (`tools/read_validated.py`). The builder's plan to raise it to the tech lead is right.
* P-171 (1) now passes on a copy whose read-back writes 0 values (`read_back {written 0}`). The out-of-date flag follows the fact change, so this line is valid. A copy that carries values is still the open QA-165 / CAPABILITIES note.

## Journey score (reviewer, the one for this check)
**8/10, pass, no 0.** Report: `journey-test-reviewer-2026-11-08.md` in this folder.

## What I could not check
* **The case officer's walk in a browser.** No Playwright browsers are installed on this machine. The route and the role were checked through the API only.
* **The six data set.** I did not reset the builder's copies.
* **GRAPH.md.** I did not run `graph.mjs`, because it rewrites GRAPH.md and my brief lets me write only these files. This test-only change adds no page and no route.
* **The BIC scorecard and D1–D20.** They do not apply: this change adds no screen, only an acceptance-pack step.

**Verdict: Approve.** QA-315 is fixed: the 409 from the data is gone, no step is dropped, and gate B's matching holds. The two Minors may be fixed in the same PR or later.

## Round 2 (569deecbf783fc9ef69851290f5946f2ccd97cef, diff from bb1ec40c0)
* **Minor 1 is fixed.** `C7.2.test.ts:36-39` now says the product offers IMM 5257 as a PDF upload. It says that, with no IRCC record on this data, Online, PDF upload and Paper are offered as Sample, and it names `engine/channels.ts` `allowedChannels`. This matches what the data shows (`accepts_quote: null`).
* **The nit is fixed.** Line 44 now reads `const g = await`.
* **No other code changed.** Both review files were committed byte-identical to what I wrote.
* **Re-run:** on the checkpoint (4452) the pack gives the same 3/11, and the step labels and gate B matching are unchanged.

**Verdict: Approve** (569deecbf).
