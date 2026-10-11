# Change note CN-SA-10: Support

| | |
|---|---|
| **Document changed** | SA-10 Support, version 2.5, dated 2026-10-07 |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-10-support_v2.5_2026-10-07.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID, section and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words, in SA-10's own style; (4) why, pointing to the founder's Workstream 2 decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*), the proposals row (`ai-workers/proposals.md`) or the gap list of the passed behaviour document (`ai-workers/design/behaviours/support-and-account-assistant.md` §9, G-*n*); (5) what else must change.

**Why AI touches this document.** Expat Ready's Support and account assistant works for one support person on the tickets assigned to them: it suggests replies, canned responses and knowledge-base articles in the ticket workspace, and the person decides and sends. Suggest-only is its launch posture (AIW-D70). It "never answers an immigration-content question" (behaviour document §0 item 4, §3). Its behaviour is specified in AW-02; this note only fixes what SA-10 must hold for it.

**Already in SA-10, no change needed.** The `ticket.created` event the assistant's trigger needs is already specified as NEW (§3.1 data flow, L196; §12, L589: "emit `ticket.created`"). Ticket tenant stamping (BR-1, L397) is what the platform tenant rule relies on (AIW-D54 item 8).

---

## 1. Add the immigration-content ticket category

**(1) What it changes.** SA-10 v2.5 §7 `TicketCategory` enum (L457); §13 open question 1 (L613).

**(2) Current words.**

L457 (extract):
> `TicketCategory {TECHNICAL, BILLING, FEATURE_REQUEST, BUG_REPORT, GENERAL_INQUIRY, ACCOUNT_ISSUE, CASE_RELATED, DOCUMENTATION, TRAINING, OTHER}`

L613:
> 1. **"Immigration Content" category.** The real `TicketCategory` enum has no "Immigration Content" value (the v1.0 doc implies one). Do we (a) add an enum value, (b) use `CASE_RELATED` + a sub-category, or (c) make categories fully configurable (Phase-3) and seed it? **Recommendation:** add `IMMIGRATION_CONTENT` now (cheap) so routing to a Content Manager works in the demo; defer full configurability.

**(3) Proposed words.**

L457: `TicketCategory {TECHNICAL, BILLING, FEATURE_REQUEST, BUG_REPORT, GENERAL_INQUIRY, ACCOUNT_ISSUE, CASE_RELATED, DOCUMENTATION, TRAINING, **IMMIGRATION_CONTENT**, OTHER}` *(changed — closes §13 Q1, option (a))*.

L613: "**Decided** *(option (a))*: `IMMIGRATION_CONTENT` is added to the enum (§7) and SA-10-6 routes it to the content pool. An AI assistant never drafts or suggests an answer on a ticket of this category."

**(4) Why.** SA-10's own recommendation (L613). The Support and account assistant's rule has nothing to key on without the value: `support-and-account-assistant.md` §9 G-4: "`TicketCategory` has no immigration-content value, so the never-answer rule cannot be a rule today" ("Decision for the team (SA-10 v2.5 §13 Q1)"); its §11 decision 6 recommends "add `IMMIGRATION_CONTENT` as SA-10 recommends, so the never-answer rule is a rule". SA-10-6 (L355) already routes "*Immigration Content* → Content Manager". The assistant's never-does list is part of the hard limits the founder adopted provisionally (AIW-D55).

**(5) Knock-ons.** The routing pool's role name follows SA-07 (Content author; SA7-D8). AW-02 states the assistant's refusal.

---

## 2. Record on the message when a reply started as an AI draft

**(1) What it changes.** SA-10 v2.5 §7 `SupportTicketMessage`, NEW fields line (L450).

**(2) Current words.**

L450:
> > **NEW:** `seenByFirmAt?` / `seenByAgentAt?` (read receipts), `cannedResponseId?` (provenance).

**(3) Proposed words.**

> > **NEW:** `seenByFirmAt?` / `seenByAgentAt?` (read receipts), `cannedResponseId?` (provenance), **`aiDraftRunId?` (provenance: the AI run that drafted the text the agent started from) and `aiDraftEdited` (whether the agent changed it before sending)** *(changed — IMP-2(b), IMP-11)*. A message sent from an AI draft is always sent by the named agent (`sentBy`), never by the assistant.

**(4) Why.** `support-and-account-assistant.md` §9 G-5 ("Provenance of an AI-drafted reply on the sent message: `cannedResponseId` (NEW) covers canned responses only", Proposal; SA-10 v2.5 §7; IMP-2(b), IMP-11). IMP-2: the approval of AI-prepared text must be joined to the model call that produced it; IMP-11: "The product keeps the 'AI-written' marker on every artifact (messages, letters, form drafts, values), not only on messages." FD-16 (Founder Decisions Log v1.5, L52): "provenance recorded on any AI-assisted artifact".

**(5) Knock-ons.** The AI run log on the platform plane (CN-SA-11 change 3 for its retention; AW-02 for the run record). SA-10-24 metrics can count AI-draft acceptance (IMP-29; not changed here).

---

## 3. A knowledge-base article drafted from a resolved ticket carries no firm's or client's data

**(1) What it changes.** SA-10-23 (L384).

**(2) Current words.**

L384:
> - **SA-10-23** *(NEW)*: A bilingual, country-taggable knowledge base; an internal subset for agents and a firm-facing subset surfaced in firm help to deflect tickets; contextual article suggestions by category/keywords.

**(3) Proposed words.**

SA-10-23 gains: "*(changed — IMP-21)* An article drafted from a resolved ticket, by a person or by an AI assistant, SHALL carry no firm's name, no client's personal data and no ticket content that identifies either; a person confirms this before the article is saved, and again before a firm-facing article is published. The de-identification rule is confirmed with counsel."

**(4) Why.** `support-and-account-assistant.md` §9 G-7 ("De-identification of a resolved ticket before an article is drafted and before publication to other firms", Proposal; counsel; IMP-21; SA-10-23). IMP-21's least-data rule: a model call receives only the fields its task needs. Ticket attachments and messages are client personal data (SA-10 BR-13, L409), and a firm-facing article reaches every firm.

**(5) Knock-ons.** Counsel pack item (AIW-D68). AW-02 states the drafting step.

---

## 4. Name who holds the ticket keys, and the key that reads canned responses and articles

**(1) What it changes.** SA-10 v2.5 §10 Permissions (L530–L544); §13 (a new open question after item 10, L622).

**(2) Current words.**

L530–L533:
> | `global/support:list` | View the support ticket queue (cross-tenant) |
> | `global/support:manage` | Reply, add internal note, reassign, triage, change status/priority, escalate |
> | `global/support:close` | Force-close a ticket |
> | `global/support:config` | Configure categories, SLA, routing, escalation, canned responses, KB |

**(3) Proposed words.**

Under the table add: "*(changed)* Which staff roles hold these keys is recorded in SA-07 Appendix A (rows added by CN-SA-07 change 2): queue, reply and triage for Platform Owner, Firm onboarding / Account manager, Support, and Content author for tickets routed to them; force-close for Platform Owner and Support; configuration for Platform Owner (SA-10-25)."

New open question:
> 11. **Reading canned responses and knowledge-base articles.** *(new)* §10 names `global/support:config` for configuring canned responses and articles but no key for reading them in the workspace. Confirm whether reading rides on `global/support:list` or needs its own key.

**(4) Why.** `support-and-account-assistant.md` §9 G-17 (Unknown): "SA-07 Appendix A has no row for support tickets; which role holds `system/support-ticket:list` (target `global/support:list`) is the tech lead's mapping … Until mapped: the Support role's holding is Unknown … the Account manager is not assumed to hold any ticket key"; G-20 (Unknown): "The canned responses and the articles the workspace suggests are read under no named key". The step-2 team list names "the support-ticket keys for the support and account-manager roles" (`ai-workers/design/behaviours/00-step2-decisions.md` §6). The roles proposed are those SA-10 §2 (L152–L155) names for each job: "Support Agent", "Support Lead / Firm onboarding / Account manager", "Country / Content Manager (SA-1)" for "the immigration-content questions routed to them", and the "Platform Owner" for configuration (also SA-10-25, L388); force-close is an agent's act (SA-10-21, L380). A delegation holds only keys its person holds (IMP-1), so the assistant cannot work on any ticket until this is mapped.

**(5) Knock-ons.** SA-07 Appendix A (CN-SA-07 change 2). SA-06 catalogue unchanged (the keys already exist in SA-10 §10; the rename from `system/support-ticket:*` is SA-10's own, L536–L544).
