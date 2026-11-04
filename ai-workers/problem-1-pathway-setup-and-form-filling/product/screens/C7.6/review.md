# Review: C7.6 Ready to file (L-SA3, P-315), PR #861

Reviewer: a fresh agent that did not build it. 4 Nov 2026. API, rules and schema only (no screen), so the visual checks are skipped.
* Round 1 was on 0159564: Block (B1, M1, M2, m1–m6, journey 6/10). Full text in git at 08b5720.
* Round 2 was on 08b5720: Approve (round-1 findings fixed, m7–m10 raised). Full text in git at bb6d192.
* **Round 3 (the last, P-293 (3)) is on bb6d192:** `git diff 08b5720..bb6d192`. This is the breaker's N1–N6 and the rest of B5, plus my m7–m10.
* I ran it on my own copy, :4450 / `xr_studio_rev`, started fresh, with both setups run first. The copy was stopped at the end. US$0, live AI off.
* The shared PostgreSQL cluster (127.0.0.1:54329) was down at the start of this round. I started only the database, with `pg_ctl` as `start.sh` does; I did not start the :4400 demo.

## Verdict (round 3): Approve (commit bb6d192)
No open Blocker or Major. Each change does what the round's note says, and each has a test that fails without it. Two new Minors (m11, m12); neither blocks.

## Exit codes (round 3)
* `setup_visitor_visa`: 0 (13/13).
* `setup_vv_m3`: 1 (44/46; the same S2w and S7a as before, outside this PR's files).
* **C7.6: 0 (25/25)** · **C8.1: 0 (14/14)** · C8.2: 1 (1/12; the record route is C8.2's own row).
* **C7.3: 0 (13/13)** · C6.12: 0 (24/24) · C7.7: 0 (26/26) · C11.6: 0 (14/14).
* **`check_c76_readiness`: 0 (73/73)** · **`check_c76_readiness_api`: 0 (23/23)**.

## Round-3 changes, checked
* **N1:** a review must send back the `facts_hash` the representative read.
  * Without it, or in the wrong shape: 400 (`api/src/readiness.ts:55`). If the filing changed since: 409 (`readiness.ts:74`).
  * The order of the checks is right: someone who is not the representative still gets 403 first (C7.6-13).
  * The fingerprint now also covers the facts still waiting, with their answers as given now (`case-prepare.ts:261`), so an unconfirmed change reopens the review.
  * The pack only adds `facts_hash` to the request body (steps 13, 14, 21 and `readyToFile`). No assertion was loosened.
* **N2:** the review line's key carries the fingerprint (`engine/runtime/readiness.ts`, `part`), so a pass of "not reviewed" never covers a filing whose facts changed afterwards.
* **N3:** `ready()` reads readiness again after marking (`readiness.ts:127`). A change saved during the mark gives 409, and the view takes the filing back to Not started.
* **N4 and m8, resolved:** Self-reviewed is now allowed in a solo firm, or when the representative was the case's only officer ever, ended officer rows included (`readiness.ts:68`). This matches r5c BR-21 ("a solo firm, or the representative did it all").
* **N5 and m9, resolved:** a barcode form that cannot start yet still waits for its own Validate (`readiness-inputs.ts:74`). P-237's one hard stop is never skipped by passing "whether it applies".
* **N6:** only passes whose reason the rule accepts take keys under the lock.
* **B5, the rest:** combining marks do not count towards the 5 characters, and format characters inside a reason are refused, except U+200C and U+200D. The Devanagari and Cyrillic reasons in the check still pass.
* **m7, resolved:** `PreparedForm` objects are built field by field, with no cast (`case-prepare.ts:250`).
* **m10, resolved:** the header comment now says the one write a read can make.
* **The tech lead's ruling** (any staff may pass the CRITICAL review warning; AG07-D24/D25, P-237 (4); Unconfirmed: no counsel): the code matches it.
* **Live check:** `facts_hash` was the same across 5 reads on each of 6 cases. `/prepare` takes 0.07–0.09 s.

## New Minors (Should; none blocks)
* **m11: the fingerprint's waiting answers are too broad and unordered** (`case-prepare.ts:261`).
  * It takes every answer to that fact, for any person, not only the form's own person. The answers also come in `findMany` order with no `orderBy` (`runtime.ts:222`).
  * Both errors fail closed: an unconfirmed edit to another person's same fact, or a change in row order, reopens the review and so takes a Ready filing back to Not started.
  * Fix: filter by the form's subject and sort the tuples before hashing.
* **m12: an orphan audit line.** When N3's second read finds the filing no longer ready, the view writes `ready_to_file_reopened`, but no `ready_to_file` line was ever written for that mark (`readiness.ts:127-129`). Write the mark's line before the re-read, or have the re-read's reopen name the interrupted mark.
* **Still open from earlier rounds:** m2, m3, m5, m6 and m4 (b) remain rows, for the tech lead (`contracts/`, M3-CONTRACT), with their reasons in `build-notes.md`.

## D1–D20 (1–5; API only; round 3)
D1 5: P-315 exact; BR-21 restored (N4) · D2 4: review bound to the facts read; m11 fails closed · D3 3: contract type and M3-CONTRACT row still stale (m2, m3) · D4 4 · D5 4 · D6 4 · D7 n/a.
D8–D14 n/a (no screen) · D15 5: `/prepare` 0.07–0.09 s · D16 5: every N-finding has a failing API test (23) · D17, D20 simulated only · D18 4 · D19 4.

## Journey test (reviewer, API-level; the one score for this check, round 3)
* J1–J9 from round 1 all hold.
* New: a review sent with a fingerprint that is no longer current gets "changed after you read it. Reload" (409). A solo or sole-officer representative is logged Self-reviewed.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | C7.6 25/25; C7.3 13/13; C8.1-13 reaches "Uploaded to IRCC". |
| Next step obvious | 1 | The 409 names every block and warning and who owes it; "Reload" when the facts moved. |
| Plain words | 1 | "CRITICAL: …"; "changed after it was reviewed on …"; no internal keys. |
| Feedback and state | 1 | A stale Ready goes back to Not started and is recorded; N3 answers 409, never a stale 200. |
| Correct data | 1 | The review is stamped with the facts it saw; one pass row under a lock. |
| Error recovery | 1 | No 500; 409 Reload on a stale fingerprint or a concurrent pass. |
| Accessibility and sizes | ½ | No UI; held at ½. |
| Speed | 1 | `/prepare` 0.07–0.09 s. |
| Visual quality | ½ | No UI; held at ½. |
| Trust and sources | 1 | Who, when, reason, severity, licence, and the facts fingerprint. |
| **Total** | **9 / 10, pass** | No criterion at 0. |

Not tested: a real browser or screen reader (no screen); an intended user's unaided walk (D17/D20 stay with the founder); two PDF editions of one form (no seed has them); 120 concurrent reads under load.

**Verdict: Approve** (commit bb6d192). No open Blocker or Major. m2–m6, m11 and m12 may follow as rows.
