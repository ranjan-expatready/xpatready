# Break report: M3-B "Prepare application" API (C6.12 + C11.6, migration)

Branch `claude/runtime-prepare` at 0d8097f6. Isolated copy `brk_prep` on :4434 (`xr_studio_brk_prep`), set up with `setup_visitor_visa.ts` then `acceptance/lib/setup_vv_m3.ts`. US$0, no live AI, no `*_LIVE` variable. The copy was stopped afterwards. Attack scripts were kept in the session scratchpad only. Scope: the three routes, the four tables and the audit lines they write. No code was changed.

## Findings

**B1. Blocker: another firm's staff and configuration people can read the officer's split and Paper reasons in `GET /api/activity`.**
- Reproduce:
  1. As `user-O` (Sample firm), set a form to `PATCH …/items/:id/channel {channel:"PAPER", reason:"Passport X1234567 holder is blind", version}`.
  2. Split a filing out with `reason:"Spouse DOB 1986-04-13 passport X1234567"`.
  3. Call `GET /api/activity` as `user-S` (the solo firm) and as `user-A`.
- Expected: firm isolation (BR-20, C6.11 review Major 1) keeps another firm's case lines out. RT-17 says an audit line never holds a client value.
- Actual: `user-S` gets both lines. The split line's `summary` ends with the reason word for word. The channel line's `detail` is `{"from":"PAPER","to":"PAPER","reason":"Passport X1234567 holder is blind"}`, so the summary's "(reason given)" hides nothing. A Paper reason is by definition an accommodation, which is often health information.
- Cause: `case-prepare.ts:163` puts `${b.reason}` in the summary. `case-prepare.ts:186` stores `reason` in the detail. The firm filter in `studio.ts:941` (`CASE_ENTITIES`) does not list the new entities `"item"` and `"submission group"`, so these lines pass for every firm (`studio.ts:932`: `if (!CASE_ENTITIES.has(e.entity)) return true`).

**M1. Major: concurrent splits empty the family group, and the family maximum is lost.**
- Reproduce, case of 2: read the view, then send two `POST /groups/:gid/split` calls at once, one per filing, both with the same `version`. Both answer 200.
- Reproduce, case of 6: split one filing, then send the remaining 5 at once. All 5 answer 200. The result is six separate groups and a visitor visa total of CAD 600 instead of CAD 500.
- Expected: the second call gets 409 (stale version), or "A group of one has nothing to split". Done one after the other, the second call does get 409.
- Actual: the version check (`case-prepare.ts:150`) and the group-size check (`:152`) run outside the transaction. Inside the row lock (`:153-160`) the code re-checks only that the filing is still in the group, not the version or how many filings are left. The `FAMILY` row stays in the database with 0 filings and the view no longer shows it.

**M2. Major (verification): the claimed passes did not reproduce on a fresh copy.**
- Reproduce: follow the documented setup exactly. `setup_vv_m3.ts` S8 "release 2 approved" fails on three runs with `Release refused: "Visitor visa" was changed while it was being released` (`studio.ts:913`). The combination stays on release 1.
- Result: `C6.12.test.ts` 23/24 (C6.12-3a fails: no `filingMode` in the pinned release) and `C11.6.test.ts` 10/14 (C11.6-3 to -6 fail: no IMM 5476 item and no line channels on release 1).
- Built notes (`product/qa/built/C6.12.md`, `C11.6.md`) claim 24/24 and 14/14. The same setup is the precondition of `tests/check_vv_prepare_api.ts`, which would also fail its setup line here.
- The cause is not proven to be this branch. This branch does change `studio.ts:199` (people lines now carry `filingMode`), which is one candidate. The builder should show S8 passing on a fresh copy.

**m1. Minor: an unchanged channel is saved as a change.**
- Reproduce: `PATCH` an item to the channel it already has.
- Actual: 200, the version goes up, and an audit line says "from Paper to Paper". Any other open read of the case then gets 409. Expected: no write (or a 200 that changes nothing).

**m2. Minor: a NUL byte in a reason gives the wrong refusal.**
- Reproduce: send a split or channel `reason` containing `\u0000`.
- Actual: 404 "Not found (it may have been removed by a reset)". The Postgres byte-sequence error is mapped to 404 in `main.ts:188`. Nothing is written. Expected: 400 on the `reason` field.
- Related: RTL-override (`‮`) and zero-width characters are accepted and stored, and then reach audit summaries (see B1). Answers refuse these characters (QA-25 `hasControl` in `contracts/runtime.ts`), but `SplitBody` and `ChannelBody` (`case-prepare.ts:32-33`) do not.

**m3. Minor: wrong wording on two refusals.**
- A channel sent as an array `["PAPER"]` is refused correctly, but the message reads `"PAPER" is not a way to file` (`prepare.ts:59`, `String(want)`).
- A split with no reason on a group of one, or with a filing from another case, gets the 400 "give a reason … family maximum" first, before the more relevant 409 (`case-prepare.ts:149` runs before `:151-152`).

**m4. Minor (data hygiene): withdrawing a filing leaves its group behind.**
- Reproduce: split a child out, then mark the child not travelling. Or split one person while marking another not travelling at the same moment.
- Actual: a `SEPARATE` group row stays with no live filing (1 such row on a test case). The view hides it, so nothing is mispriced. Nothing ever removes or reuses the row.

## What held
- **Roles:**
  - The client (`user-P`, `user-Q`), the author (`user-A`) and the approver (`user-B`) get 403 on GET, split and channel.
  - Another firm's staff (`user-S`) get 404.
  - With no or an unknown `x-actor` the answer is 401.
  - None of these calls created a `filing` row (a non-officer GET writes nothing).
- **Ids:**
  - A non-UUID case, group or item id answers 404.
  - A filing id from another case (sent to the split route), or a `not-uuid` filing, answers 409 with nothing moved.
  - A channel on a step item, or on an item of a withdrawn filing, answers 422.
- **Concurrency that held:**
  - 10 GETs at once on a new 6-person case: all 200, 1 family group, 6 filings, 15 items, one version.
  - The same filing split 5 times at once: 1 succeeds, 4 get 409.
  - The same item `PATCH`ed 3 times at once: 1 succeeds, 2 get 409, and one audit line is written.
  - Two different items changed at once with one version: 200 then 409. Done one after the other: 409.
- **Stale or malformed input:**
  - An old version gets 409.
  - Padded or upper-case versions get 409.
  - A version that is an object, or missing, gets 400.
  - A null, array or string body gets 400.
  - A `filing` that is a number gets 400.
  - A reason over 400 characters, or only spaces, gets 400.
  - Paper without a reason gets 400.
  - Online or Not needed outside what IRCC accepts gets 422 with the Form library's line.
- **People changes:**
  - Filing ids stay with their person when people are marked travelling or not; no id moves to someone else.
  - A child marked not travelling and back gets the same filing id, is still split out, and keeps the Paper channel.
  - The principal cannot be marked not travelling (404).
- **Dates of birth:**
  - A date in the future, 2001-02-30 or 1990-13-01 makes the biometrics line wait for the date, never charged or exempt in silence.
  - 29 Feb 2012 gives age 14, which pays.
  - 1900 gives age 126, exempt over 79.
  - Today's date gives age 0, exempt under 14.
  - A missing date waits.
- **Text:** Hindi and Japanese reasons are stored and returned intact.
- **Other combinations:** a `wp.family` case answers `derived:false` with the reason and writes no rows.
- **Reset:** `POST /demo/reset` removes every row in the 4 tables through the cascades, and old ids then answer 404.
- **Schema:** no drift between the migration and `schema.prisma` for the 4 new tables. The CHECK constraints and the one-family-group unique index are in place.
- **Speed (6 people):** first GET about 307 ms, a repeat GET 162 ms, a split 266 ms, a channel change 267 ms, 10 GETs at once about 1.06 s.
