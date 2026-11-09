# B138 · C6.16 best-in-class sources (read 7 Nov 2026)

Primary sources only, read on 7 Nov 2026 from each project's published files on GitHub (raw). Vendor help centres, canada.ca and priv.gc.ca do not resolve from this cloud session (www.canada.ca must be allowed in the session's network settings to cite it), so MyChart, DocuSign, TurboTax, CRA "Represent a client" and the Privacy Commissioner's consent guidance were not opened and are not cited. Quotes are exact.

## 1. GOV.UK Design System, Confirm an email address (`alphagov/govuk-design-system`, `src/patterns/confirm-an-email-address/index.md`)
Job: prove a person controls the address a link or code was sent to.
* "You must set an expiry date on the email you send so that the link cannot be used after a certain period of time."
* "You should also set the link to expire when: it's been used once · it's superseded by a new link · the user has changed the email address on their account"
* "If a user attempts to use an expired link or a link that's already been used then you should explain that it's expired, and why."
* "You should let users resend the email confirmation link in case they entered the wrong email address previously or the email did not arrive."
* Another approach is "to send the user a security code, similar to the Confirm a phone number pattern".

## 2. GOV.UK Design System, Confirm a phone number (`src/patterns/confirm-a-phone-number/index.md`)
* "Let the user enter the code in whatever format is familiar to them. Allow additional spaces, hyphens and dashes."
* "Give a time limit of 15 minutes for the user to enter the code – the code should expire after this time limit."

**Best at (1, 2):** a link that dies when used, replaced or re-addressed; an expired link explains itself; resend is normal; a short code typed forgivingly with a short life.

## 3. OWASP Cheat Sheet Series, Forgot Password (`OWASP/CheatSheetSeries`, `cheatsheets/Forgot_Password_Cheat_Sheet.md`)
* "Ensure that generated tokens or codes are: Randomly generated using a cryptographically safe algorithm. Sufficiently long to protect against brute-force attacks. Stored securely. Single use and expire after an appropriate period."
* "Do not make a change to the account until a valid token is presented"
* "Implement appropriate protection to prevent users from brute-forcing tokens in the URL, such as rate limiting."

**Best at:** the token rules: random, long, stored hashed, single use, expiring, rate limited.

## 4. HMRC agent-client relationships (open source, `hmrc/agent-client-relationships`, README)
* "Relationships are established after a client accepts an invitation."
* "If an agency has turned on access groups then the relationship will be checked at the agent user level."

**Best at:** access to a person's records starts only when that person accepts; the check is made on every read, at the narrowest level.

## 5. The team's design (requirements snapshot 2 Nov, read-only copy in `domain/requirements-2026-11-02/`)
* AG-15-56: the principal "SHALL see the answers of the family members on the cases they share, in the portal as on the staff case screen, unless "Keep private from the principal" is ticked on those answers"; "There is no "Keep private from the principal" tick for a minor"; "Release 1 logins for adult family members stay Release 2 (CP1-D9)".
* AG-07 C3.5: "For an adult the applicant list shows one "Keep private from the principal" tick (AG07-D20(m)). For a minor it shows no tick."
* SA-1B-269 rule 2: "Read-only otherwise applies only to another person's facts under the privacy setting ("Keep private from the principal": the main client sees only that adult's progress)"; rule 10: "counsel confirms the consent wording (decision 12 gap)".

## What C6.16 copies and where it beats them
* **Copied:** single use, expiring, superseded by a resend, explained when dead (GOV.UK); a short code typed forgivingly (GOV.UK); random, hashed, rate limited (OWASP); access to an adult's answers changes only when that adult accepts on their own link (HMRC); one tick per adult, none for a minor (AG-07, AG-15).
* **Beaten:** the principal is told in words what they will and will not see before the link is sent, and sees progress (parts done of parts asked) instead of a blank; the adult sees on their own tab exactly what the principal can see of them; take back is one step with a reason and leaves the adult's own answers untouched; every send, open, wrong code, take back and resend is in the case history.
