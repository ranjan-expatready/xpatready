# BK-18 (QA-448) — break report

Branch `claude/screens-true-record` at `c8c28c19`, fresh isolated copy `breaker18` (:4446, then :4448 after another
session's stop killed the listener on 4446), configured checkpoint, live AI off, US$0, no priced button.
Screenshots and scripts: `/tmp/claude-0/-home-user-xpatready/072c2dc5-6caf-5d9d-99d0-7d065e571f73/scratchpad/`
(`S3-selfreview-over-officer-work.png`, `S8-two-people-for-a-self-review.png`, `record-1024-200pct.png`).

## B1 · Blocker — the compliant two-person review is refused (409) when the representative opened the case

Opening a case is counted as preparing it (`api/src/case-work.ts:22` always puts `case.createdBy` in the work record),
so the ordinary journey — the representative opens the case, the case officer prepares it, the representative reviews
it — is now a dead end.

Steps (case `b2d96148-b5ef-4a8d-ab88-e79e9cdbf8a6`): as **user-R**, Open a case (Study permit, Outside Canada) with the
dialog's default team (officer user-O). As **user-O**, answer one question (`PUT /runtime/cases/:id/answers/:subject/
person.has_national_id`). As user-R, Send for review → Approve.
* Expected: "Reviewed by Representative (Sample)" — the officer prepared it, the representative reviewed it as a second
  person; the representative typed nothing.
* Actual: 409 on both routes, `POST /runtime/reviews/:id/decision` and `POST /runtime/filings/:id/review`:
  *"You prepared this filing with another case officer: a review by you would read as a second person's…"* — untrue
  words (the representative only clicked Open a case), and no way to record the review except handing it to another
  representative or passing the review warning with a reason (which loses the review on the record).
  `api/src/readiness.ts:78`, `engine/runtime/review.ts:116` (`authors.size > 1`), `api/src/case-work.ts:22`.
* `prepared_by` for that filing: `["user-R","user-O"]` — the record would also claim the representative prepared it.

## B2 · Blocker — a second person really works on the case, the record says one person did it all

Work that leaves no answer row makes nobody a preparer, so the gate asks the representative for the self statement and
logs a compliance statement that is false.

Steps (case `2b0ac790-271a-4c20-9be2-f9d8558caa73`, screenshot `S3-selfreview-over-officer-work.png`): as user-R, Open a
case. As **user-O**: add a person to the case (`POST /runtime/cases/:id/people`, 201) and pass 4 critical warnings with
a written reason (`POST /runtime/filings/:id/warnings/:code/pass`, 200 each). As user-R, Send for review → Approve.
* Expected: two people worked on it → 409 (B1's rule), or at least a record naming the case officer.
* Actual: `prepared_by: ["user-R"]`; Approve first answers 400 *"You prepared this filing yourself: confirm …"*, then
  200 `kind: self_reviewed`. Ready to file reads
  `Prepared by · Reviewed by: Self-reviewed by Representative (Sample) (licence R000000), Nov 13, 2026, 11:38 a.m.`
  — four lines above `Passed with a reason (13)`, every one of them *"— passed by Case officer (Sample)"*, on the same
  screen. The representative has signed "I prepared and reviewed this filing myself" for a filing whose warnings another
  person cleared. Same for an upload, a section ticked as entered, a correction that only supersedes an answer's value
  — `api/src/case-work.ts:10-12` names the limit; the gate (not only the words) now acts on it.
* The acts are in the audit trail (`audit_event`), which BACKLOG BK-18 names as the source; `case-work.ts` reads only
  `runtime_case.created_by` and `client_canonical_answer.source_json->>'actor'`.

## B3 · Major — the record is read live, so a past review's record changes (and contradicts what was logged)

`prepared_by` is computed at every read (`api/src/readiness-inputs.ts:110`), never frozen with the review.

Steps (case `afd7cf3c-fc8c-424e-b4ff-42e72e5f2677`, screenshot `S8-two-people-for-a-self-review.png`): as user-R open a
case, Send for review, Approve with the statement → `self_reviewed`, record `Self-reviewed by Representative (Sample)…`.
Then as **user-O** answer one fact the filing's forms do not read today (`person.national_id_number`, hidden behind
"Do you have a national identity document?", so no approval is withdrawn).
* Expected: the record of a review already made does not change; it says what was declared and logged.
* Actual: the same filing's record now reads
  `Prepared by · Reviewed by: Representative (Sample), Case officer (Sample) · Representative (Sample) (licence R000000), Nov 13, 2026, 11:37 a.m.`
  (`data-record="two-people"`) while `filing_review.kind`, the stored `self_statement` and the audit line all still say
  *self-reviewed by one person*. QA-447 W5's complaint, now the other way round.
  Rule: `engine/runtime/preparers.ts:33` (`self` needs `alone`, so a later preparer turns a self-review into a
  two-person line). The same read runs for a SUBMITTED filing, so the record of a filed application keeps moving.
* Same root: `approve()` reads the preparers outside the row lock (`api/src/review-rounds.ts:400`), so an officer's
  first act landing during an approve is not seen by the gate but is seen by the record a second later.

## B4 · Major — Ready to file and Submission to IRCC disagree about who prepared it

C8.2's record was not changed: it still names a case-team officer (`engine/runtime/submission-record.ts:67-73`).

Steps (case `baa795f4-2a65-4522-a3a0-c81611fe252a`): user-T (second representative) opens the case and answers; the team
is officer user-O (does nothing) and representative user-R; user-R sends and approves → `kind: reviewed`.
* Ready to file: `prepared_by: ["user-T"]` → "Second representative (Sample) · Representative (Sample)".
* `recordedPeople(review, team, "user-R")` on that case's rows returns `{preparedBy:"user-O", reviewedBy:"user-R"}`
  (run against the engine), so Submission to IRCC would print "Case officer (Sample) · Representative (Sample)" — the
  do-nothing officer QA-448 was raised about, frozen into `filing_record.prepared_by` at filing time, permanently
  disagreeing with the panel above it.

## B5 · Minor — "not recorded" can never show; the case opener is always a preparer

`case-work.ts:22` always adds `created_by`, and a case can only be opened by its own firm's staff
(`api/src/runtime.ts:294`), so `prepared_by` is never empty and the screen's "not recorded" branch
(`web/src/runtime/readiness.tsx:215`) is unreachable. The other side of it is B1/B2: a person who only clicked
"Open a case" is named as having prepared the filing.

## B6 · Minor — grain and cost

Every filing of a case names the same people (documented, QA-295 m2), so a filing one officer never touched still names
them. The preparers query is a sequential scan of `client_canonical_answer` on every readiness read and every approve
(EXPLAIN: `Seq Scan … rows=431`, 0.5 ms here; the prepare view itself is 0.7 s on the 5-person sample case), which grows
with the workspace, not with the case.

## What held

Roles: `prepare` is 403 for the client, 403 for the configuration author, 404 for the other firm's representative;
`POST /runtime/filings/:id/review` is 403 for a case officer and for a second representative who is not of record ·
two sessions approving the same filing at once: one 200, one 409 "decided meanwhile", one record · the solo firm
(user-S) asks for the statement and records `Self-reviewed by Solo representative (Sample) (licence R000001)` ·
a person who worked but is not on the case team (user-T) is named, and an officer's ended row does not change the
record (break N4 kept) · a client's own answers are not counted as the firm's preparation (P-242) · names come from the
firm list, so an off-team preparer still shows a name · the record line wraps at 1024 px and at 200 % zoom with no
horizontal scrollbar · the walk's own shape (rep does everything, officer does nothing) reads "Self-reviewed", the
QA-448 fix it was built for.
