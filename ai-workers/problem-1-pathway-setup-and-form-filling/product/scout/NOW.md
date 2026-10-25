# Scout NOW — the handover card any new session reads first (P-91)

**New session? Read `AGENTS.md`, the scout skill (guard + section 0), this card, then `BRIEF.md`. Work only in `../xpatready-scout`, app `http://localhost:4480`. Never `main`, never `code/`, never `:4400`.**

## The exact prompt to paste in a new Goose session (copy from here)
> You are the scout, outside-in tester of the Pathway Configurator. Follow `.agents/skills/scout/SKILL.md` exactly: run the guard (`bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/lane.sh whoami` — must print `scout`), then read `scout/NOW.md` first, then the lane's "From the Lead" note, `scout/BRIEF.md`, `scout/CHARTERS.md`, `scout/FINDINGS.md`. Work only inside this copy (xpatready-scout); the app is http://localhost:4480; never `main`, never `code/`, never `:4400`, never push to main or open PRs. Task: `<charter or "continue from NOW.md" with me>`. End by updating `scout/NOW.md` and `lanes/scout.md`, and give the "Paste to Lead" block; tell the founder to run `tools/scout.sh save`.

## Where things stand (updated at the end of every session or run)
- 2026-10-25 · first session with the founder (skill 0b): brief agreed and written (`BRIEF.md`), charters re-ordered with the founder, setup review `reports/2026-10-25-setup-review.md`, smoke test done. Branch `scout/2026-10-25-1328`.
- Next: the founder runs `tools/scout.sh save`; the Lead answers the setup review. Next charter by brief order: `firm-admin-day-one`.

## How to resume
1. Mac, main copy: `bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/scout.sh open` (session in Goose) or `… <charter>` (unattended run), then `… save` afterwards.
2. In-session: guard `bash product/tools/lane.sh whoami` → must print `scout`; read the lane's "From the Lead" note, `BRIEF.md`, `CHARTERS.md`, `FINDINGS.md`; run the charter per the skill.
3. End of every session/run: update this card (stand + next), update `lanes/scout.md` below the Lead's note, commit on the scout branch, hand the Lead the Paste block.

## Open items for the Lead (from the setup review)
- See `reports/2026-10-25-setup-review.md` "Proposals the Lead answers" (P1–P7).
- Founder asked for a scout operating guide (parallel work, sessions, disagreements) — guidance given in session 25 Oct; summary lives in this card's "How to resume".
