# B-reviewer: the Reviewer (deficiencies and readiness before submission)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Reviewer continuously works out what is missing or wrong on a case (documents, forms, questionnaire, unsigned retainer, overdue fees, missing profile data, pack rules) using a pack-driven Deficiency Library, computes a readiness state and score, and puts every critical warning in front of the consultant before review and before the submission is recorded. It never locks the case: each critical warning is fixed or passed by a permitted person with a reason. **Who uses it:** case officers, the reviewer in the internal review round, and the consultant (RCIC) (AG-07). **What it replaces (founders' spec):** none named; Tier 3 "immigration-only moat" Doer ("pre-submission QA / completeness"; the IP is "error-catching"). **Status in one line:** internal review is Release 1; the Deficiency Library, auto-detect rules and readiness score are proposed for Release 2 in the 5 Oct scope review, while AG-07 v2.7 recommends keeping the library in Release 1. The AI cross-check (the Checker) is carve-out A.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- Agent 99-Phasing v1.4: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/99-Phasing-and-Glossary_v1.4_2026-10-05.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- AG-07 v2.7: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-07-case-core-and-delivery_v2.7_2026-10-07.md`
- AG-11 v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-11-automation_v1.11_2026-10-07.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Doc 3 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Reviewer \| pre-submission QA / completeness \| error-catching" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 3, L81 | Tier 3 (no release date) | — |
| SPEC-IA case actions | "Reviewer (QA)" | Founders IA Doers model v1 (2026-06-14), Contextual Doers, On a Case, L61 | None stated | — |
| APHG glossary | "The Doer that continuously computes what is missing on a case and puts every CRITICAL warning in front of the RCIC before submission. It …" | Agent 99-Phasing v1.4, Glossary, "Reviewer", L70 | None stated | — |
| DOC2 capability | "cap.reviewer \| case-delivery.documents \| DOER \| cap.binder \| feature.docs.review \| enterprise" | Doc 2 v1.4, SA-CT capability registry seed table, L85 | "enterprise" (illustrative tier) | FD-19 (FDL L55): a solo RCIC "still needs review/QC" — an enterprise default tier sits uneasily with that. Inferred. |
| AG-07 §3.6 how it works | "The Reviewer continuously computes, for a case, what is missing or does not meet a requirement … each fixed, or passed with a reason; …" | AG-07 v2.7, §3.6 Deficiency & Readiness Tracking, L484 | None stated | Doc 3 L3175 (July) gates progress until critical deficiencies clear. |
| AG-07 §3.6 dimensions | "Financials (from AG-5/AG-6): retainer not signed (a CRITICAL warning — work may start before signature, AG17-D62), fees overdue past terms." | AG-07 v2.7, §3.6, L488 | None stated | — |
| AG-07 §3.6 library | "deficiency rules live in a Deficiency Library keyed by country/program — a set of checks the Reviewer evaluates against the case." | AG-07 v2.7, §3.6 The Deficiency Library, L494 | None stated | TRI L94 proposes to move the library, auto-detect rules and readiness score. |
| AG-07 §3.6 readiness view | "Each is either fixed or passed by a person holding agent/case:waive-deficiency … who gives a reason; the pass is recorded on the case (AG17-D17)." | AG-07 v2.7, §3.6 The readiness view, L498 | None stated | Waive permission seeded on Owner and Case Manager; no licence check (SA6-D2). |
| AG-07 §3.6 revision note | "critical deficiencies become CRITICAL warnings passed with a reason, not a hard gate (AG17-D17)." | AG-07 v2.7, §3.6, L502 | None stated | Supersedes the July hard gate. |
| AG-07 §3.6 data flow | "Any case change … → Reviewer re-evaluates the Deficiency Library rules for the … → deficiency.detected emitted for each newly raised finding (AG11-D5) → AuditLog on …" | AG-07 v2.7, §3.6 Data flow, L512 | None stated | deficiency.detected is a Conductor trigger (AG-11-74). |
| AG-7-25 | "The system SHALL provide a firm- and pack-scoped Deficiency Library of named, reusable deficiency definitions (DeficiencyLibraryItem: code, label, category, default severity, guidance, optional auto-detect rule)." | AG-07 v2.7, §4 Deficiency & readiness, L641 | None stated | — |
| AG-7-26 | "a severity (CRITICAL \| MAJOR \| MINOR \| INFO), a state (OPEN \| ACKNOWLEDGED \| WAIVED \| RESOLVED)" | AG-07 v2.7, §4, L642 | None stated | — |
| AG-7-27 | "Every OPEN CRITICAL deficiency SHALL be shown as a CRITICAL warning when the case is sent for review, at … and SHALL NOT lock …" | AG-07 v2.7, §4, L643 | None stated | — |
| AG-7-28 | "Waiving a deficiency … SHALL require a distinct permission (agent/case:waive-deficiency …), a mandatory reason, and an audit entry" | AG-07 v2.7, §4, L644 | None stated | Owner decides when no one holds the key (same line). |
| AG-7-29 | "Submitting a case for internal review SHALL create a review record with a checklist … approving with unticked review-checklist items … SHALL ask for one confirmation, recorded" | AG-07 v2.7, §4 Review workflow, L645 | None stated | TRI L90 keeps "internal review". |
| AG-7-30 | "the system SHALL auto-raise/auto-clear the corresponding Deficiency as case state changes" | AG-07 v2.7, §4 Auto-detected deficiencies, L646 | None stated | TRI L94 proposes to move auto-detect rules. |
| AG-7-61 | "Where the firm uses the Checker Doer, the Reviewer SHALL include its cross-document consistency findings" | AG-07 v2.7, §4, L689 | None stated | Checker is carve-out A. |
| AG-7-62 | "When the Checker or the Reviewer raises a … the case SHALL emit a deficiency.detected … Emitting the event SHALL NOT itself send anything to …" | AG-07 v2.7, §4, L690 | None stated | — |
| AG-11-74 | "deficiency.detected (Checker or Reviewer found an issue)" | AG-11 v1.11, AG-11 §4 Agent-native triggers, L663 | None stated | — |
| AG-11 manual fallback | "With AI off, gated, or the provider unavailable, every path SHALL still work by hand (… checking by the Reviewer)" | AG-11 v1.11, AG-11 §4 AG-11-71, L658 | None stated | The Reviewer is the non-AI fallback for the Checker. |
| AG-07 §13 Q22 | "keep the Filler workflow and the Deficiency Library in Release 1" | AG-07 v2.7, §13 Open questions, L1188 | "The spec keeps them in Release 1; SCOPE-TRIAGE (5 Oct) proposes Release 2 for each, undecided." | — |
| TRI AG-07 moved | "Deficiency library, auto-detect rules, readiness score, Checker" | SCOPE-TRIAGE 2026-10-05, AG-07 Proposed to move, L94 | Proposed to move to Release 2 (list meaning, TRI L7) | — |
| TRI AG-07 stays | "internal review" | SCOPE-TRIAGE 2026-10-05, AG-07 Stays, L90 | Stays in Release 1 (list heading, TRI L6) | — |
| DOC3 §3.5 (July) | "gates progress to a ready/review/submitted stage until all blocking (CRITICAL) deficiencies clear." | Doc 3 v1.4, AG-7 §3.5, L3175 | None stated | October: never a lock (AG17-D17). |
| DOC3 US-3 (July) | "When I try to advance to READY/REVIEW, Then it is blocked with a message naming the deficiency (BR-3)." | Doc 3 v1.4, AG-7 user story US-3, L3392 | None stated | See row above. |

Requirement rows: **25**.

## Gaps noticed

- Gate vs warning: July Doc 3 blocks progress while a critical deficiency is open; October AG-07 (AG17-D17) never locks and lets a permitted person pass it with a reason.
- Release: AG-07 keeps the Deficiency Library in Release 1 and recommends doing so; SCOPE-TRIAGE proposes moving library, auto-detect and readiness score; the founder decision is open (AG-07 §13 Q22). Without the library, what the Reviewer computes in Release 1 is not stated. Inferred.
- Doc 2 seeds cap.reviewer at "enterprise" while FD-19 says a solo practice needs review/QC.
- Deterministic: the Reviewer is rule-based (pack library, auto-detect rules, readiness formula BR-30). Human steps: passing a critical warning (permission + reason), review approval, the one confirmation for unticked checklist items.
- Audit: every pass is audited with reason (AG-7-28); review rounds are recorded (AG-7-29).
- Which checks are critical per program is pack content from the Immigration-SME: confirm with RCIC.
