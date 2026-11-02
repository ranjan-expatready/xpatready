# qa, 2 Nov pm (2): P-250 verdicts while the queue moves

Main: 50df70dc. AI spend: US$0 (no key; the ledger was unchanged).

| PR | Head | Verdict | Evidence |
|---|---|---|---|
| #502 R-146 part 1 | 75a3f2aa (new head; only a test changed) | **Pass**, re-confirmed | `check_queue_tx.ts` 8/8: the six now replay ten saved field maps, and the slowed IMM 5707 fails alone while its nine siblings keep their proposals. `check_qa_p227_r146_saved_maps.ts` 26/26 |
| #501 D4 | bae48489 (new head; wording only) | **Pass**, re-confirmed | `check_case_engine.ts` 69/69 |
| #504 SH2 | 74bbb717 | **Major QA-161** (P-258), not a regression | 12 caller suites green (`check_sh2_where_used` 24/24 … `check_forms_proposal_contract` 22/22). Main-against-head equivalence: 597 and 385 item uses identical on the fixture and the configured sample; the only difference is the intended retired-line fix in impact. The document type's alternative and fact-source uses are still worked out in `library-items.ts`, not in the service. Head runs and probe by a qa subagent; I checked the finding in the code myself |

Minors on #504 (follow-ups): `proposals.ts:117` workaround; rules and checks `used_in` still inside `library-sources.ts`; `impact.ts` `.catch(() => 0)` turns a database error into "0 open cases".
Not tested: OPEN-only case counts (no data in another status).
