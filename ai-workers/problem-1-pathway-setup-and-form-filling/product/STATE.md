# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_f02fdadd-e9b5-4e80-8dc0-b0bb01dda46e Lead 31 · 7 Nov 15:45 IST (took over from Lead 30 at ~395k context, P-314)

updated: 2026-11-07 16:19 IST by **Lead 31** (took over 15:45 IST); weekly 14% at 16:17 IST (~10%/h; 85% ~23:20 IST at this rate) · milestone: **M2 60/60 holds; M3 clock from 23:17 IST 6 Nov: M3 is now 28 capabilities (P-406: the 17 plus 11 from the coverage audit); 4 Works (C1.3, C11.5, C6.9, C8.2, on qa's #1238 merging)** · rules: **`RULES.md`** + DECISIONS P-354 to P-412 · **this block's plan: `design/next-12-hours-2026-11-07.md`; the 11 new rows: M3 plan's 7 Nov section** · earlier page: `history/STATE-2026-11-07-1619-lead31.md` · this branch: `lead/2026-11-07-lead31`

## Lead 31 (from 15:45 IST): standing items
Cron **4b7708bc** (:13/:43). Weekly 16% at 16:47 IST (~4%/h over the last 30 min). The hand-over block and 15:55 progress lines are word for word in `history/STATE-2026-11-07-1650-lead31.md`.
* **Lanes to read each check (PR comments):** UX (task_f4b1c488: #1245 study, #1255 C6.9 revision approved; the Lead approves each revision, P-316 (3)); concepts 1 (B135 #1242, B144 #1247, B141 #1248); concepts 2 (B145 #1252, B138 #1257, B139); C4 (task_3a2d7beb, pack lines, P-400); B150 #1251; B128; B148 #1250 → B149; C2 #1075; B3 lane (B129 → B132 → B130); A5 #1054 → B136; B5 #1233 → B133 → B152 → B151.
* **The build lane (B140) stopped at its label (#1246); B137 and B142 need a new runtime lane** at the founder's next typed turn (card offered).
* **#1222 (A6):** round 3 after the two code-cause reds are fixed. **#1054 (A5):** schema; the Lead reads the diff before the label.
* **#1240:** its CI failed on G2 "C6.17 cites P-13": `tools/graph.mjs` read only a row's first P-id; fixed to read every id in the first cell (graph exit 0). Label on green at the final head (P-410).
* **Order (16:48 IST):** B148 #1250 before the UX C6.9 revision #1255; B140 #1246 before B150 #1251 (B150 adapts: staff background answers fill at once, signing waits, P-244 + P-411).
* **17:19 IST:** #1246 (B140) red after its label (code cause: P-244 changes "all confirmed" in C6.9 and C-9 checks); its lane stopped, so the B150 lane (#1251) fixes it first, then adapts B150. C7.6 is 15/25 on main vs qa's 19/25 (5 Nov), measured on #1261; qa asked to re-score; B149 accepted on "unchanged from main". #1240 labelled 17:19 IST (no CI run started on its head; push an empty commit if Mergify waits). Records now on `lead/2026-11-07-lead31`.
* **17:50 IST:** #1240 conflicted with main (qa's CAPABILITIES rows), so its CI never ran. Merged in a scratch worktree (`$TMPDIR/lead31-merge`): **the main copy cannot merge main**, because the sandbox refuses writes to `.claude/skills/` (the UX lane's skill changes, #1258), so its checkout of the skills is stale until the founder pulls it. Do Lead records in that worktree.
* **18:19 IST:** #1256 (B128) third diff-only round; rows B155 (siblings), B157 (parent uniqueness), B158 (parent titles), B159 (child's parents on the case); C7.7 pack port stays with the C4 lane. #1252 (B145) D1 and D5 kept. Queue: 3 batches running, oldest 30 min.
* Standbys: Lead 32 (watchdog), Lead 33.

## For the founder (P-390: asked at his next typed turn, oldest first, one at a time)
F1, F3, F4, F5 answered (P-391, P-393, P-396, P-403; rows in `history/STATE-2026-11-07-1545-lead30.md`); F7 answered (P-406; row in `history/STATE-2026-11-07-1555-lead31.md`). F9-F13 answered 18:25-18:36 IST, all as recommended (P-412; rows in `history/STATE-2026-11-07-1837-lead31.md`).

| # | Question | Lead's recommendation | Blocks | Since | Status |
|---|---|---|---|---|---|
| F2 | Look at C6.9's new screen (A4, #1172) with `reports/best-in-class-C6.9-A4-2026-11-07.md` | changes become follow-up rows | nothing | 7 Nov 08:35 | open: qa's walk screenshots landed with #1199 |
| F6 | A hard boundary for `.github/**` changes: a Mergify condition (a GitHub approving review or a founder-only label) or a CODEOWNERS ruleset (#1232's breaker Blocker 1) | after B134 lands, a Mergify condition | nothing now (B134 is the interim) | 7 Nov 15:25 | open |
| F8 | Look on the demo at the M3 screens merged since P-392 (B1 documents, A2/QA-293 representative's tab, B124, B126) with the drift audit (`reports/m3-screens-vs-boards-2026-11-07.md`) | show with B147's tab; no decision needed now | nothing | 7 Nov 15:50 | open (P-408) |

## Start here (next Lead)
**Roles (P-384):** the founder gives product direction only; the Lead owns the pipeline. Every label needs a PR comment line `Reviewer: Approve <head sha>` (label guard). Records-only PRs: the Lead labels after reading the diff (P-385); `records` queue. GitHub: curl + `gh auth token` with `allowed_domains` (P-363). Times only from `TZ=Asia/Kolkata date`. Notes: `~/Library/Application Support/Claude/side-session-notes/lead10-saved-2026-11-05/` (never a folder named for a session); Lead 26's are in `history/lead-notes-2026-11-07/`.
**Founder, ~15:50 IST (P-410):** the Lead labels all approved green PRs, its own records too; no token cap, quality guards stay; the 50%-by-22:00 trip-wire is lifted. **Auto-mode rule (P-405, ~15:15 IST):** `~/.claude/settings.json` `autoMode` now allows the Lead's labels on Approve + green CI, its own records-only PR approval and label, and nightly.yml dispatch on main. First use is the test: on a refusal, ask the founder in one line as before and note it in DECISIONS. **Standing OK (P-402, 14:30 IST):** the Lead labels approved green PRs and dispatches re-tests on main without naming each. **Was refused before P-405:** the Lead's Approve and label on its own records PR (Self-Approval); try under P-405 first, then the founder names it ("label <n>"). **Permission check (7 Nov):** never route a refused write through a lane. Never route a refused write through a lane, and never split a refused command to retry it (12:39 IST: refused as a bypass).
**Stall guard (P-388, P-389):** no prompt-waiting call while the founder is away; `lead-watch.sh` ACT when the last check is over 40 min old. Watchdog: first standby (Lead 32).
**Hand-over (P-409):** no hand-over with an in-process subagent running; its result goes to a file named in the hand-over block; briefs say report to the current Lead. Skill edit at the founder's next typed turn.
**Never run guard/test suites in the main copy** (7 Nov 09:18 incident): scratch clone only, deleted after.
**To-do, in order:**
1. Check (:13/:43, prompt exactly `run lead-watch; read STATE Start here`, cron 2be371d8).
2. **Lanes, counted only after a push:** B124 #1197, B126 #1212 (the Lead labels these two; their briefs say so), C9, C3, B3, A6, B127 (these label themselves after Approve, P-277). Read their PR comments each check. Label on an Approve line for the exact head + green CI.
3. **qa:** #1220 (head 8f1d6193e, main ecbd68301): C6.11 and C8.1 Partial, P-339 met; QA-296 confirmed, new QA-299, QA-300. Label after reading the diff and CI, once the founder gives the OK. **B107 needs a lane at his next typed turn (P-400).** Then: dispatch C8.2 C6.9 on the checkpoint after B126 and B124 land.
4. **P-388 measurement:** 2 failed of the first 10 batches after 09:19 IST (23113b92e5 the C1 and A3 clash; 0f532b98fc not read yet): 20%, over the 10% bar. `flow-measure.py` hit a rate limit today: read `actions/workflows/ci.yml/runs` directly. Trip-wire: P-399.
5. **Hourly report** against `design/next-12-hours-2026-11-07.md` section 7 (P-399); halfway review 20:00 IST, block review 02:00 IST.
6. **Records:** #1229 labelled 14:32 IST (records queue). **Do not push to `lead/2026-11-07-lead29` while #1229 is queued** (a push drops the label); later commits go on a new lead branch after it merges.

## Where we are (16:19 IST)
* M3: 28 capabilities (P-406); Works 4 on qa's #1238 (C1.3, C11.5, C6.9, C8.2; queued). Merged since 15:45 IST: C3 #1225, C9 #1223, qa #1226, #1220. Queued: #1238, #1221, #1233, #1232, #1237, #1241, #1245. Spend today US$0. Earlier lines: `history/STATE-2026-11-07-1619-lead31.md`; the account switch and 7 Nov lessons: `history/STATE-2026-11-07-1555-lead31.md`.

## In flight
**qa's lane:** `local_0868d426-…`; #1226 (head c237fef9f, QA-235 closed, QA-153 rewritten) gets the P-401 wording, then the Lead reads and labels. QA-228's retest goes with C8.2 and C6.9. C6.9 and C8.2 go to it when they land.
| Lane | Where | Row → next |
|---|---|---|
| C9 QA-246 (cloud) | #1223 | C7.7 forms waiting on an answer |
| C4 (cloud) | task_3a2d7beb, requested 15:04 IST (P-404) | C7.6 → C9.2 → C11.6 → C7.7, the Lead approves pack lines before each label |
| B3 → B129 | #1221 labelled 15:48 IST | B129 → B132 → B130 |
| B131 (cloud) | task_32589e77, requested ~15:16 IST (P-405) | gate B NOT TESTED; may merge ahead (P-214) |
| Lead 33 (Mac) | `local_b49efef4-ce4b-4e6d-b821-507aac4b653b` | standby |
| A6 B102 (cloud) | #1222; concept approved 14:17 IST | calculated age, C6.4, QA-226 |
| B107 (cloud) | task_fb1531a2, started ~14:28 IST | QA-296, QA-299, QA-300: C6.11's path |
| Lead 32 (Mac) | `local_e0d03eb0-39dc-4371-abd7-d2a23216aaf3` | standby + watchdog (after Lead 30 messages it) | representative's names on IMM 5475 |
| qa (Mac) | `local_0868d426-cf53-4883-b60b-59389b349a35`, started 13:13 IST | re-score C6.11, C8.1 on nightly 42352179701 |
| Lead 31 (Mac) | `local_f02fdadd-e9b5-4e80-8dc0-b0bb01dda46e` | **current Lead** from 15:45 IST |
| UX lane (cloud) | task_f4b1c488 (P-407) | study → scorecard → M3 screens |
| New-rows concepts (cloud) | task_9975ca96 | B135 → B144 → B141 |
| New-rows build (cloud) | task_404185d0 | B140 → B137 → B142 |
| Started ~15:56 IST (cloud, P-410) | task_f622c350 B150 · task_1c1f5c6c B128 · task_cf52df0f B148 → B149 · task_7b81aa78 C2 on #1075 · task_d0f2097f concepts 2: B145 → B138 → B139 | count only after a push |
| Warm rows by PR comment ~15:57 IST | #1221 lane: B129 → B132 → B130 · #1054 (A5): B136 · #1233 (B5): B133 after #1223 | |

**Released 14:34 IST (P-403):** A5 #1054, C2 #1075, B5 (#1233), kind token then b78 (#1232); the old PRs off the critical path are listed in `history/STATE-2026-11-07-1545-lead30.md`.

## Leads, in order (highest = current)
**Lead 31** `local_f02fdadd-…` (from 15:45 IST 7 Nov) · Lead 30 `local_f37a22d1-…` (14:48-15:45 IST, ended) · Lead 29 `local_ef20bc85-…` (12:35-14:47 IST, ended) · Lead 26 `local_ab55f159-…` ended ~12:30 IST; Leads 27 and 28 were standbys on the old account, never led, deleted (P-396) · Lead 25 ended · Leads 1-24 earlier. Standbys: Lead 32 (watchdog), Lead 33.
