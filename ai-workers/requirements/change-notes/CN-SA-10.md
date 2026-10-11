# Change note CN-SA-10: Support

| | |
|---|---|
| **Document changed** | SA-10 Support, version 2.5, dated 2026-10-07 |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-10-support_v2.5_2026-10-07.md` |
| **Date of this note** | 11 Oct 2026 (second fix round, after re-check S3a-b) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 5 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-10's own style.
4. Why, pointing to one of these:
   - the founder's decision (`ai-workers/decisions.md`, AIW-D*n*);
   - the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*);
   - the proposals row (`ai-workers/proposals.md`);
   - the gap list of the passed behaviour document (`ai-workers/design/behaviours/support-and-account-assistant.md` §9, G-*n*).
5. What else must change.

**Why AI touches this document.** Expat Ready's Support and account assistant works for one support person on the tickets assigned to them:
- It suggests replies, canned responses and knowledge-base articles; the person decides and sends.
- Suggest-only is its launch posture (AIW-D70).
- It "never answers an immigration-content question" (behaviour document §0 item 4).

Its behaviour is specified in AW-02.

**Already in SA-10, no change needed.**
- The `ticket.created` event is already specified as NEW (L196; §12, L589).
- Ticket tenant stamping is BR-1 (L397).
- The ticket states that pause and close a support run are SA-10's own (§6, L416–L438). How a run follows them is AW-02's (`00-step3-plan.md`, "Support runs and ticket states").

---

## 1. Add the immigration-content ticket category

**(1) What it changes.** SA-10 v2.5 §7 `TicketCategory` enum (L457); §13 open question 1 (L613).

**(2) Current words.**

L457 (extract):
> `TicketCategory {TECHNICAL, BILLING, FEATURE_REQUEST, BUG_REPORT, GENERAL_INQUIRY, ACCOUNT_ISSUE, CASE_RELATED, DOCUMENTATION, TRAINING, OTHER}`

L613:
> 1. **"Immigration Content" category.** The real `TicketCategory` enum has no "Immigration Content" value (the v1.0 doc implies one). Do we (a) add an enum value, (b) use `CASE_RELATED` + a sub-category, or (c) make categories fully configurable (Phase-3) and seed it? **Recommendation:** add `IMMIGRATION_CONTENT` now (cheap) so routing to a Content Manager works in the demo; defer full configurability.

**(3) Proposed words.**

L457: `TicketCategory {TECHNICAL, BILLING, FEATURE_REQUEST, BUG_REPORT, GENERAL_INQUIRY, ACCOUNT_ISSUE, CASE_RELATED, DOCUMENTATION, TRAINING, **IMMIGRATION_CONTENT**, OTHER}` *(changed — option (a) of §13 Q1)*.

L613 gains: "**Proposed answer (Workstream 2, for the team to decide when this note is placed):** option (a). `IMMIGRATION_CONTENT` is added to the enum (§7), and SA-10-6 routes it to the content pool. An AI assistant never drafts or suggests an answer on a ticket of this category."

**(4) Why.**
- SA-10's own recommendation (L613).
- `support-and-account-assistant.md` §9 G-4: "`TicketCategory` has no immigration-content value, so the never-answer rule cannot be a rule today".
- SA-10-6 (L355) already routes "*Immigration Content* → Content Manager".
- The hard limits are provisional (AIW-D55).

**(5) Knock-ons.** The role name follows SA-07 (Content author; SA7-D8, SA-07 v2.12 L46). AW-02 states the refusal.

---

## 2. Record on the message when a reply started as an AI draft

**(1) What it changes.** SA-10 v2.5 §7 `SupportTicketMessage`, NEW fields line (L450).

**(2) Current words.**

L450:
> > **NEW:** `seenByFirmAt?` / `seenByAgentAt?` (read receipts), `cannedResponseId?` (provenance).

**(3) Proposed words.**

> > **NEW:** `seenByFirmAt?` / `seenByAgentAt?` (read receipts), `cannedResponseId?` (provenance), **`aiDraftRunId?` (provenance: the AI run that drafted the text the agent started from) and `aiDraftEdited` (whether the agent changed it before sending)** *(changed — IMP-2(b), IMP-11)*. A message sent from an AI draft is always sent by the named agent (`sentBy`), never by the assistant.

**(4) Why.**
- `support-and-account-assistant.md` §9 G-5 (Proposal): "Provenance of an AI-drafted reply on the sent message: `cannedResponseId` (NEW) covers canned responses only".
- IMP-2.
- IMP-11: "The product keeps the 'AI-written' marker on every artifact (messages, letters, form drafts, values), not only on messages."
- FD-16 (Founder Decisions Log v1.5, L52): "provenance recorded on any AI-assisted artifact".

**(5) Knock-ons.** `aiDraftRunId` points to a row of the one AI run log. That row holds the firm the ticket belongs to: a ticket is stamped with its firm (BR-1, L397), and the run serves that firm (CN-AG-11 change 11; CN-SA-11 change 4). Retention follows CN-SA-11 change 3.

---

## 3. A knowledge-base article drafted from a resolved ticket carries no firm's or client's data

**(1) What it changes.** SA-10-23 (L384).

**(2) Current words.**

L384:
> - **SA-10-23** *(NEW)*: A bilingual, country-taggable knowledge base; an internal subset for agents and a firm-facing subset surfaced in firm help to deflect tickets; contextual article suggestions by category/keywords.

**(3) Proposed words.** SA-10-23 gains: "*(changed — IMP-21)* An article drafted from a resolved ticket, by a person or by an AI assistant, carries no firm's name, no client's personal data and no ticket content that identifies either. A person confirms this before the article is saved, and again before a firm-facing article is published. The de-identification rule is confirmed with counsel."

**(4) Why.** `support-and-account-assistant.md` §9 G-7 (Proposal; counsel; IMP-21). Ticket attachments and messages are client personal data (BR-13, L409).

**(5) Knock-ons.** The counsel pack (AIW-D68). AW-02.

---

## 4. Ticket keys: rename the targets within `system/*`, record who holds them, and name the key that reads canned responses and articles

**(1) What it changes.** Every place SA-10 names a `global/` key:
- L17, L85, L102, L175, L179;
- §3.8 (L286, L294);
- SA-10-18, SA-10-19, SA-10-21 (L375, L376, L380);
- BR-3, BR-7, BR-14 (L399, L403, L410);
- the acceptance criteria (L476, L477);
- §10 (L530–L548);
- §12 (L594, L602).

It also adds a new §13 open question after item 10 (L622).

**(2) Current words.**

L530–L534:
> | `global/support:list` | View the support ticket queue (cross-tenant) |
> | `global/support:manage` | Reply, add internal note, reassign, triage, change status/priority, escalate |
> | `global/support:close` | Force-close a ticket |
> | `global/support:config` | Configure categories, SLA, routing, escalation, canned responses, KB |
> | `global/firm:impersonate` | *(SA-2)* Required to open impersonation from a ticket — separate from support |

L536 (extract):
> The rebuild should rename GLOBAL keys to the `global/support:*` family (consistent with the SA permission doctrine) and keep the firm-side `agent/support-ticket:*` LOCAL keys.

L375:
> - **SA-10-18** *(NEW — links existing SA-2)*: An "Open impersonation" action on the ticket launches the SA-2 audited impersonation with the justification pre-filled with the ticket reference; the action requires `global/firm:impersonate` (holding `global/support:*` alone is insufficient).

**(3) Proposed words.** The targets are renamed within `system/*`, keeping today's code keys where they exist:

| Was (target) | Becomes |
|---|---|
| `global/support:list` | `system/support-ticket:list` (exists today) |
| `global/support:manage` | `system/support-ticket:manage` (today's `:edit` and `:create` merge into it) |
| `global/support:close` | `system/support-ticket:close` (today's `:delete`, delete-grade, restricted) |
| `global/support:config` | `system/support-ticket:config` (new) |
| `global/support:*` (the family) | `system/support-ticket:*` |
| `global/firm:impersonate` | `system/firm:impersonate` (SA-02's existing key) |

The names are for the team to confirm (BR-21). Every line listed in (1) reads the new names.

L536 becomes: "The rebuild renames the GLOBAL keys within `system/support-ticket:*` (SA-06's catalogue refuses `global/*`) and keeps the firm-side `agent/support-ticket:*` LOCAL keys."

Under the table: "*(changed)* Which staff roles hold these keys is recorded in SA-07 Appendix A (rows proposed by CN-SA-07 change 2):
- queue, reply and triage: Platform Owner, Firm onboarding / Account manager, Support, and the Content author, Billing and Platform engineer for the tickets routed to them (§3.3);
- force-close: Platform Owner and Support;
- configuration: Platform Owner (SA-10-25)."

New open question:
> 11. **Reading canned responses and knowledge-base articles.** *(new)* §10 names `system/support-ticket:config` for configuring canned responses and articles but no key for reading them in the workspace. Confirm whether reading rides on `system/support-ticket:list` or needs its own key.

**(4) Why.**
- **Proposals row 90** (AW-02 maker): SA-10's target names "cannot load: SA-06 v3.1's catalogue allows only `system`, `agent` and `portal`, and throws on 'a legacy `global/` prefix' … Rename SA-10's targets within `system/*` in the SA-10 change note".
- **SA-06 v3.3 confirms the rule:**
  - BR-21 (L531): "Keys follow `^(system|agent|portal)/[a-z0-9-]+:[a-z0-9.-]+$`".
  - L220: the catalogue "throws on … a legacy `global/` prefix (named as **purged**".
  - L727: the reference to "the purge of `global/*`".
- **SA-02 v2.21 already uses `system/firm:impersonate`:** SA-2-16 (L388) and §10 (L585).
- **The role holders** follow SA-10 §2 (L152–L156) and §3.3 routing (L217): "*Billing* → Billing (SA-4); *Technical/Bug Report* → Platform Engineer".
- **Gaps:** `support-and-account-assistant.md` §9 G-17 and G-20.

**(5) Knock-ons.**
- SA-07 Appendix A (CN-SA-07 change 2).
- SA-06 catalogue and Appendix B: the new `system/support-ticket:*` keys, mapped from today's `:edit`, `:create` and `:delete` (the team).
- AW-02 §10 tables B to D use the new names. Its table C (an Account manager holds no ticket key) is re-checked if the team gives the Account manager these keys.

---

## 5. Document control

**(1) What it changes.** The document-control table (L4–L11).

**(2) Current words.** The last row is v2.5 of 2026-10-07.

**(3) Proposed words.** A version row: "| 2.6 | *(date placed)* | Workstream 2 change note CN-SA-10 applied: `IMMIGRATION_CONTENT` category; AI-draft provenance on messages; de-identified knowledge-base articles; ticket keys renamed within `system/support-ticket:*` and `system/firm:impersonate`, holders recorded in SA-07; open question 11. | IMP-2, IMP-11, IMP-21; AIW-D55; proposals row 90 |".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
