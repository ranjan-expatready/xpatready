# Environment notes — tools installed on this Mac for the prototype

Every tool added for this work is listed here: version, official source, checksum where published, location and purpose, with the founder's approval (founder rule 19 Oct: missing tools are asked for and installed, never worked around; STANDARDS §1 technology gate). Nothing here is committed to git except this file.

| Tool | Version | Source | Checksum | Location | Purpose | Approved |
|---|---|---|---|---|---|---|
| Node.js | 24.21.0 | nodejs.org | not recorded here | `.tools/node-v24.21.0` | Runs the studio API, web build and tests | Founder, 21 Oct (AIW-D258/D276) |
| Studio packages (NestJS, Prisma 7.8.0, React 19, Vite, Playwright, …) | exact pins in `.tools/solution-1-prototype/studio-node/package.json` | npm registry | lockfile integrity hashes (`studio-node/package-lock.json`) | `.tools/solution-1-prototype/studio-node/node_modules` (main copy links to it; active lanes keep their own) | The reference app's toolchain, matching the team's stack | Founder, 21 Oct (AIW-D258/D276) |
| PostgreSQL | 18.6 | Homebrew `postgresql@18` | Homebrew bottle record | `/opt/homebrew/opt/postgresql@18`; data `.tools/solution-1-prototype/pg18-data` (127.0.0.1:54329) | Local demo and lane databases | Founder, 21 Oct |
| c8 | 12.0.0 | npm registry (ISC) | npm integrity sha512-4zpJ…4Pqg== | studio toolchain `.tools/solution-1-prototype/studio-node` | Code coverage for the qa lane | Founder, 23 Oct (P-69) |
| GitHub CLI (gh) | 2.83.1 | Homebrew | Homebrew bottle record | `/opt/homebrew/bin/gh` | Logged in as the founder's account; pushes and pull requests only after P-81 settings | Already installed before this work |
| git-filter-repo | 2.47.0 (reports `a40bce548d2c`) | Homebrew bottle of github.com/newren/git-filter-repo v2.47.0, MIT | source archive sha256 `4662cbe5918196a9f1b5b3e1211a32e61cff1812419c21df4f47c5439f09e902`; installed bottle sha256 `774b68744bca239b25b7e82693204f198c6ab1224ded38d8dd33ec1c23c245d8` (matches Homebrew's record, checked 24 Oct) | `/opt/homebrew/bin/git-filter-repo` (Python 3 script) | Builds the filtered GitHub copy without `sources/`, `code/`, `archive/` and PDFs (P-81) | Founder, 24 Oct |

## Technology gate record: git-filter-repo (STANDARDS §1)
* **Problem:** the local history holds `sources/` (390 files) and 83 PDFs that must never reach GitHub (P-81); a plain push would send them.
* **Options:** (1) push as is: rejected, leaks excluded files; (2) rewrite the working repository's history: rejected, breaks five running lane copies; (3) a filtered mirror built by git-filter-repo: chosen; (4) a single fresh commit without history: loses the review trail.
* **Integration and upkeep:** one command inside `.tools/github-mirror`; no change to the app or the lanes; upgrade with Homebrew.
* **Data and licence:** MIT; runs locally; reads only this repository.
* **Reconsider:** if the local history is ever cleaned at source, or the team moves this work into its own repository.

## Backups
* `.tools/solution-1-prototype/backups/xr_studio_demo-before-forms-restart-20261023-1908.dump` — the :4400 database before the forms update and the stray-row removal (pg_dump custom format; restore with `pg_restore`).
