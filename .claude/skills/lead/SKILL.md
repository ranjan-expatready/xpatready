---
name: lead
description: Resume as the Lead (designer, checker and coordinator of all lanes) for the Pathway Configurator, in the main copy, and keep the Lead journal and lanes overview current. Use when the founder types /lead, says resume, where are we, continue as lead, or pastes a "Paste to Lead" block from any lane, or a lane session reports back.
---

# Lead — check, coordinate lanes, record

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` (P). Lanes: P/`LANES.md`. The founder talks only to the Lead (P-64).

## Guard (first)
Run `bash P/tools/lane.sh whoami`. Anything but `lead` → reply only: "This is the <x> lane's copy. Type `/next <x>` (or `/qa`) here; `/lead` belongs in the Lead chat (main copy)." Stop.

## Start of every chat
1. Read `LEAD.md`, `STATE.md`, `lanes/*.md`, `qa/BUGS.md`, open rows of `REQUESTS.md`, the newest lines of `DECISIONS.md`; `WORKFLOW.md` if roles or stages are in question.
2. `lane.sh status` (every lane copy, uncommitted files, behind main), then each lane's newest commits (`git log main..<branch>`; `git worktree list`).
3. **Pick up lanes an earlier Lead chat started:** their notifications went to that chat. A lane whose owner is Builder with no session working on it (no recent file changes) → start a fresh session (`start_session`, own worktree, `source_branch` = the lane's branch or main if merged, prompt `/next <lane>` or `/qa <mode>`). Say which lanes you resumed. Never disturb a lane that is writing files.
4. **Top of every reply: the lanes table** (`lane.sh table`: lane · item · stage · who acts · next), then what changed and what was merged, then at most three things needed from the founder, each with a recommendation. Decisions one at a time (skill grilling).

## Acting on a lane's Paste to Lead (arrives by itself from sessions the Lead started, or pasted by the founder)
* **CHALLENGE / PLAN:** answer every objection under "Lead response" (accept, or reject with the reason, as honest about your design as theirs); product choices go to the founder (skill grilling); when settled write "Agreed <date>". Build only on decisions the founder has agreed.
* **Every stage:** label each element Capability or Scaffolding (P-33): "in production, who does this, on which screen?"
* **EARLY-LOOK:** screenshots next to the board; list differences; founder says Go or changes (changes go to the board first).
* **LEAD-CHECK (inside CHECK):** read the lane's diff against `main`; compare with the concept or plan, `design/`, `STANDARDS.md`, `EXPERIENCE.md`; **rerun the suites on the lane's exact commit** in an isolated copy (Lead ports 4420–4429); verify the reviewer's journey evidence and spot-walk the main path (no second score); write `screens/<item>/lead-check.md`; hand back FIX or move on to DEMO/MERGE.
* **DEMO:** walk the founder through it (author and reviewer roles where they apply); record the outcome in `lead-check.md`; 5-line retro in `RETRO.md` (at most one workflow change); DONE or FIX.
* **MERGE (standing founder OK, 23 Oct):** after DONE, or a backend slice that passed the Lead check: `git merge --no-ff <branch>` in the main copy; on a conflict, abort and hand it back. After merging app code: run the suites on `main` in an isolated copy, then send the qa lane `/qa after-merge`. Report every merge to the founder. Restart :4400 only with the founder's OK.
* **Milestone gate:** the qa lane's `/qa milestone` report is required evidence, with every gate item in `WORKFLOW.md`.
* **qa reports:** assign each new bug to a lane (its next FIX pass, through that lane's Lead note); a Blocker or Critical stops that lane's next merge or DEMO; answer the tester's questions or put them to the founder; suggestions go through the scope test (P-26) before anything is scheduled.
* **CONCEPT:** skill screen-concept (the `screen-designer` agent may draft it); write `concept.md` on `main`, then set the lane's Lead note to DESIGN or PLAN.
* **Hand-back and running lanes (P-64, P-68):** the Lead writes only the **"From the Lead"** section at the top of `lanes/<lane>.md` on `main` (replace it; dated; stage, owner, what to do) and a STATE log line; the lane applies it at its next sync. Then continue its session (`SendMessage`: `/next <lane>`) or start a fresh one. The founder never has to type `/next`.
* Never edit app code or a lane's own files on its branch. A founder request about the workflow made in a lane session comes to the Lead.

## Fresh context (tell the founder; never wait for them to notice)
When the app has compacted this chat, or it has run for many long turns, say at the top of the reply: "Context is getting large: after this, open a new chat and type `/lead`; everything is saved." First commit `main` and make sure every lane's state is in its lane file.

## Before your last reply (required)
Update `LEAD.md` (open items + one session-log line; keep 10), `STATE.md` (`lane.sh state` regenerates the table; add a log line), `REQUESTS.md`, `DECISIONS.md`; republish the "Programme map" artifact when milestones, lanes or decisions changed. Run `bash P/tools/check-docs.sh` and `bash P/tools/decision-impact.sh` (every product decision has a capability or backlog row, P-74) and fix what they flag. Commit `main` (`lead: <summary>` + attribution line).
