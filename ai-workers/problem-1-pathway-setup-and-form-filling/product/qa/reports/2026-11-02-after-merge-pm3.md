# qa, 2 Nov pm (3): after-merge on main, one batch (new rule: score main after each merge batch)

Main scored: fbe3f01f (#541, #543, #544, #545, #522, #528, with #525 and the rows waiting in `qa/built/`), then 8f2b3975 (#552, #556, #553 merged while this ran). AI spend: US$0 (no live switch; `check_queue_tx` ran on a private ledger, `P2_LEDGER_DIR`).

**Verdict:** main is green for every row these PRs touched. M2 goes from **41 to 43 of 60 Works**:
* Up: C3.12, C11.12 and C5.7.
* Down: C3.13, from Works to Partial. This is not a regression: its pack can run again and is red on parts never built.
* No new Blocker, Critical or Major. New: one Minor, QA-166. Closed: QA-148 and QA-161.

## Per-head check (migration PR, before merge)
| PR | Head | Verdict | Evidence |
|---|---|---|---|
| #556 G-CORE B1 (migration) | 8d0c4bcc | **Pass**, Minor QA-166 | See the details below; also commented on the PR |

#556 details:
* **Migration:** additive (one table `change_set`, 3 CHECKs, 2 indexes, no ALTER, DROP or foreign key) and it sorts after `20261102170000`.
* **Upgrade:** on a database holding the sample (1,636 rows across 77 tables), every count was unchanged.
* **Rollback:** by the file's own SQL; the database is back to 52 migrations, and re-applying works.
* **Suites:** gcore engine 130/130, gcore API 35/35 (QA-159 cases included), s6_p149 73/73, sh2b 17/17, sh2 24/24, c313 21/21, c1113 acceptance 21/21, slice2 41/41, slice2b 36/36.
* **Probes:** roles 403/401 in words; Problem Details with field errors; 8 identical requests at once returned identical bodies and wrote nothing.

## Re-scored on main
| Row | Was | Now | Evidence (main) |
|---|---|---|---|
| C3.12 | Partial | **Works** | Pack 17/17 (AT-3 passes); field map 61/61; library browser 113/113. On screen at 1440, 1024 and 400 px, every Published value is IRCC's month, e.g. IMM 5476 2025-11 as on canada.ca, and never a file date (`2026-11-02-after-merge-pm3/c312-published-*.png`) |
| C11.12 | Partial | **Works** | Pack 20/20 (P-209 as decided), runtime 4/4, modes 44/44, prepare API 30/30, filing browser 17/17 |
| C5.7 | Partial | **Works** (judgement call, see Questions) | `check_g4_answer_keys` 93/93 and Tests tab browser 54/54 on main; the head walk on #525. There is no acceptance pack |
| C3.13 | Works | **Partial** | See the notes below the table |
| C4.11 | Partial | Partial | Pack 15/23 after `setup_visitor_visa` (4/23 on a bare copy); the reds are listed in the row; QA-162 unchanged |
| C4.7 | Partial | Partial | Pack 13/15 + 2 waiting on Track A; the 2 reds are check drift (see the notes below) |
| C6.4 (R3) | Partial | Partial | Pack 30/30, `qa/check_qa_r3_minor_principal` 4/4, storage 48/48, `setup_vv_m3` 29/31 (S2w and S7a drift, as before) |
| C8.2 | Not built | **Partial** | Slice 1 (#553): `check_c82_filing_record_api` 24/24, `check_c82_filing_numbers` 13/13; pack 0/12 by design, because recording waits for Ready to file (L-SA3, held); no screen |
| C11.13 | Partial | Partial | B1: engine 130/130, API 35/35 on 8f2b3975; pack 14/15 (same red: the Release page does not show the near reason, P-120) |
| C3.1 (R-146) | Works | Works | `check_queue_tx` 8/8 (13 saved forms replay), `check_r146_whole_form_output` 7/7, `check_forms_pa_track_a_jobs` 28/28, c31 acceptance 17/17, formats 107/107 and browser 15/15. Thin: no one checked the three new maps' values box by box |
| SH2b / SH3 / C11.9 | — | green | sh2b 15/15, sh2 24/24, sh3 resolver 63/63, c119 acceptance 23/23, items 70/70 and browser 29/29, `check_vv_prepare_api` 38/38 (40/40 on 8f2b3975 with #552) |
| D4 | — | green | `runtime/check_case_engine` 69/69 |

Notes on the table:
* **C3.13:** the race is fixed (`check_workspace_first_calls` 9/9 twice, no 409). The pack is back from QUARANTINE: 8/23 twice, with identical lines. Its own header lists the reds as missing: BR-2 counts, BR-3 status and origin words (raw PUBLISHED, IMPORTED_RELEASE), and BR-10 filters (`?section=`, alias and form-code search, retired). Reuse per combination is 7/7, plus 21/21 and 24/24 browser.
* **C4.7:** the pack now has a pick's fact come from the case officer, and the product refuses that ("only the client gives it").

`qa/built/` emptied: C11.12, C4.11, C4.7, C5.7, D4, R3 and SH3 were scored this round.

Smoke (the `--changed` set by hand): engine 43/43, case engine 69/69, w1 structure 81/81, dv backbone browser 8/8, screen01 API 135/135 (quarantined, run anyway). Not run: `check_w1_start_setup`, because its usage line sets `STUDIO_AI_LIVE=approved` (P-276).

## Bugs
* **New:** QA-166 (UX · Minor). The R4 message shows a raw key: "no.such is not in the shared library." (`api/src/change-sets.ts:249`).
* **Closed:**
  * QA-148: C3.12 pack 17/17 and the screen at three widths.
  * QA-161: sh2b, sh2 and c119 green on main.
* **Fixed on main, retested in golden journey 2 (next):** QA-159 (#556) and QA-164 (#552).
* **Open and unchanged:** QA-162 (Critical, C4.11) and QA-163 (Critical). Their fixes are in other sessions.

## Graph (P-86, 8f2b3975)
New since 59d2da74:
* **G3 (API routes no test reaches): +3.** `POST /runtime/checklist-lines/:id/documents`, `POST /runtime/items/:id/pdf-copy` and `GET /library/forms/:code/draft-fields`. No page uses them either. These are API-only slices; I am noting them here rather than as bug rows, and the owning lanes should add a check.
* **G6 (nothing imports): +1.** `api/src/features/demo-reset-to-six.ts`. This is a false positive: `api/src/features.ts:8` loads every file in `features/` with `readdirSync`. The graph tool should treat that folder as imported (Question 3).

## Not tested
* Coverage (c8): not run this round. The floor is unchanged from the last report.
* A full `run-suites.sh` (about 38 min).
* Headed person walks, apart from C3.12. Golden journey 2 walks the main path next.
* The three new R-146 maps value by value.
* Breaker n1–n5 on #556.

## Environment notes (not product)
* With 6 isolated copies on 4 cores, `POST /demo/load` went past 30 s, and two browser suites timed out. Run alone, both passed.
* `check_queue_tx` touches the shared real ledger unless `P2_LEDGER_DIR` is set. Run alone with it set, it was 8/8.
* The usage lines of `check_sh3_resolver`, `check_forms_pa_track_a_jobs` and `check_sh2_where_used` omit `--tsconfig api/tsconfig.json`. Without it, tsx fails on decorators.
* `isolated.sh` cannot start a copy from a worktree under `/tmp/claude-0`, because the postgres user cannot read it. That is why the #556 head ran on hand-started copies.
* Suites rewrite tracked screenshots and evidence JSON (c119, c313, C11.12, forms-slice2, screen01). qa restored them with `git checkout`.

## Questions for the tech lead
1. **C5.7 Works without a pack.** Step 6 says "the row's acceptance test is green". C5.7 has no `acceptance/C5.7.test.ts`, so qa scored it on its own checks plus the head walk. Recommend: keep Works and have forms add a short pack (family → run → pass/fail per value → sign), *or* hold it at Partial until that pack exists. Your call; it moves the count by one.
2. **C3.13 down to Partial.** This is the bar applied, not a regression. BR-2, BR-3 and BR-10 need a row in BACKLOG (screens/forms). Recommend: one row, "C3.13 words and filters", ahead of UX-A part 2, because UX-A touches the same counts.
3. **G6 false positive:** `graph.mjs` should count `api/src/features/*` as imported, because `features.ts` loads them by directory scan. This is a small scaffolding fix: who owns `graph.mjs`?
4. **The C4.7 pack's fixture** asks for an officer-sourced declaration that the product now refuses. Which should change, the pack or the rule?

## Suggestions
* *Needed for the proof · Scaffolding:* fix the three usage lines (`--tsconfig`) and make `check_queue_tx` default to a private ledger.
* *Later · Scaffolding:* suites should write screenshots to `var/`, not to tracked `product/screens/…`.
