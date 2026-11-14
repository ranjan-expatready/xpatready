# BK-25 review: PR #1747, commit 775440da2 (reviewer, 14 Nov 2026)

Reviewed: `git diff origin/main..775440da2` (4 commits) against BK-25 (BACKLOG.md on `lead/2026-11-07-lead31`), AGENTS.md, RULES.md, STANDARDS.md. This is a data-and-loader row with one change to the own-question door, not a screen. Concept fit, the BIC table and the graph check are N/A (no concept or screen; `graph.mjs` was not run, because it rewrites `qa/GRAPH.md` and I may write only this file and the journey report).

**Summary (Ship after fixes):** the data is sound. On a fresh isolated copy the walk's family writes F2, F3 and F5, IMM 5707's marriage boxes are written for both people, IMM 1295's own Validate completes and BK-13 passes 45/45. Two things are still wrong. The row's done-when is not met, because F1 is still open. And the door's new statement and person allowances weaken two of the door's own guarantees.

## What I ran (US$0, live AI off, ports 4480/4481, never :4400; every copy stopped)
| Check | Result |
|---|---|
| `isolated.sh rev_bk25 4480 start` + `check_bk24_required_boxes.ts` (BK-13 replay first) | exit 0; **28/28**; BK-13 **45/45**; **1 GAP: F1** (IMM 1294 `PurposeRow1.CityTown`); IMM 1295 Validate "completes … stops on no other box"; IMM 1294 Validate WAIT (engine: picture category "zero") |
| `check_bk25_own_statement.ts` | 22/22 |
| `check_b170c_xfa_adapter.ts` | 44/44 |
| `check_b164_no_engine_keys.ts` | 63/63 (no form number in code; comments only) |
| `check_forms_b116_own_unmapped.ts` on its own fresh copy (:4481) | 18/18 |
| `imm1294e.xfa-template.txt` regenerated with `p1/xfa_texts.py` from the official file (SHA-256 394c7455… matches the manifest) | byte-identical (10,272 chars); the three quoted questions are in it |
| Reader scan: every Yes/No box in `p1/inventory/*` that `printedStatement` now accepts | 7 boxes: see M2 |
| Door break test on the walk copy (API, `user-A`) | see M3; undo restores `by_hand`/person null; wrong person 409; `form_subject` 400; officer 403 |

## Issues, ranked
**M1 (Major, Must): the row's done-when is not met. F1 is still allowed open.** `tests/check_bk24_required_boxes.ts:54-56` still lists `IMM 1294|principal|…PurposeRow1[0].CityTown[0].CityTown[0]` as F1. The done-when says "**no** box listed as an open follow-up for IMM 1294, 1295, 5257, 5476, 5707". The row allowed "a code change only with the reason stated", so F1 was in scope. The builder asked the tech lead on the PR ("Question for the tech lead", 09:47 UTC) and recommended a row of its own. There is no answer on the PR and no new row on the lead branch. If this merges with the `review: approved` label, BK-25 closes with its done-when unmet. On the walk copy the case still shows "CRITICAL: IMM 1294 … City/Town: no question asks it yet", and Adobe will still stop there.
*Fix:* either the tech lead records the split on the PR or in BACKLOG (F1 becomes its own row; BK-25's done-when is amended to name it), and the PR text says so, or F1 is built here. This needs no new scope from the builder, only the lead's ruling.

**M2 (Major, Must): `printedStatement` accepts a question cut off in the middle as "a whole sentence".** See `api/src/own-yes-no.ts:53-55` and its use at `api/src/own-question.ts:140`. The reading cuts headings at 120 characters. The heading of Background question 5 on IMM 1294, IMM 1295 and IMM 5257 (`…PageWrapper[0].Occupation[0].Choice[0]`) is "Are you, or have you ever been a member or associated with any political party, or other group or organization which has". It has no "?", ends in a letter and is a substring of the saved text, so `printedStatement` returns it. Before this PR that box was refused ("no printed question … map it on its field map"). Now it would be asked with the qualifying clause missing ("…engaged in or advocated violence…"), shown as the form's own words.
*Failure scenario:* a pathway configured by data (P-449) whose AI answer left Q5 `unresolved`/`by_hand` gets an `own-yes-no.json` row without `question`. The client then answers Yes/No to a fragment of an admissibility question, and the answer is written into IRCC's box. Today Q5 is mapped in this release (checked in the DB), so the walk does not hit it.
*Fix:* take a statement only when the saved text shows that it ends there. For example, the next character after the match is not a lower-case letter or a comma, and/or the heading is shorter than the reading's cut. Add a fail case on IMM 1295's `Occupation[0].Choice[0]` to `check_bk25_own_statement.ts`.

**M3 (Major, Must): the row-person check runs only when `person` is given, so the spouse row is accepted mapped to the applicant.** See `api/src/own-question.ts:144-149` and `:202`. Before this PR, IMM 5707's statement boxes had no printed question and the door refused them. Now they are accepted, and when `person` is left out the door defaults to `form_subject` with no check. Reproduced on the walk copy:
1. Undo the spouse row (it goes back to `by_hand`, person null: correct).
2. POST `own-question` with `dataPath …Spouse[0]…MarriageInPerson…yesno[0]`, `field person.present_at_marriage_ceremony` and no `person`. The answer is **200**, and a DRAFT row is written as `mapped|form_subject`, so "My spouse was physically present" would be filled from the applicant's own answer.

The same applies to IMM 5406's two `by_hand` rows already in the library. The Sample family answers Yes for both people, so no test or walk can see the error.
*Fix:* apply `rowPeople` whenever the row names someone: refuse when `named.length && (named.length !== 1 || named[0] !== (b.person ?? "form_subject"))`. Add a fail test (spouse row without `person` gives 409) and keep B116's 18/18.

**m1 (Minor, Should): a test passes without checking anything.** At `tests/check_bk25_own_statement.ts:54`, "row is about subject_spouse_or_partner, as its row's form fields name it on the project's reading" compares the data with constants, so it never fails because of the release's map. The door's real check only runs on the server. Either read the row's people from the saved field map or name the test for what it checks.

**m2 (Minor, Should): a pass does not say that a known script defect was skipped.** `engine/xfa/run-engine.mjs:75` sets `answer.knownDefects`, but `answerOf` (`engine/xfa/index.ts`, case "complete") drops it. The defect is also matched by class and member name only, not by its path, so the same member name touched anywhere in a non-strict run is accepted. Today only tests call `askXfaEngine`, and IMM 1295's record matches the engine's own corpus test, so I found no case where a real stop or a skipped script turns into a pass (the `k2`/`k3` fail cases hold). Carry `knownDefects` into the "passes" answer and, when it is available, key the defect by its SOM path.

**m3 (Minor, Should): the PR text is stale.** Its first line says "Changed shared contract: none", but `contracts/own-question.ts` gains `person` (WAY-OF-WORKING: the first line names a changed shared contract), and "Checks: Pending" is out of date. Update the body.

## Judgement on the points asked
- **Sample data:** it is made up and self-consistent. Married on 2016-04-10, both people say Yes to being present. The spouse is a CLERK since 2018-07, and `present_occupation` was changed to match (it was HOMEMAKER). The consent and background answers are No. Removing `job_place` is safe: `sample-case.ts:139` treats it as optional, and each job row now carries its own place. No IRCC value was invented. The quoted questions match each form's saved text, and IMM 1294's saved text is the official file's reading (checked above).
- **Other combinations and packs:** every new `sp.outside` box is `checkpointOnly`, so `acceptance/lib/pack2.ts:134` skips them. `form-setup.json` maps `sp.outside` to IMM 1294, so the boxes reach the step. 2c reuses `person.previously_applied_to_canada` by `field`. Question 6 and the consent reuse IMM 5257's fields by label, which depends on `vv.single` being configured first, as QA-318 already does; a refusal would show in the step's refused list. B116 passes 18/18.
- **Undo:** an unmapped ask records `person` in `was`, and undo puts it back (checked: `by_hand`, person null).
- **No test lets an open box pass** apart from F1's GAP. IMM 1294's own Validate cannot run on our engine, so its 2c, 6 and consent are checked from the file by name (lines 119-133), which is right.

## Scores
**D1–D20 (data row; where it does not apply, evidence from the case page as the case officer):**
- D1 3/5: M1.
- D2 3/5: M3 lets the wrong person's answer in.
- D3 5: library fields are reused by key and by label.
- D4 4: conditions intact (BK-24 script-condition checks pass).
- D5 4: undo restores; refusals are clear.
- D6 4: every asked row cites the edition and the saved file.
- D7 N/A: no AI.
- D8–D12 4: as on main; the officer sees each new answer with Confirmed or Declared and "fills IMM 5707 for 2 people".
- D13 4: axe 0 at 1440 and 400 px, no sideways scroll at 400, 1024 and 1440 px, keyboard reaches Edit; 200 % zoom not tried.
- D14 5.
- D15 3: the case page settled in about 2.6–3 s.
- D16 3: m1, and M2 and M3 have no fail cases.
- D17 simulated only.
- D18 4: the source of each question is quoted.
- D19 3: IMM 1294 is still not filing-ready (F1).
- D20 simulated only.

**Journey score (reviewer, the one score for this check): 7.5/10, below the pass mark.** See `journey-test-reviewer-2026-11-14.md`.

## Could not check
Adobe's own Validate (the Mac run, BK-20). IMM 1294's own Validate on our engine (it cannot read the form). A real screen reader, 200 % zoom. An intended user's unaided walk (D17, D20).

**Verdict: Block** at commit `775440da224e35f60df833e864456d78102397f6`. To fix:
1. **M1:** the tech lead's recorded ruling splitting F1 (with the PR text and BK-24's check naming the new row), or F1 built.
2. **M2:** the statement must be whole; add a fail test on Background Q5.
3. **M3:** check the row's person even when `person` is left out; add a fail test.

m1–m3 are Should. After the fixes, re-run `check_bk24_required_boxes.ts`, `check_bk25_own_statement.ts`, `check_forms_b116_own_unmapped.ts` and BK-13 on a fresh copy.
