# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead
2026-10-24 22:20 (Lead, cloud): report `2026-10-24-after-merge-3.md` read and merged; thank you. Answers: (1) QA-35 is fixed now, first in runtime's R1d pass. (2) QA-36: both paths behave the same under P-47: the answer is saved (never lost), the field shows its problem, and no plain "✓ Saved" while an answer needs a fix. Assigned: QA-35, QA-36, QA-37 and the rest of QA-26 → runtime (R1d pass). QA-19 stays with the Lead (demo reset on the Mac, founder OK). The new floors (api 95/80, engine 99/87) are accepted. Stage: WAITING until runtime's R1d merges; the Lead sends `/qa after-merge` then.

Command: `/qa <mode>` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: after-merge on main 12e7207 (runtime R1c, screens small FIX, forms slice 2b + qa Minors)
stage: WAITING
owner: Lead
next_action: Lead reads `qa/reports/2026-10-24-after-merge-3.md` (no Blocker or Critical; 15 findings closed), assigns QA-35 (Major, blank case area from the Demo menu), QA-36, QA-37 and the rest of QA-26 to runtime, answers two questions (QA-35 fix now or next stage; should Back apply Save and continue's checks).
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-23 · Lead: lane created at the founder's request (R-82, P-68); ports 4470–4479, databases `qa_*`.
- 2026-10-23 · QA-0 `/qa milestone` on main 141194dc: not ready — QA-1 Critical reproduced (API and browser); 5 Major, 6 Minor (new QA-4–QA-12); red suites: AI drafting, orchestration (lane copy), Studio browser, scale; coverage floor api 93/74, engine 94/85; Screen 01 journey 7.5/10 with a 0. Four capability rows added (Lead note).
- 2026-10-23 · after-merge on main 65826022 (F1 slice 1): QA-2 closed, QA-4 half fixed, QA-1 still open; slice 1 sound through the API (probe 25/26, suite 106/106); new QA-13–QA-18 (QA-14 name race turns grounding red; QA-18 engine branches 84.7% < 85% floor); browser journeys not reliable at load 22–112.
- 2026-10-24 · after-merge Screen 01 (1cb174a6) on main e742bc59: 12 findings closed (QA-1, 3, 5, 6, 7, 9, 10, 11, 12, 13, 16, 18); C1.6, C1.7, C2.7, C2.10, C3.10 walked; journeys 47/47 ×3; open 0 Critical · 3 Major · 5 Minor (new QA-19–21); floor api 95/79, engine 98/86; Screen 01 journey 9/10.
- 2026-10-24 · applied Lead note 2026-10-24 22:00 (cloud session). after-merge on main db468e38: suites 16/16 (run 2 under coverage 15/16: p2 guard vs the coverage preload, 75/75 without); QA-8, 14, 17, 21 closed; QA-4, QA-20 open; forms slice 2 probe 45/57, R1a probe 59/69; new QA-22–QA-34 (Majors: QA-23 D1, QA-24 D2, QA-29 D3, QA-34 api coverage 93.97/77.67 < floor); engine floor 99/86; Screen 01 9/10. US$0.
- 2026-10-24 · Lead request (PR #9 review): personal names in `check_qa_r1a_probe.ts` replaced with place and object phrases of the same scripts (rule 5); probe rerun 59/69 ×2, unchanged. QA-15 marked fixed on the forms branch (a145246), retest pending: closed only after a retest on main.
- 2026-10-24 · applied Lead note 2026-10-24 21:10. after-merge on main 12e7207 (one run): suites 19/20 + p2 guard 75/75 plain; closed QA-4, 15, 20, 22–25, 27–34; QA-26 2 of 3; R1c walk 24/27 (officer and client, 1440 and 390 px); new QA-35 Major (blank case area from the Demo menu), QA-36, QA-37 Minor; coverage api 95.95/80.95, engine 99.39/87.53, floor 95/80 · 99/87. US$0.
