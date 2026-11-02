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
