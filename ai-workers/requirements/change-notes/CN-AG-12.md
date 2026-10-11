# CN-AG-12: change note to AG-12 Templates

| Field | Value |
|---|---|
| Module changed | AG-12 Templates (firm-level) |
| Version and file | v1.2 of 7 Oct 2026, `02-functional-requirements/agent/AG-12-templates_v1.2_2026-10-07.md` (Drive snapshot of 9 Oct 2026; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-12-38, AG-12-39 (highest AG-12-37, L320); BR-15 (highest BR-14, L339) |
| Companion files | CN-AG-03 item 2 (BR-19); CN-AG-11 (the Writer; assistant recipes); AW-01 (the Case and Intake assistants) |

**In plain words.** Firm templates send on their own once the firm has approved them, which is right for routine messages. Two safeguards are needed now that AI assistants also send templates: a mark for templates that talk about a client's status or eligibility, so an assistant never sends one without a person looking first (and never to a lead, by the founder's decision); and a letter template type for case letters, with locked wording, a list of the facts used, wording the Writer may never touch, and a court-declaration flag. "Drafter" in this module is the template engine and stays.

---

## 1. A "contains status or eligibility content" mark on templates

1. **Where.** §7 `Template` (L396); AG-12-33 (L314); new requirement **AG-12-38**; new rule **BR-15**.
2. **Current words.**
   > L396: "**`Template`** (the container) — `id` (`templateCode`, e.g. `TPL-…`), **`firm_id`** (CLIENT scope; null/platform for SYSTEM), **`scope`** (`SYSTEM | CLIENT`), **`type`** (template type, §3.9), **`channel`**"
3. **Proposed words.**
   > **AG-12-38 (status or eligibility mark).** A template SHALL carry a mark **contains status or eligibility content**, set by the firm when it publishes the template; for the seeded recipes' templates the mark is shown and set on the one "Review your standard messages" screen (AG-11-91). When an AI assistant (AW-01) would send a marked template, the send SHALL default to "Ask me first" (AG-11-51). A marked template SHALL NOT be sent automatically to a lead (AG-03 BR-19 as proposed in CN-AG-03). Free text an AI assistant adds to any template is AI-written text and stays "Ask me first" (AG-11-53). A person sending a marked template by hand is unaffected.
   >
   > **BR-15 (Status and eligibility templates need a person when an assistant sends them).** A template marked as containing status or eligibility content is sent by an AI assistant only after a person approves the send, and never automatically to a lead.

   `Template` gains the mark (proposed field `statusOrEligibilityContent`, boolean; name to assign).
4. **Why.** IMP-28(b), (c) ("any worker free text is "ask me first""; "Templates used by workers get a **"contains status or eligibility content" mark** set by the firm at review time; marked templates default to "ask me first" when a worker sends them"), relied on by `case-assistant.md` §9 G-9, `billing-assistant.md` §9 G-28 and `firm-assistant.md` §9 G-26; AIW-D41 (no eligibility content in any automatic or AI-drafted message to a lead).
5. **Knock-ons.** AG-11 (follow-on for the team, not written in CN-AG-11): the engine reads the mark when an assistant recipe sends a template and applies "Ask me first" (AG-11-52); AG-16-48 "Review your standard messages" screen shows the mark; counsel: whether an unlicensed-sent template with status content is lawful under supervision (IMP-28(d)).

## 2. A letter template type for case letters

1. **Where.** §3.9 (L252); AG-12-33 (L314); AG-12-24 (L299); new requirement **AG-12-39**.
2. **Current words.**
   > L252: "**Document / letter & checklist** → `DOCUMENT_CHECKLIST` exists (case + document-list variables). The rebuild treats a **document-request letter** and a **case checklist** as document-context types rendered by AG-7/AG-8."
3. **Proposed words.**
   > **AG-12-39 (case letter templates).** AG-12 SHALL support a **letter** template type for case letters (for example a letter of explanation, a submission cover letter or a reply to a government concern), distinct from `DOCUMENT_CHECKLIST`, with: (a) **locked blocks** the Writer SHALL NOT alter; (b) blocks marked **legal text**, which the Writer SHALL NOT draft, rewrite or translate (AG-12-24); (c) a **"facts used" footer** built by rule from the verified profile, listing each fact the letter states and its source document, with unverified facts listed as not yet verified; (d) a **litigation document** flag that inserts the court's declaration on AI-generated content, with wording counsel fixes, and routes the draft to the representative. Which letter types exist is pack content (SA-05; the immigration specialist).
4. **Why.** AIW-D34 item 11 (the founder: W-06 letters are drafted inside the Case assistant and the representative approves them); `case-assistant.md` §9 G-14 (no letter-of-explanation template type exists; the "facts used" footer; a "legal text" marker the Writer refuses) and G-28 (the litigation flag); `proposals.md` rows of 9 Oct (translation helper, the "legal text" marker the AI refuses) and of 10 Oct (Lead, the Federal Court declaration flag). Counsel fixes the declaration wording.
5. **Knock-ons.** AG-09 generate-from-template (AG-9-22) files the approved letter; SA-05 system templates (Super Admin half); AW-01 (the Case assistant's letter duty).

---

## Not changed here (pointers only)

- The exact titles of the seeded templates (welcome, portal invite, first document request, acknowledgement, chase) are not in the sources (`case-assistant.md` §9 G-24, Unknown); no change proposed.
- "Drafter" in this module is the template engine (AIW-D53); it is not renamed.
