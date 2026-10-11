# Change note CN-SA-08: Platform Integrations and Infrastructure Rails

| | |
|---|---|
| **Document changed** | SA-08 Platform Integrations & Infrastructure Rails, version 2.2, dated 2026-10-02 |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-08-platform-integrations-and-infrastructure-rails_v2.2_2026-10-02.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 3 |

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID, section and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words, in SA-08's own style; (4) why, pointing to the founder's Workstream 2 decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`); (5) what else must change. The AI assistants are specified in Workstream 2's AW-01 and AW-02 build specifications; this note only gives them the place in SA-08 they need.

**Plain words used here.** *Rail*: a commodity pipe Expat Ready pays a vendor for (storage, email relay, payment processor, gateway). *AI provider*: the outside service that runs the AI model and reads text from images. *Read-only rail*: an outbound connection that only fetches public pages and never sends client data.

**Why this document matters to AI at all.** The team's AG-11 keeps every AI Doer and assistant switched off "until the Super Admin records the provider, the processing region (Canada only, AG11-D15) and a no-training/no-retention agreement (SA-08 / SA-11)" (AG-11 v1.11 AG11-D13, L42). SA-08 today has nowhere to record that, and its own words would reject it (IMP-6). Until changes 1 and 2 land, no firm can switch AI on.

---

## 1. Allow approved processing providers, as AG11-D14 decided

**(1) What it changes.** SA-08 v2.2 framing paragraph "The one framing that governs this whole module" (L23); §3.0 "Why this matters for the spec" (L163); BR-1 (L419).

**(2) Current words.**

L23 (extract, first two sentences):
> **The one framing that governs this whole module.** **Expat Ready has NO third-party product-tool integrations.** There is no DocuSign, no Calendly, no QuickBooks, no Mailchimp to "connect."

L163 (extract):
> There is deliberately **no fourth shape** ("connect a third-party tool"), and a reviewer should reject any future requirement that introduces one — the answer is always "build it as a Doer."

L419:
> - **BR-1 (No third-party product integrations).** SA-8 configures only **rails**, **in-house Doer settings**, and **optional own-account connectors**. There is no mechanism to "connect a third-party product tool" (no DocuSign/Calendly/QuickBooks) — those are Doers. Any requirement implying one is rejected; the answer is "build it as a Doer."

**(3) Proposed words.**

L23: after "to \"connect.\"" add:
> *(changed — AG11-D14)* The one exception is **approved processing providers**: outside providers are allowed only for **AI and OCR processing, WhatsApp, and connecting a firm's own mailbox**, each approved by Super Admin here before any firm uses it (the AI and OCR provider: §3.13, SA-8-36). They process; they are never product tools a firm "connects".

L163: "There is deliberately **no fourth shape** …" becomes:
> There is deliberately **no product-tool shape** ("connect a third-party tool"), and a reviewer should reject any future requirement that introduces one — the answer is always "build it as a Doer." *(changed — AG11-D14)* A fourth shape exists for **approved processing providers** only (AI/OCR, WhatsApp, firm mailbox connection — AG11-D14), and a fifth, **government source pages, read-only** (§3.14), fetches public pages and sends no data.

BR-1:
> - **BR-1 (No third-party product integrations; approved processing providers only).** *(changed — AG11-D14)* SA-8 configures only **rails**, **in-house Doer settings**, **optional own-account connectors**, **approved processing providers** (AI/OCR, WhatsApp, firm mailbox connection) and the **read-only government source rail** (§3.14). There is no mechanism to "connect a third-party product tool" (no DocuSign/Calendly/QuickBooks) — those are Doers. Any requirement implying one is rejected; the answer is "build it as a Doer."

**(4) Why.** The team's own decision AG11-D14 (AG-11 v1.11 L43, 5 Oct 2026): "Outside providers are allowed only for three things: **AI and OCR processing, WhatsApp, and connecting a firm's own mailbox** … Each provider must be approved by Super Admin (SA-08) before any firm uses it … Replaces the "no third-party product integrations" wording of 00-Overview and AG-11-3." AG-11 v1.11 §0.2 (L53) lists SA-08 as a pending knock-on. AG-11 (7 Oct) is the later decision and no founder decision is involved, so this note applies it to SA-08 (2 Oct). IMP-6: "By its own words, SA-08 would reject the requirement that unlocks AI." Proposals row of 9 Oct (carve-out A, three internal contradictions, item (c)). The WhatsApp and mailbox providers are Workstream 1 matters; they are named here only because AG11-D14 names all three in one sentence.

**(5) Knock-ons.** 00-Overview "In-House by Design" wording (AG11-D14 already says it is replaced). SA-11 §3.6 (CN-SA-11 change 1). The team specifies the WhatsApp and mailbox provider entries in the same pattern as SA-8-36 (Workstream 1).

---

## 2. A new entry type: the AI model and OCR provider record

**(1) What it changes.** A new §3.13 and new requirements after SA-8-35 (the document's last, L413); §7 entities; §10 permissions (a row); SA-8-1's list of secrets (L357).

**(2) Current words.** None: SA-08 v2.2 has no AI or OCR entry. Its list of what it configures (L23) is "(a) **infrastructure rails** … (b) **platform-level settings of the in-house Doers** … and (c) **optional connectors to a firm's OWN account**".

**(3) Proposed words.**

New §3.13 "Approved processing provider: AI model and OCR" (summary paragraph), and:
> - **SA-8-36.** *(new — AG11-D13, AG11-D14, AG11-D15; AIW-D52)* Super Admin SHALL record an **AI model and OCR provider** before any AI processing runs, with: provider name; contract reference; the **processing region** (where each model call runs); the **no-training** and **no-retention** terms (both), each with the provider's own page or contract clause and the date checked; the result of a **test call** from that region (date, model, outcome, who ran it); the approval date and the approving Super Admin user. The entry SHALL be accepted only if the processing region is in Canada; any other region SHALL be refused with a clear reason (SA-11-32). The entry SHALL NOT be bound to one named provider: replacing the provider is a new entry under the same rules, and the AI switch of every firm stays locked (AG-11-93) until an active entry exists.
> - **SA-8-37.** *(new)* The AI provider entry SHALL serve **both planes**: firms' AI Doers and AI assistants, and Expat Ready's own AI assistants. No platform-plane AI call SHALL run without the same active entry.
> - **SA-8-38.** *(new)* The AI provider's health SHALL be fed by real call outcomes as for any rail (SA-8-27), and its region and terms SHALL feed the data-residency declaration (SA-8-31) as the **AI processing** category. Withdrawing or suspending the entry SHALL stop new AI processing at once; what happens to work already waiting for a person follows SA-12-31.
> - **SA-8-39.** *(new)* The provider's credentials SHALL be secrets under SA-8-1 to SA-8-5; every create, change, suspension and withdrawal of the entry SHALL be audited (SA-8-33) with a reason.

SA-8-1's list of secrets gains "AI provider credentials". §7 gains `ProcessingProvider` (kind: AI_OCR | WHATSAPP | MAILBOX; region; terms references; test-call record; status Draft / Active / Suspended / Withdrawn; approvedBy; approvedAt). §10 gains a row "approve, suspend or withdraw a processing provider" whose key the tech lead names and maps in SA-07 Appendix A (row "Integration credentials · feature flags · operational settings").

**(4) Why.** IMP-6 (the entry and its fields: "provider name, contract reference, processing region, no-training and no-retention terms (both, matching AG-11; AG-16 L577 says only "no-training"), approval date and approver, health fed by real call outcomes (SA-8-27 pattern), and a feed into the residency declaration (SA-8-31)"). AG11-D13 (AG-11 v1.11 L42): AI Doers are "**off for every firm** until the Super Admin records the provider, the processing region (Canada only, AG11-D15) and a no-training/no-retention agreement (SA-08 / SA-11)". AIW-D52 ("Only in Canada", for firms' data and Expat Ready's own support tickets; "confirmed by one test call"); AIW-D69 (the team's tech lead runs the test call; "the result goes into the provider record the product requires before the AI switch unlocks (AG-16-35, AG-11-93)"). The Step 3 shared rule says no requirement names a provider and that residency, no-training and no-retention and the test call are requirements on the provider record (`ai-workers/requirements/00-step3-plan.md`, shared rules). Both platform assistants wait for the same record (`pack-authors-assistant.md` §9 G-17; `support-and-account-assistant.md` §9 G-11, both "Decided (AIW-D52)").

**(5) Knock-ons.** SA-11 (CN-SA-11 changes 1 and 2). SA-12-31 for stopping work in flight (CN-SA-12 change 1). AG-11-93 and AG-16-35 point to SA-8-36 once applied (CN-AG-11, CN-AG-16). SA-07 Appendix A gets the key mapping (CN-SA-07 change 1).

---

## 3. A read-only rail for government source pages (the Pack author's watcher)

**(1) What it changes.** A new §3.14 and requirement after SA-8-39 (change 2); §13 (a new open question for counsel after item 8, L636).

**(2) Current words.** None. The outbound connections SA-08 allows are listed at L23 (quoted under change 2); AG-11-3 (AG-11 v1.11 L554) allows outside providers "only for AI/OCR processing, WhatsApp and the connection of a firm's own mailbox".

**(3) Proposed words.**

New §3.14 "Government source pages, read-only":
> - **SA-8-40.** *(new — proposals row of 10 Oct, Pack author's assistant, outbound fetch)* The platform MAY fetch **public government web pages** only from the addresses recorded as a content item's government source under SA-1B-39, for comparison against the last stored copy. It SHALL NOT fetch an address found on a fetched page, SHALL send no client or firm data, SHALL carry no credentials, and SHALL store only the fetched page text needed for the next comparison, kept for the period counsel sets. Every fetch SHALL be logged with the address, time and outcome; health follows SA-8-27.

New §13 question:
> 9. **Government page fetching (counsel).** *(new)* Confirm the terms of use of the government sites recorded as sources and the Crown copyright position for storing page copies, and set how long stored copies are kept, before SA-8-40 is switched on.

**(4) Why.** Proposals row of 10 Oct (Pack author's assistant, "The Rule-change Watcher (W-21) fetches government pages on a schedule … an outbound call to a third party which AG-11-3 does not list … and SA-08's rails do not hold (IMP-6). Recommendation: add a *government source pages, read-only* rail entry to SA-08 (the IMP-6 pattern), limited to the addresses recorded as sources under SA-1B-39, never an address found on a page, with the stored copies under a retention counsel sets; counsel confirms the sites' terms of use and Crown copyright first"). `pack-authors-assistant.md` §9 G-3 ("Proposal; decision for the team") and G-21 (stored page copies; "retention and the sites' terms are counsel's"). AIW-D54 item 7 keeps the Pack author's assistant read-only, which this rail respects: it reads pages and writes nothing into the pack.

**(5) Knock-ons.** SA-01B SA-1B-39: the source is recorded as an address where it is a web page, so this rail can be limited to it (CN-SA-01B change 4). AG-11-3 lists the read-only rail beside the three outside-provider kinds (CN-AG-11). The watcher's behaviour is specified in AW-02. Counsel pack item (AIW-D68).
