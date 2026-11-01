# Backlog — the one ordered list of work (31 Oct; Phase 1 of `design/simplify-plan-2026-10-31.md`)

One queue for everything: **Now** (in order, being done), **Next** (in order, starts when a Now row in its area is done), **Later** (not scheduled). Owner of the order: the tech lead. Each row names its area and "Done when". Bugs keep their detail in `qa/BUGS.md`; designs and plans in `screens/<item>/`. Every open item of `WAVE-1.md`, `SCREENS.md`, `REQUESTS.md`, `LEAD.md` and the lane files is carried here; the item-by-item check is `design/backlog-carry-over-2026-10-31.md`.

**Done when, for every row:** acceptance checks pass with a pass and a fail test per business rule, CI green on the PR, the reviewer approves, merged; then the demo (:4400) runs it and qa tests it on `main`. US$0 unless the founder approves a stated cost.

## Now
| # | Area | Item | Done when (beyond the standard) | Source |
|---|---|---|---|---|
| N1 | forms | **Merge PR #112:** slice 1 channels (P-143), live AI off by default on every copy (P-175, QA-100), one shared spend ledger (QA-90), cost warning and recorded Continue (P-179, C11.8) | merged; :4400 on the new main; QA-90 and QA-100 retested by qa | PR #112; forms Handover at faf7fca9 |
| N2 | screens | **Merge PR #111:** PR #108 review Minors | merged | PR #111 |
| N3 | runtime | **Merge PR #113:** queue transaction fix, C10.1 configured checkpoint, C3.11 signed-scan lines, P-184 speed helper, S7 Reset + Load sample (six combinations, P-148) | synced with main; tech lead decides the four "Found while building" points in the runtime branch's c10.1 plan (screens/W1-reset-and-sample); merged | PR #113; runtime Handover 30 Oct |
| N4 | qa | **After-merge on `main`** after N1–N3: retest QA-92–96, QA-112–117, QA-90, QA-100; Devin D4 status items D-1 (C11.10 back to Partial until it is proven), D-2/3/5/6 (name the suites that prove C7.1, C3.10, C6.2, C1.1), D-10 (C4.1/C4.3 record a commit or "Not tested") | report in `qa/reports/` | qa Handover 30 Oct; LEAD.md Devin row |
| N5 | screens | **C1 "Before forms"** (branch `claude/screens-c1-before-forms`, 0c76308d): merge main after N1, resolve `contracts/workspace.ts` and `pages/combination.tsx` | before_forms, s5_slice1, w115_slice2 green | screens Handover |
| N6 | forms | **P-179 follow-ups** (second CHECK: review and break report in screens/W1-ai-drafting on the forms branch): Majors: review N1 (the Forms tab's Draft with AI has no warning or Continue: `useCostGate` + checkOverride/spendOverride), review N2 (a person's own unused Continue blocks their retry, wrong words; costCheck and ledger agree), break N1 (a `spend.lock` left by a crash blocks every copy: pid holder, stale lock broken). Minors: break n1–n5, review n3–n5, and an Escape pressed before the warning is ready closes the panel underneath | each Major and Minor has its own fail test | forms Handover at faf7fca9 |
| N7 | runtime | **Devin findings:** DV-bb-9 withdraw checks proposer = actor (`lifecycle.ts:434`), DV-bb-8 remove `POST /combinations/:id/attachments`, DV-d1-3 | fail test before the fix | LEAD.md Devin row |
| N8 | forms | **Devin findings** DV-d1-1, DV-d1-2; **F2** official-pages confirm endpoint | — | LEAD.md Devin row |
| N9 | screens | **Devin finding** DV-d1-4 | — | LEAD.md Devin row |
| N10 | founder | **Paid runs waiting on N1** (each needs a Go with the cost first): R-146 field-map run for 8 demo forms (IMM 1294, 5646, 5710, 0008, 5406, 5562, 5532, 5604; up to US$45); R-145 done 30 Oct (qa live retest, US$0.13; QA-99 closed, report `qa/reports/2026-10-30-live-qa99.md`); R-140 qa live smoke of the AI paths; R-98/R-101 drafts of IMM 0008, 5669, 5406 (up to US$12; fold into R-146 where the same forms) | actual cost reported | REQUESTS R-98, R-101, R-140, R-145, R-146 |

## Features (M2, P-191: journey order; regrouped 31 Oct)
A feature is done when a person can do it on the demo (:4400) and qa has tested it on `main`. One builder takes a feature end to end (screen, backend, tests); areas stay only as code ownership, so no two builders write the same files. The Next rows below stay as each feature's detail. Sizes are the tech lead's estimate for one builder: S about 1 day, M 2–3 days, L 4–6 days; they are corrected from real times after the first features.

| F | Feature (what a person can do) | Capabilities still open | Rows folded in | Builder | Size |
|---|---|---|---|---|---|
| F1 | **Set up the programme structure and each combination's card:** names on Program structure, Pathway type tabs, cards with their setup steps, channels and filing method, form-line copies, age and signers, who can be in the application, copy form and document lines between combinations (X2b; links between combinations left configuration, P-106: C1.3 is M3's case link, founder 31 Oct, PR #167) | C11.3, C11.16, C1.6, C1.8, C11.12, C1.5 | X1, X2 (X2b only), X4 (setup part) | screens | L |
| F2 | **Bring forms into the library:** the whole IRCC index, one guided path per PDF with progress and resume, same file and new edition handled, Start setup finds a combination's forms | C3.12, C11.11, C11.15, C2.12, C2.4 | X5 (slices a–c in flight), X8 (intake bugs), X10 (Adobe checks, evidence on the Mac) | forms | L |
| F3 | **Map form fields and trust each AI run:** AI maps fields, a reviewer accepts, edits or rejects with Undo, the validator, failures in plain words, live steps, progress, Stop and the cost warning | C3.1, C3.2, C3.3, C3.8, C11.8 | X6, X8 (mapping bugs), X8a | forms | M |
| F4 | **AI drafts the rest of a combination's masters:** checklists read into document lines, sections, document types, rules and checks drafted as proposals with a checker round, "Draft questions and documents", signed-scan lines | C2.6, C3.4, C3.6, C11.13, C11.14, C4.11, C3.11 | X7, X5 (checklist part) | forms (screens for its review pages) | L |
| F5 | **Keep the shared library tidy:** lists with where used, origin and status, rename a shared field, read-only checks and rules lists, remove, retire and restore | C3.13, C3.14, C3.15, C11.9 | X3, X4 (library part) | screens | M |
| F6 | **Build the questionnaires:** SQR per person role from what the forms and documents need, PQR picks (by hand and drafted by AI), Preview by person per channel, both inside the one review and release | C4.1, C4.2, C4.7, C4.6, C4.8 | X3 (QA-82 question words), X9 (questionnaire bugs) | runtime | M |
| F7 | **Demo reset and sample:** reset to blank, load the five combinations and the configured checkpoint | C10.1, C11.7 | N3 (#113), X9a, X9b | runtime | S |
| F8 | **Review and release without gaps:** an empty combination cannot be released; one To review page | X1a; C5.x already work | X1a, X4 (release part) | screens | S |
| R1 | **Thin runtime slice, rest:** every question type in the one renderer; a filled form passes Adobe Validate | C4.4, C7.2 | X9, X10 (E1b) | runtime (+ evidence on the Mac) | M |
| Gate | **M2 gate:** the content publisher walk on the six combinations, like a person | all of the above | X11 | qa | S |

**Order and parallel plan (three cloud builders, one qa):** forms F2 → F3 → F4; screens F1 → F8 → F5; runtime F7 → F6 → R1; qa after each day's merges, then the gate. The forms line is the longest (about 9–15 builder-days), so the M2 gate is about three weeks out on today's estimate; the one Mac check queue can stretch that, and the first features' real times firm it up.

**M3 features (after the M2 gate; design agreed), in the order a case moves:** M3-A firm, users and case team; Retail and Corporate apart (C6.11, C11.5) · M3-B filings and fees from the case; channel per form within what IRCC accepts (C6.12, C11.6) · M3-C documents: checklist per person, AI reads uploads into facts to confirm (C6.4, C6.5) · M3-D staff eligibility page (C6.9) · M3-E prepare and check: deliverables list, ready-to-file rules, independent AI review, portal sheet (C7.7, C7.6, C7.5, C7.3) · M3-F submit and keep it safe: signed scans, filing records, stale marks, the finished demo story (C8.1, C8.2, C9.2, C10.2).

## Next (M2, P-173: no scope cut; in order per area)
| # | Area | Item | Source |
|---|---|---|---|
| X1a | screens | **Bug: a combination with 0 forms and 0 documents can be submitted, signed off and approved** (the release rule in `studio.ts`; found by the runtime builder in #113 on three combinations) | c10.1-plan.md "Found while building" |
| X9a | runtime | Sample: add one off-list file with a readable edition (IMM 5476, 2021 edition) so held-file approval can be shown; the validator's K1 message names a raw form-field path (`IMM_5707[0].page1[0]…`) instead of the field's label | c10.1-plan.md "Found while building" |
| X8a | forms | `check_cost_warning_browser.cjs` waits 30 s for "Start live AI draft" to enable on the Forms tab (line 111) and timed out once on the Mac under load (#141, run 41185122197 attempt 1; passed on attempt 2): make the wait follow the page's own ready signal, not a fixed time | CI run 41185122197 |
| X9b | runtime | #113 review Minors: m6 the "who signs" rule is written in both `render.ts` and `sources.ts` and they differ when a form's condition is on one person kind (one rule, one place); m7 a suite checks that the server refuses AI now with the fake launcher alone (the reviewer proved it by hand) | review-pr113-r2.md |
| X1 | screens | C2: StepBadge and `?focus=` landing on Documents and Questionnaires; then C3 Overview strip, where the header's "Next step" takes the checklist's next (QA-119, Major: one page, one next step) | W1-setup-checklist plan |
| X1b | screens | **The Programs card's filing-method tag** (PDF only · Online only · Mixed; P-208), after X1, before X2b | P-208, #173 |
| X1c | runtime | **Sample rename:** "Applicant" → "Principal applicant" in `samples/programs.json`; "(travelling)" stays (P-209) | P-209, #171 |
| X1d | tech lead | **`run-suites.sh` gives `check_w1_structure_browser.cjs` a fresh copy** locally, as CI does (qa #208: it fails "empty after Reset" on a used copy) | qa #208 |
| X2 | screens | X2b: copying a form or document line from another combination, and adding or removing one across many (C1.5; concept `screens/X2-links-and-copy/`; founder 31 Oct, PR #167). Links between combinations are not configuration (P-106): C1.3 is M3's case link. Built after F8 (tech lead, 31 Oct) | screens queue (4) |
| X3 | screens | S6 Shared library: one review queue, one Add in plain words (W1-09; P-120, P-121, P-149; recheck 2026-10-28 has 5 Majors to fold in; P-138 drafting on a click); code lists and shared condition (W1-16 part); QA-82 (question column shows the definition) | WAVE-1 S6, W1-09, W1-16 |
| X4 | screens | Open screens bugs QA-73, QA-74, QA-80, QA-113; stand-in chips (B49, P-165, R-134) | qa/BUGS.md |
| X5 | forms | P-156: library first + each combination's IRCC checklist page read into document lines (C2.6, C2.12; plan-p156 in screens/W1-ai-drafting) | forms queue (3) |
| X6 | forms | W1-07 AI run experience: steps shown live, progress bar, plain errors, Stop (R-116; cap US$60 for wave 1) | WAVE-1 W1-07 |
| X7 | forms | W1-10 AI drafts the remaining masters from the PDFs and checklists (sections, document types, conditions, checks; proposals only); m8 oath boxes; W1-16 forms part (edition attributes, country variant, length and continuation, signature value, online-only intake with a unique code, P-150, P-152) | WAVE-1 W1-10, W1-16 |
| X8 | forms | Open forms bugs QA-75, QA-98, QA-101–107, QA-109–111; R-126 (a hand upload the rules cannot read waits for a person) | qa/BUGS.md; REQUESTS R-126 |
| X9 | runtime | Open runtime bugs QA-76–78, QA-91, QA-108, QA-112, QA-114–117 | qa/BUGS.md |
| X10 | evidence (Mac) | W1-12: Adobe checks of the official PDFs for the 5 combinations (+1 Corporate Sample); E1b IMM 5409 check, F5 (static forms' page fields empty outside Adobe) and F6 (oath details in Validate) to forms, then IMM 5476 | WAVE-1 W1-12; evidence lane |
| X11 | qa | M2 gate: content publisher walk on the six combinations, like a person (S8, W1-13); intended user for D17/D20 arranged by the founder (R-93) | WAVE-1 S8 |
| X0 | tech lead | **Done 31 Oct: see Features above.** ~~Regroup this backlog into features (P-191)~~ after #111–#113 merge: Super Admin setup, then case officer, then client; each feature done when a person can do it on the demo; then walk the founder through `design/why-we-chose-2026-10-31.md` | P-191 |
| X12 | tech lead | PQR/SQR boundary page against the team's modules (R-135, P-166); rule tracing check P-153; Devin D5 explorer now, D1 after screens merges, D4 before the M2 gate (D2 security and D3 Linux parked until production, P-197); lane test databases dropped when idle (≈3.7 GB) | LEAD.md; REQUESTS |

## Later (after the M2 gate, in wave order)
| # | Item | Source |
|---|---|---|
| L1 | W4 M3 case view build (design r5c agreed 29 Oct; M3-0 filing modes to runtime first; printed-text OCR through the STANDARDS §1 gate; SI-2 chips) | WAVE-1 W4; lanes/m3 |
| L2 | W2 immigration expert: second-person approvals, release gate, Sample values confirmed (ASSUMPTIONS rows finalised) | WAVE-1 W2 |
| L3 | W3 AI wherever designed: describe what you need, facts from documents, AI review, new-edition impact (R-111) | WAVE-1 W3 |
| L4 | W5 client and prospect: PQR, SQR, sign (after M3, P-129) | WAVE-1 W5 |
| L5 | W6 browser extension for online fill (parked; PR #37 findings: a repeated fill keeps Undo; portal option codes checked) (R-106) | WAVE-1 W6 |
| L6 | Requirements not yet scheduled: B1–B49 | [BACKLOG-requirements.md](BACKLOG-requirements.md) |
| L7 | Founder: branch rule on `main` (R-100, founder switches on in GitHub) | REQUESTS R-100 |

