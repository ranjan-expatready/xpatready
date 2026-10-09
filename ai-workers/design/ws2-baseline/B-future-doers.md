# B-future-doers: Submitter, Reader (OCR history) and Planner

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What this file covers.** The founders' June naming spec lists four "Future Doers (confirm when built)": Submitter (government submission), Reader (OCR / extraction), Planner (case roadmap / timeline) and Timer (billable time). Timer became the Clocker (see B-clocker). This file records what the snapshot says about the other three. **Status in one line:** no Submitter exists by rule (no Doer may submit to a government authority); the Reader is now an AI Doer specified in AG-11 (carve-out A covers it; only its earlier OCR history is here); the Planner appears only in the founders' spec. None of the three names a third-party product it replaces.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- AG-11 v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-11-automation_v1.11_2026-10-07.md`
- AG-07 v2.7: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-07-case-core-and-delivery_v2.7_2026-10-07.md`
- Charter V1 (md dump): `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter V1 - G1 expanded.md`
- AG-18 v1.2: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-18-data-import-and-migration_v1.2_2026-10-07.md`
- Doc 3 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md`
- Doc 1 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/03-Doc-1-Platform-Foundation.md`
- SA-01B v1.2: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-01B-content-pack-configurator_v1.2_2026-10-05.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- AG-17 v0.5: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-17-corporate-cases-and-lmia_v0.5_2026-10-07.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N future Doers | "Submitter (IRCC submission) · Reader (OCR/extraction) · Planner (case roadmap/timeline) · Timer (billable-time tracking)." | Founders naming spec v1 (2026-06-13), §5 Roster, Future Doers "(confirm when built)", L85 | Future (confirm when built) | — |
| SPEC-N status | "Future Doers (Submitter, Reader, Planner, Timer) to confirm as each ships." | Founders naming spec v1 (2026-06-13), §9 Status / open items, L116 | None stated | — |
| Submitter: AG-11-54 | "No Doer action SHALL submit anything to a government authority, at any autonomy level." | AG-11 v1.11, AG-11 §4 Autonomy levels, L635 | None stated | Rules out a Submitter Doer as specified in October. |
| Submitter: product floor | "ExpatReady submits nothing to an authority" | AG-11 v1.11, AG-11 §0 overriding principle (four product floors), L24 | None stated | — |
| Submitter: AG-07 | "ExpatReady never submits a form to an authority itself (§3.7 — the RCIC records the submission)." | AG-07 v2.7, AG-07 §3.5, L462 | None stated | — |
| Submitter: Charter | "Release 1 does not file electronically with the government" | Charter V1 (md dump), Speaker notes, the journey, L115 | "Release 1 does not file electronically with the government" | — |
| Submitter: AG-18 | "IRCC portal autofill or a browser extension \| Not part of this module; not decided" | AG-18 v1.2, AG-18 §0.1, L147 | "not decided" | A browser helper for the government portal is open at platform level (AG-18 L848). |
| Reader (OCR) history: Doc 3 | "OCR / auto-extraction (e.g. passport MRZ prefill) — OUT of base scope (a separately-priced content/automation option)" | Doc 3 v1.4, AG-9 deferrals (July), L4452 | "OUT of base scope" | October AG-11 AG11-D4 makes the Reader an AI Doer in Release 1, built but switched off (carve-out A). |
| Reader (OCR) history: Doc 3 verification | "Human "I checked it" flag now; OCR/assisted typed-value-vs-scan cross-check is a named later deferral (out of base build)." | Doc 3 v1.4, AG-8 open questions (July), L3951 | "named later deferral" | — |
| Reader (OCR) history: Doc 1 worker | "Email send, inbound-mail sync, form/PDF generation, OCR, virus-scan, automation/Doer execution" | Doc 1 v1.3, §1 Async / queues, L110 | None stated | Doc 1 reserves an OCR worker slot. |
| Reader (OCR) history: SA-01B | "AI reading of uploaded documents \| Defer \| §0.1" | SA-01B v1.2, SA-01B §0.3 scope table, L112 | "Defer" | Conflicts with AG11-D4 (Reader in Release 1). |
| Reader (OCR) history: TRI | "Reader AI — classify and extract [F] (ships switched off anyway)" | SCOPE-TRIAGE 2026-10-05, AG-09 Proposed to move, L118 | Proposed to move to Release 2 (list meaning, TRI L7) | — |
| Reader: Canada-only processing | "AI and OCR processing of client data (all four AI Doers, including the Reader's OCR) happens only in Canada." | AG-11 v1.11, AG-11 §0 AG11-D15, L44 | None stated | Carve-out A covers this in full. |
| Planner: AG-07 step rail | "Step rail on the case (current step highlighted, open items in earlier steps, government steps with dates, next expected step)" | AG-07 v2.7, AG-07 §3.3 key screens, L426 | None stated | Closest October feature to a "case roadmap/timeline"; it is not called a Doer. Inferred. |
| Planner: AG-17 what's next | ""What's next." The top of every file lists the open items that need action now" | AG-17 v0.5, AG-17 §3.3, L512 | None stated | Not called a Doer. Inferred link to the Planner idea. |

Requirement rows: **15**.

## Gaps noticed

- Submitter: the October requirements forbid any Doer from submitting to a government authority (AG-11-54, product floor). A "Submitter" Doer would contradict a stated product floor; the Charter also says Release 1 does not file electronically.
- Reader: its history runs from "OUT of base scope" (Doc 3, July) and "Defer" (SA-01B) to an AI Doer in Release 1, switched off until processing terms are recorded (AG11-D4, D13, D15). Carve-out A holds the current Reader requirements.
- Planner: only the founders' June spec names it. No requirement defines it; the closest features are AG-07's step rail and AG-17's "What's next" list.
