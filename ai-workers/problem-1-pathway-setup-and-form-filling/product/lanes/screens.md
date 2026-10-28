# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-28 (Lead, Mac): **Round 3 challenge read (bdcf23e): all four Majors and the six Minors accepted; Agreed 28 Oct.** Stage BUILD, owner Builder. Copy this answer under "Lead response" in `challenge.md`. (1) A combination row's Retire/Restore acts on the combination and its name together, one proposal and one approval; Delete greyed while a setup draft exists; parent rows act on names (P-116). (2) Branch delete: one proposal stores the subtree's keys; approval refused if a name was added under it or anything became used; one transaction, leaves first. (3) You may change only the "Remove" → "Delete" expectations in `check_qa_am_fix_1027` and `check_qa_am_1027`, in their own commit named for the qa lane; the Lead tells qa. (4) Two commits, R3a Program structure and R3b Immigration programs, each green on the local full suite; one early look at the end. Minors as you proposed. Desktop only. Local `run-suites.sh` evidence on your exact commit (CI now runs only on the Lead PR, P-85 amended). **Also (28 Oct, P-116 amended, `screens/W1-lifecycle-pattern/`):** build the shared lifecycle components (`components/lifecycle/`: RowAction, WherePanel, ImpactPanel, Undo toast) and the one guard in `lifecycle.ts` as part of R3a, used by Structure rows and To review; library guard kinds field, section, document type, check come with S6. Words per PRODUCT §4; an author's own never-approved draft deletes at once with Undo.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: W1-structure-programs
stage: CHECK
owner: Lead
next_action: Lead check of the FIX (branch screens/2026-10-27-s1s2-fix), then merge; then the visual-system slice (P-127 round 2: Program structure layout A, Add to Program structure pop-up, POST /structure/path)
then: Lead check and merge, then visual-system slice, then S3
blocked_by: none
updated: 2026-10-27

## Log (last 10 lines)
- 2026-10-27 · W1-structure-programs · FIX → CHECK · seven items fixed (QA-44/45/46/49/50, review m1, break m8); check_w1_s1s2_fix 30/30; suites 34 PASS + 2 reruns alone PASS (s1finish now waits for 'Added'; forms_slice2b fetch flake 36/36); synced main 94d14ce, then s1s2_fix 30/30, programs_s2 87/87, s1finish 33/33; studio journey 45/45 on 4445; no by-products in the branch. AI US$0. Owner → Lead.
- 2026-10-27 · W1-structure-programs · CHECK → FIX · applied Lead note 2026-10-27 (S2 merged PR #53; FIX QA-44, QA-45, QA-46, QA-49, QA-50, review m1, break m8); new branch screens/2026-10-27-s1s2-fix from main 57f6f8c; all seven built with a pass and a fail check each (check_w1_s1s2_fix 30/30). AI US$0.
- 2026-10-27 · W1-structure-programs · FIX → CHECK · CHECK findings fixed (241e2b4): review M1 need-you counting tested with real waiting states; break M1 unknown/long p= ignored, M2 keys to 400, M3 other lanes' files back to main; minors; all 35 suites PASS, check_w1_programs_s2 87/87, studio journey 45/45 on 4445. AI US$0. Owner → Lead.
- 2026-10-27 · W1-structure-programs · CHECK → FIX · breaker on b45ca44: 0 Blocker, 3 Major (bad p= shows empty Pathways; long keys fail own contracts; other lanes' files in the branch), 9 Minor; all three Majors and the reviewer's Major fixed with checks; check_w1_programs_s2 87/87. AI US$0.
- 2026-10-27 · W1-structure-programs · CHECK · screen-reviewer on b45ca44: Ship after fixes, journey 9/10, 0 Blocker/Must, 1 Major (need-you counting untested), 10 Minor; review.md + journey-test-reviewer-2026-10-27-s2.md. Breaker running. AI US$0.
- 2026-10-27 · W1-structure-programs · FIX → CHECK · b45ca44 pushed: seven fixes; check_w1_programs_s2 74/74, studio journey 45/45 on 4445, failed suites rerun alone clean (machine busy: load 15); screen-reviewer and screen-breaker launched. AI US$0.
- 2026-10-27 · W1-structure-programs · FIX · seven S2 early-look fixes built (P-112 sample Pathways, Start setup, no silent start, form counts agree, search full width, need-you = waiting on a person, Not started card); check_w1_programs_s2 74/74; build-notes 'S2 Fixes'. Suites running. AI US$0.
- 2026-10-27 · W1-structure-programs · BUILD S2 → FIX · applied Lead note 2026-10-27 (S2 early look on 4e6b409; founder Go with all seven fixes; note read from the Lead branch lead/2026-10-27); synced main 01094c2. AI US$0.
- 2026-10-27 · W1-structure-programs · EARLY-LOOK → BUILD S2 · applied Lead note 2026-10-27 (S1-finish merged PR #42 d393155; founder Go on S2); new branch screens/2026-10-27-s2-programs from main. AI US$0.
- 2026-10-27 · W1-structure-programs · BUILD → EARLY-LOOK · S1-finish: Pathway cards (All + one per Pathway + Add; a card opens its tree, closes the others; in the address), Used by names each combination with Open, inline confirmations (no toast on Structure), full-height menu column app-wide; check_w1_structure_s1finish 33/33 (twice), all 34 suites PASS, studio journey 45/45 on 4445 (two overlapping runs earlier interfered; rerun alone clean). AI US$0. Owner → Lead.
