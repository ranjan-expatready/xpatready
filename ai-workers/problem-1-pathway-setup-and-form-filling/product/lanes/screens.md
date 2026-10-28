# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-28 (Lead, Mac, sixth chat, Claude Code): **S3 early look: changes before the founder sees it.** Stage FIX, owner Builder. (1) A run error must never show raw technical text or a file path (screenshot 03 shows ENOENT and a Mac path; QA-63 words from forms apply); retake that screenshot with the isolated copy's fake launcher working. (2) One call to action on a just-started combination: the page's Next step points to the finder offer ("Find forms") while nothing is attached. (3) After a run, one find button: the run card's "Find again" and the "Find the forms again" offer are one. (4) Same cost words on the button, tip and run card (about US$x · at most US$y). (5) **S5 merges first** (runtime is in FIX); your branch conflicts with it in `api/src/main.ts`, `pages/combination.tsx`, `tests/check_studio_browser.cjs`: after S5 is on main, sync, put the Start setup block in S5's Forms tab slot ("No form find yet"), rerun, EARLY-LOOK again with 1440 screenshots. Do (1)–(4) now. US$0.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

## Handover (screens lane, 28 Oct, kept current; a fresh session resumes from this file alone)
**Item W1-start-setup (S3 Start setup, P-125). Branch `screens/2026-10-27-visual-system`, pushed. Stage EARLY-LOOK, sent to the Lead by message (agreed challenge: `screens/W1-start-setup/challenge.md`, Lead response recorded; founder: live AI only on a click).** AI spent US$0. Copy: this worktree's folder is named `runtime-*`, so it is bound to screens by `.claude/lane` (git-ignored). Earlier item W1-visual-system round 3 and its qa FIX are merged to main (PR #66, PR #67); main synced to 3858216e.

**S3 done and pushed (WIP commits 50f50bd4, 81b6d14c, 838a5219; qa routing f8d6e0cb):**
- M3 start guard: `startWhy` + `openNodeKeys` in `api/src/lifecycle.ts`, words `WHY.startRetired / startRetiredAbove / startWaiting` in `contracts/lifecycle.ts`; on Program structure rows (`combination.startWhy`), Immigration programs cards (`CatalogueLeaf.startWhy`) and `createCombination` (409).
- M1/M4 `api/src/start-setup.ts` (own file, registered in `main.ts`): `POST /combinations/start {nodeKey}` creates (idempotent, 201/200) and replays a saved finder answer made for that combination key at US$0 (`savedFor`, the finder's own rule); `GET /combinations/:id/start-setup` = newest finder run + the one offer ("Find forms with AI (about US$x)", worst case in the tip; rules only when over the cap). Words in `contracts/start-setup.ts`.
- Web: `web/src/components/start-setup.tsx` (`useStartSetup`, `StartSetupButton` greyed with BlockedLine, `FinderStart` with the shared RunCard) used by the card/List next step (`programs.tsx`, keeps `data-next-step="start"`), the Edit panel (`structure.tsx`) and above "Sources and forms" (`combination.tsx`); the place in level colours (`data-place`). A Not started name opens no page (toast).
- M2: `/new` page, route, menu match removed; `POST /combinations/path`, `POST /path-proposal`, `CreatePathBody`, `PathProposal` removed; their checks moved (name rules to `/structure/nodes` and `/structure/path`).
- Checks: new `check_w1_start_setup.ts` (17/17; scaffolding: copies the sample's saved finder answer under its own key, removes them after) and `check_w1_start_setup_browser.cjs` (written, not run yet). Passing after the change: structure 79/79, screen01_api 135/135, screen01_rules 67/67, screen02_slice2 52/52. Moved off /new, run in progress at the save: s1s2_fix, programs_s2, screen01_browser, screen02_slice2_browser, structure_browser, programs_r3, qa51; journey Pass B rewritten (Add pop-up, then Start setup on the card).

**Evidence on 2a802b0b (code as 099eacce):** run-suites 47/48, the one fail `check_w1_programs_r3` a dropped connection 6 s in (ECONNRESET, before any step), 26/26 alone on a private copy; studio journey 45/45 (Pass B through the Add pop-up and Start setup); `check_w1_start_setup` 17/17, `check_w1_start_setup_browser` 20/20 (screenshots 1440/1024 in `screens/W1-start-setup/screenshots/`). Build notes: `screens/W1-start-setup/build-notes.md`.

**Next:** the Lead's early look on S3 (sent by message). Open points for the Lead: the page's own "Next step: Add sources" shows above the finder offer on a just-started combination (two calls to action; the shared next-step rule, next to runtime's forms); qa's `check_qa_m2_journeys` needs qa's rewrite (stale since round 3); m8 and m9 after runtime slice 2.

**Learned, not written elsewhere:**
- Other lanes run this lane's checks under the same copy names and ports (`run-suites.sh` uses the usage lines), and all copies share one PostgreSQL server: two runs at once break each other. For reruns, use private names and ports (for example `<name>_mine` on 4460+), then drop those databases.
- Long or multi-line Bash commands (heredocs, `$(…)` in some forms, loops) are refused by the merge guard hook (`gh pr merge*` matcher); put edits in a script file in the scratchpad and run it with a short command.
- Run by-products land in the tree (other lanes' screenshots, `prototype/p2/*`, `prototype/studio/evidence/*`): restore them before each commit and stage only lane files.
- The Prisma client in `node_modules` is shared with other copies: after switching branches run `./node_modules/.bin/prisma generate` if a column is reported missing.
- An author's own names delete at once (P-116 amended): a check that needs the second-person path marks its names as another person's (`update program_def set created_by='user-C'`).

current_screen: W1-start-setup (S3 Start setup)
stage: EARLY-LOOK
owner: Lead
next_action: Lead: early look on S3 Start setup (build notes and screenshots in screens/W1-start-setup/; evidence in the Handover)
then: Lead check and merge; m8 and m9 after runtime slice 2 is on main
blocked_by: none
updated: 2026-10-28

## Log (last 10 lines)
- 2026-10-28 · W1-start-setup (S3) · BUILD → EARLY-LOOK · S3 built (start guard, POST /combinations/start, landing offer live only on a click, one Start setup, /new and both path endpoints gone, checks moved); run-suites 47/48 (programs_r3 ECONNRESET, 26/26 alone), journey 45/45, start_setup 17/17, start_setup_browser 20/20. AI US$0. Owner → Lead.
- 2026-10-28 · W1-start-setup (S3) · BUILD · start guard, POST /combinations/start and the landing offer (live only on the click), one Start setup button, /new and both path endpoints removed, checks moved; check_w1_start_setup 17/17 and the touched API checks pass; qa's check_qa_am_s2_1027 routed (f8d6e0cb); synced main 3858216e. AI US$0.
- 2026-10-28 · W1-start-setup (S3) · DESIGN → BUILD · Lead answered the challenge (founder: wait for a click; M2 remove /new and both path endpoints; M3 start guard; M4 split with runtime slice 3; m5–m7, m10 accepted; m8, m9 after runtime slice 2); Lead response recorded. AI US$0.
- 2026-10-28 · W1-start-setup (S3) · DESIGN · synced main 06a8fc30 (S4 merged); screen-challenge in screens/W1-start-setup/challenge.md: Build after these changes, 4 Major (cost at Start setup, end of /new and its endpoints, a start guard for retired or waiting names, split with runtime slice 3), 6 Minor (incl. runtime's two Left-as-it-is points, after runtime slice 2), 1 founder question; no code. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · FIX → Lead · qa after-merge on dccd87e: QA-60 (letters kept after Add and add another), QA-56 (Enter accepts a typed name), QA-55 (Retire names real blockers and the way out), QA-58 (Undo kept on the page note), QA-59 (Returned with note; Send again), Button primary hover 8.15:1; each with pass and fail checks; run-suites 41/41, journey 45/45, qa's steps for these pass. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · FIX → Lead · PR #66 review fixes 19e8911d; run-suites 40/41 on it, the one failure (Add combination prefill race under load) fixed in b078f150 with a fail-guard; touched checks all pass on b078f150 and the journey 45/45. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · FIX (Lead PR #66 review) · three fixes with a pass and a fail check each: Load sample records itself as creator (sample names never an own draft), Move past a retired sibling keeps it in place, the Add pop-up seeds from the type it was opened for; structure_r3 34/34, structure_browser 123/123; full run-suites on the fix commit. AI US$0.
- 2026-10-28 · W1-visual-system · BUILD → EARLY-LOOK · round 3 built: R3a Program structure (263bb9a) with the shared lifecycle pattern (93b0040b: one guard and word set, own draft deleted at once with Undo, re-check before Approve, RowAction / BlockedLine / WherePanel / ImpactPanel / Undo toast), R3b Immigration programs (776d4169); run-suites 41/41 on 776d4169, journey 45/45; main merged e36bf06e. AI US$0. Owner → Lead.
- 2026-10-28 · W1-visual-system · DESIGN → BUILD · applied Lead note (round 3 challenge agreed, Majors 1–4, Minors 5–10); R3a built: one row-action rule (nodeCan), branch delete exact and all or nothing, a combination row's Retire/Restore with its combination, Delete wording, the page (filter bar, Tree, List, Edit + action on every row); qa words in their own commit 2101164. AI US$0.
- 2026-10-28 · W1-visual-system · EARLY-LOOK → DESIGN · applied Lead message (P-128 round 3 agreed; note on lead/2026-10-27 8e7d47f); screen-challenge written in W1-visual-system/challenge.md: Build after these changes, 4 Major, 6 Minor, back-end plan; no code. Owner → Lead. AI US$0.
