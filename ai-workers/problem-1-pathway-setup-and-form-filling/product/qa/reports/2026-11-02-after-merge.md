# qa after-merge — 2 Nov 2026, main 59d2da74 (after #397), retest on 54019473 (after #398, #401)

Mode `/qa after-merge` in a cloud copy (lane qa, branch `claude/optimistic-goodall-d6gcl6`). Live AI off on every copy (no STUDIO_*_LIVE), no priced button clicked: **US$0**. Ports 4470–4479 only; the :4400 demo was not used (not reachable from the cloud). Screenshots: `2026-11-02-after-merge/`.

## Verdict
**Ready for what is claimed, with one Major bug.** Every non-M3 `qa/built/` row is scored (10 files deleted), plus C11.3 and C11.7. Moved to **Works**: C11.1, C11.9, C11.10, C2.12, C3.3, C4.1, C4.4. Stay **Partial** (the built part works, the rest is declared not built): C11.3, C11.7, C11.13, C3.4, C4.11. New: **QA-149 (Bug · Major, C6.4/runtime)**, QA-150 (Gap · Minor, C11.3). Closed: **QA-73**, **QA-145**.

**The Lead's message (2 Nov):** the M3 Visitor visa rows (C6.4, C6.12, C11.6, C7.x, C6.9) belong to qa-m3. I had run their packs already; their CAPABILITIES rows and `qa/built/C6.4.md`, `C6.12.md` (and the new `C11.6.md` from #356) are left exactly as on main for qa-m3. My M3 results stay below **as input for qa-m3, not as scores**, and QA-149 stays open (found on C6.4's pack; qa-m3 retests it). C3.12 has no `qa/built` file: scored Partial on 1 Nov (ee72cf3c, QA-148 waits for a decision) and no app change has touched it since, so it is unchanged.
**Retest on 54019473** (main after #356, #398, #401): C4.11 `check_forms_c411_contract.ts` 31/31 (with #401's new check), `check_forms_c411_draft_qd.ts` 55/55, `_browser.cjs` 19/19; C11.3 pack 19/27, the same failures as on 59d2da74. `check_c1116_one_way_in_browser.cjs` 30/31: its usage line starts the copy with `STUDIO_AI_LIVE=approved` (fake launcher); qa never sets a live switch, so without it the page rightly offers "Find form numbers by rules (free)". Not a bug; CI runs it as written.

## How it was tested
* **Underneath:** each capability's acceptance pack and the suites the builders moved, each on its own fresh isolated copy (`isolated.sh`, two waves of nine copies), then the builders' browser checks on fresh copies. Main reaches `main` only through Mergify batches whose checks are green; the full `run-suites.sh` was not rerun here (cost; the Lead asked to test what changed).
* **Like a person:** headless Playwright as user-A / user-B (the cloud has no display, so no headed walk): Demo › Reset (typed RESET), Demo › Load sample, Immigration programs Cards/List in two browsers and two people, Visitor visa's tabs, Shared library › Forms, Review and release at 1440 / 1024 / 400 px. No page errors.
* **Setup note:** `lane.sh bind qa` switched this copy to the old branch `claude/qa-l10-e3c849` and `lane.sh setup` built `web/dist` there; merging main into it conflicted on `qa/BUGS.md` (QA-73). I aborted the merge, went back to the session branch (= main) and rebuilt `web/dist` before walking (the first walk showed the old Demo menu "Load sample inputs"). Suggestion below.

## Results per capability
| Row | Score | Evidence (all on 59d2da74, fresh copies) |
|---|---|---|
| C11.1 | Works | `qa/check_qa_am_1027.cjs` 55/55 (A empty, B Visitor visa 13/13); only the decided "later wave" notes mention the extension |
| C11.3 | Partial | pack 19/27: AT-1–8 pass; AT-9.2–9.6 fail only because the pack calls `POST /demo/load` with no body (the suites' old fixture) — the six loaded from the Demo menu have every P-112 trail (API `/catalogue` and the page); AT-10 Used by and finder plan → **QA-150**; AT-5 (AI "did you mean") is the later forms row |
| C11.7 | Partial | Reset: button enabled only for "RESET" (not "reset"), 0.9 s, 6 built-in roles left, preserved evidence byte-identical. Load sample: 15 s, 6 combinations (5 Retail + 1 Corporate), 42 files, 139 proposals, US$0. Pack 18/21: part B red (Provincial nominee from paper twins: IMM 5669 and IMM 0008DEP "could not read the edition"; no nomination certificate line) |
| C11.9 | Works | `check_c119_acceptance.ts` 23/23, `check_c119_library_items_browser.cjs` 29/29 |
| C11.10 | Works | pack 15/15, browser 14/14; walk: List follows user-A to a fresh 1024 px browser, user-B sees Cards; probes: 5 000-character, "LIST", "liste" refused "Choose Cards or List."; two saves at once → one row; no person → 401 in words; tab badges carry words ("Forms 44 setup items open") |
| C11.13 | Partial | `check_forms_c1113_acceptance.ts` 21/21; pack 14/15 (see Questions); Draft fields route/screen and AI "did you mean" still to come |
| C2.12 | Works | pack 16/16; `c212_complete` 6/6, `_queue_forms` 45/45, `_rail_browser` 31/31, `_to_review_browser` 30/30 |
| C3.3 | Works | `check_forms_c33_acceptance.ts` 14/14, `check_forms_c33_failed_run_browser.ts` 22/22 (fault source, fake launcher) |
| C3.4 | Partial | pack 7/16: queue, quotes, no duplicate names; no replayed drafting of sections, lists, checks, document types; no rules from the guide |
| C4.1 | Works | `c41_section_order` 32/32, `c41_questionnaire_roles` 6/6, `c41_section_order_browser` 29/29 alone (it timed out once on the Undo toast while nine copies shared 4 CPUs). Visitor visa waits for C4.11's questions |
| C4.4 | Works | pack 28/28; browser 33/33 and 19/19 |
| C4.11 | Partial | `c411_contract` 30/30, `c411_draft_qd_browser` 19/19; pack 4/23 ("Visitor visa has no form fields mapped to facts yet"; needs the P-131 trial) |
| C6.4 (qa-m3's; input only) | — | pack 8/16: the derived list per person works; **QA-149**; request/upload/history/Not applicable not built (404) |
| C6.12 (qa-m3's; input only) | — | pack 16/24: filings, group, fees and family maximums with IRCC source; split and biometrics age rules not built; setup_vv_m3 S7/S7a: no eligibility-gates or fee-table route |
| C7.6 (qa-m3's; input only) | — | `check_c76_readiness.ts` 56/56 (engine); pack 1/23: no readiness, review, upload or Ready-to-file routes yet |

## Retests
* **QA-73 — closed.** `check_screens_qa_1029_browser.cjs` (22 items, every Item ≤ 60 characters or clamped, 20 long definitions in the tip, no role name or whole definition) and `check_review_item_words.ts` 7/7; six-sample Visitor visa Review at three widths, no sideways scroll.
* **QA-145 — closed.** Five Load sample runs and the Demo menu walk: `git status --porcelain` empty.

## Bugs
0 Blocker · 0 Critical · **1 Major** · 1 Minor new.
* **QA-149 (Bug · Major, C6.4, runtime).** On a family Visitor visa case, the child's "Is this person travelling to Canada alone?" answered yes correctly adds "Letter of authorization for a minor", but then the question leaves both the officer's case view and the client's questionnaire (`engine/runtime/case.ts` `caseView` keeps a question only if it fills a box or still decides something open). Nobody can correct it through a screen; a change sent with the view's (missing) answer id is refused 409 "Changed by someone else", and the line stays. Check: `prototype/studio/tests/qa/check_qa_am_1102_c64_answer_no.ts` (1/4 today). Any deciding question (P-62) is likely hit the same way.
* **QA-150 (Gap · Minor, C11.3, forms).** Shared library › Forms "Used by" and its filter, and the finder plan's `combination.trail`, start at the Program ("Visitors › Visitor visa"), not the Pathway type.

## Underneath
* **Graph** (`graph.mjs --write`): G3 2 → 4 and G6 0 → 2, all from this round's merges. G3: `DELETE /library/sections/:key` (the page uses the POST `…/delete` variant), `POST /library/sections/:key/restore`, `POST /library/document-types/:key/restore` (no test restores a section or a document type), `GET /attachments/:id/file` (older). G6: `api/src/features/draft-contract.ts` and `visitor-visa-filings.ts` are loaded at start by `features.ts` (P-214), so they are not dead; `graph.mjs` does not see that folder read.
* **decision-impact.sh:** every product decision has a capability or is exempt.
* **Coverage (c8): not measured this round** (it needs the whole suite run under c8; cost). The floor is unchanged from the last report.
* Builders' browser checks rewrite about 50 tracked screenshots under `screens/*/screenshots/` when run; I restored them. Not a product bug.

## Not tested
The :4400 demo (not reachable from the cloud) · a headed walk (no display) · QA-129 (the founder's open question) · axe and 200% zoom on the new pieces (the builders' checks cover them; I did not run axe myself) · Load the configured checkpoint · the C11.9 restore of sections and document types.

## Questions for the Lead
1. **C11.3 pack AT-9** calls `POST /demo/load` with no body, which loads the suites' old fixture; the Demo menu loads `{"sample":"six"}`, which has every P-112 name. *Recommendation:* change the pack to load the six (a test fix, forms lane) and count AT-9 as passing.
2. **C11.13 pack's last check** reads the Release page before the second person approves; the Release page lists approved library changes only, so the builder's suite approves first. *Recommendation:* accept the suite's order and amend the pack (P-120 says "shown at release": after approval is when it is released).
3. **QA-149** — for qa-m3 and the runtime lane. *Recommendation:* keep a question in the case while it has an answer and still decides a line, form or question, whether or not that line is open; hold C6.4 merges on the checklist until retested.

## Suggestions
* `lane.sh bind qa` in a cloud copy should stay on the session's branch (or at least build `web/dist` after the merge with main), so qa never walks an old build. *Needed for the proof · Scaffolding.*
* A test that restores a retired section and a retired document type through the second person. *Later · Capability.*
* `graph.mjs` should count `api/src/features/*.ts` as imported (registered at start). *Later · Scaffolding.*
* A Problem Details refusal for a body that is not JSON says "Unexpected token 'l', "list" is not valid JSON"; plain words would be better. *Later · Capability.*

## Round 3 — main 278eb3e9 (05:00 UTC: #412 and #414 merged; #407 not yet)
* **QA-75 — closed** (#412). `check_forms_qa75_job_page_browser.cjs` 21/21. Walked as the author on a copy with the six loaded: AI work › field-map run › Review proposals at 1440/1024/400 px. The heading names the form, the trail is "Outside Canada › Forms", the basis line is plain, and "below" has the comparison under it. No status code, "On this computer", "prototype-only" or "Sources and forms"; no sideways scroll (`qa75-job-*.png`).
* **C7.2 → Partial** (#414). `check_c72_imm5257_fill.ts` 36/36: the Sample family's IMM 5257 fills 40 of 46 mandatory fields, none by hand. Still open: the 6 mandatory boxes no question asks (#414's Questions, forms row) and Adobe Validate plus the barcode read-back (Mac only, the evidence lane).
* **C11.7:** waits for #407 (Reset to the six, P-226); it will be scored when that merges.
* Records: merged qa-m3's QA-151 to QA-153 and C11.6 with this round's rows, keeping both sides; qa-m3's C6.4 row cites QA-149.

## Round 4 — P-250 before-merge scoring, then main 0dbcbd84 (LeadX, 2 Nov morning)
**Before merge, on each approved PR's head commit** (its own worktree and fresh isolated copy, US$0); the verdict is commented on each PR. None had a Blocker or Major.

| PR | Head | Result |
|---|---|---|
| #407 D1 Reset to the six | 8b55f569 | d1 25/25, d1 browser 25/25, s7_reset 4/4, qa145 8/8; walked twice (see C11.7) |
| #427 C11.13 Draft fields | 44f04033 | 42/42, browser 14/14 |
| #428 QA-76 | 99425a77 | qa76_words 10/10, case_engine 61/61, r1c 125/125 (after setup_visitor_visa) |
| #429 D3 edition label | 4711bd95 | d3_saved_edition 11/11, c34_masters 29/29, c312_field_map 48/48 |
| #426 C3.6 answer values | b168543d | 50/50, browser 12/12 |
| #423 c313 fix | 8e04cf19 | 24/24 alone. Minor: under the load of five copies its sample load got 409 "Already in progress …" (a repeated request) |
| #434 screen01 race | e6e5a277 | 135/135 |
| #435 D2 part 1 | fd06266f | c33 failed run browser 22/22, s5_slice3 35/35. Two checks need `STUDIO_AI_LIVE=approved`; qa never sets it, so they were not run |
| #436 samples (P-230) | 7c1eb50d | s7_load 23/23 |
| #409 C7.2 evidence | 04b305c3 | records only. Minor: the README's 32/46 predates #414 (40/46 now) |

**After merge, on main 0dbcbd84:**
* C11.7: Partial (P-226 Reset to the six done; part B red).
* C11.3: Partial (names done after Reset to the six; QA-150 and AI "did you mean" open).
* C11.13: Partial (Draft fields 42/42; AI "did you mean" off, P-95).
* C3.3: Works (K2: `check_ai_drafting.ts` 48/48 in a throwaway worktree, 14/14, 22/22, screens read as a person).
* C4.5: Works under P-256 (34/34, 35/35; the per-section document fill moves to M3 with C6.5).
* C5.1: Partial (P-248 not built yet, G5; the F8 check still allows documents only).
* QA-76: Minor (was Major); only the representative's heading is still unseen.
* Built files deleted: C11.13, C11.7-D1. Left for qa-m3: C6.4.

## Round 5 — P-250 verdicts, qa-m3's PRs, and K10/K1/K3/K4 on main 21d988b7 (LeadX)
**Before-merge verdicts** (each PR's head, its own worktree, a fresh copy, US$0; commented on each PR). No Blocker or Major.
* #457 C6.9 part 3 (16ad016f; qa-m3's, taken over): `check_c69_runs.ts` 98/98, `check_c69_page_browser.cjs` 43/43, `acceptance/C6.9.test.ts` **15/15** after the Visitor visa setup.
* #445 C11.12 PR 1 (653b9044): `check_c1112_modes.ts` 39/39. Pack 18/19: its one fail asks every principal to read "Principal applicant", which is stricter than P-209 (Question on the PR).
* #455 R2 fees (64fc85b8): `check_r2_fee_table.ts` 45/45, `check_vv_prepare.ts` 32/32.
* #456 S1 (216d7f0d): `check_c76_readiness.ts` 64/64. #458 S9 (04c8ace4): `check_forms_f1p.ts` 18/18.
* New heads on #435, #426 and #436: only main merges, records, or a check that needs the live switch, so the verdicts stand.

**On main 21d988b7:**
* K10 (C11.10): QA-120 and QA-121 closed (`check_x1_tabs_focus_browser.cjs` 48/48); QA-129 is the founder's question.
* K1 (C2.12) and K4 (C4.1): already met (round 1 evidence), so both rows stay Works.
* K3 (C3.12): the Published date shows at all three widths, with no sideways scroll and axe clean. C3.12 stays Partial on QA-148.
* 07:35 UTC check: #468 D3 (C2.6 launcher job, 33ba1f96) passes. The stub pass reproduces (exit 0) and `check_forms_s4_canada.ts` is 80/80. Minor: the stub run rewrites the tracked `p2/screening/canary-digest.json` (QA-145 part 2 class). #457's new head 65a9f9ca only changes a suite list, so its verdict stands.

## Round 6 — after-merge re-checks on main c5240a3b (#423, #434, #435, #445, #456 merged 08:02–08:03; #426 earlier)
* C11.8 (#435 D2 part 1): pack 12/4/2, the same as its 1 Nov baseline. **New QA-154 (Gap · Major, forms):** a LIVE field-map draft on a copy without the switch is queued (201) instead of refused at the door, and the plan carries no live flag. Partial.
* C11.12 (#445 PR 1): 39/39; pack 18/19 (the P-209 pack Question). Partial (PRs 2–3 to come).
* C3.6 (#426): answer values 50/50; pack 17/18 on wp.family (a document type named while adding a requirement is refused, not proposed). Partial.
* S1 (#456) on C7.6: readiness 64/64 (rules level). Partial.
* #423 and #434 change only tests; their checks passed before merge (24/24, 135/135).
* Built files deleted: C3.6, S1. C6.4 is still waiting (M3; now qa's, since qa-m3 has stopped).
* The database had stopped again before this round and was restarted as user postgres.
* 08:20 UTC check (P-250): all pass, no Blocker or Major.
  * #469 QA-82: `check_c41_questionnaire_roles.ts` 9/9.
  * #470 D2 part 2 and #475 D2 part 4: forms_demo 23/23, cost_warning 27/27. Their live-switch and :4400 checks were not run.
  * #471 G3: 11/11. #477 C11.14 part: s6_queue, 32 steps passed. #479 D1 browser: 25/25.
  * #436 new head (the Sponsor co-files): s7_load 23/23, c1112_modes 39/39.
  * #455's new head only merges main, so its verdict stands.
* **#485 (P-227 Saved check, paid C2.6 reading of IMM 5484, US$0.504), head 179d80e9: pass.** On a fresh copy (fake launcher, no live switch), after Reset to the six, Visitor visa's checklist replayed at US$0 from this PR's run file, with the ledger byte-identical. Result: 20 requirement proposals, all waiting and Check (To review "Check 20", none Ready, 0 requirements written). The 11 Super Visa items and the drafted marriage condition wait for a person. Question: `n/a_processing_delay_notice` is dropped by the rules (named in the run's message), not shown on To review. Screenshot `p485-to-review.png`.
* After merge on main bd877d09: **C6.9 → Works** (#457 completes it; pack 15/15). S9 (#458): `check_forms_f1p.ts` 18/18 (no capability row; BACKLOG S9). #468: `check_forms_s4_canada.ts` 80/80. Built file C6.9 deleted.
