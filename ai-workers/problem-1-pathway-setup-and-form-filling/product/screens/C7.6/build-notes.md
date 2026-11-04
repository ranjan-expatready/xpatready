# C7.6 — Ready to file (L-SA3) · build notes

PR #861, branch `claude/loving-ride-hhtdgi`. Decisions followed: P-315, P-237, P-238 (the rule), P-144 (the one block),
P-151 (1), P-155, P-136, P-172 (named exception, not built: Express Entry is not on the M3 path), AG-07 AG07-D24/D25
(who passes a CRITICAL warning). Legal points: Unconfirmed: no counsel.

## What changed
* `engine/runtime/readiness.ts`: one block code (`barcode_not_validated`). The seven former blocks are CRITICAL
  warnings (`severity: "critical"`, words start "CRITICAL:"), passed like any warning with a reason. Lines sort by owner,
  CRITICAL first within an owner. A CRITICAL line's key names what it is about: the missing facts, the out-of-date fact and
  day, the edition and its date. So a pass written for two missing facts never covers a third.
* `api/src/readiness-inputs.ts` (new): gathers the inputs from the prepare view's own items plus the stored reviews,
  passes, open findings (C7.5), checklist lines (C6.4) and accepted-until dates.
* `api/src/case-prepare.ts`: `readiness[]` comes from the engine (it was a stub). A stored status other than
  NOT_STARTED is shown in lower case (`ready_to_file`, later `submitted`), as the packs read it.
* `api/src/readiness.ts` + `features/readiness.ts` (new): review, pass, ready, and the edition's accepted-until.
* Migration `20261104120000_c76_readiness`: `filing_review`, `readiness_pass` (never `barcode_not_validated`, reason ≥ 5
  characters, checked in SQL), `form_edition_accepted_until`. All three are append-only (trigger).

## Build discoveries
1. **IMM 5707 is filed Online on the M3 setup**, while C7.6-20 sets its PDF editions. On an Online line with no online
   version, readiness checks the PDF edition that its answer sheet follows (C7.3 `order_basis: pdf_twin`). Recorded in the PR.
2. **Prepare's filing status was always the derived "NOT_STARTED".** Nothing stored was shown before. The packs read
   `ready_to_file` and `submitted` in lower case, so a stored status is shown that way. `NOT_STARTED` stays as before
   (`check_vv_filings` reads it).
3. **The nightly dispatch is refused from a cloud session** (403, integration). The tech lead runs it.
4. **`run-suites.sh --changed` selects every suite** here (a shared file changed). Only the touched files' suites
   were run locally (listed in the PR); the PR's GitHub check runs the rest.

## Not built here (each enters through readiness-inputs.ts when its source exists)
Open checks (C6.5's checks are not stored yet) · a fee's valid-until date (no dated fee table) · out-of-date signed
items (C9.2) · P-172 (Express Entry) · the readiness panel on the Prepare application screen.

## Round 1: reviewer (Block on 0159564) and breaker (10 breaks), fixed
Each fix has a fail test: `tests/check_c76_readiness_api.ts` (18, API; new suite), `tests/check_c76_readiness.ts` (72).
* **Reviewer B1 (Blocker):** the prepare view answered 500 when an Online section went out of date after entry (C7.3-13):
  that line carried no `signers`. It now carries them; readiness never assumes them. C7.3 13/13.
* **Breaker B1 (Blocker) = reviewer M1:** a filing stayed Ready to file after the barcode copy stopped matching. Now the
  prepare view takes it back to Not started (stored, audited), and C8.1's "Uploaded to IRCC" reads Ready to file through
  the view (`sign-steps.ts`, forwardRef), never from the stored status alone.
* **Breaker B2 (Major):** a review counts only from the representative of record now, for the filing's facts now
  (`filing_review.facts_hash`); otherwise the CRITICAL warning reopens, naming the earlier review's day.
* **Breaker B3 (Major):** a form that cannot start yet stands as a CRITICAL "missing facts" line, never dropped.
* **Reviewer M2 (Major):** the edition checked is `pdfMapInUse` (P-32, the one the fill uses), not the oldest.
* **Minors:** B4 key not text → 400 · B5 hidden characters do not count towards a reason · B6 review note checked, never
  cut · B7 accepted-until is a plain day 2000–2100 · B8 Ready again records nothing (`already`), passes are made under
  the filing's row lock (no duplicate), a submitted filing takes no review or pass · B9 Self-reviewed only in a solo
  firm · B10 the database checks a pass's code, keys and severity.
* **Also:** the prepare view's read batch waits up to 10 s for a connection, as its write path does (C6.12 B1, 120
  reads at once on a 4-core machine answered 500 once in two runs).
* **Left, with reasons:** m2 the C7.6 row of `M3-CONTRACT.md` is the tech lead's to change · m3 `contracts/runtime.ts`
  types filing status as "NOT_STARTED" only: `contracts/` is M2-hot, so the change waits for the tech lead · m4 a
  `fact_problem` pass covers a later, different bad value of the same fact (the readiness input carries no value yet;
  safe direction otherwise) · m5 no zod schemas or versions on the new bodies (`contracts/` is hot; ready is race-safe) ·
  m6 an edition is "superseded" only once an author sets its accepted-until date (no newer-edition signal without one).

## Round 2: reviewer Approve on 08b5720; breaker N1 (Major) + N2–N6, review m7–m10, fixed
New fail cases in `tests/check_c76_readiness_api.ts` (23) and `tests/check_c76_readiness.ts` (73).
* **N1 (Major):** a review sends back the filing's `facts_hash` from the prepare view it read; a mismatch is 409 and a
  review without it 400. The fingerprint now also covers the facts still waiting, with their current answers, so an
  unconfirmed change counts. Pack bodies changed for this only: C7.6-13/14/21 and `lib/m3.ts` readyToFile send it.
* **N2:** the review line's key carries the facts fingerprint, so a pass of "not reviewed" never covers later facts.
* **N3:** Ready to file reads readiness again after marking; a change saved meanwhile answers 409 and the view sets it back.
* **N4 / review m8:** Self-reviewed in a solo firm, or when the representative was the case's only officer ever (the
  concept's BR-21 "or the representative did it all"); ended officer rows count, so leaving the list does not dodge it.
* **N5 / review m9:** a barcode form that may apply still waits for its own Validate.
* **N6:** only a pass the rule honours takes its lines.
* **B5 rest:** combining marks never count alone; a hidden format character inside a reason is refused (U+200C/D allowed).
* **Review m7:** the prepare view's items are mapped field by field into readiness (no `as unknown` cast).
* **Review m10:** the header of case-prepare.ts says a read can write the Ready-to-file revert.
