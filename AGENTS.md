# Expat Ready — instructions for any agent

**The work:** the AI Workers layer on Expat Ready (Workstream 2). Everything lives in `ai-workers/`. Start with `ai-workers/README.md` §0, then `ai-workers/PROGRESS.md`, then `ai-workers/NEXT.md`.

**Folders**
- `ai-workers/` — the work: design, research, commercial drafts, checks, tracker, decisions. Tools and hooks in `ai-workers/tools/`.
- `sources/` — read-only copy of the Drive requirement documents (newest `drive-snapshot-<date>/` only; its `manifest.md` names the Drive master folders). Never edit; take a new dated snapshot when Drive changes (`sources/README.md`).
- `code/` — read-only dated copies of the team's GitHub repositories (`<repo>@<sha>-<date>/`). Never modify; take a new dated copy when GitHub moves and the step needs code.
- `commercial/` — the founders' business plan (`plan.md`, `plan.docx`) and money model (`model.xlsx`); Steps 5–6 extend them.
- `archive/` — everything superseded (older snapshots, older code copies, the retired simulator and planning workflow). Read only to recover a fact; never current.

**Sources of truth, in order:** Drive requirement documents (newest snapshot) → GitHub code → the founder's decisions (`ai-workers/decisions.md`). Anything else is Proposal, Assumption or Unknown. A conflict between a source and a founder decision is recorded and goes to the founder; it is never settled by this order (`ai-workers/README.md` §0 rules 2 and 11).

**Access rule (the co-founders, 9 Oct 2026; this is its one home):** read anything connected (Drive, email, GitHub, calendar). **Never change anything outside this folder**: no commits, pushes, pull requests or issues in any other repository (the team's GitHub repositories and the read-only copies in `code/`); no create, edit, copy, share or delete on Drive; no email. *Clarified 13 Oct 2026:* this project folder's own local git history (no remote) is inside this folder; the Lead commits there at each step and checkpoint (`ai-workers/README.md` §0 rules 7 and 13). It is never pushed. Enforced by `permissions.deny` in `.claude/settings.json`.

**Boundaries:** cite file, version, section and exact words; changing a ratified founder decision needs the founder's yes; legal points are labelled "Unconfirmed: no counsel (AIW-D94)"; immigration values come from the immigration specialist (AIW-D50); plain business language; one writer of shared files (the Lead); publish outside only when the founder says so.

**Keep in sync every session:** follow `ai-workers/README.md` §4 step 1 (freshness first). A stale copy is never cited.
