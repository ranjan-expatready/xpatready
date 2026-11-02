# C11.8 break report, 2 Nov 2026

Target: branch `claude/inspiring-fermi-8kyot6` at 8bc48cf1 (base 55376830). Copy `brk118` on :4457, fake launcher, `STUDIO_AI_LIVE` unset, scratch ledger (`P2_LEDGER_DIR`), US$0. Nothing priced was clicked. Copy stopped at the end. Code untouched.

**Verdict: the door holds.** No Blocker, no Major. Four Minors; none lets a paid call or a charge through.

## Evidence of "nothing charged"
* Fake launcher log: 0 lines with `"mode":"live"`, 20 `"mode":"stub"` (all from my own stub runs).
* Scratch ledger: no `reserve` or `override_use` line from any refused attempt. I seeded one `reserve` line (116.4) and recorded one Continue on purpose, then emptied the file; it ended 0 bytes.
* `ai_batch` / `drafting_job` counts did not move after any refusal (checked after each batch of attempts).
* `GET /api/session` still says `ai: { live: false, launcher: "stand-in" }` after `?ai=live`, `?STUDIO_AI_LIVE=approved`, an `x-ai-live` header, and POST/PATCH `/session` (both 404).

## Minor
**m1. The source-level "Draft the field map" dialog still offers an enabled "Start Live" on a live-off copy.**
* Do: open `/c/<Visitor visa>/forms?draft=<IMM 5257 attachment>`, choose Live (radio), read the footer. Do not click Start.
* Expected (door rule, J2 step 10): Live's Start not offered, with the switch-off words.
* Actual: "Start Live" enabled, `disabled={nothingToStart(mode) || (mode==="live" && plan.isFetching)}`. The only warning is the old red "The API key file is missing: a live call will be refused", not the switch. The server still refuses the click (409), so no money moves. Screenshot: `.../scratchpad/shots/live-selected.png`.
* Where: `web/src/pages/sources.tsx:161` (the plan it already fetches at :133 carries `live.blocked`, unused).
* Why it matters: this is the other person path that reaches `launchSource` and it was left on the old behaviour; the one rule is applied only in `ai-launch.tsx`.

**m2. A Continue (P-179) can be recorded for a start that can never run, with an audit line saying so.**
* Do: seed the scratch ledger near the cap; `POST /api/ai/plan` (source IMM 5257, LIVE, draftAgain) shows `live.blocked: true` and `cost_check.can_continue: true`; then `POST /api/ai/overrides` as user-A with that plan's run_key.
* Expected: nothing recorded for a start the door will refuse (or the same 409 words).
* Actual: 201, `override` line in the ledger, audit event `ai_override` ("chose Continue past experiment ... worst case US$7.27"). The following live start is refused 409 and the Continue is left unused (no `override_use`: that part holds), but it sits valid for 10 minutes and the activity log claims a person continued past the cap.
* Where: `api/src/ai.ts` `override()` (~line 350) has no `aiLive()` check. In the m1 dialog a person can reach it by clicking Start Live over the cap, then Continue.

**m3. A failed step's next step says "Retry the failed step" when Retry is refused.**
* Do (a): fail a step 3 times (stub fails on purpose; set `attempt=3` by SQL). `GET /api/runs/<id>` → `error.next` = "Retry the failed step". `POST /ai/batches/<id>/retry` → 400 "reached 3 attempts; needs a person".
* Do (b), by reading: a LIVE failed step on a live-off copy with no saved answer gets the same label, and `ai.tsx:85` shows "Retry N failed step" (`j.retryable` knows nothing of the switch); the click is a 409. With a valid saved answer the run correctly says "Use Saved for IMM 5257 (US$0)" instead (I saw this).
* Where: `api/src/runs.ts:120` (label chosen from status only); `web/src/pages/ai.tsx:85`.

**m4. A mixed failed batch cannot retry its free step, and the failure text repeats.**
* Do: failed LIVE field_map step (plan worst 1.5) plus a failed REPLAY step in one batch, no switch; `POST .../retry` → 409 switched off for the whole retry; nothing queued. The free step is stuck until the paid one is dealt with. Rare (needs an older live batch on a copy whose switch is now off). `api/src/ai.ts:505` uses `redo.some(...)`.
* Also: the "What went wrong" line is the step's whole message, so a 5-part failure prints the same part error five times, and again in the table and the parts table (screenshot `.../scratchpad/shots/p200-ai.png`). Readable, no overflow at 1024 or 512 px (200 %), but long. French and Japanese text show correctly.

## Observed, not C11.8 (pre-existing, not counted)
* `POST /api/attachments/:id/draft` with an empty body, or `{"mode":["live"]}`, answers 500 instead of 400 (`ai.ts` launchSource reads `b.mode` / `mode.toUpperCase()`).
* `POST .../retry` on a batch whose plan has no `targets` key answers 500 (`ai.ts:~478` `worstEach.find` without `?.`); makes the new `?.` at :505 unreachable in that case. Not reachable from the app.
* `GET /api/ai/batches/:id` still returns the raw job `message` (paths, a fake key string) in `jobs[].message`; the page uses the cleaned `said`, so the screen is fine. The cleaner (`plain-run-text.ts`) does not catch a key-looking string with no path.

## What held
* LIVE start refused 409 with the plain switch-off words, nothing queued: source, combination, catalogue (2 combinations) and program scope; mixed (1 draft + reuse) catalogue/combination refused as a whole.
* `/attachments/:id/draft` `mode:"live"`: plain, with `overrideId` (valid Continue, bad id, empty id), replayed key, a key reused on another form, six concurrent identical requests: all 409 (the free IMM 5707 library reuse on the same key started normally, 201, US$0).
* Valid Continue then live start (both endpoints): 409; ledger had no `override_use`.
* Mode casing `live`, `Live`, ` LIVE`, `LIVE `: 400 on `/ai/batches`; `LIVE` is the only live word. `/draft` accepts lower case only and upper-cases it.
* Roles: reviewer, approver, client 403 on start, retry and draft; no actor 401; `GET /ai/plan` is open to a reviewer and reads only.
* Free paths stay free and allowed with the switch off: LIVE without draftAgain (plan `reuse_saved_output`, `blocked:false`, batch started, REPLAY job, US$0); LIVE on a combination of library reuse only (201); REPLAY; STUB.
* Cost refusals keep their own words and come first (AT-8 order); a stale plan sha is 409 "work changed" before the door.
* Retry: LIVE failed step with plan worst 1.5, worst_usd missing, or targets `[]`: 409 switched off (3 repros), nothing queued, no launcher call. LIVE step with plan worst 0: retried (201, free). STUB failed step: retried and the run view names the latest attempt's failure.
* Run view words: stderr containing a Python traceback, `/Users/...`, `/home/...`, ENOENT, a script tag and an API-key string is replaced by the plain sentence in `GET /api/runs/:id` and on `/ai/:id` ("What went wrong"); no path or stack on the screen.
* Callers of the launcher: only `main.ts:109` (draft) and `:137` (batches), plus demo REPLAY loads; all go through `launch()`. Retry is the only other place that queues LIVE field-map jobs (`ai.ts:513`). The backstop `launchOnce` (`sources.ts:467`) is still there.
* Browser, 1024 px and 512 px (200 % zoom): no horizontal scroll; keyboard tab order cycles inside the dialog (radio, Saved select, Cancel, primary, Close).

## Not tested
* The `ai-launch.tsx` panel itself in a browser (Draft setup from the combination): plan `live.blocked` seen via API for all scopes; I did not open the panel (the reviewer did on 1 Nov).
* 100 programs / 400 combinations: the diff adds no loops; sample has 6 combinations. A genuine all-reused LIVE draft (worst 0) cannot be made in this sample, so launch-side "all reused" was tested only via retry with an edited plan.
* Live-on copy behaviour (forbidden), and the stand-in section of the acceptance check.
