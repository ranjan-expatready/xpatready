# C3.3 failed AI run: review (reviewer, 1 Nov 2026)

Commit 013b6b3e (local/c33, base origin/main 4ffb5e80). Isolated copy `rev33` on :4466 with `STUDIO_FAULT_SOURCE=imm5707e.pdf` and the fake launcher. Web rebuilt first. US$0, no live switch, never :4400.

Runs: `check_forms_c33_failed_run_browser.ts` 22/22 twice (about 18 s each). `check_forms_c33_acceptance.ts` 14/14. Ledger unchanged, no live call.

## Verdict: Block (1 Major)

Journey score **8.5 / 10**, pass (`journey-test-reviewer-2026-11-01.md`). The block is because of M1 only.

## What held
* **The kept entries are really shown to the person.** The IMM 5257 row says "Done" and offers "Review proposals". The link opens `/c/…/jobs/…`, which shows "All (84)" and "84 proposals still to decide". That matches the API's 84 items. The weak spot is m1.
* **"Done with problems" reads the same everywhere:** `web/src/pages/ai.tsx:15`, `components/run-card.tsx:27`, `api/src/runs.ts:24`, and the AI work list. No suite, test or source file greps "Partly done". Only the old design drafts (`02-ai-work/design`, `F3` drafts) and earlier QA reports still have it, and none of them is a check.
* **The paid-repeat refusal is in plain words and gives a next step.** The row reads "Not eligible · A new paid call is refused: an earlier run asked the AI exactly this (same form, prompt, settings) and its answer failed our own check, so asking again would repeat it. Use the saved AI answer instead (no cost)…". The row shows no price, and Start reads "Start 0 steps, US$0" and is disabled. Nothing is queued (ai_batch and drafting_job counts are unchanged).
* **The planted file is always removed.** `acceptance/lib/pack1.ts:87-98` removes it on exit, which covers `stop()`, the catch's `process.exit(1)` and signals. Leftovers from a dead process are swept by pid. I tested this: a SIGTERM sent right after the plant appeared left no `pk1*` file in `p2/runs`. Normal runs also leave none.
* **A timed-out wait fails loudly.** `until()` (line 30) throws, and so does every Playwright `waitFor`. The `try/finally` closes the browser, and the outer catch prints `FAIL  C3.3 the check itself stopped` and exits 1. `run-suites.sh` picks up that `^FAIL` line. A refusal whose words never appear (lines 95 and 111) also throws instead of passing.
* **Retry re-runs only IMM 5707.** Attempts 2 and 3 run; IMM 5257 runs once. A reviewer's click is refused ("does not hold the author duty"), and the server returns 403 (acceptance AT-5).
* **Layout and keyboard.** axe is clean on both states. 1440, 1024 and 720 px (200 % zoom) have no sideways scroll. Keyboard Tab reaches "Retry 1 failed step" and "Review proposals".

## Issues

**M1 (Major, Must): the "plain message" is neither guaranteed nor proven on the AI work page.**
* **What the person sees:** the "What happened" column of the IMM 5707 step reads `Induced test fault for imm5707e.pdf (STUDIO_FAULT_SOURCE, test server only)` (screenshots `29-done-with-problems-1024.png` and `30-after-three-attempts-1440.png`). That is a file name and a server setting on the main path, which breaks EXPERIENCE §5 [M]. The walk still passes it as "plain words (no code, path or stack)". Its `TECH` pattern (test line 33) does not cover `.pdf` file names or `UPPER_SNAKE` setting names.
* **Why it matters beyond the test fault:**
  * The step's catch stores the raw thrown text (`api/src/ai.ts` ~386, `(e as Error).message`).
  * The batch page prints `{j.message}` unfiltered (`web/src/pages/ai.tsx:87`).
  * Only the run card passes messages through `plainRunText` (`api/src/runs.ts:31,51`).
  * So any unexpected error (an ENOENT with a server path, a TypeError) reaches the person raw on this page. If the plain-words handling were removed, the walk would still pass, so it does not guard the rule.
* **Repro:** start the copy as above, run the walk, then open `/ai/<batch>`. Or look at the committed 1024 screenshot.
* **Fix:**
  1. Give the batch view's step messages the same plain-words treatment as the run card, and make the induced fault arrive in product words (what went wrong plus the next step).
  2. Widen the walk's `TECH` so that it fails on today's string: file names (`\.\w{2,4}\b` such as `.pdf`) and setting names (`\b[A-Z]+_[A-Z_]+\b`).

**m1 (Minor, Should): the check that all proposals are kept is loose.** Test line 88 accepts the number 84 anywhere in `main`. Today it matches "All (84)", but a date or another count could also match. Repro: read line 88. Fix: assert the "All (N)" tab, or "N proposals still to decide".

**m2 (Minor, Should): the record says Retry is "not offered after three attempts", but it is still offered.** After attempt 3 the page still shows "Retry 1 failed step". A click gives the toast "1 step has reached 3 attempts; it needs a person, not another retry." (`30-after-three-attempts-1440.png`). The behaviour matches J2 step 30 ("Retry is refused"). The problem is that `qa/built/C3.3.md` states otherwise, and the walk (line 112) accepts either case. The refusal also does not say what that person should do next (P-110, "plain errors with the next step"). Fix: correct the record, or hide Retry when no step is retryable. Either way, name the next step in the refusal.

**m3 (Minor, Should): the Content reviewer is offered Retry and only refused after clicking** (`ai.tsx:75` has no duty check). EXPERIENCE §4 asks for a read-only state when there is no permission. The server refuses correctly. Repro: act as Content reviewer and open `/ai/<batch>`.

**m4 (Minor, note): the failure exercised is a library step, not an AI step.** IMM 5707 is a `reuse_map` step ("Add from library", run card `uses: rules`). The fault switch throws before the kind is dispatched (`api/src/ai.ts:375`). This is the setup J2 step 29 and the Day-0 test name, so it is not a defect of this PR. The walk still never shows a failed *AI* step to a person.

## D1–D20 (short)
D1 4: steps 29–30 and the paid-repeat refusal behave as J2 says, apart from M1. · D2 5: nothing duplicated; attempts counted on the server. · D3 n/a. · D4 n/a. · D5 4: SIGTERM cleanup verified, retries bounded; dead-end Retry (m2). · D6 n/a. · D7 5: saved answer labelled, US$0, refusal explains why. · D8 5: breadcrumb "AI work › Visitor visa". · D9 3: Retry offered when it cannot run (m2, m3). · D10 3: raw fault text on the main path (M1); the refusal is plain. · D11 5: "Done with problems", counts, toast. · D12 5: team pills and table. · D13 5: axe clean, 1024 and 200 %, keyboard. · D14 5: same run card and words. · D15 5: page under 1 s on the sample. · D16 3: the plain-words check cannot fail on today's string (M1); the proposal-count check is loose (m1). · D17 and D20: simulated only. · D18 5: "Saved AI answer (no model call, US$0)". · D19 4: failure → kept draft → review page works across screens.

## Not checked
A real screen reader. An unaided walk by an intended user (D17/D20). A real unexpected server error, as opposed to the induced one (the M1 risk is read from the code). Graph: no C3.3 finding (G3's two routes are unrelated). `p2/jobs/studio-fieldmap-imm1344e-p*of5-*.json` (ignored files, written 16:13, before my runs) were left in place.
