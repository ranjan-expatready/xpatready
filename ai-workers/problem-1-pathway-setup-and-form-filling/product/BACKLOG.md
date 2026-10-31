# Backlog — the one ordered list of work (31 Oct; Phase 1 of `design/simplify-plan-2026-10-31.md`)

One queue for everything: **Now** (in order, being done), **Next** (in order, starts when a Now row in its area is done), **Later** (not scheduled). Owner of the order: the tech lead. Each row names its area and "Done when". Bugs keep their detail in `qa/BUGS.md`; designs and plans in `screens/<item>/`. Every open item of `WAVE-1.md`, `SCREENS.md`, `REQUESTS.md`, `LEAD.md` and the lane files is carried here; the item-by-item check is `design/backlog-carry-over-2026-10-31.md`.

**Done when, for every row:** acceptance checks pass with a pass and a fail test per business rule, CI green on the PR, the reviewer approves, merged; then the demo (:4400) runs it and qa tests it on `main`. US$0 unless the founder approves a stated cost.

## Now
| # | Area | Item | Done when (beyond the standard) | Source |
|---|---|---|---|---|
| N1 | forms | **Merge PR #112:** slice 1 channels (P-143), live AI off by default on every copy (P-175, QA-100), one shared spend ledger (QA-90), cost warning and recorded Continue (P-179, C11.8) | merged; :4400 on the new main; QA-90 and QA-100 retested by qa | PR #112; forms Handover at faf7fca9 |
| N2 | screens | **Merge PR #111:** PR #108 review Minors | merged | PR #111 |
| N3 | runtime | **Merge PR #113:** queue transaction fix, C10.1 configured checkpoint, C3.11 signed-scan lines, P-184 speed helper, S7 Reset + Load sample (six combinations, P-148) | synced with main; tech lead decides the four "Found while building" points in `screens/W1-reset-and-sample/c10.1-plan.md`; merged | PR #113; runtime Handover 30 Oct |
| N4 | qa | **After-merge on `main`** after N1–N3: retest QA-92–96, QA-112–117, QA-90, QA-100; Devin D4 status items D-1 (C11.10 back to Partial until it is proven), D-2/3/5/6 (name the suites that prove C7.1, C3.10, C6.2, C1.1), D-10 (C4.1/C4.3 record a commit or "Not tested") | report in `qa/reports/` | qa Handover 30 Oct; LEAD.md Devin row |
| N5 | screens | **C1 "Before forms"** (branch `claude/screens-c1-before-forms`, 0c76308d): merge main after N1, resolve `contracts/workspace.ts` and `pages/combination.tsx` | before_forms, s5_slice1, w115_slice2 green | screens Handover |
| N6 | forms | **P-179 follow-ups** (second CHECK, `screens/W1-ai-drafting/review.md`, `break-report.md`): Majors: review N1 (the Forms tab's Draft with AI has no warning or Continue: `useCostGate` + checkOverride/spendOverride), review N2 (a person's own unused Continue blocks their retry, wrong words; costCheck and ledger agree), break N1 (a `spend.lock` left by a crash blocks every copy: pid holder, stale lock broken). Minors: break n1–n5, review n3–n5, and an Escape pressed before the warning is ready closes the panel underneath | each Major and Minor has its own fail test | forms Handover at faf7fca9 |
| N7 | runtime | **Devin findings:** DV-bb-9 withdraw checks proposer = actor (`lifecycle.ts:434`), DV-bb-8 remove `POST /combinations/:id/attachments`, DV-d1-3 | fail test before the fix | LEAD.md Devin row |
| N8 | forms | **Devin findings** DV-d1-1, DV-d1-2; **F2** official-pages confirm endpoint | — | LEAD.md Devin row |
| N9 | screens | **Devin finding** DV-d1-4 | — | LEAD.md Devin row |
| N10 | founder | **Paid runs waiting on N1** (each needs a Go with the cost first): R-146 field-map run for 8 demo forms (IMM 1294, 5646, 5710, 0008, 5406, 5562, 5532, 5604; up to US$45); R-145 Who can be live retest QA-99 (≈US$0.91); R-140 qa live smoke of the AI paths; R-98/R-101 drafts of IMM 0008, 5669, 5406 (up to US$12; fold into R-146 where the same forms) | actual cost reported | REQUESTS R-98, R-101, R-140, R-145, R-146 |

## Next (M2, P-173: no scope cut; in order per area)
| # | Area | Item | Source |
|---|---|---|---|
| X1 | screens | C2: StepBadge and `?focus=` landing on Documents and Questionnaires; then C3 Overview strip | W1-setup-checklist plan |
| X2 | screens | Linking combinations and copying a line (C1.3, C1.5) | screens queue (4) |
| X3 | screens | S6 Shared library: one review queue, one Add in plain words (W1-09; P-120, P-121, P-149; recheck 2026-10-28 has 5 Majors to fold in; P-138 drafting on a click); code lists and shared condition (W1-16 part); QA-82 (question column shows the definition) | WAVE-1 S6, W1-09, W1-16 |
| X4 | screens | Open screens bugs QA-73, QA-74, QA-80, QA-113; stand-in chips (B49, P-165, R-134) | qa/BUGS.md |
| X5 | forms | P-156: library first + each combination's IRCC checklist page read into document lines (C2.6, C2.12; `plan-p156.md`) | forms queue (3) |
| X6 | forms | W1-07 AI run experience: steps shown live, progress bar, plain errors, Stop (R-116; cap US$60 for wave 1) | WAVE-1 W1-07 |
| X7 | forms | W1-10 AI drafts the remaining masters from the PDFs and checklists (sections, document types, conditions, checks; proposals only); m8 oath boxes; W1-16 forms part (edition attributes, country variant, length and continuation, signature value, online-only intake with a unique code, P-150, P-152) | WAVE-1 W1-10, W1-16 |
| X8 | forms | Open forms bugs QA-75, QA-98, QA-101–107, QA-109–111; R-126 (a hand upload the rules cannot read waits for a person) | qa/BUGS.md; REQUESTS R-126 |
| X9 | runtime | Open runtime bugs QA-76–78, QA-91, QA-99 (Critical: live retest in N10), QA-108, QA-112, QA-114–117 | qa/BUGS.md |
| X10 | evidence (Mac) | W1-12: Adobe checks of the official PDFs for the 5 combinations (+1 Corporate Sample); E1b IMM 5409 check, F5 (static forms' page fields empty outside Adobe) and F6 (oath details in Validate) to forms, then IMM 5476 | WAVE-1 W1-12; evidence lane |
| X11 | qa | M2 gate: content publisher walk on the six combinations, like a person (S8, W1-13); intended user for D17/D20 arranged by the founder (R-93) | WAVE-1 S8 |
| X12 | tech lead | PQR/SQR boundary page against the team's modules (R-135, P-166); rule tracing check P-153; Devin D3 now, D1 after screens merges, D2 Mondays, D3 + D4 before the M2 gate; lane test databases dropped when idle (≈3.7 GB) | LEAD.md; REQUESTS |

## Later (after the M2 gate, in wave order)
| # | Item | Source |
|---|---|---|
| L1 | W4 M3 case view build (design r5c agreed 29 Oct; M3-0 filing modes to runtime first; printed-text OCR through the STANDARDS §1 gate; SI-2 chips) | WAVE-1 W4; lanes/m3 |
| L2 | W2 immigration expert: second-person approvals, release gate, Sample values confirmed (ASSUMPTIONS rows finalised) | WAVE-1 W2 |
| L3 | W3 AI wherever designed: describe what you need, facts from documents, AI review, new-edition impact (R-111) | WAVE-1 W3 |
| L4 | W5 client and prospect: PQR, SQR, sign (after M3, P-129) | WAVE-1 W5 |
| L5 | W6 browser extension for online fill (parked; PR #37 findings: a repeated fill keeps Undo; portal option codes checked) (R-106) | WAVE-1 W6 |
| L6 | Requirements not yet scheduled: B1–B49 below | this file |
| L7 | Founder: branch rule on `main` (R-100, founder switches on in GitHub) | REQUESTS R-100 |

---

## Later in detail — requirements not yet in a screen, slice or milestone

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
| B37 | **Filing channel from IRCC's line read by AI, not by keywords:** the W1-10 AI step proposes each form's channel (Online · PDF upload · Paper · Not needed, plus the signature value, P-143) with IRCC's quoted line; `channelsFrom` (filing.ts) stays only as a check that flags a contradiction; a person confirms. Replaces sentence-by-sentence regex fixes (PR #73 review rounds 1–3 kept finding new phrasings) | P-123, P-62, PR #73 review | M2 | W1-10 | S |
Outside SA-01B and therefore outside the POC (P-70): SA-01 country and pack container slices (SA-01.00–.02, .09–.11, SA-1-64, 66, 67), duplicate-person search (AG-02, one-pager 6.2).

## Planned but missing from the tester's checklist (added through the qa lane's Lead note)
AI reading of uploaded documents (SA-1B-34, one-pager 7.3) · independent AI review of a filled form (one-pager 8.3) · copy a line from another combination and add or remove one line across many (SA-1B-61, Screen 03 concept) · an upload question creates a document line (SA-1B-3 with P-47).

## Open questions from the trace (asked one at a time; answers go to `DECISIONS.md`)
Answered: scope (P-70), ready to file (P-71), verification (P-72), wrong mapping (P-73). PQR model (U1, P-76). Open sub-questions: verdict to the prospect, pre-fill the SQR to confirm, entry links in Release 1.
| B38 | **Document type rules:** validity and what it must outlive, maximum age, translation plus affidavit, certified copy, formats and upload size, photo specification (substitutes and the translation flag may come earlier) | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150, P-151 | W4 | — | M |
| B39 | **Key-date types and anchors:** received, age lock-in, status expiry for inside-Canada filings, the 60 days after an invitation, LMIA validity, passport expiry; time-critical rules read them | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150, P-151 | W4 | — | M |
| B40 | **Fee table (dated, CAD) and fee rules:** per role and filing mode, family and biometrics caps, right of PR fee, exemptions (with B19) | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150, P-151 | W4 | — | M |
| B41 | **Filing record and package:** submission grouping, paper package order, application number and UCI per person, portal upload slot per document type and upload limits, portal application type (P-135, C8.2) | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150 | W4 | — | M |
| B42 | **Portal screen order** for portal-only answer sheets (P-113): source to be decided (founder question, gap analysis §5 Q1) | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150 | W4 | — | M |
| B43 | **Reference tables and rule-driving country lists:** CLB, NOC/TEER, funds, wages; visa-required, medical-exam, biometrics countries | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150 | W4 · W5 | — | M |
| B44 | **Field privacy, significance, re-confirmation and review-each classes** | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150 | W4 · W5 | — | M |
| B45 | **Source freshness:** source, date checked and next review on every item; periodic re-fetch of guides and checklists with a diff and AI impact (SA-1B-39, 40; B22) | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150 | W3 | — | M |
| B46 | **Explanation-letter lines and the request-for-documents → document type map** | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150 | W4 | — | M |
| B49 | Stand-in chips | P-165 | M2 | screens | S |
| B48 | **Workspace snapshots (P-160):** take, compare, restore as a draft change; automatic before release and reset | P-160 | W2 | runtime | M |
| B47 | **One co-pilot "Ask" panel (P-159):** explain and find; act only by a To review proposal | P-159 | W2 | Lead | M |
