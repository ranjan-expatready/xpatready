# Lanes — parallel work without collisions (P-64, P-67, P-68)

Several builders work at once, each in its own **git worktree** (a separate copy of the code on its own branch). The Lead works in the main copy, runs every lane session, checks every lane and merges finished work into `main`. State lives in files; every command checks it first.

## Who runs where
| Lane | Copy and branch | What it owns | Command | Ports · databases |
|---|---|---|---|---|
| **Lead** | main copy on `lead/*` (cloud: its session branch); every change to `main` by PR, merged by the Lead (P-87) | Concepts, decisions, requests, checks, merges, rules, skills, `STATE.md`, shared demo :4400 | `/lead` | 4420–4429 · `lead_*` |
| **screens** | own worktree | Milestone 2 screens, screen path (`WORKFLOW.md`) | `/next screens` | 4440–4449 · `screens_*` |
| **forms** | own worktree | PDF and online forms (P-61–P-66): intake, form versions, field and screen maps, answer lists, capture, extension | `/next forms` | 4450–4459 · `forms_*` |
| **evidence** | own worktree | Fills each real form and checks it in Adobe (P-46, P-65 fill trial); AI scoring set. Never app code | `/next evidence` | 4460–4469 · `evidence_*` |
| **runtime** | own worktree | Thin end-to-end slice (P-67); in M2, Screen 03 on the screen path (P-89); then M3 runtime: case, people, answers, renderer, agent view, fill from case facts | `/next runtime` | 4430–4439 · `runtime_*` |
| **qa** | own worktree, synced to `main` | Independent testing of `main`: `qa/` (capabilities, bugs, reports) and `prototype/studio/tests/qa/`. Never app code | `/qa <mode>` | 4470–4479 · `qa_*` |
| **scout** | own worktree `xpatready-scout` on `scout/<date>`, Mac; **Goose on Ollama Cloud**, not Claude Code (P-91) | Outside-in exploration against best-in-class practice: `scout/` (charters, findings, reports) and `prototype/studio/tests/scout/`; small fixes only (≤ 40 app lines, files no open lane branch touches; `tools/scout.sh scope` in the pre-push guard). Skill `.agents/skills/scout/`, recipe `.goose/recipes/scout.yaml` | founder: `tools/scout.sh open` (a session in Goose), `save`, or `tools/scout.sh [charter]` | 4480–4489 · `scout_*` |
**A lane runs on the Mac or in the cloud** — each an ordinary clone, pull at start (automatic: the session-start hook fast-forwards a clean copy), push at end; one session per lane at a time. The evidence lane and anything needing `sources/` or `code/` runs on the Mac (those folders are Mac-only, P-82).
**Where work can run, and why** (so nothing is started where it cannot finish):
| Work | Where | Why |
|---|---|---|
| Lead, screens, forms, runtime, qa | Cloud or Mac | They need only GitHub and their own app copy; the cloud Lead starts these sessions itself |
| Evidence: filling forms and reading them back (pypdf) | Cloud or Mac | The official blank PDFs are on GitHub (P-83) |
| Getting a new official form (IRCC or ESDC PDF) | Mac downloads, then everyone has it | canada.ca refuses cloud requests. The Mac downloads the form, records its checksum in `official-sources/*/manifest.json` and pushes a branch; the Lead merges it by PR (P-83, P-87). From then on cloud sessions and CI have it |
| Evidence: Adobe Reader Validate and the save round trip | **Mac only** | Adobe Reader is a desktop app; a cloud container cannot run it |
| Scout (Goose on Ollama Cloud) | **Mac only** | Goose, the Ollama key and the visible browser are on the Mac (P-91) |
| Reading the team's requirements (`sources/`) or code (`code/`) | **Mac only** | The team's own material stays off GitHub (P-82) |
| Live paid AI drafts (each spend approved by the founder) | **Mac only** (founder, 25 Oct: simple and proven; runs are rare) | The guarded route reads the key from a protected key file on the Mac. If paid runs become frequent: the founder adds `ANTHROPIC_API_KEY` as an environment secret, `cloud-setup.sh` writes the key file from it, and one test call proves it. Never paste a key into a chat |
| The shared demo on :4400 (restart, demo reset) | **Mac only** | P-88 |
| A Lead chat | Cloud or Mac, **one at a time** | Two Leads would overwrite each other (P-87); a lane may run beside either |
The cloud Lead can start only cloud sessions: work marked Mac only waits for the founder to open a Mac session (`/next evidence` in the evidence copy, `tools/scout.sh` for the scout). Whatever runs on the Mac reaches everyone the same way as cloud work: its own branch is pushed, and the Lead reviews and merges it by PR.
**The founder uses one chat: the Lead (`/lead`).** The Lead starts or continues each lane's session itself (prompt `/next <lane>` or `/qa <mode>`; on the Mac an own worktree, in the cloud a session on the lane's branch — skill `lead`), is told when a stage ends, checks it, and asks the founder only for decisions, walkthroughs, paid-AI go-aheads and installs. The founder may open a lane session to watch, or a qa session to test together (`/qa with-me`).
**Fresh context, any time:** state lives in files and commits, never in a chat. A long Lead chat → the Lead says so; open a new chat and type `/lead`. A lane session is disposable: the Lead starts a fresh one per stage when its context is long, cut from the lane's branch (or `main` once merged); `/next` binds the new copy.

## The one loop
1. A lane does **one stage**, commits on its branch, pushes the branch, updates `lanes/<lane>.md` below the Lead's section, ends with one **Paste to Lead** block.
2. The Lead checks it (on the exact commit), records, and writes the lane's **"From the Lead"** note on `main`: the only part of a lane file the Lead writes (top of the file, replaced each time, dated). The lane applies it at its next sync and logs "applied Lead note <date>".
3. Passed work is merged into `main` by the Lead (standing founder OK, 23 Oct; every merge reported). After merging app code the Lead sends `/qa after-merge`. Every lane syncs `main` at the start of its next stage.

## Guards every command runs first (no wrong step can do harm)
* `lane.sh whoami` says which copy this is; a command in the wrong copy prints the right command and stops.
* The lane file says who acts; if it is not this lane's builder, the command says who acts and stops.
* `lane.sh sync` merges `main` first; a conflict stops the stage and is reported. `lane.sh setup` links the main copy's tools when present and runs `npm ci` when packages are missing.
* The stop hook refuses a lane's changes to Lead-owned files (rules, skills, agents, settings, decisions, other lanes' files) and asks for a commit at the end of a stage.
* `lane.sh status` (every copy, uncommitted files, behind `main`) and `lane.sh table` (the lanes table) are the Lead's view; `lane.sh state` writes the table into `STATE.md`.

## Files: one writer each
| File | Written by |
|---|---|
| `STATE.md`, `LEAD.md`, `DECISIONS.md`, `REQUESTS.md`, rules files, `domain/`, `decisions/`, `tools/`, `.claude/`, `screens/<item>/concept.md`, `screens/<item>/lead-check.md`, the "From the Lead" note in each lane file | Lead, main copy |
| `lanes/<lane>.md` (below the Lead's note) | That lane |
| `screens/<item>/challenge.md`, `plan.md`, `build-notes.md`, screenshots, app code and tests | The lane that owns the item |
| `screens/<item>/review.md`, `break-report.md`, journey-test report | Reviewer and breaker agents launched by the lane |
| `screens/<item>/concept-draft.md`, `design/draft-*` | `screen-designer` agent, launched by the Lead |
| `qa/`, `prototype/studio/tests/qa/` | qa lane |
| `scout/`, `prototype/studio/tests/scout/`, and small fixes that pass `tools/scout.sh scope` | scout lane (Goose); the Lead triages its findings and merges its branch by PR |
| `prototype/evidence-lane/` | evidence lane |
A lane needing a rule, decision or concept change proposes it in its block; it never edits Lead files. A founder request about the workflow made in a lane session is passed to the Lead.

## Running the app in a lane
Each lane uses its own ports and database names (table above), never the shared demo (:4400, main copy only): `zsh prototype/studio/tools/isolated.sh <lane>_<name> <port> start`.

## Saving work
* A commit at the end of every stage on the lane branch (`<lane>: <stage> — <summary>` with the attribution line). The Lead commits `main` after recording.
* Push only your own branch at the end of a stage; never force-push. The push guard (`.githooks/pre-push`, CI) refuses excluded paths, PDFs, secrets and personal names (P-82).
* Never commit secrets, databases, logs or installed packages (`.gitignore`). Never commit, push or open pull requests in the team's repositories.
