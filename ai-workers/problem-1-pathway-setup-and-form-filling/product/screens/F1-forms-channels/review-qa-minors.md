# F1 forms channels, qa Minors pass · independent review (CHECK, backend, no new page) · 24 Oct

Reviewer agent (did not build it). Code at `514b91e` (branch `claude/forms-f1-check-f6e7f2`), diff `5c116fe..514b91e`. Isolated copies `forms_rvfl` (fake launcher) and `forms_rv` on :4455, both stopped at the end. AI spend US$0: fake launcher and stub passes only. Paths: studio = `prototype/studio/`.
Journey test: `journey-test-reviewer-qa-minors-2026-10-24.md`, **6/10, fail (below 8, no criterion at 0)**.

## Verdict: Ship after fixes (two Majors, no Must)
I checked each claim against the code and ran the suites on my copies:
* `check_ai_launch_paths.ts` passes **45/45**.
* `check_forms_slice2b.ts` passes **60/60**.
* qa's `check_qa_s2_probe.ts`, run as a renamed copy on :4455, stops where the build notes say it would. The 409 there is correct: the probe's own retry is still running. With one wait added in my copy it gives 54 pass and 3 fail. All 3 failures are D3 expectations that date from before the D3 decision; this diff does not touch `waitingDraft`.

* **QA-27 holds for the six refusals.** These now get plain words with field errors (`contracts/forms.ts:80-89`): an empty body, a non-id combination, `"stub"`, `"0.50"`, `-1`, `[1]`, and on accept `inputs` as text, `[1]`, a number `jobId` or `{}`. Gaps remain at the edges (3, 4).
* **QA-31 holds before the paid call.** Each draft gets its own `ai_batch` (`forms.ts:498`).
  * I cancelled during the stub pass. The fake log shows `["stub"]` only, the job ends CANCELLED "the AI call was not made … US$0", the batch ends CANCELLED, and the audit line is there.
  * Cancelling again gives 409. A field-map retry gives 409 with where to start again (`ai.ts:287`). A reviewer gets 403.
  * I restarted the server mid-draft: job and batch both end FAILED in plain words, and a new start is 201 (`sources.ts:47-50`).
* **QA-32 holds through the API.** A step cancelled part-way is retried as attempt 2 (`ai.ts:292`). A third attempt is also accepted (the limit is `MAX_ATTEMPTS_PER_SOURCE`). A finished step gets the new "Nothing to retry: every step finished…" refusal.
* **QA-33 holds.** `planDraft` compares the kind of box (`engine/parts.ts:45`), and `priorMaps` reads `ui` (`sources.ts:180-184`). qa's API probe, once it reaches that point, finds the UCI date→text change gives 227 reused, against 228 before. Every `p1/inventory` file has `ui` on every field, so the extra check never blocks reuse silently.

## Must
None.

## Major
1. **A cancel during a part's stub pass still makes that part's paid call, and the step then says it was not sent.**
   * **Where:** `runPart` checks `wanted()` only before the stub (`sources.ts:278`). It never checks between the stub (`:280`) and the live call (`:286`).
   * **What I saw (fake log):** stub of p1 at 20:08:44.075, cancel at 44.183, **live call of p1 at 46.629**. The step then reads "Cancelled: **0 of 2 parts ran** before the cancel; the rest were not sent … US$0.00", but part 1's call was sent.
   * **The builder's own test shows it:** the QA-32 setup reports parts `["failed","not started"]` (`tests/check_ai_launch_paths.ts:130`). Part 1 "failed" because its live call ran after the cancel.
   * **Why it matters:**
     * QA-31's own rule ("never paid for after a cancel") is applied to the screen map but not to a draft in parts.
     * STANDARDS §2 [M] requires a cancel in background work.
     * The whole-form path has the same gap (`sources.ts:370-377`).
   * **Fix:** check `wanted()` again after the stub pass, in `runPart` and in `launch`. On a cancel, mark the part "not started (cancelled after its stub pass), US$0". Count only parts that were sent. Add a test asserting that the fake log has no live call after the cancel.
2. **The AI work page was not updated for either change.** The diff touched no web file.
   * **What happens:**
     * The page's Retry rule still counts only "Cancelled before" (`web/src/pages/ai.tsx:50`). A draft in parts cancelled part-way shows **no Retry button**, so QA-32's recovery exists only for API callers.
     * A FAILED screen-map batch shows "Retry 1 failed step" (`ai.tsx:63`), and the server always refuses it with 409 (`ai.ts:287`).
     * The screen-map batch has no `operation_label` or `capability_note`, so the heading is empty (`ai.tsx:57`).
     * The running notice says "Steps run two at a time … its output will not be applied" (`ai.tsx:66`), which is wrong for a screen map (see 3).
   * **How I checked:** I applied the page's own rule to `GET /ai/batches/:id`. No browser exists in the cloud clone.
   * **Fix:**
     * The server returns `retryable` (the same `unsent` rule, 0 for `screen_map`) and the page shows Retry from it.
     * The screen-map batch gets a plain `operation_label` ("Draft a screen map with AI") and a `capability_note`.

## Minor
3. **A cancel during the screen-map paid call contradicts the audit.**
   * The job ends **COMPLETED** with proposals a person can accept: my accept gave 201.
   * The batch says CANCELLED with "completed · spent US$0.37" (`forms.ts:544`).
   * The audit line says "its output will not be applied" (`ai.ts:276`).
   * **Fix:** keep the paid output, which fits D3, but say so truthfully for `screen_map` in the cancel line and on the job. Or treat it like a field-map step cancelled while running (`ai.ts:230-231`).
4. **QA-27: the list-body message gives the screen-map start's example on every endpoint** (`forms.ts:84`). The screen-map accept and `POST /captures` both answer "for example {"combinationId": "…", "mode": "STUB"}". **Fix:** use neutral words, or pass an example per endpoint.
5. **Other bodies that are not one object still get parser text.** `"hello"`, `5`, `null` and broken JSON give "Unexpected token '5', "5" is not valid JSON" (body parser → `main.ts:131`). The new branch for text and numbers in `parse` cannot be reached, so the build-notes claim ("a body that is not one object is refused as such") holds only for lists. **Fix:** map the body parser's SyntaxError to a plain 400 in the Problem filter.
6. **The server half of QA-33 has no builder test.** The unit check sets `ui` by hand (`tests/check_forms_slice2b.ts:136-142`). If the `priorMaps` change is removed, `ui` is undefined, the fallback reuses, and every builder suite stays green. Only qa's probe covers it, and that probe stops before it. **Fix:** add an API check in slice 2b on an edited copy of the earlier inventory.
7. **Between a cancel and the end of the stub pass, nothing shows the cancel.** The job keeps "Stub pass, then the AI call…" and the batch stays RUNNING. A new start in that window says "already running" (`forms.ts:489`). **Fix:** the job says "Cancelling: the AI call will not be made" as soon as the cancel lands.
8. **Small gaps:**
   * A restart marks a screen-map batch that was already asked to cancel FAILED, not CANCELLED (`sources.ts:49`), and no test covers the restart cleanup. I walked it by hand and it works.
   * The retry audit says "retried 1 failed step" for a cancelled one (`ai.ts:306`).

## D1–D20 (API, code and suites; no page in scope)
* **D1 4:** all four items work as asked; cancel during a part's stub still pays (1).
* **D2 4:** one batch per draft, under the version lock; no duplicate start after a cancel.
* **D3 5:** reuse now needs the same box kind; no inventory lacks `ui`.
* **D4 n/a:** no rules touched.
* **D5 4:** restart, re-cancel and retry recover; parts cancel leak (1).
* **D6 4:** audit lines on start, cancel and retry; the cancel line can be untrue (3).
* **D7 3:** proposals from a "cancelled" paid call stay acceptable without saying so (3).
* **D8 n/a.**
* **D9 3:** the page offers a retry that always refuses, and hides the one that works (2).
* **D10 4:** six refusals are plain; parser text and a wrong example remain (4, 5).
* **D11 3:** no "cancelling" state (7); job and batch disagree (3).
* **D12–D14 n/a:** no page in scope.
* **D15 5:** start 36 ms, cancel 14 ms.
* **D16 3:** QA-27, QA-31 and QA-32 rules fail when removed; QA-33's server half and the restart cleanup do not (6, 8); one test passes while showing bug 1.
* **D17 and D20:** simulated only.
* **D18 4:** the cost and the run are named on each step.
* **D19 3:** recovery after a cancel closes only through the API (2).

Graph (P-86): `screen-map/ai` and `…/accept` have tests but no page (backend by design). `/ai/batches/:id/cancel` and `/retry` are used by `/ai/:batchId`, which is where 2 lands.

## Could not check
* A real paid call or a real cancel during one: no live AI.
* That a retried draft in parts reuses its finished parts' saved answers. The fake runs are not saved under `p2/runs`. Read in code: `sources.ts:222-226,283`.
* Any browser walk: no browser in the clone.
* A screen reader.
* D17 and D20 stay with the founder.
