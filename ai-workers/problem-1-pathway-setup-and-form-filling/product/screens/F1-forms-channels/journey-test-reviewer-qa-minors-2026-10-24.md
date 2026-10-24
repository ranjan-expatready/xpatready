# F1 qa Minors pass · journey test (reviewer, API level) · 24 Oct

Code `514b91e`. Copies `forms_rvfl` (STUDIO_FAKE_LAUNCHER) and `forms_rv` on :4455, both stopped at the end. US$0. No browser exists in the cloud clone, so every journey was walked through the API the way the page or a script would call it.
* Probes are scratch files, not kept: my journey probe (start, cancel, malformed bodies), a parts and restart probe, and qa's `check_qa_s2_probe.ts` renamed to `forms_rv`.
* Suites: `check_ai_launch_paths.ts` 45/45, `check_forms_slice2b.ts` 60/60.

## Journeys
1. **Main path.** An author starts a live screen-map draft, then changes their mind.
   * Steps: a LIVE start without the confirm (409 gives the cost), then a confirmed start, then cancel during the stub pass, then start again.
   * Expected: no paid call; everything ends CANCELLED at US$0; a new draft can start.
2. **Alternate.** The author cancels after the paid call was already sent. Expected: told plainly what was spent and what happens to the output.
3. **Recovery.** The author cancels a draft in parts (IMM 5406, 2 parts) while part 1 runs, then retries.
   * Expected: the parts not sent are retried; nothing is sent after the cancel.
4. **Error.** The author sends malformed requests to the start and accept calls. Expected: a 400 in plain words for each.
5. **Wrong role.** A reviewer starts or cancels a draft. Expected: 403.
6. **Recovery.** The server restarts while a screen-map draft runs. Expected: the job and its batch end FAILED in plain words; a new start works.
7. **Reuse.** The earlier edition's UCI box changes kind between editions (date → text). Expected: that one field is not reused.
8. **Screen boundary.** The same cancelled and failed work is opened on the AI work page (`/ai/:batchId`). Expected: Retry is shown exactly when the server would accept it.

## What held
* **J1:** a 409 gives the cost (US$0.43, 13 inputs); start in 36 ms; cancel in 14 ms.
  * The fake log shows `["stub"]` only. The job ends CANCELLED "Cancelled after the stub pass: the AI call was not made. Nothing was drafted. US$0." The batch ends CANCELLED, "spent US$0.00".
  * A start during the cancel window gets 409 "already running". A start after it gets 201.
* **J3:** the retry after a mid-part cancel is accepted (attempt 2, worst case US$1.42 shown in the audit). A step that ran to its end is refused with "Nothing to retry: every step finished … start its draft again."
* **J4:** all ten zod refusals are plain, with field errors. Examples: "Choose STUB or LIVE: STUB runs no AI (US$0), LIVE is a paid AI call."; "List the inputs to accept, for example ["birthCity"] …".
* **J5:** 403 "Content reviewer (simulated) does not hold the author duty" on both start and cancel.
* **J6:** after the restart, the job reads "The studio server stopped while this step was running" and the batch "…while this draft was running", both FAILED. Cancelling again gives 409, and a new start gives 201.
* **J7:** the qa probe through the API gives 228 reused at base and 227 with the UCI box kind changed. Changed codes also give 227. With no inventory, 0 are reused.
* **Data underneath:** the shared spend ledger was unchanged on the fake copy. The `ai_batch` rows match their jobs, except in J2.

## Findings
* **Major, J3:** the cancel landed at 20:08:44.183, during part 1's stub pass. Part 1's **live call followed at 46.629**, yet the step says "0 of 2 parts ran before the cancel; the rest were not sent". `sources.ts:278-286` has no check between stub and live. The whole-form path has the same gap at `sources.ts:370-377`.
* **Major, J8:** on the AI work page:
  * The draft in parts cancelled part-way shows no Retry button (`web/src/pages/ai.tsx:50`).
  * The failed screen-map batch shows "Retry 1 failed step", which always gets 409 (`ai.tsx:63`, `ai.ts:287`).
  * The heading is empty: the screen-map batch has no `operation_label`.
* **Minor, J2:** the job is COMPLETED and its proposal was accepted (201). The batch says CANCELLED "completed · spent US$0.37", and the audit says "its output will not be applied" (`ai.ts:276`).
* **Minor, J4:**
  * A list body on accept or `/captures` gets the screen-map start's example (`forms.ts:84`).
  * `"hello"`, `5`, `null` and broken JSON get "Unexpected token … is not valid JSON" (`main.ts:131`).
* **Minor, J1:** nothing shows "cancelling" until the stub pass ends (the job keeps "Stub pass, then the AI call…").
* **Minor, tests:** the server half of QA-33 (`sources.ts:180-184`) and the restart cleanup (`sources.ts:47-50`) have no builder test.

## Score (reviewer, one score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | screen-map cancel, retry after cancel and reuse by box kind all work; a cancel in parts still sends the paid call (J3) |
| Next step obvious | ½ | refusals say where to go (`ai.ts:287`, "start its draft again"); the page hides the working retry and offers a refused one (J8) |
| Plain words | ½ | ten zod refusals are plain; parser text and the wrong example remain (J4) |
| Feedback and state | ½ | end states are clear; no "cancelling" state (J1); batch and job disagree (J2) |
| Correct data | ½ | US$0 and statuses exact in J1, J6, J7; "0 of 2 parts ran … not sent" is false (J3) |
| Error recovery | 1 | retry after cancel, restart, re-cancel 409, new start after cancel all recover (J1, J3, J6) |
| Accessibility and screen sizes | ½ | no page in scope; Problem Details with field errors; the page states in J8 were not walked |
| Speed | 1 | start 36 ms, cancel 14 ms, refusals under 20 ms |
| Visual quality | ½ | no page; the one page it reaches shows an empty heading for screen-map work (J8) |
| Trust and sources | ½ | cost and run named on each step; the cancel audit line can be untrue (J2) |
| **Total** | **6 / 10** | **Fail (below 8; no criterion at 0)** |

## Fixes that raise the score (most valuable first)
1. Stop a part (and a whole-form step) between its stub pass and its paid call when a cancel is asked, and count only parts sent. This raises task completed, correct data and trust.
2. Give the page a server `retryable` count and a screen-map `operation_label`. This raises next step obvious, visual quality and feedback.
3. Word the screen-map cancel truthfully when the paid call was already sent, and show "cancelling" at once. This raises trust and feedback.
4. Use a neutral example for the list body, and give body-parser errors a plain 400. This raises plain words.

## Not tested
* A real paid call or cancel.
* Reuse of saved part answers on a retry (fake runs are not saved).
* A browser walk, keyboard use, 1024 px and 200 % zoom (no browser in the clone).
* A screen reader.
* An intended user's unaided walk: D17 and D20 stay with the founder.
