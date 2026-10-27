# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-27 (Lead, Mac): **S2 passed the Lead check and merges with PR #53** (`screens/W1-structure-programs/lead-check.md`, S2 section); :4400 restarts on it (founder OK). Sync main, new branch `screens/2026-10-27-s1s2-fix` from main. **Stage FIX, owner Builder: the qa after-merge findings on S1 Structure plus two S2 points** (qa report on `origin/claude/qa-after-merge-s1-21bfdf`, `qa/reports/`): **QA-45 Major** "Add sub-category" in the panel closes the panel and no add row appears (a category with no sub-category, e.g. Study permit): the add row appears under it, focused; **QA-44** letters typed while a name saves are wiped: keep what was typed; **QA-46** the approval page says "Delete structure name" where the author pressed Remove: same word everywhere (P-116); **review m1** the setup bar can contradict the next step: the bar shows the stage the next-step button belongs to (Lead decision: next step wins); **break m8** reads (`/catalogue`, `/structure`, `/path-options`) answer without a known person: deny by default like writes (STANDARDS §6), keeping every role that may read. A pass and a fail test each, all suites, studio journey on your isolated copy, then CHECK. **Next after this FIX: S3 New combination** (agreed: walkthrough v2 S3 + `concept.md` §6, P-123: Start setup runs the form finder, "Open existing"): first a short fresh re-check of the concept against main (R-109) in `challenge.md`, then BUILD; the finder call uses the forms lane's API (S4 slice 1, `origin/forms/2026-10-27-s4-form-library`). **QA-48** (retire and restore a Live combination with the second person, P-116) is queued as its own slice after S3.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: W1-structure-programs
stage: CHECK
owner: Lead
next_action: Lead check of S2 + fixes (branch screens/2026-10-27-s2-programs), then merge; Lead decides review m1 (bar vs next step), break m8 (reads without a person), m9 (payload at 400+)
then: Lead check and merge, then S3 New combination
blocked_by: none
updated: 2026-10-27

## Log (last 10 lines)
- 2026-10-27 · W1-structure-programs · FIX → CHECK · CHECK findings fixed (241e2b4): review M1 need-you counting tested with real waiting states; break M1 unknown/long p= ignored, M2 keys to 400, M3 other lanes' files back to main; minors; all 35 suites PASS, check_w1_programs_s2 87/87, studio journey 45/45 on 4445. AI US$0. Owner → Lead.
- 2026-10-27 · W1-structure-programs · CHECK → FIX · breaker on b45ca44: 0 Blocker, 3 Major (bad p= shows empty Pathways; long keys fail own contracts; other lanes' files in the branch), 9 Minor; all three Majors and the reviewer's Major fixed with checks; check_w1_programs_s2 87/87. AI US$0.
- 2026-10-27 · W1-structure-programs · CHECK · screen-reviewer on b45ca44: Ship after fixes, journey 9/10, 0 Blocker/Must, 1 Major (need-you counting untested), 10 Minor; review.md + journey-test-reviewer-2026-10-27-s2.md. Breaker running. AI US$0.
- 2026-10-27 · W1-structure-programs · FIX → CHECK · b45ca44 pushed: seven fixes; check_w1_programs_s2 74/74, studio journey 45/45 on 4445, failed suites rerun alone clean (machine busy: load 15); screen-reviewer and screen-breaker launched. AI US$0.
- 2026-10-27 · W1-structure-programs · FIX · seven S2 early-look fixes built (P-112 sample Pathways, Start setup, no silent start, form counts agree, search full width, need-you = waiting on a person, Not started card); check_w1_programs_s2 74/74; build-notes 'S2 Fixes'. Suites running. AI US$0.
- 2026-10-27 · W1-structure-programs · BUILD S2 → FIX · applied Lead note 2026-10-27 (S2 early look on 4e6b409; founder Go with all seven fixes; note read from the Lead branch lead/2026-10-27); synced main 01094c2. AI US$0.
- 2026-10-27 · W1-structure-programs · EARLY-LOOK → BUILD S2 · applied Lead note 2026-10-27 (S1-finish merged PR #42 d393155; founder Go on S2); new branch screens/2026-10-27-s2-programs from main. AI US$0.
- 2026-10-27 · W1-structure-programs · BUILD → EARLY-LOOK · S1-finish: Pathway cards (All + one per Pathway + Add; a card opens its tree, closes the others; in the address), Used by names each combination with Open, inline confirmations (no toast on Structure), full-height menu column app-wide; check_w1_structure_s1finish 33/33 (twice), all 34 suites PASS, studio journey 45/45 on 4445 (two overlapping runs earlier interfered; rerun alone clean). AI US$0. Owner → Lead.
- 2026-10-27 · W1-structure-programs · FIX → BUILD S1-finish · applied Lead note 2026-10-27 (slices 1+2 merged in PR #40 ed3ef4a; P-117 one screen at a time); new branch screens/2026-10-27-s1-finish from main. AI US$0.
- 2026-10-27 · W1-structure-programs · FIX · studio journey (--demo suite) 45/45 on isolated copy 4445: Pass B adds the Retail Pathway 'Temporary residence' on the Structure page after Reset (B0b), B1 expects 'Individual › Temporary residence › Work permits (built from scratch) › …'; reset check now asserts both tabs empty; New combination trail names the type's one Pathway; check_screen01_browser 129/129, smallfix pass. AI US$0. Owner → Lead.
