# Lane: screens — Milestone 2 screens

## From the Lead
2026-10-24 22:00 (Lead, cloud): small FIX checked and **merged** (QA-14 closed by qa's own replay, QA-17, L1–L3; `screens/01-programs-catalogue/lead-check.md`). Screen 01 becomes DONE when the qa lane's after-merge on the new main passes. Stage: waiting, owner Lead — Screen 02 DESIGN starts after the founder walks the Screen 02 draft. Carry into your next pass: QA-20 (combination page 13 px too wide at 400 px, the Filing · Portal row). Already on main for you: `run-suites.sh` reads `start KEY=VALUE` and runs the runtime and drafting-guard suites; `actorOf` now refuses an unknown or missing person (runtime S-1, closes your "deny by default" item). Sync main before your next stage.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: 01-programs-catalogue
stage: FIX
owner: Builder
next_action: Suites rerun after the CHECK-round fixes, then hand back: stage CHECK, owner Lead (reviewer Ship 9/10; breaker Major K1 fixed with all Minors).
then: Screen 02 DESIGN (Lead concept with P-61–P-63 and the A4 progress screen; builder feasibility challenge).
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-24 · 01 · CHECK → FIX · reviewer Ship 9/10 (0 Must, 3 Should), breaker 1 Major (K1 keyboard on Portal/Filed as) + 5 Minor: K1, m1–m5, Should 1–2 fixed; smallfix 23/23 (10 new checks fail on 12af01a). review.md earlier rounds → review-earlier.md.
- 2026-10-24 · 01 · DONE → FIX · applied Lead note 2026-10-24 20:20 (sent to this session; on PR #9): QA-4, QA-20, QA-22 each reproduced, fixed and tested (check_screen01_smallfix.cjs 11/11); full suites running; CHECK next.
- 2026-10-24 · 01 · FIX → CHECK · QA-14 one name per parent in the database (normalised key, partial unique index, app keys other scripts), QA-17 dates on steps, L1 (cause: wrong database; checks now verify it), L2 waits, L3 type errors 39 → 0; CHECK round 3: reviewer Ship 9/10, breaker 0 Major/7 Minor, all fixed. Rules 67, API 135, browser 136, channels 42, grounding 29, forms 106. AI US$0.
- 2026-10-24 · 01 · CHECK → FIX · applied Lead note 2026-10-24 (merged 1cb174a6; small FIX: QA-14, QA-17, L1–L3).
- 2026-10-23 · 01 · FIX → CHECK · P-74 extension: C1.6 channel per line + filing method (row and page), C1.7 portal + default channel, C2.7 add an online form (awaiting a second person; continue/abandon), C2.10 what drafting reads per form, C3.10; CHECK round 2 (reviewer 8/10, 2 Must; breaker 3 Major) fixed: portal reviewed, version checks, no stuck captures. Rules 65, API 130, channels 42, browser 135, race safe. AI US$0.
- 2026-10-23 · 01 · FIX → CHECK · One pass: QA-1 release gate (both routes, per person, rolled back if the draft moves during release), QA-13 re-add restores the line, QA-3/5/6/7/9/10/11/12, P-63 words, step said once, default channel; reviewer Ship after fixes 8.5/10 (2 Must, 5 Should) and breaker 4 Major/9 Minor fixed in the same pass. Rules 63, API 130, browser 118, race 7/7, grounding 29, forms 106, scale 17/17. AI US$0.
- 2026-10-23 · 01 · DEMO → FIX · applied Lead note 2026-10-23 17:05 (founder: close Screen 01 in one FIX pass, qa retest, then DONE). Lane copy bound to screens.
- 2026-10-23 · 01 · CHECK → DEMO · Lead: AI repair A1–A3, A6 confirmed (lead-check.md); :4400 restarted on the repaired build; A4 accepted (forms lane backend, Screen 02 progress screen); restart-script finding carried.
- 2026-10-23 · 01 · CHECK · Founder decided P-62 (setup model) and P-63 (form field words). No stage change; workflow package next, then Lead recheck of the AI repair.
- 2026-10-23 · 01 · CHECK · Founder decided P-61 (online forms); Lead proposed P-62 (end-to-end setup model). No stage change; Lead recheck of the AI repair still next.
