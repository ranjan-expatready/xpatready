# Backlog — requirements not yet in a screen, slice or milestone

Owner: the Lead. Source: the requirements trace of 23 Oct (`history/TRACE-SA01B-2026-10-23.md`: SA-01B v1.5, redesign decisions, SA-01 slices, one-page solution). Our decisions win where they already settle a point. **Everything in SA-01B's scope is in the POC (P-70)**; requirements outside SA-01B stay outside (listed in the trace). An item leaves the backlog when a concept or plan schedules it (then it gets a capability row in `qa/CAPABILITIES.md`). Sizes S/M/L are guesses; milestones are proposals (M4 is new).

| # | Item (who can do what) | Requirements | Milestone | Depends on | Size |
|---|---|---|---|---|---|
| B1 | **Purposes and overflow for list facts:** a publisher maps a form field to "current", "for post", "all in 10 years" or "latest" of a list, and sets what happens when the list is longer than the form (continuation or flag, never a silent cut) | SA-1B-11, 12, 27 | M2 | F1 field-map contract, P-47 repeating group, Screens 03/04 | M |
| B2 | **Who fills each field:** default Client or Case officer per field; background and declaration locked to the client; the client sees only client fields | RD-6; one-pager 3.4, 3.7 | M2 | C4.1, P-47 renderer; runtime use in R1/M3 | M |
| B3 | **Document substitute sets:** "any one of" / "all of" sets; a combination picks its set; any valid member satisfies the checklist | SA-1B-19, 20 | M2 | Screen 04 document types, C2.6/C3.4, C6.4 | M |
| B4 | **Document validity warnings at upload** ("expires in 28 days", "older than 6 months"); overriding records a reason | SA-1B-23 | M3 | C6.4, P-14 tier-2 checks | S |
| B5 | **Estimated completion time per section** for the client | SA-1B-16 | M3 | P-47 | S |
| B6 | **Representative approves each form:** stamped with the file fingerprint and answer snapshot; a later fact change withdraws it | one-pager 9.3 | M3 | C7.2, C9.2 | S |
| B7 | **Family members on different combinations in one case** (study permit principal, open work permit spouse) | RD-19; TAXONOMY case 2 | M3 | R1 data model | M |
| B8 | **Adult privacy and "Send to …":** an adult gets their own tab by a code-verified link; the principal then sees progress only; take back, resend (consent wording: Unconfirmed, no counsel) | RD-12b | M3 | C6.2 | M |
| B9 | **Adopt a published update on an open case:** "What changes for this case", adopt now or later; drafts re-render, approvals withdrawn, signed or submitted items untouched (P-65) | one-pager 10.3; RD-18; SA-01.14; SA-1-28 | M3 | C9.1, C9.2, R1 pin | M |
| B10 | **Multi-stage runtime:** open a case at a later stage with earlier stages "done before we started"; "Start next stage" carries answers, adds documents, forms and the deadline (structure stays P-13/P-24) | SA-1B-67, 68; RD-10b | M3 | P-24, P-59; B11 for deadlines | L |
| B11 | **Government steps, deadlines and responses:** biometrics, medical, acknowledgement, decision as lines with a deadline mark and usual timeline (expert values); the officer records a letter, the due date is pre-filled and confirmed; "after decision" | SA-1B-45, 57 (step kinds), 69, 96; RD-14a; SA-01.08; one-pager 9.6 | M4 | Screen 03 line kinds, R1 filings | L |
| B12 | **To-do starters per programme** (content only; the to-do engine is the team's) | SA-1B-97; RD-14b; SA-01.08 | M4 | B11 | S |
| B13 | **Returning client reuses verified facts** with source and date; "still true?" items re-asked | one-pager 6.3, 7.2; RD-5b profile; SA-1B-1 re-confirmation | M4 | P-65 verification status, R1 fact store | M |
| B14 | **Country-specific requirements section** beside a document or form (for example how to get a police certificate there) | SA-1B-103 | M4 | Team question SA1B-Q13 | S |
| B15 | **Corporate LMIA positions linked to worker cases** | SA-1B-70 | M4 | P-59 links, B7 | M |
| B28 | **Report a mapping problem:** officer reports from the form review; a confirmed error holds the mapping for everyone and lists affected open cases (P-73) | one-pager 10.4; redesign 5 | M4 | P-66 form health, C9.3 | S |

## SA-01B items the team also owns today (in scope since P-70; prioritise later)
| # | Item | Requirements | Size |
|---|---|---|---|
| B16 | Eligibility gates and scoring grids per programme, as data (gates with Sample values pulled forward as C6.9, P-77); assessment verdict, gap, "rules as at", disclaimer from the firm's template | SA-1B-37, 85–89; SA-1-16, 19–26; RD-8, RD-8b; one-pager 3.6 | L |
| B17 | Reference tables: fixed types, versioned definitions with key and range rules, console and bulk upload, look-up by date; release blocks broken references | SA-1B-41–44; SA-1-40, 41; RD-17 (tables) | M |
| B18 | Regulator setup: representative types, licensing body, licence format checked against samples; every representative type counts as a licence | SA-1B-47, 98; SA-1-8–10 | S |
| B19 | Government fees per category or sub-category, with who pays | SA-1B-52 | S |
| B20 | Labels and translation: every pack text per language, edited side by side | SA-1-42, 43 | M |
| B21 | Program tree housekeeping: disable instead of delete, reorder siblings as a set | SA-1-13, 14 | S |
| B22 | "Next review" column, weekly content-team email, warning at publish | SA-1B-40 | S |
| B23 | Firm overlay: hide standard checklist items and steps without a deadline, rename client names of steps, document-return reasons and fee-quote wording | SA-1B-95; SA-1-34, 38 | M |
| B24 | Reminder data and key dates from document validity (the reminder engine stays the team's Minder) | SA-1B-24, 104; RD-15 | S |
| B25 | Lead form: lead-flagged fields within a cap, warning above the cap | SA-1B-80, 81 | S |
| B26 | ExpatReady delivery steps with a client label per language | SA-1B-46 | S |
| B27 | Field map export and re-import, all or nothing | SA-1-31 | S |
| B30 | Website and campaign entry links per program or combination with Source and Campaign recorded; a verdict shown to the prospect (out of prototype scope, P-77) | SA-1B-77–84, P-76, P-77 | M |
| B29 | General country-level PQR built automatically from released combinations' PQRs, opening the program the person chooses; prospect-facing use (M3) (P-76) | SA-1B-77–84, P-76 | M |
| B31 | Mac paths out of code and tests (P-82): find `psql`, `openssl`, `pdftotext`, `pdftoppm`, `tesseract` on PATH instead of `/opt/homebrew/...` (16 test files, `p1/e5_roundtrip.py`, `p5/reader/local.ts`); `require("../node_modules/playwright")` instead of the Mac user's Codex path in three browser checks (also a personal name in the repo, AGENTS rule 5); replace macOS `sips` in the local OCR reader so document OCR runs in the cloud. `cloud-setup.sh` covers all but `sips` with stand-ins until then. Each lane fixes the files it owns when it next touches them | P-82 | S |
| B32 | One plain-words map for validator (zod) refusals in the Problem Details filter, instead of per contract (qa QA-26, QA-27 suggestion) | STANDARDS plain words | S |
| B33 | Suite tooling (qa suggestions 24 Oct): an opt-in coverage mode that leaves the drafting sandbox suites out of the preload; suites write screenshots, evidence and ledger by-products under `var/` unless asked, so a run leaves a clean tree | P-85 | S |
| B34 | **Start from a starter set:** a new workspace can load a reviewed starter set of programs, forms and shared library items instead of building from nothing (scout SC-1, Major; benchmark: Docketwise, INSZoom) | `scout/reports/2026-10-25-firm-admin-day-one.md` | founder decides (M2 or later) | the team's content; Screen 04 | M |
| B35 | **Reset one combination** for the demo story, not the whole workspace (founder's ask, via Devin `history/devin/2026-10-25-ux-audit.md` §A3); today Demo › Reset is workspace-wide, then "Load sample inputs" | founder | founder decides; Lead recommends workspace reset is enough for M2 | demo.ts | S |
| B36 | **Dead endpoints tidy:** drop or justify `POST /program-nodes` (superseded by `POST /combinations/path`), `GET /form-copies/:id` + `/file` and `GET /ledger`; confirm the Screen-02-scoped orphans (`/intake/held`, merges, answer-lists, screen-map routes, `/captures/:id`) each land their UI when Screen 02 closes (Devin drop 4) | `history/devin/2026-10-25-devin-orphan-map.md` | M2 or later | screens and runtime FIX passes | S |
Outside SA-01B and therefore outside the POC (P-70): SA-01 country and pack container slices (SA-01.00–.02, .09–.11, SA-1-64, 66, 67), duplicate-person search (AG-02, one-pager 6.2).

## Planned but missing from the tester's checklist (added through the qa lane's Lead note)
AI reading of uploaded documents (SA-1B-34, one-pager 7.3) · independent AI review of a filled form (one-pager 8.3) · copy a line from another combination and add or remove one line across many (SA-1B-61, Screen 03 concept) · an upload question creates a document line (SA-1B-3 with P-47).

## Open questions from the trace (asked one at a time; answers go to `DECISIONS.md`)
Answered: scope (P-70), ready to file (P-71), verification (P-72), wrong mapping (P-73). PQR model (U1, P-76). Open sub-questions: verdict to the prospect, pre-fill the SQR to confirm, entry links in Release 1.
