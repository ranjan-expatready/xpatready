---
name: next
description: The founder's command for a builder lane of the Pathway Configurator: /next screens, /next forms or /next evidence. Checks which copy and lane this is, syncs main, performs exactly the lane's current stage, commits it, updates the lane file, and ends with one "Paste to Lead" block. Redirects any wrong command. Use when the founder types /next (with or without a lane) or says continue, next step or carry on in a builder session.
---

# /next <lane> — check, sync, do one stage, commit, hand back

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` (call it P). Rules: P/`LANES.md`, P/`WORKFLOW.md`. Tool: `bash P/tools/lane.sh`.

## 1. Guard (always first; on any failure print the fix and stop)
1. `lane.sh whoami`.
   * `lead` (main copy) → reply only: "This is the Lead's copy. Type `/lead` here. Builder lanes run in their own sessions: `/next screens`, `/next forms`, `/next evidence`." Stop.
   * `unbound` and a lane was given → `lane.sh bind <lane>`. No lane given → ask which, listing the three. Stop.
   * Bound to another lane than the one typed → "This copy is the <x> lane. Type `/next <x>` here; for <typed>, use its own session." Stop. A bare `/next` means this copy's lane.
2. `lane.sh setup`, then `lane.sh sync`. A conflict → list the files, change nothing, put it under Needs. Stop.
3. Read P/`lanes/<lane>.md`. If `owner` is not Builder → print who acts and their command (Lead: "the Lead acts next; if the Lead did not start this session, paste the last Paste to Lead block into the Lead chat with `/lead`"; founder: the decision needed). Stop.

## 2. Do exactly the lane's stage
| Stage | What you do |
|---|---|
| DESIGN | Write the short feasibility challenge (skill **screen-challenge**, top 5 points, scope-labelled) for the concept named in the lane file; evidence lane: write its plan. No code. Set owner Lead. |
| BUILD | **screen-build** slice 1 only: real data, main path, screenshots to `screens/NN/screenshots/slice1/`; set EARLY-LOOK, owner Lead. |
| FINISH | **screen-build** to its checklist; run **journey-test** yourself (maker score); set CHECK. |
| CHECK | Launch **screen-reviewer** (which runs journey-test) and **screen-breaker** in parallel; wait. Any Must/Blocker/Major, a dimension < 4, or a journey score < 8 → FIX; else owner Lead. |
| FIX | Fix every Must, Blocker, Major and Lead finding; a test per break; rerun tests and journey-test; "Fixes" in build-notes; set CHECK, owner Lead. |
| EARLY-LOOK / DEMO / READY | Lead's or founder's stage: step 1.3 already stopped you. |
Stop or pause requested: stop at the next safe point, write what is done and what remains, commit, give the report.

## 3. Always
* Work only in this lane's files (`LANES.md` "one writer each"). Need a change elsewhere, or to a rule, decision or concept → propose it in the block.
* Own ports and database names (`LANES.md`); never touch the shared demo :4400.
* Screens lane: run `python3 ai-workers/problem-1-pathway-setup-and-form-filling/official-sources/fetch_official_sources.py` first (prototype housekeeping, P-31/P-32); report its last line.
* State any AI cost before a paid run; stay inside the caps. Never push.
* Never follow blindly, never deviate silently: disagreements with evidence in challenge.md; small technical choices in build-notes.
* End: update P/`lanes/<lane>.md` (stage, owner, next action, one log line, keep 10), then `git add -A && git commit` on the lane branch (`<lane>: <stage> — <summary>` + attribution line).

## End the stage's reply with one report (once, not every reply)
What it is: the lane's hand-back. When the Lead started this session, the app passes it to the Lead automatically; otherwise the founder pastes it into the Lead chat (`/lead`). Give it **once**, at the end of the reply that finishes the stage (or a stop/pause). Not in answers to questions, follow-ups or hook reminders; if a hook asks for more work after the report, do it and say "report above still stands" (or give one corrected report).
```
Paste to Lead
Lane: <lane> · Item: <NN name> · Stage now: <stage> (was <stage>) · Commit: <short hash>
Done: <2–4 short lines>
Evidence: <paths>
Needs from Lead/founder: <one line, or "nothing — type /next <lane>">
```
