# qa lane checks (independent tester, P-68)

Written by the qa lane only; never app code. Each finding in `product/qa/BUGS.md` has a check here that **fails while the finding is open and passes when fixed** (closed findings' checks now pass: QA-1, 2, 5, 8, 13, 14, 16, 17). Ports 4470–4479, databases `xr_studio_qa_*`; never :4400, except the read-only QA-19 check (GET requests only). No model call.

| Check | Bug | Run (from `prototype/studio/`) |
|---|---|---|
| `check_qa1_release_bypass.ts` | QA-1 shared release skips submission and SME sign-off | `tsx tests/qa/check_qa1_release_bypass.ts 4472` (starts its own copy, ~2–4 min: sample load) |
| `check_qa2_ai_drafting.ts` | QA-2 AI drafting suite red | `tsx tests/qa/check_qa2_ai_drafting.ts` |
| `check_qa4_page_address.ts` | QA-4 downloads answer 404 in a lane copy (pages fixed on 65826022) | `zsh tools/isolated.sh qa_x 4470 start && tsx tests/qa/check_qa4_page_address.ts 4470 [xr_studio_qa_x]` (database: also tries a source download once a source exists) |
| `check_qa5_stored_times.ts` | QA-5 stored times 5 h 30 early | `tsx tests/qa/check_qa5_stored_times.ts 4470 xr_studio_qa_x` (after the line above) |
| `check_qa13_readd_form.ts` | QA-13 a removed form cannot be added again (409) | `tsx tests/qa/check_qa13_readd_form.ts 4473` (starts its own copy) |
| `check_qa14_name_race.ts` | QA-14 the same name created at once is stored twice | `zsh tools/isolated.sh qa_race 4479 start && tsx tests/qa/check_qa14_name_race.ts 4479 xr_studio_qa_race` |
| `check_qa_f1_probe.ts` | F1 slice 1 API probes (C2.5, C3.5, C3.8); QA-15 lower-case form code | `tsx tests/qa/check_qa_f1_probe.ts 4472` (starts its own copy) |
| `check_qa16_box_words.ts` | QA-16 "box" words on screens and in messages (P-63) | `tsx tests/qa/check_qa16_box_words.ts` (static, no server) |
| `check_qa19_demo_leftovers.ts` | QA-19 old stored step texts on the shared demo (read-only, GET only) | `tsx tests/qa/check_qa19_demo_leftovers.ts 4400` |
| `check_qa14_variants.ts` | QA-14 follow-up: spelling variants of one name sent at once (category, sub-category) | `zsh tools/isolated.sh qa_race 4479 start && tsx tests/qa/check_qa14_variants.ts 4479 xr_studio_qa_race` |
| `check_qa22_author_flash.cjs` | QA-22 the author is told they cannot author while the session loads | `zsh tools/isolated.sh qa_j5 4477 start && node tests/qa/check_qa22_author_flash.cjs http://localhost:4477` (empty copy) |
| `check_qa_r1a_probe.ts` | R1a runtime API probes (C6.1–C6.3, C6.6, C6.10); QA-23 (D1), QA-24 (D2), QA-25, QA-26, QA-28 | see its header (setup_visitor_visa.ts first) |
| `check_qa_s2_probe.ts` | forms slice 2 API probes (C3.1, C3.3, C3.9); QA-27, QA-29 (D3), QA-30–QA-33 | `tsx tests/qa/check_qa_s2_probe.ts 4472` (starts its own copy with `STUDIO_PART_PAUSE_MS=3000`; US$0) |
| `check_qa_s01_channels.cjs` | Screen 01 forms features C1.6, C1.7, C2.7, C2.10; QA-20 at 400 px | see its header; `QA_HEADED=1` shows the browser |
| QA-8, QA-21 | AI sandbox in lane copies; racy builder check | the builder suites themselves: `tests/check_ai_orchestration.ts`, `tests/check_screen01_browser.cjs` |
| `check_qa_m2_journeys.cjs` | M2 journeys J1–J8 (author, reviewer, approver; QA-1 in the browser, QA-6, QA-7, QA-10, QA-11) | see its header; `QA_HEADED=1` shows the browser |

Harness (scaffolding, never product):
* `page-proxy.mjs` — forwards to a copy and serves the page for page addresses while QA-4 is open, so browser checks can run in a lane copy.
* `coverage-preload.mjs` — lets a server started with `NODE_V8_COVERAGE` write coverage when stopped (c8 12.0.0, P-69).
