# Review: G5 "Release needs a form line" (C5.1, P-248; SA-1B-90), PR #868 at b2d33367

Reviewer: a fresh context that did not build this. I read `git diff 9caa043b...b2d33367` (7 files), P-248, P-207, P-245, P-152, the C5.1 row in `qa/CAPABILITIES.md`, row G5, the PR's Q1–Q4, EXPERIENCE, STANDARDS and QUALITY. Isolated copies ran on :4447–4449 only, live AI off, US$0. All copies are stopped now. The PR head has since moved to d9e32a43, which adds only `qa/built/C5.1.md` (one notes line). This review covers b2d33367.

- **Pack `acceptance/C5.1.test.ts`:**
  - Checkpoint: **27/27 PASS + 1 WAIT, exit 2** (54 s).
  - Fixture (`wp.family`): **35/35, exit 0**, twice on a fresh copy.
- **Suites:**
  - `check_f8_empty_release.ts`: **15/15** (run with `--tsconfig api/tsconfig.json`, as `run-suites.sh` does).
  - `tests/qa/check_qa1_release_bypass.ts`: 6/7. The one fail is its control step. It expects `/submitted/` but gets the C5.4 source-gate words ("17 numbers have no source entry"), so it is unrelated to G5. I agree with the builder.
- **Mutation:** I removed `formLineProblem` from `contentProblems`. Then 5 API steps of the pack and the screen step went red: Submit got 201, and Approve got only the SME refusal. The rule's test fails when the rule is removed.
- **Graph:** `graph.mjs --check` gives 0 hard gaps. No new G3/G6 gap comes from this diff.
- **Journey score: 9/10.** See `journey-test-reviewer-2026-11-04.md`.

## What holds
- **Every release path refuses.** `contentProblems` is inside `Studio.problems()` (`api/src/studio.ts:111`, `:464`). So:
  - Submit refuses with 400.
  - Approve refuses with 409 "Release refused: …", at the `own` check before the review gate.
  - `releaseRows` refuses with 409 at its `own` check.
  - `POST /pack/release` never sends the row: the Release page holds it (`programs.ts:277-282`, `held` from `firstHold`). Its all-held 409 also lists the form-line line in `errors[]`. This is proven on the fixture (409 "Nothing can be released yet. Visitor visa: No form line yet…").
  - On the checkpoint, the separately approved document type went out alone (201), and the row was listed as held in the same words.
- **No wrong blocks for real form lines.** `isFormLine` reads only `form_kind` and `channel` (`engine/programs.ts:165`), and `formLineProblem` asks `some(...)`. So:
  - A checklist beside a data form passes.
  - A conditional form passes (its `status` is not read).
  - A line filed Online with no online edition passes (`online_versions` is not read). Its own channel problem stays separate.
  - Live: a PDF line, the same line set to ONLINE and then to PAPER each clear the error. Removing the line brings it back.
- **F8 and G5 never show together.** `formLineProblem` returns `[]` when there are no lines at all (F8's own line). `blockers.empty` now reads `empty.length > 0` (`programs.ts:282`), so To review's "not set up" count does not grow with documents-only rows.
- **Other screens:**
  - Programs page and setup checklist: no change. The rule is not added to `draftProblems`, so step counts and chips stay the same. A documents-only row already shows "Find forms" (forms step open).
  - To review: no new setup rows (checked on the fixture copy: 0 blocked).
  - Release page: lists only changed rows (`programs.ts:425`). A Live, unchanged documents-only release made under P-207 is therefore not re-held. This is consistent with Q3.
- **Screen at 1440 px** (`C5.1-*-review-warning-1440.png`, `C5.1-*-release-held-1440.png` under `studio/var/acceptance/`): an orange warn Notice with a text title, the plain explanation and one "Add a form" link to Forms; the error is said once (filtered out of the validation list); Submit is greyed with "Fix the problems first"; the Release page row reads "Held back: No form line yet: …".
  - axe WCAG 2.2 A/AA: no violations on either page. No sideways scroll at 1440, 1024, 400 or 200 % zoom. Keyboard: Tab reaches "Add a form", Enter opens Forms.
- **Words** follow PRODUCT §4 and EXPERIENCE §4/§10: they say what happened, why and what to add. There are no codes or decision numbers on screen; `no_form_line` is a data attribute only.
- **The pack matches the other packs' style:** header, run line, exit codes, US$0 check. A wait fails loudly (WAIT, exit 2). Each rule has pass and fail steps in the pure rule, through the API and on screen.

## Builder's questions (judged only where the code depends on them)
- **Q1: agree, with a record.** Row G5's "Done when" names only the form-line half. P-248's document-line half (refuse forms-only) is not built. C5.1 cannot reach Works until it is. The pack header states this gap; the backlog needs the row the builder proposes.
- **Q2: agree.** "Not needed" means nothing is filed on the line. Not counting it matches "a case would file no form".
- **Q3: agree.** Releases are never undone, and unchanged Live rows are not judged again.
- **Q4: agree.** The checkpoint WAIT is true. On my copy every combination with forms is held on K1 form-field decisions, and High-wage is empty. The pack exits 2, not 0.

## Issues (no Blocker, no Major)

**m1, Minor (Should): the validation count says "0 errors (block submission)" while the form-line error blocks submission.**
- Evidence: `web/src/pages/review.tsx:83` counts `others`, and `others` now excludes `noFormLine`. Screenshot `C5.1-checkpoint-review-warning-1440.png` shows "0 errors (block submission)" under a greyed Submit, while the tab says "1 to fix".
- This breaks EXPERIENCE rule 7, "counts say what they count".
- Fix: when `noFormLine` is set, say "other" as the unsourced case already does, or count it.

**m2, Minor (Should): the form-line rule does not use the library's "one rule" for what is filed.**
- Evidence: `engine/form-type.ts:7` `libraryType` treats a legacy `document` row whose title says "form" as a filed form. IMM 5802 "Offer of employment form (employer form)" is such a row in the sample library, and the finder, Programs and import all treat it as one.
- `isFormLine` instead requires `form_kind === "data_form"`, and the pack asserts `{form_kind:"document"}` is not a form line (`C5.1.test.ts:58`).
- Today this cannot be reached: IMM 5802 has no file, so it cannot be added (409). Once a file is uploaded, a combination filing it with documents would be refused wrongly.
- Fix: `libraryType(f.form_kind, f.title) === "form" && f.channel !== "NOT_NEEDED"`, plus one pass step for a "document"-kind form whose title says "form".

**m3, Minor (Should): the live "Not needed" fail step never runs.**
- Evidence: `C5.1.test.ts:134-135` prints NOTE, not WAIT, when the channel change is refused. Both data sets refuse it ("no record says … asks it itself"), so only the pure rule covers Q2.
- Fix: record an "asks it itself" basis in setup (through the product's route) so the step runs, or make the skip a WAIT.

**m4, Minor (Should): the C5.1 pack does not include "an approver who changed the draft cannot release" (BR-14).**
- Part B has the duty refusals and the self-sign refusal, but not this one. It is covered elsewhere (`check_s5_slice1.ts`).
- Fix: add one fail step in part B on the fixture, so the pack covers the whole of C5.1's own rule.

**m5, Minor (Should): two record points.**
- The pack header (`C5.1.test.ts:18`) says the PR's screenshots are under `product/screens/G5-release-form-line/`, but that folder holds only `notes.md`. Add them, or change the line.
- STANDARDS §7 makes property-based tests [M] when the engine changes. `engine/programs.ts` gains a pure rule with only example tests. A small property ("any list with a data_form line not Not needed → []") would meet it, or the build notes should give the reason.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | The form-line half of P-248 is built as row G5 says. The document-line half is open (Q1). |
| D2 | 5 | One check, server-side on all three release paths. Mutation proves it. |
| D3 | 5 | One pure rule in the engine, read by the API and the pack. |
| D4 | 4 | Real form lines are never blocked. Legacy filed "document" forms are excluded (m2). |
| D5 | 5 | Reload keeps the warning. Adding a form back clears it at once. Double Submit is impossible (disabled). |
| D6 | 4 | Refusals use the existing audit path. Releases made earlier keep their status (Q3). |
| D7 | 5 | No AI involved. US$0 asserted. |
| D8 | 5 | The path and the Review and release tab are unchanged. The warning is on the tab the author is on. |
| D9 | 5 | One next action: "Add a form" opens Forms. |
| D10 | 4 | Plain, says what to add. The text is long, and the count is wrong (m1). |
| D11 | 4 | Warning, greyed Submit and held row agree. The "0 errors" count does not (m1). |
| D12 | 5 | Team Notice/Button. The warn tone matches the other release notices. |
| D13 | 5 | axe clean. 1024, 400 and 200 % with no sideways scroll. Keyboard reaches and follows the link. |
| D14 | 5 | Team components and words. |
| D15 | 5 | Review tab 1.4 s on the first cold load, Release page 0.86 s. No per-row requests added (the rule is pure, per snapshot). |
| D16 | 4 | Pass and fail tests for each rule, and a mutation kills them. m3/m4 are gaps. |
| D17 | — | Simulated only. |
| D18 | 4 | The words name the kinds of form line. No source is needed (a product rule, P-248). |
| D19 | 3 | Release is still not reachable on the checkpoint (QA-144). The fixture release passes. |
| D20 | — | Simulated only. |

## What I could not check
- A real screen reader.
- An intended user's unaided walk (D17/D20 stay with the founder).
- CI on the exact commit.
- The 18 release suites the builder lists, other than `check_f8_empty_release` and `check_qa1_release_bypass`. I re-ran only those two and the pack.
- An online-only form through a screen: none can be made today (online capture is parked). It is covered by the pure rule only.

**Verdict: Approve** (no open Blocker or Major). This applies to b2d33367. The commit after it, d9e32a43, is notes only. Minors m1–m5 can be fixed in this PR or recorded as follow-ups.
