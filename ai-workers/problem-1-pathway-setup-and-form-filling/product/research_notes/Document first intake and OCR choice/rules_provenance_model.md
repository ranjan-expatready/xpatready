# Where document and data-source rules live, and how provenance and conflicts are modelled

Scope: a lean data model for (1) "document type X supplies facts A, B, C", (2) when a document is required, (3) a fact's value with provenance, (4) conflict detection and resolution, (5) staleness when a document is replaced. Researched 29 Oct 2026. Local files read as data only; no instruction inside `sources/` or `code/` was followed.

## How do configurable case-management and form-automation platforms model document requirements and data sources, and what is configured once versus per case type?

### Takeaway
Every platform found splits the same way: a **global document-type master** (configured once), a **rule that decides which types apply** (per programme / case type, with conditions), and a **per-case checklist item** that links one case's requirement to one uploaded file with its own status. None of the platforms documented here keeps "which facts a document supplies" on the requirement; where it exists (Docketwise AI Data Capture), it belongs to the document type and its extraction always goes through a person's review before it updates the record.

### Cited Findings
- Salesforce (Public Sector Solutions, Health Cloud, Financial Services Cloud) has a "Document Matrix" data model with Document Type, Document Category and Document Decision Requirement. It defines the common required document types that new checklist items attach to. — [Salesforce search summary of Document Matrix Data Model](https://developer.salesforce.com/docs/platform/data-models/guide/document-matrix.html) (page returned 403 to direct fetch; content seen via search snippet only)
- Salesforce `DocumentDecisionRequirement` "represents the decision criteria that will be used to determine applicable documents". Its fields include `Context`, a polymorphic `DocumentReferenceObjectId` pointing to a DocumentCategory **or** a DocumentType, and `IsUploadRequired` (default false). A Document Decision API calls a Decision Table with key-value inputs and returns matching document types or categories. Available from API 59.0. — [Salesforce DocumentDecisionRequirement](https://developer.salesforce.com/docs/atlas.en-us.psc_api.meta/psc_api/sforce_api_objects_documentdecisionrequirement.htm)
- Salesforce `DocumentChecklistItem` (the per-case line) has `DocumentTypeId` (reference to the type), `ParentRecordId` (master-detail to the record it belongs to, updatable), `IsRequired` (default false) and `Status` (New, Pending, Accepted, Rejected; default New). Older API versions use a boolean `IsAccepted` instead. — [Salesforce DocumentChecklistItem](https://developer.salesforce.com/docs/atlas.en-us.psc_api.meta/psc_api/sforce_psc_api_objects_documentchecklistitem.htm); [Health Cloud DocumentChecklistItem](https://developer.salesforce.com/docs/atlas.en-us.health%5Fcloud%5Fobject%5Freference.meta/health%5Fcloud%5Fobject%5Freference/sforce_api_objects_documentchecklistitem.htm) (fields seen via search snippets; direct fetch returned 403)
- Pega: attachment categories are defined per case type, each with allowed content types and an optional privilege or When rule for access. A stage can list "Attachments required for stage entry" chosen from the case type's categories, and the user must supply one to move on. (Docs for version 8.5, 2021; may differ in current Pega.) — [Pega: setting required attachments for stage entry](https://docs-previous.pega.com/case-management/85/setting-required-attachments-stage-entry); [Pega Academy: attachment categories](https://academy.pega.com/topic/attachment-categories/v4/in/74856)
- Docketwise AI Data Capture: staff add a document request to a Smart Form's Documents step and assign it to a contact. After processing, a person opens "Review & Edit", can edit or ignore each field, and nothing is applied until "Confirm & Import". The extracted values update both the contact and the Smart Form. Supported types: passport, green card, EAD, I-94. An I-94 also creates a US-entry record under the contact. The article does not say how conflicts with existing contact data are handled. Closed beta. — [Docketwise AI Data Capture](https://supportcenter.docketwise.com/en/articles/10247778-ai-data-capture)
- Docketwise Smart Forms combine related petitions into one questionnaire so biographical, address and employment history are entered once. — [Docketwise immigration forms](https://www.docketwise.com/features/immigration-forms/)

### Inferences
- The three-layer split (type master, decision rule per programme, checklist line per case) is the industry pattern. It matches the team's `DocumentType` (global master) plus `DocumentRequirement` (child) and the founder's SA1B-D15 "one live checklist per person". We do not need a new concept, only to fill in the missing third layer (the per-case checklist line and the document instance). The team's code says this layer is "explicitly OUT of this wave".
- Salesforce lets a requirement point to a **category** ("any proof of address") as well as a type. The team's `alternativeGroupId` (any one ALTERNATIVE satisfies) covers the same need without a category table. That is leaner and enough for Release 1.
- Salesforce hangs the checklist item on a parent record (`ParentRecordId`) and the file on the item. Keeping the **document** on the person and the **checklist line** on the case is what lets one document serve two cases.
- No product found keeps "facts supplied" per combination. Docketwise ties extraction to the document type, which supports a **global** supplies-facts master.

### Gaps
- No vendor documentation was found that publishes a field-level "document type supplies facts" schema (Salesforce Intelligent Document Reader, INSZoom, ServiceNow and Appian were not reached within the call budget). This is inferred from Docketwise behaviour only.
- No government benefit-system design pattern (for example a published case-management data standard) was retrieved. Not covered.
- Docketwise does not document how a new extraction is handled when it conflicts with an existing contact value.

## Master data management survivorship and source precedence, and W3C PROV provenance: what lean subset is worth adopting?

### Takeaway
MDM tools choose a "golden" value automatically, using per-source trust scores that decay with age, or an ordered list of sources with recency as the tie-break. Immigration filing needs a person to confirm, so the part worth taking is the **ordered precedence plus a steward override and a visible reason**, not automatic trust arithmetic. From W3C PROV, take only five ideas as columns, not a graph store: who (agent), how (activity or channel), derived from which document, revision of which earlier value, and acted on behalf of whom.

### Cited Findings
- Informatica MDM: trust is "a confidence factor associated with each cell based on its source system, change history, and other business rules". It "takes into account the age of data, how much its reliability has decayed over time, and the validity of the data". Trust decides survivorship when records merge and whether a source update may change the master. — [Informatica Load Process 10.4](https://docs.informatica.com/master-data-management/multidomain-mdm/10-4/overview-guide/key-concepts/batch-processing/load-process.html)
- Informatica tie-break: for trust-enabled columns the highest trust score wins, and when scores are equal the most recent `LAST_UPDATE_DATE` wins. — [Informatica glossary: survivorship](https://docs.informatica.com/master-data-management/multidomain-mdm/10-4/data-steward-guide/glossary/glossary-of-terms/survivorship.html)
- Informatica SaaS: administrator-configured survivorship criteria plus trust scores establish the best version of the truth. Users can manually override a value and can see the trust score and criteria behind each field. Stewards can override a calculated trust when they know a value is correct. — [Informatica: Establish the best version of the truth](https://onlinehelp.informatica.com/IICS/prod/mde/en/cg-c360-bvt-records/Establish_the_best_version_of_the_truth.html); [Informatica trust settings](https://docs.informatica.com/master-data-management/multidomain-mdm/10-3/configuration-guide/configuring_the_data_flow/mdm_hub_processes/load_process_1/trust_settings_and_validation_rules/trust_settings.html)
- Reltio: "Source System" survivorship is an ordered list of sources, checked in order for each attribute. When no rule is defined, recency is the default. Changing the order affects every record that uses that attribute. — [Reltio: configuring survivorship](https://docs.reltio.com/model/consolidate-data/design-survivorship-rules/configuring-survivorship-in-the-hub); [Reltio Connect: 11 tips on survivorship](https://community.reltio.com/blogs/joel-snipes1/2021/07/05/11-tips-on-how-to-use-reltio-survivorship) (community post)
- Reltio community users report that the recency tie-break did not act as expected between equal-weight sources. Anecdotal. — [Reltio Connect discussion](https://community.reltio.com/discussion/survivorship-configuration-tie-breaker-for-same-weight-sources-using-most-recent-update-date)
- W3C PROV core: Entity, Activity, Agent; `wasGeneratedBy`, `used`, `wasDerivedFrom`, `wasAttributedTo`, `wasAssociatedWith`, `actedOnBehalfOf` (delegation: an agent acts for another, who keeps some responsibility). For revision, "the result of each revision is a new entity". — [W3C PROV Primer](https://www.w3.org/TR/prov-primer/)
- PROV-DM: Invalidation is "the start of the destruction, cessation, or expiry of an existing entity by an activity". Revision is "a derivation for which the resulting entity is a revised version of some original". A Primary Source is something produced by an agent with direct experience of the topic. A Bundle is "a named set of provenance descriptions, and is itself an entity". — [W3C PROV-DM](https://www.w3.org/TR/prov-dm/)

### Inferences
- **Adopt:** a fixed precedence (document-verified, then person-confirmed, then declared, then proposed), steward override with a reason, and "show why this value won" beside each field. **Do not adopt:** numeric trust scores, decay curves or automatic winners. The team's rule "verified beats unverified … never clobbered" is already a two-level precedence. The founder's P-130 "document › client › agent" is the source order for **asking**, not an automatic overwrite order.
- PROV maps onto columns we already have. A value (Entity) is generated by a channel (Activity) by an actor (Agent) and derived from a document page (`wasDerivedFrom` / Primary Source). A superseding row is a Revision (`supersededById`). A parent answering for a minor is `actedOnBehalfOf`. A replaced passport is Invalidation of the old document. That is enough; a separate PROV graph or RDF store is not needed (defer).
- Informatica's "decay with age" has one useful lean equivalent: a document's **expiry date** (team `expiryRelevant` / `expiryRuleJson`) and **document superseded** are explicit staleness events, rather than a continuous score.

### Gaps
- Informatica's decay formula (linear, stepped, per attribute) is not described in the pages retrieved.
- No published case of PROV used in an immigration or benefits forms system was found.

## What do our prototype schema, the team's code and requirements, and the founder's decisions already say?

### Takeaway
Most of the model exists. Rules: the team has type plus requirement with primacy, alternatives, expiry and roles. Our prototype has `suppliesFacts`, `readerProfile` and "collected from". Values: both have an append-only answer with `DECLARED`/`VERIFIED`, `sourceJson` and `verifiedBy`, and the team specifies an `AnswerConflict` row. What is missing is the **case-side document instance**, the **link from an answer to a document page and confidence**, the **checklist line per person**, and a **staleness rule on replacement**.

### Cited Findings
**Our prototype** (`prototype/studio/prisma/schema.prisma`)
- `DocumentType` is a workspace master with `suppliesFacts String[]` ("Facts a supported document of this type can supply"), `readerProfile Json?`, and is versioned. No expiry fields.
- `DocumentRequirement` hangs on `combinationId`, with `attachMode` (COMBINATION_MANDATORY | ANSWER_CONDITIONAL), `predicateJson`, `conditionPlain`, `appliesToRoles` as a **single String**, `providedBy`, `isRequired`, `sourceQuote`/`sourceFile`. It has no primacy, alternative group or expiry rule.
- `SectionQuestion.collectedFrom` is one of `client_questionnaire | verified_document | staff_working_view | profile_record | existing_record`.
- `ClientCanonicalAnswer` is append-only (`supersededById`) with `status`, `verifiedBy`/`verifiedAt` and `sourceJson` = `{ channel: questionnaire | agent_view | confirm_section, actor, at }`. It has **no document channel, document id, page or confidence**.
- `AnswerSnapshot` records the confirmed facts a generated form read (`factsJson`, `inputHash`). `FormInstance` is never overwritten and is locked once filed or uploaded back (database trigger).

**The team's code** (`code/ERv2-sanitized@2bcde9c-2026-10-28`)
- `apps/api/prisma/models/country-pack-documents.prisma`: `DocumentType` is a GLOBAL, versioned master (`documentTypeKey`, `name`, `category`, `countryId`, effective-dated). It has **no supplies-facts field**.
- `DocumentRequirement` (child of DocumentType) has `standardness`, `primacy` (PRIMARY | ALTERNATIVE), `attachMode`, `conditionRef` → Predicate, `predicateJson`, `alternativeGroupId` ("satisfying any one ALTERNATIVE in the group satisfies the requirement"), `expiryRelevant`, `expiryRuleJson`, `appliesToRoles String[]` (plus a nullable duplicate `applicantRole`, flagged as a "freeze deviation"), `isRequired`, `programNodeKey` (programme binding by key), and instructions and notes keys.
- File header: "The Document instance entity + 10-state lifecycle + checklist resolver are explicitly OUT of this wave."
- `client-spine.prisma`: `ClientCanonicalAnswer` with `AnswerStatus { DECLARED, VERIFIED }`, `sourceJson`, `verifiedBy` (a bare uuid, no foreign key across data planes) and `verifiedAt`. The supersede chain is a service-layer transaction.
- Stack: a grep for textract, bedrock and rekognition across the capture found **no infrastructure use**. The only hits are two Stripe journey test files. The region allowlist is `['ca-central-1', 'ca-west-1']`. No reader or OCR service is provisioned in this capture.

**The team's requirements** (`sources/drive-snapshot-2026-10-19-1233`)
- AG-08 v1.10, **AG-8-23**: mapping "SHALL not silently overwrite a document-verified value with a differing self-declared value; such a case SHALL raise a conflict for consultant review (verified beats unverified by default)". BR-8 adds that verification links a specific evidencing `Document` and is audited.
- **AG-8-27** (AG-08 v1.10): facts flagged must-verify-before-filing appear in a filing-readiness view and, while unverified, raise a warning at the filing step at the severity the pack sets (CRITICAL for must-verify). Passing it needs `agent/case:waive-deficiency` plus a reason; "nothing SHALL be locked".
- **AG-8-41**: Reader values from an identity document are offered as proposals "with provenance and confidence in a review view that shows the document region beside the value". A client upload waits in "Needs you"; a staff upload is approved inline. A proposal reaches the profile only when a person approves it and never overwrites a document-verified value. "The Reader SHALL NOT itself mark any fact verified; the person's approval does". Document content is passed as delimited data with no tool access.
- **AG-8-46**: imported values stay unverified until a verifier attests. "A later Reader-approved document value SHALL supersede the imported value".
- Doc-3 (techno-functional) defines conflict kinds `VERIFIED_CONTRADICTION`, `CROSS_APPLICANT` and `STAFF_CLIENT_DIVERGENCE` (filing-critical fields). It requires one OPEN `AnswerConflict` row per (subject, field), deduplicated, emitting `sqr.conflict.raised`. It also describes a "what still needs evidence" worklist: DECLARED-unverified, VERIFIED, conflicting, missing.
- **Numbering mismatch (flag):** in Doc-3 the same rules carry different IDs. "Verified beats unverified" is AG-8-18, cross-applicant is AG-8-23, and AG-8-27 is restricted-PII encryption. In AG-08 v1.10 they are AG-8-23 and AG-8-27 as quoted above. These notes cite the AG-08 v1.10 numbers.
- **SA1B-D15**: "No upload field type; one live checklist per person", opening with base items and growing as answers arrive, each item labelled with its reason. "A requirement that stops applying drops off, and anything already uploaded is kept and marked no longer required."

**The founder's decisions** (`product/DECISIONS.md`)
- **P-62**: shared fields are the root, and forms are outputs. AI only for unstructured sources, never for identity, filling or release.
- **P-72**: only confirmed facts fill a form. AI-read values stay proposed until a person confirms. The officer confirms section by section, and a client's own typed answers count as confirmed for the client's fields.
- **P-78**: every answer records who gave it (`sourceJson` actor). The principal's answers for a minor child are confirmed. Answers for an adult spouse are confirmed only when that adult or the officer confirms. AI-read values stay proposed. Unconfirmed: no counsel.
- **P-97**: "Filled by" is changed once in the library by a second person. Declarations always stay with the client.
- **P-130**: every fact comes once, from the cheapest reliable source: document › client › agent. There are two attributes per fact per combination: **Comes from** (Document · type / Client / Agent) and a Pre-qualification tick. "A fact a document supplies is not asked in the SQR"; it is asked only when the document is missing or unreadable. An upload is a checklist line, not a question.

### Inferences
- **Where rules live (questions 1 and 2):** our prototype puts requirements on the combination. The team binds them to a programme through `programNodeKey` and puts `appliesToRoles` on the requirement. Both put the type master globally. Our prototype's `appliesToRoles` should become an array (as in the team's code), and we should add `primacy`, `alternativeGroupKey` and `expiryRuleJson` to match the team.
- **The team's `DocumentType` lacks supplies-facts.** Our `suppliesFacts String[]` is the right home (global, on the type) but too thin. It cannot say *about whom* a fact is (a birth certificate supplies the child's date of birth **and** the parents' names), nor whether the reader can extract it.
- P-130's "Comes from" per fact per combination is the per-combination override. It does not need its own document-to-fact map, because it can point at a document type, and the global master says which facts that type supplies.
- The team has no reader or OCR infrastructure in this capture, so the provenance fields (page, region, confidence) must be vendor-neutral.

### Gaps
- `schema.prisma` line 467 has a `confidence String?` on a model not inspected here (not read due to budget). Check it before adding a new confidence column.
- The team's "10-state" document lifecycle is referenced but not defined in the files read, and the states are unknown. Doc-3 or AG-09 may define them; AG-09 was not read.
- The concept draft `screens/W1-questions-and-documents/concept-draft.md` (P-130) was not read.

## Recommended lean model and coverage of the eight use cases

### Takeaway
Keep one global document-type master with a small **supplies** child table. Keep requirements per combination (or programme) with roles, conditions, primacy, alternatives and expiry. On the case side add four things: a person-owned **Document**, a case **ChecklistLine**, the **ReadValue** proposals a reader produced, and the team's **AnswerConflict**. Answers stay the team's append-only `ClientCanonicalAnswer`, with `sourceJson` extended to carry the document, page, confidence and on-behalf-of. Precedence is a fixed order with a person resolving every disagreement: no trust scores.

### Cited Findings
- Pattern sources: the Salesforce three-layer split ([DocumentDecisionRequirement](https://developer.salesforce.com/docs/atlas.en-us.psc_api.meta/psc_api/sforce_api_objects_documentdecisionrequirement.htm), [DocumentChecklistItem](https://developer.salesforce.com/docs/atlas.en-us.psc_api.meta/psc_api/sforce_psc_api_objects_documentchecklistitem.htm)); the Docketwise review-before-import flow ([AI Data Capture](https://supportcenter.docketwise.com/en/articles/10247778-ai-data-capture)); MDM steward override and visible survivorship reason ([Informatica BVT](https://onlinehelp.informatica.com/IICS/prod/mde/en/cg-c360-bvt-records/Establish_the_best_version_of_the_truth.html)); PROV derivation, revision, delegation and invalidation ([PROV-DM](https://www.w3.org/TR/prov-dm/)). The local rules are cited in the section above.

### Inferences
**A. Configured once (global library master)**
1. `DocumentType` (exists in both schemas): add `expiryFieldKey` (which supplied fact is the expiry date) and keep `readerProfile`.
2. `DocumentTypeSupplies` (new child table, replacing `suppliesFacts String[]`): `{documentTypeKey, version, canonicalFieldKey, about: holder | holder.parent | holder.spouse | issuer…, readable: bool, mustVerify: bool}`.
   - `about` handles a birth certificate supplying the parents' names without inventing field names, which matches the P-120 annotation "about whom picks the subject, never part of the field name".
   - Keep this **global, not per combination and not per person role**. A passport supplies the same facts whoever holds it.

**B. Configured per combination (or programme)**
3. `DocumentRequirement`, aligned to the team: `appliesToRoles String[]`, `attachMode`, `predicate`, `primacy` + `alternativeGroupKey`, `expiryRuleJson` (e.g. "valid for at least N months after filing", with the value **Sample** until the immigration expert gives it), `providedBy`, `isRequired`, `sourceQuote`.
4. `SectionQuestion.collectedFrom` / P-130 "Comes from" stays per fact per combination. When it is `Document · type`, the SQR hides the question unless the checklist line is missing or unreadable (P-130).
   - Validator at release: a "Comes from Document · X" fact must appear in X's supplies table, and X must be required (or an alternative) for that role.

**C. Case-side (new; the team has deferred it)**
5. `Document {id, partyId/subjectId (the holder), documentTypeKey, fileRef, uploadedBy, onBehalfOf?, status, supersedesId, supersededAt}`. It is owned by the **person**, not the case, which gives reuse across cases.
6. `ChecklistLine {caseId, participantId, requirementId, documentId?, status: missing | received | accepted | rejected | no_longer_required, reasonPlain}`. This is SA1B-D15's live checklist per person, recomputed when answers change. Uploaded files stay attached when a line drops off ("no longer required").
7. `DocumentReading {documentId, readerVersion, at}` + `ReadValue {readingId, canonicalFieldKey, subjectId, rowKey?, value, page, region?, confidence, state: proposed | approved | edited | ignored | conflict}`.
   - A proposal lives **here**, not as an answer row, so the team's `AnswerStatus {DECLARED, VERIFIED}` stays unchanged. This satisfies P-72 (proposed until confirmed) and AG-8-41 (the reader never verifies).

**D. The value with provenance (question 3)**
8. Keep `ClientCanonicalAnswer` append-only and extend `sourceJson` to `{channel: questionnaire | agent_view | document_read | import | confirm_section, actor, onBehalfOf?, at, documentId?, readValueId?, page?, confidence?}`.
   - On approval, `status = VERIFIED`, `verifiedBy` and `verifiedAt` are set, plus an evidence `documentId` (BR-8: verification links the evidencing document).
   - Mapping: Entity = value, Activity = channel, Agent = actor, `wasDerivedFrom` = documentId + page, Revision = `supersededById`, delegation = `onBehalfOf`.

**E. Conflicts (question 4)**
9. `AnswerConflict {subjectId, canonicalFieldKey, rowKey?, kind, candidates[] (answer ids or readValue ids), status OPEN | RESOLVED, resolution: kept | replaced | edited, resolvedBy, reason, at}`. There is one OPEN row per (subject, field), as the team specifies.
   - Kinds: the team's three plus `DOCUMENT_DISAGREEMENT` (two documents) and `EVIDENCE_REPLACED` (question 5).
   - **Rule:** a new value never silently replaces a VERIFIED one. It may silently fill an **empty** field only as a proposal. Equal values only add a corroborating source (no flag). A difference opens a conflict that a person resolves with a reason.
   - No numeric trust. Precedence only orders the default shown first.

**F. Staleness (question 5)**
10. When `Document` B supersedes A (new passport):
    - The checklist line moves to B.
    - Every VERIFIED answer whose evidence is A is marked "evidence replaced". The value is kept and still fills drafts, unless B is read and differs.
    - B's reading produces proposals. Equal values re-point the evidence; differing values open `EVIDENCE_REPLACED`.
    - Snapshots and locked `FormInstance` rows never change. An "affected filings" list is derived from `AnswerSnapshot.factsJson` containing the old answer id or value.
    - Expiry is checked by rule against `expiryRuleJson`, not by decay.

**Use-case walk-through**
- **Upload first, then questionnaire:** reader values become `ReadValue` proposals, and the SQR hides the document-supplied facts (P-130). Where an SQR question is still shown (an unreadable field), it is prefilled "please confirm" (P-77 pattern). No conflict is possible, because nothing exists yet.
- **Questionnaire typed first, then upload:** the client's typed value is DECLARED (confirmed for client fields, P-72). The reader value differs → conflict `VERIFIED_CONTRADICTION`-style shown on approval. If they match, approval upgrades the value to VERIFIED with the document as evidence.
- **Agent enters, then client uploads:** the agent value has `channel=agent_view`. It is handled the same way. If the field is filing-critical and the client's upload differs, the conflict is `STAFF_CLIENT_DIVERGENCE`.
- **New passport replaces old:** step F.
- **Two documents disagree** (e.g. passport and birth certificate date of birth): `DOCUMENT_DISAGREEMENT`. Neither is auto-chosen; the person picks one with a reason, and the other stays recorded.
- **Corrected after confirmation:** a new answer row, `supersededById` on the old one, and the reason in `sourceJson`. A VERIFIED value changed by a declared one goes through a conflict (AG-8-23).
- **Corrected after a form was signed or filed:** same new row. The locked form is untouched. The case shows "filed with an earlier value", with the list from AnswerSnapshot, and a task to decide on re-signing or notifying IRCC. Whether a correction must be notified is legal: Unconfirmed: no counsel.
- **Document for a minor uploaded by a parent:** `Document.subjectId = child`, `uploadedBy = parent`, `onBehalfOf = child`. Reader proposals are about the child. Under P-78 the parent's approval counts as confirmed for a minor (Unconfirmed: no counsel), but it is not VERIFIED until staff approve against the document (AG-8-41).
- **One document across two cases:** a `Document` on the person and two `ChecklistLine` rows pointing to it. Answers are per subject (not per case) in both schemas, so one verification serves both. Each case's filing still snapshots its own values.

**Defer**
- Trust scores and decay, an automatic golden-record winner, a PROV graph or export, Salesforce-style document *categories* (alternatives cover them), cross-firm or cross-tenant document sharing, region-box highlighting beyond page + optional region, and auto-resolution of matching values across family members (`CROSS_APPLICANT` stays flag-only).

### Gaps
- Whether a passport "valid for N months" rule and similar expiry rules exist per programme needs the immigration expert (Sample until then).
- Whether a corrected value after filing must be reported to IRCC is legal: Unconfirmed: no counsel.
- The team has not defined the Document lifecycle states, so `ChecklistLine.status` and `Document.status` here are proposals to reconcile with the team's later "10-state lifecycle".
- No source was found on how competitors (INSZoom, Docketwise) handle a replaced passport's earlier extracted values. Not documented publicly in the pages reached.
