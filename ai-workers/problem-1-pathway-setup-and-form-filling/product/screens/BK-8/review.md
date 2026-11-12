# BK-8 review: biometrics ages per pathway (PR #1535)

Reviewer, independent (did not build or break it), 11 Nov 2026. Commit reviewed: `009d0a6be515d050b484db29dc61bf6b584dd9b2` on `claude/wonderful-pasteur-eeh6k3`. This row changes the engine and the API (fees, money). It has no screen, so the screen-review skill applies only to correctness, Done-when, tests, rules and words. Journey score: `journey-test-reviewer-2026-11-11.md`, **8.5/10, pass**.

## Done when
| Condition | Result | Evidence |
|---|---|---|
| B164's case-prepare.ts:29 exception is gone and the allow-list shrinks | Met | The entry is removed (12 → 11). `check_b164_no_engine_keys.ts` 52 pass, 0 fail, exit 0, shrink-only check included. `"vv.single"` no longer appears in `api/src/case-prepare.ts` code. |
| A test proves a non-Visitor pathway's exemption comes from its own fee rows, with the Visitor visa unchanged | Met | `check_bk8_biometrics_ages.ts` 17/17, exit 0. One table holds the work permit's own line (18/60, Sample scaffolding, not shipped) next to the Visitor visa's 14/79. Steps and words follow each pathway's own line. |
| Packs green on the checkpoint; the suites the change selects stay green | Partly checked | My runs: `check_r2_fee_table` 87/87, `check_vv_prepare` 32/32, `runtime/check_vv_filings` 61/61, `runtime/check_added_filings` 56/56, and `check_vv_prepare_store_api` **35/35 against an isolated copy on :4436** (stopped after). I did not run the acceptance packs or `run-suites --changed`. The PR body says that result is "to follow", so CI is the gate. |
| Fee values cited from canada.ca or labelled Sample | Met | No amount or age changes. The biometrics line still cites "When to give biometrics: temporary residents" (canada.ca URL, IRCC's words, page date 2026-03-30). The test-only 18/60 line is labelled Sample and lives only in a cloned table. |
| prisma/schema.prisma untouched | Met | No prisma path is in `git diff origin/main...009d0a6be`. |

## Correctness
- **Design holds.** `stepRule(own!.combinationKey, "biometrics")` is read once (`case-prepare.ts:192`). It feeds both `wantedItems` and `biometricsWaits(bio)` (`:469`), so the ages that decide the step are always the ages in its words.
- **No regression from the new soundLine/rulesFrom checks on the shipped table.** I ran a scratch script comparing every combination at origin/main and at this commit:
  - `vv.single` and `fs.spouse` are still derived, with identical fee rules apart from the added `step`.
  - `sp.outside` and `wp.lmia_inside` are still not derived, as before.
  - No line is unsound. The only line with an exemption (`biometrics`) has a page, and its `step` is `biometrics`.
- **Every fee reader uses the shipped table.** `RULES`, `validate.ts:102`, `case-prepare.ts:692` and `source-register` all read `FEE_TABLE`. No release keeps a frozen fee-table copy that lacks `step`, so no stored case loses its step.
- **Other code reading the biometrics line by key:**
  - `filings.ts:47,50` (`BIOMETRICS_FEE_SOURCE`, `BIOMETRICS_EXEMPT_SOURCE`) is used only by tests (`check_vv_filings.ts:84`, `check_vv_prepare.ts:29`).
  - `feeRule` is no longer called by any app code.
  - `deriveFilings` charges by the lines a combination lists, not by key, which is unchanged.
- **Visible words change.** On the live API (:4436), a person with no date of birth gets `Waits for the date of birth: no biometrics under 14 or over 79 (IRCC, When to give biometrics: temporary residents).` The old ending was `(VV-R15)`.
  - No screen shows this text. The only web reader of prepare items (`web/src/runtime/out-of-date.tsx:24`) keeps `out_of_date` items only, and the step is always `cannot_start`.
  - No test checked the old words.
  - The Fees panel is unchanged (builder's screenshot `screenshots/bk8-biometrics-waits-1440.png`).
- **Rules met.** Data stays out of code (P-425), so B164 holds. No personal names: the break report uses roles. No new technology. The breaker's M2 and M3 are on origin/main already and are raised as questions to the tech lead in the PR, which is right (P-26).

## Test quality (does each rule's test fail when the rule is removed)
I made each change below in a scratch copy, never in the clone. Every one turned the BK-8 suite red:

| Change | BK-8 suite result |
|---|---|
| Drop the one-line-per-step check | 16/17 |
| Drop the page-on-exempt-source check | 16/17 |
| Drop the blank-step check | 16/17 |
| `stepRule` matches by key instead of step | 14/17 |
| Case-prepare words from `stepRule("vv.single", …)` | 15/17 |
| Case-prepare rule from a different variable | 15/17 |
| `rulesFrom` drops `step` | 12/17 |
| `step` removed from `fee-table.json` | 11/17 |
| Words hard-code `(VV-R15)` | 15/17 |

Each rule has a pass case and a fail case. The case-prepare wiring is checked by reading its source, not through the API. The 35/35 API suite and my live read above cover the API path.

## Issues
**Blocker: none. Major: none.**

- **m1 (Should). A biometrics fee line that does not name its step is charged but gives no step, with no warning.**
  - If a future pathway lists a biometrics line without `"step": "biometrics"`, or with a misspelt step such as `"biometric"`, `deriveFilings` charges it and shows "Waits for … date of birth" in the Fees panel. Meanwhile `stepRule` finds nothing, so nobody gets "Give biometrics". This is the breaker's M1 symptom (the fee panel and the items disagree), now reachable through one missing data word.
  - `check_bk8_biometrics_ages.ts:57` asserts this behaviour as intended, and no data test guards against it.
  - Fix: add a guard to `check_r2_fee_table.ts`. For example, every line with a per-person age exemption names a step, and a step value is one the engine knows (`BIOMETRICS_STEP.key`). Or record the limit in the table's `about`.
- **m2 (Should, nit). Stale wording.**
  - The doc comment at `filings.ts:156` still says `feeRule` serves "the items and words that need it", but no app code calls it now.
  - "IRCC," is hard-coded in `biometricsWaits` (`prepare.ts:33`; the breaker's m1 tail). Every exemption source in the table is IRCC's today, so this is correct now, but it is not taken from the source.
  - Fix: update the comment. The prefix can stay while every source is IRCC.

## Not a finding (outside this row)
- `fs.spouse` lists no biometrics line, so a spouse-sponsorship case gets no biometrics step, the same as on main. Adding a cited permanent-residence biometrics line is data work for its own row, not BK-8's.
- The breaker's M2 (a date of birth with spaces is read as missing), M3 (an unsound row makes the step disappear with no reason), and m2 to m5 are all on origin/main already.

## What I could not check
- The acceptance packs on the checkpoint and the full `run-suites --changed` (left to CI).
- An in-browser walk: no screen changed. I relied on the builder's 1440 px screenshot and a live API read on :4436.
- D17 and D20 (simulated only). An intended user's unaided walk stays with the founder.
- `graph.mjs --check` exits 0 (G1 0, G2 0). No files changed.

## D1–D20 and BIC (engine/API row)
- D1 Met: the row's goal is reached.
- D2 Met: the rules are refused when unsound, and duplicates are refused.
- D4 Met: one rule feeds both the step and its words.
- D16 Met: mutations caught, as above.
- D18 Met: the words cite IRCC's page.
- D15 Met: the prepare read takes 68–83 ms.
- D10 Met: the new words are plain.
- D5, D6, D7, D8, D9, D11, D12, D13, D14, D19: N/A, since no screen or flow changed.
- D17 and D20: simulated only.
- BIC-01 to BIC-20: N/A. No case-side screen changed.

Verdict: Approve 009d0a6be515d050b484db29dc61bf6b584dd9b2
