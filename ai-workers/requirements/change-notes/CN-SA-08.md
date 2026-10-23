# Change note CN-SA-08: Platform Integrations and Infrastructure Rails

| | |
|---|---|
| **Document changed** | SA-08 Platform Integrations & Infrastructure Rails, version 2.4, dated 2026-10-10 |
| **Current base (15 Oct 2026, snapshot 1535; scrum 4b outcome 0 (e))** | **SA-08 v2.7**, `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-08-platform-integrations-and-infrastructure-rails_v2.7_2026-10-12.md` (identical to the 13 Oct 09:26 copy the re-base row checked). The re-base row says what stands, is withdrawn or is re-aimed; a quote or line number marked re-pointed, corrected or "v2.7" is the current file's; any other is the older version's and is history. |
| **Re-based 13 Oct 2026 (source reconciliation, `decisions.md` rows "Reconciliation renumbering" and "Lead rulings, source reconciliation")** | Checked against **SA-08 v2.7** (12 Oct 2026). **ID collision:** our SA-8-49 to SA-8-52 were taken (ZIP upload; WhatsApp provider connection, Release 1; calendar permissions; invoice-copy retry); renumbered **SA-8-49 → SA-8-66** (provider record), **SA-8-50 → SA-8-67** (status page and withdrawal), **SA-8-51 → SA-8-68** (every AI call under the published record), **SA-8-52 → SA-8-69** (government-page rail); "continue from" → SA-8-70; version row 2.5 → **2.8**. **Change 1 must quote the new BR-1** (v2.7): "only … the fixed provider list of SA8-D31 (Gmail, Microsoft 365, IMAP, Google / Microsoft calendar, one WhatsApp provider)"; AI and OCR providers are no longer named, and SA8-D31 says providers are a fixed list in code that a release adds to (the table row at L109: "not a console approval"). **Lead ruling, 13 Oct 2026 (`decisions.md`):** change 2's provider record is the console **record of the AI provider's terms** (region, no training, no retention, passed test call, publish, supersede, withdraw); the provider itself is added by a release, consistent with SA8-D31; the record does not approve a provider into the code list. **WhatsApp is Release 1** (SA8-D25 reverses SA8-D19; SA8-X1 and SA8-X11 withdrawn): drop every "Phase 2" caveat. SA8-D22 (Owner sign-off of e-sign wording) is superseded by SA8-D28: cite SA-12-27 alone for the Owner-publishes pattern. Status page: read-only for Owner, Admin, Support; "Background jobs" line (SA-8-63) is the product's own stuck-queue signal. Line numbers and quotes below are v2.4's. |
| **Changed 14 Oct 2026 (the founder's AIW-D147)** | Change 2: the provider record's processing region may be in **Canada or the United States** (was Canada only, AIW-D52), never global routing; the no-training and zero-retention terms and the passed test call are unchanged. Applies to every AI call Expat Ready makes (AIW-D74 correction 2). |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-08-platform-integrations-and-infrastructure-rails_v2.4_2026-10-10.md` |
| **Date of this note** | **12 Oct 2026 (change 3 amended: the fetch rail's switch-on condition, the Lead's ruling under AIW-D94 and D83)**; earlier 11 Oct 2026 (sixth round: the founder's Step 3 batch, AIW-D74: SA-8-68 covers every Expat Ready AI call; a withdrawal also pauses the Pack author's AI) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-08's own style (plain present tense).
4. Why: the founder decision, improvement or gap behind the change.
5. What else must change.

**What changed on 9 and 10 Oct (history), and what that does to this note.** SA-08 v2.3 (brought into the master set as v2.4 on 10 Oct) rewrote the module:
- Expat Ready's own service keys are held by the engineer and "never entered, shown or changed in the console, not even by the Owner" (SA8-D1, L33).
- The console has a read-only **Integrations status page** with alerts.
- Health logs, connectivity tests and the residency generator are removed (SA8-D9, SA8-D12).
- WhatsApp moves to Phase 2 (SA8-D19, L56).

So change 2 proposes only a **record of terms**: provider, processing region (Canada or the United States, AIW-D147), no-training and zero-retention terms, and a **passed** test call. The provider's keys stay with the engineer.

**This note is the one home of the provider record** (`00-step3-plan.md`, "The provider record"). CN-AG-11, CN-AG-16, AW-01 and AW-02 cite SA-8-66 and do not restate its contents.

New requirements continue from SA-8-66 (L23). This note uses SA-8-66 to SA-8-69.

**Why this document matters to AI.** The team's AG-11 keeps every AI Doer switched off "until the Super Admin records the provider, the processing region (Canada only, AG11-D15) and a no-training/no-retention agreement (SA-08 / SA-11)" (AG-11 v1.13 AG11-D13, L44). SA-08 v2.7 has no place for that record (it has no SA-8-66 or above).

---

## 1. BR-1 names the AI and OCR provider among the approved providers

> **Re-based 13 Oct 2026 (source reconciliation).** SA-08 v2.7 BR-1 now reads: "only … the fixed provider list of SA8-D31 (Gmail, Microsoft 365, IMAP, Google / Microsoft calendar, one WhatsApp provider)"; the AG11-D14 wording below is gone, and SA8-D31 says providers are a fixed list in code that a release adds to, "not a console approval" (L109). **The proposal now reads:** BR-1 adds "the AI and OCR provider recorded under SA-8-66" to that fixed list, and the read-only government source rail (SA-8-69); the provider record of change 2 records the provider's terms, region, test call and withdrawal, and never adds a provider to the code list (Lead ruling, 13 Oct 2026, `decisions.md`). WhatsApp is Release 1 (SA8-D25), so "later WhatsApp, Phase 2" is dropped.

**(1) What it changed, as first written (history; the box above gives today's proposal).** SA-08 v2.4 BR-1 (L311); today the rule is SA-08 v2.7 BR-1 (L441).

**(2) Current words.**

L311:
> - **BR-1** *(changed v2.3)* No third-party product tools; only infrastructure services and the approved providers of AG11-D14 (mailbox; later WhatsApp).

**(3) Proposed words.**
> - **BR-1** *(changed v2.3; changed — AG11-D14)* No third-party product tools; only infrastructure services and the approved providers of AG11-D14 (**AI and OCR processing**, mailbox; later WhatsApp, Phase 2), and the read-only government source rail (SA-8-69).

**(4) Why.**
- The team's AG11-D14 (AG-11 v1.13, L45) allows outside providers for "**AI and OCR processing, WhatsApp, and connecting a firm's own mailbox**".
- SA-08 v2.7 applies AG11-D14 as a fixed list in code (§0 "Aligned with", L109: "Outside providers only for AI/OCR, WhatsApp and mailbox connections (*v2.6: a fixed list in code, not a console approval — SA8-D31*)"). BR-1 (L441), however, leaves AI and OCR out.
- IMP-6. WhatsApp is Release 1 (SA-08 v2.7 SA8-D25); no AI change here relies on it.
- The read-only rail is a further outbound shape that AG11-D14 and AG-11-3 do not list (change 3).

**(5) Knock-ons.** AG-11-3 (AG-11 v1.13, L562): reconciling its list with the read-only rail is a team decision (CN-AG-11).

---

## 2. A record of the AI provider's terms, with a passed test call, published and withdrawn by the Owner

**(1) What it changes.**
- a new §3.10 (renumbered 14 Oct 2026: SA-08 v2.7 uses §3.9 for its settings);
- new requirements SA-8-66 to SA-8-68;
- §7 entities (L337–L344);
- §10 permissions (L384–L392);
- the status page (§3.2; SA-8-26, L277).

**(2) Current words.**

L277:
> - **SA-8-26** *(changed v2.3 — SA8-D1)* A read-only Integrations status page shows each Expat Ready service's state, key facts and last error.

L390:
> | *(no key)* | — | Expat Ready service keys cannot be viewed or changed through the console by any role |

SA-08 v2.7 names AI and OCR only as a kind of outside provider (the AG11-D14 row) and records no AI or OCR provider.

**(3) Proposed words.**

New §3.10 "AI and OCR provider: the terms record" (summary paragraph). New requirements:
> - **SA-8-66** *(new — AG11-D13, AG11-D14, AG11-D15; AIW-D52, AIW-D69; region rule changed by AIW-D147, 14 Oct 2026)* Before any AI or OCR processing of a firm's or client's data runs, an **AI provider record** is entered and published. It holds:
>   - the provider name and contract reference;
>   - the **processing region or regions** where each model call may run: Canada, the United States, or a cross-region profile whose destination regions are all in Canada or the United States, recorded with the profile's destination list (for Bedrock, from GetInferenceProfile); never a global profile or any route that can process outside Canada and the United States (AIW-D147);
>   - the **no-training** and **no-retention** terms, each with the provider's own page or contract clause and the date checked;
>   - a **test call through that route that passed** (date, model, outcome, who ran it);
>   - who entered it, who approved it, and when.
>
>   The record is published only if every destination region is in Canada or the United States **and the test call passed**. A record with any other region, or with a test call that failed or is missing, is refused with a clear reason (SA-11-37). The provider's keys are not part of the record; the engineer sets them at deploy like every service key (SA8-D1).
>
>   **Replacing the provider.** A new provider is a new record under the same rules. Only one record is published at a time: publishing the new record marks the old one **Superseded** at the same moment, and new model calls move to the new provider with no pause. Only a withdrawal with no published successor pauses work (SA-8-67). Until a published record exists, the AI switch of every firm stays locked (AG-11-93, AG-16-35).
> - **SA-8-67** *(new)* The Integrations status page shows the AI provider as one line: working or not, processing region, the record's version and the last error. A red line alerts the Owner and engineer (SA-8-27). The Owner may **withdraw** the published record, with a reason, under `system/ai-provider:publish`. Withdrawing it with no published successor stops at once the model calls the record governs, and pauses with the reason `PROVIDER_RECORD_WITHDRAWN` (AG-11-113 (e), CN-AG-11 change 6) only the waiting items of the assistants whose calls it governs: the four firm assistants (AIW-D90), the Support AI and the Pack author's AI (AIW-D74). It pauses no other waiting item.
> - **SA-8-68** *(new — AIW-D52, AIW-D74, as corrected by AIW-D147)* **Every AI call Expat Ready makes** runs only under the published record, so in Canada or the United States: its calls on **support tickets** (AIW-D52) and every other own call, including the Pack author's AI drafting pack content that holds no client data (AIW-D74). The Pack author's AI may make model calls once the record is published.

§7 gains: "**AI provider record** *(new)* — provider, contract reference, processing region, no-training and no-retention terms with source and date checked, test call (date, model, outcome — passed or failed, who ran it), version, status Draft / Published / Superseded / Withdrawn, entered by, approved by, approved at, superseded by, withdrawn by and reason. At most one record is Published. No keys."

§10 gains:
> | `system/ai-provider:edit` | **new** *(proposal)* | Enter or change the AI provider record (not its keys) — Platform engineer, Owner |
> | `system/ai-provider:publish` | **new** *(proposal)* | Approve and publish the AI provider record, never one's own entry; withdraw the published record — **Owner only** |

**The platform's other own AI calls: decided.** Whether the same record governs Expat Ready's own platform AI calls that hold no client data, such as the Pack author's AI drafting pack content, was open point 3 of CN-FDL. The founder decided it on 11 Oct 2026 (AIW-D74, "Yes, Canada for all AI"), and SA-8-68 above now states it, credited to AIW-D74, not to AIW-D52.

**(4) Why.**
- **IMP-6** asks for the record: "provider name, contract reference, processing region, no-training and no-retention terms (both, matching AG-11; AG-16 L577 says only "no-training"), approval date and approver".
- **AG11-D13** (AG-11 v1.13, L44): AI Doers are "**off for every firm** until the Super Admin records the provider, the processing region (Canada only, AG11-D15) and a no-training/no-retention agreement (SA-08 / SA-11)".
- **AIW-D52** ("Only in Canada"): AI processing of client data "for firms' data and Expat Ready's own support tickets", with the provider "confirmed by one test call … if no capable option passes, the Lead returns to the founder".
- **AIW-D69:** the team's tech lead runs the test call; "the result goes into the provider record the product requires before the AI switch unlocks (AG-16-35, AG-11-93)".
- **The Step 3 shared rule on the provider record:** it requires a *passed* test call (`00-step3-plan.md`, "The provider record"; re-check S3a-b R-2). The open question that rule left to the founder is now decided by AIW-D74.
- **AIW-D74**, 11 Oct 2026, "Yes, Canada for all AI" (quoted in CN-FDL): every Expat Ready AI call, pack drafting included, runs under the one published provider record (SA-8-66); the region is now Canada or the United States (AIW-D147). The plan rule "Pack calls before the founder answers" is superseded.
- **What a withdrawal pauses.** It pauses the waiting items of the assistants whose calls the record governs (`00-step3-plan.md`, "Withdrawn provider record, reach"); since AIW-D74 that includes the Pack author's AI.
- **Replacing a provider** needed its own status so that two records are never live at once and a planned change does not stop work (re-check S3a-d m-6).
- **The pause reason.** CN-AG-11 change 6 (AG-11-113) is the one home of the four pause reasons, `PROVIDER_RECORD_WITHDRAWN` among them.
- **Owner approval** follows SA8-D22 (L59): e-sign wording is "**approved and published by the Owner**". Withdrawing a live record is the same Owner act in reverse, so it uses the same key (re-check S3a-c m-10).

**(5) Knock-ons.**
- SA-11 (CN-SA-11 changes 1 and 2).
- AG-11-93, AG-11-73 and AG-16-35 cite SA-8-66; AG-11-113 holds the withdrawal pause (CN-AG-11 changes 6 and 8, CN-AG-16).
- SA-07 Appendix A rows (CN-SA-07 change 1).
- SA-06 catalogue (CN-SA-06 change 4).

---

## 3. A read-only rail for government source pages (the Pack author's watcher)

**(1) What it changes.**
- a new §3.10;
- a new requirement SA-8-69;
- §13 (L431, "None open for SA-8"): one question, now unconfirmed Lead guidance; no counsel (AIW-D94).

**(2) Current words.**

L431:
> **None open for SA-8.**

AG-11-3 (AG-11 v1.13, L562) allows outside providers "only for AI/OCR processing, WhatsApp and the connection of a firm's own mailbox".

**(3) Proposed words.**

New §3.10 "Government source pages, read-only":
> - **SA-8-69** *(new — proposals row of 10 Oct, Pack author's assistant, outbound fetch)* The platform may fetch **public government web pages** only from the addresses recorded as a content item's government source under SA-1B-39, to compare them with the last stored copy. It never fetches an address found on a fetched page. It sends no client or firm data and carries no credentials. It stores only the page text needed for the next comparison, kept for ~~the period counsel sets~~ a period not yet set (Unknown; *superseded by AIW-D94: no counsel; question 8 is the Lead's unconfirmed guidance*). Every fetch is logged with the address, time and outcome; a failing fetch shows on the status page (SA-8-26).

§13 "None open for SA-8." becomes:
> 1. ~~**Government page fetching (counsel).** *(new)* Confirm the terms of use of the government sites recorded as sources and the Crown copyright position for storing page copies, and set how long stored copies are kept, before SA-8-69 is switched on.~~ *Superseded 12 Oct 2026 by AIW-D94 (no counsel). The Lead's ruling (c) after review R9 (`ai-workers/proposals.md`, row after review R9): SA-8-69 is switched on, after the Platform Owner has recorded a check of each recorded government site's current terms of use (who, when, result; the Lead's guidance for consistency with AIW-D113, review R10 m14), when the watcher's skill has passed its driving test (AIW-D83) and the Platform Owner switches it on, recorded; no counsel gate. Site terms, Crown copyright and how long stored copies are kept stay the Lead's guidance, "Unconfirmed: no counsel (AIW-D94)"; retention stays Unknown until set.*

**(4) Why.**
- Proposals row of 10 Oct (Pack author's AI, outbound fetch).
- AW-2-53, AW-2-54.
- AIW-D54 item 7 keeps the Pack author's AI read-only.
- The counsel pack's question 8 covers "stored government-page copies".
- The fetch and its comparison are rule-built steps, not model calls; the Writer's description of a change runs once the provider record is published (AIW-D74).

**(5) Knock-ons.**
- SA-01B SA-1B-39 (CN-SA-01B change 4).
- AG-11-3 (CN-AG-11).
- AW-02.
- The counsel pack, now the Lead's unconfirmed guidance (AIW-D94).

---

## 4. Document control and numbering

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L23).

**(2) Current words.**

L23 (extract):
> New requirements continue from SA-8-66.

**(3) Proposed words.**
- A version row (renumbered 13 Oct 2026; 2.5 to 2.7 are the team's): "| 2.8 | *(date placed)* | Workstream 2 change note CN-SA-08 applied: BR-1 names the AI and OCR provider; AI provider terms record with a passed test call, published, superseded and withdrawn by the Owner, a withdrawal pausing only the assistants the record governs (SA-8-66 – SA-8-68); read-only government source rail (SA-8-69); counsel question 1. | AG11-D13 – D15; AIW-D52, AIW-D69 |".
- L23 (v2.7's highest is SA-8-65): "continue from SA-8-70".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
