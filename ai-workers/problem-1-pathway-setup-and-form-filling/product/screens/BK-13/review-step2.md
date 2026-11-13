# Review: PR #1695, BK-13 step 2 ("Study permit by data, the zero-code run")

Reviewer (Opus, did not build it), 13 Nov 2026. Commit reviewed: `4ac54e63e0d3bacf6e49791915f33902ad129cc0` (branch `claude/tender-lovelace-l322er`, merge base `origin/main` ff0c2ef90). Scope: `git diff origin/main...4ac54e63e`: 6 data/test/record files and one PNG. Nothing under `engine/`, `api/src/`, `web/src/` or `prototype/p5/` (confirmed). I judged it as a data, test and record PR, against AGENTS.md rules 4 and 5, WAY-OF-WORKING "Every PR" and RULES P-449, P-452, P-541. I did not re-open the tech lead's rulings on #1695 (Lead 35, Lead 36). I checked that the PR follows them.

## What I ran
- **Re-run:** `isolated.sh rev_bk13 4454` (never :4400), then `check_bk13_zero_code_run.ts 4454 xr_studio_rev_bk13`. Result: **37/45 pass, 8 GAP (BK-22: 5, BK-23: 3), 0 FAIL, exit 0.** This matches run7.log and the record. Live AI was off; cost US$0.
- **Database and API on that copy:**
  - Every by-hand box's `why` is `step "…" is not in the executable set`.
  - Fee lines: study permit 150 (student); work permit 155 and open work permit holder 100 (spouse); visitor visa 100 (child); biometrics 85 + 85, plus 0 for the child, exempt "Under 14" and citing its own source ("a child under the age of 14; …"). One group, total 67500 cents.
  - Each of the 4 parents has 8 of 8 questions answered.
- **Static checks:** `graph.mjs --check` exit 0. `run-suites.sh --list` includes `check_bk13_zero_code_run.ts`. `select-suites.mjs` picks it for `p5/transforms.ts` and `engine/runtime/team.ts`, and picks ALL for `api/src/fill-case.ts`.
- **Not run by me:** `check_bk12_sample_case.ts` (the PR reports 34/34). I read its diff: it keeps its pass and fail checks, and the Visitor visa assertions are unchanged.
- **Journey test (journey-test skill):** not run. No screen is in scope here, and my brief limits me to this file. I looked at the walk screenshot only. Journey score: N/A.

## What holds
- **Tech lead's rulings:** implemented honestly.
  - `gap()` (script l.41-44) gives GAP only when the named cause holds; anything else goes through `ok()` as FAIL and exits 1 (l.179).
  - By hand → BK-22 only when every reason is "is not in the executable set". This is not vacuous: the API's `by_hand` and the DB's `result = "by hand"` boxes come from the same boxes (`api/src/fill-case.ts:302`).
  - Read-back → BK-22 only when no written field reads back empty (l.141).
  - "Needs a fix" → BK-23 only when the fact is `person.phone_number` on the representative (l.148).
  - The script reports "Not met" while any GAP remains (l.178), so a mislabelled GAP can never count as exit (b).
- **Seeded rows:**
  - Form rules and their `who` are checked against `form-setup.json` (7).
  - The cited documents are checked against `documentsCited` plus the CAQ line (6).
  - A published map is checked for each of the 8 form lines.
  - Each person's exact form set is checked as a string, which is strong.
- **Data (rules 4 and 5):**
  - Every value of the family case is made up and labelled Sample in `label`, `about` and `source`: SAMPLE names, `example.com` emails, `Z70000xx` passports, the parents fixture.
  - There is no real person, and no IRCC value is presented as confirmed.
  - Ages match the record: 30, 31 and 9 on 13 Nov 2026.
  - The Visitor visa entry in `sample-cases.json` (and its `sample-family-imm5257.json`) is untouched.
- **Record:** most of its claims match the output: 37/45, the copies table, CAD 675 and its breakdown, the 8 GAP rows and their rows. The non-word-for-word quotes (rows 4, 5) and the Sample points are listed.

## Blocker
**B1. Check 1 turns every code PR that selects this suite red, including BK-22 and BK-23 themselves.**
- **Where:** `tests/check_bk13_zero_code_run.ts:48-51`.
- **Why it fails in CI:** the script's usage line makes it a CI suite (run-suites lists it). In CI, `pr-base.sh` rebuilds the test merge on main. So `origin/main...HEAD` is *the PR under test's own change*, not BK-13's.
- **Which PRs it hits:**
  - `select-suites.mjs` picks this suite for `prototype/p5/transforms.ts` (BK-22) and `engine/runtime/team.ts` (BK-23). Those PRs change those files, so check 1 FAILs and the script exits 1.
  - An `api/src` change selects ALL, so the same happens there.
  - The merge queue's full set fails the same way on any batch that holds a code PR.
- **Shown on history:** treat main's merge a3c016b41 (#1678) as HEAD with its first parent as `origin/main`. Check 1's diff then lists 5 code files: FAIL.
- **Effect:** the rows the ruling says must merge first could not pass their own checks.
- **On fresh main:** check 1 is trivially empty, so on the counted run it proves nothing either way.
- **Fix (without changing the ruling's "re-run unchanged on fresh main"):** scope check 1 to BK-13's own change. Options:
  - Diff a fixed, recorded range: BK-13's base and its data commit(s).
  - Or report it as WAIT/informational when HEAD is not this row's branch.
  - Or move it out of the suite into the record's §6 evidence.

  Whichever you choose, say in the record that the evidence for "no code change" is this PR's diff, together with BK-22 and BK-23 being the only code rows before the counted run.

## Major
**M1. The fee check can pass with no fee lines, or with a person's line missing (P-449: "checked, not assumed").**
- **Where:** l.161-170.
- **Problem:** `expected` is built from `fees` itself (`n = fees.filter(key…)`). An empty `fees` gives `wrong = []`, expected 0 and total 0, so the check PASSes (given `fees_worked_out` and one group). If the child's `visitor_visa` line, or the spouse's `open_work_permit_holder` line, were dropped, total and expected would both fall by the same amount, and it would still PASS.
- **Also untested:** the family-maximum path the comment describes ("carried whole by the principal … exempt 'Family Rate'") is not exercised in this run. Biometrics here is 85 + 85 + 0 (age).
- **Fix:** derive the expected lines from the people and the table, not from the output. For example, assert these lines exist:
  - study_permit for the principal;
  - work_permit and open_work_permit_holder for the spouse;
  - visitor_visa for the child;
  - biometrics for each of the 3 people, with the child age-exempt;

  and assert `fees.length > 0`. Or assert the per-key line counts and the total of CAD 675 directly.

## Minors
1. **Record §3, C1 table, IMM 1295 is wrong.** It names `code_list:imm1295.marital_status(…)`, which is not among the copy's by-hand reasons. It omits `code_list:imm1295.work_permit_type(…)` and `code_list:imm1295.province(…)`, which are there and come from this PR's new `case.work_permit_type` and `case.intended_work_province`. As written it lists 11 reasons for 12 boxes (DB query on my copy).
2. **Record §4 "The 8 GAPs, word for word"** gives the C4 detail as `["Area code and telephone number: person.phone_number"]`. The output is `["The representative: Area code and telephone number: person.phone_number"]` (run7.log and my run).
3. **Record §5 dates.** It says every IRCC value is cited with page, quote and date, but:
   - Row 9 (IMM 5409: "Guide 5269, Step 2") has no date. Its Guide 5269 part has no page beyond the step.
   - Rows 8 and 10 cite Guide 5269 undated; only their IMM 5483 (08-2025) half has a date.

   Fix: add the guide's date (modified 2026-10-06, as in rows 12-13), or list these rows under "not fully cited".
4. **Record §5, rows 1-5.** The status says "Cited", while the quoted `checked` text still says "amounts Sample until the immigration expert confirms (P-171)". Row 5's quote is a "summary of the Lead-checked record". Under P-541 (no expert booked), say which applies: cited, or Sample and listed. Row 5 is listed as not word for word, but its status column still says "Cited".
5. **Classification regex is broader than C1's named cause.** `/is not in the executable set/` (l.147) also matches `p5/transforms.ts:141` (`record selection "…" is not in the executable set`). Tighten it to `/^step ".*" is not in the executable set$/`.
6. **Vacuity guards** (all are fine on this run):
   - Generation and read-back (l.136, l.141) pass with 0 written fields.
   - `badChoice` passes if the reader returns no choices; the reader skips repeating rows.
   - The parents check (l.98-111) passes if no fixture fact is asked (`continue`) and nothing is confirmed.

   Fix: assert counts > 0 (written > 0; per relative, answered > 0).
7. **The `until(...)` result is ignored (l.132).** WAY-OF-WORKING says "a wait a test relies on fails loudly when it times out". Today the next check fails on status without naming the timeout.
8. **Some checks only look for presence, not equality with the data:**
   - The document check tests that `source_quote` is present, not that it equals the data file's quote (l.76).
   - `cites()` (l.162) accepts the main quote on an age-exempt line. The age line should cite its own exempt source, which it does today.
9. **Walk screenshot.** `01-case-1440.png` stops at the Documents header. The forms and CAD 675 that the record says the page names are not visible. Add a full-page shot or reword the record.
10. **Record §6** lists 6 files; the diff has 7 (with the PNG). The check labels name the row (`BK-13`), not capability IDs (WAY-OF-WORKING "check labels name the capability IDs they prove"). Name one where one applies, or say none does.

## Could not check
- canada.ca is not reachable from here, so I took the quotes from the committed data, as the record says.
- I did not run `check_bk12_sample_case.ts`.
- I did not watch CI on this PR: it is a draft, so the full check has not run. B1 comes from the suite-selection logic and git, not from an observed CI run.
- No journey test (not a screen).

Fix list for Approve: B1, M1. Minors 1-4 are record corrections and cheap to fold in.

Verdict: Block 4ac54e63e0d3bacf6e49791915f33902ad129cc0
