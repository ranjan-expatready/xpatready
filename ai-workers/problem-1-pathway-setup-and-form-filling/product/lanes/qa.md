# Lane: qa — independent testing of what is on main (skill `qa`)

## From the Lead
2026-10-23: QA-0 baseline. Run `/qa milestone` on main for the M2 capabilities in `qa/CAPABILITIES.md`: walk Screen 01 as author and reviewer, test every validation message, rerun every suite on the exact commit, set the c8 coverage floor (P-69), turn QA-1 and QA-2 into replayable checks. No paid AI. Also add four capability rows the requirements trace found missing (`BACKLOG.md`, last section): AI reads uploaded documents and proposes facts (M3) · independent AI review of a filled form (M3) · copy a line from another combination and add or remove one line across many (M2, Screen 03) · an upload question creates a document line (M2).

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
