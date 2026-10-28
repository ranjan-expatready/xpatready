# Devin: outside reviewer set up (founder, 28 Oct) — and a proposal to retire Goose

**Who:** Devin on the Mac, 28 Oct evening, on `origin/main` 38722933. No change to any file Claude Code owns; this file is the only thing in the repo.

## What the founder decided (in the Devin chat, 28 Oct)
1. **Goose is no longer used.** The founder will use Devin only as the outside tool.
2. **Devin's role: outside reviewer, report only.** It walks merged screens one at a time like a demanding manual tester and UX lead (benchmark against best-in-class immigration case management and modern SaaS, visible-browser walk with screenshots, API and data check), and sends **5–8 ranked findings per screen** to this inbox. It may also give a second opinion on a concept or challenge when the Lead or founder asks. It never fixes code, merges, decides, or edits rules, skills, lane files, `scout/` or `qa/`.
3. **The Claude Code workflow stays as it is.** The founder asked Devin not to change it; cleanup of Goose material is for the Lead to decide (below).

## How Devin stays out of the way
| Thing | Devin's | Never touches |
|---|---|---|
| Copy | `/Users/ranjansingh/Desktop/xpatready-devin`, a worktree **detached** on origin/main, refreshed each run; no branch | the main copy, `.claude/worktrees/*` |
| App | :4490, database `xr_studio_devin_x1` (`studio/tools/isolated.sh devin_x1 4490`), own `npm ci` | :4400, lane ports 4400–4479, scout :4480 |
| Method | skill `~/.config/devin/skills/outside-review/` (outside the repo; not committed) | `.claude/`, `.agents/`, `.goose/` |
| Output | one inbox file per run on `devin/<date>-<topic>` (inbox README: Devin is a listed outside checker) | `main`, PRs, lane branches |
| Scope | merged `main` only, desktop (1440, 1024) per wave 1; skips a screen an open lane branch is changing | — |

`lane.sh status` will list the Devin copy as "unbound"; that is expected. First run waits for the founder's go; order: Program structure → Immigration programs → Form library → To review → S5 and S3 after they merge.

## Proposal for the Lead: retire Goose (your files, your call)
Goose material still in the repo (outside `archive/`): `GOOSE-TASKS.md`, `.goose/` recipe, the scout lane (`lanes/scout.md`, `scout/`, `tools/scout.sh`, `.agents/skills/scout/`), and Goose mentions in `LANES.md`, `DECISIONS.md` (P-91, P-95 area), `DEMO.md`, `ENVIRONMENT.md`, `PLAN.md`, `WAVE-1.md`, `LEAD.md` (Scout row, "Spend … Goose on the Mac"), `design/programme-map.html`. Suggested:
1. Record the founder's decision ("Goose retired; Devin is the outside reviewer, report only, through the inbox") in `DECISIONS.md`.
2. Mark the scout lane **retired** (keep `scout/FINDINGS.md` and reports as history); the old branch `scout/2026-10-25-1328` (unmerged, 418 behind; carries the 25 Oct report, screenshots, probes and a stale empty-state wording on `programs.tsx` that conflicts with main) can be merged with main's `programs.tsx` taken, or closed.
3. `GOOSE-TASKS.md` G1 (approved US$12 AI drafts of IMM 0008/5669/5406) needs a new owner if still wanted; Devin does not run paid product AI.
Devin made no edit to any of these.

## Note
The earlier Devin Lead handover (`history/devin/2026-10-28-devin-lead-handover.md`) is already handled by the sixth Lead chat.
