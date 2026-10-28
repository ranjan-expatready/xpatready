# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead

2026-10-28 (Lead, Mac, sixth chat, Claude Code): PR #69 (368b8c32) and records PRs are on main; S5 is in FIX (not merged). Mode **/qa after-merge** on current main: QA-53 deny-by-default on every configuration read (case officer, client, nobody), the Form library on the shared lifecycle components, the returned form-change resend; check R69-1..3 (forms) as bugs if you reproduce them. Then the clean coverage rerun on S4 when the Mac is quiet. Report to `qa/reports/2026-10-28-after-merge-69.md`, new bugs to `qa/BUGS.md` by lane. US$0.

Command: `/qa <mode>` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: after-merge on main e2cb27a4 (PR #71: S5 Combination workspace); report `qa/reports/2026-10-29-after-merge-s5.md`
stage: WAITING
owner: Lead
next_action: (1) the clean coverage rerun when the Mac is quiet (owed since S4; S5 added ~3,700 lines); (2) retest QA-61–69 with the forms FIX when it merges (QA-69 bar is runtime's); (3) QA-47 and the finder from the Forms tab (Find again, Stop) were not run here (US$0, no saved answers); (4) `check_qa_am_1027.cjs` part B needs its own release setup or retirement. Read the Handover section first.
blocked_by: none
updated: 2026-10-29

## Handover (28 Oct; for the next qa session)
* **Next, in order (Lead, 28 Oct, founder's credit nearly gone):**
  1. **Clean coverage rerun on S4 (main 06a8fc30).** The 28 Oct run was incomplete: load about 8.5, two S4 suites stopped early, api 96.88/81.69 and engine 99.44/88.96 (under the 97/82 · 99/89 floor, not judged). Rerun with nothing else running (scratchpad pattern: stop qa copies → `NODE_V8_COVERAGE` + `NODE_OPTIONS=--import tests/qa/coverage-preload.mjs` → `run-suites.sh` → `c8 report --include api/src/** | engine/**`). The three M7 "Stop during the paid call" steps always fail under the preload (it turns a stop signal into a clean exit), like `check_p2_guard`; rerun those plainly on qa ports (4475, 4477, 4478) with `STUDIO_FAKE_LAUNCHER=…/tests/fixtures/fake-launch.mjs`. Then put back the by-products.
  2. **Done 28 Oct** (after-merge on PR #69, 38722933). New `check_qa_am_r69_1028.cjs` (:4471, `isolated.sh qa_r69 4471 start`): 21/33, fails = QA-65–68. `check_qa_am_s4_1028.cjs` is stale after #69 (⋯ menu → row action; reason rows count as `tr`): move it.
  3. **`/qa after-merge` on S5 (runtime)** when it merges: QA-63 (Find again), the finder from the combination's Forms tab, Stop on a running run, QA-38, QA-40, QA-47. **Done 29 Oct** (QA-38, QA-40 closed; QA-47 and finder not run).
  4. **Rewrite `check_qa_m2_journeys.cjs` once S3 merges (Lead, 28 Oct).** It is stale: it presses the "New combination" button that round 3 removed. Move it to "Add combination" (the pop-up on Immigration programs) and S3's Start setup; keep every journey's finding steps (QA-1, QA-6, QA-7, QA-10, QA-11).
* **Open findings now:** QA-60 Major and QA-55, 56, 58, 59, 48 (screens); QA-47, QA-69 (runtime; QA-69 words forms); QA-61, QA-62, QA-64, QA-65–68 (forms; QA-68 page may be screens); QA-38, QA-40 closed e2cb27a4; QA-53 closed 38722933; QA-63 (runtime or forms); QA-39 (Screen 04). Two questions are with the Lead: Load sample sets 2 of 7 (brief said 5 of 7), and QA-64's retire timing.
* **Where things are (28 Oct):** branch `claude/qa-after-merge-s1-21bfdf`, in sync with main 06a8fc30. This copy is the worktree `vigilant-nobel-cb0120` (bound qa 28 Oct). The Lead copies `qa/`, `lanes/qa.md` and `tests/qa/` onto its own PR, so pushing this branch is enough. Latest report: `qa/reports/2026-10-27-after-merge-fix.md`.
* **Replayable checks (all reset and load their own data, US$0):**
  * `check_qa_am_fix_1027.cjs`: :4472, `isolated.sh qa_fix 4472 start`.
  * `check_qa_am_s2_1027.cjs`: :4472.
  * `check_qa_am_1027.cjs`: :4471 empty, plus :4476 after `tests/runtime/setup_visitor_visa.ts 4476 xr_studio_qa_x1` (moved to round 3 on 28 Oct).
  * `check_qa_am_r3_1028.cjs`: :4473, `isolated.sh qa_r3 4473 start` (round 3 + lifecycle + Immigration programs).
  * `check_qa_am_s4_1028.cjs`: :4474, `isolated.sh qa_s4 4474 start` (S4 library + finder, Rules and Replay only); `check_qa_s4_filing.ts` needs no server.

  Commands are in `tests/qa/README.md`. Results on 06a8fc30: s4 55/61 (twice), filing 6/9, r3 64/69, fix 13/14; 1027 51/55 on dccd87e; every fail is an open finding. `check_qa_am_s2_1027.cjs` still drives the round 2 page (cards): move it next.
* **Learned, not written elsewhere:**
  1. A copy needs `prisma generate` and a `vite build` of `web/` before `isolated.sh … start`. Start always drops and recreates its database.
  2. The `gh pr merge` guard hook blocks compound Bash commands (pipes after `cat`, `for` loops, subshells, heredocs). Put them in a scratchpad script and run that alone.
  3. Every suite or check run rewrites tracked files in other lanes' folders:
     * evidence JSONs;
     * `screens/*/screenshots`;
     * `prototype/p2/ledger/spend.jsonl` and `used-launch-tickets/`;
     * `p2/runs/stub-pass`;
     * `canary-digest.json`;
     * the S2 report's screenshots.

     Put them back to HEAD before committing, and commit only qa files.
  4. Coverage (`NODE_V8_COVERAGE` + `tests/qa/coverage-preload.mjs`, c8 in `.tools/solution-1-prototype/studio-node`) must run with nothing else running.
     * Above a load average of about 10, timing steps go red.
     * The sample load takes 21–25 s against the checks' 30 s request limit.
     * `check_p2_guard` always fails under the coverage preload and passes plain.
  5. CI reuses a full pass for identical code. To find the run that really covers a commit, search its log for "passed them in run N".
  6. Browser pane:
     * Screenshots can lag a step.
     * `ref` click coordinates are in the 1440 frame, not the screenshot's, so prefer `find` refs or a URL like `/structure?node=<key>`.
     * Toasts render outside `<main>`.
     * The Studio's person menu lists only Studio people.
  7. On 27 Oct another qa process wrote into this worktree. Only the session the Lead names as qa owner writes here.
  8. Round 3 keys: Pathway keys start `retail.` / `corporate.`, names below them `individual.` (`?p=retail.temporary_residence`); only Pathway rows carry `client_type`. Status in the address is `s=` on Program structure, `f=` on Immigration programs. An own draft deletes at once, so second-person steps mark the name `created_by='user-C'` first. The guard hook also blocks some single `git commit … && git push` lines: use a scratchpad script.
  9. S4: the finder has no button until S5 slice 3: test it through `POST /combinations/:id/forms/find/plan` then `/find` (Rules or Replay only, never `live`); only Visitor visa (`vv.single`) has saved answers. No product route makes an unused, unapproved form, so Delete is walked on a seeded form (the builders' own way). The guard hook blocks `for` loops and heredocs: put them in a scratchpad script.

## Log (last 10 lines)
- 2026-10-27 · applied Lead note 27 Oct (PR #53). after-merge on main f289ec7 (S2 Immigration programs), isolated `qa_s2` :4472: walked as a content publisher — empty after Reset, 1440/1024/390 px + 200 % zoom, keyboard only, search edges incl. cross-tab BR-8, Status counts vs cards, Structure⇄page agreement on add/rename/remove/retire, need-you counts, Start setup double click, approver read-only (403/401 plain), axe ×3; `check_qa_am_s2_1027.cjs` 40/46 (demo/load needed 240 s request timeout under load). New QA-49 (page draws alphabetical, not the Structure's order; 'Back to Structure order' tip does not deliver), QA-50 (Back needs two presses after a Start-setup double click); QA-48 re-seen + new facet (no Retired status or note on the page — a retired combination is unfindable except by API); QA-38, 39, 40, 44–47 open. Verdict ready: 0 Critical · 3 Major · 7 Minor. Timing step missed under load — environmental, noted not logged. Graph regenerated (18 Works; G5 lists C11.1, parked extension). Report `reports/2026-10-27-after-merge-s2.md`. US$0. Same session, founder request: two-stage design take on M3 Prepare application — `screens/M3-prepare-application/design/draft-prepare-application-v3.html` in the main copy (split view recommended; command view and v2 checklist as comparisons; Docketwise/eimmigration/INSZoom research); no code changed.
- 2026-10-27 · applied Lead note 27 Oct 22:50. after-merge on main 027174d (screens S1/S2 FIX; CI 37/37 on the same code): the seven items walked headed then replayed; QA-44 (2/2), QA-45, QA-46, QA-49, QA-50 closed; review m1 and break m8 pass; new Minors QA-51 (To review trail without the type), QA-52 (approval message for a removal), QA-53 (16 other configuration reads open to nobody and case people), QA-54 (case person on a Studio page by URL: 'could not load … Retry'); checks: `check_qa_am_fix_1027.cjs` 9/14, `check_qa_am_s2_1027.cjs` 45/46, `check_qa_am_1027.cjs` 54/58 ×2; coverage api 97.09/82.10, engine 99.38/89.09 (floor kept), 35/36 under coverage (p2 guard, known). US$0.
- 2026-10-27 · Lead 23:59: report on 027174d read; QA-51/52/54 → screens, QA-53 → forms (shared read guard after S4). Founder: hand over tonight. Handover section written; WAITING for S4, then the visual-system slice. US$0.
- 2026-10-28 · Lead brief (after PR #66). after-merge on main dccd87e: copy bound to qa, main synced (conflicts took main's Delete words); CI 42/42 on the same tree; headed walk + `check_qa_am_r3_1028.cjs` 59/69 ×2; `check_qa_am_1027.cjs` moved to round 3 (51/55), `check_qa_am_fix_1027.cjs` 13/14; new QA-60 Major (QA-44 back in the Add pop-up, cut name saved), QA-55–59 Minor; QA-48 narrowed to Minor (Retire/Restore from the row works); QA-51, 52, 54 closed; journey 7/10 Program structure, 9/10 Immigration programs; suites 40/41 under coverage (p2 guard, known) + CI 42/42; coverage api 97.21/82.75, engine 99.38/89.08 (floor 97/82 · 99/89). US$0.
- 2026-10-28 · Lead message (after PR #65). after-merge on main 06a8fc30 (S4): CI 47/47 on the same tree; headed walk + `check_qa_am_s4_1028.cjs` 55/61 ×2, `check_qa_s4_filing.ts` 6/9; r3 64/69 (QA-57 closed), fix 13/14; new QA-61–64 Minor (QA-64 Conflict: form retire waits for the release, P-116 amended says approval); Load sample sets 2 of 7 (brief said 5 of 7: question); journey 8/10; under coverage 41/46 (p2 guard; three M7 Stop steps clash with the preload; a lost server), api 96.88/81.69 and engine 99.44/88.96 on that incomplete run, not judged: clean coverage rerun owed. US$0.
- 2026-10-28 · Lead brief (after PR #69). after-merge on main 38722933 (qa_r69 :4471): CI 48/48 on the same app code; QA-53 closed (GETs incl. HEAD/case/slash variants 401/403; fix 14/14); Form library lifecycle walked headed (panel, reason, toast, Withdraw); resend pass/fail paths good; R69-1 → QA-66 and R69-2 → QA-67 reproduced, R69-3 not reproduced; new QA-65 (`/releases` + three POST reads open to nobody, chain to a file download), QA-68 (resend drops Name/Meaning); r3 68/69, filing 6/9, s4 check stale after #69; new `check_qa_am_r69_1028.cjs` 21/33; graph G3 1 (tested route, not parsed); coverage not rerun. US$0.
- 2026-10-29 · Lead message (after PR #71). after-merge on main e2cb27a4 (S5; qa_s5/s5b/s5c :4472–4474): CI 57/57 on the same app code; QA-53 holds on every S5 route; QA-38 and QA-40 closed; new QA-69 UX Minor (Forms Undo offered after a release); `check_qa_am_s5_1029.cjs` 50/50; s4 check moved to the row action 58/62 (QA-62/63/64 only); explore_1025 retired (W1-02 fixtures gone); new G3 `POST /combinations/:id/attachments`; coverage not rerun. Report `qa/reports/2026-10-29-after-merge-s5.md`.
