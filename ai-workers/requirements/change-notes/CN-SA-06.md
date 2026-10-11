# Change note CN-SA-06: RBAC, Roles and Permissions

| | |
|---|---|
| **Document changed** | SA-06 RBAC — Roles & Permissions, version 3.1, dated 2026-10-08 |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-06-rbac_v3.1_2026-10-08.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID, section and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words, in SA-06's own style; (4) why, pointing to the founder's Workstream 2 decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`); (5) what else must change.

**Plain words used here.** *Delegation record*: the record that says which AI assistant works for which named person, with a subset of that person's permissions, on which files, from when until when. It is not an identity and holds no permission of its own; the person it works for counts as the preparer (AIW-D33). The record and the assistants' permission subsets are specified in AW-01 (firm plane) and AW-02 (platform plane); SA-06 only needs the catalogue to say which keys may ever be lent, and who may set a delegation up.

**Not changed.** The Billing / Finance starter role keeps its 44 keys with no message-sending and no manual-run key (AIW-D47, "Keep the role as accepted"). No key is created for reading AI run-log rows on screen (AIW-D70; proposals row of 10 Oct on who reads the Practice expert's question log).

---

## 1. The catalogue marks which keys can be lent to an AI assistant, and who sets a delegation up

**(1) What it changes.** SA-06 v3.1 §7 `PermissionCatalog` (L539); Appendix C, "Never delegable" paragraph (L1309); a new requirement after SA-6-33 (the document's last, L470); a new business rule after BR-23 (L498).

**(2) Current words.**

L539:
> **`PermissionCatalog`** *(built, `authorization.prisma:76-91`)* — `key` (PK), `scope`, `namespace`, `resource`, `action`, `qualifier?` (`own` | `all`), `descriptionEn`, `descriptionFr`, `isActive`, `owningModule`. Mirror of `PERMISSION_CATALOG` (`permission.ts:180-184`).

L1309 (extract, the sentence on Owner-only role checks):
> Owner-only role checks with no key (AG-11 L1147-1148; AG-16 L742-743): switching Team safeguards off, switching supervised client messages off, choosing who approves AI-written client text, first AI switch-on.

**(3) Proposed words.**

§7 `PermissionCatalog` gains a field: "`assistantDelegable` (bool, required) *(new — AIW-D33, AIW-D55)* — whether the key may be part of an AI assistant's delegation. Default **false**; a release sets it true only for keys AW-01 or AW-02 lists as an assistant's subset."

New requirement:
> - **SA-6-34** *(new — AIW-D33, AIW-D36, AIW-D55; IMP-1, IMP-22, IMP-23)* — **Keys an AI assistant may borrow.** A delegation record (AW-01, AW-02) SHALL hold only keys that (a) the named person holds at that moment, re-checked at every action, and (b) are marked `assistantDelegable` in the catalogue. These SHALL never be marked delegable: the keys of the five Owner-only actions (SA-6-31); the sign-off keys (`agent/case:waive-deficiency`, `agent/case:form-approve`, `agent/case:review-approve`, `agent/retainer:countersign`, SA-6-26) and every other key that approves, verifies, signs, submits, records money, deletes, exports, or changes users, roles, settings, switches or delegations — the blocked list of AW-01 / AW-02. The server SHALL refuse any delegation that includes a non-delegable key, with 403, nothing written and a security audit event (the SA-6-13 pattern).

Appendix C, after "first AI switch-on" add: "; **setting up an AI assistant's delegation for another staff member** *(new — AIW-D33)*. A staff member accepts or ends a delegation for themselves with no key."

New business rule:
> - **BR-24 (An AI assistant borrows, never holds)** *(new — AIW-D33)*. An AI assistant has no role, no `PlatformUserRole` or `FirmUserRole` row and no key of its own. What it may do is the intersection of its delegation and the named person's current keys, limited to delegable keys (SA-6-34). Removing a key from the person removes it from the delegation at once.

**(4) Why.** FD-16 (Founder Decisions Log v1.5, L52): "no AI principal in the identity spine, no autonomous permissions". AIW-D33 (the founder, "Yes to both"): the delegation record is consistent with FD-16 and "the named person the persona worked for counts as the preparer for four-eyes". AIW-D36: any named staff member may have an assistant; "the licence sits with the approver". IMP-1 rule 5: "the worker can **never hold an approval permission**: every approval is made by a person"; IMP-22: "The permission subset is the role's starter permissions minus the blocked list (IMP-23), never more than the person holds" and "The permission is re-checked at every action"; IMP-23: the blocked list is "enforced on the server like the floors … and never delegable". AIW-D55 adopted the hard limits and blocked list, provisional until counsel. The behaviour documents rely on the Owner setting a delegation up and the person accepting it ("the case officer accepts a delegation set up by the Owner", `case-assistant.md` §8; the same in `intake-assistant.md` §8 and `billing-assistant.md` §8). SA-06's own Appendix C already lists AI-related Owner-only role checks with no key (L1309), which this extends.

**(5) Knock-ons.** SA-07 SA-7-48 (CN-SA-07 change 3) for staff on the platform plane. AG-16 hosts the firm's delegation set-up screen (CN-AG-16, if the Agent-plane note takes it). Counsel reads the blocked list before the pilot (AIW-D55, D64).

---

## 2. Keep the reveal permission for Restricted fields under FD-15

**(1) What it changes.** SA-06 v3.1 decision row AG7-D10 (L52); SA-6-23 (L460); §11 Security (L1049); §12 "Reveal keys still active and seeded" (L1084); Appendix B rows for `agent/pii:reveal` (L1240) and `portal/pii:reveal-own` (L1241).

**(2) Current words.**

L1049:
> - **No masking or reveal (AG7-D10).** There are no reveal keys; exports are governed by export permissions and audited. Code still carries `agent/pii:reveal` and `agent/audit-ip:reveal` (§12).

L1084 (extract, last sentence):
> Remove the routes, set the keys inactive and remove them from templates.

L1240:
> | `agent/pii:reveal` | WITHDRAWN | permission-catalog-rows.ts:419 | AG7-D10 no masking/reveal - code to remove |

**(3) Proposed words.**

L1049:
> - **Restricted fields: masked, with an audited reveal (FD-15).** *(changed — FD-15 kept, AIW-D58)* Fields on the Restricted list (Founder Decisions Log B-1, set with counsel) are masked by default and revealed only with `agent/pii:reveal` (staff) or `portal/pii:reveal-own` (a client's own data), each use audited (Doc 1 v1.3 §7.2). All other personal data is not masked (AG7-D10). Exports are governed by export permissions and audited.

L1084, last sentence:
> **Hold** *(changed — FD-15 kept, AIW-D58)*: do not remove the `agent/pii:reveal` and `portal/pii:reveal-own` routes or keys until the Restricted list (B-1) is set; they then apply to Restricted fields only. `agent/audit-ip:reveal` and the per-module `*:reveal-pii` keys stay withdrawn.

Appendix B, L1240 and L1241: status "WITHDRAWN" becomes "**HELD — FD-15 (AIW-D58)**: kept for Restricted fields; activated once B-1 is set".

AG7-D10 row (L52) and SA-6-23 (L460) gain: "Restricted fields excepted: FD-15 (kept 11 Oct 2026, AIW-D58)."

**(4) Why.** FD-15 (Founder Decisions Log v1.5, L40): "metadata fields whose canonical class is in the B-1 Restricted list get envelope-encryption + masked audited reveal". Doc 1 v1.3 §7.2 (L2063) names the keys: "Cleartext is returned only when the caller holds an explicit reveal permission (`agent/pii:reveal` for staff, `portal/pii:reveal-own` for a portal subject viewing their own data)". A module file never overrides a founder decision by date (README §0 rule 11); the founder chose "Keep FD-15" (AIW-D58: "the team brings AG-07 (AG7-D10) back to it … counsel confirms the Restricted list (B-1) before any is stored. The AI sees status only, either way."). Proposals row of 10 Oct (Practice expert, two Restricted-field models).

**(5) Knock-ons.** SA-11 (CN-SA-11 change 5). AG-07 AG7-D10 and AG-7-88 (CN-AG-07). An AI assistant's delegation never includes `agent/pii:reveal` (non-delegable under SA-6-34; the AI sees status only, AIW-D58, IMP-21).

---

## 3. Split two keys by act: document verdicts, and retainer generation versus approve-for-send

**(1) What it changes.** SA-06 v3.1 §10b rows `agent/case:document-manage` (L792), `agent/document:change-status` (L835) and `agent/retainer:draft` (L752).

**(2) Current words.**

L752:
> | `agent/retainer:draft` | Generate/edit a retainer draft (Drafter); approve-for-send | Y | Y | Y | Y | - | - | NEW |

L792:
> | `agent/case:document-manage` | Add/request/approve/reject Binder documents | Y | Y | Y | Y | - | - | NEW |

L835:
> | `agent/document:change-status` | Verify / reject / move status | Y | Y | Y | Y | - | - | NEW in ERv2 catalogue (AG §10 says legacy key exists - unverified) |

**(3) Proposed words.**

L792:
> | `agent/case:document-manage` | Add/request/re-request Binder documents; add an ad-hoc item; mark not applicable with a reason *(changed — split by act: the status verdict moves to `agent/document:change-status`)* | Y | Y | Y | Y | - | - | NEW |

L835:
> | `agent/document:change-status` | Verify / reject / waive / move status — **the one key for a document's status verdict** *(changed — split by act)*; a combined verdict screen checks both keys | Y | Y | Y | Y | - | - | NEW in ERv2 catalogue (AG §10 says legacy key exists - unverified) |

L752 becomes two rows:
> | `agent/retainer:draft` | Generate/edit a retainer draft (Drafter) *(changed — split by act)* | Y | Y | Y | Y | - | - | NEW |
> | `agent/retainer:approve-for-send` *(new; name for the team)* | Approve a retainer draft for sending: the consultant takes professional responsibility for its content (AG-05 §3.4, AG-5-17) | Y | Y | Y | Y | - | - | NEW |

Default holders are unchanged from today's single key; a firm that copies Case Officer into an intake role can now leave approve-for-send out.

**(4) Why.** Proposals row of 10 Oct (Case assistant, fix round): "Two permission keys cover overlapping acts on an upload verdict, both seeded on the Case Officer … Recommended split: the status transition (Received → Verified / Rejected / Waived) is `agent/document:change-status`; the Binder acts (request, re-request, add an ad-hoc item, not applicable) are `agent/case:document-manage`; a combined verdict item checks both". Proposals row of 10 Oct (Intake assistant, retainer draft, item 2): "`agent/retainer:draft` is one key for two acts of different weight … an intake copy of the Case Officer role should not carry approve-for-send. Merge (2) with the case document's two-document-keys row above into one 'split keys by act' note to SA-06." `case-assistant.md` §9 G-29; `intake-assistant.md` §9 GI-19. AIW-D54 item 6 ("no AI text in the retainer") rests on approve-for-send being the consultant's own act.

**(5) Knock-ons.** AG-07 §10 (L1042), AG-09 §10 (L764) and AG-05 §10 and AG-5-17 follow the split (CN-AG-07, CN-AG-09, CN-AG-05). Appendix B gains a row for the new key; Appendix C counts are recounted.

---

## 4. Open question: the key for proposing values for a lead with no case

**(1) What it changes.** SA-06 v3.1 §13 (a new open question after item 11, L1120).

**(2) Current words.** None. §13 ends at item 11 (L1120), closed.

**(3) Proposed words.**
> 12. **Accepting a fact for a lead who has no case** *(new — Workstream 2)*. "Done on behalf of client" uses the item's own permission (AG17-D74; SA-6-22), which for a case is `agent/case:edit`. For a lead with no case no key is named; AG-03 says running the Qualifier "today rides on `agent/prospect:edit`". Name the key, without a new key if possible.

**(4) Why.** Proposals row of 10 Oct (Intake assistant, "A profile value proposed from a lead's message is accepted, never verified … For a **lead with no case** the key is Unknown (AG-03 v1.4 §10: running the Qualifier 'today rides on `agent/prospect:edit`'); the team names it in Step 3 without a new key if possible"). `intake-assistant.md` §9 GI-4, GI-5. SA-6-22 (L459) already records "'Done on behalf of client' = the item's own permission (AG17-D74)".

**(5) Knock-ons.** AG-03 §10 and AG-08 (CN-AG-03, CN-AG-08) once the key is named.
