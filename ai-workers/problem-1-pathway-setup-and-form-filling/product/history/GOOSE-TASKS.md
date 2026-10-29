# Mac tasks for Goose — the founder's hands on the Mac

**Retired 29 Oct (P-146).** Goose is retired; this file is history. Mac-only work now goes to a Claude Code session on the Mac.

Some work can only run on the founder's Mac (`LANES.md`, "Where work can run"): live paid AI, Adobe Reader, the :4400 demo, the scout. The founder does not have to do it by hand: the Lead writes a ready prompt here, the founder pastes it into Goose on the Mac, and Goose does the work and ends with a "Paste to Lead" block for the Lead chat. Pasting a task's prompt is the founder's go for what that task says (including its spend cap). The Lead adds, updates and closes tasks; newest open tasks first.

**How to start Goose for a task (Terminal on the Mac):** `cd` into the main xpatready copy, `git checkout main && git pull`, then `goose session`, and paste the prompt. Goose uses the founder's Ollama Cloud model; that costs nothing extra beyond the Ollama plan.

**Rules every task carries:** follow `AGENTS.md`. Never push to `main`, never force-push, never commit unless the task says so, never paste or print a key, never change rules, skills or docs. Stop and report instead of improvising when the screen does not match the task.

## Open tasks

### G3 · Real APR screens captured with the extension (the founder, by hand) — READY since 26 Oct (Pass B and the build-folder fix merged; P-98): step 1 now, send the Lead the host
The founder holds an APR account (P-98). This one is done by the founder's own hands, not by Goose: only the founder signs in to the APR Portal, and nobody else ever sees the password. The Lead says "G3 is ready" when the forms lane's APR pass is merged and :4400 runs it (restart with the founder's OK).
1. **Before anything:** sign in to the APR Portal yourself in Chrome. Check that a new **visitor visa** and a new **work permit** application can be started there. If not, stop and tell the Lead (P-98 assumes both are filed through APR). Copy only the **address host** of the application screens from the address bar (for example `something.cic.gc.ca`) and paste it to the Lead; the Lead puts it in the build command below.
2. **Rules for the session:** start a **new blank application**, never a client's. Type only made-up Sample answers when the portal needs one to move to the next screen. Never submit, pay or sign. Delete the draft afterwards if the portal allows it. The extension reads only the structure (labels, types, options, required flags) and refuses any screen showing an answer, so capture each screen **as soon as it opens, before typing**. (Unconfirmed: no counsel; IRCC's terms on this are unread.)
3. The Lead gives you the exact steps from `screens/F2-extension/build-notes.md` §"Founder capture": build the development extension for that host, load it in Chrome (Extensions → Developer mode → Load unpacked), open http://localhost:4400 → Browser extension → "Get a code" (capture), and connect the side panel with the code.
4. In the side panel: Capture → start (APR Portal, the form, the application type). On each screen: "Capture this screen", read "Check before sending" (if any text shows a person's details, do not send; tell the Lead), then go on with the portal's own Next. At the end: "Finish capture". It waits for a second person.
5. Paste to the Lead: the host, the application types, how many screens captured, anything refused or odd (a screenshot is fine if it shows no personal details).

### G2 · Scout run `ai-draft-review` — ready now (`firm-admin-day-one` done 25 Oct)
Easiest (the founder's ritual, `scout/NOW.md`): open Goose in the `xpatready-scout` folder and say *"Scout: run charter ai-draft-review"*; say "wrap up" at the end. Or, with no Goose window, one Terminal command in the main copy (about an hour; no paid Anthropic calls):
```
bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/scout.sh ai-draft-review
```
Either way it saves and pushes its own branch; paste its "Paste to Lead" block into the Lead chat.

### G1 · Live AI drafts of IMM 0008, IMM 5669 and IMM 5406 — approved 24 Oct, cap US$12 in total — ON HOLD (P-98: PR Portal forms are outside the APR proof of concept; run only if the founder asks)
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
