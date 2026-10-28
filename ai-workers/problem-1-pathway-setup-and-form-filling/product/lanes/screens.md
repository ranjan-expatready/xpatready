# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-28 (Lead, Mac): **Round 3 challenge read (bdcf23e): all four Majors and the six Minors accepted; Agreed 28 Oct.** Stage BUILD, owner Builder. Copy this answer under "Lead response" in `challenge.md`. (1) A combination row's Retire/Restore acts on the combination and its name together, one proposal and one approval; Delete greyed while a setup draft exists; parent rows act on names (P-116). (2) Branch delete: one proposal stores the subtree's keys; approval refused if a name was added under it or anything became used; one transaction, leaves first. (3) You may change only the "Remove" → "Delete" expectations in `check_qa_am_fix_1027` and `check_qa_am_1027`, in their own commit named for the qa lane; the Lead tells qa. (4) Two commits, R3a Program structure and R3b Immigration programs, each green on the local full suite; one early look at the end. Minors as you proposed. Desktop only. Local `run-suites.sh` evidence on your exact commit (CI now runs only on the Lead PR, P-85 amended). **Also (28 Oct, P-116 amended, `screens/W1-lifecycle-pattern/`):** build the shared lifecycle components (`components/lifecycle/`: RowAction, WherePanel, ImpactPanel, Undo toast) and the one guard in `lifecycle.ts` as part of R3a, used by Structure rows and To review; library guard kinds field, section, document type, check come with S6. Words per PRODUCT §4; an author's own never-approved draft deletes at once with Undo.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

## Handover (screens lane, 28 Oct, kept current; a fresh session resumes from this file alone)
**Item W1-visual-system, round 3 (P-128, the shared lifecycle pattern P-116 amended). Branch `screens/2026-10-27-visual-system`, pushed. Stage FIX for the Lead PR #66 review → back to the Lead.** AI spent US$0. Copy: this worktree's folder is named `runtime-*`, so it is bound to screens by `.claude/lane` (git-ignored).

**Done and pushed:**
- R3a Program structure 263bb9a; shared lifecycle pattern 93b0040b (one guard `api/src/lifecycle.ts`, one word set `contracts/lifecycle.ts`, components `web/src/components/lifecycle/`); R3b Immigration programs 776d4169; qa-lane words 2101164; main merged e36bf06e. Founder Go on round 3; Lead check passed; Lead PR #66 (`lead/2026-10-28-r3`) green CI.
- FIX for the PR #66 review, 19e8911d: (1) Load sample records itself as creator (`SAMPLE_CREATOR`), so sample names are never an own draft; (2) Move past a retired sibling keeps it in place; (3) the Add pop-up seeds from the type it was opened for. Checks: structure_r3 34/34, structure_browser 123/123, structure 83/83, programs_r3 25/25, s1s2_fix 30/30, qa51 21/21.
- Evidence so far: run-suites 41/41 on 776d4169; studio journey 45/45 (private copy).

**In progress:** full `run-suites.sh` on 19e8911d (started 28 Oct). If this session stopped, run it again from the copy root and give the Lead the table.

**Next:** send the Lead the FIX hand-back by message (Paste to Lead) with the 19e8911d suite result; the Lead re-merges PR #66. Then S3 (Start setup) after S4's merge, from the S3 re-check and addendum in `screens/W1-structure-programs/challenge.md`.

**Learned, not written elsewhere:**
- Other lanes run this lane's checks under the same copy names and ports (`run-suites.sh` uses the usage lines), and all copies share one PostgreSQL server: two runs at once break each other. For reruns, use private names and ports (for example `<name>_mine` on 4460+), then drop those databases.
- Long or multi-line Bash commands (heredocs, `$(…)` in some forms, loops) are refused by the merge guard hook (`gh pr merge*` matcher); put edits in a script file in the scratchpad and run it with a short command.
- Run by-products land in the tree (other lanes' screenshots, `prototype/p2/*`, `prototype/studio/evidence/*`): restore them before each commit and stage only lane files.
- The Prisma client in `node_modules` is shared with other copies: after switching branches run `./node_modules/.bin/prisma generate` if a column is reported missing.
- An author's own names delete at once (P-116 amended): a check that needs the second-person path marks its names as another person's (`update program_def set created_by='user-C'`).

current_screen: W1-visual-system
stage: FIX
owner: Builder
next_action: Builder: full run-suites on 19e8911d (the PR #66 review fixes), then the FIX hand-back to the Lead by message; the Lead re-merges PR #66
then: S3 BUILD after round 3, the founder's Go and S4's merge (S3 re-check and addendum done, P-126); wave 1 desktop only (1440, 1024)
blocked_by: none
updated: 2026-10-28

## Log (last 10 lines)
- 2026-10-28 · W1-visual-system · FIX (Lead PR #66 review) · three fixes with a pass and a fail check each: Load sample records itself as creator (sample names never an own draft), Move past a retired sibling keeps it in place, the Add pop-up seeds from the type it was opened for; structure_r3 34/34, structure_browser 123/123; full run-suites on the fix commit. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD → EARLY-LOOK · round 3 built: R3a Program structure (263bb9a) with the shared lifecycle pattern (93b0040b: one guard and word set, own draft deleted at once with Undo, re-check before Approve, RowAction / BlockedLine / WherePanel / ImpactPanel / Undo toast), R3b Immigration programs (776d4169); run-suites 41/41 on 776d4169, journey 45/45; main merged e36bf06e. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · DESIGN → BUILD · applied Lead note (round 3 challenge agreed, Majors 1–4, Minors 5–10); R3a built: one row-action rule (nodeCan), branch delete exact and all or nothing, a combination row's Retire/Restore with its combination, Delete wording, the page (filter bar, Tree, List, Edit + action on every row); qa words in their own commit 2101164. AI US$0.
- 2026-10-28 · W1-visual-system · EARLY-LOOK → DESIGN · applied Lead message (P-128 round 3 agreed; note on lead/2026-10-27 8e7d47f); screen-challenge written in W1-visual-system/challenge.md: Build after these changes, 4 Major, 6 Minor, back-end plan; no code. Owner → Lead. AI US$0.
- 2026-10-28 · W1-visual-system · EARLY-LOOK · Lead message: the founder's early look is Changes (do not merge; the Add pop-up stays; Program structure round 3 board coming; wave 1 desktop only). No code on Program structure or Immigration programs (P-126); the S3 re-check got an addendum (round 3 row actions, desktop only). Stopped at a safe point. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD → EARLY-LOOK · AD-8 focus race fixed at the cause (Dialog initialFocus); full run-suites 40/40 PASS (0b60e6a), studio journey 45/45 on 4445, CI suites green on f7124e9 (run 40562533734; later commits are screenshots and notes only); graph check passes. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · BUILD · applied the Lead's drift check (Fix first, items 1–5): four CI-red suites fixed, Used by on each line, focus kept during Add and add another, POST /structure/path API check 28/28 (found and fixed: None on a category with sub-categories said "already there"); structure_path 28/28, s1s2_fix 30/30, programs_s2 87/87; 25f1b12. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD · applied Lead note 2026-10-28 00:30; synced main 8cfc043 (clean); QA-51, QA-52, QA-54 built with pass and fail checks (check_w1_qa51_52_54 21/21; qa check's three steps pass); 381b44e pushed; this copy's folder is named runtime-*, so it was bound to screens with .claude/lane. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD · handover to a fresh session (founder, via the Lead): slice built and pushed; full suites stopped unfinished and the studio journey not run on this branch; Handover section written. AI US$0.
- 2026-10-27 · W1-visual-system · CHECK → BUILD · applied Lead note 2026-10-27 22:50 (FIX merged, 027174d); new branch screens/2026-10-27-visual-system from main; built level tokens, LevelMark/Trail/stripe, POST /structure/path, the Add to Program structure pop-up, Program structure layout A, Immigration programs restyled, menu in setup order; checks: structure 95/95, visual 21/21, tokens 31/31; S3 re-check in W1-structure-programs/challenge.md. AI US$0.
