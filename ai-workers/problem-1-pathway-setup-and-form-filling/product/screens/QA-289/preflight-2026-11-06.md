# QA-289 (row A7): builder's pre-flight, 6 Nov 2026

Run: `bash product/tools/run-suites.sh --changed origin/claude/busy-rubin-1sjrry..HEAD --direct` (A7's own changes on top of #1072's head), browser suites left out. US$0, live AI off.

## At 7b8a3241 (code 4eb31238): 57 PASS, 0 FAIL, exit 0
One suite quarantined by run-suites' own list.

## Earlier, at 40040b03: 56 PASS, 1 FAIL
* check_c44_question_types.ts, "C4.4 tier 1 (phone)": round 2's phone rule dropped a bare "phone_part" map. Fixed at 4eb31238 (the rule only adds the phone kind); 44/44 after.

## Table at 7b8a3241
| check_b1_release_unmapped.ts | PASS | 61 s | 14/14 passed |
| check_b52_own_yes_no.ts | PASS | 114 s | 67 passed, 0 failed |
| check_c10_1_configured.ts | PASS | 109 s | 48 passed, 0 failed |
| check_c1112_prepare_api.ts | PASS | 30 s | 30/30 passed |
| check_c116_channels_browser.ts | PASS | 64 s | 54/54 passed |
| check_c116_item_channel_forms.ts | PASS | 32 s | 16/16 passed |
| check_c18_age_case.ts | PASS | 9 s | 12/12 passed |
| check_c44_part2.ts | PASS | 22 s | 31/31 passed |
| check_c44_question_types.ts | PASS | 22 s | 44/44 passed |
| check_c46_preview_channels.ts | PASS | 11 s | 31/31 passed |
| check_c64_storage_api.ts | PASS | 28 s | 48/48 passed |
| check_c69_runs.ts | PASS | 32 s | 98/98 passed |
| check_c72_imm5257_fill.ts | PASS | 40 s | 54/54 passed |
| check_c75_findings_api.ts | PASS | 43 s | 55/55 passed |
| check_c76_readiness_api.ts | PASS | 41 s | 23/23 passed |
| check_c76_ready_browser.ts | PASS | 195 s | 53/53 passed |
| check_c81_signing_api.ts | PASS | 38 s | 13/13 passed |
| check_c82_filing_record_api.ts | PASS | 28 s | 24/24 passed |
| check_c82_record_api.ts | PASS | 107 s | 56/56 passed |
| check_c92_undo_api.ts | PASS | 42 s | 27/27 passed |
| check_edition_in_use.ts | PASS | 3 s | 20/20 passed |
| check_engine.ts | PASS | 0 s | 44/44 passed |
| check_forms_b116_own_unmapped.ts | PASS | 99 s | 18/18 passed |
| check_forms_b81_not_on_form.ts | PASS | 0 s | 41 passed, 0 failed |
| check_forms_b82_case_lines.ts | PASS | 47 s | 40/40 passed |
| check_forms_b86_fill.ts | PASS | 0 s | 35/35 passed |
| check_forms_b88_fill.ts | PASS | 1 s | 34/34 passed |
| check_forms_c31_acceptance.ts | PASS | 15 s | 17 passed, 0 failed |
| check_forms_c31_formats.ts | PASS | 15 s | 107 passed, 0 failed (C3.1 field formats; US$0) |
| check_forms_d2_live_fails_offer_saved.ts | PASS | 13 s | 7 passed, 0 failed |
| check_forms_demo.ts | PASS | 40 s | 23/23 passed |
| check_forms_qa53.ts | PASS | 10 s | 22 passed, 0 failed |
| check_forms_w102_fix.ts | PASS | 14 s | 23/23 passed |
| check_g2_answer_key_gate_firm.ts | PASS | 40 s | 27/27 passed |
| check_g4_tests_tab_browser.ts | PASS | 123 s | 54/54 passed |
| check_gcore_check_api.ts | PASS | 9 s | 35/35 passed |
| check_line_holders.ts | PASS | 1 s | 19/19 passed |
| check_open_cases_at_once.ts | PASS | 44 s | 11/11 passed |
| check_preview_sets.ts | PASS | 11 s | 29 passed, 0 failed |
| check_qa144_ee_release.ts | PASS | 99 s | 26/26 passed |
| check_qa144_sp_release.ts | PASS | 95 s | 27/27 passed |
| check_r2_fee_table.ts | PASS | 0 s | 81/81 passed |
| check_s4_startable.ts | PASS | 24 s | 10/10 passed |
| check_s5_slice1.ts | PASS | 13 s | 57/57 passed |
| check_screen01_api.ts | quarantined | | fails at random: nightly only until its fix merges (P-205) |
| check_v3b1_openable.ts | PASS | 35 s | 25/25 passed |
| check_vv_checklist.ts | PASS | 0 s | 62/62 passed |
| check_vv_checklist_api.ts | PASS | 22 s | 29/29 passed |
| check_vv_prepare.ts | PASS | 0 s | 32/32 passed |
| check_vv_prepare_api.ts | PASS | 95 s | 40/40 passed |
| check_vv_prepare_store.ts | PASS | 0 s | 27/27 passed |
| check_vv_prepare_store_api.ts | PASS | 37 s | 35/35 passed |
| check_w1_start_setup.ts | PASS | 4 s | 26/26 passed |
| check_w1_structure.ts | PASS | 11 s | 81/81 passed |
| check_case_engine.ts | PASS | 1 s | 76/76 passed |
| check_runtime_r1c.cjs | PASS | 129 s | 132/132 passed |
| check_runtime_r1d.ts | PASS | 28 s | 96/96 passed |
| check_runtime_r1a.ts | PASS | 15 s | 99/99 passed |
