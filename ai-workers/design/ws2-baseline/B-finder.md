# B-finder: the Finder (universal search for staff)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Finder is one search box for firm staff that looks across every kind of record (leads, clients, cases, documents and so on) and returns only what the person is allowed to see. **Who uses it:** firm staff only; the client portal has no universal search (Doc 1 §8.8). **What it replaces (founders' spec):** none. The Finder is not in the founders' June Doer roster; Doc 2 says the name is "pending adoption in the brand-naming spec". **Status in one line:** specified in the July foundation documents (Doc 1, ADR, Doc 2); no October module file specifies it, and only one October permission row (SA-06) names it.

**Sources used in this file** (short name, then file):

- ADR v1.0: `sources/drive-snapshot-2026-10-09/01-techno-functional/02-Architecture-Decision-Record.md`
- Doc 1 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/03-Doc-1-Platform-Foundation.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- SA-06 v3.1: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-06-rbac_v3.1_2026-10-08.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| ADR C4-D4 | "NEW platform SearchModule (the 'Finder') owns universal cross-entity search. … Every result is firm-scoped + permission-filtered + record-level-ownership-filtered. Portal gets NO universal search." | ADR v1.0, Decision record (C4 batch), L141 | None stated | — |
| ADR C4-D4 summary | "C4-D4 NEW platform SearchModule (the "Finder") — universal cross-entity search over a denormalised SearchDocument projection maintained asynchronously from the event dictionary" | ADR v1.0, Decision summary, L434 | None stated | — |
| DOC1 glossary Doer | "Doer — an in-house capability (Signer/Mailer/Scheduler/Biller/Minder/Filler/Qualifier/Messenger/Finder…) on a swappable rail port/adapter" | Doc 1 v1.3, Glossary, L33 | None stated | The founders' roster (SPEC-N §5) has no Finder. |
| DOC1 §8.8 purpose | "One firm-scoped, permission-filtered, ownership-filtered search across all entity types, owned by a dedicated module so it is decoupled, isolation-correct, and never a cross-firm PII …" | Doc 1 v1.3, §8.8 Universal cross-entity search, L2536 | None stated | — |
| DOC1 §8.8 owner | "Owner: a new platform SearchModule ("the Finder"). The Client Portal gets no universal search" | Doc 1 v1.3, §8.8, L2538 | None stated | — |
| DOC1 §8.8.1 backing | "v1 backing = PostgreSQL full-text search (tsvector + GIN) over a denormalised SearchDocument projection, behind a SearchIndexPort. OpenSearch is the documented, costed contingency adapter" | Doc 1 v1.3, §8.8.1 Design, L2541 | "explicitly deferred" (OpenSearch) | — |
| DOC1 §8.8.1 async | "The projection is maintained ASYNCHRONOUSLY from the canonical domain-event dictionary (§6)." | Doc 1 v1.3, §8.8.1 Design, L2542 | None stated | — |
| DOC1 §8.8.1 no Restricted PII | "NO Restricted PII is projected into the search index. Passport numbers, SIN/foreign equivalents, government-ID numbers, financial-account details, biometric references, and licence/designated-person credentials never enter SearchDocument." | Doc 1 v1.3, §8.8.1 Design, L2544 | None stated | October AG7-D10 removes masking of personal data on screens and search (AG-13 v1.12 L10); whether the July index exclusion still stands is not restated in October. Inferred. |
| DOC1 §8.8.1 triple filter | "Every result is triple-filtered: firm-scoped → permission-filtered (no entity-type permission ⇒ zero hits of that type) → record-level-ownership-filtered" | Doc 1 v1.3, §8.8.1 Design, L2545 | None stated | Overlaps AG-13-67, which lists "search" among the read paths that apply record visibility. |
| DOC1 AC-F1 | "Tenant A's search never returns a Tenant B row, including via error message or count" | Doc 1 v1.3, §8.8.2 Acceptance criteria, L2558 | None stated | — |
| DOC1 AC-F4 | "Search p95 ≤ 500 ms at launch data volume; a reindex job rebuilds the projection from source-of-truth and is delivered." | Doc 1 v1.3, §8.8.2 Acceptance criteria, L2561 | None stated | Same target as P8 (DOC1 L2316). |
| DOC1 §6.3 pure Doer | "The remaining Doers (Scheduler, Minder, Filler, Qualifier, Finder, Messenger's in-process automation) are pure in-house Doers … they ship in later waves and are not foundation scope" | Doc 1 v1.3, §6.3 Rails as ports, L1786 | "not foundation scope" | Contradicts Doc 1 §8.8 itself, which places the Finder in the foundation's cross-cutting services, and Doc 1 L2625, which lists Finder acceptance tests in the foundation exit. |
| DOC1 exit criteria | "Finder: AC-F1..F5 green (cross-tenant/permission/ownership denial + no-Restricted-PII scanner + p95 + reindex + port substitution)." | Doc 1 v1.3, Foundation exit criteria, L2625 | None stated | See row above. |
| DOC2 capability | "cap.finder \| search \| DOER \| — \| feature.search \| baseline" | Doc 2 v1.4, SA-CT capability registry seed table, L89 | "baseline" (illustrative tier) | — |
| DOC2 naming | "cap.finder registers the Finder (the universal-search Doer, Doc 1 §8.8) here; the Finder name is pending adoption in the brand-naming spec." | Doc 2 v1.4, SA-CT, L99 | None stated | The founders' naming spec v1 (13 Jun) was not amended in the code copy to add the Finder. |
| SA-06 permission | "agent/search:query \| Run staff-only search queries across the firm (Finder) \| Y \| Y \| Y \| - \| - \| Y \| in ERv2" | SA-06 v3.1, Code-only keys — ERv2 catalogue keys with no AG §10 row, L1012 | None stated | No October AG module has a §10 row for this key (SA-06 heading for this table). |

Requirement rows: **16**.

## Gaps noticed

- No October requirement file (AG-01…AG-18, SA-01…SA-12, Overview, Phasing) specifies the Finder; it lives only in Doc 1, the ADR and Doc 2 (July), plus one code-only permission row in SA-06 v3.1.
- Release label is missing: the Charter, Agent 99-Phasing v1.4 and the scope review never mention universal search. Doc 1 contradicts itself on whether the Finder is foundation scope (L1786 against §8.8 and L2625).
- The Finder is not in the founders' Doer roster, and the Agent glossary (99-Phasing v1.4 L52) does not list it.
- The founders' IA spec has a global "⌘K · Do" bar that summons Doers (SPEC-IA L14, L53); that is a command bar, not record search. How the two relate is not stated anywhere.
- Fully deterministic (full-text index and filters). No human step, no AI, and no audit requirement for search queries is stated.
