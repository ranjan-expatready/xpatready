# CN-AG-08: change note to AG-08 Smart Questionnaire

| Field | Value |
|---|---|
| Module changed | AG-08 Smart Questionnaire (SQR) |
| Version and file | v1.7 of 7 Oct 2026, `02-functional-requirements/agent/AG-08-smart-questionnaire_v1.7_2026-10-07.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`, unchanged since 9 Oct; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (fix round after review S3c) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | §13 item 12 (highest item 11, L727); no new AG-8 requirement number (AG-8-25 and AG-8-37 are reworded; the highest is AG-8-47, L421) |
| Companion files | CN-AG-07 item 1 (Restricted fields, AG7-D15); CN-AG-11 item 3 (the `read_text` action); CN-SA-06 (§13 item 12, the key); AW-01 v0.1 (the Intake assistant) |

**In plain words.** An assistant may read a lead's or client's message and propose an answer ("I have two children"). A person accepts it, but a message is not evidence: the fact stays unverified, entered by staff on the client's behalf, with the message as its basis. The permission for accepting such an answer on a lead who has no case yet is not named anywhere; the roles document (SA-06) asks the team to name it, and this module points there. And passport and financial numbers go back to "masked, with an audited reveal" (FD-15 kept).

Quotations below are word for word; where the source text itself contains quotation marks, the quotation is given without outer marks.

---

## 1. A value accepted from a message is recorded as entered on the client's behalf and stays unverified

1. **Where.** AG-8-25 (L389); §7 `AnswerProvenance` (L507).
2. **Current words.**
   > L389: An answer entered by staff on the client's behalf (AG-15-44) SHALL carry the provenance **"entered by staff on the client's behalf"** with who and when.
   >
   > L507: `source` (SELF_DECLARED/STAFF/STAFF_ON_BEHALF/DOC_VERIFIED/READER_APPROVED/IMPORT — *STAFF_ON_BEHALF* = entered by staff on the client's behalf, with `enteredByUserId` and `enteredAt`; NEW v1.3.
3. **Proposed words.** Add to AG-8-25: "A value an AI assistant proposed from a message the client or lead wrote (AW-01; AG-11 `read_text`, CN-AG-11 item 3) SHALL, once a person accepts it, carry `source = STAFF_ON_BEHALF` with the accepting person as `enteredByUserId`, `verificationStatus = UNVERIFIED`, and the message as its basis. Accepting it SHALL NOT verify it: only AG-8-26 (against a document) or AG-8-44 (a Reader value with its document region) verifies." `AnswerProvenance` gains `basisMessageId?` (the message a person accepted the value from; name to assign). The approval item is `PROFILE_VALUE` with `verifiesValue = false` (AG-11 §7).
4. **Why.** `proposals.md` row of 10 Oct (Intake assistant: "A profile value proposed from a lead's message is accepted, never verified … acceptance records the fact with `source = STAFF_ON_BEHALF` … and `verificationStatus` UNVERIFIED … the message as the basis"); IMP-26 rule 2 (values are checked against the product, not the text); `intake-assistant.md` §9 GI-4.
5. **Knock-ons.** The Filler uses only verified values (AG-7-60), so an accepted message value never reaches a form until verified; the Qualifier reads it as unverified; AG-11 `ApprovalItem` (CN-AG-11 item 6; no new item kind needed).

## 2. The key that accepts a proposed answer on a lead with no case: a pointer to SA-06

1. **Where.** "Applied from AG-17" row AG17-D66 / D74 (L52); §13, new item **12**.
2. **Current words.**
   > L52: "Done on behalf of client": answers entered by staff are marked with who and when; no new permission
3. **Proposed words.**
   > **12. Accepting a proposed answer on a lead with no case.** AG17-D74 says the item's own permission applies (on a case, `agent/case:edit`). For a lead with no case no key is named; the question is asked once, in SA-06 §13 (CN-SA-06), which owns the keys; this module follows its answer.
4. **Why.** `proposals.md` row of 10 Oct (Intake assistant: "For a **lead with no case** the key is Unknown … the team names it in Step 3 without a new key if possible"); `intake-assistant.md` §9 GI-5; review S3c m-17 (one home for the question: SA-06 owns keys).
5. **Knock-ons.** SA-06 (CN-SA-06 §13 item 12); AG-03 §10.

## 3. Restricted fields are masked with an audited reveal (FD-15 kept)

1. **Where.** AG-8-37 (L407); BR-17; §10 withdrawn reveal rows.
2. **Current words.**
   > L407: Personal data (passport numbers, financial figures, admissibility answers) SHALL **never be masked**: anyone allowed to see a response sees its data in full on screens, lists, search, exports, reports, audit viewers, import previews and support views, and there is no reveal action.
3. **Proposed words.** "Fields in the B-1 Restricted list (counsel confirms the list before any is stored; it is expected to include passport and financial numbers) SHALL be masked by default with an audited reveal, as AG-07's AG7-D15 says (CN-AG-07 item 1; FD-15). Other personal data in a response is shown in full to anyone allowed to see the response." The rest of AG-8-37 (no personal data in logs or traces; no passport or financial numbers in message content; exports audited) stays.
4. **Why.** AIW-D58 (the founder, 11 Oct: "Keep FD-15"); FD-15 (Founder Decisions Log v1.5 L40); README §0 rule 11. **Provisional until counsel reads it** (AIW-D64, AIW-D68).
5. **Knock-ons.** CN-AG-07 item 1 lists the platform-wide knock-ons; §13 item 8 (spouse privacy) is unaffected.
