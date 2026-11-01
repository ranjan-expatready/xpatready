# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-01 10:05 UTC (Lead handover at 55% context) · milestone: **M2 — Super Admin configuration**, with the thin runtime slice R1 · way of working: `WAY-OF-WORKING.md` · work list: `BACKLOG.md` (features F1–F8) · merge flow trial: `design/merge-flow-trial-2026-11-01.md`

## Goals (P-202)
* **Today (1 Nov):** keep the four lanes building; land #113 (now fixed for Linux) so runtime's waiting branches follow; qa retests today's merges.
* **This week (to 7 Nov):** F7 done; F1, F2 and F6 well under way; workflow frozen except fixes (P-204).
* **3 Nov:** verdict on the P-213 trial with the founder (keep the four GitHub shards if batches stay at 15 minutes or less within the US$30 cap; fallback `BATCH_RUNNER=mac`).

## Resume here (a fresh `/lead` chat)
1. **Set three watches first:** the 20-minute check (lead skill standing rule 1); the 10-minute lane nudge (`ListAgents`; an idle cloud session with work left and no Handover gets `SendMessage` "continue" with its next step, P-218); the 90-second alarm (Monitor: red checks, merges, PR "Question for the tech lead" / "Handover" / "Blocker/Major" comments, demo down; re-arm every 30 minutes).
2. **Lanes now (cloud; one-way: they read `SendMessage`, answer in PR comments):**
   * **Forms:** "Forms builder: rest of F2, then F3", running. Brief: Handover on #249.
   * **qa:** "QA: after-merge from 63168762, retests and C2.12", running. Brief: Handover on #253; told to explore while main was still.
   * **Runtime:** needs the founder to start the card "Runtime builder: X1c, then F7, F6, #116 after #113" (brief: Handover on #257).
   * **Screens:** needs the founder to start the card "Screens builder: X2b slices (b)–(d), QA-129, F5" (brief: Handover 4 on #254). X2b slice (b) adds a `line_batch` migration: the Lead reads that diff before it merges.
3. **Queue at handover:** batch #242 + #249 + #252 + #253 + #254 + #257 testing; #113, #216 and #256 queued next; #248 (this records PR) refreshed.
4. **Old sessions to archive (the founder, from the sidebar):** the Mac session "Runtime lane: transaction timeout fix…" (`local_3b02c2d2`; Remote Control blocks `archive_session`; nothing unpushed) and every cloud session whose PRs are merged and Handover written (all except the four above).
5. **Watch:** `check_w1_structure_browser.cjs` C11.3 R3-5 failed once at random (07:54); a second random fail quarantines it (P-205). Spend: about US$3 of US$30 by 08:08 UTC from run minutes (the Lead cannot read billing; ask the founder for the figure on 3 Nov).

## Progress (from `qa/CAPABILITIES.md` by `tools/progress.sh`; moves only after qa tests)
* M2 Super Admin setup: 21 of 57 work (36%) at the last count; about 20 product PRs merged 1 Nov await qa's retest.
* R1 thin runtime slice: 6 of 8 work (75%)
* M3 case, agent and client: 0 of 15 work · 3 partial

## The merge flow now (1 Nov)
* Builders' PRs: fast checks on the Mac; a PR joins the Mergify queue only with its own check green and the label (P-210). Before the label, the builder runs its files' suites (P-217; when the selection is ALL, only the touched files' suites).
* Batches of up to 6, one at a time, on four GitHub Linux machines (P-213), split by measured suite times: 12–17 minutes. Speed budgets are judged on the Mac nightly only (P-215). Tests must work on Linux (#113's `ps -E` broke two batches).
* The Lead merges merge-flow fixes ahead of the queue, refreshes records-only conflicts and labels approved PRs whose builder stopped before its pre-check (P-214). A PR dropped for failing checks needs "@mergifyio requeue", not "queue".
* Results 1 Nov: 41 merges. About 2 an hour before 05:49 UTC, about 7 an hour after when PRs wait; 16 batches since the switch, 8 failed (most of them #113).

## Founder decisions waiting
* None.

## Log (newest first; earlier lines are in git history)
- 2026-11-01 10:05 · tech lead: handover at 55% context. 41 merges today. P-210 to P-218 recorded (queue fix, any per PR, shards, unblock, speed budgets on the Mac, #195 answers, local suites before the label, finish the item then hand over). #113 solved (the speed miss was the measure; `ps -E` replaced on Linux). QA-122 (Major) fixed in #257. Builders now hand over at 60–80% after finishing the item.
- 2026-11-01 01:45 · tech lead: handover at 59% context. Overnight 31 Oct: 8 merges since 17:20 UTC; one unreliable suite quarantined.
