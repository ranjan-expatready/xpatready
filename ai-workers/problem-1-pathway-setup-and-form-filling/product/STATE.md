# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_aa5c12aa-7202-4cec-8459-10f906f7727b Lead 11 · 11 Nov 07:57 IST (series 2; took over from Lead 10 (series 2, local_556afbc8) at ~314k context, ~201k beyond its start read, P-446)

updated: 2026-11-11 07:57 IST by **Lead 10 (series 2, local_556afbc8-…)** at hand-over to Lead 11 · weekly 88% · milestone: **M2 60/60; M3 29 of 29 Works on main**; next: the Bake (M3.5), plan awaiting the founder (P-450) · rules: **`RULES.md`** (as of P-452) · this branch: `lead/2026-11-07-lead31`

## Hand-over: Lead 7 (series 2) → Lead 8 (series 2): word for word in `history/STATE-2026-11-11-0035-lead10s2-lead7-to-lead8-block.md`.

## Lead 40's last block (series 1): `history/STATE-2026-11-09-1748-lead40-final.md` (live items listed there; this page's 02:55 copy keeps the line).

## Hand-over: Lead 10 (series 2) → Lead 11 (series 2), 07:57 IST 11 Nov — read this first (Lead 9's block word for word: `history/STATE-2026-11-11-0800-lead9s2-handover-block.md`)
**Founder awake (typing at 07:3x-07:5x).** Rules as of P-457. Weekly **88%** at 07:57 (~1-2%/h); **at ~91% message every running lane "stop" (push and stop); 93% ≈ 10:00-10:30 IST**, then pause to Sun 15 Nov 22:30 IST (P-431, P-455 (1)). Paid US$0. No subagent running. Founder rule (memory): in every summary put each code's plain-words purpose beside it.
1. **Running (cloud):** BK-3 PR 1 one frame (task_16eb5fe4); BK-10 form rules into data (task_c5c51151); **finish M3-S2 #1513** (task_07d5bc97, started 07:5x; holds the schema + case-prepare baton; hand-over and round-2 review are a PR comment). Recent pushes: `claude/amazing-davinci-wvk1b3`, `claude/dazzling-johnson-j6s8st`.
2. **#1518 ("forms: BK-10 — form rules into data (form-setup.ts names no combination)") has a "Question for the tech lead": answer it first.**
3. Report for the founder: `design/progress-and-roadmap-2026-11-11.md` (night result, sequence to M4, hourly, analysis). Two-day plan: `design/next-2-days-2026-11-11.md`.
4. Fable likely counts against the all-models window (two readings rose together); Fable for planning only (P-455 (5)).
5. Standbys: **Lead 12 `local_ff0a1d2d-7d86-42f4-8234-47fbb72cfc8a`**; start a second at the founder's next typed turn (P-286).

## Tonight (P-453, P-454, from 23:2x IST 10 Nov): plan `design/next-2-days-2026-11-11.md`
**No trip-wire at 75% any more (P-454):** run to 93% weekly, every lane pushed (P-431). **Founder typed 00:5x IST "set SHARDS 8, ready 1502, label 1503":** #1502 marked ready and #1503 labelled by the Lead under his words; **SHARDS 8 refused even with his typed words** (gh and API): **founder ~01:0x IST: "keep on 6" — SHARDS stays 6**; #1502 still lands for its refreshed suite timings (better balance on 6). Lead labels #1502 when its CI on bccf34ef is green (diff read by Lead 9, P-423). Never route through a lane.
**Night result (02:57 IST):** merged #1501 B164, #1504 suite selection, #1502 refreshed timings (SHARDS stays 6, founder), #1505 M3-S1, #1507 M3-S5, #1506 BK-2, #1509 BK-1 baseline (14 Majors), #1510 expert pack, #1503 records. Queue empty; no lane working. Weekly 81% (~2%/h).
**Waiting for the founder's click (cards, cloud):** task_07d5bc97 finish M3-S2 #1513 (draft at 30852243d; hand-over and round-2 review in its PR comment; holds the schema + case-prepare baton); task_c5c51151 BK-10 form rules into data; task_16eb5fe4 BK-3 PR 1 one frame (BK-2 merged, so ready).
**Owed:** qa findings from #1507 (IMM 5669 fill `KeyError: 'datasets'`; Express Entry release has no account); #1505's follow-up questions (PR biometrics line, sponsor-only co-filing, table-level dates); 4 leftover Mac test copies (4475, 4478, 4482, 4494) the sandbox cannot stop: founder's terminal (`isolated.sh <name> <port> stop`); archive the ended lanes (M3-S1, M3-S2 first builder, pipeline, B164, qa C7.5) at the founder's word.

## M3: 29 of 29 Works (21:1x IST 10 Nov, qa #1499 fresh reader; C7.5 + C10.2 on nightly 42841699712, main 87212b14d)
**Next (P-450):** detailed milestone plan with the founder, one question at a time (A5, A7); then the Bake. **#1463** superseded: qa's close refused, waits for the founder's named word.

## Live rows (Lead 9, 19:0x IST): done (29/29); word for word in `history/STATE-2026-11-10-2210-lead9s2-live-rows-1900.md`.

## Live rows (Lead 8, 13:33 IST): superseded by the hand-over block above; word for word in `history/STATE-2026-11-10-1850-lead8s2-live-rows-1333.md`.

## Founder asks (Lead 8, 10 Nov; P-450 (4): stays until ticked)
| # | Ask (IST) | Status |
|---|---|---|
| A1 | 11:4x Bake before M4: screens, flows, one sign-in with role picker, polish, fast UI lane | ruled P-447 to P-449; plan after the 29 |
| A2 | 12:1x why one combination; generic engine for all | ruled P-448/P-449 (generic core in the Bake) |
| A3 | 12:2x CI cut-offs: root cause and lasting fix | #1491 (75 min) in review; next: 8 shards + timing refresh (Lead briefs after #1491); queue every-suite rule after (4a) + a week's measure |
| A4 | 12:3x run tests smartly, no blind testing, no quality cut | answered: PR runs targeted, queue full by design until (4a) proven; approval to come with numbers |
| A5 | 12:4x finish M3; then detailed milestone plan with counted lists before the Chrome extension; internal production grade | P-450; plan after the 29 |
| A6 | approvals one at a time; tell him when to press Demo › Load the finished story | at C10.2 merge (#1482) |
| A8 | 23:0x (10 Nov, Lead 10) plan the next 2 days high level + hourly; best quality and speed; sequence, parallel lanes, models (Fable allowed); one question at a time, no assumptions | done: P-453 to P-455 (pace, night run, burn, expert pack, sample data only, walk as soon as ready, Fable for planning); plan `design/next-2-days-2026-11-11.md` |
| A7 | Fable's questions 16-18 (internal use on what data; employer LMIA side in?; Chrome extension in?) and booking the immigration expert | ask after the 29 |

## For the founder (P-390)
Open F2, F8, F14, F15, F16, F17, F18, F19 (none blocks work), word for word in `history/STATE-2026-11-10-1240-lead8s2-for-the-founder-table.md`; ask at his typed turns, one at a time.

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
**Series 2 (P-433, from 9 Nov 17:48 IST; numbers restart; the current Lead is the one `current_lead:` names):** **Lead 11 (series 2, local_aa5c12aa-7202-4cec-8459-10f906f7727b)** (from 07:57 IST 11 Nov) · Lead 10 (series 2, local_556afbc8-71a2-4cb9-b47f-ab86a53460df) (22:54 IST 10 Nov-07:57 IST 11 Nov, ended at ~314k, P-446) · Lead 9 (series 2, local_d3d09334-4567-4aad-9e1b-65163549d7c7) (18:28-22:54 IST 10 Nov, ended at ~318k, P-446) · Lead 8 (series 2, local_62177923-2726-40ba-a539-da2173222e38) (11:55-18:28 IST 10 Nov, ended at ~315k) · Lead 7 (series 2, local_6426aab1-6fa8-47c0-b228-f03365d5cc4a) (08:13-11:55 IST 10 Nov, ended at ~290k) · Lead 6 (series 2, local_8c1fbca5-d3cf-4bf4-8620-9bdb3c9564ca) (07:35-08:13 IST 10 Nov, ended at ~240k) · Lead 5 (series 2, local_6e87a775-b6a8-4a50-8fa7-ad3b03548af6) (00:48-07:35 IST 10 Nov) · Lead 4 (series 2, local_48335a53-6041-4416-9442-c8814319aa84) (23:44 IST 9 Nov-00:48 IST 10 Nov, ended at ~240k, P-440) · Lead 3 (series 2, local_81ca34d8-6a97-4c29-9fd1-471e42cf7f6f) (22:35-23:45 IST 9 Nov, ended at ~255k, P-440) · Lead 2 (series 2, local_a07b26f2-302e-4c73-bd1c-ca20dd9e8a79) (20:30-22:35 IST 9 Nov, ended at ~370k, P-440) · Lead 1 (series 2, local_f135f805-00be-49fc-ac67-df94b57dbc86) (17:48-20:32 IST 9 Nov, ended at ~400k). Standby: Lead 12 (local_ff0a1d2d); start a second at the founder's next typed turn (P-286).
**Series 1: Leads 1 to 41, before 9 Nov 17:48 IST**, never renamed or renumbered: the full list, word for word, is in `history/STATE-2026-11-09-2130-lead2s2.md` ("Leads, in order").
