# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead

2026-10-29 night (Lead, sixth chat; founder asleep): Mode: clean **coverage rerun on S4 and S5** (main 32961d69+), report `qa/reports/2026-10-29-coverage-s4-s5.md`, update CAPABILITIES statuses you tested (C11.2, C11.9, C11.11, C11.12, C1.8 …), new bugs by lane. Then after-merge on S3 when it merges. Isolated copies only. US$0. **29 Oct morning (Lead, seventh chat):** first, before the coverage rerun (it waits until screens and runtime finish their suites): outside review DV-doc-1 (`history/devin/2026-10-29-devin-static-docs.md`): retest and close the bugs fixed by merged PRs (QA-55/56/58/59/60 PR #67, QA-53 PR #69, QA-61–64 PR #73), bring QA-65–68 onto main, and re-status the capabilities that merged tests name but still say Not built (C5.3, C11.12, C11.15, C11.17, C2.3, C3.7, C1.8), each from a run, not from the file names.

Command: `/qa <mode>` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: after-merge S3 Start setup on main f7cb40d9; report `qa/reports/2026-10-29-after-merge-s3.md`
stage: WAITING
owner: Lead
next_action: (1) the coverage rerun on S4+S5 when the Mac is quiet (report `2026-10-29-coverage-s4-s5.md`); (2) QA-70, QA-69 and QA-48 when their fixes merge; (3) Lead answers: QA-70 focus ring, C1.8 copies per line, QA-69 rule. Read the Handover section first.
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

## Log (last 8 lines)
- 2026-10-28 · Lead brief (after PR #66). after-merge on main dccd87e: copy bound to qa, main synced (conflicts took main's Delete words); CI 42/42 on the same tree; headed walk + `check_qa_am_r3_1028.cjs` 59/69 ×2; `check_qa_am_1027.cjs` moved to round 3 (51/55), `check_qa_am_fix_1027.cjs` 13/14; new QA-60 Major (QA-44 back in the Add pop-up, cut name saved), QA-55–59 Minor; QA-48 narrowed to Minor (Retire/Restore from the row works); QA-51, 52, 54 closed; journey 7/10 Program structure, 9/10 Immigration programs; suites 40/41 under coverage (p2 guard, known) + CI 42/42; coverage api 97.21/82.75, engine 99.38/89.08 (floor 97/82 · 99/89). US$0.
- 2026-10-28 · Lead message (after PR #65). after-merge on main 06a8fc30 (S4): CI 47/47 on the same tree; headed walk + `check_qa_am_s4_1028.cjs` 55/61 ×2, `check_qa_s4_filing.ts` 6/9; r3 64/69 (QA-57 closed), fix 13/14; new QA-61–64 Minor (QA-64 Conflict: form retire waits for the release, P-116 amended says approval); Load sample sets 2 of 7 (brief said 5 of 7: question); journey 8/10; under coverage 41/46 (p2 guard; three M7 Stop steps clash with the preload; a lost server), api 96.88/81.69 and engine 99.44/88.96 on that incomplete run, not judged: clean coverage rerun owed. US$0.
- 2026-10-28 · Lead brief (after PR #69). after-merge on main 38722933 (qa_r69 :4471): CI 48/48 on the same app code; QA-53 closed (GETs incl. HEAD/case/slash variants 401/403; fix 14/14); Form library lifecycle walked headed (panel, reason, toast, Withdraw); resend pass/fail paths good; R69-1 → QA-66 and R69-2 → QA-67 reproduced, R69-3 not reproduced; new QA-65 (`/releases` + three POST reads open to nobody, chain to a file download), QA-68 (resend drops Name/Meaning); r3 68/69, filing 6/9, s4 check stale after #69; new `check_qa_am_r69_1028.cjs` 21/33; graph G3 1 (tested route, not parsed); coverage not rerun. US$0.
- 2026-10-29 · Lead message (after PR #71). after-merge on main e2cb27a4 (S5; qa_s5/s5b/s5c :4472–4474): CI 57/57 on the same app code; QA-53 holds on every S5 route; QA-38 and QA-40 closed; new QA-69 UX Minor (Forms Undo offered after a release); `check_qa_am_s5_1029.cjs` 50/50; s4 check moved to the row action 58/62 (QA-62/63/64 only); explore_1025 retired (W1-02 fixtures gone); new G3 `POST /combinations/:id/attachments`; coverage not rerun. Report `qa/reports/2026-10-29-after-merge-s5.md`.
- 2026-10-29 · Lead message (PR #75, main db5e0208): coverage paused; DV-doc-1: 13 bugs closed by replay, 4 open; C2.3, C5.3, C3.7, C11.17, C11.11 Works; C1.8, C11.15 Partial (no copies per line); `check_qa_dv_1029.cjs` 24/25.
- 2026-10-29 · stop hook: BUGS-CLOSED over 12 KB; 37 rows closed up to 26 Oct moved to `history/qa-bugs-closed-to-2026-10-26.md`; suite screenshots removed.
- 2026-10-29 · Lead message (PR #76, main f7cb40d9): after-merge S3 started on qa_s3 :4477; DV-doc-1 already done.
- 2026-10-29 · after-merge S3 (f7cb40d9): ready; all merged suites green (run as run-suites runs them); new `check_qa_am_s3_1029.cjs` 37/39; QA-70 new (Major, menu links show no focus ring, screens); C11.2 Works, C11.15 Partial; G5 back to 0.
