# qa after-merge 7 — main 73396df2 (1 Nov 2026, qa-2)

**Re-scored at the tech lead's request:** C10.1, C3.11, C11.7 (#113), C1.5 (#273), plus C11.12 and C11.6.
**Run:** the tech lead asked for a smoke of Works on 69e0f215 (records only since 25cefb67: #269, #271, #272). While it ran, four product PRs merged, so the round covers `git log --first-parent 69e0f215..73396df2`: #273 (screens, C1.5 X2b slice (b), migration `line_batch`), #275 (runtime X1c, C11.12), #113 (runtime: queue transaction fix, C10.1 configured checkpoint, C3.11 signed-scan lines, P-184 speed; it also moves Demo › Load sample to the six combinations of `samples/wave1.json`, S7), #278 (runtime, C11.6 QA-126 to QA-128).
**Copies (cloud, isolated, no STUDIO_*_LIVE, US$0):** qa_q2 :4472 (suite sample `POST /demo/load`), qa_rt :4473 (`setup_visitor_visa.ts`), qa_jn :4474 and qa_cp :4475 (blank, then the configured checkpoint), one fresh copy per builder check (:4475–:4479). The cloud demo :4400 was not used (empty here).
**Not run on purpose:** the full suite set (the merge queue's batch ran it), graph, c8, live AI.
**Setup lesson:** `lane.sh setup` built the Prisma client and the web app on the qa branch before I moved to main. Every page then failed ("reading 'groupBy'", stale screens) until `prisma generate` and `vite build` ran again on main. That was not a product fault.

## Verdict
**Ready, with one new Minor.** Every merged product PR's own checks pass on main, and the person walks pass. QA-126, QA-127 and QA-128 are closed. New: **QA-143** (Minor, runtime): P-209's "Principal applicant" is not what a person sees, because #275 and #113 crossed. 0 Blocker · 0 Critical · 0 Major · 1 Minor new.
**For P-220 (Visitor visa first):** the configured checkpoint releases nothing. Visitor visa stops at submit with 177 problems, so DEMO rows 9–12 (channels, release, family case, IMM 5257 fill) wait. qa-1's baseline (#280's sibling, branch `claude/relaxed-cannon-cnz95j`) reached a release only through `setup_visitor_visa.ts` and the older sample. On main, the Demo menu no longer offers that sample.

## Smoke of Works on 69e0f215, then 73396df2
| Check (copy) | Capabilities | Result |
|---|---|---|
| `tests/qa/check_qa_am_1101_browser.cjs` (:4472) | C11.10, C1.8, C5.3, C3.x library list | 23/23 |
| `tests/qa/check_qa_am_1101c_walk.cjs` (:4472) | C11.10 next step, wrong role, zoom | 15/15 |
| `tests/qa/check_qa_am_1101e_walk.cjs` (:4472) | C3.12, C11.15, C11.10, C1.5 preview | 23/24 (QA-131, as before). **Repaired:** the suite sample now holds IRCC's whole list ("Showing 50 of 237 forms · Show 50 more forms"), so IMM 5257 is past the first page. The walk now narrows with Used by › Visitors › Visitor visa, as a person would. |
| `tests/qa/check_qa_am_1101c_runtime_walk.cjs` (:4472) | C6.2 keyboard and zoom, C7.x words | 18/19 (QA-76, open) |
| `tests/runtime/check_runtime_r1d.ts` (:4473) | C6.1–C6.6, C7.1, C11.6 C-9 | 86/86 |
| `tests/qa/check_qa_am_1101c_validated.ts` (:4473, after r1d) | C11.6 C-9 | 9/9 (one assertion widened, below) |

Old qa walks not rerun (drifted, repaired in #280 when it merges): `check_qa_r1d_walk.cjs` (Filed now waits for the validated copy, C-9) and `check_qa_explore_1025.cjs` (its Online-capture fixture is gone, P-122).

## The merged PRs on 73396df2
| PR | Capability | Builder's checks here (fresh copy) | qa walk |
|---|---|---|---|
| #273 | C1.5 | `check_x2b_bulk_apply.ts` 55/55, `check_x2b_bulk_preview.ts` 62/62 | API only, no screen yet (slice (c) is #281) → stays Partial |
| #275 | C11.12 | `check_qa77_names_browser.cjs` (fixture sample) | **QA-143**: the Demo menu's samples still say "Applicant" (screenshots `c1112-vv-people-1440.png`, `vv-configured-questionnaires-1440.png`) → stays Partial |
| #113 | C10.1 | `check_c10_1_configured.ts` 20/20, `check_c10_1_browser.cjs` 12/12, `check_s7_load.ts` 19/19, `check_s7_reset.ts` 4/4, `check_s7_dialogs_browser.cjs` 12/12, `check_queue_tx.ts` 8/8 | `tests/qa/check_qa_am_1101f_walk.cjs` (new) 16/17: menu → confirm (says what it brings; nothing past the rules) → 22 s → 13 rows with status and why; double click loads once; 1440/1024/400 without sideways scroll; axe clean; Esc; then "reset first" and 409; client 403 (`c101-*.png`) → stays Partial (rows 7, 9–12, 17) |
| #113 | C3.11 | `check_c3_11_signed_scan.ts` 30/30, `check_c3_11_browser.cjs` 21/21 | Visitor visa (checkpoint): no hand-signed line in release 1, so no scan line (expected; row 9) → **Not built → Works** |
| #113 | C11.7 | `check_s7_load.ts` 19/19, `check_s7_reset.ts` 4/4, `check_s7_dialogs_browser.cjs` 12/12 | API walk, fresh :4476: Load sample (six) brings exactly the P-148 six, nothing released, 139 proposals replayed; Reset leaves 0 → stays Partial (data only: 8 forms without a saved answer, 2 held PDFs) |
| #113 | QA-117 | `check_qa117_person_sections.ts` 3/3 | — |
| #278 | C11.6 | `check_runtime_r1d.ts` 86/86 | `check_qa_am_1101c_validated.ts` 9/9: 20 MB and one-file words; the differing value named; double send kept once. **QA-126, QA-127, QA-128 closed.** Two files answer 413 (not 400) with the right words; the check now accepts either. |

## What stops Visitor visa in the configured checkpoint (for builders B1–B5 and M3-A/M3-B)
From `GET /combinations/:id` on qa_cp after the checkpoint: 177 errors of 182 problems.
* 120 facts that forms need but nobody is asked: Applicant 46, Spouse or partner (travelling) 46, Child (travelling) 47 (the counts overlap with Representative 20 and The application 7). Questionnaires shows "Applicant · 0 questions · 53 not asked". The checkpoint does not build the person sections (qa-1's G4: they cannot be added on screens).
* 48 form fields with no decision on IMM 5707 (5), IMM 5476 (7), IMM 5475 (3), IMM 5257 SCH1 (10) and IMM 5409 (13), among others.
* 6 "only if" conditions still in words (IMM 5409, 5475, 5476, 5645, 5707, IRM 0002).
* IMM 5257 has no saved field-map answer under today's 5-part drafting (row 12). It waits for the founder's paid run, so it cannot be drafted at US$0.

## Progress (`tools/progress.sh`; runs and counts "Built, awaiting qa", P-219)
Before: M2 25 of 56 (44%) · 27 partial · 4 not built. After: **M2 26 of 56 (46%) · 27 partial · 3 not built** (C3.11 Not built → Works). R1 6 of 8, M3 0 of 16, both unchanged. `qa/built/` (P-221) is not on main yet: no file to delete in this PR.

## Could not test
* The read-only walk on accumulated demo data (the cloud demo is empty).
* C3.11 by my own hand on a combination with a hand-signed line (the builder's browser walk covers it; I ran it).
* M3-A (no PR yet). Acceptance pack 4 is not in the repo.

## Questions for the tech lead
1. **P-220 path.** The Demo menu now loads only the six (S7, P-148), and the checkpoint cannot release Visitor visa at US$0 (IMM 5257 has no saved answer; the person sections are not built on screens). Should the M3 Visitor visa builders keep starting from `setup_visitor_visa.ts`, or should the checkpoint carry a Visitor visa release first? My recommendation: a checkpoint step that releases Visitor visa through the same services (the seeded sections as Sample), so the demo and M3 start from one place.
2. QA-143: fix `wave1.json` alone, or have one source for the sample's labels? My recommendation: `wave1.json` now (one line), plus a check that walks the Demo menu sample.

## Suggestions
* *Needed for the proof · Scaffolding:* after `git merge origin/main`, `lane.sh setup` (or the qa skill) should rerun `prisma generate` and `vite build`. A stale client cost this round 20 minutes.
* *Later · Capability:* say in the Forms list how many forms are behind "Show 50 more forms" next to the filter (it does: "Showing 50 of 237"). No change needed. Noted only because a check fell into it.
