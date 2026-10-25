# Lane: screens — Milestone 2 screens

## From the Lead
2026-10-25 07:00 (Lead, cloud): **Screen 02 slice 1 EARLY-LOOK: GO** (`screens/02-ai-work/lead-check.md`). Set stage **FINISH**, owner Builder.
* **Slice 2, now with board views 5, 6, 8 and 9** (screen map, capture review, merge panel, held-file decision): source reading and proposals beside the source; `LibraryChange` + `keyFor` with the field name and group (merge rows then show names) and one publisher for both release paths; decision kinds; new-edition comparison and impact; `ApprovedSource`; `detail.a4.parts` read-only.
* **Then slice 3:** Propose with AI and the checklist drafts, on stub only. The Lead asks the founder before the one live run.
* **Also, small:** `check_screen01_browser.cjs` timed out again on GitHub at "1024 px: programs-program-filter-work-permits has no sideways scroll" (CI run 40169534499 on PR #19, a docs-only diff). Make that step wait for the state it reads, the same way you did in PR #18.
Sync main first. Then CHECK.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: 02-ai-work
stage: CHECK
owner: Builder
next_action: CHECK of Screen 02 slices 2 and 3: screen-reviewer (journey score) and screen-breaker in parallel, attacking contracts, data, migrations, roles, concurrency and hostile files. Runtime setup patch committed here (Lead note 08:30); CHECK passes only with r1a, r1c, r1d and the setup green on this head.
then: Lead check → merge (with the runtime patch).
blocked_by: none
updated: 2026-10-25

## Log (last 10 lines)
- 2026-10-25 · 02 · CHECK · applied Lead note 2026-10-25 08:30: runtime setup patch committed on this branch (one-off); Describe it / K2 stay without AI; guard to the forms lane.
- 2026-10-25 · 02 · FINISH → CHECK · slices 2+3: LibraryChange + keyFor + field names (migration), one publisher in both release paths, NEW field (BR-7), K1, views 2–9 + 11 (impact, capture, screen map, merge, held file/ApprovedSource, Draft setup panel, parts), K2 stub path; check_screen02_slice2 57/57, browser journeys all passed (19 states, axe clean), all suites PASS except runtime setup (patch proposed, proved locally: 13/120/63/99). any 437 = baseline. AI US$0.
- 2026-10-25 · 02 · EARLY-LOOK → FINISH · applied Lead note 2026-10-25 07:00 (GO; slice 2 with views 5, 6, 8, 9; then slice 3).
- 2026-10-25 · 02 · BUILD → EARLY-LOOK · slice 1: To review (GET /review-queue, menu first with Needs you count; roles: maker waits, second person acts; same count as Programs, same gate as Release), AI work names; QA-41 dialogs open on their first field, QA-42 stale sample note; check_screen02_slice1 all passed (fail-before on QA-41/42), all 22 suites PASS. AI US$0.
- 2026-10-25 · 02 · DESIGN → BUILD · applied Lead note 2026-10-25 06:10 (challenge agreed; slice 1 + QA-41, QA-42).
- 2026-10-25 · 02 · DESIGN · applied Lead note 2026-10-25 (P-89): (1) check_screen01_browser.cjs: the keyboard and Back journeys now wait for the focus and the combination page they read (no fixed sleeps there), and a crash names its last step in the suite table; (2) feasibility challenge of Screen 02 written (Build after these changes, 3 Major, 2 Minor, no founder question). PostgreSQL 18 installed from npm binaries (apt host blocked). AI US$0. Owner → Lead.
- 2026-10-24 · 01 · CHECK · Lead: CI red on check_screen01_smallfix (browser launch): now launches channel "chrome" like the other browser suites; 23/23 on a fresh copy. Still CHECK, owner Lead.
- 2026-10-24 · 01 · FIX → CHECK · QA-4, QA-20, QA-22 and the CHECK round (K1, m1–m5, review should 1–2) fixed; all 16 suites PASS on dfa9162 (smallfix 23/23, browser 136, API 135, rules 67). AI US$0.
- 2026-10-24 · 01 · CHECK → FIX · reviewer Ship 9/10 (0 Must, 3 Should), breaker 1 Major (K1 keyboard on Portal/Filed as) + 5 Minor: K1, m1–m5, Should 1–2 fixed; smallfix 23/23 (10 new checks fail on 12af01a). review.md earlier rounds → review-earlier.md.
- 2026-10-24 · 01 · DONE → FIX · applied Lead note 2026-10-24 20:20 (sent to this session; on PR #9): QA-4, QA-20, QA-22 each reproduced, fixed and tested (check_screen01_smallfix.cjs 11/11); full suites running; CHECK next.
