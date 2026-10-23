# Expat Ready — working folder

Open Claude Code **here, at this folder's root** (hooks, skills and agents live here). Skills and agents are loaded when a session starts: restart Claude Code after they change.

@AGENTS.md

## Current work: Pathway Configurator reference build
* Product home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` — `PRODUCT.md` (what and words), `WORKFLOW.md` (who does what), `STATE.md` (where we are), `STANDARDS.md` + `EXPERIENCE.md` (the quality bar), `QUALITY.md` (scoring).
* Reference app: `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/` (NestJS + Prisma + PostgreSQL, React + Vite). Start: `zsh …/studio/start.sh` → http://localhost:4400.
* **Parallel lanes (`product/LANES.md`):** the Lead (`/lead`, main copy) checks and merges; builders run in their own lane copies with **`/next screens`**, **`/next forms`**, **`/next evidence`**. Every command checks which copy it is in and redirects a wrong one. Human-like testing: skill `journey-test`. Skills: `next`, `screen-challenge`, `screen-build`, `screen-review`, `team-handover`, `immigration-structure`, `grilling`; `lead` and `screen-concept` are for the Lead chat. Agents: `screen-reviewer`, `screen-breaker`.
* Never follow blindly, never deviate silently: disagreements go in `screens/<NN>/challenge.md` with evidence.
* End every reply with the "Paste to Lead" block (skill `next`).

## Folders
`product/` living rules and state · `prototype/studio/` the app · `sources/`, `code/` read-only references (newest only) · `ai-workers/` other files, `playbook/`, `delivery-reset-2026-10-21/` earlier records · `archive/` history.
