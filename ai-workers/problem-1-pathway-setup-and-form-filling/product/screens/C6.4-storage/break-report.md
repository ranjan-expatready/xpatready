# C6.4 storage slice: break report

Commit `cbd26765`. Isolated copy `brk64` on :4426, db `xr_studio_brk64` (port moved from 4439 by the coordinator). US$0, no `*_LIVE` set.
Baseline `tests/check_c64_storage_api.ts 4426 xr_studio_brk64`: 35/35 passed. The attack scripts open a fresh FAMILY Visitor visa case with
`acceptance/lib/m3.ts` (`openCase`, `call`, `answer`). Their lines are `GET /api/runtime/cases/$CASE/checklist` as `user-O`. Below, `$LINE` is a
stored line id from that list and `up(id, name, bytes, actor)` is a multipart POST to `/api/runtime/checklist-lines/$LINE/documents` with field `file`.

## Breaks

1. **Major: requested or received lines vanish when the person is marked not travelling.**
   Repro: request the spouse's passport line, upload a PDF on it (201, Received), then
   `PATCH /api/runtime/cases/$CASE/people/$SPOUSE {"applies":false}` (200), then GET checklist.
   Expected: the line stays on the spouse's list, kept, with its Received state and file, as the slice promises ("nothing asked for or
   received silently disappears").
   Actual: the spouse's `lines` is `[]`, while the DB row is still `received` and the `case_document` is still current. Request, Not applicable
   and upload on that line all answer 409 *"the answers no longer call for it"*, which is wrong: no answer changed. Cause:
   `engine/runtime/case-checklist.ts:141` drops non-applying people's lines before `stored()` (`api/src/case-checklist.ts`, `acted` filter) can keep them.

2. **Major: non-English file names are stored garbled.**
   Repro: `up($LINE, "Паспорт-护照-ü-جواز.pdf", %PDF-…)` gives 201.
   Expected: `file_name` is `Паспорт-护照-ü-جواز.pdf`.
   Actual: `ÐÐ°ÑÐ¿Ð¾ÑÑ-æ¤ç§-Ã¼-Ø¬ÙØ§Ø².pdf`. Multer reads `originalname` as latin1, and `cleanName` (`contracts/documents.ts`) does not re-decode
   it as UTF-8. Every name with an accent is corrupted in the DB for good.

3. **Major: a second session can overwrite the line with no stale check.**
   Repro: client `up($LINE, "z.pdf", PDF, user-P)` gives 201 Received. Right after it, the officer, whose screen was opened before that upload,
   sends `POST …/$LINE/not-applicable {"reason":"stale view"}`.
   Expected: 409, because the line changed since the officer read it.
   Actual: 200 `not_applicable`, and a current file stays attached to a Not applicable line. The version lock (`updateMany … version: row.version`)
   only covers the moment inside one request: no route takes the version the caller saw, so "Someone changed this line after you opened it"
   never protects across two sessions.

4. **Minor: parallel identical requests answer 409.**
   Repro: 8 parallel `POST …/$LINE/request` as user-O on a Not requested line.
   Expected: all 200. Asking for what is already asked is a no-op (`setState` early return), and the test claims "requesting twice is one request".
   Actual: `[409,409,409,409,409,200,409,409]` with "Someone changed this line…". A double-click shows a false conflict. The audit count is correct (1).

5. **Minor: the size limit refuses exactly 20 MB and the message names the wrong limits.**
   Repro: `up($LINE, "s.pdf", 20971520 bytes starting %PDF-)`.
   Expected: accepted (the limit is "20 MB", and `bytes.length > MAX_DOCUMENT_BYTES` allows equal).
   Actual: 413 *"A file is larger than 25 MB … add files up to 25 MB each."* 20971519 bytes is accepted. Two files in different fields give
   413 *"Add at most 20 files at a time"*, though this route takes 1. The global filter (`api/src/main.ts:174-181`) words every 413 with the
   intake's limits. The route's own 20 MB check (`case-checklist.ts` upload) can never fire.

6. **Minor: an uppercase line id answers a false 409.**
   Repro: `POST /api/runtime/checklist-lines/$(echo $LINE | tr a-f A-F)/request` as user-O.
   Expected: 200, or 404.
   Actual: 409 *"This document is not on Sample Client A's list now: the answers no longer call for it."* `UUID` is case-insensitive and Postgres
   finds the row, but `shown = lines.find(l => l.id === id)` compares the strings exactly.

7. **Minor: a reason made only of invisible characters is accepted.**
   Repro: `POST …/not-applicable {"reason":"\u200b\u200b"}`.
   Expected: 400 "Give a reason". Actual: 200 `not_applicable`. Neither zod `.trim()` nor SQL `btrim` removes U+200B.

8. **Minor: filenames are shown without bidi controls removed, and some are refused with the wrong words.**
   - `"a\u202Efdp.exe"` is stored with U+202E (in mojibake form today; once break 2 is fixed it displays as `aexe.pdf`). `cleanName` strips only
     C0 controls and DEL, not U+202A-202E or U+2066-2069.
   - Filenames `".."` and `"."` are refused 400 *"Send one file, in the field "file""*, though one file was sent in `file`.
   - `\u0000` in the name gives 400 "Multipart: Malformed part header", which is not the slice's wording.

9. **Minor: PDF detection checks the magic bytes only, and the kept name contradicts the type.**
   Repro: `up($LINE, "evil.html", "%PDF-<html><script>alert(1)</script></html>")`.
   Actual: 201, `media_type application/pdf`, `file_name evil.html`. This is per spec ("by bytes"), but a later download that trusts the
   name's extension would serve HTML. Recorded for C6.5, the slice that will read stored documents.

10. **Minor: the whole upload body is buffered before the role check.**
    `AnyFilesInterceptor` reads up to 20 MB into memory before `line()` refuses user-A (403) or another firm's officer (404). It is a cheap
    memory-pressure path for any simulated actor.

## Held

- **Roles.** No x-actor or an unknown one gets 401. Configuration people (A, B, C) get 403. The client and another client get 403 on request,
  Not applicable and GET. Another firm's officer (S) gets 404 everywhere. Another client gets 404 on upload. The case's client can upload.
- **Bad ids.** Malformed and nil ids get 404. A non-UUID case id on GET gets 404, not 500.
- **Parallel first GETs (12).** All 200, and exactly one row per person and document type (5/5).
- **Parallel uploads (8) on one line.** One 201 and seven 409; one current document. Disk file count equals `case_document` rows after every
  refused, raced and oversized upload (17/17 at the end).
- **Upload and Not applicable in parallel.** One wins, the other gets 409, and no orphan file is left.
- **Request and Not applicable in parallel.** One wins.
- **Hostile files.** Wrong type gets 415. Empty gets 400. A text field instead of a file gets 400. JSON, truncated and boundary-less
  multipart get 400. Path-like names reduce to their last part (`C:\Windows\..\x.pdf` becomes `x.pdf`, `/etc/passwd` becomes `passwd`). The
  stored path is `people/<subject uuid>/documents/<doc uuid>.<ext>`, so names never reach the filesystem. Names over 200 characters are cut to 200.
- **Odd reason bodies.** A number, array or object gets 400. JSON null or a bare string gets 400. 2 MB and 501 characters get 400. 500
  characters and Cyrillic, Chinese or Arabic reasons are stored correctly. Extra fields are ignored. Bad JSON gets 400.
- **State rules.** Upload on a Not applicable line gets 409. Request on a Received line gets 409. Not applicable to Requested clears the
  reason. The DB check refuses Not applicable without a reason.
- **Audit lines.** They name the type, the role and the short case id, never the reason or the file name.
- **No 500s.** `var/isolated-brk64/api.log` has no 500 and no error lines.
- **QA-149 questionnaire.** Answering the children's "travelling alone" yes or no leaves the officer's and client's questionnaires with the
  same set of questions (337 before and after), with no unanswered extras. An answer for an adult added no question and no line.
  A child marked not travelling is still asked "travelling alone" when it is unanswered; this was not shown to be caused by `keepAnswered`.

## Not tested

There is no case-deletion or person-deletion route on this commit: only `applies:false`, covered in break 1. FK cascades were read, not exercised.
