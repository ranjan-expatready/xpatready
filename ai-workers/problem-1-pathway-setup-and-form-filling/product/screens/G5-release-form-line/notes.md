# G5 — Release needs a form line (C5.1, P-248; SA-1B-90)

Build notes for row G5 (screens). Plan and results are in the PR body; this file keeps the decisions taken while building.

## Plan
1. One rule, one place (`api/src/studio.ts`): beside F8's "nothing to release yet", a combination with document lines and no form line gets a release-blocking line in plain words that say what to add. A form line is a filed form (`form_kind` data_form): a PDF form, a portal-screen edition (filed Online, P-245) or an online-only form (P-152 (2)). A checklist or a document form does not count.
2. The release page (Programs › Release) and the Review and release tab list that line while the combination is configured (warning), so the author sees it before submit.
3. Submit and approve (release) are refused: approve with 409, in the same words.
4. Existing tests that expected documents-only to release (`check_f8_empty_release.ts` and any release suites) are updated to the new rule.
5. `acceptance/C5.1.test.ts`: P-248 plus C5.1's existing rule (the author submits, the expert ticks, a different person approves and releases).

## Decisions while building (4 Nov)
* **Scope (Q1 on the PR):** only P-248's form-line half. None of the six has a document line, so "needs a document line" would refuse every checkpoint combination today; proposed as its own row.
* **What counts (Q2):** a line the library files (`engine/form-type.ts libraryType` is "form", review m2) whose channel is not Not needed: PDF upload, paper, Online (a portal-screen edition, P-245), or an online-only form (P-152 (2)). The rule is pure, in `engine/programs.ts` (`isFormLine`, `formLineProblem`), so the pack reads it without the API.
* **Where it shows:** `studio.problems()` (Submit 400, Approve 409, `releaseRows` 409), the Release page's held reason (first), To review's blocker count, and its own warning box on the Review and release tab (said once; the validation count then says "other errors", review m1).
* **Earlier releases (Q3):** kept; a release is never undone. The Overview's startable check reads releases, unchanged.
* **Checkpoint (Q4):** no checkpoint combination has a clean draft until QA-144, so part B's release step waits there (exit 2); it passes on the fixture.

## Review (Opus, b2d33367): Approve, 9/10, no Blocker or Major
* m1 fixed (count words) · m2 fixed (`libraryType`, pass step) · m5 fixed (property test of 500 drafts in the pack; screenshots in `screenshots/`).
* m3: the live Not needed step cannot run on either data set (no account record allows Not needed for IMM 5710 or IMM 5257); the rule step and the property cover it; the pack header says so.
* m4: an approver who changed the draft is refused release (BR-14) in `tests/check_s5_slice1.ts` (57/57); the pack header points there.

## The Study permit's document lines (4 Nov ~20:50 IST, tech lead's ruling on #868, Lead 8, option 1)
* Main's #879 makes the checkpoint release the Study permit outside Canada, which had forms and no document line, so P-248 refused it (`check_qa144_sp_release` 22/24, `check_c10_1_configured` 31/32 on the merged tree).
* `api/src/demo.ts` `SP_DOCUMENT_LINES` (`FORM_SETUP["sp.outside"].documentsCited`) puts IMM 5483 (08-2025)'s three always-needed lines through the Documents route as the author: proof of payment (p. 1, documents list item 1), the passport information page (p. 1, item 2), the letter of acceptance (p. 2). Each line's quote carries the page and the words, checked against `official-sources/ircc/checklists/imm5483e.pdf` (sha256 6f885da2…, the PDF modified 2025-08-11), and reads "Sample, Unconfirmed: expert". The passport and fee-receipt types are reused by name; Letter of acceptance is new: the content reviewer accepts it on To review and the Approver approves its ADD. Rows 7 and 17 are untouched.
* Fresh copies on the head: `check_qa144_sp_release` 24/24, `check_c10_1_configured` 32/32, `check_qa144_vv_release` 29/29, `check_qa144_lmia_release` 23/23; the C5.1 pack 49/49 twice on the checkpoint and 48/48 twice on the fixture (each run after Reset).
