# Change note CN-SA-05: Global Templates

| | |
|---|---|
| **Document changed** | SA-05 Global Templates, version 2.4, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-05-global-templates_v2.4_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (fifth round, after re-check S3a-d) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-05's own style (plain present tense).
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*), the proposals row (`ai-workers/proposals.md`) or the Agent-plane change note it completes.
5. What else must change.

**Why this note exists.** SA-05 holds the master templates Expat Ready writes once; a firm uses a master as it is until it edits it, and then has its own copy in AG-12 (SA5-D7). The Agent-plane note CN-AG-12 adds two things to AG-12 and names this note as their Super Admin half:
- CN-AG-12 change 1 (AG-12-38, BR-15), the *contains status or eligibility content* mark: its Why labels Expat Ready's preset a Proposal and points to change 1 of this note;
- CN-AG-12 change 2 (AG-12-39), the case letter type: its knock-ons point to change 2 of this note for the platform's case letter masters.

Other Workstream 2 files are cited by change and requirement ID, never by line or in quotation marks (`00-step3-plan.md`, "Point by ID while files can change"). This note points to AG-12-38 and AG-12-39 for what the mark and the letter type do, and restates neither.

**Numbering.** L25: "New requirements continue from SA-5-47." The whole module was searched: the highest requirement is SA-5-46 (L293), the highest business rule BR-16 (L314), the highest decision SA5-D18 (L50) and the highest cross-module row SA5-X10 (L89); §13 has no open question (L420). New IDs here are **SA-5-47**, **SA-5-48**, **BR-17** and §13 items **1 to 4**. (§13 L424 numbers v2.2's closed questions 1 to 10; the new items are a separate list under the "None open" line.)

**Checked, not reopened: machine translation.** SA-05 v2.4 closed it. §0.1 lists "Per-template HTML design; machine-translation helper" as "Not planned" with the reason "SA5-D14; legal text hand-written" (L74). §13 records v2.2's question "5 auto-translate → no" (L424). SA-5-15 reads "legal text is never machine-translated" (L250). Nothing in this note proposes a translation helper; AG-12-39 (b) is consistent (CN-AG-12 change 2).

**A conflict between team files, recorded and not changed here.** SA-05 says a firm "**uses Expat Ready's published template as it is** — no copy is made when the firm is created" (L202; also SA-5-29, L272). AG-11 v1.12 says the opposite for the seeded recipes: "At provisioning the seeded recipes' templates … SHALL be adopted as firm DRAFT templates (AG-12)" (AG-11-91, L698). AG-11's own pending knock-on to AG-12 carries this "Seed adoption (the seeded recipes' templates adopted as firm drafts at provisioning)" (AG-11 §0.2, L63, Pending). The team settles it; this note writes no change for it (`00-step3-plan.md`, "Where the team already has a pending knock-on"). SA-5-47 is written to hold either way.

---

## 1. Expat Ready presets the status-or-eligibility mark on the templates it publishes

**(1) What it changes.**
- a new paragraph after §3.2's launch set (L171);
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
> **Status or eligibility content** *(new — AIW-D41; CN-AG-12 change 1)*. Every catalogue master that a firm sends carries the mark **contains status or eligibility content**, as AG-12-38 defines it. Expat Ready sets it on its own masters; what the mark does at send time is AG-12's and AG-11's (AG-12-38, AG-11-115).

New requirement:
> - **SA-5-47** *(new — AIW-D41; CN-AG-12 change 1; Proposal)* Every catalogue master of a type in SA-5-5 that a firm sends (email, letter / document, retainer / agreement, checklist, invoice / billing wording, message) carries the mark **contains status or eligibility content** (AG-12-38). Workflow-blueprint templates (SA5-D3) are not sent and carry no mark. On a master the mark starts **unset**; the content author sets it to yes or no before the first publish, and a master whose mark is unset cannot be published. Expat Ready sets the mark on every master it publishes for firms to use, including the templates of the seeded and ready-made recipes. **The mark travels with the template:** a firm that uses a master as it is uses the master's mark (SA-5-32), and any copy of a master a firm holds, whether made when the firm edits it (SA-5-27) or made at provisioning, starts with the yes or no of the master version it came from. What a firm may change on its own copy, and what the mark does when a template is sent, follow AG-12-38. System emails (§3.12) carry no mark.

New business rule:
> - **BR-17** *(new — AIW-D41; Proposal)* A catalogue master's status-or-eligibility mark is part of the master and reaches every firm that uses it or holds a copy of it; Expat Ready never publishes a master for firms with the mark unset.

§7 `SystemTemplate`, after "legal-sentence markers (system emails)", add: "status-or-eligibility mark (catalogue templates that a firm sends; unset, yes or no; AG-12-38; field name for the team)".

§0.3 gains a row, marked for the team: "| Status-or-eligibility mark on masters | *Proposal: Must now if AIW-D66 holds; the team confirms* | SA-5-47 |".

L422 gains: "the content author, with the immigration specialist, writes the templates of the seeded and ready-made recipes as SA-05 masters, and decides the status-or-eligibility mark on each of them and on each launch template, before go-live (SA-5-47)."

**(4) Why.**
- **AIW-D41.** The founder chose "Never; consultant shares it": "No eligibility content (score, band, *likely*, levers) in any automatic or AI-drafted message to a lead; eligibility reaches a lead only through the consultant's audited share (AG-3-38)."
- **CN-AG-12 change 1** (AG-12-38) has Expat Ready preset the mark on the templates of the seeded and ready-made recipes, and lets the firm see and set it on the one review screen (AG-11-91; AG-16-48).
- **Why SA-05.** Under "use until you edit" a firm sends Expat Ready's master as it is (SA5-D7, L39: "Firms use Expat Ready's published templates directly"). A firm that never edits would otherwise send unmarked templates, and the send-time check works only on marked templates (AG-12-38 (d)).
- **The seeded and ready-made templates as SA-05 masters: *Assumption*.** No source says those templates are SA-05 masters. SA5-D15's launch set (L171) does not list them, and CN-AG-12 records their titles as Unknown. The assumption is that Expat Ready writes them in SA-05 like every other template it gives firms; the task line above asks the content author to do so, and §13 item 4 asks the team to confirm (re-check S3a-d m-4).
- **The mark holds whichever way the conflict above is settled,** because it travels with the copy as well as with the master.
- **Three states on a master.** CN-AG-12 proposes a yes-or-no field on the firm's template. On a master the field starts unset, so the publish check can tell "not decided" from "no". A firm's copy always starts with a yes or no.
- **One scope.** The mark covers every type in SA-5-5 that a firm sends; workflow-blueprint templates are "to-do steps" (SA5-D3, L35) and are not sent (re-check S3a-d m-4 (d)).
- **System emails carry no mark: *Assumption*.** §3.12 (L217) lists Expat Ready's own emails (sign-in, firm lifecycle, trials, billing, support) without saying who receives each. The assumption is that none of them carries a client's status or eligibility content; the team confirms.
- **Proposal — not approved.** CN-AG-12 labels the preset a Proposal. The phasing row adds Release 1 work for the team; it rests on AIW-D66 ("Release 1 does not launch without the AI assistants"), not on a decision about this item, so the team confirms it.
- **The exact reach** of the founder's rule (every automatic or AI-drafted send; a person's own message is not blocked) is `00-step3-plan.md`, "Eligibility to leads, exact reach". This note changes nothing about who may send by hand.

**(5) Knock-ons.**
- AG-12 (CN-AG-12 change 1) and AG-11-115 (CN-AG-11 change 13).
- AG-16-48, the review screen for standard messages, shows the mark (CN-AG-16).
- AG-11-91 against SA-05 L202 (above): the team's pending AG-12 knock-on.
- SA-07 Appendix A: setting the mark is part of editing and publishing a template (SA5-X6); no new key.
- §13 items 1 and 4 (change 3).

---

## 2. Expat Ready publishes case letter masters, chosen per country in SA-05

**(1) What it changes.**
- §3.2 "Template types", the letter / document bullet (L162);
- SA-5-5 (L236);
- a new requirement SA-5-48;
- §7 `SystemTemplate` (L327);
- §0.3 phasing table;
- §13 "Tasks before build" (L422).

**(2) Current words.**

L162:
> - **Letter / document** — engagement letter, closing letter, document-request letter; produces a PDF.

L236:
> - **SA-5-5** *(changed v2.3 — SA5-D2)* Types: email, letter / document, retainer / agreement, checklist (the wording that presents the case's pack-derived document list — never a second list), invoice / billing wording, message (Phase 3), workflow blueprint (later); entity binding PROSPECT / CLIENT / CASE + client type (AG17-D4).

L179 (extract):
> A master is **global** or tagged to **one country**.

**(3) Proposed words.**

L162:
> - **Letter / document** — engagement letter, closing letter, document-request letter, and **case letters** *(changed — CN-AG-12 change 2)* (for example a letter of explanation, a submission cover letter or a reply to a government concern), as AG-12-39 defines them; produces a PDF.

SA-5-5 gains: "*(changed — CN-AG-12 change 2)* The letter / document type includes the **case letter** kind of AG-12-39."

New requirement:
> - **SA-5-48** *(new — AIW-D34 item 11; CN-AG-12 change 2; Proposal)* Expat Ready publishes **case letter** masters, bound to CASE (AG17-D4). **Which case letter masters exist is decided in SA-05, per country: they are country masters (§3.4) that the content author publishes with the immigration specialist**, as for the launch set (SA5-D15). They are not a country-pack content area. A case letter master carries the parts AG-12-39 defines: locked blocks, blocks marked legal text, the "facts used" footer and the litigation-document flag; SA-05 holds the master's wording and markers, and AG-12-39 says what each part does. Legal-text blocks are written by hand and never machine-translated (SA-5-15). A firm uses a case letter master as it is or edits its own copy (SA5-D7). *Proposal:* the locked and legal-text markers stay on the firm's copy.

§7 `SystemTemplate` gains: "case letter markers (locked blocks, legal-text blocks, facts-used footer, litigation flag; AG-12-39)".

§0.3 gains a row, marked for the team: "| Case letter masters | *Proposal: Must now if AIW-D66 holds; the team confirms* | SA-5-48 |".

L422 gains: "the content author, with the immigration specialist, lists the Canada case letter masters and writes them (SA-5-48)."

**(4) Why.**
- **CN-AG-12 change 2** (AG-12-39) adds the case letter type within the document / letter family, and its knock-ons point to this change for the platform's case letter masters.
- **Where the list lives.** The Lead's call of 11 Oct (`00-step3-plan.md`, "Case letters (S3a-c N-3)"): the list of case letter masters lives in SA-05, as country masters the content author publishes with the immigration specialist; no new pack content area. SA-01 v2.2 lists the content areas of a country pack (L211–L229) and none is letter types; SA-05 already keeps country wording as its own masters (§3.4, L179, quoted above).
- **Markers on the copy: Proposal.** AG-12-39 says a firm adopts a master as its own copy like any other master; it does not say the markers stay on the copy. Keeping them is proposed here so that a firm's edit cannot unlock wording the Writer must not touch (re-check S3a-d m-10).
- **AIW-D34 item 11**, as CN-AG-12 change 2 cites it: the W-06 letters are drafted inside the Case Officer's AI and the representative approves them.
- **Inside the existing family.** SA-05 already has a letter / document type that "produces a PDF" (L162), so the case letter is a kind of it, not a new type (review S3c m-13, as CN-AG-12 change 2 cites it).
- **Proposal and phasing.** The Case Officer's AI's letter duty needs these masters, and Release 1 does not launch without the AI teammates (AIW-D66); the phasing row is still Release 1 work for the team, so it is marked for the team to confirm.
- `case-assistant.md` §9 G-14 and G-28.

**(5) Knock-ons.**
- AG-12-39 (CN-AG-12 change 2); AG-09 files the approved letter (AG-9-22).
- AW-01 (the Case Officer's AI's letter duty).
- §13 items 2 and 3 (change 3).
- Counsel pack question 11 (the court declaration wording).

---

## 3. Open questions

**(1) What it changes.** §13 "Open Questions" (L420).

**(2) Current words.**

L420:
> **None open for SA-5.**

**(3) Proposed words.** "None open for SA-5." becomes:
> 1. **The mark on a firm's own copy (team).** *(new — SA-5-47)* AG-12-38 lets the firm set the mark. Confirm whether a firm may clear a mark Expat Ready set to yes on a master, and what a firm's edited copy shows when a newer master version changes the mark (SA-5-31 is soon after launch).
> 2. **Review route for case letters (team, Owner).** *(new — SA-5-48)* SA5-D9 sends retainers and agreements through review with Owner approval and an SME check, and lets the content author publish letters directly. Confirm which route a case letter master with legal-text blocks or the litigation flag follows.
> 3. **The court declaration wording (Owner; unconfirmed Lead guidance; no counsel (AIW-D94)).** *(new — SA-5-48)* AG-12-39 (d) inserts the court's declaration on AI-generated content, with wording that is unconfirmed Lead guidance; no counsel (AIW-D94) (counsel pack question 11). Confirm where that wording is held and who publishes a change to it; SA-5-39's Owner-only legal sentences are the nearest pattern.
> 4. **Seeded templates: masters or copies (team).** *(new — SA-5-47)* Confirm that the templates of the seeded and ready-made recipes are SA-05 masters, and settle AG-11-91 (copies at provisioning) against L202 and SA-5-29 (no copy at firm creation), through AG-11's pending AG-12 knock-on.

**(4) Why.** Each question is a gap between CN-AG-12, AG-11 and SA-05's current rules that no decision settles. None is decided here.

**(5) Knock-ons.** AG-12 (CN-AG-12); AG-11 (AG-11-91); the counsel pack, now the Lead's unconfirmed guidance (AIW-D94).

---

## 4. Document control and numbering

**(1) What it changes.** The document-control table (L5–L11) and the numbering line (L25).

**(2) Current words.**

L25 (extract):
> New requirements continue from SA-5-47.

**(3) Proposed words.**
- A version row: "| 2.5 | *(date placed)* | Workstream 2 change note CN-SA-05 applied: status-or-eligibility mark set on masters and carried by every copy (SA-5-47, BR-17); case letter masters chosen per country in SA-05 (SA-5-48); both proposals, with phasing for the team to confirm; §13 items 1 to 4. Machine translation stays closed (§0.1). | AIW-D34, AIW-D41; CN-AG-12 changes 1 and 2 |".
- L25: "New requirements continue from SA-5-49."

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
