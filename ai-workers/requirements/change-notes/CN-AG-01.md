# CN-AG-01: change note to AG-01 Firm Setup and Onboarding

| Field | Value |
|---|---|
| Module changed | AG-01 Firm Setup & Onboarding |
| Version and file | v1.16 of 8 Oct 2026, `02-functional-requirements/agent/AG-01-firm-setup-and-onboarding_v1.16_2026-10-08.md` (Drive snapshot of 9 Oct 2026; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-1-68 (AG-1-67, added in v1.16 at L419, is the highest in use; the note at L23, "New requirements continue from AG-1-67", predates it) |
| Companion files | AW-01 (the delegation record); CN-AG-11 item 7; CN-AG-13 item 2 |

**In plain words.** An AI assistant works for one named person, with part of that person's permissions, and has no login, role or permission of its own (FD-16, kept by the founder). Two consequences belong in this module: an assistant takes no seat, and when a person is deactivated or suspended, every assistant working for them stops.

**Terms used.** *Delegation*: the record of which AI assistant works for which named person, with which subset of that person's permissions, on which files, from when until when (AW-01; AIW-D33).

---

## 1. An AI assistant's delegation takes no seat

1. **Where.** AG-1-13 (L393).
2. **Current words.**
   > L393: "**Active users and pending invitations** SHALL count toward the plan's **seat limit** (`maxUsers`), enforced **server-side** at invite and reactivation; a cancelled or expired invitation SHALL free its seat; **deactivated and deleted users SHALL NOT count** (their seat is freed at once); **suspended users SHALL keep their seat**;"
3. **Proposed words.** Add to AG-1-13: "An AI assistant's delegation (AW-01) SHALL NOT count toward the seat limit and SHALL NOT be a user: it has no login, no role and no permission of its own (FD-16). How assistant work is charged is set by the plan (SA-03, SA-04) and is decided after the Step 5 conversations; for the pilot it rides inside the plan with usage measured."
4. **Why.** AIW-D33 (the founder: a delegation record with "no identity and no permissions of its own" is consistent with FD-16); IMP-1 rule 3 ("a delegation **takes no seat**"); `proposals.md` row of 9 Oct (W2 catalogue, role twins: "a twin takes no seat"); AIW-D60 (pilot charging: "the others ride inside the plan for the pilot, usage measured").
5. **Knock-ons.** SA-03 SA-3-41 seat count (Super Admin half); the charge unit stays open (`00-step2-decisions.md` §5 item 1).

## 2. Deactivating or suspending a person ends the delegations that work for them

1. **Where.** §6 FirmUser lifecycle rows ACTIVE → SUSPENDED (L539) and ACTIVE → DEACTIVATED (L541); new requirement **AG-1-68**.
2. **Current words.**
   > L541: "| FirmUser | ACTIVE | DEACTIVATED | **not the last admin** (BR-5) | **revoke all sessions immediately**; block login; **free the seat**; remove from lead/case pools and booking-host lists; automations stop assigning/notifying (AG1-D4); history kept as "(Inactive) Name"; handover prompt (AG1-D5); AuditLog |"
   >
   > L539: "| FirmUser | ACTIVE | SUSPENDED | **not the last admin** (BR-5, AG1-D15) | **revoke all sessions immediately**; block login; **keeps seat** (AG1-D2, D3); AuditLog |"
3. **Proposed words.**
   > **AG-1-68 (delegations end with the person's access).** Deactivating or suspending a user SHALL end, at once and audited, every AI assistant delegation that works for that user (AW-01); an assistant run under such a delegation SHALL stop at its next safe point. The handover prompt (AG1-D5) SHALL NOT move a delegation to another person. Reactivating the user SHALL NOT restore a delegation; the person accepts a new one (AW-01).

   Both lifecycle rows add "AI assistant delegations working for this user end (AG-1-68)".
4. **Why.** IMP-1 rule 4 (a delegation "ends by itself when the person is deactivated or suspended (the same rule that stops automations acting for a deactivated user, AG-11-45, AG1-D4)") and rule 1 (it takes effect only when the person accepts it); AIW-D33; the "delegation ended" stop rule in `firm-assistant.md` §1 and `case-assistant.md` §9 G-5 (IMP-35). Not restoring on reactivation follows AG-01's own rule that reactivation "does not restore pools, host lists or work" (L542).
5. **Knock-ons.** AG-11 runs stop (AW-01 run record); items such a delegation already prepared are handled as AG-11-55 says for a deactivated owner; AG-13 audit (CN-AG-13 item 2).
