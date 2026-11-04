# qa after-merge — 4 Nov (IST), batch by batch

**Brief:** Lead 2, 4 Nov: re-score after each merge batch on a fresh isolated copy of origin/main, on the demo data (Demo › Reset to the six) as well as the fixture (P-304 (2)); an open Major or Critical keeps a row Partial (P-305 (3)). The tester built none of these PRs.

**How, every batch:** fresh isolated copies (`studio/tools/isolated.sh qa_<name> 4490–4499 start`, web rebuilt by the start script, QA-181), live AI off (no `STUDIO_*_LIVE` set), US$0, no priced button clicked. Judged by exit codes. Person walks at 1440 px (Playwright, own copies). The shared demo (:4400) was not touched. Suites for the smoke of every Works row: read from the merge-queue CI run whose tree equals main's (P-85). Scoring judgments: Opus (P-303).

## Batch 1 — #791 (C6.12 step 24), #792 (P-214 test fix) · main eaa7d6f4f (tree cd3c8cb147) · tested ~07:40–08:00 IST

| Row | Verdict | Why |
|---|---|---|
| C6.12 Filings and fees (M3) | **Partial** (unchanged; one more part met) | Step 24 passes: study permit CAD 150, work permit CAD 155, open work permit holder CAD 100, visitor extension CAD 100, per person, no family maximum. Sponsorship (22), the child study question (23) and the case page (25) are still red |
| #792 (test only, no capability) | **Pass** | `check_r146_whole_form_output.ts` reads committed whole-form jobs only; green twice locally and in shard 2 of the merge queue |

**M2: 43/60 confirmed** (unchanged: nothing in this batch is an M2 row). M3: 2/17.

### Runs (exit code · tests passed)

| Check | Copy | Result |
|---|---|---|
| `tests/runtime/setup_visitor_visa.ts` | qa_c612a :4490 | 0 · 13/13 |
| `acceptance/lib/setup_vv_m3.ts` | qa_c612a | 1 · 44/46 (S2w signer warning; S7a `PUT /library/fees` not built: neither from #791, both as the builder reported) |
| `acceptance/C6.12.test.ts` | qa_c612a | 0 · 24/24 |
| `acceptance/C6.12-breadth.test.ts` | qa_c612a | 1 · 1/4 (C6.12-24 PASS; 22, 23, 25 FAIL) |
| `tests/check_r2_fee_table.ts` (no server) | — | 0 · 81/81 |
| `tests/check_r146_whole_form_output.ts` (no server), twice | — | 0 · 7/7, 0 · 7/7 |
| Merge-queue CI run 41753239903 (tree cd3c8cb147 = main) | CI | kind, types, shards 1–4: all success |

**Fees against the source:** qa re-read IRCC's fee list (ircc.canada.ca/english/information/fees/fees.asp, "Date modified: 2026-09-21", read 4 Nov 2026). All four rows and amounts match the fee table word for word. The CAD 465 work permit group maximum is for "3 or more performing artists" only, as the PR says; it is not modelled. All amounts stay Sample until the immigration expert confirms (P-171).

**Demo data (P-304 (2)):** on qa_six :4491, Demo › Reset to the six at 1440 px, as a person: type RESET, confirm. Result: 6 combinations, 44 official files, 569 AI proposals waiting, 2 forms waiting for Draft with AI, 1 "Not found · Upload PDF" (EMP5626, filled online in LMIA Online), "no live AI call (US$0)". Nothing is released, and the fee table lists only `vv.single`, so #791 changes nothing a person sees on the six. Screenshot `2026-11-04-after-merge/reset-six-done-1440.png`.

### Bugs

* **New QA-204** (UX · Minor, C11.7): the Reset to the six dialog says "about half a minute"; it took 177.1 s by its own count, with the dialog locked.
* Open Criticals unchanged: QA-180, QA-199, QA-200.

### Not tested in this batch
* The 400 and 1024 px replays: nothing visible changed in this batch.
* The PR's open Minor m2 (the fee table's own read date) is a record point, not tested.

### Questions for the Lead
None.
