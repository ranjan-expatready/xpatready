# C6.17 verdict: a fresh reader, main df52c9fc6 (#1262), 9 Nov 2026

This reader ran nothing (P-303). It read the evidence in this folder, the screenshots A01, A03, A05, A06, B03–B08, C03, C06, C07, C08, C10 and R-400-start-next-dialog, concept B139, `web/src/runtime/stages.tsx`, `api/src/case-stages.ts`, `api/src/form-additions.ts`, `samples/routes.json`, and `git diff df52c9fc6^1 df52c9fc6`. Main's head is 751310cdb. `git diff --name-only df52c9fc6 751310cdb` shows only qa records and `tests/qa/check_qa361_paper_phone.ts`, so the app code is the same as df52c9fc6.

## 1. Gate A: PASS
* **Data (P-322).** The configured checkpoint was loaded with Demo › Load the configured checkpoint (`walk/00`). Every case, answer and stage start was made on screen, as the case officer or as Client B.
* **Set up by script.** Nothing that the verdict counts on. The probes in `probes-stage-scoping.txt` are API and SQL writes, but each was refused (409 `stage_ended`; the database raised `case_stage_ended`), and probe 7 shows the additions unchanged. The replay opened its own cases on screen.
* **Open at a later stage (BR-3).**
  * The UCI "AB-12" is refused on the field and nothing opens (A02, which the walk names; this reader did not open A02).
  * The case then opens with the strip reading "Done before we started → Current · Apply for the work permit by 3 Feb 2027 · Sample" (A03).
  * The done-before stage's panel holds both key details, "entered by the case officer" (A05).
* **Start next stage (BR-4, BR-5).**
  * The dialog says what comes along and asks for a reason (B04). The reason is required (B05: the error summary shows; the error on the field itself is below the fold).
  * After the start, the strip reads "Ended — next stage started" (B06), and the ended stage's panel offers only Close (B08).
* **The next capability's first step is reached, and it uses the output.**
  * C6.2: on the work permit's questionnaire, the person's answers are read where they are, including UCI 87654321 typed in the start dialog (C06). The application's own question is asked again, with "release information" empty (C07). `underneath-carry.txt` agrees: the work stage's application subject holds only the answer Client B gave after the start.
  * C7.1: on stage 2, "Generate a copy" of IMM 5710 writes 5 fields, "read back and checked" (C10). The copy is on the `wp.lmia_inside` release, which is the work stage's. A green pack whose output the next step cannot use would fail; this output is used.
* **C7.8's stage-scoping, by screens and underneath.**
  * By screens: IMM 0008 DEP was added on stage 1 with "Added by the case officer" (B03). Stage 2's Prepare application lists only IMM 5476 and IMM 5710, with no addition (B07).
  * Underneath: both additions stay live on the ended study stage's filing and none is on the work stage's. Remove and add on the ended filing are 409 `stage_ended`. The ended addition's blank PDF still reads (200, `%PDF-1.7`). The database trigger refuses `removed_at`. IMM 0008 DEP is offered fresh on stage 2 (`why_not` null, `same_as` null).
  * The code matches: `form-additions.ts` checks `f.stageId !== c.stage.id`, and its `refuseIfRecorded` and `first` lookups are scoped by stage.
* **What the walk does not show.**
  * There was no headed pass. The full walk is at 1440 px only; the 400 and 1024 px replay covered just three states.
  * The case opened at a later stage was not taken on to its own questionnaire or Prepare (path C covers stage 2 instead).
  * The IMM 5710 addition on stage 1 has no screenshot; only the script and the data show it.
  * No document line or upload exists on either stage (see D1 below).
  * The add panel's handling of `stage_ended` cannot be reached by screens.
* **Claims the evidence does not quite support.**
  * "No sideways page scroll in any state" is true, but `R-400-start-next-dialog` shows the dialog's Cancel cut off at the left edge of the screen ("ancel"). See N2.
  * The reading of the 400 px axe flag as an animation artefact is a guess, not shown. See §3.

## 2. Status: Partial (was Not built), gate A PASS. Not Works.
Under P-339 a row moves to Works only with a green run of its pack on GitHub's runners, on main's head and on the checkpoint, with the run id in the row. There is no such run: this lane's `nightly.yml` dispatch is refused with 403. This follows the precedent of `2026-11-09-c78/verdict.md` and the earlier C7.3 and C6.19 rows.

**Suggested row text:** "Partial | df52c9fc 9 Nov | **9 Nov, main df52c9fc6 after #1262 (`qa/reports/2026-11-09-c617/`; fresh reader on Opus; US$0; cloud qa): Partial (was Not built); gate A PASS.** No GitHub run: qa's nightly dispatch (C6.17, `data=checkpoint`) is refused 403 from this lane, and the tech lead is asked to dispatch it (P-339). Local stand-in, not a P-339 run: the pack 42/42, exit 0, on a fresh copy of the checkpoint; gate-b.mjs with `GATE_B_DATA=checkpoint` 42/42, 'Gate B: passed'. By screens at 1440 px, with 400 and 1024 px replays: a case opened at the work permit with the study permit done before (UCI refused on the field, then kept on the stage record and as the client's answer; deadline 3 Feb 2027, Sample); Start next stage (reason required; the ended stage read only); the new stage's questionnaire reads the person's answers where they are and asks the application's own again; IMM 5710 on stage 2 writes 5 fields. C7.8's added forms stay on their stage, by screens and in the data (409 `stage_ended`; the database refuses). P-412 F13 (a), (b) and (c) are met. Open Minors: QA-370, QA-371, QA-310 and the new rows from this verdict. Works once a GitHub-runner run is green on main's head (app code unchanged since df52c9fc6) and the tech lead rules on D1 ('adds documents'). Row B139"

## 3. Findings
* **QA-370: agree (UX · Minor).**
  * The dialog's Deadline comes from the server's preview (`p.deadline`) and never reads the date being typed (`stages.tsx` StartNextDialog). C03 shows "Can't set … missing" next to 05/31/2027.
  * It stays Minor because the start stores the right date, and the toast and strip show it at once (`case-stages.ts:233-235` uses the deadline after the start; C04).
  * The expected result is right.
* **QA-371: agree (UX · Minor).**
  * The panel shows only the stage's own `key_details`, so on the current stage `person.uci` is null and reads "Not recorded" beside "(also the client's answer)". This holds in A06 and C08, while C06 shows the answer 87654321.
  * The expected result is right. Add one point for the fix: the last stage's "Work permit valid until" can never be recorded. `keyDetails` refuses on a CURRENT stage ("recorded when the next stage starts"), and the work stage has no next stage.
* **The 400 px axe flag: partly agree.**
  * Not logging a contrast row is right. White on rgb(8, 98, 197) works out to about 5.9:1, above 4.5:1.
  * The "mid-fade" reading is not shown. The replay flagged it in both 400 px passes and never at 1024 px. The re-check at 0 ms, when a fade would most likely still be running, was clean, which weakens the fade theory rather than supporting it.
  * Re-run the replay with `reducedMotion: "reduce"` before closing it. The cut-off footer (N2) is another 400-px-only difference worth ruling out.
* **N1 (new): UX · Minor, C6.17 (BR-4; the honest-words class of review M4).**
  * The toast says "5 forms added" (B06), and the dialog lists "5 forms: IMM 5409, IMM 5475, IMM 5476, IMM 5707, IMM 5710" (B04). Stage 2's Prepare application then lists 2 forms, IMM 5476 and IMM 5710 (B07).
  * The pack's own run line shows the same gap: `itemForms` [5476, 5710] against `relForms` of 5.
  * Cause: `case-stages.ts:144` counts forms that apply *and* forms that may apply (`applies !== false`).
  * Expected: say "2 forms now, 3 more if the answers call for them", or count only the forms Prepare will list.
* **N2 (new): UX · Minor, C6.17 (EXPERIENCE at 400 px; WCAG 1.4.10).**
  * At 400 px the Start next stage dialog's footer is wider than the dialog. Cancel is cut off at the left edge of the screen (R-400-start-next-dialog: "ancel").
  * Cancel still works (the replay pressed it 4 times) and the × closes the dialog, so it stays Minor.
  * Expected: the footer wraps or stacks, with both buttons fully visible.
* **Untracked, seen again: review m7 (Minor, BR-8).** The Open a case "Earlier stages" step shows no deadline (A01; `cases.tsx` has no deadline), although BR-8 lists the Open-a-case summary among the places it shows. #1262 lists it, but BUGS.md has no row: log it.
* **D1, "adds documents": an Ambiguity, proposed Major until ruled.**
  * The capability text says Start next stage "adds documents".
  * On the checkpoint no document line is made on either stage. B04 and B06 read "2 documents its release asks for (… no checklist line is made)", and A03 reads "Not worked out for this combination".
  * The concept pack's items 5 (an upload by C6.4) and 9 ("On file …, check it") are not in `C6.17.test.ts`.
  * The builder put this to the tech lead (`qa/built/C6.17.md`, "D1"). Until the tech lead rules that naming the documents is enough, a Works row would claim something the screens show is not there.
* **P-412 F13, checked.**
  * (a) Met. The route is data (`samples/routes.json`, Route and CaseStage models). The tree models are unchanged: `Combination` gains only the relation line. `f13-code-check.txt` confirms no route key in product code from #1262.
  * (b) Met. The deadline is worked out on read (`engine/runtime/stages.ts` `deadlineOf`) and labelled Sample on the strip, the panel, the dialog and the toast. `case-stages.ts` has no task, filing item or reminder.
  * (c) Met. Key details sit on `case_stage.key_details`, and only `same_every_stage` (the UCI) is written as the principal's answer, with channel `stage_record` (`underneath-carry.txt`; pack C6.17-2 and -8). QA-371 is a display issue only.

## 4. What moves C6.17 to Works
1. The tech lead dispatches `nightly.yml` with `capabilities=C6.17` and `data=checkpoint` on main's head. The run must be green ("C6.17.test.ts on the checkpoint: exit 0, 42/42"), and its run id and job id go in the row. qa first confirms that the run's commit has the same app code as df52c9fc6.
2. Until the protected set can run checkpoint packs (B77), the row carries the checkpoint-row hold in the form SKILL §4 gives.
3. The tech lead rules on D1. Either naming the release's documents meets "adds documents", noted in the row, or it does not: then it is a Gap row and the row stays Partial.
4. qa logs N1, N2 and m7 as Minor rows with checks. None of them blocks Works.
5. The 400 px axe pass is re-run with `reducedMotion: "reduce"`, to close the contrast flag properly.

## 5. Open Major or worse naming C6.17 in BUGS.md
None. The rows naming C6.17 are QA-370, QA-371 and QA-310, all UX · Minor. D1 is not yet a row; see §3 and §4.3.
