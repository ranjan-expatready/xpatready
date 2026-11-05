# QA-144 slice 4: independent review of b4c17391 (PR #1050, forms lane, Express Entry)

Reviewer: a fresh context that did not build this. Date: 5 Nov 2026. US$0: live AI off, no priced button, no *_LIVE variable, port 4450 only (database `xr_studio_ee`). Diff reviewed: `git diff origin/main...b4c17391f` (base 86b721eac), 11 files, +439/−20.
* While I reviewed, the shared working copy moved from b4c17391 to 86ca0423 (03:47 UTC; not my doing). 86ca0423 changes only the scope lines of `check_qa144_vv_release.ts` and `check_qa144_lmia_release.ts`. The product code is the same in both commits, so every product result below holds for b4c17391.
* The four deleted `prototype/p2/runs/*.json` files in the working tree were there before I started. They are not mine.

## Verdict (screen-review): Ship after fixes. **Verdict: Block**
Open: 0 Blockers, 1 Major (M1), 5 Minors, 3 Nits. The Done-when's own line holds (Submit's 219 refusals are now 1, none of the named kinds). But the Visitor visa loses a chosen section to Express Entry's placements. That turns two merged suites red and makes C4.1 on the configured checkpoint worse than on main.

## What I ran
* `check_qa144_ee_release 4450 xr_studio_ee`: **20/20**. The load took 65 s. Express Entry's only refusal is IMM 0008 DEP's `unknown` marital status code.
* `check_forms_qa144_numbered_headings` (pure): **15/15**.
* `xfa_headings.py` re-run on every `imm*` form, plus `irm0002e.pdf` by name (the default glob skips it): `git status` stayed clean for `prototype/p1`, so the committed headings equal the reader's output. The diff changes only `imm5669e.headings.json`, so the new rule changes no other form.
* `check_qa144_sp_release`: **24/24**. `check_qa144_vv_release`: **29/30**. `check_qa144_lmia_release`: **22/23**. I ran these with 86ca0423's test files (see above); the red lines are in M1.
* `acceptance/C10.1.test.ts`: **19/26**. E10 passes and E10b fails, as the PR claims. The other 5 reds are part B rows 9, 11 and 12 plus the whole-gate line.
* `tsc -p api/tsconfig.json --noEmit`: 15 errors in total, none in a file this PR touches.
* Playwright, headless (scratchpad only). Express Entry's Overview, Forms, SQR, Preview and Review, plus the Visitor visa's SQR, each at 1440, 1024 and 400 px, with axe at 1440 px.
* Reads of the database and audit after a fresh `POST /demo/load {"sample":"configured"}`.
* I did not run `graph.mjs`, so the repository's GRAPH.md is untouched. I did not run C4.8 or C9.1 myself, and I did not see CI for b4c17391: every check run is "skipped" or "neutral" on GitHub.

## Issues
**M1 (Major, Must). Express Entry's placements take the Visitor visa's "Contact information" off its chosen sections.**
* **What happens.** After the load, the Visitor visa has 2 chosen sections: `details_of_visit_to_canada` and `employment`. Main has 3.
* **The order in the audit.**
  * 14.348–14.382: Express Entry's form lines are saved.
  * 14.83–14.97: `person.residential_city`, `person.residential_street_name` and nine more are placed into the shared `contact_information` section, by the placement step at `demo.ts:751` (slice 2's `form-part-placements.ts`).
  * 16.245: "removed the section "Contact information" from the questionnaire of "Visitor visa"". This is R2-m1's re-check (`form-part-placements.ts:117`).
* **Row 7 confirms it.** It says "5 chosen sections unchosen again … (Visitor visa)". The builder's main load says 4.
* **What turns red.**
  * `check_qa144_vv_release`: "placement M2: … at least three, for C4.1's order" fails.
  * `check_qa144_lmia_release`: "R2-m1 fail-guard: the Visitor visa keeps chosen sections (C4.1 can still order them)" fails.
  * At b4c17391's own test files, each check also fails its scope line. The builder's own logs show VV 28/30 and LMIA 21/23; 86ca0423 fixes only the scope lines.
* **C4.1 is worse than main on the checkpoint.** The builder's own side-by-side run (scratchpad `c41cp-br.log` and `c41cp-mn.log`) gives **19/25 on the branch against 25/25 on main**. The first red is "setup: the combination has at least three chosen sections", with `["details_of_visit_to_canada","employment"]`.
* **The PR body undercounts this.** Its "C4.1 25/25 on both" is the blank-copy run. "No regression of the three releases" is true of the releases, not of the Visitor visa's SQR. The Done-when asks for "C4.1 … no worse than main".
* **What still holds.** The re-check is doing its job: a Visitor visa applicant is not asked Express Entry's residential facts. So this is not a wrong-data leak like slice 3's M1. It is a lost demo capability (reordering the Visitor visa's sections after the load) plus two red guards.
* **Fix (the tech lead decides; do not just relax the guards).** Either:
  * Express Entry's IMM 0008 residential-address boxes land in a section of their own, not in the library's "Contact information" that the Visitor visa chose; or
  * a ruling moves C4.1's "three chosen sections" fixture and the two guards to what the checkpoint now gives. Then show VV, LMIA and C4.1 (on the checkpoint) green.

**Minors (Should)**
* **m1. C10.1 E10 reads only the first problem (`acceptance/C10.1.test.ts:65-67`).**
  * Row 10's why is "…: Fix N problems before submitting: P1 · P2 · P3". Splitting on " · " and keeping the fragments that start with Express Entry's label keeps only P1.
  * So E10 passes whenever P1 is not a K1 or unasked-fact refusal, however many such refusals follow it.
  * It fails on main today only because K1 is listed first ("IMM 0008: 22 form fields have no decision…", builder's main load).
  * Fix: assert "Fix 1 problem", or the count of the named kinds from the combination's own problems. The release check is already robust here: it reads the full `errors[]`.
* **m2. IMM 5476 applies to a child of 10 once a representative is used.**
  * Preview: `child-2:true`. The cited page's next sentence says: "If you have dependent children aged 18 years or older, they are required to complete their own copy of this form if a representative is also conducting business on their behalf."
  * A conditional line drops `who` and `minAge` (`demo.ts:721`, `pack2.ts:135`). The same is true on the other three combinations (carried).
  * Fix: add the point to the line's Unconfirmed: expert note, or put it on the forms row.
* **m3. "Your full name" also holds questions 2 and 3.** IMM 5669 prints "2. …native language…" and "3. Your date of birth" as the boxes' own captions, not as text blocks, so the run under "1. Your full name" carries on over them (`imm5669e.headings.json:21,26`). The date of birth sits under a name heading. Fix: a field whose caption is numbered ends the run; or note it for the expert.
* **m4. Sections that repeat a subject on Express Entry's SQR.** A single principal's preview lists:
  * "Membership of association with organizations" (IMM 5669: `person.membership_*`) beside "Membership or Association with Organizations" (`person.organization_*`);
  * "Military and/or paramilitary service" (ranks, combat) beside "Military service" (dates, country). That splits one IMM 5669 table over two sections, because some of its facts were placed already.
  * The quotes are the form's own print, so this is not a misquote. The duplicate facts come from the saved field-map answers. Fix: put it on the forms row (fact dedupe).
* **m5. The problem's words (`engine/channels.ts:140`).**
  * The PDF path is gone, as claimed.
  * But Review now reads "Field map IMM 0008 DEP (10-2024) · IMM 0008 DEP (10-2024): a) Your current marital status (person.marital_status): …". The edition is said twice, and the fact key is still in the words a person reads (S5).
* Nits:
  * The guard list at `check_forms_qa144_numbered_headings.ts:51` leaves out `imm5476e-2021`, `imm5488e`, `imm5532e` and `irm0002e`. My re-run covers them.
  * An unnamed numbered text gives the group `""` (`xfa_headings.py:117`), and its boxes are then dropped silently (`form-masters.ts:106`). No form has one today.
  * The `about` says IMM 0008 DEP is filed for every case. The preview files it for a single principal with no dependants. It is declared for the expert, so it is noted only.

## Question 5 (IMM 0008 DEP and "Unknown"): the builder is right
* **The field's own list has no "Unknown".** In IMM 0008 DEP, the marital status field reads `xfa.datasets.LOVFile.LOV.MaritalStatusList`. In the datasets packet that list holds 09, 03, 04, 05, 01, 02 and 06, with no 00. IMM 0008's list has `00 Unknown`.
* **For the ruling:** the DEP template also carries an unbound script copy named `LOV` that does list `lic="00">Unknown`. No script I found loads it.
* **Leaving the refusal is the honest state.** Inventing a code would break AGENTS rule 4.
* **The claim is the right size.** The Done-when asks only that Submit stop refusing for undecided form fields and unasked facts, so "C10.1 (steps E10)" is right, with E10b red.

## What held (evidence)
* **Each cite matches its saved page word for word, with the right date.**
  * The five quotes match, including IMM 0008's "completed by : you" and IMM 5476's curly "representative’s".
  * The pages' `dcterms.modified` dates match: 2026-09-11, 2025-06-26, 2026-06-03, 2025-06-26 and 2025-12-12.
  * "Recorded 27 Oct 2026" matches `canada/index.json`, which says `recorded_utc 2026-10-27T07:09:42Z`.
  * IMM 5476's "saved 19 Oct 2026" matches the manifest (`downloaded_utc 2026-10-19T12:25:04Z`).
  * All are Sample, Unconfirmed: expert (the file's `about`).
* **Other forms' sections are unchanged.** A group is read only when a headings entry has one (`form-masters.ts:106`), and no other headings file has one (the re-run above and the test guard). Without a group, the anchor is `subH.group ?? child`, as before.
* **Product routes only.** The loader diff only makes the family form optional. Express Entry then goes through the same services as slices 1–3: `masters.draft`, `decide`, `decideLibraryChange` (by the Approver), `attach`, `saveForm`, `ruleFacts.add`, `placeField` and `decideFormField`. There is no new SQL write. No `validated_copy` is made, the ledger is unchanged, and no LIVE job runs.
* **The optional family form breaks nothing.** The Visitor visa, the Study permit and With an LMIA all keep `family`, so `familyForm` and `pack2` act as before. All three are still released, and the SP check is 24/24.
* **P-319.** No added code line names a form or a combination; only comments do. `SET_UP_FROM_FORMS` is now `Object.keys(FORM_SETUP)`.
* **The new checks can fail.**
  * The EE check fails on main: Express Entry is not set up from its forms there, so K1 stays.
  * The pure check's first line fails without a group: its own "no headings file → no section" line shows the wrapper's pages give nothing.

## D1–D20 (1–5; a reviewer's reading of this slice)
D1 3 Done-when met, but C4.1 on the checkpoint is worse (M1) · D2 3 M1 · D3 3 repeated subjects (m4) · D4 3 M1 crosses into the Visitor visa · D5 4 C10.1 part A passes · D6 4 audit on every step · D7 4 rules only, US$0 · D8 4 · D9 3 Overview's next step is "Confirm who can apply"; Forms "33 to do" · D10 3 m3, m5 · D11 4 rows 7 and 10 name Express Entry · D12 4 · D13 4 axe clean on six views · D14 4 · D15 3 the SQR takes 1.8–1.9 s · D16 3 m1 · D17 simulated only · D18 4 cites verified · D19 4 · D20 simulated only.

## Journey test (reviewer role; the one score for this check)
I put it here, as slice 3's review did, because I was asked to write only this file. Journeys:
* J1, author: Reset, then Load the configured checkpoint, then Express Entry's Overview, Forms, SQR, Preview and Review.
* J2: Express Entry's preview for a single principal, and for a principal, a spouse, a child of 19 and a child of 10, with and without a representative.
* J3: the Visitor visa's SQR after the load (the step across the boundary).
* J4: widths 400, 1024 and 1440 px.
* J5: a double load, Reset and an unknown name (C10.1 part A).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Set up from its forms; Submit is down to 1 refusal; not released (waits on the ruling) |
| Next step obvious | ½ | Review names the one problem, but Overview points at "Confirm who can apply" and Forms says "33 to do" |
| Plain words | ½ | m5 (edition twice, fact key shown); m3 |
| Feedback and state | 1 | Rows 7 and 10 name Express Entry; Review "1 to fix" |
| Correct data | ½ | M1 (the Visitor visa loses a chosen section); m2 (IMM 5476 for a child of 10) |
| Error recovery | 1 | C10.1 part A passes |
| Accessibility and sizes | 1 | axe clean on six views; no sideways scroll at any width; 0 console or page errors |
| Speed | ½ | SQR 1.8–1.9 s; a 64–68 s load |
| Visual quality | 1 | The team look holds at all three widths |
| Trust and sources | ½ | Cites verified, but a line's words still never reach the screen (main-wide) |

**Score 7/10: not a pass** (needs 8; no criterion is at 0). Fixing M1 lifts Correct data to 1 (7½). m5 and m3 then lift Plain words (8).

**Could not check:**
* a headed browser, true 200 % zoom, a keyboard-only walk this round, or a screen reader;
* C4.8 and C9.1 myself. The builder's logs show both the same as main (C4.8 7/12, C9.1 17/17);
* C4.1 on the checkpoint myself. I cite the builder's run; my VV result and the audit back it;
* CI for b4c17391 (its check runs are "skipped");
* an intended user's unaided walk (D17 and D20 stay with the founder).

**To fix:** M1, then show these green on the same commit: `check_qa144_vv_release`, `check_qa144_lmia_release`, and C4.1 on the configured checkpoint. m1–m5 can go with it or onto the forms row.

Verdict: Block
