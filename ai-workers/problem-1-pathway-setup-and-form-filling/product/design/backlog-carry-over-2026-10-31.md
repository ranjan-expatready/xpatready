# Backlog carry-over check, 31 Oct (Phase 1)

Every open item in the old lists, and where it now lives in `BACKLOG.md`. "Closed" means it was done or superseded, with the reason. The old files are unchanged; they leave the tree only in Phase 2, and git keeps them.

## WAVE-1.md
| Old item | Status in WAVE-1 | Now |
|---|---|---|
| W1-01 decisions, plan, lanes | Merged | Closed (done) |
| W1-02 park the extension | Merged 27 Oct | Closed (done); online fill → L5 |
| W1-03 Structure | Merged 27 Oct | Closed (done) |
| W1-04 Programs redesign (S2) | Merged | Closed (done); card v4 merged in #108 |
| W1-05 New combination (S3 Start setup) | Agreed → build | Closed: S3 merged 29 Oct (PR #76); C1 "Before forms" → N5 |
| W1-06 Form library + finder (S4) | Merged; channels = slice 1 | Slice 1 → N1 |
| W1-07 AI run experience | Concept | X6 |
| W1-08 Combination workspace (S5) | Merged | Closed (done) |
| W1-09 Shared library (S6) | Concept | X3 |
| W1-10 AI drafts the masters | Design in part, slice 0 built, slice 1 next | slice 1 → N1; the rest → X7 |
| W1-15 Questions and documents | slices 1–3 merged (#78, #80, #94) | Closed (done); open bugs → X9 |
| W1-16 End-to-end masters | Not started | forms part → X7; screens part (code lists, shared condition) → X3 |
| W1-11 Reset + Load sample (S7) | Not started (built on the runtime branch) | N3 |
| W1-12 Forms for the 5 combinations in Adobe | Research running | X10 |
| W1-14 End-to-end map v2 | Drawn 29 Oct | Closed (done) |
| W1-13 / S8 content publisher walk | Not started | X11 |
| W2, W3, W4, W5, W6 | later waves | L2, L3, L1, L4, L5 |
| Founder asks file `screens/W1-baseline/founder-asks.md` | — | its open gaps below |

## Founder asks (open gaps)
| Gap | Now |
|---|---|
| B6 Corporate empty except one Sample; Load sample with PDFs | N3 (S7 with the six combinations, P-148) |
| G3 open case, confirm section by section, record the filing | L1 |
| H4 GitHub Actions blocked by billing | Closed (budget set 27 Oct; CI running) |
| H5 Lead PRs #28 and #30 open | Closed (both PRs closed on GitHub) |
| H7 Structure layout with Pathway cards | Closed (S1 merged 27 Oct) |

## LEAD.md open items
| Item | Now |
|---|---|
| :4400 restarts (standing OK) | the standard "Done when" (demo on `main` after every merge) |
| Where we are / the queue | N1–N3 |
| Devin 30 Oct findings | N4 (qa), N7 (runtime), N8 (forms), N9 (screens); D-7, D-11 capability rows → N4 through qa; D-9 graph counts → X12 |
| Disk housekeeping, lane test databases | X12 |
| Devin queue (P-182) | X12 |
| Low-priority held items (`history/LEAD-held-items-2026-10-29.md`) | stay in that history file; the tech lead reviews them at the M2 gate |
| Rule tracing P-153 | X12 |
| Founder questions, in order | paid runs → N10; expert and team questions stay in `ASSUMPTIONS.md` and the held-items file |
| Intended user for D17/D20 | X11 |
| Watch list (disk, M3 start, assumptions, reuse the filling code and POC work, CI, P-26, P-33, demo story, re-check before build, rerun on the exact commit, Definition of Ready) | rules, not work: they move into the way-of-working page and the skills in Phase 2, none dropped |

## Lane files (newest version on each lane's branch)
| Lane | Next action | Now |
|---|---|---|
| screens | C1 after forms merges; then C2, C3; queue (4) linking combinations | N5, X1, X2 |
| forms | FIX the second CHECK's Majors and Minors; then P-156 | N6, X5 |
| runtime | Lead check of C3.11, C10.1, queue fix; four findings; the paid IMM 5257 run | N3; paid run → N10 |
| qa | after-merge once forms merges; QA-99 live retest | N4; N10 |
| m3 | build at the M2 gate | L1 |
| evidence | IMM 5409 check, F5/F6 to forms, IMM 5476 | X10 |
| scout | retired (P-146) | Closed |

## REQUESTS.md (rows not Handled)
| Row | Now |
|---|---|
| R-71, R-72 AI checks and repair (23 Oct) | Closed: superseded by W1-07/P-110 (X6) and the P-175/P-179 guards (N1) |
| R-74, R-75, R-81, R-82, R-105, R-139, R-143 how lanes, the Lead and qa work | Closed: replaced by the way of working (P-188); the qa role stays |
| R-93 intended user | X11 |
| R-98, R-101, R-140, R-145, R-146 paid runs | N10 |
| R-100 branch rule on `main` | L7 |
| R-106 browser extension | L5 |
| R-107, R-108 Goose scout and Mac prompts | Closed (Goose retired, P-146) |
| R-109 re-check agreed screens before building | a rule (design before build) in Phase 2 |
| R-110 Devin findings reach the Lead without pasting | Closed (inbox works: Devin branches merged 30 Oct) |
| R-111 AI everywhere it helps | L3 |
| R-112 demo data covering every scenario | N3 (C10.1) |
| R-113 Screen 04 questions | X3 |
| R-114 superseded by R-115 | Closed |
| R-115 Wave 1 reset | this backlog |
| R-116 AI run experience | X6 |
| R-126 a hand upload waits for a person | X8 |
| R-128 Program structure simpler | Closed (S2b merged 28 Oct, PR #66) |
| R-130 delete/retire best practice | in each item's acceptance checks (P-116 pattern); S6 → X3 |
| R-131 AI demo plan | N10 (saved results + live on request) |
| R-132 Start setup never spends by itself | Closed (S3 merged; live AI off by default in N1) |
| R-134 stand-in chips and change sheet | X4 (B49) |
| R-135 PQR/SQR boundary page | X12 |
| R-144 lighter Immigration programs cards | Closed (card v4 merged, #108) |

## SCREENS.md
Screens 01–04 are built and covered by N- and X-rows. 05 and 07 were dropped (P-28). 06 is the existing Release button only (P-28). F1 → N1; F2 extension → L5; R1 thin slice: merged; E1 → X10.
