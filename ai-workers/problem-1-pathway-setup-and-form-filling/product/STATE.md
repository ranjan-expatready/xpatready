# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-02 05:35 UTC (**new Lead "LeadX" took over at 05:20 UTC**; every live session adopted by message; P-234 pace: full speed to 93% of the weekly plan, then STOP and hand over) · milestone: **M2 — Super Admin configuration**, plus the Visitor visa M3 path · how we work: `WAY-OF-WORKING.md` (P-224, amended by P-228 and P-231) · decisions to read word for word: DECISIONS P-223 … P-234 · reports: `reports/night-2026-11-01-02.md` (v2), `reports/plan-24h-2026-11-02.md` · dashboard: https://claude.ai/artifact/R4q1suvZsTqJ29QToJxdao (snapshot 04:30 UTC)

## Start here (fresh `/lead`)
0. **First job (founder, 2 Nov): clean up and take over every session of the old Lead.** List them all (`ListAgents` for cloud and local, `list_sessions {"linked": true}`). For each: is it working, does it have an open PR, unpushed work or a Handover? **Dead, finished or not responding** → make sure its work is pushed and its PR has a Handover, then close it (local: `archive_session`; cloud: give the founder the exact titles to archive on claude.ai/code, one at a time). **Alive with work left** → message it that you are its new Lead (your session name) and restate its queue from the table below; from then on it reports to you. Nothing stays under the old Lead. Already known: vv-runtime and runtime-2 (cloud) stopped near 90% → founder archives; evidence-c72 (local) is finished, but archive it only after paid-runner-2 is done (they share a worktree); paid-runner-2 (local) is ready, waiting for a Go per run on #417 (launcher route only).
1. Read DECISIONS P-223…P-233 **word for word**, then this page and the lead skill's "Not drifting".
2. The founder's working style (memory): one question at a time with a recommendation and pros and cons; never a bulk list; the Lead decides immigration answers from research (P-230) and runs disk clean-ups itself.
3. Adopt the sessions below by name (`ListAgents`); create your own 20-minute check (CronCreate). The old Lead's check is cancelled at hand-over.
4. Two records PRs of the old Lead are labelled and will conflict with each other on DECISIONS when one merges: **#413** (P-230, P-232) and **#425** (P-233). Merge main into the second one (keep both sides' rows), then re-label.

## Progress (`progress.sh` on main, 04:59 UTC)
M2 **34/56 Works** · 8 built, awaiting qa · 14 partial. R1 6/8 (C7.2 not tested: #414 raised the app's IMM 5257 fill to 40 of 46 mandatory; Adobe Validate runs on the Mac after the rest). M3 1/16 · 7 partial (qa-m3 found gaps in C6.4, C6.12, C11.6, C7.3) · 8 not built. **Half-done: 28 capabilities, 12–14 open PRs** (baseline 04:10 UTC). 39 PRs merged since 1 Nov 19:20 UTC. AI spend US$0 today (ledger since 26 Oct: US$3.13). **Weekly plan 79%** (resets 5 Nov 23:00 UTC; it rose about 4 points an hour with 12 sessions: at 92% builders finish and stop; consider fewer sessions).

## Sessions (cloud ones answer in PR comments; they can't message the Lead, 401)
| Session | Now → next |
|---|---|
| runtime-3 | #407 Reset to the six (queued) → QA-149 → **#408 C6.4 storage (migration; holds a slot; merge main, "ready for label", Lead reads SQL)** → R3 a child's travel answers (needs C3.6) → C7.6 rest |
| runtime-4 | #428 QA-76 (approved) → R2 fees as data (P-230 (7)) → T1 full run on GitHub |
| runtime-5 | #418 C6.9 part 2 (approved; R4 rule outcome: background question = needs review) → part 3 → D4 (#357 m3) → C11.5 pre-fill |
| forms-1 | D2 Live or Saved (P-227) |
| forms-2 | #426 C3.6 with answer values (for R3) → C11.14 |
| forms-3 | D3 (#417 plan): #429 edition label (approved) → QA-144 "Saved reaches the field-map review" → C2.6 live reading → C3.4 AI step → C4.11 live wiring; told to push its stash |
| forms-4 | #427 C11.13 Draft fields |
| c1112 (new) | C11.12 filing modes, 3 PRs (P-233); PR 2 is a migration (second slot) |
| screens-1 | #423 c313 full-run fix (queued) → QA-82 → screen01 race (quarantined in #410) → six-combination data fixes (P-230: Sponsor role, spouse forms, IMM 5645/5707 one line) |
| qa-night | #405 M2 round (needs a rebase) → M2 built rows |
| qa-m3 | Visitor visa M3 rows as they merge |
| **paid-runner-2 (Mac, local_27a91d86-…)** | waits for the Lead's "Go" on #417 per run; runs through `.tools/p2-ledger`; records cost; commits Saved only after the Lead's "verified" |
| stopped | vv-runtime, runtime-2 (Handovers on #358, #391), evidence-c72 (#409 labelled) |

## Paid runs (P-225, P-232: today US$25, R-146 up to US$50)
IMM 5257 field map: **verified for Saved at US$0** (21 Oct run reused; after #429). Remaining Visitor visa runs, each with its "Go" after its blocker PR merges: C2.6 (~US$1.3 worst), C4.7 (US$1.18), C4.11 step 5, C3.4 (worst not yet stated). Then R-146 (US$45.08). After the runs: walk Visitor visa to a release on screens (QA-144).

## Fix first
* Full run red on one check (`check_c313_reuse_browser.cjs`); fix #423 queued. After it merges, start the full run by hand and judge by its conclusion (GitHub skipped the 21:00 UTC schedule on 1 Nov).
* Quarantined: `check_forms_c36_rule_facts_browser.cjs`, `check_screen01_api.ts` (fix rows open).
* Disk: 6.4 GB free at 05:00 UTC (alarm under 10 GB). Two old copies were removed; the next candidate is the evidence worktree `exciting-pascal-e76970` once paid-runner-2 is done (it reuses it).

## Founder asks (P-228 (9))
| # | Ask (2 Nov) | Status |
|---|---|---|
| A3 | Reset to the six (P-226) | #407 queued |
| A4 | Live or Saved (P-227) | forms-1 building |
| A5 | Visitor visa configured with AI, saved for demos (QA-144) | forms-3 + paid-runner; IMM 5257 reused at US$0 |
| A6 | Six combinations fixed from research | P-230 in #413; screens-1 routed |
| A9 | Fresh Lead for the next 24 hours | **now** |
| A10 | Morning report of spend and progress | daily (today: US$0, 39 merges, 34/56) |
| A11 | Finish before starting (P-231) | in force; C8.1, C8.2 paused |
| A12 | Fast-track (forms-3, forms-4, C11.12 board) | done |
| A13 | Visual progress report for the founder's founder | dashboard published (private; share from its menu) |
| A16 | Pull the latest SA-01B; review it end to end incl. the Chrome extension; every conflicting or overlapping decision; a high-level split of what the team builds vs the POC; grill one question at a time; decisions into BACKLOG at M2/M3/M4 | snapshot 2026-11-02-1054 synced to `domain/requirements-2026-11-02/`; **done**: P-235–P-245, P-247–P-249 decided by the founder, P-246 by the Lead (M2 now 60 rows; rows G1–G5, L-SA3–L-SA10, E1–E6); the SA-01B session's analysis file comes next by the session "SA01B scope and handover review"; Lead records |
| A15 | Weekly plan: full speed until 93%, then keep 7% for the last hand-over and all updates (P-234) | in force; Lead sends "STOP: 93%" |
| A14 | Close finished sessions, tidy the sidebar | local ones archived by the old Lead; cloud ones need the founder on claude.ai/code |

## Lessons of the day (lead skill "Not drifting")
Read the night's decisions word for word before the first brief · every founder ask goes in the table above · one owner per table · tooling bugs look like flaky tests · builders' stashes must be pushed · records PRs written in parallel conflict on DECISIONS: batch them into one · start qa and fresh sessions while the founder is at the desktop · watch disk and the weekly plan every check.
