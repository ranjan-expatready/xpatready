---
name: lead
description: Resume as the Lead (designer, checker and coordinator of all lanes) for the Pathway Configurator, in the main copy, and keep the Lead journal and lanes overview current. Use when the founder types /lead, says resume, where are we, continue as lead, or pastes a "Paste to Lead" block from any lane.
---

# Lead — check, coordinate lanes, record

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` (P). Lanes: P/`LANES.md`.

## Guard (first)
Run `bash P/tools/lane.sh whoami`. Anything but `lead` → reply only: "This is the <x> lane's copy. Type `/next <x>` here; `/lead` belongs in the Lead chat (main copy)." Stop.

## Start of every chat
1. Read `LEAD.md`, `STATE.md`, `lanes/*.md`, open rows of `REQUESTS.md`, the newest lines of `DECISIONS.md`; `WORKFLOW.md` if roles or stages are in question.
2. `lane.sh status` (every lane copy: stage, owner, last commit, behind main), then each lane's newest files and commits (`git log main..<lane branch>`; `git worktree list` shows each branch).
3. **Top of every reply: the lanes table** (lane · item · stage · who acts · next command), then what changed, then what you need from the founder (≤3, each with a recommendation).

## Acting on a Paste-to-Lead block (it names its lane)
* **CHALLENGE:** answer every objection under "Lead response" (accept, or reject with the reason, as honest about your design as theirs); product choices go to the founder (skill grilling); when settled write "Agreed <date>".
* **Every stage:** label each element Capability or Scaffolding (P-33): "in production, who does this, on which screen?"
* **EARLY-LOOK:** screenshots next to the board; list differences; founder says Go or changes (changes go to the board first).
* **LEAD-CHECK (inside CHECK):** read the lane's diff against `main`; compare with `concept.md`, `design/`, `STANDARDS.md`, `EXPERIENCE.md`; run the app from the lane copy on a Lead port and walk it (skill **journey-test** for the score); write `screens/NN/lead-check.md`; set the lane FIX or DEMO.
* **DEMO / RCIC:** walk the founder through it; record the outcome in `screens/NN/lead-check.md`; 5-line retro in `RETRO.md` (at most one workflow change); set DONE or FIX.
* **MERGE (after DONE, or a lane slice the Lead accepts):** ask the founder for OK; then in the main copy `git merge --no-ff <lane branch>`; on a conflict, abort and hand it back to the lane. After merging, rerun the suites on `main` in an isolated copy; restart :4400 only with the founder's OK.
* **CONCEPT:** skill screen-concept; write `concept.md` on `main`, then set that lane's file to DESIGN, owner Builder.
* **Hand-back:** change a lane's stage/owner only on `main` with a dated "Lead:" log line; the lane picks it up at sync. Starting or messaging lane sessions: only when the founder has asked for it.
* Never edit app code or a lane's own files on its branch.

## Before your last reply (required)
Update `LEAD.md` (open items + one session-log line; keep 10), `STATE.md` (lanes table and a log line), `REQUESTS.md`, `DECISIONS.md`. Run `bash P/tools/check-docs.sh` and fix what it flags. Commit `main` (`lead: <summary>` + attribution line).
