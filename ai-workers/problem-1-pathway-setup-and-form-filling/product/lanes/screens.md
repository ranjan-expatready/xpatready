# Lane: screens — Milestone 2 screens

## From the Lead
2026-10-23 17:05 (Lead): **founder decision: close Screen 01 with one FIX pass, retested by the qa lane, then DONE (no more demo rounds).** Set stage FIX, owner Builder. Fix in one pass, each with a pass and a fail test: QA-1 (Critical) the shared Release page must require submission and expert sign-off (`api/src/studio.ts:527-547`, and correct `check_screen01_api.ts` line 135, which asserts the bug as a pass); QA-13 (Major) re-adding a removed form 409s (`api/src/programs.ts:291-305`: reuse or re-version the retired line); QA-7 (Major) show the server's field message for a too-long name; QA-9 (Major) bring `check_studio_browser.cjs` Pass B, `fixtures/scale_100.ts` and `check_catalogue_scale.cjs` up to Layout v2; QA-6, QA-10, QA-11, QA-12, QA-5, QA-3 (Minor); P-63 words on every screen ("box(es)" → "form field(s)", "box map" → "field map"); the next step not repeated under each missing item; "+ Add line" calls `defaultChannelFor` (F1 is on main). **Also in this pass (founder 23 Oct, P-74): make the recent decisions visible on Screen 01 using the merged forms back end** (`api/src/forms.ts`, `api/src/form-lines.ts`, `engine/channels.ts`): C1.6 each form line's channel and the combination's filing method on the row and the combination page, the author sets the channel per line; C2.7 "Add an online form" on the combination (saved blank portal page or the template), shown "awaiting a second person" until approved; C3.10 no "box" anywhere. The capture review itself is Screen 02. Then CHECK (reviewer + breaker) → owner Lead; the qa lane retests before DONE. Details: `qa/BUGS.md`. **Also (18:10, founder's gap review):** C1.7 the combination's portal and each line's default channel (Online where IRCC files online); C2.10 on the combination's sources tab, per form: which source drafting reads (PDF version first, online screens for differences) with a per-form override. Capability rows in `qa/CAPABILITIES.md`.

2026-10-23 17:55 (Lead): no change to the Screen 01 fix pass. For Screen 03 later: founder decided P-76 (PQR inside the SQR, AI-drafted picks approved by a person, released with the combination); Screen 03 draft BR-14 updated; capabilities C4.2, C4.7, C4.8.

2026-10-23 18:40 (Lead): no change to the Screen 01 fix pass. For Screen 02 later: founder decided P-79 (one "To review" page first under Configure, also listing combinations waiting for release as links); PRODUCT §3 menu, SCREENS 02 and the Screen 02 draft updated; capability C5.3.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: 01-programs-catalogue
stage: CHECK
owner: Lead
next_action: Lead check of the one FIX pass (build-notes "Fixes (one FIX pass to close Screen 01, 23 Oct)" + "CHECK → FIX in the same pass"), merge, then the qa lane retests QA-1/3/5/6/7/9/10/11/12/13 before DONE. Open Minors for the Lead: deny by default, atomic baseRevision, m9 words, approver buttons on Sources.
then: Screen 02 DESIGN (Lead concept with P-61–P-63 and the A4 progress screen; builder feasibility challenge).
blocked_by: none
updated: 2026-10-23

## Log (last 10 lines)
- 2026-10-23 · 01 · FIX → CHECK · One pass: QA-1 release gate (both routes, per person, rolled back if the draft moves during release), QA-13 re-add restores the line, QA-3/5/6/7/9/10/11/12, P-63 words, step said once, default channel; reviewer Ship after fixes 8.5/10 (2 Must, 5 Should) and breaker 4 Major/9 Minor fixed in the same pass. Rules 63, API 130, browser 118, race 7/7, grounding 29, forms 106, scale 17/17. AI US$0.
- 2026-10-23 · 01 · DEMO → FIX · applied Lead note 2026-10-23 17:05 (founder: close Screen 01 in one FIX pass, qa retest, then DONE). Lane copy bound to screens.
- 2026-10-23 · 01 · CHECK → DEMO · Lead: AI repair A1–A3, A6 confirmed (lead-check.md); :4400 restarted on the repaired build; A4 accepted (forms lane backend, Screen 02 progress screen); restart-script finding carried.
- 2026-10-23 · 01 · CHECK · Founder decided P-62 (setup model) and P-63 (form field words). No stage change; workflow package next, then Lead recheck of the AI repair.
- 2026-10-23 · 01 · CHECK · Founder decided P-61 (online forms); Lead proposed P-62 (end-to-end setup model). No stage change; Lead recheck of the AI repair still next.
- 2026-10-23 · 01 · CHECK · Lead: founder chose local git + 4 lanes (R-75, workflow package pending); P-61 online forms proposed (R-76). Lead recheck of the AI repair still next.
- 2026-10-23 · 01 · FIX → CHECK · AI drafting repair (P-60, no control cut): one fact naming rule in contracts, v2 prompt/schema and studio; entries checked one by one (bad entry → needs a person, rest kept); plain FAILED messages; four IMM 1344 answers recovered at US$0 (233/233 kept; browser: saved answer → 161 mapped, 44 to decide); paid repeat of a failed run refused; printed edition sent to the AI. A4 proposal for the Lead. Suites: AI drafting 48/48, rules 54/54, engine 38/38, grounding 29/29, orchestration 22/22, API 94/94, browser 101/101 (quiet machine). AI US$0.
- 2026-10-23 · 01 · FIX · Lead gave the founder parallel-work options (R-74); no stage change. Builder AI repair still next.
- 2026-10-23 · 01 · FIX · Lead published the executive report for the founder (R-73). No stage change; builder AI repair still next.
- 2026-10-23 · 01 · CHECK → FIX · Founder: no quality control is cut (P-60); Option 1 withdrawn. Lead fixed the snapshot hook (92 s → 2 s). Builder: AI drafting repair A1–A4, A6 (lead-ai-check.md), then all suites, Lead recheck, DEMO.
