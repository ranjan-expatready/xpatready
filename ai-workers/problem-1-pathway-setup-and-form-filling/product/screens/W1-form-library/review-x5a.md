# X5 slice a: fill the form library from IRCC's forms list. Independent CHECK of the second fix, 31 Oct 2026

Reviewer: I did not build this. I reviewed **commit 5a5f0d16** (`claude/forms-x5a-library-06zafk`, PR #138). It answers the review of 86f9447c (Ship after fixes, 9/10, one Major: STANDARDS §9). I checked it against P-156 (1), plan-p156 P156-1 and P156-2, STANDARDS §9 and QUALITY D1–D20.

**How I tested.**
* **Copy and suites.** My own isolated copy `rvx5c` on :4457, with its own ledger directory and the web built from this commit. `check_forms_x5_library.ts` passes **30/30**. `check_forms_s4_library_browser.cjs` on a fresh copy passes **79/79**; I put its rewritten screenshots back with `git restore`. `tsc --noEmit` on the web is clean.
* **Graph.** `graph.mjs` gives G1–G6 0/0/2/0/0/0, unchanged. The two G3 routes predate this PR.
* **My own checks.** A Playwright journey and timing scripts (`/tmp/rv6/`, outside the repo), each run twice. Browser rows compared with `GET /library/forms/list?…`. SQL seeding on `xr_studio_rvx5c` for the "newer" rule. Real parser plus plan on a twice-listed number.
* **Spend: US$0.** No AI, no `*_LIVE`. `git status` is clean apart from this file and the journey report. The copy is stopped.

Verdict: Ship after fixes

**Why.** Search, the Used-by select and every chip that narrows the list are now well inside 200 ms. The browser filter gives the server's rows in 96 of 96 combinations. The table, the drawer and Undo still update. The twice-listed fix and the double-click guard hold. One standard is still not met: every action that brings the whole list back takes **170–430 ms** (issue 1, Major). The builder's timing step only times actions that narrow the list.

## The earlier findings
| Finding (review of 86f9447c) | At 5a5f0d16 (my evidence) |
|---|---|
| M1, §9: search and the first filter press | **Narrowed, not closed.** Search: 50 timings over 10 terms, median 39 ms, max 72 ms. Narrowing chips: median 30–129 ms, max 157 ms (No file yet, 222 rows). Used by, 6 combinations: median 43 ms, max 46 ms. 0 list requests while filtering. **Going back to the whole list is over budget:** issue 1 |
| m2: the fill's "newer" words against the list | Holds on every state the product creates (the suite's new step; my run). It is the same comparison written twice over different editions: issue 2 |
| m3: four fixes with no failing check | Said in the commit message as "verified by the reviewer by hand … noted in the PR". The PR body and comments do not say it. Still no check: issue 3 |
| m4: a double click sends two fills | **Closed.** Double click → 1 audit line; triple click → 1 audit line (`inFlight` ref, `library-forms.tsx:210-214`). No check: issue 3 |
| m5 (question for the Lead) | Carried; the PR's Questions 1–2 stand |
| Devin, twice-listed number | **Closed.** Real `parseFormsIndex` on a checklist row and then a form row for IMM 4444: create and match both take the form row's title, page and date (`library-index.ts:30-37`). The suite step asserts all four fields. The recorded index has no twice-listed number (230 rows, 230 numbers) |

**The browser filter is the server's filter.** Same fields, same trim, same `normaliseCode` second term (`library-forms.tsx:67-72` against `form-library.ts:113-115`). "IMM 5373B", "imm 0008 sch4a" and "IMM 0008SCH4A" each give the one stored row. All 10 terms, 8 chips, 6 combinations and 96 type × status × search × used-by combinations gave the same rows in the same order as the API. The server's `?type`/`?status`/`?usedBy`/`?q`/`?for` API is unchanged (`form-library.ts` changes only in `fillFromIndex`).

**The memoised table updates.** Its callbacks only call state setters or refs (`setOpen(r)` never reads the stale `opened`). It re-renders on `rows` (from `lib.data`) and `canAuthor`. On IMM 5373 B: Delete → reason → send → row "Deletion waiting", action Withdraw (DB `DELETE:WAITING`) → drawer says it waits → Undo → row back to Delete (DB `WITHDRAWN`).

## Issues, ranked
1. **Major (Must): STANDARDS §9 [M] "filter, search < 200 ms" is still not met when the result is the whole list (D15).** Measured in the page, from the event to all 237 rows on screen, 7 runs each, two runs:
   * Clear the search (from "IMM 5257"): median **402 / 429 ms**, range 323–526 ms.
   * Used by → Any combination: median **370 / 339 ms**.
   * Ready chip pressed off: median **311 / 385 ms**.
   * All chip, from Guides: median **316 / 325 ms**, max 488 ms. From Forms: **170 / 194 ms**, max 249 ms.
   * Before the fill (16 rows) every one of these is fast.
   * The search box itself paints in 3 ms (`useDeferredValue` works), but the rows arrive late.
   * **Cause:** mounting about 230 rows, each with several `Tip`s, `RowAction` and the `RowActions` menu, costs about 1.5–2 ms a row (`library-forms.tsx:107-134`). Memoising the whole table does not help when the row set changes.
   * **Fix:** mount each row once, memoised by number, and hide the rows the filter leaves out instead of unmounting them. Lighter rows would also do. Add timing steps for All, a chip pressed off, a cleared search and Used by → Any to `check_forms_s4_library_browser.cjs`. Its current step (`:262-269`) takes the *best* of three narrowing searches and one Guides press, so it would not see this.
2. **Minor (Should): the "newer" rule is two copies over different editions (D6, D10). This is Devin's open thread on 5a5f0d16 (`form-library.ts:168-169`).**
   * The list compares the newest **approved** edition (`newestEdition` of approved, non-online files with a checksum, `:83-96`).
   * The fill takes the latest `canadaUpdated` of **every** non-online edition, and counts any of them as a file (`:168-169`, `library-index.ts:41-43`).
   * **Repro, seeded by SQL:** IMM 1295 and IMM 5257 have usable files dated 2023-06 against an index date of 2023-09. IMM 1295 also gets an unapproved edition dated 2025-01, and IMM 5373 B an unapproved edition with no date. The fill then says "2 with a newer edition (IMM 5257, IMM 5373 B)". The list shows IMM 5257 Newer, **IMM 1295 Ready** (its mark suppressed) and **IMM 5373 B No file yet**. The chip says "Newer on canada.ca 1".
   * Intake creates editions only once approved (`intake.ts:310-353`), so I found no product path to this state. Severity is Minor for that reason.
   * **Fix:** pass the list's own current edition (approved, newest) to `planIndexFill`, both for `hasFile` and the date. Or answer Devin's thread with this evidence.
3. **Minor (Should): three fixes have no check that fails without them (D16).** The double-click guard, and two of the earlier four (the current-check clear at `form-library.ts:189`, the m8 words at `:161`). The commit message says they are "noted in the PR", but the PR body does not note them. **Fix:** add the steps, or note them in the PR as the commit says.
4. **Minor (Should): clearing a search that matched nothing shows "No forms yet" for about 280–390 ms (D11).**
   * The wrong empty state, which tells the person the library is empty, appeared 3 of 3 times. Screenshot: `journey-test-reviewer-2026-10-31-x5a-5a5f0d16.md`, J2.
   * **Cause:** `filtered` reads `q` while `rows` reads the deferred `dq` (`library-forms.tsx:106`).
   * **Fix:** compute `filtered` from `dq`.

**Outside this slice (carried, not a finding).** The upload reader still ignores a letter suffix (`tools/read_form_identity.py:25`).

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 5 | P156-1 and P156-2 met end to end in the screen |
| D2 | 5 | One row per number; twice-listed row kept whole; no duplicates |
| D3 | 5 | Library spelling everywhere; browser and server agree 96/96 |
| D4 | n/a | No rule paths touched |
| D5 | 5 | Double and triple click → one fill, one audit line |
| D6 | 4 | Counts true; fill and list rules can disagree on seeded data (issue 2) |
| D7 | 5 | No AI, no download, US$0, said in tip and message |
| D8 | 5 | Shared library › Forms, unchanged |
| D9 | 5 | Ready / No file yet chips; filters agree with the server |
| D10 | 4 | Words agree on real data; issue 2 on seeded data |
| D11 | 4 | Message 113 ms, focus kept; wrong empty state flashes on clear (issue 4) |
| D12 | 5 | Team look at 1440, 1024 and 400 px |
| D13 | 5 | axe 0 at 1440, 1024, 400 and 720×450 (200 %); no sideways scroll; keyboard path 16 Tabs |
| D14 | 5 | Team components and words |
| D15 | 3 | Narrowing in budget; whole list back 170–430 ms (issue 1) |
| D16 | 4 | 30 + 79 green; timing step blind to issue 1; three fixes without a check (issue 3) |
| D17 | simulated only | No intended user walked it |
| D18 | 5 | Each listed row links its canada.ca page; "Listed by IRCC" names the origin |
| D19 | 5 | Listed forms reach uses, delete, Withdraw and Undo in the screen |
| D20 | simulated only | — |

## Journey score: 9 / 10 (pass; no criterion at 0)
Report: `journey-test-reviewer-2026-10-31-x5a-5a5f0d16.md`. Speed ½ (issue 1) and feedback and state ½ (issues 2 and 4); every other criterion 1.

## What I could not check
* **CI.** The run on 5a5f0d16 (41179957573) did not start: GitHub refused the job for the account's billing or spending limit. No test ran there. This needs the founder.
* canada.ca live: I used the recorded copies only.
* The finder end to end, because it needs AI rounds.
* A real screen reader.
* An unaided walk by the configuration author (D17, D20).
* Timings come from headless Chrome in this sandbox, with no CPU throttle.

---

# Independent CHECK of the third fix: commit 57f7d79d, 31 Oct 2026

Reviewer: I did not build this. I reviewed **commit 57f7d79d** (PR #138). The coordinator merged origin/main into the checkout afterwards (head e849e9e6). The five X5 files (`form-library.ts`, `library-forms.tsx`, both suites) are byte-identical between the two commits, so I tested the X5 change at 57f7d79d. The web was built with `npx vite build`. This answers the review of 5a5f0d16 (Ship after fixes: M1 §9, m2 to m4).

**How I tested.** I used isolated copies `rvx5d` :4452, `rvx5d2` :4453 and `rvx5e` :4454, each with its own `/tmp` ledger, plus a mutation copy on :4455 built in `/tmp`, never in the repo.
* **Suites.** `check_forms_x5_library.ts` **31/31**. `check_forms_s4_library_browser.cjs` **80/80** (allMs 60, Guides 20, searches 26–44 ms). I put its rewritten screenshots back with `git restore`. `tsc --noEmit` is clean for web and api.
* **Graph.** G1–G6 0/0/2/0/0/0, unchanged; the two G3 routes predate this PR.
* **My checks.** A Playwright journey and timing script (`/tmp/rv7/`), run twice, and a frame trace. Browser rows compared with `GET /library/forms/list?q=`. Spend: US$0, no `*_LIVE`. All copies stopped; `git status` was clean before I wrote these two files.

Verdict: Approve

**Why.** No Blocker or Major is open.
* **M1 (§9) is closed.** Every action that brings the whole list back is now within 200 ms (table below).
* **The fill and the list use one "newer" rule.** Both now judge the same current edition (`form-library.ts:170-171` against `:83-84`). The new held-edition step **fails without the fix**: in the mutation copy with the 5a5f0d16 fill lines, 30/31, `{"newer":[],"status":"ready"}`.
* **Paging works.** A search finds rows beyond the first 50. The paging passes axe at 390, 1024, 1440 and 720×450.
* **What remains.** Three Minor items, each Should.

## The earlier findings
| Finding (review of 5a5f0d16) | At 57f7d79d (my evidence; 5 timings per action, two runs) |
|---|---|
| M1, §9: widening to the whole list 170–430 ms | **Closed.**<br>• All after Guides: 54–104 ms.<br>• Clearing the search: 64–113 ms.<br>• Show 50 more (expand): 79–161 ms in the page.<br>• "No file yet" off after all 222 rows were shown: 161–212 ms, 9 of 10 under 200 ms. The frame trace puts the first painted frame at 115–173 ms; my figure adds one frame for paint, so the 212 ms run is at the margin and I do not count it as a finding.<br>• 50 rows mounted at a time ("Showing 50 of 237"). |
| m2 / Devin: a held edition hides "newer" in the fill only | **Closed.** One current edition: `newestEdition` of approved, non-ONLINE editions in both places. The check fails when the fix is removed (above). Devin's thread is answered on the PR; it is still unresolved there (outdated). |
| m3: fixes with no failing check | **Mostly closed.**<br>• Double click: the new step counts one POST.<br>• Current-check clear: covered by the break M2 step.<br>• The m8 words ("recorded copies missing") still have no check: issue 3. |
| m4: "No forms yet" flashes on clear | **Closed.** `filtered` reads `dq` (`library-forms.tsx:113`). |

**Paging behaviour.**
* **Search beyond 50.** The search starts from the whole filtered list, not the page: "IMM 5508" (not in the first 50) → 1 row. "Application for a" → 11 in the browser = 11 from the API. "IMM" → "Showing 50 of 196", and the API returns 196.
* **Reset.** The limit resets on type, used-by, status and search (`:77`).
* **Opening a row.** Opening row 71's drawer keeps 100 rows mounted, and closing it returns focus to "IMM 0151".
* **390 px.** No sideways scroll (390/390). The pager wraps and fits (screenshot `/tmp/rv7/shots/r2-02-pager-390.png`). No console or page errors.

## Issues, ranked
1. **Minor (Should): keyboard focus is lost when the last "Show N more" is pressed (WCAG 2.4.3, EXPERIENCE 12 [M] keyboard path; D13).**
   * After "Show 37 more" the button unmounts and focus falls to `<body>`. The next Tab lands on the "Product Studio home" logo, so a keyboard user restarts at the top of a 237-row page. Seen 2 of 2 runs.
   * On the earlier presses focus stays on the button, below the new rows, so Tab skips them.
   * Fix (`library-forms.tsx:177`): on Show more, move focus to the first newly shown row's number button (row index = old limit).
2. **Minor (Should): paging is silent to a screen reader (WCAG 4.1.3; D11, D13).**
   * "Showing 50 of 237" is a plain `<span>` (`:177`), not a status. Pressing Show more announces nothing, and a filter that changes the total says nothing either.
   * The button's name, "Show 50 more", does not say of what.
   * Fix: `role="status"` on the count, and "Show 50 more forms".
3. **Minor (Should): the new paging has no check that fails without it, and one earlier fix still has none (D16).**
   * Not checked: the limit resetting on a filter change, a search finding a row beyond 50, focus after Show more, and the m8 words when the recorded copies are missing (`form-library.ts:161`).
   * Fix: add these steps to `check_forms_s4_library_browser.cjs` and `check_forms_x5_library.ts`.

**Outside this slice (carried, not a finding).** The table has no accessible name (`aria-label` empty; it predates this PR). The upload reader ignores a letter suffix (`tools/read_form_identity.py:25`).

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 5 | P156-1 and P156-2 end to end in the screen |
| D2 | 5 | One row per number; 237 browser = 237 API |
| D3 | 5 | Browser search and filters = server's, including past the first 50 |
| D4 | n/a | No rule paths touched |
| D5 | 5 | Double click → one fill (new check) |
| D6 | 5 | One current-edition rule in fill and list; mutation proves the check |
| D7 | 5 | No AI, no download, US$0 |
| D8 | 5 | Shared library › Forms, unchanged |
| D9 | 5 | Chips and pager work together; the limit resets on every filter |
| D10 | 5 | Same "newer" words in fill message and list |
| D11 | 4 | No wrong empty state; paging not announced (issue 2) |
| D12 | 5 | Team look at 1440, 1024 and 390 px |
| D13 | 4 | axe 0 in 4 sizes; focus lost after the last Show more (issue 1) |
| D14 | 5 | Team Button and words |
| D15 | 5 | Search, chips, widening, Show more all within 200 ms |
| D16 | 4 | 31 + 80 green; held-edition step fails without the fix; paging unchecked (issue 3) |
| D17 | simulated only | No intended user walked it |
| D18 | 5 | Listed rows link their canada.ca page; "Listed by IRCC" |
| D19 | 5 | Rows beyond 50 reach the drawer and actions |
| D20 | simulated only | — |

## Journey score: 9.5 / 10 (pass; no criterion at 0)
Report: `journey-test-reviewer-2026-10-31-x5a-57f7d79d.md`. Accessibility and screen sizes ½ (issues 1, 2). Every other criterion 1.

## What I could not check
* **CI.** The ci run on 57f7d79d (job 124480272071) and on e849e9e6 did not start. GitHub refused both for billing or the spending limit, so no test ran in CI. This needs the founder.
* canada.ca live (recorded copies only); the finder end to end (AI rounds); a real screen reader; an unaided walk by the configuration author (D17, D20).
* Timings are from headless Chrome in this sandbox, with no CPU throttle.

**Verdict: Approve** (no open Blocker or Major at 57f7d79d; the three Minor items above are Should).

---

# Independent CHECK of the follow-up: commit 310acb9c (PR #142, stacked on #138 at e849e9e6), 31 Oct 2026

Reviewer: I did not build this. I reviewed only `git diff e849e9e6 310acb9c` on `claude/forms-x5a-minors-06zafk`. It answers break M6 and m11–m12 of the 57f7d79d round, and review m1–m3 of 57f7d79d.

**How I tested.** I built the web with `npx vite build`; `tsc --noEmit` is clean for web and api. I used isolated copies `rvx5f` :4452, `rvx5g` :4453 and `rvx5h` :4454, each with its own `/tmp/rv8` ledger. A mutation copy `rvx5m` :4455 ran from `/tmp/rv8/mut`, never from the repo.
* **Suites.** `check_forms_x5_library.ts` **32/32**. `check_forms_s4_library_browser.cjs` **85/85**, twice on fresh copies. I put its screenshots back with `git restore` (slice3 only).
* **Graph.** G1–G6 0/0/2/0/0/0, unchanged. The two G3 routes are attachment routes that predate this PR.
* **My scripts.** A Playwright journey, timings and a double-Enter probe (`/tmp/rv8/scripts/`), each run twice. A differential check-canada and Replace run, old line against new.
* **Spend.** US$0, no `*_LIVE`. All copies are stopped.
* **Not run.** `check_forms_s4_finder.ts` (Replace C11.15) needs `STUDIO_AI_LIVE=approved`, so I tested Replace by hand instead (below).

Verdict: Approve

**Why.** No Blocker or Major is open.
* **M6 is closed.** The list, the fill and the check now read one current edition (`form-library.ts:63-70`, `:92`, `:180`, `:226`). With the old line put back, the new step **fails**, 31/32: `outcome:"current"`, "IMM 1295 (09-2023) (held copy) is still the current edition".
* **Focus after Show more and the reset are fixed.** The count is now announced.
* **What remains.** Three Minor items, each Should.

## What the coordinator asked
* **Setting state during render with the memoised table: safe.** `if (limitKey !== viewKey) { setLimitKey; setLimit }` (`library-forms.tsx:79-81`) runs before `pageRows` and `tableEl` are computed. React throws that render away and re-runs the component with `limit=50` before anything commits, so the memoised table never sees the old limit. The guard ends the loop on the second pass.
  * **Deferred search.** It works under `useDeferredValue`. The key uses `dq`, so the reset lands in the same render as the new rows. An abandoned deferred render drops its update, and the next render sees the key differ again.
  * **Data refreshes.** A refetch after Delete or Undo does not change the key, so the page keeps its rows, as wanted.
  * **Measured.** I pressed "No file yet" with all 237 rows shown. A MutationObserver saw **at most 50 rows** mounted on any frame (10 of 10). The list settled in **54–89 ms**, against 100–189 ms before. No React warning, no page error.
* **Focus with a screen-reader mindset: correct, with two gaps.**
  * **Where focus lands.** Each press puts focus on the first added row's number button: rows 51, 101, 151 and **201 on the last press**, in 2 of 2 runs. The name is "IMM 0017, button", inside the table, so the row and column are read.
  * **The count.** "Showing 100 of 237 forms" is `role=status`, so a count change is spoken politely after the focus move. The button reads "Show 50 more forms".
  * **The drawer.** From row 51, Escape returns focus to IMM 0017.
  * **The gaps.** Issues 1 and 2.
* **Does `currentEdition` change Replace? Yes, only where it should.** `replace` → `checkCanada` → `compareWithCanada` is the only caller (`form-library.ts:197`, `:292`).
  * **Every product path approves its editions.** Each path that creates a printed edition records its checksum as approved: the manifest, `approved_source`, or `official_download`, including the fingerprint match (`intake.ts:297-353`, `finder.ts:533/643`, `impact.ts:74`). So on real data nothing changes.
  * **Differential run.** I ran the same state (sample, rules finder, fill) in the PR copy and the old-line copy. check-canada on all 15 forms gave **identical** answers (8 current, 2 check, 1 no PDF, 4 not recorded). Replace on all 8 combination lines also gave **identical** answers.
  * **With a held copy.** I gave IMM 5409 a held copy carrying canada.ca's date and PDF. **Replace** on its line now answers `check`, the mark stays and the row says `newer_file`. The old code answered `current`, cleared the mark and the row read `ready`. Replace inherits the fix.

## Issues, ranked
1. **Minor (Should): a second Enter on Show more opens a drawer (D11).** Focus moves to the row's number button (`library-forms.tsx:85-88`), so the next Enter opens it.
   * **Repro.** Enter, then Enter again 30, 60, 150 or 400 ms later. Each time: 100 rows and the IMM 0017 drawer open, 4 of 4. This matches break m16.
   * **Why it matters.** A keyboard user pressing Enter for "50 more again" gets a dialog they did not ask for. It is recoverable with Escape, and no [M] line is broken.
   * **Fix.** Focus something that does not act on Enter: the new row (`tabIndex={-1}`) or its title cell.
2. **Minor (Should): the count is spoken only while the pager exists (WCAG 4.1.3 is met by the role; D11).**
   * The `role=status` lives inside `[data-show-more]` (`:187`).
   * **The last press.** The region unmounts, so nothing confirms that all 237 are shown.
   * **Back above 50 rows.** After a filter with 50 rows or fewer (Guides), going back to All inserts the region with its text already in it, which many screen readers do not speak. This matches break m17.
   * **Fix.** Keep one status region always mounted, for example "Showing all 237 forms".
3. **Minor (Should): the render-time reset has no check that fails without it (D16).**
   * I put the old `useEffect(() => setLimit(PAGE), …)` back into the mutation copy. The browser suite still passed, **85/85**: the "starts again at 50" step waits 300 ms, so it cannot see the extra render.
   * The paging steps do guard the rest: the e849e9e6 page stops the suite at the new button name, 77 passed and 1 failed.
   * **Fix.** Count the most rows mounted during a chip press made with every row shown, as in my MutationObserver probe (it must stay at 50 or fewer).

**Not findings.**
* **Show more timing (expand, §9).** Measured from click to focus on the new row plus one paint frame: 90–227 ms, median about 145 ms. 3 of 40 timings are over 200 ms, and only by the frame I add. The last review treated this margin the same way.
* **Words and readers outside this diff.**
  * **Break m18.** The check's words point to Find again, which cannot help when canada.ca's file is the held edition. No product path makes that state.
  * **Break m19.** Other readers still use the any-edition rule: `proposeAccepts` `form-library.ts:143`, `finder.ts:484/731/773`, `lifecycle.ts:327/401`. They predate this PR. The commit claims one rule for the list, the fill and the check, and that claim holds.
* **Carried from 57f7d79d.** The table has no accessible name. The m8 words still have no check. The upload reader ignores a letter suffix.

## D1–D20 (changes from 57f7d79d in bold)
| D | Score | Evidence |
|---|---|---|
| D1–D5 | 5 / 5 / 5 / n/a / 5 | Unchanged by this diff; X5 suite 32/32 |
| D6 | 5 | **One current edition for list, fill and check; mutation 31/32; Replace differential identical on real data** |
| D7–D10 | 5 | US$0; library path; chips and pager; same "newer" words |
| D11 | 4 | **Count announced on change; last press silent; second Enter opens a drawer (issues 1, 2)** |
| D12 | 5 | Team look at 1440, 1024 and 400 px |
| D13 | 5 | **Focus on the first added row, including the last press; axe 0 at 1440, 1024, 720×450 and 400; no sideways scroll** |
| D14 | 5 | "Show 50 more forms", team Button |
| D15 | 5 | **Chip from all shown 54–89 ms (was 100–189); Show more median 145 ms** |
| D16 | 4 | 32 + 85 green; M6 and paging steps fail without the fix; **reset step does not (issue 3)** |
| D17, D20 | simulated only | No intended user walked it |
| D18, D19 | 5 | Listed by IRCC with the page; rows past 50 reach the drawer |

## Journey score: 9.5 / 10 (pass; no criterion at 0)
Report: `journey-test-reviewer-2026-10-31-x5a-310acb9c.md`. Feedback and state ½ (issues 1, 2); every other criterion 1.

## What I could not check
* **CI.** The ci job on 310acb9c (124484351489) did not start: GitHub refused it for billing or the spending limit. No test ran in CI. This needs the founder.
* **The finder suite** (needs `STUDIO_AI_LIVE=approved`; Replace was covered by hand).
* A real screen reader; canada.ca live (recorded copies only); an unaided walk by the configuration author (D17, D20).
* Timings come from headless Chrome in this sandbox, with no CPU throttle.

**Verdict: Approve** (no open Blocker or Major at 310acb9c; the three Minor items above are Should and do not block).
