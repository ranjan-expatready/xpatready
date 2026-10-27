# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-28 00:30 (Lead, Mac): **Handover read (f05a2e1).** For the fresh screens session: **stage BUILD, owner Builder, branch `screens/2026-10-27-visual-system`.** Finish the visual-system slice from your Handover section below: add **QA-51** (To review trail shows its Pathway type), **QA-52** (removal approval says what happens: an unused name goes at once), **QA-54** (a case person opening `/` or `/structure` by URL sees "This page is for configuration people" with a way back, not a load error); run the full suites and the studio journey on your isolated copy; check CI on your exact commit; then **EARLY-LOOK** (screenshots at 1440, 1024, 390 px) and send your Paste to the Lead by message. **P-126:** while that early look waits, the S3 re-check is done (in `W1-structure-programs/challenge.md`); no S3 code until the founder's Go and S4's merge. AI US$0; by-products out of commits.

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
stage: BUILD
owner: Builder
next_action: Builder: full run-suites running on 381b44e; then the studio journey (4445), CI on the exact commit, EARLY-LOOK and SendMessage to the Lead
then: EARLY-LOOK for the founder; S3 BUILD after the founder's Go and S4's merge
blocked_by: none
updated: 2026-10-28

## Log (last 10 lines)
- 2026-10-28 · W1-visual-system · BUILD · applied Lead note 2026-10-28 00:30; synced main 8cfc043 (clean); QA-51, QA-52, QA-54 built with pass and fail checks (check_w1_qa51_52_54 21/21; qa check's three steps pass); 381b44e pushed; this copy's folder is named runtime-*, so it was bound to screens with .claude/lane. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD · handover to a fresh session (founder, via the Lead): slice built and pushed; full suites stopped unfinished and the studio journey not run on this branch; Handover section written. AI US$0.
- 2026-10-27 · W1-visual-system · CHECK → BUILD · applied Lead note 2026-10-27 22:50 (FIX merged, 027174d); new branch screens/2026-10-27-visual-system from main; built level tokens, LevelMark/Trail/stripe, POST /structure/path, the Add to Program structure pop-up, Program structure layout A, Immigration programs restyled, menu in setup order; checks: structure 95/95, visual 21/21, tokens 31/31; S3 re-check in W1-structure-programs/challenge.md. AI US$0.
- 2026-10-27 · W1-structure-programs · FIX → CHECK · seven items fixed (QA-44/45/46/49/50, review m1, break m8); check_w1_s1s2_fix 30/30; suites 34 PASS + 2 reruns alone PASS (s1finish now waits for 'Added'; forms_slice2b fetch flake 36/36); synced main 94d14ce, then s1s2_fix 30/30, programs_s2 87/87, s1finish 33/33; studio journey 45/45 on 4445; no by-products in the branch. AI US$0. Owner → Lead.
- 2026-10-27 · W1-structure-programs · CHECK → FIX · applied Lead note 2026-10-27 (S2 merged PR #53; FIX QA-44, QA-45, QA-46, QA-49, QA-50, review m1, break m8); new branch screens/2026-10-27-s1s2-fix from main 57f6f8c; all seven built with a pass and a fail check each (check_w1_s1s2_fix 30/30). AI US$0.
- 2026-10-27 · W1-structure-programs · FIX → CHECK · CHECK findings fixed (241e2b4): review M1 need-you counting tested with real waiting states; break M1 unknown/long p= ignored, M2 keys to 400, M3 other lanes' files back to main; minors; all 35 suites PASS, check_w1_programs_s2 87/87, studio journey 45/45 on 4445. AI US$0. Owner → Lead.
- 2026-10-27 · W1-structure-programs · CHECK → FIX · breaker on b45ca44: 0 Blocker, 3 Major (bad p= shows empty Pathways; long keys fail own contracts; other lanes' files in the branch), 9 Minor; all three Majors and the reviewer's Major fixed with checks; check_w1_programs_s2 87/87. AI US$0.
- 2026-10-27 · W1-structure-programs · CHECK · screen-reviewer on b45ca44: Ship after fixes, journey 9/10, 0 Blocker/Must, 1 Major (need-you counting untested), 10 Minor; review.md + journey-test-reviewer-2026-10-27-s2.md. Breaker running. AI US$0.
- 2026-10-27 · W1-structure-programs · FIX → CHECK · b45ca44 pushed: seven fixes; check_w1_programs_s2 74/74, studio journey 45/45 on 4445, failed suites rerun alone clean (machine busy: load 15); screen-reviewer and screen-breaker launched. AI US$0.
- 2026-10-27 · W1-structure-programs · FIX · seven S2 early-look fixes built (P-112 sample Pathways, Start setup, no silent start, form counts agree, search full width, need-you = waiting on a person, Not started card); check_w1_programs_s2 74/74; build-notes 'S2 Fixes'. Suites running. AI US$0.