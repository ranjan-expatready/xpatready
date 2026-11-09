# B139 · C6.17 A multi-stage case: journey test (reviewer, 9 Nov 2026)

Reviewer role (journey-test skill; the one journey score for this check). Commit b2091b750 on `claude/exciting-mccarthy-up4u21-b139` (#1262). Fresh isolated copy `rev139` on :4444 (configured checkpoint: Reset as user-A, then Load `configured`, 100 s), stopped afterwards. Headless Chromium (Playwright 1243 shell) with a scripted, person-like walk using visible labels only. Screenshots `r01`–`r10` are in the reviewer's scratchpad, not committed; the builder's `walk/` set shows the same states. AI off, US$0.

## Journeys (main path first)
1. **Case officer opens a case on the later stage** ("my client already had a study permit before we took them"). Steps: Open a case, choose "With an LMIA – inside Canada", read "Earlier stages", type UCI `AB-12`, Open case, fix it to `12345678`, set the valid-until date, Open case. Expected: a field error, then a case whose strip shows the study permit "Done before we started" and the deadline (Sample).
2. **Case officer starts the next stage** ("the study permit is done, start the work permit without asking anything twice"). Steps: open a study-permit case, Start next stage (keyboard), read the dialog, press Start with no reason, add a reason, press Start. Expected: a reason error on its field, then a toast, the strip moved on and the ended stage read only.
3. **Error: bad input.** Text in the UCI gives a 400 on the field and nothing is created (J1).
4. **Error: no filing record.** No reason gives a 400 on "Reason" and nothing changes (J2).
5. **Wrong role.** Client A (user-P) opens the case URL and the questionnaire.
6. **Recovery and races.** The same start twice, two starts at once, and Prepare or the checklist racing the start (pack C6.17-10/-11, re-run here).
7. **Across the boundary.** On the new stage: the questionnaire, forms, release move and filings (pack C6.17-8/-9/-12). Also the normal path where the study permit was **recorded** before the start: then add a person and link the employer on the new stage.

## What happened
* **J1 held.** The UCI error reads "UCI: Use digits only (0 to 9), no letters, spaces or signs." on the field. The case opened in 133–216 ms. The strip reads "Study permit (outside Canada) · Done before we started → Work permit … · Current · Apply for the work permit by Feb 3, 2027 · Sample". The panel shows both key details "entered by the case officer", with the UCI "(also the client's answer)", which is true on this path (the database has it with channel `stage_record`).
* **J2 held, with two defects.** Start next stage was reached in 10 Tab presses and opens with focus inside the dialog. The preview loads in 98 ms and says everything BR-4 lists, plus "This cannot be undone". The reason error is on the field. The start took 386 ms. Defect (a): focus then lands on `<body>`, because the opener button is gone once there is no next stage. Defect (b): the toast says "5 forms and 2 documents added", but the same page's Documents panel says "Not worked out for this combination … Nothing is guessed" (r07). The ended panel is read only: filing "no filing record", no documents "before it ended".
* **J5 held.** The client gets "This page is for the case officer", and there is no strip on the questionnaire. On the API: client 403, configuration 403, other firm 404 (pack C6.17-6).
* **J6 held.** The pack re-ran **24/24** on my copy: double start 201/409, nothing written for the ended stage after it ended, and the database refuses an update to the ended filing.
* **J7 broke on the recorded path (reproduced by API + SQL).** I opened a study-permit case, ran Prepare, and inserted one `filing_record` for its filing (standing in for C8.2's record). The preview then shows no unrecorded filing. The start went through without a reason (correct), and the case is now on `wp.lmia_inside`. But `POST /runtime/cases/:id/people` (spouse) → **409** "This application is recorded as submitted to IRCC, so its people are not changed". Control: with that one record row deleted, the same call → **201**. The guard counts records by case (`submission-record.ts:34`, called at `runtime.ts:344,373`), and the employer link does the same (`employer-link.ts:86`; this firm has no Sample employer case, so that one is shown by code only).
* **J7, second defect.** A UCI typed in the Start dialog (`person.uci` = 12345678) is kept on the ended stage's record, but the principal has **no** `person.uci` answer afterwards. The panel still labels it "(also the client's answer)".

## Automated checks
axe (WCAG 2.2 A/AA):
* Open-a-case dialog with earlier stages: 0.
* Done-before panel, ended panel, Start dialog: 0 each.
* **Case page with the strip: 2**: `nested-interactive` (the info button inside the stage chip button, `stages.tsx:67-70`) and `target-size` (the 14 px info button, `stages.tsx:25`).

No sideways scroll at 1024, 720 (200 % of 1440) or 400 px. The only console errors were the two expected 400s from the bad-UCI step. The engine test re-ran 31/31. I did not re-run the migration test (17/17) or C9.5 (49/49); I read the migration test's assertions instead.

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and J2 done by screens only; pack 24/24 |
| Next step obvious | 1 | one primary "Start next stage: Work permit" on the strip; "Cannot start yet" not linked |
| Plain words | 1 | statuses, ⓘ texts and dialog copy as concept §5 |
| Feedback and state | ½ | toast says "2 documents added" while the page says none are worked out; focus lost after the start |
| Correct data | ½ | recorded stage 1 blocks add person/travelling/employer link on stage 2; UCI from the Start dialog not written as the answer |
| Error recovery | 1 | field errors (UCI, date, reason), stale 409 "read again", refused preview with "Nothing was changed" |
| Accessibility and screen sizes | ½ | 2 axe violations on the strip; focus to body; sizes fine |
| Speed | 1 | preview 98 ms, start 386 ms, open 133–216 ms |
| Visual quality | 1 | team components, one strip, chips aligned (r02, r07, builder 02/05/07) |
| Trust and sources | ½ | Sample on route, deadline and key details everywhere; but "(also the client's answer)" is false on the start path and "added" overstates D1 |
| **Total** | **7.5 / 10** | **Below the pass mark (8); no criterion at 0** |

**Fixes that raise the low criteria, most valuable first:**
1. Scope the recorded-case refusals to the current stage.
2. Write the same-at-every-stage key detail as the answer on the start too.
3. Say "asks for", not "added", for documents with no derived checklist.
4. Move the ⓘ out of the chip button, give it a 24 px target, and return focus to the strip after the start.

**Could not test:** a real screen reader, true browser zoom (I used a viewport-width stand-in), and an intended user's unaided walk (D17/D20 stay with the founder). I also could not test the employer link with a real employer case (none in this firm's Sample data).
