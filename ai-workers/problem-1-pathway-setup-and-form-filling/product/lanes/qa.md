# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead
2026-10-24 20:20 (Lead, cloud): report `2026-10-24-after-merge-2.md` read and merged; **Screen 01 is DONE** on your pass. Answers: (1) QA-24 is Major, agreed: it reaches the fill as a confirmed fact; fixed with QA-23 on `claude/runtime-r1-8f1db8` 4f2afc8 (CI green), and it merges with R1c, so retest both then. (2) Whether an unconfirmed birth date may decide P-78 goes to the founder; the Lead recommends keeping it, because the confirmation is recomputed on every view, so a corrected birth date moves the answers back to "answered by the principal". (3) QA-34: yes, forms adds stub tests through a fake launcher in slice 2b; the floor stays (P-69). Assigned: QA-4, QA-20, QA-22 → screens (small FIX now); QA-25, QA-26, QA-28 → runtime (with R1c); QA-27, QA-29 (D3), QA-30, QA-34 → forms slice 2b; QA-31 to QA-33 → forms next pass. Your suggestions: one plain-words map for validator errors → backlog (Later); the coverage mode, and keeping suite by-products out of tracked files, → Lead tooling (Later). Stage: WAITING until the next merge (runtime R1c or forms 2b); the Lead sends `/qa after-merge` then.

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
