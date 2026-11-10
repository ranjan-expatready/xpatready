# Gate A walk, C6.17 re-score after #1477 (QA-375's fix, P-444), main 66e74115e, 10 Nov 2026, 05:00–05:08 UTC

Setup:
* Playwright with the image's Chrome, headless, **1440 px**, deviceScaleFactor 2.
* Fresh isolated copy `qa_c617r` on :4472, started with `--ttl 180` and stopped by qa at the end.
* Code: the records branch after its merge of main (30c6a44b1). Its app code is identical to main 66e74115e (`git diff origin/main HEAD -- studio` lists only `tests/qa/`).
* Every step below is a Playwright click, keystroke or file-chooser pick on what the page shows. The walk scripts (`scripts/walk_r1.mjs` … `walk_r3.mjs`) call no API. There were no page errors and no 5xx.
* Not walked: a headed pass, and the shared demo :4400 (none runs in this container).
* The earlier walk on df52c9fc6 (`../2026-11-09-c617/walk-screens.md`: open at a later stage, Start next stage, C7.8's stage-scoping, C6.2 and C7.1 on stage 2) is not repeated here. #1477 changes only the documents: `case-checklist.ts` (+3), `form-setup.ts`, `300-reviewed-release-documents.ts`, `samples/fee-table.json`, the pack and the browser suite. This walk covers what QA-375 asked for and goes on to the next capability's first step.

## Data, through the product's screens
* As the author (user-A): **Demo › Load the configured checkpoint… › Load the configured checkpoint**. The toast reads "Configured checkpoint loaded in 116.2 s" (`walk/00`).
* No case was set up by script.

## QA-375: Start next stage adds the new stage's document lines (C6.17 BR-6; pack items 5 and 9)
1. As the case officer: **Open a case** on "Outside Canada · release 1", reference QA-C617-DOCS, principal "Sample Client D", Client B.
   * The **Documents** panel now has the study permit's own lines: "Sample Client D · Principal applicant · 0 of 3 received". The lines are Fee payment receipt, Letter of acceptance and Passport information page copy, each "Not requested · Always needed for this application · Source · No file yet" (`walk/R01`).
   * Before #1477 the panel read "Not worked out for this combination" (`../2026-11-09-c617/walk/A03`).
2. **C6.4's upload on stage 1:** the passport line's "…" menu offers "Request · Upload a file… · Not applicable… · History". After Upload a file… and picking `sample-passport-qa.pdf`, the line reads "**Received** … File: sample-passport-qa.pdf · Last change 10 Nov, 05:03 by Case officer (Sample)" (`walk/R02`).
3. **Start next stage: Work permit** (`walk/R03`).
   * The dialog now reads "**2 documents on the checklist:** Passport or travel document information page photocopy; Proof of fee payment (processing fee and other applicable fees receipt)". It no longer says "not worked out yet".
   * The rest is unchanged: "5 forms: IMM 5409, IMM 5475, IMM 5476, IMM 5707, IMM 5710" (QA-372 still), and "Deadline · Can't set: Study permit valid until is missing" (QA-370 still).
   * With UCI 23456789, valid until 2027-04-30 and a reason, the toast reads: "Work permit with an LMIA (inside Canada) started. 0 answers about Sample Client D used; 18 questions about this application asked again; 88 new questions; 5 forms added; **2 documents on the checklist**; deadline 30 Apr 2027 (Sample)." (`walk/R04`).
4. **The work stage's own fresh lines** (`walk/R05`, `R07`):
   * The panel reads "Sample Client D · Principal applicant · **0 of 2 received**".
   * "Passport or travel document information page photocopy · For each applicant · Not requested · Always needed for this application · Source · No file yet · **On file from Study permit, uploaded 10 Nov 2026: check it for this application.**"
   * "Proof of fee payment … · For the principal applicant · Not requested · … · No file yet".
5. **The ended stage's panel** (`walk/R10`): "Kept as it was when the next stage started: read only. Key details · UCI (also the client's answer) 23456789 entered by the case officer · Study permit valid until 30 Apr 2027 entered by the case officer … **Its own documents · Sample Client D: sample-passport-qa.pdf uploaded 10 Nov 2026**". Close is its only control.

## The next capability's first step on the new stage: C6.4 on the work stage's line
6. The passport line with "On file …: check it" has the "…" menu with "Request · Upload a file… · Not applicable… · History" (`walk/R08`).
   * The officer uploads this application's copy, `sample-passport-work.pdf`. The line reads "**Received** … File: sample-passport-work.pdf · Last change 10 Nov, 05:04 by Case officer (Sample)", and the panel reads "**1 of 2 received**" (`walk/R09`).
   * **It still says "On file from Study permit, uploaded 10 Nov 2026: check it for this application."** That is #1477's review minor m2, unlogged until now: **QA-382** (UX · Minor).

## Underneath (`underneath-documents.txt`)
* The study stage (ENDED_NEXT_STARTED) has 3 lines: passport_information_page_copy `received` v2, and the other two `not_requested`.
* The work stage (CURRENT) has 2 lines of its own: passport_or_travel_document_information_page_photocopy `received` v2, and proof_of_fee_payment `not_requested`.
* The documents: the study line holds `sample-passport-qa.pdf`; the work line holds `sample-passport-work.pdf`.
* `GET /checklist` gives the work stage's passport line `on_file: {from: "Study permit (outside Canada)", file_name: "sample-passport-qa.pdf", words: "On file from Study permit, uploaded 10 Nov 2026: check it for this application."}`.
* **Probes on the ended stage's line:** an upload is **409 `stage_ended`**: "This document line belongs to an earlier stage of the case, which has ended: it is kept as it was and can no longer be changed. Nothing was changed." Not applicable gives the same 409. Nothing was added to the ended stage.

## Replay at 400 and 1024 px, twice each (`replay-400-1024.txt`)
* Open a case with Earlier stages, the Start next stage dialog (opened, then Cancel), the ended stage's panel, and the work stage's Documents panel with its "On file" line.
* **axe (WCAG 2.2 A/AA) is clean in every state at both widths, both passes.** There is no sideways page scroll.
* Cancel leaves stage 1 current, all 4 times. The 400 px contrast flag of 9 Nov did not appear.
* QA-373 (Cancel cut off at 400 px) still fails its check: x = -24.9 px.

## Open findings re-checked on this main (`check_qa3NN-output.txt`)
QA-370, QA-371, QA-372, QA-373 and QA-374 each still fail their check (1/2, exit 1). QA-382 is new (1/2).
