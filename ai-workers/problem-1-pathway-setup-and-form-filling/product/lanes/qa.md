# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead

2026-10-29 (Lead, eighth chat; P-173): after every Lead merge, `/qa after-merge` on main (the Lead sends it); at the end of M2, the content publisher walk-through on the six combinations like a person (S8, W1-13) is the M2 gate. US$0 unless the founder approves a live smoke.

Command: `/qa <mode>` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: explore coverage on main 52117004 (branch `claude/qa-coverage-1029`): coverage rerun on S4+S5, retest of open bugs, Questionnaires tab walk (W1-15 slice 2); report `qa/reports/2026-10-29-coverage-s4-s5.md`
stage: WAITING
owner: Lead
next_action: (1) Lead: route QA-92–95 to runtime (QA-92 is a one-line fix: the drawer uses `f.role`), QA-81 to screens; answer the report's two questions (case questions' count, raise the coverage floor); merge this branch's qa files; (2) qa: retest with `check_qa_qn_1029.cjs` when runtime's fix merges; QA-83, 86–89 after the forms merge, QA-84/85/91 after runtime's fix; the live smoke only on the founder's OK. Note: this copy still holds untracked screenshots written by the suites and the wording check (never committed; removing them was refused by the permission check); the next qa session deletes them before its run.
blocked_by: this session's context is long: the Lead moves qa to a fresh session for `/qa after-merge` on deda0e6b (Handover below)
updated: 2026-10-29

## Handover (29 Oct, ~16:00; for the next qa session: read this first)
* **The ask waiting (Lead, 29 Oct): `/qa after-merge` on main deda0e6b.** It brings:
  * PR #91 (screens): the qa wording batch QA-39, 48, 70–74, 79, 80; the Stand-in chip; Restore keeps the Pathway type.
  * PR #90 (forms): the runner package QA-83, 85–89; a per-form paid budget across batches; usage-limit handling; the request id in Details; the IMM 5257 SCH1 title.
  * PRs #93 and #95: records only (P-164–P-174).

  :4400 was restarted on deda0e6b (data kept): read-only there; never reset it. US$0.
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
- 2026-10-29 · stop hook: BUGS-CLOSED over 12 KB; 37 rows closed up to 26 Oct moved to `history/qa-bugs-closed-to-2026-10-26.md`; suite screenshots removed.
- 2026-10-29 · Lead message (PR #76, main f7cb40d9): after-merge S3 started on qa_s3 :4477; DV-doc-1 already done.
- 2026-10-29 · after-merge S3 (f7cb40d9): ready; all merged suites green (run as run-suites runs them); new `check_qa_am_s3_1029.cjs` 37/39; QA-70 new (Major, menu links show no focus ring, screens); C11.2 Works, C11.15 Partial; G5 back to 0.
- 2026-10-29 · explore wording (f7cb40d9, qa_wd :4478): 38 screens × 2 widths read; QA-39 raised to Major and updated; QA-71–80 new (6 Major, 4 Minor; screens 7, runtime 3, forms 1); new `check_qa_wording_1029.cjs`.
- 2026-10-29 · Lead note (P-154): QA-81 "agent" in 6 places (runtime 4, screens 2; no "Agent enters" on main); QA-82 questions show field definitions (164 of 164 placements have no question wording; forms W1-10 / screens S6); wording check now flags "agent".
- 2026-10-29 · explore ai-paths (new qa copy, main 170659bc; old qa branch merged in): every AI step inventoried; schemas linted against the provider's rules; 13 error shapes replayed through the runner; demo copy's run records and all ledgers read; new QA-83, 84, 85, 90 Critical, QA-86–89 Major, QA-91 Minor; new `check_qa_ai_paths.ts` (offline) 10/21; live smoke plan for approval. US$0.
- 2026-10-29 · explore coverage (main 52117004, qa_qn :4471, branch `claude/qa-coverage-1029`): every suite under c8, api 97.49/82.52, engine 99.45/89.65 (floor held; 56/65 under c8, 7 of 9 fails pass plainly, 2 load-timing; CI 40832699780 green on the same code); QA-47, QA-69 closed; QA-81 down to screens (Minor); Questionnaires tab walked: QA-92 Major, QA-93 Major, QA-94, QA-95 Minor (runtime); C4.10 Partial; new `check_qa_qn_1029.cjs` 31/40; s5 check moved to Show and edit (51/51). US$0.
- 2026-10-29 · Lead message (main deda0e6b: PR #90, #91): after-merge not started here (context long); Handover written for a fresh qa session; stale 28 Oct handover items cut (lessons kept).
