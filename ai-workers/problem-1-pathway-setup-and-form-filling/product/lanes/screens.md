# Lane: screens — Milestone 2 screens

## From the Lead
2026-10-23 (Lead): stage stays DEMO while the founder decides how to close Screen 01. The next FIX pass carries: QA-1 the shared Release page must not bypass submission and expert sign-off (`api/src/studio.ts:527-547`); **QA-13 (Major, Lead walk 23 Oct):** "Add 1 form from the library" on Visitor visa returns 409 "the database refused a duplicate" because a RETIRED IMM 5707 line (version 1) exists and `addLine` creates version 1 again (`api/src/programs.ts:291-305`, unique `combinationId, lineageKey, version`): reuse or re-version the retired line, test pass and fail; P-63 words on the combination page ("Boxes mapped", "mapped boxes", "data boxes" → form fields); the next step repeated under both missing items; the tester's QA-3, QA-5, QA-6, QA-7, QA-10, QA-11, QA-12 (`qa/BUGS.md` on the qa branch); the forms lane's request to call `defaultChannelFor` in "+ Add line" once F1 slice 1 is on main.

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
