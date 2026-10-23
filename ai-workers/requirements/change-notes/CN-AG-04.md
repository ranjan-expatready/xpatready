# CN-AG-04: change note to AG-04 Consultation and Booking

| Field | Value |
|---|---|
| Module changed | AG-04 Consultation & Booking |
| Version and file | v1.5 of 7 Oct 2026, `02-functional-requirements/agent/AG-04-consultation-and-booking_v1.5_2026-10-07.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`, unchanged since 9 Oct; line numbers below are that file's) |
| Current base (15 Oct 2026, snapshot 1535; scrum 4b outcome 0 (e)) | **AG-04 v1.5**, `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/agent/AG-04-consultation-and-booking_v1.5_2026-10-07.md`: byte-identical to the 11 Oct copy quoted here, so every quote and line number below stands. |
| Date of this note | 11 Oct 2026 (fifth fix round, after convergence check S3c-e) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-4-56 (highest AG-4-55, L534) |
| Companion files | CN-AG-05 change 2 (no AI text in a retainer; the fee snapshot's designation); CN-AG-06 change 1 (FD-17, the records that carry a funds designation); CN-AG-11 change 4 (the five `appointment.*` events become Conductor triggers) and change 6 (`INTERNAL_NOTE_DRAFT`); CN-AG-13 change 3 (the same AI-drafted mark); AW-01 (the Intake AI) |

**In plain words.** The retainer's scope and fee must come only from what a person typed (the founder confirmed "no AI text in the retainer" on 11 Oct). Today the consult record has no field for the scope, only free notes, which an assistant may help draft. This note gives the scope its own person-entered field, says the notes never feed the retainer, and gives the notes the AI-drafted mark when an assistant drafted them. It also gives the quoted fee a trust-or-operating designation field, because the founder's FD-17 names "quote" among the client-money records that must carry one; how that designation is resolved and pinned is the team's.

---

## 1. A person-entered scope field on the consult record; notes never feed the retainer

1. **Where.** §7 `ConsultRecord` (L611); §3.12 (L395–L401); new requirement **AG-4-56**.
2. **Current words.**
   > L611: "**`ConsultRecord`** *(NEW — seam to AG-5)* — `id`, `firm_id`, `bookingId`, `prospectId?`/`caseId?`, `attended` (bool), `actualDurationMins?`, `notes`, `recommendedPathwayIds[]`/`recommendedServiceIds[]`, `quotedFeeAmount?`, `quotedFeeCurrency?`, `nextStep` (`SEND_RETAINER|NEEDS_DOCS|NOT_PROCEEDING|OTHER`), `nextStepReason?`, `proposalId?` (once Drafter launched), `completedByUserId`, `createdAt`."
   >
   > L401: "This record is the **clean seam to AG-5**: one click ("Create proposal from consult") launches the **Drafter** pre-filled with the recommended services + fee, which the **Signer** sends for e-signature"
3. **Proposed words.** `ConsultRecord` gains a scope field typed by the host (proposed name `scopeSummary`; the team names it), and `notesAiDrafted` (bool) with `notesAiRunId?`, set when the notes were accepted from an assistant's draft. New requirement:
   > **AG-4-56 (what feeds the retainer).** The retainer's scope and fee (AG-05 §3.2) SHALL be taken only from fields a person entered on the consult record — the scope field, `recommendedServiceIds[]`, `quotedFeeAmount` and `quotedFeeCurrency` — never from `notes`. No assistant SHALL write the scope, services or fee fields. An assistant's draft of the consult notes SHALL reach `notes` only when the host accepts it (AG-11 item kind `INTERNAL_NOTE_DRAFT`, CN-AG-11 change 6); notes so accepted SHALL stay internal and SHALL carry the AI-drafted mark (`notesAiDrafted`), shown wherever the notes are shown.

   ("Drafter" in L401 is the retainer template engine and stays.)
4. **Why.** AIW-D54 (the founder confirmed: "no AI text in the retainer"); `proposals.md` row of 10 Oct (Intake AI, item (1): "the persona never drafts the consult record's scope, services or fee fields; the host enters them by hand … No source today names which consult-record field feeds `{{scope.summary}}` (`ConsultRecord` has no scope field)"); IMP-11 (the AI-written marker on every artefact; the mark needs a home on this record because `notes` is a field, not an AG-13 Note, review S3c m-16); AW-1-42 (AIW-D54 call 6); `00-step3-plan.md` "AI-drafted internal notes with no approval" (every AI-drafted internal note goes to a person until the founder answers).
5. **Knock-ons.** AG-05 AG-5-56 (CN-AG-05 change 2); AG-4-50 hand-off carries the new field; AG-13-69 (CN-AG-13 change 3) is the same mark on a Note.

## 2. The quoted fee carries a funds designation field (FD-17 (a))

1. **Where.** §7 `ConsultRecord` (L611: `quotedFeeAmount?`, `quotedFeeCurrency?`); §3.12 "Quoted fee (optional)" (L398); AG-04 §13 (new question).
2. **Current words.**
   > L398: "**Quoted fee (optional):** a fee/currency the consultant quoted, carried to the Drafter."
3. **Proposed words.** `ConsultRecord` gains `quotedFeeDesignation?` (name for the team): the pack-resolved funds designation code of the quoted fee (in Canada `TRUST` or `OPERATING`; A22-4), entered by the person with the quoted fee and required whenever a quoted fee is entered. L398 reads: "**Quoted fee (optional):** a fee/currency the consultant quoted, with its funds designation (FD-17), carried to the Drafter." No assistant SHALL set it (AW-1-39).

   New AG-04 §13 question for the team (next free item number, to be assigned by the team): "**Resolving and pinning the quote's designation.** A22-6.1 binds "Every case, retainer, invoice, payment and client record" to a responsible practice unit, and A22-6.2 pins a record at the moment it becomes legally operative (invoice issue, retainer signature); neither names a consult record, and a lead may have no binding. The team states which practice unit resolves the quote's designation (the client's, or for a lead the firm's default) and when, if ever, it is pinned."
4. **Why.** FD-17 (Founder Decisions Log v1.5 L53: "a mandatory `fundsDesignation` (TRUST \| OPERATING) on every client-money record — quote, retainer, deposit, invoice line, payment, refund"); AIW-D72 ("Keep FD-17 in full"); A22-4 (L104: the "entity carries a pack-resolved designation code"); A22-6.1 (L117); A22-6.2 (L120); CN-AG-06 change 1 maps "quote" to this record; `00-step3-plan.md` "One home per rule" (a field lives in its own module's change note) and "Trust accounting belongs to the team" (the field only; its resolution and pin are the team's design); reviews S3c-c k-4, S3c-d m-9 and S3c-e m-7. **Proposal** for the field name; counsel question 9.
5. **Knock-ons.** CN-AG-05 change 2 (the retainer fee snapshot carries its own designation); CN-AG-06 change 1 (the mapping table points here).

---

## Not changed here (pointers only)

- The five events of AG-4-47 (`appointment.scheduled|rescheduled|cancelled|no_show|completed`) are already emitted "to the Conductor"; AG-11 adds them to its trigger list (CN-AG-11 change 4).
- Consultation refunds follow FD-13 and AG-04's own §3.10 in Release 1, unchanged; the wider refund question (money returned from trust) is CN-FDL open point 6 and AG-06 §13 item 11 (h) (CN-AG-06 change 6).
- Two gaps from the 10 Oct intake design have no decision, improvement or `proposals.md` row behind them and are not written: whether the Scheduler's confirmation and reminder sends carry an autonomy level (GI-21), and whether a booking moves a lead to the Consult stage (GI-13). Listed for the Lead. Either way, those sends pass the lead check of AG-11-116 (CN-AG-11 change 13), which covers every automatic send.
