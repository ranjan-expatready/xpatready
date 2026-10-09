# Expat Ready — instructions for any agent

Start here, in this order:
1. `product/README.md` — the method, where requirements live, how they are changed, boundaries.
2. `product/NEXT.md` — current state and the next step.
3. Only then the specific requirement, source or code file the task needs.

Folders:
- `ai-workers/` — AI Workers workstream (from 8 Oct 2026): competitor study, AI Worker design, pricing and investor story.
- `product/` — the work: requirements (the single source, Markdown in git), the prototype app, generated exports.
- `sources/` — read-only snapshot of the Drive documents (2 Oct 2026) and the brand kit from git. Never edit; take a new dated snapshot when Drive changes.
- `code/` — read-only copies of the team's repositories. Copy from them; never modify them.
- `archive/` — everything before the 2 Oct 2026 fresh start. Read only to recover a specific fact; never treat it as current.

Boundaries (details in `product/README.md` §8): never edit, move or delete founder-owned Google Drive files; cite file, version, section and exact words; changing a ratified founder decision needs Ranjan's yes; legal and immigration values get "confirm with counsel / RCIC"; plain business language; one writer at a time; publish outside only when Ranjan says so.

**Access rule (co-founders Sanjay Singh and Ranjan Singh, 9 Oct 2026):** the founders share one set of accesses. Read anything connected: Google Drive, email, GitHub (company and personal repos), calendar. **Never change anything outside this folder**: no commits, pushes, pull requests, issues or settings in any repository; no create, edit, copy, share or delete on Google Drive (written as OneDrive by the founder, meaning Drive); no sending email. Enforced by `permissions.deny` in `.claude/settings.json`.

Method since 3 Oct 2026: Simulator v2 — waves by plane and module (`product/README.md` §3); one writer of shared files; nothing invented (delivery agreement §0).

At the end of substantive work, update `product/NEXT.md`.

Workstreams with their own resume point: **Workstream 2 — AI Workers, Doers, Conductor and all AI (Ranjan, 9 Oct 2026; read `ai-workers/README.md` §0 first)** — `ai-workers/README.md` then `ai-workers/PROGRESS.md` and `ai-workers/NEXT.md` (loaded by the SessionStart hook); **commercial plan** — `company-planning/START-HERE.md`.
