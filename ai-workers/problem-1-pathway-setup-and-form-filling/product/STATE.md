# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-01 16:35 UTC (Lead close-out at 65% context, founder's ask) · milestone: **M2 — Super Admin configuration**, plus the Visitor visa M3 path (P-220) · plan: `design/delivery-plan-2026-11-01.md` · who owns what: `TEAM.md` · lessons: the ops folder

## Status at close-out (from `qa/CAPABILITIES.md` on main plus open PRs, 16:30 UTC)
| | Built, merged, qa-tested (Works) | Built, approved, not merged | In progress (PR open) | Partly built, no open PR | Not built |
|---|---|---|---|---|---|
| **M2 setup (56)** | **30 (53%)** | 6 (11%): C1.5, C10.1, C11.12, C2.6, C3.13, C4.7 | 5 (9%): C3.1, C3.12, C3.6, C4.1, C4.11 | 15 (27%): C11.1, C11.10, C11.13, C11.14, C11.15, C11.16, C11.3, C11.7, C11.8, C11.9, C2.12, C3.3, C3.4, C4.5, C9.1 | 0 |
| **R1 runtime slice (8)** | 6 (75%) | 1: C4.4 (part 1) | — | — | 1: C7.2 (Adobe on the Mac) |
| **M3 Visitor visa path (16)** | 1 (6%): C6.11 | 2: C11.5, C6.12 | — | 2: C11.6, C7.6 | 11 |

Acceptance tests (Day-0 packs, all on main): pack 1 forms in 245/286 checks (2/14 tests green), pack 3 library and demo 78/163 (1/10), pack 4 Visitor visa M3 4/230 (0/14), pack 2 baseline on #298. The green count is the progress number to watch.

## Overnight run 1–2 Nov (P-223): a fresh Lead session runs it; builders continue; at most 7 builders + 1 qa; up to 100% of the weekly plan; tell the founder before credits run out

## Resume here (a fresh `/lead` chat, in the desktop app so it can start sessions)
1. **Read each Handover comment** written at close-out (founder's ask: every builder finishes its item, labels it, hands over, stops). Open PRs: #313, #315, #316, #318, #319, #320, #321, #283, #282, #314, #116, #311 and the C6.4 PR from `claude/serene-euler-vp7ar1`. Close #281 (replaced by #314) and #289 (replaced by #318) once their replacements merge.
2. **Watches:** idle sweep every 4 minutes while builders run (15 while paused); 20-minute check; 90-second alarm; PR alarm (red, dequeued); 2-hourly ops review on a cheap model.
3. **Start builders from the Handovers,** one per group, Visitor visa first, then the 15 partly built M2 rows. A cloud builder can push only its own branch: it re-opens an old PR's work as a new PR, or the Lead fast-forwards the old branch from the Mac.
4. **Before every label:** merge main and re-run the touched suites (an approved PR behind main conflicts at merge, four did today).

## Decisions waiting for the founder (most settled by P-223)
* **Credits:** weekly plan 54% at 16:20 UTC (resets 5 Nov), about 6 points an hour with 10 builders; extra usage OFF.
* **PR checks on GitHub machines** instead of the one Mac runner (about US$1 a day, estimate).
* **One paid AI trial on Visitor visa** to record answers that C2.6, C3.4, C4.11 and C4.7 replay (pack 2; cost to be stated first).
* **Signer for a minor (IRCC-P2-06):** the founder with the immigration expert; tests follow the Sample rule meanwhile.

## Decisions today
P-219 (capability IDs per PR) · P-220 (tests first, swarm, Visitor visa first) · P-221 (`qa/built/<ID>.md`) · P-222 (Confirm all sections per person, with review). Also: Merge Protections on; the name-free requirements copy (`domain/requirements-2026-10-19/`).

## Lessons today (detail in the ops folder)
Merge Protections is what makes approved PRs queue themselves · one file per item, never a shared scoreboard · merge main right before the label · builders last about an hour, so replacements must start without waiting on the founder (start sessions only from the desktop app) · check new suites on Linux before they join the batch.
