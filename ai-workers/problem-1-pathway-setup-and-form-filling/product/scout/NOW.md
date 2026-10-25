# Scout NOW — the handover card any new session reads first (P-91)

**New session? Read `AGENTS.md`, the scout skill (guard + section 0), this card, then `BRIEF.md`. Work only in `../xpatready-scout`, app `http://localhost:4480`. Never `main`, never `code/`, never `:4400`.**

## The exact prompt to paste in a new Goose session (copy from here)
> You are the scout, outside-in tester of the Pathway Configurator. Follow `.agents/skills/scout/SKILL.md` exactly: run the guard (`bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/lane.sh whoami` — must print `scout`), then read `scout/NOW.md` first, then the lane's "From the Lead" note, `scout/BRIEF.md`, `scout/CHARTERS.md`, `scout/FINDINGS.md`. Work only inside this copy (xpatready-scout); the app is http://localhost:4480; never `main`, never `code/`, never `:4400`, never push to main or open PRs. Task: `<charter or "continue from NOW.md" with me>`. First run `bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/scout.sh open` yourself (refreshes this copy, starts the app). If you have no browser tools (`browser_take_screenshot`), stop and tell the founder to do the one-time setup in `scout/NOW.md`. When the founder says "wrap up": update `scout/NOW.md` and `lanes/scout.md`, commit your files, run `bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/scout.sh save` yourself, and give the "Paste to Lead" block.

## Where things stand (updated at the end of every session or run)
- 2026-10-25 · **charter `firm-admin-day-one` done** (this session, run by the scout at the founder's go): report `reports/2026-10-25-firm-admin-day-one.md`, 5 findings (1 Major · 3 Minor · 1 Idea, priorities P2/P3), SC-2 fix written and proven then reverted (file busy on screens — the scope guard did its job; ready patch in the report), failing checks kept for SC-2 + SC-4. Branch `scout/2026-10-25-1328`, saved and pushed.
- 2026-10-25 · first session with the founder (skill 0b): brief agreed and written (`BRIEF.md`), charters re-ordered with the founder, setup review `reports/2026-10-25-setup-review.md`, smoke test done.
- 2026-10-25 · founder added a standing lens to the brief: **AI everywhere it helps** (draft setup, find duplicates, flag constraints — the person decides); every run now asks "would best-in-class AI do this step, and does the product offer it?". Recorded in `BRIEF.md`.
- 2026-10-25 · founder's decision flow in the brief: confident researched items go to the founder (one decision, visual, recommendation first); founder confirms; scout does it inside fix limits, else the Lead builds with the founder's decision made.
- 2026-10-25 · **SC-1 corrected after the founder's challenge** — AI/library model proven sound at US$0 (report addendum); SC-1 downgraded to Minor "first-run words never explain the source-driven model"; one-line empty-state copy proposed to the founder, waiting for his yes; then scout applies it (programs.tsx is free).
- Next: the Lead triages SC-1/3/4/5 (and the setup review P1–P7, still open). Next charter by brief order: **`release-review`** (needs a released combination — run after the Lead's read, or on sample data).
## The founder's ritual (the only thing to remember — agreed 25 Oct)
0. **Once only:** give Goose the browser tools. Goose Desktop: Extensions → Add custom extension → type Command-line (STDIO), command `npx -y @playwright/mcp@0.0.83 --isolated --caps vision`. Terminal: `goose configure` → Add Extension → Command-line Extension, same command. From then on every Goose session has them.
1. Open **Goose** (Desktop app or terminal) **in the folder `xpatready-scout` (next to the main xpatready copy, e.g. on the Desktop)** — nothing else.
2. Say one sentence, e.g. *"Scout: run charter firm-admin-day-one"* or *"Scout: continue from NOW.md with me."*
3. The scout itself does everything with its tools (`scout.sh` machinery): refreshes its copy from GitHub, starts the app on :4480, runs the charter, and **when the founder says "wrap up"** commits, stops the app and pushes. No terminal commands from the founder, no copying folders, no scripts to learn.
Honest limits: **one scout session at a time** (files are shared state; the save guard blocks a second); a run with **no Goose window open at all** still needs the one terminal command `scout.sh <charter>` — ask the Lead about a scheduler if even that should go.

## How to resume (mechanics, for the agent)
1. In a session (the ritual): run `bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/scout.sh open` yourself first, and `… save` yourself on "wrap up". Unattended (no Goose window): the founder runs `… scout.sh <charter>` in the main copy; it saves and pushes by itself.
2. In-session: guard `bash product/tools/lane.sh whoami` → must print `scout`; read the lane's "From the Lead" note, `BRIEF.md`, `CHARTERS.md`, `FINDINGS.md`; run the charter per the skill.
3. End of every session/run: update this card (stand + next), update `lanes/scout.md` below the Lead's note, commit on the scout branch, hand the Lead the Paste block.

## Open items for the Lead (from the setup review)
- None open: P1–P8 answered by the Lead on 25 Oct (end of `reports/2026-10-25-setup-review.md`).
- Founder asked for a scout operating guide (parallel work, sessions, disagreements) — guidance given in session 25 Oct; summary lives in this card's "How to resume".
