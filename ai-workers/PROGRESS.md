# Workstream 2 progress tracker

*One page, always current. The Lead keeps the plan table; every agent appends to the log at the bottom when it starts, hits a milestone, or finishes. Read this before `NEXT.md` if you only have one minute.*

## Plan and status (updated 9 Oct 2026)

| # | Wave / deliverable | What Ranjan gets | Status | Where |
|---|---|---|---|---|
| W1 | Evidence: fresh sources, full read of 46 documents, VisaFlo + 40 competitors, review | The evidence page | Done and reviewed; page published | `visual/w1-evidence.html`, `research/`, `design/inventory/`, `checks/review-W1-2026-10-09.md` |
| W2a | Workstream 2 baseline: reference index of every AI, Doer and Conductor requirement | One clean reference set for Workstream 2 | Done: A (9 files, 627 refs) + B (20 files, 680 refs incl. Recruiter); all quotes verified; conflicts logged in proposals.md | `design/ws2-baseline/` |
| W2b | Challenge and improve: gaps, weak points, proposals (labelled) | Decisions to take, with reasons | Not started | `design/ws2-improvements.md` |
| W2c | AI Worker catalogue and product map with workers | The visual of which worker does what | Not started | `design/workers/`, `visual/` |
| W2d | Independent review + updated visual page | Confidence it is right | Not started | `checks/`, `visual/` |
| W3a | Proposition and the wedge product (see recommendation) | What we sell first and why | Not started | `commercial/` |
| W3b | Validation script for 5–10 licensed consultants | Evidence before pricing | Not started | `commercial/` |
| W3c | Pricing and business case, added to the existing plan and money model | Numbers you can defend | Not started | `../commercial/plan.md`, `model.xlsx` |
| W3d | Investor story (high level) + detailed AI Worker report; 2–3 raise options | The raise | Not started | `commercial/`, visual |
| B | Developer-level requirements for each AI Worker, in the project's standard format, with worked examples and generated test cases | What the team builds from | Not started | `../product/requirements/` |

## Waiting on Ranjan
- ~~Licensed-only approval~~ replaced by human approval per the firm's role settings (AIW-D26).
- Update the Program Charter on Drive (still says "not in Release 1"); Ranjan: launch needs all of it (AIW-D21).
- Share the Corporate/LMIA decision folder with the Expat Ready accounts.
- ~~Wedge~~ approved: File Builder + Deadline Guardian (AIW-D17); more use cases wanted (AIW-D18).

## Agent log (append only; newest at the bottom)
| When | Agent | Status |
|---|---|---|
| 9 Oct 10:30 | source-keeper | Done: snapshot 2026-10-09 (46 files), code copies |
| 9 Oct 11:10 | competitor-analyst (VisaFlo) | Done: visaflo.md, 63 capabilities, §16 comparison (20 areas), §17 OpenVisa |
| 9 Oct 11:20 | competitor-analyst (field) | Done v2: field-scan.md rebased on 9 Oct |
| 9 Oct 12:00 | requirements-cartographer ×7 | Done: 46/46 files read in full, 7 inventory slices |
| 9 Oct 12:40 | adversarial-reviewer | Done: review-W1 (3 blocking, 8 major, 11 minor); blocking items fixed or decided |
| 9 Oct 13:10 | requirements-cartographer A, B | Started: Workstream 2 carve-out |
| 9 Oct 13:40 | ai-worker-designer | Started: use-case catalogue and module map |
| 9 Oct 13:55 | Lead | Added the four AI shapes (task, journey, role twin, expert co-pilot) to README §1 and decisions (AIW-D19); designer told to cover all four |
| 9 Oct 14:15 | Lead | Challenge review of all decisions written; final plan §3; reporting rule D20; bootstrap prompt in PROMPTS.md |
| 9 Oct 14:40 | Lead | Ranjan answered the challenge review (D21–D27); no-duplication rule, proposals.md and assume-built rule added; agents told |
| 9 Oct 15:20 | Lead | Carve-out A and B complete; improvements step launched |
| 9 Oct 15:30 | ai-worker-designer (W2b improvements) | Started: reading baseline A/B indexes and A- files for ws2-improvements.md |
| 9 Oct 12:09 | requirements-cartographer B | Finished: carve-out B — 19 Doer files + B-index in design/ws2-baseline/ (680 rows, 0 quote mismatches, ≤25-word extracts per AIW-D22); Recruiter added; 5 rows appended to proposals.md |
| 9 Oct 15:45 | ai-worker-designer (W2 catalogue) | Milestone: catalogue.md first pass (23 use cases) written; then reworked for the four shapes (AIW-D19): 28 entries incl. expert co-pilot and 4 role twins |
| 9 Oct 16:10 | ai-worker-designer (W2 catalogue) | Done: catalogue.md (28 entries, shapes, ranking, build order, hard-but-worth-it, applied D22/D25/D26), module-map.md (SA/AG/CP/Foundation → workers), 7 rows appended to proposals.md |
| 9 Oct 16:10 | Lead | Catalogue (28 workers) and module map received; improvements step still running; W2 review next |
| 9 Oct 16:40 | ai-worker-designer (W2b improvements) | Milestone: all 9 A- files, B-index, B-filler/minder/drafter/future-doers and the cited source lines read; 41 items drafted in design/ws2-improvements.md |
| 9 Oct 16:55 | ai-worker-designer (W2b improvements) | Done: design/ws2-improvements.md (41 items IMP-1..41, 10 blocking; 13 decisions for Ranjan; unknowns and assumptions listed); 6 rows appended to proposals.md (worker = recipe rule, ratify AG11-D*, FD-22 pack floor, hard limits, reproducibility wording, FD-8 amendment) |
| 9 Oct 17:05 | adversarial-reviewer (W2) | Started: review of ws2-baseline, ws2-improvements, catalogue, module-map, proposals, brief-coverage |
| 9 Oct 18:20 | adversarial-reviewer (W2) | Done: checks/review-W2-2026-10-09.md — 2 blocking (catalogue vs improvements unreconciled; ranking says "unsolved Y" where entries say Unknown), 12 major, 16 minor; baseline 128-row sample 0 mismatches; 15 improvement items verified; 22 deduplicated decisions for Ranjan listed |
| 9 Oct 17:30 | Lead | W2 review received; Lead fixed NEXT, wave brief, proposals (dedupe, invented FD-7 quote), brief-coverage, assumptions; catalogue and improvements fixes dispatched |
| 9 Oct 18:00 | Lead | Direction review written (design/direction-review-2026-10-09.md); NEXT.md handoff rewritten for a new session |
| 9 Oct 18:20 | Lead | Setup: ai-workers/CLAUDE.md, workstream rule in root CLAUDE.md, local git history started (no remote) |
| 9 Oct 18:35 | ai-worker-designer (W2b improvements) | Started: review W2 fixes to ws2-improvements.md (M-9, M-10, M-11, m-1, m-2, citation re-check) |
| 9 Oct 18:50 | ai-worker-designer (W2b improvements) | Done: ws2-improvements.md revised — plain English in every item with technical terms once in brackets; IMP-17(b) reframed as a proposed exception to AIW-D26 with the trade-off (also §10 item 4); delegation defined once in IMP-1 (aligned to A-W2-6: one named person, subset, no seat), IMP-22 refers to it; "help content" removed from IMP-20; IMP-7 VisaFlo citation now review W1 m-3 + URL/date; IMP-11 Law 25 now FD-20 + SA-11 L291/L623–624 with the automated-decision question marked Unknown; AG-18 L848 and SA-11 lines opened and confirmed; list of self-verified lines added to the header |
| 9 Oct 18:50 | Lead | Verification pass: code current, Drive re-checked (SAModules added), Charter V2 quotes verified from the slide file; freshness script fixed for any repo owner |
| 9 Oct 18:55 | ai-worker-designer (W2 catalogue) | Started: review W2 fixes to catalogue.md and module-map.md (B-1, B-2, M-1, M-2, M-6, M-7, M-8, m-2 to m-5, m-7 to m-10, m-16) |
| 9 Oct 19:30 | ai-worker-designer (W2 catalogue) | Done: catalogue.md revised and re-read end to end — reconciled to ws2-improvements (G16 hard limits/blocked list, G17 status-content templates "ask me first", Reader types attachments, AG-9-11 AUTO pending IMP-13, W-12/W-16/W-27 prepare lists never export, §1.1 is a pointer to IMP-1 with no second delegation definition, two expert sources per IMP-20); ranking "Unsolved?" replaced by an evidence column matching every entry (no Y without a cited absence); all missing fields filled; G10 and W-24 reworded per IMP-37; "why it sells" lines labelled Proposal with absolutes and legal words removed; Built/Specified/Proposed/Content on every dependency and Ease re-rated on today's state (W-01 E1, W-02 E2, W-14 E2, W-13 E1 today); W-13 FD-7 re-sourced to FDL; m-2/m-3/m-4/m-5/m-7/m-8/m-9/m-16 fixed. module-map.md: Doer plane added (§5), exports and typing aligned |
| 9 Oct 19:20 | Lead | Catalogue and module map corrected after review W2; W2 content complete pending a short re-review |
| 9 Oct 19:50 | Lead | REPORT-CARD.md created (story, ratings, plan); bootstrap prompt now starts with an audit; Charter and LMIA guidance in PROMPTS §7–8 |
