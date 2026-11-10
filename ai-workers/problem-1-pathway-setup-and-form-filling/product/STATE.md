# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_d3d09334-4567-4aad-9e1b-65163549d7c7 Lead 9 · 10 Nov 18:28 IST (series 2; took over from Lead 8 (series 2, local_62177923) at ~315k context, ~186k beyond its start read, P-446; Lead 8 held past 200k for the Acrobat step, founder away)

updated: 2026-11-10 18:28 IST by **Lead 8 (series 2, local_62177923-…)** at hand-over to Lead 9 · weekly 53% · milestone: **M2 60/60; M3 25 of 29 Works on main**; target 26, then 29 (P-434, P-439) · rules: **`RULES.md`** (as of P-450) · this branch: `lead/2026-11-07-lead31`

## Hand-over: Lead 7 (series 2) → Lead 8 (series 2), 11:55 IST 10 Nov: word for word in `history/STATE-2026-11-10-1525-lead7s2-handover-block.md` (its rows are carried in Live rows below).
**Founder 12:0x-12:1x IST (Lead 8): Bake answers recorded as P-447** (walk twice as exit, no co-founder watch first, lean cap 24). **Answered ~12:3x as P-448:** Bake = lean Bake + generic engine core (~40 sessions, second exit: no code change, data edits allowed, on Study permit (P-449); screens-only is M4 Track A's exit); founder to book the immigration expert (P-240: nothing Sample releases outside the demo). #1475 requeue refused by the classifier 11:56: founder to tick Mergify's box or name it.
**Lessons (Lead 7):** claude.ai's session list re-renders after load: open a lane by clicking its link found by text in JS, and confirm the title before typing. The auto-mode classifier refuses the Lead's label toggle (remove + re-add) unless the founder names the PR. Fable corrected three of Lead 7's numbers: check evidence before proposing rule changes.

## Lead 40's last block (series 1): `history/STATE-2026-11-09-1748-lead40-final.md` (live items listed there; this page's 02:55 copy keeps the line).

## Hand-over: Lead 8 (series 2) → Lead 9 (series 2), 18:28 IST 10 Nov — read this first
**Lead 9 (series 2, local_d3d09334) start, 18:28 IST:** start context ~118k (get_usage; P-446 (2)): hand over at the first check after ~318k. Check a7b56479 at :13/:43. Weekly 58%.
**Founder away ~15:30-18:30 IST, on Remote Control only.** 27 of 29 Works. Weekly 58% (~2%/h). Paid cap US$30, spent US$0. Records: P-447 to P-450 (Bake, generic core, exit tests, after-M3 plan); founder asks A1-A7 below stay until ticked.
1. **C10.2:** #1492 merged 15:51 (main ddc2a6eb3, demo updated). Lead 8 loaded the finished story (founder pre-approved, see Live rows), copy **9c00dbfc-7f65-4782-8562-b737cd301c57** (case f870d8df…), opened it in Acrobat and pressed Validate: **"Validation completed successfully"** (16:2x). **Not saved:** Acrobat's Save As panel is a separate macOS process outside the computer-use grant; it is open on the Mac now. **Next:** when the founder is back, he saves it (Save As › Downloads, `paper-9c00dbfc-validated.pdf`) or closes the panel; then read back: `curl -s -X POST -H 'x-actor: user-O' -F file=@<file> http://localhost:4400/api/runtime/form-copies/9c00dbfc-7f65-4782-8562-b737cd301c57/validated`, record (`tools/record-validated-samples.ts --paper "the tech lead, Adobe on the Mac"`, commit `samples/validated-imm5257-paper.json`), note printed pages of Languages / Details of visit / Background Information on #1492, dispatch nightly C10.2 checkpoint, then a qa fresh reader → Works. **Do not reload the story before the read-back** (a reload makes the copy stale, 409). Original backed up at the Lead 8 scratchpad `orig-9c00dbfc.pdf` (sha c18c8a145cf5).
2. **C7.5:** unblocked by #1492. Run #1463's kit now: re-measure the sheet (`c75-pack-case.ts`, no `--expect`), checksum in #1463, ledger first, Terminal tab, one attempt; qa labels the result PR. ETA ~17:30.
3. **(4a)** suite-selection fix: C7.8 lane briefed 13:4x; read its PR; P-214.
4. **CI:** #1491 merged (75 min). Next: 8 shards + timing refresh (check CI budget first); `run-suites.sh:252` comment still says 45 min.
5. **Routed findings for qa to log:** IMM 5710 "Canada/CAN/511" Major (LMIA), C6.19 concept.md:16 wording Minor.
6. **After the 29:** the milestone plan with the founder (P-450), one question at a time; Fable's questions 16-18 and booking the immigration expert (A7).
Terminal tabs c6 (caffeinate 4 h, from 15:2x) and c7 (open) are Lead 8's; leave c6 running.

## Tonight (P-451, from 22:0x IST 10 Nov)
| Lane | Session | Row | Next |
|---|---|---|---|
| pipeline | local_8494de44 `pipeline-ci-speed` | measured (3,855 runs: batch median 43.7 min, p90 55.3; 139 of 400 suites had no timing); **#1502** 8 shards (sim: batch ~44 → ~34 min, +2% machine minutes, free runners) → (4a) next | **Founder: repo variable SHARDS=6 overrides; Lead's change to 8 refused by the classifier 22:5x IST: ask the founder to run `gh variable set SHARDS --body 8` or say "set SHARDS 8"**; Lead reads the diff before labelling (P-423) |
| runtime | local_32caa215 `runtime-engine-core` | B164 → M3-S1 (warm) | sole holder of schema / case-prepare tonight |
| Lead | this session | **Bake plan draft done** (`design/bake-plan-2026-11-10.md`, 40 + 15 sessions, exits E1-E4, ~24 Nov); morning: ask its 4 questions one at a time, Q1 first (pace: 3 lanes on plan, recommended) | hourly report IST; trip-wire 75% weekly; caffeinate tab c4 14 h |

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
**Series 2 (P-433, from 9 Nov 17:48 IST; numbers restart; the current Lead is the one `current_lead:` names):** **Lead 8 (series 2, local_62177923-2726-40ba-a539-da2173222e38)** (from 11:55 IST 10 Nov) · Lead 7 (series 2, local_6426aab1-6fa8-47c0-b228-f03365d5cc4a) (08:13-11:55 IST 10 Nov, ended at ~290k) · Lead 6 (series 2, local_8c1fbca5-d3cf-4bf4-8620-9bdb3c9564ca) (07:35-08:13 IST 10 Nov, ended at ~240k) · Lead 5 (series 2, local_6e87a775-b6a8-4a50-8fa7-ad3b03548af6) (00:48-07:35 IST 10 Nov) · Lead 4 (series 2, local_48335a53-6041-4416-9442-c8814319aa84) (23:44 IST 9 Nov-00:48 IST 10 Nov, ended at ~240k, P-440) · Lead 3 (series 2, local_81ca34d8-6a97-4c29-9fd1-471e42cf7f6f) (22:35-23:45 IST 9 Nov, ended at ~255k, P-440) · Lead 2 (series 2, local_a07b26f2-302e-4c73-bd1c-ca20dd9e8a79) (20:30-22:35 IST 9 Nov, ended at ~370k, P-440) · Lead 1 (series 2, local_f135f805-00be-49fc-ac67-df94b57dbc86) (17:48-20:32 IST 9 Nov, ended at ~400k). Standby: none; start two at the founder's next typed turn (P-286).
**Series 1: Leads 1 to 41, before 9 Nov 17:48 IST**, never renamed or renumbered: the full list, word for word, is in `history/STATE-2026-11-09-2130-lead2s2.md` ("Leads, in order").
