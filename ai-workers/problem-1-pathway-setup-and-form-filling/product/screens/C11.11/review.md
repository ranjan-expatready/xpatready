# C11.11 review (forms lane): checklists never filed, online-only status

Reviewed commit: **577255c91** (branch claude/epic-wright-62f5h5). It is 959714a67 plus two screenshots; `git diff 959714a67 577255c91` has no code change, so the code review of 959714a67 stands. Base origin/main 877acf66a.

Verdict: **Approve** (no Blocker, no Major; two Minors and a screenshot note below).

## What I ran (isolated copy, port 4454, live AI off, US$0)
- `acceptance/C11.11.test.ts`: 26 passed, 0 failed. `acceptance/C1.6.test.ts`: 23 passed, 0 failed.
- Loaded sample, checked by API and SQL: With an LMIA has six filed lines (IMM 1295, 5257 SCH1, 5409, 5475, 5476, 5707) and IMM 5802 only as a RETIRED imported line. IMM 5488 and IMM 5905 show in the library as checklists, `used_by ... as_source: true` for With an LMIA; IMM 5484 and 5881 as sources of Visitor visa. IMM 5802 (kind "document", title "Offer of employment form") is still type form. Counts: form 10, guide 4, checklist 4, online_only 1, no_file 2.
- Every `combination_form` creation path: all attach routes (library "+ Add" form-library.ts:362, programs.ts addLine, intake upload-for-row, finder AI apply, bulk copy, sources.ts AI proposal and reuse) go through `addFormLine` (form-lines.ts:28-31), which now refuses a non-form with 409; the by-hand route also refuses before the file checks (form-library.ts:352). `programs.addLine` sends a checklist to the source path (programs.ts:560). The release import skips it (engine/import.ts:92). Remaining raw writers (form-library.ts:447, lines-bulk.ts:375) are undo restores of existing rows, not new lines.
- Explicit `any` added in api/engine/contracts/web: none. I could not run a full tsc (no root tsconfig at the app folder); the 26 and 23 passes ran through tsx only.
- Edited tests (check_c46_*, check_s5_slice1*, check_screen01_channels, check_uxa1, check_x2b_bulk_*, check_forms_s4_library_browser, C1.6): read every hunk. They swap the fixture from IMM 5488 (no longer a line) to IMM 1295 or IMM 5475 and keep the same assertions, or update counts (8 to 6 forms, "2 document checklists" gone) with a positive check that the checklist is absent. Where the old checks needed a checklist line (no-channel, card filing) they plant one by SQL, so those rules still have a test. Not weakened. I did not run the browser (.cjs) suites.

## Findings

### Blocker
None.

### Major
None.

### Minor
1. **Bulk preview says "will add" for a checklist line, apply then refuses.** `api/src/lines-bulk.ts:426-429` (`libraryBlock`) checks retired and closing only, not the new "not filed" rule, while `write()` at lines-bulk.ts:239 calls `addFormLine`, which now throws 409. Scenario, reproduced: plant a legacy IMM 5488 line on With an LMIA (a database loaded before this change still has one), then POST /lines/bulk/preview adding it to Visitor visa returns `WILL_ADD, tickable: true, cannot: 0`. Ticking it and applying fails the whole batch with the 409 in words instead of the preview showing "cannot". Only reachable with pre-existing data, no new line can be created, and the refusal is in words, so Minor. Fix: add `notFiledWords` to `libraryBlock` for forms.
2. **Type rule is a title heuristic.** engine/form-type.ts:7: a "document"-kind row is a form only if its title contains "form" and not "checklist". IMM 5802 passes by its title alone. Any real form uploaded without a field map whose title lacks "form" (intake.ts:354 stores such files as "document") is now refused as a filed line ("is a checklist") and falls to the source path in addLine, where before it could be added. Same rule as the library's displayed type, so consistent, and no such row is in the sample; flag for the immigration expert, not a change request.

### Screenshot note (Minor, evidence only)
`screens/C11.11/c1111-online-only-1440.png` and `-400.png` show the Edition cell and the 400 px short line as "no usable edition yet" for ONLINE-IRCC-EE-PROFILE. The code at web/src/pages/library-forms.tsx (the two edited cells) renders "online version only" for status online_only, and the built `web/dist` contains that string. So the screenshots were taken from a web build older than the code at this commit. They do prove the status pill "Online only · no official PDF", the "Online only 1" filter chip, "No PDF: online only" in the Field map cell and "Not used", and that no upload-its-PDF step is offered. At 400 px the Status pill is off-screen in the horizontally scrolled table (the existing table behaviour, not new here). Retake both so the picture matches the code.

## Words and sourcing
- Refusal: "IMM 5484 is a checklist: it is read by AI and never filed, so it is not one of a combination's forms. It stays in the library, and a combination uses it as a source." Plain, no codes. Tooltip for online_only cites P-152 in text shown to people ("P-152") in the tooltip and field-map tip (library-forms.tsx STATUS.online_only, form-library.ts ONLINE_ONLY_FIELD_MAP): a decision id in user-facing text; Minor wording, consistent with older tips that already do this.
- Sourcing (P-170): the claim about IMM 5484 and IMM 5488 ("You do not need to submit this PDF checklist") is quoted in the code comment and the qa note with canada.ca pages and "recorded 19 Oct 2026". The quote sits in engine/form-type.ts:12-14 with no page URL or retrieval date beside it in the code; the URL is in the recorded official-sources web pages. I did not re-fetch canada.ca. Product rule (P-118, QA-101) is the founder's, not an IRCC claim.
- Release 1: import skips checklist lines, so the release holds six lines for With an LMIA; its source entries are cited only for numbers on lines present, so none are lost for IMM 5488/5905 as far as the sample shows (not diffed against main's Release 1 byte for byte).

## Not checked
Browser suites (.cjs), keyboard-only and 200 % zoom pass, a byte comparison of Release 1 against main, canada.ca live pages.

**Verdict: Approve** (for 577255c91; fix list: Minor 1, retake the two screenshots)

## Round 2 (19d38b3)
Diff-only review of `git diff 577255c91 19d38b32d`. I read the whole diff; I did not re-run the suites (relied on the builder's reported 26/26, 67/67, 87/87, 113/113).

- **m1 fixed.** `api/src/lines-bulk.ts` `libraryBlock` now selects `formKind` and `displayName` and returns `notFiledWords(...)` before the retired check, so the preview refuses a legacy checklist line ("Cannot", in words) before apply would. The new test in `tests/check_x2b_bulk_preview.ts` plants IMM 5488 by SQL, asserts `CANNOT_RETIRED`, the "checklist: it is read by AI and never filed" words and `tickable` false, removes the line, then asserts IMM 1295 is still `WILL_ADD`. The builder reports it fails without the fix (66/67) and passes with it (67/67). The test would fail if the rule were removed, as it should. Nit only: the outcome code is the shared `CANNOT_RETIRED` for a not-filed reason; the words are right, so no change needed.
- **m3 fixed.** The retaken 400 px screenshot reads "Form · online version only", matching the code; the status chip "Online only 1" shows. (I looked at the 400 px image; the 1440 px one I took on trust from the diff size change.)
- **Wording fixed.** Both tooltips (`library-forms.tsx` STATUS.online_only, `form-library.ts` ONLINE_ONLY_FIELD_MAP) no longer show "P-152" and no longer claim "IRCC publishes no PDF"; they say what the library holds. No uncited IRCC claim remains in them.
- No new `any` in the diff; no other code changed.

No open Blocker, Major or Minor from round 1.

**Verdict: Approve** (commit 19d38b32da39e24ea85ae723f4ce51a8a286e6a9)

## Round 3 (ae24dd2, CI fix)
Diff-only review of `git diff df660b722 ae24dd2de`: two test files, no app code. I read both hunks and the surrounding test; I did not run them (relied on the builder's 28/28 and 116/116).

- **tests/check_c18_copies.ts.** The old test took "the first checklist line" of With an LMIA, which no longer exists. It now plants one by SQL (copy of the IMM 5707 row with lineage IMM 5488, its own library def, `copies` 1, DRAFT), re-reads the lines (`f0 = await forms()`), and removes it after the two checks that use it. Both assertions are unchanged: 2 copies on a checklist line is 400 on the field with "A checklist is not filed, so it has no copies.", and the line keeps 1 copy. The removal comes before the contract check and the Undo, so the later "Undo puts the line back to 1 copy" and fingerprint checks run on the same state as before (the SQL insert is not an action, so Undo is unaffected). Same pattern as the plants already reviewed in C1.6 and check_screen01_channels. Proves what it claimed; not weakened.
- **tests/check_screen01_browser.cjs, item 6.** Was: eight codes on the page, all named in the note. Now: six codes, none of them IMM 5488 or IMM 5905, the note still names both as checklists (`/checklists IMM 5488 and [^)]*IMM 5905/`), and every shown code is still checked against the note. A stricter check than before, and it tests the new rule from the page side. Not weakened.
- **tests/check_screen01_browser.cjs, C1.6 channel step.** Only the filing-detail words change, from "PDF uploads + paper forms" to a match anchored at the start of "Paper only; plus PDF upload when needed", the same words round 1 already saw in check_screen01_channels.ts for the same state (IMM 1295 on paper, no checklist lines). The "Filing: Mixed: PDF and paper" and "Signed in pen" checks stay. Still proves the filing method follows the line's channel; not weakened.

No new Blocker, Major or Minor.

**Verdict: Approve** (commit ae24dd2de5082d8e84603dc7272fbab69dfc08d4)

## Round 4 (fc2472a, CI fix)
Diff-only review of `git diff 559f7822e fc2472a3c`: one file, `tests/check_uxa4_details_browser.cjs`, three added lines (two comment, one wait). I ran the suite on an isolated copy (port 4455): 47 passed, 0 failed.

- **Fixes the race.** The datalist joins the library fields and the calculated values, which come from two requests. The wait holds until at least one option does not end in "(calculated)", i.e. a library field has arrived, before the list is read. The library fields come in one request, so one such option means the whole set is in.
- **Not weakened.** The wait is a precondition only. The assertions after it are unchanged: more than 10 options, no field key among them, and `offered[0]` is still used in the next step. The check still proves the names offered are names.
- **Fails loudly.** `waitForFunction` has a 15 s timeout and no catch. A timeout throws into the file's outer `.catch`, which prints the error and exits 1. It does not skip silently or pass.
- **Nothing else changed.** No app code and no other test lines.

No new Blocker, Major or Minor.

**Verdict: Approve** (commit fc2472a3c0bf3c6bb5764ff91863788cea298f8d)
