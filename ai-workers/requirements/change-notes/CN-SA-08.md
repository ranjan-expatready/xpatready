# Change note CN-SA-08: Platform Integrations and Infrastructure Rails

| | |
|---|---|
| **Document changed** | SA-08 Platform Integrations & Infrastructure Rails, version 2.4, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-08-platform-integrations-and-infrastructure-rails_v2.4_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (fix round after review S3a; re-based from v2.2 to v2.4) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-08's own style (plain present tense).
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`).
5. What else must change.

**What changed on 9 and 10 Oct, and what that does to this note.** SA-08 v2.3 (9 Oct, brought into the master set as v2.4 on 10 Oct) rewrote the module. Four of its decisions shape this note:
- Expat Ready's own service keys are held by the engineer and "never entered, shown or changed in the console, not even by the Owner" (SA8-D1, L33).
- The console has a read-only **Integrations status page** with alerts.
- Health logs, connectivity tests and the residency generator are removed (SA8-D9, SA8-D12).
- WhatsApp moves to Phase 2 (SA8-D19, L56).

So the first version's provider "entry" with credentials, connectivity health and a generated residency feed is **withdrawn**. Change 2 now proposes only a **record of terms**: provider, Canadian region, no-training and no-retention terms, and the test call. The provider's keys stay with the engineer. The record shows on the status page.

New requirements continue from SA-8-49 (L23); this note uses SA-8-49 to SA-8-52.

**Why this document matters to AI at all.** The team's AG-11 keeps every AI Doer and assistant switched off "until the Super Admin records the provider, the processing region (Canada only, AG11-D15) and a no-training/no-retention agreement (SA-08 / SA-11)" (AG-11 v1.12 AG11-D13, L43). SA-08 v2.4 has no place for that record. Until change 2 lands, no firm can switch AI on.

---

## 1. BR-1 names the AI and OCR provider among the approved providers

**(1) What it changes.** SA-08 v2.4 BR-1 (L311).

**(2) Current words.**

L311:
> - **BR-1** *(changed v2.3)* No third-party product tools; only infrastructure services and the approved providers of AG11-D14 (mailbox; later WhatsApp).

**(3) Proposed words.**
> - **BR-1** *(changed v2.3; changed — AG11-D14)* No third-party product tools; only infrastructure services and the approved providers of AG11-D14 (**AI and OCR processing**, mailbox; later WhatsApp, Phase 2), and the read-only government source rail (SA-8-52).

**(4) Why.**
- The team's own AG11-D14 (AG-11 v1.12, L44) allows outside providers for "**AI and OCR processing, WhatsApp, and connecting a firm's own mailbox**".
- SA-08 v2.4 already applies AG11-D14 (§0 "Aligned with", L70: "Outside providers only for AI/OCR, WhatsApp and mailbox connections, approved by Super Admin"), but BR-1 leaves AI and OCR out.
- IMP-6. Proposals row of 9 Oct (carve-out A, three internal contradictions, item (c)).
- WhatsApp is Phase 2 (SA8-D19). No AI change in this set of notes relies on WhatsApp.
- The read-only rail is a further outbound shape that AG11-D14 and AG-11-3 do not list (change 3; review S3a m-19).

**(5) Knock-ons.** AG-11-3 (AG-11 v1.12, L555) lists the read-only rail beside the three provider kinds. That is a team decision, carried by CN-AG-11.

---

## 2. A record of the AI provider's terms, approved by the Owner, shown on the status page

**(1) What it changes.**
- a new §3.9;
- new requirements SA-8-49 to SA-8-51;
- §7 entities (L337–L344);
- §10 permissions (L384–L392);
- the status page (§3.2, SA-8-26, L298).

**(2) Current words.**

L298:
> - **SA-8-26** *(changed v2.3 — SA8-D1)* A read-only Integrations status page shows each Expat Ready service's state, key facts and last error.

L390:
> | *(no key)* | — | Expat Ready service keys cannot be viewed or changed through the console by any role |

SA-08 v2.4 has no AI or OCR provider anywhere.

**(3) Proposed words.**

New §3.9 "AI and OCR provider: the terms record" (summary paragraph). New requirements:
> - **SA-8-49** *(new — AG11-D13, AG11-D14, AG11-D15; AIW-D52, AIW-D69)* Before any AI or OCR processing runs, an **AI provider record** is entered and published. It holds:
>   - the provider name and contract reference;
>   - the **processing region** where each model call runs;
>   - the **no-training** and **no-retention** terms, each with the provider's own page or contract clause and the date checked;
>   - the result of a **test call** made from that region (date, model, outcome, who ran it);
>   - who entered it, who approved it, and when.
>
>   The record is accepted only if the processing region is in Canada; any other region is refused with a clear reason (SA-11-32). The provider's keys are not part of the record: the engineer sets them at deploy like every service key (SA8-D1). Replacing the provider is a new record under the same rules. Until a published record exists, the AI switch of every firm stays locked (AG-11-93, AG-16-35).
> - **SA-8-50** *(new)* The Integrations status page shows the AI provider as one line: working or not, processing region, the record's version and last error. A red line alerts the Owner and engineer (SA-8-27). Withdrawing the published record stops new AI processing at once; waiting work follows SA-12-31.
> - **SA-8-51** *(new — proposal)* The same published record serves Expat Ready's own AI assistants. AIW-D52 already requires it for their calls on support tickets. Whether it also covers their other own calls, which hold no client data (pack content), is a question for the founder (CN-FDL open point 3). The proposal is one record for both planes.

§7 gains: "**AI provider record** *(new)* — provider, contract reference, processing region, no-training and no-retention terms with source and date checked, test-call result, version, status Draft / Published / Withdrawn, entered by, approved by, approved at. No keys."

§10 gains:
> | `system/ai-provider:edit` | **new** *(proposal)* | Enter or change the AI provider record (not its keys) — Platform engineer, Owner |
> | `system/ai-provider:publish` | **new** *(proposal)* | Approve and publish the AI provider record — **Owner only**, never one's own entry |

**(4) Why.**
- **IMP-6** asks for the record, with "provider name, contract reference, processing region, no-training and no-retention terms (both, matching AG-11; AG-16 L577 says only "no-training"), approval date and approver". IMP-6's health feed and residency-generator feed are not proposed, because SA8-D9 and SA8-D12 removed them.
- **AG11-D13** (AG-11 v1.12, L43): AI Doers are "**off for every firm** until the Super Admin records the provider, the processing region (Canada only, AG11-D15) and a no-training/no-retention agreement (SA-08 / SA-11)".
- **AIW-D52** ("Only in Canada", for firms' data and Expat Ready's own support tickets; "confirmed by one test call").
- **AIW-D69:** the test call by the team's tech lead; "the result goes into the provider record the product requires before the AI switch unlocks (AG-16-35, AG-11-93)".
- **The Step 3 shared rule:** "The provider is replaceable: no requirement names a provider; the residency rule, the no-training and no-retention agreement and the test call are requirements on the provider record" (`00-step3-plan.md`).
- **Owner approval** follows SA-08's own pattern for legal settings, SA8-D22 (L59): e-sign wording is "**approved and published by the Owner**". Review S3a m-13 asked for a second person or the Owner only on the record that unlocks AI for every firm.
- **SA-8-51 is a proposal**, not D52 (review S3a M-2).

**(5) Knock-ons.**
- SA-11 (CN-SA-11 changes 1 and 2).
- SA-12-31 (CN-SA-12 change 1).
- AG-11-93 and AG-16-35 point to SA-8-49 (CN-AG-11, CN-AG-16).
- SA-07 Appendix A rows (CN-SA-07 change 1).
- SA-06 catalogue (CN-SA-06 change 4).
- AW-02 §10 table E replaces `system/integration:manage`, which SA-08 v2.4 withdrew (L392), with these two keys.

---

## 3. A read-only rail for government source pages (the Pack author's watcher)

**(1) What it changes.**
- a new §3.10;
- a new requirement SA-8-52;
- §0.1 or §13 (L429–L431, "None open for SA-8"): one counsel question.

**(2) Current words.**

L431:
> **None open for SA-8.**

AG-11-3 (AG-11 v1.12, L555) allows outside providers "only for AI/OCR processing, WhatsApp and the connection of a firm's own mailbox".

**(3) Proposed words.**

New §3.10 "Government source pages, read-only":
> - **SA-8-52** *(new — proposals row of 10 Oct, Pack author's assistant, outbound fetch)* The platform may fetch **public government web pages** only from the addresses recorded as a content item's government source under SA-1B-39, to compare them with the last stored copy. It never fetches an address found on a fetched page, sends no client or firm data, carries no credentials, and stores only the page text needed for the next comparison, kept for the period counsel sets. Every fetch is logged with the address, time and outcome; a failing fetch shows on the status page (SA-8-26).

§13 "None open for SA-8." becomes:
> 1. **Government page fetching (counsel).** *(new)* Confirm the terms of use of the government sites recorded as sources and the Crown copyright position for storing page copies, and set how long stored copies are kept, before SA-8-52 is switched on.

**(4) Why.**
- Proposals row of 10 Oct (Pack author's assistant). It describes the watcher, which "fetches government pages on a schedule … an outbound call to a third party which AG-11-3 does not list". Its recommendation: "add a *government source pages, read-only* rail entry to SA-08 (the IMP-6 pattern), limited to the addresses recorded as sources under SA-1B-39, never an address found on a page, with the stored copies under a retention counsel sets; counsel confirms the sites' terms of use and Crown copyright first".
- `pack-authors-assistant.md` §9 G-3 and G-21.
- AIW-D54 item 7 keeps the Pack author's assistant read-only. This rail reads pages and writes nothing into the pack.

**(5) Knock-ons.**
- SA-01B SA-1B-39 (CN-SA-01B change 4).
- AG-11-3 (CN-AG-11; review S3a m-19: reconciling AG-11-3's list is a team decision).
- AW-02 (the watcher).
- Counsel pack item (AIW-D68).

---

## 4. Document control and numbering

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L23).

**(2) Current words.**

L23 (extract):
> New requirements continue from SA-8-49.

**(3) Proposed words.**
- A version row: "| 2.5 | *(date placed)* | Workstream 2 change note CN-SA-08 applied: BR-1 names the AI and OCR provider; AI provider terms record (SA-8-49 – SA-8-51), Owner-published; read-only government source rail (SA-8-52); counsel question 1. | AG11-D13 – D15; AIW-D52, AIW-D69 |".
- L23: "continue from SA-8-53".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
