# Review: C7.6 Ready to file (L-SA3, P-315), PR #861

Reviewer: a fresh agent that did not build it. 4 Nov 2026. API, rules and schema only (no screen), so the visual checks are skipped.
* Round 1 was on 0159564: Block (B1, M1, M2, m1–m6, journey 6/10). Its full text is in git at 08b5720.
* **Round 2 (P-293, diff only) is on 08b5720:** `git diff 0159564..08b5720` (12 files). This is the round-1 fixes plus the breaker's B1–B10.
* I ran it on my own copy, :4450 / `xr_studio_rev`, started fresh because the migration changed. Both setups ran first. The copy was stopped at the end. US$0, live AI off.

## Verdict (round 2): Approve (commit 08b5720)
Every Blocker and Major from round 1 is fixed, each with a test that fails without the fix. Nothing new rises above Minor.

## Exit codes (round 2)
* `setup_visitor_visa`: 0 (13/13).
* `setup_vv_m3`: 1 (44/46; the same S2w and S7a as round 1, outside this PR's files).
* **C7.6: 0 (25/25)** · **C8.1: 0 (14/14)** · C8.2: 1 (1/12; the record route is not built, which is C8.2's own row).
* **C7.3: 0 (13/13, was 12/13)** · C6.12: 0 (24/24) · C7.7: 0 (26/26) · C11.6: 0 (14/14).
* **`check_c76_readiness`: 0 (72/72)** · **`check_c76_readiness_api` (new): 0 (18/18)**.

## Round-1 findings, checked on the diff
* **B1, fixed:**
  * The out-of-date Online branch now carries `signers` (`api/src/case-prepare.ts:216`).
  * `readiness-inputs.ts:79` reads `f.signers ?? []`.
  * C7.3-13 is green, and GET /prepare no longer answers 500.
  * The `as unknown as PreparedForm[]` cast is still there (`case-prepare.ts:246`), so the type check still cannot catch the next missing field. Kept as m7.
* **M1, fixed:**
  * A READY_TO_FILE filing that is no longer ready goes back to NOT_STARTED, under a status-guarded update with a `ready_to_file_reopened` audit line (`case-prepare.ts:257-263`). Concurrent reads write only one line.
  * "Uploaded to IRCC" now reads Ready to file through the view (`sign-steps.ts:76-79`).
  * API check B1: a fact change sets the stored status to `NOT_STARTED`, and the upload tick then answers 409.
  * `version` does not cover status (`case-prepare.ts:437`), so a revert never gives a false 409 on a later write.
* **M2, fixed:** `pdfMapInUse` (`case-prepare.ts:243`). There is still no two-edition test; the Visitor visa seed has one edition per form.
* **m1, fixed:** Ready on a filing that is already ready answers 200 `already: true` and writes no audit line (`readiness.ts:113-114`). I checked this live.
* **m2, m3, m5, m6, and m4 (b):** left, with reasons in `build-notes.md`. `contracts/` and M3-CONTRACT are the tech lead's. I accept the reasons; they stay open as rows.

## Breaker fixes, checked
* **B2:** a review counts only from the representative of record now, for the facts as they are now (`facts_hash`, `readiness-inputs.ts:68,95`). The CRITICAL line keys on the earlier review's day, so a pass for "not reviewed" never covers "changed after the review".
* **B3:** `cannot_start` forms are no longer dropped. Each stands as a CRITICAL "whether IMM … applies" line.
* **B4, B6, B7:** shape checks, each answering 400 (checked in the API suite).
* **B8:** passes are written under a `FOR UPDATE` row lock; three passes at once gave [200, 409, 409]. A submitted filing is closed to review and pass.
* **B10:** the database checks code, keys and severity together.
* **Migration:** still additive, with its rollback recorded. `licence_number` is NOT NULL now, which is safe because these tables are new in this PR.

## New Minors (Should; none blocks)
* **m7:** `case-prepare.ts:246` keeps the `as unknown as PreparedForm[]` cast. B1 was exactly a field this cast hid. Build the `PreparedForm` objects explicitly, or type the item union, so tsc checks it.
* **m8 (B9 narrows BR-21):** `readiness.ts:62` refuses Self-reviewed with 409 whenever the firm is not solo.
  * r5c BR-21 reads "When the preparer is the representative (**a solo firm, or the representative did it all**)…".
  * P-155 (1) gives "(a solo firm)" as its example.
  * A representative who did the whole filing in a multi-person firm now has to hand the review off, or pass the CRITICAL warning; that is no longer recorded as "Self-reviewed".
  * The break report gives the plan's wording as the reason. Either restore BR-21's second case, or record the narrower reading in `challenge.md` for the founder. Do not leave it silent.
* **m9:** a `cannot_start` form never waits for its barcode Validate (`readiness-inputs.ts:72`, `needsValidate: false`). If IMM 5257, 0008, 1344 or 1295 could be undecided on a PDF or Paper line, passing "whether it applies" would leave no hard stop. This cannot happen on the Visitor visa path (in the API check, only IMM 5476 and IMM 5707 wait). Keep `needsValidate` for barcode forms when the line is PDF or Paper.
* **m10:** GET /prepare now writes: the status revert and its audit line, recorded under whichever officer read the view. The guard is safe and idempotent. Say so in the route's header comment (`case-prepare.ts:10` still says a read with nothing new takes no transaction), and consider recording "system (on read)" as the actor.

## D1–D20 (1–5; API only; round 2)
D1 4: P-315 is exact; BR-21 is narrowed (m8) · D2 4: status drift closed, edition right, passes locked · D3 3: contract type and M3-CONTRACT row still stale (m2, m3) · D4 4 · D5 4: no 500; repeats and races safe · D6 4 · D7 n/a.
D8–D14 n/a (no screen) · D15 5: `/prepare` takes 0.16 s with sequential reads · D16 5: every breaker and reviewer finding has a failing API test · D17, D20 simulated only · D18 4 · D19 4: Ready leads to "Uploaded to IRCC" only while still ready.

## Journey test (reviewer, API-level; the one score for this check, round 2)
* **The round-1 journeys, rerun:** J1–J6 and J9 still hold. J7 (a fact changes after Ready) now holds: the status goes back to Not started and the upload tick answers 409. J8 (Online stale section) now holds: C7.3-13 green.
* **New:** a review made before a change reopens with the words "changed after it was reviewed on …". A repeated Ready answers `already`.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | C7.6-19 passes, and C7.3's Online case opens the view (13/13). |
| Next step obvious | 1 | The 409 names every block and warning and who owes it. |
| Plain words | 1 | "CRITICAL: …"; "changed after it was reviewed on …"; no internal keys. |
| Feedback and state | 1 | A stale Ready goes back to Not started and is recorded (API check B1). |
| Correct data | 1 | `pdfMapInUse`; one row per pass under a lock; no duplicate audit line. |
| Error recovery | 1 | No 500; "passed meanwhile. Reload" 409; `already` 200. |
| Accessibility and sizes | ½ | No UI; held at ½. |
| Speed | 1 | `/prepare` 0.16 s; constant queries. |
| Visual quality | ½ | No UI; held at ½. |
| Trust and sources | 1 | Who, when, reason, severity, licence, and the facts fingerprint on a review. |
| **Total** | **9 / 10, pass** | No criterion at 0. |

Not tested: a real browser or screen reader (no screen); an intended user's unaided walk (D17/D20 stay with the founder); two PDF editions of one form (no seed has them); a load of 120 concurrent reads (the `maxWait` change was not re-run under load).

**Verdict: Approve** (commit 08b5720). No open Blocker or Major. m2–m10 may follow as rows; m8 needs a recorded challenge or a fix before the founder's walkthrough.
