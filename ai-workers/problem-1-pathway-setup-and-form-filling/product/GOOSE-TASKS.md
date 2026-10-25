# Mac tasks for Goose — the founder's hands on the Mac

Some work can only run on the founder's Mac (`LANES.md`, "Where work can run"): live paid AI, Adobe Reader, the :4400 demo, the scout. The founder does not have to do it by hand: the Lead writes a ready prompt here, the founder pastes it into Goose on the Mac, and Goose does the work and ends with a "Paste to Lead" block for the Lead chat. Pasting a task's prompt is the founder's go for what that task says (including its spend cap). The Lead adds, updates and closes tasks; newest open tasks first.

**How to start Goose for a task (Terminal on the Mac):** `cd` into the main xpatready copy, `git checkout main && git pull`, then `goose session`, and paste the prompt. Goose uses the founder's Ollama Cloud model; that costs nothing extra beyond the Ollama plan.

**Rules every task carries:** follow `AGENTS.md`. Never push to `main`, never force-push, never commit unless the task says so, never paste or print a key, never change rules, skills or docs. Stop and report instead of improvising when the screen does not match the task.

## Open tasks

### G2 · Scout run `ai-draft-review` — ready now (`firm-admin-day-one` done 25 Oct)
Easiest (the founder's ritual, `scout/NOW.md`): open Goose in the `xpatready-scout` folder and say *"Scout: run charter ai-draft-review"*; say "wrap up" at the end. Or, with no Goose window, one Terminal command in the main copy (about an hour; no paid Anthropic calls):
```
bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/scout.sh ai-draft-review
```
Either way it saves and pushes its own branch; paste its "Paste to Lead" block into the Lead chat.

### G1 · Live AI drafts of IMM 0008, IMM 5669 and IMM 5406 — approved 24 Oct, cap US$12 in total
Paste this into Goose:
```
You are helping the founder of the Pathway Configurator on their Mac. Read AGENTS.md and
ai-workers/problem-1-pathway-setup-and-form-filling/product/GOOSE-TASKS.md (task G1) first and follow them.
Goal: run one live AI field-map draft for each of IMM 0008, IMM 5669 and IMM 5406, one at a time, with a total
spend of at most US$12 (approved by the founder on 24 Oct). Do not accept, apply or reject any proposal: the
configuration author reviews them later.
1. In this copy: `git status --short` must be empty and `git log -1 --oneline` must equal origin/main. If not,
   stop and report.
2. Make sure the studio runs on http://localhost:4400 from this main: if it does not answer, or `git log` is newer
   than what it serves, run `zsh ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/start.sh`.
3. In the browser at http://localhost:4400 (take a screenshot at each step): find the form under the combination
   that uses it (Programs, then the combination, then Sources). If the form is not attached anywhere, stop and
   report with a screenshot; do not create programs, combinations or sources.
4. Press "Draft with AI", choose "Live AI call". Read the cost line (worst case, spent so far, left). If "The API
   key file is missing" shows, stop and report. If this run's worst case is more than what is left of the US$12
   for this task, stop and report. Otherwise press "Start live AI draft" and wait until AI work shows it finished.
5. Note the actual cost the AI work log shows for that run. Then the next form.
6. At the end: `git status --short` (do not commit anything), then end with exactly this block:
Paste to Lead
Task: G1 live drafts · Mac · main <short hash>
Per form: <form · run id · status · actual US$ · proposals count>
Total spent: US$<n> of 12 · Stopped early: <no, or why>
git status: <clean, or the files listed>
Screenshots: <folder>
```

## Coming next (the Lead adds the prompt when it is ready)
* **G3 · Screen 02 live runs** ("Describe it" and the AI checklist draft, one each): after the screens lane's Screen 02 merges, and only after the founder says yes to the spend.
* **G4 · Evidence: IMM 5476 in Adobe Reader** (the evidence lane's next step): Goose prepares and reads back the file; the founder presses Validate and Save in Adobe (about two minutes).

## Done
(none yet)
