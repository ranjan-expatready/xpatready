# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_81ca34d8-6a97-4c29-9fd1-471e42cf7f6f Lead 3 · 9 Nov 22:35 IST (series 2; took over from Lead 2 (series 2, local_a07b26f2) at ~370k context, P-440)

updated: 2026-11-09 22:35 IST by **Lead 2 (series 2, local_a07b26f2-…)** at hand-over to Lead 3 (series 2, local_81ca34d8-…) · weekly 8% at 22:30 IST · milestone: **M2 60/60 holds; M3 20 of 29 Works on main (C7.10, C6.13, C6.14, C3.16 merged since 17:48); target 26 (P-434)** · rules: **`RULES.md`** + DECISIONS P-354 to P-438 · Lead 1's full page: `history/STATE-2026-11-09-2030-lead1s2.md` · this branch: `lead/2026-11-07-lead31`

## Hand-over: Lead 2 (series 2) → Lead 3 (series 2), 22:35 IST — read this first
**Founder's goal (P-434, P-439):** 26 of 29 Works first, then all 29, as fast as the gates allow; hourly report in IST (Works, merged, blocked, next three); stop clean at 95% weekly. Standing approvals (P-434): requeue, retarget, draft/ready, re-run failed CI parts, label on Approve + green; paid runs to US$50 today, ledger first (spent ~US$2: C6.5 reads US$0.026 + a US$0.196 unbilled reservation, C7.5 checkpoint US$0.89). **New today: P-440 token hard rules** (RULES.md "Tokens"; hand over at ~250k; refresh RULES at each hand-over).
**Works on main 20.** Last founder message ~22:30 IST. Lead 2's full page: `history/STATE-2026-11-09-2235-lead2s2-final.md`.
| Row | Where it stands (22:35 IST) | Next step | ETA IST |
|---|---|---|---|
| C6.16 | #1257 merged | cloud qa-c616 round; Lead dispatches its nightly when asked | ~23:45 |
| C6.17 | #1262 labelled, in queue | qa-c617 waits for the merge, then its round | ~00:30 |
| C8.3 | #1440 labelled (migration read: guard function only) | qa-c83b after merge (QA-345) | ~01:00 |
| C6.19 | #1441 labelled | qa-c619 after merge (QA-338) | ~01:00 |
| C7.3 | #1430 labelled | qa-c73-c102 after merge; **Lead's Adobe Validate (Acrobat granted to Lead 2 only: re-ask `request_access` "Acrobat" in a founder-typed turn)** | ~02:00 |
| C10.2 | #1435 labelled | same lane; Lead's Adobe Validate of the Paper IMM 5257 | ~02:30 |
| C7.5 | #1396: checkpoint run committed b0727d19b (run 242bb5a6) | qa-c75 labels #1396 on green (P-275), then its round | ~01:30 |
| C6.5 | #1444 54/56: "14200.00" is text; ruling on #1444 | cloud fix-c65-number, then diff-only Opus, then qa labels | ~02:30 |
| C7.8 | QA-355 (qa #1446, labelled) | cloud fix-qa355 (#1450 draft); then qa gate A + nightly | ~03:00 |
**Also:** #1446 qa records labelled (records queue). The Lead's records PR from `lead/2026-11-07-lead31` (P-440 RULES, check-docs guard, skills) opens when the queue is empty (P-436 (3)). C7.5 run kit: `side-session-notes/local_f135f805-…/c75-checkpoint-run.sh`, scratch `$TMPDIR/c75` (`.tools` linked). Sandbox lessons: the drafting child gets no proxy (live launcher runs from a Terminal tab); simple reads go by curl with `allowed_domains`; `pg_ctl status` cannot see Postgres from the sandbox (it runs).
**Sessions (series 2):** Lead 4 standby `local_48335a53-…`; one more standby at the founder's next typed turn (asked at 22:35). Cloud lanes (count after a push): fix-c65-number, fix-qa355, qa-c616, qa-c617, qa-c75, qa-c83b, qa-c619, qa-c73-c102.

## Lead 40's last block (series 1): word for word in `history/STATE-2026-11-09-1748-lead40-final.md`; still live: old qa copy `.claude/worktrees/qa-2026-11-06-m2-walk-c8dd7e` (keep), follow-ups #1409 m10/m11, C7.9 wording (#1257 note), QA-326 to QA-328.

## For the founder (P-390: asked at his next typed turn, oldest first, one at a time)
F1, F3, F4, F5 answered (P-391, P-393, P-396, P-403; rows in `history/STATE-2026-11-07-1545-lead30.md`); F7 answered (P-406; row in `history/STATE-2026-11-07-1555-lead31.md`). F9-F13 answered 18:25-18:36 IST, all as recommended (P-412; rows in `history/STATE-2026-11-07-1837-lead31.md`).

| # | Question | Lead's recommendation | Blocks | Since | Status |
|---|---|---|---|---|---|
| F2 | Look at C6.9's new screen (A4, #1172) with `reports/best-in-class-C6.9-A4-2026-11-07.md` | changes become follow-up rows | nothing | 7 Nov 08:35 | open: qa's walk screenshots landed with #1199 |
| F8 | Look on the demo at the M3 screens merged since P-392 (B1 documents, A2/QA-293 representative's tab, B124, B126) with the drift audit (`reports/m3-screens-vs-boards-2026-11-07.md`) | show with B147's tab; no decision needed now | nothing | 7 Nov 15:50 | open (P-408) |
| F14 | FQ-7: which date a recorded group's ages count on (B152 #1279: a submission recorded later than its "Submitted on" date) | the recording day for now (as built); price at "Submitted on" in a follow-up row | nothing (B152 carries on) | 7 Nov 20:30 | open |
| F15 | CI lane's D2 deviation (#1337): a Partial row reached only through a shared file its pack reads is listed, not run, so already-red Partials (e.g. C7.5) don't refuse unrelated PRs. Also: may the Lead delete the throwaway branches `throwaway/d6-rerun-base` and `throwaway/d2-c73-by-diff`? | accept the deviation; yes, delete both | nothing | 8 Nov 17:25 | open |
| F16 | C7.8 (B141) F1-F3: form with no passed trial is a Blank official PDF; blank added form with no completed copy is a CRITICAL warning passed with a reason; F3 as its concept recommends | built as recommended (reversible, P-390) | nothing | 9 Nov 09:20 | open |
| F17 | C7.10 (B143) BR-9: the figure departs from BR-30 so that 100 means Ready (documents done when received, every finding counted, no form approval, no retainer or deficiency library) | as built (reversible, P-390) | nothing | 9 Nov 09:58 | open |
| F18 | C6.14 (B136) when nobody matches: filing's first applicant or principal applicant (SA-1B-151 reads two ways; differs on a couple-once line on Visitor visa) | first applicant, as built (reversible) | nothing | 9 Nov 11:28 | open |

## Start here (next Lead)
**Roles (P-384):** the founder gives product direction only; the Lead owns the pipeline. Every label needs a PR comment line `Reviewer: Approve <head sha>` (label guard). Records-only PRs: the Lead labels after reading the diff (P-385); `records` queue. GitHub: curl + `gh auth token` with `allowed_domains` (P-363). Times only from `TZ=Asia/Kolkata date`. Notes: `~/Library/Application Support/Claude/side-session-notes/lead10-saved-2026-11-05/` (never a folder named for a session); Lead 26's are in `history/lead-notes-2026-11-07/`.
**Founder, 18:41 IST (P-413): no new lane until one ends; warm rows first; Works before new rows (C4's pack port is the critical path); concept lanes write no new concepts until builds catch up.** **Founder, ~15:50 IST (P-410):** the Lead labels all approved green PRs, its own records too; no token cap, quality guards stay; the 50%-by-22:00 trip-wire is lifted. **Auto-mode rule (P-405, ~15:15 IST):** `~/.claude/settings.json` `autoMode` now allows the Lead's labels on Approve + green CI, its own records-only PR approval and label, and nightly.yml dispatch on main. First use is the test: on a refusal, ask the founder in one line as before and note it in DECISIONS. **Standing OK (P-402, 14:30 IST):** the Lead labels approved green PRs and dispatches re-tests on main without naming each. **Was refused before P-405:** the Lead's Approve and label on its own records PR (Self-Approval); try under P-405 first, then the founder names it ("label <n>"). **Permission check (7 Nov):** never route a refused write through a lane. Never route a refused write through a lane, and never split a refused command to retry it (12:39 IST: refused as a bypass).
**Stall guard (P-388, P-389):** no prompt-waiting call while the founder is away; `lead-watch.sh` ACT when the last check is over 40 min old. Watchdog: first standby (Lead 34 once Lead 33 tells it).
**Hand-over (P-409):** no hand-over with an in-process subagent running; its result goes to a file named in the hand-over block; briefs say report to the current Lead. Skill edit at the founder's next typed turn.
**Never run guard/test suites in the main copy** (7 Nov 09:18 incident): scratch clone only, deleted after.
**To-do, in order:**
1. Check (:13/:43, prompt exactly `run lead-watch; read STATE Start here`).
2. **Lanes, counted only after a push:** the live list in the Lead 32 block (P-414). Read each lane's newest PR comment for "tech lead" every check, and reply in its claude.ai session.
3. **qa:** re-scores after each merged batch; C6.9 and C8.2 Works on qa's #1238.
4. **P-388 measurement:** 2 failed of the first 10 batches after 09:19 IST (23113b92e5 the C1 and A3 clash; 0f532b98fc not read yet): 20%, over the 10% bar. `flow-measure.py` hit a rate limit today: read `actions/workflows/ci.yml/runs` directly. Trip-wire: P-399.
5. **Hourly report** against `design/next-12-hours-2026-11-07.md` section 7 (P-399); halfway review 20:00 IST, block review 02:00 IST.
6. **Records:** on `lead/2026-11-07-lead31` from the scratch worktree `$TMPDIR/lead31-merge`; records PR not opened yet (once a day, P-336).

## Leads, in order
**Series 2 (P-433, from 9 Nov 17:48 IST; numbers restart; the current Lead is the one `current_lead:` names):** **Lead 3 (series 2, local_81ca34d8-6a97-4c29-9fd1-471e42cf7f6f)** (from 22:35 IST 9 Nov) · Lead 2 (series 2, local_a07b26f2-302e-4c73-bd1c-ca20dd9e8a79) (20:30-22:35 IST 9 Nov, ended at ~370k, P-440) · Lead 1 (series 2, local_f135f805-00be-49fc-ac67-df94b57dbc86) (17:48-20:32 IST 9 Nov, ended at ~400k). Standby: Lead 4 (series 2, local_48335a53-6041-4416-9442-c8814319aa84).
**Series 1: Leads 1 to 41, before 9 Nov 17:48 IST**, never renamed or renumbered: the full list, word for word, is in `history/STATE-2026-11-09-2130-lead2s2.md` ("Leads, in order").
