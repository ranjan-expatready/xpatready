# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-01 08:45 UTC · milestone: **M2 — Super Admin configuration**, with the thin runtime slice R1 · way of working: `WAY-OF-WORKING.md` · work list: `BACKLOG.md` (features F1–F8) · why each choice was made: `design/why-we-chose-2026-10-31.md` · merge flow trial: `design/merge-flow-trial-2026-11-01.md`

## Goals (P-202)
* **Today (1 Nov):** the new merge flow carries the day (done: about 7 merges an hour after 05:49 UTC, against about 2 before); #113 lands once its person-tab speed is fixed; qa tests today's merges.
* **This week (to 7 Nov):** F7 done; F1, F2 and F6 well under way; workflow frozen except fixes (P-204).
* **3 Nov:** verdict on the P-213 trial (keep the four GitHub shards if batches stay at 15 minutes or less within the US$30 cap; fallback `BATCH_RUNNER=mac`).

## Resume here (a fresh `/lead` chat)
1. **Set three watches first:** the 20-minute check (lead skill standing rule 1), the 10-minute lane nudge (`ListAgents`; idle cloud sessions with work left get "continue" plus their next step, P-218), and the 90-second alarm (Monitor: red checks, merges, PR questions and handovers, demo down; re-arm every 30 minutes).
2. **Lanes (cloud, started 1 Nov about 08:10 UTC; one-way: they read `SendMessage`, answer in PR comments):**
   * Runtime builder: #113 tab speed, then F7, F6, #116 (#113 held, label off: the person tab takes about 270 ms against 200 ms; then `claude/runtime-116-prep`, `claude/runtime-f7-x9`, `claude/runtime-f6-pqr-picks`, X1c, then QA-112, QA-116, QA-78; C4.1 after #195's answers, P-216).
   * Screens builder: s5 wording, open branches, then X2b (#216 fails `check_s5_slice2_browser` drift 5 on its own, by intent: update the check; #243 focus ring, #244 X1b, #245 names opened; then X2b, QA-120, QA-121, F5).
   * Forms builder: open C2.12 slice 3, then C2.4 (#241 slice 3 and #242 test timing opened; then the Forms-tab `?focus=` landings, C2.4).
   * QA: after-merge from 832ee5bd, then explore (today's merges, then evidence and runtime).
3. **Old sessions:** the founder archives the old Mac runtime session (`local_3b02c2d2`; it holds Remote Control, so `archive_session` refused; nothing unpushed) and five old cloud sessions from the sidebar.
4. **Random-failure watch (P-205):** `check_w1_structure_browser.cjs` C11.3 R3-5 failed once at random (1 Nov 07:54); a second random fail quarantines it.

## Progress (from `qa/CAPABILITIES.md` by `tools/progress.sh`; moves only after qa tests)
* M2 Super Admin setup: 21 of 57 work (36%) · 16 partial · 19 not built (about 15 product PRs merged 1 Nov still await qa's retest)
* R1 thin runtime slice: 6 of 8 work (75%)
* M3 case, agent and client: 0 of 15 work · 3 partial

## The merge flow now (1 Nov)
* Builders' PRs: fast checks on the Mac; a PR joins the Mergify queue only when its own check is green and it has the label (P-210).
* Batches of up to 6, one at a time, checked on four GitHub Linux machines at once (P-213), split by measured suite times (#226): 12–17 minutes against 37–45 on the Mac. Nightly full run and speed budgets: the Mac (P-215).
* The tech lead merges merge-flow fixes ahead of the queue and refreshes records-only conflicts without asking (P-214).
* Spend: about US$3 of the US$30 trial cap by 08:08 UTC (from run minutes; the Lead cannot read billing).

## Founder decisions waiting
* None.

## Log (newest first; earlier lines are in git history)
- 2026-11-01 08:45 · tech lead: 35 merges today. Free queue fix (P-210, P-211) and four-shard trial (P-213) live from 05:49 UTC; P-214 (unblock), P-215 (speed budgets on the Mac), P-216 (#195 answers), P-217 (local suites before the label, no stacking), P-218 (finish the item, then hand over at 60–80%). Every builder and qa session stopped once today (50% rule or end of turn); four fresh ones started 08:10 UTC. #113 held for speed.
- 2026-11-01 01:45 · tech lead: handover at 59% context. Overnight 31 Oct: 8 merges since 17:20 UTC; one unreliable suite quarantined.
