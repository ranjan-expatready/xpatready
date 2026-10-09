# B-recruiter: the Recruiter (LMIA recruitment evidence for employer clients)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Recruiter records an employer's recruitment effort for an LMIA file so it can be proved later: each advertising channel with dates and proof, an advertising clock ("day X of Y") that computes the earliest recruitment-complete date and the latest submission date, a candidate log with outcomes and rejection reasons, warnings when the stream's rules are not met, and a one-click recruitment report. It records recruitment; it does not run it (no job-board posting, applicant inbox or interview scheduling in Release 1). **Who uses it:** firm staff on corporate (employer) files; the employer sees nothing about candidates in Release 1 (AG-17, CP-9). **What it replaces (founders' spec):** not in the founders' June roster; it is named a Doer only in Doc 2's capability catalogue and Doc 3's AG-17 (July). **Status in one line:** full LMIA, including recruitment compliance, is Release 1 (AG17-D51); the "recruitment engine" is Release 2; FD-7 fixes the light-evidence scope.

**Sources used in this file** (short name, then file):

- FDL v1.5: `sources/drive-snapshot-2026-10-09/01-techno-functional/07-Founder-Decisions-Log.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- Doc 3 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md`
- AG-17 v0.5: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-17-corporate-cases-and-lmia_v0.5_2026-10-07.md`
- Agent 00-Overview v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/00-Overview_v1.11_2026-10-07.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Doc 4 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/06-Doc-4-Client-Portal.md`
- Charter V1 (md dump): `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter V1 - G1 expanded.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| FD-7 | "AG-17 Recruiter \| Light-evidence (LMIA recruitment-effort evidencing, not ATS-grade) · no candidate identity plane (records-only) · CP-9 employer sees read-only summary." | FDL v1.5, Wave-0 batch, resolved 2026-07-03, L32 | None stated (binding, FDL L22) | "ATS-grade = plan-gated growth path" (same line). |
| DOC2 Doer list | "Clocker, Dialer, Recruiter — the last corporate/employer-scoped, Doc 3 AG-17" | Doc 2 v1.4, SA-CT principle, L31 | None stated | Not in the founders' roster (SPEC-N §5) nor the October Agent glossary (APHG L52). |
| DOC2 capability | "cap.recruiter \| recruiting (module = Doc 3 AG-17; corporate/employer-scoped) \| DOER \| — \| feature.recruiter \| enterprise (defaultFirmState OFF)" | Doc 2 v1.4, SA-CT capability registry seed table, L91 | "enterprise (defaultFirmState OFF)" (illustrative tier) | Conflicts with AG-17-1 (L707): "Corporate functionality SHALL be available in every plan". |
| DOC2 reference data | "the recruitment position categories & advertising-rule sets that drive the corporate-scoped Recruiter Doer — Doc 3 AG-17, so a country's recruitment values are pack-authored …" | Doc 2 v1.4, SA-1 Reference datasets, L292 | None stated | October: advertising rules are a pack reference table (AG-17 L405). |
| DOC3 AG-17 heading (July) | "Module AG-17: Recruiter — Recruitment Evidence (Corporate Hiring & LMIA)" | Doc 3 v1.4, AG-17 heading, L8059 | None stated | October AG-17 v0.5 is titled "Corporate Cases & LMIA" and never uses the word "Recruiter". |
| DOC3 scope (July) | "gated server-side by the cap.recruiter capability … everything in this module lights up, dark-launches, and switches off behind that single toggle" | Doc 3 v1.4, AG-17 plane and scope, L8061 | None stated | October AG-17-1: Super Admin's per-firm switch is an "emergency off-switch" only. |
| DOC3 Doers used (July) | "Recruiter is orchestrated like every Doer, via Conductor events (AG-11) and sibling capabilities:" | Doc 3 v1.4, AG-17 §3.10, L8247 | None stated | Lists Minder, Mailer, Drafter + Signer, Binder, Tasker (L8249–L8253). |
| DOC3 Minder (July) | "Minder — advertising-window deadline watches, armed on activation per checklist duration rule" | Doc 3 v1.4, AG-17 §3.10, L8249 | None stated | October AG-17-73 registers these as standard deadlines. |
| DOC3 recipes (July) | "firms may automate on the emitted recruitment.* events (e.g. "on campaign created → create evidence-collection task set") through AG-11's standard machinery" | Doc 3 v1.4, AG-17 §3.10, L8254 | None stated | No recruitment.* trigger appears in October AG-11 v1.11 (no match for "recruitment." in the file). |
| AG17-D3 | "Release 1 = blocks 1, 2, 3, 5, 6, 7 plus a … Recruitment engine (block 4) and full post-approval compliance (block 8) are …" | AG-17 v0.5, §0 Decision log, L120 | "Release 1" / "Release 2" | Refined by AG17-D51. |
| AG17-D51 | "Release 1 = a full-fledged LMIA, end to end … Release 2, in order: … recruitment engine. Firm automations follow AG-11; direct government integration not planned." | AG-17 v0.5, §0 Decision log, L169 | "Release 1" / "Release 2" | — |
| AG-17 §0.1 engine | "Recruitment engine — posting to boards, one applicant inbox, screening, interview scheduling \| Almost a product of its own; Release 1 records all recruitment" | AG-17 v0.5, §0.1 Release 2 and not planned, L227 | "Release 1 records all recruitment" | — |
| CP1-D7 | "In Release 1 the employer portal shows nothing about recruitment candidates." | AG-17 v0.5, §0 applied decisions, L210 | "In Release 1" | Doc 4 v1.3 L3043 (July) gives the employer a read-only summary tile. |
| AOVW scope | "AG-17 \| Corporate Cases & LMIA \| … recruitment compliance · quality check … \| Release 1 (full LMIA) · other corporate services Release 2 (AG17-D51)" | Agent 00-Overview v1.11, Detailed Scope Index, L96 | "Release 1 (full LMIA)" | — |
| AG-17 §3.4 channels | "Staff log each advertising channel (Release 1 is staff-only for recruitment entry — §0.1)" | AG-17 v0.5, §3.4 Block 3 — Recruitment compliance, L531 | "Release 1 is staff-only for recruitment entry" | — |
| AG-17 §3.4 clock | "the clock shows "day X of Y" for the … the file computes the earliest date recruitment is complete and the latest date the …" | AG-17 v0.5, §3.4, L533 | None stated | Deterministic from the pack's advertising-rules table. |
| AG-17 §3.4 report | "One action generates the final recruitment report from a template (AG-12 / SA-05, its own TemplateType — pending in SA-05, §0.2)" | AG-17 v0.5, §3.4, L539 | None stated | SA-05 knock-on pending (AG-17 L260). |
| AG-17-22 | "Staff SHALL log each advertising channel: kind (from the pack's channel-kind answer list), where posted, start and end dates, link, proof documents" | AG-17 v0.5, §4 Block 3, L737 | "In Release 1, recruitment channels and candidates are entered by staff only" (same line) | — |
| AG-17-23 | "Each required channel SHALL run for at least the stream's minimum number of consecutive days inside the advertising-rules table's window" | AG-17 v0.5, §4 Block 3, L738 | None stated | Rule values are pack content: confirm with RCIC. |
| AG-17-24 | "The file SHALL compute and show the earliest recruitment-complete date and the latest submission date … and create dated items for both." | AG-17 v0.5, §4 Block 3, L739 | None stated | Dated items go to the Minder (AG-17-73). |
| AG-17-26 | "The candidate log SHALL record per applicant: name, date received, channel, a residence status … an outcome … a rejection reason" | AG-17 v0.5, §4 Block 3, L741 | None stated | — |
| AG-17-27 | "one or more missing reasons on a file SHALL raise a single combined CRITICAL warning, not one per candidate." | AG-17 v0.5, §4 Block 3, L742 | None stated | Passed only with a reason (Reviewer, AG-7-28). |
| AG-17-28 | "One action SHALL generate the final recruitment report from a template (AG-12 / SA-05) … and store it on the file as a document." | AG-17 v0.5, §4 Block 3, L743 | None stated | TRI L217 keeps "recruitment report generator". |
| AG-17-30 | "Candidate entries and their documents SHALL be retained as part of the LMIA file and disposed of only with the file" | AG-17 v0.5, §4 Block 3, L745 | None stated | Retention period "awaiting legal advice" (same line): confirm with counsel. |
| AG-17-38 | "the system SHALL raise a MAJOR warning if no logged channel is active after submission." | AG-17 v0.5, §4 Block 5, L757 | None stated | — |
| AG-17-59 | "The file timeline SHALL include recruitment events (channel logged, report generated — not one event per candidate added)" | AG-17 v0.5, §4 Work surfaces, L826 | None stated | Audit/timeline content. |
| AG-17-73 | "Every item in AG-17 that carries a reminder — advertising clock milestones, the … SHALL be registered with the platform's reminder service (the Minder, …" | AG-17 v0.5, §4 Reminders through the Minder, L812 | None stated | See B-minder. |
| AG-17-80 | "The candidate log SHALL support bulk import from a spreadsheet (CSV) against a simple column template" | AG-17 v0.5, §4, L802 | None stated | TRI L223 proposes to move CSV candidate import. |
| AG-17-83 | "Each advertising channel MAY record its cost; staff SHALL be able to add it as a billable expense on the employer (AG-06 Expense)." | AG-17 v0.5, §4, L805 | None stated | TRI L228 proposes to move "ad cost as expense". |
| AG-17-1 | "Corporate functionality SHALL be available in every plan, subject to the plan's limit on active LMIA files (SA-03; AG17-D35)." | AG-17 v0.5, §4, L707 | None stated | Conflicts with Doc 2 L91 (enterprise, OFF by default). |
| TRI AG-17 stays | "candidate log · advertising channels, clock, warnings · … recruitment report generator" | SCOPE-TRIAGE 2026-10-05, AG-17 Stays, L217 | Stays in Release 1 (list heading, TRI L6) | — |
| TRI AG-17 moved | "CSV candidate import, filing summary" | SCOPE-TRIAGE 2026-10-05, AG-17 Proposed to move, L223 | Proposed to move to Release 2 (list meaning, TRI L7) | — |
| DOC4 CP-9 (July) | "a corporate seat MAY see a read-only summary tile on the org dashboard (§3.2): campaign-level counts and stage only" | Doc 4 v1.3, CP-9 §3 Recruiter summary, L3043 | None stated | October CP1-D7: nothing about candidates in Release 1. |
| CH1 journey | "AG-17 (LMIA recruitment evidence) and CP-9 (employer view, read-only) are in Release 1." | Charter V1 (md dump), Speaker notes, the four planes, L117 | "are in Release 1" | — |

Requirement rows: **34**.

## Gaps noticed

- Name: "Recruiter" exists only in July Doc 2, Doc 3 and Doc 4 and in FD-7; the October AG-17 v0.5 describes the same work as "Block 3 — Recruitment compliance" without the Doer name, and the October glossary does not list it.
- Plan gating conflict: Doc 2 seeds cap.recruiter at "enterprise", off by default; October AG-17-1 makes corporate functionality available in every plan with only an emergency off-switch.
- Employer visibility conflict: Doc 4 (July) lets a corporate seat see a read-only campaign summary; October CP1-D7 shows the employer nothing about candidates in Release 1.
- Deterministic: advertising clock, earliest-complete and latest-submission dates, warnings, report generation from the log. Human steps: staff log every channel and candidate (employer entry is Release 2), give rejection reasons, pass critical warnings with a reason, sign off the file.
- Audit: timeline events for channel logged and report generated (AG-17-59); candidate records retained with the file (AG-17-30). No separate audit line for individual candidate entries.
- Advertising minimums, windows and channel kinds are pack content: confirm with RCIC. Candidate retention period: confirm with counsel.
