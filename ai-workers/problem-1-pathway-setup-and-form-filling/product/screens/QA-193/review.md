# QA-193 — reviewer verdict, round 1 (PR #740, forms lane)

**Verdict: Block** (Rework of one line of behaviour; the rest ships). Reviewed **538d666e3** (the head the builder asked for) and its parent **6569eb5b0**. Reviewer agent, 3 Nov 2026; not the builder. Live AI off, US$0, no priced button.

**The ask:** QA-193 (Major): "bulk-accepted field-map items reach the approver without a bulk mark; `sources.ts:856` batchId null". Read word for word: P-121, P-288 (2), P-296 (1); P-299 and P-305 as the tech lead's rulings (P-305 is open PR #741, not on main).

## How it was checked
* **The exact commits.** At 538d666e3 I used the builder's worktree, copy `rv193` on :4457. At 6569eb5b0 and at its parent 425c2decd I used a separate scratch extract, since the builder edited the worktree during the review. That copy also ran on :4457 after one mishap on :4458 (see the end). Each run used a fresh database.
* **`check_forms_qa193_batch_mark.ts`:**
  * at 6569eb5b0, **13/13**;
  * at the parent with 6569's test, **9 PASS / 4 FAIL**: `batch_id` null, the null count is 1, no batch-view row, no release `batch_id`. The fail-then-pass is real;
  * at 538d666e3, **15/15**.
* **`check_gcore_b5_field_map_bulk.ts`** (the C11.14 bulk pack): **22/22** at 6569eb5b0, **21 PASS / 1 FAIL** at 538d666e3 (M1).
* **Own probes** (scratch scripts, same planted checker run as the test):
  * Two reuse matches accepted together, each changed on its page to a new field, then the draft applied: on 538 both ADDs have `batch_id` null and there is no batch row (correct).
  * Two reuse matches accepted together, one returned on its page, then Undo: on 538 the answer is 201 `{"undone":1}` (M1).
* **US$0:** the test plants a Sample checker record with `cost_usd: 0` and replays (`mode: "replay"`). There is no model call. `drafting_job.cost_usd` sums to 0.00.

## The four questions
1. **Complete? Yes, at 538d666e3.**
   * Every queue lander already passes the decision's batch: `proposals.ts` `waitingAdd` (fields, sections, answer lists, document types), `question-condition.ts:44`, and the checklist line's type at `proposals.ts:323`. The field-map apply was the only null; it is fixed at `sources.ts:863` via `batchOf`.
   * 538 closes Devin's two holes. A page decision now supersedes the queue batch (`recordChoice`, `proposals.ts:209`). A re-compare keeps a kept decision's batch (`sources.ts:593,664`).
   * The other `libraryChange.create` writers come from library screens with no To review decision: form-library, finder, who-fills, rename-door, lifecycle, library-items. Null is right for them.
2. **Real fail-then-pass, US$0: yes** (counts above). The row's literal scenario, new fields bulk-accepted, was already closed by #699. The test asserts that as a 409, which also passes on the parent; the builder says so in the PR.
3. **Dropping the "accepted together with N" line: right, but only once #741 lands** (m1).
   * After P-296 (1)/P-299 a field-map bulk is reuse only, and reuse adds nothing to the library. At apply, a reuse whose field has since gone is stopped by the stale-library check (`sources.ts` "Stale: … Compare again").
   * Without #741, on this branch, a Ready AI answer list, section or document type can still be bulk-accepted. Those batches carry their id and already show on To review as "N new library items from one review decision" (`review-queue.ts:251-259`). So nothing unmarked reaches the approver either way.
4. **Batch view, release, Undo:**
   * The grouped approval and the queue's 2+ grouping are unaffected. A field-map ADD is alone in its batch, `decideBatch` takes ADDs only, and "mine" also counts `appliedBy`, so the author who applied cannot approve. The batch row's "by" is the To review decider (`i.decidedBy`).
   * Undo by batch after apply is refused by the APPLIED guard (`proposals.ts` undo), so applied ADDs are never deleted.
   * **But 538's `recordChoice` change breaks Undo's page guard (M1).**

## Findings
**M1 (Major, 538d666e3) — Undo no longer refuses an item decided again on its page; the B5 pack is red.**
* `recordChoice` now writes `batchId: c.batchId ?? null` (`api/src/proposals.ts:209-211`). `undo()` finds the batch's rows by `batchId`, so it no longer sees the re-decided item. The guard "decided again on its form-field page" (`proposals.ts`, `onPage.some((r) => r.choice !== "ACCEPTED")`) can no longer fire. Seen:
  * **One-item batch:** 404 "No decision with this id." `check_gcore_b5_field_map_bulk.ts:100` expects 409 with those words → **FAIL** (21/22, was 22/22).
  * **Two-item batch:** 201 `{"undone":1}`, while To review's bar says "Undone: 2 proposals waiting again." (`web/src/pages/proposals.tsx:139`, n from the client). The page's decision does stay.
* `contracts/` changed, so `select-suites.mjs` picks **ALL** and CI will fail too. The row's done-when ("the packs are green") is not met.
* **Fix (either):**
  * (a) In `decide()`, log the decided ids with the batch: `audit.log(…, batchId, …, { ids })` at `proposals.ts:610`. In `undo()`, when a decided id no longer carries the batch, refuse 409 with the existing words before anything else, including the empty-rows case.
  * (b) Leave `proposal_item.batch_id` alone in `recordChoice`, record the supersession instead (e.g. `work.pageDecided: true`), and have `apply`'s `batchOf` skip superseded items.
  * Then add a check to `check_forms_qa193_batch_mark.ts`: Undo after a page re-decision answers 409 in words, for a one-item and a two-item batch.

**Resolved in 538 (was Major at 6569eb5b0):**
* A page re-decision kept the stale To review batch, because `recordChoice` never touched `batchId` at 6569. So the ADD would carry a bulk decision it did not come from.
* A re-compare dropped the batch.
* Confirmed by code reading at 6569 and by my probe at 538. The builder's two new checks cover both.

**m1 (Minor) — the PR body's premise depends on #741.**
* "One decision never adds more than one library change" holds only with P-305's `bulkWhy` line (#741). `bulkWhy` on this branch has no such line.
* **Fix:** say "depends on #741" in the PR body, or merge after it.

**m2 (Minor) — the PR body is stale for 538.**
* It says 13/13 and "4 checks fail". At 538 it is 15/15, plus two new fail cases.
* The `run-suites` result is still "running".
* **Fix:** update the counts and post the suite result. That result will show M1 until it is fixed.

**m3 (Minor) — the new test does not name C11.14.**
* The header names QA-193, P-121 and P-288 (2), but the graph counts capability ids in test text.
* **Fix:** add "C11.14" to the header comment of `tests/check_forms_qa193_batch_mark.ts`.

**For the tech lead, not a finding (P-26):** bulk-accepted field-map reuse matches land at apply as form field-map rows, not library changes. Neither the release list nor the approver sees a bulk mark on them. Whether P-121's "the second person at release sees what was bulk-accepted" covers mappings is your call.

## D1–D20 (this change only)
* **D1** 3 (the row's intent is met; the Undo rule of P-121/P-288 (2) regressed)
* **D2** 4 (correct batch on apply, page supersede, re-compare)
* **D3** n/a
* **D4** n/a
* **D5** 2 (Undo after a page decision: 404 or a partial undo)
* **D6** 4 (the decision's provenance is kept on the change)
* **D7** 3 (one Undo for the batch, but the refusal words are lost)
* **D8–D10, D12–D14:** no visible change; not walked
* **D11** 3 (the bar's count is wrong after a partial undo)
* **D15** 5 (one `Map` per apply, no per-row request)
* **D16** 3 (real fail-then-pass, but B5 red)
* **D17** simulated only
* **D18** 4 (approver sees the decider)
* **D19** 4
* **D20** simulated only

Journey: **7/10**, below the bar of 8 (`journey-test-reviewer-2026-11-03.md`).

## Could not check
* **No browser walk.** The worktree has no web build, and building would write into the builder's worktree. The change has no visible UI.
* **`graph.mjs` not run.** It always writes `qa/graph.json`, which is outside my one-file scope.
* **I did not run `run-suites.sh`.**

**Mishap (reported, no lasting change made by me):**
* About 11:52–11:58 UTC my pinned 6569 run went to :4458 after another session's copy (`xpatready-q305`, pid 3074) had taken that port between my stop and my start. Calls were `/demo/load`, a replay draft, accepts and an apply. US$0.
* That copy's data may need a fresh start. I did not stop its server.

**Verdict: Block** — fix M1. m1–m3 can go in the same push. Re-review: the diff since 538d666e3 only.

## Round 2 (diff 538d666e3..6b6827f63; reviewer agent, 3 Nov 2026)
The builder moved the head from 4c9f653fc to **6b6827f63** during this round, so I judged 538d666e3..6b6827f63. My first runs in the builder's worktree were spoiled by an edit made while they ran (12:03 UTC), so every count here comes from pinned `git archive` extracts in my scratch folder, on :4457, with a fresh database for each run, live AI off and US$0. **M1 is fixed in both cases.** `decide()` logs `{ n }` with the batch (`api/src/proposals.ts:610`), and `undo()` refuses 409 with the same words when fewer items still carry the batch (`proposals.ts:629-632`). `check_forms_qa193_batch_mark.ts` at 6b6827f63 gives **18/18**, with the one-item and two-item refusals and the other item still `accepted|<batch>`. `check_gcore_b5_field_map_bulk.ts` gives **22/22**, so line 100 is green again. `check_s6_p149.ts` gives **78/78**, which covers non-field-map Undo, 403, "Already undone", unknown 404 and the 10 s window. 4c9f653fc gave 17/17 on its own test. Its logged-ids version lost a page re-decision after a re-compare, because the re-compare writes the items again under new ids. Running 6b6827f63's test against 4c9f653fc's code fails exactly that case (**17 PASS / 1 FAIL**, Undo 201), and it passes at 6b6827f63. That is a real fail-then-pass. My probes at 6b6827f63:
* An unknown batch gives 404 "No decision with this id.".
* An Undo repeated after a successful one gives 409 "Already undone: …", because the check is skipped once an `undone` event exists.
* An intact two-item batch gives 201 `{"undone":2}`.
* A legacy decision whose log has no `n` (I nulled `detail`) behaves as before. With a page re-decision it gives 201 `{"undone":1}`, the 538 behaviour. This is harmless because every real legacy decision is older than the 10 s window.
* Non-field-map items only leave a batch through Undo, and a demo reset clears items and audit events together, so the count cannot misfire on them.

Two nits, neither blocking:
* **n1.** The new check runs before the 403 and 10 s checks (`proposals.ts:631` comes before `:634` and `:637`). Another reviewer, or the decider after 10 s, gets the "decided again on its form-field page" 409 instead of "Only the person who decided…" or "Undo is offered for 10 seconds…". Both still refuse with nothing changed. Fix if wanted: when `rows.length` is not 0, run the count check after the window check.
* **n2.** A re-compare that reopens one item of a kept decision also lowers the count. Undo then refuses with the page words, though no one decided on the page. The refusal is right but the reason is not. Fix if wanted: say "decided again or reopened by a re-compare".

m1 and m2 (PR body) are still the builder's to update; m3 is fixed (C11.14 is in the test header). Journey re-score: **8½/10** (J6 and J7 now hold, so plain words, feedback and error recovery each score 1). See the round-2 note in `journey-test-reviewer-2026-11-03.md`. Verdict: Approve
