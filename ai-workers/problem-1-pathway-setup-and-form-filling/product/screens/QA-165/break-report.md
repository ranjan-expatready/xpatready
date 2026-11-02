# QA-165 part 1: break report (PR #572, head 9fe11fd5)

Scope: `POST /api/runtime/form-copies/:id/validated` records a copy only when the file's own XFA Validate result passed.
Since 9fe11fd5, a `validated_copy` row counts only when `formPassed()` is true.
Run on 2 Nov 2026 against an isolated copy on :4436 (`xr_studio_brk_qa165`, visitor visa released). The server ran from
the tree at 9fe11fd5; the reader attacks were also run first on 9fbe06a8, which has the same `validated()`. No model
calls, US$0. Every "validated" file below is SYNTHETIC: written with `tools/simulate_validate.py` or a small pypdf
script that edits the XFA data, with no Adobe barcode. A "pre-QA-165 row" is a row I inserted with SQL. It has the same
columns `validated()` fills, and its `read_back` has no `validation` key, which is what a row recorded before this PR
looks like.

## Findings

**1. Major: sending the same validated file again, as the words ask, never makes an old row count.**
Steps: a copy whose latest row is a pre-QA-165 row, and whose file does pass (flag Yes and a date). This is an officer's
real Adobe file read back before QA-165. The view says "Read back before the form's own Validate result was checked:
send the file you validated in Adobe again". Send that same file.
Actual: 409 "This validated file is already read back and kept for this copy of IMM 5257; nothing was added." The copy
stays `current: false` with the same words, and `lock` stays refused (fill-case.ts:277). The duplicate check at :326
matches on checksum alone and ignores that the kept row never passed. The only way out is to validate again in Adobe so
that the bytes change. Neither message says so.
Expected: the same file, now read and found passing, is recorded (or the old row is superseded). Otherwise the words must
say "validate again in Adobe and save a new file", not "send the file again".

**2. Major: a refused re-send deletes the file that a kept row points to.**
Steps: a copy whose latest row is a pre-QA-165 row whose file has no passed result (`asValidated(copy, "none")`). Send
that same file again. Actual: 422 "…the form's own mark says nothing… Nothing was recorded." But the upload is written
to the same path as the kept file (the name comes from its checksum), and fill-case.ts:317 deletes that path before the
"already read back" check at :326. The row is insert-only (the `validated_copy_guard` trigger refuses UPDATE and
DELETE: "kept as long as its case"), so it now points to a file that no longer exists, and the read-back evidence is
gone. `GET …/file` falls back to the generated copy, because the row does not count. A passing row loses its file the
same way if the reader fails on a re-send, for example at the 120 s timeout. (At 9fbe06a8 this was worse: the row still
counted and `file` answered 404.)
Expected: a refusal never removes a file that a recorded row points to. Look up the row by checksum first, or write the
upload under a temporary name.

**3. Minor: the reader takes any data leaf with the flag's or date's name, ignores an empty real flag, and passes flags that disagree.**
These were recorded (201) on an IMM 5257 copy:
* The real `PersonalDetails[0].ApplicationValidatedFlag[0]` left empty, with an added `…ApplicationValidatedFlag[1]` = Yes.
* An added `form1[0].Page9[0].ApplicationValidatedFlagMirror[0]` = Yes.
* An added `form1[0].X[0].ApplicationValidatedFlag[0]` = Yes, with `form1[0].X[0].DateLastValidated[0]` filled. That is
  the IMM 0008 one-field date shape, accepted on IMM 5257.
* Date parts of `" "` or `"x/y/z"`. On IMM 0008, the dates `" "` and `"not a date"` also pass.
* On IMM 0008, Mirror `Yes` with Flag `Oui` passes (`flag "Yes / Oui"`). That breaks the PR's own rule "every flag holding
  a value agreeing": read_validated.py:49–55 checks `all(v in PASSED)` and never that the flags are equal.

Each case needs hand-edited XFA data, and anyone who can do that can also set the real flag. Expected: read the fields
the form's validateForm script writes, require the flags to be equal, and require a date that parses.

**4. Minor: with two `datasets` packets in the XFA array, the reader uses the last.** Steps: decrypt the copy and add a
second packet (Yes and a date) after the original (flag empty). Result: 201. In the reverse order: 422. `xfa_streams`
builds a dict. Unconfirmed which packet Adobe binds.

**5. Minor: the 422 echoes the flag text with no length limit.** Steps: set the flag to `"<b>" + 2,000,000 × "N"` (a 1.5 MB
upload). Result: a 4,000,534-byte body, and the toast gets a detail of 2,000,209 characters (fill-case.ts:321). Other
refusals cut values to 60 characters.

**6. Minor: the new check more than doubles the read time.** Steps: a 1.4 MB copy whose datasets has 3,000,000 extra empty
elements. Result: 422 after 15.2 s (read_back 5.8 s, `form_validation` 8.5 s: it opens, decrypts and parses the
datasets a second time). Uploads have no concurrency limit, and the 20 MB limit allows files that run until the 120 s
kill. The server stayed responsive (`/api/session` answered in 6 ms). Expected: parse once and use the tree for both checks.

**7. Minor: data changed after Validate is accepted while the flag still says Yes.** Steps: flag Yes, a date, and
`form1[0].Page3[0].SectionHeader_DetailsOfVisit[0]` changed. Result: 201. In Adobe, editing after Validate sets the flag
back to No (`updateDirtyFlag`). The form's `CRCNum` (crc32 of its data, written at preSave) is not checked.

## What held
* **Rows recorded before QA-165 (new in 9fe11fd5).** Such a row as the latest no longer counts: `current: false`, the
  words "Read back before…", and `file` serves the generated copy, not the old upload. At 9fbe06a8 it counted and was served.
* **Row order (9fe11fd5).** A passing row followed by a newer non-passing row does not count: only the latest row is read.
  Ties on `read_at` (Prisma writes it with millisecond precision) go to the row inserted last, in both orders I tried.
  Two different passing files sent at once were both recorded, and `read_at` follows the insert order; the later one is
  shown and served. Rows cannot be updated or deleted (trigger).
* **Flag spelling.** `yes`, ` Yes`, `YES` and `Sí` are refused with 422 naming the mark. Yes with only Year, Yes with no
  date, `"No"` and `"none"` are refused. Real flag No plus a Yes elsewhere is refused ("No / Yes").
* **Incremental updates, latest wins.** Yes then No is refused. No then Yes is recorded. `Oui` and a proper
  `asValidated(copy)` are recorded. A non-XFA PDF and an unencrypted rewrite with no flag are refused.
* **Changed values.** Yes with a product-written value changed is refused with 422 naming the box ("DD" should say "13").
* **Roles.** The client, the other client and the configuration author get 403, the solo-firm officer 404, an unknown
  person 401, and none of these calls writes a file. The same firm's representative is recorded.
* **Concurrency and leftovers.** The same passing file sent 3 times at once gives 201, 409, 409, with one row and one file.
  One passing and two failing at once give 201, 422, 422, and only the passing file is kept. Every other refusal left
  the row and file counts unchanged.
* **Other forms.** IMM 1344's date in `Header.titleSF` is accepted. IMM 5707 gives "keeps no record". The PR's
  `check_qa165_form_validation.ts` passes 26/26.

Not tested: `lock` live. My copies stop earlier on unconfirmed facts; its `formPassed` check was read in code at
fill-case.ts:277. Also not tested: a real Adobe-saved validated file. None is in the repo, so every "pass" above is synthetic.
