# qa findings closed on 30 Oct 2026 (moved word for word from `qa/BUGS.md` and `qa/reports/bugs-open-detail.md`, AGENTS.md rule 8)

## QA-99 — closed 30 Oct 2026 after the live retest

Closed by the qa lane: one live Who can be run on Study permit (founder approved in the qa session, 30 Oct), main bcd482d3, copy qa_live :4478 with the live switch: 201 in 88 s, 2 lines proposed with their sentence from Guide 5269, 1 to decide, no trail refusal; US$0.13 actual (0.065368 + 0.066184) of US$0.91 reserved. Evidence `qa/reports/2026-10-30-live-qa99/`, report `qa/reports/2026-10-30-live-qa99.md`.

Row as it stood in `qa/BUGS.md`:

| # | Type · Severity | Capability · Req./decision | Found · last seen | What happens (short) | Lane | Status |
|---|---|---|---|---|---|---|
| QA-99 | Bug · Critical | C11.12 · P-119, P-110 | a9fe60c0 (live smoke) | Who can be › AI now, live, approved switch on → refused before any call: "a form-finder job's combination trail of plain names joined by ›"; `people-ai.ts:84` sets trail to the label alone ("Study permit") … | runtime | Fixed on main 5f6c8deb (stub checks 3/3, 21/21, 15/15); live retest waits for the founder |

Detail row as it stood in `qa/reports/bugs-open-detail.md`:

| QA-99 | Bug · Critical | C11.12 · P-119, P-110 (founder-approved live trial) | **a9fe60c0** (live smoke 29 Oct, qa_live :4478) | Study permit › `POST …/people/propose/plan {mode: live}` (worst US$0.91, server with `STUDIO_PEOPLE_AI_LIVE=approved`) → `POST …/people/propose` with its plan → expected: two AI rounds read Guide 5269 and propose who can be included → actual: US$0, no call, `from: null`, note "The guarded AI route refused the job before any call: a job's known facts may hold only a printed form edition such as IMM 0000 (MM-YYYY), or a form-finder job's combination trail of plain names joined by ›". Cause: `people-ai.ts:84` builds the guide with `trail: c.label` ("Study permit"), and line 167 puts it in `known.combination_trail`; `p2/launch.ts` `knownOk` needs two names or more joined by " › ". So AI now can never run live for any combination. The stub pass passes, which is why QA-85 closed. Fix: the job's trail is the combination's full trail (as the finder's: "Temporary residence › Study permits › Study permit") | `check_qa_ai_paths.ts` step E (fails today); `reports/2026-10-29-after-merge-deda0e6.md` §5 | runtime | Fixed on main 5f6c8deb (PR #94): the full trail is sent; `check_qa99_who_can_be_trail` 3/3, `check_qa_ai_paths` 21/21, `check_s5_people_ai` 15/15 (stub); the live call is retested when the founder approves |
