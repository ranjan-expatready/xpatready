# X5 slice a: fill the form library from IRCC's forms list. Independent CHECK of the fix, 31 Oct 2026

Reviewer: I did not build this. I reviewed **commit 86f9447c** (`claude/forms-x5a-library-06zafk`, PR #138; merge base eddb4b94). It answers the review of e5ec8173 (Ship after fixes, 6.5/10) and the break report (5 Majors, 10 Minors). I checked it against P-156 (1), plan-p156 P156-1 and P156-2, STANDARDS §9 and QUALITY D1–D20.

**How I tested.**
* **Copy and suites.** My own isolated copy `rvx5b` on :4457, with its own ledger directory and the web built from this commit. `check_forms_x5_library.ts` passes **28/28**. `check_forms_s4_library_browser.cjs` on a fresh copy passes **78/78** (its rewritten screenshots were put back with `git restore`).
* **Graph.** `graph.mjs` gives G1–G6 0/0/2/0/0/0. The two G3 routes predate this PR; the fill route is tested.
* **My own checks.** Five mutation runs (4 API, 1 browser). A temporary patch that set every row's shortcut action beside its `formUses` action. In-page timings. My Playwright journey (`/tmp/rv5/`, outside the repo). SQL on `xr_studio_rvx5b`.
* **Spend: US$0.** No AI, no `*_LIVE`. Every file put back; `git status` is clean. The copy is stopped.

Verdict: Ship after fixes

**Why.** Every Major from the review and the break report is closed, and each has a check that fails without its fix. One standard is still not met: STANDARDS §9 for search and the first press of a filter after the fill (issue 1, Major).

## Findings closed, with the check that fails without the fix
| Finding | Fix holds (my evidence) | Its check fails without the fix? |
|---|---|---|
| Review M1 / break M4 (list speed) | API list 0.10–0.13 s warm (was 0.6–0.86 s); first view 0.41–0.75 s | Yes: shortcut removed → "list under 300 ms" FAILS (725 ms) |
| Plain-row shortcut = `formUses` | **0 mismatches** on 237 rows × 3 people (A, B, C). States tried: draft line, retired line, latest release, earlier release, held file, open delete (own → Withdraw, another's → greyed), retired, none | (equivalence shown by my patch; no suite check compares them) |
| Break M1 (lettered numbers) | Fill stores "IMM 5373 B" and "IMM 0008 SCH4A". List search finds "IMM 5373B" and "5373". Uses answers 200 for "IMM 0008SCH4A" and "imm 0008 sch4a". Delete runs in the UI → WAITING → approved by user-B → gone. Attach: no file gives 409 "No file yet"; with a file it attaches to "IMM 0008 SCH4A" (no twin) | Yes: spelling fix removed → M1 step FAILS (stored "IMM 5373B") |
| Review M2 / break M2 (mark cleared by a failed check) | 409 (unrecorded page) keeps it; "check" (another date) keeps it | Yes: clearing after any successful compare → M2 step FAILS |
| Break M3 (mark kept after a newer edition) | Edition dated 2024-03 against index 2024-03-01 → Ready | Yes: date rule removed → M3 step FAILS |
| Break M5 (buried forms) | "Ready 15" and "No file yet 222" chips; Ready shows only ready rows | Yes: chip removed → browser step FAILS |
| Review 3 / break m1 (race counts) | Counts are true | Yes: planned count reported → m1 step FAILS (221 + 221) |
| Review 5 (focus after Fill) | Focus stays on the button (keyboard, 16 Tabs) | Yes: refocus removed → browser step FAILS (`<body>`) |
| Review 7 (titles overwritten) | Matched rows keep title, kind, page and retired state | New check; the builder's mutation note was not re-run by me |
| Break m2, m5, m6, m7 | Each holds | Pure or API step per item, each worded as a fail |
| Review 4 / m10 (chip words), review 6 (button place), review 8 (comment) | "Newer on canada.ca"; Fill and Upload PDF grouped at 1440, 1024 and 400 px | Read and seen in screenshots |
| Break m4, m8, m9; mark cleared by a **current** check | m4: 3 race rounds (fill + 8 approvals), no failed fill. m8: 409 in words. Current check clears the mark (index 2024-01-15, edition 2023-09 = page) | **No**: issue 3 |
| Break m3 (a fill brings back an approved delete) | Put to the Lead in the PR (Question 2); reproduced: the next fill re-lists the 8 deleted numbers | n/a (Lead) |

## Issues, ranked
1. **Major (Must): STANDARDS §9 [M], search and filter < 200 ms, not met after the fill (D15).** The API is now fast, but the page is not yet within budget. I measured in the page, from the input event to the rows changing, over 16 fresh searches:
   * Search: **184–375 ms, about 230 ms typical**. Before the fill, on the same copy: 86–125 ms.
   * The first press of Guides: 207–217 ms. No file yet: 130–165 ms; Retired: 90 ms. Repeats come from the client cache in 30–50 ms.
   * First view: 0.41–0.75 s, which meets the < 1 s budget.
   * **Cause.** About **100 ms passes between the keystroke and the fetch**: `setQ` re-renders all 237 rows, with their Tips, before the query fires (`web/src/pages/library-forms.tsx:61-63`). Then about 75 ms on the server and about 40 ms to render.
   * **Missing check.** The browser check has no timing step after the fill, which the earlier review asked for. The suite's 300 ms API threshold is not the §9 budget.
   * **Fix.** Keep typing and chip clicks off the 237-row render, either with `useDeferredValue` or memoised rows, or by filtering the already-loaded list on the client. Add a §9 timing step after the fill to `check_forms_s4_library_browser.cjs`.
2. **Minor (Should): the fill's message claims newer editions the list does not show (D6, D10).**
   * **Repro.** Set IMM 1295, 5257 and 5409's `index_date_modified` earlier, then fill. The message and the audit line say "3 with a newer edition on canada.ca (IMM 1295, IMM 5257, IMM 5409)", but the list shows "Newer on canada.ca 0". The library's editions are already dated at the index date, so `indexNewer` answers them at once (`api/src/form-library.ts:96`).
   * **Cause.** `plan.newer` (`engine/library-index.ts:39`) does not apply the same "edition dated at or after" rule.
   * **Fix.** Apply that rule in `planIndexFill`, or count with it in the message.
3. **Minor (Should): four fixes have no check that fails without them (D16).** With `if (false)` for the current-check clear (`form-library.ts:189`), `update` back for m4 (`:175`), the raw re-throw for m8 (`:161`) and online-only editions counted as a file for m9 (`:168`), the suite still passes **28/28**. The M2 step is a ternary: on its data the check always answers "check", so "a current check clears the mark" is never exercised. I verified m4, m8 and the current-check clear by hand; m9 by reading only. **Fix:** add a step each.
4. **Minor (Should): a double click sends two fills.** The second adds 0 forms, but writes a second audit line. Measured: 2 lines 0.1 s apart (Playwright `dblclick`). The busy state disables the button only after a re-render. **Fix:** ignore the click while `fill.isPending`.
5. **Minor (question for the Lead, carried): review issue 9 is not answered.** Rows with no page are shown only as a count, and a first read never marks a form that already has a file. The commit and the PR do not address either.

**Outside this slice (noted, not a finding).** The upload reader never reads a letter suffix: `CODE = r"(IMM|CIT|EMP|PRC|IRM)\s?(\d{4})"`, `studio/tools/read_form_identity.py:25`. An upload of IMM 5373B's PDF would be read as IMM 5373, not attached to the listed "IMM 5373 B". This is older behaviour; the fill only makes it visible.

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 5 | P156-1 and P156-2 met; mark lifecycle walked end to end |
| D2 | 5 | No duplicates under races; true counts; lettered keys in one spelling |
| D3 | 5 | One row per number, in the library's own spelling |
| D4 | n/a | No rule paths touched |
| D5 | 4 | Safe to press again; a double click sends two requests (issue 4) |
| D6 | 4 | Audit counts true; the message's "newer" list overstates (issue 2) |
| D7 | 5 | No AI, no download, US$0, said in the tip and the message |
| D8 | 5 | Shared library › Forms, unchanged |
| D9 | 5 | "Ready" and "No file yet" chips surface the 15 usable forms |
| D10 | 4 | Chip and pill words agree; the message's newer list contradicts the list (issue 2) |
| D11 | 5 | Message after 0.13 s, rows after 0.6 s, focus kept |
| D12 | 5 | Buttons grouped at 1440, 1024 and 400 px; team look |
| D13 | 5 | axe 0 at 1440, 1024, 400 and 720×450 (200 %); no sideways scroll; focus kept after Fill |
| D14 | 5 | Team components and words |
| D15 | 3 | API and first view in budget; search and first chip press over 200 ms (issue 1) |
| D16 | 4 | 28 + 78 green; 9 fixes fail when reverted; 4 do not (issue 3) |
| D17 | simulated only | No intended user walked it |
| D18 | 5 | Each listed row links its canada.ca page; "Listed by IRCC" says the origin |
| D19 | 4 | Listed forms reach uses, delete and attach; the upload reader's letter gap is older |
| D20 | simulated only | — |

## Journey score: 9 / 10 (pass; no criterion at 0)
Report: `journey-test-reviewer-2026-10-31-x5a-86f9447c.md`. Speed ½ (issue 1) and feedback and state ½ (issue 2); every other criterion 1.

## What I could not check
* canada.ca live: recorded copies only, with no row lacking a page or a readable number.
* A real second-edition PDF upload: I simulated it with the edition's date.
* The finder end to end, because it needs AI rounds.
* A real screen reader.
* An unaided walk by the configuration author (D17, D20).
* CI: still in progress on 86f9447c at review time.
* Timings: headless Chrome in this sandbox, compared with the same copy before the fill.
