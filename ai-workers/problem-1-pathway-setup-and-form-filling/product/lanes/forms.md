# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead
2026-10-25 09:30 (Lead, cloud): **F2 Lead check: MERGE after three small items** (`screens/F2-extension/lead-check.md`). Stage CHECK, owner Builder. (1) Sync main (it carries the Lead's CI fix: Playwright's Chromium for `check_forms_f2d.ts`), push, CI green on the head. (2) A fresh reviewer re-score of the fixed build (journey ≥ 8, no 0). (3) Granted once: the demo reset (`api/src/demo.ts`) deletes the workspace's extension pairings and sessions, with a test; and after "This screen looks different" the panel's primary button says what to do. Then hand back; the Lead merges by PR. **Next after the merge:** the drafting guard admits ApprovedSource files (P-80; the screens lane's Screen 02 ask).
* 09:50: after the merge, small, from the scout (SC-3): the sample-form picker explains or hides its approval codes (D229, D257) and gets a kind filter.
* 10:15 (P-93, `DEMO.md`): a feature is DONE only when its `DEMO.md` row shows in the demo story. Yours: rows 1–2 (PDF and online ingestion), 7 (checklist drafts) and 13 (online fill). Provide them as a seed function in your own file for the runtime lane's D1.
* 11:30 (evidence E1b, IMM 5409 — for the writer's design): F5 — a static form's page fields read empty outside Adobe until the file is saved there (the writer fills the form data only; the file itself is correct); F6 — IMM 5409's Validate needs the oath block as a person step (place, administrator's name and title, date).

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: F2-extension
stage: PLAN
owner: Lead
next_action: Lead reads screens/F2-extension/plan.md (challenge.md: 1 Blocker, 7 Major, 7 Minor, all accepted in §3) and agrees or changes it; grants S-1…S-5; names the five list purposes (§10b); passes founder questions 1–3 (built on the recommendations meanwhile). Then BUILD from F1-P, F2a.
blocked_by: none
updated: 2026-10-25

## Log (last 10 lines)
- 2026-10-25 · F2 · PLAN · fresh challenge: build after changes, 1 Blocker (screen identity from capture order → wrong-person fill; reproduced in code), 7 Major, 7 Minor; all accepted in plan §3 (pinned release only, own Sample combination, token-only extension routes, task stores twin labels only, fill events Not built); F1-P list purpose for Screen 02 added; graph check passes. US$0. Owner → Lead.
- 2026-10-25 · F2 · CHECK → PLAN · applied Lead note 2026-10-25 (P-89, P-90; main 8360565 synced); fresh challenger running; plan.md drafted (measured facts F-1…F-11, records, engine, back-end table, slices F1-P + F2a–F2d); MV3 extension loads in the installed Chromium (probe). Cloud setup: postgresql-18 apt source refused (403), not needed for PLAN. US$0.
- 2026-10-24 · F1 · CHECK (qa Minors) · Lead request (PR 10 review): STUDIO_FAKE_LAUNCHER runs only the test fixture (resolved path), tested by restarting the copy with another script and a disguised link (launch paths 55/55); isolated.sh now stops only the listening server; all suites green. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK → FIX → CHECK (qa Minors) · breaker: 2 Major (paid call after a cancel while the launch waited; reset crash), 6 Minor; every Major and most Minors fixed with a test (cancel honoured up to the paid call on every path; answer of a call cancelled mid-way never applied; retryable per step; reset safe); launch paths 52/52, slice 2 53/53, all suites green, api coverage 95.89/79.67. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK (qa Minors) · reviewer: ship after fixes, journey 6/10, 0 Must, 2 Major (a cancel during a part's stub pass still makes its paid call; AI work page not updated), 6 Minor; breaker running. US$0.
- 2026-10-24 · F1 · BUILD → CHECK (qa Minors) · QA-27 plain words, QA-31 screen-map draft cancellable before its paid call (own batch), QA-32 retry after a mid-run cancel, QA-33 reuse compares the kind of box; launch paths 45/45, slice 2b 60/60, all suites green, api coverage 95.75/79.50. US$0. Reviewer and breaker launched.
- 2026-10-24 · F1 · CHECK → BUILD (qa Minors) · applied Lead note 2026-10-24 20:40 (slice 2b merged, PR #9; main 262750e synced).
- 2026-10-24 · F1 · CHECK (slice 2b) · applied Lead note 19:10 (QA-34, QA-30): fake-launcher suite check_ai_launch_paths 29/29 (every live-draft refusal at US$0; parts provider limit now BLOCKED), capture and fill refusals in slice 2b 57/57; api coverage 95.73/79.09 (floor 95/79), engine 99.12/87.24; QA-30 a plain 400; all suites green. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK → FIX → CHECK (slice 2b) · breaker: 0 Blocker, 2 Major, 7 Minor; every Major and most Minors fixed with a test (page fields set only when drawn exactly, read back from the drawing; sign step on static forms; D3 under-lock race; static read from the file); slice 2b 44/44, all suites green, qa probe 26/0, any 437. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK (slice 2b) · reviewer: ship after fixes, journey 7.5/10, 0 Must, 2 Major (page fields drawn with ? or cut off still reported shown; no sign step on static forms), 5 Minor; breaker running. US$0.
