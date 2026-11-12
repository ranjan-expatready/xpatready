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
