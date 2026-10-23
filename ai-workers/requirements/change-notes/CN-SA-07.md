# Change note CN-SA-07: Platform Users

| | |
|---|---|
| **Document changed** | SA-07 Platform Users, version 2.15, dated 2026-10-12 (written against v2.12 of 10 Oct; re-drawn on v2.15 on 14 Oct 2026) |
| **Current base (15 Oct 2026, snapshot 1535; scrum 4b outcome 0 (e))** | **SA-07 v2.15**, `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-07-platform-users_v2.15_2026-10-12.md` (identical to the 13 Oct 09:26 copy the re-base row checked). The re-base rows say what stands, is withdrawn or is re-aimed; a quote or line number marked re-pointed, corrected or "v2.15" is the current file's; any other is the older version's and is history. |
| **Re-drawn 14 Oct 2026 (citation gate batch 5)** | Changes 1 and 2 re-drawn on the six roles of SA-07 v2.15 Appendix A (Own · Adm · Sup · Bil · Con · Aud) and SA-10 v2.7's ticket keys; the old ticket-queue row's Content author, Billing and Platform engineer ticks are dropped because routing is parked (checker c1); changes 3 and 4 re-pointed to v2.15 lines. |
| **Re-based 13 Oct 2026 (source reconciliation, `decisions.md` rows "Reconciliation renumbering" and "Lead rulings, source reconciliation")** | Checked against **SA-07 v2.15** (12 Oct 2026). **ID collision:** our SA-7-48 was taken ("the code registry is the master for the six staff roles"); renumbered **SA-7-48 → SA-7-49**; L29 "continue from" → SA-7-50; SA-07 BR-21 is still free (always write "SA-07 BR-21"); version row 2.13 → **2.16**. **Six staff roles, not nine** (SA7-D8, SA-7-28; Appendix A rewritten): Platform Owner, Admin, Support, Billing, Content publisher, Auditor. "Platform engineer is not a console role"; Content author and Content approver → Content publisher; Firm onboarding / Account manager → **Admin** (the account manager is the Admin or the Owner, SA7-D47); Security and audit → **Auditor** (read-only) and the Owner; Staff manager and Billing operations are gone. **The nine-column ticks in changes 1 and 2 are obsolete** and must be re-drawn on the v2.15 Appendix A (Lead task, open). Billing-change keys (plan, period, cancel or undo, approved discount) are **Billing and Owner only** (SA7-D50). Security lock and security settings: Owner only (SA7-D53, SA7-D54). Payment log: Support views; Owner, Admin and Billing view and re-run (SA7-D52). The Platform Owner publishes every ExpatReady email; the Content publisher drafts (SA7-D70). Support holds "Audit trail, read" (W-14). Change 2's `system/support-ticket:*` rows: use the team's `system/support:list` and `:manage` (SA-10 v2.7 §10; SA10-X3). Change 3 (an assistant is not a staff account) still needed. Line numbers and quotes below are v2.12's. |
| **Re-based 14 Oct 2026 (increment 3 checker M3)** | The `system/ai-provider:edit` and `system/ai-instruction:edit` rows and the kill-switch and instruction-holder sentences no longer give anything to the Platform engineer (not a console role, SA-07 v2.15); holders match AW-02 §10 E. The rest of the nine-column table was re-drawn on the six roles on 14 Oct 2026 (row above). |
| **File (snapshot 1535)** | `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-07-platform-users_v2.15_2026-10-12.md` |
| **Date of this note** | 11 Oct 2026 (sixth round, after check S3a-e: spend-cap defaults Owner-only) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of snapshot 1535.
2. The current words, quoted exactly.
3. The proposed words, in SA-07's own style.
4. Why: the founder decision, improvement or gap behind the change.
5. What else must change.

**Plain words used here.** A *delegation record* says which assistant works for which named person, with a subset of that person's permissions, from when until when. It is not an identity and holds no permission of its own (AIW-D33; specified in AW-01 and AW-02). It takes effect only when the person accepts it. It ends only when that person ends it or is deactivated.

**Re-base.** In SA-07 v2.15, SA-7-49 and BR-21 are still free (the highest are SA-7-48, L546, and BR-20, L571); L32 reads "New requirements continue from SA-7-48" although SA-7-48 is used.

---

## 1. Appendix A: keys for the rows the Workstream 2 change notes touch, and new rows

*Re-drawn 14 Oct 2026 on SA-07 v2.15 Appendix A (six roles; citation gate batch 5). Line numbers are snapshot 1535's.*

**(1) What it changes.**
- Appendix A rows L832, L833, L834, L848 and L849;
- new rows after L849 (the "Platform (SA-8, SA-11, SA-12)" block);
- the §13 "Before build" task (L780).

**(2) Current words.**

L832:
> | Plan, entitlement and billing status of a firm (read-only) | ✔ | ✔ | ✔ | ✔ |  | ✔ |

L833:
> | Payment-processor notification log — view (SA7-D52; "Payment events" under Advanced) | ✔ | ✔ | ✔ | ✔ |  |  |

L834:
> | Payment-processor notification — re-run failed | ✔ | ✔ |  | ✔ |  |  |

L848 (extract):
> | Feature flags (`system/flag:manage`) … | ✔ | ✔ |  |  |  |  |

L849 (extract):
> | Operational settings (email sender, banners — Owner only, as coded; SR-Q4 item 3, SA-12 Q9). … | ✔ |  |  |  |  |  |

L780 (extract):
> **Before build** (tasks): the tech lead maps every Appendix A row to its `system/*` key, so QA has an exact matrix; …

**(3) Proposed words.**

The ticks on the five existing rows are unchanged. Each row gains its key:
- **L832:** "— `system/billing:view` or the narrower read key the team chooses (SA-04 §10 note)".
- **L833:** "— `system/billing:webhook-log` (view only, once SA-04's split, SA4-D38, is built)".
- **L834:** "— `system/billing:webhook-rerun` (SA-4-36: \"a separate key or check\")".
- **L848:** "— includes the AI emergency-stop flags (SA-12-35); tripping or untripping any kill switch stays `system/flag:kill`, Owner only (SA-12 v2.9 §10)".
- **L849:** "— includes the platform values of the approve-all safeguards, never to a value that switches a safeguard off (SA-12-37 (a)). Not the spend-cap defaults and not the switch-off of the founder safeguards setting: both are separate Owner-only settings (SA-12-37)".

New rows after L849. Rows marked *(proposal)* are proposals. The columns are as in Appendix A: Own · Adm · Sup · Bil · Con · Aud.
> | AI provider record — enter or change, not its keys (SA-8-66, `system/ai-provider:edit`) *(proposal; Platform Owner and Admin, AW-02 §10 E)* | ✔ | ✔ |  |  |  |  |
> | AI provider record — approve and publish, never one's own entry; withdraw the published record (SA-8-66, SA-8-67, `system/ai-provider:publish`) *(proposal)* | ✔ |  |  |  |  |  |
> | Switch off a part of the founder safeguards setting, recording the founder's decision (SA-12-37; Owner-only setting, SA-12-27 pattern) | ✔ |  |  |  |  |  |
> | Change an AI spend-cap default, the platform-wide cap included, with a recorded reason (SA-12-37 (c); Owner-only setting, SA-12-27 pattern; every other role is refused) | ✔ |  |  |  |  |  |
> | AI recall: withdraw waiting AI-prepared items (SA-12-36) *(proposal; whether another role also holds it, the team decides)* | ✔ |  |  |  |  |  |
> | Set up an assistant's delegation for another staff member, or withdraw that offer while it is still pending; it takes effect when that person accepts (`system/ai-delegation:manage`) *(proposal)* | ✔ |  |  |  |  |  |
> | assistant model instructions — author a new version (`system/ai-instruction:edit`) *(proposal; Platform Owner and Admin, AW-02 §10 E)* | ✔ | ✔ |  |  |  |  |
> | assistant model instructions — approve a version; never one's own (`system/ai-instruction:approve`) *(proposal)* | ✔ |  |  |  |  |  |
> | Send an account-manager message to a firm (SA-2-43, `system/firm:message-owner`; the account manager is an Admin, SA4-D38) | ✔ | ✔ |  |  |  |  |

No row gives anyone a key to stop or end another person's delegation. To halt an assistant at once, the Platform Owner trips the kill switch (SA-12-35, the L848 row; `system/flag:kill` is Owner-only, SA-12 v2.9).

L780 gains: "Rows touched by the Workstream 2 change notes (CN-SA-02, CN-SA-04, CN-SA-08, CN-SA-10, CN-SA-12) are mapped first, because an assistant's delegation can hold only keys its person holds."

**(4) Why.**
- **The webhook split:** proposals row of 10 Oct (Support AI); AW-2-60. SA-04 v2.21 SA4-D38 now asks for the same split as a developer task (CN-SA-04 change 1, partly met).
- **The narrower read:** the same document, G-19.
- **The provider record:** IMP-6; AIW-D52 and AIW-D69 (CN-SA-08 change 2). Owner publication is Workstream 2's own rule (AIW-D52, AIW-D69); the e-sign precedent once cited here, SA8-D22, is superseded by SA8-D28 in SA-08 v2.7 (no Owner sign-off), so it no longer supports it. Withdrawing sits with publishing (re-check S3a-c m-10).
- **The founder safeguards switch-off:** `00-step3-plan.md`, "Who switches it off (S3a-c N-2)": SA-12's existing Owner-only settings pattern, no new key; `system/platform-config:manage` (Owner-only, SA-12 v2.9) does not reach it.
- **Spend-cap defaults:** `00-step3-plan.md`, "Who changes a spend-cap default (S3a-e n-1)": the Platform Owner only (SA-12's Owner-only settings pattern, SA-12-27), with a recorded reason; every other role is refused. CN-SA-12 change 3 says the same.
- **The platform values:** SA-12-37 holds platform values only; firm values are firm settings in AG-16 (`00-step3-plan.md`, "A firm's tightening, write path"), so no firm staff appear here.
- **The stops and the recall:** IMP-8 (CN-SA-12).
- **The delegation and instruction keys:** AW-02 §10 table E; IMP-1 rule 1; IMP-5. Instruction editing by the Platform Owner and the Admin, approval by the Platform Owner: `00-step3-plan.md`, "AW-02 calls" (b); AW-02 §10 E.
- **No key stops another person's delegation:** `00-step3-plan.md`, "No one stops another person's delegation": "No key lets an Owner stop or end someone else's delegation."
- **The account-manager message:** proposals row of 10 Oct, outreach (CN-SA-02 change 2); key per CN-SA-06 change 4.

**(5) Knock-ons.**
- SA-04 §10 (CN-SA-04 changes 1 and 5).
- SA-08 §10 (CN-SA-08 change 2).
- SA-12 §10 (CN-SA-12 changes 2 and 3).
- SA-06 catalogue (CN-SA-06 change 4).
- SA-08 v2.7's own Appendix A row (SA8-X7, L143; marked applied in SA-07) is the team's and is not repeated here.

---

## 2. Appendix A: rows for support tickets

*Re-drawn 14 Oct 2026 on SA-07 v2.15 and SA-10 v2.7 (citation gate batch 5; the checker's c1 on the old ticket-queue row).*

**(1) What it changes.** SA-07 v2.15 Appendix A, the "Firms (SA-2)" block (after L822).

**(2) Current words.** None: Appendix A has no row for support tickets (SA-10), and the code seeds no ticket key on Support (L860). The nearest row is:

L817:
> | Start a support session (read-only unless the firm allowed changes) | ✔ |  | ✔ |  |  |  |

**(3) Proposed words.** A new block after L822. The key names are SA-10 v2.7's own (§10: `system/support:list`, `system/support:manage`; the legacy `system/support-ticket:*` names map to them).

> | **Support tickets (SA-10)** | | | | | | |
> | Ticket queue and tickets (`system/support:list`) | ✔ | ✔ | ✔ |  |  |  |
> | Reply, internal note, assign, status and priority, force-close, create a ticket for a firm (`system/support:manage`) | ✔ | ✔ | ✔ |  |  |  |

**(4) Why.**
- AW-02 §13 item 2 (Unknown; the 10 Oct design gap): "SA-07 Appendix A has no row for support tickets".
- The Step 2 team list (`decisions.md`, "AIW-D54 note") asks for "the support-ticket keys for the support and account-manager roles".
- **Where the ticks come from:** SA-10 v2.7 §2 (L197 to L199): **Support** answers firm tickets; **Support / Admin** keeps the queue healthy and assigns; the **Platform Owner** owns support quality. Routing to Content, Billing or an engineer is parked (SA-10 v2.7 §0.3: manual assignment only), so no other role is ticked. SA-10-21: force-close by an agent.
- **Namespace:** SA-06 v3.6 records "the purge of `global/*`" (L831). Its catalogue refuses "a legacy `global/` prefix" (L267). SA-10 v2.7 already uses `system/support:*`.

**(5) Knock-ons.**
- SA-10 §10 rows are pending in SA-06 (SA10-X2); CN-SA-10 change 4 asks only for the holders.
- **AW-02:** the account manager (an Admin) may hold these keys, but the account manager's delegation never lends them (`00-step3-plan.md`, "AW-02 calls" (d)).

---

## 3. An assistant working for a staff member is not a staff account

**(1) What it changes.**
- §3.3 "Several roles per person" (L393);
- §3.6 Activity (L419);
- a new requirement after SA-7-48 (L546);
- a new business rule after BR-20 (L571).

SA-7-39 (L537) is kept as written. *(Line numbers re-pointed 14 Oct 2026 to SA-07 v2.15; the quoted words below are unchanged in v2.15.)*

**(2) Current words.**

L537:
> - **SA-7-39** *(SA7-D42, SA7-D43)* A one-time go-live setup invites the first two Owners; audited; refuses to run if any Owner exists. No other route creates staff in production; staff access is never restored by editing the database.

L393:
> **Several roles per person** (SA7-D3). Nobody can approve their own request — enforced per action (SA7-D4).

L419 (extract, first two sentences):
> Every staff action is recorded in the platform audit trail against the named person (SA-11). The **Activity tab** is a plain list over that trail (SA7-D38): sign-ins and actions, newest first, filterable by date and type.

**(3) Proposed words.**

New requirement:
> - **SA-7-49** *(new — AIW-D33; IMP-1)* An assistant that works for a staff member is **not a staff account** and is never created through any staff route (SA-7-39 stands). It works under a **delegation record** that names the staff member and holds a subset of that person's `system/*` permissions: never more, never a permission the person lacks, and only keys lendable to an assistant (SA-6-53).
>
> The record takes effect when the person accepts it. It ends only when the person ends it or is deactivated (SA-7-22). A platform emergency stop pauses it but does not end it (SA-12-35). No staff member can stop or end another person's delegation.
>
> The assistant never appears in the staff list and holds no role.

New business rule:
> - **BR-21** *(new — AIW-D33)* **An assistant borrows, never holds.** Its actions are recorded against the named staff member it worked for, marked as done under a delegation, with what started the run (SA-11-2), and appear in that person's Activity marked so.

L393 gains: "While the second-person part of the founder safeguards setting is on (SA-12-37), any account or plan change that the Support AI proposed also needs a second person's confirmation; the person it worked for cannot confirm it (SA-4-92)."

L419 gains: "Entries made under a delegation (an assistant working for the person) carry a marker and the delegation reference (SA-11-2)."

**(4) Why.**
- **FD-16** (Founder Decisions Log v1.5, L52): no AI principal and no autonomous permissions (quoted in CN-SA-06).
- **AIW-D33:** the delegation record is consistent with FD-16.
- **IMP-1 rule 4:** a delegation "ends by itself when the person is deactivated or suspended". Staff have no Suspend (SA7-D10).
- **Shared rules** (`00-step3-plan.md`):
  - "Emergency stop": "A delegation ends only when its person ends it or is deactivated or suspended".
  - "No one stops another person's delegation".
  - "Actor rule".
  - "No 'during the pilot' in a requirement".
- **Relied on by:** AW-2-15; AW-2-13.
- **The second-person sentence** is AIW-D59 in its own words (CN-SA-04 change 3; `00-step3-plan.md`, "AIW-D59 in its own words"); it rests on SA7-D4 on this same line.

**(5) Knock-ons.**
- SA-11-2 (CN-SA-11 change 4).
- SA-06 SA-6-53 (CN-SA-06 change 1).
- AW-02.

---

## 4. Document control

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L32).

**(2) Current words.**

L32 (extract):
> New requirements continue from SA-7-48.

**(3) Proposed words.**
- A version row (renumbered 13 Oct 2026; 2.13 to 2.15 are the team's): "| 2.16 | *(date placed)* | Workstream 2 change note CN-SA-07 applied: Appendix A keys and new rows (AI provider record with withdrawal, founder safeguards switch-off and spend-cap defaults as Owner-only, recall, delegation set-up and instruction keys as proposals; account-manager message); support-ticket rows with `system/support-ticket:*` keys; an assistant is not a staff account (SA-7-49, BR-21). | AIW-D33, AIW-D59; IMP-1, IMP-5, IMP-6, IMP-8 |".
- L32 (v2.15 says "continue from SA-7-48", though SA-7-48 is already used, L546): "continue from SA-7-50".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
