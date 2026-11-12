# Reader verdict: C7.3 and C6.6 re-scores (12 Nov 2026)

Fresh reader on Opus (P-303, P-432). I ran nothing: no test, server, script or GitHub call. I read only files and git history on this branch and `origin/main`. Every number below names its sample (P-500). The GitHub run is judged from qa's verbatim transcript `nightly-43198665627.txt`, checked against the code of main's packs.

## C7.3: **Works** (was Partial)

**P-339 run: valid.** Nightly **43198665627**, `capabilities="C7.3 C6.6"`, `data=checkpoint`, on main **5797feb18**. Job **131116315746** "packs (C7.3)": C7.3-screen 15/15, C7.3-tick 15/15, C7.3 19/19, each exit 0, "Gate B: passed".
* **Main's head at dispatch:** 5797feb18 was merged at 09:55:17 UTC. The next merge on main, ccca6ceaa, came at 10:25:53 UTC. qa committed the C6.6 job's result at 10:23:57 UTC (8e4a43c19). So the run started while 5797feb18 was main's head.
* **What changed between the walk and the run:** `git diff --stat 56b630913 5797feb18` touches only #1628 (BK-5: sign-in.tsx, start.tsx, check_bk4*/bk5 tests, screens records). No answer-sheet, prepare, submission or answers file changed.
* **19/19 proves C7.3-14 and C7.3-15 pass as plain steps.**
  * Main's `C7.3.test.ts` has 19 counted steps: 1, 2, 3, 4, 4b, 5–13, 14, 15a, 16, 15v and 15.
  * C7.3-14 is a plain `ok` (line 156) and cannot pass empty: on the checkpoint it needs `nothing.length > 0`.
  * C7.3-15 (lines 199–202) counts a step only when it passes or FAILs. When HELD it prints HELD and counts nothing, which gave 18/18 on 11 Nov. A FAIL would give exit 1.
  * So 19/19 at exit 0 means C7.3-15 passed. It also needs at least one Y written and a PDF read (`ready15`).
* **Independent re-run (P-290), local stand-in rather than a P-339 run:** `local-gateb-C7.3-C6.6-56b630913.txt` on 56b630913 gave the same counts, each exit 0.
* **Main has moved since dispatch.** Main's head is now **ccca6ceaa** (#1612, BK-17). It changes `api/src/case-prepare.ts` (the filing sync and the prepare view), `case-filings.ts`, `submission.ts` and `submission-record.ts`.
  * The answer-sheet route (`case-prepare.ts:983`) and the sheet's own code are not touched.
  * With nothing recorded, the new helpers hand back their input: `keptRowsOf` returns `[]` (`submission-record.ts:180`) and `keepRecorded` returns `d` (`:121`). So the sheet before a submission is recorded is unchanged.
  * After a recorded submission, BK-17 keeps the recorded filing and its items. That matches gate A step 10 (read-only sheet, untick 409).
  * I judge that this does not undo the run. The row must still name ccca6ceaa and #1612, and the next nightly should include C7.3 and C8.2.

**Gate A: PASS by screens to C8.2's first step.** Run 4 is in `walk/walk-log.txt`: 21 PASS, 0 FAIL, "walk exit 0", on main 56b630913 with the configured checkpoint loaded through Demo (`walk/00`), the case officer at 1024 px.
* The tick, untick with a reason ("Say why the tick comes off."), and all 9 sections → Done all work.
* No sideways scroll at 400, 1024 and 1440 px.
* The client is refused by URL ("This page is for the case officer").
* Ready to file is pressed on both filings. The code's first press goes to `fid`; the loop logged "pressed Ready to file on filing 5e16cd52".
* "Record the submission…" is enabled. 9c recorded `status: submitted`, `application_number V300000777`.
* After the record, the sheet has no tick controls; an untick returns **409** `problems/recorded`; no page error.
* Runs 1–3 passed steps 1–8 each time (16, 15 and 17 PASS). Their only FAIL was run 1's 9b, a setup slip (only one filing reviewed, 4c4afce1).
* I accept the spouse's sheet still reading To do when the submission was recorded. The ticks warn and never block (P-168, as recorded in `2026-11-09-c73.md` line 37).

**Bugs: close QA-392, QA-396 and QA-395.**
* **QA-392 (Major), close.** C7.3-14 is a plain PASS in job 131116315746. The fix is #1553 (a6279e23f, an ancestor of 56b630913). The No side was not shown by screens on a "none apply" group in this walk; the pack carries it.
* **QA-396 (Major), close.**
  * C7.3-15 is a plain PASS in the same job.
  * Walk 2c: the principal's Q8 A line reads "Yes", Education Question 1 reads "Yes", the school line appears once, and the previous-residence line appears once (`walk/02`, `03`).
  * The PDF read-back gives PCRIndicator=Y and EducationIndicator=Y.
  * The fix is #1563 (8fd64d170).
* **QA-395 (Major), close.**
  * Its own repro data (India, 2015-01-01 to 2015-01-01) now gives the PDF PCRIndicator=N (`walk/setup.txt`). The sheet reads "No" (walk 2d, `walk/04`). United States, 3 to 1 years ago, gives Y.
  * That data fails two conditions at once (own country and outside 5 years). The conditions are tested one at a time only by the fix's own `tests/check_qa395_counted.ts` (lines 31–56), which this round did not run.
  * The fix is #1566 (3ea36a0d3).
  * QA-395's capability cell names **C7.1, C7.2**, not C7.3, so it never held C7.3.

**Other holds: none in substance.**
* No other open Major or Critical names C7.3. QA-397 (Major) names C11.6 and C8.2.
* Open Minors: QA-265, QA-171, QA-348, QA-324, QA-379.
* **Records defect to fix before a PR title claims "Works: C7.3":** QA-165 (Gap · Major, Open) is narrowed to C7.2 in substance. But its capability cell mentions "C7.3" 3 times before the first "·", and `gate-b.mjs openBugs` (lines 194–209) reads every id there. So gate B would treat QA-165 as an open Major on C7.3. Rewrite the cell so only C7.2 comes before the "·".

## C6.6: **Partial (stays)**

**Run:** nightly 43198665627, job **131116315804**: "C6.6.test.ts on the checkpoint: exit 0, 31/31 passed". That is 2 setup steps, steps 1–12 (15 checks), screen steps 13–17 at 1440 and 1024 px (12 checks), and no page error. **The declared half of the row is met on main's head** (P-242, P-411; Declared, by_principal, by_staff, written at once).

**Not met for Works. Here is exactly what is missing:**
1. **No run on main's head covers the rest of the row's text.**
   * The pack itself says (`C6.6.test.ts:8`): "A value read from a document stays a proposal until 'Confirm & use' (C6.5's pack, L-SA7) and is not tested here." It has no conflict step and no must-verify step.
   * The sibling packs do cover the text:
     * "Confirm & use", one review per document: C6.5-9, 9c, 10, 11, 23.
     * Conflicts never resolved silently: C6.5-12b, 12c, 15b ("please check", resolved by the officer).
     * Must-verify, CRITICAL, passable with a reason: C7.9-9 onward.
   * But their green runs are on older mains: C6.5's run 42748807953 on bdf3b59ec (10 Nov), and C7.9's run 42581809455 on 3614e35b2 (9 Nov). Fill and prepare code has changed since (#1553, #1563, #1566, #1612).
   * Sibling evidence can count only when those packs are green **in a run on main's head** that the C6.6 row cites. Fix: the Lead dispatches `nightly.yml` with `capabilities="C6.6 C6.5 C7.9"` and `data=checkpoint` (P-439). The other route is adding these steps to C6.6's own pack.
2. **No gate A for C6.6 (P-348 (3)).** This round walked only C7.3.
   * The parts were walked on older mains and separately: the declared half on 8 Nov (e4d63f396), Confirm & use and the conflict in C6.5's walks (9 and 10 Nov), and must-verify in C7.9's (9 Nov).
   * What is needed: one walk by screens on main's head. A client's declared answer fills at once → a document value Confirm & use (one review) → a typed-against-document conflict shown, then resolved with a reason → the CRITICAL must-verify line passed with a reason → the next capability's first step.

**Bugs:** no open Major or Critical names C6.6. QA-302 (Gap · Minor, an infra gap by the tech lead's ruling) stays open. `reports/bugs-open-detail.md` does not exist; BUGS.md was the only bug source.

## Corrections to the qa report
1. The report does not say that main moved to **ccca6ceaa (#1612, BK-17)** after the dispatch, or that it touches `case-prepare.ts`, `case-filings.ts` and `submission*.ts`. "Main 5797feb18 for the GitHub run" is true only at dispatch. The row must state the later head and why the run still stands (see above).
2. QA-395 is listed as retested "for" C7.3, but its row names C7.1 and C7.2. The walk's spouse data does not test own country and the 5-year window separately; that rests on `check_qa395_counted.ts`, which this round did not run.
3. The C6.6 section implies that C6.5's and C7.9's Works rows cover the rest of C6.6's text. Their runs are not on main's head, and C6.6 has had no gate A walk.
4. The report does not mention QA-165's capability cell, which gate B parses as naming C7.3 (see above).
5. Minor points:
   * The walk was headless; steps 9–11 ran to the end once (run 4).
   * Copy buttons were read (`[data-copy-text]`) but not clicked.
   * Axe was not run (the report says so).
   * `walk/copy.txt` is the copy's start and stop log, not a clipboard check.
   * The setup banner "written to fail until the capability is built" is copied from pack 4 and is misleading.
