# Lane: screens — Milestone 2 screens

## From the Lead
2026-10-25 12:30 (Lead, Mac): **forms F2 is merged into main.** Your round-2 reviewer and breaker never reported (the cloud session stopped), so: sync main, commit the one-line patches in `other-lanes-tests-patch.md`, re-run those suites and yours; then run **one** CHECK (reviewer + breaker) on that head; FIX anything it finds; hand back. Every earlier item below still applies. Your branch merges before runtime's.
2026-10-25 09:30 (Lead, cloud): **FIX continues, with five more items from the Screen 03 and 04 re-checks** (`screens/04-shared-library/recheck-2026-10-25.md`, `screens/03-combination-workspace/recheck-2026-10-25.md`), each verified and fixed with a fail-before test in this pass: (1) one combination's approval publishes only the approved library changes it uses; library-only changes go out through the shared Release page; (2) the release refusal covers every new library item the combination uses (sections and document types too); (3) a returned new field can be withdrawn or edited and resent, never freezing a release (your breaker's Blocker); (4) the old "Add a field" route cannot skip the second person; (5) a database rule behind the duplicate-name check. Decisions: the To review page is the one place library changes are approved (Screen 04's drawer shows status and links there); AI drafting of PQR picks (C4.7) is yours, later, through Draft setup. The runtime setup patch stays on your branch (one-off). **Your branch merges before runtime's.** Then CHECK as usual.
* 09:50: also in this FIX, from the scout (SC-2): the existing-name option in `new-combination.tsx` reads "used by n" instead of a bare count glued to the name; the scout's check is `tests/scout/check_sc2_sc4_1025.cjs` (its SC-2 part must pass).
* 10:00: after this merge, small, from Devin §E: one-line help on each channel option (PDF upload, Signed PDF upload, Online) and on "Drafting reads"; wording in `history/devin/2026-10-25-ux-audit.md` §E.
* 10:15 (P-93, `DEMO.md`): a feature is DONE only when its `DEMO.md` row shows in the demo story. Yours: rows 1 (held file), 3–7 and 17. Provide them as a seed function in your own file for the runtime lane's D1.
* 11:30 (Devin drop 4, `history/devin/2026-10-25-devin-orphan-map.md`): in the same §E wording pass, rename the drafting-source control to "Reading inputs" (or similar) — the drafting source and the filing channel are two axes sharing "PDF/online", the most confusing label pair in the app. The dead-endpoint candidates are BACKLOG B36, not this pass.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: 02-ai-work
stage: CHECK
owner: Builder
next_action: CHECK round 2 running (reviewer + breaker on e6c5958); when the forms lane merges: sync main, commit the one-line patches from other-lanes-tests-patch.md, re-run those suites; fix anything CHECK finds; hand back naming the exact files.
then: CHECK → Lead check.
blocked_by: none
updated: 2026-10-25

## Log (last 10 lines)
- 2026-10-25 · 02 · FIX → CHECK · all suites PASS with the other lanes' patches applied locally (23 + grounding 30 + studio journey 44 after approving new document types); main merged (e6c5958); reviewer + breaker round 2 started. AI US$0.
- 2026-10-25 · 02 · FIX · pushed 5c1c814 (work in progress); Lead decided the other lanes' one-line test patches merge with this branch after forms merges.
- 2026-10-25 · 02 · FIX (in progress) · B1/M1–M8, minors, review Musts 1–9 and Lead re-check 1–5 fixed with a failing case each (check_screen02_fix 59/59); migrations applied_by + field_name_unique; Must 7 partly (set aside; comparison waits on the forms reader); Must 3 needs a one-line patch in two forms suites and the runtime setup (proposed). AI US$0.
- 2026-10-25 · 02 · CHECK → FIX · breaker: 1 Blocker (a returned new field freezes its combination), 8 Major, 15 Minor; reviewer running.
- 2026-10-25 · 02 · CHECK · applied Lead note 2026-10-25 08:30: runtime setup patch committed on this branch (one-off); Describe it / K2 stay without AI; guard to the forms lane.
- 2026-10-25 · 02 · FINISH → CHECK · slices 2+3: LibraryChange + keyFor + field names (migration), one publisher in both release paths, NEW field (BR-7), K1, views 2–9 + 11 (impact, capture, screen map, merge, held file/ApprovedSource, Draft setup panel, parts), K2 stub path; check_screen02_slice2 57/57, browser journeys all passed (19 states, axe clean), all suites PASS except runtime setup (patch proposed, proved locally: 13/120/63/99). any 437 = baseline. AI US$0.
- 2026-10-25 · 02 · EARLY-LOOK → FINISH · applied Lead note 2026-10-25 07:00 (GO; slice 2 with views 5, 6, 8, 9; then slice 3).
- 2026-10-25 · 02 · BUILD → EARLY-LOOK · slice 1: To review (GET /review-queue, menu first with Needs you count; roles: maker waits, second person acts; same count as Programs, same gate as Release), AI work names; QA-41 dialogs open on their first field, QA-42 stale sample note; check_screen02_slice1 all passed (fail-before on QA-41/42), all 22 suites PASS. AI US$0.
- 2026-10-25 · 02 · DESIGN → BUILD · applied Lead note 2026-10-25 06:10 (challenge agreed; slice 1 + QA-41, QA-42).
- 2026-10-25 · 02 · DESIGN · applied Lead note 2026-10-25 (P-89): (1) check_screen01_browser.cjs: the keyboard and Back journeys now wait for the focus and the combination page they read (no fixed sleeps there), and a crash names its last step in the suite table; (2) feasibility challenge of Screen 02 written (Build after these changes, 3 Major, 2 Minor, no founder question). PostgreSQL 18 installed from npm binaries (apt host blocked). AI US$0. Owner → Lead.
