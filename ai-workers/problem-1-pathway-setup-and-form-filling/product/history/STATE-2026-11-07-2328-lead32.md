# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_e0d03eb0-39dc-4371-abd7-d2a23216aaf3 Lead 32 · 7 Nov 18:55 IST (took over from Lead 31 at ~385k context, P-314)

updated: 2026-11-07 22:58 IST by **Lead 32** (Lead 31's hand-over below) · milestone: **M2 60/60 holds; M3 clock from 23:17 IST 6 Nov: M3 is now 28 capabilities (P-406: the 17 plus 11 from the coverage audit); 4 Works (C1.3, C11.5, C6.9, C8.2, on qa's #1238 merging)** · rules: **`RULES.md`** + DECISIONS P-354 to P-414 · **this block's plan: `design/next-12-hours-2026-11-07.md`; the 11 new rows: M3 plan's 7 Nov section** · earlier page: `history/STATE-2026-11-07-1958-lead32.md` · this branch: `lead/2026-11-07-lead31`

## Lead 32 (from 18:56 IST) — checks before 22:27 IST in `history/STATE-2026-11-07-2258-lead32.md`
* Check cron f50193b6 (:13/:43). Lead 33 told "start the watchdog" 18:57 IST. Standbys: Lead 33 (watchdog) and Lead 34 `local_309261d2-81b3-4957-93dd-bbcc0ef30be1` (started by Lead 31 at the founder's yes, ~19:50 IST).
* Answered on the PR and in the session's prompt box: #1268 (B137's third migration: yes, own stamp, schema breaker), #1251 (B150: finish #1246's check fix first, then after #1246 lands merge main once, diff-only merge check P-318 (1), label).
* Prompt box only (the PR answers were already there from Lead 31): A6 #1222 (fix the two code-cause reds, then round 3), B107 #1231 (round 3 diff-only, ready, label).
* Warm rows sent (P-413 (2)): the B3 lane takes B129 → B132 → B130; the B5 lane takes B133 → B152 → B151.
* Waiting on a merge, to message then: UX lane builds C6.9 once #1250 merges; the forms lane B155 → B157 once #1256 merges; A5 takes B136 once #1054 merges (its own check-in reads Lead 31's ruling).
* **P-414 finish first (founder ~19:55 IST):** no new rows or lanes. Stop told in the session at ~19:57-20:02 IST: concepts 1, concepts 2 (finish B145 #1252), B154 lane, B137 #1268, B155 (stops now), A5 (stops after #1054, no B136). **Live lanes (~11 + qa):** C4 packs, B150 (#1246 fix, #1251), B107 #1231, B128 #1256 (labelled), B3 lane (B129 → B132 → B130), B5 lane (B133 → B152 → B151), A6 #1222, B148/B149 #1261, UX on C6.9 #1255, CI fixes (B134 → B160), qa (Mac).
* **Check 22:29 IST:** 8 merged in 30 min: #1285 C11.6 and #1283 C9.2 (C4 packs, so C4 has only C7.7 left, which needs a fresh session), #1279 B152, #1275 B129, #1274 B133, #1261 B149, #1236 (b78 hang), #1231 B107 (its own re-review push re-ran CI with the 19:59 approval lines). Now conflicting with main: #1246, #1251 (B150), #1268 (B137), #1256 (B128, C4.1 fixed in preview.ts and relabelled), #1242; #1252 (B145) left the queue on a conflict, its lane merging. Told in their sessions: B150, B137, B128, B3 (B132 then B130), B5 (B151 then stop). Still waiting on the founder: the M2-hot list (#1242, #1222, #1268) and requeueing #1270.
* **Check 22:58 IST:** #1289 B160 merged (suites that could not fail now fail). #1246 (B140) Approve 40697e1c9, CI running, its lane labels. #1252 (B145) merged main, pack 49/49, Approve 781de9f21, but now also held by the M2-hot guard (`api/src/form-library.ts`, `contracts/runtime.ts`). **Held by the guard, waiting on the founder: #1242, #1222, #1268, #1252; plus #1270's requeue.**
* Queued: labelled not queued: #1246 (red, B150 lane fixing), #1251 (conflict), #1256 (B128, labelled itself ~18:59 IST).

## Hand-over to Lead 32 (18:55 IST): do first
Lead 31's standing items are word for word in `history/STATE-2026-11-07-1855-lead31.md`. Weekly 21% at 18:47 IST (~4%/h). No founder question is open (F9-F13 answered, P-412). Rules of the evening: P-410 (the Lead labels approved green PRs), **P-413 (no new lane until one ends; warm rows first; Works before new rows)**.
1. **Cloud lanes wait in their own session, and a PR comment does not wake them** (only lanes with a scheduled reminder, like C4, re-read the PR). Every check: open claude.ai/code in the built-in browser, read "Waiting" / "Awaiting input", and reply **in the session's prompt box** (click Send; Return does not send), within the brief. Messaged ~18:40-18:53 IST (the messages themselves carry wrong clock times, 18:58-19:10: typed without reading the clock; lesson: run `TZ=Asia/Kolkata date` before any time you type): concepts 1 (build B135 → B144 → B141; B141's three choices approved), CI fixes (#1236 batch + nightly as passes 2 and 3, then B134), B148/B149.
2. **Not opened yet, quiet 2-4 h:** B107 #1231 (round 3 allowed 16:09), A6 #1222 (round 3 after its two code-cause reds), the B3 lane (B129 → B132 → B130), the B5 lane (B133 → B152 → B151), the UX lane (#1255 builds once #1250 merges), the A5 lane (B136 after #1054 merges), B150 #1251 (also fixes #1246's checks; labelled, waits for #1246).
3. **Labelled ~18:47-18:52 IST:** #1249 (C4: C7.6 pack lines approved, P-400; next C9.2 → C11.6 → C7.7, the critical path), #1250 (B148; C6.9 pack wording approved, so tell qa), #1054 (A5; schema read: two enum values, expand-only).
4. **`lead-watch.sh` misses some asks** (C4's "Ready for the tech lead's line approval" sat 2 h): read each open PR's newest comment for "tech lead", not only the heading. Changing the script is a process change (frozen to 10 Nov 22:30 IST, P-312).
5. **Records:** the main copy cannot merge `main` (the sandbox refuses `.claude/skills/`), so Lead records are made in a scratch worktree (`$TMPDIR/lead31-merge`, detached) and pushed to `lead/2026-11-07-lead31`; open its records PR when ready. The founder pulls the main copy at the Mac.
6. **Standbys:** Lead 33 (spare). Top up to two at the founder's next typed turn. Watchdog moves to Lead 33.

## For the founder (P-390: asked at his next typed turn, oldest first, one at a time)
F1, F3, F4, F5 answered (P-391, P-393, P-396, P-403; rows in `history/STATE-2026-11-07-1545-lead30.md`); F7 answered (P-406; row in `history/STATE-2026-11-07-1555-lead31.md`). F9-F13 answered 18:25-18:36 IST, all as recommended (P-412; rows in `history/STATE-2026-11-07-1837-lead31.md`).

| # | Question | Lead's recommendation | Blocks | Since | Status |
|---|---|---|---|---|---|
| F2 | Look at C6.9's new screen (A4, #1172) with `reports/best-in-class-C6.9-A4-2026-11-07.md` | changes become follow-up rows | nothing | 7 Nov 08:35 | open: qa's walk screenshots landed with #1199 |
| F6 | A hard boundary for `.github/**` changes: a Mergify condition (a GitHub approving review or a founder-only label) or a CODEOWNERS ruleset (#1232's breaker Blocker 1) | after B134 lands, a Mergify condition | nothing now (B134 is the interim) | 7 Nov 15:25 | open |
| F8 | Look on the demo at the M3 screens merged since P-392 (B1 documents, A2/QA-293 representative's tab, B124, B126) with the drift audit (`reports/m3-screens-vs-boards-2026-11-07.md`) | show with B147's tab; no decision needed now | nothing | 7 Nov 15:50 | open (P-408) |
| F14 | FQ-7: which date a recorded group's ages count on (B152 #1279: a submission recorded later than its "Submitted on" date) | the recording day for now (as built); price at "Submitted on" in a follow-up row | nothing (B152 carries on) | 7 Nov 20:30 | open |

## Start here (next Lead)
**Roles (P-384):** the founder gives product direction only; the Lead owns the pipeline. Every label needs a PR comment line `Reviewer: Approve <head sha>` (label guard). Records-only PRs: the Lead labels after reading the diff (P-385); `records` queue. GitHub: curl + `gh auth token` with `allowed_domains` (P-363). Times only from `TZ=Asia/Kolkata date`. Notes: `~/Library/Application Support/Claude/side-session-notes/lead10-saved-2026-11-05/` (never a folder named for a session); Lead 26's are in `history/lead-notes-2026-11-07/`.
**Founder, 18:41 IST (P-413): no new lane until one ends; warm rows first; Works before new rows (C4's pack port is the critical path); concept lanes write no new concepts until builds catch up.** **Founder, ~15:50 IST (P-410):** the Lead labels all approved green PRs, its own records too; no token cap, quality guards stay; the 50%-by-22:00 trip-wire is lifted. **Auto-mode rule (P-405, ~15:15 IST):** `~/.claude/settings.json` `autoMode` now allows the Lead's labels on Approve + green CI, its own records-only PR approval and label, and nightly.yml dispatch on main. First use is the test: on a refusal, ask the founder in one line as before and note it in DECISIONS. **Standing OK (P-402, 14:30 IST):** the Lead labels approved green PRs and dispatches re-tests on main without naming each. **Was refused before P-405:** the Lead's Approve and label on its own records PR (Self-Approval); try under P-405 first, then the founder names it ("label <n>"). **Permission check (7 Nov):** never route a refused write through a lane. Never route a refused write through a lane, and never split a refused command to retry it (12:39 IST: refused as a bypass).
**Stall guard (P-388, P-389):** no prompt-waiting call while the founder is away; `lead-watch.sh` ACT when the last check is over 40 min old. Watchdog: first standby (Lead 33, told 18:57 IST).
**Hand-over (P-409):** no hand-over with an in-process subagent running; its result goes to a file named in the hand-over block; briefs say report to the current Lead. Skill edit at the founder's next typed turn.
**Never run guard/test suites in the main copy** (7 Nov 09:18 incident): scratch clone only, deleted after.
**To-do, in order:**
1. Check (:13/:43, prompt exactly `run lead-watch; read STATE Start here`, cron f50193b6).
2. **Lanes, counted only after a push:** the live list in the Lead 32 block (P-414). Read each lane's newest PR comment for "tech lead" every check, and reply in its claude.ai session.
3. **qa:** re-scores after each merged batch; C6.9 and C8.2 Works on qa's #1238.
4. **P-388 measurement:** 2 failed of the first 10 batches after 09:19 IST (23113b92e5 the C1 and A3 clash; 0f532b98fc not read yet): 20%, over the 10% bar. `flow-measure.py` hit a rate limit today: read `actions/workflows/ci.yml/runs` directly. Trip-wire: P-399.
5. **Hourly report** against `design/next-12-hours-2026-11-07.md` section 7 (P-399); halfway review 20:00 IST, block review 02:00 IST.
6. **Records:** on `lead/2026-11-07-lead31` from the scratch worktree `$TMPDIR/lead31-merge`; records PR not opened yet (once a day, P-336).

## Where we are and in flight
See the Lead 32 block at the top (live lanes under P-414). The 16:19 IST snapshot and the earlier in-flight table: `history/STATE-2026-11-07-1958-lead32.md`.

## Leads, in order (highest = current)
**Lead 32** `local_e0d03eb0-…` (from 18:55 IST 7 Nov) · Lead 31 `local_f02fdadd-…` (15:45-18:55 IST, ended) · Lead 30 `local_f37a22d1-…` (14:48-15:45 IST, ended) · Lead 29 `local_ef20bc85-…` (12:35-14:47 IST, ended) · Lead 26 `local_ab55f159-…` ended ~12:30 IST; Leads 27 and 28 were standbys on the old account, never led, deleted (P-396) · Lead 25 ended · Leads 1-24 earlier. Standbys: Lead 33 (watchdog), Lead 34 `local_309261d2-…` (from ~19:50 IST).
