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
