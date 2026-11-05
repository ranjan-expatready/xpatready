# B83 break report: undo and withdraw (PR #1036, commit 0aff0e0b4)

Independent breaker, 5 Nov. Scope by the tech lead's ruling: `POST …/own-question/undo` with `readers`, the new branch in `withdrawChange`, the Undo button and toast. Ran on an isolated copy (:4441, database `xr_studio_brk83`, stopped and dropped): the six through `b83_six_steps.ts`, and the configured checkpoint on fresh databases. US$0: no `*_LIVE`, no priced button. **Ran** = seen on the copy. **SQL state** = I built the starting state in the database because no saved run offers it; the attack after it went through the routes. Paths below are under `prototype/studio/`. Scripts and screenshots: scratchpad of this run (not in the repository).

## Verdict: not ready. 1 Blocker, 5 Majors, 10 Minors.
The sequential paths are sound. What fails: undo has no guard against a release, `readers` misses most of what can read a field, and the toast hides undo's outcome.

## Blocker

**B1. Undo racing a release destroys or rewrites a published form-field row.**
* **Did:** Approver presses release while the author presses Undo on the same form field (two people, same moment; undo fired 110–300 ms after the approve). Fresh checkpoint each run.
* **Expected:** one wins. Refused in words, or undo makes a new draft over the release. Released means frozen.
* **Actual, delete path (Ran, round 6 of 6):** approve 201 and undo 201. Rows left: `1:SUPERSEDED  2:SUPERSEDED`, **no live row**. The GET list loses the row. Undo answers 404 "has no form field by that name". The draft shows **no error**, Submit 201, and the next approve 201 released a version with the form field **gone from IMM 5257's field map**. The frozen release before it still read `person.has_used_other_name`.
* **Actual, rewrite path (Ran, round 5 of 5):** approve 201, undo 201. Frozen snapshot `person.criminal_history`, the row marked PUBLISHED `person.national_id_number`: a released row changed in place, and the draft now says "1 changed" against its own release.
* **Cause:** undo reads the row as DRAFT, the release publishes it and commits, then undo acts **by id** with no status check. `api/src/own-question.ts:188` (`delete where id`), `:189` through `api/src/core.ts:147` (`update where id`). Undo shares no lock with the release (`api/src/studio.ts:1094-1101`). The sha guard (`studio.ts:1211`) only catches an undo committed before the publish.
* **Fix:** `deleteMany`/`updateMany` with `status: "DRAFT"`; on count 0 refuse with 409 "It was released just now: look at it again". Better still, a release lock both take. Fail test: release and undo at once, then assert a live row that equals the frozen snapshot. Note: `ask` uses the same `revise`.

## Majors

**M1. `readers` misses readers, so undo withdraws a field still in use (BR-9).** `own-question.ts:205-217`. Each was asked with a new field, given the reader, then undone; every answer was `withdrew: true, kept: null`.
| Reader | How built | What is left after undo (Ran) |
|---|---|---|
| Waiting **condition change** on To review (C4.11 step 5; `placement_condition`) | SQL state, same shape as `proposeConditionChange` | Second person approves it (201). The question's draft reads the deleted field. 3 release errors, on a shared question |
| Waiting **document-supplies** change | Route | Approved (201). The document type's draft supplies a field that does not exist. No error on Visitor visa's review |
| **Section check** | Route | The check reads the deleted field. Only a warning, "the check is not evaluated". **Released and PUBLISHED**: a check that never fires |
| Waiting **requirement line** proposal | SQL state, a copy of a real item | Accepted (201). Document line reads the deleted field; release error |
| **Fact source** (PQR tick) | Route | Row stays; the problem text shows the key `person.breaker_fs_zz` |
| Another row's **transform** naming the field, its own key different | SQL state | Row still names the deleted field |

Root of the proposal gap: `:215` filters `kind in ["condition","check","pqr_pick"]`, and **`check` is not a kind** (`contracts/proposal-item.ts:14`: `form_check`, `cross_check`, `requirement_line`, `comes_from`). **Fix:** add `check_def`, open `library_change` of `placement_condition` and `document_supplies` (`matches`), `fact_source`, `derived_field.inputs`, `document_type.supplies_facts`, the real proposal kinds, and `form_field_map.transform`. Better, read `where-used.ts` so there is one list. A fail test per reader.

**M2. Undo or withdraw racing an ask on another form field leaves a form field reading a deleted field.**
* **Did (Ran):** tab one Undo on row X, or Withdraw on To review; tab two asks row Y as X's waiting field.
* **Expected:** the ask refused, or the field kept.
* **Actual:** undo against ask, 10 rounds: 6 both 201; **4 left row Y reading a deleted field; 2 answered 201 and row Y was silently back to worked out**. Withdraw against ask, 10 rounds: **4 both 201, all 4 dangling**.
* **Effect:** the validator refuses release ("reads …, which is not in the library": wording seen on the retired-fact run, m1). Undo on that row answers "not asked" (Code, `:185`).
* **Cause:** `ask` holds `lockItem` (`:154`) but `withdrawChange` takes none (`library-changes.ts:235`); undo runs `readers` then withdraws outside any transaction (`own-question.ts:192-198`).
* **Fix:** `lockItem(field, key)` first inside `withdrawChange`'s transaction, and refuse there if a reader appeared.

**M3. Withdraw on To review over a released row leaves a no-op draft, and the change summary says it changed.**
* **Did (Ran):** form field released as worked out (v2); ask a new field (v3 draft); withdraw on To review.
* **Expected:** as undo on the same state: the draft goes, `matches_release: true`, `changes: []` (Ran, undo does this).
* **Actual:** v3 DRAFT stays, identical to v2 but for its reason. `matches_release: false`, change list "Field map … 1 changed". Undo now answers 409 "not asked", so **nothing removes it**: only a release of a change that is no change. Contradicts BR-8 and the release summary. `library-changes.ts:241-244`.
* **Fix:** in the branch, delete the draft when the row under it is the same (share `onlyThisAsk`), as undo does.

**M4. The toast's Undo hides its outcome and its failure.** `web/src/components/lifecycle/index.tsx:127` (`finally { clear() }`), `own-questions.tsx:48,68`.
* **Success (Ran, browser):** the "Taken back…" message is cleared at once; toast count 0 after the press.
* **Kept (Ran):** server said `kept: "The new field stays waiting on To review: a rule or condition still read it."` The person never sees it, though that field still holds the combination's release (BR-8).
* **Failure (Ran):** another tab undid first; toast Undo got 409. Toast gone, **no alert**, an uncaught page error, and the row still shows "Asked as". It looks done. Screenshots `ui-1-after-toast-undo.png`, `ui-2-failed-toast-undo.png`.
* **Fix:** let `run` keep a toast the callback set, and catch; show the refusal in a `role="alert"` and refresh the list.

**M5. Withdraw on To review has no reader check at all** (existed before #1036, but this is the path BR-10 sends people down). `library-changes.ts:235-251`.
* **Did (Ran):** rule reads the waiting field. Undo correctly says "stays waiting: a rule or condition…". The row's own link leads to To review, where Withdraw answers 201.
* **Actual:** field deleted, and the rule now holds release: "Condition reads person.breaker_rule_flag, which is not in the library" (key on a person's screen). The same door takes a section check silently (M1's row).
* **Fix:** refuse while something reads it, in words, with `readers` moved to a shared place. If the tech lead keeps today's behaviour for AI-drafted fields, say so in the concept.

## Minors
* **m1 Undo onto a retired fact (SQL state: fact marked RETIRED).** 201, then a release error with the data path and key on the page. BR-9 says "the same locks"; no `lockItem` or `refuseRetired` on `facts[0]` (`own-question.ts:189`). Same in the withdraw branch (`library-changes.ts:243`). I found no route to this on the checkpoint: every candidate fact was still in use. **Fix:** refuse in words.
* **m2 `kept` words false in a race (Ran).** Undo against approve: "stays waiting… it changed just now" when it was APPROVED (3 of 10). Undo against withdraw: the same when already WITHDRAWN (2 of 10). `:198` catches everything. **Fix:** read the status again and say what it is.
* **m3 "Not found (it may have been removed by a reset)" (Ran).** To review's withdraw against undo's delete, 8 of 10 (the row was deleted under `library-changes.ts:243`'s `update`). Approve against undo, 1 of 6. Nothing was reset. The withdraw rolls back cleanly. **Fix:** `updateMany`, and a 409 in words.
* **m4 Focus lost after Undo (Ran, keyboard).** Row and toast Undo both drop focus to `BODY`, top of a long page; Ask moves it on, Undo does not (`own-questions.tsx:45-49`). EXPERIENCE item 12. **Fix:** the same `moveOn`.
* **m5 Conflict state does not refresh (Ran).** Stale row Undo shows the 409 under the row, but it still shows "Asked as" until reload. Concept §4 says the list refreshes. Screenshot `ui-4-stale-row-undo.png`. `own-questions.tsx:79`.
* **m6 Undo does not restore what ask overwrote (Ran, the six).** Before: `AI_PROPOSAL`, `medium`, quote "Question 2 A Have you ever used…". After undo: `HUMAN`, no confidence, the printed question. Only the key comes back. `own-question.ts:158`, `:189`. The form field is recorded as a person's decision nobody made.
* **m7 To review's success words (API plus code).** A restored row returns `form_fields_reopened: 0`, so it says "Withdrawn: 0 form fields back to "no decision"", never that it went back to worked out. `web/src/pages/review-items.tsx:207`.
* **m8 History (Ran).** Withdraw on To review writes **no audit event**, though BR-10 now changes a form field's mapping (`api/src/screen02.ts:163`). It remains only on the change's note and the row's reason. Undo's audit line does not name the field it was asked as, and takes no reason.
* **m9 Placed question left in silence (Ran).** Undo of a library-field ask in a chosen section: the placement stays in the draft and in the next release's snapshot, with `kept: null` and no words. No client sees it (Held). The challenge's B1 fix (2) asked for words; the concept dropped them. Also grammar: "a rule or condition still read it" (`:197`).
* **m10 Withdraw branch tests `recordedDerivation`, not `isWorkedOutYesNo` (SQL state).** A row with `derived:person.x recorded -> text` is restored, not reopened. No saved row has that shape today. `library-changes.ts:242`.

## What held (Ran)
* **Roles:** Approver and Content reviewer 403, Client 403, unknown 401. Strict body 400, unknown data path and edition 404. Refusals carry no key.
* **Races with one winner:** undo against ask on one row (10/10, 201/409); double undo (10/10, 201/409); withdraw against approve (10/10, one winner, status consistent); undo against approve (no dangling reference).
* **Release:** a draft changed after Submit: approve 409 "submit it again". Undo committed before the publish: 409 "changed while being released", nothing released (most rounds).
* **Over PUBLISHED, sequentially:** undo makes a new draft, never touches the published row, and the change list is true (field and placement removed, 1 map row changed). A draft holding only this ask is deleted: `matches_release: true`, `changes: []`.
* **After placement, new field:** undo removes its question; no orphan, no validator error.
* **Readers that work:** a second form's form field (kept, then Withdraw reopens that row); a rule (kept).
* **RETURNED:** withdrawn with the row back. **Another person's waiting field:** kept in words; Withdraw 403. (Proposer set by SQL: only one simulated person holds the author duty.)
* **Withdraw, row by row (SQL state for the others):** asked row back to worked out, plain row unresolved, a row whose key is among its named facts unresolved, count 2 correct. BR-10 and the AI-field case hold.
* **QA-165 after undo:** transform kept on every path. On a released case the undone Yes/No is not shown to the client, so a confirmed No cannot arise through the questionnaire: the guard is not reached, no contradiction written.
* **1024 px:** toast fits, no sideways scroll.

## Not settled
* Undo with a gate condition landed on the detail question: the validator's "Hiding a value a form reads" was there both before and after undo, so the checkpoint cannot show whether undo adds it. A saved-conditions run on the six would.
* M1's condition and requirement rows are SQL states; I did not drive a saved run to reach them.
* 200 % zoom not run. Uploads, 100 programs and long or non-English text are outside this ruling.
