# Lane: runtime — the thin end-to-end slice, then M3 runtime (P-67)

## From the Lead
2026-10-25 08:45 (Lead, cloud): **Screen 03 S1 EARLY-LOOK: GO** (`screens/03-combination-workspace/lead-check.md`). Set stage **BUILD**, slice **S2**, owner Builder. First the five small changes from the lead-check, each with a test: (1) Sample family people get Sample dates of birth so the minimum age shows working in Preview; (2) the line panel clears a field's error when that field is edited; (3) drop the repeated person name from the deciding answers; (4) "Rules and checks 0 · 2" says what each number counts; (5) the tab row at 1024 px shows that "Sources" follows (wrap or a cue). Then S2 as agreed: SQR tab, coverage as a release block (answer: the gate follows what a case on the release asks; a selected section is **not** required), filled by through `revise()`, Sponsor role. Your PostgreSQL 18 ask is done: `cloud-setup.sh` falls back to the npm 18.3 server (checksum pinned). C1.8 is in `qa/CAPABILITIES.md`. Sync main first. BUILD S2 ends at EARLY-LOOK (Lead) with screenshots of the SQR tab and the release block.

Command: `/next runtime` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: 03-combination-workspace
current_slice: S2 (S1 early-look changes 1–5; SQR tab; coverage blocks release; filled by; Sponsor)
stage: EARLY-LOOK
owner: Lead
next_action: Lead early look at build-notes.md "Slice S2" and screenshots/slice2/ (SQR tab, the release block); decide the Online-line field-map discovery (challenge.md); then S3.
blocked_by: none
updated: 2026-10-25

## Log (last 10 lines)
- 2026-10-25 · Builder (cloud): applied Lead note 08:45 (BUILD S2); five S1 changes; SQR tab, coverage blocks release (per role, with fixes), filled by via revise(), Sponsor (Sample); engine 46/46 (6 mutations caught), S2 32/32; studio suite places its scratch gaps (B6b); one discovery: an Online line still reads the PDF map; EARLY-LOOK owner Lead.
- 2026-10-25 · Builder (cloud): applied Lead note 06:00 (BUILD S1); built S1: tab route and workspace API, Overview, Forms (copies, minimum age, signed by), Preview by person on caseView, F-R1c-1, coverage 0 gaps, QA-38 and QA-40 fixed; engine 29/29, S1 42/42, mutations caught; EARLY-LOOK owner Lead.
- 2026-10-25 · Builder (cloud): applied Lead note (P-89, Screen 03 to this lane); DESIGN feasibility challenge written: Build after these changes, 5 Majors/Minor, slices S1–S4 proposed; no code; owner Lead.
- 2026-10-25 · Builder (cloud): PR 13 fix verified on a fresh copy: journey 120/120, R1d 63/63, R1a 99/99, engine 50/50; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead.
- 2026-10-25 · Builder (cloud): break on the PR 13 fix: 0 Blocker/Major, 4 Minor; the change now names whose entries; lock race and old copies recorded; engine 50/50.
- 2026-10-25 · Builder (cloud): applied Lead note 02:00 (PR 13 review): a copy keeps each group's live entry ids, so an added (even blank) or removed entry makes it stale; R1d 63/63, engine 50/50, mutations caught; review PASS (5 minors applied); break pending.
- 2026-10-25 · Builder (cloud): "none apply" FIX verified on a fresh copy: journey 120/120, R1d 62/62, R1a 99/99, engine 48/48; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead; lane stops.
- 2026-10-25 · Builder (cloud): CHECK "none apply": review 8/10 (2 Majors), break 1 Major (filed copy not stale when none apply withdrawn) + 6 Minors; all fixed with tests, mutations caught; journey 120/120, R1d 62/62, engine 48/48.
- 2026-10-25 · Builder (cloud): synced main e619113 (PR #12 merged); BUILD "none apply" for required groups: client_group_answer (append-only), PUT none-apply, Confirm section, readiness blocks empty required groups; engine 44/44, R1d 57/57, journey 116/116, R1a 99/99; mutations caught; CHECK started.
- 2026-10-25 · Builder (cloud): PR #12 review (Lead): 3 fill-case defects fixed with tests caught by mutation (Online filing line → 422 and not listed; lock refuses a missing or changed file 409; cap counted under FOR UPDATE); R1d 43/43, run-suites --demo 21/21 at be16c22; told the Lead; WAIT.
