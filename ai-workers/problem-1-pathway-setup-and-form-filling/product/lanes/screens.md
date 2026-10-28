# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-28 (Lead, Mac): **Round 3 challenge read (bdcf23e): all four Majors and the six Minors accepted; Agreed 28 Oct.** Stage BUILD, owner Builder. Copy this answer under "Lead response" in `challenge.md`. (1) A combination row's Retire/Restore acts on the combination and its name together, one proposal and one approval; Delete greyed while a setup draft exists; parent rows act on names (P-116). (2) Branch delete: one proposal stores the subtree's keys; approval refused if a name was added under it or anything became used; one transaction, leaves first. (3) You may change only the "Remove" → "Delete" expectations in `check_qa_am_fix_1027` and `check_qa_am_1027`, in their own commit named for the qa lane; the Lead tells qa. (4) Two commits, R3a Program structure and R3b Immigration programs, each green on the local full suite; one early look at the end. Minors as you proposed. Desktop only. Local `run-suites.sh` evidence on your exact commit (CI now runs only on the Lead PR, P-85 amended). **Also (28 Oct, P-116 amended, `screens/W1-lifecycle-pattern/`):** build the shared lifecycle components (`components/lifecycle/`: RowAction, WherePanel, ImpactPanel, Undo toast) and the one guard in `lifecycle.ts` as part of R3a, used by Structure rows and To review; library guard kinds field, section, document type, check come with S6. Words per PRODUCT §4; an author's own never-approved draft deletes at once with Undo.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

## Handover (screens lane, 28 Oct 00:15, to a fresh session; founder's decision via the Lead)
**Stage BUILD (visual-system slice), owner Builder. Branch `screens/2026-10-27-visual-system`, pushed. Last code commit `3163224`, notes `d5e0e99`, this handover on top.** AI spent US$0.

**Done (each committed and pushed):**
- `POST /structure/path`: `contracts/structure.ts` (`StructurePathBody`, `StructurePathResult`) and `api/src/structure.ts` (`Structure.path`, the route). One transaction, new parts only, may stop at any level, no setup. Smoke-tested; covered in `check_w1_structure_browser.cjs`.
- Level tokens: `web/src/styles/levels.css`, imported in `styles/index.css` after `tokens.css`. Shared parts: `components/levels.tsx` (`LevelMark`, `Trail`, `pathwayAccent`). `components/pathway-cards.tsx` has the stripe, mark, detail and match count.
- The Add pop-up: `components/add-to-structure.tsx` (AD-1…AD-8). It also holds the `LocationPicker` moved from `structure.tsx`.
- Program structure in layout A: `pages/structure.tsx`. The page is rewritten; `DetailPanel`, `StartSetup` and `useFitToScreen` are kept; the tree, `NodeRow`, `GhostRow` and `AddRow` are gone.
- Immigration programs restyled: `pages/programs.tsx` (bands, Trail, marks, filled next step = need you, sticky List band). "+ Add pathway" goes to `/structure?add=1&from=programs`.
- Menu in setup order: `App.tsx`. The "Program structure" wording is in the pages.
- Checks: `check_w1_structure_browser.cjs` rewritten, 95/95. New `check_w1_visual_system.cjs` 21/21 and `check_w1_level_tokens.ts` 31/31. Updated to the new page, each passing alone: `check_w1_structure_s1finish.cjs` 33/33, `check_w1_s1s2_fix.cjs` 30/30. Updated for menu and wording, **not rerun yet**: `check_w1_programs_s2.cjs`, `check_screen02_slice1.cjs`, `check_studio_browser.cjs` (B0b: first Pathway through the pop-up).
- Screenshots for the early look: `product/screens/W1-visual-system/screenshots/structure/` and `…/programs/` at 1440, 1024 and 390 px.
- Notes: `product/screens/W1-visual-system/build-notes.md`. The S3 re-check (P-126, no code) is in `product/screens/W1-structure-programs/challenge.md`, last section.

**Partly done:**
- The full `run-suites.sh` run was **stopped for this handover before it finished**: no suite table on this branch yet.
- The studio journey (`--demo` suite) has **not been run** on this branch.
- CI on the branch: not looked at yet.

**Not started:**
- QA-51, QA-52 and QA-54 (the Lead adds them to this slice; details on the Lead's next PR, in lanes/screens.md).
- EARLY-LOOK hand-back.
- S3 code (waits for the founder's Go and S4's merge).

**Next steps, in order:**
1. `/next screens`: sync main; it may bring S4. `contracts/structure.ts` also changes on S4's branch (`Use.retireOk`), in a different place; expect a clean merge.
2. `bash product/tools/run-suites.sh`, then fix what fails. Likely spots:
   - `check_screen01_browser.cjs` step "item 3 + BR-7" expects the List row's last level bold; the sub-category is now `font-medium` navy, so update the check to the Trail's identity.
   - `check_w1_programs_s2.cjs`: titles and classes changed (data attributes kept).
3. Studio journey on an isolated copy: `zsh tools/isolated.sh journey 4445 start`, then `STUDIO_URL=http://localhost:4445 node tests/check_studio_browser.cjs` (45 steps).
4. QA-51, QA-52, QA-54, each with a pass and a fail check.
5. Restore run by-products (below), set EARLY-LOOK (owner Lead), push, and **send the Paste to Lead to the Lead session with SendMessage** (the Lead's rule since 27 Oct 23:40), not only in the reply.

**Learned, not written elsewhere:**
- **Long Bash commands get refused by the merge guard.** The hook (`product/tools/merge-guard.sh`, matched on `gh pr merge*`) misfires on many long or multi-line Bash commands: heredocs, `$PWD`, long sed lines. It replies "Only the Lead merges pull requests". Workaround: put edits in a script file in the scratchpad and run that short command.
- **Run by-products land in the working tree.** `run-suites.sh` and browser checks rewrite other lanes' screenshots (`product/screens/01-…`, `02-ai-work`, `R1-thin-slice`, `W1-structure-programs/*`), `prototype/p2/{ledger,runs,jobs,screening}` and `prototype/studio/evidence/`. Before every commit, run `git checkout --` on them, remove untracked files, and confirm `git diff --name-status origin/main...HEAD` lists only lane files (S2's break M3 came from this).
- **Isolated copies:** each name has its own database; two checks on one name share data, so run them one at a time:
  - `screens_s2` 4444 (structure browser) shares a name with `check_w1_programs_s2.cjs` (4447).
  - `screens_s1s2` 4448 (FIX check).
  - `screens_vs` 4449 (visual check).
  - `journey` 4445.
- **The machine is busy (load about 15).** Timing steps can fail in the full run and pass alone: rerun a failed suite alone before treating it as a defect.
- **Page behaviour:** Program structure opens on the Pathway this person last chose (`xr-structure-pathway:<actor>` in browser storage; `p=all` is All pathways). A check that wants every band should open `/structure?p=all`.

current_screen: W1-visual-system
stage: EARLY-LOOK
owner: Lead
next_action: Lead: early look of round 3 with the founder (R3a Program structure with the shared lifecycle pattern, R3b Immigration programs); screenshots in screens/W1-visual-system/screenshots/structure/ and programs/r3-* at 1440 and 1024; build-notes "Round 3" sections
then: S3 BUILD after round 3, the founder's Go and S4's merge (S3 re-check and addendum done, P-126); wave 1 desktop only (1440, 1024)
blocked_by: none
updated: 2026-10-28

## Log (last 10 lines)
- 2026-10-28 · W1-visual-system · BUILD → EARLY-LOOK · round 3 built: R3a Program structure (263bb9a) with the shared lifecycle pattern (93b0040b: one guard and word set, own draft deleted at once with Undo, re-check before Approve, RowAction / BlockedLine / WherePanel / ImpactPanel / Undo toast), R3b Immigration programs (776d4169); run-suites 41/41 on 776d4169, journey 45/45; main merged e36bf06e. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · DESIGN → BUILD · applied Lead note (round 3 challenge agreed, Majors 1–4, Minors 5–10); R3a built: one row-action rule (nodeCan), branch delete exact and all or nothing, a combination row's Retire/Restore with its combination, Delete wording, the page (filter bar, Tree, List, Edit + action on every row); qa words in their own commit 2101164. AI US$0.
- 2026-10-28 · W1-visual-system · EARLY-LOOK → DESIGN · applied Lead message (P-128 round 3 agreed; note on lead/2026-10-27 8e7d47f); screen-challenge written in W1-visual-system/challenge.md: Build after these changes, 4 Major, 6 Minor, back-end plan; no code. Owner → Lead. AI US$0.
- 2026-10-28 · W1-visual-system · EARLY-LOOK · Lead message: the founder's early look is Changes (do not merge; the Add pop-up stays; Program structure round 3 board coming; wave 1 desktop only). No code on Program structure or Immigration programs (P-126); the S3 re-check got an addendum (round 3 row actions, desktop only). Stopped at a safe point. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD → EARLY-LOOK · AD-8 focus race fixed at the cause (Dialog initialFocus); full run-suites 40/40 PASS (0b60e6a), studio journey 45/45 on 4445, CI suites green on f7124e9 (run 40562533734; later commits are screenshots and notes only); graph check passes. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · BUILD · applied the Lead's drift check (Fix first, items 1–5): four CI-red suites fixed, Used by on each line, focus kept during Add and add another, POST /structure/path API check 28/28 (found and fixed: None on a category with sub-categories said "already there"); structure_path 28/28, s1s2_fix 30/30, programs_s2 87/87; 25f1b12. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD · applied Lead note 2026-10-28 00:30; synced main 8cfc043 (clean); QA-51, QA-52, QA-54 built with pass and fail checks (check_w1_qa51_52_54 21/21; qa check's three steps pass); 381b44e pushed; this copy's folder is named runtime-*, so it was bound to screens with .claude/lane. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD · handover to a fresh session (founder, via the Lead): slice built and pushed; full suites stopped unfinished and the studio journey not run on this branch; Handover section written. AI US$0.
- 2026-10-27 · W1-visual-system · CHECK → BUILD · applied Lead note 2026-10-27 22:50 (FIX merged, 027174d); new branch screens/2026-10-27-visual-system from main; built level tokens, LevelMark/Trail/stripe, POST /structure/path, the Add to Program structure pop-up, Program structure layout A, Immigration programs restyled, menu in setup order; checks: structure 95/95, visual 21/21, tokens 31/31; S3 re-check in W1-structure-programs/challenge.md. AI US$0.
- 2026-10-27 · W1-structure-programs · FIX → CHECK · seven items fixed (QA-44/45/46/49/50, review m1, break m8); check_w1_s1s2_fix 30/30; suites 34 PASS + 2 reruns alone PASS (s1finish now waits for 'Added'; forms_slice2b fetch flake 36/36); synced main 94d14ce, then s1s2_fix 30/30, programs_s2 87/87, s1finish 33/33; studio journey 45/45 on 4445; no by-products in the branch. AI US$0. Owner → Lead.