# QA-144 slice 3: independent review of 901f3134 (PR #879, runtime lane, Study permit outside Canada)

Reviewer: a fresh context that did not build this. Date: 4 Nov 2026. US$0: live AI off, no priced button, ports 4432–4433 only. Diff reviewed: `git diff ba0bd37f..901f3134` (slice 1's head is the base). Copies `rv_sp3` (4432, branch) and `rv_sp3b` (4433, a scratch worktree for the baselines and mutations) were stopped, and both databases were dropped. The scratch worktree was removed.

## Verdict (screen-review): Ship after fixes. **Verdict: Block** 901f3134
Open: 0 Blockers, 1 Major (M1), 4 Minors. Apart from M1 the slice holds, so the re-review can be diff-only.

## What I ran
* `check_qa144_sp_release` on the branch (4432): **24/24**. The load took 31 s, and the study permit got release 1 (`1|user-B|user-A`).
* The same check on slice 1's code (ba0bd37f, 4433): **9/24**, with no study permit released. So it fails without this slice. main lacks slice 1, so it fails there too; I did not run it on main itself.
* `check_qa144_vv_release`:
  * at ba0bd37f: **28/28**;
  * on the branch: **25/28**. The builder reported 24/28, probably a run-to-run difference; the three reds are the same R2-M1 checks;
  * on the branch with #878's `form-part-placements.ts` (bf9bdf12) laid over it: **25/28**. The only fact left in all three reds is `person.minor_studying_without_parent`. With that file, `check_qa144_sp_release` is still 24/24.
* `check_c10_1_configured` (4432): **30/30**, including the new row-10 line.
* `acceptance/C10.1.test.ts` (4432): **14/23**. Part A passes in full. The 9 reds are all part B, which waits on the Visitor visa's release (IRM 0002) and With an LMIA's (slice 2).
* Mutations (scratch worktree only), each caught by the check:
  * without the one-marital-list guard (`demo.ts:494`): 19/24, and the Visitor visa gets "Fix 7 problems";
  * without the option-code rule: 21/24, and the study permit is not released.
* My Playwright walk (scratchpad only). As the author: Demo › Load the configured checkpoint… › Load (32 s). Then the study permit's Overview, Forms, SQR, Preview and Review at 1440, 1024 and 400 px, with axe on each tab, then keyboard only, then the Visitor visa's SQR and Preview.
* `graph.mjs` (run in the worktree, so the repository's GRAPH.md is untouched): no gap from this slice. It adds no route and no page.
* CI for 901f3134: the shards were still queued or running when I finished, so I saw no result.

## Issues
**M1 (Major, Must). `api/src/demo.ts:564-568`: IMM 5646's fact is asked of every Visitor visa applicant**
* The loader places `person.minor_studying_without_parent` beside the date of birth, in `personal_details`. That is a shared library section the Visitor visa has chosen.
* A Visitor visa preview for a single adult principal (born 1990) shows the question "Whether the person is 17 years of age or less and comes to Canada to study without an accompanying parent…", with the reason `asked in "Personal details", a section this row selects`.
* This breaks the brief's Done-when ("no regression on the Visitor visa"). It is also why `check_qa144_vv_release` stays at 25/28 even with #878.
* **The builder's analysis on #879 is right.** R2-m1 as #878 builds it re-checks other combinations only for `touched`, the sections its own run placed into (bf9bdf12, `form-part-placements.ts`). The rule fact is placed after `placeFromFormParts` returns, so nothing ever re-checks it. Slice 1's `GENDER_FACT` has the same gap, latent until a second combination chooses that section.
* **The recommendation is sound.** #878 exposes the re-check (`alsoTouched`, or an exported `recheckChosen`), and slice 3 calls it once after its rule-fact placements, for both facts. That is the smallest fix, and it keeps the file slice 2 owns untouched.
* Fix (not R2-m1 itself): once #878 exposes the re-check, add that call here and show `check_qa144_vv_release` at 28/28. The tech lead decides the order (#878 first, or this PR waits). CI runs the VV check, so this PR cannot go green before then anyway.

**Minors (Should)**
* **m1. The release depends on an option-map edit no screen offers.**
  * Without the rule, the study permit is not released (mutation above).
  * No web code calls `/editions/:id/option-maps`. qa's 2026-11-01 VV baseline lists this as G3: "drafted and corrected only by API".
  * So the comments at `demo.ts:576` ("as the Form library's button does") and `:581` ("Set as a person would on the Form library") are not accurate. Also, `forms.ts:230` (`draftOptionMaps`) replaces any map that differs from its own draft, so a later draft would undo the 05.
  * The rule itself is sound, US$0 and uses no AI:
    * it acts only on the same fact and the same set of codes;
    * it needs every other form to agree on one code, and that code must be unused on this form;
    * it goes through `setOptionMap`, which checks values and codes on the server and writes an audit line.
  * I checked the codes in the PDFs' XFA lists. IMM 1294's `MaritalStatusList` has `lic="05"` "Separated", and IMM 5257's has `lic="05"` "Legally Separated".
  * Fix: correct the two comments. Ask the tech lead to note on the forms row that the study permit's release now relies on G3.
* **m2. Guide 5269's date (`demo.ts:65`).** "last modified 27 Oct 2026" is the server's `Last-Modified` header (manifest `server_last_modified`). The page's own date is 2026-10-06 (`dcterms.modified`, "Page details 2026-10-06"). P-170 asks for the page's date, which is how slice 1 cites Guide 5256 ("modified 2026-03-31").
* **m3. `SP_FAMILY_CITE` (`demo.ts:82`) is never read.**
  * The study permit's IMM 5707 line is set from `FAMILY_FORM_BY_CHANNEL.paper`, whose cite is the Visitor visa checklist IMM 5484.
  * Like slice 1, no cite reaches the line on screen. `saveForm` gets none, and the Review tab shows IMM 1294's "IRCC's words" as "IMM 1294 (06-2026) page on canada.ca, checked 21 Oct 2026".
  * Fix: use the constant where the family form's cite is chosen, or remove it.
* **m4. Ordering ties in the placement step, slice 2's file (`form-part-placements.ts:43`).** The query orders by `createdAt` only, and the rules-pass proposals share a millisecond. So between my baseline and branch runs, six Visitor visa facts the conditional forms read landed in different sections, from identical proposals: `case.representative_form_action` (section_c, then section_e) and five IMM 5409 facts (section4, then section5). None of those sections is chosen, so this is harmless today. It is not caused by this slice. Fix: add `identityKey` to the order, as `demo.ts:493` already does.
* Nit: the IMM 5409 quote leaves out the link label "(opens in a new tab)" that sits between "(IMM 5409)" and ", if applicable".

## What held (evidence)
* **The Visitor visa behaves the same (the refactor).** On ba0bd37f and 901f3134 these are identical for `vv.single`: every form line (mode, status, minimum age, condition, channel, version), every chosen section, every option map on its editions, and `person.marital_status`'s list. On the vv run, `attach` and the skipped retire are no-ops (every line exists). The approval loop does the same work. Within the first combination's filter `!maritalList` is still null, so the same lists are taken as before. The order is pinned: vv's rules pass ran first (vv at 03:08:13.80, sp at 03:08:14.09), and the check asserts the list key.
* **The screens' services only.** The diff adds reads only (`combinationForm.count/findFirst`, `formFieldMap`, `libraryChange`, `sectionQuestion`). The writes go through `FormLibrary.attach` (author, one at a time, refuses the IMM 5483 checklist under C11.11), `saveForm`, `linkAnswerList`, `RuleFacts.add` with `decide`, `decideLibraryChange` (as the Approver), `placeField`, `draftOptionMaps` and `setOptionMap`. There is no SQL write. No library item was decided by `user-A`.
* **US$0.** No LIVE job, the ledger is unchanged, and `cost_usd` is 0.
* **The quotes match the saved sources word for word** (except the nit):
  * Guide 5269: Custodians (both sentences), Step 2's IMM 5707 line, and the IMM 5476 sentence (curly apostrophe included);
  * IMM 5483 (08-2025), all on p. 1: IMM 5707 ("18 years of age or older or a minor travelling alone"), IMM 5476, IMM 5475 and IMM 5646 ("less than 17 years old").
* **The rules work in the preview.** A single adult student files IMM 1294 and IMM 5707 only. A student aged 15 coming without a parent files IMM 5646 and not IMM 5707.
* **The study permit's people** are Student (always) and Representative (optional), as the brief says.
* **Expert notes (Sample, Unconfirmed: expert), declared on #879.**
  * The age split: the guide says 17 or less, the checklist says under 17.
  * The minor travelling alone is not covered: a line has no "or", which I checked in the condition grammar.
  * Also for the expert: Guide 5269 adds that students "between 17 years of age and the age of majority … may need a custodian at the discretion of an immigration officer". The fact's meaning does not cover that.
* **Test quality.** The new check fails without the slice and passes with it. Removing a rule trips its guard (mutations above). Its usage line matches `run-suites.sh:193`, and port 4430 is used by no other usage line.
  * One weak line: "a student aged 15 … files IMM 5646" also passed on the base, where IMM 5646 is mandatory. The adult line covers that case.
  * The check's own no-regression line only looks at the Visitor visa's block. The VV check is what catches M1.

## D1–D20 (1–5; a reviewer's reading of this slice)
D1 4 the study permit is released as the brief asks · D2 3 M1 · D3 4 one shared marital list, sections reused · D4 3 M1 leaks into another combination · D5 4 C10.1 part A passes (409, reset) · D6 4 audit on every service call · D7 4 rules only, US$0, said · D8 4 · D9 3 Forms says "AI found 0 forms" and "A step failed" on a released combination with 6 lines · D10 2 section names "Sub custodian", "Contacts row1", "Section4", "Five" on the SQR (slice 1 m5, carried) · D11 4 rows 7 and 10 name the study permit · D12 4 · D13 4 axe: no violation on the five tabs; no sideways scroll at 400/1024 · D14 4 · D15 3 the SQR opens in 1.14 s (budget < 1 s), the other tabs in 0.7–0.9 s · D16 4 mutations caught · D17 simulated only · D18 4 cites verified (m2, m3) · D19 4 · D20 simulated only.

## Journey test (reviewer role; the one score for this check)
Journeys:
* J1, author: Reset, then Demo › Load the configured checkpoint, then open the Study permit's Overview, Forms, SQR, Preview and Review.
* J2: the Study permit preview as an adult student, and as a student aged 15 alone (through the check).
* J3: the Visitor visa's SQR and Preview after the load (the step across the boundary).
* J4: keyboard only from Overview to Review and release (31 Tabs, then Enter, which opens it). Widths 400, 1024 and 1440.
* J5: a double load, Reset and a wrong role (C10.1 part A).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Released through the Demo menu in 32 s: "Live · Release 1", approved by the Approver |
| Next step obvious | ½ | Forms: "AI found 0 forms" and "A step failed" beside 6 lines; Review still asks to confirm IMM 1294 after the release |
| Plain words | ½ | Section names from the rules pass (D10) |
| Feedback and state | 1 | Rows 7 and 10 name the study permit; Overview shows the release |
| Correct data | ½ | M1: a Visitor visa adult is asked the IMM 5646 minor question |
| Error recovery | 1 | C10.1 part A passes |
| Accessibility and sizes | 1 | axe clean on the five tabs, no sideways scroll at 400/1024, keyboard path works, 0 console errors |
| Speed | ½ | SQR 1.14 s; a 31–32 s load |
| Visual quality | 1 | Team look holds at all three widths |
| Trust and sources | ½ | Quotes verified and Sample labelled, but the guide's words never reach the line on screen (m3), and one date is wrong (m2) |

**Score 7½/10: not a pass (needs 8, and no criterion is at 0).** Fixing M1 lifts Correct data to 1 (8/10). After that, m2 and m3 (trust), then the Forms tab's mixed signals (next step).

**Could not check:** a visible (headed) browser (the walk ran headless, with screenshots in the scratchpad), true 200 % zoom (400 px stood in), a real screen reader, CI's result for 901f3134, and an intended user's unaided walk (D17 and D20 stay with the founder). The three untracked `screenshots/slice3-*.png` that appeared during my review are not mine.

**Verdict: Block** 901f3134
* To fix: M1. After #878 exposes its re-check, call it after the rule-fact placements, then show `check_qa144_vv_release` at 28/28 with `check_qa144_sp_release` still at 24/24.
* m1–m4 and the nit can go with it, or onto the slice 2 row (m4).

## Round 2 (diff-only), 39a88332 and 15955ca9

Reviewer: the same fresh context as round 1, which did not build this. Date: 4 Nov 2026. US$0: live AI off, no priced button, port 4432 only. The copy `rv_sp3` was stopped, and its database and files were removed.
* Diffs reviewed:
  * `git diff origin/main 39a88332 -- …/prototype/studio`: 5 files, +146/−11;
  * the merge resolution, `git diff 39a88332^2 39a88332 -- …/api/src/demo.ts`;
  * `git diff 39a88332 15955ca9`: C10.1 step S10, added at the coordinator's request after gate B refused 39a88332.

### What I ran (4432, the branch)
* `check_qa144_vv_release`: **28/28**, run twice.
* `check_qa144_sp_release`: **24/24**. The load took 29.6 s, and the study permit got release 1 (`1|user-B|user-A`).
* `check_qa144_lmia_release`: **23/23**.
* `check_c10_1_configured`: **32/32**.
* `acceptance/C10.1.test.ts`:
  * at 39a88332: **15/23**. The 8 reds are all part B (the Visitor visa's release, its release 2, the family case, the IMM 5257 fill and the whole-gate row), as the builder reported;
  * at 15955ca9: **16/24, with S10 PASS** and B10 PASS.
* Gate B, locally:
  * I passed that pack output to `gate-b.mjs`'s own `claims` and `packVerdict`;
  * `Capabilities: C10.1 (steps S10)` passes, which is the PR body's line now;
  * a bare `Capabilities: C10.1` is refused with "exit 1", which is why CI's shard 1 failed at 39a88332 (job 126561409401).
* CI for 15955ca9: `types` and `kind` are green. The shards were still running when I finished.
* `tsc -p api/tsconfig.json --noEmit`: no error in `demo.ts` or in any test file this PR touches. There are 24 errors, all in five other test files, and they come from main.
* My Playwright walk (headless, scratchpad only):
  * Reset, then Demo › Load the configured checkpoint › Load, as a person;
  * then the study permit's Overview, Forms, SQR, Preview and Review, and the Visitor visa's SQR and Preview, each at 1440, 1024 and 400 px;
  * axe at 1440 px.
* I did **not** run the coordinator's `SET_UP_FROM_FORMS` mutation for S10. This working copy is shared, so I made no edits here. I read the predicate instead: it is the study permit's own `config_release` row, which does not exist without this slice (round 1: 9/24 at ba0bd37f, with no study permit released).

### Merge resolution (39a88332)
**Nothing of main is dropped.** Against main (`39a88332^2`), the merge takes out 7 lines in `demo.ts`, and each one is replaced by its slice 3 version:
* the "slices 1–2" comment;
* `SET_UP_FROM_FORMS`;
* `FORM_SETUP`'s type (now `& { beside?: string[] }`);
* the "beside" comment;
* the `near` and `beside` lines, now `at = rf.beside ?? […]` (`demo.ts:604`);
* the refusal message.

The rest of main's code stays as it was: `FORM_SETUP`, `keepChosenEveryones`, the attach-from-library step, `maritalList ??=` and `draftOptionMaps`.

### Round-1 findings
* **M1: closed.**
  * In the release check, the R2-M1 lines pass. These are the lines that failed in round 1, and they would fail again if the minor question came back.
  * A Visitor visa preview for a single adult principal (born 1990) asks 126 questions. None is `person.minor_studying_without_parent`, and none has the reason "a section this row selects". The Visitor visa's Preview and SQR tabs never show the question, at any of the three widths.
  * `personal_details` is now chosen on no combination.
  * **This is the mechanism, not luck.** The audit shows the order:
    * `personal_details` was added to the Visitor visa and then removed from it at 07:04:36.79 and .88, by the re-check that follows IRM 0002's fact;
    * after that, IMM 5646's fact was placed at 07:04:37.65.
  * That rule-fact path calls `keepChosenEveryones` with the fact's section (`demo.ts:608`) on every placement. So if the order changed, the study permit's own call would unchoose the section on the Visitor visa.
* **m1: closed by the engine.**
  * `engine/options.ts:27-31` (slice 2) matches a form label that the value's own label ends with, one to one, after every exact match. The unit test is `check_forms_channels.ts:124-128`, which includes the two-values case it refuses.
  * On the load, the audit shows only `drafted` for IMM 1294: "drafted 1 option map … without AI (0 with values left for a person)". It gives `legally_separated → "05"`, and IMM 1294 has no `setOptionMap` line.
  * The loader's own rule and its two inaccurate comments are gone.
  * Carried, not this diff: main's `demo.ts:618` says "as the Form library's button does", but no web code calls the option-map routes (qa's G3).
* **m2: closed.** `demo.ts:77` now reads "canada.ca, modified 2026-10-06, saved 27 Oct 2026".
* **m3: closed** in the form round 1 asked for: `SP_FAMILY_CITE` is removed.
  * Its words now sit in `FORM_SETUP["sp.outside"].family` (`demo.ts:106-107`).
  * Nothing reads that field for any of the three rows: `saveForm` gets no cite (`demo.ts:577-586`). That is main's design, carried from slice 1, so it is not a finding on this diff.
* **m4: open, not in this diff.**
  * `form-part-placements.ts:45` still orders only by `createdAt`.
  * There is more evidence now. At the same commit, row 7 said "219 facts asked" on four loads and "218" on one.
  * It stays on slice 2's row.
* **Nit (IMM 5409 quote): closed.** The quote now has "[...]" where the link label was.

### New findings (this diff)
No Blocker, no Major.
* **n1 (Nit, Should). `acceptance/C10.1.test.ts:59` (15955ca9).**
  * The problem: S10's clause "after the SME's sign-off" counts `review_signoff` rows for the expert across the whole workspace. With an LMIA's sign-off alone would satisfy it.
  * No false pass is possible today. The server's `releaseGate` (`studio.ts:1098-1101`) refuses a release unless its own submission has every expert sign-off. The study permit's submission has `user-C:sme`.
  * Fix (optional): join `review_signoff` to the study permit's `review_submission`.
* **n2 (Nit, Should). `check_qa144_sp_release.ts:99,102`.**
  * The comment and the line's name ("the code IMM 5257 already gives it", "the code IMM 5257 gives") describe the cross-form rule this merge dropped.
  * The code now comes from IMM 1294's own label, through the engine. The assertion (05 and 05) is still right.
  * Fix: reword it to say the match is on IMM 1294's own label.

### D1–D20
Round 1's scores stand, except:
* D2 4 and D4 4: M1 is closed;
* D18 4: m2 and m3 are closed;
* D15 3: the SQR opens in 1.05 s on the study permit and 1.09 s on the Visitor visa (the budget is < 1 s); the other tabs open in 0.69–0.88 s.

D17 and D20 are simulated only.

### Journey test (reviewer role; the one score for this check)
I walked journeys J1–J5 again, against round 1's notes.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | "Live · Release 1"; "Last released: version 1, in Release 1, by Approver" |
| Next step obvious | ½ | Forms tab mixed signals, carried |
| Plain words | ½ | Rules-pass section names (D10), carried |
| Feedback and state | 1 | Rows 7 and 10 name the study permit |
| Correct data | **1** | M1 closed: a Visitor visa adult is asked nothing of IMM 5646 |
| Error recovery | 1 | C10.1 part A passes |
| Accessibility and sizes | 1 | axe finds nothing on the seven tab views; no sideways scroll at 400, 1024 or 1440 px; 0 console or page errors |
| Speed | ½ | SQR 1.05–1.09 s; 29.6–32.1 s load |
| Visual quality | 1 | The team look holds at all three widths |
| Trust and sources | ½ | m2 is fixed, but the guide's words still never reach the line on screen (main-wide) |

**Score 8/10: a pass** (no criterion at 0). Next most valuable: the Forms tab's mixed signals, then the SQR time.

**Could not check:**
* a visible (headed) browser;
* true 200 % zoom;
* a real screen reader;
* the time of the load through the Demo menu. My script waited for the dialog to detach and timed out at 300 s, but the data had loaded. The checks' load times stand in;
* CI's shard results for 15955ca9;
* an intended user's unaided walk.

**Verdict: Approve** 15955ca9 (which contains 39a88332). No Blocker or Major is open. n1, n2 and m4 (slice 2's row) can follow.
