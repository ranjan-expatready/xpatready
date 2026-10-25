# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead
2026-10-25 09:30 (Lead, cloud): **F2 Lead check: MERGE after three small items** (`screens/F2-extension/lead-check.md`). Stage CHECK, owner Builder. (1) Sync main (it carries the Lead's CI fix: Playwright's Chromium for `check_forms_f2d.ts`), push, CI green on the head. (2) A fresh reviewer re-score of the fixed build (journey ≥ 8, no 0). (3) Granted once: the demo reset (`api/src/demo.ts`) deletes the workspace's extension pairings and sessions, with a test; and after "This screen looks different" the panel's primary button says what to do. Then hand back; the Lead merges by PR. **Next after the merge:** the drafting guard admits ApprovedSource files (P-80; the screens lane's Screen 02 ask).

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: F2-extension
stage: CHECK
owner: Lead
next_action: Lead check of F2 (F1-P, F2a–F2d + FIX, dada3e7): build-notes.md (slices, deviations, "Fixes after CHECK" table), review.md, break-report.md; rerun run-suites.sh (27 green here on PostgreSQL 16); record @types/chrome 0.3.5 in ENVIRONMENT.md (S-4); demo.ts reset of extension sessions (proposal in build notes). Then MERGE.
blocked_by: none
updated: 2026-10-25

## Log (last 10 lines)
- 2026-10-25 · F2 · FIX → CHECK · full run-suites on dada3e7: 27 suites green (f1p 16, f2a 34, f2a_api 34, f2b 36, f2c 36, f2c_fill 17, f2d 36); copy clean. US$0. Owner → Lead.
- 2026-10-25 · F2 · CHECK → FIX · reviewer: ship after fixes, journey 7/10 (1 Must = wrong-person fill via screen identity), 1 Major (capture lost on panel reload), 9 Minor; breaker: 2 Blocker (identity collision; Next during fill), 4 Major, 7 Minor; all fixed with tests (f2a_api 34, f2b 36, f2c 36, f2c_fill 17, f2d 36) except E-1 step id (no page has one) and two by-design answers. US$0.
- 2026-10-25 · F2 · BUILD → CHECK · F1-P, F2a–F2d built and pushed (d67b592, c9b8269, a9745ae, bebc666, c16bf6f, 6f6e098); reviewer and breaker launched on 6f6e098; full suite run in progress. US$0.
- 2026-10-25 · F2 · BUILD (F2d) · MV3 build (production manifest checked: sidePanel+storage, exact Sample hosts, no API host permission so every call carries its Origin), side panel (connect, fill with sources, not accepted, looks different, capture with check-before-sending, held), Studio /extension page, @types/chrome 0.3.5; journey in Chromium 31/31, axe clean on every state; 3 bugs found by the journey fixed. US$0.
- 2026-10-25 · F2 · BUILD (F2c) · fill plan from the case's pinned release (confirmed facts only, portal format, compare first, map complete, you answer on screen), one re-capture task per version+screen (3 at once → 1 row), approve closes seen screens, older case fills by hand, new case fills the new screen; writer fills empty inputs only, read-back, never submits; check_forms_f2c 32/32, f2c_fill 11/11; 2 bugs found and fixed (oldest online map, -1 placeholder). US$0.
- 2026-10-25 · F2 · BUILD (F2b) · pairing code → opaque token bound to person, modes, fixed extension id (ipomjnfj…); token-only extension routes incl. capture, CORS for that origin only, revoke, 5 wrong codes → 429; migration (pairing, session, recapture task); check_forms_f2b 33/33, f2a_api on tokens 29/29; any ratchet 437. US$0.
- 2026-10-25 · F2 · BUILD (F2a) · shared reader rules (Python output unchanged on 15 fixtures), extension reader, conformance 34/34 (stop rule not triggered); screen identity from the heading, reuse only same input on same screen (B1), extension-screens endpoint, Q2 merge with last seen per screen: check_forms_f2a_api 29/29; full suite run in progress. US$0.
- 2026-10-25 · F2 · BUILD (F1-P) · list purpose and overflow on a field map (PATCH editions/:id/list-purposes, snapshot, release warning), QA-43 404, check_ai_launch_paths robust (restart waits, refused connection retried, FAIL line on a stop) and leaves the repository as it was (56/56); check_forms_f1p 16/16; all 22 suites green on PostgreSQL 16 (18 not installable here). US$0.
- 2026-10-25 · F2 · PLAN → BUILD · applied Lead note 2026-10-25 06:15 (plan agreed, S-1…S-5 granted, five purposes named; main 0127f2c synced).
- 2026-10-25 · F2 · PLAN · fresh challenge: build after changes, 1 Blocker (screen identity from capture order → wrong-person fill; reproduced in code), 7 Major, 7 Minor; all accepted in plan §3 (pinned release only, own Sample combination, token-only extension routes, task stores twin labels only, fill events Not built); F1-P list purpose for Screen 02 added; graph check passes. US$0. Owner → Lead.
