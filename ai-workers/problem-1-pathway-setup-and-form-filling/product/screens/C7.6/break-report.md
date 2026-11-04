# C7.6 Ready to file — break report (PR #861)

Breaker, 4 Nov 2026. Each round's full text is kept in git: round 1 at 08b5720 (this file, round-1 section) and round 2 at bb6d192.
**Round 3** (the last; diff only, `git diff 08b5720..bb6d192`) on bb6d192: a fresh isolated copy `brk` on :4455 (db `xr_studio_brk`).
Ran `setup_visitor_visa.ts` (13/13) and `setup_vv_m3.ts` (44/46: S2w and S7a, outside this PR). Then I reran the round-1 role
and code scripts and added new probes through `acceptance/lib/m3.ts`. `tests/check_c76_readiness.ts` 73/73. Copy stopped and removed. Live AI off, US$0.

**Verdict on bb6d192: no Blocker or Major open.** Four Minors remain (B5 note, R1, R2, R3 below). None of them is a permission hole.

## Round 3: status of the round-2 findings

| # | Sev | Status | Evidence on bb6d192 |
|---|---|---|---|
| N1 | Major | **fixed** | Review with no `facts_hash` → 400. Upper-case hash → 400. 64 zeros → 409. Client / officer with the right hash → 403 (role checked first). The hash read, then `PUT passport_number`, then review with that hash → **409** "changed after you read it". The current hash → 200. Six reads of one filing → 1 distinct hash (stable). |
| N2 | Minor | **fixed** | The review line's key is now `representative_review|||2026-11-04|0f90c94330129d3f`. user-O passes it (200). A second confirmed change reopens it (`rr open true`), and the status goes back to `NOT_STARTED`. |
| N3 | Minor | **fixed** | 4 races of Ready to file against `PUT passport_number`: ready → 409 every time, and the database ends at `NOT_STARTED` (0/4 stale). |
| N4 | Minor | **fixed** (see R2) | The pack's N4 check passes (another officer added then ended → 409). Representative + the only officer ever, in the Sample firm, `self:true` → 200 `self_reviewed` (BR-21, as ruled). |
| N5 | Minor | **fixed** (by reading the code) | `api/src/readiness-inputs.ts:74` now sets `needsValidate: x.barcode(f.form)` on a form that cannot start. Not exercised: no Visitor visa barcode form ever waits. |
| N6 | Minor | **fixed** | In SQL, a `missing_facts` pass row with reason `'a'||repeat(chr(8288),4)`: the line stays open. The API pass with a good reason → **200** (was 409). |
| B5 | Minor | **fixed for reasons; still open for the note** | Reasons: `"á×4"` → 400. U+2060, a tag character or U+00AD inside a valid reason → 400 "Remove the invisible characters". ZWJ inside Devanagari → accepted. The review **note** still accepts them: `{"note":"ok⁠\u{E0041}"}` → 200, because the note keeps the old character list (`api/src/readiness.ts:60`). |

## Round 3: new findings in the fixes (all Minor)

**R1 · Minor: another person's answer moves a filing's fingerprint.** Did: family case. Read the principal's filing `facts_hash`, then
`PUT …/answers/<spouse>/person.passport_number "SP0000001"` (the spouse's own filing). The principal's hash changed (`true`).
The safe way round: it reopens a review, or takes a Ready to file back to Not started, for a change on someone else's filing.
That costs a review again; it never skips a check. Cause: `api/src/case-prepare.ts:261` filters `answers` by `field` only, not by the subject
(`about`) of the waiting fact. The answers also come with no ORDER BY (`api/src/runtime.ts:222`), so their order could also change the hash.
In my runs it stayed stable (6 reads → 1 hash).

**R2 · Minor: "who prepared it" means officer rows only, not who did the work.** Did: a case with user-R as representative and
user-O as the only officer. user-R enters `person.passport_number` himself (200), then reviews `{facts_hash}` → **200
`kind: reviewed`**: logged as a second person's review of answers he entered. Cause: `api/src/readiness.ts:63-64` (`prepared`
is having an OFFICER row, never who entered or confirmed the answers). P-237 already allows passing the review with a reason, so this is a recording accuracy point, not a way past a block.

**R3 · Minor (i18n): a short reason in a script with vowel signs is refused.** `"ठीक है"` ("it's fine", 6 code points) → 400
"at least 5 characters". The vowel signs are `\p{M}`, so only 3 letters count. `"फोन पर ठीक"` → accepted. A five-letter English reason passes.
Cause: `engine/runtime/readiness.ts` `passProblem` removes all of `\p{M}` from the count. Counting grapheme clusters would treat every script the same.

**On the facts_hash, as asked:**
- **Forged:** not meaningfully. It is a SHA-256 of the facts the server computes now, and only firm staff can read it (`GET …/prepare` is officer-only).
  The representative still has to be the one of record (403 otherwise).
- **Replayed:** an old hash after a change → 409. The same facts again (A→B→A) give the same hash and are accepted. That is right: the facts reviewed are those.
- **Stale-proof:** I found no change that leaves a review standing.
  - Confirmed values and waiting facts with their answers move it.
  - A "none apply" on a waiting repeating group moved it.
  - Over-sensitive, not under (R1).

## Round 3: what held
- **Roles**, rerun in full: clients user-P/Q → 403. user-A/B/C → 403. Unknown or empty actor → 401. user-S on a Sample-firm filing → 404, and user-R/O/T on the solo filing → 404.
- **Review:** only the representative of record; user-O and user-T → 403.
- **Pass and ready:** firm staff only. user-T passes (200).
- **Codes:** a block code → 409. Unknown codes, prototype names and wrong case → 404. Bad or inactive filing ids → 404.

## Round 2 (08b5720), summary
B1–B4 and B6–B10 fixed. B5 partly fixed. New: N1 Major, a review stamped the facts as they were when the request arrived, not as read.
N2: the review-warning pass was keyed by day. N3: a race left READY_TO_FILE stale. N4: self-review dodged by ending your own officer row.
N5: a "cannot start" barcode form skipped its Validate (latent). N6: a pass row the rule refused blocked its line for good.

## Round 1 (01595640), summary
B1 Blocker: READY_TO_FILE kept after the barcode block came back, and `uploaded_to_ircc` 200. B2 Major: any review by anyone, at any time, counted
(ended representative, empty filing, client row in SQL). B3 Major: `cannot_start` forms dropped from readiness. B4–B10 Minor: a non-text key widened
the pass; hidden characters in reasons; the note unchecked (NUL → 404); timestamp dates and `0000-01-01` → 500; repeated Ready/pass
duplicated records, and review/pass allowed on SUBMITTED; self-review in a two-person firm; missing CHECKs on `readiness_pass` and `filing_review`.
