# Review: C6.4 storage slice (runtime lane, M3-C) at cbd2676578844dea6f1a9b293cf50ff16af52d0a

Reviewer: an independent agent that did not build this. Branch `claude/charming-albattani-jhkk4s`, diff `origin/main...cbd26765`.
Ran on my own isolated copy `rev64` on :4425 (db `xr_studio_rev64`), never :4400. US$0, no `*_LIVE` set.

## What I ran
* `tests/check_c64_storage_api.ts 4425 xr_studio_rev64`: 35/35 pass.
* `acceptance/C6.4.test.ts 4425 xr_studio_rev64`: 16/16 pass (C6.4-12..18 included).
* `tests/check_engine.ts`: 41/41 pass.
* My own probes (scratch script, not committed): 6 checklist GETs at once on a new case, 8 uploads at once on one line, Not applicable and upload at once, uploads of 20 MB + 10 bytes and of exactly 20 MB, upload by a configuration person and by another firm's officer, received to Not applicable, and render() from `origin/main` against render() at this commit on the released Visitor visa (no answers, all yes/no deciders answered no, all answered yes).

## What holds (checked)
* Permissions: request and Not applicable are officer-only (client 403, configuration person 403); upload is the officer or the case's own client (another client 404, another firm's officer 404 (BR-20), configuration person 403). Unknown, malformed or derived ids give 404. The checklist GET is still officer-only.
* Concurrency: the 6 GETs at once all gave 200 and wrote 5 rows, no duplicates (`createMany skipDuplicates` plus the unique index). The 8 uploads at once gave one 201 and seven 409s, with 1 document row, 1 current and 1 file on disk, so the version guard holds and the `rmSync` in the catch removes the refused files. Not applicable and upload at once gave one 409 and one 201, and the state is consistent. `answer_subject` is 1:1 with a case participant, so the person-owned partial unique index cannot be raced across cases.
* Files: the type is read from the bytes; the stored name is the row id (the cleaned display name never reaches the path); the sha256 is checked on read (`bytesOf`).
* State machine: requesting twice in a row is one request with one audit line; a received line cannot be requested (409); a Not applicable line refuses uploads (409) and can be requested again, which clears the reason. The SQL check refuses Not applicable without a reason.
* Kept lines: the derived list merges lines by person and document type (`engine/runtime/case-checklist.ts:171`), so a kept line cannot appear twice. A line that is kept is not required and says why. A line nobody acted on goes away and gives 409 when acted on. When a line comes back it keeps its id.
* Migration: additive only. The checks and partial index are correct. The rollback drops the tables in FK order.
* QA-149: the child's "travelling alone" stays asked after yes and can be set back to no. With no answers, render() gives the same output as main.

## Findings

**Major 1: upload size and count errors state another route's limits, and a 20 MB file is refused.**
`api/src/case-checklist.ts:172` sets multer `fileSize: MAX_DOCUMENT_BYTES, files: 1`. Multer refuses first, and the global filter `api/src/main.ts:174-181` rewrites every 413 into the intake's words. This route has no case there, unlike `/form-copies/.../validated` at :177. So the route's own message at `case-checklist.ts:132` cannot be reached.
Failure scenarios, both reproduced:
* A client uploads a 21 MB passport scan and reads "A file is larger than 25 MB. Nothing was added; add files up to 25 MB each." They shrink it to 22 MB and are refused again.
* Two files at once are refused with "Add at most 20 files at a time." when the route takes one.
* A file of exactly 20 MB (20,971,520 bytes), which the contract allows ("up to 20 MB", `contracts/documents.ts:23`), is refused with 413.

The check accepts any 4xx for two files (`tests/check_c64_storage_api.ts:77`) and has no case for a file that is too large or exactly at the limit. That breaks "every rule has a pass and a fail" and STANDARDS §51 (upload size checked) / §40 (correct Problem Details).
Fix: give `checklist-lines/:id/documents` its own wording in the filter, as for validated copies. Set the multer limit one byte above the limit, or keep the stated limit and test it. Add fail cases for the size and the count that assert the words, and a pass case at exactly 20 MB.

**Major 2: QA-149 changes the shared Studio preview count "Deciding questions", and the engine change has no engine-level test.**
`engine/render.ts:239-244` (`keepAnswered`) adds answered facts to `deciders`. `deciders.size` is still exported as `summary.deciding_questions` (`render.ts:352`), and the configuration preview shows it as "Deciding questions · answers that change what applies" in warn colour (`web/src/pages/preview.tsx:55`).
Failure scenario: on the released Visitor visa, a content publisher answers all 16 yes/no deciding questions on the preview. On main the stat drops from 26 to 10, matching the 10 unanswered. At this commit it stays at 26 (warn), while the list just below (`preview.tsx:75`, filtered to unanswered) says 10, so the screen disagrees with itself. The exported `deciders` list now also contains answered facts, and a calculated field when it is in `known`, because `readsOf` keeps the field itself as well as its inputs. Other counts I compared are unchanged: questions to ask and answered, questions in total, documents needed, forms applying.
STANDARDS §47 [M] asks for engine tests when the engine changes. `tests/check_engine.ts` has none for this change: QA-149 is covered only through the API check.
Fix: count only deciders that are not yet known in `summary.deciding_questions` and `deciders`, or keep the answered ones in a separate set used only for `pushQ`. Add a `check_engine.ts` case: an answered decider is still a question, and the count of deciding questions excludes it. It should fail when `keepAnswered` is removed, and pass when the count is fixed.

**Minor 1:** the 409 messages at `case-checklist.ts:112` and `:143` say "the newer state is shown", but the Problem body has no line state or version. STANDARDS §27 asks for a 409 "with what changed". Return the current line, or drop the promise from the words.
**Minor 2:** a Not applicable line keeps `required: true` (`case-checklist.ts:75`; reproduced: state `not_applicable`, `required: true`). A consumer counting missing required documents would still count a line the officer set aside.
**Minor 3:** two officers request the same Not requested line at the same moment: the second gets 409 instead of the idempotent 200 that a sequential repeat gives (`:109` checks the state read before the guarded update). Re-read on a version miss and return 200 when the line is already Requested.
**Minor 4:** the audit lines (`:113`, `:150`) are written outside the state change. If the audit write fails, the state has changed with no audit line. Upload is already in a transaction, so the audit line could go inside it.
**Minor 5:** the rollback note (`migration.sql:11-12`) does not say to delete the `_prisma_migrations` row for `20261102140000_c64_document_storage`. Earlier migrations do (`20261023200000_forms_channels_checks`). Without it, `prisma migrate deploy` would not re-apply the migration after a rollback.
**Minor 6 (test gaps, behaviour verified by hand):** no automated fail cases for an upload by a configuration person or by another firm's officer, for the version guard (concurrent uploads or state changes), or for no file being left behind after a refused transaction. Add them so the rules fail when removed. The check has no `.catch(() => undefined)` after a wait; the setup `try/catch` at `:20-21` is followed by an explicit `hasLetter()` assert.
**Note (no change asked):** `UPLOAD_FROM` (`contracts/documents.ts:14`) lets the case's client upload over an Approved line, which moves it back to Received. This looks intended (a new passport); the Approved, Being checked and Rejected states have no routes yet (C6.5, C8.1).

## Journey score (reviewer role; the one score for this check)
API-only journeys, because this slice has no screen (journey-test steps 2, 3 and the browser checks cannot apply). They were run as the case officer, the case's client, another client, another firm's officer and a configuration person. The journeys were: request, upload, replace, Not applicable, request again, a line kept after the answers change, a line removed by the answers then acted on, and the break-it probes above.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | All journeys complete; 35/35 and 16/16 pass |
| Next step obvious | 1 | Refusals say what to do ("request it again before uploading") |
| Plain words | ½ | 413 states 25 MB and 20 files (Major 1) |
| Feedback and state | ½ | 409 promises a newer state it does not return; Not applicable still `required` |
| Correct data | 1 | One row per line under race; one current document; audit lines present |
| Error recovery | ½ | Retrying at the stated 25 MB limit fails; exactly 20 MB refused |
| Accessibility and screen sizes | ½ | No screen to test (not applicable to this slice) |
| Speed | 1 | Checklist GET 29-51 ms on the sample case |
| Visual quality | ½ | No screen (not applicable) |
| Trust and sources | 1 | Sample labelled; stand-in SI-14 shown; checksum checked |

**7.5 / 10.** Below the bar of 8. The two Majors are the fixes that would most raise the score: plain words, error recovery, and feedback once the 409 returns the line. No separate journey-test report file was written: the caller limited writes to this file.

## Could not check
A browser journey (there is no screen yet). The behaviour of Approved, Being checked and Rejected (no routes). Real storage (SI-14 stand-in). A real rollback run.

**Verdict: Block.** Fix Major 1 and Major 2, each with a fail test. Fix the Minors or list them in the PR.

## Round 2: delta review at 2aeb1608982fdb7bcbed2e3a083588a19dd336bf
Diff: `git diff cbd26765..2aeb1608`. Run on a fresh isolated copy `rev64` on :4425 (`xr_studio_rev64`), started from 2aeb1608. US$0.

**Checks:**
* `check_c64_storage_api.ts`: 45/45.
* `acceptance/C6.4.test.ts`: 16/16.
* `check_engine.ts`: 43/43.
* I re-ran my round-1 probes and a main-vs-head engine comparison.

**Major 1: fixed.**
* `main.ts:179-181` now gives this route its own 413 words. Probes:
  * 20 MB + 10 bytes: 413, "The file is larger than 20 MB. Nothing was stored."
  * Two files: 413, "Send one file at a time. Nothing was stored."
  * Exactly 20 MB: 201 Received (multer limit at `MAX + 1`, `case-checklist.ts:202`).
* The new fail tests check the words (including "not 25 MB"), and there is a pass test at exactly 20 MB.

**Major 2: fixed.**
* Answered facts go into a separate `answeredDeciders` map (`render.ts:241-250`). They are asked (`pushQ`) but not counted.
* Calculated fields are dropped from `readsOf`.
* Released Visitor visa, main against head, with no answers / all 16 yes/no answered no / all answered yes: deciding_questions, unanswered deciding, to ask, answered, questions, documents needed and forms applying are now identical. The preview stat drops 26 to 10, as on main.
* `check_engine.ts:117-121` adds a pass test and a fail test. The fail test checks count 1 before and 0 after, and would fail if answered facts went back into `deciders`.

**Minors from round 1:**
1. Fixed: the 409 words now say "read the checklist again".
2. Fixed: a Not applicable line has `required: false` (probe: received to Not applicable gives `required: false`).
3. Fixed: six identical requests at once all give 200 (tested). The re-read on a version miss is at `case-checklist.ts:140-142`.
4. Accepted: the audit lines stay outside the transaction, as elsewhere in the runtime lane. I do not disagree for this slice. It remains a known gap for the audit trail as a whole, not a finding for this PR.
5. Fixed: the rollback note deletes the `_prisma_migrations` row.
6. Fixed: tests now cover upload by a configuration person (403) and another firm's officer (404), a stale version (409, nothing stored), and files on disk equal to document rows after refused uploads.

**Breaker fixes, checked:**
* Kept lines for a person marked not travelling (`case-checklist.ts:96-103`): tested, and still actionable.
* UTF-8 file names and removal of the right-to-left control: tested with a Cyrillic/Chinese name and U+202E.
* Optional `version` on all three routes: 409 when stale. The guard holds under races (8 uploads at once: one 201; Not applicable and upload at once: one 200, one 409, no file left).
* Uppercase ids: 200.
* Zero-width-only reason: 400.

**New findings (Minor, none blocking):**
* **m-R2-1:** `SeenVersion` (`contracts/documents.ts`) uses `z.coerce.number`, so `{"version": ""}` and `{"version": null}` (and an empty multipart field) become 0. They are refused with 409 "changed after you opened it" although nothing changed. Treat empty or null as absent, or refuse it with 400.
* **m-R2-2:** `{"version": -1}` gives zod's default "Too small: expected number to be >=0" instead of plain words. Give `.min(0, ...)` its own message.

**Journey score (round 2, API-only as in round 1):**
* Task 1, next step 1, plain words 1, feedback and state 1, correct data 1, error recovery 1, speed 1, trust and sources 1.
* Accessibility and screen sizes ½ and visual quality ½: there is no screen, so they do not apply.
* **9 / 10.** Passes, with no criterion at 0.

**Verdict: Approve** (for 2aeb1608982fdb7bcbed2e3a083588a19dd336bf). No open Blocker or Major. List m-R2-1 and m-R2-2 in the PR, or fix them in the area's Minor PR.

## Round 3: delta review at 4370cb9d9dcc8ed6082249c58e9e46928bf6d5ed
Diff: `git diff 2aeb1608..4370cb9d`; 7904aa77 in between holds only the round-2 notes. Run on a fresh isolated copy `rev64` on :4425, started from 4370cb9d. US$0.

**Checks:**
* `check_c64_storage_api.ts`: 48/48.
* `acceptance/C6.4.test.ts`: 16/16.
* `check_engine.ts`: 43/43.
* The round-1 probes all still hold:
  * 6 GETs at once: 5 rows.
  * 8 uploads at once: one 201, 1 row, 1 file.
  * 21 MB: 413 in the route's words.
  * Exactly 20 MB: 201.
  * Configuration person: 403; another firm's officer: 404.
  * Not applicable and upload at once: one 200, one 409, no file.

**The four changes:**
1. **Version before the "already Requested" shortcut** (`case-checklist.ts:132-134`). The race-path return is limited to `seen === undefined` (`:142`). Correct. Tested: a stale version on an already-requested line gets 409. In my probe, four requests at once with the same version gave one 200 and three 409s, with one audit line.
2. **Write inside the clean-up** (`:170-172`). A failed mkdir or write now reaches `rmSync`. Correct. A disk-full case cannot be tested here.
3. **`CaseActorGuard`** (`:198-210`). Nest runs guards before interceptors. Probes:
   * A configuration person sending 22 MB: 403, not 413, so the file was not read first.
   * No `x-actor`, or an unknown one: 401 "Choose a simulated person first", from `actorOf`.
   * The case's own client and officer still pass, and `Runtime.reach` still checks the case.
4. **`SeenVersion`** (`contracts/documents.ts:22-26`). Probes:
   * JSON `""` and `null`: 200 (tested).
   * Multipart `version=` (empty): 201.
   * `-1` and `1.5`: 400 "a whole number from 0" (tested for -1).
   * A padded `" 1 "` is read as 1, and was correctly 409 here because the line was already at version 2.

**New finding, Minor (not blocking): m-R3-1.** A double click that sends the version seen gets a 409 on the second request, not an idempotent 200. This follows from change 1: it is the deliberate choice to honour a supplied version.
* The 409 detail says "(it is Requested now)", so the person is not misled.
* The screen lane should either not send `version` on Request, or treat this 409 with the state Requested as success.
* No change asked in this PR. Record it for the case-view screen.

**Journey score (round 3, API-only):** unchanged at **9 / 10**. It passes, with no criterion at 0. Accessibility and visual quality are ½ only because there is no screen.

**Verdict: Approve** (for 4370cb9d9dcc8ed6082249c58e9e46928bf6d5ed). No open Blocker or Major. m-R3-1 goes to the PR's Minor list or the screen lane's notes.

## Round 4: merge of origin/main at acb6663f42605a9ade3227d2c0eea3539cb0556f
The parents are 64c15bdf (this branch) and 2c6cb092 (main with #358 C7.3 and the C6.9 eligibility work). Since then main has one more commit (bae3db4b, a suite quarantine), which touches no schema or engine file. Run on a fresh isolated copy `rev64` on :4425, started from acb6663f. US$0.

1. **The schema union only adds lines.** `git diff 2c6cb092..acb6663f -- prisma/schema.prisma` has 59 additions and no removed line:
   * `checklistLines` on Case, next to main's `enteredSections` and `assessments`;
   * `checklistLines` and `documents` on AnswerSubject;
   * the ChecklistLine and CaseDocument models.

   The C6.4 model block (CaseDocument's restored closing brace included) is identical, line for line, to the one on 4370cb9d. Main's C6.9 models follow it unchanged.
2. **Migration order is right.** `20261102040000_c73_entered_section` < `20261102120000_c69_eligibility` < `20261102140000_c64_document_storage`. On the fresh copy all three are finished in `_prisma_migrations` in that order, with no rollback. C6.4's migration only creates its own two tables, with FKs to `runtime_case` and `answer_subject`, so it does not depend on the C6.9 or C7.3 tables.
3. **Main does not conflict with this PR's code.**
   * Against main's parent, the merge changes only this branch's files: `case-checklist.ts`, `main.ts` (the 413 branch), `contracts/documents.ts`, `render.ts`, the migration, the schema and the tests. All are byte-identical to 4370cb9d, which I reviewed in round 3.
   * Main's new `case-prepare.ts` calls the engine's derived `caseChecklist` (not touched here) and `render()`. Its forms and documents do not change with QA-149: the round-2 comparison showed every count identical to main.
   * Main's C7.3 answer sheet reads the case view's sections. Those may now include an answered deciding question, which is the intended QA-149 behaviour.
   * Checks on this copy:
     * `check_c64_storage_api`: 48/48.
     * `acceptance/C6.4`: 16/16.
     * `check_engine`: 43/43.
     * `check_vv_prepare_api`: 30/30, including the C6.12 24/24, C11.6 14/14 and C7.3 13/13 acceptance runs. It counts 30 here, not the builder's 32, because the copy already had the Visitor visa from the C6.4 check, so its two setup lines are skipped.
   * I did not re-run `check_c69_gates`, `check_vv_checklist(_api)` or `check_vv_answer_sheet`. The builder reports them green on fresh copies, and none of them reads `checklist_line`, `case_document` or the changed routes.

No new findings. The journey score is unchanged at **9 / 10**.

**Verdict: Approve** (for acb6663f42605a9ade3227d2c0eea3539cb0556f). No open Blocker or Major.

## Round 5: second merge of origin/main at c6c32f3c6d420f96a6216f209eeeb3125294a791
* **This PR's files are unchanged by the merge.** `git diff acb6663f..c6c32f3c` leaves `case-checklist.ts`, `contracts/documents.ts`, the schema, the migration and the C6.4 check byte-identical.
* **`render.ts` gains a type only.** Main's change there is the optional `nothing_recorded` field on `BoxRow`, so `keepAnswered`, `answeredDeciders` and the counts are untouched.
* **No interaction from main's C7.2 change.** Its `markNothingRecorded` (`engine/runtime/forms.ts`) marks a box only when none of its facts has an answer. The answered deciding questions that QA-149 keeps on the case therefore cannot trigger it.
* **Nothing else in main uses the changed code.** No other file calls `keepAnswered`, the new checklist routes or `CaseChecklists`, apart from its feature module.
* **The `qa/built/C6.4.md` resolution is right.** Main deleted the file once qa had scored the derived checklist (P-221: qa deletes a record it re-scores). This PR finishes new work, so the file is added back with only the storage-slice paragraph.
* **Checks:** `check_engine` 43/43, run by me. For the API suites I rely on the builder's green runs on c6c32f3c; the code they test is unchanged since round 4.

**Verdict: Approve** (for c6c32f3c6d420f96a6216f209eeeb3125294a791). No open Blocker or Major, and no new findings.
