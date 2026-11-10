# C6.17 re-score verdict: a fresh reader, main 66e74115e (#1477, QA-375 under P-444), 10 Nov 2026

This reader ran nothing (P-303). It read the files in this folder, these screenshots: `walk/` R01, R02, R03, R05, R08, R09, R10, R-400-start-next-dialog and R-400-stage2-documents. It also read the walk scripts in `scripts/`, `git diff 66e74115e^1 66e74115e`, `screens/B139/review-qa375-p444.md`, `journey-test-reviewer-2026-11-10.md`, P-444, the first round's `../2026-11-09-c617/verdict.md`, and the code in `api/src/case-checklist.ts`, `api/src/case-stages.ts`, `engine/runtime/stages.ts` and `web/src/runtime/checklist.tsx`.
**App code:** `git diff --stat 66e74115e HEAD -- studio` (HEAD = the records branch, 30c6a44b1) lists only five files: `tests/qa/check_qa370…374_*.ts`. `check_qa382_on_file_after_own_upload.ts` is untracked in `tests/qa/`. The local `origin/main` is 66e74115e. So the app code is the same as main 66e74115e, as qa says.

## 1. Gate A: PASS
* **QA-375 is fixed, by screens.**
  * The study permit's Documents panel has its own lines, "0 of 3 received" (R01; it read "Not worked out for this combination" in the first round's A03).
  * The officer's upload from the line's menu makes the passport line Received (R02).
  * The dialog reads "2 documents on the checklist: Passport or travel document …; Proof of fee payment …" (R03).
  * The work stage then has its own fresh lines, "0 of 2 received", Not requested, "No file yet", and the passport line reads "On file from Study permit, uploaded 10 Nov 2026: check it for this application." (R05, R08).
  * The ended stage's panel is read only and lists "Its own documents · Sample Client D: sample-passport-qa.pdf" (R10). R10 was taken after the stage-2 upload, so it also shows that the later file did not reach the ended stage.
* **QA-375 is fixed underneath.**
  * Lines are per stage: 3 on the study stage and 2 on the work stage. Each stage's file sits on that stage's own line.
  * An upload on the ended line is refused: 409 `stage_ended`, and nothing is added (`underneath-documents.txt`).
  * The code matches. The new guard is `row.stageId !== c.stage.id` in `case-checklist.ts` `line()`. `stored()` makes and reads rows by `stageId`. The ended panel reads only its own lines' files, uploaded before it ended (`case-stages.ts:105`).
  * `samples/fee-table.json` turns on `checklist` for `sp.outside` and `wp.lmia_inside` with no fee lines. Every line's quote cites IMM 5483 or IMM 5556 with page and date, or says Sample and names its source (P-170).
* **The next capability's first step is reached, and it uses C6.17's output.**
  * C6.4 runs on the line that Start next stage made: the line's menu offers "Request · Upload a file… · Not applicable… · History" (R08).
  * The officer uploads this application's copy. The line is Received, "1 of 2 received" (R09; the same at 400 px in R-400-stage2-documents).
  * This line exists only because of the start, so the step uses C6.17's output. QA-382 is a wording blemish at that step, not a block.
* **Nothing the verdict counts on was set up by script.**
  * The checkpoint was loaded with Demo › Load (`walk_c617_load.mjs`, `walk/00`).
  * The case, the uploads (file-chooser picks of small synthetic PDFs), the start and the reason were all done on screen (`walk_r1`…`r3.mjs` use clicks, typing and `setFiles` only; their `evaluate` calls only read the page).
  * The underneath probes are API writes, and each was refused.
* **What the evidence does not show.**
  * (a) "No page errors and no 5xx": the scripts print these, but no saved log is in the folder.
  * (b) `walk_r2.mjs` writes `R06-ended-stage-own-documents`, but `walk/` has no R06. The ended panel straight after the start, before the stage-2 upload, has no image. R10 covers it afterwards.
  * (c) "Not applicable gives the same 409": the excerpt is cut off before its HTTP line. The body does read `"status":409`.
  * (d) "axe clean, no sideways scroll" is true, but R-400-start-next-dialog still shows "ancel" (QA-373). The walk says so.
  * There was no headed pass. The shared demo was not walked.
  * None of these changes the verdict.
* **The first round's gate A (df52c9fc6) still stands for what #1477 did not touch.**
  * #1477 leaves `case-stages.ts`, `engine/runtime/stages.ts`, `web/src/runtime/stages.tsx`, `cases.tsx` and `form-additions.ts` unchanged.
  * It removes no pack step: only the header comment and an import line change. The 42 earlier steps are re-run green inside 47/47 on the GitHub run.
  * One behaviour changes: Prepare and readiness now count document items on these two combinations (review point 6). That reaches C8.x, not the first round's C6.2 (C06, C07) or C7.1 (C10) steps.

## 2. QA-375: close
The ruling's fix (P-444) is in: the per-person checklist is on for both combinations, and pack items 5 and 9 are in `acceptance/C6.17.test.ts`. Both are shown by screens and underneath (§1), and the GitHub run asserts them on the checkpoint (C6.17-5 P-444, C6.17-9 P-444/BR-6/BR-10). The reviewer's fail-first check gave 44/47 with the rule off. qa's move of the row into `history/qa-bugs-closed-2026-11-10.md`, word for word with a closing note, is right. One small records point: the second copy of the row there sits after a blank line, with no table header, so it will not render as a table.

## 3. The GitHub run
This reader could not open GitHub. It read qa's saved excerpt, `github-run-42759023740.txt`:
* `nightly.yml` run **42759023740**, workflow_dispatch, branch main, head 66e74115eb0c…, conclusion success.
* Job **129640099845**, "packs (C6.17)", success, with `GATE_B_DATA: checkpoint`.
* The log line: **"C6.17.test.ts on the checkpoint: exit 0, 47/47 passed (156 s: copy 4, Load the configured checkpoint 75, run 77)"**, then "Gate B: passed."
* The head is main's head as this copy sees it (`origin/main` = 66e74115e).
* qa's local stand-in on a fresh copy agrees: 47/47, exit 0 (`pack-C6.17-66e74115e.txt`).
On that excerpt, P-339 is met.

## 4. Status: Works (was Partial)
P-339 is met (§3). Gate A is PASS. No open Major or worse names C6.17 (§6). C6.17 is an M3 row, so `works-set.mjs` scores it on the checkpoint (D5), and no `REGRESSION-HELD.md` line is needed, as for C6.16.
**Suggested row text:** "Works | 66e74115 10 Nov | **Works (was Partial). P-339: nightly.yml run 42759023740 on GitHub's runners, main 66e74115e (after #1477, QA-375's fix under P-444), data=checkpoint, job 129640099845 "packs (C6.17)": "C6.17.test.ts on the checkpoint: exit 0, 47/47 passed".** No open Blocker, Critical or Major names C6.17 (fresh reader on Opus that ran nothing, P-303, `qa/reports/2026-11-10-c617-rescore/verdict.md`; US$0; cloud qa). **QA-375 closed:** by screens on a checkpoint copy (Demo › Load) at 1440 px, with replays at 400 and 1024 px: the study permit's own lines (0 of 3); an upload through C6.4; Start next stage says '2 documents on the checklist'; the work stage's own fresh lines (0 of 2), with 'On file from Study permit, uploaded …: check it for this application'; the ended stage lists its own document and is read only. Underneath, the lines are per stage, and the ended stage's line is 409 `stage_ended`. **Gate A PASS**, ending at C6.4 on the new stage's line (Received, 1 of 2). The first round's walk (df52c9fc6: open at a later stage, Start next stage, C6.2 and C7.1 on stage 2, C7.8's stage-scoping) stands for the code #1477 did not touch. Open Minors: QA-370, QA-371, QA-372, QA-373, QA-374, QA-382 (UX/Gap) and QA-310. Before: **9 Nov, main df52c9fc6 after #1262 (`qa/reports/2026-11-09-c617/`): Partial (was Not built); gate A PASS; held by no GitHub run and by QA-375.** Row B139"

## 5. Findings
* **QA-382: agree. UX · Minor, and the expected result is right.**
  * R09 and R-400-stage2-documents show "Received · File: sample-passport-work.pdf" above "On file from Study permit … check it" on the same line.
  * The cause is in the code: `onFile` in `case-checklist.ts` never looks at the line's own files.
  * Its check is 1/2. It stays Minor because nothing is wrong in the data, and the officer is only told to check a copy they have already replaced.
  * One point to sharpen the fix: hide the words once the line has a current file uploaded after the stage started.
* **New: possible Bug · Minor (hardening), from reading the code; not shown on screens. qa should reproduce it before logging.**
  * In `case-checklist.ts`, `docsOf` and the supersede on upload (`:264`; also `case-documents.ts:299`) match files by person and document type only, not by stage.
  * If a route's two releases shared a document type, three things would follow. The new stage's "fresh" line would list the earlier stage's file as its own. That line would also say "On file …". An upload there would mark the ended stage's file `current: false`.
  * This cannot be reached on the checkpoint: the study and work types differ (`underneath-documents.txt`). So it does not hold Works.
  * Expected: the files a line shows, and the supersede, are scoped to the line or its stage (`checklistLineId`).
* **The older Minors are still correctly open.**
  * Each check is still 1/2 on this main.
  * QA-370: the dialog's deadline reads "Can't set … missing" (also seen in R03).
  * QA-371: "UCI (also the client's answer) Not recorded".
  * QA-372: 5 forms promised, 2 listed (also seen in R03).
  * QA-373: Cancel at x = -24.9 px ("ancel" in R-400).
  * QA-374: no deadline on Open a case.
  * #1477 touched none of their code.
* **No other new issue.**

## 6. Open Major or worse naming C6.17 in BUGS.md
None. With QA-375 moved out, the rows naming C6.17 are QA-370, QA-371, QA-372, QA-373, QA-374, QA-382 and QA-310. All are Minor.
