# A — Founder decisions on AI and automation, and every release statement about them

> Reference index. The source documents remain the only source of truth.

**What this is, in plain words.** This file lists the ratified founder decisions (FD-n in the Founder Decisions Log) that govern AI and automation, who decided the newer AG-11 rules, and every statement about whether AI and the automation engine are in Release 1. The sources disagree on release; this file records each statement, it does not pick a winner (review W1 finding B-2; workstream decision AIW-D14 in `ai-workers/decisions.md` sets our scope regardless of release labels).

**How to read the table.** Quotes are short and exact; `…` marks words left out. L-numbers are lines in the snapshot file.

## 1. Founder Decisions Log (FDL v1.5, last updated 2026-08-02)

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| FDL batch status | FD-16…FD-19 were put to the founder as a batch on 2026-08-02 and he accepted the architect's recommendation on all four. | FDL v1.5 Blueprint batch, L46 | n/a | — |
| FDL batch status (FD-20) | FD-20 and FD-21 are architect calls taken under the standing technical delegation and are recorded here for ratification only. | FDL v1.5 Blueprint batch, L46 | n/a | FD-20 is an architect call recorded for ratification, not a founder answer. |
| FD-16 | "AI assists, humans decide." | FDL v1.5 FD-16, L52 | None stated | — |
| FD-16 deterministic | The eligibility/scoring/workflow engine stays fully deterministic, versioned and explainable — no model output is ever a decision. | FDL v1.5 FD-16, L52 | None stated | "workflow engine" = the Conductor (Inferred); AG-11 keeps the engine rule-based, AI only proposes. |
| FD-16 layer | AI is a bounded, declared capability layer over the machinery (drafting, summarisation, document extraction, suggestion) whose every output is human-approved before it has effect. | FDL v1.5 FD-16, L52 | None stated | AG-11 lets a high-confidence document type apply at AUTO (AG-9-11 L484) and AI-only Sorter matches never file; summarisation is not specified anywhere. |
| FD-16 consequence | AI is NOT a first-class actor — no AI principal in the identity spine, no autonomous permissions, no new plane. | FDL v1.5 FD-16, L52 | None stated | Doc 3 v1.4 L3623, L5194 wait for "non-human principals"; see A-identity-and-on-behalf.md. |
| FD-16 capability | AI features are ordinary capabilities in the Capability Registry (cap.ai.*), plan-gated, per-tenant opt-in, with provenance recorded on any AI-assisted artifact. | FDL v1.5 FD-16, L52 | None stated | Doc 1 v1.3 §1.12 defines no cap.ai.* key; AG-11 uses one firm switch for four Doers and leaves plan gating pending. |
| FD-16 marketing | Marketing may say "AI-assisted"; it may not say the AI decides. | FDL v1.5 FD-16, L52 | None stated | Binds the investor story and product copy. |
| FD-20 | every assessment result carries an isAutomatedDecision flag, an immutable factor snapshot (inputs, rule/pack version, weights, and the reason each program passed or failed) | FDL v1.5 FD-20, L56 | None stated | Applies to the assessment scorer (Qualifier, carve-out B); no equivalent for AI Doer output. |
| FD-20 review | a REVIEW_OF_AUTOMATED_DECISION request type in the DSR machinery routing to a named human reviewer with a recorded outcome. | FDL v1.5 FD-20, L56 | None stated | — |
| FD-20 counsel | Counsel confirms wording, not mechanism. | FDL v1.5 FD-20, L56 | None stated | Confirm with counsel. |
| Charter V2 notes on FD-20 | "Human review" means a client can ask a named person to review an automated eligibility result (FD-20). | Charter V2 pptx notes slide 1 | Release 1 (Charter scope page) | — |
| FD-8 | Reminder folds into Minder (one nudge identity; AG-13 §3.2 retitled; naming spec amended) | FDL v1.5 FD-8, L33 | Resolved 2026-07-03 batch | AG-11 v1.11 L243 and Agent Phasing L52 keep Reminder and Minder as separate Doers; RNA spec L25 too. Overlap: carve-out B. |
| FD-22 Practice Pack | Regulator + representative model (who may lawfully advise, licence classes, rep-of-record cardinality, supervision rules for unlicensed staff) | FDL v1.5 FD-22 table, L78 | None stated | AG-11 AG11-D11(c) makes supervision a firm setting with a default. |
| A22-1 | the practice jurisdiction licenses the human (who may lawfully advise, licence class, supervision, insurance) | FDL v1.5 A22-1, L98 | None stated | AG1-D19: the product never checks licence. Confirm with counsel / RCIC. |
| D-6 at-risk default | at-risk = manual-acknowledge | FDL v1.5 D-6, L353 | Default if deferred | AG-11 does not say how an at-risk mark is cleared (Inferred). |

## 2. Who decided the AG-11 agent-native rules

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG-11 §0 | Decided by Sanjay (product owner), 4 Oct 2026. | AG-11 v1.11 §0, L22 | n/a | AG11-D1 to D18 are product-owner decisions, not FD-n entries; Ranjan (founder) has not ratified them in any snapshot file. |
| SA-06 decisions | founder decisions SA6-D1–D11 applied | SA-06 v3.1 document control, L1 | n/a | SA-06 calls SA6-D* "founder decisions"; its own table credits Sanjay (7 Oct). |
| Agent Overview | decided by Sanjay, product owner, 4 Oct 2026; extended 5 Oct by AG11-D14–D18 and AG18-D11–D12 | Agent Overview v1.11 principles, L120 | n/a | — |

## 3. Release statements for AI and the automation engine

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| Charter V2 slide 1 | NOT IN RELEASE 1 AI-assisted features · Automation engine (AG-11) and its Doers · Advanced engagement scoring | Charter V2 pptx slide 1 | Not in Release 1 | Charter V2 is the founder's program document (re-saved 6 Oct per manifest). |
| Charter V2 slide 4 | Deferred: AI-assisted features · AG-11 automation engine and its Doers · advanced engagement scoring. | Charter V2 pptx slide 4 | Deferred | — |
| Charter V2 notes slide 1 | Ordinary tasks, reminders and three plain notices (consultation reminder, unsigned document chase, missing evidence nudge) stay. | Charter V2 pptx notes slide 1 | Release 1 | The three plain notices overlap AG-11 seeds (missing-document chase). |
| Charter V1 md | NOT IN RELEASE 1. AI-assisted features; the AG-11 automation engine and its Doers | Charter V1 md, L121 | Not in Release 1 | — |
| AG-11 Phasing | A minimal Conductor (AG11-D3): triggers … conditions, Doer dispatch, idempotency keys | AG-11 v1.11 §13, L1297 | Release 1 | Conflicts with Charter V1/V2. |
| AG-11 Phasing AI | Release gate (AG11-D13): they ship built but switched off until SA-08 / SA-11 record a provider | AG-11 v1.11 §13, L1303 | Release 1, built but off | Same conflict. |
| Agent Phasing gate | ship in Release 1 built but switched off for every firm | Agent Phasing v1.4 Release gate, L23 | Release 1, built but off | Same conflict. |
| AG-08 | moved to Release 1 in v1.4 for identity documents | AG-08 v1.7 §13, L730 | Release 1 | — |
| SA-01B §0.3 | AI reading of uploaded documents … Defer | SA-01B v1.2 §0.3, L112 | Defer | Conflicts with AG-08, AG-09, AG-11. |
| Doc 3 AG-9 | OCR / auto-extraction (e.g. passport MRZ prefill) — OUT of base scope | Doc 3 v1.4 AG-9 §13, L4452 | Out (July, older) | Superseded in the Oct FRs. |
| SCOPE-TRIAGE status | A review file, not a requirements document. Nothing here has changed any spec. | SCOPE-TRIAGE 2026-10-05, L3 | n/a | — |
| SCOPE-TRIAGE AG-11 | Proposed to move (almost all [F], decided 4–5 Oct): | SCOPE-TRIAGE 2026-10-05 AG-11, L141 | Proposal only | [F] = "decided earlier by the founder" per its legend (L9); the AG-11 file says Sanjay decided them. |
| SCOPE-TRIAGE savings | AG-11 approval / governance layer + AI Doers + WhatsApp (across AG-09, 10, 11, 16) | SCOPE-TRIAGE 2026-10-05, L266 | Proposal only | Named as the biggest saving if moved. |

## Gaps noticed

- **No rule says which document wins on release** (review W1 B-2). Charter V1 and V2 (founder) say AI and the AG-11 engine are not in Release 1; AG-11, AG-08, AG-09 and the agent Phasing (product owner, 4–5 Oct) say Release 1, built but switched off; SA-01B says Defer; SCOPE-TRIAGE proposes Release 2. AIW-D1/AIW-D14 make all of it Workstream 2 scope; only Ranjan can change the Charter.
- **SCOPE-TRIAGE marks AG-11 items [F] "decided earlier by the founder"**, while AG-11 records them as decided by Sanjay (product owner). AIW-D10 notes decisions may come from either co-founder; whether the AG-11 decisions count as founder decisions is not stated in any source.
- **FD-16 expects AI features as `cap.ai.*` capabilities in the Capability Registry**; neither Doc 1 v1.3 nor AG-11 defines them.
- **FD-16 says every AI output is human-approved before it has effect.** AG-9-11 applies a high-confidence document type automatically (internal filing at AUTO). Whether that is "effect" under FD-16 is not stated. Inferred.
- **FD-8 (Reminder folds into Minder)** is not reflected in AG-11 v1.11, the agent glossary or the founders' autopilot spec. Owner: carve-out B.
- **FD-20's automated-decision review** covers the assessment scorer only; no equivalent route exists for a client to ask for human review of AI Doer output that reached them. Inferred.
