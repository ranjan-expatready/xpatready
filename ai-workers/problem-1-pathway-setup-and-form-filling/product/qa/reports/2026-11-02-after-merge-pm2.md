# qa, 2 Nov pm (2): P-250 verdicts while the queue moves

Main: 50df70dc. AI spend: US$0 (no key; the ledger was unchanged).

| PR | Head | Verdict | Evidence |
|---|---|---|---|
| #502 R-146 part 1 | 75a3f2aa (new head; only a test changed) | **Pass**, re-confirmed | `check_queue_tx.ts` 8/8: the six now replay ten saved field maps, and the slowed IMM 5707 fails alone while its nine siblings keep their proposals. `check_qa_p227_r146_saved_maps.ts` 26/26 |
| #501 D4 | bae48489 (new head; wording only) | **Pass**, re-confirmed | `check_case_engine.ts` 69/69 |
| #504 SH2 | 74bbb717 | **Major QA-161** (P-258), not a regression | 12 caller suites green (`check_sh2_where_used` 24/24 … `check_forms_proposal_contract` 22/22). Main-against-head equivalence: 597 and 385 item uses identical on the fixture and the configured sample; the only difference is the intended retired-line fix in impact. The document type's alternative and fact-source uses are still worked out in `library-items.ts`, not in the service. Head runs and probe by a qa subagent; I checked the finding in the code myself |

Minors on #504 (follow-ups): `proposals.ts:117` workaround; rules and checks `used_in` still inside `library-sources.ts`; `impact.ts` `.catch(() => 0)` turns a database error into "0 open cases".
Not tested: OPEN-only case counts (no data in another status).
| #509 SH3 | 0c800ed1 | **Pass**, Minor (no output test for `fact-sources.ts`) | `check_sh3_resolver.ts` 55/55. Callers' suites with no server green (`check_case_engine` 63/63, `check_vv_checklist` 60/60, `check_c1112_modes` 39/39, …). `check_vv_prepare_api` 35/35. `setup_vv_m3` 18/20, as on main (S2w, S7a). Nothing held under P-251 is built |
| #510 Track A jobs | f00cfcb4 | **Pass** | All four stub passes contract-valid at US$0. Inputs match the manifest. The run name and fields match the Saved reader. Worst US$2.66. Old and new contracts agree on all 260 saved runs. Every entry in this copy's local ledger is actual US$0 |
| #506 C4.7 | 3c377911 | **Pass**; row stays Partial (real picks wait for Track A) | Acceptance 15/15 + 2 WAIT. Picks check 51/58 (the 7 others need the live switch and are refused at the door). Walk 30/30: exactly Live and Saved, roles 403, To review at 400 px, axe 0. Question: any run file counts as Saved, not only qa-checked ones (P-227) |

| #512 C11.15 Minors | eff1b5a2 | **Pass** | K11 browser 22/22 (×2), k11 words 13/13, qa101_103 22/22, demo 23/23, s5 slice 2 63/63, s5 lead check 49/49, w1 start setup 43/43. Acceptance 33/37, the same 4 known gaps as main (AT-1, AT-12 ×2, AT-24). QA-78, 105, 107, 110 and 111 each fail on main and pass on the head. QA-98 passes its checks (to close) |
| #513 G4 part 1 | 43487860 | **Pass**, Minor (the "On the demo" note) | Migration additive (3 new tables). Upgrade tested on a database holding the six's data (668 rows unchanged); rollback tested. `check_g4_answer_keys` 76/76, c72 fill 38/38, forms slice2 41/41 and 2b 36/36, channels 105/105, r1d 86/86, qa122 7/7, D1 25/25 |

The tech lead ruled #504's Major (QA-161) a follow-up: SH2b, the next PR in the G-CORE lane.
