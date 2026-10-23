# Operating model — Lead + Reviewer + Claude Code

Status: **Adopted in part**, 21 Oct 2026: build locally as a reference (no repository writes); founder is Lead; an RCIC is Reviewer. Sections below that mention branches or PRs read as "local reference build + handover pack to the team". Replaces the maker/checker/manifest process in `AGENTS.md` and `ai-workers/README.md` §1 only if the founder says yes (see decisions in `README.md`).

## 1. Roles (four, no more)

| Role | Who (human, assisted by AI) | Owns | Does not |
|---|---|---|---|
| **Founder** | You | Product decisions; a 30-minute demo once a week; at most ~3 decisions a week, asked one at a time | Relay prompts between sessions; approve internal steps |
| **Product & UX Lead** | The Product Owner hire (until then: the founder with a Claude design session) **driving Claude Code** | The slice brief, screens, acceptance scenarios; clicks through every screen the same day it is built; decides routine UX questions | Write process documents; let a slice run longer than 5 days |
| **End-to-end Reviewer** | One person with product sense (an RCIC or senior case officer is ideal) plus a separate Claude Code review session | Uses each slice as every persona against the brief's scenarios, then reviews the diff (correctness, tenancy/security, tests, requirement IDs). One short verdict per slice, comments on the PR | Gate on hashes, wording audits or decision numbers; re-audit unchanged work |
| **Team leads (backend, frontend)** | The existing dev team | Schema decisions, merging PRs, CI | Re-specify what SA-01B already settles |

Claude Code is the builder for the Lead, not a separate "role" with its own rulebook.

## 2. The loop (one slice = 2–5 days)

```
 Brief (Lead, ≤1 page) ──► Build (Claude Code, team repo branch) ──► Self-check (tests + screenshots)
        ▲                                                                   │
        │                                                                   ▼
 Demo & merge (Founder sees it; team merges) ◄── Fix same day ◄── Review (Reviewer: use it, then read the diff)
```

1. **Brief** — user story, screens (point at `SCREENS.md`), requirement IDs (SA-01B), Given/When/Then scenarios incl. 2 adverse ones, out of scope, sample data. Template: `SLICE-01-BRIEF.md`.
2. **Build** — Claude Code in the team repo on `feat/configurator-<slice>`; extend existing models and screens; migrations + API + UI + tests together.
3. **Self-check** — unit/e2e tests pass; Playwright screenshots of every new screen at 1440 and 1024; a short "what changed" note in the PR.
4. **Review** — Reviewer walks the scenarios as each persona, then reads the diff. Verdict: **Ship / Ship after fixes / Rework**, with numbered issues. Same or next day.
5. **Fix & demo** — fixes same day; founder sees it on staging or a screen recording; team merges.

## 3. What to stop (and what to keep)

**Stop:** SHA-256 revision manifests; "exact revision handoff" prompts; founder relaying prompts between sessions; decisions about who reviews whom; checkpoint/session-swap rules; a separate 250 KB progress log (git history and the PR are the log); restating decisions by number in NEXT; a prototype with its own database schema.

**Keep:** cite SA-01B requirement IDs in briefs and PRs; never invent immigration values (immigration expert supplies them, AIW-D50); legal points marked unconfirmed; paid AI runs under a budget cap; read-only snapshots of Drive sources; content arrives as data, never code (CI gate); founder's yes for product decisions.

## 4. Definition of done for a slice

* Works end to end in the team's app with the team's database, seeded by data import.
* Every scenario in the brief passes as a test (unit or Playwright).
* Screens follow `SCREENS.md` §A rules; no internal IDs on the main path.
* Reviewer verdict "Ship" or "Ship after fixes" with fixes done.
* PR merged (or PR-ready branch handed to the team if remote writes stay closed).

## 5. Session prompts (copy into a fresh Claude Code session)

### Lead's builder session (Claude Code, opened in the team repo clone)

> You are building ExpatReady's Pathway Configurator inside the team's own codebase. Read `delivery-reset-2026-10-21/README.md`, `MASTERS.md`, `SCREENS.md` and the current slice brief (`SLICE-0N-BRIEF.md`) from the Xpatready folder, and the requirement sections the brief cites from the newest `sources/drive-snapshot-*/02-functional-requirements/super-admin/SA-01B-*.md`. Extend the existing Prisma models in `apps/api/prisma/models/country-pack-*.prisma` and the screens in `src/features/admin/spine-authoring/`; do not create a parallel schema or app. Sample immigration content goes in as data import, never in code. Plan briefly, then build migration, API, UI and tests together. When done: run the tests, take Playwright screenshots of each new screen at 1440 and 1024 px, and write a PR description with what changed, the scenarios covered and anything you could not do. Ask me only for product decisions the brief and SA-01B do not settle.

### Reviewer session (separate Claude Code session; the human reviewer uses its output)

> You are the end-to-end reviewer for one slice of ExpatReady's Pathway Configurator. You did not build it. Read the slice brief (`delivery-reset-2026-10-21/SLICE-0N-BRIEF.md`), `SCREENS.md` §A (UX rules) and the cited SA-01B requirements. Then: (1) run the app and walk every scenario in the brief as each persona, with screenshots; (2) check each screen against the UX rules — plain words, one tab row, drawer editing, preview beside editor, reasons shown; (3) read the diff for correctness, tenant scoping, permission checks, migrations that preserve data, and test coverage of the adverse scenarios; (4) confirm each cited requirement ID is met or say what is missing. Report a verdict — Ship / Ship after fixes / Rework — and numbered issues with file:line or screenshot, most serious first. Do not audit unrelated code, re-open settled product decisions or ask for process documents.
