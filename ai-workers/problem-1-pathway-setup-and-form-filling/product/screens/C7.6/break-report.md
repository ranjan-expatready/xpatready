# C7.6 Ready to file — break report (PR #861)

Breaker, 4 Nov 2026. **Round 1** at 01595640. Its full text is kept in git at 08b5720 (this file).
**Round 2** (diff only, `git diff 0159564..08b5720`) on 08b5720: a fresh isolated copy `brk` on :4455 (db `xr_studio_brk`) on the
changed migration. Ran `setup_visitor_visa.ts` (13/13) and `setup_vv_m3.ts` (44/46: S2w, and S7a "Cannot PUT /api/library/fees", both outside this PR).
Then I reran the round-1 scripts unchanged and added new probes through `acceptance/lib/m3.ts`. The app booted with the
`forwardRef(() => CasePrepare)` in `api/src/sign-steps.ts:38`; no dependency-injection or circular-import error. Copy stopped and removed. Live AI off, US$0.

## Round 2: status of the round-1 breaks on 08b5720

| # | Sev | Status | Evidence on 08b5720 |
|---|---|---|---|
| B1 | Blocker | **fixed** | Same flow: readyToFile, then `PUT …/person.passport_number "ZX9999999"`. The view shows `status NOT_STARTED`, `blocks [barcode_not_validated]`, db `NOT_STARTED`, and an audit `ready_to_file_reopened` row. `uploaded_to_ircc` → **409** "only once its filing is Ready to file". Ready → 409. See N3 for the gap still left. |
| B2 | Major | **fixed** (see N1, N2) | (a) Rep R→T: `reviewed null`, `representative_review` open. R's review → 403. T's review → 200. (b) A confirmed change after a review reopens it ("changed after it was reviewed on 2026-11-04"). (c) The SQL `filing_review` without `facts_hash`/licence is refused. |
| B3 | Major | **fixed** | Family case with no dates of birth: IMM 5476 and IMM 5707 of the spouse and child are named on their filings (`IMM 5707:true, IMM 5476:true`) as CRITICAL "whether … applies". See N5. |
| B4 | Minor | **fixed** | `key:123` and `key:["x"]` → 400 "Send key as the warning line's key (text)". |
| B5 | Minor | **partly fixed** | Word joiner, ZWJ, soft hyphen, CGJ, U+180E, U+2800, tag characters and Hangul filler + `a` → 400. Still accepted: `"á́́́"` (one letter carrying combining marks; reaches the 409 stage) and a valid reason with hidden characters inside, `"Checked by phone⁠\u{E0041}­"`, stored as sent. Cause: `engine/runtime/readiness.ts:191` counts Mn marks; `:194` still misses U+00AD, U+2060-2064 and the tag characters. |
| B6 | Minor | **fixed** | 5000 characters → 400 "Keep the note to 400 characters". NUL → 400 (was 404). Object → 400 "Write the note as text". U+202E → 400. |
| B7 | Minor | **fixed** (by reading the code) | `readiness.ts` now accepts only `^(20\d{2}|2100)-\d{2}-\d{2}$`, then `dayOf`. Timestamps, `0000-01-01` and numbers are refused there. I did not re-run curl this round. |
| B8 | Minor | **fixed** | Ready again → 200 `already: true`, with no new audit row. Ready at once from two sessions → 200 + 409. 3 passes at once → `[200, 409, 409]`, 1 row. SUBMITTED filing: ready, review and pass → 409. |
| B9 | Minor | **fixed** (see N4) | R as representative + officer in the Sample firm: review → 409 "your firm has another representative", with or without `self`. The solo firm without `self` → 400. |
| B10 | Minor | **fixed** | SQL inserts with `code='not_a_code'`, with `severity='critical'` on `missing_document` and empty `keys`, and with `barcode_not_validated`: all refused. UPDATE on `readiness_pass` / `filing_review` is refused by the triggers. A random `workspace_id` with no match is still possible, but none of the inserts got past the checks. |

## Round 2: new findings in the fixes

**N1 · Major: the review records the facts as they are when the request arrives, not the ones the representative saw.**
Did: user-R reads `GET …/prepare` (`facts_hash` cc4dc3aefd67). user-O then changes `person.passport_number` to `"QQ1111111"` (200).
user-R sends `POST /runtime/filings/:id/review {"note":"Looked fine"}` → **200**.
Actual: the stored review has `facts_hash` 52149ae41dad, the facts after the change, so `reviewed` is set for facts the representative never saw.
This is the "two sessions on the same record" case. The review body takes no `facts_hash` or version to check against.
Cause: `api/src/readiness.ts:67-68` (`now()` is computed inside the request and stored as is). Fix direction for the lead: the client sends the `facts_hash` it showed, and a mismatch gets 409.

**N2 · Minor: a pass on "representative review" is keyed only by the day, so the B2 reopen does not hold after a pass.**
Did: reviewed → confirmed change → `representative_review|||2026-11-04` opens. user-O passes it (200).
Another confirmed passport change the same day: `rr open false, rr passed true` (facts_hash 6ba93ee04422 is new). With no review ever,
the key is `…|||none`, and one pass covers every later change for good. P-237 allows passing the review. But the key should
carry the facts fingerprint, so a pass covers the facts it was written for. Cause: `engine/runtime/readiness.ts:160` (`part: before ?? "none"`).

**N3 · Minor: the stored status is corrected only when someone reads the prepare view.** Two cases:
(a) Ready to file racing an answer change: `ready 200, answer 200, db status right after: READY_TO_FILE`. `ready()` still works
readiness out first, then re-reads the status and updates on status alone (`api/src/readiness.ts:107-115`).
(b) After any change, `filing.status` stays `READY_TO_FILE` until the next `GET …/prepare` or `uploaded_to_ircc`.
Those resets are written during a GET, with the reader as the actor of the audit row (`case-prepare.ts:258-260`).
Today every gate that matters reads through the view, so this holds. C8.2's recording (and any report or export) must do the same, or it will trust a stale value.

**N4 · Minor: the B9 refusal can be dodged by ending your own officer row.** Did: case with user-R as representative + officer.
`POST …/team/officers {"userId":"user-O"}` (201), then `POST …/team/officers/user-R/end {reason}` (201), then user-R `POST …/review {}` → **200
`kind: reviewed`**. The person who prepared the filing is now logged as the second person. Cause: `api/src/readiness.ts:59`
(`prepared` reads only current OFFICER rows, not ended ones or who entered the answers).

**N5 · Minor (latent): a barcode form that "cannot start" waits for no Validate.** `api/src/readiness-inputs.ts:72` sets
`needsValidate: false` while a form's applicability is unknown. Its "whether it applies" line is a CRITICAL warning, so it can be passed with a reason.
If that happens, Ready to file succeeds with no Validate for that form. IMM 5257 never waits on the Visitor visa path. IMM 0008/1344 on later programs would skip P-237's only hard stop.

**N6 · Minor: a pass row the current rule refuses blocks its line for good.** Did: in SQL, a `readiness_pass` row for a
`missing_facts` key with reason `'a'||repeat(chr(8288),4)`. The database CHECK accepts it (btrim length 5), and the view refuses it, so the line stays open.
`POST …/warnings/missing_facts/pass {reason:"Client confirmed by phone (Sample)", key}` → **409 "passed meanwhile"**, every time.
This happens to any row written under an older, looser rule. Cause: `api/src/readiness.ts:93` counts every earlier key as taken, even when the view does not honour that pass.
Note for the lead: the migration `20261104120000_c76_readiness` was edited in place. Any copy that applied the round-1 version needs a reset before it can migrate.

## Round 2: what held
* **Roles**, rerun in full: clients → 403. user-A/B/C → 403. Unknown or empty actor → 401. Cross-firm (S on A; R/O/T on S) → 404.
  O and T review → 403. T and the ended R may pass and mark ready, as planned.
* **Codes:** a block code → 409. `nosuch`, `__proto__`, `constructor`, `toString`, `MISSING_FACTS`, `missing_facts%20` → 404. No open line → 409.
  A foreign key → 409. Bad or inactive filing ids → 404.
* **Reasons:** spaces, marks, ZWSP, NUL, newline, U+202E, emoji, number, array, 301 characters → 400. 300 characters, Russian and Hindi → accepted.
* **B1 path:** a stale Ready goes back to Not started and is audited. `uploaded_to_ircc` reads the live view.

## Round 1 (01595640), summary
B1 Blocker: READY_TO_FILE kept after the barcode block came back; `uploaded_to_ircc` 200. B2 Major: any review by anyone, at any time, counted
(ended representative, empty filing, client row in SQL). B3 Major: `cannot_start` forms dropped from readiness. B4–B10 Minor: a non-text key widened
the pass; hidden characters in reasons; the note unchecked (NUL → 404); timestamp dates and `0000-01-01` → 500; repeated Ready/pass
duplicated records, and review/pass allowed on SUBMITTED; self-review in a two-person firm; missing CHECKs on `readiness_pass` and `filing_review`.
