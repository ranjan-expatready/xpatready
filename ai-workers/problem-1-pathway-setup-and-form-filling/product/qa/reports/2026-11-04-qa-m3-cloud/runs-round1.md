# Round 0, run 1: main 9caa043b, cloud machine, 4 Nov 2026

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
