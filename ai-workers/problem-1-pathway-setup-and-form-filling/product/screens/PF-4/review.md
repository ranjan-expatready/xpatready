# PF-4 review: staff sign-in, roles and permission keys (API only)

Reviewer (did not build it), 14 Nov 2026. Commit **695051a3a952f9846d4caea8b981b0c1a23103c0**, branch `claude/trusting-curie-xt7wox`, draft PR #1744. Read: row and Rev 9.1 bullet (`lead-b-rows-2026-11-14.md`), brief `lead-b-briefs/PF-4.md`, contracts §0, §1.2, §7 §1.2 (binding), tech gate entry 2, PF-3 review (m3/B-6, m4, m6, m8, m9, m10) and Lead 43's answer on #1744. No screen, so the UI walks, the 1024 px / 200 % checks and the BIC table are N/A. Journey test: `journey-test-reviewer-2026-11-14.md` in this folder, **8 / 10**.

**Note:** commits 4b7bba5e and 8b3cc892 (breaker fixes) landed on the branch during this review. They are **not** reviewed here. The re-review reads `695051a3..HEAD` only.

## What I ran (copy `pf4rev` on :4543 and scratch databases; never :4400; copy stopped)
* The row's check, `check_pf4_identity.ts 4543`: **89/89**.
* Other suites: `check_pf3_platform_schema` 75/75 · `check_case_feed` 37/37 · `check_features_registry` 27/27 · `check_b104_checkpoint` all passed · `check_d1_reset_to_six` 25/25 on a fresh copy (but see m1).
* `tsc` reports no error in the new files.
* **Mutation pass** on a scratch copy of 695051a3. Each rule was deleted, part A re-run, and the file restored.
  * **Caught (test goes red):** the firm-row lock, the revocation check, the guard's second-step check, the own-roles rule, the 5-minute step-up, the missing-key 403, the Admin-beyond-keys rule, pending invitations in the seat count, resend voiding the old link, the status check, the one-session revocation, and core.ts's line.
  * **Survived (test stays green):** see m2.
* **Probes:** an in-process app built from the feature's classes, plus curl against the copy. The copy's `api.log` holds 0 licence numbers after three credential PUTs, two of them refused.

## Done-when lines: pass and fail each
All held:
* Cognito wrong issuer, client, expired, ID token, unknown subject and wrong key: each 401 in words, with a good token as the pass.
* A deactivated person's next call → 401.
* A second sign-in → "You signed in on another device".
* Start-up stops on a route with no declaration, or on a `system/*` key, and names it.
* Own roles 403.
* An Admin beyond its keys 403.
* Owner only, with a reason and a step-up.
* The only-Owner 403 with §7's exact words and an audit line. Two Owners racing: 200 + 403.
* Seats → 409 `PLAN_LIMIT_REACHED`; a revoked invitation frees its seat.
* Licence-number scan.
* Two-step refused without the second step.
* A→B → 404.
* `user-R` is a Case Manager with a licence and `represent`.
* Lead 43's two fail tests.
* A forced audit failure rolls back the status, the revocation and the event.

Weak spots are in m2.

**Touch list:** `core.ts`, `case-feed.ts` and `check_pf3` are Lead 43's OKs. The `main.ts` and `demo.ts` lines are in the brief (P-571). The extra edits in `settings.ts` (`reason`, m4 `.describe`, the m10 zone rule) are what the brief's own m4, m10 and P-571 (1) asks need, and the PR discloses them. No finding.

## Findings

### Blocker
None.

### Major
* **M1: resend skips the role rules, so an Admin can issue an Owner invitation.**
  * Where: `service.ts:300-309`. Line 305 re-inserts `old.roles` without calling `roleRules`.
  * Run: an Owner invites `new.owner@example.com` as OWNER. The invitation expires. The Admin (user-O) calls `POST …/invitations/:id/resend` → **200**. A new OWNER invitation is valid for 72 h, `invited_by` = the Admin, and the audit line has no reason. The same Admin's direct OWNER invite gets 403 `OWNER_ONLY`.
  * The same hole lets an Admin resend a CASE_MANAGER invitation (200), although its direct invite gets 403 `ROLE_BEYOND_OWN_KEYS`.
  * An Owner resending an Owner invitation also skips the reason and the 5-minute check.
  * This breaks §7: "Admin gives only roles whose keys it holds; only Owner gives … Owner, with a reason and a fresh identity check". PF-4b's accept will honour the new row.
  * Fix: run `roleRules(actor, null, old.roles, [], reasonOf(body.reason, false), tx)` in `resend`. Fail tests: an Admin resends an Owner invitation → 403, and an Admin resends a CASE_MANAGER invitation → 403.
* **M2: the guard can be skipped by changing letter case.**
  * Where: `keys.ts:20` (`PLATFORM_PATH`, case-sensitive), used at `guard.ts:57` and in the start-up scan at `guard.ts:33`. Express routes regardless of case (`main.ts:196`, "any letter case, as Express routes").
  * Run on the copy: `PUT /API/platform/staff/<id>/credential` with no token reaches the handler, and the platform guard returned early. It is stopped only because `staffOf` throws (`keys.ts:47-48`) → **500**, with a stack trace in the log. In process, `GET /API/PLATFORM/ME` with `X-Actor: user-A` → 500.
  * This breaks Lead 43's condition ("refuse every request on those paths that lacks a valid staff token"). Any later route that reads `req.platform` without `staffOf` would run with nobody signed in.
  * Fix: match case-insensitively. Better still, decide by the route's declared `PLATFORM_ACCESS`, not the URL. Fail test: an upper-case path → 401.

### Minor
* **m1: the platform audit workspace breaks `check_d1_reset_to_six` (C10.1) on any copy where a staff member has signed in.**
  * `audit.ts:16` adds a second `workspace` row that the reset never deletes. d1 picks `select id from workspace limit 1` (`tests/check_d1_reset_to_six.ts:43`) and asserts `workspaces === 1` (`:80`).
  * Run: fresh copy → d1 25/25. Fresh copy, then the PF-4 check (which signs in), then d1 → **15/25**.
  * The PR's "no current suite meets it" is wrong for any shared copy, and for the demo once `PLATFORM_IDENTITY=local` is on there.
  * CI copies are fresh, and the app's own behaviour is unchanged.
  * Fix: say so in the PR and ask the release holder (d1 reads the `demo` key, or AUD-1's `firm_id` removes the row).
* **m2: some tests prove less than their labels say. Each item below survived its mutation, or never runs the refusal it names.**
  * (a) The "another person's licence needs `agent/firm-credential:manage`" fail test (`check_pf4_identity.ts:306-308`) uses user-T, who holds OWNER by then and so holds the key: the 403 branch never runs. Deleting the own-record check (`service.ts:243`) stays green. The "own record, no key" pass uses user-O, an Admin who also holds the key. T's write of `R1111111` is not in the leak-scan list.
  * (b) Suspended staff in the seat count: changing to `status = 'ACTIVE'` stays green.
  * (c) The local token's signature check and expiry check (`local.ts:95`, `:100`) can each be deleted with no test going red. No forged or expired stand-in token is tested.
  * (d) The only-Owner branch of `changeRoles` (`service.ts:193`) can be deleted with no test going red. It is reachable only when two Owners race to remove each other's Owner role.
  * Fix: one fail test each.
* **m3: the actor is not re-read under the firm lock.**
  * Where: `service.ts:151-157, 214, 232` use the guard's snapshot of the actor's roles and keys.
  * Scenario: Owner A removes B's Owner role while B gives Owner to C. The firm lock runs them in turn, and B's transaction still sees B as Owner, so C becomes Owner, granted by a non-Owner.
  * Found by reading the code, not run.
  * Fix: re-load the actor's status and grants inside `inFirm`.
* **m4: a person's first-ever sign-in from two devices at once leaves both sessions valid.**
  * `hadSession` comes from the read before the update (`service.ts:99-104, 121`), and a lost `moved.count` is ignored.
  * Narrow race; found by reading the code.
* **m5: the graph cannot see the routes.** The 10 PF-4 routes are invisible to `graph.mjs`: it reads `@Controller(` (`graph.mjs:35`), and the routes are registered with `decorate()` calls. So G3 cannot flag them, and `graph.json` lists 0 platform routes. This is tied to the deferred tsconfig change: record it with Lead B.
* **m6: m10 is still half done.** `ETC/GMT+5` and `Asia/KolKata` are accepted as second spellings (run). Parts that ICU does not list fall back to the "no run of four capitals" rule.

## D1-D20 (API row; simulated)
* D1 **4** (every Done-when line built and tested; M1 breaks a §7 guardrail) · D2 **3** (M1, M2, m3) · D3 5 (keys from PF-3's catalogue; duties derived from keys) · D4 N/A · D5 4 (audit fail-closed, rollbacks hold, double invite 201 + 409) · D6 4 (one audit line per change; platform lines survive the reset; m1) · D7 N/A
* D8-D14 N/A (no screen) · D15 5 (sign-in 92 ms, `/me` 24 ms, list 10 ms, in process) · D16 **3** (m2's surviving mutations) · D17, D20 not walked · D18 5 (§7, OWASP/NIST, SA-6 and AG-1 cited; Sample labelled) · D19 N/A until PF-6's screens

## Could not check
A real Cognito pool (PF-4b); any browser or screen reader (no screen); an intended user's walk (D17, D20); the later commits (re-review).

**Verdict: Block** (Request changes on 695051a3a952f9846d4caea8b981b0c1a23103c0). To fix: **M1** (resend runs the role rules) and **M2** (case-insensitive guard), each with a fail test. The Minors can follow.

## Round 2: head 6b84dbd8 (diff from 695051a3 only, P-277; breaker report read)

**Checks run:**
* `check_pf4_identity.ts 4543` on a fresh `pf4rev` copy (stopped afterwards): **106/106**.
* `check_pf3_platform_schema` 75/75 · `check_case_feed` 37/37 · `check_features_registry` 27/27 · `tsc`: no error in the changed files.
* Mutations re-run on a scratch copy of 6b84dbd8: each of round 1's survivors now turns the check red (the own-licence check, SUSPENDED in the seat count, the stand-in's signature check and its expiry check). So do the new rules: resend's `roleRules`, the roles re-read, the Owner step-up on deactivation, and the sign-in row lock (8 parallel sign-ins → 8 live sessions).
* Probes at the head:
  * `PUT /API/platform/staff/<id>/credential` with no token → **401** on the copy (was 500).
  * In process: `GET /API/PLATFORM/ME` with a simulated person → 401; with a staff token → core's 403 link-only.
  * Every zone that `Intl` lists is accepted, and so are 28 modern IANA names (Asia/Kolkata, Europe/Kyiv, Pacific/Kanton, Etc/GMT-14 …). ETC/GMT+5 and Asia/KolKata are refused.

**Round 1 findings:**
* **M1 fixed.** `resend` runs `roleRules` (`service.ts` resend). An Admin's resend of an Owner invitation → 403 `OWNER_ONLY`, and the invitation is left as it was. An Owner's resend needs a reason and a fresh identity check.
* **M2 fixed.** Three layers now guard these routes:
  * any route that declares access is guarded whatever its path (`guard.ts:57-59`);
  * `PLATFORM_PATH` is case-insensitive;
  * `staffOf` answers 401.
  
  Each layer alone keeps the check green, so the test proves the outcome but not which layer gave it. That is defence in depth, not a finding.
* **m2 fixed** (a Read-only person on another person's licence → 403; suspended staff hold a seat; the stand-in rejects a forged and an expired token).
* **m3 fixed** (409 `ROLES_CHANGED` under the firm lock; status and revocation are re-checked too).
* **m4 fixed for the stand-in** by the person's row lock.
* **m6 fixed**, with one leftover spelling that needs no action: `Asia/Ho_chi_Minh` passes as a second spelling.
* **m1** (the platform-audit workspace against d1 on a shared copy) and **m5** (`graph.mjs` cannot see `decorate()` routes) go to the tech lead, as stated. Both stay Minor and open.
* **The only-Owner branch of `changeRoles`:** keep it. Since the actor is now re-read, the branch cannot be reached through the API (a racing Owner gets `ROLES_CHANGED` first). It is a cheap second wall, and a direct test adds nothing.

**New (Minor, does not block):**
* **r2-m1: on the Cognito path, a person's first sign-ins can leave two sessions live.** The cause: `recordSignIn` writes the "another device" revocation only when `last_sign_in_at` was already set (`service.ts` recordSignIn, `hadSession`). The guard skips an older `auth_time` and writes nothing for it.
  * Run (in process, test key set): device A signs in (auth 10 min ago) but makes no call yet. Device B signs in (1 min ago) and calls `/me` → 200. A then calls `/me` → **200**, so both stay live until a third sign-in.
  * Only a never-used account is affected (a newly accepted invitee), and only on the Cognito path, which nobody uses until PF-4b.
  * Fix: always write the revocation at `at - 1`, or have the guard refuse `auth_time` older than `last_sign_in_at`. Add a fail test with no earlier session.

No Blocker or Major is open at 6b84dbd81faa38f8f902f9247a4d456f3d1518a5. The journey score rises from 8 to 9 / 10: Correct data and Error recovery are now 1.

**Verdict: Approve 6b84dbd81faa38f8f902f9247a4d456f3d1518a5**

## Round 3: head dba1b50d (diff from 6b84dbd8 only, P-277)

**The change:** `recordSignIn` now always writes the another-device revocation at `at - 1`; before, it wrote it only when the person had a session already (`service.ts`, recordSignIn). One new fail test covers r2-m1 in the Cognito section.

**Checks run:**
* `check_pf4_identity.ts 4543` on a fresh `pf4rev` copy (stopped afterwards; no test databases left): **107/107**.
* **Mutation** on a scratch copy of dba1b50d: with `if (hadSession)` put back, the new test goes red (101/103 in part A, which is 102/103 unmutated). The failing line is "device B (newer) calls first, then device A … is refused": A got 200.
* **A first-ever local sign-in still works** (in process, scratch database; user-S, `last_sign_in_at` null):
  * sign-in → 200 and `/me` → 200;
  * one revocation, "another-device", 1 ms before the session's time (revoked at …200, signed in at …201), so the token is not refused by its own revocation;
  * a change made with that token passes the firm-lock re-check: it reached the seat check (409 `PLAN_LIMIT_REACHED` on the solo plan), not 401 `SESSION_REVOKED`;
  * a second sign-in ends the first session (401 `SIGNED_IN_ELSEWHERE`) and the new one works.
* The new test's person is in firm B and is deactivated afterwards, so later seat counts are unchanged.

**r2-m1 fixed.** Nothing else changed. Open as before, both Minor and with the tech lead: round 1's m1 (the platform-audit workspace against d1 on a shared copy) and m5 (`graph.mjs` and `decorate()`). One cost to note, not a finding: one revocation row per sign-in (at about 100 firms, P-562, this is small).

No Blocker or Major is open at dba1b50db02bbbfc7d0262b5e134c0b269750f91. The journey score stays 9 / 10.

**Verdict: Approve dba1b50db02bbbfc7d0262b5e134c0b269750f91**

## Round 4: head 43bf6970 (diff from 808b68c9 only, P-277; CI `skeleton` red at 808b68c9)

**The change:**
* `tools/skeleton-smoke.sh` step 3 now sends PF-4's request shape: `firmKey`, `email` and `secondStep: true`.
* `deploy/compose.test.yml`'s app adds `PLATFORM_SAMPLE_SEED: "on"`; `PLATFORM_ENVIRONMENT` is still unset.
* `check_d1_reset_to_six.ts` leaves the `platform-audit` row out of its two workspace queries. This is round 1's m1, with the release holder's OK on #1744 (option (a); AUD-1 is named as the later clean-up).
* Four new part B checks in `check_pf4_identity.ts`.

**Checks run** (copy `pf4rev` on :4543, started with PLATFORM_IDENTITY=local PLATFORM_SAMPLE_SEED=on; stopped afterwards; no test databases left; Docker is not available here):
* `check_pf4_identity.ts 4543`: **111/111**.
* The smoke script by hand against the copy, with `PLATFORM_ME=required`: all steps PASS, including "me: GET /api/platform/me 200 with firmId".
* The same with `SMOKE_STAFF_FIRM=nope`: "FAIL me: … answered 401 without a token".
* `check_d1_reset_to_six` on that same copy, which by then held the `platform-audit` row (workspaces: platform-audit, demo): **25/25**. Round 1 got 15/25 in this state.

**The three questions:**
* **The smoke is not weakened.** The me step still needs a token from the sign-in, then a 200 on `/api/platform/me` with a Bearer header and `firmId` in the answer (`skeleton-smoke.sh` step 3, unchanged except the body). A refused sign-in still fails it, proven by the new fail check and by my run above. The old `{"email"}` body is still refused (400 `FIRM_REQUIRED`). `secondStep: true` is the stand-in's self-declared second step: that is the stand-in's design (brief, P-567), not a new loosening.
* **Nothing lets the stand-in into test or production.** `identityConfig` is unchanged: PLATFORM_IDENTITY=local still stops the start-up when PLATFORM_ENVIRONMENT is test or production (part A's fail test, still green). `sampleSeedDecision` still refuses production. The compose app sets neither, and the new text check fails if it ever names test or production.
* **The compose change cannot leak into a cloud configuration.** The variables live only in `compose.test.yml`'s `app` service, which only `.github/workflows/skeleton.yml` uses. The Dockerfile bakes in only `STUDIO_PORT`, `STUDIO_PUBLIC_PORT` and npm settings, so the image itself starts with sign-in off and the seed off.
  * One known item stays open for PF-8: an unset PLATFORM_ENVIRONMENT defaults to `local` (breaker m7, kept by choice for local work and recorded in the PR). The cloud configuration must set it. This is not new in this diff.

**d1 change:** it does not weaken C10.1. "The old workspace is gone, exactly one remains" still holds for demo workspaces, and the orphan sweep still checks every workspace. Round 1's m1 is **closed**. m5 (`graph.mjs` and `decorate()`) stays open, Minor, with the tsconfig row (PF-4t, Lead B).

No new findings. No Blocker or Major is open at 43bf6970a7a936f04fd2b9fcdf32878778b1b132. The journey score stays 9 / 10.

**Verdict: Approve 43bf6970a7a936f04fd2b9fcdf32878778b1b132**

## Round 5: head dd308b2d (PF-4's own commit only, P-277; CI `ci` shard 2 red at 1f9b8f76 on check_b164)

**The merge brought in nothing of PF-4's.**
* `git diff 1f9b8f767 dd308b2d8~1 -- …/api/src/platform …/tests/check_pf4_identity.ts` is empty.
* The merge commit's tree equals `git merge-tree --write-tree 1f9b8f767 ea4488b6e` exactly (8a13b3c8), so the merge took no hand edits.

**The change** (`dd308b2d8~1..dd308b2d8`, three files):
* `ports/events.ts` gains two names, `EVENT.STAFF_ROLES_CHANGED` and `EVENT.STAFF_DEACTIVATED`, a strict ids-only `StaffEventPayload`, and the two consumer shapes.
* `service.ts` writes both outbox rows with those names and with `StaffEventPayload.parse({ staffId })`.
* There are two new tests.

**Checks run** (copy `pf4rev` on :4543, started with PLATFORM_IDENTITY=local PLATFORM_SAMPLE_SEED=on; stopped afterwards; no test databases left; `prisma generate` was run first):
* `check_pf4_identity.ts 4543`: **113/113**, including the two new lines.
* `check_b164_no_engine_keys`: **63/63**.
* **Mutation** on a scratch copy: with the bare `"staff.deactivated"` string put back in `service.ts`, B164's scan line goes red and names `api/src/platform/…`. With `EVENT.*` it passes. So the fix is what turns B164 green; the guard is untouched.
* `tsc`: no error in `platform/identity` or `ports/`.

**The three questions:**
* **`ports/` imports only zod.** Every import in `ports/*.ts` is `"zod"`; there are no relative or app imports. The dependency runs one way only: `service.ts` (and FO-1a's `firm-seed.ts`) import `ports/events.ts`, and never the reverse.
* **The payload carries no personal data.** It is `{ staffId: uuid }` and nothing else (`.strict()`). There is no name, email, role word or licence. The firm is the outbox row's `firm_id`. The fail test proves the shape refuses extra keys and a non-uuid id. Dropping the role words from `staff.roles_changed` costs nothing today (nothing consumes it), and it fits contracts §0.5: "ids and the facts the consumer needs".
* **The event row is still written last (PF-3 m8).** In both `changeRoles` and `deactivate`, `tx.moduleEvent.create(…)` is the last write in the transaction, after the audit line. `parse` runs on a database uuid, so it cannot throw there.

No new findings. Round 1's m5 (`graph.mjs` and `decorate()`) stays open as a Minor with the tsconfig row (PF-4t). No Blocker or Major is open at dd308b2d84cdf6faab7a6ee7a42f23a28ab9340d. The journey score stays 9 / 10.

**Verdict: Approve dd308b2d84cdf6faab7a6ee7a42f23a28ab9340d**
