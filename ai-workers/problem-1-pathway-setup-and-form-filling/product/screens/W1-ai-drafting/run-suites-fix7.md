# run-suites after the 7-suite FIX (forms lane, 30 Oct)

Code commit a264532b (the footer names c38cbb1a: a lane-file-only commit landed during the run; `git diff c38cbb1a a264532b -- prototype` is empty). 88 PASS, 0 FAIL, exit 0. No live switch, `P2_LEDGER_DIR` a scratch folder, US$0. Ports: run-suites' forms slot (+12000), never :4400. Another copy's run-suites ran on the same Mac part of the time.

| Suite | Result | Time | Last line |
|---|---|---|---|
| check_ai_drafting.ts | PASS | 1 s | 48 passed, 0 failed |
| check_ai_launch_paths.ts | PASS | 49 s | 44/44 passed |
| check_ai_live_switch.ts | PASS | 265 s | 9 passed, 0 failed |
| check_ai_orchestration.ts | PASS | 77 s | 22/22 passed |
| check_cost_check.ts | PASS | 1 s | 39/39 passed |
| check_cost_override.ts | PASS | 24 s | 33 passed, 0 failed |
| check_engine.ts | PASS | 1 s | 38/38 passed |
| check_forms_ai_errors.ts | PASS | 1 s | 24 passed, 0 failed |
| check_forms_channels_migration.ts | PASS | 5 s | 18/18 passed |
| check_forms_channels.ts | PASS | 39 s | 106/106 passed |
| check_forms_demo.ts | PASS | 86 s | 23/23 passed |
| check_forms_f1p.ts | PASS | 23 s | 16 passed, 0 failed |
| check_forms_f3a0.ts | PASS | 1 s | 7/7 passed |
| check_forms_f3a1c.ts | PASS | 28 s | 33/33 passed |
| check_forms_p80_guard.ts | PASS | 39 s | 41 passed, 0 failed |
| check_forms_pdf_hardening.ts | PASS | 37 s | 49 passed, 0 failed |
| check_forms_proposal_contract.ts | PASS | 1 s | 22 passed, 0 failed |
| check_forms_qa53.ts | PASS | 15 s | 20 passed, 0 failed |
| check_forms_rounds.ts | PASS | 2 s | 70 passed, 0 failed |
| check_forms_s4_canada.ts | PASS | 0 s | 80 passed, 0 failed |
| check_forms_s4_finder.ts | PASS | 36 s | 144 passed, 0 failed |
| check_forms_s4_runs.ts | PASS | 29 s | 91 passed, 0 failed |
| check_forms_schema_lint.ts | PASS | 1 s | 24 passed, 0 failed |
| check_forms_slice2.ts | PASS | 65 s | 41/41 passed |
| check_forms_slice2b.ts | PASS | 35 s | 36/36 passed |
| check_forms_w102_fix.ts | PASS | 36 s | 23/23 passed |
| check_grounding_db.ts | PASS | 22 s | 31/31 passed |
| check_p154_words.ts | PASS | 1 s | 4 checks passed |
| check_pqr.ts | PASS | 27 s | 38 passed, 0 failed |
| check_preview_sets.ts | PASS | 23 s | 27 passed, 0 failed |
| check_qa99_who_can_be_trail.ts | PASS | 18 s | 3 passed, 0 failed |
| check_s5_leadcheck.ts | PASS | 24 s | 49 passed, 0 failed |
| check_s5_people_ai.ts | PASS | 24 s | 15/15 passed |
| check_s5_slice1.ts | PASS | 21 s | 55/55 passed |
| check_s5_slice2.ts | PASS | 20 s | 31/31 passed |
| check_s5_slice3.ts | PASS | 19 s | 23/23 passed |
| check_s6_field_drafts.ts | PASS | 5 s | 26 checks passed |
| check_screen01_api.ts | PASS | 43 s | 135 passed, 0 failed |
| check_screen01_channels.ts | PASS | 11 s | 16 passed, 0 failed |
| check_screen01_release_race.ts | PASS | 25 s | 1 checks passed |
| check_screen01_rules.ts | PASS | 1 s | 67 passed, 0 failed |
| check_screen02_fix.ts | PASS | 20 s | 61/61 passed |
| check_screen02_slice2.ts | PASS | 22 s | 52 passed, 0 failed |
| check_stand_ins.ts | PASS | 0 s | 9 checks passed |
| check_w1_level_tokens.ts | PASS | 1 s | 31 passed, 0 failed |
| check_w1_start_setup.ts | PASS | 7 s | 26/26 passed |
| check_w1_structure_path.ts | PASS | 19 s | 28/28 passed |
| check_w1_structure_r3.ts | PASS | 26 s | 41/41 passed |
| check_w1_structure.ts | PASS | 21 s | 81/81 passed |
| check_w115_slice1.ts | PASS | 28 s | 47 passed, 0 failed |
| check_w115_slice2.ts | PASS | 24 s | 35 passed, 0 failed |
| check_w115_slice3.ts | PASS | 18 s | 34 passed, 0 failed |
| check_who_can_be_qa.ts | PASS | 2 s | 9 passed, 0 failed |
| check_who_fills.ts | PASS | 13 s | 26 passed, 0 failed |
| check_cost_warning_browser.cjs | PASS | 33 s | 10 passed, 0 failed |
| check_dv_backbone_browser.cjs | PASS | 24 s | 8 passed, 0 failed |
| check_forms_channels_browser.cjs | PASS | 33 s | 26 passed, 0 failed |
| check_forms_s4_library_browser.cjs | PASS | 65 s | 69 passed, 0 failed |
| check_forms_s4_run_browser.cjs | PASS | 35 s | 22 passed, 0 failed |
| check_pqr_browser.cjs | PASS | 34 s | 20 passed, 0 failed |
| check_preview_sets_browser.cjs | PASS | 36 s | 24 passed, 0 failed |
| check_qa92_95_browser.cjs | PASS | 41 s | 23 passed, 0 failed |
| check_s5_leadcheck_browser.cjs | PASS | 39 s | 21 passed, 0 failed |
| check_s5_live_approval_browser.cjs | PASS | 28 s | 5 passed, 0 failed |
| check_s5_slice1_browser.cjs | PASS | 70 s | 52/52 passed |
| check_s5_slice2_browser.cjs | PASS | 107 s | 61/61 passed |
| check_s5_slice3_browser.cjs | PASS | 59 s | 35/35 passed |
| check_screen01_browser.cjs | PASS | 136 s | 120 passed, 0 failed · {"cold_first_view_ms":1372,"first_view_ms":170,"filter_ms":54} |
| check_screen01_smallfix.cjs | PASS | 42 s | all passed |
| check_screen02_slice1.cjs | PASS | 49 s | all passed |
| check_screen02_slice2_browser.cjs | PASS | 80 s | all passed |
| check_screens_qa_1029_browser.cjs | PASS | 47 s | 51 checks passed |
| check_studio_browser.cjs | skipped | | resets the :4400 demo: --demo (CI, cloud) |
| check_w1_programs_r3.cjs | PASS | 30 s | 26 passed, 0 failed |
| check_w1_programs_s2.cjs | PASS | 78 s | 87 passed, 0 failed |
| check_w1_qa51_52_54.cjs | PASS | 26 s | 21/21 passed |
| check_w1_s1s2_fix.cjs | PASS | 37 s | 30 passed, 0 failed |
| check_w1_start_setup_browser.cjs | PASS | 49 s | 43 passed, 0 failed |
| check_w1_structure_browser.cjs | PASS | 91 s | 135 passed, 0 failed |
| check_w1_visual_system.cjs | PASS | 35 s | 24 passed, 0 failed |
| check_w115_slice2_browser.cjs | PASS | 58 s | 56 passed, 0 failed |
| check_w115_slice3_browser.cjs | PASS | 91 s | 35 passed, 0 failed |
| check_who_fills_browser.cjs | PASS | 33 s | 19 passed, 0 failed |
| check_case_engine.ts | PASS | 1 s | 50/50 passed |
| check_runtime_r1c.cjs | PASS | 99 s | 121/121 passed |
| check_runtime_r1d.ts | PASS | 34 s | 72/72 passed |
| check_runtime_r1a.ts | PASS | 17 s | 99/99 passed |
| check_p2_guard.ts | PASS | 2 s | 80/80 passed |
| check_p2_launch.ts | PASS | 40 s | 58/58 passed  (copy: /private/var/folders/s0/f3fj82112j7bt9ldrlr9h57m0000gn/T/p2-launch-pN |
commit c38cbb1a · logs in ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/var/suites · copies named forms_*, ports +12000
