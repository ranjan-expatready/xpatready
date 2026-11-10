# B152 Recorded fees are frozen at recording: break report (breaker, 7 Nov 2026; money run, P-278)

**Commit:** 557bfbbb0 on `claude/screens-b152-frozen` (PR #1279). **Copy:** isolated `brk_b152` on :4446 (never :4400),
configured checkpoint (reset, then load as `user-A`, 88 s). Stopped at the end. Live AI off, US$0, no priced button pressed.
**Scope (P-26):** no concept file. The scope is the BACKLOG row B152 and the PR body: "Record the submission" writes the
group's fee lines and totals once, and `/prepare` reads a recorded group from that snapshot. B5's fee block is the reader.
Not findings: wording that B151 owns (the unpriced state, "worked out today" words), paying, and readiness rules (C7.6).
**Method:** throwaway scripts outside the repo, using `acceptance/lib/m3.ts` (openCase, readyToFile, answer, prepare,
call). Recording was done as `user-O` through PATCH …/groups/:id/record. "The date moves" means the date of birth was
moved through the answers route, as the PR's own test does. A Playwright check compared the case page with `/prepare`.
The PR's own test passed 11/11 on this copy first. Paths: `S/` = `prototype/studio/`.

## Blockers
None.

## Majors
**M1. GET /runtime/cases/:id/filings still prices a recorded group as of today, so it disagrees with /prepare.** Case: a
principal (40) and a child who turned 14 two days ago. I recorded it (CAD 370), then moved the child's date of birth 3 days
later, so the child is 13 as at today. Expected: both reads give the recorded CAD 370. Actual: `/prepare` gives CAD 370,
but `/filings` gives CAD 285 for the same group id, and its biometrics line for the child reads CAD 0. The route's own
comment says the two "never price a case differently". Cause: `S/api/src/case-filings.ts:36` calls `deriveFilings` and
never reads `recorded_fees`. Severity: Major (an officer-facing API states the wrong amount for a filed submission).

**M2. A fee still waiting at recording is frozen as waiting forever, and recording is not refused.** Case: a principal and
a child with no date of birth. Both filings reached Ready to file with no blocks, and the record returned 200. The
snapshot holds the child's biometrics line as `waiting`, with total CAD 285. I then answered the date of birth (age 15).
Expected: either recording is refused while a fee waits, or the recorded amount is final. Actual: the read-only, recorded
submission reads "Biometrics fee: CAD 85 so far · 1 not counted yet" and "Total so far: CAD 285 · 1 fee not counted
yet". The child's row still says "Waits for Brk K5's date of birth … Not counted until it is answered", although it is
answered and the task above says it "changed after … IMM 5257 was filed". It can never become final. Today's price
would be CAD 370. Cause: `recordedFeesOf` copies waiting lines and a partial `total_cents` as they are
(`S/api/src/submission.ts:62-64`), and record() never checks for them. Screenshot (scratch): `s5-1440.png`.
Severity: Major (a filed submission's money stays partial for good, with words that are no longer true).

**M3. When the date of birth changes as the record is made, the frozen fees and the filed facts disagree.** Case: a principal
and a child two days short of 14. I fired the record and a date-of-birth change (child now 14) at the same moment.
Expected: one consistent state, or a 409. Actual (try 1 of 3, delay 0 ms): both returned 200. The snapshot is CAD 285 with
the child's line "Under 14: no biometrics", while the child's `filing_record.filed_facts` holds the moved date
(2012-11-06, 14 today). Tries 2 and 3 (30 and 80 ms) stayed consistent. Cause: the fees come from the view read at
`S/api/src/submission.ts:76`, but the filed facts come from a second `this.r.state(c)` read at `:113`. Neither read is
repeated under the lock taken at `:123`, and the version check (stored filings and items) does not see an answer.
Severity: Major (the frozen amount of a filed submission contradicts what it was filed with, permanently, and only a race
is needed).

**M4. A submission recorded with a past "Submitted on" is frozen at the recording day's ages, not the submission day's.**
Case: the same as M1, recorded with `submitted_on` 5 days ago, which the route allows on purpose (break R2-m3). On that
day the child was 13. Expected: the amount IRCC charged that day, CAD 285 (biometrics CAD 85, the child under 14).
Actual: CAD 370 is frozen (biometrics CAD 170). The page shows "Submitted on November 2, 2026" above "Total for this
submission: CAD 370". The basis sentence under it still reads "age as at today (FQ-7)". Cause: `recordedFeesOf` stores
the view as worked out on the day of recording (`S/api/src/submission.ts:62-64`, `:141`). Which date an age is counted
on is FQ-7, still open, so this needs the founder's answer, not a guess. Severity: Major (a CAD 85 difference on a filed
submission).

## Minors
**m1. The page never says the amounts are the recorded ones, and the basis sentence contradicts them.** `fees_recorded.at`
is sent (`S/api/src/case-prepare.ts:233`), but no screen reads it. Under a recorded group the foot still says
"Biometrics: none under 14 or over 79, age as at today (FQ-7)". That is `done.basis`, today's view
(`case-prepare.ts:468`, built at `S/engine/runtime/filings.ts:166`).

**m2. The snapshot's `fees_worked_out` and `fees_why` are written but never read back.** `/prepare` sends today's values
(`case-prepare.ts:468`), and the fee block hides every amount when today's value is false (`S/web/src/runtime/fees.tsx:51`).
This cannot be reached on Visitor visa today, because the combination is fixed. It is latent.

**m3. A recorded submission contradicts itself after a birthday.** Case: a family of 6. After the child's 14th birthday,
the frozen line still reads "Under 14: no biometrics". In the same view, `people[].age` is 14, and the recorded filing has
gained a "Give biometrics" step for that child. Only the fee lines are frozen; the items and ages are worked out today.

**Count:** 0 Blockers, 4 Majors, 3 Minors.

## What held
* **A birthday after recording.** A child crossing 14 in either direction left the recorded group's totals, total and
  every line unchanged: CAD 285 stayed CAD 285, and CAD 370 stayed CAD 370. The same held with the family maximum at
  recording: 6 people, visitor visa capped at CAD 500, biometrics CAD 170, CAD 670 before and after a child turned 14.
* **An unrecorded group of the same case is worked out today.** With FAMILY recorded and the child split out, the
  child's group went from CAD 100 to CAD 185 on the birthday while FAMILY stayed at CAD 370. The case total went from
  CAD 470 to CAD 555. With only the spouse's group recorded, a child was split out of the unrecorded FAMILY group (200).
  FAMILY was priced again (CAD 385 → 285), the new group went from CAD 100 to CAD 185 on the birthday, and the spouse's
  CAD 185 stayed.
* **Locks on recorded people and groups.** Adding a person, marking one not travelling, splitting the recorded group and
  recording it again all answered 409. Correcting an application number left the money unchanged.
* **Concurrency.** Three records of one group at once (2 × `user-O`, 1 × `user-R`) gave 200, 409 and 409, with 2 filing
  records and one snapshot. Two groups of one case recorded at once from one read gave 200 and 200, each with its own
  snapshot (CAD 185, 2 lines each), and the lines were the same as before. A record sent from a read taken before the
  date of birth moved gave 409, and nothing was written.
* **Page vs API.** On 4 cases (8 groups, recorded and not), each submission total, totals line and amount on the case
  page matched `/prepare`, and so did each case total (CAD 555, CAD 655). There is no sideways scroll at 1024 px or at
  512 CSS px (200 % zoom).
* **Roles.** `/prepare`, `/filings` and record: `user-P`, `user-Q`, `user-A`, `user-B` and `user-C` got 403, and the
  solo firm got 404. No 403 body carries money, and the client's questionnaire carries no amount.
* **Budget.** `/prepare` on a recorded 6-person case takes 0.55 to 0.62 s, and on a 3-group case 0.27 s.
