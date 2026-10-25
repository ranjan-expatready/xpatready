# Lane: screens — Milestone 2 screens

## From the Lead
2026-10-25 06:10 (Lead, cloud): **Screen 02 challenge answered and agreed** (`screens/02-ai-work/challenge.md` "Lead response"); the Screen 01 browser-suite wait is accepted with this merge. Set stage **BUILD**, slice **1**, owner Builder: the To review page and the AI work run log on today's data, plus qa's QA-41 (dialogs open with focus on Close) and QA-42 (seed note on a Live combination), each with a test. Your lane builds Screen 02's back end in its own files. On the combination page your only change is one entry point (Setup opens Draft setup as a right panel), because the runtime lane owns the tabs. Slice 2 builds `LibraryChange` + `keyFor`, with one publisher for both release paths, for Screen 04 to reuse. Screen 04 (concept agreed, `screens/04-shared-library/`) follows Screen 02; QA-39 belongs to it. Sync main first. Then EARLY-LOOK (Lead) with screenshots.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: 02-ai-work
stage: EARLY-LOOK
owner: Lead
next_action: Lead early look at Screen 02 slice 1: screenshots `screens/02-ai-work/screenshots/slice1/` (8 states), build-notes "Slice 1" (top 5 improvements, deviations), challenge.md Build discoveries (views 5, 6, 8, 9 in no slice: proposed for slice 2); QA-41 and QA-42 fixed with fail-before checks.
then: slice 2 (source + proposals, decision kinds, impact, LibraryChange + keyFor, and views 5/6/8/9 if agreed).
blocked_by: none
updated: 2026-10-25

## Log (last 10 lines)
- 2026-10-25 · 02 · BUILD → EARLY-LOOK · slice 1: To review (GET /review-queue, menu first with Needs you count; roles: maker waits, second person acts; same count as Programs, same gate as Release), AI work names; QA-41 dialogs open on their first field, QA-42 stale sample note; check_screen02_slice1 all passed (fail-before on QA-41/42), all 22 suites PASS. AI US$0.
- 2026-10-25 · 02 · DESIGN → BUILD · applied Lead note 2026-10-25 06:10 (challenge agreed; slice 1 + QA-41, QA-42).
- 2026-10-25 · 02 · DESIGN · applied Lead note 2026-10-25 (P-89): (1) check_screen01_browser.cjs: the keyboard and Back journeys now wait for the focus and the combination page they read (no fixed sleeps there), and a crash names its last step in the suite table; (2) feasibility challenge of Screen 02 written (Build after these changes, 3 Major, 2 Minor, no founder question). PostgreSQL 18 installed from npm binaries (apt host blocked). AI US$0. Owner → Lead.
- 2026-10-24 · 01 · CHECK · Lead: CI red on check_screen01_smallfix (browser launch): now launches channel "chrome" like the other browser suites; 23/23 on a fresh copy. Still CHECK, owner Lead.
- 2026-10-24 · 01 · FIX → CHECK · QA-4, QA-20, QA-22 and the CHECK round (K1, m1–m5, review should 1–2) fixed; all 16 suites PASS on dfa9162 (smallfix 23/23, browser 136, API 135, rules 67). AI US$0.
- 2026-10-24 · 01 · CHECK → FIX · reviewer Ship 9/10 (0 Must, 3 Should), breaker 1 Major (K1 keyboard on Portal/Filed as) + 5 Minor: K1, m1–m5, Should 1–2 fixed; smallfix 23/23 (10 new checks fail on 12af01a). review.md earlier rounds → review-earlier.md.
- 2026-10-24 · 01 · DONE → FIX · applied Lead note 2026-10-24 20:20 (sent to this session; on PR #9): QA-4, QA-20, QA-22 each reproduced, fixed and tested (check_screen01_smallfix.cjs 11/11); full suites running; CHECK next.
- 2026-10-24 · 01 · FIX → CHECK · QA-14 one name per parent in the database (normalised key, partial unique index, app keys other scripts), QA-17 dates on steps, L1 (cause: wrong database; checks now verify it), L2 waits, L3 type errors 39 → 0; CHECK round 3: reviewer Ship 9/10, breaker 0 Major/7 Minor, all fixed. Rules 67, API 135, browser 136, channels 42, grounding 29, forms 106. AI US$0.
- 2026-10-24 · 01 · CHECK → FIX · applied Lead note 2026-10-24 (merged 1cb174a6; small FIX: QA-14, QA-17, L1–L3).
- 2026-10-23 · 01 · FIX → CHECK · P-74 extension: C1.6 channel per line + filing method (row and page), C1.7 portal + default channel, C2.7 add an online form (awaiting a second person; continue/abandon), C2.10 what drafting reads per form, C3.10; CHECK round 2 (reviewer 8/10, 2 Must; breaker 3 Major) fixed: portal reviewed, version checks, no stuck captures. Rules 65, API 130, channels 42, browser 135, race safe. AI US$0.
