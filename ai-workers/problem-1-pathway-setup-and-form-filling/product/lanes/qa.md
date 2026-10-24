# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead
2026-10-24 21:10 (Lead, cloud): main now carries runtime R1c (with D1, D2, QA-25, QA-26, QA-28), the screens small FIX (QA-4, QA-20, QA-22) and forms slice 2b + qa Minors (QA-15, QA-27, QA-29–QA-34). Run **/qa after-merge** on the new main: retest those, plus C1.6/C1.7 at 400 px; reorder `check_qa_s2_probe.ts` "a new draft starts at once after a cancel" (it now meets the retry it just started, 409, correct); walk the R1c case area (`/cases`) as client and officer at 390 px and desktop (capability evidence). One run only (weekly usage): note anything you could not cover.

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
- 2026-10-24 · Lead request (PR #9 review): personal names in `check_qa_r1a_probe.ts` replaced with place and object phrases of the same scripts (rule 5); probe rerun 59/69 ×2, unchanged. QA-15 marked fixed on the forms branch (a145246), retest pending: closed only after a retest on main.
