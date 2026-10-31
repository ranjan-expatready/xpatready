# How we work (P-188, P-189; in force from 31 Oct)

This page replaces `WORKFLOW.md`, `LANES.md`, `CHARTER.md`, the Lead journal and the stage rules in the skills. Git history keeps every word of them, and a local copy is in `archive/2026-10-30-before-simplify/`. Why: `design/simplify-plan-2026-10-31.md` (our numbers) and `design/research-agent-teams-2026-10-31.md` (what proven teams do).

## Roles (one owner each)
| Role | Who | Owns | Does not |
|---|---|---|---|
| **Product owner** | the founder | direction, product choices, money, "this is right" at demos | technology, commands, checking by hand |
| **Tech lead** | one Lead chat, on the Mac (`/lead`) | backlog order, new-screen design with the founder, a quick check of every founder ask, keeping `main` working, talking to the founder | write app code, relay messages |
| **Builder · screens** | its own session (`/next screens`) | Super Admin screens: programs, structure, review, library | other areas' files |
| **Builder · forms and AI** | its own session (`/next forms`) | forms, finder, field maps, AI drafting, the spend guard | other areas' files |
| **Builder · runtime** | its own session (`/next runtime`) | cases, client answers, filling, checkpoint, sample data | other areas' files |
| **Reviewer** | a fresh agent (`screen-reviewer`, plus `screen-breaker` for new screens, money, permissions, migrations) | Approve or Block on each PR | build |
| **QA** | its own session (`/qa <mode>`) | tests `main` like a person; owns `qa/BUGS.md` and `qa/CAPABILITIES.md` | fix |
| **Evidence** | Mac session, when needed | official forms, Adobe checks, the team's material (`sources/`, `code/`) | — |
| **Outside check** | Devin, weekly | report-only findings into `inbox/` | write code |

Ports, so copies never clash: tech lead 4420–4429 · runtime 4430–4439 · screens 4440–4449 · forms 4450–4459 · qa 4470–4479. The demo is :4400 and is never used for tests.

## One piece of work, start to finish
1. **Backlog row** (`BACKLOG.md`): what, why, area, "Done when".
2. **A founder ask is checked first, in minutes:** does it fit the decisions and the agreed boards, and does it move another screen, area or later row? If it is clean, it is built. If not, the founder hears in one line what else it moves, with a recommendation.
3. **A new screen only:** a board, the founder's early look and Go, then build. Fixes and backend work skip this.
4. **Build** on a branch from `main`, **under a day, one area**. One ask about one screen = one PR touching only that screen. Bigger work is split into parts that each merge on their own; unfinished work merges switched off.
5. **Pull request:** what and why, checks and results, before and after screenshots for anything visible, the cost. The reviewer approves the current commit, and the builder adds the label `review: approved`.
6. **It merges by itself** on green CI plus that label (workflow `automerge`). The **demo updates itself** (workflow `demo-update`, data kept), with a what's-new list. QA tests `main` after merges.

## The rules (all of them)
1. `main` always works. A red check, a failed demo update or a qa Blocker is fixed before anything else.
2. Small changes reach `main` at least daily. Builders stay in their own area's files; a change to the database schema or `contracts/` says so in the PR's first line.
3. No merge without green CI and the reviewer's Approve on the current commit; a newer push needs a new approval. Builder test counts are claims; CI is the evidence. Every business rule has a passing and a failing test; check labels name the capability ids they prove.
4. Live AI is off on every copy; never set `*_LIVE=approved` and never click a priced button. A paid run needs the founder's Go with the cost stated first; every call goes through the spend ledger.
5. Immigration values come from official sources (page, quote, date) or the expert; anything else is labelled Sample, with a row in `ASSUMPTIONS.md` the same day. Legal points: "Unconfirmed: no counsel".
6. No personal names in files; roles only.
7. Never commit `sources/`, `code/`, `archive/`, PDFs, databases or secrets (the push guard enforces it).
8. New technology only with the founder's OK (`STANDARDS.md` §1), recorded in `ENVIRONMENT.md`.
9. One status page (`STATE.md`), rewritten, not appended. Git history is the archive: no word-for-word moves and no size limits on records. Instruction files stay short (skills and agents under 100 lines).
10. Product decisions go in `DECISIONS.md`, one line each. Workflow changes: at most one a week, after the numbers.

## Carried over from the Lead's watch list (still in force)
* **Reuse, never rebuild:** filling and barcodes (`prototype/p5/fill.py`, used by `studio/api/src/fill.ts`; `prototype/evidence-lane/E1/tools/`); before research on filling, document reading or AI drafting, start from `E1/*/STATUS.md`, `prototype/p1`–`p5`, `prototype/expected/source-text/`, `research_notes/`, `reports/`.
* **Capability or scaffolding** for every element (P-33); the scope test for every finding (P-26); no control cut (P-60). Build only on agreed decisions. Re-check an agreed but unbuilt screen against `main` before building it (R-109).
* **Demo story** (P-93, `DEMO.md`): a feature is done only when it shows in the story.
* **Disk:** below 10 GB free, remove finished copies whose work is pushed (`tools/disk.sh`); never the main copy, the demo copy, `.tools`, `sources/` or `code/`.
* **M3 starts** when the M2 baseline is merged and qa-tested, with no open Blocker or Critical, and the founder approves the final M3 designs.
* D17 and D20 need an intended user: the scores are never self-awarded.

## Where things live
`PRODUCT.md` (what we build) · `BACKLOG.md` (work, in order) · `STATE.md` (one page) · `DECISIONS.md` · `ASSUMPTIONS.md` · `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md` (the bar; full scoring at milestones) · `qa/BUGS.md`, `qa/CAPABILITIES.md` · `screens/<item>/` (board, plan, review) · `DEMO.md`, `STAND-INS.md` · `ENVIRONMENT.md`. The `lanes/` files are frozen, and they leave once the PRs that still edit them have merged.

## Numbers (on demand, kept current by the tech lead)
Capabilities working per milestone · PRs merged and their median time from start to merge · bugs found after merge · the tech lead's share of commits · AI spend. If bugs after merge rise, the part that caused it goes back.

## Founder's answers (30 Oct)
1. **Checks machine:** the Mac's runner runs CI (US$0); revisit if waits pass 30 minutes. Next step from the research: a fast check on each PR and the full set as the second gate.
2. **Demos:** on demand. The demo updates to `main` after every merge; early looks for new screens stay.
3. **Briefs:** on demand. The tech lead writes unasked only when a decision, a risk or a spend needs the founder.
