# Row C4 — the M3 packs on the configured checkpoint (C7.6, C9.2, C11.6, C7.7)

M3 sprint plan row C4 (`product/design/m3-sprint-plan-2026-11-06.md`). One small PR per pack, each from a fresh
`origin/main`, in this order: C7.6, C9.2, C11.6, C7.7 (C8.1's move is already on `main`). Each pack reads its forms
through C1's `expectedLines` (`acceptance/lib/m3.ts`): the barcode form, the form signed by hand and scanned, the family
form. No form number or channel is written in a pack line (P-319). Every run below: a fresh isolated copy, Demo ›
Reset then Demo › Load the configured checkpoint (or the fixture: `setup_visitor_visa.ts` then `setup_vv_m3.ts`), live
AI off, US$0. Logs in `runs/`.

## Step 1: diagnosis (the tech lead's ruling on #1225, Lead 30)
Posted on #1225 (comment of 7 Nov ~15:15 IST) before any pack line was changed for good.

**The 17 IMM 5476 facts are QA-300, none a helper gap.** After `fillEverything`, IMM 5476 keeps two CRITICAL
`missing_facts` lines on the subject `representative`: 5 facts owed by staff (`representative.licensing_province`,
`.uncompensated_category`, `.uncompensated_other_description`, `.supervising_lawyer_name`,
`.supervising_lawyer_membership_id`) and 12 owed by the client (`person.address_*` 7, `person.email`,
`person.phone_country_code`, `person.phone_number`, `person.fax_country_code`, `person.fax_number`). Each is required
and not hidden; `fillEverything` already tries it, and every PUT is refused (422 "The representative's details come
only from the firm record of the representative of record, so they are not saved on a case."), as the case officer,
the client, the representative, and the officer on the representative's behalf. The firm record leaves them out on
purpose (`engine/runtime/team.ts`, the ruling on #1072). So no screen or route answers them: qa's QA-300, fixed by row
B107 (#1231). `acceptance/lib/m3.ts` is not changed.

**Not on QA-300's list:**
* **(a) The barcode form's signature once a case files it off Online.** Release 2 files IMM 5257 Online, signature
  NONE; its item accepts Online, PDF upload and Paper (`accepts_quote` null). On Paper it is signed in pen, and no route
  records a Paper line's print or sign-in-pen step (`sign-steps.ts` takes only hand-scanned items; `paperLine` writes
  `done: null`). As a PDF upload its signature stays NONE, which `signatureNeeded` waits for (`signed_by`
  `parent_for_minor`): "must be signed (how it is signed is not set on the form line yet …)". Either way a CRITICAL
  `missing_signature` stays that nothing on the case can clear. Proposed for qa as a Gap · Major (C7.6, C8.1, C7.7).
* **(b) C7.6-4 (QA-122) finds no optional date.** Release 2 asks the principal 121 questions, all required.
* **(c) C9.2-9:** the principal's family form on release 2 (IMM 5645) is a PDF upload, which has no answer sheet;
  filed Online for the person, it still has none: "IMM 5645 has no section list yet (contracts/pdf-sections.json)". That
  is C7.3's portal sheet (#1075, row C2, held).
* **(d) C11.6-8a:** the fixture's Sample accepts record (setup S4a) takes IMM 5257 as a PDF upload only on the APR
  Portal; release 2 accepts it Online, so "Online on IMM 5257 is refused" has nothing to refuse there.

## The tech lead's answers (Lead 30, #1225, 7 Nov 15:30 IST)
1. **Paper for the barcode form in C7.6 and C9.2**, under the founder's Q3 (P-380): a case officer may switch one
   person's IMM 5257 to Paper only with a written accommodation reason; Sample until the immigration expert confirms;
   Unconfirmed: no counsel. PDF upload is out (no IRCC quote; how it is signed is an immigration value we do not have,
   AGENTS rule 4). The -6 wording "on Paper" is approved with the rest of the lines.
2. **Gap (a) is its own runtime row, B132:** a PEN item's `print` and `sign_in_pen` recorded in order and read by
   `paperLine`; it goes to the B3 lane after B129 (`sign-steps.ts` has one owner). C7.6-12 and -19 stay red on the
   checkpoint until B132 lands, never passed inside the pack.
3. **C7.6-4:** a required date is allowed where the release has no optional one, with the same rule (P-47 saved and
   flagged, a CRITICAL `fact_problem` on that form); the line names which kind it used. Measured: on the checkpoint the
   required `person.national_id_issue_date` given as 1990-13-45 is saved (status < 300) and flagged as a CRITICAL
   `fact_problem` on IMM 5257, so -4 passes; the fixture takes the optional date.

**Proposed bug line for qa (the PR proposes it; qa writes BUGS):** "A barcode form switched to Paper on a case keeps a
CRITICAL 'signed in pen' warning that nothing can record: no route records a Paper line's print or sign-in-pen step
(`sign-steps.ts` takes only hand-scanned items; `paperLine` writes `done: null`)." Gap · Major, C7.6, C8.1, C7.7. Row
B132.

## C7.6 (this PR)
| Run | main (pack as it was) | branch (main 1e1ca443e merged in) |
|---|---|---|
| Checkpoint | 15/25 (baseline run 42357755876 on 9dc77d1ac) | **22/25**, exit 1 (`runs/C7.6-checkpoint-branch.txt`) |
| Fixture | 25/25 | **25/25, exit 0** (`runs/C7.6-fixture-branch.txt`) |

Still red on the checkpoint, each waiting for its fix and never passed inside the pack:
* -5: QA-300 (B107, #1231).
* -12 and -19: QA-300 (B107) and the Paper signature (B132).

The fixture's own setup (`setup_vv_m3.ts`) prints 44/46 on `main` and on this branch alike (S2w, S7a: `runs/fixture-setup_vv_m3.txt`); this PR does not touch it.
An earlier trial filed the barcode form as a PDF upload instead (`runs/*pdf-upload-trial.txt`: checkpoint 22/25 with the same three red, fixture 25/25); the tech lead ruled Paper.

Changed lines (for the tech lead's line approval, P-400), all in `acceptance/C7.6.test.ts`:
* The barcode, hand-signed and family forms come from `expectedLines` (`linesOf`); IMM 5707 → IMM 5645 for -20a, -20
  (the family form's editions, read as `${FAM}`).
* `asPaper`: where the release files the barcode form Online, the case officer switches it to Paper for this one person
  with an accommodation reason (founder Q3), for the principal's case and the solo case (-22). A NOTE line, no step. On
  the fixture nothing is changed (its line is a PDF upload).
* -4: an optional date where the release has one, else a required one (not the date of birth or an expiry date); its
  earlier answer is put back after; the line names the kind used.
* -6 reads "on Paper" where the barcode form was switched, "on PDF upload" on the fixture.
* Step labels name the forms they read (`${BC}`, `${HS}`, `${FAM}`); no step dropped or added (P-330 (7)).

## Next PRs (measured here before their own PRs; each from a fresh `origin/main`)
| Pack | Checkpoint | Fixture | Red on the checkpoint |
|---|---|---|---|
| C9.2 (PDF-upload trial; Paper next) | 10/11 | 11/11 | -9 (c) |
| C11.6 | **14/14** | 14/14 | none |
