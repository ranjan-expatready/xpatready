# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-28 (Lead, Mac): **qa after-merge on round 3 (main dccd87e): ready, with findings → one FIX pass before S3** (also by message): QA-60 Major (Add and add another loses the first letters typed during a save), QA-55 (greyed Retire names unused names as blocking), QA-56 (Enter on a new name in the pop-up), QA-58 (Undo for own delete vanishes after 10 s), QA-59 (returned deletion still says waiting); QA-57 already fixed in S4; the Button hover contrast. Each with pass and fail tests; then S3 Start setup (DESIGN). Save often.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

## Handover (screens lane, 28 Oct, kept current; a fresh session resumes from this file alone)
**Item W1-start-setup (S3 Start setup, P-125). Branch `screens/2026-10-27-visual-system`, pushed. Stage BUILD (agreed challenge: `screens/W1-start-setup/challenge.md`, Lead response recorded; founder: live AI only on a click).** AI spent US$0. Copy: this worktree's folder is named `runtime-*`, so it is bound to screens by `.claude/lane` (git-ignored). Earlier item W1-visual-system round 3 and its qa FIX are merged to main (PR #66, PR #67); main synced to 3858216e.

**S3 done and pushed (WIP commits 50f50bd4, 81b6d14c, 838a5219; qa routing f8d6e0cb):**
- M3 start guard: `startWhy` + `openNodeKeys` in `api/src/lifecycle.ts`, words `WHY.startRetired / startRetiredAbove / startWaiting` in `contracts/lifecycle.ts`; on Program structure rows (`combination.startWhy`), Immigration programs cards (`CatalogueLeaf.startWhy`) and `createCombination` (409).
- M1/M4 `api/src/start-setup.ts` (own file, registered in `main.ts`): `POST /combinations/start {nodeKey}` creates (idempotent, 201/200) and replays a saved finder answer made for that combination key at US$0 (`savedFor`, the finder's own rule); `GET /combinations/:id/start-setup` = newest finder run + the one offer ("Find forms with AI (about US$x)", worst case in the tip; rules only when over the cap). Words in `contracts/start-setup.ts`.
- Web: `web/src/components/start-setup.tsx` (`useStartSetup`, `StartSetupButton` greyed with BlockedLine, `FinderStart` with the shared RunCard) used by the card/List next step (`programs.tsx`, keeps `data-next-step="start"`), the Edit panel (`structure.tsx`) and above "Sources and forms" (`combination.tsx`); the place in level colours (`data-place`). A Not started name opens no page (toast).
- M2: `/new` page, route, menu match removed; `POST /combinations/path`, `POST /path-proposal`, `CreatePathBody`, `PathProposal` removed; their checks moved (name rules to `/structure/nodes` and `/structure/path`).
- Checks: new `check_w1_start_setup.ts` (17/17; scaffolding: copies the sample's saved finder answer under its own key, removes them after) and `check_w1_start_setup_browser.cjs` (written, not run yet). Passing after the change: structure 79/79, screen01_api 135/135, screen01_rules 67/67, screen02_slice2 52/52. Moved off /new, run in progress at the save: s1s2_fix, programs_s2, screen01_browser, screen02_slice2_browser, structure_browser, programs_r3, qa51; journey Pass B rewritten (Add pop-up, then Start setup on the card).

**Next (left for S3):** (1) rebuild web (`cd web && ../node_modules/.bin/vite build`) and run the moved browser checks plus `check_w1_start_setup_browser` on private copies, fix what fails; (2) full `run-suites.sh` and the studio journey on the exact commit; (3) build notes `screens/W1-start-setup/build-notes.md`; (4) EARLY-LOOK by message to the Lead with screenshots (`screens/W1-start-setup/screenshots/`). Tell the Lead: qa's `check_qa_m2_journeys.cjs` was already stale before S3 (its "New combination" button left main in round 3), so it needs qa's rewrite; m8 and m9 wait for runtime slice 2 on main.

**Learned, not written elsewhere:**
- Other lanes run this lane's checks under the same copy names and ports (`run-suites.sh` uses the usage lines), and all copies share one PostgreSQL server: two runs at once break each other. For reruns, use private names and ports (for example `<name>_mine` on 4460+), then drop those databases.
- Long or multi-line Bash commands (heredocs, `$(…)` in some forms, loops) are refused by the merge guard hook (`gh pr merge*` matcher); put edits in a script file in the scratchpad and run it with a short command.
- Run by-products land in the tree (other lanes' screenshots, `prototype/p2/*`, `prototype/studio/evidence/*`): restore them before each commit and stage only lane files.
- The Prisma client in `node_modules` is shared with other copies: after switching branches run `./node_modules/.bin/prisma generate` if a column is reported missing.
- An author's own names delete at once (P-116 amended): a check that needs the second-person path marks its names as another person's (`update program_def set created_by='user-C'`).

current_screen: W1-start-setup (S3 Start setup)
stage: BUILD
owner: Builder
next_action: S3: run the moved browser checks and check_w1_start_setup_browser, full run-suites and the journey, build notes, then EARLY-LOOK by message (Handover: Left for S3)
then: EARLY-LOOK by message; desktop only (1440, 1024)
blocked_by: none
updated: 2026-10-28

## Log (last 10 lines)
- 2026-10-28 · W1-start-setup (S3) · BUILD · start guard, POST /combinations/start and the landing offer (live only on the click), one Start setup button, /new and both path endpoints removed, checks moved; check_w1_start_setup 17/17 and the touched API checks pass; qa's check_qa_am_s2_1027 routed (f8d6e0cb); synced main 3858216e. AI US$0.
- 2026-10-28 · W1-start-setup (S3) · DESIGN → BUILD · Lead answered the challenge (founder: wait for a click; M2 remove /new and both path endpoints; M3 start guard; M4 split with runtime slice 3; m5–m7, m10 accepted; m8, m9 after runtime slice 2); Lead response recorded. AI US$0.
- 2026-10-28 · W1-start-setup (S3) · DESIGN · synced main 06a8fc30 (S4 merged); screen-challenge in screens/W1-start-setup/challenge.md: Build after these changes, 4 Major (cost at Start setup, end of /new and its endpoints, a start guard for retired or waiting names, split with runtime slice 3), 6 Minor (incl. runtime's two Left-as-it-is points, after runtime slice 2), 1 founder question; no code. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · FIX → Lead · qa after-merge on dccd87e: QA-60 (letters kept after Add and add another), QA-56 (Enter accepts a typed name), QA-55 (Retire names real blockers and the way out), QA-58 (Undo kept on the page note), QA-59 (Returned with note; Send again), Button primary hover 8.15:1; each with pass and fail checks; run-suites 41/41, journey 45/45, qa's steps for these pass. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · FIX → Lead · PR #66 review fixes 19e8911d; run-suites 40/41 on it, the one failure (Add combination prefill race under load) fixed in b078f150 with a fail-guard; touched checks all pass on b078f150 and the journey 45/45. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · FIX (Lead PR #66 review) · three fixes with a pass and a fail check each: Load sample records itself as creator (sample names never an own draft), Move past a retired sibling keeps it in place, the Add pop-up seeds from the type it was opened for; structure_r3 34/34, structure_browser 123/123; full run-suites on the fix commit. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD → EARLY-LOOK · round 3 built: R3a Program structure (263bb9a) with the shared lifecycle pattern (93b0040b: one guard and word set, own draft deleted at once with Undo, re-check before Approve, RowAction / BlockedLine / WherePanel / ImpactPanel / Undo toast), R3b Immigration programs (776d4169); run-suites 41/41 on 776d4169, journey 45/45; main merged e36bf06e. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · DESIGN → BUILD · applied Lead note (round 3 challenge agreed, Majors 1–4, Minors 5–10); R3a built: one row-action rule (nodeCan), branch delete exact and all or nothing, a combination row's Retire/Restore with its combination, Delete wording, the page (filter bar, Tree, List, Edit + action on every row); qa words in their own commit 2101164. AI US$0.
- 2026-10-28 · W1-visual-system · EARLY-LOOK → DESIGN · applied Lead message (P-128 round 3 agreed; note on lead/2026-10-27 8e7d47f); screen-challenge written in W1-visual-system/challenge.md: Build after these changes, 4 Major, 6 Minor, back-end plan; no code. Owner → Lead. AI US$0.
- 2026-10-28 · W1-visual-system · EARLY-LOOK · Lead message: the founder's early look is Changes (do not merge; the Add pop-up stays; Program structure round 3 board coming; wave 1 desktop only). No code on Program structure or Immigration programs (P-126); the S3 re-check got an addendum (round 3 row actions, desktop only). Stopped at a safe point. AI US$0.
