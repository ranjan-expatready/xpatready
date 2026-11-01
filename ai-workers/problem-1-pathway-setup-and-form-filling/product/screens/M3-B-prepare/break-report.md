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
