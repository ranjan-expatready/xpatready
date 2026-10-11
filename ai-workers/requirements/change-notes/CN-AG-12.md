# CN-AG-12: change note to AG-12 Templates

| Field | Value |
|---|---|
| Module changed | AG-12 Templates (firm-level) |
| Version and file | v1.2 of 7 Oct 2026, `02-functional-requirements/agent/AG-12-templates_v1.2_2026-10-07.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`, unchanged since 9 Oct; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (fix round after review S3c) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-12-38, AG-12-39 (highest AG-12-37, L320); BR-15 (highest BR-14, L339) |
| Companion files | CN-AG-03 item 2 (BR-19); CN-AG-11 item 9 (g) (the engine applies the mark); AW-01 v0.1 (the Case and Intake assistants) |

**In plain words.** Firm templates send on their own once the firm has approved them, which is right for routine messages. Two safeguards are needed now that AI assistants also send templates. First, a mark for templates that talk about a client's status or eligibility: such a template is **never** sent to a lead, by an assistant or by a person, because the founder decided that eligibility reaches a lead only when a consultant shares the assessment; to an existing client, an assistant's send of a marked template waits for a person by default. Second, a letter type for case letters, with locked wording, a list of the facts used, wording the Writer may never touch, and a court-declaration flag. "Drafter" in this module is the template engine and stays.

---

## 1. A "contains status or eligibility content" mark; never sent to a lead

1. **Where.** §7 `Template` (L396); AG-12-33 (L314); new requirement **AG-12-38**; new rule **BR-15**.
2. **Current words.**
   > L396: "**`Template`** (the container) — `id` (`templateCode`, e.g. `TPL-…`), **`firm_id`** (CLIENT scope; null/platform for SYSTEM), **`scope`** (`SYSTEM | CLIENT`), **`type`** (template type, §3.9), **`channel`**"
3. **Proposed words.**
   > **AG-12-38 (status or eligibility mark).** A template SHALL carry a mark **contains status or eligibility content**, set by the firm when it publishes the template; for the seeded recipes' templates the mark is shown and set on the one "Review your standard messages" screen (AG-11-91). (a) A marked template SHALL NOT be sent to a lead — not by an automation, not by an AI assistant whoever approves the send, and not by a person sending it by hand; the send SHALL be refused with the reason that eligibility reaches a lead only through the consultant's audited assessment share (AG-3-38; AG-03 BR-19 as proposed in CN-AG-03). (b) To an existing client, when an AI assistant (AW-01) would send a marked template, the send SHALL default to "Ask me first" (AG-11-51); the firm MAY change that default per recipe, as for any template message (AG-11-52). (c) Free text an AI assistant adds to any template is AI-written text and stays "Ask me first" (the AG-11-53 floor).
   >
   > **BR-15 (Eligibility never reaches a lead through a template).** A template marked as containing status or eligibility content is never sent to a lead, by anyone; to an existing client an assistant's send of it waits for a person by default.

   `Template` gains the mark (proposed field `statusOrEligibilityContent`, boolean; name to assign).
4. **Why.** AIW-D41 (the founder: "No eligibility content (score, band, *likely*, levers) in any automatic or AI-drafted message to a lead; eligibility reaches a lead only through the consultant's audited share (AG-3-38)"); `00-step3-plan.md` "Eligibility to leads (AIW-D41, review S3c B-1)" ("a template marked as carrying status or eligibility content can never be sent to a lead by an assistant, whoever approves") and the coordinator's fix-round instruction that a person's hand-send to a lead is also blocked; IMP-28(c) for the client-side default ("marked templates default to "ask me first" when a worker sends them"), as `00-step3-plan.md` "Status-content templates" keeps it a default; IMP-28(b) ("any worker free text is "ask me first""). Relied on by `case-assistant.md` §9 G-9, `billing-assistant.md` §9 G-28 and `firm-assistant.md` §9 G-26. This replaces the first-round wording, which let an approved send reach a lead (review S3c B-1).
5. **Knock-ons.** AG-11 item 9 (g) of CN-AG-11 (the engine applies the default and refuses a lead send); AG-03 BR-19 says the same (CN-AG-03 item 2); AG-02 §3.10 nurture (CN-AG-02 item 1); AG-16-48 "Review your standard messages" shows the mark; AW-1-46 and AW-1-90 cite this item. Counsel: whether an unlicensed-sent template with status content to an existing client is lawful under supervision (IMP-28(d)).

## 2. A letter type for case letters, within the document/letter family

1. **Where.** §3.9 (L252); AG-12-33 (L314); AG-12-24 (L299); new requirement **AG-12-39**.
2. **Current words.**
   > L252: "**Document / letter & checklist** → `DOCUMENT_CHECKLIST` exists (case + document-list variables). The rebuild treats a **document-request letter** and a **case checklist** as document-context types rendered by AG-7/AG-8."
3. **Proposed words.**
   > **AG-12-39 (case letter templates).** Within the document/letter family of AG-12-33, AG-12 SHALL support a **case letter** type (for example a letter of explanation, a submission cover letter or a reply to a government concern), beside `DOCUMENT_CHECKLIST`, with: (a) **locked blocks** the Writer SHALL NOT alter; (b) blocks marked **legal text**, which the Writer SHALL NOT draft, rewrite or translate (AG-12-24); (c) a **"facts used" footer** built by rule from the verified profile, listing each fact the letter states and its source document, with unverified facts listed as not yet verified; (d) a **litigation document** flag that inserts the court's declaration on AI-generated content, with wording counsel fixes, and routes the draft to the representative. Which letter types exist is pack content (the immigration specialist).
4. **Why.** AIW-D34 item 11 (the founder: W-06 letters are drafted inside the Case assistant and the representative approves them); `case-assistant.md` §9 G-14 (no letter-of-explanation template type exists; the "facts used" footer; a "legal text" marker the Writer refuses) and G-28 (the litigation flag); `proposals.md` rows of 9 Oct (translation helper, the "legal text" marker the AI refuses) and of 10 Oct (Lead, the Federal Court declaration flag); review S3c m-13 (place it inside the existing family). Counsel fixes the declaration wording.
5. **Knock-ons.** AG-09 generate-from-template (AG-9-22) files the approved letter; AW-01 (the Case assistant's letter duty). Platform system letter templates would sit in SA-05; no SA-05 change note is planned (raised to the Lead).

---

## Not changed here (pointers only)

- The exact titles of the seeded templates (welcome, portal invite, first document request, acknowledgement, chase) are not in the sources (`case-assistant.md` §9 G-24, Unknown); no change proposed.
- "Drafter" in this module is the template engine (AIW-D53); it is not renamed.
