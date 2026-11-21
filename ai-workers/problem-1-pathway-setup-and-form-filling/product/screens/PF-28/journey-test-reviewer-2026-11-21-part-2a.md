# Journey test: PF-28 part 2a (identity doors), reviewer, 21 Nov

This tests PR #2787 at head edc27006e on the isolated copy `rv2a` (:4437, PLATFORM_IDENTITY=local, fresh database). The walk used headless Chromium with Playwright, run three times at 1440, 1024 and 400 px. Scripts and screenshots are in the reviewer's scratchpad (`journey.cjs`, `shots/<width>-<step>.png`); they were not committed. US$0, no model call. The change is API-only, so the journeys walk the screens that call the 9 changed doors and check that the stricter input rule breaks none of them.

## Journeys (persona: the firm's Owner, unless noted)
| # | Journey | Expected | Result |
|---|---|---|---|
| J1 | Sign in on the staff sign-in card by keyboard only (Firm key, Tab, Work email, Enter) | Team opens | Opened in 187–196 ms at every width |
| J2 | Invite people: "not-an-email", then a name of 121 characters, then "Client A" | The server's words show in the panel; the third try is sent | "That is not an email address (name@example.com)." and "The name is at most 120 characters." appear on the name field; then 201 |
| J3 | Invited → Resend | A new link, with a toast | 200 (the web sends `{}`) |
| J4 | Give a person the Owner role with no reason, then add Read only | Refused with the reason asked for, then saved | "Not saved: Giving or removing the Owner role needs a written reason." (screenshot 1440-5); then 200 |
| J5 | Deactivate with no reason, then with "on leave", then Reactivate | The words show in the dialog; both actions succeed | "Give a deactivation reason (1 to 200 characters)."; 200; 200 |
| J6 | My licence: save. Licences: change another person's licence | Saved | `PUT me/account` 200 and `PUT staff/:id/credential` 200. On later runs: "Nothing to save: the licence is as it was" (same values, expected) |
| J7 | Wrong role: a Case Officer PATCHes roles with a bad body or a bad id | 403, never a 422 that shows the schema | 403 in both cases |
| J8 | Open a sign-in link: `#code=bogus`, then a code of 2100 characters | The "link used or expired" words | Bogus code: correct words. Long code: "One field needs a change: code: This is too long: at most 2000 characters. Nothing was saved." (review m4) |

## The data underneath
- The invitation with "Client A" is stored once, with its name. `audit_event` has created, resent, roles_changed, deactivated, reactivated and credential_saved lines, one per action.
- Refused calls stored nothing: the sweep's row counts are unchanged across 467 probes.
- Across firms: the sample-solo staff id gives the same 404 as a random uuid when the body is valid, and the same 422 (byte-identical) when it is bad.

## Break-it (15 min)
- `__proto__` in the body: 422. Roles sent as a string: 422 "This must be a list". 13 roles: 422 "Too many items: at most 12". An upper-case uuid: accepted.
- A batch row with a misspelt optional key `nmae`: **201, with the name silently dropped** (Minor, review m1).
- `curl -X POST …/resend` with no body at all: 422 "body: This is required." (Minor, review m2).
- A malformed invitation id with a bad body: 422, not 404 (Minor, review m3).
- The only console errors were the browser's own log lines for the expected 422s. No page errors.

## Accessibility and sizes
axe (WCAG 2.2 A/AA) found no serious or critical issue on Team, the invite panel after a refusal, the deactivate dialog with its error, or My licence, at 1440, 1024 and 400 px. There was no sideways scroll at any width. Keyboard-only use was walked for sign-in only; the screens themselves are unchanged by this diff, and the builder's pf6_staff_browser covers their keyboard paths.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J6 all complete through the screens |
| Next step obvious | 1 | Screens unchanged; refusals keep the field-level words |
| Plain words | ½ | Server words are kept on every UI path, but J8 with a long code shows the generic "One field needs a change…" (m4) |
| Feedback and state | 1 | A notice or toast after each action; "Nothing to save" when values are unchanged |
| Correct data | ½ | UI journeys are exact, but a batch row's misspelt key is dropped while the request succeeds (m1) |
| Error recovery | 1 | J2, J4 and J5: correct the input and send again; it works |
| Accessibility and screen sizes | 1 | axe clean at 3 widths, no sideways scroll, keyboard sign-in |
| Speed | 1 | Team in under 200 ms; every API answer well under 1 s |
| Visual quality | 1 | Unchanged; screenshots at 1440, 1024 and 400 px are clean |
| Trust and sources | 1 | No AI; Sample labels and licence source note shown |

**Total 9/10, pass (8 or more, no 0).** To raise it, most valuable first: flag unknown keys in batch rows (m1); answer an over-long or missing callback code with the existing "link used" refusal (m4).

## Not tested
A real screen reader; an intended user's own walk (D17/D20 stay with the founder); the Cognito sign-in (no pool).
