# Coverage: foundation slice (W1, 9 Oct 2026)

All files read from `sources/drive-snapshot-2026-10-09/` (newest snapshot) except the two founders' specs, read from the read-only code copy `code/expat-ready-api@c4117a3-2026-10-09/`. No archive or older snapshot was used. Word counts from `wc -w`.

| File | Version | Words | Read in full? (yes/no) | Sections covered | Notes |
|---|---|---|---|---|---|
| `01-techno-functional/01-RFP-Build-Proposal.md` | v2.0, last updated 2026-06-22 | 8,449 | yes (lines 1–544) | Document control, companion docs, §1–§14 | Procurement wrapper; demoted to "lineage" by FDL and DOC1 §9.1. Grep: no "AI"/OCR/ML mentions. |
| `01-techno-functional/02-Architecture-Decision-Record.md` | v1.0, last updated 2026-06-22 | 10,177 | yes (lines 1–512) | 15 normative corrections, decision table C1–6.4, founder decisions, execution plan W1–W4, top risks, appendix narrative §0–§9 | Decisions register, not a build source. Grep: no AI mentions. |
| `01-techno-functional/03-Doc-1-Platform-Foundation.md` | v1.3, last updated 2026-06-26 ("FINAL") | 56,558 | yes (lines 1–3093, in 13 chunks) | Summary, glossary, §1 (incl. §1.12 Capability Registry), §2, §3, §4, §5 (incl. §5.13), §6 (incl. §6.1.6 event registry), §7, §8, §9, Amendments A1–A7 | Master source for Doers, Conductor, RBAC, audit, consent, residency. Predates FD-16; no AI capability text. |
| `01-techno-functional/07-Founder-Decisions-Log.md` | v1.5, last updated 2026-08-02 | 8,037 | yes (lines 1–409) | FD-1…FD-15, FD-16…FD-22 incl. A22-1…A22-6, top gating decisions, A-1…A-5, B-1…B-5, C-1…C-8, D-1…D-6, E-1…E-3, engineering defaults, summary | Runs only to FD-22; FD-68 cited elsewhere is not in this file. |
| `02-functional-requirements/shared/00-Overview_v3.6_2026-10-07.md` | v3.6, 2026-10-07 | 4,541 | yes (lines 1–206) | Change log, document control, DOCS-1…7, summary, scope index SA-1…SA-12 + SA-1B, cross-cutting mandates, §1–§3.5 | Super Admin FR overview. |
| `02-functional-requirements/shared/99-Phasing-and-Glossary_v2.14_2026-10-08.md` | v2.14, 2026-10-08 | 4,377 | yes (lines 1–125) | Change log, §16 Phasing Summary (SA modules only), §17 Glossary | No glossary entries for Doer, Conductor or AI. |
| `02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md` | 2026-10-05 (review file) | 3,080 | yes (lines 1–270) | AG-01…AG-18, CP-01, founder questions, biggest savings | States it is "not a requirements document"; proposals only, two 8 Oct inline decisions. |
| `06-program-management/Program Charter V1 - G1 expanded.md` | No version in file (dump of "...G1 expanded v2.pptx") | 5,599 | yes (lines 1–599) | §1–§7 with speaker notes, sprint planning | Holds the key speaker-note definitions (Doers deferred, FD-20 human review). |
| `06-program-management/Program Charter_V2.pptx` | Slide header "v6" | 1,462 (zip, per `wc`) | yes (all 7 slides and all 7 speaker-notes pages; text extracted from slide and notesSlide XML with unzip + regex in the scratchpad) | Slides 1–3 (plan), Appendix A–D, notes 1–7 | Speaker notes differ from slide text on dates (28 Feb launch; G1 30 Oct; G3 18 Dec). |
| `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md` | v1, decided 2026-06-13 | 1,114 | yes | §1–§9 incl. clearance log | Founders' Doer roster (not on Drive). |
| `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md` | v1, approved 2026-06-14 | 743 | yes | Philosophy, sidebar, My Day, ⌘K, launcher, contextual Doers, phasing, status | Not asked for and not read: the third spec `2026-06-13-er-doers-moat-reservation-playbook.md` (outside slice). |

Total words read: about 104,000.

Not in this slice but noticed: `01-techno-functional/04-Doc-2-SuperAdmin-Console.md`, `05-Doc-3-Agent-Console.md`, `06-Doc-4-Client-Portal.md` exist in the snapshot and belong to other slices.
