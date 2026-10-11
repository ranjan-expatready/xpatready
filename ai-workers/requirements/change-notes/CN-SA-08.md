# Change note CN-SA-08: Platform Integrations and Infrastructure Rails

| | |
|---|---|
| **Document changed** | SA-08 Platform Integrations & Infrastructure Rails, version 2.4, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-08-platform-integrations-and-infrastructure-rails_v2.4_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (fourth round, after re-check S3a-c) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-08's own style (plain present tense).
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`).
5. What else must change.

**What changed on 9 and 10 Oct, and what that does to this note.** SA-08 v2.3 (brought into the master set as v2.4 on 10 Oct) rewrote the module:
- Expat Ready's own service keys are held by the engineer and "never entered, shown or changed in the console, not even by the Owner" (SA8-D1, L33).
- The console has a read-only **Integrations status page** with alerts.
- Health logs, connectivity tests and the residency generator are removed (SA8-D9, SA8-D12).
- WhatsApp moves to Phase 2 (SA8-D19, L56).

So change 2 proposes only a **record of terms**: provider, Canadian region, no-training and no-retention terms, and a **passed** test call. The provider's keys stay with the engineer.

**This note is the one home of the provider record** (`00-step3-plan.md`, "The provider record"). CN-AG-11, CN-AG-16, AW-01 and AW-02 cite SA-8-49 and do not restate its contents.

New requirements continue from SA-8-49 (L23). This note uses SA-8-49 to SA-8-52.

**Why this document matters to AI.** The team's AG-11 keeps every AI Doer switched off "until the Super Admin records the provider, the processing region (Canada only, AG11-D15) and a no-training/no-retention agreement (SA-08 / SA-11)" (AG-11 v1.12 AG11-D13, L43). SA-08 v2.4 has no place for that record.

---

## 1. BR-1 names the AI and OCR provider among the approved providers

**(1) What it changes.** SA-08 v2.4 BR-1 (L311).

**(2) Current words.**

L311:
> - **BR-1** *(changed v2.3)* No third-party product tools; only infrastructure services and the approved providers of AG11-D14 (mailbox; later WhatsApp).

**(3) Proposed words.**
> - **BR-1** *(changed v2.3; changed — AG11-D14)* No third-party product tools; only infrastructure services and the approved providers of AG11-D14 (**AI and OCR processing**, mailbox; later WhatsApp, Phase 2), and the read-only government source rail (SA-8-52).

**(4) Why.**
- The team's AG11-D14 (AG-11 v1.12, L44) allows outside providers for "**AI and OCR processing, WhatsApp, and connecting a firm's own mailbox**".
- SA-08 v2.4 already applies AG11-D14 (§0 "Aligned with", L70: "Outside providers only for AI/OCR, WhatsApp and mailbox connections, approved by Super Admin"). BR-1, however, leaves AI and OCR out.
- IMP-6. WhatsApp is Phase 2 (SA8-D19); no AI change here relies on it.
- The read-only rail is a further outbound shape that AG11-D14 and AG-11-3 do not list (change 3).

**(5) Knock-ons.** AG-11-3 (AG-11 v1.12, L555): reconciling its list with the read-only rail is a team decision (CN-AG-11).

---

## 2. A record of the AI provider's terms, with a passed test call, published and withdrawn by the Owner

**(1) What it changes.**
- a new §3.9;
- new requirements SA-8-49 to SA-8-51;
- §7 entities (L337–L344);
- §10 permissions (L384–L392);
- the status page (§3.2; SA-8-26, L277).

**(2) Current words.**

L277:
> - **SA-8-26** *(changed v2.3 — SA8-D1)* A read-only Integrations status page shows each Expat Ready service's state, key facts and last error.

L390:
> | *(no key)* | — | Expat Ready service keys cannot be viewed or changed through the console by any role |

SA-08 v2.4 has no AI or OCR provider anywhere.

**(3) Proposed words.**

New §3.9 "AI and OCR provider: the terms record" (summary paragraph). New requirements:
> - **SA-8-49** *(new — AG11-D13, AG11-D14, AG11-D15; AIW-D52, AIW-D69)* Before any AI or OCR processing of a firm's or client's data runs, an **AI provider record** is entered and published. It holds:
>   - the provider name and contract reference;
>   - the **processing region** where each model call runs;
>   - the **no-training** and **no-retention** terms, each with the provider's own page or contract clause and the date checked;
>   - a **test call made from that region that passed** (date, model, outcome, who ran it);
>   - who entered it, who approved it, and when.
>
>   The record is published only if the processing region is in Canada **and the test call passed**. A record with any other region, or with a test call that failed or is missing, is refused with a clear reason (SA-11-32). The provider's keys are not part of the record; the engineer sets them at deploy like every service key (SA8-D1). Replacing the provider is a new record under the same rules. Until a published record exists, the AI switch of every firm stays locked (AG-11-93, AG-16-35).
> - **SA-8-50** *(new)* The Integrations status page shows the AI provider as one line: working or not, processing region, the record's version and the last error. A red line alerts the Owner and engineer (SA-8-27). The Owner may **withdraw** the published record, with a reason, under `system/ai-provider:publish`; withdrawing stops new AI processing at once, and every AI-prepared item already waiting is paused with the reason `PROVIDER_RECORD_WITHDRAWN` (CN-AG-11 change 6, AG-11-112 (e)).
> - **SA-8-51** *(new — AIW-D52)* Expat Ready's own AI calls on **support tickets** run only under the published record, since AIW-D52 requires Canada-only processing for them.

§7 gains: "**AI provider record** *(new)* — provider, contract reference, processing region, no-training and no-retention terms with source and date checked, test call (date, model, outcome — passed or failed, who ran it), version, status Draft / Published / Withdrawn, entered by, approved by, approved at, withdrawn by and reason. No keys."

§10 gains:
> | `system/ai-provider:edit` | **new** *(proposal)* | Enter or change the AI provider record (not its keys) — Platform engineer, Owner |
> | `system/ai-provider:publish` | **new** *(proposal)* | Approve and publish the AI provider record, never one's own entry; withdraw the published record — **Owner only** |

**Not proposed here: the platform's other own AI calls.** Whether the same record governs Expat Ready's own platform AI calls that hold no client data, such as the Pack author's assistant drafting pack content, is **open point 3 of CN-FDL, for the founder**. AIW-D52 does not decide it. No requirement here states it, and it is not credited to AIW-D52.

**(4) Why.**
- **IMP-6** asks for the record: "provider name, contract reference, processing region, no-training and no-retention terms (both, matching AG-11; AG-16 L577 says only "no-training"), approval date and approver".
- **AG11-D13** (AG-11 v1.12, L43): AI Doers are "**off for every firm** until the Super Admin records the provider, the processing region (Canada only, AG11-D15) and a no-training/no-retention agreement (SA-08 / SA-11)".
- **AIW-D52** ("Only in Canada"): AI processing of client data "for firms' data and Expat Ready's own support tickets", with the provider "confirmed by one test call … if no capable option passes, the Lead returns to the founder".
- **AIW-D69:** the team's tech lead runs the test call; "the result goes into the provider record the product requires before the AI switch unlocks (AG-16-35, AG-11-93)".
- **The Step 3 shared rule on the provider record:** "it requires a *passed* test call … Whether the same record governs Expat Ready's own platform AI calls with no client data is the founder's open question (CN-FDL open point 3); until he answers, no file states it as a SHALL or credits it to AIW-D52" (`00-step3-plan.md`; re-check S3a-b R-2).
- **The pause reason.** CN-AG-11 change 6 is the one home of the four pause reasons, `PROVIDER_RECORD_WITHDRAWN` among them.
- **Owner approval** follows SA8-D22 (L59): e-sign wording is "**approved and published by the Owner**". Withdrawing a live record is the same Owner act in reverse, so it uses the same key (re-check S3a-c m-10).

**(5) Knock-ons.**
- SA-11 (CN-SA-11 changes 1 and 2).
- AG-11-93, AG-11-73 and AG-16-35 cite SA-8-49; AG-11-112 holds the withdrawal pause (CN-AG-11 changes 6 and 8, CN-AG-16).
- SA-07 Appendix A rows (CN-SA-07 change 1).
- SA-06 catalogue (CN-SA-06 change 4).

---

## 3. A read-only rail for government source pages (the Pack author's watcher)

**(1) What it changes.**
- a new §3.10;
- a new requirement SA-8-52;
- §13 (L431, "None open for SA-8"): one counsel question.

**(2) Current words.**

L431:
> **None open for SA-8.**

AG-11-3 (AG-11 v1.12, L555) allows outside providers "only for AI/OCR processing, WhatsApp and the connection of a firm's own mailbox".

**(3) Proposed words.**

New §3.10 "Government source pages, read-only":
> - **SA-8-52** *(new — proposals row of 10 Oct, Pack author's assistant, outbound fetch)* The platform may fetch **public government web pages** only from the addresses recorded as a content item's government source under SA-1B-39, to compare them with the last stored copy. It never fetches an address found on a fetched page. It sends no client or firm data and carries no credentials. It stores only the page text needed for the next comparison, kept for the period counsel sets (Unknown, counsel question 8). Every fetch is logged with the address, time and outcome; a failing fetch shows on the status page (SA-8-26).

§13 "None open for SA-8." becomes:
> 1. **Government page fetching (counsel).** *(new)* Confirm the terms of use of the government sites recorded as sources and the Crown copyright position for storing page copies, and set how long stored copies are kept, before SA-8-52 is switched on.

**(4) Why.**
- Proposals row of 10 Oct (Pack author's assistant, outbound fetch).
- `pack-authors-assistant.md` §9 G-3 and G-21.
- AIW-D54 item 7 keeps the Pack author's assistant read-only.
- The counsel pack's question 8 covers "stored government-page copies".

**(5) Knock-ons.**
- SA-01B SA-1B-39 (CN-SA-01B change 4).
- AG-11-3 (CN-AG-11).
- AW-02.
- The counsel pack (AIW-D68).

---

## 4. Document control and numbering

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L23).

**(2) Current words.**

L23 (extract):
> New requirements continue from SA-8-49.

**(3) Proposed words.**
- A version row: "| 2.5 | *(date placed)* | Workstream 2 change note CN-SA-08 applied: BR-1 names the AI and OCR provider; AI provider terms record with a passed test call, published and withdrawn by the Owner (SA-8-49 – SA-8-51); read-only government source rail (SA-8-52); counsel question 1. | AG11-D13 – D15; AIW-D52, AIW-D69 |".
- L23: "continue from SA-8-53".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
