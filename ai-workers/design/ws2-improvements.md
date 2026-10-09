# Workstream 2 improvements: what is weak, missing or contradictory in the AI, Doer and Conductor requirements, and what to change

**Author:** ai-worker-designer (W2, step 2). **Date:** 9 Oct 2026; revised the same day after review W2 (`checks/review-W2-2026-10-09.md` M-9, M-10, M-11, m-1, m-2). **Status:** every "Proposed change" below is a **Proposal** until the named decider says yes. Ratified founder decisions (FD-n) are never changed here; where one should change, the item says so and leaves it to Ranjan.

**What this file is for.** Ranjan's direction (AIW-D14): carve out everything AI, Doer and Conductor from the Drive documents, then challenge it and improve it as our own product. Step 1 (the carve-out) is the reference index in `ws2-baseline/`. This is step 2: the complete list of what stops us from running AI Workers of all four shapes (task worker, journey worker, role twin, expert co-pilot; README §1, AIW-D19) and the fix for each.

**Rules followed.** No requirement is restated (AIW-D22): each item points to the requirement by ID, file, version and line as recorded in `ws2-baseline/A-*.md` and `B-*.md`, where every quote was machine-checked against `sources/drive-snapshot-2026-10-09/`; lines I cite that are not in the baseline were opened and read by me (AG-14 §4 L348–L402 and AG-14-22 L381; SA-02 L381–382; SA-03 L593; FDL L54 and L149; AG-11 L40 and L1168–L1191; AG-18 L848; SA-11 L291, L623–L624). Short quotes appear only where the exact words carry the point. Labels: **Proposal** (our change), **Assumption** (needed, unconfirmed), **Unknown** (no source either way), **Inferred** (our reading of a source). Legal and immigration values: **confirm with counsel / RCIC**.

**Plain English.** This file is written for a non-technical reader. Where developers will need the exact technical word, it appears once in brackets after the plain words, like this: a record of every call to an AI model (developers: `AiRunLog`). A few terms used throughout:

- *Doer*: one of the product's own single-job tools (the Mailer sends, the Reader reads, the Minder watches dates).
- *Conductor*: the engine that runs Doers when something happens (a lead arrives, a date gets close).
- *Recipe*: a ready-made automation: "when this happens, check these things, then do these actions in order".
- *Needs you*: the staff inbox where anything a Doer prepared waits for a person to approve, edit or reject.
- *Autonomy level*: per action, "send automatically", "ask me first" or "off". The *floors* are the actions that can never be set to "send automatically" (AI-written text to a client, a government form, a value written into the verified profile nobody has looked at).
- *AI run log*: the record of every call to an AI model: which Doer, which model, which version of the instructions, which record, what came back (developers: `AiRunLog`).
- *Approval item*: one entry in Needs you (developers: `ApprovalItem`). *Audit entry*: one line in the firm's permanent record of who did what (developers: `AuditLog`).
- *Verified profile*: the client's facts that a person has checked against a document.
- *AI Worker*: a job-shaped bundle of Doers and recipes that does one whole job a person does today, on behalf of a named person, stopping at a human sign-off.
- *Delegation*: the record that says which person an AI Worker works for and which of that person's permissions it may use. Defined once, in IMP-1; every other item refers to it.

---

## 0. The list at a glance

Severity: **Blocking** = no AI Worker of any shape can ship honestly without it; **Major** = a shape, a claim or a sale depends on it; **Minor** = tidy-up that prevents later confusion.

| ID | Plain title | Severity | Shapes | Who decides |
|---|---|---|---|---|
| IMP-1 | A named person behind every AI action: the delegation record | Blocking | all | Ranjan (FD-16 reading), Lead (detail) |
| IMP-2 | One record that says "AI prepared, person approved" | Blocking | all | Lead / team |
| IMP-3 | Retire the wait for "Doc-1 Amendment A4-1" | Minor | all | team |
| IMP-4 | AI log: one authoritative place, retention, export | Major | all | team; counsel on retention |
| IMP-5 | Instructions to the model, model choice and testing: who changes them, how they are checked | Major | all | Lead / team |
| IMP-6 | SA-08 has no AI provider entry and still forbids outside providers | Blocking | all | team (Sanjay owns SA-08) |
| IMP-7 | Canada-only (AG11-D15) vs SA-11's "non-Canadian with safeguards" | Blocking | all | Ranjan; counsel |
| IMP-8 | Platform emergency stop and what happens to waiting items | Major | all | team |
| IMP-9 | Plan gating: SA-03 says closed, AG-11 and AG-16 say pending; no AI usage measure | Major | all | team; Ranjan on pricing |
| IMP-10 | "Models get no tool access" vs a worker that operates the product | Blocking | journey, role twin | Lead |
| IMP-11 | Client notice and disclosure of AI-prepared content | Major | all | counsel / RCIC |
| IMP-12 | Reader or Sorter: who classifies documents | Major | task, journey | team |
| IMP-13 | AG-9-11 applies a document type on its own vs "everything to review" and FD-16 | Major | task, journey | Ranjan (FD-16 reading) |
| IMP-14 | Supervised-message routing: AG-16-47 vs AG-11-82 | Minor | all | team |
| IMP-15 | FD-22 (supervision rules in the Practice Pack) vs AG11-D11 (firm setting) | Major | all | Ranjan; counsel / RCIC |
| IMP-16 | Owner-approves wording in two forms; "widen" vs "switch off" | Minor | all | team |
| IMP-17 | Approval of AI Worker output: what the record must show after AIW-D26, and one proposed exception | Major | all | Ranjan (the exception), counsel |
| IMP-18 | Metering a prepared file: SA-4-44 says no add-ons | Blocking for the wedge | journey | Ranjan |
| IMP-19 | Per-seat vs per-file: FD-18 already allows metered add-ons | Minor | journey | Ranjan |
| IMP-20 | Expert co-pilot: limits in writing | Blocking for the co-pilot | expert co-pilot | Lead; counsel on wording |
| IMP-21 | Co-pilot and restricted personal data | Major | expert co-pilot | Ranjan; counsel |
| IMP-22 | Role twin: how it uses the delegation | Blocking for role twins | role twin | Lead (AIW-D24) |
| IMP-23 | What a twin may never do: the blocked list | Major | role twin, journey | Lead |
| IMP-24 | One name, one meaning: the Doer roster | Major | all | Ranjan (FD-8, names); team |
| IMP-25 | Is the Filler an AI Doer? | Minor | journey | team |
| IMP-26 | Instructions hidden in client content | Blocking | all | Lead / team |
| IMP-27 | The hard limits: what no worker may ever do | Blocking | all | Ranjan (ratify), Lead |
| IMP-28 | "Anything that reads as advice" is not a floor | Major | task, journey | counsel / RCIC |
| IMP-29 | AI performance measures for AG-14 | Major | all | Lead / team |
| IMP-30 | When is a Doer good enough to lower review? | Major | task, journey | Lead; Ranjan |
| IMP-31 | Which document wins on release | Major | all | Ranjan |
| IMP-32 | AG-11's decisions are Sanjay's, not ratified founder decisions | Major | all | Ranjan |
| IMP-33 | Human review of AI-assisted output that reached a client (FD-20 covers scoring only) | Major | task, journey | counsel |
| IMP-34 | Needs you will flood: approvals per file, not per value | Major | journey | Lead |
| IMP-35 | A worker run has no start, state or stop | Major | journey, role twin | Lead / team |
| IMP-36 | Spend caps per firm and per person | Major | all | Lead / team |
| IMP-37 | "Same input, same result" is true for rules, not for models | Major | all | Ranjan (wording) |
| IMP-38 | "AI Worker" as a name against FD-16's marketing rule | Minor | all | Ranjan; counsel |
| IMP-39 | Tamper-evident audit may move to Release 2 | Minor | all | Ranjan |
| IMP-40 | Portal autofill: is typing into a government website "submitting"? | Major | journey | counsel / RCIC; Ranjan |
| IMP-41 | Dependencies the hook and the wedge still have | Minor | journey, task | Ranjan (Charter), team |

---

## 1. Identity and the record

### IMP-1 A named person behind every AI action: the delegation record

- **Today.** FD-16 (FDL v1.5 L52): no AI identity of its own, no permissions of its own. AIW-D13 keeps it: an AI Worker acts on behalf of a named person. But no product source gives that a mechanism: Doc 3 v1.4 AG-8 §3.11 (L3623), AG-8-35 (L3703), AG-8 BR-17 (L3728), AG-11 §3.3a (L5194) and §13 (L5640) all wait for a "Doc-1 Amendment A4-1" that Doc 1 v1.3 does not contain (its A4 is about answer snapshots, L2990). Doc 1 §3 (L692, L714, L754): three separate sign-in groups (platform staff, firm staff, clients), no "acting for" field. SA-11-2 (L348): four kinds of actor, none for automation. AG-13 audit entry (L487): a single "who" field. AG-11 approval item "prepared by" (L877) is empty when an automation ran; AG-11-81 (L680) and Agent Phasing glossary (L69): the Filler "counts as no person". See `A-identity-and-on-behalf.md`.
- **What is wrong or missing.** AIW-D13 cannot be evidenced. Nothing records *which person* a worker acted for, *which permissions* it used, or *which run* produced an item. Under the "counts as no person" rule a worker's draft could be approved by anyone, including the person it worked for, with no trace that it was delegated work. The four-eyes rule on forms (AG-11-81) has nothing to key on.
- **Proposed change (Proposal). The delegation, defined once here.** A delegation is one record, and it is not an identity. It says: *which worker (name and version) · for which one named firm user · which of that user's permissions it may use (always a subset, never more) · on which files or recipes · from when until when · who set it up · its state (active, paused, ended)*. Rules: (1) it is **granted by the named person it works for**; the Owner may set one up for that person, but it takes effect only when the person accepts it, and the person can end it at any time; (2) **one delegation per person per worker**; (3) a delegation **takes no seat** and is metered by the work it does, not per delegation (this matches the catalogue's assumption A-W2-6); (4) it ends by itself when the person is deactivated or suspended (the same rule that stops automations acting for a deactivated user, AG-11-45, AG1-D4), when the firm's AI switch goes off, or when the platform's emergency stop trips (IMP-8); (5) the worker can **never hold an approval permission**: every approval is made by a person. Every action, approval item and AI run carries the delegation's reference number. Each audit entry gains two things: whether a person acted directly, a worker acted for them, or a plain automation ran; and, if a worker, which delegation (developers: `mode = PERSON | DELEGATED | AUTOMATION`, `delegationId`). The actor on the entry stays the named person (the existing "firm staff" kind); no new kind of actor is added, so FD-16 holds. For four-eyes and self-approval rules, **the person the worker worked for counts as the preparer** (replacing "counts as no person" for worker-prepared items; the Filler rule stays for plain automations). IMP-22 says what is specific to role twins; it adds no second definition.
- **Why it matters.** User: sees "prepared by File Builder for Priya Shah, approved by Daniel Roy" on every item. Investor: FD-16 kept and provable. Regulator: a named person is answerable for every step, and the record shows it.
- **Risk if not fixed.** The core claim of the whole workstream ("acts on behalf of a named person") is a sentence with no record behind it; the reviewer flagged this (review W1 M-7, inventory X7).
- **Who decides.** Ranjan confirms that a delegation record is consistent with FD-16 (we say it is: no identity, no permissions of its own). Lead designs the detail (Phase B). Whether the on-behalf person counts as preparer: Ranjan (it tightens four-eyes).
- **Shapes.** All four.

### IMP-2 One record that says "AI prepared, person approved"

- **Today.** The AI run log (AG-11 §7 L878) records the Doer, model, instruction version and record, with optional links to the automation run and action; it has no approver and no person. The approval lives in the approval item or the audit entry (L877), or only in the audit entry when a person approves inline while working. AG-08's record of where each fact came from (L507) has a "Reader proposed, person approved" value for Reader values; nothing equivalent exists for Drafter text or Checker findings. AG-10 marks AI-written text on the message itself (L545). AG-16-39 (L473): the firm's data export includes the approval history, not the AI run log. See `A-ai-logging-and-audit.md`.
- **What is wrong or missing.** The join between "the model proposed this" and "this person approved it" is indirect and optional. A firm cannot answer "show me every AI-prepared item on this file and who approved each" from one place; neither can we for an investor demo.
- **Proposed change (Proposal).** (a) The AI run log gains a link to the delegation (IMP-1) and to the approval decision, whether that decision is an approval item or an inline audit entry; the link to the run becomes compulsory whenever a worker made the call (developers: `delegationId`, `approvalItemId`, `auditLogId`, `runId` required). (b) The approval item gains the list of AI runs that produced it and the delegation that prepared it. (c) One read-only view per file, the **AI provenance view**: every AI-prepared item, its run, its sources, the approver, the decision (approved, edited or rejected) and the before and after. (d) The AI run log and this view join the firm-data export (AG-16-39) and the client's own data package where the item reached the client. (e) The File Builder's readiness report is built from this view.
- **Why it matters.** This is the product fact investors can be shown and regulators can be given. It is also the evidence base for every measure in IMP-29.
- **Risk if not fixed.** "Audit trail" becomes a claim rivals also make (review W1 M-3) with nothing distinctive behind it.
- **Who decides.** Lead / team.
- **Shapes.** All four (for the co-pilot: every answer is a run with sources; see IMP-20).

### IMP-3 Retire the wait for "Doc-1 Amendment A4-1"

- **Today.** Doc 3 v1.4 waits for a non-human identity (L3623, L3703, L3728, L5194, L5640). AG-11 v1.11 is silent on who the actor is for engine actions, where Doc 3 used "the platform's automation principal" (an identity for the engine). FD-16 rules such an identity out.
- **What is wrong or missing.** A condition that can never be met is still written into the firm-side requirements, so a developer may build either a non-human identity (breaking FD-16) or nothing.
- **Proposed change (Proposal).** Replace each wait with a pointer to the delegation (IMP-1) for workers and the "plain automation ran" marker for recipes. No change to Doc 1's sign-in groups.
- **Why it matters / risk.** Removes an open door to breaking a ratified decision. Minor on its own; blocking combined with IMP-1.
- **Who decides.** Team (document owners). **Shapes.** All.

### IMP-4 AI log: one authoritative place, retention, export

- **Today.** The model and instruction version are stored in three places: the AI run log (L878), the Reader's extraction record (AG-09 L630) and the Sorter's result record (AG-10 L546). Retention is interim: AI run log 1 year, approval items 2 years after decision (AG-11-98 L712), "pending SA-11"; SA-11 v2.7 has no AI data category and no AI retention row (AG-11 §0.2 L54). Expat Ready staff audit entries are kept at least 7 years (SA-11 SA7-X5 L28). AG-9-48 (L545): the Reader's log carries no file content or extracted values, while the AI run log keeps a *reference* to the output.
- **What is wrong or missing.** Three copies with no rule on which is authoritative; a one-year AI log beside multi-year audit and professional record-keeping duties (confirm with counsel / RCIC); with no SA-11 category, the data-residency declaration (SA-8-31) cannot show where AI logs live.
- **Proposed change (Proposal).** The AI run log is the single authoritative record of a model call; the other two records hold only its reference number. SA-11 gains an "AI processing" data category with its own retention row; the interim retention should at least match that of the record the AI touched (a form's record, a client file), not one year. Values: confirm with counsel. The "output reference" is defined as a pointer to the proposal record, never a copy of the extracted value (this closes the AG-9-48 ambiguity).
- **Why it matters / risk.** A firm asked by its regulator for the history of a file two years on would find the AI steps gone. **Who decides.** Team; counsel on values. **Shapes.** All.

### IMP-5 Instructions to the model, model choice and testing: who changes them, how they are checked

- **Today.** AG-11 §11 (L1180): the instructions given to the model (developers: prompts) "are versioned and logged". AG-11 §11 (L1170): the provider can be swapped behind the Doer's fixed interface. Nothing on who may change an instruction, how a change is reviewed, or how a model change is tested. No accuracy measure exists (A-ai-doers.md gaps). SA-01B keeps a "second person checks" rule for pack content (recorded in the `B-*` files; Inferred as the nearest pattern).
- **What is wrong or missing.** The instructions and the model choice decide what every AI Doer and worker does, yet they sit outside the product's own change control. "Same input, same result" (IMP-37) cannot be defended if an instruction can change silently.
- **Proposed change (Proposal).** Treat model instructions and model settings as **platform content** on the admin plane, like pack content: every change is a new version; only a named platform role may change them; a second person approves before a version goes live; each version is tested before going live against a **fixed test set** of documents, messages and cases with known right answers, per Doer and per pack, with the pass rate recorded (developers: a golden set); a model or provider change is a new version and reruns the test set; the version number appears in every AI run log entry; the previous version can be restored in one click. The same test set drives the "shadow mode" of IMP-30 (proposals shown beside a person's own entry, nothing applied).
- **Why it matters / risk.** Investor: a testable AI layer. Regulator: a change in behaviour is traceable to a version and a test. Without it a bad instruction reaches every firm at once. **Who decides.** Lead / team. **Shapes.** All.

---

## 2. Provider, residency, switches and gating

### IMP-6 SA-08 has no AI provider entry and still forbids outside providers

- **Today.** AG11-D14 (L43), AG-11-3 (L554), AG-11 §13 Q19 (L1275, decided by Sanjay 5 Oct): outside providers are allowed for AI/OCR (reading text from images), WhatsApp and mailboxes, each approved by Super Admin in SA-08. SA-08 v2.2 (2 Oct): "NO third-party product-tool integrations" (L23), "no fourth shape" (L163), BR-1 (L419); the list of outside services (developers: rails) has no AI or OCR entry (L23); SA-8-27 health monitoring and SA-8-31 residency declaration per outside service. AG-11 §0.2 (L53) marks SA-08 as Pending. Review W1 M-6.
- **What is wrong or missing.** The AI switch is locked "until SA-08 / SA-11 record a provider" (AG-11-93), and SA-08 has no place to record one. By its own words, SA-08 would reject the requirement that unlocks AI.
- **Proposed change (Proposal).** Add an entry type to SA-08: **AI model and OCR provider**: provider name, contract reference, processing region, no-training and no-retention terms (both, matching AG-11; AG-16 L577 says only "no-training"), approval date and approver, health fed by real call outcomes (SA-8-27 pattern), and a feed into the residency declaration (SA-8-31). Reword L23, L163 and BR-1 to "no third-party *product-tool* integrations; approved *processing providers* for AI/OCR, WhatsApp and mailboxes only (AG11-D14)". Record the actual provider and region chosen before any firm switches AI on (AIW-D27).
- **Why it matters / risk.** Nothing AI can be switched on, for any firm, until this exists. The founders' earlier code called a US endpoint with no region setting (code fact, `A-ai-switch-provider-residency.md` L124–125; W1 evidence E6); without an entry the same thing can happen again. **Who decides.** Team (SA-08 owner); the provider choice itself is a founder call (AIW-D27). **Shapes.** All.

### IMP-7 Canada-only (AG11-D15) vs SA-11's "non-Canadian with safeguards"

- **Today.** AG11-D15 (L44), AG-11-73 (L660), AG-11-93 (L701), BR-37 (L766), AG-16 §3.9 (L335): Canada only. SA-11 §3.6 RES2 (L269) and SA-11-21 (L373): non-Canadian processors allowed with documented safeguards. SA-11-20 (L372): the residency declaration lists storage locations only, not processing. SA-08 Q1 (L629): per-country routing "Phase-3".
- **What is wrong or missing.** Two rules for the same data. The looser one sits in the governance document a regulator or buyer would read. Whether a Canada-region option exists at the chosen provider is **Unknown** (challenge review: do not assume one exists).
- **Proposed change (Proposal).** SA-11 gets an "AI processing" category with the stricter rule: Canada only, no safeguard exception, and the declaration shows the AI processing region. Keep the general RES2 rule for other outside services. Add one honest fallback in writing: if no Canada-region option exists for the chosen model, AI stays locked off (AG-11-93 already does this) rather than quietly using safeguards. Legal sufficiency of Canada-only, and whether it is required at all: confirm with counsel.
- **Why it matters / risk.** "Data hosted in Canada" is a visible competitor claim: the VisaFlo homepage footer read "VANCOUVER, BC · DATA HOSTED IN CANADA" when the reviewer opened https://visaflo.ca/ on 9 Oct 2026 (review W1 m-3; not in `research/visaflo.md`, which recorded Burnaby only). A buyer who reads SA-11 would find our promise weaker than our module file. **Who decides.** Ranjan (the promise), counsel (the law). **Shapes.** All.

### IMP-8 Platform emergency stop and what happens to waiting items

- **Today.** AG-11 §3.10 (L468), AG-16 §3.9 (L335), AG-16-35 (L469): a platform-wide off switch for the AI Doers is "pending SA-12". SA-12-12 (L361): a generic platform-level emergency stop with a mandatory reason (developers: a `killSwitchEligible` flag); SA-12 §3.4 (L235) pauses work in progress; SA-12-26 (L389): no switch may disable an audit control. No AI switch is named. AG-16 §9 (L704, L713) and §13 Q7/Q9 (L851, L853): what the Owner sees when terms are withdrawn, and what happens to items waiting in Needs you, are open; AG-16-37 (L471): waiting items are never executed because of the change.
- **What is wrong or missing.** The emergency stop everyone will ask about ("what if the model misbehaves?") is a pending note. AI Workers need stops at three levels (platform, firm, one worker) and the Doer switch covers one.
- **Proposed change (Proposal).** (a) Define the SA-12 switches: one for all four AI Doers and one per AI Worker, each an emergency stop at platform level with a mandatory reason; (b) tripping one pauses queued AI jobs and ends running delegations at the next safe point (never in the middle of a send); (c) items already waiting in Needs you stay visible and approvable by a person, marked "AI paused by Expat Ready on <date>: <reason>", because they are proposals a human still owns; a separate platform action, **withdraw AI proposals**, exists for a safety recall and is audited per item; (d) the Owner sees a banner and the settings screen shows the state with the reason; (e) the firm's own switch (AG-16-35) and a per-worker firm switch sit below it. Closes AG-16 Q7 and Q9.
- **Why it matters / risk.** Investor and regulator question number one. **Who decides.** Team. **Shapes.** All.

### IMP-9 Plan gating: SA-03 says closed, AG-11 and AG-16 say pending; no AI usage measure

- **Today.** SA3-D3 (L42): the product map (the Super Admin's master list of every switchable feature) closes AG-11's question about plan tiers. AG-11 §0.2 (L56), §13 Q8, AG-11-39 (L616), AG-16 §13 Q7 (L851): AI plan gating pending. SA-03 §11 (L593): a new metered measure is configuration, not a code change. FD-16 (L52): AI features are capabilities in the Capability Registry (developers: `cap.ai.*`), plan-gated, opted into per firm; Doc 1 §1.12 (L312): the Doer list has no Reader, Sorter or Checker, and no AI capability is defined. Doc 1 §1.12 (L294) "one capability, one toggle" vs AG-16-35 "no per-Doer setting".
- **What is wrong or missing.** Two layers disagree on whether AI gating is decided, no AI item exists on the product map, no AI usage measure exists, and FD-16's capability model was never applied.
- **Proposed change (Proposal).** Keep the one firm **consent** switch (AG-16-35) as a consent act, not an entitlement. Put AI on the product map as items (SA-3-31): the four AI Doers as one item, each AI Worker as its own item, the co-pilot as its own item; each off on existing plans until added (SA-3-38). Add usage measures as SA-03 limit rows: model calls, pages read, prepared files, co-pilot questions. This satisfies FD-16, Doc 1's one-toggle rule and AG-16's one consent switch at once.
- **Why it matters / risk.** Without product-map items, no AI Worker can be sold, limited or switched off per plan; without usage measures, no per-file price (IMP-18). **Who decides.** Team for the mechanism; Ranjan for which plan gets what (FD-18 cells are open). **Shapes.** All.

### IMP-10 "Models get no tool access" vs a worker that operates the product

- **Today.** AG11-D13 (L42), AG-11-94 (L702), AG-10-54 (L442), AG-10 BR-27 (L481), AG-11 §11 (L1180): client content is data, never instructions; "models SHALL have no tool access"; what a model returns is treated as untrusted, checked against a fixed expected shape, never executed. Written for the four Doers. README §1: an AI Worker "operating Expat Ready itself" through its screens and Doers. `A-ai-switch-provider-residency.md` gap: a worker with hands would be a model with tool access by design; no source addresses this.
- **What is wrong or missing.** The workstream's picture of the worker (a model that clicks through the product) contradicts the product's strongest safety rule. If we build the picture literally, we lose the rule; if we keep the rule, we must say what a worker actually is.
- **Proposed change (Proposal).** Define the shape once: **an AI Worker is a recipe, not a model with hands.** The Conductor runs it as an ordered set of product actions from the fixed menu of actions the engine already knows (AG-11-2, extended as needed), each under its autonomy level and floors. Model calls inside it are plain Doer calls (Reader, Sorter, Drafter, Checker, and the co-pilot's answer call): no tools, output checked against a fixed expected shape, treated as untrusted. Where a worker needs a "decision" (which document to chase next, whether a file is ready), that decision is a rule over the product's own data, or a model proposal that a rule checks and a person approves; a model never selects which action runs. Every new worker is specified as triggers → conditions → actions, exactly like a recipe, and is tried in rehearsal mode (AG-11-29 dry-run: shows what it would do, does nothing) before it is enabled. This keeps AG-11-94 intact for all four shapes, including role twins. A twin is a bundle of recipes under one delegation (IMP-22), not a browsing agent.
- **Why it matters.** This is the difference between "governed AI" and the rivals' "agent that watches and interrupts" (field scan: Clio pattern). It is also what makes same-input-same-result true for every step that is not a model proposal (IMP-37).
- **Risk if not fixed.** The product's own security rule would forbid the product's headline feature; an investor's technical adviser finds it in an afternoon.
- **Who decides.** Lead. **Shapes.** Journey workers and role twins above all; applies to all.

### IMP-11 Client notice and disclosure of AI-prepared content

- **Today.** AG11-D13 (L42), AG-11-93 (L701): "the product supplies client-notice wording the firm may use"; the wording exists nowhere. AG-16 §3.9 (L335): "ExpatReady is the data processor". FD-16 (L52): marketing may say "AI-assisted", never that AI decides; the origin is recorded on any AI-assisted artifact. AG-10 marks AI-written text on the message (L545). FD-20 (FDL L56): a client may ask a named person to review an automated *eligibility* result; "counsel confirms wording, not mechanism". SA-11 v2.7 mentions Quebec's Law 25 only for breach notification (L291, §13 Q2 L623) and data-request deadlines (§13 Q3 L624); whether Law 25's rules on automated decisions apply to a human-approved AI draft is **Unknown** in the sources (an earlier inventory line attributed it to SA-11 Q2; that was wrong, review W2 m-2). Nothing says whether a client is told that a message, a letter or a form they receive was AI-prepared and human-approved.
- **What is wrong or missing.** Three legal questions with no owner: the processor notice; whether and how clients are told; whether an approved AI draft counts as an "automated decision" under Quebec or federal privacy law. The Federal Court's declaration rule for AI-generated content in filed material (`research/field-scan.md` §6 item 9, secondary sources) touches the Submission Letter use case.
- **Proposed change (Proposal).** Counsel drafts: (a) the client notice (two languages; legal copy is never machine-translated, AG-12-24, SA-5-15); (b) a disclosure rule for client-facing AI-prepared items (recommended default: the item carries "prepared with AI assistance and approved by <name>" in the firm's record and, where the firm chooses or the law requires, in the message); (c) a position on Law 25 and PIPEDA for human-approved AI drafts. The product keeps the "AI-written" marker on every artifact (messages, letters, form drafts, values), not only on messages.
- **Why it matters / risk.** A firm that cannot answer a client's "did a computer write this?" with a record is exposed, and so is our investor story. **Who decides.** Counsel / RCIC; Ranjan on the default. **Shapes.** All; the co-pilot only if its answers are copied to clients (then the AI-text floor applies).

---

## 3. The contradictions carve-out A logged

### IMP-12 Reader or Sorter: who classifies documents

- **Today.** AG-10 §13 Q12 (L814), decided 5 Oct: the Reader classifies documents. AG11-D4 (L33), AG-11-67 (L654), AG-10-37(c) (L419), Agent Phasing glossary (L54): the Sorter files attachments "with a document type". AG-9-11 (L484), AG-09 §3.1 (L204), AG-18-33 (L379): the Reader proposes the type.
- **What is wrong or missing.** Two Doers own the same decision; whichever is built, the other's requirement is wrong, and a worker that relies on the type (Upload Reviewer, Inbox Filer, File Builder) cannot be specified.
- **Proposed change (Proposal).** One sentence in AG-11 and AG-10: **the Sorter classifies messages and proposes the file; it hands every attachment to the Reader, which proposes the document type.** Update AG11-D4, AG-11-67, AG-10-37(c) and the glossary to match Q12. Message classification values and document types stay pack content (AG-10-37, AG-9-43).
- **Why it matters / risk.** Two models would classify the same attachment with two answers and two logs. **Who decides.** Team (product owner). **Shapes.** Task, journey.

### IMP-13 AG-9-11 applies a document type on its own vs "everything to review" and FD-16

- **Today.** AG-9-11 (L484): a high-confidence type is applied automatically (an internal filing action); a firm may raise it to "ask me first"; setting a type never verifies. AG-11 §3.10 (L464) and §13 Q11 (L1267): until a firm sets confidence thresholds, every Reader value and Sorter match goes to review. AG-09 §3.1 (L204): "the officer confirms". AG-09 BR-19 (L577): a type is a proposal. FD-16 (L52): every AI output "is human-approved before it has effect". Thresholds are open everywhere (AG-11 Q11, AG-09 Q10, AG-10 Q10, AG-18 Q8). AG-18 BR-9 (L471) similar.
- **What is wrong or missing.** Is an internal, reversible filing action an "effect" under FD-16? The documents assume yes (review until thresholds) and no (automatic at high confidence) at once. For the Upload Reviewer and File Builder this decides whether a person touches every upload.
- **Proposed change (Proposal).** Recommended reading of FD-16 for Ranjan: **"effect" means anything that reaches a client, a form, the verified profile, a deadline or a professional decision; an internal, reversible, audited filing label is not an effect.** On that reading AG-9-11 stands, with three conditions written in: (a) automatic only above a threshold the firm has set (until then, review, as AG-11 §3.10 says); (b) the applied type is shown as "proposed by Reader" until a person touches the document, and is always reversible; (c) the firm's agreement rate (person kept vs changed the type) is measured and shown (IMP-29), so a firm lowers review on evidence (IMP-30). Record the reading as an interpretation note on FD-16, not a change.
- **Why it matters / risk.** Without it the product either reviews everything (no time saved) or breaks a ratified decision by stealth. **Who decides.** Ranjan (FD-16 reading). **Shapes.** Task, journey.

### IMP-14 Supervised-message routing: AG-16-47 vs AG-11-82

- **Today.** AG-11-82 (L681), AG-10-49 (L435), AG11-D11(c) (L40): shown at once to every active licensed user. AG-16-47 (L483), AG-16 §3.11 (L375): to the file's lead RCIC, or any licensed user if none. SA-06 change note L23 ("licensed staff first") vs L40 ("all holders at once"). W1 inventory X1.
- **Proposed change (Proposal).** Adopt the newest wording (AG-11 v1.11, F4 review fixes) everywhere; correct AG-16-47, AG-16 §3.11 and SA-06 note L23. For worker-prepared items: they land in the Needs you queue of the record's file owner (AG-11-55) and are visible to every holder of the needed permission at once, licensed holders marked "preferred", exactly as for any Doer item.
- **Why it matters / risk.** Minor, but a developer building AG-16 would build a different queue from AG-11's. **Who decides.** Team. **Shapes.** All.

### IMP-15 FD-22 (supervision rules in the Practice Pack) vs AG11-D11 (firm setting)

- **Today.** FD-22 table (FDL v1.5 L78), ratified: the Practice Pack holds "supervision rules for unlicensed staff" and who may lawfully advise; A22-1 (L98): the practice jurisdiction licenses the human. AG11-D11(c) (L40), AG-11-82 (L681), AG-10-49 (L435): supervision is a firm setting, on by default, the Owner may switch it off with a reason. AG11-D11(a), AG-11-88 (L692), AG-16-46 (L482): a licensed approver for AI text is a default the Owner may widen. AG1-D19 (L66), SA6-D9 (L29), SA-06 BR-20 (L495): a licence is never checked or verified. AIW-D26: approval of AI Worker output is human, per the firm's role settings, licensed by default. Proposals.md row (carve-out A) already asks for this to be settled.
- **What is wrong or missing.** A ratified decision says the pack sets supervision; the October design lets the Owner switch it off. Both can be right only if the pack sets a floor and the firm can only go stricter. Today the Canada pack has no such content (W1 inventory, sa-frs §D), so the floor is empty.
- **Proposed change (Proposal).** Keep FD-22. Add one rule to AG-11 / AG-16: **the Practice Pack sets the supervision floor for the firm's jurisdiction; firm settings may tighten it, never loosen it below the floor.** Until the pack carries a floor, today's firm defaults stand as the floor. What the Canadian floor is (whether an unlicensed person may send advice-like text under supervision, and what "supervision" must look like): confirm with counsel / RCIC. For AI Workers: a worker acting for an **unlicensed** person produces "unlicensed-written" items and falls under supervision automatically; a worker acting for a licensed person still needs that person (or another human the firm allows) to approve, since the worker never approves (IMP-1 rule 5).
- **Why it matters / risk.** Any sentence in the investor story about supervision rests on this. **Who decides.** Ranjan (keep FD-22 and adopt the floor rule); counsel / RCIC for the floor's content. **Shapes.** All.

### IMP-16 Owner-approves wording in two forms; "widen" vs "switch off"

- **Today.** AG11-D8 (L37): "approved by Owner without a licensed user" for forms; AG11-D11(d) and AG-11-90 (L694): "approved by Owner — no active holder of the approval permission" for forms, and the "without a licensed user" wording only for items that need a licensed approver. SA6-D9 (L29) and SA-06 §3.3 (L283): the firm may "switch off" the licensed-approver default; AG-11-88: the Owner may "allow other roles".
- **Proposed change (Proposal).** One audit wording per case, taken from AG11-D11(d); SA-06 adopts "allow other roles" (if "switch off" is meant to allow any holder of the send permission, say so). Both audit wordings are kept for worker-prepared items with the delegation reference attached.
- **Why it matters / risk.** The measures (IMP-29) and the provenance view (IMP-2) key on these exact wordings. **Who decides.** Team. **Shapes.** All.

### IMP-17 Approval of AI Worker output: what the record must show after AIW-D26, and one proposed exception

- **Today.** AIW-D26 supersedes AIW-D17: human approval by whoever the firm's settings allow for that role, licensed by default; the product floors stay; external wording "approved by a named person". The product: AG-11-58 (L641), AG-11-88, AG-16-46, AG11-D11(d), SA6-D2 (L22), SA6-D9, AG-7-68 (L696: a plain note when a professional permission is granted to an unlicensed user). Review W1 B-3.
- **What is wrong or missing.** Now that licensed-only is not the rule, the record must carry the facts a firm or regulator would ask for, and the product must make the firm's choice visible and deliberate. Separately: when a firm has **no** active licensed user, AG11-D11(d) lets the Owner approve AI text so that "nothing is blocked"; for a worker that prepares client-facing items all day, that route could become the norm in a firm whose only credential has lapsed.
- **Proposed change (Proposal).** (a) Every approval of a worker-prepared item records: approver name, whether the approver was linked to a regulator credential at that moment (yes / no), the firm's setting in force (licensed only, or widened to named roles), and the Owner-route wording if used. (c) A monthly line in the firm's settings and in the Reporter: how many AI items were approved by the Owner route. (d) Optional, later: a check of the firm-entered licence number against the public register (AG1-D19 forbids licence monitoring today; a one-time format check is not monitoring: confirm with counsel / RCIC).
- **(b) A proposed exception to AIW-D26, for Ranjan to accept or reject.** We propose a firm setting, **on by default**, that makes AI Workers pause their *client-facing* preparation while the firm has no active licensed user; the Owner may switch it off with a recorded reason. We say plainly that this runs against the direction of AIW-D26 ("whatever the firm selects"): it makes the presence of a licensed person a de facto gate for the worker layer unless the Owner opts out, whereas D26 made licence a default for the *approver*, not a condition for the *worker*. The trade-off in one sentence: default-on protects a firm whose only credential has lapsed from building a backlog of AI-prepared client items approved by an unlicensed Owner, at the cost of the worker stopping until someone acts; default-off keeps D26's direction exactly and relies on the record in (a) and the count in (c) to make the risk visible. If Ranjan rejects the exception, (b) is dropped and (a), (c) and (d) stand on their own.
- **Why it matters / risk.** Keeps the trust story honest after D26: "approved by a named person, and the record shows whether that person was licensed". **Who decides.** Ranjan on (b); counsel on (d). **Shapes.** All.

---

## 4. Metering and the wedge

### IMP-18 Metering a prepared file: SA-4-44 says no add-ons

- **Today.** SA-4-44 (SA-04 v2.14 L470): "Nothing is sold outside a plan: there are no add-on prices in Release 1." SA-03 §11 (L593): a metered measure is configuration. SA-1B X10 (SA-01B L90, in `B-filler.md`): the "auto-prefilled forms" plan limit has nothing to meter in Release 1. AG-11 §13 Q20 (L1276): per-seat vs per-case open. FD-18 (FDL L54): per-seat tiers "plus metered add-ons for consumption rails (e-sign envelopes, SMS, storage overage)". AIW-D17: the File Builder is priced per prepared file. Challenge review: pilot price as a flat monthly allowance, then per file.
- **What is wrong or missing.** The wedge's business model has no meter, no definition of "a prepared file", no usage record and no billing line.
- **Proposed change (Proposal).** (a) Define the unit: **a prepared file = one File Builder run on one case whose readiness report a person approved** (an abandoned or rejected run is not billed; a re-run on the same case within N days is not a new unit; N: Ranjan). (b) A run record per worker (IMP-35) carrying its model-call cost from the AI run log, so margin per file is known. (c) An SA-03 limit row "prepared files per month" per plan (the allowance) and an SA-04 metered line for use above it. (d) For Release 1, two honest options for Ranjan: amend SA-4-44 to allow this one metered add-on, or sell the File Builder as an allowance inside plan tiers and meter silently during the pilot. We recommend the second for the pilot and the first for launch.
- **Why it matters / risk.** Without a meter there is no per-file revenue line in the W3 model and no cost-per-file number for investors. **Who decides.** Ranjan. **Shapes.** Journey (File Builder); the same meter pattern serves any worker sold per unit.

### IMP-19 Per-seat vs per-file: FD-18 already allows metered add-ons

- **Today.** FD-18 (L54) fixes the shape: per-seat tiers plus metered add-ons for consumption; cell values and prices open (C-2, C-3). AG-11 Q20 asks per-seat vs per-case as if open.
- **Proposed change (Proposal).** Treat "prepared file" as a metered add-on under FD-18. FD-18 names metered add-ons for "consumption rails"; whether a prepared file is such a rail is Ranjan's reading to confirm (no FD-18 wording change proposed); AG-11 Q20 closes by pointing to FD-18. W3 prices it.
- **Why it matters / risk.** Avoids reopening a ratified decision for no reason. **Who decides.** Ranjan (confirm the reading). **Shapes.** Journey.

---

## 5. The expert co-pilot

### IMP-20 Expert co-pilot: limits in writing

- **Today.** Nothing in any product source specifies a question-answering assistant over the system, the packs and case files. AIW-D25 and AIW-D27: answers only, sources only, refuses without a source, Canada-only. The nearest product rules: the Qualifier (eligibility scoring) always gives the same answer for the same inputs and pack version (AG-3-39, catalogue G10); AG-14-22 (L381): opening the detail behind a dashboard number re-checks the viewer's permission; AG-13 BR-4: an internal note can never reach a client-facing path; SA-11 Restricted fields; AG-11-94 client content as data; AG-11 BR-9 no promises; AG-11 BR-34 never cites a regulator's code as a rule. The catalogue (`design/workers/catalogue.md` W-24 and its proposals.md row) proposes a first version that answers a fixed set of question shapes from the Minder, deficiencies, Needs you and pack rule text; the rules below are what any version obeys.
- **What is wrong or missing.** The riskiest shape has no requirement at all. Without limits it is where invented answers, privacy leaks and cost appear first (challenge review).
- **Proposed change (Proposal).** A co-pilot requirement with these rules: (1) **Answers only**: it has no actions, cannot call a Doer, cannot write anything; the only thing it can produce is text for the signed-in staff member. (2) **Sources only**: it answers from the published pack version in force for the firm's country and from the firm's own records that *this user may see*, the same two sources the catalogue names (the product's run and audit records count as firm records); every answer lists its sources (pack section and version, record and field); with no source it says so and stops. (The earlier draft also listed "the product's own help content"; removed, because the catalogue does not include it and a help assistant is a different, lower-risk product that can be added later if wanted.) (3) **Permission at the moment of reading**: every record the co-pilot looks up passes the same permission and firm check as opening it by hand (the AG-14-22 pattern); internal notes, Restricted fields and other firms' data are never reachable; the answer is scoped to the viewer, never widened. (4) **Numbers from engines, not from the model**: eligibility, scores, deadlines and fees are quoted from the Qualifier, the Minder and the Biller, with their pack version; the co-pilot never computes them (G10). (5) **No advice to clients**: answers are information for the firm's staff; if pasted into a client message the AI-text floor applies (AG-10-44). (6) **No promises, no regulator talk**: BR-9 and BR-34 apply. (7) **Logged**: every question and answer is an AI run log entry with the sources used (by reference), under the user's delegation (IMP-1). (8) **Canada-only, no training, no memory across firms** (AG11-D15, BR-25). (9) **Cost caps** per user per day and per firm per month (IMP-36). (10) **Safe against hidden instructions**: text it reads is quoted data, never an instruction (IMP-26). (11) **Plain refusal wording** set once, in both languages; legal wording: confirm with counsel.
- **Why it matters / risk.** "Which of my files are at risk this week, and why?" is the demo everyone remembers; it must be the one that cannot leak or invent. **Who decides.** Lead (AIW-D27 accepted the limits); counsel on wording. **Shapes.** Expert co-pilot.

### IMP-21 Co-pilot and restricted personal data

- **Today.** The SA-11 Restricted field set (the most sensitive personal data, such as passport and financial numbers) is an open founder item (FDL L149, B-1). AG-11 §11 (L1174): no personal data in logs; AG-11-98: previews stored encrypted or by reference; catalogue G9: passport and financial numbers never in messages or logs. AG-18-47: support staff never see personal data in an assisted migration session. Nothing says what a model may receive.
- **What is wrong or missing.** A question like "list every client whose passport expires before March" needs dates, not passport numbers; nothing stops the full record going into the request sent to the model.
- **Proposed change (Proposal).** A **least-data rule for every model call**: the Doer or co-pilot passes only the fields its task needs; Restricted fields (once B-1 is set) are never passed, only their status (present, expired, missing); names and numbers that identify a person are replaced by record references the product resolves after the answer comes back. The Reader is the one exception (it must read the passport) and its output stays by reference (AG-9-48).
- **Why it matters / risk.** A privacy breach through the request to the model is the realistic failure mode. **Who decides.** Ranjan (B-1 field set), counsel. **Shapes.** Expert co-pilot; applies to all.

---

## 6. Role twins

### IMP-22 Role twin: how it uses the delegation

- **Today.** AIW-D24: a role twin is an AI version of a user role, scoped as a delegation (a subset of one named person's permissions); Lead decides the detail. SA-06 §3.0 (L196): roles are assigned to persons only. SA-06 §3.7 (L361): an API key (a machine's access key) counts as the firm plane, the only non-person caller. SA-2-16/17 (L380–381): the support session is the product's only existing "act inside a firm for someone else" pattern (reason, extra sign-in check, time limit, blocked list, every action tagged). Challenge review: call twins "assistants to the role" externally (AIW-D27). Catalogue A-W2-6: a twin holds a permission subset of one named person and takes no seat.
- **What is wrong or missing.** No rule says how a twin gets its permissions, who can grant them, when they end, and what the twin may never hold.
- **Proposed change (Proposal).** A role twin **is** a delegation as defined in IMP-1; this item adds only what is specific to twins and defines nothing twice. (1) The permission subset is the role's starter permissions minus the blocked list (IMP-23), never more than the person holds. (2) The permission is re-checked at every action, not only when the delegation was created (the AG-11 §11 L1178 pattern for approvals). (3) The twin inherits the person's licence status for supervision (IMP-15). (4) Its work shows as "prepared by <twin name> for <person>" everywhere. (5) It is a bundle of recipes (IMP-10): "AI intake clerk" = the intake recipes and Doers running under one delegation. (6) Several twins of the same role in one firm are several delegations, each for a different named person; there is no shared "AI case officer" identity (FD-16).
- **Why it matters / risk.** Makes "AI case officer" sayable to a regulator: it is the officer's own permissions, used for the officer, with the officer answerable. Without it the twin is an unnamed user, which FD-16 forbids. **Who decides.** Lead (AIW-D24). **Shapes.** Role twin.

### IMP-23 What a twin may never do: the blocked list

- **Today.** SA-2-17 (L381) blocks, in a support session: deleting, billing and payment, bulk export, users, roles and security settings, signing, sending messages to clients, starting another session, and the four professional actions. SA2-D14 (L61): no professional judgement in a support session. For automation: AG-11-54 (no submission), AG-11-16 (cases never moved by automation), AG-11-45 (no action for deactivated users), SA-06 Appendix C (L1309) Owner-only actions with no permission key.
- **What is wrong or missing.** No such list exists for a twin or any worker; the nearest one is for Expat Ready's own support staff.
- **Proposed change (Proposal).** A **worker blocked list**, enforced on the server like the floors (AG-11-53 pattern) and never delegable: delete clients, cases or documents; any billing, payment, refund or trust entry; any export; users, roles, permissions, settings, the AI switch, Team safeguards, supervision; signing or countersigning; the four professional actions (waive a deficiency, approve a review, record a decision, export a case) and form approval; moving a case stage; creating a lead from an unknown number; sending any free text to a client; granting or editing a delegation. The list is shown in the product on the twin's settings page and in the investor material as the "never" list (IMP-27).
- **Why it matters / risk.** This is the sentence that answers "what stops it going rogue?". **Who decides.** Lead; Ranjan ratifies as part of IMP-27. **Shapes.** Role twin, journey.

---

## 7. Names, roster and the Filler

### IMP-24 One name, one meaning: the Doer roster

- **Today.** `B-index.md` naming conflicts: FD-8 (FDL L33, ratified) folds Reminder into Minder; AG-11 L243, AG-13 L227, Agent Phasing L52 and the RNA spec L25 keep Reminder, Minder, Tasker (and Messenger) as four Doers. FD-8 names Clocker "not Timer"; AG-13 v1.12 says Timer throughout (L314, L395). "Drafter" is the template engine (AG-05 L186, AG-09 L297, SA-06 L752, Doc 2 capability list) and the AI message writer (AG11-D4 L33, glossary L55). Dialer and Finder are absent from the October glossary (L52) and the Overview Doer list (L177). Notification (AG-11-2) and Recruiter (Doc 2 L91) appear as Doers in one place each. The Conductor is defined three ways and SA-08 L21 lists it as a Doer (`A-conductor.md` gaps). Proposals.md already carries the roster decision (carve-out B).
- **What is wrong or missing.** Permissions, capabilities, audit entries, product-map items and every AI Worker's "Doers called" field key on these names. Today a permission that says "Drafter" is ambiguous and a ratified decision is contradicted by every October file.
- **Proposed change (Proposal).** One canonical roster page in the glossary with one line per name, and three decisions: (a) **Reminder / Minder**: either the October files comply with FD-8 (rename the "speaks" Doer's actions to Minder actions) or Ranjan amends FD-8. Our recommendation: **amend FD-8** to allow Minder (thinks: deadlines and watches) and Reminder (speaks: client nudges) as two Doers, because AI Workers need the split (the Deadline Guardian is Minder logic; the chase is Reminder sending) and the October design already depends on it. (b) **Clocker**: keep FD-8's name; fix AG-13. (c) **Two Drafters**: keep "Drafter" for the template engine (older, keyed in permissions and capabilities) and give the AI message writer a new one-word name; the name is Ranjan's (naming is founder territory; the June naming spec is the founders'). Also: add Dialer, Finder, Notification and Recruiter to the glossary with a one-line status each; define the Conductor once ("the engine, not a Doer", AG-11 BR-1) and correct SA-08 L21 and Agent Phasing L51.
- **Why it matters / risk.** Traceability breaks on names; so does the investor map. **Who decides.** Ranjan (FD-8; the AI Drafter's name); team for the glossary. **Shapes.** All.

### IMP-25 Is the Filler an AI Doer?

- **Today.** AG-07 BR-23 (L750) lists "the Filler's auto-fill" among AI Doers. Doc 1 L1329, SA1B-D16 (L40), SA-1B-35 (L191), Agent Phasing L52/L69: the Filler is rule-based; AI stays out of the form-filling path. `B-filler.md` gap.
- **Proposed change (Proposal).** Reword BR-23 to "the never-fabricate rule applies to the Filler as to every AI Doer"; the Filler stays rule-based and outside the AI switch. The Form Preparer worker (catalogue W-05) is therefore AI only upstream (Reader) and in checks (Checker).
- **Why it matters / risk.** A buyer must be able to hear "no AI touches your government form" and have it be true in every document. **Who decides.** Team. **Shapes.** Journey.

---

## 8. Safety: hidden instructions, hard limits, advice

### IMP-26 Instructions hidden in client content

- **Today.** AG11-D13 (L42), AG-11-94 (L702), AG-10-54 (L442), AG-10 BR-27 (L481), AG-9-42 (L539), AG-18-36 (L382): client content is handed to the model as marked-off data, never as instructions; no tool access; the Sorter chooses only from a list of the firm's own files; a match made by the AI alone never files; a classification of a message from an unverified sender never triggers a client-facing automatic action. AG-11 §11 (L1180): what the model returns is untrusted, checked against a fixed expected shape, never executed.
- **What is wrong or missing.** Good for the four Doers. Gaps for workers and the co-pilot: (a) nothing says that text a Reader or Sorter extracted cannot change *what a worker does next* (a document saying "send the client's full file to this address" is read, then becomes data the worker acts on); (b) the co-pilot reads case files that include client-written messages and uploaded documents, and nothing treats that text as a possible attack; (c) no requirement to test for this before a new version of the model instructions goes live; (d) nothing on the person side: an extracted "instruction" shown to the approver as a proposed action could be approved by habit.
- **Proposed change (Proposal).** (1) **Fixed menu of actions**: a worker's next action is chosen by a rule over product data from a fixed menu (IMP-10); model output can propose *values* (a date, a type, a draft), never *actions*, recipients, addresses or permissions. (2) **Values are checked against the product, not the text**: a recipient must be the file's client or a firm user; an address or account number found in a document is a value for a person to verify, never something a worker uses. (3) **The co-pilot quotes, it does not obey**: text it reads is placed in the request as marked-off data; its answer is checked against a fixed expected shape (text plus source references, nothing else); it never follows a link, opens a file or calls a tool. (4) **The unverified-sender rule extends to every worker**: content from an unverified sender or an unapproved document can only produce "ask me first" items. (5) **A standing test set of planted instructions**: documents and messages containing hidden instructions are run against every version of the model instructions before it goes live (IMP-5), with a pass requirement. (6) **A cue for the approver**: an approval item whose proposed values came from client content says so, in one line, next to the approve button.
- **Why it matters / risk.** This is the attack a security reviewer, an investor's adviser or a rival will try first. **Who decides.** Lead / team. **Shapes.** All.

### IMP-27 The hard limits: what no worker may ever do

- **Today.** Scattered across the sources: never submit to a government authority (AG-11-54 L635, AG-7-59 L687, BR-26 L755, AG11-D1 L30); never fabricate (AG-11-70 L657, BR-23 L752, AG-07 BR-7 L734); never promise an outcome (BR-9 L738, AG-10 BR-10 L464, AG-11-68); never write the verified profile without approval (AG-9-45 L542, AG11-D1 floor); AI client text never below "ask me first" (AG-11-53 L634, AG-10-44 L430); nothing runs because time passed (AG-11-59 L642); never create a lead from an unknown number (AG11-D18(b) L47); cases never moved by automation (AG-11-16 L573); never act for a deactivated user (AG-11-45); never outside the firm's one country pack (BR-2 L731); never cross firms (BR-3 L732); never bypass consent, quiet records or rate caps (AG-11-37, AG-11-87, BR-11); never machine-translate legal copy (AG-12-24, SA-5-15); never put passport or money numbers in messages or logs (AG-11 §11); never report to a regulator or declare a firm non-compliant (BR-34 L763).
- **What is wrong or missing.** No single list; several limits are written for recipes or Doers, not for anything called a worker; some are missing for automation entirely: a worker never approves its own or anyone's work; never signs; never moves money; never deletes; never changes permissions, settings, the AI switch or safeguards; never contacts a regulator, a government office or a third party on the firm's behalf; never works for a client who is not the firm's client; never acts after the retainer ends or the client is paused.
- **Proposed change (Proposal).** One **Hard limits** section in the AI Worker requirement (Phase B), enforced on the server at set-up and again at run time like the floors (AG-11-53), not by hiding buttons; the same list printed in the product (worker settings page), the client notice (IMP-11) and the investor material. The list = the scattered limits above plus the missing ones, each pointing to its existing source where one exists. Ranjan ratifies the list as a founder decision so it cannot be loosened by a module edit.
- **Why it matters / risk.** This is what "cannot freelance" means in one page. **Who decides.** Ranjan (ratify), Lead (draft). **Shapes.** All.

### IMP-28 "Anything that reads as advice" is not a floor

- **Today.** AG11-D1 (L30) and AG-10-44 (L430): advice cannot be detected by a machine, so it is not a floor; it is covered by firm-approved templates, the AI-text floor and supervision. A template message sends automatically once the firm confirms "Review your standard messages" (AG11-D12, AG-11-91). AG-11-97 (L709): immigration-significant merge fields render only from verified values, else the send drops to "ask me first". Catalogue W-01 and W-02 rely on template chases sending automatically.
- **What is wrong or missing.** A worker that sends many template messages a day multiplies whatever advice a template contains, and no one sees it after the one-time review. The honest position must be stated and not oversold.
- **Proposed change (Proposal).** (a) Keep the honest statement: advice is not detected; do not claim it is. (b) Worker-sent client messages use only firm-confirmed templates with immigration-significant fields from verified values (AG-11-97 already) and **any worker free text is "ask me first"** (already the AI-text floor; state it for workers). (c) Templates used by workers get a **"contains status or eligibility content" mark** set by the firm at review time; marked templates default to "ask me first" when a worker sends them. (d) The pack supplies the no-guarantee sentence for such templates (BR-9). Whether an unlicensed-sent template with status content is lawful under supervision: confirm with counsel / RCIC.
- **Why it matters / risk.** Overclaiming here is the regulator's easiest catch. **Who decides.** Counsel / RCIC on the line; team on (c). **Shapes.** Task, journey.

---

## 9. Measurement, release and the rest

### IMP-29 AI performance measures for AG-14

- **Today.** AG-11-63 (L646): approved / edited / rejected counts per recipe and per action, shown in the recipe's health view. AG-9-45: reject reasons recorded "so recipes and thresholds can be tuned". AG-14 v1.10 §4 (L348–L402) defines sales, delivery, financial, productivity and compliance measures as configuration rows (AG-14-4, developers: `MetricDefinition`); no measure for automation, Doers or AI; AG-14 §13 (L666) defers automatic alerts on measures. SA-09 (platform analytics) has no AI content either (A-index left-out table). `A-ai-doers.md` gap: no accuracy or quality measure anywhere.
- **What is wrong or missing.** Nobody can say whether a Doer or a worker is good, cheap, slow or dangerous; no number exists for the pilot, the price or the investor deck.
- **Proposed change (Proposal).** Add to AG-14 (firm) and SA-09 (platform), as the same kind of configuration rows AG-14 already uses, measures computed from the AI run log, approval items and the provenance view (IMP-2): **acceptance** (approved unedited / edited / rejected, per Doer, per worker, per field type, per template); **agreement** in shadow mode (the person's own value matched the model's proposal); **turnaround** (prepared to approved; age of AI items in Needs you); **override rate** on Reader fields and Checker findings (confirmed vs dismissed); **catch rate** (deadlines and deficiencies found by AI that a person then acted on); **reliability** (provider errors, timeouts, unreadable rate, fallback-to-manual rate); **cost** (model calls and cost per run, per file, per question; spend against cap); **safety** (pass rate of the planted-instruction test per version, items withdrawn, Owner-route approvals of AI items); **time saved** (per file, measured against files done without AI in the pilot; Assumption until measured). Firm-side views follow AG-11-49: they show the firm its own AI, never rank its staff.
- **Why it matters / risk.** Without this there is no pilot result, no "good enough to lower review" (IMP-30), and every time-saved claim stays an Assumption for ever. **Who decides.** Lead / team. **Shapes.** All.

### IMP-30 When is a Doer good enough to lower review?

- **Today.** Thresholds are open in four modules (AG-11 Q11, AG-09 Q10, AG-10 Q10, AG-18 Q8); AG-11 §3.10 (L464) sends everything to review by default; AG-9-11 applies types automatically above a threshold nobody has set (IMP-13). No rule says how a firm or the platform decides a threshold.
- **Proposed change (Proposal).** A **shadow-then-trust** rule: a kind of proposal runs in shadow mode (shown beside the person's own entry, nothing applied) until its agreement rate over the firm's last N decisions passes a bar the platform sets; then the firm may set its threshold, shown with the evidence; the platform publishes default thresholds per pack from the fixed test set (IMP-5), and firms may only go stricter until their own evidence exists. Floors never move (AG-11-53). N and the bar: Lead proposes, Ranjan confirms.
- **Why it matters / risk.** Turns "review everything" into measured trust without a founder guess. **Who decides.** Lead; Ranjan on the bar. **Shapes.** Task, journey.

### IMP-31 Which document wins on release

- **Today.** Charter V1 L121 and V2 slides 1 and 4: AI and the AG-11 engine not in Release 1. AG-11 §13 L1297, L1303; Agent Phasing L19, L23; AG-08 L730: Release 1, built but switched off. SA-01B §0.3 L112: Defer. SCOPE-TRIAGE L3: not a requirements document; L149: proposes Release 2. Review W1 B-2; proposals.md rows from carve-out A and B; AIW-D21: assume everything is built, timelines not our concern.
- **What is wrong or missing.** Under AIW-D21 the date does not matter to us, but every baseline row still carries five release labels and the team builds to the Charter. One precedence rule is needed so Phase B requirements can say "exists" or "new" without re-litigating.
- **Proposed change (Proposal).** Adopt the reviewer's rule (review W1 Task 7 item 1) in README §2b: the newest dated module file wins over Doc 1–4 for the same topic; the Founder Decisions Log and AIW decisions win over module files; SCOPE-TRIAGE is never a scope source; the Charter wins on dates only and its "NOT IN RELEASE 1" line stays a recorded conflict until Ranjan updates it.
- **Why it matters / risk.** Without it, the inventory and the investor map carry contradictions a reader can see. **Who decides.** Ranjan (and the Charter update is his alone). **Shapes.** All.

### IMP-32 AG-11's decisions are Sanjay's, not ratified founder decisions

- **Today.** AG-11 §0 (L22): "Decided by Sanjay (product owner), 4 Oct 2026"; SA-06 calls its SA6-D rows "founder decisions" (L1) while crediting Sanjay; SCOPE-TRIAGE marks them [F] "decided earlier by the founder" (L9, L141). FDL v1.5 stops at 2 Aug. AIW-D10: decisions may come from either co-founder. `A-founder-decisions.md` §2.
- **What is wrong or missing.** The entire approval, floor, AI-switch and licence-aware layer rests on decisions that are not in the Founder Decisions Log. A module edit could change any of them.
- **Proposed change (Proposal).** Ranjan ratifies AG11-D1 to D18 (and the SA6-D rows they depend on) into the FDL in one batch, with the corrections in this file (IMP-12 to IMP-16) applied, so the AI layer rests on ratified ground; or records that product-owner decisions carry founder weight.
- **Why it matters / risk.** An investor who asks "who decided the AI cannot send without approval?" should get "the founders, on this date". **Who decides.** Ranjan. **Shapes.** All.

### IMP-33 Human review of AI-assisted output that reached a client (FD-20 covers scoring only)

- **Today.** FD-20 (L56): assessment results carry an "automated decision" marker, a snapshot of the inputs and rules used, and a review request type routed to a named human; Charter V2 notes: a client can ask a named person to review an automated eligibility result. No equivalent for a client who received an AI-drafted message, letter or form value. `A-founder-decisions.md` gap.
- **Proposed change (Proposal).** Extend the FD-20 review route to any client-visible item marked AI-written (IMP-11): the client can ask for a named person to review it; since a human already approved it, the request is a complaint path, not an automated-decision review. Whether Law 25 or PIPEDA treats a human-approved AI draft as an automated decision: confirm with counsel (the sources are silent; see IMP-11). No change to FD-20 itself.
- **Why it matters / risk.** Closes the gap a privacy regulator would ask about first. **Who decides.** Counsel; Ranjan on the route. **Shapes.** Task, journey.

### IMP-34 Needs you will flood: approvals per file, not per value

- **Today.** AG-11-60 (L643): Needs you holds Doer work prepared with no human present. AG-18-78 (L440) and AG-9-49 (L546): import results are reviewed per document, not per value; AG-9-50 (L547): "approve all shown" on a document. AG-11-61 (L644): an item whose record changed is re-shown as stale, and an approval is refused if the item changed since the approver saw it. AG11-D17 (L46): overdue after 2 working days. Challenge review: batch approval so a licensee can clear a file in minutes.
- **What is wrong or missing.** A File Builder run on one case produces tens of values, several findings and several messages; one item each would make the queue unusable and push the firm to approve by habit.
- **Proposed change (Proposal).** A **file-level approval item**: the worker's readiness report is one Needs you item with every value, finding and pending message inside it, each with its source beside it, approve-all, approve-some and reject-with-reason per line, and the same stale and changed-since-seen checks. Per-item floors still apply (a government form draft and AI client text remain their own items with their own approver rules). "Done for you" shows the run as one entry with a count.
- **Why it matters / risk.** Review minutes are the real cost of the File Builder (wedge recommendation, "the strongest objection"); this is where they are won or lost. **Who decides.** Lead. **Shapes.** Journey.

### IMP-35 A worker run has no start, state or stop

- **Today.** Recipes have a life cycle, Draft → Enabled → Disabled → Archived (AG-11-31), versions (AG-11-33), a rule that re-delivering the same event does not repeat the work (AG-11-25, developers: idempotency keys), run history (AG-11-34), quiet and paused clients (AG-11-87, AG-11-101), import suppression (AG-11-77). Nothing describes a multi-day, multi-step job on one case that starts at a retainer and ends at a report.
- **Proposed change (Proposal).** A **run record** per worker (developers: `WorkerRun`): worker and version, delegation, case or lead, state (started; waiting on the client; waiting on an approval; ready for review; closed or stopped), start and end, the list of actions taken (linked to run history), usage (IMP-18), and the stop rules: it stops when the client is paused or quiet, the retainer ends, the case closes, the delegating person is deactivated, the AI switch or emergency stop trips, or a person stops it (audited, reason optional). Starting the worker again on the same case continues the same run rather than opening a second one.
- **Why it matters / risk.** Billing, measures and "what is the File Builder doing on this file?" all need it. **Who decides.** Lead / team. **Shapes.** Journey, role twin.

### IMP-36 Spend caps per firm and per person

- **Today.** AG-11 §11 (L1170): a cap on how many AI jobs one firm can run at once; AG-11-38 and BR-11: caps on automated messages. No cap on model spend; speed targets wait for the provider (L1191).
- **Proposed change (Proposal).** Platform-set and firm-visible **spend caps**: per firm per month (a warning at 80 %, a hard stop at 100 %, then the manual path, AG-11-71), per co-pilot user per day, per worker run (a runaway run is stopped and parked for a manager to look at, with a notification, the AG-11-27 pattern; developers: dead-letter). Caps are SA-03 limit rows so plans can carry them (IMP-9).
- **Why it matters / risk.** Margin and a bad-day story ("a bulk upload cost us a month of model budget"). **Who decides.** Lead / team. **Shapes.** All.

### IMP-37 "Same input, same result" is true for rules, not for models

- **Today.** README §1: reproducible outputs, same input same result. The Qualifier always gives the same result for the same inputs and pack version (AG-3-39), packs are versioned (SA-01 BR-3), FD-16: no model output is ever a decision. A model's output is not exactly repeatable by nature; AG-11 §11 only requires the instructions to be versioned.
- **What is wrong or missing.** Said as a blanket claim it is false for every Reader, Sorter, Drafter, Checker and co-pilot step, and an investor's adviser will test it.
- **Proposed change (Proposal).** Word the claim precisely everywhere: **"Every rule step gives the same result for the same input and pack version. Every AI step is a proposal with its source, its confidence and its model and instruction version recorded, reviewed the same way every time."** Where the provider allows it, fix the settings that control how much the model varies its answers (developers: temperature, seed) and record them in the AI run log; never claim word-for-word identical AI output.
- **Why it matters / risk.** AIW-D9: no unprovable superlatives. **Who decides.** Ranjan (wording). **Shapes.** All.

### IMP-38 "AI Worker" as a name against FD-16's marketing rule

- **Today.** FD-16 (L52): marketing may say "AI-assisted", never that AI decides. AIW-D27: externally, twins are "assistants to the role". The product term "AI Worker" implies an actor.
- **Proposed change (Proposal).** Keep "AI Worker" as the working and investor term, always with "works for a named person; a person approves" in the same breath; use "AI assistant" in client-facing and regulator-facing text; check the wording with counsel before publication. Workers are never given human names or avatars that suggest a person is acting (the "avatars" idea in AIW-D19 can be visual styles, not identities).
- **Why it matters / risk.** A name can contradict a ratified decision on a slide. **Who decides.** Ranjan; counsel. **Shapes.** All.

### IMP-39 Tamper-evident audit may move to Release 2

- **Today.** SA-11 §1 (L136): each audit entry is linked to the one before it, so any later edit or deletion shows (developers: hash chain). SCOPE-TRIAGE L174: proposes moving this and its checker to Release 2. Review W1 M-3: rivals also claim audit trails.
- **Proposed change (Proposal).** Under AIW-D21 we assume it is built; the investor story may say "tamper-evident" only while that holds. If Ranjan accepts the triage proposal, the wording drops to "complete, append-only". Record the dependency in `assumptions.md`.
- **Who decides.** Ranjan. **Shapes.** All.

### IMP-40 Portal autofill: is typing into a government website "submitting"?

- **Today.** AG-11-54, AG-7-59: nothing is ever submitted to an authority; the RCIC records a submission. AG-18 §0.1 (L147) and §13 (L848): "IRCC portal autofill / browser extension" is "not decided at platform level". VisaFlo and OpenVisa ship browser autofill extensions (`research/visaflo.md`; review W1 Task 3 rows 14–15, Chrome Web Store pages opened 9 Oct 2026).
- **What is wrong or missing.** The line between "fills the form the person submits" and "submits" is not drawn for a browser helper. Every rival has one; firms will ask.
- **Proposed change (Proposal).** State the rule now: a browser helper that fills fields on a government page from verified values, under the signed-in person's own government account, and never presses submit, pay or sign, is *filling*, not *submitting*; whether that is acceptable under CICC rules and IRCC portal terms: confirm with counsel / RCIC before any build. Until then the hard limit (IMP-27) reads "never submits, pays or signs on a government site".
- **Who decides.** Counsel / RCIC; Ranjan. **Shapes.** Journey (Form Preparer).

### IMP-41 Dependencies the hook and the wedge still have

- **Today.** The Deadline Guardian needs the Minder, which is not built (AG-11 §12, catalogue D5); the Charter leaves "a simple deadline and expiry reminder" as an open founder decision (`B-minder.md` status line); SCOPE-TRIAGE L119 proposes moving Reader letter deadlines (the Guardian's only AI step) to Release 2; escalation defaults conflict (AG-17 off vs AG-11 on from 5 staff, AG-11 §0.2 L60). The File Builder needs the case records that do not exist yet (AG-07 §12, catalogue D7), Canada pack content (D2) and the Filler decision (proposals.md, carve-out B).
- **Proposed change (Proposal).** No new requirement; keep these in `assumptions.md` (AIW-D21) and in the team's dependency list (challenge review W2d). Ranjan's Charter update should name the Minder core and Reader letter deadlines as in, since the hook rests on them. The AG-17 / AG-11 escalation default: adopt AG-11's (newest).
- **Who decides.** Ranjan (Charter), team. **Shapes.** Journey, task.

---

## 10. Decisions for Ranjan (only what he must decide; plain words; our recommendation)

1. **Is a "delegation record" fine under FD-16?** It adds no AI identity; it records which person a worker worked for and which of their permissions it used. *Recommend: yes, confirm in one line. Also: the person the worker worked for counts as the preparer, so four-eyes applies to them.* (IMP-1)
2. **Does an internal, reversible filing label count as "effect" under FD-16?** *Recommend: no; "effect" is anything reaching a client, a form, the verified profile, a deadline or a professional decision. Record it as a reading of FD-16, not a change.* (IMP-13)
3. **FD-22 vs the firm supervision setting.** *Recommend: keep FD-22; add the rule that the pack sets the floor and firms may only tighten; ask counsel / RCIC what the Canadian floor is.* (IMP-15)
4. **A proposed exception to your decision AIW-D26: should AI Workers pause client-facing preparation when the firm has no active licensed user, by default?** This goes against the direction of D26 ("whatever the firm selects"); it is a firm setting the Owner can switch off with a reason. The trade-off: default-on protects a firm whose only credential has lapsed from piling up AI-prepared client items approved by an unlicensed Owner, at the cost of the worker stopping until someone acts; default-off keeps D26 exactly and relies on the approval record and a monthly count to make the risk visible. *Recommend: accept the exception; a plain "no" is fine and the rest of IMP-17 stands without it.* (IMP-17)
5. **Metering the File Builder.** Define "prepared file" as a run whose readiness report a person approved; for the pilot sell an allowance inside plans and meter silently; for launch amend SA-4-44 to allow this one metered add-on. *Recommend: that sequence. FD-18 already allows metered add-ons, so no change to FD-18.* (IMP-18, IMP-19)
6. **Names.** Amend FD-8 so Minder (watches dates) and Reminder (sends nudges) are two Doers, as every October file already assumes; keep "Clocker"; give the AI message writer a new one-word name so "Drafter" stays the template engine. *Recommend: all three; you choose the name.* (IMP-24)
7. **Ratify Sanjay's AG11-D1 to D18 into the Founder Decisions Log**, with the corrections in this file. *Recommend: yes, one batch.* (IMP-32)
8. **Ratify the "hard limits" list** (what no worker may ever do) as a founder decision. *Recommend: yes, after counsel reads it.* (IMP-27, IMP-23)
9. **Canada-only AI processing as the promise**, with the honest fallback that AI stays off if no Canadian option exists for the chosen model; counsel confirms the legal need. *Recommend: yes.* (IMP-7)
10. **Which document wins on release**, and the Charter update. *Recommend: adopt the precedence rule; update the Charter to name the Minder core and Reader letter deadlines as in.* (IMP-31, IMP-41)
11. **Wording.** Replace "same input, same result" with the precise two-sentence claim; use "AI assistant" externally; no human-like names or avatars. *Recommend: yes.* (IMP-37, IMP-38)
12. **Co-pilot data scope.** Confirm it may read the firm's case files (within the user's permissions) but never the Restricted personal-data fields, whose list (B-1) is still yours to set. *Recommend: yes, and set B-1 with counsel.* (IMP-20, IMP-21)
13. **Portal autofill.** Ask counsel / RCIC now whether a browser helper that fills but never submits is acceptable; until then it stays outside every worker. *Recommend: ask now; it is the gap firms will name first.* (IMP-40)

Items not for Ranjan (team or Lead decide): IMP-2, 3, 4, 5, 6, 8, 9 (mechanism), 10, 12, 14, 16, 22, 25, 26, 29, 30, 34, 35, 36. For counsel / RCIC: IMP-4 (retention), 7, 11, 15, 17(d), 20 (wording), 21, 28, 33, 40.

---

## 11. Unknowns and assumptions recorded here

- **Unknown:** whether the chosen AI provider offers Canada-region processing (IMP-7); the outcome of the founders' RNA autopilot review (`A-autopilot-spec.md`); whether any Canadian rival ships a delegation-style record; the content of the Canadian supervision floor (IMP-15); whether Law 25 or PIPEDA treats a human-approved AI draft as an automated decision (IMP-11, IMP-33; the sources mention Law 25 only for breach notification and data-request deadlines).
- **Assumption:** everything in the October module files is built or will be (AIW-D21, `assumptions.md` AIW-A1); the tamper-evident audit chain ships in Release 1 (IMP-39); the Minder core and the case records exist before the hook and wedge run (IMP-41).
- **Inferred:** that FD-16's "effect" excludes internal filing labels (IMP-13, for Ranjan to confirm); that AG-11 v1.11 (newest) wins over AG-16-47 and Doc 3 (IMP-14, IMP-3) pending the precedence rule (IMP-31).

---

## 12. Summary (ten lines)

1. Forty-one items; ten are blocking: the delegation record (IMP-1), the "AI prepared, person approved" join (IMP-2), the SA-08 provider entry (IMP-6), Canada-only in SA-11 (IMP-7), "no tool access" vs a worker with hands (IMP-10), the per-file meter (IMP-18), co-pilot limits (IMP-20), the role-twin delegation (IMP-22), hidden-instruction defence (IMP-26) and the hard-limits list (IMP-27).
2. The single most important design sentence: an AI Worker is a recipe the Conductor runs from a fixed menu of actions; models inside it never hold tools and never choose actions (IMP-10). It keeps AG-11-94, FD-16 and the reproducibility claim all true at once.
3. Acting on behalf of a named person needs one new record (the delegation, defined once in IMP-1) and two extra facts on every audit entry; no AI identity, FD-16 unchanged (IMP-1, IMP-3).
4. The Super Admin side has not caught up with AG-11: no AI provider entry, a looser residency rule, no emergency-stop switch, no product-map item, no usage measure (IMP-6 to IMP-9).
5. Four contradictions are settled by picking the newest wording and writing the pack-floor rule (IMP-12 to IMP-16); one needs Ranjan's reading of FD-16 (IMP-13).
6. After AIW-D26, trust rests on what the approval record shows, not on "licensed only"; add the licence-link fact to every approval, and decide on one proposed exception to D26 (a default pause when a firm has no licensed user) (IMP-17).
7. The wedge has no meter; "prepared file" is defined and FD-18 already permits a metered add-on (IMP-18, IMP-19).
8. The co-pilot and role twins get their first written limits: answers only with sources and permission checked at the moment of reading; twins as delegations that never approve, with a blocked list borrowed from the support-session rule (IMP-20 to IMP-23).
9. Names must mean one thing: amend FD-8, rename the AI Drafter, fix the glossary (IMP-24); the Filler stays non-AI (IMP-25).
10. Nothing can be measured today: AI measures for AG-14 and SA-09, a shadow-then-trust rule for thresholds, change control and a fixed test set for model instructions, and precise wording for the reproducibility claim (IMP-29, IMP-30, IMP-5, IMP-37).
