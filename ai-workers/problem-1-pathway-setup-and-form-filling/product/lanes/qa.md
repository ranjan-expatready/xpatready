# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead

2026-10-28 (Lead, Mac): **WAITING** for the next merge (S4 Form library first, then the visual-system round 3). Note: the screens lane updates only the "Remove" → "Delete" wording in `check_qa_am_fix_1027` and `check_qa_am_1027` (P-128, Lead OK); re-read them at your next after-merge. CI now runs only on pull requests (P-85 amended): read the Lead PR's run, or run the suites yourself. Own ports, AI US$0, report summary to the Lead by message.

Command: `/qa <mode>` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: after-merge on main 06a8fc30 (PR #65: S4 Form library and form finder); report `qa/reports/2026-10-28-after-merge-s4.md`
stage: WAITING
owner: Lead
next_action: Lead reads the S4 report (QA-61–64 Minor → forms; QA-63 → runtime S5 slice 3 or forms; two questions: Load sample 2 of 7 vs the brief's 5 of 7, QA-64 retire timing). qa owes a clean coverage rerun when the Mac is quiet (this run stopped two S4 suites early). Then WAITING for the next merge (runtime S5 slice 3, or the screens FIX for QA-60).
blocked_by: none
updated: 2026-10-28

## Handover (27 Oct, end of day; for the next qa session)
* **Where things are (28 Oct):** branch `claude/qa-after-merge-s1-21bfdf`, in sync with main 06a8fc30. This copy is the worktree `vigilant-nobel-cb0120` (bound qa 28 Oct). The Lead copies `qa/`, `lanes/qa.md` and `tests/qa/` onto its own PR, so pushing this branch is enough. Latest report: `qa/reports/2026-10-27-after-merge-fix.md`.
* **Open findings and their lanes:**
  * QA-38 Major: runtime.
  * QA-48 Major: screens, its own slice after S3; the fix should also show retired combinations on Immigration programs.
  * QA-39: Screen 04.
  * QA-40 and QA-47: runtime, S5 slice 1.
  * QA-51, QA-52 and QA-54: screens.
  * QA-53: forms, one shared guard after S4 merges (Lead 23:59). Retest it with the QA-53 step of `check_qa_am_fix_1027.cjs`.
* **Next runs:**
  * **S4:** after-merge on the Form library. It was out of scope until now, so there is no qa check for it yet. Build one from the S4 concept, and include the QA-53 guard if it lands with S4.
  * **Visual-system slice:** after-merge on it. Rerun the three checks below to catch regressions.
  * **P-127:** Program structure is being redrawn, so selectors in `check_qa_am_1027.cjs` (Structure part) may need updating. Only the selectors; never weaken a finding's step.
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
  9. S4: the finder has no button until S5 slice 3: test it through `POST /combinations/:id/forms/find/plan` then `/find` (Rules or Replay only, never `live`); only Visitor visa (`vv.single`) has saved answers. No product route makes an unused, unapproved form, so Delete is walked on a seeded form (the builders' own way). The guard hook blocks `for` loops and heredocs: put them in a scratchpad script.
  8. Round 3 keys: Pathway keys start `retail.` / `corporate.`, names below them `individual.` (`?p=retail.temporary_residence`); only Pathway rows carry `client_type`. Status in the address is `s=` on Program structure, `f=` on Immigration programs. An own draft deletes at once, so second-person steps mark the name `created_by='user-C'` first. The guard hook also blocks some single `git commit … && git push` lines: use a scratchpad script.

## Log (last 10 lines)
- 2026-10-24 · applied Lead note 2026-10-24 21:10. after-merge on main 12e7207 (one run): suites 19/20 + p2 guard 75/75 plain; closed QA-4, 15, 20, 22–25, 27–34; QA-26 2 of 3; R1c walk 24/27 (officer and client, 1440 and 390 px); new QA-35 Major (blank case area from the Demo menu), QA-36, QA-37 Minor; coverage api 95.95/80.95, engine 99.39/87.53, floor 95/80 · 99/87. US$0.
- 2026-10-25 · applied Lead note 2026-10-25 02:00. after-merge on main 8aef175 (one run): suites 20/21 + p2 guard 75/75 plain; closed QA-26, 35, 36 (Lead's save-and-flag), 37; R1d walk 35/35 (forms panel, P-71, stale after filing, none apply, online not offered; 1440/390 px); R1c walk 27/27; journeys 47/47; coverage api 96.25/81.55, engine 99.42/88.24, floor 96/81 · 99/88; open: QA-19 only. US$0.
- 2026-10-25 · applied Lead note 25 Oct (P-89). QA-19 → BUGS-CLOSED. explore on main 8360565: suites 21/21 (with --demo); officer Confirm section and None apply by click (stale refusal 409), client keyboard only 15/15 parts at 390 px, 200% zoom on 12 pages, a real Online release (release 2); new QA-38 Major (Open a case names release 1), QA-39–43 Minor; graph G3 22→2, G4 7→0; coverage not rerun (no app code change). PostgreSQL 18.3 from npm (apt host denied). US$0.
- 2026-10-27 · applied Lead note 27 Oct (PR #51). after-merge on main 76628a4 (W1-02 + S1 Structure; app code = d393155): CI suites 35/35 on the same code; Mac plain reruns green; W1-02 clean (routes 404, pages 'Page not found', no extension words, later-wave note, PDF path end to end, fill 44/44); Structure walked by typing, journey 7/10; new QA-44–48 (Majors QA-45, QA-48, screens); closed QA-41, 42, 43; QA-38, 39, 40 open; coverage api 96.78/81.84, engine 99.38/89.05, floor 96/81 · 99/89; check `check_qa_am_1027.cjs` 50/57 then 51/57. US$0.
- 2026-10-27 · applied Lead note 27 Oct (PR #53). after-merge on main f289ec7 (S2 Immigration programs), isolated `qa_s2` :4472: walked as a content publisher — empty after Reset, 1440/1024/390 px + 200 % zoom, keyboard only, search edges incl. cross-tab BR-8, Status counts vs cards, Structure⇄page agreement on add/rename/remove/retire, need-you counts, Start setup double click, approver read-only (403/401 plain), axe ×3; `check_qa_am_s2_1027.cjs` 40/46 (demo/load needed 240 s request timeout under load). New QA-49 (page draws alphabetical, not the Structure's order; 'Back to Structure order' tip does not deliver), QA-50 (Back needs two presses after a Start-setup double click); QA-48 re-seen + new facet (no Retired status or note on the page — a retired combination is unfindable except by API); QA-38, 39, 40, 44–47 open. Verdict ready: 0 Critical · 3 Major · 7 Minor. Timing step missed under load — environmental, noted not logged. Graph regenerated (18 Works; G5 lists C11.1, parked extension). Report `reports/2026-10-27-after-merge-s2.md`. US$0. Same session, founder request: two-stage design take on M3 Prepare application — `screens/M3-prepare-application/design/draft-prepare-application-v3.html` in the main copy (split view recommended; command view and v2 checklist as comparisons; Docketwise/eimmigration/INSZoom research); no code changed.
- 2026-10-27 · fix-up (Lead answer 17:55: this session owns qa; the other qa process must not write): another process had committed 5e8b23f/15ae106 here with suite by-products (p2 ledger lines, stub tickets, other lanes' evidence JSONs, 26 Oct screenshots); all put back to main's version. S2 report restored with the coverage run (30/35 green under coverage, plain reruns noted; api 97.10/82.17, engine 99.38/89.19; api floor → 97/82); CAPABILITIES C11.10 Works, C1.1, C11.3, C11.5, C11.9 updated; QA-49/QA-50 → screens FIX; G5 0 (C11.1 named in the W1-02 check labels). US$0.
- 2026-10-27 · applied Lead note 27 Oct 22:50. after-merge on main 027174d (screens S1/S2 FIX; CI 37/37 on the same code): the seven items walked headed then replayed; QA-44 (2/2), QA-45, QA-46, QA-49, QA-50 closed; review m1 and break m8 pass; new Minors QA-51 (To review trail without the type), QA-52 (approval message for a removal), QA-53 (16 other configuration reads open to nobody and case people), QA-54 (case person on a Studio page by URL: 'could not load … Retry'); checks: `check_qa_am_fix_1027.cjs` 9/14, `check_qa_am_s2_1027.cjs` 45/46, `check_qa_am_1027.cjs` 54/58 ×2; coverage api 97.09/82.10, engine 99.38/89.09 (floor kept), 35/36 under coverage (p2 guard, known). US$0.
- 2026-10-27 · Lead 23:59: report on 027174d read; QA-51/52/54 → screens, QA-53 → forms (shared read guard after S4). Founder: hand over tonight. Handover section written; WAITING for S4, then the visual-system slice. US$0.
- 2026-10-28 · Lead brief (after PR #66). after-merge on main dccd87e: copy bound to qa, main synced (conflicts took main's Delete words); CI 42/42 on the same tree; headed walk + `check_qa_am_r3_1028.cjs` 59/69 ×2; `check_qa_am_1027.cjs` moved to round 3 (51/55), `check_qa_am_fix_1027.cjs` 13/14; new QA-60 Major (QA-44 back in the Add pop-up, cut name saved), QA-55–59 Minor; QA-48 narrowed to Minor (Retire/Restore from the row works); QA-51, 52, 54 closed; journey 7/10 Program structure, 9/10 Immigration programs; suites 40/41 under coverage (p2 guard, known) + CI 42/42; coverage api 97.21/82.75, engine 99.38/89.08 (floor 97/82 · 99/89). US$0.
- 2026-10-28 · Lead message (after PR #65). after-merge on main 06a8fc30 (S4): CI 47/47 on the same tree; headed walk + `check_qa_am_s4_1028.cjs` 55/61 ×2, `check_qa_s4_filing.ts` 6/9; r3 64/69 (QA-57 closed), fix 13/14; new QA-61–64 Minor (QA-64 Conflict: form retire waits for the release, P-116 amended says approval); Load sample sets 2 of 7 (brief said 5 of 7: question); journey 8/10; under coverage 41/46 (p2 guard; three M7 Stop steps clash with the preload; a lost server), api 96.88/81.69 and engine 99.44/88.96 on that incomplete run, not judged: clean coverage rerun owed. US$0.
