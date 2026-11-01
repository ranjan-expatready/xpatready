# Review: M3-B prepare view, stored filings and filing items (C6.12 + C11.6, MIGRATION), commit c0e8dae2 (round 2)

Reviewer agent, 1 Nov 2026. Backend only, no screen. Branch `claude/runtime-prepare`, round-2 diff `0d8097f6..c0e8dae2` (the item as a whole is `22dd1251..c0e8dae2`; #325 is the base and is not reviewed). **Fresh** isolated copy on :4433, `xr_studio_rev_prep`, with no data changes this time. US$0, no live switch, never :4400. The copy is stopped.
Spec: `acceptance/C6.12.test.ts`, `C11.6.test.ts`, `M3-CONTRACT.md` (prepare and channel rows), `PACK-4-visitor-visa.md`, `compliance-trace.md` VV-R02, R03, R10, R13–R15, R17. Readiness is a stub slot (C7.6) and is not reviewed.
Journey test: `journey-test-reviewer-2026-11-01.md`, **9/10, passes**.

Round 1 (0d8097f6) was Block: M1 and M2 Major, m1–m5 Minor, N1 outside the item. Git history keeps that text. The breaker's report (`break-report.md`) found B1, which I had missed: another firm could read these audit lines in `/activity`.

## Runs (round 2)
* `tests/check_vv_prepare.ts`: **32/32**.
* `tests/check_vv_prepare_api.ts` on a fresh copy: **25/25**. Pack 4's setup now approves release 2 (S8 PASS; only S2w, S7 and S7a fail, and other rows own those). C6.12 **24/24**, C11.6 **14/14**.
* `tsc -p api/tsconfig.json`: no errors in the changed files.
* My own break script, run again:
  * Group of two, two parallel splits: **200 + 409**, leaving FAMILY plus SEPARATE.
  * Group of six, five parallel splits: **200 + 4 × 409**, then visa CAD 600 (500 + 100, correct).
  * A split and a channel change at once from the same read: 200 + 409.
  * The same filing split twice: 200 + 409.
  * Another firm: 404 on all three routes. Client B 403, no actor 401.
  * A person stops and starts travelling: the same filing and item ids, and the PAPER channel is kept.
  * A read takes about 52 ms.

## Round-1 findings, re-checked
* **M1 · closed.** `case-prepare.ts` `split` and `channel` now check, inside the `FOR UPDATE` transaction: the version (`storedVersion`, worked out from the stored rows the same way the view computes it), the group's active members (refused below 2), and the filing's place in the group. The parallel-split test fails without the fix and passes with it. `prepareVersion` now sorts the groups, so the order rows come back in no longer changes the version.
* **M2 · closed, B1 too.** Neither audit line holds the reason any more: the summary says "(reason given)" and the detail is `{from, to, reason_given}`. The reason stays on `submission_group.reason` and `filing_item.channel_reason`. I searched every `audit_event` row for the sample client values: **0** found. `studio.ts:943` adds `item` and `submission group` to `CASE_ENTITIES`, so `/activity` filters them by firm (tested as `user-S`).
* **m1 · closed.** `feeRule()` in `engine/runtime/filings.ts` is the one source for the biometrics ages and the family maximums in the split refusal.
* **m2 · closed.** With no date of birth, the biometrics step is kept as `cannot_start`: "Waits for the date of birth" (pure test added).
* **m3 · open, accepted for now.** Contract departures (no stored `fee_line`, `signed_by` instead of `signers[]`) go in the PR's first lines, as `M3-CONTRACT.md` asks. Check the PR when it opens.
* **m4 · open, Minor.** The derivation still runs before the lock. A slow read can briefly restore stale removed/withdrawn marks; the next read corrects them, and writes now check the stored version under the lock, so nothing is decided on stale data.
* **m5 · closed.** The header path is fixed, and `/filings` uses the stored group ids (`case-filings.ts:32–36`).
* **N1 · fixed here, outside the item, flag for the Lead.** `engine/snapshot.ts:161` now breaks ties on `lineageKey`, so the hash is deterministic. It is proven by S8 passing on a fresh copy. The placement route that gave a second placement order 4 is not changed, so the duplicate order remains (now stable).

## Breaker items also addressed
* Setting the channel an item already has is a no-op: 200 `changed:false`, no write, no new version, no audit line.
* A reason with a control, zero-width or direction character is a 400 on `reason`.
* A channel sent as a list gets a clear 400.

## New in round 2 (Minor, none blocking)
* **n1 · Minor.** The `Reason` check (`case-prepare.ts:39`) also refuses `\n`, so a screen with a multi-line reason box would get a 400. **Fix:** allow `\n` (and maybe `\t`), or make the future screen use a one-line field.
* **n2 · Minor, for the Lead.** The tie-break can change the stored fingerprint order for any combination already released with tied placement orders. Such a combination may show "changed since release" once until it is re-released. Not checkable here (it would need the demo database).

## What holds (from round 1, re-verified)
* **Migration:** four tables only; constraints and indexes; cascade from `runtime_case`, so demo reset clears them; rollback recorded; no existing row touched.
* **Permissions:** client 403, author 403, client B 403, no actor 401, another firm 404; malformed or unknown ids 404.
* **Fees and ages match IRCC as cited:**
  * VV-R13: visitor visa CAD 100 each, CAD 500 for 5 or more.
  * VV-R14: biometrics CAD 85 each, CAD 170 for 2 or more eligible people.
  * VV-R15: no biometrics under 14 or over 79 (read as 80+).
  * BR-16: each submission group is priced on its own.
* **Channel rules:** C11.6: 422 with IRCC's line, Paper needs a reason (FQ-3), the combination line does not move, the portal is read-only.

## D1–D20 (1–5)
D1 Requirement fit 5 (pack 4 green on a fresh copy) · D2 Data integrity 5 (races hold) · D3 Reuse 4 · D4 Rule integrity 5 (one fee rule) · D5 Stability 4 (m4) · D6 Freshness 4 · D7 n/a · D8–D13 n/a (no screen) · D14 Team look 4 (m3 pending in the PR) · D15 Speed 5 · D16 Testability 5 (a race test, an audit-search test, pass/fail pairs) · D17 simulated only · D18 Provenance 5 · D19 Privacy 5 (no reason in audit; firm-filtered activity) · D20 simulated only.

## Not checked
canada.ca was not re-read; the values rest on the cited compliance-trace rows. No screen, so no browser, axe or screen sizes. No mutation runs (I edit no code). Coverage was not run. The effect of N1 on existing releases in the demo database (n2) was not checked.

**Verdict: Approve** for commit c0e8dae2. No Blocker or Major is open. m3 (PR first lines), m4, n1 and n2 are Minor; n2 and N1 go to the Lead.
