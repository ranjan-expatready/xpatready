# BK-15 break report: fees per family member as data (PR #1591, `claude/forms-bk15` at 2ff49d6d2)

Breaker, 11 Nov 2026. Isolated copy `brk15` on :4457 (configured checkpoint, 128 s), pure scripts against
`rulesFrom`/`deriveFilings`, and a regression diff of every fee-table combination against `origin/main` (68a7b59d1).
Live AI off, US$0, no priced button. Nothing fixed, nothing committed. Scratch scripts deleted.
The PR's own suites pass on this copy: `check_bk15_study_family_api` 14/14, `check_bk15_fees_by_role` 25/25,
`check_r2_fee_table` 87/87, `check_c1112_modes` 49/49, `runtime/check_added_filings` 58/58.

## Breaks

**B1 (Major): the release check tells the author to overcharge the child who studies.** `engine/validate.ts:128`
(`missed`) ignores `fees_by_role`. It still counts every line whose `roles` reach the child. On the shipped
Study permit (outside Canada) release, `GET /api/combinations/<sp.outside>/review` shows this warning on "Child
(accompanying): Study permit": *"Work permit fee… (work_permit), Open work permit holder fee…, Visitor visa fee… charge
each child on this combination, but the filing it adds does not name them… Name them among the filing's fee lines"*.
With `fees_by_role` no child is ever charged those lines, so the warning is false. If the author follows it, the
studying child pays CAD 155 + 100 + 100 = CAD 355 too much. Expected: with `fees_by_role` the check compares against
`byRole.get(role).lines`. Saving `addsFiling` on the spouse line (now allowed) gets the same false warning.

**B2 (Major): a child with no answer to "6 months or more" gets a confident visitor visa price.** Steps: open a
sp.outside family and leave the child's `person.studies_six_months_or_more` unanswered. `GET …/prepare` shows
"Visitor visa: Sample Child V", `fees_worked_out: true`, visitor visa CAD 100, total CAD 825. `waiting` has no entry
for the study question. Expected (as for a missing date of birth, which "waits… not counted"): the line waits, or the
words say the document is not decided yet. Actual: an unanswered question is read as No. A later Yes changes the
filing's document and the total (+CAD 50) without notice (BR-10 "nothing is guessed").
`engine/runtime/filings.ts:277` and the `adds` reading in `engine/runtime/added-filings.ts`.

**B3 (Major): a recorded filing changes its document after submission.** Steps: Yes for the child who studies, then
Prepare. I simulated the record with SQL: `filing_record` rows plus `submission_group.recorded_fees`. The record
route needs fully filled forms, so it was not reachable within this break. Then
`PUT …/answers/<child>/person.studies_six_months_or_more` `{value:false}` returns **200**. Prepare now shows
"**Visitor visa**: Sample Child S", status submitted, the same application number, while the frozen fees still charge
that child `study_permit` CAD 150. Expected: once recorded, the answer that decides a filing's document is refused, or
the change goes through corrections (the way `refuseIfCaseRecorded` guards people). The cause is that the filing row
is keyed by its owner (`filing-<subject>`), so the same row switches document (`engine/filing-modes.ts:101`).
Before BK-15 the same flip moved the child to the principal's filing instead.

**B4 (Major): the "Visitor visa" and "Work permit" filings carry the study permit application.** On a live family,
the items of "Visitor visa: Sample Child V" are IMM 1294 and IMM 5476. The items of "Work permit: Sample Spouse A" are
IMM 1294, IMM 5707 and IMM 5476. IMM 1294 is IRCC's study permit application. The filing names the document the person
applies for (new in this PR, `filings.ts:277`), but the forms still come only by role from the release, and the
release's spouse line is new in `samples/wave1.json`. The person reads one document and is given another document's
form. If forms per family member are a later item, the case should say so in words; it does not.

**B5 (Major on data, not reachable with shipped data): `fees_by_role` can charge a line its own `roles` exclude.**
`rulesFrom` checks each `fees_by_role` line only against `c.lines` (`filings.ts:137`), and `charged`
(`filings.ts:301`) then ignores the line's `roles`. A pure script with `study_permit.roles=["principal"]` and
`fees_by_role.child.lines=["study_permit","biometrics"]` gives rules derived, and Child pays study permit CAD 150
"CAD 150 for Kid1.". The same table with the child's *added* filing naming `study_permit` is refused as unpriced
(`reaches`, break M2). So the two data paths do not get the same guard. Expected: not derived, or unpriced, as for
`addsFiling.fee`.

**B6 (Minor): no release check covers `fees_by_role` against the release's lines.** If a release has an applying role
that `fees_by_role` omits, every case with that person is unpriced, and the words say so correctly at runtime
("The fee table names no fee lines for a child…"). Nothing in `validate.ts` warns before release. In that
data-error state, a non-studying child's filing falls back to the combination's name: "Study permit (outside Canada):
Kid1" (`filings.ts:277`).

**B7 (Minor, words): the studio line still reads as an extra application.** The child line shows "Files own
application" and "Adds their own study permit application when: …" (`web/src/pages/workspace/questionnaires.tsx:86`).
Since this PR, a filing added on a files_own line is made *instead of* the line's own filing. The words do not say it
replaces the visitor visa.

**B8 (Minor, traceability): the ruling the fee row cites is not on GitHub.** `samples/fee-table.json:304` cites
"Ruling P-486 (product/design/d8-study-permit-family-2026-11-11.md…)". Neither that file nor P-486 is in
`DECISIONS.md` at this commit or on `main`; the newest there is P-452.

## What held
- Totals for a family of four (CAD 825), of six with mixed documents and exempt ages: CAD 1,025. In that family,
  biometrics are capped at CAD 170 for 3 people paying, the under-14s are exempt with IRCC's words, and a child with no
  date of birth "waits", not counted.
- With four visitor-visa children the visitor visa is CAD 400, below the family maximum, which never wrongly applies.
- A child who stops studying (No) moves to a visitor visa and the total falls to CAD 775. An answer cannot be removed:
  a null value gives 400 and there is no DELETE route, so the "removed" case cannot happen.
- People marked not travelling, including a studying child, file nothing and pay nothing. A declared-only child
  without an entry in `fees_by_role` does not block pricing.
- Split out: the studying child is priced alone (CAD 150 + 85); the rest keep the cap. A No answer after the split
  keeps the separate group and reprices it as a visitor visa (CAD 185).
- Remove filing / Add filing back on the studying child: the preview's before and after totals match Prepare
  (825 → 675 → 825), with the same filing id. Removing the spouse's filing gives a correct preview of biometrics
  170 → 85.
- Make principal (spouse ↔ student): the preview names each fee moving, consistently with the role-based data.
- A role missing from `fees_by_role` (principal, or a child applying without an added filing) leaves the case
  unpriced with words naming the role and the person. A child with an added filing whose lines are valid is still
  priced.
- Malformed `fees_by_role` is not derived: null, an array, `{}`, a lines string, empty lines, duplicates, an unknown
  line, a non-string line, a blank or numeric `filing`, the representative, sponsor, typo or `__proto__` roles, and
  a null entry. Extra keys, very long names and HTML in `filing` are accepted; React escapes them.
- People save (`PATCH /api/combinations/:id/people`): `addsFiling` on the principal → 400; on the sponsor (co_files)
  → 400; a child changed to co_files → 400; on a files_own spouse or Visitor-visa child → 200, as the PR intends.
- Regression: across every fee-table combination with three families, only sp.outside changes compared with `main`.
  Visitor visa (CAD 570, labels unchanged), Spouse sponsorship, Express Entry and the LMIA work permit are identical.
- Roles: the client and the author get 403 on another case's Prepare; no actor gets 401.
- Not tried (no UI change in this PR): keyboard, 1024 px, 200 % zoom, uploads, 100 programs or 400 combinations.
  The new code adds only map lookups per fee line.
