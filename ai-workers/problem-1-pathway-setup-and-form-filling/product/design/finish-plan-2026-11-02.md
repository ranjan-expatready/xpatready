# Finish plan: M2 to 60/60, M3 started per row (P-260, P-261)

Written by the tech lead, 2 Nov 10:15 UTC, on `main` 12647032, for the founder's OK before anything starts. Numbers come from `qa/CAPABILITIES.md` (qa's scores) and the PRs; dates and costs marked *estimate* are estimates.

## Where we are (qa's scores on main)
M2 **40/60 Works**, 16 Partial, 4 Not built. M3 2/17 Works. Open PRs: #493 R3 and #469 QA-82 approved (Mergify merges them on green); #478 C11.12 conflicts with main; #495 T1 part 1 needs the reviewer; #417 the paid-run plan (draft). Last night's full run was red on one browser check (C3.13 sample load timed out; the cause is still open after #423 added diagnostics); a re-run on GitHub started at 09:59 UTC.

## The 20 M2 rows not yet Works, and what each needs
| Row | What is missing (qa's note) | Kind | Lane |
|---|---|---|---|
| C5.6 Demo release | G3 merged (#471) | qa only | qa |
| C2.6 Checklist reading | Visitor visa's reading saved (#485) | qa only | qa |
| C11.15 Form finder | K11 Majors fixed by #274, verify; Minors QA-78, 98, 105, 107, 110, 111; Redo and Replace only live | verify + small fixes + one live check | L8 |
| C11.7 Reset and Load sample | the six now load (D1 #407); 8 forms have no saved field map (R-146) | paid data | Track A |
| C10.1 Demo checkpoint | Visitor visa released with Saved results only (D3, QA-144) | follows Track A + gates | Track A, last |
| C3.4 AI drafts sections, rules, answer lists | the app step + a saved run for Visitor visa | product gap + paid data | L6 + Track A |
| C4.7 PQR picks | the whole screen (draft, accept, remove) + a saved run | product gap + paid data | L5 + Track A |
| C4.11 Draft questions and documents | live wiring of step 5 and the checker + a saved run | product gap + paid data | L5 + Track A |
| C11.8 AI progress, Stop, cost | QA-98, QA-106, QA-111; seen on one real run | product gap + one live check | L6 |
| C9.1 New edition impact | AI impact on parts and combinations (today rules only) | product gap + paid data | L6 + Track A |
| C11.12 Who can be in the application | #478 (PR 2 migration + PR 3 screen), P-209 rename, three filing modes, QA-82 (#469), QA-91 | product gap | L2 |
| C3.12 Forms list | a "Published" date (K3) | small gap | L7 |
| C11.3 Structure | QA-150 (full trail in Used by and the finder) | small gap | L7 |
| C11.14 AI proposals | Load sample makes 0 proposals; Select all within a filter | small gap | L8 |
| C3.6 Add from a need | a document type named while adding a requirement must wait as a proposal; Where used flags a retire | small gap (guarded Add part held) | L8 |
| C11.13 One guarded change | G-CORE + SH2 where-used (P-253); guarded Add itself held (P-251) | new core, concept first | Lead concept → L9 |
| C5.4 Source-register gate | G1 | new | L2 after C11.12 |
| C5.7 Answer-key families | G4 | new | L3 |
| C5.5 Answer-key gate | G2, after G4 | new | L3 |
| C5.1 Release needs a form line | G5, **held** by the product owner (P-248, P-251) | held | none |

**Held parts:** C5.1 (G5) cannot reach Works, and C11.13 and C3.6 can reach Works only without their guarded-Add part, until the product owner of SA-01B rules (P-251). So 60/60 needs that ruling; without it the ceiling is 59/60 with two rows "Works, held part excluded". This is the founder's decision (question 2).

## Lanes (one fresh cloud session per row; each holds a queue of two or more rows, P-259)
| Lane | Area | Queue, in order | Starts |
|---|---|---|---|
| L1 runtime | runtime | open D4's PR from 0790d975, then S4's from 81e799bf (built and approved, **not rebuilt**) → the nightly red (C3.13 load) → T1 part 2 → R4, S1, S3 | wave 1 |
| L2 screens | screens | #478 C11.12: resolve with main, reviewer, label → C11.12 rest (P-209 rename, filing modes, QA-91) → G1 (C5.4) | wave 1 |
| L3 forms gates | forms | G4 answer-key editor and runner (C5.7) → G2 gate (C5.5) | wave 1 |
| L4 Track A jobs | forms "ai-runs" | #417's three US$0 blockers, then one PR with every job file and its usual and worst cost (C3.4, C4.7, C4.11 step 5, C9.1, IMM 5257 field map, R-146's 8 maps) | wave 1 |
| Mac paid runner | Mac session | runs each job on the tech lead's Go, one at a time; tech lead verifies quotes and contract; qa verdict on each result PR (P-227) | when L4's PR merges |
| L5 Track B-1 | forms | C4.7 picks screen → C4.11 live wiring (built on the fake launcher, then fed the Saved results) | wave 1 |
| qa | qa | P-250 scoring of every approved PR; now: C5.6, C2.6, C6.4, C11.7 re-score | wave 1 |
| L6 Track B-2 | forms | C3.4 AI step in the app → C11.8 QA-98, 106, 111 → C9.1 AI impact | wave 2 |
| L7 screens small | screens | K3 (C3.12 date) → QA-150 (C11.3) → K10 (C11.10 bugs) | wave 2 |
| L8 forms small | forms | K11 verify + C11.15 Minors → C11.14 leftovers → C3.6 owed part | wave 2 |
| L9 G-CORE | forms | G-CORE with SH2, after the tech lead's concept passes an independent challenger | wave 2 (concept day 1) |
| Lead | — | G-CORE concept, SH3 resolver contract, row shaping, Gos, records, 20-minute check | now |

**Wave 1** is 5 builders + qa (the skill's start of 3–5). **Wave 2** adds L6–L9 as soon as batch failures stay under 10% and approved-to-merged under 1 hour (the measures of the lead skill), *estimate* day 1 evening. Four forms lanes at once is the main file-clash risk; each owns separate files and the tech lead checks overlaps before starting one.

## M3, per row when its stage is ready (P-261)
SH3 resolver contract first (tech lead, *estimate* 3 Nov), sent to the product owner with the P-251 designs. Then, one lane each when ready: C7.7 (takes over #357 part 1) · C8.1 · C8.2 · C6.5 (passport by rules first; OCR only through STANDARDS §1) · C7.5 (paid runs within P-225). M3 partials (C6.4 built awaiting qa, C6.12, C7.3, C7.6, C11.5, C11.6) are shaped by the tech lead on 3 Nov. Held rows stay held. No session without a ready row.

## Money (paid AI)
Approved: P-232 US$25 for today (2 Nov), P-225 US$20 a day after; R-146 up to US$50. Spent today US$0.50. Track A from #417: D3 runs worst ~US$12.4 (usual ~2.5), C3.4 worst up to ~10, R-146 worst US$45.08 (usual ~9–10), C4.7 and C9.1 to be priced in L4's PR. **Total usual ~US$15–20, worst ~US$70, spread over 2–3 days** (*estimate*). Each run needs the tech lead's Go with its cost; anything above the caps comes to the founder first. The ledger's older caps (US$120 experiment, US$60 Wave 1, since 26 Oct) are checked before the first run.

## Dates (*estimates*)
Wave 1 rows and qa-only rows: 3–4 Nov · Track A data: 3–5 Nov · Track B and gates: 4–8 Nov · G-CORE: 6–9 Nov · **M2 gate about 11–12 Nov (unchanged, P-255)**, at 59/60 unless the product owner rules on G5 earlier. Stops at 95% and 98% of the weekly plan stay (P-257).

## Rules the program runs under
Paid run only on the tech lead's Go with its cost (P-225, P-227) · qa scores before merge (P-250) · holds respected (P-251) · big-impact choices raised first (P-254) · stop at 95%, closed by 98% (P-257) · no idle lane (P-259) · records batched, never labelled; merged only when no Mergify batch is checking.
