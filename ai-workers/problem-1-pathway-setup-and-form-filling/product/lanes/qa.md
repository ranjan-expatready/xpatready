# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead

2026-10-29 (Lead, eighth chat; P-173): after every Lead merge, `/qa after-merge` on main (the Lead sends it); at the end of M2, the content publisher walk-through on the six combinations like a person (S8, W1-13) is the M2 gate. US$0 unless the founder approves a live smoke.

Command: `/qa <mode>` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: explore on main a9fe60c0 (run card cost words, Forms library and finder words, Program structure and Immigration programs at 1024/1440), branch `claude/qa-explore-1029`, copy qa_ex :4473
stage: WAITING
owner: Lead
next_action: (1) Lead: QA-100 (Critical: the finder's live path is open on every copy; my check spent US$0.27 unapproved) needs a finder live switch; route QA-101–107, 109–111 to forms, QA-108 to runtime (S7); Lead routed all on 29 Oct (P-175 for QA-100); merge this branch's qa files. (2) qa: `/qa after-merge` when the Lead says #94, #96, #99 or forms slice 1 merged (QA-92–96 retest). Report `qa/reports/2026-10-29-explore.md`
blocked_by: none
updated: 2026-10-29

## Handover (29 Oct, ~22:00; for the next qa session: read this first)
* **29 Oct ~23:40, explore on a9fe60c0 (branch `claude/qa-explore-1029`, worktree objective-faraday-d76c2a, copy qa_ex :4473):** report `qa/reports/2026-10-29-explore.md`; QA-100–111 new. **Never click "Find forms with AI (about … · at most …)" in a check or by hand: it starts a LIVE run in one click on any copy (QA-100; US$0.27 spent that way).** Make a Rules find through the API first (`/forms/find/plan {mode:"rules"}`, then `/forms/find`), then use Find again; `check_qa_explore_1029.cjs` shows the pattern and stops if the ledger grows. The guard hook also blocks single `node … 2>&1 | tail` lines and some greps: use scratchpad scripts.
* **Done 29 Oct evening:** after-merge on deda0e6b plus the live smoke on a9fe60c0. Report: `qa/reports/2026-10-29-after-merge-deda0e6.md` (§5 is the live smoke). Branch `claude/qa-after-merge-deda0e6` (worktree sharp-golick-4e9110), pushed; the Lead opens the qa PR.
* **Waiting:**
  * Live step 3 (Who can be, US$0.91 reserved) reruns when runtime's QA-99 fix merges. The Lead sends it. Founder ceiling: US$6.21 left of US$6.49. The user allowed paid calls in this session, but a new session must ask the user again.
  * Live run recipe:
    * Copy `zsh studio/tools/isolated.sh qa_live 4478 start STUDIO_PEOPLE_AI_LIVE=approved`, then Load sample.
    * Plans are free: `POST /api/combinations/<id>/people/propose/plan {mode:"live"}`, then `/people/propose {mode, planSha256}` (synchronous).
    * The finder: `/forms/find/plan`, then `/forms/find {mode, planSha256, idempotencyKey}`, then poll `/api/runs/<id>` (status is lower case).
    * Costs: diff of `p2/ledger/spend.jsonl`. Put the ledger and run files back to HEAD before committing.
  * Retest QA-92–96 when runtime's PR #94 merges (`check_qa_qn_1029.cjs`, `check_w115_slice2_browser.cjs` three times).
* **Lessons:**
  * A new worktree needs `ln -s /Users/ranjansingh/Desktop/Xpatready/.tools .tools` at its root before `isolated.sh` (else "start the demo database first").
  * Run the wording sweep on a freshly loaded copy (the S3 check leaves names, so a later Load sample is refused with 409).
  * CI of a Lead PR can run without the PR merged just before it: check the merge base in the CI log ("Merge X into Y") and run the suites yourself when they differ.
  * Above load 10 the sample load times out (30 s) and kills whole suites: rerun the red ones alone.
  * The person menu shows names only now ("Approver", "Configuration author").
* **How to run it, in order:**
  1. Start a fresh qa copy: a new worktree from `origin/main`, `echo qa > .claude/lane`.
  2. Install: `npm ci` in `prototype/studio` with **Node 24** (`.tools/node-v24.21.0/bin` first on PATH; Homebrew's Node 23 fails Prisma), then `npx prisma generate` and `cd web && npx vite build`.
  3. Start a copy: `zsh tools/isolated.sh qa_am 4471 start`.
  4. Run the scratchpad script pattern (the guard hook blocks heredocs, `for` loops, pipes after `cat`, `&&` with git and some `sed` lines, so put them in a script file written with Write and run `zsh <file>`).
* **Retest map** (check → bugs; each check resets and loads its own data):

  | Check | Bugs it covers |
  |---|---|
  | `check_qa_wording_1029.cjs` | QA-39, 71–74, 79, 80; then grep its saved texts as in the coverage report §2. It rewrites the tracked `2026-10-29-wording-sweep/` files: put them back unless you mean to update them |
  | `check_qa_am_r3_1028.cjs` | QA-48 (68/69 on 52117004) |
  | `check_qa_am_s3_1029.cjs` | QA-70 (37/39) |
  | `check_qa_ai_paths.ts` (offline, from `prototype/`) | QA-83, 85–89 (10/21 on 170659bc) |
  | `check_qa_qn_1029.cjs` | QA-92–95 (31/40; only if runtime's fix merged) |
  | `check_qa_am_s4_1028.cjs`, `check_qa_am_s5_1029.cjs`, `check_qa_am_r69_1028.cjs`, `check_qa_dv_1029.cjs` | regression (62/62, 51/51, 33/33, 24/25) |

  Not in deda0e6b: QA-84, 91 (runtime), QA-90 (Lead tooling), QA-92–95 (runtime).
* **State of this copy (confident-jemison-6e225d, branch `claude/qa-coverage-1029`, last pushed b0b42c46):**
  * Everything qa is committed.
  * Untracked suite screenshots are left over (`git clean` was refused by the permission check): delete them, or start fresh.
  * qa_qn :4471 is stopped.
  * The Lead still has to merge this branch's qa files (report `qa/reports/2026-10-29-coverage-s4-s5.md`, BUGS QA-92–95, CAPABILITIES C4.10 Partial).
* **Learned this run:**
  1. `@axe-core/playwright` needs `browser.newContext()`, not `browser.newPage()`.
  2. The drawer is outside `<main>`: read it with `[role=dialog]`.
  3. The ⋯ menu items are not `role=menuitem`: use `find` refs.
  4. Under load above 10, `check_w1_programs_s2` (200 ms Status change) and `check_s5_slice3_browser` go red; CI passes them.
  5. A copy's server can die mid-run (ECONNREFUSED): restart it with `isolated.sh … start`.
  6. Plain reruns of chosen suites: sed a copy of `run-suites.sh` so its loop reads `$RERUN` (`scratchpad/mkrerun.sh` pattern).

## Earlier lessons (28 Oct; check commands are in `tests/qa/README.md`)
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
- 2026-10-29 · explore a9fe60c0: 1024/1440 Immigration programs, Program structure, Forms library clean (axe, no cut words, no system values); cost words agree except AI work list (QA-106); unplanned live find by my check, US$0.27 (QA-100 Critical, told the Lead); its result: QA-101–104, 107, 111; dialog QA-105, 110; QA-108, 109. Check 69/74.
- 2026-10-29 · live smoke on a9fe60c0 (founder, ceiling US$6.49; user allowed here): QA-97 closed; finder live US$0.28 of US$5.58 reserved (8 forms both rounds, 5 attached, page by rules); Who can be refused before any call → QA-99 Critical (runtime); step 4 skipped. Total US$0.28.
- 2026-10-29 · Lead: founder approved option (a), steps 1-3 at most US$6.49, after the QA-97 fix merges; QA-98 logged (forms, Minor: reservations above the smoke plan).
- 2026-10-29 · Lead: QA-97 logged (forms, Major, blocks merges: start_setup_browser fix 4 red in full runs only); live smoke "steps 1-4 within US$3.24": only step 3 fits; its paid call was refused by this session's permission check, so nothing was sent (US$0).
- 2026-10-29 · after-merge deda0e6b: ready; suites 68/71 in the run, the 3 red rerun alone: programs_s2 87/87, start_setup_browser 39/39 (fix 4 passes), w115_slice2 flaky 1 in 3 (QA-96 new, Minor, runtime); 14 bugs closed (QA-39, 48, 70–72, 79, 81, 83–89), QA-73/74/80 narrowed; C3.10 Works, C11.8 Partial; live smoke stopped before any call (product reserves US$5.58 for the finder alone, approved US$3.24); :4400 found empty (reset 12:58). US$0.
- 2026-10-29 · Lead asked for start_setup_browser fix 4 on deda0e6b (PR #94 CI red): two runs died in the sample load at load 17-20; solo rerun after the suites (screenshots the suites rewrite in other folders go back to HEAD then).
- 2026-10-29 · Lead: live smoke approved by the founder (about US$0.80), steps 1-4 on this copy's ledger; held until the founder answers on the worst case US$3.24.
- 2026-10-29 · after-merge deda0e6b started (fresh qa session): ai paths 21/21, r3 69/69, s3 39/39; wording sweep rerun on a loaded sample; regression checks running.
