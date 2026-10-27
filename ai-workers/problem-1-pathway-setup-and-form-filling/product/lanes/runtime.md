# Lane: runtime — the thin end-to-end slice, then M3 runtime (P-67)

## From the Lead

2026-10-27 23:05 (Lead, Mac): **S5 slice 1 early look (68adc3b): founder Go for slice 2, with four fixes first.** Sorry for the four-hour wait: your hand-back did not reach the Lead. (1) **Forms listed once:** the "Reading and matching" list repeats the forms in the table; move each form's reading status into its row and side panel, and show checklists, guides and pages as "Sources" in one compact line or in the side panel. (2) **Warnings in plain words:** "37 list rows have no purpose yet (Question 8 B Row 1 …)" → say what the person must do in business words, with a real example; one warning has an empty example (bug). (3) **Questionnaires show questions, not field codes:** `case.service_language` and "(uses the field meaning)" leave the main path (concept §7: no IDs); show the question wording, codes only in the side panel. This is slice 2's tab: do it there. (4) **Preview:** today one phone column about 12 screens long; sections collapsed with a jump list (or one section at a time), the three columns kept. **CI must be green:** your last run was red on `check_w1_programs_s2.cjs` (Status change with 50+ combinations under 2 s); the Lead re-ran it. If red again, time the catalogue on main and on your branch and fix any slowdown from your `snapshot.ts` / `validate.ts` / `studio.ts` changes. **Sync main first:** break m8 merged (reads of catalogue, structure, path-options, name-check, uses need a configuration person in `x-actor`; your S5 tests must send it); P-125 (Start setup opens your workspace with the place read-only, Forms tab, finder running). Then BUILD slice 2 (Questionnaires, Documents, Review). **P-126:** while a later early look waits, re-check your next slice only.

Command: `/next runtime` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: W1-combination-workspace (S5, W1-08, P-123)
current_slice: slice 1 (shell and tabs, Overview, Forms settings, Person roles, Who can be, Preview; scaffolding removed)
stage: EARLY-LOOK
owner: Lead
next_action: Lead early look at slice 1 (screens/W1-combination-workspace/screenshots/slice1/, build-notes.md, challenge "Build discoveries"); then Go for slice 2 (Questionnaires per person with coverage, Documents, Review shows AI picks).
blocked_by: none for slice 2; slice 3 waits for forms S4 slices 1 and 2
updated: 2026-10-27

## Log (last 10 lines)
- 2026-10-27 · Builder (Mac): applied Lead note 2026-10-27 (S2 merged, PR #53): synced main f289ec7; Lead response copied into challenge.md (Agreed 2026-10-27); BUILD slice 1.
- 2026-10-27 · Builder (Mac): BUILD slice 1 → EARLY-LOOK: PersonRole + GET /api/library/roles (six built-in, kept by Reset; DB trigger replaces the fixed role check), Who can be (rules, version 409, confirm, Undo), runtime honours the release's people, tabs Overview · Forms · Questionnaires · Documents · Preview · Review and release, Forms drawer (from age, signed by, only if words-only M1), Preview on caseView; Sources upload/sample scaffolding removed, reading and matching kept on Forms (build discovery); QA-38/40/47, D-1/D-2; check_s5_slice1 51/51, browser 51/51 (axe, 11 states × 1440/1024); full suites green after moving 6 older checks to the new places; demo journey 45/45 on its own copy; any 424; graph exit 0; AI US$0; owner Lead.
- 2026-10-27 · Builder (Mac): Lead message (S6 challenge m1): S5 creates the Person roles record; M3, back-end table, slice 1 and Q-L4 updated (PersonRole + GET /api/library/roles in slice 1; POST stays S6's); no code; AI US$0; owner Lead.
- 2026-10-27 · Builder (Mac): applied Lead note 2026-10-27 (S5 Combination workspace, DESIGN only; read from origin/lead/2026-10-27); new branch runtime/2026-10-27-s5-workspace from main 76628a4; old Screen 03 branch already pushed (9dfe9b8), not built on; challenge written: Build after these changes (5 Major, 7 Minor), Forms-tab asks to the forms lane, slices 1–3; no code; AI US$0; owner Lead.
- 2026-10-25 · Builder (cloud): applied Lead note (P-89, Screen 03 to this lane); DESIGN feasibility challenge written: Build after these changes, 5 Majors/Minor, slices S1–S4 proposed; no code; owner Lead.
- 2026-10-25 · Builder (cloud): PR 13 fix verified on a fresh copy: journey 120/120, R1d 63/63, R1a 99/99, engine 50/50; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead.
- 2026-10-25 · Builder (cloud): break on the PR 13 fix: 0 Blocker/Major, 4 Minor; the change now names whose entries; lock race and old copies recorded; engine 50/50.
- 2026-10-25 · Builder (cloud): applied Lead note 02:00 (PR 13 review): a copy keeps each group's live entry ids, so an added (even blank) or removed entry makes it stale; R1d 63/63, engine 50/50, mutations caught; review PASS (5 minors applied); break pending.
- 2026-10-25 · Builder (cloud): "none apply" FIX verified on a fresh copy: journey 120/120, R1d 62/62, R1a 99/99, engine 48/48; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead; lane stops.
- 2026-10-25 · Builder (cloud): CHECK "none apply": review 8/10 (2 Majors), break 1 Major (filed copy not stale when none apply withdrawn) + 6 Minors; all fixed with tests, mutations caught; journey 120/120, R1d 62/62, engine 48/48.
