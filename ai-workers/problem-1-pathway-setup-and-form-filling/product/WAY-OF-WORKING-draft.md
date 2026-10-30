# How we work — approved by the founder 30 Oct (P-188); in force after the switch-over

At the switch-over it replaces `WORKFLOW.md`, `LANES.md`, `CHARTER.md` and the stage rules in the skills; those move intact to `archive/2026-10-30-before-simplify/` (git keeps every word).

**Why:** in 10 days the rules and records grew as large as the app (≈77k lines each). The Lead made 40% of all commits, and builders wait on one overloaded Mac, one merge gate and 50-minute test runs. A proof of concept needs a small team with clear owners, small changes and fast checks: how a good product team at a large tech company works.

## Roles (one owner each)
| Role | Who | Owns | Does not |
|---|---|---|---|
| **Product owner** | the founder | direction, product choices, money, saying "this is right" at demos | technology, commands, checking work by hand |
| **Tech lead** | one Lead chat (Mac) | the backlog order, design of new screens, merging, keeping `main` working, talking to the founder | write app code |
| **Builder · screens** | cloud session | Super Admin screens (programs, structure, review, library) | other areas' files |
| **Builder · forms and AI** | cloud session | forms, finder, field maps, AI drafting, the spend guard | other areas' files |
| **Builder · runtime** | cloud session | cases, client answers, filling, checkpoint | other areas' files |
| **Reviewer** | fresh agent on every change | approves or blocks the change against its acceptance checks | build |
| **QA** | cloud session | tests `main` like a person after merges; owns the bug list and capability list | fix |
| **Evidence** | Mac session, when needed | official forms, Adobe checks, the team's material | — |
| **Outside check** | Devin, weekly | report-only findings into the inbox | write code |

## One piece of work, start to finish
1. **Backlog item** (`BACKLOG.md`): what, why, owner area, acceptance checks written first.
2. **New screen only:** a design board, the founder's OK, then build. Fixes and backend work skip this.
3. **Build** on a branch from `main`, **under one day of work**; a bigger item is split first.
4. **Pull request:** checks green on a cloud machine (affected tests + quick set; the full set on the merge result), and the reviewer agent approves.
5. **Tech lead merges.** QA tests `main` after each merge; the demo app is updated to `main` and the founder looks on demand.

## The rules (all of them)
1. `main` always works. A red `main` is fixed before anything else.
2. Small changes: under a day, one area. Builders stay in their own area's files; shared files (database schema, contracts) go through the tech lead.
3. No merge without green checks and the reviewer's approval. Builder test counts are claims; the checks are the evidence.
4. Live AI is off on every copy. Any paid run needs the founder's OK with the cost stated first.
5. Immigration values come from official sources (page, quote, date) or the expert; anything else is labelled Sample. Legal points: "Unconfirmed: no counsel".
6. No personal names in files; roles only.
7. Never commit `sources/`, `code/`, `archive/`, PDFs, databases or secrets (the push guard enforces it).
8. New technology only with the founder's OK.
9. One status page (`STATE.md`), rewritten, not appended. Git history is the archive: no word-for-word moves.
10. Product decisions only in `DECISIONS.md`, one line each. Workflow changes: at most one a week, after the weekly numbers.

## What we keep, what we stop
**Keep:** design before build for new screens · independent reviewer and Devin (they find real bugs) · the push guard, merge guard and live-AI-off guard (code, not paperwork) · official-source citations · the bug list and capability list.
**Stop:** lane files with handover sections and "Paste to Lead" blocks (the pull request says what changed) · six stages for every item · a score out of 10 on 20 dimensions for every change (the reviewer approves or blocks; a full score only at a milestone) · word-for-word history moves and size limits on records · P-numbers for workflow choices · the 7-item platform build before moving.

## Where things live
`PRODUCT.md` (what we build) · `BACKLOG.md` (work, in order) · `STATE.md` (one page) · `DECISIONS.md` · `ASSUMPTIONS.md` · `STANDARDS.md` (engineering and design bar) · `qa/BUGS.md`, `qa/CAPABILITIES.md` · `screens/<item>/` (board, plan, review) · `ENVIRONMENT.md` (installed tools). Everything else goes to the archive.

## Numbers (on demand, kept current by the Lead)
Capabilities working per milestone · changes merged and their median time from start to merge · bugs found after merge · AI spend · one workflow change, if any.

## Switch-over (1–2 days)
1. Finish and merge what is in flight: screens card (#108), forms line (closes #103), runtime, the live-AI-off hotfix.
2. Three small fixes so cloud builders work: tests never write the real spend ledger; the merge guard stops blocking ordinary commands; a cloud session never acts as tech lead.
3. Archive the old rules, slim the skills to this page, start three cloud builders and QA from `main`.
4. One small item goes through end to end as the dry run; then this page is in force.

## Founder's answers (30 Oct)
1. **Checks machine:** cloud sessions run the merge check (US$0, ≈45 min full set); revisit if waits pass 30 minutes.
2. **Demos:** on demand. The demo app (:4400) is updated to `main` after every merge, with a short "what's new" line; the founder looks whenever they choose. Early looks for new screens stay.
3. **Briefs:** on demand, when the founder asks. The Lead writes unasked only when a decision, a risk or a spend needs the founder.
