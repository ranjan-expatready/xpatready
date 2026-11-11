# Your own copy of the Studio on your Mac (for a second founder)

One page (B168, P-459). You get the same Pathway Configurator reference app as the founder's demo, on your Mac at
http://localhost:4400, loaded with the six agreed combinations and the finished story (the family case taken to a
recorded submission). You follow `main` the same way the team does. Live AI stays off: no key, no spend.

## 1. Once: access and tools (about 15 minutes)
1. **GitHub access.** The founder adds your GitHub account as a collaborator on the team's repository (GitHub › the
   repository › Settings › Collaborators › Add people). Accept the e-mailed invitation. Sign in on your Mac once:
   `gh auth login` (GitHub's CLI, `brew install gh`) or a personal access token for `git push`.
2. **Three tools**, installed however you like (the command finds them on your PATH, in Homebrew, in Postgres.app, or
   in nvm, fnm or volta). With Homebrew (https://brew.sh; it checks each download against its recorded checksum):
   ```bash
   brew install node@24 postgresql@18 python@3.14
   ```
   * **Node 24** (the team pins 24.21.0). Or the official installer `node-v24.21.0.pkg` from https://nodejs.org/dist/v24.21.0/,
     checked with `shasum -a 256` against `SHASUMS256.txt` in the same folder.
   * **PostgreSQL 16 or newer, 18 preferred.** Or Postgres.app (https://postgresapp.com). You do not need to start its
     service: the command runs its own small database server for the Studio.
   * **Python 3.14** (the form-filling helpers' packages are pinned for it). Or the macOS installer from
     https://www.python.org/downloads/, checked against the SHA-256 on its release page.
   * A Mac with Apple silicon: the helpers' lock pins arm64 packages. On an Intel Mac, ask the tech lead first.
3. **Clone** the repository (the founder sends you its link) wherever you keep code:
   ```bash
   git clone <the repository's link> Xpatready && cd Xpatready
   ```

## 2. The one command
From the clone's top folder:
```bash
bash ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tools/new-machine.sh
```
It installs the packages from the committed lockfiles into the clone only (`.tools/` and `node_modules/`, never
committed), creates the database (role `xr_studio`, database `xr_studio_demo` on 127.0.0.1:54329), applies the
migrations, builds the web app, starts http://localhost:4400 and, on an empty database, loads the six and the finished
story (a few minutes the first time). A missing tool stops it with the exact install to make. Stop everything with
the same command followed by `stop`.

* Port 54329 taken by something else: add `STUDIO_PGPORT=54339` in front. Port 4400 taken: `STUDIO_PORT=4410`.
* Prefer a PostgreSQL server you already run: `DATABASE_URL=postgresql://<user>@127.0.0.1:5432/xr_studio_demo` in front
  (the database is created when missing).
* A tool installed somewhere the search does not look: `STUDIO_NODE_BIN=…/bin`, `STUDIO_PG_BIN=…/bin`,
  `STUDIO_PYTHON=…/python3.14` in front.

## 3. Every day: follow main
```bash
git checkout main && git pull
bash ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tools/new-machine.sh
```
The same command reinstalls only what a lockfile changed, migrates, rebuilds and restarts. Your data is kept; to start
over, use the app's **Demo › Load the finished story** (or **Reset to the six**).

**Differences from the founder's demo: two things live only on the founder's Mac**, never in git (measured 11 Nov, B168):
* **The Adobe-validated Paper form** (`.tools/solution-1-prototype/validated-imm5257/`; PDFs are never committed). Without
  it, 4 of the finished story's 8 stages show "partly": the validated file is kept on the Mac, so one person's filing
  is not Ready to file and the submission is not recorded for that person. The founder can hand you that folder (one
  file, about 1.4 MB, Sample data) to put at the same place in your clone; then Demo › Load the finished story gives all 8.
* **The AI spend ledger** (`.tools/p2-ledger`): the founder's past AI spend. Your copy shows US$0.00 spent; it cannot
  spend anything, as it has no key.

Everything else is the same code and the same sample data.

## 4. Your agent works through the same pipeline
Open Claude Code (or another agent) at the clone's top folder; it reads `AGENTS.md` and
`ai-workers/problem-1-pathway-setup-and-form-filling/product/WAY-OF-WORKING.md` and `RULES.md`. The rules for it:
* **Never `/lead`.** The tech lead is the founder's main copy only (P-188). Your agent is a builder: `/next <area> <row>`
  for a ready row in `BACKLOG.md`, or your ask written down as a question for the tech lead first.
* **Before taking a row**, read `STATE.md`: its lanes table says who is building what, and which lane holds the schema
  (one migration in flight at a time). Never touch `prisma/` migrations, `contracts/` or another lane's row without the
  tech lead's yes. Never edit `STATE.md`, `DECISIONS.md` or `qa/CAPABILITIES.md`.
* **One small row = one PR:** `git fetch origin && git checkout -b claude/<area>-<word> origin/main`; push after every
  step; a draft PR; the checks in the `/next` skill; a review by the reviewer agent on Opus, which ends with the PR
  comment `Reviewer: Approve <full head sha>`; then mark the PR ready and add the label `review: approved`. On green
  checks the merge queue merges it and the founder's demo updates itself. Any later push needs a new review.
* Questions go in the PR as "Question for the tech lead", with a recommendation.
* Never set any `STUDIO_*_LIVE` switch (that spends money); never commit `.tools/`, PDFs, databases, logs or secrets
  (the push guard refuses them); no personal names in project files.
