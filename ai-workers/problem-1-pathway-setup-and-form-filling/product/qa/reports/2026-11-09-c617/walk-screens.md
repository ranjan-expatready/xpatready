# Gate A walk of C6.17 (a multi-stage case), main df52c9fc6, 9 Nov 2026, 21:33–21:42 UTC

Setup: Playwright with the image's Chrome (channel "chrome", as `acceptance/lib/browser.ts`), headless, **1440 px**, deviceScaleFactor 2. Fresh isolated copy `qa_c617w` on :4472, started with `--ttl 150` and stopped by qa at the end. Every step below is a Playwright click or keystroke on what the page shows. The walk scripts (`scripts/walk_c617_*.mjs`) call no API, and none of them saw a page error or a 5xx response.

Not walked: a headed pass, and the shared demo :4400 (no demo runs in this cloud container). Quotes are the page's text as the scripts printed it.

## Data, through the product's screens
* As the author (user-A), at 1440 px: **Demo › Load the configured checkpoint… › Load the configured checkpoint**. The toast read "Configured checkpoint loaded in 109.3 s" (`walk/00`; `scripts/walk_c617_load.mjs`).
* No case setup by script: every case and answer below was made on screen.

## A. Open a case at a later stage (BR-3; P-412 F13 (c)), as the case officer (user-O)
1. **Cases › Open a case**, Combination "With an LMIA – inside Canada · release 1". The dialog grows a section "Earlier stages · Sample route" that reads: "Work permit with an LMIA (inside Canada) is a later stage of "Study, then work (Sample route, not a recommended one)". Record what was done before your firm took the case. Nothing is filed for these stages."
   * It has a tick, "Study permit (outside Canada) · Done before we started", and two fields:
     * "UCI (optional) · Also saved as the client's answer, entered by you";
     * "Study permit valid until (optional) · Kept on this stage's record".
   * Filled: ticked, UCI "AB-12", valid until 2027-02-03, reference QA-C617-LATER, principal "Sample Client L" (`walk/A01`).
2. **Open case** with UCI "AB-12" is refused on the field: "UCI: Use digits only (0 to 9), no letters, spaces or signs." Nothing opens (`walk/A02`).
3. With UCI 12345678 the case opens: "QA-C617-LATER · Open · Release 3". Its **Stages** section reads "Study, then work (Sample route, not a recommended one) · Sample route · Study permit (outside Canada) · Done before we started · Work permit with an LMIA (inside Canada) · Current · Apply for the work permit by 3 Feb 2027 · Sample" (`walk/A03`, `walk/A04`).
4. Clicking the done-before stage opens its panel: "Made before the firm took the case: nothing is filed here. Key details · UCI (also the client's answer) 12345678 entered by the case officer · Study permit valid until 3 Feb 2027 entered by the case officer · Sample key details: not cited from canada.ca." It offers Close and Edit key details (`walk/A05`).
5. The current stage's panel reads "Key details · UCI (also the client's answer) **Not recorded** · Work permit valid until Not recorded · Deadline · Apply for the work permit by 3 Feb 2027 · Sample · Filings · Sample Client L's filing not started, no filing record" (`walk/A06`). **QA-371.**

## B. Start next stage, and the stage-scoping of C7.8's added forms (#1262's fix)
1. **Open a case** on "Outside Canada · release 1": QA-C617-STAGES, "Sample Client S", Client B. The strip shows "Start next stage: Work permit · Study permit (outside Canada) · Current · Work permit with an LMIA (inside Canada) · Not started" (`walk/B01`).
2. **C7.8 on stage 1:** "+ Add a form to Sample Client S's filing" opens the panel. Searching "IMM" lists 18 forms. IMM 1294, 5409, 5475, 5476, 5646 and 5707 are refused "on_release", IMM 1344 is refused "barcode_blank", and IMM 5710 (a form of the **next** stage's release) is offered "Blank official PDF".
   * IMM 0008 DEP was picked and added (`walk/B02`). The row "IMM 0008 DEP for Sample Client S · Blank official PDF · Completed copy to upload · Added by the case officer · Remove from this filing · Download the blank PDF", with the toast "IMM 0008 DEP added to Sample Client S's filing." (`walk/B03`).
   * IMM 5710 was then added the same way (`scripts/walk_c617_b2.mjs`).
3. **Start next stage: Work permit** opens the dialog (`walk/B04`): "Starting it ends the Study permit (outside Canada) stage: its filings stay as they are and can no longer be changed. It starts on Release 3 (the newest release of Work permit with an LMIA (inside Canada), now)." It continues:
   * "Who comes along: Sample Client S";
   * "0 answers about the people used (not copied) · 18 questions about this application asked again · 88 new questions";
   * "5 forms: IMM 5409, IMM 5475, IMM 5476, IMM 5707, IMM 5710";
   * "2 documents its release asks for (the per-person checklist is not worked out yet for this combination, so no checklist line is made)";
   * "Deadline · Can't set: Study permit valid until is missing (Sample rule). Sample", then the key-detail fields;
   * "No filing record: Sample Client S's study permit has no filing record. Say why you are starting the next stage anyway", then "This cannot be undone."
4. Pressing **Start Work permit with an LMIA (inside Canada)** with no reason keeps the dialog open, and on the field: "Sample Client S's study permit has no filing record. Say why you are starting the next stage anyway (at least 3 characters)." (`walk/B05`).
5. With a reason typed, the stage starts. The strip reads "Study permit (outside Canada) · Ended — next stage started · Work permit with an LMIA (inside Canada) · Current · Can't set: Study permit valid until is missing (Sample rule). Sample" (`walk/B06`).
6. **Stage 2's Prepare application** lists only "IMM 5476 for Sample Client S" and "IMM 5710 for Sample Client S". In those rows "Added by the case officer" appears 0 times and "IMM 0008 DEP" 0 times on the whole page. IMM 5710 appears once, as the release's own form with its own counts ("Declared or confirmed answers for 0 of 169 form fields"), not as stage 1's addition (`walk/B07`).
7. **The ended stage's panel:** "Kept as it was when the next stage started: read only. Key details … Filings · Sample Client S's filing not started, no filing record · Its own documents · No document uploaded on this stage's lines before it ended." Its only control is Close (`walk/B08`). It does not list the stage's added forms (concept m2 names filings, key details and documents only; noted, not a finding).
8. **Underneath** (`underneath-stage-scoping.txt`, `probes-stage-scoping.txt`):
   * both additions stay live on the ended study stage's filing, and none is on the work stage's filing;
   * stage 2's `/prepare` lists IMM 5409, 5475, 5476, 5707 and 5710;
   * removing the ended stage's IMM 0008 DEP, and adding IMM 5406 to its filing, are each **409 `stage_ended`**: "This filing belongs to an earlier stage of the case, which has ended: its forms are kept as they were and can no longer be changed." (title "Changed since you read it"; see Noted);
   * the ended addition's blank PDF is still **200, application/pdf, 448,821 bytes, `%PDF-1.7`**;
   * a direct `update … set removed_at` is refused by the database: "case_stage_ended: this filing's stage has ended; its items and records are kept as they were";
   * on stage 2's add list, IMM 0008 DEP is offered fresh (`why_not` null, `same_as` null), and IMM 5710 is refused only as "part of this application's forms".

## C. What carries, then the next capability's first step on the new stage (C6.2, C7.1)
1. **Open a case** on Outside Canada: QA-C617-CARRY, "Sample Client C", Client B.
2. **Client B on stage 1** (user-Q):
   * In the application's "Personal details" part ("Answered once for the whole application"), Client B picked English, uses a representative: Yes, and release of information: No, then pressed Save and come back later (`walk/C01`).
   * In "Personal details" for Sample Client C, Client B entered family name "Sample", given names "Client C", Single and F Female, then saved (`walk/C02`).
3. **The officer presses Start next stage** and types the ending stage's key details: UCI 87654321 and valid until 05/31/2027. The dialog reads "**4 answers about the people used (not copied)** · 18 questions about this application asked again · 74 new questions · 4 forms: IMM 5475, IMM 5476, IMM 5707, IMM 5710". **With the date on screen, the Deadline line still reads "Can't set: Study permit valid until is missing (Sample rule)."** (`walk/C03`). **QA-370.** The officer typed a reason and started the stage. The strip then reads "Work permit with an LMIA (inside Canada) · Current · Apply for the work permit by 31 May 2027 · Sample" (`walk/C04`).
4. **Next capability's first step, C6.2, Client B on the work permit's questionnaire:**
   * "0 of 16 parts done" (`walk/C05`).
   * The person part shows the answers read where they are: family name "Sample", given names "Client C", marital status single, F Female checked, and UCI "87654321", the one typed into the start dialog (`walk/C06`).
   * The application's own part is asked again. "Uses a representative" is preset to Yes, which is not a stored answer: underneath, the stage-2 application subject had no answer before this step. "Authorizes IRCC and the CBSA to release information" is empty (`walk/C07`).
   * Client B answered No and saved.
5. **Next capability's first step, C7.1, the officer on stage 2:**
   * The current stage's panel reads "Deadline · Apply for the work permit by 31 May 2027 · Sample", "UCI (also the client's answer) Not recorded" (QA-371 again), and "Work permit valid until Not recorded" (`walk/C08`).
   * The ended stage's panel reads "UCI (also the client's answer) 87654321 entered by the case officer · Study permit valid until 31 May 2027 entered by the case officer" (`walk/C09`).
   * **Generate a copy** on "IMM 5710 for Sample Client C": "Generated · Copy of 9 Nov, 21:40 · 5 form fields written · read back and checked · Download". The card reads "Declared or confirmed answers for 5 of 169 form fields" (`walk/C10`).
6. **Underneath** (`underneath-carry.txt`):
   * The study stage's application subject holds the release-to-designated-individual answer (false) and service language (English).
   * The work stage's application subject holds only the release-to-designated-individual answer (false), saved by Client B in step 4.
   * Sample Client C's person answers: one current row each. The UCI row is `stage_record` by user-O.
   * The copy: IMM 5710, GENERATED. Its release's combination is wp.lmia_inside, so it belongs to the work stage. Its result records 5 written.

## Replay at 400 and 1024 px, twice each (`replay-400-1024.txt`, `walk/R-*`)
States replayed: Open a case with Earlier stages, the Start next stage dialog (opened, then Cancel), and the ended stage's panel.
* No sideways page scroll in any state.
* **Cancel leaves stage 1 current** ("Start next stage" still offered), all 4 times.
* axe (WCAG 2.2 A/AA) is clean at 1024 px. At 400 px both passes flagged `color-contrast` on `button[data-start-confirm="true"]`.
  * It did not reproduce on four targeted re-checks: at 0 ms and after 1 s on two fresh cases, and with the button hovered and focused.
  * After the fresh reader doubted the "mid-fade" reading, a run with `reducedMotion: "reduce"` flagged it again in 1 of 2 passes, so it is not the fade. It then did not reproduce in 3 more runs of the replay's own flow (`scripts/axe400d.mjs`).
  * Its colours pass: white on rgb(8, 98, 197), about 5.9:1. Cause not found; no row.
* **The same runs measured QA-373** (found by the reader): Cancel's box starts at x = -24.9 px at 400 px (`R-400-start-next-dialog`: "ancel").

## Noted, not logged as rows
* **QA-310 (open, already names C6.17) seen again:** the Open a case list says "With an LMIA – inside Canada · release 1", while the case header and the start dialog say "Release 3" for the same release.
* The stage_ended 409's title is "Changed since you read it" (its detail is right). The PR's minor m3 notes the add panel showing it under "could not be read". Not reachable by screens: an ended stage offers no add or remove.
* QA-356 (open) also shows on stage 1: IMM 0008 DEP reads "The combination's default." under How each form is filed (`walk/B03`).
* Case QA-C617-LATER's "17 answered" at opening (`walk/A03`) comes from Client A's answers on the Sample family case (person answers read where they are, C6.19). Expected, not a finding.
