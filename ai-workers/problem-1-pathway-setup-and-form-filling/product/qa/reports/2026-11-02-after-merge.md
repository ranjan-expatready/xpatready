# qa after-merge — 2 Nov 2026, main 59d2da74 (after #397)

Mode `/qa after-merge` in a cloud copy (lane qa, branch `claude/optimistic-goodall-d6gcl6`). Live AI off on every copy (no STUDIO_*_LIVE), no priced button clicked: **US$0**. Ports 4470–4479 only; the :4400 demo was not used (not reachable from the cloud). Screenshots: `2026-11-02-after-merge/`.

## Verdict
**Ready for what is claimed, with one Major bug.** Every `qa/built/` row is scored (12 files deleted), plus C11.3 and C11.7. Moved to **Works**: C11.1, C11.9, C11.10, C2.12, C3.3, C4.1, C4.4. Stay **Partial** (the built part works, the rest is declared not built): C11.3, C11.7, C11.13, C3.4, C4.11, C6.4, C6.12, C7.6. New: **QA-149 (Bug · Major, C6.4/runtime)**, QA-150 (Gap · Minor, C11.3). Closed: **QA-73**, **QA-145**.

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
| C6.4 | Partial | pack 8/16: the derived list per person works; **QA-149**; request/upload/history/Not applicable not built (404) |
| C6.12 | Partial | pack 16/24: filings, group, fees and family maximums with IRCC source; split and biometrics age rules not built; setup_vv_m3 S7/S7a: no eligibility-gates or fee-table route |
| C7.6 | Partial | `check_c76_readiness.ts` 56/56 (engine); pack 1/23: no readiness, review, upload or Ready-to-file routes yet |

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
3. **QA-149** — the fix belongs in the runtime lane. *Recommendation:* keep a question in the case while it has an answer and still decides a line, form or question, whether or not that line is open; hold C6.4 merges on the checklist until retested.

## Suggestions
* `lane.sh bind qa` in a cloud copy should stay on the session's branch (or at least build `web/dist` after the merge with main), so qa never walks an old build. *Needed for the proof · Scaffolding.*
* A test that restores a retired section and a retired document type through the second person. *Later · Capability.*
* `graph.mjs` should count `api/src/features/*.ts` as imported (registered at start). *Later · Scaffolding.*
* A Problem Details refusal for a body that is not JSON says "Unexpected token 'l', "list" is not valid JSON"; plain words would be better. *Later · Capability.*
