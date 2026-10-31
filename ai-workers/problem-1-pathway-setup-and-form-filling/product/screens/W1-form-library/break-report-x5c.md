# Break report: X5 slice c "remember a deletion" (02ca83a5)

Branch `claude/festive-edison-hfb2om`, worktree /home/user/f2, diff `7570c9f4..02ca83a5`. The rule (the tech lead on PR #138): a library form whose delete a second person approved is remembered; "Fill from IRCC's forms list" skips it and says so; a person adding it back (upload, Find again, sample load) forgets it; demo reset forgets all.

How: isolated copy `brk5c` on :4456 (`zsh studio/tools/isolated.sh brk5c 4456 start`), recorded canada.ca copies, replay and rules modes only, US$0 (`ai_batch` LIVE = 0). Attack scripts in /tmp/brk5c-scripts (outside the repo). The builder's `tests/check_forms_x5_library.ts 4456 xr_studio_brk5c` gave 72 passed, 0 failed. Copy stopped. Databases `xr_studio_brk5c`, `xr_studio_brk5m` and `xr_studio_brk5shadow` dropped, `var/isolated-brk5c` removed. No code edited, nothing committed.

## Blockers
None.

## Majors

**M1. Deleting a schedule form (IMM 0008 SCH2/4/4A/5/6/6A/12/13/14, IMM 0008 DEP) cannot be undone, and the fill tells the person to do something that cannot work.**
- Repro: reset, then load the sample, then fill. Delete `IMM 0008 SCH4` (a second person approves). Upload the official `imm0008_4e.pdf` through `/api/intake`, then fill again.
- Expected: the upload adds IMM 0008 SCH4 back, the memory is forgotten, and the next fill lists the form.
- Actual: the upload result is `added`, but as code **`IMM 0008`** (`IMM 0008 (06-2020)`). The memory row for `IMM 0008 SCH4` stays. Every later fill says "left out that was deleted from the library (IMM 0008 SCH4; upload its PDF to add one back)".
  - Same with `IMM 0008 DEP` / `imm0008depe.pdf`: the upload is `held` ("could not read the edition of IMM 0008"), and the memory stays.
  - Find again cannot bring them back either: `finder.ts:622` refuses a file whose code reads differently ("reads as IMM 0008: not stored").
  - There is no endpoint that shows or clears the memory. Only a demo reset forgets it.
- Cause: the reader `tools/read_form_identity.py:109-116` only knows the suffix `SCH1`. That gap is older than this slice. Before slice c the next fill listed the form again, so the gap healed itself. Now a delete of any of these 10 forms is permanent, and the fill's own advice ("upload its PDF") cannot work (`api/src/form-library.ts:213`).
- Probably the same, not tested: `IMM 5373 B` (no recorded PDF to try), and forms whose canada.ca page has no PDF (online only), which cannot be uploaded or downloaded at all.

## Minors

**m1. The fill's words for several deleted forms read wrong and name one route only.**
- `form-library.ts:213` gives: "15 left out that were deleted from the library (CIT 0001, CIT 0008, CIT 0027, CIT 0116, CIT 0177…; upload its PDF to add one back)". With 15 forms, "its" and "one" read wrong.
- It also does not mention Find again, which does add a form back (tested below).

**m2. The fill button's tooltip is now untrue.**
- `web/src/pages/library-forms.tsx:253` still says "every form number, listed with no file yet". A remembered deletion is not listed.

**m3. Neither person is told the delete is remembered.**
- Neither the author's delete request nor the approver's card says that a later fill will not list the form again. Checked by grep: `web/src/components/lifecycle/index.tsx:98` and `contracts/lifecycle.ts` have no such words.
- With M1, an approver cannot know that this delete is permanent.

## What held (each tried live on :4456 unless marked "by reading")

| Attack | Result |
|---|---|
| Approved delete, then fill | Form not created again. `deleted:[key]`, words "1 left out that was deleted…". created + listed + deleted = forms on the index (0 + 227 + 3 = 230). Audit line has the same words. |
| Fill racing an approved delete: 12 rounds of approve plus 2 fills at once | Every round: form gone, memory present, all 201, no 5xx. The second look after the insert (`form-library.ts:194-196`) is never wrongly empty. A race where a delete commits between the fill's first read and its insert needs the form to be missing at plan time but present at delete time. I could not set that up through the API; by reading, the second look covers it under READ COMMITTED. |
| Two delete requests at once for the same form (`CIT 0001` and `cit0001`) | One 200, one 409. One RELEASED change. One memory row. |
| Two approvals at once (user-B and user-C) | One 201, one 409. One memory row (by user-B). One audit line. |
| Another spelling | `DELETE /library/forms/cit0001` and `imm0008dep` are normalised (contracts `normaliseCode`). The memory key equals the library key, so the fill skips it. `IMM 0008 Schedule 4A` gets 404 "not in the library", nothing remembered. |
| Returned delete | Status RETURNED, form kept, no memory. |
| Withdrawn delete | Form kept, no memory. |
| 12 rounds of approve racing withdraw | Always WITHDRAWN plus 409 on the approve. No memory, no deletion. |
| Delete of a form already gone | 404 "CIT 0001 is not in the library." |
| Retire vs delete | Retire of an unused form with no file gets 409 "delete it instead". Retire of a used form gets 409 "Still used". Retire never writes memory (by reading, `lifecycle.ts:423-431`). |
| Find again in replay mode on a deleted IMM 5645 (Visitor visa) | PARTIAL run. Form back with a DOWNLOADED edition. Memory forgotten. Next fill lists it. No live AI. |
| Find again in rules mode on the same form | "Rules only: nothing to take or download". Form not added, memory kept. Correct: nothing was added back. |
| Upload of an official PDF (builder's C3.12 suite) | Forgets the memory. A held file approved by a second person goes through the same intake again (`intake.ts:173`) and forgets it too (by reading). |
| Sample load on a blank workspace after deleting IMM 5257 | Form back, memory gone. |
| Demo reset | Every memory row deleted (builder's test, and `demo.ts:193`). Counted in the reset preview (`demo.ts:142`). |
| Every path that creates a library form row | intake, finder form, finder guide, sources draft, import, fill: each forgets the memory or (the fill) honours it. Guides cannot be deleted (their downloaded file blocks it), so their forget is harmless (by reading). |
| Roles | Fill as user-B, user-C, user-O or user-P gets 403. No actor gets 401 (builder's test). The author approving their own delete gets 403, no memory. |
| Migration on a database that already has data | On a copy of a filled database (230 forms, 7 changes), the table and its migration record were removed, then `prisma migrate deploy`. Only `20261031150000_x5_deletion_memory` applied. Data untouched, new table empty. `prisma migrate diff` (database vs `schema.prisma`) shows no difference for `library_form_deletion`. |

## Not tried
- 1024 px, 200 % zoom and keyboard: the slice changes no screen, only the fill's message string.
- The finder's old window where a delete commits between `storeDownloaded`'s read of the form and its insert. It is older than this slice and would fail on a foreign key, not on the memory. I could not time it through the API.

Note for the caller: during this run 33 files under `screens/W1-form-library/screenshots/slice3/` in /home/user/f2 were modified (mtime 13:24 UTC). I did not write them; another process was running Playwright at the time. I left them untouched.
