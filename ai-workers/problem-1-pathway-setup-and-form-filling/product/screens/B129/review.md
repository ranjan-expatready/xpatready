# B129 review: the signing steps and the signed scan refuse a recorded application

Reviewed commit `2e3e93a088fb7e776fa179fe082c8eda23e40261` (branch `claude/screens-b129-recorded`, PR #1275), `git diff origin/main...2e3e93a08`: 3 files, +42 −4.
Reviewer: Opus, fresh context. I did not build this. I used my own isolated copy `rev_b129` on :4444 (never :4400). Live AI off, US$0.

**Summary verdict (screen-review terms): Ship.** This is a server fix with no screen. As the brief says, I did not score the UI parts of the skill: D1–D20, the BIC-01–BIC-20 scorecard, keyboard, 1024 px, 200 % zoom and the journey-test score. They are N/A here. The B3 block's read-only state after recording is unchanged, and J-B3 is still 57/57 (below).

## The backlog row's done-when, checked
| Done when (BACKLOG.md:41) | Result | Evidence |
|---|---|---|
| A failing test first | Met | I put the fix back (`if (0)` before both calls) and re-ran section (5): **15/20, exit 1**. Print 200 (a restart: steps went from `3/0` to `6/3`, so the filed copy's steps were superseded), Signed 200, scan 201 (signed_scan rows 1 → 2), Uploaded to IRCC refused in the wrong words. This matches the builder's "before" figures. |
| Both `step` and `scan` call `refuseIfRecorded` | Met | `api/src/sign-steps.ts:75` and `:133`, with the same helper and words as the channel, group and "entered" locks (`submission-record.ts:23`). |
| The test gets the 409 in the server's words | Met | The test matches `/recorded as submitted to IRCC, so it is read-only/` and `/signing of IMM 5476/` on all four calls. My run: **20/20, exit 0**. |
| C8.1 pack still exit 0 | Met on my copy | `acceptance/C8.1.test.ts` **14/14, exit 0** on a fresh isolated database. I did not re-run the checkpoint data (the builder reports gate B 14/14 with `GATE_B_DATA=checkpoint`). |

## Other runs (all exit 0, on :4444 with the fix)
`tests/check_c81_signing.ts` 18/18 · `acceptance/C8.2.test.ts` 17/17 · `tests/check_c82_record_api.ts` 56/56 (the corrections flow, "Correct a number" and UCIs, is unaffected) · `tests/check_c92_undo_api.ts` 27/27 (a C9.2 restart before recording still works) · `tests/check_c76_readiness_api.ts` 23/23 · `tests/check_c3_11_signed_scan.ts` 32/32 · `tests/check_c81_sign_browser.ts` (J-B3) 57/57 · `graph.mjs --check` exit 0. The browser and C3.11 runs rewrote 20 B3 screenshots and `evidence/c3-11-signed-scan/result.json`. I restored them with `git checkout`, the tree is clean, and the copy is stopped (database dropped).

## Code review (STANDARDS §3–§7, WAY-OF-WORKING "Every PR")
* **Order of checks: correct.** In `step`: unknown key 404 → item 404 → `reach(actor, case, "officer")` (authorisation: a client or another firm is refused before any 409 can leak that a record exists) → inactive or non-form 422 → **read-only 409** → not hand-scanned 409 → order, copy and restart checks. This is the same "read-only words first" order as `channel` (`case-prepare.ts:577`) and `entered` (`:533`). In `scan`: the 409 comes before any file is read, so it also wins over the empty, too-large and wrong-type refusals.
* **Nothing stored:** `sign_step` (total and superseded) and `signed_scan` row counts are compared before and after. The file on disk is not counted, but the refusal at `:133` runs before `mkdirSync`/`writeFileSync` at `:148`, so no file can be written. See n2.
* **Legitimate flows after recording:** I grepped every caller of `sign-steps`/`signed-scan` in `acceptance/`, `tests/` and `web/src`. None signs a recorded filing. J-B3 records and then prints on a *different* case (`fam`). The B3 block already offers no step once recorded, and its read-only line names an unticked "Uploaded to IRCC" (`web/src/runtime/sign-steps.tsx:210`). Refusing `uploaded_to_ircc` after the record therefore matches the screen's concept. The rule is per filing: another, unrecorded filing on the same case can still be signed. B132's new PEN steps will pass through the same check at the top of `step`.
* **Exit-code fix:** `recorder().summary()` returns the failure count (`tests/runtime/api.ts:29`), so `process.exit(summary() ? 1 : 0)` is right. The mutation run proves the suite now goes red (exit 1). The builder raises the six other suites that end in `summary()` as a Question, which is the right way to handle it.
* §3.10 (a pass and a fail test), §6 (RFC 9457 body with a field error, server-side authorisation), §7 (no `any` added, no dead code; the `if (0)` was only my temporary mutation and was reverted): met. No migration and no contract change, as the first line of the PR body says.

## Issues, ranked
No Blocker. No Major.
* **m1 (Minor, Should; follow-up, not for this PR): the lock is checked only before the work, never under the case's row lock.** Every other C8.2-9 site checks again inside a transaction after `SELECT … FOR UPDATE` on `runtime_case` (`case-prepare.ts:482, 542, 592`). The sign steps take no lock. So a step that passes `:75`/`:133` and then commits after the record's transaction (`submission.ts:113`) is stored on a recorded filing. In practice:
  * The harmful case, a restart of the filed copy's steps, needs a fact change and a new copy *between* the record's view read and its commit. That is also the record's own pre-existing gap: the case version does not include answers (`storedVersion`, `case-prepare.ts:646`).
  * The race that remains is "Uploaded to IRCC" at the same moment as the record. That outcome is true (it was uploaded) and harmless.
  * I did not reproduce it: 14 timed attempts (record against `uploaded_to_ircc`, offsets 0–175 ms) gave 0 steps stored after the record.

  Fix when B130 or B132 next touch `sign-steps.ts` (one owner, per B132): call `refuseIfRecorded(tx, …)` again inside `save`'s transaction after locking the case row.
* **n2 (Nit): the test's "no file … is stored" line counts rows only.** It could also check that `var/<workspace>/cases/<id>/signed-scans` holds one file. The code order already guarantees this, so the line is not wrong.
* **n3 (Nit): the PR body says "before anything else".** In fact the check runs after the item lookup and the authorisation check, which is the correct order (see above).

## What I could not check
* The C8.1 pack on the checkpoint data. I ran it on a fresh copy only.
* CI on the PR (`gh` GraphQL is blocked here).
* A reproduced race for m1. My evidence for it is code reading only.

Verdict: Approve (commit 2e3e93a088fb7e776fa179fe082c8eda23e40261)
