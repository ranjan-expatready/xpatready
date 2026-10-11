# Change note CN-SA-07: Platform Users

| | |
|---|---|
| **Document changed** | SA-07 Platform Users, version 2.10, dated 2026-10-08 |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-07-platform-users_v2.10_2026-10-08.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 3 |

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID, section and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words, in SA-07's own style; (4) why, pointing to the founder's Workstream 2 decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*), the proposals row (`ai-workers/proposals.md`) or the gap list of a passed behaviour document (`ai-workers/design/behaviours/`, §9 G-*n*); (5) what else must change.

**Plain words used here.** *Delegation record*: the record that says which AI assistant works for which named person, with a subset of that person's permissions, from when until when; it is not an identity and holds no permission of its own (AIW-D33; specified in AW-01 and AW-02). Expat Ready's two AI assistants (Pack author's; Support and account) work for staff members under such a record.

---

## 1. Appendix A: map the split payment-notification rows, the provider and recall keys, and the narrower billing read

**(1) What it changes.** SA-07 v2.10 Appendix A rows L733, L734, L735, L737; §13 "Before build" task (L686).

**(2) Current words.**

L733:
> | Plan, entitlement and billing status of a firm (read-only) | ✔ | | | | ✔ | ✔ | ✔ | ✔ | |

L734:
> | Payment-processor notification log — view (SA7-D52) | ✔ | | | | | ✔ | ✔ | | ✔ |

L735:
> | Payment-processor notification — re-run failed | ✔ | | | | | ✔ | | | ✔ |

L737:
> | Integration credentials · feature flags · operational settings (shared inbox, email sender, banners) | ✔ | | | | | | | | ✔ |

L686:
> **Before build** (tasks): the tech lead maps every Appendix A row to its `system/*` key, so QA has an exact matrix; the infrastructure team flags the production deployment (SA-7-18).

**(3) Proposed words.**

Ticks unchanged. Each row gains its key in the capability text:
- L733: "… (read-only) — `system/billing:view` or the narrower read key the team chooses (SA-04 §10 note)".
- L734: "… view (SA7-D52) — `system/billing:webhook-log` (view only, SA-4-36)".
- L735: "… re-run failed — `system/billing:webhook-rerun` (SA-4-36)".
- L737: "… — includes approving, suspending or withdrawing a processing provider, the AI provider included (SA-8-36), and the AI emergency-stop flags (SA-12-31)".

New row after L737:
> | AI recall: withdraw waiting AI-prepared items (SA-12-32) | ✔ | | | | | | | | *(team decides)* |

L686 gains: "Rows touched by the Workstream 2 change notes (CN-SA-04, CN-SA-08, CN-SA-10, CN-SA-12) are mapped first, because an AI assistant's delegation can hold only keys its person holds."

**(4) Why.** The split: proposals row of 10 Oct (Support and account assistant, webhook-log split): "SA-07 Appendix A already splits them into two rows … which the tech lead must map to keys … With one key, mapping the Support row hands Support a re-run, and no read-only delegation can hold the log"; `support-and-account-assistant.md` §9 G-18. The narrower read: same document G-19. The provider entry: IMP-6 and AIW-D52, D69 (CN-SA-08 change 2). The stops and the recall: IMP-8 (CN-SA-12). A delegation holds "always a subset, never more" of its person's permissions (IMP-1), found consistent with FD-16 by AIW-D33.

**(5) Knock-ons.** SA-04 §10 (CN-SA-04 changes 1 and 5); SA-08 §10 (CN-SA-08 change 2); SA-12 §10 (CN-SA-12 change 2).

---

## 2. Appendix A: rows for support tickets

**(1) What it changes.** SA-07 v2.10 Appendix A, "Firms (SA-2)" block (after L724).

**(2) Current words.** None: Appendix A has no row for support tickets (SA-10). The nearest row is:

L719:
> | Start a support session (read-only unless the firm allowed changes) | ✔ | | | | ✔ | | ✔ | ✔ | |

**(3) Proposed words.** A new block after L724:
> | **Support tickets (SA-10)** | | | | | | | | | |
> | Ticket queue, reply, internal note, triage, assign, status, escalate (`global/support:list`, `global/support:manage`) — Content author for tickets routed to content (SA-10-6) | ✔ | | ✔ | | ✔ | | ✔ | | |
> | Force-close a ticket (`global/support:close`) | ✔ | | | | | | ✔ | | |
> | Configure categories, SLA, routing, escalation, canned responses, knowledge base (`global/support:config`) | ✔ | | | | | | | | |

**(4) Why.** `support-and-account-assistant.md` §9 G-17 (Unknown): "SA-07 Appendix A has no row for support tickets … Until mapped: the Support role's holding is Unknown (the example assumes it); the Account manager is not assumed to hold any ticket key, so an account manager's delegation runs no ticket recipe". The step-2 team list asks for "the support-ticket keys for the support and account-manager roles" (`ai-workers/design/behaviours/00-step2-decisions.md` §6). The ticks follow SA-10 v2.5 §2 (L152–L155: "Support Agent"; "Support Lead / Firm onboarding / Account manager"; "Country / Content Manager (SA-1)" for "the immigration-content questions routed to them"; "Platform Owner" for configuring support), SA-10-21 (force-close by an agent, L380) and SA-10-25 (configuration by a Platform Owner, L388). The team confirms them.

**(5) Knock-ons.** SA-10 §10 (CN-SA-10 change 4).

---

## 3. An AI assistant working for a staff member is not a staff account

**(1) What it changes.** SA-07 v2.10 §3.3 "Several roles per person" (L349); §3.6 Activity (L375); a new requirement after SA-7-47 (the document's last, L480); a new business rule after BR-20 (L505). SA-7-39 (L472) is kept as written.

**(2) Current words.**

L472:
> - **SA-7-39** *(SA7-D42, SA7-D43)* A one-time go-live setup invites the first two Owners; audited; refuses to run if any Owner exists. No other route creates staff in production; staff access is never restored by editing the database.

L349:
> **Several roles per person** (SA7-D3). Nobody can approve their own request — enforced per action (SA7-D4).

L375 (extract, first two sentences):
> Every staff action is recorded in the platform audit trail against the named person (SA-11). The **Activity tab** is a plain list over that trail (SA7-D38): sign-ins and actions, newest first, filterable by date and type.

**(3) Proposed words.**

New requirement:
> - **SA-7-48** *(new — AIW-D33; IMP-1)* An AI assistant that works for a staff member is **not a staff account** and is never created through any staff route (SA-7-39 stands). It works under a **delegation record** that names the staff member and holds a subset of that person's `system/*` permissions (never more, never a permission the person lacks). The record ends when the person is deactivated (SA-7-22) or ends it. The assistant never appears in the staff list and holds no role.

New business rule:
> - **BR-21** *(new — AIW-D33)* **An AI assistant borrows, never owns.** Its actions are recorded against the named staff member it worked for, marked as done under a delegation (SA-11-2), and appear in that person's Activity marked so.

L349 gains: "Account or plan changes that an AI assistant proposed also need a second person's confirmation during the pilot (SA-4-75)."

L375 gains: "Entries made under a delegation (an AI assistant working for the person) carry a marker and the delegation reference (SA-11-2)."

**(4) Why.** FD-16 (Founder Decisions Log v1.5, L52): "no AI principal in the identity spine, no autonomous permissions". AIW-D33: a delegation record "(which persona works for which named person, with a subset of that person's permissions, on which files, from when until when; no identity and no permissions of its own) is consistent with FD-16". IMP-1 rule 4: a delegation "ends by itself when the person is deactivated or suspended". The platform-plane form is a gap in both passed platform documents: `pack-authors-assistant.md` §9 G-19 ("'No other route creates staff in production' (SA-7-39), which is right: the persona is not staff and needs no account; the record is IMP-1's", "Proposal, confirmed in principle") and `support-and-account-assistant.md` §9 G-14 ("the same record as IMP-1, with `system/*` keys"). The second-person sentence is AIW-D59 (CN-SA-04 change 3).

**(5) Knock-ons.** SA-11-2 (CN-SA-11 change 4) adds the delegation marker to every audit entry. SA-06 marks which keys can never be delegated (CN-SA-06 change 1). AW-02 specifies the platform delegation record and each assistant's permission subset (including that the Support and account assistant "never starts a support session", `support-and-account-assistant.md` §0 item 4).
