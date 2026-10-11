# CN-AG-09: change note to AG-09 Document Management

| Field | Value |
|---|---|
| Module changed | AG-09 Document Management |
| Version and file | v1.8 of 7 Oct 2026, `02-functional-requirements/agent/AG-09-document-management_v1.8_2026-10-07.md` (Drive snapshot of 9 Oct 2026; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-9-54 (highest AG-9-53, L553) |
| Companion files | CN-AG-07 (items 1, 2; the §10 row of `agent/case:document-manage`); CN-AG-11 (item kinds `DOCUMENT_TYPE`, `KEY_DATE`; action `propose_key_date`); CN-AG-18 item 2 |

**In plain words.** The founder read FD-16 on 11 Oct: a document type the Reader proposes is an internal, reversible filing label, not an "effect", so one day high-confidence types may be applied without a click; but in the pilot every type still goes to a person, and the pilot's accuracy figures will set the threshold. The founder also kept FD-15, which is about this module: Restricted fields in document data are encrypted and masked with an audited reveal. Two team fixes follow: one rule for which permission key covers which act on a document, and the same approval rule for a key date wherever it is read from.

---

## 1. Document types: not an "effect", but every type goes to a person in the pilot

1. **Where.** AG-9-11 (L484); §13 item 10 (L883).
2. **Current words.**
   > L484: "classification is an internal filing action, so by default (`AUTO`, AG11-D1) a high-confidence type is applied and labelled "set by Reader" with its confidence, and any user who can edit the document can change it; a low-confidence type goes to Needs you instead. A firm may raise classification to `APPROVE`."
   >
   > L883: "10. **Reader confidence thresholds** *(NEW v1.4)*. What confidence counts as "low" for a type suggestion or an extracted value (flag vs offer)? Not decided."
3. **Proposed words.** Add to AG-9-11: "*(11 Oct 2026, the founder — AIW-D71)* Applying a proposed type is an internal, reversible, audited filing label and is not an "effect" under FD-16, so high-confidence types MAY later be applied without a person's click. **In the pilot every proposed type SHALL go to a person** as a document-type approval item (AG-11 item kind `DOCUMENT_TYPE`, as proposed in CN-AG-11 item 6). After the pilot, the confidence above which a type is applied without a click SHALL be set from the pilot's measured accuracy. Values read from a document SHALL always need a person (AG11-D10; AG-9-45)." §13 item 10 adds: "For types, decided by AIW-D71: the pilot's accuracy figures set the threshold."
4. **Why.** AIW-D71 (the founder, 11 Oct: "Not an effect, but after the pilot … **in the pilot every type still goes to a person**, and the pilot's accuracy figures set the threshold (IMP-30). Values read from documents always need a person (AG11-D10)"); IMP-13; IMP-30; `case-assistant.md` §9 G-32 (no item kind for a document type).
5. **Knock-ons.** AG-11 §3.10 and §13 Q11 (the default "everything to review" stands for the pilot); AG-14 measures (CN-AG-14 item 2) record the accuracy; AG-18-33 imported documents follow the same rule.

## 2. Which key covers which act on a document

1. **Where.** §10 `agent/document:change-status` (L764); AG-07 v2.7 §10 `agent/case:document-manage` (AG-07 L1042); AG-7-16 (AG-07 L627).
2. **Current words.**
   > L764: "| `agent/document:change-status` | exists* | Verify / reject / move status |"
   >
   > AG-07 L1042: "| `agent/case:document-manage` | **NEW** | Add/request/approve/reject Binder documents |"
3. **Proposed words.** AG-09 §10: "| `agent/document:change-status` | exists* | The verdict on a document's status: verify, reject with a reason (AG-9-27), move status. A combined upload-verdict item (AW-01) checks this key, and also `agent/case:document-manage` (AG-07) for any Binder act in the same item |". AG-07 §10: "| `agent/case:document-manage` | **NEW** | Binder acts on a case: add an ad-hoc required document (AG-7-16), request or re-request a document, mark a pack document not-applicable with a reason (AG-7-16). The status verdict itself is AG-09's `agent/document:change-status` |".
4. **Why.** `proposals.md` row of 10 Oct (Case assistant: "Two permission keys cover overlapping acts on an upload verdict … Recommended split: the status transition (Received → Verified / Rejected / Waived) is `agent/document:change-status`; the Binder acts (request, re-request, add an ad-hoc item, not applicable) are `agent/case:document-manage`; a combined verdict item checks both"); `case-assistant.md` §9 G-29. A decision for the team.
5. **Knock-ons.** SA-06 §10b (Super Admin half; merged there into one "split keys by act" note). Found while checking: this module's own `agent/document:request` (L763) and `agent/document:waive` (L768, "Waive / mark Not-Applicable") cover the same Binder acts, so three keys overlap, not two; the team settles all three together (raised to the Lead as a `proposals.md` row).

## 3. Restricted document data: encrypted, masked, audited reveal (FD-15 kept)

1. **Where.** §10 withdrawn reveal row (L777); §10 honesty note (L755); new requirement **AG-9-54**.
2. **Current words.**
   > L777: "| `agent/document:reveal-pii` | ~~NEW~~ **withdrawn — AG7-D10** | No reveal action: personal data is never masked |"
3. **Proposed words.**
   > **AG-9-54 (Restricted document data).** Document metadata fields and extracted values whose class is in the B-1 Restricted list SHALL be envelope-encrypted and masked by default on every surface, and revealed only to a user who holds the platform reveal permission and can see the document, every reveal audited before the value is shown (FD-15; Doc 1 v1.3 §7.2). File bytes stay encrypted at rest and served only by signed URL (FD-15; AG-9-16, AG-9-18). An AI model never receives a Restricted value from this module except the Reader reading the document itself, whose output stays by reference (AG-9-48; IMP-21).

   The §10 row returns as a pointer to the one platform reveal permission named by SA-06 (Doc 1 v1.3 §7.2 names `agent/pii:reveal`).
4. **Why.** AIW-D58 (the founder: "Keep FD-15"); FD-15 (Founder Decisions Log v1.5 L40: "**B-1-derived rule** — metadata fields whose canonical class is in the B-1 Restricted list get envelope-encryption + masked audited reveal; binaries SSE + signed-URL"); README §0 rule 11; IMP-21 (the Reader is the one exception, its output by reference). **Provisional until counsel reads it**; counsel confirms B-1 before any Restricted field is stored (AIW-D58, AIW-D64, AIW-D68).
5. **Knock-ons.** CN-AG-07 item 1 (platform-wide amendment of AG7-D10); BR-9 audit adds the reveal event (CN-AG-13 item 4).

## 4. A key date proposed from any source is approved under AG-9-51's rule

1. **Where.** AG-9-51 (L550).
2. **Current words.**
   > L550: "A proposed date SHALL be **registered with the Minder** (as a key date on the file, AG-11-47) **only after a person approves it** (or edits then approves it) in the review view; approval SHALL need the same permission as adding that key date by hand and, as for every Reader value, `agent/sqr:verify` (AG-9-45)."
3. **Proposed words.** Add to AG-9-51: "The same rule SHALL apply to a key date proposed from an imported note's text (AG-18, as proposed in CN-AG-18 item 2) or derived by a rule (AG-11 `propose_key_date`, as proposed in CN-AG-11 item 3): it reaches the Minder only after a person approves it, with the same permissions, never inferred, and idempotent per file and date."
4. **Why.** `proposals.md` row of 10 Oct (Firm assistant, item (3): "an action and an item kind *key date*, approved under AG-9-51's rule (the permission for adding the date by hand plus `agent/sqr:verify`), registered with the Minder only after approval"); `firm-assistant.md` §9 G-4.
5. **Knock-ons.** AG-11 `KEY_DATE` (CN-AG-11 item 6); BR-21 wording ("A date from a letter") widens to "A proposed date".

---

## Not changed here (pointers only)

- This module's status list (AG-9-26) becomes the one list for the case file (CN-AG-07 item 2); no change here.
- The Reader proposes the document type, not the Sorter (AG-9-42 already says so); AG-10 and AG-11 are aligned (CN-AG-10 item 2, CN-AG-11 item 2).
