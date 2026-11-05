# Gate B on the fixture, context only (P-322: does not count), main ffcfb45c8

```
Gate B: the PR names C6.5, C6.11, C7.5, C9.2, C10.2, C11.6; claims Works for none (no bug check).
  packs: C6.5.test.ts, C6.11.test.ts, C7.5.test.ts, C9.2.test.ts, C10.2.test.ts, C11.6.test.ts
    setup studio/tests/runtime/setup_visitor_visa.ts: exit 0
    setup studio/acceptance/lib/setup_vv_m3.ts: exit 1 (44/46 passed)
    C6.5.test.ts fixture only (its run line has setup steps; Works needs qa's demo-data PASS, gate A): exit 0, 7/7 passed (29 s: copy 5, run 24)
    setup studio/tests/runtime/setup_visitor_visa.ts: exit 0
    C6.11.test.ts fixture only (its run line has setup steps; Works needs qa's demo-data PASS, gate A): exit 0, 22/22 passed (25 s: copy 5, run 20)
    setup studio/tests/runtime/setup_visitor_visa.ts: exit 0
    setup studio/acceptance/lib/setup_vv_m3.ts: exit 1 (44/46 passed)
    C7.5.test.ts fixture only (its run line has setup steps; Works needs qa's demo-data PASS, gate A): exit 1, 9/16 passed (42 s: copy 5, run 37)
    setup studio/tests/runtime/setup_visitor_visa.ts: exit 0
    setup studio/acceptance/lib/setup_vv_m3.ts: exit 1 (44/46 passed)
    C9.2.test.ts fixture only (its run line has setup steps; Works needs qa's demo-data PASS, gate A): exit 0, 11/11 passed (56 s: copy 5, run 51)
    setup studio/tests/runtime/setup_visitor_visa.ts: exit 0
    setup studio/acceptance/lib/setup_vv_m3.ts: exit 1 (44/46 passed)
    C10.2.test.ts fixture only (its run line has setup steps; Works needs qa's demo-data PASS, gate A): exit 1, 0/11 passed (29 s: copy 5, run 24)
    setup studio/tests/runtime/setup_visitor_visa.ts: exit 0
    setup studio/acceptance/lib/setup_vv_m3.ts: exit 1 (44/46 passed)
    C11.6.test.ts fixture only (its run line has setup steps; Works needs qa's demo-data PASS, gate A): exit 0, 14/14 passed (29 s: copy 5, run 24)
  packs took 214 s in all
Gate B refuses:
  * C7.5.test.ts fixture only (its run line has setup steps; Works needs qa's demo-data PASS, gate A): exit 1; first FAIL lines: FAIL  C7.5-5 pass (P-110): the run card shows the cost first: live estimate above US$0, replay US$0, and the SI-6 stand-in — {"type":"https://expatready.local/p | FAIL  C7.5-6 pass: the card says a live review is not allowed without the founder's Go | FAIL  C7.5-6b precondition (FQ-10): a saved AI review of IMM 5257 for these fixed values is recorded (the one live trial, about US$1, SI-6, with the founder's G | FAIL  C7.5-7 pass: the replayed review returns its saved findings, each marked Replayed, quoting its source and field, with High or Low agreement (P-121) — [] | FAIL  C7.5-8 pass: the saved run has a Low finding, and every Low finding carries both rounds' reasons
  * C10.2.test.ts fixture only (its run line has setup steps; Works needs qa's demo-data PASS, gate A): exit 1; first FAIL lines: FAIL  C10.2-1 fail: only the founder's configuration people load a checkpoint (403 for a case officer) — 404 | FAIL  C10.2-2 pass: loading the finished story is a job (202) — 404 | FAIL  C10.2-3 pass: the demo status says Finished story | FAIL  C10.2-4 pass: one Visitor visa family case of four people, and one thin case beside it — [] | FAIL  C10.2-5 pass (row 14): one filing per person, all Ready to file, one family group
```
