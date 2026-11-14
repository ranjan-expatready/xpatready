# PF-4 journey test: reviewer, 14 Nov 2026 (commit 695051a3)

PF-4 is API only: no screen. The "users" are a firm's staff calling the API through a client: the Owner (user-R, Case Manager with a licence), an Admin (user-O after the Owner gives the role), a Case Officer (user-O before that), and the next rows (PF-4b, PF-6, FO) that build on the guard. Nothing was walked in a browser. Accessibility, screen sizes and visual quality are N/A.

Where it ran:
* Isolated copy `pf4rev` on :4543, started with `PLATFORM_IDENTITY=local PLATFORM_SAMPLE_SEED=on`; it has been stopped.
* An in-process app built from the feature's own classes on scratch databases (127.0.0.1:54329).
* Never :4400. US$0.

## Journeys (main path first)
1. **The Owner signs in and sees who they are** ("am I set up to represent?"): `POST /api/platform/session/local`, then `GET /api/platform/me`.
   * **Held.** 200 and 200. Roles OWNER and CASE_MANAGER; duties `represent`, `case`, `firm_admin`; `licensed: true`. The number itself is never shown. Sign-in 92 ms, `/me` 24 ms.
   * On the real `main.ts` copy, the seed line ran, and user-R signs in the same way.
2. **The Owner invites a colleague, lists, revokes** (alternate):
   * The invite gives 201 PENDING and 72 h by the database's clock.
   * The list gives 200 in 10 ms. Revoke gives 200; a second revoke gives 409 "This invitation was already revoked."
   * **Held.**
3. **Double click on Invite** (recovery):
   * One 201 and one 409 `ALREADY_INVITED`; one row. **Held.**
4. **Wrong role:**
   * A Case Officer inviting gets 403 "Your roles do not include the permission this needs (agent/staff:manage)."
   * An Admin giving Case Manager gets 403 `ROLE_BEYOND_OWN_KEYS`.
   * An Admin inviting an Owner gets 403 `OWNER_ONLY`.
   * **Held**, but see journey 9.
5. **Bad input:**
   * "nobody" as an email gets "That is not an email address (name@example.com)."
   * An unknown role gets "Not a role: CHIEF. Roles: …" (the role names are in capitals).
   * No reason gets "Give a deactivation reason (1 to 200 characters)."
   * A malformed id gets 404 "No such staff member."
   * A French and Chinese reason of 173 characters is kept exactly.
   * **Held.**
6. **Session ends:**
   * After 2 h: "Your session has ended. Sign in again."
   * After a second sign-in: "You signed in on another device".
   * A deactivated person: "This staff account has been deactivated. Ask your firm's Owner or Admin."
   * **Held.**
7. **Only Owner:**
   * The solo firm's Owner deactivating themselves gets 403 with §7's exact words and an audit line.
   * Two Owners deactivating each other at once: one 200 and one 403.
   * **Held.**
8. **Across the boundary:**
   * Firm A's Owner acting on firm B's staff gets 404 on all three routes. **Held.**
   * Every existing route, and the simulated-person header, behave as before. **Held.**
   * The real demo reset keeps every platform audit line and returns the Sample settings with a "demo reset" line. **Held.**
   * After a sign-in on a shared copy, `check_d1_reset_to_six` drops to 15/25: two workspaces. **Weak (review m1).**
9. **Break it:**
   * An Admin resends an expired Owner invitation: 200, a live OWNER invitation by the Admin, no reason, no step-up. **Broken (review M1).**
   * `PUT /API/platform/staff/<id>/credential` with no token returns 500, not 401: the guard is skipped by letter case. **Broken (review M2).**

## Data underneath
* Each change has one audit line in its transaction, on the platform's own workspace. A forced audit failure leaves no status change, no revocation and no event.
* `module_event` rows are written after the audit line.
* A licence number is never in any audit line, event payload, answer, the check's output or the copy's `api.log`. I scanned after three credential PUTs.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1-2, 6-8; check 89/89 |
| Next step obvious | 1 | Each refusal says what to do: resend instead, revoke or deactivate first, sign in again, ask the Owner |
| Plain words | ½ | Sentences throughout, but the answers name raw keys and enum roles ("agent/staff:manage", "CHIEF … OWNER, ADMIN") |
| Feedback and state | 1 | Invitation states by the database's clock; codes on every problem |
| Correct data | ½ | Exact values and audit; M1 lets an Admin create an Owner invitation |
| Error recovery | ½ | Rollbacks and double click hold; M2 gives a 500 (with a stack in the log) where a 401 belongs |
| Accessibility and screen sizes | N/A | No screen |
| Speed | 1 | 10-92 ms per call; check under 2 min |
| Visual quality | N/A | No screen |
| Trust and sources | 1 | §7, OWASP and NIST cited for two-step; Sample labelled; the licence number is never echoed |

**6.5 of 8 applicable = 8.1, reported as 8 / 10. Pass (8 or more, no 0)**, on the API surface only. The review's two Majors (M1, M2) still decide the verdict, which is **Block**.

To raise the half-scores, most valuable first:
* Resend runs the role rules (Correct data).
* A case-insensitive guard that answers 401 (Error recovery).
* Human role names beside the codes in refusals, for PF-6's screens to show (Plain words).

## Not tested
* A real Cognito pool (PF-4b).
* Any browser, keyboard or screen-reader use (no screen).
* An intended user's unaided walk: D17 and D20 stay with the founder.
* The breaker-fix commits that landed after 695051a3.
