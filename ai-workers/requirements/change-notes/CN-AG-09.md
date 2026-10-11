# CN-AG-09: change note to AG-09 Document Management

| Field | Value |
|---|---|
| Module changed | AG-09 Document Management |
| Version and file | v1.8 of 7 Oct 2026, `02-functional-requirements/agent/AG-09-document-management_v1.8_2026-10-07.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`, unchanged since 9 Oct; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (fix round after review S3c) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-9-54 (highest AG-9-53, L553) |
| Companion files | CN-AG-07 (items 1, 2, 6); CN-AG-11 (item kinds `DOCUMENT_TYPE`, `UPLOAD_VERDICT`, `KEY_DATE`; action `propose_key_date`); CN-AG-18 item 2; CN-SA-06 change 3 |

**In plain words.** The founder read FD-16 on 11 Oct: a document type the Reader proposes is an internal, reversible filing label, not an "effect", so one day high-confidence types may be applied without a click; until the measured accuracy sets that threshold, every type still goes to a person. The founder also kept FD-15, which is about this module: Restricted fields in document data are encrypted and masked with an audited reveal. Two team fixes follow: one rule for which permission key covers which act on a document (status acts are this module's), and the same approval rule for a key date wherever it is read from.

**Terms used.** *Envelope encryption*: each value is encrypted with its own key, which is itself encrypted. *Signed URL*: a short-lived link that lets one person fetch one file once checked. *Idempotent*: doing the same thing twice has the effect of doing it once.

---

## 1. Document types: not an "effect", but no type is applied without a person until a threshold is set from measured accuracy

1. **Where.** AG-9-11 (L484); §13 item 10 (L883).
2. **Current words.**
   > L484: "classification is an internal filing action, so by default (`AUTO`, AG11-D1) a high-confidence type is applied and labelled "set by Reader" with its confidence, and any user who can edit the document can change it; a low-confidence type goes to Needs you instead. A firm may raise classification to `APPROVE`."
   >
   > L883: "10. **Reader confidence thresholds** *(NEW v1.4)*. What confidence counts as "low" for a type suggestion or an extracted value (flag vs offer)? Not decided."
3. **Proposed words.** Add to AG-9-11: "*(11 Oct 2026, the founder — AIW-D71)* Applying a proposed type is an internal, reversible, audited filing label and is not an "effect" under FD-16, so high-confidence types MAY be applied without a person's click once a threshold is set. **No proposed type SHALL be applied without a person's confirmation until the platform publishes, for that document type, a confidence threshold set from measured accuracy** (IMP-30); until then every proposed type SHALL go to a person as a document-type approval item (AG-11 item kind `DOCUMENT_TYPE`, CN-AG-11 item 6). Values read from a document SHALL always need a person (AG11-D10; AG-9-45)." §13 item 10 adds: "For types, decided by AIW-D71: the threshold is set from measured accuracy (the pilot's figures)."
4. **Why.** AIW-D71 (the founder, 11 Oct: "Not an effect, but after the pilot … **in the pilot every type still goes to a person**, and the pilot's accuracy figures set the threshold (IMP-30). Values read from documents always need a person (AG11-D10)"); IMP-13; IMP-30; `case-assistant.md` §9 G-32. The product rule names a state the product can see (no published threshold) instead of "the pilot" (review S3c m-10).
5. **Knock-ons.** AG-11 §3.10 and §13 Q11 (the default "everything to review" stands until a threshold is published); AG-14 measures record the accuracy (CN-AG-14 item 2); AG-18-33 imported documents follow the same rule; AW-1-120.

## 2. Which key covers which act on a document

1. **Where.** §10 `agent/document:request` (L763), `agent/document:change-status` (L764), `agent/document:waive` (L768); AG-07 v2.7 §10 `agent/case:document-manage` (AG-07 L1042).
2. **Current words.**
   > L763: "| `agent/document:request` | exists* | Request documents from the client |"
   >
   > L764: "| `agent/document:change-status` | exists* | Verify / reject / move status |"
   >
   > L768: "| `agent/document:waive` | **NEW** | Waive / mark Not-Applicable (reason; audited) |"
   >
   > AG-07 L1042: "| `agent/case:document-manage` | **NEW** | Add/request/approve/reject Binder documents |"
3. **Proposed words.** Status acts are this module's, under this module's keys (AG-9-35 owns document state):
   > | `agent/document:change-status` | exists* | Verify or reject a document (reject needs a reason, AG-9-27); move status. *(changed — one home for status acts)* |
   > | `agent/document:waive` | **NEW** | Waive a document or mark it Not-Applicable (reason; audited), on a case's Binder or anywhere else *(changed — one home for status acts)* |
   > | `agent/document:request` | exists* | Request documents from the client for a document that is not on a case's Binder (a client's or prospect's own documents). On a case's Binder, request and re-request are AG-07's `agent/case:document-manage` *(changed)* |

   A combined upload-verdict item (AG-11 item kind `UPLOAD_VERDICT`, CN-AG-11 item 6) SHALL check, line by line, the key each act needs: `agent/document:change-status` or `agent/document:waive` for the status, `agent/case:document-manage` for a Binder request or an ad-hoc item. AG-07's side is CN-AG-07 item 6.
4. **Why.** `00-step3-plan.md` "Keys (S3c M-3)" ("document status acts including waive and not-applicable sit under AG-09's keys (AG-9-35 owns document state); Binder request and add sit under `agent/case:document-manage`"); `proposals.md` rows of 10 Oct (Case assistant: "Two permission keys cover overlapping acts on an upload verdict … the status transition (Received → Verified / Rejected / Waived) is `agent/document:change-status`; the Binder acts … are `agent/case:document-manage`; a combined verdict item checks both") and of 11 Oct (three keys overlap); `case-assistant.md` §9 G-29. The plan's rule keeps waive and Not-Applicable on this module's existing `agent/document:waive` rather than moving them into `agent/document:change-status`; the request split for non-Binder documents is a Proposal for the team to confirm. A decision for the team.
5. **Knock-ons.** CN-AG-07 item 6 (AG-7-16 and the AG-07 §10 row); SA-06 §10b (CN-SA-06 change 3 needs the same split; its current proposal puts waive under `agent/document:change-status`, raised to the Lead); key defaults sit in the published starter roles (SA6-D12).

## 3. Restricted document data: encrypted, masked, audited reveal (FD-15 kept)

1. **Where.** §10 withdrawn reveal row (L777); §10 honesty note (L755); new requirement **AG-9-54**.
2. **Current words.**
   > L777: "| `agent/document:reveal-pii` | ~~NEW~~ **withdrawn — AG7-D10** | No reveal action: personal data is never masked |"
3. **Proposed words.**
   > **AG-9-54 (Restricted document data).** Document metadata fields and extracted values whose class is in the B-1 Restricted list SHALL be envelope-encrypted and masked by default on every surface, and revealed only to a user who holds the platform reveal permission and can see the document, every reveal audited before the value is shown (FD-15; Doc 1 v1.3 §7.2; AG-07 AG7-D15 as proposed in CN-AG-07). File bytes stay encrypted at rest and served only by signed URL (FD-15; AG-9-16, AG-9-18). An AI model never receives a Restricted value from this module except the Reader reading the document itself, whose output stays by reference (AG-9-48; IMP-21).

   The §10 row returns as a pointer to the one platform reveal permission named by SA-06 (Doc 1 v1.3 §7.2 names `agent/pii:reveal`).
4. **Why.** AIW-D58 (the founder: "Keep FD-15"); FD-15 (Founder Decisions Log v1.5 L40: "**B-1-derived rule** — metadata fields whose canonical class is in the B-1 Restricted list get envelope-encryption + masked audited reveal; binaries SSE + signed-URL"); README §0 rule 11; IMP-21 (the Reader is the one exception, its output by reference). **Provisional until counsel reads it**; counsel confirms B-1 before any Restricted field is stored (AIW-D58, AIW-D64, AIW-D68).
5. **Knock-ons.** CN-AG-07 item 1 (AG7-D15, platform-wide); BR-9 audit adds the reveal event (CN-AG-13 item 4).

## 4. A key date proposed from any source is approved under AG-9-51's rule

1. **Where.** AG-9-51 (L550); BR-21 (L579).
2. **Current words.**
   > L550: "A proposed date SHALL be **registered with the Minder** (as a key date on the file, AG-11-47) **only after a person approves it** (or edits then approves it) in the review view; approval SHALL need the same permission as adding that key date by hand and, as for every Reader value, `agent/sqr:verify` (AG-9-45)."
3. **Proposed words.** Add to AG-9-51: "The same rule SHALL apply to a key date proposed from an imported note's text (AG-18-93, as proposed in CN-AG-18 item 2) or derived by a rule (AG-11 `propose_key_date`, CN-AG-11 item 3; item kind `KEY_DATE`): it reaches the Minder only after a person approves it, with the same permissions, never inferred, and registered once per file and date." BR-21's title "A date from a letter" becomes "A proposed date".
4. **Why.** `proposals.md` row of 10 Oct (Firm assistant, item (3): "an action and an item kind *key date*, approved under AG-9-51's rule (the permission for adding the date by hand plus `agent/sqr:verify`), registered with the Minder only after approval"); `firm-assistant.md` §9 G-4.
5. **Knock-ons.** AG-11 `KEY_DATE` (CN-AG-11 item 6).

---

## Not changed here (pointers only)

- This module's status list (AG-9-26) becomes the one list for the case file (CN-AG-07 item 2); no change here.
- The Reader proposes the document type, not the Sorter (AG-9-42 already says so); AG-10 and AG-11 are aligned (CN-AG-10 item 2, CN-AG-11 item 2).
