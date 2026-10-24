# F1 break report: qa Minors pass (QA-27, QA-31, QA-32, QA-33) · 24 Oct

Commit 514b91e, branch `claude/forms-f1-check-f6e7f2`, cloud clone. Isolated copy `forms_bk` on :4456 with the test-only fake launcher (`STUDIO_FAKE_LAUNCHER=…/tests/fixtures/fake-launch.mjs`); :4400 untouched. **No paid AI call (US$0).** Every "paid call" below is the fake launcher's `--live` call, standing in for the real one. Scope: the last section of `build-notes.md` only. Paths are relative to `prototype/studio/`.
**Totals: 0 Blocker · 2 Major · 6 Minor.** One Major (M2) already existed before this pass; it is listed because it sits on the ending path QA-31 rewrote.

## Major
**M1. A cancelled LIVE screen-map draft can still make the paid call.** The QA-31 check `cancelled()` runs once, before `launchOnce(jobId, "live")` (`api/src/forms.ts:553-555`). `launchOnce` can then wait a long time before it starts the launcher. It waits for its turn behind every other launch in the server (`api/src/sources.ts:346`). It also re-launches after a "ledger locked" refusal, up to 60 × 2 s (`sources.ts:349`). Neither wait checks for a cancel again.
* *A1 (ledger lock).* Scenario `locked_first`. Start a LIVE draft (confirmWorstUsd 0.43). Wait for the first live call ("ledger locked"), then `POST /ai/batches/:id/cancel` → 201 (`still_running: 1`). **Actual:** the launcher log shows `stub, live, live`. The second live call was made after the cancel. Job FAILED (with the fake's refusal), batch CANCELLED. **Expected:** no live call after the cancel, job CANCELLED "the AI call was not made".
* *A2 (same server, no other copy needed).* Start a live IMM 5406 draft in parts (stub and live each sleep 3–4 s). Then start a LIVE screen-map draft. Cancel it once its stub pass has passed the check, while its live launch waits behind part 1's live call. **Actual:** log `FM:stub, SM:stub, FM:live, SM:live, FM:stub`. The screen-map live call ran after a 201 cancel. Real field-map parts take minutes, so the window is minutes long, not milliseconds.
* The build notes' promise ("a cancel … means the paid call is never made") holds only for a cancel that lands before the stub pass ends.

**M2. A workspace reset while a screen-map draft runs crashes the API process.** Start a STUB draft (stub sleeps 4 s), then `POST /demo/reset {confirm:"RESET"}` → 201. When the stub returns, `done()` updates a job the reset deleted (P2025, `forms.ts:542`). The `catch` calls `done()` again (`forms.ts:564`), which throws again. The promise was started with `void`, so the rejection is unhandled and Node 24 exits.
* **Actual:** api.log ends with `PrismaClientKnownRequestError … No record was found for an update … at async done (forms.ts:543) … at Forms.runLeftovers (forms.ts:564)`. Every later request gets ECONNREFUSED. Reproduced twice.
* **Expected:** a quiet end, as the field-map worker does ("removed by a reset", `sources.ts` runParts).
* This already existed in slice 2 (the old `done` had the same throw-in-catch shape). QA-31 rewrote `done()` and kept the shape.

## Minor
**m1. Cancel during the live call: the batch says CANCELLED, but the draft can still be used and the audit line is false (A3).**
* Steps: cancel while the live call runs (sleep 3 s), and let a valid answer come back (13 × "not a fact", US$0.31).
* **Actual:** the job is COMPLETED with 13 proposals. The batch is CANCELLED with the message "completed · spent US$0.31" (`forms.ts:542-545`). A reviewer then accepted a proposal (201, accepted 1). A new LIVE start was answered by D3 with this same job (`reused: true`, US$0).
* The cancel's audit line says "its output will not be applied" (`api/src/ai.ts:276`), and so does the AI work page's notice. Field-map steps turn this case into CANCELLED (`ai.ts:230`); screen-map drafts do not.
* Reusing the draft saves money. What is wrong is the mismatch between the record and the words. Expected: one rule, either "kept and acceptable" or "not applied", the same in the batch, the job and the audit.

**m2. A restart turns a batch with a cancel asked for into FAILED, not CANCELLED (A4).** Start a STUB draft (stub sleeps 30 s), cancel (201), then `isolated.sh restart`. **Actual:** job FAILED, batch `FAILED | cancel_requested = t`, "The studio server stopped…" (`sources.ts:49`). `done()` would have said CANCELLED.

**m3. QA-27 covers only a list. Other bodies that are not one object still get parser text.**
* `"LIVE"`, `42`, `true`, `null` → 400 `Unexpected token '"', ""LIVE"" is not valid JSON`. `{bad` → `Expected property name or '}' in JSON at position 1`. The JSON body parser (`api/src/main.ts:162`) refuses these before `parse` sees them, so the new branch's `typeof input !== "object"` test (`forms.ts:84`) only ever fires for arrays.
* The retry endpoint answers `"x"` the same way.
* Accept with `inputs: [1, 2]` repeats "Name each input by its id, for example birthCity." once per bad item (`contracts/forms.ts:89`).

**m4. The batch view of a screen-map batch is missing fields the AI work page shows.** `GET /ai/batches/:id` returns no `operation_label`, `capability_note`, `totals` or job `source` (the batch plan is `{targets: []}`, `ai.ts:258`). The page heading (`web/src/pages/ai.tsx:57`) is then an icon with no title, and the Source column is blank. A FAILED screen-map batch (stub refused, restart, A1) shows "Retry 1 failed step" (`ai.tsx:51`), and the API always refuses it with 409 "started again from its online version". The web file is the screens lane's; the API answer that drives it (no label, retry offered) is this lane's.

**m5. Screen-map batches push field-map work off the AI work list.** Every start, STUB included, creates a batch, and `GET /ai/batches` shows the 50 newest (`ai.ts:264`). After one field-map stub draft and 50 stub screen-map starts, the list shows 50 screen-map rows and the field-map batch is gone (102 batches in the database).

**m6. Cancel and retry sent at the same moment: the cancel is lost.** On the failed QA-32 batch, `Promise.all([cancel, retry])` → cancel 409 "This AI work has already finished.", retry 201. Attempt 3 then ran to its end. The person who pressed Cancel is told the work has finished while a new attempt runs. (This is the existing order inside `retry`, which sets `cancelRequested: false` after the new steps are created.)

## What held
* **QA-31:** a cancel during the stub pass stops the paid call (lane test). A screen-map batch cannot be retried (409, plain words), and a second cancel is 409 "already finished". Endings: stub refused → job and batch FAILED; not cancelled → COMPLETED (lane test); cancelled → CANCELLED; restart → FAILED (see m2).
* **Roles and contracts:** cancel and retry as the reviewer (user-C) or approver (user-B) → 403; unknown actor → 401; ids that are not uuids on GET, cancel and retry → 404 in plain words; retry while running → 409 "Wait until the running steps finish."
* **QA-32:**
  * A step cancelled during part 1's live call ended CANCELLED, parts `done, not started`, US$0.42.
  * The retry reused part 1's saved answer: I planted a valid run in `p2/runs/<part job>-live-…json`, as the real launcher names it, and removed it afterwards. Parts came back as `done(saved), failed`. Only `p2of2` was called live, retry cost US$0.00. **No re-billing.**
  * Two retries at once → one 201, one 409, exactly one attempt-2 step. A retry while the retried step runs → 409. The attempt cap stops the 4th try.
  * Not tried: two retries racing on a batch with two or more failed steps; I could not set one up.
* **QA-33:** `planDraft`, 9 cases, all as expected:
  * same kind → reused; date box became text → not reused;
  * prior kind left out by the caller → reused; both null, or null and missing → reused;
  * null against dateTimeEdit, missing against dateTimeEdit, a case difference, or "" against null → not reused.
  * Every PDF inventory in `p1/inventory` carries `ui`, and no data path appears twice with different kinds, so `priorMaps`' map by path (`sources.ts:178-180`) is exact.
* **D3:** a repeat LIVE start returns the waiting draft (same job id, US$0, `reused: true`).
* **Hostile bodies on start and accept:** `__proto__` and `constructor` keys, a mode object, a 200,000-letter id, a null worst case, text/plain, a nil uuid, an empty list, a PDF edition id → plain 400/404, no 500. A worst case that is a cent off (0.430000000001) is refused by the strict `!==` check (code read; my live runs met D3 reuse first).
* **Shared files:** the shared spend ledger was not written. The job, part and screen-inventory files my runs wrote under `p2/` were restored from a snapshot taken before (`diff -rq` clean for `p2/` and `p1/`). The copy on :4456 is stopped.
