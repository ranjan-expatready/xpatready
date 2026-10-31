# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-10-31 · milestone: **M2 — Super Admin configuration**, with the thin runtime slice R1 · way of working: `WAY-OF-WORKING.md` (in force 31 Oct) · work list: `BACKLOG.md`

## Progress (counted from `qa/CAPABILITIES.md` by `tools/progress.sh`)
* M2 Super Admin setup: 21 of 57 work (36%) · 16 partial · 1 not tested · 19 not built
* R1 thin runtime slice: 6 of 8 work (75%)
* M3 case, agent and client: 0 of 15 work · 3 partial (design agreed; build at the M2 gate)

## In flight (each merges by itself on green CI plus the reviewer's Approve, P-189)
| PR | Area | What | Where it stands |
|---|---|---|---|
| #112 | forms | slice 1 channels, live AI off by default (P-175), one shared spend ledger (QA-90), cost warning (P-179) | CI rerun after a test-only fix (134019cf) |
| #111 | screens | PR #108 review Minors | CI rerun after a test-only fix (d8056ca8) |
| #113 | runtime | queue transaction fix, C10.1 checkpoint, C3.11, P-184 speed helper, S7 Reset + Load sample | syncing with main (conflicts) |
| parked | screens | C1 "Before forms" (`claude/screens-c1-before-forms`) | after #112 merges (cloud screens builder) |
| cloud | forms · runtime · screens | N6 + N8 (stacked on #112) · N7 Devin fixes (stacked on #113) · N9 + X4 screens bugs | cloud builders started 31 Oct; their PRs are their reports |

## Next (from `BACKLOG.md`)
N4 qa after-merge · N6 forms P-179 follow-ups (two Majors, one stale-lock Major, Minors) · N7–N9 Devin findings · N10 paid runs waiting for the founder's Go (each with its cost).

## Watch
* The first PRs on the new path are the dry run: they prove the auto-merge and the demo update. Any failure is fixed before anything else.
* Week-one numbers on demand: median start to merge (target under a day), the tech lead's share of commits (under 15%), bugs after merge (must not rise), AI spend (US$0 unless approved).
* The `lanes/` files are frozen; they leave once #111, #112 and #113 have merged.

## Log (newest first; earlier lines are in git history)
- 2026-10-31 · tech lead: #114 merged on its local checks (founder's one-time exception: its CI was queued about 2 h behind suite runs; check-docs, decision-impact, graph and push guard all passed locally). Three cloud builders started (forms, runtime, screens). Disk 3 → 7 GB (finished runtime-s7 copy removed; branch inside #113). Watch: :4400 still runs the old main, so "Find forms with AI" there can spend live money until #112 merges.
- 2026-10-31 · tech lead: switch-over. P-189 (auto-merge; one ask = one PR; the demo updates itself). `automerge` and `demo-update` workflows; `next`, `lead` and `qa` skills rewritten short; stop hook keeps only code checks; old rules files out (git history + `archive/2026-10-30-before-simplify/`); `BACKLOG.md` is the one list (Phase 1, carry-over checked). Runtime's 40 unmerged commits opened as PR #113.
