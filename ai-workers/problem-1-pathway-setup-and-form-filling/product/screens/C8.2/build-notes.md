# C8.2 Record the submission: build notes (runtime lane, M3-F, PR #924)

Built to `prototype/studio/acceptance/M3-CONTRACT.md` row C8.2 as written. Design row: #863 `screens/M3-design-2026-11-04/rows.md` C8.2.

## What a person can do now
On a case page, the case officer opens **Submission to IRCC**. Each submission group has one **Record the submission…**. It opens once every filing of the group is Ready to file; until then the panel says which filings are not ready, in words. The dialog asks, per filing, for the application number (required, in the Sample pattern of `samples/filing-numbers.json`), the date submitted (not after today), our reference and the fee receipt, plus a UCI per person (optional). Each refusal shows on its own field. Once recorded, the group reads **Recorded · read-only**: each filing reads Submitted with its number, portal, date, our reference, receipt, UCIs and **Prepared by · Reviewed by**. **Correct a number…** asks for a reason and keeps the old number in the history (who, when, why). If a fact a filed form reads changes after filing, the panel lists a task per form: "Filed with an earlier value: Sample Client E's family name changed after Sample Spouse E's IMM 5257 was filed on November 4, 2026. Re-sign it, or tell IRCC of the change (Unconfirmed: no counsel)." The form's item in the Prepare view reads `out_of_date` with the same words.

## Decisions taken in the build (each is open to challenge in the PR)
1. **Ready to file is read from the Prepare view's status.** C7.6 (#861) is not merged. On main the view shows a filing whose stored status is `READY_TO_FILE` as `ready_to_file` (`recordedOverlay`). Once #861 merges, its view resets a filing that is no longer ready to Not started before C8.2 reads it, so a stale Ready is never recorded. The record write also changes only rows still `READY_TO_FILE`, under the case's row lock.
2. **Reviewed by = the representative of record** (`case_team_member` LEAD_REPRESENTATIVE, not ended), at the time of recording (P-155). This build does not read C7.6's `filing_review` row, because that table is not on main. Follow-up after #861: read the newest `filing_review.reviewed_by` and fall back to the representative of record.
3. **Prepared by = the case officer who records.**
4. **UCI goes in `filing_person_record`** (the contract), not into the person's `person.uci` answer. Slice 1's GET filing-record still reads the answer. Joining the two views is a follow-up for the tech lead to rule on (Question in the PR).
5. **"Filed with an earlier value"** compares the facts each form was filed with (`filing_record.filed_facts`: box, fact, about, row, value, the same shape `answer_snapshot` keeps) against the form's facts now. The check covers changed facts, added facts and facts no longer confirmed. A form that reads another person's fact (the spouse's IMM 5257 names the principal) is marked too.
6. **The task opens when the change is read** (the Prepare view, which the case page reads after every answer change), not on the answer write. One open task per form and kind (a partial unique index), so reading again adds none. Nothing closes a task yet (state `done` exists; a "Done" action is a follow-up).
7. **Read-only lock:** channel change, split, "Entered in the portal" and slice 1's PUT application-number answer 409 once recorded, each checked under the case's row lock. Not locked yet: C8.1 sign steps, a signed-scan upload, C7.6's review, ready and pass routes (C7.6's routes are not on main; follow-up once #861 merges).
8. **Acceptance test -12 line changed (premise, not rule):** `person.family_name` is `collected_from: verified_document` in both Visitor visa releases, so the client's change was a 403 and nothing changed. The officer now enters the corrected name, as from the passport. C9.2's test has the same line (same 403).
9. **The date "not after today"** allows the latest calendar date anywhere (UTC+14), so a firm's own today is never refused, whatever its time zone.

## Checks
* `tests/check_c82_record_api.ts` 40/40 (the pack's rules plus the refusals and the lock, on a fixture filing in `ready_to_file`).
* `tests/check_c82_record_browser.ts` 31/31 (keyboard only, 1440 and 1024 px, axe on each state, data underneath). Screenshots are in `screenshots/`.
* `acceptance/C8.2.test.ts` on main: -1 passes; -2 to -12 need C7.6's `readyToFile` routes (#861).

## Not built (follow-ups)
Breadth after Visitor visa (the sponsorship + PR pair, citizenship envelopes); a "Done" action on tasks; locks on C8.1 and C7.6 routes; `filing_review` as Reviewed by; the C7.7 Prepare application tab hosting this panel.
