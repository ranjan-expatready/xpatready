# PF-6 — Staff, roles and licences (concept r2, Lead B, 14 Nov 2026; r1 earlier the same day)

Board: `design/board.html` (r1 Sample; r2 changes are listed in the Lead response of `challenge.md` and win over the board). Challenge: `challenge.md` (fresh agent: "Build after these changes", 2 Blockers, 9 Majors, 10 Minors; all answered). Contracts §1.2, **§7 (binding)**. Rows PF-4b (new) and PF-6 in `../../design/lead-b-rows-2026-11-14.md`. Requirements: **AG-01** v1.26 §3.2, §3.3, §3.5, §3.7, §10; **SA-06** v3.15 (SA-6-29, -44, Appendix C); IRPA s. 91(2) (official, laws-lois.justice.gc.ca, current to 2026-10-19). Every name and number is Sample.

## 1. Job and journey
**Job:** an Owner or Admin brings the team in, gives each person the right access, records who is licensed, and takes access away at once when someone leaves; every staff member keeps their own licence and sign-in safe. **Journey:** Team → Invite people → the invitee opens **Accept invitation** (ours) → sets a password and two-step on the identity provider's pages, whose emails go through our send path → signed in → Team shows them Active → roles changed → licence recorded → leaver deactivated (sessions end) → reactivated if seats allow.

## 2. Ten layers and boundaries
API: PF-4 (sign-in, roles, deactivate) and **PF-4b (new)**: the reads (staff list with the seat line, a person, licences, my account), the two-step setting, accept-invitation, sign-in callback and sign-out, the step-up check, and the identity provider's email sender routed to `MailPort` (AG-1-70: one send path). UI: this row, in its own frame component inside `web/src/modules/platform/` (no edit to the app's `frame.tsx`; menu Team · Licences · Security for `agent/staff:manage` holders; **My account** for everyone). **Identity provider (Cognito, Canada):** sign-in, password, passkeys and the second step are its managed pages; **facts the PF-4b builder verifies at AWS's own docs before building, stopping if one fails:** custom email sender trigger; MFA set per user pool (off, optional, on); passkeys on managed login; no recovery codes; `auth_time` in the token for the step-up. **Honest boundary:** until the release holder's identity-join row, deactivation ends access to the platform and front-office routes at once; the existing case screens still use the simulated person (label: *Needed for the proof*, partial until the join).
**Not month one** (P-553 (2)), each stated: Suspend; Delete after deactivate; custom roles; the leaver's handover screen (AG1-D13's handover conflict is the case side's; their open leads already return to Unassigned leads, FO-4 BR-4); offices; a person's own sessions list (but an admin's **Sign out everywhere** for a person, AG-1-41, is in); stored signature; Email/Calendar column (AG-1-76).

## 3. Business rules (each a pass and a fail test)
* **BR-1** Invite rows: name, email, roles (Case Officer pre-selected); the picker offers only roles the inviter may give (an Admin only roles whose every key it holds; **Owner is never offered at invite**: it is given after joining, with its reason and step-up, Lead B decision on SA-6-29/AG-1-66); the whole form is seat-checked first; over the limit nothing is sent (AG-1-10, -13, -69).
* **BR-2** Seats used = active + suspended + pending invitations; checked at invite **and at reactivation** ("Reactivating <name> would use 11 of 10 seats"); deactivated and expired or revoked invitations free their seat (AG-1-13).
* **BR-3** A duplicate row, an existing staff member or an already-invited email is flagged on its row, never sent twice.
* **BR-4** Invitations last 72 hours; list, resend (old link dies), revoke; the Accept page shows: valid → continue; expired → "This invitation has expired. Ask <firm> to send a new one."; used or revoked → "This invitation is no longer valid." (AG-1-12).
* **BR-5** Nobody changes their own roles; an Admin gives or removes only roles whose keys it holds; only an Owner gives or removes Owner, with a reason and a step-up: the identity provider's sign-in within the last 5 minutes (`auth_time`), else "Confirm it's you" sends them to sign in again and back (AG-1-42, -66; SA-6-29). The local stand-in has the same check (a re-sign-in route) for CI.
* **BR-6** The only active Owner cannot be deactivated or lose Owner: SA-6-44's fixed words.
* **BR-7** Deactivate needs a reason (1-200); sessions end at once; "(Inactive) Name"; no email to them; **Sign out everywhere** ends a person's sessions without deactivating (AG-1-15, -41, -70).
* **BR-8** Licence: one per person; **representative type** from IRPA s. 91(2): lawyer (law society of a province), notary (Chambre des notaires du Québec), paralegal or other law-society member, College member (CICC); **licensing body** from `samples/representative-bodies-ca.json` (the College, the Chambre, each provincial and territorial law society, each with its official site and the date read); number with a soft format hint; own licence editable in My account; anyone's by `agent/firm-credential:manage`; never in a log, email or notification (AG-1-30, -31).
* **BR-9** Two-step: per **founder question 3** (Lead 39). Month one, by what the identity provider can do: **(a) required for every firm** (one pool setting; the provider's own enrolment; recovery by an Owner/Admin resetting a person's second step; deviation from AG-1-40's "optional, off by default" recorded; ~0 extra changes) — Lead B's recommendation; or **(b) AG-1-40 as written** (pool optional; our own enrolment page for TOTP; the firm switch enforced by our guard; ~4-6 extra changes). Recovery codes are not offered by the provider in either: recorded deviation.
* **BR-10** Who sees and does what (table in §6); no button for anything not built.

## 4. Layout (Library list + Side panel; anything with a field is a right panel)
* **Team** (`agent/staff:manage` only): search; chips Active · Invited · Inactive; table: name, email, roles, status, two-step (On/Off, from the provider), last sign-in; "6 of 10 seats used" with its tooltip; primary "Invite people".
* **Invite people** (right panel): rows as BR-1, the one-line role summary under each row and **Compare roles** (six roles, can / cannot), both written from **SA-06 Appendix C** in plain words (not AG-01's older example line); seat line live.
* **Person** (right panel): Roles; Licence; Invitation (resend, revoke) or Access (Sign out everywhere; Deactivate with reason; Reactivate with the seat check).
* **Licences** (Owner/Admin: everyone's) and **My account** (everyone: own licence, own two-step state with the provider's link to set it up).
* **Security** (`agent/security-policy:manage`): only under BR-9 (b); under (a) a read-only line "Two-step sign-in is required for everyone."
* **Accept invitation** (public page): firm name, the invitee's email, "Continue to set your password", the BR-4 states.
* **Signed in elsewhere**: "You signed in on another device." with "Sign in again here" (AG-1-55). **Confirm it's you**: the step-up hand-off.
* **States:** empty Team, loading, seat limit, invite expired, conflict (reload), refusals with fixed words, read-only.

## 4b / 4c. Best in class (**Unverified**) and scorecard
As r1, minus the two-step count on Security (dropped as gold-plating). BIC-09: deactivate, Sign out everywhere and the Owner change name the person, say what happens, never default to Yes.

## 5. Copy
r1's lines stand, plus: Reactivate over limit (BR-2); the Accept page states (BR-4); "Confirm it's you: sign in again to give or remove the Owner role."; licence hint "Checked against the usual format only. We never verify licences."

## 6. Contract and tests
**Who may do what:** Team, Invite, Person, Sign out everywhere, Deactivate, Reactivate `agent/staff:manage`; roles `agent/role:assign`; anyone's licence `agent/firm-credential:manage`; Security `agent/security-policy:manage`; My account: everyone. Routes: PF-4 and PF-4b. Tests `tests/check_pf6_staff_browser.ts`: invite → accept in a second browser on the local stand-in → roles → licence → Sign out everywhere → deactivate → their next request refused → reactivate; BR-1…BR-10 pass and fail; keyboard-only; axe-core; 375/1024/1440.

## 7. Questions for the founder
Question 3 (with Lead 39) now carries BR-9's two options and costs. Owner at invite is not a question: the requirement's Owner rules decide it (BR-1).

## Definition of ready
Acceptance test named; rows PF-4b and PF-6 rev 5; challenge answered; **approved by Lead B after the independent challenge (P-223 (4)), 14 Nov**; BR-9's option set by question 3 before PF-6 builds Security.
