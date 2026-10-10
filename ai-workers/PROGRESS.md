# Workstream 2 progress tracker

*One page, always current. The Lead keeps the plan table; every agent appends to the log at the bottom when it starts, hits a milestone, or finishes. Read this before `NEXT.md` if you only have one minute.*

## Plan and status (rebuilt 9 Oct 2026 after AIW-D28: three layers, one outcome each)

| Step | What it is, in plain words | The one outcome | Builds on | Status |
|---|---|---|---|---|
| 0. Groundwork | Read every requirement document, the code and the competitors; list every possible AI Worker; check what AI costs to run and the Canada rule | The raw material (done): `design/`, `research/`, `commercial/provider-and-cost.md` | — | **Done** (W1, W2, provider/cost; all reviewed) |
| 1. The AI organisation | The AI personas in business terms: name, job, what they do and never do, who approves, how they fit the firm's team. Written so Ranjan can show business people | One page: the AI organisation chart with its personas (page + `design/ai-organisation.md`) | Step 0 catalogue (28 workers become the duties of a few personas) | **Next** |
| 2. Behaviours | For each persona: what starts it, what it does step by step, what it must never do, where the person approves, what it records, one worked example | One behaviour document per persona (`design/behaviours/`) | Step 1 | Not started |
| 3. Build specification | What the team builds from: functional and technical requirements, use cases, PRD, generated tests, in the same document format as the Drive FR documents | Requirement documents in `requirements/` (+ change notes to existing FR documents for the 41 improvements) and a clickable prototype in `prototype/` | Step 2; the residency decision | Not started |
| 4. Build and pilot | The team builds; one firm uses it for a month with a named person approving everything | Working AI Workers; measured hours saved | Step 3 | Not started |
| 5. Price and sell | Ten conversations with future customers (licensed consultants); then the price in the money model | Price card confirmed; `../commercial/plan.md` section | Step 1 (to show) and 4 (to measure); drafts ready in `commercial/` | Drafts ready; conversations not run |
| 6. Raise | High-level investor story plus the detailed report; 2–3 raise options | Investor pages, published only on Ranjan's yes | Steps 1, 4, 5 | Not started |

## Per step: who owns it, the artefact, the quality gate, the model (AIW-D29)

| Step | Owner | Artefact format (one, no side files) | Quality gate before Ranjan sees it | Session model |
|---|---|---|---|---|
| 1. AI organisation | Ranjan (we make, he sells with it) | Markdown source + one web page (org chart, personas, "does / never does / who approves"). A slide deck only when he has a meeting | Every persona traces to catalogue workers; every "does" traces to a requirement ID; no superlative without a source; business words only; adversarial review passed | Lead and checker: Fable 5.1. Maker: Fable 5.1 (one maker, sequential) |
| 2. Behaviours | Ranjan | One Markdown file per persona: trigger, steps, never-does, approval point, what is recorded, one worked example with real field names | Every step maps to an existing product action, Doer or pack rule (cited); no new product feature unless listed as a gap in `assumptions.md`; the example runs end to end on paper; adversarial review passed | Fable 5.1 (personas can run in parallel, one maker each, Lead integrates) |
| 3. Build specification | Ranjan (hands to the team) | Requirement documents in the Drive FR format (`requirements/`), change notes for existing FR documents, generated test cases in the team's test-case format, and a standalone clickable prototype (`prototype/`, every screen traced to a requirement; the simulator is retired) | Format matches the Drive FR documents; every requirement cites its Step 2 behaviour and the Drive requirement it extends; privacy and regulatory flags listed for counsel; tests generated from the spec; prototype walked through; adversarial review passed | Fable 5.1 for spec and review; Opus 5.5 for bulk test generation |
| 4. Build and pilot | Tech team | From us: a readiness checklist and a pilot measurement sheet (spreadsheet) | Team's own gates | — |
| 5. Price and sell | Ranjan / Sanjay | Conversation guide (Markdown, printable), scoring sheet (spreadsheet), then the section in `../commercial/plan.md` and `model.xlsx` | Ten scored conversations before any price is called final | Fable 5.1 |
| 6. Raise | Ranjan | Investor deck (PowerPoint from the brand kit) + the detailed report (web page / PDF) | Every number sourced or labelled; adversarial review; published only on Ranjan's yes | Fable 5.1 |

## Plan review, 9 Oct 2026 (Lead, on Ranjan's ask; any agent may propose the next one via `proposals.md`, type Plan)

Gaps found and the adjustment made, lens by lens:

| Lens | Gap | Adjustment |
|---|---|---|
| Business | Step 1 showed personas but not their worth | Each persona in Step 1 carries one line: the hours it saves (Assumption until the pilot) and the unit it would be charged by |
| Operations | Nobody described how a firm runs the AI organisation day to day | Step 1 adds "How a firm runs it": switching on, setting autonomy per action, the approvals queue, the audit view. Step 2 adds "how we measure it" to every behaviour |
| Finance | Cost to serve per persona was only in the provider file | Step 2 adds cost drivers per behaviour (from `commercial/provider-and-cost.md`); Step 5 prices against them |
| Revenue | Step 5 waited for Step 4 | Step 5 conversations start as soon as Step 1 is approved (show the organisation page); the price is confirmed after the pilot measures hours |
| Legal, regulatory | Counsel had no gate | Step 2 output lists every "confirm with counsel / RCIC" item; Step 5 does not quote a price to a lawyer before counsel has read that list |
| Technical | The Canada processing rule could invalidate Step 3 | A decision checkpoint before Step 3: residency wording chosen (Ranjan), provider route confirmed by a test call (team). Step 3 designs the provider as replaceable either way |
| Data, privacy | Law 25 / PIPEDA points lived in one file | Step 3 gate: privacy flags per requirement, for counsel |
| Ease of use | No user ever sees a screen before the team builds | Step 3's prototype is shown in the Step 5 conversations; their reactions go into Step 3 before it is handed to the team |
| Team handover | The 41 improvements had no path to the team | Step 3 writes them as change notes to the existing FR documents, in the FR format, for Ranjan to place on Drive |
| Freshness | Drive folders outside the two FR folders were never opened (the "Expatready" shared folder: Requirement Docs, Product Docs, Technical Docs; Tanu's SuperAdmin business requirements) | First task of Step 1: open them, record in `sources/README.md` whether each is current, superseded or irrelevant |

**Session rule:** each step starts in a new session (clean context, files are the memory). The Lead says "cut here, open a new session" at every logical cut-out (a step done, a review done, or a change of topic) and `PROMPTS.md` §2 holds the exact prompt to paste.

Blocking risk across all steps: the Canada-only processing rule (`commercial/provider-and-cost.md` §2, §4); a founder decision on the wording, then counsel.

## Waiting on Ranjan
- ~~Yes to start Step 1~~ given 9 Oct (AIW-D29). Start it in a new session with `PROMPTS.md` §2.
- Residency wording: AG11-D15 "only in Canada" or SA-11 §3.6 "with documented safeguards".
- ~~Licensed-only approval~~ replaced by human approval per the firm's role settings (AIW-D26).
- Update the Program Charter on Drive (still says "not in Release 1"); Ranjan: launch needs all of it (AIW-D21).
- ~~LMIA folder~~ resolved 9 Oct: never on Drive; decisions are inside AG-17.
- 22 decisions from review W2: on the next page.

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
| 9 Oct 21:00 | Lead | LMIA folder traced (never on Drive); W2 page built with 28 workers, product map, rules, 22 decisions; report card re-audited |
| 9 Oct 16:35 | Lead | Full audit done (REPORT-CARD §5): setup sound; SAModules re-copied (09:18Z), test-case sheet noted; 39 quotes + 5 URLs checked, 0 wrong, 1 citation gap fixed; drift: money unstarted, process over-built, D4 vs D21; 12 removals proposed; W3b moved before Phase B |
| 9 Oct 21:30 | adversarial-reviewer (W2b re-review) | Started: re-check of every review-W2 finding against the revised catalogue.md, module-map.md and ws2-improvements.md; fresh check of both files |
| 9 Oct 21:35 | commercial-strategist (provider and cost) | Started: provider/Canada-only check and File Builder cost-per-file estimate → commercial/provider-and-cost.md |
| 9 Oct 22:20 | adversarial-reviewer (W2b re-review) | Done: checks/review-W2b-2026-10-09.md — verdict: W2 can close once one line is corrected (catalogue L269 attributes a real Doc 3 v1.4 sentence to AG-17 v0.5); B-1, B-2 and 20 others fixed, M-5 and m-15 partly, m-11/m-12/m-14 untouched (outside the revised files); new: 0 blocking, 1 major, 19 minor; 28 "Why it sells" lines plus other quoted proposal wording listed for italics |
| 9 Oct 16:50 | Lead | Re-review W2b received; N-1 (FD-7 phrase re-sourced to Doc 3 L8123), two-vs-three sources, IMP-19 wording, A-W2-8 → AIW-A10, 28 "why it sells" lines to italics. W2 closed |
| 9 Oct 22:30 | commercial-strategist (provider and cost) | Done: commercial/provider-and-cost.md — 20 requirement quotes (AG-11, AG-16, SA-08, SA-11, SA-03, SA-04, FDL); 8 provider routes checked on vendor pages 9 Oct 2026 (none of Anthropic direct / Bedrock / OpenAI / Azure processes in Canada; Gemini on Google Montréal listed; Claude in Montréal contradicted between Google pages = Unknown; Cohere dedicated deployment on request); cost per prepared file CAD 0.37 / 2.24 / 14.38 (low/typical/high, Sonnet 5.5 + 10% regional, BoC 1.4240) with every input a ranged Assumption; 7 pricing risks (Law 25 s.17, PIPEDA transfers, price/tokenizer change, US-only scenario); 10 Unknowns with owners; 3 rows appended to proposals.md |
| 9 Oct 17:05 | Lead | provider-and-cost.md received; 3 claims spot-checked live (all hold); plan step 4 done; W3b (validation script + price card) launched |
| 9 Oct 17:10 | commercial-strategist (W3b validation) | Started: validation script and price card for 5–10 licensed consultants → commercial/validation-script.md, commercial/price-card.md |
| 9 Oct 17:40 | commercial-strategist (W3b validation) | Milestone: commercial/validation-script.md written (25–30 min guide in 7 timed parts: no-pitch opening, two stories from catalogue W-01/W-02, four hard claims C1–C4 incl. honest Canada-only status, price ladder, three regulator questions R1–R3, pilot and referral close; "what we must not say" table of 12 rows; one-page scoring sheet; ten empty target rows with criteria; 4 open questions) |
| 9 Oct 17:55 | commercial-strategist (W3b validation) | Done: commercial/price-card.md (three options on half-pages: (a) CAD 25–40 per prepared file, (b) 10-file allowance in Practice + overage, (c) CAD 199 per AI Worker per month with a 20-file cap [Assumption]; cost floor CAD 0.37/2.24/14.38 from provider-and-cost §3.4; firm-pays illustrations at 5/10/20 files on the Practice CAD 229 base; nearest competitor charge per option with URL and date, all Vendor claim; strongest objection and the question to answer per option; side-by-side table; reconciliation with CAD 199/seat vs 89/229/549 per firm; "what would make us wrong"). Web re-check 9 Oct 2026: no CICC AI guidance found (consistent with field-scan §6 item 9). 3 rows appended to proposals.md (W3b replaces plan.md §8 action 5 conversations; no interviewee names in ai-workers/; free pilot is an intention until plan.md §6 safeguards exist) |
| 9 Oct 17:30 | Lead | W3b drafts received; CaseEasy $25/case and Visto $29/application confirmed live; plan updated. Nothing further runs without Ranjan: removals, order, residency wording, timelines, who runs the calls, the 22 decisions |
| 9 Oct 18:00 | Lead | AIW-D28 recorded; audit removals applied (4 files archived, 7 deleted, 8 coverage files merged, source-keeper agent and resume skill removed, PROMPTS trimmed, rules merged); plan rebuilt as Steps 0–6 |
| 9 Oct 18:40 | Lead | AIW-D30: hooks automated (start + stop), one-line resume, simulator and superseded folders archived, root cleaned, Drive folder map added, plan reviewed across ten lenses and adjusted |
| 10 Oct 09:30 | Lead | Step 1 started (new session). First task done: Drive checked (4 team files changed after 9 Oct, none a requirement; no new snapshot); the two never-opened folders opened and recorded in sources/README.md (Tanu's folder = July intake-config workbooks, superseded; Expatready shared folder = mostly empty or team admin, one current item: the team's Product Vision v1.0, frozen 2 Aug, copied to the snapshot's 07-team-documents and read in full) |
| 10 Oct 09:40 | Lead | Maker (ai-worker-designer) briefed and started on design/ai-organisation.md + visual/ai-organisation.html against the Step 1 gate |
| 10 Oct 09:45 | ai-worker-designer (Step 1 maker) | Started: reading catalogue.md, module-map.md, ws2-improvements.md, assumptions.md, decisions.md D14–D30, price-card.md, provider-and-cost.md, AG-01/SA-06 roles, Product Vision §06, AG-11/AG-16/SA-12/AG-13/SA-11 for design/ai-organisation.md + visual/ai-organisation.html |
| 10 Oct 10:40 | ai-worker-designer (Step 1 maker) | Milestone: design/ai-organisation.md written — 7 personas (5 firm: Case, Intake, Billing, Firm, Practice expert; 2 Expat Ready: Pack author's, Support and account), org chart mapped to SA-06 v3.1 six starter roles + Product Vision v1.0 §06, one card each with ten fields, coverage 28/28 (0 left out), "How a firm runs it" (switch-on, autonomy, Needs you, audit, caps, emergency stop), "What this is not", naming table, 7 decisions, glossary. Note for Lead: brief's "Needs you AG-11 §3.5" is §3.13; SA-12 names no AI flag (opt-in is FD-16 cap.ai.*, switches are IMP-8/IMP-9). HTML page next |
| 10 Oct 11:30 | Lead (separate session, Sanjay's ask) | Side deliverable outside WS2: requirements-planning/ag-detailing-plan-2026-10-10.md (AG detailing order, four planes, SA-1B, Claude Code method) from the 9 Oct Drive snapshot (re-checked, unchanged) and fresh dev clones (frontend 6643b33, backend 042be70); adversarial check requested |
| 10 Oct | adversarial-reviewer (AG plan) | Started: review of requirements-planning/ag-detailing-plan-2026-10-10.md against snapshot 2026-10-09 and code copies @042be70 / @6643b33 |
| 10 Oct | adversarial-reviewer (AG plan) | Done: requirements-planning/checks/review-ag-plan-2026-10-10.md — 7 blocking (all-18-files claim, AG17-D82, AG7-D27, Doc 1 lines, AG-11 knock-on list, FD-68 not in FDL, SA-1-4 mis-cited), 20 should-fix, 6 not-re-checkable groups; order recommendation stands |
| 10 Oct 12:15 | Lead | All 7 blocking and 20 should-fix findings applied to the AG plan (counts restated with method, FD-68 gap added to §7.3, glossary added); committed |
| 10 Oct 08:10 | Lead (requirements-planning session) | Committed the Step 1 maker's draft outputs as work in progress on behalf of the parallel WS2 session (design/ai-organisation.md, visual/ai-organisation.html, proposals.md rows): unreviewed by the Lead, not yet checked; the WS2 session continues from them |
