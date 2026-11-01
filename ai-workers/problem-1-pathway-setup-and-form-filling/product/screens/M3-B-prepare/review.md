# Review: C6.12 /prepare and stored filings (M3-B2, migration), commit 6c832db3

Reviewer agent, 1 Nov 2026. Runtime lane, backend only, Visitor visa `vv.single`. Branch `claude/serene-euler-vp7ar1`. Diff `761a5ef8..6c832db3`: the item is commits 3528873c and 6c832db3 (8 files). The rest of the range is the main merge ff077e7b. Isolated copy :4469, database `xr_studio_revprep`, stopped at the end. Never :4400.
Judged against: `screens/M3-agent-view/concept-draft.md` r5c BR-1, BR-8, BR-16, BR-18 and §6; `acceptance/M3-CONTRACT.md` row C6.12/C7.7; `acceptance/C6.12.test.ts` and `C11.6.test.ts`; `STANDARDS.md` §4–§7.
Journey test: `journey-test-reviewer-2026-11-01.md`, **8.5/10, passes**.

**Verdict: Block.** One Major is open (M1). Fix it, plus the Minors you accept, and ask for a re-check.

## What I ran
* `check_vv_prepare.ts`: 15/15. `check_vv_prepare_api.ts 4469 xr_studio_revprep`: 25/25 (24 checks plus the Visitor visa setup).
* `count-any --against origin/main`: 428 at the base and 428 now, so no new `any`.
* `prisma migrate diff` (database → schema): no drift on the four new tables. The drift it does show is in older tables, outside this item.
* Acceptance `C6.12.test.ts` on :4469: 15/24. The failures:
  - 3a (modes from configuration), 12–14 (split) and 15–16 (biometrics age) are declared not built.
  - 9a (release label on the case) belongs to another route.
  - 18 and 21 are m4.
* Acceptance `C11.6.test.ts`: 0/14, as expected. It needs the C11.6 setup (portal, IMM 5476, accept records) and the PATCH route, which is the next item. The fields it reads are present: `portal`, `items[].id/channel/accepts/signature`, `version`.
* `graph.mjs --check`: G1 0, G2 0, G3 1 (the existing unrelated route).

## What holds
* **Migration (STANDARDS §4).** Expand only: four new tables, nothing existing altered. CHECKs on `kind`, `mode` and `version`. Unique keys keep rows single: `(case_id, subject_id)`, `(filing_id, subject_id)` and `(filing_id, kind, form_key, subject_id)`. The recorded rollback drops in the right order.
* **Cascade from runtime_case.** `delete from runtime_case` inside a rolled-back transaction left 0 filings: the cascade works despite `filing → submission_group ON DELETE RESTRICT`. The RESTRICT correctly stops a group with filings being deleted on its own.
* **Ids stay stable (BR-1).**
  - A person taken off the trip keeps an inactive filing and gets the same filing and items back (API check).
  - A form that stops applying: I dropped IMM 5707 from the pinned snapshot and its 3 items went `active=f` and were hidden. After restoring it, the same 3 ids came back.
  - Other filings keep their ids throughout.
* **Concurrency.** `pg_advisory_xact_lock(hashtext('prepare:'+id))` holds for the whole transaction. Three first reads at once stored one group and two filings, and all three returned the same version.
* **Fees map onto stored ids (BR-18).** All 6 fee lines on the family of 3 name stored filing ids. Lines add up to the group total. Six people: CAD 500 once on the principal's filing and 5 exempt lines with a reason. Each line cites the IRCC fee list; anything else says Sample.
* **Stale rows when the release or people change.** Pins are fixed per case (`runtime.ts:54`, one pin, hash-checked, no re-pin route) and roles cannot change (`PATCH people` toggles only `applies`). So the stored `combination_key`, `filing_applicant.role` and the default channel cannot go stale today. `active` is recomputed on every read. See m2 for the one window.
* **Access and errors.** Officer only, through `Runtime.reach`. Client 403, configuration author 403, unknown case 404, a release naming another combination 409 as Problem Details. Another combination returns `derived:false`, with plain words and nothing stored. No POST route for filings (404).
* **Contract shape.** `portal`, `portal_read_only`, `version`, `filings`, `groups`, `items` (with `channel`, `accepts`, `accepts_basis`, `signature`, `state`, `reason`), `fees` (`amount` in CAD plus `amount_cents`, with `source`), `not_filing` and `not_built` are all present. `stage1: []` and `readiness: []` are declared not built.
* **Version hash.** FNV-1a 64 over filings, groups, items `[id, channel, version, state]` and fees. It was identical over 10 reads. A changed channel, item state or filing set changes it (unit check).

## Issues (ranked)
1. **M1 · Major · Must: every read rewrites every stored row, one query per row.**
   - Where: `api/src/case-prepare.ts:48-66`. For each filing: an `upsert` (`update: {active:true}`) plus a `createMany`. For each item: an `upsert`. Then two `updateMany`.
   - Measured on a six-person case: the `xmin` of all 6 filings and all 12 items changed on every GET. That is about 30 statements per read and 75–107 ms, against 19 ms for `/filings` on the same case. None of these writes is audited.
   - This breaks the [M] rule "no N+1" (§4) on a read path. It also makes the GET unsafe beyond the first sight, and it is the loop C11.6 and the document and step items will build on.
   - Fix: inside the lock, read the existing filings and items once (2 `findMany`). Then:
     - `createMany({skipDuplicates})` only for the missing filings, applicants and items;
     - one `updateMany` by id list for rows whose `active` flips each way.

     A steady read then writes nothing, with a constant number of statements. Optionally, skip the transaction when a read before the lock finds nothing to change.
   - Test: an API check that a second read leaves the `xmin` of filings and items unchanged.
2. **m1 · Minor · Should: the "form stops applying" rule has no test that fails when the rule is removed (§7 [M]).**
   - Deleting `case-prepare.ts:66` passes both checks. The API check only toggles a person, whose items are hidden anyway through the inactive filing (`prepare.ts:56`). The unit check feeds in an already inactive item.
   - Fix: in `check_vv_prepare_api.ts`, drop a form line from the pinned snapshot (as the 409 check already does), then assert the item is `active=f` and hidden. Restore it and assert the same id comes back.
3. **m2 · Minor · Should: the derivation is read before the lock.**
   - People and answers are read at `case-prepare.ts:24-37`, but the lock is only taken at `:44`.
   - A slow read started before `PATCH people … applies:false` can take the lock after a newer read. It then re-activates the person's filing and items. Its response matches what it read, but the stored `active` stays wrong until the next GET.
   - Fix: take the lock first and read people and answers inside the transaction, or re-`reach` the case inside it.
4. **m3 · Minor · Should: filing order, and so `version`, rests on `createdAt` alone.**
   - The query at `case-prepare.ts:70` sorts by `created_at`, which Prisma sets per row in milliseconds; here each upsert was about 3 ms apart. Two filings in the same millisecond would come back in heap order, and every read now rewrites rows and moves them (M1). The filing order and the hash (`prepare.ts:75`) could then flip between identical reads, giving a spurious 409 once C11.6 checks `version`.
   - Fix: `orderBy: [{ createdAt: "asc" }, { id: "asc" }]`, or sort in `prepareView` by participant order.
5. **m4 · Minor · Should: two acceptance rows not met and not declared.**
   - C6.12-18 expects the view to say "not travelling" (P-209). `not_filing.why` says "Not applying on this case" (wording inherited from #283's `deriveFilings`, passed through).
   - C6.12-21 (G15): a child with no date of birth gets no biometrics line waiting for it. The declared "biometrics age exemptions (VV-R15)" is close but does not name G15.
   - Fix: use the travelling words for the Visitor visa, or record the difference in `challenge.md`. Add G15 to `not_built`.

Noted, not findings:
* `accepts` come from the workspace's live accept records, not the pinned release, and are not part of `version`. C11.6 must re-check at write time.
* IMM 5257 shows signature `NONE` on this copy because its release line has none (C11.6 setup S4a).
* `prepareView`'s `idOf` falls back to `filing-<subject>` (`prepare.ts:53`). That cannot happen while every derived filing is upserted, but it would hide an error rather than surface one.

## D1–D20 (1–5)
* D1 Requirement fit 4: BR-1, BR-8 (channel, accepts, signature on form items), BR-16 and BR-18 for the Visitor visa, with the gaps declared.
* D2 Data integrity 4: unique keys, CHECKs, rows kept inactive and never deleted; −1 for M1 and m2.
* D3 Reuse 5: `deriveFilings`, render's forms, `acceptsOf`, `allowedChannels`, `reach`.
* D4 Rule integrity 4: deny by default; 409 on a release naming another combination.
* D5 Stability 4: ids stable and proven; m3.
* D6 Freshness 4: fee source dated 29 Oct.
* D7: n/a, no AI.
* D8–D13: n/a, no screen.
* D14 Team look 4: M3-CONTRACT names, snake_case, Problem Details.
* D15 Speed 3: about 90 ms and 30 statements per read (M1).
* D16 Testability 3: pass and fail per rule, but m1 lets a rule be removed unnoticed.
* D17: simulated only.
* D18 Provenance 5: URL, quote, date read, checker.
* D19: n/a.
* D20: simulated only.

## Not checked
* canada.ca was not re-read; fee values rest on the 29 Oct record.
* No screen exists, so there was no browser, axe or screen-size pass.
* No mutation runs in source: I may only edit this report. m1 is shown by reading the code and the tests.
* Coverage was not run, and the suites are the builder's.
* The Lead check and the founder's walkthrough are not part of this review.

---

# Round 2: commit 66bb8816 (fixes cd426dd4, c45c3179, 66bb8816)

Reviewer agent, 1 Nov 2026. I read `git diff 6c832db3 66bb8816` (code: `api/src/case-prepare.ts`, `api/src/demo.ts`, `engine/snapshot.ts`, `engine/runtime/filings.ts`, `engine/runtime/prepare.ts`, `tests/check_vv_prepare_api.ts`) and the whole item as `761a5ef8..66bb8816`. I used an isolated copy `rev2prep` on :4471 (`xr_studio_rev2prep`) and stopped it at the end. I did not use :4400 or run-suites. US$0.
Journey test round 2: `journey-test-reviewer-2026-11-01.md`, **8/10, passes**. That does not lift the Block below.

**Verdict: Block** for 66bb8816. One new Major is open (R2-M1), and the round-2 fix for B1 caused it.

## What I ran
* `check_vv_prepare.ts`: 15/15. `check_vv_prepare_api.ts 4471 xr_studio_rev2prep`: 31/31 (30 checks plus setup). `count-any --against origin/main`: 428 at the base and 428 now. `graph.mjs --check`: G1 0, G2 0, G3 1 (the same unrelated route as round 1).
* Both releases on the copy re-hash with `snapshotHash()` to their stored `sha256`.
* Probes with curl and psql, actor `user-O`, results below.

## Round-1 findings: closed
* **M1 closed.** A steady read writes nothing (the xmin check passes). New rows are added in bulk with `createMany`, and each flag change is one `updateMany`. A steady read took 50–83 ms on a 5-filing case (`/filings` 14–18 ms). The statement count is constant.
* **m1 closed.** The test removes IMM 5707 and refits the fingerprint: the item goes `active=f` and is hidden, then the same id comes back. Lifting the trigger is test scaffolding on the isolated copy and is commented. It is not a demo step, so P-33 does not apply.
* **m2 closed in substance.** On the write path the case is reached again after the lock is taken (`case-prepare.ts:32-33`). See R2-M1 for the cost of how it is done.
* **m3 closed for stability.** Order is now by `createdAt`, then `id`. See R2-m1.
* **m4 closed.** "Not travelling (not applying on this case)" is asserted by the API check. G15 is named in `not_built`.
* **B2 closed.** An edited snapshot gets 409 "no longer matches its fingerprint" and stores nothing (API check). `snapshotHash` (`engine/snapshot.ts:63-66`) uses the same expression as `assemble` (`:181-184`). This also covers B3, as stated: a bad line can only come from an edited snapshot.
* **B4 closed.** HEAD answers 405 `application/problem+json` (checked with `curl -I`).
* **B6 closed.** The demo scope counts groups, filings and items. `filing_applicant` is still not counted because it has no `workspace_id`. This is a note, not a finding.
* **B1 closed for steady reads only.** 300 reads at once on a stored case all returned 200 (12.4 s for the whole burst). It is reopened for reads that store something; see R2-M1.
* **B5 and B7 not changed.** The builder's reasons hold: pack 4 C6.12-3 reads `files_own`, and no route can change a role today. They must be in the PR as stated. I could not see the PR from here.

## Issues (ranked)
1. **R2-M1 · Major · Must: concurrent reads that store something deadlock the connection pool, giving 500s and stalling the whole API for 15 s.**
   - Repro, fresh case with 2 people, N first reads of `/prepare` at once:
     - N=5 and N=9: all 200 in under 0.7 s.
     - **N=10: 10×500 after 15.6 s.** N=12: 10×500. N=20: 11×500. N=30: 24×500 after 31 s. N=300 on a new 6-person case: 291×500 after 81 s.
   - **Across cases (the realistic one):** 12 different new cases with one first read each, sent at once: **11×500**. An unrelated `GET /runtime/cases/:id` sent during that burst took **14.6 s** (0.018 s idle). Retrying each case on its own gave 200.
   - api.log: P2028 "Unable to start a transaction in the given time" 249 times, "Transaction not found" 22 times, and "expired transaction … 50312 ms passed".
   - Cause: inside `$transaction` the code still queries through `this.db`, not `tx`:
     - `this.r.reach` twice (`case-prepare.ts:31` and `:33`; `reach` uses `this.db`, `runtime.ts:50`);
     - `this.db.combination.findUnique` (`:43`);
     - `acceptsOf(this.db, …)` (`:93`).

     Each open transaction holds one pool connection and waits for a second one. With 10 transactions open (the pg pool default of 10 under `PrismaPg`, `core.ts:28`), none can go on. They wait until `timeout: 15_000` ends them, and every other route waits too.
   - This is a regression. At 6c832db3 `reach` ran before the transaction, and the transaction body used only `tx`, so the breaker's 30 first reads at once all returned 200. The same pile-up will happen after any change (a person added or removed, a form newly applying) if several officers open /prepare at once. The new B1 test only covers the steady path: its 120 reads run on `twin` after it is already stored.
   - Fix: inside the transaction, use only `tx`.
     - Pass a client to `reach` (or read the case and participants with `tx` after the lock);
     - use `q.combination` and `acceptsOf(q, ws)`;
     - drop the first `reach` at `:31` and lock on `caseId`, since `reach` already returned it on the fast path.
   - Test: 12 or more first reads at once, on one new case and on 12 new cases. All must be 200, with one group per case and no duplicates.
2. **R2-m1 · Minor · Should: filing order is now arbitrary, not principal first.**
   - New filings are made in one `createMany` with one `created_at`, so the `id` tiebreak orders them by random UUID.
   - Seen on a 5-person case: Child 1, Child 2, **principal**, Child 4, Child 3. At 6c832db3 they came out in participant order (one upsert per person). The order is stable, so `version` is safe, but a screen built on this would list the family in a random order.
   - Fix: order `filings` in `prepareView` by the derived filings' order (participant order), not by row order.

Noted, not findings: `readiness: []` stays an empty slot until M3-A3 (declared). The demo count leaves out `filing_applicant` (B6 note above).

## D1–D20 changes from round 1
* D2 Data integrity 5: writes only on change; ids, the fingerprint check and no duplicates hold.
* D5 Stability 3: the pool deadlock under ≥10 concurrent writing reads (R2-M1).
* D15 Speed 3: steady reads are fine. A write burst stalls every route for 15 s.
* D16 Testability 4: m1, B2 and B4 now each have a test that fails when the rule is removed. The B1 test misses the write path.
* All other scores are unchanged.

## Not checked
* The PR text (B5 and B7 differences): I worked on the local branch only.
* The release re-hash on the shared copies: their older schemas have no `config_release`. I re-hashed only this copy's 2 releases.
* No screen, so no browser, axe or screen-size pass.
