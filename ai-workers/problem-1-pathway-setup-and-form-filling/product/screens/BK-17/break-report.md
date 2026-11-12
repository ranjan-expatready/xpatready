# BK-17 break report: a recorded filing keeps its label, people, items and frozen fees (PR #1612, `0646a9071`)

Breaker, 12 Nov 2026. Isolated copy `brk_bk17` on :4435, configured checkpoint. Live AI was off, nothing priced was
clicked, cost US$0. I used product routes for every change. SQL was used only to read results. Nothing was fixed or
committed. Scratch scripts are deleted and the copy is stopped.
The builder's checks pass on this copy: `check_bk17_recorded_filing_api` 17/17 and `check_bk17_keep_recorded` 12/12
(run from `studio/api`; from `studio/` tsx fails on decorators).

## Breaks

**B1 (Major): when only one group is recorded, an answer change can make an unrecorded person vanish from the case.**
Steps, as officer `user-O`, on Study permit (outside Canada):
1. Open a case for a student (30) and a child (15).
2. Answer the child's `person.studies_six_months_or_more` Yes and confirm it. The child now has their own "Study permit"
   filing.
3. `POST /runtime/groups/:gid/split` the child's filing out of the group (200).
4. `readyToFile` both filings, then `PATCH /runtime/groups/:gid/record` the **student's group only** (200).
5. Answer No (200).

Expected: the child, who has not been filed for, still has a filing, or the case says in words why they have none.
Actual:
- `GET …/prepare` lists only the student's filing. The child has no filing, no items and no readiness entry.
  `people[]` shows the child with `filing: null, why: null`, and `not_filing: []` is empty.
- In the database, the child's filing row (READY_TO_FILE) has `active=false`.
- `GET …/filings` agrees: the child is on no filing.
- Answering Yes again brings the child's filing back.

Cause: the sync puts the child under the student's recorded filing (`ownerOf`, case-prepare.ts:219). The child's own
row is not in `keep`, so it is made inactive (:260). `keepRecorded` then replaces the recorded filing's people with the
recorded ones (submission-record.ts:124), so the child appears nowhere. Remove filing, Add back and Make principal
cannot repair this: they are refused on any recorded case (BR-7).

**B2 (Major, follows from B1): the stage can end without its required reason while the child's application was never
submitted.**
On B1's case, before the No answer, `GET …/stages/next` returns
`unrecorded: [{person: "K student"}]`. After the No answer it returns `unrecorded: []`.
`POST …/stages/next` **with no reason** then returns **201**. The ended stage's view lists the child's filing as
`READY_TO_FILE, active:false, application_number:null`.
P-237's warning and its required reason are skipped because `unrecorded()` reads active rows only
(case-stages.ts:161), and B1 made the child's row inactive.

**B3 (Minor, words): a recorded group's label counts people who are not on it.**
- B1's case: the recorded group (student only, recorded with 1 person) reads "**One submission for 2 people applying**"
  on `GET …/prepare`, on `GET …/filings` and on the case page (Submission to IRCC › "Recorded · read-only").
- Mirror case (record the child's split-out group, then No): the unrecorded family group also reads "for 2 people
  applying" while showing only the student's filing.

Cause: `keepRecorded` keeps the derived group's `label`, `why` and `totals` and only recomputes `filings`
(submission-record.ts:126–128; case-prepare.ts:305–306).

**B4 (Minor today, Major once sp.outside has fee lines, i.e. when BK-15 / PR #1591 lands): an unrecorded group would
charge a person who is held on a recorded filing.**
Mirror case of B3: the derivation puts the child on the student's unrecorded filing. `keepRecorded` removes the child
from that filing's people. However:
- `derivedFees` filters fee lines only by filing id (case-prepare.ts:311–312);
- the group's `totals` and `total_cents` stay as derived;
- `GET …/filings` filters the same way (case-filings.ts:51).

The result: the child's lines and the family count stay in the unrecorded group, while the child is also in the frozen
recorded group. I could not show amounts because `sp.outside` has no fee lines on main ("No fee lines in the fee table
for Outside Canada yet").

That same fact means the builder's check "the frozen fees stay (same groups, totals and lines)" passes on empty data
(`total_cents: null, lines: []`). No check covers frozen fees together with a person moving between filings.

**B5 (Minor, pre-existing, outside the promise): `GET …/filings` and `GET …/prepare` disagree on a recorded filing's
status.**
`GET …/filings` gives `status: NOT_STARTED, number: null` for filings that `…/prepare` shows as submitted with their
numbers. BK-17 did not touch status (the derivation's default). I note it only because "the two routes agree" was
asked.

## What held
- **Whole family recorded:** 5 answer flips (No, Yes, No, Yes, No), each sent at the same time as 12 reads (8 prepare,
  4 filings). All 60 reads returned 200 with one identical shape. Filing, item and applicant rows stayed at
  2/2, 13/13 and 2. The version is unchanged, and no row went active or inactive.
- **Date-of-birth changes after recording** (child to 17, 19 and 3): the filings, people and items read as recorded on
  both routes, and `not_filing` stays empty. BR-12 "Filed with an earlier value" tasks open on both recorded filings,
  including one the derivation no longer makes (child recorded alone, then No).
- **Recorded on the child's split group, then No, then Yes:** the child's recorded "Study permit" filing, its 4 items
  and its group stay. The student's unrecorded filing never gains the child. The version comes back to the same value.
- **Refused on a recorded case:** Remove filing, Make principal and Add back previews (409, BR-7); split of a recorded
  group (409).
- **Release update and next stage:** `GET …/release-update` answers 200 on a recorded case. After the next stage (C6.17)
  on a fully recorded case, the ended stage keeps both SUBMITTED filings with their numbers, and the new stage is worked
  out from today ("With an LMIA – inside Canada").
- **Roles:** client `user-P` gets 403 on `…/prepare` and `…/filings`. Representative `user-R` reads the same filings.
- **Unrecorded control:** an unrecorded case is still worked out again (builder's check (3)).
- **Visitor visa and other pathways:**
  - `check_b152_recorded_fees_api` 20/20 (Visitor visa frozen fees, after a fresh checkpoint load).
  - `check_bk9_shared_filing_api` 16/16 and `check_c1112_prepare_api` 29/29.
  - A first BK-9 run failed one line. The cause was `check_c1112_prepare_api`, run before it on the same copy, which
    releases a Visitor visa v2 with the child on the principal's application. The failure did not repeat on a clean
    load, so it is not a finding.

## Re-check at 8b09dbc76

Re-checked 12 Nov on a fresh copy `brk_bk17` on :4435, configured checkpoint, US$0. The copy is stopped and the
scratch scripts are deleted. Results of the suites on this copy:
- BK-17: 24/24 (API) and 21/21 (pure).
- B152: 20/20. BK-9: 16/16. C11.12 prepare: 29/29.

Live fee checks:
- Visitor visa family of five (one child not travelling): CAD 570, 8 lines, on both routes.
- Spouse sponsorship with a child: CAD 1,440, 3 lines.

**B1: fixed.**
Case: the student's group is recorded, the child's group was split out and is not recorded, then the answer is No.
The child keeps their own filing (READY_TO_FILE, 4 items, row still active). The group reads "Kept as prepared…".
This was checked over No → Yes → No, and the version is the same on every read.
After that, recording the child's group works (200), and a later Yes changes nothing.

**B2: fixed.** `GET …/stages/next` lists "K student" as unrecorded after No, so the stage's reason is required again
(case-stages.ts:187).

**B3: fixed for the recorded group, not fixed for the mirror case (Minor).**
- Student recorded: the recorded group reads "One submission" ("Recorded as submitted to IRCC: it reads as it was
  recorded.").
- Mirror case (the child's split-out group recorded, then No): the unrecorded family group still reads "One submission
  for 2 people applying" / "One application for the family." with only the student's filing in it, on `…/prepare` and
  on `…/filings`.
- Cause: the label is recomputed only when the group holds a recorded filing (submission-record.ts:134).

**B4: fixed in code; checked pure only, because sp.outside has no fee lines on main.**
I called `feesOnTheirFilings` on the mirror case with BK-15-style lines:
- the unrecorded group shows `total_cents: null` with the words "Fees not worked out here: Kid is on an application
  already recorded as submitted…";
- no line is shown twice.

Note on the same code: it runs on every case (case-prepare.ts:318, case-filings.ts:52). Given any line whose person is
on no filing of the view, it blanks the group's total with the same "already recorded" words even when nothing is
recorded (pure call, submission-record.ts:145). I found no such line in shipped data (the engine charges people on
their own filing), so this is not a finding today.

**B5: not fixed, as stated (it existed before this PR).**

**New, Minor (words): the kept unrecorded application changes its label.**
In the B1 case, after No the child's kept application reads **"Outside Canada: K student"**, where before it read
"Study permit: K student".
- Cause: a kept row has no stored label, so the combination label is used (submission-record.ts:122).
- Recording it then freezes that label in `recorded_fees.labels`. A later Yes keeps "Outside Canada: K student", though
  its items are the study permit forms (IMM 1294, IMM 5476) that were prepared under "Study permit".

Unrelated: during this re-check, 4 screenshots under `screens/B171/screenshots/` show as modified in the working tree.
I did not make or touch them.
