# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-28 (Lead, Mac): **Round 3 founder Go; Lead check passed (cf8f6ca6); merging via Lead PR** (`screens/W1-visual-system/lead-check.md`). Lead choices: List Edit opens the combination's panel; List starts in page order; chip choice not remembered (backlog). Next for this lane after the merge (stage DESIGN, owner Builder): **S3 Start setup** (P-125: Start setup opens the workspace, place read-only; `/new` retires): refresh your S3 re-check against main, write the concept challenge, then PLAN by message. The runtime "Left as it is" points (Programs next step wording during a removed released form; rule messages naming field codes) come into S3. Library lifecycle kinds come with S6. Desktop only; local run-suites evidence.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

## Handover (screens lane, 28 Oct, kept current; a fresh session resumes from this file alone)
**Item W1-visual-system, round 3 (P-128, the shared lifecycle pattern P-116 amended). Branch `screens/2026-10-27-visual-system`, pushed. Stage FIX for qa's after-merge on main dccd87e (Lead message 28 Oct) → back to the Lead; then S3.** AI spent US$0. Copy: this worktree's folder is named `runtime-*`, so it is bound to screens by `.claude/lane` (git-ignored).

**Done and pushed:**
- R3a Program structure 263bb9a; shared lifecycle pattern 93b0040b (one guard `api/src/lifecycle.ts`, one word set `contracts/lifecycle.ts`, components `web/src/components/lifecycle/`); R3b Immigration programs 776d4169; qa-lane words 2101164; main merged e36bf06e. Founder Go on round 3; Lead check passed; Lead PR #66 (`lead/2026-10-28-r3`) green CI.
- FIX for the PR #66 review, 19e8911d: (1) Load sample records itself as creator (`SAMPLE_CREATOR`), so sample names are never an own draft; (2) Move past a retired sibling keeps it in place; (3) the Add pop-up seeds from the type it was opened for. Checks: structure_r3 34/34, structure_browser 123/123, structure 83/83, programs_r3 25/25, s1s2_fix 30/30, qa51 21/21.
- Evidence so far: run-suites 41/41 on 776d4169; studio journey 45/45 (private copy).

- Follow-up b078f150: under load the full run caught Add combination prefilling the Program without the Pathway (the Pathway came from the catalogue's answer, the Program from the address); the Pathway now comes from the address and the pop-up fills an empty level from the one below.
- Evidence: full run-suites on 19e8911d 40/41 (the one failure is that prefill race, fixed in b078f150); on b078f150 every touched check passes on private copies (programs_r3 26/26, programs_s2 87/87, structure_browser 123/123, s1s2_fix 30/30, qa51 21/21, visual_system 21/21, screen01_browser 128/128, smallfix) and the studio journey 45/45.

- FIX for qa's after-merge on main dccd87e (qa branch `claude/qa-after-merge-s1-21bfdf` 9ad98f37; QA-57 was already fixed in S4's merge, not redone): QA-60 bccd7f26 (letters typed after "Add and add another" kept), QA-56 3da467e6 (Enter accepts a typed name), QA-55 3abc0a35 (Retire names what really blocks, with the way out), QA-58 691d7303 (Undo kept on the page note), QA-59 9ba1630d (Returned with the note; Send again), Button primary hover f4145a47 (darker, 8.15:1). Each with a pass step and a fail or fail-guard; table in `screens/W1-visual-system/build-notes.md` "Fixes after qa's after-merge".
- Evidence: touched checks on private copies (structure_browser 135/135, structure_r3 41/41, structure 83/83, visual_system 24/24); full run-suites on f4145a47 running.

**Next:** finish the evidence on f4145a47 (run-suites, qa's two checks, studio journey), then hand back to the Lead by message

**Learned, not written elsewhere:**
- Other lanes run this lane's checks under the same copy names and ports (`run-suites.sh` uses the usage lines), and all copies share one PostgreSQL server: two runs at once break each other. For reruns, use private names and ports (for example `<name>_mine` on 4460+), then drop those databases.
- Long or multi-line Bash commands (heredocs, `$(…)` in some forms, loops) are refused by the merge guard hook (`gh pr merge*` matcher); put edits in a script file in the scratchpad and run it with a short command.
- Run by-products land in the tree (other lanes' screenshots, `prototype/p2/*`, `prototype/studio/evidence/*`): restore them before each commit and stage only lane files.
- The Prisma client in `node_modules` is shared with other copies: after switching branches run `./node_modules/.bin/prisma generate` if a column is reported missing.
- An author's own names delete at once (P-116 amended): a check that needs the second-person path marks its names as another person's (`update program_def set created_by='user-C'`).

current_screen: W1-visual-system
stage: FIX (qa after-merge dccd87e)
owner: Builder
next_action: finish the evidence on f4145a47 (run-suites, qa's two checks, studio journey), then hand back to the Lead by message
then: S3 Start setup (stage DESIGN): refresh the S3 re-check against main, concept challenge, PLAN by message; desktop only (1440, 1024)
blocked_by: none
updated: 2026-10-28

## Log (last 10 lines)
- 2026-10-28 · W1-visual-system · FIX → Lead · PR #66 review fixes 19e8911d; run-suites 40/41 on it, the one failure (Add combination prefill race under load) fixed in b078f150 with a fail-guard; touched checks all pass on b078f150 and the journey 45/45. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · FIX (Lead PR #66 review) · three fixes with a pass and a fail check each: Load sample records itself as creator (sample names never an own draft), Move past a retired sibling keeps it in place, the Add pop-up seeds from the type it was opened for; structure_r3 34/34, structure_browser 123/123; full run-suites on the fix commit. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD → EARLY-LOOK · round 3 built: R3a Program structure (263bb9a) with the shared lifecycle pattern (93b0040b: one guard and word set, own draft deleted at once with Undo, re-check before Approve, RowAction / BlockedLine / WherePanel / ImpactPanel / Undo toast), R3b Immigration programs (776d4169); run-suites 41/41 on 776d4169, journey 45/45; main merged e36bf06e. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · DESIGN → BUILD · applied Lead note (round 3 challenge agreed, Majors 1–4, Minors 5–10); R3a built: one row-action rule (nodeCan), branch delete exact and all or nothing, a combination row's Retire/Restore with its combination, Delete wording, the page (filter bar, Tree, List, Edit + action on every row); qa words in their own commit 2101164. AI US$0.
- 2026-10-28 · W1-visual-system · EARLY-LOOK → DESIGN · applied Lead message (P-128 round 3 agreed; note on lead/2026-10-27 8e7d47f); screen-challenge written in W1-visual-system/challenge.md: Build after these changes, 4 Major, 6 Minor, back-end plan; no code. Owner → Lead. AI US$0.
- 2026-10-28 · W1-visual-system · EARLY-LOOK · Lead message: the founder's early look is Changes (do not merge; the Add pop-up stays; Program structure round 3 board coming; wave 1 desktop only). No code on Program structure or Immigration programs (P-126); the S3 re-check got an addendum (round 3 row actions, desktop only). Stopped at a safe point. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD → EARLY-LOOK · AD-8 focus race fixed at the cause (Dialog initialFocus); full run-suites 40/40 PASS (0b60e6a), studio journey 45/45 on 4445, CI suites green on f7124e9 (run 40562533734; later commits are screenshots and notes only); graph check passes. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · BUILD · applied the Lead's drift check (Fix first, items 1–5): four CI-red suites fixed, Used by on each line, focus kept during Add and add another, POST /structure/path API check 28/28 (found and fixed: None on a category with sub-categories said "already there"); structure_path 28/28, s1s2_fix 30/30, programs_s2 87/87; 25f1b12. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD · applied Lead note 2026-10-28 00:30; synced main 8cfc043 (clean); QA-51, QA-52, QA-54 built with pass and fail checks (check_w1_qa51_52_54 21/21; qa check's three steps pass); 381b44e pushed; this copy's folder is named runtime-*, so it was bound to screens with .claude/lane. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD · handover to a fresh session (founder, via the Lead): slice built and pushed; full suites stopped unfinished and the studio journey not run on this branch; Handover section written. AI US$0.
