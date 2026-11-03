# C8.1 break report: signed PDFs (PR #617, head aeeab13e)

Run on an isolated copy (port 4436, database xr_studio_brk617, worktree at aeeab13e), now stopped, dropped and removed. The Visitor visa setup and the C8.1 acceptance test were run first. The acceptance test gave 13/14: C8.1-13 fails because nothing sets a filing to READY_TO_FILE yet (C7.6 is held under P-251), so "Uploaded to IRCC" was reached only by setting the status in SQL. This PR has no screen, so reload/back, keyboard, 1024 px and 200 % zoom do not apply. There is no concept.md for C8.1, so scope is the PR's claims. Code refs are under `prototype/studio/`.

## Findings

### Major
**M1. Print accepts a copy that is already out of date.**
- Steps: generate IMM 5476 for a person (copy A), then change a fact that person's form reads (`person.family_name` as the case officer, 200), then generate copy B. `GET /runtime/form-copies/A` says `out_of_date:true`. `POST /runtime/items/:id/sign-steps/print {copy:A}`, then `signed`, then upload a scan.
- Happened: print 200, signed 200, scan 201. The person signs paper that no longer matches the facts, and the item shows Ready.
- Expected: refuse a copy flagged out_of_date or one that has a newer generated copy, in words, so only the current copy is printed.
- Where: `api/src/sign-steps.ts:70-72`. It checks case, person, form and `status === "GENERATED"` only.

### Minor
**m1. A form that is not signed by hand can take sign steps and a scan.**
- Steps: on the same case, IMM 5257 (signature TYPED_NAME, PDF upload) and IMM 5707 (ONLINE, TYPED_NAME). Generate a copy, then `print`, `signed`, and `POST signed-scan` with a PDF.
- Happened: all 200/201. The scan is stored and audited as "signed". The prepare view ignores them (state stays `to_do`), so the record and the view disagree.
- Expected: 409/422 "IMM 5257 is not signed by hand and scanned". `item()` checks only `kind === "form"` and `active` (`sign-steps.ts:38-39`). The signature channel is checked only in `case-prepare.ts:205`.

**m2. The "Ready" and "Done" states are never checked against the stored scan.**
- Steps: with a scanned item, change `signed_scan.sha256` by SQL (as a superuser, with `session_replication_role=replica`), overwrite one scan file on disk with `TAMPERED <html>` and delete another, then `GET /prepare` and `GET /items/:id`.
- Happened: both items stay `ready`. The `GET` returns the changed sha256 unchanged. Nothing recomputes the hash.
- Expected: the migration comment says the file is "checked by its sha256 before it is read", but nothing reads it, so the check does not exist yet. Ready means only that a database row exists. Whoever builds the read or C7.6 must verify first. Not a Blocker because there is no download route.

**m3. A "PDF" is judged by 5 bytes.**
- Steps: upload `%PDF-1.4\n<html><script>alert(1)</script></html>` named `<img src=x>.pdf` to a signed item.
- Happened: 201, `application/pdf`, stored. The name is cleaned to `img src=x.pdf`.
- Expected: this matches the stated "judged by its bytes" and C6.4. A polyglot or HTML with a PDF header passes, and since the scan is single-use (`scan_received` is done once), a wrong file cannot be replaced without SQL. No code reads the scan bytes, so no planted text in a PDF is ever read as instructions. Judge this when a reader is built.

**m4. The 413 words are wrong for this route.**
- Steps: upload two files, or file plus another field; upload 20 MB + 1 byte and 60 MB.
- Happened: 413 "Add at most 20 files at a time. Nothing was added." and 413 "A file is larger than 25 MB … up to 25 MB each".
- Expected: "Send one file" and "larger than 20 MB". The route allows one file and 20 MB (`MAX_DOCUMENT_MB`, `sign-steps.ts:122`). The shared upload error mapper's numbers show instead. Nothing is stored in either case.

**m5. An id of 36 dashes gets a wrong 404 word.**
- Steps: `GET /runtime/items/------------------------------------`, and `print` with `copy` of 36 dashes.
- Happened: 404 "Not found (it may have been removed by a reset)." from a mapped Prisma error. `/^[0-9a-f-]{36}$/i` lets it through (`sign-steps.ts:38, 70`).
- Expected: "No such item." or a 400. Harmless, no 500.

**m6. The app's database role can bypass the append-only trigger.**
- Steps: `set session_replication_role=replica; update signed_scan set sha256='z'`. `xr_studio` is a superuser (`rolsuper=t`).
- Happened: the update succeeded on 3 rows. Without that setting, UPDATE is refused, including the upsert path. `DELETE` and `TRUNCATE` are allowed by design.
- Notes: after a delete of the scan row, the `scan_received` step stays done, so the item stays Ready with no scan. `sign_step` has no protection; a SQL insert of `uploaded_to_ircc` with no scan and no Ready filing works. API-only enforcement of order is by design here, but it is not in the database.

## Not findings, noted for later
- Superseded steps (`superseded_at`, C9.2) are reachable only by SQL. If `signed` is superseded while `scan_received` is current, the item shows Ready and `GET` shows steps 1, 0, 1, 0 (out of order). If only `print` is superseded, the item still shows Ready. `signedState` reads only `scan_received` and `uploaded_to_ircc`. Re-doing a superseded `signed` then worked (200).
- Changing a fact after print, signed, scan, or even after Done, leaves the item Ready/Done. The migration names C9.2 for this.
- "Ready to file" is a stored string: `item.filing.status === "READY_TO_FILE"`, read before the insert. Nothing sets it yet. I set it by SQL, and then `uploaded_to_ircc` 200 and the item went Done. It was not rechecked.
- A firm officer who is not on the case team (user-T) can read the case and item. `reach()` checks the firm only. This is existing behaviour on every case route.
- A client probing a random item id gets 403 for a real item and 404 for a missing one, so existence can be told apart. Ids are random uuids.

## What held
- **Roles:**
  - Client: GET, print, signed and scan all 403 "Only the case officer".
  - Author, content reviewer and approver: 403 "works on configuration".
  - Another firm (user-S): 404. A missing, unknown or empty actor: 401.
  - A representative who is a case user (user-R): 200.
- **Ids:** a non-uuid, an all-zero uuid, a missing id, a document item or a step item gave 404/422, never 500. Step keys `bogus`, `../x`, `constructor`, `__proto__` and `toString` all gave 404, and `scan_received` through sign-steps gave 409.
- **Order:** signed before print, scan before signed, and uploaded_to_ircc before the scan or before Ready to file all gave 409 in words, with "Nothing was stored." on the scan route.
- **Repeats and races:**
  - Three concurrent prints gave 1 row (200, then two "already done"); three concurrent signed gave the same.
  - Four concurrent scans on one item gave 1 row and 1 file on disk, and the three losers gave 409 "just done by someone else". The files of refused scans are removed.
  - A second scan on a done item gave 409.
- **Print gate:** another person's copy, another form's copy, another case's copy, a garbage copy, a number, an array and a missing body all gave 409. Upper-case uuids are accepted for the right copy.
- **Scan type:**
  - An empty file gave 400. Text, a 4-byte `%PDF`, a zip or exe header, and SVG named `.png` gave 422.
  - A wrong field name, no file, a non-multipart body and a JSON body gave 400.
  - A 20 MB file was accepted (about 0.7 s). 20 MB + 1 and 60 MB gave 413.
- **File names:**
  - `../../etc/passwd` is stored as `passwd`. Files are stored by row id, never by name.
  - A Cyrillic or Chinese name is kept. A right-to-left override character is stripped. A 300-character name is cut to 200.
- **Database:**
  - UPDATE and upsert on `signed_scan` are refused by the trigger. A second current `print` row is refused by the unique index. A `print` row with no copy is refused by the check constraint.
  - Deleting a whole case (rolled back) works; `ON DELETE RESTRICT` on the copy did not block it. Deleting a printed copy is refused.
- **Other:** every step and scan writes an audit row. The prepare view's Ready and Done states follow the steps for HAND_SCANNED items. No endpoint reads scan bytes, and there is no AI call (US$0).
