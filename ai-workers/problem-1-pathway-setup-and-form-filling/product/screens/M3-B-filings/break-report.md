# Break report: M3-B filings and fees (C6.12, Visitor visa), commit 02f5ec14

Break tester agent, 1 Nov 2026. API only, no screen. Branch `claude/relaxed-shannon-jp01vj`. Isolated copy :4436, database `xr_studio_m3b` (never :4400).
Scope: the brief for `GET /api/runtime/cases/:id/filings`. It derives one filing per person who applies, one family submission group, and fee lines with family caps, each with a source. Visitor visa only. Paying, other combinations and a screen are not built, so they are not findings.
Cases I created for this run: `BRK-a-*` (vv.single, 4656b365…) and `BRK-b-*` (wp.family, 375fc200…). The database edits I made were reverted: the workspace move was undone, the extra workspace row was deleted, and the snapshot key was put back (jsonb, sha256 unchanged).

**Result: 0 Blocker, 2 Major, 4 Minor.** Two of these the reviewer also found independently (M1 here = review M1; m1 here = review m1).

## Findings

**M1 · Major · The fees on each filing do not add up to the group total.**
Steps: create a vv.single case as user-O, add a spouse and 4 children, then GET `/filings`.
Expected: the per-filing fee lines add up to what the family pays.
Actual: the group total is CAD 670 (cap applied), but the 6 filings' `fees[].amountCents` add up to CAD 1,110. Each filing carries CAD 100 + CAD 85 with no exempt or payer mark (`engine/runtime/filings.ts:82`). Any reader that totals per filing overstates the fee. Same as review M1.

**M2 · Major · A changed release snapshot is read as if it were valid. The pin check compares two stored strings and never re-hashes the snapshot.**
Steps (isolated database only): run `update config_release set snapshot = jsonb_set(snapshot,'{combination,key}','"wp.family"')` on the vv.single release, then GET `/filings` as user-O.
Expected: 409 "This case's pin to its release does not match the release". `api/src/runtime.ts:38-40` promises that "a changed pin or release is refused, never read".
Actual: 200. The response says `derived:false, combination:"wp.family"` and serves the case as a different combination. The reverse change (a wp.family release relabelled `vv.single`) would get Visitor visa fees.
Cause: `config_release` has no frozen trigger. `pack_work_pin` has one (`runtime_pin_frozen` refused my pin edit, which holds). `reach` checks `pin.contentHash !== pin.release.sha256` (`runtime.ts:49`) but never checks the hash against `release.snapshot`. `case-filings.ts:18-19` takes `s.combination.key` from that unverified snapshot.
This is inherited from `reach`, not new code. But money now depends on it.

**m1 · Minor · Filing keys are positional.** Steps: on a family of 6, PATCH a child to `applies:false`, then GET again. `filing-2` now names a different person (`filings.ts:80`). This is a problem once application numbers or receipts attach to a filing. Same as review m1.

**m2 · Minor · Biometrics are charged to every person who applies, and the response does not say that exemptions are not evaluated.** Steps: principal + 1 child → biometrics CAD 170, capApplied false. Unconfirmed: no counsel. Needs the immigration expert: IRCC's biometrics instructions exempt some ages, for example young children (I could not cite a page because canada.ca is not reachable from this session). The brief says "CAD 85 each", so the code matches the brief. The gap is that `basis` (`filings.ts:92`) does not say exemptions are not applied. The biometrics half of `source.quote` is also a summary, not IRCC's words (`filings.ts:19`, P-170).

**m3 · Minor (latent) · Role and combination look-ups go through plain objects, so inherited keys match.** Calling the pure function directly (tsx, /tmp script):
- `deriveFilings("constructor"|"toString"|"__proto__", …)` throws `Cannot read properties of undefined (reading 'principal')`. That would be a 500 through the API.
- A participant with role `constructor` or `hasOwnProperty` becomes a filing whose `mode` is a function (`filings.ts:66,72`, `RULES[...]` / `rules.modes[...]`).
I could not reach this through the API today: `case_participant_role_known` limits roles to `person_role` rows, those rows are only seeded, and combination keys are dotted. Fix by using `Object.hasOwn` or a `Map`.

**m4 · Minor · A request where nobody applies returns `derived:true` with empty `filings` and `groups`, and no top-level reason.** Steps: call the pure function with a principal whose `applies` is false. The result has only `notFiling`. Through the API the principal cannot be marked not applying (PATCH on the principal → 404, which holds), so this is reachable only through the database.

## What held (each tried live on :4436 unless stated)
* **Wrong actors.**
  - Client A (user-P) on their own case: 403.
  - Client B (user-Q) on Client A's case: 403.
  - Author (user-A): 403.
  - No header, unknown `user-X`, case-changed `USER-O`, or two `x-actor` headers: 401.
  - A client gets 403 before any lookup, so unknown and known ids look the same to a client (no way to tell which cases exist).
* **Other workspace.** Case moved to a second workspace row: officer 404 "No such case."; both clients 403.
* **Bad or malformed ids.** Each of these gave 404 Problem Details with no 500 and no stack: zero UUID, not-a-uuid, leading space, `%00`, trailing `/`, `.json`, and a 5,000-character id. An upper-case UUID resolves to the same case (200), which is fine. Query parameters such as `?combination=wp.family&people=9` are ignored. POST, PUT and DELETE on the route give 404.
* **Other combinations.** A wp.family case → 200 `derived:false` with a reason, no filings and no fees.
* **People over limits.** 2 spouses and 6 children added in parallel: exactly 1 spouse and 4 children accepted, the rest 422. A second principal, `case` or `representative` → 400.
* **Totals.** 6 people → CAD 500 (capApplied true) + CAD 170 = CAD 670.
* **The case participant.** It is never counted as a filing or listed in `notFiling`.
* **Toggling applies.** Turning off the spouse and all 4 children → 1 filing, "One submission", CAD 185, 5 entries in `notFiling` with reasons. Client PATCH → 403. PATCH on the case participant or the principal → 404.
* **Concurrent changes.** I ran 40 reads in parallel with 6 rounds of random parallel `applies` toggles. In every read, filings + notFiling = 6, the fee `people` equal the number of filings, the caps were correct, and the group total equals the sum of the fee lines. Each read is one `findFirst`, so every read was consistent.
* **Money and rounding.** Integer cents and `currency:"CAD"`. `cad()` only formats. The 2-person biometrics boundary reports capApplied false, "not above the family maximum".
* **Pin.** Editing `pack_work_pin.content_hash` is refused by the database (`runtime_pin_frozen`). The release snapshot is not protected (M2).
* **Can a client learn fees another way?** No other route returns fees. `grep -i fee api/src` finds them only in `case-filings.ts`. The routes a client can reach (`cases/:id`, `questionnaire`) return people and `applies`, not amounts. The amounts are IRCC's public list anyway.

## Not tested
canada.ca (outside the network), so the fee values rest on row 19 of `screens/W1-baseline/immigration-facts-2026-10-29.md`. I did not test a case whose combination has a newer release (v2) than its pin, because there is only one release per combination on :4436. The code reads the pinned snapshot, never the newest release.
