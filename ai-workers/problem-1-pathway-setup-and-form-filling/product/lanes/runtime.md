# Lane: runtime — the thin end-to-end slice, then M3 runtime (P-67)

## From the Lead
2026-10-25 06:00 (Lead, cloud): **Screen 03 challenge answered and agreed** (`screens/03-combination-workspace/challenge.md` "Lead response"). Set stage **BUILD**, slice **S1**, owner Builder: route `/c/:id/:tab`, `GET …/workspace?tab=`, Overview and Forms reusing Screen 01's components, and Preview by person on `caseView()` with the F-R1c-1 order fixed in `render.ts` and the preview-vs-runtime engine test. Also run the coverage check against every Sample combination and fix the data. Lead changes:
* Substitute sets: no seeded sets; default "this document alone" (S3).
* Filled by: goes through `revise()` until the screens lane's `LibraryChange` merges.
New code goes in new files. `combination.tsx` becomes the tab shell, and the screens lane adds one entry point there (Setup opens Draft setup, Screen 02 challenge 1). Sync main first. Also fix qa's QA-38 (Major: "Open a case" names release 1 while the case opens on release 2) and QA-40 (an Online IMM 5257 case shows no forms line) in S1, with the qa checks in `tests/qa/check_qa_explore_1025.cjs`. Then EARLY-LOOK (Lead) with screenshots of the S1 views.

Command: `/next runtime` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: 03-combination-workspace
current_slice: S1 (tab route, Overview, Forms, Preview by person; F-R1c-1; coverage; QA-38, QA-40)
stage: EARLY-LOOK
owner: Lead
next_action: Lead early look at screens/03-combination-workspace/build-notes.md and screenshots/slice1/ (deviations listed); then FINISH S1 or BUILD S2.
blocked_by: none
updated: 2026-10-25

## Log (last 10 lines)
- 2026-10-25 · Builder (cloud): applied Lead note 06:00 (BUILD S1); built S1: tab route and workspace API, Overview, Forms (copies, minimum age, signed by), Preview by person on caseView, F-R1c-1, coverage 0 gaps, QA-38 and QA-40 fixed; engine 29/29, S1 42/42, mutations caught; EARLY-LOOK owner Lead.
- 2026-10-25 · Builder (cloud): applied Lead note (P-89, Screen 03 to this lane); DESIGN feasibility challenge written: Build after these changes, 5 Majors/Minor, slices S1–S4 proposed; no code; owner Lead.
- 2026-10-25 · Builder (cloud): PR 13 fix verified on a fresh copy: journey 120/120, R1d 63/63, R1a 99/99, engine 50/50; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead.
- 2026-10-25 · Builder (cloud): break on the PR 13 fix: 0 Blocker/Major, 4 Minor; the change now names whose entries; lock race and old copies recorded; engine 50/50.
- 2026-10-25 · Builder (cloud): applied Lead note 02:00 (PR 13 review): a copy keeps each group's live entry ids, so an added (even blank) or removed entry makes it stale; R1d 63/63, engine 50/50, mutations caught; review PASS (5 minors applied); break pending.
- 2026-10-25 · Builder (cloud): "none apply" FIX verified on a fresh copy: journey 120/120, R1d 62/62, R1a 99/99, engine 48/48; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead; lane stops.
- 2026-10-25 · Builder (cloud): CHECK "none apply": review 8/10 (2 Majors), break 1 Major (filed copy not stale when none apply withdrawn) + 6 Minors; all fixed with tests, mutations caught; journey 120/120, R1d 62/62, engine 48/48.
- 2026-10-25 · Builder (cloud): synced main e619113 (PR #12 merged); BUILD "none apply" for required groups: client_group_answer (append-only), PUT none-apply, Confirm section, readiness blocks empty required groups; engine 44/44, R1d 57/57, journey 116/116, R1a 99/99; mutations caught; CHECK started.
- 2026-10-25 · Builder (cloud): PR #12 review (Lead): 3 fill-case defects fixed with tests caught by mutation (Online filing line → 422 and not listed; lock refuses a missing or changed file 409; cap counted under FOR UPDATE); R1d 43/43, run-suites --demo 21/21 at be16c22; told the Lead; WAIT.
- 2026-10-24 · Builder (cloud): Lead accepted R1d (3d47004, 21/21); answers recorded: an empty required group that applies blocks ready to file, cleared by a confirmed "none apply" fact (P-71, P-72); STATUS.md verdict is the trial record (IMM 1344 not passed, IMM 5707 passed). Waiting for the Lead PR merge.
