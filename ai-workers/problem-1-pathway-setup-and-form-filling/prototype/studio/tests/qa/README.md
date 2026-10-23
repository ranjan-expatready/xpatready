# qa lane checks (independent tester, P-68)

Written by the qa lane only; never app code. Each bug in `product/qa/BUGS.md` has a check here that **fails today and passes when fixed**. Ports 4470–4479, databases `xr_studio_qa_*`; never :4400. No model call.

| Check | Bug | Run (from `prototype/studio/`) |
|---|---|---|
| `check_qa1_release_bypass.ts` | QA-1 shared release skips submission and SME sign-off | `tsx tests/qa/check_qa1_release_bypass.ts 4472` (starts its own copy, ~2–4 min: sample load) |
| `check_qa2_ai_drafting.ts` | QA-2 AI drafting suite red | `tsx tests/qa/check_qa2_ai_drafting.ts` |
| `check_qa4_page_address.ts` | QA-4 page addresses and downloads answer 404 in a lane copy | `zsh tools/isolated.sh qa_x 4470 start && tsx tests/qa/check_qa4_page_address.ts 4470 [xr_studio_qa_x]` (database: also tries a source download once a source exists) |
| `check_qa5_stored_times.ts` | QA-5 stored times 5 h 30 early | `tsx tests/qa/check_qa5_stored_times.ts 4470 xr_studio_qa_x` (after the line above) |
| QA-8, QA-9 | AI sandbox in lane copies; stale builder checks | the builder suites themselves: `tests/check_ai_orchestration.ts`, `tests/check_studio_browser.cjs`, `tests/fixtures/scale_100.ts` + `tests/check_catalogue_scale.cjs` |
| `check_qa_m2_journeys.cjs` | M2 journeys J1–J8 (author, reviewer, approver; QA-1 in the browser, QA-6, QA-7, QA-10, QA-11) | see its header; `QA_HEADED=1` shows the browser |

Harness (scaffolding, never product):
* `page-proxy.mjs` — forwards to a copy and serves the page for page addresses while QA-4 is open, so browser checks can run in a lane copy.
* `coverage-preload.mjs` — lets a server started with `NODE_V8_COVERAGE` write coverage when stopped (c8 12.0.0, P-69).
