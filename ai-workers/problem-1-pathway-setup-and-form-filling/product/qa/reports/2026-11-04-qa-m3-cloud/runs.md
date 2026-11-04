# Round 0 runs: main 9caa043b, cloud machine, 4 Nov 2026

The GitHub re-test (`nightly.yml` dispatch) is refused from this cloud session: `403 Resource not accessible by integration`. The same runner, `studio/tools/gate-b.mjs`, was run here instead:
`KIND=code GATE_B_JOBS=3 GATE_B_PORT=4480 GATE_B_NAME=qam3r1_ node tools/gate-b.mjs --title "C6.12 C6.4 C7.6 C7.7 C7.3" --kind code`. Each pack ran on its own fresh isolated copy (database dropped after the run). Live AI was off; cost US$0.

Every pack is **fixture only**: its run line has setup steps (`setup_visitor_visa.ts`, then `setup_vv_m3.ts`). On the checkpoint, every pack waits for QA-144 (#798 is open).

## Packs (exit · passed)
| Pack | Setup `setup_visitor_visa` · `setup_vv_m3` | Result |
|---|---|---|
| C6.12.test.ts | 0 · 1 (44/46) | 0 · 24/24 |
| C6.12-breadth.test.ts | 0 · 1 (44/46) | 1 · 1/4 (FAIL 22 sponsorship, 23 child study question, 25 the case page) |
| C6.4.test.ts | 0 · 1 (44/46) | 0 · 30/30 |
| C7.6.test.ts | 0 · 1 (44/46) | 1 · 4/23 (first FAILs: C7.6-2, -3 `POST /runtime/filings/:id/ready` 404, -4, -6, -7) |
| C7.7.test.ts | 0 · 1 (44/46) | 0 · 26/26 |
| C7.3.test.ts | 0 · 1 (44/46) | 0 · 13/13 |

`setup_vv_m3` is 44/46, as in earlier qa runs. The two red steps are the S2w signer warning and S7a `PUT /library/fees`, which is not built.

## Engine checks (no server), run twice, same result both times
| Check | Exit · passed |
|---|---|
| tests/check_c76_readiness.ts | 0 · 64/64 |
| tests/check_vv_answer_sheet.ts | 0 · 13/13 |
| tests/check_vv_checklist.ts | 0 · 62/62 |
| tests/check_r2_fee_table.ts | 0 · 81/81 |
| tests/check_vv_prepare.ts | 0 · 32/32 |

## Run 2 (gate B again, fresh copies `qam3r2_*`): same result, step for step
C6.12 0 · 24/24 · C6.12-breadth 1 · 1/4 (the same three FAILs) · C6.4 0 · 30/30 · C7.6 1 · 4/23 (the same FAILs) · C7.7 0 · 26/26 · C7.3 0 · 13/13. Setup was the same: `setup_visitor_visa` 0, `setup_vv_m3` 1 (44/46). No flaky step.

## Walk copy (`isolated.sh qam3w 4470 start`, fixture setup as above): runs 3 for the server checks and qa probes
| Check | Exit · passed | Note |
|---|---|---|
| acceptance/C7.6.test.ts (full output read) | 1 · 4/23 | `GET /prepare` readiness says `"built": false, "why": "Ready to file is worked out by C7.6 (not built yet)."`; `POST /runtime/filings/:id/ready` and `/review` answer 404 |
| tests/check_vv_prepare_api.ts | 0 · 38/38 | |
| tests/check_c64_storage_api.ts | 0 · 48/48 | |
| tests/qa/check_qa_r3_minor_principal.ts | 0 · 4/4 | |
| tests/qa/check_qa_vv_1102_decider.ts | 0 · 6/6 | **QA-149 passes**: the answered "travelling alone" question stays in both views and can be changed to "both parents" |
| tests/qa/check_qa_vv_1102_c73.ts | 1 · 6/7 | **QA-153 still fails**: after everything is answered and confirmed, IMM 5707's sheet waits for the parent facts |
| tests/qa/check_qa_vv_1102_c64_storage.ts | 1 · 5/6 | QA-155 (Minor) still fails: 404 "No such checklist line." on a waiting line |
| tests/qa/check_qa_vv_1102_probe.ts | 1 · 11/12 | QA-151 (Minor) still fails: a body that is not JSON gets the parser's own words |

## The person walk at 1440 px (case officer, Playwright, `walk-open-cases.mts` + `walk-1440.cjs`)
Two cases were opened on the fixture: a family of four left blank, and one principal with every question answered and confirmed (`fillEverything`). Screenshots are in `screenshots/` (1 is the case list, 2 is each case in full, 3 is the solo case's Prepare application).
* The case page shows "Prepare application", one row per form and person. Each row has a pill (Validate before filing, Ready to file, Copy or Checked copy not for filing), "Generate a copy", and the count of confirmed fields. There is no browser error.
* **Not on the page:** the filings and their submission group, the fees (the API gives Visitor visa CAD 100 and biometrics CAD 85 with IRCC's source), the document checklist, the answer sheet, the "Download PDF copy" action, the filing's Ready to file with blocks and warnings, and the warning pass with a reason.
* Solo case, everything answered and confirmed: IMM 5257 shows "Validate before filing" with "Marked mandatory on IRCC's form, still empty (14)". This is the RCIC walk's 13–14 count (#782) and QA-165's open half. IMM 5476 shows "Checked copy, not for filing" and "Ready to file" side by side, with no word about its hand signature. IMM 5707 shows "Copy, not for filing" and "Ready to file" with 7 of 40 fields, while its answer sheet still waits for the parent facts (QA-153).
* The IMM 5707 Online line says "a PDF copy, not for filing, is listed with the forms below", but that copy is the row **above** it.
## Smoke re-run on main d4146dbd (4 Nov ~08:10 UTC; after #848, #714, #833 (P-319 family-form role migration), #802, #851, #853, #850, #859)
Gate B twice on fresh copies (qam3d4r1_, qam3d4r2_), same result both times and the same as on 9caa043b:
C6.12 0 · 24/24 · C6.12-breadth 1 · 1/4 · C6.4 0 · 30/30 · C7.6 1 · 4/23 · C7.7 0 · 26/26 · C7.3 0 · 13/13; setup_vv_m3 1 · 44/46.
No M3 verdict changes. (The container restarted between rounds: the database was started again with cloud-setup.sh.)
