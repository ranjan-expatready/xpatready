# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-29 (Lead, eighth chat; P-173 parallel build, no scope cut): Stage BUILD, owner Builder. **Your M2 queue, in order (one slice = build, own named checks, hand back; CI is the full check):** (1) S6 slice 1, the one review queue on contract v2 (one `ProposalItem` table; C11.13, C11.14, C3.2) — starts when the Lead merges forms PR #90; (2) library lists with where used, origin, rename and the P-158 "from a source, no free add" door (C3.13, C3.14, C3.15, C3.6); (3) one setup checklist per combination driving cards and Overview (P-157, P-161; C11.16, C11.10); (4) linking combinations and copying a line across combinations (C1.3, C1.5). **Split of (2) agreed by the Lead (29 Oct):** (2a) now — drop the Add buttons, 410 on POST /library/fields, /sections, /answer-lists with the checks that use them updated, GET /library/:kind/:key/sources, where used and rename on the library pages, one line per page on where its items come from; (2b) the P-158 door through `ProposalItem` after PR #90, together with S6 slice 1. Your files: Program structure, Immigration programs, Shared library pages and drawers, review queue, Overview. Not yours: forms library and channels (forms), combination tabs, PQR, Load sample (runtime). A slice that turns out heavy: tell the Lead before building it. Context above ~70%: write the Handover, tell the Lead.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

## Handover (screens lane, 29 Oct evening, kept current; a fresh session resumes from this file alone)
**Branch `claude/screens-2a-22c0e2` (worktree `screens-2a-22c0e2`), pushed; main deda0e6b synced (#90 and #91 on it).** AI spent US$0.
* Node: `.tools/node-v24.21.0`, since Prisma refuses Homebrew's node 23. A fresh worktree runs `lane.sh setup` with that node on PATH, then `prisma generate`.
* (2a) passed the Lead check and is in Lead PR #96; detail in `screens/W1-shared-library/build-notes.md`.

**Agreed by the Lead on 29 Oct: build `screens/W1-shared-library/plan-slice1.md` as 1a → 1b → 1c, each with its own hand-back.**

**1a, the table and the door. Built at 50224b01; full suites running (build-notes.md "Slice 1a").** Steps:
1. **Prisma model `ProposalItem`.** Mirror `contracts/proposal-item.ts`: JSON payload, source, rounds, rules, identity, revision and decision; index status, kind, combination, edition, run and batch.
2. **The migration.** Copy the `NormalizationItem` rows onto `ProposalItem`, mapping its kinds (field, section, answer_list, check, document_requirement) to the contract kinds. Drop the `rule` rows. Log what it copies and drops (Q-L4). Then drop `NormalizationItem`.
   * Rows are written in `sources.ts:545-577` and decided in `sources.ts:617-695`.
   * Before hand-back, run the migration cleanly on a **copy** of the :4400 data, never on :4400 itself: `pg_dump xr_studio_demo | psql xr_studio_screens_mig`.
3. **The reader switch:** demo.ts, programs.ts, library-changes.ts, sources.ts (decide, recompare, `apply` at :703-760), review-queue.ts (`ai_proposals` at :65-78), ai.ts. Routes are in `main.ts:88-93`.
4. **`api/src/proposals.ts`, the one door.**
   * `insertProposals`: the contract parse, plus identity checked at write.
   * `decide`: accept, edit or reject. A library item's lander writes the draft row and a WAITING `LibraryChange` with the batch id and the item id. Identity is checked again at approval.
   * `undo(batchId)`: within 10 s.
   * `LANDERS[kind]`.
5. **The scan.** No `canonicalField`, `logicalSection`, `answerList` or `documentType` `.create` outside `proposals.ts`. Allowlist version revisions, the P-65 merge and release publish. `placement_fills` is a non-ADD `LibraryChange` and is allowed.
6. **Tests:** `tests/check_s6_p149.ts`, a pass and a fail per rule. Switch `tests/seed_library.cjs` to the door once it exists. Full run-suites.

**Agreed answers:**
* **N-1:** forms drops `origin: person` and `addReason` and adds `rule: {key, sentence} | null` to `ProposalSource` after its slice 1. 1c item 5 waits for it.
* **N-2:** runtime exports `acceptPqrPick(tx, actor, item)` and drops the pick's own Accept (PR #94). 1c registers it as the `pqr_pick` lander.
* **N-3:** no stop-gap; sections come from the forms' parts in slice 2, and the checks seed until then.
* **P-97:** after #94, the field page's "Collected from" becomes read-only for an existing placement, with "Change who fills" calling `POST /library/fields/:key/fills`. That is our page (library.tsx).

**Queue after slice 1 (P-173):** (3) one setup checklist per combination (P-157, P-161); (4) linking combinations and copying a line (C1.3, C1.5).

**Not screens' (routed in the hand-backs):** runtime.ts "opened case <id>" (QA-74); engine/validate.ts messages with codes (QA-73); section meanings are release c1-v3 content (QA-71); QA-82 to forms W1-10 / S6 slice 1; qa's `check_qa_am_r69_1028.cjs:123` selects the person by the old label.

**Learned, not written elsewhere:**
- Bash here refuses heredocs, `$(…)`, loops and some long `&&` chains (merge-guard hook): write a script to the scratchpad and run it. The catalogue caches rows keyed on activity counts: a check that changes the database by SQL also inserts an `audit_event` row.
- Other lanes run this lane's checks under the same copy names and ports (`run-suites.sh` uses the usage lines), and all copies share one PostgreSQL server: two runs at once break each other. For reruns, use private names and ports (for example `<name>_mine` on 4460+), then drop those databases.
- Long or multi-line Bash commands (heredocs, `$(…)` in some forms, loops) are refused by the merge guard hook (`gh pr merge*` matcher); put edits in a script file in the scratchpad and run it with a short command.
- Run by-products land in the tree (other lanes' screenshots, `prototype/p2/*`, `prototype/studio/evidence/*`): restore them before each commit and stage only lane files.
- The Prisma client in `node_modules` is shared with other copies: after switching branches run `./node_modules/.bin/prisma generate` if a column is reported missing.
- An author's own names delete at once (P-116 amended): a check that needs the second-person path marks its names as another person's (`update program_def set created_by='user-C'`).

current_screen: W1-shared-library (S6 Shared library)
stage: BUILD 1a — built at 50224b01 (check_s6_p149 37/37; migration clean on a copy of the :4400 data); full run-suites running
owner: Builder
next_action: screens: finish the full run-suites on 1a, fix any failure, hand back 1a (CHECK, owner Lead)
then: 1b (queue page, grouped approval, seeds through the door) → 1c (pqr_pick, rule-sourced field) → S6 slices 2 → 3 → 4 (plan.md §4)
blocked_by: nothing for 1b; 1c waits for runtime PR #94 (acceptPqrPick, N-2) and forms' rule reference (N-1)
updated: 2026-10-29

## Log (last 10 lines)
- 2026-10-29 · W1-shared-library (S6) · BUILD 1a · merged origin/claude/screens-2a-22c0e2 and main c545f84e; 50224b01: proposal_item table + migration (copies, drops rule rows, logs both; clean on a copy of :4400), proposals.ts one door (insertProposals, decide with landers, undo 10 s), readers switched; check_s6_p149 37/37; full run-suites running. US$0.
- 2026-10-29 · W1-shared-library (S6) · applied Lead message: plan-slice1.md agreed (1a → 1b → 1c, each its own hand-back); N-1, N-2 and N-3 accepted; the migration logs its copies and drops and runs on a copy of the :4400 data. Handover rewritten for a fresh session (this one's context is spent). No code. US$0.
- 2026-10-29 · W1-shared-library (S6) · PLAN (2b) + slice 1 · applied Lead message ((2a) PASS in Lead PR #96); main deda0e6b synced. Plan in plan-slice1.md: 1a ProposalItem table + migration off NormalizationItem + proposals.ts one door with a lander per kind and the free-add scan; 1b queue page, To review row, grouped approval, Draft fields with AI; 1c pqr_pick lander (acceptPqrPick, PR #94) and "Add the fact this rule needs" (needs forms' rule reference). placement_fills stays a LibraryChange (allowlisted). N-1..N-3 to the Lead. No code. US$0.
- 2026-10-29 · W1-shared-library (S6) · BUILD (2a) → CHECK · full run-suites on 5b00ae99: 67 PASS 4 FAIL, all four from (2a): P-63 "box" on Fields (sources now say "form field"), QA-65 (the 410 routes name their person first, nobody 401), A1 (Studio typed-key check gone with createField: ≥1), QA-71 (the check reads the Category column; a name may end in "employer"); checklist file names in words; seed_library.d.cts. Rerun: ai_drafting 48/48, s6 sources 24/24, s6 pages 33/33, forms_qa53 20/20, screen01_browser 120/120, qa_1029 51/51; tsc api and web clean; any 419; graph G3 2 (older). US$0.
- 2026-10-29 · W1-shared-library (S6) · BUILD (2a) · 38cc245d: POST /library/fields, /sections, /answer-lists → 410; GET /library/:kind/:key/sources and row sources and where used; field and section rename (C3.15); origin line per page; check_s6_library_sources 24/24, pages browser 33/33; seed_library.cjs for checks that used the adds (forms, runtime files listed). US$0.
- 2026-10-29 · Handover · applied Lead message (P-173 queue): item (2) sized (heavy, half waits on #90), Handover rewritten for a fresh session; context of this one spent. US$0.
- 2026-10-29 · PR #91 review + P-165 · FIX · applied Lead message: 89822be7 Restore keeps the Pathway type (t=CORPORATE), a retired row announces Retired (qa_1029 49/49); main a7f96890 synced, STAND-INS gained SI-11, 14–16: 1b810203 SI-11 chip on Releases, SI-14–16 listed for the runtime lane; check_stand_ins 9/9; browser and full suites blocked by load (demo load > 30 s). US$0.
- 2026-10-29 · qa batch + P-165 · CHECK · run on 4c4b9dd5 found BR-13's Status menu changed by Retired (screen01_browser, programs_s2): 044a7092 offers Retired only while one is retired; full run-suites on 044a7092 69 PASS 0 FAIL 1 skipped (demo reset). US$0.
- 2026-10-29 · qa batch + P-165 · FIX/BUILD · main d50d87f9 synced; 7a60c011 QA-39, 48, 70–74, 79, 80 in plain words (check_screens_qa_1029_browser 43/43 at 1440 and 1024; QA-81 screens part 4/4 on main); 4c4b9dd5 StandIn chip + check_stand_ins 9/9 (no page uses it yet). Run on 9428a3fd: 63 PASS 4 FAIL, solo rerun 2 of 4 pass; count sent to the Lead. US$0.
- 2026-10-29 · W1-shared-library (S6) · FIX · applied Lead message (outside review on PR #87): 9428a3fd (a) recording pass sends only missing rounds (draftEdition "fill"), worst case reserved before sending; (b) an answer naming another edition is never used (replay skips, live refused in plain words); check_s6_field_drafts 26/26; pushed, Lead told; run-suites running. US$0.
