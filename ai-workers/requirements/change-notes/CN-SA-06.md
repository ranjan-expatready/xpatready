# Change note CN-SA-06: RBAC, Roles and Permissions

| | |
|---|---|
| **Document changed** | SA-06 RBAC — Roles & Permissions, version 3.3, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-06-rbac_v3.3_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (second fix round, after re-check S3a-b) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 6 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-06's own style.
4. Why: the founder's decision (Founder Decisions Log FD-*n*; `ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`).
5. What else must change.

**Plain words used here.**
- *Delegation record*: which AI assistant works for which named person, with a subset of that person's permissions, on which files, from when until when.
  - It is not an identity and holds no permission of its own; the person it works for counts as the preparer (AIW-D33).
  - It takes effect only when the person accepts it. Only the person ends it, or deactivation or suspension does.
  - The record is specified in AW-01 (firm plane) and AW-02 (platform plane).
- *Lendable to an AI assistant*: a key that a delegation may include. SA-06 already uses "delegable" to mean "may go on a custom role" (Appendix C, L1378), so this note uses another word.

**Re-base and numbering.** v3.2 (10 Oct) added SA-6-34 to SA-6-43 and BR-24 to BR-26, and v3.3 changed two key descriptions. The new IDs here are therefore **SA-6-44**, **BR-27** and open question **13**: the highest in use are SA-6-43 (L505), BR-26 (L536) and Q12 (L1189).

**Checked, not changed.**
- SA-06's key descriptions that name "Drafter" (L790, L816, L905) mean the template engine, which keeps that name (AIW-D53).
- The Billing / Finance starter role keeps its keys (AIW-D47).
- No key reads AI run-log rows on screen (AIW-D70).
- **No key lets an Owner stop or end another person's delegation.** To halt an assistant at once, an Owner uses the switches: the firm's per-assistant switch (AG-16-57), the firm's AI switch (AG-16-35), or the platform kill switch (SA-12-31). Deactivation also ends it (`00-step3-plan.md`, "No one stops another person's delegation").

---

## 1. Which keys can be lent to an AI assistant; the pause switch-off is Owner-only

**(1) What it changes.**
- §7 `PermissionCatalog` (L587);
- Appendix C, the "Never delegable" paragraph (L1378);
- a new requirement SA-6-44;
- a new business rule BR-27.

**(2) Current words.**

L587:
> **`PermissionCatalog`** *(built, `authorization.prisma:76-91`)* — `key` (PK), `scope`, `namespace`, `resource`, `action`, `qualifier?` (`own` | `all`), `descriptionEn`, `descriptionFr`, `isActive`, `owningModule`. Mirror of `PERMISSION_CATALOG` (`permission.ts:180-184`).

L1378 (extract, the Owner-only role checks):
> Owner-only role checks with no key (AG-11 L1147-1148; AG-16 L742-743): switching Team safeguards off, switching supervised client messages off, choosing who approves AI-written client text, first AI switch-on.

**(3) Proposed words.**

§7 `PermissionCatalog` gains a field: "`assistantLendable` (bool, required, default **false**) *(new — AIW-D33, AIW-D55)* — whether the key may be part of an AI assistant's delegation; a release sets it true only for keys AW-01 or AW-02 lists in an assistant's subset."

New requirement:
> - **SA-6-44** *(new — AIW-D33, AIW-D36, AIW-D55; IMP-1, IMP-22, IMP-23)* — **Keys an AI assistant may borrow.** A delegation record (AW-01, AW-02) holds only keys that both:
>   - (a) the named person holds at that moment, re-checked at every action; and
>   - (b) are marked `assistantLendable`.
>
>   These keys are never marked lendable:
>   - the keys of the five Owner-only actions (SA-6-31);
>   - the sign-off keys (`agent/case:waive-deficiency`, `agent/case:form-approve`, `agent/case:review-approve`, `agent/retainer:countersign`, SA-6-26);
>   - the retainer approve-for-send key (change 3);
>   - `agent/pii:reveal` (change 2);
>   - every other key on the blocked list of AW-01 and AW-02: keys that approve, verify, sign, submit, record money, delete or export, and keys that change users, roles, settings, switches or delegations.
>
>   The server refuses a delegation that includes a key not marked lendable, with 403, nothing written and a security audit event (the SA-6-13 pattern).

New business rule:
> - **BR-27 (An AI assistant borrows, never holds)** *(new — AIW-D33)*. An AI assistant has no role, no `PlatformUserRole` or `FirmUserRole` row and no key of its own. What it may do is the overlap of its delegation and the named person's current keys, limited to lendable keys (SA-6-44). Removing a key from the person removes it from the delegation at once.

Appendix C, after "first AI switch-on", add: "; **switching off the pause on client-facing AI preparation while the firm has no active licensed user**, with a recorded reason *(new — AIW-D56, provisional until counsel)*."

**(4) Why.**
- **FD-16** (Founder Decisions Log v1.5, L52): "no AI principal in the identity spine, no autonomous permissions".
- **AIW-D33** (the founder, "Yes to both"): the delegation record is consistent with FD-16, and "the named person the persona worked for counts as the preparer for four-eyes".
- **AIW-D36:** "the licence sits with the approver".
- **IMP-1 rule 5:** "the worker can **never hold an approval permission**: every approval is made by a person".
- **IMP-22:** "The permission subset is the role's starter permissions minus the blocked list (IMP-23), never more than the person holds" and "The permission is re-checked at every action".
- **IMP-23:** the blocked list is "enforced on the server like the floors … and never delegable".
- **AIW-D55** adopted the hard limits and blocked list, provisional until counsel.
- **AIW-D56:** "the Owner may switch it off with a recorded reason". AW-01 §0.2 names "the pause switch-off among the Owner-only role checks" as SA-06's half.
- **No Owner-only check for delegation set-up.** The earlier version also listed "setting up an AI assistant's delegation for another staff member" as an Owner-only check with no key. That line is **withdrawn**, because it duplicated what AW-01 already specifies: the firm side is AW-1-6 ("the Owner MAY set one up for any active staff member"), and the platform side has its own key (change 4).

**(5) Knock-ons.**
- SA-07 SA-7-48 (CN-SA-07 change 3).
- AG-16 hosts the firm's set-up screen and the pause switch-off (CN-AG-16).
- AW-02 §10 table E's note "until then CN-SA-06 change 1's Owner-only check with no key applies" is now stale (listed for the Lead).
- Counsel reads the blocked list before the pilot (AIW-D55, D64).

---

## 2. Keep the reveal permission for Restricted fields under FD-15

**(1) What it changes.**
- decision row AG7-D10 (L55);
- SA-6-23 (L485);
- §10c `portal/pii:reveal-own` (L1096);
- §11 Security (L1113);
- §12 "Reveal keys still active and seeded" (L1148);
- Appendix B rows (L1309, L1310);
- Appendix C "Withdrawn:" list (L1378).

**(2) Current words.**

L1113:
> - **No masking or reveal (AG7-D10).** There are no reveal keys; exports are governed by export permissions and audited. Code still carries `agent/pii:reveal` and `agent/audit-ip:reveal` (§12).

L1148 (extract, last sentence):
> Remove the routes, set the keys inactive and remove them from templates.

L1309:
> | `agent/pii:reveal` | WITHDRAWN | permission-catalog-rows.ts:419 | AG7-D10 no masking/reveal - code to remove |

L1096:
> | `portal/pii:reveal-own` | Portal subject reveals their own Restricted-classified PII value | false | withdrawn — code to remove (AG7-D10) | in ERv2 (permission-catalog-rows.ts:442) |

**(3) Proposed words.**

L1113:
> - **Restricted fields: masked, with an audited reveal (FD-15).** *(changed — FD-15 kept, AIW-D58)* Fields on the Restricted list (Founder Decisions Log B-1, set with counsel) are masked by default and revealed only with `agent/pii:reveal` (staff) or `portal/pii:reveal-own` (a client's own data), each use audited (Doc 1 v1.3 §7.2). All other personal data is not masked (AG7-D10). Exports are governed by export permissions and audited.

L1148, last sentence:
> **Hold** *(changed — FD-15 kept, AIW-D58)*: do not remove the `agent/pii:reveal` and `portal/pii:reveal-own` routes or keys until the Restricted list (B-1) is set; they then apply to Restricted fields only. `agent/audit-ip:reveal` and the per-module `*:reveal-pii` keys stay withdrawn.

Appendix B (L1309, L1310) and the L1096 status cell: "WITHDRAWN" / "withdrawn — code to remove" becomes "**HELD — FD-15 (AIW-D58)**: kept for Restricted fields; active once B-1 is set".

Appendix C "Withdrawn:" list (L1378): remove "code `agent/pii:reveal`" and "`portal/pii:reveal-own`", and add after the list "(`agent/pii:reveal` and `portal/pii:reveal-own` are held under FD-15)".

The AG7-D10 row (L55) and SA-6-23 (L485) each gain: "Restricted fields excepted: FD-15 (kept 11 Oct 2026, AIW-D58)."

**(4) Why.**
- **FD-15** (Founder Decisions Log v1.5, L40): "metadata fields whose canonical class is in the B-1 Restricted list get envelope-encryption + masked audited reveal".
- **Doc 1 v1.3 §7.2** (L2063): "Cleartext is returned only when the caller holds an explicit reveal permission (`agent/pii:reveal` for staff, `portal/pii:reveal-own` for a portal subject viewing their own data)".
- **README §0 rule 11:** a team file never overrides a founder decision.
- **AIW-D58:** the founder chose "Keep FD-15".

**(5) Knock-ons.**
- SA-11 (CN-SA-11 change 5).
- AG-07 (CN-AG-07).
- AG-09 (CN-AG-09).
- `agent/pii:reveal` is never lendable (change 1).

---

## 3. Split keys by act: retainer generate and approve-for-send; document status acts; every document request under `agent/case:document-manage`

**(1) What it changes.** §10b rows:
- `agent/retainer:draft` (L816);
- `agent/case:document-manage` (L856);
- `agent/document:change-status` (L899);
- `agent/document:request` (L908);
- `agent/document:waive` (L912).

**(2) Current words.**

L816:
> | `agent/retainer:draft` | Generate/edit a retainer draft (Drafter); approve-for-send | Y | Y | Y | Y | - | - | NEW |

L856:
> | `agent/case:document-manage` | Add/request/approve/reject Binder documents | Y | Y | Y | Y | - | - | NEW |

L899:
> | `agent/document:change-status` | Verify / reject / move status | Y | Y | Y | Y | - | - | NEW in ERv2 catalogue (AG §10 says legacy key exists - unverified) |

L908:
> | `agent/document:request` | Request documents from the client | Y | Y | Y | Y | - | - | NEW in ERv2 catalogue (AG §10 says legacy key exists - unverified) |

L912:
> | `agent/document:waive` | Waive / mark Not-Applicable (reason; audited) | Y | Y | Y | - | - | - | NEW |

**(3) Proposed words.**

**Retainer.** L816 becomes two rows. The default holders are unchanged from today's single key.
> | `agent/retainer:draft` | Generate/edit a retainer draft (Drafter) *(changed — split by act)* | Y | Y | Y | Y | - | - | NEW |
> | `agent/retainer:approve-for-send` *(new; the same name in CN-AG-05)* | Approve a retainer draft for sending: the consultant takes professional responsibility for its content (AG-05 §3.4, AG-5-17) | Y | Y | Y | Y | - | - | NEW |

**Every document request.** L856 becomes: "Request and re-request documents from the client, on the Binder or not; add documents to the Binder; add an ad-hoc item *(changed — split by act: status verdicts are AG-09's keys)*". L908, `agent/document:request`, is **not kept**: it is merged into `agent/case:document-manage`, with an Appendix B row "merged".

**Status acts.** L899 and L912 keep their acts. Every status act on a document sits under AG-09's keys, which own document state (AG-9-35):
- verify, reject or move status: `agent/document:change-status`;
- waive or mark not applicable: `agent/document:waive`.

**(4) Why.**
- **The Keys rule** (`00-step3-plan.md`, "Keys (S3c M-3)"): "retainer *generate* and *approve for send* are split …; document status acts including waive and not-applicable sit under AG-09's keys …; Binder request and add sit under `agent/case:document-manage`."
- **The document-requests key** (`00-step3-plan.md`, re-check S3a-b R-5): "every document request, on the Binder or not, sits under `agent/case:document-manage` …; `agent/document:request` is not kept. CN-AG-09 aligns to CN-SA-06." This note was checked against that rule in the second fix round and matches it. The L856 wording now says "on the Binder or not" outright.
- **Proposals rows of 10 Oct:** Case assistant, fix round (two keys overlap on an upload verdict); Intake assistant, retainer draft, item (2).
- **AIW-D54 item 6** ("no AI text in the retainer").
- **Gaps:** `case-assistant.md` §9 G-29; `intake-assistant.md` §9 GI-19.

**(5) Knock-ons.**
- AG-05 (CN-AG-05).
- AG-07 and AG-09 §10 (CN-AG-07, CN-AG-09). CN-AG-09 is to drop its "kept for documents not on a Binder" wording (listed for the Lead).
- Appendix B gains rows; Appendix C counts are recounted.

---

## 4. Proposal: new platform keys the Workstream 2 change notes and AW-02 need

**(1) What it changes.** The permission catalogue (SA-6-1; `system/*` rows owned by their modules); §10a gains one row for SA-06's own key.

**(2) Current words.** None. These keys do not exist. SA-08 v2.4 withdrew `system/integration:manage` (L392).

**(3) Proposed words.** *Proposal.* Names are for the team (BR-21, L531); default holders as proposed. None of these keys is lendable (change 1).

| Key | Owning module | Meaning | Default holder (proposal) | Basis |
|---|---|---|---|---|
| `system/billing:webhook-rerun` | SA-04 | Re-run failed processor notifications | Platform Owner, Billing, Platform engineer (SA-07 Appendix A L739) | CN-SA-04 change 1 |
| `system/ai-recall:withdraw` | SA-12 | Withdraw waiting AI-prepared items for a safety recall | Platform Owner | CN-SA-12 change 2; IMP-8(c) |
| `system/ai-provider:edit` | SA-08 | Enter or change the AI provider record (not its keys) | Platform engineer, Platform Owner | CN-SA-08 change 2; IMP-6 |
| `system/ai-provider:publish` | SA-08 | Approve and publish the AI provider record; never one's own entry | Platform Owner | CN-SA-08 change 2; SA8-D22 pattern |
| `system/ai-delegation:manage` (§10a) | SA-06 | **Set up** an AI assistant's delegation for another staff member; it takes effect only when that person accepts. A person sets up, accepts and ends their own with no key. **No key stops or ends someone else's delegation.** | Platform Owner | AW-02 §10 table E; IMP-1 rule 1 |
| `system/ai-instruction:edit` | AW-02 | Author a new version of an assistant's model instructions and evaluation set | Platform engineer | AW-02 §10 table E; IMP-5 |
| `system/ai-instruction:approve` | AW-02 | Approve an instruction version for live use; never one's own | Platform Owner | AW-02 §10 table E; IMP-5; SA7-D4 |
| `system/firm:message-owner` | SA-02 | Send an account-manager message to a firm (SA-2-42) | Firm onboarding / Account manager | CN-SA-02 change 2 |

**(4) Why.**
- **AW-02 §10 table E** proposes `system/ai-delegation:manage`, `system/ai-instruction:edit` and `system/ai-instruction:approve`. The Lead asked for them as Proposals here.
- **IMP-1 rule 1:** the delegation "is **granted by the named person it works for**; the Owner may set one up for that person, but it takes effect only when the person accepts it, and the person can end it at any time".
- **IMP-5:** "only a named platform role may change them; a second person approves before a version goes live".
- **No stop key** (`00-step3-plan.md`, "No one stops another person's delegation"): "No key lets an Owner stop or end someone else's delegation". The earlier "Set up or stop" wording is withdrawn. To halt an assistant at once, the Platform Owner trips the platform kill switch (SA-12-31).
- The other rows are the keys the sibling notes create.

**(5) Knock-ons.**
- SA-07 Appendix A (CN-SA-07 change 1).
- AW-02 §10 table E uses the two `system/ai-provider:*` keys in place of `system/integration:manage`, and describes `system/ai-delegation:manage` as set-up only.

---

## 5. Open question: the key for accepting a fact for a lead with no case

**(1) What it changes.** SA-06 v3.3 §13, a new question after item 12 (L1189).

**(2) Current words.** None. §13 ends at item 12 (L1189), closed.

**(3) Proposed words.**
> 13. **Accepting a fact for a lead who has no case** *(new — Workstream 2)*. "Done on behalf of client" uses the item's own permission (AG17-D74; SA-6-22), which for a case is `agent/case:edit`. For a lead with no case no key is named; AG-03 says running the Qualifier "today rides on `agent/prospect:edit`". Name the key, without a new key if possible.

**(4) Why.**
- Proposals row of 10 Oct (Intake assistant).
- `intake-assistant.md` §9 GI-4, GI-5.
- SA-6-22 (L484) records "'Done on behalf of client' = the item's own permission (AG17-D74)".

**(5) Knock-ons.** AG-03 §10 and AG-08 (CN-AG-03, CN-AG-08).

---

## 6. Document control

**(1) What it changes.** The document-control table (L5 onward).

**(2) Current words.** The last row is v3.3 of 2026-10-10.

**(3) Proposed words.** A version row: "| 3.4 | *(date placed)* | Workstream 2 change note CN-SA-06 applied: keys lendable to an AI assistant (SA-6-44, BR-27); the pause switch-off among the Owner-only checks; reveal keys held under FD-15; keys split by act, every document request under `agent/case:document-manage`; new platform keys (proposal); open question 13. | AIW-D33, AIW-D55, AIW-D56, AIW-D58; FD-15 |".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
