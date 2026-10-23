# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead
2026-10-23: QA-0 baseline. Run `/qa milestone` on main for the M2 capabilities in `qa/CAPABILITIES.md`: walk Screen 01 as author and reviewer, test every validation message, rerun every suite on the exact commit, set the c8 coverage floor (P-69), turn QA-1 and QA-2 into replayable checks. No paid AI.

Command: `/qa <mode>` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: QA-0 baseline
stage: RUN
owner: Builder
next_action: `/qa milestone` on main (M2 capabilities, coverage floor, suites rerun), then report.
blocked_by: none
updated: 2026-10-23

## Log (last 10 lines)
- 2026-10-23 · Lead: lane created at the founder's request (R-82, P-68); ports 4470–4479, databases `qa_*`.
