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

## Records update ~09:15 IST
* **QA-205 corrected to Minor** (the tech lead, from Builder 8). The library's "IMM 5475 (05-2021)" and Visitor visa's "IMM 5475 (12-2022)" are the same file (sha256 938af318…4b83), so there is no return risk. What is left: one file, two edition labels, because the manifest takes 12-2022 from the canada.ca URL folder (IRM 0002 is the same: 16-12-2022 against 03-2021 printed). Expected: one edition label per file, the printed one (P-32). It holds no capability.
* **qa tester 2's C9.1 verdict** (`qa/verdicts/2026-11-04-C9.1.md`, PR #811) agrees: Partial on 0932558ff. Its new row is **QA-207** (Gap · Major, C9.1 and C10.1): the configured checkpoint lists DEMO row 17 as "not built yet", so the journey cannot be reached on the demo data.
* M2: 43/60 (unchanged; C9.1 and C10.1 were already Partial).

## Records update ~09:40 IST: two flaky-on-main checks (tech lead, from #802)
* **QA-208** (Major, merge flow, C3.4 check): `check_forms_c34_ai` stops at 64/65 with a connection reset.
* **QA-209** (Major, merge flow, C3.4 check): `check_forms_c34_masters_browser` times out on its 30 s demo-load request.
* Both were seen on the merge base on Builder 7's Mac. Neither appears in the last 15 failed CI runs, so there is no run id; CI passed both on #802. qa's C9.1 browser check hit the same 30 s limit twice on this Mac.
* C3.4 is re-scored only after both #802 (QA-196) and #771 have merged.

## Batch 3 — #793 (QA-184; C11.10, C5.4, QA-129), #790 (QA-199; C3.8), #784 (C6.5, by qa tester 3), #788 (C7.5, qa tester 3), #745 (infra) · main a56536026 · tested 09:10–10:15 IST

| Row | Verdict | Why |
|---|---|---|
| C11.10 Immigration programs setup cards (M2) | **Works** (was Partial) | QA-184 fixed: one Live state, then one five-step count for the next release, the same on card, strip, List and `/api/catalogue` |
| C5.4 Release refused while a number has no source (M2) | **Works** (was Partial) | Its only hold was QA-184; the Review and release tab now matches its Overview row |
| C3.8 Validator (M2) | **Works** (re-confirmed) | QA-199 (Critical) fixed: the Background questions come from each form's own heading |
| C6.5 Passport reader (M3) | **Partial** (was Not built) | qa tester 3, `qa/verdicts/2026-11-04-C6.5.md` (#816): the engine works; routes and screen held by P-251 |
| C7.5 (M3) | *pending* | qa tester 3 |
| #745 (infra) | Seen working | `isolated.sh … stop` now says "database and files removed" |

**M2: 45/60 confirmed** (was 43; +C11.10, +C5.4). M3: 2/17 Works, 10 Partial.

### Runs (exit code · tests passed)
| Check | Round 1 | Round 2 |
|---|---|---|
| `acceptance/C11.10.test.ts` | 0 · 15/15 | 0 · 15/15 |
| `acceptance/C5.4.test.ts` | 1 (timeout, 180 s reset wait, load ~22) ×2; then 0 · 22/22 with the wait raised (139 s in all) | — |
| `tests/check_qa184_live_state_browser.cjs` | local: 1 (timeout, 120 s reset wait) ×4 | CI run 41764923600 on main's tree: PASS 16/16 |
| `tests/check_c38_background_forms_api.ts` | 2 (500 under load, QA-210), then 0 · 36/36 | 0 · 36/36 |
| `acceptance/C3.8.test.ts` | 0 · 12/12 | 0 · 12/12 |
| `tests/check_c38_completeness.ts` (no server) | 0 · 22/22 | 0 · 22/22 |
| `tests/check_c38_completeness_api.ts` | 0 · 9/9 | 0 · 9/9 |
| `tests/qa/check_qa_am_fix_1027.cjs` (updated, below) | 13/14 (old setup line) | 14/14 after the fix |

### Demo data at 1440 px (P-304 (2); qa_walk3 on main eb834a660)
Demo › Reset to the six (206.5 s; QA-204 seen again) › Start With an LMIA from its reviewed release:
* With an LMIA's Overview: "Live · Release 1 · Next release: 3 of 5 steps to do", with steps 1–3 open and labelled for the next release (`c1110-lmia-overview-1440.png`).
* The Programs card: "✓ Live · Next release: 3 of 5 steps to do" with Open; the other four cards read "0 of 5 steps" with Resume setup (`c1110-programs-live-card-1440.png`). `/api/catalogue` gives the same, out of 5. No sideways scroll.
* Review and release: "0 draft changes; 0 problems to fix"; "Numbers without a source (17) … they will block the next submission once the draft changes".

### Test updated: `tests/qa/check_qa_am_fix_1027.cjs` (from 4 steps to 5, #793 review Minor 3)
Its "review m1" part read the four-step stage map and card selectors that #793 removed. It now checks four things: every started combination's `/catalogue` progress is out of 5, at the step of the checklist's next item, in the card's words; no card names a four-step count; Live shows only on Live cards; and a Live card shows its next release's count. Its setup line also changed: since the release gate, Spouse of a student stays In setup with something missing, not released and Not ready. Result: 14/14 on a fresh copy.

### Closed
QA-184, QA-199 and QA-129 (with QA-184, by the tech lead's ruling on #793) are moved to `history/qa-bugs-closed-2026-11-04.md`.

### New
* **QA-210** (Bug · Minor): applying a reviewed field map runs in one 5 s database transaction. On a busy server, applying IMM 5257's 242 form fields took 5.58 s and gave a generic 500.
* QA-200 is re-tagged to C7.2 and C6.1 (tech lead's ruling on #801); C2.4 stays Works.

### Disclosures
1. To keep the run valid under the Mac's load (average 20–34), the C5.4 pack ran once from a throwaway copy of its file, with only the reset wait raised from 180 s to 900 s. The run took 139 s in all. The copy was deleted.
2. Four local runs of the QA-184 check timed out on Reset to the six. The verdict uses its CI run on main's exact tree. By the tech lead's rule (09:45 IST), a timeout under load is a re-run, not a capability failure.

## Batch 4 — #794 (QA-180; C6.1, C5.1), #726 (C11.13, by qa tester 2), #788 (C7.5, qa tester 3), and the QA-200 re-test · main eb834a660 · tested 10:25–11:00 IST

| Row | Verdict | Why |
|---|---|---|
| C6.1 Officer opens a case (thin slice) | **Works** (was Partial) | QA-180 and QA-200 (both Critical) closed. On the demo data the case opens on release 1 at the first try |
| C5.1 Release (M2) | **Partial** (unchanged) | QA-180 is closed, but P-248's form-line rule (G5) is not built |
| C11.13 One guarded change pattern (M2) | **Works** (was Partial) | qa tester 2, `qa/verdicts/2026-11-04-C11.13.md` (#822). QA-192 closed; the tech lead ruled on its question (QA-211) |
| C7.5 Independent review of a filled form (M3) | **Partial** (was Not built) | qa tester 3, `qa/verdicts/2026-11-04-C7.5.md` (#823). Part 1 (rules findings) works; the AI review is part 2 |

**M2: 46/60 confirmed** (+C11.13). Thin runtime slice: 7/8. M3: 2/17 Works, 11 Partial. **No open Critical.**

### Runs (exit code · tests passed)
| Check | Round 1 | Round 2 |
|---|---|---|
| `tests/check_qa180_one_rule.ts` (no server) | 0 · 26/26 | 0 · 26/26 |
| `tests/qa/check_qa180_two_gates.ts` (no server) | 0 · 8/8 | 0 · 8/8 |
| `tests/check_edition_in_use.ts` (no server; QA-200) | 0 · 20/20 | 0 · 20/20 |
| `tests/runtime/setup_visitor_visa.ts` | 0 · 13/13 | 0 · 13/13 |
| `tests/runtime/check_runtime_r1a.ts` | 0 · 98/98 | 0 · 98/98 |
| `tests/runtime/check_runtime_r1c.cjs` (after r1a on the same copy) | 1 · stopped at 18/19 | 1 · stopped at 18/19 |
| CI on main's tree (merge-queue run 41771465056) | r1a 99/99 · r1c 132/132 · r1d 96/96 · `check_s4_startable` 10/10 · `check_b1_release_unmapped` 14/14 · `check_qa180_one_rule` 26/26 | |
| V3 golden journey (`reports/verify-2026-11-03/V3/v3_golden_replay.cjs`) | 2: step 1 PASS (Reset to the six, 96.6 s), then step 2 timed out on a busy Approve at load average 30 | — |
| GitHub re-test `gh workflow run nightly.yml -f capabilities="C6.1 C5.1"` (run 41777761993) | both parts exit 2: "studio/tools/gate-b.mjs is not on this branch yet (gate B, #804)" | — |

Locally, r1c waits 30 s for the client question "What is the main purpose of the visit?" and stops. That wording is what `setup_visitor_visa.ts` creates, and CI passes r1c 132/132 on main's tree with its own order. So the local stop comes from the tester's run order (r1c straight after r1a on one copy), not from the app.

### Walk at 1440 px on the demo data (qa_walk4, main 10868af42)
Reset to the six (65 s), then Demo › Start With an LMIA from its reviewed release. As the case officer: Cases › Open a case. The dialog offers only "With an LMIA – inside Canada · release 1". The reference "ab" is refused on its field with "Give the case a reference of at least 3 characters." With "QA-LMIA-0411" the case opens on Release 1 at the first try: Open, Release 1, the case team, "Relies on an employer case", 153 questions, and Prepare application lists IMM 1295 and IMM 5257 SCH1 with what blocks filing. No sideways scroll (`c61-lmia-case-1440.png`). The one console error is that refused 400.

### QA-200 re-test
The fix was on main since 9afca2282 (3 Nov), but QA-200 had not been re-tested. All five paths it named now read `pdfMapInUse`: `fill.ts:44`, `fill-case.ts:96` and `:111`, `render.ts:119`, `workspace.ts:72`. `check_edition_in_use.ts` passes 20/20 twice, with the real filler on IRCC's two IMM 5476 files.

### Closed
QA-180 and QA-200 (Critical), and QA-192 (with C11.13) are in `history/qa-bugs-closed-2026-11-04.md`.

### New and changed
* **QA-211** (UX · Minor, a suggestion by the tech lead's ruling on #822): the person applying a form's draft confirms each near reason. It is filed on C3.2 and C11.14, because no C4 row covers field maps.
* QA-210: qa tester 3's setup 500 under load is added (probably the same 5 s apply transaction).

### Disclosures
1. The V3 replay accepts only ports 4470–4479. qa ran it from a throwaway copy with only that guard changed to 4490–4499, then deleted the copy.
2. Disk: 46 leftover `xr_studio_qa_*` databases and their `var/isolated-qa_*` folders from qa's own runs, made before #745, were dropped. Free space went from 3.8 GB to 8.0 GB. No other lane's copies were touched.

### Questions for the tech lead
* The GitHub re-test needs `studio/tools/gate-b.mjs` (#804) on main. Until it merges, packs run on one Mac copy at a time. There is also no `acceptance/C6.1.test.ts` or `C5.1.test.ts`: which packs should gate B run for these two?

## Records update ~12:35 IST: P-322 (founder, ~12:00 IST) and the tech lead's ruling
* **The one-time P-322 check is done** (`qa/verdicts/2026-11-04-checkpoint-built-by-product-steps.md`). The configured checkpoint is built by the product's own services, as the people who hold each duty. Its one shortcut is Sample source entries, the same function as a Demo route, and that is allowed.
* **Demo › "Start With an LMIA from its reviewed release" writes its release straight into the database.** This is **QA-212** (Gap · Major, C6.1 and C5.4), to go to a builder.
* **C6.1 and C5.4 go back to Partial** by the tech lead's ruling (P-294 under P-322): their demo walks used that release, and the checkpoint releases nothing until QA-144 lands. Their packs and CI stand as evidence.
* **M2: 45/60 confirmed** (was 46 before the ruling). Thin runtime slice: 6/8.
* C6.1 and C5.1 have no acceptance pack. Until G5 (now started, which also writes C5.1's pack) and a C6.1 pack row land, qa's machine run for them is their named suites in CI on main's tree.

## Records update ~12:00 IST: breaker findings on #837, C5.5 re-score, #840 verdict (Lead 4)
* **QA-213** (Bug · **Minor**; the breaker said Major). One quote-less (Sample) check makes `isDemoSnapshot` true on a source-backed draft (`engine/validate.ts:281–287`), so in the demo workspace it releases with untested field maps, labelled "Source-backed". qa checked on main 3b2f3139f that this stops at the demo workspace. Outside it, Sample content (a quote-less check included) is refused at Submit, at Approve and on the Release page (`studio.ts:455`, `:1207`). `check_g2_answer_key_gate_firm.ts` passes 27/27 in CI on main's tree (run 41771465056). So a firm cannot release an untested map this way, and it is Minor.
* **QA-214** (Bug · Major, C11.7 and C6.1): the reviewed outside-Canada release c1-v3 (IMM 1295 "made Outside of Canada", IMM 5488, IMM 5905 New Delhi) is loaded into the inside-Canada With an LMIA and labelled source-backed. Confirmed on main (`demo.ts:41`, c1-v3 `configuration.json`). Both rows were already Partial.
* **C5.5 stays Works.** Its 3 Nov built marker is re-scored from CI on main's tree: `check_g2_answer_key_gate_firm.ts` 27/27, `check_g2_answer_key_gate.ts` 74/74 and the browser check 15/15. The built markers for C5.5, C3.8 and QA-180 are removed (all re-scored today).
* **#840 (IRM 0002 saved field map, paid US$0.24): PASS, then labelled** (comment on #840). On its own copy, Load the configured checkpoint, add IRM 0002 from the official library, read it, then use Saved: the replay runs at US$0 and gives the 7 proposals the PR names, the ledger is unchanged, and the 1440 px To review shows no sideways scroll (`2026-11-04-after-merge/pr840-irm0002-proposals-1440.png`).
* M2: 45/60 (unchanged). Thin slice 6/8.

## Batch 5 — #829 (C3.10, QA-182) · main 9caa043be · ~12:15–12:25 IST
| Row | Verdict | Exit codes |
|---|---|---|
| C3.10 Never "box" (M2) | **Works** (was Partial) | `acceptance/C3.10.test.ts` on the six on GitHub (run 41787750850, gate B, `data=six`): exit 0, 8/8 in 49 s |

This is the first re-test run on GitHub's machines (#804 merged). The Mac copy was used only for the walk: on the six at 1440 px, 14 setup pages and IMM 5409's AI proposals page show no "box" or "boxes" ("form field" 23 times on that page), with no sideways scroll. QA-182 closed. #838 (an infra guard) changes no capability.

**M2: 46/60 confirmed** (+C3.10). Thin slice 6/8.

## Records update ~13:00 IST: red packs on M2 Works rows (Lead 4, GitHub re-test run 41788362078, #857)
| Row | Pack on the six | qa's verdict |
|---|---|---|
| C4.7 PQR picks | exit 2: "STOP setup missing: this combination has no questions yet (on the six it needs J3 / C4.11 first)" | **Partial** (was Works), held by QA-144 under P-322 |
| C3.6 Add the fact a rule needs | exit 2: "STOP setup missing: the combination has no rule yet (Visitor visa needs C4.11 first)" | **Partial** (was Works), held by QA-144 under P-322 |
| C11.12 Who can be in this application | `C11.12.test.ts` exit 0 · 20/20; `C11.12-runtime.test.ts` exit 1 (no released combination on the six; the pack crashes) | **Partial** (was Works). The runtime side waits for a release on the checkpoint (QA-144) |
| C11.3 | exit 1 · 26/27; only AT-5 red, the held AI "did you mean" (P-284) | **Works** (unchanged, held part excluded) |

qa ran the three red packs itself on one Mac copy of the six to see the messages gate B does not print (copy stopped). Why the three move: under P-322 a setup capability counts on Reset to the six. C4.7 and C3.6 were Works on the Visitor visa set up by `setup_visitor_visa.ts` (sections written by SQL) or on the suites' fixture, which P-322 does not count. On the six, a person cannot reach them until QA-144 gives the Visitor visa questions and rules. C11.12's runtime side needs a release, and the checkpoint releases nothing yet. This follows the tech lead's ruling on C6.1 and C5.4 (12:30 IST).

New: **QA-215** (Minor, test tooling): `C11.12-runtime.test.ts` crashes instead of exiting 2 "setup missing", and C11.3's held AT-5 is a plain FAIL, so gate B refuses C11.3.

**M2: 43/60 confirmed** (was 46; −C4.7, −C3.6, −C11.12). Thin slice 6/8. All three come back when QA-144's slices land.

## Batch 6 — #802 (QA-196; C3.4), #771 and #820 (C3.4), #833 (C3.8), #851 (C11.7, by qa tester 2), #848 (test fix) · main 4c3b16f0e · ~12:50–13:20 IST
| Row | Verdict | Exit codes |
|---|---|---|
| C3.4 AI drafts sections, document types, rules and checks (M2) | **Partial** (unchanged) | `C3.4.test.ts` on the six on GitHub (run 41791603864): exit 0, **20/20** (was 7/16). Held by QA-195, QA-206, QA-144 (Major) and the flaky checks QA-208, QA-209 |
| C3.8 Validator (M2) | **Works** (re-confirmed after #833's migration) | `C3.8.test.ts` on the six on GitHub: exit 0, 12/12 |
| C11.7 Demo reset and sample (M2) | **Partial** (unchanged) | qa tester 2, `qa/verdicts/2026-11-04-C11.7.md` (#851): `C11.7.test.ts` 18/21 twice on GitHub; part B (Provincial nominee from the paper twins, P-109) is red |

Walk on the six at 1440 px (one Mac copy, stopped): the Saved C3.4 draft of IMM 5257 (US$0; ledger 251,631 bytes before and after) gives 47 proposals on To review, 17 of them form checks. Accept on a form check whose form fields are not mapped yet is refused, naming the two form fields, as the QA-196 ruling says (`c34-form-check-1440.png`).

Closed: **QA-196**. New: **QA-216** (Minor, from qa tester 2: the finder line says "A step failed" on 4 of the six) and **QA-217** (Minor: "Ready to accept" on a form check that cannot be accepted yet).

**M2: 43/60 confirmed** (unchanged). Thin slice 6/8.

## Records update ~14:00 IST: M3 round 0 from the independent cloud qa (#864), #840 merged
* C6.12, C6.4, C7.6, C7.7 and C7.3: **Partial, unchanged** (`qa/reports/2026-11-04-qa-m3-cloud/runs.md`). Every pack is fixture only, run twice with the same result each time; on the checkpoint they wait for QA-144. C7.6's readiness routes are not built yet (404).
* **QA-149 closed** (`check_qa_vv_1102_decider.ts` 6/6). Still failing: QA-153 (Major), QA-155 and QA-151 (Minor).
* #840 (IRM 0002's saved field map, qa PASS earlier) merged.
* M2: 43/60 (unchanged). M3: 2/17 Works.

## Records update ~14:15 IST: qa tester 2's C3.4 verdict (#874)
* It agrees: **C3.4 is Partial**, its pack is green, QA-196 is fixed.
* **New QA-218 (Gap · Major):** no screen offers Saved (US$0 replay) for the AI masters run that #771 committed. On the six, the only masters control runs the rules pass. **qa correction:** qa's batch 6 walk started that Saved draft through the API, not a screen. It proved the To review queue and the refusal words, not the step a person meets. The C3.4 row now says so.
* qa tester 2's Minor is folded into QA-217: the "Ready to accept" badge, plus a form check whose first field shows only "*".
* M2: 43/60 (unchanged).

## Batch 7 — #837 (QA-212, QA-214; C5.4, C6.1) · main aa017f3a1 · ~14:40–15:05 IST
| Row | Verdict | Exit codes |
|---|---|---|
| C5.4 (M2) | **Works** (was Partial, held by QA-212 under P-322) | `C5.4.test.ts` on GitHub: exit 0 · 27/27 on the configured checkpoint (run 41805556293), 27/27 on the six (run 41805568135); 27/27 on qa's Mac copy of the checkpoint |
| C6.1 (thin slice) | **Works** (was Partial, same hold) | No pack. On the checkpoint the release was made through the product's own steps, then the case opened at 1440 px on Release 1 at the first try |

Walk on the six at 1440 px: Demo › Start With an LMIA › "Load as a draft". The database then holds 0 releases and 0 pack versions; With an LMIA is ILLUSTRATIVE (Sample), with the basis note naming the outside-Canada c1-v3; Review and release shows "Numbers without a source (17)", and Submit is disabled.

Closed: **QA-212, QA-214**. The remaining import shortcut (shared library items published at load) is disclosed in the dialog and ruled as its own BACKLOG row (Lead 4).

**M2: 44/60 confirmed** (+C5.4). Thin slice 7/8 (+C6.1).
