# Lane: screens — Milestone 2 screens

## From the Lead
2026-10-23 17:05 (Lead): **founder decision: close Screen 01 with one FIX pass, retested by the qa lane, then DONE (no more demo rounds).** Set stage FIX, owner Builder. Fix in one pass, each with a pass and a fail test: QA-1 (Critical) the shared Release page must require submission and expert sign-off (`api/src/studio.ts:527-547`, and correct `check_screen01_api.ts` line 135, which asserts the bug as a pass); QA-13 (Major) re-adding a removed form 409s (`api/src/programs.ts:291-305`: reuse or re-version the retired line); QA-7 (Major) show the server's field message for a too-long name; QA-9 (Major) bring `check_studio_browser.cjs` Pass B, `fixtures/scale_100.ts` and `check_catalogue_scale.cjs` up to Layout v2; QA-6, QA-10, QA-11, QA-12, QA-5, QA-3 (Minor); P-63 words on every screen ("box(es)" → "form field(s)", "box map" → "field map"); the next step not repeated under each missing item; "+ Add line" calls `defaultChannelFor` (F1 is on main). Then CHECK (reviewer + breaker) → owner Lead; the qa lane retests before DONE. Details: `qa/BUGS.md`.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_screen: 01-programs-catalogue
stage: DEMO
owner: Founder (with Lead)
next_action: Founder walks Screen 01 on :4400 (restarted 13:40 on the repaired build) as author and as reviewer, with the Lead (`screens/01-programs-catalogue/lead-check.md`). Then DONE or FIX. Carried to the next fix pass: restart script must restart only its own port (lead-check finding 1).
then: Screen 02 DESIGN (Lead concept with P-61–P-63 and the A4 progress screen; builder feasibility challenge).
blocked_by: none
updated: 2026-10-23

## Log (last 10 lines)
- 2026-10-23 · 01 · CHECK → DEMO · Lead: AI repair A1–A3, A6 confirmed (lead-check.md); :4400 restarted on the repaired build; A4 accepted (forms lane backend, Screen 02 progress screen); restart-script finding carried.
- 2026-10-23 · 01 · CHECK · Founder decided P-62 (setup model) and P-63 (form field words). No stage change; workflow package next, then Lead recheck of the AI repair.
- 2026-10-23 · 01 · CHECK · Founder decided P-61 (online forms); Lead proposed P-62 (end-to-end setup model). No stage change; Lead recheck of the AI repair still next.
- 2026-10-23 · 01 · CHECK · Lead: founder chose local git + 4 lanes (R-75, workflow package pending); P-61 online forms proposed (R-76). Lead recheck of the AI repair still next.
- 2026-10-23 · 01 · FIX → CHECK · AI drafting repair (P-60, no control cut): one fact naming rule in contracts, v2 prompt/schema and studio; entries checked one by one (bad entry → needs a person, rest kept); plain FAILED messages; four IMM 1344 answers recovered at US$0 (233/233 kept; browser: saved answer → 161 mapped, 44 to decide); paid repeat of a failed run refused; printed edition sent to the AI. A4 proposal for the Lead. Suites: AI drafting 48/48, rules 54/54, engine 38/38, grounding 29/29, orchestration 22/22, API 94/94, browser 101/101 (quiet machine). AI US$0.
- 2026-10-23 · 01 · FIX · Lead gave the founder parallel-work options (R-74); no stage change. Builder AI repair still next.
- 2026-10-23 · 01 · FIX · Lead published the executive report for the founder (R-73). No stage change; builder AI repair still next.
- 2026-10-23 · 01 · CHECK → FIX · Founder: no quality control is cut (P-60); Option 1 withdrawn. Lead fixed the snapshot hook (92 s → 2 s). Builder: AI drafting repair A1–A4, A6 (lead-ai-check.md), then all suites, Lead recheck, DEMO.
- 2026-10-23 · 01 · CHECK (on hold) · Lead recheck: items 1–6 confirmed in the browser on fresh :4420; browser suite on fresh :4405 100/101 (only filter 280 ms > 200 ms, load 17→35). AI drafting cause found (`screens/01-programs-catalogue/lead-ai-check.md`). Lead advises a lean gate, not Option 1; stage and hold left as the builder set them.
- 2026-10-23 · 01 · FIX → CHECK · Six Lead-check items fixed: one setup-step function feeds the row, header and missing list (+ "Add questions" wording, AI never writes questions); Screen 01 files typed with contract response types, `any` ratchet (439) in the stop check; warnings scoped to what the combination reads and linked; plural, Questions tile, LMIA note. Rules 54/54, API 94/94, engine 38/38; browser 100/101 at load ~10 (only the 200 ms view-change budget; machine load 9–31 from other apps); rerun on a quiet machine. AI US$0. :4400 data untouched.
