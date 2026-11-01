# qa after-merge, 1 Nov 2026 (second run): main c582e8d8 and the leftovers from #208's Handover

**Run:** `/qa after-merge` on main **c582e8d8** (#166), cloud copy. The last tested commit was 52768cd2 (#208). New since then: #142, #138 (no app diff on top of 52768cd2), **#133** (grey disabled primary button, shared `Button`) and **#166** (C1.8 age test and review only). Then the Handover's list: c8 coverage, a walk of QA-73, QA-74 and QA-113 on a release with list warnings, and the five PRs covered only by the nightly run (#108, #121, #122, #127, #128).

Copies: isolated qa_am :4471 and qa_n1 :4472, plus the copies the two cost checks start for themselves. `prisma generate` and `vite build` were run after switching to main. No STUDIO_*_LIVE was set; the cost checks start with `STUDIO_AI_LIVE=""` and the queue held. **US$0.** The full suite set was not run (founder, 1 Nov).

## Verdict
**Ready.** No new Blocker, Critical or Major. Two rows close (QA-74, QA-113). QA-73 narrows to a Minor: the Item column no longer shows keys, but it now shows each calculation's whole definition, and one of them holds a system role name.

## 1. What merged: #133 and #166
| Check | Result |
|---|---|
| `check_screens_qa_1029_browser.cjs` (#133's check: a disabled primary is grey at full opacity; a greyed Start setup shows the focus ring by keyboard; axe on each page) | **61/61**, twice (once plain, once under c8) |
| `check_c18_age_case.ts` (#166) | **12/12** |
| `check_who_fills.ts` · `check_who_fills_browser.cjs` (the QA-113 area) | **26/26** · **19/19** |

#133 changes the shared `Button`'s default variant, so every disabled primary on every page is now grey. A button that is disabled while saving without `aria-busy` would flash grey; none was seen on the pages walked.

## 2. Walk of QA-73, QA-74 and QA-113 (headless, 1440 and 1024 px, author and approver)
Check: `tests/qa/check_qa_am_1101_walk2.cjs`, **35/35** (kept on this copy; not committed, see Question 1). Screenshots were taken on this copy and are not committed (records PRs carry only `.md` files).

* **Release with list warnings** (the sample's released combination): 3 list warnings, each names its form once ("IMM 1295: 37 rows of its lists …"). No field key on the page. The versions table: no Fingerprint column, no hash, one date format ("today at 3:21 a.m."). Tables fit their boxes at 1024; no sideways page scroll; axe clean.
* **QA-74: closed.** The versions table is fixed on the combination's Review and release tab, on both combinations walked, at both widths.
* **QA-113: closed.** As the approver, To review lists the who-fills change as "Field and level of study of a period of education · filled by the case officer, for every combination"; "who fills" is never doubled. At 1024 px the table is 750 px in a 750 px box, and the headers read whole ("Item / What and why / Status / AI cost / Next step"). The first click on "Approve or return" opened the change three times out of three.
* **QA-73: narrowed to Minor, stays open.** Visitor visa › Review and release, the changes table (22 rows): no keys any more, but each Item is the calculation's full definition, e.g. "Sort the person's activity rows by start month; count calendar months up to the application date not covered by any row …" (about 260 characters), and "Number of person records in the case holding the role **subject_spouse_or_partner** (current spouse, common-law or conjugal partner) on the application date." Expected: a short name per item ("Number of spouses or partners", "Gap in activity, in months"), the definition in a tip or under Details, and no system role name.

## 3. The five PRs covered only by the nightly run
Each PR's own checks, run here on c582e8d8:

| PR | What | Checks | Result |
|---|---|---|---|
| #108 | setup checklist card v4, S6 2a library | `check_setup_card_browser.cjs`; the card v4 steps in `check_screens_qa_1029_browser.cjs` | 42/42; 9/9 |
| #121 | Forms tab cost warning, own Continue, stale lock | `check_cost_override.ts`, `check_cost_warning_browser.cjs` | 64/64; 26/26 |
| #122 | Used-by count, loading list role, F2 official pages | `check_official_pages.ts`, `check_forms_s4_library_browser.cjs` | 42/42; 95/95 |
| #127 | a barcode form's download serves its current validated copy | `runtime/setup_visitor_visa.ts` + `runtime/check_runtime_r1d.ts` | 13/13; 80/80 |
| #128 | the cost warning makes its plan again on Start | `check_cost_warning_browser.cjs` | 26/26 |

A note for anyone rerunning: the `.ts` checks that import `api/src` need `tsx --tsconfig api/tsconfig.json` (as `run-suites.sh` does); a plain `tsx` fails with "Parameter decorators only work when experimental decorators are enabled". Running the checks rewrites the builders' tracked screenshots under `screens/W1-ai-drafting/screenshots/`; they were left out of this PR.

## 4. Coverage (c8, partial)
The API server ran under c8 (`NODE_V8_COVERAGE` + `tests/qa/coverage-preload.mjs`) while the five checks of §1 and §2 clicked through it.

| Part | Lines | Branches | Note |
|---|---|---|---|
| `api/src` | 51.44% (5499/10690) | 70.05% (1640/2341) | 5 checks only |
| `engine/` | 75.55% (2637/3490) | 76.70% (1386/1807) | 5 checks only |
| `api/src/who-fills.ts` | 100% | 75.75% | the area of QA-113 |

**Not comparable with the floor** (api 97.4 / 82.5, engine 99.4 / 89.6, 29 Oct): the floor is measured over every suite, and the founder ruled out the full suite set for qa (1 Nov). No fall is claimed; the floor stays as it is until a full c8 run (Question 2).

## 5. What I could not test
* A headed walk: this cloud copy has no visible browser; the journeys ran headless at 1440 and 1024.
* The read-only walk of the shared demo on :4400: it lives on the Mac only.
* The graph (`graph.mjs`): no new capability merged in this window.

## Questions for the tech lead
1. **qa checks in a records PR.** Any file under `prototype/` makes a PR "code" in CI, so the suites run in its merge-queue batch on the Mac. The skill asks qa to commit a replayable check per finding in `tests/qa/`. Should qa (a) commit its checks in records PRs anyway, (b) collect them into one small PR a week, or (c) keep them only in the report? I recommend (b): one batch a week costs the Mac one suite run.
2. **Full c8 coverage.** It needs every suite under c8. Could the nightly run on the Mac run once a week under c8 (`NODE_V8_COVERAGE` + the preload) and save the report, so qa reads the floor from it instead of loading the runner?

## Suggestions
* *Needed for the proof · Capability:* QA-73's Item column takes a short name per calculated answer (the library already has labels for fields; calculations need one).
* *Later · Scaffolding:* `run-suites.sh --one <check>` that starts a fresh copy and uses the right `tsx` flags, so qa and builders run one check the way CI does.
