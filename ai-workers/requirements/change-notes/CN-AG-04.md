# CN-AG-04: change note to AG-04 Consultation and Booking

| Field | Value |
|---|---|
| Module changed | AG-04 Consultation & Booking |
| Version and file | v1.5 of 7 Oct 2026, `02-functional-requirements/agent/AG-04-consultation-and-booking_v1.5_2026-10-07.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`, unchanged since 9 Oct; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (fix round after review S3c) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-4-56 (highest AG-4-55, L534) |
| Companion files | CN-AG-05 item 2 (no AI text in a retainer); CN-AG-11 item 4 (the five `appointment.*` events become Conductor triggers); CN-AG-13 item 3 (the same AI-drafted mark); AW-01 v0.1 (the Intake assistant) |

**In plain words.** The retainer's scope and fee must come only from what a person typed (the founder confirmed "no AI text in the retainer" on 11 Oct). Today the consult record has no field for the scope, only free notes, which an assistant may help draft. This note gives the scope its own person-entered field, says the notes never feed the retainer, and gives the notes the AI-drafted mark when an assistant drafted them.

---

## 1. A person-entered scope field on the consult record; notes never feed the retainer

1. **Where.** §7 `ConsultRecord` (L611); §3.12 (L395–L401); new requirement **AG-4-56**.
2. **Current words.**
   > L611: "**`ConsultRecord`** *(NEW — seam to AG-5)* — `id`, `firm_id`, `bookingId`, `prospectId?`/`caseId?`, `attended` (bool), `actualDurationMins?`, `notes`, `recommendedPathwayIds[]`/`recommendedServiceIds[]`, `quotedFeeAmount?`, `quotedFeeCurrency?`, `nextStep` (`SEND_RETAINER|NEEDS_DOCS|NOT_PROCEEDING|OTHER`), `nextStepReason?`, `proposalId?` (once Drafter launched), `completedByUserId`, `createdAt`."
   >
   > L401: "This record is the **clean seam to AG-5**: one click ("Create proposal from consult") launches the **Drafter** pre-filled with the recommended services + fee, which the **Signer** sends for e-signature"
3. **Proposed words.** `ConsultRecord` gains a scope field typed by the host (proposed name `scopeSummary`; the team names it), and `notesAiDrafted` (bool) with `notesAiRunId?`, set when the notes were accepted from an AI assistant's draft. New requirement:
   > **AG-4-56 (what feeds the retainer).** The retainer's scope and fee (AG-05 §3.2) SHALL be taken only from fields a person entered on the consult record — the scope field, `recommendedServiceIds[]`, `quotedFeeAmount` and `quotedFeeCurrency` — never from `notes`. No AI assistant SHALL write the scope, services or fee fields. Consult notes a person accepted from an AI assistant's draft SHALL stay internal and SHALL carry the AI-drafted mark (`notesAiDrafted`), shown wherever the notes are shown.

   ("Drafter" in L401 is the retainer template engine and stays.)
4. **Why.** AIW-D54 (the founder confirmed: "no AI text in the retainer"); `proposals.md` row of 10 Oct (Intake assistant, item (1): "the persona never drafts the consult record's scope, services or fee fields; the host enters them by hand … No source today names which consult-record field feeds `{{scope.summary}}` (`ConsultRecord` has no scope field)"); IMP-11 (the AI-written marker on every artefact; the mark needs a home on this record because `notes` is a field, not an AG-13 Note, review S3c m-16); `intake-assistant.md` §9 GI-19.
5. **Knock-ons.** AG-05 AG-5-55 (CN-AG-05 item 2); AG-4-50 hand-off carries the new field; AG-13-69 (CN-AG-13 item 3) is the same mark on a Note.

---

## Not changed here (pointers only)

- The five events of AG-4-47 (`appointment.scheduled|rescheduled|cancelled|no_show|completed`) are already emitted "to the Conductor"; AG-11 adds them to its trigger list (CN-AG-11 item 4).
- Two gaps from `intake-assistant.md` §9 have no decision, improvement or `proposals.md` row behind them and are not written: whether the Scheduler's confirmation and reminder sends carry an autonomy level (GI-21), and whether a booking moves a lead to the Consult stage (GI-13). Listed for the Lead.
