# Expat Ready — instructions for any agent

**The work:** the AI Workers layer on Expat Ready (Workstream 2). Everything lives in `ai-workers/`. Start with `ai-workers/README.md` §0, then `ai-workers/PROGRESS.md`, then `ai-workers/NEXT.md`.

**Folders**
- `ai-workers/` — the work: design, research, commercial drafts, checks, tracker, decisions. Tools and hooks in `ai-workers/tools/`.
- `sources/` — read-only copy of the Drive requirement documents (newest `drive-snapshot-<date>/` only; its `manifest.md` names the Drive master folders). Never edit; take a new dated snapshot when Drive changes (`sources/README.md`).
- `code/` — read-only dated copies of the team's GitHub repositories (`<repo>@<sha>-<date>/`). Never modify; take a new dated copy when GitHub moves and the step needs code.
- `commercial/` — the founders' business plan (`plan.md`, `plan.docx`) and money model (`model.xlsx`); Steps 5–6 extend them.
- `archive/` — everything superseded (older snapshots, older code copies, the retired simulator and planning workflow). Read only to recover a fact; never current.

**Sources of truth, in order:** Drive requirement documents (newest snapshot) → GitHub code → Ranjan's decisions (`ai-workers/decisions.md`). Anything else is Proposal, Assumption or Unknown.

**Access rule (co-founders Sanjay Singh and Ranjan Singh, 9 Oct 2026):** read anything connected (Drive, email, GitHub, calendar). **Never change anything outside this folder**: no commits, pushes, pull requests or issues in any repository; no create, edit, copy, share or delete on Drive; no email. Enforced by `permissions.deny` in `.claude/settings.json`.

**Boundaries:** cite file, version, section and exact words; changing a ratified founder decision needs Ranjan's yes; legal and immigration values get "confirm with counsel / RCIC"; plain business language; one writer of shared files (the Lead); publish outside only when Ranjan says so.

**Keep in sync every session:** the hook runs `ai-workers/tools/freshness.sh` (code vs GitHub). The Lead then searches Drive for files modified after the newest snapshot date and copies what a step cites. Drive and GitHub change daily; a stale copy is never cited.
