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

## Batch 2 — #781 (C9.1 saved AI run), then records #749, #782, #786, #737 · main 6e11bc3b1, then 0932558ff · tested ~08:05–08:25 IST

The four records PRs change no app code (`git diff 6e11bc3b1 0932558ff` touches no `prototype/` and no `qa/built/` file): nothing to re-score for them.

| Row | Verdict | Why |
|---|---|---|
| C9.1 New edition: comparison and AI impact (M2) | **Partial** (unchanged; the AI part now works at US$0) | The held IMM 5476 11-2025 review offers Saved; one click puts 8 proposals on To review at US$0. Pack part 2 is still red: the configured checkpoint holds no IMM 5476 11-2025 (DEMO row 17) |

**M2: 43/60 confirmed** (unchanged).

### Runs (exit code · tests passed)

| Check | Copy | Round 1 | Round 2 |
|---|---|---|---|
| `acceptance/C9.1.test.ts` | qa_c91p1, qa_c91p2 :4492 | 1 · 8/17 | 1 · 8/17 |
| `tests/check_c91_impact_ai.ts` (no server, `--tsconfig api/tsconfig.json`) | — | 0 · 24/24 | 0 · 24/24 |
| `tests/check_c91_impact_browser.cjs` | qa_c91b1, qa_c91b2 :4493 | 2 (timeout) | 2 (timeout) |
| CI merge-queue run 41758140165 (tree 98aba93470 = main 6e11bc3b1) | CI | browser check PASS (shard 2) · `check_c91_impact_api.ts` 33/33 (shard 3) · all shards success | |

Part 2's eight red cases all fail at the same point: the checkpoint has no held edition (row 17, a configuration row).

### Person walk at 1440 px (qa_c91b3 :4493)
Setup (API, as the browser check does): Reset demo, upload IMM 5476 11-2021, Load sample (the six). Then as the Configuration author: To review › "New edition · IMM 5476 (11-2025) … it touches Visitor visa" › Review impact. The page shows 30 unchanged, 7 reworded, 16 new and 6 removed form fields; the 2026-03-12 accepted-until date with IRCC's quote; and "AI for the new and reworded boxes · Saved · A saved AI run of this comparison is here: use it at US$0", with no priced button (`2026-11-04-after-merge/c91-saved-offer-1440.png`). "Use the saved AI run (US$0)" gave "Saved AI run (US$0, no AI call) … 8 proposals on To review, read by both rounds. A person accepts each one". No sideways scroll. The spend ledger was 238,169 bytes before and after.
Underneath: the 8 proposals are 5 agreed by both rounds (Application type, Application number and Name (organisation) Ready; Family name and Given names Check) and 3 one-round readings marked Decide: Email address (draft only, for office[1], "If you do not have an email address, provide either your telephone number or your address"), Representative action (draft only) and Representative request type (checker only), both for the same radio list. P-121 holds: a single reading is never Ready. The PR body says the doubtful office[1] mapping "is not among the 8 proposals". It is, as a Decide item. That is a wording error in the PR, not an app bug.
Each box's count adds to 10 against the headline's 8: the radio list shows "2 on To review" (two competing readings), and Family name and Given names each answer a reworded and a new box. That is consistent.

### Disclosures
1. My first AI-check rounds ran without `--tsconfig api/tsconfig.json` and failed to compile (decorators): the tester's error. The rounds above are the re-runs, run as `run-suites.sh` runs them.
2. On this Mac the browser check's 30 s request limit is shorter than Load sample (106 s timed at load average 18, with other lanes' copies running). It passed in CI on main's exact tree.

### Demo data (P-304 (2))
After Reset to the six, IMM 5476 is held at 11-2025 (`form_edition` SAMPLE) and only Visitor visa carries it. So no new edition is held on the six: the C9.1 journey on the demo needs the configured checkpoint (pack part 2).

## Bugs from Builder 8's QA-144 work (#798), through the tech lead (~08:45 IST) · checked on main 0932558ff

* **QA-205** (Bug · Major, C6.1, C7.2). `engine/snapshot.ts:165` silently drops an attached edition with an empty field map. qa loaded the configured checkpoint on qa_conf :4495 (79 s, US$0). It holds one IMM 5475 edition: 05-2021, sha 938af318…, 27 mapped boxes. The "12-2022" Builder 8 saw is the official-sources manifest's label for the same bytes, a disagreement known since 21 Oct, for the expert to settle. So the drop is latent on main, not seen. It overlaps QA-180 (#794); retest with #794. The message named C3.11, but C3.11 is the signed-scan line, so qa filed it under C6.1 and C7.2.
* **QA-206** (Gap · Major, C3.4, C4.1). Confirmed in code: the rules pass names sections after the PDF's part names (`form-masters.ts` `words()`, with "Five" and "Seven" kept for a person to rename). Not yet walked: the checkpoint on main does not call the rules pass.
* No count change: C6.1, C7.2, C3.4 and C4.1 are already Partial.

### Question for the tech lead
QA-200 (Critical, open) names C2.4, yet C2.4 is Works (25cefb67, 1 Nov). Under P-305 (3) that is inconsistent. qa's reading: C2.4's own behaviour (same file "already in the library"; a newer edition is held for impact review) is met, and QA-200's fault is in the snapshot and the fill (C7.2, C6.x). Recommendation: re-tag QA-200 to C7.2 and C6.1 and keep C2.4 Works. The other choice is C2.4 Partial, which makes M2 42/60. qa changes nothing until you rule.
