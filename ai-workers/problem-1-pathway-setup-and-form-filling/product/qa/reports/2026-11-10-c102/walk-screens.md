# Gate A walk of C10.2 by screens, #1495 head db61392dd (= main ddc2a6eb3 + `samples/validated-imm5257-paper.json`), 10 Nov 2026 ~19:30–19:40 IST

Fresh isolated copy `qa_c102a` (:4478, ttl 120) of #1495's head in the Mac qa lane. This Mac's `.tools/solution-1-prototype/validated-imm5257/paper-9c00dbfc-validated.pdf` is present (the copy links `.tools`). Live AI off, US$0, no priced button pressed. Headed in the app's built-in browser at 1024 px; the screenshots in `walk/` were taken by the Playwright tool on the same copy.

1. **The founder's step (configuration author):** Demo › Load the finished story…. The dialog reads "… taken to a recorded submission by the people who act. US$0: no live AI call." Press Load the finished story. The result reads "Finished story loaded … No live AI call was made (US$0)", "Loaded in 151 s". **All 8 steps read Done**:
   * C9.5: the move to release 2;
   * facts: 132 answers, 43 sections confirmed;
   * **"IMM 5257 for Child 18 or over (Sample) filed on Paper by the case officer with a written reason; its copy validated in Adobe on the Mac and read back through the upload door, printed with its barcode page and signed in pen"**;
   * 3 Online answer sheets, 27 sections entered;
   * IMM 5476 3 of 3;
   * documents (4 checklists);
   * **4 of 4 filings Ready to file**;
   * the submission recorded, with 4 filings.
2. **The case officer, SAMPLE-VV-FAMILY-1** (`walk/01`): Release 6. All four people read "Submitted", for example "Recorded as submitted to IRCC on 2026-11-10 (V300000001) …".
3. **The Paper IMM 5257 for Child 18 or over (Sample)** (`walk/02`, `walk/03`):
   * badge "Validated copy read back", with "Read back again" offered;
   * "Copy of 10 Nov, 19:33 · 75 form fields written, 1 by hand · read back and checked", then "Validated copy uploaded back", then "Filed";
   * to write by hand in Adobe: "Province or state of an activity period ("DELHI" is not in the box's option list)";
   * "1. Validated in Adobe: done — validated copy of 10 Nov, 19:33, read back 10 Nov, 19:33", "2. Printed: done", "3. Signed in pen: done", "4. Mailed to IRCC: not yet … It is not recorded in the product yet."
   * The card's header line "Print and sign in pen · In progress" sits next to steps 1–3 done: see the report.
4. **Copies across the case:** no copy that is filed reads "Out of date". The "Out of date" ones are "Copy, not for filing" (Online IMM 5257 twins) or forms this release no longer files (IMM 5475, IRM 0002). IMM 5645 and SCH1 are "Checked copy, not for filing … no fill trial is recorded for edition …" (by design; their lines were passed with a reason on Ready to file).
5. **Ready to file** (`walk/04`): "Recorded as submitted: its review and warnings are closed (correct the record in Submission to IRCC)."
6. **Next capability's first step** (`walk/05`): Cases › SAMPLE-VV-THIN-1 (the case the story leaves on release 1). The notice reads "Release 6 of Visitor visa is out (released 10 Nov). This case stays on Release 1 until you move it." **What changes for this case** opens the move (C9.5):
   * IMM 5257 PDF upload → Online; SCH1 and IMM 5476 signed another way; IMM 5645 new; IMM 5707 removed;
   * 1 new question;
   * a pre-filled reason "Adopting the current release" and **Move this case to Release 6**.
   * Closed with Not now; nothing was moved.

**Pack on the checkpoint, same head, a second fresh copy (:4472):** `gate-b.mjs` `GATE_B_DATA=checkpoint`: "C10.2.test.ts on the checkpoint: exit 0, 16/16 passed (399 s …)" (`gateb-checkpoint-db61392dd.txt`). On 9 Nov it was 14/14 plus 2 PENDING (5b, 6d, the Adobe lines).
**QA-361's check on main ddc2a6eb3:** `check_qa361_paper_phone.ts` 4/4, exit 0 (`check-qa361-main-ddc2a6eb3.txt`).

Not walked: 400 and 1440 px; keyboard only; the shared demo :4400 (not touched); Acrobat itself (the Lead's step; its record is #1495's file).
