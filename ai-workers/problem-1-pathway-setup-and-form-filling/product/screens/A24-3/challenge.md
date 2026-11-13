# A24-3: one place where the column does not show Filing.subjectId as written (review M1, 13 Nov IST)

**The brief (Lead 28, 13 Nov 00:3x IST), Done when (2):** each row of People and filings names its filing's principal applicant from `Filing.subjectId`.

**Where that reading is wrong.** A spouse sponsorship is co-filed: the sponsor's application (sponsorship) is sent with the principal applicant's application.
- Its `Filing.subjectId` is the **sponsor**.
- The server lists **no applicants** on it (`GET …/prepare` → `applicants: []`).

Showing `Filing.subjectId` there would put "Principal applicant: Sample Sponsor S" in the sponsor's row. That is wrong on two counts:
- **It contradicts the cell next to it**, which says "Sent with the principal's application".
- **It contradicts the design:** IRCC's principal applicant is the person an application is for, per application (design §2 S12, §5.1 "Principal applicant … principal on the lead filing", CS-4). A sponsor is not an applicant.

The reviewer found this (`review.md`, M1). It is the confusion A24 exists to end.

**What this PR does.** No program, form or combination key is involved (P-319): the rule reads only whether the filing lists applicants and which submission group it is in.

1. A filing **with** applicants: the row names its `Filing.subjectId` (the owner), as the brief says. This covers every filing in the Visitor visa, Study permit, Express Entry and Work permit (LMIA) cases.
2. A filing **with no** applicants (today: a co-filed sponsorship): the row names the principal applicant of the application it is sent with, meaning the filing of the same submission group that has applicants. Under it the row says "<sponsor> is not an applicant".

**Evidence.** `tests/check_a24_3_client_principal_browser.ts`, scenario 6, 41/41. Its steps:
- API: the sponsorship's `filing.subject_id` in the database is the sponsor, with no applicants.
- Screen: the sponsor's row names Sample Principal S, carries "is not an applicant", and never names the sponsor.
- Screenshot `screenshots/09-sponsorship-sponsor-1440.png`.

**Reversible:** the change is one function (`principalOf` in `web/src/runtime/filing-changes.tsx`). If the tech lead reads the brief literally, it goes back to the owner in one line.

Unconfirmed: no counsel (whether a sponsorship has a "principal applicant" of its own is an immigration point; the immigration expert may correct it).
