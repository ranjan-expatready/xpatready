# C8.3 verdict after #1440: gate A PASS · QA-345 fixed and closed · status Partial (not Works: no GitHub run id, P-339)

Reader: a fresh Opus subagent that ran nothing (P-303). It read this folder (walk.md, walk-log.txt, logs, scripts, shots 08, 26c, 26d, 30c, 30e, 30f, 31, 32, 35), the C8.3 row, QA-345, concept `screens/B144/concept.md`, #1440's merge (3632c3ae8) and the code it touched, and used `git show`/`git log` only. Main 7e32ee210, 9 Nov 2026. Its report, kept to its points and words:

## 1. Gate A: PASS
* The walk goes by screens from Send for review to C8.2's first step and on to its record. Shot 33 shows the Record the submission dialog open; shot 35 and walk-log show "Recorded · read-only", both filings "Submitted", and "Prepared by · Reviewed by: Case officer · Representative". C8.2 can use what C8.3 produced.
* Walk-log: `representative_review lines open: []`. Shot 08 carries #1440's new dialog words. Shot 26c shows round 2's IMM 5257 "Approved, still current · Stamped with the validated copy read back", with no Re-approve button.
* Not by screens, and walk.md says so: the case setup, and the Adobe read-back (no screen exists).
* Caveats: one pass at 1024 px only. Shot 32 is the case page, not Ready to file, so "Both 'Ready to file · Approved'" is backed by the walk-log, not by the shot.

## 2. QA-345: fixed on 7e32ee210; close it
* Its own check: exit 0, 2/2 on a fresh checkpoint copy (exit 1 on cfaa199f4).
* Underneath: rounds 2 and 3 move from `none` to `validated_copy`, exactly 2 `review_stamp_file` audit lines; round 4 is stamped with the live sha at approve.
* The code matches ruling (a): `stampReadBack`, plus `fileStampCurrent` in stampCurrent. The commits after #1440 do not touch review code; case-prepare.ts changed only for C7.3's untick.
* The fix covers barcode forms only (see 4d, 4e); the closing note should say so.

## 3. Row: Partial (unchanged)
* Missing for Works: one GitHub-runner nightly run (`data=checkpoint`) on main's head with C8.3.test.ts green, and that run id in the row. The tech lead has to dispatch it (the cloud lane gets 403). The local gate-b run (25/25) does not count (P-339).
* Also before Works: the Lead's ruling on 4d and 4e. If 4e is ruled a Major gap, it holds the row. The Minors below do not.

## 4. Findings
* **(a) Tooltip sometimes does not open on keyboard focus.** Bug · Minor (accessibility, WCAG 2.1.1 / 1.4.13). Does not hold the row: the form panel shows the same words. Bug row: yes, screens lane. Also flakiness: the builder's `check_c83_review_browser.cjs` passed 1 of 3 runs; it is not the pack, so it does not block gate B, but it is not a usable regression check as it stands. walk.md's "#1440's builder saw the same stop once" needed a source (now cited: #1440's PR description).
* **(b) IMM 5257's facts table: 110 rows for 68 distinct facts.** UX · Minor; the header "110 facts" overstates the count. Bug row: yes. All repeats carry the same value. Fold in the IMM 5476 duplicate the 9 Nov round saw.
* **(c) A file withdrawal is worded as a fact change.** UX · Minor. Bug row: yes. qa missed a third piece: the chip's tooltip says "Approved earlier; a fact on it changed since", the fixed `WITHDRAWN_TOOLTIP` used whatever the reason (api/src/review-rounds.ts:259, engine/runtime/review.ts:259). So the stamp line, the button "Re-approve 1 changed form" and the tooltip all say "changed" or "stamped" when the reason is a different file. The panel line itself is right.
* **(d) Hand-signed IMM 5476 stamped `generated_copy` although its signed scan existed.** Ambiguity: a question for the Lead, not a bug row yet. Ruling (a) says an approval stamps "the file that is filed"; for a hand-signed form that is the scan. The concept's "Beaten" and B2 name only the barcode file, so today's behaviour follows the concept. If the Lead extends (a) to scans, this becomes a Gap, Major.
* **(e) Found by reading code, not by a run: PDF-upload forms (IMM 5645, IMM 5257 SCH1).** `fileStampCurrent` is `!validatedSha || …`, and only a validated read-back stamps an approval afterwards. So an approval stamped `none` on a PDF-upload form stays "Approved, still current" when a generated copy is made later and filed; that copy is never stamped or re-asked. QA-345's shape for every non-barcode form. In this walk both such forms were approved with `none`, and the filings were recorded with the CRITICAL "no copy made for filing" passed with a reason (shot 31; walk-log `no_copy`). IMM 5645's stamp line also says "an online form has none" on a form that shows "PDF upload" (shots 30f, 32). Conflict: Major if ruling (a) means every file, Minor (words only) if barcode files only. Needs the Lead's ruling, and a replayable check before it is logged.
* Also: the principal's filing was approved twice (rounds 2 and 4) with nothing ticked, allowed by BR-4's one confirmation; the report should say so. An IMM 5476 fact labelled "(values: appoint, cancel)" holds "SAMPLE" and was confirmed; it comes from the acceptance helper's `fillEverything` through the API: a possible validation gap outside C8.3, not traced.

## 5. Suggested row text
"9 Nov, main 7e32ee210 after #1440 (`qa/reports/2026-11-09-c83b/walk.md`; fresh reader on Opus; US$0): Partial. QA-345 fixed and closed … Gate A PASS by screens at 1024 px on the configured checkpoint, through C8.2's Record the submission … The pack ran locally through gate-b, 25/25 on the checkpoint; that is not a GitHub run, so the row stays Partial until a nightly with `data=checkpoint` on main's head is green and its run id is here. New Minors … Open for the Lead: whether ruling (a) covers PDF-upload and hand-signed forms." (Used, with the bug numbers, in `qa/CAPABILITIES.md`.)

## qa's response
* All three Minors logged as rows: QA-376 (a), QA-377 (b, with the IMM 5476 repeats), QA-378 (c, with the tooltip words).
* (d) and (e) go to the Lead as questions, not rows: both turn on how far ruling (a) reaches. (e) was not reproduced by qa this round; if the Lead rules that (a) covers every file, qa writes its replayable check and logs it.
* The IMM 5476 "(values: appoint, cancel)" holding "SAMPLE" is outside C8.3 and comes from the helper's API fill; noted in the report, not logged.
