# GitHub canonical migration — progress (P-82, 24 Oct)

Checklist so any agent can resume. Status: `[x]` done · `[ ]` pending · `[!]` blocked/needs founder.

## Phase 0 — freeze and back up
- [x] Required docs read (AGENTS, CLAUDE, settings, DECISIONS P-81/P-64/P-31, LANES, LEAD, ENVIRONMENT, lane tools)
- [!] One Claude Code session still running: ACP session in `.claude/worktrees/runtime-r1-8f1db8` (pids 67641 acp + 91959 claude) — flagged to founder; proceeding under /bypass
- [x] lane.sh status: all 7 lane worktrees clean; lead-check-{forms,runtime,screens} have only generated outputs (screenshots/evidence JSONs)
- [x] `git bundle create ~/Xpatready-backup-2026-10-24.bundle --all` + `git bundle verify` (451 MB, all refs incl. worktree HEADs + refs/archive/pre-rewrite/*)
- [x] pg_dump: all 112 `xr_studio_*` databases → `~/Xpatready-db-<name>-2026-10-24.dump` (35 MB total, custom format)
- [ ] working-tree tar → `~/Xpatready-backup-2026-10-24.tar.gz` (first attempt truncated: disk full at 5.6G; rebuild slimmer: `.git`+untracked/ignored/modified only, no node_modules/pg18-data)
- [ ] checksums file `~/Xpatready-backup-2026-10-24.sha256`
- [ ] final mirror = push ahead branches to origin (main +22, evidence-e1b +34, forms-f1-check +31, qa +48, runtime +39, screens-01-fix +18; evidence-a5ab73 + forms-074d92 in sync; all fast-forward, no divergence)
- [ ] commit-map → `product/history/COMMIT-MAP-2026-10-24.txt` (source: ~/devin-walk/commit-map-2026-10-23.txt)

## Phase 1 — Xpatready-gh clone, branch migration/github-canonical
- [ ] a. remove tracked `studio/node_modules` symlink; commit studio package.json + package-lock.json (from `.tools/solution-1-prototype/studio-node/`); .nvmrc + engines 24.21.0; start.sh/lane.sh npm ci
- [ ] b. .gitignore: sources/, *.pdf, .env*, *.dump, *.sql.gz (+code/, archive/, .tools/ already); PDFs via `official-sources/fetch_official_sources.py` (manifest checksums) in local, CI, cloud
- [ ] c. `.githooks/pre-push` + `product/tools/push-guard.sh` + CI guard job
- [ ] d. stop-check: skip any-count when typescript missing; session-start: fetch + behind-origin warn; stop-check: warn (not block) on unpushed commits
- [ ] e. lane.sh whoami: lead only on main in primary copy; lane branch prefixes + worktree names map; else unbound
- [ ] f. settings.json: push allowed; force/-f/--delete/`:` denied; gh merge/delete/secret/repo-admin denied; `gh pr create` allowed
- [ ] g. `product/tools/cloud-setup.sh` (Node 24, npm ci, PG 18 + lane DBs, prisma migrate, fetch PDFs; no Playwright install)
- [ ] h. AGENTS rule 1, CLAUDE.md, LANES.md, ENVIRONMENT.md, DECISIONS.md P-82 row, LEAD.md P-81 item

## Phase 2 — validate in Xpatready-gh
- [ ] copy sources/, code/, archive/, PDFs in as untracked; confirm git status clean of them
- [ ] run check-docs, decision-impact, count-any, studio suites, start.sh on a spare port
- [ ] recreate one lane worktree; lane.sh whoami/setup in it
- [ ] push migration/github-canonical, open PR, report CI + diffs vs old folder

## Phase 3 — cut-over (founder merges PR first)
- [ ] rename Xpatready → Xpatready-old-2026-10-24; Xpatready-gh → Xpatready
- [ ] checkout main + pull; recreate lane worktrees from origin branches; lane.sh setup each
- [ ] :4400 starts on the same database; stop using devin-walk mirror dirs
- [ ] final report: changes, backups, undo
