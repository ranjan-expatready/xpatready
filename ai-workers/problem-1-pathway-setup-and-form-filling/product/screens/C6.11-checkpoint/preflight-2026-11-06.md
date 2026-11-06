# C6.11 (#1072): builder's pre-flight, 6 Nov 2026

Run: `bash product/tools/run-suites.sh --changed origin/main..HEAD --direct`, browser suites left out (row A2: non-browser suites). Selection: `select-suites.mjs --direct` on this PR's files. US$0, live AI off.

## At 507bdb69 (code = 59d23a5a + main's push-guard fix #1174): 87 PASS, 0 FAIL, exit 0
One suite quarantined by run-suites' own list (check_screen01_api.ts, nightly only, P-205).

## Earlier, at 03f86fe2: 79 PASS, 2 FAIL
* check_c10_1_configured.ts 46/48: C10.1 row 12 regression from this PR, fixed at 59d23a5a (api/src/sample-case.ts), 48/48 after; main 48/48.
* check_runtime_r1c.cjs (browser, R1 group): timing budget under load; 132/132 on re-run.

## Table at 507bdb69
| check_ai_drafting.ts | PASS | 1 s | 48 passed, 0 failed |
| check_ai_launch_paths.ts | PASS | 49 s | 44/44 passed |
| check_b1_release_unmapped.ts | PASS | 50 s | 14/14 passed |
| check_b52_own_yes_no.ts | PASS | 116 s | 67 passed, 0 failed |
| check_c10_1_configured.ts | PASS | 116 s | 48 passed, 0 failed |
| check_c1112_prepare_api.ts | PASS | 30 s | 30/30 passed |
| check_c116_channels_browser.ts | PASS | 68 s | 54/54 passed |
| check_c116_item_channel_forms.ts | PASS | 32 s | 16/16 passed |
| check_c117_intake_edition.ts | PASS | 27 s | 20/20 passed |
| check_c38_background_forms_api.ts | PASS | 38 s | 36/36 passed |
| check_c44_part2.ts | PASS | 23 s | 31/31 passed |
| check_c44_question_types.ts | PASS | 23 s | 44/44 passed |
| check_c46_preview_channels.ts | PASS | 11 s | 31/31 passed |
| check_c64_storage_api.ts | PASS | 30 s | 48/48 passed |
| check_c69_runs.ts | PASS | 33 s | 98/98 passed |
| check_c72_imm5257_fill.ts | PASS | 42 s | 54/54 passed |
| check_c75_findings_api.ts | PASS | 45 s | 55/55 passed |
| check_c76_readiness_api.ts | PASS | 44 s | 23/23 passed |
| check_c81_signing_api.ts | PASS | 40 s | 13/13 passed |
| check_c82_filing_record_api.ts | PASS | 29 s | 24/24 passed |
| check_c82_record_api.ts | PASS | 122 s | 56/56 passed |
| check_c91_impact_ai.ts | PASS | 2 s | 29/29 passed |
| check_c92_undo_api.ts | PASS | 45 s | 27/27 passed |
| check_case_feed.ts | PASS | 1 s | 25/25 passed |
| check_cost_check.ts | PASS | 19 s | 109/109 passed |
| check_d1_reset_to_six.ts | PASS | 115 s | 25 passed, 0 failed |
| check_edition_in_use.ts | PASS | 2 s | 20/20 passed |
| check_engine.ts | PASS | 1 s | 44/44 passed |
| check_forms_b114_condition_other_combination.ts | PASS | 133 s | 64/64 passed |
| check_forms_b116_own_unmapped.ts | PASS | 112 s | 18/18 passed |
| check_forms_b82_case_lines.ts | PASS | 53 s | 40/40 passed |
| check_forms_b86_door.ts | PASS | 49 s | 45/45 passed |
| check_forms_b88_spread.ts | PASS | 85 s | 36/36 passed |
| check_forms_c1113_acceptance.ts | PASS | 27 s | 41/41 passed |
| check_forms_c1115_redo.ts | PASS | 11 s | 23/23 passed |
| check_forms_c117_part_b.ts | PASS | 46 s | 20/20 passed |
| check_forms_c34_ai.ts | PASS | 40 s | 87/87 passed |
| check_forms_c34_ai_live.ts | PASS | 24 s | 8/8 passed |
| check_forms_c34_masters.ts | PASS | 24 s | 29/29 passed |
| check_forms_c36_acceptance.ts | PASS | 8 s | 17/17 passed |
| check_forms_c36_requirement_type.ts | PASS | 26 s | 34 passed, 0 failed |
| check_forms_c47_v2_jobs.ts | PASS | 24 s | 14/14 passed |
| check_forms_channels.ts | PASS | 21 s | 107/107 passed |
| check_forms_d2_live_fails_offer_saved.ts | PASS | 13 s | 7 passed, 0 failed |
| check_forms_demo.ts | PASS | 44 s | 23/23 passed |
| check_forms_pa_track_a_jobs.ts | PASS | 27 s | 28/28 passed |
| check_forms_qa206_section_headings.ts | PASS | 26 s | 47/47 passed |
| check_forms_qa53.ts | PASS | 11 s | 20 passed, 0 failed |
| check_forms_rounds.ts | PASS | 1 s | 78 passed, 0 failed |
| check_forms_s4_finder.ts | PASS | 20 s | 145 passed, 0 failed |
| check_forms_schema_lint.ts | PASS | 1 s | 24 passed, 0 failed |
| check_forms_w102_fix.ts | PASS | 16 s | 23/23 passed |
| check_g1_source_register.ts | PASS | 1 s | 53/53 passed |
| check_g2_answer_key_gate_firm.ts | PASS | 46 s | 27/27 passed |
| check_g4_tests_tab_browser.ts | PASS | 135 s | 54/54 passed |
| check_gcore_b4_field_map_check.ts | PASS | 10 s | PASS  C11.14 AT-3 pass: High (Ready) only when both rounds agree and the rules ran and pas |
| check_gcore_check_api.ts | PASS | 10 s | 35/35 passed |
| check_irm_editions.ts | PASS | 1 s | 11/11 passed |
| check_open_cases_at_once.ts | PASS | 49 s | 11/11 passed |
| check_qa144_ee_release.ts | PASS | 113 s | 26/26 passed |
| check_qa144_fs_release.ts | PASS | 114 s | 28/28 passed |
| check_qa144_lmia_release.ts | PASS | 110 s | 23/23 passed |
| check_qa144_place_step.ts | PASS | 109 s | 23/23 passed |
| check_qa144_sp_release.ts | PASS | 112 s | 27/27 passed |
| check_qa144_vv_release.ts | PASS | 109 s | 35/35 passed |
| check_qa145_clean_clone.ts | PASS | 143 s | 8/8 passed |
| check_qa163_listed_form_saved.ts | PASS | 28 s | 12/12 passed |
| check_qa182_no_box_words.ts | PASS | 0 s | 8/8 passed |
| check_qa196_check_landers.ts | PASS | 30 s | 24/24 passed |
| check_s4_startable.ts | PASS | 29 s | 10/10 passed |
| check_s5_slice1.ts | PASS | 16 s | 57/57 passed |
| check_s6_field_drafts.ts | PASS | 4 s | 26 checks passed |
| check_s6_p149.ts | PASS | 15 s | 89 checks passed |
| check_screen01_api.ts | quarantined | | fails at random: nightly only until its fix merges (P-205) |
| check_stand_ins.ts | PASS | 0 s | 9 checks passed |
| check_v3b1_openable.ts | PASS | 42 s | 25/25 passed |
| check_vv_checklist_api.ts | PASS | 26 s | 29/29 passed |
| check_vv_prepare.ts | PASS | 1 s | 32/32 passed |
| check_vv_prepare_api.ts | PASS | 116 s | 40/40 passed |
| check_vv_prepare_store.ts | PASS | 1 s | 27/27 passed |
| check_vv_prepare_store_api.ts | PASS | 43 s | 35/35 passed |
| check_w1_start_setup.ts | PASS | 4 s | 26/26 passed |
| check_w1_structure.ts | PASS | 13 s | 81/81 passed |
| check_who_can_be_qa.ts | PASS | 1 s | 9 passed, 0 failed |
| check_case_engine.ts | PASS | 1 s | 76/76 passed |
| check_runtime_r1c.cjs | PASS | 137 s | 132/132 passed |
| check_runtime_r1d.ts | PASS | 33 s | 96/96 passed |
| check_runtime_r1a.ts | PASS | 19 s | 99/99 passed |
