# Lane: runtime — the thin end-to-end slice, then M3 runtime (P-67)

## From the Lead

2026-10-28 (Lead, Mac): **Founder Go on the S5 slice 2 early look (28 Oct)**, after a fresh drift check (`screens/W1-combination-workspace/drift-check.md`: no Must or Major; CI green on f0166e5; four S5 checks rerun green). Stage BUILD, owner Builder. Now: fold in the Shoulds — Review shows plain questions, not field codes, for unasked questions (`review.tsx:55`); Forms tab must not say "No forms yet · 0 forms" when forms are attached; no raw "applicableNote:" in IRCC's words; Preview's jump list without repeated names; removing a form from a combination asks first and offers Undo (P-116); a sample state that shows "Review shows AI picks" with a test. Then **slice 3 (forms from the finder) only after S4 merges**: sync main first (S4 touches `studio.ts`, `main.ts`, `schema.prisma`; expect conflicts). Start setup still opens New combination: that is S3 (screens), not yours. Send hand-backs to the Lead by message.

Command: `/next runtime` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: 03-combination-workspace
current_slice: DESIGN challenge
stage: DESIGN
owner: Lead
next_action: Lead answers screens/03-combination-workspace/challenge.md (5 points: Preview on caseView, missing records, coverage gate, slices S1–S4, lane overlap; 1 founder question on Sample substitute sets), then moves the lane to BUILD slice 1.
blocked_by: none
updated: 2026-10-25

## Log (last 10 lines)
- 2026-10-25 · Builder (cloud): applied Lead note (P-89, Screen 03 to this lane); DESIGN feasibility challenge written: Build after these changes, 5 Majors/Minor, slices S1–S4 proposed; no code; owner Lead.
- 2026-10-25 · Builder (cloud): PR 13 fix verified on a fresh copy: journey 120/120, R1d 63/63, R1a 99/99, engine 50/50; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead.
- 2026-10-25 · Builder (cloud): break on the PR 13 fix: 0 Blocker/Major, 4 Minor; the change now names whose entries; lock race and old copies recorded; engine 50/50.
- 2026-10-25 · Builder (cloud): applied Lead note 02:00 (PR 13 review): a copy keeps each group's live entry ids, so an added (even blank) or removed entry makes it stale; R1d 63/63, engine 50/50, mutations caught; review PASS (5 minors applied); break pending.
- 2026-10-25 · Builder (cloud): "none apply" FIX verified on a fresh copy: journey 120/120, R1d 62/62, R1a 99/99, engine 48/48; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead; lane stops.
- 2026-10-25 · Builder (cloud): CHECK "none apply": review 8/10 (2 Majors), break 1 Major (filed copy not stale when none apply withdrawn) + 6 Minors; all fixed with tests, mutations caught; journey 120/120, R1d 62/62, engine 48/48.
- 2026-10-25 · Builder (cloud): synced main e619113 (PR #12 merged); BUILD "none apply" for required groups: client_group_answer (append-only), PUT none-apply, Confirm section, readiness blocks empty required groups; engine 44/44, R1d 57/57, journey 116/116, R1a 99/99; mutations caught; CHECK started.
- 2026-10-25 · Builder (cloud): PR #12 review (Lead): 3 fill-case defects fixed with tests caught by mutation (Online filing line → 422 and not listed; lock refuses a missing or changed file 409; cap counted under FOR UPDATE); R1d 43/43, run-suites --demo 21/21 at be16c22; told the Lead; WAIT.
- 2026-10-24 · Builder (cloud): Lead accepted R1d (3d47004, 21/21); answers recorded: an empty required group that applies blocks ready to file, cleared by a confirmed "none apply" fact (P-71, P-72); STATUS.md verdict is the trial record (IMM 1344 not passed, IMM 5707 passed). Waiting for the Lead PR merge.
- 2026-10-24 · Builder (cloud): FIX R1d done: review minors 1–2 wording too; fresh copy journey 107/107, R1d 38/38, R1a 99/99, engine 39/39; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead.
