# AI carve-out register: Workstream 2, Expat Ready

*11 Oct 2026. One register of every AI-related requirement: what the team's documents already say, what Workstream 2 added on top, where the two overlap, and which words mean different things in different places. This is a reference index, not a second copy. The team's documents stay the only source of truth (README §0 rule 3, AIW-D22).*

**Sources read.**
- The team's documents, from the newest snapshot only: `sources/drive-snapshot-2026-10-11/`.
  - `01-techno-functional`: Doc 1 v1.3, Doc 2 v1.4, Doc 3 v1.4, Doc 4 v1.3, Founder Decisions Log v1.5, RFP v2.0, ADR v1.0.
  - `02-functional-requirements`: agent (AG-01 to AG-18, Agent 00-Overview v1.12, Agent 99-Phasing v1.4, SCOPE-TRIAGE); super-admin (SA-01 to SA-12, SA-01B, SA-06 change note); shared (00-Overview v3.9, 99-Phasing v2.18).
  - `06-program-management` (Charter V1 expanded markdown; the V2 slides carry the same release text).
  - `07-team-documents`: Product Vision v1.0, frozen 2 Aug, and the SA journeys document.
  - The archive was not used.
- Our side, all in `ai-workers/requirements/`:
  - `AW-01-firm-ai-assistants_v0.1.md`. The file name says v0.1; its document control says **v0.6, 11 Oct 2026**.
  - `AW-02-platform-ai-assistants_v0.1.md`. Document control: **v0.8, 11 Oct 2026**.
  - The 33 change notes in `change-notes/`.
- The 9 Oct index in `design/ws2-baseline/` was used as a starting map only. Every ID in it was checked again against the 11 Oct files.

**How this was built (method, stated so it can be checked).**
1. **Pulling the IDs.** A script took every ID that AW-01, AW-02 and the change notes cite. It looked each one up in the 11 Oct files, at the line where the ID is defined. A second script found every requirement line, in the October module files and the Founder Decisions Log, that uses an AI or automation word. Those words were: AI, Reader, Sorter, Drafter, Writer, Checker, Conductor, Doer, autonomy, Needs you, Minder, Reminder, recipe, automation, OCR, extraction, classification, kill switch, Done for you, on behalf, non-human.
2. **Adding the rest of AG-11.** AG-11 (the Conductor module) was taken in full. That added 26 requirements and business rules that carry none of those words.
3. **Rows without an ID.** Section-level statements (for example AG-11 §11, SA-08 BR-1, SA-03 catalogue row 30) were added by hand. So were the July Doc 1 to 4, Overview, Phasing, Charter and Vision statements that have no October twin.
4. **Who wrote what.** The paraphrases, areas and judgements are the author's. The IDs, line numbers, "Used by" and "Status" columns were produced by script from the files, then spot-checked.

**Limits.**
- Doc 1 to 4 were searched by keyword and read at the AI, Doer and identity passages. They were not read line by line.
- Where a July Doc 3 requirement has the same ID as an October module requirement, the October file wins (README §0 rule 11). The July twin is listed only where it differs or has no October twin.
- **135 further team IDs are mentioned only in change-note prose.** They are not AI themselves, not cited by any AW requirement and not changed by any note, so they are not listed here.

**Labels.**
- *Proposal*: a suggested fix from this register. Nothing here edits any other file.
- *Assumption* and *Unknown*: used as in README §0 rule 5.
- "Workstream 2 number": a requirement number that a Workstream 2 change note proposes inside the team's own numbering. It does not exist in the team's files.

**A process note.** The brief for this register said to write this one file and edit nothing else. So no line was added to `PROGRESS.md` and nothing was appended to `proposals.md`. The proposals found are listed in §7, for the Lead to place.

## 1. Plain-English summary

1. **Most of the AI layer's foundations are already in the team's files.** There are 439 AI-related team requirements: 404 numbered, 35 at section level. The biggest groups are the Conductor (120), autonomy and approvals (75), the Minder (57) and the four AI Doers (55). The team's own Product Vision v1.0 already promises "an AI layer … directing the Doers" with human approval.
2. **How Workstream 2 uses them.** It cites 174 of the 439: 91 as written, 83 changed by a change note. The other 265 are not used. It also leans on 225 team rules that are not about AI (permissions, billing, packs).
3. **What Workstream 2 adds.** AW-01 and AW-02 hold 203 requirements. 184 of them build on a team requirement. 18 are NEW, with no team requirement to hang from; all 18 are about AI. 1 has been withdrawn.
4. **Much less is model work than the name suggests.** Of the 202 live AW requirements:
   - 26 describe a task where a model is actually called;
   - 32 are tasks done purely by rules, which ordinary automation could do;
   - 144 are controls: whose behalf the assistant acts on, hard limits, audit, switches and spending caps.
5. **The really new part is the "on behalf of" record.** It records which assistant works for which named person, with which of that person's permissions, and what started each run. FD-16 says the AI has no identity of its own, but the team never defined how acting for a person is recorded.
6. **Duplication risk 1: our change notes use the team's numbering.** They propose 54 new requirement numbers, 9 business-rule numbers and 9 founder-decision rows inside the team's own number ranges. None of these exist in the team's files. Seven of the numbers (AG-12-38/39, AG-14-35 to 39) are already used in July Doc 3 for other things.
7. **Duplication risk 2: rules repeated instead of pointed to.**
   - AG-11-94's rules against hidden instructions in client content are repeated in AW-1-2, AW-1-60 and AW-2-33.
   - The provider-record rule appears in five change notes and two AW requirements.
   - FD-15 (masking) is reaffirmed in seven change notes.
8. **Duplication risk 3: some of our change notes are not AI work.** 33 changes, or parts of changes, cover the team's own product: masking, the signature passcode, trust money, credit notes, employer seats, payment reminder days, status lists. They belong to the team, as questions.
9. **Biggest naming clashes.**
   - "worker" means four things: a foreign worker (AG-17), a background job (Doc 1), a Doer (Agent glossary), and our catalogue entry.
   - "assistant" is a junior human staff member in AG-11's stories, and our AI assistant.
   - "persona" is a human job role in the team's files, and our bundle of AI duties.
   - "agent" means the firm staff console, an Expat Ready support agent, and AI agents.
10. **More naming clashes.**
    - Drafter is the template engine, yet AW-02 calls one AI duty "Pack Drafter".
    - Minder and Reminder: FD-8 folds them into one; the October files keep two; our amendment (AIW-D51) is not yet on Drive.
    - Conductor is the engine in AG-11, "a rule" in the Agent glossary, and plural in SA-12.
    - Filler is rule-based in its own definitions, but AG-07 BR-23 lists it among the AI Doers.

## 2. Register A: the team's own AI requirements

**How to read it.**
- **One row per team requirement**, grouped by area.
- **"AI in own words"**
  - *Yes*: the requirement itself is about AI, the Conductor, Doers, approvals of automated output or Needs you.
  - *No (relied on)*: a product rule that an AW requirement or change note builds on.
- **"Used by (AW)"** lists the AW-01 and AW-02 requirements (§4) whose text cites the ID.
  - *outside §4 only* means the ID is cited only in the business rules, stories, permissions or reference sections.
- **"Status in Workstream 2"**
  - *Changed*: a change note lists the ID under "What it changes" or "Where".
  - *Used as is*: cited, but never changed.
  - *Not used*: neither.
- **Line numbers** are those of the 11 Oct snapshot files. Short forms: `AG-nn vX` = `02-functional-requirements/agent/AG-nn-…_vX_….md`; `SA-nn vX` = `02-functional-requirements/super-admin/SA-nn-…_vX_….md`; Doc 1 to 4 and the Founder Decisions Log are in `01-techno-functional/`; Product Vision v1.0 = `07-team-documents/ExpatReady-V2-Final-Product-Vision_[team member]_2026-09-29.txt`.
- **Business rules** are written with their module (for example "AG-11 BR-9"), because BR numbers repeat across modules.

**Re-check against the 9 Oct baseline.** What changed on the 11 Oct files:
- SA-08 v2.4 no longer lists the Conductor among the Doers. The 9 Oct index recorded SA-08 v2.2 L21 doing so; that clash is gone.
- AG-11 moved to v1.12 (10 Oct). Its requirement numbers did not move.
- AG-01, AG-10, AG-14, AG-15, AG-16, AG-17, SA-03 and SA-06 moved to new versions. Every ID in this register was looked up in those new files.

### A.1 Conductor or automation engine (125 rows)

| Area | Team ID | File, version, line | What it says | AI in own words | Used by (AW) | Status in Workstream 2 |
|---|---|---|---|---|---|---|
| Conductor or automation engine | Agent Overview, AG-11 row | Agent 00-Overview v1.12, L91 | AG-11 scope: Conductor engine, Doers including the four AI Doers, autonomy levels; Release 1. | Yes | — | Not used |
| Conductor or automation engine | AG1-D4 | AG-01 v1.18, L38 | Departed staff leave assignment pools; automations never assign or notify them. | Yes | — | Not used |
| Conductor or automation engine | AG1-D14 | AG-01 v1.18, L48 | Not doing: reminders for unassigned work, smart owner suggestions, split handovers. | Yes | — | Not used |
| Conductor or automation engine | AG-1-47 | AG-01 v1.18, L403 | On deactivation, automations never assign work to or notify the departed person. | Yes | — | Not used |
| Conductor or automation engine | AG-2-12 | AG-02 v1.9, L561 | Every new lead emits prospect.created for the Conductor and raises a routing decision. | Yes | — | Not used |
| Conductor or automation engine | AG-2-28b | AG-02 v1.9, L592 | Conductor-consumed lead events are idempotent; redelivery never repeats side effects. | Yes | — | Not used |
| Conductor or automation engine | AG-2-29 | AG-02 v1.9, L593 | Every stage move emits prospect.stage_changed and survives a downstream automation error. | Yes | AW-01 (outside §4 only) | Used as is |
| Conductor or automation engine | AG-2-31 | AG-02 v1.9, L598 | A library of editable lead sequences; triggers may auto-enrol; Release 1 seeds stated. | Yes | — | Not used |
| Conductor or automation engine | AG-2-32 | AG-02 v1.9, L600 | Sequence steps run through the Conductor and Doers, asynchronous and idempotent. | Yes | — | Not used |
| Conductor or automation engine | AG-2-35 | AG-02 v1.9, L603 | A seeded speed-to-lead sequence sends an acknowledgement and creates an owner call task. | Yes | — | Not used |
| Conductor or automation engine | AG-2-39 | AG-02 v1.9, L610 | Leads idle N days are flagged going cold; the follow-up recipe is off until ticked. | Yes | — | Not used |
| Conductor or automation engine | AG-2-45 | AG-02 v1.9, L624 | Nurture supports long-horizon re-engagement and automatic recycling to an active stage. | Yes | — | Not used |
| Conductor or automation engine | AG-2-56 | AG-02 v1.9, L636 | Speed-to-lead runs in Release 1 on the minimal Conductor, enabled at provisioning. | Yes | — | Not used |
| Conductor or automation engine | AG-2-57 | AG-02 v1.9, L637 | No-show, going-cold and post-consult sequences are Release 1, off until the firm enables. | Yes | — | Not used |
| Conductor or automation engine | AG-2-59 | AG-02 v1.9, L639 | Imported leads start quiet: no automated client-facing send until switched on. | Yes | AW-1-87 | Used as is |
| Conductor or automation engine | AG-02 BR-9 | AG-02 v1.9, L669 | Marketing sends need each recipient's express consent checked at the moment of sending. | Yes | — | Not used |
| Conductor or automation engine | AG-02 BR-19 | AG-02 v1.9, L679 | Imported leads carry provenance, stay unverified and quiet until switched on. | Yes | — | Not used |
| Conductor or automation engine | AG-4-47 | AG-04 v1.5, L518 | Appointment events are emitted to the Conductor, at least once. | Yes | — | Not used |
| Conductor or automation engine | AG-5-38 | AG-05 v1.9, L428 | The Conductor consumes envelope.signed to move the lead to Won and alert the Biller. | Yes | — | Not used |
| Conductor or automation engine | AG-6-11 | AG-06 v1.7, L361 | A Conductor sweep marks overdue installments and invoices and notifies Billing. | Yes | — | Not used |
| Conductor or automation engine | AG-6-12 | AG-06 v1.7, L362 | An editable dunning sequence chases overdue balances via Conductor and stops when paid. | Yes | AW-1-99 | Changed: CN-AG-06 ch. 5 |
| Conductor or automation engine | AG-6-32 | AG-06 v1.7, L394 | On envelope.signed the Biller cuts the first invoice or activates the plan, idempotently. | Yes | — | Not used |
| Conductor or automation engine | AG-6-33 | AG-06 v1.7, L395 | Invoice paid events feed AG-2, AG-14 and the Conductor, idempotently. | Yes | — | Not used |
| Conductor or automation engine | AG-6-35 | AG-06 v1.7, L397 | All billing events are delivered at least once to idempotent consumers. | Yes | — | Not used |
| Conductor or automation engine | AG7-D23 | AG-07 v2.7, L235 | client.created and client.updated are emitted in the standard Conductor envelope. | Yes | — | Not used |
| Conductor or automation engine | AG-7-62 | AG-07 v2.7, L690 | A new deficiency emits deficiency.detected in the Conductor envelope, idempotently. | Yes | — | Not used |
| Conductor or automation engine | AG-7-63 | AG-07 v2.7, L691 | Imported cases are marked imported; their automation state decides what runs. | Yes | — | Changed: CN-AG-07 ch. 2 |
| Conductor or automation engine | AG-7-92 | AG-07 v2.7, L722 | Release 2: assignment rules route new cases by program to a desk, then round-robin. | Yes | — | Not used |
| Conductor or automation engine | AG-8-13 | AG-08 v1.7, L371 | Assigning a questionnaire sends a localised invitation via Conductor, Mailer or Messenger. | Yes | — | Not used |
| Conductor or automation engine | AG-8-33 | AG-08 v1.7, L401 | Questionnaire submission emits sqr.submitted to the Conductor to re-score and advance. | Yes | — | Not used |
| Conductor or automation engine | AG-9-44 | AG-09 v1.8, L541 | The Reader finishing emits document.extracted, idempotent per document version. | Yes | — | Not used |
| Conductor or automation engine | AG-10-22 | AG-10 v1.10, L390 | Every send passes a consent and contactability gate, transactional or marketing. | No (relied on) | AW-1-87 | Used as is |
| Conductor or automation engine | AG-10-24 | AG-10 v1.10, L392 | Unsubscribe halts marketing on that channel everywhere, including the Conductor. | No (relied on) | AW-1-87 | Used as is |
| Conductor or automation engine | AG-10-31 | AG-10 v1.10, L411 | Sequence steps that send run through AG-10's Doers and inherit all send rails. | Yes | — | Not used |
| Conductor or automation engine | AG-10-47 | AG-10 v1.10, L434 | Each inbound message emits message.received with the Sorter's classification. | Yes | AW-1-61, AW-1-91 | Changed: CN-AG-10 ch. 1 |
| Conductor or automation engine | AG-10-53 | AG-10 v1.10, L442 | Imported correspondence is historical, never sent, never sorted, emits no events. | Yes | — | Not used |
| Conductor or automation engine | AG-10-55 | AG-10 v1.10, L444 | Automated client sends are skipped while the record or recipient is Not started. | Yes | — | Not used |
| Conductor or automation engine | AG-10 BR-1 | AG-10 v1.10, L456 | One send path: every message, manual or automated, goes through the same gate and log. | Yes | — | Not used |
| Conductor or automation engine | AG-10 BR-4 | AG-10 v1.10, L459 | Unsubscribe is permanent until re-consent, honoured by the Conductor too. | Yes | — | Not used |
| Conductor or automation engine | AG-10 BR-17 | AG-10 v1.10, L472 | Sequences cannot bypass the send rails because they call the same Doers. | Yes | — | Not used |
| Conductor or automation engine | AG-10 BR-29 | AG-10 v1.10, L484 | Not started blocks every automated client send; manual sends allowed. | Yes | — | Not used |
| Conductor or automation engine | AG-10 BR-31 | AG-10 v1.10, L486 | Proactive WhatsApp follows email's rails: consent, quiet state, floors, caps. | Yes | — | Not used |
| Conductor or automation engine | AG11-D3 | AG-11 v1.12, L33 | A minimal Conductor with a seeded recipe set ships in Release 1. | Yes | — | Changed: CN-AG-11 ch. 10 |
| Conductor or automation engine | AG11-D5 | AG-11 v1.12, L35 | New triggers: message received, document extracted, deficiency detected, profile changed. | Yes | — | Not used |
| Conductor or automation engine | AG11-D14 | AG-11 v1.12, L44 | Core in-house (Conductor, Minder, Doer rules); outside providers only for named rails. | Yes | AW-02 (outside §4 only) | Used as is |
| Conductor or automation engine | AG11-D17 | AG-11 v1.12, L47 | Default waiting times (chase, overdue, deadline lead) firm-editable in Release 1. | Yes | — | Not used |
| Conductor or automation engine | AG11-D18 | AG-11 v1.12, L48 | Release 1 additions: proactive WhatsApp, create-lead click, IMAP, five recipes, letter dates. | Yes | AW-1-45 | Changed: CN-AG-11 ch. 8 |
| Conductor or automation engine | AG-11 §3.0 Conductor and Doers | AG-11 v1.12, L240–249 | The Conductor is the brain, the Doers the hands; Minder is the one new non-AI Doer. | Yes | AW-2-1 | Changed: CN-AG-11 ch. 1 |
| Conductor or automation engine | AG-11-1 | AG-11 v1.12, L553 | One Conductor orchestrates Doers and never does a Doer's work itself. | Yes | AW-1-1 | Used as is |
| Conductor or automation engine | AG-11-2 | AG-11 v1.12, L554 | The closed list of Doer actions the Conductor may dispatch, AI Doers included. | Yes | AW-1-1, AW-1-4, AW-2-1 | Changed: CN-AG-11 ch. 1, 3 |
| Conductor or automation engine | AG-11-3 | AG-11 v1.12, L555 | Conductor, Minder and Doer rules are built in-house; providers only for named rails. | Yes | AW-2-54 | Used as is |
| Conductor or automation engine | AG-11-4 | AG-11 v1.12, L558 | Entity-event triggers across modules, with a named first-class event vocabulary. | Yes | — | Changed: CN-AG-11 ch. 4 |
| Conductor or automation engine | AG-11-5 | AG-11 v1.12, L559 | Scheduled triggers scan entities with an atomic claim so schedules never double-run. | Yes | AW-2-7, AW-2-53 | Changed: CN-AG-11 ch. 5 |
| Conductor or automation engine | AG-11-7 | AG-11 v1.12, L561 | Manual on-demand runs against a chosen entity, permissioned and audited. | Yes | AW-1-110, AW-1-124, AW-2-6, AW-2-44, AW-2-62 | Changed: CN-AG-11 ch. 5 |
| Conductor or automation engine | AG-11-8 | AG-11 v1.12, L562 | All events go through one trigger bus so new events are a thin call. | Yes | — | Not used |
| Conductor or automation engine | AG-11-10 | AG-11 v1.12, L566 | Actions are gated by nested AND/OR conditions with date operators. | Yes | AW-1-4 | Used as is |
| Conductor or automation engine | AG-11-12 | AG-11 v1.12, L568 | The builder previews rules in plain English and can test against a real entity. | Yes | — | Not used |
| Conductor or automation engine | AG-11-13 | AG-11 v1.12, L571 | Each automation runs ordered actions, each naming a Doer and an autonomy level. | Yes | AW-1-1 | Used as is |
| Conductor or automation engine | AG-11-14 | AG-11 v1.12, L572 | Message actions render templates in the recipient's language, with merge-field rules. | Yes | AW-1-82, AW-1-99 | Used as is |
| Conductor or automation engine | AG-11-15 | AG-11 v1.12, L573 | Per-action repeats with interval, maximum and stop conditions, re-checked each time. | Yes | — | Not used |
| Conductor or automation engine | AG-11-16 | AG-11 v1.12, L574 | Actions change_stage (prospects only), assign, arm_minder and send_message are provided. | Yes | AW-1-44, AW-1-92 | Used as is |
| Conductor or automation engine | AG-11-21 | AG-11 v1.12, L589 | A library of prebuilt immigration recipes firms preview and enable; seeds enabled. | Yes | AW-1-13 | Changed: CN-AG-11 ch. 9 |
| Conductor or automation engine | AG-11-22 | AG-11 v1.12, L590 | Seeded recipes at minimum: four Release 1 seeds plus five more recipes. | Yes | — | Changed: CN-AG-11 ch. 10 |
| Conductor or automation engine | AG-11-23 | AG-11 v1.12, L591 | A visual no-code builder for automations (Release 2). | Yes | — | Not used |
| Conductor or automation engine | AG-11-24 | AG-11 v1.12, L592 | Enabling records the library version; later improvements are offered, not imposed. | Yes | AW-1-13 | Used as is |
| Conductor or automation engine | AG-11-25 | AG-11 v1.12, L595 | Runs are at-least-once and every action is idempotent on a defined key. | Yes | AW-1-18 | Changed: CN-AG-11 ch. 9 |
| Conductor or automation engine | AG-11-26 | AG-11 v1.12, L596 | First-run action failures retry with exponential backoff. | Yes | — | Not used |
| Conductor or automation engine | AG-11-27 | AG-11 v1.12, L597 | Exhausted actions go to dead-letter with context and notify a manager. | Yes | AW-1-54, AW-2-9 | Used as is |
| Conductor or automation engine | AG-11-28 | AG-11 v1.12, L598 | A failing action never breaks other actions or the triggering transaction. | Yes | AW-1-10, AW-1-37 | Used as is |
| Conductor or automation engine | AG-11-29 | AG-11 v1.12, L601 | Authors simulate an automation against a real entity with zero side effects. | Yes | AW-1-14, AW-2-8 | Used as is |
| Conductor or automation engine | AG-11-30 | AG-11 v1.12, L602 | Simulation uses the real rule evaluator and dry-runs every Doer. | Yes | AW-1-14, AW-2-8 | Used as is |
| Conductor or automation engine | AG-11-31 | AG-11 v1.12, L605 | Automation lifecycle Draft, Enabled, Disabled, Archived; changes audited. | Yes | AW-1-13, AW-2-8 | Used as is |
| Conductor or automation engine | AG-11-33 | AG-11 v1.12, L607 | Editing a live automation creates a new immutable version. | Yes | — | Not used |
| Conductor or automation engine | AG-11-36 | AG-11 v1.12, L614 | A loop guard prevents infinite re-trigger cascades. | Yes | — | Not used |
| Conductor or automation engine | AG-11-37 | AG-11 v1.12, L615 | Marketing actions check each recipient's express consent at send time. | Yes | AW-1-105 | Used as is |
| Conductor or automation engine | AG-11-38 | AG-11 v1.12, L616 | Per-firm and per-recipient rate caps on automated messages. | Yes | AW-01 (outside §4 only) | Used as is |
| Conductor or automation engine | AG-11-39 | AG-11 v1.12, L617 | Plan-gated recipes hidden without entitlement; standard deadline reminders never gated. | Yes | — | Not used |
| Conductor or automation engine | AG-11-41 | AG-11 v1.12, L621 | Withdrawn by FD-68 (deactivated country automations). | Yes | — | Not used |
| Conductor or automation engine | AG-11-44 | AG-11 v1.12, L626 | Every list and history read is paginated and tenant-scoped. | Yes | — | Not used |
| Conductor or automation engine | AG-11-45 | AG-11 v1.12, L629 | No action assigns to or notifies a deactivated user; the skip is recorded. | Yes | AW-1-11, AW-1-50 | Used as is |
| Conductor or automation engine | AG-11-46 | AG-11 v1.12, L630 | A task for a deactivated assignee is created unassigned so work is not lost. | Yes | — | Not used |
| Conductor or automation engine | AG-11-74 | AG-11 v1.12, L664 | The four agent-native triggers, with the same envelope and idempotency. | Yes | AW-1-70, AW-1-79 | Used as is |
| Conductor or automation engine | AG-11-75 | AG-11 v1.12, L667 | The four Release 1 seeded recipes are enabled at provisioning, audited. | Yes | AW-1-15 | Changed: CN-AG-11 ch. 10 |
| Conductor or automation engine | AG-11-77 | AG-11 v1.12, L671 | Import events run internal actions but skip client-facing ones for quiet records. | Yes | — | Not used |
| Conductor or automation engine | AG-11-87 | AG-11 v1.12, L673 | Client-facing recipe actions are skipped for quiet clients, leads or cases. | Yes | AW-1-19, AW-1-49, AW-1-69, AW-1-105 | Used as is |
| Conductor or automation engine | AG-11-95 | AG-11 v1.12, L706 | Start client automations simulates every recipe on the quiet set first. | Yes | — | Not used |
| Conductor or automation engine | AG-11-99 | AG-11 v1.12, L716 | Waiting times are per-firm values with defaults, editable in Release 1. | Yes | — | Not used |
| Conductor or automation engine | AG-11-106 | AG-11 v1.12, L723 | Five more Release 1 recipes; two service reminders on, three off by default. | Yes | AW-1-15, AW-1-105 | Used as is |
| Conductor or automation engine | AG-11 BR-1 | AG-11 v1.12, L731 | The Conductor never does a Doer's work; all reading and writing go through Doers. | Yes | — | Not used |
| Conductor or automation engine | AG-11 BR-4 | AG-11 v1.12, L734 | Idempotent effects on at-least-once delivery. | Yes | — | Not used |
| Conductor or automation engine | AG-11 BR-5 | AG-11 v1.12, L735 | Retry then dead-letter; never silent, never infinite. | Yes | — | Not used |
| Conductor or automation engine | AG-11 BR-6 | AG-11 v1.12, L736 | One failing action never aborts siblings or the business transaction. | Yes | — | Not used |
| Conductor or automation engine | AG-11 BR-8 | AG-11 v1.12, L738 | Consent gate per recipient at send time for marketing sends. | Yes | — | Changed: CN-AG-11 ch. 13 |
| Conductor or automation engine | AG-11 BR-10 | AG-11 v1.12, L740 | Loop guard bounds automation chains. | Yes | — | Not used |
| Conductor or automation engine | AG-11 BR-11 | AG-11 v1.12, L741 | Rate caps skip and log; nothing silently dropped. | Yes | — | Changed: CN-AG-11 ch. 13 |
| Conductor or automation engine | AG-11 BR-14 | AG-11 v1.12, L744 | Editing creates an immutable version; audit reads the run's version. | Yes | — | Not used |
| Conductor or automation engine | AG-11 BR-15 | AG-11 v1.12, L745 | Simulation has zero side effects. | Yes | — | Not used |
| Conductor or automation engine | AG-11 BR-17 | AG-11 v1.12, L747 | Manual runs are permissioned, audited and idempotent. | Yes | — | Not used |
| Conductor or automation engine | AG-11 BR-18 | AG-11 v1.12, L748 | Deactivated people are never targets of automation. | Yes | — | Changed: CN-AG-11 ch. 13 |
| Conductor or automation engine | AG-11 BR-27 | AG-11 v1.12, L757 | Imported records get internal actions only until switched on. | Yes | — | Not used |
| Conductor or automation engine | AG-11 BR-41 | AG-11 v1.12, L771 | Service reminder recipes on; marketing-like recipes off by default. | Yes | — | Not used |
| Conductor or automation engine | AG-13-8 | AG-13 v1.12, L361 | Completing a task emits task.completed and may advance a Conductor sequence. | Yes | — | Not used |
| Conductor or automation engine | AG-13-60 | AG-13 v1.12, L401 | Conductor calls task and reminder services; AG-13 emits events back. | Yes | — | Not used |
| Conductor or automation engine | AG-13 BR-5 | AG-13 v1.12, L422 | Task completion may emit an event the Conductor consumes. | Yes | — | Not used |
| Conductor or automation engine | AG-13 BR-18 | AG-13 v1.12, L435 | Conductor boundary: no workflow logic in AG-13, no task storage in the Conductor. | Yes | — | Not used |
| Conductor or automation engine | AG-13 BR-19 | AG-13 v1.12, L436 | No person or Conductor assigns a deactivated user; tasks may be unassigned. | Yes | — | Not used |
| Conductor or automation engine | AG-15-32 | AG-15 v1.7, L383 | One-click client nudge plus optional Conductor auto-nudge playbooks. | Yes | — | Not used |
| Conductor or automation engine | AG-15-49 | AG-15 v1.7, L414 | A manual portal invite to a Not started client does not switch automation on. | Yes | — | Not used |
| Conductor or automation engine | AG-16-51 | AG-16 v1.13, L490 | Firm-editable missing-document chase timing with limits. | Yes | — | Not used |
| Conductor or automation engine | AG18-D7 | AG-18 v1.2, L131 | Imports never trigger client-facing automation; internal actions do fire. | Yes | — | Not used |
| Conductor or automation engine | AG18-D9 | AG-18 v1.2, L133 | Imported clients are quiet for client-facing automation until switched on. | Yes | AW-01 (outside §4 only) | Used as is |
| Conductor or automation engine | AG18-D10 | AG-18 v1.2, L134 | Import safety rules: quiet carries over, switch-on preview, verification paths. | Yes | AW-01 (outside §4 only) | Used as is |
| Conductor or automation engine | AG-18-43 | AG-18 v1.2, L395 | An import never fires a client-facing action. | Yes | — | Not used |
| Conductor or automation engine | AG-18-45 | AG-18 v1.2, L397 | Imports never create express marketing consent. | No (relied on) | AW-1-105 | Used as is |
| Conductor or automation engine | AG-18-60 | AG-18 v1.2, L420 | While a record is quiet, no client-facing action is taken from any trigger. | Yes | — | Not used |
| Conductor or automation engine | AG-18-72 | AG-18 v1.2, L434 | The switch-on preview counts sends by recipe and action, after gates. | Yes | — | Not used |
| Conductor or automation engine | AG-18 BR-20 | AG-18 v1.2, L482 | Switch-on is previewed, confirmed and audited. | Yes | — | Not used |
| Conductor or automation engine | SA3-X8 | SA-03 v2.17, L112 | Portal auto-nudge playbooks are a named extra in the catalogue. | Yes | — | Changed: CN-SA-03 ch. 3 |
| Conductor or automation engine | SA-4-59 | SA-04 v2.17, L512 | SA-4 emits billing events that SA-2 consumes. | No (relied on) | AW-02 (outside §4 only) | Changed: CN-SA-04 ch. 4 |
| Conductor or automation engine | SA5-D3 | SA-05 v2.4, L35 | Workflow-blueprint templates later; no duplicate of the automation engine. | Yes | — | Not used |
| Conductor or automation engine | SA-9-13 | SA-09 v2.2, L359 | Queue health per job queue, including automation and reminder queues. | Yes | — | Not used |
| Conductor or automation engine | SA-11-29 | SA-11 v2.7, L387 | Consent records and withdrawals halt downstream processing. | No (relied on) | AW-1-105 | Changed: CN-SA-11 ch. 7 |
| Conductor or automation engine | Doc 1 glossary: Conductor | Doc 1 v1.3, L35 | The Conductor is the workflow and automation engine plus the domain-event bus. | Yes | — | Not used |
| Conductor or automation engine | Doc 3 closed Doer action set (July) | Doc 3 v1.4, L5103 | July closed list of Doer actions, with no AI actions (superseded by AG-11-2). | Yes | — | Not used |
| Conductor or automation engine | Product Vision v1.0 Automation | Product Vision v1.0 (team, frozen 2 Aug), L292 | The Conductor stays deterministic; no model output triggers or decides an action. | Yes | — | Not used |

### A.2 AI Doers (60 rows)

| Area | Team ID | File, version, line | What it says | AI in own words | Used by (AW) | Status in Workstream 2 |
|---|---|---|---|---|---|---|
| AI Doers | AG-2-60 | AG-02 v1.9, L640 | The Sorter files WhatsApp messages from a known number on that lead's timeline. | Yes | — | Not used |
| AI Doers | AG-2-62 | AG-02 v1.9, L642 | Unknown WhatsApp numbers go to the Unmatched inbox; only a person creates the lead. | Yes | — | Not used |
| AI Doers | AG-7-60 | AG-07 v2.7, L688 | Reader-proposed and imported values stay unverified and do not feed the Filler until verified. | Yes | AW-1-43 | Used as is |
| AI Doers | AG-7-61 | AG-07 v2.7, L689 | The Reviewer shows Checker consistency findings as warnings on the case. | Yes | AW-1-15, AW-1-43 | Used as is |
| AI Doers | AG-07 BR-23 | AG-07 v2.7, L750 | AI Doers propose with provenance and confidence; they never decide or fabricate. | Yes | — | Changed: CN-AG-07 ch. 7 |
| AI Doers | AG-8-23 | AG-08 v1.7, L385 | Mapping never silently overwrites a document-verified value; conflicts go to review. | No (relied on) | AW-1-94 | Used as is |
| AI Doers | AG-8-25 | AG-08 v1.7, L389 | Every fact carries its source, including Reader-proposed-and-approved or imported. | Yes | AW-1-94 | Changed: CN-AG-08 ch. 1 |
| AI Doers | AG-8-41 | AG-08 v1.7, L415 | With AI on, Reader values from identity documents are proposed for approval. | Yes | — | Not used |
| AI Doers | AG-8-42 | AG-08 v1.7, L416 | With AI on, the Checker compares answers against identity documents and raises warnings. | Yes | — | Not used |
| AI Doers | AG-8-45 | AG-08 v1.7, L419 | Every Reader and Checker path has a manual equivalent; nothing waits on a Doer. | Yes | — | Not used |
| AI Doers | AG-08 BR-22 | AG-08 v1.7, L448 | Imported values are unverified; a Reader value becomes verified by a person's approval. | Yes | — | Not used |
| AI Doers | AG-08 BR-23 | AG-08 v1.7, L449 | Checker findings are warnings, never locks. | Yes | — | Not used |
| AI Doers | AG-9-3 | AG-09 v1.8, L472 | Bulk upload suggests a checklist item per file, by the Reader where AI is on; always confirmable. | Yes | — | Not used |
| AI Doers | AG-9-11 | AG-09 v1.8, L484 | Document types come from the pack; the Reader may set a high-confidence type automatically. | Yes | AW-1-78, AW-1-120 | Changed: CN-AG-09 ch. 1 |
| AI Doers | AG-9-42 | AG-09 v1.8, L539 | With AI on, each scanned document version goes to the Reader to classify and extract. | Yes | AW-1-15 | Used as is |
| AI Doers | AG-9-43 | AG-09 v1.8, L540 | The Reader extracts values from identity papers, government letters, test results and ECAs. | Yes | — | Not used |
| AI Doers | AG-9-46 | AG-09 v1.8, L543 | A low-confidence Reader field is flagged unreadable, never guessed; manual path remains. | Yes | AW-1-76 | Used as is |
| AI Doers | AG-9-47 | AG-09 v1.8, L544 | Imported documents are classified and filed by the Reader; unmatched go to a review list. | Yes | — | Not used |
| AI Doers | AG-9-52 | AG-09 v1.8, L551 | The Reader proposes language-test and ECA values the pack lists, under normal review. | Yes | AW-1-80 | Used as is |
| AI Doers | AG-09 BR-19 | AG-09 v1.8, L577 | Reader output is always a proposal with provenance and confidence, never guessed. | Yes | — | Not used |
| AI Doers | AG-10-10 | AG-10 v1.10, L370 | Inbound email is matched deterministically first: reply token, sender address, alias. | No (relied on) | AW-1-96 | Changed: CN-AG-10 ch. 1 |
| AI Doers | AG-10-12 | AG-10 v1.10, L372 | Unmatched inbound email lands in the Unmatched inbox, never auto-attached to a guess. | No (relied on) | AW-1-96 | Changed: CN-AG-10 ch. 1 |
| AI Doers | AG-10-15 | AG-10 v1.10, L377 | The AI drafter (Drafter Doer) proposes email text the person owns; never promises outcomes. | Yes | AW-1-46, AW-1-84, AW-1-90, AW-1-91 | Changed: CN-AG-10 ch. 3, 4 |
| AI Doers | AG-10-37 | AG-10 v1.10, L420 | After deterministic matching, the Sorter proposes the file, classifies and files attachments. | Yes | AW-1-15, AW-1-79, AW-1-96 | Changed: CN-AG-10 ch. 2 |
| AI Doers | AG-10-38 | AG-10 v1.10, L421 | Sorter output is a proposal; low-confidence or AI-only matches go to Unmatched and Needs you. | Yes | — | Not used |
| AI Doers | AG-10-40 | AG-10 v1.10, L425 | Inbound WhatsApp runs through the Sorter, attaches to the conversation and files media. | Yes | — | Not used |
| AI Doers | AG-10-58 | AG-10 v1.10, L449 | Create lead from an unknown WhatsApp number is always a person's click, never AI. | Yes | AW-1-45 | Used as is |
| AI Doers | AG-10 BR-10 | AG-10 v1.10, L465 | AI-drafted and template copy never promise an immigration outcome. | Yes | — | Not used |
| AI Doers | AG-10 BR-22 | AG-10 v1.10, L477 | The Sorter never guesses: uncertain items go to Unmatched and Needs you. | Yes | — | Not used |
| AI Doers | AG-10 BR-25 | AG-10 v1.10, L480 | Inbound WhatsApp is handled like email: Sorter, idempotent, unmatched to the inbox. | Yes | — | Not used |
| AI Doers | AG-10 BR-27 | AG-10 v1.10, L482 | Injection-safe Sorter: content is data, no tool access, AI-only matches never auto-filed. | Yes | — | Not used |
| AI Doers | AG-10 BR-32 | AG-10 v1.10, L487 | A lead from an unknown WhatsApp number is created only by a person's click. | Yes | — | Not used |
| AI Doers | AG11-D4 | AG-11 v1.12, L34 | Four AI Doers join: Reader, Sorter, Drafter (AI writer) and Checker, with Release 1 scope. | Yes | AW-1-64, AW-1-65 | Changed: CN-AG-07 ch. 7; CN-AG-10 ch. 3; CN-AG-11 ch. 1, 2, 8; CN-AG-16 ch. 1 |
| AI Doers | AG11-D6 | AG-11 v1.12, L36 | Inbound WhatsApp lands on the client file via the Sorter in Release 1. | Yes | — | Not used |
| AI Doers | AG11-D16 | AG-11 v1.12, L46 | Inbound email via Gmail, Microsoft 365 or IMAP, filed by the Sorter, all Release 1. | Yes | — | Not used |
| AI Doers | AG-11 §3.0 AI Doers | AG-11 v1.12, L246–252 | Four AI Doers understand content; shared rules: proposals only, never fabricate, off until terms. | Yes | — | Changed: CN-AG-11 ch. 1 |
| AI Doers | AG-11-66 | AG-11 v1.12, L654 | The Reader extracts proposed values with provenance and confidence, and classifies type. | Yes | — | Not used |
| AI Doers | AG-11-67 | AG-11 v1.12, L655 | The Sorter classifies and matches inbound messages and files attachments. | Yes | — | Changed: CN-AG-11 ch. 2 |
| AI Doers | AG-11-68 | AG-11 v1.12, L656 | The Drafter (AI writer) is callable by any recipe; its client text always approved. | Yes | AW-1-81 | Changed: CN-AG-11 ch. 1 |
| AI Doers | AG-11-69 | AG-11 v1.12, L657 | The Checker cross-checks identity details and raises warnings, never locks. | Yes | — | Not used |
| AI Doers | AG-11-70 | AG-11 v1.12, L658 | Every AI Doer output is a proposal; nothing missing is guessed. | Yes | AW-1-2, AW-1-112 | Used as is |
| AI Doers | AG-11-94 | AG-11 v1.12, L703 | Client content goes to models as data; no tool access; AI-only matches never auto-filed. | Yes | AW-1-2, AW-1-60, AW-1-61, AW-1-62, AW-1-112, AW-2-33, AW-2-34, AW-2-35 | Changed: CN-AG-11 ch. 12 |
| AI Doers | AG-11 BR-23 | AG-11 v1.12, L753 | AI proposes, never fabricates; proposed values unverified until approved. | Yes | — | Not used |
| AI Doers | AG-17-32 | AG-17 v0.6, L750 | Job ads pre-filled from file details; wage, hours, location compared automatically. | No (relied on) | AW-1-85 | Changed: CN-AG-17 ch. 2 |
| AI Doers | AG18-D6 | AG-18 v1.2, L130 | Imported values carry provenance and stay unverified; Reader values verified on approval. | Yes | — | Not used |
| AI Doers | AG-18-30 | AG-18 v1.2, L374 | Imported correspondence is never sent, never passed to the Sorter. | Yes | — | Not used |
| AI Doers | AG-18-33 | AG-18 v1.2, L379 | The Reader classifies each imported document and proposes its record. | Yes | — | Not used |
| AI Doers | AG-18-34 | AG-18 v1.2, L380 | Reader values from imported documents stay proposed, reviewed per document. | Yes | — | Not used |
| AI Doers | AG-18-35 | AG-18 v1.2, L381 | Documents the Reader cannot place go to the review list, no Needs you item each. | Yes | — | Not used |
| AI Doers | AG-18-77 | AG-18 v1.2, L439 | A later Reader-approved value supersedes an imported value. | Yes | — | Not used |
| AI Doers | AG-18 BR-6 | AG-18 v1.2, L468 | Imported means unverified; only verified values feed the Filler. | Yes | — | Not used |
| AI Doers | AG-18 BR-9 | AG-18 v1.2, L471 | Imported documents are filed by the Reader only with confidence or a manifest. | Yes | — | Not used |
| AI Doers | SA1B-D16 | SA-01B v1.2, L40 | Form filling is deterministic; AI may draft box maps and extract, never fill. | Yes | — | Not used |
| AI Doers | SA-1B-33 | SA-01B v1.2, L189 | AI may draft and diff a box map; a person approves before publishing. | Yes | AW-2-19, AW-2-45, AW-2-57 | Changed: CN-SA-01B ch. 6 |
| AI Doers | SA-1B-34 | SA-01B v1.2, L190 | AI may extract answers from uploaded documents with confidence and confirmation. | Yes | — | Not used |
| AI Doers | SA-1B-35 | SA-01B v1.2, L191 | AI never sets a value on a form at fill time. | Yes | AW-1-83, AW-2-45 | Used as is |
| AI Doers | SA-10-7 | SA-10 v2.5, L356 | Auto-triage suggests ticket category and priority; the agent confirms. | Yes | AW-2-61, AW-2-64 | Used as is |
| AI Doers | SA-10-23 | SA-10 v2.5, L384 | A bilingual knowledge base with contextual article suggestions. | No (relied on) | AW-2-68 | Changed: CN-SA-10 ch. 3 |
| AI Doers | Shared Phasing, SA-1B row | Shared 99-Phasing v2.18, L18, 31 | Form autofill parked; AI box-map drafting moved to a later phase with deterministic filling. | Yes | — | Not used |
| AI Doers | Doc 3 AG-10-15 (July) | Doc 3 v1.4, L4670 | July AI drafter: draft only, never promises, "not configured" without a model key. | Yes | — | Not used |

### A.3 Minder and Reminder (59 rows)

| Area | Team ID | File, version, line | What it says | AI in own words | Used by (AW) | Status in Workstream 2 |
|---|---|---|---|---|---|---|
| Minder and Reminder | AG-4-34 | AG-04 v1.5, L497 | Booking reminders are queued with retry; a queue failure is non-fatal. | Yes | — | Not used |
| Minder and Reminder | AG-5-36 | AG-05 v1.9, L424 | Retainer reminders and stuck-retainer detection respect timezone and business hours. | Yes | — | Not used |
| Minder and Reminder | AG-7-34 | AG-07 v2.7, L652 | Closing a case stops its SLA clocks and pending case reminders. | Yes | AW-1-19, AW-1-49 | Used as is |
| Minder and Reminder | AG-7-46 | AG-07 v2.7, L672 | Pre-submission government steps run with their own clock and Minder reminders. | Yes | — | Not used |
| Minder and Reminder | AG-7-50 | AG-07 v2.7, L676 | Withdrawing a case before decision closes it with a reason and date. | No (relied on) | AW-1-19, AW-1-49 | Used as is |
| Minder and Reminder | AG-7-64 | AG-07 v2.7, L692 | Undoing an import removes its cases with their Minder reminders and tasks. | Yes | — | Not used |
| Minder and Reminder | AG-07 BR-25 | AG-07 v2.7, L752 | Imported cases are pinned, unverified, watched by the Minder and silent to clients. | Yes | — | Not used |
| Minder and Reminder | AG-9-8 | AG-09 v1.8, L479 | Document request reminders respect consent, quiet hours and the Not started state. | Yes | — | Not used |
| Minder and Reminder | AG-9-51 | AG-09 v1.8, L550 | The Reader proposes letter deadlines; they reach the Minder only after a person approves. | Yes | AW-1-80, AW-1-106 | Changed: CN-AG-09 ch. 4 |
| Minder and Reminder | AG-09 BR-21 | AG-09 v1.8, L579 | A date from a letter reaches the Minder only after a person approves it. | Yes | — | Changed: CN-AG-09 ch. 4 |
| Minder and Reminder | AG-11-6 | AG-11 v1.12, L560 | Date-anchored triggers (date plus offset) are the deadline primitive. | Yes | AW-1-105 | Used as is |
| Minder and Reminder | AG-11-17 | AG-11 v1.12, L577 | arm_minder registers a firm-designed deadline watch with a cascade of steps. | Yes | — | Not used |
| Minder and Reminder | AG-11-18 | AG-11 v1.12, L578 | The Minder re-checks before every step and disarms once satisfied. | Yes | — | Not used |
| Minder and Reminder | AG-11-19 | AG-11 v1.12, L579 | With escalation on, the Minder alerts people above the file owner. | Yes | — | Not used |
| Minder and Reminder | AG-11-20 | AG-11 v1.12, L580 | Minder deadline definitions and lead times are pack-driven, not hard-coded. | Yes | — | Not used |
| Minder and Reminder | AG-11-47 | AG-11 v1.12, L583 | Modules register standard deadlines with the Minder directly, no set-up or entitlement. | Yes | AW-1-80, AW-1-104 | Used as is |
| Minder and Reminder | AG-11-48 | AG-11 v1.12, L584 | Standard deadline reminders work on every plan and never stop with automations off. | Yes | AW-1-104 | Used as is |
| Minder and Reminder | AG-11-49 | AG-11 v1.12, L585 | Escalation and at-risk marks are separate settings, parts of Team safeguards. | Yes | AW-1-33, AW-1-51, AW-1-108, AW-1-115, AW-1-121 | Used as is |
| Minder and Reminder | AG-11-50 | AG-11 v1.12, L586 | Standard reminders never pause because a feature flag is off. | Yes | — | Not used |
| Minder and Reminder | AG-11-32 | AG-11 v1.12, L606 | Disabling cancels the firm's pending repeats but never standard deadline reminders. | Yes | — | Not used |
| Minder and Reminder | AG-11-40 | AG-11 v1.12, L620 | Scheduled and Minder timing respects firm timezone and business hours. | Yes | — | Not used |
| Minder and Reminder | AG-11-76 | AG-11 v1.12, L668 | The missing-document chase sends template chases and owner reminders until satisfied. | Yes | — | Not used |
| Minder and Reminder | AG-11-108 | AG-11 v1.12, L725 | A letter deadline the Reader reads becomes a Minder deadline only after approval. | Yes | AW-1-80 | Changed: CN-AG-11 ch. 3 |
| Minder and Reminder | AG-11 BR-7 | AG-11 v1.12, L737 | A Minder cascade disarms the instant its condition is satisfied. | Yes | — | Not used |
| Minder and Reminder | AG-11 BR-12 | AG-11 v1.12, L742 | Scheduled and Minder timing in the firm timezone and business hours. | Yes | — | Not used |
| Minder and Reminder | AG-11 BR-13 | AG-11 v1.12, L743 | Disabling cancels pending work, except standard deadline reminders. | Yes | — | Not used |
| Minder and Reminder | AG-11 BR-19 | AG-11 v1.12, L749 | Assist, don't monitor: reminders go to the file owner; escalation only if on. | Yes | — | Not used |
| Minder and Reminder | AG-13-10 | AG-13 v1.12, L364 | Users create ad-hoc reminders on any entity; today only Conductor-made ones exist. | No (relied on) | AW-1-98 | Used as is |
| Minder and Reminder | AG-13-11 | AG-13 v1.12, L365 | Conductor-driven reminders write the same Reminder rows on the same queue. | Yes | — | Not used |
| Minder and Reminder | AG-13-14 | AG-13 v1.12, L368 | Reminders skip if stale at fire time: case closed, rule no longer matches. | Yes | AW-1-107 | Used as is |
| Minder and Reminder | AG-13-65 | AG-13 v1.12, L410 | Tasks are created from dated case items, including Minder standard deadlines. | Yes | AW-1-66, AW-1-80 | Changed: CN-AG-13 ch. 1 |
| Minder and Reminder | AG-13-66 | AG-13 v1.12, L411 | A deadline on a departed owner's file creates an unassigned task and alerts assigners. | Yes | AW-1-66 | Used as is |
| Minder and Reminder | AG-13 BR-7 | AG-13 v1.12, L424 | User and Conductor reminders are one record type; Conductor owns when, AG-13 the record. | Yes | — | Not used |
| Minder and Reminder | AG-13 BR-8 | AG-13 v1.12, L425 | Reminders skip stale hosts and never repeat to the same person the same day. | Yes | — | Not used |
| Minder and Reminder | AG-14-17 | AG-14 v1.11, L394 | Deadline adherence and horizon; at-risk items only where at-risk marks are on. | Yes | AW-1-104 | Changed: CN-AG-14 ch. 3 |
| Minder and Reminder | AG-16-32 | AG-16 v1.13, L465 | Minder escalation and at-risk marks are two settings, parts of Team safeguards. | Yes | — | Not used |
| Minder and Reminder | AG-16 BR-15 | AG-16 v1.13, L515 | Oversight grows with the team: escalation and at-risk marks on from five staff. | Yes | — | Not used |
| Minder and Reminder | AG17-D38 | AG-17 v0.6, L157 | The Minder is one reminder service over the whole product, core in Release 1. | Yes | — | Changed: CN-AG-15 ch. 1; CN-AG-17 ch. 3 |
| Minder and Reminder | AG17-D54 | AG-17 v0.6, L173 | Superseded: a deliberately minimal first Minder doing four things. | Yes | — | Not used |
| Minder and Reminder | AG17-D55 | AG-17 v0.6, L174 | AG-17 uses AG-11's Minder; standard deadlines registered directly, never plan-gated. | Yes | — | Changed: CN-AG-17 ch. 1 |
| Minder and Reminder | AG17-D57 | AG-17 v0.6, L176 | Escalating overdue tasks to managers is opt-in per firm, off by default. | Yes | — | Not used |
| Minder and Reminder | AG17-D69 | AG-17 v0.6, L188 | A feature flag off makes client records read-only; reminders never pause. | Yes | — | Not used |
| Minder and Reminder | AG17-D70 | AG-17 v0.6, L189 | Modules register standard deadlines; escalation and at-risk marks opt-in. | Yes | — | Changed: CN-AG-17 ch. 1 |
| Minder and Reminder | AG17-D71 | AG-17 v0.6, L190 | Named owners for building and reviewing the Minder core (team roles). | Yes | — | Not used |
| Minder and Reminder | AG-17-73 | AG-17 v0.6, L813 | Every AG-17 date carrying a reminder is registered with the Minder. | Yes | AW-1-85 | Changed: CN-AG-17 ch. 1 |
| Minder and Reminder | AG-17-60 | AG-17 v0.6, L828 | Minder deadline reminders go to the file owner; event notifications separately. | Yes | — | Not used |
| Minder and Reminder | AG18-D3 | AG-18 v1.2, L127 | Import scope Release 1: key dates registered with the Minder; documents classified. | Yes | — | Not used |
| Minder and Reminder | AG-18-25 | AG-18 v1.2, L369 | Imported key dates register with the Minder in the same row transaction. | Yes | AW-1-106 | Changed: CN-AG-18 ch. 2 |
| Minder and Reminder | AG-18-40 | AG-18 v1.2, L390 | Undo removes batch records with their Minder registrations and tasks. | Yes | — | Not used |
| Minder and Reminder | AG-18-44 | AG-18 v1.2, L396 | An import fires internal actions normally, including Minder registration. | Yes | — | Not used |
| Minder and Reminder | AG-18-61 | AG-18 v1.2, L421 | Internal work runs for quiet records; imports never escalate or mark at risk. | Yes | — | Not used |
| Minder and Reminder | AG-18-74 | AG-18 v1.2, L436 | Past imported dates are record-only by default; reminders only if chosen. | Yes | — | Not used |
| Minder and Reminder | AG-18 BR-10 | AG-18 v1.2, L472 | Imported key dates are watched by the Minder from day one. | Yes | — | Not used |
| Minder and Reminder | SA-3-35 | SA-03 v2.17, L511 | Always-on features; emergency off makes records read-only, reminders run. | Yes | AW-1-104 | Used as is |
| Minder and Reminder | SA-12-30 | SA-12 v2.7, L404 | A flag covering client records off: records read-only, reminders still run. | Yes | — | Not used |
| Minder and Reminder | SA-12 BR-18 | SA-12 v2.7, L433 | Client records are never hidden or silenced by a flag. | Yes | — | Not used |
| Minder and Reminder | FD-8 | Founder Decisions Log v1.5, L33 | Doer naming: Clocker, not Timer; Reminder folds into Minder. | Yes | AW-01 (outside §4 only) | Changed: CN-FDL ch. 2 |
| Minder and Reminder | Doc 2 Clocker and Reminder fold | Doc 2 v1.4, L103 | Applies FD-8: Clocker name; Reminder folded into the Minder. | Yes | — | Not used |
| Minder and Reminder | Doc 3 §3.2 Reminders (July) | Doc 3 v1.4, L6229–6231 | Per FD-8 the nudge Doer is the Minder; no separate Reminder Doer. | Yes | — | Not used |

### A.4 Other Doers (77 rows)

| Area | Team ID | File, version, line | What it says | AI in own words | Used by (AW) | Status in Workstream 2 |
|---|---|---|---|---|---|---|
| Other Doers | Agent Overview, In-House by Design | Agent 00-Overview v1.12, L176–180 | Every product tool is an in-house Doer; outside providers only for AI/OCR, WhatsApp, own mailbox. | Yes | — | Not used |
| Other Doers | AG-2-28a | AG-02 v1.9, L591 | A Signer envelope.signed event moves the lead to Won automatically. | Yes | AW-1-44, AW-1-87, AW-1-92 | Used as is |
| Other Doers | AG-2-37a | AG-02 v1.9, L608 | Staff log calls with outcome, duration and next step; counts as first response. | No (relied on) | — | Changed: CN-AG-02 ch. 3 |
| Other Doers | AG-3-10 | AG-03 v1.4, L353 | The engine returns exactly one of four eligibility outcomes per program. | No (relied on) | AW-1-89 | Used as is |
| Other Doers | AG-3-12 | AG-03 v1.4, L355 | Missing gate inputs give Possibly Eligible with the missing inputs named. | No (relied on) | AW-1-93 | Used as is |
| Other Doers | AG-3-13 | AG-03 v1.4, L356 | A failed gate with all inputs present gives Not Eligible with the failed gate named. | No (relied on) | AW-1-89 | Used as is |
| Other Doers | AG-3-28 | AG-03 v1.4, L379 | Re-running an assessment is explicit, creates a new record and records reason and actor. | No (relied on) | AW-1-88 | Used as is |
| Other Doers | AG-3-36 | AG-03 v1.4, L391 | The eligibility outcome feeds the lead score and next-best action, with the disclaimer. | No (relied on) | — | Changed: CN-AG-03 ch. 3 |
| Other Doers | AG-4-35 | AG-04 v1.5, L498 | Booking messages send via the Mailer and Messenger Doers. | Yes | — | Not used |
| Other Doers | AG-4-50 | AG-04 v1.5, L523 | "Create proposal from consult" launches the Drafter pre-filled, then the Signer. | Yes | AW-1-95 | Used as is |
| Other Doers | AG-04 BR-13 | AG-04 v1.5, L552 | A completed consult pre-fills the Drafter; nothing is re-keyed into the proposal. | Yes | — | Not used |
| Other Doers | AG-5-4 | AG-05 v1.9, L374 | The Drafter picks the retainer template by matter type and locale, with locked pack clauses. | Yes | — | Not used |
| Other Doers | AG-5-8 | AG-05 v1.9, L380 | The Drafter fills merge fields from the live record with no re-keying. | Yes | — | Changed: CN-AG-05 ch. 2 |
| Other Doers | AG-5-29 | AG-05 v1.9, L413 | The Signer writes an append-only audit trail of every signing event. | Yes | — | Not used |
| Other Doers | AG-5-30 | AG-05 v1.9, L416 | On completion the Signer produces a certificate of completion PDF. | Yes | — | Not used |
| Other Doers | AG-5-31 | AG-05 v1.9, L417 | The signed copy and certificate are emailed to each signer; proof of send audited. | Yes | AW-1-72 | Used as is |
| Other Doers | AG-5-53 | AG-05 v1.9, L453 | Portal signing hands off to the AG-05 signing page; the portal has no signing step. | Yes | — | Not used |
| Other Doers | AG-6-1 | AG-06 v1.7, L349 | Invoice, payment and refund are distinct records; payments are never edited or deleted. | No (relied on) | AW-1-39 | Used as is |
| Other Doers | AG-6-2 | AG-06 v1.7, L350 | Invoices are raised against a client, case or prospect with currency and line items. | No (relied on) | AW-1-101 | Used as is |
| Other Doers | AG-6-5 | AG-06 v1.7, L353 | Invoice numbers come from a per-office sequence, assigned at issue, then locked. | No (relied on) | AW-1-39 | Used as is |
| Other Doers | AG-6-6 | AG-06 v1.7, L354 | Only draft invoices are editable; issued invoices are immutable. | No (relied on) | AW-1-101 | Changed: CN-AG-06 ch. 2 |
| Other Doers | AG-6-8 | AG-06 v1.7, L356 | Next-number and amount preview endpoints; a draft preview before issue. | No (relied on) | AW-1-101 | Used as is |
| Other Doers | AG-6-9 | AG-06 v1.7, L359 | Payment plans with ordered installments, optionally seeded from the retainer schedule. | No (relied on) | AW-1-18, AW-1-98 | Used as is |
| Other Doers | AG-6-10 | AG-06 v1.7, L360 | Payment plans run in draw mode or single-invoice mode; default is a founder decision. | No (relied on) | AW-1-98 | Used as is |
| Other Doers | AG-6-13 | AG-06 v1.7, L363 | An overdue queue lists aged items with one-click reminder and record payment. | No (relied on) | — | Changed: CN-AG-06 ch. 3 |
| Other Doers | AG-6-19 | AG-06 v1.7, L373 | Staff with the payment permission record offline payments against an issued invoice. | No (relied on) | AW-1-39, AW-1-97 | Changed: CN-AG-06 ch. 3 |
| Other Doers | AG-6-20 | AG-06 v1.7, L374 | Recording a payment updates the invoice balances in one atomic transaction. | No (relied on) | AW-1-97 | Used as is |
| Other Doers | AG-6-21 | AG-06 v1.7, L375 | Partial payments are supported; overpayment is refused. | No (relied on) | AW-1-97 | Used as is |
| Other Doers | AG-6-23 | AG-06 v1.7, L377 | Refunds (Phase 2) are reversing facts with reason, higher permission and audit. | No (relied on) | AW-1-39, AW-1-103 | Used as is |
| Other Doers | AG-6-24 | AG-06 v1.7, L380 | The platform records transactions and may tag funds nature; not a trust ledger. | No (relied on) | AW-1-39, AW-1-100, AW-1-101 | Changed: CN-AG-06 ch. 1 |
| Other Doers | AG-6-29 | AG-06 v1.7, L389 | A firm-wide financials view with receivables ageing and revenue breakdowns. | No (relied on) | AW-1-102 | Used as is |
| Other Doers | AG-6-40 | AG-06 v1.7, L408 | A case can request a government-fee line on its invoice. | No (relied on) | AW-1-98, AW-1-101 | Changed: CN-AG-06 ch. 4 |
| Other Doers | AG-6-41 | AG-06 v1.7, L409 | A case invoice is addressed to the case's Bill-to party. | No (relied on) | AW-1-101 | Used as is |
| Other Doers | AG-6-42 | AG-06 v1.7, L410 | No invoice against a case without an executed or offline-signed retainer. | No (relied on) | AW-1-98, AW-1-101 | Used as is |
| Other Doers | AG-7-15 | AG-07 v2.7, L626 | A case shows its Binder document checklist with type, owner and status. | No (relied on) | — | Changed: CN-AG-07 ch. 2 |
| Other Doers | AG-7-16 | AG-07 v2.7, L627 | Document-manage holders add ad-hoc documents or mark pack ones not applicable. | No (relied on) | AW-1-76 | Changed: CN-AG-07 ch. 6 |
| Other Doers | AG-7-51 | AG-07 v2.7, L677 | Each case lists government fees with payer, status and receipt. | No (relied on) | AW-1-98 | Used as is |
| Other Doers | AG-07 BR-7 | AG-07 v2.7, L734 | The Filler fills only from values that exist; it never invents or defaults. | Yes | — | Changed: CN-AG-07 ch. 7 |
| Other Doers | AG-8-47 | AG-08 v1.7, L421 | Questionnaire invitations and reminders go on the preferred channel, WhatsApp via approved templates. | Yes | — | Not used |
| Other Doers | AG-9-6 | AG-09 v1.8, L477 | Requesting documents sets them Requested, shows them in the portal and mails a request. | Yes | AW-1-69 | Used as is |
| Other Doers | AG-9-22 | AG-09 v1.8, L503 | Generate-from-template (Drafter) files the result as a typed document version. | Yes | AW-1-31, AW-1-84 | Used as is |
| Other Doers | AG-9-26 | AG-09 v1.8, L511 | A document carries one status from a fixed list of ten. | No (relied on) | AW-1-71 | Used as is |
| Other Doers | AG-9-27 | AG-09 v1.8, L512 | Rejecting a document needs a reason, shown to the client on re-request. | No (relied on) | AW-1-76 | Used as is |
| Other Doers | AG-9-28 | AG-09 v1.8, L513 | Waive or not-applicable needs a reason and is audited. | No (relied on) | AW-1-76 | Used as is |
| Other Doers | AG-10-1 | AG-10 v1.10, L357 | Communication goes through two in-house Doers, Mailer and Messenger. | Yes | — | Not used |
| Other Doers | AG-10-56 | AG-10 v1.10, L447 | Each client has a preferred channel; recipes send on it. | Yes | — | Not used |
| Other Doers | AG-10-57 | AG-10 v1.10, L448 | Firm-started WhatsApp messages use provider-approved templates only. | Yes | AW-1-82 | Used as is |
| Other Doers | AG-11-103 | AG-11 v1.12, L720 | The Messenger sends proactive WhatsApp in Release 1 via approved templates. | Yes | — | Not used |
| Other Doers | AG-11-104 | AG-11 v1.12, L721 | Recipes send on the client's preferred channel with the same rails as email. | Yes | — | Not used |
| Other Doers | AG-11-105 | AG-11 v1.12, L722 | No approved WhatsApp template means fallback to email, recorded in run history. | Yes | AW-1-82, AW-1-91 | Used as is |
| Other Doers | AG-11 BR-40 | AG-11 v1.12, L770 | WhatsApp follows the email rules. | Yes | — | Not used |
| Other Doers | AG-12-23 | AG-12 v1.2, L298 | The consuming Doer picks the template body by recipient locale, recording it. | Yes | — | Not used |
| Other Doers | AG-12-33 | AG-12 v1.2, L314 | Template types cover five families while keeping entity-binding types. | No (relied on) | — | Changed: CN-AG-12 ch. 1, 2 |
| Other Doers | AG-13-50 | AG-13 v1.12, L396 | Time entries capture billable effort on any entity (Clocker or Timer). | No (relied on) | AW-1-98 | Changed: CN-AG-13 ch. 5 |
| Other Doers | AG-13-61 | AG-13 v1.12, L402 | Notifications go through the Notification Doer; escalation only where switched on. | Yes | — | Not used |
| Other Doers | AG-14-4 | AG-14 v1.11, L371 | Metrics are declared as data, so adding a tile is configuration. | No (relied on) | — | Changed: CN-AG-14 ch. 2 |
| Other Doers | AG-14-15 | AG-14 v1.11, L388 | Financial figures are normalised to the reporting currency with stored rates. | No (relied on) | AW-1-102 | Used as is |
| Other Doers | AG-14-24 | AG-14 v1.11, L405 | Scheduled reports run with the owner's current scope and are audited. | No (relied on) | AW-1-108 | Used as is |
| Other Doers | AG-16-8 | AG-16 v1.13, L427 | Firm tax, payment terms and currency defaults flow onto Biller invoices. | No (relied on) | AW-1-101 | Used as is |
| Other Doers | AG-16-17 | AG-16 v1.13, L440 | Doers fall back to platform rails when a firm rail fails, per plan rules. | Yes | — | Not used |
| Other Doers | AG-16 BR-12 | AG-16 v1.13, L512 | A connection is used by Doers only after a successful live probe. | Yes | — | Not used |
| Other Doers | AG-17-28 | AG-17 v0.6, L744 | One action generates the final recruitment report from a template. | No (relied on) | AW-1-85 | Used as is |
| Other Doers | AG-17-82 | AG-17 v0.6, L805 | One click composes an editable message to the employer listing outstanding items. | No (relied on) | AW-1-85 | Used as is |
| Other Doers | SA1B-D28 | SA-01B v1.2, L53 | Form autofill is parked for Release 1 (conflicts with FD-5). | Yes | — | Changed: CN-SA-01B ch. 1 |
| Other Doers | SA1B-X10 | SA-01B v1.2, L90 | The auto-prefilled forms plan limit is dormant while autofill is parked. | Yes | — | Not used |
| Other Doers | SA-5-5 | SA-05 v2.4, L236 | Global template types and their entity bindings. | No (relied on) | — | Changed: CN-SA-05 ch. 2 |
| Other Doers | SA8-D19 | SA-08 v2.4, L56 | WhatsApp Phase 2, SMS Phase 3; reverses AG11-D18 (conflict). | No (relied on) | AW-1-82, AW-1-91 | Used as is |
| Other Doers | SA8-X1 | SA-08 v2.4, L93 | Pending: withdraw Release 1 WhatsApp from AG-10, AG-11, AG-16. | No (relied on) | AW-1-82, AW-1-91 | Used as is |
| Other Doers | SA-8-16 | SA-08 v2.4, L259 | WhatsApp gateway Phase 2; SMS gateway Phase 3. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| Other Doers | FD-5 | Founder Decisions Log v1.5, L30 | Flattened IRCC form filling in version 1 (Filler); XFA later. | No (relied on) | AW-1-83 | Changed: CN-FDL ch. 3 |
| Other Doers | FD-7 | Founder Decisions Log v1.5, L32 | LMIA Recruiter is light evidence; employer sees a read-only summary. | No (relied on) | AW-1-51, AW-1-85 | Changed: CN-FDL ch. 10 |
| Other Doers | FD-11 | Founder Decisions Log v1.5, L36 | No credit notes in version 1; cancel and reissue. | No (relied on) | AW-1-103 | Changed: CN-FDL ch. 4, 13 |
| Other Doers | FD-12 | Founder Decisions Log v1.5, L37 | Offline-instructions payment fallback; platform never holds funds. | No (relied on) | AW-01 (outside §4 only) | Used as is |
| Other Doers | FD-17 | Founder Decisions Log v1.5, L53 | Trust-aware light: funds designation, no automatic sweep, trust ledger, reconciliation. | No (relied on) | AW-1-100 | Changed: CN-FDL ch. 6, 14 |
| Other Doers | FD-21 | Founder Decisions Log v1.5, L57 | One-time passcode before every retainer signature, with an evidence bundle. | No (relied on) | AW-01 (outside §4 only) | Changed: CN-FDL ch. 7 |
| Other Doers | Shared Overview, In-house Doers | Shared 00-Overview v3.9, L109 | Every product capability is an in-house Doer; only infrastructure rails are third parties. | Yes | — | Not used |
| Other Doers | Doc 1 glossary: Doer | Doc 1 v1.3, L33 | A Doer is an in-house capability on a swappable rail, never a third-party product. | Yes | — | Not used |

### A.5 Autonomy and approvals (79 rows)

| Area | Team ID | File, version, line | What it says | AI in own words | Used by (AW) | Status in Workstream 2 |
|---|---|---|---|---|---|---|
| Autonomy and approvals | AG1-D19 | AG-01 v1.18, L68 | No licence monitoring: firm-entered licence links stamp documents and drive approval routing. | Yes | — | Not used |
| Autonomy and approvals | AG-02 BR-20 | AG-02 v1.9, L680 | Every lead recipe action has an autonomy level; template acknowledgement defaults to automatic. | Yes | — | Not used |
| Autonomy and approvals | AG-03 BR-12 | AG-03 v1.4, L415 | A consultant override sits beside the engine result, never replacing it. | Yes | — | Not used |
| Autonomy and approvals | AG-5-17 | AG-05 v1.9, L393 | Each retainer edit bumps the version; approval for sending records approver and time. | No (relied on) | AW-1-42 | Changed: CN-AG-05 ch. 5 |
| Autonomy and approvals | AG-7-59 | AG-07 v2.7, L687 | A Filler form draft is approved inline by the actor, or waits in Needs you; never on timeout. | Yes | AW-1-48, AW-1-83 | Used as is |
| Autonomy and approvals | AG-7-65 | AG-07 v2.7, L693 | Team safeguards: a second person approves a government form when two approvers exist. | Yes | AW-1-35, AW-1-83 | Changed: CN-AG-07 ch. 5 |
| Autonomy and approvals | AG-7-66 | AG-07 v2.7, L694 | A form instance records preparer, approver and self-approval; null preparer for automation. | Yes | AW-1-35, AW-1-83 | Changed: CN-AG-07 ch. 5 |
| Autonomy and approvals | AG-7-68 | AG-07 v2.7, L696 | Professional approvals show to all holders; Owner route when no holder is active. | Yes | — | Not used |
| Autonomy and approvals | AG-07 BR-24 | AG-07 v2.7, L751 | Government forms are a hard approval floor no firm, recipe or role can lower. | Yes | — | Not used |
| Autonomy and approvals | AG-8-26 | AG-08 v1.7, L390 | A holder of the verify key marks a fact verified against a document, audited. | No (relied on) | AW-1-43, AW-1-94 | Used as is |
| Autonomy and approvals | AG-8-44 | AG-08 v1.7, L418 | Approving a Reader value in its review view is the verification, audited once. | Yes | — | Not used |
| Autonomy and approvals | AG-8-46 | AG-08 v1.7, L420 | A Verify-imported-values action lets the verifier confirm imported answers with attestation. | Yes | — | Not used |
| Autonomy and approvals | AG-9-49 | AG-09 v1.8, L546 | Imported Reader results are reviewed one document at a time, with approve-all-shown. | Yes | — | Not used |
| Autonomy and approvals | AG-9-50 | AG-09 v1.8, L547 | Approving Reader values completes the document's Review document task. | Yes | AW-1-43 | Used as is |
| Autonomy and approvals | AG-10-30 | AG-10 v1.10, L408 | A missing variable in an automated send drops it to approval, never a placeholder. | Yes | — | Not used |
| Autonomy and approvals | AG-10-44 | AG-10 v1.10, L431 | AI-written client text always needs human approval; no firm, recipe or setting lowers it. | Yes | AW-1-31, AW-1-46, AW-1-77, AW-1-91, AW-1-99 | Changed: CN-AG-10 ch. 3 |
| Autonomy and approvals | AG-10-45 | AG-10 v1.10, L432 | A recipe template message defaults to automatic after the standard-messages review. | Yes | — | Not used |
| Autonomy and approvals | AG-10-46 | AG-10 v1.10, L433 | Approving a pending message needs the same permission as sending it by hand. | Yes | AW-1-31, AW-1-99 | Used as is |
| Autonomy and approvals | AG-10-49 | AG-10 v1.10, L436 | Message supervision is on by default when an unlicensed user can message clients. | Yes | AW-1-82 | Used as is |
| Autonomy and approvals | AG-10-51 | AG-10 v1.10, L440 | Automatic acknowledgements only for requested uploads; Sorter-filed ones after approval. | Yes | — | Not used |
| Autonomy and approvals | AG-10 BR-8 | AG-10 v1.10, L463 | A missing variable drops an automated send to approval. | Yes | — | Not used |
| Autonomy and approvals | AG-10 BR-19 | AG-10 v1.10, L474 | Template messages are automatic; everything else waits for approval. | Yes | — | Not used |
| Autonomy and approvals | AG-10 BR-20 | AG-10 v1.10, L475 | AI text to a client is always approved; licensed approver by default, Owner may widen. | Yes | — | Not used |
| Autonomy and approvals | AG-10 BR-28 | AG-10 v1.10, L483 | Acknowledge only requested or approved filings; no inferred document names. | Yes | — | Not used |
| Autonomy and approvals | AG-10 §7 Communication AI fields | AG-10 v1.10, L546 | Messages carry autonomy level, approval state and an AI-generated flag that forces approval. | Yes | AW-1-25 | Used as is |
| Autonomy and approvals | AG11-D1 | AG-11 v1.12, L31 | Every automated action carries an autonomy level: automatic, approve first, or off. | Yes | AW-01 (outside §4 only) | Used as is |
| Autonomy and approvals | AG11-D8 | AG-11 v1.12, L38 | Approving a Filler form draft in Needs you is the consultant approval, one act. | Yes | — | Not used |
| Autonomy and approvals | AG11-D9 | AG-11 v1.12, L39 | Team safeguards is one switch turning on four parts. | Yes | — | Not used |
| Autonomy and approvals | AG11-D10 | AG-11 v1.12, L40 | Approving a Reader value in its review view is the verification. | Yes | AW-1-43, AW-1-78 | Used as is |
| Autonomy and approvals | AG11-D11 | AG-11 v1.12, L41 | Licence-aware defaults: licensed approver by default, Owner route when none; the firm decides. | Yes | — | Changed: CN-AG-02 ch. 2 |
| Autonomy and approvals | AG11-D12 | AG-11 v1.12, L42 | Standard template messages are reviewed once at setup, then send automatically. | Yes | — | Not used |
| Autonomy and approvals | AG-11-51 | AG-11 v1.12, L633 | Every automated action carries Auto, Approve or Off. | Yes | — | Not used |
| Autonomy and approvals | AG-11-52 | AG-11 v1.12, L634 | Defaults: internal actions and template messages automatic; other client messages approve. | Yes | — | Not used |
| Autonomy and approvals | AG-11-53 | AG-11 v1.12, L635 | Four product floors that can never go below Approve. | Yes | AW-1-9, AW-1-37, AW-1-46, AW-1-120, AW-2-31 | Used as is |
| Autonomy and approvals | AG-11-54 | AG-11 v1.12, L636 | No Doer action submits anything to a government authority. | Yes | AW-1-48 | Used as is |
| Autonomy and approvals | AG-11-58 | AG-11 v1.12, L642 | Approving needs the same permission as doing it by hand. | Yes | AW-1-29 | Used as is |
| Autonomy and approvals | AG-11-78 | AG-11 v1.12, L676 | When the approver is the person acting, approval happens inline. | Yes | AW-1-29, AW-1-97, AW-1-124 | Used as is |
| Autonomy and approvals | AG-11-79 | AG-11 v1.12, L677 | A template message from a published version counts as firm-approved; defaults automatic. | Yes | AW-1-46, AW-1-77, AW-1-91, AW-1-93 | Used as is |
| Autonomy and approvals | AG-11-80 | AG-11 v1.12, L680 | One Team safeguards switch, on automatically at five or more active staff. | Yes | — | Not used |
| Autonomy and approvals | AG-11-81 | AG-11 v1.12, L681 | Four-eyes on government forms when two or more approvers exist. | Yes | AW-1-35, AW-1-83 | Changed: CN-AG-11 ch. 7 |
| Autonomy and approvals | AG-11-82 | AG-11 v1.12, L682 | Supervised client messages for unlicensed staff, a standalone setting. | Yes | — | Not used |
| Autonomy and approvals | AG-11-83 | AG-11 v1.12, L683 | Team safeguards turns on four parts, including Needs you routing to supervisors. | Yes | AW-1-41 | Used as is |
| Autonomy and approvals | AG-11-84 | AG-11 v1.12, L684 | Only the Owner switches Team safeguards off, with a reason; quarterly reminder. | Yes | AW-1-41 | Used as is |
| Autonomy and approvals | AG-11-85 | AG-11 v1.12, L687 | Approving a Reader value beside its document region verifies it, one act. | Yes | — | Not used |
| Autonomy and approvals | AG-11-88 | AG-11 v1.12, L693 | A licensed user means one linked to a regulator credential; never verified by the product. | Yes | AW-1-7, AW-1-31, AW-1-34, AW-1-126 | Changed: CN-AG-11 ch. 1 |
| Autonomy and approvals | AG-11-89 | AG-11 v1.12, L694 | The form-approve key is seeded on Owner and Case Manager; grantable, audited. | Yes | AW-1-30, AW-1-83 | Used as is |
| Autonomy and approvals | AG-11-91 | AG-11 v1.12, L698 | Seed messages wait until the firm confirms one Review your standard messages screen. | Yes | — | Changed: CN-AG-11 ch. 10 |
| Autonomy and approvals | AG-11-92 | AG-11 v1.12, L699 | Publishing a template used by an automatic action shows the send impact first. | Yes | — | Not used |
| Autonomy and approvals | AG-11-96 | AG-11 v1.12, L709 | Document acknowledgements automatic only for requested uploads. | Yes | AW-01 (outside §4 only) | Used as is |
| Autonomy and approvals | AG-11-97 | AG-11 v1.12, L710 | Immigration-significant merge fields render only from verified values, else approve. | Yes | — | Not used |
| Autonomy and approvals | AG-11 BR-20 | AG-11 v1.12, L750 | Autonomy levels and their floor, shown in plain words. | Yes | — | Not used |
| Autonomy and approvals | AG-11 BR-22 | AG-11 v1.12, L752 | Approving equals doing it by hand: same permission. | Yes | — | Not used |
| Autonomy and approvals | AG-11 BR-26 | AG-11 v1.12, L756 | No government submission by any Doer. | Yes | — | Not used |
| Autonomy and approvals | AG-11 BR-30 | AG-11 v1.12, L760 | Team safeguards turns on at five active staff, with notice and grace. | Yes | — | Not used |
| Autonomy and approvals | AG-11 BR-31 | AG-11 v1.12, L761 | Four-eyes on government forms under Team safeguards. | Yes | — | Not used |
| Autonomy and approvals | AG-11 BR-32 | AG-11 v1.12, L762 | Unlicensed staff are supervised on client messages. | Yes | — | Not used |
| Autonomy and approvals | AG-11 BR-33 | AG-11 v1.12, L763 | Approve equals verify for Reader values. | Yes | — | Not used |
| Autonomy and approvals | AG-11 BR-35 | AG-11 v1.12, L765 | Licensed approver by default for AI text; the Owner when there is none. | Yes | — | Changed: CN-AG-11 ch. 1 |
| Autonomy and approvals | AG-11 BR-36 | AG-11 v1.12, L766 | Standard messages reviewed once. | Yes | — | Not used |
| Autonomy and approvals | AG-16-36 | AG-16 v1.13, L471 | Per recipe, client messages can be Send automatically or Ask me first. | Yes | — | Changed: CN-AG-16 ch. 1 |
| Autonomy and approvals | AG-16-37 | AG-16 v1.13, L472 | AI, autonomy and safeguard changes apply only to items created afterwards. | Yes | AW-1-20 | Changed: CN-AG-16 ch. 2 |
| Autonomy and approvals | AG-16-42 | AG-16 v1.13, L479 | Only the Owner switches Team safeguards off, with a reason; never silently back on. | Yes | AW-1-41 | Used as is |
| Autonomy and approvals | AG-16-43 | AG-16 v1.13, L480 | The four safeguard parts are adjustable individually by the Owner with a reason. | Yes | AW-1-41 | Used as is |
| Autonomy and approvals | AG-16-44 | AG-16 v1.13, L481 | Four-eyes on government forms defined for two or more approvers. | Yes | — | Not used |
| Autonomy and approvals | AG-16-46 | AG-16 v1.13, L483 | The Owner sets who may approve AI-written client text; licensed only by default. | Yes | AW-1-26, AW-1-31, AW-1-41 | Changed: CN-AG-16 ch. 6 |
| Autonomy and approvals | AG-16-47 | AG-16 v1.13, L484 | Supervised client messages is a standalone setting for unlicensed staff. | Yes | — | Changed: CN-AG-16 ch. 3 |
| Autonomy and approvals | AG-16-48 | AG-16 v1.13, L485 | A first-run Review your standard messages screen with one confirm. | Yes | — | Not used |
| Autonomy and approvals | AG-16 BR-17 | AG-16 v1.13, L517 | Product floors are not settings; nothing in AG-16 lowers them. | Yes | — | Changed: CN-AG-16 ch. 1 |
| Autonomy and approvals | AG18-D11 | AG-18 v1.2, L135 | Import decisions: free assisted migration; switch-on by licensed owner or import key, else approval. | Yes | — | Not used |
| Autonomy and approvals | AG-18-63 | AG-18 v1.2, L423 | Switching on needs the import key or a licensed owner; unlicensed waits for approval. | Yes | AW-1-106 | Used as is |
| Autonomy and approvals | AG-18 BR-24 | AG-18 v1.2, L486 | Values are verified only by a person checking them. | Yes | — | Not used |
| Autonomy and approvals | SA6-D2 | SA-06 v3.3, L24 | Sign-off keys seeded on Owner and Case Manager; grantable to any role; audited. | Yes | AW-01 (outside §4 only) | Used as is |
| Autonomy and approvals | SA6-D9 | SA-06 v3.3, L31 | Licensed is a person, not a role; the permission system never checks licence. | Yes | AW-1-7, AW-1-126 | Used as is |
| Autonomy and approvals | SA-6-26 | SA-06 v3.3, L488 | Sign-off keys seeded on Owner and Case Manager; every use audited. | Yes | — | Not used |
| Autonomy and approvals | SA-6-27 | SA-06 v3.3, L489 | A staff member is licensed when their profile holds a regulator credential. | Yes | — | Not used |
| Autonomy and approvals | SA-06 BR-20 | SA-06 v3.3, L530 | The permission system never checks licence; only notes and preferred marks. | Yes | — | Not used |
| Autonomy and approvals | SA7-D4 | SA-07 v2.12, L42 | No blocked role combinations; per-action rules stop self-approval. | No (relied on) | AW-2-38, AW-2-59, AW-2-72 | Used as is |
| Autonomy and approvals | SA-11-27 | SA-11 v2.7, L385 | A register of data-subject requests with deadlines and status. | No (relied on) | AW-1-19, AW-1-107 | Changed: CN-SA-11 ch. 6, 7 |
| Autonomy and approvals | FD-20 | Founder Decisions Log v1.5, L56 | Assessment results flagged automated, with factor snapshot and human review right. | Yes | AW-1-107 | Used as is |

### A.6 Needs you (29 rows)

| Area | Team ID | File, version, line | What it says | AI in own words | Used by (AW) | Status in Workstream 2 |
|---|---|---|---|---|---|---|
| Needs you | AG-2-58 | AG-02 v1.9, L638 | A lead shows its speed-to-lead run, sent or skipped, and items waiting in Needs you. | Yes | — | Not used |
| Needs you | AG-9-45 | AG-09 v1.8, L542 | Extracted values are Proposed in a review view; client uploads appear in Needs you. | Yes | — | Not used |
| Needs you | AG11-D2 | AG-11 v1.12, L32 | Approve inline when the approver is acting; Needs you holds only what waits. | Yes | — | Not used |
| Needs you | AG11-D7 | AG-11 v1.12, L37 | The staff home screen is Needs you plus a Done for you feed. | Yes | — | Not used |
| Needs you | AG-11-55 | AG-11 v1.12, L639 | Non-inline Approve actions create a Needs you item for the right person. | Yes | AW-1-29, AW-1-30 | Used as is |
| Needs you | AG-11-56 | AG-11 v1.12, L640 | Each item shows what will happen, why, value provenance, AI confidence, age and due time. | Yes | AW-1-32, AW-1-33, AW-1-72 | Used as is |
| Needs you | AG-11-57 | AG-11 v1.12, L641 | Approve, edit then approve, or reject; execution once under the idempotency key. | Yes | AW-1-33 | Used as is |
| Needs you | AG-11-59 | AG-11 v1.12, L643 | A pending item never runs because time passed; overdue items remind and escalate. | Yes | AW-1-36, AW-1-86 | Used as is |
| Needs you | AG-11-60 | AG-11 v1.12, L644 | What Needs you holds: work prepared with no human present, or waiting on another person. | Yes | — | Changed: CN-AG-11 ch. 6 |
| Needs you | AG-11-61 | AG-11 v1.12, L645 | A changed record re-renders the item as stale; a gone reason cancels it. | Yes | AW-1-20, AW-1-36, AW-1-72, AW-2-28, AW-2-73 | Changed: CN-AG-11 ch. 6 |
| Needs you | AG-11-64 | AG-11 v1.12, L650 | Staff land on Needs you then Done for you; dashboards sit behind. | Yes | — | Not used |
| Needs you | AG-11-65 | AG-11 v1.12, L651 | Done for you lists what Doers did automatically in the last 24 hours. | Yes | — | Not used |
| Needs you | AG-11-90 | AG-11 v1.12, L695 | With no active approver, the item goes to the Owner and is recorded as such. | Yes | AW-1-26, AW-1-27, AW-1-34 | Used as is |
| Needs you | AG-11-100 | AG-11 v1.12, L717 | Deadline-linked items are due two working days before the deadline, or now. | Yes | AW-1-36, AW-1-80, AW-1-86 | Used as is |
| Needs you | AG-11-101 | AG-11 v1.12, L718 | A paused client's waiting items stay in Needs you and cannot send. | Yes | AW-1-19, AW-1-20, AW-1-49, AW-1-105 | Used as is |
| Needs you | AG-11-102 | AG-11 v1.12, L719 | An unlicensed owner's switch-on of an imported client waits for a licensed user. | Yes | — | Not used |
| Needs you | AG-11 BR-21 | AG-11 v1.12, L751 | Approval items never run on a timer. | Yes | — | Not used |
| Needs you | AG-11 BR-28 | AG-11 v1.12, L758 | Approve the current version; stale items re-render, gone reasons cancel. | Yes | — | Not used |
| Needs you | AG-11 BR-29 | AG-11 v1.12, L759 | One person never approves twice; inline when the approver is acting. | Yes | — | Not used |
| Needs you | AG-11 BR-38 | AG-11 v1.12, L768 | Deadline-linked approvals are due early, urgent if late. | Yes | — | Not used |
| Needs you | AG-11 BR-39 | AG-11 v1.12, L769 | A paused client's waiting items cannot send. | Yes | — | Not used |
| Needs you | AG-11 §7 ApprovalItem | AG-11 v1.12, L878 | The approval item record: owner, record, preview, provenance, source Doer, due time, key. | Yes | — | Changed: CN-AG-11 ch. 1, 6 |
| Needs you | AG-11 §11 Needs you security | AG-11 v1.12, L1179 | Approval re-checks permission and firm at decision time; one execution per approval. | Yes | AW-1-2, AW-1-10, AW-1-58, AW-1-63, AW-1-113, AW-1-119, AW-2-26, AW-2-38 | Used as is |
| Needs you | AG-16-49 | AG-16 v1.13, L486 | The Owner may nominate one backup approver for stuck or overdue items. | Yes | AW-1-41 | Used as is |
| Needs you | AG-16-52 | AG-16 v1.13, L491 | Firm-editable overdue time and deadline lead time for approvals. | Yes | — | Not used |
| Needs you | AG-18-66 | AG-18 v1.2, L426 | The Owner gets one reminder at 7 and one at 30 days for still-quiet imports. | Yes | — | Not used |
| Needs you | AG-18-78 | AG-18 v1.2, L440 | Imported-document Reader results never create one Needs you item per value. | Yes | — | Not used |
| Needs you | AG-18-86 | AG-18 v1.2, L450 | An unlicensed owner's switch-on creates a Needs you item for a licensed user. | Yes | — | Not used |
| Needs you | AG-18-87 | AG-18 v1.2, L451 | A paused client's waiting items stay in Needs you and cannot send. | Yes | — | Not used |

### A.7 AI switch and provider (39 rows)

| Area | Team ID | File, version, line | What it says | AI in own words | Used by (AW) | Status in Workstream 2 |
|---|---|---|---|---|---|---|
| AI switch and provider | Agent Phasing, Release gate | Agent 99-Phasing v1.4, L23 | AI Doers and WhatsApp ship in Release 1 built but off until terms are recorded. | Yes | — | Not used |
| AI switch and provider | AG-09 BR-20 | AG-09 v1.8, L578 | The Reader is optional, off until provider terms are recorded; a manual path always works. | Yes | — | Not used |
| AI switch and provider | AG-10-39 | AG-10 v1.10, L422 | With the Sorter's AI off or down, deterministic matching continues; the rest is manual. | Yes | — | Not used |
| AI switch and provider | AG-10-54 | AG-10 v1.10, L443 | Sorter and Drafter are off until provider, Canada region and no-training terms are recorded. | Yes | — | Changed: CN-AG-10 ch. 3 |
| AI switch and provider | AG-10 BR-23 | AG-10 v1.10, L478 | AI Doers are off by default; deterministic matching and manual work continue. | Yes | — | Not used |
| AI switch and provider | AG11-D13 | AG-11 v1.12, L43 | AI Doers off until provider terms are recorded; injection safeguards apply. | Yes | AW-02 (outside §4 only) | Changed: CN-AG-11 ch. 8; CN-AG-16 ch. 1 |
| AI switch and provider | AG11-D15 | AG-11 v1.12, L45 | AI and OCR processing of client data happens only in Canada. | Yes | AW-1-52, AW-2-25 | Changed: CN-AG-11 ch. 8; CN-AG-16 ch. 1 |
| AI switch and provider | AG-11-71 | AG-11 v1.12, L659 | AI is off until conditions are met, optional per firm; every path works by hand. | Yes | AW-1-53, AW-1-114, AW-2-25, AW-2-29, AW-2-30 | Used as is |
| AI switch and provider | AG-11-73 | AG-11 v1.12, L661 | No training on client data; Canada-only processing; provider terms set by Super Admin. | Yes | AW-1-52 | Changed: CN-AG-11 ch. 8 |
| AI switch and provider | AG-11-86 | AG-11 v1.12, L690 | The main settings screen shows AI Doers, Team safeguards and supervision switches. | Yes | — | Not used |
| AI switch and provider | AG-11-93 | AG-11 v1.12, L702 | AI Doers locked off until provider, Canada region and no-training terms are recorded. | Yes | AW-1-52, AW-2-25 | Changed: CN-AG-11 ch. 8 |
| AI switch and provider | AG-11 BR-24 | AG-11 v1.12, L754 | AI waits for terms; manual always works. | Yes | — | Changed: CN-AG-11 ch. 8 |
| AI switch and provider | AG-11 BR-37 | AG-11 v1.12, L767 | AI waits for Canada-only processing terms; client content is data. | Yes | — | Changed: CN-AG-11 ch. 8 |
| AI switch and provider | AG-11 §11 AI Doers security | AG-11 v1.12, L1181 | Client data to a model only after terms and switch-on; content is data; no tools; no training. | Yes | AW-1-2, AW-1-10, AW-1-58, AW-1-63, AW-1-113, AW-1-119, AW-2-26, AW-2-38 | Changed: CN-AG-11 ch. 8 |
| AI switch and provider | AG-16-35 | AG-16 v1.13, L470 | One firm switch for all four AI Doers, locked until provider terms are recorded. | Yes | AW-1-11, AW-1-52, AW-1-53, AW-1-57, AW-1-114 | Changed: CN-AG-16 ch. 1, 4, 6 |
| AI switch and provider | AG-16-40 | AG-16 v1.13, L477 | The main settings screen shows AI Doers, Team safeguards and supervision. | Yes | — | Not used |
| AI switch and provider | AG-16 BR-18 | AG-16 v1.13, L518 | AI is optional, never load-bearing; every function keeps its manual path. | Yes | — | Changed: CN-AG-16 ch. 1 |
| AI switch and provider | AG-16 §7 FirmAiSettings | AG-16 v1.13, L578 | The firm AI settings record: AI Doers on or off, terms recorded, Owner acknowledgement. | Yes | — | Changed: CN-AG-16 ch. 1, 4 |
| AI switch and provider | AG-18-36 | AG-18 v1.2, L382 | With AI off, imported documents without a manifest go to manual filing. | Yes | — | Not used |
| AI switch and provider | SA3-D10 | SA-03 v2.17, L70 | A feature catalogue replaces the product map; about 30 features in Release 1. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| AI switch and provider | SA3-X12 | SA-03 v2.17, L116 | AG-10 AI assist and AG-11 firm automations named as catalogue features. | Yes | — | Not used |
| AI switch and provider | SA-03 §3.3 catalogue row 30 | SA-03 v2.17, L345 | AI Doers are one sellable extra with one firm switch, locked until provider terms are recorded. | Yes | AW-1-57, AW-1-125 | Changed: CN-SA-03 ch. 1 |
| AI switch and provider | SA8-D1 | SA-08 v2.4, L33 | Expat Ready service keys live in the cloud secret store; console shows status only. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| AI switch and provider | SA-8-26 | SA-08 v2.4, L277 | A read-only Integrations status page per Expat Ready service. | No (relied on) | — | Changed: CN-SA-08 ch. 2 |
| AI switch and provider | SA-08 BR-1 | SA-08 v2.4, L311 | No third-party product tools; approved providers listed (mailbox, later WhatsApp); no AI provider named. | Yes | AW-2-54 | Changed: CN-SA-08 ch. 1 |
| AI switch and provider | SA-11-20 | SA-11 v2.7, L372 | A data residency declaration per data category from SA-8 rails. | No (relied on) | — | Changed: CN-SA-11 ch. 2 |
| AI switch and provider | SA-11-21 | SA-11 v2.7, L373 | Non-Canadian rails without safeguard raise a compliance warning. | No (relied on) | — | Changed: CN-SA-11 ch. 1 |
| AI switch and provider | SA-11-22 | SA-11 v2.7, L374 | Residency declaration and sub-processor list exportable for DPAs. | No (relied on) | — | Changed: CN-SA-11 ch. 2 |
| AI switch and provider | SA-12 §3.4 Kill-switch | SA-12 v2.7, L235 | A kill-switch-eligible flag forces a feature off everywhere within seconds, with a reason. | No (relied on) | AW-2-27 | Changed: CN-SA-12 ch. 1 |
| AI switch and provider | SA-12-1 | SA-12 v2.7, L342 | A seeded feature-flag catalogue, with kill-switch eligibility per flag. | No (relied on) | — | Changed: CN-SA-12 ch. 1 |
| AI switch and provider | SA-12-9 | SA-12 v2.7, L354 | A feature runs only when entitlement and flag both pass. | No (relied on) | AW-1-57 | Used as is |
| AI switch and provider | SA-12-10 | SA-12 v2.7, L357 | Super Admin firm-level flag overrides need a reason. | No (relied on) | AW-2-70 | Used as is |
| AI switch and provider | SA-12-12 | SA-12 v2.7, L361 | Platform kill switch forces a feature off and pauses in-flight work. | Yes | AW-1-56, AW-2-27, AW-2-28 | Used as is |
| AI switch and provider | SA-12-26 | SA-12 v2.7, L389 | No flag may disable isolation, authentication, authorisation or audit. | No (relied on) | AW-2-27 | Used as is |
| AI switch and provider | SA-12-27 | SA-12 v2.7, L392 | Security settings are Owner-only. | No (relied on) | AW-2-29, AW-2-77 | Changed: CN-SA-12 ch. 3 |
| AI switch and provider | SA-12 BR-9 | SA-12 v2.7, L424 | Turning a feature off pauses its work, never deletes; reminders continue. | Yes | AW-1-56 | Used as is |
| AI switch and provider | Doc 1 §1.12.5 Doer execution gate | Doc 1 v1.3, L380 | Conductor and every Doer check the capability gate; an off Doer no-ops with an audited reason. | Yes | — | Not used |
| AI switch and provider | Doc 2 capability rows for Doers | Doc 2 v1.4, L86–95 | Capability registry rows for each Doer and the Conductor, each with a plan tier. | Yes | — | Not used |
| AI switch and provider | Product Vision v1.0 AI flags | Product Vision v1.0 (team, frozen 2 Aug), L177 | AI capabilities are per-tenant opt-in flags combined with plan entitlement. | Yes | — | Not used |

### A.8 AI logging and audit (31 rows)

| Area | Team ID | File, version, line | What it says | AI in own words | Used by (AW) | Status in Workstream 2 |
|---|---|---|---|---|---|---|
| AI logging and audit | AG-7-40 | AG-07 v2.7, L662 | Sensitive case actions write immutable audit entries with before and after. | No (relied on) | — | Changed: CN-AG-07 ch. 1 |
| AI logging and audit | AG-9-48 | AG-09 v1.8, L545 | Every Reader model call is logged with model and prompt version, no content; no training. | Yes | AW-1-59, AW-1-117 | Used as is |
| AI logging and audit | AG-10-48 | AG-10 v1.10, L435 | Sorter and Drafter model calls are logged with model and prompt version; no training. | Yes | — | Changed: CN-AG-10 ch. 3 |
| AI logging and audit | AG-11 §3.10 Model-call audit | AG-11 v1.12, L466 | Every model call logged by Doer, model, prompt version, firm, record, time, outcome. | Yes | AW-1-78 | Changed: CN-AG-11 ch. 1 |
| AI logging and audit | AG-11-11 | AG-11 v1.12, L567 | A non-matching run is recorded as Skipped with its condition log. | Yes | — | Not used |
| AI logging and audit | AG-11-34 | AG-11 v1.12, L610 | Every run is recorded with status, rule log, action results, timings and errors. | Yes | AW-1-16, AW-1-17, AW-1-28, AW-2-16 | Used as is |
| AI logging and audit | AG-11-35 | AG-11 v1.12, L611 | Per-entity automation timeline and firm-wide health view, paginated. | Yes | AW-1-16 | Used as is |
| AI logging and audit | AG-11-43 | AG-11 v1.12, L625 | Authoring, enabling, runs, autonomy changes and every Needs you decision are audited. | Yes | AW-1-21 | Used as is |
| AI logging and audit | AG-11-62 | AG-11 v1.12, L646 | Every Needs you decision audited: who, when, before and after, reason. | Yes | AW-1-21 | Used as is |
| AI logging and audit | AG-11-63 | AG-11 v1.12, L647 | Approved, edited and rejected counts per recipe and action for tuning. | Yes | AW-1-29, AW-1-121 | Used as is |
| AI logging and audit | AG-11-72 | AG-11 v1.12, L660 | Every model call logged with Doer, model, prompt version, firm, record, outcome. | Yes | AW-1-22, AW-1-55, AW-1-115, AW-2-21 | Used as is |
| AI logging and audit | AG-11-98 | AG-11 v1.12, L713 | Approval previews stored encrypted; interim retention for approval items and AI logs. | Yes | AW-1-59, AW-2-23 | Changed: CN-AG-11 ch. 11 |
| AI logging and audit | AG-11 BR-25 | AG-11 v1.12, L755 | Model calls logged with Doer, model, prompt version; no training. | Yes | — | Not used |
| AI logging and audit | AG-11 §7 AiRunLog | AG-11 v1.12, L879 | The AI run log record: firm, Doer, model, prompt version, references, confidence, outcome. | Yes | AW-1-64, AW-2-2, AW-2-21, AW-2-23, AW-2-67 | Changed: CN-AG-11 ch. 1, 7, 11 |
| AI logging and audit | AG-13-34 | AG-13 v1.12, L385 | A new Doer's events appear on the timeline automatically via a source registry. | Yes | — | Not used |
| AI logging and audit | AG-13 BR-1 | AG-13 v1.12, L418 | Every cross-cutting record attaches by entity type and id and carries the firm. | No (relied on) | — | Changed: CN-AG-13 ch. 5 |
| AI logging and audit | AG-16-20 | AG-16 v1.13, L445 | Owner-only firm data export, audited, personal data unmasked. | No (relied on) | — | Changed: CN-AG-16 ch. 5 |
| AI logging and audit | AG-16-21 | AG-16 v1.13, L446 | A per-individual data package, separately permissioned and audited. | No (relied on) | AW-1-24, AW-1-107 | Changed: CN-AG-16 ch. 5 |
| AI logging and audit | AG-16-29 | AG-16 v1.13, L460 | Sensitive settings, including the AI Doers switch, are audited. | Yes | AW-1-125 | Used as is |
| AI logging and audit | AG-16-39 | AG-16 v1.13, L474 | Firm export includes the Needs you approval history and import reports. | Yes | AW-1-24, AW-1-115 | Changed: CN-AG-16 ch. 5 |
| AI logging and audit | AG-17-58 | AG-17 v0.6, L826 | Every corporate-file action is audited, with "on behalf of" where applicable. | Yes | — | Not used |
| AI logging and audit | SA-1-50 | SA-01 v2.2, L286 | Every pack draft change, approval, publish and rollback is audited. | No (relied on) | AW-2-20 | Used as is |
| AI logging and audit | SA-4-39 | SA-04 v2.17, L490 | Every money action is audited with actor, target, before, after and reason. | No (relied on) | AW-2-20, AW-2-72 | Used as is |
| AI logging and audit | SA-11-1 | SA-11 v2.7, L347 | An append-only audit log of every security and data-significant event. | No (relied on) | AW-2-3, AW-2-18, AW-2-32 | Used as is |
| AI logging and audit | SA-11-2 | SA-11 v2.7, L348 | Audit entry fields, including actor type, which includes "system". | Yes | AW-2-2, AW-2-17, AW-2-18, AW-2-20 | Changed: CN-SA-11 ch. 4 |
| AI logging and audit | SA-11-3 | SA-11 v2.7, L349 | Audit entries are write-once. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| AI logging and audit | SA-11-4 | SA-11 v2.7, L350 | Audit entries are hash-chained and verifiable. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| AI logging and audit | SA-11-9 | SA-11 v2.7, L355 | Audit export with chain verification, itself logged. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| AI logging and audit | SA-11-13 | SA-11 v2.7, L362 | Platform retention periods per data category with legal floors. | No (relied on) | — | Changed: CN-SA-11 ch. 3 |
| AI logging and audit | SA-11-14 | SA-11 v2.7, L363 | Financial and staff-action audit kept at least seven years. | No (relied on) | AW-2-23 | Used as is |
| AI logging and audit | SA-12-25 | SA-12 v2.7, L386 | Every flag or setting change is audited in the same transaction. | No (relied on) | AW-2-29 | Used as is |

### A.9 Identity and on-behalf (39 rows)

| Area | Team ID | File, version, line | What it says | AI in own words | Used by (AW) | Status in Workstream 2 |
|---|---|---|---|---|---|---|
| Identity and on-behalf | AG1-D6 | AG-01 v1.18, L40 | Handover lists only eligible active staff, checked by permission; licensed for lead RCIC. | No (relied on) | AW-1-81 | Used as is |
| Identity and on-behalf | AG-1-13 | AG-01 v1.18, L397 | Active users and pending invitations count toward the seat limit, enforced server-side. | No (relied on) | AW-1-3, AW-1-12 | Changed: CN-AG-01 ch. 1 |
| Identity and on-behalf | AG-7-88 | AG-07 v2.7, L718 | Client visibility is enforced server-side within the firm, own or all. | No (relied on) | AW-1-59 | Changed: CN-AG-07 ch. 1 |
| Identity and on-behalf | AG-11-42 | AG-11 v1.12, L624 | Automations are strictly firm-scoped; never touch another tenant. | Yes | — | Not used |
| Identity and on-behalf | AG-11 BR-3 | AG-11 v1.12, L733 | Automations are tenant-isolated; a cross-tenant match is blocked. | Yes | AW-2-3 | Used as is |
| Identity and on-behalf | AG-11 BR-16 | AG-11 v1.12, L746 | Authoring automations needs dedicated keys; being affected needs none. | Yes | — | Not used |
| Identity and on-behalf | AG-13-67 | AG-13 v1.12, L412 | Tasks, reminders, notes and time entries follow the client or case visibility. | No (relied on) | AW-1-86 | Used as is |
| Identity and on-behalf | AG-14-19 | AG-14 v1.11, L398 | Dashboards are scoped server-side by the viewer's own or all permission. | No (relied on) | AW-1-108 | Used as is |
| Identity and on-behalf | AG-14-22 | AG-14 v1.11, L401 | Every metric drills through with the target module re-checking permission. | No (relied on) | AW-1-23, AW-1-111 | Used as is |
| Identity and on-behalf | AG-15-44 | AG-15 v1.7, L407 | Staff complete a client's upload or questionnaire item on the client's behalf. | Yes | — | Not used |
| Identity and on-behalf | AG-15-45 | AG-15 v1.7, L408 | Never "done on behalf" for a signature; paper signatures marked signed offline. | Yes | — | Not used |
| Identity and on-behalf | AG-15 BR-7 | AG-15 v1.7, L428 | Work-item status comes from the client's action, with one on-behalf exception. | Yes | — | Not used |
| Identity and on-behalf | AG17-D40 | AG-17 v0.6, L159 | Staff complete a client's portal to-do on their behalf, clearly marked and audited. | Yes | — | Not used |
| Identity and on-behalf | AG17-D66 | AG-17 v0.6, L185 | Done on behalf of client for uploads and questionnaires; never for signatures. | Yes | — | Changed: CN-AG-08 ch. 2 |
| Identity and on-behalf | AG17-D74 | AG-17 v0.6, L193 | Done on behalf needs no new permission; the item's existing one applies. | Yes | — | Not used |
| Identity and on-behalf | SA-2-16 | SA-02 v2.21, L388 | Support sessions on a firm need step-up and a reason; read-only by default. | No (relied on) | AW-2-65, AW-2-74 | Used as is |
| Identity and on-behalf | SA-2-26 | SA-02 v2.21, L404 | A firm may have one account manager; reassignment audited. | No (relied on) | AW-2-13, AW-2-14, AW-2-69, AW-2-73 | Used as is |
| Identity and on-behalf | SA-2-30 | SA-02 v2.21, L408 | Support sessions are read-only in payment hold; restricted in security lock. | No (relied on) | AW-2-69, AW-2-73 | Used as is |
| Identity and on-behalf | SA-3-41 | SA-03 v2.17, L517 | Seats count active, suspended and invited users. | No (relied on) | AW-1-3, AW-1-12, AW-2-15 | Changed: CN-SA-03 ch. 2 |
| Identity and on-behalf | SA4-D23 | SA-04 v2.17, L64 | The Admin may update the card and pay now; everything else Owner-only. | No (relied on) | AW-2-71 | Used as is |
| Identity and on-behalf | SA-4-54 | SA-04 v2.17, L507 | The firm's Owner and Admin have a billing screen; abilities fixed by SA-4-67. | No (relied on) | AW-2-65 | Used as is |
| Identity and on-behalf | SA6-D5 | SA-06 v3.3, L27 | Six starter roles seeded initially. | No (relied on) | AW-01 (outside §4 only) | Used as is |
| Identity and on-behalf | SA-6-1 | SA-06 v3.3, L449 | One exhaustive permission catalogue with a fixed key grammar. | No (relied on) | — | Changed: CN-SA-06 ch. 4 |
| Identity and on-behalf | SA-6-23 | SA-06 v3.3, L485 | Client keys under their canonical names. | No (relied on) | — | Changed: CN-SA-06 ch. 2 |
| Identity and on-behalf | SA7-D10 | SA-07 v2.12, L53 | Super Admin staff are deactivated only, never suspended. | No (relied on) | AW-2-14 | Used as is |
| Identity and on-behalf | SA7-D54 | SA-07 v2.12, L122 | Security settings Owner-only; engineers change flags and credentials. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| Identity and on-behalf | SA-7-3 | SA-07 v2.12, L411 | Every staff audit record identifies the actor as Expat Ready staff. | No (relied on) | AW-2-17 | Used as is |
| Identity and on-behalf | SA-7-10 | SA-07 v2.12, L424 | Step-up check required before sensitive staff actions. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| Identity and on-behalf | SA-7-13 | SA-07 v2.12, L430 | Content roles limited to assigned countries. | No (relied on) | AW-2-12, AW-2-13, AW-2-14, AW-2-41 | Used as is |
| Identity and on-behalf | SA-7-22 | SA-07 v2.12, L451 | Deactivation ends all sessions, including support sessions. | No (relied on) | AW-2-14 | Used as is |
| Identity and on-behalf | SA-7-39 | SA-07 v2.12, L474 | No route creates staff in production except the one-time setup. | No (relied on) | AW-2-10, AW-2-15 | Changed: CN-SA-07 ch. 3 |
| Identity and on-behalf | SA-10-5 | SA-10 v2.5, L354 | Support agents assign tickets; assignment audited. | No (relied on) | AW-2-13, AW-2-30, AW-2-62 | Used as is |
| Identity and on-behalf | SA-10-18 | SA-10 v2.5, L375 | Open impersonation from a ticket needs the impersonate key. | No (relied on) | — | Changed: CN-SA-10 ch. 4 |
| Identity and on-behalf | SA-10-19 | SA-10 v2.5, L376 | Without the impersonate key the action is refused and logged. | No (relied on) | — | Changed: CN-SA-10 ch. 4 |
| Identity and on-behalf | SA-11-12 | SA-11 v2.7, L358 | Cross-tenant operations emit a cross-tenant access event. | No (relied on) | AW-2-4, AW-2-5 | Used as is |
| Identity and on-behalf | FD-16 | Founder Decisions Log v1.5, L52 | AI assists, humans decide: no AI principal, outputs human-approved, provenance recorded. | Yes | AW-1-3, AW-1-21, AW-2-15, AW-2-17, AW-2-50 | Changed: CN-FDL ch. 9 |
| Identity and on-behalf | Doc 3 automation principal (July) | Doc 3 v1.4, L5194 | Guarded verbs run under a platform automation principal, pending Doc 1 amendment A4-1. | Yes | — | Not used |
| Identity and on-behalf | Product Vision v1.0 §Doers | Product Vision v1.0 (team, frozen 2 Aug), L35 | Doers act under delegated human or firm authority; a bounded AI layer operates them; humans approve. | Yes | — | Not used |
| Identity and on-behalf | Product Vision v1.0 Identity | Product Vision v1.0 (team, frozen 2 Aug), L514 | No AI principal and no AI login; a Doer acts under delegated human or firm authority. | Yes | — | Not used |

### A.10 Packs and rules (64 rows)

| Area | Team ID | File, version, line | What it says | AI in own words | Used by (AW) | Status in Workstream 2 |
|---|---|---|---|---|---|---|
| Packs and rules | AG-3-3 | AG-03 v1.4, L342 | Required assessment inputs are pack-driven; missing inputs show as gaps, not zeros. | No (relied on) | AW-1-93 | Used as is |
| Packs and rules | AG-9-12 | AG-09 v1.8, L485 | Document type metadata seeds expiry, translation and notarisation defaults. | No (relied on) | AW-1-76 | Used as is |
| Packs and rules | AG-11-9 | AG-11 v1.12, L563 | The builder's trigger and field catalogue is scoped to the firm's Country Pack. | Yes | — | Not used |
| Packs and rules | AG-11-107 | AG-11 v1.12, L724 | Timings of the five recipes are firm-editable; lead times and wording from the pack. | Yes | — | Changed: CN-AG-11 ch. 10 |
| Packs and rules | AG-11 BR-2 | AG-11 v1.12, L732 | Triggers and deadline definitions come only from the firm's Country Pack. | Yes | — | Not used |
| Packs and rules | AG-11 BR-9 | AG-11 v1.12, L739 | No automated message promises an immigration outcome; disclaimer and pack version. | Yes | AW-1-51 | Used as is |
| Packs and rules | AG-12-24 | AG-12 v1.2, L299 | Consent and legal copy is authored per locale, never machine-translated. | No (relied on) | AW-1-82 | Changed: CN-AG-12 ch. 2 |
| Packs and rules | AG-17-26 | AG-17 v0.6, L742 | The candidate log records applicants with pack-driven status, outcome and reason. | No (relied on) | — | Changed: CN-AG-17 ch. 2 |
| Packs and rules | AG-18-10 | AG-18 v1.2, L348 | Source program names are grouped and mapped to pack programs; suggestions flagged. | No (relied on) | AW-1-106 | Changed: CN-AG-18 ch. 1 |
| Packs and rules | AG-18-81 | AG-18 v1.2, L443 | The key-date target is enabled only for pack-declared key-date types. | No (relied on) | — | Changed: CN-AG-18 ch. 2 |
| Packs and rules | SA1-D2 | SA-01 v2.2, L26 | English required for Canada in Release 1; French optional, never a block. | No (relied on) | AW-2-49 | Used as is |
| Packs and rules | SA1-D3 | SA-01 v2.2, L27 | Each client's work stays on its starting rules; newer rules adopted deliberately. | No (relied on) | — | Changed: CN-SA-01 ch. 2, 3 |
| Packs and rules | SA1-D6 | SA-01 v2.2, L30 | A production pack needs a second person; author and submitter never publish it. | No (relied on) | AW-2-43 | Used as is |
| Packs and rules | SA1-X4 | SA-01 v2.2, L76 | Pending knock-on: newer-rules prompt and one-click adoption in AG-3 and AG-7. | No (relied on) | — | Changed: CN-SA-01 ch. 3 |
| Packs and rules | SA1-X5 | SA-01 v2.2, L77 | Pending knock-on: questionnaire, stages and form maps consumed read-only by automation. | Yes | — | Not used |
| Packs and rules | SA-1-47 | SA-01 v2.2, L283 | Submit and publish run mandatory validation; published versions never change. | No (relied on) | AW-2-75 | Used as is |
| Packs and rules | SA-1-49 | SA-01 v2.2, L285 | A publisher can roll back to an earlier version with a written reason. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| Packs and rules | SA-1-52 | SA-01 v2.2, L290 | Preview is a test run of rules and scoring on a sample client. | No (relied on) | AW-2-30, AW-2-50, AW-2-51 | Changed: CN-SA-01 ch. 1 |
| Packs and rules | SA-1-53 | SA-01 v2.2, L291 | Any two pack versions can be compared per content area. | No (relied on) | AW-2-51, AW-2-52, AW-2-75 | Used as is |
| Packs and rules | SA-1-56 | SA-01 v2.2, L294 | Pack import previews first and commits all or nothing as draft. | No (relied on) | AW-2-42 | Used as is |
| Packs and rules | SA-1-58 | SA-01 v2.2, L298 | Client work is pinned to its pack version; adoption is explicit and audited. | No (relied on) | — | Changed: CN-SA-01 ch. 3 |
| Packs and rules | SA-1-61 | SA-01 v2.2, L302 | Only someone other than author and submitter approves a production draft. | No (relied on) | AW-2-43, AW-2-59 | Used as is |
| Packs and rules | SA-1-62 | SA-01 v2.2, L303 | Super Admin lists how many clients per firm are pinned to each version. | No (relied on) | AW-2-5, AW-2-55 | Changed: CN-SA-01 ch. 3 |
| Packs and rules | SA-1-21 | SA-01 v2.2, L313 | Scoring requirements SA-1-21 to SA-1-26 now live in SA-01B section 3.6. | No (relied on) | AW-2-48 | Used as is |
| Packs and rules | SA-1-42 | SA-01 v2.2, L318 | Labels and translation authoring live in SA-01B section 3.9. | No (relied on) | AW-2-49 | Used as is |
| Packs and rules | SA1B-D17 | SA-01B v1.2, L41 | Reference tables via a table designer; definitions need second-person approval. | No (relied on) | — | Changed: CN-SA-01B ch. 3 |
| Packs and rules | SA1B-D18 | SA-01B v1.2, L42 | Rules and scoring trusted by second-person approval alone; no test sets. | No (relied on) | — | Changed: CN-SA-01B ch. 2 |
| Packs and rules | SA1B-D23 | SA-01B v1.2, L47 | Deficiency reasons are firm-owned; the pack has no deficiency library. | No (relied on) | AW-1-77 | Used as is |
| Packs and rules | SA-1B-17 | SA-01B v1.2, L161 | A pack section reports where it is used; unused sections listed. | No (relied on) | AW-2-55 | Used as is |
| Packs and rules | SA-1B-18 | SA-01B v1.2, L165 | A master document is defined once with formats, translation and handling class. | No (relied on) | AW-1-76 | Used as is |
| Packs and rules | SA-1B-21 | SA-01B v1.2, L168 | Each document type states whether and how it expires. | No (relied on) | AW-1-76 | Used as is |
| Packs and rules | SA-1B-22 | SA-01B v1.2, L169 | Each document type states what it must outlive. | No (relied on) | AW-1-76 | Used as is |
| Packs and rules | SA-1B-25 | SA-01B v1.2, L172 | The pack carries no deficiency-reason library; reasons are firm-owned. | No (relied on) | AW-1-77 | Used as is |
| Packs and rules | SA-1B-26 | SA-01B v1.2, L182 | A master form is defined once; rows point at the form, not the edition. | No (relied on) | AW-1-83, AW-2-47 | Used as is |
| Packs and rules | SA-1B-27 | SA-01B v1.2, L183 | A box map maps a form box to a field with transform, value map and overflow. | No (relied on) | AW-2-45 | Used as is |
| Packs and rules | SA-1B-29 | SA-01B v1.2, L185 | Each box is filled, needs review or unmapped; a form is not ready otherwise. | No (relied on) | AW-2-19, AW-2-45, AW-2-57 | Used as is |
| Packs and rules | SA-1-28 | SA-01B v1.2, L196 | Form editions carry dates and PDFs; firms warned about outdated editions. | No (relied on) | AW-2-44 | Used as is |
| Packs and rules | SA-1-30 | SA-01B v1.2, L198 | A PDF's fillable fields are read on upload; mappings must resolve. | No (relied on) | AW-2-44, AW-2-45, AW-2-46 | Used as is |
| Packs and rules | SA-1-31 | SA-01B v1.2, L199 | A field map can be exported and re-imported, all or nothing. | No (relied on) | AW-2-19, AW-2-42, AW-2-46 | Changed: CN-SA-01B ch. 6 |
| Packs and rules | SA-1B-37 | SA-01B v1.2, L205 | Eligibility gates and scoring grids are pack content reporting their use. | No (relied on) | AW-2-55 | Used as is |
| Packs and rules | SA-1B-38 | SA-01B v1.2, L206 | Gate and grid changes are trusted by second-person approval; no test set. | No (relied on) | — | Changed: CN-SA-01B ch. 2 |
| Packs and rules | SA-1B-39 | SA-01B v1.2, L207 | Every government-rule item carries a source, date checked and next-review date. | No (relied on) | AW-1-67, AW-2-34, AW-2-48, AW-2-53 | Changed: CN-SA-01B ch. 4 |
| Packs and rules | SA-1B-40 | SA-01B v1.2, L208 | Overdue review items go on a work queue and warn at publish. | No (relied on) | AW-2-53, AW-2-56 | Changed: CN-SA-01B ch. 5 |
| Packs and rules | SA-1-19 | SA-01B v1.2, L214 | Rule sets can be test-run on a sample client, per-rule results. | No (relied on) | AW-2-51 | Changed: CN-SA-01B ch. 2 |
| Packs and rules | SA-1-24 | SA-01B v1.2, L219 | Tables are checked before publish for gaps, overlaps and resolvability. | No (relied on) | AW-2-46 | Used as is |
| Packs and rules | SA-1-25 | SA-01B v1.2, L220 | Two configuration versions can be compared. | No (relied on) | AW-2-51 | Used as is |
| Packs and rules | SA-1-26 | SA-01B v1.2, L221 | A scoring configuration can be test-run on a sample client. | No (relied on) | AW-2-51 | Changed: CN-SA-01B ch. 2 |
| Packs and rules | SA-1B-41 | SA-01B v1.2, L225 | Content managers create reference table types and typed columns. | No (relied on) | AW-2-48 | Used as is |
| Packs and rules | SA-1B-44 | SA-01B v1.2, L228 | Table rows maintained in the console or by validated bulk upload. | No (relied on) | AW-2-46, AW-2-48 | Changed: CN-SA-01B ch. 3 |
| Packs and rules | SA-1-41 | SA-01B v1.2, L234 | Large tables bulk-uploaded with preview, all or nothing. | No (relied on) | AW-2-42 | Changed: CN-SA-01B ch. 6 |
| Packs and rules | SA-1B-48 | SA-01B v1.2, L249 | The pack holds required assessment wording firms cannot remove. | No (relied on) | AW-2-49 | Used as is |
| Packs and rules | SA-1-43 | SA-01B v1.2, L258 | Translations edited side by side with completeness per area. | No (relied on) | AW-2-49 | Used as is |
| Packs and rules | SA-1B-57 | SA-01B v1.2, L282 | One line shape for every pack row: what, item, who, condition, order. | No (relied on) | AW-2-47 | Used as is |
| Packs and rules | SA-1B-59 | SA-01B v1.2, L284 | Every resolved item carries the reason it is there. | No (relied on) | AW-1-67 | Used as is |
| Packs and rules | SA-1B-61 | SA-01B v1.2, L286 | Row tools: copy, bulk add or remove with affected rows listed, preview. | No (relied on) | AW-2-47 | Used as is |
| Packs and rules | SA-1B-62 | SA-01B v1.2, L287 | Preview shows a sample family's questionnaire, checklist and forms. | No (relied on) | AW-2-50 | Changed: CN-SA-01B ch. 2 |
| Packs and rules | SA-1B-89 | SA-01B v1.2, L326 | Assessments never compare against draw cut-offs; no draw data in packs. | No (relied on) | AW-2-51 | Used as is |
| Packs and rules | SA-5-15 | SA-05 v2.4, L250 | English and French side by side; legal text never machine-translated. | No (relied on) | AW-2-49 | Used as is |
| Packs and rules | SA7-D48 | SA-07 v2.12, L116 | Content authors publish their own test packs; production needs an approver. | No (relied on) | AW-2-59 | Used as is |
| Packs and rules | SA7-D49 | SA-07 v2.12, L117 | A content approver never edits a draft. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| Packs and rules | FD-3 | Founder Decisions Log v1.5, L28 | Packs pin at case open, with explicit audited re-pin. | No (relied on) | AW-2-5 | Used as is |
| Packs and rules | FD-4 | Founder Decisions Log v1.5, L29 | Two-person review for rules, scoring and eligibility; reference data a platform toggle. | No (relied on) | AW-2-48 | Changed: CN-FDL ch. 1, 12 |
| Packs and rules | FD-22 | Founder Decisions Log v1.5, L58 | Two pack axes: Country Pack for destination, Practice Pack for the firm's regulator. | Yes | AW-01 (outside §4 only) | Changed: CN-FDL ch. 8 |
| Packs and rules | Shared Overview, Automation templates | Shared 00-Overview v3.9, L172 | Country packs carry pre-built Conductor/Doer automation blueprints per program. | Yes | — | Not used |

### A.11 Anything else AI (62 rows)

| Area | Team ID | File, version, line | What it says | AI in own words | Used by (AW) | Status in Workstream 2 |
|---|---|---|---|---|---|---|
| Anything else AI | Agent Overview, Agent-native operation | Agent 00-Overview v1.12, L119–133 | Principles every module follows: firm decides, one record, Doers work, people approve, AI optional. | Yes | — | Not used |
| Anything else AI | Agent Phasing, Release 1 row | Agent 99-Phasing v1.4, L19 | Release 1 includes the minimal Conductor, autonomy levels, Needs you, the AI Doers, WhatsApp. | Yes | — | Not used |
| Anything else AI | Agent Phasing, Glossary | Agent 99-Phasing v1.4, L51–71 | Team definitions of Conductor, Doer, AI Doers, autonomy level, Needs you, Filler, Reviewer. | Yes | — | Not used |
| Anything else AI | AG-2-26 | AG-02 v1.9, L588 | Won and Lost are terminal stages; Won only from Proposal or Retainer Sent. | No (relied on) | AW-1-19, AW-1-44, AW-1-87, AW-1-92 | Used as is |
| Anything else AI | AG-2-27 | AG-02 v1.9, L589 | Moving a lead to Lost requires the loss flow with a mandatory reason. | No (relied on) | AW-1-44 | Used as is |
| Anything else AI | AG-2-29a | AG-02 v1.9, L594 | Reopening a lost or converted lead creates a new prospect, never resurrects the old. | No (relied on) | AW-1-87 | Used as is |
| Anything else AI | AG-2-37 | AG-02 v1.9, L607 | Lead detail shows a rule-based next-best action from stage, assessment and activity. | No (relied on) | AW-1-89 | Used as is |
| Anything else AI | AG-2-47 | AG-02 v1.9, L628 | Converting a lead carries history and profile forward and emits prospect.converted. | No (relied on) | AW-1-44 | Used as is |
| Anything else AI | AG-3-38 | AG-03 v1.4, L393 | A consultant produces and shares a client-facing assessment summary; sharing is audited. | No (relied on) | AW-1-90 | Changed: CN-AG-03 ch. 2 |
| Anything else AI | AG-4-49 | AG-04 v1.5, L522 | A completed booking opens a consult record with notes, pathway, services and fee. | No (relied on) | AW-1-95 | Used as is |
| Anything else AI | AG7-D10 | AG-07 v2.7, L220 | No masking or reveal of personal data anywhere (conflicts with FD-15). | No (relied on) | — | Changed: CN-AG-07 ch. 1; CN-SA-06 ch. 2 |
| Anything else AI | AG7-D14 | AG-07 v2.7, L226 | Case readiness is a state first (Not ready, Attention, Ready), then a score. | No (relied on) | — | Changed: CN-AG-07 ch. 2 |
| Anything else AI | AG-07 BR-26 | AG-07 v2.7, L753 | We work for the firm, not the regulator: safe defaults, the firm decides. | Yes | — | Not used |
| Anything else AI | AG-8-37 | AG-08 v1.7, L407 | Questionnaire personal data is never masked (conflicts with FD-15). | No (relied on) | — | Changed: CN-AG-08 ch. 3 |
| Anything else AI | AG-11 BR-34 | AG-11 v1.12, L764 | We work for the firm, not the regulator; only four floors are fixed. | Yes | AW-1-51 | Changed: CN-AG-11 ch. 8, 13 |
| Anything else AI | AG-15-12 | AG-15 v1.7, L355 | Corporate seats; Release 1 only the employer's primary contact has access. | No (relied on) | — | Changed: CN-AG-15 ch. 1 |
| Anything else AI | AG17-D51 | AG-17 v0.6, L170 | Release 1 includes a full LMIA end to end; other corporate services Release 2. | No (relied on) | — | Changed: CN-AG-17 ch. 3 |
| Anything else AI | AG17-D60 | AG-17 v0.6, L179 | Release 1 and 2 replace phases; Release 1 includes AG-17 and the Minder. | Yes | — | Not used |
| Anything else AI | AG-17-80 | AG-17 v0.6, L803 | Candidate log bulk import from CSV; failed rows listed, not dropped. | No (relied on) | AW-1-85 | Used as is |
| Anything else AI | AG-18-8 | AG-18 v1.2, L346 | Each source column maps to at most one field; unmapped required fields block. | No (relied on) | AW-1-106 | Changed: CN-AG-18 ch. 1 |
| Anything else AI | AG-18-15 | AG-18 v1.2, L355 | A mandatory dry-run preview before any import batch writes. | No (relied on) | AW-1-106 | Used as is |
| Anything else AI | AG-18-29 | AG-18 v1.2, L373 | Notes import as historical timeline entries. | No (relied on) | — | Changed: CN-AG-18 ch. 2 |
| Anything else AI | AG-18-49 | AG-18 v1.2, L403 | The Owner attests the right to transfer data before a batch runs. | No (relied on) | AW-1-106 | Used as is |
| Anything else AI | AG-18-83 | AG-18 v1.2, L445 | Import batch states include dry-running, undoing and cancelled. | No (relied on) | AW-1-19 | Used as is |
| Anything else AI | SA2-X1 | SA-02 v2.21, L130 | Applied knock-on to SA-4: sign-up checkout, trial billing, owner cancellation. | No (relied on) | — | Changed: CN-SA-02 ch. 1 |
| Anything else AI | SA-2-4 | SA-02 v2.21, L367 | Firm status values and allowed transitions. | No (relied on) | AW-2-73 | Used as is |
| Anything else AI | SA-2-14 | SA-02 v2.21, L383 | Per-firm view of status, plan, payment, usage and last login. | No (relied on) | AW-2-63 | Used as is |
| Anything else AI | SA-2-14a | SA-02 v2.21, L384 | Firm alerts go to the account manager or the shared inbox. | No (relied on) | AW-2-30, AW-2-69 | Used as is |
| Anything else AI | SA3-D14 | SA-03 v2.17, L74 | Plans have four limits only. | No (relied on) | AW-1-54 | Used as is |
| Anything else AI | SA3-D20 | SA-03 v2.17, L80 | Extra corporate portal seats are not Release 1 (WS2 change proposed). | No (relied on) | — | Changed: CN-AG-15 ch. 2; CN-SA-03 ch. 3 |
| Anything else AI | SA-3-40 | SA-03 v2.17, L516 | Storage limit becomes hard 14 days after first exceeding it. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| Anything else AI | SA-3-58 | SA-03 v2.17, L540 | Downgrade check lists limits and features over the target plan. | No (relied on) | AW-2-71 | Used as is |
| Anything else AI | SA4-D1 | SA-04 v2.17, L42 | A short list of approved discounts, applied by Super Admin with a reason. | No (relied on) | AW-2-71 | Used as is |
| Anything else AI | SA-4-15 | SA-04 v2.17, L452 | Super Admin subscription detail with timeline, invoices and actions. | No (relied on) | AW-2-63 | Used as is |
| Anything else AI | SA-4-19 | SA-04 v2.17, L458 | Super Admin sends an update-your-card link; never sees card details. | No (relied on) | AW-2-65 | Used as is |
| Anything else AI | SA-4-21 | SA-04 v2.17, L462 | 14 days full access; reminders on days 7 and 12; automatic retries. | No (relied on) | — | Changed: CN-SA-04 ch. 2 |
| Anything else AI | SA-4-28 | SA-04 v2.17, L473 | Only the Owner changes plan among public plans; Super Admin with a reason. | No (relied on) | AW-2-65, AW-2-71, AW-2-72 | Changed: CN-SA-04 ch. 3 |
| Anything else AI | SA-4-29 | SA-04 v2.17, L474 | Paying more applies at once; paying the same or less at renewal. | No (relied on) | AW-2-71 | Used as is |
| Anything else AI | SA-4-36 | SA-04 v2.17, L483 | Webhook-log key holders view and safely re-run failed notifications. | No (relied on) | AW-2-65 | Changed: CN-SA-04 ch. 1 |
| Anything else AI | SA-4-42 | SA-04 v2.17, L495 | Billing maintains approved discounts with limits; never unlimited. | No (relied on) | AW-2-71 | Used as is |
| Anything else AI | SA-4-43 | SA-04 v2.17, L496 | Super Admin applies one approved discount to a firm with a reason. | No (relied on) | AW-2-60, AW-2-70, AW-2-71, AW-2-72 | Changed: CN-SA-04 ch. 3 |
| Anything else AI | SA-4-53 | SA-04 v2.17, L506 | Who receives invoices, receipts and payment-failure notices. | No (relied on) | AW-2-70 | Used as is |
| Anything else AI | SA-4-65 | SA-04 v2.17, L518 | Subscription terms and billing documents are bilingual, French first. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| Anything else AI | SA-4-68 | SA-04 v2.17, L521 | The Owner sees the processor's charge preview before confirming a change. | No (relied on) | AW-2-71 | Used as is |
| Anything else AI | SA-4-69 | SA-04 v2.17, L522 | No plan change while overdue, on hold or with cancellation pending. | No (relied on) | AW-2-71 | Used as is |
| Anything else AI | SA-4-76 | SA-04 v2.17, L529 | No downgrade while the firm is over a lower plan's limit. | No (relied on) | AW-2-71 | Used as is |
| Anything else AI | SA-4-77 | SA-04 v2.17, L530 | Downgrade plus monthly-to-yearly takes effect at renewal. | No (relied on) | AW-2-71 | Used as is |
| Anything else AI | SA-4-79 | SA-04 v2.17, L534 | A trial ending with no card goes straight to payment hold. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| Anything else AI | SA-4-80 | SA-04 v2.17, L535 | Billing may extend a trial with a reason, up to 90 days total. | No (relied on) | AW-2-60, AW-2-70 | Used as is |
| Anything else AI | SA-10-6 | SA-10 v2.5, L355 | Category-driven ticket routing to agent pools. | No (relied on) | AW-2-64 | Used as is |
| Anything else AI | SA-10-10 | SA-10 v2.5, L361 | Bilingual canned responses inserted and edited before sending. | No (relied on) | AW-2-19, AW-2-30, AW-2-61, AW-2-66 | Used as is |
| Anything else AI | SA-10-21 | SA-10 v2.5, L380 | Tickets resolve, reopen within a window, then auto-close. | No (relied on) | AW-2-16 | Changed: CN-SA-10 ch. 4 |
| Anything else AI | SA-10-26 | SA-10 v2.5, L391 | A deactivated support agent's tickets return to the queue. | No (relied on) | AW-2-14, AW-2-73 | Used as is |
| Anything else AI | SA-11-10 | SA-11 v2.7, L356 | Withdrawn (AG7-D10). | No (relied on) | — | Changed: CN-SA-11 ch. 5 |
| Anything else AI | SA-11-18 | SA-11 v2.7, L367 | Legal holds block archival, disposal and deletion. | No (relied on) | AW-1-107 | Used as is |
| Anything else AI | SA-11-24 | SA-11 v2.7, L379 | A breach register records every breach of safeguards. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| Anything else AI | SA-11-25 | SA-11 v2.7, L380 | Breach notification support where the harm threshold is crossed. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| Anything else AI | SA-11-26 | SA-11 v2.7, L381 | The breach screen shows time since discovery against 72 hours. | No (relied on) | AW-02 (outside §4 only) | Used as is |
| Anything else AI | SA-11-28 | SA-11 v2.7, L386 | Deletion requests check holds and floors; never falsely completed. | No (relied on) | AW-1-107 | Used as is |
| Anything else AI | FD-15 | Founder Decisions Log v1.5, L40 | Restricted document metadata encrypted with masked, audited reveal. | No (relied on) | AW-1-59 | Changed: CN-FDL ch. 5 |
| Anything else AI | Product Vision v1.0 positioning | Product Vision v1.0 (team, frozen 2 Aug), L18 | An AI layer operates across the product, directing the Doers, with human approval where a model was involved. | Yes | — | Not used |
| Anything else AI | Charter, Not in Release 1 | Program Charter V1 (expanded; V2 slides match), L107, 121 | AI-assisted features and the AG-11 engine and its Doers are not in Release 1. | Yes | — | Not used |
### A.12 Numbers Workstream 2 proposed inside the team's numbering (not in the team's files)

**What this table is.** Our change notes propose these numbers inside the team's own ranges. None of them exists in the 11 Oct team files, so they are **not team requirements**. AW requirements that rest only on them count as NEW in Register B.

**Left out of the table:**
- Withdrawn numbers: AG-6-48, AG-6-49 and SA-3-63.
- "Next free number" lines that hold no requirement: SA-1-68, SA-2-43, SA-4-90, SA-5-49, SA-7-49 and SA-8-53.

**Collisions.** CN-AG-12 and CN-AG-14 themselves note that July Doc 3 v1.4 already uses AG-12-38/39 and AG-14-35 to 39 for other rules.

| Number | Proposed by | What it would hold | Nature | Cited by AW requirements | Note |
|---|---|---|---|---|---|
| AG7-D28 | CN-AG-07 | Masking decision row bringing back FD-15 | Non-AI product work | 0 | — |
| AG-3-42 | CN-AG-03 | Assessment-created event | Automation | 1 | — |
| AG-4-56 | CN-AG-04 | Person-entered consult scope field; AI-drafted notes flag | AI-driven | 2 | — |
| AG-5-54 | CN-AG-05 | Email passcode before every retainer signature (FD-21) | Non-AI product work | 2 | — |
| AG-5-55 | CN-AG-05 | No AI text in a retainer; fee funds designation field | AI and non-AI | 1 | — |
| AG-5-56 | CN-AG-05 | Executed retainer can be ended; emits retainer.ended | Automation | 1 | — |
| AG-6-44 | CN-AG-06 | Payment matching: assistant proposes, person records | AI | 3 | — |
| AG-6-45 | CN-AG-06 | Proposed invoices open the builder pre-filled | AI | 2 | — |
| AG-6-46 | CN-AG-06 | Trust records named (FD-17) | Non-AI product work | 2 | — |
| AG-6-47 | CN-AG-06 | The assistant's limits on trust money | AI | 3 | — |
| AG-7-93 | CN-AG-07 | Officer acceptance of the readiness report is the submission for review | AI-driven product rule | 2 | — |
| AG-9-54 | CN-AG-09 | Restricted document data encrypted and masked (FD-15) | Non-AI product work | 1 | — |
| AG-10-60 | CN-AG-10 | Shared-sender mark: a bank address never learned as one client's | AI-driven (Sorter matching) | 1 | — |
| AG-11-109 | CN-AG-11 | Six new actions on the Conductor's closed list | AI | 9 | — |
| AG-11-110 | CN-AG-11 | Further trigger events (billing, case, appointment, data-subject, consent) | Automation | 6 | — |
| AG-11-111 | CN-AG-11 | Two run targets: firm-level schedule; batch or request | Automation | 5 | — |
| AG-11-112 | CN-AG-11 | Approval-item kinds and fields; the four pause reasons | AI | 18 | — |
| AG-11-113 | CN-AG-11 | Delegation, persona run and "started by" on runs and logs | AI | 13 | — |
| AG-11-114 | CN-AG-11 | Assistant recipes as seed rows; double-run key; engine rules | AI | 7 | — |
| AG-11-115 | CN-AG-11 | Send-time block: no status template to a lead | Automation and AI | 2 | — |
| AG-12-38 | CN-AG-12 | "Contains status or eligibility content" mark on templates | AI-driven | 2 | Number also used by July Doc 3 v1.4 L5873 for a different rule |
| AG-12-39 | CN-AG-12 | Case letter type within the document/letter family | Non-AI product work | 1 | Number also used by July Doc 3 v1.4 L5876 for a different rule |
| AG-13-68 | CN-AG-13 | Audit-field rule: mode, delegation, started by, persona run | AI | 5 | — |
| AG-13-69 | CN-AG-13 | AI-drafted note mark; note reaches the record through a person | AI | 3 | — |
| AG-14-35 | CN-AG-14 | Practice expert menu of four fixed questions | Non-AI product work (rule-built answers) | 3 | Number also used by July Doc 3 v1.4 for a custom-dashboard rule |
| AG-14-36 | CN-AG-14 | Practice expert answer rules (part of the menu set) | Non-AI product work | 2 | Number also used by July Doc 3 v1.4 |
| AG-14-37 | CN-AG-14 | Practice expert answer rules (part of the menu set) | Non-AI product work | 1 | Number also used by July Doc 3 v1.4 |
| AG-14-38 | CN-AG-14 | Practice expert answer rules (part of the menu set) | Non-AI product work | 8 | Number also used by July Doc 3 v1.4 |
| AG-14-39 | CN-AG-14 | The firm's own AI measures | AI | 4 | Number also used by July Doc 3 v1.4 |
| AG-14-40 | CN-AG-14 | Three standing lines on every expert answer; untested pack line | Mostly non-AI | 7 | — |
| AG-16-55 | CN-AG-16 | When AI is paused the firm sees why and nothing sends | AI | 4 | — |
| AG-16-56 | CN-AG-16 | Pause AI client-facing preparation with no active licensed user | AI | 2 | — |
| AG-16-57 | CN-AG-16 | One switch per assistant; firm's stricter values | AI | 9 | — |
| AG-17-91 | CN-AG-17 | AI-proposed LMIA entries wait for a person; no screening | AI | 1 | — |
| AG-18-92 | CN-AG-18 | AI mapping proposals count only when confirmed | AI | 1 | — |
| AG-18-93 | CN-AG-18 | A date in an imported note reaches the Minder only through a person | AI-driven (Minder) | 1 | — |
| AG-18-94 | CN-AG-18 | Import batch "ready for mapping" event | Automation | 1 | — |
| SA-1-66 | CN-SA-01 | Rehearsal report on synthetic samples before pack approval | AI-driven pack governance | 5 | — |
| SA-1-67 | CN-SA-01 | Plain-words release note on every pack version | Non-AI product work | 3 | — |
| SA-2-42 | CN-SA-02 | Account-manager message to a firm through the Mailer | Non-AI product work (needed by AW-02) | 1 | — |
| SA-4-89 | CN-SA-04 | Second person confirms an assistant-proposed account change | AI | 4 | — |
| SA-5-47 | CN-SA-05 | Expat Ready presets the status/eligibility mark on masters | AI-driven | 0 | — |
| SA-5-48 | CN-SA-05 | Case letter masters per country | Non-AI product work | 0 | — |
| SA-6-44 | CN-SA-06 | Which permission keys may be lent to an AI assistant | AI | 10 | — |
| SA-7-48 | CN-SA-07 | An AI assistant is not a staff account | AI | 2 | — |
| SA-8-49 | CN-SA-08 | The AI provider record (Canada region, terms, passed test call) | AI | 3 | — |
| SA-8-50 | CN-SA-08 | Provider on the status page; Owner may withdraw the record | AI | 4 | — |
| SA-8-51 | CN-SA-08 | The record governs every Expat Ready AI call | AI | 1 | — |
| SA-8-52 | CN-SA-08 | Read-only government source rail for the watcher | AI-driven | 3 | — |
| SA-9-24 | CN-SA-09 | AI measures in platform analytics, de-identified | AI | 1 | — |
| SA-11-32 | CN-SA-11 | AI processing category: Canada only, no safeguards route | AI | 1 | — |
| SA-12-31 | CN-SA-12 | AI emergency stops: one for AI Doers, one per assistant | AI | 9 | — |
| SA-12-32 | CN-SA-12 | Recall action and its permission | AI | 3 | — |
| SA-12-33 | CN-SA-12 | AI settings: founder safeguards, approve-all values, spend caps | AI | 8 | — |
| AG-03 BR-19, AG-11 BR-42, AG-12 BR-15, AG-13 BR-22, AG-14 BR-17, AG-17 BR-17, SA-05 BR-17, SA-06 BR-27, SA-07 BR-21 | the CN of each module | New business rules | Mixed | see Register B | AG-14 BR-17 and AG-17 BR-17 reuse the same number in two modules, as the team's own numbering allows |
| FD-23 to FD-31 | CN-FDL ch. 8 | The founder's Workstream 2 decisions as Founder Decisions Log rows | AI | 0 | Numbers marked *to assign* by the founder; until placed, decisions.md and CN-FDL both hold them |
## 3. Register B: what Workstream 2 adds

**How to read it.**
- **One row per AW requirement**: AW-1-1 to AW-1-126 and AW-2-1 to AW-2-77.
- **"Team requirement it extends"** names the team IDs or sections that the AW requirement's own *Ext:* or *Extends* field cites, and that exist in the team files.
  - A team ID cited only "as a pattern", or only as "nearest", does not count.
  - A Workstream 2 number (§A.12) does not count either; those appear in the next column.
- **NEW** means there is no team requirement to hang from.
- **Every AW requirement describes new assistant behaviour.** "Extends" only means it hangs from an existing team rule.
- **AW business rules are not given their own rows.** There are 40 of them. 38 summarise the numbered requirements they cite in brackets (for example AW1-BR-1 cites AW-1-1 and AW-1-2). The other two are process rules, not product behaviour:
  - AW1-BR-22: a founder decision is never overridden by a newer team file.
  - AW2-BR-14: provisional until counsel has read it.

**Kind**, our honest reading of each requirement:
- **M**: a task in which a model is called (Reader, Sorter, Writer or Checker).
- **R**: a task done by rules only, with no model call. Ordinary automation could do it.
- **G**: a control on the AI layer: delegation, limits, audit, switches, caps, evaluation.

### B.1 AW-01 (126 requirements)

| AW ID | What it is (short) | Kind | Team requirement it extends | Workstream 2 numbers it also rests on | NEW: why needed · AI-specific or non-AI |
|---|---|---|---|---|---|
| AW-1-1 | An assistant is recipes run by the Conductor under one delegation | G | AG-11-1, AG-11-2, AG-11-13 | AG-11 BR-42 | — |
| AW-1-2 | Every model call is a plain AI Doer call | G | AG-11-70, AG-11-94 | AG-11-113 | — |
| AW-1-3 | No identity of its own; actor is the delegating person | G | FD-16, SA-3-41, AG-1-13 | AG-13-68 | — |
| AW-1-4 | Only closed-list actions or existing rules | G | AG-11-2, AG-11-10 | AG-11-109 | — |
| AW-1-5 | The delegation record | G | NEW (nearest: AG-11 v1.12 §7) | SA-6-44 | No team record says which assistant works for which named person, with which permissions (FD-16 bars an AI principal but defines no on-behalf record). · **AI-specific** |
| AW-1-6 | Who sets up, accepts, declines or ends a delegation | G | NEW (nearest: SA-06 v3.3 Appendix C) | — | Someone must set up, accept and end that record; no team rule covers it. · **AI-specific** |
| AW-1-7 | Any active user may delegate; licence shown, not gating | G | AG-11-88, SA6-D9 | — | — |
| AW-1-8 | Permission subset taken key by key from the role | G | SA-06 v3.3 §10b | SA-6-44, SA-06 BR-27 | — |
| AW-1-9 | Never-lendable keys refused on the server | G | SA-06 v3.3 §10b | SA-6-44 | — |
| AW-1-10 | Keys re-checked at every action | G | AG-11-28, AG-11 v1.12 §11 | SA-6-44, SA-06 BR-27 | — |
| AW-1-11 | Pause and end of a delegation | G | AG-11-45 | AG-11-112, SA-12-31, SA-8-50 | — |
| AW-1-12 | One live delegation per person, assistant and role | G | SA-3-41, AG-1-13 | — | — |
| AW-1-13 | Assistant recipes are seeded rows, off until enabled | G | AG-11-21, AG-11-24, AG-11-31 | AG-11-114 | — |
| AW-1-14 | Rehearsal before enabling, shown per recipe | G | AG-11-29, AG-11-30 | AG-11-114 | — |
| AW-1-15 | Product seeds and AI Doer calls stay firm automations | G | AG-11-75, AG-11-106, AG-9-42, AG-10-37, AG-7-61 | — | — |
| AW-1-16 | The persona run record | G | AG-11-34, AG-11-35 | AG-11-113 | — |
| AW-1-17 | Restarting continues the open run | G | NEW (nearest: AG-11-34) | — | Stops two runs of one assistant on the same file; the engine has no notion of an assistant run. · **AI-specific** |
| AW-1-18 | Double-run check before each action | G | AG-11-25, AG-6-9 | AG-11-114 | — |
| AW-1-19 | Stop rules per run type | G | AG-7-34, AG-7-50, AG-11-87, AG-11-101, AG-2-26, AG-18-83, SA-11-27 | AG-11-110, AG-5-56 | — |
| AW-1-20 | Waiting items: one rule per halt reason | G | AG-11-61, AG-11-101, AG-16-37 | AG-11-112, SA-12-31, SA-12-32, SA-12-33, AG-16-55 | — |
| AW-1-21 | Audit of every assistant act and decision | G | AG-11-43, AG-11-62, FD-16 | AG-13-68, AG-11-113 | — |
| AW-1-22 | Links from AI run log to delegation and decision | G | AG-11-72 | AG-11-112, AG-11-113 | — |
| AW-1-23 | AI provenance view per file | G | NEW | — | A firm must be able to show who approved each AI-prepared item; the team has only the dashboard drill-through pattern (AG-14-22). · **AI-specific** |
| AW-1-24 | Firm export carries AI records | G | AG-16-39, AG-16-21 | — | — |
| AW-1-25 | AI-written marker on every artefact | G | AG-10 v1.10 §7 | AG-13-69, AG-4-56 | — |
| AW-1-26 | Approval record fields for assistant items | G | AG-11-90, AG-16-46 | AG-11-112 | — |
| AW-1-27 | Owner-route count quoted in the weekly note | G | AG-11-90 | AG-14-39 | — |
| AW-1-28 | Six-kind count on each run record | G | AG-11-34 | — | — |
| AW-1-29 | Ask me first uses Needs you or inline approval | G | AG-11-55, AG-11-63, AG-11-78 | — | — |
| AW-1-30 | Routing of non-professional items | G | AG-11-55, AG-11-89 | — | — |
| AW-1-31 | Who approves AI-written client text | G | AG-16-46, AG-11-88, AG-10-44, AG-10-46, AG-9-22 | — | — |
| AW-1-32 | "From client content" line beside approve | G | AG-11-56 | AG-11-112 | — |
| AW-1-33 | Anti-rubber-stamp checks on approve all | G | AG-11-56, AG-11-57 | SA-12-33, AG-16-57, AG-14-39 | — |
| AW-1-34 | No active licensed user: client-facing work stops | G | AG-11-88, AG-11-90 | AG-16-56 | — |
| AW-1-35 | Preparer of an assistant-prepared form | G | AG-7-65, AG-7-66, AG-11-81 | AG-11-113 | — |
| AW-1-36 | Assistant items follow timing and staleness rules | G | AG-11-59, AG-11-61, AG-11-100 | — | — |
| AW-1-37 | Hard limits enforced on the server | G | AG-11-53, AG-11-28 | SA-6-44 | — |
| AW-1-38 | No deleting records | G | SA-06 v3.3 §10b | — | — |
| AW-1-39 | No money or trust entries | G | AG-6-1, AG-6-5, AG-6-19, AG-6-23, AG-6-24 | AG-6-44, AG-6-45, AG-6-46, AG-6-47 | — |
| AW-1-40 | No exports | G | SA-06 v3.3 §10b | — | — |
| AW-1-41 | No changes to users, roles or settings | G | AG-11-83, AG-11-84, AG-16-42, AG-16-43, AG-16-46, AG-16-49, SA-06 v3.3 Appendix C | AG-16-57 | — |
| AW-1-42 | No signing or retainer work | G | AG-5-17, AG-05 v1.9 §3.11 | — | — |
| AW-1-43 | No professional approvals or verification | G | AG-7-60, AG-7-61, AG-9-50, AG-8-26, AG11-D10 | — | — |
| AW-1-44 | No stage moves on cases or leads | G | AG-11-16, AG-2-26, AG-2-27, AG-2-28a, AG-2-47 | — | — |
| AW-1-45 | No lead creation from unknown senders | G | AG-10-58, AG11-D18 | — | — |
| AW-1-46 | No free text to clients; status content block to leads | G | AG-11-53, AG-11-79, AG-10-15, AG-10-44 | AG-11-115, AG-12-38, AG-12 BR-15, AG-11-114 | — |
| AW-1-47 | No delegation changes | G | NEW | SA-6-44 | Hard limit: an assistant never changes any delegation; its only anchor is the Workstream 2 number SA-6-44. · **AI-specific** |
| AW-1-48 | No government submission or portal typing | G | AG-11-54, AG-7-59 | — | — |
| AW-1-49 | No action for paused, quiet or closed files | G | AG-11-87, AG-11-101, AG-7-34, AG-7-50 | — | — |
| AW-1-50 | No action for deactivated or suspended people | G | AG-11-45 | — | — |
| AW-1-51 | No regulator reports, promises or ranking people | G | AG-11 BR-9, BR-34, AG-11-49, AG-17 BR-17, FD-7 | — | — |
| AW-1-52 | AI steps wait for the published provider record | G | AG-16-35, AG-11-73, AG-11-93, AG11-D15 | SA-8-49, SA-8-50 | — |
| AW-1-53 | Behaviour when AI is off or a Doer is gated | G | AG-11-71, AG-16-35 | AG-16-55, AG-11-112 | — |
| AW-1-54 | Spend caps per firm, user and run | G | AG-11-27 | SA-12-33, AG-16-57 | — |
| AW-1-55 | Model-call count and cost on run records | G | AG-11-72 | AG-14-39 | — |
| AW-1-56 | Honour Expat Ready emergency stops | G | SA-12-12 | BR-9, SA-12-31, SA-12-32, AG-16-55 | — |
| AW-1-57 | Assistants are firm settings, not plan features | G | SA-12-9, AG-16-35, SA-03 v2.17 feature catalogue row 30 | AG-16-57 | — |
| AW-1-58 | Data minimisation in model calls | G | AG-11 v1.12 §11 | — | — |
| AW-1-59 | Restricted fields never reach a model | G | AG-7-88, AG-9-48, AG-11-98, FD-15 | AG-9-54 | — |
| AW-1-60 | Client content as data; never a recipient or payee | G | AG-11-94 | AG-11 BR-42 | — |
| AW-1-61 | Unverified sender content only Ask me first | G | AG-10-47, AG-11-94 | — | — |
| AW-1-62 | Planted-instruction test set per version | G | AG-11-94 | — | — |
| AW-1-63 | Model instructions versioned and approved | G | AG-11 v1.12 §11 | — | — |
| AW-1-64 | Writer is the AI writer; Drafter the template engine | G | AG11-D4, AG-11 v1.12 §7 | — | — |
| AW-1-65 | Client-facing name: AI assistance; no human names | G | NEW (nearest: AG11-D4) | — | Client- and regulator-facing wording for AI (AIW-D31); the team has no naming rule for assistants. · **AI-specific** |
| AW-1-66 | Rules for tasks an assistant creates | G | AG-13 BR-22, AG-13-65, AG-13-66 | AG-11-114 | — |
| AW-1-67 | Pack reasons fetched by rule | R | SA-1B-59, SA-1B-39 | — | — |
| AW-1-68 | Practice expert line is display-only | G | AG-11 v1.12 §7 | AG-14-38 | — |
| AW-1-69 | Case assistant run opens on case created | R | AG-11-87, AG-9-6, AG-07 v2.7 §3.2, AG-11 v1.12 §3.5 | — | — |
| AW-1-70 | Resolve task per finding | R | AG-11-74, AG-13 BR-22, AG-07 v2.7 §3.6 | — | — |
| AW-1-71 | Ready for review by rule | R | AG-9-26, AG-07 v2.7 §3.6, AG-08 v1.7 §3.11 | — | — |
| AW-1-72 | Readiness report item | R | AG-11-56, AG-11-61, AG-5-31, AG-07 v2.7 §3.6 | AG-11-112, AG-5-54 | — |
| AW-1-73 | One AI summary paragraph in the report | M | AG-07 v2.7 §3.6 | AG-11-112 | — |
| AW-1-74 | Officer acceptance is submission for internal review | R | SA-06 v3.3 §10b | AG-7-93 | — |
| AW-1-75 | Prepared-file count | G | NEW | AG-7-93 | The costed unit for pricing the Case assistant (AIW-D60); its only anchor is the Workstream 2 number AG-7-93. · **AI-specific (metering)** |
| AW-1-76 | Check uploads against pack acceptable-form rules | R | SA-1B-18, SA-1B-21, SA-1B-22, AG-9-12, AG-9-27, AG-9-28, AG-9-46 (+1 more) | — | — |
| AW-1-77 | Reason chosen from firm templates first | M | AG-11-79, AG-10-44, SA1B-D23, SA-1B-25 | — | — |
| AW-1-78 | Document typing rule | G | AG-9-11, AG11-D10, AG-11 v1.12 §3.10 | — | — |
| AW-1-79 | Filing stays the product's; assistant hand-off | R | AG-10-37, AG-11-74 | — | — |
| AW-1-80 | Government letter dates and milestone proposal | R | AG-9-51, AG-9-52, AG-11-47, AG-11-100, AG-11-108, AG-13-65, AG-07 v2.7 §3.7 | AG-11-109, AG-11-112 | — |
| AW-1-81 | Client notice and response plan drafts | M | AG-11-68, AG-13 BR-4, AG1-D6 | AG-13-69 | — |
| AW-1-82 | Writer drafts client words | M | AG-11-14, AG-11-105, AG-10-49, AG-10-57, AG-12-24, SA8-D19, SA8-X1 (+1 more) | — | — |
| AW-1-83 | Form draft via Filler and Checker | M | AG-7-59, AG-7-65, AG-7-66, SA-1B-26, SA-1B-35, AG-11-81, AG-11-89 (+1 more) | AG-11-109 | — |
| AW-1-84 | Letters drafted on request | M | AG-9-22, AG-10-15 | AG-12-39 | — |
| AW-1-85 | LMIA entries proposed; no screening | M | AG-17-28, AG-17-32, AG-17-73, AG-17-80, AG-17-82, AG-17 v0.6 §3.4 | AG-17-91, AG-17 BR-17 | — |
| AW-1-86 | Daily ranked to-do list by rule | R | AG-13-67, AG-11-59, AG-11-100, AG-13 v1.12 §3.4, AG-07 v2.7 §3.8 | AG-13-69 | — |
| AW-1-87 | Intake assistant run opens on lead created | R | AG-2-26, AG-2-28a, AG-2-29a, AG-2-59, AG-10-22, AG-10-24 | AG-11-110, AG-5-54 | — |
| AW-1-88 | Never runs the assessment; creates a task | R | AG-3-28, SA-06 v3.3 §10b | — | — |
| AW-1-89 | Next move by one ordered rule | R | AG-3-10, AG-3-13, AG-03 BR-8, AG-2-37 | AG-3-42 | — |
| AW-1-90 | No eligibility content to leads | G | AG-3-38, AG-10-15, AG-02 BR-10 | AG-11-115, AG-12-38 | — |
| AW-1-91 | Lead message template first; consent class | M | AG-11-79, AG-11-105, AG-10-15, AG-10-44, AG-10-47, SA8-D19, SA8-X1 (+1 more) | — | — |
| AW-1-92 | Stage moves only proposed | R | AG-11-16, AG-2-26, AG-2-28a, SA-06 v3.3 §10b | AG-11-112 | — |
| AW-1-93 | Missing facts asked through a template | R | AG-3-3, AG-3-12, AG-11-79 | — | — |
| AW-1-94 | Answers proposed from a lead's message | M | AG-8-23, AG-8-25, AG-8-26, AG-08 v1.7 §7 | AG-11-109 | — |
| AW-1-95 | Internal consult summary draft | M | AG-4-49, AG-4-50 | AG-4-56, AG-11-112, AG-5-55 | — |
| AW-1-96 | Payment match starts on a person's act | R | AG-10-10, AG-10-12, AG-10-37 | AG-10-60, AG-6-44 | — |
| AW-1-97 | Payment-match candidates shown read-only | R | AG-6-19, AG-6-20, AG-6-21, AG-06 v1.7 BR-7, AG-11-78 | AG-6-44, AG-11-112 | — |
| AW-1-98 | Weekly unbilled-work list | R | AG-13-10, AG-13-50, AG-6-9, AG-6-10, AG-6-40, AG-6-42, AG-7-51 (+1 more) | AG-11-111 | — |
| AW-1-99 | Personal overdue reminder draft | M | AG-6-12, AG-10-44, AG-10-46, AG-11-14, AG-06 v1.7 §11 | AG-11-110 | — |
| AW-1-100 | Trust reconciliation reminder | R | AG-6-24 | AG-6-46, AG-6-47, AG-11-111 | — |
| AW-1-101 | Proposed invoice opens the builder pre-filled | R | AG-6-2, AG-6-6, AG-6-8, AG-6-40, AG-6-41, AG-6-42, AG-6-24 (+1 more) | AG-6-45, AG-11-112 | — |
| AW-1-102 | Weekly internal money note | M | AG-14-15, AG-14 BR-12, AG-6-29, AG-14 v1.11 §3.3 | — | — |
| AW-1-103 | Never proposes refunds or credit notes | G | AG-6-23, FD-11 | — | — |
| AW-1-104 | Deadline watch is the product's Minder | R | AG-11-47, AG-11-48, AG-14-17, SA-3-35, AG-11 v1.12 §3.4 | — | — |
| AW-1-105 | Lifecycle drafts after closure, Owner only | M | AG-11-6, AG-11-37, AG-11-87, AG-11-101, AG-11-106, SA-11-29, AG-18-45 (+2 more) | AG-11-110 | — |
| AW-1-106 | Import mapping proposals | M | AG-18-8, AG-18-10, AG-18-15, AG-18-25, AG-18-49, AG-18-63, AG-9-51 | AG-18-92, AG-18-94, AG-11-109, AG-11-111 | — |
| AW-1-107 | Data-subject request task and drafts | M | SA-11-18, SA-11-27, SA-11-28, CP-8-15, AG-16-21, AG-13-14 | AG-11-110, AG-11-111 | — |
| AW-1-108 | Weekly plain-language note | M | AG-14-19, AG-14-24, AG-14 BR-12, AG-11-49 | AG-11-111 | — |
| AW-1-109 | Practice expert: only the summary line is AW | G | NEW | AG-14-35, AG-14-38, AG-14-40 | Pointer keeping the expert's rule-built answers in AG-14 (Workstream 2 numbers AG-14-35 to 40). · **AI-specific pointer; the answers it points to are non-AI product work** |
| AW-1-110 | No model shapes a staff question | G | AG-11-7 | AG-14-35 | — |
| AW-1-111 | Menu questions with no delegation | R | AG-14-22, AG-14 BR-2 | AG-14-36, AG-14-38, AG-14-40, SA-12-31 | — |
| AW-1-112 | When the summary line may be added | M | AG-11-70, AG-11-94 | AG-14-38, AG-14-40, AG-16-57, SA-12-33 | — |
| AW-1-113 | Rule checks on the summary line | G | AG-11 v1.12 §11 | AG-14-38, AG-11-113 | — |
| AW-1-114 | Rule-built answer always shows | G | AG-16-35, AG-11-71 | AG-14-38, AG-14-40, AG-16-57, SA-12-31 | — |
| AW-1-115 | Question record | G | AG-11-72, AG-16-39, AG-11-49, SA-06 v3.3 §10b | AG-11-113 | — |
| AW-1-116 | Untested pack: no summary line | G | SA-01 v2.2 BR-15 | AG-14-40, AG-14-37 | — |
| AW-1-117 | No free typed questions in this release | G | AG-9-48 | AG-14-35 | — |
| AW-1-118 | Expert takes no action | G | AG-14 BR-17 | AG-14-38 | — |
| AW-1-119 | Evaluation sets before any release | G | AG-11 v1.12 §11 | — | — |
| AW-1-120 | Thresholds only after shadow mode | G | AG-11-53, AG-9-11, AG-11 v1.12 §13 | — | — |
| AW-1-121 | Assistants feed the firm's AI measures | G | AG-11-63, AG-11-49 | AG-14-39 | — |
| AW-1-122 | Risk register per assistant | G | NEW | — | Risk register per assistant; no team equivalent. · **AI-specific** |
| AW-1-123 | One AI incident procedure | G | NEW | — | One procedure for AI incidents; the nearest team item is SA-11's breach register. · **AI-specific** |
| AW-1-124 | A person asks their own assistant inline | G | AG-11-78, AG-11-7 | AG-13-68, AG-11-113 | — |
| AW-1-125 | Each assistant's firm switch | G | SA-03 v2.17 catalogue row 30 | AG-16-57, AG-16-55, AG-11-112, AG-11-114 | — |
| AW-1-126 | Assistant side of the expert answer lines | G | AG-11-88, SA6-D9 | AG-14-40, AG-14-36 | — |

### B.2 AW-02 (77 requirements)

| AW ID | What it is (short) | Kind | Team requirement it extends | Workstream 2 numbers it also rests on | NEW: why needed · AI-specific or non-AI |
|---|---|---|---|---|---|
| AW-2-1 | Platform personas run on the one engine at global scope | G | AG-11-2, AG-11 v1.12 §2, SA-07 v2.12 §3.0 | AG-11-109, AG-11 BR-42 | — |
| AW-2-2 | Every run carries the firm it serves, or none | G | SA-11-2 | — | — |
| AW-2-3 | A firm-stamped run reads only that firm | G | SA-11-1, AG-11 v1.12 BR-3 | — | — |
| AW-2-4 | No cross-firm lists in version 1 | G | SA-11-12, SA-02 v2.21 §10. | — | — |
| AW-2-5 | No-firm runs read pack content and two pin totals | G | SA-1-62, SA-11-12 | — | — |
| AW-2-6 | Run a persona recipe by hand on one subject | G | NEW | — | Manual run of a platform recipe; borrows AG-11-7, which covers only firm automations. · **AI-specific (engine pattern reused)** |
| AW-2-7 | Scheduled items claimed atomically | G | NEW | — | Atomic claim for platform schedules; borrows AG-11-5. · **AI-specific (engine pattern reused; near-restatement)** |
| AW-2-8 | Rehearsal and lifecycle for platform recipes | G | AG-11-29, AG-11-30, SA-07 v2.12 §3.2, SA-12 v2.7 §10. | AG-11-114 | — |
| AW-2-9 | Retry then park failed steps | G | NEW | — | Retry then park on the platform; borrows AG-11-27. · **AI-specific (engine pattern reused; near-restatement)** |
| AW-2-10 | Platform delegation record | G | SA-7-39, SA-07 v2.12 §3.0, SA-06 v3.3 §3.0. | SA-7-48, SA-07 BR-21 | — |
| AW-2-11 | One live delegation per person, persona and role | G | SA-07 v2.12 Appendix A | — | — |
| AW-2-12 | Delegation keys: held now and lendable | G | SA-01 v2.2 BR-17, SA-7-13, BR-27, SA-06 v3.3 §3.0 | SA-6-44 | — |
| AW-2-13 | Delegation scope per persona | G | SA-7-13, SA-10-5, SA-2-26 | — | — |
| AW-2-14 | End and pause of a platform delegation | G | SA-7-22, SA-10-26, SA-2-26, SA-7-13, SA-07 v2.12 §3.7 | SA-12-31, SA-8-50, AG-11-112 | — |
| AW-2-15 | A persona is not a platform user or seat | G | SA-7-39, SA-3-41, FD-16 | SA-7-48, SA-07 BR-21, SA-06 BR-27 | — |
| AW-2-16 | Platform run record and states | G | BR-8, SA-10-21, SA-10 v2.5 §6 | AG-11-113 | — |
| AW-2-17 | Audit names the delegating person, mode DELEGATED | G | SA-11-2, SA-11 v2.7 BR-3, SA-7-3 | AG-13-68 | — |
| AW-2-18 | Platform audit of reads, proposals and refusals | G | SA-11-1, SA-11-2 | AG-13-68 | — |
| AW-2-19 | Every output is a proposal with marker and confidence | G | SA-1-31, SA-1B-29, SA-1B-33, SA-10-10 | AG-11-112 | — |
| AW-2-20 | A person's act records the proposal used | G | SA-11-2, SA-1-50, SA-4-39 | — | — |
| AW-2-21 | One AI run log row per Writer call | G | AG-11-72, AG-11 v1.12 §7 | AG-11-113 | — |
| AW-2-22 | Run log names the Writer | G | AG-11 v1.12 §7 | AG-11-109 | — |
| AW-2-23 | Retention of platform AI records | G | AG-11-98, SA-11-14 | — | — |
| AW-2-24 | Who reads platform run records and logs | G | SA-11 v2.7 §10, SA-07 v2.12 Appendix A | — | — |
| AW-2-25 | No model call before the provider record | G | AG-11-93, AG11-D15 | SA-8-49, SA-8-51, SA-11-32 | — |
| AW-2-26 | Provider replaceable by a new record | G | AG-11 v1.12 §11 | SA-8-49 | — |
| AW-2-27 | Kill-switch flags per persona and shared | G | SA-12-12, SA-12-26, SA-12 v2.7 §10 | SA-12-31 | — |
| AW-2-28 | What a kill switch or withdrawal pauses | G | SA-12-12 | SA-12-31, SA-8-50, AG-11-112 | — |
| AW-2-29 | Per-run spend cap parks the run | G | NEW | SA-12-33 | A runaway platform run stops on a cost cap; its anchor is the Workstream 2 number SA-12-33. · **AI-specific** |
| AW-2-30 | Fallback when no model call is allowed | G | SA-1-52, SA-10-5, SA-10-10, SA-2-14a | SA-1-66 | — |
| AW-2-31 | Platform hard limits enforced on the server | G | SA-01 v2.2 BR-17 | SA-6-44 | — |
| AW-2-32 | Out-of-limit acts refused and recorded | G | SA-11-1 | — | — |
| AW-2-33 | Third-party text as data; no tool access | G | NEW | AG-11-109 | Injection safety for text read by platform Writer calls; borrows AG-11-94. · **AI-specific (near-restatement of AG-11-94)** |
| AW-2-34 | Recipients and steps only by rule | G | SA-1B-39, SA-02 v2.21 §3.8. | SA-8-52 | — |
| AW-2-35 | Planted-instruction test set for platform | G | NEW | — | Planted-instruction test before any platform persona version goes live. · **AI-specific** |
| AW-2-36 | Data minimisation in platform Writer calls | G | SA-10 v2.5 BR-13, SA-11 v2.7 BR-16, BR-17 | — | — |
| AW-2-37 | No personal data in logs or outputs | G | SA-11 v2.7 BR-16, BR-17 | — | — |
| AW-2-38 | Model instructions versioned with two-person approval | G | AG-11 v1.12 §11 | — | — |
| AW-2-39 | Evaluation set per Writer use | G | NEW | — | Evaluation sets with known answers for each Writer use; no team equivalent. · **AI-specific** |
| AW-2-40 | Measures per persona, never per staff member | G | SA-09 v2.2 §10 | SA-9-24 | — |
| AW-2-41 | Pack author's assistant keys: read-only | G | SA-7-13, SA-01 v2.2 §10, SA-07 v2.12 Appendix A | — | — |
| AW-2-42 | Pack assistant writes nothing into a pack | G | SA-1-56, SA-1-31, SA-1-41 | SA-1-67 | — |
| AW-2-43 | Pack assistant never submits or publishes | G | SA-1-61, SA1-D6, SA-01 v2.2 §3.12 | — | — |
| AW-2-44 | Pack Drafter start triggers | R | SA-1-28, SA-1-30, SA-11 v2.7 §3.9 | — | — |
| AW-2-45 | Box-map diff and drafted map lines | M | SA-1B-27, SA-1B-29, SA-1B-33, SA-1B-35, SA-1-30 | — | — |
| AW-2-46 | Self-check before hand-over | R | SA-1-30, SA-1-24, SA-1B-44, SA-1-31 | — | — |
| AW-2-47 | Rows pointing at a changed form listed by rule | R | SA-1B-26, SA-1B-57, SA-1B-61 | — | — |
| AW-2-48 | Source fields on drafted rows; two-person publish | G | SA-1B-39, SA-1B-41, SA-1B-44, SA-1-21, FD-4, SA-01 v2.2 §3.12 | — | — |
| AW-2-49 | Withdrawn: French label proposals | — | (withdrawn in AW-02 v0.8, AIW-D79) | — | — |
| AW-2-50 | Pack Tester proposes synthetic samples | M | SA-1-52, SA-1B-62, FD-16, SA-06 v3.3 §3.0 | SA-1-66 | — |
| AW-2-51 | Draft vs published comparison on samples | R | SA-1-52, SA-1-19, SA-1-26, SA-1-53, SA-1-25, SA-1B-89, AG-03 v1.4 BR-11 | SA-1-66, SA-1-67 | — |
| AW-2-52 | Submission carries the rehearsal report | G | SA-1-53, SA-01 v2.2 §3.12 | SA-1-66, SA-1-67 | — |
| AW-2-53 | Rule-change Watcher fetches recorded sources | M | SA-1B-39, SA-1B-40 | SA-8-52 | — |
| AW-2-54 | Fetch only over the government source rail | G | AG-11-3, SA-08 v2.4 BR-1 | SA-8-52 | — |
| AW-2-55 | Impact list by rule from pack data | R | SA-1B-17, SA-1B-37, SA-1-62 | — | — |
| AW-2-56 | "Source page changed" work-queue item | M | SA-1B-40, AG-13 v1.12 §7 | — | — |
| AW-2-57 | Approve-all safeguards on accept-all | G | SA-1B-29, SA-1B-33 | SA-12-33 | — |
| AW-2-58 | Stale draft warning at commit | G | SA-01 v2.2 §9 | — | — |
| AW-2-59 | Assistant work counts as the author's own | G | SA7-D4, SA7-D48, SA-1-61 | — | — |
| AW-2-60 | Support and account delegation keys | G | SA-10 v2.5 §10, SA-02 v2.21 §10, SA-03 v2.17 §10, SA-04 v2.17 §10, SA-07 v2.12 Appendix A | SA-6-44 | — |
| AW-2-61 | Proposals shown in the person's own screen | G | SA-10-7, SA-10-10, SA-10 v2.5 §3.4. | — | — |
| AW-2-62 | Support Triager run opens on assignment | R | SA-10-5, SA-10 v2.5 §3.3 | AG-11-113 | — |
| AW-2-63 | What a support run may read | G | SA-10 v2.5 BR-3, BR-13, SA-2-14, SA-4-15 | — | — |
| AW-2-64 | Proposed category and priority | M | SA-10-6, SA-10-7, SA-10 v2.5 §7 | — | — |
| AW-2-65 | Diagnosis code mapped to a fix by rule | M | SA-4-36, SA-4-19, SA-4-54, SA-4-28, SA-2-16, SA-10 v2.5 §3.4. | SA-4-89 | — |
| AW-2-66 | First reply: canned response first | M | SA-10-10, SA-10 v2.5 BR-4, BR-11, SA-04 v2.17 §3.6. | — | — |
| AW-2-67 | AI-draft provenance on support replies | G | SA-10 v2.5 §7 | AG-11-113 | — |
| AW-2-68 | Help-article draft from a resolved ticket | M | SA-10-23, SA-10 v2.5 §3.9 | — | — |
| AW-2-69 | Firm Health Watcher run on an alert | R | SA-2-14a, SA-2-26, SA-2-30, SA-02 v2.21 BR-17 | — | — |
| AW-2-70 | Outreach template, recipients by rule | M | SA-4-53, SA-4-43, SA-4-80, SA-12-10, SA-02 v2.21 §3.8 | SA-2-42 | — |
| AW-2-71 | Proposed account change note and reply | R | SA-4-28, SA-4-29, SA-4-42, SA-4-43, SA-4-68, SA-4-69, SA-4-76 (+4 more) | — | — |
| AW-2-72 | Second person confirms proposed account changes | G | SA-4-28, SA-4-39, SA-4-43, SA7-D4 | SA-4-89, SA-12-33 | — |
| AW-2-73 | Triage run follows ticket moves | R | BR-8, SA-10-26, SA-2-4, SA-2-26, SA-2-30, SA-10 v2.5 §6 | — | — |
| AW-2-74 | Refused acts under support delegations | G | SA-2-16, SA-10 v2.5 BR-7, SA-10 v2.5 §10, SA-04 v2.17 §10, SA-02 v2.21 §10 | — | — |
| AW-2-75 | Pack Tester run triggers | R | SA-1-47, SA-1-53 | SA-1-66 | — |
| AW-2-76 | Recall of waiting platform proposals | G | NEW | SA-12-32 | Expat Ready can withdraw waiting AI proposals for safety; anchor is the Workstream 2 number SA-12-32. · **AI-specific** |
| AW-2-77 | Founder safeguards cannot be switched off by settings | G | SA-12-27 | SA-12-33, SA-4-89 | — |
## 4. Duplication check: our text repeats the team's instead of pointing to it

**Rule** (README §0 rule 3; AIW-D22): cite by ID and never restate.

**Not counted as duplication:**
- A change note quoting the "current words" it proposes to change. That is how the team's own notes work.
- A short phrase quoted inside a pointer, where the AW text then adds only new matter.

The list below covers places where the team's rule is **re-stated as our own requirement text**, or where our own files say the same thing twice. Each row ends with a *Proposal* for the fix.

### 4.1 AW requirements that repeat a team requirement

| # | Our location | Team location | What is repeated | Proposal |
|---|---|---|---|---|
| 1 | AW-01 v0.6 L327, AW-1-2 | AG-11-94 (AG-11 v1.12 L703); AG-11 §11 (L1181) | Client content passed as delimited data; no tool access; output schema-checked | Point to AG-11-94 and §11. Keep only the new part: output holding an action, recipient or permission is dropped and recorded |
| 2 | AW-01 L399, AW-1-60 | AG-11-94 (L703) | Client content reaches a model only as data | Point to AG-11-94. Keep the new part: an address or account number in content is never a recipient or payee |
| 3 | AW-02 v0.8 L386, AW-2-33 | AG-11-94 (L703) | Same rule for platform Writer calls ("delimited data", "no tool access") | One sentence: "AG-11-94 applies to platform runs" (CN-AG-11 ch. 11 already makes them the same engine) |
| 4 | AW-01 L383, AW-1-48 | AG-11-54 (L636); AG-11 BR-26 (L756) | No submission to a government authority | Cite AG-11-54. Keep only "pay, sign or type into a government portal" as the addition |
| 5 | AW-01 L381, AW-1-46 | AG-11-53 (L635); AG-10-44 (AG-10 v1.10 L431) | AI-written client text is always "Ask me first" | Already cites the floor. Drop the restating first sentence |
| 6 | AW-02 L370, AW-2-21 | AG-11-72 (L660) | The model-call log fields, quoted word for word | Replace the quote with "as AG-11-72" |
| 7 | AW-02 L390, AW-2-37 | SA-11 BR-16, BR-17 (SA-11 v2.7 L413–414); AG-11 §11 (L1181) | No personal data in logs; no passport or financial numbers in messages | The AW-02 text itself says "product rule applied to personas". Make it a pointer |
| 8 | AW-01 L397, AW-1-58 and AW-02 L389, AW-2-36 | AG-11 §11 (L1181: `AiRunLog` "holds references, not copies, of PII") | Personal data passed by reference | Point to §11. Keep the new part: only the fields a step needs |
| 9 | AW-01 L391, AW-1-54 | SA3-D14 (SA-03 v2.17 L74) | "Four limits only" quoted to show caps are not plan limits | Cite SA3-D14 without the quote |
| 10 | AW-01 L357, AW-1-26 | AG-11-90 (L695) | The Owner-route wording quoted twice, though the requirement says it restates none | Cite AG-11-90 only |
| 11 | AW-02 L402, AW-2-45 | SA-1B-35 (SA-01B v1.2 L191) | "AI never sets a value on a form at fill time", quoted | Cite SA-1B-35 only |
| 12 | AW-01 L364, AW-1-31; L342, AW-1-13; L356, AW-1-25; L421, AW-1-80 | AG-16-46 (L483); AG-11-21 (L589); AG-10 §7 (L546); AG-9-51 (L550) | Short team phrases quoted inside pointers | Low risk. Leave them, but re-check each quote whenever the team file changes |
| 13 | AW-02 L350, AW-2-7; L352, AW-2-9; L349, AW-2-6 | AG-11-5 (L559); AG-11-27 (L597); AG-11-7 (L561) | The engine's atomic claim, retry-then-dead-letter and manual run, rewritten for platform runs | One line: "AG-11-5, -7 and -27 apply to platform runs", once CN-AG-11 ch. 11 places platform runs on the same engine |

### 4.2 Workstream 2 saying the same thing twice in its own files

| # | First location | Second location | What is repeated | Proposal |
|---|---|---|---|---|
| 14 | AW-1-62 (AW-01 L401) | AW-2-35 (AW-02 L388) | The planted-instruction test set before any version goes live | One home in AW-01; AW-02 points to it, as AW-1-63 already points to AW-2-38 |
| 15 | AW-1-9 (AW-01 L336) | SA-6-44 (CN-SA-06 ch. 1) | The list of keys that may never be lent to an assistant | Keep the list in SA-6-44 only. AW-1-9 says "every key SA-6-44 does not mark lendable" |
| 16 | AW-1-52 (AW-01 L389), AW-2-25 (AW-02 L376) | SA-8-49, SA-8-51 (CN-SA-08 ch. 2); also CN-AG-11 ch. 8, CN-AG-16 ch. 1, CN-SA-11 ch. 1 and 2, CN-FDL ch. 11 | The provider-record conditions (Canada region, no training or retention, passed test call), written out in up to seven places | One home: SA-8-49. Every other place says "until a provider record is published under SA-8-49" |
| 17 | AW-1-64 (AW-01 L403), AW-2-22 (AW-02 L371) | CN-FDL ch. 2 and the rename changes in CN-AG-02 ch. 2, CN-AG-07 ch. 7, CN-AG-10 ch. 3, CN-AG-11 ch. 1, CN-AG-16 ch. 6, CN-SA-03 ch. 1 | Writer vs Drafter definition, nine times | Define it once in the FD-8 amendment (CN-FDL ch. 2). The module notes make only the word change |
| 18 | `decisions.md` AIW-D36 to D72 | CN-FDL ch. 8 (proposed FD-23 to FD-31) | The founder's AI decisions, in two homes until the founder places them | Mark decisions.md as "superseded by FD-n" once placed on Drive |
| 19 | CN-AG-07 ch. 1, CN-AG-08 ch. 3, CN-AG-09 ch. 3, CN-AG-13 ch. 4, CN-SA-06 ch. 2, CN-SA-11 ch. 5, CN-FDL ch. 5 | FD-15 (Founder Decisions Log v1.5 L40); AG7-D10 (AG-07 v2.7 L220) | FD-15 masking reaffirmed seven times. It is not AI work (see 4.3) | Hand back to the team as one conflict (FD-15 vs AG7-D10). Keep only the rule that an assistant never sees a Restricted value (AW-1-59) |

### 4.3 Change-note changes that are not AI work

These are changes, or parts of changes, about the team's own product. Following README §0 rule 1 and the Lead's own 11 Oct ruling ("Trust accounting belongs to the team"), they belong to the team as questions, not as Workstream 2 text. **Proposal:** move each to a "for the team" list, and keep a pointer only where an AW requirement depends on it.

| Change | Subject |
|---|---|
| CN-AG-02 ch. 3 | One call-outcome list |
| CN-AG-05 ch. 1; CN-FDL ch. 7; CN-CP-portal point 1 | Email passcode before every signature (FD-21) |
| CN-AG-06 ch. 1, ch. 2, and the record-name part of ch. 6; CN-FDL ch. 4, 6, 13, 14 | Trust money (FD-17) and credit notes (FD-11) |
| CN-AG-07 ch. 1; CN-AG-08 ch. 3; CN-AG-09 ch. 3; CN-AG-13 ch. 4; CN-SA-06 ch. 2; CN-SA-11 ch. 5; CN-FDL ch. 5 | Masking of Restricted fields (FD-15) |
| CN-AG-07 ch. 2 | One document-status list |
| CN-AG-15 ch. 1, 2; CN-AG-17 ch. 3; CN-SA-03 ch. 3; CN-CP-portal point 2 | Employer seats in Release 1 (AIW-D67) |
| CN-FDL ch. 10 | FD-7 employer recruitment tile deferred |
| CN-SA-01 ch. 3, ch. 5 | Pack pinning back to FD-3; one name for the content author |
| CN-SA-02 ch. 1; CN-SA-04 ch. 2 | Failed-payment reminder days |
| CN-SA-04 ch. 4, ch. 5 | Billing event code names; what `system/billing:view` reads |
| CN-AG-12 ch. 2; CN-SA-05 ch. 2 | Case letter type and case letter masters (non-AI, though AW-1-84 uses them) |

Borderline, kept as in scope because a Doer or an AI rule depends on them:
- FD-5 form filling (the Filler is a Doer): CN-AG-07 ch. 4, CN-SA-01B ch. 1, CN-FDL ch. 3.
- FD-4 two people for reference data (pack governance that AI drafting relies on): CN-FDL ch. 1 and 12, CN-SA-01B ch. 3.
- The Clocker name (Doer naming): CN-AG-13 ch. 5.
- SA-2-42, account-manager messages, needed for AW-02's outreach record: CN-SA-02 ch. 2.

## 5. Glossary reconciliation

**One meaning per term.** For each term: every meaning found, the one meaning to use, and who owns that meaning.

**What "owner" means here.**
- **The team** means the team's glossaries: Agent 99-Phasing v1.4 §Glossary and Shared 99-Phasing v2.18. Those stay the only home of a product term. Workstream 2 only proposes changes to them.
- **Workstream 2** means a term that names only the AI-assistant layer. It lives in AW-01 "Words used here" (L219–L235) until the founder places it on Drive.

**Minder** (and **Reminder**)
- Meanings found:
  - RFP v2.0 L167: Minder does "task creation and assignment"; Reminder "schedules and fires reminders".
  - FD-8 (Founder Decisions Log v1.5 L33): "Reminder folds into Minder (one nudge identity)". Followed by Doc 2 v1.4 L103 and Doc 3 v1.4 L6231 ("there is no separate 'Reminder' Doer").
  - AG-11 v1.12 §3.0 L244: Reminder is a "time-based nudge"; Minder "watches a deadline/condition and reminds as it nears/breaches".
  - Agent 99-Phasing v1.4 L52: Reminder "speaks", Minder "thinks".
  - AG17-D38 (AG-17 v0.6 L157): Minder is "one reminder service on top of the whole application".
  - Charter V1 L121: lists the Minder among the Doers not in Release 1.
  - Workstream 2: AIW-D51 amends FD-8 (two tools), proposed as CN-FDL ch. 2. AW-1-104 calls the product's Minder the "Deadline watch", with no model.
- **Use:**
  - **Minder** = the product's date-watching Doer. Modules register dates with it; it reminds the file owner, and escalates only where switched on (AG-11-47, AG-11-19).
  - **Reminder** = the Doer and record that delivers one time-based nudge (AG-13 §3.2).
  - "Deadline watch" is a sales label only, never a second term in requirements.
- **Owner:** the team. The FD-8 amendment must reach Drive; until then FD-8 and the October files contradict each other.

**Doer**
- Meanings found:
  - Doc 1 v1.3 L33: "an in-house capability … on a swappable rail port/adapter".
  - AG-11 v1.12 L244: "a thin, testable, retryable executor with one responsibility".
  - Agent 99-Phasing L52: "A named in-house worker … Two kinds" (non-AI and AI).
  - Doc 2 v1.4 L86–95: a capability of kind `DOER`.
  - Product Vision v1.0 L35: "the firm's own workforce of named capabilities".
  - Workstream 2 (README §1): an AI assistant uses Doers and never replaces them.
- **Use:** an in-house tool that does one job when the Conductor or a person tells it to. The four AI Doers are a subset.
- **Owner:** the team.
- *Proposal:* drop "worker" from the glossary's Doer definition, to free that word (see *worker*).

**Conductor**
- Meanings found:
  - AG-11 v1.12 §3.0 L243: "the in-house automation engine".
  - Agent 99-Phasing L51: "A firm-configurable automation rule … The engine/orchestrator".
  - Doc 1 L35: "workflow/automation engine + domain-event bus".
  - Plural uses ("active Conductors"): SA-12 v2.7 SA-12-11 L358; Agent Overview L91 "Conductors & Doers".
  - Doc 2 L86–95: its own capability kind `CONDUCTOR`.
  - Workstream 2: AW-2-1, "the product's one automation engine", no second engine.
- **Use:** the one automation engine, never a Doer and never a single rule. A single rule is a **recipe** or an **automation**.
- **Owner:** the team.
- *Proposal:* the team corrects Agent 99-Phasing L51 and SA-12-11's plural.

**Reader**
- Meanings found:
  - AG-11-66 (L654): the AI Doer that extracts proposed values and classifies the document type.
  - July history: OCR was out of scope.
  - "screen reader" in Doc 4 v1.3 L38, L794, L868.
  - "Adobe Reader" in SA-1B-31 (L187).
- **Use:** the AI Doer of AG-11-66. Always write "screen reader" and "Adobe Reader" in full. CN-AG-11 ch. 2 moves attachment typing from the Sorter to the Reader.
- **Owner:** the team.

**Sorter**
- Meanings found:
  - AG-11-67 (L655): classifies and matches inbound messages, files attachments.
  - SA-10-7's ticket auto-triage is a different thing; AW-02 calls that duty "Support Triager".
- **Use:** AG-11-67, firm inbound only. Never use Sorter for support tickets.
- **Owner:** the team.

**Writer / Drafter**
- Meanings found:
  - Drafter as the template engine: AG-5-4 and AG-5-8 (AG-05 v1.9 L374, L380); AG-9-22 (L503); AG-04 BR-13; Doc 1 L312.
  - Drafter as the AI writer: AG11-D4 (L34); AG-10-15 (L377); Agent 99-Phasing L55.
  - "Writer" in team files: only the technical "single writer" and "audit-writer role" (Doc 3 L778; SA-11 L491).
  - Workstream 2: AIW-D53 names the AI writer **Writer**, with *Drafter* staying the template engine. AW-1-64 applies this. But AW-02 names an AI duty "Pack Drafter" (AW-2-44 to AW-2-47, 10 uses).
- **Use:**
  - **Writer** = the AI Doer that drafts text for a person to approve.
  - **Drafter** = the template engine.
- **Owner:** Workstream 2 proposes this; it lands in the team glossary through the FD-8 amendment (CN-FDL ch. 2).
- *Proposal:* rename "Pack Drafter" in AW-02, for example to "form-map proposer", so Drafter keeps one meaning.

**Checker**
- Meanings found:
  - AG-11-69 (L657): the AI cross-check that raises warnings, never locks.
  - Agent 99-Phasing L70: the **Reviewer** is the rule-based check, "the Checker is the AI cross-check".
  - AW-1-113's "rules SHALL check" is plain English, not the Checker.
- **Use:** AG-11-69 only.
- **Owner:** the team.

**Filler**
- Meanings found:
  - Agent 99-Phasing L69 and SA1B-D16 (SA-01B L40): rule-based form filling; "AI stays out of the fill path".
  - AG-07 BR-23 (AG-07 v2.7 L750): lists "the Filler's auto-fill" among the AI Doers.
  - Release status differs: FD-5 says version 1; SA1B-D28 parks it; the Charter defers it.
  - Workstream 2: CN-AG-07 ch. 7 ("The Filler is not an AI Doer"); AW-1-83 runs it as `run_filler`.
- **Use:** the rule-based Doer that fills government forms from verified values. It is not AI.
- **Owner:** the team. The release conflict goes to the founder (FD-5).

**Signer**
- Meanings found:
  - The in-house e-signature Doer: Agent Overview v1.12 L85; AG-5-29 and AG-5-30; Doc 1 L33.
  - Lower-case "signer" is the person who signs (FD-21, L57).
  - Workstream 2: AW-1-42 bars assistants from any part of a signing flow.
- **Use:** Signer (capital S) for the Doer; "signatory" or "the client who signs" for the person.
- **Owner:** the team.

**Biller**
- Meanings found:
  - The firm's invoicing Doer: Agent Overview L86; AG-6-32; Agent 99-Phasing L52 ("invoicing/trust").
  - Not the same as Expat Ready's own subscription billing (SA-04), the "Billing" Super Admin role (SA7-D8), or the firm's "Billing / Finance" starter role (SA6-D5).
  - Workstream 2: the "Billing assistant" (AW-01 §3.10) proposes; it never makes a Biller entry (AW-1-39).
- **Use:** Biller = the firm-side invoicing Doer (AG-06) only. Subscription billing is "SaaS billing (SA-04)".
- **Owner:** the team.

**Messenger**
- Meanings found:
  - AG-10-1 (AG-10 v1.10 L357): Messenger covers SMS, WhatsApp and portal chat; the **Mailer** covers email.
  - AG-11 v1.12 L244: "Messenger/Mailer (sends email and WhatsApp …)".
  - Agent 99-Phasing L52: "Messenger (omni-channel comms)".
  - RFP v2.0 L167: Messenger "sends emails, in-app …".
  - Release status: SA8-D19 (SA-08 v2.4 L56) puts WhatsApp in Phase 2, against AG11-D18. The team's own pending knock-on is SA8-X1.
- **Use:** AG-10-1's split. Messenger = non-email channels; Mailer = email.
- **Owner:** the team. *Proposal:* align the glossary and AG-11 §3.0 wording.

**autonomy**
- Meanings found:
  - AG11-D1 and AG-11-51 (L633): the **autonomy level** on each automated action (`AUTO`, `APPROVE`, `OFF`; "Send automatically / Ask me first / Off").
  - Doc 3 v1.4 L7648: "autonomy with safety" as the purpose of firm settings.
  - Product Vision L18: "completing work independently where it is deterministic".
  - Workstream 2: the behaviour documents' "Autonomy" sections (for example AW-02 L413, "PA §1.3 'Autonomy'") mean what a persona may do without a person.
- **Use:** only "autonomy level" in AG11-D1's sense. For an assistant's scope, say "what it may do alone" or "hard limits".
- **Owner:** the team.

**Needs you**
- Meanings found:
  - AG11-D2 and AG-11-60 (L644): the per-user queue of work prepared with no human present, or waiting on another person. Inline approval creates no item.
  - AG-18-66: a reminder delivered through "Done for you / Needs you".
  - Workstream 2: AW-01 uses it as AG-11 defines it. AW-02 L142 says there is "no Needs you on this plane" (platform proposals sit on the person's own screen).
- **Use:** AG-11-60, firm plane only.
- **Owner:** the team.

**agent**
- Meanings found:
  - The firm's staff ("The 'Agent' persona is an umbrella over the distinct staff roles", Agent Overview L186), the Agent console, and the permission namespace `agent/*` (SA6-D10).
  - An Expat Ready support agent: SA-10-5 (L354), and AW-02 L324.
  - "agentic operating system": Product Vision L18.
  - Workstream 2 README §0 rule 1: "agents and automation", meaning AI agents. "Sub-agents" are this workstream's own tooling.
- **Use:** in product and regulator-facing text, "agent" means firm staff (team) or support agent (SA-10) only. Never use it for AI.
- **Owner:** the team. Workstream 2 avoids the word in requirements.

**worker**
- Meanings found:
  - AG-17 v0.6, 117 uses: the foreign worker on an LMIA file (for example "linked worker case", L244).
  - Doc 1 v1.3 L110, L168: a background job process (BullMQ worker). AW-2-7 itself uses this sense ("two workers never run the same schedule").
  - "in-house worker" for a Doer: Agent 99-Phasing L52, RFP L167, Product Vision L604.
  - Workstream 2 (AIW-D31): "AI Workers" is the internal and investor name of the layer; "worker" is one catalogue entry (W-nn).
- **Use:**
  - "worker" alone = the AG-17 foreign worker.
  - "job worker" for the background process.
  - "AI Workers" only in investor and internal material, always with "works for a named person; a person approves".
  - "catalogue duty (W-nn)" in requirements.
- **Owner:** the team for the LMIA meaning; Workstream 2 for its own internal terms.

**assistant**
- Meanings found:
  - AG-11 v1.12 US text at L995 and L999: "an unlicensed assistant edits a client message", meaning a junior human staff member.
  - Workstream 2 (AIW-D31; AW-01 L221): one AI assistant to one role. "assistant to the <role>" is the only client-facing wording.
- **Use:** "AI assistant" for ours.
- **Owner:** Workstream 2. *Proposal to the team:* say "unlicensed staff member" in AG-11's stories.

**persona**
- Meanings found:
  - A human user type or job role: Agent Overview L186–188 ("Sub-Role (job persona)"); Shared Overview v3.9 L132 ("Super Admin Persona"); Doc 1 L865 ("per-persona MFA"); Product Vision "Actors & Personas" (L681).
  - Workstream 2 (AIW-D31): "AI persona" = one assistant to one role, a bundle of catalogue duties under one delegation. Hence `PersonaRun` and `personaRunId`.
- **Use:**
  - The team's meaning, a human job role, stays.
  - Workstream 2 writes "AI assistant" in requirements and keeps "AI persona" for internal design only. The field names `PersonaRun` and `personaRunId` should become `AssistantRun` and `assistantRunId` before the team builds them (*Proposal*).
- **Owner:** the team for the human meaning; Workstream 2 for "AI assistant".

**Other clashes found while reading** (no ruling asked for; listed so the next review can decide):
- *paused* (Workstream 2's one word for a halt that can be lifted) vs *suspended* (a user state in AG-01).
- *Watcher*: AW-02's Rule-change Watcher and Firm Health Watcher, vs the Minder, which "watches" dates.
- *Deadline watch* (AW-1-104) as a second name for the Minder.

## 6. Counts

| Measure | Count | Notes |
|---|---|---|
| **Team AI requirements** (Register A, "AI in own words" = Yes) | **439** | 404 numbered IDs plus 35 section-level statements |
| — used by Workstream 2 as written | 91 | |
| — changed by a Workstream 2 change note | 83 | |
| — not used by Workstream 2 | 265 | |
| Team requirements the AI layer relies on, not AI in their own words | 225 | 141 used as written, 84 changed by a change note |
| **AW requirements that extend a team requirement** | **184** | AW-01: 116; AW-02: 68 |
| **AW requirements that are NEW and AI-specific** | **18** | AW-01: 10; AW-02: 8 |
| **AW requirements that are NEW and non-AI** | **0** | The non-AI work sits elsewhere (next two rows) |
| AW requirements withdrawn | 1 | AW-2-49 (AIW-D79) |
| Workstream 2 numbers proposed inside the team's numbering | 54 requirement or decision numbers, 9 business rules, 9 FD rows | 7 collide with July Doc 3 numbers; 13 hold non-AI product work |
| Change-note changes that are non-AI team work | 33 changes, or parts of changes | §4.3 |
| Live AW requirements by kind | M 26 · R 32 · G 144 | M = a model is called; R = rules only; G = control of the AI layer |

## 7. Proposals, open questions and unknowns

**Proposals for the Lead to place** (type in brackets, as `proposals.md` uses). This register appends to no other file.

1. **(Rule) Workstream 2 never proposes a number inside a team range.**
   - Change notes use a visibly separate series, for example `AG-11-WS2-1`, until the team accepts the change and assigns its own number.
   - This removes the 7 collisions with July Doc 3 and stops a reader taking a proposal for a team requirement.
2. **(Rule) One home for each rule we restate.**
   - Every repetition in §4.1 and §4.2 becomes a pointer.
   - First targets:
     - AG-11-94 in AW-1-2, AW-1-60 and AW-2-33;
     - SA-8-49 in four change notes and two AW requirements;
     - the planted-instruction test (AW-1-62 and AW-2-35).
3. **(Plan) Hand the non-AI changes back** (§4.3) as one "for the team" list, with only pointers left in Workstream 2 files.
4. **(Decision, for the founder) Rename three internal Workstream 2 terms** that clash with team terms:
   - "Pack Drafter" becomes, for example, "form-map proposer";
   - `PersonaRun` becomes `AssistantRun`;
   - "worker" in requirements becomes "catalogue duty (W-nn)".
5. **(Plan) Ask the team to fix four glossary lines:**
   - Agent 99-Phasing L51 (Conductor as "a rule");
   - L52 (Doer as "worker"; Messenger "omni-channel");
   - AG-07 BR-23 (Filler listed as AI);
   - AG-11 stories L995 and L999 ("unlicensed assistant").
6. **(Plan) Show the AI layer by kind in founder and investor material.** Of 202 live AW requirements, 26 involve a model (M), 32 are rule-only tasks (R) and 144 are controls (G). Present it that way, so no one counts rule-only duties as AI.

**Open questions**
- **Q1. Which release source wins for AI and the engine?** Charter V1 L107 and L121 (V2 slides alike) say AI and the AG-11 engine are not in Release 1. AG11-D3, Agent 99-Phasing L19 and L23, and AIW-D66 say they are. The Charter edit is the founder's (`charter-edits.md`).
- **Q2. FD-8 vs the October files on Minder and Reminder.** The fix (AIW-D51, CN-FDL ch. 2) is not on Drive yet.
- **Q3. FD-15 vs AG7-D10 on masking.** A founder-decision conflict the team must settle. Workstream 2 should only point to it.
- **Q4. SA8-D19 (WhatsApp Phase 2) vs AG11-D18(a) and (b) (Release 1).** The team's own pending knock-on is SA8-X1. Workstream 2 writes no change note on it (README §0 rule 11).

**Unknowns**
- **U1.** Doc 1 amendment A4-1 (the "non-human principal model" that Doc 3 v1.4 L5194 waits on) is not in Doc 1 v1.3 of the snapshot. Whether it exists elsewhere is unknown.
- **U2.** The current client-portal module CP-01 is not on Drive (`08-client-portal/NOT-FOUND.md`). CP rows here come from July Doc 4 only.
- **U3.** The July Doc 1 to 4 were searched by keyword, not read line by line. An AI-related statement phrased without any of the keywords in the method note could be missing from Register A. The October module files were covered both by keyword and by every cited ID.
