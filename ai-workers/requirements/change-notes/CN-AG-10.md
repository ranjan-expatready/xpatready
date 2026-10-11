# CN-AG-10: change note to AG-10 Communication Hub

| Field | Value |
|---|---|
| Module changed | AG-10 Communication Hub |
| Version and file | v1.9 of 7 Oct 2026, `02-functional-requirements/agent/AG-10-communication-hub_v1.9_2026-10-07.md` (Drive snapshot of 9 Oct 2026; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-10-60 (highest AG-10-59, L449); §13 item 19 (highest item 18, L820) |
| Companion files | CN-AG-06 item 3 (payment matching); CN-AG-11 items 1 and 2; AW-01 (the Billing and Case assistants) |

**In plain words.** When a person links an unmatched email to a client, the product remembers "this address belongs to this client". That is right for a person's own address and wrong for a bank's or a payment processor's notice address: after one link, every later notice from that bank would file to the first client and count as a verified sender. This note adds a *shared sender* mark so such addresses are never learned. Two alignments follow: the Reader, not the Sorter, proposes an attachment's document type (the module's own §13 already says so), and the AI writing tool is now the Writer.

---

## 1. A *shared sender* mark: a bank's address is never learned as one client's

1. **Where.** AG-10-10 (L369); AG-10-12 (L371); AG-10-47 (L433); BR-7 (L461); new requirement **AG-10-60**; new §13 item **19**.
2. **Current words.**
   > L371: "a staff member SHALL link it in one action, which SHALL record the address↔Contact mapping for future matching."
   >
   > L369: "(2) sender/recipient address → Contact within `firm_id`"
3. **Proposed words.**
   > **AG-10-60 (shared senders).** The firm SHALL be able to mark a sender address as a **shared sender** (for example a bank's or a payment processor's notice address). For a shared sender: linking one of its messages SHALL NOT record the address↔Contact mapping of AG-10-12; address matching (AG-10-10, step 2) SHALL skip it; it SHALL NOT count as a verified sender (AG-10-47); and its messages SHALL always land in the Unmatched inbox for a person to link. The link action SHALL also offer **"do not learn this address"** for a single link. Setting or clearing the mark SHALL be audited; the permission is the team's to name.

   AG-10-12 adds "unless the address is a shared sender (AG-10-60) or the person chose not to learn it". New §13 item: "**19. One address mapped to two contacts.** AG-10 does not say how the matcher resolves an address that links have mapped to two different contacts; the team specifies it."
4. **Why.** `proposals.md` row of 10 Oct (Billing assistant, shared senders: "a *shared sender* mark on the firm's side (or a *do not learn this address* choice on the link) so that such senders are never mapped to a contact and always land in the Unmatched inbox for a person"); `billing-assistant.md` §9 G-4; `case-assistant.md` §9 G-34; `00-step2-decisions.md` §6 (the team list). Confidentiality of one client's payment details reaching another client's file is for counsel (`billing-assistant.md` §7 item 3).
5. **Knock-ons.** AG-06 Reconciliation view (CN-AG-06 item 3): an assistant never starts from a notice the matcher filed by itself; AG-11-94 verified-sender definition gains the exception; AG-16 may host the list of shared senders under the mailbox integration (the team's choice).

## 2. The Sorter files attachments; the Reader proposes their type

1. **Where.** AG-10-37(c) (L419).
2. **Current words.**
   > L419: "(c) **file each attachment to AG-9** with a proposed document type"
3. **Proposed words.** "(c) **file each attachment to AG-9** and hand it to the Reader, which proposes its document type (AG-9-42)".
4. **Why.** IMP-12, relied on by `case-assistant.md` §2 step 4; the module's own §13 item 12 (L814) is already decided: "the Reader — not the Sorter — classifies documents".
5. **Knock-ons.** AG-11 AG11-D4 and AG-11-67 (CN-AG-11 item 2).

## 3. The AI writing tool is the Writer

1. **Where.** AG11-D4 applied row (L32); AG-10-15 (L376); AG-10-44 (L430); AG-10-48 (L434); AG-10-54 (L442); every other place where "Drafter" names the AI drafter.
2. **Current words.**
   > L376: "The **AI-assist drafter** is the **Drafter Doer**, callable by the rep in the composer and by any recipe (AG11-D4)."
   >
   > L430: "AI-written text sent to a client, whether drafted by hand-invoked or recipe-called Drafter, and any template message whose body was edited by AI, SHALL always require human approval (`APPROVE`)"
   >
   > L434: "Every Sorter and Drafter model call SHALL be logged with the model and prompt version"
   >
   > L442: "AI Doers (here: Sorter and Drafter) SHALL be off for every firm"
3. **Proposed words.** Read **Writer** wherever "Drafter" names the AI drafter: "The **AI-assist writer** is the **Writer Doer** …"; "whether drafted by hand-invoked or recipe-called Writer"; "A Writer draft sent unedited counts as AI-written"; "Every Sorter and Writer model call …"; "AI Doers (here: Sorter and Writer) …".
4. **Why.** AIW-D53 (the founder: the AI Doer is the **Writer**; *Drafter* stays the template engine).
5. **Knock-ons.** CN-AG-11 item 1.

---

## Not changed here (pointers only)

- The Conductor event `message.received` (AG-10-47) is unchanged; consent withdrawal (BR-4) becomes a Conductor trigger in AG-11 (CN-AG-11 item 4).
- Restricted fields in this module's exports follow CN-AG-07 item 1 (FD-15 kept).
