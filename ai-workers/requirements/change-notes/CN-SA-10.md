# Change note CN-SA-10: Support

| | |
|---|---|
| **Document changed** | SA-10 Support, version 2.5, dated 2026-10-07 |
| **Current base (15 Oct 2026, snapshot 1535; scrum 4b outcome 0 (e))** | **SA-10 v2.7**, `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-10-support_v2.7_2026-10-12.md` (identical to the 13 Oct 09:26 copy the re-base row checked). The re-base row says what stands, is withdrawn or is re-aimed; a quote or line number marked re-pointed, corrected or "v2.7" is the current file's; any other is the older version's and is history. |
| **Re-based 13 Oct 2026 (source reconciliation, `decisions.md` rows "Reconciliation renumbering" and "Lead rulings, source reconciliation")** | Checked against **SA-10 v2.7** (12 Oct 2026). The module was **cut to a simple queue** (SA10-D1 to SA10-D11): auto-triage (SA-10-7), canned responses (SA-10-10), the knowledge base (SA-10-23), routing, SLA, escalation and support metrics are withdrawn or parked. **Change 1 withdrawn:** §13 Q1 is closed with no `IMMIGRATION_CONTENT` value and routing is parked. **Change 3 withdrawn as written:** the knowledge base is replaced by static help pages outside the product; AW-02 AW-2-68 (help-article draft) is withdrawn with it. **Change 4 re-based:** the keys are **`system/support:list` and `system/support:manage`** only (force-close under `:manage`; no `:close`, no `:config`; the legacy `system/support-ticket:*` names are mapped in §10); no canned-response key exists. **Change 2 (AI-draft provenance on the message) still needed.** Stored status value is `WAITING_FOR_CUSTOMER` ("Waiting on firm" is the screen label); events are `ticket.created` and `ticket.status_changed` only (no `ticket.assigned`: team question for AW-2-62); "Open support session" uses `system/firm:impersonate` with no supervisor step (SA-10-18, -19). Ticket emails are ExpatReady-owned templates published by the Platform Owner (BR-11). Version row 2.6 → **2.8**. Line numbers and quotes below are v2.5's. |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-10-support_v2.5_2026-10-07.md` |
| **Date of this note** | 11 Oct 2026 (sixth round: which tickets an article draft may start from) |
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
   - the AW-02 requirement that relies on it (AW-2-*n*).
5. What else must change.

**Why AI touches this document.** Expat Ready's Support AI works for one support person on the tickets assigned to them:
- It suggests replies, canned responses and knowledge-base articles; the person decides and sends.
- Suggest-only is its launch posture (AIW-D70).
- It "never answers an immigration-content question" (AW-2-64).

Its behaviour is specified in AW-02.

**Already in SA-10, no change needed.**
- The `ticket.created` event is already specified as NEW (L196; §12, L589).
- Ticket tenant stamping is BR-1 (L397).
- The ticket states that pause and close a support run are SA-10's own (§6, L416–L438). How a run follows them is AW-02's (`00-step3-plan.md`, "Support runs and ticket states").

---

## 1. Add the immigration-content ticket category

> **Withdrawn 13 Oct 2026 (source reconciliation).** SA-10 v2.7 closes §13 Q1 with no `IMMIGRATION_CONTENT` value, and routing is parked; the firm now writes "what's wrong" and support sets the priority. The Support Triager keeps *immigration-content question* as a code on its own fixed diagnosis list (AW-02 AW-2-64, AW-2-65) and proposes no reply for it. Kept for the record.

**(1) What it changed (history; withdrawn, see the box above).** SA-10 v2.5 §7 `TicketCategory` enum (L457); §13 open question 1 (L613).

**(2) Current words.**

L457 (extract):
> `TicketCategory {TECHNICAL, BILLING, FEATURE_REQUEST, BUG_REPORT, GENERAL_INQUIRY, ACCOUNT_ISSUE, CASE_RELATED, DOCUMENTATION, TRAINING, OTHER}`

L613:
> 1. **"Immigration Content" category.** The real `TicketCategory` enum has no "Immigration Content" value (the v1.0 doc implies one). Do we (a) add an enum value, (b) use `CASE_RELATED` + a sub-category, or (c) make categories fully configurable (Phase-3) and seed it? **Recommendation:** add `IMMIGRATION_CONTENT` now (cheap) so routing to a Content Manager works in the demo; defer full configurability.

**(3) Proposed words.**

L457: `TicketCategory {TECHNICAL, BILLING, FEATURE_REQUEST, BUG_REPORT, GENERAL_INQUIRY, ACCOUNT_ISSUE, CASE_RELATED, DOCUMENTATION, TRAINING, **IMMIGRATION_CONTENT**, OTHER}` *(changed — option (a) of §13 Q1)*.

L613 gains: "**Proposed answer (Workstream 2, for the team to decide when this note is placed):** option (a). `IMMIGRATION_CONTENT` is added to the enum (§7), and SA-10-6 routes it to the content pool. An assistant never drafts or suggests an answer on a ticket of this category."

**(4) Why.**
- SA-10's own recommendation (L613).
- The 10 Oct design gap behind AW-2-64: "`TicketCategory` has no immigration-content value, so the never-answer rule cannot be a rule today".
- SA-10-6 (L355) already routes "*Immigration Content* → Content Manager".
- The hard limits are provisional (AIW-D55).

**(5) Knock-ons.** The role name follows SA-07 (Content publisher; SA7-D8, SA-07 v2.15). AW-02 states the refusal.

---

## 2. Record on the message when a reply started as an AI draft

**(1) What it changes.** SA-10 v2.7 §7 `SupportTicketMessage` (L422; the read-receipt and `cannedResponseId` fields are parked).

**(2) Current words.**

L450:
> > **NEW:** `seenByFirmAt?` / `seenByAgentAt?` (read receipts), `cannedResponseId?` (provenance).

**(3) Proposed words.**

> > **NEW:** `seenByFirmAt?` / `seenByAgentAt?` (read receipts), `cannedResponseId?` (provenance), **`aiDraftRunId?` (provenance: the AI run that drafted the text the agent started from) and `aiDraftEdited` (whether the agent changed it before sending)** *(changed — IMP-2(b), IMP-11)*. A message sent from an AI draft is always sent by the named agent (`sentBy`), never by the assistant.

**(4) Why.**
- AW-2-67 (Proposal), from the 10 Oct design gap: "Provenance of an AI-drafted reply on the sent message: `cannedResponseId` (NEW) covers canned responses only".
- IMP-2.
- IMP-11: "The product keeps the 'AI-written' marker on every artifact (messages, letters, form drafts, values), not only on messages."
- FD-16 (Founder Decisions Log v1.5, L52): "provenance recorded on any AI-assisted artifact".

**(5) Knock-ons.** `aiDraftRunId` points to a row of the one AI run log. That row holds the firm the ticket belongs to: a ticket is stamped with its firm (BR-1, L397), and the run serves that firm (CN-AG-11 change 11; CN-SA-11 change 4). Retention follows CN-SA-11 change 3.

---

## 3. A knowledge-base article drafted from a ticket: only from a resolved ticket, and carrying no firm's or client's data

> **Withdrawn 13 Oct 2026 (source reconciliation).** SA-10-23 (the knowledge base) is withdrawn in v2.7: help is static pages outside the product. AW-02 AW-2-68 and its tests are withdrawn with it (register TC-161 asks the team whether a knowledge base returns). Kept for the record.

**(1) What it changes.** SA-10-23 (L384).

**(2) Current words.**

L384:
> - **SA-10-23** *(NEW)*: A bilingual, country-taggable knowledge base; an internal subset for agents and a firm-facing subset surfaced in firm help to deflect tickets; contextual article suggestions by category/keywords.

L425 (the `CLOSED` row of the ticket status table):
> | `CLOSED` | terminal | Reopen window elapsed / firm closed / force-closed | — |

**(3) Proposed words.** SA-10-23 gains:
> *(changed — IMP-21)* An article drafted from a ticket, by a person or by an assistant, may be started only from a ticket that **reached `RESOLVED`**: one still `RESOLVED`, or one that has since moved from `RESOLVED` to `CLOSED`, whether the reopen window elapsed or the firm closed it. It is never started from a ticket that was force-closed or `CANCELLED` without being resolved. The article carries no firm's name, no client's personal data and no ticket content that identifies either. A person confirms this before the article is saved, and again before a firm-facing article is published. The de-identification rule is unconfirmed Lead guidance; no counsel (AIW-D94).

**(4) Why.**
- AW-2-68, withdrawn with this change (Proposal; unconfirmed Lead guidance; no counsel (AIW-D94); IMP-21). Ticket attachments and messages are client personal data (BR-13, L409).
- **Only resolved tickets.** The Lead's calls of 11 Oct (`00-step3-plan.md`, "Support run at RESOLVED", answer (2), and "Article runs (S3b-d n-30)"): an article run "may open only on a ticket that reached RESOLVED (whether still RESOLVED or since CLOSED, by the window or by the firm); never on a ticket force-closed or cancelled without being resolved". SA-10's own states make the difference checkable: `CLOSED` covers "Reopen window elapsed / firm closed / force-closed" (L425, quoted above), and the transitions show `IN_PROGRESS → CLOSED` as the force-close and `OPEN → CANCELLED` as a withdrawal (§6, L438), so the product tells them apart by whether the ticket passed through `RESOLVED`.

**(5) Knock-ons.** The counsel pack, now the Lead's unconfirmed guidance (AIW-D94). AW-02 (the article run, started by the person).

---

## 4. Ticket keys: rename the targets within `system/*`, record who holds them, and name the key that reads canned responses and articles

> **Re-based 13 Oct 2026 (source reconciliation).** SA-10 v2.7 §10 already renamed the keys: **`system/support:list`** and **`system/support:manage`** only (force-close sits under `:manage`; the legacy `system/support-ticket:*` names are mapped to them). Our `:close` and `:config` keys are **withdrawn**, and no key reads canned responses or articles because both are withdrawn (SA-10-10, SA-10-23). What remains of this change: record in SA-07 Appendix A which of the six roles hold the two keys (SA10-X3; CN-SA-07 change 2 re-drawn). "Open support session" uses `system/firm:impersonate` with no supervisor step.

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
- **Proposals row 90** (AW-02 maker): SA-10's target names "cannot load: SA-06 v3.1's catalogue allows only `system`, `agent` and `portal`, and throws on 'a legacy `global/` prefix' … Rename SA-10's targets within `system/*` in the SA-10 change note" *(quoted as written; history)*.
- **SA-06 v3.6 confirms the rule:**
  - BR-21 (L605): "Keys follow `^(system|agent|portal)/[a-z0-9-]+:[a-z0-9.-]+$`".
  - L267: the catalogue "throws on … a legacy `global/` prefix (named as **purged**".
  - L831: the reference to "the purge of `global/*`".
- **SA-02 v2.24 already uses `system/firm:impersonate`:** SA-2-16 (L448) and §10 (L652).
- **The role holders** follow SA-10 §2 (L152–L156) and §3.3 routing (L217): "*Billing* → Billing (SA-4); *Technical/Bug Report* → Platform Engineer".
- **Relied on by:** AW-2-60 and AW-02 §10.

**(5) Knock-ons.**
- SA-07 Appendix A (CN-SA-07 change 2).
- SA-06 catalogue and Appendix B: the new `system/support-ticket:*` keys, mapped from today's `:edit`, `:create` and `:delete` (the team).
- AW-02 §10 uses the new names. The Account manager role may hold these keys, but the Account manager's delegation never lends them (`00-step3-plan.md`, "AW-02 calls" (d)).

---

## 5. Document control

**(1) What it changes.** The document-control table (L4–L11).

**(2) Current words.** The last row is v2.5 of 2026-10-07.

**(3) Proposed words.** A version row (renumbered 13 Oct 2026; 2.6 and 2.7 are the team's; changes 1 and 3 withdrawn): "| 2.8 | *(date placed)* | Workstream 2 change note CN-SA-10 applied: `IMMIGRATION_CONTENT` category; AI-draft provenance on messages; knowledge-base articles drafted only from resolved tickets and de-identified; ticket keys renamed within `system/support-ticket:*` and `system/firm:impersonate`, holders recorded in SA-07; open question 11. | IMP-2, IMP-11, IMP-21; AIW-D55; proposals row 90 |".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
