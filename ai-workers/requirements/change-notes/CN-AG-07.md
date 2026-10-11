# CN-AG-07: change note to AG-07 Case Core and Delivery

| Field | Value |
|---|---|
| Module changed | AG-07 Case Core & Delivery |
| Version and file | v2.7 of 7 Oct 2026, `02-functional-requirements/agent/AG-07-case-core-and-delivery_v2.7_2026-10-07.md` (Drive snapshot of 9 Oct 2026; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-7-93 (highest AG-7-92, L722); §13 item 25 (highest item 24, L1190) |
| Companion files | AW-01 (firm AI assistants, Step 3 item A); CN-AG-08, CN-AG-09, CN-AG-11, CN-AG-13 |

**In plain words.** Four founder decisions of 11 Oct land in this module: personal data in the Restricted class goes back to "masked, with an audited reveal" (FD-15 kept); the case officer's acceptance of an assistant's readiness report is the submission for internal review; FD-5's form filling stays in version 1 and the team is asked for the route and a date; and the AI writing tool is now called the Writer. Two team-level fixes follow from the Step 2 reviews: one document-status list (AG-09's), and the preparer of a form an assistant prepared is the person it worked for.

**Terms used.** *AI assistant* and *delegation*: an assistant working for one named person with a subset of that person's permissions (AW-01; FD-16; AIW-D33, D36). *Writer*: the AI Doer that drafts text for a person to approve (AIW-D53). *Restricted fields*: the B-1 list of the most sensitive personal data (for example passport and financial numbers), which counsel confirms before any is stored.

---

## 1. Restricted fields are masked by default with an audited reveal (FD-15 kept)

1. **Where.** Decision row AG7-D10 (L220); AG-7-88 (L718); §9 sensitive-fields edge case (L979); §10 withdrawn reveal row (L1054); §13 item 17 (L1181).
2. **Current words.**
   > L220: "**No masking and no reveal of personal data anywhere** — "unnecessary functionality to build". Anyone allowed to see a record (AG7-D5) sees its personal data in full on screens, lists, search, exports, reports, audit views and import previews. No reveal action, no reveal or unmask permission: every `*:reveal-pii` key, `agent/firm:reveal-credential` and `agent/pii:export-unmasked` are withdrawn."
   >
   > L718: "Personal data SHALL NOT be masked on the client screen, list, search or export; no reveal step exists (changed same day — AG7-D10)."
   >
   > L1054: "| `agent/case:reveal-pii` | ~~NEW~~ **withdrawn v2.3 (AG7-D10)** | No masking or reveal exists; users who may see the case see its data in full |"
3. **Proposed words.** AG7-D10 is amended (new decision row, number to assign, citing AIW-D58):
   > **Restricted fields are masked; other personal data is shown in full.** Fields in the B-1 Restricted list of the Founder Decisions Log (counsel confirms the list before any Restricted field is stored) SHALL be encrypted, and SHALL be masked by default on every screen, list, search result, export, report, audit view and import preview; the cleartext SHALL be shown only to a user who holds the reveal permission and can see the record, and every reveal SHALL be audited before the value is shown (FD-15; Doc 1 v1.3 §7.2). All other personal data stays as AG7-D10 says: shown in full to anyone allowed to see the record. The rules kept by AG7-D10 stay (no passport or financial number in system logs, traces, emails, WhatsApp messages or notifications; secrets write-only; encryption at rest).

   AG-7-88, replacing the quoted sentence: "Restricted fields SHALL be masked on the client screen, list, search and export, and revealed only under the reveal permission with an audit entry (AG7-D10 as amended); other personal data SHALL NOT be masked." §10: the reveal row returns as one platform reveal permission named by SA-06 (Doc 1 v1.3 §7.2, L2063, names `agent/pii:reveal`), not one key per module. §9 L979 and §13 item 17 are reworded to match.
4. **Why.** AIW-D58 (the founder, 11 Oct: "Keep FD-15 … the team brings AG-07 (AG7-D10) back to it … counsel confirms the Restricted list (B-1) before any is stored. The AI sees status only, either way"); FD-15 (Founder Decisions Log v1.5 L40: "metadata fields whose canonical class is in the B-1 Restricted list get envelope-encryption + masked audited reveal"); Doc 1 v1.3 §7.2 (L2055: "masked by default in every UI/API surface, and revealable only with an explicit permission whose every use is audited"); README §0 rule 11 (a module file never overrides a founder decision); `proposals.md` row of 10 Oct (Practice expert, two Restricted-field models). Behaviour: `practice-expert.md` §9 G-6; `case-assistant.md` §9 G-17. **Provisional until counsel reads it** (AIW-D58, AIW-D64, AIW-D68).
5. **Knock-ons.** AG7-D10 was applied platform-wide, so the same amendment reaches AG-02 (AG-2-49a, AG-2-51), AG-03 §11, AG-05 §11, AG-06 §11, AG-08 (CN-AG-08 item 3), AG-09 (CN-AG-09 item 3, FD-15's own subject), AG-10 §10, AG-13 `AuditLog` (CN-AG-13 item 4), AG-14 exports, AG-16-20 and AG-16-34 exports, AG-17 inspection pack (AG17-D42 shows candidate names in full; whether any candidate field is Restricted is counsel's), AG-18 previews; SA-06 (the reveal key) and SA-11 (the Restricted register) in the Super Admin half. An AI assistant never receives a Restricted value, only its status (IMP-21; AW-01).

## 2. One document-status list: AG-09's

1. **Where.** §3.4 (L434); AG-7-15 (L626); BR-4 (L731); BR-30 (L757); AG7-D14 (L226); AG-7-63 (L691).
2. **Current words.**
   > L434: "**`PENDING`** (expected, not yet requested or provided) · **`REQUESTED`** (asked of the client) · **`UPLOADED`** (provided, awaiting check) · **`UNDER_REVIEW`** (being checked) · **`APPROVED`** (checked and accepted) · **`REJECTED`** (provided but unacceptable — with a reason, re-requested) · **`NOT_APPLICABLE`** (doesn't apply to this case or applicant — with a reason). This is the one document-status vocabulary used throughout this document (AG-7-15, §6, §7)."
3. **Proposed words.** §3.4: "Each requirement carries the per-document status that AG-09 owns (AG-9-26; AG-09 §3.9 and §6: Required, Requested, Uploaded, Received, Verified, Rejected, Waived, Not-Applicable, Superseded, Quarantined). AG-07 keeps no status list of its own (AG-9-35; AG-09 BR-15)." AG-7-15: "a **status** read from AG-09 (AG-9-26)". Where AG-07 names a status, read AG-09's word: `APPROVED` → Verified; `UPLOADED` → Uploaded or Received; `UNDER_REVIEW` → Received; `NOT_APPLICABLE` → Not-Applicable; `PENDING` → Required; and Waived returns. In BR-4, BR-30, AG7-D14 and AG-7-63 ("documents land as `UPLOADED`, never `APPROVED`") the words follow. How a Waived document counts in the readiness score (BR-30) is the team's to state.
4. **Why.** `proposals.md` row of 10 Oct (Case assistant, "Settle one document-status vocabulary for the case file … Recommendation: AG-09's, because AG-9-35 makes AG-9 the owner of document state"); `case-assistant.md` §9 G-23 (the readiness report, the chase stop condition and the reviewer must read one status). A decision for the team; this note gives the recommended form.
5. **Knock-ons.** AG-11-76 (the chase stops on "Received", already AG-09's word); AG-08 must-verify-before-filing view; AG-14 deficiency and readiness metrics; the readiness report of AW-01.

## 3. The officer's acceptance of an assistant's readiness report is the submission for internal review

1. **Where.** §3.6 readiness view (L498); §10 `agent/case:review-submit` (L1047); new requirement **AG-7-93**.
2. **Current words.**
   > L498: "The view composes with the **review** flow: ready → submit-for-internal-review → reviewer approves (with the deficiency findings, the passed warnings and a checklist in hand) → submit; reviewer rejects → back to in-process with reasons."
   >
   > L1047: "| `agent/case:review-submit` | **NEW** | Submit a case for internal review |"
3. **Proposed words.**
   > **AG-7-93 (readiness report accepted = submitted for review).** Where an AI assistant working for a case officer has prepared a readiness report for a case (AW-01; one Needs you item per file, AG-11 item kind `READINESS_REPORT` as proposed in CN-AG-11), the officer's acceptance of the report under `agent/case:review-submit` SHALL be the case's submit-for-internal-review (§3.6): one act, recorded once. The reviewer's approval or rejection of the review round under `agent/case:review-approve` SHALL stay a separate act. Value lines inside the report SHALL still need `agent/sqr:verify` (AG-7-60). In a firm where one person holds both keys, that person accepts the report (submits) and then approves the round: two different acts, each recorded.
4. **Why.** AIW-D54 (the founder confirmed the Lead's call: "readiness report by rule, the officer's acceptance is the submission for review"); `proposals.md` row of 10 Oct (Case assistant, readiness report approval); IMP-34 (one item per file); `case-assistant.md` §9 G-4, G-25.
5. **Knock-ons.** AG-11-112(a) (CN-AG-11 item 6); the approve-all safeguards (AIW-D57, provisional until counsel) are AW-01's; whether a prepared-file meter ticks on this acceptance is decided after the Step 5 conversations (AIW-D60; `00-step2-decisions.md` §5 item 1), so SA-03 is not changed now.

## 4. FD-5 stands: the team gives the form-filling route for IRCC forms and a date

1. **Where.** §13 item 22 (L1188); new §13 item **25**.
2. **Current words.**
   > L1188: "22. **Release scope of the Filler, Deficiency Library, four-eyes / Team safeguards, several filings and the board — founder.** The spec keeps them in Release 1; SCOPE-TRIAGE (5 Oct) proposes Release 2 for each, undecided."
3. **Proposed words.** Add to item 22: "*(11 Oct 2026, the founder — AIW-D43):* FD-5 stands for the Filler: flattened-overlay form filling is in version 1 (see item 25)." New item:
   > **25. Government form filling route and date — the team (AIW-D43).** FD-5 decides flattened-overlay support in version 1 (coordinate-mapped fill and the field-map visual editor). The team states (a) the technical route by which the Filler fills IRCC's current form format with that overlay, and (b) a delivery date. Until the route exists, the pilot runs without automated form filling and says so; AG-7-59 and AG-7-65 to AG-7-68 are unchanged.
4. **Why.** AIW-D43 (the founder: "Keep FD-5, ask the team … Until it exists the pilot runs without form filling and says so; the Form Preparer duty (W-05) stays specified"); FD-5 (Founder Decisions Log v1.5 L30: "**Flattened-overlay support in v1** (coordinate-mapped fill + FormFieldMap visual editor)"); README §0 rule 11 (SA-01B's later parking of box maps does not override FD-5); `proposals.md` row of 9 Oct (carve-out B, the Filler's release); `case-assistant.md` §9 G-13.
5. **Knock-ons.** SA-01B (SA1B-D28, box maps parked) in the Super Admin half; AG-11 `run_filler` (CN-AG-11 item 3) waits on the route; Charter edits are the founder's (AIW-D65).

## 5. The preparer of a form an AI assistant prepared is the person it worked for

1. **Where.** AG-7-66 (L694); AG-7-65 (L693); §9 edge case (L994).
2. **Current words.**
   > L694: "`FormInstance` SHALL carry `preparedByUserId` (the user who started the Filler or edited the draft before sending it for approval; **null only when an automation ran the Filler**)"
   >
   > L693: "There is **no preparer only when an automation ran the Filler** *(revised same day — review fixes)*: such a draft MAY be approved by any holder of `agent/case:form-approve`."
3. **Proposed words.** AG-7-66: "`FormInstance` SHALL carry `preparedByUserId` (the user who started the Filler or edited the draft before sending it for approval; **where an AI assistant ran the Filler under a person's delegation, that person**, with the delegation recorded in `preparedByDelegationId`; **null only when a plain firm automation with no delegation ran the Filler**)". AG-7-65: "There is **no preparer only when a plain firm automation with no delegation ran the Filler**: such a draft MAY be approved by any holder of `agent/case:form-approve`; a draft an AI assistant prepared is the delegating person's for four-eyes." §9 L994 follows.
4. **Why.** AIW-D33 (the founder: "the named person the persona worked for counts as the preparer for four-eyes"); IMP-1 ("replacing "counts as no person" for worker-prepared items; the Filler rule stays for plain automations"); `case-assistant.md` §9 G-6 ("recorded on the form draft's own preparer field (AG-7-66 change note)").
5. **Knock-ons.** AG-11 `ApprovalItem.preparedBy` and AG-11-81 (CN-AG-11 item 7); AG-16-44 wording.

## 6. The Filler is not an AI Doer; the AI writer is the Writer

1. **Where.** BR-7 (L734); BR-23 (L750); AG11-D4 applied row (L40).
2. **Current words.**
   > L734: "**BR-7 is the rule all AI Doers follow** (Filler, Reader, Sorter, Drafter, Checker — AG11-D4, BR-23): unreadable or missing is flagged, never guessed."
   >
   > L750: "Every AI Doer working on a case — the Filler's auto-fill, the Reader, the Sorter, the Drafter, the Checker — produces a **proposal with provenance and confidence**"
3. **Proposed words.** BR-7: "**BR-7 is the rule the Filler follows, and every AI Doer follows it too** (Reader, Sorter, Writer, Checker — AG11-D4, BR-23): unreadable or missing is flagged, never guessed. The Filler is rule-based, is not an AI Doer and is outside the AI switch." BR-23: "Every AI Doer working on a case — the Reader, the Sorter, the Writer, the Checker — produces a **proposal with provenance and confidence** … No AI sets a value on a form at fill time; the Filler fills only from verified values (AG-7-60)." In the AG11-D4 row (L40) "Drafter" reads "Writer".
4. **Why.** IMP-25 ("Reword BR-23 … the Filler stays rule-based and outside the AI switch"), relied on by `case-assistant.md` §1.6 and §3 ("AI stays out of the fill path (SA1B-D16; SA-1B-35; IMP-25)"); AIW-D53 (Writer).
5. **Knock-ons.** CN-AG-11 item 1 (the rename); the agent glossary.

---

## Not changed here (pointers only)

- Onboarding on `case.created` (§3.2, L391) already matches the proposed AG-11 seed (CN-AG-11 item 10); only the list of onboarding messages needs one wording across the two files.
- `case.submitted` and `case.decided` (§3.9, L576) become Conductor triggers in AG-11 (CN-AG-11 item 4); no change here.
- The two overlapping document keys (`agent/case:document-manage` here, L1042, and AG-09's `agent/document:change-status`) are handled in CN-AG-09 item 2, with the wording for this module's §10 row.
- Adopting a newer pack version stays "one click, no reason, audited" (BR-21); SA-01 is aligned in the Super Admin half.
