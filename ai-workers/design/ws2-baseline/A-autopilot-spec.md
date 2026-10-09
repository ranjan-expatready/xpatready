# A — The founders' autopilot spec (RNA: Reminders, Notifications & Actions), 18 Jun 2026

> Reference index. The source documents remain the only source of truth.

**What this is, in plain words.** Before the October requirements, the founders wrote a design for the automation layer, which they called RNA, "ExpatReady's autopilot". It sets out the engine (the Conductor), ready-made playbooks, a deadline model and how Super Admin, firm and client each see it. It is a design for founder review, not a ratified decision and not a requirement. Read in full (419 lines). Source: `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-18-rna-autopilot-design.md` (founders' personal repository copy, commit c4117a3, 30 Jul 2026).

**How to read the table.** Quotes are short and exact; `…` marks words left out. L-numbers are lines in that file. Release column: what the spec itself says.

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| RNA status | Design — for founder review (brainstorming output, pre-plan) | RNA spec 2026-06-18 header, L6 | n/a | Not ratified; AG-11 v1.11 is the newer requirement. |
| RNA §0 | RNA is not a module. It is ExpatReady's autopilot — the nervous system that makes every other module proactive instead of passive. | RNA spec 2026-06-18 §0, L16 | None stated | AG-11 §1 L205 uses the same image. |
| RNA §0 extend | Extend, don't rebuild. A capable engine already exists … ~55–60% of the backend is built. | RNA spec 2026-06-18 §0, L20 | None stated | AG-11 §12 L1201 same figure. |
| RNA §0 library | Library-first, builder-second. Ship 30–40 RCIC-validated immigration Playbooks pre-loaded and editable. | RNA spec 2026-06-18 §0, L21 | None stated | AG-11 ships 9 recipes in Release 1 (AG-11-75, AG-11-106); editing them needs the Release 2 builder. |
| RNA §0 engine | Engine hardcoded, knowledge configurable, country = a dimension. | RNA spec 2026-06-18 §0, L22 | None stated | Agrees with AG-11-9, BR-2. |
| RNA §0 not a Doer | The engine is the Automation/Workflow conductor (by your own rule, not a Doer). | RNA spec 2026-06-18 §0, L23 | None stated | Agrees with AG-11 BR-1; SA-08 L21 disagrees. |
| RNA law | Minder thinks · Reminder speaks · Tasker does · Conductor connects. | RNA spec 2026-06-18 §0, L25 | None stated | FD-8 (FDL L33) folds Reminder into Minder. Overlap: carve-out B. |
| RNA §2.3 | The Conductor is not a Doer and not buried in settings — it is a first-class module (the automation control plane) with its own toolkit | RNA spec 2026-06-18 §2.3, L112 | None stated | AG-11 puts AI Doers and autonomy in AG-16 settings; Conductor surfaces partly Release 2. |
| RNA §2.3 toolkit | Run Log & Audit — what fired, to whom, on which channel, status, failure reason. | RNA spec 2026-06-18 §2.3, L116 | None stated | — |
| RNA §2.3 simulate | Test / Simulate — dry-run a playbook before publishing. | RNA spec 2026-06-18 §2.3, L118 | None stated | AG-11 §3.7 (Release 1). |
| RNA §3 | Playbooks are configurable data; the evaluator is code. | RNA spec 2026-06-18 §3, L145 | None stated | AG-11 §3.5 "config-as-data". |
| RNA §4.1 rule | Hardcoded if it is (a) a universal mechanic, (b) safety/compliance-critical (idempotency, audit, tenant-isolation), or (c) would force reinventing a programming language | RNA spec 2026-06-18 §4.1, L155 | None stated | — |
| RNA §6 tiers | Case > Firm > Platform. A firm-cloned playbook suppresses the global one for that firm; a case override suppresses both for that case. | RNA spec 2026-06-18 §6, L192 | None stated | AG-11 has no case-level override of a recipe. |
| RNA §6 factory | Super Admin is the "intelligence factory": it authors / versions / publishes Country Packs + the global Playbook library once | RNA spec 2026-06-18 §6, L196 | None stated | AG-11-24 recipe versioning offered to firms. |
| RNA §6 over-config | Over-configurability is itself a failure mode. | RNA spec 2026-06-18 §6, L198 | None stated | — |
| RNA §9 escalation | Role-based routing (case officer / supervisor / specific user), priority, due-date, and an escalation policy (PagerDuty-style: not actioned in X → escalate). | RNA spec 2026-06-18 §9, L254 | None stated | AG-11: escalation off under 5 staff unless the firm chooses (AG-11-49). |
| RNA §12 dedup | Idempotency / dedup: same rule + case + channel + recipient cannot fire twice in the same window. | RNA spec 2026-06-18 §12, L306 | None stated | AG-11-25 keys per action. |
| RNA §12 placeholders | No raw template leakage: unresolved {var} → blank/[not specified], never visible to client. | RNA spec 2026-06-18 §12, L312 | None stated | AG-11-97: a missing variable drops the send to APPROVE; never a placeholder. |
| RNA §13 channels | SMS/WhatsApp = future channels inside Messenger (Dialer/WhatsApp): out of scope for v1 | RNA spec 2026-06-18 §13, L321 | Out of scope for v1 | AG11-D18(a): WhatsApp is Release 1. |
| RNA §14 audit | RNA's audit trail is also malpractice protection: the firm can prove "we reminded the client on these dates via these channels." | RNA spec 2026-06-18 §14, L327 | None stated | — |
| RNA §16 out of scope | SMS/WhatsApp delivery (placeholders only); mobile push; two-way SMS/WhatsApp; AI-generated message content | RNA spec 2026-06-18 §16, L348 | Out of Scope (v1) | AG-11 Drafter (AI-written messages) is Release 1 gated. |
| RNA §16 IRCC | IRCC API integration (none exists — manual entry) | RNA spec 2026-06-18 §16, L348 | Out of Scope (v1) | Agrees with AG-11-54 (no submission). |
| RNA §17 next | Founder review of this design (the review gate). | RNA spec 2026-06-18 §17, L353 | Open | No record in the snapshot that this review happened. Unknown. |
| RNA §17 SME | SME grounding of the Obligation Catalog (§8) — Ishaan + founder ratify validity periods, cascade dependencies, program-specific rules. Blocks Minder slice. | RNA spec 2026-06-18 §17, L354 | Open | AG-11 L1320 routes the same values to the Immigration-SME. |
| RNA §18.3 IRCC letters | IRCC-correspondence urgent-action (PFL/ADR/MED → high-priority task, ~30-day SME-set deadline — the malpractice-risk gap) | RNA spec 2026-06-18 §18.3, L377 | None stated | AG-11-108: Reader proposes letter deadlines, a person approves. |
| RNA §18.3 licence | RCIC licence/CPD/E&O tracking (firm-operational obligations = a differentiator) | RNA spec 2026-06-18 §18.3, L377 | None stated | Conflicts with AG1-D19 (no licence monitoring). |
| RNA §18.4 front door | Never land a user on a rule-builder. | RNA spec 2026-06-18 §18.4, L380 | None stated | AG-11 home screen = Needs you + Done for you (AG11-D7). |
| RNA §18.5 claim | One value claim: "Never miss an IRCC deadline again — out of the box." | RNA spec 2026-06-18 §18.5, L386 | None stated | Investor-story wording; claims need sourcing (AIW-D9). |
| RNA §18.5 moat | Copyable = conductor/channels/builder → sell the moat, not the plumbing. | RNA spec 2026-06-18 §18.5, L386 | None stated | — |
| RNA §19 | RNA's upper layers can't deliver until the case/post-filing substrate is built — and that substrate IS RNA's Minder foundation | RNA spec 2026-06-18 §19, L396 | None stated | — |

## Gaps noticed

- The spec is a design for founder review (L6); no source in the snapshot records the review outcome. Its standing is **Unknown** beyond "input".
- It excludes AI-generated message content (L348) and SMS/WhatsApp (L321) from v1; the October AG-11 includes the Drafter and WhatsApp in Release 1 (gated).
- It proposes licence and CPD tracking (L377), which AG1-D19 rules out.
- It keeps Reminder and Minder as separate Doers (L25), against FD-8 (carve-out B).
- It proposes 30–40 playbooks and case-level overrides (L21, L192); AG-11 has 9 recipes and no case-level override in Release 1.
- It says nothing about AI Doers, Needs you, autonomy levels or licensed approval; those came later in AG-11 (4–5 Oct).
