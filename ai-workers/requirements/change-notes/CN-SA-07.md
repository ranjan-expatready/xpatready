# Change note CN-SA-07: Platform Users

| | |
|---|---|
| **Document changed** | SA-07 Platform Users, version 2.12, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-07-platform-users_v2.12_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (fix round after review S3a; re-based from v2.10 to v2.12) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-07's own style.
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*), the proposals row (`ai-workers/proposals.md`) or the gap list of a passed behaviour document (`ai-workers/design/behaviours/`, §9 G-*n*).
5. What else must change.

**Plain words used here.** *Delegation record*: the record of which AI assistant works for which named person, with a subset of that person's permissions, from when until when. It is not an identity and holds no permission of its own (AIW-D33; specified in AW-01 and AW-02). Expat Ready's two AI assistants (the Pack author's assistant, and the Support and account assistant) work for staff members under such a record.

**Re-base.** v2.11 and v2.12 (10 Oct) added the starter-role editor row (`system/starter-role:manage`, L708) and renamed two plan rows to the feature catalogue. Who may do what is unchanged, and none of the lines below changed. SA-7-48 and BR-21 are still free (L29: "New requirements continue from SA-7-48"; the last business rule is BR-20, L507).

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

The ticks on the four existing rows are unchanged. Each row gains its key in the capability text:
- L737: "… (read-only) — `system/billing:view` or the narrower read key the team chooses (SA-04 §10 note)".
- L738: "… view (SA7-D52) — `system/billing:webhook-log` (view only, SA-4-36)".
- L739: "… re-run failed — `system/billing:webhook-rerun` (SA-4-36)".
- L741: "… — includes the AI emergency-stop flags (SA-12-31)".

New rows after L741. *Proposal* where marked; columns as in Appendix A (Own · SM · CA · CP · AM · Bil · Sup · Sec · Eng):
> | AI provider record — enter or change (not its keys) (SA-8-49, `system/ai-provider:edit`) *(proposal)* | ✔ | | | | | | | | ✔ |
> | AI provider record — approve and publish; never one's own entry (SA-8-49, `system/ai-provider:publish`) *(proposal)* | ✔ | | | | | | | | |
> | AI recall: withdraw waiting AI-prepared items (SA-12-32) *(proposal)* | ✔ | | | | | | | | *(team decides)* |
> | Set up or stop an AI assistant's delegation for another staff member (`system/ai-delegation:manage`) *(proposal)* | ✔ | | | | | | | | |
> | AI assistant model instructions — author a new version (`system/ai-instruction:edit`) *(proposal)* | ✔ | | | | | | | | ✔ |
> | AI assistant model instructions — approve a version; never one's own (`system/ai-instruction:approve`) *(proposal)* | ✔ | | | | | | | | |
> | Send an account-manager message to a firm (SA-2-42) | ✔ | | | | ✔ | | | | |

L689 gains: "Rows touched by the Workstream 2 change notes (CN-SA-02, CN-SA-04, CN-SA-08, CN-SA-10, CN-SA-12) are mapped first, because an AI assistant's delegation can hold only keys its person holds."

**(4) Why.**
- **The webhook split:** proposals row of 10 Oct (Support and account assistant): "SA-07 Appendix A already splits them into two rows … With one key, mapping the Support row hands Support a re-run, and no read-only delegation can hold the log". `support-and-account-assistant.md` §9 G-18.
- **The narrower read:** same document, G-19.
- **The AI provider record:** IMP-6; AIW-D52 and AIW-D69 (CN-SA-08 change 2). The record is approved by the Owner on the pattern of SA8-D22, where "**approved and published by the Owner**" applies to e-sign wording (SA-08 v2.4, L59). Review S3a m-13 asked for a second person or the Owner only.
- **The stops and the recall:** IMP-8 (CN-SA-12).
- **The delegation and instruction keys:** AW-02 §10 table E; IMP-1 rule 1; IMP-5 ("only a named platform role may change them; a second person approves before a version goes live").
- **The account-manager message:** proposals row of 10 Oct (outreach) (CN-SA-02 change 2).
- **Why mapping comes first:** a delegation holds "always a subset, never more" of its person's permissions (IMP-1), found consistent with FD-16 by AIW-D33.

**(5) Knock-ons.**
- SA-04 §10 (CN-SA-04 changes 1 and 5);
- SA-08 §10 (CN-SA-08 change 2);
- SA-12 §10 (CN-SA-12 change 2);
- SA-06 catalogue (CN-SA-06 change 4).

SA-08 v2.4's own pending row for Appendix A ("Integrations status page — view", SA8-X7, L99) is the team's and is not repeated here.

---

## 2. Appendix A: rows for support tickets

**(1) What it changes.** SA-07 v2.12 Appendix A, the "Firms (SA-2)" block (after L728).

**(2) Current words.** None: Appendix A has no row for support tickets (SA-10). The nearest row is:

L723:
> | Start a support session (read-only unless the firm allowed changes) | ✔ | | | | ✔ | | ✔ | ✔ | |

**(3) Proposed words.** A new block after L728:
> | **Support tickets (SA-10)** | | | | | | | | | |
> | Ticket queue, reply, internal note, triage, assign, status, escalate (`global/support:list`, `global/support:manage`) — Content author for tickets routed to content (SA-10-6) | ✔ | | ✔ | | ✔ | | ✔ | | |
> | Force-close a ticket (`global/support:close`) | ✔ | | | | | | ✔ | | |
> | Configure categories, SLA, routing, escalation, canned responses, knowledge base (`global/support:config`) | ✔ | | | | | | | | |

**(4) Why.**
- **The gap.** `support-and-account-assistant.md` §9 G-17 (Unknown): "SA-07 Appendix A has no row for support tickets … Until mapped: the Support role's holding is Unknown (the example assumes it); the Account manager is not assumed to hold any ticket key, so an account manager's delegation runs no ticket recipe".
- **The ask.** The step-2 team list asks for "the support-ticket keys for the support and account-manager roles" (`ai-workers/design/behaviours/00-step2-decisions.md` §6).
- **Where the ticks come from:**
  - SA-10 v2.5 §2 (L152–L155): "Support Agent"; "Support Lead / Firm onboarding / Account manager"; "Country / Content Manager (SA-1)" for "the immigration-content questions routed to them"; and the "Platform Owner" for configuring support;
  - SA-10-21: force-close by an agent (L380);
  - SA-10-25: configuration by a Platform Owner (L388).
- The team confirms them.

**(5) Knock-ons.**
- SA-10 §10 (CN-SA-10 change 4).
- **AW-02** works on the opposite assumption (§10 table C: an Account manager holds no ticket key; `support-and-account-assistant.md` §11 decision 11). If the team gives the Account manager ticket keys, AW-02's table C and the assistant's ticket recipes are re-checked (review S3a m-17).

---

## 3. An AI assistant working for a staff member is not a staff account

**(1) What it changes.**
- §3.3 "Several roles per person" (L351);
- §3.6 Activity (L377);
- a new requirement after SA-7-47 (the document's last, L482);
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
> - **SA-7-48** *(new — AIW-D33; IMP-1)* An AI assistant that works for a staff member is **not a staff account** and is never created through any staff route (SA-7-39 stands). It works under a **delegation record** that names the staff member and holds a subset of that person's `system/*` permissions: never more, never a permission the person lacks, and only keys lendable to an AI assistant (SA-6-44). The record ends when the person ends it or is deactivated (SA-7-22). A platform emergency stop pauses it but does not end it (SA-12-31). The assistant never appears in the staff list and holds no role.

New business rule:
> - **BR-21** *(new — AIW-D33)* **An AI assistant borrows, never holds.** Its actions are recorded against the named staff member it worked for, marked as done under a delegation, with what started the run (SA-11-2), and appear in that person's Activity marked so.

L351 gains: "A plan or billing-period change that the Support and account assistant proposed also needs a second person's confirmation during the pilot (SA-4-89)."

L377 gains: "Entries made under a delegation (an AI assistant working for the person) carry a marker and the delegation reference (SA-11-2)."

**(4) Why.**
- **FD-16** (Founder Decisions Log v1.5, L52): "no AI principal in the identity spine, no autonomous permissions".
- **AIW-D33:** a delegation record "(which persona works for which named person, with a subset of that person's permissions, on which files, from when until when; no identity and no permissions of its own) is consistent with FD-16".
- **IMP-1 rule 4:** a delegation "ends by itself when the person is deactivated or suspended". Staff have no Suspend (SA7-D10).
- **The stop rule** is the shared rule: "A delegation ends only when its person ends it or is deactivated or suspended" (`00-step3-plan.md`, emergency stop).
- **The actor rule:** "a separate *started by* field records what started the run" (`00-step3-plan.md`).
- **The platform-plane form** is a gap in both passed platform documents:
  - `pack-authors-assistant.md` §9 G-19: "'No other route creates staff in production' (SA-7-39), which is right: the persona is not staff and needs no account; the record is IMP-1's";
  - `support-and-account-assistant.md` §9 G-14.
- **One slogan** with SA-06 BR-27 (review S3a m-5).
- **The second-person sentence** is AIW-D59, limited to the Support and account assistant (CN-SA-04 change 3).

**(5) Knock-ons.**
- SA-11-2 (CN-SA-11 change 4).
- SA-06 SA-6-44 (CN-SA-06 change 1).
- AW-02 specifies the platform delegation record and each assistant's permission subset.

---

## 4. Document control

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L29).

**(2) Current words.**

L29 (extract):
> New requirements continue from SA-7-48.

**(3) Proposed words.**
- A version row: "| 2.13 | *(date placed)* | Workstream 2 change note CN-SA-07 applied: Appendix A keys and new rows (AI provider record, recall, delegation and instruction keys as proposals; account-manager message); support-ticket rows; an AI assistant is not a staff account (SA-7-48, BR-21). | AIW-D33, AIW-D59; IMP-1, IMP-5, IMP-6, IMP-8 |".
- L29: "continue from SA-7-49".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
