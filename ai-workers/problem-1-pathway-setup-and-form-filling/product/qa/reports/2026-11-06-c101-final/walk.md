# qa walk of C10.1 on main after #1156 (QA-285, the checkpoint's validated IMM 5257 files), 6 Nov 2026, 12:10–12:17 IST: facts only (no verdict here)

**Commit tested:** `fd29643aa` (origin/main head at the start, #1156's merge; parents `5b3507134` and #1156's head `13a3957c6`). App changes in #1156:
* `api/src/sample-validated.ts`: on each checkpoint load, each copy's validated PDF is taken from the folder `STUDIO_VALIDATED_DIR` (else `.tools/solution-1-prototype/validated-imm5257/`, outside git), its sha256 checked, then sent through the upload door (`CaseForms.validated`). Where the file is absent, the copy's view gets the kept-on-the-Mac words (`keptOnMacWords`).
* `api/src/fill-case.ts`: Download answers 409 with those words where the file is absent.
* `api/src/demo.ts`: row 12's words.
* `web/src/runtime/forms.tsx`: the pill.
* `samples/validated-imm5257.json`: `case_reference`, `form` and each `file`.
* Checks: `acceptance/C10.1.test.ts` R12b/R12c/R12d, `tests/check_qa285_validated_files.ts` and others.

**Folder (the founder's choice, "Files stay on the Mac"):** `STUDIO_VALIDATED_DIR` set as an absolute path to the shared notes folder's `b116-round2-2026-11-06`. That folder holds the four Adobe-saved files that qa re-read on 6 Nov morning (`imm5257-{client-a,partner,child,child-18-or-over}.adobe.pdf`).

**Money:** live AI off. Each copy printed `STUDIO_*_LIVE vars in env: 0`. No priced button was pressed. The loader says "No live AI call was made (US$0)".

**Copies (P-372 (4)):** each started and stopped in one command, the stop in a shell trap (this session's sandbox version of `tools/isolated.sh`: `pg_isready`, `node --import tsx`).

| Copy | Port | Folder | Use |
|---|---|---|---|
| qa_c101f | :4470 | set | pack |
| qa_c101g | :4471 | unset | pack |
| qa_c101h | :4472 | set | walk |
| qa_c101i | :4473 | unset | walk |

All started at 12:10 IST on `fd29643aa`. Each trap printed "port listener after stop: none" and "dropdb … exit 0".

## Machine runs (exit codes)
| Run | Copy | Result |
|---|---|---|
| `acceptance/C10.1.test.ts` (loads the checkpoint itself), folder set | qa_c101f | **exit 0, 28/28 (74 s).** R12b "with the validated files here, a validated copy read back through the upload door for each" (`here: true, readBack: 4`). **R12c PASS:** "Download of each IMM 5257 copy gives 200 and the validated file, its sha256 the saved read-back's". Child, Child 18 or over, Client A and Partner each 200 `IMM5257-validated-….pdf` |
| `tests/check_c10_1_configured.ts`, folder set | qa_c101f | exit 0, 48/48 |
| `acceptance/C10.1.test.ts`, no folder | qa_c101g | **exit 0, 28/28 (72 s).** R12b "without the validated files (kept on the Mac), no validated copy recorded and each copy says so in words, Sample" (`here: false, readBack: 0`). **R12d PASS:** each Download is 409 with the kept-on-the-Mac words, never the unvalidated copy and never a 404 "validate the copy again". It prints `HELD  C10.1 R12c part B (QA-285): red, held: … not on this machine …; this step runs on the Mac with STUDIO_VALIDATED_DIR set` |
| `tests/check_qa285_validated_files.ts` (no server) | qa_c101g | exit 0, 13/13. These include: "a file whose checksum differs from the saved one is refused in words naming the person and the file, never used"; "a file name that leaves the folder (a path) is never read"; "the checked file goes through the upload door for its copy, once … no direct validated_copy write"; "absent … never 'validate again'"; "not the Sample case … gets no kept-on-the-Mac words" |

## By screens, folder set (browser pane, 1024 px, copy qa_c101h :4472)
1. **Load.** Acting as Configuration author, Demo › Load the configured checkpoint… › Load the configured checkpoint. "Configured checkpoint loaded", "No live AI call was made (US$0)". Rows: 1 Done, 2 Parked (P-102, W6), 3–11 Done, **12 Done: "IMM 5257 generated for 4 of 4 applicants on release 1 (C7.1); 4 validated in Adobe and read back equal, the form's own Validate passed (P-171)"**, 17 Done (`1-mac-row-12-1024.jpg`).
2. **Underneath.** Four `validated_copy` rows, one per IMM 5257 copy, each with `read_by user-O`. Each `path` is a file in the copy's own working files (`…/var/isolated-qa_c101h/…`), not a note. The sha256 values are `1a2aa8d8…` (Client A), `c8547b02…` (Partner), `377f96bd…` (Child) and `995faaa9…` (Child 18 or over). Read-back is written/equal 66/66, 66/66, 63/63 and 63/63, and the form's Validate passed for each.
3. **The next step, as Case officer.** Demo › Open the case area › Cases › SAMPLE-VV-FAMILY-1 › Prepare application. Each IMM 5257 (Client A, Partner, Child, Child 18 or over) shows **"Validated copy read back"**, "Read back again", "Copy of 6 Nov, 12:12 · 66 (63) form fields written · read back and checked", and Download (`2-…`, `3-…`).
4. **Download, pressed on each of the four in turn.** The page's own requests were recorded by qa as they came back:

| Person | Status | File name | Bytes | sha256 |
|---|---|---|---|---|
| Client A | 200 | `IMM5257-validated-c21afee3.pdf` | 1,482,411 | `1a2aa8d8dcb23faa…` |
| Partner | 200 | `IMM5257-validated-d5906643.pdf` | 1,482,406 | `c8547b0250ddbf9f…` |
| Child | 200 | `IMM5257-validated-ba1ed463.pdf` | 1,482,329 | `377f96bd9c2bd7f6…` |
| Child 18 or over | 200 | `IMM5257-validated-0660d908.pdf` | 1,482,344 | `995faaa976b95912…` |

   * Each body starts `%PDF-`, and no error toast appeared.
   * The four full sha256 values equal the `validated_sha256` values in `samples/validated-imm5257.json`. They also equal `shasum -a 256` of the four Adobe-saved files in the folder.
   * "Filed" stays disabled: "Not yet: 26 facts to answer or confirm before filing" (P-144, unchanged).

## By screens, no folder (browser pane, 1024 px, copy qa_c101i :4473)
5. **Load,** as above. Row 12 is **Done**: "… 4 validated in Adobe on the Mac and read back equal, the form's own Validate passed (P-171, Sample): the validated files are kept on the Mac, not in these working files, so they are not downloaded or filed here". Underneath there are no `validated_copy` rows, and the four copies are GENERATED and unchanged.
6. **Prepare application, as Case officer.** Each IMM 5257 shows the pill **"Validated in Adobe on the Mac and read back equal (Sample): the validated file is kept on the Mac, not in these working files"**, next to "Read back the validated copy". The words "validate again" appear nowhere on the page (`4-no-folder-kept-on-mac-words-1024.jpg`).
7. **Download (Client A).** The response is 409 `application/problem+json`, 581 bytes. The toast reads: "The copy could not be downloaded: Validated in Adobe on the Mac and read back equal (Sample): the validated file is kept on the Mac, not in these working files. It is not downloaded here, and the copy as the product made it (not validated) is not handed over in its place." (`5-no-folder-download-refused-in-words-1024.jpg`). By route, as the case officer, each of the four gives 409 problem+json: no PDF bytes, and no "validate the copy again".
8. **The upload door, for a copy with no validated row (condition 1).** As the case officer, the Partner's Adobe-saved file was sent to `POST …/form-copies/fc3ea4da…/validated`, the door behind "Read back the validated copy":
   * **201**, with `validated.current: true`.
   * Its Download is then **200**, `IMM5257-validated-fc3ea4da.pdf`, with sha256 `c8547b02…` (the saved one).
   * The same file sent again gives 409 "already read back … nothing was added", which is expected.
   * Client A's Adobe file sent onto the Child's copy gives **422**: "Not read back: 10 of the 63 values the product wrote differ in this file … Nothing was recorded".

## Noted, not a finding
* `forms.tsx` passes `data-validated-elsewhere` to `Pill`, but `Pill` (`web/src/components/ui/controls.tsx:137`) does not forward it, so the attribute is not in the page. No check reads it (`grep` finds it only in `forms.tsx`). The words show.
