# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-03 05:40 UTC by **Lead 5**, closing every Lead and lane for a **blank-sheet restart** (founder, P-289) · milestone: **M2 — Super Admin configuration** · how we work: `WAY-OF-WORKING.md` (frozen to 15 Nov, P-224) · decisions to read word for word: DECISIONS **P-280 … P-289** · the evidence: **`reports/build-review-2026-11-03.html`** (published privately to the founder)

## Start here (the next tech lead, fresh chat)
1. Open a new chat in the main copy and type `/lead`. Nothing is running: no Lead, no builder, no qa lane, no timed check. Leads 1–6 are retired (1, 2, 4, 6 archived 3 Nov 05:00–05:30 UTC; Lead 3 and Lead 5 archived last, see below). There is no standby; start one only if the founder wants the P-286 standby pattern again.
2. Read the build review first (`reports/build-review-2026-11-03.html`, sections 1, 7 and 8). Its lessons are marked by strength of evidence; change the way of working only with the founder's OK (P-224) and only on firm evidence (section 7's rule).
3. **The real score is 36/60, not 52/60.** An independent re-test on main `1a79dbf9` (3 Nov, US$0) re-ran every M2 acceptance pack: 12 rows scored Works fail their own pack, 4 have no runnable pack. Until those are fixed or re-scored, report M2 as "52 scored, 36 confirmed".
4. Agree the first rows with the founder before starting any builder (one fresh cloud builder per row, `/next <area> <row>`, as before). The proposal below is the tech lead's, not yet the founder's.

## Where we are (evidence, 3 Nov)
* **M2:** 52/60 on qa's scorecard (#646, #651); **36/60 confirmed** independently; 8 Partial agree with their packs. M3: C6.9 scored Works but its pack is 2/15; C6.12 scored Partial but its pack is green.
* **Flow:** product merges rose from 0.25 to about 4 an hour after 31 Oct (cloud builders + merge queue); approval-to-merge median about 1 hour and flat; about half of CI runs cancelled on 2 Nov; every product change runs the full ~27-minute suite twice (its PR and the queue batch).
* **Quality:** 0 open Blocker or Critical; 9 open Major (QA-144, 149, 152, 153, 154, 159, 162, 165, 176), 52 Minor. UX baseline 5.5/10 (2 Nov), not re-scored since UX-A parts 1–4. Golden journey last run 5/8 steps, before QA-163's fix.
* **Cost:** paid AI in the product US$48.83 all time (Mac ledger). Claude Code on this Mac at least US$3,002 at API list prices (accounts A, B, C; cloud builders not measured).
* **Open PR:** #417 (D3 pack-2 replay plan, paid, nothing run; predates #530, needs a refresh and a founder Go). Nothing else open.
* **Branches:** 39 branches differ from main; none holds substantial unmerged code (sorted in the report, section 9). Nothing pushed is lost: branches are never deleted.
* **Local copies:** `/Users/ranjansingh/Desktop/xpatready-devin` and `.claude/worktrees/demo-main` hold uncommitted AI-run outputs from 29–30 Oct; do not delete them. Audit runner logs: `archive/2026-11-03-build-review-audit-logs/`. Disk 21 GB free.

## Proposed first rows for the fresh start (tech lead's proposal; founder to agree)
1. **Make the scorecard honest:** a row counts as Works only when its acceptance pack is green on main and someone who did not score it re-ran it. qa re-scores the 12 rows to Partial or updates their packs.
2. **Fix the real defects the re-test found:** C3.2 bulk accept of non-High proposals and no batch Undo (P-121) · C1.5 copy route 404 · C4.6 child and representative signing, pen-signed PDF wording · C11.11 checklist forms counted as filed lines (known since 1 Nov) · C4.2 wording and unasked fact ticked · C3.8 non-fact Background question, missing-IMM 5707 error · C2.4 older edition shown as in the library · C3.15 rename accepted without a reason · M3 C6.9 override and Mark reviewed 404.
3. **Update packs left behind by later decisions:** C3.15 (P-266), C4.1 and C4.8 (P-279 source gate); write packs for C3.10, C5.2, C11.1, C11.17.
4. **C5.4 reachable from the Demo menu** (today only on an older sample loaded through the API).
5. **Triage two outside audits never followed up:** the outsider audit of 29 Oct (branch `claude/audit-outsider-0a5e67`, about 55 findings; top: 29 unchecked `@Body() b: any` write routes, cascade deletes on released work, no type check in CI) and Devin D5 of 1 Nov (branch `devin/2026-10-31-explorer`, 17 findings).
6. **Small leftovers:** QA-179 (each "Needs you" count names what it counts) · P-216 (3) "Ask it in…" on a questionnaire gap line (no row, no code) · attach the real-portal proof requirement (branch `goose/explore-2026-10-25`) to M4 L5 · decide the swallowed-waits rule for `/next` (branch `lead/2026-10-31-decisions`).
7. **Paid runs, each on the founder's Go with usual and worst cost first (Mac paid-runner session):** C3.4 (worst US$5.78) · C11.14 checker runs (about US$13 usual, US$49 worst; IMM 5532, 5710, 1294, 0008 exceed the US$5 job cap) · C11.7 field maps of 7 forms · C11.8 one live run · C9.1 after its builder row (brief `design/c91-ai-row-2026-11-02.md`).

## Proposed way-of-working changes (firm evidence in the report; need the founder's OK, P-224)
* One full test per product change, in the merge queue only (today it runs twice); stop records PRs from triggering full CI.
* Keep the tech lead's context small (it is 29% of local cost, 99% re-reads); hand over well before 250k.
* Measure cloud builders too: Claude Code OpenTelemetry (cost, tokens, tool results, active time) for every account.
* Cap open builder PRs to what review can merge within an hour; weekly 30-minute trend look, a 60-minute retrospective every two weeks; change the process only on the evidence rule in section 7 of the report.

## Holds (P-251, the product owner of SA-01B): nobody builds these
L-SA3 · L-SA6–L-SA11 · G5 (C5.1) · the P-236 rename · C11 · E1–E6 · design-only items · SH3/SH4 contracts go to the product owner with them · the AI "did you mean" in C11.3, C11.13, C3.6 (P-265, P-284).

## Waiting for the founder
1. **Archive Lead 3 last**, after about 07:00 UTC (its chat keeps the Mac awake until then). Archiving it also archives this chat (Lead 5), which it started in the same folder; nothing is left unsaved.
2. On claude.ai/code, archive the cloud lanes left over from Leads 1–4 (all idle; no open PR except #417's old lane).
3. **Send the SA-01B product owner** the reply drafted on the Mac (`archive/2026-11-02-founder-drafts/`), the SH3 contract (#509), the G-CORE concept (#504) and `design/note-to-sa01b-po-2026-11-02-sqr.md`: the only way G5 and the held parts unblock.
4. Tell the team they drop their "Fill this screen" (P-245), pending the product owner's ruling.
5. Agree the first rows and the way-of-working proposals above with the next tech lead.

## Founder asks of 3 Nov (P-228 (9))
**A57** a complete evidence report, lessons only where firm, then close every lane and retire every Lead, blank sheet, one hand-over: report published, lanes closed after in-flight PRs (P-289), Leads retired ✓ · **A58** every dimension (cost, quality, tokens, tool calls, stalls, blocks) across all accounts, and researched methodology: report sections 5, 6, 8 ✓ · **A59** retire Leads 1–6 one by one without losing work: 39 branches sorted, local copies checked, Leads 1, 2, 4, 6 archived; Lead 3 and 5 last ✓ · **A60** evidence, not assumption, independently audited: independent re-test, 36/60 ✓. Earlier asks (A3–A56): git history of this file.

## Lessons of 3 Nov
Our own scorecard overstated M2 by 16 rows: score on a green pack re-run by someone else · a capability pack must be updated with the decision that changes it · a chat's `cd` into a worktree moves its working folder: use absolute paths · `path` is a reserved variable in zsh (it is PATH): never use it in loops.
