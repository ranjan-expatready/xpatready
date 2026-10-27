# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-27 (Lead, Mac): **Slices 1+2 (with your FIX a973dd7) are merged into main:** all 33 suites PASS and the studio journey 45/45 on the Lead's fresh-build run. **Change of plan (P-117, founder): one screen at a time, and slice 3 does not start yet.** S1 Structure is finished first: the Lead brings the founder a board for the founder's layout idea (Pathway cards on top; a click opens the tree under that Pathway, the same entry later used on Immigration programs), then you build S1's finish items in one small slice: that layout, "Used by" names each combination with Open, toasts cover neither outline nor panel, the left menu background runs the full page height. S2 Immigration programs follows only after the founder's OK on S1. Stage WAITING, owner Lead (board with the founder).

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: W1-structure-programs
stage: EARLY-LOOK
owner: Lead
next_action: Lead early look at S1-finish (screenshots/s1-finish/ at 1440 and 1024, build-notes 'S1-finish', challenge.md layout suggestion) and the founder walkthrough; then merge and Go for S2 Immigration programs
then: EARLY-LOOK → founder OK on S1 → S2 Immigration programs (design D) on a new branch from main.
blocked_by: none
updated: 2026-10-27

## Log (last 10 lines)
- 2026-10-27 · W1-structure-programs · BUILD → EARLY-LOOK · S1-finish: Pathway cards (All + one per Pathway + Add; a card opens its tree, closes the others; in the address), Used by names each combination with Open, inline confirmations (no toast on Structure), full-height menu column app-wide; check_w1_structure_s1finish 33/33 (twice), all 34 suites PASS, studio journey 45/45 on 4445 (two overlapping runs earlier interfered; rerun alone clean). AI US$0. Owner → Lead.
- 2026-10-27 · W1-structure-programs · FIX → BUILD S1-finish · applied Lead note 2026-10-27 (slices 1+2 merged in PR #40 ed3ef4a; P-117 one screen at a time); new branch screens/2026-10-27-s1-finish from main. AI US$0.
- 2026-10-27 · W1-structure-programs · FIX · studio journey (--demo suite) 45/45 on isolated copy 4445: Pass B adds the Retail Pathway 'Temporary residence' on the Structure page after Reset (B0b), B1 expects 'Individual › Temporary residence › Work permits (built from scratch) › …'; reset check now asserts both tabs empty; New combination trail names the type's one Pathway; check_screen01_browser 129/129, smallfix pass. AI US$0. Owner → Lead.
- 2026-10-27 · W1-structure-programs · EARLY-LOOK → FIX · applied Lead note 2026-10-27 (founder Go on the Structure page; FIX the --demo studio journey: Pass B had no Pathway after Reset). AI US$0.
- 2026-10-27 · W1-structure-programs · BUILD → EARLY-LOOK · slice 2 Structure page: all 33 suites PASS (incl. check_w1_structure 83/83, check_w1_structure_browser 61/61); 13 states × 1440/1024 screenshots, axe clean; any 434 = baseline; graph exit 0. AI US$0. Owner → Lead.
- 2026-10-27 · W1-structure-programs · EARLY-LOOK → BUILD slice 2 · applied Lead note 2026-10-27 (slice 1 passed; L3 reading accepted; slices 1+2 merge together); Structure page built: outline with add rows and live checks, side panel (rename, locations, order, remove/retire/restore, history), every board state; check_w1_structure_browser 61/61, axe clean. AI US$0.
- 2026-10-27 · W1-structure-programs · BUILD → EARLY-LOOK · slice 1 data and API: migration (index per parent and type; version, retired_at), ensurePathways removed (a read creates nothing; samples carry their Pathways), every-Pathway reads (catalogue sections, path-options, createPath pathwayKey, proposal), Structure endpoints (list, name-check, meaning-check off 403, add, rename/locations with version, reorder at once), P-116 lifecycle via LibraryChange + lifecycle.ts (uses, delete at approval, retire/restore at release), retired-case guard in runtime.ts, trail/progress/filed/retired on rows; check_w1_structure 83/83, all 32 suites PASS (check_screen01_api + check_grounding_db updated for the no-fixed-Pathway rule). AI US$0. Owner → Lead.
- 2026-10-27 · W1-structure-programs · DESIGN → BUILD · applied Lead note 2026-10-27 (synced main 5e7c7b7 with W1-02; Lead response copied into challenge.md); slice 1 started. AI US$0.
- 2026-10-26 · W1-structure-programs · DESIGN · applied Lead note 2026-10-26 night (bound, synced main 4cbb326, branch screens/2026-10-26-w1-structure); builder addendum in challenge.md: Build after these changes, 5 Major (A1 structure/combination lifecycle has no approval vehicle: reuse LibraryChange + retired_at + shared lifecycle.ts; A2 retiring a Live combination vs L3 and case opening; A3 setup-progress steps undefined, 'AI draft' → 'Draft'; A4 'answer sheet' has no data; A5 slice 1 overlaps forms W1-02 in 7 files → start after it merges). No code. AI US$0. Owner → Lead.
- 2026-10-25 · 02 · CHECK · journey re-scored to journey-test §6 rubric: 9.5/10 (was 8.5 un-rubriced); all four round-1 dead ends re-walked gone; report journey-test-reviewer-2026-10-25-r2.md; reviewer session also made the SC-2 one-line fix. AI US$0. Owner stays Lead.
