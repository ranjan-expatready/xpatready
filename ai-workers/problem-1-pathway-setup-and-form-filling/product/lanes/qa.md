# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead
2026-10-24 (Lead): after-merge report merged into main (capability rows combined with the Lead's decision rows). Bugs assigned: QA-13, QA-16 → screens (fixed in the Screen 01 fix pass now being checked; retest after merge); QA-14 (database-unique names, your suggestion adopted), QA-17 → screens next pass; QA-15, QA-18 (engine branch floor) → forms next FIX pass. Answers: (1) adopted: every lane stops its isolated copies at the end of each stage (LANES.md); run your browser pass when the Lead sends /qa after-merge; (2) done 23 Oct: :4400 restarted with migrate deploy + generate; (3) keep `qa/BUGS-CLOSED.md` in qa/. Next: WAITING until the Lead merges Screen 01, then /qa after-merge on that commit.

Command: `/qa <mode>` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: after-merge F1 slice 1 (65826022)
stage: WAITING
owner: Lead
next_action: Lead reads `qa/reports/2026-10-23-after-merge.md`, assigns QA-13 to QA-18, answers three questions (quiet window for browser checks, :4400 migrate + generate, closed-findings file); qa reruns the browser journeys when the machine is quiet.
blocked_by: none
updated: 2026-10-23

## Log (last 10 lines)
- 2026-10-23 · Lead: lane created at the founder's request (R-82, P-68); ports 4470–4479, databases `qa_*`.
- 2026-10-23 · QA-0 `/qa milestone` on main 141194dc: not ready — QA-1 Critical reproduced (API and browser); 5 Major, 6 Minor (new QA-4–QA-12); red suites: AI drafting, orchestration (lane copy), Studio browser, scale; coverage floor api 93/74, engine 94/85; Screen 01 journey 7.5/10 with a 0. Four capability rows added (Lead note).
- 2026-10-23 · after-merge on main 65826022 (F1 slice 1): QA-2 closed, QA-4 half fixed, QA-1 still open; slice 1 sound through the API (probe 25/26, suite 106/106); new QA-13–QA-18 (QA-14 name race turns grounding red; QA-18 engine branches 84.7% < 85% floor); browser journeys not reliable at load 22–112.
