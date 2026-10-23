# Expat Ready: working folder

**Always open Claude Code here, at the project root** (hooks and skills live here; read-only sources and team code captures are reachable from here).

## Current work (from 21 Oct 2026)

**Pathway Configurator reference build.** Start at `ai-workers/problem-1-pathway-setup-and-form-filling/product/PRODUCT.md`, then `STATE.md`. The founder drives it with one command: **`/next`** (skill `.claude/skills/next`). Other skills: `screen-concept` (Lead), `screen-build`, `screen-review` (fresh subagent), `team-handover`, `grilling` (founder questions).

* Build locally in `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/`; mirror the team's names, components and tokens so the team can retrofit it.
* Never commit or push; never write to team repositories, Drive or email (`AGENTS.md`).
* One screen at a time: concept → agreed → build → self-review → fix → lead check → RCIC check → handover (`product/WORKFLOW.md`).
* End every reply with the "Paste to Lead" block.

## Folders

| Folder | What |
|---|---|
| `ai-workers/problem-1-pathway-setup-and-form-filling/product/` | Product home: rules, state, screens, concepts, reviews, handovers |
| `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/` | The reference app (NestJS + Prisma + PostgreSQL, React + Vite) |
| `sources/`, `code/` | Read-only copies of the team's requirements and repositories; newest only |
| `ai-workers/` (other files), `playbook/`, `delivery-reset-2026-10-21/` | Earlier records and the 21 Oct review; history and reference |
| `archive/` | History, never current |

The previous instructions (maker/checker, manifests, checkpoints) are in `archive/2026-10-21-before-workflow-switch/`.
