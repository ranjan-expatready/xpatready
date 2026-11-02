# Break report: D1 / P-226 "Reset to the six" (PR #407, head 123a1c5a)

Breaker run, 2 Nov. Isolated copy `brk407` on :4438 only (fresh database `xr_studio_brk407`). Live AI off, no `*_LIVE` set, US$0.
Scope: `POST /api/demo/reset-to-six`, `Demo.resetToSix` (`api/src/demo.ts:101-111`), `ResetToSixDialog` (`web/src/App.tsx:305-322`).
Recorded below are findings first, then what held. Repro helpers were scratch scripts (curl + psql, Playwright on Chrome); none are committed.

## Findings

### M1 (Major): a blank Reset during Reset to the six leaves rows of the deleted workspace that no reset ever removes
- **Repro:** fixture loaded (`POST /demo/load {}`), then `POST /demo/reset-to-six {"confirm":"RESET"}` and, 1 s, 5 s, 10 s, 12 s or 15 s later, `POST /demo/reset {"confirm":"RESET"}` (a second tab or a second person; the menu keeps "Reset demo…" enabled during the run).
- **Expected:** either the blank Reset gets a 409 while the six load, or the six load stops and leaves nothing of the old workspace. P-226 says configuration is "emptied", and the PR says a failure leaves "a clear state".
- **Actual:** Reset to the six gets a 500 and the blank Reset gets a 201. Rows with a `workspace_id` that no longer exists remain. After five races they were `gov_form_def 4, form_edition 4, intake_item 2, audit_event 10`. The load had captured the old id, and its in-flight service calls plus its own `audit.log(workspaceId, … "failed" …)` (`demo.ts:90`) write under the deleted id. The next Reset to the six or blank Reset reports `remaining_rows: 0`, but the rows are still in the database. `reset()` sweeps only stray `person_role` rows (`demo.ts:478`).
- **Check:** `select count(*) from gov_form_def where workspace_id not in (select id from workspace)` gives 4 after the race and still 4 after two more full resets.
- **Note:** the PR's Question 2 accepts the unguarded blank Reset as unchanged. This is the cost of that choice: permanent orphan rows and a "0 rows remain" report that is not true. One fix would be for `reset()` to take or respect `this.loading`.

### M2 (Major): after a midway 500, the screen keeps showing the old workspace
- **Repro (browser, 1440):** fixture loaded, Immigration programs shows "Retail 21". Run Demo › Reset to the six…, type RESET, press Enter. Then make the load fail midway. Here a blank Reset at +5 s did it; the PR's own wave1.json-missing case behaves the same, because the cause is in the client.
- **Expected:** the screen matches the database, which is now emptied.
- **Actual:** the toast gives the reason. After Cancel, the page still shows "Retail 21 … Corporate and employers 8" and the old cards (scratch screenshot `fail-midway-behind.png`). Only a manual reload shows "Retail 0". `useAction` invalidates queries only in `onSuccess` (`web/src/lib/api.ts:50`), and `ResetToSixDialog` passes no error handling (`App.tsx:307`). Every card and link on the stale page now points at deleted rows. The PR advertises this failure path as "a clear state", and the server state is clear, but the screen is not.

### m1 (Minor): the 500 message shows Prisma internals and absolute server paths to the person
- **Repro:** the race in M1 or M2.
- **Toast and body:** `Loading stopped after: program "Study permits" (Sample). Reason: Invalid \`this.db.workspace.upsert()\` invocation in /home/user/wtd1/…/studio/api/src/core.ts:107:39 104 constructor(@Inject(Db)… The configuration was emptied but…`. A variant gives `…draftingJob.update() invocation in …/api/src/sources.ts:197:33`.
- **Expected:** plain words (STANDARDS: say what happened and what to do), without the file system layout. The message also lands in the activity record (`demo.ts:90`). The formatting is older code (`loadClaimed`), but this new route is what exposes it to a demo user.

### m2 (Minor): Back during the run closes the dialog, the result is lost, and nothing shows that a reset is running
- **Repro (1024):** open `/structure`, then `/`, then Demo › Reset to the six, RESET, Enter. Press browser Back at +3 s.
- **Actual:** the dialog is gone (`dialogs 0` on `/structure`) and the request carries on server-side. The six arrived, and the done dialog with "byte-identical" never shows. A reload during the run behaves the same: the Structure is half-built with no running indicator. The menu offers "Reset demo…" (see M1). If the person retries Reset to the six, the 409 toast is clear and correct.

### m3 (Minor): the confirmation is also accepted as a form post
- **Repro:** `curl -X POST :4438/api/demo/reset-to-six -H 'x-actor: user-A' --data 'confirm=RESET'` (form-urlencoded) gets 201 and a full reset.
- **Impact:** low. The `x-actor` header blocks a cross-site form, and the blank Reset accepts the same. Noted because the route is destructive and the body type is not checked.

## What held
- **Confirmation (API):** missing, `{}`, `[]`, `null`, a bare `"RESET"`, `reset`, ` RESET`, `RESET `, `R E S E T`, `["RESET"]`, `{"0":"RESET"}`, `true`, full-width `ＲＥＳＥＴ`, `RESET`+zero-width space, `RESET-TO-SIX`, non-JSON, `?confirm=RESET` and text/plain all got 400 "Type RESET to confirm." with the workspace unchanged. `GET` got 404.
- **Who may call:** user-P, user-Q, user-O, user-R, user-S, user-B and user-C, and the personas approver, client, officer and sme, all got 403. An empty, unknown or missing `x-actor` got 401.
- **One at a time:** a triple call gave 1×201 and 2×409. Reset to the six against Load sample "six" and "configured" in both orders gave one 201 and the rest 409, always with exactly 6 combinations and one workspace. A simultaneous blank Reset and Reset to the six (×3) left one workspace and either 6 or 0 combinations; the loser got 404 "removed by a reset" and nothing doubled.
- **Client abort:** a client that drops the connection at 3 s does not stop the server, and the six arrive (6 combinations, 139 proposals). A retry while it runs gets 409.
- **A call right after a failed one:** the 500 releases the claim, and the next Reset to the six gives the six (6, replayed 6).
- **With a case:** a released fixture case with people, team and a prepare read was removed completely: `runtime_case`, `party`, `party_profile`, `party_relationship`, `case_participant`, `case_team_member`, `answer_subject` and `pack_work_pin` all went to 0. Configuration rows such as fields, sections, checks, rules, document types, releases and the field map also went to 0 (table-by-table counts before and after).
- **Saved AI results:** every run gave `drafts.replayed 6`, `status COMPLETED`, 139 proposals waiting, all `ai_batch` mode REPLAY and none LIVE. `preserved_unchanged: true`, and all seven fingerprints, ledger included (`1bf09f2b7bfc…`), were identical before and after the whole session.
- **Committed files:** 378 files under p1/inventory, p2/jobs, p2/runs and p5/reader/runs have the same SHA-256 before and after. `git status` of the clone shows nothing from this run. The only untracked files are two other reviewers' notes in this folder.
- **Var files:** old `workspaces/demo` files are removed (56 removed, then 0 remaining after the races). No stray files are left after a midway failure.
- **Dialog:**
  - **Keyboard:** the field has focus on open.
  - **Typed variants:** `reset`, ` RESET`, `RESET `, zero-width, full-width and `RESE` keep the button off, and Enter sends nothing.
  - **Escape:** Escape before confirming closes the dialog with no request and clears the field on reopen. Escape at +100 ms and at +8 s while running keeps the dialog open.
  - **Repeated clicks:** a triple click plus Enter plus another click sent 1 request and logged 1 reset.
  - **Result dialog:** titled "Reset to the six: done", with the byte-identical line.
  - **200 % zoom (640×400):** no sideways scroll, the footer button stays visible and the body scrolls to the field.
  - **Slow or long run:** the button stays busy for about 19 s.
- **Pre-existing, not D1:** 4 of 5 `finder_propose` replays fail with "No saved AI answer for these exact pages yet", identically with plain Load sample "six". The dialog's "Form finder … replayed" copies the existing Load sample wording.

Copy stopped (`isolated.sh brk407 4438 stop`). No product file changed.
