# B5 build notes (screens lane, 7 Nov 2026)

**What was built:** `studio/web/src/runtime/fees.tsx` (new): `FeeBlock` at the foot of each submission group of "Submission
to IRCC", `CaseFees` at the panel's foot; mounted in `studio/web/src/runtime/submission.tsx` (one import, one line per group,
one line after the groups). No server, engine, contract or schema change. Reads the panel's own `/prepare` query.

**Rules as built (concept BR-1 to BR-8, after the challenge):**
* Rows grouped by filing (`<tbody>` per filing, `th scope=rowgroup` with the filing's label); each row: fee label (plus "for
  {person}" when the line's person is not the filing's owner), `amount_words`, `reason`. Exempt lines show the API's CAD 0.
* Basis once per fee on its totals line (`basisOf`): `family_max_cents > 0` → "Per person, with a family maximum of CAD n
  from n people applying together"; the engine's "(per application; …)" → "Per application"; "(per person; …)" → "Per person
  by role"; else none.
* Totals: label, `cadWords(total_cents)`, basis, the API's `why`; "Total for this submission: CAD n"; "Total so far … n fees
  not counted yet" while a line has `waiting`. Case total ("Total for the case", "so far" while waiting) only with more than
  one priced submission: the sum of the API's group `total_cents`.
* `fees_worked_out: false` → `fees_why` once, under the first submission, no amount. `not_filing[]` once under the first
  submission. Declared-only applicants: "Declared only: no fee". Sources: distinct by URL from totals and line
  `source_detail`, a page date shown as "page date …". The view's `basis` sentence once at the panel's foot. No buttons.
* `cadWords` mirrors the engine's `cad()` (no thousands separator) so the page and the server's words agree.

**Tests:** `studio/tests/check_c612_fees_browser.ts` (configured checkpoint, 50 checks: each rule pass and fail, split,
waiting date of birth answered later, not travelling, stubs from the real view for not worked out, the two other bases, an
unreadable basis, a declared-only person; axe, ids, 1024 px, keyboard, client role). `acceptance/C6.12-breadth.test.ts` -25.

**Known limits (Not built here):** paying; a split button on the case page (split is API only); a `basis` field on `/prepare`
(concept Q2); nobody applying shows the panel's own message; the walk ends at a disabled "Record the submission" (no
checkpoint filing is Ready to file).
