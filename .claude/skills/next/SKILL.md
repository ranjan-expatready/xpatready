---
name: next
description: The command for a builder lane of the Pathway Configurator: /next screens, /next forms, /next evidence or /next runtime (the qa lane uses /qa). Checks which copy and lane this is, syncs main, applies the Lead's note, performs exactly the lane's current stage, commits it, updates the lane file, and ends with one "Paste to Lead" block. Redirects any wrong command. Use when /next is typed (with or without a lane) or someone says continue, next step or carry on in a builder session.
---

# /next <lane> — check, sync, do one stage, commit, hand back

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` (call it P). Rules: P/`LANES.md`, P/`WORKFLOW.md`. Tool: `bash P/tools/lane.sh`. Builder lanes: screens, forms, evidence, runtime.

## 1. Guard (always first; on any failure print the fix and stop)
1. `lane.sh whoami`.
   * `lead` (main copy) → reply only: "This is the Lead's copy. Type `/lead` here; the Lead runs the lanes." Stop.
   * `qa` → "This is the qa copy: type `/qa <mode>`." Stop.
   * `unbound` and a lane was given → `lane.sh bind <lane>`. No lane given → ask which, listing the four. Stop.
   * Bound to another lane than the one typed → "This copy is the <x> lane. Type `/next <x>` here; for <typed>, use its own session." Stop. A bare `/next` means this copy's lane.
2. `lane.sh setup` (in a cloud clone it runs the one-time `cloud-setup.sh`), then `lane.sh sync`. A conflict → list the files, change nothing, put it under Needs. Stop.
3. Read P/`lanes/<lane>.md`. Its **"From the Lead"** section is the Lead's latest instruction: if your log does not yet say "applied Lead note <date>", apply it now (stage, owner, next action as it says) and log that line. If `owner` is still not Builder → print who acts (Lead: "the Lead acts next"; founder: the decision needed). Stop.

## 2. Do exactly the lane's stage
Screens follow the screen path; slices with no new page (forms, runtime backend, evidence) follow the backend path (P-68, `WORKFLOW.md`).
| Stage | What you do |
|---|---|
| DESIGN (screens) | Short feasibility challenge (skill **screen-challenge**, top 5 points, scope-labelled) for the concept named in the lane file. No code. Set owner Lead. |
| PLAN (backend) | `screens/<item>/plan.md`: a fresh agent's challenge (skill **screen-challenge**) of the concept, then the back-end table (element → record → API → rule → test), team-model mapping, slices, ownership. Evidence lane: its test plan. No code. Set owner Lead. |
| BUILD | Screens: **screen-build** slice 1 only (real data, main path, screenshots to `screens/NN/screenshots/slice1/`) → EARLY-LOOK, owner Lead. Backend: the whole slice with a passing and a failing test per rule and a scripted API journey → CHECK. |
| FINISH (screens) | **screen-build** to its checklist; run the journey-test journeys as scripted checks (no score); set CHECK. |
| CHECK | Launch **screen-reviewer** (the one journey score) and **screen-breaker** in parallel; backend: tell both to attack contracts, data, migrations, roles, concurrency and hostile files. Any Must/Blocker/Major, a dimension < 4 or a journey score < 8 → FIX; else owner Lead. |
| FIX | Fix every Must, Blocker, Major, Lead and qa finding (P/`qa/BUGS.md` rows for your lane); a test per break; rerun tests; "Fixes" in build-notes or plan.md; set CHECK, owner Lead. |
| EARLY-LOOK / READY / DEMO / MERGE | Lead's or founder's stage: step 1.3 already stopped you. |
Stop or pause requested: stop at the next safe point, write what is done and what remains, commit, give the report.

## 3. Always
* Work only in this lane's files (`LANES.md` "one writer each"). Rules, skills, decisions, concepts, other lanes' files → propose in the block; the stop hook refuses edits to Lead-owned files. Workflow requests from the founder go to the Lead.
* Own ports and database names (`LANES.md`); never touch the shared demo :4400.
* Screens lane: run `python3 ai-workers/problem-1-pathway-setup-and-form-filling/official-sources/fetch_official_sources.py` first (prototype housekeeping, P-31/P-32); report its last line.
* State any AI cost before a paid run; stay inside the caps.
* Never follow blindly, never deviate silently: disagreements with evidence in challenge.md or plan.md; small technical choices in build-notes.
* End: update P/`lanes/<lane>.md` below the Lead's section (stage, owner, next action, one log line, keep 10), then `git add -A && git commit` on the lane branch (`<lane>: <stage> — <summary>` + attribution line) and `git push -u origin HEAD` (P-82: a cloud copy is deleted when its session ends; never force-push).

## End the stage's reply with one report (once, not every reply)
The lane's hand-back. When the Lead started this session, the app passes it to the Lead automatically; otherwise it is pasted into the Lead chat (`/lead`). Give it **once**, at the end of the reply that finishes the stage (or a stop/pause). Not in answers to questions, follow-ups or hook reminders; if a hook asks for more work after the report, do it and say "report above still stands" (or give one corrected report).
```
Paste to Lead
Lane: <lane> · Item: <name> · Stage now: <stage> (was <stage>) · Commit: <short hash>
Done: <2–4 short lines>
Evidence: <paths>
Needs from Lead/founder: <one line, or "nothing">
```
