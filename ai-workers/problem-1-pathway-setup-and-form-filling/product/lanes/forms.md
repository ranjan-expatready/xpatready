# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead
2026-10-25 06:15 (Lead, cloud): **F2 plan agreed** (`screens/F2-extension/plan.md` "Lead response"; S-1 to S-5 granted, S-3 as `web/src/pages/extension.tsx`; the five purposes named). Set stage **BUILD**, owner Builder. First **F1-P** (list purpose and overflow on a field map), so Screen 02 is not held. Then F2a (shared reader rules and the conformance test first; stop and report if the two readers cannot agree). One commit per slice. Also, from the Lead's earlier note: make `check_ai_launch_paths.ts` robust (one CI failure on 8d0831a) and stop it leaving files in the repo after a run. Add qa's QA-43 (unknown combination on `online-forms` → 404) with a test. Sync main first. BUILD ends at CHECK.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: F2-extension
stage: BUILD
owner: Builder
next_action: F2c committed (fill plan from the pinned release, re-capture tasks, Q3 marker, in-page writer; 32/32 and 11/11); confirm its full suite run, then F2d (MV3 build and manifest check, side panel in both modes, Studio pairing page, scripted journey with the unpacked extension), then CHECK.
blocked_by: none
updated: 2026-10-25

## Log (last 10 lines)
- 2026-10-25 · F2 · BUILD (F2c) · fill plan from the case's pinned release (confirmed facts only, portal format, compare first, map complete, you answer on screen), one re-capture task per version+screen (3 at once → 1 row), approve closes seen screens, older case fills by hand, new case fills the new screen; writer fills empty inputs only, read-back, never submits; check_forms_f2c 32/32, f2c_fill 11/11; 2 bugs found and fixed (oldest online map, -1 placeholder). US$0.
- 2026-10-25 · F2 · BUILD (F2b) · pairing code → opaque token bound to person, modes, fixed extension id (ipomjnfj…); token-only extension routes incl. capture, CORS for that origin only, revoke, 5 wrong codes → 429; migration (pairing, session, recapture task); check_forms_f2b 33/33, f2a_api on tokens 29/29; any ratchet 437. US$0.
- 2026-10-25 · F2 · BUILD (F2a) · shared reader rules (Python output unchanged on 15 fixtures), extension reader, conformance 34/34 (stop rule not triggered); screen identity from the heading, reuse only same input on same screen (B1), extension-screens endpoint, Q2 merge with last seen per screen: check_forms_f2a_api 29/29; full suite run in progress. US$0.
- 2026-10-25 · F2 · BUILD (F1-P) · list purpose and overflow on a field map (PATCH editions/:id/list-purposes, snapshot, release warning), QA-43 404, check_ai_launch_paths robust (restart waits, refused connection retried, FAIL line on a stop) and leaves the repository as it was (56/56); check_forms_f1p 16/16; all 22 suites green on PostgreSQL 16 (18 not installable here). US$0.
- 2026-10-25 · F2 · PLAN → BUILD · applied Lead note 2026-10-25 06:15 (plan agreed, S-1…S-5 granted, five purposes named; main 0127f2c synced).
- 2026-10-25 · F2 · PLAN · fresh challenge: build after changes, 1 Blocker (screen identity from capture order → wrong-person fill; reproduced in code), 7 Major, 7 Minor; all accepted in plan §3 (pinned release only, own Sample combination, token-only extension routes, task stores twin labels only, fill events Not built); F1-P list purpose for Screen 02 added; graph check passes. US$0. Owner → Lead.
- 2026-10-25 · F2 · CHECK → PLAN · applied Lead note 2026-10-25 (P-89, P-90; main 8360565 synced); fresh challenger running; plan.md drafted (measured facts F-1…F-11, records, engine, back-end table, slices F1-P + F2a–F2d); MV3 extension loads in the installed Chromium (probe). Cloud setup: postgresql-18 apt source refused (403), not needed for PLAN. US$0.
- 2026-10-24 · F1 · CHECK (qa Minors) · Lead request (PR 10 review): STUDIO_FAKE_LAUNCHER runs only the test fixture (resolved path), tested by restarting the copy with another script and a disguised link (launch paths 55/55); isolated.sh now stops only the listening server; all suites green. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK → FIX → CHECK (qa Minors) · breaker: 2 Major (paid call after a cancel while the launch waited; reset crash), 6 Minor; every Major and most Minors fixed with a test (cancel honoured up to the paid call on every path; answer of a call cancelled mid-way never applied; retryable per step; reset safe); launch paths 52/52, slice 2 53/53, all suites green, api coverage 95.89/79.67. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK (qa Minors) · reviewer: ship after fixes, journey 6/10, 0 Must, 2 Major (a cancel during a part's stub pass still makes its paid call; AI work page not updated), 6 Minor; breaker running. US$0.
