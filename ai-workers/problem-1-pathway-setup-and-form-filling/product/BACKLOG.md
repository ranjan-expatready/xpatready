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
| N10 | founder | **Paid runs waiting on N1** (each needs a Go with the cost first): R-146 field-map run for 8 demo forms (IMM 1294, 5646, 5710, 0008, 5406, 5562, 5532, 5604; up to US$45); R-145 Who can be live retest QA-99 (≈US$0.91); R-140 qa live smoke of the AI paths; R-98/R-101 drafts of IMM 0008, 5669, 5406 (up to US$12; fold into R-146 where the same forms) | actual cost reported | REQUESTS R-98, R-101, R-140, R-145, R-146 |

## Next (M2, P-173: no scope cut; in order per area)
| # | Area | Item | Source |
|---|---|---|---|
| X1 | screens | C2: StepBadge and `?focus=` landing on Documents and Questionnaires; then C3 Overview strip | W1-setup-checklist plan |
| X2 | screens | Linking combinations and copying a line (C1.3, C1.5) | screens queue (4) |
| X3 | screens | S6 Shared library: one review queue, one Add in plain words (W1-09; P-120, P-121, P-149; recheck 2026-10-28 has 5 Majors to fold in; P-138 drafting on a click); code lists and shared condition (W1-16 part); QA-82 (question column shows the definition) | WAVE-1 S6, W1-09, W1-16 |
| X4 | screens | Open screens bugs QA-73, QA-74, QA-80, QA-113; stand-in chips (B49, P-165, R-134) | qa/BUGS.md |
| X5 | forms | P-156: library first + each combination's IRCC checklist page read into document lines (C2.6, C2.12; plan-p156 in screens/W1-ai-drafting) | forms queue (3) |
| X6 | forms | W1-07 AI run experience: steps shown live, progress bar, plain errors, Stop (R-116; cap US$60 for wave 1) | WAVE-1 W1-07 |
| X7 | forms | W1-10 AI drafts the remaining masters from the PDFs and checklists (sections, document types, conditions, checks; proposals only); m8 oath boxes; W1-16 forms part (edition attributes, country variant, length and continuation, signature value, online-only intake with a unique code, P-150, P-152) | WAVE-1 W1-10, W1-16 |
| X8 | forms | Open forms bugs QA-75, QA-98, QA-101–107, QA-109–111; R-126 (a hand upload the rules cannot read waits for a person) | qa/BUGS.md; REQUESTS R-126 |
| X9 | runtime | Open runtime bugs QA-76–78, QA-91, QA-99 (Critical: live retest in N10), QA-108, QA-112, QA-114–117 | qa/BUGS.md |
| X10 | evidence (Mac) | W1-12: Adobe checks of the official PDFs for the 5 combinations (+1 Corporate Sample); E1b IMM 5409 check, F5 (static forms' page fields empty outside Adobe) and F6 (oath details in Validate) to forms, then IMM 5476 | WAVE-1 W1-12; evidence lane |
| X11 | qa | M2 gate: content publisher walk on the six combinations, like a person (S8, W1-13); intended user for D17/D20 arranged by the founder (R-93) | WAVE-1 S8 |
| X0 | tech lead | **Regroup this backlog into features (P-191)** after #111–#113 merge: Super Admin setup, then case officer, then client; each feature done when a person can do it on the demo; then walk the founder through `design/why-we-chose-2026-10-31.md` | P-191 |
| X13 | platform | **Test reliability, cheap first:** remove the swallowed waits (`.catch(() => undefined)` after a wait: 164 on 31 Oct) and the fixed sleeps (244), add one `until()` helper that fails loudly, a lint ban on swallowed waits, a trace saved on failure and uploaded from CI (about 2 builder days). Then a one-suite pilot of `@playwright/test` behind the STANDARDS §1 gate; migrate the rest only if the pilot shows fewer flaky reds. Measure red CI runs that pass on re-run, per week. | research 31 Oct (Playwright docs: test-assertions, test-retries, trace-viewer); today's start-setup failure |
| X12 | tech lead | PQR/SQR boundary page against the team's modules (R-135, P-166); rule tracing check P-153; Devin D3 now, D1 after screens merges, D2 Mondays, D3 + D4 before the M2 gate; lane test databases dropped when idle (≈3.7 GB) | LEAD.md; REQUESTS |

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

