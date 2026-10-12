# Change note CN-SA-07: Platform Users

| | |
|---|---|
| **Document changed** | SA-07 Platform Users, version 2.12, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-07-platform-users_v2.12_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (sixth round, after check S3a-e: spend-cap defaults Owner-only) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-07's own style.
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*), the proposals row (`ai-workers/proposals.md`) or the gap list of a passed behaviour document (`ai-workers/design/behaviours/`, §9 G-*n*).
5. What else must change.

**Plain words used here.** A *delegation record* says which AI teammate works for which named person, with a subset of that person's permissions, from when until when. It is not an identity and holds no permission of its own (AIW-D33; specified in AW-01 and AW-02). It takes effect only when the person accepts it. It ends only when that person ends it or is deactivated.

**Re-base.** v2.11 and v2.12 (10 Oct) changed none of the lines below. SA-7-48 and BR-21 are still free. L29 reads "New requirements continue from SA-7-48"; the last business rule is BR-20 (L507).

---

## 1. Appendix A: keys for the rows the Workstream 2 change notes touch, and new rows

**(1) What it changes.**
- Appendix A rows L737, L738, L739 and L741;
- new rows after L741;
- the §13 "Before build" task (L689).

**(2) Current words.**

L737:
> | Plan, entitlement and billing status of a firm (read-only) | ✔ | | | | ✔ | ✔ | ✔ | ✔ | |

L738:
> | Payment-processor notification log — view (SA7-D52) | ✔ | | | | | ✔ | ✔ | | ✔ |

L739:
> | Payment-processor notification — re-run failed | ✔ | | | | | ✔ | | | ✔ |

L741:
> | Integration credentials · feature flags · operational settings (shared inbox, email sender, banners) | ✔ | | | | | | | | ✔ |

L689:
> **Before build** (tasks): the tech lead maps every Appendix A row to its `system/*` key, so QA has an exact matrix; the infrastructure team flags the production deployment (SA-7-18).

**(3) Proposed words.**

The ticks on the four existing rows are unchanged. Each row gains its key:
- **L737:** "— `system/billing:view` or the narrower read key the team chooses (SA-04 §10 note)".
- **L738:** "— `system/billing:webhook-log` (view only, SA-4-36)".
- **L739:** "— `system/billing:webhook-rerun` (SA-4-36)".
- **L741:** "— includes the AI emergency-stop flags (SA-12-31) and the platform values of the approve-all safeguards, never to a value that switches a safeguard off (SA-12-33 (a)). Not the spend-cap defaults and not the switch-off of the founder safeguards setting: both are Owner-only (SA-12-33)".

New rows after L741. Rows marked *(proposal)* are proposals. The columns are as in Appendix A: Own · SM · CA · CP · AM · Bil · Sup · Sec · Eng.
> | AI provider record — enter or change, not its keys (SA-8-49, `system/ai-provider:edit`) *(proposal)* | ✔ | | | | | | | | ✔ |
> | AI provider record — approve and publish, never one's own entry; withdraw the published record (SA-8-49, SA-8-50, `system/ai-provider:publish`) *(proposal)* | ✔ | | | | | | | | |
> | Switch off a part of the founder safeguards setting, recording the founder's decision (SA-12-33; Owner-only setting, SA-12-27 pattern) | ✔ | | | | | | | | |
> | Change an AI spend-cap default, the platform-wide cap included, with a recorded reason (SA-12-33 (c); Owner-only setting, SA-12-27 pattern; the Platform engineer is refused) | ✔ | | | | | | | | |
> | AI recall: withdraw waiting AI-prepared items (SA-12-32) *(proposal)* | ✔ | | | | | | | | *(team decides)* |
> | Set up an AI teammate's delegation for another staff member, or withdraw that offer while it is still pending; it takes effect when that person accepts (`system/ai-delegation:manage`) *(proposal)* | ✔ | | | | | | | | |
> | AI teammate model instructions — author a new version (`system/ai-instruction:edit`) *(proposal)* | ✔ | | | | | | | | ✔ |
> | AI teammate model instructions — approve a version; never one's own (`system/ai-instruction:approve`) *(proposal)* | ✔ | | | | | | | | |
> | Send an account-manager message to a firm (SA-2-42, `system/firm:message-owner`) | ✔ | | | | ✔ | | | | |

No row gives anyone a key to stop or end another person's delegation. To halt an AI teammate at once, the Platform Owner or Platform engineer trips the kill switch (SA-12-31, the L741 row).

L689 gains: "Rows touched by the Workstream 2 change notes (CN-SA-02, CN-SA-04, CN-SA-08, CN-SA-10, CN-SA-12) are mapped first, because an AI teammate's delegation can hold only keys its person holds."

**(4) Why.**
- **The webhook split:** proposals row of 10 Oct (Support AI); `support-and-account-assistant.md` §9 G-18.
- **The narrower read:** the same document, G-19.
- **The provider record:** IMP-6; AIW-D52 and AIW-D69 (CN-SA-08 change 2). Owner publication follows SA8-D22 (SA-08 v2.4, L59), where e-sign wording is "**approved and published by the Owner**". Withdrawing sits with publishing (re-check S3a-c m-10).
- **The founder safeguards switch-off:** `00-step3-plan.md`, "Who switches it off (S3a-c N-2)": SA-12's existing Owner-only settings pattern, no new key; the Platform engineer's config key does not reach it.
- **Spend-cap defaults:** `00-step3-plan.md`, "Who changes a spend-cap default (S3a-e n-1)": "the Platform Owner only (SA-12's Owner-only settings pattern, SA-12-27), with a recorded reason; the Platform engineer is refused." CN-SA-12 change 3 says the same.
- **The platform values:** SA-12-33 holds platform values only; firm values are firm settings in AG-16 (`00-step3-plan.md`, "A firm's tightening, write path"), so no firm staff appear here.
- **The stops and the recall:** IMP-8 (CN-SA-12).
- **The delegation and instruction keys:** AW-02 §10 table E; IMP-1 rule 1; IMP-5. Instruction editing by the Platform engineer and the Platform Owner, approval by the Platform Owner: `00-step3-plan.md`, "AW-02 calls" (b).
- **No key stops another person's delegation:** `00-step3-plan.md`, "No one stops another person's delegation": "No key lets an Owner stop or end someone else's delegation."
- **The account-manager message:** proposals row of 10 Oct, outreach (CN-SA-02 change 2); key per CN-SA-06 change 4.

**(5) Knock-ons.**
- SA-04 §10 (CN-SA-04 changes 1 and 5).
- SA-08 §10 (CN-SA-08 change 2).
- SA-12 §10 (CN-SA-12 changes 2 and 3).
- SA-06 catalogue (CN-SA-06 change 4).
- SA-08 v2.4's own pending Appendix A row (SA8-X7, L99) is the team's and is not repeated here.

---

## 2. Appendix A: rows for support tickets

**(1) What it changes.** SA-07 v2.12 Appendix A, the "Firms (SA-2)" block (after L728).

**(2) Current words.** None: Appendix A has no row for support tickets (SA-10). The nearest row is:

L723:
> | Start a support session (read-only unless the firm allowed changes) | ✔ | | | | ✔ | | ✔ | ✔ | |

**(3) Proposed words.** A new block after L728. The key names follow CN-SA-10 change 4: the `system/support-ticket:*` family, renamed from SA-10's `global/support:*` targets. The team confirms the names.

> | **Support tickets (SA-10)** | | | | | | | | | |
> | Ticket queue, reply, internal note, triage, assign, status, escalate (`system/support-ticket:list`, `system/support-ticket:manage`) — Content author, Billing and Platform engineer for the tickets routed to them (SA-10 §3.3) | ✔ | | ✔ | | ✔ | ✔ | ✔ | | ✔ |
> | Force-close a ticket (`system/support-ticket:close`) | ✔ | | | | | | ✔ | | |
> | Configure categories, SLA, routing, escalation, canned responses, knowledge base (`system/support-ticket:config`) | ✔ | | | | | | | | |

**(4) Why.**
- `support-and-account-assistant.md` §9 G-17 (Unknown): "SA-07 Appendix A has no row for support tickets".
- `00-step2-decisions.md` §6 asks for "the support-ticket keys for the support and account-manager roles".
- **Where the ticks come from:**
  - SA-10 v2.5 §2 (L152–L156): "Support Agent"; "Support Lead / Firm onboarding / Account manager"; "Country / Content Manager (SA-1)"; the "Platform Owner" for configuring support; "Platform Engineer / DevOps" to "Receive technical/bug-report tickets".
  - SA-10 §3.3 routing (L217): "*Immigration Content* → Country/Content Manager (SA-1); *Billing* → Billing (SA-4); *Technical/Bug Report* → Platform Engineer; *Account Issue* → Firm onboarding / Account manager". The Billing and Platform engineer ticks follow from this (re-check S3a-b m-3).
  - SA-10-21: force-close by an agent (L380).
  - SA-10-25: configuration by a Platform Owner (L388).
- **Namespace:** SA-06 v3.3 records "the purge of `global/*`" (L727). Its catalogue refuses "a legacy `global/` prefix" (L220). Hence `system/*` (proposals row 90; CN-SA-10 change 4).

**(5) Knock-ons.**
- SA-10 §10 (CN-SA-10 change 4).
- **AW-02:** the Account manager role may hold these keys, but the Account manager's delegation never lends them (`00-step3-plan.md`, "AW-02 calls" (d)).

---

## 3. An AI teammate working for a staff member is not a staff account

**(1) What it changes.**
- §3.3 "Several roles per person" (L351);
- §3.6 Activity (L377);
- a new requirement after SA-7-47 (L482);
- a new business rule after BR-20 (L507).

SA-7-39 (L474) is kept as written.

**(2) Current words.**

L474:
> - **SA-7-39** *(SA7-D42, SA7-D43)* A one-time go-live setup invites the first two Owners; audited; refuses to run if any Owner exists. No other route creates staff in production; staff access is never restored by editing the database.

L351:
> **Several roles per person** (SA7-D3). Nobody can approve their own request — enforced per action (SA7-D4).

L377 (extract, first two sentences):
> Every staff action is recorded in the platform audit trail against the named person (SA-11). The **Activity tab** is a plain list over that trail (SA7-D38): sign-ins and actions, newest first, filterable by date and type.

**(3) Proposed words.**

New requirement:
> - **SA-7-48** *(new — AIW-D33; IMP-1)* An AI teammate that works for a staff member is **not a staff account** and is never created through any staff route (SA-7-39 stands). It works under a **delegation record** that names the staff member and holds a subset of that person's `system/*` permissions: never more, never a permission the person lacks, and only keys lendable to an AI teammate (SA-6-44).
>
> The record takes effect when the person accepts it. It ends only when the person ends it or is deactivated (SA-7-22). A platform emergency stop pauses it but does not end it (SA-12-31). No staff member can stop or end another person's delegation.
>
> The AI teammate never appears in the staff list and holds no role.

New business rule:
> - **BR-21** *(new — AIW-D33)* **An AI teammate borrows, never holds.** Its actions are recorded against the named staff member it worked for, marked as done under a delegation, with what started the run (SA-11-2), and appear in that person's Activity marked so.

L351 gains: "While the second-person part of the founder safeguards setting is on (SA-12-33), any account or plan change that the Support AI proposed also needs a second person's confirmation; the person it worked for cannot confirm it (SA-4-89)."

L377 gains: "Entries made under a delegation (an AI teammate working for the person) carry a marker and the delegation reference (SA-11-2)."

**(4) Why.**
- **FD-16** (Founder Decisions Log v1.5, L52): "no AI principal in the identity spine, no autonomous permissions".
- **AIW-D33:** the delegation record is consistent with FD-16.
- **IMP-1 rule 4:** a delegation "ends by itself when the person is deactivated or suspended". Staff have no Suspend (SA7-D10).
- **Shared rules** (`00-step3-plan.md`):
  - "Emergency stop": "A delegation ends only when its person ends it or is deactivated or suspended".
  - "No one stops another person's delegation".
  - "Actor rule".
  - "No 'during the pilot' in a requirement".
- **Gaps:** `pack-authors-assistant.md` §9 G-19; `support-and-account-assistant.md` §9 G-14.
- **The second-person sentence** is AIW-D59 in its own words (CN-SA-04 change 3; `00-step3-plan.md`, "AIW-D59 in its own words"); it rests on SA7-D4 on this same line.

**(5) Knock-ons.**
- SA-11-2 (CN-SA-11 change 4).
- SA-06 SA-6-44 (CN-SA-06 change 1).
- AW-02.

---

## 4. Document control

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L29).

**(2) Current words.**

L29 (extract):
> New requirements continue from SA-7-48.

**(3) Proposed words.**
- A version row: "| 2.13 | *(date placed)* | Workstream 2 change note CN-SA-07 applied: Appendix A keys and new rows (AI provider record with withdrawal, founder safeguards switch-off and spend-cap defaults as Owner-only, recall, delegation set-up and instruction keys as proposals; account-manager message); support-ticket rows with `system/support-ticket:*` keys; an AI teammate is not a staff account (SA-7-48, BR-21). | AIW-D33, AIW-D59; IMP-1, IMP-5, IMP-6, IMP-8 |".
- L29: "continue from SA-7-49".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
