---
name: next
description: The founder's one command for the Pathway Configurator build. Performs exactly the current stage in STATE.md for the current screen (build slice, finish, check, fix), updates state, and ends with a "Paste to Lead" block. Use when the founder types /next or says continue, next step or carry on.
---

# /next — do one stage, then hand back

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/`. Read `STATE.md`, then `WORKFLOW.md` (stages and exit rules). Read other files only when the stage needs them.

| Stage in STATE.md | What you do |
|---|---|
| DESIGN / READY / EARLY-LOOK / DEMO | Lead's or founder's stage. Do not code. For DESIGN, if the Lead asks, write the short feasibility challenge (skill **screen-challenge**, top 5 points, against the board in `product/design/`). Print the block. Stop. |
| BUILD | Run **screen-build** slice 1 only: the screen on real data, main path, matching the board; screenshots to `screens/NN/screenshots/slice1/`; set EARLY-LOOK; print the block with the screenshot paths. Stop. |
| FINISH | Continue **screen-build** to its checklist; set CHECK. |
| CHECK | Launch agents **screen-reviewer** and **screen-breaker** in parallel; wait. Any Must/Blocker/Major or a dimension < 4 → FIX, else print the block for the Lead check. |
| FIX | Fix every Must, Blocker and Major (and Lead findings); a test per break; rerun tests and screenshots; append "Fixes" to build-notes; set CHECK. |
| any stage | If the founder or Lead says stop: pause at the next safe point, write what is done and what remains in build-notes, print the block. |

## Always
* **First, every /next:** run `python3 ai-workers/problem-1-pathway-setup-and-form-filling/official-sources/fetch_official_sources.py`. Prototype housekeeping only (P-32: in the product a person uploads forms): it downloads any official form or checklist still pending in a manifest and keeps it only if its SHA-256 matches (P-31); it prints "nothing pending" when all are present. Put its last line under Done; any FAIL goes under Needs.
* **Never follow blindly, never deviate silently** — disagreement goes in challenge.md with evidence; small technical choices go in build-notes.
* Check your own work against the stage's checklist before saying it is done; report honestly what you could not do.
* Update `STATE.md` (stage, owner, next action, one log line; keep the last 10) and the Stage column of `SCREENS.md`. Log any founder request in `REQUESTS.md`.
* Never edit rules files (`PRODUCT.md`, `WORKFLOW.md`, `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`, `DECISIONS.md`, `domain/`) — propose changes in the block instead.
* State the cost before any paid AI run; stay inside the caps. Never commit or push.

## End every reply with
```
Paste to Lead
Screen: <NN name> · Stage now: <stage> (was <stage>)
Done: <2–4 short lines>
Evidence: <paths>
Needs from Lead/founder: <one line, or "nothing — type /next">
```
