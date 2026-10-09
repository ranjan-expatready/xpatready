# B-binder: the Binder (case document checklist and collection)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Binder is each case's document checklist, built from the country pack for the chosen program: it lists what is needed, requests items from the client through the portal, receives the uploads against the right line, lets staff approve or reject them with a reason, tracks translation, notarisation and expiry, and reports how complete the file is. Reminders for missing documents are sent by the Minder and the Conductor's chase recipe. **Who uses it:** case officers (request, review, approve); clients (upload through the portal) (AG-07, AG-09, AG-15). **What it replaces (founders' spec):** none named; it is a Tier 3 "immigration-only moat" Doer ("client doc collection + checklist"; the IP is "secure intake"). **Status in one line:** the checklist is Release 1 in every source; the July documents make it a read-only view over AG-09's document statuses, while October AG-07 gives it its own status list.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- Agent 99-Phasing v1.4: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/99-Phasing-and-Glossary_v1.4_2026-10-05.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- AG-07 v2.7: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-07-case-core-and-delivery_v2.7_2026-10-07.md`
- SA-06 v3.1: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-06-rbac_v3.1_2026-10-08.md`
- AG-11 v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-11-automation_v1.11_2026-10-07.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- ADR v1.0: `sources/drive-snapshot-2026-10-09/01-techno-functional/02-Architecture-Decision-Record.md`
- Doc 3 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Binder \| client doc collection + checklist \| secure intake" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 3, L80 | Tier 3 (no release date) | — |
| SPEC-N -or rule | "Collector \| Binder" | Founders naming spec v1 (2026-06-13), §3, L40 | None stated | — |
| SPEC-N clearance | "Gatherer → Binder (founder also disliked "Gatherer"). "Binder" = caution: nearest twin Binderr" | Founders naming spec v1 (2026-06-13), §9 Clearance log, L123 | None stated | "Kept as an in-app feature name — do NOT trademark the bare word" (same line). |
| SPEC-IA My Day | "Docs overdue \| Binder" | Founders IA Doers model v1 (2026-06-14), Home = "My Day", L44 | None stated | — |
| SPEC-IA command bar | "Request documents → Binder" | Founders IA Doers model v1 (2026-06-14), ⌘K "Do" bar, L53 | None stated | — |
| APHG glossary | "Binder (documents)" | Agent 99-Phasing v1.4, Glossary, "Doer", L52 | None stated | — |
| DOC2 capability | "cap.binder \| case-delivery.documents \| DOER \| cap.drafter \| feature.docs.package \| growth" | Doc 2 v1.4, SA-CT capability registry seed table, L84 | "growth" (illustrative tier) | Doc 2 makes the Binder depend on the Drafter; no October file states that dependency. |
| AG-07 §3.4 how it works | "Every case has a Binder: a checklist of required documents derived from the Country Pack for the case's program/stream, plus any custom requirements the …" | AG-07 v2.7, §3.4 Document Collection & Checklists — the Binder, L432 | None stated | — |
| AG-07 §3.4 statuses | "PENDING … REQUESTED … UPLOADED … UNDER_REVIEW … APPROVED … REJECTED … NOT_APPLICABLE" | AG-07 v2.7, §3.4, L434 | None stated | ADR L376 and Doc 3 L3149: AG-7 owns no document-status code and reads AG-9's 10-state enum. |
| AG-07 §3.4 request loop | "the upload lands against the specific Binder requirement … and are chased automatically by the Minder (reminders for outstanding documents) and the Conductor (a document-request playbook)." | AG-07 v2.7, §3.4 Request-from-client, L436 | None stated | Missing-document chase recipe: Release 1 seed (AG-11 L370). |
| AG-07 §3.4 on behalf | "Staff may also complete an upload on the client's behalf, clearly marked as done on the client's behalf — never a signature" | AG-07 v2.7, §3.4, L436 | None stated | — |
| AG-07 §3.4 translation | "Whether a given document needs translation/notarisation for a given country is a pack value (SME-owned)." | AG-07 v2.7, §3.4 Translations & notarisation, L438 | None stated | Confirm with RCIC. |
| AG-07 §3.4 reuse | "A document already collected and approved on one case for a client … can be reused on another case for the same client rather than re-requested" | AG-07 v2.7, §3.4 Reuse across cases, L440 | None stated | TRI L90 keeps "reuse prospect documents". |
| AG-07 §3.4 data flow | "officer review (UNDER_REVIEW) → approve/reject/not applicable (reason on reject and not applicable) → status update + timeline + Notification … → AuditLog on every …" | AG-07 v2.7, §3.4 Data flow, L451 | None stated | — |
| AG-7-6 | "Case creation SHALL materialise the required document checklist and the required government-form set from the pack configuration" | AG-07 v2.7, §4, L613 | None stated | — |
| AG-7-15 | "A case SHALL present a document checklist (Binder): each CaseDocument SHALL carry a required/optional … a status (PENDING \| REQUESTED \| UPLOADED \| UNDER_REVIEW …" | AG-07 v2.7, §4 Document collection (the Binder), L626 | None stated | Doc 3 v1.4 AG-7-15 (L3242) reads AG-9's 10-state Document.status, "never a private status copy". |
| AG-7-16 | "Staff with agent/case:document-manage SHALL add custom (ad-hoc) documents … and SHALL be able to mark a pack document not-applicable with a reason" | AG-07 v2.7, §4, L627 | None stated | — |
| AG-7-17 | "a reject SHALL require a reason and SHALL notify the responsible party" | AG-07 v2.7, §4, L628 | None stated | Human judgement step (accept / reject a document). |
| AG-7-18 | "the Binder is the single source the portal reads/writes — no parallel document store" | AG-07 v2.7, §4, L629 | None stated | — |
| AG-7-19 | "The Binder SHALL compute and surface checklist completeness (required items approved / total required) as a first-class readiness signal" | AG-07 v2.7, §4, L630 | None stated | Feeds the Reviewer (see B-reviewer). |
| SA-06 permission | "agent/case:document-manage \| Add/request/approve/reject Binder documents" | SA-06 v3.1, Permission catalogue, L792 | None stated | — |
| AG-11 recipe chase | "It chases only documents that were actually requested on the file; it never decides which documents a program needs (that is the AG-07/AG-09 checklist, pack-driven)." | AG-11 v1.11, AG-11 §3.5 Missing-document chase, L370 | Release 1 seed (heading, AG-11 L367) | — |
| AG-11 recipe received | "Approving the document's Reader values completes the "Review document" task." | AG-11 v1.11, AG-11 §3.5 Document-received recipe, L369 | Release 1 seed (heading, AG-11 L367) | Reader is carve-out A. |
| TRI AG-07 stays | "document checklist (Binder)" | SCOPE-TRIAGE 2026-10-05, AG-07 Stays, L90 | Stays in Release 1 (list heading, TRI L6) | — |
| TRI AG-09 stays | "request from client, reject with reason · status and checklist" | SCOPE-TRIAGE 2026-10-05, AG-09 Stays, L114 | Stays in Release 1 (list heading, TRI L6) | — |
| ADR C2-D3 | "ONE 10-state lifecycle; AG-7's 7-state enum dropped; checklist = derived view over AG-9 Documents." | ADR v1.0, C2 decisions, L376 | None stated | Conflicts with October AG-7-15 (own 7-status list). |
| DOC3 §3.3 (July) | "AG-7 owns no document-status code — it reads exactly AG-9's authoritative 10-state enum" | Doc 3 v1.4, AG-7 §3.3, L3149 | None stated | See row above. |

Requirement rows: **27**.

## Gaps noticed

- Document status owner conflict: ADR C2-D3 and Doc 3 make the Binder a derived view over AG-09's single 10-state document status; October AG-07 (§3.4, AG-7-15) gives the Binder its own 7-state list. Inferred: one status list must win before build.
- Doc 2 makes the Binder depend on the Drafter (cap.binder → cap.drafter) and maps it to feature.docs.package; no October file explains either.
- Deterministic: checklist from the pack, completeness count, reuse eligibility (validity), chase stop rule. Human steps: approve, reject (reason) or mark not-applicable (reason); add custom documents; staff uploads on the client's behalf are marked as such.
- Audit: "AuditLog on every status change" (AG-07 L451); reuse is audited.
- The Binder never decides which documents a program needs; that is pack content from the Immigration-SME (confirm with RCIC).
