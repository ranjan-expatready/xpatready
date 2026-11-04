# Review: C8.2 Record the submission (runtime lane, M3-F), PR #924

**Reviewed commit 7100f9de** (branch `claude/wonderful-einstein-i01w4m`, base 341d6d00, diff `git diff 341d6d00..7100f9de`). The reviewer did not build this. Date: 4 Nov. The head moved to 2fef037b during the review, and that commit was not reviewed. Slice 1's review (22f3f2ab) used to be in this file and is kept in git history (23b6c15c).
**Verdict: Block** (skill scale: Ship after fixes). 2 Major, 7 Minor, no Blocker. Journey score **8/10** (pass, no 0).

## Runs (own copy `rev_c82` on :4439; never :4400; live AI off; US$0)
* I ran the files from 7100f9de, extracted to the scratchpad. The shared working tree had another agent's uncommitted edits to both checks while I worked. The server code was unchanged.
* `check_c82_record_api.ts` **40/40**, exit 0. `check_c82_record_browser.ts` **31/31**, exit 0 (axe clean on 7 states, 1440/1024 px, keyboard). `acceptance/C8.2.test.ts`: -1 passes, then -2 crashes on the missing C7.6 routes, as expected on main.
* `m3-guard.sh 341d6d00..7100f9de`: M3-only, no M2-hot file changed. This holds with the given title and with the PR's real title. `studio/contracts/submission-record.ts` is a new file, which is allowed.
* `graph.mjs` (scratch copy): G1 0 · G2 0. The new routes are tested. G6 lists `features/submission-record.ts`, the same false positive as the other auto-loaded features.
* `api.log`: 0 errors and 0 application numbers or UCIs.
* My own probes (scratch scripts):
  * **Race:** 12 parallel records gave one 200 and eleven 409s, 2 rows, 1 audit line. 6 parallel corrections gave one 200 and five 409s, 1 correction row.
  * **Access:** client 403 (record, correct, Prepare). Another firm 404. Configuration person 403. No actor 401. `/activity` shows no number to anyone.
  * **Layout:** at 400 px and at 200 % zoom of 1024 and 1440 there is no sideways scroll. Both dialogs open by keyboard, and focus returns to the opener on Esc.
  * **Delete:** deleting a recorded case works. The `submission_group` RESTRICT key does not block cascades.

## Findings (ranked)
**M1 Major: the read-only lock does not cover the case's derivation, so a recorded group still changes shape.**
* *Child added after recording.* I recorded a family group, then added a child with `POST /runtime/cases/:id/people` (201). The child's new filing joined the recorded group: `["submitted","submitted","NOT_STARTED"]`. The panel says "Recorded · read-only" and hides the button (`web/src/runtime/submission.tsx:55,63`, `recorded = fs.some(...)`). The record route answers 409 "already recorded" because any record in the group counts (`api/src/submission.ts:75`), and split is refused (`case-prepare.ts` `refuseIfRecorded` on the group). The child's filing can never be recorded or split out.
* *Spouse marked not travelling after recording.* `PATCH /runtime/cases/:id/people/:S {applies:false}` answered 200 (`api/src/runtime.ts:222`, no lock). The sync then set the spouse's recorded filing to `active=false` (DB `f|SUBMITTED`). Its record, with its IRCC number, disappeared from the Prepare view and the panel. Only the principal's filing still shows.
* *Fix:* under the case's row lock, keep a recorded filing active and in its group when the case is derived again, and put a new person's filing in a new group. Or refuse these changes while the person's filing is recorded. Add a fail test for each.

**M2 Major: "Correct a number" lets two filings of one submission share a number, with no refusal and no warning.**
* The record route refuses this (`submission.ts:64`), but `correct()` checks only the pattern and the "same as now" case (`:116-118`).
* Probe: I corrected the principal's number to the spouse's number. The answer was 200 and both `filing_record` rows read `V420000001`.
* Slice 1's cross-case duplicate warning (AG-7-95 r4) is not returned on a correction either.
* This misses EXPERIENCE [M] 8 ("duplicate check before save"). The correction is the only way to change a number after recording, so the record route's own rule stops holding.
* *Fix:* refuse a number held by another filing of the same group (400 on `application_number`), return `duplicateWarning` for other cases, and add a test.

**Minors (fix, or list them in the PR):**
* m1 **"Not after today" accepts tomorrow for most of a Canadian working day.** The latest date allowed is today in UTC+14 (`engine/runtime/submission-record.ts:9`). At 11:39 UTC on 4 Nov (06:39 in Toronto) the server accepted `2026-11-05` (200). The UI's `max` is not enforced either, because `submit()` skips native validation (`submission.tsx:116,136`). Fix: send the browser's local today with the request (checked within ±1 day of the server's date), or use the firm's time zone.
* m2 **Readiness and the filed facts are read before the lock.**
  * The view (`submission.ts:53`) and the answers (`:82-83`) are read outside the transaction. Answer writes do not take the case lock, and `storedVersion` covers neither answers nor status. The only guard under the lock is `updateMany status=READY_TO_FILE` (`:92`).
  * Once #861 lands, a fact that changes inside that window gets a no-longer-ready filing recorded. Its `filed_facts` would also hold the new value, so it is never marked "Filed with an earlier value".
  * Fix: read the view again after the write and roll back if it is not ready, as #861's `ready()` does with `again`. Or build the facts and readiness inside the transaction.
* m3 **An unconfirmed edit opens permanent tasks.** The facts compared are confirmed facts only (`formCoverage`). An officer's draft edit (status DECLARED) therefore counts as a change and opens 5 tasks for one name. No task ever closes (no Done action, which is the builder's listed follow-up). The panel can only grow. Decide whether a task waits for the new value to be confirmed.
* m4 **Reviewed by is the representative at recording time, not the reviewer** (build decision 2). Once #861 lands, a representative changed between review and recording gives a wrong "Reviewed by". A solo firm shows "Name · Name", not BR-21's "Self-reviewed". This is a follow-up after #861; say so in the PR.
* m5 **Toasts repeat the field errors and cover the dialog's "Record the submission" button at 1024 px** (screenshot `03-refused-on-the-field-1024.png`). The error on the field is enough. Drop the toast for field errors, or move the toasts clear of the dialog footer.
* m6 **The PR's first line does not say the acceptance test changed.** `M3-CONTRACT.md` asks for that line; the test change itself is fair (see below). Also, 409 refusals carry `type .../problems/validation` (`submission.ts:30`). Use a conflict type.
* m7 **A probable 500 under many parallel reads, fixed after the reviewed commit.** The builder's later commit 2fef037b says the Prepare view's record read (`recordedOverlay`, `db.$transaction([...])` on every read) gave one 500 in 120 parallel reads at 7100f9de. I did not reproduce or review the fix.

## Judged against the ask
* **The acceptance test -12 change is a fair premise fix.** `person.family_name` is `collected_from: verified_document`, so the client's write was a 403 and the line tested nothing. The officer is the release's own path, and the expected rule (out_of_date "earlier value" plus a task) is unchanged. Note: the officer's entry is DECLARED, so -12 now passes because the fact is no longer confirmed, not because a confirmed value changed. BR-12 covers both.
* **Stays correct once #861 lands (read, not run).** `git merge-tree 7100f9de origin/claude/loving-ride-hhtdgi` merges with no conflicts. In the merged `case-prepare.ts`, #861's reset of a stale Ready to file and its `f.status` from the stored status (lines 268-277) run before `recordedOverlay` (283). The overlay reads the stored status after the reset, so a reset filing never shows ready, and SUBMITTED reads `submitted` in both places. #861's own routes already refuse a SUBMITTED filing (its `readiness.ts:34`). Migration order: #861's `20261104120000` sorts before this PR's `20261104150000`; `migrate deploy` applies it on a fresh copy, but I did not run the merged tree.
* **Migration:** additive (4 tables, triggers, a partial unique index, a rollback written out). One record per filing (unique `filing_id`). Corrections and UCIs are append-only.
* **Audit:** summaries name no number or UCI (probe and `api.log`). The correction's `detail` keeps before and after, as slice 1 does, and `/activity` shows none of it.
* **Sources:** the number pattern is labelled Sample (`samples/filing-numbers.json`), and the UI hint says "(Sample pattern)". Legal points carry "Unconfirmed: no counsel".
* **Lock coverage:** channel, split, "Entered" and slice 1's number route answer 409 under the lock (tested). Not locking C8.1 signing is consistent with BR-12's own "Re-sign it". The gap is M1.

## D1–D20 (1–5)
D1 4 BR-11/12/15 behave, except M1 · D2 2 M1, M2 · D3 4 reuses slice 1's rule and `formCoverage` · D4 4 n/a mostly; coverage reused · D5 3 race safe, but a recorded group can be stranded (M1) · D6 4 who/when/why kept on corrections · D7 n/a no AI · D8 4 panel on the case page (C7.7 tab later) · D9 4 disabled button says why in words · D10 4 plain words, no ids on the main path · D11 4 Recorded · read-only, toasts (m5) · D12 4 team look, quiet · D13 4 axe clean, 400 px and 200 % zoom, keyboard, focus return · D14 4 team controls · D15 3 not timed against §9; m7 · D16 4 each rule has a pass and a fail test; M1/M2 untested · D17 simulated only · D18 4 Prepared by · Reviewed by, portal, Sample label · D19 3 needs #861 for the real path · D20 simulated only.

## Journey test (reviewer role; one score for this check)
Journeys walked as the case officer, scripted in Playwright plus probes: (1) record a ready family group; (2) refused on its field (missing number, future date); (3) not ready (button disabled, reason in words); (4) correct a number with and without a reason; (5) a fact changes after filing (tasks); (6) client and other firm by URL (403/404); (7) double submit and parallel saves; (8) a person added or marked not travelling after filing (M1).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | record and correct work end to end (31/31) |
| Next step obvious | 1 | "Opens once every filing is Ready to file: …" |
| Plain words | 1 | no ids; "Filed with an earlier value: …" |
| Feedback and state | ½ | clear pill; toasts duplicate errors and hide the button (m5) |
| Correct data | ½ | M2 duplicate number; M1 record vanishes |
| Error recovery | ½ | field errors good; a child's filing stuck with no way out (M1) |
| Accessibility and screen sizes | 1 | axe 0; 400/1024/200 % no scroll; keyboard; focus return |
| Speed | ½ | not timed against §9; m7 |
| Visual quality | 1 | screenshots 03, 07 |
| Trust and sources | 1 | Sample pattern, Unconfirmed: no counsel, Prepared · Reviewed |
| **Total** | **8/10** | pass |

**Could not check:** the merged #861 + #924 tree running (it would rebuild the shared Prisma client); a real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); commit 2fef037b.

**Verdict: Block.** To fix on this PR, each with a fail test: **M1** (keep a recorded group's filings and membership fixed when the case is derived again or people change) and **M2** (refuse a duplicate number inside the group on Correct a number, and warn across cases). Fix m1–m7 or list them in the PR.

## Re-review (round 2) of 75c0a1a2
**Superseded by round 3 below; do not label on 75c0a1a2.** This round missed the breaker's R2-B1: UCI lines reached another firm's activity feed, with the full UCIs in `detail`. My probes checked audit summaries and application numbers only. It also missed R2-M1 (the race between recording and "not travelling") and R2-M2 (an answer left unconfirmed at filing read as changed). Round 2 was a diff-only review of `git diff 7100f9de..75c0a1a2` (2fef037b + 75c0a1a2). No Blocker or Major is open. The later head 60095003 changes only the 8 C7.5 screenshots, back to main's bytes (the branch diff against base now has no C7.5 file). I checked that and nothing else in it.

**Runs** (fresh `rev_c82` on :4439, the edited migration applied; US$0):
* `check_c82_record_api` 51/51.
* `check_c82_record_browser` 33/33, twice. I ran it from the tree, then put the C8.2 screenshots back to the committed bytes.
* `acceptance/C8.2.test.ts` on this branch alone: -1 passes. -2 needs C7.6, and the steps after it fail with it. I did not run the merged tree. The builder's 12/12 on a local merge with #861 is their evidence, not mine.
* `git merge-tree 75c0a1a2 origin/claude/loving-ride-hhtdgi` merges with no conflicts. `m3-guard` with the PR's real title: M3-only.
* `api.log`: no 500s, and no number or UCI.
* My probes:
  * **M1 fixed.** After recording, adding a person answers 409 and marking the spouse not travelling answers 409. Both are checked under the case row lock (`api/src/runtime.ts:206,232-237`, `refuseIfCaseRecorded`). The group stays `[submitted, submitted]`. The only two writes to case people are now covered (I searched for other `caseParticipant` writes and found none).
  * **M2 fixed.** Correcting to the sibling's number answers 400 on `application_number`. It is checked before and again under the lock (`api/src/submission.ts:141,146`). Two filings corrected to the same number at once gave 200 and 400, and the numbers stayed distinct. A number held by another case is saved with the warning "Already on case ACC-…".
  * **m1.** A UTC "tomorrow" is refused at 12:07 UTC. The builder's choice of the UTC date is sound: it is never behind a Canadian date, and the pack's `inDays(0)` is UTC.
  * **Other probes held.**
    * Every field's problem comes back at once (4 fields in one 400).
    * 6 parallel corrections gave one 200 and five 409s. 4 parallel UCI adds gave one 200 and three 409s ("Already exists"), with 1 row and no 500.
    * A UCI for a person not on the filing gets 400. Sending both a number and a UCI gets 400. A client gets 403.
    * An after-filing change opens 5 tasks; restoring the value closes all 5 and the items read `to_do` again (fixes m3).
    * No spurious task right after recording.
    * 60 parallel Prepare reads all answered 200 (fixes m7).
    * Audit summaries carry 0 numbers or UCIs.
* **The migration was edited in place.** That is acceptable because it is not on main yet. It still only adds tables. The new triggers allow in-place change only in `application_number` and `uci`. The `shape_check` and `IS DISTINCT FROM` constraints are correct for a UCI added later with no before value.

**Still open (Minor, listed in the PR; not blocking):**
* m2' **Readiness is still read before the lock** (`submission.ts:53` vs the transaction). The builder's answer covers a stale Ready to file seen at read time. It does not cover a fact saved between the view and the lock: answer writes take no case lock, and #861 resets the status only on a read. The window is narrow (one view build). Fix in a follow-up: re-read the view after the write and roll back if it is not ready, as #861's `ready()` does.
* m4' **Reviewed by is still the representative of record**, now with "Self-reviewed" when that person also prepared it. The follow-up to read C7.6's `filing_review` once #861 lands still stands.
* n1 **A new rule beyond the contract:** a date before the case was opened is refused (`beforeCaseProblem`, with a day's grace). It does not conflict with BR-11, because Ready to file needs the case first. A future "load a filed case" path (C10.2) would have to set dates on or after the case's creation.
* n2 **`POST …/record/corrections` also takes `{uci:{subject, uci}, reason}`.** The contract names `application_number`, and adding a UCI field is fine (the breaker's M3). The tech lead may want the M3-CONTRACT row to name it.
* n3 **Fixed since round 1:** m5 (no toast over the dialog; the field error shows, screenshot 03 at 1024 px) and m6 (409s are `problems/conflict`; the PR's first line now names the -12 premise change).

**Journey score (round 2): 9/10.** Correct data and error recovery rise to 1. Speed stays ½: the 60 reads are fine, but the screen was not timed against §9.

**Could not check:** the merged #861 tree running myself; a screen reader; an intended user's walk (D17, D20).

Round 2 verdict on 75c0a1a2, withdrawn: Approve. R2-B1 was open, so it should have been Block.

## Re-review (round 3) of d40fdab6
**Verdict: Approve** for d40fdab6 (the diff `7100f9de..d40fdab6`; new since round 2: 60095003 and d40fdab6). No Blocker or Major is open.

**Runs** (fresh `rev_c82` on :4439; US$0):
* `check_c82_record_api` 54/54. `check_c82_record_browser` 33/33. I put the C8.2 screenshots back to the committed bytes afterwards.
* `acceptance/C8.2.test.ts` on this branch alone: -1 passes, and -2 still needs C7.6.
* `git merge-tree d40fdab6 origin/claude/loving-ride-hhtdgi` merges with no conflicts.
* `m3-guard` with the PR's title: M3-only. The branch diff against base has no C7.5 file (60095003 put them back).
* `api.log`: no 500s, and no number or UCI.

**Breaker's round 2, re-tried:**
* **R2-B1 fixed.** I recorded a UCI, corrected one and added one. user-S (the other firm) then sees 0 of the case's lines and 0 UCIs in `/activity`. The case's own firm and configuration people see "…'s UCI on a recorded filing (reason given)" with no value. 0 audit rows hold a UCI in `summary` or `detail` (`api/src/submission.ts:186-189`: entity `person`, `detail {field, subject}`).
* **R2-M1 fixed.**
  * The record now re-checks the case's people under the row lock (`submission.ts:112,117`), and "not travelling" checks for a record under the same lock (`runtime.ts:232-237`).
  * Probe: I sent the record and "not travelling" at once on 6 fresh cases. Every run had exactly one winner: people 200, record 409 or 400, 0 records. Never both.
  * I could not force the record to win the race. By the code, the people change would then find the record under the lock and answer 409.
* **R2-M2 fixed.** Filed values are now read as `currentValues` (`submission.ts:108`). I recorded with an answer left unconfirmed: right after recording there were 0 tasks and the forms read `to_do`. A real change after that still opens 5 tasks and marks the forms `out_of_date`.

**Round 1 and 2 fixes, still holding:**
* Adding a person after recording: 409. Correcting to the sibling's number: 400. A UCI with a newline: 400.
* Tomorrow's date: 400. A date 30 days before the case was opened: 200 (R2-m3, a case taken over).
* 60 parallel Prepare reads: all 200.

**Still open (Minor, listed in the PR):**
* m2': readiness and filed values are read before the lock, and answer writes take no case lock.
* m4': Reviewed by should come from C7.6's `filing_review` once #861 is on main.
* n2: the tech lead may want the contract row to name the `uci` form of a correction.
* Outside this PR (the coordinator's note, not re-checked by me): C8.1's sign-step and signed-scan audit lines reach other firms' feeds on main (`studio.ts` CASE_ENTITIES, an M2-hot file). That is for the tech lead.

**Process note:** another agent's uncommitted edits (the round-3 fixes) appeared in the shared tree at 12:07 UTC, during my round 2. Every run was on a server started before them or on a fresh copy of the named commit.

**Journey score (round 3): 9/10** (speed ½, not timed against §9). **Could not check:** the merged #861 tree running myself; a screen reader; an intended user's walk (D17, D20).

**Verdict: Approve** (d40fdab6).
**The Approve stands for head ae84c347.** `git diff --stat d40fdab6..ae84c347` changes only this review.md (records only, no code), so the verdict for d40fdab6 carries over.
