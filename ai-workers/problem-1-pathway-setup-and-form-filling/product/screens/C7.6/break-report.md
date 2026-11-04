# C7.6 Ready to file — break report (PR #861 at 01595640)

Breaker, 4 Nov 2026. Isolated copy `brk` on :4455 (db `xr_studio_brk`), seeded with `setup_visitor_visa.ts` + `setup_vv_m3.ts`
(the second run of setup logged 4 FAILs, S2w/S7/S7a/S8-approve, but release 2 was already approved, so they did not matter); stopped and removed afterwards. Live AI off, US$0.
Focus (P-278): who may pass a warning, review, or mark Ready to file; data integrity; schema. Scripts called the
routes through `acceptance/lib/m3.ts` (`call`, `openCase`, `readyToFile`, `validateRoundTrip`, `signByHand`) and curl. Plan scope: `plan.md` §3–4.
Note: while this ran, someone else's uncommitted change to `api/src/readiness-inputs.ts` (queries one at a time) and an
untracked `build-notes.md` appeared in the shared tree. I did not touch either. No finding below depends on them.

## Breaks

**B1 · Blocker: the filing stays `READY_TO_FILE` after the barcode hard stop comes back, and the next step trusts it.**
Did: `readyToFile(case, "user-R")` → filing READY_TO_FILE (ready true). Then `PUT …/answers/<P>/person.passport_number
{"value":"ZX9999999"}` as user-O (200). Expected: the filing drops out of Ready to file, or anything that reads the stored status checks again.
Actual: `GET …/prepare` → `filing.status = ready_to_file`, `readiness.ready = false`, `blocks = [barcode_not_validated]`,
`warns = [missing_facts]`. The database still says `READY_TO_FILE`. Then `POST /runtime/items/<IMM 5476>/sign-steps/uploaded_to_ircc` → **200**,
because C8.1's gate only reads the stored status. So P-237's one hard stop is skipped just by doing things in this order: mark ready, then change a fact.
C8.2 will read the same column. Also a race: `ready()` works out readiness outside any transaction and guards only on
`status`, so an answer saved between the two is not seen. Cause: `api/src/readiness.ts:85-91` (status set once, never
undone; no lock or re-check). `api/src/sign-steps.ts:73` trusts `filing.status`. Nothing in `case-prepare.ts:248-249` ever resets it.

**B2 · Major: a review by anyone, at any time, clears "representative review" for good.**
(a) Did: user-R reviews (200). Then `PUT /runtime/cases/<id>/team/representative {"userId":"user-T", reason}` (200).
Actual: `readiness.reviewed = {by:"user-R",…}`, `ready = true`, `warns = []`. The new representative of record never reviewed it.
user-R is now refused a new review (403), yet the old review still counts. (b) The first review in that run was made while the filing had
5 open `missing_facts` lines (an empty case). It still counted after every fact was filled, after the validation, and after the passport changed (B1).
(c) A `filing_review` row inserted in SQL with `reviewed_by='user-P'` (a client) is taken the same way.
Cause: `api/src/readiness-inputs.ts:46,77` takes the newest review of any person and turns it into `reviewed: !!review`. It never checks that the
reviewer is the current representative of record, and the review is never made stale (P-155 (1): "the representative reviews it" before recording).

**B3 · Major: a form whose need is not decided yet drops out of readiness without a word.**
Did: opened a family case (principal 40, spouse and child with no date of birth). Actual: IMM 5476 (PDF upload, hand signed) and
IMM 5707 for the spouse and the child are `state: cannot_start`. No block or warning line on their filings names these items, so
their `missing_signature` and `missing_facts` CRITICAL warnings never appear. Ready to file then needs only the other lines passed.
No barcode form is affected on the Visitor visa path today. The same filter would drop IMM 0008/1344 later, and then P-237's
hard stop would be skipped too. Cause: `api/src/case-prepare.ts:242` (`i.state !== "cannot_start"`).

**B4 · Minor: a pass `key` of the wrong type widens the pass to every line.** `POST …/warnings/missing_facts/pass
{"reason":"Only the first line was meant (Sample)","key":123}` → 200, and `keys` holds all 5 open missing-facts lines.
Expected: 400. Cause: `api/src/readiness.ts:73` (`typeof b.key === "string" ? … : undefined`).

**B5 · Minor: hidden characters get past the reason rule.** These were accepted as `reason` (pass and accepted-until):
`"a⁠⁠⁠⁠"` (word joiner), `"ok‍…"` (ZWJ), `"a­…"` (soft hyphen), `"a͏…"`, `"a᠎…"`,
`"a⠀…"`, `"a\u{E0041}\u{E0042}"` (tag characters). Each shows as one visible letter, and the stored history row reads `"a⁠⁠⁠⁠"`.
Refused, as they should be: spaces, `!!!!!...`, ZWSP only, NUL, newline, U+202E, emoji only, number, array, 301 characters. Cause: `engine/runtime/readiness.ts:185`
(the list misses U+00AD, U+034F, U+180E, U+200C-D, U+2060-2064, U+E0000 block; the length counts invisible characters).

**B6 · Minor: the review note is not checked.** `POST …/review {"note":"ok‮evil\u0007"+"x"*5000}` → 200. The note is stored cut to
400 characters, with U+202E and BEL inside (and copied into the audit). `{"note":"a\u0000b"}` → **404 "Not found (it may have been
removed by a reset)"** (the database refuses NUL, and the error is shown as 404). `{"note":{"x":1}}` → 200 with the note dropped. Cause: `api/src/readiness.ts:50`.

**B7 · Minor: accepted-until accepts dates that are not plain dates, and one makes it crash.** `"2026-12-01T10:00:00Z"`, `"2026-12-01T99:99:99"` and
`"2026-12-01T23:59:59-12:00"` → 200, each stored as 2026-12-01 (the last one is 2 Dec in UTC). The route promises YYYY-MM-DD only.
`"0000-01-01"` → **500** (PostgreSQL has no year 0). Cause: `api/src/readiness.ts:107` uses `dayOf` (`engine/runtime/readiness.ts:100`),
which allows any `T[\d:.]+` suffix and any year.

**B8 · Minor: repeated Ready / pass adds duplicate records.** Ready to file called again on a READY_TO_FILE filing → 200 every time. The audit has
3 `ready_to_file` events for one filing (user-T, user-O, user-O). 3 passes of the same code at once → `[200, 409, 200]` and 2 `readiness_pass` rows
with the same keys. Ready on a SUBMITTED filing is refused (409), but review → 200 and pass → 200 on a SUBMITTED filing. Cause: `api/src/readiness.ts:84,91`
(only SUBMITTED is checked; READY_TO_FILE→READY_TO_FILE counts as success) and `:72-76` (no lock or uniqueness).

**B9 · Minor (P-155 wording): self-review works in a firm that has a second person.** Case on the Sample firm with user-R as both
representative and case officer: `POST …/review {"self":true}` → 200, `kind: self_reviewed`. The firm also has user-T and user-O.
The plan says Self-reviewed is "for a solo firm". Cause: `api/src/readiness.ts:51` (any officer row, not `firm.solo`).

**B10 · Minor (schema): the database accepts rows the API would never write.** Each of these went in through SQL: `readiness_pass` with
`code='not_a_code'`, `passed_by='nobody'`; `code='missing_document'` with `severity='critical'` and `keys='{}'` by `user-P`; a random
`workspace_id` that matches no workspace; `filing_review` by `user-P`. The last one counts as a review (B2c). Cause: `migration.sql:34-51`. There is no CHECK that the code is
a known one, no non-empty `keys`, no tie between severity and code, and no FK or match between `workspace_id` and the filing. DELETE stays open by design (`:66`), so a
pass or review can be removed without a trace (documented; mentioned only).

## What held
* **Roles:** client user-P/user-Q → 403 on review, pass and ready. Configuration user-A/B/C → 403. Unknown or empty `x-actor` → 401.
  user-S on a Sample-firm filing → 404, and user-R/O/T on the solo filing → 404 (all three routes). user-O and user-T review → 403
  ("Only the representative of record…"). The ended representative's review → 403. user-T and the ended user-R may pass and mark ready, as the plan intends.
  accepted-until by user-B/C/O/R/P/S → 403.
* **Codes:** `barcode_not_validated` → 409 with nothing stored, and the SQL insert is refused by `readiness_pass_code_check`. Unknown, `__proto__`,
  `constructor`, `toString`, `MISSING_FACTS`, `missing_facts%20` → 404. Codes with no open line (`copy_stale`, `edition_expired`) → 409.
  A CRITICAL pass is stored `severity: critical` with its keys. A `key` naming the solo filing's line on another filing → 409. A key that does not exist → 409.
  A pass never covers a line that appears later (after the passport change, a new `missing_facts|…|person.passport_number` line opened).
* **Ready:** 409 names the blocks and open warnings. Two Ready to file at once → one 200, one 409 ("changed since you read it").
  After the barcode block came back, Ready → 409 (but see B1). A self-review without `self:true`, or with `self:"true"` → 400.
* **Append-only:** UPDATE on `readiness_pass` and on `filing_review` is refused by the triggers.
* **accepted-until:** `2026-02-30`, `2026-02-29` → 400, `2028-02-29` → 200. Number, epoch ms, `""`, `true`, `{}`, array, `+02026-12-01` → 400.
  A missing field or reason → 400. Non-JSON → 400. An edition of another workspace (inserted `22222222-…`) → 404. Non-UUID and all-zero ids → 404.
  null clears it, and the history keeps every row.
* **Filing ids:** `not-a-uuid`, all zeros, `' or 1=1--` → 404. An inactive filing (`active=false`) → 404 on all three routes. An upper-case UUID resolves to the same filing.
* **Reasons:** 300 characters accepted, 301 refused. Russian and Hindi reasons accepted.
