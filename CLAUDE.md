# Expat Ready — working folder

Open Claude Code **here, at this folder's root** (hooks, skills and agents live here). Skills and agents are loaded when a session starts: restart Claude Code after they change.

@AGENTS.md

## Current work: Pathway Configurator reference build
* Product home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` — `WAY-OF-WORKING.md` (who does what, the rules), `BACKLOG.md` (work, in order), `STATE.md` (where we are), `PRODUCT.md` (what and words), `STANDARDS.md` + `EXPERIENCE.md` (the bar).
* Reference app: `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/` (NestJS + Prisma + PostgreSQL, React + Vite). Start: `zsh …/studio/start.sh` → http://localhost:4400.
* **Roles (P-188, P-189):** the founder talks to the tech lead (`/lead`, main copy on the Mac). Builders run **`/next screens`**, **`/next forms`**, **`/next runtime`**, **`/next evidence`** in their own copies; qa runs **`/qa <mode>`**. One small item = one PR; it merges by itself on green CI plus the reviewer's Approve (label `review: approved`), and the demo updates itself.
* Never follow blindly, never deviate silently: disagreements go in the PR or `screens/<item>/challenge.md` with evidence.

## Folders
`product/` living rules and state · `prototype/studio/` the app · `sources/`, `code/` read-only references (newest only) · `ai-workers/` other files, `playbook/`, `delivery-reset-2026-10-21/` earlier records · `archive/` history.
