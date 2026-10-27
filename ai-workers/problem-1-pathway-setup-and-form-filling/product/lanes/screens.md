# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-27 (Lead, Mac): **S1-finish is in main (Lead check passed on d40c582: suites all PASS, studio journey 45/45 on an isolated copy, no new graph gap). Founder Go on S2.** Sync main; new branch from main. **Slice S2: Immigration programs, design D (P-115)**, to `concept.md` and `design/draft-programs-v2.html`: opened by the same Pathway cards as Structure (a card opens that Pathway's setup cards; "All" shows every Pathway); Cards / List switch; Retail label; full five-part trail; no filter-tab row; search and New combination placed; menu item and page title "Immigration programs". **Two S1 fixes in the same slice (founder, 27 Oct):** (1) on Structure, a "Not started" combination under "Used by" gets a **Start setup** link (today it has no link; it opens New combination with that trail filled, until S3 replaces it); (2) the panel's footer buttons (Remove / Retire, Save) are partly cut off at the bottom: the whole footer stays visible at 1440×900 and 1024×768, with a browser check. **Founder's design rule, now EXPERIENCE.md §0 [M]:** choose the modern, sleek element wherever you build, but scalability, ease of use and easy information gathering come first; anything complex gets a helpful tooltip or inline explainer; neither over- nor under-engineered — offer your best modern card layout in the challenge if it beats the board. S3–S7 are agreed (walkthrough v2, P-123) and follow S2 one at a time; nothing of them is built in S2. Rebuild the web app before browser suites; run the studio journey on your isolated copy. Then EARLY-LOOK (screenshots at 1440 and 1024). Stage BUILD S2, owner Builder.

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
