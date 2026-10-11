# Change note CN-SA-05: Global Templates

| | |
|---|---|
| **Document changed** | SA-05 Global Templates, version 2.4, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-05-global-templates_v2.4_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (third round; new note, the Super Admin half of CN-AG-12 items 1 and 2) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-05's own style (plain present tense).
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*), the proposals row (`ai-workers/proposals.md`) or the Agent-plane change note it completes.
5. What else must change.

**Why this note exists.** SA-05 holds the master templates Expat Ready writes once; a firm uses a master as it is until it edits it, and then has its own copy in AG-12 (SA5-D7). The Agent-plane note CN-AG-12 adds two things to AG-12 and says that the platform's half belongs here:
- item 1 (AG-12-38, BR-15): the *contains status or eligibility content* mark. Its Why says: "Expat Ready presetting the mark on the seeded templates is a **Proposal** (review S3c-b n-10): the platform's system templates live in SA-05, and no SA-05 change note carries it yet (raised to the Lead)."
- item 2 (AG-12-39): the case letter type. Its knock-ons say: "Platform system letter templates would sit in SA-05; no SA-05 change note exists (raised to the Lead)."

This note is that SA-05 half. It points to AG-12-38 and AG-12-39 for what the mark and the letter type do, and restates neither.

**Numbering.** L25: "New requirements continue from SA-5-47." The whole module was searched: the highest requirement is SA-5-46 (L293), the highest business rule BR-16 (L314), the highest decision SA5-D18 (L50) and the highest cross-module row SA5-X10 (L89); §13 has no open question (L420). New IDs here are **SA-5-47**, **SA-5-48**, **BR-17** and §13 items **1 to 3**.

**Checked, not reopened: machine translation.** SA-05 v2.4 closed it. §0.1 lists "Per-template HTML design; machine-translation helper" as "Not planned" with the reason "SA5-D14; legal text hand-written" (L74). §13 records v2.2's question "5 auto-translate → no" (L424). SA-5-15 reads "legal text is never machine-translated" (L250). Nothing in this note proposes a translation helper. CN-AG-12 item 2 (b) is consistent: the Writer does not translate legal-text blocks.

---

## 1. Expat Ready presets the status-or-eligibility mark on the templates it publishes

**(1) What it changes.**
- §3.3 "Fill-in fields" is unchanged; a new paragraph is added after §3.2's launch set (L171);
- a new requirement SA-5-47;
- a new business rule BR-17;
- §7 `SystemTemplate` (L327);
- §0.3 phasing table (L93–L106);
- §13 "Tasks before build" (L422).

**(2) Current words.**

L327:
> - **`SystemTemplate`** *(built — currently one row per system email key)* — extend: kind (catalogue template / system email), type, channel, country (null = global), programs, active published version, default marker (soon after launch), must-keep fields (system emails), legal-sentence markers (system emails).

L422 (extract):
> **Tasks before build:** list each system email's must-keep fields and legal sentences (content author + tech lead, with SA-2 / SA-4 owners); privacy mark on each fill-in field (with SA-1B); the Immigration SME confirms the retainer, engagement and closing wording; the content author writes the nine launch templates (English; French where available).

**(3) Proposed words.**

After L171, add:
> **Status or eligibility content** *(new — AIW-D41; CN-AG-12 item 1)*. Every catalogue template that a firm sends to a person carries the mark **contains status or eligibility content**, as AG-12-38 defines it. Expat Ready sets it on its own masters; what the mark does at send time is AG-12's and AG-11's (AG-12-38, AG-11-115).

New requirement:
> - **SA-5-47** *(new — AIW-D41; CN-AG-12 item 1; proposal)* Each catalogue master of type email, letter / document or message carries the mark **contains status or eligibility content** (AG-12-38). The content author sets it, yes or no, before publishing; a master with no answer cannot be published. Expat Ready presets the mark on every master it publishes for firms to use, including the templates of the seeded and ready-made recipes. A firm that uses a master as it is uses the master's mark (SA-5-32); a firm's own copy starts with the mark of the master version it came from (SA-5-27). What a firm may change on its own copy, and what the mark does when a template is sent, follow AG-12-38. System emails (§3.12) go to firms, not to clients or leads, and carry no mark.

New business rule:
> - **BR-17** *(new — AIW-D41)* A catalogue master's status-or-eligibility mark is part of the master and reaches every firm that uses it; Expat Ready never publishes a master for firms without deciding the mark.

§7 `SystemTemplate`, after "legal-sentence markers (system emails)", add: "status-or-eligibility mark (catalogue templates; AG-12-38; field name for the team, as `statusOrEligibilityContent` in CN-AG-12)".

§0.3 gains a row: "| Status-or-eligibility mark on masters | **Must now** | SA-5-47 |".

L422 gains: "the content author, with the immigration specialist, decides the status-or-eligibility mark on each launch template and each seeded-recipe template before go-live (SA-5-47)."

**(4) Why.**
- **AIW-D41.** The founder: "No eligibility content (score, band, *likely*, levers) in any automatic or AI-drafted message to a lead; eligibility reaches a lead only through the consultant's audited share (AG-3-38)" (as quoted in CN-AG-12 item 1).
- **CN-AG-12 item 1**, AG-12-38: "For the templates of the seeded and ready-made recipes, Expat Ready presets the mark where the template carries such content, and the firm sees and may set it on the one "Review your standard messages" screen (AG-11-91; AG-16-48)."
- **Why SA-05.** Under "use until you edit" a firm sends Expat Ready's master as it is (SA5-D7, L39: "Firms use Expat Ready's published templates directly"). A firm that never edits would otherwise send unmarked templates, and the send-time check works only on marked templates (AG-12-38 (d)).
- **Proposal — not approved.** CN-AG-12 labels the preset a Proposal (review S3c-b n-10). The "yes or no before publishing" check mirrors AG-12-38's "The firm sets it when it publishes a template".
- **The exact reach** of the founder's rule (every automatic or AI-drafted send; a person's own message is not blocked) is `00-step3-plan.md`, "Eligibility to leads, exact reach". This note changes nothing about who may send by hand.

**(5) Knock-ons.**
- AG-12 (CN-AG-12 item 1) and AG-11-115 (CN-AG-11 item 13).
- AG-16-48, "Review your standard messages", shows the mark (CN-AG-16).
- SA-07 Appendix A: setting the mark is part of editing and publishing a template (SA5-X6); no new key.
- §13 item 1 (change 3).

---

## 2. Expat Ready publishes case letter masters

**(1) What it changes.**
- §3.2 "Template types", the letter / document bullet (L162);
- SA-5-5 (L236);
- a new requirement SA-5-48;
- §7 `SystemTemplate` (L327);
- §0.3 phasing table.

**(2) Current words.**

L162:
> - **Letter / document** — engagement letter, closing letter, document-request letter; produces a PDF.

L236:
> - **SA-5-5** *(changed v2.3 — SA5-D2)* Types: email, letter / document, retainer / agreement, checklist (the wording that presents the case's pack-derived document list — never a second list), invoice / billing wording, message (Phase 3), workflow blueprint (later); entity binding PROSPECT / CLIENT / CASE + client type (AG17-D4).

**(3) Proposed words.**

L162:
> - **Letter / document** — engagement letter, closing letter, document-request letter, and **case letters** *(changed — CN-AG-12 item 2)* (for example a letter of explanation, a submission cover letter or a reply to a government concern), as AG-12-39 defines them; produces a PDF.

SA-5-5 gains: "*(changed — CN-AG-12 item 2)* The letter / document type includes the **case letter** kind of AG-12-39."

New requirement:
> - **SA-5-48** *(new — AIW-D34 item 11; CN-AG-12 item 2)* Expat Ready publishes **case letter** masters, bound to CASE (AG17-D4). A case letter master carries the parts AG-12-39 defines: locked blocks, blocks marked legal text, the "facts used" footer and the litigation-document flag; SA-05 holds the master's wording and markers, and AG-12-39 says what each part does. Which case letters exist follows the pack's letter types (the immigration specialist). Legal-text blocks are written by hand and never machine-translated (SA-5-15). A firm uses a case letter master as it is or edits its own copy (SA5-D7); the locked and legal-text markers stay on the copy (AG-12-39).

§7 `SystemTemplate` gains: "case letter markers (locked blocks, legal-text blocks, facts-used footer, litigation flag; AG-12-39)".

§0.3 gains a row: "| Case letter masters | **Must now** | SA-5-48 |".

**(4) Why.**
- **CN-AG-12 item 2**, AG-12-39: "Within the document/letter family of AG-12-33, AG-12 SHALL support a **case letter** type … beside `DOCUMENT_CHECKLIST` … Which letter types exist is pack content (the immigration specialist)." Its knock-ons point here for the platform's letter templates.
- **AIW-D34 item 11**, as CN-AG-12 item 2 cites it: the W-06 letters are drafted inside the Case assistant and the representative approves them.
- **Inside the existing family.** SA-05 already has a letter / document type that "produces a PDF" (L162), so the case letter is a kind of it, not a new type (review S3c m-13, as cited in CN-AG-12 item 2).
- **Release 1.** Release 1 does not launch without the AI assistants (AIW-D66), and the Case assistant's letter duty needs these masters, hence "Must now".
- `case-assistant.md` §9 G-14 and G-28.

**(5) Knock-ons.**
- AG-12-39 (CN-AG-12 item 2); AG-09 files the approved letter (AG-9-22).
- AW-01 (the Case assistant's letter duty).
- §13 items 2 and 3 (change 3).
- Counsel pack question 11 (the court declaration wording).

---

## 3. Open questions

**(1) What it changes.** §13 "Open Questions" (L420).

**(2) Current words.**

L420:
> **None open for SA-5.**

**(3) Proposed words.** "None open for SA-5." becomes:
> 1. **The mark on a firm's own copy (team).** *(new — SA-5-47)* AG-12-38 says the firm "may set" the mark. Confirm whether a firm may clear a mark Expat Ready preset on a master, and what a firm's edited copy shows when a newer master version changes the mark (SA-5-31 is soon after launch).
> 2. **Review route for case letters (team, Owner).** *(new — SA-5-48)* SA5-D9 sends retainers and agreements through review with Owner approval and an SME check, and lets the content author publish letters directly. Confirm which route a case letter master with legal-text blocks or the litigation flag follows.
> 3. **The court declaration wording (counsel, Owner).** *(new — SA-5-48)* AG-12-39 (d) inserts the court's declaration on AI-generated content, "with wording counsel fixes" (counsel pack question 11). Confirm where that wording is held and who publishes a change to it; SA-5-39's Owner-only legal sentences are the nearest pattern.

**(4) Why.** Each question is a gap between CN-AG-12 and SA-05's current rules that no decision settles. None is decided here.

**(5) Knock-ons.** AG-12 (CN-AG-12); the counsel pack (AIW-D68).

---

## 4. Document control and numbering

**(1) What it changes.** The document-control table (L5–L11) and the numbering line (L25).

**(2) Current words.**

L25 (extract):
> New requirements continue from SA-5-47.

**(3) Proposed words.**
- A version row: "| 2.5 | *(date placed)* | Workstream 2 change note CN-SA-05 applied: status-or-eligibility mark preset on masters (SA-5-47, BR-17; proposal); case letter masters (SA-5-48); §13 items 1 to 3. Machine translation stays closed (§0.1). | AIW-D34, AIW-D41; CN-AG-12 items 1 and 2 |".
- L25: "New requirements continue from SA-5-49."

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
