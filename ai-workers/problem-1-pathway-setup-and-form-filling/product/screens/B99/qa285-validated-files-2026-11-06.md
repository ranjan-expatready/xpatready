# QA-285: the checkpoint's validated IMM 5257 files (C10.1 row 12; record, 6 Nov)

**The fault (qa, main ea8e35763).** The case's four IMM 5257 copies said "Validated copy read back", but Download gave 404 "validate the copy again". The cause was the loader (`api/src/sample-validated.ts`, #1123), which wrote each `validated_copy` row directly with a path that is not a file.

**Founder (~10:05 IST, in the tech lead's chat):** "Files stay on the Mac (Recommended)".

**Fix: the loader, on every load.**
* It takes each copy's validated PDF from one local folder outside git. The folder is the env var **`STUDIO_VALIDATED_DIR`** (an absolute path: a relative one is read from each process's own working folder, so the server and a test could disagree); the default is `.tools/solution-1-prototype/validated-imm5257/` in the working copy's root. The path is named in one place (`validatedDir`) and is never committed.
* Each entry in `samples/validated-imm5257.json` names its file (`file`). Before the file is used, its sha256 is checked against the saved one.
* A file with the right checksum goes through the product's own upload door: `CaseForms.validated`, the code behind `POST /api/runtime/form-copies/:id/validated`, which runs `tools/read_validated.py`. That door keeps the file in the copy's storage and records the validated copy. The loader never writes a `validated_copy` row itself (P-322). Download then gives the validated file (200, the saved sha256).
* A file with another checksum is refused in words and not counted. Row 12 is then partial and names it.
* **No folder or no file (GitHub, a fresh machine): nothing is faked.**
  * No validated copy is recorded, and nothing is written to the copy: the database guard refuses any change to a generated copy.
  * Only on the Sample case's copies of the saved form: the samples file names the case (`case_reference`) and the form (`form`), so a real case with the same people and answers never gets these words (tech lead on QA-285, the reviewer's Minor 1).
  * The copy's view says, worked out each time from the saved read-back and the copy's own facts and values (`keptOnMacWords`): "Validated in Adobe on the Mac and read back equal (Sample): the validated file is kept on the Mac, not in these working files".
  * Download refuses with those words (409) and never hands over the unvalidated copy in its place.
  * Row 12 says the same. It is Done, because the Validate passed on the Mac for these exact facts and values.

**Tests.**
* `tests/check_qa285_validated_files.ts` (no server): 12 checks, with a pass and a fail for each branch (file here, wrong file, file absent, the door refusing) and for the view's words.
* Pack `acceptance/C10.1.test.ts`:
  * R12b covers both branches.
  * **R12c** checks that Download gives 200 and the saved sha256 for all four copies, on the Mac.
  * On GitHub, R12c prints HELD (red, held, QA-285) and R12d checks the words instead.
* `check_c10_1_configured.ts`, `check_c10_1_browser.cjs` and `check_qa144_ee_release.ts` follow the branch.

**Fast loop on fresh copies, US$0, live AI off (6 Nov, 10:20–10:36 IST).** The "Mac" branch ran with `STUDIO_VALIDATED_DIR` set to the folder holding the four Adobe-saved files (the files of `screens/B99/read-back-2-2026-11-06.md`). The "GitHub" branch ran with no folder.

| Suite | Mac | GitHub |
|---|---|---|
| C10.1 pack | exit 0, 28/28 (R12c PASS: 4 × 200, the saved sha256) | exit 0, 28/28 passed + R12c HELD |
| `check_c10_1_configured.ts` | exit 0, 48/48 | exit 0, 48/48 |
| `check_qa144_ee_release.ts` | exit 0, 26/26 | exit 0, 26/26 |

Run once, on a copy without the folder:

| Suite | Result |
|---|---|
| `check_qa285_validated_files.ts` | 12/12 |
| B99 family hash | 8/8 |
| B99 "Same as" | 9/9 |
| `check_forms_b116_own_unmapped.ts` | 18/18 |
| `check_d1_reset_to_six.ts` | 25/25 |
| `check_c72_imm5257_fill.ts` | 54/54 |
| `check_runtime_r1d.ts` | 96/96 |
| `qa/check_qa_am_1101c_validated.ts` | 9/9 |
| `qa/check_qa_c72_validated_upload.ts` | 4/4 |
| `check_qa182_no_box_words.ts` | 8/8 |
| `check_stand_ins.ts` | 9/9 |
| `check_forms_rounds.ts` | 78/78 |
| `check_qa76_words.ts` | 10/10 |

Every suite exited 0, and the type check found no new errors. The browser suites are left to CI.

**Round 2 (tech lead, after the review approved 45f0b3996).**
* Minor 1, fixed: the words are limited to the Sample case and form named in the samples file. There is a fail test for a case with another reference, the same people and answers, and for another form.
* Minor 3, fixed: the checks that could not fail are gone. The suite's stand-in database now refuses a change to a copy, as the real database guard does.
* Minor 2: the env var's comment and the PR body now say "absolute path"; no code change.
* Minor 4: left as it is.

Re-run on fresh copies, 6 Nov 10:42–10:46 IST, every suite exit 0:

| Suite | Mac | GitHub |
|---|---|---|
| C10.1 pack | 28/28 (R12c PASS) | 28/28 (R12d PASS, R12c HELD) |
| `check_c10_1_configured.ts` | 48/48 | 48/48 |
| `check_qa285_validated_files.ts` | 13/13 (no server) | |

**Round 3 (#1156 CI shard 1, gate B).** Under gate B's runner, which is the tsx CLI with no API tsconfig, the pack did not compile: "Transform failed with 3 errors … Parameter decorators only work when experimental decorators are enabled". The cause: the pack imports `sample-validated.ts`, which imported `core.ts`, and `core.ts` holds NestJS's parameter decorators.
* My earlier pack runs went through `node --import tsx` with the API tsconfig, so they missed it. The `check_*` suites run with `--tsconfig api/tsconfig.json` in CI too, so they were not affected.
* **Fix:** `sample-validated.ts` now imports only the `Db` type from `core.ts` (erased when the file loads) and works out STUDIO and ROOT itself. `check_qa285_validated_files.ts` checks that its default folder equals the one `core.ts`'s ROOT gives.
* **Reproduced, then green, the way gate B runs the pack:**
  * `tsx studio/acceptance/C10.1.test.ts PORT DB` from `prototype/`, with no `--tsconfig`, on a fresh copy prepared as gate B prepares it (no validated folder), with gate B's own `packVerdict` on steps R12a, R12b, R12d.
  * On the six (Reset to the six, 201): **exit 0, 28/28; named steps green; R12c HELD.**
  * On the checkpoint (reset 201, load 201): **exit 0, 28/28; named steps green; R12c HELD.**
  * `gate-b.mjs` itself could not start its isolated copies in this sandbox, because `isolated.sh` checks the database with `pg_ctl status`, which the sandbox refuses.
* **Also re-run, all exit 0 (10:50–10:58 IST):**

| Suite | Result |
|---|---|
| `check_c10_1_configured.ts` (no folder) | 48/48 |
| `check_qa144_ee_release.ts` (no folder) | 26/26 |
| `check_forms_b99_family_hash.ts` | 8/8 |
| `check_qa285_validated_files.ts` | 13/13 |

  The type check found no new errors.

**First try, not pushed.** It wrote the kept-on-the-Mac words onto the copy's result. The database guard refused that ("a generated copy is never overwritten"), and the checkpoint load stopped with a 500. So the words are now worked out when the copy is read.
