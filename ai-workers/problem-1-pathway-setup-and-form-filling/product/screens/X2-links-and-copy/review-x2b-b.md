# Review: X2b slice (b), `POST /api/lines/bulk` and `POST /api/lines/bulk/:batchId/undo` (C1.5), commit 04bac96f

Reviewer (fresh context, did not build it), 1 Nov 2026. Branch `claude/screens-x2b-apply`. Copy :4444, db `xr_studio_screens_x2b` (reset and reloaded after my probes).
Judged as **apply and batch Undo only**, against concept v3 BR-C2 to BR-C4 and §5, the carries from #254 (n1, n2, Paper with an account record, Not needed, `addFormLine`, attachNow's two refusals) and `review-x2b-a.md`. The menu and dialog (c) and copy-from (d) are out of scope. No screen, so the journey test is API-only and is in §4.

**Verdict: Block.** Two Major findings: a copy can write a different line from the one the preview promised, and the apply's lock deadlocks the Forms tab's own Add.

## 1. Findings (ranked)
**M1 Major: a copy onto a combination that once had the form writes that combination's old line, not the source's (BR-C2), and the preview says "Will be added" with no reason.**
* `api/src/lines-bulk.ts:126` says a restore only when the removed row's predecessor is PUBLISHED. `addFormLine` (`api/src/form-lines.ts`) restores in two more cases: a released removal (newest RETIRED, predecessor SUPERSEDED) makes v+1 from the old content; a draft-only line removed in place goes back to DRAFT with its own content. In both, `:220` skips the source's settings because `before.length > 0`.
* Repro on :4444: Visitor visa gets IMM 5476 v1 SUPERSEDED + v2 RETIRED (`each_applicant`, "Sample old condition"), as after a released removal. Preview from With an LMIA ("for the principal applicant · only if Needed when the applicant uses an authorized representative…") gives `WILL_ADD`, reason `null`. Apply gives 200 "IMM 5476 added to 1 combination". The written v3 is `each_applicant | Sample old condition | source_quote "old"`: not the source's who or condition, and no "Copied from".
* Effect: BR-C2 broken. Also, the preview checked person, channel and fact against the source's line, but a different line was written.
* Fix: in both cases either say so in the preview, as m1 of (a) did for the first case ("its own earlier line returns …"), or write the source's content over the restored row. Add a test for each.

**M2 Major: `SELECT … FROM combination … FOR UPDATE` (`lines-bulk.ts:181`) deadlocks with a single "Add form" on the same combination, and the losing request gets a 500.**
* Repro: a bulk add of IMM 5476 to Visitor visa and Study permit, sent at the same time as `POST /combinations/<VV>/forms {"formKey":"IMM 5476"}`. **6 of 6 runs: single 500, bulk 200.** `var/isolated-screens_x2b/api.log` shows `40P01 deadlock detected`. With two bulk calls plus a single add, both bulk calls got 500 in one run.
* Cause: the single insert puts its unique-index entry first, then its foreign-key check needs KEY SHARE on the combination row, which the bulk call holds FOR UPDATE. The bulk call's `createMany` then waits on the single insert's index entry.
* The data stays correct (one line, whole-or-nothing holds). But an existing Forms-tab action now fails with "Something went wrong" whenever a batch touches the same combination.
* Fix: `FOR NO KEY UPDATE`. It still makes two batch calls wait for each other and does not conflict with the foreign-key KEY SHARE. Also map `40P01`/`P2034` to a 409 "Busy … try again" in words, as Undo does (`:298`).

**m1 Minor: BR-C2's channel, signature and "only if" copy is untested** (STANDARDS §7 [M] "a rule's test fails when the rule is removed").
* `tests/check_x2b_bulk_apply.ts:54,62`: the source keeps `PDF_UPLOAD`/`NONE`, which are also `addFormLine`'s defaults. Dropping `channel`/`signature` from `copied` (`lines-bulk.ts:345`) would still pass.
* `predicateJson` (`:220`) is never compared. I checked by hand that it is copied (`t|t`).
* Fix: give the source line `PAPER`/`PEN` with an accepting record, and compare `predicate_json`.

**m2 Minor: the migration does not meet two STANDARDS §5 [M] lines.**
* `idempotency_key` is unique across all workspaces (`migration.sql:24`, `schema.prisma:568`). The other keyed tables use `@@unique([workspaceId, idempotencyKey])`.
* `op` and `kind` are free TEXT with no CHECK (add/remove, form/document): there is no level check in the database.
* What is met: expand only, existing rows kept, rollback recorded, read paths indexed.

**m3 Minor: words.** `undoRefusedWords` (`contracts/lines-bulk.ts:84`, used at `lines-bulk.ts:309,312`) always says "changed after the copy", including for a removal batch. Pass the verb ("after the removal").

**m4 Minor: branches with no test.**
* Remove of a draft-only line (changed in place, `:224`).
* Undo of a removal refused by an open retire request (`:282-283`) or by a retired document type (`:286-287`).
* The `P2002` replay path (`:202-205`).
* A document add racing a single add of the same `type:who` key: the `P2002` comes from `document_requirement`, not `line_batch`, so `:206` rethrows it as a 500.

**n (nits, not blocking).**
* A replay after the batch was undone still answers "added to N" with `replayed: true` (`:253-259`).
* Undo writes no batch-level audit line, though apply writes one (`:197` vs `:330`).
* attachNow's two refusals are written out again (`:169-176`, the same as `form-library.ts:347-348`) instead of shared.

## 2. What holds
* **Re-check inside the transaction.** The ticked combinations are locked in id order, the preview's rules run again on `tx` (`:185`), and any row that can no longer be ticked refuses the whole batch with its name (tests 77, 79, 82).
* **`addFormLine` is used for every form add.** Retirement and open retirement are checked again there. attachNow's "no file yet" and "waiting for a person" are applied before the write, with the same words (tests 90, 95).
* **Idempotency.** A replay with the same key changes nothing (counts the same). The same key used for another change gets 409. Two identical requests at once make one batch (test 176). The `P2002` fallback is there too.
* **Undo is whole-or-nothing, in one transaction with locks.**
  * Every target's rows are compared on id, status, version and signature against `after`. A missing row is detected as `gone` and named as "its own Undo on its Forms tab" when that is the cause.
  * A release after the batch is refused before the transaction. Inside it, release changes a row's status, so it is caught there as well.
  * Rows are put back by upsert; `predicateJson`/`alternatives` nulls are handled.
  * Undo can be done only once (row lock plus `undoneAt`). Only the batch's author may undo; the approver gets 403, an unknown or malformed id gets 404 in words.
* **Combinations' own Undo steps.** Each target gets a `form_line_action` with `batch_id`, so its Forms tab shows its own change. Batch Undo marks those steps spent (test 119). A Forms-tab Undo of one target makes batch Undo refuse with the name, which is the whole-or-nothing rule. The earlier step on that combination stays exact after a batch Undo.
* **Carries from #254.** n1 is tested both ways and n2's words are tested. Paper with an account record and Not needed are tested pass and fail (`check_x2b_bulk_preview.ts` +32 lines).
* **Other checks.**
  * Roles: author only, with 403 for the approver, case officer and content reviewer.
  * zod and Problem Details with field errors.
  * The demo reset deletes `line_batch`.
  * Audit: one line per target plus one for the batch.
  * `tsc`: no errors in the new files.
  * Graph: G1 and G2 are 0. The routes are tested, and C1.5 lists both checks.
* **Tests and timing.** Builder's checks: **41/41 and 62/62**. Apply to 4 combinations 0.06 s, Undo 0.02 s.

## 3. Standards and dimensions (API-only slice)
* [M] met: zod contract, RFC 9457, authorisation on the server, idempotent create, no per-row requests, strict TS, rollback recorded, §9 budget.
* [M] partly met:
  * concurrency (M2);
  * a rule's test fails when the rule is removed (m1, m4);
  * §5 uniqueness scoped to the parent, and level checks (m2).
* D1 ½ (M1), D2 ½ (M1 writes the wrong content), D4 ½ (M2 deadlock), D10 1 (m3 aside), D15 1, D16 ½ (m1, m4), D18 1.
* D8, D9 and D11–D14 have no screen until (c). D17 and D20 are the founder's (simulated only).

## 4. Journey test (reviewer role, API-only; the one score for this check)
Persona: the content publisher (`user-A`). Walked as API calls with psql underneath.
| # | Journey | Result |
|---|---|---|
| 1 | Main: preview, then add IMM 1295 to 4 combinations; one toast | Holds: 4 drafts, toast words, 5 audit lines |
| 2 | Undo the batch | Holds: every target back, steps spent, audit per target |
| 3 | Add a form a target once had (released removal) | **Wrong line written** (M1) |
| 4 | A colleague adds the same form on the Forms tab at the same moment | **Their Add gets 500** (M2) |
| 5 | Undo after a target changed, after a release, after its own Undo | Holds: refused, named, nothing undone |
| 6 | Retry: same key, then the same key twice at once | Holds: one batch, nothing twice |
| 7 | Wrong role, unknown or malformed batch id, other person's batch | Holds: 403 / 404 in words |
| 8 | Document line add, remove and Undo | Holds |
| 9 | Across to (c) | Not testable: no dialog yet |

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | 1, 2, 5–8 hold; 3 writes another line |
| Next step obvious | 1 | Refusals say what to do ("Preview again", "Change it in a new draft") |
| Plain words | ½ | "after the copy" on a removal (m3) |
| Feedback and state | 1 | Named target, what, who, when; `replayed` flag |
| Correct data | ½ | M1; otherwise exact, verified in the database |
| Error recovery | ½ | M2 gives a 500 with no words of its own |
| Accessibility and screen sizes | ½ | Not testable: no screen in (b) |
| Speed | 1 | 0.06 s apply, 0.02 s Undo |
| Visual quality | ½ | Not testable: no screen in (b) |
| Trust and sources | 1 | "Copied from <trail>", HUMAN origin, no AI or finder run carried |
| **Total** | **7 / 10** | Below 8. Fix M1, then M2, then m1 and m3 |

## 5. Not checked
* Keyboard, axe, 1024 px and 200 % zoom (no screen).
* A real screen reader, and an intended user's own walk (D17/D20).
* The team's code (`code/` is not in this copy).
* 150-target apply (the sample has 6 combinations).

Approve on 04bac96f: **no. Block**: fix M1 and M2.


## 6. Re-review at ad53bec7 (1 Nov 2026, same reviewer; `git diff 04bac96f..ad53bec7`)
Copy :4444 restarted fresh with the changed migration. Builder's checks: **55/55 and 62/62**. I also ran my own probes again.
* **M1 fixed.** `lines-bulk.ts:227-233`: when the newest row after `addFormLine` is a DRAFT, it takes the source's whole line. My probe after a released removal now writes v3 as `principal_applicant | Needed when … representative | Copied from … › With an LMIA`. When a released line comes back, it stays released, which the preview already says. Both restore cases are tested.
* **M2 fixed.** The lock is now `FOR NO KEY UPDATE` with `lock_timeout` 10 s (`:185-186`). In 6 of 6 runs of a bulk add raced against a single Add, the single Add got 201 and the bulk got 409 "Changed since the preview", in words. The log shows **0 new deadlocks**. In the three-way race (two bulks and one single Add), 5 of 5 runs had no 500, one line and no batch. Deadlocks and lock waits are mapped to a 409 "Busy" (`:211-214`), and there is a race test.
* **m1 fixed:** the source now has a signature, an "only if" and a `predicate_json`, and each is compared. **m2 fixed:** the database now has `line_batch_workspace_id_idempotency_key_key` and the `op` and `kind` CHECKs. **m3 fixed:** a removal batch now says "after the removal". **m4 fixed:** draft-only remove, an open retirement, a retired document type and the race each have a test.
* **Breaker's Minors:**
  * the same key with other targets gets 409;
  * an undone batch's replay says it was undone;
  * Undo refuses a retired combination;
  * Undo spends later Forms-tab steps on its lines;
  * Undo leaves rows it never touched alone;
  * there is a batch-level audit line on Undo;
  * the rollback note names `batch_id`.

  Each has a test, and I read each one.
* **Still open (nits, not blocking):**
  * The channel copy itself is still indistinguishable from the default, because the source stays `PDF_UPLOAD`. Dropping `channel` from `copied` (`:345`) would still pass. One `PAPER` with an accepting record would close this.
  * The "Busy" mapping (`:213`) also catches any `P2010`/`P2025`, so an unrelated raw-query or not-found bug would read as "Busy" instead of 500. Narrowing it to `40P01`/`55P03`/`P2034` plus the line `P2002` would be safer.
  * Two items are listed in the PR and accepted as not done: the attach checks are still copied from `form-library.ts`, and each target costs about 10 queries (500 targets take 4.7 s, beyond the sample's scope).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–8 hold, including 3 (source's line written) and 4 (no 500) |
| Next step obvious | 1 | "Preview again", "Restore it on Structure first" |
| Plain words | 1 | Removal wording fixed |
| Feedback and state | 1 | Target named; a replay of an undone batch says so |
| Correct data | 1 | Checked in the database after each probe |
| Error recovery | 1 | Races give a 409 in words |
| Accessibility and screen sizes | ½ | Not testable: no screen in (b) |
| Speed | 1 | Apply 0.06 s, Undo 0.02 s on the sample |
| Visual quality | ½ | Not testable: no screen in (b) |
| Trust and sources | 1 | "Copied from <trail>", HUMAN origin |
| **Total** | **9 / 10** | Pass |

D1 1 · D2 1 · D4 1 · D16 ½ (channel nit). No Blocker or Major is open. **Verdict: Approve on ad53bec7.**
