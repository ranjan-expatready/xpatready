# B149 break report: fee receipt upload (C8.2, PR #1261, commit e9f2e6e79)

What I tried to break: `POST /api/runtime/filings/:id/record/fee-receipt`, the Record dialog's file field and the FeeReceipt block. I ran everything on an isolated copy, `brk_b149` on :4449, from `/home/user/wt-b149`. I set it up with `tests/check_c82_record_api.ts`, which ran its own setup and passed 70/70. Then I sent about 60 requests through my own scripts and drove the screen in Chromium. I stopped the copy at the end. Live AI was off and the cost was US$0. I changed no code.

**Result: no Blocker, no Major, 6 Minor.** Every permission rule I was asked to check held.

## Findings

**m1 (Minor). The error for a file that is too big, or for two files, quotes the intake's limits.**
- What I did: sent a 20 MB + 1 byte PDF as user-O. Then I sent two `file` parts in one request.
- Expected: "The file is larger than 20 MB. Nothing was stored." (the route's own words, `api/src/submission.ts:196`), and "Send one file".
- Actual: a 413 that reads "A file is larger than 25 MB. Nothing was added; add files up to 25 MB each." The two-file request gets a 413 that reads "Add at most 20 files at a time."
- Why: `api/src/main.ts:184-194` words the multer limits separately for checklist-lines and validated copies only. This route falls through to the intake wording.
- A side effect: multer itself refuses at 20 MB + 1, so the route's own size check at `submission.ts:196` is never reached.
- What the person sees: the same 25 MB text, while the dialog's hint says "up to 20 MB". It shows in the dialog's toast and under the filing's button. See screenshot 02.

**m2 (Minor). Staff of another firm can tell whether a filing id is real.**
- What I did: called the route as user-S (the solo firm) with Client C's real filing id, then a made-up UUID. Actual: 404 "No such case." for the real one, 404 "No such filing." for the made-up one.
- Why: `submission.ts:189-190` looks up the filing first and only then calls `reach`. The ids are random UUIDs, so this tells an outsider little, but the two answers should read the same.

**m3 (Minor). Keyboard focus is lost after a successful upload from the filing's button.**
- What I did: keyboard only. Focused "Upload the Transaction Approved page… for Sample Client U's filing", pressed Enter, chose a valid PDF.
- Actual: once stored, `document.activeElement` is `<body>`.
- Why: `busy` makes the button `disabled` (`web/src/components/ui/controls.tsx:36`, used at `web/src/runtime/submission.tsx:154`), so the focused element drops focus. The button is then renamed "Upload a new page…".
- A refused upload does move focus correctly, to the `role=alert` error.

**m4 (Minor). In the dialog, a chosen file is only checked after the submission is recorded, which cannot be undone.**
- What I did: in the Record dialog, I chose a text file named `.pdf` for the principal and a 21 MB PDF for the spouse, then pressed Record.
- What happened before recording: nothing on the file fields (`submission.tsx:204`). There is no type or size check and no error.
- What happened after: the record was saved (2 rows) and both receipts were refused (0 rows).
- What the person sees: one red toast, about 70 words, that opens "Submission recorded: …" and then nests both server messages in parentheses ("…(A file is larger than 25 MB. Nothing was added; …); upload it on the filing."). Red tone, success words first (`submission.tsx:179-182`). It disappears after 9 s (`web/src/lib/api.ts:61`).
- It can be recovered: afterwards each filing reads "No Transaction Approved page uploaded" and has its upload button. See screenshots 02 and 03.

**m5 (Minor). Some of the data's integrity rests only on the code.**
- What I did: in SQL on the copy, deleted the spouse's `filing_record` row. Then inserted a `fee_receipt_file` row whose `case_id` is case R1 but whose `filing_id` is Client C's filing.
- Actual, delete: the cascade removed 14 rows, but their 14 files stayed in `var/…/fee-receipts/`.
- Actual, insert: the database accepted the row. No constraint ties `case_id` to the filing's case (see the migration, line 30, and the case FK).
- No API route does either today. Reset clears both (see below).

**m6 (Minor). A `"` in a file name comes back as `%22`.**
- What I did: uploaded `a"b.pdf` through FormData, the way a browser sends it.
- Actual: it is stored and shown as `a%22b.pdf`. The multipart percent-encoding is never decoded (`utf8Name` and `cleanName`).
- Cosmetic only; the checklist (C6.4) uses the same helper.

## What held
**Who may upload:**
- Firm staff (user-O, persona `officer`, user-R, user-T): 200. Another firm (user-S): 404. Clients (user-P, user-Q, persona `client`): 403.
- Configuration people: user-A, user-B and user-C get 403 from `CaseActorGuard` before the file is read. A 25 MB body as user-A answered 403 in 116 ms, while clients and user-S got 413 for it.
- Nobody, an unknown name, or a doubled `x-actor` ("user-A, user-O") gets 401.

**Filing not yet recorded:** the officer gets 409 "Record the submission first"; a client still gets 403 and another firm 404, so the 409 tells outsiders nothing.

**Nothing left behind on a refusal:** after about 45 attempts, 27 rows and exactly 27 files; no 400, 401, 403, 404, 409, 413 or 422 left a row or a file.

**The folder cannot be escaped:** `../../../../../etc/passwd` is stored as the name `passwd` and `..\..\windows\win.ini` as `win.ini`; every path is `cases/<case>/fee-receipts/<uuid>.{pdf,jpg,png}`; a non-UUID filing id (`..%2F..%2Fetc`) gets 404.

**Request shapes:** wrong field, a text field named `file`, a JSON body or an empty file name: 400. An extra text field next to the file is ignored (200).

**Size edge:** exactly 20 MB is stored (200). 20 MB + 1 and + 2 get 413 and store nothing.

**Names:**
- NUL or control characters in the multipart header: 400 (busboy). RLO (U+202E), isolates (U+2067, U+2069), U+2028, C1 controls, `<` and `>` are removed.
- A 10,000-character name is cut to 200; `...` and spaces become "document"; Arabic, CJK and emoji come back unchanged.
- A long CJK name wraps with no sideways scroll at 1024 px and at 640 px ×2 (my stand-in for 200 % zoom); axe finds 0 violations on the panel at both.

**File content:** a file with no recognised start (SVG, lower-case `%pdf-`, a BOM before `%PDF-`, `MZ`) gets 422. See the note below for what is accepted.

**Races:**
- 12 uploads at once: 12 rows and 12 files, each with its own `uploaded_at`. The view lists all 12 in insert order.
- The same bytes uploaded twice make 2 rows (append-only, by design).
- A record with 4 uploads started at the same time, run 3 times: every upload got 409 before the record committed. A row never existed without its record (FK).

**Append-only:** an `UPDATE` is refused by the trigger.

**Leaks:** as a client, Prepare 403, and the case GET (200) and the client's case page show no receipt names. As user-S, Prepare 404.

**Activity feed:**
- 27 "fee receipt" lines, none with a file name or receipt number. Sample: "Case officer uploaded the fee receipt (IRCC's Transaction Approved page) of a recorded filing on case a2f70cfd (PDF, 34 bytes)".
- user-S's feed has 0 of them. user-P gets 403.

**Reset:** after `POST /api/demo/reset` there were 0 `fee_receipt_file` rows and 0 receipt files, including the m5 orphans.

**Keyboard:** Enter on the filing's button opens the file chooser; a refused upload shows "Not stored: …" with `role=alert` and takes focus; a good upload clears the error.

## Notes (not findings, P-26)
- **Content is judged only by its first bytes, as the contract says.** Stored as receipts: `%PDF-<html><script>…` as a PDF, a PNG signature followed by `<svg onload>`, the 3 bytes `FF D8 FF` as a JPEG, and a PDF with planted instructions. No route serves the files back and no model reads them, so nothing runs today. A later download needs `Content-Disposition: attachment` and `nosniff`.
- user-A (configuration) reads all the fee receipt lines in `/api/activity`. That is the feed's existing rule (`api/src/case-feed.ts:11`), not B149's.

## Reproduction
Run `isolated.sh brk_b149 4449 start`, then `tests/check_c82_record_api.ts 4449 xr_studio_brk_b149`, then my scratchpad scripts (outside the repo): `attack1.mts`, `attack2.mts`, `attack3.mts`, `ui.mts` and `recheck.mts`. Screenshots 01–05 are in the scratchpad `brk/shots/`.

## Re-check, live at 019f95794 (after 343ecb757 and 019f95794: `main.ts` 413 words, `submission.ts` reach rethrow)
At 343ecb757 the database was down, so that round was read from the code only. This round ran live on `brk_b149` :4449 (stopped after; never :4400). The setup check passed 71/71; my probes are in `recheck.mts`.

**Blocker or Major: none.**
- **Staff and no actor:** user-O, persona `officer`, user-R and user-T get 200. Nobody, `null` and "user-A, user-O" get 401.
- **Clients:** user-P, user-Q and persona `client` get 403.
- **Configuration people:** user-A, user-B and user-C get 403, including with a 25 MB body (refused before the file is read).
- **Another firm, real vs made-up id (m2 fixed):** user-S gets the same 404 "No such filing." for a real filing, a made-up UUID, a non-UUID, and an unrecorded filing. 403 stays 403: the reach rethrow changes only 404s.
- **Unrecorded filing:** the officer gets 409; a client gets 403; user-S gets 404; user-A gets 403.
- **Sizes (m1 fixed):** exactly 20 MB is stored (200). 20 MB + 1 gets 413 "The file is larger than 20 MB: save the Transaction Approved page as a smaller PDF, JPEG or PNG. Nothing was stored." The words are the same for `/record/Fee-Receipt`, `/RECORD/FEE-RECEIPT`, a trailing `/`, and `/api/RUNTIME/FILINGS/…`.
- **Two files:** 413 "Send one file: the Transaction Approved page. Nothing was stored.", in both letter cases.
- **Nothing stored on a refusal:** rows and files went 2 → 7, exactly the 5 uploads that succeeded (4 staff plus exactly 20 MB). None of the 28 refusals (401, 403, 404, 409, 413, 400, 422) left a row or a file.
- **m7 (Minor, already there at e9f2e6e79):** a client still tells a real filing id from a made-up one, live. user-P gets 403 on any real filing (`runtime.ts:67` refuses non-officers before the case lookup) but 404 on a made-up id. The ids are UUIDv4, so this tells a client little; it is m2's class, for clients.
- **Not re-tested at this head (said fixed by the builder):** m3 (focus) and m4 (dialog pre-check, lasting notice). m5 and m6 stay as follow-ups.
