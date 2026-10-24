# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead
2026-10-24 22:00 (Lead, cloud): report read; questions answered — (1) a demo reset of :4400 before the founder's walk goes to the founder with the walk; (2) QA-14 was fixed exactly so (database uniqueness on the normalised name) and your replay now passes on main (20 × 4 → one 201 each). Assigned: QA-19 → Lead (demo reset, founder's OK); QA-20 → screens; QA-21 → closed by the screens lane's L2 wait (browser 136/136). `tests/qa/package.json` (`"type": "module"`) added on main: your top-level-await checks failed in a clean clone. Run **/qa after-merge** on the new main (Screen 01 small FIX, forms slice 2, runtime R1a, evidence IMM 5409): retest QA-14, QA-17, QA-21, QA-4 and QA-8 in a fresh copy; walk C1.6/C1.7 at 400 px (QA-20); add capability evidence for the forms slice 2 drafting (API, US$0) and R1a (API). Screen 01 is DONE when this passes.

Command: `/qa <mode>` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: after-merge on main db468e38 (Screen 01 small FIX, forms slice 2, runtime R1a, evidence IMM 5409)
stage: WAITING
owner: Lead
next_action: Lead reads `qa/reports/2026-10-24-after-merge-2.md` (no Blocker or Critical; Screen 01 passes from qa), assigns QA-22–QA-34, answers three questions (QA-24 severity; should an unconfirmed birth date decide P-78; QA-34 coverage tests in forms slice 2b).
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-23 · Lead: lane created at the founder's request (R-82, P-68); ports 4470–4479, databases `qa_*`.
- 2026-10-23 · QA-0 `/qa milestone` on main 141194dc: not ready — QA-1 Critical reproduced (API and browser); 5 Major, 6 Minor (new QA-4–QA-12); red suites: AI drafting, orchestration (lane copy), Studio browser, scale; coverage floor api 93/74, engine 94/85; Screen 01 journey 7.5/10 with a 0. Four capability rows added (Lead note).
- 2026-10-23 · after-merge on main 65826022 (F1 slice 1): QA-2 closed, QA-4 half fixed, QA-1 still open; slice 1 sound through the API (probe 25/26, suite 106/106); new QA-13–QA-18 (QA-14 name race turns grounding red; QA-18 engine branches 84.7% < 85% floor); browser journeys not reliable at load 22–112.
- 2026-10-24 · after-merge Screen 01 (1cb174a6) on main e742bc59: 12 findings closed (QA-1, 3, 5, 6, 7, 9, 10, 11, 12, 13, 16, 18); C1.6, C1.7, C2.7, C2.10, C3.10 walked; journeys 47/47 ×3; open 0 Critical · 3 Major · 5 Minor (new QA-19–21); floor api 95/79, engine 98/86; Screen 01 journey 9/10.
- 2026-10-24 · applied Lead note 2026-10-24 22:00 (cloud session). after-merge on main db468e38: suites 16/16 (run 2 under coverage 15/16: p2 guard vs the coverage preload, 75/75 without); QA-8, 14, 17, 21 closed; QA-4, QA-20 open; forms slice 2 probe 45/57, R1a probe 59/69; new QA-22–QA-34 (Majors: QA-23 D1, QA-24 D2, QA-29 D3, QA-34 api coverage 93.97/77.67 < floor); engine floor 99/86; Screen 01 9/10. US$0.
