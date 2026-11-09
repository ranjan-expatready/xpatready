# Coverage audit: preparing and filing an application, for the agent (7 Nov 2026)

Read-only audit for the founder's question: do the planned capabilities cover everything the team's requirements ask for when a case officer, representative or client on the case prepares an application and files it? Short answer: **no, not with M3's 17 capabilities alone.** The 17 cover the spine (open the case, people, filings and fees, checklist, document reader, case check, fill, AI and rules review, Ready to file, Prepare application, portal sheet, signed scans, filing record, stale marks). Of 94 requirement rows: 32 are covered by the 17; 30 only by something else (T or M2 capabilities, M4/Parked/W6 capabilities, or backlog rows, eight of them unscheduled rows labelled M3); 22 are out of scope by a named decision (4 of those are holds still waiting for the founder's ruling); **7 have no capability, row or decision (GAPs)**; 3 are ambiguous.

## What was read

* Requirements: the name-free snapshot `domain/requirements-2026-11-02/` (README and manifest first). Card outcomes and rules of:
  * **AG-07** = `02-functional-requirements/agent/AG-07-case-core-and-delivery_v3.12_2026-10-28.md` (chapters 2–11; chapter 1, client records, only by title).
  * **AG-08** = `…/agent/AG-08-smart-questionnaire_v1.15_2026-10-27.md` (§4, AG-8-x).
  * **AG-09** = `…/agent/AG-09-document-management_v1.27_2026-10-27.md` (§4, AG-9-x).
  * **AG-11** = `…/agent/AG-11-automation_v1.21_2026-10-25.md` (§4: Reader, Checker, approvals).
  * **AG-19** = `…/agent/AG-19-pdf-studio_v1.10_2026-10-26.md` (card outcomes).
  * **SA-01B** = `02-functional-requirements/super-admin/SA-01B-content-pack-configurator_v2.1_2026-10-27.md` (chapters 3, 4, 6, 7, 8, 9, 11 card outcomes; Part C BR titles).
  * AG-03, AG-10, AG-13, AG-15, AG-17 and AG-06 by outline and by the cards that point into them only; the techno-functional docs (`01-techno-functional/`) were not read.
* Product records on `origin/main` as held locally, tip `83ee42dda` (7 Nov 09:48 UTC; `git fetch` was refused by the sandbox's network rule, so anything merged after that is not seen): `qa/CAPABILITIES.md`, `BACKLOG.md`, `BACKLOG-requirements.md`, `BACKLOG-requirements-qa.md`, `DECISIONS.md` (+ `decisions/P-70-P-73-23-oct.md`), `STAND-INS.md`, `design/m3-sprint-plan-2026-11-06.md`, `reports/sa01b-v2.1-split-and-decisions-2026-11-02.md`.

## The scope rules that decide most verdicts

* **P-70** (23 Oct): SA-01B is the POC's scope; requirements outside SA-01B (AG-…) stay outside unless a later decision brings them in.
* **P-169** (29 Oct): ours, production grade: "the case officer's tabs from facts to filing", filings and the release pin, reading uploaded documents, form filling and validation, checklist rules. Split: documents (AG-09 storage, requests, versions, scan, status), case (AG-07 client list, case shell, team, stages, page frame) are the team's. The team's: letter templates, holiday calendars, deficiency library; deadlines (Minder). So an AG-07 chapter 4–7 requirement (checklist, forms, readiness, review, submission) that nothing covers is a **GAP**, not out of scope.
* **P-129**: M3 is the staff side; client SQR on the family link and client signing come after M3 (row L4). **P-141 / P-164**: AG-03 and AG-11 Checker pages in M3, with the cuts of P-164 (4). **P-150, P-151 (2)**: e-signature, letters, notifications, retention, invoicing and fee payment are the team's. **P-245**: our Chrome extension, M4. **P-246 (4)**: no in-app form viewer; the team builds in-app Validate. **P-271**: prospect runtime is the team's. **P-251 → P-316**: the founder, acting as SA-01B product owner, lifted the holds on L-SA6 to L-SA11, G5 and C11; still held until he rules: SA1B-D100 (corrections reaching open filings), SA1B-D72/D66 (family on different programmes, location per person), SA1B-D29, SA1B-D77, SA1B-D93 (application fix). **P-315** lifted the hold on L-SA3 (Ready to file). **P-380 Q1**: C6.12, C6.4 and C11.6 count Works on Visitor visa; their other parts are rows S1–S5 after the sprint (no milestone set).
* The 17 M3 capabilities: C1.3, C3.16, C6.4, C6.5, C6.9, C6.11, C6.12, C7.3, C7.5, C7.6, C7.7, C8.1, C8.2, C9.2, C10.2, C11.5, C11.6 (C1.3 and C11.5 merge into one, P-316 (2)).

## Table

Verdicts: **M3** = covered by one of the 17 · **Elsewhere** = covered by a T or M2 capability, an M4/Parked/W6 capability, or a backlog row (named) · **Out** = out of scope by the decision cited · **GAP** = no capability, row or decision · **Ambiguous** = a capability may cover it but does not say so.

### 1. Opening a case and the people on it

| # | Requirement (id, file: one line) | Covered by | Verdict |
|---|---|---|---|
| 1 | AG-7-1 (AG-07): staff create a case with the programme path from the pack | C6.1 (T, Works); S4 startable at case opening (Do now, built, PR pending); case shell is the team's (P-169, SI-15) | Elsewhere (T, S4) |
| 2 | AG-7-6 (AG-07): a new case opens with checklist, form set and questionnaire laid out | C6.1 (T) + C6.4, C7.7 (M3) + C11.12 (M2) | M3 |
| 3 | AG-7-2, 3, 8, 40, 41 (AG-07): deliberate opening, case number, firm scoping, audit, paged lists | Case shell and audit are the team's (P-169, SI-15); tenancy (P-335) | Out (P-169, P-335) |
| 4 | AG-7-7 (AG-07), SA-1B-202 (SA-01B): reuse what the lead or prospect gave | C6.8 "Team builds" (P-271) | Out (P-271) |
| 5 | AG-7-4, AG-7-107 (AG-07), AG-8-28 (AG-08): one case, many people, each family member a person record | C6.1 (T), C11.12 (M2: roles, maximums, filing modes) | Elsewhere (T, M2) |
| 6 | AG-7-45 (AG-07), SA-1B-64 (SA-01B), AG-8-49 (AG-08): several filings per case, each with its own programme, questionnaire, checklist, forms, fees, decision | C6.12 (M3; Visitor visa part; S1 sponsorship two filings and S2 child's study permit after the sprint, P-380 Q1) + C11.12 (M2) | M3 |
| 7 | SA-1B-73 (SA-01B), AG-7-45 rule 4: family members on different programmes in one case | B7 (BACKLOG-requirements, proposed M3, unscheduled); SA1B-D72 still held (P-251, P-316 (1)) | Out (held, P-316 (1)) |
| 8 | AG-7-45 rule 2 (AG-07), SA-1B-66, 67, 212, 68 (SA-01B): routes in sequence, "Start next stage", start at any stage | B10 (BACKLOG-requirements, proposed M3, not scheduled; no capability) | Elsewhere (B10) |
| 9 | AG-7-45 rule 9, AG-7-50 (AG-07), SA-1B-219 (SA-01B): Make principal, Remove filing, withdraw one filing; warn when a filing others depend on is withdrawn | Nothing; filings are ours (P-169) | **GAP** |
| 10 | AG-7-56 (AG-07), SA-1B-250 (SA-01B): one rules version per filing, set at opening, moved only by a person | C6.1 (T: case pinned to its release, P-271); pin per filing SH4 "build as specified" (P-316 (2)); L-SA13 | Elsewhere (T, SH4) |
| 11 | SA-1B-253, 254, 257 (SA-01B), AG-7-56: a rule change or withdrawn version raises a CRITICAL warning; "What changes for this case"; move in one click | B9 (proposed M3, unscheduled); C7.6 warns on an edition or fee past accepted-until (M3) | Elsewhere (B9) |
| 12 | SA-1B-255 (SA-01B): corrections reach open filings automatically; drafts re-fill | SA1B-D100 held (P-251, P-316 (1)); no row | Out (held, P-316 (1)) |
| 13 | AG-7-35, AG-7-104 (AG-07): case team (lead representative, officer, reviewer); representative set at creation | C6.11 (M3) | M3 |
| 14 | AG-7-36, 42, 43, 106 (AG-07): queues, "Take it", hand all work over, deactivated user | SI-9, SI-15 (P-164 (3), P-169) | Out (P-169) |
| 15 | AG-7-44 (AG-07): a new lead representative after submission gets a task to tell the authority | C6.11 (a change asks for a new IMM 5476) + C9.2 tasks after filing | M3 |
| 16 | SA-1B-51 (SA-01B): each person's location (inside or outside Canada) drives forms and documents | SA1B-D66 held (P-251, P-316 (1)) | Out (held) |
| 17 | AG-7-9 to 14, 47, 48 (AG-07), SA-1B-46 (SA-01B): delivery stages, board, bucket, manual placement | Stages are the team's (P-169, SI-15); client stage labels B26 | Out (P-169) |
| 18 | SA-1B-90 (SA-01B): only a complete row can be opened | C5.1 (M2) + S4 | Elsewhere (M2, S4) |

### 2. Questionnaires answered on a case

| # | Requirement | Covered by | Verdict |
|---|---|---|---|
| 19 | AG-8-12 to 17 (AG-08): client fills by link, progress, resume, server validation | C6.2, C4.4 (T, Works) | Elsewhere (T) |
| 20 | AG-8-29 (AG-08), SA-1B-75 (SA-01B): shared answers asked once; under-18 rules | C6.2 (T) + C3.16 scope (M3) + C1.8 minimum age (M2) | M3 |
| 21 | AG-8-25 to 27 (AG-08), SA-1B-260, 261 (SA-01B): every fact has source, status, history; a declared answer fills; must-verify-before-filing | C6.3, C6.6 (T) + rows L-SA6, L-SA8 (M3 rows, not among the 17; holds lifted P-316) | Elsewhere (T, L-SA6/8) |
| 22 | AG-8-23 (AG-08), SA-1B-264 (SA-01B): conflicts never resolve silently | C6.6 (T) | Elsewhere (T) |
| 23 | AG-8-30 (AG-08): cross-applicant contradictions (family size, a dependant's age) flagged | Closest: C7.5 rules cross-checks; not named | Ambiguous |
| 24 | AG-8-32 (AG-08): questionnaire locks on submit; staff request changes; re-open | L4 (W5 client SQR, after M3, P-129) | Elsewhere (L4) |
| 25 | SA-1B-269 (SA-01B): an adult's private facts, own link | B8 (proposed M3, unscheduled) | Elsewhere (B8) |
| 26 | P-244 / SA-01B v2.1 BR-6: officer records background answers; client re-confirms before signing | L-SA10 (M3 row, not among the 17) | Elsewhere (L-SA10) |
| 27 | SA-1B-266 (SA-01B): returning client, "Still true?" | B13 (M4) | Elsewhere (M4) |

### 3. Documents and the checklist

| # | Requirement | Covered by | Verdict |
|---|---|---|---|
| 28 | AG-7-15 (AG-07), SA-1B-216 (SA-01B), AG-9-35 (AG-09): one checklist per filing and person, by layer | C6.4 (M3; S3 police waiver, S4 Express Entry block after the sprint) | M3 |
| 29 | SA-1B-151, SA-1B-214 (SA-01B): a document for the whole application (marriage certificate, sponsor's funds) is one item with default providers | Nothing (C6.4 is per person; C3.16 scope is for fields) | **GAP** |
| 30 | SA-1B-19, 20, 152 (SA-01B): alternatives, "I don't have this", "Alternative used" | B3 (proposed M2, unscheduled, no capability) | Elsewhere (B3) |
| 31 | SA-1B-21, 22, 105, 155, 156 (SA-01B): validity checked at the target filing date; passport outlasts the permit; issued within N months | C6.4 police ≤ 6 months and C7.5's passport-expiry finding (M3); full rules B38 (W4), L-doc | M3 (part) + B38 |
| 32 | AG-9-64 (AG-09): document language and automatic translation line | B38 (W4), L-doc | Elsewhere (B38) |
| 33 | SA-1B-153, 154, 262 (SA-01B): dates and facts a document supplies; upload first, type less | C4.5 (M2) + "Fill this from my documents" with C6.5 (M3, P-256) | M3 |
| 34 | AG-7-16, 17, 18 (AG-07), AG-9-6 to 10, 26, 63 (AG-09): request, upload, accept, Needs replacing, status | AG-09 is the team's (P-169, SI-14) | Out (P-169) |
| 35 | AG-7-19 (AG-07): checklist completeness count, the same number readiness uses | C7.7 statuses per item (M3); status store is AG-09's | M3 |
| 36 | AG-7-20 (AG-07), AG-9-30 (AG-09): reuse an accepted document across cases | AG-09 (P-169, SI-14); B13 (M4) | Out (P-169) |
| 37 | SA-1B-103 (SA-01B): country-specific requirements beside a document | B14 (M4) | Elsewhere (M4) |
| 38 | SA-1B-106 (SA-01B), AG-19-15, AG-19-17 (AG-19): upload size limit and file name per document type; "Prepare for upload" | Data: B38, B41 (W4). PDF Studio tools: AG-19 is outside (P-70) | Elsewhere (B38/B41); tools Out (P-70) |
| 39 | SA-1B-157, SA-1B-104 (SA-01B): a status document sets a key date | B39 (W4), B24 | Elsewhere (B39) |

### 4. AI reading documents

| # | Requirement | Covered by | Verdict |
|---|---|---|---|
| 40 | SA-1B-34, 263 (SA-01B), AG-9-42 to 46 (AG-09), AG-11-66, AG-8-41, 44: the Reader proposes values with place and confidence; one "Confirm & use" per document; unreadable is flagged | C6.5 (M3) + L-SA7, L-SA9 | M3 |
| 41 | AG-9-52 (AG-09): language test results and ECA reports read into proposals | C6.5 names passports, printed forms and tables, letters, foreign records; not these | Ambiguous |
| 42 | AG-9-51 (AG-09): a government letter's dates proposed as deadlines | Letter read: C6.5 (sprint row C7); deadline: B11 (M4) | Elsewhere (B11) |
| 43 | AG-9-3, AG-9-11 (AG-09): classify type on upload; bulk upload to checklist lines | AG-09 (P-169, SI-14) | Out (P-169) |
| 44 | SA-1B-268 (SA-01B), AG-9-48: data stored in Canada; AI region logged | P-133: Sample documents only; counsel before real client data | Out (P-133, until production) |

### 5. Eligibility and case check

| # | Requirement | Covered by | Verdict |
|---|---|---|---|
| 45 | AG-03 Qualifier staff page; SA-1B-203, 218 (SA-01B): outcomes, what is missing, "can't check" | C6.9 (M3) + B124, R4 | M3 |
| 46 | SA-1B-204 (SA-01B), AG-03 §3.4–3.6: scores, grids, cut-offs, what-if | SI-1, SI-2 (P-164 (1)) | Out (P-164) |

### 6. Fees and filings

| # | Requirement | Covered by | Verdict |
|---|---|---|---|
| 47 | SA-1B-52, BR-42 (SA-01B), AG-7-51 amount part: government fees per filing with basis and count | C6.12 (M3) + R2 | M3 |
| 48 | AG-7-51 payer, paid status, receipt, invoice line; AG-7-52 Bill to (AG-07) | P-151 (2): payment and invoicing are the team's | Out (P-151) |
| 49 | SA-1B-211 (SA-01B): filing method and portal on the row; one "Prepare application" view | C1.6 (M2) + C7.7 (M3), P-137 | M3 |

### 7. Form filling

| # | Requirement | Covered by | Verdict |
|---|---|---|---|
| 50 | AG-7-21 (AG-07): every form of the filing with its edition and status (Generated, Signed, Filed) | C7.7, C8.1 (M3) | M3 |
| 51 | AG-7-22 (AG-07), SA-1B-261, SA-1B-29 (SA-01B): fill from answers; flag required boxes it cannot fill | C7.1 (T) + C7.6 missing facts as CRITICAL warning (M3, P-238) | M3 |
| 52 | AG-7-60 (AG-07): only verified values fill | Amended by P-242 (declared fills; read values wait for "Confirm & use"); C6.6 (T) | Elsewhere (T, as amended) |
| 53 | SA-1B-170, SA-1B-213 (SA-01B): whose fact and which entry per box; one family form fills right for each person | C3.16 (M3) + SH3 resolver contract; B91 sponsor | M3 |
| 54 | SA-1B-28 (SA-01B): every filled box shows the fact, person and source it came from | C6.3 (T) per fact; a per-box view is not named | Ambiguous |
| 55 | AG-7-23, AG-7-67 (AG-07), SA-1B-176 (SA-01B): correct a value on a form ("application fix"), kept on re-render | SA1B-D93 held (P-251, P-316 (1)); fact edits through C6.3 (T) | Out (held) |
| 56 | AG-7-23a (AG-07), SA-1-28 (SA-01B): edition no longer current, warning and one-click move | C7.6 (M3, P-237) + P-151 (1); move via B9 | M3 |
| 57 | SA-1B-177 (SA-01B): an officer adds a form from the library to one filing (mapped fills, unmapped is the blank PDF) | Nothing | **GAP** |
| 58 | SA-1B-102 (SA-01B): per form line who completes, copies, who signs | C1.8 (M2) + S1 signature default + C8.1 (M3) | M3 |
| 59 | AG-7-109 (AG-07), SA-1B-174, SA-1B-31 (SA-01B): fill in an in-app viewer; Validate and barcodes inside ExpatReady | P-246 (4): POC keeps Adobe as oracle, team builds in-app Validate. POC side: C7.2 (T), C7.7 round trip, S2 trial per edition | Out (P-246) |
| 60 | SA-1B-178, 179, 180 (SA-01B): box signals, box notices, accuracy record | B28 (M4), C9.3 (W6); box notices also touch SA1B-D75 (named in P-251's hold, not in P-316's list) | Elsewhere (M4, W6) |

### 8. Review (human and AI), validate, Ready to file

| # | Requirement | Covered by | Verdict |
|---|---|---|---|
| 61 | AG-11-69 (AG-11), AG-7-61 (AG-07), AG-8-42 (AG-08): Checker compares names, dates of birth, numbers across documents, answers and forms | C7.5 (M3; part 1 rules works, part 2 AI review) | M3 |
| 62 | AG-7-26, 28, 30 (AG-07): findings with severity, acknowledge, resolve, raised and cleared by themselves, CRITICAL passed with a reason | C7.5 findings + C7.6 (M3) | M3 |
| 63 | AG-7-25 (AG-07): fixed deficiency library per programme | Team's (P-169, SI-12) | Out (P-169) |
| 64 | AG-7-62 (AG-07), AG-11-55, 59: findings routed to "Needs you", escalation | SI-7 (P-164 (4)) | Out (P-164) |
| 65 | AG-7-24, AG-7-27 state (AG-07): form readiness and Not ready / Attention / Ready per filing | C7.6, C7.7 (M3) | M3 |
| 66 | AG-7-27 score (AG-07): a readiness score per filing, the case shows the lowest | Nothing | **GAP** |
| 67 | AG-7-29 (AG-07): Send for review (several filings), review checklist, approve or send back with reasons, rounds, "Changed since review" | Review recorded and shown "Prepared by · Reviewed by" (P-155 (1); C8.2, C7.6 warning, B126/QA-295). Send back with reasons, the checklist, rounds and "Changed since review": nothing | **GAP** (part covered in M3) |
| 68 | SA-1B-221 (SA-01B): the pack adds programme review items to the review checklist | Nothing | **GAP** |
| 69 | AG-7-59, 66, 68 (AG-07), AG-11-81: approve each form draft; record of who prepared and approved, "self-approved" | B6 (proposed M3, unscheduled); filing-level in C8.2 | Elsewhere (B6) |
| 70 | SA-01B BR-4, AG-07 BR-26: only a barcode form failing its own Validate stops staff; everything else a CRITICAL warning with a reason | C7.6 (M3; P-237, P-238, P-315; P-172 Express Entry exception) | M3 |
| 71 | AG07-D28 (AG-07): a validated barcode form read back | C7.2 (T, Partial) + B99 | Elsewhere (T) |

### 9. Prepare application, portal sheet, PDF and paper

| # | Requirement | Covered by | Verdict |
|---|---|---|---|
| 72 | AG-7-108 (AG-07), SA-1B-173 (SA-01B): answer sheet / portal sheet in the form's order with copy | C7.3 (M3) + C11.6 (M3; S5 PR portal-only after the sprint) | M3 |
| 73 | SA-1B-32, SA-1B-175 (SA-01B): portal screens as editions; extension fills one screen | C7.4 (M4, P-245); capture C2.5–C2.11 Parked (P-102) | Elsewhere (M4, Parked) |
| 74 | AG-07 ch.5 form set per channel (our P-122 deliverables list, "PDF copy, not for filing") | C7.7 (M3; P-122, P-145, P-272) | M3 |
| 75 | Paper filing and package order (SA-01B line kinds; AG-7-31 rule 6 channel "paper") | P-380 Q3 paper with a written reason (C7.7/C11.6, M3); package order B41 (W4) | M3 + B41 |

### 10. Signing and signed scans

| # | Requirement | Covered by | Verdict |
|---|---|---|---|
| 76 | AG-7-21, AG-7-109 rule 21 (AG-07): no signature, ink (print, sign, attach scan, "Signed by client"), or e-signature | Ink: C8.1 (M3). E-signature: the team's (P-150) | M3 (e-sign Out, P-150) |
| 77 | SA-1B-30, BR-6 (SA-01B), SA-1B-35: ExpatReady never signs or ticks a declaration | C8.1 ("no sign for the client"), C7.1 | M3 |
| 78 | SA-1B-30 (SA-01B, SA1B-D106): the representative puts their own stored signature on their own boxes in one click | Nothing; only the 2 Nov split report (not a decision) gives "Sign with my signature" to the team | **GAP** |

### 11. Uploading, submitting, the filing record

| # | Requirement | Covered by | Verdict |
|---|---|---|---|
| 79 | AG-7-31 (AG-07): record the submission per filing (date, authority, channel, forms as filed, numbers, waived warnings kept; forms become Filed) | C8.2 (M3), C8.1 "Uploaded to IRCC" (M3), C7.6 | M3 |
| 80 | AG-7-95 (AG-07), AG-8-48 (AG-08): application number per filing, UCI per person, provincial file numbers | C8.2 (M3) + B54; provincial file numbers not named | M3 (provincial part Ambiguous) |
| 81 | SA-1B-259 (SA-01B): values frozen at submission (version, dates, values used) | C8.2 read-only record, C6.1 pin, C9.2 "Filed with an earlier value"; a full value snapshot only in B6 | M3 (snapshot Ambiguous) |
| 82 | Portal upload slot per document type and upload limits; submission grouping | B41 (W4); groups in C6.12 (M3) | Elsewhere (B41) |
| 83 | AG-7-57 (AG-07): evidence bundle export | Outside SA-01B (P-70); AG-17 driven | Out (P-70) |

### 12. After filing

| # | Requirement | Covered by | Verdict |
|---|---|---|---|
| 84 | SA-1B-220, SA-1-32 (SA-01B), P-142 D7: a changed fact marks signed, uploaded, filed items stale; a correction after filing makes a task | C9.2 (M3) | M3 |
| 85 | AG-7-46, AG-7-32 (AG-07), SA-1B-45, SA-1B-96 (SA-01B): government steps (biometrics, medical) with due dates, recorded by hand | B11 (M4); biometrics fee and line in C6.12 | Elsewhere (M4) |
| 86 | AG-7-94, AG-7-96, AG-7-101 (AG-07): deadline from a letter confirmed; reminders; step done stops them | Minder is the team's (P-169, SI-17); B11 (M4) | Out (P-169) |
| 87 | AG-9-60, 61, 62, AG-7-100 (AG-09, AG-07): government letters recognised, copies kept, emailed attachments; correspondence | Team's (P-169 SI-12, P-150, P-70) | Out (P-169, P-150) |
| 88 | AG-7-33, AG-7-49 (AG-07), SA-1B-68 (SA-01B): record the decision, after-decision items, refusal re-routes | B11 "after decision" (M4) | Elsewhere (M4) |
| 89 | AG-7-34, AG-7-13, AG-7-58 (AG-07): close, reopen, correct a recorded decision | Case shell (P-169, SI-15) | Out (P-169) |
| 90 | AG-7-91 (AG-07), SA-01B BR-15: target filing date decides dated values; queue colour | S3 "No hidden today" (Do now) for the date; queue colour SI-15 | Elsewhere (S3) |
| 91 | AG-15-54, AG-15-57 (AG-15): the client sees "last update" and document status words | AG-15 outside SA-01B (P-70); client side after M3 (P-129) | Out (P-70) |

### 13. Corporate (an employer link on a worker's filing)

| # | Requirement | Covered by | Verdict |
|---|---|---|---|
| 92 | AG-7-53 (AG-07), SA-1B-283 (SA-01B): case-to-case link; employer facts pre-fill the worker's case | C1.3 / C11.5 (M3, one capability by P-316 (2)) | M3 |
| 93 | AG-7-54 (AG-07), SA-1B-158, 284 (SA-01B): only shareable documents cross a link | L-SA5 (M4, shareable mark) | Elsewhere (M4) |
| 94 | AG-7-55 (AG-07), SA-1B-235, 281, 282, 286, 287, 288 (SA-01B): LMIA file, offer inside the worker's filing, clocks, fee per position, filing summary, employer signer | L-SA5, B15 (M4); per-position fee basis in C6.12 (P-247); AG-17's own blocks are the team's (P-70, SI-10) | Elsewhere (M4) |

## Counts (94 rows)

| Verdict | Count | Rows |
|---|---|---|
| Covered in M3 (one of the 17) | 32 | 2, 6, 13, 15, 20, 28, 31, 33, 35, 40, 45, 47, 49, 50, 51, 53, 56, 58, 61, 62, 65, 70, 72, 74, 75, 76, 77, 79, 80, 81, 84, 92 (31 and 75 also lean on a W4 row; 80 and 81 have an ambiguous part) |
| Covered elsewhere (T, M2, M4, Parked, W6 or a backlog row) | 30 | 1, 5, 8, 10, 11, 18, 19, 21, 22, 24, 25, 26, 27, 30, 32, 37, 38, 39, 42, 52, 60, 69, 71, 73, 82, 85, 88, 90, 93, 94 |
| Out of scope by decision | 22 | 3, 4, 7, 12, 14, 16, 17, 34, 36, 43, 44, 46, 48, 55, 59, 63, 64, 83, 86, 87, 89, 91 (7, 12, 16, 55 are holds the founder has not ruled on) |
| **GAP** | 7 | 9, 29, 57, 66, 67, 68, 78 (67 is partly covered in M3) |
| Ambiguous | 3 | 23, 41, 54 |
| Total | 94 | |

Of the 30 "elsewhere", these are unscheduled rows proposed for M3 but not among the 17: B3, B6, B8, B9, B10, L-SA6, L-SA8, L-SA10.

## GAPs and recommendations

1. **Make principal, Remove filing, withdraw one filing; warn when a filing others depend on is withdrawn** (AG-7-45 rule 9, AG-7-50, SA-1B-219). Filings are ours (P-169). Recommend a **new backlog row** (runtime, after the 48-hour sprint, small): Make principal and Remove filing during preparation; ask the founder whether withdrawing a filing is ours (filing) or the team's (case lifecycle, like close and reopen).
2. **One document for the whole application with default providers** (SA-1B-151, SA-1B-214). Today C6.4 lists documents per person, so a marriage certificate or a sponsor's funds proof would be asked twice. Recommend a **new backlog row** tied to C3.16's filing and household scope (P-316 (2) builds scope for fields only), and naming it in C6.4's text once built.
3. **Officer adds a library form to one filing** (SA-1B-177). Recommend a **new backlog row** (M3 follow-up): mapped form fills from the case, unmapped form is the blank official PDF, listed on Prepare application like any form.
4. **Readiness score per filing** (AG-7-27). Recommend **ask the founder**: keep Ready to file as a state only and leave the score to the team's case header (then record it as a decision and an SI row), or add it to C7.6.
5. **Internal review workflow** (AG-7-29): send back with reasons, the review checklist, rounds, "Changed since review". The review step itself exists (P-155, C8.2). Recommend a **new capability** (M3 or the next milestone) that also absorbs B6 (form approval record) so "Representative review" is one tested capability.
6. **Programme review items on the review checklist** (SA-1B-221). Recommend folding into the capability of gap 5 (pack content: per-programme cross-check items the reviewer ticks).
7. **Representative's stored signature on their own boxes** (SA-1B-30, SA1B-D106). Only the 2 Nov split report gives "Sign with my signature" to the team; no decision says so. Recommend **ask the founder**: record "team builds" as a decision with an SI row, or add it to C8.1.

## Ambiguous items to settle in a capability's "Done when"

* AG-8-30 cross-applicant contradictions → name it in C7.5 or C6.9.
* AG-9-52 language test results and ECA reports → name them in C6.5 (they matter for Express Entry) or move them to a row.
* SA-1B-28 per-box "came from" view → name it in C7.7 or C6.3.
* AG-7-95 provincial file numbers → name them in C8.2 (the Provincial nominee combination is one of the six).
* SA-1B-259 values frozen at submission → state in C8.2 whether the record keeps the version, dates and values used, or leave it to B6.

## Other findings

* **Rows outside the 17 that preparation needs:** B3, B6, B7 (held), B8, B9, B10 (all "M3" in `BACKLOG-requirements.md`, none scheduled or with a capability row), L-SA6, L-SA8, L-SA10 (M3 rows, holds lifted by P-316), and B38–B46 (wave W4: document rules, key dates, fee table, filing record and package with portal upload slots, portal screen order). S1–S5 (spouse sponsorship as two filings, a child's study permit, police waivers, the Express Entry block, PR portal-only answer sheet) follow the sprint with no milestone (P-380 Q1).
* **Five no-row holds still wait for the founder's ruling** (P-316 (1)): SA1B-D100 corrections reaching open filings, SA1B-D72/D66 family on different programmes and location per person, SA1B-D93 application fix, SA1B-D29, SA1B-D77. Four rows of this table wait on them (7, 12, 16, 55).
* **The SA-01B v2.1 card-by-card trace is still open** (BACKLOG "Do now" row S8). Most v2.1 card numbers (SA-1B-150 to 301) appear nowhere in CAPABILITIES, BACKLOG or DECISIONS; this audit covers the case-side cards only and does not replace S8.
* Not read: AG-10 (communication), AG-13 (tasks), AG-06 (billing), AG-15 and AG-17 beyond their outlines, and the techno-functional documents; a requirement only stated there is not in this table.
