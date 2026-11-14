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
