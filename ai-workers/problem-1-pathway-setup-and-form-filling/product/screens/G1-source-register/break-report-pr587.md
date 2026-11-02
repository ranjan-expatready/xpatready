# G1 (C5.4) PR 2a: break report on PR #587 at c841b8c9 (2 Nov 2026)

Isolated copy `brk587` on :4472 (demo workspace), server started 19:05:28 UTC at c841b8c9. A second server ran on the
same database on :4473 with `STUDIO_WORKSPACE_KEY=firm`, started 19:10:41 at 3d292caa: during this run the builder
committed 0d46b7c5…6da3ed78 in this same checkout. Only the cross-workspace and configured-load probes used :4473.
Scope: the API, gate, refusal, import and helper (PR 2a). PR 2a has no screen, so keyboard, 1024 px, 200 % zoom and
uploads do not apply. US$0, no `*_LIVE`, both copies stopped. Scripts: the scratchpad (`a1`–`a14.mjs`, `pn.ts`, `ev.ts`).

## Blockers

**B1. A cut-off date written with a time or a trailing space leaves the register, and a real release goes out with it unsourced.**
- Steps: Reset, load. `PATCH /combinations/<wp>/rules/R-38` with the same `when` and the `gte` value
  `"2019-06-07T00:00:00Z"` (200, and no validator problem). `GET …/sources` then shows 26 numbers, not 27, and none on
  R-38. `sourceEveryNumber` answers the other 16. Submit 201 → SME sign → Approve 201: Release 2 has `demo:false`, and
  its snapshot holds `{"op":"gte","field":"person.passport_issue_date","value":"2019-06-07T00:00:00Z"}`. No
  `sources` line answers R-38.
- Expected: the date is a published number (founder P-279) and is refused until it has a source. Actual: it is released.
- The value still works as the 7 June 2019 cut-off. `evaluate()` (contracts/rules.ts:120-135) compares as text:
  2019-06-08 and 2024-01-01 are true, and 2019-06-06 is false. Only the boundary day moves. `"2019-06-07 "` (trailing
  space) behaves the same: it is accepted by PATCH, has 0 numbers on R-38, and works in `evaluate()`.
- Cause: `engine/source-register.ts:122` `isDate = … ISO_DATE.test(v)` runs on the raw string (anchored
  `^\d{4}-\d{2}-\d{2}$`, not trimmed), and `numericText` (`:120`) rejects it. The save check does not test value
  shapes (build note 9). The line is the same at 6da3ed78.
- Fix direction (not done): treat any value whose first 10 characters parse as an ISO date as a date, or refuse
  non-canonical dates on save.

## Majors

**M1. Numbers in an `in` list are not walked (build note 11, still open), and the API accepts them.**
- Steps: `PATCH …/rules/R-05` turning `{"op":"gte","field":"person.age_years","value":18}` into
  `{"op":"in","field":"person.age_years","value":[18,19,20,21]}` → 200. R-05 then publishes 0 numbers and has no
  problem. Its old cited entry moves to `unused`.
- `evaluate()` honours `in` (rules.ts:131), so these ages are published and unsourced. That contradicts BR-1 ("walks
  every condition"). Pure check `pn.ts`: `in [16,17]` gives 0 numbers.
- It is Major rather than Blocker only because the builder raised it for the tech lead. It needs his decision before
  merge.

## Minors

- **m1. A 500 on a valid-looking reason.** `none_published.reason` of "🙂🙂🙂🙂🙂" passes zod (`.min(10)` counts 10 UTF-16
  units, contracts/sources.ts:36). The DB CHECK counts 5 code points (migration line 68), so the result is a 500,
  `source_entry_answer_check` in `var/isolated-brk587/api.log`. Expected: 400 with the field words (STANDARDS §6).
- **m2. Blank-looking or non-stating answers pass.**
  - A reason of ten U+200B (zero-width space) characters → 200, stored as-is.
  - A quote of one U+200B → 200.
  - A quote of 300 "🙂" for the number 90 → 200 (the quote states no number).
  - Neither JS `trim()` nor the CHECK's `[[:space:]]` removes U+200B. The migration comment says "Blank is any
    whitespace". Commit 0d46b7c5's title says quotes must now state the number; not re-tested.
- **m3. The date read is not checked enough.**
  - `"0001-01-01"` → 200.
  - "Today" is UTC (contracts/sources.ts:23), so after 20:00 in Toronto an author can enter tomorrow's date (code
    reading).
- **m4. The URL check is loose.**
  - `https://..x` → 200.
  - `https://a.b/"><script>alert(1)</script>` → 200 and is stored. PR 2b must render it as text or an escaped href.
- **m5. No upper limit on the reason or the URL (DB or zod).**
  - Eight PUTs with a 4.5 MB reason → 200 each. Every entry goes into the draft snapshot, and on release into the
    frozen one.
  - GET sources: 36 MB and 991 ms (about 60 ms before).
  - Review page: 844 ms (161 ms before).
  - Catalogue: 576 ms.
  - A 1 MB URL is stored as well.
- **m6. The import's citations do not check meaning (scaffolding, but frozen in the source-backed Release 1 as
  Official sources):**
  - R-37 "years since expiry: less than 5" cites "Add 5 years to the printed expiry date…".
  - RW_VENEZUELA_PASSPORT_EXPIRED_5_YEARS "at least 5" cites "more than 5 years": the quote says more than, the rule
    says at least.
  - Cause: `statesInDigits` (engine/source-register.ts:238; import.ts:130) only looks for the digits.
- **m7. Wording.**
  - Create with `version:1` → 409 "Someone else saved this source … (it was removed)" (api/src/source-register.ts:96,102),
    although no entry ever existed.
  - `cited:null` → 400 "Invalid input: expected object, received null", not §5's words.
- **m8. `seedSampleSources` (api/src/source-register.ts:137) does not check that the workspace is the demo.**
  - Only the POST route checks; the configured load (`demo.ts:373`) calls the function in any workspace.
  - The gate still refuses Sample outside the demo, and my firm configured load wrote 0 entries (the six publish only
    fee numbers). Code reading.

## What held

- **Roles, on all four routes (GET list, GET item, PUT, POST sample):**
  - No actor or an unknown actor: 401.
  - Approver and SME: GET 200; PUT and POST 403 "Only the configuration author adds sources."
  - Officer, representative, solo and client: 403 everywhere.
- **Other workspace:** demo ↔ firm on one database. GET and PUT on the other workspace's combination id: 404 both
  ways. The firm's POST sample: 409.
- **Forged PUTs:**
  - 404: wrong kind, unknown kind, another combination's key, wrong address, a fee number, a non-UUID id, a random UUID.
  - 409 with the number as it is now: a value of 91 for 90.
  - 200, canonical: `"90.0"`, `"0x5A"`, a short key, an address with spaces.
  - 400: tomorrow, 2026-02-30, http, HTTPS in capitals, tab-only quote or reason, a 9-character reason,
    " abcdefghi ", a 301-emoji quote, a 150-emoji page, both answers, `version` "0" or -1.
  - `sample:true` in the body is dropped (stored `f`).
- **Versions:**
  - 10 concurrent creates → one 200 and nine 409; one row.
  - 10 concurrent updates at v1 → one 200; the 409 names who and when.
  - One audit line per save.
- **PUT racing Approve (4 trials, 0–45 ms apart):** every Approve was 409 "changed while it was being released"; nothing
  was released and there was no 500.
- **Every release route refuses.**
  - Approve: 409 with all 16 in `errors[]`.
  - `/pack/release`: 409; the row is held with "16 numbers have no source entry: fix on Review and release."
  - Only `publishRow` and the import create a `config_release` (grep), and all three routes run `problems()` first.
- **X2b copy:** 3 lines copied to Super visa → 6 numbers listed `missing`; no sources carried.
- **Reset:** after every Reset only the import's 10 entries (`sample-inputs`) remain.
- **Scale (406 checks, 812 numbers on With an LMIA):**
  - Review median 161 ms; 162 ms with the same checks holding no numbers; 142 ms baseline. The walk adds nothing measurable.
  - GET sources 62 ms; all 829 answered: review 154 ms, GET sources 77 ms.
  - About 68 ms per PUT.
  - The 100-program, 400-combination copy was not run.
