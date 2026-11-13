# Environment notes — tools installed on this Mac for the prototype

Every tool added for this work is listed here: version, official source, checksum where published, location and purpose, with the founder's approval (founder rule 19 Oct: missing tools are asked for and installed, never worked around; STANDARDS §1 technology gate). Nothing here is committed to git except this file.

**P-82 (24 Oct):** GitHub is the single source of truth and the filtered mirror is retired — the Mac folder and cloud sessions are ordinary clones (pull at start, push at end). The tools below stay on the Mac only (`.tools/` is gitignored). A fresh clone — cloud or Mac — gets the toolchain with `product/tools/cloud-setup.sh`: Node per `.nvmrc` (24.21.0), `npm ci` from the committed studio lockfile, PostgreSQL 18 plus the lane databases, `prisma migrate deploy`, the prototype packages from `prototype/env/node/` (ajv, Anthropic SDK; AIW-D259), the Python helpers from the hash-pinned `prototype/env/requirements-linux.lock` (same versions as the Mac lock), zsh and the en_US.UTF-8 locale; as root (cloud) PostgreSQL runs as the `postgres` user through a `pg_ctl` wrapper. The official blank PDFs are committed (P-83); the fetch script only checks them. On the Mac the `.tools` toolchain keeps working unchanged; `npm ci` is only the fallback when packages are missing.

**B168 (P-459, 11 Nov): any other Mac** (a second founder's copy) runs `prototype/studio/tools/new-machine.sh`: it installs nothing outside the clone; it finds the Node 24, PostgreSQL 16+ (18 preferred) and Python 3.14 already installed there (PATH, Homebrew's prefix, Postgres.app, nvm/fnm/volta) and stops with the exact install when one is missing; the packages go into that clone's `.tools/` and `node_modules/` from the same lockfiles. Guide: `product/SECOND-MAC.md`.

| Tool | Version | Source | Checksum | Location | Purpose | Approved |
|---|---|---|---|---|---|---|
| Node.js | 24.21.0 | nodejs.org | not recorded here | `.tools/node-v24.21.0` | Runs the studio API, web build and tests | Founder, 21 Oct (AIW-D258/D276) |
| Studio packages (NestJS, Prisma 7.8.0, React 19, Vite, Playwright, …) | exact pins in `prototype/studio/package.json` | npm registry | lockfile integrity hashes (`prototype/studio/package-lock.json`) | `prototype/studio/node_modules` per copy (Mac main copy also keeps `.tools/solution-1-prototype/studio-node`) | The reference app's toolchain, matching the team's stack | Founder, 21 Oct (AIW-D258/D276) |
| PostgreSQL | 18.6 | Homebrew `postgresql@18` | Homebrew bottle record | `/opt/homebrew/opt/postgresql@18`; data `.tools/solution-1-prototype/pg18-data` (127.0.0.1:54329) | Local demo and lane databases | Founder, 21 Oct |
| c8 | 12.0.0 | npm registry (ISC) | npm integrity sha512-4zpJ…4Pqg== | studio toolchain `.tools/solution-1-prototype/studio-node` | Code coverage for the qa lane | Founder, 23 Oct (P-69) |
| GitHub CLI (gh) | 2.83.1 | Homebrew | Homebrew bottle record | `/opt/homebrew/bin/gh` | Logged in as the founder's account; `git push` and `gh pr create` allowed, merges stay on GitHub | Already installed before this work |
| Playwright Chromium | not recorded (must match the studio's Playwright pin to be used) | Playwright's own download (`npx playwright install chromium`) | not recorded | Playwright's browser cache on the Mac (`~/Library/Caches/ms-playwright`) | Browser for local browser checks; the studio's suites launch the system Chrome (channel `chrome`) and CI and cloud sessions use their own preinstalled browser, so nothing in the repository depends on it | Founder, 25 Oct (installed by the Hermes agent at the founder's request) |
| agent-browser | not recorded | not recorded (npm package `agent-browser`, browser automation CLI for AI agents) | not recorded | Mac (global install, path not recorded) | Lets an agent drive a browser from the command line; **no use in this work yet**, nothing in the repository calls it | Founder, 25 Oct (installed by the Hermes agent at the founder's request); technology gate record below is open |
| git-filter-repo | 2.47.0 (reports `a40bce548d2c`) | Homebrew bottle of github.com/newren/git-filter-repo v2.47.0, MIT | source archive sha256 `4662cbe5918196a9f1b5b3e1211a32e61cff1812419c21df4f47c5439f09e902`; installed bottle sha256 `774b68744bca239b25b7e82693204f198c6ab1224ded38d8dd33ec1c23c245d8` (matches Homebrew's record, checked 24 Oct) | `/opt/homebrew/bin/git-filter-repo` (Python 3 script) | Built the filtered GitHub copy without `sources/`, `code/`, `archive/` and PDFs (P-81) — retired 24 Oct, kept for reference | Founder, 24 Oct |
| @types/chrome (+ @types/filesystem, @types/filewriter, @types/har-format) | 0.3.5 | npm registry (MIT) | lockfile integrity | studio dev dependencies (on main since the F2 merge, 25 Oct) | Type definitions for the F2 browser extension; dev only, nothing ships | Lead, 25 Oct (P-90, S-4) |
| cloudflared | 2025.11.1 | Homebrew (`/opt/homebrew/bin/cloudflared`) | Homebrew bottle checksum | the Mac, outside the repository | Installed 26 Oct by the forms session at the founder's request for a public demo link (quick tunnel). **Not in use:** the founder closed the tunnel the same day (P-88 stands: localhost:4400 only); keep or uninstall at the founder's choice | forms session, recorded by the Lead 26 Oct |
| PostgreSQL 18 server (cloud fallback) | 18.3 (`@embedded-postgres/linux-x64@18.3.0-beta.17`) | npm registry | sha512 pinned in `tools/cloud-setup.sh` | cloud sessions only, `/usr/lib/postgresql/18` | Same server major as the Mac when apt.postgresql.org is denied; client tools from the image | Lead, 25 Oct |
| Playwright Chromium in CI | matches the studio's Playwright (1.64.1) | `playwright install chromium` in the CI suites job | Playwright's download checks | GitHub runner only | Loads the unpacked F2 extension (branded Chrome refuses) | Lead, 25 Oct |
| gitleaks | 8.30.1 | Homebrew bottle `gitleaks--8.30.1.arm64_tahoe` (github.com/gitleaks/gitleaks, MIT) | Homebrew bottle record (checked by Homebrew on install) | `/opt/homebrew/bin/gitleaks`, the Mac, outside the repository | Scans the team's history for committed secrets before anyone else gets access to the founder's private synced copy (P-519 F1, P-520); a finding is written as type and commit date, never the value | Founder, 13 Nov ("Yes, install it"); installed by Lead 30 (series 2) in a Terminal tab the founder could see |

## Technology gate record: Goose, Ollama Cloud and Playwright MCP for the scout lane (STANDARDS §1, P-91) — closed 29 Oct: never installed, scout lane and Goose retired (P-146)
* **What:** the Goose CLI (Apache-2.0, github.com/aaif-goose/goose, docs goose-docs.ai), the Ollama Cloud provider (paid plan, the founder's API key in Goose's own keychain store, never in the repository), and `@playwright/mcp` 0.0.83 (Apache-2.0, published 28 Sep 2026, pinned in `.goose/recipes/scout.yaml`). Mac only, for the scout lane.
* **Why:** an independent outside-in tester (P-91) that runs without Claude Code and its credit.
* **Data:** prompts carry repository content and app screenshots with Sample data only. Ollama's FAQ says cloud prompts and responses are not stored or logged and are not used for training. `code/` is never read.
* **Open:** record versions and checksums after the founder installs (`goose --version`; the npm integrity of `@playwright/mcp`).

## Technology gate record: Playwright Chromium and agent-browser (STANDARDS §1) — open
* **Installed 25 Oct** on the Mac by the Hermes agent at the founder's request; recorded by the cloud Lead from the founder's message.
* **To fill on the Mac (next Mac session):** exact versions (`npx playwright --version`, `agent-browser --version`), install location, source and licence (agent-browser), and checksums where published.
* **Problem and options:** not recorded for agent-browser. Playwright Chromium duplicates the system Chrome the suites already use. Until a problem is named, neither is part of the reference build; a lane that wants agent-browser proposes it through this gate first.

## Tool: GNU coreutils 9.12 for the suites' time limit (installed 26 Oct, founder OK)
* **What and why:** `brew install coreutils` (9.12_1, GPL-3.0-or-later, official Homebrew bottle, sha256 `38e01cd0…7b73d` matches the published one; pulled in `gmp` and `openssl@4`). Gives `/opt/homebrew/bin/gtimeout`, which `tools/run-suites.sh` uses on the Mac (Linux CI has `timeout`). Test tooling only, not part of the app; no data leaves the Mac.

## Technology gate record: git-filter-repo (STANDARDS §1)
* **Problem:** the local history held `sources/` (390 files) and 83 PDFs that must never reach GitHub (P-81); a plain push would send them.
* **Options:** (1) push as is: rejected, leaks excluded files; (2) rewrite the working repository's history: rejected, breaks five running lane copies; (3) a filtered mirror built by git-filter-repo: chosen; (4) a single fresh commit without history: loses the review trail.
* **Integration and upkeep:** one command inside `.tools/github-mirror`; no change to the app or the lanes; upgrade with Homebrew.
* **Data and licence:** MIT; runs locally; reads only this repository.
* **Outcome (24 Oct):** served its purpose; the migration to ordinary clones retired it (P-82).

## Technology gate record: GitHub Actions self-hosted runner (STANDARDS §1) — installed 30 Oct (founder OK, P-181)
* What: GitHub's official runner v2.338.2 for macOS arm64, from github.com/actions/runner (release of 26 Oct 2026), `actions-runner-osx-arm64-2.338.2.tar.gz`, SHA-256 `25a065af409ffa317ab4d5a3b614dd15fc9c40f2172bc1b35a1b1258e919a388` (matched the release's published value). Location `~/actions-runner-xpatready` (outside the repository), runner name and label `xr-mac`.
* Why: pull request checks ran on GitHub's machines and were blocked when the Actions spending limit was hit; on the Mac no minutes are billed and the same checks and full suites run (`.github/workflows/ci.yml`; the browser suite on its own isolated copy, never the :4400 demo).
* Registration and the background service are done by the founder in a terminal (the Lead's session may not register runners). The Mac must be on for a pull request to be checked.

## Backups
* `.tools/ledger-backup-2026-10-29` — the old AI spending ledgers, kept to seed the one shared ledger of QA-90 (restored 30 Oct from the size-trim audit).
* Lane test databases `xr_studio_<lane>_*` (about 3.7 GB on 29 Oct) are scratch: drop them when lanes are idle (restored 30 Oct from the size-trim audit).
* `.tools/solution-1-prototype/backups/xr_studio_demo-before-forms-restart-20261023-1908.dump` — the :4400 database before the forms update and the stray-row removal (pg_dump custom format; restore with `pg_restore`).
* `.tools/solution-1-prototype/backups/xr_studio_demo-before-w1-structure-refresh-20261027-0742.dump` — the :4400 database before the 27 Oct refresh onto `lead/2026-10-27` (W1-02 plus screens slices 1+2, migration `20261027090000_w1_structure`); founder OK; restore with `pg_restore`.
* `~/Xpatready-backup-2026-10-24.bundle` (all refs, verified), `~/Xpatready-db-*-2026-10-24.dump` (every `xr_studio_*` database), `~/Xpatready-backup-2026-10-24.tar.gz` (working tree) — the P-82 migration backups; checksums in `~/Xpatready-backup-2026-10-24.sha256`.

## Mac check slots (P-199, installed 31 Oct 2026 by the tech lead with the founder's Go)
Three GitHub Actions runners, version 2.338.2 (osx-arm64; the official package already on the Mac at `~/actions-runner-xpatready/actions-runner-osx-arm64-2.338.2.tar.gz`, SHA-256 `25a065af409ffa317ab4d5a3b614dd15fc9c40f2172bc1b35a1b1258e919a388`), each a launchd service:
* `xr-mac` (`~/actions-runner-xpatready`, label `xr-mac`): PR checks and the nightly run, copies named `ci_*`.
* `xr-mac-2` (`~/actions-runner-xpatready-2`, label `xr-mac`): a second slot for the same jobs, copies named `ci2_*` (other ports). **Removed 31 Oct (P-200, P-202):** two checks at once ran slower in total than one; service uninstalled and folder deleted; its offline entry is removed in GitHub › Settings › Actions › Runners.
* `xr-mac-light` (`~/actions-runner-xpatready-3`, label `xr-mac-light`): auto-merge and the demo update only, so they never wait behind a test run.
Each runner's `.env` and `.path` are copies of the first one's. Stop or start one with `./svc.sh stop|start` in its folder. Registration needed a one-hour code from GitHub › Settings › Actions › Runners, pasted by the founder.

## Merge queue (P-201, 31 Oct 2026)
Mergify (GitHub app, free plan) on this repository only, configured by `.mergify.yml` at the repository root: approved PRs (label `review: approved`) are batched up to 4, checked once on a batch PR from `mergify/merge-queue/...`, and merged together. `automerge.yml` runs only by hand as a fallback. To pause the queue, remove the app from the repository (GitHub › Settings › GitHub Apps).
