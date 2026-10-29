# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-29 (Lead, eighth chat): **The forms lane's contract v2 (P-149) and P-154 are approved**; it reaches `main` when the Lead merges the forms branch (after its runner package). Stage BUILD, owner Builder: finish the full local `run-suites.sh` on slice R's US$0 part (21556f3a, with the P-158 delta in `plan-p158.md` as agreed), then hand back stage CHECK for the Lead check of slice R (no live call; the paid recording pass waits the founder's spend OK). S6 slice 1 BUILD starts after the forms merge, on the approved contract (one new `ProposalItem` table; field proposals move onto it). US$0.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

## Handover (screens lane, 29 Oct evening, kept current; a fresh session resumes from this file alone)
**Branch `claude/screens-2a-22c0e2` (worktree `screens-2a-22c0e2`), pushed at 38cc245d; main d2399813 synced (PR #91 merged since, at 816815ff).** AI spent US$0. Node: `.tools/node-v24.21.0` (the Homebrew node 23 is refused by Prisma); a fresh worktree needs `lane.sh setup` with that node first, then `prisma generate`.

**Done this session: queue item (2a)** (detail in `screens/W1-shared-library/build-notes.md`):
- the three free adds answer 410;
- `GET /library/:kind/:key/sources`, with source and used_in on the list rows;
- rename of a field's name and a section's title;
- one origin line per library page.

Results: `check_s6_library_sources` 24/24, `check_s6_library_pages_browser` 33/33. The checks that used the adds now seed through `tests/seed_library.cjs`; this includes forms' and runtime's files, listed in build-notes.

**Lead note 29 Oct (P-97):** once runtime's `POST /library/fields/:key/fills` is on main, the field page's "Collected from" becomes read-only for an existing placement, with a "Change who fills" button. That is library.tsx, so it is ours. It was not on main at 0ad1076c, so it is kept out of (2a).

**Next (Lead's queue, P-173):** (1) S6 slice 1, one review queue on contract v2 (one `ProposalItem` table) when forms PR #90 merges; (2) library lists: where used, origin, rename, P-158 door (C3.13–3.15, C3.6) — plan in `screens/W1-shared-library/plan-p158.md` items 1, 6, 8; (3) one setup checklist per combination (P-157, P-161); (4) linking combinations, copying a line (C1.3, C1.5). **Item (2) is heavy and half of it waits on #90** (the door makes every item a `ProposalItem`; the rule-sourced field needs forms' `ProposalSource` change). Doable before #90: drop the Add buttons, 410 on `POST /library/fields`, `/library/sections`, `/library/answer-lists` (update the checks that use them: check_studio_browser, check_screen01_*), `GET /library/:kind/:key/sources`, where used, rename, one "where items come from" line per page. Agree the split with the Lead before building.

**Not screens' (routed in the hand-backs):** runtime.ts "opened case <id>" (QA-74); engine/validate.ts messages with codes (QA-73); section meanings are release c1-v3 content (QA-71); QA-82 to forms W1-10 / S6 slice 1; qa's `check_qa_am_r69_1028.cjs:123` selects the person by the old label.

**Learned, not written elsewhere:**
- Bash here refuses heredocs, `$(…)`, loops and some long `&&` chains (merge-guard hook): write a script to the scratchpad and run it. The catalogue caches rows keyed on activity counts: a check that changes the database by SQL also inserts an `audit_event` row.
- Other lanes run this lane's checks under the same copy names and ports (`run-suites.sh` uses the usage lines), and all copies share one PostgreSQL server: two runs at once break each other. For reruns, use private names and ports (for example `<name>_mine` on 4460+), then drop those databases.
- Long or multi-line Bash commands (heredocs, `$(…)` in some forms, loops) are refused by the merge guard hook (`gh pr merge*` matcher); put edits in a script file in the scratchpad and run it with a short command.
- Run by-products land in the tree (other lanes' screenshots, `prototype/p2/*`, `prototype/studio/evidence/*`): restore them before each commit and stage only lane files.
- The Prisma client in `node_modules` is shared with other copies: after switching branches run `./node_modules/.bin/prisma generate` if a column is reported missing.
- An author's own names delete at once (P-116 amended): a check that needs the second-person path marks its names as another person's (`update program_def set created_by='user-C'`).

current_screen: W1-shared-library (S6 Shared library)
stage: BUILD (2a) done at 38cc245d; full local run-suites running, then CHECK for the Lead
owner: Builder
next_action: Builder: read the run-suites result, fix any failure, hand (2a) to the Lead; then (2b) and S6 slice 1 after forms PR #90
then: S6 slices 1 → 1-S → 2 → 3 → 4 (plan.md §4)
blocked_by: forms runner package and contract v2 on main (Lead merge)
updated: 2026-10-29

## Log (last 10 lines)
- 2026-10-29 · W1-shared-library (S6) · BUILD (2a) · 38cc245d: POST /library/fields, /sections, /answer-lists → 410; GET /library/:kind/:key/sources and row sources and where used; field and section rename (C3.15); origin line per page; check_s6_library_sources 24/24, pages browser 33/33; seed_library.cjs for checks that used the adds (forms, runtime files listed). US$0.
- 2026-10-29 · Handover · applied Lead message (P-173 queue): item (2) sized (heavy, half waits on #90), Handover rewritten for a fresh session; context of this one spent. US$0.
- 2026-10-29 · PR #91 review + P-165 · FIX · applied Lead message: 89822be7 Restore keeps the Pathway type (t=CORPORATE), a retired row announces Retired (qa_1029 49/49); main a7f96890 synced, STAND-INS gained SI-11, 14–16: 1b810203 SI-11 chip on Releases, SI-14–16 listed for the runtime lane; check_stand_ins 9/9; browser and full suites blocked by load (demo load > 30 s). US$0.
- 2026-10-29 · qa batch + P-165 · CHECK · run on 4c4b9dd5 found BR-13's Status menu changed by Retired (screen01_browser, programs_s2): 044a7092 offers Retired only while one is retired; full run-suites on 044a7092 69 PASS 0 FAIL 1 skipped (demo reset). US$0.
- 2026-10-29 · qa batch + P-165 · FIX/BUILD · main d50d87f9 synced; 7a60c011 QA-39, 48, 70–74, 79, 80 in plain words (check_screens_qa_1029_browser 43/43 at 1440 and 1024; QA-81 screens part 4/4 on main); 4c4b9dd5 StandIn chip + check_stand_ins 9/9 (no page uses it yet). Run on 9428a3fd: 63 PASS 4 FAIL, solo rerun 2 of 4 pass; count sent to the Lead. US$0.
- 2026-10-29 · W1-shared-library (S6) · FIX · applied Lead message (outside review on PR #87): 9428a3fd (a) recording pass sends only missing rounds (draftEdition "fill"), worst case reserved before sending; (b) an answer naming another edition is never used (replay skips, live refused in plain words); check_s6_field_drafts 26/26; pushed, Lead told; run-suites running. US$0.
- 2026-10-29 · W1-shared-library (S6) · slice R Lead check PASS at 164ef658 (Lead PR #87). Idle until the forms merge. US$0.
- 2026-10-29 · W1-shared-library (S6) · BUILD slice R (US$0) → CHECK · full run-suites 67 PASS 0 FAIL (started 038add4f, ended d9c8be97: code = 21556f3a; Prisma client regenerated after the main sync, first run failed on a stale client); check_s6_field_drafts 19/19, check_p154_words 4/4; graph G3 2 (older). No live call. US$0.
- 2026-10-29 · W1-shared-library (S6) · PLAN · applied Lead message: P-158 delta agreed (items 1–10, notes a person roles from guides, b answer lists only from a source, c conditions cite a source + sme); written to plan-p158.md (moved out of plan-p149.md, line limit). US$0.
- 2026-10-29 · W1-shared-library (S6) · BUILD slice R (US$0) · 21556f3a: field_map_edition step on the runner (edition key, box-count output limit, runner budget check), field-map-check.v1.md, stub, run-contract kind, tools/record-field-drafts.ts (Scaffolding; plan first, both caps, --max-usd), check_s6_field_drafts 19/19; schema v2 passes qa lint part A. P-158: manual-add inventory in plan-p149.md, 10-line delta sent; those parts on hold. No live call. US$0.
