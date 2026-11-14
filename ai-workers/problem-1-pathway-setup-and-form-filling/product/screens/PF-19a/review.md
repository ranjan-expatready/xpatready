# PF-19a review: messages schema and the consent store

Reviewer: independent (Opus), fresh context, did not build it. Reviewed exactly `git diff origin/main..deb03f13f` (PR #1754, branch `claude/upbeat-planck-my1i4g`), against the brief (`lead-b-briefs/PF-19a.md` on `lead-b-front-office`), the BACKLOG row (rows rev 14/16), AG-2-83, AG-10-22..27 and SA-11-29. PF-0p's `ports/{audit,clock,staff}.ts` and `api/src/platform/audit/audit-event.ts` were in the tree untracked so the code runs. They were not reviewed.

Path prefix: `studio/` = `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/`.

## What I ran
* `npx tsx tests/check_pf19a_messages_schema.ts`: **59 passed, 0 failed** (17 s; scratch databases created and dropped by the test).
* `npx tsx tests/check_prisma_schema.ts`: 8 passed, 0 failed.
* My own scratch database (every migration, then dropped): an unfiltered `prisma migrate diff` shows only drift that is older than this PR (`fact_source`, `form_edition_accept`, `person_role`, `validated_copy` defaults; `canonical_field_name`). So filtering the test's diff to `msg_` lines (test:48) is justified. Inserting a `msg_consent` row that is already withdrawn is accepted (the trigger fires only on UPDATE/DELETE). That matters for finding M1's fix.
* A probe of the shared rule through `fakeConsent()`, which uses the same `decide()` and the same `record()` semantics as the adapter. It reproduced both Majors below, then was deleted.
* Journey test (`.claude/skills/journey-test`): **N/A, no score.** This row has no screen, route or user-facing step, and the task said not to do a browser walk. The port's call sequences are covered by the scripted test and the probes above.

## What holds (checked)
* **Gate rules** (`ports/consent.ts:153-170`, `consent-store.ts:93-106`):
  * marketing needs a live consent on that channel;
  * WhatsApp SERVICE needs the opt-in (a SERVICE consent on WhatsApp), and the opt-in never counts as marketing;
  * transactional and service email are allowed;
  * a suppression stops every class, and the consent read is skipped when suppressed;
  * the decision names its reason and the consent id (AG-10-27).
* **Firm walls.** `firmScope` is used on every query and raw SQL binds `firm_id`. Composite keys:
  * consent → wording, on (firm, id, channel, purpose);
  * copy → consent;
  * outbox → consent;
  * event → outbox.
  * Triggers keep template versions and outbox rows in their template's firm. Firm A cannot read, withdraw or copy firm B's rows (tested).
* **Triggers.**
  * Wording, template versions and events refuse UPDATE, DELETE and TRUNCATE.
  * On a consent, only the three withdrawal columns may ever change, once (the `to_jsonb` comparison). No delete, no truncate.
  * The `withdrawn_at >= given_at` check and the "all three withdrawal columns or none" check are both present.
* **Migration.** Additive: only `msg_` tables, types, functions and triggers. All 7 functions and 11 triggers are `msg_`-prefixed. The stamp is later than `main`'s newest. No data is written. Demo-copy rows are unchanged (tested).
* **Audit.**
  * Fail-closed inside the caller's transaction (forced failure rolls back `record` and `publishWording`, tested).
  * Detail holds ids and enum words only. No address appears in the suppression line (tested). The wording text is not in the detail, only its hash.
* **Concurrency.**
  * `publishWording` holds an advisory lock per key, backed by a unique index.
  * `ensureMessagesFirm` and `suppress` use `ON CONFLICT DO NOTHING`.
  * A `record` that races a `withdraw` is still judged correctly by the "given after the latest withdrawal" rule.

## The builder's five choices
1. **`msg_firm` hub: agree.** It keeps `PlatformFirm` to one slot line, a RESTRICT chain and a lazy upsert inside the caller's transaction. Tested, including P2003 for an unknown firm.
2. **Set-once `withdrawn_at` instead of AG-2-83 rule 7's "new row": agree only with fixes.** The brief binds it, and the PR records the conflict openly. But the model leaves two holes against cards the row cites: **M1** and **M2**.
3. **`allows` derives the purpose from the class, takes db/tx first, and adds `suppress()`: agree.** A separate `purpose` argument could only contradict the class. Without `suppress()` nothing could write `msg_suppression`.
4. **Per-firm suppression, with SA-11-29's platform-wide bounces left for PF-19b: agree to defer, as a Minor (m4).** `msg_suppression.firm_id` is NOT NULL (`platform-messages.prisma:208`), so a platform-wide list needs another migration. The PR's question to Lead B must be answered before PF-19b starts.
5. **Two partial indexes not led by `firm_id`: agree.** Rows with no firm cannot be led by one. The test pins exactly these two and catches a probe index.

## Findings

**M1, Major: a Merge or Link copy of a withdrawn consent comes back live** (AG-2-83 rule 8: "Merge copies every consent row the same way, including withdrawals").
* **Where:** `ports/consent.ts:66-69` and `api/src/platform/messages/consent/consent-store.ts:32-44`. `record()` always writes the copy unwithdrawn. Neither the port nor the adapter carries the source row's `withdrawn_at`, `withdrawn_by` or `withdrawn_via`. The port says it supports "a Link or Merge copy".
* **Failure (reproduced):** Client B is P1. P1 gives web-form consent, then unsubscribes, so P1's gate answers WITHDRAWN. Staff then merge P1 into P2. Merge calls `record({copiedFromId: c1, recordedKind: "SYSTEM", givenAt: c1.givenAt})`. P2 has no withdrawal of its own, so `allows(P2, MARKETING)` answers `{allowed: true, reason: "CONSENT"}`, and marketing goes to a person who withdrew.
* **Calling `withdraw()` afterwards does not repair it.** It would also withdraw any later consent of P2's own (`greatest(at, given_at)`, `consent-store.ts:60`).
* **Fix:** a copy whose source is withdrawn is written with the source's three withdrawal columns. The schema already accepts this (verified). Do the same in the fake. Add a pass and a fail test.

**M2, Major: an unsubscribe or STOP with no live consent row stores nothing and audits nothing** (AG-10-24: an unsubscribe "SHALL write a withdrawal and permanently halt marketing on that channel"; SA-11-29: withdrawals and unsubscribe/STOP "always block sending on every route"; AG-2-83 rule 8: "a copy never undoes a later withdrawal").
* **Where:** `consent-store.ts:59-71`. When the UPDATE matches 0 rows, it returns `{withdrawn: 0}`, writes no row and no audit line.
* **Failure (reproduced):** Client C has no marketing consent. Client C gets one own-mailbox "Send anyway?" email (AG-10-22) and clicks unsubscribe. Nothing is stored, so the next "Send anyway?" sends again.
* **A second failure (reproduced):** after that unsubscribe, a Link copies an older grant onto Client C, and `allows` answers CONSENT.
* **Why it matters:** the set-once model has no row to set, so the withdrawal is lost. Suppression with reason UNSUBSCRIBE is not a substitute, because it would also stop transactional mail.
* **Fix, either:**
  * (a) `withdraw()` with no live row writes a withdrawal-only row (`given_at = withdrawn_at`, with a check that relaxes the wording requirement for exactly that shape). `decide()` already treats it as "latest withdrawal".
  * (b) Lead B rules in writing, in the PR, where such a withdrawal lives. Then add its test.
* An audit line for every withdraw call, including one that matches 0 rows, is needed in either case.

**m1, Minor: a late-processed withdrawal also withdraws a re-consent given after it.**
* **Where:** `consent-store.ts:56-62`.
* **Failure:** a STOP at 10:00 is processed at 10:05 with `at` = 10:00. A web-form tick at 10:02 is then withdrawn "at its own given time", although the newest act was consent (AG-2-83 rule 7: the newest row decides).
* **Fix:** skip rows with `given_at > at` instead of using `greatest`.

**m2, Minor: `givenAt` and `at` accept future times** (`ports/consent.ts:30, 69, 87`).
* **Failure:** a capture passes a browser timestamp a year ahead. Its withdrawal is then stamped a year ahead (`greatest`), and every real re-consent before that date stays "not live".
* **Fix:** refuse times later than the clock plus a small skew.

**m3, Minor: TRANSACTIONAL on WhatsApp needs no opt-in** (`ports/consent.ts:153-157`).
* AG-10-22 and SA-11-29 say a WhatsApp service message needs `WHATSAPP_OPT_IN`. If PF-19b classes a business-initiated WhatsApp message (for example a booking confirmation) as TRANSACTIONAL, the opt-in is bypassed.
* The brief does say "transactional allowed unless suppressed". So either state in the port's doc that TRANSACTIONAL on WhatsApp means replies only, or route it through the opt-in. Ask Lead B which.

**m4, Minor: platform-wide hard bounces and complaints (SA-11-29) cannot be stored as built.** `firm_id` is NOT NULL (`platform-messages.prisma:208, 218`). This is already raised as a PR question. The answer must come before PF-19b.

**m5, Minor: AG-10-26 asks consent capture to record jurisdiction.** `msg_consent` has no jurisdiction column (`platform-messages.prisma:167-202`). The brief's column list omits it too. List it as a known gap in the PR (CASL only for now; Unconfirmed: no counsel) rather than adding scope here.

**m6, Minor: process.** The PR is 1,434 lines, over the brief's "~800 lines: split schema → ConsentPort (P-436 (4))". It is one PR with no stated reason; about 400 of those lines are migration SQL. Say why in the PR, or split.

## Tests vs the Done-when lines
Every Done-when line has a real pass and a real fail, and removing each rule would turn a check red:
* wording edit and delete refused;
* withdrawal makes `allows` false at once;
* marketing without a row is false;
* transactional is true unless suppressed;
* a suppressed address is false for every class;
* events refuse update and delete;
* `firm_id` first in every index (with a probe index proving the check works);
* firm A never reads firm B's consent;
* migration on empty and demo copies, with `migrate diff` showing no `msg_` lines.

The brief's "web form pointing at another firm's wording" is tested on its twin, a consent naming firm B's wording (23503). That is acceptable while FO-1k owns the `fo_web_form` key.

Missing tests: M1 (copy of a withdrawn row) and M2 (withdraw with no live row). The fake-parity check covers one story only; add M1 and M2 to it as well.

## Not checked
PF-0p's files; CI on this head; the demo-DB shard suites and FO-1a's suite (they need `main` with PF-0p merged); the `fo_web_form` key (FO-1k's).

Verdict: Changes needed (fix M1 and M2, each with a pass and a fail test; Minors m1 to m6 at the builder's judgement).

## Round 2: diff-only re-review of `deb03f13f..922474295` (P-277)

I read only that diff (7 files), with the breaker's `break-report.md` (on `deb03f13f`) to see what each fix answers.

**Runs on `922474295`**
* `npx tsx tests/check_pf19a_messages_schema.ts`: **71 passed, 0 failed**.
* `tests/check_prisma_schema.ts`: 8 passed, 0 failed.
* PF-0p's untracked files were still in the tree.

### Round 1 findings
* **M1, closed.**
  * A copy now takes the original's time (`consent-store.ts:42-50`); a different time is refused (`copyKeeps`, `ports/consent.ts:183-187`).
  * A copy of a withdrawn row is written with the source's withdrawal columns.
  * The fake does the same (`ports/consent.ts:246-252`).
  * The test fails if the copied withdrawal is removed: the Merge-copy check reads `withdrawn_at`, `withdrawn_via` and `withdrawn_by`. This also closes break 1, 2 and 3.
* **M2, closed.**
  * New insert-only `msg_consent_withdrawal` table (`migration.sql` new table, its checks, and the two `msg_write_once` triggers).
  * `withdraw()` always writes the row and one audit line (`consent-store.ts:76-93`).
  * `allows()` passes the withdrawal times to `decide()` (`:124-125`, `ports/consent.ts:200-207`).
  * Tested: an unsubscribe with no consent gives WITHDRAWN and leaves an audit line, and a later Link copy of an older grant stays WITHDRAWN. Either check fails if the withdrawal times are dropped from `decide()`.
  * The new table is `firm_id`-led, in MSG_TABLES and under the index check.
  * Merge can carry a withdrawal-only row across faithfully with `withdraw(target, at = original time)`: it ends only consents given at or before that time.
* **m1, closed.** `greatest()` is gone. Only rows with `given_at <= at` are ended (`consent-store.ts:83-87`, fake `:259`). Tested: a withdrawal processed an hour late leaves a later consent live.
* **m2, closed.**
  * `At` accepts only a Date or an ISO time with offset, from year 2000 (`ports/consent.ts:31-32`).
  * `notInFuture` allows at most 5 minutes ahead of the clock.
  * The database refuses `infinity` (`isfinite` checks), NUL in free text, and an invisible-only wording.
  * Tested pass and fail. This also closes break 4, 10 and 11.
* **m3, closed: TRANSACTIONAL on WhatsApp now needs the opt-in** (`purposeNeeded`, `ports/consent.ts:176-180`). Tested. One consequence is in R2-m1 below.
* **m4, open as a question for Lead B** (platform-wide bounces). Accepted as listed-known.
* **m5, closed.** `msg_consent.jurisdiction` (`CA`, `CA-QC`), with checks in the port and the database. Tested.
* **m6, open.** The builder will justify the size in the PR. Accepted as listed-known.

### Break-report items this diff answers
* **Break 5 (UK "(0)" trunk) and break 6 (`<…>`, trailing dot, zero-width space):** closed.
  * `normaliseAddress` now does NFKC, strips invisible characters, `<>`, a trailing dot and `(0)` (`ports/consent.ts:49-59`).
  * `EMAIL_KEPT` is mirrored in `msg_address_ok`, so the database refuses the other forms.
  * Tested.
* **Break 9 (bare client as `tx`):** closed. `inTransaction()` refuses a client that has `$disconnect` (`consent-store.ts:23-26`). Tested.
* **Break 7 (same-millisecond re-consent):** listed as known. It fails closed, so I agree.
* **Break 12 (fake has no firm table):** listed as known. Minor, and I agree.
* **Break 13 (deadlock on opposite-order publishes):** listed as known. Postgres aborts one transaction and the caller retries; Minor, and I agree.
* **Break 14 (outbox consent/channel match):** listed as known. It belongs to PF-19b, which writes the outbox, and I agree.
* **Break 15 (locale differs from the wording's):** not mentioned. Minor; add it to the PR's known list.

### New in this diff
**R2-m1, Minor: the m3 change leaves no path for a WhatsApp reply to a person who wrote first.**
* **Where:** `ports/consent.ts:176-180`. Every non-marketing WhatsApp message now needs the opt-in.
* **The cards:** AG-2-83 rule 2 ("Inbound WhatsApp message: none. The firm may reply") and AG-10-22 ("… and replies are not affected").
* **Failure:** a firm's answer to Amina, who only wrote in on WhatsApp, gets `NO_CONSENT`.
* **Why Minor:** it fails closed (no unlawful send), and nothing sends until PF-19b. I take my share: round 1's m3 left both readings open.
* **Fix:** one doc line on `purposeNeeded`/`AllowsQuery` saying a reply to an inbound WhatsApp message is PF-19b's to route (for example a reply flag or class added then), and an entry in the PR's known list. Do not change the gate now.

**R2-m2, Minor: a trunk 0 written without brackets is still a different number.** `+44 07700 900123` keeps its `0` (`ports/consent.ts:56`) and does not match the suppressed `+447700900123`. That form is less common than "(0)". List it as known or strip a `0` after the country code for the codes that use a trunk prefix.

Nothing else in the diff weakens a round-1 "holds" item:
* firm walls are intact (the new table keys on `msg_firm` and every read is `firmScope`d);
* audit detail is still ids and enum words;
* the migration is still additive and `msg_`-prefixed (7 functions; the trigger count grew to 13);
* the stamp is unchanged.

Verdict: Approve
