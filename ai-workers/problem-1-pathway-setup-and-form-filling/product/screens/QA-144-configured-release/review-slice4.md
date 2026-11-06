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

## Round 2 (diff-only, a90c36e78)
Same reviewer, 5 Nov 2026. US$0: no *_LIVE variable, no live AI, port 4458 only (`xr_studio_rv2`, stopped and dropped afterwards). Scope: the builder's commits 86ca0423a, 6e31c8f51, bf56b25e7, dffef13b9, 7d11883ab, cea946b2b and a90c36e78, plus the `engine/channels.ts` resolution in merge d9f5c8f5d. The merged-in PRs (B81 #1057, origin/main, qa's #1064) are out of scope except where this code calls into them.

### What I ran
* `check_qa144_ee_release 4458 xr_studio_rv2`: **23/23**. The load took 87.9 s and released all four combinations (VV, SP, LMIA and Express Entry, each at version 1).
* `check_forms_qa144_numbered_headings` (pure): **15/15**.
* `product/tools/typecheck.mjs`: no new type errors (15 known). `route-has-screen.mjs`: 0 mutating routes without a screen.
* Database reads after the load:
  * IMM 0008 DEP's q16 field has one row: `{"map": 7 codes, "notOnForm": ["unknown"], "printed": 7 choices}`. No row maps `unknown`.
  * The audit has one line: "Configuration author set the option map of a) Your current marital status on IMM 0008 DEP (10-2024) (7 values; not on this form: Unknown)".
  * Express Entry's release snapshot carries `notOnForm: ["unknown"]`.
  * The Visitor visa has 2 chosen sections (`details_of_visit_to_canada`, `employment`), as qa's ruling expects.
  * Rules-pass jobs exist only for the four FORM_SETUP keys.
  * `fs.spouse` (the one combination labelled "Spouse or common-law partner") has no release; its draft lists 96 problems.
* Headless Playwright (scratchpad only) on Express Entry's Forms and Review tabs at 1440, 1024 and 400 px:
  * axe WCAG 2.2 A/AA is clean on both tabs at 1440 px. There is no sideways scroll at any width, and no console or page errors.
  * Forms loads in about 1.4 s and Review in about 1.0–1.1 s.
  * Forms shows the B81 warning "IMM 0008 DEP: "Unknown" is marked not on this form on 1 form field: a case with that answer is refused at filling, in words, and a person decides."
* **Not re-run by me** (not on my run list): VV, LMIA and SP release checks, `C10.1.test.ts`, `check_c10_1_configured`, C4.1 on the checkpoint, and the channels check. Their underlying facts are checked above. I could not see CI: the head shows only Mergify's neutral runs.

### The asked points
* **Only the product route: yes.** `demo.ts:801` calls `Forms.setOptionMap`, the same service that `PATCH editions/:id/option-maps` calls (`forms.ts:551`). So it gets the same author check, the same `optionMapRefusals` (a mark on a value the form prints is refused), the same row lock, revision check and audit line. There is no SQL write.
* **The drafted codes are kept: yes.** The step runs right after `draftOptionMaps`. It re-sends the drafted `map` and `unused` with only `notOnForm` added. The check asserts 7 map keys and no `unknown` code.
* **Scope.**
  * The marks come from the combination's own setup (`setup?.notOnForm`) and only for editions in that combination's snapshot.
  * They are filtered by form key and fact (`demo.ts:798-799`), and the check line requires that the only mark workspace-wide is this one.
  * It is scoped by form, not by edition: the cite names 10-2024 (Nit below). A later edition that printed Unknown would be refused, and the refusal would show in words.
  * A refusal goes to `setUpRefused`, which turns row 7 to "partial" with its words. One silent gap remains (r2-m1).
* **The cite is right.** In `prototype/p1/inventory/imm0008depe.inventory.json`, `…q16[0].MaritalStatus[0].MaritalStatus[0]` has the caption "a) Your current marital status" and `options_resolved` Annulled Marriage 09, Common-Law 03, Divorced 04, Legally Separated 05, Married 01, Single 02, Widowed 06, in that order. The field reads `MaritalStatusList`. IMM 0008's own list has `Unknown 00`. The edition labels match the database ("IMM 0008 DEP (10-2024)", "IMM 0008 (05-2026)"). The file's `about` keeps the Sample, Unconfirmed: expert status.
* **channels.ts: both kept.** `git diff 137efd813 d9f5c8f5d -- engine/channels.ts` differs from B81's tip only by the comment and `label: m.form_edition`. The line keeps B81's third argument `listedOf.get(e.fact!)`. `askedChoiceProblems`, the import of `codeAsksMore` and the not-on-this-form warning loop are all intact. Against origin/main the file differs by the same two lines only, and a90c36e78 leaves it as the merge made it.
* **Checks that cannot fail:** none found.
  * E10b, the mark line and the audit line all fail on main (no mark, no Express Entry release).
  * c10_1_configured's new Express Entry line fails on main.
  * The "no code invented" and "at least two sections" lines also pass on main. They are guards that fail if someone invents a code or the Visitor visa drops to one section, which is their job.
  * 86ca0423a's scope lines now compare against `FORM_SETUP`, the loader's own set (P-319). They still fail if any other path runs a rules pass.
* **P-319:** no form or combination number was added to product code. The values live in `samples/form-setup.json`, and `form-setup.ts`/`demo.ts` add only types and a loop. Tests name the form they check, as before.

### Issues
**Blockers:** none. **Majors:** none. M1 is closed by the ruling: qa's #1064 needs two sections, and the two guards now say "at least 2" with the reason beside them (`check_qa144_vv_release.ts:84-87`, `check_qa144_lmia_release.ts:99-101`).

**Minors (Should)**
* **r2-m1. A mark that matches nothing is silent (`api/src/demo.ts:798-800`).**
  * If a `notOnForm` entry's form key or fact matches no edition or no mapped form field (a typo, or a renamed fact), the loop does nothing and adds no `setUpRefused` line. Row 7 stays "done" while the combination later fails Submit for the missing code.
  * This goes against the file's own rule, "an unknown key fails the read, never a rule without its fact" (`form-setup.ts:116`).
  * Today `check_qa144_ee_release` catches it for this one mark only.
  * Fix: push a refusal when a mark's form or fact finds no form field, or check the entries when `fromData` reads them.
* **r2-m2. E10's re-asked Submit is a write route (`acceptance/C10.1.test.ts:66-68`).**
  * The comment says Submit "writes nothing when it refuses". In fact `submit` runs `runKeys` first (`studio.ts:1027`), and that writes `answer_key_run` rows and an audit line whenever the combination has answer keys.
  * On an unreleased draft with no errors, it would also create a submission and withdraw any waiting one.
  * It is reached only when Express Entry is unreleased, so not on this head.
  * Fix: read `draft.problems` from `GET /combinations/:id/review` (read-only), or correct the comment.
* **r2-m3. The refused-draft example is picked by label (`tests/check_c10_1_configured.ts:118`).** It uses `c.label = 'Spouse or common-law partner'`, while the line above uses `combination_key`. Only `fs.spouse` carries that label today. Fix: use `fs.spouse` by key. The regex on row 10's words can keep the label.

**Nits**
* The mark is keyed by form, while its cite is the 10-2024 edition's. This is safe because the product refuses a mark on a printed value. Say it in the cite or the type's comment.
* The cite gives the edition but not the PDF's saved date (P-170 asks for a date). The file's `about` does not yet describe the `notOnForm` key.
* The mark's cite stays in the data file: the B81 route takes no reason, so the product's record and screen show no source. This is B81's design, not this PR's, so I note it and do not ask for scope.

### Journey test, round 2 (reviewer role; the one score for this check)
Journeys: J1 (author) is the configured load, then Express Entry's Forms (the IMM 0008 DEP line and its warnings) and its Review at three widths. J3 is the Visitor visa's chosen sections after the load, read from the database. The rest are unchanged by this diff and carried from round 1.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Express Entry is released (release 1, author → Approver); 23/23 |
| Next step obvious | ½ | Unchanged: Overview "Confirm who can apply", Forms "33 to do" |
| Plain words | ½ | m3 stays, and m5 is a follow-up; the new warning reads plainly |
| Feedback and state | 1 | Forms names the Not on this form mark; row 7 and the audit name it |
| Correct data | 1 | Codes kept, no invented code, the mark is in the release; M1 accepted as designed (m2 is on row B93) |
| Error recovery | 1 | Not touched by the diff; C10.1 part A carried from round 1 |
| Accessibility and sizes | 1 | axe clean on Forms and Review; no sideways scroll at 400, 1024 or 1440 px; 0 errors |
| Speed | ½ | An 88 s load; Forms about 1.4 s |
| Visual quality | 1 | The team look holds at three widths |
| Trust and sources | ½ | The cite is accurate but stays in the data file, not on screen |

**Score 8/10: pass** (no 0). The next lifts: m5 and m3 (Plain words); the Overview's next step (Next step obvious).
**Could not check:** a headed or keyboard-only walk, 200 % zoom, a screen reader, the suites listed above as not re-run, CI on this head, or an intended user's walk (D17 and D20 stay with the founder).

**Verdict: Approve a90c36e78.** No open Blocker or Major. r2-m1 to r2-m3 can go with this PR or onto the forms row.

## Round 3 (diff-only, e4b756667)
Same reviewer, 5 Nov 2026, the last round (P-293 (3)). US$0: no *_LIVE variable, no live AI, port 4458 only (`xr_studio_rv3`, stopped and dropped afterwards). Scope: `git diff a90c36e78 e4b756667`, which is the builder's fix commit e4b756667 plus 7e73527d3, the commit that recorded round 2. The three code changes are `api/src/demo.ts` (+3/−1), `acceptance/C10.1.test.ts` (+3/−3) and `tests/check_c10_1_configured.ts` (+1/−1).

### What I ran
* `acceptance/C10.1.test.ts 4458 xr_studio_rv3`: **23/26**, the same as the builder.
  * E10 and E10b PASS. E10 gives `{"refusals":0,"undecided":0}`: Express Entry is released, so the new GET branch is skipped.
  * R9, R12b and the whole-gate line are red, as on main.
* `check_c10_1_configured`: **39/39**. `check_qa144_ee_release`: **23/23**, with all four combinations at release 1.
* `product/tools/typecheck.mjs`: no new type errors (15 known, 0 fixed).
* **GET compared with Submit on a real refused draft.** After the load, I read `GET /combinations/:id` for `fs.spouse` and then called its Submit (`POST …/submit` as the author, on my own copy only).
  * GET lists 81 errors, 78 of them matching E10's undecided regex. Submit answers 400 with 81 errors, 78 matching.
  * Once `problemWords` adds the item prefix (`contracts/programs.ts:227`), the two lists are identical line for line. Row 10 says "Fix 81 problems" too.
  * The configured load has no answer keys on any combination (`answer_key` count 0). Each draft's Tests lines are warnings ("no answer-key test: allowed only in a Demo release.").
* **Row 7's words after a fresh load:** "partial", only for the 29 held sections, as before this PR. There is no "nothing was marked" line, so the real IMM 0008 DEP mark is found.

### The fixes
* **r2-m1 (`api/src/demo.ts:789, 802, 806`): done, with one wording gap (r3-m1 below).**
  * A `notOnForm` entry whose form or fact finds no mapped form field on a non-Online edition of this combination is now pushed to `setUpRefused`. That turns row 7 to "partial" with its words, which is what the Minor asked.
  * It cannot pass on main: main has no `samples/form-setup.json` and no `notOnForm` step.
  * No check line exercises the new no-match path. Triggering it needs a broken sample entry, and the logic is inline in the loader. This is acceptable for a guard on sample data (Nit).
* **r2-m2 (`acceptance/C10.1.test.ts:66-68`): done.** E10 now reads `body.draft.problems` (level `error`) from `GET /combinations/:id` (`main.ts:62` → `studio.ts:425`). This is a read that writes nothing. `review()` (`studio.ts:1014`), which I named in round 2, returns this same object plus sign-offs, so either route works.
  * **Same blocking problems as Submit?** Yes, for everything E10 tests.
    * Both call `this.problems(workspaceId, snapshot, id, <gate>)` on the same draft snapshot from `buildSnapshot(…, "draft")` (`studio.ts:430/434` and `1024/1028`) and keep `level === "error"`.
    * The K1 undecided lines come from `structureProblems` → `undecidedFormFields(id, "DRAFT")` (`studio.ts:217`). The "nobody is asked for it" lines come from `validate()` (`engine/validate.ts:96`). Neither depends on the gate, so `undecided` is identical on both routes.
    * Both routes use `keyGateOf`, which is `gateOf` imported under another name (`studio.ts:33`). `combination()` passes it to `problems()` as `gate`, the same object Submit builds inline.
  * **The one difference is the answer-key gate's timing.**
    * Submit calls `runKeys` first (`studio.ts:1027`), so its gate judges keys that ran on this draft.
    * GET judges the stored runs. A key not yet run on this draft is a *warning* on GET while the draft is unsubmitted ("…it runs at Submit", `engine/answer-key-gate.ts:61`). At Submit, the same key is PASSED, or an error if it fails.
    * So GET's error list is a subset of Submit's, missing only a key that would fail when first run. In E10, that can only make the line fail falsely (red), never pass falsely. The configured load has no keys, so it does not arise.
    * Submit's "Nothing has changed since the released version" refusal (`studio.ts:1025`) applies only to a released draft, and E10 does not read a released one.
  * **Could it pass on main?** No. Main has no Express Entry in `demo.ts` and no `form-setup.json`, so `!!ee` is false. On this head it can still fail: an unreleased Express Entry with an undecided field, or with no errors at all, fails the line.
* **r2-m3 (`tests/check_c10_1_configured.ts:118`): done.** The line now selects the combination by `combination_key = 'fs.spouse'`, matching the line above it. The regex on row 10's words keeps the label, as asked. As before, the count part does not check that `fs.spouse` exists, but the regex on row 10's words needs it, so the line still fails without it.

### Issues
**Blockers:** none. **Majors:** none.

**Minors (Should)**
* **r3-m1. A refused mark is also reported as "nothing was marked" (`api/src/demo.ts:802, 806`).**
  * `marked.add` runs only after `setOptionMap` succeeds. So when a mark *does* find its form fields but every `setOptionMap` call is refused (in the `catch` at :802), the loop after it (:806) adds a second line: "no form field of … reads …, so nothing was marked". That line is untrue.
  * The real refusal is still listed first and row 7 is still "partial", so the row's status is right. But the false line takes one of the six refusal lines row 7 shows (`demo.ts`, the `slice(0, 6)` in row 7's `why`), and it sends a reader to look for a missing field.
  * This happens only on a failure path, and not on this head.
  * Fix: record the mark as found when `rows.length > 0`, before the `try`, and keep the line at :806 for marks with no field.

**Nits**
* The comment at `C10.1.test.ts:66-67` says "Submit refuses on exactly these". That is true except for an answer key not yet run on the draft, which Submit runs first (see r2-m2 above). Add "an answer key Submit runs first can add a line", or leave it.

### Journey test, round 3 (reviewer role; the one score for this check)
The diff changes no screen, route or word a person sees. It changes a loader refusal on a path not reached on this head, and two test reads. So the round 2 walk (J1 Express Entry's Forms and Review at 400, 1024 and 1440 px, axe, timings; J3 the Visitor visa's sections) stands.
I re-checked the data under it on this head:
* Express Entry is released (release 1, author → Approver), and so are the other three combinations.
* Row 7 names Express Entry. Its only refusal words are the held sections.
* Row 10 gives the validator's words for `fs.spouse` (81 problems).
* GET and Submit agree on that draft's 81 blocking problems.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Four combinations released; 23/23, 39/39 |
| Next step obvious | ½ | Unchanged from round 2 |
| Plain words | ½ | Unchanged (m3, m5); r3-m1's false line is off this head's path |
| Feedback and state | 1 | Row 7 now names a mark that finds nothing (r2-m1) |
| Correct data | 1 | GET and Submit list the same 81 errors on `fs.spouse` |
| Error recovery | 1 | C10.1 part A passes (403s, double load refused, Reset) |
| Accessibility and sizes | 1 | Carried from round 2 (no screen change) |
| Speed | ½ | Load about 90 s, as in round 2 |
| Visual quality | 1 | Carried from round 2 (no screen change) |
| Trust and sources | ½ | Unchanged: the mark's cite stays in the data file |

**Score 8/10: pass** (no 0).
**Could not check:** a headed, keyboard-only or 200 % zoom walk (no screen change in this diff), a screen reader, CI on this head, the r3-m1 path (it needs a refused `setOptionMap` on a found field), or an intended user's walk (D17 and D20 stay with the founder).

**Verdict: Approve e4b756667.** No open Blocker or Major. r2-m1, r2-m2 and r2-m3 are closed. r3-m1 and the Nit can go with this PR or onto the forms row.

## Stack merge check (diff-only, 7a68a0bcc)
Same reviewer, 5 Nov 2026, the stack merge's gate (P-348 (8), Lead 13). US$0: no *_LIVE variable set, no live AI. My own copy on port 4458 only (`xr_studio_rv4`), stopped and dropped afterwards.

**Scope:** the builder's own work since e4b756667:
* bd5e63b60 (r3-m1 and the nit);
* the conflict resolution in merge 37dcac3e2 (`api/src/demo.ts`, `tests/check_c10_1_configured.ts`) and its effect on Express Entry;
* 7a68a0bcc (ruling m19, the scoped B81 mark line).

#1085's and #1062's own commits are out of scope.

### What I ran
* `tests/check_qa144_ee_release.ts 4458 xr_studio_rv4`: **26/26**, exit 0, load 76.9 s. This matches the builder. The three m19 lines give `{"status":"READY","missing":[]}`, 201, and `{"spouse":106,"child19":107,"child10":14}`.
* `tests/check_c10_1_configured.ts 4458 xr_studio_rv4`: **40/40**, exit 0. The builder's run was still going, so this one is new.
* A fresh configured load, rows 7, 9 and 10 read in full:
  * Row 7 is **done** with `why` null. B78 names all 29 held sections, and there is no "nothing was marked" line.
  * Row 9 is **done**: release 2 made, "Unknown" on 13 form fields, one IMM 5645 section waiting for a name (B97's own).
  * Row 10 shows release 1 of all four. Its refused-draft example is `fs.spouse` ("Fix 81 problems").
* `product/tools/typecheck.mjs`: no new type errors (15 known, 0 fixed).
* A BR-8 probe (scratch script, not committed). It calls `engine/programs.ts missingItems` on Express Entry's release 1 snapshot from the database, and on two changed copies of it (results under m19 below).

### 1. bd5e63b60: r3-m1 and the nit, done
* **r3-m1 (`api/src/demo.ts:818-819`).** `marked.add` now runs when `rows.length` is above 0, before the `setOptionMap` loop. The `try` (`:821`) no longer adds to `marked`.
  * A mark that finds its form fields but whose save is refused is now said once, in its own words (the `catch`).
  * The "no form field … reads …, so nothing was marked" line (`:825`) is left only for a mark with no field. That is the fix asked for.
  * As before, no check line drives a refused `setOptionMap`. This was accepted in round 3 as a guard on sample data.
* **Nit (`acceptance/C10.1.test.ts:66-68`).** The comment now says Submit refuses on these after first running the draft's answer keys, which can only add refusals. That matches round 3's r2-m2 reading.

### 2. Merge 37dcac3e2: the resolution is clean
**How I checked it.** I re-ran the merge with `git merge-tree --write-tree bd5e63b60 bb0c092f3`. It conflicts in exactly these two files. Then I diffed that conflicted tree against 37dcac3e2. The only changes are the conflict markers and the dropped sides. No auto-merged line was hand-edited.

**`api/src/demo.ts:42-46`.** This keeps B78's `section-names.ts` import and this PR's `SET_UP_FROM_FORMS = new Set(Object.keys(FORM_SETUP))` (P-319). #1085's three-key literal is dropped. Nothing is duplicated: one import, one `SET_UP_FROM_FORMS`.

**`tests/check_c10_1_configured.ts:115-124`.**
* Kept: this PR's two Express Entry lines (released, approved by user-B; the refused-draft example by `combination_key = 'fs.spouse'`) and B97's three row 9 lines (release 2 made, the 13 marks, the warning).
* Dropped: #1085's old "Express Entry refused" example, and this side's old "row 9 waiting" pair with its comment.
* Row 12's reason for not simulating a copy is still said, in B97's comment at `:119-120`.
* The `ok(` counts add up: 38 lines on this side − 2 + 3 = 39 = 38 on #1085's side − 1 + 2.
* All lines pass (40/40 with the top-level line).

**Auto-merged `demo.ts`: Express Entry still runs with B78 and B97.** One load releases all four combinations at release 1, and the Visitor visa at release 2 (row 10: `…Express Entry stream§1§user-B, Visitor visa§2§user-B`). Draft drift is `[]` (P-319 line).
* Express Entry's section pass now goes through B78's `sectionsFrom` (`demo.ts:706`). That function reads only the runs of the forms it is given (`attachmentId in forms`). Express Entry passes all its filed forms, so it loses nothing.

**Effect on IMM 5669's sections from this PR's numbered headings: none.** From the database after the load:
* All 9 IMM 5669 section proposals are `accepted`. None is `edited`, and none carries `work.unnamed`.
* 7 are new and 2 are reused: Education and Government positions, which were already in the library.
* So B78's `namedTwin` branch (`proposals.ts:850`, only an edit of an unnamed section) and the placement step's new `edited` reading (`form-part-placements.ts:45`) never touch them.
* The placement line still puts IMM 5669's facts in Personal history, Addresses, and Military and/or paramilitary service. `samples/section-names.json` holds no Express Entry form, so B78 names none of Express Entry's sections.

**Where B78 does touch Express Entry: IMM 0008's 7 heading-named held sections.** These are Passport, Language detail ×2, National identity document ×2 and Education/occupation detail ×2.
* They are now `edited`, with a reuse of the library section of the same name (`namedTwin`). Before B78, the loader rejected each one and reused the section.
* Placement used to find that section by title (`byTitle`). It now uses `decidedKey`, which is the same section key, so placement is unchanged.
* IMM 5476's 2 named items behave the same way.

### 3. 7a68a0bcc: ruling m19 and the scoped mark line
**Ruling m19: the check really goes through BR-8, and it can fail.**
* Both routes the check reads go through `missingItems` → `rolesWithoutQuestions` on the release snapshot:
  * the catalogue row: `api/src/programs.ts:231`, then `statusOf`;
  * opening a case: `api/src/runtime.ts:93` → `startableMissing` (`programs.ts:319-325`).
* `applicants` (`engine/programs.ts:23`) does not read `filingMode`. So Express Entry's `on_principal` Spouse and Child are among the roles BR-8 requires. Their filing mode is confirmed in `combination.participants`.
* `previewRender`'s default people are principal, spouse_or_partner, child-1, child-2 and representative. So `people.some(role)` holds for both roles, and they are not dropped as roles the release does not hold.
* My probe on the release 1 snapshot:
  * **As released:** `missingItems` = `[]`. The default render, with no answers, asks spouse_or_partner 106 questions, child-1 107 and child-2 62. These are the same counts the check's Preview reads.
  * **Changed copy A (only the 12 case-level placements kept):** "No questions yet for Principal applicant, Spouse or partner, Child."
  * **Changed copy B (the 108 facts asked of the Spouse unplaced; 70 of 178 placements left):** "No questions yet for Spouse or partner."
* So line 98 (catalogue READY, no `role_without_questions`) and line 100 (201) would fail if either on_principal role were asked nothing. The pass does not come from Preview counts of 0: line 103 asks for more than 20 each, and gets 106 and 107. The builder's conclusion holds: `applicants` needs no fix for Express Entry.

**The B81 mark line (`check_qa144_ee_release.ts:54-56`).** It is now scoped to Express Entry's own forms (`gov_form_def_id` in its unretired `combination_form`). It still reads exactly `IMM 0008 DEP (10-2024)|["unknown"]|7` and needs at least 1 row.
* Excluding IMM 5645 loses nothing. The loader takes Express Entry's marks only from `notOnForm` entries filtered to its own editions (`demo.ts:816`), so they cannot land elsewhere.
* IMM 5645's 13 marks are checked by `check_c10_1_configured.ts:123`.

### Issues
**Blockers:** none. **Majors:** none. **Minors:** none.

**Nits**
* `check_qa144_ee_release.ts:101-103`: the fail-guard reads the draft's Preview, with chosen people and answers. BR-8 reads the release snapshot with its default people and no answers.
  * They agree on this head (106/107 both ways, by my probe), and lines 98 and 100 are the ones that go through BR-8.
  * The comment could say that the Preview line is a guard on the data, not on BR-8 itself. Or leave it.

### Journey test, stack merge (reviewer role; the one score for this check)
**No screen change.** The diff changes no screen, route or word a person sees. The round 2 walk stands: Express Entry's Forms and Review at 400, 1024 and 1440 px, axe, and the timings.

**Re-checked on this head, through the product's routes:**
* Express Entry's catalogue row is Ready with nothing missing.
* The case officer opens a case on its release 1 (201).
* Preview asks the Spouse 106 questions and the child of 19 107.
* Row 7 is now done with no refusal words.
* Row 9 says release 2 and the one IMM 5645 section left for a person.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Four releases, plus the Visitor visa's release 2; 26/26, 40/40 |
| Next step obvious | ½ | Unchanged from round 2 |
| Plain words | ½ | Unchanged (m3, m5); r3-m1's false line is gone |
| Feedback and state | 1 | Row 7 done, `why` null; row 9 names the section left for a person |
| Correct data | 1 | BR-8 empty on the release, and fires for Spouse when the Spouse is asked nothing (probe) |
| Error recovery | 1 | C10.1 configured's refusal lines pass (unknown checkpoint, Reset) |
| Accessibility and sizes | 1 | Carried from round 2 (no screen change) |
| Speed | ½ | Load about 77 s |
| Visual quality | 1 | Carried from round 2 (no screen change) |
| Trust and sources | ½ | Unchanged: the mark's cite stays in the data file |

**Score 8/10: pass** (no 0).

**Could not check:**
* a headed, keyboard-only or 200 % zoom walk (no screen change in this diff);
* a screen reader;
* CI on this head;
* the C10.1 acceptance and the VV, LMIA and SP release checks on this head (the builder's runs are still going);
* an intended user's walk (D17 and D20 stay with the founder).

**Verdict: Approve 7a68a0bcc.** No open Blocker or Major:
* r3-m1 and the nit are closed;
* the merge is resolved with nothing lost or duplicated;
* ruling m19's check really goes through BR-8 and can fail.
