# C11.15 Redo with AI: break report (qa, 2 Nov 2026)

Commit 4093121b, branch claude/quirky-cannon-thk3q0. Isolated copy `forms_brk` on :4458 with the fake launcher, no live switch set, US$0. Stopped when done. Loaded sample, replay Find on Visitor visa (VV), then the attacks below. Scope: only what the diff builds (the `/redo` route, Stop wait, the Redo dialog); the old Find and Replace routes are named only where Redo reaches them.

## Breaks (4 real, 5 minor)

**B1. Major: the one-run-per-combination lock can be bypassed with an upper-case combination id.**
- Do: start a Redo on VV with the id lower case, and at the same moment another with the id upper case (`E9218426-5933-4487-B5C4-4D903741AB21`). Plans first, then both starts at once (`POST /api/combinations/<ID>/forms/IMM%205257/redo` and `…/IMM%205409/redo`, `{stage:"match",mode:"replay",planSha256,idempotencyKey}`).
- Expected: one run, one plain 409 ("already running").
- Actual: both 200, two runs on one combination. The DB then holds batches whose `scope_label` is upper case. Same for a lower-case Find plus an upper-case Find (201 and 201).
- Cause: `form-redo.ts` `lineOf` accepts the id with `/^[0-9a-f-]{36}$/i`. `finder.ts:277-278` takes `pg_advisory_xact_lock(hashtext('finder:'+combinationId))` and `startsWith(combinationId|)` on the raw string. Postgres reads both spellings as the same uuid. The same raw string also breaks "remembered page" (`finder.ts:~250`): an upper-case read plan shows `page_url` null and a different fingerprint than the lower-case plan.
- Fix hint: lower-case the id in `FormRedoController`, or refuse non-canonical ids. The same fix belongs in the Find routes.

**B2. Minor: the same idempotencyKey for a different form, stage or an earlier Find returns the earlier run under the new words.**
- Do: `{stage:"match", IMM 5409, key K}` then `{stage:"find", IMM 5257, valid plan, key K}`. Also a Redo that reuses the key of an earlier Find (`brk-find-0001`).
- Expected: refuse ("key belongs to another run") or start the new one.
- Actual: 200 with `stage:"find", code:"IMM 5257"` in the body but `id` of the IMM 5409 run (and of the old Find run). `finder.ts:~254` replays by key before looking at stage or form; the check only compares the combination id. The dialog is safe (key has stage and mode in it, and a new random part per open). A client that reuses keys is misled.
- Same key across two combinations: held (409 "belongs to another run").

**B3. Minor: a Redo of one form reports on other forms.**
- Do: Redo `read` or `match` on IMM 5409 (already attached), replay. Run message: "1 form attached or already there, 0 not found, 1 to decide." The `decide` item is IMM 5484, a form nobody asked about (`GET /api/form-finder/runs/<id>` result.decide). `only` filters fetch and attach (`finder.ts:445`) but not `decide`, `not_for`, `printed`. The run ends `done_with_problems` for a redo that did exactly what was asked.
- Do: Redo on a form added by hand that the pages do not print (IMM 1295 on VV): "0 forms attached or already there… 1 to decide. Nothing to attach." Says nothing about IMM 1295 (it is not on those pages). The person gets no answer for the form they chose.

**B4. Minor: "Read again" and "Match again" on a combination with no remembered page quietly become a Find.**
- Do: `POST /api/combinations/<With an LMIA>/forms/IMM%201295/redo {stage:"read",mode:"live"}`. Text says "the application page and guide used before are read again", but `page_url` is null and step 1 is "Find the application page" with an AI round (up to US$2.20; whole run US$5.60 against `per_run_cap_usd` 5 in the ledger block, shown as "Fits"). In replay it ends `needs_person` "No application page could be chosen" (WP: 3 runs). The words do not match what runs. Cost is shown, so no money surprise.

**B5. Minor: the Redo's audit line names neither the form nor the stage.** `audit_event`: "started the form finder for "Visitor visa" (saved AI answers, US$0)". Cannot tell a Redo of IMM 5257 from a whole Find. Stop logs "stopped the form finder for Retail › … › Visitor visa", and logs again for each of two concurrent Stops.

**B6. Minor: code text is echoed unbounded in the 404.** A 300-character code, a right-to-left override character, or `'; drop table…` is repeated back in `detail` ("<text> is not on this combination"). No injection (parameterised; table intact), plain words, but unbounded. "IMM-5257" is not normalised (404; fine, by design of `normaliseCode`).

**B7. Minor: stale comments.** `form-redo.ts` `lineOf` doc says "a removed one is added back first, a form never on it is found or added"; the code refuses both. `contracts/form-library.ts` `RedoBody` doc says read/match "run its field-map draft"; `form-redo.ts` says they run the finder. Both are wrong against the build.

**B8. Minor (not new, Redo does not worsen it): a JSON body that is `null`, `"x"` or `123` returns the parser's raw text** ("Unexpected token 'n', "null" is not valid JSON"), 400. Plain enough, not in the product's words.

**B9. Observation, not a break: Replace on a removed or not-attached form is not refused.** `POST …/forms/IMM%205409/replace {version:1}` after removal: 201 "current". `…/IMM%205488/replace` (in the library, not on VV): 409 "canada.ca could not be read" (recorded copies). `…/IMM%205802/replace` (retired line, WP): 409 "Not on canada.ca's list…" (a wrong reason). Replace is a library file check, so I left it; the rule list only asks a removed form refused for Redo.

## What held

- **Money**: every start was replay or rules. Live plan shown with the switch off (`live.on:false`, plain reason); live start 409 "AI now is switched off"; `ai_batch`/`drafting_job` rows with mode LIVE = 0; `GET /api/ledger` committed_usd stays 0; `.tools/p2-ledger` has 0 files. Replace (7 calls) starts no run and writes nothing.
- **Roles**: no `x-actor` 401; unknown actor 401; user-B (approver) 403 on plan, on start, on Stop (user-B Stop on a running run 403), and on Replace. The 403 comes before body checks.
- **Binding**: a plan seen for another form (5257 plan on 5409), another stage, another mode (replay plan with `rules`), or from the old `/find/plan` is 409 "Look at the plan again". Old `/find` refuses a Redo fingerprint. Fingerprint is the same for `imm5257`, `IMM  5257`, `IMM%205257`, so the code spelling cannot split it.
- **Hierarchy**: form not on the combination 404; newest line RETIRED 409 "add it back first" (VV 5409, WP 5802, both `imm5802` and `IMM%205802`); another-kind combination (WP, with LMIA) runs and stays `needs_person`, its PUBLISHED lines untouched; combinations with no lines (SV, FS, LM) 404; unknown, malformed, over-long (5000), NUL-containing combination ids 404 plain, no 500, no stack in `api.log`.
- **Lines**: after ~25 Redo starts (find, read, match, stopped, raced, deleted mid-run at +0/30/120/400 ms then Undo) every line stayed one row, version 1; no second attach; a removed form was never attached back; IMM 5257's version unchanged.
- **Concurrency**: 3 simultaneous starts give 1 run and 2 plain 409; 8 at once give 1 run, 7 plain 409, 0 5xx; a Redo during a Find and a Find during a Find 409 "already running"; 5 simultaneous same-key starts give 1 run (others 409, not the same id, acceptable); sequential same key returns the same run id.
- **Stop**: ended run 409 "already ended (…)" for done, partial, needs_person, stopped; unknown run 404; bad id 404; two Stops at once both answer `stopped` in ~150 ms (the 3 s wait ends early); Redo right after Stop starts.
- **Body**: empty, `{}`, `[]`, `FIND`, array stage, bad mode, short/uppercase/foreign planSha256, key under 8, over 120, a number, newline/Cyrillic/emoji key, `__proto__`, a foreign `pageUrl`/`only` (ignored, not read), 3 MB body: all 400 or ignored in plain words, never 500. GET on the route 404. 60 parallel plans: all 200, max 510 ms; plans never wrote a batch.
- **Code param**: `imm5257`, `imm%205257`, `IMM  5257`, non-breaking space all resolve to IMM 5257; full-width `ＩMM`, emoji, `..`, `%252e%252e` give 404 plain.
- **Dialog (Playwright, Chromium)**: keyboard-only (Tab to "Actions for IMM 5257", Enter, Enter) opens "Redo with AI: IMM 5257" with focus inside; Esc returns focus to the line's button; 1024 px and 512 px (200 % zoom): no sideways scroll, Start reachable, cost text present, axe 0 violations in the dialog; Start disabled while a new stage's plan loads; double-click Start sent one start; a Find started elsewhere then Start gives the plain "already running" inside the dialog and a retry works; reload and Back close the dialog with no stray start; an approver sees no Change or Actions button.

## Not tested
- A live run (switch must stay off); a retired combination (retire needs a release step; approving the change left `retired_at` empty); the 100-program / 400-combination budgets (60 parallel plans on the six sample combinations only); upload attacks (no upload in scope).
