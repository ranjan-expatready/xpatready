# SA-01B v2.1: who builds what, the founder's decisions, and what we hand the team (2 Nov 2026)

Companion to `sa01b-v2.1-impact-2026-11-02.md` (the v1.5 → v2.1 change list). This file adds what that report could not see, the founder's answers of 2 Nov, and the high-level split for the team.

**Sources (read only):** the name-free copy `domain/requirements-2026-11-02/` (from the Drive snapshot of 2 Nov, 10:54 IST): SA-01B v2.1 (27 Oct, all 7,388 lines, Parts A–D), SA-01B-v2.0-KNOCK-ONS (26 Oct), AG-07 v3.12 (28 Oct), AG-19 PDF Studio v1.10 (26 Oct, new module), DEV-TASKS (27 Oct), DEV-QA-CHANGE-SUMMARY (22–27 Oct), the DEV-HANDOVER files. Line numbers below are SA-01B v2.1 lines unless stated. Ours: `DECISIONS.md`, `STAND-INS.md`, `screens/W1-baseline/scope-boundary.md`, `qa/CAPABILITIES.md`.
**How it was made:** five reader agents (SA-01B in four parts; AG-19, AG-07, knock-ons and the team's build order), two architects arguing opposite splits (team-first, POC-first), and an independent judge who checked about 30 cited lines; then the founder answered one question at a time.

## 1. Read this first

* **The team's own launch waits on our POC.** AI drafting is off at launch "until the product owner's go on the proof-of-concept counts" (lines 76, 277, 5778, 6603). The reading confidence threshold and the Canadian-region reading test are also "set from the proof of concept" (open questions ch9 Q2, Q6). Our POC is the only source of that evidence.
* **The team's code is behind on the core** (Part C6 "What is built today", lines 6391–6511): the filler is principal-only, the map editor is a stub, the XFA engine is a local branch (0.0.0) not wired to cases, and there is no resolver, Filing record, answer-key runner or Case model yet. Their written build order puts case forms after money, bookings and PDF Studio (DEV-TASKS).
* **Knock-ons are not applied.** None of the 298 SA-01B change notes to 37 other epics are applied (AG-07 v3.12, AG-08 v1.15 and AG-09 v1.27 show only other changes; AG-03 is still v1.5 of 21 Oct). Until they are, **SA-01B v2.1 wins** over older AG-03/07/08/09 text (the team's own rule, 27 Oct change summary). Cite SA-01B v2.1 and the knock-ons file, never the older epic lines. 17 "not placed" rulings remain open with the team's product owner.
* **AG-19 PDF Studio is not a form filler.** It is page tools (combine, split, compress, scan, unlock, redact), Release 1, not built; it refuses government forms and sends them to the case's Forms tab (AG-07). The real overlap with our filling is the team's form viewer (AG-7-109) and answer sheet (AG-7-108): autofill is back in Release 1 (AG07-D28) and covers all IRCC PDF forms at launch (SA1B-D113). Our 29 Oct note "team launch output is answer-sheet only" is out of date.

## 2. Who builds what (high level, for the team)

M2 = Super Admin configuration gate · M3 = case runtime on the Visitor visa and the six combinations · M4 = later: extension, Corporate Sample, hand-over. "Team" = SA-01B chapters and sibling modules, Release 1 unless stated.

| # | Chunk | The team builds | The POC builds | The POC hands over | POC milestone |
|---|---|---|---|---|---|
| 1 | Sources, facts, fees, key dates | Source register, fee lines with a basis, key dates; "no source, no publish" (ch.1, ch.3) | Sourced facts only (page, quote, date); both publish gates (P-240); fee basis incl. "family maximum" (P-247) | One register-ready row per fact (fees, thresholds, document rules) | M2 |
| 2 | Library: fields, sections, answer lists | Canonical field store with four scopes, fallback source, stable list IDs (ch.2; not built) | Catalogue made from real forms, reviewed merge and aliases (the team has no merge, line 955); field scope (P-239); must-verify flag (P-242); creation sourced-only (P-241) | Field catalogue with scope, "whose fact", aliases, merge rules | M2 (scope M3) |
| 3 | Documents | Document master (11 categories), storage, status, scan (ch.3, AG-09) | Document types, alternatives, validity at the target filing date, the facts a document supplies; rules-first reader with "Confirm & use" (P-242, P-243) | Document types per combination with validity rules and sources; reader evidence | M2 rules, M3 reader |
| 4 | Forms and field maps | Form and edition store, map editor, XFA engine, per-person maps for every Release 1 IRCC form (ch.4) | Intake, edition checks, accepted-until, per-person maps for the six combinations' forms | Maps per edition with fill evidence; edition rules with IRCC quotes | M2, M3 |
| 5 | Rules, PQR, assessment | PQR per country (released view), prospect module, qualifier and scoring (ch.5, AG-03) | PQR authoring picks per combination (input to the country view, P-246); "Case check from confirmed facts", staff only, three outcomes (P-236); only personal details carry PQR → SQR (P-235) | Three-outcome test cases; gate rules with sources | M2 authoring, M3 case check |
| 6 | Structure and resolver | Programme tree, rows, line sets, startable check, resolver (ch.6; resolver not built) | Pathway → combination, Start setup, resolver per person per filing, six combinations; startable needs a form line (P-248) | Structure schema, 20 validation cases, six combinations as data, resolver tests | M2, M3 |
| 7 | Review, release, versions, pins | Draft-review-publish, answer-key gate, corrections vs rule changes, withdraw, firm adoption and roll-back, pin on the filing (ch.1, ch.8) | Author-side flow with the second person; answer-key family editor and runner (P-240; the team's is not built); "Demo release" for Sample content; pin moved to the filing (P-246) | Signed answer-key families, gate spec, review-time log | M2 |
| 8 | Case and facts | Case, Filing, stages, case page, answer store, client portal and questionnaire shell (AG-07 ch.1–3, AG-08) | SQR renderer, filings, groups and waits, declared answers fill at once and read values wait for "Confirm & use" (P-242), officer-recorded background answers with client re-confirm (P-244), family link | Pin-on-filing contract, fact-source matrix, three journeys as acceptance scripts (family work permit J1, sponsorship J3, Visitor visa) | M3 |
| 9 | Fill, Validate, answer sheet, Ready to file | Form viewer, in-app Validate, answer sheet, Approve filing, Sign with my signature (AG-07 ch.5; not started) | Append-only writer, read-back, barcode comparison checked in Adobe (P-46 kept); Ready to file with BR-4: only a form's own Validate stops staff, everything else a CRITICAL warning passed with a reason (P-237, P-238) | Fill-evidence set per form as the team's test oracle | M3 |
| 10 | Chrome extension and portal sheet | **Portal sheet only** (SA-1B-173). The team drops its own "Fill this screen" (SA-1B-175) (P-245) | **One AI-assisted Chrome extension** (P-245): page structure first, masked AI vision as fallback, match saved per screen version, changed screens re-matched and highlighted, representative checks each screen before Next, sign-in helper that never touches credentials | Portal-screen maps for IMM 0008, 5669, 5406, 5562 | M4 |
| 11 | Corporate | Employer workspace in Release 1: LMIA employer file, clocks, fee per position, links (ch.11, AG-17) (P-239) | Organisation and filing scope in the data model (M3); one Sample employer combination with the link (M4). Selling it as an add-on stays the founder's call | Scope and shareable-mark fixtures | M3, M4 |
| 12 | AI drafting and reading | Setup AI switch, "made by" report, provider terms, region; Reader (AG-11); off until the switch | Drafting with two checker rounds and a cited source; rules-first document reading with staff confirmation | **The counts** (AI draft vs person edit per area, errors; review time logged by us, since the team's report counts none, lines 320, 5794); reader confidence and Canadian-region evidence | M2, M3 |
| 13 | Platform around it | Firms, plans, billing, messages, tasks, Minder deadlines, storage, audit, import, PDF Studio (SA-2…12, AG-01, 06, 10, 11, 18, 19) | Stand-ins only (STAND-INS), no new build | None | none |

## 3. Founder decisions, 2 Nov (recorded by the tech lead)

| P-id | Conflict | Decision (founder's words in quotes) | Amends | Lands |
|---|---|---|---|---|
| P-235 | PQR answers pre-filling the SQR | Team's rule: only personal details carry | P-77(1), C6.8 | after M3 |
| P-236 | Assessment on the case | "Keep, rename, scope": "Case check from confirmed facts", staff only, three outcomes | P-77(2), P-164, C6.9 | M3 |
| P-237 | What may stop Ready to file | "Adopt the team's rule" (BR-4): only a form's own Validate is a hard stop; signatures, edition past accepted-until, missing representative review become CRITICAL warnings with a reason | P-168, P-151(1) | M3 |
| P-238 | Missing or conflicting facts (P-71) | "Yes, same rule: warn" | P-71 | M3 |
| P-239 | Corporate timing | "Team's timing, your packaging" | P-178 | M3, M4 |
| P-240 | Publish gates | "Adopt both gates; Sample = demo only" | P-170, C5.1 | M2 (C5.4–C5.7) |
| P-241 | Hand authoring | "Keep P-158 (no free Add)"; hand correction stays allowed | confirms P-158 | none |
| P-242 | What fills a form | "Team's rule + must-verify flag" | P-72, P-78 | M3 |
| P-243 | Identity fields review | "Collapse only check-digit-backed"; names stay open; error rate measured | P-142 | M3 |
| P-244 | Officer records background answers | "Allow, marked; client re-confirms"; declarations client-only | P-97, C4.9 | M3 |
| P-245 | Chrome extension | "we want to build our own Chrome extension … it should be built as a part of ourselves"; then "Ours; team drops theirs" | P-152(3) (timing P-102 kept) | M4 (E1–E6) |
| P-246 | Lead-decided (1)–(4) | PQR per country as the released view · pin per filing · P-134 kept (team to reword lines 1608, 1616) · P-46 kept (team builds in-app Validate, the POC keeps Adobe as oracle, builds no viewer) | P-132, SI-11 | M2/M3 |
| P-247 | Family fee cap | "Keep the cap; ask team for a basis" | confirms P-171 | M2 (R2), M3 (C6.12) |
| P-248 | Startable | "Need a form line; portal screen counts", then "Refuse; warn earlier": the page warns while configuring; Release is refused without a form line (PDF form, portal-screen edition or drafted online-only form) | P-207 | M2 (C5.1, row G5) |

## 4. What we send the team (D4: challenges with evidence)

Each goes once, with the founder's decision and the source.
1. **No free Add (P-241):** every item traces to an IRCC form, checklist or a quoted AI proposal; hand correction stays. The team's launch pack is typed by hand (line 299); we ask that hand-made items still cite a source and show "made by: person".
2. **Family fee cap (P-247):** canada.ca's visitor-visa family maximum (CAD 500 for 5 or more). We ask for a fourth fee basis "family maximum" next to BR-42's three; until then a warning text in their product.
3. **No AI at fill time (SA-1B-35) vs our extension (P-245):** our guards: the match is saved per screen version and reviewed; the representative checks every screen before Next; no Next, Submit, declaration or signature; masked values to AI; sign-in by the representative only. We ask the team to drop SA-1B-175 and keep SA-1B-173.
4. **Identity review (P-243):** collapse only check-digit-backed fields; names stay open. We will send the error rate.
5. **P-134 wording:** lines 1608 and 1616 read as AI reading passports; our rule is rules-first (machine-readable zone) with no AI on identity documents. Ask to reword.
6. **P-46:** we keep Adobe as the oracle for fills; their in-app Validate should be proven against Adobe first (their own BR-31 says the same).
7. **P-237 and P-238:** we now follow BR-4; their spec and ours match.

## 5. The hand-over evidence pack (what only the POC can give)

1. **AI counts** per content area: AI drafts, a person's edits, errors, and review time (logged by us). Needs live runs: each batch needs the founder's Go with its cost first (P-175, P-225).
2. Field maps and fill evidence for the six combinations' forms (per person, read-back, barcode comparison).
3. The four-check trial record per form edition.
4. Register-ready sourced facts (P-170, P-171, P-230).
5. Answer-key families (made-up families; Sample until the immigration expert signs).
6. Reader evidence: confidence, the identity-field error rate (P-243), Canadian-region reading (Sample documents only, P-133).
7. Three acceptance journeys (J1 family work permit, J3 sponsorship, Visitor visa).
8. Portal-screen maps (M4) and the decision log with IRCC citations.

## 6. Open questions of the team we can answer now (Part D5)

D5 has 55 open questions (product owner 2, immigration expert 18, developers 33, counsel 2); about 25 touch the POC. Ready to answer from our decisions:
* Q1-7 sample families for the second person's view: the six combinations' made-up families (P-112).
* ch4 Q5 signature-date box: P-143 per line; IMM 5409's place and date stay blank (P-171(2)).
* ch4 Q6 two editions on one day: model "accepted until" (P-151).
* ch4 Q14 barcodes made outside Adobe: always Validate barcode forms (P-171, P-46).
* ch6 Q7 roles others depend on: sponsorship cannot be sent alone; nomination before the PR application (P-135).
* ch2 Q7 background block: the background question needs the representative's review (P-230(1)).
* ch5 Q12 prospect fields that carry to the case: personal details only (P-235); the six must be named by the team (their D62).
* ch9 Q2 confidence threshold and ch9 Q6 Canadian-region reading: our reader evidence (pack item 6).
Not to be guessed (AGENTS rule 4): ch5 Q3 date rules for conditions, consent wording, the Quebec and Alberta AI notice (Unconfirmed: no counsel).
Note: the team's scoring reference copy (June 2025) lacks the 3 Nov 2026 CRS change and several provinces (line 7296); a comparison against it will show gaps.

## 7. Stand-in register changes (STAND-INS.md)

* SI-1, SI-2: three outcomes (Qualifies, Can't tell yet, Does not qualify), no cut-off comparison (P-236).
* SI-5: withdrawn by the owner (no stale-assessments view).
* SI-10: employer facts are copied, not live-linked; Corporate is the team's Release 1 (P-239).
* SI-11: pin per filing (P-246).
* SI-14: a document holds several parts (AG-09 knock-on).
* SI-15, SI-16, SI-17: unchanged in ownership; the team's Case and Filing models do not exist yet, so these stand-ins live longest.
* **New rows:** "Portal sheet: the team's (SA-1B-173)" · "Form viewer, in-app Validate, answer sheet: the team's (AG-7-108, -109)" · "PDF Studio page tools: the team's (AG-19)" · "Approve filing and Sign with my signature: the team's (G22, G30)".

## 8. Anything else to take care of

* **Re-measure the 29 Oct ownership shares on v2.1** (P-167, P-169 were measured on v1.5). Sections 2 and 3 above replace `scope-boundary.md` for the team; keep that file as history.
* **Say what "production grade" means to the team:** code they lift, or a reference they re-write. Recommendation: a reference with tests they adopt (the founder's P-01 says the POC is never committed to the team's repositories).
* **Knock-ons:** ask the team when the 298 notes will be applied; until then cite SA-01B v2.1 only.
* **Copy-on-emails** (SA-1B-107–112, CC-8) and the upload size and file-name pattern per document type (SA-1B-106): later rows, low priority.
* **Money:** the AI counts need live runs; plan them inside the daily budget (P-225) with the founder's Go per batch.
