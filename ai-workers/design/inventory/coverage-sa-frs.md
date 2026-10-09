# Coverage: sa-frs (Super Admin detailed functional requirements)

Reader: requirements-cartographer, W1, 9 Oct 2026. Source: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/` (newest snapshot; no archive or older snapshot read). Every file was read from line 1 to its last line, in chunks of 110–200 lines; notes were written into `sa-frs.md` after each file. Word counts from `wc -w`.

| File | Version | Words | Read in full? (yes/no) | Sections covered | Notes |
|---|---|---|---|---|---|
| SA-01-country-and-immigration-pack-management_v2.2_2026-09-22.md | 2.2 (22 Sep 2026) | 7,830 | yes (lines 1–511) | Document control; §0 decision log, §0.1–0.3; Module index; Visual overview; §1–§13 | §3.3–3.11 moved to SA-01B (pointer only in this file) |
| SA-01B-content-pack-configurator_v1.2_2026-10-05.md | 1.2 (5 Oct 2026) | 8,887 | yes (lines 1–410) | Document control; §0 decisions SA1B-D1–D28, §0.1–0.3; §1–§13 incl. sources list | Only Super Admin file with explicit AI permissions (SA-1B-33–35), all deferred |
| SA-02-tenant-firm-management_v2.19_2026-10-08.md | 2.19 (8 Oct 2026) | 13,348 | yes (lines 1–651) | Document control (v2.0–v2.19); §0 decisions and applied tables, §0.1–0.3; Visual overview A–C; §1–§13 | Support-session rules (SA-2-17) are the closest pattern for a non-firm actor |
| SA-03-subscription-plans-and-entitlements_v2.14_2026-10-07.md | 2.14 (7 Oct 2026) | 13,546 | yes (lines 1–662) | Document control; §0 decisions, applied tables, §0.1–0.3; Visual overview A–B; §1–§13 | Product map, limits, Minder always-on |
| SA-04-saas-billing_v2.14_2026-10-08.md | 2.14 (8 Oct 2026) | 18,532 | yes (lines 1–775) | Document control; §0 decisions SA4-D1–D26, P1, §0.1–0.3; Visual overview A–C; §1–§13 incl. sources | "no part of SA-4 works on `dev`" (§12) |
| SA-05-global-templates_v2.2_2026-10-02.md | 2.2 (2 Oct 2026) | 12,188 | yes (lines 1–581) | Document control; Module index; Visual overview A–B; §1–§13 | Status "Baseline — not yet reviewed"; several conflicts with reviewed modules |
| SA-06-CHANGE-NOTE_2026-10-07.md | change note (7 Oct 2026) | 2,205 | yes (lines 1–100) | §1 decisions, §2 documents updated, §3 code to change, §4 still open | Records the role-assignment security bug |
| SA-06-rbac_v3.1_2026-10-08.md | 3.1 (8 Oct 2026) | 31,609 | yes (lines 1–1315) | Document control; decision tables SA6-D1–D11 and applied tables; Visual overview A–C; §1–§13; §10a, §10b (all module key tables AG-01 to AG-18, SA-11, code-only keys), §10c; Appendix B (rename map, all rows); Appendix C | Longest file; AI-related keys in §10b AG-08, AG-10, AG-11 and Appendix C |
| SA-07-platform-users_v2.10_2026-10-08.md | 2.10 (8 Oct 2026) | 13,562 | yes (lines 1–742) | Document control; §0 decisions SA7-D1–D67, §0.1–0.3; Visual overview A–C; §1–§13; Appendix A | Staff accounts human-only |
| SA-08-platform-integrations-and-infrastructure-rails_v2.2_2026-10-02.md | 2.2 (2 Oct 2026) | 11,395 | yes (lines 1–642) | Document control; applied table; Module index; Visual overview A–C; §1–§13 | No AI/model-provider rail listed |
| SA-09-platform-analytics-and-observability_v2.2_2026-10-02.md | 2.2 (2 Oct 2026) | 11,476 | yes (lines 1–614) | Document control; applied table; Visual overview A–B; §1–§13 | Status "Baseline" |
| SA-10-support_v2.5_2026-10-07.md | 2.5 (7 Oct 2026) | 11,365 | yes (lines 1–626) | Document control; applied tables; Module index; Visual overview A–C; §1–§13 | Suggest-only auto-triage; status "Baseline" |
| SA-11-audit-compliance-and-data-governance_v2.7_2026-10-07.md | 2.7 (7 Oct 2026) | 12,855 | yes (lines 1–631) | Document control; applied tables; Visual overview A–C; §1–§13 | Actor types: super_admin, firm_staff, client, system only |
| SA-12-feature-flags-and-platform-configuration_v2.7_2026-10-08.md | 2.7 (8 Oct 2026) | 13,075 | yes (lines 1–628) | Document control; applied tables; Module index; Visual overview A–C; §1–§13 | Status "baseline"; internal inconsistency on firm overrides |

**Total:** 14 files, 181,873 words, all read in full. Nothing in this folder was skipped. Also read for context (outside the slice, not inventoried): `ai-workers/README.md`, `ai-workers/NEXT.md`, `ai-workers/design/inventory/SCHEMA.md`, row E4 of `ai-workers/research/email-evidence.md`.

**Quote check:** every quoted string in `sa-frs.md` was machine-compared against the source text (markdown emphasis removed); mismatches found were corrected, and quotes of 25 words or more were shortened or split.
