# C8.2 Record the submission (PR #924): break report

**Tested:** head 7100f9de (diff 341d6d00..7100f9de) on an isolated copy, `brk_c82` on :4430 (`xr_studio_brk_c82`), seeded by `tests/check_c82_record_api.ts` (40/40 pass), then stopped. Ready to file was set with the builder's fixture (`update filing set status='READY_TO_FILE' … and active`). Actors: user-O case officer, user-R representative, user-P client, user-S solo firm, user-A/B/C configuration. No live AI, US$0.
**Scope:** what the brief lists: the two routes, the four tables, the read-only lock, the after-filing overlay and tasks, and the Submission to IRCC panel. The slice 1 report that was here is in git history (#563).
Each case below is a Visitor visa case with two adults (principal P, spouse S), every fact filled, both filings Ready to file, one family group G.

## Blockers

| # | What I did | Expected | Actual | Where |
|---|---|---|---|---|
| B1 | Recorded G (200). Then `PATCH /runtime/cases/:id/people/<S> {applies:false}` as user-O (the spouse no longer travels) | The filing is read-only once recorded (C8.2-9): refused, or the submitted filing stays on the case | 200. S's filing (SUBMITTED, V351990904) becomes `active=false` and **disappears** from the Prepare view and from the panel, with its number, date and UCI. The group then shows one filing and no sign that IRCC holds a second application. `POST /filings/<S>/record/corrections` still answers 200 on the hidden filing (body `{version}` only, no `filing`). Setting `applies:true` again brings it back. | `api/src/runtime.ts:222` (no `refuseIfRecorded`); `api/src/submission-record.ts` overlay reads only the view's active filings |

## Majors

| # | What I did | Expected | Actual | Where |
|---|---|---|---|---|
| M1 | Recorded G. Then `POST /cases/:id/people {role:"child"}` plus a date of birth, and put the child's filing in Ready to file | Either refused (the group is read-only) or the child's filing can still be recorded | The child's filing joins the **recorded** group G. `PATCH /groups/G/record` answers 409 "already recorded" (the BR-15 count covers the whole group) and the split answers 409 "read-only". The child's filing can never be recorded or split out. The panel shows "Recorded · read-only" over a "Ready to file" child with no button (screenshot taken on the copy) | `api/src/runtime.ts:175` (no lock); `api/src/submission.ts:75,90`; `api/src/case-prepare.ts` split lock |
| M2 | Recorded G (P=V336…, S=V307957901). `POST /filings/<P>/record/corrections {application_number:"V307957901", reason:"copy"}` | Refused, as the record refuses it ("Two filings of this submission have the same application number") | 200. Both filings of one submission now hold V307957901. No duplicate warning either, although the record route gives one | `api/src/submission.ts:110-131` (no `duplicateInGroup`, no `others` lookup) |
| M3 | Recorded with `ucis:[{P,"hello world"},{S,"hello world"}]` | A UCI in the pack's shape (requirements: 10 digits or NN-NNNN-NNNN), one per person, and a way to correct one | 200: both people get the same UCI "hello world". The person's own `person.uci` answer refuses "1111-1111" ("Use digits only") but the record accepts it. A wrong UCI can never be fixed: `filing_person_record` refuses UPDATE (trigger), (filing, subject) is unique, and a correction covers only `application_number` (CHECK) | `contracts/submission-record.ts:20`; migration `filing_person_record`, `filing_record_correction_field_check` |
| M4 | Recorded G. The officer re-enters the **same** family name ("SAMPLE" → "SAMPLE"), then confirms the section. Another round: change to "CHANGED", then back to "SAMPLE", then confirm | No task when the value filed is the value now | Re-entering the same value opens 5 tasks: "Filed with an earlier value: Sample Client H's family name **changed** … Re-sign it, or tell IRCC of the change". After the confirm, every form reads current again (`to_do`), but all 5 tasks stay open and the panel keeps showing "5 tasks after filing". The words tell staff to report to IRCC a change that did not happen. "Done" is not built (not a finding), but opening a false task and never withdrawing it is one | `engine/runtime/submission-record.ts:28` (unconfirmed counts as changed); `api/src/submission-record.ts:69` |

## Minors

| # | What I did | Actual | Where |
|---|---|---|---|
| m1 | With a task already open for IMM 5257 (passport number changed), I also changed the family name | The item reads "family name, passport number changed". The task still says only "passport number" (`skipDuplicates` keeps the first words) | `api/src/submission-record.ts:69` |
| m2 | user-R (the representative of record) records G | "Prepared by · Reviewed by: Representative · Representative". P-155 (1) asks for a logged "Self-reviewed", never the same person shown as a reviewer | `api/src/submission.ts` (rep lookup) |
| m3 | `submitted_on` "2026-11-05" at 11:3x UTC (06:3x in Toronto); "1990-01-01" on a case opened today | Both 200. Tomorrow is accepted for a firm in the Americas (decision 9, but C8.2-4 says not after today), and the date can be before the case existed | `engine/runtime/submission-record.ts:6` |
| m4 | Opened a recorded case in a browser set to Pacific/Kiritimati (UTC+14) | `submitted_on` 2026-11-04 reads "November 5, 2026" (Toronto: November 4) | `web/src/runtime/submission.tsx:24` (`day` has no `timeZone: "UTC"`) |
| m5 | Opened the dialog, changed a channel through the API (another session), submitted, got 409 "Reload", then Cancel → reopen → submit | 409 again, every time: on a 409 the panel never re-reads the view, the typed numbers are lost, and only a browser reload recovers. At 1024 px the 409 toast covers the dialog's "Record the submission" button | `web/src/runtime/submission.tsx:112` (invalidate only on success) |
| m6 | Submitted with both application numbers blank | Only P's field shows an error (the server stops at the first problem). Focus goes to the dialog container, not the invalid field. Typing in any field clears every error | `api/src/submission.ts:59-64`; `submission.tsx:111` |
| m7 | After a split, recorded group B with the number group A already holds | 200 with `warning: "Already on case <its own reference>."` (it names the officer's own case). The panel never shows `warning`: the duplicate warning (AG-7-95 rule 4) is lost | `api/src/submission.ts:105`; `submission.tsx` |
| m8 | `our_reference: "A­B"` (soft hyphen) | 200 and stored. The hidden-character check misses U+00AD (and U+3164, the Hangul filler) | `contracts/submission-record.ts:7` |
| m9 | Added a child after recording | Task words: "Sample Client I's **has children** changed": a yes/no fact key turned into words | `engine/runtime/submission-record.ts:37` |
| m10 | Recorded UCI 1111-1111, then read the person's `person.uci` answer (IMM 5257 and IMM 5476 read it) | The answer stays empty, so the forms and the record hold different UCIs (decision 4 is open in the PR; requirements AG16-73 make the canonical answer the single source, with the submission keeping a snapshot) | `api/src/submission.ts` (`filingPersonRecord` only) |
| m11 | SQL on the copy: `DELETE FROM filing_record_correction …` and `UPDATE filing_record SET submitted_on='2000-01-01', application_number=…` | Both succeed. Only UPDATE is blocked, and only on two tables; the record itself can be rewritten with no history (DELETE is kept for Reset, as noted) | migration (triggers) |

## What held
* **Concurrency:** two records at once gave one 200 and one 409 "already recorded" (2 records, 2 UCIs, 1 audit line). Two corrections at once gave one 200 and one 409 "Someone corrected…", with one history row. Record raced against a channel change, and against a split: the other write won and the record got 409 stale; nothing was half-written.
* **Version and BR-15:** a stale version gave 409 with "Reload". A second record gave 409, and so did a record after a correction.
* **BR-11:** not ready, and partly ready ("Sample Spouse D's filing is not started"), both gave 409 with nothing written. An inactive filing set by SQL is made active again by the view (derivation), so that state cannot be reached that way.
* **Lock:** channel, split, PUT application-number and "Entered in the portal" (IMM 5707) all gave 409 once recorded.
* **Actors:** user-S got 404 "No such case" (record, correct, prepare). user-A got 403. user-P got 403. No actor gave 401. A non-uuid or unknown group gave 404.
* **Bodies:** wrong types, 1 MB and 5 MB strings, NUL, RLO and ZWSP, an unknown or repeated filing, a third line, a case subject's UCI, a UCI listed twice, an empty UCI, a UCI of 41 characters, null lists, a missing or object version: each refused on its own field.
* **Dates:** 2025-02-29, 1989-12-31, 0000-01-01, a time suffix, fullwidth digits and a number type were refused. A split group refuses the other group's person and filing.
* **Numbers:** lowercase and hyphenated input is normalised (a duplicate is caught after normalising). Cyrillic В, fullwidth Ｖ and an embedded ZWSP were refused.
* **Audit:** no application number or UCI in any summary. The record's detail holds only filing ids and a UCI count. A configuration reader gets no `detail` for "application number" lines. user-S sees none of the other firm's lines.
* **After filing:** a form that does not read the changed fact stays current. 8 parallel reads made no duplicate tasks. A client cannot read the Prepare view, so a client read cannot open tasks.
* **UI:** Escape returns focus to "Record the submission…". The tab order follows the fields. Field errors carry `aria-invalid` and show on the right field (a spouse-only UCI error lands under the spouse's UCI). At 1024 px and 200 % zoom (512 px) the dialog fits with no sideways scroll and its footer is reachable.

Note: `product/screens/C8.2/review.md` showed as modified in the working tree during this run. I did not touch it.
