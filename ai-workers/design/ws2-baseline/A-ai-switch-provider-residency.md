# A — The AI switch, the outside AI provider, Canada-only processing, kill switch and plan gating

> Reference index. The source documents remain the only source of truth.

**What this is, in plain words.** The four AI Doers stay off for every firm until the Super Admin records which AI provider is used, that it processes data only in Canada, and that it neither trains on nor keeps client data. After that, the firm Owner can switch AI on with one switch for all four. The platform can also switch AI off for everyone (a "kill switch", still pending), and plans may limit AI (still pending). This file carves out those rules, plus the injection safeguards (client content is treated as data, never as instructions), word for word, and shows where the Super Admin documents have not caught up.

**Scope of this file.** AG-11 v1.11 decisions AG11-D13, D14, D15 and the FRs and rules that apply them; AG-16 §3.9; AG-10, AG-09, AG-18; agent Overview and Phasing; SA-08 (rails), SA-11 (residency), SA-12 (flags, kill switch), SA-03 (plans), SA-04 (no add-ons), SA-06 (permission); Doc 1 Capability Registry; one code fact. Model-call logging is in `A-ai-logging-and-audit.md`.

**How to read the table.** The exact-words column is copied from the source; `…` marks words left out; bold, italics and code marks are dropped. L-numbers are lines in the snapshot file.

**Release labels used below (exact words of the label source).**
- **R1-gate** = AG-11 v1.11 L1303: "Release gate (AG11-D13): they ship built but switched off until SA-08 / SA-11 record a provider, region (Canada only, AG11-D15) and no-training/no-retention agreement; then one firm switch the Owner turns on."
- **R1-gate-PHA** = Agent Phasing v1.4 L23 (rows below quote it).
- **Text** = the requirement states its own release. **None stated** = no release given. **Pending** = the source marks the knock-on as pending.
- **Standing conflict:** Charter V2 pptx slide 1 lists "AI-assisted features" as not in Release 1.

## 1. AG-11: the processing-terms gate and the firm switch

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG11-D13 | AI Doers are off for every firm until the Super Admin records the provider, the processing region (Canada only, AG11-D15) and a no-training/no-retention agreement (SA-08 … | AG-11 v1.11 §0 AG11-D13, L42 | R1-gate | SA-08 v2.2 (2 Oct) has no AI provider rail and no place to record these terms (see section 4). |
| AG11-D13 (switch) | After that, the Owner switches AI on once, with an audited acknowledgement; the product supplies client-notice wording the firm may use. The AI switch is … | AG-11 v1.11 §0 AG11-D13, L42 | R1-gate | Doc 1 v1.3 §1.12 L294 "ONE CAPABILITY = ONE MODULE = ONE TOGGLE" would give each Doer its own toggle (Inferred). |
| AG11-D13 (injection) | Injection safeguards: client-supplied content is passed to models as delimited data, never as instructions, and models get no tool access; the Sorter picks only from … | AG-11 v1.11 §0 AG11-D13, L42 | R1-gate | Inferred: "models get no tool access" would also bind any AI Worker that uses a model. |
| AG11-D13 (AI-only match) | a match made only by the AI, with no deterministic signal (reply token, header chain, known sender address or WhatsApp number), is never filed automatically … | AG-11 v1.11 §0 AG11-D13, L42 | R1-gate | — |
| AG11-D13 (verified sender) | Verified sender (5 Oct — AG18-D11(g)): a sender tied to a known contact by a reply token, the email header chain, or a known email … | AG-11 v1.11 §0 AG11-D13, L42 | R1-gate | — |
| AG11-D14 | Doctrine: core in-house, approved providers. The client record and all Doer logic (the Conductor, the Minder and the rules every Doer follows) are built and … | AG-11 v1.11 §0 AG11-D14, L43 | None stated | — |
| AG11-D14 (cont.) | Outside providers are allowed only for three things: AI and OCR processing, WhatsApp, and connecting a firm's own mailbox … Each provider must be approved by … | AG-11 v1.11 §0 AG11-D14, L43 | None stated | SA-08 v2.2 L23 "Expat Ready has NO third-party product-tool integrations" (not updated; review W1 M-6). |
| AG11-D14 (replaces) | Replaces the "no third-party product integrations" wording of 00-Overview and AG-11-3. | AG-11 v1.11 §0 AG11-D14, L43 | — | Agent Overview v1.11 L177-179 applied it; SA-08 has not. |
| AG11-D15 | AI processing in Canada only. AI and OCR processing of client data (all four AI Doers, including the Reader's OCR) happens only in Canada. Super … | AG-11 v1.11 §0 AG11-D15, L44 | None stated | SA-08 v2.2 Q1 L629: per-country routing assumed "Phase-3". Legal sufficiency of Canada-only: confirm with counsel. |
| AG-11-3 | Outside providers SHALL be used only for AI/OCR processing, WhatsApp and the connection of a firm's own mailbox (Gmail, Microsoft 365, IMAP), and each SHALL … | AG-11 v1.11 §4, L554 | None stated | — |
| AG-11-71 | AI SHALL be off until AG-11-93's conditions are met, and optional per firm after that. With AI off, gated, or the provider unavailable, every path … | AG-11 v1.11 §4, L658 | R1-gate | — |
| AG-11-71 (fallback task) | add it to one batched task per day per file owner, not one task per upload. | AG-11 v1.11 §4, L658 | R1-gate | — |
| AG-11-73 | Client data SHALL NOT be used to train models. Provider, hosting region and data-processing terms are set by the Super Admin (pending SA-08 / SA-11); … | AG-11 v1.11 §4, L660 | R1-gate | — |
| AG-11-73 (cont.) | the Super Admin SHALL be able to record only a provider and region that process in Canada; AI processing SHALL wait until they are recorded … | AG-11 v1.11 §4, L660 | R1-gate | — |
| AG-11-93 | AI Doers SHALL be off for every firm, with the switch locked, until the Super Admin has recorded the provider, the processing region (Canada only, … | AG-11 v1.11 §4, L701 | R1-gate | — |
| AG-11-93 (cont.) | After that, the Owner MAY switch AI on, once, with an audited acknowledgement; the product SHALL supply client-notice wording the firm may use. AI SHALL … | AG-11 v1.11 §4, L701 | R1-gate | Client-notice wording content not specified anywhere; confirm with counsel. |
| AG-11-94 | Client-supplied content SHALL be passed to a model as delimited data, never as instructions, and models SHALL have no tool access. The Sorter SHALL choose … | AG-11 v1.11 §4, L702 | R1-gate | — |
| AG-11-94 (cont.) | A classification of a message from an unverified sender SHALL NOT trigger any client-facing AUTO action; such an action SHALL drop to APPROVE and wait … | AG-11 v1.11 §4, L702 | R1-gate | — |
| AG-11-39 (AI part) | AI Doers and AI volumes MAY be plan-gated once SA-03 decides; a gated AI Doer SHALL fall back to the manual path (AG-11-71), never a … | AG-11 v1.11 §4, L616 | Pending (SA-03) | SA-03 v2.14 SA3-D3 L42 says AG-11's entitlement question is closed by the product map; AG-11 §0.2 L56 still lists SA-03 as Pending. |
| AG-11 BR-24 | AI Doers are off until the processing terms are recorded and the Owner switches them on (BR-37), and optional per firm after that. With AI … | AG-11 v1.11 §5, L753 | None stated | — |
| AG-11 BR-37 | AI Doers stay off, locked, until the Super Admin records provider, region (Canada only, AG11-D15) and a no-training/no-retention agreement; client data is processed only in … | AG-11 v1.11 §5, L766 | None stated | — |
| AG-11 §3.10 no training | No training. Client data is never used to train models — ExpatReady's or a provider's. (Contract terms pending SA-08 / SA-11.) | AG-11 v1.11 §3.10, L467 | Pending | — |
| AG-11 §3.10 kill switch | (A platform kill switch is pending SA-12.) | AG-11 v1.11 §3.10, L468 | Pending | SA-12 v2.7 has a generic kill switch (SA-12-12) but no AI flag (section 4). |
| AG-11 §6 AI switch lifecycle | LOCKED_OFF (every firm, until the Super Admin records provider, region (Canada only, AG11-D15) and the no-training/no-retention agreement) → OFF (terms recorded) → ON (the Owner … | AG-11 v1.11 §6, L839 | None stated | — |
| AG-11 §7 Firm AI settings | aiEnabled — one firm switch for all four Doers, locked off until the Super Admin's processing-terms record (provider, region (Canada only, AG11-D15), no-training/no-retention agreement) exists | AG-11 v1.11 §7, L880 | None stated | AG-16 calls the field aiDoersEnabled (L577). |
| AG-11 §10 configure-ai | Switch the firm's AI Doers off (within what SA-03 / SA-12 allow) — default Owner/Admin. … Switching AI on is the Owner's alone, once the processing … | AG-11 v1.11 §10, L1149 | None stated | — |
| AG-11 §11 security | client data sent to a model only for the firm's own record and only after the processing terms are recorded and the Owner switched AI … | AG-11 v1.11 §11, L1180 | None stated | — |
| AG-11 §0.2 SA-08 | AI model and OCR provider (processing in Canada only — AG11-D15) … Pending: Canada-only region (AG11-D15) | AG-11 v1.11 §0.2, L53 | Pending | — |
| AG-11 §0.2 SA-11 | the processing-terms record that gates AI (AG11-D13), which must show a Canadian region (AG11-D15) | AG-11 v1.11 §0.2, L54 | Pending | — |
| AG-11 §0.2 SA-12 | Platform kill switch for the AI Doers | AG-11 v1.11 §0.2, L55 | Pending | — |
| AG-11 §0.2 SA-03 | Which AI Doers / volumes are plan-gated (standard deadline reminders stay never-gated, AG-11-48) | AG-11 v1.11 §0.2, L56 | Pending | — |
| AG-11 §13 Q19 | Decided (Sanjay, 5 Oct): the core (the client record and all Doer logic) stays in-house; outside providers are allowed only for AI/OCR, WhatsApp and mailbox … | AG-11 v1.11 §13, L1275 | Decided | — |
| AG-11 §13 Q20 | Pricing model (per-seat vs per-case) — affects how AI volumes are gated (SA-03). Not decided. | AG-11 v1.11 §13, L1276 | Open | — |
| AG-11 US-27 | the AI switch is off and locked, no AI Doer runs and uploads follow the manual path. | AG-11 v1.11 §8 US-27, L1020 | None stated | — |

## 2. AG-16 (firm settings) and the other agent modules

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG-16 §3.9 one switch | One firm switch covers all four AI Doers — Reader, Sorter, Drafter, Checker (AG11-D4); there is no per-Doer switch. | AG-16 v1.12 §3.9, L335 | None stated | SCOPE-TRIAGE L212 proposes moving AI settings to Release 2 [F]. |
| AG-16 §3.9 locked | It is locked off for every firm until Super Admin has recorded the AI provider, the processing region (Canada only, AG11-D15) and a no-training / … | AG-16 v1.12 §3.9, L335 | None stated | — |
| AG-16 §3.9 processor | ExpatReady is the data processor, so AI processing waits for those terms. | AG-16 v1.12 §3.9, L335 | None stated | Processor role: confirm with counsel. |
| AG-16 §3.9 kill switch | The platform can also disable the AI Doers for every firm (SA-12 kill switch, pending); a firm cannot switch on what the platform has switched … | AG-16 v1.12 §3.9, L335 | Pending | — |
| AG-16-35 | The firm SHALL have one on/off setting for all four AI Doers (Reader, Sorter, Drafter, Checker); there SHALL be no per-Doer setting. | AG-16 v1.12 §4, L469 | None stated | — |
| AG-16-35 (off) | With it off, no AI Doer SHALL run for that firm, every AI-assisted task SHALL stay available by hand, and no other function SHALL be … | AG-16 v1.12 §4, L469 | None stated | — |
| AG-16-35 (platform) | A firm SHALL NOT be able to switch the setting on while the platform has the AI Doers disabled (SA-12, pending). The default is Off … | AG-16 v1.12 §4, L469 | Pending (SA-12) | — |
| AG-16 BR-18 | A firm with the AI Doers off, a firm whose switch is still locked because the provider terms are not recorded, or a platform with … | AG-16 v1.12 §5, L517 | None stated | — |
| AG-16 BR-18 (cont.) | every function keeps its manual path and no requirement elsewhere may depend on an AI Doer having run. | AG-16 v1.12 §5, L517 | None stated | Inferred: an AI Worker design must not become load-bearing either. |
| AG-16 FirmAiSettings | aiDoersEnabled (default false), termsRecorded (read projection of the Super Admin record of provider, region (Canada only, AG11-D15) and no-training agreement — SA-08 / SA-11; while … | AG-16 v1.12 §7, L577 | None stated | Says "no-training agreement"; AG-11 says "no-training/no-retention agreement". |
| AG-16 §13 Q7 | Still open: which AI Doers or volumes sit behind which plan (SA-03), and what the Owner sees if Super Admin later withdraws the terms. | AG-16 v1.12 §13, L851 | Open | — |
| AG-16 §9 terms withdrawn | Owner acknowledges AI once; terms later withdrawn by Super Admin … → the platform kill switch applies (SA-12, pending); what the Owner sees is open (§13 … | AG-16 v1.12 §9, L704 | Open | — |
| AG-16 §9 switched off | AI Doers switched off while items wait in Needs you … → waiting items are not deleted and never execute because of the change (AG-16-37); what … | AG-16 v1.12 §9, L713 | Open | — |
| AG-16 §10 keys | Kept apart from agent/settings:edit because lowering to "Send automatically" lets messages reach clients without a human. Floors are not editable by any key | AG-16 v1.12 §10, L748 | None stated | — |
| AG-10-54 | AI Doers (here: Sorter and Drafter) SHALL be off for every firm until Super Admin has recorded the provider, the processing region (Canada only, AG11-D15) … | AG-10 v1.9 §4, L442 | None stated | — |
| AG-10-54 (cont.) | models SHALL have no tool access; the Sorter SHALL choose only from a firm-scoped candidate list; an AI-only match SHALL never be filed automatically (AG-10-38). | AG-10 v1.9 §4, L442 | None stated | — |
| AG-10 BR-27 | Client-supplied content is data, never instructions; the model has no tool access; the Sorter picks only from the firm's own candidate list; an AI-only match … | AG-10 v1.9 §5, L481 | None stated | — |
| AG-10 §11 gating | AI assist including the Sorter and Drafter, bulk campaigns, analytics; which are plan-gated is SA-03, pending knock-on. | AG-10 v1.9 §11, L750 | Pending | — |
| AG-10 §13 Q14 | The gate is decided: AI Doers and WhatsApp inbound stay off for every firm until these are recorded; the values are not. | AG-10 v1.9 §13, L816 | Open (values) | — |
| AG-09 §11 region | sends nothing outside the region the firm's data-residency terms allow. … a platform kill switch is pending (SA-12). | AG-09 v1.8 §11, L804 | Pending | — |
| AG-09 knock-ons | SA-08 (AI model and OCR provider, Canadian data residency for AI processing), SA-11 (AI processing in data governance, no-training rule, model-call audit retention | AG-09 v1.8 §0, L46 | Pending | — |
| AG-18 AG11-D15 row | The Reader reads imported documents only through the Canadian provider and region recorded by Super Admin | AG-18 v1.2 §0, L46 | None stated | — |
| Agent Phasing gate | AI and OCR processing of client data happens only in Canada (AG11-D15). Outside providers are limited to AI/OCR, WhatsApp and mailbox connections (Gmail, Microsoft 365 … | Agent Phasing v1.4 Release gate, L23 | R1-gate-PHA | — |
| Agent Phasing gate (cont.) | Every AI path keeps its manual fallback, so the rest of Release 1 does not depend on the gate. | Agent Phasing v1.4 Release gate, L23 | R1-gate-PHA | — |
| Agent Overview gate | One firm switch covers all four AI Doers. It is locked off for every firm until Super Admin has recorded the provider, the processing region … | Agent Overview v1.11 principles, L130 | None stated | — |
| Agent Overview providers | Outside providers are allowed for only three things, each approved by Super Admin (SA-08) before any firm uses it (AG11-D14): AI and OCR processing for … | Agent Overview v1.11 In-House by Design, L179 | None stated | — |

## 3. Plan gating and the capability model (SA-03, SA-04, SA-06, Doc 1)

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SA3-D3 | Super Admin switches every module, tab and action of the firm app on or off per plan, and has a full map of the firm … | SA-03 v2.14 §0 SA3-D3, L42 | "Must now" (W1 inventory sa-frs §A) | No AI item named in SA-03. |
| SA3-D3 (closes AG-11) | closes the "entitlement tiers" open question in AG-2, AG-3, AG-5, AG-6, AG-7, AG-9, AG-10, AG-11 | SA-03 v2.14 §0 SA3-D3, L42 | — | AG-11 v1.11 §0.2 L56 and §13 Q8 still show AI plan gating as Pending/open. |
| SA-3-32 | The product map and firm role permissions (SA-6) use one master list of actions; an action runs only if the firm's plan includes it and … | SA-03 v2.14 §4, L391 | None stated | Inferred: any AI Doer action would pass this double check. |
| SA-3-38 | an item newly added to the product map is off on every existing plan, even where its parent is on, and is listed under "New … | SA-03 v2.14 §4, L397 | None stated | — |
| SA-03 §11 limits | Limits as rows: a new metered metric is configuration, not a migration. | SA-03 v2.14 §11, L593 | None stated | No AI usage metric is defined. |
| SA-4-44 | Nothing is sold outside a plan: there are no add-on prices in Release 1. | SA-04 v2.14 §4, L470 | Text: Release 1 | Inferred: per-use AI pricing would need this changed (AG-11 Q20 open). |
| SA-06 configure-ai | Switch the firm's AI Doers off (within what SA-03 / SA-12 allow) — default Owner/Admin. Switching AI on is the Owner's alone, once the processing | SA-06 v3.1 §10b, L871 | None stated | Row text is cut short in the source itself. |
| Doc 1 §1.12 layers | PLAN ENTITLEMENT (SA-3) — Is the capability in the firm's subscription? | Doc 1 v1.3 §1.12.3, L326 | None stated | — |
| Doc 1 §1.12 layers | FIRM SWITCH — Within its entitlement, has the firm turned it on? | Doc 1 v1.3 §1.12.3, L327 | None stated | Matches the AG-16 firm AI switch. |
| Doc 1 §1.12 layers | PLATFORM FLAG (SA-12) — Has the platform allowed it on, here, now? | Doc 1 v1.3 §1.12.3, L328 | None stated | Matches the pending SA-12 AI kill switch. |
| Doc 1 §1.12 default | The factory default, which is OFF unless explicitly entitled-and-enabled. | Doc 1 v1.3 §1.12.2, L317 | None stated | — |
| Doc 1 §1.12 kinds | One of DOER (an in-house Doer: Signer, Mailer, Scheduler, Biller, Minder, Filler, Qualifier, Messenger, Reporter, Finder, Drafter, Reviewer, Binder, Tasker) | Doc 1 v1.3 §1.12.2, L312 | None stated | No Reader, Sorter or Checker; FD-16 (FDL L52) expects AI features as "cap.ai.*" capabilities, which Doc 1 does not define. |

## 4. Super Admin rails, residency and kill switch (SA-08, SA-11, SA-12)

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SA-08 framing | Expat Ready has NO third-party product-tool integrations. | SA-08 v2.2 framing, L23 | None stated ("Baseline") | Superseded for AI/OCR, WhatsApp and mailboxes by AG11-D14 (5 Oct); SA-08 not updated (review W1 M-6). |
| SA-08 rails list | object storage, an email-delivery relay, a payment processor that physically moves money, an SMS/WhatsApp carrier gateway, an identity provider | SA-08 v2.2 framing, L23 | None stated | No AI model or OCR provider rail is listed. |
| SA-08 no fourth shape | There is deliberately no fourth shape ("connect a third-party tool"), and a reviewer should reject any future requirement that introduces one — the answer is … | SA-08 v2.2 §3.0, L163 | None stated | Conflicts with AG11-D14 allowing an outside AI provider. |
| SA-08 BR-1 | There is no mechanism to "connect a third-party product tool" (no DocuSign/Calendly/QuickBooks) — those are Doers. Any requirement implying one is rejected; the answer is … | SA-08 v2.2 §5, L419 | None stated | Same conflict. |
| SA-8-27 | Health SHALL be fed by synthetic pings and real Doer-call outcome telemetry recorded to an IntegrationHealthLog | SA-08 v2.2 §4, L399 | None stated | Inferred: an AI provider rail would need the same health feed; not stated. |
| SA-8-31 | The system SHALL generate a data-residency declaration from the actual configured regions (per rail: region + Canadian/Non-Canadian/safeguard status), consumed by SA-11. | SA-08 v2.2 §4, L407 | None stated | No AI rail exists to feed it. |
| SA-08 BR-7 | The data-residency declaration is generated from the actually-configured regions, never hand-asserted; Non-Canadian-without-safeguard is flagged (rendered by SA-11). | SA-08 v2.2 §5, L425 | None stated | — |
| SA-08 Q1 | Phase-1 = single-region Canada with the declaration surfaced; per-country routing Phase-3. | SA-08 v2.2 §13, L629 | "Assumption pending" (same line) | — |
| SA-11-20 | Super Admin can view a data residency declaration: per data category, the storage location (DB region, object-storage region, cache region, IdP region) and residency status | SA-11 v2.7 §4, L372 | None stated | Lists storage locations only; AI processing location not a category. |
| SA-11-21 | Any category whose rail/sub-processor is Non-Canadian without a confirmed safeguard SHALL raise a compliance warning on the dashboard, linked to the offending SA-8 integration. | SA-11 v2.7 §4, L373 | None stated | AG11-D15 is stricter (Canada only, no safeguard option). |
| SA-11 §3.6 RES2 | sub-processors must be Canadian-resident or explicitly approved with documented safeguards | SA-11 v2.7 §3.6, L269 | None stated | Allows non-Canadian with safeguards; AG11-D15 allows only Canada. |
| SA-12-9 | A feature executes only when entitlement (SA-3) AND flag (SA-12) both pass, evaluated entitlement-first. | SA-12 v2.7 §4, L354 | None stated | — |
| SA-12-12 | A killSwitchEligible flag can be tripped at PLATFORM scope, forcing OFF below all other scopes (precedence 0), with a mandatory reason | SA-12 v2.7 §4, L361 | None stated | No AI Doer flag is named; AG-11 §0.2 L55 marks the AI kill switch Pending. |
| SA-12 §3.4 pause | optionally pauses (not deletes) any in-flight work the feature owns (e.g. active Conductors pause | SA-12 v2.7 §3.4, L235 | None stated | — |
| SA-12-26 | No flag or setting may disable a tenant-isolation, authentication, authorization, or audit control. | SA-12 v2.7 §4, L389 | None stated | — |
| SA-12 fail-safe | on store outage, evaluation returns the catalog default — and a security-relevant flag's safe default is OFF (deny), so an outage never opens a gated … | SA-12 v2.7 §11, L590 | None stated | — |
| Code fact (not a requirement) | const apiKey = process.env.ANTHROPIC_API_KEY; | Code mail.service.ts (founders' expat-ready-api@c4117a3), L1721 | n/a | Conflicts with AG11-D13/D15 gate if reused as is (no terms record, no region). |
| Code fact (not a requirement) | resp = await fetch('https://api.anthropic.com/v1/messages', { | Code mail.service.ts (founders' expat-ready-api@c4117a3), L1753 | n/a | Endpoint is not a Canada-region endpoint by its URL (Inferred). |

## Gaps noticed

- **The Super Admin side does not exist yet.** SA-08 v2.2 (2 Oct) has no AI or OCR provider rail, no record of provider, region or no-training/no-retention terms, and still forbids third-party product tools (L23, L163, BR-1). SA-11 v2.7 has no AI processing category and allows non-Canadian sub-processors with safeguards (L269), which is looser than AG11-D15. SA-12 v2.7 names no AI flag. All three are "Pending" knock-ons in AG-11 §0.2 (L53–L56). Until they are written, the AI switch stays locked by the AG-11 rule itself.
- **Plan gating is contradictory.** SA-03 SA3-D3 (L42) says the entitlement-tier question in AG-11 is closed by the product map; AG-11 (L56, Q8) and AG-16 (Q7) say AI plan gating is pending. SA-4-44 says no add-ons in Release 1, and AG-11 Q20 (pricing per seat vs per case) is open.
- **One switch vs one capability per Doer.** AG-11/AG-16 give one switch for all four AI Doers; Doc 1 §1.12 says one capability, one module, one toggle, and its Doer list has no Reader, Sorter or Checker.
- **No-retention is not in every source.** AG-11 says "no-training/no-retention agreement"; AG-16 `FirmAiSettings` (L577) says "no-training agreement".
- **What happens when terms are withdrawn, and to items waiting when AI is switched off,** is open (AG-16 Q7, Q9).
- **Client-notice wording** that "the product supplies" (AG-11-93) is not written anywhere. Legal and privacy values: confirm with counsel.
- **Code reality.** The founders' July code copy sends AI drafting requests to `https://api.anthropic.com/v1/messages` using an environment key (mail.service.ts L1721, L1753), with no terms record or region control in those lines. Review W1 raised this as an open question; evidence E6 in the workstream notes.
- Inferred: "models get no tool access" (AG-11-94, AG-10-54) is written for the four AI Doers. An AI Worker that operates the product through its screens and Doers would be a model with tool access by design; no source addresses this.
