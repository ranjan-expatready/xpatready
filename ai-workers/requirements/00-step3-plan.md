# Step 3: build specification, plan (the Lead, 11 Oct 2026)

*One outcome: requirement documents the team can build and test from, in the team's own FR format, plus the change notes for the team's existing documents, generated test cases and a clickable prototype. Built only on the seven passed behaviour documents (`../design/behaviours/`), the founder's decisions (AIW-D36 to D67) and the 9 Oct Drive snapshot. Rules: README §0 (1–11). Gate: `../PROGRESS.md` "Per step" row 3.*

## What is produced

| # | File | What it is | Maker |
|---|---|---|---|
| A | `AW-01-firm-ai-assistants_v0.1.md` | New module, Agent plane, in the team's FR format: the shared machinery (delegation record, run record, persona recipes, approvals and safeguards, audit and provenance, spend caps, emergency stops, evaluation set, risk register and incident procedure in the four NIST functions) and the five firm assistants (Case, Intake, Billing, Firm, Practice expert). Requirement IDs `AW-1-n`; business rules `AW1-BR-n`; decisions `AW1-Dn` citing AIW-D rows | one maker |
| B | `AW-02-platform-ai-assistants_v0.1.md` | New module, Super Admin plane, same format: the platform-plane engine and run log (tenant rule), the Pack author's assistant, the Support and account assistant. IDs `AW-2-n` | one maker |
| C | `change-notes/CN-<module>.md` | One change note per existing Drive module the decisions and the Step 2 gaps touch (AG-02, AG-03, AG-05, AG-06, AG-07, AG-08, AG-09, AG-10, AG-11, AG-12, AG-13, AG-14, AG-16, AG-17, AG-18, SA-01, SA-01B, SA-02, SA-03, SA-04, SA-06, SA-08, SA-10, SA-11, SA-12, CP portal, and the Founder Decisions Log): each change with the current words, the proposed words, the reason (AIW-D, IMP, review, proposals row) and the knock-ons, in the FR document's own style, for the founder to place on Drive | two makers (Agent plane; Super Admin plane, portal and decisions log) |
| D | `tests/AW-test-cases.csv` | Test cases generated from A and B's acceptance criteria and edge cases, in the team's test-case format (Module, Feature, Test Case ID, Scenario, Steps, Expected Result, Status, Comments) | after A and B pass; Opus 5.5 (AIW-D29) |
| E | `../prototype/` | A standalone clickable page, every screen traced to an `AW-` requirement: Needs you with the readiness report item and the approve-all safeguards; setting up and ending a delegation; the AI provenance view of a file; the Practice expert menu; the Billing proposed match into Record payment; the AI switch locked until a Canada provider is recorded | after A and B pass |
| F | `counsel-pack.md` | One file for counsel built from the seven behaviour documents' §7 and the provisional decisions (AIW-D55 to D58, D52, D64, D66): what counsel must read and answer before the pilot | the Lead |

## Order
1. A, B and the two halves of C start together; each maker writes only its own files and hands back its log lines and proposals rows (only the Lead writes `PROGRESS.md` and `proposals.md`).
2. Each goes to a hostile checker, a fix round, and a re-check or the Lead's verification.
3. D and E start once A and B pass. F is written by the Lead alongside.
4. Integration: one consistency pass across A–F; the Step 3 report to the founder.

## Shared rules for every Step 3 maker (set before they start)
- The team's FR format, as in AG-18 v1.2: document control table; module header; module index; visual overview; §0 decision log; §1 purpose and goal; §2 users and jobs; §3 functional design; §4 detailed functional requirements (numbered, SHALL wording); §5 business rules; §6 states and lifecycle; §7 key entities and fields; §8 user stories and acceptance criteria; §9 edge cases and validations; §10 permissions; §11 scalability, security, performance; §12 reference note (exists today, NEW, CHANGED); §13 open questions and founder decisions.
- Every requirement cites the behaviour document section it specifies and the Drive requirement it extends (ID, file, version); nothing restates a Drive requirement (AIW-D22); privacy and regulatory flags per requirement, for counsel.
- Decisions as the founder took them (AIW-D36 to D67), in particular: a named person's delegation (D36); the deadline watch is the product's (D37); both Firm assistant delegations (D38); Practice expert version 1 and its rule-built answers as an AG-14 change note (D39); Release 1 waits for the AI assistants (D66); only in Canada (D52); Writer (D53); the ten confirmed calls (D54); provisional safety decisions until counsel (D55–D58, D64).
- The provider is replaceable: no requirement names a provider; the residency rule, the no-training and no-retention agreement and the test call are requirements on the provider record.
- The six-kind counting unit, the `sourceItemRef` rule, the why-line rule and the tenant rule apply as in the behaviour documents.
- No personal names (rule 10); plain words first, field names in brackets; every term explained or in the glossary.
- Illustrative user voice (jobs-to-be-done lines) goes in italics, never in quotation marks; quotation marks are only for word-for-word source quotes (added 11 Oct from the AW-02 maker).
