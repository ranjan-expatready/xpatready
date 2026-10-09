# AI Worker catalogue: every use case we can find, in four shapes (W2 step 3, first pass)

**Author:** ai-worker-designer. **Date:** 9 Oct 2026. **Status:** Proposal for Ranjan and the Lead. A product fact carries a citation (file, version, requirement ID or section); everything else is labelled Proposal, Assumption or Unknown.
**Rules applied:** AIW-D18 (find every use case, rated Easy / Medium / Hard-but-worth-it), AIW-D19 (four shapes), AIW-D22 (no duplication: existing requirements are cited by ID, file and version, never restated; this file describes only what is new: the worker's behaviour, gaps and proposals), AIW-D24 (role twin = delegation), AIW-D25 (expert co-pilot answers only), AIW-D26 (approval = a named person, whoever the firm's settings allow for that role; licensed by default per the existing requirements; the product's floors stay; we never claim product-enforced licensed sign-off), AIW-D21 (assume everything in the documents is or will be built; dependencies are information only), AIW-D11 (firms only).
**Sources:** the W1 inventory (`../inventory/*.md`, built from `sources/drive-snapshot-2026-10-09/`), `../../research/visaflo.md` §11, §12, §16, `../../research/field-scan.md` §3 to §7, the founders' autopilot design (`code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-18-rna-autopilot-design.md`, read in full), `../wedge-recommendation.md`, `../challenge-review-2026-10-09.md`. Short extracts (under 25 words) appear only where a claim would otherwise be unverifiable. Web facts carry the URL and access date recorded in the research files (9 Oct 2026 unless marked).

**In plain words.** A *Doer* is one of the product's own single-job tools (Mailer sends email, Reader reads documents, Minder watches deadlines). The *Conductor* runs Doers when something happens. *Needs you* is the staff inbox where Doer output waits for a person. An *AI Worker* strings existing Doers, rules and recipes into a job a person does today, under that person's name and permissions, and stops at a named human approval.

---

## 0. How to read this file

| Shape (AIW-D19, README §1) | Meaning here |
|---|---|
| **Task worker** | One job, done well. Entries W-02 to W-09, W-11, W-12, W-16 to W-23 |
| **Journey worker** | A whole journey, end to end, stopping at approvals. W-01, W-10, W-13, W-14, W-15 |
| **Role twin** | An AI version of a user role, scoped as a **subset of one named person's permissions** (AIW-D24). In any external wording: an *assistant to the role* (AIW-D27). W-25 to W-28 |
| **Expert co-pilot** | Answers only, never acts; sources only; refuses without a source; Canada-only processing (AIW-D25). W-24 |

Some work needs a task worker that acts and the expert that explains; §2.7 lists those pairs.

- **§1** common ground: identity, the guardrails already in the requirements (cited, not restated), the approval rule, dependencies, cost drivers.
- **§2** the catalogue: 28 entries, W-01 to W-28. Firm-side first; admin-plane entries (Expat Ready's own team) never touch a client.
- **§3** ranking with shape and build order; **§4** hard but worth it; **§5** assumptions and questions; **§6** summary and top five.
- Difficulty: **Easy** = existing rule-based Doers plus at most one already-specified AI Doer, internal or low-exposure output. **Medium** = a new AI step, new pack content, or client-facing output. **Hard** = blocked by parked scope, a file-format problem, an undefined delegation model, or a legal question.

---

## 1. Common ground

### 1.1 Identity: how every worker acts

Every worker acts on behalf of a named person, with only that person's permissions, and nothing takes effect until a person approves (AIW-D13; FD-16, Founder Decisions Log v1.5). The requirements anticipate but do not define a non-human actor: Doc 3 v1.4 AG-8 §3.11 and AG-11 §3.3a wait for "Doc-1 Amendment A4-1" (never written: `../ws2-baseline/A-identity-and-on-behalf.md`, proposals.md row of carve-out A). The audit log records `actorUserId` only (AG-13 v1.12 §7; inventory X7) and SA-11 v2.7 SA-11-2 has no AI actor type.

**New (Proposal, Phase B):** a *delegated session* record on `AuditLog`, `AiRunLog` and `ApprovalItem`: worker, shape, on-behalf-of person, run, model and prompt version. For role twins, additionally a *permission subset* chosen from the delegating person's role that can never include the professional approvals (`agent/case:form-approve`, `review-approve`, `submit`, `record-decision`, `waive-deficiency`, `agent/retainer:countersign`: AG-07 v2.7 §10; AG-01 v1.16 AG-1-63) or the five Owner-only actions (Overview v1.11, Permission model).

### 1.2 Guardrails already in the requirements (cited, not restated; every worker obeys all)

| Code | Guardrail | Where it is written |
|---|---|---|
| G1 | Proposal only, with provenance and confidence; never fabricate | AG-11 v1.11 AG11-D4; AG-07 v2.7 BR-7 |
| G2 | Product floors (AI client text, AI-edited template, government form, unlooked-at verified-profile write) never below "Ask me first" | Overview v1.11 Agent-native; AG-11-53; AG-16-36 |
| G3 | Nothing executes on timeout | AG-11-59; AG-10-45; AG-9-45; Phasing v1.4 Glossary "Needs you" |
| G4 | Approving needs the same permission as doing it by hand | AG-11-58; AG-10-46; AG-09 v1.8 §10 |
| G5 | Nothing is submitted to a government authority | AG-11-54; AG-7-59; AG-17 v0.5 §3.6 |
| G6 | AI off until provider, Canada-only region and no-training terms are recorded; every model call logged | AG-11-93; AG-16 v1.12 §3.9; AG-11-72; AG-10-48; AG-9-48 |
| G7 | Client or imported content reaches a model as delimited data, never instructions; no tool access | AG-11-94; AG-10-54; AG-9-42; AG-18-36 |
| G8 | Consent at send time; quiet (imported) records skipped; rate caps; unverified senders never trigger AUTO | AG-11-37, AG-11-87, AG-11 §3.10; AG-02 BR-9, BR-19; AG-2-60; AG-10-47 |
| G9 | No passport or financial numbers in messages, notifications or logs | AG-11 §11; AG-13 §11; AG-18 BR-17 |
| G10 | Rules decide, AI proposes; same input and pack version give the same result; outputs pack-stamped | AG-3-39; SA-01 v2.2 BR-3; Overview v1.11 Country-Awareness 4; SA-11 v2.7 §3.9 |
| G11 | Assist the firm, never police it | AG-11-49; AG-10 v1.9 §1; AG-14 BR-15; AG-16 BR-21 |
| G12 | Legal and consent text never machine-translated | AG-12-24; SA-5-15; Doc4 v1.3 CP-6-22 |
| G13 | Never promise an outcome | AG-02 BR-10; AG-10-44 note; AG-03 BR-11 |
| G14 | Every AI path has a manual fallback; AI never load-bearing | AG-8-45; AG-11 §3.10; AG-16 BR-18 |
| G15 | The AI sees only what the asker may see; tenant isolation; masked data revealed only after an audit write | AG-14 BR-2, BR-8; Overview v1.11 Design doctrine; Doc 1 v1.3 §7.2, §8.8 |

### 1.3 The approval rule (AIW-D26, supersedes AIW-D17's licensed-only rule)

AI Worker output is approved by a **named person, whoever the firm's own settings allow for that role**. The existing requirements already set the defaults and the floors: AI-written client text is approved by a licensed user by default and the Owner may widen that (AG11-D11; AG-10-44; SA-06 v3.1 SA6-D9, BR-20); professional approvals go to every holder of the key with licensed holders marked preferred and an Owner fallback (AG-7-68; AG-5-27; AG-11-89, AG-11-90); supervised messages from unlicensed staff wait for a licensed approver (AG-10-49; AG-16 v1.12 §3.11); the product never checks a licence (AG1-D19; AG-11-88). **We never claim product-enforced licensed sign-off.** Each entry below names its *approval point* as the permission key or setting that already governs the same action by hand (G4). Internal-only output (a summary, a ranked list, an answer to staff, a draft for the content team) is approved by whoever would do that work by hand.

### 1.4 Dependencies (information for the team, per AIW-D21; not a reason to narrow the design)

| Code | Dependency | Where it is recorded |
|---|---|---|
| D1 | AI provider recorded with Canada-only, no-training terms; no AI rail exists in SA-08 v2.2 | AG-11-93; `../inventory/sa-frs.md` summary D; `../ws2-baseline/A-ai-switch-provider-residency.md` |
| D2 | Canada pack content (checklists, box maps, deadline rules, deficiency library, Reader field lists, plain-words rule reasons) | SA-01 v2.2 §0 Parked, §12; SA-01B v1.2 §12; Charter V2 dates |
| D3 | Delegated-session and permission-subset model (§1.1) | proposals.md (carve-out A row on on-behalf-of) |
| D4 | Release labels conflict (Charter, SCOPE-TRIAGE, module files) | `../inventory/foundation.md` Part 3 items 9, 15 to 24; proposals.md (carve-out A row) |
| D5 | Minder not built; deadline watcher a founder decision | AG-11 §12; `../inventory/foundation.md` C8 |
| D6 | Reader and Sorter confidence thresholds open | AG-11 §13 Q11 |
| D7 | Case spine not built | AG-07 v2.7 §12 |
| D8 | Audit attribution of AI work | inventory X7; SA-11-2 |
| D9 | Permission-scoped retrieval over packs and records for the expert (the Finder is specified: Doc 1 §8.8; its release is Unknown) | `../inventory/doc3-firm.md` Part 3 AG-14 |

### 1.5 Cost-to-run drivers (general)

Model calls per page (Reader), per message (Sorter, Drafter), per case (Checker), per question (expert); the reviewing person's minutes in Needs you (the real cost, not yet measured: `../wedge-recommendation.md`); pack content upkeep; encrypted storage of previews and logs (AG-11-98); the evaluation set from approved / edited / rejected counts (AG-11-63). All time-saved figures are **Assumption** until the W3b validation.

---

## 2. The catalogue

Fields per entry: **Shape** · **Job** · **Works for** · **Replaces** (manual work today, cited to the inventory) · **Uses** (modules, Doers, recipes, by ID) · **New** (what the worker adds: Proposal) · **Guardrails and approval point** · **Why nobody has solved it** · **Difficulty** · **Value** · **Cost drivers** · **Dependencies and risks** · **Why it sells**.

### 2.1 Group A. Building the file (the wedge family)

#### W-01 File Builder (the wedge, AIW-D17)

- **Shape:** Journey (retainer signed → file ready for review). Pairs with W-24 for plain-words reasons.
- **Job:** from `envelope.signed` to a file that is "ready for your review": chases documents, reads them, proposes questionnaire values, cross-checks facts, keeps the checklist and a readiness report current, stops at the reviewer's sign-off.
- **Works for:** the case officer and the representative on the file. Priced per prepared file (Proposal; the challenge review suggests a flat fee for N files first, AIW-D27).
- **Replaces:** the officer's loop in AG-07 v2.7 §3.4 (request, review, approve or reject with reason), AG-08 v1.7 §3.8 (needs-evidence worklist, verify facts, verify imported values), AG-09 v1.8 §3.8 to §3.9 (preview, verify, reject, waive, "please re-take"), Doc4 v1.3 CP-4 §3.5 (re-review of every re-upload), and the re-typing chain AG-08 v1.7 §1 describes. Inventory rows: `ag-frs-1.md` Part 1 AG-07 §3.4, AG-08 §3.8, AG-09 §3.8 to §3.9; `doc4-portal.md` CP-4.
- **Uses:** AG-07 §3.4 (Binder), §3.6 (Reviewer, Checker); AG-08 §3.6 to §3.8; AG-09 §3.14 (Reader); AG-11 §3.5 recipes "document-received acknowledgement + Review document task" and "missing-document chase" (AG11-D17 timings), §3.13 Needs you; AG-10 Mailer and Messenger; AG-15 §3.4 work items. Contains W-04 and W-07.
- **New (Proposal):** (a) one job-shaped run from `case.created` to a *readiness report*: every value, its source document, its confidence, every open deficiency, every message sent; (b) the "AI prepared, person approved" record (D8); (c) a per-file meter (allowed by SA-03 v2.14 §11; add-on prices are out of Release 1 per SA-4-44, so metering is a Workstream 2 requirement).
- **Guardrails and approval point:** G1 to G15. Reader approval is the verification and needs `agent/sqr:verify` (AG-9-45; AG-8-44). Checker output is warnings only (AG-7-61). The worker never fills a form (W-05) or submits (G5). **Approval point:** readiness report and internal review via `agent/case:review-approve` (AG-07 §3.6); chases and verified values via the keys and settings that already govern them (AG-11-58; AG11-D11). Per AIW-D26 the firm's role settings decide who; licensed by default.
- **Why nobody has solved it:** VisaFlo's whole-file AI review is "coming soon" and access is by invitation (`visaflo.md` §11 item 3, §16 row 7, https://visaflo.ca/review); Clio has agents but no IRCC content (`field-scan.md` §7 item 8); no Canadian immigration vendor publishes a per-file or per-task AI price (`field-scan.md` §5). Honest limit: unprovable; VisaFlo is close (`../wedge-recommendation.md`).
- **Difficulty:** Medium (Hard with W-05 inside).
- **Value:** the firm pays per file for junior-clerk work; revenue tracks caseload, not seats. Time saved: Assumption, measured in W3b.
- **Cost drivers:** Reader pages per file (AG-09 §3.14 groups), one Checker pass per change, chase messages, review minutes.
- **Dependencies and risks:** D1, D2, D4 (AG-07 §13 item 22), D6, D7, D8. The readiness report is internal until a person decides what reaches the client: confirm with counsel / RCIC.
- **Why it sells:** "A prepared file for a fixed price, every value traced to its document, approved by your named person."

#### W-02 Deadline Guardian (the hook, AIW-D17)

- **Shape:** Task (standing). Pairs with W-24 for "which files are at risk this week, and why".
- **Job:** watches every government, document and status deadline on every file; nudges the right person; escalates when the firm chose that; never lets a date slip unnoticed.
- **Works for:** every file owner; Owner and Case Manager for escalation.
- **Replaces:** manual date-stamping and private date lists (AG-07 v2.7 §3.3), the failures AG-07 v2.7 §1 names, renewal follow-up on expiring documents (Doc4 v1.3 CP-4 §3.6). Inventory: `ag-frs-1.md` AG-07 §3.3; `doc4-portal.md` CP-4 §3.6.
- **Uses:** AG-11 §3.4 Minder; recipes "biometrics countdown" and "PR card / status expiry watch" (AG-11 §3.5; Phasing v1.4 R1); AG-13-65; AG-9-51 and AG-11-108 (letter deadlines after approval); AG-17-73; AG-14 §3.5; SA-3-35 (always on); AG-16 §3.10 and §3.13.
- **New (Proposal, from the autopilot design §8, §18.1, §18.2, which marks its own values "NOT authoritative"):** a stateful obligation catalogue (dormant, armed, satisfied, lapsed, waived), validity keyed by type, program and residence class, derived dates (landing deadline from medical and passport validity), a hard-deadline class (ITA, COPR), a status-maintenance machine. All as pack content (AG-11 §3.12), ratified by the SME.
- **Guardrails and approval point:** G1, G3, G6 (only letter reading is AI), G8, G10, G11. **Approval point:** the file owner approves each extracted deadline (AG-9-51); template reminders run under the recipe's autonomy setting (AG-11 §3.3 defaults); escalation per Team safeguards (AG-16 §3.10).
- **Why nobody has solved it:** VisaFlo's monitor is "launching soon" (`visaflo.md` §16 row 14, https://visaflo.ca/monitor); no IRCC equivalent of litigation deadline engines in the field scan (`field-scan.md` §4 row 4). Unknown whether any rival has a stateful obligation model.
- **Difficulty:** Easy (rules); content and the unbuilt Minder are the work.
- **Value:** the fear every consultant has; near-zero run cost; gets firms switched on. Record-keeping value: the firm can show when it reminded whom (autopilot design §14).
- **Cost drivers:** messages; Reader on letters.
- **Dependencies and risks:** D2 (SA-01B §3.8), D5, X3 (escalation default conflict). Values: confirm with counsel / RCIC.
- **Why it sells:** "Never miss an IRCC deadline again, out of the box, and prove it."

#### W-03 Letter Reader (post-filing watcher)

- **Shape:** Task. Pairs with W-24 ("what does this letter mean under the pack").
- **Job:** when a government letter arrives (upload, email, WhatsApp), proposes the milestone, the deadline, the task, a plain-language client notice and a response plan.
- **Works for:** case officers and the representative, after submission.
- **Replaces:** manual recording of AOR, biometrics, ADR and decisions (AG-07 v2.7 §3.7) and officer contacts (AG-17 v0.5 §3.6); the post-filing gap the autopilot design §18.3 calls the malpractice risk. Inventory: `ag-frs-1.md` AG-07 §3.7; `ag-frs-2.md` AG-17 §3.6.
- **Uses:** AG-09 §3.14 Reader group (b); AG-10 §3.2 Sorter; AG-07 §3.7; AG-11 triggers `case.milestone_reached`, `document.extracted`; post-decision playbooks (AG-07 §3.7); Drafter; Minder; Tasker.
- **New (Proposal):** letter-type to milestone mapping as pack content; a response-plan draft; the recipe "letter received → milestone + deadline + task + notice".
- **Guardrails and approval point:** G1 to G15; refusals are held for firm release (FDL v1.5 D-4; Doc4 CP-2 §3.5 open). **Approval point:** milestone and deadline by the file owner; decision via `agent/case:record-decision`; client notice via the AI-text setting (AG11-D11).
- **Why nobody has solved it:** VisaFlo letter watching is a homepage claim, monitor not launched (`visaflo.md` §16 row 14). Unknown elsewhere.
- **Difficulty:** Medium.
- **Value:** the highest-risk period of a file. Assumption on time.
- **Cost drivers:** Reader per page; Drafter per notice.
- **Dependencies and risks:** D1, D2 (AG-07 §13 item 16), D5, D7; letter formats change. Response plans are advice: confirm with counsel / RCIC.
- **Why it sells:** "Every IRCC letter becomes a dated task and a client update."

#### W-04 Upload Reviewer (inside W-01; usable alone)

- **Shape:** Task.
- **Job:** on each clean upload: right type for the item, legible, not expired, matches the profile, translation or notarisation present when required; drafts the accept or reject reason in the client's language.
- **Works for:** case officers.
- **Replaces:** AG-08 v1.7 §3.6 and AG-09 v1.8 §3.8 to §3.9 (reject with reason), Doc4 CP-4 §3.5, AG-15-21. Inventory: `ag-frs-1.md`, `ag-frs-2.md`, `doc4-portal.md`.
- **Uses:** AG-9-11 (type on AUTO at high confidence), AG-09 §3.8 annotation, §3.3 type defaults; SA-01B §3.4 validity gates; AG-8-42 Checker; AG-15 §3.4; recipe "document-received acknowledgement".
- **New (Proposal):** one combined verdict; a bilingual reason library per pack (reasons are firm-owned, SA1B-D23).
- **Guardrails and approval point:** G1, G2, G6, G7, G12, G13; verify stays the officer's act (AG-09 §3.9). **Approval point:** `agent/case:document-manage` for the verdict; the client message via the AI-text setting, or AUTO once the firm confirms the reason library as standard messages (AG-16 §3.12).
- **Why nobody has solved it:** VisaFlo's AI document validation has been live since 2025 (`visaflo.md` §12). Parity-plus: reasons tied to pack rules, in the client's language, audited.
- **Difficulty:** Easy. **Value:** the most frequent loop per file (Assumption). **Cost drivers:** Reader and Checker per document. **Dependencies:** D1, D2, D6.
- **Why it sells:** "No more blurry passports found at filing time."

#### W-05 Form Preparer (hard but worth it)

- **Shape:** Task (deterministic core; AI upstream and in review only).
- **Job:** assembles the form set, fills every box from verified values only, flags unmapped or unverified fields, routes four-eyes, produces fillable and flattened PDFs.
- **Works for:** case officers and the form approver.
- **Replaces:** AG-07 v2.7 §3.5 manual field review; staff uploading and e-signing forms by hand (SA-01B v1.2 §3.5); re-typing into PDFs (AG-08 v1.7 §1).
- **Uses:** AG-07 §3.5 Filler; AG-7-59, AG-7-60, AG-7-65; SA-01B §3.5 box maps and the deterministic filler (SA-01B §12); Checker (AG-7-61).
- **New (Proposal):** the orchestration (form set → fill → flag → four-eyes → flatten → attach); box maps for the first forms (content). AI stays out of the fill path by rule (SA1B-D16; SA-1B-35).
- **Guardrails and approval point:** G2, G5, G10; four-eyes (AG-7-65). **Approval point:** `agent/case:form-approve`.
- **Why nobody has solved it:** the reverse: everyone has it (`field-scan.md` §4 row 2; `visaflo.md` §16 row 8). Our angle: every value traceable to a verified source and pack version, the reason it was parked (SA1B-D28).
- **Difficulty:** Hard: XFA unsupported (SA-01B §12), box maps unauthored (AG-07 §13), release undecided (AG-07 §13 item 22; proposals.md Filler row).
- **Value:** closes the biggest gap; inside the per-file price. **Cost drivers:** content. **Dependencies:** D2, D4, D7, XFA. Confirm with counsel / RCIC.
- **Why it sells:** "Forms filled only from verified facts, with the source beside every box."

#### W-06 Submission Letter Drafter

- **Shape:** Task. Pairs with W-24 for the rule the letter addresses.
- **Job:** drafts letters of explanation, submission or cover letters and procedural-fairness responses from the verified profile, checklist and pack wording; a "facts used" footer lists every value and source.
- **Works for:** the representative.
- **Replaces:** writing from scratch or from the last client's file (the habit AG-05 v1.9 §1 describes). Not otherwise in the October files.
- **Uses:** Drafter (AG-10-15; AG-11 `draft_message`); AG-09 §3.7; AG-12 merge fields; SA-01B §3.9 required wording.
- **New (Proposal):** letter types as pack templates with locked blocks and free sections; every factual sentence linked to a verified value. The June founders' spec names this Drafter use (`../inventory/foundation.md` Part 2a); October specifies messages only (`visaflo.md` §16 row 10).
- **Guardrails and approval point:** G1, G2, G6, G7, G12, G13. **Approval point:** the representative who files; per AIW-D26 the firm's setting for AI text decides who may approve.
- **Why nobody has solved it:** solved by VisaFlo (`visaflo.md` §16 row 10), Visto's VistoBot (`field-scan.md` §3.3) and others (§4 row 1). Parity; our difference is traceability and no-promise.
- **Difficulty:** Medium. **Value:** hours per complex file (Assumption). **Cost drivers:** Drafter per letter. **Dependencies:** D1, D2, D4. Federal Court AI-content declaration (`field-scan.md` §6 item 9): confirm with counsel / RCIC.
- **Why it sells:** "A first draft that cites its facts, in minutes, that you still own."

### 2.2 Group B. Messages and words

#### W-07 Inbox Filer (inside W-01; usable alone)

- **Shape:** Task.
- **Job:** files every inbound email and WhatsApp on the right record, classifies it, files attachments with a proposed type, queues anything uncertain.
- **Works for:** reps and case officers.
- **Replaces:** AG-10 v1.9 §3.2 (link unmatched, dismiss, create lead) and §3.5 (re-tag). Inventory: `ag-frs-2.md` AG-10.
- **Uses:** AG-10 §3.2 Sorter, AG-10-12, AG-10-37 (classification values are SME content); AG-2-60; AG-18-33.
- **New (Proposal):** none in mechanics; the hand-offs to W-03, W-08, W-09.
- **Guardrails and approval point:** AI-only matches never filed (AG-10 §3.2); no lead from an unknown number (AG-10-58); G6, G7, G8. **Approval point:** `agent/communication:resolve-unmatched`.
- **Why nobody has solved it:** VisaFlo claims it live (`visaflo.md` §16 row 6). Parity.
- **Difficulty:** Easy. **Value:** daily minutes (Assumption); precondition for W-03, W-09. **Cost drivers:** Sorter per message. **Dependencies:** D1, D4, D6; AG-16 §3.4; AG-10-43.
- **Why it sells:** "Every reply lands on the right file, with the attachment already named."

#### W-08 Bilingual Writer

- **Shape:** Task.
- **Job:** drafts the firm's free-text client words in the client's language (replies, "please fix" notes, rejection reasons, stage updates) and the French of non-legal template text.
- **Works for:** case officers, reps, template owners.
- **Replaces:** Doc4 CP-7 §1 (read and reply), CP-3 §3.7, CP-4 §3.5; AG-12 v1.2 §3.6 (both languages by hand). Doc4 never says who writes firm French (`doc4-portal.md` Part 5 item 5).
- **Uses:** AG-10 §3.3 Drafter; AG-13 notes; AG-12 §3.2 missing-French filter; SA-05 §3.5 translation helper (allowed, open: SA-05 §13 Q5; AG-12 §13 defers it).
- **New (Proposal):** bring the non-legal translation helper into scope for firm free text; a "legal text" marker the worker refuses.
- **Guardrails and approval point:** G2, G6, G7, G12, G13; stage labels are SME content (AG-15 §13). **Approval point:** the AI-text setting (AG11-D11) for client text; `agent/template:publish` for template French (AG-12 §3.7).
- **Why nobody has solved it:** VisaFlo's 13 languages are client-side (`visaflo.md` §16 row 4); firm free-text French: Unknown anywhere.
- **Difficulty:** Easy. **Value:** French-serving firms; otherwise modest. **Cost drivers:** Drafter per text. **Dependencies:** D1, D4. Quebec language duties: confirm with counsel.
- **Why it sells:** "Answer every client in their language without a second keyboard."

#### W-09 Intake Assistant (gap asker and message-to-answer)

- **Shape:** Task. Pairs with W-24 for why each fact is needed.
- **Job:** lists missing facts, drafts targeted questions, and proposes questionnaire answers from a client's free-text reply, for staff to approve.
- **Works for:** intake reps and case officers.
- **Replaces:** "please also send" emails (AG-08 v1.7 §1); the gap list worked by hand (AG-03 v1.4 §3.1); staff-on-behalf entry (AG-8-25).
- **Uses:** AG-03 §3.1 gap list; AG-08 §3.4, §3.11; AG-10 Drafter and Sorter; CP-3.
- **New (Proposal):** proposed answers from a message with provenance "proposed from message of <date>", approved like a Reader value (AG-8-41, AG-8-44 pattern). Doc 3 v1.4 AG-8 §3.11 blocks machine entry pending A4-1; proposal-only sidesteps it.
- **Guardrails and approval point:** G1, G2, G7, G8, G13; AG-8-23. **Approval point:** `agent/sqr:verify` for answers; the AI-text setting for outgoing questions.
- **Why nobody has solved it:** VisaFlo announced it about 2 Oct 2026, not shown live (`visaflo.md` §16 row 6, https://www.linkedin.com/company/visaflo/).
- **Difficulty:** Medium. **Value:** fewer rounds with the client (Assumption). **Cost drivers:** one call per message. **Dependencies:** D1, D3, D6. Pre-retainer questions as advice: confirm with counsel / RCIC.
- **Why it sells:** "Ask only what is missing, and let the client answer in a WhatsApp message."

### 2.3 Group C. Front of the funnel

#### W-10 Lead Responder

- **Shape:** Journey (enquiry → booked consultation → proposal hand-off).
- **Job:** answers an enquiry in minutes with a consented, eligibility-grounded message, books the consult, recovers no-shows and cold leads, tells the rep the next move.
- **Works for:** intake and sales reps.
- **Replaces:** AG-02 v1.9 §3.6 to §3.7 manual follow-up and prioritising; AG-04 v1.5 §3.8 rebooking.
- **Uses:** AG-02 §3.6 recipes (AG-2-57), §3.7, §3.13; AG-03 Qualifier; AG-04; AG-10 Drafter.
- **New (Proposal):** personalised wording from Qualifier levers (AG-3-24) under the disclaimer; AI replies to a lead's written questions.
- **Guardrails and approval point:** G8, G13; AG-2-56. **Approval point:** the AI-text setting; template steps run under the recipe's autonomy.
- **Why nobody has solved it:** largely solved by CRMs (autopilot design §1.3) and VisaFlo's lead agent (`visaflo.md` §16 row 1). Not new; difference is the rules engine, consent and firm-only.
- **Difficulty:** Easy. **Value:** conversion. **Cost drivers:** Drafter per message. **Dependencies:** D1, D4 (`doc3-firm.md` Part 5 on sequences in R1); engagement scoring deferred (`foundation.md` C18). CASL class: confirm with counsel / RCIC.
- **Why it sells:** "Every enquiry answered in five minutes, legally, without a rep on call."

#### W-11 Consult Scribe and Proposal Drafter

- **Shape:** Task.
- **Job:** with consent, transcribes or reads the consult, drafts the consult record and proposal scope for the host, then hands to Drafter and Signer.
- **Works for:** the host and the sales rep.
- **Replaces:** AG-04 v1.5 §3.12 notes typed by the host; AG-05 v1.9 §3.1 to §3.3 template choice.
- **Uses:** AG-04 §3.12, AG-4-50, §3.6; AG-02 §3.12 recording (off by default, consent-gated); AG-05.
- **New (Proposal):** transcription and summary (no requirement exists: `visaflo.md` §16 row 3).
- **Guardrails and approval point:** G1, G6, G7, G13 (AG-04 BR-17); AG-05 BR-3. **Approval point:** the host; the proposal via AG-5-17 approval-for-send.
- **Why nobody has solved it:** VisaFlo lists AI meeting notes live (`visaflo.md` §16 row 3). Parity.
- **Difficulty:** Medium. **Value:** Unknown until measured. **Cost drivers:** transcription minutes (a second provider under D1). Recording consent: confirm with counsel.
- **Why it sells:** "Finish the consult with the proposal already written."

### 2.4 Group D. Money, corporate files and the long tail

#### W-12 Money Matcher

- **Shape:** Task.
- **Job:** proposes matches for offline payments, finds billable but unbilled work, drafts overdue reminders, prepares the trust-nature export.
- **Works for:** Billing and Finance.
- **Replaces:** the failures AG-06 v1.7 §1 names; the manual reconciliation view (§3.4); the collections queue (§3.2).
- **Uses:** AG-06 §3.2, §3.4, §3.5, §3.8; AG-13 §3.6; AG-14 §3.3; Biller, Mailer, Messenger.
- **New (Proposal):** AI-proposed payment-to-invoice matching (none specified: `ag-frs-1.md` Part 3 AG-06); unbilled-work list; bank-statement import as a source (Unknown in requirements).
- **Guardrails and approval point:** AG-06 BR-11, §9, AG-6-43, AG-6-24. **Approval point:** the Billing user's own record-payment and issue keys; client wording via the AI-text setting; template dunning is transactional.
- **Why nobody has solved it:** bank matching exists in accounting tools (Inferred); immigration tools export instead (`visaflo.md` §16 row 11). Unknown in this niche.
- **Difficulty:** Easy to Medium. **Value:** cash. **Cost drivers:** one call per unmatched line. **Dependencies:** D1; AG-06 §12; AG-6-23. Trust posture: confirm with counsel / RCIC.
- **Why it sells:** "Every e-transfer finds its invoice, and nothing goes unbilled."

#### W-13 LMIA Compliance Clerk

- **Shape:** Journey (employer set-up → advertising → quality check → submission record → worker tracking). Pairs with W-24 on wage and advertising rules.
- **Job:** reads advertising proof and proposes channel entries, builds the candidate log from CVs or CSV, proposes the duties comparison, drafts the recruitment report and the outstanding-items message, bundles the inspection pack.
- **Works for:** corporate case officers and the sign-off holder.
- **Replaces:** AG-17 v0.5 §3.4 to §3.6, §3.8 manual logging, ticking, reporting and bundling.
- **Uses:** AG-17 §3.2 to §3.8; SA-01B reference tables; Minder; Reader (new use); Drafter; AG-17-28, AG-17-82.
- **New (Proposal):** Reader on screenshots and CVs; a proposed duties comparison for the human tick (AG-17-32); the Needs you path for AG-17 (none today: inventory X5). **Excluded:** candidate screening or ranking (AG-17 §1; FD-7).
- **Guardrails and approval point:** G1, G6, G7, G11; AG-17-34. **Approval point:** `agent/case:review-approve`; retainers need an active licensed consultant (AG-17-74).
- **Why nobody has solved it:** AG-17 v0.5 §1's own claim that rivals lack recruitment compliance and pre-submission checks (internal scan, unverified in W1); no LMIA module in VisaFlo's evidence.
- **Difficulty:** Medium. **Value:** higher fees, six-year record risk. **Cost drivers:** Reader per screenshot and CV. **Dependencies:** SA-01B rows (AG-17 §13), expert check of values, release conflict (AG-07 §13 item 22). ESDC rules: confirm with counsel / RCIC; candidate help reopens FD-7.
- **Why it sells:** "An LMIA file an inspector can read, built as you go."

#### W-14 Lifecycle Keeper

- **Shape:** Journey (decision → next immigration moment → consented contact → new opportunity).
- **Job:** computes each client's next moment from pack rules (permit expiry, PGWP to PR, PR card, citizenship, residency obligation), drafts the consented re-engagement, opens an opportunity when a person clicks.
- **Works for:** Owner and intake reps.
- **Replaces:** nothing systematic (the autopilot design §18.3 "lifecycle dead-zones"); AG-02 v1.9 §3.10 manual reopen.
- **Uses:** AG-11 recipe "PR card / status expiry watch"; AG-07 §3.7, §3.10; AG-02 §3.10, §3.11 (AG-2-47); Minder; Drafter; CP-8 consent.
- **New (Proposal):** W-02's catalogue extended past decision (autopilot design §8.1, illustrative); an off-by-default, consent-checked re-engagement recipe.
- **Guardrails and approval point:** G8 is the whole question (CASL class routed to SME in AG-10 §13); a person converts (AG-2-47). **Approval point:** the AI-text setting; the Owner switches the recipe on.
- **Why nobody has solved it:** no rival in the evidence sells lifetime re-engagement; Unknown.
- **Difficulty:** Easy to Medium. **Value:** repeat revenue at near-zero acquisition cost. **Cost drivers:** negligible. **Dependencies:** D2, D5; AG-2-59. CASL and closed-file contact retention: confirm with counsel / RCIC.
- **Why it sells:** "Your closed files become next year's clients, automatically and lawfully."

#### W-15 Migration Mapper

- **Shape:** Journey (export → mapped → dry-run → confirmed → quiet → switched on).
- **Job:** proposes column, value and program mappings, pulls key dates from legacy notes, files old documents, hands the firm a dry-run.
- **Works for:** firm Owner or Admin; Expat Ready support in assisted migrations.
- **Replaces:** AG-18 v1.2 §3.2 manual mapping, §3.5 hand-filing, §3.6 value checks.
- **Uses:** AG-18 §3.0 to §3.10; AG-18-10; AG-18-33; Minder.
- **New (Proposal):** AI-proposed column and value mapping (manual today: `ag-frs-2.md` Part 3 AG-18); key dates from notes; a "could not map" report.
- **Guardrails and approval point:** AG-18 BR-1, BR-2, BR-3, BR-6, BR-8; AG-18-13, AG-18-36, AG-18-47. **Approval point:** the Owner's attestation and confirm (AG-18-49); nothing client-facing.
- **Why nobody has solved it:** VisaFlo imports from Drive and OneDrive (`visaflo.md` §16 row 16); mapped migration from Officio and CaseEasy: Unknown elsewhere; our adapters await samples (AG-18 §13 Q20).
- **Difficulty:** Medium. **Value:** lowers our cost of sale (assisted migration free at launch, AG-18 §3.9). **Cost drivers:** one pass per header and note; Reader per document. **Dependencies:** D1; AG-18-79; AG-18 §13 Q5. Imported consent: confirm with counsel.
- **Why it sells:** "Bring ten years of files across in a day, and switch them on when you are ready."

#### W-16 Privacy Clerk

- **Shape:** Task.
- **Job:** logs each access, correction, erasure or consent-withdrawal request on its clock, assembles the package, checks holds and floors, drafts the honest response, reminds before the deadline.
- **Works for:** the Owner and holders of `agent/data-export:request`.
- **Replaces:** Doc4 CP-8 §1 to §3.6 firm-side handling; AG-02 §3.14; AG-16 §3.5.
- **Uses:** CP-8 §3.2, §3.5, §3.6; SA-11 §3.8; AG-16 §3.5; AG-09 §3.12; Reminder.
- **New (Proposal):** triage and drafting; a what-the-law-stops checklist (SA-11 §3.8 honest-outcome rule).
- **Guardrails and approval point:** CP-8 BR-7, BR-8, §3.2. **Approval point:** the Owner (export is Owner-only); identity checks stay human.
- **Why nobody has solved it:** Unknown.
- **Difficulty:** Easy to Medium. **Value:** low frequency, high consequence. **Dependencies:** clocks and purposes set with counsel (CP-8 §3.6; SA-11 §13 Q2).
- **Why it sells:** "Every privacy request answered on time, with the law's limits stated honestly."

#### W-17 Case Briefer and Day Planner

- **Shape:** Task. The simplest pairing with W-24.
- **Job:** internal pickup summary per file, a leaver's handover list, and each person's ranked day with the reason beside each item. Internal only.
- **Works for:** every staff member; Case Managers.
- **Replaces:** AG-13 v1.12 §3.4 reading the timeline; AG-01 v1.16 §3.2 and AG-07 §3.8 handover and reassignment; AG-02 §3.7 deciding whom to call.
- **Uses:** AG-13 §3.3, §3.4; AG-11 §3.13; AG-02 §3.7; AG-14 §3.4; AG-07 §3.8; Drafter.
- **New (Proposal):** the summary itself (none specified: `ag-frs-2.md` Part 3 AG-13); an "AI-drafted" marker on notes (`doc4-portal.md` Part 5 item 4).
- **Guardrails and approval point:** AG-13 BR-4 note wall; G11; G9; G15; G3 (it approves nothing). **Approval point:** the reader; `agent/note:share-with-client` is never used by it.
- **Why nobody has solved it:** matter summaries are common in general practice software (`field-scan.md` §3); not immigration-specific. Convenience, not a moat.
- **Difficulty:** Easy; lowest exposure. **Value:** minutes per handover (Assumption). **Dependencies:** D1; AG-13 timeline is new in code.
- **Why it sells:** "Pick up any file in two minutes."

#### W-18 Report Narrator

- **Shape:** Task.
- **Job:** a weekly plain-language note from the dashboards, quoting only computed numbers.
- **Works for:** Owner and Case Manager.
- **Replaces:** AG-14 v1.10 §1 manual review.
- **Uses:** AG-14 §3.1 to §3.5, §3.9; Drafter; Mailer.
- **New (Proposal):** the narrative; anomaly alerts stay deferred (AG-14 §13).
- **Guardrails and approval point:** AG-14 BR-12, BR-2, BR-15. **Approval point:** the schedule owner.
- **Why nobody has solved it:** common outside this niche. **Difficulty:** Easy. **Value:** low. **Dependencies:** D1; AG-14 §12.
- **Why it sells:** "Your Monday numbers, explained."

### 2.5 Group E. Expat Ready's own work (admin plane; never touches a client)

#### W-19 Pack Drafter

- **Shape:** Task (admin).
- **Job:** drafts box maps for a new form edition, diffs editions, proposes reference-table rows from official pages with source and date checked.
- **Works for:** Content Manager and Content Approver.
- **Replaces:** SA-01 v2.2 §1 and §3.13 manual authoring; form maps as manual specialist work (`doc2-admin.md` Part 3 item 12); the overdue-review queue (SA-1B-40).
- **Uses:** SA-01 §3.12, §3.13; SA-01B §3.5 to §3.7; SA-11 §3.9.
- **New (Proposal):** the already-permitted, deferred features SA-1B-33 and SA-1B-34 (SA-01B §0.3 Defer) brought into scope, plus reference-table drafting.
- **Guardrails and approval point:** SA-01 §3.12 two-person rule; SA-1B-35; SA-01B §3.6 source and review dates. **Approval point:** the Content Approver; values by SME and founder (SA-01 §13).
- **Why nobody has solved it:** Unknown; VisaFlo builds form automation by hand (`visaflo.md` §12).
- **Difficulty:** Medium to Hard (XFA: SA1B-D28). **Value:** our content cost; scale across countries (autopilot design §5). **Dependencies:** D2; SA1B-D18, SA1B-D23. Values: confirm with counsel / RCIC.
- **Why it sells (internally):** "A new IRCC form edition mapped in an hour, checked by a person."

#### W-20 Pack Tester

- **Shape:** Task (admin).
- **Job:** drafts sample clients with expected outcomes, runs the dry-run, explains version differences in plain words.
- **Works for:** Content Approver, Platform Owner.
- **Replaces:** SA-01 v2.2 §3.13 manual sample building; reviewer checks without test profiles (SA-01B §3.6).
- **Uses:** SA-1-52 dry-run; SA-01 §3.13 diff; AG-03 BR-18; Charter golden cases (`foundation.md` Part 4); SA-11 §3.9.
- **New (Proposal):** AI-drafted sample sets and change notes; the engine decides every outcome (G10). Conflicts with SA1B-D18 (no rule tests).
- **Guardrails and approval point:** AI never scores. **Approval point:** the Content Approver.
- **Why nobody has solved it:** Unknown; deterministic-model trust is an English regulator example only (`field-scan.md` §6 item 1).
- **Difficulty:** Medium. **Value:** proof that advice has not shifted. **Dependencies:** D2; SA1B-D18 is a founder decision.
- **Why it sells (internally):** "Prove every rule change before a firm sees it."

#### W-21 Rule-change Watcher

- **Shape:** Task (admin). Pairs with W-24 for the impact list.
- **Job:** watches the official pages a pack cites, flags changes, drafts the proposed pack change with a diff.
- **Works for:** Content Manager; indirectly every firm.
- **Replaces:** re-reading pages by hand (AG-17 v0.5 §3.1 keeps values current on canada.ca).
- **Uses:** SA-01B §3.6 to §3.7 source and review dates; SA-01 §3.12, BR-3, §3.14; AG-03 §3.7 to §3.8.
- **New (Proposal):** entirely new; no web watching is specified (`visaflo.md` §16 row 14).
- **Guardrails and approval point:** never edits a pack; two-person publish; open files unchanged (Charter V2 journey J9); adoption by firm staff (SA-1-58). **Approval point:** Content Approver.
- **Why nobody has solved it:** VisaFlo's monitor ("launching soon") maps changes to cases directly (`visaflo.md` §16 row 14, https://visaflo.ca/monitor); ours goes through reviewed packs: the opposite, safer design.
- **Difficulty:** Medium. **Value:** content currency with a paper trail. **Dependencies:** D2; public pages only. Values: confirm with counsel / RCIC.
- **Why it sells:** "When IRCC changes a rule, your pack changes after a person checked it, and your open files stay as they were."

#### W-22 Support Triager

- **Shape:** Task (admin).
- **Job:** suggests category, priority and route; drafts the first reply from the bilingual knowledge base; drafts an article from each resolved ticket.
- **Works for:** Expat Ready Support (SA-07 v2.10: a 4 to 6 person team).
- **Replaces:** SA-10 v2.5 §1 manual triage and replies.
- **Uses:** SA-10 §3.2 to §3.3 keyword hints (SA-10-7), §3.9, §3.10.
- **New (Proposal):** AI drafting; launch posture stays suggest-only (SA-10 §13 Q7, Q8).
- **Guardrails and approval point:** SA-10 BR-4; Immigration Content routes to the Content Manager; SA-2-17; AG-18-47. **Approval point:** the support agent.
- **Why nobody has solved it:** common everywhere; margin only. **Difficulty:** Easy. **Dependencies:** D1; stale `global/*` keys (`sa-frs.md` Part 5).
- **Why it sells (internally):** "First reply in minutes, in both languages, by a person who only had to check it."

#### W-23 Firm Health Watcher

- **Shape:** Task (admin).
- **Job:** watches firm health (over limit, trial ending, overdue, stalled setup, no logins) and drafts outreach.
- **Works for:** account managers and Billing.
- **Replaces:** SA-02 v2.19 §3.6 and SA-04 v2.14 §3.5 to §3.6 list-working.
- **Uses:** SA-02 §3.6; SA-03 §3.7; SA-04 §3.5 to §3.6; SA-09; AG-01 §3.6; Mailer.
- **New (Proposal):** drafting only; the AI never changes a firm's state.
- **Guardrails and approval point:** SA-04 §3.5 to §3.6 goodwill rule. **Approval point:** the account manager.
- **Why nobody has solved it:** generic. **Difficulty:** Easy. **Value:** low. **Dependencies:** SA-04 §12.
- **Why it sells (internally):** "No firm goes quiet unnoticed."

### 2.6 Group F. The expert co-pilot and the role twins (AIW-D19, D24, D25)

#### W-24 Practice Expert (the expert co-pilot)

- **Shape:** Expert co-pilot. **Answers only, never acts; sources only; refuses without a source; Canada-only processing** (AIW-D25).
- **Job:** answers any staff question in context from three sources only: the published pack version that applies to the file, the firm's own records the asker may see, and the product's run and audit records. Examples: "Which of my files are at risk this week, and why?" (AIW-D19); "What does this client still need, and which rule says so?"; "Why did the Qualifier rank this program below the cutoff?"; "What did we promise this employer in the retainer?". Every answer cites its source (pack version and rule ID, or record and timestamp).
- **Works for:** every firm role within its own permissions; the Owner for firm-wide questions.
- **Replaces:** knowledge held in a senior consultant's head (AG-03 v1.4 §1); timeline reading (AG-13 §3.4); stalled-case hunting (AG-14 §3.2); reading the reasons the pack already carries (SA-1B-59; SA-01B §9).
- **Uses (read-only):** SA-01, SA-01B published packs (SA-01 BR-3); AG-03 breakdown and provenance; AG-07 §3.6 deficiencies and readiness; AG-11 §3.4 Minder, §3.9 run history, §3.13 Needs you; AG-13 timeline and audit; AG-14 under viewer scope; AG-06 money tab; AG-17 reference tables; the Finder (Doc 1 §8.8). No write Doer.
- **New (Proposal):** the question-answering layer; a retrieval index that respects every permission and tenant wall (D9); the citation format; the "no source, no answer" rule; a standing answer log in `AiRunLog`. The founders' June spec names it as "AI copilot", not a Doer (`foundation.md` Part 3 item 6); no October file specifies it (`doc3-firm.md` Part 3 AG-14). Staged: **v1** structured question shapes only (at risk this week, what is missing, which rule, what is waiting), answered from Minder, deficiencies, Needs you and pack rule text; **v2** free questions over documents and messages.
- **Guardrails and approval point:** G6, G7, G9, G10 (it quotes the pack; it never computes eligibility: FD-16), G13, G15 (the asker's permissions bound retrieval; masked data only after an audit write, Doc 1 §7.2). Never messages a client, changes a record or approves anything. **Approval point:** none for an answer to staff. Anything reaching a client goes through a task worker and that worker's approval point.
- **Why nobody has solved it:** Visto's Copilot is live and trained on IRCC information (`field-scan.md` §3.3, https://visto.ai/); VisaFlo announced a sidebar assistant citing official sources and a per-firm knowledge vault (`visaflo.md` §12, §16 row 13). Not found anywhere: answers from a *versioned, second-person-approved* pack (same question, same answer, reproducible a year later) and from the firm's *own records under the asker's permissions*. Ours only if G10 and G15 hold. Unknown whether any rival enforces either.
- **Difficulty:** Hard (v2); Medium (v1). The challenge review names it the riskiest piece (hallucination, privacy, cost); AIW-D25 and D27 accept the limits.
- **Value:** adoption and retention across every role; inside the plan (AI plan gating open, AG-16-35).
- **Cost drivers:** retrieval plus one call per question; context size; the least predictable cost.
- **Dependencies and risks:** D1, D2 (pack reasons as content), D7, D9. Law 25 automated-decision transparency (SA-11 §13 Q2): it explains, it does not decide: confirm with counsel / RCIC.
- **Why it sells:** "Ask your practice anything, and get the rule, the file and the reason, with the source."

#### W-25 AI Case Processor (role twin: assistant to the case officer)

- **Shape:** Role twin: W-01, W-03, W-04, W-07, W-08, W-17 and W-24, under a subset of one named case officer's permissions, that person's name on every action (AIW-D24). External wording: *assistant to the case officer*.
- **Job:** the persona's work in Overview v1.11 (Case Officer/Paralegal: collect documents, manage questionnaires, execute checklists, draft forms, log correspondence) across the officer's files, prepared for the officer's own approval and then the review sign-off.
- **Works for:** a named case officer and the representative.
- **Replaces:** the loops under its components, in one switch instead of six.
- **Uses:** the union of its components; AG-01 §3.3 roles; AG-11 §3.13 as the single hand-off.
- **New (Proposal):** the permission subset: `agent/case:document-manage`, `agent/sqr:*` except `verify`, communication drafting, `agent/task:*`; never the professional approvals (§1.1). Seats: AG-1-13 and SA-3-41 are silent on non-humans (Unknown); proposal: no seat, metered by files.
- **Guardrails and approval point:** G1 to G15; four-eyes stops it approving what it prepared (AG-7-65; Phasing v1.4 Glossary). **Approval point:** the delegating officer for internal actions (G4); the firm's role settings for client, form and filing output (AIW-D26).
- **Why nobody has solved it:** VisaFlo sells fewer hires with agents that own the flow (`visaflo.md` §12 item 1); Clio Work runs multi-step agents (`field-scan.md` §4 row 4). Delegation under one person's permission subset: Unknown; it is also the answer to the regulator's question.
- **Difficulty:** Hard (D3 plus components). **Value:** the sentence firms and investors understand; priced through W-01. **Dependencies:** D3 first. Supervision rules and perception: confirm with counsel / RCIC.
- **Why it sells:** "Give every case officer an assistant that prepares, and let your named person decide."

#### W-26 AI Intake Clerk (role twin: assistant to intake)

- **Shape:** Role twin: W-10, W-09, W-07, W-11 and W-24 under a subset of one named intake rep's permissions.
- **Job:** the persona's work (Overview v1.11, Intake/Sales): capture, de-duplicate, run the Qualifier, ask missing questions, book, chase, hand a complete profile and consult record to the host.
- **Works for:** a named intake rep and the host.
- **Uses:** AG-02, AG-03, AG-04, AG-08 (PQR), AG-10.
- **New (Proposal):** subset: `agent/prospect:*` capture and pipeline, `agent/assessment:run` but never override, review or share (AG-03 §10), `agent/booking:*`, drafting only.
- **Guardrails and approval point:** G8, G13; conversion stays a person's act (AG-02 §3.5; AG-2-47). **Approval point:** the rep; the AI-text setting for lead messages; AG-3-38 for any shared summary.
- **Why nobody has solved it:** VisaFlo's lead agent and chatbot cover the front door, applicant-facing (`visaflo.md` §16 rows 1, 2), which AIW-D11 rules out for us. Partly solved.
- **Difficulty:** Medium to Hard (D3). **Value:** conversion. **Dependencies:** D3, D4, C18. CASL and pre-retainer advice: confirm with counsel / RCIC.
- **Why it sells:** "Every enquiry qualified, asked the right questions and booked, before your rep's coffee."

#### W-27 AI Billing Clerk (role twin: assistant to Billing)

- **Shape:** Role twin: W-12, the money part of W-18 and W-24 under a subset of one named Billing user's permissions.
- **Job:** the persona's work (Overview v1.11, Accounts/Billing) as drafts: invoice drafts from milestones, time and government fees; matches; dunning; the aged-receivables note; the trust-nature export.
- **Works for:** a named Billing user and the Owner.
- **Uses:** AG-06; AG-13 §3.6; AG-14 §3.3; AG-05 §3.11.
- **New (Proposal):** subset: invoice draft only; never issue on its own, never record payment, never refund (AG-06 BR-11 separation of duties; BR-2 immutability).
- **Guardrails and approval point:** AG-06 §9, BR-13, BR-14, AG-6-24. **Approval point:** the Billing user's issue and record keys; the AI-text setting for client wording.
- **Why nobody has solved it:** VisaFlo announced retainer-to-invoice automation under "Agents" (`visaflo.md` §12). Partly; reconciliation and unbilled-work detection not shown (Unknown).
- **Difficulty:** Medium. **Value:** cash; the twin a solo practitioner switches on first. **Dependencies:** D3; AG-06 §12. Trust posture: confirm with counsel / RCIC.
- **Why it sells:** "Nothing unbilled, nothing unmatched, nothing refunded by a machine."

#### W-28 AI Pack Author (role twin, admin plane: assistant to the content author)

- **Shape:** Role twin: W-19, W-20, W-21 under a subset of one named Content author's permissions (SA-07 v2.10 Appendix A roles).
- **Job:** keeps a pack current as drafts: watches sources, drafts changes, maps and rows, builds golden cases and change notes, submits for the second person's approval. Can never approve or publish.
- **Works for:** the content team; indirectly every firm on the pack.
- **Uses:** SA-01, SA-01B, SA-05 (non-legal bodies), SA-11 §3.9.
- **New (Proposal):** subset: pack draft and submit; never approve, publish, rollback (SA-01 §3.12). SA-07 has no route for a non-human staff account (`sa-frs.md` Part 3 SA-07): D3 on the admin plane.
- **Guardrails and approval point:** SA-01 §3.12; SA-5-23; G12. **Approval point:** Content Approver; values by SME and founder.
- **Why nobody has solved it:** Unknown; no rival shows pack-as-data (`field-scan.md` §4 row 8).
- **Difficulty:** Medium to Hard. **Value:** content cost and country speed (autopilot design §6 "intelligence factory"). **Dependencies:** D2, D3. Values: confirm with counsel / RCIC.
- **Why it sells (internally, investors):** "A country pack kept current by an assistant, approved by two people, every change traceable."

### 2.7 Where a task worker and the expert must work together

| Worker that acts | What W-24 adds | Why both |
|---|---|---|
| W-02 Deadline Guardian | the rule and date source behind "at risk this week" | Minder knows when; the expert says why, from the pack version pinned to the file |
| W-01 File Builder | plain-words reason for each deficiency and unverified value in the readiness report | reviewers read reasons, not codes (SA-1B-59 reasons are content the expert surfaces) |
| W-03 Letter Reader | what a letter type means under the current pack and what usually resolves it | the Reader extracts; the expert grounds the response plan |
| W-06 Submission Letter Drafter | the exact rule and required wording, with pack version | stops the Drafter inventing a legal basis (G1, G10) |
| W-09 Intake Assistant | why each missing fact is needed (which gate or grid reads it) | questions a client understands; the rule stays traceable |
| W-13 LMIA Clerk | wage, advertising and refusal-area rows with source and date | every warning carries the table row that caused it |
| W-17 Case Briefer | the "why" beside each ranked item | a brief is only as good as its reasons |
| W-21 Rule-change Watcher | which firms, programs and open files a change would touch | materiality is judged by a person with the impact list |
| W-25 to W-28 role twins | the twin's own answering voice | a twin that cannot say why will not be trusted or approved quickly |

---

## 3. Ranking: value against ease, with shape

Judgement (Proposal). **Value**: H = firm pays per file or it makes the firm money; M = clear time or risk; L = convenience. **Ease**: E3 Easy, E2 Medium, E1 Hard. **Unsolved**: Y / partly / N / Unknown. **Shape**: T task, J journey, R role twin, X expert.

| Rank | Worker | Shape | Value | Ease | Unsolved? | Build order | Note |
|---|---|---|---|---|---|---|---|
| 1 | W-01 File Builder | J | H | E2 | Partly | **1st** | Wedge. Includes W-04, W-07 |
| 2 | W-02 Deadline Guardian | T | H (hook) | E3 | Unknown / Y (stateful model) | **2nd, with 1st** | Hook. Minder + SME catalogue |
| 3 | W-24 Practice Expert v1 | X | H (adoption) | E2 (v1) / E1 (v2) | Partly | **3rd** (v1) | Answers only (D25); pairs with 1 and 2 |
| 4 | W-03 Letter Reader | T | H | E2 | Y (announced only) | 4th | After filing |
| 5 | W-14 Lifecycle Keeper | J | H (revenue) | E3/E2 | Y | 5th | CASL check first |
| 6 | W-12 Money Matcher | T | H (cash) | E3/E2 | Unknown | 6th | Pays in cash |
| 7 | W-04 Upload Reviewer | T | M | E3 | Partly | inside 1st | Sell alone |
| 8 | W-07 Inbox Filer | T | M | E3 | N | inside 1st | Precondition for 4, 10 |
| 9 | W-08 Bilingual Writer | T | M | E3 | Y (firm French) | 7th | French-serving firms |
| 10 | W-09 Intake Assistant | T | M | E2 | Y (announced only) | 8th | Proposal-only answers |
| 11 | W-25 AI Case Processor | R | H (story) | E1 | Unknown | after 1, 3, 4 and D3 | First twin |
| 12 | W-15 Migration Mapper | J | M (sales) | E2 | Unknown | 9th | Cuts cost of sale |
| 13 | W-13 LMIA Clerk | J | H (corporate) | E2 | Y (internal claim) | 10th | SA-01B rows first |
| 14 | W-27 AI Billing Clerk | R | M/H | E2 | Partly | after 6 and D3 | Easiest twin to govern |
| 15 | W-10 Lead Responder | J | M | E3 | N | 11th | Table stakes |
| 16 | W-26 AI Intake Clerk | R | M | E2 | Partly | after 8, 11 and D3 | Firm-side only |
| 17 | W-05 Form Preparer | T | H | E1 | N | **hard but worth it** | XFA, box maps, parked |
| 18 | W-06 Submission Letter Drafter | T | M | E2 | N | 12th | Court AI-disclosure rule |
| 19 | W-17 Case Briefer | T | M | E3 | N | 13th | Safest first switch-on |
| 20 | W-11 Consult Scribe | T | M | E2 | N | 14th | Recording consent |
| 21 | W-16 Privacy Clerk | T | M (risk) | E3/E2 | Unknown | 15th | Counsel sets clocks |
| 22 | W-18 Report Narrator | T | L | E3 | N | last (firm) | Only if cheap |
| 23 | W-21 Rule-change Watcher | T | M (trust) | E2 | Y (opposite design) | admin 1st | Reviewed-pack story |
| 24 | W-20 Pack Tester | T | M (safety) | E2 | Unknown | admin 2nd | Proof |
| 25 | W-19 Pack Drafter | T | M (scale) | E1/E2 | Unknown | **hard but worth it** | Permitted, deferred |
| 26 | W-28 AI Pack Author | R | M (scale) | E1/E2 | Unknown | after 23 to 25 | Two-person rule |
| 27 | W-22 Support Triager | T | L/M | E3 | N | admin 3rd | Margin |
| 28 | W-23 Firm Health Watcher | T | L | E3 | N | admin last | Churn |

**Build order (Proposal, following AIW-D27 "catalogue all, ship one"):** File Builder (with W-04, W-07) → Deadline Guardian → Practice Expert v1 → Letter Reader → Lifecycle Keeper → Money Matcher → Bilingual Writer → Intake Assistant → **AI Case Processor** once D3 exists and the components have pilot numbers → Migration Mapper → LMIA Clerk → AI Billing Clerk → Lead Responder → AI Intake Clerk → Submission Letters → Case Briefer → Consult Scribe → Privacy Clerk → Report Narrator → Practice Expert v2. Admin in parallel: Rule-change Watcher → Pack Tester → Pack Drafter → AI Pack Author → Support Triager → Firm Health Watcher. Form Preparer as its own track once XFA and box maps are decided.

---

## 4. Hard but worth it

| Worker | Why hard | Why worth it | What unblocks it |
|---|---|---|---|
| W-05 Form Preparer | XFA unsupported; box maps unauthored; parked; release undecided | every rival has it; the File Builder stops short without it | XFA route (Unknown), first box maps (D2), release call (D4) |
| W-24 Practice Expert v2 | hallucination, privacy, cost (challenge review) | the feature every role uses daily | v1 first; permission-scoped retrieval (D9); pack reasons as content (D2) |
| W-25 AI Case Processor and the other twins | delegation and permission-subset model undefined (D3); regulator perception | the sentence that sells; the investor's role twin | Phase B requirement; "assistant to the role" wording; counsel |
| W-19 Pack Drafter / W-28 AI Pack Author | XFA; content tooling; two-person rule | one engine, many packs | Canada content first; SA1B-D18 revisited |
| W-13 LMIA Clerk | SA-01B rows unbuilt; values unchecked; no agent-native path; FD-7 | higher fees; six-year inspection risk | SA-01B rows; expert check; founder decision on candidate help |
| W-21 Rule-change Watcher | materiality is human; sites change | the safe answer to VisaFlo's monitor | content capacity; pack source URLs |

---

## 5. Assumptions and questions

**Assumptions (for the Lead to carry into `../../assumptions.md`):** A-W2-1 delegated-session record (D3, D8). A-W2-2 AI rail with Canada-only terms recorded (D1). A-W2-3 Canada pack content arrives, including plain-words reasons (D2). A-W2-4 Release 1 keeps what the 7 Oct module files say (D4, D5; consistent with AIW-D21). A-W2-5 time saved is measured, not assumed. A-W2-6 a role twin holds a permission subset of one named person and takes no seat; metered by work (AG-1-13, SA-3-41 silent). A-W2-7 the expert's retrieval is permission-scoped server-side like AG-14 (G15, D9).

**Proposals appended to `../../proposals.md` (AIW-D23):** role-twin permission subset and no-seat; expert v1 question shapes and permission-scoped index; CASL class of lifecycle re-engagement; FD-7 and candidate help; per-file metering vs SA-4-44; non-legal translation helper into scope (SA-05 §13 Q5); a rule that every catalogue entry names its approval key or setting.

**Questions for Ranjan:**
1. File Builder per-value approvals: the firm's `agent/sqr:verify` holders for values, with the review sign-off holder for the whole report (AIW-D26 reading)? Confirm.
2. Form Preparer: solve XFA (how), or sell the File Builder without forms first?
3. Lifecycle Keeper: ask counsel now about CASL class? It decides whether this worker exists.
4. LMIA Clerk: confirm no candidate ranking or screening (FD-7).
5. Admin-plane workers: in the investor story, or internal only?
6. Expert v1 limited to structured question shapes before free questions over documents: agree?
7. Role twins: agree the no-seat, metered-by-work proposal?

**For counsel / RCIC (collected):** the advice boundary for readiness reports, response plans, pre-retainer questions and expert answers; whether firm-set approvers meet supervision rules (the product never verifies a licence); CASL class of lifecycle and lead messages; recording consent for consults; Federal Court AI-content declarations; Law 25 automated-decision transparency; DSR clocks and retention floors; trust-money posture; all immigration values.

---

## 6. Summary (ten lines) and top five

1. Twenty-eight entries across the four shapes: 19 task, 5 journey, 4 role twins, 1 expert; 22 for firms, 6 for Expat Ready's own team. Each is a bundle of what the October requirements already specify plus a small, labelled new part; nothing existing is restated (AIW-D22).
2. The guardrail layer is already written (G1 to G15, cited by ID); every worker rides it. Approval is by a named person under the firm's own role settings, licensed by default (AIW-D26); we never claim product-enforced licensed sign-off.
3. Wedge and hook stand: the File Builder is the biggest manual loop; the Deadline Guardian is cheap, rule-based and the fear every consultant has.
4. The expert co-pilot answers only, from versioned packs and the firm's own records under the asker's permissions (AIW-D25); that combination is in no rival's evidence. Build v1 third, with fixed question shapes.
5. Role twins are delegation: a subset of one named person's permissions, never the professional approvals, "assistant to the role" externally (AIW-D24, D27). AI Case Processor first, after its components have pilot numbers.
6. Next by value: Letter Reader (post-filing), Lifecycle Keeper (repeat revenue), Money Matcher (cash); nobody in the evidence sells the second.
7. Parity items (Inbox Filer, Lead Responder, Submission Letters, Consult Scribe) are needed, not our edge; the edge is traceable values, versioned rules and the audit record.
8. Hard but worth it: Form Preparer, expert v2, the twins, Pack Drafter, LMIA Clerk, Rule-change Watcher.
9. Dependencies are information only (AIW-D21): provider recorded, pack content, delegated-session record, release labels, Minder, permission-scoped retrieval. Time saved is Assumption until W3b.
10. The admin-plane workers and the AI Pack Author make "one engine, many countries" true; they cost us, not the firm.

**Top five:** W-01 File Builder · W-02 Deadline Guardian · W-24 Practice Expert v1 · W-03 Letter Reader · W-25 AI Case Processor (hard but worth it).
