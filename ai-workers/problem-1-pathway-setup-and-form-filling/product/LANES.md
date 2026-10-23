# Lanes — parallel work without collisions (P-64)

Several builders work at once, each in its own **git worktree** (a separate copy of the code on its own branch). The Lead works in the main copy, checks every lane and merges finished work into `main`. State lives in files; every command checks it first.

## Who runs where
| Lane | Copy and branch | What it owns | Founder command |
|---|---|---|---|
| **Lead** | main copy, `main` | Concepts, decisions, requests, checks, merges, `STATE.md`, shared demo :4400 | `/lead` |
| **screens** | own worktree and branch | Milestone 2 screens, one stage at a time (`WORKFLOW.md`) | `/next screens` |
| **forms** | own worktree and branch | PDF and online forms (P-61–P-63): intake, form versions, field and screen maps, filler, portal sheet | `/next forms` |
| **evidence** | own worktree and branch | Fills each real form and checks it in Adobe (P-46); AI scoring set from saved runs. Never app code | `/next evidence` |
**The founder uses one chat: the Lead (`/lead`).** The Lead starts or continues each lane's builder session itself (desktop app, the lane's own worktree, prompt `/next <lane>`), is told when a stage ends, checks it, and asks the founder only for decisions, walkthroughs, paid-AI go-aheads and merge OKs. Lane sessions show under the Lead chat; the founder may open one to watch, and may type `/next <lane>` there, which checks itself, but never has to.
**Fresh context, any time:** state lives in files and commits, never in a chat. A long Lead chat → open a new chat and type `/lead`; it reads the files and every lane copy (`lane.sh status`). A lane session is disposable: the Lead starts a fresh one per stage when its context is long, cut from the lane's branch.

## The one loop
1. A lane does **one stage**, commits on its branch, updates `product/lanes/<lane>.md`, ends with a **Paste to Lead** block naming the lane.
2. The Lead reads it (directly, or the founder pastes it into `/lead`), checks, records, and says the next command for each lane.
3. When a lane's work passes the Lead check, the Lead merges its branch into `main` (standing founder OK, 23 Oct; the Lead reports each merge). Every lane syncs `main` at the start of its next stage.

## Guards every command runs first (no wrong step can do harm)
* `product/tools/lane.sh whoami` says which copy this is. `/next` in the main copy, `/next forms` in the screens copy, or `/lead` in a lane copy does nothing and prints the right command and where to type it.
* The lane's file says who acts. If it is not this lane's builder, `/next` prints who acts and the command for them, and stops.
* `lane.sh sync` merges `main` first; a conflict stops the stage and is reported.
* `lane.sh setup` links the main copy's tools and installed packages (nothing is installed twice).

## Files: one writer each
| File | Written by |
|---|---|
| `STATE.md` (lanes overview), `LEAD.md`, `DECISIONS.md`, `REQUESTS.md`, rules files, `domain/`, `decisions/`, `screens/NN/concept.md`, `screens/NN/lead-check.md` | Lead, main copy |
| `product/lanes/<lane>.md` | That lane (stage, next action, log); the Lead adds hand-back lines on `main`, which the lane picks up at sync |
| `screens/NN/challenge.md`, `build-notes.md`, screenshots, app code and tests | The lane that owns the screen or module |
| `screens/NN/review.md`, `break-report.md` and the journey-test report | Reviewer, breaker and journey-test agents launched by the lane |
| `prototype/evidence-lane/` | evidence lane only |
A lane needing a rule, decision or concept change proposes it in its block; it never edits Lead files.

## Running the app in a lane
Each lane uses its own test database name and ports, never the shared demo (:4400, main copy only): Lead 4420–4429 · screens 4440–4449 · forms 4450–4459 · evidence 4460–4469. `zsh prototype/studio/tools/isolated.sh <lane>_<name> <port> start`.

## Saving work
* A commit at the end of every stage on the lane branch (message: `<lane>: <stage> — <summary>` with the attribution line). The Lead commits `main` after recording decisions.
* Never commit secrets, databases, logs or installed packages (`.gitignore`). Never commit, push or open pull requests in the team's repositories.
* GitHub (private repository, pull requests) is added when the founder approves it; until then pushing stays blocked.

## Founder's view
`/lead` shows every lane at the top of each reply (stage, who acts, last commit, behind `main`). Nothing else to track.
