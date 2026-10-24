# Lane: screens — Milestone 2 screens

## From the Lead
2026-10-24 (Lead): Screen 01 checked and **merged (1cb174a6)**; :4400 runs it. Screen 01 becomes DONE when qa's after-merge passes. Set stage FIX, owner Builder, for one small pass: QA-14 (same-parent names unique in the database, normalised name), QA-17 (Recent steps show the date when not today), and the Lead check's L1–L3 (`screens/01-programs-catalogue/lead-check.md`: grounding 'finding 3' 404, browser C2.7 wait, six type errors in check_screen01_api.ts). Then CHECK (reviewer + breaker) → owner Lead. Screen 02 DESIGN starts when the founder has walked the Screen 02 draft (P-79, P-80 already decided). For Screen 03 later: P-76 PQR (BR-14 updated in the draft), C4.2, C4.7, C4.8. Stop your isolated copies at the end of each stage (LANES.md).

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: 01-programs-catalogue
stage: CHECK
owner: Lead
next_action: Lead check of the small FIX (build-notes "Small FIX after the merge" + "CHECK round 3"), merge (new migration 20261024090000: prisma generate + migrate deploy; existing duplicate names keep no key and are listed by the query in the migration), then the qa after-merge; Screen 01 DONE when it passes.
then: Screen 02 DESIGN (Lead concept with P-61–P-63 and the A4 progress screen; builder feasibility challenge).
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-24 · 01 · FIX → CHECK · QA-14 one name per parent in the database (normalised key, partial unique index, app keys other scripts), QA-17 dates on steps, L1 (cause: wrong database; checks now verify it), L2 waits, L3 type errors 39 → 0; CHECK round 3: reviewer Ship 9/10, breaker 0 Major/7 Minor, all fixed. Rules 67, API 135, browser 136, channels 42, grounding 29, forms 106. AI US$0.
- 2026-10-24 · 01 · CHECK → FIX · applied Lead note 2026-10-24 (merged 1cb174a6; small FIX: QA-14, QA-17, L1–L3).
- 2026-10-23 · 01 · FIX → CHECK · P-74 extension: C1.6 channel per line + filing method (row and page), C1.7 portal + default channel, C2.7 add an online form (awaiting a second person; continue/abandon), C2.10 what drafting reads per form, C3.10; CHECK round 2 (reviewer 8/10, 2 Must; breaker 3 Major) fixed: portal reviewed, version checks, no stuck captures. Rules 65, API 130, channels 42, browser 135, race safe. AI US$0.
- 2026-10-23 · 01 · FIX → CHECK · One pass: QA-1 release gate (both routes, per person, rolled back if the draft moves during release), QA-13 re-add restores the line, QA-3/5/6/7/9/10/11/12, P-63 words, step said once, default channel; reviewer Ship after fixes 8.5/10 (2 Must, 5 Should) and breaker 4 Major/9 Minor fixed in the same pass. Rules 63, API 130, browser 118, race 7/7, grounding 29, forms 106, scale 17/17. AI US$0.
- 2026-10-23 · 01 · DEMO → FIX · applied Lead note 2026-10-23 17:05 (founder: close Screen 01 in one FIX pass, qa retest, then DONE). Lane copy bound to screens.
- 2026-10-23 · 01 · CHECK → DEMO · Lead: AI repair A1–A3, A6 confirmed (lead-check.md); :4400 restarted on the repaired build; A4 accepted (forms lane backend, Screen 02 progress screen); restart-script finding carried.
- 2026-10-23 · 01 · CHECK · Founder decided P-62 (setup model) and P-63 (form field words). No stage change; workflow package next, then Lead recheck of the AI repair.
- 2026-10-23 · 01 · CHECK · Founder decided P-61 (online forms); Lead proposed P-62 (end-to-end setup model). No stage change; Lead recheck of the AI repair still next.
- 2026-10-23 · 01 · CHECK · Lead: founder chose local git + 4 lanes (R-75, workflow package pending); P-61 online forms proposed (R-76). Lead recheck of the AI repair still next.
- 2026-10-23 · 01 · FIX → CHECK · AI drafting repair (P-60, no control cut): one fact naming rule in contracts, v2 prompt/schema and studio; entries checked one by one (bad entry → needs a person, rest kept); plain FAILED messages; four IMM 1344 answers recovered at US$0 (233/233 kept; browser: saved answer → 161 mapped, 44 to decide); paid repeat of a failed run refused; printed edition sent to the AI. A4 proposal for the Lead. Suites: AI drafting 48/48, rules 54/54, engine 38/38, grounding 29/29, orchestration 22/22, API 94/94, browser 101/101 (quiet machine). AI US$0.
