# C11.12 filing modes, PR 3 (the screen): review

Reviewer: fresh context. I did not build this. Reviewed **local commit `636237ba`** on `local/c1112-pr3`, delta `local/c1112-pr2..636237ba` (10 commits). Sources: board r2 frames 1–3, concept r2 §4–§6, P-233, `review.md` (n2, n3) and `review-pr2.md`. Live AI off, US$0. Isolated copies on :4442 (my walk) and :4445 (the builder's check). :4443 and :4444 were in use by the breaker and the builder.

## What I re-ran
- `check_c1112_filing_browser.cjs` passed 15/15 on :4445. I restored the screenshots it rewrote.
- `check_c1112_modes` passed 39/39 and `check_setup_checklist` passed 50/50 (engine part). `graph.mjs`: C11.12 is named by 12 tests and has no orphan element.
- I walked the screen as the configuration author (`user-A`) and as the content reviewer (`user-C`) on Visitor visa, `fs.outside`, `wp.family` and `sp.student`. Widths: 1440, 1024, 512 (200 % of 1024), 400 and 375. I checked keyboard order and axe in the read, editing and field-error states. The journey report is `journey-test-reviewer-pr3-2026-11-02.md`.

## What holds
- **Columns.** Person · How many · Filing · Answered by · Fees · IRCC's words, as on the board. The Filing tip is the §5 text word for word.
- **Principal.** The principal is fixed: "Files own application · Always, for the principal".
- **Applicant roles.** They get the three choices, with "If not travelling: …" underneath.
- **Warning before Save.** On Visitor visa, choosing On the principal's or Declared only shows "⚠ Check this: Guide 5256 … You can still save." straight away, and it is still there after a reload.
- **"What a case gets"** updates in about 18 ms with each change. It uses the server's pure `previewFilings`, and the server view now carries `combinationKey/Label`, `feesKnown` and `defaults` (`api/src/workspace.ts:145`).
- **Sponsorship words.** `fs.outside` reads "2 filings sent together … · cannot be split" and "Co-filed · cannot be sent alone".
- **Fees words.** Combinations without fee rules say "Fees not worked out yet for …; nothing is guessed". CAD 0 never appears.
- **Field errors and conflicts.** A Sponsor-style count error appears under How many as "One representative co-files: set how many to 1 to 1." A 409 shows "Changed by someone else … Reload their version".
- **Reviewer role.** The reviewer gets "Show" only: no select and no Edit button. A PATCH as the reviewer returns 403.
- **Accessibility.** axe is clean in the read, editing and error states. Each select is named "Filing for <person>". Tab order runs How many → Filing → Remove for each row.
- **Saving keeps modes (BR-8).** Save, Undo, and remove-then-add all keep the mode.
- **Release check.** The release line now blocks: Review shows "1 error (block submission) · People · Filing for Child: Filing not set: choose how … A new release needs it." This closes n2's words.
- **Sample fix.** The `wp.family` child is now `files_own` (Sample). The non-strict loader works out `applies` (`studio.ts:221`).

## Issues

### Major
1. **M1. n3 is not met in the app: the people step says Done while its release line blocks.** `setup-checklist.ts:127` adds the Fix item from `s.problems`. The live caller passes `draftProblems = [...structure, ...validate(...)]` (`api/src/programs.ts:163`), and that list never includes `filingProblems`. Only `StudioService.problems` adds them (`studio.ts:386`).
   - Walked on `wp.family` with the child's mode cleared and saved:
     - The setup strip shows "Step 2, Done: Who can be in this application".
     - The next step is "Official pages".
     - The header's Missing list says nothing about the filing.
     - Meanwhile Review shows the blocking error.
   - The board's needs-work frame ("Also listed under 'Missing before firms can use it: Filing for Child'. The release waits for it.") is therefore not true either. The line itself shows only "⚠ Filing not set".
   - No test covers this. `check_setup_checklist` passes because it feeds a synthetic People problem.
   - **Fix:** add `filingProblems(participants, roles)` to `draftProblems` and `relProblems` in `programs.ts`, so the strip and the missing list get it. Add an API or browser assertion that the people step has "Fix 1 problem" linking to `people:card`.
2. **M2. The Representative can be set to "Files the sponsorship".** P-233: "the Sponsor shows 'Files the sponsorship', the Representative 'Files nothing'". Board frame 1 shows the Representative with fixed words, and concept §4 says "fixed words for others".
   - `FilingCell` (`questionnaires.tsx:165`) offers `co_files` to every never-applicant role.
   - Walked on Visitor visa: Add person › Representative, then "Files the sponsorship". At 1 to 1 this saves (`{"role":"representative","filingMode":"co_files"}`). The preview then says "Representative: the sponsorship (cannot be sent alone) · cannot be split", so every Visitor visa case would get a sponsorship filed by the firm.
   - **Fix:** offer the co-filing choice only on the Sponsor line. The Representative shows fixed "Files nothing". Ideally the strict save also refuses `co_files` on a role other than the sponsor, with a pass/fail test.
3. **M3. Phone editing: Save and "Add a person" sit off-screen at 375 and 400 px.**
   - The cards fit in the read view, as the builder's check shows. In editing, the Add-person row overflows by 56 px at 375 and 31 px at 400, and the footer (Fill from the guide · Cancel · Save) by 2–3 px. Only the "S" of Save is visible (my 375 px card screenshots on `fs.outside` and `vv.single`).
   - Concept §6 lists 375 px for the editor, and the builder's 375 check runs only on the read view.
   - **Fix:** let the editing footer and the Add-person row wrap (`flex-wrap`, `min-w-0` on the select), and run the 375 check in editing too.

### Minor
- **m1. Folded line has no modes.** Board frame 3 and concept §4 show "folded one-liner with modes" ("Child 0–4 (own)"). The line still reads "Child (travelling), 0–4 (optional)" (`peopleWords`).
- **m2. "Rules check on Save … every applicant role has a filing" is not a Save check.** Choosing "Choose how it is filed" saves, and the release blocks later. Reword to "…a new release needs a filing for every applicant role", or refuse on Save.
- **m3. Words.**
  - "Spouse or partner (travelling)'s application" in the preview.
  - "Fees not worked out yet for Applicant outside Canada" and "… for With an LMIA" name only the combination's leaf label. The board says "for Spouse sponsorship". Use the program and the combination.
  - At 375 px the selects cut their text: "Files the sponsorship (sent w…", "On the principal's applicatior".
- **m4. Stale comment.** `api/src/studio.ts:384` still says "a warning until the editor can set the mode".
- **m5. Leftover field in the sample.** `programs.json` `wp.family` child keeps `"applies": false` next to `files_own`. It is harmless, because the loader works `applies` out, but it is contradictory. It also makes the child an applicant who gets their own forms. That is a Sample immigration choice: record it in ASSUMPTIONS (C1).
- **m6. Read-only after release.** The board's "Release N carries these filings. Change them in the next draft; open cases keep Release N." is not shown. Drafts stay editable, so this is low impact.
- **m7. Preview split flag.** `previewFilings` sets `splittable: out.length > 1 && !coFiled` (`filing-modes.ts`). The case rule after PR 2 n1 is different (`filings.ts:154`): a group is splittable when it holds another own filing. A sponsorship combination with a Files-own family member would say "cannot be split" in the preview, while the case allows a split. None of the samples hit this.

## D1–D20 (this PR's screen)
D1 concept fit 3 (M1, M2) · D2 words 4 (m3) · D3 states 3 (needs work, folded and released partly missing) · D4 BRs 4 · D5 keyboard 5 · D6 a11y 5 (axe clean, names) · D7 sizes 3 (M3) · D8 feedback 5 · D9 data 4 (M2) · D10 errors 5 · D11 conflict 5 · D12 roles 5 · D13 speed 5 · D14 look 4 · D15 code 4 (M1 path) · D16 tests 3 (n3 and phone editing untested) · D17 simulated only · D18 trust/Sample 5 · D19 retrofit recorded (build-notes) 5 · D20 simulated only.

## Could not check
A real screen reader (names checked through the DOM and axe only). Real browser zoom: CSS zoom does not trigger the 760 px rule, so I emulated 200 % of 1024 with a 512 px viewport, and the cards fit there in both read and editing. An intended user walking it unaided (D17, D20).

**Journey score: 8 / 10** (passes; see the journey report).

**Verdict: Block.** Fix M1 (Fix item and missing list fed with the filing problems, with a test), M2 (co-filing only on the Sponsor line; the Representative fixed "Files nothing") and M3 (phone editing footer and Add-person row wrap, with the 375 check run in editing). Then re-review the new head. Minors m1–m7 can go in the PR body.

## Round 2 (re-check on `806e7f11`; delta `636237ba..806e7f11`, PR 3's own files only)
I left out the files that came from main through the merge of `2a8c1087`, such as the Fill-from-the-guide mode labels. I rebuilt the web app and used fresh copies on :4442, :4445 and :4446.

| Round 1 | Round 2 | Evidence |
|---|---|---|
| M1 people step shows Done while its filing line blocks | **Closed** | `programs.ts:166` adds `filingProblems` to `draftProblems`; released snapshots are not re-judged, as BR-7 says pinned releases are kept. `check_c1112_prepare_api` passed 30/30, including "n3 pass/fail" through `GET …/summary`. Live on `wp.family` after I cleared the child's mode on the screen: "Step 2, To do · Fix 1 problem". The link lands on Forms with focus on `people:card`. |
| M2 Representative could file the sponsorship | **Closed** | `FilingCell` offers co-filing only on the `sponsor` line; any other never-applicant role reads fixed "Files nothing" with no select. Live: an added Representative on Visitor visa has no Filing select. On `fs.outside` the Sponsor select is "Files nothing / Files the sponsorship…". `people.ts:44` refuses co-filing on any role other than the sponsor ("…only the sponsor files the sponsorship."). `check_c1112_modes` passed 42/42 with the new fail case. |
| M3 Save off-screen when editing on a phone | **Closed** | The Add-person row and the Cancel/Save group wrap (`min-w-0`, `flex-wrap`, `max-w-full`), and long labels wrap (`overflow-wrap:anywhere`). Live on `fs.outside` editing at 375 px: overflow 0, axe clean. The browser check passed 17/17, including "375, editing: Save whole on screen" and the 1024 px 60-character label. |
| m2 the Save footnote | Closed | Now reads "every applicant role needs a filing before release". |
| m4 stale comment | Closed | `studio.ts:383` |
| m7 preview split flag | Closed | `filing-modes.ts:126` uses the case's split rule (from `2a8c1087`). |
| m1, m3, m5, m6 | Open, Minor | Accepted in the PR body. m5 is to be stated there as Sample. |

**New, Minor:**
- **r2-n1.** `checkPeople` now refuses `co_files` on a non-sponsor role for non-strict callers too, such as the sample loader and New combination. BR-3 says those callers drop a mode rather than refuse it. No stored line has one (the screen never merged with the old choice), so this is only a note for the PR body.
- **r2-n2.** The role key `"sponsor"` is now named in code in two places: the screen and `people.ts`. That is acceptable while the shared library has no "may co-file" marker, and is worth a line in the PR body.
- **r2-n3.** While editing, a newly added Representative reads "Answered by: Themselves" until it is saved, then "The firm". This predates PR 3.

The screenshots and the `05-375-editing.png` file rewritten by my run of the browser check were restored, so the tree is clean.

**Journey score round 2: 9.5 / 10.** Next step obvious rises to 1 (the Fix item lands on the card), correct data to 1 (only the sponsor co-files), and accessibility and screen sizes to 1 (phone editing fits). Plain words stays at ½ (m3). Visual quality is 1, unchanged.

**Verdict: Approve** for `806e7f11`. No Blocker or Major is open. Minors m1, m3, m5, m6 and r2-n1 to r2-n3 go in the PR body.
