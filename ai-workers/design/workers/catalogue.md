# AI Worker catalogue: every use case we can find, in four shapes (W2 step 3, revised after review W2)

**Author:** ai-worker-designer. **Date:** 9 Oct 2026, revised the same day after `../../checks/review-W2-2026-10-09.md` (B-1, B-2, M-1, M-2, M-6, M-7, M-8, m-2 to m-5, m-7 to m-9, m-16) and re-read end to end against the revised `../ws2-improvements.md` (18:50 version). **Status:** Proposal for Ranjan and the Lead. A product fact carries a citation (file, version, requirement ID or section); everything else is labelled Proposal, Assumption or Unknown.
**Rules applied:** AIW-D18 (find every use case, rated Easy / Medium / Hard-but-worth-it), AIW-D19 (four shapes), AIW-D22 (no duplication: existing requirements cited by ID, file and version, never restated; this file describes only what is new), AIW-D24 (role twin = delegation), AIW-D25 (expert co-pilot answers only), AIW-D26 (approval = a named person, whoever the firm's settings allow for that role; licensed by default per the existing requirements; the product's floors stay; we never claim product-enforced licensed sign-off), AIW-D21 (assume everything in the documents is or will be built; dependencies are information only, but each one is marked Built / Specified / Proposed so no gap is hidden), AIW-D11 (firms only). **Where this file and `../ws2-improvements.md` conflict, the improvements win** (review B-1); the IMP numbers below point to the governing text.
**Sources:** the W1 inventory (`../inventory/*.md`, from `sources/drive-snapshot-2026-10-09/`), `../../research/visaflo.md` §11, §12, §16, `../../research/field-scan.md` §3 to §7, the founders' autopilot design (`code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-18-rna-autopilot-design.md`), `../wedge-recommendation.md`, `../challenge-review-2026-10-09.md`, `../ws2-improvements.md`. Web facts carry the URL and access date recorded in the research files (9 Oct 2026 unless marked).

**In plain words.** A *Doer* is one of the product's own single-job tools (Mailer sends email, Reader reads documents, Minder watches deadlines). The *Conductor* runs Doers when something happens. *Needs you* is the staff inbox where Doer output waits for a person. An *AI Worker* is a recipe the Conductor runs from a closed menu of Doer actions (IMP-10); the models inside it never hold tools and never choose actions. It works under a named person's permissions and stops at that person's, or another named person's, approval. Terms used below: *XFA* = the file format of IRCC's barcode PDF forms, which the built filler cannot open; *CASL* = Canada's anti-spam law on commercial messages; *DSR* = a data-subject request (a client asking to see, correct or erase their data); *Law 25* = Quebec's privacy law; *MRZ* = the machine-readable lines on a passport.

---

## 0. How to read this file

| Shape (AIW-D19, README §1) | Meaning here |
|---|---|
| **Task worker** | One job, done well. W-02 to W-09, W-11, W-12, W-16 to W-23 (18 entries) |
| **Journey worker** | A whole journey, end to end, stopping at approvals. W-01, W-10, W-13, W-14, W-15 (5) |
| **Role twin** | An AI version of a user role, scoped as a **subset of one named person's permissions** (AIW-D24; the delegation is defined once in IMP-1; twin specifics in IMP-22; blocked list IMP-23). Externally: an *assistant to the role* (AIW-D27). W-25 to W-28 (4) |
| **Expert co-pilot** | Answers only, never acts; sources only; refuses without a source; Canada-only (AIW-D25; IMP-20, IMP-21). W-24 (1) |

A task worker acts; the expert explains. §2.7 lists the pairs. Total 28 entries.

- **§1** common ground: identity, guardrails and hard limits (cited, not restated), approval rule, dependencies with Built / Specified / Proposed, cost drivers.
- **§2** the catalogue; **§3** ranking with shape, evidence of being unsolved, and build order; **§4** hard but worth it; **§5** assumptions and questions; **§6** summary and top five.
- Difficulty: **Easy** = existing rule-based Doers plus at most one already-specified AI Doer, internal or low-exposure output, and the pieces it needs are built or specified. **Medium** = a new AI step, new pack content, client-facing output, or a needed piece that is specified but not built. **Hard** = blocked by parked scope, a file-format problem, an undefined delegation model, or a legal question.
- **Status markers** (M-8): *Built* = exists in the code copies per the module's §12 check; *Specified* = in the October module files, not built; *Proposed* = this file or `../ws2-improvements.md`; *Content* = pack or SME content not yet authored.

---

## 1. Common ground

### 1.1 Identity: how every worker acts

Every worker acts on behalf of a named person, with only that person's permissions, and nothing takes effect until a person approves (AIW-D13; FD-16, Founder Decisions Log v1.5). The requirements anticipate but do not define a non-human actor (Doc 3 v1.4 AG-8 §3.11, AG-11 §3.3a: "Doc-1 Amendment A4-1", never written). The audit log records `actorUserId` only (AG-13 v1.12 §7; inventory X7); SA-11 v2.7 SA-11-2 has no AI actor type. **The delegation that fills this gap is defined once, in `../ws2-improvements.md` IMP-1** (the record and its rules), with the audit join in IMP-2 and what is specific to role twins in IMP-22. This file defines nothing of it twice; where an entry below says "delegation", "subset" or "no seat", it means the IMP-1 rules. Status: *Proposed*.

### 1.2 Guardrails already in the requirements (cited, not restated; every worker obeys all)

| Code | Guardrail | Where it is written |
|---|---|---|
| G1 | Proposal only, with provenance and confidence; never fabricate | AG-11 v1.11 AG11-D4; AG-07 v2.7 BR-7 |
| G2 | Product floors (AI client text, AI-edited template, government form, unlooked-at verified-profile write) never below "Ask me first" | Overview v1.11 Agent-native; AG-11-53; AG-16-36 |
| G3 | Nothing executes on timeout | AG-11-59; AG-10-45; AG-9-45 |
| G4 | Approving needs the same permission as doing it by hand | AG-11-58; AG-10-46; AG-09 v1.8 §10 |
| G5 | Nothing is submitted to a government authority | AG-11-54; AG-7-59; AG-17 v0.5 §3.6 |
| G6 | AI off until provider, Canada-only region and no-training terms are recorded; every model call logged | AG-11-93; AG-16 v1.12 §3.9; AG-11-72; AG-10-48; AG-9-48 |
| G7 | Client or imported content reaches a model as delimited data, never instructions; no tool access | AG-11-94; AG-10-54; AG-9-42; AG-18-36; IMP-26 |
| G8 | Consent at send time; quiet (imported) records skipped; rate caps; unverified senders never trigger AUTO | AG-11-37, AG-11-87, AG-11 §3.10; AG-02 BR-9, BR-19; AG-2-60; AG-10-47 |
| G9 | No passport or financial numbers in messages, notifications or logs; data minimisation per model call | AG-11 §11; AG-13 §11; AG-18 BR-17; IMP-21 |
| G10 | Rules decide, AI proposes. **Every rule step gives the same result for the same input and pack version. Every AI step is a proposal with its source, its confidence and its model and prompt version recorded, reviewed the same way every time** (IMP-37 wording; AI output is never promised identical) | AG-3-39; SA-01 v2.2 BR-3; Overview v1.11 Country-Awareness 4; SA-11 v2.7 §3.9; AG-11-72 |
| G11 | Assist the firm, never police it | AG-11-49; AG-10 v1.9 §1; AG-14 BR-15; AG-16 BR-21 |
| G12 | Legal and consent text never machine-translated | AG-12-24; SA-5-15; Doc4 v1.3 CP-6-22 |
| G13 | Never promise an outcome | AG-02 BR-10; AG-10-44 note; AG-03 BR-11 |
| G14 | Every AI path has a manual fallback; AI never load-bearing | AG-8-45; AG-11 §3.10; AG-16 BR-18 |
| G15 | The AI sees only what the asker may see; tenant isolation; masked data revealed only after an audit write | AG-14 BR-2, BR-8; Overview v1.11 Design doctrine; Doc 1 v1.3 §7.2, §8.8 |
| G16 | **Hard limits and the worker blocked list (IMP-27, IMP-23; status Proposed, for Ranjan to ratify):** no worker deletes a client, case or document; makes any billing, payment, refund or trust entry; runs any export; changes users, roles, permissions, settings, the AI switch, safeguards or supervision; signs or countersigns; holds any of the professional actions; moves a case stage; creates a lead from an unknown number; sends free text to a client; grants or edits a delegation. A worker may **prepare an internal list or draft** for a person who then does the act by hand | IMP-23, IMP-27; nearest existing pattern SA-2-17, SA2-D14 |
| G17 | Worker-sent client messages use firm-confirmed templates only; immigration-significant fields render from verified values (AG-11-97); templates the firm marks as carrying status or eligibility content default to **"ask me first"** when a worker sends them, unless the firm sets otherwise (IMP-28(c)); any worker free text is "ask me first" (the AI-text floor) | AG11-D1; AG-10-44; AG-11-91; AG-11-97; IMP-28 |

### 1.3 The approval rule (AIW-D26, supersedes AIW-D17's licensed-only rule)

AI Worker output is approved by a **named person, whoever the firm's own settings allow for that role**. The existing requirements set the defaults and floors: AI client text to a licensed user by default, Owner may widen (AG11-D11; AG-10-44; SA6-D9, BR-20); professional approvals to every holder, licensed marked preferred, Owner fallback (AG-7-68; AG-5-27; AG-11-89, AG-11-90); supervised messages (AG-10-49; AG-16 §3.11); the product never checks a licence (AG1-D19; AG-11-88). What the approval record must show after D26 is IMP-17 (its part (b), a default pause when a firm has no licensed user, is a proposed exception to D26 for Ranjan, not a rule this file relies on). **We never claim product-enforced licensed sign-off.** Each entry names its *approval point* as the permission key or setting that already governs the same action by hand (G4). Internal-only output is approved by whoever would do that work by hand.

### 1.4 Dependencies (information for the team, AIW-D21), each with its status

| Code | Dependency | Status | Where it is recorded |
|---|---|---|---|
| D1 | AI provider recorded with Canada-only, no-training terms; an AI rail in SA-08 | *Proposed* (IMP-6, IMP-7); no rail exists (SA-08 v2.2 §1); old code calls the provider's standard service (`../ws2-baseline/A-ai-switch-provider-residency.md`) | AG-11-93 |
| D2 | Canada pack content (checklists, box maps, deadline rules, obligation catalogue, deficiency library, Reader field lists, plain-words rule reasons) | *Content*, not authored (SA-01 v2.2 §0 Parked, §12; SA-01B v1.2 §12) | Charter V2 dates |
| D3 | The delegation record and, for twins, the permission subset | *Proposed* (IMP-1, IMP-2, IMP-22, IMP-23) | §1.1 |
| D4 | Release labels conflict (Charter, SCOPE-TRIAGE, module files); precedence rule | *Open for Ranjan* (IMP-31) | `../inventory/foundation.md` Part 3 |
| D5 | The Minder | *Specified* (AG-11 §3.4), **not built**: AG-11-47 "Today the Minder does not exist" (AG-11 v1.11 §12); Charter leaves the watcher open (`foundation.md` C8) | IMP-41 |
| D6 | Reader and Sorter confidence thresholds; shadow-then-trust rule | *Open* (AG-11 §13 Q11); *Proposed* (IMP-30) | — |
| D7 | Case spine (Case, Filing, Deficiency, Submission, Decision) | *Specified*, **not built** (AG-07 v2.7 §12) | — |
| D8 | Audit attribution of AI work | *Proposed* (IMP-2) | inventory X7 |
| D9 | Permission-scoped retrieval over packs and records for the expert | *Proposed* (IMP-20); the Finder is *Specified* (Doc 1 §8.8), release Unknown | — |
| D10 | Four AI Doers (Reader, Sorter, Drafter, Checker) | *Specified*, built but switched off per Phasing v1.4; SCOPE-TRIAGE proposes Release 2 (D4) | AG11-D4; AG-11-93 |
| D11 | Needs you inbox, autonomy levels, recipes | *Specified* (AG-11 §3.5, §3.13); AG-11 §12: engine "~55–60% foundation", no idempotency, no CASL gate today | D4 |

### 1.5 Cost-to-run drivers (general)

Model calls per page (Reader), per message (Sorter, Drafter), per case (Checker), per question (expert, capped per IMP-36); the reviewing person's minutes in Needs you (the real cost, not yet measured: `../wedge-recommendation.md`); pack content upkeep; encrypted storage of previews and logs (AG-11-98); the evaluation set from approved / edited / rejected counts (AG-11-63; IMP-29). All time-saved and cost words are **Assumption** until the W3b validation.

---

## 2. The catalogue

Fields: **Shape** · **Job** · **Works for** · **Replaces** (manual work today, cited to the inventory) · **Uses** (modules, Doers, recipes, by ID) · **New** (Proposal) · **Guardrails and approval point** · **Who has solved it (evidence)** · **Difficulty** · **Value** · **Cost drivers** · **Dependencies and risks** (with status markers) · **Why it sells** (Proposal wording; absolutes and legal words are labelled).

### 2.1 Group A. Building the file (the wedge family)

#### W-01 File Builder (the wedge, AIW-D17)

- **Shape:** Journey (retainer signed → file ready for review). Paired with W-24 for plain-words reasons.
- **Job:** from `envelope.signed` to a file that is "ready for your review": chases documents, reads them, proposes questionnaire values, cross-checks facts, keeps the checklist and a readiness report current, stops at the reviewer's sign-off.
- **Works for:** the case officer and the representative on the file. Priced per prepared file (Proposal; metering per IMP-18, IMP-19; a flat allowance first per the challenge review, AIW-D27).
- **Replaces:** the officer's loop in AG-07 v2.7 §3.4 (request, review, approve or reject with reason), AG-08 v1.7 §3.8 (needs-evidence worklist, verify facts, verify imported values), AG-09 v1.8 §3.8 to §3.9 (preview, verify, reject, waive, "please re-take"), Doc4 v1.3 CP-4 §3.5 (re-review of every re-upload), and the re-typing chain AG-08 v1.7 §1 describes. Inventory: `ag-frs-1.md` Part 1 AG-07 §3.4 (L136), AG-08 §3.8 (L154), AG-09 §3.8 to §3.9 (L168); `doc4-portal.md` CP-4 (L158).
- **Uses:** AG-07 §3.4 (Binder), §3.6 (Reviewer, Checker); AG-08 §3.6 to §3.8; AG-09 §3.14 (Reader); AG-11 §3.5 recipes "document-received acknowledgement + Review document task" and "missing-document chase" (AG11-D17 timings), §3.13 Needs you; AG-10 Mailer and Messenger; AG-15 §3.4 work items. Contains W-04 and W-07.
- **New (Proposal):** (a) one job-shaped run from `case.created` to a *readiness report*: every value, its source document, its confidence, every open deficiency, every message sent; (b) approvals per file, not per value, to stop Needs you flooding (IMP-34); (c) the per-file meter (IMP-18).
- **Guardrails and approval point:** G1 to G17. Reader approval is the verification and needs `agent/sqr:verify` (AG-9-45; AG-8-44). Checker output is warnings only (AG-7-61). The worker never fills a form (W-05), submits (G5), or exports (G16). **Chases:** template chases run at the recipe's autonomy; per G17 (IMP-28(c)) a template the firm marks as carrying status content defaults to "ask me first" when this worker sends it, unless the firm sets otherwise. **Approval point:** readiness report and internal review via `agent/case:review-approve` (AG-07 §3.6); values via `agent/sqr:verify`; chases via the recipe setting and AG11-D11. Per AIW-D26 the firm's role settings decide who.
- **Who has solved it (evidence):** VisaFlo's whole-file AI review is "coming soon", access by invitation (`visaflo.md` §11 item 3, §16 row 7, https://visaflo.ca/review); Clio has agents but no IRCC content (`field-scan.md` §7 item 8); nobody in the immigration niche publishes a price per AI task (`field-scan.md` §5; CaseEasy does publish a per-case portal-fill price, same table). **Partly solved; close rival; "nobody" is unprovable** (`../wedge-recommendation.md`).
- **Difficulty:** Medium on paper; **Hard today** because the case spine (D7) and pack content (D2) do not exist (review M-8).
- **Value:** the firm pays per file for junior-clerk work; revenue tracks caseload, not seats. Time saved: Assumption, measured in W3b.
- **Cost drivers:** Reader pages per file (AG-09 §3.14 groups), one Checker pass per change, chase messages, review minutes.
- **Dependencies and risks:** D1 Proposed; D2 Content; D4 Open (AG-07 §13 item 22 on Deficiency Library and Checker); D6 Open; D7 Specified not built; D8 Proposed; D10, D11 Specified. The readiness report is internal until a person decides what reaches the client: confirm with counsel / RCIC.
- **Why it sells (Proposal wording):** *A prepared file for a fixed price, every value traced to its document, approved by your named person.*

#### W-02 Deadline Guardian (the hook, AIW-D17)

- **Shape:** Task (standing). Paired with W-24 for "which files are at risk this week, and why".
- **Job:** watches every government, document and status deadline on every file; nudges the right person; escalates when the firm chose that; flags a slipping date.
- **Works for:** every file owner; Owner and Case Manager for escalation.
- **Replaces:** manual date-stamping and private date lists (AG-07 v2.7 §3.3), the failures AG-07 v2.7 §1 names, renewal follow-up on expiring documents (Doc4 v1.3 CP-4 §3.6). Inventory: `ag-frs-1.md` AG-07 §3.3 (L135); `doc4-portal.md` CP-4 §3.6 (L38).
- **Uses:** AG-11 §3.4 Minder; recipes "biometrics countdown" and "PR card / status expiry watch" (AG-11 §3.5; Phasing v1.4 R1); AG-13-65; AG-9-51 and AG-11-108 (letter deadlines after approval); AG-17-73; AG-14 §3.5; SA-3-35 (always on); AG-16 §3.10, §3.13.
- **New (Proposal, from the autopilot design §8, §18.1, §18.2, which marks its own values "NOT authoritative"):** a stateful obligation catalogue (dormant, armed, satisfied, lapsed, waived), validity keyed by type, program and residence class, derived dates (landing deadline from medical and passport validity), a hard-deadline class (ITA, COPR), a status-maintenance machine. All as pack content (AG-11 §3.12), ratified by the SME. Status: *Proposed* + *Content*.
- **Guardrails and approval point:** G1, G3, G6 (only letter reading is AI), G8, G10, G11, G17. **Approval point:** the file owner approves each extracted deadline (AG-9-51); template reminders run under the recipe's autonomy, with status-content templates defaulting to "ask me first" for worker sends (IMP-28(c)) unless the firm sets otherwise; escalation per Team safeguards (AG-16 §3.10).
- **Who has solved it (evidence):** VisaFlo's monitor is "launching soon" (`visaflo.md` §16 row 14, https://visaflo.ca/monitor). The founders' design (autopilot §1.3) names Clio's litigation "Court Rules" as the pattern it borrows; that is the founders' own framing, not field-scan evidence. **Unknown** whether any Canadian rival has a stateful obligation model; the field scan did not look for one.
- **Difficulty:** Easy as rules; **Medium today** (review M-8): the Minder is *Specified, not built* (AG-11-47) and the obligation catalogue is *Content, unauthored*.
- **Value:** the hook; low run cost (Assumption). Record-keeping value: the firm can show when it reminded whom (autopilot design §14). "The fear every consultant has" is **Assumption** until the W3b interviews.
- **Cost drivers:** messages; Reader on letters.
- **Dependencies and risks:** D2 Content (SA-01B §3.8); D5 Specified not built; D4 Open (Charter watcher decision, `foundation.md` C8); X3 escalation default conflict (IMP-41 adopts AG-11's). Values: confirm with counsel / RCIC.
- **Why it sells (Proposal wording; "never" is a design aim per AG-11 §3.4, not a warranty):** *Every IRCC deadline watched by design, and a record of every reminder you sent.*

#### W-03 Letter Reader (post-filing watcher)

- **Shape:** Task. Paired with W-24 ("what does this letter mean under the pack").
- **Job:** when a government letter arrives (upload, email, WhatsApp), proposes the milestone, the deadline, the task, a plain-language client notice and a response plan.
- **Works for:** case officers and the representative, after submission.
- **Replaces:** manual recording of AOR, biometrics, ADR and decisions (AG-07 v2.7 §3.7) and officer contacts (AG-17 v0.5 §3.6); the post-filing gap the autopilot design §18.3 calls the malpractice risk. Inventory: `ag-frs-1.md` AG-07 §3.7 (L139); `ag-frs-2.md` AG-17 §3.6 (L143).
- **Uses:** AG-09 §3.14 Reader group (b); AG-10 §3.2 Sorter (hands the attachment to the Reader, IMP-12); AG-07 §3.7; AG-11 triggers `case.milestone_reached`, `document.extracted`; post-decision playbooks (AG-07 §3.7); Drafter; Minder; Tasker.
- **New (Proposal):** letter-type to milestone mapping as pack content; a response-plan draft; the recipe "letter received → milestone + deadline + task + notice".
- **Guardrails and approval point:** G1 to G17; refusals are held for firm release (FDL v1.5 D-4; Doc4 CP-2 §3.5 open). **Approval point:** milestone and deadline by the file owner; decision via `agent/case:record-decision`; client notice via the AI-text setting (AG11-D11).
- **Who has solved it (evidence):** VisaFlo shows letter watching on its homepage; the monitor is not launched (`visaflo.md` §16 row 14). **Partly (announced, not live); Unknown elsewhere.**
- **Difficulty:** Medium.
- **Value:** the highest-risk period of a file. Assumption on time.
- **Cost drivers:** Reader per page; Drafter per notice; review minutes.
- **Dependencies and risks:** D1 Proposed; D2 Content (AG-07 §13 item 16); D5 Specified not built; D7 Specified not built; D10 Specified. Letter formats change. Response plans are advice: confirm with counsel / RCIC.
- **Why it sells (Proposal wording):** *Every IRCC letter becomes a dated task and a client update.*

#### W-04 Upload Reviewer (inside W-01; usable alone)

- **Shape:** Task.
- **Job:** on each clean upload: right type for the item, legible, not expired, matches the profile, translation or notarisation present when required; drafts the accept or reject reason in the client's language.
- **Works for:** case officers.
- **Replaces:** AG-08 v1.7 §3.6 and AG-09 v1.8 §3.8 to §3.9 (reject with reason), Doc4 CP-4 §3.5, AG-15-21. Inventory: `ag-frs-1.md` L152, L168; `ag-frs-2.md` L105; `doc4-portal.md` L37.
- **Uses:** Reader proposes the type (IMP-12); AG-09 §3.8 annotation, §3.3 type defaults; SA-01B §3.4 validity gates; AG-8-42 Checker; AG-15 §3.4; recipe "document-received acknowledgement".
- **New (Proposal):** one combined verdict; a bilingual reason library per pack (reasons are firm-owned, SA1B-D23).
- **Guardrails and approval point:** G1, G2, G6, G7, G12, G13, G17; verify stays the officer's act (AG-09 §3.9). **Automatic typing:** whether a high-confidence type may be applied without a person (AG-9-11 AUTO) is **pending Ranjan's reading of FD-16 (IMP-13)**; until then every type goes to review (AG-11 §3.10) and this worker assumes review. **Approval point:** `agent/case:document-manage` for the verdict; the client message via the AI-text setting, or, once the firm confirms the reason library as standard messages (AG-16 §3.12), under G17.
- **Who has solved it (evidence):** VisaFlo's AI document validation has been live since 2025 (`visaflo.md` §12). **Partly solved**; our difference is reasons tied to pack rules, in the client's language, audited.
- **Difficulty:** Easy. **Value:** the most frequent loop per file (Assumption). **Cost drivers:** Reader and Checker per document. **Dependencies:** D1 Proposed; D2 Content; D6 Open; D10 Specified; IMP-13 Open for Ranjan.
- **Why it sells (Proposal wording):** *Problems with an upload found on arrival, not at filing.*

#### W-05 Form Preparer (hard but worth it)

- **Shape:** Task (deterministic core; AI upstream and in review only).
- **Job:** assembles the form set, fills every box from verified values only, flags unmapped or unverified fields, routes four-eyes, produces fillable and flattened PDFs.
- **Works for:** case officers and the form approver.
- **Replaces:** AG-07 v2.7 §3.5 manual field review; staff uploading and e-signing forms by hand (SA-01B v1.2 §3.5); re-typing into PDFs (AG-08 v1.7 §1).
- **Uses:** AG-07 §3.5 Filler; AG-7-59, AG-7-60, AG-7-65; SA-01B §3.5 box maps and the deterministic filler (SA-01B §12); Checker (AG-7-61).
- **New (Proposal):** the orchestration (form set → fill → flag → four-eyes → flatten → attach); box maps for the first forms (Content). AI stays out of the fill path by rule (SA1B-D16; SA-1B-35; IMP-25). Portal autofill stays outside every worker until counsel answers IMP-40.
- **Guardrails and approval point:** G2, G5, G10, G16; four-eyes (AG-7-65). **Approval point:** `agent/case:form-approve`.
- **Who has solved it (evidence):** everyone (`field-scan.md` §4 row 2; `visaflo.md` §16 row 8). **Solved by rivals; we have none.** Our angle: every value traceable to a verified source and pack version, the reason it was parked (SA1B-D28).
- **Difficulty:** Hard: XFA unsupported (SA-01B §12, *Built engine refuses it*), box maps unauthored (*Content*), release undecided (AG-07 §13 item 22; proposals.md Filler row).
- **Value:** closes the biggest gap; inside the per-file price. **Cost drivers:** content, not model calls. **Dependencies:** D2 Content; D4 Open; D7 Specified not built; XFA route Unknown. Confirm with counsel / RCIC.
- **Why it sells (Proposal wording):** *Forms filled only from verified facts, with the source beside every box.*

#### W-06 Submission Letter Drafter

- **Shape:** Task. Paired with W-24 for the rule the letter addresses.
- **Job:** drafts letters of explanation, submission or cover letters and procedural-fairness responses from the verified profile, checklist and pack wording; a "facts used" footer lists every value and source.
- **Works for:** the representative.
- **Replaces:** writing from scratch or from the last client's file (the habit AG-05 v1.9 §1 describes). Not otherwise in the October files.
- **Uses:** the AI message writer (AG-10-15; AG-11 `draft_message`; its name is open under IMP-24); AG-09 §3.7; AG-12 merge fields; SA-01B §3.9 required wording.
- **New (Proposal):** letter types as pack templates with locked blocks and free sections; every factual sentence linked to a verified value. The June founders' spec names this use (`../inventory/foundation.md` Part 2a, L119); October specifies messages only (`visaflo.md` §16 row 10).
- **Guardrails and approval point:** G1, G2, G6, G7, G12, G13, G16. **Approval point:** the representative who files; the firm's AI-text setting decides who may approve (AIW-D26).
- **Who has solved it (evidence):** VisaFlo (`visaflo.md` §16 row 10), Visto's VistoBot (`field-scan.md` §3.3) and others (§4 row 1). **Solved; parity.** Our difference is traceability and no-promise.
- **Difficulty:** Medium. **Value:** hours per complex file (Assumption). **Cost drivers:** one model call per letter; review minutes. **Dependencies:** D1 Proposed; D2 Content; D10 Specified. Federal Court AI-content declaration (`field-scan.md` §6 item 9): confirm with counsel / RCIC.
- **Why it sells (Proposal wording):** *A first draft that cites its facts, in minutes, that you still own.*

### 2.2 Group B. Messages and words

#### W-07 Inbox Filer (inside W-01; usable alone)

- **Shape:** Task.
- **Job:** files every inbound email and WhatsApp on the right record, classifies the message, hands each attachment to the Reader for its type, queues anything uncertain.
- **Works for:** reps and case officers.
- **Replaces:** AG-10 v1.9 §3.2 (link unmatched, dismiss, create lead) and §3.5 (re-tag). Inventory: `ag-frs-2.md` AG-10 (L19, L22).
- **Uses:** AG-10 §3.2 Sorter (message match and classification), AG-10-12; **the Reader, not the Sorter, proposes the document type** (AG-10 v1.9 §13 Q12, decided AG11-D18(e); IMP-12); AG-2-60; AG-18-33.
- **New (Proposal):** none in mechanics; the hand-offs to W-03, W-08, W-09.
- **Guardrails and approval point:** AI-only matches never filed (AG-10 §3.2); no lead from an unknown number (AG-10-58); G6, G7, G8. **Approval point:** `agent/communication:resolve-unmatched`.
- **Who has solved it (evidence):** VisaFlo claims it live (`visaflo.md` §16 row 6). **Solved; parity.**
- **Difficulty:** Easy. **Value:** daily minutes (Assumption); precondition for W-03, W-09. **Cost drivers:** one Sorter call per message; Reader per attachment. **Dependencies:** D1 Proposed; D4 Open; D6 Open; D10 Specified; mailbox connection (AG-16 §3.4, *Specified*); WhatsApp provider (AG-10-43, *Open*).
- **Why it sells (Proposal wording):** *Every reply lands on the right file, with the attachment already named.*

#### W-08 Bilingual Writer

- **Shape:** Task.
- **Job:** drafts the firm's free-text client words in the client's language (replies, "please fix" notes, rejection reasons, stage updates) and the French of non-legal template text.
- **Works for:** case officers, reps, template owners.
- **Replaces:** Doc4 CP-7 §1 (read and reply), CP-3 §3.7, CP-4 §3.5; AG-12 v1.2 §3.6 (both languages by hand). Doc4 never says who writes firm French (`doc4-portal.md` Part 5 item 5, L158).
- **Uses:** AG-10 §3.3 AI message writer; AG-13 notes; AG-12 §3.2 missing-French filter; SA-05 §3.5 translation helper (allowed, open: SA-05 §13 Q5; AG-12 §13 defers it).
- **New (Proposal):** bring the non-legal translation helper into scope for firm free text; a "legal text" marker the worker refuses (proposals.md row).
- **Guardrails and approval point:** G2, G6, G7, G12, G13, G16, G17; stage labels are SME content (AG-15 §13). **Approval point:** the AI-text setting (AG11-D11) for client text; `agent/template:publish` for template French (AG-12 §3.7).
- **Who has solved it (evidence):** VisaFlo's 13 languages are client-side intake (`visaflo.md` §16 row 4). Firm free-text French: **Unknown; the research did not look for it.**
- **Difficulty:** Easy. **Value:** French-serving firms; otherwise modest (Assumption). **Cost drivers:** one model call per text. **Dependencies:** D1 Proposed; D4 Open; D10 Specified. Quebec language duties: confirm with counsel.
- **Why it sells (Proposal wording):** *Answer every client in their language without a second keyboard.*

#### W-09 Intake Assistant (gap asker and message-to-answer)

- **Shape:** Task. Paired with W-24 for why each fact is needed.
- **Job:** lists missing facts, drafts targeted questions, and proposes questionnaire answers from a client's free-text reply, for staff to approve.
- **Works for:** intake reps and case officers.
- **Replaces:** "please also send" emails (AG-08 v1.7 §1); the gap list worked by hand (AG-03 v1.4 §3.1); staff-on-behalf entry (AG-8-25). Inventory: `ag-frs-1.md` L148, L75.
- **Uses:** AG-03 §3.1 gap list; AG-08 §3.4, §3.11; AG-10 AI writer and Sorter; CP-3.
- **New (Proposal):** proposed answers from a message with provenance "proposed from message of <date>", approved like a Reader value (AG-8-41, AG-8-44 pattern). Doc 3 v1.4 AG-8 §3.11 blocks machine entry pending A4-1; proposal-only under the delegation record (IMP-1) resolves it.
- **Guardrails and approval point:** G1, G2, G7, G8, G13, G17; AG-8-23. **Approval point:** `agent/sqr:verify` for answers; the AI-text setting for outgoing questions.
- **Who has solved it (evidence):** VisaFlo announced it about 2 Oct 2026, not shown live (`visaflo.md` §16 row 6, https://www.linkedin.com/company/visaflo/). **Partly (announced, not live).**
- **Difficulty:** Medium. **Value:** fewer rounds with the client (Assumption). **Cost drivers:** one call per message. **Dependencies:** D1 Proposed; D3 Proposed; D6 Open; D10 Specified. Pre-retainer questions as advice: confirm with counsel / RCIC.
- **Why it sells (Proposal wording):** *Ask only what is missing, and let the client answer in a WhatsApp message.*

### 2.3 Group C. Front of the funnel

#### W-10 Lead Responder

- **Shape:** Journey (enquiry → booked consultation → proposal hand-off).
- **Job:** answers an enquiry in minutes with a consented, eligibility-grounded message, books the consult, recovers no-shows and cold leads, tells the rep the next move.
- **Works for:** intake and sales reps.
- **Replaces:** AG-02 v1.9 §3.6 to §3.7 manual follow-up and prioritising; AG-04 v1.5 §3.8 rebooking. Inventory: `ag-frs-1.md` L60, L61, L93.
- **Uses:** AG-02 §3.6 recipes (AG-2-57), §3.7, §3.13; AG-03 Qualifier; AG-04; AG-10 AI writer.
- **New (Proposal):** personalised wording from Qualifier levers (AG-3-24) under the disclaimer; AI replies to a lead's written questions.
- **Guardrails and approval point:** G8, G13, G17; AG-2-56. **Approval point:** the AI-text setting; template steps run under the recipe's autonomy.
- **Who has solved it (evidence):** general CRMs (the founders' design borrows the pattern, autopilot §1.3) and VisaFlo's lead agent (`visaflo.md` §16 row 1). **Solved; parity.** Difference: rules engine, consent, firm-only.
- **Difficulty:** Easy. **Value:** conversion (Assumption). **Cost drivers:** one call per personalised message. **Dependencies:** D1 Proposed; D4 Open (`doc3-firm.md` Part 5 on sequences in R1); D11 Specified; engagement scoring deferred (`foundation.md` C18). CASL class of each message: confirm with counsel / RCIC.
- **Why it sells (Proposal wording; "legally" removed, consent class is a counsel question):** *Every enquiry answered in minutes, with consent checked at every send.*

#### W-11 Consult Scribe and Proposal Drafter

- **Shape:** Task.
- **Job:** with consent, transcribes or reads the consult, drafts the consult record and proposal scope for the host, then hands to the template engine and Signer.
- **Works for:** the host and the sales rep.
- **Replaces:** AG-04 v1.5 §3.12 notes typed by the host; AG-05 v1.9 §3.1 to §3.3 template choice. Inventory: `ag-frs-1.md` L97, L106.
- **Uses:** AG-04 §3.12, AG-4-50, §3.6; AG-02 §3.12 recording (off by default, consent-gated); AG-05.
- **New (Proposal):** transcription and summary (no requirement exists: `visaflo.md` §16 row 3).
- **Guardrails and approval point:** G1, G6, G7, G13 (AG-04 BR-17), G16; AG-05 BR-3. **Approval point:** the host; the proposal via AG-5-17 approval-for-send.
- **Who has solved it (evidence):** VisaFlo lists AI meeting notes live (`visaflo.md` §16 row 3). **Solved; parity.**
- **Difficulty:** Medium. **Value:** Unknown until measured. **Cost drivers:** transcription minutes (a second provider under D1), one model call per record.
- **Dependencies and risks:** D1 Proposed (twice: text and speech providers, both Canada-only); D10 Specified; video room depth open (AG-04 §13 Q5); AG-04 §12 says reminders are not delivered in today's code (*Specified, not built*). Recording consent and storage: confirm with counsel.
- **Why it sells (Proposal wording):** *Finish the consult with the proposal already written.*

### 2.4 Group D. Money, corporate files and the long tail

#### W-12 Money Matcher

- **Shape:** Task.
- **Job:** proposes matches for offline payments, lists billable but unbilled work, drafts overdue reminders, and **prepares an internal list of trust-tagged items for the person who runs the accountant's export** (G16: a worker never exports and never writes a billing, payment or trust entry; IMP-23, IMP-27).
- **Works for:** Billing and Finance.
- **Replaces:** the failures AG-06 v1.7 §1 names; the manual reconciliation view (§3.4); the collections queue (§3.2). Inventory: `ag-frs-1.md` L119 to L124.
- **Uses:** AG-06 §3.2, §3.4, §3.5, §3.8; AG-13 §3.6; AG-14 §3.3; Biller, Mailer, Messenger.
- **New (Proposal):** AI-proposed payment-to-invoice matching (none specified: `ag-frs-1.md` Part 3 AG-06, L356); unbilled-work list; bank-statement import as a source (Unknown in requirements).
- **Guardrails and approval point:** AG-06 BR-11, §9, AG-6-43, AG-6-24; G16, G17. **Approval point:** the Billing user's own record-payment and issue keys; the export by its holder; client wording via the AI-text setting; template dunning is transactional.
- **Who has solved it (evidence):** bank matching exists in general accounting tools (Inferred); immigration tools export instead (`visaflo.md` §16 row 11). **Unknown in this niche; the research did not look for it.**
- **Difficulty:** Easy to Medium. **Value:** cash collected sooner (Assumption). **Cost drivers:** one call per unmatched line. **Dependencies:** D1 Proposed; AG-06 online rail *Specified, "effectively NEW"* (AG-06 §12); refunds Phase 2 (AG-6-23); trust posture open (proposals.md trust row). Confirm with counsel / RCIC.
- **Why it sells (Proposal wording; "nothing goes unbilled" is an aim, Assumption):** *Every e-transfer gets a proposed match, and unbilled work gets a list.*

#### W-13 LMIA Compliance Clerk

- **Shape:** Journey (employer set-up → advertising → quality check → submission record → worker tracking). Paired with W-24 on wage and advertising rules.
- **Job:** reads advertising proof and proposes channel entries, builds the candidate log from CVs or CSV, proposes the duties comparison, drafts the recruitment report and the outstanding-items message, prepares the inspection-pack list for the person who bundles it.
- **Works for:** corporate case officers and the sign-off holder.
- **Replaces:** AG-17 v0.5 §3.4 to §3.6, §3.8 manual logging, ticking, reporting and bundling. Inventory: `ag-frs-2.md` L141 to L145.
- **Uses:** AG-17 §3.2 to §3.8; SA-01B reference tables; Minder; Reader (new use); AI writer; AG-17-28, AG-17-82.
- **New (Proposal):** Reader on screenshots and CVs; a proposed duties comparison for the human tick (AG-17-32); the Needs you path for AG-17 (none today: inventory X5). **Excluded:** candidate screening or ranking: Doc 3 v1.4, AG-17 chapter, L8123 ("no sourcing/matching intelligence"; AG-17 v0.5 itself does not carry the phrase) and Founder Decisions Log v1.5 **FD-7** (light-evidence scope, no candidate identity plane). (Review M-1: the earlier "FD-7" quote attributed to AG-17 §13 does not exist; re-sourced here.)
- **Guardrails and approval point:** G1, G6, G7, G11, G16; AG-17-34. **Approval point:** `agent/case:review-approve`; retainers need an active licensed consultant (AG-17-74).
- **Who has solved it (evidence):** AG-17 v0.5 §1's own claim that rivals lack recruitment compliance and pre-submission checks rests on an internal 2026-09-27 scan **not verified in W1**; VisaFlo's evidence shows no LMIA module. **Unknown.**
- **Difficulty:** Medium. **Value:** higher fees; record-keeping exposure (the retention period is an ESDC value: confirm with counsel). **Cost drivers:** Reader per screenshot and CV. **Dependencies:** SA-01B row-and-line model *Specified, not built* (AG-17 §13); expert check of values *Content*; release conflict Open (AG-07 §13 item 22); D5 Specified not built. ESDC rules: confirm with counsel / RCIC.
- **Why it sells (Proposal wording):** *An LMIA file kept inspection-ready as you go.*

#### W-14 Lifecycle Keeper

- **Shape:** Journey (decision → next immigration moment → consented contact → new opportunity).
- **Job:** computes each client's next moment from pack rules (permit expiry, PGWP to PR, PR card, citizenship, residency obligation), drafts the consented re-engagement, opens an opportunity when a person clicks.
- **Works for:** Owner and intake reps.
- **Replaces:** nothing systematic (the autopilot design §18.3 "lifecycle dead-zones"); AG-02 v1.9 §3.10 manual reopen. Inventory: `ag-frs-1.md` L64.
- **Uses:** AG-11 recipe "PR card / status expiry watch"; AG-07 §3.7, §3.10; AG-02 §3.10, §3.11 (AG-2-47); Minder; AI writer; CP-8 consent.
- **New (Proposal):** W-02's catalogue extended past decision (autopilot design §8.1, illustrative); an off-by-default, consent-checked re-engagement recipe.
- **Guardrails and approval point:** G8 is the whole question (CASL class routed to SME in AG-10 §13; proposals.md row asks counsel); G16, G17; a person converts (AG-2-47). **Approval point:** the AI-text setting; the Owner switches the recipe on.
- **Who has solved it (evidence):** not found in `visaflo.md` §16 or `field-scan.md`; **Unknown** (absence not proven; the research did not look for lifecycle products).
- **Difficulty:** Easy to Medium as rules; **Medium today** (depends on the unbuilt Minder, D5). **Value:** repeat revenue at low acquisition cost (Assumption). **Cost drivers:** messages; one call per draft. **Dependencies:** D2 Content; D5 Specified not built; AG-2-59 consent rule *Specified*. CASL and closed-file contact retention: confirm with counsel / RCIC.
- **Why it sells (Proposal wording; "lawfully" removed, CASL is a counsel question):** *Your closed files become next year's clients, with consent checked first.*

#### W-15 Migration Mapper

- **Shape:** Journey (export → mapped → dry-run → confirmed → quiet → switched on).
- **Job:** proposes column, value and program mappings, pulls key dates from legacy notes, files old documents, hands the firm a dry-run.
- **Works for:** firm Owner or Admin; Expat Ready support in assisted migrations.
- **Replaces:** AG-18 v1.2 §3.2 manual mapping, §3.5 hand-filing, §3.6 value checks. Inventory: `ag-frs-2.md` L155, L158, L159.
- **Uses:** AG-18 §3.0 to §3.10; AG-18-10; AG-18-33; Minder.
- **New (Proposal):** AI-proposed column and value mapping (manual today: `ag-frs-2.md` Part 3 AG-18, L389); key dates from notes; a "could not map" report.
- **Guardrails and approval point:** AG-18 BR-1, BR-2, BR-3, BR-6, BR-8; AG-18-13, AG-18-36, AG-18-47; G16 (the worker never imports; a person confirms). **Approval point:** the Owner's attestation and confirm (AG-18-49); nothing client-facing.
- **Who has solved it (evidence):** VisaFlo imports from Drive and OneDrive (`visaflo.md` §16 row 16); mapped migration from Officio and CaseEasy: **Unknown**; our adapters await samples (AG-18 §13 Q20).
- **Difficulty:** Medium. **Value:** lowers our cost of sale (assisted migration free at launch, AG-18 §3.9). **Cost drivers:** one pass per header and note; Reader per document. **Dependencies:** D1 Proposed; D10 Specified; AG-18 engine *Built* for PARTY, DOCUMENT, NOTE only, no undo (AG-18 §12); AG-18-79 key *Open*; AG-18 §13 Q5 *Open*. Imported consent: confirm with counsel.
- **Why it sells (Proposal wording):** *Bring years of files across with every mapping proposed, and switch them on when you are ready.*

#### W-16 Privacy Clerk

- **Shape:** Task.
- **Job:** logs each access, correction, erasure or consent-withdrawal request on its clock, **prepares an internal draft of the response and a checklist of what the law stops**, reminds before the deadline. The export itself and the deletion are run by the Owner or DPO by hand (G16; IMP-23).
- **Works for:** the Owner and holders of `agent/data-export:request`.
- **Replaces:** Doc4 CP-8 §1 to §3.6 firm-side handling; AG-02 §3.14; AG-16 §3.5. Inventory: `doc4-portal.md` L48 to L51; `ag-frs-1.md` L68; `ag-frs-2.md` L122.
- **Uses:** CP-8 §3.2, §3.5, §3.6; SA-11 §3.8; AG-16 §3.5; AG-09 §3.12; Reminder.
- **New (Proposal):** triage and drafting; the what-the-law-stops checklist (SA-11 §3.8 honest-outcome rule).
- **Guardrails and approval point:** CP-8 BR-7, BR-8, §3.2; G16. **Approval point:** the Owner (export is Owner-only); identity checks stay human.
- **Who has solved it (evidence):** **Unknown**; the research did not look for it.
- **Difficulty:** Easy to Medium. **Value:** low frequency, high consequence (Assumption). **Cost drivers:** one call per request; negligible volume. **Dependencies:** SA-11 registers *Specified, not built* (SA-11 §12); clocks and purposes set with counsel (CP-8 §3.6; SA-11 §13); automated-decision review is FD-20 (Founder Decisions Log v1.5), with a Law 25 overlay still open (SA-11 §13 Q2 is about breach notification; review m-2).
- **Why it sells (Proposal wording):** *Every privacy request tracked on its clock, with the law's limits stated honestly.*

#### W-17 Case Briefer and Day Planner

- **Shape:** Task. The simplest pairing with W-24.
- **Job:** internal pickup summary per file, a leaver's handover list, and each person's ranked day with the reason beside each item. Internal only.
- **Works for:** every staff member; Case Managers.
- **Replaces:** AG-13 v1.12 §3.4 reading the timeline; AG-01 v1.16 §3.2 and AG-07 §3.8 handover and reassignment; AG-02 §3.7 deciding whom to call. Inventory: `ag-frs-2.md` L75; `ag-frs-1.md` L44, L140, L61.
- **Uses:** AG-13 §3.3, §3.4; AG-11 §3.13; AG-02 §3.7; AG-14 §3.4; AG-07 §3.8; AI writer.
- **New (Proposal):** the summary itself (none specified: `ag-frs-2.md` Part 3 AG-13, L340); an "AI-drafted" marker on notes (IMP-11 `aiGenerated`).
- **Guardrails and approval point:** AG-13 BR-4 note wall; G11; G9; G15; G3; G16. **Approval point:** the reader; `agent/note:share-with-client` is never used by it.
- **Who has solved it (evidence):** matter summaries are common in general practice software (`field-scan.md` §3 profiles); not immigration-specific. **Solved elsewhere; convenience, not a moat.**
- **Difficulty:** Easy; lowest exposure. **Value:** minutes per handover (Assumption). **Cost drivers:** one model call per brief or per day per person. **Dependencies:** D1 Proposed; D10 Specified; AG-13 timeline *Specified, "NEW"* in code (`ag-frs-2.md` L75).
- **Why it sells (Proposal wording):** *Pick up any file in minutes.*

#### W-18 Report Narrator

- **Shape:** Task.
- **Job:** a weekly plain-language note from the dashboards, quoting only computed numbers.
- **Works for:** Owner and Case Manager.
- **Replaces:** AG-14 v1.10 §1 manual review. Inventory: `ag-frs-2.md` L86.
- **Uses:** AG-14 §3.1 to §3.5, §3.9; AI writer; Mailer.
- **New (Proposal):** the narrative; anomaly alerts stay deferred (AG-14 §13).
- **Guardrails and approval point:** AG-14 BR-12, BR-2, BR-15; G16 (never exports). **Approval point:** the schedule owner.
- **Who has solved it (evidence):** common outside this niche. **Solved elsewhere.** **Difficulty:** Easy. **Value:** low. **Cost drivers:** one call per report. **Dependencies:** D1 Proposed; AG-14 aggregation layer *Specified, not built* (AG-14 §12).
- **Why it sells (Proposal wording):** *Your Monday numbers, explained.*

### 2.5 Group E. Expat Ready's own work (admin plane; never touches a client)

#### W-19 Pack Drafter

- **Shape:** Task (admin).
- **Job:** drafts box maps for a new form edition, diffs editions, proposes reference-table rows from official pages with source and date checked.
- **Works for:** Content Manager and Content Approver.
- **Replaces:** SA-01 v2.2 §1 and §3.13 manual authoring; form maps as manual specialist work (`doc2-admin.md` Part 3 item 12, L160); content not yet existing (`doc2-admin.md` Part 5 item 12, L276); the overdue-review queue (SA-1B-40).
- **Uses:** SA-01 §3.12, §3.13; SA-01B §3.5 to §3.7; SA-11 §3.9.
- **New (Proposal):** the already-permitted, deferred features SA-1B-33 and SA-1B-34 (SA-01B §0.3 Defer) brought into scope, plus reference-table drafting.
- **Guardrails and approval point:** SA-01 §3.12 two-person rule; SA-1B-35; SA-01B §3.6 source and review dates; G16. **Approval point:** the Content Approver; values by SME and founder (SA-01 §13).
- **Who has solved it (evidence):** **Unknown**; VisaFlo builds form automation by hand (`visaflo.md` §12).
- **Difficulty:** Medium to Hard (XFA: SA1B-D28). **Value:** our content cost; scale across countries (autopilot design §5). **Cost drivers:** model calls per form page; approver time. **Dependencies:** D2 Content; filler *Built but refuses XFA* (SA-01B §12); SA1B-D18, SA1B-D23 *decided against tests and library*. Values: confirm with counsel / RCIC.
- **Why it sells (internally; Proposal wording):** *A new IRCC form edition mapped in hours, checked by a person.*

#### W-20 Pack Tester

- **Shape:** Task (admin).
- **Job:** drafts sample clients with expected outcomes, runs the dry-run, explains version differences in plain words.
- **Works for:** Content Approver, Platform Owner.
- **Replaces:** SA-01 v2.2 §3.13 manual sample building; reviewer checks without test profiles (SA-01B §3.6). Inventory: `sa-frs.md` L76, L87.
- **Uses:** SA-1-52 dry-run; SA-01 §3.13 diff; AG-03 BR-18; Charter golden cases (`foundation.md` Part 4, L237); SA-11 §3.9; prompt change control and golden set (IMP-5).
- **New (Proposal):** AI-drafted sample sets and change notes; the engine decides every outcome (G10). Conflicts with SA1B-D18 (no rule tests).
- **Guardrails and approval point:** AI never scores. **Approval point:** the Content Approver.
- **Who has solved it (evidence):** **Unknown**; deterministic-model trust is an English regulator example only (`field-scan.md` §6 item 1).
- **Difficulty:** Medium. **Value:** proof that advice has not shifted (safety, not revenue). **Cost drivers:** model calls per program per version; approver time. **Dependencies:** D2 Content; dry-run *Specified* (SA-1-52), scoring engine *Built, generic* (SA-01 §0.3); SA1B-D18 a founder decision.
- **Why it sells (internally; Proposal wording):** *Prove every rule change before a firm sees it.*

#### W-21 Rule-change Watcher

- **Shape:** Task (admin). Paired with W-24 for the impact list.
- **Job:** watches the official pages a pack cites, flags changes, drafts the proposed pack change with a diff.
- **Works for:** Content Manager; indirectly every firm.
- **Replaces:** re-reading pages by hand (AG-17 v0.5 §3.1 keeps values current on canada.ca). Inventory: `ag-frs-2.md` L138.
- **Uses:** SA-01B §3.6 to §3.7 source and review dates; SA-01 §3.12, BR-3, §3.14; AG-03 §3.7 to §3.8.
- **New (Proposal):** entirely new; no web watching is specified (`visaflo.md` §16 row 14).
- **Guardrails and approval point:** never edits a pack; two-person publish; open files unchanged (Charter V2 journey J9); adoption by firm staff (SA-1-58); G16. **Approval point:** Content Approver.
- **Who has solved it (evidence):** VisaFlo's monitor ("launching soon") maps changes to cases directly (`visaflo.md` §16 row 14, https://visaflo.ca/monitor). **Partly (announced; a different design, not an unsolved problem).** Ours routes changes through reviewed packs.
- **Difficulty:** Medium. **Value:** content currency with a paper trail. **Cost drivers:** page fetches; one model call per changed page; content-team review time. **Dependencies:** D2 Content; SA-01B source fields *Specified, not built* (SA-01B §12 "No source, date-checked or next-review fields"); public pages only. Values: confirm with counsel / RCIC.
- **Why it sells (Proposal wording):** *When IRCC changes a rule, your pack changes after a person checked it, and your open files stay as they were.*

#### W-22 Support Triager

- **Shape:** Task (admin).
- **Job:** suggests category, priority and route; drafts the first reply from the bilingual knowledge base; drafts an article from each resolved ticket.
- **Works for:** Expat Ready Support (SA-07 v2.10: a 4 to 6 person team).
- **Replaces:** SA-10 v2.5 §1 manual triage and replies. Inventory: `sa-frs.md` L208 to L214.
- **Uses:** SA-10 §3.2 to §3.3 keyword hints (SA-10-7), §3.9, §3.10.
- **New (Proposal):** AI drafting; launch posture stays suggest-only (SA-10 §13 Q7, Q8).
- **Guardrails and approval point:** SA-10 BR-4; Immigration Content routes to the Content Manager; SA-2-17; AG-18-47; G16. **Approval point:** the support agent.
- **Who has solved it (evidence):** common everywhere. **Solved elsewhere; margin only.**
- **Difficulty:** Easy. **Value:** Expat Ready's support cost per firm; matters for margin as firms scale (Assumption). **Cost drivers:** one call per ticket; one per article. **Dependencies:** D1 Proposed; SA-10 routing and SLA engine *Specified, "NEW"* (SA-10 §12); stale `global/*` keys (`sa-frs.md` Part 5).
- **Why it sells (internally; Proposal wording):** *First reply in minutes, in both languages, by a person who only had to check it.*

#### W-23 Firm Health Watcher

- **Shape:** Task (admin).
- **Job:** watches firm health (over limit, trial ending, overdue, stalled setup, no logins) and drafts outreach.
- **Works for:** account managers and Billing.
- **Replaces:** SA-02 v2.19 §3.6 and SA-04 v2.14 §3.5 to §3.6 list-working. Inventory: `sa-frs.md` L108, L136.
- **Uses:** SA-02 §3.6; SA-03 §3.7; SA-04 §3.5 to §3.6; SA-09; AG-01 §3.6; Mailer.
- **New (Proposal):** drafting only; the AI never changes a firm's state (G16).
- **Guardrails and approval point:** SA-04 §3.5 to §3.6 goodwill rule. **Approval point:** the account manager.
- **Who has solved it (evidence):** generic customer-success tooling. **Solved elsewhere.** **Difficulty:** Easy. **Value:** low; churn prevention. **Cost drivers:** one call per outreach draft. **Dependencies:** SA-04 *Specified, "no part works on dev"* (SA-04 §12); SA-02 health lists *Specified, not built* (SA-02 §12).
- **Why it sells (internally; Proposal wording):** *No firm goes quiet unnoticed.*

### 2.6 Group F. The expert co-pilot and the role twins (AIW-D19, D24, D25)

#### W-24 Practice Expert (the expert co-pilot)

- **Shape:** Expert co-pilot. **Answers only, never acts; sources only; refuses without a source; Canada-only** (AIW-D25). The full rule set is IMP-20 (eleven rules) and IMP-21 (data minimisation); this entry does not restate them.
- **Job:** answers any staff question in context from the two sources IMP-20 allows: the published pack version in force for the firm's country, and the firm's own records that this user may see (the product's run and audit records are firm records). Examples: "Which of my files are at risk this week, and why?" (AIW-D19); "What does this client still need, and which rule says so?"; "Why did the Qualifier rank this program below the cutoff?"; "What did we promise this employer in the retainer?". Every answer lists its sources (pack section and version; record and field).
- **Works for:** every firm role within its own permissions; the Owner for firm-wide questions.
- **Replaces:** knowledge held in a senior consultant's head (AG-03 v1.4 §1); timeline reading (AG-13 §3.4); stalled-case hunting (AG-14 §3.2); reading the reasons the pack already carries (SA-1B-59; SA-01B §9). Inventory: `ag-frs-1.md` L74; `ag-frs-2.md` L75, L88; `sa-frs.md` L96.
- **Uses (read-only):** SA-01, SA-01B published packs (SA-01 BR-3); AG-03 breakdown and provenance; AG-07 §3.6; AG-11 §3.4 Minder, §3.9 run history, §3.13 Needs you; AG-13 timeline and audit; AG-14 under viewer scope; AG-06 money tab; AG-17 reference tables; the Finder (Doc 1 §8.8). No write Doer.
- **New (Proposal):** the question-answering layer; the permission-scoped retrieval index (D9); the citation format; the "no source, no answer" rule; a standing answer log in `AiRunLog`; cost caps (IMP-36). The founders' June spec names it as "AI copilot", not a Doer (`foundation.md` Part 3 item 6, L166); no October file specifies it (`doc3-firm.md` Part 3 AG-14). Staged: **v1** structured question shapes only (at risk this week, what is missing, which rule, what is waiting), answered from Minder, deficiencies, Needs you and pack rule text; **v2** free questions over documents and messages.
- **Guardrails and approval point:** G6, G7, G9 (IMP-21: Restricted fields never passed, only their status), G10 (**rule results it quotes are reproducible; its own wording is not promised identical**, IMP-37), G13, G15, G16. Never messages a client, changes a record or approves anything. **Approval point:** none for an answer to staff. Anything reaching a client goes through a task worker and that worker's approval point.
- **Who has solved it (evidence):** Visto's Copilot is live and trained on IRCC information (`field-scan.md` §3.3, https://visto.ai/); VisaFlo announced a sidebar assistant citing official sources and a per-firm knowledge vault (`visaflo.md` §12, §16 row 13). **Partly solved.** Not found in the evidence: answers from a *versioned, second-person-approved* pack (so the rule quoted is the same for every asker on that pack version and can be re-run from the version history, SA-11 §3.9) combined with the firm's *own records under the asker's permissions*. Unknown whether any rival enforces either.
- **Difficulty:** Hard (v2); Medium (v1). The challenge review names it the riskiest piece (hallucination, privacy, cost); AIW-D25 and D27 accept the limits.
- **Value:** adoption and retention across every role; inside the plan (AI plan gating open, AG-16-35; IMP-8).
- **Cost drivers:** retrieval plus one call per question; context size; capped per user per day and per firm per month (IMP-36); the least predictable cost.
- **Dependencies and risks:** D1 Proposed; D2 Content (pack reasons); D7 Specified not built; D9 Proposed; Restricted field set *Open for Ranjan* (FDL B-1; IMP-21). Automated-decision review is FD-20 (scoring only); whether a human-approved AI answer counts under Law 25 is IMP-33: confirm with counsel / RCIC.
- **Why it sells (Proposal wording):** *Ask your practice anything, and get the rule, the file and the reason, with the source.*

#### W-25 AI Case Processor (role twin: assistant to the case officer)

- **Shape:** Role twin: the recipes of W-01, W-03, W-04, W-07, W-08 and W-17 under one delegation (IMP-1, IMP-22) from a named case officer, using a subset of that officer's permissions; **paired with W-24 for answers** (the expert is not a component; it never acts). External wording: *assistant to the case officer*.
- **Job:** the persona's work in Overview v1.11 (Case Officer/Paralegal: collect documents, manage questionnaires, execute checklists, draft forms, log correspondence) across the officer's files, prepared for the officer's own approval and then the review sign-off.
- **Works for:** a named case officer and the representative.
- **Replaces:** the loops listed under W-01 (AG-07 §3.4, AG-08 §3.8, AG-09 §3.8 to §3.9, CP-4 §3.5), W-03 (AG-07 §3.7), W-04, W-07 (AG-10 §3.2, §3.5), W-08 (CP-7 §1, CP-3 §3.7) and W-17 (AG-13 §3.4), in one delegation instead of six switches. Inventory rows as cited in those entries.
- **Uses:** the union of its components; AG-01 §3.3 roles; AG-11 §3.13 as the single hand-off.
- **New (Proposal):** the subset per IMP-22 and the blocked list per IMP-23 (G16): `agent/case:document-manage`, `agent/sqr:*` except `verify`, communication drafting, `agent/task:*`; never the professional approvals. Seats and metering: per IMP-1 (AG-1-13 and SA-3-41 count only humans and invitations).
- **Guardrails and approval point:** G1 to G17; for four-eyes the preparer rule in IMP-1 applies, so neither the twin nor the officer it works for approves what it prepared (AG-7-65). **Approval point:** the delegating officer for internal actions (G4); the firm's role settings for client, form and filing output (AIW-D26); the approval record per IMP-17.
- **Who has solved it (evidence):** VisaFlo sells fewer hires with agents that own the flow (`visaflo.md` §12 item 1); Clio Work runs multi-step agents (`field-scan.md` §4 row 4). **Partly solved.** Delegation under one person's permission subset: not found in the evidence; Unknown.
- **Difficulty:** Hard (D3 plus every component). **Value:** the sentence firms and investors understand; priced through W-01, not per twin. **Cost drivers:** the sum of its components' model calls plus the officer's review minutes; no extra model cost for being a twin. **Dependencies:** D3 Proposed first; all component dependencies (D1, D2, D5, D7, D10, D11). Supervision rules and perception: confirm with counsel / RCIC.
- **Why it sells (Proposal wording):** *Give every case officer an assistant that prepares, and let your named person decide.*

#### W-26 AI Intake Clerk (role twin: assistant to intake)

- **Shape:** Role twin: the recipes of W-10, W-09, W-07 and W-11 under one delegation from a named intake rep; paired with W-24 for answers.
- **Job:** the persona's work (Overview v1.11, Intake/Sales): capture, de-duplicate, run the Qualifier, ask missing questions, book, chase, hand a complete profile and consult record to the host.
- **Works for:** a named intake rep and the host.
- **Replaces:** the rep's manual follow-up, prioritising and rebooking (AG-02 v1.9 §3.6 to §3.7; AG-04 v1.5 §3.8), "please also send" emails and gap-filling (AG-08 v1.7 §1; AG-03 v1.4 §3.1), unmatched-message linking (AG-10 §3.2) and consult notes typed by the host (AG-04 §3.12). Inventory: `ag-frs-1.md` L60, L61, L75, L93, L97, L148; `ag-frs-2.md` L19.
- **Uses:** AG-02, AG-03, AG-04, AG-08 (PQR), AG-10.
- **New (Proposal):** subset: `agent/prospect:*` capture and pipeline, `agent/assessment:run` but never override, review or share (AG-03 §10), `agent/booking:*`, drafting only; blocked list per IMP-23.
- **Guardrails and approval point:** G8, G13, G16, G17; conversion stays a person's act (AG-02 §3.5; AG-2-47). **Approval point:** the rep; the AI-text setting for lead messages; AG-3-38 for any shared summary.
- **Who has solved it (evidence):** VisaFlo's lead agent and chatbot cover the front door, applicant-facing (`visaflo.md` §16 rows 1, 2), which AIW-D11 rules out for us. **Partly solved.**
- **Difficulty:** Medium to Hard (D3). **Value:** conversion (Assumption). **Cost drivers:** the components' calls (one per personalised message, one per client message read, transcription minutes); low. **Dependencies:** D3 Proposed; D4 Open; D10, D11 Specified; engagement scoring deferred (`foundation.md` C18). CASL and pre-retainer advice: confirm with counsel / RCIC.
- **Why it sells (Proposal wording):** *Every enquiry qualified, asked the right questions and booked, before your rep's coffee.*

#### W-27 AI Billing Clerk (role twin: assistant to Billing)

- **Shape:** Role twin: the recipes of W-12 and the money part of W-18 under one delegation from a named Billing user; paired with W-24 for answers.
- **Job:** the persona's work (Overview v1.11, Accounts/Billing) as drafts and lists: invoice drafts from milestones, time and government fees; proposed matches; dunning; the aged-receivables note; **an internal list of trust-tagged items for the person who runs the export** (G16).
- **Works for:** a named Billing user and the Owner.
- **Replaces:** assembling invoices from milestones, time and expenses (AG-06 v1.7 §3.1), working the collections queue and manual reminders (§3.2), typing offline payments and reconciling unmatched ones (§3.4), and preparing the trust export for the accountant (§3.5). Inventory: `ag-frs-1.md` L120 to L124.
- **Uses:** AG-06; AG-13 §3.6; AG-14 §3.3; AG-05 §3.11.
- **New (Proposal):** subset: invoice *draft* only; never issue on its own, never record payment, never refund, never export (AG-06 BR-11; BR-2; IMP-23).
- **Guardrails and approval point:** AG-06 §9, BR-13, BR-14, AG-6-24; G16, G17. **Approval point:** the Billing user's issue and record keys; the export holder; the AI-text setting for client wording.
- **Who has solved it (evidence):** VisaFlo announced retainer-to-invoice automation under "Agents" (`visaflo.md` §12). **Partly**; reconciliation and unbilled-work detection not shown (Unknown).
- **Difficulty:** Medium. **Value:** cash (Assumption); the twin a solo practitioner may switch on first. **Cost drivers:** one call per unmatched line and per draft; low. **Dependencies:** D3 Proposed; AG-06 rail *Specified, "effectively NEW"* (AG-06 §12); trust posture *Open* (proposals.md trust row). Confirm with counsel / RCIC.
- **Why it sells (Proposal wording; the "never" is the blocked list G16, a Proposal for Ranjan to ratify):** *Drafts and matches prepared for you; money is only ever moved by a person.*

#### W-28 AI Pack Author (role twin, admin plane: assistant to the content author)

- **Shape:** Role twin: the recipes of W-19, W-20 and W-21 under one delegation from a named Content author (SA-07 v2.10 Appendix A roles); paired with W-24 for impact answers.
- **Job:** keeps a pack current as drafts: watches sources, drafts changes, maps and rows, builds golden cases and change notes, submits for the second person's approval. Can never approve or publish.
- **Works for:** the content team; indirectly every firm on the pack.
- **Replaces:** the Content Manager's authoring of every content value (SA-01 v2.2 §3.2), form uploads and bulk table uploads (§1, §3.13), sample-client building for dry-runs (§3.13) and re-reading official pages for currency (AG-17 v0.5 §3.1). Inventory: `sa-frs.md` L72, L74, L76; `ag-frs-2.md` L138.
- **Uses:** SA-01, SA-01B, SA-05 (non-legal bodies), SA-11 §3.9.
- **New (Proposal):** subset: pack draft and submit; never approve, publish, rollback (SA-01 §3.12). SA-07 has no route for a non-human staff account (`sa-frs.md` Part 3 SA-07, L444): D3 on the admin plane.
- **Guardrails and approval point:** SA-01 §3.12; SA-5-23; G12; G16. **Approval point:** Content Approver; values by SME and founder.
- **Who has solved it (evidence):** **Unknown**; no rival shows pack-as-data (`field-scan.md` §4 row 8).
- **Difficulty:** Medium to Hard. **Value:** content cost and country speed (autopilot design §6). **Cost drivers:** model calls per page watched, per form page and per program per version; approver time. **Dependencies:** D2 Content; D3 Proposed; XFA (*Built engine refuses it*); SA-01B source fields *Specified, not built*. Values: confirm with counsel / RCIC.
- **Why it sells (internally, investors; Proposal wording):** *A country pack kept current by an assistant, approved by two people, every change traceable.*

### 2.7 Where a task worker and the expert must work together

| Worker that acts | What W-24 adds | Why both |
|---|---|---|
| W-02 Deadline Guardian | the rule and date source behind "at risk this week" | Minder knows when; the expert says why, from the pack version pinned to the file |
| W-01 File Builder | plain-words reason for each deficiency and unverified value in the readiness report | reviewers read reasons, not codes (SA-1B-59) |
| W-03 Letter Reader | what a letter type means under the current pack and what usually resolves it | the Reader extracts; the expert grounds the response plan |
| W-06 Submission Letter Drafter | the exact rule and required wording, with pack version | stops the writer inventing a legal basis (G1, G10) |
| W-09 Intake Assistant | why each missing fact is needed (which gate or grid reads it) | questions a client understands; the rule stays traceable |
| W-13 LMIA Clerk | wage, advertising and refusal-area rows with source and date | every warning carries the table row that caused it |
| W-17 Case Briefer | the "why" beside each ranked item | a brief is only as good as its reasons |
| W-21 Rule-change Watcher | which firms, programs and open files a change would touch | materiality is judged by a person with the impact list |
| W-25 to W-28 role twins | answers for the twin's user, never actions | a twin that cannot say why will not be trusted or approved quickly |

---

## 3. Ranking: value against ease, with shape and the evidence column

Judgement (Proposal). **Value**: H = firm pays per file or it makes the firm money; M = clear time or risk; L = convenience. **Ease**: E3 Easy, E2 Medium, E1 Hard, **rated on what exists today** (review M-8), with the "on paper" rating in brackets where it differs. **Evidence of being unsolved** repeats the entry's own finding in kind: *Not found* (a cited absence), *Partly* (announced or adjacent), *Solved* (parity), *Unknown* (no evidence either way). No "Y" appears without a cited absence (review B-2). **Shape**: T task, J journey, R role twin, X expert.

| Rank | Worker | Shape | Value | Ease today (on paper) | Evidence of being unsolved | Build order | Note |
|---|---|---|---|---|---|---|---|
| 1 | W-01 File Builder | J | H | E1 (E2) | Partly: VisaFlo "coming soon", invitation-only (`visaflo.md` §16 row 7) | **1st** | Wedge. Includes W-04, W-07 |
| 2 | W-02 Deadline Guardian | T | H (hook) | E2 (E3) | Unknown: monitor announced (`visaflo.md` §16 row 14); stateful model not searched for | **2nd, with 1st** | Minder not built (AG-11-47); catalogue unauthored |
| 3 | W-24 Practice Expert v1 | X | H (adoption) | E2 (v1) / E1 (v2) | Partly: Visto Copilot live, VisaFlo assistant announced (`field-scan.md` §3.3; `visaflo.md` §16 row 13) | **3rd** (v1) | Answers only (D25) |
| 4 | W-03 Letter Reader | T | H | E2 | Partly: announced, not live (`visaflo.md` §16 row 14); Unknown elsewhere | 4th | After filing |
| 5 | W-14 Lifecycle Keeper | J | H (revenue) | E2 (E3) | Unknown: not found in the research; absence not proven | 5th | CASL check first; Minder |
| 6 | W-12 Money Matcher | T | H (cash) | E2 | Unknown: not searched for in this niche | 6th | Internal list, never an export |
| 7 | W-04 Upload Reviewer | T | M | E3 | Partly: VisaFlo validation live since 2025 (`visaflo.md` §12) | inside 1st | AUTO typing pending IMP-13 |
| 8 | W-07 Inbox Filer | T | M | E3 | Solved: VisaFlo live (`visaflo.md` §16 row 6) | inside 1st | Reader types attachments (IMP-12) |
| 9 | W-08 Bilingual Writer | T | M | E3 | Unknown: not searched for | 7th | French-serving firms |
| 10 | W-09 Intake Assistant | T | M | E2 | Partly: announced, not live (`visaflo.md` §16 row 6) | 8th | Proposal-only answers |
| 11 | W-25 AI Case Processor | R | H (story) | E1 | Partly: VisaFlo agents, Clio Work (`visaflo.md` §12; `field-scan.md` §4 row 4); delegation model not found | after 1, 3, 4 and D3 | First twin |
| 12 | W-15 Migration Mapper | J | M (sales) | E2 | Unknown: adapters not searched for | 9th | Cuts cost of sale |
| 13 | W-13 LMIA Clerk | J | H (corporate) | E2 (E1 today: SA-01B rows unbuilt) | Unknown: AG-17's own claim unverified | 10th | FD-7: no candidate screening |
| 14 | W-27 AI Billing Clerk | R | M/H | E2 | Partly: VisaFlo retainer-to-invoice announced (`visaflo.md` §12) | after 6 and D3 | Money only moved by a person |
| 15 | W-10 Lead Responder | J | M | E3 | Solved: CRMs, VisaFlo lead agent (`visaflo.md` §16 row 1) | 11th | Table stakes |
| 16 | W-26 AI Intake Clerk | R | M | E2 | Partly: applicant-facing agents exist (`visaflo.md` §16 rows 1, 2) | after 8, 11 and D3 | Firm-side only |
| 17 | W-05 Form Preparer | T | H | E1 | Solved by rivals; we have none (`field-scan.md` §4 row 2) | **hard but worth it** | XFA, box maps, parked |
| 18 | W-06 Submission Letter Drafter | T | M | E2 | Solved: VisaFlo, Visto, others (`visaflo.md` §16 row 10; `field-scan.md` §4 row 1) | 12th | Court AI-disclosure rule |
| 19 | W-17 Case Briefer | T | M | E3 | Solved elsewhere (general practice software) | 13th | Safest first switch-on |
| 20 | W-11 Consult Scribe | T | M | E2 | Solved: VisaFlo meeting notes (`visaflo.md` §16 row 3) | 14th | Recording consent |
| 21 | W-16 Privacy Clerk | T | M (risk) | E2 | Unknown: not searched for | 15th | Counsel sets clocks |
| 22 | W-18 Report Narrator | T | L | E3 | Solved elsewhere | last (firm) | Only if cheap |
| 23 | W-21 Rule-change Watcher | T | M (trust) | E2 | Partly: VisaFlo monitor announced, different design (`visaflo.md` §16 row 14) | admin 1st | Reviewed-pack route |
| 24 | W-20 Pack Tester | T | M (safety) | E2 | Unknown | admin 2nd | Proof |
| 25 | W-19 Pack Drafter | T | M (scale) | E1 | Unknown | **hard but worth it** | Permitted, deferred |
| 26 | W-28 AI Pack Author | R | M (scale) | E1 | Unknown | after 23 to 25 | Two-person rule |
| 27 | W-22 Support Triager | T | L/M | E3 | Solved elsewhere | admin 3rd | Margin |
| 28 | W-23 Firm Health Watcher | T | L | E3 | Solved elsewhere | admin last | Churn |

**Build order (Proposal, AIW-D27 "catalogue all, ship one"):** File Builder (with W-04, W-07) → Deadline Guardian → Practice Expert v1 → Letter Reader → Lifecycle Keeper → Money Matcher → Bilingual Writer → Intake Assistant → **AI Case Processor** once D3 exists and the components have pilot numbers → Migration Mapper → LMIA Clerk → AI Billing Clerk → Lead Responder → AI Intake Clerk → Submission Letters → Case Briefer → Consult Scribe → Privacy Clerk → Report Narrator → Practice Expert v2. Admin in parallel: Rule-change Watcher → Pack Tester → Pack Drafter → AI Pack Author → Support Triager → Firm Health Watcher. Form Preparer as its own track once XFA and box maps are decided. The first two depend on the Minder and the case spine being built (D5, D7): the order stands, the dates are the team's (AIW-D21).

---

## 4. Hard but worth it

| Worker | Why hard | Why worth it | What unblocks it |
|---|---|---|---|
| W-05 Form Preparer | XFA unsupported; box maps unauthored; parked; release undecided | every rival has it; the File Builder stops short without it | XFA route (Unknown), first box maps (D2), release call (D4), counsel on portal filling (IMP-40) |
| W-24 Practice Expert v2 | hallucination, privacy, cost (challenge review) | the feature every role uses daily | v1 first; permission-scoped retrieval (D9); Restricted field set (FDL B-1); pack reasons as content (D2) |
| W-25 AI Case Processor and the other twins | delegation and permission-subset model Proposed only (IMP-1, IMP-22, IMP-23); regulator perception | the sentence that sells; the investor's role twin | Phase B requirement; "assistant to the role" wording; counsel |
| W-19 Pack Drafter / W-28 AI Pack Author | XFA; content tooling; two-person rule | one engine, many packs | Canada content first; SA1B-D18 revisited |
| W-13 LMIA Clerk | SA-01B rows unbuilt; values unchecked; no agent-native path; FD-7 | higher fees; inspection exposure | SA-01B rows; expert check; founder confirmation of FD-7 for AI |
| W-21 Rule-change Watcher | materiality is human; sites change | the safe answer to VisaFlo's monitor | content capacity; pack source URLs (SA-01B §3.6, not built) |

---

## 5. Assumptions and questions

**Assumptions (for the Lead to carry into `../../assumptions.md`):** A-W2-1 delegated-session record (D3, D8; IMP-1, IMP-2). A-W2-2 AI rail with Canada-only terms recorded (D1; IMP-6, IMP-7). A-W2-3 Canada pack content arrives, including plain-words reasons (D2). A-W2-4 Release 1 keeps what the 7 Oct module files say (D4; AIW-D21). A-W2-5 time saved and cost words are measured, not assumed. A-W2-6 a role twin holds a permission subset of one named person and takes no seat; metered by work (now IMP-1 rules 2 and 3). A-W2-7 the expert's retrieval is permission-scoped server-side (G15, D9; IMP-20). A-W2-8 FD-16's "effect" excludes an internal, reversible, audited filing label (IMP-13), pending Ranjan.

**Proposals in `../../proposals.md` (AIW-D23):** role-twin permission subset and no seat; expert v1 question shapes and permission-scoped index; CASL class of lifecycle re-engagement; FD-7 confirmation for the LMIA clerk (re-sourced to FDL FD-7 per review M-1; the Lead corrected the proposals row); per-file metering vs SA-4-44; non-legal translation helper into scope; the rule that every entry names shape and approval key.

**Questions for Ranjan (deduplicated against the review's list of 22):**
1. File Builder per-value approvals: `agent/sqr:verify` holders for values, one review sign-off for the report (review item 14). Confirm.
2. Form Preparer: solve XFA (how), or sell the File Builder without forms first (review item 10).
3. Lifecycle Keeper: ask counsel now about CASL class (review item 15).
4. LMIA Clerk: confirm no candidate ranking or screening by AI (review item 16).
5. Admin-plane workers: in the investor story, or internal only (review item 17).
6. Expert v1 limited to structured question shapes before free questions over documents (review item 12).
7. Role twins: agree the no-seat, metered-by-work rule in IMP-1 (review item 5).
8. FD-16 reading on automatic document typing (IMP-13; review item 2): until answered, W-04 and W-01 review every type.

**For counsel / RCIC (collected):** the advice boundary for readiness reports, response plans, pre-retainer questions and expert answers; whether firm-set approvers meet supervision rules (the product never verifies a licence; IMP-15, IMP-17); CASL class of lifecycle and lead messages; recording consent for consults; Federal Court AI-content declarations; Law 25 treatment of human-approved AI drafts (IMP-33); DSR clocks and retention floors; trust-money posture; ESDC record-keeping periods; portal filling (IMP-40); all immigration values.

---

## 6. Summary (ten lines) and top five

1. Twenty-eight entries across the four shapes: 18 task, 5 journey, 4 role twins, 1 expert; 22 for firms, 6 for Expat Ready's own team. Each is a bundle of what the October requirements already specify plus a small, labelled new part; nothing existing is restated (AIW-D22), and where this file and `ws2-improvements.md` differed, the improvements now govern (exports and trust entries, Reader typing, AUTO typing pending FD-16, status-content templates at "ask me first", one delegation definition in IMP-1, two expert sources).
2. The guardrail layer is already written (G1 to G15, cited by ID) plus the Proposed hard limits and blocked list (G16, G17). Approval is by a named person under the firm's own role settings, licensed by default (AIW-D26); we never claim product-enforced licensed sign-off.
3. Wedge and hook stand, but rated on what exists today both are harder than they look on paper: the case spine and the Minder are specified, not built, and the pack content is unauthored (D2, D5, D7).
4. The expert co-pilot answers only, from the published pack version and the firm's own records under the asker's permissions (AIW-D25; IMP-20, IMP-21); rule results it quotes are reproducible, its wording is not promised identical (IMP-37). Build v1 third, with fixed question shapes.
5. Role twins are a delegation (IMP-1, IMP-22): a subset of one named person's permissions, never the professional approvals or the blocked list (IMP-23), "assistant to the role" externally. AI Case Processor first, after its components have pilot numbers.
6. Next by value: Letter Reader (post-filing), Lifecycle Keeper (repeat revenue), Money Matcher (cash). None has cited evidence of being unsolved: the research did not look for the last two; the first is announced by VisaFlo.
7. Parity items (Inbox Filer, Lead Responder, Submission Letters, Consult Scribe) are needed, not our edge; the edge is traceable values, versioned rules, the approval record and the hard limits.
8. Hard but worth it: Form Preparer, expert v2, the twins, Pack Drafter, LMIA Clerk, Rule-change Watcher.
9. Every dependency now carries Built / Specified / Proposed / Content; none is a reason to narrow the design (AIW-D21), all are reasons not to promise dates. Time saved and cost words are Assumption until W3b.
10. The admin-plane workers and the AI Pack Author make "one engine, many countries" true; they cost us, not the firm.

**Top five:** W-01 File Builder · W-02 Deadline Guardian · W-24 Practice Expert v1 · W-03 Letter Reader · W-25 AI Case Processor (hard but worth it).
