# Lane: screens — Milestone 2 screens

## From the Lead
2026-10-25 09:30 (Lead, cloud): **FIX continues, with five more items from the Screen 03 and 04 re-checks** (`screens/04-shared-library/recheck-2026-10-25.md`, `screens/03-combination-workspace/recheck-2026-10-25.md`), each verified and fixed with a fail-before test in this pass: (1) one combination's approval publishes only the approved library changes it uses; library-only changes go out through the shared Release page; (2) the release refusal covers every new library item the combination uses (sections and document types too); (3) a returned new field can be withdrawn or edited and resent, never freezing a release (your breaker's Blocker); (4) the old "Add a field" route cannot skip the second person; (5) a database rule behind the duplicate-name check. Decisions: the To review page is the one place library changes are approved (Screen 04's drawer shows status and links there); AI drafting of PQR picks (C4.7) is yours, later, through Draft setup. The runtime setup patch stays on your branch (one-off). **Your branch merges before runtime's.** Then CHECK as usual.
* 09:50: also in this FIX, from the scout (SC-2): the existing-name option in `new-combination.tsx` reads "used by n" instead of a bare count glued to the name; the scout's check is `tests/scout/check_sc2_sc4_1025.cjs` (its SC-2 part must pass).
* 10:00: after this merge, small, from Devin §E: one-line help on each channel option (PDF upload, Signed PDF upload, Online) and on "Drafting reads"; wording in `history/devin/2026-10-25-ux-audit.md` §E.
* 10:15 (P-93, `DEMO.md`): a feature is DONE only when its `DEMO.md` row shows in the demo story. Yours: rows 1 (held file), 3–7 and 17. Provide them as a seed function in your own file for the runtime lane's D1.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: 02-ai-work
stage: DESIGN
owner: Lead
next_action: Lead answers `screens/02-ai-work/challenge.md` (5 points: back-end ownership and the one combination-page button, K1 against 40 carried `unresolved` + 23 `never_filled` rows, proposal record for five kinds + one live checklist run at slice 3, approved-source record for held files, A4 parts already built) and sets BUILD slice 1 (To review page + AI work log). Also: check_screen01_browser.cjs waits fixed (build-notes 01 "CI flake 25 Oct").
then: Screen 02 BUILD slice 1 → EARLY-LOOK (Lead, P-89).
blocked_by: none
updated: 2026-10-25

## Log (last 10 lines)
- 2026-10-25 · 02 · DESIGN · applied Lead note 2026-10-25 (P-89): (1) check_screen01_browser.cjs: the keyboard and Back journeys now wait for the focus and the combination page they read (no fixed sleeps there), and a crash names its last step in the suite table; (2) feasibility challenge of Screen 02 written (Build after these changes, 3 Major, 2 Minor, no founder question). PostgreSQL 18 installed from npm binaries (apt host blocked). AI US$0. Owner → Lead.
- 2026-10-24 · 01 · CHECK · Lead: CI red on check_screen01_smallfix (browser launch): now launches channel "chrome" like the other browser suites; 23/23 on a fresh copy. Still CHECK, owner Lead.
- 2026-10-24 · 01 · FIX → CHECK · QA-4, QA-20, QA-22 and the CHECK round (K1, m1–m5, review should 1–2) fixed; all 16 suites PASS on dfa9162 (smallfix 23/23, browser 136, API 135, rules 67). AI US$0.
- 2026-10-24 · 01 · CHECK → FIX · reviewer Ship 9/10 (0 Must, 3 Should), breaker 1 Major (K1 keyboard on Portal/Filed as) + 5 Minor: K1, m1–m5, Should 1–2 fixed; smallfix 23/23 (10 new checks fail on 12af01a). review.md earlier rounds → review-earlier.md.
- 2026-10-24 · 01 · DONE → FIX · applied Lead note 2026-10-24 20:20 (sent to this session; on PR #9): QA-4, QA-20, QA-22 each reproduced, fixed and tested (check_screen01_smallfix.cjs 11/11); full suites running; CHECK next.
- 2026-10-24 · 01 · FIX → CHECK · QA-14 one name per parent in the database (normalised key, partial unique index, app keys other scripts), QA-17 dates on steps, L1 (cause: wrong database; checks now verify it), L2 waits, L3 type errors 39 → 0; CHECK round 3: reviewer Ship 9/10, breaker 0 Major/7 Minor, all fixed. Rules 67, API 135, browser 136, channels 42, grounding 29, forms 106. AI US$0.
- 2026-10-24 · 01 · CHECK → FIX · applied Lead note 2026-10-24 (merged 1cb174a6; small FIX: QA-14, QA-17, L1–L3).
- 2026-10-23 · 01 · FIX → CHECK · P-74 extension: C1.6 channel per line + filing method (row and page), C1.7 portal + default channel, C2.7 add an online form (awaiting a second person; continue/abandon), C2.10 what drafting reads per form, C3.10; CHECK round 2 (reviewer 8/10, 2 Must; breaker 3 Major) fixed: portal reviewed, version checks, no stuck captures. Rules 65, API 130, channels 42, browser 135, race safe. AI US$0.
- 2026-10-23 · 01 · FIX → CHECK · One pass: QA-1 release gate (both routes, per person, rolled back if the draft moves during release), QA-13 re-add restores the line, QA-3/5/6/7/9/10/11/12, P-63 words, step said once, default channel; reviewer Ship after fixes 8.5/10 (2 Must, 5 Should) and breaker 4 Major/9 Minor fixed in the same pass. Rules 63, API 130, browser 118, race 7/7, grounding 29, forms 106, scale 17/17. AI US$0.
- 2026-10-23 · 01 · DEMO → FIX · applied Lead note 2026-10-23 17:05 (founder: close Screen 01 in one FIX pass, qa retest, then DONE). Lane copy bound to screens.
