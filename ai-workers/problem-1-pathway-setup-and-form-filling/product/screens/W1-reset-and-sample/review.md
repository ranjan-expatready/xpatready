# Review: PR #407, D1 / P-226 "Reset to the six" (head 123a1c5a)

Reviewer agent, 2 Nov. I did not build this. Sources: P-226 and BACKLOG row D1 (branch `lead/2026-11-02-night-report`), the PR body, the diff against origin/main, and the running app. All runs were on one isolated copy at :4437. It ran from a private export of 123a1c5a (`git archive`), so its file renames could not reach the :4438 server that runs from `/home/user/wtd1`. Live AI was off, cost US$0, the spend ledger was unchanged, and wtd1 has no changes. Journey report: `journey-test-reviewer-2026-11-02-d1.md` (**8.5/10, pass**).

## Verdict: Block (Ship after fixes). Two Majors, both small.

## Re-run on 123a1c5a (:4437, fresh copy for each suite)
`check_d1_reset_to_six.ts` 20/20 (51 s) · `check_d1_reset_to_six_browser.cjs` 20/20 · `check_s7_reset.ts` 4/4 · `check_s7_load.ts` 21/21 · `check_s7_dialogs_browser.cjs` 12/12 · `graph.mjs --check` exit 0. The route is tested by both new suites. G6 lists `features/demo-reset-to-six.ts` as "nothing imports", but that is a false positive: `features.ts:18` loads that folder by readdir.

## Code
* The `load()` → `loadClaimed()` split (`api/src/demo.ts:64-93`) leaves Load sample and the configured checkpoint unchanged. The claim is still taken before any await. The 409 for "Structure already has names" is still rethrown when nothing was logged, and `loading` is cleared in the caller's finally. The default `again` text is the old wording. The blank Reset (`demo.ts:451`) is untouched. check_s7_load and check_s7_reset are green.
* Permissions: `resetToSix` checks the author duty (`demo.ts:102`), and so does `reset()` (`:452`). The client, case officer and Approver get 403 and an unknown person gets 401 (suite). I saw it in the browser too: the Approver gets the toast "does not hold the author duty".
* Single-flight: the claim is taken synchronously before `reset()`. Two parallel calls gave 201 and 409 with words. A Load sample while it runs gets 409. Reloading the page mid-run and trying again gave a 409 with words. Only one workspace remained afterwards.
* Failure midway, server side: correct. I also tested a *partial* load, which the suite does not cover. I added a trigger in the isolated database that fails the 3rd combination insert. The result was a 500 saying "Loading stopped after: program "Work permits" … The configuration was emptied … choose Demo › Reset to the six again". The database then held 2 combinations, 11 names and 17 attachments. After I dropped the trigger, a retry gave 201 and exactly 6 combinations.
* Saved AI results: `preserved()` fingerprints were unchanged, the suite's p1/p2/p5 snapshot was clean, there were 6 REPLAY drafting jobs, 0 LIVE batches and the ledger was unchanged.

## Issues
1. **Major (Must): the failure-midway test renames a tracked product file in the shared source tree.** `tests/check_d1_reset_to_six.ts:101` renames `studio/samples/wave1.json` for the length of a whole Reset to the six request (several seconds: the reset part, then the read). Two risks:
   * (a) `isolated.sh` runs every copy from the same checkout (`cd "$STUDIO"`). During that window, every server started from that tree fails Load sample, the configured checkpoint and Reset to the six. On the Mac that includes :4400 whenever the suite runs in the main copy. Here, the :4438 server of another agent runs from `/home/user/wtd1`, the same tree this suite would rename in.
   * (b) There is no signal handler, so `finally` does not run on SIGTERM or SIGKILL. `run-suites.sh:147` stops a suite with `timeout 1200`, and `fetch` has no timeout, so a hung request (or Ctrl-C) leaves `wave1.json.d1-away`. Then the tracked file is deleted, :4400's Load sample is broken, every s7 suite fails, and a careless `git add -A` commits the deletion.
   * The planted file in `p2/jobs` (`:92-94`) has the same weakness on a smaller scale.
   * **Fix (no product hook needed, verified on :4437):** inject the failure in the copy's own database. Before the call, the suite runs through its existing `sql()`: `create function … raise exception …` plus `create trigger … before insert on combination` that fires once 2 combinations exist. It drops them in `finally`. A killed run then leaves only an isolated database that `isolated.sh start` drops anyway. This also covers the "partly loaded" case the PR describes. For the fail-guard, plant into a temp copy of a watched folder, or snapshot a temp directory, instead of `p2/jobs`.
2. **Major (Must): after a failure midway, the screen shows a configuration that no longer exists.** `useAction` invalidates queries only on success (`web/src/lib/api.ts:51`), and the error appears only as a toast that disappears after 9 s.
   * Journey J4: the database held 2 combinations, but behind the dialog and after Escape the catalogue still showed "Retail 5 · Corporate and employers 1", "Draft · 7 changes" and "To review 6" (screenshot j4-behind).
   * P-226 / D1 asks for a clear state, and EXPERIENCE §4 [M] says errors are shown in place with the fix.
   * **Fix:** in `ResetToSixDialog` (`App.tsx:308`), invalidate all queries on error as well (an `onError` in that call, or an `invalidateOnError` option), and show the server's words in a danger `Notice` inside the dialog, which stays open with RESET typed, ready to retry. A step in the browser suite: force the failure (the trigger above), then check that the catalogue count matches the database and the notice is shown.
3. Minor (Should): the dialog's "Comes back" says saved answers are replayed, but it does not say that 8 forms then wait for Draft with AI and 4 show "Not found · Upload PDF". The Load sample dialog says this (`App.tsx:226`). The done dialog shows it, but only after the action.
4. Minor (Should): "(P-148)" in the dialog copy (`App.tsx:315`) is a decision number, which EXPERIENCE §5 keeps off the main path. Load sample has the same with P-112. It is demo chrome.
5. Minor (Should): the 500 message embeds the raw reason. For a file problem that is "ENOENT … open '/home/…/samples/wave1.json'", a file path on the main path. This text comes from the old `load()` catch.
6. Minor (Should): the confirmation label runs into the field ("confirm[field]") with no gap (`App.tsx:319`, screenshot j1-dialog-1024). The blank Reset dialog has the same.
7. Minor (Should): there is no progress during the about 20 s run, only the busy button. After a reload mid-run, nothing says a reset is running until a second try is refused. The pattern is inherited from Load sample.
8. Minor: the blank Reset still does not refuse while a load or Reset to the six runs (PR question 2, out of D1's scope). I agree it should be a later small fix.
9. Minor: the browser double-click step would also pass without the UI ref guard, because the server's 409 keeps the reset log at 1. What makes it meaningful is "no error toast shown". That is fine; I only note it.

## [M] lines (standards) touched by this PR
Met: §6 authorisation on the server, deny by default · §3.10 pass and fail tests per rule (removing the `loading` check or the `again` text fails the suite) · axe on every dialog state · keyboard path · 1024 px and 200 % zoom (J2: no sideways scroll, button reachable) · demo chrome separate (Demo menu) · Problem Details (500 with detail). EXPERIENCE §4 error state: **not met** (issue 2). §4 "background work never inside a web request": not met, but this is the same accepted demo-scaffolding pattern as Load sample and Reset, so not a finding here. §5 copy: minor (issues 4 and 5).

## D1–D20 (scored only where this PR shows evidence)
D1 5 (both P-226 halves plus kept results, tested) · D2 5 (nothing doubled; 409 on Load after it) · D3 n/a · D4 n/a · D5 3 (single-flight and retry are good; stale screen after a failure, fragile test, issues 1 and 2) · D6 4 (reset log and audit line) · D7 5 (REPLAY only, fingerprints shown) · D8 4 · D9 5 (one item, one confirmation, then Continue lands on the six) · D10 4 (Goes / Comes back / Kept plain; P-148, ENOENT) · D11 3 (no progress; error only in a toast; stale view) · D12 4 · D13 5 (axe clean; 400/1024/1440; 200 %; keyboard) · D14 4 · D15 4 (20 s, within the "about half a minute" stated) · D16 4 (good coverage; failure test unsafe) · D17 and D20 simulated only · D18 4 · D19 n/a for this item.

## Not checked
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); CI on GitHub machines (I re-ran locally only); `check_qa145_clean_clone.ts` and `count-any.mjs` (not re-run).

**Verdict: Block** on 123a1c5a. To fix: (1) move the failure-midway test off the tracked `samples/wave1.json` rename (and the `p2/jobs` plant) to a failure injected in the isolated database; (2) after a Reset to the six failure, refresh the page data and show the error inside the dialog.

## Round 2: head 96b9cf3b (reviewer, 2 Nov)
Run on a fresh private export of 96b9cf3b (`git archive`, web rebuilt), isolated copy on :4437 only, with a fresh database for each suite. Live AI off, US$0.
Suites: `check_d1_reset_to_six.ts` 25/25 · `check_d1_reset_to_six_browser.cjs` 25/25 · `check_s7_reset.ts` 4/4 · `check_s7_load.ts` 21/21 · `check_s7_dialogs_browser.cjs` 12/12 · `check_qa145_clean_clone.ts` 8/8.

**Round 1 Majors: both closed.**
1. The failure-midway test no longer renames `wave1.json`. It refuses the 3rd combination with a trigger in the copy's own database and drops the trigger in `finally`. The fail-guard uses `mkdtemp`. After the run `samples/wave1.json` is present, and nothing is written in tracked folders.
2. Re-walked J4 in the browser with my own trigger. The dialog stays open with a danger notice ("Reset to the six stopped …", role=alert), RESET still typed, and the button reads "Try again". There is no toast over it. All data is refreshed: the catalogue behind went from Retail 21 to the new state. Reopening clears the notice; a retry gives exactly 6. The 500 message is now in plain words, and the database error is only in the server log.

**Breaker M1 race, re-tried** (fixture loaded; Reset to the six, then a blank Reset 1, 5, 10, 12 and 15 s later): the blank Reset got 409 "A sample load or Reset to the six is running…" each time, and Reset to the six got 201. Each run ended with 6 combinations, 1 workspace and 0 rows of a deleted workspace in any table. In the reverse order (blank Reset first, then Reset to the six and Load sample at +0.2 s), both got 409.

**Orphan sweep (`demo.ts` `sweepOrphans`), checked for safety:**
* **Which tables:** the column list gives 63 base tables with `workspace_id`, all `uuid NOT NULL`, with no views. So `NOT EXISTS` can never match a NULL or global row. Tables without a workspace id (`person_preference`, `answer_list_value`, `extension_code_try`, `filing_applicant`, `_prisma_migrations`) are never touched. The ledger and saved AI results are files, and `preserved_unchanged` was true.
* **A live workspace:** I added a second workspace with a built-in `person_role` and a `gov_form_def`. Both survived a blank Reset and a Reset to the six. The demo's 6 built-in roles are recreated by `ws.id()` after the sweep.
* **A request that writes during a reset:** `ws.id()` upserts a new workspace, and its rows are not deleted.
* **Delete order:** I planted rows under a workspace id that does not exist: `program_def` with a `combination` that restricts its deletion, plus a `gov_form_def`. The next reset removed all three. The longest restrict chains in the schema are 3 tables (`pack_work_pin → config_release → pack_version`, `runtime_case → combination → program_def`), so 4 passes are enough. The workspace-less children cascade.
* **Bounded and fast:** one pass is 63 deletes, 44 ms in total (largest 3.4 ms) on the six. There are at most 4 passes. A blank Reset took 0.27 s.
* **Its only weakness:** `catch { blocked.push(t) }` swallows every error, so a table still blocked after 4 passes, or a non-foreign-key error, leaves its rows with no trace.

**New minors (Should):**
* Log any tables left after the last pass (`console.warn` or a field in the reset result), so "0 rows remain" can never be silently untrue again.
* The ghost-row test covers only `gov_form_def` and `audit_event`. One restrict pair (`program_def` + `combination`) would prove the multi-pass order.
* The blank Reset now refuses with 409 during a load. P-226 says "Reset itself is unchanged", so this one deliberate change should be named in the PR for the Lead.

**Carried minor:** still no progress during the about 20 s run. **Journey score, round 2: 9.5/10** (plain words 1, feedback and state ½, error recovery 1; the rest as before).

**Verdict: Approve** on 96b9cf3b. No open Blocker or Major.
