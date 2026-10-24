# GitHub canonical migration — progress (P-82, 24 Oct)

Checklist so any agent can resume. Status: `[x]` done · `[ ]` pending · `[!]` blocked/needs founder.

## Phase 0 — freeze and back up
- [x] Required docs read (AGENTS, CLAUDE, settings, DECISIONS P-81/P-64/P-31, LANES, LEAD, ENVIRONMENT, lane tools)
- [x] One Claude Code session still running: ACP session in `.claude/worktrees/runtime-r1-8f1db8` (pids 67641 acp + 91959 claude) — worktree was clean; killed under /bypass; the `devin acp` bridge (pid 66794) left running
- [x] lane.sh status: all 7 lane worktrees clean; lead-check-{forms,runtime,screens} have only generated outputs (screenshots/evidence JSONs); worktrees removed for space
- [x] `git bundle create ~/Xpatready-backup-2026-10-24.bundle --all` + `git bundle verify` (451 MB, all refs incl. worktree HEADs + refs/archive/pre-rewrite/*)
- [x] pg_dump: all 112 `xr_studio_*` databases → `~/Xpatready-db-<name>-2026-10-24.dump` (35 MB total, custom format)
- [x] working-tree tar → `~/Xpatready-backup-2026-10-24.tar.gz` (6.4 GB; first attempt truncated: disk full at 5.6G; rebuilt slim: untracked/ignored/modified only, no `.git`/node_modules/pg18-data — bundle covers git; ~7 GB caches cleared for space)
- [x] checksums file `~/Xpatready-backup-2026-10-24.sha256` (114 lines: bundle + tar + 112 dumps)
- [x] final mirror = push ahead branches to origin (main, evidence-e1b, forms-f1-check, qa, runtime, screens-01-fix pushed; evidence-a5ab73 + forms-074d92 already in sync; all 8 ls-remote heads verified = local)
- [x] commit-map → `product/history/COMMIT-MAP-2026-10-24.txt` (419 hash lines, source: ~/devin-walk/commit-map-2026-10-23.txt)

## Phase 1 — Xpatready-gh clone, branch migration/github-canonical
- [x] a. remove tracked `studio/node_modules` symlink; commit studio package.json + package-lock.json (from `.tools/solution-1-prototype/studio-node/`); .nvmrc + engines 24.21.0; start.sh/lane.sh npm ci
- [x] b. .gitignore: sources/, *.pdf, .env*, *.dump, *.sql.gz (+code/, archive/, .tools/ already; .devin/ added); PDFs via `official-sources/fetch_official_sources.py` (manifest checksums) in local, CI, cloud
- [x] c. `.githooks/pre-push` + `product/tools/push-guard.sh` + CI guard job
- [x] d. stop-check: skip any-count when typescript missing; session-start: fetch + behind-origin warn; stop-check: warn (not block) on unpushed commits
- [x] e. lane.sh whoami: lead only on main in primary copy; else `.claude/lane` file via `lane.sh bind`, else unbound
- [x] f. settings.json: push allowed; force/-f/--delete/`:` denied; gh merge/delete/secret/repo-admin denied; `gh pr create` allowed
- [x] g. `product/tools/cloud-setup.sh` (Node 24, npm ci, PG 18 + lane DBs, prisma migrate, fetch PDFs; no Playwright install)
- [x] h. AGENTS rule 1, CLAUDE.md, LANES.md, ENVIRONMENT.md, DECISIONS.md P-82 row, LEAD.md P-81 item

## Phase 2 — validate in Xpatready-gh
- [x] copy sources/, code/, archive/, PDFs, .tools/ + all other untracked/ignored files in as untracked (APFS clone-copy, same paths); git status: only `.devin/` was visible → now gitignored
- [x] run checks: check-docs OK · decision-impact OK (P-82 exempt) · count-any 437/437 baseline · npm ci 403 pkgs · prisma migrate deploy (no pending) + generate · fetch_official_sources (0 pending) · check_engine.ts 38/38
- [x] start.sh: reused live PG 18 @127.0.0.1:54329 via copied postmaster.pid; spare-port app via `tools/isolated.sh migcheck 4401` (xr_studio_migcheck) — served + stopped; bare 4401 correctly refused (QA-3)
- [x] recreate one lane worktree (.claude/worktrees/qa-migcheck on claude/qa-e01030); lane.sh bind qa → whoami `qa`; setup linked .tools + studio/node_modules
- [x] push migration/github-canonical (push-guard ran clean) · PR #1 open · CI: guard pass (both events), checks pass (guard self-match + createdb user + suite DATABASE_URL fixed in-flight)

## Phase 3 — cut-over (founder merges PR first)
- [x] founder delegated merge to Devin; PR #1 merged to main (8e613e3, merge commit)
- [x] renamed Xpatready → Xpatready-old-2026-10-24 (kept); Xpatready-gh → Xpatready; checkout main + pull = 8e613e3
- [x] PG stopped cleanly, real pg18-data re-copied consistent, restarted on new path :54329 — 113 xr_studio_* DBs, demo schema 34 tables
- [x] 7 lane worktrees recreated from origin branches at same tips; lane.sh bind + setup each (bind→whoami verified, .tools linked, hooks wired)
- [x] :4400 up from new folder on same xr_studio_demo DB; devin-walk mirror{,2,3} → *-RETIRED-2026-10-24 (kept)
- [x] final report sent to founder
