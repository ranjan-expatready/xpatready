# Lane: screens — Milestone 2 screens

## From the Lead
2026-10-25 (Lead, cloud): **full development mode (P-89).** Screen 01 is DONE (the founder walked it, 25 Oct). Set current_screen 02-ai-work, stage **DESIGN**, owner Builder. (1) First, small: `check_screen01_browser.cjs` timed out once on GitHub's runner (CI run 40157656563, PR 14; logs in its `suite-logs` artifact) while it passed 136/136 three times on the same commit: find the step and make it wait for the state it needs, no fixed sleeps. (2) Then DESIGN: the short feasibility challenge (skill screen-challenge) of `screens/02-ai-work/concept.md` (agreed by the Lead; its Lead decisions at the top) and its board `design/draft-ai-work.html`; owner Lead. The Lead answers the same day and sets BUILD; EARLY-LOOK and DEMO are the Lead's (P-89). Screen 03 is the runtime lane's: do not touch its tabs.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: 01-programs-catalogue
stage: CHECK
owner: Lead
next_action: Lead check of the small FIX on its exact commit (build-notes "Fixes: small FIX after Screen 01 DONE" and its "CHECK round on 12af01a"; review.md, break-report.md), then merge; no migration.
then: Screen 02 DESIGN (Lead concept with P-61–P-63 and the A4 progress screen; builder feasibility challenge).
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-24 · 01 · CHECK · Lead: CI red on check_screen01_smallfix (browser launch): now launches channel "chrome" like the other browser suites; 23/23 on a fresh copy. Still CHECK, owner Lead.
- 2026-10-24 · 01 · FIX → CHECK · QA-4, QA-20, QA-22 and the CHECK round (K1, m1–m5, review should 1–2) fixed; all 16 suites PASS on dfa9162 (smallfix 23/23, browser 136, API 135, rules 67). AI US$0.
- 2026-10-24 · 01 · CHECK → FIX · reviewer Ship 9/10 (0 Must, 3 Should), breaker 1 Major (K1 keyboard on Portal/Filed as) + 5 Minor: K1, m1–m5, Should 1–2 fixed; smallfix 23/23 (10 new checks fail on 12af01a). review.md earlier rounds → review-earlier.md.
- 2026-10-24 · 01 · DONE → FIX · applied Lead note 2026-10-24 20:20 (sent to this session; on PR #9): QA-4, QA-20, QA-22 each reproduced, fixed and tested (check_screen01_smallfix.cjs 11/11); full suites running; CHECK next.
- 2026-10-24 · 01 · FIX → CHECK · QA-14 one name per parent in the database (normalised key, partial unique index, app keys other scripts), QA-17 dates on steps, L1 (cause: wrong database; checks now verify it), L2 waits, L3 type errors 39 → 0; CHECK round 3: reviewer Ship 9/10, breaker 0 Major/7 Minor, all fixed. Rules 67, API 135, browser 136, channels 42, grounding 29, forms 106. AI US$0.
- 2026-10-24 · 01 · CHECK → FIX · applied Lead note 2026-10-24 (merged 1cb174a6; small FIX: QA-14, QA-17, L1–L3).
- 2026-10-23 · 01 · FIX → CHECK · P-74 extension: C1.6 channel per line + filing method (row and page), C1.7 portal + default channel, C2.7 add an online form (awaiting a second person; continue/abandon), C2.10 what drafting reads per form, C3.10; CHECK round 2 (reviewer 8/10, 2 Must; breaker 3 Major) fixed: portal reviewed, version checks, no stuck captures. Rules 65, API 130, channels 42, browser 135, race safe. AI US$0.
- 2026-10-23 · 01 · FIX → CHECK · One pass: QA-1 release gate (both routes, per person, rolled back if the draft moves during release), QA-13 re-add restores the line, QA-3/5/6/7/9/10/11/12, P-63 words, step said once, default channel; reviewer Ship after fixes 8.5/10 (2 Must, 5 Should) and breaker 4 Major/9 Minor fixed in the same pass. Rules 63, API 130, browser 118, race 7/7, grounding 29, forms 106, scale 17/17. AI US$0.
- 2026-10-23 · 01 · DEMO → FIX · applied Lead note 2026-10-23 17:05 (founder: close Screen 01 in one FIX pass, qa retest, then DONE). Lane copy bound to screens.
- 2026-10-23 · 01 · CHECK → DEMO · Lead: AI repair A1–A3, A6 confirmed (lead-check.md); :4400 restarted on the repaired build; A4 accepted (forms lane backend, Screen 02 progress screen); restart-script finding carried.
