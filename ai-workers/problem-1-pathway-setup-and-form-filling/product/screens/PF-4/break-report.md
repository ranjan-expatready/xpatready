# PF-4 break report (staff sign-in, roles, permission keys; API only)

Commit `695051a3a`, branch `claude/trusting-curie-xt7wox`. Isolated copy `pf4brk` on :4544 (`PLATFORM_IDENTITY=local PLATFORM_SAMPLE_SEED=on`), 14 Nov 2026, about 07:00-07:15 UTC; stopped afterwards. Rules checked: contracts §7 "§1.2 Staff, sign-in and roles" and the PF-4 row (`origin/lead-b-front-office`). The row has no screen, so screen checks (keyboard, 1024 px, zoom, uploads, 100 programs) do not apply. Paths below are under `S/api/src/platform/identity/` unless named. Totals: **0 Blocker, 3 Major, 7 Minor.**

## Findings

**M1 (Major): changing the letter case of the path skips the platform guard, and the handler runs with no session.** Express matches routes without regard to letter case. `PLATFORM_PATH` (`keys.ts:20`) and the copy in `core.ts:92` are case-sensitive.
- Requests, with no `Authorization` header:
  - `POST /api/Platform/staff/invitations` `{"email":"a@b.co","roles":["ADMIN"]}`
  - `PATCH /api/PLATFORM/staff/<user-T id>/roles` `{"roles":["ADMIN"]}`
  - `GET /api/Platform/me` with `x-actor: user-A`
- Actual: each one reaches the handler. `guard.ts:57` returns true for the path, and the only thing that stops the change is `staffOf` throwing. The answer is **500** and the log gets a stack trace ("staffOf: the platform guard did not run for this route"). With a valid staff Bearer token, `/api/Platform/me` gives 403 "link-only" from `ConfigReadGuard`, because that guard now reads the platform path as a case path.
- Expected: these paths are the platform guard's, so 401 with no token and 200 with a valid token, or else 404. Default deny currently depends on every future `/api/front-office/*` handler calling `staffOf`. A handler that only declares keys and never reads `req.platform` would run with no session and no keys.
- `/API/...` and `/Api/...` fall to the web page (index.html, 200). `//api/platform/me` and `/api/%70latform/me` gave the web page or 404, so they reach no handler.

**M2 (Major): an Admin can resend an Owner invitation, which issues a fresh Owner link with no Owner, reason or step-up check.** `resend` (`service.ts:300-309`) never calls `roleRules`.
- Steps: user-R (Owner) invites `new.owner@example.com` as `["OWNER"]` with a reason. user-O, now ADMIN + CASE_OFFICER, calls `POST /api/platform/staff/invitations/<id>/resend`.
- Actual: **200**. The new row has roles `{OWNER}`, `invited_by = staff:<user-O>` and no reason. The audit line is `platform.invitation.resent` by user-O.
- Expected: 403 `OWNER_ONLY`, since only an Owner gives Owner, with a reason and a sign-in under 5 min.
- The same path lets an Admin reissue a `CASE_MANAGER` invitation it could not create (that create is refused with `ROLE_BEYOND_OWN_KEYS`). It also lets an Admin give a lapsed Owner invitation another 72 h.

**M3 (Major): deactivating or reactivating an Owner skips the 5-minute identity check.**
- Steps: user-R's token is 311 s old (auth_time 1794639891, now 1794640202). user-T is an Owner.
  - `PATCH /staff/<T>/roles` removing OWNER gives 403 `STEP_UP_REQUIRED`, which is correct.
  - On the same token, `POST /staff/<T>/deactivate {"reason":"x"}` gives **200**.
  - `POST /staff/<T>/reactivate` gives **200**.
- Expected: 403 `STEP_UP_REQUIRED`. The code itself treats deactivating an Owner as removing an Owner (comment at `service.ts:212-214`), but only applies the Owner-only part, at `service.ts:214` and `:232`. A stolen session up to 1 h old can lock out every co-Owner except itself.

**m1 (Minor): parallel sign-ins leave more than one live session.**
- Steps: 30 parallel `POST /api/platform/session/local` calls for user-T, then `GET /me` with each token. Repeated for 8 rounds.
- Actual: live tokens per round were 1, 1, **3**, **2**, 1, 1, 1, 1.
- Cause: requests that compute the same `authMs` (`service.ts:120`) all receive tokens, while the loser's `recordSignIn` returns early (`:102`). Cognito's `auth_time` is in whole seconds, so two devices that sign in within the same second both stay live.
- Expected: exactly one live session ("You signed in on another device" for the rest).

**m2 (Minor): a staff member deactivated while their request is in flight still completes a staff change.** The guard checks status and keys before `inFirm` takes the firm lock (`service.ts:133-136`), and they are not checked again under the lock.
- Steps: run user-R deactivating user-T at the same moment as user-T deactivating user-O, 10 rounds.
- Actual: both returned 200 every time. In 7 of 10 rounds, user-T's transaction ran after user-R's had already deactivated user-T. Example: audit `at` 10:38.273 for "R deactivates T", then 10:38.281 for "T deactivates O".
- Expected: 401 once the deactivation is committed. Read the actor again inside the locked transaction.

**m3 (Minor): an Owner change accepts a reason that is invisible.**
- Request: `PATCH /staff/<T>/roles {"roles":["CASE_MANAGER","ADMIN","OWNER"],"reason":"​"}` gives **200**.
- Cause: `reasonOf` (`service.ts:54-60`) trims only white space, so a zero-width space counts as text. Expected: 400 `REASON_REQUIRED`.

**m4 (Minor): a NUL character in any reason gives 404 "Not found (it may have been removed by a reset)" for a staff member who exists.**
- Requests: `POST /staff/<O>/deactivate {"reason":"a\u0000b"}`, and the same reason on `PATCH …/roles`.
- Cause: PostgreSQL refuses the byte, and `main.ts` ProblemErrors maps "invalid byte sequence" to 404. Nothing is saved, but the answer is wrong. Expected: 400 at the field.

**m5 (Minor): two emails that look identical can both hold a pending invitation, and markup is accepted as an email.**
- Requests: `josé@example.com` and `josé@example.com` both got **201**. The database holds two rows that look the same: `6a6f7365cc81…` and `6a6f73c3a9…`.
- More inputs that pass `emailOf` (`service.ts:39-45`):
  - a full-width `ｓecond.representative@sample-firm.example.com`, which duplicates a member of staff
  - a Cyrillic `а` in the domain
  - `<script>alert(1)</script>@x.co`
- Expected: Unicode normalised (NFC, or refused outside ASCII) before the duplicate check, as `service.ts:37-38` itself promises ("two addresses that look the same can never sit side by side").

**m6 (Minor): firm A's person without the credential key gets 403, not 404, on firm B's staff.**
- Request: user-O (Case Officer) calls `PUT /staff/<user-S id, sample-solo>/credential`. Actual: **403** `NOT_ALLOWED`. A random UUID gives the same 403.
- Cause: `service.ts:242-243` checks "own" before the firm lookup. No existence leaks (the answer is the same either way), but the rule says firm B's staff are 404, never 403.

**m7 (Minor): the local stand-in is on by default outside test and production, and its token signature accepts junk.**
- `port.ts:45` falls back to `PLATFORM_ENVIRONMENT=local` when the variable is unset. A server started with `PLATFORM_IDENTITY=local` and no environment set therefore gives anyone an Owner session. Expected: fail closed, so local only when the environment is set to `local` explicitly.
- A token with `!!` or `=` added after the signature is accepted (**200**), because `Buffer.from(…,"base64url")` skips characters it does not know (`local.ts:32`). That allows several spellings of one token, but no forgery.
- A lone surrogate in a licence number (`"AB\ud800CD"`) is saved silently as `AB�CD` (`service.ts:61-64`).

## What held
- **No token or the wrong token:** `/api/platform/me` with no token, or with `x-actor` alone, gives 401. A token with its `sub` swapped, `alg:none`, no signature, `Bearer tok extra`, `Basic`, a token in the query string or a token in a cookie all give 401. Lower-case `bearer` and double spaces are accepted.
- **Duplicate `Authorization` headers:** the first one is used.
- **Bearer and x-actor together:** with both on a platform path, x-actor is ignored.
- **Other paths behave as before:** on `/api/runtime/firm`, x-actor gives 200, nothing gives 401, and a Bearer token gives 403 link-only.
- **Deactivation:** the person's next request gets 401 `STAFF_NOT_ACTIVE` at once. Their sign-in is refused while deactivated. Their old token stays refused after reactivation (`SESSION_REVOKED`). A second sign-in gives the old token "You signed in on another device".
- **Own roles and the only Owner:** changing your own roles, including with the id in upper case, gives 403 `OWN_ROLES`. Deactivating or removing the only active Owner gives 403 with the fixed words plus an audit line.
- **Two Owners racing each other:** 3 rounds of deactivating each other and 1 round of removing each other's Owner role each left exactly one Owner.
- **Admin limits:** an Admin is refused for inviting or giving `CASE_MANAGER` (`ROLE_BEYOND_OWN_KEYS`), for giving or removing OWNER, and for deactivating an Owner. A Case Officer gets `MISSING_PERMISSION` on every staff route.
- **Seats:** 12 parallel invitations with 2 seats left gave exactly 2 × 201 and 10 × 409 `PLAN_LIMIT_REACHED`. Reactivation over the limit gives 409.
- **Resend and revoke:** 8 parallel resends gave one 200. Case-variant duplicates gave one 201. Revoke frees the seat, and revoking twice gives 409. 72 h is held by a check constraint in the database.
- **Firm walls:** firm B's Owner on firm A's invitations gets 404, and on firm A's staff (roles, deactivate, reactivate) gets 404 when it holds the key. Firm B's list is empty.
- **Licence number:** the canary licence numbers were found in no audit line, `module_event` row, answer or `api.log`, including after malformed JSON.
- **Tokens:** no session or invitation token was found in answers, audit lines or the log.
- **Malformed bodies:** these give 400 (body is an array, body is a string, text/plain, an object as reason, a reason of 201 characters).
- **Timing:** `GET /me` averaged 13 ms over 50 calls.

## Not checked
The Cognito path against a real pool (PF-4b); the start-up refusal for an undeclared route (that one is the suite's).
