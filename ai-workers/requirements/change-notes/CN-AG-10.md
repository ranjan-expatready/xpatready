# CN-AG-10: change note to AG-10 Communication Hub

| Field | Value |
|---|---|
| Module changed | AG-10 Communication Hub |
| Version and file | v1.10 of 10 Oct 2026, `02-functional-requirements/agent/AG-10-communication-hub_v1.10_2026-10-10.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (second fix round, after re-check S3c-b) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-10-60 (highest AG-10-59, L450); §13 item 19 (highest item 18, L821) |
| Companion files | CN-AG-06 item 3 (payment matching); CN-AG-11 items 1, 2, 12 and 13; CN-AG-12 item 1 (the status or eligibility mark); AW-01 v0.1 (the Billing, Case and Intake assistants) |

**In plain words.** When a person links an unmatched email to a client, the product remembers "this address belongs to this client". That is right for a person's own address and wrong for a bank's or a payment processor's notice address: after one link, every later notice from that bank would file to the first client and count as a verified sender. This note adds a *shared sender* mark so such addresses are never learned. Three alignments follow: the Reader, not the Sorter, proposes an attachment's document type (the module's own §13 already says so); the AI writing tool is now the Writer; and a Writer draft to a lead may not carry a template marked as holding status or eligibility content, while a person's own message stays free.

**What the team changed on 10 Oct (v1.10).** Plan gating now uses SA-03's feature catalogue: the AI Doers are one extra with one firm switch (AG-16-35). Nothing in this note is affected; nothing proposed here was already made.

**Terms used.** *Lead*: a prospect in AG-02 who is not yet a client. *Composer*: the screen where a person writes and sends a message (AG-10).

---

## 1. A *shared sender* mark: a bank's address is never learned as one client's

1. **Where.** AG-10-10 (L370); AG-10-12 (L372); AG-10-47 (L434); BR-7 (L462); new requirement **AG-10-60**; new §13 item **19**.
2. **Current words.**
   > L372: "a staff member SHALL link it in one action, which SHALL record the address↔Contact mapping for future matching."
   >
   > L370: "(2) sender/recipient address → Contact within `firm_id`"
3. **Proposed words.**
   > **AG-10-60 (shared senders).** The firm SHALL be able to mark a sender address as a **shared sender** (for example a bank's or a payment processor's notice address). For a shared sender: linking one of its messages SHALL NOT record the address↔Contact mapping of AG-10-12; address matching (AG-10-10, step 2) SHALL skip it; and it SHALL NOT count as a known email address for the verified-sender rule (AG-10-47; AG-11-94 as changed by CN-AG-11 item 12). Reply-token and header-chain matching (AG-10-10, step 1) are unchanged; a message from a shared sender with no such signal lands in the Unmatched inbox for a person to link. The link action SHALL also offer **"do not learn this address"** for a single link. Setting or clearing the mark SHALL be audited; the permission is the team's to name.

   AG-10-12 adds "unless the address is a shared sender (AG-10-60) or the person chose not to learn it". New §13 item: "**19. One address mapped to two contacts.** AG-10 does not say how the matcher resolves an address that links have mapped to two different contacts; the team specifies it."
4. **Why.** `proposals.md` row of 10 Oct (Billing assistant, shared senders: a *shared sender* mark on the firm's side, or a *do not learn this address* choice on the link, so that such senders are never mapped to a contact and always land in the Unmatched inbox for a person; the row is about address learning, so reply-token and header-chain matching are left as they are, review S3c m-15); `billing-assistant.md` §9 G-4; `case-assistant.md` §9 G-34; `00-step2-decisions.md` §6 (the team list). Confidentiality of one client's payment details reaching another client's file is for counsel (`billing-assistant.md` §7 item 3).
5. **Knock-ons.** AG-06 Reconciliation view (CN-AG-06 item 3): an assistant never starts from a notice the matcher filed by itself (AW-1-96); AG-11-94 (CN-AG-11 item 12); AG-16 may host the list of shared senders under the mailbox integration (the team's choice).

## 2. The Sorter files attachments; the Reader proposes their type

1. **Where.** AG-10-37(c) (L420).
2. **Current words.**
   > L420: "(c) **file each attachment to AG-9** with a proposed document type"
3. **Proposed words.** "(c) **file each attachment to AG-9** and hand it to the Reader, which proposes its document type (AG-9-42)".
4. **Why.** IMP-12, relied on by `case-assistant.md` §2.3 step 4; the module's own §13 item 12 (L815) is already decided: "the Reader — not the Sorter — classifies documents".
5. **Knock-ons.** AG-11 AG11-D4 and AG-11-67 (CN-AG-11 item 2).

## 3. The AI writing tool is the Writer

1. **Where.** AG11-D4 applied row (L33); AG-10-15 (L377); AG-10-44 (L431); AG-10-48 (L435); AG-10-54 (L443); every other place where "Drafter" names the AI drafter.
2. **Current words.**
   > L377: "The **AI-assist drafter** is the **Drafter Doer**, callable by the rep in the composer and by any recipe (AG11-D4)."
   >
   > L431: "AI-written text sent to a client, whether drafted by hand-invoked or recipe-called Drafter, and any template message whose body was edited by AI, SHALL always require human approval (`APPROVE`)"
   >
   > L435: "Every Sorter and Drafter model call SHALL be logged with the model and prompt version"
   >
   > L443: "AI Doers (here: Sorter and Drafter) SHALL be off for every firm"
3. **Proposed words.** Read **Writer** wherever "Drafter" names the AI drafter: "The **AI-assist writer** is the **Writer Doer** …"; "whether drafted by hand-invoked or recipe-called Writer"; "A Writer draft sent unedited counts as AI-written"; "Every Sorter and Writer model call …"; "AI Doers (here: Sorter and Writer) …".
4. **Why.** AIW-D53 (the founder: the AI Doer is the **Writer**; *Drafter* stays the template engine).
5. **Knock-ons.** CN-AG-11 item 1.

## 4. A Writer draft to a lead never carries a marked template; a person's own message is not blocked

1. **Where.** AG-10-15 (L377).
2. **Current words.**
   > L377: "The **AI-assist drafter** is the **Drafter Doer**, callable by the rep in the composer and by any recipe (AG11-D4)."
3. **Proposed words.** Add to AG-10-15 (with the item 3 rename): "A message the Writer drafted is an AI-drafted message: when any recipient is a lead, the composer SHALL refuse to send it if it contains or was built on a template marked as carrying status or eligibility content (AG-12-38 as proposed in CN-AG-12; the same check as AG-11-115, CN-AG-11 item 13), with the reason that eligibility reaches a lead only through the consultant's audited assessment share (AG-3-38). A message a person writes or sends by hand, without the Writer, is outside this check."
4. **Why.** AIW-D41 (the founder: no eligibility content "in any automatic or AI-drafted message to a lead"); `00-step3-plan.md` "Eligibility to leads, exact reach" (every automatic or AI-drafted send, refused at the send step; a person's own hand-written or hand-sent message is not blocked); review S3c-b N-1 (the composer had no enforcement point and AG-10 was missing from the knock-ons).
5. **Knock-ons.** AG-11-115 (CN-AG-11 item 13); AG-12-38 (CN-AG-12 item 1); AG-03 BR-19 (CN-AG-03 item 2); AW-1-90.

---

## Not changed here (pointers only)

- **WhatsApp, a team conflict stated, not settled.** AG-10 v1.10 still makes inbound, in-window and proactive WhatsApp Release 1 (for example AG-10-56 to AG-10-58), while SA-08 v2.4 SA8-D19 (L56) says "**WhatsApp: Phase 2; SMS: Phase 3.** Reverses AG11-D18(a)/(b) and AG11-D6 (WhatsApp in Release 1) — AG-10, AG-11, AG-16 to change (§0.2)". README §0 rule 11 would apply SA8-D19, the later team decision; the team's own pending knock-on SA8-X1 (L93) carries the change, so Workstream 2 writes none. The changes above do not depend on WhatsApp.
- The Conductor event `message.received` (AG-10-47) is unchanged; consent withdrawal becomes a Conductor trigger in AG-11 (CN-AG-11 item 4 (e)), emitted by SA-11 (SA-11-29, CN-SA-11 change 7); AG-10 BR-4 reads the same live consent state.
- Restricted fields in this module's exports follow CN-AG-07 item 1 (FD-15 kept, AG7-D28).
