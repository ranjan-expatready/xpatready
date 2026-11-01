# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-01 13:45 UTC (Lead handover at 48% context) · milestone: **M2 — Super Admin configuration**, plus the Visitor visa M3 path (P-220) · plan: `design/delivery-plan-2026-11-01.md` · who owns what: `TEAM.md` · work list: `BACKLOG.md`

## Goals (P-202, reset by P-220)
* **Today (1 Nov):** M2 built and queued; Visitor visa set up end to end on the demo; Day-0 acceptance packs merged.
* **This week:** M2 done for all six combinations (target 6 Nov); Visitor visa case to application ready (target 5 Nov).
* **3 Nov:** verdict on the GitHub shard trial (P-213) and measured swarm numbers against the plan's targets.

## Resume here (a fresh `/lead` chat)
1. **Watches first (founder 1 Nov):** 4-minute idle sweep (`ListAgents`; idle without Handover → exact next step; Handover → replacement card); 20-minute check (merges, queue, red, demo, usage %); 90-second alarm (merges, "Question for the tech lead", Handover, Blocker, migration, red main, demo down); PR alarm (red check, dequeued); Mac alarm (memory under 15% or load over 40); 2-hourly ops review on a cheap model writing the ops lessons file (product, ops folder, created on its first run).
2. **Starting sessions:** the founder works over Remote Control, so the app lets the Lead start sessions only on a message typed in the desktop app; otherwise the Lead proposes cards. Ask the founder once to type "start all waiting builder cards" in the desktop app.
3. **Cards waiting for the founder (replacements for builders that handed over):** Forms builder 3 (label #277, then C3.4, C3.6, C11.13, C11.14) · Swarm B1b (C3.12 with a migration, C11.1) · Screens builder 7 (resolve #281's code conflict first, then C11.16, C11.10, C11.3, C11.12) · Swarm B4b (C4.11) · Swarm M3-A2 (C11.5, then the case) · Swarm B5b (C11.9, C3.15) · Swarm B3b (C4.5, C4.4) · Runtime builder 3 (X9 #300, #116, built files C10.1, C3.11, C11.7).
4. **Running now:** Swarm B2 (#291 C3.1, then C3.3, C11.8 incl. job.tsx m2 one-liner, C9.1) · Swarm M3-B (#283 C6.12 approved; C6.4 built locally, opens after #283 merges; then C11.6) · Flaky-checks fixer (P-214) · qa-2 (after-merge rounds; re-score C10.1, C11.7, C1.5) · Day-0 packs on the Mac (#295 pack 3 awaiting its fixes for the Lead's answers, #298 pack 2, #296 pack 4, pack 1 still finishing).
5. **Old sessions for the founder to archive:** every session with a Handover comment (QA after-merge 6b424941, both old Screens builders, both old Forms builders, both old Runtime builders, Swarm B1, B3, B4, B5, M3-A, qa first session).

## The three open risks
1. **Credits:** weekly plan 48% used at 13:40 UTC, about 5–7 points an hour with the swarm; extra usage still OFF. Ask the founder; if it stays off, cut to about 6 builders.
2. **Mac check line:** each builder PR's own `ci` runs on the one Mac runner (`xr-mac`); 6–7 PRs wait in line, and a cloud builder can push to only one branch, so it cannot open its next PR until the first merges. Founder decision pending: move PR `ci` to GitHub Linux (about US$1 a day, estimate, inside the US$30 trial cap).
3. **Builders burn context in about an hour** (60–80%), so lanes stop often; replacements wait on the founder's clicks (risk 2 of "Starting sessions").

## Progress (`tools/progress.sh`, 13:45 UTC)
* M2: 25 of 56 work · 2 built, awaiting qa · 25 partial · 4 not built. R1: 6 of 8. M3: 0 of 16 (Visitor visa path in flight: C6.11 #288, C6.12 #283, C6.4 built).
* Merged since 11:40: #269, #271, #272, #273, #275, #278, #113, #287 (plus the queue batch in flight: #285, #294, #284, #292, #288, #289, #290, #280).

## Decisions today (in `DECISIONS.md`)
P-219 (capability IDs per PR, re-score what merges) · P-220 (tests first, swarm, Visitor visa first) · P-221 (`qa/built/<ID>.md`, never edit `qa/CAPABILITIES.md` in builder PRs). Not yet a row (record next): the name-free requirements copy on GitHub (`domain/requirements-2026-10-19/`, #290; AGENTS rule 3; founder 1 Nov) and Merge Protections switched on in Mergify (approved PRs queue themselves, 1 Nov).

## Lessons today
* Approved PRs never queued themselves until Merge Protections was on; every earlier merge was a typed command.
* A shared scoreboard edited by every PR collides; one file per item (P-221).
* Check a new suite on Linux before it joins the batch (#113's speed check broke a batch).
* Migration folders need distinct timestamps; read every migration again when it changes.
