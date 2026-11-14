# PF-6 — Staff, roles and licences (concept r1, Lead B, 14 Nov 2026)

Board: `design/board.html` (Sample). Contracts: `../../design/platform-and-front-office-contracts-2026-11-14.md` §1.2 and **§7 (binding)**. Row PF-6 in `../../design/lead-b-rows-2026-11-14.md` (rev 4). Requirements: **AG-01** v1.26 §3.2 (staff), §3.3 (roles), §3.5 (licences), §3.7 (two-step and sessions), §10 (keys); **SA-06** v3.15 (SA-6-29, -44); trace `../../design/lead-b-trace-2026-11-14/t3-staff-roles.md`. Every name and number is Sample.

## 1. Job and journey
**Job:** an Owner or Admin brings the team in, gives each person the right access, records who is licensed, and takes access away at once when someone leaves. **Personas:** Owner, Admin (`agent/staff:manage`, `agent/role:assign`, `agent/firm-credential:manage`, `agent/security-policy:manage`); any staff member for their own licence. **Journey:** Team → Invite people (rows, seat check) → the invitee accepts (Cognito's own set-password and two-step pages, not ours) → Team shows them Active → roles changed → licence recorded → leaver deactivated with a reason (sessions end at once) → reactivated if needed. **Cards:** AG-1-10, -12, -13, -14, -15, -17, -22, -30, -31, -40, -42, -55, -60, -66, -69, -70; SA-6-29, -44.

## 2. Ten layers
Data and API: PF-3, PF-4 (fenced). Contract: zod shapes in `web/src/modules/platform/contract.ts`. UI: this row, through PF-1's seam, in its own `Frame` (area "Firm settings": Team · Licences · Security). AI: none. Governance: every change through `AuditPort` (PF-4). **Not ours:** sign-in, set-password, two-step enrolment, recovery codes and passkeys are Cognito's managed pages (AG-1 §3.7 behaviour, Cognito's implementation; PF-2's pick). **Not month one:** Suspend (keeps a seat), Delete after deactivate, custom roles (`agent/role:manage`), the leaver's handover screen (AG-1 §3.2: their leads already return to Unassigned leads, FO-4 BR-4; case work handover is the case side's), offices, My sessions list, the stored signature, Email/Calendar connection column (AG-1-76).

## 3. Business rules (each a pass and a fail test)
* **BR-1** An invite has name, email and one or more roles; "Case Officer" is pre-selected; one form takes several rows; the whole form is checked against seats first ("7 of 10 seats after these invites"); over the limit nothing is sent ("Remove 1 person or upgrade") (AG-1-13, -69; SA-3-41).
* **BR-2** Seats used = active + suspended + pending invitations; deactivated and expired or revoked invitations free their seat at once (AG-1-13).
* **BR-3** A duplicate row, an existing staff member or an email already invited is flagged on its row, never sent twice (AG-1 §3.2 data flow).
* **BR-4** Invitations last 72 hours; pending ones are listed with expiry, can be resent (the old link dies) and revoked; an expired one shows "Invite expired · Re-invite" (AG-1-12; trace t3 C4).
* **BR-5** Nobody changes their own roles; an Admin gives or removes only roles whose every key the Admin holds; only an Owner gives or removes Owner, with a reason and a fresh identity check within 5 minutes (step-up) (SA-6-29; AG-1-42, -60, -66).
* **BR-6** The only active Owner cannot be deactivated or lose the Owner role: refused with "This is your firm's only active Owner. Give the Owner role to another person first." (SA-6-44, AG-1-22).
* **BR-7** Deactivate needs a reason (1-200 characters); the person's sessions end at once and sign-in is blocked; their history shows "(Inactive) Name"; their open leads return to Unassigned leads; no email is sent to them (AG-1-15, -70; AG1-D2).
* **BR-8** A licence (representative type and licensing body from the country's list, licence number with a format hint, soft warning only) is one per person, on their own profile; the person edits their own, Owner/Admin edit anyone's (`agent/firm-credential:manage`); never in a log, email or notification; shown in full to those allowed (AG-1-30, -31; AG1-D19, AG7-D10).
* **BR-9** The firm switch "Require two-step sign-in for all staff" is Owner/Admin (`agent/security-policy:manage`); when on, people without it enrol at their next sign-in (enforced by Cognito and our guard); its default for new firms follows founder question 3 (AG-1-40).
* **BR-10** Buttons follow keys and state; no button for anything not built (no Suspend, no Delete in month one).

## 4. Layout (pattern Library list + Side panel; TEAM-PATTERNS: anything with a field is a right panel)
* **Team (screen 1):** title "Team", subtitle "Invite people and choose what each can do."; search; filter chips Active · Invited · Inactive; a table: name, email, roles (chips), status (Active, Invited · expires in 2 days, Invite expired, Inactive), two-step (On/Off), last sign-in; header line "6 of 10 seats used" with a tooltip saying what counts; primary "Invite people".
* **Invite people (screen 2, right panel):** rows of name, email, roles (multi-select, "Case Officer" pre-selected) with the one-line role summary under each row ("Case Officer — cases, documents, client messages · no billing or settings"); "+ Add another person"; the seat line updates as rows are added; "Compare roles" opens the six roles side by side in plain words (can / cannot), never keys; primary "Send invites".
* **Person (screen 3, right panel):** header name + status chip; sections Roles (chips, "Change roles" with the Owner reason and step-up when Owner is touched), Licence (type, body, number or "No licence recorded · Add"), Invitation (resend, revoke) or Access ("Deactivate" with reason; "Reactivate" on an inactive person). Deactivate is a yes/no confirm naming the person and saying sessions end now.
* **Licences (screen 4):** one row per licensed person: name, type, body, number; Owner/Admin add or edit for anyone; a staff member sees "My licence" on their own profile panel.
* **Security (screen 5):** the one switch with its explanation and how many staff have two-step on.
* **States:** empty Team ("Only you so far. Invite your team to share the work." + Invite people), loading skeletons, seat limit reached, invite expired, conflict (someone else changed this person: reload), refused (only Owner, own roles, Admin lacking a key) shown in the panel with its fixed words, read-only for people without `agent/staff:manage`.

## 4b. Best in class (**Unverified**, to check at review)
Workspace admin consoles (invite several at once with a seat counter; role descriptions in plain words; deactivate that kills sessions at once; "Compare roles") — kept. Where we beat them: the seat check runs before anything is sent; the licence is entered once and stamped on every retainer and form.

## 4c. Scorecard (EXPERIENCE §6, chosen)
BIC-01 the licence is entered once and reused · BIC-04 "(optional)" in words · BIC-09 deactivate and the Owner change name the person, preview what happens, never default to Yes · BIC-11 one primary per panel · BIC-13 errors on the row/field and in a summary · BIC-14 tooltips on seats, two-step, status · BIC-18 states in §4 · BIC-19/20 checked at 1440/1024, keyboard-only; others N/A (no case data, no AI, no filing).

## 5. Copy
Seat tooltip: "Active people and pending invitations use a seat. Inactive people don't." · Over limit: "This would use 11 of 10 seats. Remove 1 person or upgrade your plan." · Only Owner: SA-6-44's fixed text (BR-6) · Own roles: "You can't change your own roles. Ask another Owner or Admin." · Admin lacking a key: "You can only give roles whose permissions you hold." · Deactivate confirm: "Deactivate <name>? They are signed out now and can't sign in. Their work stays, shown as (Inactive) <name>." · Licence hint: "Checked against the usual format only. We never verify licences."

## 6. Contract and tests
Routes: PF-4's (`/api/platform/me`, invitations list/create/resend/revoke, `PATCH …/roles`, `…/deactivate|reactivate`, `PUT …/credential`) and the settings route for the two-step switch (PF-3's typed settings). Tests in `tests/check_pf6_staff_browser.ts`: the row's journey; BR-1…BR-10 pass and fail; keyboard-only; axe-core; 375/1024/1440 screenshots.

## 6b. Capability or scaffolding
All screens capability. The local stand-in sign-in (when `PLATFORM_IDENTITY=local`) is scaffolding for tests only and never shown in the test environment.

## 7. Questions for the founder
None new: the two-step default is founder question 3 (with Lead 39).

## Definition of ready
Acceptance test `tests/check_pf6_staff_browser.ts`; row PF-6 rev 4; fresh challenge in `challenge.md` answered; Lead B's approval (P-223 (4)).
