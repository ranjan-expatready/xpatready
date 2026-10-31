# Full run-suites on the code of c950b098 (forms FIX, P-179 + QA-90 review fixes; 30 Oct)

Run with `product/tools/run-suites.sh` from this copy at a2993a03 (c950b098 + notes only), US$0, no live switch, scratch `P2_LEDGER_DIR`. It waited behind a Mac pull request check first (P-183). While it ran, four other suite runs shared the Mac.

**Result: 81 PASS, 7 FAIL, 1 skipped (studio_browser resets the :4400 demo). Each of the 7 rerun alone on the same code: all pass (below). Overall 88/88 green.**

PR #103's six red suites are green here: w102_fix 23/23, s5_slice1 55/55, s5_slice2_browser 61/61, s5_slice3_browser 35/35, screen01_browser 120 passed, screen01_smallfix all passed (fixed on this line in 89994a4c and a264532b).

## Reruns alone (`one-suite.sh`: forms_ copy, ports +12000, own scratch ledger)
| Suite | Full run | Alone |
|---|---|---|
| check_dv_backbone_browser.cjs | FAIL: name: 'TimeoutError' | PASS: 8 passed, 0 failed |
| check_forms_channels_browser.cjs | FAIL: FAIL  the walk finished — apiRequestContext.fetch: Timeout 30000ms exceeded. | PASS: 26 passed, 0 failed |
| check_forms_p80_guard.ts | FAIL: FAIL  C2.3 guard fail: a folder that is not a Studio copy's approved-sources folder is nev | PASS: 41 passed, 0 failed |
| check_forms_pdf_hardening.ts | FAIL: FAIL  no crash (last step: C2.2: a password-protected PDF is held and says it is password- | PASS: 49 passed, 0 failed |
| check_forms_s4_library_browser.cjs | FAIL: FAIL  C11.11: Status = Retired lists the retired form, marked Retired | PASS: 69 passed, 0 failed |
| check_pqr_browser.cjs | FAIL: FAIL  C4.2 fail: another person's PQR does not show the principal's tick — 7 | PASS: 20 passed, 0 failed |
| check_s5_live_approval_browser.cjs | FAIL: name: 'TimeoutError' | PASS: 5 passed, 0 failed |

## The full run's table
| Suite | Result | Time | Last line |
|---|---|---|---|
| check_ai_drafting.ts | PASS | 1 s | 48 passed, 0 failed |
| check_ai_launch_paths.ts | PASS | 45 s | 44/44 passed |
| check_ai_live_switch.ts | PASS | 264 s | 9 passed, 0 failed |
| check_ai_orchestration.ts | PASS | 93 s | 22/22 passed |
| check_cost_check.ts | PASS | 16 s | 61/61 passed |
| check_cost_override.ts | PASS | 40 s | 50 passed, 0 failed |
| check_engine.ts | PASS | 1 s | 38/38 passed |
| check_forms_ai_errors.ts | PASS | 2 s | 24 passed, 0 failed |
| check_forms_channels_migration.ts | PASS | 8 s | 18/18 passed |
| check_forms_channels.ts | PASS | 101 s | 106/106 passed |
| check_forms_demo.ts | PASS | 228 s | 23/23 passed |
| check_forms_f1p.ts | PASS | 42 s | 16 passed, 0 failed |
| check_forms_f3a0.ts | PASS | 0 s | 7/7 passed |
| check_forms_f3a1c.ts | PASS | 48 s | 33/33 passed |
| check_forms_p80_guard.ts | FAIL | 83 s | FAIL  C2.3 guard fail: a folder that is not a Studio copy's approved-sources folder is nev |
| check_forms_pdf_hardening.ts | FAIL | 39 s | FAIL  no crash (last step: C2.2: a password-protected PDF is held and says it is password- |
| check_forms_proposal_contract.ts | PASS | 4 s | 22 passed, 0 failed |
| check_forms_qa53.ts | PASS | 66 s | 20 passed, 0 failed |
| check_forms_rounds.ts | PASS | 22 s | 70 passed, 0 failed |
| check_forms_s4_canada.ts | PASS | 8 s | 80 passed, 0 failed |
| check_forms_s4_finder.ts | PASS | 68 s | 144 passed, 0 failed |
| check_forms_s4_runs.ts | PASS | 81 s | 91 passed, 0 failed |
| check_forms_schema_lint.ts | PASS | 2 s | 24 passed, 0 failed |
| check_forms_slice2.ts | PASS | 100 s | 41/41 passed |
| check_forms_slice2b.ts | PASS | 32 s | 36/36 passed |
| check_forms_w102_fix.ts | PASS | 34 s | 23/23 passed |
| check_grounding_db.ts | PASS | 15 s | 31/31 passed |
| check_p154_words.ts | PASS | 2 s | 4 checks passed |
| check_pqr.ts | PASS | 24 s | 38 passed, 0 failed |
| check_preview_sets.ts | PASS | 30 s | 27 passed, 0 failed |
| check_qa99_who_can_be_trail.ts | PASS | 10 s | 3 passed, 0 failed |
| check_s5_leadcheck.ts | PASS | 18 s | 49 passed, 0 failed |
| check_s5_people_ai.ts | PASS | 10 s | 15/15 passed |
| check_s5_slice1.ts | PASS | 10 s | 55/55 passed |
| check_s5_slice2.ts | PASS | 9 s | 31/31 passed |
| check_s5_slice3.ts | PASS | 8 s | 23/23 passed |
| check_s6_field_drafts.ts | PASS | 3 s | 26 checks passed |
| check_screen01_api.ts | PASS | 22 s | 135 passed, 0 failed |
| check_screen01_channels.ts | PASS | 7 s | 16 passed, 0 failed |
| check_screen01_release_race.ts | PASS | 10 s | 1 checks passed |
| check_screen01_rules.ts | PASS | 0 s | 67 passed, 0 failed |
| check_screen02_fix.ts | PASS | 11 s | 61/61 passed |
| check_screen02_slice2.ts | PASS | 12 s | 52 passed, 0 failed |
| check_stand_ins.ts | PASS | 0 s | 9 checks passed |
| check_w1_level_tokens.ts | PASS | 0 s | 31 passed, 0 failed |
| check_w1_start_setup.ts | PASS | 7 s | 26/26 passed |
| check_w1_structure_path.ts | PASS | 12 s | 28/28 passed |
| check_w1_structure_r3.ts | PASS | 9 s | 41/41 passed |
| check_w1_structure.ts | PASS | 9 s | 81/81 passed |
| check_w115_slice1.ts | PASS | 9 s | 47 passed, 0 failed |
| check_w115_slice2.ts | PASS | 8 s | 35 passed, 0 failed |
| check_w115_slice3.ts | PASS | 9 s | 34 passed, 0 failed |
| check_who_can_be_qa.ts | PASS | 1 s | 9 passed, 0 failed |
| check_who_fills.ts | PASS | 14 s | 26 passed, 0 failed |
| check_cost_warning_browser.cjs | PASS | 54 s | 14 passed, 0 failed |
| check_dv_backbone_browser.cjs | FAIL | 40 s |   name: 'TimeoutError' |
| check_forms_channels_browser.cjs | FAIL | 52 s | FAIL  the walk finished — apiRequestContext.fetch: Timeout 30000ms exceeded. |
| check_forms_s4_library_browser.cjs | FAIL | 113 s | FAIL  C11.11: Status = Retired lists the retired form, marked Retired |
| check_forms_s4_run_browser.cjs | PASS | 79 s | 22 passed, 0 failed |
| check_pqr_browser.cjs | FAIL | 132 s | FAIL  C4.2 fail: another person's PQR does not show the principal's tick — 7 |
| check_preview_sets_browser.cjs | PASS | 127 s | 24 passed, 0 failed |
| check_qa92_95_browser.cjs | PASS | 74 s | 23 passed, 0 failed |
| check_s5_leadcheck_browser.cjs | PASS | 112 s | 21 passed, 0 failed |
| check_s5_live_approval_browser.cjs | FAIL | 46 s |   name: 'TimeoutError' |
| check_s5_slice1_browser.cjs | PASS | 350 s | 52/52 passed |
| check_s5_slice2_browser.cjs | PASS | 94 s | 61/61 passed |
| check_s5_slice3_browser.cjs | PASS | 43 s | 35/35 passed |
| check_screen01_browser.cjs | PASS | 99 s | 120 passed, 0 failed · {"cold_first_view_ms":422,"first_view_ms":263,"filter_ms":76} |
| check_screen01_smallfix.cjs | PASS | 36 s | all passed |
| check_screen02_slice1.cjs | PASS | 29 s | all passed |
| check_screen02_slice2_browser.cjs | PASS | 61 s | all passed |
| check_screens_qa_1029_browser.cjs | PASS | 31 s | 51 checks passed |
| check_studio_browser.cjs | skipped | | resets the :4400 demo: --demo (CI, cloud) |
| check_w1_programs_r3.cjs | PASS | 30 s | 26 passed, 0 failed |
| check_w1_programs_s2.cjs | PASS | 57 s | 87 passed, 0 failed |
| check_w1_qa51_52_54.cjs | PASS | 20 s | 21/21 passed |
| check_w1_s1s2_fix.cjs | PASS | 29 s | 30 passed, 0 failed |
| check_w1_start_setup_browser.cjs | PASS | 40 s | 43 passed, 0 failed |
| check_w1_structure_browser.cjs | PASS | 88 s | 135 passed, 0 failed |
| check_w1_visual_system.cjs | PASS | 33 s | 24 passed, 0 failed |
| check_w115_slice2_browser.cjs | PASS | 59 s | 56 passed, 0 failed |
| check_w115_slice3_browser.cjs | PASS | 92 s | 35 passed, 0 failed |
| check_who_fills_browser.cjs | PASS | 37 s | 19 passed, 0 failed |
| check_case_engine.ts | PASS | 1 s | 50/50 passed |
| check_runtime_r1c.cjs | PASS | 92 s | 121/121 passed |
| check_runtime_r1d.ts | PASS | 26 s | 72/72 passed |
| check_runtime_r1a.ts | PASS | 9 s | 99/99 passed |
| check_p2_guard.ts | PASS | 2 s | 80/80 passed |
| check_p2_launch.ts | PASS | 25 s | 60/60 passed  (copy: /private/var/folders/s0/f3fj82112j7bt9ldrlr9h57m0000gn/T/p2-launch-rS |
commit a2993a03 · logs in ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/var/suites · copies named forms_*, ports +12000
