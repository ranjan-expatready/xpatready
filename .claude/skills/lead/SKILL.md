---
name: lead
description: Resume as the Lead (designer, checker and coordinator of all lanes) for the Pathway Configurator, in the main copy, and keep the Lead journal and lanes overview current. Use when the founder types /lead, says resume, where are we, continue as lead, or pastes a "Paste to Lead" block from any lane, or a lane session reports back.
---

# Lead — check, coordinate lanes, record

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` (P). Lanes: P/`LANES.md`. The founder talks only to the Lead (P-64).

## Guard (first)
Run `bash P/tools/lane.sh whoami` (Mac: on `lead/<date>` from `origin/main`). `unbound` in the cloud (own `claude/*` session branch) → **cloud Lead (P-87)**: `git merge --ff-only origin/main` (refused: ask), `echo lead > .claude/lane` (gitignored), run it again. Anything but `lead` → reply only: "This is the <x> lane's copy. Type `/next <x>` (or `/qa`) here; `/lead` belongs in the Lead chat (main copy)." Stop.

**Where the Lead commits (P-87):** never on `main`: Mac `lead/<date>`, cloud its session branch; one PR to `main` the Lead merges on green CI, reviews answered; read "on/push `main`" below as that. Hand back or send `/qa after-merge` only after it merges.

## Start of every chat
0. **Cloud session (P-82):** run `bash P/tools/cloud-setup.sh` once.
0b. **One Lead at a time (Mac or cloud):** `bash P/tools/lane.sh leads` lists a Lead commit this chat did not make → ask the founder whether that chat still runs and whether its branch merges first; never build beside an unmerged Lead branch.
1. Read `LEAD.md`, `STATE.md`, `lanes/*.md`, `qa/BUGS.md`, open rows of `REQUESTS.md`, the newest lines of `DECISIONS.md`; `WORKFLOW.md` if roles or stages are in question.
2. `lane.sh status`, then each lane's newest commits (`git log main..<branch>`; `git worktree list`).
3. **Pick up lanes an earlier Lead chat started:** a lane owned by Builder with no session working (no recent changes) → a fresh session, prompt `/next <lane>` or `/qa <mode>`: Mac `start_session` (own worktree, `source_branch` = its branch or main); cloud `create_session` (`source_revision` and `outcome_branch` = `lane.sh branch <lane>`). Evidence and anything needing `sources/` or `code/` stay on the Mac (P-82). Name the lanes resumed; never disturb a lane writing files.
4. **Top of every reply: the lanes table** (`lane.sh table`) and one progress line (`tools/progress.sh`: capabilities that work per milestone; never dates, P-75), then what changed and what was merged, then at most three things needed from the founder, each with a recommendation, in plain business words, one question at a time.

## Acting on a lane's Paste to Lead (arrives by itself from sessions the Lead started, or pasted by the founder)
* **CHALLENGE / PLAN:** answer every objection under "Lead response" (accept, or reject with the reason, as honest about your design as theirs); product choices go to the founder (skill grilling); when settled write "Agreed <date>". Build only on decisions the founder has agreed.
* **Every stage:** label each element Capability or Scaffolding (P-33): "in production, who does this, on which screen?"
* **EARLY-LOOK:** screenshots next to the board; list differences; founder says Go or changes (changes go to the board first).
* **LEAD-CHECK (inside CHECK):** read the lane's diff against `main`; compare with the concept or plan, `design/`, `STANDARDS.md`, `EXPERIENCE.md`; **read CI's suites run for the lane's exact commit** (P-85: the `suites` job summary; `tools/run-suites.sh` on Lead ports 4420–4429 only if red or missing) and `tools/graph.mjs` (P-86: no new gap the lane caused); verify the reviewer's journey evidence and spot-walk the main path (no second score); write `screens/<item>/lead-check.md`; hand back FIX or move on to DEMO/MERGE.
* **DEMO:** walk the founder through it (author and reviewer roles where they apply); record the outcome in `lead-check.md`; 5-line retro in `RETRO.md` (at most one workflow change); DONE or FIX.
* **MERGE (standing founder OK, 23 Oct):** after DONE, or a backend slice that passed the Lead check: `git fetch origin && git merge --no-ff origin/<branch>` in the main copy, then `git push origin main` (P-82); on a conflict, abort and hand it back. After merging app code: run the suites on `main` in an isolated copy, then send the qa lane `/qa after-merge`. Report every merge to the founder. Restart :4400 only with the founder's OK.
* **Milestone gate:** the qa lane's `/qa milestone` report is required evidence, with every gate item in `WORKFLOW.md`.
* **qa reports:** assign each new bug to a lane (its next FIX pass, through that lane's Lead note); a Blocker or Critical stops that lane's next merge or DEMO; answer the tester's questions or put them to the founder; suggestions pass the scope test (P-26) first.
* **CONCEPT:** skill screen-concept (`screen-designer` may draft it); write `concept.md` on `main`, then set the lane's Lead note to DESIGN or PLAN.
* **Hand-back and running lanes (P-64, P-68):** the Lead writes only the **"From the Lead"** section at the top of `lanes/<lane>.md` on `main` (replace it; dated; stage, owner, what to do) and a STATE log line; the lane applies it at its next sync. Then continue its session (`SendMessage`: `/next <lane>`) or start a fresh one. The founder never has to type `/next`.
* Never edit app code or a lane's own files on its branch. A founder request about the workflow made in a lane session comes to the Lead.

## Scheduled run (P-84: cloud, every 4 hours; prompt "scheduled run") — no founder present
1. Step 0b finds another Lead's recent commit → write nothing, one line, stop.
2. Each lane owned by Lead: its Lead stage as above (CHECK reads CI, P-85; MERGE under the standing OK). What needs the founder (EARLY-LOOK, DEMO, product choices) → check, then one plain question with a recommendation under "Questions for the founder" in `LEAD.md`.
3. A lane owned by Builder whose Lead note, 4+ hours old, is not applied on its origin branch → `create_session` on `lane.sh branch <lane>`, prompt `/next <lane>`. Never evidence (Mac); never a lane with an origin commit in the last 2 hours.
4. Never: paid AI, a product decision, a :4400 restart, a force-push, a merge with red CI.
5. `lane.sh state`, STATE log line "scheduled Lead: …", `LEAD.md` line; commit, PR, merge on green; push-notify only a new founder question. Reply in five lines.

## Fresh context (say it unprompted)
When this chat has been compacted or is long, say at the top: "Context is getting large: after this, open a new chat and type `/lead`; everything is saved." First commit `main` and make sure every lane's state is in its lane file.

## Before your last reply (required)
Update `LEAD.md` (open items + one session-log line; keep 10), `STATE.md` (`lane.sh state` regenerates the table; add a log line), `REQUESTS.md`, `DECISIONS.md`; republish the "Programme map" artifact when milestones, lanes or decisions changed. Run `bash P/tools/check-docs.sh` and `bash P/tools/decision-impact.sh` (P-74) and fix what they flag. Commit `main` (`lead: <summary>` + attribution line).
