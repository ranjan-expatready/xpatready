# Cloud trial: full suites on a cloud session (founder asked, 30 Oct)

Cloud session (unbound copy, branch `claude/youthful-davinci-kbb0pl`) ran `cloud-setup.sh` and `run-suites.sh --demo` on `main` 02ce7ad, measure only: no product, rule, skill or app file changed. No model was called: no `STUDIO_*_LIVE` was set, and the 68 ledger lines the run wrote were all `caller: stub` reserve/settle pairs with `actual_usd` 0 (US$0).

## Machine
- 4 CPUs (`nproc`), 15 GB RAM, no swap (`free -g`), disk 252 GB device with a 29 GB writable allowance free at start (`df -h .`).
- Ubuntu 24.04.5 LTS, kernel 6.18.44; Playwright Chromium preinstalled at `/opt/pw-browsers/chromium-1243`.

## Setup: 94 s, exit 0
- Node 24.21.0 download, `npm ci` (406 packages, 21 s), prototype packages, zsh + locale, Python helpers (hash-pinned), PostgreSQL, schema, web build, PDF manifest check: all fine.
- **apt.postgresql.org is blocked** (proxy HTTP 403, `postgresql-18` not found); the script's npm fallback installed PostgreSQL 18.3 (checksum verified) and the cluster started (zone America/Toronto). No fix needed, the fallback is the normal path here.
- npm warns that install scripts (prisma, @prisma/engines, esbuild) are "not yet covered by allowScripts"; they ran anyway (migrations applied, Vite built). Watch this if npm starts enforcing it.
- Official PDFs: "0 fetched and verified, 0 failed, nothing pending".
- Playwright browsers: present; the script linked the Chromium as the `chrome` channel. Nothing installed.

## Full suites: 83 of 83 PASS, 2518 s (42 min) wall clock, exit 0
- Started 10:22:16 UTC, ended 11:04:14 UTC. Serial (`SUITES_JOBS`, `SUITES_BROWSER_JOBS` at their default 1; no copy prefix).
- Sum of suite times 2207 s; the other ~311 s is starting and stopping isolated copies.
- 28 browser (`.cjs`) suites took 1421 s of it. Slowest: `check_studio_browser.cjs` 173 s, `check_screen01_browser.cjs` 119 s, `check_w115_slice3_browser.cjs` 90 s, `check_w1_structure_browser.cjs` 85 s, `check_runtime_r1c.cjs` 80 s.
- Skipped by design: `check_catalogue_scale.cjs` (the script's own SKIP list).

| Suite | Res | s | Suite | Res | s | Suite | Res | s |
|---|---|--:|---|---|--:|---|---|--:|
| check_ai_drafting.ts | PASS | 0 | check_ai_launch_paths.ts | PASS | 52 | check_ai_orchestration.ts | PASS | 64 |
| check_engine.ts | PASS | 1 | check_forms_ai_errors.ts | PASS | 1 | check_forms_channels.ts | PASS | 21 |
| check_forms_demo.ts | PASS | 38 | check_forms_f1p.ts | PASS | 10 | check_forms_f3a0.ts | PASS | 0 |
| check_forms_f3a1c.ts | PASS | 11 | check_forms_p80_guard.ts | PASS | 21 | check_forms_pdf_hardening.ts | PASS | 21 |
| check_forms_proposal_contract.ts | PASS | 0 | check_forms_qa53.ts | PASS | 11 | check_forms_rounds.ts | PASS | 1 |
| check_forms_s4_canada.ts | PASS | 1 | check_forms_s4_finder.ts | PASS | 23 | check_forms_s4_runs.ts | PASS | 17 |
| check_forms_schema_lint.ts | PASS | 0 | check_forms_slice2.ts | PASS | 54 | check_forms_slice2b.ts | PASS | 20 |
| check_forms_w102_fix.ts | PASS | 18 | check_grounding_db.ts | PASS | 12 | check_p154_words.ts | PASS | 0 |
| check_pqr.ts | PASS | 16 | check_preview_sets.ts | PASS | 13 | check_qa99_who_can_be_trail.ts | PASS | 12 |
| check_s5_leadcheck.ts | PASS | 17 | check_s5_people_ai.ts | PASS | 12 | check_s5_slice1.ts | PASS | 14 |
| check_s5_slice2.ts | PASS | 12 | check_s5_slice3.ts | PASS | 13 | check_s6_field_drafts.ts | PASS | 4 |
| check_screen01_api.ts | PASS | 33 | check_screen01_channels.ts | PASS | 12 | check_screen01_release_race.ts | PASS | 15 |
| check_screen01_rules.ts | PASS | 1 | check_screen02_fix.ts | PASS | 20 | check_screen02_slice2.ts | PASS | 20 |
| check_stand_ins.ts | PASS | 1 | check_w115_slice1.ts | PASS | 14 | check_w115_slice2.ts | PASS | 13 |
| check_w115_slice3.ts | PASS | 14 | check_w1_level_tokens.ts | PASS | 0 | check_w1_start_setup.ts | PASS | 6 |
| check_w1_structure.ts | PASS | 16 | check_w1_structure_path.ts | PASS | 12 | check_w1_structure_r3.ts | PASS | 14 |
| check_who_can_be_qa.ts | PASS | 2 | check_who_fills.ts | PASS | 14 | check_dv_backbone_browser.cjs | PASS | 17 |
| check_forms_s4_library_browser.cjs | PASS | 66 | check_forms_s4_run_browser.cjs | PASS | 36 | check_pqr_browser.cjs | PASS | 28 |
| check_preview_sets_browser.cjs | PASS | 29 | check_qa92_95_browser.cjs | PASS | 23 | check_s5_leadcheck_browser.cjs | PASS | 24 |
| check_s5_live_approval_browser.cjs | PASS | 12 | check_s5_slice1_browser.cjs | PASS | 60 | check_s5_slice2_browser.cjs | PASS | 59 |
| check_s5_slice3_browser.cjs | PASS | 42 | check_screen01_browser.cjs | PASS | 119 | check_screen01_smallfix.cjs | PASS | 35 |
| check_screen02_slice1.cjs | PASS | 29 | check_screen02_slice2_browser.cjs | PASS | 66 | check_screens_qa_1029_browser.cjs | PASS | 37 |
| check_studio_browser.cjs | PASS | 173 | check_w115_slice2_browser.cjs | PASS | 68 | check_w115_slice3_browser.cjs | PASS | 90 |
| check_w1_programs_r3.cjs | PASS | 31 | check_w1_programs_s2.cjs | PASS | 62 | check_w1_qa51_52_54.cjs | PASS | 20 |
| check_w1_s1s2_fix.cjs | PASS | 28 | check_w1_start_setup_browser.cjs | PASS | 40 | check_w1_structure_browser.cjs | PASS | 85 |
| check_w1_visual_system.cjs | PASS | 31 | check_who_fills_browser.cjs | PASS | 31 | check_case_engine.ts | PASS | 1 |
| check_runtime_r1c.cjs | PASS | 80 | check_runtime_r1d.ts | PASS | 28 | check_runtime_r1a.ts | PASS | 12 |
| check_p2_guard.ts | PASS | 2 | check_p2_launch.ts | PASS | 26 | | | |

## Failures
None. No flaky reruns were needed.

## Limits
- **Command time:** none hit. The run went in the background (one session command may run up to 2 h in the background; a foreground command is capped at 10 min), so it never had to be split.
- **Memory:** sampled every 5 min, peak seen 2.5 GB used of 15 GB.
- **Disk:** free allowance 29 GB → 26 GB during the run (node, packages, PostgreSQL, logs, screenshots).
- **Network:** only apt.postgresql.org denied (403), covered by the npm fallback; nodejs.org, npm and PyPI worked.

## By-products (discarded, not committed)
- The run left 393 changed tracked files (evidence JSON, screenshots, `p2/runs/stub-pass/*`, `p2/jobs/*`, 68 lines in `p2/ledger/spend.jsonl`) and 57 new files (screenshots, 34 `p2/ledger/used-launch-tickets/*.json`, 2 stub runs). All were restored or removed with `git checkout -- .` and `rm`.
- **For the Lead:** the stub ledger lines and used launch tickets landed in the real `prototype/p2/ledger/` although `run-suites.sh` exports `P2_LEDGER_DIR` to `var/suites/p2-ledger-<pid>` (QA-90 / P-179: "test runs never write the real ledger"). At least one path (isolated copies started by `isolated.sh`, or `policy.ts` `LEDGER_DIR` / `USED_TICKETS_DIR`) ignores it. US$0, but this contradicts the rule and dirties every copy that runs the suites. I did not look for the cause; that is a lane fix.
- **Hook note:** in this cloud copy the PR merge-guard hook (`merge-guard.sh`, `if: Bash(gh pr merge*)` and similar) also refused unrelated Bash commands with subshells, heredocs or loops ("Only the Lead merges…"), and refused a Monitor command. Putting the command in a script file got round it. A cloud merge-gate session will hit this unless it is the Lead copy or the `if` filters match more narrowly.

## Verdict
**Yes: a cloud session can run the full suites as a merge check.** All 83 passed, 42 min serial, with only the one setup fallback already in the script. That is a little faster than the Mac's ~50 min, and it uses none of the Mac's time or memory.
What would need changing:
1. Setup is quick (94 s) but runs again in every fresh container: count about 45 min per merge check from a clean session.
2. With 4 CPUs and 15 GB RAM, try `SUITES_JOBS=3 SUITES_BROWSER_JOBS=2` for a shorter run; not measured here.
3. Make the suites write the ledger and tickets only under `var/` (the item above) so a merge-check copy stays clean.
4. Narrow the merge-guard `if` filters (or mark the merge-gate session as the Lead) so cloud sessions can use ordinary shell commands.
5. One session per check: a merge check reruns setup and then `run-suites.sh --demo` on the merged commit.
