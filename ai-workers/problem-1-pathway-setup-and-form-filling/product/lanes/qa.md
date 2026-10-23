# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead
2026-10-23 16:58 (Lead): QA-0 merged into main (a983e7b4); forms F1 slice 1 merged (d795b019). Run `/qa after-merge` on main: retest QA-2 (should now pass) and the slice-1 capabilities C2.5, C3.5, C3.8 through the API (no pages yet); add **QA-13** from the Lead's walk (type Bug, Major, C2.4/C1.4): on the shared demo, Visitor visa's "Add 1 form from the library" returns 409 "the database refused a duplicate" because a RETIRED IMM 5707 line v1 exists and `addLine` creates v1 again (`api/src/programs.ts:291-305`); reproduce it on your own copy (add, remove, add again) and add a replayable check. Also add the P-63 wording finding (type Gap): "Boxes mapped", "mapped boxes", "data boxes" on the combination page. Use the skill's new finding types and the shared-demo read-only walk. Assignments: QA-1, 3, 5, 6, 7, 10, 11, 12, 13 and wording → screens; QA-2, 8 → forms; QA-4 → Lead (lane tooling); QA-9 → screens (stale suites).

Command: `/qa <mode>` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: QA-0 baseline
stage: WAITING
owner: Lead
next_action: Lead reads `qa/reports/2026-10-23-milestone.md`, assigns QA-4 to QA-12 to lanes, answers the three questions; then `/qa after-merge` retests each fix with its check in `prototype/studio/tests/qa/`.
blocked_by: none
updated: 2026-10-23

## Log (last 10 lines)
- 2026-10-23 · Lead: lane created at the founder's request (R-82, P-68); ports 4470–4479, databases `qa_*`.
- 2026-10-23 · QA-0 `/qa milestone` on main 141194dc: not ready — QA-1 Critical reproduced (API and browser); 5 Major, 6 Minor (new QA-4–QA-12); red suites: AI drafting, orchestration (lane copy), Studio browser, scale; coverage floor api 93/74, engine 94/85; Screen 01 journey 7.5/10 with a 0. Four capability rows added (Lead note).
