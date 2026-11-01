# Review — PR #113 (runtime lane) at 8dc95280

Independent reviewer, 31 Oct, fresh context. I read `git diff origin/main...HEAD`, ran suites on isolated copies (ports 4431–4438, fake launcher only, no `*_LIVE` switch, US$0, `drafting_job` LIVE rows = 0) and walked the configured checkpoint, the Load sample dialogs and the signed-scan lines in Chrome (Playwright, headless).
Setup note: this worktree's Prisma client had been generated from an older schema at 13:43 today, and `web/dist` was rebuilt at the same time (the API failed with "column form_edition.accepted_channels does not exist"). I ran `prisma generate` and `vite build` from this head before testing. Both are untracked build files. Tracked files my runs touched (screenshots, a p2 job file, check JSON, new p1/p2 job and inventory files) are back to 8dc95280.

## Verdict: Ship after fixes (**Verdict: Block** until M1 is fixed or the Lead accepts it)

## What held
* **Queue transaction (item 1):** `QUEUE_TX` is on decide, undo and the ingest transaction. Past 60 s the ingest says it in plain words (503) and rolls back. `slowForTest` follows the same pattern as `STUDIO_FAULT_SOURCE`. The guarded live switch in `launchOnce` (`sources.ts:454`, `aiLive()`) is intact: the merge opened no paid path.
* **C10.1 (item 2):** walked keyboard-only (Tab to Demo, arrow keys to the item, Enter; focus moves into the dialog). The load took 16.5 s. It returns 13 rows: rows 4, 5, 6 and 8 Done; 1 and 3 Partly; 9–12 Waiting; 7 and 17 "Not built yet"; 2 Parked. The data underneath matches:
  * 0 library items waiting; 110 approved, all by user-B, none by its proposer;
  * proposals: 138 accepted, 1 rejected (returned);
  * 0 releases; no Visitor visa decision invented (row 10 shows the validator's 177 problems, so it is not released);
  * the "loaded configured checkpoint" audit line is there.
  * A second load while one runs gets 409. Reload shows "(reset first)", and loading again gets 409. Reset gives 0 rows and preserved files unchanged.
  * No sideways scroll at 400 and 1024 px; axe clean; no page errors.
* **Roles on the load:** approver 403; client 401; no actor 401. A bad `sample` value (string, array, object, 100 kB) gets 400 in words.
* **C3.11 (item 3):** setting IMM 5257 to PDF upload + HAND_SCANNED through the Forms tab route adds one line for each of principal, spouse and child. Each says why, the menu greys Move and Remove with the reason, and axe is clean. Through the API, moving the line gets 409 (an approver gets 403). Changed back to PDF upload, the lines are gone. `lineOf` reads the old `SIGNED_PDF_UPLOAD` spelling; `fingerprintLine` is unchanged from main.
* **Suites I ran on this head:**
  * pass: engine 41/41, qa117 3/3, who_fills 28/28, who_fills_browser 27/27, s7_reset 4/4, s7_dialogs_browser 12/12, qa92_95_browser 23/23;
  * fail: **check_qa91_who_can_be_run 7/16** and **check_qa91_who_can_be_run_browser 8/10** (see M1).
* **P-184 helper (item 4):** small and correct. Busy means load above the core count, and the time is always printed. Its own check covers the edge case (load exactly equal to the core count is still judged). I found no code cause for r1c's 260–290 ms; I treat it as environment, as briefed.
* **Shared ledger (item 5):** the checks read `LEDGER_DIR`; queue_tx confirms the ledger is unchanged.

## Issues (Must = Blocker/Major, Should = Minor)
| # | Sev | Where | Failure scenario | Fix |
|---|---|---|---|---|
| M1 | **Major (Must)** | `api/src/people-ai.ts:36` against `api/src/sources.ts:454` | On a fake-launcher check copy, Who can be › AI now shows as approved, but every live round is refused by main's `aiLive()` gate. The run fails at once ("The AI service did not answer this time"), and run-suites fails QA-91 (9 + 2 FAIL). The founder rule forbids setting `STUDIO_AI_LIVE` on check copies, so the check cannot pass on any copy. | Make the two gates agree. Either `launchOnce` admits live when `usesFakeLauncher()` (it cannot reach a model), or `LIVE_APPROVED` also needs `aiLive()` and the QA-91 checks test the refusal path. Lead's choice; rerun both QA-91 checks. |
| M2 | **Major (Must)** | `engine/sources.ts:230-264` (lines only in `checklist`); `engine/render.ts:177` / `engine/runtime/preview.ts:104` | A Visitor visa or work-permit line is set to PDF upload, signed by hand and scanned. The Documents tab says each signer is asked for "IMM 1295 signed by hand and scanned", but Preview by person (row 8) and so the case never list it: preview JSON has no signed-scan line. The comment "asks each person… a release carries it" is not true at runtime (C3.11 "adds its… document requirement for that person"). | Add `signedScanLines` to render's document checklist (the same pure function), with a preview test. Or have the Lead record C3.11 as "configurator view only" with runtime as a named follow-up. |
| m1 | Minor | `api/src/demo.ts:60-63` | `POST /demo/load` with body `[1,2]` (or any array) gives 201 and loads the old suites' fixture: `body?.sample` is undefined, so the guard is skipped. | Treat any body that is not an object, or has no `sample`, as the fixture only when the body is truly absent; otherwise 400. |
| m2 | Minor | `api/src/demo.ts:245` (`said`) | Under load, `sources.apply`'s default 5 s transaction (`sources.ts:781`, no `QUEUE_TX`) can expire. Row 4's "why" then shows Prisma's raw message, with a server file path, in the checkpoint dialog. | Map errors that are not `HttpException` to plain words (as the ingest does), and keep the raw text in the log. |
| m3 | Minor | `api/src/proposals.ts:214` | The comment says "Every queue transaction takes this option", but `decideNew` (`sources.ts:724`) and `apply` (`sources.ts:781`), both driven by the loader, still use the 5 s default. Under the load that motivated the fix, the configured checkpoint can still lose a form at apply. | Pass `QUEUE_TX` to `apply` as well (same narrow cross-lane touch), or correct the comment and note the risk in c10.1-plan. |
| m4 | Minor | `api/src/proposals.ts:290,324` | Decide and undo past 60 s reach the generic 500 filter: no 503 and no plain reason, unlike the ingest. Nothing leaks (the filter hides it). | Same `.catch` mapping as `sources.ts:605`. |
| m5 | Minor | `api/src/studio.ts:505-509` (reached via `PATCH /requirements/signed_scan:…`) | Retiring a signed-scan line by API gives 404 "no such definition", not the 409 "Follows its form line" that move gives. The words are unclear for a direct caller. | Refuse `signed_scan:` lineages in `saveRequirement` with the same 409. |

## Journey score (reviewer role; QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Checkpoint loads and Reset works; release rows are honestly Waiting (Visitor visa 177 problems, IMM 5257 has no map); C3.11 lines missing from Preview (M2). |
| Next step obvious | 1 | Each waiting row says why and what it waits for; menu says "reset first". |
| Plain words | 1 | Rows, 400s and 409s in words; m2 only under load. |
| Feedback and state | 1 | Busy button, double load 409, step log in a details block, timings returned. |
| Correct data | 1 | No WAITING items, no self-approval, counts match, no release invented, no LIVE job. |
| Error recovery | ½ | Reload and reset recover; QA-91 AI now fails with no way forward on check copies (M1). |
| Accessibility and sizes | 1 | Keyboard path, focus in dialog, axe 0 on dialog and Documents tab, 400/1024 no sideways scroll. |
| Speed | 1 | 16.5 s for the whole checkpoint on a quiet Mac (Lead target ≤ 60 s). |
| Visual quality | 1 | Team components, Pill tones per status, table fits 1024. |
| Trust and sources | 1 | US$0 stated and true; Sample labels; replay named; signed scan says why. |
| **Total** | **9 / 10** | Pass (8+ and no 0). Raise: fix M2 (task), M1 (recovery). |

## D1–D20
I did not score the dimensions one by one: this is a multi-item lane PR with no single concept.md. D17 and D20 are simulated only; no intended user walked it.

## What I could not check
* A real screen reader, or the founder's unaided walk.
* `graph.mjs`: it always rewrites tracked `qa/graph.json`, and I may write only this file. GRAPH.md on main does not yet name C3.11 or C10.1; the PR's checks name both.
* A natural repeat of the transaction expiry under heavy load. The pass and fail sides were proven only through `STUDIO_SLOW_TX`, by the builder's run.
* The full run-suites: I ran the suites not already listed as passing.

**Verdict: Block.** To fix: M1, M2 (or the Lead accepts M2 as a recorded follow-up); m1–m5 are Should.
