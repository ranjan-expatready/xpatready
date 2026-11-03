# C7.7 part 2 review: Paper lines with the barcode page (commit 8b5b8dce4)

API-only change (no screen, schema, money or permissions). Reviewed against concept BR-8/BR-9/BR-12, P-143/144/145/171, SA-1B-31, the C7.7 pack and the held C7.6 readiness.

Re-run: tsx check_vv_prepare_store 23/23; acceptance C7.7 26/26 on :4434 (code as of the commit). C7.6 `readiness` untouched (diff has no readiness.ts, no `readiness` slot change). Pen steps are `done: null` (C8.1's breadth, not claimed). Words never say the barcode was decoded.

## Verdict: Block (2 Majors)

## Majors
1. **Newest read-back that failed is ignored (case-prepare.ts, `readOf` loop).** The loop skips any row where `formPassed` is false and falls back to an OLDER passing row. The copy view (`copyOf`: `validated: take 1`, newest only) and `lock` (fill-case.ts ~303-304) judge the NEWEST read-back of the copy: if it did not pass QA-165 they say "not form-checked" / refuse. So after a good read-back, if the person sends a second file whose own Validate failed (or a pre-QA-165 row), the Paper line stays "In progress, validated copy read back for today's facts" while the copy view and `lock` refuse it. Fix: take the newest row per copy first, then test `formPassed`; pick the copy the same way. Add a pass/fail test pair (C7.7-27/28) for it.
2. **Officer's channel versus the release line's channel.** `paperLine` is chosen from `ch.channel` (officer's choice), but the rules it describes use `channelIn` (the release line): `validate` refuses when the line is ONLINE (fill-case.ts:322), the copy is "not for filing" (:243) and `lock`'s `needsValidate` is false (:101). A barcode form whose release line is ONLINE and which the officer moves to Paper (if the account's accepts allow it) gets a "read the validated copy back" step that can never be done: it sits at To do forever, and it contradicts `lock`. Not exercised by the pack (C7.7-25 only covers a refused move). Fix: derive the Validate step and `barcode` from the same `needsValidate`/line channel as `lock`, or state plainly that the copy cannot be validated for this line; add a test, or show that accepts never allow it and test that.

## Minors
- "In progress" reason says "Validated copy with its barcode page read back": what is proven is Validate's passed result in the read-back, not that a barcode page is present. Suggest "Validated copy read back (Validate passed)". Not a decode claim, so not blocking.
- Several copies: newest read-back across all copies wins (ordering by `readAt desc`), consistent with a single-copy case but not tested with two copies.
- State machine (To do / In progress / Out of date, never Ready) and "current" (`factsHash === inputHash(formCoverage(...).facts)`) match the copy view. Out of date precedes Missing: reasonable (P-171 (1)).
- Waiting form (`cannot_start`) and HAND_SCANNED lines keep their earlier branches: correct.

## Rules with pass and fail tests
To do before read-back (-20 / -22), steps absent for PDF upload (-21), In progress (-23), never Ready (-24), IMM 5476 refused (-25), Out of date (-26): pass and fail present. Missing: the two Majors above. Labels name C7.7.

Could not check: browser/UI (none built); live AI off, US$0.

Verdict: Block. Fix: Major 1 and Major 2, each with a test; then re-review the new commit.

## Round 2 (98d447dbe)
Diff-only (8b5b8dce4..98d447dbe, prepare.ts and case-prepare.ts; readiness and fill-case.ts untouched).
- **M1 closed.** `readBackOf` keeps each copy's newest read-back, then applies `formPassed`, then picks the newest passing copy: the same rule as `copyOf` and `lock`. A failed newer read-back is no longer passed over. Engine tests for several copies and for the failed-newer case (27/27) cover pass and fail.
- **M2 accepted as stated.** Changing `channelIn` would alter `lock`, `file` and the not-for-filing rule: a forms-side decision outside this row, correctly raised to the tech lead. The line now says plainly that a barcode form released as Online cannot be validated and read back yet and to ask the Lead, instead of an endless To do. The message matches what the validate route does (refuses on an Online release line), has pass and fail engine tests, and sits after Out of date and before the missing-facts message. Open question stays in the PR, not a blocker here.
- **Minor 1 closed** (wording now "Adobe's Validate passed on it, which adds the barcode page"; no decode claim). Not re-run by me; builder's results taken: 27/27 engine, C7.7 26/26.

**Verdict: Approve** (no open Blocker or Major) for commit 98d447dbe.
