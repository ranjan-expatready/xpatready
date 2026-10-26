# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-27 (Lead, Mac): **W1-02 merged into main (PR #39) — your block is gone. Start BUILD slice 1 now.** Sync main first (it removes the extension code your slice shared 7 files with). Build on `screens/W1-structure-programs/concept.md` and the addendum A1–A5 as agreed 26 Oct (the Lead response of 26 Oct stays the contract: lifecycle via `LibraryChange` + `api/src/lifecycle.ts`, reorder applies at once with an audit line, retired-combination guard in `runtime.ts` with its test, steps Forms · Draft · Review · Release from existing data, "PDF + answer sheet (later wave)"). New code in new files. Copy the Lead response under your addendum in `challenge.md`. Local suites: GNU `gtimeout` is now on the Mac; rebuild the web app before browser suites (`run-suites.sh` does not when the database is already up). Stage BUILD slice 1, owner Builder.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: W1-structure-programs
stage: DESIGN
owner: Lead
next_action: Lead answers the builder's addendum in screens/W1-structure-programs/challenge.md (A1–A5; 2 Lead questions: reorder approval, runtime.ts retired guard), then BUILD slice 1 once forms W1-02 is merged into main
then: DESIGN → BUILD slice 1 (data and API) → EARLY-LOOK.
blocked_by: forms W1-02 merge (slice 1 shares 7 files with it)
updated: 2026-10-26

## Log (last 10 lines)
- 2026-10-26 · W1-structure-programs · DESIGN · applied Lead note 2026-10-26 night (bound, synced main 4cbb326, branch screens/2026-10-26-w1-structure); builder addendum in challenge.md: Build after these changes, 5 Major (A1 structure/combination lifecycle has no approval vehicle: reuse LibraryChange + retired_at + shared lifecycle.ts; A2 retiring a Live combination vs L3 and case opening; A3 setup-progress steps undefined, 'AI draft' → 'Draft'; A4 'answer sheet' has no data; A5 slice 1 overlaps forms W1-02 in 7 files → start after it merges). No code. AI US$0. Owner → Lead.
- 2026-10-25 · 02 · CHECK · journey re-scored to journey-test §6 rubric: 9.5/10 (was 8.5 un-rubriced); all four round-1 dead ends re-walked gone; report journey-test-reviewer-2026-10-25-r2.md; reviewer session also made the SC-2 one-line fix. AI US$0. Owner stays Lead.
- 2026-10-25 · 02 · CHECK · applied Lead note 2026-10-25 12:30: synced main (F2 merge; conflicts resolved demo/main/App), committed the 3 granted test patches (246143f), SC-2 'used by n' added (was missing); reviewer Ship 8.5/10, breaker 0B/0M/3m (2 env: Chromium ArrowDown select, scout-check env-bound); 30 suites green incl. all F2. AI US$0. Owner → Lead.
- 2026-10-25 · 02 · FIX → CHECK · all suites PASS with the other lanes' patches applied locally (23 + grounding 30 + studio journey 44 after approving new document types); main merged (e6c5958); reviewer + breaker round 2 started. AI US$0.
- 2026-10-25 · 02 · FIX · pushed 5c1c814 (work in progress); Lead decided the other lanes' one-line test patches merge with this branch after forms merges.
- 2026-10-25 · 02 · FIX (in progress) · B1/M1–M8, minors, review Musts 1–9 and Lead re-check 1–5 fixed with a failing case each (check_screen02_fix 59/59); migrations applied_by + field_name_unique; Must 7 partly (set aside; comparison waits on the forms reader); Must 3 needs a one-line patch in two forms suites and the runtime setup (proposed). AI US$0.
- 2026-10-25 · 02 · CHECK → FIX · breaker: 1 Blocker (a returned new field freezes its combination), 8 Major, 15 Minor; reviewer running.
- 2026-10-25 · 02 · CHECK · applied Lead note 2026-10-25 08:30: runtime setup patch committed on this branch (one-off); Describe it / K2 stay without AI; guard to the forms lane.
- 2026-10-25 · 02 · FINISH → CHECK · slices 2+3: LibraryChange + keyFor + field names (migration), one publisher in both release paths, NEW field (BR-7), K1, views 2–9 + 11 (impact, capture, screen map, merge, held file/ApprovedSource, Draft setup panel, parts), K2 stub path; check_screen02_slice2 57/57, browser journeys all passed (19 states, axe clean), all suites PASS except runtime setup (patch proposed, proved locally: 13/120/63/99). any 437 = baseline. AI US$0.
- 2026-10-25 · 02 · EARLY-LOOK → FINISH · applied Lead note 2026-10-25 07:00 (GO; slice 2 with views 5, 6, 8, 9; then slice 3).
