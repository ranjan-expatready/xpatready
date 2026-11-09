# B139 · C6.17 A multi-stage case: break report

Breaker, fresh context. Commit `b2091b750` (branch `claude/exciting-mccarthy-up4u21-b139`, draft PR #1262). Isolated copy `brk139` on :4445 (`isolated.sh brk139 4445 start --ttl 90`), demo reset, then Load sample "configured" (98 s). AI off, US$0. Scope: concept §2/§3/§6 "What gets built" only. Nothing fixed. The acceptance pack `acceptance/C6.17.test.ts` was also run on this copy: 24/24 pass, including C6.17-12, the B145 move after a start.

Caveat: another session worked in this same checkout during the run. HEAD moved to `499868bc2` at 04:58 UTC (its diff only touches `routes.json` and ASSUMPTIONS), and uncommitted edits to `case-stages.ts`, `submission-record.ts`, `fill-case.ts`, `stages.tsx` and `C6.17.test.ts` began around 05:00. The API process had started at 04:47 on `b2091b750` code. Every finding below was reproduced against that process. The 24/24 pack run (04:58–05:00) may have read a newer test file.

Result: **0 Blocker, 5 Major, 6 Minor.**

## Major

**M1. The ended stage's form items can still be changed through the item routes. The trigger does not cover `filing_item`.**
Steps: open case S on `sp.outside`, run Prepare, start the next stage. Then call `PATCH /api/runtime/items/6a4a945e…/channel` as user-O with `{"channel":"PAPER","reason":"client prefers paper","version":"<current prepare version>"}`. That item is the ended stage's IMM 1294.
Expected: 409 `stage_ended` (BR-5: the ended stage is read-only history).
Actual: 200 `{"changed":true}`. In the database the item now has `channel=PAPER`, `channel_reason` set and `version=2`. Its sign steps are superseded, and an audit line says "changed how IMM 1294 is filed … from PDF upload to Paper".
Cause: `case-prepare.ts:725-746` loads the item by id and never checks its stage. `migration.sql:168-172` guards only five tables. `filing_item`, `sign_step`, `entered_section`, `filing_person_record` and `readiness_pass` are left open.
`GET /runtime/items/:id` also returns the ended item (200).
Same class, reachable now: `POST /filings/<ended filing>/record/corrections {"uci":{…},"reason":"added later"}` returns 200 and writes a `filing_person_record` on the ended stage. The number correction on the same filing gets 409 (inconsistent).
Not reached: sign steps and `screens/:key/entered`. They have the same lookup and are held today only by other checks (no copy, line not Online).

**M2. After the start, the new stage's Prepare raises a CRITICAL warning about the ended stage's form copy (BR-7: copies "never cross").**
Steps: on case R (study stage), generate IMM 5476 with `POST …/forms/IMM%205476/<principal>/generate` (202). Start the next stage, then call `GET /runtime/cases/R/prepare`.
Actual: the work-permit filing's readiness contains `"CRITICAL: IMM 5476 for Client A: its copy for filing is older than today's facts … Generate a new copy …"` with key `…|stale|b2bb3ce8…`. That id is the study-permit copy.
Cause: B162's raw query `case-prepare.ts:559` reads every GENERATED copy of the case, on any release, without a stage or pin filter.
If the facts had matched, the study permit's copy would count as the work permit's copy for filing.
The pack's leak check (C6.17-9) searches only for filing ids, so it misses this.

**M3. Once the first stage is recorded as submitted, the next stage can never add a person or change who is travelling.**
Recording the first stage is the normal path the Ended ⓘ tip describes. To simulate it, on fresh case X (`sp.outside`, prepared) I inserted one `filing_record` for its stage-1 filing, then started the next stage (201, no reason asked).
Steps: `POST /runtime/cases/X/people {"role":"spouse_or_partner","displayName":"Spouse B"}`.
Actual: 409 "This application is recorded as submitted to IRCC, so its people are not changed: nobody is added. A new applicant goes on a new case."
Control: the same call on case S, whose first stage has no record, gives 201.
Cause: `refuseIfCaseRecorded` (`submission-record.ts:33-35`) counts `filing_record` by case, not by current stage. It is called at `runtime.ts:344` (add a person) and `runtime.ts:373` (travelling). BR-9 lists `submission-record.ts:80,91` but not this helper.

**M4. Changing the UCI on a done-before stage always fails.**
Steps: open W on `wp.lmia_inside` with `earlier:[{stage:"study",done_before:true,key_details:{"person.uci":"11112222",…}}]`. Then call `PUT /runtime/cases/W/stages/<done-before>/key-details {"stage_version":1,"key_details":{"person.uci":"33334444"}}`.
Expected: 200, with the UCI answer superseded.
Actual: 409 "This already exists, or someone else saved the same thing at the same moment. Reload…". This happens every time, and also with only the UCI sent.
Control: a date-only change gives 200.
Cause: `case-stages.ts:231-232` inserts the new answer before superseding the old one, which breaks `uq_answer_current` (subject, key) WHERE superseded_by_id IS NULL. The same happens whenever the client has already answered their UCI. The screen's "Edit key details" then shows the misleading "someone else saved" text.

**M5. An answer typed during the start is saved on the ended stage's application and is lost from the new stage (BR-10).**
Steps: on a fresh study case, start the next stage while sending 41 `PUT …/answers/<application subject>/case.*` calls with jittered timing (race3).
Actual, run 2: two answers (`case.pal_number` at .884 and `case.school_address` at .880) were stored on the old application subject with `effective_at` later than the `started_stage` audit (.861). So they were written after the start had committed. Both returned 200 to the officer. The new stage still asks both questions, and the ended stage's history changed.
Cause: `putAnswer` (`runtime.ts:451`) resolves the subject through `reach` with no case lock and no stage re-check at write time.

## Minor

* **m1.** A UCI entered in the Start dialog is not written as the client's answer (Q3 / F13 (c): the same at every stage). Case S was started with `person.uci=87654321`. The value is stored on the ended stage, the principal has no `person.uci` answer, and the work-permit questionnaire asks UCI again (`answer: null`). Only opening (`runtime.ts:222-229`) and `PUT key-details` write it, not `start` (`case-stages.ts:186-188`).
* **m2.** A stage left unticked (NOT_RECORDED) can never be recorded later. `PUT key-details` on it returns 409 "…an ended stage is kept as it was" (wrong words: it never ran), and the panel offers no Edit. The deadline then reads "Can't set: Study permit valid until is missing" for good (case BRK-NR1). Opening on the work permit with no `earlier` also gives NOT_RECORDED.
* **m3.** Focus is lost to `<body>` after Escape or Cancel on the Start dialog, and after Escape on the stage panel, at both 1024 px and 200 %. `stages.tsx:80,148` call `returnFocus` only after a successful start; StagePanel passes no `returnFocus`.
* **m4.** Locking or validating an ended stage's form copy has no stage check (`fill-case.ts:341-345` `copyFor`). `POST /form-copies/<study IMM 5476>/lock {"kind":"filed"}` was refused only because the copy is "out of date (1 change)" against the work permit's release, which is fact drift, not a stage rule.
* **m5.** Dates like `0001-01-01` and `9999-12-31` are accepted as "Study permit valid until" (201) and drive the Sample deadline. `isDate` (`stages.ts:91`) has no plausible range.
* **m6.** `ended_at` is taken before the transaction waits for the lock (`case-stages.ts:170,188`). In the race runs, rows made just before the commit carry a later timestamp than `ended_at`. The panel's "documents uploaded before it ended" filter (`case-stages.ts:85`) can therefore drop an upload that was accepted onto the stage.

## What held
* **Roles.** On list, one stage, preview, start and key-details: user-O, user-R and user-T get 200 (or 409 by rule); user-P and user-A get 403; user-S gets 404; an unknown actor gets 401; no header gets 401.
* **Ids.** A stage id of another case gives 404 on GET and PUT; a malformed id gives 404.
* **Forged or stale starts.** A forged or stale `stage_version`, or `from_stage` set to the next stage, gives 409 `stale`. Replaying a start gives 409. On the last stage the preview is refused and the start gives 409. PUT key-details on CURRENT or ENDED gives 409, and with a stale version gives 409.
* **Opening input.**
  * 400 on the field, nothing created (counts unchanged): impossible date `2027-02-30`, `2027-13-01`, unknown key detail, earlier stage that is not earlier (`work` on the work permit; `study` on the study permit), duplicate stage, key details on an unticked stage, non-string value, `earlier:null`, 11 entries.
  * UCI checks: RLO, zero-width space, Arabic-Indic digits and 10,000 characters are refused by the release's own check or the 80-character limit.
  * Reason: whitespace-only or zero-width characters give 400.
  * Null values are accepted as "not given".
* **Retired next combination** (simulated with `retired_at`, then restored): the strip shows "Cannot start yet" and why, the button is hidden, the preview is refused, the start gives 409 `cannot_start` with nothing changed, and opening on it gives 409.
* **The ended stage's rows.** These all give 409 `stage_ended`: finding acknowledge and dismiss, `PUT filings/:id/application-number`, number correction, and direct SQL `UPDATE filing`. Answers to the old application subject (officer and client) give 404. The readiness routes give 409 (`now()`).
* **Races.** Two starts at once give 201 and 409 (5 of 5). Start racing Prepare, checklist, review, findings and Fill gives 200, 202 or 409. No finding, filing, group or line was written on the ended stage after it ended, and no Fill copy was written on the study release after the commit (`newestPin` under `FOR UPDATE`). The C9.5 move racing a start gives start 201 and move 409 "changed while you read the list" (4 of 4). Afterwards every reader returns 200 and the pins are sp r1 and wp r1 (on WP release 2).
* **Readers after the start.** Case, assessments, checklist, checks, filing-changes, filing-record, filings, findings, forms, proposals, questionnaire (agent and client), release-update, team and stages/next show no ended filing, group, finding, item, copy or application subject. The exception is prepare (M2).
* **Demo reset** with 47 stages present gives 201 and leaves 0 stages, routes, cases and subjects. A reload and the pack then pass.
* **Budgets.** On sample data: stages 35 ms, preview 60–100 ms, openable 90–110 ms, start 91 ms.
* **Layout.** At 1024 px and at 200 % (512 CSS px) there is no horizontal scroll. Start next is reachable by Tab. Focus moves into the dialog, and Confirm is reachable by Tab.

Not exercised: hostile uploads and the planted-instruction PDF (this screen takes no upload, and AI is off); "On file from" (the checkpoint has no derived checklist for these combinations, build note D1); 100 programs / 400 combinations (the team's scale work, STANDARDS §9).
