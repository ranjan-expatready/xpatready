# Lane: runtime — the thin end-to-end slice, then M3 runtime (P-67)

## From the Lead
2026-10-25 02:00 (Lead, cloud): "none apply" passed the Lead check (21/21) but **FIX before merge** (PR 13 review): `groupFacts` (engine/runtime/forms.ts) keeps only `entries: rows > 0`, so adding a blank second entry to a group after a copy is filed leaves the copy current while readiness says the new entry is not answered. Keep the live entry ids (or at least the count) per group in the copy's groups, compare them in `changedGroups`, and add an R1d check: file IMM 5257 with one complete previous-residence entry, add a blank second entry → the copy is stale, naming the group. Then hand back at CHECK. Answers kept: every group counts as required for R1; group-level required flags come with Screen 03; IMM 5707 and the spouse's groups go to the expert. After this fix, R2 waits for a Lead plan.

Command: `/next runtime` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: R1-thin-slice
current_slice: R1d
stage: CHECK
owner: Builder
next_action: PR 13 fix: review PASS, break 0 Major (m2 whose entries fixed); full suites running on a fresh copy; then CHECK owner Lead.
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-25 · Builder (cloud): break on the PR 13 fix: 0 Blocker/Major, 4 Minor; the change now names whose entries; lock race and old copies recorded; engine 50/50.
- 2026-10-25 · Builder (cloud): applied Lead note 02:00 (PR 13 review): a copy keeps each group's live entry ids, so an added (even blank) or removed entry makes it stale; R1d 63/63, engine 50/50, mutations caught; review PASS (5 minors applied); break pending.
- 2026-10-25 · Builder (cloud): "none apply" FIX verified on a fresh copy: journey 120/120, R1d 62/62, R1a 99/99, engine 48/48; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead; lane stops.
- 2026-10-25 · Builder (cloud): CHECK "none apply": review 8/10 (2 Majors), break 1 Major (filed copy not stale when none apply withdrawn) + 6 Minors; all fixed with tests, mutations caught; journey 120/120, R1d 62/62, engine 48/48.
- 2026-10-25 · Builder (cloud): synced main e619113 (PR #12 merged); BUILD "none apply" for required groups: client_group_answer (append-only), PUT none-apply, Confirm section, readiness blocks empty required groups; engine 44/44, R1d 57/57, journey 116/116, R1a 99/99; mutations caught; CHECK started.
- 2026-10-25 · Builder (cloud): PR #12 review (Lead): 3 fill-case defects fixed with tests caught by mutation (Online filing line → 422 and not listed; lock refuses a missing or changed file 409; cap counted under FOR UPDATE); R1d 43/43, run-suites --demo 21/21 at be16c22; told the Lead; WAIT.
- 2026-10-24 · Builder (cloud): Lead accepted R1d (3d47004, 21/21); answers recorded: an empty required group that applies blocks ready to file, cleared by a confirmed "none apply" fact (P-71, P-72); STATUS.md verdict is the trial record (IMM 1344 not passed, IMM 5707 passed). Waiting for the Lead PR merge.
- 2026-10-24 · Builder (cloud): FIX R1d done: review minors 1–2 wording too; fresh copy journey 107/107, R1d 38/38, R1a 99/99, engine 39/39; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead.
- 2026-10-24 · Builder (cloud): CHECK R1d: review 7/10 (5 Majors), break 7 Majors 6 Minors; FIX: trial gate per form, readiness (needs a fix, by id), blocking list on the page, focus, delete/insert guards, file checks, cap per case; R1d 38/38, journey 107/107, R1a 99/99, engine 39/39; mutations caught.
- 2026-10-24 · Builder (cloud): R1d early-look changes: P-71 lock only when ready (API 409 + disabled buttons with the reason), "form fields" wording, "fills IMM 5257 for N people"; R1d 27/27, journey 102/102 ×2, run-suites --demo 20/20; CHECK started.
