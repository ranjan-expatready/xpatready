# Break report: C6.12 /prepare + filing items (migration), commit 6c832db3

Breaker agent, 1 Nov 2026. Branch `claude/serene-euler-vp7ar1`. Isolated copy `brkprep` on :4470, database `xr_studio_brkprep`, stopped at the end. Never :4400. US$0, no model call.
Setup: `isolated.sh brkprep 4470 start`, then `check_vv_prepare_api.ts 4470 xr_studio_brkprep` (25/25). Probes used curl and psql, actor `user-O` unless named.
Scope: `GET /api/runtime/cases/:id/prepare` and the four new tables only. Items on its "Not built" list (split, biometrics age, document and step items, stage 1, readiness, modes from configuration) are not findings. Items already raised in `review.md` (M1 rewrite on every read, m1 to m4) are not repeated. Where my evidence adds to one of them, I say so.

## Findings

**B1 · Major · A burst of reads on one case returns 500s and stalls the whole API (the transaction on a GET).**
- Repro: a case with 6 people, then `seq 1 300 | xargs -P 300 -I{} curl -s -o /dev/null -w '%{http_code}\n' $B/runtime/cases/$X/prepare -H 'x-actor: user-O'`.
  - Run 1: 201×200 and 99×500. Run 2: 212×200 and 88×500.
  - 200 at once: 10×500. 250 at once: 6×500. Two cases with 150 each: 12×500. 150 on one case: all 200, slowest 7.6 s.
- api.log: `P2028 Transaction API error: Unable to start a transaction in the given time` (99 times).
- During the 300-read burst, an unrelated `GET /runtime/cases/$X` took 8.66 s (14–18 ms when idle).
- Control: the same 300-request burst on `/runtime/cases/$X/filings` (read only) gave 300×200.
- Cause: every read opens an interactive transaction and waits on the per-case advisory lock while holding a pool connection. The lock is taken inside the transaction (`api/src/case-prepare.ts:42-44`), so reads queue on the lock and use up the pool and Prisma's 2 s start window. This is the same root as review M1. Its fix (write nothing on a steady read, skip the transaction when nothing changes) would remove this too.

**B2 · Major · A tampered release snapshot is accepted, and its forms are stored permanently.** Only a changed combination key is caught.
- Repro: in the pinned `config_release.snapshot`, set `forms[1].form_number` = `"IMM 5707 renamed"`. Leave `sha256` and the pin's `content_hash` unchanged.
  - Result: `GET …/prepare` → 200. A new stored `filing_item` "IMM 5707 renamed" is shown as `to_do`, the real IMM 5707 item is set `active=f`, and `version` changes.
  - I also added a made-up conditional form ("IMM 5257 SCH1" on `person.refused_visa_or_entry`). It was stored and shown too.
- Expected: 409 "the release does not match its fingerprint", and nothing stored, as the combination-key tamper already gets (`case-prepare.ts:28`).
- Cause: `Runtime.reach` (`api/src/runtime.ts:54`) compares the stored hash columns `pin.contentHash` and `release.sha256` to each other, never to the snapshot content. That check is shared with the other runtime routes. /prepare is the first of them to turn the snapshot into permanent rows with ids.

**B3 · Minor · A bad value in a release line gives a 500 instead of a 409.**
- Repro 1: set snapshot `forms[0].channel` = `"CARRIER_PIGEON"`, then GET /prepare on a new case → 500. `TypeError: Cannot read properties of undefined (reading '0')` at `engine/channels.ts:26` via `engine/runtime/prepare.ts:21`.
- Repro 2: set a form_number of 9,000 characters → 500. `index row requires 9056 bytes, maximum size is 8191`, from the unique index `filing_item(filing_id, kind, form_key, subject_id)`.
- Both need a tampered snapshot, or a release with no length or enum check on form lines. Expected: Problem Details 409 or 422 in plain words. Nothing is stored (the transaction rolls back).

**B4 · Minor · HEAD writes too.**
- Repro: `curl -I $B/runtime/cases/$NEW/prepare -H 'x-actor: user-O'` on a new case → 200. psql: 1 filing and 2 filing_items now exist for that case.
- Express answers HEAD with the GET handler, so link checkers and prefetchers that send HEAD create rows. This adds to review M1 (unsafe GET).

**B5 · Minor · `applicants[].mode` means different things on /filings and /prepare.**
- Repro: on the same case, `/filings` → `filings[0].mode = files_own` and `applicants[0].mode = applying`. `/prepare` → no `filings[].mode`, and `applicants[0].mode = files_own`.
- `prepareView` writes the filing's mode into each applicant (`engine/runtime/prepare.ts:67`, `mode: f.mode`). The stored `filing_applicant.mode` ('applying') is read and then dropped (`case-prepare.ts:76`). The API check asserts the swapped value (`check_vv_prepare_api.ts`, "BR-1 pass … files_own").

**B6 · Minor · Demo reset does not count the new tables.**
- Repro: 12 groups, 39 filings, 39 applicants and 80 items present. `POST /api/demo/reset {"confirm":"RESET"}` as user-A deleted them all (cascade from the case, correct). But `removed_rows` 2734 and the reset-log `removed` list do not include these 170 rows.
- `api/src/demo.ts:381-401` (`scope`) has no row for submission_group, filing, filing_applicant or filing_item. So the "what reset will remove" summary under-reports.

**B7 · Minor · Stored applicant role, filing mode and combination never refresh (latent).**
- Repro (SQL only, since no route changes a role): swap the spouse's and child's `case_participant.role`, then GET /prepare.
  - `/runtime/cases/:id` shows the new roles. /prepare still shows the old ones, with the same `version` (6c7f8ae88a19df4c both times).
- Cause: `case-prepare.ts:52-53` (`update: {active:true}` only; applicant `createMany … skipDuplicates`).
- The review is right that no route causes this today. Recording it so M3-0 (modes from configuration) or a role-edit route does not inherit stale rows without anyone noticing.

**Not reproduced (code-read risk, = review m2).** The derivation is read before the lock (`case-prepare.ts:24-37` vs `:44`). Results:
- 180 rounds of 4–10 reads racing `PATCH applies` gave no wrong response and no wrong stored row after the next read.
- Holding the advisory lock from psql serialised in order (FIFO), so a stale read could not overtake a newer one.
- The window is real but narrow. Each GET repairs it.

## What held
- **Concurrent first reads.** 30 at once on a new 3-person case: 1 group, 3 filings, 3 applicants, 6 items, one version. 150 at once on a 6-person case: 6 filings, all 200. 40 reads racing two `POST people`: 1 group, 3 filings, no duplicates.
- **People.** Off and back on: the same filing and item ids (also under the race). The 5th child is refused (422, release max 4).
- **Forms through answers** (conditional form added to the release):
  - no answer → `waiting`; `true` → `to_do`; `false` → the item is `active=f` and hidden; `true` again → the same id (a9361b54…) back.
  - An answer its own check rejects (`"yes"`) → `waiting`.
- **Fees for 1–6 applying.**
  - Visitor visa 100/200/300/400/500/500; biometrics 85 then 170.
  - Every fee line names a filing in the view.
  - The non-exempt lines add up to the group's `total_cents`, every time.
- **Version.** It changed on each change of people, form state or form set, and was stable over repeated reads. ABA (true → false → true) gives back the earlier hash, as a content hash should.
- **Permissions.**
  - Client (user-P, user-Q) 403. Configuration people (A, B, C) 403. No or unknown actor 401. Another firm's officer (user-S) 404.
  - Same-firm staff with the `case` duty (user-R, user-T) 200, per `isOfficer`.
- **Bad ids** (`not-a-uuid`, nil UUID, trailing characters, quote injection): all 404 with Problem Details, never 500.
- **Other combinations and cascade.** A `wp.family` case → `derived:false`, nothing stored. Combination key tampered → 409, nothing stored. Deleting a case (rolled back) cascades to 0 filings despite the RESTRICT from filing to group. Demo reset leaves all four tables empty.
- **Non-English names.** A name in Arabic, Chinese and Spanish with an emoji showed unchanged in the filing label.

## Not checked
No screen exists, so keyboard, 1024 px and 200 % zoom do not apply. Uploads do not apply to this route. The 100 programs / 400 combinations budgets do not apply to one case's view: a single read took 53–81 ms on 6 people.

# Round 2: commit 66bb8816 (fixes c45c3179, cd426dd4)

Breaker agent, 1 Nov 2026. Copy `brk2prep` on :4472 (`xr_studio_brk2prep`), started at 66bb8816 (`check_vv_prepare_api.ts` 31/31), stopped at the end. Never :4400. US$0. The shared working tree moved to 4bdcbf1b during my run (d66d9fdf says it fixes R2-M1). My server kept running 66bb8816 code, so every result below is for 66bb8816. I did not re-test d66d9fdf. Line numbers are at 66bb8816.

## Findings
**R2-B1 · Major (= review R2-M1, confirmed) · Ten reads that store something, sent at once, deadlock the pool: all 500, nothing stored, the whole API stalls for 15 s.**
- One new 6-person case, N first reads at once: N=2, 4, 6, 8, 9 all 200 in under 1 s. **N=10: 10×500 after 15.7 s, 0 rows stored.** N=20: 11×500. N=40: 33×500. N=150: 146×500 (78 s). N=300: 294×500 (94 s). N=500: 494×500 (114 s).
- **Different new cases, one read each, all at once:** 5 cases all 200. 10 cases: 10×500 (15.6 s). 12 cases: 12×500. Every case was left with no rows. Each one read again on its own gave 200.
- During a burst, an unrelated `GET /runtime/cases/:id` took 13–46 s.
- api.log: 670 "Unable to start a transaction in the given time", 63 "Transaction not found", 55 "expired transaction … 15000 ms".
- Cause: the limit is exactly the `PrismaPg` pool default of 10 (`core.ts:28`). Inside `$transaction`, `reach` (`case-prepare.ts:31,33`), `this.db.combination` (`:43`), `state` and `acceptsOf(this.db)` (`:51,93`) each need a second connection. This is a regression: in round 1, 30 first reads at once all returned 200. The newer check file's R2-M1 tests, run against this server, fail the same way ("[500,200]", 15544 ms).

**R2-B2 · Minor · Each read re-hashes the whole snapshot on the event loop, so reads get slower and stall other routes.**
- `snapshotHash` on the Visitor visa snapshot (461 KB) takes 17–21 ms of CPU, every read (`case-prepare.ts:45`), and twice on the write path. The release is immutable, so the hash does not change.
- One steady read takes 40–50 ms; `/filings` takes 15 ms.
- 300 steady reads at once: all 200, but the burst takes 11.6 s (`/filings`: 1.7 s). 500 at once: 19.9 s. An unrelated `GET /runtime/cases/:id` during the 300 burst took 10.7 s.

**R2-B3 · Minor · A snapshot with no `forms` gives 500, not 409 (what is left of B3).**
- `snapshot - 'forms'`, or `forms = null` → 500 `TypeError: Cannot read properties of undefined (reading 'map')` at `engine/snapshot.ts:65`. Nothing stored. `snapshot = '{}'` gets 409, from the combination check.

**R2-B4 · Minor (latent) · Nothing stops a release row being changed. If its snapshot and sha256 are both edited, every case opened afterwards stores from the edited copy.**
- I renamed `forms[1]` to "IMM 5707 renamed" and set `sha256` to the new `snapshotHash`. The existing cases got 409 "pin … does not match" (held: the pin is frozen by `trg_pack_work_pin_frozen`).
- A case opened after the edit pinned the new hash. Its `/prepare` returned 200 and stored "IMM 5707 renamed". After I restored the release, that case gets 409 for good.
- `config_release` has no frozen trigger, unlike `pack_work_pin`. This needs a direct database write.

**R2-B5 · Minor · The HEAD 405 has no `Allow` header.** RFC 9110 §15.5.6 requires one. The body is `application/problem+json`; nothing is stored.

**Note (= review B6 note).** `filing_applicant` is still not counted by demo reset. Reset counted 384 = 27 groups + 119 filings + 238 items, but not the 119 applicant rows that were removed with them.

**Note (latent, a genuine release could get 409).** No genuine release fails today (see below). But `canonical` (`contracts/rules.ts:8-11`) writes `undefined` for a key with no value, and jsonb drops that key. So any future snapshot field left undefined, or any change to the fingerprint expression, would turn `/prepare` into 409 for every earlier release. Other routes would still read those releases, because `reach` compares only the stored hash columns. The C-8 `fingerprintLine` shim shows this has happened once already.

## What held
- **B2, plain edits:** every edit that changes behaviour gets 409 and stores nothing, on a case with rows and on a new case. I tried: a form renamed, child max 4→10, spouse `applies` false, `portal` added, a `fees` key added, a form channel PAPER, and a form status always→PUBLISHED.
- **Edits outside the fingerprint:** `item_version`, `mode` and `row_versions` are left out by design and `/prepare` does not read them. Each gave 200 with the same `version`.
- Changing only `sha256` gets 409 (pin mismatch). Setting the snapshot to `{}` gets 409.
- **No false 409 on genuine releases:** I re-hashed all 90 releases on 56 local databases (read only). 89 match. The only mismatch (`xr_studio_rev64_forms_s4r`, wp.family) is an edited field-map edition, `IMM 1295 (01-2019)` vs `(09-2023)`, with no pins, so it was tampered and is not genuine. All of these releases are from 1 Nov, so none was made before an earlier fingerprint change.
- **B1, steady reads:** 300 and 500 reads at once on a stored case were all 200, with no rows added (see R2-B2 for the time).
- **Reads racing `PATCH people … applies`:** 60 rounds of 6 reads plus 1 PATCH (420 requests, all 200). After each round, the stored filing `active` and the view matched `applies`. No duplicates: 1 group, 4 filings, 8 items.
- **M1:** taking one child off wrote exactly 3 rows (the child's filing and 2 items). The group, the other filings, the items and `filing_applicant` kept their xmin.
- **HEAD 405** (401 with no actor), and nothing stored. OPTIONS, POST, PUT, PATCH, DELETE and TRACE: 404 Problem Details, nothing stored.
- **Permissions:** O, R, T 200. P, Q, A, B, C 403. S 404. No actor 401. Bad ids 404.
- **Cascade:** deleting the case (rolled back) left 0 filings, 0 groups and 0 orphan items or applicants. Deleting a group with filings is refused (RESTRICT).
- **Demo reset** emptied all four tables. Its scope now includes "Filings, groups and filed items".
