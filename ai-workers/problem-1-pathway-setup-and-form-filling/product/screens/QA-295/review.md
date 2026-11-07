# QA-295 review: "Prepared by · Reviewed by" when the representative records (row B126)

* **Commit reviewed:** `09cbd4250` on `claude/b126-qa295-prepared-by`, against `origin/main` `4a7e3107d` (diff: 4 files, +70 −3).
* **Reviewer:** independent reviewer agent; read-only; live AI off; no isolated copy started (the paths below were shown by reading the code and by calling `recordedPeople` directly).
* Paths are under `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/` unless stated.

## What I ran

| Check | Result |
|---|---|
| `tests/check_qa295_recorded_people.ts` (pure) | 7/7 PASS |
| `node product/tools/typecheck.mjs` | api: 15 known errors, 0 new; web: 0. **PASS: no new type errors** |
| Probe of `recordedPeople` on paths the check does not cover (scratch script, not committed) | 3 paths give `preparedBy === reviewedBy` (renders "Self-reviewed"); see Major 1 |

Probe output (R = representative, O = case officer):

```
no review, review warning passed, rep records:            {"preparedBy":"R","reviewedBy":"R"} self: true
officer left before review, no replacement, rep records:  {"preparedBy":"R","reviewedBy":"R"} self: true
officer assigned only after the review, rep records:      {"preparedBy":"R","reviewedBy":"R"} self: true
stale review by former rep R1, new rep R2 records:        {"preparedBy":"O","reviewedBy":"R1"} self: false
```

## How a filing reaches Ready to file (question 1)

* Ready to file needs no review: `representative_review` is a CRITICAL **warning**, not a block (`engine/runtime/readiness.ts:36-40`, `:164-166`). Only `barcode_not_validated` blocks (`:38`, `cannotPass` `:227-231`). P-315: every other line is passed with a reason or fixed.
* Anyone with officer access can pass it: `api/src/readiness.ts:84-104` checks no role. The suite already does this: `tests/check_c76_readiness_api.ts:77` (the case officer passes `representative_review`, "Representative on leave; partner read it (Sample)", 200). `tests/check_c76_readiness.ts:154` asserts `cannotPass("representative_review") === null`.
* So there are three paths to Ready to file:
  * **A. A current review.** It is by today's representative of record and for today's facts (`api/src/readiness-inputs.ts:98-99`). The newest review is that review: a new review can only be made for the facts as they are now (`api/src/readiness.ts:73-74`), so no newer review can exist for other facts. **Fixed by this change.**
  * **B. No review; the review warning passed with a reason.**
  * **C. A stale review:** facts changed after it, or the representative changed; the review warning passed with a reason. The pass key carries the facts key (`engine/runtime/readiness.ts:164`), so this needs a deliberate pass.
* A facts change after Ready to file takes the filing back to Not started on the next view (`api/src/case-prepare.ts:381-383`). The record route's own view read (`api/src/submission.ts:69`) and the `READY_TO_FILE` guard inside the transaction (`:120-121`) then refuse it. So on path A, "the latest review" is the review that made the filing Ready.

## Findings

### Blocker
None.

### Major

**M1. The QA-295 symptom stays on two reachable paths: no review (path B), and no officer on the team at the review time.**
* Path B: `engine/runtime/submission-record.ts:65` returns `{ preparedBy: recorder, reviewedBy: representative }`. When the representative of record records, both are the representative, so `api/src/submission-record.ts:61` sets `self: rec.reviewedBy === rec.preparedBy` to true. The screen then reads "Representative · Self-reviewed" (`web/src/runtime/submission.tsx:116`): the founder's bug, on a path the product allows by design (P-315).
  * The record also claims a review that never happened. That was already true on main, but this change keeps it.
* The doc comment (`engine/runtime/submission-record.ts:58-59`, "a filing recorded before reviews existed") and the check's label (`tests/check_qa295_recorded_people.ts:25`) describe path B as legacy only. It is a live path.
* No officer at the review time: the officer filter (`engine/runtime/submission-record.ts:68`) needs an officer who was active at `reviewedAt`. If the only officer left before the review (with no replacement yet), or was assigned only after it, line 70 falls back to `recorder`. When the representative records, the record again reads Self-reviewed.
  * The review route itself treats ended officer rows as preparers ("Break N4": `api/src/readiness.ts:47-48`, `:63`), so the two disagree about who prepared the filing.
* Suggested fix, with no schema change:
  * Choose the preparer from the case team whether or not a review exists. Take the non-reviewer officer active at the review time. Failing that, take the officer active at recording, then the most recently ended officer row. Use the recorder only when the case never had an officer.
  * The reviewer to store when there is no current review (path B, and C below) is a product question for the tech lead. `null` would render "no representative of record" (`web/src/runtime/submission.tsx:116`), which is also wrong words.
* Add pure cases for: no review with the representative recording; the only officer left before the review; an officer assigned only after the review. Add one C8.2 step: the review warning passed, then the representative records.

### Minor

**m1. Stale review (path C): the record names the earlier reviewer as having reviewed facts they did not see.**
* `api/src/submission.ts:126` takes the newest `filing_review` row without the currency test that readiness applies (`api/src/readiness-inputs.ts:99`: `reviewedBy === rep && factsHash === factsHash now`).
* After a passed stale-review warning, the record reads "Reviewed by: <earlier reviewer>" with no sign that the review was of earlier facts. The probe shows this ("stale review by former rep R1").
* Main named today's representative instead, which was also wrong. The change improves things but does not fully fix them.
* The view the route already holds (`api/src/submission.ts:69`) has, per filing, `readiness[].reviewed` (`{ by, kind }`, `api/src/readiness-inputs.ts:103`). That is exactly "the review that made it Ready", and `null` on paths B and C. Using it, or applying the same currency test inside the transaction, would make "the preparer the review saw" hold by construction.

**m2. Two officers: "earliest assigned" is a stand-in, not the preparer.**
* With a `reviewed` kind, readiness allows any number of officers. It refuses only a self-review where another officer also worked (`api/src/readiness.ts:64-67`).
* Two active officers at the review time give the earliest assigned (`engine/runtime/submission-record.ts:68-69`), even when the second did the work. The data has no per-filing preparer, so this is acceptable for now.
* It should be named as a rule in the doc comment or the build notes, so a later row can tie it to who filled the forms or marked Ready.

**m3. The pure check does not cover the cases that fail** (see M1): no review with the representative recording; the only officer left with no replacement; an officer assigned after the review; a stale review. Its "officer who left" case (`tests/check_qa295_recorded_people.ts:21-23`) only covers a replacement being present.

### Nit

* **n1.** Tie order differs. The record route takes the latest review by `reviewedAt desc, id desc` (`api/src/submission.ts:126`); readiness takes `reviewedAt desc, id asc` (`api/src/readiness-inputs.ts:56`). Two reviews of one filing in the same millisecond could resolve to different rows. Use the same order (or the view's review, m1).
* **n2.** Two steps share the ID `C8.2-14` (`acceptance/C8.2.test.ts:59` and `:64`). Name the second `C8.2-15`.
* **n3.** `m.userId !== review.reviewedBy` (`engine/runtime/submission-record.ts:68`) never applies to a `reviewed` kind: such a reviewer was never an officer (`api/src/readiness.ts:63-71`). It is harmless and documents intent.

## Question 2: other readers of `preparedBy` / `reviewedBy`
* `api/src/submission-record.ts:59-61` (the record view, `self = reviewedBy === preparedBy`) agrees with the new values. A `self_reviewed` review stores both as the reviewer, so it still reads Self-reviewed. A second-person review now reads the reviewer's name.
* The screen (`web/src/runtime/submission.tsx:116`) and the contract (`contracts/submission-record.ts:47`) are unchanged and consistent.
* Corrections (`api/src/submission.ts` `correct`/`correctUci`) do not read or write either field.
* The "recorded" audit line names only the one recording (`api/src/submission.ts:134-135`).
* The older checks `tests/check_c82_record_api.ts:93-96` and `tests/check_c82_record_browser.ts:107` (the officer records after the representative's review) still expect `officer|rep`, which the change still gives.
* No reader disagrees.

## Question 3: transaction safety
* Lock order is unchanged: `runtime_case FOR NO KEY UPDATE` first (`api/src/submission.ts:114`), then the filing `updateMany` (`:120`).
* The new reads take no locks: one `caseTeamMember.findMany` (`:124`) and one `filingReview.findFirst` per filing (`:126`, on `@@index([filingId])`, `prisma/schema.prisma:2281`). A group has a handful of filings, well inside the 15 s timeout.
* `versionOf` covers filings and items only (`api/src/case-prepare.ts:563-571`), so reviews and the team are not part of the version check. Reading them fresh inside the transaction is the right place.
* A review added concurrently is always for the facts as they are now (`api/src/readiness.ts:74`), so it cannot make the record wrong.
* A concurrent team change is not locked. That is the same as the existing representative read (`api/src/submission.ts:122`), and older than this change.
* Safe.

## Question 4: are the tests sound?
* C8.2-13/-14 (`acceptance/C8.2.test.ts:51-64`) make the representative review (the `readyToFile` helper, `acceptance/lib/m3.ts:384`), then the representative records.
* On main, the data step gets `rep|rep|rep` instead of `officer|rep|rep`, and the view step gets `prepared_by = rep`, `self = true`. Both fail for the right reason, which matches the builder's 13/15 on main.
* Step 13 (200 for the representative) passes on main too, as it should.
* Coverage gaps: m3, and no C8.2 step for path B.

## Question 5: typecheck
PASS: no new errors (api 15 known, web 0).

## Verdict
**Request changes:** M1 (the same "Representative · Self-reviewed" record on path B, where the review warning is passed, and when no officer was on the team at the review time). m1 and m2 can go with it or to a follow-up row as the tech lead decides; the nits are optional.
