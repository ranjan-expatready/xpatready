# CN-AG-01: change note to AG-01 Firm Setup and Onboarding

| Field | Value |
|---|---|
| Module changed | AG-01 Firm Setup & Onboarding |
| Version and file | v1.18 of 10 Oct 2026, `02-functional-requirements/agent/AG-01-firm-setup-and-onboarding_v1.18_2026-10-10.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (fourth fix round, after re-check S3c-d) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | none (the changes add to AG-1-13 and to the lifecycle rows; the highest requirement is AG-1-67, L423, and the module's note at L25, "New requirements continue from AG-1-67", predates it) |
| One home | The delegation itself (who may set it up, accept it, end it) is AW-01's (AW-1-5 to AW-1-12); the seat rule is SA-03's (SA-3-41, as changed by CN-SA-03). This note holds only the pointer from AG-01's own seat rule and what AG-01's user lifecycle must say. |
| Companion files | AW-01; CN-SA-03 (the seat rule); CN-AG-11 change 6 (waiting items cancelled when a delegation ends); CN-AG-13 change 2 |

**In plain words.** An AI assistant works for one named person, with part of that person's permissions, and has no login, role or permission of its own (FD-16, kept by the founder). Two consequences touch this module: an assistant takes no seat (the plan document holds that rule; this module points to it), and when a person is deactivated or suspended, every assistant working for them stops. Only the person, or their deactivation or suspension, ends a delegation; nobody else can.

**What the team changed on 10 Oct (v1.17, v1.18).** Starter roles are now data Expat Ready publishes in Super Admin, not fixed in code (SA6-D12; AG-1-17, AG-1-18, AG-1-20, AG-1-61), and MFA and custom roles are never plan features. Neither affects these two changes: a delegation's permissions are taken from the person's roles as they stand at the moment of each action (AW-1-10), whatever starter role those roles came from. Nothing proposed here was already made.

**Terms used.** *Delegation*: the record of which AI assistant works for which named person, with which subset of that person's permissions, on which files, from when until when (AW-01 §7; AIW-D33).

---

## 1. An AI assistant's delegation takes no seat: AG-1-13 points to the seat rule

1. **Where.** AG-1-13 (L397).
2. **Current words.**
   > L397: "**Active users and pending invitations** SHALL count toward the plan's **seat limit** (`maxUsers`), enforced **server-side** at invite and reactivation; a cancelled or expired invitation SHALL free its seat; **deactivated and deleted users SHALL NOT count** (their seat is freed at once); **suspended users SHALL keep their seat**;"
3. **Proposed words.** Add to AG-1-13: "What counts toward the seat limit is SA-03's rule (SA-3-41); as changed by CN-SA-03, it excludes an AI assistant's delegation, which is not a user (FD-16)."
4. **Why.** AIW-D33 (the founder: a delegation record with "no identity and no permissions of its own" is consistent with FD-16); IMP-1 rule 3 ("a delegation **takes no seat**"); `00-step3-plan.md` "One home per rule"; review S3c-b n-4 (the seat rule was written in two notes; SA-3-41 is the seat count's home, and AG-1-13 points to it). Behaviour: AW-1-3, AW-1-12.
5. **Knock-ons.** SA-3-41 (CN-SA-03, Super Admin half) holds the sentence; how assistant work is charged is set by the plan (SA-03, SA-04; AIW-D60).

## 2. Deactivating or suspending a person ends the delegations that work for them

1. **Where.** §6 FirmUser lifecycle rows ACTIVE → SUSPENDED (L543), SUSPENDED → ACTIVE (L544), ACTIVE → DEACTIVATED (L545), DEACTIVATED → ACTIVE (L546).
2. **Current words.**
   > L545: "| FirmUser | ACTIVE | DEACTIVATED | **not the last admin** (BR-5) | **revoke all sessions immediately**; block login; **free the seat**; remove from lead/case pools and booking-host lists; automations stop assigning/notifying (AG1-D4); history kept as "(Inactive) Name"; handover prompt (AG1-D5); AuditLog |"
   >
   > L543: "| FirmUser | ACTIVE | SUSPENDED | **not the last admin** (BR-5, AG1-D15) | **revoke all sessions immediately**; block login; **keeps seat** (AG1-D2, D3); AuditLog |"
   >
   > L544: "| FirmUser | SUSPENDED | ACTIVE | admin action (seat already held) | restore login; AuditLog |"
3. **Proposed words.** The ACTIVE → DEACTIVATED and ACTIVE → SUSPENDED rows each add the side effect "every AI assistant delegation working for this user ends, audited (AW-1-11); items it prepared that are still waiting are cancelled with the reason *delegation ended* (AG-11, CN-AG-11 change 6)". The handover prompt (AG1-D5) SHALL NOT move a delegation to another person. The SUSPENDED → ACTIVE and DEACTIVATED → ACTIVE rows add "does not restore a delegation; the person accepts a new one (AW-1-6)".
4. **Why.** `00-step3-plan.md` "Emergency stop (one rule, all documents)" ("A delegation ends only when its person ends it or is deactivated or suspended"), "Waiting items, one rule per stop reason" ("a delegation ended by its person, deactivation or suspension = its waiting items are cancelled with that reason (AG-11-61) and stay visible in the audit") and "No one stops another person's delegation"; IMP-1 rule 4 (a delegation "ends by itself when the person is deactivated or suspended (the same rule that stops automations acting for a deactivated user, AG-11-45, AG1-D4)") and rule 1 (it takes effect only when the person accepts it); AIW-D33. For deactivation, not restoring follows AG-01's own row, "does not restore pools, host lists or work" (L546). For suspension the AG-01 row says only "restore login" (L544), so not restoring a delegation after a suspension is a choice, labelled **Proposal** (review S3c m-5; the stale pointer to an AW-01 open question is removed, review S3c-d m-11).
5. **Knock-ons.** AG-11 item cancellation (CN-AG-11 change 6, `cancelReason = DELEGATION_ENDED`); AG-13 audit (CN-AG-13 change 2); the delegation's own states are AW-01's (§7 `Delegation.endReason`).
