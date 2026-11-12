# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_08cf41af-225a-44c9-9d75-2060969d3cca Lead 25 · 12 Nov 14:3x IST (series 2; took over from Lead 24 (series 2, local_5935338b) at ~320k context, ~200k beyond its start read, P-446); start read: measure with get_usage; hand over 200k beyond it

updated: 2026-11-12 14:3x IST by **Lead 25 (series 2, local_08cf41af-…)** after take-over (start read ~112k; hand over at ~312k) · weekly 37% at 14:28 (resets 13 Nov 04:30 IST) · milestone: **M2 60/60; M3 29/29; Bake (M3.5) running; walk 0 Majors 2 of 4 merged** · rules: **`RULES.md`** (as of P-496) · this branch: `lead/2026-11-07-lead31`

Tonight, Next 7 hours and M3 pointer sections: `history/STATE-2026-11-11-1245-lead15s2-pointer-sections.md`. Earlier blocks (Lead 40's last, Lead 7→8 hand-over, Lead 8 and Lead 9 live rows): pointers word for word in `history/STATE-2026-11-11-0815-lead11s2-pointer-lines.md`.

## Hand-over: Lead 24 (series 2) → Lead 25 (series 2), 14:3x IST 12 Nov — read this first (Lead 23→24 block with Lead 24's live and check lines, word for word: `history/STATE-2026-11-12-1430-lead23s2-to-lead24-block-with-lead24-live.md`)
**Founder awake and steering.** Rules as of **P-496** (RULES refreshed). Weekly **36%** at 13:57 (~2%/h; resets 13 Nov 04:30 IST). Paid US$0. P-478 report format. Lane reads in the built-in browser: navigate to the session, focus `[aria-label="Prompt"]` by script, type, press Return, confirm the text in `main.innerText`. Direct `start_session` only on the founder's own typed words; otherwise a card.
1. **Act first (14:27 check):** **#1628** (BK-5 PR 2) dequeued: read the batch's failing check and brief the screens chain lane (`session_01Ln6TiRwy1GuGJrsFtDqs8i`). **#1632** shows a "new question": it may be the Lead's own P-496 ruling comment, so check for a newer lane comment. **#1631** (quarantine, P-214) and #1627 (requeued) in the queue.
2. **Open, owner → next:**
   - **#1612 BK-17:** dequeued twice on its own `check_bk17` (main's BK-15/16 give the child their own Visitor visa). A **fresh cloud lane started by the founder ~13:5x** fixes the test set-up (comments 6818122187, 6818666209); conflicts only in `case-prepare.ts`.
   - **#1633 A24-1** (case numbers; schema baton + `case-prepare.ts` baton for the `reference` fix only, P-496 (2)). The Lead reads the schema diff before merge (P-423).
   - **#1632 BK-16 PR 2:** option (A) ruled (P-496 (1)), diff-only re-review next.
   - **#1620 QA-415 Critical:** round 3 allowed (comment 6817551580).
   - **#1616 qa records:** the founder said "Yes, label #1616". It conflicts in `qa/BUGS.md`; the qa lane (`session_01Ln6TiTkKbDWScv7X7oYWcJ`) was told to merge main keeping both. Then the Lead posts `Reviewer: Approve <new head>` (the founder named it) and qa labels.
   - **Screens chain:** QA-417 → BK-5 PR 2 (#1628) → A24-2 → A24-3 (labels held to walk 1, P-492).
   - **Extension SP-1 lane** (cloud, started ~13:5x): scratch only, a reuse note under design/ on its branch.
   - qa UX friction sweep (A25), cloud.
3. **Founder:** sending the counsel brief (Part A) and the expert's SP-2 ask (Part B) of `design/counsel-brief-extension-2026-11-12.md`. When the expert's screens come, they go to `sources/portal-screens-2026-11/<portal>/` (never pushed). Extension plan P-495: three lanes from 16 Nov, Sample-complete 24 Nov-2 Dec IST (B184).
4. **Owed:** SI-6 wording into STAND-INS.md; D8's two Sample points + A24's three expert points + the top-types ranking to the expert; P-487 own rows; night (P-489 (5)): one spare cloud lane at the founder's last typed turn. Nightly C4.11 on the checkpoint dispatched 13:1x (row Q-c411-ckpt).
5. **Standbys:** Lead 26 `local_dea96486-fb3d-4970-883f-8610e8b5fdb1` stays; start one more at the founder's next typed turn. Lead 24's check f13c1979 is deleted; create yours. Stale worktree `heuristic-nobel-d679f0` (B170a, B178 merged): delete under P-468 after checking.

**Lead 25 live:** check 94a9e075 at :13/:43; earlier live and check lines word for word in `history/STATE-2026-11-12-1530-lead25s2-live-and-check-1450.md`. Standbys: Lead 26, Lead 27 (`local_9ab495f0-…`). Cleanup 15:2x: 4 local and 9 cloud finished sessions archived (A27).

## Founder asks (Lead 8, 10 Nov; P-450 (4): stays until ticked)
| # | Ask (IST) | Status |
|---|---|---|
| A5 | 12:4x finish M3; then detailed milestone plan with counted lists before the Chrome extension; internal production grade | P-450; plan after the 29 |
| A9-A13 | answered or in hand (A12 co-founder copy: B168; A13 low scores: P-460) | word for word in `history/STATE-2026-11-11-1320-lead15s2-founder-asks-A9-A13.md` |
| A18, A20, A21, A22 | done or answered | word for word in `history/STATE-2026-11-12-1000-lead23s2-founder-asks-A18-A20-A22.md` |
| A27 | 15:1x (12 Nov) clean up lanes (working vs done); our speed; would 10 laptops/subscriptions help; speed at 500-600 capabilities; industry and Anthropic practice; what to change; "everything in 1 week"; product PRs only, not docs/workflow | lanes: 13 archived, 10 old merged lanes await his OK; speed measured by files changed (`reports/merged-prs-by-files-2026-11-02-to-12.tsv`): 276 of 634 merges since 2 Nov changed app code; answer given; scope ruled P-499 (Bake + walks + M4 core by ~19 Nov; extension per P-495) |
| A26 | 13:0x (12 Nov) basket and combinations count | done (P-493); word for word in `history/STATE-2026-11-12-1330-lead24s2-founder-ask-A26.md` |
| A25 | 13:1x (12 Nov) case reference should be system generated; find every such small UI/UX friction across the end-to-end journey | case number in A24-1/A24-2 (P-492); sweep done (#1637: 24 rows, 3 Major, 0 dead ends); ruled P-498: 3 Majors + QA-441 in the Bake now, 20 Minors after walk 1 |
| A24 | 12:2x-12:5x (12 Nov, spoken, after a demo to the co-founder) case structure, applicants, case UX; find what we miss; no over-engineering (value vs cost; never compromise compliance, money, quality) | in progress: Fable session `local_1539d135-194f-45a0-8db3-70778d8be072` (branch fable-case-structure-a24); detail word for word in `history/STATE-2026-11-12-1255-lead23s2-founder-ask-A24-detail.md`; **ruled P-492** (slice after walk 1, before cold walk; case rule adopted; per-application combination waits for a trigger); A24-1 is a card (task_dace28c4, cloud; direct start refused) and holds the schema baton once started; A24-2/A24-3 are at the end of the screens chain, label held until the Lead says go after walk 1 starts (delivered) |
| A23 | standing (P-486) | word for word in `history/STATE-2026-11-12-1240-lead23s2-founder-ask-A23.md` |
| A1-A4, A6, A8 | done/answered (ruled P-447 to P-449, P-453 to P-455) | word for word in `history/STATE-2026-11-11-0845-lead11s2-founder-asks-done.md` and `history/STATE-2026-11-11-0840-lead11s2-founder-asks-A3-A4-A6.md` |
| A7 | Fable's questions 16-18 (internal use on what data; employer LMIA side in?; Chrome extension in?) and booking the immigration expert | ask after the 29 |
| A19 | 12:2x-12:5x (11 Nov, spoken) parts (a)-(l) | in progress; word for word in `history/STATE-2026-11-11-2055-lead19s2-founder-ask-A19.md` |

## For the founder (P-390)
Open F2, F8, F14, F15, F16, F17, F18, F19 (none blocks work), word for word in `history/STATE-2026-11-10-1240-lead8s2-for-the-founder-table.md`; ask at his typed turns, one at a time.

## Start here (next Lead)
**Roles (P-384):** the founder gives product direction only; the Lead owns the pipeline. Every label needs a PR comment line `Reviewer: Approve <head sha>` (label guard). Records-only PRs: the Lead labels after reading the diff (P-385); `records` queue. GitHub: curl + `gh auth token` with `allowed_domains` (P-363). Times only from `TZ=Asia/Kolkata date`. Notes: `~/Library/Application Support/Claude/side-session-notes/lead10-saved-2026-11-05/` (never a folder named for a session); Lead 26's are in `history/lead-notes-2026-11-07/`.
Older founder rules (P-413, P-410, P-405, P-402), word for word: `history/STATE-2026-11-11-2045-lead19s2-start-here-old-founder-rules.md`.
**Stall guard (P-388, P-389):** no prompt-waiting call while the founder is away; `lead-watch.sh` ACT when the last check is over 40 min old. Watchdog: first standby (Lead 34 once Lead 33 tells it).
**Hand-over (P-409):** no hand-over with an in-process subagent running; its result goes to a file named in the hand-over block; briefs say report to the current Lead. Skill edit at the founder's next typed turn.
**Never run guard/test suites in the main copy** (7 Nov 09:18 incident): scratch clone only, deleted after.
**To-do, in order (Lead 11, 11 Nov):** (earlier list word for word: `history/STATE-2026-11-11-0910-lead11s2-old-todo.md`)
0. **Founder, 11 Nov ~13:5x IST (typed to Lead 16):** every check opens claude.ai and reads **each lane's last message**, not only the list or GitHub; a lane idle after "usage limit", or with a background run that died, gets "continue" and its next step at once; flag any limit hit to the founder. (13:4x: 8 lanes were idle after the account's limit and the reset; all restarted by Lead 16, verified Running.)
1. Check (:13/:43, prompt exactly `run lead-watch; read STATE Start here`): usage (P-458: lanes stop at 96%, Lead's records by 98%), lanes, queue.
2. Lanes count only after a push; read each lane PR's newest comment for "tech lead" and reply in its claude.ai session (built-in browser while Chrome is disconnected).
3. Next 7 hours G1-G6 above; hourly report in IST with each code's plain purpose beside it.
4. Records on `lead/2026-11-07-lead31`; STATE under 12 KB.

## Leads, in order
**Series 2 (P-433, from 9 Nov 17:48 IST; numbers restart; the current Lead is the one `current_lead:` names):** **Lead 24 (series 2, local_5935338b-3a6c-4500-8cf4-bc3c766afb2b)** (from 12:5x IST 12 Nov) · Lead 23 (series 2, local_395aab75-65a4-42b4-8687-2da747fb96f5) (08:59-12:5x IST 12 Nov, ended at ~300k, P-446) · Lead 22 (series 2, local_99d39f48-9a5d-4c1d-b146-66b246983fd7) (07:2x-08:59 IST 12 Nov, ended at ~317k, P-446) · Lead 21 (series 2, local_407f58ad-835a-41fc-9b7f-dfbf2313f1b6) (01:24-07:2x IST 12 Nov, ended at ~312k, ~188k beyond its start read, P-446) · Lead 20 (series 2, local_0d26f5c0-7160-4e2d-b504-3a525a7ac257) (22:13 IST 11 Nov-01:2x IST 12 Nov, ended at ~305k, P-446) · Lead 19 (series 2, local_1b18db48-92c8-4311-8b72-40221371db4b) (20:14-22:1x IST 11 Nov, ended at ~305k, P-446) · Lead 18 (series 2, local_0e19ea76-e360-4637-baeb-03445e46ef55) (17:27-20:1x IST 11 Nov, ended at ~306k, P-446) · Lead 17 (series 2, local_6fc6d874-c86a-46c9-9dc0-d6a28e84b1d7) (14:16-17:2x IST 11 Nov, ended at ~318k, P-446) · Lead 16 (series 2, local_02100e4c-daf2-4d75-8df0-88ea299ff96b) (13:03-14:1x IST 11 Nov, ended at ~276k, P-446) · Lead 15 (series 2, local_f064f47d-bab7-412b-96a7-32c5ffe77ba8) (12:0x-13:0x IST 11 Nov, new account, ended at ~314k; Leads 13, 14 were standbys on the old account, never took over) · **Lead 12 (series 2, local_ff0a1d2d-7d86-42f4-8234-47fbb72cfc8a)** (from 09:5x IST 11 Nov) · Leads 1-11 (series 2) word for word in `history/STATE-2026-11-11-1347-lead16s2-leads-1-to-11.md`. Standby: **Lead 25 `local_08cf41af-225a-44c9-9d75-2060969d3cca`** (started 09:1x 12 Nov by the founder's click).
**Series 1: Leads 1 to 41, before 9 Nov 17:48 IST**, never renamed or renumbered: the full list, word for word, is in `history/STATE-2026-11-09-2130-lead2s2.md` ("Leads, in order").
