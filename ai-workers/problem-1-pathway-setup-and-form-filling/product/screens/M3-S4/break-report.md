# M3-S4 break report: never-waivable blocking line (breaker, 11 Nov)

**What was tested:** commit `08768fc3c` on `claude/cool-ritchie-ybny5d` (PR #1571). Diff scope `origin/main...08768fc3c`. The copy was `br_m3s4` on :4438, loaded from the configured checkpoint (133 s). Live AI was off (US$0). The copy is stopped and its database dropped. M3-S4 has no `concept.md`, so the scope is the BACKLOG row and the PR's claims.

**Working tree:** another session edited the shared working tree at 14:51 UTC. It left uncommitted changes in `api/src/case-checklist.ts`, `engine/runtime/case-checklist.ts`, `engine/runtime/readiness-figure.ts`, `web/src/runtime/checklist.tsx` and `stages.tsx`, labelled "review M1, M2, m1, m3". My API process started at 14:40, so it ran the committed code. `web/dist` was rebuilt at 14:51:56 from that dirty tree, so the browser probes may have used that bundle. The only difference that matters here is the label on a Not applicable or Waived line. All line numbers below are at `08768fc3c`.

## Findings

**1. Major: a never-waivable line that "may be needed" does not block, and the filing reaches Ready to file.**
* **Steps:**
  1. Release Visitor visa with `copy_of_the_minor_s_birth_certificate:each_applicant` set to `never`. Its condition is "under 18 and travelling alone or with one parent".
  2. Open a case for a principal and a child with no date of birth. The client answers `person.travels_with = alone`.
  3. On the child's filing: review, pass each warning (missing facts: date of birth), then `POST /runtime/filings/:id/ready`.
* **Expected:** the never-waivable line blocks Ready to file, or at least keeps it waiting, while it may be needed. Today it can only be lifted by passing a warning.
* **Actual:** `200 ready_to_file` with `blocks: []`. At that moment the line reads `need: "answer_first", never_waivable: true`: "May be needed … answer Date of birth … first". The "May be needed" card on the checklist does not mention never.
* **Cause:** Prepare feeds readiness only the `needed` lines (`api/src/case-prepare.ts:182`, `engine/runtime/case-checklist.ts:247`). Waiting lines never reach the block at `engine/runtime/readiness.ts:253`. The guarantee is sidestepped by leaving the condition's question unanswered and passing a missing-facts warning.

**2. Major: a conditional never requirement that does not apply still makes the person's base line never waivable.**
* **Steps:**
  1. On Visitor visa, add a second line for the same document, `passport_information_page_copy` for `principal_applicant`, as `ANSWER_CONDITIONAL` (marital status = married) with `waiver: "never"`. Release it.
  2. Open a case where the principal answers `single`.
* **Expected:** the never rule applies only when its requirement does. The base line keeps its usual behaviour: Not applicable allowed, a missing file is a warning.
* **Actual:** the merged line reads `never_waivable: true` and "Always needed for this application.". Not applicable is refused with 422 ("… never waivable, so Ready to file waits until it is received"). Prepare shows the `document_never_waivable` block for the principal.
* **Cause:** `engine/runtime/case-checklist.ts:231` does `keep.never_waivable ||= drop.never_waivable` whatever `drop.need` is. The providers merge two lines further down has the `ORDER[drop.need] <= ORDER[keep.need]` guard; this merge does not.

**3. Major: adopting a newer release says nothing changes, but it turns lines never-waivable, blocks Ready to file and overrides a Not applicable.**
* **Steps:**
  1. Open Study permit case C1. Mark the passport Not applicable and request the fee receipt.
  2. Take Study permit case C3 to `ready_to_file`.
  3. Release Study permit with the passport, letter and fee receipt lines all `never`.
  4. Open `GET /runtime/cases/:id/release-update`, then `POST` it.
  5. Repeat on a Work permit case with the passport marked Not applicable.
* **Expected:** the list names each document line that becomes never-waivable and the filings it touches. A line now Not applicable on the case is named as blocking again.
* **Actual:** the view returns `changes.documents: []`, `touched: []` and "0 pieces of work the release does not touch…". The move succeeds with "Moved to Release 7".
  * C1 afterwards: the Not applicable passport is `required: true` and 3 blocks stand.
  * C3 drops from `ready_to_file` to `NOT_STARTED`, blocked on the letter.
* **Cause:** the diff compares only added and removed document types (`engine/runtime/release-update.ts:72`, `:100`), so a waiver change is invisible to the person deciding the move.

**4. Minor: a kept line that is no longer needed still says it blocks and cannot be marked Not applicable.**
* **Steps:** on a child whose birth-certificate line is needed, Request it, then change `travels_with` to `both_parents`.
* **Actual:** the line is kept (`need: not_needed`, `required: false`) and Prepare has no block for it.
  * The API still sends `never_waivable: true`, and Not applicable is refused with 422, whose words say "so Ready to file waits until it is received". That is untrue here.
  * The UI shows "Never waived: Ready to file waits until it is received" and the ⋯ menu offers only "Upload a file…" and "History". The officer cannot close a line nobody needs.
* **Where:** `api/src/case-checklist.ts:135` (kept lines keep `l.never_waivable`), `:209`; `web/src/runtime/checklist.tsx:152`, `:174`.

**5. Minor: the readiness figure leaves out a blocking line that was Not applicable or Waived.**
* **Steps:** Work permit case. Mark the passport Not applicable, release the passport line as `never`, then adopt the release.
* **Actual:** `blocks: ["document_never_waivable"]`, but the figure's document items list only the fee receipt.
* **Cause:** `engine/runtime/readiness-figure.ts:72` filters on `d.required`, and `api/src/readiness-inputs.ts:150` sets that false for Not applicable or Waived.

**6. Minor: header comments still describe the removed guard.**
* `api/src/case-checklist.ts:3-4` and `api/src/case-prepare.ts:5-6` still say "Visitor visa only in this slice; other combinations answer 'not derived yet'".

**7. Minor: the migration's rollback rewrites released rows and leaves the release snapshots as they were.**
* **Steps:** ran the rollback in a transaction, then `ROLLBACK`.
* **Actual:** it runs cleanly, but it sets all 5 `never` rows to NULL, and all 5 have `status = PUBLISHED`. The 2 `config_release` snapshots still say `"waiver": "never"`.
* **Effect:** cases pinned to those releases keep blocking unless the code is rolled back too. The next release review would also report the lines as changed.
* **Where:** `prisma/migrations/20261111200000_m3s4_never_waivable_line/migration.sql:6`. M3-S3's rollback follows the same pattern.

## What held
* **The waiver value at the API:** `"NEVER"`, `" never"`, `"Never"`, `"always"`, `""`, `1`, `true`, `["never"]`, `{}` and `"never​"` were each refused with 400 `Waiver: choose "waivable", "never", or none.`, and nothing was stored.
* **Who may set it:** the officer, the representative, the client, the reviewer and the approver each got 403 (no author duty).
* **The database:** the check constraint is `waiver IS NULL OR IN ('waivable','never')`, and `'always'` is refused.
* **Acting on a never line:** waive and Not applicable are refused with 422 in words, for the officer and for the representative. The client gets 403, the author 403, and another firm (user-S) 404.
* **The block:** passing `document_never_waivable` is refused with 409 for the officer and the representative, and 404 for another firm. `POST …/ready` answers 409 and names "3 blocks … a block is never passed".
* **States set before the release said never:**
  * A Not applicable line is required again and blocks. Request from Not applicable answers 200, then upload, then Received.
  * A Ready to file filing goes back to Not started on the move.
  * An earlier pass of `missing_document` does not lift the block.
  * A Received line does not block.
* **Release review words:**
  * A changed line reads "(now never waivable: it blocks Ready to file until received)".
  * An added line reads "(never waivable: …)".
* **Uploads:**
  * A file starting `MZ` named `.pdf` and an SVG were refused with 415; an empty file with 400.
  * A PDF with planted instructions was stored as a plain file (no AI reading, US$0) and only turned that one line Received. The other two never lines still block.
  * A 300+ character name in Unicode was stored at 200 characters.
* **Combinations worked out for the first time:**
  * Express Entry: the principal's nomination certificate.
  * Family sponsorship (spouse): 3 lines for the principal.
  * Both get document items and `missing_document` warnings on Prepare. Neither has a next stage.
  * Start next stage from Study permit to Work permit reads "2 documents on the checklist". No 500 errors.
* **The author's dialog in the UI:**
  * Radio group "Waiver on a case" at 1024 px, and at 640 px at 2× (the 200 % case): no horizontal scroll, no page errors.
  * The arrow keys cycle Usual, Waivable and Never.
  * The drawer reads "Never: …".
* **The officer's ⋯ menu** on a never line, opened by keyboard, at 1024 px and at 200 %: no Waive and no Not applicable. Request, Upload and History are offered. The Ready to file panel lists the block in words.

## Not attempted or not judged
* **Not judged:** two author saves in parallel without `baseRevision` both answered 200, and the stored value is the `never` one. That is the earlier save mechanism, not this row's.
* **Not attempted:**
  * The 100 programs / 400 combinations budget run.
  * Browser reload or back in the middle of an action.
  * A live Rejected state: no route sets it. By the code it blocks, since it is not in `RECEIVED`.
