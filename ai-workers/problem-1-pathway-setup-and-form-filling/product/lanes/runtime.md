# Lane: runtime — the thin end-to-end slice, then M3 runtime (P-67)

## From the Lead

2026-10-27 (Lead, Mac): **New item: S5 Combination workspace (W1-08, P-123), stage DESIGN only (no code), in parallel with S2 (screens) and S4 (forms).** Commit and push what the old branch holds (Screen 03 S2), then start a new branch `runtime/2026-10-27-s5-workspace` from main. The design is agreed (walkthrough v2 S5, `design/walkthrough-s3-s7.html#s5`, marked OK; read its blue Lead note: no confirm or approve on canada.ca downloads). Sources in this order where they differ: P-123 (with the founder's confirmation and the Lead annotations on it), P-122, P-121, P-120, P-116, P-113, P-107, then `screens/W1-combination-workspace/concept-draft.md` (older), then your own unmerged Screen 03 S1/S2 work (keep what the S5 design keeps). **The forms lane is building the form finder engine now (S4 slice 1):** the Forms tab calls its API (find, attach, remove from the combination, replace edition, redo with AI, undo; marked "Picked by AI · Sample"). Read the forms lane's `screens/W1-form-library/challenge.md` on `origin/forms/2026-10-27-s4-form-library` for the planned endpoints, and say in your challenge what the Forms tab needs from them. DESIGN = skill screen-challenge → `screens/W1-combination-workspace/challenge.md` (ranked, honest, best modern layout if it beats the board) plus a slice plan; no code until the Lead answers and S4 slice 1 is merged. Do not touch any file the screens lane (Programs, Structure, New combination) or the forms lane (library, intake, finder) is changing. Stage DESIGN, owner Builder.

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
