# BK-13 step 1 review: Study permit rows as data + dry-run record (Bake exit (b), S6)

**Commit reviewed:** 5ce20369a (PR #1574, branch claude/optimistic-noether-kid3v8; diff `origin/main...5ce20369a`, merge base 68a7b59d1).
**Reviewer:** fresh session, 11 Nov 2026 (screen-review + journey-test, reviewer role). The app was not started (per the brief) and :4400 was not used. US$0.
**Scope:** data and records only, with no UI. BIC-01–20 and the UI dimensions do not apply. Checked against AGENTS rule 4, WAY-OF-WORKING "Guards", P-449/P-452, B164, bake plan row 27 and E4, and squeeze S6.

## Verdict: Block (1 Major)

## Major
**M1. Money: the Study permit's fee data contradicts its own seeded child rule. A child who does not study is charged CAD 150, and a child who studies leaves the case with no total.**
- **The seeded rule.** The seeded release gives the child line a conditional filing: `samples/conditional-filings.json` sp.outside adds "Study permit" only when `person.studies_six_months_or_more` is true. ASSUMPTIONS B5 says the same ("will this child study 6 months or more?" decides a study permit filing).
- **How this PR charges a child.**
  - This PR puts `study_permit` (per_person_by_role, roles include `child`) on sp.outside, with `child: on_principal`.
  - `engine/runtime/filings.ts` (`ofRole`, around line 290) therefore charges every travelling child on the principal's application.
  - The added filing names no `fee`. `unpricedAdded` then empties `priced`.
- **What I measured** (pure `deriveFilings`, release modes passed, student of 30, children of 15 and 9):
  - **No child studies:** study permit 3 × CAD 150 = CAD 450, total CAD 620. That is CAD 300 of study-permit fees for two children who, by the product's own rule, file no study permit.
  - **The child of 15 studies (rule holds):** `fees_worked_out: false`, "…its line does not name this combination's fee lines for it…, so no fee is charged on this case". The words are honest, but the case has no total.
- **Other places that get this wrong.**
  - The fee-table note itself says "a child who does not study needs another permit or none", yet the data charges the study permit fee.
  - The new pass test `check_r2_fee_table.ts` ("two children … CAD 150 per person", expecting 450_00) builds the overcharge into the test suite.
  - The dry run (§1 "fees … all work from data", §4) tested only a single student and does not list this gap.
  - E4 and S6 require fees "checked against the seeded `sp.outside` rows, not assumed", and this seeded row was not checked.
- **Fix, without a Study permit branch:**
  1. Name the added filing's fee lines in data: `"fee": ["study_permit", "biometrics"]` on sp.outside's `addsFiling`. This prices the studying child.
  2. Make sure a child whose rule does not hold is not charged `study_permit`. If data alone cannot express this (today any line that reaches `child` charges every on-principal child), record it in the dry run as general code gap **C5**: "a person whose line can add a filing pays that filing's per-person lines only through it". Until C5 lands, either keep sp.outside's total not worked out for a case with a child, or get the Lead's ruling on the PR. Never show a wrong total (BR-10).
  3. Tests, each with a pass and a fail case: a non-studying child is not charged CAD 150; a studying child is priced CAD 150 + biometrics; a single student still pays CAD 235.

## Minors (fix or list in the PR)
- **m1. The test label claims more than the test checks.** The test "…biometrics family maximum CAD 170 (the child of 9 is under 14, so exempt)" also passes with the exemption removed or the cap removed. I re-ran the case three ways: no exemption, CAD 170; no cap, CAD 170; neither, CAD 255. Only two people pay, so the cap never binds (`cap_applied: false`). Use ≥3 payers to test the cap, and assert the 9-year-old's exempt fee row. Also, "modes repeat the seeded release rows (wave1.json)" compares against a hard-coded literal. Read `samples/wave1.json` instead, so the test catches drift.
- **m2. Unrecorded conflict with Guide 5269.** Guide 5269, the source the PR cites for `group_why`, also says "Family members must complete their own application forms." That conflicts with the seeded `child: on_principal`. The amount does not change: it stays per person either way. But by AGENTS rule 2 the conflict goes to the founder or the immigration expert, not silently. Add it as a D-gap (it relates to ASSUMPTIONS C1, confidence 65).
- **m3. New Sample choices without ASSUMPTIONS rows** (the Guard requires a row the same day; the register is the Lead's, so list them in the PR):
  - PAL/TAL is always asked. That includes Québec, where IMM 5483 item 6's note says the updated CAQ "includes information about the provincial attestation letter". The PAL line could read the same province fact, in data.
  - The author's province value list.
  - The child fee from M1.
- **m4. Accent.** The answer label is "Quebec", while the quote, `conditionPlain` and the question say "Québec". "Québec" gives the same code (`quebec`, which I checked with `answerValues`), so the fix is safe.

## Verified (no finding)
1. **Quotes are word for word.**
   - IMM 5483 items 5, 6 and 7 match `pdftotext -layout` of `official-sources/ircc/checklists/imm5483e.pdf`. Page 2 is correct, and the PDF's ModDate is 2025-08-11.
   - All five Guide 5269 quotes match the tag-stripped `guide-5269.html`: "There are two types of fees…", "Application (per person) $CAN Study permit (including extensions) 150", "Biometrics (per person)", "Biometrics (per family) (2 or more people) Maximum fee…same time and place", and "You must apply for their study permit at the same time as your own." `dcterms.modified` is 2026-10-06.
   - No quote is inexact.
2. **Fee lines and modes.**
   - The modes equal the wave1.json sp.outside participants (principal files_own, child on_principal; no spouse line). The release's modes win (`filings.ts:243`).
   - Single student: CAD 150 + 85 = 235, correct.
   - Biometrics: family maximum CAD 170 from 2 people, and under 14 exempt (the line's own data).
   - Apart from M1, there are no money mistakes.
3. **The CAQ condition key matches.** `answerValues("code", ["Quebec","Another province or territory"])` gives `quebec` / `another_province_or_territory`. The condition uses `"quebec"` and the Sample answer uses `another_province_or_territory`. `ruleValuesKnown` would refuse a mismatch at the add step.
4. **Dry-run file:line spot checks at 68a7b59d1 all hold.**
   - `p5/transforms.ts:113,135,138,173,177,187,191-194,199`. For example, `\b` after `national_number` does not match before `_`. `whole_dollars` and `street_line` are absent.
   - `sample-case.ts:129-141` answers only case/everyone/people/one job row; `sample-cases.ts:48` has no relatives.
   - `325-conditional-documents.ts:65` uses `valueType: "code"`, and `:75` has `repeats: "per_person"`.
   - `team.ts:115` writes the phone as a plain string; `fill-trials.ts:52` is `trialFor`; `review-runs.ts:68` is SI-6; `form-values.ts:7` imports `runTransform`; `fill-case.ts:92`; `case-checklist.ts:142`.
   - `prototype/p5/` is outside B164's `DIRS = ["engine","api/src"]`, so §8 Q1 is well founded.
   - C1-C4 are each framed as general rows. None is a Study permit branch.
5. **No code change.** `git diff --stat` shows 0 lines under `studio/engine`, `api/src`, `web/src`, `contracts`, `prisma`, `packages/xfa-engine` and `prototype/p5`. `check_b164_no_engine_keys.ts` passes 51/51, and the allow-list is unchanged.
6. **Sample data.** It is made up and labelled Sample ("SAMPLE STUDENT", `example.com`, `O000000000000`, "SAMPLE AVENUE"). The phone follows the existing 98000000xx precedent. There are no personal names, and the legal-point label is present.
7. **Tests** (PR tree, Node 24):
   - The two named suites pass and exit 0: `check_r2_fee_table.ts` 90/90 and `check_bk10_form_rules_data.ts` 20/20.
   - Also passing: `check_bk8_biometrics_ages` 19/19, `check_c1112_modes` 49/49, `runtime/check_vv_filings` 61/61, `runtime/check_added_filings` 56/56, `check_g1_source_register` 53/53.

## Dimensions (data row; others N/A: no UI)
| Dimension | Score | Evidence |
|---|---|---|
| D1 Requirement fit | Partly | Row 27 data entered and cited. The E4/S6 check against the seeded rows missed the child rule (M1). |
| D2 Data integrity | Partly | Wrong child fee (M1). |
| D4 Rule integrity | Met | The CAQ rule resolves (keys match), and both values were tried in the dry run. |
| D6 Freshness | Met | Every row has page, quote and date, plus "Sample, Unconfirmed: expert". |
| D16 Testability | Partly | m1: two label claims are untested, and one pass test encodes M1. |
| D18 Provenance | Met | Quotes are exact (item 1 above). |
| D19 Closure | Not judged | The dry run counts for nothing (S6). |
| D17 / D20 | Simulated only | Founder. |

## Journey score (reviewer role): 5.8/10, Fail (the "correct data" criterion is 0)
- **Method:** no UI changed and the app was not started (per the brief), so the journeys were walked through `deriveFilings`/`answerValues` on the PR's data. This is not a full journey test. There is no separate journey report because the brief allows writing only this file.
- **Journeys walked:**
  - a single student (CAD 235);
  - a student with two non-studying children (CAD 620, wrong);
  - a student with a studying child (not worked out);
  - the CAQ condition for Québec vs another province (key match).
- **Scores** (6 applicable criteria, 3.5/6, scaled to 10):

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Works for a single student; not for a family. |
| Plain words | 1 | Fee "why" lines read plainly. |
| Feedback and state | ½ | |
| Correct data | **0** | M1. |
| Error recovery | ½ | Unpriced words honest; not seen on screen. |
| Trust and sources | 1 | |

- **Not applicable (no UI):** next step, accessibility, speed, visual quality.
- **To raise the score:** fix M1, then m1.

## Could not check
- The live dry-run numbers (59/0 answers; IMM 1294 62/11/11; IMM 5707 ready, 22 written): these need an isolated copy and the checkpoint load, which the brief rules out.
- `check_bk12_sample_case.ts` and `check_m3_c1_expected_lines.ts`: they need a running copy or database.
- `run-suites.sh --changed`.
- The IRCC fee list page itself: the biometrics amounts rest on the existing line's citation.

## Re-review on 864484a8d (diff-only: `git diff 5ce20369a 864484a8d`)

**Verdict: Approve** (no open Blocker or Major).

- **M1: closed.** `fee-table.json` and `check_r2_fee_table.ts` are identical to origin/main (0 diff lines), so `rulesFrom(FEE_TABLE, "sp.outside")` is `undefined` and the Study permit's fees are "not worked out", as on main. No wrong total can show (BR-10).
- **The new record claims match the code at 68a7b59d1.**
  - `filings.ts:276-280`: an added filing is priced only by the lines it names; none named → `unpricedAdded` → `priced = []`.
  - `filings.ts:297`: a payer without an added filing is counted by `ofRole`.
  - The CAD 450 / CAD 620 figures are the ones I measured.
  - C5/R-e is framed as a general row (a person whose line can add a filing), not a Study permit branch.
- **D8's quote is word for word** in the saved `guide-5269.html` (tag-stripped).
- **m1:** moot (those tests are reverted).
- **m3:** closed by ASSUMPTIONS C12-C14. Their content is accurate; re-scoring the top line is left to the Lead.
- **m4:** closed. `answerValues` on ["Québec", …] gives `quebec`, which the condition and the Sample answer use.
- **Code and test runs.** Still no change under engine, api/src, web/src, packages or p5. On the new head:

  | Suite | Result |
  |---|---|
  | `check_r2_fee_table` | 87/87 |
  | `check_bk10_form_rules_data` | 20/20 |
  | `check_b164_no_engine_keys` | 51/51 |
  | `runtime/check_added_filings` | 56/56 |

- **New Minor (n1, records; fix or list in the PR).** Dry-run §6 D7 still reads "A child on the student's application pays the study permit fee per person (Sample)". Its "Where" is "`samples/fee-table.json` sp.outside note", and that note no longer says this: the fee lines are not entered. Reword D7 as the expert's question only ("what a non-studying child needs"), or fold it into D8/C5.
- **Journey score (re-walk, same method): 8/10, Pass.**
  - Correct data is now 1: no wrong total for any family; fees are said not worked out.
  - Task completed ½: fees are deferred to R-e by design.
  - Feedback and state ½.
  - Error recovery ½.
  - Plain words 1; trust and sources 1.
  - That is 5/6 applicable criteria, 8.3 → 8/10.
- **Could not check:** the same items as above (the live dry-run numbers, the DB-backed suites, `run-suites.sh`).
