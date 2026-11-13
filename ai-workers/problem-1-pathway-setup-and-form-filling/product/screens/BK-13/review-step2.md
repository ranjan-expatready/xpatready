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

## Round 2 (diff only, P-293): `git diff 4ac54e63e..6a628cf5d`

Reviewer (Opus), 13 Nov 2026. Commit reviewed: `6a628cf5dde7cb8379f876caa15b929c8cd083bb`. The diff touches the script, the record, my round-1 file (committed by the builder, unchanged) and three PNGs. It changes nothing under `engine/`, `api/src/`, `web/src/` or `prototype/p5/`, and no data file. I did not re-run the replay this round. I read run8.log (37/45, 8 GAP, 0 FAIL, exit 0); per the builder, it ran on this script's content.

**B1 (check 1 broke other PRs' CI): fixed.**
- **New check 1 (l.48-58):** reads files, not a diff. It covers the studio's `engine/`, `api/src/` and `web/src/`, plus the three p5 files the studio references (`transforms.ts`, `reader/mrz.ts`, `fill.py`; I checked by grep that these are the only `p5/` paths named there). It fails on any code line that names `sp.outside`, "Study permit", or "IMM 1294" / "IMM 1295" as a whole quoted string.
- **Same result on any commit:** so it no longer FAILs BK-22, BK-23 or the merge queue. It guards against an empty read: `codeFiles.length > 100` (447 read).
- **Independent check:** a raw grep of the same files and patterns, leaving out comment lines, finds 0 hits. This agrees with the script's comment stripping.
- **It is a different property, and the record says so:**
  - The new check shows that no code names the pathway (P-449's intent). It does not show that "this PR changed no code".
  - For that, the record now cites §6 (this PR's diff stat: no code paths).
  - Record §1 says this plainly.

**M1 (fee check could pass with no or missing lines): fixed.**
- **Expected lines come from the inputs, not the output (l.167-195).** Lines are worked out per person from `fee-table.json` `combinations["sp.outside"].fees_by_role`:
  - principal: study_permit, biometrics;
  - spouse: work_permit, open_work_permit_holder, biometrics;
  - child: visitor_visa, biometrics.

  Each person's age comes from the answers file and is checked against the line's exemption.
- **Missing and extra lines** (by key and person) both FAIL.
- **Guards:** `owed.length >= 3` and `expected > 0`.
- **The total** is now derived from the owed lines, not from the output.
- **Per-line rules:**
  - An age-exempt line must be exempt, CAD 0, and cite the exemption's quote.
  - Every other line must cite its own line's quote.
- **Not exercised:** the family-maximum "Family Rate" path is still untouched by this family (biometrics here is 2 × 85, which equals the cap). That is down to the data, and the total still covers it.
- **Result:** run8 shows `missingLines: []`, `extraLines: []`, `wrong: []`, 675 = 675.

**Minors from round 1:**
1. **Record C1 table, IMM 1295:** fixed. It now lists work_permit_type and province and drops marital_status. That matches my round-1 DB query of the copy's 12 by-hand reasons.
2. **GAP lines word for word:** fixed. They now carry "The representative: ", and their row labels match run8.
3. **Guide dates:** fixed. There is a dates note for rows 8-14: Guide 5269 modified 2026-10-06 and saved 27 Oct; IMM 5483 modified 2025-08-11; Guide 5256 saved 19 Oct. Row 9 is cited by its step, because the guide has no page numbers. Acceptable.
4. **Fee rows' status:** fixed.
   - Rows 1-4 are "Cited (P-541: page, quote, date)", with a note that the data's older "Sample until the expert confirms" words predate P-541.
   - Row 5 is now "Not word for word: listed below".
5. **By-hand regex:** fixed. It is anchored as `/^step ".*" is not in the executable set$/s`, so "record selection …" can no longer pass as C1.
6. **Vacuity guards:** fixed.
   - Read-back requires `written > 0` and at least as many values read as written (run8: 65 written, 73 read).
   - Each parent needs at least 5 answers (run8: 8 each).
7. **The wait:** fixed. `until()`'s result is now part of the generation check.
8. **Quotes compared with the data:** fixed for both.
   - Document lines must equal the data file's quote (`documentsCited.quote`, CAQ `sourceQuote`).
   - Fee quotes are exact per line, as above.
9. **Walk screenshots:** fixed.
   - `02-case-forms-1440.png` shows each person's forms (IMM 5707, 1294 and 5476 for the student; IMM 5476, 5707 and 1295 for the spouse, …).
   - `03-case-fees-1440.png` shows each person's fee lines, the child's biometrics at CAD 0 with its quote, "Total for this submission: CAD 675", and the sources.
10. **Capability IDs in labels:** left, with a reason: BK-13 names no capability ID. I accept that; Minor, open. Record §6 now lists the PNGs.

**New findings in this diff:** none at Blocker or Major.
- Minor, not blocking: check 1's comment stripping is a heuristic. For example, a `/*` inside a string literal would hide code up to the next `*/`. My raw grep gives the same zero today. If check 1 ever reports a false zero, read the raw lines first.

**Could not check this round:**
- I did not run the replay myself; I read run8.log.
- I did not watch CI (the PR is a draft).
- No journey test: this is not a screen (as in round 1).

Verdict: Approve 6a628cf5dde7cb8379f876caa15b929c8cd083bb

## Round 3 (fresh reviewer, diff-only)

Reviewer (Opus, fresh: I did not write this change and did not review rounds 1-2), 13 Nov 2026, ruled by the tech lead (Lead 37 on #1695, P-293). Commit reviewed: `84ffbcfb9f225ebf90f00e03d1aa359a936605b0`. I read only `git diff 8d464b026..84ffbcfb9`: the script (19 lines) and the record (2 lines), plus the code around them the diff calls. The diff touches no `engine/`, `api/src/`, `web/src/`, `p5/` or data file.

**What I ran**
- **Fresh run on this head:** isolated copy `rev3_bk13` on :4454, which I started and stopped myself (database brought up first with `cloud-setup.sh`). Result: **37/45, 8 GAP (BK-22: 5, BK-23: 3), 0 FAIL, exit 0**, with by hand 25, "needs a fix" 3 and CAD 675. This is the same as the builder's run10.log. The working tree stayed clean.
- **Not re-run by me:** the branch with #1698 merged in. For that I read run9.log (41/45, 4 GAP: BK-22 0, BK-23 4; 0 FAIL; exit 0) and the batch's failing CI job (job 131996268641).
  - `git diff a87d2cdee 84ffbcfb9` touches only the record, so run9 ran this script.
- **Classifier harness:** I copied `asked`/`rowOf`/`isGap` verbatim and ran them against a real officer view of this case (the builder's `q2.json`, `mode=agent`, with real subject UUIDs).

**(1) The by-hand classifier: holds for the case it was written for.**
- **Each reason maps to exactly one gap, or the check FAILs.** The anchored BK-22 regex is unchanged. The new BK-23 regex is anchored and exact (`^<fact> is not confirmed, so it cannot be compared$`), and matches the filler's own wording (#1698 `p5/transforms.ts:217-218`). Any other reason, or an empty `why`, gives `null`, and a `null` in `handRows` gives FAIL. Harness results:

  | Reasons | Result |
  |---|---|
  | Spouse, `person.current_residence_country` (not asked) | GAP BK-23 |
  | Student, the same fact (asked) | FAIL |
  | BK-22 step + BK-23 fact | GAP "BK-22 … and BK-23 …" |
  | BK-23 + unknown reason | FAIL |
  | `[]` | FAIL |
  | `[""]` | FAIL |

- **It does not pass vacuously.** `handRows.length > 0` is required. `hand` (the API's `by_hand`) and `handWhy` (`result_json.boxes`) come from the same boxes (`api/src/fill-case.ts:302`), so by hand > 0 always means reasons were read.
- **The right subject.** `asked()` uses `f.subject_id`, the same UUIDs as the view's `subjectId` (the case's people are named through the same map).
  - In the view, `person.current_residence_country` is asked, not hidden, of the student and the child, and not of the spouse. This matches the Sample answers file (principal and child "India", spouse none).
  - `hidden` is a real field of the view's questions.
- **The view taken after all answers.** `v` is re-read (l.112) after the last answer PUT. The confirms that follow change no answer and no visibility, and the generation runs after them.

**(2) The GAP counters and the summary line: right.**
- **`includes` is needed.** A by-hand GAP's row can now be "BK-22 (…) and BK-23 (…)". `startsWith` would count that row as BK-22 only.
- **No over-matching.** Check names hold only "BK-13", so `includes` matches nothing in them.
- **Run results:** run9 0 + 4 = 4; run10 and my run 5 + 3 = 8.

**(3) The record's new paragraph: agrees with the evidence.**
- **The FAIL line** is quoted word for word from the CI job.
- **Same 45 checks.** The batch printed `41/45 checks pass; 3 GAP (BK-22: 0, BK-23: 3); 1 FAIL`. With this change the one FAIL becomes the fourth GAP, giving run9's 41/45, 4 GAP, 0 FAIL.
- **The time matches.** The job failed at 16:44 UTC, which is 22:14 IST ("~22:1x IST").
- **The #1702 quote** matches its title.
- **The branch-alone figures** match run10 and my run.
- **The BK-23 note** (the Sample file must answer it for the spouse, or this script FAILs) matches Lead 37 ("goes in BK-23's PR (#1702)").

**Findings (none at Blocker or Major)**
- **Minor m1, the subject of a case-group compared fact.** `asked()` looks only under the person's subject. A `case.*` fact compared by an "A equals B" step would be looked up under the wrong subject. Such a fact is asked under the case's own subject (`case.*` questions sit there in the view). So if it were asked but left unanswered, it would be named a BK-23 GAP instead of a FAIL. The harness confirms this: student + `case.school_name` gives GAP BK-23.
  - **Not reachable today.** The release's only "equals" steps compare person facts. #1698's `factNamed` maps `case.applying_from_country` onto the box's own `person.applying_from_country`, and run9's reason is `person.*`.
  - **No false "Met".** Any GAP still keeps exit (b) "Not met".
  - **Fix when next touched:** look up `case.*` facts under the case's subject (role `case`), or narrow the BK-23 regex to `person\.`.
- **Nit n1, the summary counts.** A by-hand GAP that is both BK-22 and BK-23 is counted under each, so BK-22 + BK-23 can exceed the GAP total. The line does not say so. No run shows it today.

**Could not check:** I did not run the branch with #1698 merged myself (I read run9.log and the CI log), and I did not watch this head's CI. No journey test: this is not a screen (as in rounds 1-2). Journey score: N/A.

Verdict: Approve 84ffbcfb9f225ebf90f00e03d1aa359a936605b0
