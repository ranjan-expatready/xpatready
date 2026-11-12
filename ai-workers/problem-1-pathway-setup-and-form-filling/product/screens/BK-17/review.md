# BK-17 review: a recorded filing keeps its label and document (PR #1612)

Reviewer (fresh context, did not build it), 12 Nov 2026. I reviewed exactly `0646a9071` (`git rev-parse HEAD`) against `origin/main`. Row (P-486, P-481): BK-15 breaker B3/M3. There is no concept.md; the row and the break report are the concept. Copy `rv_bk17` on :4439 (stopped after the review), live AI off, US$0.

**Verdict: Block** (one open Major, M1). Journey score: **7/10**, below the bar (`journey-test-reviewer-2026-11-12.md`).

## What I ran (exit codes)
* `check_bk17_recorded_filing_api.ts 4439 xr_studio_rv_bk17`: 17/17, exit 0.
* `check_bk17_keep_recorded.ts` (pure): 12/12, exit 0.
* Regression on the same copy, all exit 0:
  * `check_b152_recorded_fees_api` 20/20
  * `check_c82_record_api` 71/71
  * `check_bk9_shared_filing_api` 16/16
  * `check_c1112_prepare_api` 29/29
  * `check_b164_no_engine_keys` 52/52
* `graph.mjs`: exit 0.
* Reviewer probes, kept in the scratchpad: A (split-out child), B (record made before BK-17), C (20 reads at once).
* Browser journey replay: 11/14; the 3 failures are M1 (2) and one wrong check of my own (the answer did change, confirmed in the database).
* Not re-run: the builder's "9/17 on main's code" (that would need a second copy; only :4439 is mine) and the builder's browser walk.

## What holds
* **The row's own case holds.** Both recorded, then the answer changes (through the Agent view in the browser):
  * same ids, labels, numbers, people and items;
  * no filing or item made inactive, no applicant row added;
  * GET …/prepare and GET …/filings agree.
* **The other way round holds too.** Recorded with No, then Yes: no new application is made for the child.
* **Unrecorded cases are worked out as before** (control).
* **Concurrency.** The write path takes `FOR NO KEY UPDATE` on the case row and reads `rec` from rows read again under that lock. Record checks version, people and answers under the same lock, so the stored label agrees with the answers. 20 reads at once after the change all give 200, with one version and no duplicate rows.
* **Version is stable.** A fully recorded case plans nothing (`plan` is empty), so a read writes nothing.
* **BR-12 is kept.** The items of a recorded filing are kept, so the after-filing checks still find the forms that were filed.
* **No pathway-specific code.** No combination key, form number or role branch in the diff (P-319, P-425). The only literal is the role fallback `"principal"`. The labels are stored in `recorded_fees` JSON, so no migration is needed.

## Issues
**M1, Major (Must).** A travelling person whom the derivation now puts onto a recorded application they are not on ends up on no application, and the screen says they are not travelling. This is the builder's gap (a), confirmed in the browser.
* **Steps:**
  1. Study permit (outside Canada), student and child of 15; the child's "6 months or more" is Yes.
  2. Split the child's filing out with a reason.
  3. Make both Ready to file, then record only the student's group.
  4. Change the child's answer to No.
* **Result:**
  * People and filings reads "Sample Child Q · No filing: not travelling" (`filing-changes.tsx:70`).
  * `people[].filing` is null, `why` is null, `not_filing` is empty.
  * The child's unrecorded Ready to file filing is made inactive, with no items and no readiness entry. Any fee lines for the child would sit on the student's frozen group and are dropped.
  * Case readiness shows only the recorded filing, so the case reads as fully filed. An officer would not file the child's application.
* **Cause:** `case-prepare.ts:219` (`ownerOf` sends the child to a recorded owner, which `wantKeys` and `keepRecorded` then exclude) and `submission-record.ts:124`.
* **Why Major:** main shows this wrongly but visibly (the child appears on the recorded filing). BK-17 hides the person and puts false words in their place.
* **Fix:** a person not on a recorded filing whom the derivation would put on one keeps a filing of their own (their existing unrecorded row stays active; otherwise one is made with the derived or "<combination>: <name>" label). At the least, they are listed in `not_filing` with a true reason that the screen shows. Add a passing and a failing check to `check_bk17_recorded_filing_api.ts`.

**m1, Minor (Should).** A recorded group's header and `why` still follow the answers: `keepRecorded` keeps the derived group's `label` and `why` (`submission-record.ts:126`). In M1's case the recorded one-person submission reads "One submission for 2 people applying" (`j2-submission-1440`). In the row's own case, the derived `why` becomes "One application for the family." while two applications are listed (read from `engine/runtime/filings.ts:320-324`, not seen on screen). **Fix:** work out the count and `why` of a recorded group from its recorded filings.

**m2, Minor (Should).** This is gap (b), confirmed (probe B). For a record made before BK-17, after an answer moved the child:
* the reactivated filing reads "Outside Canada: Sample Child B", not the "Study permit: Sample Child B" it was recorded with: the relabel this row removes;
* its items stay inactive, so it shows 0 items and `ready: false` with 0 blocks;
* `recordedOverlay` skips its filed forms (`if (!item) continue`), so no "Filed with an earlier value" task can open for them.

Minor because it needs a record made before this PR plus a later answer that moves the filing, and BK-15 is not merged. **Fix:** reactivate a recorded filing's items with it (they are the recorded ones), and say in the PR that a record made before BK-17 shows the derived label.

**m3, Minor (Should).** The fee check passes without testing anything (D16). On the configured checkpoint `sp.outside` has no fee lines, so the check "the frozen fees stay" compares `{groups:[[id,null]],lines:[]}` with itself. Neither that check nor the two new fee filters (`case-prepare.ts` `derivedFees … inView`, `case-filings.ts` `fees: d.fees.filter`) fails if the rule is removed. **Fix:** assert `fees_worked_out === true` and at least one line before comparing, on data with fee lines (or a stored `recorded_fees` with lines).

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | Partly | The row's case holds; M1 is a new loss next to it. |
| D2 Data integrity | Partly | No duplicates under 20 reads at once; M1 deactivates a live filing. |
| D3 Reuse | Met | One `keepRecorded` serves both routes. |
| D4 Rule integrity | Partly | M1: a person has no filing and no reason. |
| D5 Stability | Met | Reload, reads at once, Yes again restores. |
| D6 Freshness | N/A | |
| D7 AI trust | N/A | No AI. |
| D8 Orientation | Met | Unchanged. |
| D9 Flow | Partly | M1: no next step for the child. |
| D10 Language | Partly | "No filing: not travelling" is false (M1). |
| D11 Feedback/state | Partly | m1: the group header is wrong. |
| D12 Visual | Met | No UI change. |
| D13 Accessibility | Met | axe 0; 1024 and 400 px; keyboard. 200 % not tried. |
| D14 Team look | Met | Unchanged. |
| D15 Speed | Partly | Case page 1.4–2.7 s; not caused by this row. |
| D16 Testability | Partly | Pass/fail cases present; fees vacuous (m3); M1 untested. |
| D17 First use | Simulated only | |
| D18 Provenance | Met | The record and its numbers are shown. |
| D19 Closure | Partly | M1. |
| D20 Wow | Simulated only | |

## BIC (EXPERIENCE §6; this row changes no screen, so only the checks it touches)
| Check | Score | Evidence |
|---|---|---|
| BIC-08 Case structure at a glance | Partly | J1 correct (`j1-3-after-1440`); J2 child missing (`j2-people-1440`). |
| BIC-16 Submission recorded events | Met | Recorded reads recorded after the change (J1). |
| BIC-18 States drawn | Partly | J2 shows "not travelling" instead of the true state. |
| BIC-19 Low load | Met | Unchanged. |
| BIC-20 Accessible | Met | axe 0, keyboard reaches the panel, 1024 px (`j1-after-1024`); 200 % not tried. |
| BIC-01–07, 09–15, 17 | N/A | No questionnaire, document, review or channel change in this row. |

**Could not check:** the builder's 9/17 on main's code (a second copy needed); 200 % zoom; a screen reader; an intended user's walk. Screenshots are in the reviewer's scratchpad (not committed).

**To fix before Approve:** M1. Should: m1, m2, m3.

## Round 2: re-review of `8b09dbc76` (diff `0646a9071..8b09dbc76` only)

**Copy.** `rv_bk17` on :4439, started from a clean tree at `8b09dbc76`, stopped after the review. Live AI off, US$0.

**What I ran (exit codes).**
* `check_bk17_recorded_filing_api` 24/24 (exit 0). Its B2 check reads the stage route: 200, with the child's application listed as unrecorded.
* `check_bk17_keep_recorded` 21/21 (exit 0).
* Regression on the same copy, all exit 0:
  * `check_b152_recorded_fees_api` 20/20
  * `check_c82_record_api` 71/71
  * `check_bk9_shared_filing_api` 16/16
  * `check_c1112_prepare_api` 29/29
  * `check_b164_no_engine_keys` 52/52
* `tsc -p api/tsconfig.json`: 15 errors, none in the BK-17 files.
* My probe was rewritten for round 2 (the round 1 scripts were gone from the scratchpad). It covered three cases:
  * M1's split case: No → Yes, 15 reads at once, and the case page in the browser;
  * a record made before BK-17;
  * the route set as listed above.

**My round 1 findings.**
* **M1: fixed.** The case: the student's group is recorded and the child's split-out group is not; the child's answer changes to No.
  * The child keeps their own application: same row, active, Ready to file, 4 items, a readiness entry.
  * People and filings reads "Own application · Ready to file" (no more "No filing: not travelling").
  * Submission to IRCC lists the child's group with "Record the submission…".
  * GET …/filings agrees.
  * Yes again restores the derived label.
  * 15 reads at once: one version, 200, no new rows (2 filings, 2 groups). A second read gives the same version, and there are no page errors.
* **m1: fixed for a group holding a recorded filing.** The one-person recorded group reads "One submission", with "Recorded as submitted to IRCC: it reads as it was recorded."
* **m2: fixed for the items.** A record made before BK-17 is reactivated with its filed form items (2 of its 4 items), and readiness is now `ready: true`. Its label still reads "Outside Canada: …", as the PR now states (a record made before BK-17 stored no label). I accept that as a stated limitation.
* **m3: fixed in pure checks.** `feesOnTheirFilings` now has pass, fail and control cases with real fee lines. The route check names its limit: there are no Study permit (outside Canada) fee lines on the checkpoint.

**Left open. All Minor; none blocks.**
* **r2-m1: the kept application is relabelled.** Before No, the child's kept, unrecorded application reads "Study permit: Sample Child A". After No it reads "Outside Canada: Sample Child A", while its items are still the study permit forms. It is not recorded, so this is not the row's rule, but it is confusing. If that group is then recorded, the label is frozen. (The breaker found the same; `submission-record.ts:122`.)
* **r2-m2: the new group words are not on screen.** "Kept as prepared: …" and "Fees not worked out here: …" are in the API `why` only; no panel renders `groups[].why`. A group with `total_cents: null` would show no total and no reason. This is not reachable with shipped data (Study permit (outside Canada) has no fee lines on main).
* **r2-m3: the mirror case.** The child's group is recorded and the student's is not. The unrecorded family group keeps its derived count and why (the breaker's B3 note; `submission-record.ts:134`).

**Verdict: Approve** for commit `8b09dbc76`: no Blocker or Major is open. r2-m1 to r2-m3 are Should, for a later row.

**Note.** At 05:06 UTC, after my runs, another session left uncommitted edits in this tree to:
* `case-prepare.ts`, `case-filings.ts` and `submission-record.ts`;
* both BK-17 tests;
* `break-report.md`.

They are not part of `8b09dbc76`, and I did not review them.

## Round 3 (diff-only): `git diff 8b09dbc76..d69657a08`

**Copy.** `rv_bk17` on :4439, from a clean tree at `d69657a08`, stopped after the review. Live AI off, US$0.

**What I ran (exit codes).**
* `check_bk17_keep_recorded` 25/25 (exit 0).
* `check_bk17_recorded_filing_api` 24/24 (exit 0).
* `check_b152_recorded_fees_api` 20/20 (exit 0).
* `check_c612_fees_browser` 58/58 (exit 0). This one has real Visitor visa fee lines, with nothing held.
* My round 2 probe, again (exit 0). It covers the split child after No, 15 reads at once, the case page, and the version.

**Findings.**
* **r2-m1: fixed.** The child's kept application reads "Application kept as prepared: Sample Child A" on …/prepare and on Submission to IRCC. It is no longer named after the combination.
  * Its group says "Kept as prepared: …".
  * Its 4 items and its readiness stay.
  * 15 reads at once give one version and 200.
  * There are no page errors.
* **r2-m3: fixed in pure checks.** An unrecorded group whose applying people differ from the derivation's is named for the people on it (`submission-record.ts`, `differs`). The pure mirror check and its control pass. I did not walk the mirror case on the copy.
* **Guard: correct.** `feesOnTheirFilings` now treats only the people on kept rows as "off".
  * With nothing recorded, `keepRecorded` returns the derivation unchanged, and no line or total changes. c612 (real fees) and b152 stay green.
  * Lines are now kept by `!off.includes(l)` rather than `on(l)`. That only changes cases with something held.
* **No new pathway-specific code** in the diff (P-319, P-425).

**Still open. Minor; none blocks.**
* r2-m2: the group words are in the API only (listed for a later row).
* If the kept application is then recorded, "Application kept as prepared: <name>" becomes its recorded label. That label is honest, but it names no document.

**Verdict: Approve** for commit `d69657a08`: no Blocker or Major is open.

## Round 4 (diff-only, cb24bd7c8..af157ce4d)

Fresh reviewer (did not build it), 12 Nov 2026. Head `af157ce4d` (`git log --oneline -3`). Scope: the merge of main `e7988ea5c` and the test set-up commit `af157ce4d`. Copy `rt_bk17rv` on :4438 only, stopped and dropped after the review. Live AI off, US$0, no priced button.

**What I ran (exit codes).**
* `check_bk17_recorded_filing_api 4438 xr_studio_rt_bk17rv` on the branch: 26/26 (exit 0). The child's frozen `study_permit` line reads 15000 before and after, and the group total is 47000.
* The same check on **main's product code**: 20/26. The 4 files came from `origin/main`, the new test was kept, and the server ran from a scratch mirror on the same port and a fresh database. The working tree was not touched (`git status` clean). The 6 red steps match the builder's claim:
  * (1) "read as recorded" and "never relabelled" (main relabels the child "Visitor visa");
  * the stored `recorded_fees.labels`;
  * GET …/filings;
  * (2) both "other way" steps (main relabels to "Study permit: Sample Child N").
* `check_bk17_keep_recorded` (pure): 25/25 (exit 0). The file is unchanged since cb24bd7c8.
* Regression on the merged code, same copy, all exit 0:
  * `check_bk15_study_family_api` 15/15
  * `check_b152_recorded_fees_api` 20/20
  * `check_bk9_shared_filing_api` 16/16
  * `check_c82_record_api` 71/71
  * `check_bk15_fees_by_role` 38/38 (pure)
  * `check_bk16_children_when` 21/21 (pure)
* `tsc -p api/tsconfig.json`: 15 errors, none in the 4 BK-17 files (the same count as round 2).

**The merge (`e7988ea5c`) has no hand edits.**
* `git show --cc` and `git show --remerge-diff` are empty.
* `git merge-tree --write-tree cb24bd7c8 3ea36a0d3` gives tree `221efcd1f…`, which equals `e7988ea5c^{tree}`. The merge is exactly git's automatic result.
* Main changed none of `case-prepare.ts`, `case-filings.ts`, `submission-record.ts` or `submission.ts`: `git diff 348fa8b11 3ea36a0d3` on them is empty.
* The PR's changed lines in those files are identical before and after the merge (149+/27-, `diff` of the +/- lines is empty).

**Main's new behaviour is consistent with BK-17.**
* BK-15 (`engine/filing-modes.ts`, `engine/runtime/filings.ts`): a child on a `files_own` line whose rule holds gets the added filing *instead of* their own, with the same id `filing-<subject>`. Otherwise the child gets "Visitor visa" (`fees_by_role`).
* So an answer now relabels the same row, and BK-17's `keepRecorded` (keyed by the stored row) holds the recorded label both ways. The 6 steps that are red on main and green on the branch prove it.
* Nothing in main reads or writes a recorded filing's label or people. No main test records a Study permit case and then changes the answer.

**The B1 claim is true on current data.**
* `samples/conditional-filings.json` holds the only `addsFiling` (sp.outside, role child). `085-conditional-filings.ts` sets only that line.
* sp.outside's modes put every role on `files_own` (`samples/fee-table.json`). The control case confirms it on the copy: after No, the child has their own "Visitor visa" filing, 2 filings.
* No answer can therefore put a person onto someone else's filing. A move needs a line that both adds a filing and has the `principal` mode, and no released line does. Remove, Add back and Make principal are refused on a recorded case (BR-7).

**What holds in the new set-up.** No assertion is removed without a replacement, and none is weakened against its target.
* (1) The new fee step has a real guard (`kidSp(before0).length === 1`). Round 1's m3 is no longer vacuous at route level. Both fee steps also pass on main (frozen fees came with b152), and they are named "pass", not fail-first, which is honest.
* (2) is stronger than before: it adds the frozen fees and the child's own label.
* (3) adds the student's recorded row read as recorded.
* (4) asserts the relabel with the same id.
* The header comment matches what is asserted.

**Findings.**

**r4-m1, Minor (Should): the route check for breaks B1 and B2 no longer fails on the bug, and three of its steps are still named after B2.**
* On main's product code every case (3) step passes (6/6, seen above). Case (3) is now a guard that an unrecorded application follows the answers. It no longer exercises the B1 path.
* The steps "fail (break B2)" / "pass (break B2)" (`check_bk17_recorded_filing_api.ts`, case (3)) name a break whose cause they cannot reproduce.
* The sync wiring that fixed B1 and B2 is now proven by no test. That wiring is `case-prepare.ts:214-224`: `keptRowsOf` feeds `keep`/`ownerOf`, so the row is not made inactive and the stage still lists it. The pure check covers only `keptRowsOf`/`keepRecorded`.
* Not Major: the path is unreachable on current data, and the builder states it.
* **Fix:** rename those steps (e.g. "unrecorded beside recorded"). In the test header, say that the sync wiring of B1/B2 has no fail-first route case until a released line both adds a filing and puts the person on another's application.

**Journey score.** I did not walk it again this round: there is no product or UI change in the PR's own diff, and the merge is git's automatic result. The last journey record is round 1's 7/10 at `0646a9071`, and its Major (M1) was fixed and approved in rounds 2-3. There is no new score for this check.

**Could not check:** a browser walk of main's new screens (outside this diff); 200 % zoom; a screen reader.

**Verdict: Approve** for commit `af157ce4d`: no Blocker or Major is open. r4-m1 is a Should; r2-m2 is still listed for a later row.

### Round 4 follow-up (aa6dd85ad)

Diff-only: `git diff af157ce4d aa6dd85ad -- …/tests/check_bk17_recorded_filing_api.ts`. Only names and comments changed (word diff: 6 replacements). Every assertion expression is the same.
* **r4-m1: fixed.**
  * The three case (3) steps that were named "break B2" now read "unrecorded beside recorded". No step name mentions B1 or B2 any more.
  * Case (3)'s comment says it keeps the breaker's set-up but no longer reaches B1/B2.
  * The header says case (3) passes on main's code too. It says the sync wiring (`keptRowsOf` feeding sync in `case-prepare.ts`: the kept row stays active and the stage still lists it) is proven by no test until a line can again move a person onto another filing.
  * These words match what I measured in round 4.
* **Re-run** on :4438, a fresh copy at `aa6dd85ad`, stopped and dropped afterwards, US$0: `check_bk17_recorded_filing_api` 26/26 (exit 0).

**Verdict: Approve** for commit `aa6dd85ad`: no Blocker or Major is open. r2-m2 is still listed for a later row.
