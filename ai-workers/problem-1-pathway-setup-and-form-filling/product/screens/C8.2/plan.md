# C8.2 Record the submission: plan (runtime lane, M3-F)

Contract: `prototype/studio/acceptance/M3-CONTRACT.md` row C8.2 (fixed, not changed). Design row: PR #863 `screens/M3-design-2026-11-04/rows.md` C8.2.
C7.6's Ready to file is PR #861 (not merged, not merged into this branch): this build reads "Ready to file" from the
filing's stored status as the prepare view shows it, and its own check puts a fixture filing in `ready_to_file`.

## Routes
* `PATCH /api/runtime/groups/:gid/record {filings[{filing, our_reference, submitted_on, application_number, fee_receipt}], ucis[{subject, uci}], version}`:
  the case officer records the whole submission group at once. Order of refusals: 404 no group · 403 not the case's staff
  (a client) · 400 Problem Details on the field (application number required and in the pattern of
  `samples/filing-numbers.json`, Sample; submitted on a real date, not after today; every filing of the group once;
  UCI only for a person on the group) · 409 already recorded (BR-15) · 409 stale version (Reload) · 409 a filing not
  Ready to file (BR-11, P-168, names the filings). One transaction under the case's row lock: `filing.status` READY_TO_FILE
  → SUBMITTED (only while still READY_TO_FILE), `filing.application_number`, one `filing_record` per filing (portal from
  the combination, our reference, date, receipt, Prepared by = the case officer who records, Reviewed by = the
  representative of record), one `filing_person_record` per UCI, the facts each form was filed with, an audit line with no
  government identifier in its summary.
* `POST /api/runtime/filings/:id/record/corrections {application_number, reason}`: "Correct a number": reason required
  (400), the new number in the pattern (400), changes `filing_record` and `filing`, keeps the old one in
  `filing_record_correction` with the reason, who and when.

## Prepare view
A recorded filing reads `status: "submitted"`, its `number`, and `record{portal, our_reference, submitted_on, fee_receipt,
prepared_by, reviewed_by, recorded_by, recorded_at, ucis[], corrections[]}`; its form items whose facts changed after
filing read `state: "out_of_date"` with "Filed with an earlier value: …" and open one `case_task` (`after_filing_change`) per
change: re-sign or tell IRCC (Unconfirmed: no counsel).

## Read-only lock
After recording: channel change, split, "Entered in the portal" and the old PUT application-number route answer 409
("recorded: use Correct a number").

## Tables (one migration, additive only)
`filing_record`, `filing_person_record`, `filing_record_correction`, `case_task`. Append-only where history (corrections).

## Screen
On the case's Prepare application view: a "Record the submission" panel per group (fields per filing and a UCI per
person), the recorded record read-only with Prepared by · Reviewed by, and "Correct a number" with its history.

## Checks
`acceptance/C8.2.test.ts` (-1 on main as is; -2 to -12 need C7.6's `readyToFile`), and
`tests/runtime/check_c82_record.ts`: the same rules against a fixture filing put in `ready_to_file`, plus the lock and
the refusals. US$0, live AI off.
