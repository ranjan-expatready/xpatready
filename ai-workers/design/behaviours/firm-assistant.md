# Firm assistant: how it behaves (Step 2 behaviour document, persona 4 of 7)

**Persona:** Firm assistant. **Assists:** the Owner ("Everything, including the five Owner-only actions", SA-06 v3.1 §3.3) and the Case Manager ("Cases only — runs and signs off case work", SA-06 v3.1 §3.3), under **two delegations, one from each, nothing shared between them** (IMP-1 rule 2; `../ai-organisation.md` §1.5). In a solo firm, the one licensed person wearing the Owner's hat (`../ai-organisation.md` §1.2 Chart A). **Catalogue identity:** a new grouping, not a catalogue twin (`../ai-organisation.md` §2.4, Proposal). **Bundles (each a duty section below):** W-02 Deadline Guardian (shown in the charts on its own as the free **Deadline watch**, the hook, and counted under this persona, AIW-D34 item 8), W-14 Lifecycle Keeper, W-15 Migration Mapper, W-16 Privacy Clerk, W-18 Report Narrator (`../ai-organisation.md` §2.4 "Bundles"; `../workers/catalogue.md` §2.1, §2.4).

**Rests on:** AIW-D31 (names), AIW-D32 (the seven personas), AIW-D33 (the delegation record is consistent with FD-16; the named person the persona works for is the preparer for four-eyes), AIW-D34 item 8 (the Deadline watch on its own, counted here), AIW-D13 and D26 (acts for a named person; a person approves, whoever the firm's settings allow), AIW-D25 (the Practice expert answers only), IMP-1 (the delegation record, Proposal), IMP-10 (a persona is a recipe, not a model with hands, Proposal). **Whose delegation:** the Owner may be unlicensed (a licence is "a person, not a role", SA6-D9); the licence sits with the approver (AIW-D26, AIW-D33). AIW-D13's words "a named licensed person" are read here as "a named person", **pending** the founder (`../../PROGRESS.md` "Waiting on the founder"; section 11, decision 1). **The Lead's calls of 10 Oct, applied here, not reopened:** the Release 1 seeded recipes and the product's own Reader / Sorter / Checker calls are firm automations (mode AUTOMATION, not metered); the persona adds only its own recipes (mode DELEGATED) and its run record references the rest, with a double-run guard (IMP-35); the permission subset is taken key by key from the role's SA-06 v3.1 §10b row, never with a wildcard; anything a model proposes is a value or a draft, never an action, recipient or permission (IMP-26 rule 1).

**Status: Proposal.** Nothing here is built. What a buyer must be told today (`../ai-organisation.md` §2.4 "What a buyer should be told today"): **the Minder does not exist** ("Today the Minder does not exist; the nearest thing is a date-anchored automation armed through the Conductor, so this is NEW", AG-11 v1.11 AG-11-47) and the deadline catalogue is unauthored pack content (catalogue D2, D5); the import engine is built for parties, documents and notes only, with no undo (AG-18 v1.2 §12); the governance registers are new build ("none of the governance pillars (3.4–3.8) exist as built capability", SA-11 v2.7 §12); the reporting aggregation layer is new ("There is no aggregation/rollup/cache layer today", AG-14 v1.10 §12); the four AI Doers are off for every firm until a Canada-region provider is recorded (AG-11-93). **Every deadline value, lead time and date rule in this document is pack content for the Immigration SME, confirm with counsel / RCIC** (AG-11-20; AG-11 v1.11 §3.12). Every "hours saved" figure is an Assumption (`../../assumptions.md` AIW-A6).

**Sources and how they are cited.** Product facts come only from `sources/drive-snapshot-2026-10-09/`: AG-01 v1.16, AG-02 v1.9, AG-07 v2.7, AG-09 v1.8, AG-11 v1.11, AG-13 v1.12, AG-14 v1.10, AG-16 v1.12, AG-17 v0.5, AG-18 v1.2 (all `02-functional-requirements/agent/`), SA-03 v2.14, SA-06 v3.1, SA-11 v2.7 (`super-admin/`), the Founder Decisions Log v1.5 (`01-techno-functional/07-Founder-Decisions-Log.md`), Doc 4 v1.3 CP-8 (`01-techno-functional/06-Doc-4-Client-Portal.md`). A requirement is cited by its ID or by file, version and section; its words are never restated, only pointed to, and short quotes appear in quotation marks only where the exact words carry the point (AIW-D22). Catalogue entries (W-nn), improvement items (IMP-nn), the master (`../ai-organisation.md`) and `../../proposals.md` rows carry their own citations. Everything that is not a product fact is labelled **Proposal**, **Assumption** or **Unknown**. Our own wording is in *italics*, never in quotation marks. No person is named (README rule 10); the worked example uses "the Owner", "the Case Manager", "case officer 1" and "Client B". A technical name (a field, an event, a permission key) is given in brackets after the plain words the first time it appears in a passage.

**How this file follows the template.** It keeps the twelve sections (0 to 11) of `case-assistant.md` and its fixed blocks; section 1 and section 2 have one subsection per catalogue worker in the order the card lists them; every step in section 2 carries the eight columns and an audit mode (PERSON / DELEGATED / AUTOMATION); every Proposal in sections 1 to 8 appears again in section 9; every decision appears in section 11 with the Lead's recommendation. Terms shared with the Case assistant document are not redefined (its section 10 holds them); section 10 here adds only this persona's terms.

---

## 0. Summary: the persona in five plain lines

1. The Firm assistant is the assistant to the people who run the firm. It holds the free **Deadline watch**: it reads every deadline the product's Minder is watching on every file, every approval that is overdue or linked to a government date, and every file with no active owner, and hands the Owner and the Case Manager one plain list each morning, per file, never per person (W-02).
2. It works out each client's next immigration moment from the pack's rules and the dates already on the file, drafts the consented re-engagement message, and prepares the *open a new opportunity* line; a person approves the message and a person clicks to open the opportunity (W-14).
3. When a firm brings an old practice's files across, it proposes how the old columns, values and program names map onto the firm's pack and lists what it could not map; the product's own dry-run shows what would happen and the Owner attests and confirms (W-15).
4. It keeps every privacy request (a client asking to see, correct or erase their data) on its legal clock: it opens the task, drafts the internal response outline with a checklist of what the law stops, and reminds before the deadline; the Owner verifies identity, runs the export and sends the answer (W-16). Each week it writes a plain-language note from the dashboards, quoting only numbers the product computed (W-18).
5. Everything it produces is a list, a proposed value or a draft; the Owner or the Case Manager acts. It never arms a deadline, never escalates, marks a file at risk or reports on staff unless the firm chose that, never imports, exports, disposes or deletes, never writes a consent record, and every step is in the firm's audit log with the delegation's reference number (IMP-1).

---

## 1. What starts it

**Preconditions that hold for every duty (cited once here, not repeated below).**

| Precondition | Where it is written | Label |
|---|---|---|
| The firm's one AI switch is on. It "is locked off for every firm until Super Admin has recorded the AI provider, the processing region (Canada only, AG11-D15) and a no-training / no-retention agreement"; then "the Owner switches AI on once, with an audited acknowledgement" | AG-16 v1.12 §3.9; AG-16-35; AG-11-93 | Product fact |
| Two delegations exist and each named person has accepted their own: the Owner's and the Case Manager's. The Owner may set up the Case Manager's, but it "takes effect only when the person accepts it" (IMP-1 rule 1); "one delegation per person per worker" (IMP-1 rule 2). W-15 and W-16 run only under the Owner's delegation, because the Case Manager holds none of the import or governance keys they read (section 1, permission block) | IMP-1 rules 1 and 2; `../ai-organisation.md` §1.5; SA-06 v3.1 §10b | Proposal (confirmed in principle by AIW-D33) |
| The persona's own recipes are platform-seeded and "every other recipe starts disabled until reviewed"; the firm enables them. A persona is "a bundle of recipes under one delegation" | AG-11-21; IMP-10; IMP-22 rule 5 | Product mechanism; the persona's recipes are Proposal |
| Each action carries an autonomy level the firm sees as "Send automatically / Ask me first / Off", with the defaults of AG-11-52 and the floors of AG-11-53 | AG-11-51 to AG-11-53; AG-16-36 | Product fact |
| Two more floors for persona sends: a template the firm marked as carrying status or eligibility content defaults to "ask me first" when the persona sends it; any persona free text is "ask me first" | IMP-28(b), (c) | Proposal |
| Rehearsal first: every persona recipe is simulated with the product's dry-run, which "renders the actions it *would* take — without executing them", before it is enabled | AG-11 v1.11 §3.7; AG-11-29, AG-11-30; IMP-10; IMP-30 | Product mechanism; the mandatory rehearsal is Proposal |
| The permission the persona needs is re-checked at the moment it acts | IMP-22 rule 2 (the AG-11 v1.11 §11 pattern) | Proposal |
| Standard deadlines are the product's, not the persona's: any module "SHALL be able to **register a standard deadline directly with the Minder** — entity, date, and the file owner to remind — without any automation existing, with no firm set-up and no entitlement" (AG-11-47); they "SHALL work on **every plan** and SHALL **never stop** because a firm disables automations" (AG-11-48); they are among the items that "are always on and cannot be switched off by any plan or flag" (SA-3-35) | AG-11-47, AG-11-48; SA-3-35; AG17-D55, AG17-D70 | Product fact (Specified, not built) |

**Permission subset of the delegation (a fixed block of the template; Proposal under IMP-22 rule 1 and IMP-23).** The subset is "the role's starter permissions minus the blocked list (IMP-23), never more than the person holds" (IMP-22 rule 1). Two tables, one per delegation, each taken key by key from the role's row in SA-06 v3.1 §10b; no wildcard. Neither delegation ever holds an export, a professional approval, a send key, a settings or automation key, or `agent/sqr:verify`. **For the Owner's delegation this matters most: the persona never holds any Owner-only action or Owner-only role check.**

*The Owner's delegation.* The Owner holds "Every key, including Owner-only" (SA-06 v3.1 Appendix C, 259 keys).

| The delegation may use (each `Y` in the Owner column, SA-06 v3.1 §10b) | For which steps |
|---|---|
| read cases, clients, documents, notes, the timeline and the questionnaire state (`agent/case:view.all`, `agent/case:show`, `agent/client:view.all`, `agent/client:show`, `agent/document:list`, `agent/document:show`, `agent/note:list`, `agent/timeline:list`, `agent/sqr:view`, `agent/communication:view`) | every duty reads before it proposes |
| read the dashboards and the compliance view (`agent/report:view.all`, `agent/report:view-compliance`) | 2.1 the deadline list; 2.5 the weekly note |
| read automations, their run history and the Minder's watches (`agent/automation:list`, `agent/automation:show`, `agent/automation:view-history`) | 2.1 (the Active watches view, AG-11 v1.11 §3.4) |
| read the import list, batch detail, dry-run and result reports (`agent/import:view-report`) | 2.3 |
| read the governance registers: consent, retention, legal hold, data-subject requests, breach (`agent/governance:read`) | 2.4 |
| read the published pack content the firm is entitled to (`agent/pack:read`) and the firm settings (`agent/settings:list`) | 2.1, 2.2, 2.4 (the pack's key-date types and lead times; the firm's timing values) |
| create a task and an internal reminder (`agent/task:create`, `agent/reminder:create`, `agent/reminder:list`, `agent/task:view.all`) | 2.1, 2.2, 2.4 internal tasks and reminders |
| drafting needs no key: a draft is approved later under the approver's own key ("Approval of a pending draft is checked at approve time against the sending key, not against the recipe author's rights", AG-10 v1.9 §10, as cited in `case-assistant.md` §1) | 2.2, 2.4, 2.5 |

| The Owner's delegation never holds (though the Owner does) | Why |
|---|---|
| the six never-delegable Owner-only keys (`agent/firm-data-export:request`, `agent/firm-profile:manage`, `agent/payment-rail:connect`, `agent/subscription:cancel`, `agent/support-access:manage`, `agent/support-access:revoke`) and `agent/document:dispose` | "the five SA6-D5 actions" (SA-06 v3.1 Appendix C); IMP-27 (no export, no deletion, no settings) |
| the Owner-only role checks with no key: switching Team safeguards off or adjusting a part, nominating the backup approver, switching supervised client messages off, choosing who approves AI-written client text, the first AI switch-on (SA-06 v3.1 Appendix C: "Owner-only role checks with no key") | the persona is not the Owner; a delegation "takes no seat" and is not an identity (IMP-1) |
| the professional approvals (`agent/case:form-approve`, `agent/case:review-approve`, `agent/case:waive-deficiency`, `agent/retainer:countersign`) and `agent/case:reopen` | "Owner + Case Manager only (5)" (SA-06 v3.1 Appendix C); IMP-1 rule 5: a persona "can never hold an approval permission" |
| `agent/sqr:verify` | approving a value is the verification (AG11-D10) and is a person's act; a proposed key date is approved under it (AG-9-51) |
| every export (`agent/data-export:request`, `agent/case:export`, `agent/client:export`, `agent/report:export`, `agent/sqr:export`, `agent/communication:export`, `agent/billing:export`, `agent/prospect:export`, `agent/retainer:export`) | G16 never exports; `agent/data-export:request` is the per-individual package the Owner runs by hand (2.4) |
| every settings and automation key (`agent/settings:edit`, `agent/notification-policy:edit`, `agent/security-policy:manage`, `agent/firm-credential:manage`, `agent/staff:manage`, `agent/role:assign`, `agent/role:manage`, `agent/automation:create`, `:edit`, `:enable`, `:delete`, `:simulate`, `:run`, `:use-recipe`, `:manage-minder`, `:configure`, `:configure-ai`, `:set-autonomy`, `:view-deadletter`, `:retry-deadletter`, `agent/firm-capability:manage`) | IMP-23, IMP-27; `arm_minder` is an AG-11-2 action but sits under `agent/automation:manage-minder`, so the persona never arms a watch (2.1) |
| the import acts (`agent/import:run`, `agent/import:undo`) and the governance writes (`agent/dsr:manage`, `agent/consent:manage`, `agent/legal-hold:manage`, `agent/retention-policy:manage`, `agent/breach:manage`) | "Nothing written before the dry-run" and the Owner's attestation (AG-18 BR-1, AG-18-49); the registers are a person's records (SA-11 §3.8) |
| `agent/case:assign`, `agent/task:assign`, `agent/task:bulk`, `agent/case:edit`, `agent/client:edit`, `agent/case:milestone-record`, `agent/case:record-decision`, `agent/case:submit`, `agent/communication:send-email`, `agent/communication:send-message`, `agent/prospect:create`, `agent/prospect:convert`, `agent/prospect:sequence`, `agent/note:share-with-client`, every `agent/portal:*` key | each is a person's act in section 3 or 4; the persona proposes and the person does it by hand (AG-11-58; G4) |

*The Case Manager's delegation.* The Case Manager holds "All case work incl. approvals, assign, export, dashboards; no staff/role/settings/billing config" (SA-06 v3.1 Appendix C, 157 keys).

| The delegation may use (each `Y` in the CaseMgr column, SA-06 v3.1 §10b) | For which steps |
|---|---|
| the same reads as above where the Case Manager holds them: `agent/case:view.all`, `agent/case:show`, `agent/client:view.all`, `agent/client:show`, `agent/document:list`, `agent/document:show`, `agent/note:list`, `agent/timeline:list`, `agent/sqr:view`, `agent/communication:view`, `agent/report:view.all`, `agent/report:view-compliance`, `agent/automation:list`, `agent/automation:show`, `agent/automation:view-history`, `agent/pack:read`, `agent/settings:list` | 2.1, 2.5 |
| `agent/task:create`, `agent/task:view.all`, `agent/reminder:create`, `agent/reminder:list` | 2.1 internal tasks and reminders |

| The Case Manager's delegation never holds | Why |
|---|---|
| the five approvals above and `agent/sqr:verify` (the Case Manager holds them) | IMP-1 rule 5; AG11-D10 |
| `agent/case:assign`, `agent/task:assign`, `agent/task:bulk`, `agent/automation:run`, `agent/report:schedule`, `agent/case:edit`, `agent/case:milestone-record`, `agent/case:record-decision`, `agent/case:submit`, `agent/communication:send-email`, `agent/communication:send-message`, `agent/prospect:*` writes | a person's acts; reassignment after an orphaned deadline is the Case Manager's hand (2.1 step 6) |
| every export the Case Manager holds (`agent/case:export`, `agent/client:export`, `agent/report:export`, `agent/data-export:request`, `agent/sqr:export`, `agent/communication:export`, `agent/prospect:export`, `agent/retainer:export`) | G16 |
| `agent/import:*`, `agent/governance:read`, `agent/dsr:manage` and the other register keys | the Case Manager does not hold them (SA-06 v3.1 §10b: Owner and Admin only); so W-15 and W-16 are not in this delegation |

**What stops a run (IMP-35, Proposal, with the product rules it rests on).** A run stops, and any item it has waiting stays visible but cannot send, when: the client is paused (items "SHALL be marked **"client paused"** and SHALL NOT be sendable", AG-11-101; a "Not started" client never receives a client-facing action, AG-11-87, which matters for every imported client in 2.3); the case closes or is withdrawn (AG-7-34; AG-7-50), **except** that standard deadline reminders on recorded dates "keep working after the case closes" (AG-7-34), so the Deadline watch keeps listing them; a person stops it (audited, reason optional, IMP-35); the delegation ends because the Owner or the Case Manager ended it, was deactivated or suspended, the firm switched AI off, or the platform emergency stop tripped (IMP-1 rule 4; AG-11-45; IMP-8). A setting change never sends or executes an item already waiting (AG-16-37). The "retainer ended" event is Unknown (`case-assistant.md` §9 G-22). The Owner's and the Case Manager's runs are separate runs, each under its own delegation.

### 1.1 W-02 Deadline watch (Deadline Guardian; the hook)

- **What the product already does, and the persona only references.** The Minder "reminds the **file owner** (the person responsible for the case) as the date nears, with no automation to switch on and no plan upgrade needed" (AG-11 v1.11 §3.4); its cascade re-evaluates the live file before each step and disarms when the date is met (AG-11-18); where escalation is on, it alerts "the firm's users who can reassign cases (`agent/case:assign`) 2 days before a standard deadline and on the day" (AG-11-19); where at-risk marks are on, "on breach the Minder SHALL mark the case **at-risk** and record an **at-risk event**" (AG-11-19); the two Release 1 recipes "biometrics countdown" and "PR card / status expiry watch" send client-facing template reminders and are on by default (AG-11-106); an orphaned deadline creates an unassigned task and notifies the users who can reassign cases: "<file> — <deadline> — no active owner. Reassign?" (AG-13-66). **All of this is mode AUTOMATION, not metered, and the persona never repeats it** (the Lead's call, 10 Oct; double-run guard IMP-35).
- **Trigger.** Scheduled (AG-11-5): once per working day per delegation in the firm's timezone (AG-11-40), early in the day (Assumption: the firm's business hours). On demand (AG-11-7): the Owner or the Case Manager asks for the list. On `deadline.approaching` (AG-11-4) and on the Minder's own transitions (`MinderWatch.status` ARMED / ESCALATING / SATISFIED / BREACHED, AG-11 v1.11 §7) for the *slipping* mark.
- **Recipe.** The persona's own *deadline list* recipe (Proposal, IMP-10): one internal list per delegation built by rule from the Minder's watches, the Needs you items linked to a deadline (`linkedDeadlineAt`, `urgent`, AG-11-100), overdue items (AG-11-59) and unassigned items (AG-11-55), with the Practice expert's *why* line per item (catalogue §2.7; the expert never acts). The **Minder is "Specified, not built"** (catalogue D5), so today the list has nothing to read.
- **Autonomy.** Internal only: the list and its tasks are internal actions (`AUTO`, AG-11-52). It sends nothing to a client. A proposed derived date (step 4) is a value and waits for a person (`APPROVE`, the AG-9-51 pattern).
- **When AI is off or the provider fails.** Nothing in this duty needs a model except the *why* words: the list is built by rule and delivered without them; every standard reminder, cascade step and client recipe is the product's and keeps running (AG-11-48; AG-16 BR-18).

### 1.2 W-14 Lifecycle Keeper

- **Trigger.** A decision is recorded (`case.decided`, AG-07 v2.7 §3.9) and the case enters After decision, where "the case's clocks and tasks keep running" (AG-07 v2.7 §3.7); a key date is registered on a closed file (reminders "keep working after the case closes", AG-7-34); scheduled (AG-11-5) against the pack's key-date types, within the pack's lead time.
- **Recipe.** The persona's own *next moment* recipe, Proposal (catalogue W-14 "New": an off-by-default, consent-checked re-engagement recipe). The product's "PR card / status expiry watch" recipe already sends "client-facing reminders ahead of a registered expiry date" (AG-11 v1.11 §3.5) and is referenced, not repeated. Which moments exist ("permit expiry, PR card, citizenship, residency obligation", `../ai-organisation.md` §2.4) is pack content (Content).
- **Autonomy.** The re-engagement draft is AI-written client text: Ask me first (`APPROVE`), floor (AG-11-53), approver per the firm's AI-text setting (AG-16-46). The recipe is "off by default" (catalogue W-14 "New") and the Owner switches it on by hand (`agent/automation:enable`, `agent/automation:use-recipe`, AG-11 v1.11 §10). At send time the consent gate applies per recipient (AG-11-37; BR-8); whether a re-engagement is transactional or marketing is a counsel question (`../../proposals.md` lifecycle row of 9 Oct). Opening an opportunity is a person's click: a reopen "**creates a new Prospect (a new opportunity)**" (AG-02 v1.9 §3.10) and no AG-11-2 action creates a prospect.
- **When AI is off or the provider fails.** The next-moment list is still built by rule from the pack's key-date types and the recorded dates; no draft is written; the Owner writes the message by hand (a normal manual send, AG-11-79).

### 1.3 W-15 Migration Mapper

- **Trigger.** The Owner creates an import batch and uploads a source file (AG-18 v1.2 §3.0, §3.1); the batch reaches the mapping step (§3.2). Only under the Owner's delegation (`agent/import:view-report`).
- **Recipe.** The persona's own *mapping proposals* recipe, Proposal (catalogue W-15 "New": "AI-proposed column and value mapping"; "key dates from notes"; "a 'could not map' report"). The product already groups look-alike program names and "MAY **suggest** a program for a group (exact or near match)" (AG-18-10), classifies imported documents with the Reader (AG-18-33) and registers imported key dates with the Minder (AG-18-25): all referenced, mode AUTOMATION.
- **Autonomy.** Every mapping is a proposal; "nothing SHALL be written from an unconfirmed suggestion" (AG-18-10) and "No target record is written until a dry-run of the same file and mapping has completed and the importer has confirmed" (AG-18 BR-1). The dry-run, the attestation ("the **Owner** SHALL record an **attestation** that the firm has the right to transfer the data", AG-18-49), the run, the undo and "Start client automations" are the Owner's acts under `agent/import:run` and `agent/import:undo`; the persona holds neither. A key date pulled from a legacy note is a proposed value under the AG-9-51 pattern (`APPROVE`; `agent/sqr:verify`).
- **When AI is off or the provider fails.** The Owner maps columns by hand (AG-18 v1.2 §3.2); the product's own near-match suggestions are rules and keep working; documents without a manifest go to the review list (AG-18-36).

### 1.4 W-16 Privacy Clerk

- **Trigger.** A client raises a data-subject request from the portal: "a `DsrRequest` of type ACCESS / CORRECTION / ERASURE / PORTABILITY on the SA-11 statutory clock" (CP-8-15); a request arrives by email or message and a person records it in the register (SA-11 v2.7 §3.8: "requests raised by clients (via the portal — the firm-side touchpoint) or by firms on a client's behalf"); a consent withdrawal (CP-8-13). Only under the Owner's delegation (`agent/governance:read`).
- **Recipe.** The persona's own *privacy request* recipe, Proposal (catalogue W-16 "New": "triage and drafting; the what-the-law-stops checklist"). The register, the clock, the hold and floor checks and the export engine are SA-11's (SA-11-27, SA-11-28; CP-8-16).
- **Autonomy.** The task and the reminder are internal (`AUTO`). The response to the client is AI-written client text: Ask me first (`APPROVE`), floor. The export is run by a person under `agent/data-export:request` (AG-16-21: "a separately-permissioned ... and separately-audited action"); the disposal by a person under `agent/document:dispose`; the register entry by a person under `agent/dsr:manage`. Identity verification stays human (catalogue W-16).
- **When AI is off or the provider fails.** The register still runs its clock (SA-11-27); the Owner writes the response by hand; the checklist of what the law stops is a rule over the hold and retention registers, not a model, and is still produced.

### 1.5 W-18 Report Narrator

- **Trigger.** Scheduled (AG-11-5): once a week per delegation, at a day and time in the firm's timezone (Assumption: Monday morning), or riding on a scheduled report the person already configured (`ReportSchedule`, AG-14-23). On demand (AG-11-7).
- **Recipe.** The persona's own *weekly note* recipe, Proposal (catalogue W-18 "New": "the narrative"). The Drafter writes words around numbers the Reporter computed; it never computes one (AG-14 BR-12: a metric "renders an explicit **empty/zero state with context** ... never a guessed or interpolated value"; catalogue G10).
- **Autonomy.** Internal; delivered to the delegating person only (`AUTO`). Widening the note to other staff is the person's act, or, if the firm wants the persona to send it to the schedule's recipients, Ask me first by the schedule owner (Proposal, a conservative reading of IMP-28(b); section 11). Never a client-facing message.
- **When AI is off or the provider fails.** The dashboards and scheduled reports are the product's (AG-14 v1.10 §3.6, §3.9) and keep running; no narrative is written.

---

## 2. What it does, step by step

**How to read the tables.** *Action* is from the Conductor's closed list (AG-11-2: `send_mail`, `send_message`, `send_notification`, `create_reminder`, `send_reminder`, `create_task`, `change_stage` for prospects only, `assign`, `arm_minder`, `read_document`, `sort_message`, `draft_message`, `check_consistency`) or a rule the engine already evaluates (AG-11-10 conditions; the Minder's cascade and satisfaction logic, AG-11-17 to AG-11-19; the import engine's checks, AG-18-12 to AG-18-15; the governance registers' clocks, SA-11-27). A step with no existing action, Doer or pack rule behind it is marked **Proposal** and listed in section 9. *Doer or rule* uses the sources' names (Minder, Reminder, Tasker, Notification, Mailer, Messenger, Reader, Drafter; the Reporter is AG-14's read-and-aggregate layer; the import engine is AG-18's). A persona proposes values and drafts; it never writes a verified value, a register, a mapping or a setting. Model output "can propose *values* (a date, a type, a draft), never *actions*, recipients, addresses or permissions" (IMP-26 rule 1); "models SHALL have no tool access" (AG-11-94). *Autonomy* uses the screen words with the internal name in brackets (AG-11-51). *Recorded:* the audit entry (AG-11-43), the run (AG-11-34), the AI run log entry (AG-11-72) and, Proposal, the delegation reference and the mode marker PERSON / DELEGATED / AUTOMATION (IMP-1, IMP-2). Plain words first, the product's internal name in brackets.

### 2.1 W-02 Deadline watch

*In plain words.* The product's Minder already watches every registered date, reminds the file owner, and, where the firm has switched the parts on, alerts the managers two days before and marks a missed date at risk. The Firm assistant adds the oversight the Owner and the Case Manager do by hand today: each working morning it reads every watch, every approval that is overdue or tied to a government date, and every file with no active owner, and puts one list in front of each of them, file by file, with the reason beside each line. It marks a date as slipping when the work that would satisfy it has not started inside the pack's lead time. It opens an internal task where a person must act (reassign a file that lost its owner), and it proposes a derived date where the pack's rule gives one (a landing deadline from a medical and a passport validity) for a person to approve before the Minder watches it. It never arms a watch, never alerts anyone the firm's settings would not alert, and never counts anything per person.

| # | Action | Doer or rule | Reads | Proposes / writes | Autonomy and floor | Recorded | Source |
|---|---|---|---|---|---|---|---|
| 1 | Register and watch the dates (product behaviour, referenced) | Minder: any module registers a standard deadline; the watch has a status (`MinderWatch.status` ARMED / ESCALATING / SATISFIED / BREACHED), a next step (`nextStepAt`) and an at-risk flag (`atRisk`) | the case's recorded dates (AG-07 v2.7 §3.3); imported key dates (AG-18-25); approved letter dates (AG-9-51, AG-11-108); LMIA dated items (AG-17-73) | the reminders to the file owner; the T-2 and T-0 alerts where escalation is on; the at-risk mark where that part is on | the Minder's own; "With both off, the Minder reminds the **file owner only**" (AG-11-49) | run history per step (AG-11-34); mode AUTOMATION | AG-11-47; AG-11-19; AG-11 v1.11 §7 |
| 2 | Open the day's run and read the watches | Rule: delegation active, AI on; read the Active watches view ("every armed Minder, its next step, its at-risk status — per case and firm-wide for the manager", AG-11 v1.11 §3.4) | the watches the person may see; Needs you items with a linked deadline (`linkedDeadlineAt`, `urgent`); overdue and unassigned items (AG-11-55, AG-11-59); the compliance view's upcoming and missed lists (AG-14-17) | a run record *started* | internal | run record; audit entry with the delegation reference; mode DELEGATED | IMP-35, IMP-1 (**Proposal**); AG-11-55; AG-14-17 |
| 3 | Build the deadline list | Rule (IMP-10): deadlines within the pack's lead time, soonest first; overdue approvals; deadline-linked approvals due within 2 working days (AG-11-100); unassigned items; at-risk files **only where at-risk marks are on** (AG-14-17: "at-risk items only where the firm has switched at-risk marks on"); one line per file, never a count per person (AG-14 BR-15: no "staff-monitoring metrics"; AG-11-49) | step 2 | an internal list with the Practice expert's *why* line per item (catalogue §2.7); delivered by `send_notification` to the delegating person | internal, Send automatically (`AUTO`) | AI run log row for the words only (Drafter); the list itself is reproducible (IMP-37); mode DELEGATED | **Proposal** (the persona's recipe; catalogue W-02 "Job"); G-2 (no Note action) |
| 4 | Mark a slipping date | Rule: a watch ESCALATING, or inside the pack's lead time, whose satisfaction condition is unmet and whose linked task is Open with no activity (AG-13 v1.12 §3.1: "Overdue" is derived in the firm timezone) | the watch; its task; the case timeline | the line is marked *slipping* in the list; nothing else happens | internal; **no alert beyond the delegating person's own list**: where escalation is off, "nobody above the file owner is alerted and no case is marked" (AG-11 v1.11 §3.4), so the mark is a reading aid for the person who already holds `agent/case:view.all`, and it never becomes a notification to anyone else | run; mode DELEGATED | **Proposal** (the slipping rule and its threshold, Content for the lead time); section 11 decision 3 |
| 5 | Propose a derived date | Pack rule (**Content**, not authored): a date the pack derives from others ("derived dates (landing deadline from medical and passport validity)", catalogue W-02 "New"); the rule computes, the persona proposes, a person approves | the verified values the rule needs (AG-08 v1.7 §7) | a proposed key date with the rule and inputs as provenance, in a Needs you item of kind proposed value (`itemType` PROFILE_VALUE) | Ask me first (`APPROVE`); approval "SHALL need the same permission as adding that key date by hand and ... `agent/sqr:verify`" (AG-9-51); only then "registered with the Minder" | approval item; audit of the person's decision; mode DELEGATED for the proposal, PERSON for the approval | **Proposal** + **Content** (catalogue W-02 "New"; AG-9-51 pattern; G10 never computes outside a pack rule) |
| 6 | A file with no active owner | Tasker (`create_task`) to the delegating person: *Reassign <file> before <deadline>*; the product's own notification already went to users who can reassign (AG-13-66) | the unassigned task the Minder created (AG-11-47; AG-13-66) | the task; the file is listed under *no active owner* | internal (`AUTO`); the reassignment is the person's act under `agent/case:assign` (SA-06 v3.1 §10b: Owner, Admin, Case Manager) | task with its link (`sourceItemRef`); mode DELEGATED; PERSON for the reassignment | AG-13-66; AG-11-45; **Proposal** (the persona's task) |
| 7 | Overdue approvals and the Owner route | Rule: list Needs you items past their due time (AG-11-59) and, for the Owner's list, the month's count of Owner-route approvals (IMP-17(c)) as the Reporter computes it | the queue counts; the Reporter's line | lines in the list; nothing is approved | internal; the persona never approves and never reassigns an item (`agent/case:assign` not held) | run; mode DELEGATED | AG-11-55; AG-11-90; IMP-17(c) (**Proposal**) |
| 8 | Deliver and close | Notification (`send_notification`) to the delegating person | the list | the list in the person's queue, marked AI-assisted where the Drafter wrote the *why* words (IMP-11) | internal | run record *closed*; mode DELEGATED | AG-11-2; IMP-35 |

*What the persona never does inside this duty:* arm or edit a watch (`arm_minder` sits under `agent/automation:manage-minder`); switch escalation or at-risk marks on or off (Owner only, AG-11-83, AG-16-43); alert anyone the settings would not (AG-11-49); mark a case at risk (the Minder's act, AG-11-19); send a client a reminder (the recipes' act, AG-11-106); compute a deadline outside a pack rule (AG-9-52; AG-11-108).

### 2.2 W-14 Lifecycle Keeper

*In plain words.* When a decision is recorded, or a key date sits on a closed file, the Firm assistant works out from the pack's rules what the client's next immigration moment is and when, and keeps it on an internal list for the Owner. Within the pack's lead time it drafts the re-engagement message in the client's language; the product's own expiry-watch recipe sends the service reminder, and the draft waits for whoever may approve AI-written client text and passes the consent gate at send time. It prepares the *open a new opportunity* line; the Owner clicks reopen, which creates a new prospect on the same contact. It never converts, never sends without consent, and the recipe is off until the Owner switches it on.

| # | Action | Doer or rule | Reads | Proposes / writes | Autonomy and floor | Recorded | Source |
|---|---|---|---|---|---|---|---|
| 1 | The decision and after-decision items (product behaviour, referenced) | AG-07: the decision moves the case to Decision then After decision; after-decision items include "the filing's government steps that the pack places after the decision (e.g. landing, PR card, permit check)" | the recorded decision; the pack's after-decision lines | the Minder watches the registered dates; the case "closes itself when its after-decision items are done" (AG-07 v2.7 §3.3) | the product's | audit; `case.decided`; mode AUTOMATION | AG-07 v2.7 §3.7; AG-7-34 |
| 2 | List the next moment | Rule over the pack's key-date types and the recorded dates (**Content**: which moments exist and their lead times) | the client's cases, their recorded dates and outcomes; the pack (`agent/pack:read`) | an internal line per client: *next moment, date, source rule*; no message | internal (`AUTO`) | run; mode DELEGATED | **Proposal** (catalogue W-14 "Job"); AG-11 v1.11 §3.12 |
| 3 | The service reminder (product behaviour, referenced) | Recipe "PR card / status expiry watch": template reminder on the preferred channel within the pack's lead time; skipped for a "Not started" client (AG-11-87) | the registered expiry date | the client reminder | template, Send automatically once "Review your standard messages" is confirmed (AG-11-91); timings firm-editable (AG-11-107) | run with template version and publisher; mode AUTOMATION | AG-11-106; AG-11-87 |
| 4 | Draft the re-engagement | Drafter (`draft_message`) in the client's language (`language`, AG-11-14); the no-guarantee rule (BR-9) | the next-moment line; the client's verified facts the text needs, least data (IMP-21) | a drafted message proposing a conversation about the next step; never a promise | Ask me first (`APPROVE`), floor; approver per AG-16-46; **recipe off by default until the Owner enables it** (catalogue W-14) | AI run log row; approval item of kind AI draft; mode DELEGATED | AG-11-68; AG-10-44; **Proposal** |
| 5 | Send on approval, consent checked | Mailer / Messenger on the preferred channel; the gate "SHALL verify the recipient's **express consent at send time, per recipient** (transactional exempt; unsubscribe halts)" (AG-11-37) | the approved text; the consent record (SA-11-29) | the send, or a skip recorded with its reason; an imported client holds no marketing consent from the import (AG-18-45) | the approved action runs once under its idempotency key (AG-11-57); the class (transactional or marketing) is **counsel's** | message with the AI-written marker; audit; mode PERSON for the approval, AUTOMATION for the gate | AG-11-37; BR-8; AG-18-45; `../../proposals.md` lifecycle row (9 Oct) |
| 6 | Prepare the opportunity line | Rule: a line *reopen as a new opportunity* on the client, for a person | the reply, if any (`message.received`) | nothing is created: a reopen "**creates a new Prospect (a new opportunity)**" by a person's click (AG-02 v1.9 §3.10); no AG-11-2 action creates a prospect | a person's act under `agent/prospect:create` | audit; mode PERSON | AG-02 v1.9 §3.10; AG-02 BR-15; AG-2-47 (conversion is likewise never automatic) |

### 2.3 W-15 Migration Mapper

*In plain words.* When the Owner brings an old practice's spreadsheet or files into the product, the import engine already checks every row, groups look-alike program names and suggests matches, previews what would happen, and writes nothing until the Owner confirms. The Firm assistant adds proposals where the engine has none: which old column means which field, which old value means which allowed value, which legacy note mentions a date the pack watches, and a plain report of what it could not map. The Owner confirms every mapping, attests, runs the batch, decides when to switch the imported clients on, and can undo the whole batch; the persona does none of that.

| # | Action | Doer or rule | Reads | Proposes / writes | Autonomy and floor | Recorded | Source |
|---|---|---|---|---|---|---|---|
| 1 | Upload, scan and map (product behaviour, referenced) | Import engine: templates, free-column mapping, value mapping, program grouping with suggestions "flagged as exact or near, pre-filled, and **confirmed per group**" | the source file | nothing until the Owner confirms | "nothing SHALL be written from an unconfirmed suggestion" (AG-18-10) | audit per batch step (AG-18-54); mode AUTOMATION | AG-18-8 to AG-18-11 |
| 2 | Propose column and value mappings | Drafter (`draft_message`) over the column headers and sample values passed as delimited data (AG-11-94), output checked against the target's row schema (AG-18-12) | the headers; the target's fields and allowed values (AG-18-9) | proposed mappings with a confidence, shown beside the engine's own suggestions; a *could not map* report | proposals only; the Owner confirms each in the mapping screen | AI run log row; mode DELEGATED | **Proposal** (catalogue W-15 "New") |
| 3 | Pull a key date from a legacy note | Reader (`read_document`) on the note text as delimited data (**Gap G-3:** no Doer reads free text that is not a document or a message) | imported notes (AG-18-29) | a proposed key date of a pack-declared type (AG-18-81), with the note as provenance | Ask me first (`APPROVE`); `agent/sqr:verify`; registered with the Minder only after approval (AG-9-51 pattern) | AI run log row; approval item; mode DELEGATED | **Proposal**; AG-18-25; AG-9-51 |
| 4 | Dry-run, attest, run (the Owner's acts) | Import engine: "A **dry-run preview SHALL be mandatory**" (AG-18-15); the Owner's attestation (AG-18-49); past dates default "Past dates: record only, no reminder" (AG-18-74) | the batch | records created QUIET (AG-18-59), shown as "Not started" (AG-18-65); key dates registered with the Minder in the same row (AG-18-25); the Owner's summary "N past dates found — review" (AG-18-75) | a person's acts under `agent/import:run`; the persona holds `agent/import:view-report` only | audit in the firm's log; mode PERSON for confirm, AUTOMATION for the job | AG-18-15, AG-18-49, AG-18-74, AG-18-75 |
| 5 | File imported documents (product behaviour, referenced) | Reader (`read_document`) classifies and proposes the record; unplaced files go to the review list | the files | proposed type and record; review-list items | review until thresholds (AG-11 v1.11 §3.10); "never to a guessed record" (AG-18-35) | AI run log rows; mode AUTOMATION | AG-18-33, AG-18-35 |
| 6 | Start client automations (the Owner's act) | Import engine: preview "by recipe and action type" (AG-18-72), then confirm; released "through the normal scan under the rate caps, never as a burst" (AG-18-73) | the quiet set | nothing by the persona; the Owner's 7-day and 30-day reminders are the product's (AG-18-66) | a person's act under `agent/import:run` | audit; mode PERSON | AG-18-62, AG-18-63, AG-18-66 |

### 2.4 W-16 Privacy Clerk

*In plain words.* When a client asks to see, correct or erase their data, the request lands in the governance register with its legal clock. The Firm assistant opens the Owner's task with the deadline, drafts an internal outline of the answer with a checklist of what the law stops (a legal hold, a retention floor), sets a reminder before the deadline, and drafts the client-facing reply for approval. The Owner verifies the client's identity, runs the per-individual export, records the outcome honestly and sends the reply. The persona never exports, never deletes, never writes the register.

| # | Action | Doer or rule | Reads | Proposes / writes | Autonomy and floor | Recorded | Source |
|---|---|---|---|---|---|---|---|
| 1 | The request and its clock (product behaviour, referenced) | SA-11 register: "requester, firm, type, date received, response deadline, status (`PENDING/IN_PROGRESS/COMPLETED/OVERDUE/HELD`)" | the portal request (CP-8-15) or a person's entry (`agent/dsr:manage`) | the register entry and deadline | the product's; the deadline value is counsel's (SA-11 v2.7 §13 item 3) | audit (chained); mode AUTOMATION or PERSON | SA-11-27; CP-8-15 |
| 2 | Open the task and the reminder | Tasker (`create_task`) *Respond to <type> request by <deadline>* to the Owner; Reminder (`create_reminder`) before the deadline (Assumption: 5 working days before) | the register entry (`agent/governance:read`) | the task; the reminder | internal (`AUTO`) | task; reminder; mode DELEGATED | AG-11-2; **Proposal** (the persona's recipe) |
| 3 | Checklist of what the law stops | Rule over the legal-hold and retention registers: "an active hold SHALL **block archival, disposal, and DSR deletion** of in-scope data" (SA-11-18); "A **deletion** DSR SHALL check **legal holds and retention floors** before executing" (SA-11-28) | the registers (`agent/governance:read`) | an internal checklist: identity to verify (human), holds found, floors found, what can be deleted, what must be kept and why | internal | run; mode DELEGATED | **Proposal** (catalogue W-16 "New"); SA-11-18, SA-11-28 |
| 4 | Draft the internal outline and the client reply | Drafter (`draft_message`) with the checklist as data; never a false "fully deleted" (CP-8-15: "the **honest** hold/floor-aware outcome (never a false "fully deleted")") | steps 1 and 3; the client's language | an internal outline; a drafted reply in the client's language | the reply is AI-written client text: Ask me first (`APPROVE`), floor; approver per AG-16-46 | AI run log row; approval item; mode DELEGATED | AG-11-68; SA-11-28; CP-8-15 |
| 5 | The Owner's acts | A person: verifies identity (human, catalogue W-16); runs the per-individual package under `agent/data-export:request` (AG-16-21); records the outcome in the register (`agent/dsr:manage`); disposal, if any, under `agent/document:dispose`; sends the approved reply (`agent/communication:send-email`) | — | — | each is a person's act; the persona holds none of the keys | audit of each ("every export is audited", AG-16 v1.12 §3.5); mode PERSON | AG-16-21; SA-11-28; AG-09 v1.8 §3.12 |
| 6 | Consent withdrawal (product behaviour, referenced) | SA-11 consent record; "enforced at point of use by the AG-10 send-gate and the Conductor" (CP-8-13) | the new consent record | nothing by the persona; the next-moment list (2.2) shows the client as *no marketing consent* | the product's | audit; mode AUTOMATION | CP-8-13; SA-11-29 |

### 2.5 W-18 Report Narrator

*In plain words.* Each week the Firm assistant turns the Owner's and the Case Manager's dashboards into a short plain-language note: what moved, what is overdue, what is at risk where the firm tracks that, and, for the Owner, how many AI items went through the Owner route this month. Every number is the product's; the words are the writer's and are marked as such. The note goes to the person it was written for; sending it to others is their choice.

| # | Action | Doer or rule | Reads | Proposes / writes | Autonomy and floor | Recorded | Source |
|---|---|---|---|---|---|---|---|
| 1 | Read the dashboards | Reporter: rollups "scoped by the **viewer's record-level permission** server-side" (AG-14-19), here the delegating person's | sales, delivery, compliance tiles (AG-14-5 to AG-14-17); the Owner-route count (IMP-17(c)) | nothing | read | — | AG-14-19; AG-14 BR-2 |
| 2 | Write the note | Drafter (`draft_message`) with the numbers passed as data; a missing metric is said to be missing (AG-14 BR-12: "a metric whose source is unavailable shows "unavailable," not 0") | step 1 | a plain-language note quoting only computed numbers; no per-person figure (AG-14 BR-15) | internal (`AUTO`) | AI run log row; mode DELEGATED | **Proposal** (catalogue W-18 "New") |
| 3 | Deliver | Notification (`send_notification`) to the delegating person, marked AI-written (IMP-11); if the firm wants it on a scheduled report to others, Ask me first by the schedule owner and the report "rendered **with the schedule owner's permission scope**" (AG-14-24); "passport and financial numbers SHALL NOT be put into the content of the email" (AG-14-24) | the note | the note in the person's queue | internal; widening is Ask me first (**Proposal**, section 11 decision 11) | run; mode DELEGATED; PERSON for a widened send | AG-11-2; AG-14-24 |

---

## 3. What it must never do

**By reference.** The hard limits (IMP-27) and the worker blocked list (IMP-23), both Proposal for the founder to ratify (`../ai-organisation.md` §7 decision 6, still open), summarised in the catalogue as G16: never deletes; never makes a billing, payment, refund or trust entry; never exports; never changes users, roles, permissions, settings, the AI switch, Team safeguards or supervision; never signs or countersigns; never holds a professional approval; never moves a case stage (AG-11-16); never creates a lead from an unknown number (AG-10-58); never sends free text to a client; never grants or edits a delegation. Every limit is "enforced on the server at set-up and again at run time like the floors (AG-11-53), not by hiding buttons" (IMP-27).

**Specific to the Firm assistant (from `../ai-organisation.md` §2.4, with the product rule behind each).**

| Never | Why, in the product's words | Source |
|---|---|---|
| Imports, confirms, undoes or switches on an import batch | "No target record is written until a dry-run of the same file and mapping has completed and the importer has confirmed"; the Owner's attestation on every batch with personal data | AG-18 BR-1; AG-18-49; AG-18-63 (`agent/import:run`) |
| Runs the per-individual privacy export or the whole-firm export | the per-individual package is "a separately-permissioned ... and separately-audited action" (`agent/data-export:request`, Owner, Admin and Case Manager by default); the whole-firm export is one of the five Owner-only actions (`agent/firm-data-export:request`); G16 | AG-16-21; SA-06 v3.1 §3.3, §10b; IMP-27 |
| Disposes of or deletes a document | disposal queue "Owner-permissioned"; `agent/document:dispose` Owner-held | AG-09 v1.8 §3.12; SA-06 v3.1 §10b |
| Exports a report | "Every export writes an immutable audit entry" and is a person's egress act under `agent/report:export` | AG-14 BR-9; G16 |
| Opens an opportunity or converts | a reopen "**creates a new Prospect (a new opportunity)**" by a person; conversion "SHALL **not** auto-create a case" and is a person's act | AG-02 v1.9 §3.10; AG-02 BR-15; AG-2-47 |
| Sends a re-engagement without consent | the gate checks "express consent at send time, per recipient"; CASL class is open for counsel | AG-11-37; BR-8; `../../proposals.md` lifecycle row (9 Oct) |
| Computes a deadline or a validity period itself | "SHALL NOT compute a validity period itself"; "The Reader SHALL NOT register a deadline on its own"; derived dates only as pack rules a person approves | AG-9-52; AG-11-108; catalogue G10 |
| Arms, edits or disarms a Minder watch | `arm_minder` sits under `agent/automation:manage-minder`, an automation key; standard deadlines are registered by modules | AG-11 v1.11 §10; AG-11-47 |
| Escalates, marks a case at risk or reports on staff where the firm has not chosen it | "The platform SHALL NOT escalate, mark or report on a firm's staff unless the firm has chosen it"; no "staff-monitoring metrics" | AG-11-49; AG-14 BR-15; AG-13-7 |
| Switches Team safeguards or any part, nominates the backup approver, changes supervision or the AI-text approver | Owner-only role checks with no key | SA-06 v3.1 Appendix C; AG-11-83, AG-11-84; AG-16-42, AG-16-43, AG-16-46, AG-16-49 |
| Approves an item on the Owner route | "approved by Owner — no active holder of the approval permission" is the Owner's own act | AG-11-90; AG-7-68 |
| Reassigns a case, a task or a Needs you item | `agent/case:assign` and `agent/task:assign` are a person's | AG-11-55; AG-13-66; SA-06 v3.1 §10b |
| Writes a consent record, a register entry, a legal hold or a retention policy | "an imported consent column is never written to `ConsentRecord` until legal decides"; the registers are a person's | AG-18-45; SA-11-18, SA-11-27, SA-11-29 |
| Reports a firm to its regulator or calls anything "non-compliant" | "never reports to a regulator, never declares a firm non-compliant and never blocks the firm's own licensed judgement"; product copy "never says "violation", "breach of regulation" or "non-compliant"" | AG-11 BR-34; AG-11 v1.11 §0; AG-16 BR-21; AG-16-50 |
| Lets an internal list, outline or note reach a client | "An internal note can never be exposed by a client-facing path" | AG-13 BR-4 |
| Acts for a deactivated or suspended person | the delegation ends by itself | IMP-1 rule 4; AG-11-45 |
| Repeats a reminder, alert, task or client message the Minder, a seed or the import engine already produced | the double-run guard | IMP-35; AG-11-25 |

**Hidden instructions in client content (IMP-26, Proposal, on AG-11-94).** A legacy note or an imported spreadsheet cell that says *delete this file* or *send the records to this address* is read as text; an address is a value for a person to verify, never a recipient (IMP-26 rule 2); the next action is chosen by a rule from the fixed menu (rule 1); a privacy request from an unverified sender produces only "ask me first" items (rule 4; AG-10-47); the planted-instruction test set runs before every version of the model instructions goes live (rule 5; IMP-5).

**Restricted personal data (IMP-21, Proposal).** The persona passes a model only the fields a step needs; Restricted fields (the founder's open item B-1, Founder Decisions Log v1.5) are never passed, only their status. The deadline list and the weekly note carry record references, not identity numbers; "Passport and financial numbers are never put into the content of emails, WhatsApp messages or notifications" (AG-18 BR-17; the same rule in AG-7-88 and AG-14-24). Previews and reports of an import show personal data in full to those allowed to see the batch (AG-18 v1.2 §3.3); the persona's proposals quote headers and allowed values, not rows.

**What happens when a limit is hit.** (1) A floored action set too low is "treated as `APPROVE`, recording why" (AG-11-53). (2) A blocked action is refused on the server (IMP-27) and the run continues ("Actions are non-fatal to each other", AG-11 v1.11 §3.3). (3) A failure is retried with backoff, then "moved to a **dead-letter** store with full context and SHALL raise a Manager Notification" (AG-11-27). (4) A spend cap: "a runaway run is stopped and parked for a manager to look at, with a notification" (IMP-36, Proposal). (5) A stop condition (section 1). (6) Who is told: the delegating person through their queue; the users who can reassign cases and the Owner for overdue and unassigned items (AG-11-55); the Manager Notification for dead letters. (7) Always recorded: the audit entry with the delegation reference (IMP-1) and the run record state (IMP-35).

---

## 4. Where the person approves

**The rule.** Approval is "human approval by whoever the firm's own settings allow for that role (licensed by default, as the requirements already say)" (AIW-D26); "Approving SHALL require the same permission the owning module requires for the same action done by hand" (AG-11-58). The persona never approves anything (IMP-1 rule 5). Each approval record carries the facts of IMP-17(a) (Proposal).

| What waits | Who approves, in plain words | Evidence: key or setting (by hand, the same act) | Source |
|---|---|---|---|
| A proposed key date (derived by a pack rule, or read from a legacy note) | whoever may add that key date by hand and verify a value: by default the Owner, Case Manager or Case Officer | `agent/sqr:verify` plus the key for the date by hand; then "registered with the Minder" | AG-9-51; AG11-D11(e) |
| The deadline list, the slipping mark, the next-moment list, the checklist, the weekly note | nobody; the delegating person reads them (internal) | — | catalogue W-02, W-18; AG-11-52 internal actions |
| A reassignment after an orphaned deadline | the Owner, the Admin or the Case Manager, by hand | `agent/case:assign` | AG-13-66; SA-06 v3.1 §10b |
| The re-engagement draft | whoever the firm's "Who may approve AI-written client text" setting names, licensed users only by default | AG-16-46; the sending key (`agent/communication:send-email` or `:send-message`); the consent gate at send (AG-11-37) | AG11-D11(a); AG-10-44 |
| Switching the re-engagement recipe on | the Owner, by hand | `agent/automation:use-recipe`, `agent/automation:enable` | AG-11 v1.11 §10; catalogue W-14 |
| Opening the opportunity | a person: reopen creates a new prospect | `agent/prospect:create` | AG-02 v1.9 §3.10 |
| Every import mapping, the dry-run, the attestation, the run, the undo, Start / Pause client automations | the Owner (or the Admin) | `agent/import:run`, `agent/import:undo`; the attestation of AG-18-49 | AG-18-10, AG-18-15, AG-18-49, AG-18-63 |
| The privacy-request reply | the AI-text approver | AG-16-46; `agent/communication:send-email` | AG-10-44 |
| The export, the register entry, any disposal | the Owner (per-individual export also the Admin or the Case Manager) | `agent/data-export:request`; `agent/dsr:manage`; `agent/document:dispose` | AG-16-21; SA-06 v3.1 §10b |
| A client-facing reminder (biometrics countdown, expiry watch) | nobody per send; the firm confirmed the template once; the recipe setting under Advanced decides | AG-11-91; AG-16-36 | AG-11-106 |
| Widening the weekly note to others | the schedule owner | `agent/report:schedule` (the schedule is theirs) | AG-14-24 (**Proposal**) |

**What the approver sees and can do (AG-11-56, AG-11-57).** The dry-run rendering, "why (recipe, trigger, run, record), the provenance of every value and the confidence of any AI output, its age and its due time"; approve, edit then approve, or reject; the edited version is what runs. **Stale items (AG-11-61)** and **never because time passed (AG-11-59)** apply as in `case-assistant.md` §4. **Deadline-linked approvals** are "due no later than 2 working days before that deadline" and, with less time, "due immediately and SHALL be marked **urgent**" (AG-11-100); the deadline list (2.1) shows them first.

**Backup approver and the Owner route.** The Owner "MAY nominate one **backup approver**", who "SHALL receive Needs you items whose approver is suspended or deactivated, and items overdue past their due time" (AG-11-83); if nobody holds the permission, the Owner approves, recorded "approved by Owner — no active holder of the approval permission"; with no active licensed user for an item that needs one, "approved by Owner without a licensed user" (AG-11-90). The persona lists these counts for the Owner (IMP-17(c), Proposal) and never approves. IMP-17(b) is an open founder decision this document does not rely on (section 11).

**Team safeguards (AG-16 v1.12 §3.10).** Escalation and at-risk marks are parts 2 and 3; the switch "is **on automatically when the firm has 5 or more active staff users.**"; "Only the **Owner** may switch Team safeguards off" with a reason; while off at 5 or more staff "the owner is reminded once a quarter" (all AG-16 v1.12 §3.10; the requirements are AG-16-41, AG-16-42). The persona reads the parts' state and shapes its list to them; it never changes them.

---

## 5. What it records

| Record | What it holds | Source | Label |
|---|---|---|---|
| Audit entries | every Needs you decision, inline approval, autonomy change and Team safeguards change (AG-11-43); on the firm's "immutable, append-only, tamper-evident" log, readable firm-wide by holders of `agent/audit:read` (Owner and Admin by default); the persona does not read the audit log itself; the Owner does, by hand | AG-11-43; AG-13 v1.12 §3.5, §10 | Product fact; "tamper-evident" holds while the hash chain stays in Release 1 (IMP-39; AIW-A9) |
| Two more facts on every audit entry the persona touches | mode PERSON / DELEGATED / AUTOMATION and the delegation reference (`delegationId`); the actor stays the named person (FD-16) | IMP-1 | Proposal |
| The AI run log | per model call: Doer, model, prompt version, firm, record, time, outcome (`AiRunLog`); "Append-only; PII held by reference" | AG-11-72; AG-11 v1.11 §7 | Product fact (Specified) |
| Links from the run log to the decision | `delegationId`, `approvalItemId`, `auditLogId`, `runId` required for a persona call | IMP-2(a), (b) | Proposal |
| The run record | persona and version, delegation, scope (firm-wide list, a client, a batch, a request), state, start and end, actions taken, references to the Minder steps, seed runs and import jobs it read, the double-run guard, usage | IMP-35 | Proposal |
| The Minder's own records | `MinderWatch` status and steps; run history per step; the at-risk event | AG-11 v1.11 §7; AG-11-34 | Product fact (Specified, not built) |
| The import batch | state, counts, the Owner's attestation (who, when, wording version), result report, undo state | AG-18-49, AG-18-54, AG-18-21 | Product fact (Specified) |
| The governance registers | the DSR entry and clock, holds, consent records with "timestamp, scope, **locale**, and capturing **form/version**" | SA-11-27, SA-11-18, SA-11-29 | Product fact (Specified) |
| The approval record after AIW-D26 | approver; linked to a credential at that moment (yes / no); the setting in force; the Owner-route wording | IMP-17(a) | Proposal |
| The "AI-written" marker | on the re-engagement message and the privacy reply (messages, IMP-2 "Today"); extended to the lists and the weekly note | IMP-11 | Product fact for messages; Proposal for the rest |
| Retention | AI run log 1 year interim, approval items 2 years after decision "pending SA-11" (AG-11-98); DSR and consent records per the SA-11 category floors (values counsel's, SA-11-14) | AG-11-98; SA-11-13, SA-11-14; IMP-4 | Interim; counsel |
| The firm data export | includes the Needs-you approval history (AG-16-39); IMP-2(d) adds the AI run log and the provenance view | AG-16-39; IMP-2(d) | Product fact; Proposal |

---

## 6. Cost drivers and how we measure it

**Cost drivers per duty (cited, not recomputed).** No cost floor is computed for this persona (`../ai-organisation.md` §2.4 "Charge unit"); the Deadline watch is proposed free as the hook (`../../commercial/price-card.md` page 1), the rest inside the plan. The scenario in `../../commercial/provider-and-cost.md` §3.2 costs a prepared file, not this persona; its only overlapping rows are the Reader's (A1 to A5, imported documents) and the Drafter's (C1 to C2).

| Duty | Model-call drivers (catalogue entry) | What this document adds | Label |
|---|---|---|---|
| W-02 | "messages; Reader on letters" | one Drafter call per delegation per working day for the *why* words; letter reading is the Case assistant's (W-03); the list itself is a rule | Assumption |
| W-14 | "messages; one call per draft" | one Drafter call per re-engagement draft; the service reminders are templates (no model) | Assumption |
| W-15 | "one pass per header and note; Reader per document" | one Drafter pass per batch over headers and sample values; one Reader call per legacy note (G-3); the product's Reader per imported document (AUTOMATION, inside A1 to A5) | Assumption |
| W-16 | "one call per request; negligible volume" | one Drafter call per request for the outline and the reply | Assumption |
| W-18 | "one call per report" | one Drafter call per delegation per week | Assumption |
| Paired expert | "retrieval plus one call per question" | the *why* lines in the deadline list (E1 to E2) | Assumption |

**The numbers.** Unknown for this persona (master §2.4: "Hours saved (Assumption): mostly risk and revenue rather than hours"). Model cost per call on a mid-tier model is in `../../commercial/provider-and-cost.md` §3.4 (every input a ranged Assumption); the reviewer's minutes are "the real cost, not yet measured" (catalogue §1.5).

**What the pilot records (IMP-29, Proposal).**

| Measure | For this persona |
|---|---|
| Catch rate | deadlines listed as slipping or overdue that a person then acted on before the date (IMP-29 "catch rate"); the pilot's headline for the hook (master §2.4) |
| Deadline adherence | the compliance view's own figure (AG-14-17), before and during the pilot |
| Reminders and alerts | reminders sent per file and per deadline type (record-keeping value, catalogue W-02 "Value") |
| Owner-route approvals | per month (IMP-17(c)) |
| Acceptance | mapping proposals confirmed unedited / edited / rejected (W-15); drafts approved unedited / edited / rejected (W-14, W-16) per AG-11-63 |
| Agreement | key dates from notes matched the person's own entry, in shadow mode (IMP-30) |
| Turnaround | privacy requests: received to answered, against the clock (SA-11-27); re-engagement: next moment to a person's click |
| Reliability | provider errors, timeouts, fallback-to-manual rate (AG-11-71) |
| Safety | planted-instruction pass rate (IMP-26 rule 5); items withdrawn (IMP-8); never a per-person figure (AG-11-49) |
| Cost | model calls and cost per run; spend against cap |

**Spend caps that apply (IMP-36, Proposal).** Per firm per month ("a warning at 80 %, a hard stop at 100 %, then the manual path"), per persona run (a runaway run parked for a manager); caps are plan limit rows (IMP-9). Today the product caps concurrent AI jobs per firm and automated messages (AG-11 v1.11 §11; AG-11-38); there is no cap on model spend.

---

## 7. Confirm with counsel / RCIC

1. **Every deadline value.** Which deadlines exist, their lead times, which keep being watched after a case closes, the derived-date rules and the biometrics and expiry reminder timings are pack content ("Minder deadline definitions and default lead-times SHALL be **pack-driven**", AG-11-20) for the Immigration SME: confirm with counsel / RCIC (catalogue W-02 "Values: confirm with counsel / RCIC").
2. **The CASL class of re-engagement.** Whether a message about a client's next immigration moment is transactional or marketing (`../../proposals.md` lifecycle row of 9 Oct; AG-11-37, BR-8); closed-file contact retention (catalogue W-14).
3. **Imported consent and imported data.** An imported consent column "is never written to `ConsentRecord` until legal decides" (AG-18-45, AG-18 §13 Q4); the Owner's attestation wording "SHALL cite no statute" (AG-18-49); what the firm may hold from a previous practice.
4. **The clocks and purposes for privacy requests.** The statutory response deadline per request type (SA-11 v2.7 §13 item 3), the DSR type vocabulary (CP-8-15 four types; SA-11 §3.8 three), the retention floors (SA-11-14, "**confirm with counsel**"), and the honest partial-deletion wording (SA-11-28).
5. **Supervision, delegation and the Code of Professional Conduct (IMP-15, IMP-17).** Whether approval by whoever the firm's settings allow (AIW-D26), with the product never checking a licence (AG1-D19; AG-11-88), meets the regulator's supervision rules; what the Canadian supervision floor is for the Practice Pack (FD-22); whether the record of IMP-17(a) is enough; whether the proposed default pause (IMP-17(b)) is needed. The sections below are from the College of Immigration and Citizenship Consultants Code of Professional Conduct (SOR/2022-128, current to 2026-09-21), verified by the Lead on 10 Oct 2026 at laws-lois.justice.gc.ca; **the mapping is the Lead's reading; counsel has not read it.** s. 19(2)(e): a licensee must "be able to deliver the services to the client using technology that is appropriate and effective" (the Owner's choice to switch AI on, AG-16-35, and to accept the delegation). s. 22(2): the licensee "must ensure that all the necessary documents and information are, as applicable, properly prepared, signed and submitted" (the Deadline watch, 2.1, and the deadline-linked approvals, AG-11-100). s. 22(3): "The licensee must provide timely information to the client in writing concerning the status of their case" (the biometrics countdown and expiry-watch reminders, AG-11-106; the re-engagement notices of 2.2). s. 28(1): confidentiality kept "indefinitely" (the provider terms, AG-11-93; Canada-only processing, AG11-D15; support "SHALL NOT see personal data in an assisted session", AG-18-47; Restricted fields never passed, IMP-21). s. 38(1): a person who assists "is provided with a copy of this Code and is familiar with its contents" and "does not carry out any acts that, if carried out by the licensee, would contravene this Code" (the hard limits, IMP-27; the controlled model instructions, IMP-5; **a counsel question whether s. 38 reaches software at all**). s. 38(2): the licensee "must supervise and assume professional responsibility for any work done by a person who assists", with supervision "adequate for the type of work in question" (Team safeguards, AG-16 v1.12 §3.10; the approval record, IMP-17(a)). s. 38(3): a licensee "may delegate certain aspects of their work to a person who is not a licensee" but must ensure that person "does not provide representation or advice in contravention of section 91" of the Immigration and Refugee Protection Act (the delegation to an Owner or Case Manager who may be unlicensed, section 11 decision 1).
6. **Oversight versus monitoring.** Whether the Owner's own scheduled deadline list (2.1), in a firm that has escalation switched off, is the Owner reading the firm's files or an escalation the firm did not choose (AG-11-49; AG-11 BR-19); section 11 decision 3.
7. **Client notice (IMP-11)** for the re-engagement message and the privacy reply; **retention (IMP-4)**; **privacy of the model call (IMP-21; IMP-7)**; whether a human-approved AI draft is an "automated decision" under Law 25 or PIPEDA (IMP-33, Unknown) — as `case-assistant.md` §7 items 6 to 8.
8. **Assisted migration.** The support-session key (AG-18-79), the written request and the double audit (AG-18-46, AG-18-48), and whether the persona's mapping proposals may run inside a support session at all (SA-2-17 blocked list, as cited in IMP-23).

---

## 8. One worked example, end to end on paper

**Choice of firm and why.** A firm with a team, because this persona's ground is Team safeguards, escalation, at-risk marks, the Owner route and two delegations; the solo firm is the variant (8.1). FD-19 names the beachhead as "Solo and small RCIC practices, 1–5 people" (Founder Decisions Log v1.5); a six-person firm is the first size at which Team safeguards "is **on automatically when the firm has 5 or more active staff users.**" (AG-16 v1.12 §3.10; AG-16-41). Everything below that is not a product fact is **fictional** and marked so; no value is a real person's.

**The calendar.** Day 0 is Monday 2 November 2026 (fictional; the same calendar as `case-assistant.md` §8). Working days are Monday to Friday in the firm's timezone (AG-11-40; AG-16-3). Sunday 15 November falls to Monday 16 November for a business-hours-bounded send ("business-hours-bounded actions defer to the next business window", AG-11 BR-12; Assumption: the firm chose business hours for client nudges). Due times count 2 working days (AG-11-59; AG-16-52). The biometrics date for Client B is Wednesday 18 November (fictional); the Minder's steps fall on T-14 Wednesday 4 November, T-7 Wednesday 11 November, T-2 Monday 16 November, T-0 Wednesday 18 November (AG-11 v1.11 §3.4 cascade; lead times fictional pack values). The ADR response date for Client D is Friday 20 November (fictional). The statutory clock for a privacy access request is **a value for counsel** (SA-11 v2.7 §13 item 3); this example assumes 30 calendar days (fictional Assumption) from Thursday 5 November, so Saturday 5 December, treated as due by the last working day before, Friday 4 December (Assumption); the persona's reminder 5 working days before falls on Friday 27 November.

**The firm (fictional).** Six active staff: the Owner (licensed), the Case Manager (licensed), an Admin (unlicensed), case officers 1, 2 and 3 (unlicensed). Team safeguards is on automatically (six active staff, AG-16 v1.12 §3.10): four-eyes on forms, Minder escalation, at-risk marks, routing to supervisors (AG-16-40). Supervised client messages is on (unlicensed users who can message clients, AG-16-47). The AI switch is on (AG-16-35; a Canada-region provider recorded, Assumption AIW-A3); "Review your standard messages" confirmed (AG-11-91); the biometrics countdown and the expiry watch recipes are on by default (AG-11-106) with two client reminders each, at T-14 and T-7 of the pack lead time (fictional firm timings, AG-11-107); the re-engagement recipe switched on by the Owner (catalogue W-14). Two delegations, both accepted: the Owner's (all five duties) and the Case Manager's (W-02 and W-18), rehearsed with the dry-run on two closed files (AG-11-29) and enabled. The Owner-route count for November so far: 0 (IMP-17(c), Proposal).

**Clients (fictional).** Client B: a PR applicant, case officer 1's file, biometrics due Wednesday 18 November, consented to transactional messages, preferred channel email (AG-10-56 default). Client D: case officer 2's file, an additional-document request (ADR) due Friday 20 November. Client C: a client who asks for a copy of their data. Client E: a client from an old practice whose PR card expires 15 March 2027 (fictional), imported on Day 1.

**Audit modes.** AUTOMATION for the Minder, the seeds, the import engine and the registers; DELEGATED for the persona's own recipes; PERSON for the Owner's, the Case Manager's and the Admin's acts (IMP-1, Proposal).

**Day 0, Monday 2 November. Two morning lists.**

| Step | What happens | Who or what | Record |
|---|---|---|---|
| 0.1 | 08:00 firm time: the Owner's run opens under the Owner's delegation; the Case Manager's run opens under the Case Manager's. Each reads the Active watches view, the Needs you counts and the compliance view within what that person may see (both hold `agent/case:view.all`, `agent/report:view.all`, `agent/report:view-compliance`) | rule (2.1 steps 2 and 3) | two run records *started*; two audit entries, each with its delegation reference; mode DELEGATED |
| 0.2 | Each list (fictional): Client B biometrics Wed 18 Nov (watch ARMED, next step Wed 4 Nov); Client D ADR Fri 20 Nov (ARMED); no overdue approvals; no unassigned items; no at-risk files; Owner's list adds *Owner-route approvals this month: 0*. One *why* line per item from the Practice expert (catalogue §2.7). Delivered to each person's queue by `send_notification`, marked AI-assisted for the words | rule; Drafter for the words; Notification | two AI run log rows (DRAFTER); two notifications; runs *closed*; mode DELEGATED. **Client-facing sends so far: 0** |

**Day 1, Tuesday 3 November. The old practice's files.**

| Step | What happens | Who or what | Record |
|---|---|---|---|
| 1.1 | The Owner creates an import batch, uploads a CLIENT spreadsheet of 120 rows (fictional) and a key-date column; the file is scanned (AG-18-7) | the Owner, `agent/import:run` | audit (AG-18-54); mode PERSON |
| 1.2 | The engine groups three source program names and suggests pack programs, "flagged as exact or near, pre-filled" (AG-18-10) | import engine | mode AUTOMATION |
| 1.3 | The persona proposes mappings for two columns the engine could not place (fictional: *Old ref* → `clientCode`; *Lang* → preferred language) and lists one it could not map (*Agent notes*, free text) in a *could not map* report | Drafter (2.3 step 2) | AI run log row; mode DELEGATED |
| 1.4 | The Owner confirms each program group and each column mapping; runs the dry-run (AG-18-15): 118 create, 2 merge, 0 error (fictional); past key dates default "Past dates: record only, no reminder" (AG-18-74); records the attestation (AG-18-49); confirms the run | the Owner, `agent/import:run` | audit of dry-run, attestation and confirm; mode PERSON |
| 1.5 | The job writes 118 clients and 2 merges, all QUIET (AG-18-59), shown as "Not started" (AG-18-65); Client E's PR card expiry 15 March 2027 is registered with the Minder "in the same row transaction" (AG-18-25); the Owner gets "N past dates found — review" (AG-18-75, fictional N = 4) | import engine; Minder | audit; result report; mode AUTOMATION |
| 1.6 | Nothing is sent to any imported client: every client-facing action is skipped while a record is "Not started" (AG-11-87). The persona's next-moment list (2.2 step 2) now shows Client E: *PR card renewal, 15 March 2027, pack lead time 120 days (fictional) → window opens 15 November 2026* | rule | run; mode DELEGATED |

**Day 2, Wednesday 4 November. T-14 for Client B.**

| Step | What happens | Who or what | Record |
|---|---|---|---|
| 2.1 | The Minder's T-14 step: "create a Tasker task for the case officer + notify them" (AG-11 v1.11 §3.4) to case officer 1 | Minder; Tasker; Notification | run history; task linked to the date (`sourceItemRef`, AG-13-65); mode AUTOMATION |
| 2.2 | The biometrics countdown recipe sends the first client reminder template to Client B on email, after the consent and rate-cap rails (a service reminder, transactional, BR-8) | Mailer (recipe) | run with template version and publisher; mode AUTOMATION. **Sends: 1** |
| 2.3 | Separately, a Case assistant draft reply for another client (case officer 3's file) lands in Needs you for a licensed approver, due Friday 6 November (2 working days) | the Case assistant (not this persona) | approval item (AG-11-60) |
| 2.4 | The persona proposes nothing: the task, the reminder and the client message exist (double-run guard, IMP-35). Tomorrow's lists show Client B at T-13 with the task Open | rule | — |

**Day 3, Thursday 5 November. A privacy access request.**

| Step | What happens | Who or what | Record |
|---|---|---|---|
| 3.1 | Client C requests access to their data from the portal: a `DsrRequest` of type ACCESS on the statutory clock (CP-8-15); the register shows `PENDING` with the deadline (SA-11-27) | portal; SA-11 register | audit (chained); mode AUTOMATION |
| 3.2 | The Owner's persona opens the task *Respond to ACCESS request by Fri 4 Dec* for the Owner and a reminder for Fri 27 Nov (5 working days before, Assumption) | Tasker; Reminder (2.4 step 2) | task; reminder; mode DELEGATED |
| 3.3 | The checklist by rule: identity to verify (human); legal holds found: none (fictional); retention floors touched by an access request: none (an access request deletes nothing, SA-11 §3.8) | rule (2.4 step 3) | run; mode DELEGATED |
| 3.4 | The Drafter writes the internal outline and a drafted reply in Client C's language, waiting for the AI-text approver (licensed by default; the Owner is licensed) | Drafter (2.4 step 4) | AI run log row; approval item of kind AI draft; mode DELEGATED |

**Day 4, Friday 6 November. A case officer leaves.**

| Step | What happens | Who or what | Record |
|---|---|---|---|
| 4.1 | The Admin deactivates case officer 2; the handover prompt lists the open cases "as case officer or reviewer" (AG-1-48); the Admin reassigns two and **skips** Client D's case, which lands in the Unassigned queue (AG-1-50) | the Admin, `agent/staff:manage` | audit (AG-1-46); mode PERSON |
| 4.2 | Client D's ADR watch keeps running; its next step is T-14 for Fri 20 Nov, which fell on Fri 6 Nov: a standard deadline fires on a file "whose owner has been deactivated", so the task is created unassigned and the users who can reassign cases are notified "<file> — <deadline> — no active owner. Reassign?" (AG-13-66) | Minder; Tasker; Notification | unassigned task; notification to the Owner, the Admin and the Case Manager; mode AUTOMATION |
| 4.3 | The Case Manager's persona opens the task *Reassign Client D's case before Fri 20 Nov* for the Case Manager (2.1 step 6); the Owner's persona lists the file under *no active owner* (no second task: the Owner's list is a list) | Tasker (CM delegation); rule (Owner delegation) | task; mode DELEGATED |
| 4.4 | The Case assistant's draft of Day 2 is due today and nobody has decided; it is not yet overdue | — | — |

**Day 7, Monday 9 November. Overdue, reassigned, the weekly note.**

| Step | What happens | Who or what | Record |
|---|---|---|---|
| 7.1 | The Day 2 draft is now past its due time: "Overdue items, and every unassigned item, SHALL escalate to users who hold `agent/case:assign` and to the Owner" (AG-11-55); the Minder reminds its owner (AG-11-59) | Needs you; Minder | escalation; mode AUTOMATION |
| 7.2 | Both lists show: the overdue draft (file-level line, no person named as late: the line names the file and the item, AG-11-49); Client D *no active owner*, ADR Fri 20 Nov; Client B T-9 | rule | two notifications; mode DELEGATED |
| 7.3 | The Case Manager reassigns Client D's case to case officer 3 by hand; the unassigned task follows the file | the Case Manager, `agent/case:assign` | audit; mode PERSON |
| 7.4 | The Case Manager approves the overdue draft (licensed, holds the sending key) | the Case Manager, `agent/communication:send-email` | audit; mode PERSON. **Sends: 2** (the Case assistant's draft, counted here because it is a client-facing send in this week) |
| 7.5 | Weekly note (2.5): for the Owner, from the delivery and compliance tiles (fictional: 14 open cases; 2 deadlines inside 14 days; 1 overdue approval cleared today; 0 at-risk files; Owner-route approvals this month 0); for the Case Manager, the Case Manager dashboard's figures. Each note quotes only computed numbers and names no person | Drafter; Notification | two AI run log rows; mode DELEGATED |

**Day 8, Tuesday 10 November. The imported clients are switched on.**

| Step | What happens | Who or what | Record |
|---|---|---|---|
| 8.1 | The Owner opens "Start client automations" for the batch; the preview counts "by recipe and action type" after the consent gate and rate caps (AG-18-72): fictional *1 expiry-watch reminder due within the lead time (Client E, from 15 Nov), 0 chases*; the Owner confirms; messages are released "through the normal scan under the rate caps, never as a burst" (AG-18-73) | the Owner, `agent/import:run` | audit (actor, scope, counts); mode PERSON |

**Day 9, Wednesday 11 November. T-7.**

| Step | What happens | Who or what | Record |
|---|---|---|---|
| 9.1 | The Minder's T-7 step: "reminder to the case officer" (AG-11 v1.11 §3.4) to case officer 1; the countdown recipe's second client reminder to Client B | Minder; Mailer (recipe) | run history; message; mode AUTOMATION. **Sends: 3** |
| 9.2 | The lists show Client B T-7, task still Open, no biometrics appointment recorded (fictional): marked *slipping* (2.1 step 4). The mark appears only in the two delegating persons' own lists | rule | mode DELEGATED |

**Day 14, Monday 16 November. T-2; the expiry watch.**

| Step | What happens | Who or what | Record |
|---|---|---|---|
| 14.1 | The Minder's T-2 step with escalation on: "alert the firm's users who can reassign cases (`agent/case:assign`)" (AG-11 v1.11 §3.4) for Client B: the Owner, the Admin and the Case Manager are alerted | Minder; Notification | run history; mode AUTOMATION |
| 14.2 | The expiry-watch window for Client E opened on Sunday 15 November; the client reminder, held to business hours, goes out Monday 16 November on email (Client E now ACTIVE since Day 8) | Mailer (recipe) | message with template version; mode AUTOMATION. **Sends: 4** |
| 14.3 | The re-engagement recipe (on): the Drafter writes a message to Client E in their language proposing a conversation about the PR card renewal; it waits for the AI-text approver | Drafter (2.2 step 4) | AI run log row; approval item; mode DELEGATED |
| 14.4 | Case officer 1 records Client B's biometrics appointment and, on Tuesday 17 November, the completion (`biometricsStatus = COMPLETED`, the satisfaction condition of AG-11 v1.11 §3.4); the watch is SATISFIED and "disarm[s] immediately" (AG-11-18); no T-0 step fires on Wednesday 18 November | case officer 1 | audit; mode PERSON; watch SATISFIED, mode AUTOMATION |

**Day 15, Tuesday 17 November. The re-engagement is approved and stopped by the consent gate.**

| Step | What happens | Who or what | Record |
|---|---|---|---|
| 15.1 | The Owner approves the re-engagement draft unedited. At send time the gate checks "express consent at send time, per recipient" (AG-11-37): Client E was imported and "an imported lead holds no marketing consent from the import" (AG-2-59; AG-18-45 for clients). If counsel classes the message as marketing, the send is skipped and the reason recorded; if transactional, it goes. This example takes the cautious branch: **skipped, reason recorded**; the Owner telephones Client E by hand instead (outside the product) | the Owner (approval); the consent gate | audit of the approval (PERSON); action result *skipped: no consent* (AUTOMATION). **No send** |

**Day 18, Friday 20 November. Client D's ADR date; the privacy reply.**

| Step | What happens | Who or what | Record |
|---|---|---|---|
| 18.1 | Case officer 3 has not recorded the ADR response (fictional). T-0: with escalation on, the users who can reassign cases are alerted "on the day" (AG-11-19); at the end of the day the watch is BREACHED: with at-risk marks on, "the Minder SHALL mark the case **at-risk** and record an **at-risk event**" (AG-11-19) | Minder; Notification | at-risk event; mode AUTOMATION |
| 18.2 | The Owner, having verified Client C's identity (human, catalogue W-16), runs the per-individual package under `agent/data-export:request` (AG-16-21), edits one sentence of the drafted reply and approves it; the reply is sent with the delivery note (the package itself reaches Client C through the portal's capability link, CP-8-14); the Owner records the outcome `COMPLETED` in the register | the Owner, `agent/data-export:request`, `agent/communication:send-email`, `agent/dsr:manage` | audit of the export ("every export is audited", AG-16 v1.12 §3.5), the edited approval and the register; mode PERSON. **Sends: 5** |
| 18.3 | The persona's Friday 27 November reminder is cancelled because its reason has gone (AG-11-61 pattern for a reminder: skip-if-stale, AG-13-14) | Reminder | cancelled; mode AUTOMATION |

**Day 21, Monday 23 November. The lists after a breach.**

| Step | What happens | Who or what | Record |
|---|---|---|---|
| 21.1 | Both lists show Client D's case at risk (at-risk marks on, AG-14-17), with the ADR line *missed Fri 20 Nov* and the fix link (the Reviewer's deficiency link, AG-07 v2.7 §3.6); Client B's biometrics line is gone (SATISFIED); Client C's request is `COMPLETED`; Owner-route approvals this month: 0 | rule; Drafter for the words | notifications; mode DELEGATED |
| 21.2 | The Case Manager acts on Client D by hand (the response is recorded by case officer 3 under `agent/case:milestone-record`); the at-risk mark clears when the watch resolves (the Minder's rule) | people | audit; mode PERSON |

**Every client-facing send, Day 0 to Day 21 (one count, reconciled with the audit list).**

| # | Day | What | Kind | Mode |
|---|---|---|---|---|
| 1 | 2 | biometrics countdown reminder 1 to Client B | template (recipe) | AUTOMATION |
| 2 | 7 | the Case assistant's reply draft, approved by the Case Manager | AI draft, approved | PERSON |
| 3 | 9 | biometrics countdown reminder 2 to Client B | template (recipe) | AUTOMATION |
| 4 | 14 | PR card expiry-watch reminder to Client E (deferred from Sunday 15 to Monday 16 November) | template (recipe) | AUTOMATION |
| 5 | 18 | the access-request reply to Client C, edited and approved by the Owner | AI draft, edited and approved | PERSON |
| — | 15 | the re-engagement draft to Client E: approved, then **skipped by the consent gate** | AI draft, approved, not sent | PERSON (approval); AUTOMATION (skip) |

Five sends: three template reminders and two approved drafts. **The Firm assistant itself sent nothing to a client**: its two drafts went out only as a person's approved message, and one of them did not go out at all.

**What the audit trail shows at Day 21 (the lines a regulator would read).** Each line carries the actor, the mode (IMP-1, Proposal), the delegation reference where a persona acted, the time, before and after. In order: two runs opened and two lists delivered on each working day (DELEGATED); the batch created, mapped, dry-run, attested and confirmed by the Owner (PERSON) with the persona's mapping proposals beside the engine's (DELEGATED) and the job's writes and Minder registrations (AUTOMATION); the T-14 task, notification and client reminder (AUTOMATION); the access request registered (AUTOMATION), the Owner's task, reminder, checklist and drafts (DELEGATED); the deactivation and handover by the Admin (PERSON); the orphaned-deadline task and notification (AUTOMATION) and the Case Manager's reassign task (DELEGATED); the overdue escalation (AUTOMATION), the Case Manager's reassignment and approval (PERSON); two weekly notes (DELEGATED); Start client automations by the Owner (PERSON); the T-7 reminder and client message (AUTOMATION); the slipping mark (DELEGATED); the T-2 alerts and the expiry reminder (AUTOMATION); the re-engagement draft (DELEGATED), its approval (PERSON) and the consent skip (AUTOMATION); the biometrics completion (PERSON) and the watch SATISFIED (AUTOMATION); the T-0 alert, the breach and the at-risk event (AUTOMATION); the export, the edited approval and the register entry by the Owner (PERSON); the cancelled reminder (AUTOMATION). Nothing executed because time passed; the five sends above are the only client-facing messages; no line counts a person.

### 8.1 Variant: the same weeks in a solo firm

The one licensed person is Owner, Case Manager, file owner and approver (Chart A). Team safeguards is off (one active staff; AG-16 v1.12 §3.10); escalation and at-risk marks are off, so "With both off, the Minder reminds the **file owner only**" (AG-11-49), no T-2 alert fires, and the breach on Day 18 produces a reminder to the file owner and no at-risk mark (AG-11-19). One delegation (the Owner's); one list a day; the *slipping* mark and the *no active owner* line are reading aids for the only person who could act anyway, so section 11 decision 3 does not arise. No handover (Day 4 does not happen). The Owner approves the re-engagement draft inline when acting, with no Needs you item (AG-11-78), and the consent gate behaves the same. Supervised client messages does not show (no unlicensed user, AG-16-40). The sends are the same five minus the Case assistant's draft, which the one person approves inline (four sends).

---

## 9. Gaps and proposals

Every Proposal in sections 1 to 8 appears here; the Lead lifts cross-persona gaps into `../../assumptions.md`. Shared gaps already listed in `case-assistant.md` §9 are cited by number, not restated.

| # | Gap | Label | Rests on |
|---|---|---|---|
| G-1 | The Minder is "Specified, not built" (AG-11-47); every duty of W-02 reads a record that does not exist; the Charter leaves the watcher open (IMP-41) | Dependency (D5) | IMP-41; catalogue D5 |
| G-2 | No AG-11-2 action creates a Note, so the deadline list, the next-moment list, the checklist and the weekly note are delivered by `send_notification` (= `case-assistant.md` G-2) | Proposal | `../../proposals.md` row of 10 Oct (closed action set extensions) |
| G-3 | No Doer reads free text that is not a document or a message: a legacy note's key date (W-15) has no Reader, Sorter, Drafter or Checker to call | Proposal | new `../../proposals.md` row of 10 Oct (this maker) |
| G-4 | The deadline catalogue, derived-date rules, lead times, after-decision moments and reminder timings are unauthored pack content | Content | catalogue D2; AG-11-20; AG-11-107 |
| G-5 | The *slipping* rule and its threshold | Proposal + Content | 2.1 step 4 |
| G-6 | Whether the delegating person's own scheduled list counts as escalation where the firm has escalation off | Decision for the founder, with counsel | AG-11-49; AG-11 BR-19; section 11 decision 3; new `../../proposals.md` row of 10 Oct (this maker) |
| G-7 | The Admin holds the import and governance keys (SA-06 v3.1 §10b) but the master names only two delegators (Owner, Case Manager) | Decision for the founder | `../ai-organisation.md` §1.5; section 11 decision 2 |
| G-8 | The master card says the privacy export is "one of the five Owner-only actions"; the per-individual package (`agent/data-export:request`, AG-16-21) is Owner, Admin and Case Manager by default; the Owner-only key is the whole-firm export (`agent/firm-data-export:request`). The persona runs neither; the card's wording needs the precision | Correction for the Lead | SA-06 v3.1 §3.3, §10b; AG-16-21 |
| G-9 | The master card cites "AG-14 BR-12" for *never exports a report*; BR-12 is the no-fabricated-numbers rule and BR-9 is the export rule; and cites AG-2-47 (conversion) for *never converts a re-engagement into an opportunity*, where the act is a reopen (AG-02 v1.9 §3.10, BR-15) | Correction for the Lead | AG-14 v1.10 §5; AG-02 v1.9 §3.10, §5 |
| G-10 | AG-17 says escalation and at-risk marks are "off by default"; AG-11 makes them on from 5 staff; AG-11 §0.2 lists the knock-on as Pending | Decision for the team (IMP-41 adopts AG-11's) | AG-11 v1.11 §0.2; AG17-D70, AG17-D81 |
| G-11 | The DSR type vocabulary differs: CP-8-15 has ACCESS / CORRECTION / ERASURE / PORTABILITY; SA-11 §3.8 has access / correction / deletion | Decision for the team | CP-8-15; SA-11 v2.7 §3.8 |
| G-12 | The firm-side screen for the DSR register is not specified: SA-11 §3.8 says "the firm executes within their tenant" and SA-11 §10 says "Firm staff hold **no** `system/*` permission", while SA-06 §10b carries firm keys `agent/dsr:manage` and `agent/governance:read` | Unknown | SA-11 v2.7 §3.8, §10; SA-06 v3.1 §10b; new `../../proposals.md` row of 10 Oct (this maker) |
| G-13 | The statutory clock values and retention floors | Counsel | SA-11 v2.7 §13 items 1 and 3 |
| G-14 | The CASL class of a re-engagement and closed-file contact retention | Counsel | `../../proposals.md` lifecycle row (9 Oct) |
| G-15 | Widening the weekly note beyond the delegating person: Ask me first by the schedule owner (a reading of IMP-28(b)) | Proposal | 2.5 step 3; section 11 decision 11 |
| G-16 | The run record, the delegation record and mode marker, the AI provenance view, the approval record facts, the least-data rule, hidden-instruction defences, spend caps and pilot measures (= `case-assistant.md` G-5, G-6, G-7, G-8, G-16, G-17, G-18, G-19) | Proposal | IMP-35, IMP-1, IMP-2, IMP-17, IMP-21, IMP-26, IMP-36, IMP-29 |
| G-17 | The Owner-route monthly count as a product figure the persona quotes | Proposal | IMP-17(c) |
| G-18 | The deadline list's inputs assume AG-14's compliance view (AG-14-17) and the Minder's Active watches view (AG-11 v1.11 §3.4) exist; the first is in a layer that is new (AG-14 v1.10 §12) and the second belongs to a Doer that does not exist (AG-11-47) | Dependency | AG-14 v1.10 §12; AG-11-47 |
| G-19 | Whether the persona's mapping proposals may run inside an assisted-migration support session | Counsel; team | AG-18-46, AG-18-47; SA-2-17 (as cited in IMP-23) |
| G-20 | The reminder's cancel-when-reason-gone behaviour is specified for approval items (AG-11-61) and as skip-if-stale for reminders (AG-13-14); the persona's privacy reminder relies on the second | Note for Step 3 | AG-13-14 |

---

## 10. Glossary additions

Only terms not already in `../ai-organisation.md` §8 or `case-assistant.md` §10.

- **Standard deadline:** a date a module registers directly with the Minder, with the file owner to remind, "without any automation existing, with no firm set-up and no entitlement" (AG-11-47); never plan-gated (AG-11-48; SA-3-35).
- **Watch (Minder watch):** the Minder's record of one deadline it watches, with a status ARMED / ESCALATING / SATISFIED / BREACHED, a next step and an at-risk flag (`MinderWatch`, AG-11 v1.11 §7). **Satisfaction condition:** the fact that ends the watch (for example biometrics completed, AG-11-17, AG-11-18). **Cascade / T-minus steps:** the reminders and alerts a watch runs as the date nears (T-14, T-7, T-2, T-0; AG-11 v1.11 §3.4).
- **Escalation:** alerting people above the file owner; part 2 of Team safeguards; when on, the users who can reassign cases are alerted 2 days before and on the day, with "no further settings" (AG-16 v1.12 §3.8). **At-risk mark / at-risk event:** part 3; a missed date marks the case at risk and records an event (AG-11-19).
- **Orphaned deadline:** a standard deadline that fires on a file whose owner was deactivated; the task is created unassigned and the users who can reassign cases are notified (AG-13-66).
- **Slipping (date):** this document's mark for a watched date whose satisfying work has not started inside the pack's lead time (Proposal, 2.1 step 4).
- **Derived date:** a key date a pack rule computes from other verified values; proposed, never applied without a person (catalogue W-02 "New"; Content).
- **Next immigration moment:** the pack-defined date after a decision at which the client is likely to need the firm again (permit expiry, PR card renewal, citizenship eligibility, residency obligation); pack content (catalogue W-14; `../ai-organisation.md` §2.4).
- **PR card:** the card a permanent resident of Canada holds, with an expiry date the Canada pack watches (AG-11 v1.11 §3.12 `prCardExpiry`; general knowledge, confirm with the Immigration SME). **PGWP:** a post-graduation work permit, a route the catalogue names (W-14 "Job"; general knowledge, confirm with the Immigration SME). **Residency obligation:** the time a permanent resident must spend in Canada to keep status (general knowledge; confirm with counsel / Immigration SME).
- **Reopen:** AG-02's action that "creates a new Prospect (a new opportunity)" on the same contact (AG-02 v1.9 §3.10; BR-15); a person's click.
- **Import batch:** one run of the import engine over one uploaded source; reported on and undone as one unit (AG-18 v1.2 §3.0). **Attestation:** the Owner's record that the firm has the right to transfer the data, required on every batch with personal data (AG-18-49). **Start / Pause client automations:** the Owner's acts that switch imported records from "Not started" to active and back, after a preview (AG-18-62, AG-18-71). **Could not map report:** this document's name for the persona's list of columns, values and programs it could not propose a mapping for (Proposal).
- **Data-subject request (DSR):** a client's request to access, correct, erase or port their data, tracked in SA-11's register on a statutory clock (SA-11-27; CP-8-15). **Statutory clock:** the legal response deadline, a value for counsel (SA-11 v2.7 §13 item 3). **Legal hold:** a freeze that blocks archival, disposal and DSR deletion (SA-11-18). **Retention floor:** the minimum keeping period per data category, enforced in code (SA-11-13, SA-11-14). **Consent record:** the register entry with "timestamp, scope, **locale**, and capturing **form/version**" (SA-11-29).
- **Per-individual data package:** the export of one client's personal data under `agent/data-export:request` (AG-16-21); distinct from the whole-firm export, one of the five Owner-only actions (SA-06 v3.1 §3.3).
- **Reporter / compliance view:** AG-14's read-and-aggregate layer and its compliance dashboard (deadline adherence, upcoming and missed deadlines, at-risk items only where the firm switched that on; AG-14-17). **Schedule owner:** the person who created a scheduled report; it is rendered "with the schedule owner's permission scope" (AG-14-24).
- **Backup approver:** the one person the Owner may nominate to receive items whose approver is away or that are overdue (AG-11-83; AG-16-49).
- **Deadline list:** this document's name for the persona's internal morning list per delegation (Proposal, 2.1).

---

## 11. Decisions for the founder (and, where marked, for the team)

Every decision this document raises, with the Lead's recommendation. Only the founder ratifies decisions (AIW-D23).

1. **Whose delegation (founder; as `case-assistant.md` §11 decision 1).** The Owner or the Case Manager may be unlicensed; the licence sits with the approver. *Recommend: read AIW-D13 as "a named person" and record it.* Pending.
2. **Two delegators or three (founder).** The master names the Owner and the Case Manager; the Admin holds the import and governance keys W-15 and W-16 read. *Recommend: keep two for Step 2; if the pilot firm's Admin runs migrations, add the Admin as a third delegator in Step 3 under the same rules.*
3. **Oversight versus escalation (founder, with counsel; G-6).** Whether the Owner's or Case Manager's own scheduled deadline list, in a firm with escalation off, is their own reading of files they may already open, or an escalation the firm did not choose. *Recommend: it is their own reading, because the list names files, never people, and reaches only the person who asked for it; counsel confirms against AG-11-49's words.*
4. **The CASL class of re-engagement (counsel; G-14).** *Recommend: ship the recipe off by default (as the catalogue says) and let counsel set the class before any firm switches it on.*
5. **IMP-17(b): pause client-facing preparation while the firm has no active licensed user (founder; `../ai-organisation.md` §7 decision 7).** Not relied on here. *Recommend (as IMP-17): accept; a plain no is fine.*
6. **The hard limits and blocked list (IMP-27, IMP-23; founder; §7 decision 6).** Every "never" in section 3 rests on them. *Recommend: yes, after counsel reads them.*
7. **The Minder in the Charter (founder; IMP-41).** The hook cannot run without the Minder core. *Recommend: the Charter update names the Minder core and Reader letter deadlines as in.*
8. **Escalation default, AG-17 versus AG-11 (team; G-10).** *Recommend: AG-11's (on from 5 active staff as a Team safeguards part), as IMP-41 proposes.*
9. **One DSR vocabulary (team; G-11).** *Recommend: CP-8-15's four types, because the portal is where clients raise them.*
10. **A Doer for free text that is neither a document nor a message (team, the Lead; G-3).** *Recommend: in Step 3, under IMP-10's "extended as needed", allow the Reader to be called on a stored note's text as delimited data, with the same proposal, provenance and approve-equals-verify rules.*
11. **The weekly note's recipients (the Lead's call, for the founder to confirm; G-15).** *Recommend: the delegating person only by default; widening to a schedule's recipients is Ask me first by the schedule owner.*
12. **The two card precisions (the Lead; G-8, G-9).** The privacy export wording and two citations in `../ai-organisation.md` §2.4. *For the Lead at integration; no founder decision.*
13. **The seeded recipes, the Minder's steps and the import engine stay firm automations (the Lead's call, applied; as `case-assistant.md` §11 decision 3).** *Recommend: confirm.*
