# Coverage: slice ag-frs-2 (Firm plane detailed FRs AG-10 to AG-18)

Reader: requirements-cartographer, W1, 9 Oct 2026. Folder: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/`. Each file was read from line 1 to its last line in chunks with the Read tool; notes were written to `ag-frs-2.md` after each file. Word counts from `wc -w`.

| File | Version | Words | Read in full? (yes/no) | Sections covered | Notes |
|---|---|---|---|---|---|
| AG-10-communication-hub_v1.9_2026-10-07.md | 1.9 (2026-10-07) | 25,744 | yes (lines 1–829) | Document control and change log 1.1–1.9; Applied-from tables (AG-17, AG-11/AG-18, SA-06); Visual overview; §1–§13 incl. AG-10-1 to AG-10-59, BR-1 to BR-32, US-1 to US-17 | Mailer, Messenger, Sorter, Drafter; consent gate; supervision; WhatsApp R1 |
| AG-11-automation_v1.11_2026-10-07.md | 1.11 (2026-10-07) | 46,375 | yes (lines 1–1320) | Document control 1.1–1.11; §0 decision log AG11-D1 to D18; §0.2 pending knock-ons; Applied-from tables (SA-06, AG-18, AG-01, AG-17); Visual overview; §1–§13 incl. AG-11-1 to AG-11-108, BR-1 to BR-41, US-1 to US-32, edge cases, permissions, reference note, phasing | Full Conductor model captured in Part 2 (triggers, conditions, actions, autonomy, recipes, idempotency, consent re-checks, simulation, audit) |
| AG-12-templates_v1.2_2026-10-07.md | 1.2 (2026-10-07) | 11,193 | yes (lines 1–606) | Document control; SA-06 table; Visual overview; §1–§13 incl. AG-12-1 to AG-12-37, BR-1 to BR-14, US-1 to US-10 | Status "Baseline — not yet reviewed"; AG-11 knock-ons not applied |
| AG-13-tasks-reminders-notes-and-activity-audit_v1.12_2026-10-07.md | 1.12 (2026-10-07) | 16,569 | yes (lines 1–714) | Document control 1.1–1.12; Applied-from tables (SA-06, AG-17, AG-01); Visual overview; §1–§13 incl. AG-13-1 to AG-13-67, BR-1 to BR-21, US-1 to US-13 | No AI content in this module |
| AG-14-reporting-and-analytics_v1.10_2026-10-07.md | 1.10 (2026-10-07) | 13,507 | yes (lines 1–670) | Document control 1.1–1.10; Applied-from tables (AG-17, AG-01, SA-06); Visual overview; §1–§13 incl. AG-14-1 to AG-14-34, BR-1 to BR-16, US-1 to US-12 | Anomaly detection deferred |
| AG-15-client-portal-management_v1.6_2026-10-08.md | 1.6 (2026-10-08) | 14,733 | yes (lines 1–694) | Document control 1.1–1.6; Applied-from tables (AG-01, AG-17, AG-07/CP-01); Visual overview; §1–§13 incl. AG-15-1 to AG-15-51, BR-1 to BR-17, US-1 to US-12 | Firm side of the portal; client app is CP-01 (other slice) |
| AG-16-firm-settings-and-integrations_v1.12_2026-10-08.md | 1.12 (2026-10-08) | 25,984 | yes (lines 1–865) | Document control 1.1–1.12; Applied-from tables (AG-17, AG-11/AG-18, SA-06, AG-01); Visual overview; §1–§13 incl. AG-16-1 to AG-16-54, BR-1 to BR-23, US-1 to US-17 | AI switch, Team safeguards, supervision, standard-messages review, timings |
| AG-17-corporate-cases-and-lmia_v0.5_2026-10-07.md | 0.5 (2026-10-07), Draft | 34,350 | yes (lines 1–1221) | Document control 0.1–0.5; §0 decision log AG17-D1 to D82; applied-from-other-modules table; §0.1 Release 2; §0.2 knock-ons; §1–§13 incl. AG-17-1 to AG-17-90, BR-1 to BR-16, US-1 to US-34, edge cases, permissions, reference note, open questions | Draft awaiting expert check of rule values |
| AG-18-data-import-and-migration_v1.2_2026-10-07.md | 1.2 (2026-10-07), Draft | 26,839 | yes (lines 1–852) | Document control 1.0–1.2; Applied-from tables (AG-07/CP-01, SA-06, AG-11, others); §0 decisions AG18-D1 to D12; §0.1; §0.2; §1–§13 incl. AG-18-1 to AG-18-91, BR-1 to BR-28, US-1 to US-28 | New module; Reader on imports; quiet "Not started" state |

**Totals:** 9 files, 215,294 words, all read in full.

**Not read (outside this slice):** 00-Overview, 99-Phasing-and-Glossary, AG-01 to AG-09, SCOPE-TRIAGE, Doc 3, SA and CP documents. Cross-references to them are recorded as they appear in this slice's text, not verified against those documents.

**Quote check:** every quoted string in `ag-frs-2.md` was machine-checked against the nine source files (whitespace-normalised, split at "..."); remaining non-matches were confirmed to be false positives from cells holding several quotes. Quotes over 25 words were shortened or split.
